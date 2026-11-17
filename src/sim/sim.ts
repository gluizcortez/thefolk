import { chooseAutonomous } from './ai';
import type { BuildCommand, BuildProblem, GridChange } from './build';
import { applyChange, checkGrid, invertChange, isBuildCommand, planBuild } from './build';
import {
  AWAY_DECAY,
  CALL_AHEAD,
  FIRE_AT,
  LATE_LIMIT,
  MISSED_PENALTY,
  PERFORMANCE_AFTER_PROMOTION,
  PROMOTE_AT,
  careerOf,
  levelOfJob,
  missingSkills,
  newJob,
  payFor,
  shiftOn,
  shiftScore,
} from './career';
import {
  breakUp,
  chatGossip,
  createNews,
  dailyHearts,
  grudge,
  onLotWitnesses,
  romanticAct,
  spreadNews,
} from './gossip';
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
  meetWorkplace,
  planEvent,
  resolveRaise,
  resolveWorkEvent,
  startWorkEvent,
  transferLevel,
  workRelationTerm,
  workplaceShift,
} from './work';
import { MINUTES_PER_DAY, clockOf } from './clock';
import type { PlaceProblem } from './economy';
import { billAmount, checkPlacement, formatMoney, objectBusy, sellValue } from './economy';
import type { Nav } from './grid';
import { buildNav, nearestFootprintTile, useTiles } from './grid';
import { NEED_MAX, applyEffects, clampNeed, decayNeeds, moodOf } from './needs';
import { findPath, findPathToAny } from './pathfinding';
import { nextFloat, nextInt } from './rng';
import { addMemory, affinity, applyDelta, coolRelations, ensureRelation, relationOf, setDating, touch } from './relations';
import { skillLevel, trainSkill } from './skills';
import { acceptChance, adjacent, onLot, socialAllowed, talkTiles, talkingWith } from './social';
import type {
  Action,
  Catalog,
  Command,
  Folk,
  InteractionDef,
  Neighbor,
  ObjectDef,
  RelDelta,
  SocialDef,
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
  | 'notAtDoor';

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

/** Moradores no máximo (quem chama para morar junto esbarra nisso). */
export const MAX_RESIDENTS = 4;
/** Gente no lote ao mesmo tempo, moradores e visitas. */
export const MAX_ON_LOT = 8;
export const MAX_VISITORS = 3;
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
  'kind' | 'objectId' | 'interactionId' | 'target' | 'otherId' | 'socialId' | 'messId' | 'serviceId' | 'welcome'
>;

/** minutos de conversa na porta antes de decidir */
const DOOR_MINUTES = 3;
/** quantas coisas o oficial de penhora leva numa visita, no máximo */
const MAX_SEIZE = 8;
/** quanto tempo um prestador de serviço pode ficar no lote */
const SERVICE_STAY = 8 * 60;

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
  /** resultados de conversa ainda não lidos pela tela (não vai no save) */
  private outcomes: SocialOutcome[] = [];
  /** visitas que chegaram à calçada neste minuto e saem do lote */
  private departed: number[] = [];
  /** obras que dá para desfazer, da mais antiga para a mais nova (não vai no save) */
  private undoStack: { back: GridChange; cost: number }[] = [];

  constructor(catalog: Catalog, world: World) {
    this.catalog = catalog;
    this.world = world;
    this.nav = buildNav(world, catalog);
  }

  /** Troca o mundo inteiro (ex.: ao carregar um save). */
  load(world: World): void {
    this.world = world;
    this.undoStack = [];
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
        if (!folk || !obj || !def || !it || it.special === 'invite' || it.special === 'services' || it.hidden) return false;
        if (folk.visit && (it.residentOnly || (it.cost ?? 0) > 0 || it.care)) return this.fail('visitor');
        if (!interactionOpen(obj, it)) return this.fail(it.care ? 'nothingToDo' : 'broken');
        if (!interactionReady(this.world, it)) {
          return this.fail(it.special === 'payBills' ? 'noBills' : it.special === 'fair' ? 'closed' : 'noFood');
        }
        if (it.task && !taskFits(this.catalog, folk, it.task, def.id)) {
          return this.fail(it.task === 'gig' ? 'noGig' : 'noBusiness');
        }
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
        if (def.special === 'moveIn' && this.residents().length >= MAX_RESIDENTS) return this.fail('houseFull');
        return this.enqueuePlayer(folk, { kind: 'social', otherId: other.id, socialId: def.id });
      }
      case 'invite':
        return this.invite(cmd.folkId, cmd.neighborId);
      case 'buy':
        return this.buy(cmd.defId, cmd.x, cmd.y, cmd.rot);
      case 'sell':
        return this.sell(cmd.objectId);
      case 'move': {
        const obj = this.findObject(cmd.objectId);
        if (!obj) return false;
        if (objectBusy(this.world, obj.id)) return this.fail('inUse');
        const check = checkPlacement(this.world, this.catalog, obj.defId, cmd.x, cmd.y, cmd.rot, obj.id);
        if (!check.ok) return this.fail(check.problem ?? 'invalid');
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
    if (Object.keys(last.back.edges).length > 0 && checkGrid(this.world, this.catalog, after)) {
      return this.fail('undoBlocked');
    }
    this.undoStack.pop();
    this.world.grid = after;
    this.world.household.funds += last.cost;
    this.replanAll();
    return true;
  }

  // ---------- compra e venda ----------

  private buy(defId: string, x: number, y: number, rot: WorldObject['rot']): boolean {
    const def = this.catalog.objects[defId];
    if (!def || def.buyable === false) return false;
    if (this.world.household.funds < def.price) return this.fail('funds');
    const check = checkPlacement(this.world, this.catalog, defId, x, y, rot);
    if (!check.ok) return this.fail(check.problem ?? 'invalid');
    this.world.objects.push({ id: this.world.nextId++, defId, x, y, rot, paid: def.price, state: freshState() });
    this.world.household.funds -= def.price;
    this.replanAll();
    return true;
  }

  private sell(objectId: number): boolean {
    const obj = this.findObject(objectId);
    const def = obj && this.defOf(obj);
    if (!obj || !def) return false;
    if (objectBusy(this.world, objectId)) return this.fail('inUse');
    this.world.household.funds += sellValue(obj, def);
    this.removeObject(objectId);
    return true;
  }

  /** Tira o objeto do lote (venda ou penhora) e de todas as filas. */
  private removeObject(objectId: number): void {
    this.world.objects = this.world.objects.filter((o) => o.id !== objectId);
    for (const folk of this.world.folks) {
      const idx = folk.queue.findIndex((a) => a.objectId === objectId);
      folk.queue = folk.queue.filter((a) => a.objectId !== objectId);
      if (idx === 0) folk.path = [];
    }
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

  private enqueuePlayer(folk: Folk, partial: ActionSeed): boolean {
    if (folk.visit) return this.fail('visitor');
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
    const minute = world.tick % MINUTES_PER_DAY;
    this.stepServices(minute);
    if (minute === COOL_HOUR * 60) {
      coolRelations(world);
      // fofoca anda pela vizinhança; namoros apagados terminam
      spreadNews(world, this.catalog, this.logger);
      dailyHearts(world, this.catalog, this.logger);
    }
    if (minute === BOARD_HOUR * 60) refreshBoard(world, this.catalog);
    this.stepVisits();
    for (const folk of world.folks) {
      this.stepJob(folk);
      if (folk.gig) checkGigDeadline(world, this.catalog, this.logger, folk);
      if (folk.business && minute === BUSINESS_CLOSE_HOUR * 60) settleBusiness(world, this.catalog, this.logger, folk);
      this.stepFolk(folk);
    }
    for (const id of this.departed) this.removeVisitor(id);
    this.departed = [];
    if (world.log.length > MAX_LOG) world.log.splice(0, world.log.length - MAX_LOG);
  }

  /** Quem mora na casa (não conta visitas). */
  residents(): Folk[] {
    return this.world.folks.filter((f) => !f.visit);
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
    const amount = billAmount(this.world, this.catalog);
    const bill = makeBill(this.world, this.catalog, amount);
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
        job.calledDay = d;
        if (folk.collapsed === 0) {
          folk.queue = folk.queue.filter((a) => a.source !== 'auto');
          const cur = folk.queue[0];
          if (cur) cur.phase = 'queued';
          folk.path = [];
          folk.queue.unshift(this.makeAction({ kind: 'work' }, 'player'));
          if (folk.queue.length > MAX_QUEUE) folk.queue.length = MAX_QUEUE;
        }
        this.log('log.workCall', { name: folk.name });
      }
      if (job.calledDay === d && tick > shift.start + LATE_LIMIT) {
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
    const start = Math.max(tick, shift.start);
    folk.away = {
      until: shift.end,
      late: Math.max(0, tick - shift.start),
      mood: moodOf(this.catalog, folk.needs),
      event: null,
      nextEvent: planEvent(this.world, start, shift.end, EVENT_CHANCE),
    };
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
    this.stepWorkEvent(folk);
    if (this.world.tick >= away.until) this.comeHome(folk);
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
      } else if (blocked > 0) {
        this.log('log.bossHeldBack', { name: folk.name });
      } else {
        job.level++;
        job.performance = PERFORMANCE_AFTER_PROMOTION;
        job.raise = 0;
        this.log('log.promoted', { name: folk.name, job: next.title, pay: formatMoney(next.pay) });
        createNews(this.world, this.catalog, this.logger, 'promoted', folk.id, 0);
      }
    }
    this.checkFired(folk);
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
    folk.queue.shift();
    folk.path = [];
  }

  /** Anda um tile pelo caminho. 'moved' = andou; 'blocked' = o mundo mudou; 'arrived' = sem caminho a andar. */
  private stepAlong(folk: Folk, action: Action): 'moved' | 'blocked' | 'arrived' {
    const next = folk.path[0];
    if (!next) return 'arrived';
    if (!this.nav.canStep(folk.x, folk.y, next.x, next.y)) {
      action.phase = 'queued'; // replaneja no próximo tick
      folk.path = [];
      return 'blocked';
    }
    folk.path.shift();
    folk.facing = { x: next.x - folk.x, y: next.y - folk.y };
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
      if (moved === 'blocked') return;
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
      if (action.kind === 'leave') {
        this.departed.push(folk.id);
        return;
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
        if (!it.care) this.log('log.foundBroken', { name: folk.name, object: odef.name });
        this.finish(folk);
        return;
      }
      if (it && !interactionReady(this.world, it)) {
        // a comida acabou (ou as contas já foram pagas) enquanto vinha
        if (it.portions || it.takeout) this.log('log.noFood', { name: folk.name });
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
      action.phase = 'using';
      if (obj) action.slot = this.freeSlot(obj.id, folk);
      this.faceObject(folk, action);
    }

    if (action.phase === 'using') {
      const it = this.interactionOf(action);
      if (!it) {
        this.finish(folk);
        return;
      }
      applyEffects(folk, it);
      const used = this.findObject(action.objectId!);
      const usedDef = used && this.defOf(used);
      if (used && usedDef) {
        if (!it.care) wearTick(this.catalog, folk, used, usedDef);
        else if (careTick(this.world, this.catalog, this.logger, folk, used, usedDef, it)) {
          this.trainCare(folk, it);
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
        if (it.special === 'invite' && action.otherId !== undefined) this.resolveInvite(folk, action.otherId);
        else if (it.special) this.resolveHouseSpecial(folk, it, action);
        let next: Chain = null;
        if (used && usedDef) {
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

  /** Um minuto de treino da habilidade da interação (avisa quando sobe de nível). */
  private trainCare(folk: Folk, it: InteractionDef): void {
    if (!it.skill) return;
    const up = trainSkill(folk, it, moodOf(this.catalog, folk.needs));
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
    if (action.kind === 'work' || action.kind === 'leave') return findPath(this.nav, folk, this.world.exit);
    if (action.kind === 'goto') {
      return action.target ? findPath(this.nav, folk, action.target) : null;
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
      if (f !== except && a?.kind === 'use' && a.objectId === objectId && a.phase === 'using') n++;
    }
    return n;
  }

  private freeSlot(objectId: number, except: Folk): number {
    const taken = new Set<number>();
    for (const f of this.world.folks) {
      const a = f.queue[0];
      if (f !== except && a?.kind === 'use' && a.objectId === objectId && a.phase === 'using') taken.add(a.slot ?? 0);
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
    const mood = moodOf(this.catalog, folk.needs);
    applyEffects(folk, { effects: def.effects } as InteractionDef);
    applyEffects(other, { effects: def.targetEffects ?? def.effects } as InteractionDef);
    if (def.skill) {
      const up = trainSkill(folk, { skill: def.skill } as InteractionDef, mood);
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
    const p = acceptChance(this.world, this.catalog, folk, other, def);
    action.accepted = nextFloat(this.world) < p;
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
      if (!other.visit || this.residents().length >= MAX_RESIDENTS) {
        this.log('log.houseFull', names);
        return;
      }
      const n = this.world.neighbors.find((x) => x.id === other.id);
      other.visit = null;
      this.world.neighbors = this.world.neighbors.filter((x) => x.id !== other.id);
      // quem se muda traz o emprego junto
      const career = n?.career && this.catalog.careers[n.career.id] ? n.career : null;
      other.job = career ? { ...newJob(career.id), level: Math.min(career.level, this.catalog.careers[career.id].levels.length - 1) } : null;
      if (n?.boss) this.log('log.bossMovedIn', names);
      this.log('log.movedIn', names);
    }
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
    applyDelta(this.world, this.catalog, guest, host, { friendship: 2 });
    applyDelta(this.world, this.catalog, host, guest, { friendship: 1 });
    this.log('log.welcomed', names);
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
    const tooLong = sv.kind === 'maid' && this.world.tick - sv.started >= MAID.hours * 60;
    const task = tooLong ? null : serviceTask(this.world, this.catalog, folk, this.nav);
    if (task) {
      sv.done++;
      if (task.messId !== undefined) folk.queue.push(this.makeAction({ kind: 'tidy', messId: task.messId }, 'auto'));
      else folk.queue.push(this.makeAction({ kind: 'use', objectId: task.objectId, interactionId: task.interactionId }, 'auto'));
      return;
    }
    if (sv.kind === 'maid') {
      finishMaid(this.world, this.catalog, this.logger, folk);
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
        const value = sellValue(obj, def);
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
        if (!n || this.findFolk(n.id) || world.folks.length >= MAX_ON_LOT) continue;
        this.spawnVisitor(n, world.tick + INVITED_STAY, v.hostId);
        this.log('log.arrived', { name: n.name });
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
      skills: { ...n.skills },
      job: null,
      away: null,
      gig: null,
      business: null,
      // bloco 2: todo mundo toca a campainha, menos o oficial de penhora
      visit: { until, leaving: false, hostId, admitted: service?.kind === 'bailiff', rang: -1, service },
    };
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
    if (n) n.skills = { ...folk.skills };
    for (const f of world.folks) {
      const idx = f.queue.findIndex((a) => a.otherId === id && (a.kind === 'social' || a.kind === 'listen'));
      if (idx < 0) continue;
      f.queue = f.queue.filter((a) => !(a.otherId === id && (a.kind === 'social' || a.kind === 'listen')));
      if (idx === 0) f.path = [];
    }
    this.log('log.left', { name: folk.name });
  }

  private faceObject(folk: Folk, action: Action): void {
    const obj = action.objectId !== undefined ? this.findObject(action.objectId) : undefined;
    const def = obj && this.defOf(obj);
    if (!obj || !def) return;
    const t = nearestFootprintTile(obj, def, folk);
    if (t.x !== folk.x || t.y !== folk.y) folk.facing = { x: t.x - folk.x, y: t.y - folk.y };
  }
}
