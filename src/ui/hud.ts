import { SHIRT, SKIN } from '../game/art/palette';
import { COVER_ART, FLOOR_ART } from '../game/art/house';
import type { BuildTool, GameController } from '../game/controller';
import { t } from '../i18n';
import {
  availableSocials,
  friendshipLabel,
  relationOf,
  respectLabel,
  romanceLabel,
  MAX_SKILL_LEVEL,
  NEED_IDS,
  PROMOTE_AT,
  billAmount,
  careerOf,
  clockOf,
  formatClock,
  formatMoney,
  levelOf,
  levelProgress,
  missingSkills,
  moodOf,
  nextShift,
  sellValue,
  skillLevel,
  RAISE_COOLDOWN,
  bossBlocks,
  bossOf,
  bossRespectFor,
  canAskRaise,
  choiceChance,
  coworkersOf,
  expectedCustomers,
  gigAllowed,
  payFor,
  raiseChance,
  reputationLabel,
  reputationOf,
  transferLevel,
  DIRTY_AT,
  careAvailable,
  stateOf,
  FAIR,
  GROCERIES,
  MAID,
  REPAIR,
  TAKEOUT,
  classifiedsOpen,
  debtOf,
  doorTaken,
  freshPaper,
  interactionReady,
  orderProblem,
  unpaidBills,
} from '../sim';
import type {
  Action,
  CareerDef,
  CareerLevel,
  Folk,
  Mess,
  NeedId,
  ObjectCategory,
  ObjectDef,
  Relation,
  ServiceOrder,
  SocialCategory,
  Speed,
  WorldObject,
} from '../sim';
import { iconSvg } from './icons';

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className?: string,
  text?: string,
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

const SEGMENTS = 10;

const CATEGORIES: (ObjectCategory | 'all')[] = [
  'all',
  'seating',
  'beds',
  'surfaces',
  'appliances',
  'plumbing',
  'electronics',
  'lighting',
  'decor',
  'hobbies',
];

type Panel = 'skills' | 'job' | 'relations' | null;
type JobTab = 'job' | 'gigs' | 'business';
const JOB_TABS: JobTab[] = ['job', 'gigs', 'business'];

type BuildTab = 'walls' | 'openings' | 'floors' | 'coverings';
const BUILD_TABS: BuildTab[] = ['walls', 'openings', 'floors', 'coverings'];
/** ferramenta que cada aba do modo construção escolhe ao abrir */
const TAB_TOOL: Record<BuildTab, BuildTool> = { walls: 'wall', openings: 'door', floors: 'floor', coverings: 'paint' };
/** aba onde fica cada ferramenta */
const TOOL_TAB: Record<BuildTool, BuildTab> = {
  wall: 'walls',
  erase: 'walls',
  door: 'openings',
  window: 'openings',
  floor: 'floors',
  paint: 'coverings',
};

const SOCIAL_ORDER: SocialCategory[] = ['friendly', 'professional', 'romantic', 'mean'];

function hex(n: number): string {
  return `#${n.toString(16).padStart(6, '0')}`;
}

/** Rostinho do folk em SVG, na cor de pele e com a camisa dele. */
function faceSvg(look: Folk['look'], size: number, mood = 60): string {
  const skin = hex(SKIN[look.skin % SKIN.length]);
  const shirt = hex(SHIRT[look.shirt % SHIRT.length]);
  const curve = (11 + (mood / 100) * 8).toFixed(1);
  return (
    `<svg viewBox="0 0 24 24" width="${size}" height="${size}" aria-hidden="true">` +
    `<path d="M3 24 Q3 17 12 17 Q21 17 21 24Z" fill="${shirt}" stroke="#2a2320" stroke-width="1.2"/>` +
    `<circle cx="12" cy="10" r="7" fill="${skin}" stroke="#2a2320" stroke-width="1.2"/>` +
    `<circle cx="9.5" cy="9.5" r="0.9" fill="#2a2320"/><circle cx="14.5" cy="9.5" r="0.9" fill="#2a2320"/>` +
    `<path d="M9.3 12.6 Q12 ${(Number(curve) - 2.4).toFixed(1)} 14.7 12.6" fill="none" stroke="#2a2320" stroke-width="1.1" stroke-linecap="round"/></svg>`
  );
}

/** Primeiro nome, para textos curtos. */
function first(name: string): string {
  return name.split(' ')[0];
}

/** "Seg a Sex", "Qua a Dom" ou a lista, quando os dias não são seguidos. */
function daysText(days: number[]): string {
  const sorted = [...days].sort((a, b) => a - b);
  const run = sorted.every((d, i) => i === 0 || d === sorted[i - 1] + 1);
  if (run && sorted.length > 2) return `${t(`weekday.${sorted[0]}`)} a ${t(`weekday.${sorted[sorted.length - 1]}`)}`;
  return sorted.map((d) => t(`weekday.${d}`)).join(', ');
}

function hourText(h: number): string {
  return `${String(h % 24).padStart(2, '0')}:00`;
}

function scheduleText(level: CareerLevel): string {
  return t('job.schedule', {
    days: daysText(level.days),
    start: hourText(level.startHour),
    end: hourText(level.startHour + level.hours),
  });
}

function whenText(tick: number): string {
  const c = clockOf(tick);
  return `${t(`weekday.${(c.day - 1) % 7}`)} ${formatClock(tick)}`;
}

interface NeedRow {
  segs: HTMLElement[];
  row: HTMLElement;
}

/** HUD em HTML por cima do canvas. Só lê o estado e manda comandos. */
export class Hud {
  private clockDay = el('span', 'clock-day');
  private clockTime = el('span', 'clock-time');
  private clockSky = el('span', 'clock-sky');
  private speedButtons: HTMLButtonElement[] = [];
  private needRows = new Map<NeedId, NeedRow>();
  private nameEl = el('div', 'folk-name');
  private traitsEl = el('div', 'folk-traits');
  private moodWord = el('span', 'mood-word');
  private moodFill = el('div', 'mood-fill');
  private autonomyInput = el('input');
  private queueEl = el('div', 'queue-list');
  private queueSig = '';
  private toastsEl = el('div', 'toasts');
  private menuEl = el('div', 'menu card');
  private bubbleEl = el('div', 'bubble');
  private tooltipEl = el('div', 'tooltip');
  private bubbleIcon: string | null = null;
  private menuOpen = false;
  private lastPausedSpeed: Speed = 1;
  private fundsEl = el('button', 'funds');
  private buyButton = el('button', 'btn btn-buy');
  private panelEl = el('div', 'card panel');
  private panel: Panel = null;
  private panelSig = '';
  private jobTab: JobTab = 'job';
  private wevEl = el('div', 'card wev');
  private wevSig = '';
  private panelButtons = new Map<Exclude<Panel, null>, HTMLButtonElement>();
  private faceEl = el('div', 'folk-face');
  private householdEl = el('div', 'household');
  private householdSig = '';
  private floatsEl = el('div', 'floats');
  /** quem está aberto ou fechado no painel de relações (o jogador escolhe) */
  private relOpen = new Map<number, boolean>();
  private catalogEl = el('div', 'card catalog');
  private catalogTabs = el('div', 'catalog-tabs');
  private catalogItems = el('div', 'catalog-items');
  private catalogHint = el('div', 'catalog-hint');
  private category: ObjectCategory | 'all' = 'all';
  private catalogSig = '';
  private thumbnail: ((art: string) => string) | null = null;
  private swatch: ((texture: string, tall?: boolean) => string) | null = null;
  private buildButton = el('button', 'btn btn-buy');
  private buildEl = el('div', 'card catalog build');
  private buildTabs = el('div', 'catalog-tabs');
  private buildItems = el('div', 'catalog-items');
  private buildHint = el('div', 'catalog-hint');
  private undoButton = el('button', 'btn btn-undo');
  private buildTab: BuildTab = 'walls';
  private buildSig = '';

  constructor(
    private readonly root: HTMLElement,
    private readonly ctrl: GameController,
  ) {
    this.buildClock();
    this.buildSystem();
    this.buildViewBar();
    this.buildFolkCard();
    this.root.append(this.householdEl);
    this.buildNeeds();
    this.buildQueue();
    this.buildPanel();
    this.buildCatalog();
    this.buildBuildPanel();
    this.root.append(this.wevEl, this.floatsEl, this.toastsEl, this.menuEl, this.bubbleEl, this.tooltipEl);
    this.wevEl.hidden = true;
    this.tooltipEl.hidden = true;
    this.menuEl.hidden = true;
    this.bubbleEl.hidden = true;
    ctrl.onToast((text) => this.showToast(text));
    this.update();
  }

  // ---------- montagem ----------

  private buildClock(): void {
    const card = el('div', 'card clock');
    const info = el('div', 'clock-info');
    info.append(this.clockSky, this.clockDay, this.clockTime);
    const speeds = el('div', 'speeds');
    const defs: [Speed, string, string][] = [
      [0, '❙❙', 'hud.pause'],
      [1, '▸', 'hud.speed1'],
      [2, '▸▸', 'hud.speed2'],
      [3, '▸▸▸', 'hud.speed3'],
    ];
    for (const [speed, glyph, tip] of defs) {
      const b = el('button', 'speed', glyph);
      b.title = t(tip);
      b.setAttribute('aria-label', t(tip));
      b.addEventListener('click', () => this.setSpeed(speed));
      this.speedButtons.push(b);
      speeds.append(b);
    }
    this.fundsEl.title = t('hud.funds');
    this.fundsEl.addEventListener('click', () => this.togglePanel('job'));
    card.append(info, this.fundsEl, speeds);
    this.root.append(card);
  }

