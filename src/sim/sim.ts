import { chooseAutonomous } from './ai';
import {
  PASSIVE,
  RISE,
  SEATED,
  SEAT_COMFORT,
  SIT_DOWN,
  bestSeat,
  chance,
  channelDef,
  couchSeat,
  favoriteChannel,
  freeSeatSpot,
  isSeat,
  isWatch,
  keepsPosture,
  passiveShows,
  seatSees,
  seatedPlace,
  sitFriendly,
  sitsOn,
  spotOwner,
  spotPlaces,
  stagesOf,
  viewArea,
  viewOf,
} from './activity';
import { SKIP_SPEED, canSkip } from './pace';
import { BOOKS, WINDOW_MINUTES, canvasQuality, jogRoute, paintTick, paintingPrice, projectTick, readFactor, readTick, returnsBook } from './hobbies';
import {
  DISH_BY_ID,
  FETCH_MINUTES,
  PLATE_UP_MINUTES,
  REHEAT_MINUTES,
  SERVE_MINUTES,
  burnChance,
  dishQuality,
  isSpoiled,
  knowsDish,
  mealSpot,
  reheat,
  servedFactor,
  serveMeal,
  servingsFor,
  takeServing,
} from './kitchen';
import type { BuildCommand, BuildProblem, GridChange } from './build';
import { applyChange, checkGrid, invertChange, isBuildCommand, planBuild, touchesNav } from './build';
import { WEATHER_HOUR, freshPlant, gardenHour, harvest, replant, rollWeather } from './garden';
import { poolHasLadder, poolOf, poolTiles } from './yard';
import {
  ADRIFT_DRAIN,
  BARGAIN_MINUTES,
  BURGLAR_HOUR,
  BURGLAR_REWARD,
  CHASE_STEPS,
  DOUSE_EXTINGUISHER,
  DOUSE_HOSE,
  FIRE_RESPONSE,
  FLEE_RADIUS,
  FUEL_BARE,
  HEARTH_MINUTES,
  HEARTH_SPARK,
  HONOR_REST,
  MOURN_DAYS,
  MOURN_FRIENDSHIP,
  NEAR_MISS_REST,
  PANIC_MINUTES,
  POLICE_RESPONSE,
  SCARE_GAP,
  SCARE_RADIUS,
  SCORCH_DEATH,
  SHOCK_FIRE,
  SOOTY_MINUTES,
  SPIRIT_CHANCE,
  SPIRIT_FROM,
  SPIRIT_REST_PER_NIGHT,
  SPIRIT_STEP,
  SPIRIT_TO,
  STARVE_MINUTES,
  STEAL_MINUTES,
  addFire,
  asleep,
  bargainWon,
  burglarNight,
  cookFireChance,
  douseFire,
  fireAt,
  fireMinute,
  fireSideTiles,
  freeSpotFor,
  hearthNeighbors,
  lootTarget,
  memorialKind,
  nearestFire,
  reach,
  safetyOf,
  smokeSeen,
  spiritStep,
  spiritTiles,
  throwFingers,
} from './peril';
import {
  AWAY_DECAY,
  CALL_AHEAD,
  FIRE_AT,
  HONK_AGAIN,
  MISSED_PENALTY,
  RIDE_GRACE,
  PERFORMANCE_AFTER_PROMOTION,
  PROMOTE_AT,
  careerOf,
  levelOfJob,
  missingFriends,
  missingSkills,
  newJob,
  payFor,
  shiftOn,
  shiftScore,
} from './career';
import {
  addReputation,
  breakUp,
  chatGossip,
  createNews,
  dailyHearts,
  grudge,
  learnNews,
  onLotWitnesses,
  pickGossip,
  reputationOf,
  partnersOf,
  romanticAct,
  spreadNews,
} from './gossip';
import {
  CIRCLE_EFFECTS,
  CIRCLE_EXTRA,
  CIRCLE_GRACE,
  CIRCLE_MAX,
  CIRCLE_MINUTES,
  CIRCLE_REACH,
  CIRCLE_TURN,
  circleById,
  circleOfFolk,
  faceCenter,
  findCircleCenter,
  freeSpot,
  inCircle,
  spotTile,
} from './circles';
import type { Reaction } from './topics';
import {
  REACTION_ACCEPT,
  REACTION_FRIENDSHIP,
  REACTION_FUN,
  catchTopic,
  ensureAllInterests,
  ensureInterests,
  pickTopic,
  reactionTo,
} from './topics';
import { partyFriction } from './cliques';
import {
  BOARD_HOUR,
  BUSINESS_CLOSE_HOUR,
  checkGigDeadline,
  closeBusiness,
  gigAllowed,
  gigDeadline,
  openBusiness,
  refreshBoard,
  settleBusiness,
  taskFits,
  workBusiness,
  workGig,
} from './hustle';
import {
  SECOND_EVENT_CHANCE,
  EVENT_CHANCE,
  autoChoice,
  bossBlocks,
  bossFed,
  canAskRaise,
  chainDue,
  meetWorkplace,
  planEvent,
  resolveRaise,
  resolveWorkEvent,
  staffShuffle,
  startWorkEvent,
  transferLevel,
  workRelationTerm,
  workplaceShift,
} from './work';
import { MINUTES_PER_DAY, clockOf, daylightAt } from './clock';
import type { PlaceProblem } from './economy';
import { billAmount, checkPlacement, formatMoney, objectBusy, sellValue } from './economy';
import type { Nav } from './grid';
import { blocksStep, buildNav, edgeKey, floorAt, footprint, nearestFootprintTile, useTiles } from './grid';
import { NEED_MAX, applyEffects, clampNeed, decayNeeds, moodOf } from './needs';
import { isDark, lightsIn, roomAt, roomsOf, shining } from './rooms';
import { NOISY_SLEEP, danceBonus, favoriteStation, isStereo, playing, pressTune, stereosIn } from './music';
import { findPath, findPathToAny } from './pathfinding';
import { nextFloat, nextInt } from './rng';
import { addMemory, affinity, applyDelta, coolRelations, ensureRelation, relationOf, setDating, touch } from './relations';
import { skillLevel, trainSkill } from './skills';
import { HABIT_PERIOD_DAYS, countHabit, settleHabits } from './temper';
import {
  MAX_SPARK,
  THINK_EVERY,
  INSPIRED_TRAINING,
  inspire,
  inspireProblem,
  isInspired,
  isSleep,
  refusal,
  setThought,
  sleepPressure,
  think,
  wakeTime,
} from './will';
import { rollWishes, wishOnBuy, wishOnHost, wishOnTalk, wishOnTidy, wishOnUse, wishesDue } from './wishes';
import type { Heir } from './life';
import {
  FAREWELL_MINUTES,
  addAlbum,
  copyLife,
  fitKid,
  estateOf,
  heirloomHeir,
  heirsOf,
  inSchool,
  lifeOn,
  nextStage,
  pensionFor,
  scheduleAge,
  setStage,
  splitEstate,
  stageOf,
} from './life';
import { acceptChance, adjacent, onLot, romanceAllowed, socialAllowed, talkTiles, talkingWith } from './social';
import type {
  Action,
  Catalog,
  Circle,
  Command,
  DinerOrder,
  Folk,
  InteractionDef,
  MealAct,
  Mess,
  ServedPlate,
  NeedId,
  Needs,
  Neighbor,
  ObjectDef,
  RelDelta,
  SocialDef,
  Vec,
  World,
  WorldObject,
  DeathCause,
  Passing,
  Spirit,
} from './types';
import { NEED_IDS } from './types';
import type { Chain } from './upkeep';
import {
  TIDINESS,
  addMess,
  afterCare,
  afterUse,
  careTick,
  freshState,
  interactionOpen,
  messTiles,
  tidyOf,
  addTrash,
  tidyMinutes,
  finishTidy,
  wearTick,
} from './upkeep';
import { BILL_INTERVAL, isServiceNeighbor } from './world';
import type { TownProblem } from './town';
import { TOWN_HOUR, emptyVisitors, foundFamily, leaveFamily, moveHouse, placeAtHome, playFamily, pushFeed, settle, streetSide, townDay } from './town';
import type { OutingProblem } from './downtown';
import {
  CLOSE_HOUR,
  COOK_MINUTES,
  DATE_SAMPLE,
  EXTRAS_MAX,
  EXTRA_STAY,
  ORDER_PATIENCE,
  SELF_SERVE_MINUTES,
  TAXI_FARE,
  TIRED_HOME,
  buildVenue,
  dateAvailable,
  dateChance,
  dateCounts,
  dateResult,
  lightVenue,
  outingProblem,
} from './downtown';
import { spotNear } from './marriage';
import {
  BAILIFF_HOUR,
  GROCERIES,
  MAID,
  PAPER_HOUR,
  TAKEOUT,
  besideTiles,
  buyAtFair,
  consumeFor,
  creditSeizure,
  deliverPaper,
  doorTaken,
  finishMaid,
  finishGardener,
  hasPlants,
  GARDENER,
  freshPaper,
  frontDoor,
  interactionReady,
  makeBill,
  orderProblem,
  payBills,
  placeOrder,
  providerOf,
  readPaper,
  repairBill,
  ringWait,
  ringing,
  seizableBills,
  seizeTarget,
  serviceNeighbor,
  serviceTask,
  stockPantry,
} from './services';
import type { ServiceKind, ServiceOrder, ServiceVisit } from './types';
import {
  ARCH_BONUS,
  DIVORCE_SHARE,
  VOWS_AT,
  VOWS_LAST_CALL,
  WEDDING_BONUS,
  belongingsOf,
  bondOf,
  fianceOf,
  placeFree,
  rename,
  restoreName,
  ringOnLot,
  setBond,
  spouseOf,
  weddingNames,
} from './marriage';
import type { Outfit, Party, SurnameChoice, Wedding } from './types';
import {
  ADOPT_FEE,
  ADOPT_HOUR,
  CARE_BELOW,
  CARE_NEED,
  CRY_BELOW,
  EXPECT_HOURS,
  HELP_CARE,
  HONOR_AT,
  MISSED_SCHOOL,
  NEGLECT_VISIT,
  SCHOOL_BUS_LEAVES,
  SCHOOL_CALL,
  SCHOOL_END,
  SCHOOL_LUNCH,
  TRY_CHANCE,
  babyIn,
  babyTick,
  babyWant,
  babyCareTick,
  childNeglectTick,
  clampGrade,
  createBaby,
  cribOf,
  crying,
  dayOf,
  freeCrib,
  gradeBand,
  gradeText,
  gradeVerdict,
  isSchoolDay,
  isAdult,
  kidAllows,
  kidsOf,
  learnFromCaregiver,
  schoolDelta,
} from './kids';
import type { BabyCare, Expecting } from './types';
import type { KitParts } from './parts';
import type { ObjStyle, ZoneDef } from './style';
import { MAX_SAVED_STYLES, ROLE_ZONES, cleanStyle, styleFromColor } from './style';
import { DISHWASHER_LOAD } from './upkeep';
import { cleanLook, itemsOn, placementExtras, priceWith, setExtras, zonesOf } from './modular';
import { kitZones } from './parts';
import type { KitKind } from './parts';
import { KINDS } from './parts';
import {
  SEAT_REACH,
  TABLE_BONUS,
  TABLE_COMPANY,
  TABLE_FRIENDSHIP,
  belovedBonus,
  countUse,
  duoPartners,
  findSeat,
  missBeloved,
  occupiedId,
  tableCompany,
} from './furnish';

/** Bloco 14: quem entra sem tocar a campainha. */
const NO_BELL: Partial<Record<ServiceKind, boolean>> = { bailiff: true, social: true, firefighter: true, police: true, burglar: true, reaper: true, waiter: true };
/** Bloco 14: quem vem de uniforme (e não se despede ao sair). */
const UNIFORMED: Partial<Record<ServiceKind, boolean>> = { firefighter: true, police: true, burglar: true, reaper: true, waiter: true };

/** Por que o último comando foi recusado (para a interface explicar). */
export type CommandProblem =
  | PlaceProblem
  | BuildProblem
  | 'busy'
  | 'retired'
  | 'oldAge'
  | 'away'
  | 'collapsed'
  | 'queueFull'
  | 'cantSkip'
  | 'invalid'
  | 'notSeated'
  | 'noBook'
  // plano 2, bloco 7
  | 'noWindow'
  | 'canvasDone'
  | 'visitor'
  | 'socialNotNow'
  | 'noPhone'
  | 'alreadyComing'
  | 'houseFull'
  | 'noGig'
  | 'noBusiness'
  | 'hasGig'
  | 'hasBusiness'
  | 'raiseTooSoon'
  | 'noJob'
  | 'noEvent'
  | 'skillTooLow'
  | 'offerGone'
  | 'broken'
  | 'nothingToDo'
  | 'noMess'
  | 'noFood'
  | 'noBills'
  | 'closed'
  | 'already'
  | 'atDoor'
  | 'notAtDoor'
  | 'undoBuyEmpty'
  | 'daytime'
  | 'undoBuyBlocked'
  // plano 2, bloco 8: tampo com enfeite em cima não sai; estilo que não monta
  | 'surfaceBusy'
  | 'badParts'
  | 'refused'
  | 'noSpark'
  | 'locked'
  | 'noRoom'
  | 'partyOn'
  | 'noGuests'
  | 'noCall'
  | 'noRing'
  | 'notEngaged'
  | 'alreadyEngaged'
  | 'lastResident'
  | 'baby'
  | 'tooYoung'
  | 'noCrib'
  | 'expecting'
  // bloco 14
  | 'down'
  | 'adrift'
  | 'noBargain'
  | 'noBargainer'
  // bloco 15
  | TownProblem
  // bloco 16
  | OutingProblem;

/** Resultado de uma conversa, para a tela mostrar o que mudou (não vai no save). */
export interface SocialOutcome {
  fromId: number;
  toId: number;
  socialId: string;
  accepted: boolean;
  /** o que mudou em como o outro vê quem puxou */
  toTarget: RelDelta;
  /** o que mudou em como quem puxou vê o outro */
  toSelf: RelDelta;
}

/** Bloco 10: minutos esperando os noivos chegarem ao arco antes de casar onde estão. */
const ARCH_PATIENCE = 12;
/** Moradores no máximo (quem chama para morar junto esbarra nisso). */
export const MAX_RESIDENTS = 8;
/** Gente no lote ao mesmo tempo, moradores e visitas. */
export const MAX_ON_LOT = 8;
export const MAX_VISITORS = 3;
/** bloco 9: numa festa cabe mais gente no lote */
export const MAX_ON_LOT_PARTY = 16;
export const PARTY_MAX_GUESTS = 8;
/** quanto dura uma festa */
export const PARTY_MINUTES = 4 * 60;
/** minutos entre ligar para todo mundo e a festa começar */
export const PARTY_LEAD = 45;
/** de quanto em quanto tempo a animação dos convidados é medida */
export const PARTY_SAMPLE = 30;
/** ninguém atende? convidado de festa entra sozinho depois disso */
export const PARTY_WALK_IN = 6;
/** hora a partir da qual música alta incomoda a vizinhança */
export const QUIET_HOUR = 22;
/** reclamações de barulho que acabam com a festa */
export const COMPLAINTS_TO_END = 2;
/** porções da mesa de petiscos */
export const BUFFET_PORTIONS = 16;
/** telefone: chance a cada meia hora (9h às 21h) de algum amigo ligar */
export const CALL_CHANCE = 0.05;
/** minutos tocando antes de quem liga desistir */
export const RING_MINUTES = 12;
/** Visitas sem aviso: entre estas horas, no máximo uma a cada DROPIN_GAP minutos. */
export const DROPIN_FROM = 9;
export const DROPIN_TO = 19;
export const DROPIN_GAP = 6 * 60;
export const DROPIN_CHANCE = 0.18;
/** quanto tempo fica quem foi convidado */
export const INVITED_STAY = 4 * 60;
/** visitas vão embora a esta hora, no máximo */
const VISIT_CURFEW = 23;
/** minutos de conversa quando o outro não topa */
const REJECT_MINUTES = 3;
/** minutos esperando alguém ou um objeto ficar livre antes de desistir */
const WAIT_LIMIT = 30;
/** plano 2, bloco 7: até quantos passos procura assento para ler */
const READ_REACH = 10;
/** minutos que alguém fica esperando quem vem puxar conversa */
const LISTEN_LIMIT = 60;
/** hora em que as relações sem contato esfriam */
const COOL_HOUR = 4;

export const MAX_QUEUE = 8;

/** Bloco 3: tostões por minuto de lâmpada acesa (entra na conta de luz). */
export const LIGHT_RATE = 0.012;
/** Chance de apagar a luz ao sair de um cômodo vazio, sem traço que diga outra coisa. */
export const SAVER_DEFAULT = 0.4;

/** Interação de dormir (deitar e recuperar energia). */

/** Chance de o folk apagar a luz ao sair (média dos traços que opinam). */
export function saverOf(catalog: Catalog, folk: Folk): number {
  const vals = folk.traits.map((t) => catalog.traits[t]?.saver).filter((v): v is number => v !== undefined);
  return vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : SAVER_DEFAULT;
}
const MAX_LOG = 30;
/** minutos parado antes de a IA procurar algo para fazer */
const IDLE_BEFORE_AUTO = 3;
/** plano 2, bloco 1: até quantos tiles o fogo faz o morador parado correr sozinho */
const REFLEX_FIRE = 10;
/** de quanto em quanto tempo uma ação autônoma é reavaliada */
const AUTO_RECHECK = 10;
const CRITICAL_NEED = 15;
const COLLAPSE_MINUTES = 150;
/** quantas obras ficam guardadas para desfazer */
/** Plano 2, bloco 8: toda zona que existe (para guardar estilos de qualquer objeto). */
const ALL_ZONES: ZoneDef[] = (() => {
  const raw = [...Object.values(ROLE_ZONES), ...(Object.keys(KINDS) as KitKind[]).flatMap((k) => kitZones(k))];
  const ids = [...new Set(raw.map((z) => z.id))];
  return ids.map((id) => ({ id, families: [...new Set(raw.filter((z) => z.id === id).flatMap((z) => z.families))], base: { mat: '' } }));
})();

const UNDO_LIMIT = 40;
const COLLAPSE_ENERGY_PER_MINUTE = 0.3;

type ActionSeed = Pick<
  Action,
  'kind' | 'objectId' | 'interactionId' | 'target' | 'otherId' | 'socialId' | 'messId' | 'serviceId' | 'welcome' | 'circleId' | 'topic' | 'guests' | 'wedding' | 'armed' | 'slot' | 'mealAct' | 'route'
>;

/** minutos de conversa na porta antes de decidir */
const DOOR_MINUTES = 3;
/** quantas coisas o oficial de penhora leva numa visita, no máximo */
const MAX_SEIZE = 8;
/** quanto tempo um prestador de serviço pode ficar no lote */
const SERVICE_STAY = 8 * 60;

/** Bloco 4: uma mexida do modo compra, guardada para desfazer. */
type BuyUndo =
  | { kind: 'buy'; objectId: number; cost: number }
  | { kind: 'sell'; obj: WorldObject; got: number }
  | { kind: 'move'; objectId: number; x: number; y: number; rot: WorldObject['rot']; extras?: { nudge?: { dx: number; dy: number }; turn8?: number; lift?: number } };

/** treino de Capricho enquanto recolhe bagunça */
const TIDY_GAIN = { skill: { id: TIDINESS, xpPerMinute: 0.8 } } as InteractionDef;

/**
 * Fachada do núcleo: guarda o mundo, avança um tick por vez (`step`) e recebe
 * comandos do jogador (`dispatch`). Determinístico: mesmo mundo inicial e
 * mesmos comandos nos mesmos ticks dão sempre o mesmo resultado.
 */
export class Sim {
  world: World;
  readonly catalog: Catalog;
  private nav: Nav;
  /** motivo da última recusa de `dispatch` */
  lastProblem: CommandProblem | null = null;
  /** bloco 6: por que o folk recusou a última ordem (necessidade ou mau humor) */
  lastRefusal: NeedId | 'mood' | null = null;
  /** plano 2, bloco 1: o comando em curso vai para o fim da fila (Shift) em vez de substituir */
  private appending = false;
  /** plano 2, bloco 4: a ordem nova se faz sentado; o prato na mão vai junto */
  private keepPlate = false;
  /** resultados de conversa ainda não lidos pela tela (não vai no save) */
  private outcomes: SocialOutcome[] = [];
  /** visitas que chegaram à calçada neste minuto e saem do lote */
  private departed: number[] = [];
  /** obras que dá para desfazer, da mais antiga para a mais nova (não vai no save) */
  private undoStack: { back: GridChange; cost: number }[] = [];
  /** bloco 4: compras, vendas e mudanças do modo compra que dá para desfazer */
  private buyStack: BuyUndo[] = [];
  /** bloco 14: sobe quando a própria simulação tira ou põe objetos (fogo, gatuno, lápide); a tela redesenha */
  objectStamp = 0;
  /** bloco 14: já reagiu ao fogo que está queimando (não vai no save) */
  private fireAware = false;

  constructor(catalog: Catalog, world: World) {
    this.catalog = catalog;
    this.world = world;
    this.prepare();
    this.nav = buildNav(world, catalog);
  }

  /** Bloco 9: campos novos em mundos montados à mão e gostos de todo mundo. */
  private prepare(): void {
    const w = this.world;
    w.circles ??= [];
    w.party ??= null;
    w.lastParty ??= null;
    w.call ??= null;
    // bloco 14
    w.fires ??= [];
    w.help ??= { fire: 0, police: 0 };
    w.passings ??= [];
    w.lastBargain ??= null;
    w.departed ??= [];
    w.spirits ??= [];
    w.rules ??= { death: true };
    w.rules.life ??= 'off';
    w.household.album ??= [];
    w.lastBurglary ??= w.tick;
    w.town ??= null;
    w.outing ??= null;
    w.lastDate ??= null;
    this.fireAware = false;
    ensureAllInterests(w, this.catalog);
  }

  /** Troca o mundo inteiro (ex.: ao carregar um save). */
  load(world: World): void {
    this.world = world;
    this.prepare();
    this.undoStack = [];
    this.buyStack = [];
    this.invalidateNav();
  }

  /** Chamar quando objetos ou paredes mudarem. */
  invalidateNav(): void {
    this.nav = buildNav(this.world, this.catalog);
  }

  getNav(): Nav {
    return this.nav;
  }

  findFolk(id: number): Folk | undefined {
    return this.world.folks.find((f) => f.id === id);
  }

  findObject(id: number): WorldObject | undefined {
    return this.world.objects.find((o) => o.id === id);
  }

  defOf(obj: WorldObject): ObjectDef | undefined {
    return this.catalog.objects[obj.defId];
  }

  interactionOf(action: Action): InteractionDef | undefined {
    if (action.kind !== 'use' || action.objectId === undefined) return undefined;
    // plano 2, bloco 4: ler e ligar sentado (o objeto é o assento)
    const seated = SEATED[action.interactionId ?? ''];
    if (seated) return seated;
    const obj = this.findObject(action.objectId);
    const def = obj && this.defOf(obj);
    return def?.interactions.find((i) => i.id === action.interactionId);
  }

  // ---------- comandos ----------

  dispatch(cmd: Command): boolean {
    this.lastProblem = null;
    this.appending = 'append' in cmd && cmd.append === true;
    const ok = this.run(cmd);
    if (!ok && !this.lastProblem) this.lastProblem = 'invalid';
    return ok;
  }

  private fail(problem: CommandProblem): false {
    this.lastProblem = problem;
    return false;
  }

  private run(cmd: Command): boolean {
    if (isBuildCommand(cmd)) return this.build(cmd);
    switch (cmd.type) {
      case 'undoBuild':
        return this.undoBuild();
      case 'setSpeed':
        // plano 2, bloco 1: pular só com todo mundo dormindo, fora ou ocupado com algo longo
        if (cmd.speed === SKIP_SPEED && !canSkip(this.world, this.catalog)) return this.fail('cantSkip');
        this.world.speed = cmd.speed;
        return true;
      case 'cancel': {
        const folk = this.findFolk(cmd.folkId);
        if (!folk) return false;
        const idx = folk.queue.findIndex((a) => a.id === cmd.actionId);
        if (idx < 0) return false;
        // plano 2, bloco 4: cancelar no meio passa pela etapa de saída (levantar da cama)
        if (idx === 0) {
          if (!this.windDown(folk)) this.abandon(folk);
        } else folk.queue.splice(idx, 1);
        return true;
      }
      case 'seated': {
        const folk = this.findFolk(cmd.folkId);
        if (!folk) return false;
        const p = folk.posture;
        if (!p || p.rising !== undefined) return this.fail('notSeated');
        if (cmd.what === 'stand') return this.enqueuePlayer(folk, { kind: 'goto', target: { x: folk.x, y: folk.y } });
        if (cmd.what === 'read') {
          const books = this.world.objects.some((o) => this.defOf(o)?.interactions.some((i) => i.id === 'read'));
          if (!books) return this.fail('noBook');
          return this.enqueuePlayer(folk, { kind: 'use', objectId: p.objectId, interactionId: 'seatRead', slot: p.spot });
        }
        if (!this.nearestSpecial(folk, 'call')) return this.fail('noPhone');
        if (cmd.neighborId !== undefined && !relationOf(this.world, folk.id, cmd.neighborId)) return this.fail('invalid');
        return this.enqueuePlayer(folk, { kind: 'use', objectId: p.objectId, interactionId: 'seatCall', slot: p.spot, otherId: cmd.neighborId });
      }
      case 'lookOut': {
        const folk = this.findFolk(cmd.folkId);
        if (!folk || folk.age === 'baby') return false;
        if (folk.visit) return this.fail('visitor');
        const spot = this.windowSpot(folk);
        if (!spot) return this.fail('noWindow');
        return this.enqueuePlayer(folk, { kind: 'window', target: spot.at, route: [spot.out] });
      }
      case 'watchTogether': {
        const folk = this.findFolk(cmd.folkId);
        const other = this.findFolk(cmd.otherId);
        if (!folk || !other || other === folk || other.away || other.age === 'baby') return false;
        const shown = this.watchedBy(folk);
        if (!shown) return this.fail('nothingToDo');
        const it = this.defOf(shown)?.interactions.find((i) => i.id === 'watch' || i.id === 'listenMusic' || i.id === 'gaze');
        if (!it) return this.fail('nothingToDo');
        if (other.visit) {
          // visita só vem se gostar de quem chama (e não estiver no meio de algo seu)
          const rel = relationOf(this.world, other.id, folk.id);
          if ((rel?.friendship ?? 0) < 10 || other.visit.service) return this.fail('socialNotNow');
          if (other.queue[0]) this.abandon(other);
          other.queue = [this.makeAction({ kind: 'use', objectId: shown.id, interactionId: it.id }, 'auto')];
          setThought(other, 'chat', 'yes', this.world.tick, 6);
          return true;
        }
        return this.enqueuePlayer(other, { kind: 'use', objectId: shown.id, interactionId: it.id });
      }
      case 'moveQueued': {
        const folk = this.findFolk(cmd.folkId);
        if (!folk) return false;
        const idx = folk.queue.findIndex((a) => a.id === cmd.actionId);
        if (idx < 1) return false;
        const to = Math.min(Math.max(1, Math.round(cmd.to)), folk.queue.length - 1);
        if (to === idx) return true;
        const [action] = folk.queue.splice(idx, 1);
        folk.queue.splice(to, 0, action);
        return true;
      }
      case 'queueUse': {
        const folk = this.findFolk(cmd.folkId);
        const obj = this.findObject(cmd.objectId);
        const def = obj && this.defOf(obj);
        const it = def?.interactions.find((i) => i.id === cmd.interactionId);
        // convites e serviços passam pelos comandos 'invite' e 'callService'
        if (!folk || !obj || !def || !it || it.special === 'invite' || it.special === 'services' || it.special === 'party' || it.hidden) return false;
        // bloco 16: quem saiu para o encontro pode pedir no restaurante (a casa paga)
        if (folk.visit && (it.residentOnly || ((it.cost ?? 0) > 0 && !folk.visit.date) || it.care)) return this.fail('visitor');
        // bloco 11: idade (bebê, criança no fogão, lição sem lição, brinquedo de criança)
        if (folk.age === 'baby') return this.fail('baby');
        if (!kidAllows(folk, it)) return this.fail(it.homework ? 'nothingToDo' : 'tooYoung');
        if (it.special === 'adopt') {
          if (this.world.household.expecting) return this.fail('expecting');
          if (this.household().length >= MAX_RESIDENTS) return this.fail('houseFull');
          if (!freeCrib(this.world, this.catalog)) return this.fail('noCrib');
        }
        // plano 2, bloco 6: prato acima da Cozinha do folk
        if (it.cook && DISH_BY_ID[it.cook] && !knowsDish(folk, DISH_BY_ID[it.cook])) return this.fail('skillTooLow');
        if (!interactionOpen(obj, it)) return this.fail(it.canvas ? 'canvasDone' : it.care || it.light || it.baby ? 'nothingToDo' : 'broken');
        if (!interactionReady(this.world, it)) {
          return this.fail(it.special === 'payBills' ? 'noBills' : it.special === 'fair' ? 'closed' : it.night ? 'daytime' : 'noFood');
        }
        if (it.task && !taskFits(this.catalog, folk, it.task, def.id)) {
          return this.fail(it.task === 'gig' ? 'noGig' : 'noBusiness');
        }
        // bloco 6: de mau humor (ou apertado), o folk não topa esforço
        if (!folk.away && folk.collapsed === 0 && this.refuse(folk, it)) return this.fail('refused');
        return this.enqueuePlayer(folk, {
          kind: 'use',
          objectId: cmd.objectId,
          interactionId: cmd.interactionId,
        });
      }
      case 'queueTidy': {
        const folk = this.findFolk(cmd.folkId);
        if (!folk) return false;
        if (folk.visit) return this.fail('visitor');
        if (!this.world.mess.some((m) => m.id === cmd.messId)) return this.fail('noMess');
        return this.enqueuePlayer(folk, { kind: 'tidy', messId: cmd.messId });
      }
      case 'mealAct':
        return this.mealCommand(cmd.folkId, cmd.messId, cmd.act);
      case 'callService':
        return this.callService(cmd.folkId, cmd.service);
      case 'dismissService': {
        // bloco 13: o jardineiro também se dispensa pelo telefone
        if (cmd.service === 'gardener') {
          if (!this.world.household.gardener) return this.fail('nothingToDo');
          this.world.household.gardener = false;
          this.log('log.gardenerDismissed');
          return true;
        }
        if (!this.world.household.maid) return this.fail('nothingToDo');
        this.world.household.maid = false;
        this.log('log.maidDismissed');
        return true;
      }
      case 'answerDoor': {
        const folk = this.findFolk(cmd.folkId);
        const other = this.findFolk(cmd.otherId);
        if (!folk || !other) return false;
        if (folk.visit) return this.fail('visitor');
        if (!other.visit || other.visit.admitted || other.visit.leaving) return this.fail('notAtDoor');
        return this.enqueuePlayer(folk, { kind: 'door', otherId: other.id, welcome: cmd.welcome });
      }
      case 'queueGoto': {
        const folk = this.findFolk(cmd.folkId);
        if (!folk || !this.nav.isFree(cmd.x, cmd.y)) return false;
        return this.enqueuePlayer(folk, { kind: 'goto', target: { x: cmd.x, y: cmd.y } });
      }
      case 'queueSocial': {
        const folk = this.findFolk(cmd.folkId);
        const other = this.findFolk(cmd.otherId);
        const def = this.catalog.socials[cmd.socialId];
        if (!folk || !other || !def || folk === other) return false;
        if (other.away) return this.fail('away');
        if (other.visit && !other.visit.admitted) return this.fail('atDoor');
        if (!onLot(other) || !socialAllowed(this.world, this.catalog, def, folk, other)) return this.fail('socialNotNow');
        if (def.hidden) return false;
        if (def.special === 'moveIn' && this.household().length >= MAX_RESIDENTS) return this.fail('houseFull');
        // bloco 11: bebê precisa de berço livre, um de cada vez
        if (def.special === 'tryBaby') {
          if (this.world.household.expecting) return this.fail('expecting');
          if (this.household().length >= MAX_RESIDENTS) return this.fail('houseFull');
          if (!freeCrib(this.world, this.catalog)) return this.fail('noCrib');
        }
        // bloco 10: pedido precisa de aliança; ninguém sai se for o último da casa
        if (def.special === 'engage') {
          if (!ringOnLot(this.world, this.catalog)) return this.fail('noRing');
          if (fianceOf(this.world, folk.id) || spouseOf(this.world, folk.id) || fianceOf(this.world, other.id) || spouseOf(this.world, other.id)) {
            return this.fail('alreadyEngaged');
          }
        }
        if (def.special === 'moveOut' && (this.adults().length < 2 || !isAdult(other))) return this.fail('lastResident');
        // bloco 9: "puxar assunto" escolhe o assunto do papo
        const topic = def.topic && cmd.topic && this.catalog.topics[cmd.topic] ? cmd.topic : undefined;
        return this.enqueuePlayer(folk, { kind: 'social', otherId: other.id, socialId: def.id, topic });
      }
      case 'invite':
        return this.invite(cmd.folkId, cmd.neighborId);
      case 'startCircle':
        return this.startCircle(cmd.folkId, cmd.otherIds, 'player');
      case 'joinCircle': {
        const folk = this.findFolk(cmd.folkId);
        const c = circleById(this.world, cmd.circleId);
        if (!folk || !c) return false;
        if (c.members.some((m) => m.id === folk.id)) return this.fail('already');
        const spot = freeSpot(this.world, this.nav, c, folk.id, this.catalog);
        if (spot < 0) return this.fail('noRoom');
        const old = circleOfFolk(this.world, folk.id);
        if (!this.enqueuePlayer(folk, { kind: 'circle', circleId: c.id })) return false;
        if (old) this.dropFromCircle(folk, old, true);
        c.members.push({ id: folk.id, spot });
        return true;
      }
      case 'phoneFriend': {
        const folk = this.findFolk(cmd.folkId);
        const n = this.world.neighbors.find((x) => x.id === cmd.neighborId);
        if (!folk || !n) return false;
        if (!relationOf(this.world, folk.id, n.id)) return this.fail('invalid');
        if (this.findFolk(n.id)) return this.fail('alreadyComing');
        const best = this.nearestSpecial(folk, 'call');
        if (!best) return this.fail('noPhone');
        return this.enqueuePlayer(folk, { kind: 'use', objectId: best.obj.id, interactionId: best.it.id, otherId: n.id });
      }
      case 'throwParty': {
        const folk = this.findFolk(cmd.folkId);
        if (!folk) return false;
        if (folk.visit) return this.fail('visitor');
        if (!isAdult(folk)) return this.fail('tooYoung');
        if (this.world.party) return this.fail('partyOn');
        const guests = [...new Set(cmd.guestIds)].filter((id) => {
          const n = this.world.neighbors.find((x) => x.id === id);
          return n && !isServiceNeighbor(n);
        });
        if (guests.length === 0) return this.fail('noGuests');
        if (guests.length > PARTY_MAX_GUESTS) return this.fail('invalid');
        const best = this.nearestSpecial(folk, 'party');
        if (!best) return this.fail('noPhone');
        return this.enqueuePlayer(folk, { kind: 'use', objectId: best.obj.id, interactionId: best.it.id, guests });
      }
      case 'planWedding':
        return this.planWedding(cmd.folkId, cmd.partnerId, cmd.guestIds, cmd.surname);
      case 'bargain':
        return this.bargain(cmd.pick);
      // bloco 15: bairro
      case 'playFamily':
        return this.town(playFamily(this.world, this.catalog, cmd.familyId));
      case 'moveHouse':
        return this.town(moveHouse(this.world, this.catalog, cmd.lotId));
      case 'foundFamily':
        return this.town(foundFamily(this.world, this.catalog, cmd.draft, cmd.lotId));
      // bloco 16: centro e encontros
      case 'goDowntown':
        return this.goDowntown(cmd.folkIds, cmd.dateId);
      case 'goHome':
        return this.goHome();
      // bloco 17: álbum
      case 'takePhoto': {
        const who = (cmd.who ?? []).filter((id) => this.findFolk(id));
        const caption = (cmd.caption ?? '').replace(/\s+/g, ' ').trim().slice(0, 60);
        const page = addAlbum(this.world, {
          kind: 'photo',
          who,
          names: who.map((id) => this.findFolk(id)!.name),
          photo: cmd.photo,
          caption: caption || undefined,
        });
        return page ? true : this.fail('invalid');
      }
      case 'dropPhoto': {
        const album = this.world.household.album ?? [];
        const page = album.find((e) => e.id === cmd.entryId);
        if (!page || page.kind !== 'photo') return this.fail('invalid');
        this.world.household.album = album.filter((e) => e !== page);
        return true;
      }
      case 'answerPhone': {
        const folk = this.findFolk(cmd.folkId);
        if (!folk) return false;
        if (!this.world.call || this.world.call.answeredBy) return this.fail('noCall');
        const best = this.nearestSpecial(folk, 'answer');
        if (!best) return this.fail('noPhone');
        return this.enqueuePlayer(folk, { kind: 'use', objectId: best.obj.id, interactionId: best.it.id });
      }
      case 'buy':
        return this.buy(cmd.defId, cmd.x, cmd.y, cmd.rot, cmd.color, cmd);
      case 'restyle':
        return this.restyle(cmd.objectId, cmd.parts, cmd.style);
      case 'saveStyle': {
        const style = cleanStyle(ALL_ZONES, cmd.style);
        if (!style) return this.fail('invalid');
        const hh = this.world.household;
        const list = (hh.styles ??= []);
        const id = list.reduce((m, s) => Math.max(m, s.id), 0) + 1;
        list.push({ id, name: cmd.name.trim().slice(0, 24) || `#${id}`, style });
        while (list.length > MAX_SAVED_STYLES) list.shift();
        return true;
      }
      case 'dropStyle': {
        const list = this.world.household.styles ?? [];
        const i = list.findIndex((s) => s.id === cmd.styleId);
        if (i < 0) return false;
        list.splice(i, 1);
        return true;
      }
      case 'undoBuy':
        return this.undoBuy();
      case 'closeBuy':
        this.buyStack = [];
        return true;
      case 'sell':
        return this.sell(cmd.objectId);
      case 'move': {
        const obj = this.findObject(cmd.objectId);
        if (!obj) return false;
        if (objectBusy(this.world, obj.id)) return this.fail('inUse');
        const mdef = this.defOf(obj);
        if (!mdef) return false;
        const extras = placementExtras(mdef, cmd);
        const check = checkPlacement(this.world, this.catalog, obj.defId, cmd.x, cmd.y, cmd.rot, obj.id, extras.lift);
        if (!check.ok) return this.fail(check.problem ?? 'invalid');
        // plano 2, bloco 8: o tampo leva junto o que está em cima (se couber no lugar novo)
        const riders = itemsOn(this.world, this.catalog, obj);
        if (riders.length && (cmd.x !== obj.x || cmd.y !== obj.y || cmd.rot !== obj.rot)) {
          if (cmd.rot !== obj.rot) return this.fail('surfaceBusy');
        }
        this.pushBuyUndo({ kind: 'move', objectId: obj.id, x: obj.x, y: obj.y, rot: obj.rot, extras: { nudge: obj.nudge, turn8: obj.turn8, lift: obj.lift } });
        for (const r of riders) {
          r.x += cmd.x - obj.x;
          r.y += cmd.y - obj.y;
        }
        obj.x = cmd.x;
        obj.y = cmd.y;
        obj.rot = cmd.rot;
        setExtras(obj, extras);
        this.replanAll();
        return true;
      }
      case 'takeJob': {
        const folk = this.findFolk(cmd.folkId);
        const career = this.catalog.careers[cmd.careerId];
        if (!folk || !career) return false;
        if (folk.visit) return this.fail('visitor');
        // bloco 17: jovem pega meio período; idoso já se aposentou
        const teen = folk.age === 'teen';
        if (!isAdult(folk) && !teen) return this.fail('tooYoung');
        if (folk.age === 'elder') return this.fail('retired');
        if (folk.away) return this.fail('away');
        if (folk.job?.careerId === cmd.careerId) return false;
        if (teen) {
          this.dropWork(folk);
          folk.job = { ...newJob(cmd.careerId), partTime: true };
          this.log('log.partTimeHired', { name: folk.name, job: career.levels[0].title });
          return true;
        }
        if (folk.business) return this.fail('hasBusiness');
        this.dropWork(folk);
        // troca de área: leva parte da experiência
        const level = transferLevel(folk, folk.job, career);
        const switched = folk.job !== null;
        folk.job = { ...newJob(cmd.careerId), level };
        this.log(switched && level > 0 ? 'log.switched' : 'log.hired', { name: folk.name, job: career.levels[level].title });
        return true;
      }
      case 'workChoice': {
        const folk = this.findFolk(cmd.folkId);
        if (!folk?.away?.event) return this.fail('noEvent');
        return resolveWorkEvent(this.world, this.catalog, this.logger, folk, cmd.choice, false) !== null;
      }
      case 'askRaise': {
        const folk = this.findFolk(cmd.folkId);
        if (!folk) return false;
        if (folk.visit) return this.fail('visitor');
        if (!folk.job) return this.fail('noJob');
        if (!canAskRaise(folk, this.world.tick)) return this.fail('raiseTooSoon');
        folk.job.raisePending = true;
        folk.job.lastRaiseDay = Math.floor(this.world.tick / MINUTES_PER_DAY);
        this.log('log.raisePlanned', { name: folk.name });
        return true;
      }
      case 'takeGig': {
        const folk = this.findFolk(cmd.folkId);
        const offer = this.world.gigBoard.find((o) => o.id === cmd.offerId);
        const def = offer && this.catalog.gigs[offer.defId];
        if (!folk) return false;
        if (folk.visit) return this.fail('visitor');
        if (!isAdult(folk)) return this.fail('tooYoung');
        if (!offer || !def) return this.fail('offerGone');
        if (folk.gig) return this.fail('hasGig');
        if (!gigAllowed(folk, def)) return this.fail('skillTooLow');
        folk.gig = { defId: def.id, pay: offer.pay, progress: 0, deadline: gigDeadline(this.world.tick, def) };
        this.world.gigBoard = this.world.gigBoard.filter((o) => o.id !== offer.id);
        this.log('log.gigTaken', { name: folk.name, gig: def.name });
        return true;
      }
      case 'dropGig': {
        const folk = this.findFolk(cmd.folkId);
        if (!folk?.gig) return this.fail('noGig');
        folk.gig = null;
        this.dropTasks(folk, 'gig');
        this.log('log.gigDropped', { name: folk.name });
        return true;
      }
      case 'openBusiness': {
        const folk = this.findFolk(cmd.folkId);
        const def = this.catalog.businesses[cmd.businessId];
        if (!folk || !def) return false;
        if (folk.visit) return this.fail('visitor');
        if (!isAdult(folk)) return this.fail('tooYoung');
        if (folk.away) return this.fail('away');
        if (folk.business) return this.fail('hasBusiness');
        if (this.world.household.funds < def.cost) return this.fail('funds');
        if (folk.job) {
          // abrir o próprio negócio é largar o emprego
          this.dropWork(folk);
          folk.job = null;
          this.log('log.quit', { name: folk.name });
        }
        openBusiness(this.world, this.catalog, this.logger, folk, def);
        return true;
      }
      case 'closeBusiness': {
        const folk = this.findFolk(cmd.folkId);
        if (!folk?.business) return this.fail('noBusiness');
        closeBusiness(this.world, this.catalog, this.logger, folk);
        this.dropTasks(folk, 'business');
        return true;
      }
      case 'inspire': {
        const folk = this.findFolk(cmd.folkId);
        if (!folk) return false;
        const problem = inspireProblem(folk, this.world.tick);
        if (problem) return this.fail(problem);
        inspire(folk, this.world.tick);
        setThought(folk, 'wish', 'spark', this.world.tick, 20);
        this.log('log.inspired', { name: folk.name });
        return true;
      }
      case 'setAlarm': {
        const folk = this.findFolk(cmd.folkId);
        if (!folk) return false;
        if (folk.visit) return this.fail('visitor');
        folk.alarm = cmd.on;
        return true;
      }
      case 'quitJob': {
        const folk = this.findFolk(cmd.folkId);
        if (!folk || !folk.job) return false;
        if (folk.away) return this.fail('away');
        this.dropWork(folk);
        folk.job = null;
        this.log('log.quit', { name: folk.name });
        return true;
      }
    }
  }

