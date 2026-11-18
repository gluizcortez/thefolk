import { FORMAL, HAIR, PAJAMA, PANTS, SHIRT, SKIN, SWIM } from '../game/art/palette';
import type { GameController } from '../game/controller';
import { t } from '../i18n';
import {
  LOOK_LIMITS,
  cleanName,
  MAX_FAMILY,
  MAX_NAME,
  MAX_TRAITS,
  TEMPER_AXES,
  TEMPER_BUDGET,
  TEMPER_MAX,
  familyProblem,
  temperSum,
  traitsClash,
} from '../sim';
import type { FamilyDraft, LifePace, Look, MemberDraft, Outfit, Speed, Wear } from '../sim';
import { LIFE_PACE_IDS } from '../sim';

// Bloco 5: tela de criar família. Monta um rascunho (sobrenome e até oito
// moradores com nome, aparência, roupas, traços, mês e temperamento) e
// entrega ao controle, que cria o mundo novo. Também oferece a família
// pronta como atalho. Interface própria: cartões de papel e botões de pílula.

function el<K extends keyof HTMLElementTagNameMap>(tag: K, className?: string, text?: string): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function hex(n: number): string {
  return `#${n.toString(16).padStart(6, '0')}`;
}

const FIRST_NAMES = [
  'Bento', 'Iara', 'Otávio', 'Cecília', 'Juca', 'Marta', 'Ravi', 'Lúcia', 'Dito', 'Helena',
  'Tião', 'Zélia', 'Ícaro', 'Bia', 'Nestor', 'Glória', 'Davi', 'Olga', 'Quim', 'Teca',
];
const SURNAMES = ['Goiabeira', 'Fresta', 'Paiol', 'Varanda', 'Cumeeira', 'Biquinha', 'Taramela', 'Soleira'];

/** Cores de cada linha de amostras (as que não são cor ficam como texto). */
const SWATCHES: Partial<Record<keyof Look, number[]>> = {
  skin: SKIN,
  hair: HAIR,
  shirt: SHIRT,
  pants: PANTS,
  formal: FORMAL,
  sleepwear: PAJAMA,
  swimwear: SWIM,
};
const LOOK_ROWS: (keyof Look)[] = ['skin', 'hair', 'style', 'face', 'body'];
const CLOTHES_ROWS: (keyof Look)[] = ['shirt', 'pants', 'formal', 'sleepwear', 'swimwear'];
/** que roupa o retrato mostra quando se mexe em cada linha */
const ROW_WEAR: Partial<Record<keyof Look, Outfit>> = { formal: 'formal', sleepwear: 'sleep', swimwear: 'swim', shirt: 'day', pants: 'day' };
const WEARS: Outfit[] = ['day', 'formal', 'sleep', 'swim'];

type Rnd = () => number;

export class FamilyCreator {
  private root = el('div', 'creator');
  private draft: FamilyDraft;
  private current = 0;
  private wear: Wear = 'day';
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

  constructor(
    private readonly host: HTMLElement,
    private readonly ctrl: GameController,
    private readonly portrait: (look: Look, wear: Wear) => string,
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
    this.openCard(cancellable);
  }

  /** Bloco 15: família nova que chega a um lote do bairro (o jogo continua o mesmo). */
  showForLot(lotId: number): void {
    this.lotId = lotId;
    this.openCard(true);
  }