  private setSpeed(speed: Speed): void {
    const cur = this.ctrl.world.speed;
    if (speed === 0 && cur === 0) {
      this.ctrl.command({ type: 'setSpeed', speed: this.lastPausedSpeed });
    } else {
      if (speed === 0) this.lastPausedSpeed = cur;
      this.ctrl.command({ type: 'setSpeed', speed });
    }
    this.update();
  }

  private buildSystem(): void {
    const bar = el('div', 'system');
    const save = el('button', 'btn', t('hud.save'));
    save.addEventListener('click', () => void this.ctrl.save());
    const load = el('button', 'btn', t('hud.load'));
    load.addEventListener('click', () => void this.ctrl.load());
    const fresh = el('button', 'btn btn-quiet', t('hud.new'));
    let armed = 0;
    fresh.addEventListener('click', () => {
      if (armed) {
        window.clearTimeout(armed);
        armed = 0;
        fresh.textContent = t('hud.new');
        fresh.classList.remove('armed');
        this.ctrl.newGame();
        return;
      }
      fresh.textContent = t('hud.newConfirm');
      fresh.classList.add('armed');
      armed = window.setTimeout(() => {
        armed = 0;
        fresh.textContent = t('hud.new');
        fresh.classList.remove('armed');
      }, 3500);
    });
    bar.append(save, load, fresh);
    this.root.append(bar);
  }

  /** Controles de câmera e de paredes, no canto superior esquerdo. */
  private buildViewBar(): void {
    const bar = el('div', 'viewbar');
    const turn = (glyph: string, tip: string, dir: number) => {
      const b = el('button', 'btn btn-icon', glyph);
      b.title = t(tip);
      b.setAttribute('aria-label', t(tip));
      b.addEventListener('click', () => this.ctrl.rotateCamera(dir));
      return b;
    };
    const walls = el('button', 'btn', t(`hud.walls.${this.ctrl.wallMode}`));
    walls.title = t('hud.wallsTip');
    walls.addEventListener('click', () => {
      walls.textContent = t(`hud.walls.${this.ctrl.cycleWallMode()}`);
    });
    this.buyButton.title = t('hud.buyTip');
    this.buyButton.addEventListener('click', () => this.toggleBuyMode());
    this.buildButton.title = t('hud.buildTip');
    this.buildButton.addEventListener('click', () => this.toggleBuildMode());
    bar.append(turn('⟲', 'hud.turnLeft', -1), turn('⟳', 'hud.turnRight', 1), walls, this.buyButton, this.buildButton);
    this.root.append(bar, el('div', 'help', t('hud.help')));
  }

  private buildFolkCard(): void {
    const card = el('div', 'card folk');
    const face = this.faceEl;
    const body = el('div', 'folk-body');
    const mood = el('div', 'mood');
    const moodLabel = el('span', 'mood-label', `${t('mood.label')}: `);
    const moodTrack = el('div', 'mood-track');
    moodTrack.append(this.moodFill);
    const moodLine = el('div', 'mood-line');
    moodLine.append(moodLabel, this.moodWord);
    mood.append(moodLine, moodTrack);
    const auto = el('label', 'autonomy');
    this.autonomyInput.type = 'checkbox';
    this.autonomyInput.addEventListener('change', () => {
      this.ctrl.command({
        type: 'setAutonomy',
        folkId: this.ctrl.folk.id,
        on: this.autonomyInput.checked,
      });
      this.queueSig = '';
    });
    auto.append(this.autonomyInput, el('span', 'switch'), el('span', '', t('hud.autonomy')));
    const tabs = el('div', 'folk-tabs');
    for (const id of ['skills', 'job', 'relations'] as const) {
      const b = el('button', 'btn btn-small', t(`hud.${id}`));
      b.addEventListener('click', () => this.togglePanel(id));
      this.panelButtons.set(id, b);
      tabs.append(b);
    }
    body.append(this.nameEl, this.traitsEl, mood, auto, tabs);
    card.append(face, body);
    this.root.append(card);
  }

  private buildNeeds(): void {
    const card = el('div', 'card needs');
    for (const id of NEED_IDS) {
      const row = el('div', 'need');
      const icon = el('span', 'need-icon');
      icon.innerHTML = iconSvg(id, 16);
      const label = el('span', 'need-label', t(`need.${id}`));
      const meter = el('div', 'meter');
      const segs: HTMLElement[] = [];
      for (let i = 0; i < SEGMENTS; i++) {
        const s = el('span', 'seg');
        segs.push(s);
        meter.append(s);
      }
      row.append(icon, label, meter);
      card.append(row);
      this.needRows.set(id, { segs, row });
    }
    this.root.append(card);
  }

  private buildQueue(): void {
    const wrap = el('div', 'queue');
    wrap.append(el('div', 'queue-title', t('queue.title')), this.queueEl);
    this.root.append(wrap);
  }

  // ---------- atualização ----------

  update(): void {
    const world = this.ctrl.world;
    const folk = this.ctrl.folk;
    const clock = clockOf(world.tick);

    this.clockDay.textContent = t('hud.day', { day: clock.day, weekday: t(`weekday.${(clock.day - 1) % 7}`) });
    const house = world.household;
    const funds = formatMoney(house.funds);
    if (this.fundsEl.textContent !== funds) this.fundsEl.textContent = funds;
    this.fundsEl.classList.toggle('debt', house.funds < 0);
    const debt = debtOf(world);
    const unpaid = unpaidBills(world).length;
    this.fundsEl.title = `${t('hud.funds')}. ${
      debt > 0
        ? t('hud.billsUnpaid', { amount: formatMoney(debt), when: whenText(house.nextBills) })
        : t('hud.billsNone', { when: whenText(house.nextBills), amount: formatMoney(billAmount(world, this.ctrl.sim.catalog)) })
    }`;
    this.fundsEl.classList.toggle('mail', unpaid > 0);
    if (this.fundsEl.dataset.mail !== String(unpaid)) {
      this.fundsEl.dataset.mail = String(unpaid);
      this.fundsEl.dataset.mailText = unpaid > 0 ? t('hud.mail', { n: unpaid }) : '';
    }
    const buyLabel = this.ctrl.mode === 'buy' ? t('hud.live') : t('hud.buy');
    if (this.buyButton.textContent !== buyLabel) this.buyButton.textContent = buyLabel;
    this.buyButton.classList.toggle('on', this.ctrl.mode === 'buy');
    const buildLabel = this.ctrl.mode === 'build' ? t('hud.live') : t('hud.build');
    if (this.buildButton.textContent !== buildLabel) this.buildButton.textContent = buildLabel;
    this.buildButton.classList.toggle('on', this.ctrl.mode === 'build');
    this.clockTime.textContent =
      world.speed === 0 ? `${formatClock(world.tick)} · ${t('hud.paused')}` : formatClock(world.tick);
    const night = clock.hour < 6 || clock.hour >= 19;
    this.clockSky.classList.toggle('night', night);
    this.speedButtons.forEach((b, i) => b.classList.toggle('on', i === world.speed));

    this.nameEl.textContent = folk.name;
    const traitText = folk.traits.map((id) => t(`trait.${id}`)).join(' · ');
    if (this.traitsEl.textContent !== traitText) this.traitsEl.textContent = traitText;
    this.autonomyInput.checked = folk.autonomy;

    const mood = moodOf(this.ctrl.sim.catalog, folk.needs);
    const level = mood >= 80 ? 5 : mood >= 62 ? 4 : mood >= 45 ? 3 : mood >= 28 ? 2 : 1;
    this.moodWord.textContent = t(`mood.${level}`);
    this.moodFill.style.width = `${Math.round(mood)}%`;
    this.moodFill.dataset.level = String(level);
    const faceKey = `${folk.id}|${level}`;
    if (this.faceEl.dataset.key !== faceKey) {
      this.faceEl.dataset.key = faceKey;
      this.faceEl.innerHTML = faceSvg(folk.look, 46, mood);
    }
    this.renderHousehold();

    for (const id of NEED_IDS) {
      const row = this.needRows.get(id);
      if (!row) continue;
      const v = folk.needs[id];
      const tone = v < 25 ? 'low' : v < 55 ? 'mid' : 'high';
      if (row.row.dataset.tone !== tone) row.row.dataset.tone = tone;
      row.row.title = `${t(`need.${id}`)}: ${Math.round(v)}`;
      row.segs.forEach((s, i) => s.classList.toggle('on', v >= (i + 0.5) * (100 / SEGMENTS)));
    }

    this.renderQueue();
    this.renderWorkEvent();
    this.renderPanel();
    this.renderCatalog();
    this.renderBuild();
  }

  private actionLabel(action: Action): string {
    if (action.kind === 'goto') return t('act.goto');
    if (action.kind === 'work') return t('act.work');
    if (action.kind === 'leave') return t('act.leave');
    if (action.kind === 'tidy') {
      const mess = this.ctrl.world.mess.find((m) => m.id === action.messId);
      return this.messAction(mess);
    }
    if (action.kind === 'door') {
      const other = action.otherId !== undefined ? this.ctrl.sim.findFolk(action.otherId) : undefined;
      return other ? t('act.doorFor', { name: first(other.name) }) : t('act.door');
    }
    if (action.serviceId) return t(`act.call.${action.serviceId}`);
    if (action.kind === 'social' || action.kind === 'listen') {
      const other = action.otherId !== undefined ? this.ctrl.sim.findFolk(action.otherId) : undefined;
      const name = other ? first(other.name) : '…';
      if (action.kind === 'listen') return t('act.listen', { name });
      const def = this.ctrl.sim.catalog.socials[action.socialId ?? ''];
      return t('act.social', { social: def ? t(def.label) : '…', name });
    }
    if (action.interactionId === 'invite' && action.otherId !== undefined) {
      const n = this.ctrl.world.neighbors.find((x) => x.id === action.otherId);
      if (n) return `${t('act.invite')}: ${first(n.name)}`;
    }
    const obj = action.objectId !== undefined ? this.ctrl.sim.findObject(action.objectId) : undefined;
    const def = obj && this.ctrl.sim.defOf(obj);
    const it = this.ctrl.sim.interactionOf(action);
    if (!def || !it) return '…';
    return `${t(def.name)}: ${t(it.label)}`;
  }