  // ---------- construção ----------

  /** Quantas obras dá para desfazer. */
  get undoDepth(): number {
    return this.undoStack.length;
  }

  private build(cmd: BuildCommand): boolean {
    const plan = planBuild(this.world, this.catalog, cmd);
    if (!plan.ok) return this.fail(plan.problem ?? 'invalid');
    this.undoStack.push({ back: invertChange(this.world.grid, plan.change), cost: plan.cost });
    if (this.undoStack.length > UNDO_LIMIT) this.undoStack.shift();
    this.world.grid = applyChange(this.world.grid, plan.change);
    this.world.household.funds -= plan.cost;
    this.replanAll();
    return true;
  }

  /** Desfaz a última obra e devolve o que ela custou. */
  private undoBuild(): boolean {
    const last = this.undoStack[this.undoStack.length - 1];
    if (!last) return this.fail('undoEmpty');
    const after = applyChange(this.world.grid, last.back);
    if (touchesNav(last.back) && checkGrid(this.world, this.catalog, after)) {
      return this.fail('undoBlocked');
    }
    this.undoStack.pop();
    this.world.grid = after;
    this.world.household.funds += last.cost;
    this.replanAll();
    return true;
  }

  // ---------- compra e venda ----------

  private buy(
    defId: string,
    x: number,
    y: number,
    rot: WorldObject['rot'],
    color?: string,
    extra: { parts?: KitParts; style?: ObjStyle; nudge?: { dx: number; dy: number }; turn8?: number; lift?: number } = {},
  ): boolean {
    const def = this.catalog.objects[defId];
    if (!def || def.buyable === false) return false;
    if (def.reward && !(this.world.household.unlocked ?? []).includes(def.id)) return this.fail('locked');
    // plano 2, bloco 8: a cor do bloco 4 vira estilo; peças que não montam não passam
    const look = cleanLook(def, extra.parts, extra.style ?? styleFromColor(zonesOf(def), color && def.colors?.includes(color) ? color : undefined));
    if (extra.parts && def.kit && !look.parts && Object.keys(extra.parts).some((k) => extra.parts![k as keyof KitParts] !== def.kit!.parts[k as keyof KitParts])) {
      return this.fail('badParts');
    }
    const price = priceWith(def, look.parts, look.style);
    if (this.world.household.funds < price) return this.fail('funds');
    const extras = placementExtras(def, extra);
    const check = checkPlacement(this.world, this.catalog, defId, x, y, rot, undefined, extras.lift);
    if (!check.ok) return this.fail(check.problem ?? 'invalid');
    const obj: WorldObject = { id: this.world.nextId++, defId, x, y, rot, paid: price, state: freshState(), bought: this.world.tick, used: 0, uses: {} };
    if (look.parts) obj.parts = look.parts;
    if (look.style) obj.style = look.style;
    Object.assign(obj, extras);
    // bloco 13: planta comprada chega muda (o vaso já vem crescido)
    if (def.plant) obj.plant = freshPlant(def.plant);
    this.world.objects.push(obj);
    this.world.household.funds -= price;
    this.pushBuyUndo({ kind: 'buy', objectId: obj.id, cost: price });
    wishOnBuy(this.world, this.catalog, this.logger, def.category);
    this.replanAll();
    return true;
  }

  private sell(objectId: number): boolean {
    const obj = this.findObject(objectId);
    const def = obj && this.defOf(obj);
    if (!obj || !def) return false;
    // bloco 14: a escadinha sai mesmo com gente nadando, e quem estava na água fica preso
    const swimmers = def.pool === 'in' ? this.world.folks.filter((f) => f.queue[0]?.phase === 'using' && f.queue[0].objectId === objectId) : [];
    if (swimmers.length === 0 && objectBusy(this.world, objectId)) return this.fail('inUse');
    if (itemsOn(this.world, this.catalog, obj).length) return this.fail('surfaceBusy');
    const value = sellValue(this.world, obj, def);
    this.world.household.funds += value;
    this.pushBuyUndo({ kind: 'sell', obj: JSON.parse(JSON.stringify(obj)) as WorldObject, got: value });
    this.removeObject(objectId);
    for (const f of swimmers) {
      const pool = poolTiles(this.world.grid, this.catalog, obj.x, obj.y);
      if (pool.length === 0 || poolHasLadder(this.world, this.catalog, pool) || f.visit || !isAdult(f)) continue;
      f.adrift = { x: obj.x, y: obj.y };
      f.queue = [];
      f.path = [];
      this.log('log.adrift', { name: f.name });
    }
    return true;
  }

  private pushBuyUndo(entry: BuyUndo): void {
    this.buyStack.push(entry);
    if (this.buyStack.length > UNDO_LIMIT) this.buyStack.shift();
  }

  /** Quantas mexidas do modo compra dá para desfazer. */
  get buyUndoDepth(): number {
    return this.buyStack.length;
  }

  /**
   * Bloco 4: desfaz a última compra (devolve tudo o que custou), venda (o
   * objeto volta e o dinheiro sai) ou mudança de lugar.
   */
  private undoBuy(): boolean {
    const last = this.buyStack[this.buyStack.length - 1];
    if (!last) return this.fail('undoBuyEmpty');
    if (last.kind === 'buy') {
      const obj = this.findObject(last.objectId);
      if (obj && objectBusy(this.world, obj.id)) return this.fail('inUse');
      this.buyStack.pop();
      if (!obj) return this.undoBuy();
      this.world.household.funds += last.cost;
      this.removeObject(obj.id, true);
      return true;
    }
    if (last.kind === 'sell') {
      const o = last.obj;
      if (this.findObject(o.id)) {
        this.buyStack.pop();
        return this.undoBuy();
      }
      if (!checkPlacement(this.world, this.catalog, o.defId, o.x, o.y, o.rot).ok) return this.fail('undoBuyBlocked');
      this.buyStack.pop();
      this.world.objects.push(o);
      this.world.household.funds -= last.got;
      this.replanAll();
      return true;
    }
    const obj = this.findObject(last.objectId);
    if (!obj) {
      this.buyStack.pop();
      return this.undoBuy();
    }
    if (objectBusy(this.world, obj.id)) return this.fail('inUse');
    if (!checkPlacement(this.world, this.catalog, obj.defId, last.x, last.y, last.rot, obj.id).ok) return this.fail('undoBuyBlocked');
    this.buyStack.pop();
    for (const r of itemsOn(this.world, this.catalog, obj)) {
      r.x += last.x - obj.x;
      r.y += last.y - obj.y;
    }
    obj.x = last.x;
    obj.y = last.y;
    obj.rot = last.rot;
    if (last.extras) setExtras(obj, placementExtras(this.defOf(obj) ?? ({} as ObjectDef), last.extras));
    this.replanAll();
    return true;
  }

  /**
   * Plano 2, bloco 8: troca peças e estilo de um objeto que já está na casa.
   * Paga só o que ficou mais caro (nada volta quando fica mais simples).
   */
  private restyle(objectId: number, parts?: KitParts, style?: ObjStyle): boolean {
    const obj = this.findObject(objectId);
    const def = obj && this.defOf(obj);
    if (!obj || !def) return false;
    if (objectBusy(this.world, obj.id)) return this.fail('inUse');
    const look = cleanLook(def, parts, style);
    if (parts && def.kit && !look.parts && Object.keys(parts).some((k) => parts[k as keyof KitParts] !== def.kit!.parts[k as keyof KitParts])) {
      return this.fail('badParts');
    }
    const before = priceWith(def, obj.parts, obj.style);
    const after = priceWith(def, look.parts, look.style);
    const cost = Math.max(0, after - before);
    if (this.world.household.funds < cost) return this.fail('funds');
    this.world.household.funds -= cost;
    obj.paid += cost;
    delete obj.parts;
    delete obj.style;
    delete obj.color;
    if (look.parts) obj.parts = look.parts;
    if (look.style) obj.style = look.style;
    return true;
  }

  /** Tira o objeto do lote (venda ou penhora) e de todas as filas. */
  private removeObject(objectId: number, quiet = false): void {
    const gone = this.findObject(objectId);
    this.objectStamp++;
    this.world.objects = this.world.objects.filter((o) => o.id !== objectId);
    for (const folk of this.world.folks) {
      const idx = folk.queue.findIndex((a) => a.objectId === objectId);
      folk.queue = folk.queue.filter((a) => a.objectId !== objectId);
      if (idx === 0) folk.path = [];
      // quem ia comer sentado ali come de pé onde estiver
      for (const a of folk.queue) if (a.eatAt === objectId) a.eatAt = -1;
    }
    // bloco 4: o objeto querido foi embora
    const def = gone && this.defOf(gone);
    const sad = gone && !quiet ? missBeloved(this.world, gone) : null;
    if (sad && def) this.log('log.missesBeloved', { name: sad.name, object: def.name });
    this.replanAll();
  }

  /** Objetos mudaram: refaz a navegação e manda quem anda replanejar. */
  private replanAll(): void {
    this.invalidateNav();
    for (const folk of this.world.folks) {
      const a = folk.queue[0];
      if (a?.phase === 'walking') {
        a.phase = 'queued';
        folk.path = [];
      }
    }
  }

  /** Tira da fila o trabalho por conta própria de um tipo. */
  private dropTasks(folk: Folk, task: 'gig' | 'business'): void {
    const isTask = (a: Action) => this.interactionOf(a)?.task === task;
    if (folk.queue[0] && isTask(folk.queue[0])) folk.path = [];
    folk.queue = folk.queue.filter((a) => !isTask(a));
  }

  /** Tira da fila a ida ao trabalho. */
  private dropWork(folk: Folk): void {
    if (folk.queue[0]?.kind === 'work') folk.path = [];
    folk.queue = folk.queue.filter((a) => a.kind !== 'work');
  }

  /**
   * Bloco 6: o folk recusa a ordem de esforço? Se sim, mostra o motivo no
   * balão (com um gesto) e guarda em `lastRefusal`.
   */
  private refuse(folk: Folk, it: InteractionDef): boolean {
    const why = refusal(this.catalog, folk, it, this.world.tick);
    this.lastRefusal = why;
    if (!why) return false;
    setThought(folk, 'refuse', why, this.world.tick, 12);
    return true;
  }

  private enqueuePlayer(folk: Folk, partial: ActionSeed): boolean {
    if (folk.visit) return this.fail('visitor');
    // bloco 11: bebê não recebe ordens (quem cuida dele é a casa, pelo berço)
    if (folk.age === 'baby') return this.fail('baby');
    if (folk.away) return this.fail('away');
    if (folk.collapsed > 0) return this.fail('collapsed');
    // bloco 14: caído esperando o Seu Sereno, ou preso na piscina
    if (folk.down) return this.fail('down');
    if (folk.adrift) return this.fail('adrift');
    if (!this.appending) {
      // plano 2, bloco 1: a ordem nova vira a ação atual; a fila inteira cai
      // plano 2, bloco 4: a atual sai pela etapa de saída (se tiver) e o prato
      // na mão vai junto quando a ordem nova é de fazer sentado
      while (folk.queue.length > 1) {
        const tail = folk.queue.pop()!;
        const c = tail.kind === 'circle' ? circleOfFolk(this.world, folk.id) : undefined;
        if (c) this.dropFromCircle(folk, c, true);
      }
      this.keepPlate = sitFriendly(this.seedInteraction(partial));
      if (!this.windDown(folk)) while (folk.queue.length > 0) this.abandon(folk);
      this.keepPlate = false;
    } else if (folk.queue.some((a) => a.source === 'auto')) {
      // com Shift, os reflexos (ouvir, acender a luz) saem da frente da ordem
      if (folk.queue[0]?.source === 'auto') this.abandon(folk);
      folk.queue = folk.queue.filter((a) => a.source !== 'auto');
    }
    if (folk.queue.length >= MAX_QUEUE) return this.fail('queueFull');
    folk.queue.push(this.makeAction(partial, 'player'));
    return true;
  }

  /**
   * Plano 2, bloco 1: larga a ação em andamento com uma saída limpa. Quem
   * estava sentado levanta (a postura sai com a ação), o prato fica onde ele
   * está, a conversa e a roda acabam para os dois lados.
   */
  private abandon(folk: Folk): void {
    const action = folk.queue.shift();
    folk.path = [];
    if (!action) return;
    const world = this.world;
    // eatAt só existe depois de pegar a comida: o prato está na mão
    if (action.eatAt !== undefined) {
      const it = this.interactionOf(action);
      if (this.keepPlate && it && action.objectId !== undefined) {
        // plano 2, bloco 4: leva o prato e come sentado onde for
        folk.carry = { kind: 'plate', objectId: action.objectId, interactionId: it.id, left: Math.max(5, it.duration - action.elapsed) };
      } else addMess(world, 'plate', folk.x, folk.y, folk.id);
    }
    if ((action.kind === 'social' || action.kind === 'listen') && action.otherId !== undefined) {
      const other = this.findFolk(action.otherId);
      const head = other?.queue[0];
      if (other && head && (head.kind === 'listen' || head.kind === 'social') && head.otherId === folk.id) {
        other.queue.shift();
        other.path = [];
      }
    }
    if (action.kind === 'circle') {
      const c = circleOfFolk(world, folk.id);
      if (c) this.dropFromCircle(folk, c, true);
    }
    if (folk.outfit === 'work' && action.kind === 'work') folk.outfit = 'day';
    folk.idleTicks = 0;
  }

  /** Plano 2, bloco 4: a interação de uma ordem que ainda não virou ação. */
  private seedInteraction(partial: ActionSeed): InteractionDef | undefined {
    if (partial.kind !== 'use' || partial.objectId === undefined) return undefined;
    return this.interactionOf({ ...partial, id: 0, source: 'player', phase: 'queued', elapsed: 0 } as Action);
  }

  /**
   * Plano 2, bloco 4: em vez de largar de vez, a ação atual passa pela etapa
   * de saída (levantar da cama, por exemplo). Devolve true se ela ficou na
   * frente da fila saindo.
   */
  private windDown(folk: Folk): boolean {
    const head = folk.queue[0];
    if (!head || head.phase !== 'using') return false;
    if (head.stage === 'exit') return true;
    const it = this.interactionOf(head);
    const exit = it && stagesOf(it).exit;
    if (!exit) return false;
    head.stage = 'exit';
    head.stageLeft = exit.minutes;
    folk.path = [];
    return true;
  }

  private makeAction(partial: ActionSeed, source: Action['source']): Action {
    return { id: this.world.nextId++, source, phase: 'queued', elapsed: 0, ...partial };
  }

  // ---------- tick ----------

  /** Avança um minuto de jogo. */
  step(): void {
    const world = this.world;
    world.tick++;
    this.stepBills();
    // bloco 16: as luzes do centro não entram na conta de casa
    if (!world.outing) for (const obj of world.objects) {
      const def = this.catalog.objects[obj.defId];
      // bloco 7: som ligado também gasta luz
      if (shining(obj, def) || playing(obj, def)) world.household.lightMinutes++;
    }
    const minute = world.tick % MINUTES_PER_DAY;
    // bloco 13: o tempo do dia (chuva) e o jardim, de hora em hora
    if (minute === WEATHER_HOUR * 60) rollWeather(world);
    if (minute % 60 === 30) gardenHour(world, this.catalog, this.logger);
    if (world.outing) {
      // bloco 16: no centro não tem entrega, telefone, festa nem gatuno; quem ficou em casa só trabalha e estuda
      this.stepHomeFolks();
      this.stepOuting(minute);
    } else {
      this.stepServices(minute);
      // bloco 14: fogo, socorro, gatuno, Seu Sereno e fantasmas
      this.stepPerils(minute);
      // bloco 9: telefone tocando e festa
      this.stepPhone();
      this.stepParty();
      // bloco 11: bebê a caminho, visitadora social
      this.stepFamily();
    }
    if (minute === COOL_HOUR * 60) {
      coolRelations(world);
      // fofoca anda pela vizinhança; namoros apagados terminam
      spreadNews(world, this.catalog, this.logger);
      dailyHearts(world, this.catalog, this.logger);
      // bloco 8: no domingo de madrugada a vida corre nos lugares de trabalho
      if (Math.floor(world.tick / MINUTES_PER_DAY) % 7 === 6) {
        staffShuffle(world, this.catalog, this.logger);
        // bloco 11: no domingo a criança pega um pouco do jeito de quem mais cuidou dela
        for (const kid of kidsOf(world, 'child')) this.learnFromCare(kid);
      }
    }
    if (minute === BOARD_HOUR * 60) refreshBoard(world, this.catalog);
    // bloco 15: a vida das outras casas do bairro anda uma vez por dia
    if (minute === TOWN_HOUR * 60) {
      townDay(world, this.catalog);
      this.payPensions();
    }
    // bloco 17: relógio da vida
    if (lifeOn(world) && !world.outing) this.stepLife();
    if (minute === 0 && Math.floor(world.tick / MINUTES_PER_DAY) % HABIT_PERIOD_DAYS === 0) this.settleTempers();
    this.stepVisits();
    for (const folk of [...world.folks]) {
      // bloco 14: quem caiu espera o Seu Sereno sem fazer nada
      if (folk.down) {
        folk.px = folk.x;
        folk.py = folk.y;
        continue;
      }
      if (!world.folks.includes(folk)) continue;
      this.stepJob(folk);
      if (inSchool(folk) && !folk.visit) this.stepSchool(folk);
      if (folk.gig) checkGigDeadline(world, this.catalog, this.logger, folk);
      if (folk.business && minute === BUSINESS_CLOSE_HOUR * 60) settleBusiness(world, this.catalog, this.logger, folk);
      this.stepFolk(folk);
    }
    this.stepCircles();
    for (const id of this.departed) this.removeVisitor(id);
    this.departed = [];
    // plano 2, bloco 1: pular volta ao normal quando alguém acorda, chega ou fica livre
    if (world.speed === SKIP_SPEED && !canSkip(world, this.catalog)) world.speed = 1;
    if (world.log.length > MAX_LOG) world.log.splice(0, world.log.length - MAX_LOG);
  }

  /** Bloco 5: o hábito de semanas puxa um eixo do temperamento um ponto. */
  private settleTempers(): void {
    for (const folk of this.residents()) {
      const shift = settleHabits(folk);
      if (!shift) continue;
      this.log(shift.dir > 0 ? 'log.temperUp' : 'log.temperDown', { name: folk.name, axis: `temper.${shift.axis}` });
    }
  }

  /** Quem mora na casa e anda pela casa (não conta visitas nem bebês no berço). */
  residents(): Folk[] {
    return this.world.folks.filter((f) => !f.visit && f.age !== 'baby');
  }

  /** Bloco 11: todo mundo da casa, bebês incluídos (para o limite de moradores e a tela). */
  household(): Folk[] {
    return this.world.folks.filter((f) => !f.visit);
  }

  /** Bloco 11: adultos da casa. */
  adults(): Folk[] {
    return this.world.folks.filter((f) => !f.visit && isAdult(f));
  }

  /** Lê e esvazia os resultados de conversa desde a última chamada. */
  drainOutcomes(): SocialOutcome[] {
    const out = this.outcomes;
    this.outcomes = [];
    return out;
  }

  private log(key: string, params?: Record<string, string | number>): void {
    this.world.log.push({ tick: this.world.tick, key, params });
  }

  /** O log como função, para os módulos de fora (fofoca, trabalho, frilas). */
  private readonly logger = (key: string, params?: Record<string, string | number>): void => this.log(key, params);

  // ---------- contas ----------

  /** As contas chegam pelo correio; quem paga é a casa, na caixa de correio. */
  private stepBills(): void {
    const house = this.world.household;
    if (this.world.tick < house.nextBills) return;
    // bloco 3: as lâmpadas acesas entram na parte da luz
    const light = Math.round((house.lightMinutes ?? 0) * LIGHT_RATE);
    house.lightMinutes = 0;
    // bloco 16: no centro, a conta é da casa guardada
    const out = this.world.outing;
    const here = this.world.objects;
    if (out) this.world.objects = out.home.objects;
    const amount = billAmount(this.world, this.catalog) + light;
    this.world.objects = here;
    const bill = makeBill(this.world, this.catalog, amount - light);
    bill.power += light;
    house.bills.push(bill);
    house.lastBill = amount;
    house.nextBills += BILL_INTERVAL;
    this.log('log.billArrived', { amount: formatMoney(amount), day: Math.floor(bill.due / MINUTES_PER_DAY) + 1 });
  }

  // ---------- bloco 2: jornal, pedidos, faxineira e penhora ----------

  private stepServices(minute: number): void {
    const world = this.world;
    const house = world.household;
    if (minute === PAPER_HOUR * 60) deliverPaper(world);
    const anyone = this.residents().length > 0;
    if (minute === MAID.hour * 60 && house.maid && anyone) this.spawnService('maid', null, MAID.fee);
    // bloco 13: jardineiro de manhã cedo, se houver planta para cuidar
    if (minute === GARDENER.hour * 60 && house.gardener && anyone && hasPlants(world, this.catalog)) {
      this.spawnService('gardener', null, GARDENER.fee);
    }
    if (minute === BAILIFF_HOUR * 60 && anyone && seizableBills(world).length > 0) {
      if (this.spawnService('bailiff', null, 0)) this.log('log.bailiffComing');
    }
    for (const order of house.orders) {
      if (order.at > world.tick) continue;
      const kind = providerOf(order.kind);
      const n = serviceNeighbor(world, kind);
      if (!n) {
        // bairro sem prestador cadastrado: a entrega chega sem ninguém tocar
        if (order.kind === 'groceries') stockPantry(world, this.catalog, GROCERIES.portions);
        else if (order.kind === 'takeout') {
          house.funds -= order.price;
          house.takeout += TAKEOUT.portions;
        }
        order.at = -1;
        continue;
      }
      if (this.findFolk(n.id)) {
        order.at = world.tick + 10; // ainda está em outra entrega aqui: vem depois
        continue;
      }
      let fee = order.price;
      // comida pronta atrasada sai pela metade
      if (order.kind === 'takeout' && world.tick > order.promised) fee = Math.round(fee / 2);
      this.spawnService(kind, order.kind, fee);
      order.at = -1;
    }
    house.orders = house.orders.filter((o) => o.at >= 0);
  }

  /** Um prestador de serviço sai de casa e vem para o lote. */
  private spawnService(kind: ServiceKind, order: ServiceOrder | null, fee: number): boolean {
    const n = serviceNeighbor(this.world, kind);
    if (!n || this.findFolk(n.id)) return false;
    this.spawnVisitor(n, this.world.tick + SERVICE_STAY, 0, {
      kind,
      order,
      fee,
      started: -1,
      done: 0,
      target: 0,
      blame: 0,
    });
    return true;
  }

  /** Ligar para um serviço: vai até o telefone e pede. */
  private callService(folkId: number, service: ServiceOrder): boolean {
    const folk = this.findFolk(folkId);
    if (!folk) return false;
    if (folk.visit) return this.fail('visitor');
    const problem = orderProblem(this.world, service);
    if (problem) return this.fail(problem);
    const phone = this.nearestSpecial(folk, 'services');
    if (!phone) return this.fail('noPhone');
    return this.enqueuePlayer(folk, { kind: 'use', objectId: phone.obj.id, interactionId: phone.it.id, serviceId: service });
  }

  /** O objeto mais perto com uma interação especial (telefone, caixa de correio). */
  private nearestSpecial(folk: Folk, special: NonNullable<InteractionDef['special']>) {
    let best: { obj: WorldObject; it: InteractionDef; d: number } | null = null;
    for (const obj of this.world.objects) {
      const it = this.defOf(obj)?.interactions.find((i) => i.special === special);
      if (!it || obj.state?.broken) continue;
      const d = Math.abs(obj.x - folk.x) + Math.abs(obj.y - folk.y);
      if (!best || d < best.d) best = { obj, it, d };
    }
    return best;
  }

  /** Fim de uma interação especial do bloco 2 (telefone, contas, feira). */
  private resolveHouseSpecial(folk: Folk, it: InteractionDef, action: Action): void {
    if (it.special === 'services' && action.serviceId) placeOrder(this.world, this.logger, folk, action.serviceId);
    else if (it.special === 'payBills') payBills(this.world, this.logger, folk);
    else if (it.special === 'fair') buyAtFair(this.world, this.catalog, this.logger, folk);
    else if (it.special === 'call' && action.otherId !== undefined) this.resolveCall(folk, action.otherId);
    else if (it.special === 'answer') this.resolveAnswer(folk);
    else if (it.special === 'party' && action.guests) this.resolveParty(folk, action.guests, action.wedding);
    else if (it.special === 'buffet') this.setBuffet(folk, action);
    else if (it.special === 'unpack') this.unpack(folk, action);
    else if (it.special === 'adopt') this.adopt(folk);
    // bloco 14
    else if (it.special === 'callFire') this.callHelp(folk, 'fire');
    else if (it.special === 'callPolice') this.callHelp(folk, 'police');
    else if (it.special === 'honor') this.honor(folk, action);
    // bloco 16
    else if (it.special === 'buyGift' || it.special === 'buyClothes' || it.special === 'buyParcel' || it.special === 'wishCoin') this.shopSpecial(folk, it);
    else if (it.special === 'kindle' || it.special === 'smother') {
      this.hearthSpecial(folk, action.objectId !== undefined ? this.findObject(action.objectId) : undefined, it);
    }
  }

  // ---------- trabalho ----------

  /** Chama o folk para o turno, ou marca a falta quando a condução já foi. */
  private stepJob(folk: Folk): void {
    const job = folk.job;
    const level = job && levelOfJob(this.catalog, job);
    if (!job || !level || folk.away) return;
    const tick = this.world.tick;
    const day = Math.floor(tick / MINUTES_PER_DAY);
    // um turno pode começar antes da meia-noite do dia anterior ser resolvido
    for (const d of [day - 1, day, day + 1]) {
      const shift = shiftOn(level, d);
      if (!shift || job.doneDay >= d) continue;
      if (tick === shift.start - CALL_AHEAD && job.calledDay !== d) {
        // bloco 8: a carona encosta na calçada e buzina; o folk veste o uniforme
        job.calledDay = d;
        job.honkDay = -1;
        if (folk.collapsed === 0) {
          folk.queue = folk.queue.filter((a) => a.source !== 'auto');
          const cur = folk.queue[0];
          if (cur) cur.phase = 'queued';
          folk.path = [];
          folk.queue.unshift(this.makeAction({ kind: 'work' }, 'player'));
          if (folk.queue.length > MAX_QUEUE) folk.queue.length = MAX_QUEUE;
          folk.outfit = 'work';
        }
        this.log('log.workCall', { name: folk.name });
      }
      if (job.calledDay === d && job.honkDay !== d && tick === shift.start + RIDE_GRACE - HONK_AGAIN) {
        job.honkDay = d;
        this.log('log.rideHonk', { name: folk.name });
      }
      if (job.calledDay === d && tick > shift.start + RIDE_GRACE) {
        job.doneDay = d;
        this.dropWork(folk);
        job.performance = Math.max(-100, job.performance - MISSED_PENALTY);
        this.log('log.missedWork', { name: folk.name });
        this.checkFired(folk);
      }
    }
  }

  /** Chegou à calçada: sai para o trabalho. */
  private depart(folk: Folk): void {
    const job = folk.job;
    const level = job && levelOfJob(this.catalog, job);
    if (!job || !level) {
      this.finish(folk);
      return;
    }
    const tick = this.world.tick;
    const shift = shiftOn(level, job.calledDay);
    if (!shift || job.doneDay >= job.calledDay) {
      this.finish(folk);
      return;
    }
    job.doneDay = job.calledDay;
    // bloco 8: vai de uniforme
    folk.outfit = 'work';
    const start = Math.max(tick, shift.start);
    folk.away = {
      until: shift.end,
      late: Math.max(0, tick - shift.start),
      mood: moodOf(this.catalog, folk.needs),
      event: null,
      nextEvent: planEvent(this.world, start, shift.end, EVENT_CHANCE),
    };
    // bloco 8: consequência marcada para hoje sempre acontece
    if (chainDue(folk, start) && folk.away.nextEvent < 0) folk.away.nextEvent = start + 30;
    meetWorkplace(this.world, this.catalog, this.logger, folk);
    folk.queue = [];
    folk.path = [];
    folk.idleTicks = 0;
    this.log(folk.away.late > 0 ? 'log.leftLate' : 'log.leftForWork', { name: folk.name });
  }

  /** Um minuto fora de casa, no turno. */
  private stepAway(folk: Folk): void {
    const away = folk.away!;
    const job = folk.job;
    const career = !away.school && job ? careerOf(this.catalog, job) : undefined;
    for (const id of NEED_IDS) {
      if (id === 'ambience') continue;
      const rate = this.catalog.needs[id].decayPerMinute * (AWAY_DECAY[id] ?? 1);
      const extra = career?.shiftEffects[id] ?? 0;
      folk.needs[id] = clampNeed(folk.needs[id] - rate + extra);
    }
    // ninguém desmaia no serviço: chega em casa no bagaço, mas chega
    folk.needs.energy = Math.max(3, folk.needs.energy);
    // bloco 11: na escola tem merenda
    if (inSchool(folk) && away.school) folk.needs.hunger = Math.max(folk.needs.hunger, SCHOOL_LUNCH);
    else this.stepWorkEvent(folk);
    if (this.world.tick >= away.until) {
      if (inSchool(folk) && away.school) this.backFromSchool(folk);
      else this.comeHome(folk);
    }
  }

  /** Eventos do expediente: começa na hora sorteada; sem escolha do jogador, o folk decide. */
  private stepWorkEvent(folk: Folk): void {
    const away = folk.away!;
    const tick = this.world.tick;
    if (away.event && tick >= away.event.deadline) this.autoResolve(folk);
    if (!away.event && away.nextEvent >= 0 && tick >= away.nextEvent) {
      away.nextEvent = -1;
      if (startWorkEvent(this.world, this.catalog, this.logger, folk) && away.until - tick > 150) {
        // às vezes o dia rende mais uma história
        away.nextEvent = planEvent(this.world, tick + 60, away.until, SECOND_EVENT_CHANCE);
      }
    }
  }

  private autoResolve(folk: Folk): void {
    const ev = folk.away?.event;
    const def = ev && this.catalog.workEvents[ev.defId];
    if (!ev || !def) {
      if (folk.away) folk.away.event = null;
      return;
    }
    const choice = autoChoice(this.world, this.catalog, folk, def, ev.actorId);
    resolveWorkEvent(this.world, this.catalog, this.logger, folk, choice, true);
  }

  private comeHome(folk: Folk): void {
    const away = folk.away!;
    folk.away = null;
    folk.x = folk.px = this.world.exit.x;
    folk.y = folk.py = this.world.exit.y;
    folk.facing = { x: 0, y: -1 };
    folk.idleTicks = 0;
    if (away.event) {
      // folk volta para casa: o evento que ficou sem resposta ele decide sozinho
      folk.away = away;
      this.autoResolve(folk);
      folk.away = null;
    }
    const job = folk.job;
    const level = job && levelOfJob(this.catalog, job);
    if (!job || !level) return;

    const pay = payFor(this.catalog, job);
    this.world.household.funds += pay;
    job.shifts++;
    const avgMood = (away.mood + moodOf(this.catalog, folk.needs)) / 2;
    const score = shiftScore(this.catalog, folk, job, avgMood, away.late) + workRelationTerm(this.world, folk);
    job.performance = Math.max(-100, Math.min(100, job.performance + score));
    this.log('log.backFromWork', { name: folk.name, pay: formatMoney(pay) });
    workplaceShift(this.world, this.catalog, folk, score);
    resolveRaise(this.world, this.catalog, this.logger, folk);

    const career = careerOf(this.catalog, job);
    // bloco 17: meio período de jovem não tem promoção
    const next = job.partTime ? undefined : career?.levels[job.level + 1];
    if (next && job.performance >= PROMOTE_AT) {
      const blocked = bossBlocks(this.world, folk, job.level + 1);
      if (Object.keys(missingSkills(folk, next)).length > 0) {
        this.log('log.needSkills', { name: folk.name });
      } else if (missingFriends(this.world, next) > 0) {
        // bloco 8: sem amigos da família, a promoção não sai
        this.log('log.needFriends', { name: folk.name, n: missingFriends(this.world, next) });
      } else if (blocked > 0) {
        this.log('log.bossHeldBack', { name: folk.name });
      } else {
        job.level++;
        job.performance = PERFORMANCE_AFTER_PROMOTION;
        job.raise = 0;
        this.log('log.promoted', { name: folk.name, job: next.title, pay: formatMoney(next.pay) });
        createNews(this.world, this.catalog, this.logger, 'promoted', folk.id, 0);
        this.unlockRewards(folk);
        // bloco 17: o cargo mais alto vai para o álbum
        if (career && job.level === career.levels.length - 1) {
          addAlbum(this.world, { kind: 'topJob', who: [folk.id], names: [folk.name], params: { job: next.title } });
        }
      }
    }
    this.checkFired(folk);
  }

  /** Bloco 8: o cargo novo libera objetos de recompensa no catálogo. */
  private unlockRewards(folk: Folk): void {
    const job = folk.job;
    if (!job) return;
    const h = this.world.household;
    h.unlocked ??= [];
    for (const def of Object.values(this.catalog.objects)) {
      const r = def.reward;
      if (!r || r.career !== job.careerId || job.level < r.level || h.unlocked.includes(def.id)) continue;
      h.unlocked.push(def.id);
      this.log('log.rewardUnlocked', { name: folk.name, object: def.name });
    }
  }

  private checkFired(folk: Folk): void {
    if (!folk.job) return;
    const byBoss = bossFed(this.world, folk);
    if (folk.job.performance > FIRE_AT && !byBoss) return;
    folk.job = null;
    this.dropWork(folk);
    this.log(byBoss ? 'log.firedByBoss' : 'log.fired', { name: folk.name });
    createNews(this.world, this.catalog, this.logger, 'fired', folk.id, 0);
  }

