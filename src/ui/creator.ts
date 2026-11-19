import { partCss } from '../game/art/finish';
import { toneGradient } from '../game/art/palette';
import type { GameController } from '../game/controller';
import { t } from '../i18n';
import {
  FACE_ROWS,
  FAVORITE_COLORS,
  FAVORITE_DISHES,
  FAVORITE_STATIONS,
  LOOK_LIMITS,
  LIFE_PACE_IDS,
  MAX_FAMILY,
  MAX_NAME,
  NEW_LEAF,
  SLIDER_MAX,
  TONE_MAX,
  VOICE_MAX,
  cleanName,
  defaultTastes,
  dreamsFor,
  dropMember,
  familyProblem,
  mixLooks,
  setTie,
  suggestDream,
  temperFromTraits,
  tieOf,
  tieProblem,
  traitBlock,
  traitSlots,
  traitsClash,
} from '../sim';
import type { DreamDef, FamilyDraft, LifePace, Look, MemberDraft, Speed, TieKind, Wear } from '../sim';
import { SWATCHES } from '../sim/style';
import { GARMENTS, OCCASIONS, OPTIONAL_SLOTS, bandOf, ensembleOf, ensembleProblems, legacyCloset, ownedGarments, pieceStyle, refitCloset, wearPiece } from '../sim/clothes';
import type { ClothSlot, Ensemble, Occasion, Piece } from '../sim/clothes';
import type { Age } from '../sim/types';
import { zonePicker } from './styleEditor';

// Plano 2, bloco 10: tela de criar família em passos, perto do criador do
// terceiro jogo da série, com o nosso conteúdo: membros (nome, idade, signo,
// voz e gostos) → aparência (controles deslizantes, sortear, herdar dos
// pais) → roupas (um conjunto por ocasião) → traços (cinco no adulto) →
// sonho de vida → laços (cônjuge, pai ou mãe, irmão, colega de casa) →
// revisão. O temperamento sai dos traços. Interface própria: cartões de papel
// e botões de pílula.

function el<K extends keyof HTMLElementTagNameMap>(tag: K, className?: string, text?: string): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

const FIRST_NAMES = [
  'Bento', 'Iara', 'Otávio', 'Cecília', 'Juca', 'Marta', 'Ravi', 'Lúcia', 'Dito', 'Helena',
  'Tião', 'Zélia', 'Ícaro', 'Bia', 'Nestor', 'Glória', 'Davi', 'Olga', 'Quim', 'Teca',
];
const SURNAMES = ['Goiabeira', 'Fresta', 'Paiol', 'Varanda', 'Cumeeira', 'Biquinha', 'Taramela', 'Soleira'];

export type Step = 'members' | 'looks' | 'clothes' | 'traits' | 'dream' | 'ties' | 'review';
export const STEPS: Step[] = ['members', 'looks', 'clothes', 'traits', 'dream', 'ties', 'review'];

type MemberAge = MemberDraft['age'];
const AGES: MemberAge[] = ['child', 'teen', undefined, 'elder'];

/** Linhas de escolha (peças do rosto e cabelo) e controles deslizantes, na ordem da tela. */
const TONE_ROWS: { key: 'skin' | 'hair' | 'eyeColor'; ramp: 'skin' | 'hair' | 'eye' }[] = [
  { key: 'skin', ramp: 'skin' },
  { key: 'hair', ramp: 'hair' },
  { key: 'eyeColor', ramp: 'eye' },
];
const BODY_SLIDERS: (keyof Look)[] = ['body', 'height', 'muscle'];
const FACE_SLIDERS: (keyof Look)[] = ['jaw', 'eyeSize', 'eyeGap', 'noseSize', 'earSize', 'mouthSize'];
const PICK_ROWS: (keyof Look)[] = ['style', 'face', ...FACE_ROWS.filter((k) => k !== 'eyeColor')];
const CLOTH_ROWS: ClothSlot[] = ['top', 'bottom', 'full', 'shoes', 'socks', 'hat', 'glasses', 'earrings', 'watch', 'bag', 'scarf'];

type Rnd = () => number;
export type CreatorPortrait = (look: Look, wear: Wear, opts?: { age?: Age; dress?: Ensemble }) => string;

export class FamilyCreator {
  private root = el('div', 'creator');
  private draft: FamilyDraft;
  private current = 0;
  private step: Step = 'members';
  private occasion: Occasion = 'day';
  private slot: ClothSlot = 'top';
  private zone = 'main';
  /** traço em destaque no painel de detalhes */
  private focusTrait = '';
  private cancellable = false;
  private portraits = new Map<string, string>();
  private rnd: Rnd = Math.random;
  private speedBefore: Speed = 1;
  /** bloco 14: perigos podem matar (desligado: quem cairia escapa por um triz) */
  private death = true;
  /** bloco 17: relógio da vida do jogo novo */
  private life: LifePace = 'off';
  /** bloco 15: família nova para um lote do bairro (0 = jogo novo) */
  private lotId = 0;
  /** plano 2, bloco 11: família nova direto para a gaveta */
  private toBin = false;
  /** plano 2, bloco 11: editando um morador em jogo (0 = criando família) */
  private editId = 0;
  private pending = 0;

  constructor(
    private readonly host: HTMLElement,
    private readonly ctrl: GameController,
    private readonly portrait: CreatorPortrait,
  ) {
    this.draft = this.freshDraft();
    this.root.hidden = true;
    this.host.append(this.root);
  }

  get open(): boolean {
    return !this.root.hidden;
  }

