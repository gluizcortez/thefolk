import { chooseAutonomous } from './ai';
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
  shiftOn,
  shiftScore,
} from './career';
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
import { BILL_INTERVAL } from './world';

/** Por que o último comando foi recusado (para a interface explicar). */
export type CommandProblem =
  | PlaceProblem
  | 'busy'
  | 'away'
  | 'collapsed'
  | 'queueFull'
  | 'invalid'
  | 'visitor'
  | 'socialNotNow'
  | 'noPhone'
  | 'alreadyComing'
  | 'houseFull';

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
const COLLAPSE_ENERGY_PER_MINUTE = 0.3;

type ActionSeed = Pick<Action, 'kind' | 'objectId' | 'interactionId' | 'target' | 'otherId' | 'socialId'>;

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

  constructor(catalog: Catalog, world: World) {
    this.catalog = catalog;
    this.world = world;
    this.nav = buildNav(world, catalog);
  }

  /** Troca o mundo inteiro (ex.: ao carregar um save). */
  load(world: World): void {
    this.world = world;
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
    switch (cmd.type) {
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
        // convites passam pelo comando 'invite', que diz quem convidar
        if (!folk || !def || !it || it.special) return false;
        if (folk.visit && (it.residentOnly || (it.cost ?? 0) > 0)) return this.fail('visitor');
        return this.enqueuePlayer(folk, {
          kind: 'use',
          objectId: cmd.objectId,
          interactionId: cmd.interactionId,
        });
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
        if (!onLot(other) || !socialAllowed(this.world, def, folk, other)) return this.fail('socialNotNow');
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
        this.dropWork(folk);
        folk.job = newJob(cmd.careerId);
        this.log('log.hired', { name: folk.name, job: career.levels[0].title });
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

  // ---------- compra e venda ----------

  private buy(defId: string, x: number, y: number, rot: WorldObject['rot']): boolean {
    const def = this.catalog.objects[defId];
    if (!def || def.buyable === false) return false;
    if (this.world.household.funds < def.price) return this.fail('funds');
    const check = checkPlacement(this.world, this.catalog, defId, x, y, rot);
    if (!check.ok) return this.fail(check.problem ?? 'invalid');
    this.world.objects.push({ id: this.world.nextId++, defId, x, y, rot, paid: def.price });
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
    this.world.objects = this.world.objects.filter((o) => o.id !== objectId);
    for (const folk of this.world.folks) {
      const idx = folk.queue.findIndex((a) => a.objectId === objectId);
      folk.queue = folk.queue.filter((a) => a.objectId !== objectId);
      if (idx === 0) folk.path = [];
    }
    this.replanAll();
    return true;
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
    if (world.tick % MINUTES_PER_DAY === COOL_HOUR * 60) coolRelations(world);
    this.stepVisits();
    for (const folk of world.folks) {
      this.stepJob(folk);
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

  // ---------- contas ----------

  private stepBills(): void {
    const house = this.world.household;
    if (this.world.tick < house.nextBills) return;
    const amount = billAmount(this.world, this.catalog);
    house.funds -= amount;
    house.lastBill = amount;
    house.nextBills += BILL_INTERVAL;
    this.log(house.funds < 0 ? 'log.billsDebt' : 'log.bills', { amount: formatMoney(amount) });
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
    folk.away = {
      until: shift.end,
      late: Math.max(0, tick - shift.start),
      mood: moodOf(this.catalog, folk.needs),
    };
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
    if (this.world.tick >= away.until) this.comeHome(folk);
  }

  private comeHome(folk: Folk): void {
    const away = folk.away!;
    folk.away = null;
    folk.x = folk.px = this.world.exit.x;
    folk.y = folk.py = this.world.exit.y;
    folk.facing = { x: 0, y: -1 };
    folk.idleTicks = 0;
    const job = folk.job;
    const level = job && levelOfJob(this.catalog, job);
    if (!job || !level) return;

    const pay = level.pay;
    this.world.household.funds += pay;
    job.shifts++;
    const avgMood = (away.mood + moodOf(this.catalog, folk.needs)) / 2;
    const score = shiftScore(this.catalog, folk, job, avgMood, away.late);
    job.performance = Math.max(-100, Math.min(100, job.performance + score));
    this.log('log.backFromWork', { name: folk.name, pay: formatMoney(pay) });

    const career = careerOf(this.catalog, job);
    const next = career?.levels[job.level + 1];
    if (next && job.performance >= PROMOTE_AT) {
      if (Object.keys(missingSkills(folk, next)).length === 0) {
        job.level++;
        job.performance = PERFORMANCE_AFTER_PROMOTION;
        this.log('log.promoted', { name: folk.name, job: next.title, pay: formatMoney(next.pay) });
      } else {
        this.log('log.needSkills', { name: folk.name });
      }
    }
    this.checkFired(folk);
  }

  private checkFired(folk: Folk): void {
    if (!folk.job || folk.job.performance > FIRE_AT) return;
    folk.job = null;
    this.dropWork(folk);
    this.log('log.fired', { name: folk.name });
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

    this.checkFailures(folk);
    if (folk.collapsed > 0) return;

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
    const choice = chooseAutonomous(this.world, this.catalog, folk, this.nav);
    folk.idleTicks = 0;
    if (!choice) return;
    if (choice.socialId !== undefined) {
      folk.queue.push(this.makeAction({ kind: 'social', otherId: choice.otherId, socialId: choice.socialId }, 'auto'));
      return;
    }
    folk.queue.push(
      this.makeAction({ kind: 'use', objectId: choice.objectId, interactionId: choice.interactionId }, 'auto'),
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
      const cost = it?.cost ?? 0;
      if (cost > 0) {
        if (this.world.household.funds < cost) {
          this.log('log.noMoney', { name: folk.name });
          this.finish(folk);
          return;
        }
        this.world.household.funds -= cost;
      }
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
      if (it.skill) {
        const up = trainSkill(folk, it, moodOf(this.catalog, folk.needs));
        if (up !== null) {
          const skill = this.catalog.skills[it.skill.id];
          this.log('log.skillUp', { name: folk.name, skill: skill?.name ?? it.skill.id, level: up });
        }
      }
      action.elapsed++;
      const full = it.until !== undefined && folk.needs[it.until] >= NEED_MAX;
      if (action.elapsed >= it.duration || full) {
        if (it.special === 'invite' && action.otherId !== undefined) this.resolveInvite(folk, action.otherId);
        this.finish(folk);
        return;
      }
      if (action.source === 'auto' && action.elapsed % AUTO_RECHECK === 0) {
        this.maybeAbandon(folk, it);
      }
    }
  }

  /** Um folk autônomo larga o que faz se outra necessidade ficou crítica. */
  private maybeAbandon(folk: Folk, it: InteractionDef): void {
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
    this.outcomes.push({ fromId: folk.id, toId: other.id, socialId: def.id, accepted: ok, toTarget, toSelf });
    if (this.outcomes.length > 50) this.outcomes.shift();
    this.endSocial(folk);
  }

  private socialSpecial(folk: Folk, other: Folk, special: NonNullable<SocialDef['special']>): void {
    const names = { name: folk.name, other: other.name };
    if (special === 'date') {
      setDating(this.world, folk.id, other.id, true);
      this.log('log.dating', names);
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
    const p = 0.75 + (rel?.friendship ?? 0) / 150 + affinity(this.catalog, n, host) * 0.05;
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
            !this.findFolk(n.id) &&
            !world.pendingVisits.some((v) => v.neighborId === n.id) &&
            this.residents().every((r) => (relationOf(world, n.id, r.id)?.friendship ?? 0) > -40),
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
      const worn = f.needs.energy < 15 || f.needs.hunger < 12;
      const nobodyHome = this.residents().every((r) => r.away);
      if (world.tick >= v.until || late || worn || nobodyHome) this.startLeaving(f);
    }
  }

  visitors(): Folk[] {
    return this.world.folks.filter((f) => f.visit);
  }

  private spawnVisitor(n: Neighbor, until: number, hostId: number): void {
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
      autonomy: true,
      idleTicks: IDLE_BEFORE_AUTO,
      collapsed: 0,
      look: { ...n.look },
      skills: { ...n.skills },
      job: null,
      away: null,
      visit: { until, leaving: false, hostId },
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