  private stepFolk(folk: Folk): void {
    folk.px = folk.x;
    folk.py = folk.y;
    if (folk.age === 'baby') {
      this.stepBaby(folk);
      return;
    }

    if (folk.away) {
      this.stepAway(folk);
      return;
    }

    // bloco 14: chamas, fome no zero, piscina sem escadinha; e o luto pesa na diversão
    if (this.stepDanger(folk) || folk.down) return;
    if (folk.mourning !== undefined) {
      if (folk.mourning <= this.world.tick) delete folk.mourning;
      else folk.needs.fun = Math.max(0, folk.needs.fun - 0.05);
    }

    if (folk.collapsed > 0) {
      decayNeeds(this.world, this.catalog, folk, 0.5);
      folk.needs.energy = Math.min(NEED_MAX, folk.needs.energy + COLLAPSE_ENERGY_PER_MINUTE);
      folk.collapsed--;
      if (folk.collapsed === 0) this.log('log.wakeUp', { name: folk.name });
      return;
    }

    const current = folk.queue[0];
    const using = current?.phase === 'using' ? this.interactionOf(current) : undefined;
    decayNeeds(this.world, this.catalog, folk, using?.decayScale ?? 1);

    const v = folk.visit;
    if (v?.service) {
      // quem está trabalhando não para por fome nem sono: veio para o serviço
      for (const id of NEED_IDS) folk.needs[id] = Math.max(folk.needs[id], 70);
    }
    this.checkFailures(folk);
    if (folk.collapsed > 0) return;
    if (!v) this.stepWill(folk, using);

    if (v && !v.leaving && !v.admitted) {
      this.stepDoorside(folk);
      return;
    }
    if (v?.service && !v.leaving) {
      this.stepWorker(folk);
      return;
    }

    if (folk.queue.length === 0) {
      folk.idleTicks++;
      // plano 2, bloco 1: só visita decide sozinha; morador parado espera ordem e só tem reflexos
      if (folk.idleTicks >= IDLE_BEFORE_AUTO) {
        if (v) this.pickAutonomous(folk);
        else this.reflex(folk);
      }
    } else {
      folk.idleTicks = 0;
    }

    // plano 2, bloco 4: sentado no sofá (TV em frente, prato no colo) ou levantando
    if (!this.stepPosture(folk)) this.processAction(folk);
    // bloco 9: parado à toa no mesmo tile de outra pessoa? dá um passo para o lado
    if (folk.queue.length === 0 && !folk.posture) this.spreadOut(folk);
    if (folk.x !== folk.px || folk.y !== folk.py) this.leftRoom(folk);
  }

  // ---------- plano 2, bloco 4: postura ----------

  /**
   * Um minuto de quem está sentado: confere se o assento ainda existe, levanta
   * (etapa de saída) quando a ação da vez não se faz sentado ali, e enquanto
   * fica sentado aproveita a TV ligada em frente, o som e o fogo, e come o
   * prato que trouxe. Devolve true quando o minuto foi gasto levantando.
   */
  private stepPosture(folk: Folk): boolean {
    const head = folk.queue[0];
    if (folk.carry && !folk.posture && !(head && sitFriendly(this.interactionOf(head)) || head?.eatAt !== undefined)) this.putPlateDown(folk);
    const p = folk.posture;
    if (!p) return false;
    const at = seatedPlace(this.world, this.nav, this.catalog, folk);
    if (!at || folk.away || folk.collapsed > 0 || folk.down || Math.abs(at.cell.x - folk.x) + Math.abs(at.cell.y - folk.y) > 1) {
      this.standUp(folk);
      return false;
    }
    if (p.rising !== undefined) {
      p.rising--;
      if (p.rising > 0) return true;
      this.standUp(folk);
      return false;
    }
    // plano 2, bloco 7: sentou para conversar e o outro ainda está vindo sentar do lado
    if (head?.sitWith && head.phase === 'queued' && this.waitSeatMate(folk, head)) {
      this.seatedTick(folk, undefined);
      return true;
    }
    if (head && !keepsPosture(this.world, this.catalog, this.nav, folk, head, this.interactionOf(head))) {
      // fogo, porta, trabalho e escola: levanta num pulo
      if (head.kind === 'panic' || head.kind === 'douse' || head.kind === 'work' || head.kind === 'school' || head.kind === 'leave' || head.kind === 'door') {
        this.standUp(folk);
        return false;
      }
      p.rising = RISE;
      folk.path = [];
      return true;
    }
    this.seatedTick(folk, head);
    return false;
  }

  /** Levanta de vez (sai da postura); o prato que estava no colo fica ali. */
  private standUp(folk: Folk): void {
    delete folk.posture;
    delete folk.react;
    if (folk.carry) this.putPlateDown(folk);
  }

  private putPlateDown(folk: Folk): void {
    delete folk.carry;
    addMess(this.world, 'plate', folk.x, folk.y, folk.id);
  }

  /**
   * Sentado: o assento dá um pouco de conforto, a TV ligada em frente (o som,
   * o fogo) segue rendendo mesmo conversando, e o prato no colo vai sendo
   * comido.
   */
  private seatedTick(folk: Folk, head: Action | undefined): void {
    const using = head?.phase === 'using' && head.stage === undefined ? this.interactionOf(head) : undefined;
    const busySeat = !!using && (sitsOn(using) || head!.eatAt !== undefined);
    if (!head) folk.needs.comfort = Math.min(100, folk.needs.comfort + SEAT_COMFORT);
    if (!isWatch(using)) {
      for (const obj of passiveShows(this.world, this.catalog, this.nav, folk)) {
        const def = this.defOf(obj)!;
        this.showTick(folk, obj, def, PASSIVE);
      }
    }
    // prato no colo: come sentado, até encher ou acabar a comida
    const c = folk.carry;
    if (c && !busySeat) {
      const src = this.findObject(c.objectId);
      const it = src && this.defOf(src)?.interactions.find((i) => i.id === c.interactionId);
      c.left--;
      if (it) applyEffects(folk, { effects: { hunger: it.effects.hunger ?? 1 } } as InteractionDef);
      if (!it || c.left <= 0 || folk.needs.hunger >= NEED_MAX) {
        if (!folk.visit) this.log('log.ateSeated', { name: folk.name });
        this.putPlateDown(folk);
      }
    }
  }

  /**
   * Um minuto vendo (ou ouvindo) o que o objeto passa: o canal mexe na
   * diversão, ensina (culinária) e arranca reações. `k` = 1 assistindo de
   * propósito, menos só por estar ali.
   */
  private showTick(folk: Folk, obj: WorldObject, def: ObjectDef, k: number): void {
    const view = viewOf(def);
    if (!view) return;
    const tick = this.world.tick;
    if (view.kind === 'tv') {
      const ch = channelDef(obj.channel);
      if (!ch) return;
      const watch = def.interactions.find((i) => i.id === 'watch');
      const base = watch?.effects.fun ?? 1;
      const kid = folk.age === 'child';
      // assistindo de propósito, a diversão base já veio da interação; aqui só o que o canal muda
      const fun = k >= 1 ? base * ((kid ? ch.kidFun : ch.fun) - 1) : base * (kid ? ch.kidFun : ch.fun) * k;
      folk.needs.fun = Math.max(0, Math.min(NEED_MAX, folk.needs.fun + fun));
      if (ch.effects) applyEffects(folk, { effects: scaled(ch.effects, k) } as InteractionDef);
      if (ch.skill && !kid) this.trainCare(folk, { skill: { id: ch.skill.id, xpPerMinute: ch.skill.xpPerMinute * k } } as InteractionDef);
      if ((!folk.react || folk.react.until <= tick) && chance(tick, folk.id, 9) === 0) {
        folk.react = { kind: ch.reacts[chance(tick + 7, folk.id, ch.reacts.length)], until: tick + 2 };
      }
    } else if (k < 1) {
      // som tocando no cômodo e fogo aceso na lareira, para quem está sentado perto
      if (view.kind === 'music') folk.needs.fun = Math.min(NEED_MAX, folk.needs.fun + 0.5 * k);
      else folk.needs.comfort = Math.min(NEED_MAX, folk.needs.comfort + 0.6 * k);
    }
  }

  /** Bloco 9: quem está à toa em cima de outra pessoa sai para um tile livre do lado. */
  private spreadOut(folk: Folk): void {
    const world = this.world;
    const crowded = world.folks.some((f) => f !== folk && !f.away && f.x === folk.x && f.y === folk.y);
    if (!crowded || (folk.x === world.exit.x && folk.y === world.exit.y)) return;
    for (const d of [
      { x: 0, y: 1 },
      { x: 1, y: 0 },
      { x: 0, y: -1 },
      { x: -1, y: 0 },
    ]) {
      const x = folk.x + d.x;
      const y = folk.y + d.y;
      if (!this.nav.canStep(folk.x, folk.y, x, y)) continue;
      if (world.folks.some((f) => f !== folk && !f.away && f.x === x && f.y === y)) continue;
      folk.facing = d;
      folk.x = x;
      folk.y = y;
      return;
    }
  }

  // ---------- bloco 6: vontade, desejos e despertador ----------

  private stepWill(folk: Folk, using: InteractionDef | undefined): void {
    const tick = this.world.tick;
    const asleep = !!using && isSleep(using);
    if (asleep) {
      // o despertador toca antes do turno; quem dorme sem ele acorda quando a energia enche
      if (folk.alarm && (folk.job || inSchool(folk)) && wakeTime(this.catalog, folk, tick) === tick) {
        this.finish(folk);
        folk.idleTicks = IDLE_BEFORE_AUTO;
        setThought(folk, 'alarm', 'alarm', tick, 6);
        this.log('log.alarm', { name: folk.name });
      }
      return;
    }
    if (wishesDue(folk, tick)) rollWishes(this.world, this.catalog, folk);
    if ((tick + folk.id) % THINK_EVERY === 0) think(this.world, this.catalog, folk, using);
  }

  // ---------- bloco 3: luz ----------

  /** Acende ou apaga a luminária (o interruptor é instantâneo). */
  private switchLight(obj: WorldObject, on: boolean): void {
    if (!!obj.lit === on) return;
    obj.lit = on;
  }

  /**
   * Antes de começar alguma coisa num cômodo escuro, quem mora na casa vai
   * acender a luz mais perto. Devolve true se a ação de acender entrou na frente.
   */
  private lightUp(folk: Folk): boolean {
    if (folk.visit) return false;
    const map = roomsOf(this.world, this.catalog);
    const room = roomAt(map, folk.x, folk.y);
    if (!room || !isDark(this.world, this.catalog, map, room)) return false;
    let best: { obj: WorldObject; d: number } | null = null;
    for (const obj of lightsIn(this.world, this.catalog, map, room)) {
      if (obj.lit) continue;
      const d = Math.abs(obj.x - folk.x) + Math.abs(obj.y - folk.y);
      if (!best || d < best.d) best = { obj, d };
    }
    if (!best) return false;
    folk.queue.unshift(this.makeAction({ kind: 'use', objectId: best.obj.id, interactionId: 'lightOn' }, 'auto'));
    folk.path = [];
    if (folk.queue.length > MAX_QUEUE) folk.queue.length = MAX_QUEUE;
    return true;
  }

  /** Quem vai dormir apaga as luzes do cômodo, se não houver mais ninguém acordado ali. */
  private lightsOutForSleep(folk: Folk): void {
    const map = roomsOf(this.world, this.catalog);
    const room = roomAt(map, folk.x, folk.y);
    if (!room || room.outdoor) return;
    const awake = this.world.folks.some(
      (f) => f !== folk && !f.away && roomAt(map, f.x, f.y) === room && !this.sleeping(f),
    );
    if (awake) return;
    for (const obj of lightsIn(this.world, this.catalog, map, room)) this.switchLight(obj, false);
    // bloco 7: e desliga o som do cômodo
    for (const obj of stereosIn(this.world, this.catalog, map, room)) delete obj.tune;
  }

  /**
   * Bloco 7: um minuto com som. Quem dança com a estação de que gosta se
   * diverte mais (e menos com a que não gosta); quem dorme com som ligado no
   * cômodo descansa menos.
   */
  private soundTick(folk: Folk, action: Action, it: InteractionDef): void {
    if (it.pose === 'dance') {
      const obj = this.findObject(action.objectId ?? -1);
      if (obj && playing(obj, this.defOf(obj))) applyEffects(folk, { effects: { fun: danceBonus(folk, obj.tune) } } as InteractionDef);
      return;
    }
    if (!isSleep(it) || (it.effects.energy ?? 0) <= 0) return;
    const map = roomsOf(this.world, this.catalog);
    const room = roomAt(map, folk.x, folk.y);
    if (!room || stereosIn(this.world, this.catalog, map, room).length === 0) return;
    applyEffects(folk, { effects: { energy: -(it.effects.energy ?? 0) * NOISY_SLEEP } } as InteractionDef);
    if (action.elapsed === 30 && !folk.visit) this.log('log.noisySleep', { name: folk.name });
  }

  private sleeping(folk: Folk): boolean {
    const a = folk.queue[0];
    if (a?.phase !== 'using') return folk.collapsed > 0;
    const it = this.interactionOf(a);
    return !!it && isSleep(it);
  }

  /**
   * Saiu de um cômodo que ficou vazio com a luz acesa: conforme o traço,
   * apaga ao passar (o desleixado quase nunca, o caprichoso quase sempre).
   */
  private leftRoom(folk: Folk): void {
    if (folk.visit) return;
    const map = roomsOf(this.world, this.catalog);
    const from = roomAt(map, folk.px, folk.py);
    if (!from || from.outdoor || from === roomAt(map, folk.x, folk.y)) return;
    const lit = lightsIn(this.world, this.catalog, map, from).filter((o) => o.lit);
    // bloco 7: o som esquecido ligado entra na mesma conta
    const loud = stereosIn(this.world, this.catalog, map, from);
    if (lit.length === 0 && loud.length === 0) return;
    if (this.world.folks.some((f) => f !== folk && !f.away && roomAt(map, f.x, f.y) === from)) return;
    if (nextFloat(this.world) >= saverOf(this.catalog, folk)) return;
    for (const obj of lit) this.switchLight(obj, false);
    for (const obj of loud) delete obj.tune;
  }

  private checkFailures(folk: Folk): void {
    if (folk.needs.bladder <= 0) {
      folk.needs.bladder = NEED_MAX;
      folk.needs.hygiene = Math.min(folk.needs.hygiene, 12);
      folk.needs.comfort = Math.min(folk.needs.comfort, 30);
      // e sobra uma poça para alguém secar
      addMess(this.world, 'puddle', folk.x, folk.y, folk.id);
      this.log('log.accident', { name: folk.name });
    }
    const sleeping = folk.queue[0]?.phase === 'using' && (this.interactionOf(folk.queue[0])?.effects.energy ?? 0) > 0;
    if (folk.needs.energy <= 0 && !sleeping) {
      folk.collapsed = COLLAPSE_MINUTES;
      folk.queue = [];
      folk.path = [];
      this.log('log.collapse', { name: folk.name });
    }
  }

  /**
   * Plano 2, bloco 1: o mínimo que o jogador não conseguiria mandar a tempo.
   * Fogo perto: corre. Gatuno perto: leva o susto. O resto (ouvir quem
   * puxa conversa, acordar com o despertador, sair da frente) já anda sozinho.
   */
  private reflex(folk: Folk): void {
    const world = this.world;
    if (folk.down || folk.age === 'baby') return;
    if (world.fires.length > 0) {
      const fire = nearestFire(world, folk, REFLEX_FIRE);
      if (fire) {
        folk.idleTicks = 0;
        folk.queue.push(this.makeAction({ kind: 'panic', target: { x: fire.x, y: fire.y } }, 'auto'));
        return;
      }
    }
    const thief = this.burglar();
    if (thief && !thief.visit?.leaving && reach(world, folk, thief) <= 6 && folk.thought?.kind !== 'fear') {
      setThought(folk, 'fear', 'burglar', world.tick, 30);
    }
  }

  private pickAutonomous(folk: Folk): void {
    folk.idleTicks = 0;
    // bloco 14: fogo e gatuno passam na frente de tudo
    if (this.perilWish(folk)) return;
    if (this.answerIfRinging(folk)) return;
    // bloco 9: atender o telefone e entrar (ou puxar) uma roda de conversa
    if (this.answerPhoneIfRinging(folk)) return;
    if (this.circleWish(folk)) return;
    // bloco 11: bebê chorando chama os adultos; criança com lição vai fazer
    if (this.babyWish(folk)) return;
    if (this.homeworkWish(folk)) return;
    const choice = chooseAutonomous(this.world, this.catalog, folk, this.nav);
    if (!choice) return;
    if (choice.socialId !== undefined) {
      folk.queue.push(this.makeAction({ kind: 'social', otherId: choice.otherId, socialId: choice.socialId }, 'auto'));
      return;
    }
    if (choice.messId !== undefined) {
      folk.queue.push(this.makeAction({ kind: 'tidy', messId: choice.messId }, 'auto'));
      return;
    }
    folk.queue.push(
      this.makeAction(
        { kind: 'use', objectId: choice.objectId, interactionId: choice.interactionId, serviceId: choice.serviceId },
        'auto',
      ),
    );
  }

  private finish(folk: Folk): void {
    const done = folk.queue.shift();
    folk.path = [];
    // bloco 8: depois do banho ou do sono, o uniforme fica no cabide
    if (folk.outfit === 'work' && done?.phase === 'using' && this.interactionOf(done)?.wear) folk.outfit = 'day';
  }

  /** Anda um tile pelo caminho. 'moved' = andou; 'blocked' = o mundo mudou; 'arrived' = sem caminho a andar. */
  private stepAlong(folk: Folk, action: Action): 'moved' | 'blocked' | 'arrived' | 'waiting' {
    const next = folk.path[0];
    if (!next) return 'arrived';
    if (!this.nav.canStep(folk.x, folk.y, next.x, next.y)) {
      action.phase = 'queued'; // replaneja no próximo tick
      folk.path = [];
      return 'blocked';
    }
    // bloco 9: alguém parado na frente? espera, depois contorna; sem jeito, passa
    if (this.giveWay(folk, next)) return 'waiting';
    folk.blocked = 0;
    folk.path.shift();
    // bloco 12: no passo da escada para o andar de cima, a frente é a da escada
    let dy = next.y - folk.y;
    if (Math.abs(dy) > 1) dy -= Math.sign(dy) * this.nav.stride;
    folk.facing = { x: next.x - folk.x, y: dy };
    folk.x = next.x;
    folk.y = next.y;
    return 'moved';
  }

  private processAction(folk: Folk): void {
    const action = folk.queue[0];
    if (!action) return;
    if (action.kind === 'social') {
      this.processSocial(folk, action);
      return;
    }
    if (action.kind === 'listen') {
      this.processListen(folk, action);
      return;
    }
    if (action.kind === 'tidy') {
      this.processTidy(folk, action);
      return;
    }
    if (action.kind === 'meal') {
      this.processMeal(folk, action);
      return;
    }
    if (action.kind === 'door') {
      this.processDoor(folk, action);
      return;
    }
    if (action.kind === 'circle') {
      this.processCircle(folk, action);
      return;
    }
    // bloco 14: apagar fogo e pânico
    if (action.kind === 'douse') {
      this.processDouse(folk, action);
      return;
    }
    if (action.kind === 'panic') {
      this.processPanic(folk, action);
      return;
    }
    // plano 2, bloco 7: olhar pela janela e dar tchau da porta
    if (action.kind === 'window' || action.kind === 'gesture') {
      this.processStill(folk, action);
      return;
    }

    // plano 2, bloco 6: cozinhar começa pela geladeira
    if (action.phase === 'queued' && action.kind === 'use' && !action.cook && this.interactionOf(action)?.cook) {
      if (!this.startCook(folk, action)) return;
    }
    if (action.phase === 'queued') {
      const path = this.planPath(folk, action);
      if (!path) {
        if (action.kind === 'leave') {
          this.departed.push(folk.id); // sem caminho até a rua: sai assim mesmo
          return;
        }
        this.log('log.noPath', { name: folk.name });
        this.finish(folk);
        return;
      }
      folk.path = path;
      action.phase = 'walking';
    }

    if (action.phase === 'walking') {
      const moved = this.stepAlong(folk, action);
      if (moved === 'blocked' || moved === 'waiting') return;
      if (moved === 'moved') {
        if (folk.path.length > 0) return;
        if (action.kind === 'goto') this.finish(folk);
        return; // chegou: começa a usar no próximo minuto
      }
      if (action.kind === 'goto') {
        this.finish(folk);
        return;
      }
      if (action.kind === 'work') {
        this.depart(folk);
        return;
      }
      if (action.kind === 'school') {
        this.departSchool(folk);
        return;
      }
      if (action.kind === 'leave') {
        this.departed.push(folk.id);
        return;
      }
      // bloco 14: pegou o extintor; agora corre até o fogo
      if (action.kind === 'use' && this.interactionOf(action)?.special === 'douse') {
        action.kind = 'douse';
        action.armed = true;
        action.phase = 'queued';
        action.target = undefined;
        folk.path = [];
        return;
      }
      if (action.eatAt !== undefined) {
        // bloco 4: chegou à mesa com a comida; acende a luz se estiver escuro
        if (!action.lightChecked) {
          action.lightChecked = true;
          if (this.lightUp(folk)) {
            action.phase = 'queued';
            return;
          }
        }
        const seat = action.eatAt >= 0 ? this.findObject(action.eatAt) : undefined;
        const sd = seat && this.defOf(seat);
        // plano 2, bloco 4: cadeira e sofá têm lugar certo; senta nele (ou espera vagar)
        if (seat && sd && isSeat(sd) && action.slot !== undefined) {
          if (!this.seatFree(folk, action, seat.id)) return;
          action.phase = 'using';
          this.sitDown(folk, action, seat.id, action.slot);
          return;
        }
        action.phase = 'using';
        if (seat) {
          action.slot = this.freeSlot(seat.id, folk);
          const d = this.defOf(seat);
          if (d) {
            const t = nearestFootprintTile(seat, d, folk);
            if (t.x !== folk.x || t.y !== folk.y) folk.facing = { x: Math.sign(t.x - folk.x), y: Math.sign(t.y - folk.y) };
          }
        }
        return; // senta e começa a comer no próximo minuto
      }
      const obj = action.objectId !== undefined ? this.findObject(action.objectId) : undefined;
      const odef = obj && this.defOf(obj);
      // plano 2, bloco 4: o assento escolhido (sofá, assento para ver TV) ainda está livre?
      const pre = this.interactionOf(action);
      const seatId = action.seatAt ?? (obj && odef && sitsOn(pre) && isSeat(odef) ? obj.id : pre?.seated ? folk.posture?.objectId : undefined);
      if (seatId !== undefined && !pre?.seated && !this.seatFree(folk, action, seatId)) return;
      const shared = isWatch(pre) || pre?.channel === 'off' || !!pre?.seated || !!pre?.served || seatId !== undefined;
      if (!shared && obj && odef && this.usingCount(obj.id, folk) >= (odef.slots ?? 1)) {
        // ocupado: espera um pouco e desiste
        action.waited = (action.waited ?? 0) + 1;
        if (action.waited > WAIT_LIMIT) {
          this.log('log.objectBusy', { name: folk.name, object: odef.name });
          this.finish(folk);
        }
        return;
      }
      const it = this.interactionOf(action);
      if (obj && odef && it && !interactionOpen(obj, it)) {
        // quebrou (ou já limparam) enquanto vinha
        if (it.canvas) this.log(it.canvas === 'paint' ? 'log.canvasDone' : 'log.noCanvas', { name: folk.name });
        else if (!it.care && !it.snacks) this.log('log.foundBroken', { name: folk.name, object: odef.name });
        this.finish(folk);
        return;
      }
      if (it && !interactionReady(this.world, it)) {
        // a comida acabou (ou as contas já foram pagas) enquanto vinha
        if (it.portions || it.takeout) this.log('log.noFood', { name: folk.name });
        this.finish(folk);
        return;
      }
      if (it && !it.light && !action.lightChecked) {
        // bloco 3: cômodo escuro? acende a luz primeiro (dormir dispensa)
        // plano 2, bloco 4: TV no escuro é gostoso, e quem já está sentado não levanta para isso
        action.lightChecked = true;
        if (!isSleep(it) && !isWatch(it) && !folk.posture && this.lightUp(folk)) {
          action.phase = 'queued';
          return;
        }
      }
      if (it && action.source === 'player' && !it.step && !action.served && this.refuse(folk, it)) {
        // bloco 6: chegou lá e não quis (o humor caiu no caminho)
        this.log(`log.refused.${this.lastRefusal}`, { name: folk.name });
        this.finish(folk);
        return;
      }
      const cost = it?.cost ?? 0;
      if (cost > 0) {
        if (this.world.household.funds < cost) {
          this.log('log.noMoney', { name: folk.name });
          this.finish(folk);
          return;
        }
        this.world.household.funds -= cost;
      }
      // plano 2, bloco 6: cochilar no sofá pega o sofá inteiro
      if (obj && odef && it?.pose === 'lie' && odef.category === 'seating' && this.sofaTaken(folk, obj)) {
        action.waited = (action.waited ?? 0) + 1;
        if (action.waited > WAIT_LIMIT) {
          this.log('log.objectBusy', { name: folk.name, object: odef.name });
          this.finish(folk);
        }
        return;
      }
      if (it) consumeFor(this.world, it);
      // plano 2, bloco 6: deitou, a cama fica desfeita
      if (obj && odef && it?.pose === 'lie' && it.onObject && odef.category === 'beds') obj.unmade = true;
      // bloco 14: quem cozinha mal pode pôr fogo no fogão
      if (obj && odef && it && this.cookingFire(folk, obj, odef, it)) return;
      // bloco 9: petisco sai da mesa; atender e ligar já sabem com quem falam
      if (obj && it?.snacks === 'eat') obj.snacks = Math.max(0, (obj.snacks ?? 0) - 1);
      if (it?.special === 'answer') {
        const call = this.world.call;
        if (!call || (call.answeredBy && call.answeredBy !== folk.id)) {
          this.log('log.callGone', { name: folk.name });
          this.finish(folk);
          return;
        }
        call.answeredBy = folk.id;
        action.otherId = call.from;
      }
      if (it?.special === 'call' && action.otherId === undefined) action.otherId = this.callTarget(folk);
      if (it?.atTable) {
        // bloco 4: com o prato pronto, procura um lugar à mesa
        // plano 2, bloco 4: sem mesa por perto, come no sofá (ou na poltrona)
        const table = findSeat(this.world, this.catalog, this.nav, folk);
        const couch = table && table.steps > 0 && table.steps <= SEAT_REACH ? null : couchSeat(this.world, this.catalog, this.nav, folk, SEAT_REACH);
        const spot = couch ? { seat: couch.seat, steps: Math.max(1, couch.path.length) } : table;
        if (spot && spot.steps > 0 && spot.steps <= SEAT_REACH) {
          action.eatAt = spot.seat.id;
          action.lightChecked = false;
          action.phase = 'queued';
          folk.path = [];
          return;
        }
      }
      if (obj && it?.light) this.switchLight(obj, it.light === 'on');
      // bloco 7: botão do som; dançar com o som desligado liga na estação preferida
      if (obj && it?.tune) pressTune(obj, it, folk);
      if (obj && (it?.pose === 'dance' || it?.watch) && !obj.tune && isStereo(this.defOf(obj))) obj.tune = favoriteStation(folk).id;
      if (it && isSleep(it)) this.lightsOutForSleep(folk);
      if (action.eatAt === undefined) {
        action.phase = 'using';
        if (seatId !== undefined && action.slot !== undefined) this.sitDown(folk, action, seatId, action.slot);
        else {
          if (obj) action.slot = this.freeSlot(obj.id, folk);
          this.faceObject(folk, action);
        }
        // plano 2, bloco 4: etapa de entrada (deitar) e a TV ligando no canal
        const enter = it && !action.picked && stagesOf(it).enter;
        if (it?.jog && !this.startJog(folk, action)) return;
        if (enter && action.stage === undefined) {
          action.stage = 'enter';
          action.stageLeft = enter.minutes;
        }
        if (obj && odef && it && viewOf(odef)?.kind === 'tv') {
          if (it.channel === 'off') delete obj.channel;
          else if (it.channel) obj.channel = it.channel;
          else if (isWatch(it) && !obj.channel) obj.channel = favoriteChannel(folk);
        }
        if (obj && it?.couple) this.callPartner(folk, obj, it);
      }
      // plano 2, bloco 4: o minuto de sentar (deitar) é só isso; o laço começa no próximo
      if (action.stage === 'enter') return;
    }

    if (action.phase === 'using') {
      const it = this.interactionOf(action);
      if (!it) {
        this.finish(folk);
        return;
      }
      // plano 2, bloco 4: etapas de entrada (sentar, deitar) e de saída (levantar)
      if (action.stage === 'enter') {
        action.stageLeft = (action.stageLeft ?? 1) - 1;
        if (action.stageLeft <= 0) {
          delete action.stage;
          delete action.stageLeft;
        }
        return;
      }
      if (action.stage === 'exit') {
        action.stageLeft = (action.stageLeft ?? 1) - 1;
        if (action.stageLeft <= 0) {
          const then = (action.then ?? null) as Chain;
          this.finish(folk);
          this.chain(folk, then, action.source);
        }
        return;
      }
      // plano 2, bloco 7: pegou o livro na estante; agora procura onde sentar para ler
      if (it.browse && !action.picked && this.goRead(folk, action)) return;
      // bloco 16: no restaurante, só come depois que o prato chega
      if (it.special === 'dine' && this.dineWait(folk, action, it)) return;
      // plano 2, bloco 6: a porção servida rende pelo prato, pelo ponto e pela temperatura
      if (action.served) applyEffects(folk, { effects: this.servedEffects(action.served) } as InteractionDef);
      else applyEffects(folk, it);
      // plano 2, bloco 4: assistindo: o canal muda a diversão, ensina e faz reagir
      if (isWatch(it)) {
        const shown = this.findObject(action.objectId!);
        const sd = shown && this.defOf(shown);
        if (shown && sd && viewOf(sd)?.kind === 'tv') {
          if (!shown.channel) {
            this.finish(folk);
            return;
          }
          this.showTick(folk, shown, sd, 1);
        }
        if (action.seatAt !== undefined) folk.needs.comfort = Math.min(NEED_MAX, folk.needs.comfort + SEAT_COMFORT);
      }
      // bloco 11: cuidar do bebê do berço (termina quando o que ele pedia encheu)
      if (it.baby) {
        const crib = this.findObject(action.objectId!);
        const baby = crib && babyIn(this.world, crib);
        if (!baby || babyCareTick(baby, it.baby, folk.id)) {
          if (baby) this.babyCared(folk, baby, it.baby);
          this.finish(folk);
          return;
        }
      }
      this.soundTick(folk, action, it);
      if (!folk.visit) wishOnUse(this.world, this.catalog, this.logger, folk, it);
      const used = this.findObject(action.objectId!);
      const usedDef = used && this.defOf(used);
      if (used && usedDef && !it.care) this.furnishTick(folk, action, used, usedDef, it);
      if (used && usedDef) {
        if (!it.care) wearTick(this.catalog, folk, used, usedDef);
        else if (careTick(this.world, this.catalog, this.logger, folk, used, usedDef, it)) {
          this.trainCare(folk, it);
          if (it.care === 'repair') this.shockFire(folk, used);
          if (!folk.visit) wishOnTidy(this.world, this.catalog, this.logger, folk);
          this.finish(folk);
          this.chain(folk, afterCare(used, it), action.source);
          return;
        }
      }
      if (it.task === 'gig') {
        const obj = this.findObject(action.objectId!);
        if (!obj || !taskFits(this.catalog, folk, 'gig', obj.defId) || workGig(this.world, this.catalog, this.logger, folk)) {
          this.finish(folk);
          return;
        }
      } else if (it.task === 'business') {
        const obj = this.findObject(action.objectId!);
        if (!obj || !taskFits(this.catalog, folk, 'business', obj.defId)) {
          this.finish(folk);
          return;
        }
        workBusiness(this.catalog, this.logger, folk);
      }
      // plano 2, bloco 7: livro, trabalho que avança, quadro, corrida e conversa à distância
      if (this.hobbyTick(folk, action, it, used)) return;
      this.trainCare(folk, it.book ? this.bookTraining(folk, it) : it);
      action.elapsed++;
      // plano 2, bloco 6: etapa do cozinhar acabou: passa para a próxima (em outro objeto)
      if (action.cook && it.step) {
        if (action.elapsed >= action.cook.minutes) this.nextCookStep(folk, action, it);
        return;
      }
      const full = it.until !== undefined && folk.needs[it.until] >= NEED_MAX;
      if (action.elapsed >= it.duration || full) {
        // bloco 5: guarda-roupa troca a roupa de sempre
        if (it.dress && folk.outfit !== it.dress) {
          folk.outfit = it.dress;
          if (!folk.visit) this.log('log.dressed', { name: folk.name, outfit: `outfit.${it.dress}` });
        }
        // bloco 11: lição feita conta no boletim de amanhã
        if (it.homework && folk.kid?.homework === 'due') {
          folk.kid.homework = 'done';
          this.log('log.homeworkDone', { name: folk.name });
        }
        if (it.special === 'invite' && action.otherId !== undefined) this.resolveInvite(folk, action.otherId);
        else if (it.special) this.resolveHouseSpecial(folk, it, action);
        let next: Chain = null;
        if (used && usedDef) {
          // bloco 13: colher vai para a despensa; replantar volta a muda; pular sem escadinha cansa
          if (it.care === 'harvest') harvest(this.world, this.catalog, this.logger, folk, used, usedDef);
          else if (it.care === 'replant') replant(used, usedDef);
          if (it.pose === 'dive') this.afterDive(folk, used, usedDef);
          next = it.care ? afterCare(used, it) : afterUse(this.world, this.catalog, this.logger, folk, used, usedDef, it);
        }
        if (action.served) this.ateServed(folk, action.served);
        // plano 2, bloco 7: vender o quadro, começar outro, procurar emprego
        if (used && it.canvas) this.canvasDone(folk, used, it);
        if (it.jobHunt) this.jobHunt(folk);
        if (it.browse && !folk.visit && !next && used && this.putBookBack(folk, action)) {
          // o caprichoso leva o livro de volta para a estante de onde tirou
          this.finish(folk);
          folk.queue.unshift(this.makeAction({ kind: 'use', objectId: used.id, interactionId: 'returnBook' }, action.source));
          folk.path = [];
          return;
        }
        // plano 2, bloco 6: depois da privada lava as mãos; quem é caprichoso arruma a cama ao levantar
        if (!next && it.after && !folk.visit) next = it.after;
        if (!next && !folk.visit && used && usedDef?.category === 'beds' && used.unmade && it.pose === 'lie' && tidyOf(this.catalog, folk) >= 1.2) next = 'makeBed';
        // plano 2, bloco 4: com etapa de saída (levantar da cama), a tarefa seguinte espera
        const exit = stagesOf(it).exit;
        if (exit) {
          action.stage = 'exit';
          action.stageLeft = exit.minutes;
          if (next) action.then = next;
          return;
        }
        this.finish(folk);
        this.chain(folk, next, action.source);
        return;
      }
      if (action.source === 'auto' && action.elapsed % AUTO_RECHECK === 0) {
        this.maybeAbandon(folk, it);
      }
    }
  }

  /**
   * Bloco 13: pulou do trampolim. Sem escadinha na piscina, sai da água a
   * duras penas (no bloco 14, isso vira perigo de verdade).
   */
  private afterDive(folk: Folk, obj: WorldObject, def: ObjectDef): void {
    const pool = poolOf(this.world, this.catalog, obj, def);
    if (pool.length === 0 || poolHasLadder(this.world, this.catalog, pool)) return;
    // bloco 14: morador fica preso na água até alguém pôr uma escadinha (ou cansar de vez)
    if (!folk.visit && isAdult(folk)) {
      folk.adrift = { ...pool[0] };
      folk.queue = [];
      folk.path = [];
      this.log('log.adrift', { name: folk.name });
      return;
    }
    folk.needs.energy = Math.max(0, folk.needs.energy - 20);
    folk.needs.comfort = Math.max(0, folk.needs.comfort - 25);
    folk.needs.fun = Math.max(0, folk.needs.fun - 15);
    if (!folk.visit) this.log('log.noLadder', { name: folk.name });
  }

  /**
   * Bloco 4: um minuto de uso conta para a depreciação e o apego; comer
   * sentado à mesa e jogar junto dão um pouco a mais.
   */
  private furnishTick(folk: Folk, action: Action, obj: WorldObject, def: ObjectDef, it: InteractionDef): void {
    if (countUse(folk, obj, def)) this.log('log.beloved', { name: folk.name, object: def.name });
    belovedBonus(folk, obj);
    if (action.eatAt !== undefined && action.eatAt >= 0) {
      applyEffects(folk, { effects: TABLE_BONUS } as InteractionDef);
      for (const other of tableCompany(this.world, folk)) {
        applyEffects(folk, { effects: TABLE_COMPANY } as InteractionDef);
        applyDelta(this.world, this.catalog, folk, other, { friendship: TABLE_FRIENDSHIP });
        if (action.elapsed % 30 === 0) touch(this.world, folk.id, other.id);
        break;
      }
    }
    if (!it.duo) return;
    const partners = duoPartners(this.world, folk, obj.id, it);
    if (partners.length === 0) return;
    applyEffects(folk, { effects: it.duo.effects } as InteractionDef);
    for (const p of partners) {
      // bloco 10: casal na mesma cama (ou abraçadinho) fica mais apaixonado
      const couple = !!it.duo.romance && !!relationOf(this.world, folk.id, p.id)?.dating;
      applyDelta(this.world, this.catalog, folk, p, couple ? { friendship: it.duo.friendship / partners.length, romance: it.duo.romance! } : { friendship: it.duo.friendship / partners.length });
      if (couple && isSleep(it) && addMemory(this.world, this.catalog, folk.id, p.id, 'sleptTogether') && folk.id < p.id) {
        this.log('log.sleptTogether', { name: folk.name, other: p.name });
      }
      if (action.elapsed % 30 === 0) touch(this.world, folk.id, p.id);
      if (addMemory(this.world, this.catalog, folk.id, p.id, 'playedTogether') && folk.id < p.id) {
        this.log('log.playedTogether', { name: folk.name, other: p.name, object: def.name });
      }
    }
  }

  /** Bloco 6: dia inspirado treina em dobro. */
  private trainBoost(folk: Folk): number {
    return isInspired(folk, this.world.tick) ? INSPIRED_TRAINING : 1;
  }

  /** Um minuto de treino da habilidade da interação (avisa quando sobe de nível). */
  private trainCare(folk: Folk, it: InteractionDef): void {
    if (!it.skill) return;
    const up = trainSkill(folk, it, moodOf(this.catalog, folk.needs), this.trainBoost(folk));
    if (up !== null && !folk.visit) {
      const skill = this.catalog.skills[it.skill.id];
      this.log('log.skillUp', { name: folk.name, skill: skill?.name ?? it.skill.id, level: up });
    }
  }

  /**
   * Encadeia o passo seguinte de uma tarefa da casa: levar o prato até a pia,
   * levar o saco de lixo até o latão da calçada (ou até a rua, se não houver).
   */
  private chain(folk: Folk, next: Chain, source: Action['source']): void {
    if (!next) return;
    let best: { obj: WorldObject; it: InteractionDef; d: number } | null = null;
    for (const obj of this.world.objects) {
      const it = this.defOf(obj)?.interactions.find((i) => i.care === next || (!i.care && i.id === next));
      if (!it) continue;
      // plano 2, bloco 6: arrumar só a cama em que dormiu; lavar as mãos só na pia perto
      if (next === 'makeBed' && (!obj.unmade || Math.abs(obj.x - folk.x) + Math.abs(obj.y - folk.y) > 3)) continue;
      let d = Math.abs(obj.x - folk.x) + Math.abs(obj.y - folk.y);
      if (next === 'washHands' && d > 8) continue;
      // plano 2, bloco 8: o prato vai para a lava-louças, se tiver espaço
      if (next === 'dishes' && this.defOf(obj)?.machine === 'dishes') {
        if ((obj.dishes ?? 0) >= DISHWASHER_LOAD) continue;
        d -= 6;
      }
      if (!best || d < best.d) best = { obj, it, d };
    }
    if (best) {
      folk.queue.unshift(this.makeAction({ kind: 'use', objectId: best.obj.id, interactionId: best.it.id }, source));
    } else if (next === 'dump') {
      folk.queue.unshift(this.makeAction({ kind: 'goto', target: { ...this.world.exit } }, source));
    } else {
      return;
    }
    folk.path = [];
    if (folk.queue.length > MAX_QUEUE) folk.queue.length = MAX_QUEUE;
  }