  /** Abre a tela. `cancellable` = há um jogo para onde voltar. */
  show(cancellable: boolean): void {
    this.lotId = 0;
    this.toBin = false;
    this.editId = 0;
    this.openCard(cancellable);
  }

  /** Bloco 15: família nova que chega a um lote do bairro (o jogo continua o mesmo). */
  showForLot(lotId: number): void {
    this.lotId = lotId;
    this.toBin = false;
    this.editId = 0;
    this.openCard(true);
  }

  /** Plano 2, bloco 11: família nova que vai para a gaveta (sem casa ainda). */
  showForBin(): void {
    this.lotId = 0;
    this.toBin = true;
    this.editId = 0;
    this.openCard(true);
  }

  /**
   * Plano 2, bloco 11: o criador aberto num morador em jogo, para mudar a
   * aparência e as roupas (os traços só com o benefício "Página virada").
   */
  showForFolk(folkId: number): void {
    const folk = this.ctrl.world.folks.find((f) => f.id === folkId && !f.visit && f.age !== 'baby');
    if (!folk) return;
    this.lotId = 0;
    this.toBin = false;
    this.editId = folk.id;
    this.cancellable = true;
    this.speedBefore = this.ctrl.world.speed;
    this.ctrl.command({ type: 'setSpeed', speed: 0 });
    const age = folk.age === 'baby' ? undefined : folk.age;
    const m: MemberDraft = {
      name: folk.name,
      look: { ...folk.look },
      traits: [...folk.traits],
      temper: { ...folk.temper },
      month: folk.month,
      closet: JSON.parse(JSON.stringify(this.ctrl.sim.closetFor(folk))),
    };
    if (age) m.age = age;
    this.draft = { surname: '', members: [m], ties: [] };
    this.current = 0;
    this.step = 'looks';
    this.root.hidden = false;
    this.render();
  }

  /** Passos da tela: no modo de editar, só aparência e roupa (e traços com o benefício). */
  get steps(): Step[] {
    if (!this.editId) return STEPS;
    const folk = this.ctrl.world.folks.find((f) => f.id === this.editId);
    return folk?.perks?.includes(NEW_LEAF) ? ['looks', 'clothes', 'traits'] : ['looks', 'clothes'];
  }

  /** Vai direto a um passo (capturas e testes). */
  goto(step: Step, member = this.current): void {
    this.step = step;
    this.current = Math.max(0, Math.min(this.draft.members.length - 1, member));
    this.render();
  }

  /** O rascunho em edição (capturas e testes). */
  get family(): FamilyDraft {
    return this.draft;
  }

  private openCard(cancellable: boolean): void {
    this.cancellable = cancellable;
    // o tempo para enquanto a família é criada
    this.speedBefore = this.ctrl.world.speed;
    this.ctrl.command({ type: 'setSpeed', speed: 0 });
    this.draft = this.freshDraft();
    this.current = 0;
    this.step = 'members';
    this.root.hidden = false;
    this.render();
  }

  hide(): void {
    this.root.hidden = true;
  }

  /** Volta ao jogo que já estava rolando, na velocidade de antes. */
  private cancel(): void {
    this.hide();
    this.ctrl.command({ type: 'setSpeed', speed: this.speedBefore });
  }

  private get catalog() {
    return this.ctrl.sim.catalog;
  }

  // ---------- rascunho ----------

  private freshDraft(): FamilyDraft {
    const surname = SURNAMES[Math.floor(this.rnd() * SURNAMES.length)];
    const a = this.randomMember([]);
    const b = this.randomMember([a.name]);
    return { surname, members: [a, b], ties: [] };
  }

  private pick(n: number): number {
    return Math.floor(this.rnd() * n);
  }

  /** Traços sorteados até encher a idade (sem par proibido). */
  private randomTraits(age: MemberAge, keep: string[] = []): string[] {
    const ids = Object.keys(this.catalog.traits);
    const out = keep.filter((id) => !traitBlock(this.catalog, keep.filter((x) => x !== id), id, age));
    for (let guard = 0; out.length < traitSlots(age) && guard < 400; guard++) {
      const id = ids[this.pick(ids.length)];
      if (!traitBlock(this.catalog, out, id, age)) out.push(id);
    }
    return out;
  }

  private randomMember(taken: string[], age?: MemberAge): MemberDraft {
    const free = FIRST_NAMES.filter((n) => !taken.includes(n));
    const name = free[this.pick(free.length)] ?? `${FIRST_NAMES[0]} ${taken.length + 1}`;
    const look = mixLooks([], (n) => this.pick(n));
    const traits = this.randomTraits(age);
    const temper = temperFromTraits(this.catalog, traits);
    const month = this.pick(this.catalog.months.length);
    const m: MemberDraft = {
      name,
      look,
      traits,
      temper,
      month,
      tastes: defaultTastes(temper, this.pick(1e6)),
      voice: this.pick(VOICE_MAX + 1),
      closet: legacyCloset(look, age),
    };
    if (age) m.age = age;
    const dream = suggestDream(this.catalog, traits);
    if (dream) m.dream = dream;
    return m;
  }

  private get member(): MemberDraft {
    return this.draft.members[this.current];
  }

  /** Os traços mudaram: o temperamento segue os traços e o sonho que não combina mais é trocado. */
  private traitsChanged(m: MemberDraft): void {
    m.temper = temperFromTraits(this.catalog, m.traits);
    const fits = dreamsFor(this.catalog, m.traits);
    if (!m.dream || (fits.length && !fits.some((d) => d.id === m.dream) && m.traits.length >= traitSlots(m.age))) m.dream = fits[0]?.id ?? m.dream;
  }