  private renderQueue(): void {
    const folk = this.ctrl.folk;
    const sig =
      `${this.ctrl.mode}|${folk.away?.until ?? ''}|${folk.collapsed > 0}|${folk.autonomy}|` +
      folk.queue.map((a) => `${a.id}:${a.phase}`).join(',');
    if (sig === this.queueSig) return;
    this.queueSig = sig;
    this.queueEl.replaceChildren();

    if (this.ctrl.mode !== 'live') {
      this.queueEl.parentElement!.hidden = true;
      return;
    }
    this.queueEl.parentElement!.hidden = false;
    if (folk.away) {
      this.queueEl.append(el('div', 'queue-empty', t('queue.away', { time: formatClock(folk.away.until) })));
      return;
    }
    if (folk.collapsed > 0) {
      this.queueEl.append(el('div', 'queue-empty', t('queue.collapsed')));
      return;
    }
    if (folk.queue.length === 0) {
      const key = folk.autonomy ? 'queue.empty' : 'queue.emptyManual';
      this.queueEl.append(el('div', 'queue-empty', t(key, { name: folk.name.split(' ')[0] })));
      return;
    }
    folk.queue.forEach((action, index) => {
      const pill = el('div', 'pill');
      if (index === 0) pill.classList.add('current');
      if (action.source === 'auto') pill.classList.add('auto');
      const text = el('div', 'pill-text');
      text.append(el('span', 'pill-label', this.actionLabel(action)));
      const notes: string[] = [];
      if (action.source === 'auto') notes.push(t('queue.auto'));
      if (action.phase === 'walking') notes.push(t('queue.walking'));
      if (notes.length) text.append(el('span', 'pill-note', notes.join(' · ')));
      const cancel = el('button', 'pill-cancel', '✕');
      cancel.title = t('queue.cancel');
      cancel.setAttribute('aria-label', t('queue.cancel'));
      cancel.addEventListener('click', () => {
        this.ctrl.command({ type: 'cancel', folkId: folk.id, actionId: action.id });
        this.update();
      });
      pill.append(text, cancel);
      this.queueEl.append(pill);
    });
  }

  // ---------- menu de interações ----------

  isMenuOpen(): boolean {
    return this.menuOpen;
  }

  closeMenu(): void {
    this.menuOpen = false;
    this.menuEl.hidden = true;
  }

  openMenu(x: number, y: number, obj: WorldObject): void {
    const def = this.ctrl.sim.defOf(obj);
    if (!def) return;
    const folk = this.ctrl.folk;
    this.menuEl.replaceChildren(el('div', 'menu-title', t(def.name)));
    const state = stateOf(obj);
    const status = this.objectStatus(obj);
    if (status) this.menuEl.append(el('div', `menu-note ${state.broken ? 'menu-warn' : ''}`, status));
    // bloco 2: cada conta da caixa de correio, detalhada
    if (def.interactions.some((i) => i.special === 'payBills')) {
      for (const bill of unpaidBills(this.ctrl.world)) {
        const day = Math.floor(bill.due / 1440) + 1;
        const late = this.ctrl.world.tick > bill.due;
        const line = `${t('bill.line', { power: formatMoney(bill.power), water: formatMoney(bill.water), furniture: formatMoney(bill.furniture) })} · ${t(late ? 'bill.overdue' : 'bill.due', { day })}`;
        this.menuEl.append(el('div', `menu-note ${late ? 'menu-warn' : ''}`, line));
      }
    }
    // cuidados só aparecem quando há o que fazer; o resto some se quebrou.
    // Comida pedida, feira e contas só aparecem quando existem.
    const world = this.ctrl.world;
    const shown = def.interactions.filter((it) => {
      if (it.hidden) return false;
      if (it.care) return careAvailable(obj, it);
      if (it.takeout || it.special === 'fair' || it.special === 'payBills') return interactionReady(world, it);
      return true;
    });
    if (shown.length === 0) {
      this.menuEl.append(el('div', 'menu-note', t('menu.nothing')));
    }
    for (const it of shown) {
      const b = el('button', 'menu-item');
      const main = Object.entries(it.effects).sort((a, c) => (c[1] ?? 0) - (a[1] ?? 0))[0];
      const icon = el('span', 'menu-icon');
      if (main) icon.innerHTML = iconSvg(main[0] as NeedId, 16);
      b.append(icon, el('span', '', t(it.label)));
      const extras: string[] = [];
      if (it.cost) extras.push(formatMoney(it.cost));
      if (it.special === 'payBills') extras.push(formatMoney(debtOf(world)));
      if (it.special === 'fair') extras.push(formatMoney(FAIR.price));
      if (it.skill) extras.push(t(`skill.${it.skill.id}`));
      if (extras.length) b.append(el('span', 'menu-extra', extras.join(' · ')));
      if (state.broken && !it.care) {
        b.disabled = true;
        b.title = t('problem.broken');
      } else if (!interactionReady(world, it)) {
        b.disabled = true;
        b.title = t('problem.noFood');
      }
      b.addEventListener('click', () => {
        if (it.special === 'invite') {
          this.openInviteMenu(x, y);
          return;
        }
        if (it.special === 'services') {
          this.openServicesMenu(x, y);
          return;
        }
        this.ctrl.commandOrExplain({
          type: 'queueUse',
          folkId: folk.id,
          objectId: obj.id,
          interactionId: it.id,
        });
        this.closeMenu();
        this.update();
      });
      if (it.special === 'invite' || it.special === 'services') b.append(el('span', 'menu-extra', '›'));
      this.menuEl.append(b);
    }
    this.showMenuAt(x, y);
  }

  /** Estado do objeto em palavras (sujo, quebrado, remendado, lixo cheio), ou null se está tudo bem. */
  objectStatus(obj: WorldObject): string | null {
    const def = this.ctrl.sim.defOf(obj);
    const s = obj.state;
    if (!def || !s) return null;
    const parts: string[] = [];
    if (s.broken) parts.push(s.repair > 0 ? t('state.brokenRepair', { pct: Math.round(s.repair) }) : t('state.broken'));
    else if (s.patched) parts.push(t('state.patched'));
    if (s.dirt >= DIRTY_AT) parts.push(t('state.dirty'));
    else if (s.dirt >= 25) parts.push(t('state.grimy'));
    if (def.upkeep?.bin) parts.push(s.fill >= 100 ? t('state.binFull') : t('state.binFill', { pct: Math.round(s.fill) }));
    // bloco 2: o que tem na geladeira e na caixa de correio
    const house = this.ctrl.world.household;
    if (def.pantry) {
      parts.push(house.pantry > 0 ? t('state.pantry', { n: house.pantry }) : t('state.pantryEmpty'));
      if (house.takeout > 0) parts.push(t('state.takeout', { n: house.takeout }));
    }
    if (def.interactions.some((i) => i.special === 'payBills')) {
      const bills = unpaidBills(this.ctrl.world);
      parts.push(bills.length ? t('state.bills', { n: bills.length, amount: formatMoney(debtOf(this.ctrl.world)) }) : t('state.noMail'));
      if (def.interactions.some((i) => i.special === 'fair' && interactionReady(this.ctrl.world, i))) parts.push(t('state.fairOpen'));
    }
    else if (def.upkeep?.breaks && !s.broken && s.wear >= 60) parts.push(t('state.worn'));
    return parts.length ? parts.join(' · ') : null;
  }

  /** Dica ao passar o mouse num objeto: o nome e o estado. */
  objectTooltip(obj: WorldObject): string {
    const def = this.ctrl.sim.defOf(obj);
    const name = def ? t(def.name) : '';
    const status = this.objectStatus(obj);
    return status ? `${name} · ${status}` : name;
  }

  /** Menu de uma bagunça solta: recolher, secar, catar. */
  openMessMenu(x: number, y: number, mess: Mess): void {
    const folk = this.ctrl.folk;
    const old = mess.kind === 'paper' && !freshPaper(this.ctrl.world, mess);
    this.menuEl.replaceChildren(el('div', 'menu-title', t(old ? 'mess.paperOld' : `mess.${mess.kind}`)));
    const b = el('button', 'menu-item');
    const icon = el('span', 'menu-icon');
    icon.innerHTML = iconSvg(mess.kind === 'paper' && !old ? 'fun' : 'ambience', 16);
    b.append(icon, el('span', '', this.messAction(mess)));
    if (mess.kind !== 'paper') b.append(el('span', 'menu-extra', t('skill.tidiness')));
    b.addEventListener('click', () => {
      this.ctrl.commandOrExplain({ type: 'queueTidy', folkId: folk.id, messId: mess.id });
      this.closeMenu();
      this.update();
    });
    this.menuEl.append(b);
    this.showMenuAt(x, y);
  }

  /** Rótulo da ação de recolher uma bagunça (o jornal do dia é "pegar o jornal"). */
  private messAction(mess: Mess | undefined): string {
    if (!mess) return t('act.tidy.plate');
    if (mess.kind === 'paper') return t(freshPaper(this.ctrl.world, mess) ? 'act.tidy.paper' : 'act.tidy.paperOld');
    return t(`act.tidy.${mess.kind}`);
  }

