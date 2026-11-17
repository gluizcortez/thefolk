import { chooseAutonomous } from './ai';
import type { Nav } from './grid';
import { buildNav, nearestFootprintTile, useTiles } from './grid';
import { NEED_MAX, applyEffects, decayNeeds } from './needs';
import { findPath, findPathToAny } from './pathfinding';
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
    }
  }

  private enqueuePlayer(
    folk: Folk,
    partial: Pick<Action, 'kind' | 'objectId' | 'interactionId' | 'target'>,
  ): boolean {
    if (folk.collapsed > 0) return false;
    // ordem do jogador passa por cima do que o folk fazia por conta própria
    if (folk.queue.some((a) => a.source === 'auto')) {
      folk.queue = folk.queue.filter((a) => a.source !== 'auto');
      folk.path = [];
    }
    if (folk.queue.length >= MAX_QUEUE) return false;
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
    for (const folk of world.folks) this.stepFolk(folk);
    if (world.log.length > MAX_LOG) world.log.splice(0, world.log.length - MAX_LOG);
  }

  private log(key: string, params?: Record<string, string | number>): void {
    this.world.log.push({ tick: this.world.tick, key, params });
  }

  private stepFolk(folk: Folk): void {
    folk.px = folk.x;
    folk.py = folk.y;

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