  /** Mudou a idade: traços que não cabem saem, roupa acerta, laços impossíveis caem. */
  private setAge(m: MemberDraft, age: MemberAge): void {
    if (age) m.age = age;
    else delete m.age;
    const kept: string[] = [];
    for (const id of m.traits) if (!traitBlock(this.catalog, kept, id, age)) kept.push(id);
    m.traits = kept;
    this.traitsChanged(m);
    m.closet = refitCloset(m.closet ?? legacyCloset(m.look, age), age);
    this.draft.ties = (this.draft.ties ?? []).filter((tie) => !tieProblem(this.draft, tie));
  }

  /** Pais escolhidos nos laços (para herdar a aparência). */
  private parentsOf(index: number): MemberDraft[] {
    return (this.draft.ties ?? []).filter((x) => x.kind === 'parent' && x.b === index).map((x) => this.draft.members[x.a]);
  }

  // ---------- desenho ----------

  private render(): void {
    const scroll = this.root.querySelector('.creator-body')?.scrollTop ?? 0;
    this.root.replaceChildren();
    const card = el('div', 'card creator-card');
    card.append(this.renderHead(), this.renderBody(), this.renderFoot());
    this.root.append(card);
    const body = this.root.querySelector('.creator-body');
    if (body) body.scrollTop = scroll;
  }

  private renderHead(): HTMLElement {
    const head = el('div', 'creator-head');
    const lot = this.lotId ? this.ctrl.world.town?.lots.find((l) => l.id === this.lotId) : undefined;
    const title = el('div', 'creator-title', lot ? t('town.creating', { number: lot.number }) : this.toBin ? t('bin.creating') : t('create.title'));
    if (this.editId) {
      head.append(el('div', 'creator-title', t('edit.title', { name: this.member.name })), el('div', 'creator-note', t('edit.hint')));
      const steps = el('div', 'creator-steps');
      this.steps.forEach((s, i) => {
        const b = el('button', 'creator-step', `${i + 1}. ${t(`create.step.${s}`)}`);
        b.classList.toggle('on', s === this.step);
        b.addEventListener('click', () => {
          this.step = s;
          this.render();
        });
        steps.append(b);
      });
      head.append(steps);
      return head;
    }
    const surname = el('label', 'creator-surname');
    const input = el('input');
    input.value = this.draft.surname;
    input.maxLength = MAX_NAME;
    input.setAttribute('aria-label', t('create.surname'));
    input.addEventListener('input', () => {
      this.draft.surname = input.value;
      this.refreshFoot();
    });
    surname.append(el('span', '', t('create.surname')), input);
    const tabs = el('div', 'creator-members');
    this.draft.members.forEach((m, i) => {
      const b = el('button', 'creator-member');
      b.classList.toggle('on', i === this.current);
      const img = el('img');
      img.src = this.portraitOf(m, 'day');
      img.alt = '';
      b.append(img, el('span', '', m.name || '?'));
      b.addEventListener('click', () => {
        this.current = i;
        this.render();
      });
      tabs.append(b);
    });
    if (this.draft.members.length < MAX_FAMILY) {
      const add = el('button', 'btn btn-small creator-add', t('create.add'));
      add.addEventListener('click', () => {
        this.draft.members.push(this.randomMember(this.draft.members.map((m) => m.name)));
        this.current = this.draft.members.length - 1;
        if (this.step === 'review' || this.step === 'ties') this.step = 'members';
        this.render();
      });
      tabs.append(add);
    }
    head.append(title, surname, tabs, el('div', 'creator-count', t('create.count', { n: this.draft.members.length, max: MAX_FAMILY })));
    // os passos
    const steps = el('div', 'creator-steps');
    this.steps.forEach((s, i) => {
      const b = el('button', 'creator-step', `${i + 1}. ${t(`create.step.${s}`)}`);
      b.classList.toggle('on', s === this.step);
      b.classList.toggle('done', this.steps.indexOf(this.step) > i);
      b.addEventListener('click', () => {
        this.step = s;
        this.render();
      });
      steps.append(b);
    });
    head.append(steps);
    return head;
  }

  private renderBody(): HTMLElement {
    const body = el('div', `creator-body step-${this.step}`);
    switch (this.step) {
      case 'members':
        body.append(this.figure('day'), this.membersStep());
        break;
      case 'looks':
        body.append(this.figure('day'), this.looksStep());
        break;
      case 'clothes':
        body.append(this.figure(this.occasion), this.clothesStep());
        break;
      case 'traits':
        body.append(this.figure('day'), this.traitsStep());
        break;
      case 'dream':
        body.append(this.figure('day'), this.dreamStep());
        break;
      case 'ties':
        body.append(this.tiesStep());
        break;
      case 'review':
        body.append(this.reviewStep());
        break;
    }
    return body;
  }

  /** Retrato grande, nome e as ações do membro. */
  private figure(wear: Wear): HTMLElement {
    const m = this.member;
    const left = el('div', 'creator-col creator-figure');
    const img = el('img', 'creator-portrait');
    img.src = this.portraitOf(m, wear);
    img.alt = m.name;
    const name = el('input', 'creator-name');
    name.value = m.name;
    name.maxLength = MAX_NAME;
    name.setAttribute('aria-label', t('create.name'));
    name.disabled = this.editId !== 0;
    name.addEventListener('input', () => {
      m.name = name.value;
      const tab = this.root.querySelectorAll('.creator-member span')[this.current];
      if (tab) tab.textContent = m.name || '?';
      this.refreshFoot();
    });
    const row = el('div', 'creator-actions');
    const random = el('button', 'btn btn-small', t('create.randomAll'));
    random.addEventListener('click', () => {
      this.draft.members[this.current] = this.randomMember(
        this.draft.members.filter((x) => x !== m).map((x) => x.name),
        m.age,
      );
      this.render();
    });
    if (!this.editId) row.append(random);
    if (this.draft.members.length > 1) {
      const remove = el('button', 'btn btn-small btn-quiet', t('create.remove'));
      remove.addEventListener('click', () => {
        dropMember(this.draft, this.current);
        this.current = Math.max(0, this.current - 1);
        this.render();
      });
      row.append(remove);
    }
    left.append(img, name, row);
    return left;
  }