  /** Telefone: mercado, comida pronta, faxineira e técnico. */
  openServicesMenu(x: number, y: number): void {
    const folk = this.ctrl.folk;
    const world = this.ctrl.world;
    this.menuEl.replaceChildren(el('div', 'menu-title', t('services.title')));
    const rows: { id: ServiceOrder; label: string; price: string }[] = [
      { id: 'groceries', label: t('services.groceries', { portions: GROCERIES.portions }), price: formatMoney(GROCERIES.price) },
      { id: 'takeout', label: t('services.takeout', { portions: TAKEOUT.portions }), price: formatMoney(TAKEOUT.price) },
      { id: 'maid', label: t('services.maid', { hour: MAID.hour }), price: t('services.perDay', { price: formatMoney(MAID.fee) }) },
      {
        id: 'repair',
        label: t('services.repair'),
        price: t('services.plusHour', { price: formatMoney(REPAIR.base), hourly: formatMoney(REPAIR.hourly) }),
      },
    ];
    for (const row of rows) {
      const b = el('button', 'menu-item');
      const icon = el('span', 'menu-icon');
      icon.innerHTML = iconSvg(row.id === 'groceries' || row.id === 'takeout' ? 'hunger' : 'ambience', 16);
      if (row.id === 'maid' && world.household.maid) {
        b.append(icon, el('span', '', t('services.maidOn')));
        b.addEventListener('click', () => {
          this.ctrl.commandOrExplain({ type: 'dismissService', service: 'maid' });
          this.closeMenu();
          this.update();
        });
        this.menuEl.append(b);
        continue;
      }
      const problem = orderProblem(world, row.id);
      const pending = world.household.orders.some((o) => o.kind === row.id);
      const note = problem === 'closed' ? t('services.closed') : pending ? t('services.pending') : row.price;
      b.append(icon, el('span', '', row.label), el('span', 'menu-extra', note));
      b.disabled = problem !== null;
      if (problem) b.title = t(`problem.${problem}`);
      b.addEventListener('click', () => {
        this.ctrl.commandOrExplain({ type: 'callService', folkId: folk.id, service: row.id });
        this.closeMenu();
        this.update();
      });
      this.menuEl.append(b);
    }
    this.showMenuAt(x, y);
  }

  /** Quem está na porta: receber, deixar entrar ou dispensar. */
  private openDoorMenu(x: number, y: number, other: Folk): void {
    const folk = this.ctrl.folk;
    const sv = other.visit?.service;
    const title = el('div', 'menu-title');
    const face = el('span', 'menu-face big');
    face.innerHTML = faceSvg(other.look, 26);
    const names = el('div', 'menu-names');
    const role = sv ? t(`service.${sv.kind}`) : t('social.visitor');
    const coming = doorTaken(this.ctrl.world, other.id);
    names.append(el('div', '', other.name), el('div', 'menu-sub', `${role} · ${t(coming ? 'door.coming' : 'door.waiting')}`));
    title.append(face, names);
    this.menuEl.replaceChildren(title);
    const options: { label: string; welcome: boolean }[] =
      sv?.kind === 'courier'
        ? [{ label: t('door.receive'), welcome: true }]
        : sv
          ? [
              { label: t('door.letIn'), welcome: true },
              { label: t('door.sendAway'), welcome: false },
            ]
          : [
              { label: t('door.welcome'), welcome: true },
              { label: t('door.dismiss'), welcome: false },
            ];
    for (const o of options) {
      const b = el('button', 'menu-item');
      b.append(el('span', 'menu-dot'), el('span', '', o.label));
      b.disabled = folk.visit !== null;
      b.addEventListener('click', () => {
        this.ctrl.commandOrExplain({ type: 'answerDoor', folkId: folk.id, otherId: other.id, welcome: o.welcome });
        this.closeMenu();
        this.update();
      });
      this.menuEl.append(b);
    }
    this.showMenuAt(x, y);
  }

  /** Lista de vizinhos conhecidos para convidar por telefone. */
  openInviteMenu(x: number, y: number): void {
    const folk = this.ctrl.folk;
    const world = this.ctrl.world;
    this.menuEl.replaceChildren(el('div', 'menu-title', t('invite.title')));
    const known = world.neighbors.filter((n) => relationOf(world, folk.id, n.id));
    if (known.length === 0) this.menuEl.append(el('div', 'menu-note', t('invite.none')));
    for (const n of known) {
      const rel = relationOf(world, folk.id, n.id);
      const here = !!this.ctrl.sim.findFolk(n.id) || world.pendingVisits.some((v) => v.neighborId === n.id);
      const b = el('button', 'menu-item');
      const face = el('span', 'menu-face');
      face.innerHTML = faceSvg(n.look, 18);
      b.append(face, el('span', '', n.name), el('span', 'menu-extra', here ? t('rel.coming') : t(friendshipLabel(rel))));
      b.disabled = here;
      b.addEventListener('click', () => {
        this.ctrl.commandOrExplain({ type: 'invite', folkId: folk.id, neighborId: n.id });
        this.closeMenu();
        this.update();
      });
      this.menuEl.append(b);
    }
    this.showMenuAt(x, y);
  }

  /** Texto do balão de dica ao passar o mouse sobre alguém. */
  folkTooltip(other: Folk): string {
    const folk = this.ctrl.folk;
    const parts = [other.name];
    const sv = other.visit?.service;
    if (sv) parts.push(t(`service.${sv.kind}`));
    else if (other.visit) parts.push(t('social.visitor'));
    if (other.visit && !other.visit.admitted && !other.visit.leaving) parts.push(t('door.waiting'));
    if (other.id !== folk.id) {
      const rel = relationOf(this.ctrl.world, folk.id, other.id);
      parts.push(this.relSummary(rel));
    }
    return parts.join(' · ');
  }

  private relSummary(rel: Relation | undefined): string {
    const bits = [t(friendshipLabel(rel))];
    const r = romanceLabel(rel);
    if (r) bits.push(t(r));
    const p = respectLabel(rel);
    if (p) bits.push(t(p));
    return bits.join(', ');
  }

  /** Menu ao clicar em outra pessoa: conversas possíveis, por tipo. */
  openSocialMenu(x: number, y: number, other: Folk): void {
    if (other.visit && !other.visit.admitted && !other.visit.leaving) {
      this.openDoorMenu(x, y, other);
      return;
    }
    const folk = this.ctrl.folk;
    const world = this.ctrl.world;
    const rel = relationOf(world, folk.id, other.id);
    const title = el('div', 'menu-title');
    const face = el('span', 'menu-face big');
    face.innerHTML = faceSvg(other.look, 26);
    const names = el('div', 'menu-names');
    names.append(
      el('div', '', other.name),
      el('div', 'menu-sub', `${other.visit ? `${t('social.visitor')} · ` : ''}${this.relSummary(rel)}`),
    );
    title.append(face, names);
    this.menuEl.replaceChildren(title);
    if (!other.visit) {
      const b = el('button', 'menu-item');
      b.append(el('span', '', t('social.control', { name: first(other.name) })));
      b.addEventListener('click', () => {
        this.ctrl.selectFolk(other.id);
        this.closeMenu();
        this.update();
      });
      this.menuEl.append(b);
    }
    const list = availableSocials(world, this.ctrl.sim.catalog, folk, other);
    if (list.length === 0 || folk.away) this.menuEl.append(el('div', 'menu-note', t('social.nothing')));
    else {
      for (const cat of SOCIAL_ORDER) {
        const defs = list.filter((d) => d.category === cat);
        if (!defs.length) continue;
        this.menuEl.append(el('div', `menu-group cat-${cat}`, t(`socCat.${cat}`)));
        for (const def of defs) {
          const b = el('button', `menu-item soc cat-${cat}`);
          b.append(el('span', 'menu-dot'), el('span', '', t(def.label)));
          b.addEventListener('click', () => {
            this.ctrl.commandOrExplain({ type: 'queueSocial', folkId: folk.id, otherId: other.id, socialId: def.id });
            this.closeMenu();
            this.update();
          });
          this.menuEl.append(b);
        }
      }
    }
    this.showMenuAt(x, y);
  }

  // ---------- moradores ----------

  private renderHousehold(): void {
    const sim = this.ctrl.sim;
    const residents = sim.residents();
    const sel = this.ctrl.folk.id;
    const sig = residents
      .map((f) => {
        const m = moodOf(sim.catalog, f.needs);
        return `${f.id}:${f.id === sel}:${!!f.away}:${m >= 62 ? 2 : m >= 40 ? 1 : 0}`;
      })
      .join('|');
    if (sig === this.householdSig) return;
    this.householdSig = sig;
    this.householdEl.replaceChildren();
    this.householdEl.hidden = residents.length < 2;
    for (const f of residents) {
      const m = moodOf(sim.catalog, f.needs);
      const b = el('button', 'member');
      b.classList.toggle('on', f.id === sel);
      b.classList.toggle('away', !!f.away);
      b.title = `${f.name}${f.away ? ` · ${t('rel.away')}` : ''}`;
      const face = el('span', 'member-face');
      face.innerHTML = faceSvg(f.look, 30, m);
      const dot = el('span', `member-mood m${m >= 62 ? 2 : m >= 40 ? 1 : 0}`);
      b.append(face, el('span', 'member-name', first(f.name)), dot);
      b.addEventListener('click', () => {
        this.ctrl.selectFolk(f.id);
        this.panelSig = '';
        this.queueSig = '';
        this.update();
      });
      this.householdEl.append(b);
    }
  }

