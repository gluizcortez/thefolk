import { HAIR, SHIRT, SKIN } from '../game/art/palette';
import { COVER_ART, FLOOR_ART } from '../game/art/house';
import type { BuildTool, FocusTarget, GameController } from '../game/controller';
import { OPENING_TOOLS, isOpeningTool } from '../game/controller';
import { WALL_MODES, isWallMode } from '../game/viewMode';
import { StyleEditor } from './styleEditor';
import type { WallMode } from '../game/viewMode';
import { ROOF_COLORS } from '../data/build';
import { hasText, t } from '../i18n';
import {
  DISH_BY_ID,
  isSpoiled,
  isWarm,
  servingsFor,
  DARK_BELOW,
  roofArea,
  roomAt,
  roomGrade,
  roomKind,
  roomScore,
  roomsOf,
  friendshipLabel,
  relationOf,
  DATE_MIN_MINUTES,
  TAXI_FARE,
  canGo,
  dateAvailable,
  dateGrade,
  dateScore,
  respectLabel,
  romanceLabel,
  MAX_SKILL_LEVEL,
  TEMPER_AXES,
  NEED_IDS,
  PROMOTE_AT,
  billAmount,
  FRIEND_AT,
  adsOfDay,
  careerOf,
  daysToNextStage,
  familyTree,
  levelOfJob,
  newJob,
  nextStage,
  stageOf,
  familyFriends,
  missingFriends,
  rideFor,
  vehicleOf,
  clockOf,
  formatClock,
  formatMoney,
  levelOf,
  levelProgress,
  missingSkills,
  moodOf,
  nextShift,
  sellValue,
  stillNew,
  tierOf,
  ALARM_LEAD,
  INSPIRE_COST,
  MAX_SPARK,
  isInspired,
  thoughtOf,
  wakeTime,
  wishParams,
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
  raining,
  plantStage,
  reputationLabel,
  reputationOf,
  transferLevel,
  DIRTY_AT,
  isStereo,
  stationDef,
  favoriteStation,
  nextStation,
  stateOf,
  FAIR,
  GROCERIES,
  MAID,
  GARDENER,
  REPAIR,
  TAKEOUT,
  classifiedsOpen,
  debtOf,
  doorTaken,
  freshPaper,
  interactionReady,
  orderProblem,
  unpaidBills,
  CIRCLE_MAX,
  PARTY_MAX_GUESTS,
  areRivals,
  circleOfFolk,
  cliqueOf,
  findCliques,
  isServiceNeighbor,
  onLot,
  reactionTo,
  rivalPairs,
  favoriteTopics,
  hatedTopics,
  bondOf,
  ringOnLot,
  surname,
  weddingNames,
  NEGLECT_VISIT,
  gradeBand,
  gradeText,
  SKIP_SPEED,
  canSkip,
  feelingsOf,
  socialAllowed,
} from '../sim';
import type {
  OpeningKind,
  Catalog,
  Command,
  World,
  RoofPitch,
  RoofStyle,
  Action,
  CareerDef,
  CareerLevel,
  Folk,
  Mess,
  MealAct,
  NeedId,
  ObjectCategory,
  ObjectDef,
  Relation,
  ServiceOrder,
  SocialCategory,
  Speed,
  SurnameChoice,
  WorldObject,
} from '../sim';
import { iconSvg, topicSvg } from './icons';
import { interactionState, objectGroup, ringCenter, ringPoints, ringRadius, ringSlots, socialState } from './ring';
import { GIFTS } from '../data/downtown';
import { channelDef, favoriteChannel, viewOf } from '../sim/activity';
import { SystemCards } from './system';
import { cue } from '../audio/cues';
import type { AudioEngine } from '../audio/engine';
import type { IconId } from './icons';

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
  'games',
  'outdoor',
];

/** Bloco 4: filtro de faixa de preço no catálogo. */
const TIERS: ('all' | 0 | 1 | 2)[] = ['all', 0, 1, 2];

/** Plano 2, bloco 2: abas do painel do folk. */
type Tab = 'needs' | 'feelings' | 'skills' | 'job' | 'relations' | 'temper' | 'wishes' | 'inventory';
const TABS: Tab[] = ['needs', 'feelings', 'skills', 'job', 'relations', 'temper', 'wishes', 'inventory'];
const TAB_ICON: Record<Tab, IconId> = {
  needs: 'hunger',
  feelings: 'mood',
  skills: 'skill',
  job: 'work',
  relations: 'heart',
  temper: 'spark',
  wishes: 'yes',
  inventory: 'gift',
};
/** Plano 2, bloco 2: cartões que abrem por cima do canto inferior direito. */
type Pop = 'family' | 'finance' | 'options' | 'city' | 'history' | null;
/** Ícone de cada grupo do anel. */
const GROUP_ICON: Record<string, IconId> = {
  use: 'mood',
  care: 'hand',
  learn: 'skill',
  phone: 'phone',
  shop: 'coin',
  talk: 'social',
  friendly: 'social',
  professional: 'work',
  romantic: 'heart',
  mean: 'no',
};
const HISTORY_MAX = 40;

interface NoticeEntry {
  text: string;
  icon: string;
  target: FocusTarget | null;
  tick: number;
}

/** Uma fatia do menu em anel. */
interface RingItem {
  label: string;
  icon?: IconId;
  face?: Folk['look'];
  extra?: string;
  /** motivo de estar em cinza */
  why?: string;
  /** dá, mas ele vai reclamar */
  reluctant?: string;
  group?: string;
  tone?: string;
  run: () => void;
}

/** Plano 2, bloco 2: preferências de interface, fora do save (valem para todos os jogos). */
type UiScale = 's' | 'm' | 'l';
const UI_SCALES: Record<UiScale, number> = { s: 0.88, m: 1, l: 1.18 };
interface UiPrefs {
  scale: UiScale;
  tab: Tab;
  help: boolean;
  /** plano 2, bloco 3: modo de vista escolhido e se está fixo */
  walls: WallMode;
  pin: boolean;
}
const PREFS_KEY = 'thefolk.ui';

function loadUiPrefs(): UiPrefs {
  const base: UiPrefs = { scale: 'm', tab: 'needs', help: false, walls: 'cutaway', pin: false };
  try {
    const raw = JSON.parse(localStorage.getItem(PREFS_KEY) ?? '{}') as Partial<UiPrefs>;
    if (raw.scale && raw.scale in UI_SCALES) base.scale = raw.scale;
    if (raw.tab && TABS.includes(raw.tab)) base.tab = raw.tab;
    if (typeof raw.help === 'boolean') base.help = raw.help;
    if (isWallMode(raw.walls)) base.walls = raw.walls;
    if (typeof raw.pin === 'boolean') base.pin = raw.pin;
  } catch {
    // sem armazenamento (janela privada): fica no padrão
  }
  return base;
}

function saveUiPrefs(p: UiPrefs): void {
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify(p));
  } catch {
    // sem armazenamento: só vale nesta sessão
  }
}
/** Bloco 17: abas do painel da família. */
type FamilyTab = 'tree' | 'album';
type JobTab = 'job' | 'gigs' | 'business';
const JOB_TABS: JobTab[] = ['job', 'gigs', 'business'];

type BuildTab = 'walls' | 'openings' | 'floors' | 'coverings' | 'roof' | 'yard';
const BUILD_TABS: BuildTab[] = ['walls', 'openings', 'floors', 'coverings', 'roof', 'yard'];
/** ferramenta que cada aba do modo construção escolhe ao abrir */
const TAB_TOOL: Record<BuildTab, BuildTool> = { walls: 'wall', openings: 'door', floors: 'floor', coverings: 'paint', roof: 'roof', yard: 'fence' };
/** aba onde fica cada ferramenta */
const TOOL_TAB: Record<BuildTool, BuildTab> = {
  wall: 'walls',
  half: 'walls',
  erase: 'walls',
  column: 'walls',
  stairs: 'walls',
  door: 'openings',
  doorGlass: 'openings',
  doorDouble: 'openings',
  arch: 'openings',
  window: 'openings',
  windowTall: 'openings',
  windowHigh: 'openings',
  floor: 'floors',
  paint: 'coverings',
  roof: 'roof',
  slab: 'roof',
  unslab: 'roof',
  // bloco 13: quintal
  fence: 'yard',
  lowwall: 'yard',
  gate: 'yard',
  yard: 'yard',
};
/** bloco 12: amostra de cada estilo de porta e janela no catálogo da obra */
const OPENING_SWATCH: Record<OpeningKind, string> = {
  door: 'door',
  doorGlass: 'windowOut',
  doorDouble: 'door',
  arch: 'wallPlaster',
  window: 'windowOut',
  windowTall: 'windowOut',
  windowHigh: 'windowOut',
  gate: 'picket',
};

const SOCIAL_ORDER: SocialCategory[] = ['friendly', 'professional', 'romantic', 'mean'];

function hex(n: number): string {
  return `#${n.toString(16).padStart(6, '0')}`;
}

type FaceState = 'calm' | 'sleep' | 'talk' | 'upset';

/** Plano 2, bloco 2: o que o retrato mostra agora (dormindo, conversando, aflito ou tranquilo). */
function faceState(catalog: Catalog, folk: Folk): FaceState {
  const a = folk.queue[0];
  if (folk.collapsed > 0 || (a && a.phase !== 'walking' && a.interactionId === 'sleep') || folk.kid?.asleep) return 'sleep';
  if (a && a.phase !== 'walking' && (a.kind === 'social' || a.kind === 'listen' || a.kind === 'circle')) return 'talk';
  if (moodOf(catalog, folk.needs) < 28 || (folk.frightened !== undefined && folk.frightened > 0 && folk.scorch)) return 'upset';
  return 'calm';
}

/** Cabelo do retrato: quatro cortes, na cor do cabelo do folk. */
const HAIR_PATHS = [
  'M5 10 Q4.6 3 12 3 Q19.4 3 19 10 Q17 6.2 12 6.2 Q7 6.2 5 10Z',
  'M5 12.5 Q4 3 12 3 Q20 3 19 12.5 L18 9 Q16 6 12 6 Q8 6 6 9Z',
  'M5.2 9.5 Q5 3.4 12 3.4 Q19 3.4 18.8 9.5 Q15 5.5 9 7 Q6.5 7.6 5.2 9.5ZM10 3.6 Q12 0.6 14 3.6Z',
  'M5 10 L6 4 L8.5 6 L10 2.6 L12 5.4 L14 2.6 L15.5 6 L18 4 L19 10 Q16 6.4 12 6.4 Q8 6.4 5 10Z',
];

/** Rostinho do folk em SVG, na cor de pele, com o cabelo, a camisa e a expressão de agora. */
function faceSvg(look: Folk['look'], size: number, mood = 60, state: FaceState = 'calm'): string {
  const skin = hex(SKIN[look.skin % SKIN.length]);
  const shirt = hex(SHIRT[look.shirt % SHIRT.length]);
  const hair = hex(HAIR[look.hair % HAIR.length]);
  const ink = '#2a2320';
  const curve = 11 + (mood / 100) * 8;
  const eyes =
    state === 'sleep'
      ? `<path d="M8.4 9.8 Q9.5 10.6 10.6 9.8M13.4 9.8 Q14.5 10.6 15.6 9.8" fill="none" stroke="${ink}" stroke-width="0.9" stroke-linecap="round"/>`
      : `<circle cx="9.5" cy="9.6" r="0.95" fill="${ink}"/><circle cx="14.5" cy="9.6" r="0.95" fill="${ink}"/>`;
  // sobrancelhas: caídas para dentro quando está mal, erguidas quando está ótimo
  const brow = state === 'upset' || mood < 28 ? 'M8.2 7.2 L10.6 7.9M15.8 7.2 L13.4 7.9' : mood >= 80 ? 'M8.3 7.4 Q9.5 6.6 10.7 7.3M13.3 7.3 Q14.5 6.6 15.7 7.4' : 'M8.4 7.6 L10.6 7.5M13.4 7.5 L15.6 7.6';
  const mouth =
    state === 'talk'
      ? `<ellipse cx="12" cy="13" rx="1.4" ry="1.1" fill="${ink}"/>`
      : state === 'sleep'
        ? `<path d="M10.8 13 Q12 13.5 13.2 13" fill="none" stroke="${ink}" stroke-width="0.9" stroke-linecap="round"/>`
        : `<path d="M9.3 12.6 Q12 ${(curve - 2.4).toFixed(1)} 14.7 12.6" fill="none" stroke="${ink}" stroke-width="1.1" stroke-linecap="round"/>`;
  const cheeks = mood >= 62 && state !== 'upset' ? '<circle cx="7.8" cy="11.8" r="1" fill="#e0806a" opacity="0.45"/><circle cx="16.2" cy="11.8" r="1" fill="#e0806a" opacity="0.45"/>' : '';
  const zzz = state === 'sleep' ? `<text x="18" y="5" font-size="4.5" font-weight="700" fill="${ink}">z</text>` : '';
  return (
    `<svg viewBox="0 0 24 24" width="${size}" height="${size}" aria-hidden="true">` +
    `<path d="M3 24 Q3 17 12 17 Q21 17 21 24Z" fill="${shirt}" stroke="${ink}" stroke-width="1.2"/>` +
    `<circle cx="12" cy="10" r="7" fill="${skin}" stroke="${ink}" stroke-width="1.2"/>` +
    `<path d="${HAIR_PATHS[look.style % HAIR_PATHS.length]}" fill="${hair}" stroke="${ink}" stroke-width="0.8" stroke-linejoin="round"/>` +
    `${cheeks}${eyes}<path d="${brow}" fill="none" stroke="${ink}" stroke-width="0.8" stroke-linecap="round"/>${mouth}${zzz}</svg>`
  );
}

/** Primeiro nome, para textos curtos. */
/** Bloco 16: +3 / -5 */
function signed(n: number): string {
  return n > 0 ? `+${n}` : String(n);
}

/** Bloco 16: rótulo de romance (ou nada, se não há). */
function romanceText(rel: Parameters<typeof romanceLabel>[0]): string {
  const k = romanceLabel(rel);
  return k ? t(k) : '';
}

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