  // ---------- 1. membros: idade, signo, voz e gostos ----------

  private membersStep(): HTMLElement {
    const m = this.member;
    const col = el('div', 'creator-col creator-wide');
    col.append(el('div', 'creator-section', t('create.age')));
    const ages = el('div', 'creator-opts');
    for (const a of AGES) {
      const b = el('button', 'tab', t(`age.${a ?? 'adult'}`));
      b.classList.toggle('on', m.age === a);
      b.addEventListener('click', () => {
        this.setAge(m, a);
        this.render();
      });
      ages.append(b);
    }
    col.append(ages);
    col.append(el('div', 'creator-section', t('month.title')), this.monthPicker(), el('div', 'creator-note', t('create.signHint')));
    // voz
    col.append(el('div', 'creator-section', t('voice.title')));
    const voice = el('div', 'creator-row');
    voice.append(el('span', 'creator-label', `${t('voice.low')} – ${t('voice.high')}`), this.slider(m.voice ?? 10, VOICE_MAX, (v) => (m.voice = v)));
    col.append(voice);
    // gostos
    const tastes = m.tastes ?? defaultTastes(m.temper, this.current);
    m.tastes = tastes;
    col.append(el('div', 'creator-section', t('taste.title')));
    const pickRow = (label: string, ids: string[], text: (id: string) => string, cur: string, set: (id: string) => void) => {
      const r = el('div', 'creator-row');
      r.append(el('span', 'creator-label', label));
      const opts = el('div', 'creator-opts');
      for (const id of ids) {
        const b = el('button', 'tab', text(id));
        b.classList.toggle('on', cur === id);
        b.addEventListener('click', () => {
          set(id);
          this.render();
        });
        opts.append(b);
      }
      r.append(opts);
      col.append(r);
    };
    pickRow(t('taste.food'), FAVORITE_DISHES, (id) => t(`dish.${id}`), tastes.food, (id) => (tastes.food = id));
    pickRow(t('taste.music'), FAVORITE_STATIONS, (id) => t(`station.${id}`), tastes.music, (id) => (tastes.music = id));
    const colors = el('div', 'creator-row');
    colors.append(el('span', 'creator-label', t('taste.color')));
    const sw = el('div', 'creator-opts');
    for (const id of FAVORITE_COLORS) {
      const b = el('button', 'creator-swatch');
      b.style.background = `#${(SWATCHES[id] ?? 0).toString(16).padStart(6, '0')}`;
      b.title = t(`color.${id}`);
      b.setAttribute('aria-label', t(`color.${id}`));
      b.classList.toggle('on', tastes.color === id);
      b.addEventListener('click', () => {
        tastes.color = id;
        this.render();
      });
      sw.append(b);
    }
    colors.append(sw);
    col.append(colors);
    return col;
  }

  private monthPicker(): HTMLElement {
    const m = this.member;
    const months = this.catalog.months;
    const wrap = el('div', 'creator-month');
    const grid = el('div', 'creator-opts');
    for (const def of months) {
      const label = t(def.name).replace(/^mês d[aeo] /, '');
      const b = el('button', 'tab', label);
      b.classList.toggle('on', m.month === def.id);
      b.title = t(def.hint);
      b.addEventListener('click', () => {
        m.month = def.id;
        this.render();
      });
      grid.append(b);
    }
    const def = months[m.month];
    const names = (ids: number[]) => ids.map((id) => t(months[id].name).replace(/^mês d[aeo] /, '')).join(', ');
    const info = el('div', 'creator-note');
    if (def.likes.length) info.append(el('div', 'good', t('month.likes', { list: names(def.likes) })));
    if (def.dislikes.length) info.append(el('div', 'bad', t('month.dislikes', { list: names(def.dislikes) })));
    wrap.append(grid, info);
    return wrap;
  }

  // ---------- 2. aparência: controles deslizantes, peças do rosto ----------

  private looksStep(): HTMLElement {
    const m = this.member;
    const col = el('div', 'creator-col creator-wide creator-looks');
    const actions = el('div', 'creator-actions creator-left');
    const random = el('button', 'btn btn-small', t('create.randomLooks'));
    random.addEventListener('click', () => {
      m.look = mixLooks([], (n) => this.pick(n));
      this.render();
    });
    actions.append(random);
    const parents = this.parentsOf(this.current);
    const inherit = el('button', 'btn btn-small', t('look.inherit'));
    inherit.title = t('look.inheritHint');
    inherit.disabled = parents.length === 0;
    inherit.addEventListener('click', () => {
      const look = mixLooks(
        parents.map((p) => p.look),
        (n) => this.pick(n),
      );
      // a roupa fica a que já estava
      m.look = { ...look, shirt: m.look.shirt, pants: m.look.pants, formal: m.look.formal, sleepwear: m.look.sleepwear, swimwear: m.look.swimwear };
      this.render();
    });
    actions.append(inherit);
    col.append(actions);
    const grid = el('div', 'creator-look-grid');
    const a = el('div', 'creator-col');
    const b = el('div', 'creator-col');
    a.append(el('div', 'creator-section', t('create.looks')));
    for (const row of TONE_ROWS) a.append(this.toneRow(row.key, row.ramp));
    for (const k of BODY_SLIDERS) a.append(this.sliderRow(k));
    for (const k of ['style', 'face'] as (keyof Look)[]) a.append(this.pickRow(k));
    b.append(el('div', 'creator-section', t('create.face')));
    for (const k of PICK_ROWS.filter((k) => k !== 'style' && k !== 'face')) b.append(this.pickRow(k));
    for (const k of FACE_SLIDERS) b.append(this.sliderRow(k));
    grid.append(a, b);
    col.append(grid);
    return col;
  }