  /** Mostra uma etiqueta que sobe e some (o que uma conversa mudou). */
  floatChip(x: number, y: number, text: string, tone: 'good' | 'bad' | 'love'): void {
    const chip = el('div', `float-chip ${tone}`, text);
    chip.style.left = `${Math.round(x)}px`;
    chip.style.top = `${Math.round(y)}px`;
    this.floatsEl.append(chip);
    while (this.floatsEl.children.length > 8) this.floatsEl.firstElementChild?.remove();
    window.setTimeout(() => chip.remove(), 2600);
  }

  private showMenuAt(x: number, y: number): void {
    this.menuEl.hidden = false;
    this.menuOpen = true;
    const rect = this.menuEl.getBoundingClientRect();
    const left = Math.min(Math.max(8, x + 14), window.innerWidth - rect.width - 8);
    const top = Math.min(Math.max(8, y - 20), window.innerHeight - rect.height - 8);
    this.menuEl.style.left = `${left}px`;
    this.menuEl.style.top = `${top}px`;
  }


  // ---------- painéis de habilidades e trabalho ----------

  private buildPanel(): void {
    this.panelEl.hidden = true;
    this.root.append(this.panelEl);
  }

  togglePanel(panel: Exclude<Panel, null>): void {
    this.panel = this.panel === panel ? null : panel;
    this.panelSig = '';
    this.renderPanel();
  }

  private renderPanel(): void {
    for (const [id, b] of this.panelButtons) b.classList.toggle('on', this.panel === id);
    if (!this.panel) {
      this.panelEl.hidden = true;
      return;
    }
    const folk = this.ctrl.folk;
    const world = this.ctrl.world;
    const sig =
      this.panel === 'skills'
        ? `s|${folk.id}|${Object.entries(folk.skills)
            .map(([k, v]) => `${k}:${Math.floor(v)}`)
            .join(',')}`
        : this.panel === 'relations'
          ? `r|${folk.id}|${Math.floor(world.tick / 10)}|${world.folks.map((f) => f.id).join(',')}|${world.pendingVisits.length}|${world.news.length}`
          : `j|${this.jobTab}|${folk.id}|${JSON.stringify([folk.job, folk.gig && Math.floor(folk.gig.progress / 5), folk.business && Math.floor(folk.business.quality), world.gigBoard, world.household.funds >= 0])}|${folk.away?.until ?? ''}|${Math.floor(world.tick / 60)}`;
    if (sig === this.panelSig) return;
    this.panelSig = sig;
    this.panelEl.hidden = false;
    this.panelEl.replaceChildren();
    const head = el('div', 'panel-head');
    const close = el('button', 'pill-cancel', '✕');
    close.title = t('hud.close');
    close.setAttribute('aria-label', t('hud.close'));
    close.addEventListener('click', () => {
      this.panel = null;
      this.renderPanel();
    });
    head.append(el('div', 'panel-title', t(`hud.${this.panel}`)), close);
    this.panelEl.append(head);
    if (this.panel === 'skills') this.renderSkills();
    else if (this.panel === 'relations') this.renderRelations();
    else this.renderJob();
  }

  private renderRelations(): void {
    const folk = this.ctrl.folk;
    const world = this.ctrl.world;
    const sim = this.ctrl.sim;
    // todo mundo que o folk conhece: moradores, visitas e vizinhos
    const people: { id: number; name: string; look: Folk['look']; traits: string[]; where: string }[] = [];
    for (const f of world.folks) {
      if (f.id === folk.id || !relationOf(world, folk.id, f.id)) continue;
      people.push({ id: f.id, name: f.name, look: f.look, traits: f.traits, where: f.visit ? 'rel.visiting' : f.away ? 'rel.away' : 'rel.home' });
    }
    for (const n of world.neighbors) {
      if (sim.findFolk(n.id) || !relationOf(world, folk.id, n.id)) continue;
      const coming = world.pendingVisits.some((v) => v.neighborId === n.id);
      people.push({ id: n.id, name: n.name, look: n.look, traits: n.traits, where: coming ? 'rel.coming' : 'rel.outside' });
    }
    const score = (id: number) => {
      const r = relationOf(world, folk.id, id)!;
      return r.friendship + r.romance + r.respect * 0.5;
    };
    people.sort((a, b) => score(b.id) - score(a.id) || a.id - b.id);
    this.renderFame(folk);
    if (people.length === 0) {
      this.panelEl.append(el('div', 'panel-note', t('rel.none', { name: first(folk.name) })));
      return;
    }
    const list = el('div', 'rel-list');
    for (const p of people) {
      const mine = relationOf(world, folk.id, p.id)!;
      const theirs = relationOf(world, p.id, folk.id);
      const row = el('details', 'rel');
      // quem está em casa já vem aberto; o resto, como o jogador deixou
      row.open = this.relOpen.get(p.id) ?? p.where !== 'rel.outside';
      row.addEventListener('toggle', () => this.relOpen.set(p.id, row.open));
      const head = el('summary', 'rel-head');
      const face = el('span', 'rel-face');
      face.innerHTML = faceSvg(p.look, 30);
      const names = el('div', 'rel-names');
      names.append(
        el('div', 'rel-name', p.name),
        el('div', 'rel-sub', `${this.workTag(folk, p.id)}${t(p.where)} · ${p.traits.map((id) => t(`trait.${id}`)).join(', ')}`),
      );
      head.append(face, names);
      if (p.where === 'rel.outside') {
        const inv = el('button', 'btn btn-small', t('rel.invite'));
        inv.title = t('rel.inviteTip');
        inv.addEventListener('click', (e) => {
          e.preventDefault();
          this.ctrl.commandOrExplain({ type: 'invite', folkId: folk.id, neighborId: p.id });
          this.panelSig = '';
          this.update();
        });
        head.append(inv);
      }
      row.append(head);
      const bars = el('div', 'rel-bars');
      for (const axis of ['friendship', 'romance', 'respect'] as const) bars.append(this.relBar(axis, mine[axis]));
      row.append(bars);
      const tags = [t(friendshipLabel(mine))];
      const rom = romanceLabel(mine);
      if (rom) tags.push(t(rom));
      const res = respectLabel(mine);
      if (res) tags.push(t(res));
      const tagLine = el('div', 'rel-tags', tags.join(' · '));
      row.append(tagLine);
      if (theirs) row.append(el('div', 'rel-theirs', t('rel.theyFeel', { name: first(p.name), label: this.relSummary(theirs) })));
      if (mine.memories.length) {
        const mem = el('div', 'rel-mems');
        mem.append(el('div', 'rel-mem-title', t('rel.memories')));
        for (const m of [...mine.memories].reverse()) {
          const def = sim.catalog.memories[m.kind];
          const c = clockOf(m.tick);
          const line = el('div', `rel-mem ${def && def.weight < 0 ? 'neg' : def && def.weight > 0 ? 'pos' : ''}`);
          line.append(el('span', 'rel-mem-day', t('hud.day', { day: c.day, weekday: t(`weekday.${(c.day - 1) % 7}`) })), el('span', '', t(def?.label ?? m.kind)));
          mem.append(line);
        }
        row.append(mem);
      }
      list.append(row);
    }
    this.panelEl.append(list, el('div', 'panel-note', t('rel.howTo')));
  }

  /** "chefe · " ou "colega · " para quem trabalha com o folk. */
  private workTag(folk: Folk, id: number): string {
    const world = this.ctrl.world;
    if (!folk.job) return '';
    if (bossOf(world, folk.job.careerId)?.id === id) return `${t('rel.boss')} · `;
    if (coworkersOf(world, folk).some((c) => c.id === id)) return `${t('rel.coworker')} · `;
    return '';
  }

  /** Fama do folk e as fofocas que ele conhece. */
  private renderFame(folk: Folk): void {
    const world = this.ctrl.world;
    const catalog = this.ctrl.sim.catalog;
    const rep = reputationOf(world, folk.id);
    const fame = el('div', 'fame');
    fame.append(this.relBar('respect', rep));
    (fame.firstElementChild!.firstElementChild as HTMLElement).textContent = t('rel.reputation');
    fame.append(el('div', 'rel-tags', t(reputationLabel(rep))));
    this.panelEl.append(fame);
    const known = world.news.filter((n) => n.knownBy.includes(folk.id)).slice(-6).reverse();
    this.panelEl.append(el('div', 'panel-sub', t('rel.news', { name: first(folk.name) })));
    if (!known.length) {
      this.panelEl.append(el('div', 'panel-note', t('rel.noNews')));
    } else {
      const box = el('div', 'news-list');
      for (const n of known) {
        const def = catalog.news[n.kind];
        const name = (id: number) =>
          world.folks.find((f) => f.id === id)?.name ?? world.neighbors.find((x) => x.id === id)?.name ?? '?';
        const line = el('div', `news ${def && def.reputation < 0 ? 'neg' : 'pos'}`);
        line.append(
          el('span', 'rel-mem-day', `${n.knownBy.length}👂`),
          el('span', '', t(def?.label ?? n.kind, { about: first(name(n.about)), other: n.other ? first(name(n.other)) : '' })),
        );
        box.append(line);
      }
      this.panelEl.append(box);
    }
    this.panelEl.append(el('div', 'panel-sub', t('hud.relations')));
  }

  // ---------- eventos do expediente ----------