  private openCard(cancellable: boolean): void {
    this.cancellable = cancellable;
    // o tempo para enquanto a família é criada
    this.speedBefore = this.ctrl.world.speed;
    this.ctrl.command({ type: 'setSpeed', speed: 0 });
    this.draft = this.freshDraft();
    this.current = 0;
    this.wear = 'day';
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

  // ---------- rascunho ----------

  private freshDraft(): FamilyDraft {
    const surname = SURNAMES[Math.floor(this.rnd() * SURNAMES.length)];
    return { surname, members: [this.randomMember([]), this.randomMember([])] };
  }

  private randomMember(taken: string[]): MemberDraft {
    const r = this.rnd;
    const pick = (n: number) => Math.floor(r() * n);
    const free = FIRST_NAMES.filter((n) => !taken.includes(n));
    const name = free[pick(free.length)] ?? `${FIRST_NAMES[0]} ${taken.length + 1}`;
    const look = {} as Look;
    for (const k of Object.keys(LOOK_LIMITS) as (keyof Look)[]) look[k] = pick(LOOK_LIMITS[k]);
    const traitIds = Object.keys(this.ctrl.sim.catalog.traits);
    const traits: string[] = [];
    const count = 1 + pick(2);
    for (let guard = 0; traits.length < count && guard < 30; guard++) {
      const id = traitIds[pick(traitIds.length)];
      if (traits.includes(id) || traits.some((x) => traitsClash(x, id))) continue;
      traits.push(id);
    }
    const month = pick(this.ctrl.sim.catalog.months.length);
    return { name, look, traits, month, temper: { ...this.ctrl.sim.catalog.months[month].temper } };
  }

  private get member(): MemberDraft {
    return this.draft.members[this.current];
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
    const title = el('div', 'creator-title', lot ? t('town.creating', { number: lot.number }) : t('create.title'));
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
      img.src = this.portraitOf(m.look, 'day');
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
        this.render();
      });
      tabs.append(add);
    }
    head.append(title, surname, tabs, el('div', 'creator-count', t('create.count', { n: this.draft.members.length, max: MAX_FAMILY })));
    return head;
  }

  private renderBody(): HTMLElement {
    const body = el('div', 'creator-body');
    const m = this.member;

    // retrato, nome e roupa à mostra
    const left = el('div', 'creator-col creator-figure');
    const img = el('img', 'creator-portrait');
    img.src = this.portraitOf(m.look, this.wear);
    img.alt = m.name;
    const name = el('input', 'creator-name');
    name.value = m.name;
    name.maxLength = MAX_NAME;
    name.setAttribute('aria-label', t('create.name'));
    name.addEventListener('input', () => {
      m.name = name.value;
      const tab = this.root.querySelectorAll('.creator-member span')[this.current];
      if (tab) tab.textContent = m.name || '?';
      this.refreshFoot();
    });
    const wears = el('div', 'catalog-tabs creator-wears');
    wears.append(el('span', 'creator-label', t('look.wearing')));
    for (const w of WEARS) {
      const b = el('button', 'tab', t(`outfit.${w}`));
      b.classList.toggle('on', this.wear === w);
      b.addEventListener('click', () => {
        this.wear = w;
        this.render();
      });
      wears.append(b);
    }
    const row = el('div', 'creator-actions');
    const random = el('button', 'btn btn-small', t('create.random'));
    random.addEventListener('click', () => {
      this.draft.members[this.current] = this.randomMember(this.draft.members.filter((x) => x !== m).map((x) => x.name));
      this.render();
    });
    row.append(random);
    // bloco 17: jovem, adulto ou idoso
    const ages = el('div', 'catalog-tabs creator-wears creator-ages');
    ages.append(el('span', 'creator-label', t('create.age')));
    for (const a of ['teen', undefined, 'elder'] as const) {
      const b = el('button', 'tab', t(`age.${a ?? 'adult'}`));
      b.classList.toggle('on', m.age === a);
      b.addEventListener('click', () => {
        if (a) m.age = a;
        else delete m.age;
        this.render();
      });
      ages.append(b);
    }
    if (this.draft.members.length > 1) {
      const remove = el('button', 'btn btn-small btn-quiet', t('create.remove'));
      remove.addEventListener('click', () => {
        this.draft.members.splice(this.current, 1);
        this.current = Math.max(0, this.current - 1);
        this.render();
      });
      row.append(remove);
    }
    left.append(img, name, wears, ages, row);

    // aparência e roupas
    const mid = el('div', 'creator-col');
    mid.append(el('div', 'creator-section', t('create.looks')));
    for (const k of LOOK_ROWS) mid.append(this.lookRow(k));
    mid.append(el('div', 'creator-section', t('create.clothes')));
    for (const k of CLOTHES_ROWS) mid.append(this.lookRow(k));

    // traços, mês e temperamento
    const right = el('div', 'creator-col');
    right.append(el('div', 'creator-section', t('create.traits')), this.traitChips());
    right.append(el('div', 'creator-section', t('month.title')), this.monthPicker());
    right.append(el('div', 'creator-section', t('temper.title')), this.temperRows());

    body.append(left, mid, right);
    return body;
  }

  private lookRow(k: keyof Look): HTMLElement {
    const m = this.member;
    const row = el('div', 'creator-row');
    row.append(el('span', 'creator-label', t(`look.${k}`)));
    const opts = el('div', 'creator-opts');
    const colors = SWATCHES[k];
    for (let i = 0; i < LOOK_LIMITS[k]; i++) {
      const b = el('button', colors ? 'creator-swatch' : 'tab', colors ? undefined : t(`${k}.${i}`));
      if (colors) {
        b.style.background = hex(colors[i]);
        b.title = t(`look.${k}`);
        b.setAttribute('aria-label', `${t(`look.${k}`)} ${i + 1}`);
      }
      b.classList.toggle('on', m.look[k] === i);
      b.addEventListener('click', () => {
        m.look[k] = i;
        const show = ROW_WEAR[k];
        if (show) this.wear = show;
        this.render();
      });
      opts.append(b);
    }
    row.append(opts);
    return row;
  }

  private traitChips(): HTMLElement {
    const m = this.member;
    const wrap = el('div', 'creator-opts creator-traits');
    for (const def of Object.values(this.ctrl.sim.catalog.traits)) {
      const on = m.traits.includes(def.id);
      const blocked = !on && (m.traits.length >= MAX_TRAITS || m.traits.some((x) => traitsClash(x, def.id)));
      const b = el('button', 'tab', t(def.name));
      b.classList.toggle('on', on);
      b.disabled = blocked;
      if (def.hint) b.title = t(def.hint);
      b.addEventListener('click', () => {
        m.traits = on ? m.traits.filter((x) => x !== def.id) : [...m.traits, def.id];
        this.render();
      });
      wrap.append(b);
    }
    return wrap;
  }

  private monthPicker(): HTMLElement {
    const m = this.member;
    const months = this.ctrl.sim.catalog.months;
    const wrap = el('div', 'creator-month');
    const grid = el('div', 'creator-opts');
    for (const def of months) {
      const label = t(def.name).replace(/^mês d[aeo] /, '');
      const b = el('button', 'tab', label);
      b.classList.toggle('on', m.month === def.id);
      b.title = t(def.hint);
      b.addEventListener('click', () => {
        // o mês sugere um temperamento; dá para mexer depois
        m.month = def.id;
        m.temper = { ...def.temper };
        this.render();
      });
      grid.append(b);
    }
    const def = months[m.month];
    const names = (ids: number[]) => ids.map((id) => t(months[id].name).replace(/^mês d[aeo] /, '')).join(', ');
    const info = el('div', 'creator-note');
    info.append(el('div', '', t(def.hint)));
    if (def.likes.length) info.append(el('div', 'good', t('month.likes', { list: names(def.likes) })));
    if (def.dislikes.length) info.append(el('div', 'bad', t('month.dislikes', { list: names(def.dislikes) })));
    wrap.append(grid, info);
    return wrap;
  }

  private temperRows(): HTMLElement {
    const m = this.member;
    const wrap = el('div', 'creator-temper');
    const free = TEMPER_BUDGET - temperSum(m.temper);
    for (const axis of TEMPER_AXES) {
      const row = el('div', 'creator-axis');
      row.title = t(`temperHint.${axis}`);
      const minus = el('button', 'pill-step', '−');
      minus.setAttribute('aria-label', `${t(`temper.${axis}`)} −`);
      minus.disabled = m.temper[axis] <= 0;
      minus.addEventListener('click', () => {
        m.temper[axis]--;
        this.render();
      });
      const plus = el('button', 'pill-step', '+');
      plus.setAttribute('aria-label', `${t(`temper.${axis}`)} +`);
      plus.disabled = m.temper[axis] >= TEMPER_MAX || free <= 0;
      plus.addEventListener('click', () => {
        m.temper[axis]++;
        this.render();
      });
      const pips = el('div', 'pips');
      for (let i = 0; i < TEMPER_MAX; i++) pips.append(el('span', i < m.temper[axis] ? 'pip on' : 'pip'));
      row.append(el('span', 'creator-label', t(`temper.${axis}`)), minus, pips, plus);
      wrap.append(row);
    }
    wrap.append(el('div', free > 0 ? 'creator-free warn' : 'creator-free', t('temper.points', { n: free })));
    wrap.append(el('div', 'creator-note', t('temper.habit')));
    return wrap;
  }

  private renderFoot(): HTMLElement {
    const foot = el('div', 'creator-foot');
    const note = el('div', 'creator-problem');
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
    const buttons = el('div', 'creator-buttons');
    if (this.cancellable) {
      const cancel = el('button', 'btn btn-quiet', t('create.cancel'));
      cancel.addEventListener('click', () => this.cancel());
      buttons.append(cancel);
    }
    const start = el('button', 'btn btn-go creator-start', t(this.lotId ? 'town.startHere' : 'create.start'));
    start.addEventListener('click', () => {
      if (familyProblem(this.ctrl.sim.catalog, this.draft)) return;
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
    if (this.lotId) {
      buttons.append(start);
      foot.append(note, buttons);
    } else {
      buttons.append(ready, start);
      foot.append(el('div', 'creator-note', t('create.note')), death, life, note, buttons);
    }
    queueMicrotask(() => this.refreshFoot());
    return foot;
  }

  /** Atualiza o aviso e o botão de começar sem redesenhar a tela (digitação). */
  private refreshFoot(): void {
    const problem = familyProblem(this.ctrl.sim.catalog, this.draft);
    const note = this.root.querySelector('.creator-problem');
    const start = this.root.querySelector<HTMLButtonElement>('.creator-start');
    if (note) note.textContent = problem ? t(`create.problem.${problem}`) : '';
    if (start) start.disabled = problem !== null;
  }

  private portraitOf(look: Look, wear: Wear): string {
    const key = `${JSON.stringify(look)}|${wear}`;
    let url = this.portraits.get(key);
    if (!url) {
      url = this.portrait(look, wear);
      this.portraits.set(key, url);
    }
    return url;
  }
}