  /** Um controle deslizante: arrastando, só o retrato muda; ao soltar, a tela redesenha. */
  private slider(value: number, max: number, set: (v: number) => void, track?: string): HTMLInputElement {
    const input = el('input', 'creator-slider');
    input.type = 'range';
    input.min = '0';
    input.max = String(max);
    input.step = '1';
    input.value = String(value);
    if (track) input.style.background = track;
    input.addEventListener('input', () => {
      set(Number(input.value));
      this.refreshPortrait();
    });
    input.addEventListener('change', () => this.render());
    return input;
  }

  private toneRow(k: 'skin' | 'hair' | 'eyeColor', ramp: 'skin' | 'hair' | 'eye'): HTMLElement {
    const m = this.member;
    const row = el('div', 'creator-row');
    row.append(el('span', 'creator-label', t(`look.${k}`)), this.slider(m.look[k], TONE_MAX, (v) => (m.look[k] = v), toneGradient(ramp)));
    return row;
  }

  private sliderRow(k: keyof Look): HTMLElement {
    const m = this.member;
    const row = el('div', 'creator-row');
    const input = this.slider(m.look[k], SLIDER_MAX, (v) => (m.look[k] = v));
    input.setAttribute('aria-label', t(`look.${k}`));
    if (k === 'body') input.title = t('look.bodyHint');
    row.append(el('span', 'creator-label', t(`look.${k}`)), input);
    return row;
  }

  private pickRow(k: keyof Look): HTMLElement {
    const m = this.member;
    const row = el('div', 'creator-row');
    row.append(el('span', 'creator-label', t(`look.${k}`)));
    const opts = el('div', 'creator-opts');
    for (let i = 0; i < LOOK_LIMITS[k]; i++) {
      // óculos: o 1 era sardas até o save v24 (hoje é marca); fica de fora da lista
      if (k === 'face' && i === 1) continue;
      const b = el('button', 'tab', t(`${k}.${i}`));
      b.classList.toggle('on', m.look[k] === i);
      b.addEventListener('click', () => {
        m.look[k] = i;
        this.render();
      });
      opts.append(b);
    }
    row.append(opts);
    return row;
  }

  // ---------- 3. roupas: um conjunto por ocasião, peças básicas ----------

  private clothesStep(): HTMLElement {
    const m = this.member;
    const col = el('div', 'creator-col creator-wide');
    const band = bandOf(m.age);
    m.closet ??= legacyCloset(m.look, m.age);
    const closet = m.closet;
    const occ = el('div', 'creator-opts');
    for (const o of OCCASIONS) {
      const b = el('button', 'tab', t(`occasion.${o}`));
      b.classList.toggle('on', o === this.occasion);
      b.addEventListener('click', () => {
        this.occasion = o;
        this.slot = 'top';
        this.zone = 'main';
        this.render();
      });
      occ.append(b);
    }
    col.append(occ, el('div', 'creator-note', t('create.clothesNote')));
    if (!band) return col;
    const set: Ensemble = closet.sets[this.occasion]?.[closet.pick[this.occasion] ?? 0] ?? ensembleOf({ look: m.look, age: m.age }, this.occasion);
    const save = (next: Ensemble) => {
      const list = [...(closet.sets[this.occasion] ?? [])];
      const i = closet.pick[this.occasion] ?? 0;
      list[Math.min(i, list.length)] = next;
      closet.sets[this.occasion] = list;
      closet.pick[this.occasion] = Math.min(i, list.length - 1);
      this.render();
    };
    // plano 2, bloco 11: editando alguém em jogo, valem as peças compradas pela casa
    const owned = ownedGarments(this.editId ? this.ctrl.world.household.garments : []);
    for (const slot of CLOTH_ROWS) {
      const choices = [...owned].map((id) => GARMENTS[id]).filter((g) => g.slot === slot && g.bands.includes(band));
      if (!choices.length) continue;
      const row = el('div', 'creator-row');
      row.append(el('span', 'creator-label', t(`cslot.${slot}`)));
      const chips = el('div', 'creator-opts');
      const cur = set[slot];
      if (OPTIONAL_SLOTS.includes(slot) || slot === 'full' || (slot === 'top' && this.occasion === 'swim')) {
        const none = el('button', 'tab', t('wardrobe.none'));
        none.classList.toggle('on', !cur);
        none.addEventListener('click', () => {
          let next = wearPiece(set, null, slot);
          if (slot === 'full') next = { ...next, top: { g: band === 'child' ? 'kidtee' : 'tee' }, bottom: { g: band === 'child' ? 'shorts' : 'jeans' } };
          save(next);
        });
        chips.append(none);
      }
      for (const g of choices) {
        const b = el('button', 'tab creator-garment');
        const dot = el('span', 'zone-dot');
        const p: Piece = cur?.g === g.id ? cur : { g: g.id };
        dot.style.background = partCss(pieceStyle(p).main ?? g.zones[0].base);
        b.append(dot, el('span', '', t(`garment.${g.id}`)));
        b.classList.toggle('on', cur?.g === g.id);
        b.addEventListener('click', () => {
          this.slot = slot;
          this.zone = g.zones[0].id;
          const keep = cur && cur.g !== g.id ? cur.style?.main : undefined;
          const piece: Piece = cur?.g === g.id ? cur : keep ? { g: g.id, style: { [g.zones[0].id]: keep } } : { g: g.id };
          save(wearPiece(set, piece, slot));
        });
        chips.append(b);
      }
      row.append(chips);
      col.append(row);
    }
    const piece = set[this.slot];
    const g = piece ? GARMENTS[piece.g] : undefined;
    if (piece && g) {
      col.append(el('div', 'creator-section', t('wardrobe.colors', { garment: t(`garment.${g.id}`) })));
      const tabs = el('div', 'creator-opts');
      for (const z of g.zones) {
        const b = el('button', 'tab', t(`gzone.${z.id}`));
        b.classList.toggle('on', this.zone === z.id);
        b.addEventListener('click', () => {
          this.zone = z.id;
          this.render();
        });
        tabs.append(b);
      }
      col.append(tabs);
      const zone = g.zones.find((z) => z.id === this.zone) ?? g.zones[0];
      col.append(
        zonePicker(zone, piece.style?.[zone.id], (p) => {
          const style = { ...(piece.style ?? {}) };
          if (p) style[zone.id] = p;
          else delete style[zone.id];
          save({ ...set, [this.slot]: Object.keys(style).length ? { g: piece.g, style } : { g: piece.g } });
        }),
      );
    }
    const problems = ensembleProblems(set, band, this.occasion);
    if (problems.length) col.append(el('div', 'creator-problem', t(problems.includes('needs:top') ? 'wardrobe.need.top' : problems.includes('needs:bottom') ? 'wardrobe.need.bottom' : 'wardrobe.need.fix')));
    return col;
  }