  private renderWorkEvent(): void {
    const world = this.ctrl.world;
    const catalog = this.ctrl.sim.catalog;
    const folk = this.ctrl.sim.residents().find((f) => f.away?.event);
    const ev = folk?.away?.event;
    const def = ev && catalog.workEvents[ev.defId];
    if (!folk || !ev || !def) {
      this.wevEl.hidden = true;
      this.wevSig = '';
      return;
    }
    const sig = `${folk.id}|${ev.defId}|${ev.actorId}|${ev.deadline}`;
    if (sig === this.wevSig) return;
    this.wevSig = sig;
    const actor = world.neighbors.find((n) => n.id === ev.actorId) ?? world.folks.find((f) => f.id === ev.actorId);
    const params = { name: first(folk.name), actor: actor ? first(actor.name) : '' };
    this.wevEl.replaceChildren();
    const head = el('div', 'wev-head');
    const face = el('span', 'wev-face');
    face.innerHTML = faceSvg((actor ?? folk).look, 40);
    head.append(face, el('div', 'wev-title', t('wevCard.title', { name: folk.name })));
    this.wevEl.append(head, el('div', 'wev-text', t(def.text, params)));
    const choices = el('div', 'wev-choices');
    def.choices.forEach((choice, i) => {
      const b = el('button', 'btn wev-choice');
      b.append(el('span', '', t(choice.label, params)));
      if (choice.check) {
        const pct = Math.round(choiceChance(world, catalog, folk, choice, ev.actorId) * 100);
        b.append(el('span', 'wev-chance', t('wevCard.chance', { pct })));
      }
      b.addEventListener('click', () => {
        this.ctrl.chooseWorkEvent(folk.id, i);
        this.update();
      });
      choices.append(b);
    });
    this.wevEl.append(choices, el('div', 'panel-note', t('wevCard.hint', { name: first(folk.name) })));
    this.wevEl.hidden = false;
  }

  /** Barra de -100 a 100 com o zero no meio. */
  private relBar(axis: 'friendship' | 'romance' | 'respect', v: number): HTMLElement {
    const wrap = el('div', `perf rel-bar ${axis}`);
    const track = el('div', 'perf-track');
    const fill = el('div', 'perf-fill');
    fill.style.left = v >= 0 ? '50%' : `${50 + v / 2}%`;
    fill.style.width = `${Math.abs(v) / 2}%`;
    fill.classList.toggle('neg', v < 0);
    track.append(fill);
    wrap.append(el('span', 'perf-label', t(`rel.${axis}`)), track, el('span', 'rel-num', String(Math.round(v))));
    return wrap;
  }

  private renderSkills(): void {
    const folk = this.ctrl.folk;
    const list = el('div', 'skill-list');
    for (const skill of Object.values(this.ctrl.sim.catalog.skills)) {
      const xp = folk.skills[skill.id] ?? 0;
      const level = levelOf(xp);
      const row = el('div', 'skill');
      const top = el('div', 'skill-top');
      top.append(el('span', 'skill-name', t(skill.name)), el('span', 'skill-level', t('skills.level', { level })));
      const pips = el('div', 'pips');
      for (let i = 0; i < MAX_SKILL_LEVEL; i++) pips.append(el('span', i < level ? 'pip on' : 'pip'));
      const bar = el('div', 'skill-bar');
      const fill = el('div', 'skill-fill');
      fill.style.width = `${Math.round(levelProgress(xp) * 100)}%`;
      bar.append(fill);
      row.append(top, pips, bar);
      list.append(row);
    }
    this.panelEl.append(list, el('div', 'panel-note', t('skills.hint')), el('div', 'panel-note', t('skills.mood')));
  }

  private renderJob(): void {
    const tabs = el('div', 'catalog-tabs job-tabs');
    for (const id of JOB_TABS) {
      const b = el('button', 'tab', t(`job.tab.${id}`));
      b.classList.toggle('on', this.jobTab === id);
      b.addEventListener('click', () => {
        this.jobTab = id;
        this.panelSig = '';
        this.renderPanel();
      });
      tabs.append(b);
    }
    this.panelEl.append(tabs);
    if (this.jobTab === 'gigs') this.renderGigs();
    else if (this.jobTab === 'business') this.renderBusiness();
    else this.renderEmployment();
  }

  private refreshPanel(): void {
    this.panelSig = '';
    this.update();
  }

  /** Botão que pede confirmação no segundo clique. */
  private confirmButton(label: string, confirm: string, action: () => void): HTMLButtonElement {
    const b = el('button', 'btn btn-quiet btn-small', label);
    let armed = 0;
    b.addEventListener('click', () => {
      if (!armed) {
        b.textContent = confirm;
        b.classList.add('armed');
        armed = window.setTimeout(() => {
          armed = 0;
          b.textContent = label;
          b.classList.remove('armed');
        }, 3500);
        return;
      }
      window.clearTimeout(armed);
      action();
    });
    return b;
  }

  private renderEmployment(): void {
    const folk = this.ctrl.folk;
    const world = this.ctrl.world;
    const catalog = this.ctrl.sim.catalog;
    const job = folk.job;
    const career = job && careerOf(catalog, job);
    const level = career?.levels[job!.level];
    if (job && career && level) {
      const box = el('div', 'job-box');
      box.append(
        el('div', 'job-title', t(level.title)),
        el('div', 'job-career', `${t(career.name)} · ${t('job.payShift', { pay: formatMoney(payFor(catalog, job)) })}`),
        el('div', 'job-line', scheduleText(level)),
      );
      // desempenho de -100 a 100, com a marca da promoção
      const perf = el('div', 'perf');
      const track = el('div', 'perf-track');
      const fill = el('div', 'perf-fill');
      const p = job.performance;
      fill.style.left = p >= 0 ? '50%' : `${50 + p / 2}%`;
      fill.style.width = `${Math.abs(p) / 2}%`;
      fill.classList.toggle('neg', p < 0);
      const mark = el('div', 'perf-mark');
      mark.style.left = `${50 + PROMOTE_AT / 2}%`;
      track.append(fill, mark);
      perf.append(el('span', 'perf-label', t('job.performance')), track);
      box.append(perf);

      const status = folk.away
        ? t('job.atWork', { time: formatClock(folk.away.until) })
        : (() => {
            const shift = nextShift(catalog, folk, world.tick);
            return shift ? t('job.nextShift', { when: whenText(shift.start) }) : '';
          })();
      if (status) box.append(el('div', 'job-line strong', status));

      const next = career.levels[job.level + 1];
      if (next) {
        box.append(el('div', 'job-line', t('job.next', { title: t(next.title), pay: formatMoney(next.pay) })));
        const missing = missingSkills(folk, next);
        const req = el('div', 'job-reqs');
        for (const [id, need] of Object.entries(next.requires)) {
          const have = skillLevel(folk, id);
          req.append(el('span', `req ${id in missing ? 'miss' : 'ok'}`, `${t(`skill.${id}`)} ${have}/${need}`));
        }
        if (Object.keys(next.requires).length) box.append(req);
        const boss = bossOf(world, job.careerId);
        if (boss && bossBlocks(world, folk, job.level + 1) > 0) {
          const have = Math.round(relationOf(world, boss.id, folk.id)?.respect ?? 0);
          box.append(el('div', 'panel-note', t('job.bossNeeds', { boss: first(boss.name), need: bossRespectFor(job.level + 1), have })));
        } else if (Object.keys(missing).length === 0) box.append(el('div', 'panel-note', t('job.ready')));
      } else {
        box.append(el('div', 'job-line', t('job.top')));
      }

      // aumento
      if (job.raise > 0) box.append(el('div', 'job-line', t('job.raiseHave', { pct: Math.round(job.raise * 100) })));
      if (job.raisePending) box.append(el('div', 'job-line strong', t('job.raisePending')));
      else if (canAskRaise(folk, world.tick)) {
        const ask = el('button', 'btn btn-small', t('job.raise'));
        ask.title = t('job.raiseTip');
        ask.addEventListener('click', () => {
          this.ctrl.commandOrExplain({ type: 'askRaise', folkId: folk.id });
          this.refreshPanel();
        });
        box.append(ask, el('div', 'panel-note', t('job.raiseChance', { pct: Math.round(raiseChance(world, folk) * 100) })));
      } else if (job.raise < 0.5) {
        const days = RAISE_COOLDOWN - (Math.floor(world.tick / 1440) - job.lastRaiseDay);
        if (days > 0) box.append(el('div', 'panel-note', t('job.raiseWait', { days })));
      }
      box.append(el('div', 'panel-note', t('job.howTo')));
      box.append(
        this.confirmButton(t('job.quit'), t('job.quitConfirm'), () => {
          this.ctrl.commandOrExplain({ type: 'quitJob', folkId: folk.id });
          this.refreshPanel();
        }),
      );
      this.panelEl.append(box);
      this.renderTeam(folk, career.workplace ?? career.name);
    } else {
      this.panelEl.append(el('div', 'panel-note', t('job.none', { name: first(folk.name) })));
    }

    this.panelEl.append(el('div', 'panel-sub', t('job.classifieds')));
    if (folk.business) {
      this.panelEl.append(el('div', 'panel-note', t('job.hasBusiness')));
      return;
    }
    // bloco 2: as vagas saem no jornal do dia
    if (!classifiedsOpen(world)) {
      this.panelEl.append(el('div', 'panel-note', t('job.needPaper')));
      return;
    }
    const ads = el('div', 'ads');
    for (const c of Object.values(catalog.careers)) {
      if (c.id === job?.careerId) continue;
      ads.append(this.adFor(c, folk));
    }
    this.panelEl.append(ads);
  }

