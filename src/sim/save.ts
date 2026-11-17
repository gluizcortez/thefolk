import { relKey } from './relations';
import type { Grid, Neighbor, World } from './types';
import type { NeighborSeed, RelationSeed } from './world';
import { freshState } from './upkeep';
import { firstBillAfter, seedNeighbors, seedRelations, seedWorkplaceTies } from './world';

/** Aumente ao mudar o formato do World e registre a migração abaixo. */
export const SAVE_VERSION = 6;

/** Dados de fora do núcleo que uma migração pode precisar (vêm de data/). */
export interface MigrationContext {
  /** vizinhos que passam a existir em saves antigos */
  neighbors: NeighborSeed[];
  /** quem já se conhece na vizinhança (só entra onde ainda não há relação) */
  ties?: RelationSeed[];
}

/** Dinheiro e saída da casa para saves da fatia 1 (só existia a casa pronta). */
export const V1_DEFAULTS = { funds: 1500, exit: { x: 7, y: 13 } };

export interface SaveFile {
  version: number;
  savedAt: number;
  world: World;
}

type Migration = (data: Record<string, unknown>, ctx: MigrationContext) => Record<string, unknown>;

type Obj = Record<string, unknown>;

/** migrations[n] leva um save da versão n para a n+1. */
const migrations: Record<number, Migration> = {
  // fatia 2: dinheiro, contas, habilidades, emprego e objetos girados
  1: (save) => {
    const world = { ...(save.world as Obj) };
    const tick = typeof world.tick === 'number' ? world.tick : 0;
    world.objects = ((world.objects as Obj[]) ?? []).map((o) => ({ rot: 0, paid: 0, ...o }));
    world.folks = ((world.folks as Obj[]) ?? []).map((f) => ({ skills: {}, job: null, away: null, ...f }));
    world.household = { funds: V1_DEFAULTS.funds, nextBills: firstBillAfter(tick), lastBill: 0 };
    world.exit = { ...V1_DEFAULTS.exit };
    return { ...save, world };
  },
  // fatia 3: visitas, vizinhança e relações. A casa continua com os moradores
  // que tinha; os vizinhos chegam com ids novos.
  2: (save, ctx) => {
    const world = { ...(save.world as Obj) };
    const tick = typeof world.tick === 'number' ? world.tick : 0;
    const nextId = typeof world.nextId === 'number' ? world.nextId : 1000;
    world.folks = ((world.folks as Obj[]) ?? []).map((f) => ({ visit: null, ...f }));
    world.neighbors = seedNeighbors(ctx.neighbors, nextId);
    world.nextId = nextId + ctx.neighbors.length;
    world.relations = {};
    world.pendingVisits = [];
    world.lastDropIn = tick;
    return { ...save, world };
  },
  // fatia 4: modo construção. Janelas passam a ser bordas de verdade (antes
  // eram só enfeite, desenhadas pela tela em parte das paredes de fora) e as
  // faces de parede ganham revestimento próprio.
  3: (save) => {
    const world = { ...(save.world as Obj) };
    const grid = { ...(world.grid as Obj) } as unknown as Grid;
    grid.edges = { ...grid.edges };
    for (const key of legacyWindows(grid)) grid.edges[key] = 'window';
    grid.coverings = {};
    world.grid = grid;
    return { ...save, world };
  },
  // fatia 5: chefes e colegas de verdade, eventos do expediente, aumento,
  // frilas, negócio próprio, fofoca e reputação. Quem já existia continua
  // igual; os vizinhos novos (chefes) chegam com ids novos.
  4: (save, ctx) => {
    const world = { ...(save.world as Obj) } as unknown as World;
    world.folks = (world.folks ?? []).map((f) => ({
      ...f,
      gig: f.gig ?? null,
      business: f.business ?? null,
      job: f.job
        ? { ...f.job, raise: f.job.raise ?? 0, raisePending: f.job.raisePending ?? false, lastRaiseDay: f.job.lastRaiseDay ?? -99 }
        : null,
      away: f.away ? { ...f.away, event: f.away.event ?? null, nextEvent: f.away.nextEvent ?? -1 } : null,
    }));
    const neighbors: Neighbor[] = [...(world.neighbors ?? [])];
    const missing = ctx.neighbors.filter(
      (seed) => !neighbors.some((n) => n.name === seed.name) && !world.folks.some((f) => f.name === seed.name),
    );
    neighbors.push(...seedNeighbors(missing, world.nextId));
    world.nextId += missing.length;
    world.neighbors = neighbors;
    world.relations = { ...(world.relations ?? {}) };
    world.news = [];
    world.reputation = {};
    world.gigBoard = [];
    // laços da vizinhança só onde ainda não havia relação
    const nameToId = (name: string) =>
      world.folks.find((f) => f.name === name)?.id ?? world.neighbors.find((n) => n.name === name)?.id;
    const fresh = (ctx.ties ?? []).filter((t) => {
      const a = nameToId(t.a);
      const b = nameToId(t.b);
      return a !== undefined && b !== undefined && !(relKey(a, b) in world.relations);
    });
    seedRelations(world, fresh);
    seedWorkplaceTies(world);
    return { ...save, world: world as unknown as Obj };
  },
  // bloco 1, casa viva: objetos ganham sujeira, desgaste e conserto; a casa
  // ganha bagunça solta. Tudo começa limpo e inteiro.
  5: (save) => {
    const world = { ...(save.world as Obj) };
    world.objects = ((world.objects as Obj[]) ?? []).map((o) => ({ ...o, state: (o.state as object) ?? freshState() }));
    world.mess = [];
    return { ...save, world };
  },
};