  // ---------- 4. traços ----------

  private traitsStep(): HTMLElement {
    const m = this.member;
    const col = el('div', 'creator-col creator-wide');
    const slots = traitSlots(m.age);
    const head = el('div', 'creator-actions creator-left');
    head.append(el('span', `creator-free${m.traits.length < slots ? ' warn' : ''}`, t('trait.slots', { n: m.traits.length, max: slots })));
    const random = el('button', 'btn btn-small', t('create.randomTraits'));
    random.addEventListener('click', () => {
      m.traits = this.randomTraits(m.age);
      this.traitsChanged(m);
      this.render();
    });
    head.append(random);
    col.append(head);
    // os escolhidos, em fichas grandes
    const chosen = el('div', 'creator-trait-slots');
    for (let i = 0; i < slots; i++) {
      const id = m.traits[i];
      const s = el('button', `creator-trait-slot${id ? ' on' : ''}`, id ? t(this.catalog.traits[id].name) : '?');
      if (id) {
        s.title = t(this.catalog.traits[id].hint ?? '');
        s.addEventListener('click', () => {
          m.traits = m.traits.filter((x) => x !== id);
          this.focusTrait = id;
          this.traitsChanged(m);
          this.render();
        });
      } else s.disabled = true;
      chosen.append(s);
    }
    col.append(chosen);
    const wrap = el('div', 'creator-opts creator-traits');
    for (const def of Object.values(this.catalog.traits)) {
      const on = m.traits.includes(def.id);
      const why = on ? null : traitBlock(this.catalog, m.traits, def.id, m.age);
      const b = el('button', 'tab', t(def.name));
      b.classList.toggle('on', on);
      b.classList.toggle('blocked', !!why && why !== 'full');
      b.disabled = !!why;
      b.title = why ? `${t(def.hint ?? '')}\n${t(`trait.why.${why}`)}` : t(def.hint ?? '');
      b.addEventListener('mouseenter', () => this.showTrait(def.id));
      b.addEventListener('click', () => {
        m.traits = on ? m.traits.filter((x) => x !== def.id) : [...m.traits, def.id];
        this.focusTrait = def.id;
        this.traitsChanged(m);
        this.render();
      });
      wrap.append(b);
    }
    col.append(wrap);
    const info = el('div', 'creator-trait-info');
    col.append(info);
    this.fillTraitInfo(info, this.focusTrait || m.traits[m.traits.length - 1] || '');
    col.append(el('div', 'creator-note', t('create.temperFromTraits')));
    return col;
  }

  private showTrait(id: string): void {
    const info = this.root.querySelector<HTMLElement>('.creator-trait-info');
    if (info) this.fillTraitInfo(info, id);
  }

  /** Detalhes do traço: descrição, com o que não combina e o que só ele faz. */
  private fillTraitInfo(box: HTMLElement, id: string): void {
    box.replaceChildren();
    const def = this.catalog.traits[id];
    if (!def) return;
    box.append(el('div', 'creator-trait-name', t(def.name)), el('div', '', t(def.hint ?? '')));
    const clashes = Object.keys(this.catalog.traits).filter((x) => traitsClash(x, id));
    if (clashes.length) box.append(el('div', 'bad', t('trait.clashWith', { list: clashes.map((x) => t(this.catalog.traits[x].name)).join(', ') })));
    const own = new Set<string>();
    for (const s of Object.values(this.catalog.socials)) if (s.requires?.trait === id) own.add(t(s.label));
    for (const o of Object.values(this.catalog.objects)) for (const it of o.interactions) if (it.trait === id) own.add(t(it.label));
    if (own.size) box.append(el('div', 'good', t('trait.exclusive', { list: [...own].join(', ') })));
    if (def.grown) box.append(el('div', '', t('trait.why.grown')));
  }

