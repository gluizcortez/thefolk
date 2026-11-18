import { chooseAutonomous } from './ai';
import type { BuildCommand, BuildProblem, GridChange } from './build';
import { applyChange, checkGrid, invertChange, isBuildCommand, planBuild, touchesNav } from './build';
import { WEATHER_HOUR, freshPlant, gardenHour, harvest, replant, rollWeather } from './garden';
import { poolHasLadder, poolOf } from './yard';
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
import { MINUTES_PER_DAY, clockOf } from './clock';
import type { PlaceProblem } from './economy';
import { billAmount, checkPlacement, formatMoney, objectBusy, sellValue } from './economy';
import type { Nav } from './grid';
import { blocksStep, buildNav, edgeKey, nearestFootprintTile, useTiles } from './grid';
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
import { acceptChance, adjacent, onLot, socialAllowed, talkTiles, talkingWith } from './social';
import type {
  Action,
  Catalog,
  Circle,
  Command,
  Folk,
  InteractionDef,
  NeedId,
  Neighbor,
  ObjectDef,
  RelDelta,
  SocialDef,
  Vec,
  World,
  WorldObject,
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
  tidyMinutes,
  finishTidy,
  wearTick,
} from './upkeep';
import { BILL_INTERVAL, isServiceNeighbor } from './world';
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
  savingsOf,
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
  kidAllows,
  kidsOf,
  learnFromCaregiver,
  schoolDelta,
} from './kids';
import type { BabyCare, Expecting } from './types';
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

/** Por que o último comando foi recusado (para a interface explicar). */
export type CommandProblem =
  | PlaceProblem
  | BuildProblem
  | 'busy'
  | 'away'
  | 'collapsed'
  | 'queueFull'
  | 'invalid'
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
  | 'expecting';

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
/** de quanto em quanto tempo uma ação autônoma é reavaliada */
const AUTO_RECHECK = 10;
const CRITICAL_NEED = 15;
const COLLAPSE_MINUTES = 150;
/** quantas obras ficam guardadas para desfazer */
const UNDO_LIMIT = 40;
const COLLAPSE_ENERGY_PER_MINUTE = 0.3;