/**
 * Onde a tela da fatia 3 desenhava janelas: paredes entre dentro e fora em
 * que (2x + y) é múltiplo de 3. A migração vira essas paredes em janelas para
 * a casa continuar com a mesma cara.
 */
export function legacyWindows(grid: Grid): string[] {
  const indoor = (x: number, y: number) =>
    x >= 0 && y >= 0 && x < grid.w && y < grid.h && grid.floor[y * grid.w + x] !== 'grass';
  const out: string[] = [];
  for (const [key, kind] of Object.entries(grid.edges)) {
    if (kind !== 'wall') continue;
    const [xs, ys, side] = key.split(',');
    const x = Number(xs);
    const y = Number(ys);
    const back = side === 'N' ? indoor(x, y - 1) : indoor(x - 1, y);
    if (indoor(x, y) !== back && (x * 2 + y) % 3 === 0) out.push(key);
  }
  return out;
}

export class SaveError extends Error {}

export function serialize(world: World, savedAt: number): SaveFile {
  return { version: SAVE_VERSION, savedAt, world: JSON.parse(JSON.stringify(world)) as World };
}

export function deserialize(raw: unknown, ctx: MigrationContext = { neighbors: [] }): SaveFile {
  if (typeof raw !== 'object' || raw === null) throw new SaveError('save inválido');
  let data = raw as Record<string, unknown>;
  let version = data.version;
  if (typeof version !== 'number' || !Number.isInteger(version) || version < 1) {
    throw new SaveError('save sem versão');
  }
  if (version > SAVE_VERSION) throw new SaveError('save de uma versão mais nova do jogo');
  while (version < SAVE_VERSION) {
    const migrate = migrations[version];
    if (!migrate) throw new SaveError(`sem migração a partir da versão ${version}`);
    data = migrate(data, ctx);
    version++;
    data.version = version;
  }
  const world = data.world as World | undefined;
  if (
    !world ||
    typeof world.tick !== 'number' ||
    !world.grid ||
    !Array.isArray(world.objects) ||
    !Array.isArray(world.folks)
  ) {
    throw new SaveError('save corrompido');
  }
  return {
    version,
    savedAt: typeof data.savedAt === 'number' ? data.savedAt : 0,
    world: JSON.parse(JSON.stringify(world)) as World,
  };
}