/** Bloco 17: o enfeite de cada marco do álbum. */
const ALBUM_MARKS: Partial<Record<string, string>> = {
  birth: '✿',
  adopted: '✿',
  wedding: '♥',
  topJob: '★',
  teen: '✎',
  graduated: '✎',
  elder: '❦',
  retired: '☕',
  passing: '✝',
  heirloom: '♦',
};

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
  /** bloco 9: festa acontecendo (ou a nota da última) */
  private partyEl = el('button', 'party-pill');
  private speedButtons: HTMLButtonElement[] = [];
  private needRows = new Map<NeedId, NeedRow>();
  private nameEl = el('div', 'folk-name');
  private traitsEl = el('div', 'folk-traits');
  /** bloco 11: bebê (cresce quando, chorando), criança (boletim, lição) e bebê a caminho */
  private kidEl = el('div', 'kid-line');
  private kidSig = '';
  private moodWord = el('span', 'mood-word');
  /** bloco 3: o cômodo onde o folk está, com nota e luz */
  private roomEl = el('div', 'room-line');
  private moodFill = el('div', 'mood-fill');
  /** plano 2, bloco 2: ação de agora em palavras, embaixo do retrato */
  private doingEl = el('div', 'folk-doing');
  private queueEl = el('div', 'queue-list');
  private queueWrap = el('div', 'queue');
  private queueSig = '';
  /** plano 2, bloco 2: arrastando um ícone da fila */
  private drag: { id: number; startX: number; moved: boolean; pill: HTMLElement } | null = null;
  private toastsEl = el('div', 'toasts');
  private menuEl = el('div', 'menu card');
  /** plano 2, bloco 2: menu em anel em volta do objeto ou da pessoa */
  private ringEl = el('div', 'ring');
  private bubbleEl = el('div', 'bubble');
  private tooltipEl = el('div', 'tooltip');
  private bubbleIcon: string | null = null;
  private menuOpen = false;
  private lastPausedSpeed: Speed = 1;
  private fundsEl = el('button', 'funds');
  /** plano 2, bloco 2: o painel do folk, com abas */
  private fpEl = el('div', 'card fp');
  private tabBody = el('div', 'fp-content');
  private tabTitle = el('div', 'fp-title');
  private tabButtons = new Map<Tab, HTMLButtonElement>();
  private tab: Tab = 'needs';
  private needsEl = el('div', 'needs');
  /** cartão que abre por cima do canto (família, contas, opções, cidade, histórico) */
  private popEl = el('div', 'card pop');
  private pop: Pop = null;
  private popSig = '';
  /** onde os renderizadores de aba escrevem (a aba do folk ou o cartão da família) */
  private panelEl: HTMLElement = this.tabBody;
  private panelSig = '';
  private jobTab: JobTab = 'job';
  private familyTab: FamilyTab = 'tree';
  /** legenda que o jogador está escrevendo para a próxima foto */
  private photoCaption = '';
  private wevEl = el('div', 'card wev');
  /** bloco 14: o par ou ímpar com o Seu Sereno e o aviso de casa vazia */
  private bargainEl = el('div', 'card wev bargain');
  private bargainSig = '';
  private overEl = el('div', 'over');
  private overShown = false;
  private wevSig = '';
  private modeButtons = new Map<string, HTMLButtonElement>();
  private faceEl = el('div', 'folk-face');
  /** bloco 6: desejos do dia e ânimo */
  private wishesEl = el('div', 'wishes');
  private wishesSig = '';
  /** bloco 6: cartões de aviso (algo quebrou, conta chegou, campainha) */
  private noticesEl = el('div', 'notices');
  /** plano 2, bloco 2: os avisos que já saíram da tela */
  private history: NoticeEntry[] = [];
  private historyButton = el('button', 'btn btn-icon history-btn');
  private householdEl = el('div', 'household');
  private householdSig = '';
  private floatsEl = el('div', 'floats');
  /** quem está aberto ou fechado no painel de relações (o jogador escolhe) */
  private relOpen = new Map<number, boolean>();
  private catalogEl = el('div', 'card catalog');
  /** plano 2, bloco 8: editor de peças e estilo */
  readonly styleEditor: StyleEditor;
  private catalogTabs = el('div', 'catalog-tabs');
  private catalogItems = el('div', 'catalog-items');
  private catalogHint = el('div', 'catalog-hint');
  private category: ObjectCategory | 'all' = 'all';
  private tierFilter: 'all' | 0 | 1 | 2 = 'all';
  private catalogTiers = el('div', 'catalog-tabs tier-tabs');
  private buyUndoButton = el('button', 'btn btn-undo');
  private colorRow = el('div', 'color-row');
  private catalogSig = '';
  private thumbnail: ((art: string) => string) | null = null;
  private swatch: ((texture: string, tall?: boolean) => string) | null = null;
  /** bloco 12: botão do modo das paredes e nome do andar visto */
  /** plano 2, bloco 3: os quatro modos de vista e o botão de fixar */
  private wallModesEl = el('div', 'card wallmodes');
  private wallButtons = new Map<WallMode, HTMLButtonElement>();
  private pinButton = el('button', 'wm-btn wm-pin');
  private wallSig = '';
  private levelLabel = el('span', 'level-label');
  private helpEl = el('div', 'help card');
  /** bloco 5: abre a tela de criar família */
  openCreator: (() => void) | null = null;
  private buildEl = el('div', 'card catalog build');
  private buildTabs = el('div', 'catalog-tabs');
  private buildItems = el('div', 'catalog-items');
  private buildHint = el('div', 'catalog-hint');
  private undoButton = el('button', 'btn btn-undo');
  private buildTab: BuildTab = 'walls';
  private buildSig = '';
  /** bloco 7: cartões de jogos salvos e de som */
  private system: SystemCards;
  private prefs: UiPrefs = loadUiPrefs();

  constructor(
    private readonly root: HTMLElement,
    private readonly ctrl: GameController,
  ) {
    this.system = new SystemCards(ctrl);
    this.system.onChange = () => this.renderPop();
    this.styleEditor = new StyleEditor(ctrl);
    this.styleEditor.onClose = () => {
      this.catalogSig = '';
      this.renderCatalog();
    };
    this.tab = this.prefs.tab;
    ctrl.wallMode = this.prefs.walls;
    ctrl.wallPinned = this.prefs.pin;
    this.applyScale();
    this.buildViewBar();
    this.root.append(this.householdEl);
    this.buildNeeds();
    this.buildFolkPanel();
    this.buildDock();
    this.buildCatalog();
    this.buildBuildPanel();
    this.popEl.hidden = true;
    this.root.append(this.popEl, this.system.el);
    const notices = el('div', 'notices-col');
    this.historyButton.addEventListener('click', () => this.togglePop('history'));
    this.renderHistoryButton();
    notices.append(this.historyButton, this.noticesEl);
    this.root.append(this.wevEl, this.bargainEl, this.overEl, this.floatsEl, notices, this.toastsEl, this.ringEl, this.menuEl, this.bubbleEl, this.tooltipEl);
    this.wevEl.hidden = true;
    this.bargainEl.hidden = true;
    this.overEl.hidden = true;
    this.tooltipEl.hidden = true;
    this.menuEl.hidden = true;
    this.ringEl.hidden = true;
    this.bubbleEl.hidden = true;
    ctrl.onToast((text) => this.showToast(text));
    ctrl.onNotice((text, icon, target) => this.showNotice(text, icon, target));
    window.addEventListener('keydown', (e) => this.onKey(e));
    this.update();
  }

  // ---------- montagem ----------

  /** Atalhos que são da HUD (o resto fica na cena). */
  private onKey(e: KeyboardEvent): void {
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
    if (document.querySelector('.creator:not([hidden])') || this.ctrl.screen === 'town') return;
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.code === 'KeyH' || e.key === '?') this.toggleHelp();
    else if (e.code === 'KeyF') this.togglePop('family');
    else if (e.code === 'KeyO') this.togglePop('options');
    else if (e.code === 'KeyV' && this.ctrl.mode !== 'live') this.setLive();
    else if (e.code === 'Escape' && (this.pop || !this.helpEl.hidden)) {
      if (this.pop) this.togglePop(this.pop);
      else this.toggleHelp();
    }
  }

  /** Plano 2, bloco 2: a barra de baixo (relógio, velocidades, dinheiro) e os modos. */
  private buildDock(): void {
    const dock = el('div', 'dock');
    const time = el('div', 'card timebar');
    const info = el('div', 'clock-info');
    const when = el('div', 'clock-when');
    when.append(this.clockDay, this.clockTime);
    info.append(this.clockSky, when);
    const speeds = el('div', 'speeds');
    const defs: [Speed, string, string][] = [
      [0, '❙❙', 'hud.pause'],
      [1, '▸', 'hud.speed1'],
      [2, '▸▸', 'hud.speed2'],
      [3, '▸▸▸', 'hud.speed3'],
      [4, '»|', 'hud.speed4'],
    ];
    for (const [speed, glyph, tip] of defs) {
      const b = el('button', 'speed');
      b.append(el('span', 'speed-glyph', glyph), el('span', 'speed-key', String(speed)));
      b.title = t(tip);
      b.setAttribute('aria-label', t(tip));
      b.addEventListener('click', () => this.setSpeed(speed));
      this.speedButtons.push(b);
      speeds.append(b);
    }
    this.fundsEl.title = t('hud.funds');
    this.fundsEl.addEventListener('click', () => this.togglePop('finance'));
    time.append(info, speeds, this.fundsEl);
    this.partyEl.hidden = true;
    this.partyEl.addEventListener('click', () => this.openTab('relations'));
    const timeWrap = el('div', 'timewrap');
    timeWrap.append(this.partyEl, time);
    // modos: viver, comprar, construir, família, cidade, opções
    const modes = el('div', 'card modes');
    const mode = (id: string, icon: IconId, key: string, act: () => void) => {
      const b = el('button', 'mode');
      b.innerHTML = iconSvg(icon, 20);
      b.append(el('span', 'mode-label', t(`mode.${id}`)));
      b.title = `${t(`mode.${id}Tip`)}${key ? ` (${key})` : ''}`;
      b.setAttribute('aria-label', b.title);
      b.addEventListener('click', act);
      this.modeButtons.set(id, b);
      modes.append(b);
    };
    mode('live', 'mood', 'V', () => this.setLive());
    mode('buy', 'coin', 'B', () => this.toggleBuyMode());
    mode('build', 'house', 'C', () => this.toggleBuildMode());
    mode('family', 'heart', 'F', () => this.togglePop('family'));
    mode('city', 'map', '', () => this.togglePop('city'));
    mode('options', 'gear', 'O', () => this.togglePop('options'));
    dock.append(timeWrap, modes);
    this.root.append(dock);
  }

  private setLive(): void {
    if (this.ctrl.mode === 'buy') this.toggleBuyMode();
    else if (this.ctrl.mode === 'build') this.toggleBuildMode();
  }

  /** Bloco 9: plaquinha da festa em cima do relógio. */
  private renderParty(): void {
    const world = this.ctrl.world;
    const party = world.party;
    const last = world.lastParty;
    let text = '';
    let title = '';
    const out = world.outing;
    const lastDate = world.lastDate;
    if (out) {
      // bloco 16: no centro, a plaquinha mostra o encontro (e a nota até agora)
      const d = out.date;
      text = d
        ? t('outing.dating', { name: first(this.nameOf(d.host)), other: first(this.nameOf(d.guest)), score: world.tick - d.since < DATE_MIN_MINUTES ? '…' : '★'.repeat(dateGrade(dateScore(d))) })
        : t('outing.here', { time: formatClock(out.since) });
      title = t('outing.dateHint');
    } else if (lastDate && world.tick - lastDate.tick < 6 * 60 && !party) {
      text = `${t('outing.lastDate')} ${'★'.repeat(lastDate.grade)}${'☆'.repeat(5 - lastDate.grade)}`;
      title = t('outing.lastDateTip', { score: lastDate.score, romance: signed(lastDate.romance), friendship: signed(lastDate.friendship) });
    } else if (party) {
      const here = world.folks.filter((f) => f.visit?.party && f.visit.admitted).length;
      const vibe = party.samples ? Math.round(party.score / party.samples) : null;
      const kind = party.wedding ? 'wedding' : 'party';
      text = world.tick < party.start
        ? t(`${kind}.soon`, { time: formatClock(party.start), n: party.guests.length })
        : t(`${kind}.on`, { n: here, vibe: vibe === null ? '…' : String(vibe) });
      if (party.wedding?.stage === 'done') text = `${t('wedding.done')} · ${text}`;
      title = t('party.until', { time: formatClock(party.end) });
    } else if (last && world.tick - last.tick < 6 * 60) {
      text = `${t('party.last')} ${'★'.repeat(last.grade)}${'☆'.repeat(5 - last.grade)}`;
      title = t('party.lastTip', { score: last.score, n: last.guests, brawls: last.brawls, complaints: last.complaints });
    }
    this.partyEl.hidden = !text;
    if (this.partyEl.textContent !== text) this.partyEl.textContent = text;
    this.partyEl.title = title;
    if (world.call && !world.call.answeredBy) {
      const n = world.neighbors.find((x) => x.id === world.call!.from);
      this.partyEl.hidden = false;
      this.partyEl.textContent = t('phone.ringing', { name: n ? first(n.name) : '?' });
      this.partyEl.title = t('phone.ringingTip');
      this.partyEl.classList.add('ringing');
    } else this.partyEl.classList.remove('ringing');
  }

  private setSpeed(speed: Speed): void {
    const cur = this.ctrl.world.speed;
    if (speed === 0 && cur === 0) {
      this.ctrl.resumeSpeed(this.lastPausedSpeed);
    } else {
      if (speed === 0) this.lastPausedSpeed = cur;
      this.ctrl.commandOrExplain({ type: 'setSpeed', speed });
    }
    this.update();
  }

  /** Bloco 7: liga os volumes ao motor de som. */
  setAudio(engine: AudioEngine): void {
    this.system.setAudio(engine);
  }

  /** Controles de câmera e de paredes, no canto superior esquerdo, e as dicas de teclado. */
  private buildViewBar(): void {
    const bar = el('div', 'viewbar');
    const turn = (glyph: string, tip: string, dir: number) => {
      const b = el('button', 'btn btn-icon', glyph);
      b.title = t(tip);
      b.setAttribute('aria-label', t(tip));
      b.addEventListener('click', () => this.ctrl.rotateCamera(dir));
      return b;
    };
    // plano 2, bloco 3: modos de vista num controle só (Home e End, P fixa)
    const walls = this.wallModesEl;
    walls.setAttribute('role', 'radiogroup');
    walls.setAttribute('aria-label', t('hud.walls.title'));
    const WALL_ICON: Record<WallMode, IconId> = { roof: 'viewRoof', up: 'viewUp', cutaway: 'viewCut', down: 'viewDown' };
    for (const mode of [...WALL_MODES].reverse()) {
      const b = el('button', 'wm-btn');
      b.innerHTML = iconSvg(WALL_ICON[mode], 18);
      b.title = `${t(`hud.walls.${mode}`)} · ${t(`hud.walls.${mode}Tip`)}`;
      b.setAttribute('aria-label', t(`hud.walls.${mode}`));
      b.setAttribute('role', 'radio');
      b.addEventListener('click', () => {
        this.ctrl.setWallMode(mode);
        this.saveWallPrefs();
        this.update();
      });
      this.wallButtons.set(mode, b);
      walls.append(b);
    }
    this.pinButton.innerHTML = iconSvg('pin', 16);
    this.pinButton.title = t('hud.walls.pinTip');
    this.pinButton.setAttribute('aria-label', t('hud.walls.pin'));
    this.pinButton.addEventListener('click', () => {
      this.ctrl.wallPinned = !this.ctrl.wallPinned;
      this.saveWallPrefs();
      this.update();
    });
    walls.append(this.pinButton);
    // bloco 12: andar que se vê (PageUp / PageDown)
    const floors = el('div', 'levelbar');
    const step = (glyph: string, tip: string, dir: number) => {
      const b = el('button', 'btn btn-icon', glyph);
      b.title = t(tip);
      b.setAttribute('aria-label', t(tip));
      b.addEventListener('click', () => {
        this.ctrl.changeLevel(dir);
        this.update();
      });
      return b;
    };
    this.levelLabel.title = t('hud.levelTip');
    floors.append(step('▾', 'hud.levelDown', -1), this.levelLabel, step('▴', 'hud.levelUp', 1));
    const help = el('button', 'btn btn-icon', '?');
    help.title = t('hud.helpTip');
    help.setAttribute('aria-label', help.title);
    help.addEventListener('click', () => this.toggleHelp());
    bar.append(turn('⟲', 'hud.turnLeft', -1), turn('⟳', 'hud.turnRight', 1), walls, floors, help);
    // plano 2, bloco 2: as dicas viram uma tabela de atalhos que abre e fecha (H)
    const keys: [string, string][] = [
      ['hud.keys.click', 'hud.keys.clickDo'],
      ['hud.keys.shift', 'hud.keys.shiftDo'],
      ['0 · 1 · 2 · 3 · 4', 'hud.keys.speedDo'],
      ['Espaço', 'hud.keys.pauseDo'],
      ['Tab', 'hud.keys.tabDo'],
      ['Q · E', 'hud.keys.turnDo'],
      ['PageUp · PageDown', 'hud.keys.levelDo'],
      ['Home · End', 'hud.keys.wallsDo'],
      ['P', 'hud.keys.pinDo'],
      ['V · B · C', 'hud.keys.modesDo'],
      ['F · O', 'hud.keys.popsDo'],
      ['M', 'hud.keys.muteDo'],
      ['H', 'hud.keys.helpDo'],
      ['Esc', 'hud.keys.escDo'],
    ];
    const head = el('div', 'panel-head');
    const close = el('button', 'pill-cancel', '✕');
    close.title = t('hud.close');
    close.setAttribute('aria-label', t('hud.close'));
    close.addEventListener('click', () => this.toggleHelp());
    head.append(el('div', 'panel-title', t('hud.keys.title')), close);
    const table = el('div', 'keys');
    for (const [k, v] of keys) table.append(el('span', 'key', hasText(k) ? t(k) : k), el('span', 'key-do', t(v)));
    this.helpEl.append(head, table, el('div', 'panel-note', t('hud.keys.mouse')));
    this.helpEl.hidden = !this.prefs.help;
    this.root.append(bar, this.helpEl);
  }

  /** Plano 2, bloco 3: marca o modo escolhido, o que a tela mostra agora e o fixo. */
  private renderWallModes(): void {
    const c = this.ctrl;
    const sig = `${c.wallMode}|${c.shownWall}|${c.wallPinned}`;
    if (sig === this.wallSig) return;
    if (this.wallSig && (c.wallMode !== this.prefs.walls || c.wallPinned !== this.prefs.pin)) this.saveWallPrefs();
    this.wallSig = sig;
    for (const [mode, b] of this.wallButtons) {
      b.classList.toggle('on', mode === c.wallMode);
      // o telhado sumiu sozinho: o modo mostrado fica marcado de leve
      b.classList.toggle('auto', mode === c.shownWall && mode !== c.wallMode);
      b.setAttribute('aria-checked', String(mode === c.wallMode));
    }
    this.pinButton.classList.toggle('on', c.wallPinned);
    this.pinButton.setAttribute('aria-pressed', String(c.wallPinned));
  }

  private saveWallPrefs(): void {
    this.prefs.walls = this.ctrl.wallMode;
    this.prefs.pin = this.ctrl.wallPinned;
    saveUiPrefs(this.prefs);
  }

  private toggleHelp(): void {
    this.helpEl.hidden = !this.helpEl.hidden;
    this.prefs.help = !this.helpEl.hidden;
    saveUiPrefs(this.prefs);
  }

  // ---------- painel do folk ----------

  /**
   * Plano 2, bloco 2: o painel do canto inferior esquerdo. À esquerda o
   * retrato com a expressão de agora, o nome e o humor num medidor só; no
   * meio as abas em ícones; à direita o conteúdo da aba. A fila fica em cima.
   */
  private buildFolkPanel(): void {
    const wrap = el('div', 'fp-wrap');
    this.queueWrap.append(this.queueEl);
    const side = el('div', 'fp-side');
    const mood = el('div', 'mood');
    const moodTrack = el('div', 'mood-track');
    moodTrack.append(this.moodFill);
    const moodLine = el('div', 'mood-line');
    moodLine.append(el('span', 'mood-label', `${t('mood.label')}: `), this.moodWord);
    mood.append(moodLine, moodTrack);
    side.append(this.faceEl, this.nameEl, this.traitsEl, mood, this.doingEl, this.kidEl);
    const tabs = el('div', 'fp-tabs');
    tabs.setAttribute('role', 'tablist');
    for (const id of TABS) {
      const b = el('button', 'fp-tab');
      b.innerHTML = iconSvg(TAB_ICON[id], 18);
      b.title = t(`tab.${id}`);
      b.setAttribute('aria-label', b.title);
      b.setAttribute('role', 'tab');
      b.addEventListener('click', () => this.openTab(id));
      this.tabButtons.set(id, b);
      tabs.append(b);
    }
    const body = el('div', 'fp-body');
    body.append(tabs, this.tabTitle, this.tabBody);
    this.fpEl.append(side, body);
    wrap.append(this.queueWrap, this.fpEl);
    this.root.append(wrap);
  }

  /** Abre uma aba do painel do folk (e lembra dela para a próxima vez). */
  openTab(tab: Tab): void {
    if (this.tab !== tab) cue('open');
    this.tab = tab;
    this.prefs.tab = tab;
    saveUiPrefs(this.prefs);
    this.panelSig = '';
    this.renderPanel();
  }

  private buildNeeds(): void {
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
      this.needsEl.append(row);
      this.needRows.set(id, { segs, row });
    }
    this.needsEl.append(this.roomEl);
  }
  /** Bloco 3: "Sala e cozinha · agradável · claro", com a conta da nota na dica. */
  private renderRoom(folk: Folk): void {
    const sim = this.ctrl.sim;
    const world = this.ctrl.world;
    if (folk.away) {
      if (this.roomEl.textContent !== '') this.roomEl.textContent = '';
      return;
    }
    const map = roomsOf(world, sim.catalog);
    const room = roomAt(map, folk.x, folk.y);
    if (!room) return;
    const score = roomScore(world, sim.catalog, map, room, folk, room.outdoor ? folk : undefined);
    const kinds = roomKind(world, sim.catalog, map, room).map((k) => t(`room.${k}`));
    const name = kinds.length > 1 ? t('room.combo', { a: kinds[0], b: kinds[1] }) : kinds[0];
    const light = score.level < DARK_BELOW ? 'dark' : score.level < 0.75 ? 'dim' : 'bright';
    const text = `${name.charAt(0).toUpperCase()}${name.slice(1)} · ${t(`room.grade.${roomGrade(score.total)}`)} · ${t(`room.light.${light}`)}`;
    if (this.roomEl.textContent !== text) this.roomEl.textContent = text;
    this.roomEl.dataset.light = light;
    const n = (v: number) => (v >= 0 ? `+${Math.round(v)}` : `${Math.round(v)}`);
    this.roomEl.title = t('room.tip', {
      score: Math.round(score.total),
      objects: n(score.objects),
      windows: n(score.windows),
      finish: n(score.finish),
      size: n(score.size),
      corners: n(score.corners),
      mess: n(score.mess),
      light: n(score.light),
      taste: n(score.taste),
    });
  }

  /**
   * Bloco 11: linha de família no cartão: o bebê (quando vira criança, se
   * está chorando ou dormindo, descaso), a criança (boletim e lição) e o
   * bebê a caminho da casa.
   */
  private renderKid(folk: Folk): void {
    const world = this.ctrl.world;
    const lines: { text: string; tip?: string; warn?: boolean }[] = [];
    const kid = folk.kid;
    if (folk.age === 'baby' && kid) {
      const state = kid.asleep ? t('kid.asleep') : folk.thought?.kind === 'want' ? t('kid.crying') : t('kid.calm');
      lines.push({ text: `${t('kid.baby', { when: whenText(kid.grows) })} · ${state}` });
    } else if ((folk.age === 'child' || folk.age === 'teen') && kid) {
      const band = t(`grade.band.${gradeBand(kid.grade)}`);
      const low = kid.lowDays > 0 ? ` · ${t('kid.low', { n: kid.lowDays })}` : '';
      lines.push({ text: `${t('kid.grade', { grade: gradeText(kid.grade), band })} · ${t(`kid.homework.${kid.homework}`)}${low}`, tip: t('kid.gradeTip'), warn: kid.lowDays > 0 });
      if (folk.away) lines.push({ text: t('kid.atSchool') });
    }
    // bloco 17: relógio da vida e aposentadoria
    const left = daysToNextStage(world, folk);
    const next = nextStage(stageOf(folk));
    if (left !== null && folk.age !== 'baby') {
      lines.push({ text: next ? t('life.next', { stage: t(`age.${next}`), n: left }) : t('life.lastDays', { n: left }), tip: t('life.tip') });
    }
    if (folk.retired) lines.push({ text: folk.pension ? t('life.pension', { pay: formatMoney(folk.pension) }) : t('life.retired') });
    if (kid && kid.neglect >= 30) lines.push({ text: t('kid.neglect', { n: Math.round(kid.neglect), max: NEGLECT_VISIT }), warn: true });
    if (kid && kid.warned > 0) lines.push({ text: t('kid.warned'), warn: true });
    const exp = world.household.expecting;
    if (exp) lines.push({ text: t('hud.expecting', { when: whenText(exp.due) }) });
    const sig = JSON.stringify(lines);
    if (sig === this.kidSig) return;
    this.kidSig = sig;
    this.kidEl.replaceChildren(...lines.map((l) => {
      const d = el('div', `kid-row${l.warn ? ' warn' : ''}`, l.text);
      if (l.tip) d.title = l.tip;
      return d;
    }));
    this.kidEl.hidden = lines.length === 0;
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
    if (action.kind === 'circle') return t('act.circle');
    // bloco 14
    if (action.kind === 'douse') return t('act.douse');
    if (action.kind === 'panic') return t('act.panic');
    if (action.wedding && action.guests) return t('act.weddingFor', { n: action.guests.length });
    if (action.guests) return t('act.partyFor', { n: action.guests.length });
    if ((action.interactionId === 'call' || action.interactionId === 'answer') && action.otherId !== undefined) {
      const n = this.ctrl.world.neighbors.find((x) => x.id === action.otherId);
      if (n) return t(action.interactionId === 'call' ? 'act.callTo' : 'act.answerFrom', { name: first(n.name) });
    }
    if (action.kind === 'social' || action.kind === 'listen') {
      const other = action.otherId !== undefined ? this.ctrl.sim.findFolk(action.otherId) : undefined;
      const name = other ? first(other.name) : '…';
      if (action.kind === 'listen') return t('act.listen', { name });
      const def = this.ctrl.sim.catalog.socials[action.socialId ?? ''];
      if (action.topic) return t('act.socialTopic', { topic: t(`topic.${action.topic}`), name });
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

  /**
   * Bloco 6 (plano 2, bloco 2: virou aba): os desejos do dia com o texto e o
   * progresso, o ânimo guardado em losangos e o botão do dia inspirado.
   */
  private renderWishes(folk: Folk): void {
    const world = this.ctrl.world;
    const catalog = this.ctrl.sim.catalog;
    const inspired = isInspired(folk, world.tick);
    const sig = `${folk.id}|${JSON.stringify(folk.wishes)}|${folk.spark}|${inspired ? folk.inspired : 0}`;
    if (sig === this.wishesSig) return;
    this.wishesSig = sig;
    this.wishesEl.replaceChildren();
    if (folk.age === 'baby') {
      this.wishesEl.append(el('div', 'panel-note', t('wish.baby')));
      return;
    }
    const list = el('div', 'wish-list');
    if (folk.wishes.length === 0) list.append(el('div', 'panel-note', t('wish.none')));
    for (const w of folk.wishes) {
      const def = catalog.wishes[w.defId];
      if (!def) continue;
      const params = wishParams(world, catalog, w);
      const text = t(def.label, { other: params.other ?? '', skill: params.skill ? t(params.skill) : '', category: params.category ? t(params.category) : '' });
      const row = el('div', `wish-card${w.done ? ' done' : ''}`);
      const icon = el('span', 'wish');
      icon.innerHTML = iconSvg(def.icon as IconId, 16);
      const pct = Math.min(100, Math.round((w.progress / def.amount) * 100));
      const body = el('div', 'wish-body');
      body.append(el('div', 'wish-text', text));
      if (w.done) body.append(el('div', 'wish-sub', t('wish.done')));
      else if (def.amount > 1) {
        const bar = el('div', 'skill-bar');
        const fill = el('div', 'skill-fill');
        fill.style.width = `${pct}%`;
        bar.append(fill);
        body.append(bar);
      }
      row.append(icon, body);
      list.append(row);
    }
    const spark = el('div', 'spark-row');
    const pips = el('span', 'spark-pips');
    pips.title = t('spark.tip', { n: folk.spark, max: MAX_SPARK, cost: INSPIRE_COST });
    for (let i = 0; i < MAX_SPARK; i++) pips.append(el('span', `pip${i < folk.spark ? ' on' : ''}`));
    spark.append(el('span', 'wish-label', t('spark.title')), pips);
    if (inspired) {
      spark.append(el('span', 'spark-on', t('spark.until', { time: formatClock(folk.inspired) })));
    } else {
      const b = el('button', 'btn btn-small btn-spark', t('spark.inspire'));
      b.disabled = folk.spark < INSPIRE_COST;
      b.title = t('spark.inspireTip', { cost: INSPIRE_COST });
      b.addEventListener('click', () => {
        if (this.ctrl.commandOrExplain({ type: 'inspire', folkId: folk.id })) this.wishesSig = '';
      });
      spark.append(b);
    }
    this.wishesEl.append(list, spark, el('div', 'panel-note', t('spark.hint')));
  }

  // ---------- avisos ----------

  /**
   * Plano 2, bloco 2: aviso empilhado no canto, com ícone, hora e fechar;
   * clicar leva a câmera até onde aconteceu. Ao sair da tela ele fica no
   * histórico (o sininho).
   */
  private showNotice(text: string, icon: string, target: FocusTarget | null): void {
    const entry: NoticeEntry = { text, icon, target, tick: this.ctrl.world.tick };
    this.history.unshift(entry);
    if (this.history.length > HISTORY_MAX) this.history.length = HISTORY_MAX;
    const card = this.noticeCard(entry, 'card notice');
    const close = el('button', 'pill-cancel', '✕');
    close.title = t('hud.close');
    close.setAttribute('aria-label', t('hud.close'));
    close.addEventListener('click', (e) => {
      e.stopPropagation();
      card.remove();
    });
    card.append(close);
    this.noticesEl.prepend(card);
    while (this.noticesEl.children.length > 4) this.noticesEl.lastElementChild?.remove();
    window.setTimeout(() => card.classList.add('out'), 24000);
    window.setTimeout(() => card.remove(), 24500);
    this.renderHistoryButton();
    if (this.pop === 'history') {
      this.popSig = '';
      this.renderPop();
    }
  }

  private noticeCard(entry: NoticeEntry, className: string): HTMLElement {
    const card = el('div', className);
    const ic = el('span', 'notice-icon');
    ic.innerHTML = iconSvg(entry.icon as IconId, 16);
    const body = el('div', 'notice-body');
    body.append(el('div', 'notice-text', entry.text), el('span', 'notice-time', whenText(entry.tick)));
    card.append(ic, body);
    if (entry.target) {
      card.classList.add('go');
      card.title = t('notice.go');
      const target = entry.target;
      card.addEventListener('click', () => {
        if ('folkId' in target) this.ctrl.selectFolk(target.folkId);
        this.ctrl.focus(target);
        this.update();
      });
    }
    return card;
  }

  private renderHistoryButton(): void {
    const n = this.history.length;
    this.historyButton.innerHTML = iconSvg('bell', 16);
    if (n) this.historyButton.append(el('span', 'history-n', String(n)));
    this.historyButton.title = t('notice.history');
    this.historyButton.setAttribute('aria-label', this.historyButton.title);
    this.historyButton.hidden = n === 0;
  }

  // ---------- fila ----------

  /** Ícone da ação na fila: o da necessidade que mais sobe, ou o do tipo da ação. */
  private actionIcon(action: Action): IconId {
    switch (action.kind) {
      case 'goto':
      case 'leave':
        return 'walk';
      case 'work':
        return 'work';
      case 'tidy':
        return 'broom';
      case 'door':
        return 'house';
      case 'douse':
      case 'panic':
        return 'fire';
      case 'circle':
      case 'listen':
        return 'social';
      default:
        break;
    }
    if (action.serviceId) return 'phone';
    if (action.guests) return 'heart';
    if (action.kind === 'social') {
      const def = this.ctrl.sim.catalog.socials[action.socialId ?? ''];
      return def?.category === 'romantic' ? 'heart' : def?.category === 'mean' ? 'no' : 'social';
    }
    const it = this.ctrl.sim.interactionOf(action);
    if (!it) return 'mood';
    if (it.special === 'call' || it.special === 'answer' || it.special === 'services') return 'phone';
    if (it.care) return 'hand';
    const main = Object.entries(it.effects).sort((a, c) => (c[1] ?? 0) - (a[1] ?? 0))[0];
    if (main && (main[1] ?? 0) > 0) return main[0] as NeedId;
    return it.skill ? 'skill' : 'mood';
  }

  /** Quanto da ação já foi (0 a 1), ou null quando não dá para saber. */
  private actionProgress(folk: Folk, action: Action): number | null {
    if (action.phase === 'walking' || action.phase === 'queued') return null;
    if (action.kind === 'social') {
      const def = this.ctrl.sim.catalog.socials[action.socialId ?? ''];
      return def?.duration ? Math.min(1, action.elapsed / def.duration) : null;
    }
    if (action.kind !== 'use') return null;
    const it = this.ctrl.sim.interactionOf(action);
    if (!it || it.duration <= 0) return null;
    let p = action.elapsed / it.duration;
    if (it.until) p = Math.max(p, folk.needs[it.until] / 100);
    return Math.min(1, Math.max(0, p));
  }

  private renderQueue(): void {
    if (this.drag) return;
    const folk = this.ctrl.folk;
    const cur = folk.queue[0];
    const prog = cur ? this.actionProgress(folk, cur) : null;
    const sig =
      `${this.ctrl.mode}|${folk.id}|${folk.away?.until ?? ''}|${folk.collapsed > 0}|${prog === null ? '' : Math.round(prog * 40)}|` +
      folk.queue.map((a) => `${a.id}:${a.phase}`).join(',');
    if (sig === this.queueSig) return;
    this.queueSig = sig;
    this.queueEl.replaceChildren();
    const doing = folk.away
      ? t(folk.away.school ? 'queue.school' : 'queue.away', { time: formatClock(folk.away.until) })
      : folk.collapsed > 0
        ? t('queue.collapsed')
        : cur
          ? `${this.actionLabel(cur)}${cur.phase === 'walking' ? ` · ${t('queue.walking')}` : ''}`
          : t('queue.idle');
    if (this.doingEl.textContent !== doing) this.doingEl.textContent = doing;
    this.doingEl.classList.toggle('idle', !cur && !folk.away && folk.collapsed === 0);
    this.queueWrap.hidden = this.ctrl.mode !== 'live' || !!folk.away || folk.collapsed > 0;
    if (this.queueWrap.hidden) return;
    if (folk.queue.length === 0) {
      this.queueEl.append(el('div', 'queue-empty', t('queue.emptyManual', { name: first(folk.name) })));
      return;
    }
    folk.queue.forEach((action, index) => {
      const pill = el('button', 'qicon');
      pill.dataset.id = String(action.id);
      if (index === 0) pill.classList.add('current');
      if (action.source === 'auto') pill.classList.add('auto');
      const icon = el('span', 'qicon-img');
      icon.innerHTML = iconSvg(this.actionIcon(action), index === 0 ? 26 : 22);
      pill.append(icon, el('span', 'qicon-x', '✕'));
      if (index === 0) {
        const p = this.actionProgress(folk, action);
        if (p !== null) pill.style.setProperty('--p', `${Math.round(p * 100)}%`);
        pill.classList.toggle('timed', p !== null);
      }
      const label = this.actionLabel(action);
      const notes = [action.source === 'auto' ? t('queue.auto') : '', action.phase === 'walking' ? t('queue.walking') : ''].filter(Boolean);
      pill.title = `${label}${notes.length ? ` (${notes.join(', ')})` : ''}. ${t(index === 0 ? 'queue.clickCancel' : 'queue.dragHint')}`;
      pill.setAttribute('aria-label', pill.title);
      pill.addEventListener('pointerdown', (e) => this.queueDown(e, pill, action.id, index));
      this.queueEl.append(pill);
    });
  }

  /** Plano 2, bloco 2: clicar cancela; arrastar (o que não é a ação de agora) muda a ordem. */
  private queueDown(e: PointerEvent, pill: HTMLElement, id: number, index: number): void {
    if (e.button !== 0) return;
    e.preventDefault();
    const folk = this.ctrl.folk;
    this.drag = { id, startX: e.clientX, moved: false, pill };
    const move = (ev: PointerEvent) => {
      const d = this.drag;
      if (!d) return;
      const dx = ev.clientX - d.startX;
      if (!d.moved && Math.abs(dx) > 6 && index > 0) {
        d.moved = true;
        pill.classList.add('dragging');
      }
      if (d.moved) pill.style.transform = `translateX(${dx / this.scale()}px)`;
    };
    const up = (ev: PointerEvent) => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      const d = this.drag;
      this.drag = null;
      this.queueSig = '';
      if (!d) return;
      if (!d.moved) {
        this.ctrl.command({ type: 'cancel', folkId: folk.id, actionId: id });
        cue('close');
        this.update();
        return;
      }
      // a nova posição é a do ícone mais perto de onde soltou (a de agora não sai do lugar)
      const pills = [...this.queueEl.querySelectorAll<HTMLElement>('.qicon')];
      let to = index;
      let best = Infinity;
      pills.forEach((p, i) => {
        if (i === 0) return;
        const r = p === pill ? null : p.getBoundingClientRect();
        const cx = r ? r.left + r.width / 2 : d.startX;
        const dist = Math.abs(ev.clientX - cx);
        if (dist < best) {
          best = dist;
          to = i;
        }
      });
      this.ctrl.command({ type: 'moveQueued', folkId: folk.id, actionId: id, to });
      cue('open');
      this.update();
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  }

  // ---------- atualização ----------

  update(): void {
    const world = this.ctrl.world;
    // bloco 14: casa vazia: só o aviso (não há a quem mostrar)
    if (this.renderOver()) return;
    const folk = this.ctrl.folk;
    const clock = clockOf(world.tick);
    this.root.dataset.mode = this.ctrl.mode;
    const levelText = t(`hud.level.${this.ctrl.viewLevel}`);
    if (this.levelLabel.textContent !== levelText) this.levelLabel.textContent = levelText;
    this.renderWallModes();
    this.styleEditor.update();

    // bloco 13: o dia mostra quando está chovendo
    const dayText = t('hud.dayShortWeek', { day: clock.day, weekday: t(`weekday.${(clock.day - 1) % 7}`) }) + (raining(world) ? ' ☂' : '');
    if (this.clockDay.textContent !== dayText) this.clockDay.textContent = dayText;
    this.clockDay.title = raining(world) ? t('hud.rain') : '';
    const house = world.household;
    const funds = formatMoney(house.funds);
    if (this.fundsEl.textContent !== funds) this.fundsEl.textContent = funds;
    this.fundsEl.classList.toggle('debt', house.funds < 0);
    const unpaid = unpaidBills(world).length;
    this.fundsEl.title = t('hud.fundsTip');
    this.fundsEl.classList.toggle('mail', unpaid > 0);
    if (this.fundsEl.dataset.mail !== String(unpaid)) {
      this.fundsEl.dataset.mail = String(unpaid);
      this.fundsEl.dataset.mailText = unpaid > 0 ? t('hud.mail', { n: unpaid }) : '';
    }
    for (const [id, b] of this.modeButtons) {
      const on = id === this.ctrl.mode || (id !== 'live' && id !== 'buy' && id !== 'build' && this.pop === id);
      b.classList.toggle('on', on);
    }
    const city = this.modeButtons.get('city');
    if (city) city.classList.toggle('hot', !!world.outing);
    const time = formatClock(world.tick);
    if (this.clockTime.textContent !== time) this.clockTime.textContent = time;
    this.clockTime.classList.toggle('paused', world.speed === 0);
    const night = clock.hour < 6 || clock.hour >= 19;
    this.clockSky.classList.toggle('night', night);
    this.speedButtons.forEach((b, i) => b.classList.toggle('on', i === world.speed));
    // plano 2, bloco 1: pular só acende com a casa toda dormindo, fora ou ocupada
    const skip = this.speedButtons[SKIP_SPEED];
    if (skip) {
      const can = world.speed === SKIP_SPEED || canSkip(world, this.ctrl.sim.catalog);
      skip.classList.toggle('off', !can);
      skip.setAttribute('aria-disabled', String(!can));
    }

    if (this.nameEl.textContent !== folk.name) this.nameEl.textContent = folk.name;
    const traitText = [...(folk.age ? [t(`age.${folk.age}`)] : []), ...folk.traits.map((id) => t(`trait.${id}`))].join(' · ');
    if (this.traitsEl.textContent !== traitText) this.traitsEl.textContent = traitText;

    const mood = moodOf(this.ctrl.sim.catalog, folk.needs);
    const level = mood >= 80 ? 5 : mood >= 62 ? 4 : mood >= 45 ? 3 : mood >= 28 ? 2 : 1;
    const word = t(`mood.${level}`);
    if (this.moodWord.textContent !== word) this.moodWord.textContent = word;
    this.moodFill.style.width = `${Math.round(mood)}%`;
    this.moodFill.dataset.level = String(level);
    const face = faceState(this.ctrl.sim.catalog, folk);
    const faceKey = `${folk.id}|${level}|${face}|${folk.look.hair}|${folk.look.style}`;
    if (this.faceEl.dataset.key !== faceKey) {
      this.faceEl.dataset.key = faceKey;
      this.faceEl.innerHTML = faceSvg(folk.look, 72, mood, face);
      this.faceEl.dataset.mood = String(level);
    }
    this.renderHousehold();
    this.renderParty();

    for (const id of NEED_IDS) {
      const row = this.needRows.get(id);
      if (!row) continue;
      const v = folk.needs[id];
      const tone = v < 25 ? 'low' : v < 55 ? 'mid' : 'high';
      if (row.row.dataset.tone !== tone) row.row.dataset.tone = tone;
      row.row.title = `${t(`need.${id}`)}: ${Math.round(v)}`;
      row.segs.forEach((s, i) => s.classList.toggle('on', v >= (i + 0.5) * (100 / SEGMENTS)));
    }
    // aba fechada com necessidade no vermelho: o ícone da aba avisa
    const low = NEED_IDS.some((id) => folk.needs[id] < 25);
    this.tabButtons.get('needs')?.classList.toggle('alert', low && this.tab !== 'needs');

    this.renderRoom(folk);
    this.renderKid(folk);
    this.renderWishes(folk);
    this.renderQueue();
    this.renderWorkEvent();
    this.renderBargain();
    this.renderPanel();
    this.renderPop();
    this.renderCatalog();
    this.renderBuild();
  }

  // ---------- menu de interações ----------

  isMenuOpen(): boolean {
    return this.menuOpen;
  }

  closeMenu(): void {
    this.menuOpen = false;
    this.menuEl.hidden = true;
    this.ringEl.hidden = true;
  }

  /**
   * Plano 2, bloco 2: menu em anel. As opções ficam em volta do ponto
   * clicado; passando de RING_MAX, as do mesmo grupo viram uma fatia que abre
   * um segundo anel (com "voltar" no meio). O que não dá agora fica em cinza
   * e o motivo aparece no meio do anel e na dica.
   */
  private showRing(x: number, y: number, head: HTMLElement[], items: RingItem[], back?: () => void): void {
    this.menuEl.hidden = true;
    if (this.ringEl.hidden) cue('open');
    this.menuOpen = true;
    this.ringEl.hidden = false;
    this.ringEl.replaceChildren();
    const k = this.scale();
    const hub = el('div', 'ring-hub card');
    hub.append(...head);
    const hint = el('div', 'ring-hint', items.length ? t('ring.hint') : t('menu.nothing'));
    hub.append(hint);
    if (back) {
      const b = el('button', 'ring-back');
      b.innerHTML = iconSvg('back', 14);
      b.append(el('span', '', t('ring.back')));
      b.addEventListener('click', back);
      hub.prepend(b);
    }
    this.ringEl.append(hub);
    const slots = ringSlots(items);
    const pills: HTMLElement[] = slots.map((slot) => {
      const b = el('button', 'ring-item');
      if (slot.kind === 'group') {
        const icon = el('span', 'ring-icon');
        icon.innerHTML = iconSvg(GROUP_ICON[slot.group] ?? 'mood', 16);
        b.append(icon, el('span', 'ring-label', t(`ring.group.${slot.group}`)), el('span', 'ring-more', `${slot.items.length} ›`));
        b.classList.add('group', `cat-${slot.group}`);
        b.addEventListener('mouseenter', () => (hint.textContent = slot.items.map((i) => i.label).join(' · ')));
        b.addEventListener('click', () => this.showRing(x, y, head, slot.items, () => this.showRing(x, y, head, items, back)));
        return b;
      }
      const it = slot.item;
      if (it.face) {
        const face = el('span', 'menu-face');
        face.innerHTML = faceSvg(it.face, 18);
        b.append(face);
      } else {
        const icon = el('span', 'ring-icon');
        icon.innerHTML = iconSvg(it.icon ?? 'mood', 16);
        b.append(icon);
      }
      b.append(el('span', 'ring-label', it.label));
      if (it.extra) b.append(el('span', 'ring-extra', it.extra));
      if (it.group) b.classList.add(`cat-${it.group}`);
      if (it.tone) b.classList.add(it.tone);
      const tip = it.why ?? it.reluctant ?? it.extra ?? '';
      if (it.why) {
        b.classList.add('off');
        b.setAttribute('aria-disabled', 'true');
      } else if (it.reluctant) b.classList.add('reluctant');
      b.title = tip ? `${it.label}: ${tip}` : it.label;
      b.addEventListener('mouseenter', () => (hint.textContent = it.why ? `✕ ${it.why}` : it.reluctant ? `! ${it.reluctant}` : (it.extra ?? it.label)));
      b.addEventListener('click', () => {
        if (it.why) {
          cue('click');
          hint.textContent = `✕ ${it.why}`;
          return;
        }
        it.run();
      });
      return b;
    });
    this.ringEl.append(...pills);
    // mede o meio para o anel não passar por cima dele
    const hubRect = hub.getBoundingClientRect();
    const hubW = hubRect.width / k;
    const hubH = hubRect.height / k;
    const r = Math.max(ringRadius(slots.length), hubH / 2 + 26, hubW / 2 + 18);
    const pts = ringPoints(slots.length, r);
    let reachX = hubW / 2;
    let reachY = hubH / 2;
    pills.forEach((p, i) => {
      const w = p.getBoundingClientRect().width / k;
      const pt = pts[i];
      // à esquerda a fatia cresce para a esquerda; à direita, para a direita; em cima e embaixo, centrada
      const side = pt.x < -12 ? -1 : pt.x > 12 ? 1 : 0;
      const left = side < 0 ? pt.x - w + 18 : side > 0 ? pt.x - 18 : pt.x - w / 2;
      p.style.left = `${Math.round(left)}px`;
      p.style.top = `${Math.round(pt.y - 16)}px`;
      p.style.setProperty('--dx', `${-pt.x}px`);
      p.style.setProperty('--dy', `${-pt.y}px`);
      p.style.animationDelay = `${i * 18}ms`;
      reachX = Math.max(reachX, Math.abs(left), Math.abs(left + w));
      reachY = Math.max(reachY, Math.abs(pt.y) + 18);
    });
    const c = ringCenter(x, y, reachX * k, reachY * k, window.innerWidth, window.innerHeight);
    this.ringEl.style.left = `${c.x / k}px`;
    this.ringEl.style.top = `${c.y / k}px`;
    // foco no primeiro (teclado: Tab passa pelas fatias)
    (pills[0] as HTMLButtonElement | undefined)?.focus({ preventScroll: true });
  }

  /** Cabeçalho do anel: nome e o estado em notas curtas. */
  private ringHead(title: string, notes: { text: string; warn?: boolean }[], look?: Folk['look'], sub?: string): HTMLElement[] {
    const head = el('div', 'ring-title');
    if (look) {
      const face = el('span', 'menu-face big');
      face.innerHTML = faceSvg(look, 26);
      head.append(face);
    }
    const names = el('div', 'menu-names');
    names.append(el('div', '', title));
    if (sub) names.append(el('div', 'menu-sub', sub));
    head.append(names);
    return [head, ...notes.map((n) => el('div', `ring-note${n.warn ? ' menu-warn' : ''}`, n.text))];
  }

  private order(cmd: Command): void {
    this.ctrl.commandOrExplain(cmd);
    this.closeMenu();
    this.update();
  }

  openMenu(x: number, y: number, obj: WorldObject): void {
    const def = this.ctrl.sim.defOf(obj);
    if (!def) return;
    const folk = this.ctrl.folk;
    const world = this.ctrl.world;
    const catalog = this.ctrl.sim.catalog;
    const notes: { text: string; warn?: boolean }[] = [];
    const state = stateOf(obj);
    const status = this.objectStatus(obj);
    if (status) notes.push({ text: status, warn: state.broken });
    // bloco 13: como vai a planta (fase, água e frutos)
    if (def.plant && obj.plant) {
      const stage = plantStage(obj.plant);
      let note = t('plant.status', { stage: t(`plant.${stage}`), water: Math.round(obj.plant.water) });
      if (obj.plant.fruit > 0) note += ` · ${t('plant.fruit', { n: obj.plant.fruit })}`;
      notes.push({ text: note, warn: stage === 'wilted' || stage === 'dead' });
    }
    // bloco 7: o que o som está tocando e qual estação o folk prefere
    if (isStereo(def)) {
      const on = stationDef(obj.tune);
      const fav = favoriteStation(folk);
      if (on && !state.broken) notes.push({ text: `♪ ${t('menu.playing', { station: t(on.name) })}` });
      notes.push({ text: `${t(fav.name)}: ${t('menu.favStation', { name: first(folk.name) })}` });
    }
    // plano 2, bloco 4: o que passa na TV e o canal preferido de quem foi selecionado
    if (viewOf(def)?.kind === 'tv') {
      const on = channelDef(obj.channel);
      if (on && !state.broken) notes.push({ text: t('menu.onAir', { channel: t(on.name) }) });
      notes.push({ text: t('menu.favChannel', { name: first(folk.name), channel: t(`channel.${favoriteChannel(folk)}`) }) });
    }
    // bloco 2: cada conta da caixa de correio, detalhada
    if (def.interactions.some((i) => i.special === 'payBills')) {
      for (const bill of unpaidBills(world)) {
        const day = Math.floor(bill.due / 1440) + 1;
        const late = world.tick > bill.due;
        notes.push({ text: `${formatMoney(bill.power + bill.water + bill.furniture)} · ${t(late ? 'bill.overdue' : 'bill.due', { day })}`, warn: late });
      }
    }
    const items: RingItem[] = [];
    // bloco 9: telefone tocando: atender vem primeiro
    const answer = def.interactions.find((i) => i.special === 'answer');
    if (answer && world.call && !world.call.answeredBy) {
      const n = world.neighbors.find((x) => x.id === world.call!.from);
      items.push({ label: t('act.answerFrom', { name: n ? first(n.name) : '?' }), icon: 'phone', tone: 'ringing', run: () => this.order({ type: 'answerPhone', folkId: folk.id }) });
    }
    for (const it of def.interactions) {
      const st = interactionState(world, catalog, folk, obj, it);
      if (!st.show) continue;
      const main = Object.entries(it.effects).sort((a, c) => (c[1] ?? 0) - (a[1] ?? 0))[0];
      const extras: string[] = [];
      if (it.cost) extras.push(formatMoney(it.cost));
      if (it.special === 'payBills') extras.push(formatMoney(debtOf(world)));
      if (it.special === 'fair') extras.push(formatMoney(FAIR.price));
      // plano 2, bloco 6: o prato diz quanto rende e quanto demora
      const dish = it.cook ? DISH_BY_ID[it.cook] : undefined;
      if (dish) extras.push(t('cook.extra', { n: servingsFor(world, dish), min: it.duration }));
      else if (it.skill) extras.push(t(`skill.${it.skill.id}`));
      if (it.tune === 'next') extras.push(t(stationDef(nextStation(obj.tune))!.name));
      const sub = it.special === 'invite' || it.special === 'services' || it.special === 'call' || it.special === 'party';
      if (sub) extras.push('›');
      items.push({
        label: t(it.label),
        icon: it.care ? 'hand' : dish ? 'hunger' : main && (main[1] ?? 0) > 0 ? (main[0] as NeedId) : it.skill ? 'skill' : 'mood',
        extra: extras.join(' · ') || undefined,
        why: st.why ? t(`ring.why.${st.why}`, { name: first(folk.name), n: dish?.skill ?? 0 }) : undefined,
        reluctant: st.reluctant ? `${t('refuse.short')}: ${t(`refuse.${st.reluctant}`, { name: folk.name })}` : undefined,
        group: objectGroup(it),
        run: () => {
          if (it.special === 'invite') return this.openInviteMenu(x, y);
          if (it.special === 'services') return this.openServicesMenu(x, y);
          if (it.special === 'call') return this.openCallMenu(x, y, obj, it.id);
          if (it.special === 'party') return this.openPartyMenu(x, y);
          this.order({ type: 'queueUse', folkId: folk.id, objectId: obj.id, interactionId: it.id });
        },
      });
    }
    this.showRing(x, y, this.ringHead(t(def.name), notes), items);
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
    // plano 2, bloco 6: louça na pia e cama desfeita
    if (obj.dishes) parts.push(t('state.sinkDishes', { n: Math.ceil(obj.dishes) }));
    if (obj.unmade) parts.push(t('state.unmade'));
    // bloco 14: lápide e urna dizem de quem são; lareira acesa
    if (obj.memorial) {
      const who = this.ctrl.world.departed?.find((d) => d.id === obj.memorial!.personId);
      if (who) parts.push(t('memorial.of', { name: who.name }));
      parts.push(obj.memorial.unrest > 0 ? t('memorial.unrest', { n: Math.round(obj.memorial.unrest) }) : t('memorial.rest'));
    }
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
    if (mess.kind === 'meal' && mess.meal) return this.openMealMenu(x, y, mess);
    const old = mess.kind === 'paper' && !freshPaper(this.ctrl.world, mess);
    const item: RingItem = {
      label: this.messAction(mess),
      icon: mess.kind === 'paper' && !old ? 'fun' : 'broom',
      extra: mess.kind !== 'paper' ? t('skill.tidiness') : undefined,
      run: () => this.order({ type: 'queueTidy', folkId: folk.id, messId: mess.id }),
    };
    this.showRing(x, y, this.ringHead(t(old ? 'mess.paperOld' : `mess.${mess.kind}`), []), [item]);
  }

  /** Plano 2, bloco 6: a travessa servida: servir-se, chamar a família, esquentar, jogar fora. */
  private openMealMenu(x: number, y: number, mess: Mess): void {
    const folk = this.ctrl.folk;
    const meal = mess.meal!;
    const tick = this.ctrl.world.tick;
    const spoiled = isSpoiled(meal, tick);
    const empty = meal.servings <= 0;
    const order = (act: MealAct) => () => this.order({ type: 'mealAct', folkId: folk.id, messId: mess.id, act });
    const items: RingItem[] = [];
    if (!spoiled) {
      items.push({ label: t('meal.serve'), icon: 'hunger', why: empty ? t('ring.why.noFood') : undefined, run: order('serve') });
      items.push({ label: t('meal.call'), icon: 'social', why: empty ? t('ring.why.noFood') : undefined, run: order('call') });
      if (!isWarm(meal, tick)) items.push({ label: t('meal.reheat'), icon: 'fun', run: order('reheat') });
    }
    items.push({ label: t('meal.scrap'), icon: 'broom', run: order('scrap') });
    this.showRing(x, y, this.ringHead(t(`dish.${meal.dish}`), this.mealNotes(mess)), items);
  }

  /** O que a travessa mostra: porções, temperatura e o ponto. */
  mealNotes(mess: Mess): { text: string; warn?: boolean }[] {
    const meal = mess.meal;
    if (!meal) return [];
    const tick = this.ctrl.world.tick;
    const spoiled = isSpoiled(meal, tick);
    const temp = t(spoiled ? 'meal.spoiled' : meal.burnt ? 'meal.burnt' : isWarm(meal, tick) ? 'meal.warm' : 'meal.cold');
    const out = [{ text: t('meal.state', { n: meal.servings, total: meal.total, temp }), warn: spoiled || !!meal.burnt }];
    if (!spoiled) out.push({ text: t('meal.quality', { q: meal.quality }), warn: false });
    return out;
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
      { id: 'gardener', label: t('services.gardener', { hour: GARDENER.hour }), price: t('services.perDay', { price: formatMoney(GARDENER.fee) }) },
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
      const hired = (row.id === 'maid' && world.household.maid) || (row.id === 'gardener' && world.household.gardener);
      if (hired && (row.id === 'maid' || row.id === 'gardener')) {
        const service = row.id;
        b.append(icon, el('span', '', t(`services.${service}On`)));
        b.addEventListener('click', () => {
          this.ctrl.commandOrExplain({ type: 'dismissService', service });
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

  /** Bloco 9: escolher o assunto do papo. */
  private openTopicMenu(x: number, y: number, other: Folk): void {
    const folk = this.ctrl.folk;
    const world = this.ctrl.world;
    const catalog = this.ctrl.sim.catalog;
    const social = Object.values(catalog.socials).find((d) => d.topic)!;
    const knows = (relationOf(world, folk.id, other.id)?.friendship ?? 0) >= 30;
    this.menuEl.replaceChildren(el('div', 'menu-title', t('topic.with', { name: first(other.name) })));
    if (!knows) this.menuEl.append(el('div', 'menu-note', t('topic.unknown')));
    for (const id of Object.keys(catalog.topics)) {
      const b = el('button', 'menu-item');
      const icon = el('span', 'menu-icon');
      icon.innerHTML = topicSvg(id, 16);
      b.append(icon, el('span', '', t(`topic.${id}`)));
      if (knows) {
        const r = reactionTo(catalog, other, id);
        b.append(el('span', `menu-extra react-${r}`, t(`topic.${r}`)));
      }
      b.addEventListener('click', () => {
        this.ctrl.commandOrExplain({ type: 'queueSocial', folkId: folk.id, otherId: other.id, socialId: social.id, topic: id });
        this.closeMenu();
        this.update();
      });
      this.menuEl.append(b);
    }
    this.showMenuAt(x, y);
  }

  /** Bloco 9: ligar para um amigo (ou deixar o folk escolher). */
  private openCallMenu(x: number, y: number, obj: WorldObject, interactionId: string): void {
    const folk = this.ctrl.folk;
    const world = this.ctrl.world;
    this.menuEl.replaceChildren(el('div', 'menu-title', t('phone.callTitle')));
    const any = el('button', 'menu-item');
    any.append(el('span', 'menu-dot'), el('span', '', t('phone.callAnyone')));
    any.addEventListener('click', () => {
      this.ctrl.commandOrExplain({ type: 'queueUse', folkId: folk.id, objectId: obj.id, interactionId });
      this.closeMenu();
      this.update();
    });
    this.menuEl.append(any);
    const known = world.neighbors
      .filter((n) => !isServiceNeighbor(n) && relationOf(world, folk.id, n.id) && !this.ctrl.sim.findFolk(n.id))
      .sort((a, b) => (relationOf(world, folk.id, b.id)?.friendship ?? 0) - (relationOf(world, folk.id, a.id)?.friendship ?? 0));
    for (const n of known) {
      const rel = relationOf(world, folk.id, n.id);
      const b = el('button', 'menu-item');
      const face = el('span', 'menu-face');
      face.innerHTML = faceSvg(n.look, 18);
      const cooling = rel && world.tick - rel.last >= 1440 && rel.friendship > 0;
      b.append(face, el('span', '', n.name), el('span', 'menu-extra', `${t(friendshipLabel(rel))}${cooling ? ` · ${t('rel.cooling')}` : ''}`));
      b.addEventListener('click', () => {
        this.ctrl.commandOrExplain({ type: 'phoneFriend', folkId: folk.id, neighborId: n.id });
        this.closeMenu();
        this.update();
      });
      this.menuEl.append(b);
    }
    this.showMenuAt(x, y);
  }

  /** Bloco 9: quem chamar para a festa (com aviso de rivais na mesma lista). */
  /** Bloco 16: quem vai ao centro e com quem sair (encontro). */
  openOutingMenu(x: number, y: number, picked?: Set<number>, dateId?: number): void {
    const world = this.ctrl.world;
    const folk = this.ctrl.folk;
    const household = this.ctrl.sim.household().filter((f) => f.age !== 'baby');
    const chosen = picked ?? new Set(household.filter((f) => canGo(f)).map((f) => f.id));
    this.menuEl.replaceChildren(el('div', 'menu-title', t('outing.title')));
    this.menuEl.append(el('div', 'menu-note party-hint', t('outing.hint', { fare: formatMoney(TAXI_FARE) })));
    this.menuEl.append(el('div', 'menu-group', t('outing.who')));
    const box = el('div', 'party-list');
    for (const f of household) {
      const row = el('label', 'menu-item party-row');
      const check = el('input');
      check.type = 'checkbox';
      check.checked = chosen.has(f.id);
      check.disabled = !canGo(f);
      check.addEventListener('change', () => {
        if (check.checked) chosen.add(f.id);
        else chosen.delete(f.id);
        this.openOutingMenu(x, y, chosen, dateId);
      });
      const face = el('span', 'menu-face');
      face.innerHTML = faceSvg(f.look, 18);
      row.append(check, face, el('span', '', f.name), el('span', 'menu-extra', f.away ? t('outing.away') : ''));
      box.append(row);
    }
    this.menuEl.append(box);
    // encontro: alguém da casa que vai junto, ou um conhecido que vem encontrar
    const host = chosen.has(folk.id) ? folk : household.find((f) => chosen.has(f.id));
    if (host && host.age === undefined) {
      this.menuEl.append(el('div', 'menu-group', t('outing.date')));
      const mates = household.filter((f) => f.id !== host.id && chosen.has(f.id) && f.age === undefined);
      const known = world.neighbors
        .filter((n) => dateAvailable(n) && relationOf(world, host.id, n.id))
        .sort((a, b) => {
          const ra = relationOf(world, host.id, a.id)!;
          const rb = relationOf(world, host.id, b.id)!;
          return rb.romance + rb.friendship - (ra.romance + ra.friendship) || a.id - b.id;
        })
        .slice(0, 8);
      const list = el('div', 'party-list');
      const option = (id: number | undefined, label: string, extra: string, look?: Folk['look']) => {
        const b = el('button', `menu-item surname${dateId === id ? ' picked' : ''}`);
        b.append(el('span', 'menu-dot'));
        if (look) {
          const face = el('span', 'menu-face');
          face.innerHTML = faceSvg(look, 18);
          b.append(face);
        }
        b.append(el('span', '', label), el('span', 'menu-extra', extra));
        b.addEventListener('click', () => this.openOutingMenu(x, y, chosen, id));
        list.append(b);
      };
      option(undefined, t('outing.noDate'), '');
      for (const m of mates) option(m.id, m.name, romanceText(relationOf(world, host.id, m.id)), m.look);
      for (const n of known) {
        const rel = relationOf(world, host.id, n.id);
        option(n.id, n.name, [t(friendshipLabel(rel)), romanceText(rel)].filter(Boolean).join(' · '), n.look);
      }
      this.menuEl.append(list);
      this.menuEl.append(el('div', 'menu-note party-hint', t('outing.dateHint')));
    }
    const ids = [...chosen];
    if (host) ids.sort((a, b) => (a === host.id ? -1 : b === host.id ? 1 : 0));
    const go = el('button', 'btn party-go', t('outing.go'));
    go.disabled = chosen.size === 0;
    go.addEventListener('click', () => {
      const date = dateId !== undefined && (household.some((f) => f.id === dateId) ? chosen.has(dateId) : true) ? dateId : undefined;
      if (this.ctrl.outingCommand({ type: 'goDowntown', folkIds: ids, dateId: date })) this.closeMenu();
      else this.openOutingMenu(x, y, chosen, dateId);
    });
    this.menuEl.append(go);
    this.showMenuAt(x, y);
  }

  openPartyMenu(x: number, y: number, picked?: Set<number>, wedding?: { partner: number; surname: SurnameChoice }): void {
    const folk = this.ctrl.folk;
    const world = this.ctrl.world;
    const people = world.neighbors
      .filter((n) => !isServiceNeighbor(n) && relationOf(world, folk.id, n.id) && n.id !== wedding?.partner)
      .sort((a, b) => (relationOf(world, folk.id, b.id)?.friendship ?? 0) - (relationOf(world, folk.id, a.id)?.friendship ?? 0) || a.id - b.id);
    const chosen = picked ?? new Set(people.filter((n) => (relationOf(world, folk.id, n.id)?.friendship ?? 0) >= 20).slice(0, 6).map((n) => n.id));
    const cliques = findCliques(world);
    const nameOf = (id: number) => first(this.nameOf(id));
    const partnerName = wedding ? this.nameOf(wedding.partner) : '';
    this.menuEl.replaceChildren(el('div', 'menu-title', wedding ? t('wedding.title', { name: first(partnerName) }) : t('party.title')));
    if (world.party) {
      this.menuEl.append(el('div', 'menu-note menu-warn', t('problem.partyOn')));
      this.showMenuAt(x, y);
      return;
    }
    this.menuEl.append(el('div', 'menu-note party-hint', wedding ? t('wedding.hint') : t('party.hint', { max: PARTY_MAX_GUESTS })));
    if (wedding) {
      // sobrenome: o de quem marca, o do par, os dois juntos ou cada um o seu
      this.menuEl.append(el('div', 'menu-group', t('wedding.surname')));
      const row = el('div', 'surname-row');
      const choices: SurnameChoice[] = ['host', 'partner', 'both', 'keep'];
      for (const c of choices) {
        const [hn] = weddingNames(folk.name, partnerName, c);
        const label =
          c === 'host'
            ? t('wedding.surname.host', { name: first(folk.name), surname: surname(folk.name) })
            : c === 'partner'
              ? t('wedding.surname.partner', { name: first(partnerName), surname: surname(partnerName) })
              : c === 'both'
                ? t('wedding.surname.both', { surname: surname(hn) })
                : t('wedding.surname.keep');
        const b = el('button', `menu-item surname${wedding.surname === c ? ' picked' : ''}`);
        b.append(el('span', 'menu-dot'), el('span', '', label));
        b.addEventListener('click', () => this.openPartyMenu(x, y, chosen, { ...wedding, surname: c }));
        row.append(b);
      }
      this.menuEl.append(row);
      if (chosen.size === 0) this.menuEl.append(el('div', 'menu-note', t('wedding.noGuests')));
    }
    const pairs = rivalPairs(world, [...chosen, folk.id]);
    if (pairs.length) {
      this.menuEl.append(el('div', 'menu-note menu-warn party-hint', t('party.rivals', { list: pairs.map(([a, b]) => `${nameOf(a)} × ${nameOf(b)}`).join(', ') })));
    }
    const box = el('div', 'party-list');
    for (const n of people) {
      const row = el('label', 'menu-item party-row');
      const check = el('input');
      check.type = 'checkbox';
      check.checked = chosen.has(n.id);
      check.disabled = !check.checked && chosen.size >= PARTY_MAX_GUESTS;
      check.addEventListener('change', () => {
        if (check.checked) chosen.add(n.id);
        else chosen.delete(n.id);
        this.openPartyMenu(x, y, chosen, wedding);
      });
      const face = el('span', 'menu-face');
      face.innerHTML = faceSvg(n.look, 18);
      const bits = [t(friendshipLabel(relationOf(world, folk.id, n.id)))];
      const c = cliqueOf(cliques, n.id);
      if (c) bits.push(t('party.clique', { name: nameOf(c.leader) }));
      if ([...chosen].some((o) => o !== n.id && areRivals(world, o, n.id))) bits.push('⚡');
      row.append(check, face, el('span', '', n.name), el('span', 'menu-extra', bits.join(' · ')));
      box.append(row);
    }
    this.menuEl.append(box);
    const go = el('button', 'btn party-go', t(wedding ? 'wedding.call' : 'party.call', { n: chosen.size }));
    go.disabled = chosen.size === 0 && !wedding;
    go.addEventListener('click', () => {
      if (wedding) this.ctrl.commandOrExplain({ type: 'planWedding', folkId: folk.id, partnerId: wedding.partner, guestIds: [...chosen], surname: wedding.surname });
      else this.ctrl.commandOrExplain({ type: 'throwParty', folkId: folk.id, guestIds: [...chosen] });
      this.closeMenu();
      this.update();
    });
    this.menuEl.append(go);
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
    // bloco 6: o que o balão quer dizer
    const th = thoughtOf(other, this.ctrl.world.tick);
    if (th) {
      const who = th.other !== undefined ? this.nameOf(th.other) : '';
      if (th.kind === 'topic') parts.push(t('thought.topic', { topic: t(`topic.${th.icon.replace(/[+-]$/, '')}`) }));
      else parts.push(t(`thought.${th.kind}`, { other: who, need: t(`need.${th.icon}`) }));
    }
    return parts.join(' · ');
  }

  private nameOf(id: number): string {
    const world = this.ctrl.world;
    return world.folks.find((f) => f.id === id)?.name ?? world.neighbors.find((n) => n.id === id)?.name ?? '?';
  }

  private relSummary(rel: Relation | undefined): string {
    const bits = [t(friendshipLabel(rel))];
    const r = romanceLabel(rel);
    if (r) bits.push(t(r));
    const p = respectLabel(rel);
    if (p) bits.push(t(p));
    return bits.join(', ');
  }

  /**
   * Plano 2, bloco 4: clicar no próprio folk sentado mostra o que dá para
   * fazer dali (ler, ligar, levantar).
   */
  openSelfMenu(x: number, y: number): void {
    const folk = this.ctrl.folk;
    const world = this.ctrl.world;
    const p = folk.posture;
    // plano 2, bloco 7: de pé, clicar em si mesmo oferece olhar pela janela
    const window: RingItem = { label: t('act.lookOut'), icon: 'fun', run: () => this.order({ type: 'lookOut', folkId: folk.id }) };
    if (!p) {
      this.showRing(x, y, this.ringHead(folk.name, [], folk.look, t('menu.self')), [window]);
      return;
    }
    const seat = world.objects.find((o) => o.id === p.objectId);
    const sdef = seat && this.ctrl.sim.defOf(seat);
    const notes: { text: string; warn?: boolean }[] = [{ text: t('menu.seatedOn', { object: sdef ? t(sdef.name) : '?' }) }];
    const shown = this.ctrl.sim.watchedBy(folk);
    const shownDef = shown && this.ctrl.sim.defOf(shown);
    if (shownDef) notes.push({ text: t('menu.watching', { object: t(shownDef.name) }) });
    if (folk.carry) notes.push({ text: t('act.eatSeated') });
    const items: RingItem[] = [
      { label: t('act.standUp'), icon: 'walk', run: () => this.order({ type: 'seated', folkId: folk.id, what: 'stand' }) },
      { label: t('act.seatRead'), icon: 'book', run: () => this.order({ type: 'seated', folkId: folk.id, what: 'read' }) },
      { label: t('act.seatCall'), icon: 'phone', extra: '›', run: () => this.openSeatCallMenu(x, y) },
      window,
    ];
    this.showRing(x, y, this.ringHead(folk.name, notes, folk.look, t('menu.seated')), items);
  }

  /** Plano 2, bloco 4: para quem ligar sentado (como no telefone da parede). */
  private openSeatCallMenu(x: number, y: number): void {
    const folk = this.ctrl.folk;
    const world = this.ctrl.world;
    this.menuEl.replaceChildren(el('div', 'menu-title', t('phone.callTitle')));
    const any = el('button', 'menu-item');
    any.append(el('span', 'menu-dot'), el('span', '', t('phone.callAnyone')));
    any.addEventListener('click', () => this.order({ type: 'seated', folkId: folk.id, what: 'call' }));
    this.menuEl.append(any);
    const known = world.neighbors
      .filter((n) => !isServiceNeighbor(n) && relationOf(world, folk.id, n.id) && !this.ctrl.sim.findFolk(n.id))
      .sort((a, b) => (relationOf(world, folk.id, b.id)?.friendship ?? 0) - (relationOf(world, folk.id, a.id)?.friendship ?? 0));
    for (const n of known) {
      const b = el('button', 'menu-item');
      const face = el('span', 'menu-face');
      face.innerHTML = faceSvg(n.look, 18);
      b.append(face, el('span', '', n.name), el('span', 'menu-extra', t(friendshipLabel(relationOf(world, folk.id, n.id)))));
      b.addEventListener('click', () => this.order({ type: 'seated', folkId: folk.id, what: 'call', neighborId: n.id }));
      this.menuEl.append(b);
    }
    this.showMenuAt(x, y);
  }

  /** Menu ao clicar em outra pessoa: conversas em anel, agrupadas por tipo. */
  openSocialMenu(x: number, y: number, other: Folk): void {
    if (other.visit && !other.visit.admitted && !other.visit.leaving) {
      this.openDoorMenu(x, y, other);
      return;
    }
    const folk = this.ctrl.folk;
    const world = this.ctrl.world;
    const catalog = this.ctrl.sim.catalog;
    const rel = relationOf(world, folk.id, other.id);
    const sub = `${other.visit ? `${t('social.visitor')} · ` : ''}${this.relSummary(rel)}`;
    const notes: { text: string; warn?: boolean }[] = [];
    // bloco 14: equipes de perigo e quem caiu só mostram o nome
    const crew = other.visit?.service && ['firefighter', 'police', 'burglar', 'reaper'].includes(other.visit.service.kind);
    if (crew || other.down) {
      this.showRing(x, y, this.ringHead(other.name, notes, other.look, sub), []);
      return;
    }
    // bloco 9: assuntos que o folk conhece do outro
    if ((rel?.friendship ?? 0) >= 30) {
      const favs = favoriteTopics(catalog, other).map((id) => t(`topic.${id}`)).join(', ');
      notes.push({ text: t('topic.favorites', { list: favs }) });
    }
    const items: RingItem[] = [];
    if (!other.visit && other.id !== folk.id) {
      items.push({ label: t('social.control', { name: first(other.name) }), icon: 'mood', run: () => {
        this.ctrl.selectFolk(other.id);
        this.closeMenu();
        this.update();
      } });
    }
    if (folk.away) {
      this.showRing(x, y, this.ringHead(other.name, [...notes, { text: t('social.nothing') }], other.look, sub), items);
      return;
    }
    // bloco 9: roda de conversa
    if (!other.visit?.service) {
      const theirs = circleOfFolk(world, other.id);
      const mine = circleOfFolk(world, folk.id);
      if (theirs && theirs !== mine && theirs.members.length < CIRCLE_MAX) {
        items.push({ label: t('circle.join'), icon: 'social', group: 'talk', run: () => this.order({ type: 'joinCircle', folkId: folk.id, circleId: theirs.id }) });
      } else if (!theirs) {
        const near = world.folks
          .filter((f) => f !== folk && f !== other && onLot(f) && !f.visit?.service && !(f.visit && !f.visit.admitted))
          .sort((a, c) => Math.abs(a.x - other.x) + Math.abs(a.y - other.y) - (Math.abs(c.x - other.x) + Math.abs(c.y - other.y)) || a.id - c.id)
          .slice(0, CIRCLE_MAX - 2);
        const group = [other, ...near];
        items.push({ label: t('circle.start'), icon: 'social', group: 'talk', extra: group.map((f) => first(f.name)).join(', '), run: () => this.order({ type: 'startCircle', folkId: folk.id, otherIds: group.map((f) => f.id) }) });
      }
    }
    // plano 2, bloco 4: chamar para ver junto o que está passando
    const shown = this.ctrl.sim.watchedBy(folk);
    if (shown && !other.visit?.service && other.age !== 'baby' && this.ctrl.sim.watchedBy(other) !== shown) {
      const sd = this.ctrl.sim.defOf(shown);
      items.push({ label: t('act.watchTogether'), icon: 'fun', group: 'friendly', extra: sd ? t(sd.name) : undefined, run: () => this.order({ type: 'watchTogether', folkId: folk.id, otherId: other.id }) });
    }
    // bloco 10: noivos marcam o casamento daqui
    if (!folk.visit && bondOf(world, folk.id, other.id) === 'engaged') {
      items.push({ label: t('soc.wedding'), icon: 'heart', group: 'romantic', extra: '›', why: world.party ? t('problem.partyOn') : undefined, run: () => this.openPartyMenu(x, y, undefined, { partner: other.id, surname: 'host' }) });
    }
    const defs = Object.values(catalog.socials);
    if (defs.some((d) => d.topic && socialAllowed(world, catalog, d, folk, other))) {
      items.push({ label: t('soc.talkTopic'), icon: 'social', group: 'talk', extra: '›', run: () => this.openTopicMenu(x, y, other) });
    }
    for (const cat of SOCIAL_ORDER) {
      for (const def of defs) {
        if (def.category !== cat || def.topic) continue;
        const st = socialState(world, catalog, def, folk, other);
        if (!st.show) continue;
        const item: RingItem = {
          label: t(def.label),
          icon: cat === 'romantic' ? 'heart' : cat === 'mean' ? 'no' : cat === 'professional' ? 'work' : 'social',
          group: cat,
          why: st.why ? t(`ring.why.${st.why}`, { n: st.need ?? 0, name: first(other.name) }) : undefined,
          run: () => this.order({ type: 'queueSocial', folkId: folk.id, otherId: other.id, socialId: def.id }),
        };
        if (!item.why && def.special === 'engage' && !ringOnLot(world, catalog)) item.reluctant = t('problem.noRing');
        items.push(item);
      }
    }
    if (items.length === 0) notes.push({ text: t('social.nothing') });
    this.showRing(x, y, this.ringHead(other.name, notes, other.look, sub), items);
  }

  // ---------- moradores ----------

  /**
   * Plano 2, bloco 2: retratos da família numa coluna à esquerda. Clicar
   * troca o folk; clicar duas vezes leva a câmera até ele. Quem está fora
   * mostra onde está (trabalho, escola, centro).
   */
  private renderHousehold(): void {
    const sim = this.ctrl.sim;
    const world = this.ctrl.world;
    // bloco 11: bebês aparecem na família também
    const residents = sim.household();
    const sel = this.ctrl.folk.id;
    const placeOf = (f: Folk): string => {
      if (f.away) return f.away.school ? t('place.school') : f.job ? t(careerOf(sim.catalog, f.job)?.name ?? 'place.work') : t('place.work');
      if (world.outing) return t('place.downtown');
      if (f.collapsed > 0 || f.queue[0]?.interactionId === 'sleep') return t('place.asleep');
      return '';
    };
    const sig = residents
      .map((f) => {
        const m = moodOf(sim.catalog, f.needs);
        return `${f.id}:${f.id === sel}:${placeOf(f)}:${m >= 62 ? 2 : m >= 40 ? 1 : 0}:${faceState(sim.catalog, f)}`;
      })
      .join('|');
    if (sig === this.householdSig) return;
    this.householdSig = sig;
    this.householdEl.replaceChildren();
    this.householdEl.hidden = residents.length === 0;
    for (const f of residents) {
      const m = moodOf(sim.catalog, f.needs);
      const place = placeOf(f);
      const b = el('button', 'member');
      b.classList.toggle('on', f.id === sel);
      b.classList.toggle('away', !!f.away);
      b.title = `${f.name}${place ? ` · ${place}` : ''}. ${t('member.tip')}`;
      b.setAttribute('aria-label', b.title);
      const face = el('span', `member-face m${m >= 62 ? 2 : m >= 40 ? 1 : 0}`);
      face.innerHTML = faceSvg(f.look, 40, m, faceState(sim.catalog, f));
      b.append(face, el('span', 'member-name', first(f.name)));
      if (place) b.append(el('span', 'member-place', place));
      b.addEventListener('click', () => {
        this.ctrl.selectFolk(f.id);
        this.panelSig = '';
        this.queueSig = '';
        this.update();
      });
      b.addEventListener('dblclick', () => {
        if (!f.away) this.ctrl.focus({ folkId: f.id });
      });
      this.householdEl.append(b);
    }
  }

  /** Mostra uma etiqueta que sobe e some (o que uma conversa mudou). */
  floatChip(x: number, y: number, text: string, tone: 'good' | 'bad' | 'love'): void {
    const k = this.scale();
    const chip = el('div', `float-chip ${tone}`, text);
    chip.style.left = `${Math.round(x / k)}px`;
    chip.style.top = `${Math.round(y / k)}px`;
    this.floatsEl.append(chip);
    while (this.floatsEl.children.length > 8) this.floatsEl.firstElementChild?.remove();
    window.setTimeout(() => chip.remove(), 2600);
  }

  /** Cartão de lista (assuntos, convites, festa, serviços) perto do clique. */
  private showMenuAt(x: number, y: number): void {
    this.ringEl.hidden = true;
    if (this.menuEl.hidden) cue('open');
    this.menuEl.hidden = false;
    this.menuOpen = true;
    const k = this.scale();
    const rect = this.menuEl.getBoundingClientRect();
    const left = Math.min(Math.max(8, x + 14), window.innerWidth - rect.width - 8);
    const top = Math.min(Math.max(8, y - 20), window.innerHeight - rect.height - 8);
    this.menuEl.style.left = `${left / k}px`;
    this.menuEl.style.top = `${top / k}px`;
  }

  // ---------- tamanho da letra ----------

  /** Escala da HUD (letra pequena, média ou grande). */
  private scale(): number {
    return UI_SCALES[this.prefs.scale];
  }

  private applyScale(): void {
    this.root.style.setProperty('zoom', String(this.scale()));
    this.root.dataset.scale = this.prefs.scale;
  }

  // ---------- abas do folk ----------

  private refreshPanel(): void {
    this.panelSig = '';
    this.popSig = '';
    this.update();
  }

  private tabSig(folk: Folk, world: World): string {
    switch (this.tab) {
      case 'needs':
        return `n|${folk.id}`;
      case 'wishes':
        return `w|${folk.id}`;
      case 'feelings':
        return `f|${folk.id}|${JSON.stringify(feelingsOf(world, this.ctrl.sim.catalog, folk).map((f) => [f.id, f.params, f.until === undefined ? 0 : Math.ceil((f.until - world.tick) / 10)]))}`;
      case 'skills':
        return `s|${folk.id}|${Object.entries(folk.skills).map(([k, v]) => `${k}:${Math.floor(v)}`).join(',')}`;
      case 'temper':
        return `t|${folk.id}|${JSON.stringify(folk.temper)}|${folk.traits.join(',')}|${folk.age ?? ''}`;
      case 'inventory':
        return `i|${folk.id}|${(folk.gifts ?? []).join(',')}|${world.household.pantry}|${world.household.takeout}`;
      case 'relations':
        return `r|${folk.id}|${Math.floor(world.tick / 10)}|${world.folks.map((f) => f.id).join(',')}|${world.pendingVisits.length}|${world.news.length}`;
      case 'job':
        return `j|${this.jobTab}|${folk.id}|${folk.age ?? ''}|${folk.alarm}|${JSON.stringify([folk.job, folk.gig && Math.floor(folk.gig.progress / 5), folk.business && Math.floor(folk.business.quality), world.gigBoard, world.household.funds >= 0, folk.kid?.grade && Math.round(folk.kid.grade), folk.kid?.homework])}|${folk.away?.until ?? ''}|${Math.floor(world.tick / 60)}`;
    }
  }

  private renderPanel(): void {
    for (const [id, b] of this.tabButtons) {
      b.classList.toggle('on', this.tab === id);
      b.setAttribute('aria-selected', String(this.tab === id));
    }
    const folk = this.ctrl.folk;
    const world = this.ctrl.world;
    const sig = this.tabSig(folk, world);
    if (sig === this.panelSig) return;
    this.panelSig = sig;
    const title = t(`tab.${this.tab}`);
    if (this.tabTitle.textContent !== title) this.tabTitle.textContent = title;
    const keepScroll = this.tabBody.scrollTop;
    const sameTab = this.tabBody.dataset.tab === `${this.tab}|${folk.id}`;
    this.tabBody.dataset.tab = `${this.tab}|${folk.id}`;
    this.panelEl = this.tabBody;
    this.tabBody.replaceChildren();
    switch (this.tab) {
      case 'needs':
        this.tabBody.append(this.needsEl);
        break;
      case 'wishes':
        this.tabBody.append(this.wishesEl);
        break;
      case 'feelings':
        this.renderFeelings(folk);
        break;
      case 'skills':
        this.renderSkills();
        break;
      case 'temper':
        this.renderTemper(folk);
        break;
      case 'inventory':
        this.renderInventory(folk);
        break;
      case 'relations':
        this.renderRelations();
        break;
      case 'job':
        this.renderJob();
        break;
    }
    if (sameTab) this.tabBody.scrollTop = keepScroll;
  }

  /** Plano 2, bloco 2: sensações em cartões (ícone, o que é, por quê e até quando). */
  private renderFeelings(folk: Folk): void {
    const world = this.ctrl.world;
    const list = feelingsOf(world, this.ctrl.sim.catalog, folk);
    if (!list.length) {
      this.panelEl.append(el('div', 'panel-note', t('feel.none', { name: first(folk.name) })));
      return;
    }
    const box = el('div', 'feel-list');
    for (const f of list) {
      const card = el('div', `feel ${f.tone}`);
      const icon = el('span', 'feel-icon');
      icon.innerHTML = iconSvg(f.icon as IconId, 18);
      const body = el('div', 'feel-body');
      const params = { ...(f.params ?? {}), name: first(folk.name) };
      body.append(el('div', 'feel-name', t(`feel.${f.id}`, params)), el('div', 'feel-why', t(`feel.${f.id}.why`, params)));
      card.append(icon, body);
      if (f.until !== undefined) {
        const left = Math.max(0, f.until - world.tick);
        const text = left >= 1440 ? t('feel.days', { n: Math.ceil(left / 1440) }) : left >= 60 ? t('feel.hours', { n: Math.round(left / 60) }) : t('feel.minutes', { n: left });
        card.append(el('span', 'feel-time', text));
      }
      box.append(card);
    }
    this.panelEl.append(box);
  }

  /** Plano 2, bloco 2: temperamento (cinco eixos), traços com o que querem dizer e o mês. */
  private renderTemper(folk: Folk): void {
    const traits = el('div', 'trait-list');
    for (const id of folk.traits) {
      const row = el('div', 'trait-card');
      row.append(el('div', 'trait-name', t(`trait.${id}`)));
      if (hasText(`traitHint.${id}`)) row.append(el('div', 'trait-hint', t(`traitHint.${id}`)));
      traits.append(row);
    }
    if (!folk.traits.length) traits.append(el('div', 'panel-note', t('temper.noTraits')));
    const temper = el('div', 'temper-list');
    temper.append(el('div', 'panel-sub', t('temper.title')));
    for (const axis of TEMPER_AXES) {
      const row = el('div', 'temper-row');
      row.title = t(`temperHint.${axis}`);
      const pips = el('div', 'pips');
      for (let i = 0; i < 10; i++) pips.append(el('span', i < (folk.temper?.[axis] ?? 5) ? 'pip on' : 'pip'));
      row.append(el('span', '', t(`temper.${axis}`)), pips);
      temper.append(row);
    }
    const month = this.ctrl.sim.catalog.months[folk.month ?? 0];
    if (month) {
      const born = el('div', 'panel-note', t('temper.born', { month: t(month.name) }));
      born.title = t(month.hint);
      temper.append(born);
    }
    this.panelEl.append(el('div', 'panel-sub', t('temper.traits')), traits, temper, el('div', 'panel-note', t('skills.mood')));
  }

  /** Plano 2, bloco 2: o que o folk carrega (presentes) e o que a casa tem guardado. */
  private renderInventory(folk: Folk): void {
    const house = this.ctrl.world.household;
    const gifts = folk.gifts ?? [];
    this.panelEl.append(el('div', 'panel-sub', t('inv.carry', { name: first(folk.name) })));
    if (!gifts.length) this.panelEl.append(el('div', 'panel-note', t('inv.empty')));
    const counts = new Map<string, number>();
    for (const g of gifts) counts.set(g, (counts.get(g) ?? 0) + 1);
    const grid = el('div', 'inv-grid');
    for (const [id, n] of counts) {
      const def = GIFTS[id];
      const cell = el('div', 'inv-item');
      const icon = el('span', 'inv-icon');
      icon.innerHTML = iconSvg('gift', 22);
      cell.append(icon, el('span', 'inv-name', def ? t(def.name) : id));
      if (n > 1) cell.append(el('span', 'inv-n', `×${n}`));
      if (def) cell.title = t('inv.giftTip', { friendship: def.friendship, romance: def.romance });
      grid.append(cell);
    }
    if (counts.size) this.panelEl.append(grid, el('div', 'panel-note', t('inv.giftHint')));
    this.panelEl.append(el('div', 'panel-sub', t('inv.house')));
    const stock = el('div', 'inv-grid');
    const item = (icon: IconId, text: string) => {
      const cell = el('div', 'inv-item');
      const ic = el('span', 'inv-icon');
      ic.innerHTML = iconSvg(icon, 22);
      cell.append(ic, el('span', 'inv-name', text));
      stock.append(cell);
    };
    item('hunger', house.pantry > 0 ? t('state.pantry', { n: house.pantry }) : t('state.pantryEmpty'));
    if (house.takeout > 0) item('hunger', t('state.takeout', { n: house.takeout }));
    this.panelEl.append(stock);
  }

  // ---------- cartões do canto (família, contas, opções, cidade, histórico) ----------

  togglePop(pop: Exclude<Pop, null>): void {
    this.closeMenu();
    this.system.close();
    this.pop = this.pop === pop ? null : pop;
    cue(this.pop ? 'open' : 'close');
    this.popSig = '';
    this.renderPop();
    this.update();
  }

  private renderPop(): void {
    const pop = this.pop;
    if (!pop || this.system.isOpen('saves') || this.system.isOpen('sound')) {
      this.popEl.hidden = true;
      if (!pop) this.popSig = '';
      return;
    }
    const world = this.ctrl.world;
    const sig =
      pop === 'family'
        ? `f|${this.familyTab}|${world.household.album?.length ?? 0}|${world.household.album?.at(-1)?.id ?? 0}|${world.folks.map((f) => `${f.id}${f.age ?? ''}`).join(',')}|${world.departed.length}|${Math.floor(world.tick / 60)}`
        : pop === 'finance'
          ? `m|${world.household.funds}|${unpaidBills(world).length}|${Math.floor(world.tick / 60)}`
          : pop === 'options'
            ? `o|${this.prefs.scale}|${this.prefs.help}|${this.system.muted}`
            : pop === 'city'
              ? `c|${!!world.outing}|${!!world.town}`
              : `h|${this.history.length}|${this.history[0]?.tick ?? 0}`;
    if (sig === this.popSig && !this.popEl.hidden) return;
    this.popSig = sig;
    this.popEl.hidden = false;
    this.popEl.dataset.pop = pop;
    this.popEl.replaceChildren();
    const head = el('div', 'panel-head');
    const close = el('button', 'pill-cancel', '✕');
    close.title = t('hud.close');
    close.setAttribute('aria-label', t('hud.close'));
    close.addEventListener('click', () => this.togglePop(pop));
    head.append(el('div', 'panel-title', t(`pop.${pop}`)), close);
    this.popEl.append(head);
    const body = el('div', 'pop-body');
    this.popEl.append(body);
    this.panelEl = body;
    if (pop === 'family') this.renderFamily();
    else if (pop === 'finance') this.renderFinance();
    else if (pop === 'options') this.renderOptions();
    else if (pop === 'city') this.renderCity();
    else this.renderHistory();
    this.panelEl = this.tabBody;
  }

  /** Plano 2, bloco 2: resumo das contas e dos salários (clique no dinheiro). */
  private renderFinance(): void {
    const world = this.ctrl.world;
    const catalog = this.ctrl.sim.catalog;
    const house = world.household;
    const row = (label: string, value: string, tone = '') => {
      const r = el('div', `fin-row ${tone}`);
      r.append(el('span', '', label), el('span', 'fin-value', value));
      return r;
    };
    this.panelEl.append(row(t('fin.funds'), formatMoney(house.funds), house.funds < 0 ? 'bad' : 'good'));
    const bills = unpaidBills(world);
    this.panelEl.append(el('div', 'panel-sub', t('fin.bills')));
    for (const bill of bills) {
      const day = Math.floor(bill.due / 1440) + 1;
      const late = world.tick > bill.due;
      this.panelEl.append(row(t(late ? 'bill.overdue' : 'bill.due', { day }), formatMoney(bill.power + bill.water + bill.furniture), late ? 'bad' : ''));
    }
    if (!bills.length) this.panelEl.append(el('div', 'panel-note', t('fin.noBills')));
    this.panelEl.append(row(t('fin.next', { when: whenText(house.nextBills) }), `≈ ${formatMoney(billAmount(world, catalog))}`));
    if (house.lastBill) this.panelEl.append(row(t('fin.last'), formatMoney(house.lastBill)));
    this.panelEl.append(el('div', 'panel-sub', t('fin.income')));
    let any = false;
    for (const f of this.ctrl.sim.household()) {
      if (f.job) {
        const level = levelOfJob(catalog, f.job);
        const career = careerOf(catalog, f.job);
        if (level && career) {
          any = true;
          const r = row(`${first(f.name)} · ${t(level.title)}`, t('fin.perShift', { pay: formatMoney(payFor(catalog, f.job)) }));
          r.title = `${t(career.name)} · ${scheduleText(level)}`;
          this.panelEl.append(r);
        }
      }
      if (f.pension) {
        any = true;
        this.panelEl.append(row(`${first(f.name)} · ${t('fin.pension')}`, t('fin.perDay', { pay: formatMoney(f.pension) })));
      }
      if (f.business) {
        any = true;
        this.panelEl.append(row(`${first(f.name)} · ${t('job.tab.business')}`, t('fin.business')));
      }
      if (f.gig) {
        any = true;
        this.panelEl.append(row(`${first(f.name)} · ${t('job.tab.gigs')}`, `${Math.floor(f.gig.progress)}%`));
      }
    }
    if (!any) this.panelEl.append(el('div', 'panel-note', t('fin.noIncome')));
    const hire = (on: boolean, key: string, fee: number) => on && this.panelEl.append(row(t(key), t('fin.perDay', { pay: formatMoney(fee) }), 'bad'));
    if (house.maid || house.gardener) this.panelEl.append(el('div', 'panel-sub', t('fin.services')));
    hire(!!house.maid, 'services.maidOn', MAID.fee);
    hire(!!house.gardener, 'services.gardenerOn', GARDENER.fee);
    const job = el('button', 'btn btn-small', t('fin.openJob'));
    job.addEventListener('click', () => {
      this.togglePop('finance');
      this.openTab('job');
    });
    this.panelEl.append(job);
  }

  /** Plano 2, bloco 2: opções (jogos salvos, som, letra, dicas, jogo novo). */
  private renderOptions(): void {
    const grid = el('div', 'opt-grid');
    const save = el('button', 'btn', t('hud.save'));
    save.title = t('hud.saveTip');
    save.addEventListener('click', () => void this.ctrl.save());
    const games = el('button', 'btn', t('hud.games'));
    games.title = t('hud.gamesTip');
    games.addEventListener('click', () => {
      this.pop = null;
      this.system.toggle('saves');
      this.renderPop();
      this.update();
    });
    const sound = el('button', 'btn', this.system.muted ? `♪̸ ${t('opt.sound')}` : `♪ ${t('opt.sound')}`);
    sound.title = t(this.system.muted ? 'hud.soundMuted' : 'hud.sound');
    sound.addEventListener('click', () => {
      this.pop = null;
      this.system.toggle('sound');
      this.renderPop();
      this.update();
    });
    const fresh = el('button', 'btn btn-quiet', t('hud.new'));
    // bloco 5: jogo novo abre a tela de criar família (que tem o atalho da família pronta)
    fresh.addEventListener('click', () => {
      this.togglePop('options');
      if (this.openCreator) this.openCreator();
      else this.ctrl.newGame();
    });
    grid.append(save, games, sound, fresh);
    this.panelEl.append(grid, el('div', 'panel-sub', t('opt.scale')));
    const scales = el('div', 'catalog-tabs');
    for (const s of ['s', 'm', 'l'] as UiScale[]) {
      const b = el('button', 'tab', t(`opt.scale.${s}`));
      b.classList.toggle('on', this.prefs.scale === s);
      b.addEventListener('click', () => {
        this.prefs.scale = s;
        saveUiPrefs(this.prefs);
        this.applyScale();
        this.popSig = '';
        this.renderPop();
      });
      scales.append(b);
    }
    const help = el('button', 'btn btn-small', t(this.helpEl.hidden ? 'opt.helpShow' : 'opt.helpHide'));
    help.addEventListener('click', () => {
      this.toggleHelp();
      this.popSig = '';
      this.renderPop();
    });
    this.panelEl.append(scales, el('div', 'panel-sub', t('opt.keys')), help);
  }

  /** Plano 2, bloco 2: cidade (o bairro e o táxi para o centro); no bloco 12 vira o mapa. */
  private renderCity(): void {
    const world = this.ctrl.world;
    const list = el('div', 'opt-grid one');
    if (world.outing) {
      const home = el('button', 'btn btn-hot', t('hud.goHome'));
      home.title = t('hud.goHomeTip');
      home.addEventListener('click', () => {
        this.togglePop('city');
        this.ctrl.outingCommand({ type: 'goHome' });
      });
      list.append(home);
    } else {
      const go = el('button', 'btn', t('hud.downtown'));
      go.title = t('hud.downtownTip');
      go.addEventListener('click', () => {
        this.togglePop('city');
        const r = this.modeButtons.get('city')!.getBoundingClientRect();
        this.openOutingMenu(r.left, r.top - 380);
      });
      list.append(go);
      if (world.town) {
        const town = el('button', 'btn', t('hud.town'));
        town.title = t('hud.townTip');
        town.addEventListener('click', () => {
          this.togglePop('city');
          this.ctrl.openTown();
        });
        list.append(town);
      }
    }
    this.panelEl.append(list, el('div', 'panel-note', t(world.outing ? 'city.outingNote' : 'city.note')));
  }

  /** Plano 2, bloco 2: os avisos que já passaram, do mais novo ao mais velho. */
  private renderHistory(): void {
    if (!this.history.length) {
      this.panelEl.append(el('div', 'panel-note', t('notice.none')));
      return;
    }
    const box = el('div', 'history');
    for (const entry of this.history) box.append(this.noticeCard(entry, 'notice old'));
    this.panelEl.append(box);
  }

  // ---------- bloco 17: árvore e álbum ----------

  private renderFamily(): void {
    const tabs = el('div', 'catalog-tabs job-tabs');
    for (const id of ['tree', 'album'] as FamilyTab[]) {
      const b = el('button', 'tab', t(`family.tab.${id}`));
      b.classList.toggle('on', this.familyTab === id);
      b.addEventListener('click', () => {
        this.familyTab = id;
        this.popSig = '';
        this.renderPop();
      });
      tabs.append(b);
    }
    this.panelEl.append(tabs);
    if (this.familyTab === 'tree') this.renderTree();
    else this.renderAlbum();
  }

  /** Gerações de cima para baixo; casal lado a lado; quem se foi em sépia. */
  private renderTree(): void {
    const world = this.ctrl.world;
    const rows = familyTree(world);
    const box = el('div', 'tree');
    rows.forEach((row, i) => {
      const line = el('div', 'tree-row');
      line.append(el('div', 'tree-gen', t('tree.gen', { n: i + 1 })));
      const people = el('div', 'tree-people');
      row.people.forEach((p, j) => {
        const prev = row.people[j - 1];
        if (prev && prev.spouse === p.id) people.append(el('span', 'tree-tie', '♥'));
        const card = el('div', `tree-person${p.gone ? ' gone' : ''}${p.home ? ' home' : ''}`);
        const face = el('span', 'tree-face');
        face.innerHTML = faceSvg(p.stage === 'elder' ? { ...p.look, hair: 4 } : p.look, 30);
        card.append(face, el('div', 'tree-name', p.name.split(' ')[0]), el('div', 'tree-stage', p.gone ? t('tree.gone') : t(`age.${p.stage}`)));
        card.title = p.name;
        people.append(card);
      });
      line.append(people);
      box.append(line);
    });
    if (rows.length === 0) box.append(el('div', 'panel-note', t('tree.empty')));
    this.panelEl.append(box, el('div', 'panel-note', t('tree.note')));
  }

  /** Álbum: tirar foto da vista de agora, e as páginas (fotos e marcos) da mais nova para a mais velha. */
  private renderAlbum(): void {
    const world = this.ctrl.world;
    const bar = el('div', 'album-bar');
    const caption = el('input', 'album-caption') as HTMLInputElement;
    caption.maxLength = 60;
    caption.placeholder = t('album.caption');
    caption.value = this.photoCaption;
    caption.addEventListener('input', () => (this.photoCaption = caption.value));
    const snap = el('button', 'btn btn-small btn-go', t('album.snap'));
    snap.addEventListener('click', () => {
      const photo = this.ctrl.photographer?.();
      if (!photo) return;
      const who = world.folks.filter((f) => !f.visit && !f.away).map((f) => f.id);
      if (this.ctrl.commandOrExplain({ type: 'takePhoto', photo, caption: this.photoCaption, who })) {
        this.photoCaption = '';
        this.ctrl.toast(t('album.taken'));
      }
      this.refreshPanel();
    });
    bar.append(caption, snap);
    this.panelEl.append(bar);
    const pages = [...(world.household.album ?? [])].reverse();
    if (pages.length === 0) {
      this.panelEl.append(el('div', 'panel-note', t('album.empty')));
      return;
    }
    const grid = el('div', 'album');
    for (const page of pages) {
      const card = el('div', `album-page album-${page.kind}`);
      if (page.photo) {
        const img = el('img', 'album-photo') as HTMLImageElement;
        img.src = page.photo;
        img.alt = page.caption ?? t('album.photo');
        card.append(img);
      } else {
        card.append(el('div', 'album-mark', ALBUM_MARKS[page.kind] ?? '★'));
      }
      const params: Record<string, string | number> = { name: page.names[0] ?? '', other: page.names[1] ?? '', ...page.params };
      for (const [k, v] of Object.entries(params)) if (typeof v === 'string' && hasText(v)) params[k] = t(v);
      const title = page.kind === 'photo' ? (page.caption ?? (page.names.map((n) => n.split(' ')[0]).join(', ') || t('album.photo'))) : t(`album.${page.kind}`, params);
      card.append(el('div', 'album-title', title), el('div', 'album-when', t('album.when', { day: clockOf(page.tick).day })));
      if (page.kind === 'photo') {
        const drop = this.confirmButton('✕', t('album.drop'), () => {
          this.ctrl.commandOrExplain({ type: 'dropPhoto', entryId: page.id });
          this.refreshPanel();
        });
        drop.classList.add('album-drop');
        card.append(drop);
      }
      grid.append(card);
    }
    this.panelEl.append(grid);
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
    // bloco 8: amigos da família (contam para as promoções)
    const ff = el('div', 'panel-note family-friends', t('rel.familyFriends', { n: familyFriends(world).length }));
    ff.title = t('rel.familyFriendsTip');
    this.panelEl.append(ff);
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
      if (mine.friendship >= FRIEND_AT) tags[0] = `★ ${tags[0]}`;
      if (world.tick - mine.last >= 1440 && mine.friendship > 0 && !p.where.startsWith('rel.home')) tags.push(t('rel.cooling'));
      const rom = romanceLabel(mine);
      if (rom) tags.push(t(rom));
      const res = respectLabel(mine);
      if (res) tags.push(t(res));
      const tagLine = el('div', 'rel-tags', tags.join(' · '));
      row.append(tagLine);
      if (theirs) row.append(el('div', 'rel-theirs', t('rel.theyFeel', { name: first(p.name), label: this.relSummary(theirs) })));
      // bloco 9: com amizade, dá para saber do que a pessoa gosta de falar
      const person = sim.findFolk(p.id) ?? world.neighbors.find((n) => n.id === p.id);
      if (person && mine.friendship >= 30) {
        row.append(el('div', 'rel-theirs', t('topic.favorites', { list: favoriteTopics(sim.catalog, person).map((id) => t(`topic.${id}`)).join(', ') })));
      }
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
    // bloco 9: do que o folk gosta de falar e as panelinhas do bairro
    const catalog9 = this.ctrl.sim.catalog;
    const favs = favoriteTopics(catalog9, folk).map((id) => t(`topic.${id}`)).join(', ');
    const hates = hatedTopics(catalog9, folk).map((id) => t(`topic.${id}`)).join(', ');
    this.panelEl.append(el('div', 'panel-sub', t('topic.title')));
    this.panelEl.append(el('div', 'panel-note', `${t('topic.favorites', { list: favs })}${hates ? ` · ${t('topic.hates', { list: hates })}` : ''}`));
    const cliques = findCliques(world);
    this.panelEl.append(el('div', 'panel-sub', t('clique.title')));
    if (!cliques.length) this.panelEl.append(el('div', 'panel-note', t('clique.none')));
    const name = (id: number) => first(this.nameOf(id));
    for (const c of cliques) {
      const rivals = c.members.flatMap((a) => cliques.flatMap((o) => (o === c ? [] : o.members.filter((b) => areRivals(world, a, b)))));
      const line = el('div', 'news pos clique');
      line.append(el('span', 'rel-mem-day', t('clique.of', { name: name(c.leader) })), el('span', '', c.members.map(name).join(', ')));
      if (rivals.length) line.append(el('span', 'clique-rivals', ` ⚡ ${[...new Set(rivals)].map(name).join(', ')}`));
      this.panelEl.append(line);
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

  // ---------- bloco 14: barganha e casa vazia ----------

  /** Cartão do par ou ímpar: aparece quando o Seu Sereno abre o livro. */
  private renderBargain(): void {
    const world = this.ctrl.world;
    const p = world.passings?.[0];
    const body = p && this.ctrl.sim.findFolk(p.folkId);
    if (!p || p.stage !== 'waiting' || !body) {
      this.bargainEl.hidden = true;
      this.bargainSig = '';
      return;
    }
    const by = this.ctrl.sim.bargainerFor(body);
    const sig = `${p.folkId}|${p.deadline}|${by?.id ?? 0}`;
    if (sig === this.bargainSig) return;
    this.bargainSig = sig;
    this.bargainEl.replaceChildren();
    const head = el('div', 'wev-head');
    const face = el('span', 'wev-face');
    face.innerHTML = faceSvg(body.look, 40, 10);
    // bloco 17: de velhice não tem par ou ímpar, só a despedida
    if (p.cause === 'age') {
      head.append(face, el('div', 'wev-title', t('farewell.title', { name: body.name })));
      this.bargainEl.append(head, el('div', 'wev-text', t('farewell.text', { name: body.name })));
      this.bargainEl.hidden = false;
      return;
    }
    head.append(face, el('div', 'wev-title', t('bargain.title', { name: body.name })));
    this.bargainEl.append(head, el('div', 'wev-text', t('bargain.text')));
    this.bargainEl.append(el('div', 'panel-note', by ? t('bargain.who', { name: by.name }) : t('bargain.nobody')));
    const choices = el('div', 'wev-choices');
    const pick = (choice: 'even' | 'odd' | null) => {
      this.ctrl.chooseBargain(choice);
      this.update();
    };
    if (by) {
      for (const c of ['even', 'odd'] as const) {
        const b = el('button', 'btn wev-choice', t(`bargain.${c}`));
        b.addEventListener('click', () => pick(c));
        choices.append(b);
      }
    }
    const go = el('button', 'btn btn-quiet wev-choice', t('bargain.letGo'));
    go.addEventListener('click', () => pick(null));
    choices.append(go);
    this.bargainEl.append(choices, el('div', 'panel-note', t('bargain.left', { time: formatClock(p.deadline) })));
    this.bargainEl.hidden = false;
  }

  /** Casa vazia: um aviso por cima de tudo com família nova e jogos salvos. Devolve true se está aberto. */
  private renderOver(): boolean {
    const empty = this.ctrl.houseEmpty;
    const creatorOpen = !!document.querySelector('.creator:not([hidden])');
    // bloco 15: com o bairro aberto o aviso some (dá para escolher outra família lá)
    const show = empty && !creatorOpen && this.ctrl.screen !== 'town';
    if (show === this.overShown) return empty;
    this.overShown = show;
    this.overEl.hidden = !show;
    if (!show) return empty;
    this.closeMenu();
    const card = el('div', 'card over-card');
    card.append(el('div', 'over-title', t('over.title')), el('div', 'over-text', t('over.text')));
    const row = el('div', 'over-buttons');
    const fam = el('button', 'btn btn-go', t('over.family'));
    fam.addEventListener('click', () => this.openCreator?.());
    const load = el('button', 'btn', t('over.load'));
    load.addEventListener('click', () => this.system.toggle('saves'));
    row.append(load, fam);
    if (this.ctrl.world.town) {
      const town = el('button', 'btn btn-go', t('over.town'));
      town.addEventListener('click', () => this.ctrl.openTown());
      row.append(town);
    }
    card.append(row);
    this.overEl.replaceChildren(card);
    return empty;
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
    this.panelEl.append(list, el('div', 'panel-note', t('skills.hint')));
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
    // bloco 11: criança não trabalha; vai à escola
    const folk = this.ctrl.folk;
    if (folk.age === 'baby' || folk.age === 'child') {
      this.renderSchool(folk);
      return;
    }
    // bloco 17: jovem estuda e pode pegar meio período; idoso é aposentado
    if (folk.age === 'teen') {
      this.renderSchool(folk);
      this.panelEl.append(el('div', 'panel-sub', t('life.partTimeHead')), el('div', 'panel-note', t('life.partTimeNote')));
      this.renderEmployment();
      return;
    }
    if (folk.age === 'elder') {
      const box = el('div', 'job-box');
      const was = folk.retired?.careerId ? this.ctrl.sim.catalog.careers[folk.retired.careerId] : undefined;
      box.append(
        el('div', 'job-title', t('life.retiredTitle')),
        el('div', 'job-career', was ? t('life.retiredFrom', { job: t(was.levels[folk.retired!.level]?.title ?? ''), career: t(was.name) }) : t('life.retiredNone')),
        el('div', 'job-line', t('life.pension', { pay: formatMoney(folk.pension ?? 0) })),
      );
      this.panelEl.append(box);
      if (this.jobTab === 'job') this.jobTab = 'gigs';
      tabs.querySelector('.tab')?.remove();
      tabs.querySelectorAll('.tab').forEach((b, i) => b.classList.toggle('on', ['gigs', 'business'][i] === this.jobTab));
      this.panelEl.append(tabs);
      if (this.jobTab === 'gigs') this.renderGigs();
      else this.renderBusiness();
      return;
    }
    this.panelEl.append(tabs);
    if (this.jobTab === 'gigs') this.renderGigs();
    else if (this.jobTab === 'business') this.renderBusiness();
    else this.renderEmployment();
  }

  /** Bloco 11: o painel de trabalho da criança é a escola (e do bebê, nada). */
  private renderSchool(folk: Folk): void {
    const box = el('div', 'job-box');
    const kid = folk.kid;
    if ((folk.age === 'child' || folk.age === 'teen') && kid) {
      const band = t(`grade.band.${gradeBand(kid.grade)}`);
      box.append(
        el('div', 'job-title', t('hud.school')),
        el('div', 'job-career', t('kid.grade', { grade: gradeText(kid.grade), band })),
        el('div', 'job-line', t('kid.school')),
        el('div', 'job-line', t(`kid.homework.${kid.homework}`)),
        el('div', 'job-line', t('kid.gradeTip')),
      );
      const perf = el('div', 'perf');
      const track = el('div', 'perf-track');
      const fill = el('div', 'perf-fill');
      fill.style.width = `${Math.round(kid.grade)}%`;
      fill.style.left = '0';
      fill.classList.toggle('neg', kid.grade < 25);
      track.append(fill);
      perf.append(track);
      box.append(perf);
    } else if (kid) {
      box.append(el('div', 'job-title', t('age.baby')), el('div', 'job-line', t('kid.baby', { when: whenText(kid.grows) })));
    }
    this.panelEl.append(box);
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
    const level = job ? levelOfJob(catalog, job) : undefined;
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
      // bloco 8: a carona (muda com o cargo) e se ela está esperando agora
      const vehicle = vehicleOf(catalog, job);
      if (vehicle) box.append(el('div', 'job-line', t('job.ride', { ride: t(`ride.${vehicle.kind}`) })));
      const ride = rideFor(catalog, folk, world.tick);
      if (ride) box.append(el('div', 'job-line strong', t('job.rideWaiting', { time: formatClock(ride.leaves) })));
      const prize = Object.values(catalog.objects).find((o) => o.reward?.career === career.id);
      if (prize?.reward && job.level < prize.reward.level && !job.partTime) {
        box.append(el('div', 'panel-note', t('job.reward', { title: t(career.levels[prize.reward.level].title), object: t(prize.name) })));
      }
      // bloco 6: despertador na cama, antes do turno
      const alarm = el('label', 'autonomy alarm');
      const input = el('input');
      input.type = 'checkbox';
      input.checked = folk.alarm;
      input.addEventListener('change', () => {
        this.ctrl.commandOrExplain({ type: 'setAlarm', folkId: folk.id, on: input.checked });
        this.panelSig = '';
      });
      const wake = wakeTime(catalog, folk, world.tick) ?? (() => {
        const shift = nextShift(catalog, folk, world.tick);
        return shift ? shift.start - ALARM_LEAD : null;
      })();
      const alarmText = folk.alarm && wake !== null ? t('job.alarmAt', { time: formatClock(wake) }) : t('job.alarm');
      alarm.title = t('job.alarmTip');
      alarm.append(input, el('span', 'switch'), el('span', '', alarmText));
      box.append(alarm);

      const next = job.partTime ? undefined : career.levels[job.level + 1];
      if (next) {
        box.append(el('div', 'job-line', t('job.next', { title: t(next.title), pay: formatMoney(next.pay) })));
        const missing = missingSkills(folk, next);
        const req = el('div', 'job-reqs');
        for (const [id, need] of Object.entries(next.requires)) {
          const have = skillLevel(folk, id);
          req.append(el('span', `req ${id in missing ? 'miss' : 'ok'}`, `${t(`skill.${id}`)} ${have}/${need}`));
        }
        // bloco 8: amigos da família
        const friendsShort = missingFriends(world, next);
        if (next.friends > 0) {
          const chip = el('span', `req ${friendsShort > 0 ? 'miss' : 'ok'}`, t('job.friendsReq', { have: familyFriends(world).length, need: next.friends }));
          chip.title = t('rel.familyFriendsTip');
          req.append(chip);
        }
        if (Object.keys(next.requires).length || next.friends > 0) box.append(req);
        const boss = bossOf(world, job.careerId);
        if (Object.keys(missing).length === 0 && friendsShort > 0) {
          box.append(el('div', 'panel-note', t('job.needFriends', { n: friendsShort })));
        } else if (boss && bossBlocks(world, folk, job.level + 1) > 0) {
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
    // bloco 8: com dez carreiras, o jornal traz só algumas vagas por dia
    const ads = el('div', 'ads');
    this.panelEl.append(el('div', 'panel-note', t('job.adsToday')));
    for (const c of adsOfDay(catalog, Math.floor(world.tick / 1440), job?.careerId)) ads.append(this.adFor(c, folk));
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
    // bloco 17: o jovem só pega o meio período (o primeiro cargo, à tarde)
    const teen = folk.age === 'teen';
    const level = teen ? 0 : transferLevel(folk, folk.job, career);
    const entry = teen ? levelOfJob(this.ctrl.sim.catalog, { ...newJob(career.id), partTime: true })! : career.levels[level];
    const ad = el('div', 'ad');
    const text = el('div', 'ad-text');
    text.append(
      el('div', 'ad-title', `${t(entry.title)} · ${t(career.name)}`),
      el('div', 'ad-line', `${t('job.payShift', { pay: formatMoney(entry.pay) })} · ${scheduleText(entry)}`),
      el('div', 'ad-line', t('job.skillsUsed', { skills: career.skills.map((s) => t(`skill.${s}`)).join(', ') })),
    );
    if (level > 0) text.append(el('div', 'ad-line strong', t('job.transfer', { title: t(entry.title) })));
    if (teen) text.append(el('div', 'ad-line strong', t('life.partTimeAd')));
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
    const roof = c.world.grid.roof;
    const sig = `${this.buildTab}|${c.buildTool}|${c.floorId}|${c.coveringId}|${depth}|${funds}|${c.viewLevel}|${c.stairDir}|${roof?.style}|${roof?.color}|${roof?.pitch}|${roof?.flat?.length}`;
    if (sig === this.buildSig) return;
    this.buildSig = sig;
    for (const b of this.buildTabs.children) {
      (b as HTMLElement).classList.toggle('on', (b as HTMLElement).dataset.tab === this.buildTab);
    }
    this.undoButton.textContent = depth > 0 ? t('build.undoN', { n: depth }) : t('build.undo');
    this.undoButton.disabled = depth === 0;
    this.buildHint.textContent =
      c.buildTool === 'gate'
        ? t('build.hint.gate')
        : isOpeningTool(c.buildTool)
          ? t(c.buildTool.startsWith('window') ? 'build.hint.window' : 'build.hint.door')
          : c.buildTool === 'yard'
            ? t(`build.hint.yard.${c.floorId}`)
            : t(`build.hint.${c.buildTool}`, { dir: t(`build.dir.${c.stairDir}`) });
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
      add(t('build.half'), t('build.perMeter', { price: formatMoney(catalog.parts.half.price) }), sw('wallPlaster', true), c.buildTool === 'half', tool('half'));
      add(t('build.column'), formatMoney(catalog.parts.column.price), sw('wallPlaster', true), c.buildTool === 'column', tool('column'), t('build.hint.column'));
      add(t('build.stairs'), formatMoney(catalog.parts.stairs.price), sw('walnut'), c.buildTool === 'stairs', tool('stairs'), t('build.stairsTip'));
      add(t('build.erase'), t('build.free'), null, c.buildTool === 'erase', tool('erase'), t('build.hint.erase'));
    } else if (this.buildTab === 'openings') {
      for (const kind of OPENING_TOOLS) {
        const part = catalog.parts[kind];
        const amb = part.ambience ? ` · ${t('need.ambience')} +${part.ambience}` : '';
        add(t(`build.${kind}`), formatMoney(part.price), sw(OPENING_SWATCH[kind], true), c.buildTool === kind, tool(kind), `${t(`build.${kind}`)} · ${formatMoney(part.price)}${amb}`);
      }
    } else if (this.buildTab === 'roof') {
      // bloco 12: estilo e cor do telhado (vale para a casa inteira)
      // plano 2, bloco 3: uma água, inclinação e laje por trecho
      const area = roofArea(c.world.grid, catalog);
      const price = area * catalog.parts.roof.price;
      const cost = price > 0 ? formatMoney(price) : t('build.free');
      const cur = { style: 'hip' as RoofStyle, color: 'terracotta', pitch: 'mid' as RoofPitch, ...roof };
      const set = (style: RoofStyle, color: string, pitch: RoofPitch) => () => {
        if (c.buildTool !== 'roof') c.setBuildTool('roof');
        c.commandOrExplain({ type: 'setRoof', style, color, pitch });
      };
      // desenho de cada opção: a casa de frente, com a cor do telhado escolhida
      const tile = `#${(ROOF_COLORS[cur.color] ?? ROOF_COLORS.terracotta).toString(16).padStart(6, '0')}`;
      const glyphItem = (name: string, on: boolean, shape: string, pick: () => void, tip: string) => {
        const item = el('button', 'item');
        item.classList.toggle('on', on);
        const glyph = el('span', 'item-img item-glyph pitch-glyph');
        glyph.innerHTML = `<svg viewBox="0 0 48 40" width="48" height="40" aria-hidden="true"><rect x="9" y="22" width="30" height="16" fill="#c8735a" stroke="currentColor" stroke-width="2"/><path d="${shape}" fill="${tile}" stroke="currentColor" stroke-width="2.4" stroke-linejoin="round"/></svg>`;
        item.append(glyph, el('span', 'item-name', name), el('span', 'item-price', cost));
        item.title = tip;
        item.addEventListener('click', () => {
          pick();
          this.renderBuild();
        });
        this.buildItems.append(item);
      };
      const STYLE_SHAPE: Record<RoofStyle, string> = {
        hip: 'M4 23L16 8H32L44 23z',
        gable: 'M4 23L24 5L44 23z',
        shed: 'M4 23L44 9V23z',
      };
      for (const style of ['hip', 'gable', 'shed'] as RoofStyle[]) {
        glyphItem(t(`build.roof.${style}`), c.buildTool === 'roof' && cur.style === style, STYLE_SHAPE[style], set(style, cur.color, cur.pitch), t(`build.roof.${style}Tip`));
      }
      for (const pitch of ['low', 'mid', 'steep'] as RoofPitch[]) {
        const peak = pitch === 'low' ? 14 : pitch === 'mid' ? 8 : 2;
        glyphItem(t(`build.pitch.${pitch}`), c.buildTool === 'roof' && cur.pitch === pitch, `M4 23L24 ${peak}L44 23z`, set(cur.style, cur.color, pitch), t(`build.pitch.${pitch}`));
      }
      for (const color of Object.keys(ROOF_COLORS)) {
        const item = el('button', 'item');
        item.classList.toggle('on', cur.color === color);
        const chip = el('span', 'item-img item-glyph');
        chip.style.background = `#${ROOF_COLORS[color].toString(16).padStart(6, '0')}`;
        item.append(chip, el('span', 'item-name', t(`build.roofColor.${color}`)), el('span', 'item-price', cost));
        item.title = t(`build.roofColor.${color}`);
        item.addEventListener('click', () => {
          set(cur.style, color, cur.pitch)();
          this.renderBuild();
        });
        this.buildItems.append(item);
      }
      add(t('build.slab'), t('build.perTile', { price: formatMoney(catalog.parts.slab.price) }), sw('wallPlaster'), c.buildTool === 'slab', tool('slab'), t('build.hint.slab'));
      add(t('build.unslab'), t('build.free'), sw('roof'), c.buildTool === 'unslab', tool('unslab'), t('build.hint.unslab'));
    } else if (this.buildTab === 'yard') {
      // bloco 13: cerca, mureta, portão, piscina, caminho e deck (só no térreo)
      add(t('build.fence'), t('build.perMeter', { price: formatMoney(catalog.parts.fence.price) }), sw('picket'), c.buildTool === 'fence', tool('fence'), t('build.hint.fence'));
      add(t('build.lowwall'), t('build.perMeter', { price: formatMoney(catalog.parts.lowwall.price) }), sw('wallExterior', true), c.buildTool === 'lowwall', tool('lowwall'), t('build.hint.lowwall'));
      add(t('build.gate'), formatMoney(catalog.parts.gate.price), sw('picket'), c.buildTool === 'gate', tool('gate'), t('build.hint.gate'));
      const yardFloors = Object.values(catalog.floors).filter((f) => f.yard || f.id === 'grass');
      for (const f of yardFloors.sort((a, b) => a.price - b.price)) {
        const price = f.price > 0 ? t('build.perTile', { price: formatMoney(f.price) }) : t('build.free');
        const tex = f.id === 'grass' ? 'grass' : f.id === 'pool' ? 'water' : f.id;
        add(t(f.id === 'grass' ? 'build.fill' : f.name), price, sw(tex), c.buildTool === 'yard' && c.floorId === f.id, () => {
          c.floorId = f.id;
          c.setBuildTool('yard');
        }, t(`build.hint.yard.${f.id}`));
      }
    } else if (this.buildTab === 'floors') {
      for (const f of Object.values(catalog.floors).sort((a, b) => a.price - b.price)) {
        // bloco 12: o vão não aparece; no andar de cima, a grama vira "sem piso"
        // bloco 13: piscina, caminho e deck ficam na aba Quintal
        if (f.void || f.yard) continue;
        const bare = f.outdoor && c.viewLevel > 0;
        const tex = f.outdoor ? 'grass' : FLOOR_ART.includes(f.id) ? f.id : 'wood';
        const price = f.price > 0 ? t('build.perTile', { price: formatMoney(f.price) }) : t('build.free');
        add(bare ? t('floor.void') : t(f.name), price, bare ? null : sw(tex), c.buildTool === 'floor' && c.floorId === f.id, () => {
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
    // bloco 4: faixa de preço e desfazer
    for (const tier of TIERS) {
      const b = el('button', 'tab', tier === 'all' ? t('tier.all') : `${'⟡'.repeat(tier + 1)} ${t(`tier.${tier}`)}`);
      b.dataset.tier = String(tier);
      b.addEventListener('click', () => {
        this.tierFilter = tier;
        this.catalogSig = '';
        this.renderCatalog();
      });
      this.catalogTiers.append(b);
    }
    this.buyUndoButton.title = t('buy.undoTip');
    this.buyUndoButton.addEventListener('click', () => {
      this.ctrl.undoBuy();
      this.update();
    });
    head.append(this.catalogTiers, this.buyUndoButton);
    const foot = el('div', 'catalog-foot');
    foot.append(this.catalogHint, this.colorRow);
    this.catalogEl.append(head, this.catalogItems, foot);
    this.catalogEl.hidden = true;
    this.root.append(this.catalogEl, this.styleEditor.el);
  }

  private renderCatalog(): void {
    const buying = this.ctrl.mode === 'buy';
    this.catalogEl.hidden = !buying;
    if (!buying) return;
    const funds = this.ctrl.world.household.funds;
    const placing = this.ctrl.placing;
    const depth = this.ctrl.sim.buyUndoDepth;
    const sig = `${(this.ctrl.world.household.unlocked ?? []).length}|${this.category}|${this.tierFilter}|${funds}|${placing?.defId ?? ''}|${placing?.moveId ?? ''}|${placing?.color ?? ''}|${depth}|${JSON.stringify(placing?.style ?? null)}|${JSON.stringify(placing?.parts ?? null)}`;
    if (sig === this.catalogSig) return;
    this.catalogSig = sig;
    for (const b of this.catalogTabs.children) {
      (b as HTMLElement).classList.toggle('on', (b as HTMLElement).dataset.cat === this.category);
    }
    for (const b of this.catalogTiers.children) {
      (b as HTMLElement).classList.toggle('on', (b as HTMLElement).dataset.tier === String(this.tierFilter));
    }
    this.buyUndoButton.textContent = depth > 0 ? t('buy.undoN', { n: depth }) : t('buy.undo');
    this.buyUndoButton.disabled = depth === 0;
    this.catalogHint.textContent = placing ? t('buy.place') : '';
    this.catalogHint.hidden = !placing;
    this.renderColors();
    this.catalogItems.replaceChildren();
    const defs = Object.values(this.ctrl.sim.catalog.objects)
      .filter(
        (d) =>
          d.buyable !== false &&
          (this.category === 'all' || d.category === this.category) &&
          (this.tierFilter === 'all' || tierOf(d) === this.tierFilter),
      )
      .sort((a, b) => a.price - b.price);
    for (const def of defs) this.catalogItems.append(this.catalogItem(def, funds));
  }

  /**
   * Plano 2, bloco 8: em vez das amostras de cor do bloco 4, o botão que abre
   * o editor de peças e estilo, o preço com o estilo e a dica de girar/subir.
   */
  private renderColors(): void {
    const placing = this.ctrl.placing;
    const def = placing && placing.moveId === undefined ? this.ctrl.sim.catalog.objects[placing.defId] : undefined;
    this.colorRow.replaceChildren();
    this.colorRow.hidden = !def;
    if (!def || !placing) return;
    const custom = el('button', 'chip go', `✎ ${t('buy.customize')}`);
    custom.addEventListener('click', () => this.styleEditor.editPlacing());
    this.colorRow.append(custom, el('span', 'color-label', formatMoney(this.ctrl.placingPrice())));
    if (def.layer === 'wall') this.colorRow.append(el('span', 'color-label', t('buy.lift')));
    if (def.turns8) this.colorRow.append(el('span', 'color-label', t('buy.turn8')));
  }

  private catalogItem(def: ObjectDef, funds: number): HTMLElement {
    const item = el('button', 'item');
    const affordable = funds >= def.price;
    // bloco 8: recompensa de carreira ainda trancada
    const catalog = this.ctrl.sim.catalog;
    const locked = !!def.reward && !(this.ctrl.world.household.unlocked ?? []).includes(def.id);
    item.classList.toggle('poor', !affordable || locked);
    item.classList.toggle('locked', locked);
    item.classList.toggle('on', this.ctrl.placing?.defId === def.id && this.ctrl.placing.moveId === undefined);
    const img = el('img', 'item-img');
    img.alt = '';
    img.width = 64;
    img.height = 64;
    if (this.thumbnail) img.src = this.thumbnail(def.art);
    const trains = [...new Set(def.interactions.filter((i) => i.skill).map((i) => t(`skill.${i.skill!.id}`)))];
    const needs = [...new Set(def.interactions.flatMap((i) => Object.entries(i.effects).filter(([, v]) => (v ?? 0) > 0.3).map(([k]) => t(`need.${k}`))))];
    const tier = tierOf(def);
    const tip = [t(def.name), `${formatMoney(def.price)} (${t(`tier.${tier}`)})`];
    if (needs.length) tip.push(needs.join(', '));
    if (trains.length) tip.push(t('buy.trains', { skill: trains.join(', ') }));
    if (def.ambience > 0) tip.push(`${t('need.ambience')} +${def.ambience}`);
    if (def.light) tip.push(`${t('tip.light')} ${Math.round(def.light * 100)}%`);
    if (def.interactions.some((i) => i.duo)) tip.push(t('buy.duo'));
    if (def.dining) tip.push(t('buy.table'));
    if (!affordable) tip.push(t('buy.cantAfford'));
    const lockText = def.reward
      ? t('buy.locked', {
          title: t(catalog.careers[def.reward.career]?.levels[def.reward.level]?.title ?? ''),
          career: t(catalog.careers[def.reward.career]?.name ?? ''),
        })
      : '';
    if (def.reward) tip.push(lockText);
    item.title = tip.join(' · ');
    const badge = el('span', `item-tier tier-${tier}`, def.reward ? '★' : '⟡'.repeat(tier + 1));
    item.append(badge, img, el('span', 'item-name', t(def.name)), el('span', 'item-price', locked ? t('buy.lockedShort') : formatMoney(def.price)));
    item.addEventListener('click', () => {
      if (locked) {
        this.ctrl.toast(lockText);
        return;
      }
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
    // bloco 4: quanto vale hoje e de quem é o objeto querido
    const world = this.ctrl.world;
    const worth = formatMoney(sellValue(world, obj, def));
    this.menuEl.append(el('div', 'menu-note', stillNew(world, obj) ? `${t('buy.worth', { price: worth })} · ${t('buy.new')}` : t('buy.worth', { price: worth })));
    const fan = obj.beloved !== undefined ? world.folks.find((f) => f.id === obj.beloved && !f.visit) : undefined;
    if (fan) this.menuEl.append(el('div', 'menu-note beloved', `♥ ${t('buy.beloved', { name: fan.name })}`));
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
      // plano 2, bloco 8: enfeite gira em oitavos
      if (def.turns8) {
        const turn8 = ((obj.turn8 ?? obj.rot * 2) + 1) % 8;
        this.ctrl.commandOrExplain({ type: 'move', objectId: obj.id, x: obj.x, y: obj.y, rot: (turn8 >> 1) as WorldObject['rot'], turn8, nudge: obj.nudge, lift: obj.lift });
      } else this.ctrl.commandOrExplain({ type: 'move', objectId: obj.id, x: obj.x, y: obj.y, rot: ((obj.rot + 1) % 4) as WorldObject['rot'], nudge: obj.nudge, turn8: obj.turn8, lift: obj.lift });
    });
    add(`✎ ${t('buy.customize')}`, () => this.styleEditor.editObject(obj));
    const price = formatMoney(sellValue(this.ctrl.world, obj, def));
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
    const k = this.scale();
    this.bubbleEl.style.transform = `translate(${Math.round(x / k)}px, ${Math.round(y / k)}px) translate(-50%, -100%)`;
  }

  setTooltip(x: number, y: number, text: string | null): void {
    if (!text || this.menuOpen) {
      if (!this.tooltipEl.hidden) this.tooltipEl.hidden = true;
      return;
    }
    if (this.tooltipEl.textContent !== text) this.tooltipEl.textContent = text;
    this.tooltipEl.hidden = false;
    const k = this.scale();
    this.tooltipEl.style.transform = `translate(${Math.round((x + 14) / k)}px, ${Math.round((y + 16) / k)}px)`;
  }

  private showToast(text: string): void {
    const toast = el('div', 'toast', text);
    this.toastsEl.append(toast);
    while (this.toastsEl.children.length > 4) this.toastsEl.firstElementChild?.remove();
    window.setTimeout(() => toast.classList.add('out'), 3600);
    window.setTimeout(() => toast.remove(), 4100);
  }
}