  /** Chefe e colegas, com como cada um vê o folk. */
  private renderTeam(folk: Folk, place: string): void {
    const world = this.ctrl.world;
    const job = folk.job!;
    const boss = bossOf(world, job.careerId);
    const people = [...(boss ? [{ p: boss, role: 'job.boss' }] : []), ...coworkersOf(world, folk).map((p) => ({ p, role: 'job.coworker' }))];
    if (!people.length) return;
    this.panelEl.append(el('div', 'panel-sub', t('job.team', { place: t(place) })));
    const list = el('div', 'team');
    for (const { p, role } of people) {
      const look = world.neighbors.find((n) => n.id === p.id)?.look ?? world.folks.find((f) => f.id === p.id)?.look;
      const theirs = relationOf(world, p.id, folk.id);
      const row = el('div', 'team-row');
      const face = el('span', 'rel-face');
      if (look) face.innerHTML = faceSvg(look, 26);
      const names = el('div', 'rel-names');
      names.append(
        el('div', 'rel-name', `${p.name} · ${t(role)}`),
        el('div', 'rel-sub', theirs ? t('rel.theyFeel', { name: first(p.name), label: this.relSummary(theirs) }) : t('rel.stranger')),
      );
      row.append(face, names);
      if (theirs) row.append(el('span', `team-num ${theirs.respect < 0 ? 'neg' : ''}`, `${Math.round(theirs.respect)}`));
      list.append(row);
    }
    this.panelEl.append(list, el('div', 'panel-note', t('job.teamNote')));
  }

  private adFor(career: CareerDef, folk: Folk): HTMLElement {
    const level = transferLevel(folk, folk.job, career);
    const entry = career.levels[level];
    const ad = el('div', 'ad');
    const text = el('div', 'ad-text');
    text.append(
      el('div', 'ad-title', `${t(entry.title)} · ${t(career.name)}`),
      el('div', 'ad-line', `${t('job.payShift', { pay: formatMoney(entry.pay) })} · ${scheduleText(entry)}`),
      el('div', 'ad-line', t('job.skillsUsed', { skills: career.skills.map((s) => t(`skill.${s}`)).join(', ') })),
    );
    if (level > 0) text.append(el('div', 'ad-line strong', t('job.transfer', { title: t(entry.title) })));
    const take = el('button', 'btn btn-small', t(folk.job ? 'job.switch' : 'job.take'));
    take.addEventListener('click', () => {
      this.ctrl.commandOrExplain({ type: 'takeJob', folkId: folk.id, careerId: career.id });
      this.refreshPanel();
    });
    ad.append(text, take);
    return ad;
  }

  /** Nomes dos objetos (e se a casa tem algum). */
  private objectsText(defIds: string[]): { text: string; has: boolean } {
    const catalog = this.ctrl.sim.catalog;
    const text = defIds.map((id) => t(catalog.objects[id]?.name ?? id).toLowerCase()).join(' / ');
    const has = this.ctrl.world.objects.some((o) => defIds.includes(o.defId));
    return { text, has };
  }

  private renderGigs(): void {
    const folk = this.ctrl.folk;
    const world = this.ctrl.world;
    const catalog = this.ctrl.sim.catalog;
    const gig = folk.gig;
    const gdef = gig && catalog.gigs[gig.defId];
    if (gig && gdef) {
      const box = el('div', 'job-box');
      const where = this.objectsText(gdef.objects);
      box.append(
        el('div', 'panel-sub', t('gigs.current')),
        el('div', 'job-title', t(gdef.name)),
        el('div', 'job-line', `${t('gigs.pay', { pay: formatMoney(gig.pay) })} · ${t('gigs.deadline', { when: whenText(gig.deadline) })}`),
      );
      const bar = el('div', 'skill-bar');
      const fill = el('div', 'skill-fill');
      fill.style.width = `${Math.min(100, Math.round((gig.progress / gdef.work) * 100))}%`;
      bar.append(fill);
      box.append(bar);
      box.append(el('div', 'panel-note', where.has ? t('gigs.howTo', { objects: where.text }) : t('gigs.noObject', { objects: where.text })));
      box.append(
        this.confirmButton(t('gigs.drop'), t('job.quitConfirm'), () => {
          this.ctrl.commandOrExplain({ type: 'dropGig', folkId: folk.id });
          this.refreshPanel();
        }),
      );
      this.panelEl.append(box);
    }
    this.panelEl.append(el('div', 'panel-sub', t('gigs.board')));
    if (!world.gigBoard.length) {
      this.panelEl.append(el('div', 'panel-note', t('gigs.empty')));
      return;
    }
    const ads = el('div', 'ads');
    for (const offer of world.gigBoard) {
      const def = catalog.gigs[offer.defId];
      if (!def) continue;
      const ad = el('div', 'ad');
      const text = el('div', 'ad-text');
      const ok = gigAllowed(folk, def);
      text.append(
        el('div', 'ad-title', t(def.name)),
        el('div', 'ad-line', `${t('gigs.pay', { pay: formatMoney(offer.pay) })} · ${def.days}d`),
        el('div', `ad-line ${ok ? '' : 'miss'}`, t('gigs.needs', { skill: t(`skill.${def.skill}`), level: def.minLevel })),
        el('div', 'ad-line', t('gigs.where', { objects: this.objectsText(def.objects).text })),
      );
      const take = el('button', 'btn btn-small', t('gigs.take'));
      take.disabled = !ok || !!gig;
      take.addEventListener('click', () => {
        this.ctrl.commandOrExplain({ type: 'takeGig', folkId: folk.id, offerId: offer.id });
        this.refreshPanel();
      });
      ad.append(text, take);
      ads.append(ad);
    }
    this.panelEl.append(ads);
  }

  private renderBusiness(): void {
    const folk = this.ctrl.folk;
    const world = this.ctrl.world;
    const catalog = this.ctrl.sim.catalog;
    const b = folk.business;
    const def = b && catalog.businesses[b.defId];
    if (b && def) {
      const box = el('div', 'job-box');
      const where = this.objectsText(def.objects);
      box.append(el('div', 'job-title', t(def.name)));
      const q = el('div', 'perf');
      const track = el('div', 'skill-bar');
      const fill = el('div', 'skill-fill');
      fill.style.width = `${Math.round(b.quality)}%`;
      track.append(fill);
      q.append(el('span', 'perf-label', t('biz.quality')), track);
      box.append(q);
      box.append(el('div', 'job-line', t('biz.expect', { customers: Math.round(expectedCustomers(world, catalog, folk)) })));
      if (b.days > 0) {
        box.append(
          el('div', 'job-line', t('biz.last', { customers: b.lastCustomers, profit: formatMoney(b.lastProfit) })),
          el('div', 'panel-note', t('biz.total', { total: formatMoney(b.total), days: b.days })),
        );
      }
      box.append(el('div', 'panel-note', where.has ? t('biz.howTo', { objects: where.text }) : t('gigs.noObject', { objects: where.text })));
      box.append(
        this.confirmButton(t('biz.close'), t('biz.closeConfirm'), () => {
          this.ctrl.commandOrExplain({ type: 'closeBusiness', folkId: folk.id });
          this.refreshPanel();
        }),
      );
      this.panelEl.append(box);
      return;
    }
    this.panelEl.append(el('div', 'panel-note', t('biz.intro')));
    const ads = el('div', 'ads');
    for (const d of Object.values(catalog.businesses)) {
      const ad = el('div', 'ad');
      const text = el('div', 'ad-text');
      text.append(
        el('div', 'ad-title', t(d.name)),
        el('div', 'ad-line', t('biz.info', { skill: t(`skill.${d.skill}`), upkeep: formatMoney(d.upkeep), objects: this.objectsText(d.objects).text })),
      );
      const open = el('button', 'btn btn-small', t('biz.open', { cost: formatMoney(d.cost) }));
      open.disabled = world.household.funds < d.cost;
      open.addEventListener('click', () => {
        this.ctrl.commandOrExplain({ type: 'openBusiness', folkId: folk.id, businessId: d.id });
        this.refreshPanel();
      });
      ad.append(text, open);
      ads.append(ad);
    }
    this.panelEl.append(ads);
  }

  // ---------- modo compra ----------

  setThumbnailer(fn: (art: string) => string): void {
    this.thumbnail = fn;
  }

  toggleBuyMode(): void {
    this.closeMenu();
    this.ctrl.setMode(this.ctrl.mode === 'buy' ? 'live' : 'buy');
    this.catalogSig = '';
    this.buildSig = '';
    this.queueSig = '';
    this.update();
  }

  // ---------- modo construção ----------

  setSwatcher(fn: (texture: string, tall?: boolean) => string): void {
    this.swatch = fn;
  }

  toggleBuildMode(): void {
    this.closeMenu();
    this.ctrl.setMode(this.ctrl.mode === 'build' ? 'live' : 'build');
    this.catalogSig = '';
    this.buildSig = '';
    this.queueSig = '';
    this.update();
  }

  private buildBuildPanel(): void {
    const head = el('div', 'catalog-head');
    head.append(el('div', 'panel-title', t('build.title')), this.buildTabs);
    for (const tab of BUILD_TABS) {
      const b = el('button', 'tab', t(`build.tab.${tab}`));
      b.dataset.tab = tab;
      b.addEventListener('click', () => {
        this.buildTab = tab;
        this.ctrl.setBuildTool(TAB_TOOL[tab]);
        this.renderBuild();
      });
      this.buildTabs.append(b);
    }
    this.undoButton.title = t('build.undoTip');
    this.undoButton.addEventListener('click', () => {
      this.ctrl.undoBuild();
      this.update();
    });
    head.append(this.undoButton);
    this.buildEl.append(head, this.buildItems, this.buildHint);
    this.buildEl.hidden = true;
    this.root.append(this.buildEl);
  }