  /** Recolher bagunça: anda até ela, recolhe e leva para onde deve ir. */
  private processTidy(folk: Folk, action: Action): void {
    const mess = this.world.mess.find((m) => m.id === action.messId);
    if (!mess) {
      this.finish(folk);
      return;
    }
    if (action.phase === 'queued') {
      const path = findPathToAny(this.nav, folk, messTiles(this.world, this.nav, mess));
      if (!path) {
        this.log('log.noPath', { name: folk.name });
        this.finish(folk);
        return;
      }
      folk.path = path;
      action.phase = 'walking';
    }
    if (action.phase === 'walking') {
      const moved = this.stepAlong(folk, action);
      if (moved !== 'arrived') return;
      action.phase = 'using';
      action.elapsed = 0;
      if (mess.x !== folk.x || mess.y !== folk.y) folk.facing = { x: mess.x - folk.x, y: mess.y - folk.y };
      return;
    }
    if (mess.kind !== 'plate' && mess.kind !== 'paper' && mess.kind !== 'book') folk.needs.hygiene = Math.max(0, folk.needs.hygiene - 0.08);
    if (mess.kind !== 'paper') this.trainCare(folk, TIDY_GAIN);
    action.elapsed++;
    if (action.elapsed < tidyMinutes(mess.kind, folk)) return;
    // jornal do dia: quem mora lê as notícias e os classificados
    if (freshPaper(this.world, mess) && !folk.visit) readPaper(this.world, this.catalog, this.logger, folk);
    const sv = folk.visit?.service;
    if (sv && mess.by) sv.blame = mess.by;
    const next = finishTidy(this.world, this.catalog, this.logger, folk, mess);
    if (!folk.visit && mess.kind !== 'paper') wishOnTidy(this.world, this.catalog, this.logger, folk);
    this.finish(folk);
    this.chain(folk, next, action.source);
  }

  /** Um folk autônomo larga o que faz se outra necessidade ficou crítica. */
  private maybeAbandon(folk: Folk, it: InteractionDef): void {
    // a campainha tocou e ninguém foi: larga o que faz (menos dormir)
    if (!folk.visit && it.pose !== 'lie' && this.unansweredBell(folk, 3)) {
      this.finish(folk);
      folk.idleTicks = IDLE_BEFORE_AUTO;
      return;
    }
    // bloco 6: passou da hora de deitar (turno amanhã cedo): larga a diversão
    if (!folk.visit && !isSleep(it) && sleepPressure(this.catalog, folk, this.world.tick) >= 0.9) {
      const body = (it.effects.hunger ?? 0) > 0 || (it.effects.bladder ?? 0) > 0 || (it.effects.hygiene ?? 0) > 0;
      if (!body) {
        this.finish(folk);
        folk.idleTicks = IDLE_BEFORE_AUTO;
        return;
      }
    }
    for (const id of NEED_IDS) {
      if (id === 'ambience') continue;
      if (folk.needs[id] < CRITICAL_NEED && (it.effects[id] ?? 0) <= 0) {
        this.finish(folk);
        folk.idleTicks = IDLE_BEFORE_AUTO; // decide de novo já no próximo minuto
        return;
      }
    }
  }

  private planPath(folk: Folk, action: Action) {
    // bloco 15: visita do bairro volta pela calçada para o lado da casa dela
    if (action.kind === 'leave' && folk.visit && !folk.visit.service) return findPath(this.nav, folk, this.streetDoor(folk.id));
    if (action.kind === 'work' || action.kind === 'leave' || action.kind === 'school') return findPath(this.nav, folk, this.world.exit);
    if (action.kind === 'goto') {
      return action.target ? findPath(this.nav, folk, action.target) : null;
    }
    if (action.eatAt !== undefined) {
      // bloco 4: levando o prato até o lugar à mesa (-1 = come onde está)
      const seat = action.eatAt >= 0 ? this.findObject(action.eatAt) : undefined;
      const sdef = seat && this.defOf(seat);
      if (!seat || !sdef) return [];
      // plano 2, bloco 4: assento com lugares (cadeira, sofá): vai até um lugar livre
      if (isSeat(sdef)) {
        const fs = freeSeatSpot(this.world, this.nav, folk, seat, sdef);
        if (fs) {
          action.slot = fs.place.index;
          return fs.path;
        }
      }
      return findPathToAny(this.nav, folk, useTiles(this.world, this.nav, seat, sdef)) ?? [];
    }
    if (action.kind === 'window') return action.target ? findPath(this.nav, folk, action.target) : null;
    // plano 2, bloco 7: com o livro na mão, vai até o assento escolhido
    if (action.picked && action.seatAt !== undefined) {
      const seat = this.findObject(action.seatAt);
      const sd = seat && this.defOf(seat);
      const fs = seat && sd ? freeSeatSpot(this.world, this.nav, folk, seat, sd) : null;
      if (fs) {
        action.slot = fs.place.index;
        return fs.path;
      }
      delete action.seatAt;
      return [];
    }
    const obj = action.objectId !== undefined ? this.findObject(action.objectId) : undefined;
    const def = obj && this.defOf(obj);
    if (!obj || !def) return null;
    // plano 2, bloco 4: lugares, assentos e área de visão
    const it = this.interactionOf(action);
    if (it?.seated) return folk.posture ? [] : null;
    if (isWatch(it) || it?.channel === 'off') {
      if (folk.posture && seatSees(this.world, this.catalog, this.nav, folk, obj, def)) {
        action.seatAt = folk.posture.objectId;
        action.slot = folk.posture.spot;
        return [];
      }
      if (it?.channel !== 'off' && viewOf(def)) {
        const choice = bestSeat(this.world, this.catalog, this.nav, folk, obj, def);
        if (choice) {
          action.seatAt = choice.seat.id;
          action.slot = choice.place.index;
          return choice.path;
        }
      }
      delete action.seatAt;
      // sem assento: de pé na frente (o som se ouve de onde está, no mesmo cômodo)
      if (viewOf(def)?.kind === 'music' && this.inEarshot(folk, obj, def)) return [];
    }
    if (sitsOn(it) && isSeat(def)) {
      const fs = freeSeatSpot(this.world, this.nav, folk, obj, def);
      if (!fs) {
        // todos os lugares ocupados: chega perto e espera um lugar vagar
        delete action.slot;
        return findPathToAny(this.nav, folk, useTiles(this.world, this.nav, obj, def));
      }
      action.slot = fs.place.index;
      return fs.path;
    }
    const tiles = useTiles(this.world, this.nav, obj, def);
    // prefere um lado onde não tenha ninguém em pé
    const free = tiles.filter((t) => !this.world.folks.some((f) => f !== folk && !f.away && f.x === t.x && f.y === t.y));
    return findPathToAny(this.nav, folk, free.length ? free : tiles);
  }

  /**
   * Plano 2, bloco 4: o lugar que a ação reservou continua livre? Se alguém
   * sentou antes, procura outro (volta a planejar) e, depois de esperar
   * demais, desiste.
   */
  private seatFree(folk: Folk, action: Action, seatId: number): boolean {
    if (action.slot !== undefined && !spotOwner(this.world, seatId, action.slot, folk)) return true;
    action.waited = (action.waited ?? 0) + 1;
    if (action.waited > WAIT_LIMIT) {
      const seat = this.findObject(seatId);
      const name = (seat && this.defOf(seat)?.name) ?? 'obj.sofa';
      this.log('log.objectBusy', { name: folk.name, object: name });
      this.finish(folk);
      return false;
    }
    action.phase = 'queued';
    folk.path = [];
    return false;
  }

  /** Plano 2, bloco 4: senta no lugar (etapa de entrada de um minuto, se ainda não estava sentado ali). */
  private sitDown(folk: Folk, action: Action, seatId: number, spot: number): void {
    const p = folk.posture;
    if (p && p.objectId === seatId && p.spot === spot && p.rising === undefined) return;
    folk.posture = { kind: 'sit', objectId: seatId, spot };
    const at = seatedPlace(this.world, this.nav, this.catalog, folk);
    if (at) folk.facing = { ...at.face };
    action.stage = 'enter';
    action.stageLeft = SIT_DOWN;
  }

  /** Plano 2, bloco 4: o que o folk está vendo (TV, lareira) ou ouvindo agora, de propósito ou sentado em frente. */
  watchedBy(folk: Folk): WorldObject | undefined {
    const head = folk.queue[0];
    const it = head && this.interactionOf(head);
    if (head && isWatch(it)) return this.findObject(head.objectId!);
    return passiveShows(this.world, this.catalog, this.nav, folk)[0];
  }

  /** Plano 2, bloco 4: o folk já está onde dá para ouvir o som? */
  private inEarshot(folk: Folk, obj: WorldObject, def: ObjectDef): boolean {
    const area = viewArea(this.world, this.catalog, obj, def);
    return area.has(`${folk.x},${folk.y}`);
  }

  // ---------- objetos de mais de um lugar ----------

  /** Quantos outros folks já estão usando o objeto. */
  private usingCount(objectId: number, except: Folk): number {
    let n = 0;
    for (const f of this.world.folks) {
      const a = f.queue[0];
      if (f !== except && a?.kind === 'use' && occupiedId(a) === objectId && a.phase === 'using') n++;
    }
    return n;
  }

  private freeSlot(objectId: number, except: Folk): number {
    const taken = new Set<number>();
    for (const f of this.world.folks) {
      const a = f.queue[0];
      if (f !== except && a?.kind === 'use' && occupiedId(a) === objectId && a.phase === 'using') taken.add(a.slot ?? 0);
    }
    let slot = 0;
    while (taken.has(slot)) slot++;
    return slot;
  }

  // ---------- conversas ----------

  private processSocial(folk: Folk, action: Action): void {
    const world = this.world;
    const def = action.socialId ? this.catalog.socials[action.socialId] : undefined;
    const other = action.otherId !== undefined ? this.findFolk(action.otherId) : undefined;
    if (!def || !other || other === folk || !onLot(other)) {
      this.endSocial(folk);
      return;
    }

    if (action.phase === 'queued') {
      const path = findPathToAny(this.nav, folk, talkTiles(world, this.nav, other, folk));
      if (!path) {
        this.log('log.cantReach', { name: folk.name, other: other.name });
        this.endSocial(folk);
        return;
      }
      folk.path = path;
      action.target = { x: other.x, y: other.y };
      action.phase = 'walking';
      this.holdTarget(other, folk);
    }

    if (action.phase === 'walking') {
      const t = action.target!;
      if ((other.x !== t.x || other.y !== t.y) && !adjacent(world, folk, other)) {
        // o outro saiu do lugar: corre atrás, até cansar
        action.phase = 'queued';
        folk.path = [];
        if (this.waitOrGiveUp(folk, action, other)) return;
        return;
      }
      const moved = this.stepAlong(folk, action);
      if (moved !== 'arrived') return;
      if (!adjacent(world, folk, other)) {
        action.phase = 'queued';
        return;
      }
      const busy = talkingWith(other);
      const asleep = other.queue[0]?.phase === 'using' && this.interactionOf(other.queue[0])?.pose === 'lie';
      const rushing = other.queue[0] && other.queue[0].phase !== 'using' && other.queue[0].kind !== 'listen' && this.urgent(other);
      if ((busy !== 0 && busy !== folk.id) || asleep || rushing) {
        this.waitOrGiveUp(folk, action, other);
        return;
      }
      this.beginSocial(folk, other, action, def);
      return;
    }

    // conversando
    if (!adjacent(world, folk, other)) {
      this.endSocial(folk); // alguém saiu no meio: não conta
      return;
    }
    // bloco 5: papo de quem mora na casa não segura a campainha tocando sem ninguém ir
    if (action.source === 'auto' && !folk.visit && !other.visit && action.elapsed > 0 && this.unansweredBell(folk, 3)) {
      this.endSocial(folk);
      folk.idleTicks = IDLE_BEFORE_AUTO;
      return;
    }
    const mood = moodOf(this.catalog, folk.needs);
    applyEffects(folk, { effects: def.effects } as InteractionDef);
    applyEffects(other, { effects: def.targetEffects ?? def.effects } as InteractionDef);
    // bloco 9: assunto bom diverte quem ouve; assunto chato cansa
    if (action.topic && action.accepted) {
      other.needs.fun = clampNeed(other.needs.fun + REACTION_FUN[reactionTo(this.catalog, other, action.topic)]);
    }
    // bloco 5: conversar vira hábito (Expansão); ser gentil ou maldoso mexe no Afeto
    countHabit(folk, 'outgoing', 1);
    if (def.category === 'friendly' || def.category === 'romantic') countHabit(folk, 'warmth', 1);
    else if (def.category === 'mean') countHabit(folk, 'warmth', -2);
    if (def.skill) {
      const up = trainSkill(folk, { skill: def.skill } as InteractionDef, mood, this.trainBoost(folk));
      if (up !== null && !folk.visit) {
        const skill = this.catalog.skills[def.skill.id];
        this.log('log.skillUp', { name: folk.name, skill: skill?.name ?? def.skill.id, level: up });
      }
    }
    this.faceEachOther(folk, other);
    action.elapsed++;
    const duration = action.accepted ? def.duration : Math.min(def.duration, REJECT_MINUTES);
    if (action.elapsed >= duration) this.resolveSocial(folk, other, action, def);
  }

  /** Espera um minuto; depois de WAIT_LIMIT desiste. Devolve true se desistiu. */
  private waitOrGiveUp(folk: Folk, action: Action, other: Folk): boolean {
    action.waited = (action.waited ?? 0) + 1;
    if (action.waited <= WAIT_LIMIT) return false;
    this.log('log.gaveUpTalk', { name: folk.name, other: other.name });
    this.endSocial(folk);
    return true;
  }

  /**
   * Pede para `other` esperar quem vem puxar conversa: larga o que fazia por
   * conta própria (ordens do jogador só ficam para depois). Quem está usando
   * um objeto continua usando e conversa assim mesmo.
   */
  private holdTarget(other: Folk, from: Folk): void {
    const head = other.queue[0];
    if (other.collapsed > 0 || other.away) return;
    if (head?.kind === 'listen' && head.otherId === from.id) return;
    if (head?.phase === 'using') return;
    if (head?.kind === 'leave' || head?.kind === 'work') return;
    // bloco 16: garçom com pedido na mão não para para conversar
    if (other.visit?.service?.tray) return;
    // nem com prato pronto ou mesa esperando pedido (senão a mesa desiste)
    if (other.visit?.service?.kind === 'waiter' && this.world.outing?.orders.some((o) => o.stage === 'ready' || o.stage === 'wait')) return;
    // quem está apertado termina o que ia fazer antes de dar atenção
    if (head && this.urgent(other)) return;
    if (head) {
      other.queue = other.queue.filter((a) => a.source !== 'auto');
      const cur = other.queue[0];
      if (cur) cur.phase = 'queued';
      other.path = [];
    }
    other.queue.unshift(this.makeAction({ kind: 'listen', otherId: from.id }, 'auto'));
    other.queue[0].phase = 'using';
    other.idleTicks = 0;
  }

  /** Alguma necessidade do corpo no limite (banheiro, fome, sono)? */
  private urgent(folk: Folk): boolean {
    return folk.needs.bladder < 20 || folk.needs.hunger < 15 || folk.needs.energy < 12;
  }

  private processListen(folk: Folk, action: Action): void {
    const other = action.otherId !== undefined ? this.findFolk(action.otherId) : undefined;
    const theirs = other?.queue[0];
    if (!other || !theirs || theirs.kind !== 'social' || theirs.otherId !== folk.id || !onLot(other)) {
      this.finish(folk);
      return;
    }
    action.elapsed++;
    if (adjacent(this.world, folk, other)) this.faceEachOther(other, folk);
    if (action.elapsed > LISTEN_LIMIT) this.finish(folk);
  }

  private beginSocial(folk: Folk, other: Folk, action: Action, def: SocialDef): void {
    ensureRelation(this.world, folk.id, other.id);
    let p = acceptChance(this.world, this.catalog, folk, other, def);
    // bloco 9: o papo tem assunto; quem ouve topa mais o que gosta
    let reaction: Reaction | null = null;
    if (def.topic) {
      action.topic ??= pickTopic(this.world, this.catalog, folk, [other]);
      reaction = reactionTo(this.catalog, other, action.topic);
      p = Math.max(0.03, Math.min(0.97, p + REACTION_ACCEPT[reaction]));
    }
    // bloco 10: o que sempre vale (votos, divórcio, mudar para fora) nunca falha
    action.accepted = nextFloat(this.world) < p || def.accept >= 1;
    // bloco 6: quem ouve mostra no balão se está gostando da conversa
    const minutes = action.accepted ? def.duration : REJECT_MINUTES;
    if (action.topic && reaction) {
      setThought(folk, 'topic', action.topic, this.world.tick, minutes, other.id);
      setThought(other, 'topic', `${action.topic}${topicMark(action.accepted ? reaction : 'hate')}`, this.world.tick, minutes, folk.id);
    } else setThought(other, 'chat', action.accepted ? 'yes' : 'no', this.world.tick, minutes, folk.id);
    action.phase = 'using';
    action.elapsed = 0;
    folk.path = [];
    this.holdTarget(other, folk);
    this.faceEachOther(folk, other);
  }

  private resolveSocial(folk: Folk, other: Folk, action: Action, def: SocialDef): void {
    const world = this.world;
    const ok = action.accepted === true;
    const bonus: RelDelta = {};
    if (ok && action.topic) {
      const r = reactionTo(this.catalog, other, action.topic);
      bonus.friendship = REACTION_FRIENDSHIP[r];
      catchTopic(this.catalog, other, folk, action.topic, relationOf(world, other.id, folk.id)?.friendship ?? 0);
    }
    if (ok && def.respectFromCharisma) {
      const same = this.careerIdOf(folk) !== null && this.careerIdOf(folk) === this.careerIdOf(other);
      bonus.respect = skillLevel(folk, 'charisma') / 2 + (same ? 2 : 0);
    }
    const toTarget = applyDelta(world, this.catalog, other, folk, (ok ? def.toTarget : def.rejectTarget) ?? {}, bonus);
    const toSelf = applyDelta(world, this.catalog, folk, other, (ok ? def.toSelf : def.rejectSelf) ?? {});
    touch(world, folk.id, other.id);
    const mem = ok ? def.memory : def.rejectMemory;
    const names = { name: folk.name, other: other.name };
    if (mem?.self && addMemory(world, this.catalog, folk.id, other.id, mem.self)) {
      const log = this.catalog.memories[mem.self]?.log;
      if (log) this.log(log, names);
    }
    if (mem?.target) addMemory(world, this.catalog, other.id, folk.id, mem.target);
    if (ok && def.special) this.socialSpecial(folk, other, def.special);
    // bloco 11: adulto que dá atenção à criança conta como quem cuida dela
    if (ok && def.category === 'friendly' && other.kid && isAdult(folk)) {
      other.kid.cares[folk.id] = (other.kid.cares[folk.id] ?? 0) + def.duration;
    }
    if (!ok && def.special === 'engage') this.proposalRefused(folk, other);
    if (!folk.visit) wishOnTalk(world, this.catalog, this.logger, folk, other.id, def, ok);
    if (!other.visit) wishOnTalk(world, this.catalog, this.logger, other, folk.id, def, ok);
    // quem puxou também diz o que achou
    if (!action.topic) setThought(folk, 'chat', ok ? 'yes' : 'no', world.tick, 4, other.id);
    this.socialRipples(folk, other, def, ok, mem?.self);
    this.dateTalk(folk, other, def, ok);
    this.outcomes.push({ fromId: folk.id, toId: other.id, socialId: def.id, accepted: ok, toTarget, toSelf });
    if (this.outcomes.length > 50) this.outcomes.shift();
    this.endSocial(folk);
  }

  /**
   * O que uma conversa provoca além dos dois: gestos românticos com quem
   * namora outra pessoa viram traição, brigas viram notícia, e papo amigável
   * pode render fofoca.
   */
  private socialRipples(folk: Folk, other: Folk, def: SocialDef, ok: boolean, memSelf: string | undefined): void {
    const world = this.world;
    if (ok && def.category === 'romantic' && def.special !== 'breakUp') {
      romanticAct(world, this.catalog, this.logger, folk.id, other.id, onLotWitnesses(world, folk, [folk.id, other.id]));
    }
    if (memSelf === 'fought') {
      createNews(world, this.catalog, this.logger, 'fought', folk.id, other.id, onLotWitnesses(world, folk, [folk.id, other.id]));
    }
    if (ok && def.special === 'gossip') {
      const told = chatGossip(world, this.catalog, this.logger, folk, other, true);
      if (!told) this.log('log.noGossip', { name: folk.name, other: other.name });
    } else if (ok && def.category === 'friendly') {
      chatGossip(world, this.catalog, this.logger, folk, other, false);
    }
  }

  private socialSpecial(folk: Folk, other: Folk, special: NonNullable<SocialDef['special']>): void {
    const names = { name: folk.name, other: other.name };
    if (special === 'date') {
      setDating(this.world, folk.id, other.id, true);
      this.log('log.dating', names);
      createNews(this.world, this.catalog, this.logger, 'dating', folk.id, other.id, onLotWitnesses(this.world, folk, [folk.id, other.id]));
    } else if (special === 'breakUp') {
      breakUp(this.world, this.catalog, this.logger, folk.id, other.id, 'asked');
    } else if (special === 'sendHome') {
      if (other.visit) {
        this.startLeaving(other);
        this.escort(folk, other);
      }
    } else if (special === 'sitTalk') {
      this.sitTogether(folk, other);
    } else if (special === 'moveIn') {
      this.moveIn(other, folk);
    } else if (special === 'engage') {
      this.engage(folk, other);
    } else if (special === 'wed') {
      this.marry(folk, other);
    } else if (special === 'divorce') {
      this.divorce(folk, other);
    } else if (special === 'gift') {
      this.giveGift(folk, other);
    } else if (special === 'tryBaby') {
      this.tryBaby(folk, other);
    } else if (special === 'helpHomework') {
      if (other.kid?.homework === 'due') {
        other.kid.homework = 'done';
        other.kid.cares[folk.id] = (other.kid.cares[folk.id] ?? 0) + HELP_CARE;
        other.skills.logic = (other.skills.logic ?? 0) + 20;
        this.log('log.helpedHomework', names);
      }
    } else if (special === 'moveOut') {
      if (other.visit || !isAdult(other) || this.adults().length < 2) return;
      createNews(this.world, this.catalog, this.logger, 'movedOut', other.id, folk.id, onLotWitnesses(this.world, folk, [folk.id, other.id]));
      this.moveOut(other, 0);
    }
  }

  // ---------- bloco 16: centro da cidade e encontros ----------

  /** Bloco 16: sobe quando o lote em jogo troca sozinho (o centro fechou, todo mundo cansou). */
  lotStamp = 0;

  /** Chama o táxi: quem vai sai do lote de casa e o lote do centro abre. */
  private goDowntown(folkIds: number[], dateId?: number): boolean {
    const world = this.world;
    const ids = [...new Set(folkIds)];
    const problem = outingProblem(world, ids);
    if (problem) return this.fail(problem);
    const plan = this.catalog.venues?.centro;
    if (!plan) return this.fail('noVenue');
    const host = this.findFolk(ids[0])!;
    let guest: Neighbor | undefined;
    let guestId = 0;
    if (dateId !== undefined) {
      if (!isAdult(host) || dateId === host.id) return this.fail('dateBusy');
      const resident = world.folks.find((f) => f.id === dateId && !f.visit);
      if (resident) {
        if (!ids.includes(dateId) || !isAdult(resident)) return this.fail('dateBusy');
        guestId = dateId;
      } else {
        const n = world.neighbors.find((x) => x.id === dateId);
        if (!n || !dateAvailable(n) || !relationOf(world, host.id, n.id)) return this.fail('dateBusy');
        if (nextFloat(world) >= dateChance(world, this.catalog, host, n)) {
          this.log('log.dateRefused', { name: host.name, other: n.name });
          const rel = ensureRelation(world, host.id, n.id);
          rel.romance = Math.max(-100, rel.romance - 2);
          return this.fail('dateRefused');
        }
        guest = n;
        guestId = n.id;
      }
    }
    const tick = world.tick;
    world.household.funds -= TAXI_FARE;
    emptyVisitors(world);
    for (const f of world.folks) settle(f, true);
    const goers = world.folks.filter((f) => ids.includes(f.id));
    const stay = world.folks.filter((f) => !ids.includes(f.id));
    world.outing = {
      venue: plan.id,
      since: tick,
      goers: ids,
      home: { grid: world.grid, objects: world.objects, exit: world.exit, mess: world.mess, folks: stay },
      date: guestId ? { host: host.id, guest: guestId, since: tick, mood: 0, samples: 0, good: 0, bad: 0, dined: 0, gifts: 0, wishes: 0 } : null,
      orders: [],
      parcels: [],
      nextExtra: tick + 10,
    };
    const venue = buildVenue(world, this.catalog, plan);
    world.grid = venue.grid;
    world.objects = venue.objects;
    world.exit = { ...venue.exit };
    world.mess = [];
    world.folks = goers;
    this.town(null);
    const spots = this.curbSpots(goers.length + 1);
    goers.forEach((f, i) => this.putAt(f, spots[i] ?? world.exit));
    // o garçom já está na cozinha da cantina
    const waiter = serviceNeighbor(world, 'waiter');
    if (waiter && !this.findFolk(waiter.id)) {
      this.spawnVisitor(waiter, tick + 24 * 60, 0, { kind: 'waiter', order: null, fee: 0, started: tick, done: 0, target: 0, blame: 0 });
      const w = this.findFolk(waiter.id);
      if (w) this.putAt(w, plan.pass ?? world.exit);
    }
    if (guest) {
      this.spawnVisitor(guest, tick + 24 * 60, host.id);
      const g = this.findFolk(guest.id);
      if (g?.visit) {
        g.visit.admitted = true;
        g.visit.date = true;
        this.putAt(g, spots[goers.length] ?? world.exit);
      }
    }
    this.log('log.taxiDowntown', { names: goers.map((f) => f.name.split(' ')[0]).join(', '), fare: formatMoney(TAXI_FARE) });
    if (world.outing.date) this.log('log.dateStarted', { name: host.name, other: this.nameOfPerson(guestId) });
    return true;
  }

  /** Volta de táxi: a casa abre de novo, quem ficou anda um pouco e as encomendas chegam. */
  private goHome(): boolean {
    const world = this.world;
    const out = world.outing;
    if (!out) return this.fail('notOnOuting');
    this.endDate();
    emptyVisitors(world);
    const back = world.folks.filter((f) => !f.visit);
    world.grid = out.home.grid;
    world.objects = out.home.objects;
    world.exit = { ...out.home.exit };
    world.mess = out.home.mess;
    for (const f of back) settle(f, true);
    for (const f of out.home.folks) {
      settle(f, true);
      if (f.away) continue;
      // vida resumida de quem ficou: nem bem nem mal
      for (const k of NEED_IDS) {
        if (k === 'ambience') continue;
        f.needs[k] = Math.max(f.needs[k], 45 + nextFloat(world) * 25);
      }
    }
    world.folks = [...out.home.folks, ...back];
    world.outing = null;
    world.household.funds -= TAXI_FARE;
    placeAtHome(world, this.catalog, back.filter((f) => !f.away));
    // encomendas do bazar: entram pela porta e vão para o lugar livre mais perto
    for (const defId of out.parcels) {
      const def = this.catalog.objects[defId];
      if (!def) continue;
      const spot = spotNear(world, this.catalog, defId, world.exit, 12);
      if (!spot) {
        world.household.funds += def.price;
        this.log('log.parcelRefund', { object: def.name });
        continue;
      }
      world.objects.push({ id: world.nextId++, defId, x: spot.x, y: spot.y, rot: spot.rot, paid: def.price, state: freshState() });
      this.log('log.parcelArrived', { object: def.name });
    }
    this.log('log.taxiHome', { fare: formatMoney(TAXI_FARE) });
    this.town(null);
    this.lotStamp++;
    return true;
  }

  /** Tiles livres na calçada de dentro do lote, do meio para as pontas. */
  private curbSpots(n: number): Vec[] {
    const { exit } = this.world;
    const out: Vec[] = [];
    for (let d = 0; out.length < n && d < this.world.grid.w; d++) {
      for (const x of d === 0 ? [exit.x] : [exit.x - d, exit.x + d]) {
        const y = exit.y - 1;
        if (this.nav.isFree(x, y) && out.length < n) out.push({ x, y });
      }
    }
    return out;
  }

  private putAt(folk: Folk, at: Vec): void {
    folk.x = folk.px = at.x;
    folk.y = folk.py = at.y;
    folk.facing = { x: 0, y: -1 };
    folk.path = [];
  }

  /** Um minuto no centro: lampiões, encontro, figurantes, restaurante e hora de ir embora. */
  private stepOuting(minute: number): void {
    const world = this.world;
    const out = world.outing!;
    if (minute % 60 === 0) lightVenue(world.objects, this.catalog, world.tick);
    const d = out.date;
    if (d) {
      const a = this.findFolk(d.host);
      const b = this.findFolk(d.guest);
      if (!a || !b || a.away || b.away) this.endDate();
      else if ((world.tick - d.since) % DATE_SAMPLE === 0 && world.tick > d.since) {
        d.mood += (moodOf(this.catalog, a.needs) + moodOf(this.catalog, b.needs)) / 2;
        d.samples++;
      }
    }
    const here = this.residents().filter((f) => !f.away);
    if (minute === CLOSE_HOUR * 60) {
      this.log('log.venueClosing');
      this.goHome();
      return;
    }
    if (here.length === 0 || here.some((f) => f.needs.energy < TIRED_HOME || f.collapsed > 0)) {
      if (here.length) this.log('log.tiredHome', { name: here.find((f) => f.needs.energy < TIRED_HOME || f.collapsed > 0)!.name });
      this.goHome();
      return;
    }
    if (world.tick >= out.nextExtra) {
      out.nextExtra = world.tick + 20 + nextInt(world, 30);
      this.spawnExtra();
    }
    this.stepOrders();
  }

  /** Gente do centro (ou do bairro) passa pelo largo. */
  private spawnExtra(): void {
    const world = this.world;
    const hour = clockOf(world.tick).hour;
    if (hour < 8 || hour >= 23 || world.folks.length >= MAX_ON_LOT_PARTY - 2) return;
    const extras = world.folks.filter((f) => f.visit && !f.visit.service && !f.visit.date);
    if (extras.length >= EXTRAS_MAX) return;
    const town = world.neighbors.filter((n) => n.downtown && !this.findFolk(n.id));
    const street = world.neighbors.filter((n) => n.home !== undefined && !isServiceNeighbor(n) && isAdult(n) && !this.findFolk(n.id));
    const pool = street.length && nextFloat(world) < 0.25 ? street : town;
    if (pool.length === 0) return;
    const n = pool[nextInt(world, pool.length)];
    this.spawnVisitor(n, world.tick + EXTRA_STAY + nextInt(world, EXTRA_STAY), 0);
    const f = this.findFolk(n.id);
    if (!f?.visit) return;
    f.visit.admitted = true;
    this.putAt(f, world.exit);
  }

  /** Pedidos do restaurante: sem garçom, o prato chega sozinho; quem largou a mesa cancela. */
  private stepOrders(): void {
    const world = this.world;
    const out = world.outing!;
    const waiter = world.folks.some((f) => f.visit?.service?.kind === 'waiter' && !f.visit.leaving);
    out.orders = out.orders.filter((o) => {
      const f = this.findFolk(o.folkId);
      const a = f?.queue[0];
      return !!f && a?.kind === 'use' && a.phase === 'using' && this.interactionOf(a)?.special === 'dine';
    });
    for (const o of out.orders) {
      if (o.stage === 'wait' && !waiter) {
        o.stage = 'cooking';
        o.readyAt = world.tick + SELF_SERVE_MINUTES;
      }
      if (o.stage === 'cooking' && world.tick >= o.readyAt) {
        if (waiter) o.stage = 'ready';
        else this.serve(o);
      }
    }
  }

  private serve(o: DinerOrder): void {
    o.stage = 'served';
    const d = this.world.outing?.date;
    const dish = this.catalog.dishes?.[o.dish];
    if (d && dish && (o.folkId === d.host || o.folkId === d.guest)) d.dined += dish.romance * 0.6;
  }

  /** Comer no restaurante: pede, espera o prato e só então come. Devolve true se ainda está esperando. */
  private dineWait(folk: Folk, action: Action, it: InteractionDef): boolean {
    const out = this.world.outing;
    if (!out) return false;
    let order = out.orders.find((o) => o.folkId === folk.id);
    if (!order) {
      order = { folkId: folk.id, tableId: action.objectId ?? 0, dish: it.dish ?? '', stage: 'wait', readyAt: 0, at: this.world.tick };
      out.orders.push(order);
      this.log('log.ordered', { name: folk.name, dish: this.catalog.dishes?.[order.dish]?.name ?? '' });
    }
    if (order.stage === 'served') return false;
    folk.needs.comfort = clampNeed(folk.needs.comfort + 0.6);
    action.waited = (action.waited ?? 0) + 1;
    if (action.waited > ORDER_PATIENCE) {
      // cansou de esperar: levanta e não paga
      this.world.household.funds += it.cost ?? 0;
      out.orders = out.orders.filter((o) => o !== order);
      this.log('log.orderGaveUp', { name: folk.name });
      this.finish(folk);
    }
    return true;
  }

  /** O garçom: anota na mesa, espera na cozinha, leva o prato. */
  private stepWaiter(folk: Folk): void {
    const world = this.world;
    const sv = folk.visit!.service!;
    if (folk.queue.length > 0) {
      this.processAction(folk);
      return;
    }
    const out = world.outing;
    if (!out) {
      this.startLeaving(folk, true);
      return;
    }
    const pass = this.catalog.venues?.[out.venue]?.pass ?? world.exit;
    const job = sv.tray;
    if (job) {
      const order = out.orders.find((o) => o.folkId === job.folkId);
      const diner = order && this.findFolk(order.folkId);
      if (!order || !diner) {
        sv.tray = undefined;
        return;
      }
      if (job.step === 'fetch') {
        if (folk.x === pass.x && folk.y === pass.y) job.step = 'carry';
        else this.walkTo(folk, pass);
        return;
      }
      const near = Math.abs(folk.x - diner.x) + Math.abs(folk.y - diner.y) <= 2;
      if (near || job.tries >= 4) {
        // a mesa inteira de uma vez: anota todos os pedidos dela, ou serve todos os prontos
        const table = out.orders.filter((o) => o.tableId === order.tableId && o.stage === (job.step === 'take' ? 'wait' : 'ready'));
        for (const o of table.length ? table : [order]) {
          const who = this.findFolk(o.folkId);
          const dish = this.catalog.dishes?.[o.dish]?.name ?? '';
          if (job.step === 'take') {
            o.stage = 'cooking';
            o.readyAt = world.tick + COOK_MINUTES;
            this.log('log.orderTaken', { name: folk.name, other: who?.name ?? '', dish });
          } else {
            this.serve(o);
            this.log('log.served', { name: folk.name, other: who?.name ?? '', dish });
          }
        }
        folk.facing = { x: Math.sign(diner.x - folk.x), y: Math.sign(diner.y - folk.y) };
        sv.done++;
        sv.tray = undefined;
        return;
      }
      job.tries++;
      const tiles = talkTiles(world, this.nav, diner, folk);
      const to = tiles.length ? tiles : this.freeAround(diner, 2);
      if (to.length) this.walkTo(folk, to[0]);
      else job.tries = 4;
      return;
    }
    const ready = out.orders.find((o) => o.stage === 'ready');
    const waiting = out.orders.filter((o) => o.stage === 'wait').sort((a, b) => a.at - b.at)[0];
    const next = ready ?? waiting;
    if (next) {
      sv.tray = { folkId: next.folkId, step: next === ready ? 'fetch' : 'take', tries: 0 };
      return;
    }
    if ((folk.x !== pass.x || folk.y !== pass.y) && folk.idleTicks++ > 3) {
      folk.idleTicks = 0;
      this.walkTo(folk, pass);
    }
  }

  private walkTo(folk: Folk, to: Vec): void {
    folk.queue.push(this.makeAction({ kind: 'goto', target: { x: to.x, y: to.y } }, 'auto'));
  }