  // ---------- 5. sonho de vida ----------

  private dreamStep(): HTMLElement {
    const m = this.member;
    const col = el('div', 'creator-col creator-wide');
    const all = Object.values(this.catalog.dreams ?? {});
    const fit = dreamsFor(this.catalog, m.traits);
    const rest = all.filter((d) => !fit.includes(d)).sort((a, b) => a.id.localeCompare(b.id));
    const grid = el('div', 'creator-dreams');
    for (const d of [...fit, ...rest]) grid.append(this.dreamCard(m, d, fit.includes(d)));
    col.append(el('div', 'creator-section', t('dream.title')), grid);
    return col;
  }

  private dreamCard(m: MemberDraft, d: DreamDef, fits: boolean): HTMLElement {
    const b = el('button', 'creator-dream');
    b.classList.toggle('on', m.dream === d.id);
    b.classList.toggle('fits', fits);
    b.append(el('div', 'creator-dream-name', t(d.name)), el('div', 'creator-dream-hint', t(d.hint)), el('div', 'creator-dream-reward', t('dream.reward', { n: d.reward })));
    const match = d.traits.filter((x) => m.traits.includes(x));
    if (match.length) b.append(el('div', 'good', t('dream.match', { list: match.map((x) => t(this.catalog.traits[x].name)).join(', ') })));
    b.addEventListener('click', () => {
      m.dream = d.id;
      this.render();
    });
    return b;
  }

  // ---------- 6. laços ----------

  private tiesStep(): HTMLElement {
    const col = el('div', 'creator-col creator-full');
    col.append(el('div', 'creator-section', t('tie.title')), el('div', 'creator-note', t('tie.note')));
    const ms = this.draft.members;
    if (ms.length < 2) return col;
    for (let i = 0; i < ms.length; i++) {
      for (let j = i + 1; j < ms.length; j++) {
        const row = el('div', 'creator-tie');
        const who = el('div', 'creator-tie-who');
        for (const k of [i, j]) {
          const img = el('img');
          img.src = this.portraitOf(ms[k], 'day');
          img.alt = '';
          who.append(img, el('span', '', ms[k].name || '?'));
        }
        const cur = tieOf(this.draft, i, j);
        const opts = el('div', 'creator-opts');
        const options: { label: string; kind: TieKind; a: number; b: number }[] = [
          { label: t('tie.roommate'), kind: 'roommate', a: i, b: j },
          { label: t('tie.spouse'), kind: 'spouse', a: i, b: j },
          { label: t('tie.sibling'), kind: 'sibling', a: i, b: j },
          { label: t('tie.parentOf', { a: ms[i].name, b: ms[j].name }), kind: 'parent', a: i, b: j },
          { label: t('tie.parentOf', { a: ms[j].name, b: ms[i].name }), kind: 'parent', a: j, b: i },
        ];
        for (const o of options) {
          const btn = el('button', 'tab', o.label);
          const on = cur.kind === o.kind && (o.kind !== 'parent' || (cur.flip ? o.a === j : o.a === i));
          btn.classList.toggle('on', on);
          btn.disabled = o.kind !== 'roommate' && tieProblem(this.draft, { a: o.a, b: o.b, kind: o.kind });
          btn.addEventListener('click', () => {
            setTie(this.draft, o.a, o.b, o.kind);
            this.render();
          });
          opts.append(btn);
        }
        row.append(who, opts);
        col.append(row);
      }
    }
    return col;
  }

  // ---------- 7. revisão ----------

  private reviewStep(): HTMLElement {
    const col = el('div', 'creator-col creator-full');
    const cards = el('div', 'creator-review');
    this.draft.members.forEach((m, i) => {
      const card = el('button', 'creator-review-card');
      const img = el('img');
      img.src = this.portraitOf(m, 'day');
      img.alt = '';
      const text = el('div', 'creator-review-text');
      text.append(el('div', 'creator-trait-name', `${m.name || '?'} ${cleanName(this.draft.surname)}`), el('div', 'creator-note', t(`age.${m.age ?? 'adult'}`)));
      text.append(el('div', 'creator-review-traits', m.traits.map((x) => t(this.catalog.traits[x]?.name ?? x)).join(' · ')));
      const dream = m.dream ? this.catalog.dreams?.[m.dream] : undefined;
      if (dream) text.append(el('div', 'creator-note', t('create.review.dream', { dream: t(dream.name) })));
      if (m.tastes) text.append(el('div', 'creator-note', t('create.review.tastes', { food: t(`dish.${m.tastes.food}`), music: t(`station.${m.tastes.music}`), color: t(`color.${m.tastes.color}`) })));
      const problem = familyProblem(this.catalog, { surname: this.draft.surname || 'x', members: [m] });
      if (problem && problem !== 'noAdult') text.append(el('div', 'creator-problem', t(`create.problem.${problem}`)));
      card.append(img, text);
      card.addEventListener('click', () => {
        this.current = i;
        this.step = 'traits';
        this.render();
      });
      cards.append(card);
    });
    col.append(cards);
    const ties = (this.draft.ties ?? []).filter((x) => x.kind !== 'roommate');
    if (ties.length) {
      const list = el('div', 'creator-note');
      for (const x of ties) {
        const a = this.draft.members[x.a]?.name;
        const b = this.draft.members[x.b]?.name;
        list.append(el('div', '', x.kind === 'parent' ? t('tie.parentOf', { a, b }) : `${a} & ${b}: ${t(`tie.${x.kind}`)}`));
      }
      col.append(el('div', 'creator-section', t('tie.title')), list);
    }
    return col;
  }