type ActionSeed = Pick<
  Action,
  'kind' | 'objectId' | 'interactionId' | 'target' | 'otherId' | 'socialId' | 'messId' | 'serviceId' | 'welcome' | 'circleId' | 'topic' | 'guests' | 'wedding'
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
  | { kind: 'move'; objectId: number; x: number; y: number; rot: WorldObject['rot'] };

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
  /** resultados de conversa ainda não lidos pela tela (não vai no save) */
  private outcomes: SocialOutcome[] = [];
  /** visitas que chegaram à calçada neste minuto e saem do lote */
  private departed: number[] = [];
  /** obras que dá para desfazer, da mais antiga para a mais nova (não vai no save) */
  private undoStack: { back: GridChange; cost: number }[] = [];
  /** bloco 4: compras, vendas e mudanças do modo compra que dá para desfazer */
  private buyStack: BuyUndo[] = [];

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
    const obj = this.findObject(action.objectId);
    const def = obj && this.defOf(obj);
    return def?.interactions.find((i) => i.id === action.interactionId);
  }

  // ---------- comandos ----------

  dispatch(cmd: Command): boolean {
    this.lastProblem = null;
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
        this.world.speed = cmd.speed;
        return true;
      case 'setAutonomy': {
        const folk = this.findFolk(cmd.folkId);
        if (!folk) return false;
        if (folk.visit) return this.fail('visitor');
        folk.autonomy = cmd.on;
        return true;
      }
      case 'cancel': {
        const folk = this.findFolk(cmd.folkId);
        if (!folk) return false;
        const idx = folk.queue.findIndex((a) => a.id === cmd.actionId);
        if (idx < 0) return false;
        folk.queue.splice(idx, 1);
        if (idx === 0) folk.path = [];
        return true;
      }
      case 'queueUse': {
        const folk = this.findFolk(cmd.folkId);
        const obj = this.findObject(cmd.objectId);
        const def = obj && this.defOf(obj);
        const it = def?.interactions.find((i) => i.id === cmd.interactionId);
        // convites e serviços passam pelos comandos 'invite' e 'callService'
        if (!folk || !obj || !def || !it || it.special === 'invite' || it.special === 'services' || it.special === 'party' || it.hidden) return false;
        if (folk.visit && (it.residentOnly || (it.cost ?? 0) > 0 || it.care)) return this.fail('visitor');
        // bloco 11: idade (bebê, criança no fogão, lição sem lição, brinquedo de criança)
        if (folk.age === 'baby') return this.fail('baby');
        if (!kidAllows(folk, it)) return this.fail(it.homework ? 'nothingToDo' : 'tooYoung');
        if (it.special === 'adopt') {
          if (this.world.household.expecting) return this.fail('expecting');
          if (this.household().length >= MAX_RESIDENTS) return this.fail('houseFull');
          if (!freeCrib(this.world, this.catalog)) return this.fail('noCrib');
        }
        if (!interactionOpen(obj, it)) return this.fail(it.care || it.light || it.baby ? 'nothingToDo' : 'broken');
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
        if (def.special === 'moveOut' && (this.adults().length < 2 || other.age !== undefined)) return this.fail('lastResident');
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
        if (folk.age !== undefined) return this.fail('tooYoung');
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
      case 'answerPhone': {
        const folk = this.findFolk(cmd.folkId);
        if (!folk) return false;
        if (!this.world.call || this.world.call.answeredBy) return this.fail('noCall');
        const best = this.nearestSpecial(folk, 'answer');
        if (!best) return this.fail('noPhone');
        return this.enqueuePlayer(folk, { kind: 'use', objectId: best.obj.id, interactionId: best.it.id });
      }
      case 'buy':
        return this.buy(cmd.defId, cmd.x, cmd.y, cmd.rot, cmd.color);
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
        const check = checkPlacement(this.world, this.catalog, obj.defId, cmd.x, cmd.y, cmd.rot, obj.id);
        if (!check.ok) return this.fail(check.problem ?? 'invalid');
        this.pushBuyUndo({ kind: 'move', objectId: obj.id, x: obj.x, y: obj.y, rot: obj.rot });
        obj.x = cmd.x;
        obj.y = cmd.y;
        obj.rot = cmd.rot;
        this.replanAll();
        return true;
      }
      case 'takeJob': {
        const folk = this.findFolk(cmd.folkId);
        const career = this.catalog.careers[cmd.careerId];
        if (!folk || !career) return false;
        if (folk.visit) return this.fail('visitor');
        if (folk.age !== undefined) return this.fail('tooYoung');
        if (folk.away) return this.fail('away');
        if (folk.job?.careerId === cmd.careerId) return false;
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
        if (folk.age !== undefined) return this.fail('tooYoung');
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
        if (folk.age !== undefined) return this.fail('tooYoung');
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

  private buy(defId: string, x: number, y: number, rot: WorldObject['rot'], color?: string): boolean {
    const def = this.catalog.objects[defId];
    if (!def || def.buyable === false) return false;
    if (def.reward && !(this.world.household.unlocked ?? []).includes(def.id)) return this.fail('locked');
    if (this.world.household.funds < def.price) return this.fail('funds');
    const check = checkPlacement(this.world, this.catalog, defId, x, y, rot);
    if (!check.ok) return this.fail(check.problem ?? 'invalid');
    const obj: WorldObject = { id: this.world.nextId++, defId, x, y, rot, paid: def.price, state: freshState(), bought: this.world.tick, used: 0, uses: {} };
    if (color && def.colors?.includes(color)) obj.color = color;
    // bloco 13: planta comprada chega muda (o vaso já vem crescido)
    if (def.plant) obj.plant = freshPlant(def.plant);
    this.world.objects.push(obj);
    this.world.household.funds -= def.price;
    this.pushBuyUndo({ kind: 'buy', objectId: obj.id, cost: def.price });
    wishOnBuy(this.world, this.catalog, this.logger, def.category);
    this.replanAll();
    return true;
  }

  private sell(objectId: number): boolean {
    const obj = this.findObject(objectId);
    const def = obj && this.defOf(obj);
    if (!obj || !def) return false;
    if (objectBusy(this.world, objectId)) return this.fail('inUse');
    const value = sellValue(this.world, obj, def);
    this.world.household.funds += value;
    this.pushBuyUndo({ kind: 'sell', obj: JSON.parse(JSON.stringify(obj)) as WorldObject, got: value });
    this.removeObject(objectId);
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
    obj.x = last.x;
    obj.y = last.y;
    obj.rot = last.rot;
    this.replanAll();
    return true;
  }

  /** Tira o objeto do lote (venda ou penhora) e de todas as filas. */
  private removeObject(objectId: number, quiet = false): void {
    const gone = this.findObject(objectId);
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
    // ordem do jogador passa por cima do que o folk fazia por conta própria
    if (folk.queue.some((a) => a.source === 'auto')) {
      folk.queue = folk.queue.filter((a) => a.source !== 'auto');
      folk.path = [];
    }
    if (folk.queue.length >= MAX_QUEUE) return this.fail('queueFull');
    folk.queue.push(this.makeAction(partial, 'player'));
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
    for (const obj of world.objects) {
      const def = this.catalog.objects[obj.defId];
      // bloco 7: som ligado também gasta luz
      if (shining(obj, def) || playing(obj, def)) world.household.lightMinutes++;
    }
    const minute = world.tick % MINUTES_PER_DAY;
    // bloco 13: o tempo do dia (chuva) e o jardim, de hora em hora
    if (minute === WEATHER_HOUR * 60) rollWeather(world);
    if (minute % 60 === 30) gardenHour(world, this.catalog, this.logger);
    this.stepServices(minute);
    // bloco 9: telefone tocando e festa
    this.stepPhone();
    this.stepParty();
    // bloco 11: bebê a caminho, visitadora social
    this.stepFamily();
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
    if (minute === 0 && Math.floor(world.tick / MINUTES_PER_DAY) % HABIT_PERIOD_DAYS === 0) this.settleTempers();
    this.stepVisits();
    for (const folk of world.folks) {
      this.stepJob(folk);
      if (folk.age === 'child' && !folk.visit) this.stepSchool(folk);
      if (folk.gig) checkGigDeadline(world, this.catalog, this.logger, folk);
      if (folk.business && minute === BUSINESS_CLOSE_HOUR * 60) settleBusiness(world, this.catalog, this.logger, folk);
      this.stepFolk(folk);
    }
    this.stepCircles();
    for (const id of this.departed) this.removeVisitor(id);
    this.departed = [];
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
    return this.world.folks.filter((f) => !f.visit && f.age === undefined);
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
    const amount = billAmount(this.world, this.catalog) + light;
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
    const career = job && careerOf(this.catalog, job);
    for (const id of NEED_IDS) {
      if (id === 'ambience') continue;
      const rate = this.catalog.needs[id].decayPerMinute * (AWAY_DECAY[id] ?? 1);
      const extra = career?.shiftEffects[id] ?? 0;
      folk.needs[id] = clampNeed(folk.needs[id] - rate + extra);
    }
    // ninguém desmaia no serviço: chega em casa no bagaço, mas chega
    folk.needs.energy = Math.max(3, folk.needs.energy);
    // bloco 11: na escola tem merenda
    if (folk.age === 'child') folk.needs.hunger = Math.max(folk.needs.hunger, SCHOOL_LUNCH);
    else this.stepWorkEvent(folk);
    if (this.world.tick >= away.until) {
      if (folk.age === 'child') this.backFromSchool(folk);
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
    const next = career?.levels[job.level + 1];
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
      if (folk.autonomy && folk.idleTicks >= IDLE_BEFORE_AUTO) this.pickAutonomous(folk);
    } else {
      folk.idleTicks = 0;
    }

    this.processAction(folk);
    // bloco 9: parado à toa no mesmo tile de outra pessoa? dá um passo para o lado
    if (folk.queue.length === 0) this.spreadOut(folk);
    if (folk.x !== folk.px || folk.y !== folk.py) this.leftRoom(folk);
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
      if (folk.alarm && (folk.job || folk.age === 'child') && wakeTime(this.catalog, folk, tick) === tick) {
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

  private pickAutonomous(folk: Folk): void {
    folk.idleTicks = 0;
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
    if (action.kind === 'door') {
      this.processDoor(folk, action);
      return;
    }
    if (action.kind === 'circle') {
      this.processCircle(folk, action);
      return;
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
      if (action.eatAt !== undefined) {
        // bloco 4: chegou à mesa com a comida; acende a luz se estiver escuro
        if (!action.lightChecked) {
          action.lightChecked = true;
          if (this.lightUp(folk)) {
            action.phase = 'queued';
            return;
          }
        }
        action.phase = 'using';
        const seat = action.eatAt >= 0 ? this.findObject(action.eatAt) : undefined;
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
      if (obj && odef && this.usingCount(obj.id, folk) >= (odef.slots ?? 1)) {
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
        if (!it.care && !it.snacks) this.log('log.foundBroken', { name: folk.name, object: odef.name });
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
        action.lightChecked = true;
        if (!isSleep(it) && this.lightUp(folk)) {
          action.phase = 'queued';
          return;
        }
      }
      if (it && action.source === 'player' && this.refuse(folk, it)) {
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
      if (it) consumeFor(this.world, it);
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
        const spot = findSeat(this.world, this.catalog, this.nav, folk);
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
      if (obj && it?.pose === 'dance' && !obj.tune && isStereo(this.defOf(obj))) obj.tune = favoriteStation(folk).id;
      if (it && isSleep(it)) this.lightsOutForSleep(folk);
      if (action.eatAt === undefined) {
        action.phase = 'using';
        if (obj) action.slot = this.freeSlot(obj.id, folk);
        this.faceObject(folk, action);
        if (obj && it?.couple) this.callPartner(folk, obj, it);
      }
    }

    if (action.phase === 'using') {
      const it = this.interactionOf(action);
      if (!it) {
        this.finish(folk);
        return;
      }
      applyEffects(folk, it);
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
      this.trainCare(folk, it);
      action.elapsed++;
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
      const it = this.defOf(obj)?.interactions.find((i) => i.care === next);
      if (!it) continue;
      const d = Math.abs(obj.x - folk.x) + Math.abs(obj.y - folk.y);
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
    if (mess.kind !== 'plate' && mess.kind !== 'paper') folk.needs.hygiene = Math.max(0, folk.needs.hygiene - 0.08);
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
    if (action.kind === 'work' || action.kind === 'leave' || action.kind === 'school') return findPath(this.nav, folk, this.world.exit);
    if (action.kind === 'goto') {
      return action.target ? findPath(this.nav, folk, action.target) : null;
    }
    if (action.eatAt !== undefined) {
      // bloco 4: levando o prato até o lugar à mesa (-1 = come onde está)
      const seat = action.eatAt >= 0 ? this.findObject(action.eatAt) : undefined;
      const sdef = seat && this.defOf(seat);
      if (!seat || !sdef) return [];
      return findPathToAny(this.nav, folk, useTiles(this.world, this.nav, seat, sdef)) ?? [];
    }
    const obj = action.objectId !== undefined ? this.findObject(action.objectId) : undefined;
    const def = obj && this.defOf(obj);
    if (!obj || !def) return null;
    const tiles = useTiles(this.world, this.nav, obj, def);
    // prefere um lado onde não tenha ninguém em pé
    const free = tiles.filter((t) => !this.world.folks.some((f) => f !== folk && !f.away && f.x === t.x && f.y === t.y));
    return findPathToAny(this.nav, folk, free.length ? free : tiles);
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
    if (ok && def.category === 'friendly' && other.kid && folk.age === undefined) {
      other.kid.cares[folk.id] = (other.kid.cares[folk.id] ?? 0) + def.duration;
    }
    if (!ok && def.special === 'engage') this.proposalRefused(folk, other);
    if (!folk.visit) wishOnTalk(world, this.catalog, this.logger, folk, other.id, def, ok);
    if (!other.visit) wishOnTalk(world, this.catalog, this.logger, other, folk.id, def, ok);
    // quem puxou também diz o que achou
    if (!action.topic) setThought(folk, 'chat', ok ? 'yes' : 'no', world.tick, 4, other.id);
    this.socialRipples(folk, other, def, ok, mem?.self);
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
      if (other.visit) this.startLeaving(other);
    } else if (special === 'moveIn') {
      this.moveIn(other, folk);
    } else if (special === 'engage') {
      this.engage(folk, other);
    } else if (special === 'wed') {
      this.marry(folk, other);
    } else if (special === 'divorce') {
      this.divorce(folk, other);
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
      if (other.visit || other.age !== undefined || this.adults().length < 2) return;
      createNews(this.world, this.catalog, this.logger, 'movedOut', other.id, folk.id, onLotWitnesses(this.world, folk, [folk.id, other.id]));
      this.moveOut(other, 0);
    }
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
    // quem se muda traz o emprego junto
    const career = n?.career && this.catalog.careers[n.career.id] ? n.career : null;
    other.job = career ? { ...newJob(career.id), level: Math.min(career.level, this.catalog.careers[career.id].levels.length - 1) } : null;
    if (n?.boss) this.log('log.bossMovedIn', names);
    this.log('log.movedIn', names);
    const money = n ? savingsOf(n) : 0;
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
    if (folk.visit || folk.away || folk.age !== undefined || this.adults().length < 2) return false;
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

    // quem combinou por telefone chega
    const due = world.pendingVisits.filter((v) => v.at <= world.tick);
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
      if (v.service) {
        // quem trabalha tem a chave: só vai embora no fim do serviço (ou de madrugada)
        if (late || world.tick >= v.until) this.startLeaving(f);
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
    const folk: Folk = {
      id: n.id,
      name: n.name,
      traits: [...n.traits],
      x: world.exit.x,
      y: world.exit.y,
      px: world.exit.x,
      py: world.exit.y,
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
      autonomy: service === null,
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
      visit: { until, leaving: false, hostId, admitted: service?.kind === 'bailiff' || service?.kind === 'social', rang: -1, service },
    };
    // bloco 11: criança da vizinhança vem como criança
    if (n.age) folk.age = n.age;
    world.folks.push(folk);
  }

  private startLeaving(folk: Folk): void {
    if (!folk.visit || folk.visit.leaving) return;
    folk.visit.leaving = true;
    // larga conversas: quem ouvia é liberado pelo próprio processListen
    folk.queue = [this.makeAction({ kind: 'leave' }, 'player')];
    folk.path = [];
    if (folk.collapsed > 0) folk.collapsed = 0;
    this.log('log.leaving', { name: folk.name });
  }

  private removeVisitor(id: number): void {
    const world = this.world;
    const folk = this.findFolk(id);
    if (!folk) return;
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
      if (folk.x === spot.x && folk.y === spot.y) {
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
    if (folk.visit || folk.age !== undefined) return false;
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
    if (folk.age !== 'child' || folk.visit || folk.kid?.homework !== 'due') return false;
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
    baby.autonomy = true;
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
    folk.away = { until: day * MINUTES_PER_DAY + SCHOOL_END, late: 0, mood: moodOf(this.catalog, folk.needs), event: null, nextEvent: -1 };
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

/** Bloco 9: treino de Lábia de quem está com a palavra na roda. */
const CIRCLE_TALK = { skill: { id: 'charisma', xpPerMinute: 0.2 } } as InteractionDef;