  /** Tiles livres até `r` passos de alguém (para o garçom chegar perto da mesa). */
  private freeAround(at: Vec, r: number): Vec[] {
    const out: (Vec & { d: number })[] = [];
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        const d = Math.abs(dx) + Math.abs(dy);
        if (d === 0 || d > r) continue;
        const x = at.x + dx;
        const y = at.y + dy;
        if (this.nav.isFree(x, y)) out.push({ x, y, d });
      }
    }
    return out.sort((a, b) => a.d - b.d);
  }

  /** Quem ficou em casa durante o passeio: só o trabalho e a escola andam. */
  private stepHomeFolks(): void {
    const out = this.world.outing;
    if (!out) return;
    for (const f of out.home.folks) {
      if (f.away) {
        this.stepAway(f);
        continue;
      }
      if (f.age === 'baby' || f.down) continue;
      this.stepJob(f);
      if (f.queue[0]?.kind === 'work') this.depart(f);
      if (inSchool(f)) {
        this.stepSchool(f);
        if (f.queue[0]?.kind === 'school') this.departSchool(f);
      }
    }
  }

  /** Conversa entre os dois do encontro conta na nota. */
  private dateTalk(folk: Folk, other: Folk, def: SocialDef, ok: boolean): void {
    const d = this.world.outing?.date;
    if (!d) return;
    const pair = (folk.id === d.host && other.id === d.guest) || (folk.id === d.guest && other.id === d.host);
    if (!pair) return;
    if (ok) d.good += def.category === 'romantic' ? 2 : 1;
    else d.bad++;
  }

  /** Fecha o encontro: nota, estrelas e o que muda entre os dois. */
  private endDate(): void {
    const world = this.world;
    const out = world.outing;
    const d = out?.date;
    if (!out || !d) return;
    out.date = null;
    const names = { name: this.nameOfPerson(d.host), other: this.nameOfPerson(d.guest) };
    if (!dateCounts(world, d)) {
      this.log('log.dateShort', names);
      return;
    }
    const r = dateResult(world, d);
    world.lastDate = r;
    for (const [x, y] of [
      [d.guest, d.host],
      [d.host, d.guest],
    ]) {
      const rel = ensureRelation(world, x, y);
      rel.romance = Math.max(-100, Math.min(100, rel.romance + r.romance));
      rel.friendship = Math.max(-100, Math.min(100, rel.friendship + r.friendship));
      rel.last = world.tick;
      if (r.grade >= 4) addMemory(world, this.catalog, x, y, 'greatDate');
      else if (r.grade <= 2) addMemory(world, this.catalog, x, y, 'badDate');
    }
    this.log(r.grade >= 4 ? 'log.dateGreat' : r.grade <= 2 ? 'log.dateBad' : 'log.dateOk', { ...names, stars: '★'.repeat(r.grade) + '☆'.repeat(5 - r.grade) });
  }

  /** Compras e desejos do centro (fim da interação). */
  private shopSpecial(folk: Folk, it: InteractionDef): void {
    const world = this.world;
    if (it.special === 'buyGift' && it.gift) {
      folk.gifts = [...(folk.gifts ?? []), it.gift];
      this.log('log.boughtGift', { name: folk.name, gift: this.catalog.gifts?.[it.gift]?.name ?? '' });
    } else if (it.special === 'buyClothes') {
      if (it.id === 'formal') {
        folk.look.formal = (folk.look.formal + 1 + nextInt(world, 3)) % 4;
        this.log('log.newFormal', { name: folk.name });
      } else {
        folk.look.shirt = (folk.look.shirt + 1 + nextInt(world, 5)) % 6;
        folk.look.pants = (folk.look.pants + 1 + nextInt(world, 3)) % 4;
        this.log('log.newClothes', { name: folk.name });
      }
    } else if (it.special === 'buyParcel' && it.parcel && world.outing) {
      world.outing.parcels.push(it.parcel);
      this.log('log.parcelOrdered', { name: folk.name, object: this.catalog.objects[it.parcel]?.name ?? '' });
    } else if (it.special === 'wishCoin') {
      const d = world.outing?.date;
      if (d && (d.host === folk.id || d.guest === folk.id)) d.wishes++;
      folk.spark = Math.min(MAX_SPARK, folk.spark + 1);
      this.log('log.wishCoin', { name: folk.name });
    }
  }

  /** "Dar presente": o primeiro presente da sacola vai para o outro. */
  private giveGift(folk: Folk, other: Folk): void {
    const id = folk.gifts?.shift();
    const def = id ? this.catalog.gifts?.[id] : undefined;
    if (!def) return;
    const romantic = romanceAllowed(folk, other);
    applyDelta(this.world, this.catalog, other, folk, { friendship: def.friendship, romance: romantic ? def.romance : 0 });
    const d = this.world.outing?.date;
    if (d && ((d.host === folk.id && d.guest === other.id) || (d.guest === folk.id && d.host === other.id))) d.gifts++;
    this.log('log.gaveGift', { name: folk.name, other: other.name, gift: def.name });
  }

  // ---------- bloco 15: bairro ----------

  /** Depois de trocar de família ou de casa: lote novo, caminhos novos, nada para desfazer. */
  private town(problem: TownProblem | null): boolean {
    if (problem) return this.fail(problem);
    this.prepare();
    this.undoStack = [];
    this.buyStack = [];
    this.invalidateNav();
    this.objectStamp++;
    return true;
  }

  /**
   * Bloco 15: ponta da calçada por onde chega (e para onde volta) quem mora
   * no bairro, do lado da casa dela; sem caminho por ali, usa a condução.
   */
  streetDoor(personId: number): { x: number; y: number } {
    const world = this.world;
    const side = streetSide(world, personId);
    if (side === 0) return { ...world.exit };
    const x = side < 0 ? 0 : world.grid.w - 1;
    const at = { x, y: world.exit.y };
    if (!this.nav.isFree(at.x, at.y) || !findPath(this.nav, at, world.exit)) return { ...world.exit };
    return at;
  }

  // ---------- bloco 10: vida a dois ----------

  /**
   * Visita vira moradora: o emprego vem junto, as economias entram no caixa
   * da casa e a mala fica no chão até ela desfazer (aí saem os móveis dela).
   */
  private moveIn(other: Folk, host: Folk): boolean {
    const names = { name: host.name, other: other.name };
    if (!other.visit || this.household().length >= MAX_RESIDENTS) {
      this.log('log.houseFull', names);
      return false;
    }
    const n = this.world.neighbors.find((x) => x.id === other.id);
    other.visit = null;
    this.world.neighbors = this.world.neighbors.filter((x) => x.id !== other.id);
    if (n?.bornName) other.bornName = n.bornName;
    // bloco 17: a fase, os pais e a aposentadoria vêm junto
    if (n) {
      copyLife(n, other);
      fitKid(other, this.world.tick);
    }
    // quem se muda traz o emprego junto
    const career = n?.career && this.catalog.careers[n.career.id] ? n.career : null;
    other.job = career ? { ...newJob(career.id), level: Math.min(career.level, this.catalog.careers[career.id].levels.length - 1) } : null;
    if (n?.boss) this.log('log.bossMovedIn', names);
    this.log('log.movedIn', names);
    // bloco 15: quem tinha casa no bairro leva a parte dele do dinheiro da família
    const money = n ? leaveFamily(this.world, n) : 0;
    if (money > 0) {
      this.world.household.funds += money;
      this.log('log.movedInMoney', { name: other.name, amount: money });
    }
    const bag = placeFree(this.world, this.catalog, 'suitcase', other);
    if (bag) {
      other.queue = other.queue.filter((a) => a.source === 'player');
      other.queue.unshift(this.makeAction({ kind: 'use', objectId: bag.id, interactionId: 'unpack' }, 'player'));
      other.path = [];
      this.replanAll();
    } else this.unpackFor(other);
    return true;
  }

  /** Desfazer a mala: a mala some e os móveis de quem chegou aparecem. */
  private unpack(folk: Folk, action: Action): void {
    if (action.objectId !== undefined) this.removeObject(action.objectId);
    this.unpackFor(folk);
  }

  private unpackFor(folk: Folk): void {
    const got: string[] = [];
    let sold = 0;
    for (const defId of belongingsOf(this.catalog, folk)) {
      const def = this.catalog.objects[defId];
      if (placeFree(this.world, this.catalog, defId, folk)) got.push(defId);
      else sold += Math.round(def.price / 2);
    }
    for (const id of got) this.log('log.unpacked', { name: folk.name, item: this.catalog.objects[id].name });
    if (sold > 0) {
      this.world.household.funds += sold;
      this.log('log.noRoomSold', { name: folk.name, amount: sold });
    }
    this.replanAll();
  }

  /**
   * Morador vira vizinho: o emprego vai junto, frila e negócio acabam, leva
   * `money` do caixa e sai pela calçada com a mala na mão.
   */
  private moveOut(folk: Folk, money: number): boolean {
    const world = this.world;
    if (folk.visit || folk.away || !isAdult(folk) || this.adults().length < 2) return false;
    const c = circleOfFolk(world, folk.id);
    if (c) this.dropFromCircle(folk, c, true);
    const take = Math.max(0, Math.min(money, world.household.funds));
    world.household.funds -= take;
    const n: Neighbor = {
      id: folk.id,
      name: folk.name,
      traits: [...folk.traits],
      look: { ...folk.look },
      temper: { ...folk.temper },
      month: folk.month,
      skills: { ...folk.skills },
      career: folk.job ? { id: folk.job.careerId, level: folk.job.level } : null,
      interests: folk.interests ? { ...folk.interests } : undefined,
      funds: take,
    };
    if (folk.bornName) n.bornName = folk.bornName;
    world.neighbors = world.neighbors.filter((x) => x.id !== folk.id);
    world.neighbors.push(n);
    if (folk.business) this.log('log.businessGone', { name: folk.name });
    folk.job = null;
    folk.gig = null;
    folk.business = null;
    folk.wishes = [];
    folk.alarm = false;
    folk.collapsed = 0;
    folk.visit = { until: world.tick, leaving: false, hostId: 0, admitted: true, rang: -1, service: null, moving: true };
    this.log(take > 0 ? 'log.movedOutMoney' : 'log.movedOut', { name: folk.name, amount: take });
    this.startLeaving(folk);
    return true;
  }

  /** Pedido aceito: noivado, o estojo da aliança sai da casa e vira notícia. */
  private engage(folk: Folk, other: Folk): void {
    const ring = ringOnLot(this.world, this.catalog);
    if (ring) this.removeObject(ring.id);
    setBond(this.world, folk.id, other.id, 'engaged');
    this.log('log.engaged', { name: folk.name, other: other.name });
    createNews(this.world, this.catalog, this.logger, 'engaged', folk.id, other.id, onLotWitnesses(this.world, folk, [folk.id, other.id]));
  }

  /** Pedido recusado: vira fofoca (e dói). */
  private proposalRefused(folk: Folk, other: Folk): void {
    folk.needs.comfort = Math.max(0, folk.needs.comfort - 15);
    folk.needs.fun = Math.max(0, folk.needs.fun - 10);
    this.log('log.proposalRefused', { name: folk.name, other: other.name });
    createNews(this.world, this.catalog, this.logger, 'proposalRefused', folk.id, other.id, onLotWitnesses(this.world, folk, [folk.id, other.id]));
  }

  /** Votos trocados: casados, sobrenome novo, festa animada e quem é de fora se muda. */
  private marry(folk: Folk, other: Folk): void {
    const world = this.world;
    const party = world.party;
    const wedding = party?.wedding;
    // quem deu a festa é o "host" na escolha do sobrenome
    const hostFirst = !party || party.host === folk.id;
    const [host, partner] = hostFirst ? [folk, other] : [other, folk];
    setBond(world, folk.id, other.id, 'married');
    const choice: SurnameChoice = wedding?.surname ?? 'keep';
    const [hn, pn] = weddingNames(host.name, partner.name, choice);
    const before = { name: host.name, other: partner.name };
    rename(world, host.id, hn);
    rename(world, partner.id, pn);
    this.log('log.married', before);
    addAlbum(world, { kind: 'wedding', who: [host.id, partner.id], names: [hn, pn] });
    if (hn !== before.name || pn !== before.other) this.log('log.newNames', { name: hn, other: pn });
    const guests = world.folks.filter((f) => f !== folk && f !== other && onLot(f) && !f.visit?.service);
    for (const g of guests) {
      g.needs.fun = Math.min(100, g.needs.fun + 12);
      g.needs.social = Math.min(100, g.needs.social + 10);
      addMemory(world, this.catalog, g.id, folk.id, 'atWedding');
      addMemory(world, this.catalog, g.id, other.id, 'atWedding');
      applyDelta(world, this.catalog, g, folk, { friendship: 3 });
      applyDelta(world, this.catalog, g, other, { friendship: 3 });
    }
    createNews(world, this.catalog, this.logger, 'wedding', folk.id, other.id, guests.map((g) => g.id));
    if (wedding) wedding.stage = 'done';
    // casou com alguém de fora: muda para a casa (se couber)
    const outsider = [folk, other].find((f) => f.visit);
    if (outsider) {
      const resident = outsider === folk ? other : folk;
      if (this.household().length < MAX_RESIDENTS) {
        if (outsider.visit) outsider.visit.party = false;
        this.moveIn(outsider, resident);
      } else this.log('log.marriedApart', { name: outsider.name });
    }
  }

  /** Divórcio: casamento desfeito, lembrança amarga, fofoca e a divisão do dinheiro. */
  private divorce(folk: Folk, other: Folk): void {
    const world = this.world;
    if (bondOf(world, folk.id, other.id) !== 'married') return;
    setDating(world, folk.id, other.id, false);
    applyDelta(world, this.catalog, other, folk, { romance: -45, friendship: -18 });
    applyDelta(world, this.catalog, folk, other, { romance: -30, friendship: -8 });
    addMemory(world, this.catalog, folk.id, other.id, 'divorced');
    addMemory(world, this.catalog, other.id, folk.id, 'gotDivorced');
    other.needs.comfort = Math.max(0, other.needs.comfort - 25);
    other.needs.fun = Math.max(0, other.needs.fun - 20);
    const names = { name: folk.name, other: other.name };
    restoreName(world, folk.id);
    restoreName(world, other.id);
    this.log('log.divorce', names);
    createNews(world, this.catalog, this.logger, 'divorce', folk.id, other.id, onLotWitnesses(world, folk, [folk.id, other.id]));
    // os dois moravam juntos: quem foi deixado sai levando metade do caixa
    if (!folk.visit && !other.visit && this.residents().length >= 2) {
      const share = Math.max(0, Math.floor(world.household.funds * DIVORCE_SHARE));
      this.moveOut(other, share);
    }
  }

  /** Marca o casamento: liga para os convidados pelo telefone (como a festa). */
  private planWedding(folkId: number, partnerId: number, guestIds: number[], surname: SurnameChoice): boolean {
    const folk = this.findFolk(folkId);
    if (!folk) return false;
    if (folk.visit) return this.fail('visitor');
    if (this.world.party) return this.fail('partyOn');
    if (bondOf(this.world, folk.id, partnerId) !== 'engaged') return this.fail('notEngaged');
    const guests = [...new Set(guestIds)].filter((id) => {
      if (id === partnerId) return false;
      const n = this.world.neighbors.find((x) => x.id === id);
      return n && !isServiceNeighbor(n);
    });
    if (guests.length > PARTY_MAX_GUESTS) return this.fail('invalid');
    const best = this.nearestSpecial(folk, 'party');
    if (!best) return this.fail('noPhone');
    return this.enqueuePlayer(folk, { kind: 'use', objectId: best.obj.id, interactionId: best.it.id, guests, wedding: { partner: partnerId, surname } });
  }

  /** Par de quem quer se aconchegar: cônjuge, noivo ou namorado no lote. */
  private sweetheartOf(folk: Folk): Folk | undefined {
    const ids = [spouseOf(this.world, folk.id), fianceOf(this.world, folk.id), ...partnersOf(this.world, folk.id)];
    for (const id of ids) {
      const f = id ? this.findFolk(id) : undefined;
      if (f && onLot(f) && !(f.visit && !f.visit.admitted)) return f;
    }
    return undefined;
  }

  /** Bloco 10: coisa de casal começou; o par vem junto se puder. */
  private callPartner(folk: Folk, obj: WorldObject, it: InteractionDef): void {
    const p = this.sweetheartOf(folk);
    if (!p || p.visit) return;
    const head = p.queue[0];
    if (head?.kind === 'use' && head.objectId === obj.id) return;
    if (head?.kind === 'work' || head?.source === 'player' || talkingWith(p) !== 0 || this.urgent(p)) return;
    if (head?.kind === 'use' && head.phase === 'using' && this.interactionOf(head)?.pose === 'lie') return;
    p.queue = p.queue.filter((a) => a.source === 'player');
    p.queue.unshift(this.makeAction({ kind: 'use', objectId: obj.id, interactionId: it.id }, 'player'));
    p.path = [];
    this.log('log.snuggleCall', { name: folk.name, other: p.name });
  }

  /** Termina a conversa de quem puxou e libera quem ouvia. */
  private endSocial(folk: Folk): void {
    const action = folk.queue[0];
    const other = action?.otherId !== undefined ? this.findFolk(action.otherId) : undefined;
    this.finish(folk);
    const head = other?.queue[0];
    if (other && head?.kind === 'listen' && head.otherId === folk.id) this.finish(other);
  }

  private faceEachOther(a: Folk, b: Folk): void {
    const dx = Math.sign(b.x - a.x);
    const dy = Math.sign(b.y - a.y);
    if (dx === 0 && dy === 0) return;
    a.facing = { x: dx, y: dy };
    // quem está usando um objeto continua virado para ele
    if (b.queue[0]?.kind !== 'use' || b.queue[0].phase !== 'using') b.facing = { x: -dx, y: -dy };
  }

  private careerIdOf(folk: Folk): string | null {
    if (folk.job) return folk.job.careerId;
    return this.world.neighbors.find((n) => n.id === folk.id)?.career?.id ?? null;
  }

  // ---------- campainha ----------

  /** Visitante do lado de fora: anda até a porta, toca e espera alguém atender. */
  private stepDoorside(folk: Folk): void {
    const v = folk.visit!;
    if (folk.queue.length > 0) {
      this.processAction(folk);
      return;
    }
    const door = frontDoor(this.world, this.catalog);
    if (v.rang < 0) {
      const there = folk.x === door.x && folk.y === door.y;
      if (!there && !folk.path.length) {
        const path = findPath(this.nav, folk, door);
        if (path && path.length > 0 && folk.idleTicks < 3) {
          folk.idleTicks++;
          folk.queue.push(this.makeAction({ kind: 'goto', target: door }, 'auto'));
          return;
        }
      }
      v.rang = this.world.tick;
      folk.idleTicks = 0;
      folk.facing = { x: 0, y: -1 };
      this.log(v.service ? `log.ring.${v.service.kind}` : 'log.ring', { name: folk.name });
      return;
    }
    const waited = this.world.tick - v.rang;
    // bloco 9: em dia de festa a porta fica aberta
    if (v.party && waited >= PARTY_WALK_IN && this.residents().some((r) => !r.away)) {
      v.admitted = true;
      this.log('log.partyWalkIn', { name: folk.name });
      return;
    }
    const coming = doorTaken(this.world, folk.id);
    if (waited > ringWait(folk) + (coming ? 30 : 0)) this.noAnswer(folk);
  }

  /** Ninguém atendeu: a visita vai embora chateada, a entrega fica na porta. */
  private noAnswer(folk: Folk): void {
    const v = folk.visit!;
    const sv = v.service;
    if (!sv) {
      for (const r of this.residents()) {
        if (r.away) continue;
        applyDelta(this.world, this.catalog, folk, r, { friendship: -3 });
        addMemory(this.world, this.catalog, folk.id, r.id, 'leftAtDoor');
      }
      this.log('log.noAnswer', { name: folk.name });
      this.startLeaving(folk);
      return;
    }
    if (sv.kind === 'courier') {
      this.deliver(folk, null);
      return;
    }
    // faxineira e técnico têm a chave: entram sozinhos
    v.admitted = true;
    sv.started = this.world.tick;
    this.log('log.letSelfIn', { name: folk.name });
  }

  /** Um morador vai atender a porta, se alguém tocou (devolve true se foi). */
  private answerIfRinging(folk: Folk): boolean {
    if (folk.visit) return false;
    const caller = ringing(this.world).find((v) => !doorTaken(this.world, v.id, folk));
    if (!caller) return false;
    if (!findPathToAny(this.nav, folk, talkTiles(this.world, this.nav, caller, folk))) return false;
    const rel = relationOf(this.world, folk.id, caller.id);
    const late = clockOf(this.world.tick).hour >= 22;
    const welcome = !!caller.visit?.service || ((rel?.friendship ?? 0) > -30 && !late);
    folk.queue.push(this.makeAction({ kind: 'door', otherId: caller.id, welcome }, 'auto'));
    return true;
  }

  /** Tem alguém tocando há `minutes` minutos sem ninguém indo atender? */
  private unansweredBell(folk: Folk, minutes: number): boolean {
    return ringing(this.world).some((v) => this.world.tick - v.visit!.rang >= minutes && !doorTaken(this.world, v.id, folk));
  }

  /** Atender a porta: vai até quem tocou, cumprimenta e decide. */
  private processDoor(folk: Folk, action: Action): void {
    const other = action.otherId !== undefined ? this.findFolk(action.otherId) : undefined;
    if (!other?.visit || other.visit.admitted || other.visit.leaving) {
      this.finish(folk);
      return;
    }
    if (action.phase === 'queued') {
      if (adjacent(this.world, folk, other)) {
        action.phase = 'using';
        action.elapsed = 0;
      } else {
        const path = findPathToAny(this.nav, folk, talkTiles(this.world, this.nav, other, folk));
        if (!path) {
          this.log('log.cantReach', { name: folk.name, other: other.name });
          this.finish(folk);
          return;
        }
        folk.path = path;
        action.phase = 'walking';
      }
    }
    if (action.phase === 'walking') {
      if (this.stepAlong(folk, action) !== 'arrived') return;
      if (!adjacent(this.world, folk, other)) {
        action.phase = 'queued';
        return;
      }
      action.phase = 'using';
      action.elapsed = 0;
    }
    this.faceEachOther(folk, other);
    other.facing = { x: Math.sign(folk.x - other.x), y: Math.sign(folk.y - other.y) };
    action.elapsed++;
    if (action.elapsed < DOOR_MINUTES) return;
    this.finish(folk);
    this.resolveDoor(folk, other, action.welcome !== false);
  }

  private resolveDoor(host: Folk, guest: Folk, welcome: boolean): void {
    const v = guest.visit!;
    const sv = v.service;
    const names = { name: host.name, other: guest.name };
    ensureRelation(this.world, host.id, guest.id);
    ensureRelation(this.world, guest.id, host.id);
    touch(this.world, host.id, guest.id);
    if (sv?.kind === 'courier') {
      this.deliver(guest, host);
      return;
    }
    if (!welcome) {
      if (!sv) {
        applyDelta(this.world, this.catalog, guest, host, { friendship: -5 });
        addMemory(this.world, this.catalog, guest.id, host.id, 'turnedAway');
      }
      this.log(sv ? 'log.serviceSentAway' : 'log.sentAway', names);
      this.startLeaving(guest);
      return;
    }
    v.admitted = true;
    if (sv) {
      sv.started = this.world.tick;
      this.log('log.letIn', names);
      return;
    }
    // bloco 9: o jeito de receber na porta depende de quanto se gostam
    const rel = relationOf(this.world, host.id, guest.id);
    const greet = (rel?.romance ?? 0) >= 40 ? 'kiss' : (rel?.friendship ?? 0) >= 50 ? 'hug' : (rel?.friendship ?? 0) >= 15 ? 'handshake' : 'nod';
    const warm = greet === 'kiss' || greet === 'hug' ? 2 : 0;
    applyDelta(this.world, this.catalog, guest, host, { friendship: 2 + warm });
    applyDelta(this.world, this.catalog, host, guest, { friendship: 1 + warm / 2 });
    this.log(`log.welcomed.${greet}`, names);
  }

  /** O entregador entrega: mercado vai para a despensa, comida pronta é paga na hora. */
  private deliver(courier: Folk, host: Folk | null): void {
    const sv = courier.visit!.service!;
    const house = this.world.household;
    const names = { name: courier.name, other: host?.name ?? '' };
    if (sv.order === 'groceries') {
      const lost = stockPantry(this.world, this.catalog, GROCERIES.portions);
      this.log(host ? 'log.groceriesIn' : 'log.groceriesLeft', { ...names, portions: GROCERIES.portions - lost });
    } else if (sv.order === 'takeout') {
      house.funds -= sv.fee;
      house.takeout += TAKEOUT.portions;
      const late = sv.fee < TAKEOUT.price;
      if (host) {
        house.funds -= TAKEOUT.tip;
        applyDelta(this.world, this.catalog, courier, host, { friendship: 3 });
        addMemory(this.world, this.catalog, courier.id, host.id, 'goodTip');
      }
      const key = host ? (late ? 'log.takeoutLate' : 'log.takeoutIn') : 'log.takeoutLeft';
      this.log(key, { ...names, price: formatMoney(sv.fee) });
    }
    this.startLeaving(courier);
  }

  /** Faxineira, técnico ou oficial de penhora trabalhando dentro do lote. */
  private stepWorker(folk: Folk): void {
    const sv = folk.visit!.service!;
    // bloco 14: bombeiros, polícia, gatuno e o Seu Sereno
    if (sv.kind === 'firefighter') return this.stepFirefighter(folk);
    if (sv.kind === 'police') return this.stepPolice(folk);
    if (sv.kind === 'burglar') return this.stepBurglar(folk);
    if (sv.kind === 'reaper') return this.stepReaper(folk);
    if (sv.kind === 'waiter') return this.stepWaiter(folk);
    if (folk.queue.length > 0) {
      this.processAction(folk);
      return;
    }
    if (sv.kind === 'bailiff') {
      this.stepBailiff(folk);
      return;
    }
    if (sv.kind === 'social') {
      this.stepSocialWorker(folk);
      return;
    }
    // quem entrou sem passar pela porta (chave, teste) começa a contar agora
    if (sv.started < 0) sv.started = this.world.tick;
    const tooLong =
      (sv.kind === 'maid' && this.world.tick - sv.started >= MAID.hours * 60) ||
      (sv.kind === 'gardener' && this.world.tick - sv.started >= GARDENER.hours * 60);
    const task = tooLong ? null : serviceTask(this.world, this.catalog, folk, this.nav);
    if (task) {
      sv.done++;
      if (task.messId !== undefined) folk.queue.push(this.makeAction({ kind: 'tidy', messId: task.messId }, 'auto'));
      else folk.queue.push(this.makeAction({ kind: 'use', objectId: task.objectId, interactionId: task.interactionId }, 'auto'));
      return;
    }
    if (sv.kind === 'maid') {
      finishMaid(this.world, this.catalog, this.logger, folk);
    } else if (sv.kind === 'gardener') {
      finishGardener(this.world, this.logger, folk);
    } else if (sv.kind === 'repair') {
      const fee = repairBill(sv, this.world.tick);
      this.world.household.funds -= fee;
      this.log('log.repairDone', { name: folk.name, fee: formatMoney(fee) });
    }
    this.startLeaving(folk);
  }

  /** O oficial anda até o objeto de mais valor e leva, até cobrir as contas vencidas. */
  private stepBailiff(folk: Folk): void {
    const world = this.world;
    const sv = folk.visit!.service!;
    if (sv.target) {
      const obj = this.findObject(sv.target);
      const def = obj && this.defOf(obj);
      sv.target = 0;
      if (obj && def && !objectBusy(world, obj.id)) {
        const value = sellValue(this.world, obj, def);
        this.removeObject(obj.id);
        creditSeizure(world, value);
        sv.done++;
        this.log('log.seized', { name: folk.name, object: def.name, value: formatMoney(value) });
      }
    }
    if (seizableBills(world).length === 0 || sv.done >= MAX_SEIZE) {
      this.log(sv.done > 0 ? 'log.bailiffDone' : 'log.bailiffEmpty', { name: folk.name });
      if (sv.done > 0) {
        const r = this.residents()[0];
        if (r) createNews(world, this.catalog, this.logger, 'repossessed', r.id, 0);
      }
      this.startLeaving(folk);
      return;
    }
    const next = seizeTarget(world, this.catalog, this.nav, folk);
    const path = next && findPathToAny(this.nav, folk, besideTiles(world, this.catalog, this.nav, next));
    if (!next || !path) {
      this.log('log.bailiffEmpty', { name: folk.name });
      this.startLeaving(folk);
      return;
    }
    sv.target = next.id;
    const end = path.length ? path[path.length - 1] : { x: folk.x, y: folk.y };
    folk.queue.push(this.makeAction({ kind: 'goto', target: end }, 'auto'));
  }

  // ---------- visitas ----------

  private invite(folkId: number, neighborId: number): boolean {
    const folk = this.findFolk(folkId);
    const n = this.world.neighbors.find((x) => x.id === neighborId);
    if (!folk || !n) return false;
    if (this.findFolk(neighborId) || this.world.pendingVisits.some((v) => v.neighborId === neighborId)) {
      return this.fail('alreadyComing');
    }
    let best: { obj: WorldObject; it: InteractionDef; d: number } | null = null;
    for (const obj of this.world.objects) {
      const it = this.defOf(obj)?.interactions.find((i) => i.special === 'invite');
      if (!it) continue;
      const d = Math.abs(obj.x - folk.x) + Math.abs(obj.y - folk.y);
      if (!best || d < best.d) best = { obj, it, d };
    }
    if (!best) return this.fail('noPhone');
    return this.enqueuePlayer(folk, { kind: 'use', objectId: best.obj.id, interactionId: best.it.id, otherId: n.id });
  }

  /** Fim da ligação de convite: o vizinho topa ou não, conforme o que sente. */
  private resolveInvite(host: Folk, neighborId: number): void {
    const world = this.world;
    const n = world.neighbors.find((x) => x.id === neighborId);
    if (!n || this.findFolk(n.id) || world.pendingVisits.some((v) => v.neighborId === n.id)) return;
    const hour = clockOf(world.tick).hour;
    const names = { name: n.name, host: host.name };
    if (hour >= 22 || hour < 8) {
      this.log('log.inviteLate', names);
      return;
    }
    const rel = relationOf(world, n.id, host.id);
    const p =
      0.75 +
      (rel?.friendship ?? 0) / 150 +
      affinity(this.catalog, n, host) * 0.05 +
      grudge(world, this.catalog, n.id, host.id) * 0.03;
    if (nextFloat(world) < p) {
      const delay = 30 + nextInt(world, 30);
      world.pendingVisits.push({ neighborId: n.id, at: world.tick + delay, hostId: host.id });
      this.log('log.inviteYes', { ...names, minutes: delay });
      wishOnHost(world, this.catalog, this.logger, host);
    } else {
      this.log('log.inviteNo', names);
    }
  }

  private stepVisits(): void {
    const world = this.world;
    const hour = clockOf(world.tick).hour;

    // quem combinou por telefone chega (bloco 16: no centro, ninguém aparece em casa)
    const due = world.outing ? [] : world.pendingVisits.filter((v) => v.at <= world.tick);
    if (due.length) {
      world.pendingVisits = world.pendingVisits.filter((v) => v.at > world.tick);
      for (const v of due) {
        const n = world.neighbors.find((x) => x.id === v.neighborId);
        const party = v.party && world.party ? world.party : null;
        if (!n || this.findFolk(n.id) || world.folks.length >= (party ? MAX_ON_LOT_PARTY : MAX_ON_LOT)) continue;
        this.spawnVisitor(n, party ? party.end : world.tick + INVITED_STAY, v.hostId);
        const guest = this.findFolk(n.id);
        if (party && guest?.visit) guest.visit.party = true;
        this.log(party ? 'log.partyArrived' : 'log.arrived', { name: n.name });
      }
    }

    // de vez em quando alguém aparece sem avisar
    if (
      !world.outing &&
      world.tick % 60 === 0 &&
      hour >= DROPIN_FROM &&
      hour < DROPIN_TO &&
      world.tick - world.lastDropIn >= DROPIN_GAP &&
      this.visitors().length < MAX_VISITORS &&
      world.folks.length < MAX_ON_LOT &&
      this.residents().some((f) => !f.away)
    ) {
      if (nextFloat(world) < DROPIN_CHANCE) {
        const pool = world.neighbors.filter(
          (n) =>
            !isServiceNeighbor(n) &&
            !this.findFolk(n.id) &&
            // bloco 16: gente do centro só aparece em casa depois de conhecida
            (!n.downtown || this.residents().some((r) => relationOf(world, r.id, n.id))) &&
            !world.pendingVisits.some((v) => v.neighborId === n.id) &&
            this.residents().every(
              (r) => (relationOf(world, n.id, r.id)?.friendship ?? 0) > -40 && grudge(world, this.catalog, n.id, r.id) > -6,
            ),
        );
        if (pool.length) {
          const n = pool[nextInt(world, pool.length)];
          world.lastDropIn = world.tick;
          this.spawnVisitor(n, world.tick + 120 + nextInt(world, 90), 0);
          this.log('log.dropIn', { name: n.name });
        }
      }
    }

    // hora de ir embora
    for (const f of world.folks) {
      const v = f.visit;
      if (!v || v.leaving) continue;
      const late = hour >= VISIT_CURFEW || hour < 6;
      // bloco 14: socorro, gatuno e o Seu Sereno vão embora quando terminam (de madrugada, inclusive)
      if (v.service && UNIFORMED[v.service.kind]) continue;
      if (v.service) {
        // quem trabalha tem a chave: só vai embora no fim do serviço (ou de madrugada)
        if (late || world.tick >= v.until) this.startLeaving(f);
        continue;
      }
      // bloco 16: quem saiu para o encontro fica até a volta (ou até cair de sono)
      if (v.date) {
        if (f.needs.energy < 8) this.startLeaving(f);
        continue;
      }
      // bloco 9: convidado da festa fica até a festa acabar (ou cair de sono)
      if (v.party && world.party) {
        if (f.needs.energy < 8) this.startLeaving(f);
        continue;
      }
      const worn = f.needs.energy < 15 || f.needs.hunger < 12;
      const nobodyHome = this.residents().every((r) => r.away);
      if (world.tick >= v.until || late || worn || nobodyHome) this.startLeaving(f);
    }
  }

  visitors(): Folk[] {
    return this.world.folks.filter((f) => f.visit);
  }

  private spawnVisitor(n: Neighbor, until: number, hostId: number, service: ServiceVisit | null = null): void {
    const world = this.world;
    const r = () => nextFloat(world);
    // bloco 15: quem mora no bairro chega a pé pela calçada, do lado da casa dela
    const from = service ? world.exit : this.streetDoor(n.id);
    const folk: Folk = {
      id: n.id,
      name: n.name,
      traits: [...n.traits],
      x: from.x,
      y: from.y,
      px: from.x,
      py: from.y,
      facing: { x: 0, y: -1 },
      needs: {
        hunger: 55 + r() * 35,
        energy: 55 + r() * 40,
        hygiene: 60 + r() * 35,
        bladder: 50 + r() * 40,
        comfort: 60 + r() * 30,
        fun: 40 + r() * 40,
        social: 25 + r() * 35,
        ambience: 50,
      },
      queue: [],
      path: [],
      idleTicks: 0,
      collapsed: 0,
      look: { ...n.look },
      temper: { ...n.temper },
      month: n.month,
      outfit: 'day',
      habits: {},
      thought: null,
      wishes: [],
      wishDay: -1,
      spark: 0,
      inspired: 0,
      alarm: false,
      skills: { ...n.skills },
      interests: { ...ensureInterests(this.catalog, n) },
      job: null,
      away: null,
      gig: null,
      business: null,
      // bloco 2: todo mundo toca a campainha, menos o oficial de penhora
      visit: { until, leaving: false, hostId, admitted: service !== null && !!NO_BELL[service.kind], rang: -1, service },
    };
    // bloco 14: bombeiro, policial, gatuno e o Seu Sereno vêm vestidos para o serviço
    if (service && UNIFORMED[service.kind]) folk.outfit = 'work';
    // bloco 11: criança da vizinhança vem como criança
    if (n.age) folk.age = n.age;
    world.folks.push(folk);
  }

  private startLeaving(folk: Folk, quiet = false): void {
    if (!folk.visit || folk.visit.leaving) return;
    folk.visit.leaving = true;
    // larga conversas: quem ouvia é liberado pelo próprio processListen
    folk.queue = [this.makeAction({ kind: 'leave' }, 'player')];
    folk.path = [];
    if (folk.collapsed > 0) folk.collapsed = 0;
    if (!quiet) this.log('log.leaving', { name: folk.name });
  }

  private removeVisitor(id: number): void {
    const world = this.world;
    const folk = this.findFolk(id);
    if (!folk) return;
    // bloco 16: a visita do encontro foi embora: o encontro acaba aqui
    if (world.outing?.date?.guest === id) this.endDate();
    world.folks = world.folks.filter((f) => f.id !== id);
    const n = world.neighbors.find((x) => x.id === id);
    if (n) {
      n.skills = { ...folk.skills };
      // bloco 9: o gosto pelos assuntos que mudou na visita vai junto
      if (folk.interests) n.interests = { ...folk.interests };
    }
    for (const c of world.circles) c.members = c.members.filter((m) => m.id !== id);
    for (const f of world.folks) {
      const idx = f.queue.findIndex((a) => a.otherId === id && (a.kind === 'social' || a.kind === 'listen'));
      if (idx < 0) continue;
      f.queue = f.queue.filter((a) => !(a.otherId === id && (a.kind === 'social' || a.kind === 'listen')));
      if (idx === 0) f.path = [];
    }
    // bloco 14: socorro que vai embora libera o chamado; gatuno que escapa leva o que pegou
    const sv = folk.visit?.service;
    if (sv?.kind === 'firefighter' && !world.folks.some((f) => f.visit?.service?.kind === 'firefighter')) world.help.fire = 0;
    if (sv?.kind === 'police') world.help.police = 0;
    if (sv?.kind === 'burglar' && !sv.caught) {
      this.log(sv.loot ? 'log.burglarEscaped' : 'log.burglarGone', { object: sv.loot ? (this.catalog.objects[sv.loot.defId]?.name ?? '') : '' });
    }
    if (sv && UNIFORMED[sv.kind]) return;
    this.log('log.left', { name: folk.name });
  }

  // ---------- bloco 9: desvio local ----------

  /**
   * Tem alguém em pé no próximo tile? Espera um minuto, depois tenta contornar
   * (caminho novo que evita quem está parado); se não tiver jeito, passa.
   * Devolve true se o folk fica parado neste minuto.
   */
  private giveWay(folk: Folk, next: Vec): boolean {
    const blocker = this.world.folks.find((f) => f !== folk && !f.away && f.x === next.x && f.y === next.y);
    if (!blocker) return false;
    // quem anda junto, logo sai da frente; quem está parado ou vem de encontro, não
    const coming = blocker.path[0]?.x === folk.x && blocker.path[0]?.y === folk.y;
    const still = blocker.path.length === 0 || coming;
    folk.blocked = (folk.blocked ?? 0) + 1;
    if (folk.blocked > 6) return false;
    if (!still && folk.blocked <= 3) return true;
    if (folk.blocked >= 2) {
      const goal = folk.path[folk.path.length - 1];
      const busy = new Set<number>();
      for (const f of this.world.folks) {
        if (f === folk || f.away || (f.x === goal.x && f.y === goal.y)) continue;
        if (Math.abs(f.x - folk.x) + Math.abs(f.y - folk.y) <= 3) busy.add(f.y * this.nav.w + f.x);
      }
      const around = avoiding(this.nav, busy);
      const path = findPath(around, folk, goal);
      if (path && path.length <= folk.path.length + 6 && !(path[0].x === next.x && path[0].y === next.y)) {
        folk.path = path;
        folk.blocked = 0;
        return true;
      }
    }
    return true;
  }

  // ---------- bloco 9: rodas de conversa ----------

  /** Chance de `o` topar entrar na roda que `host` chamou. */
  private joinChance(o: Folk, host: Folk): number {
    if (this.urgent(o) || o.collapsed > 0 || talkingWith(o) !== 0) return 0;
    const head = o.queue[0];
    if (head?.kind === 'door' || head?.kind === 'leave' || head?.kind === 'work') return 0;
    if (head?.phase === 'using' && this.interactionOf(head)?.pose === 'lie') return 0;
    const rel = relationOf(this.world, o.id, host.id);
    let p = 0.55 + (rel?.friendship ?? 0) / 150 + (moodOf(this.catalog, o.needs) - 50) / 250 + ((o.temper?.outgoing ?? 5) - 5) * 0.04;
    if (o.visit) p += 0.15;
    if (this.world.party) p += 0.15;
    if (head?.source === 'player') p -= 0.3;
    return Math.max(0, Math.min(0.97, p));
  }

  /**
   * Monta uma roda em volta de um tile perto de quem chamou. Cada convidado
   * topa ou não; sem ninguém, não tem roda.
   */
  private startCircle(folkId: number, otherIds: number[], source: Action['source']): boolean {
    const world = this.world;
    const folk = this.findFolk(folkId);
    if (!folk) return false;
    if (source === 'player') {
      if (folk.visit) return this.fail('visitor');
      if (folk.away) return this.fail('away');
      if (folk.collapsed > 0) return this.fail('collapsed');
    }
    const ids = [...new Set(otherIds)].filter((id) => id !== folk.id);
    if (ids.length === 0 || ids.length > CIRCLE_MAX - 1) return this.fail('invalid');
    const others = ids
      .map((id) => this.findFolk(id))
      .filter((f): f is Folk => !!f && onLot(f) && !(f.visit && !f.visit.admitted) && !f.visit?.service);
    if (others.length === 0) return this.fail('socialNotNow');
    const yes: Folk[] = [];
    for (const o of others) {
      if (nextFloat(world) < this.joinChance(o, folk)) yes.push(o);
      else {
        setThought(o, 'chat', 'no', world.tick, 4, folk.id);
        if (source === 'player') this.log('log.circleNo', { name: o.name, other: folk.name });
      }
    }
    if (yes.length === 0) {
      if (source === 'player') this.log('log.circleNobody', { name: folk.name });
      return source === 'player';
    }
    const ok = new Set([folk.id, ...yes.map((f) => f.id)]);
    const place = findCircleCenter(world, this.nav, folk, ok.size, ok, this.catalog) ?? findCircleCenter(world, this.nav, folk, 2, ok, this.catalog);
    if (!place) return this.fail('noRoom');
    const crew = [folk, ...yes].slice(0, place.spots.length);
    const circle: Circle = {
      id: world.nextId++,
      center: place.center,
      members: [],
      speaker: 0,
      topic: pickTopic(world, this.catalog, folk, crew.slice(1)),
      turnEnds: 0,
      until: world.tick + CIRCLE_MINUTES + nextInt(world, CIRCLE_EXTRA),
      started: world.tick,
    };
    // cada um fica no lugar livre mais perto de onde está
    const free = [...place.spots];
    for (const f of crew) {
      free.sort((a, b) => {
        const ta = { x: place.center.x + (a === 1 ? 1 : a === 3 ? -1 : 0), y: place.center.y + (a === 0 ? -1 : a === 2 ? 1 : 0) };
        const tb = { x: place.center.x + (b === 1 ? 1 : b === 3 ? -1 : 0), y: place.center.y + (b === 0 ? -1 : b === 2 ? 1 : 0) };
        return Math.abs(ta.x - f.x) + Math.abs(ta.y - f.y) - (Math.abs(tb.x - f.x) + Math.abs(tb.y - f.y)) || a - b;
      });
      const old = circleOfFolk(world, f.id);
      if (old) this.dropFromCircle(f, old, true);
      circle.members.push({ id: f.id, spot: free.shift()! });
    }
    world.circles.push(circle);
    if (source === 'player') {
      if (!this.enqueuePlayer(folk, { kind: 'circle', circleId: circle.id })) {
        world.circles = world.circles.filter((c) => c !== circle);
        return false;
      }
    } else folk.queue.push(this.makeAction({ kind: 'circle', circleId: circle.id }, 'auto'));
    for (const o of crew.slice(1)) this.pullIntoCircle(o, circle);
    this.log('log.circleStart', { name: folk.name, n: crew.length });
    return true;
  }

  /** Quem topou larga o que fazia por conta própria e vai para a roda. */
  private pullIntoCircle(o: Folk, c: Circle): void {
    o.queue = o.queue.filter((a) => a.source !== 'auto');
    const cur = o.queue[0];
    if (cur) cur.phase = 'queued';
    o.queue.unshift(this.makeAction({ kind: 'circle', circleId: c.id }, 'auto'));
    o.path = [];
    o.idleTicks = 0;
  }

  /** Sai da roda (e larga a ação de roda, se ainda está na fila). */
  private dropFromCircle(folk: Folk, c: Circle, quiet = false): void {
    c.members = c.members.filter((m) => m.id !== folk.id);
    const head = folk.queue[0];
    if (head?.kind === 'circle' && head.circleId === c.id) this.finish(folk);
    folk.queue = folk.queue.filter((a) => !(a.kind === 'circle' && a.circleId === c.id));
    if (!quiet && c.speaker === folk.id) c.speaker = 0;
  }

  private processCircle(folk: Folk, action: Action): void {
    const c = circleById(this.world, action.circleId);
    const m = c?.members.find((x) => x.id === folk.id);
    if (!c || !m) {
      this.finish(folk);
      return;
    }
    const spot = spotTile(c, m.spot);
    if (action.phase === 'queued') {
      // plano 2, bloco 4: sentado perto da roda, participa dali mesmo
      if ((folk.x === spot.x && folk.y === spot.y) || folk.posture) {
        action.phase = 'using';
        action.elapsed = 0;
      } else {
        const path = findPath(this.nav, folk, spot);
        if (!path) {
          this.dropFromCircle(folk, c);
          return;
        }
        folk.path = path;
        action.phase = 'walking';
      }
    }
    if (action.phase === 'walking') {
      if (this.stepAlong(folk, action) !== 'arrived') return;
      if (folk.x !== spot.x || folk.y !== spot.y) {
        action.phase = 'queued';
        return;
      }
      action.phase = 'using';
      action.elapsed = 0;
    }
    folk.facing = faceCenter(folk, c);
    action.elapsed++;
    // apertado (banheiro, fome, sono) ou campainha tocando sem ninguém ir: sai
    if (action.source === 'auto' && (this.urgent(folk) || (!folk.visit && this.unansweredBell(folk, 4)))) {
      this.dropFromCircle(folk, c);
      folk.idleTicks = IDLE_BEFORE_AUTO;
    }
  }

  /** Um minuto de cada roda: efeitos, vez de falar, assunto e fim. */
  private stepCircles(): void {
    const world = this.world;
    for (const c of [...world.circles]) {
      c.members = c.members.filter((m) => {
        const f = this.findFolk(m.id);
        return !!f && !f.away && !f.visit?.leaving && f.queue.some((a) => a.kind === 'circle' && a.circleId === c.id);
      });
      const present = c.members.map((m) => this.findFolk(m.id)!).filter((f) => inCircle(f, c));
      const age = world.tick - c.started;
      const done =
        world.tick >= c.until ||
        c.members.length === 0 ||
        (c.members.length < 2 && age > CIRCLE_GRACE) ||
        (present.length < 2 && age > CIRCLE_GRACE * 2);
      if (done) {
        this.endCircle(c);
        continue;
      }
      if (present.length < 2) continue;
      let speaker = present.find((f) => f.id === c.speaker);
      if (!speaker) {
        speaker = present[0];
        c.speaker = speaker.id;
        c.turnEnds = world.tick + CIRCLE_TURN;
        this.announceTopic(c, present, speaker);
      }
      for (const f of present) {
        applyEffects(f, { effects: CIRCLE_EFFECTS } as InteractionDef);
        countHabit(f, 'outgoing', 1);
        if (f !== speaker) f.needs.fun = clampNeed(f.needs.fun + REACTION_FUN[reactionTo(this.catalog, f, c.topic)]);
      }
      const up = trainSkill(speaker, CIRCLE_TALK, moodOf(this.catalog, speaker.needs), this.trainBoost(speaker));
      if (up !== null && !speaker.visit) {
        this.log('log.skillUp', { name: speaker.name, skill: this.catalog.skills.charisma?.name ?? 'charisma', level: up });
      }
      if (world.tick >= c.turnEnds) this.circleTurn(c, present, speaker);
    }
  }

  /** Balões da roda: quem fala mostra o assunto; quem ouve, a cara que fez. */
  private announceTopic(c: Circle, present: Folk[], speaker: Folk): void {
    const tick = this.world.tick;
    setThought(speaker, 'topic', c.topic, tick, CIRCLE_TURN);
    for (const f of present) {
      if (f === speaker) continue;
      setThought(f, 'topic', `${c.topic}${topicMark(reactionTo(this.catalog, f, c.topic))}`, tick, CIRCLE_TURN, speaker.id);
    }
  }

  /** Fim de uma vez de falar: cada um que ouviu muda o que acha de quem falou. */
  private circleTurn(c: Circle, present: Folk[], speaker: Folk): void {
    const world = this.world;
    let liked = 0;
    for (const l of present) {
      if (l === speaker) continue;
      ensureRelation(world, l.id, speaker.id);
      ensureRelation(world, speaker.id, l.id);
      const r = reactionTo(this.catalog, l, c.topic);
      if (r === 'love' || r === 'like') liked++;
      const toTarget = applyDelta(world, this.catalog, l, speaker, { friendship: 1 + REACTION_FRIENDSHIP[r] });
      const toSelf = applyDelta(world, this.catalog, speaker, l, { friendship: r === 'hate' ? 0 : 1 });
      touch(world, speaker.id, l.id);
      catchTopic(this.catalog, l, speaker, c.topic, relationOf(world, l.id, speaker.id)?.friendship ?? 0);
      this.outcomes.push({ fromId: speaker.id, toId: l.id, socialId: 'circle', accepted: r !== 'hate', toTarget, toSelf });
      if (this.outcomes.length > 50) this.outcomes.shift();
      if (!speaker.visit) wishOnTalk(world, this.catalog, this.logger, speaker, l.id, this.catalog.socials.chat, true);
      if (!l.visit) wishOnTalk(world, this.catalog, this.logger, l, speaker.id, this.catalog.socials.chat, true);
    }
    // a palavra passa para o próximo da roda
    const next = present[(present.indexOf(speaker) + 1) % present.length];
    c.speaker = next.id;
    c.turnEnds = world.tick + CIRCLE_TURN;
    // assunto que agradou a maioria pode continuar
    const keep = liked * 2 >= present.length - 1 && nextFloat(world) < 0.5;
    if (!keep) {
      c.topic = pickTopic(
        world,
        this.catalog,
        next,
        present.filter((f) => f !== next),
        c.topic,
      );
    }
    this.announceTopic(c, present, next);
  }

  private endCircle(c: Circle): void {
    const world = this.world;
    world.circles = world.circles.filter((x) => x !== c);
    for (const m of c.members) {
      const f = this.findFolk(m.id);
      if (!f) continue;
      const head = f.queue[0];
      if (head?.kind === 'circle' && head.circleId === c.id) this.finish(f);
      f.queue = f.queue.filter((a) => !(a.kind === 'circle' && a.circleId === c.id));
    }
  }

  /**
   * IA: quem está precisando de gente entra numa roda por perto, ou chama
   * quem está à toa para uma roda nova. Em festa, bem mais.
   */
  private circleWish(folk: Folk): boolean {
    const world = this.world;
    const v = folk.visit;
    if (v?.service || (v && !v.admitted) || v?.leaving) return false;
    const party = !!world.party && world.tick >= world.party.start;
    if (folk.needs.social >= (party ? 85 : 60) || this.urgent(folk)) return false;
    if (circleOfFolk(world, folk.id)) return false;
    for (const c of world.circles) {
      if (c.members.length >= CIRCLE_MAX) continue;
      if (Math.abs(c.center.x - folk.x) + Math.abs(c.center.y - folk.y) > CIRCLE_REACH) continue;
      const fond = c.members.map((m) => relationOf(world, folk.id, m.id)?.friendship);
      if (!fond.some((f) => f !== undefined)) continue;
      const avg = fond.reduce<number>((s, f) => s + (f ?? 0), 0) / fond.length;
      if (avg < -5) continue;
      if (nextFloat(world) > (party ? 0.6 : 0.35)) continue;
      const spot = freeSpot(world, this.nav, c, folk.id, this.catalog);
      if (spot < 0) continue;
      c.members.push({ id: folk.id, spot });
      folk.queue.push(this.makeAction({ kind: 'circle', circleId: c.id }, 'auto'));
      return true;
    }
    const people = world.folks.filter((f) => onLot(f) && !f.visit?.service && !(f.visit && !f.visit.admitted));
    if (people.length < 3) return false;
    const lonely = folk.needs.social < 35 ? 1.5 : 1;
    const pull = (party ? 0.5 : 0.22) * lonely * (0.6 + (folk.temper?.outgoing ?? 5) / 12);
    if (nextFloat(world) > pull) return false;
    const free = people
      .filter(
        (o) =>
          o !== folk &&
          !circleOfFolk(world, o.id) &&
          talkingWith(o) === 0 &&
          (o.queue.length === 0 || o.queue[0].source === 'auto') &&
          (relationOf(world, folk.id, o.id)?.friendship ?? -1) >= 0 &&
          Math.abs(o.x - folk.x) + Math.abs(o.y - folk.y) <= 12,
      )
      .sort((a, b) => (relationOf(world, folk.id, b.id)?.friendship ?? 0) - (relationOf(world, folk.id, a.id)?.friendship ?? 0) || a.id - b.id)
      .slice(0, CIRCLE_MAX - 1);
    if (free.length < 2) return false;
    return this.startCircle(folk.id, free.map((f) => f.id), 'auto');
  }

  // ---------- bloco 9: telefone social ----------

  /** Para quem o folk liga sozinho: o amigo de fora de quem mais gosta (e que não vê há tempo). */
  private callTarget(folk: Folk): number | undefined {
    const world = this.world;
    let best: { id: number; score: number } | null = null;
    for (const n of world.neighbors) {
      if (isServiceNeighbor(n) || this.findFolk(n.id)) continue;
      const rel = relationOf(world, folk.id, n.id);
      if (!rel || rel.friendship < 5) continue;
      const days = (world.tick - rel.last) / MINUTES_PER_DAY;
      const score = rel.friendship + Math.min(3, days) * 8;
      if (!best || score > best.score) best = { id: n.id, score };
    }
    return best?.id;
  }

  /** Papo pelo telefone: conta como contato (a amizade não esfria) e tem assunto. */
  private phoneTalk(caller: Folk | Neighbor, hearer: Folk | Neighbor): string {
    const world = this.world;
    ensureRelation(world, caller.id, hearer.id);
    ensureRelation(world, hearer.id, caller.id);
    const topic = pickTopic(world, this.catalog, caller, [hearer]);
    const r = reactionTo(this.catalog, hearer, topic);
    applyDelta(world, this.catalog, hearer, caller, { friendship: 2 + REACTION_FRIENDSHIP[r] });
    applyDelta(world, this.catalog, caller, hearer, { friendship: 2 });
    touch(world, caller.id, hearer.id);
    catchTopic(this.catalog, hearer, caller, topic, relationOf(world, hearer.id, caller.id)?.friendship ?? 0);
    return topic;
  }

  private resolveCall(folk: Folk, otherId: number): void {
    const n = this.world.neighbors.find((x) => x.id === otherId);
    if (!n || this.findFolk(n.id)) return;
    const topic = this.phoneTalk(folk, n);
    const r = reactionTo(this.catalog, n, topic);
    setThought(folk, 'topic', topic, this.world.tick, 6, n.id);
    this.log(r === 'hate' ? 'log.callBored' : 'log.called', { name: folk.name, other: n.name, topic: `topic.${topic}` });
    if (!folk.visit) wishOnTalk(this.world, this.catalog, this.logger, folk, n.id, this.catalog.socials.chat, true);
  }

  /** Alguém da casa vai atender o telefone tocando (devolve true se foi). */
  private answerPhoneIfRinging(folk: Folk): boolean {
    const call = this.world.call;
    if (!call || call.answeredBy || folk.visit || folk.away) return false;
    const going = this.world.folks.some((f) => f.queue.some((a) => a.kind === 'use' && this.interactionOf(a)?.special === 'answer'));
    if (going) return false;
    const best = this.nearestSpecial(folk, 'answer');
    if (!best) return false;
    folk.queue.push(this.makeAction({ kind: 'use', objectId: best.obj.id, interactionId: best.it.id }, 'auto'));
    return true;
  }

  /** O telefone toca de vez em quando: amigos ligam para conversar, fofocar ou avisar que vêm. */
  private stepPhone(): void {
    const world = this.world;
    const call = world.call;
    if (call) {
      if (call.answeredBy) {
        const f = this.findFolk(call.answeredBy);
        const head = f?.queue[0];
        if (!f || !head || head.kind !== 'use' || this.interactionOf(head)?.special !== 'answer') world.call = null;
        return;
      }
      const coming = world.folks.some((f) => f.queue.some((a) => a.kind === 'use' && this.interactionOf(a)?.special === 'answer'));
      if (world.tick - call.rang >= RING_MINUTES + (coming ? 15 : 0)) {
        const n = world.neighbors.find((x) => x.id === call.from);
        world.call = null;
        if (!n) return;
        for (const r of this.residents()) {
          if (r.away || !relationOf(world, n.id, r.id)) continue;
          applyDelta(world, this.catalog, n, r, { friendship: -1 });
        }
        this.log('log.missedCall', { name: n.name });
      }
      return;
    }
    const hour = clockOf(world.tick).hour;
    if (world.tick % 30 !== 0 || hour < 9 || hour >= 21) return;
    const home = this.residents().filter((r) => !r.away && r.collapsed === 0);
    if (!home.length || !this.nearestSpecial(home[0], 'answer')) return;
    if (nextFloat(world) >= CALL_CHANCE) return;
    const pool = world.neighbors.filter(
      (n) =>
        !isServiceNeighbor(n) &&
        !this.findFolk(n.id) &&
        !world.pendingVisits.some((v) => v.neighborId === n.id) &&
        home.some((r) => (relationOf(world, n.id, r.id)?.friendship ?? 0) >= 15),
    );
    if (!pool.length) return;
    const n = pool[nextInt(world, pool.length)];
    const fav = [...home].sort((a, b) => (relationOf(world, n.id, b.id)?.friendship ?? 0) - (relationOf(world, n.id, a.id)?.friendship ?? 0))[0];
    const roll = nextFloat(world);
    const reason = roll < 0.45 && pickGossip(world, this.catalog, n.id, fav.id) ? 'gossip' : roll > 0.8 && hour < 19 ? 'visit' : 'chat';
    world.call = { from: n.id, rang: world.tick, reason, answeredBy: 0 };
    this.log('log.phoneRings', { name: n.name });
  }

  /** Fim da ligação recebida. */
  private resolveAnswer(folk: Folk): void {
    const world = this.world;
    const call = world.call;
    world.call = null;
    const n = call && world.neighbors.find((x) => x.id === call.from);
    if (!call || !n) return;
    const topic = this.phoneTalk(n, folk);
    const names = { name: folk.name, other: n.name, topic: `topic.${topic}` };
    setThought(folk, 'topic', `${topic}${topicMark(reactionTo(this.catalog, folk, topic))}`, world.tick, 6, n.id);
    const news = call.reason === 'gossip' ? pickGossip(world, this.catalog, n.id, folk.id) : null;
    if (news) {
      learnNews(world, this.catalog, this.logger, news, folk.id, 'heard', n.id);
      this.log('log.callGossip', names);
    } else if (call.reason === 'visit' && !this.findFolk(n.id) && clockOf(world.tick).hour < 20) {
      const delay = 30 + nextInt(world, 30);
      world.pendingVisits.push({ neighborId: n.id, at: world.tick + delay, hostId: folk.id });
      this.log('log.callVisit', { ...names, minutes: delay });
    } else this.log('log.callChat', names);
    if (!folk.visit) wishOnTalk(world, this.catalog, this.logger, folk, n.id, this.catalog.socials.chat, true);
  }

  // ---------- bloco 9: festas ----------

  /** Fim da ligação para a turma: quem topa vem; a festa fica marcada. */
  private resolveParty(host: Folk, guestIds: number[], wedding?: Action['wedding']): void {
    const world = this.world;
    if (world.party) return;
    // bloco 10: casamento só com os dois ainda noivos
    if (wedding && bondOf(world, host.id, wedding.partner) !== 'engaged') {
      this.log('log.weddingOff', { name: host.name });
      return;
    }
    const hour = clockOf(world.tick).hour;
    if (hour >= 21 || hour < 8) {
      this.log('log.partyLate', { name: host.name });
      return;
    }
    const start = world.tick + PARTY_LEAD;
    const party: Party = { host: host.id, start, end: start + PARTY_MINUTES, guests: [] as number[], score: 0, samples: 0, brawls: 0, complaints: 0, buffet: false };
    if (wedding) party.wedding = { partner: wedding.partner, surname: wedding.surname, stage: 'waiting' };
    const no: string[] = [];
    // o par de fora vem sempre (é o casamento dele)
    const partnerOut = wedding && !this.residents().some((r) => r.id === wedding.partner) ? wedding.partner : 0;
    const ids = partnerOut ? [partnerOut, ...guestIds.filter((g) => g !== partnerOut)] : guestIds;
    for (const id of ids) {
      const n = world.neighbors.find((x) => x.id === id);
      if (!n || isServiceNeighbor(n)) continue;
      const here = this.findFolk(n.id);
      if (here?.visit) {
        here.visit.party = true;
        here.visit.until = party.end;
        party.guests.push(n.id);
        continue;
      }
      if (world.pendingVisits.some((v) => v.neighborId === n.id)) {
        party.guests.push(n.id);
        for (const v of world.pendingVisits) if (v.neighborId === n.id) v.party = true;
        continue;
      }
      const rel = relationOf(world, n.id, host.id);
      const p =
        (n.id === partnerOut ? 9 : 0) +
        (wedding ? 0.15 : 0) +
        0.55 +
        (rel?.friendship ?? 0) / 120 +
        reputationOf(world, host.id) / 250 +
        ((n.temper?.outgoing ?? 5) - 5) * 0.04 +
        grudge(world, this.catalog, n.id, host.id) * 0.03 -
        (rel ? 0 : 0.25);
      if (nextFloat(world) < p) {
        party.guests.push(n.id);
        world.pendingVisits.push({ neighborId: n.id, at: start - 10 + nextInt(world, 40), hostId: host.id, party: true });
      } else no.push(n.name);
    }
    if (party.guests.length === 0 && !wedding) {
      this.log('log.partyNobody', { name: host.name });
      return;
    }
    world.party = party;
    if (wedding) this.log('log.weddingPlanned', { name: host.name, other: this.nameOfPerson(wedding.partner), n: party.guests.filter((g) => g !== wedding.partner).length, minutes: PARTY_LEAD });
    else this.log('log.partyPlanned', { name: host.name, n: party.guests.length, minutes: PARTY_LEAD });
    if (no.length) this.log('log.partyDeclined', { names: no.map((x) => x.split(' ')[0]).join(', ') });
    wishOnHost(world, this.catalog, this.logger, host);
  }

  /** Monta a mesa de petiscos. */
  private setBuffet(folk: Folk, action: Action): void {
    const obj = action.objectId !== undefined ? this.findObject(action.objectId) : undefined;
    if (!obj) return;
    obj.snacks = BUFFET_PORTIONS;
    if (this.world.party) this.world.party.buffet = true;
    this.log('log.buffetSet', { name: folk.name });
  }

  /** Quem está na festa agora (convidados no lote, já dentro). */
  private partyGuests(): Folk[] {
    return this.world.folks.filter((f) => f.visit?.party && f.visit.admitted && !f.visit.leaving);
  }

  /** Um minuto de festa: música, medição de animação, brigas, barulho e fim. */
  private stepParty(): void {
    const world = this.world;
    const party = world.party;
    if (!party || world.tick < party.start) return;
    const since = world.tick - party.start;
    const host = this.findFolk(party.host);
    if (since === 0) {
      this.log('log.partyStart', { name: host?.name ?? '' });
      // sem música não é festa: liga o som na estação de quem dá a festa
      const stereos = world.objects.filter((o) => isStereo(this.defOf(o)) && !o.state?.broken);
      if (stereos.length && !stereos.some((o) => o.tune) && host) {
        stereos[0].tune = favoriteStation(host).id;
        this.log('log.partyMusic', { name: host.name });
      }
    }
    const guests = this.partyGuests();
    if (since > 0 && since % PARTY_SAMPLE === 0 && guests.length) {
      let sum = 0;
      for (const g of guests) {
        const vibe = (g.needs.fun + g.needs.social) / 2;
        sum += vibe * 0.65 + moodOf(this.catalog, g.needs) * 0.35;
      }
      party.score += sum / guests.length;
      party.samples++;
    }
    if (party.wedding) this.stepWedding(party, party.wedding, since);
    // panelinhas: rivais na mesma festa acabam brigando
    if (since > 0 && since % 60 === 20 && guests.length >= 2) this.partyFriction(party, guests);
    // barulho tarde da noite: algum vizinho reclama
    const hour = clockOf(world.tick).hour;
    const late = hour >= QUIET_HOUR || hour < 6;
    if (late && world.tick % 60 === 0 && world.objects.some((o) => playing(o, this.defOf(o)))) {
      if (nextFloat(world) < 0.5) this.noiseComplaint(party);
      if (party.complaints >= COMPLAINTS_TO_END) {
        this.endParty('noise');
        return;
      }
    }
    if (world.tick >= party.end) this.endParty('time');
  }

  /** Bloco 10: a cerimônia no meio da festa (os votos entram na fila do casal). */
  private stepWedding(party: Party, w: Wedding, since: number): void {
    const world = this.world;
    const host = this.findFolk(party.host);
    const partner = this.findFolk(w.partner);
    if (w.stage === 'vows') {
      // a troca de votos foi interrompida: tenta de novo
      const busy = host?.queue.some((a) => a.kind === 'social' && a.socialId === 'vows');
      if (!busy) w.stage = 'waiting';
      // demorou para chegar ao arco (alguém no caminho): casa onde estiver
      else if (world.tick - (w.vowsAt ?? world.tick) > ARCH_PATIENCE) {
        for (const f of [host, partner]) {
          if (f && f.queue[0]?.kind === 'goto') {
            f.queue.shift();
            f.path = [];
          }
        }
      }
      return;
    }
    if (w.stage !== 'waiting' || since < VOWS_AT) return;
    if (world.tick >= party.end - VOWS_LAST_CALL) {
      w.stage = 'missed';
      this.log('log.weddingMissed', { name: host?.name ?? this.nameOfPerson(party.host), other: partner?.name ?? this.nameOfPerson(w.partner) });
      return;
    }
    if (!host || !partner || !onLot(host) || !onLot(partner) || (partner.visit && !partner.visit.admitted)) return;
    if (talkingWith(host) !== 0 && talkingWith(host) !== partner.id) return;
    // os dois de gala
    w.outfits ??= {};
    for (const f of [host, partner]) {
      if (w.outfits[f.id] === undefined) w.outfits[f.id] = f.outfit;
      f.outfit = 'formal';
      const c = circleOfFolk(world, f.id);
      if (c) this.dropFromCircle(f, c, true);
    }
    // com arco de flores, os dois vão para a frente dele
    const spots = this.archSpots();
    host.queue = [this.makeAction({ kind: 'social', otherId: partner.id, socialId: 'vows' }, 'player')];
    if (spots) host.queue.unshift(this.makeAction({ kind: 'goto', target: spots[1] }, 'player'));
    host.path = [];
    partner.queue = spots ? [this.makeAction({ kind: 'goto', target: spots[0] }, 'player')] : [];
    partner.path = [];
    w.stage = 'vows';
    w.vowsAt = world.tick;
    this.log('log.weddingVows', { name: host.name, other: partner.name });
  }

  /** Os dois lugares na frente do arco de flores (ou null se não há arco livre). */
  private archSpots(): [Vec, Vec] | null {
    const fronts: Vec[] = [
      { x: 0, y: 1 },
      { x: 1, y: 0 },
      { x: 0, y: -1 },
      { x: -1, y: 0 },
    ];
    for (const o of this.world.objects) {
      if (!this.defOf(o)?.arch) continue;
      const along = o.rot % 2 === 0 ? { x: 1, y: 0 } : { x: 0, y: 1 };
      // na frente, ou atrás se a frente der para uma parede
      for (const f of [fronts[o.rot], fronts[(o.rot + 2) % 4]]) {
        const a = { x: o.x + (f.x > 0 ? 1 : f.x), y: o.y + (f.y > 0 ? 1 : f.y) };
        const b = { x: a.x + along.x, y: a.y + along.y };
        const open = [a, b].every((t) => {
          const from = { x: t.x - f.x, y: t.y - f.y };
          return this.nav.isFree(t.x, t.y) && !blocksStep(this.world.grid.edges[edgeKey(from.x, from.y, t.x, t.y)]);
        });
        if (open) return [a, b];
      }
    }
    return null;
  }

  /** Fim da festa de casamento: quem não casou fica noivo; roupa de volta. */
  private endWedding(party: Party, w: Wedding): void {
    if (w.stage === 'waiting' || w.stage === 'vows') {
      this.log('log.weddingMissed', { name: this.nameOfPerson(party.host), other: this.nameOfPerson(w.partner) });
    }
    for (const [id, outfit] of Object.entries(w.outfits ?? {})) {
      const f = this.findFolk(Number(id));
      if (f && !f.visit) f.outfit = outfit as Outfit;
    }
  }

  /** Nome de qualquer pessoa (morador, visita ou vizinho). */
  private nameOfPerson(id: number): string {
    return this.findFolk(id)?.name ?? this.world.neighbors.find((n) => n.id === id)?.name ?? '';
  }

  private partyFriction(party: NonNullable<World['party']>, guests: Folk[]): void {
    const world = this.world;
    const ids = [...guests.map((g) => g.id), ...this.residents().filter((r) => onLot(r)).map((r) => r.id)];
    for (const { a, b, weight } of partyFriction(world, ids)) {
      if (nextFloat(world) >= 0.35 * weight) continue;
      const fa = this.findFolk(a);
      const fb = this.findFolk(b);
      if (!fa || !fb || !onLot(fa) || !onLot(fb) || talkingWith(fa) !== 0) continue;
      // quem tem pavio curto começa
      const [first, second] = (fb.temper?.warmth ?? 5) < (fa.temper?.warmth ?? 5) ? [fb, fa] : [fa, fb];
      const old = circleOfFolk(world, first.id);
      if (old) this.dropFromCircle(first, old, true);
      first.queue = first.queue.filter((x) => x.source !== 'auto');
      first.queue.unshift(this.makeAction({ kind: 'social', otherId: second.id, socialId: 'argue' }, 'auto'));
      first.path = [];
      party.brawls++;
      createNews(world, this.catalog, this.logger, 'partyBrawl', first.id, second.id, onLotWitnesses(world, first, [first.id, second.id]));
      this.log('log.partyBrawl', { name: first.name, other: second.name });
      return;
    }
  }

  private noiseComplaint(party: NonNullable<World['party']>): void {
    const world = this.world;
    const grumpy = world.neighbors
      .filter((n) => !isServiceNeighbor(n) && !party.guests.includes(n.id) && !this.findFolk(n.id))
      .sort((a, b) => (b.temper?.order ?? 5) - (a.temper?.order ?? 5) || a.id - b.id)[0];
    if (!grumpy) return;
    party.complaints++;
    const host = personOfHost(world, party.host);
    if (host) applyDelta(world, this.catalog, grumpy, host, { friendship: -4 });
    addReputation(world, party.host, -2);
    this.log('log.noiseComplaint', { name: grumpy.name });
  }

  /** Acabou a festa: nota pela animação média, fama ou fofoca, todo mundo para casa. */
  private endParty(why: 'time' | 'noise'): void {
    const world = this.world;
    const party = world.party;
    if (!party) return;
    world.party = null;
    const guests = this.partyGuests();
    const avg = party.samples ? party.score / party.samples : 35;
    const w = party.wedding;
    const wed = w?.stage === 'done' ? WEDDING_BONUS + (world.objects.some((o) => this.defOf(o)?.arch) ? ARCH_BONUS : 0) : 0;
    const score = Math.max(0, Math.min(100, Math.round(avg - party.brawls * 8 - party.complaints * 5 + (party.buffet ? 4 : 0) + wed)));
    if (w) this.endWedding(party, w);
    const grade = partyGrade(score);
    world.lastParty = { tick: world.tick, host: party.host, guests: party.guests.length, score, grade, brawls: party.brawls, complaints: party.complaints };
    const host = this.findFolk(party.host);
    const name = host?.name ?? '';
    const stars = '★'.repeat(grade) + '☆'.repeat(5 - grade);
    this.log(why === 'noise' ? 'log.partyNoiseEnd' : 'log.partyOver', { name, stars, score });
    const witnesses = guests.map((g) => g.id);
    if (grade >= 4) {
      createNews(world, this.catalog, this.logger, 'greatParty', party.host, 0, witnesses);
      if (host) for (const g of guests) applyDelta(world, this.catalog, g, host, { friendship: 3 });
    } else if (grade <= 2) {
      createNews(world, this.catalog, this.logger, 'flopParty', party.host, 0, witnesses);
    }
    for (const g of guests) this.startLeaving(g);
    for (const f of world.folks) if (f.visit?.party) f.visit.party = false;
    world.pendingVisits = world.pendingVisits.filter((v) => !v.party);
  }

  // ---------- bloco 11: bebês, crianças e escola ----------

  /** Bebê a caminho nasce (ou chega da agência); descaso grave chama a visitadora social. */
  private stepFamily(): void {
    const world = this.world;
    const exp = world.household.expecting;
    if (exp && world.tick >= exp.due) this.deliverBaby(exp);
    for (const kid of kidsOf(world)) {
      const k = kid.kid!;
      if (k.worker || k.neglect < NEGLECT_VISIT) continue;
      const n = serviceNeighbor(world, 'social');
      if (!n || !this.spawnService('social', null, 0)) continue;
      const worker = this.findFolk(n.id);
      if (worker?.visit?.service) worker.visit.service.target = kid.id;
      k.worker = true;
      this.log('log.socialComing', { name: n.name, kid: kid.name });
    }
  }

  /** O bebê chega ao berço livre; sem berço (ou casa cheia), espera e a casa é lembrada. */
  private deliverBaby(exp: Expecting): void {
    const world = this.world;
    const crib = freeCrib(world, this.catalog);
    if (!crib || this.household().length >= MAX_RESIDENTS) {
      exp.due = world.tick + 60;
      if (clockOf(world.tick).hour === 9) this.log('log.babyWaiting');
      return;
    }
    world.household.expecting = null;
    const parents = exp.parents
      .map((id) => this.findFolk(id) ?? world.neighbors.find((n) => n.id === id))
      .filter((p): p is Folk | Neighbor => !!p);
    const baby = createBaby(world, this.catalog, parents, crib, exp.adopted);
    const names = parents.map((p) => p.name.split(' ')[0]);
    this.log(exp.adopted ? 'log.babyAdopted' : 'log.babyBorn', { name: baby.name, parents: names.join(' e ') });
    addAlbum(world, { kind: exp.adopted ? 'adopted' : 'birth', who: [baby.id, ...parents.map((p) => p.id)], names: [baby.name, ...parents.map((p) => p.name)] });
    if (parents[0]) createNews(world, this.catalog, this.logger, 'newBaby', parents[0].id, parents[1]?.id ?? 0);
  }

  /** O casal tentou: às vezes vem bebê (nasce no dia seguinte, no berço livre). */
  private tryBaby(folk: Folk, other: Folk): void {
    const world = this.world;
    const names = { name: folk.name, other: other.name };
    if (world.household.expecting || !freeCrib(world, this.catalog) || this.household().length >= MAX_RESIDENTS) {
      this.log('log.babyNoCrib', names);
      return;
    }
    if (nextFloat(world) >= TRY_CHANCE) {
      this.log('log.babyNotYet', names);
      return;
    }
    world.household.expecting = { parents: [folk.id, other.id], due: world.tick + EXPECT_HOURS * 60, adopted: false };
    this.log('log.babyComing', names);
  }

  /** Ligou para a agência: paga a taxa e o bebê chega amanhã de manhã. */
  private adopt(folk: Folk): void {
    const world = this.world;
    const house = world.household;
    if (house.expecting || !freeCrib(world, this.catalog) || this.household().length >= MAX_RESIDENTS) {
      this.log('log.adoptNo', { name: folk.name });
      return;
    }
    if (house.funds < ADOPT_FEE) {
      this.log('log.noMoney', { name: folk.name });
      return;
    }
    house.funds -= ADOPT_FEE;
    const spouse = spouseOf(world, folk.id);
    const parents = spouse && this.findFolk(spouse) && !this.findFolk(spouse)!.visit ? [folk.id, spouse] : [folk.id];
    const day = dayOf(world.tick) + 1;
    house.expecting = { parents, due: day * MINUTES_PER_DAY + ADOPT_HOUR * 60, adopted: true };
    this.log('log.adoptCalled', { name: folk.name, fee: formatMoney(ADOPT_FEE) });
  }

  /** Um minuto do bebê no berço: necessidades, sono, choro e crescer. */
  private stepBaby(baby: Folk): void {
    const world = this.world;
    const kid = baby.kid;
    if (!kid) {
      delete baby.age;
      return;
    }
    const tick = world.tick;
    const crib = cribOf(world, baby);
    if (crib) {
      baby.x = baby.px = crib.x;
      baby.y = baby.py = crib.y;
    }
    const held = !!crib && world.folks.some((f) => {
      const a = f.queue[0];
      return a?.phase === 'using' && a.objectId === crib.id && this.interactionOf(a)?.baby === 'hold';
    });
    const before = { hunger: baby.needs.hunger, hygiene: baby.needs.hygiene, social: baby.needs.social };
    babyTick(baby, held);
    if (crying(baby)) {
      const want = babyWant(baby)!;
      const need = CARE_NEED[want];
      if (baby.thought?.icon !== need || tick >= baby.thought.until - 1) setThought(baby, 'want', need, tick, 15);
      // o choro começa: avisa uma vez
      if ((Object.keys(before) as (keyof typeof before)[]).some((k) => before[k] >= CRY_BELOW && baby.needs[k] < CRY_BELOW)) {
        this.log('log.babyCries', { name: baby.name, need: `cry.${need}` });
      }
      if ((tick - kid.born) % 30 === 0) this.wakeForBaby(baby);
    } else if (baby.thought?.kind === 'want') {
      baby.thought = null;
    }
    if (tick >= kid.grows) this.growUp(baby);
  }

  /** Bebê chorando com a casa toda dormindo: acorda o adulto mais descansado. */
  private wakeForBaby(baby: Folk): void {
    const adults = this.adults().filter((a) => !a.away && a.collapsed === 0);
    if (adults.length === 0 || adults.some((a) => !this.sleeping(a))) return;
    const best = adults.filter((a) => a.needs.energy >= 40).sort((a, b) => b.needs.energy - a.needs.energy || a.id - b.id)[0];
    if (!best) return;
    this.finish(best);
    best.idleTicks = IDLE_BEFORE_AUTO;
    this.log('log.babyWokeUp', { name: best.name, kid: baby.name });
  }

  /** Terminou um cuidado: o bebê para de chorar. */
  private babyCared(_folk: Folk, baby: Folk, _care: BabyCare): void {
    if (baby.thought?.kind === 'want') baby.thought = null;
  }

  /** Bloco 11: um adulto à toa vai cuidar do bebê que precisa (chorando, sempre). */
  private babyWish(folk: Folk): boolean {
    if (folk.visit || !isAdult(folk)) return false;
    const world = this.world;
    let best: { crib: WorldObject; care: BabyCare; v: number } | null = null;
    for (const baby of kidsOf(world, 'baby')) {
      const crib = cribOf(world, baby);
      if (!crib) continue;
      const taken = world.folks.some((f) => f !== folk && f.queue.some((a) => a.objectId === crib.id && !!this.interactionOf(a)?.baby));
      if (taken) continue;
      const care = babyWant(baby, CARE_BELOW);
      if (!care || (baby.kid!.asleep && (care === 'hold' || care === 'lull'))) continue;
      const v = baby.needs[CARE_NEED[care]];
      if (!best || v < best.v) best = { crib, care, v };
    }
    if (!best) return false;
    const cry = best.v < CRY_BELOW;
    // quem está apertado resolve o seu primeiro
    if (folk.needs.bladder < (cry ? 8 : 20) || folk.needs.hunger < (cry ? 5 : 15)) return false;
    const p = cry ? 1 : Math.max(0.1, 0.3 + 0.05 * (folk.temper.warmth - 5));
    if (nextFloat(world) >= p) return false;
    const it = this.defOf(best.crib)?.interactions.find((i) => i.baby === best!.care);
    if (!it) return false;
    folk.queue.push(this.makeAction({ kind: 'use', objectId: best.crib.id, interactionId: it.id }, 'auto'));
    return true;
  }

  /** Bloco 11: criança com lição pendente vai fazer (quem tem mais Ordem vai antes). */
  private homeworkWish(folk: Folk): boolean {
    if (!inSchool(folk) || folk.visit || folk.kid?.homework !== 'due') return false;
    const world = this.world;
    const hour = clockOf(world.tick).hour;
    if (hour < 15 || hour >= 22) return false;
    if (folk.needs.hunger < 25 || folk.needs.bladder < 25 || folk.needs.energy < 20) return false;
    const p = 0.12 + 0.03 * (folk.temper.order - 5) + (hour >= 19 ? 0.2 : 0);
    if (nextFloat(world) >= p) return false;
    let best: { obj: WorldObject; it: InteractionDef; d: number } | null = null;
    for (const obj of world.objects) {
      const it = this.defOf(obj)?.interactions.find((i) => i.homework);
      if (!it || !interactionOpen(obj, it) || this.usingCount(obj.id, folk) >= (this.defOf(obj)!.slots ?? 1)) continue;
      const d = Math.abs(obj.x - folk.x) + Math.abs(obj.y - folk.y);
      if (!best || d < best.d) best = { obj, it, d };
    }
    if (!best || refusal(this.catalog, folk, best.it, world.tick)) return false;
    folk.queue.push(this.makeAction({ kind: 'use', objectId: best.obj.id, interactionId: best.it.id }, 'auto'));
    return true;
  }

  /** O bebê vira criança: sai do berço, anda, brinca e vai começar a escola. */
  private growUp(baby: Folk): void {
    const crib = cribOf(this.world, baby);
    if (crib) delete crib.baby;
    const kid = baby.kid!;
    baby.age = 'child';
    kid.asleep = false;
    kid.homework = 'none';
    kid.neglect = 0;
    for (const id of NEED_IDS) baby.needs[id] = Math.max(baby.needs[id], id === 'ambience' ? baby.needs[id] : 60);
    baby.thought = null;
    const spot = this.freeTileNear(crib ?? baby);
    baby.x = baby.px = spot.x;
    baby.y = baby.py = spot.y;
    baby.facing = { x: 0, y: 1 };
    this.log('log.grewUp', { name: baby.name });
    this.learnFromCare(baby);
    // bloco 17: com o relógio ligado, a infância começa a contar agora
    scheduleAge(this.world, baby, true);
  }

  /** Um tile livre perto (para quem sai do berço). */
  private freeTileNear(at: Vec): Vec {
    for (let r = 1; r <= 6; r++) {
      for (let dy = -r; dy <= r; dy++) {
        for (let dx = -r; dx <= r; dx++) {
          if (Math.abs(dx) + Math.abs(dy) !== r) continue;
          const x = at.x + dx;
          const y = at.y + dy;
          if (this.nav.isFree(x, y) && !this.world.folks.some((f) => !f.away && f.x === x && f.y === y)) return { x, y };
        }
      }
    }
    return { ...this.world.exit };
  }

  /** A criança pega um ponto do temperamento de quem mais cuidou dela. */
  private learnFromCare(kid: Folk): void {
    const r = learnFromCaregiver(this.world, kid);
    if (r) this.log('log.learnedFrom', { name: kid.name, other: this.nameOfPerson(r.from), axis: `temper.${r.axis}` });
  }

  /** Bloco 11: o ônibus da escola nos dias de aula; quem não embarca falta. */
  private stepSchool(folk: Folk): void {
    const kid = folk.kid;
    if (!kid || folk.away) return;
    childNeglectTick(folk);
    const tick = this.world.tick;
    const day = dayOf(tick);
    if (!isSchoolDay(day)) return;
    const minute = tick - day * MINUTES_PER_DAY;
    if (minute === SCHOOL_CALL && kid.calledDay !== day) {
      kid.calledDay = day;
      if (folk.collapsed === 0) {
        folk.queue = folk.queue.filter((a) => a.source !== 'auto');
        const cur = folk.queue[0];
        if (cur) cur.phase = 'queued';
        folk.path = [];
        folk.queue.unshift(this.makeAction({ kind: 'school' }, 'player'));
        if (folk.queue.length > MAX_QUEUE) folk.queue.length = MAX_QUEUE;
        if (folk.outfit === 'sleep') folk.outfit = 'day';
      }
      this.log('log.schoolBus', { name: folk.name });
    }
    if (kid.calledDay === day && kid.schoolDay !== day && minute > SCHOOL_BUS_LEAVES) {
      kid.schoolDay = day;
      if (folk.queue[0]?.kind === 'school') folk.path = [];
      folk.queue = folk.queue.filter((a) => a.kind !== 'school');
      kid.grade = clampGrade(kid.grade - MISSED_SCHOOL);
      this.log('log.missedSchool', { name: folk.name });
      this.checkGrade(folk);
    }
  }

  /** Chegou à calçada a tempo: embarca no ônibus. */
  private departSchool(folk: Folk): void {
    const kid = folk.kid;
    const tick = this.world.tick;
    const day = dayOf(tick);
    if (!kid || kid.calledDay !== day || kid.schoolDay === day) {
      this.finish(folk);
      return;
    }
    kid.schoolDay = day;
    folk.away = { until: day * MINUTES_PER_DAY + SCHOOL_END, late: 0, mood: moodOf(this.catalog, folk.needs), event: null, nextEvent: -1, school: true };
    const c = circleOfFolk(this.world, folk.id);
    if (c) this.dropFromCircle(folk, c, true);
    folk.queue = [];
    folk.path = [];
    folk.idleTicks = 0;
    this.log('log.leftForSchool', { name: folk.name });
  }

  /** Volta da escola: nota do dia, lição para casa e, na sexta, o boletim. */
  private backFromSchool(folk: Folk): void {
    const away = folk.away!;
    const kid = folk.kid!;
    folk.away = null;
    folk.x = folk.px = this.world.exit.x;
    folk.y = folk.py = this.world.exit.y;
    folk.facing = { x: 0, y: -1 };
    folk.idleTicks = 0;
    const avg = (away.mood + moodOf(this.catalog, folk.needs)) / 2;
    kid.grade = clampGrade(kid.grade + schoolDelta(folk, avg));
    kid.homework = 'due';
    this.log('log.backFromSchool', { name: folk.name, grade: gradeText(kid.grade) });
    if (dayOf(this.world.tick) % 7 === 4) {
      this.log('log.reportCard', { name: folk.name, grade: gradeText(kid.grade), band: `grade.band.${gradeBand(kid.grade)}` });
      if (kid.grade >= HONOR_AT) {
        folk.spark = Math.min(MAX_SPARK, folk.spark + 2);
        this.log('log.honorRoll', { name: folk.name });
      }
    }
    this.checkGrade(folk);
  }

  private checkGrade(folk: Folk): void {
    const verdict = gradeVerdict(folk.kid!);
    if (verdict === 'warn') this.log('log.gradeWarn', { name: folk.name });
    else if (verdict === 'boarding') {
      this.log('log.toBoarding', { name: folk.name });
      const parent = this.adults()[0];
      createNews(this.world, this.catalog, this.logger, 'boarding', folk.id, parent?.id ?? 0);
      this.sendAway(folk, 'boarding');
    }
  }

  /**
   * Criança (ou bebê) sai de casa: vira alguém da vizinhança que não aparece
   * (colégio interno ou outra família). Bebê sai no colo da visitadora.
   */
  private sendAway(folk: Folk, why: 'boarding' | 'fostered'): void {
    const world = this.world;
    const c = circleOfFolk(world, folk.id);
    if (c) this.dropFromCircle(folk, c, true);
    const crib = cribOf(world, folk);
    if (crib) delete crib.baby;
    const n: Neighbor = {
      id: folk.id,
      name: folk.name,
      traits: [...folk.traits],
      look: { ...folk.look },
      temper: { ...folk.temper },
      month: folk.month,
      skills: { ...folk.skills },
      career: null,
      interests: folk.interests ? { ...folk.interests } : undefined,
      funds: 0,
      away: why,
      age: folk.age,
    };
    world.neighbors = world.neighbors.filter((x) => x.id !== folk.id);
    world.neighbors.push(n);
    if (folk.age === 'baby' || folk.away) {
      world.folks = world.folks.filter((f) => f.id !== folk.id);
      return;
    }
    folk.wishes = [];
    folk.alarm = false;
    folk.collapsed = 0;
    delete folk.kid;
    folk.visit = { until: world.tick, leaving: false, hostId: 0, admitted: true, rang: -1, service: null, moving: true };
    this.startLeaving(folk);
  }

  /** A visitadora social vai até a criança e avisa (da primeira vez) ou leva embora. */
  private stepSocialWorker(folk: Folk): void {
    const world = this.world;
    const sv = folk.visit!.service!;
    const kid = world.folks.find((f) => f.id === sv.target && f.kid && !f.visit);
    if (!kid) {
      this.startLeaving(folk);
      return;
    }
    if (sv.done === 0) {
      sv.done = 1;
      const crib = cribOf(world, kid);
      const tiles = crib
        ? besideTiles(world, this.catalog, this.nav, crib)
        : [
            { x: kid.x + 1, y: kid.y },
            { x: kid.x - 1, y: kid.y },
            { x: kid.x, y: kid.y + 1 },
            { x: kid.x, y: kid.y - 1 },
          ].filter((t) => this.nav.isFree(t.x, t.y));
      const path = findPathToAny(this.nav, folk, tiles);
      if (path && path.length) {
        folk.queue.push(this.makeAction({ kind: 'goto', target: path[path.length - 1] }, 'auto'));
        return;
      }
    }
    const k = kid.kid!;
    k.worker = false;
    const names = { name: folk.name, kid: kid.name };
    if (k.warned === 0) {
      k.warned = 1;
      k.neglect = 0;
      this.log('log.socialWarned', names);
    } else {
      this.log('log.socialTook', names);
      const parent = this.adults()[0];
      createNews(world, this.catalog, this.logger, 'kidTaken', parent?.id ?? kid.id, kid.id);
      this.sendAway(kid, 'fostered');
    }
    this.startLeaving(folk);
  }

  // ---------- bloco 14: perigos, morte e fantasmas ----------

  /** Um minuto dos perigos: lareira, fogo, socorro, gatuno, Seu Sereno e fantasmas. */
  private stepPerils(minute: number): void {
    const world = this.world;
    for (const obj of world.objects) {
      if (!obj.lit || !this.defOf(obj)?.hearth) continue;
      // a lenha acaba e a lareira apaga sozinha
      if ((obj.blaze ?? 0) <= world.tick) {
        obj.lit = false;
        delete obj.blaze;
        continue;
      }
      for (const near of hearthNeighbors(world, this.catalog, obj)) {
        if (nextFloat(world) >= HEARTH_SPARK) continue;
        const fire = addFire(world, this.catalog, near.x, near.y);
        if (fire) this.log('log.hearthFire', { object: this.defOf(near)?.name ?? '' });
      }
    }
    this.stepFires();
    const help = world.help;
    if (help.fire > 0 && world.tick >= help.fire) {
      // o fogo já foi apagado? então nem vêm
      if (world.fires.length > 0 && this.spawnCrew('firefighter') > 0) {
        help.fire = -1;
        this.log('log.firefightersArrive');
      } else help.fire = 0;
    }
    if (help.police > 0 && world.tick >= help.police) {
      if (this.burglar() && this.spawnCrew('police') > 0) {
        help.police = -1;
        this.log('log.policeArrive');
      } else help.police = 0;
    }
    if (minute === BURGLAR_HOUR * 60 && this.residents().some((f) => !f.away) && !this.burglar() && burglarNight(world, this.catalog)) {
      world.lastBurglary = world.tick;
      this.spawnCrew('burglar');
    }
    this.watchBurglar();
    if (world.passings.length > 0 && !world.folks.some((f) => f.visit?.service?.kind === 'reaper')) this.spawnCrew('reaper');
    this.stepSpirits(minute);
  }

  /** Quem atende o chamado: todos os vizinhos daquele serviço que não estão no lote. Devolve quantos vieram. */
  private spawnCrew(kind: ServiceKind): number {
    let n = 0;
    for (const nb of this.world.neighbors) {
      if (nb.service !== kind || this.findFolk(nb.id)) continue;
      this.spawnVisitor(nb, this.world.tick + 12 * 60, 0, { kind, order: null, fee: 0, started: -1, done: 0, target: 0, blame: 0 });
      n++;
    }
    return n;
  }

  /** O gatuno no lote (se houver). */
  private burglar(): Folk | undefined {
    return this.world.folks.find((f) => f.visit?.service?.kind === 'burglar');
  }

  /** Fogo: esquenta, espalha, queima; o detector de fumaça chama os bombeiros. */
  private stepFires(): void {
    const world = this.world;
    if (world.fires.length === 0) {
      this.fireAware = false;
      return;
    }
    if (!this.fireAware) {
      this.fireAware = true;
      this.fireStarted();
    }
    const r = fireMinute(world, this.catalog);
    for (const obj of r.burnt) {
      if (!this.findObject(obj.id)) continue;
      const def = this.defOf(obj);
      this.removeObject(obj.id, true);
      if (def) {
        for (const t of footprint(obj, def)) {
          const f = fireAt(world, t.x, t.y);
          if (f) f.fuel = Math.min(f.fuel, FUEL_BARE);
        }
      }
      addMess(world, 'ash', obj.x, obj.y, 0);
      this.log('log.burnt', { object: def?.name ?? '' });
    }
    for (const obj of r.ruined) this.log('log.ruinedByFire', { object: this.defOf(obj)?.name ?? '' });
    if (world.help.fire === 0 && smokeSeen(world, this.catalog)) {
      world.help.fire = world.tick + FIRE_RESPONSE;
      this.log('log.smokeAlarm');
      this.wakeAll('fire');
    }
    if (world.fires.length === 0) {
      this.fireAware = false;
      this.log('log.fireBurntOut');
    }
  }

  /** O fogo começou: as visitas fogem e quem estava à toa larga o que fazia. */
  private fireStarted(): void {
    const world = this.world;
    this.log('log.fireStarted');
    const r = this.residents()[0];
    if (r) createNews(world, this.catalog, this.logger, 'houseFire', r.id, 0);
    const stay: ServiceKind[] = ['firefighter', 'police', 'reaper'];
    for (const f of world.folks) {
      if (f.away || f.down || f.age === 'baby') continue;
      if (f.visit) {
        if (!f.visit.service || !stay.includes(f.visit.service.kind)) this.startLeaving(f);
        continue;
      }
      setThought(f, 'fear', 'fire', world.tick, 60);
      const fire = nearestFire(world, f);
      if (asleep(f, this.catalog, world)) {
        if (fire && reach(world, f, fire) <= 4) this.wake(f, 'fire');
      } else if (f.queue[0]?.source === 'auto') {
        f.queue = [];
        f.path = [];
        f.idleTicks = IDLE_BEFORE_AUTO;
      }
    }
  }

  /** Acorda quem dorme (alarme, fumaça, susto). */
  private wake(folk: Folk, icon: string): void {
    if (asleep(folk, this.catalog, this.world)) this.finish(folk);
    folk.queue = folk.queue.filter((a) => a.source === 'player');
    folk.path = [];
    folk.idleTicks = IDLE_BEFORE_AUTO;
    setThought(folk, 'fear', icon, this.world.tick, 45);
  }

  private wakeAll(icon: string): void {
    for (const f of this.residents()) {
      if (f.away || f.down || f.collapsed > 0) continue;
      if (asleep(f, this.catalog, this.world)) this.wake(f, icon);
    }
  }

  /**
   * Perigo de agora para quem está no lote: chamas no tile, fome no zero,
   * piscina sem escadinha. Devolve true se o folk não age neste minuto.
   */
  private stepDanger(folk: Folk): boolean {
    const world = this.world;
    if (folk.age === 'baby') return false;
    if (fireAt(world, folk.x, folk.y)) {
      folk.scorch = (folk.scorch ?? 0) + 1;
      folk.needs.comfort = Math.max(0, folk.needs.comfort - 1);
      folk.needs.hygiene = Math.max(0, folk.needs.hygiene - 0.8);
      setThought(folk, 'fear', 'fire', world.tick, 20);
      if (folk.visit) {
        // bombeiro tem roupa para isso; o resto sai correndo
        if (folk.visit.service?.kind === 'firefighter' || folk.visit.service?.kind === 'reaper') folk.scorch = 0;
        else this.startLeaving(folk);
      } else if (folk.age === 'child') {
        // criança é tirada das chamas pelos adultos (não se machuca, mas leva um susto)
        if (folk.scorch >= 3) this.escapeFire(folk);
      } else if (folk.scorch >= SCORCH_DEATH) {
        this.fall(folk, 'fire');
        return true;
      }
    } else if (folk.scorch) {
      folk.scorch = Math.max(0, folk.scorch - 0.5);
      if (folk.scorch === 0) delete folk.scorch;
    }
    if (!folk.visit && isAdult(folk)) {
      if (folk.needs.hunger <= 0) {
        folk.starving = (folk.starving ?? 0) + 1;
        if (folk.starving === 1) this.log('log.starving', { name: folk.name });
        if (folk.starving === STARVE_MINUTES - 60) this.log('log.starvingLast', { name: folk.name });
        if (folk.starving >= STARVE_MINUTES) {
          this.fall(folk, 'hunger');
          return true;
        }
      } else if (folk.starving) delete folk.starving;
    }
    if (folk.adrift) {
      decayNeeds(world, this.catalog, folk, 1);
      folk.needs.energy = Math.max(0, folk.needs.energy - ADRIFT_DRAIN);
      folk.needs.fun = Math.max(0, folk.needs.fun - 0.1);
      folk.needs.hygiene = Math.min(NEED_MAX, folk.needs.hygiene + 0.1);
      const pool = poolTiles(world.grid, this.catalog, folk.adrift.x, folk.adrift.y);
      if (pool.length === 0 || poolHasLadder(world, this.catalog, pool)) {
        delete folk.adrift;
        this.log('log.outOfPool', { name: folk.name });
        return true;
      }
      if (folk.needs.energy <= 0) {
        this.fall(folk, 'drown');
        return true;
      }
      if (world.tick % 30 === 0) setThought(folk, 'fear', 'swim', world.tick, 20);
      return true;
    }
    return false;
  }

  /** Sai das chamas para o tile livre mais perto que não esteja pegando fogo. */
  private escapeFire(folk: Folk): void {
    const world = this.world;
    for (let r = 1; r <= 4; r++) {
      for (let dy = -r; dy <= r; dy++) {
        for (let dx = -r; dx <= r; dx++) {
          const x = folk.x + dx;
          const y = folk.y + dy;
          if (!this.nav.isFree(x, y) || fireAt(world, x, y)) continue;
          if (!findPath(this.nav, folk, { x, y })) continue;
          folk.queue = [this.makeAction({ kind: 'goto', target: { x, y } }, 'player')];
          folk.path = [];
          return;
        }
      }
    }
  }

  /**
   * Bloco 14: quem tem fogo por perto apaga (com extintor), liga para os
   * bombeiros ou entra em pânico do lado das chamas; quem vê o gatuno liga
   * para a polícia. Devolve true se decidiu algo.
   */
  private perilWish(folk: Folk): boolean {
    const world = this.world;
    if (folk.visit || folk.down || folk.age === 'baby') return false;
    if (world.fires.length > 0) {
      const fire = nearestFire(world, folk);
      if (!fire) return false;
      if (isAdult(folk)) {
        const ext = safetyOf(world, this.catalog, 'extinguisher');
        const extDef = ext && this.defOf(ext);
        if (ext && extDef && findPathToAny(this.nav, folk, useTiles(world, this.nav, ext, extDef))) {
          folk.queue.push(this.makeAction({ kind: 'use', objectId: ext.id, interactionId: 'douse' }, 'auto'));
          return true;
        }
        if (world.help.fire === 0 && !world.folks.some((f) => f.queue.some((a) => a.interactionId === 'callFire'))) {
          const phone = this.nearestSpecial(folk, 'callFire');
          if (phone) {
            folk.queue.push(this.makeAction({ kind: 'use', objectId: phone.obj.id, interactionId: phone.it.id }, 'auto'));
            return true;
          }
        }
      }
      folk.queue.push(this.makeAction({ kind: 'panic', target: { x: fire.x, y: fire.y } }, 'auto'));
      return true;
    }
    const thief = this.burglar();
    if (thief && !thief.visit?.leaving && reach(world, folk, thief) <= 6) {
      setThought(folk, 'fear', 'burglar', world.tick, 30);
      if (isAdult(folk) && world.help.police === 0 && !world.folks.some((f) => f.queue.some((a) => a.interactionId === 'callPolice'))) {
        const phone = this.nearestSpecial(folk, 'callPolice');
        if (phone) {
          folk.queue.push(this.makeAction({ kind: 'use', objectId: phone.obj.id, interactionId: phone.it.id }, 'auto'));
          return true;
        }
      }
    }
    return false;
  }

  /** Apagar fogo: com o extintor na mão (morador) ou com a mangueira (bombeiro). */
  private processDouse(folk: Folk, action: Action): void {
    const world = this.world;
    let fire = action.target ? fireAt(world, action.target.x, action.target.y) : undefined;
    if (!fire) {
      fire = nearestFire(world, folk, folk.visit ? Infinity : 12) ?? (folk.visit ? world.fires[0] : undefined);
      if (!fire) {
        this.finish(folk);
        return;
      }
      action.target = { x: fire.x, y: fire.y };
      action.phase = 'queued';
      folk.path = [];
    }
    const tiles = fireSideTiles(world, this.nav, fire);
    if (action.phase === 'queued') {
      if (tiles.some((t) => t.x === folk.x && t.y === folk.y)) {
        action.phase = 'using';
      } else {
        let path = findPathToAny(this.nav, folk, tiles);
        if (!path) {
          // este foco não dá para alcançar: tenta outro que dê
          for (const other of world.fires) {
            if (other === fire) continue;
            const p = findPathToAny(this.nav, folk, fireSideTiles(world, this.nav, other));
            if (p && (!path || p.length < path.length)) {
              path = p;
              action.target = { x: other.x, y: other.y };
            }
          }
        }
        if (path) {
          folk.path = path;
          action.phase = 'walking';
        } else {
          this.log('log.noPath', { name: folk.name });
          this.finish(folk);
          return;
        }
      }
    }
    if (action.phase === 'walking') {
      const moved = this.stepAlong(folk, action);
      if (moved !== 'arrived') return;
      action.phase = 'queued';
      return;
    }
    if (!tiles.some((t) => t.x === folk.x && t.y === folk.y) || reach(world, folk, fire) > 2) {
      action.phase = 'queued';
      return;
    }
    folk.facing = { x: Math.sign(fire.x - folk.x), y: Math.sign(fire.y - folk.y) };
    folk.needs.energy = Math.max(0, folk.needs.energy - 0.1);
    folk.needs.hygiene = Math.max(0, folk.needs.hygiene - 0.1);
    action.elapsed++;
    const hose = folk.visit?.service?.kind === 'firefighter';
    if (!douseFire(world, fire, hose ? DOUSE_HOSE : DOUSE_EXTINGUISHER)) return;
    action.target = undefined;
    action.phase = 'queued';
    if (world.fires.length === 0) {
      this.fireAware = false;
      this.log(hose ? 'log.firefightersDone' : 'log.fireOut', { name: folk.name });
      if (!folk.visit) this.trainCare(folk, { skill: { id: 'handiness', xpPerMinute: 10 } } as InteractionDef);
    }
  }

  /** Pânico: corre até perto do fogo e fica sacudindo os braços (perigoso!). */
  private processPanic(folk: Folk, action: Action): void {
    const world = this.world;
    const fire = nearestFire(world, folk);
    if (!fire) {
      this.finish(folk);
      return;
    }
    if (action.phase === 'queued') {
      const tiles = fireSideTiles(world, this.nav, fire);
      const path = tiles.some((t) => t.x === folk.x && t.y === folk.y) ? [] : findPathToAny(this.nav, folk, tiles);
      if (path && path.length > 0) {
        folk.path = path;
        action.phase = 'walking';
      } else action.phase = 'using';
    }
    if (action.phase === 'walking') {
      const moved = this.stepAlong(folk, action);
      if (moved !== 'arrived') return;
      action.phase = 'using';
    }
    if (reach(world, folk, fire) <= 3) folk.facing = { x: Math.sign(fire.x - folk.x), y: Math.sign(fire.y - folk.y) };
    folk.needs.fun = Math.max(0, folk.needs.fun - 0.15);
    folk.needs.comfort = Math.max(0, folk.needs.comfort - 0.1);
    setThought(folk, 'fear', 'fire', world.tick, 10);
    action.elapsed++;
    if (action.elapsed >= PANIC_MINUTES) this.finish(folk);
  }

  /** Cozinhar mal põe fogo no fogão: a comida se perde e começa o fogo. */
  // ---------- plano 2, bloco 6: cozinha e mesa ----------

  /** O objeto com esta interação mais perto de `at` (fora `skip`). */
  private nearestWith(id: string, at: Vec, skip?: WorldObject, reach = Infinity): WorldObject | undefined {
    let best: WorldObject | undefined;
    let bestD = Infinity;
    for (const obj of this.world.objects) {
      if (obj === skip) continue;
      const def = this.defOf(obj);
      if (!def || obj.state?.broken || !def.interactions.some((i) => i.id === id)) continue;
      const d = Math.abs(obj.x - at.x) + Math.abs(obj.y - at.y);
      if (d < bestD && d <= reach) {
        bestD = d;
        best = obj;
      }
    }
    return best;
  }

  /** Muda a ação para a etapa seguinte, noutro objeto (mesma ação: a fila não mexe). */
  private retarget(folk: Folk, action: Action, obj: WorldObject, interactionId: string, minutes: number): void {
    action.objectId = obj.id;
    action.interactionId = interactionId;
    action.phase = 'queued';
    action.elapsed = 0;
    action.lightChecked = false;
    delete action.slot;
    delete action.waited;
    folk.path = [];
    if (action.cook) action.cook.minutes = minutes;
  }

  /**
   * Plano 2, bloco 6: começa a cozinhar. A ordem é no fogão, mas o folk vai
   * primeiro à geladeira pegar os ingredientes (as porções saem da despensa
   * ali), depois à bancada picar, volta ao fogão mexer a panela e por fim
   * serve a travessa na bancada. Devolve false se não deu para começar.
   */
  private startCook(folk: Folk, action: Action): boolean {
    const stove = this.findObject(action.objectId!);
    const it = this.interactionOf(action)!;
    const dish = DISH_BY_ID[it.cook!];
    if (!stove || !dish) {
      this.finish(folk);
      return false;
    }
    if (!knowsDish(folk, dish)) {
      this.log('log.dishTooHard', { name: folk.name, dish: `dish.${dish.id}` });
      this.finish(folk);
      return false;
    }
    if (this.world.household.pantry < 1) {
      this.log('log.noFood', { name: folk.name });
      this.finish(folk);
      return false;
    }
    const stoveDef = this.defOf(stove);
    const xp = stoveDef?.interactions.find((i) => i.id === 'stir')?.skill?.xpPerMinute ?? 1.2;
    const servings = Math.min(servingsFor(this.world, dish), this.world.household.pantry);
    action.cook = { dish: dish.id, step: 'fetch', stove: stove.id, servings, minutes: FETCH_MINUTES, bonus: Math.round((xp - 1.2) * 12) };
    const fridge = this.nearestWith('fetchFood', stove);
    if (fridge) this.retarget(folk, action, fridge, 'fetchFood', FETCH_MINUTES);
    else {
      this.takeGroceries(folk, action);
      this.goPrep(folk, action, stove);
    }
    return true;
  }

  /** Tira as porções da despensa (se acabou no caminho, faz o que der). */
  private takeGroceries(_folk: Folk, action: Action): boolean {
    const job = action.cook!;
    const house = this.world.household;
    job.servings = Math.min(job.servings, house.pantry);
    if (job.servings < 1) return false;
    house.pantry -= job.servings;
    return true;
  }

  private goPrep(folk: Folk, action: Action, stove: WorldObject): void {
    const job = action.cook!;
    job.step = 'prep';
    const dish = DISH_BY_ID[job.dish];
    const board = this.nearestWith('prep', stove, stove, 6) ?? stove;
    this.retarget(folk, action, board, 'prep', dish.prep);
  }

  /** Fim de uma etapa do cozinhar: vai para a próxima, ou serve a travessa. */
  private nextCookStep(folk: Folk, action: Action, it: InteractionDef): void {
    const job = action.cook!;
    const stove = this.findObject(job.stove);
    const dish = DISH_BY_ID[job.dish];
    if (!stove || !dish) {
      this.finish(folk);
      return;
    }
    if (it.step === 'fetch') {
      if (!this.takeGroceries(folk, action)) {
        this.log('log.noFood', { name: folk.name });
        this.finish(folk);
        return;
      }
      this.goPrep(folk, action, stove);
      return;
    }
    if (it.step === 'prep') {
      job.step = 'stir';
      this.retarget(folk, action, stove, 'stir', dish.cook);
      return;
    }
    if (it.step === 'stir') {
      const level = skillLevel(folk, 'cooking');
      job.burnt = nextFloat(this.world) < burnChance(level, dish);
      job.step = 'plateUp';
      const spot = mealSpot(this.world, this.catalog, stove);
      this.retarget(folk, action, spot.obj, 'plateUp', PLATE_UP_MINUTES);
      return;
    }
    // servir: a travessa fica onde ele está servindo (ou na bancada mais perto)
    const here = this.findObject(action.objectId!) ?? stove;
    const spot = this.defOf(here)?.interactions.some((i) => i.served) ? this.freeMealTile(here) : null;
    const place = spot ?? mealSpot(this.world, this.catalog, stove);
    const quality = dishQuality(this.world, skillLevel(folk, 'cooking'), job.bonus, moodOf(this.catalog, folk.needs), !!job.burnt);
    serveMeal(this.world, place.obj, place.x, place.y, dish.id, job.servings, quality, !!job.burnt, folk.id);
    this.log(job.burnt ? 'log.cookedBurnt' : quality >= 75 ? 'log.cookedGreat' : 'log.cooked', { name: folk.name, dish: `dish.${dish.id}`, n: job.servings });
    if (!folk.visit) addTrash(this.world, this.catalog, this.logger, folk, 6);
    this.finish(folk);
  }

  /** Um tile do objeto sem travessa em cima. */
  private freeMealTile(obj: WorldObject): { obj: WorldObject; x: number; y: number } | null {
    const def = this.defOf(obj);
    if (!def) return null;
    for (const t of footprint(obj, def)) {
      if (!this.world.mess.some((m) => m.kind === 'meal' && m.x === t.x && m.y === t.y)) return { obj, x: t.x, y: t.y };
    }
    return null;
  }

  /** O que uma porção servida faz por minuto. */
  private servedEffects(p: ServedPlate): Partial<Needs> {
    const dish = DISH_BY_ID[p.dish];
    const k = servedFactor(p);
    const fun = p.burnt ? -0.25 : (dish?.fun ?? 0) * (p.quality / 70) - (p.cold ? 0.05 : 0);
    return { hunger: (dish?.hunger ?? 2.4) * k, fun, energy: -0.02 };
  }

  /** Acabou o prato: o gosto fica (muito bom anima, queimado desanima). */
  private ateServed(folk: Folk, p: ServedPlate): void {
    folk.lastMeal = { dish: p.dish, quality: p.quality, tick: this.world.tick, burnt: p.burnt };
    if (folk.visit) return;
    if (p.burnt || p.quality < 25) {
      folk.needs.fun = Math.max(0, folk.needs.fun - 6);
      this.log('log.ateAwful', { name: folk.name, dish: `dish.${p.dish}` });
    } else if (p.quality >= 75) {
      folk.needs.fun = Math.min(NEED_MAX, folk.needs.fun + 6);
      this.log('log.ateTasty', { name: folk.name, dish: `dish.${p.dish}` });
    }
  }

  /** Alguém já sentado ou deitado neste sofá? */
  private sofaTaken(folk: Folk, obj: WorldObject): boolean {
    return this.world.folks.some(
      (f) => f !== folk && (f.posture?.objectId === obj.id || (f.queue[0]?.objectId === obj.id && f.queue[0].phase === 'using')),
    );
  }

  /** Comando da travessa: servir-se, chamar a família, esquentar ou jogar fora. */
  private mealCommand(folkId: number, messId: number, act: MealAct): boolean {
    const folk = this.findFolk(folkId);
    if (!folk) return false;
    if (folk.visit) return this.fail('visitor');
    const mess = this.world.mess.find((m) => m.id === messId && m.kind === 'meal');
    if (!mess?.meal) return this.fail('noMess');
    const spoiled = isSpoiled(mess.meal, this.world.tick);
    if ((act === 'serve' || act === 'call') && (spoiled || mess.meal.servings <= 0)) return this.fail('noFood');
    if (act === 'reheat' && spoiled) return this.fail('noFood');
    if (folk.age === 'baby') return this.fail('baby');
    if (act === 'reheat' && folk.age === 'child') return this.fail('tooYoung');
    return this.enqueuePlayer(folk, { kind: 'meal', messId, mealAct: act });
  }

  /**
   * Plano 2, bloco 6: mexer na travessa. Servir-se: vai até ela, põe a porção
   * no prato e leva para a mesa (vira a ação de comer). Chamar a família: grita
   * da onde está e todo mundo da casa que pode vem se servir. Esquentar e
   * jogar fora: vai até ela e faz.
   */
  private processMeal(folk: Folk, action: Action): void {
    const mess = this.world.mess.find((m) => m.id === action.messId && m.kind === 'meal');
    if (!mess?.meal) {
      this.finish(folk);
      return;
    }
    if (action.mealAct === 'call') {
      action.phase = 'using';
      action.elapsed++;
      if (action.elapsed < 2) return;
      this.callToMeal(folk, mess);
      this.finish(folk);
      // quem chamou também se serve
      folk.queue.unshift(this.makeAction({ kind: 'meal', messId: mess.id, mealAct: 'serve' } as ActionSeed, action.source));
      return;
    }
    if (action.phase === 'queued') {
      const path = findPathToAny(this.nav, folk, messTiles(this.world, this.nav, mess));
      if (!path) {
        this.log('log.noPath', { name: folk.name });
        this.finish(folk);
        return;
      }
      folk.path = path;
      action.phase = 'walking';
    }
    if (action.phase === 'walking') {
      const moved = this.stepAlong(folk, action);
      if (moved !== 'arrived') return;
      action.phase = 'using';
      action.elapsed = 0;
      if (mess.x !== folk.x || mess.y !== folk.y) folk.facing = { x: Math.sign(mess.x - folk.x), y: Math.sign(mess.y - folk.y) };
      return;
    }
    action.elapsed++;
    const tick = this.world.tick;
    if (action.mealAct === 'reheat') {
      if (action.elapsed < REHEAT_MINUTES) return;
      reheat(mess.meal, tick);
      this.log('log.reheated', { name: folk.name, dish: `dish.${mess.meal.dish}` });
      this.finish(folk);
      return;
    }
    if (action.mealAct === 'scrap') {
      if (action.elapsed < 2) return;
      const next = finishTidy(this.world, this.catalog, this.logger, folk, mess);
      this.log('log.scrapped', { name: folk.name, dish: `dish.${mess.meal.dish}` });
      this.finish(folk);
      this.chain(folk, next, action.source);
      return;
    }
    // servir-se
    if (action.elapsed < SERVE_MINUTES) return;
    const plate = takeServing(mess, tick);
    const on = this.findObject(mess.meal.on);
    if (!plate || !on) {
      this.log('log.noFood', { name: folk.name });
      this.finish(folk);
      return;
    }
    // a travessa vazia vira louça na pia (ou fica para alguém levar)
    if (mess.meal.servings <= 0) {
      this.world.mess = this.world.mess.filter((m) => m !== mess);
      addMess(this.world, 'plate', mess.x, mess.y, mess.meal.cook);
    }
    action.kind = 'use';
    action.objectId = on.id;
    action.interactionId = 'eatServed';
    action.served = plate;
    delete action.mealAct;
    delete action.messId;
    action.phase = 'walking';
    action.elapsed = 0;
    folk.path = [];
  }

  /** "A comida está na mesa!": quem está em casa, acordado e à toa vem se servir. */
  private callToMeal(caller: Folk, mess: Mess): void {
    const meal = mess.meal!;
    let called = 0;
    for (const f of this.household()) {
      if (f === caller || f.away || f.age === 'baby' || f.collapsed > 0 || f.down || f.adrift) continue;
      if (called >= meal.servings - 1) break;
      const head = f.queue[0];
      const it = head && this.interactionOf(head);
      if (head && ((it && isSleep(it)) || head.kind === 'work' || head.kind === 'school' || head.kind === 'meal' || head.served)) continue;
      if (f.queue.length >= MAX_QUEUE) continue;
      f.queue.push(this.makeAction({ kind: 'meal', messId: mess.id, mealAct: 'serve' } as ActionSeed, 'player'));
      called++;
    }
    this.log(called > 0 ? 'log.calledToMeal' : 'log.calledNobody', { name: caller.name, dish: `dish.${meal.dish}` });
  }

  private cookingFire(folk: Folk, obj: WorldObject, def: ObjectDef, it: InteractionDef): boolean {
    if (folk.visit || !(it.step === 'stir' || (it.portions && !it.cook)) || it.skill?.id !== 'cooking') return false;
    if (def.line !== 'stove' && def.id !== 'stove' && def.id !== 'grill') return false;
    if (nextFloat(this.world) >= cookFireChance(skillLevel(folk, 'cooking'))) return false;
    const t = nearestFootprintTile(obj, def, folk);
    if (!addFire(this.world, this.catalog, t.x, t.y)) return false;
    this.log('log.cookFire', { name: folk.name, object: def.name });
    this.finish(folk);
    return true;
  }

  /** Fim do conserto: o choque com Jeito zero pode virar fogo no aparelho. */
  private shockFire(folk: Folk, obj: WorldObject): void {
    if ((folk.sooty ?? 0) !== this.world.tick + SOOTY_MINUTES) return; // não levou choque agora
    if (skillLevel(folk, 'handiness') > 0 || nextFloat(this.world) >= SHOCK_FIRE) return;
    if (addFire(this.world, this.catalog, obj.x, obj.y)) this.log('log.shockFire', { name: folk.name, object: this.defOf(obj)?.name ?? '' });
  }

  /** Lareira: acender (por umas horas) e abafar. */
  private hearthSpecial(folk: Folk, obj: WorldObject | undefined, it: InteractionDef): void {
    if (!obj) return;
    if (it.special === 'kindle') {
      obj.lit = true;
      obj.blaze = this.world.tick + HEARTH_MINUTES;
      this.log('log.kindled', { name: folk.name });
    } else {
      obj.lit = false;
      delete obj.blaze;
    }
  }

  /** Ligações de socorro (bombeiros e polícia). */
  private callHelp(folk: Folk, what: 'fire' | 'police'): void {
    const help = this.world.help;
    if (what === 'fire') {
      if (help.fire !== 0 || this.world.fires.length === 0) return;
      help.fire = this.world.tick + FIRE_RESPONSE;
      this.log('log.calledFire', { name: folk.name });
    } else {
      if (help.police !== 0 || !this.burglar()) return;
      help.police = this.world.tick + POLICE_RESPONSE;
      this.log('log.calledPolice', { name: folk.name });
    }
  }

  // ---------- bloco 14: bombeiros, gatuno e polícia ----------

  private stepFirefighter(folk: Folk): void {
    if (folk.queue.length > 0) {
      this.processAction(folk);
      return;
    }
    const world = this.world;
    const fire = nearestFire(world, folk) ?? world.fires[0];
    if (!fire) {
      this.startLeaving(folk, true);
      return;
    }
    folk.queue.push(this.makeAction({ kind: 'douse', target: { x: fire.x, y: fire.y }, armed: true }, 'auto'));
  }

  /** O gatuno vai até o objeto de mais valor, solta com calma e leva. */
  private stepBurglar(folk: Folk): void {
    const world = this.world;
    const sv = folk.visit!.service!;
    if (folk.queue.length > 0) {
      this.processAction(folk);
      return;
    }
    if (sv.target) {
      const obj = this.findObject(sv.target);
      const def = obj && this.defOf(obj);
      if (!obj || !def || objectBusy(world, obj.id)) {
        sv.target = 0;
        sv.started = -1;
        return;
      }
      if (sv.started < 0) sv.started = world.tick;
      const t = nearestFootprintTile(obj, def, folk);
      if (t.x !== folk.x || t.y !== folk.y) folk.facing = { x: Math.sign(t.x - folk.x), y: Math.sign(t.y - folk.y) };
      if (world.tick - sv.started < STEAL_MINUTES) return;
      sv.loot = JSON.parse(JSON.stringify(obj)) as WorldObject;
      this.removeObject(obj.id, true);
      sv.target = 0;
      this.log('log.stolen', { object: def.name });
      this.startLeaving(folk, true);
      return;
    }
    const target = lootTarget(world, this.catalog, (o) => !!findPathToAny(this.nav, folk, besideTiles(world, this.catalog, this.nav, o)));
    const path = target && findPathToAny(this.nav, folk, besideTiles(world, this.catalog, this.nav, target));
    if (!target || !path) {
      this.startLeaving(folk, true);
      return;
    }
    sv.target = target.id;
    sv.started = -1;
    if (path.length > 0) folk.queue.push(this.makeAction({ kind: 'goto', target: path[path.length - 1] }, 'auto'));
  }

  /** Alarme dispara com o gatuno dentro de casa; quando vê a polícia, ele foge. */
  private watchBurglar(): void {
    const world = this.world;
    const thief = this.burglar();
    if (!thief) return;
    const indoor = !this.catalog.floors[floorAt(world.grid, thief.x, thief.y)]?.outdoor;
    if (indoor && world.help.police === 0 && !thief.visit?.leaving && safetyOf(world, this.catalog, 'burglar')) {
      world.help.police = world.tick + POLICE_RESPONSE;
      this.log('log.burglarAlarm');
      this.wakeAll('burglar');
    }
    const cop = world.folks.find((f) => f.visit?.service?.kind === 'police' && !f.visit.leaving);
    if (cop && !thief.visit!.leaving && reach(world, cop, thief) <= FLEE_RADIUS) {
      thief.visit!.service!.fleeing = true;
      thief.visit!.service!.target = 0;
      this.startLeaving(thief, true);
      this.log('log.burglarFlees');
    }
  }

  /** A polícia corre atrás do gatuno (mais rápido que ele) e prende quando alcança. */
  private stepPolice(folk: Folk): void {
    const world = this.world;
    const thief = this.burglar();
    if (!thief) {
      this.startLeaving(folk, true);
      return;
    }
    for (let i = 0; i < CHASE_STEPS; i++) {
      if (reach(world, folk, thief) <= 1) {
        this.catchBurglar(folk, thief);
        return;
      }
      const path = findPath(this.nav, folk, { x: thief.x, y: thief.y });
      const next = path?.[0];
      if (!next || !this.nav.canStep(folk.x, folk.y, next.x, next.y)) break;
      let dy = next.y - folk.y;
      if (Math.abs(dy) > 1) dy -= Math.sign(dy) * this.nav.stride;
      folk.facing = { x: next.x - folk.x, y: dy };
      folk.x = next.x;
      folk.y = next.y;
    }
    if (reach(world, folk, thief) <= 1) this.catchBurglar(folk, thief);
  }

  private catchBurglar(cop: Folk, thief: Folk): void {
    const world = this.world;
    const sv = thief.visit!.service!;
    if (sv.caught) return;
    sv.caught = true;
    if (sv.loot) {
      this.restoreLoot(sv.loot);
      sv.loot = null;
    }
    world.household.funds += BURGLAR_REWARD;
    this.log('log.burglarCaught', { name: cop.name, reward: formatMoney(BURGLAR_REWARD) });
    const r = this.residents()[0];
    if (r) createNews(world, this.catalog, this.logger, 'caughtBurglar', r.id, 0);
    if (!this.departed.includes(thief.id)) this.departed.push(thief.id);
    this.startLeaving(cop, true);
  }

  /** O que o gatuno levava volta para o lote (no mesmo lugar, ou no mais perto que couber). */
  private restoreLoot(loot: WorldObject): void {
    const world = this.world;
    const back = checkPlacement(world, this.catalog, loot.defId, loot.x, loot.y, loot.rot).ok
      ? { x: loot.x, y: loot.y }
      : freeSpotFor(world, this.catalog, loot.defId, { x: loot.x, y: loot.y });
    if (!back) return;
    world.objects.push({ ...loot, x: back.x, y: back.y });
    this.objectStamp++;
    this.replanAll();
    this.log('log.lootBack', { object: this.catalog.objects[loot.defId]?.name ?? '' });
  }

  // ---------- bloco 14: morte, barganha e luto ----------

  /** Caiu (fogo, fome, afogamento). Sem morte no jogo, escapa por pouco; com, o Seu Sereno vem. */
  private fall(folk: Folk, cause: DeathCause): void {
    const world = this.world;
    folk.queue = [];
    folk.path = [];
    folk.collapsed = 0;
    delete folk.scorch;
    delete folk.starving;
    if (cause === 'drown') delete folk.adrift;
    const c = circleOfFolk(world, folk.id);
    if (c) this.dropFromCircle(folk, c, true);
    if (!world.rules.death) {
      folk.collapsed = NEAR_MISS_REST;
      if (cause === 'hunger') folk.needs.hunger = Math.max(folk.needs.hunger, 40);
      if (cause === 'drown') folk.needs.energy = Math.max(folk.needs.energy, 25);
      if (cause === 'fire') {
        const f = fireAt(world, folk.x, folk.y);
        if (f) douseFire(world, f, 1000);
      }
      folk.needs.comfort = Math.min(folk.needs.comfort, 15);
      this.log(`log.nearMiss.${cause}`, { name: folk.name });
      return;
    }
    folk.down = cause;
    world.passings.push({ folkId: folk.id, cause, at: world.tick, stage: 'coming', deadline: 0 });
    this.log(`log.fell.${cause}`, { name: folk.name });
    for (const o of this.residents()) {
      if (o === folk || o.away || o.down) continue;
      setThought(o, 'fear', 'grave', world.tick, 90);
      o.needs.fun = Math.max(0, o.needs.fun - 15);
    }
  }

  /** O Seu Sereno anda até quem caiu, abre o livro e espera a barganha. */
  private stepReaper(folk: Folk): void {
    const world = this.world;
    const p = world.passings[0];
    if (!p) {
      this.startLeaving(folk, true);
      return;
    }
    const body = this.findFolk(p.folkId);
    if (!body?.down) {
      world.passings.shift();
      return;
    }
    if (folk.queue.length > 0) {
      this.processAction(folk);
      return;
    }
    if (p.stage === 'coming') {
      if (reach(world, folk, body) <= 1) {
        p.stage = 'waiting';
        // bloco 17: de velhice não tem par ou ímpar: ele espera a família se despedir
        p.deadline = world.tick + (p.cause === 'age' ? FAREWELL_MINUTES : BARGAIN_MINUTES);
        folk.facing = { x: Math.sign(body.x - folk.x), y: Math.sign(body.y - folk.y) };
        this.log('log.reaperArrived', { name: body.name });
        return;
      }
      const tiles = fireSideTiles(world, this.nav, body);
      const path = findPathToAny(this.nav, folk, tiles);
      if (!path || path.length === 0) {
        // ele não precisa de caminho: quando não há, aparece do lado
        const t = tiles[0] ?? { x: body.x, y: body.y };
        folk.x = folk.px = t.x;
        folk.y = folk.py = t.y;
        return;
      }
      folk.queue.push(this.makeAction({ kind: 'goto', target: path[path.length - 1] }, 'auto'));
      return;
    }
    if (world.tick >= p.deadline) this.takeAway(p);
  }

  /** Quem joga o par ou ímpar: o adulto da casa mais perto de quem caiu. */
  bargainerFor(body: Folk | undefined): Folk | undefined {
    if (!body) return undefined;
    let best: Folk | undefined;
    let bestD = Infinity;
    for (const f of this.adults()) {
      if (f === body || f.down || f.away || f.collapsed > 0 || f.adrift) continue;
      const d = Math.abs(f.x - body.x) + Math.abs(f.y - body.y);
      if (d < bestD) {
        best = f;
        bestD = d;
      }
    }
    return best;
  }

  /** Par ou ímpar com o Seu Sereno: ganhou, ele fecha o livro; perdeu (ou deixou ir), ele leva. */
  private bargain(pick: 'even' | 'odd' | null): boolean {
    const world = this.world;
    const p = world.passings[0];
    if (!p || p.stage !== 'waiting') return this.fail('noBargain');
    if (p.cause === 'age' && pick !== null) return this.fail('oldAge');
    const body = this.findFolk(p.folkId);
    if (pick === null || !body) {
      this.takeAway(p);
      return true;
    }
    const by = this.bargainerFor(body);
    if (!by) return this.fail('noBargainer');
    const [mine, his] = throwFingers(world);
    const won = bargainWon(pick, mine, his);
    world.lastBargain = { folkId: body.id, bargainer: by.id, pick, mine, his, won, tick: world.tick };
    const params = { name: by.name, other: body.name, mine, his, sum: mine + his };
    if (won) {
      world.passings.shift();
      this.revive(body, p.cause);
      this.log('log.bargainWon', params);
    } else {
      this.log('log.bargainLost', params);
      this.takeAway(p);
    }
    return true;
  }

  /** De volta: levanta devagar, com a necessidade que matava um pouco mais cheia. */
  private revive(folk: Folk, cause: DeathCause): void {
    delete folk.down;
    folk.collapsed = NEAR_MISS_REST;
    if (cause === 'hunger') folk.needs.hunger = Math.max(folk.needs.hunger, 40);
    if (cause === 'drown') folk.needs.energy = Math.max(folk.needs.energy, 30);
    if (cause === 'fire') {
      const f = fireAt(this.world, folk.x, folk.y);
      if (f) douseFire(this.world, f, 1000);
    }
  }

  private takeAway(p: Passing): void {
    const world = this.world;
    world.passings = world.passings.filter((x) => x !== p);
    const body = this.findFolk(p.folkId);
    if (body) this.die(body, p.cause);
  }

  /** Morreu: sai do lote, vira lápide ou urna, e quem conhecia fica de luto. */
  private die(folk: Folk, cause: DeathCause): void {
    const world = this.world;
    const at = { x: folk.x, y: folk.y };
    // bloco 17: o cônjuge e os herdeiros saem antes de o casamento se desfazer
    const spouse = spouseOf(world, folk.id);
    const heirs = heirsOf(world, folk.id, spouse);
    const parents = folk.parents ?? folk.kid?.parents;
    world.departed.push({
      id: folk.id,
      name: folk.name,
      look: { ...folk.look },
      age: folk.age,
      cause,
      died: world.tick,
      ...(parents?.length ? { parents: [...parents] } : {}),
      ...(spouse ? { spouse } : {}),
    });
    this.removeFolk(folk);
    this.inherit(folk, heirs);
    let kind = memorialKind(world, this.catalog, at, cause);
    let spot = freeSpotFor(world, this.catalog, kind, at);
    if (!spot && kind === 'urn') {
      kind = 'grave';
      spot = freeSpotFor(world, this.catalog, kind, at);
    }
    if (spot && this.catalog.objects[kind]) {
      world.objects.push({
        id: world.nextId++,
        defId: kind,
        x: spot.x,
        y: spot.y,
        rot: 0,
        paid: 0,
        state: freshState(),
        memorial: { personId: folk.id, unrest: 100, honored: -1 },
      });
      this.objectStamp++;
      this.replanAll();
    }
    this.log(`log.died.${cause}`, { name: folk.name });
    this.mourn(folk);
    const anyone = this.residents()[0];
    if (anyone) createNews(world, this.catalog, this.logger, 'passedAway', folk.id, 0);
    // sem adulto na casa, as crianças vão morar com parentes
    if (this.adults().length === 0) {
      const kids = this.household();
      for (const k of kids) this.sendAway(k, 'fostered');
      if (kids.length > 0) this.log('log.kidsToRelatives');
    }
    if (this.household().length === 0) this.log('log.houseEmpty');
  }

  // ---------- bloco 17: gerações ----------

  /**
   * Relógio da vida: quem não tem data marcada ganha uma (começando num
   * ponto qualquer da fase), quem chegou na data passa para a fase seguinte.
   * Quem está fora (trabalho, escola) ou caído espera voltar.
   */
  private stepLife(): void {
    const world = this.world;
    for (const folk of this.household()) {
      if (folk.age === 'baby' || folk.down || folk.away) continue;
      // -1 = idoso que já viveu tudo o que o relógio conta (sem morte ligada)
      if (folk.nextAge !== undefined && folk.nextAge < 0) continue;
      if (folk.nextAge === undefined) {
        scheduleAge(world, folk, false);
        continue;
      }
      if (world.tick >= folk.nextAge) this.ageUp(folk);
    }
  }

  /** Passa para a próxima fase (e o que muda com ela). */
  ageUp(folk: Folk): void {
    const world = this.world;
    const stage = stageOf(folk);
    const next = nextStage(stage);
    if (stage === 'elder' || !next) {
      delete folk.nextAge;
      if (world.rules.death) {
        if (world.passings.length === 0) this.fall(folk, 'age');
        else folk.nextAge = world.tick + 60;
      } else {
        folk.nextAge = -1;
        this.log('log.longLife', { name: folk.name });
      }
      return;
    }
    setStage(folk, next);
    const params = { name: folk.name };
    if (next === 'teen') {
      this.log('log.becameTeen', params);
      addAlbum(world, { kind: 'teen', who: [folk.id], names: [folk.name] });
    } else if (next === 'adult') {
      const kid = folk.kid;
      if (kid) {
        if (kid.parents.length && !folk.parents) folk.parents = [...kid.parents];
        addAlbum(world, { kind: 'graduated', who: [folk.id], names: [folk.name], params: { grade: gradeText(kid.grade) } });
        if (kid.grade >= HONOR_AT) this.log('log.graduatedHonor', params);
      }
      delete folk.kid;
      folk.queue = folk.queue.filter((a) => a.kind !== 'school' && !this.interactionOf(a)?.homework);
      this.log('log.becameAdult', params);
      if (folk.job?.partTime) {
        delete folk.job.partTime;
        this.log('log.partTimeFull', { name: folk.name, job: levelOfJob(this.catalog, folk.job)?.title ?? '' });
      }
    } else if (next === 'elder') {
      const job = folk.job;
      if (job) {
        const pension = pensionFor(this.catalog, job);
        folk.retired = { careerId: job.careerId, level: job.level };
        folk.pension = pension;
        this.dropWork(folk);
        folk.job = null;
        if (folk.outfit === 'work') folk.outfit = 'day';
        this.log('log.retired', { name: folk.name, pay: formatMoney(pension) });
        addAlbum(world, { kind: 'retired', who: [folk.id], names: [folk.name], params: { pay: formatMoney(pension) } });
      } else {
        this.log('log.becameElder', params);
        addAlbum(world, { kind: 'elder', who: [folk.id], names: [folk.name] });
      }
      folk.retired ??= { careerId: '', level: -1 };
      folk.pension ??= 0;
    }
    setThought(folk, 'wish', 'spark', world.tick, 30);
    scheduleAge(world, folk, true);
  }

  /** Pensão dos aposentados, uma vez por dia. */
  private payPensions(): void {
    const total = this.household().reduce((s, f) => s + (f.pension ?? 0), 0);
    if (total > 0) this.world.household.funds += total;
  }

  /**
   * Herança: o pecúlio de quem morreu é repartido entre o cônjuge e os filhos
   * (por casa: a nossa, as do bairro, quem mora fora leva a parte embora) e
   * os objetos queridos dele passam para o herdeiro da casa.
   */
  private inherit(dead: Folk, heirs: Heir[]): void {
    const world = this.world;
    const total = estateOf(dead);
    if (total > 0) {
      const shares = splitEstate(total, heirs);
      for (const [where, amount] of shares) {
        if (where === 'home') world.household.funds += amount;
        else if (typeof where === 'number') {
          const fam = world.town?.families.find((f) => f.id === where);
          if (fam) {
            fam.funds += amount;
            pushFeed(world, 'feed.inherited', { family: fam.name, name: dead.name, amount: formatMoney(amount) });
          }
        }
      }
      const home = shares.get('home') ?? 0;
      this.log(home > 0 ? 'log.estate' : 'log.estateAway', { name: dead.name, amount: formatMoney(home), total: formatMoney(total), n: heirs.length });
    }
    for (const obj of world.objects) {
      if (obj.beloved !== dead.id) continue;
      const heir = heirloomHeir(world, dead.id, obj.uses, heirs);
      const def = this.defOf(obj);
      if (!heir) {
        delete obj.beloved;
        continue;
      }
      obj.beloved = heir;
      const who = this.findFolk(heir);
      this.log('log.heirloom', { name: who?.name ?? '', other: dead.name, object: def?.name ?? '' });
      addAlbum(world, { kind: 'heirloom', who: [heir, dead.id], names: [who?.name ?? '', dead.name], params: { object: def?.name ?? '' } });
    }
    addAlbum(world, { kind: 'passing', who: [dead.id], names: [dead.name], params: { stage: `age.${stageOf(dead)}` } });
  }

  /** Tira o folk do mundo (conversas, rodas, festa, telefone, namoros e casamentos). */
  private removeFolk(folk: Folk): void {
    const world = this.world;
    const id = folk.id;
    world.folks = world.folks.filter((f) => f.id !== id);
    for (const c of world.circles) c.members = c.members.filter((m) => m.id !== id);
    for (const f of world.folks) {
      const idx = f.queue.findIndex((a) => a.otherId === id);
      if (idx < 0) continue;
      f.queue = f.queue.filter((a) => a.otherId !== id);
      if (idx === 0) f.path = [];
    }
    for (const [key, rel] of Object.entries(world.relations)) {
      const [a, b] = key.split('>').map(Number);
      if (a !== id && b !== id) continue;
      rel.dating = false;
      delete rel.bond;
    }
    if (world.party?.host === id) world.party = null;
    if (world.call?.answeredBy === id) world.call = null;
    for (const obj of world.objects) if (obj.baby === id) delete obj.baby;
  }

  /** Luto: quem morava junto e quem era amigo guarda a lembrança; os da casa sofrem uns dias. */
  private mourn(dead: Folk): void {
    const world = this.world;
    for (const f of this.household()) {
      if (f.age === 'baby') continue;
      addMemory(world, this.catalog, f.id, dead.id, 'mourned');
      f.mourning = world.tick + MOURN_DAYS * MINUTES_PER_DAY;
      f.needs.fun = Math.max(0, f.needs.fun - 30);
      f.needs.social = Math.max(0, f.needs.social - 15);
      setThought(f, 'miss', 'grave', world.tick, 240);
    }
    for (const [key, rel] of Object.entries(world.relations)) {
      const [from, to] = key.split('>').map(Number);
      if (to !== dead.id || rel.friendship < MOURN_FRIENDSHIP) continue;
      if (this.findFolk(from) && !this.findFolk(from)!.visit) continue;
      addMemory(world, this.catalog, from, dead.id, 'mourned');
    }
  }

  /** Homenagem na lápide: acalma o fantasma (uma vez por dia) e alivia o luto. */
  private honor(folk: Folk, action: Action): void {
    const world = this.world;
    const obj = action.objectId !== undefined ? this.findObject(action.objectId) : undefined;
    const m = obj?.memorial;
    if (!m) return;
    const name = world.departed.find((d) => d.id === m.personId)?.name ?? '';
    const today = Math.floor(world.tick / MINUTES_PER_DAY);
    if (folk.mourning) folk.mourning = Math.max(world.tick, folk.mourning - MINUTES_PER_DAY);
    if (m.honored === today || m.unrest <= 0) {
      this.log('log.honoredAgain', { name: folk.name, other: name });
      return;
    }
    m.honored = today;
    m.unrest = Math.max(0, m.unrest - HONOR_REST);
    folk.needs.fun = Math.min(NEED_MAX, folk.needs.fun + 10);
    this.log(m.unrest > 0 ? 'log.honored' : 'log.restInPeace', { name: folk.name, other: name });
  }

  // ---------- bloco 14: fantasmas ----------

  private stepSpirits(minute: number): void {
    const world = this.world;
    if (minute === SPIRIT_FROM * 60) {
      for (const obj of world.objects) {
        const m = obj.memorial;
        const def = this.defOf(obj);
        if (!m || !def || m.unrest <= 0 || world.spirits.some((s) => s.objectId === obj.id)) continue;
        if (nextFloat(world) >= SPIRIT_CHANCE) continue;
        const tiles = spiritTiles(world, this.nav, obj, def);
        if (tiles.length === 0) continue;
        const t = tiles[nextInt(world, tiles.length)];
        world.spirits.push({ personId: m.personId, objectId: obj.id, x: t.x, y: t.y, px: t.x, py: t.y, until: world.tick + (24 - SPIRIT_FROM + SPIRIT_TO) * 60 });
        this.log('log.spiritRises', { name: this.departedName(m.personId) });
      }
    }
    for (const s of [...world.spirits]) {
      s.px = s.x;
      s.py = s.y;
      const obj = this.findObject(s.objectId);
      if (!obj?.memorial || world.tick >= s.until) {
        world.spirits = world.spirits.filter((x) => x !== s);
        if (obj?.memorial && obj.memorial.unrest > 0) {
          obj.memorial.unrest = Math.max(0, obj.memorial.unrest - SPIRIT_REST_PER_NIGHT);
          if (obj.memorial.unrest === 0) this.log('log.restInPeaceAlone', { other: this.departedName(s.personId) });
        }
        continue;
      }
      if (world.tick % SPIRIT_STEP === 0) {
        const n = spiritStep(world, this.nav, s, obj);
        s.x = n.x;
        s.y = n.y;
      }
      for (const f of world.folks) {
        if (f.visit?.service || f.away || f.down || f.age === 'baby') continue;
        if (reach(world, f, s) > SCARE_RADIUS) continue;
        if ((f.frightened ?? -Infinity) > world.tick - SCARE_GAP) continue;
        const sleeping = asleep(f, this.catalog, world);
        if (sleeping && nextFloat(world) > 0.1) continue;
        this.scare(f, s);
      }
    }
  }

  private departedName(id: number): string {
    return this.world.departed.find((d) => d.id === id)?.name ?? '';
  }

  /** Susto: acorda, perde conforto e diversão; visita vai embora correndo. */
  private scare(folk: Folk, s: Spirit): void {
    const world = this.world;
    folk.frightened = world.tick;
    this.wake(folk, 'ghost');
    folk.needs.comfort = Math.max(0, folk.needs.comfort - 20);
    folk.needs.fun = Math.max(0, folk.needs.fun - 15);
    folk.needs.energy = Math.max(0, folk.needs.energy - 5);
    addMemory(world, this.catalog, folk.id, s.personId, 'hauntedMe');
    if (folk.visit) {
      this.startLeaving(folk);
      this.log('log.guestScared', { name: folk.name, other: this.departedName(s.personId) });
    } else {
      this.log('log.scared', { name: folk.name, other: this.departedName(s.personId) });
    }
  }

  // ---------- plano 2, bloco 7: lazer, estudo e trabalho em casa ----------

  /**
   * Com o livro na mão (a etapa de pegar na estante acabou), procura um
   * assento livre perto e vai sentar para ler. Sem assento, lê ali mesmo.
   * Devolve true quando saiu andando.
   */
  private goRead(folk: Folk, action: Action): boolean {
    action.picked = true;
    if (folk.age === 'baby') return false;
    const seat = couchSeat(this.world, this.catalog, this.nav, folk, READ_REACH) ?? this.chairSeat(folk);
    if (!seat) return false;
    action.seatAt = seat.seat.id;
    action.slot = seat.place.index;
    action.phase = 'queued';
    action.lightChecked = false;
    folk.path = [];
    return true;
  }

  /** Cadeira livre (de mesa também) a até READ_REACH passos. */
  private chairSeat(folk: Folk): { seat: WorldObject; place: { index: number } } | null {
    let best: { seat: WorldObject; place: { index: number }; d: number } | null = null;
    for (const seat of this.world.objects) {
      const def = this.defOf(seat);
      if (!def || def.category !== 'seating' || !isSeat(def)) continue;
      const fs = freeSeatSpot(this.world, this.nav, folk, seat, def);
      if (!fs || fs.path.length > READ_REACH) continue;
      if (!best || fs.path.length < best.d) best = { seat, place: fs.place, d: fs.path.length };
    }
    return best;
  }

  /** Releitura de livro já terminado rende menos. */
  private bookTraining(folk: Folk, it: InteractionDef): InteractionDef {
    const k = readFactor(folk, it.book!);
    return k === 1 || !it.skill ? it : { ...it, skill: { ...it.skill, xpPerMinute: it.skill.xpPerMinute * k } };
  }

  /**
   * Um minuto das atividades do bloco 7. Devolve true quando a ação acabou
   * ali (trabalho pronto, quadro pronto, sem caminho para correr).
   */
  private hobbyTick(folk: Folk, action: Action, it: InteractionDef, used: WorldObject | undefined): boolean {
    if (it.book && !folk.visit && readTick(folk, it.book) === 'finished') {
      const def = BOOKS[it.book];
      this.log('log.bookFinished', { name: folk.name, book: `book.${it.book}`, skill: this.catalog.skills[def.skill]?.name ?? def.skill });
    }
    if (it.project && !folk.visit) {
      const done = projectTick(folk, it.project);
      if (done) {
        this.world.household.funds += done.pay;
        this.log(`log.projectDone.${it.project}`, { name: folk.name, money: formatMoney(done.pay), count: done.count });
        this.trainCare(folk, it);
        this.finish(folk);
        return true;
      }
    }
    if (it.canvas === 'paint' && used) {
      if (paintTick(used, folk, this.world.tick + folk.id * 31)) {
        folk.works = { ...(folk.works ?? {}), painting: (folk.works?.painting ?? 0) + 1 };
        this.log('log.paintingDone', { name: folk.name, money: formatMoney(paintingPrice(used.canvas)) });
        this.trainCare(folk, it);
        this.finish(folk);
        return true;
      }
    }
    if (it.jog) this.jogStep(folk, action);
    if (it.online) this.chatOnline(folk);
    return false;
  }

  /** Fim de vender o quadro ou de começar outro. */
  private canvasDone(folk: Folk, obj: WorldObject, it: InteractionDef): void {
    if (it.canvas === 'sell' && obj.canvas && obj.canvas.progress >= 100) {
      const price = paintingPrice(obj.canvas);
      this.world.household.funds += price;
      this.log(canvasQuality(obj.canvas) >= 6 ? 'log.paintingSoldWell' : 'log.paintingSold', { name: folk.name, money: formatMoney(price) });
      delete obj.canvas;
    } else if (it.canvas === 'scrap' && obj.canvas) {
      delete obj.canvas;
      this.log('log.canvasScrapped', { name: folk.name });
    }
  }

  /** Procurar emprego no computador: pega a vaga que mais combina com o que sabe. */
  private jobHunt(folk: Folk): void {
    if (folk.job) {
      this.log('log.jobHuntHasJob', { name: folk.name });
      return;
    }
    let best: { id: string; score: number } | null = null;
    for (const c of Object.values(this.catalog.careers)) {
      const score = c.skills.reduce((s, k) => s + (folk.skills[k] ?? 0), 0);
      if (!best || score > best.score) best = { id: c.id, score };
    }
    if (best) this.run({ type: 'takeJob', folkId: folk.id, careerId: best.id });
  }

  /**
   * Fim da leitura longe da estante: devolve true se o folk vai devolver o
   * livro; senão o livro fica largado ali (bagunça 'book').
   */
  private putBookBack(folk: Folk, action: Action): boolean {
    if (!action.picked || action.seatAt === undefined) return false;
    if (returnsBook(tidyOf(this.catalog, folk), nextFloat(this.world))) return true;
    addMess(this.world, 'book', folk.x, folk.y, folk.id);
    return false;
  }

  /** Corrida: monta o caminho pela calçada (ida e volta). Sem caminho, desiste. */
  private startJog(folk: Folk, action: Action): boolean {
    const world = this.world;
    const outdoor = (x: number, y: number) => {
      const f = this.catalog.floors[floorAt(world.grid, x, y)];
      return !!f?.outdoor && !f.water;
    };
    const route = jogRoute(this.nav, { x: folk.x, y: folk.y }, outdoor);
    if (route.length === 0) {
      this.log('log.noJogRoute', { name: folk.name });
      this.finish(folk);
      return false;
    }
    action.route = route;
    action.leg = 0;
    return true;
  }

  /** Um minuto de corrida: um passo pelo caminho (no fim, volta a correr dali). */
  private jogStep(folk: Folk, action: Action): void {
    const route = action.route;
    if (!route || route.length === 0) return;
    const at = route[(action.leg ?? 0) % route.length];
    action.leg = ((action.leg ?? 0) + 1) % route.length;
    if (!this.nav.isFree(at.x, at.y)) return;
    if (at.x !== folk.x || at.y !== folk.y) folk.facing = { x: Math.sign(at.x - folk.x), y: Math.sign(at.y - folk.y) };
    folk.x = at.x;
    folk.y = at.y;
  }

  /** Conversa à distância: o melhor amigo (de casa ou do bairro) do outro lado. */
  private chatOnline(folk: Folk): void {
    let best: { id: number; f: number } | null = null;
    for (const [k, rel] of Object.entries(this.world.relations)) {
      const [from, to] = k.split('>').map(Number);
      if (from !== folk.id || to === folk.id) continue;
      if (!best || rel.friendship > best.f) best = { id: to, f: rel.friendship };
    }
    if (!best) return;
    const other = this.findFolk(best.id) ?? this.world.neighbors.find((n) => n.id === best!.id);
    if (!other) return;
    const who = { id: other.id, traits: other.traits ?? [] };
    applyDelta(this.world, this.catalog, folk, who, { friendship: 0.03 });
    applyDelta(this.world, this.catalog, who, folk, { friendship: 0.03 });
  }

  /** Janela mais perto: o tile de dentro, de frente para a janela, e o tile do outro lado. */
  private windowSpot(folk: Folk): { at: Vec; out: Vec } | null {
    const grid = this.world.grid;
    const WINDOWS = new Set(['window', 'windowTall', 'windowHigh']);
    const options: { at: Vec; out: Vec }[] = [];
    for (const [key, kind] of Object.entries(grid.edges)) {
      if (!WINDOWS.has(kind)) continue;
      const [xs, ys, side] = key.split(',');
      const x = Number(xs);
      const y = Number(ys);
      const other = side === 'N' ? { x, y: y - 1 } : { x: x - 1, y };
      const here = { x, y };
      const inside = (v: Vec) => v.x >= 0 && v.y >= 0 && v.x < grid.w && v.y < grid.h && !this.catalog.floors[floorAt(grid, v.x, v.y)]?.outdoor;
      if (inside(here) && this.nav.isFree(here.x, here.y)) options.push({ at: here, out: other });
      if (inside(other) && this.nav.isFree(other.x, other.y)) options.push({ at: other, out: here });
    }
    if (options.length === 0) return null;
    const path = findPathToAny(this.nav, folk, options.map((o) => o.at));
    if (!path) return null;
    const end = path.length > 0 ? path[path.length - 1] : { x: folk.x, y: folk.y };
    return options.find((o) => o.at.x === end.x && o.at.y === end.y) ?? null;
  }

  /** Olhar pela janela ('window') ou um gesto parado ('gesture', o tchau da porta). */
  private processStill(folk: Folk, action: Action): void {
    if (action.kind === 'gesture') {
      action.phase = 'using';
      action.elapsed++;
      if (action.elapsed >= (action.minutes ?? 2)) this.finish(folk);
      return;
    }
    if (action.phase === 'queued') {
      const path = this.planPath(folk, action);
      if (!path) {
        this.log('log.noPath', { name: folk.name });
        this.finish(folk);
        return;
      }
      folk.path = path;
      action.phase = 'walking';
    }
    if (action.phase === 'walking') {
      const moved = this.stepAlong(folk, action);
      if (moved !== 'arrived') return;
      action.phase = 'using';
      const out = action.route?.[0];
      if (out) folk.facing = { x: Math.sign(out.x - folk.x), y: Math.sign(out.y - folk.y) };
      return;
    }
    // olhando lá fora: descansa a cabeça; de dia diverte mais, com chuva acalma
    const night = daylightAt(this.world.tick) < 0.5;
    applyEffects(folk, { effects: { fun: night ? 0.35 : 0.6, comfort: 0.5 } } as InteractionDef);
    action.elapsed++;
    if (action.elapsed >= WINDOW_MINUTES) {
      if (!folk.visit) this.log(night ? 'log.windowNight' : 'log.windowDay', { name: folk.name });
      this.finish(folk);
    }
  }

  /** Acompanha a visita até a porta conversando e dá tchau de lá. */
  private escort(host: Folk, guest: Folk): void {
    const path = findPath(this.nav, guest, this.streetDoor(guest.id));
    if (!path || path.length < 2) return;
    // até o primeiro tile de fora (a porta), ou meio caminho se for tudo aberto
    let stop = path.findIndex((p) => !!this.catalog.floors[floorAt(this.world.grid, p.x, p.y)]?.outdoor);
    if (stop < 0) stop = Math.floor(path.length / 2);
    stop = Math.max(0, Math.min(path.length - 1, stop + 1));
    const target = path[stop];
    const walk = this.makeAction({ kind: 'goto', target: { ...target } }, 'player');
    walk.escort = guest.id;
    const wave = this.makeAction({ kind: 'gesture' }, 'player');
    wave.gesture = 'wave';
    wave.minutes = 2;
    wave.escort = guest.id;
    host.queue.splice(1, 0, walk, wave);
  }

  /**
   * Sentar junto para conversar: acha um assento com dois lugares livres
   * lado a lado (sofá, ou duas cadeiras vizinhas), cada um senta no seu e a
   * conversa começa sentada.
   */
  private sitTogether(folk: Folk, other: Folk): void {
    const pair = this.seatPair(folk, other);
    if (!pair) {
      this.log('log.noSeatPair', { name: folk.name });
      return;
    }
    const mine = this.makeAction({ kind: 'use', objectId: pair.a.seat, interactionId: 'sit', slot: pair.a.spot }, 'player');
    const chat = this.makeAction({ kind: 'social', otherId: other.id, socialId: 'chat' }, 'player');
    chat.sitWith = true;
    folk.queue.splice(1, 0, mine, chat);
    // quem ouvia larga o ouvir (sem passar pelo abandono, que encerraria a conversa dos dois) e vai sentar
    const rest = other.queue.filter((a) => a.kind !== 'listen' && a.source === 'player');
    other.queue = [this.makeAction({ kind: 'use', objectId: pair.b.seat, interactionId: 'sit', slot: pair.b.spot }, 'auto'), ...rest];
    other.path = [];
  }

  /** Dois lugares livres lado a lado (no mesmo assento ou em assentos vizinhos). */
  private seatPair(folk: Folk, other: Folk): { a: { seat: number; spot: number }; b: { seat: number; spot: number } } | null {
    type Free = { seat: number; spot: number; cell: Vec; steps: number };
    const free: Free[] = [];
    for (const seat of this.world.objects) {
      const def = this.defOf(seat);
      if (!def || def.category !== 'seating' || !isSeat(def)) continue;
      for (const place of spotPlaces(this.world, this.nav, seat, def)) {
        if (place.spot.kind !== 'sit' || place.from.length === 0) continue;
        if (spotOwner(this.world, seat.id, place.index, folk) && spotOwner(this.world, seat.id, place.index, other)) continue;
        const owner = spotOwner(this.world, seat.id, place.index, folk);
        if (owner && owner !== other) continue;
        const path = findPathToAny(this.nav, folk, place.from);
        if (!path || path.length > READ_REACH * 2) continue;
        free.push({ seat: seat.id, spot: place.index, cell: place.cell, steps: path.length });
      }
    }
    let best: { a: Free; b: Free; score: number } | null = null;
    for (const a of free) {
      for (const b of free) {
        if (a === b || Math.abs(a.cell.x - b.cell.x) + Math.abs(a.cell.y - b.cell.y) !== 1) continue;
        const score = a.steps + b.steps;
        if (!best || score < best.score) best = { a, b, score };
      }
    }
    return best ? { a: { seat: best.a.seat, spot: best.a.spot }, b: { seat: best.b.seat, spot: best.b.spot } } : null;
  }

  /** O outro ainda está indo sentar do lado? (espera até WAIT_LIMIT minutos) */
  private waitSeatMate(folk: Folk, head: Action): boolean {
    const other = head.otherId !== undefined ? this.findFolk(head.otherId) : undefined;
    if (!other) return false;
    const seated = !!other.posture && other.posture.rising === undefined && Math.abs(other.x - folk.x) + Math.abs(other.y - folk.y) <= 1;
    const going = other.queue[0]?.kind === 'use' && other.queue[0]?.interactionId === 'sit';
    if (seated && !(going && other.queue[0]?.stage === 'enter')) return false;
    head.waited = (head.waited ?? 0) + 1;
    if (head.waited > WAIT_LIMIT * 2) {
      delete head.sitWith;
      return false;
    }
    return going || !seated;
  }

  private faceObject(folk: Folk, action: Action): void {
    const obj = action.objectId !== undefined ? this.findObject(action.objectId) : undefined;
    const def = obj && this.defOf(obj);
    if (!obj || !def) return;
    const t = nearestFootprintTile(obj, def, folk);
    if (t.x !== folk.x || t.y !== folk.y) folk.facing = { x: t.x - folk.x, y: t.y - folk.y };
  }
}