  private renderBuild(): void {
    const building = this.ctrl.mode === 'build';
    this.buildEl.hidden = !building;
    if (!building) return;
    const c = this.ctrl;
    this.buildTab = TOOL_TAB[c.buildTool];
    const depth = c.sim.undoDepth;
    const funds = c.world.household.funds;
    const sig = `${this.buildTab}|${c.buildTool}|${c.floorId}|${c.coveringId}|${depth}|${funds}`;
    if (sig === this.buildSig) return;
    this.buildSig = sig;
    for (const b of this.buildTabs.children) {
      (b as HTMLElement).classList.toggle('on', (b as HTMLElement).dataset.tab === this.buildTab);
    }
    this.undoButton.textContent = depth > 0 ? t('build.undoN', { n: depth }) : t('build.undo');
    this.undoButton.disabled = depth === 0;
    this.buildHint.textContent = t(`build.hint.${c.buildTool}`);
    this.buildItems.replaceChildren();
    const catalog = c.sim.catalog;
    const add = (name: string, price: string, img: string | null, on: boolean, pick: () => void, tip?: string) => {
      const item = el('button', 'item');
      item.classList.toggle('on', on);
      if (img) {
        const pic = el('img', 'item-img');
        pic.alt = '';
        pic.width = 64;
        pic.height = 64;
        pic.src = img;
        item.append(pic);
      } else {
        item.append(el('span', 'item-img item-glyph', '✕'));
      }
      item.append(el('span', 'item-name', name), el('span', 'item-price', price));
      item.title = tip ?? `${name} · ${price}`;
      item.addEventListener('click', () => {
        pick();
        this.renderBuild();
      });
      this.buildItems.append(item);
    };
    const sw = (tex: string, tall = false) => (this.swatch ? this.swatch(tex, tall) : null);
    const tool = (tool: BuildTool) => () => c.setBuildTool(tool);
    if (this.buildTab === 'walls') {
      add(t('build.wall'), t('build.perMeter', { price: formatMoney(catalog.parts.wall.price) }), sw('wallExterior', true), c.buildTool === 'wall', tool('wall'));
      add(t('build.erase'), t('build.free'), null, c.buildTool === 'erase', tool('erase'), t('build.hint.erase'));
    } else if (this.buildTab === 'openings') {
      add(t('build.door'), formatMoney(catalog.parts.door.price), sw('door', true), c.buildTool === 'door', tool('door'));
      add(
        t('build.window'),
        formatMoney(catalog.parts.window.price),
        sw('windowOut', true),
        c.buildTool === 'window',
        tool('window'),
        `${t('build.window')} · ${formatMoney(catalog.parts.window.price)} · ${t('need.ambience')} +${catalog.parts.window.ambience}`,
      );
    } else if (this.buildTab === 'floors') {
      for (const f of Object.values(catalog.floors).sort((a, b) => a.price - b.price)) {
        const tex = f.outdoor ? 'grass' : FLOOR_ART.includes(f.id) ? f.id : 'wood';
        const price = f.price > 0 ? t('build.perTile', { price: formatMoney(f.price) }) : t('build.free');
        add(t(f.name), price, sw(tex), c.buildTool === 'floor' && c.floorId === f.id, () => {
          c.floorId = f.id;
          c.setBuildTool('floor');
        });
      }
    } else {
      for (const cov of Object.values(catalog.coverings).sort((a, b) => a.price - b.price)) {
        const tex = COVER_ART[cov.id]?.tex ?? 'wallPlaster';
        add(t(cov.name), t('build.perFace', { price: formatMoney(cov.price) }), sw(tex, true), c.buildTool === 'paint' && c.coveringId === cov.id, () => {
          c.coveringId = cov.id;
          c.setBuildTool('paint');
        });
      }
    }
  }

  private buildCatalog(): void {
    const head = el('div', 'catalog-head');
    head.append(el('div', 'panel-title', t('buy.title')), this.catalogTabs);
    for (const cat of CATEGORIES) {
      const b = el('button', 'tab', t(`cat.${cat}`));
      b.dataset.cat = cat;
      b.addEventListener('click', () => {
        this.category = cat;
        this.catalogSig = '';
        this.renderCatalog();
      });
      this.catalogTabs.append(b);
    }
    this.catalogEl.append(head, this.catalogItems, this.catalogHint);
    this.catalogEl.hidden = true;
    this.root.append(this.catalogEl);
  }

  private renderCatalog(): void {
    const buying = this.ctrl.mode === 'buy';
    this.catalogEl.hidden = !buying;
    if (!buying) return;
    const funds = this.ctrl.world.household.funds;
    const placing = this.ctrl.placing;
    const sig = `${this.category}|${funds}|${placing?.defId ?? ''}|${placing?.moveId ?? ''}`;
    if (sig === this.catalogSig) return;
    this.catalogSig = sig;
    for (const b of this.catalogTabs.children) {
      (b as HTMLElement).classList.toggle('on', (b as HTMLElement).dataset.cat === this.category);
    }
    this.catalogHint.textContent = placing ? t('buy.place') : '';
    this.catalogHint.hidden = !placing;
    this.catalogItems.replaceChildren();
    const defs = Object.values(this.ctrl.sim.catalog.objects)
      .filter((d) => d.buyable !== false && (this.category === 'all' || d.category === this.category))
      .sort((a, b) => a.price - b.price);
    for (const def of defs) this.catalogItems.append(this.catalogItem(def, funds));
  }

  private catalogItem(def: ObjectDef, funds: number): HTMLElement {
    const item = el('button', 'item');
    const affordable = funds >= def.price;
    item.classList.toggle('poor', !affordable);
    item.classList.toggle('on', this.ctrl.placing?.defId === def.id && this.ctrl.placing.moveId === undefined);
    const img = el('img', 'item-img');
    img.alt = '';
    img.width = 64;
    img.height = 64;
    if (this.thumbnail) img.src = this.thumbnail(def.art);
    const trains = [...new Set(def.interactions.filter((i) => i.skill).map((i) => t(`skill.${i.skill!.id}`)))];
    const needs = [...new Set(def.interactions.flatMap((i) => Object.entries(i.effects).filter(([, v]) => (v ?? 0) > 0.3).map(([k]) => t(`need.${k}`))))];
    const tip = [t(def.name), formatMoney(def.price)];
    if (needs.length) tip.push(needs.join(', '));
    if (trains.length) tip.push(t('buy.trains', { skill: trains.join(', ') }));
    if (def.ambience > 0) tip.push(`${t('need.ambience')} +${def.ambience}`);
    if (!affordable) tip.push(t('buy.cantAfford'));
    item.title = tip.join(' · ');
    item.append(img, el('span', 'item-name', t(def.name)), el('span', 'item-price', formatMoney(def.price)));
    item.addEventListener('click', () => {
      if (!affordable) {
        this.ctrl.toast(t('problem.funds'));
        return;
      }
      this.ctrl.startPlacing(def.id);
      this.renderCatalog();
    });
    return item;
  }

  /** Menu de um objeto no modo compra: mover, girar ou vender. */
  openBuyMenu(x: number, y: number, obj: WorldObject): void {
    const def = this.ctrl.sim.defOf(obj);
    if (!def) return;
    this.menuEl.replaceChildren(el('div', 'menu-title', t(def.name)));
    const add = (label: string, run: () => void) => {
      const b = el('button', 'menu-item');
      b.append(el('span', '', label));
      b.addEventListener('click', () => {
        run();
        this.closeMenu();
        this.update();
      });
      this.menuEl.append(b);
    };
    add(t('buy.move'), () => this.ctrl.startPlacing(obj.defId, obj.id));
    add(t('buy.rotate'), () => {
      this.ctrl.commandOrExplain({ type: 'move', objectId: obj.id, x: obj.x, y: obj.y, rot: ((obj.rot + 1) % 4) as WorldObject['rot'] });
    });
    const price = formatMoney(sellValue(obj, def));
    add(t('buy.sell', { price }), () => {
      if (this.ctrl.commandOrExplain({ type: 'sell', objectId: obj.id })) {
        this.ctrl.toast(t('buy.sold', { name: t(def.name), price }));
      }
    });
    this.showMenuAt(x, y);
  }

  // ---------- balão e avisos ----------

  setBubble(x: number, y: number, icon: NeedId | 'sleep' | null): void {
    if (!icon || x < -500) {
      if (!this.bubbleEl.hidden) this.bubbleEl.hidden = true;
      this.bubbleIcon = null;
      return;
    }
    if (this.bubbleIcon !== icon) {
      this.bubbleIcon = icon;
      this.bubbleEl.innerHTML = iconSvg(icon, 16);
      this.bubbleEl.dataset.icon = icon;
    }
    this.bubbleEl.hidden = false;
    this.bubbleEl.style.transform = `translate(${Math.round(x)}px, ${Math.round(y)}px) translate(-50%, -100%)`;
  }

  setTooltip(x: number, y: number, text: string | null): void {
    if (!text || this.menuOpen) {
      if (!this.tooltipEl.hidden) this.tooltipEl.hidden = true;
      return;
    }
    if (this.tooltipEl.textContent !== text) this.tooltipEl.textContent = text;
    this.tooltipEl.hidden = false;
    this.tooltipEl.style.transform = `translate(${Math.round(x + 14)}px, ${Math.round(y + 16)}px)`;
  }

  private showToast(text: string): void {
    const toast = el('div', 'toast', text);
    this.toastsEl.append(toast);
    while (this.toastsEl.children.length > 4) this.toastsEl.firstElementChild?.remove();
    window.setTimeout(() => toast.classList.add('out'), 3600);
    window.setTimeout(() => toast.remove(), 4100);
  }
}
