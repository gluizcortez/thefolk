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
import { MINUTES_PER_DAY } from './clock';
import type { PlaceProblem } from './economy';
import { billAmount, checkPlacement, formatMoney, objectBusy, sellValue } from './economy';
import type { Nav } from './grid';
import { buildNav, nearestFootprintTile, useTiles } from './grid';
import { NEED_MAX, applyEffects, clampNeed, decayNeeds, moodOf } from './needs';
import { findPath, findPathToAny } from './pathfinding';
import { trainSkill } from './skills';
import type {
  Action,
  Catalog,
  Command,
  Folk,
  InteractionDef,
  ObjectDef,
  World,
  WorldObject,
} from './types';
import { NEED_IDS } from './types';
import { BILL_INTERVAL } from './world';

/** Por que o último comando foi recusado (para a interface explicar). */
export type CommandProblem = PlaceProblem | 'busy' | 'away' | 'collapsed' | 'queueFull' | 'invalid';

export const MAX_QUEUE = 8;
const MAX_LOG = 30;
/** minutos parado antes de a IA procurar algo para fazer */
const IDLE_BEFORE_AUTO = 3;
/** de quanto em quanto tempo uma ação autônoma é reavaliada */
const AUTO_RECHECK = 10;
const CRITICAL_NEED = 15;
const COLLAPSE_MINUTES = 150;
const COLLAPSE_ENERGY_PER_MINUTE = 0.3;

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
        if (!folk || !def || !def.interactions.some((i) => i.id === cmd.interactionId)) {
          return false;
        }
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

  private enqueuePlayer(
    folk: Folk,
    partial: Pick<Action, 'kind' | 'objectId' | 'interactionId' | 'target'>,
  ): boolean {
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

  private makeAction(
    partial: Pick<Action, 'kind' | 'objectId' | 'interactionId' | 'target'>,
    source: Action['source'],
  ): Action {
    return { id: this.world.nextId++, source, phase: 'queued', elapsed: 0, ...partial };
  }

  // ---------- tick ----------

  /** Avança um minuto de jogo. */
  step(): void {
    const world = this.world;
    world.tick++;
    this.stepBills();
    for (const folk of world.folks) {
      this.stepJob(folk);
      this.stepFolk(folk);
    }
    if (world.log.length > MAX_LOG) world.log.splice(0, world.log.length - MAX_LOG);
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
    folk.queue.push(
      this.makeAction(
        { kind: 'use', objectId: choice.objectId, interactionId: choice.interactionId },
        'auto',
      ),
    );
  }

  private finish(folk: Folk): void {
    folk.queue.shift();
    folk.path = [];
  }

  private processAction(folk: Folk): void {
    const action = folk.queue[0];
    if (!action) return;

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
      const next = folk.path[0];
      if (next) {
        if (!this.nav.canStep(folk.x, folk.y, next.x, next.y)) {
          action.phase = 'queued'; // o mundo mudou: replaneja no próximo tick
          folk.path = [];
          return;
        }
        folk.path.shift();
        folk.facing = { x: next.x - folk.x, y: next.y - folk.y };
        folk.x = next.x;
        folk.y = next.y;
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
    if (action.kind === 'work') return findPath(this.nav, folk, this.world.exit);
    if (action.kind === 'goto') {
      return action.target ? findPath(this.nav, folk, action.target) : null;
    }
    const obj = action.objectId !== undefined ? this.findObject(action.objectId) : undefined;
    const def = obj && this.defOf(obj);
    if (!obj || !def) return null;
    return findPathToAny(this.nav, folk, useTiles(this.world, this.nav, obj, def));
  }

  private faceObject(folk: Folk, action: Action): void {
    const obj = action.objectId !== undefined ? this.findObject(action.objectId) : undefined;
    const def = obj && this.defOf(obj);
    if (!obj || !def) return;
    const t = nearestFootprintTile(obj, def, folk);
    if (t.x !== folk.x || t.y !== folk.y) folk.facing = { x: t.x - folk.x, y: t.y - folk.y };
  }
}