/** Bloco 9: sinal do balão de assunto (+ gostou, - detestou, nada = tanto faz). */
export function topicMark(r: Reaction): string {
  return r === 'love' || r === 'like' ? '+' : r === 'hate' ? '-' : '';
}

/** Bloco 9: estrelas da festa pela animação média (0 a 100). */
export function partyGrade(score: number): number {
  return score >= 74 ? 5 : score >= 62 ? 4 : score >= 48 ? 3 : score >= 34 ? 2 : 1;
}

/** Quem deu a festa, morador ou não (para a relação com quem reclamou). */
function personOfHost(world: World, id: number): Pick<Folk, 'id' | 'traits'> | undefined {
  return world.folks.find((f) => f.id === id) ?? world.neighbors.find((n) => n.id === id);
}

/** Bloco 9: o mesmo mapa de passagem, com alguns tiles tratados como ocupados. */
function avoiding(nav: Nav, busy: Set<number>): Nav {
  if (!busy.size) return nav;
  const isFree = (x: number, y: number) => nav.isFree(x, y) && !busy.has(y * nav.w + x);
  return {
    ...nav,
    isFree,
    canStep: (ax, ay, bx, by) => nav.canStep(ax, ay, bx, by) && !busy.has(by * nav.w + bx),
  };
}

/** Plano 2, bloco 4: efeitos multiplicados (o que a TV rende a quem só está por perto). */
function scaled(effects: Partial<Needs>, k: number): Partial<Needs> {
  const out: Partial<Needs> = {};
  for (const [id, v] of Object.entries(effects)) out[id as keyof Needs] = (v ?? 0) * k;
  return out;
}

/** Bloco 9: treino de Lábia de quem está com a palavra na roda. */
const CIRCLE_TALK = { skill: { id: 'charisma', xpPerMinute: 0.2 } } as InteractionDef;