  // ---------- pé: voltar, avançar, começar ----------

  private renderFoot(): HTMLElement {
    const foot = el('div', 'creator-foot');
    const note = el('div', 'creator-problem');
    const buttons = el('div', 'creator-buttons');
    const steps = this.steps;
    const at = steps.indexOf(this.step);
    if (this.cancellable) {
      const cancel = el('button', 'btn btn-quiet', t('create.cancel'));
      cancel.addEventListener('click', () => this.cancel());
      buttons.append(cancel);
    }
    if (at > 0) {
      const back = el('button', 'btn btn-quiet', t('create.back'));
      back.addEventListener('click', () => {
        this.step = steps[at - 1];
        this.render();
      });
      buttons.append(back);
    }
    if (at < steps.length - 1) {
      const next = el('button', 'btn', t('create.next'));
      next.addEventListener('click', () => {
        this.step = steps[at + 1];
        this.render();
      });
      buttons.append(next);
    }
    const start = el('button', 'btn btn-go creator-start', t(this.editId ? 'edit.save' : this.toBin ? 'bin.start' : this.lotId ? 'town.startHere' : 'create.start'));
    start.addEventListener('click', () => {
      if (this.editId) {
        // plano 2, bloco 11: grava a aparência, as roupas e (com o benefício) os traços
        const m = this.member;
        const ok = this.ctrl.commandOrExplain({ type: 'editFolk', folkId: this.editId, look: m.look, closet: m.closet, traits: m.traits });
        if (ok) {
          this.ctrl.toast(t('edit.saved', { name: m.name.split(' ')[0] }));
          this.cancel();
        }
        return;
      }
      if (familyProblem(this.catalog, this.draft)) return;
      if (this.toBin) {
        if (this.ctrl.commandOrExplain({ type: 'binDraft', draft: this.draft })) {
          this.ctrl.townVersion++;
          this.ctrl.toast(t('bin.added', { name: cleanName(this.draft.surname) }));
          this.hide();
        }
        return;
      }
      if (this.lotId) {
        // bloco 15: chega ao bairro no lote escolhido (o resto do jogo continua)
        if (this.ctrl.townCommand({ type: 'foundFamily', lotId: this.lotId, draft: this.draft })) {
          this.ctrl.toast(t('town.arrived', { name: cleanName(this.draft.surname) }));
          this.hide();
        }
        return;
      }
      this.ctrl.newFamily(this.draft, this.death, this.life);
      this.hide();
    });
    buttons.append(start);
    if (!this.lotId && !this.toBin && !this.editId && this.step === 'review') {
      const ready = el('button', 'btn btn-quiet', t('create.ready'));
      ready.addEventListener('click', () => {
        this.ctrl.newGame(this.death, this.life);
        this.hide();
      });
      // bloco 14: morte ligada ou não no jogo novo
      const death = el('label', 'creator-death');
      const box = el('input');
      box.type = 'checkbox';
      box.checked = this.death;
      box.addEventListener('change', () => (this.death = box.checked));
      death.title = t('create.deathHint');
      death.append(box, el('span', '', t('create.death')));
      // bloco 17: relógio da vida
      const life = el('label', 'creator-death creator-life');
      const select = el('select') as HTMLSelectElement;
      for (const id of LIFE_PACE_IDS) {
        const o = el('option', '', t(`life.pace.${id}`)) as HTMLOptionElement;
        o.value = id;
        o.selected = id === this.life;
        select.append(o);
      }
      select.addEventListener('change', () => (this.life = select.value as LifePace));
      life.title = t('create.lifeHint');
      life.append(el('span', '', t('create.life')), select);
      foot.append(el('div', 'creator-note', t('create.note')), death, life, ready);
    }
    foot.append(note, buttons);
    queueMicrotask(() => this.refreshFoot());
    return foot;
  }

  /** Atualiza o aviso e o botão de começar sem redesenhar a tela (digitação). */
  private refreshFoot(): void {
    // plano 2, bloco 11: editando alguém em jogo não tem sobrenome da casa para conferir
    const problem = familyProblem(this.catalog, this.editId ? { ...this.draft, surname: 'x' } : this.draft);
    const note = this.root.querySelector('.creator-problem:not(.creator-review .creator-problem)');
    const start = this.root.querySelector<HTMLButtonElement>('.creator-start');
    if (note) note.textContent = problem ? t(`create.problem.${problem}`) : '';
    if (start) start.disabled = problem !== null;
  }

  /** Só o retrato grande (e a ficha do membro) muda enquanto arrasta um controle. */
  private refreshPortrait(): void {
    if (this.pending) return;
    this.pending = requestAnimationFrame(() => {
      this.pending = 0;
      const m = this.member;
      const wear: Wear = this.step === 'clothes' ? this.occasion : 'day';
      const img = this.root.querySelector<HTMLImageElement>('.creator-portrait');
      if (img) img.src = this.portraitOf(m, wear);
    });
  }

  private portraitOf(m: MemberDraft, wear: Wear): string {
    const dress = bandOf(m.age) ? ensembleOf({ look: m.look, age: m.age, closet: m.closet }, wear) : undefined;
    const key = `${JSON.stringify(m.look)}|${wear}|${m.age ?? ''}|${JSON.stringify(dress)}`;
    let url = this.portraits.get(key);
    if (!url) {
      url = this.portrait(m.look, wear, { age: m.age, dress });
      if (this.portraits.size > 120) this.portraits.clear();
      this.portraits.set(key, url);
    }
    return url;
  }
}
