import { fullNeeds } from './needs';
import { introduce } from './gossip';
import { personOf } from './people';
import { ensureRelation } from './relations';
import { START_PANTRY } from './services';
import { freshState } from './upkeep';
import { NEUTRAL_TEMPER, fullLook } from './temper';
import type { EdgeKind, Folk, Grid, Look, Neighbor, Needs, Outfit, Rotation, Temper, Vec, World } from './types';

export interface RoomStyle {
  floor: string;
  indoor: boolean;
  /** letras com o mesmo `room` formam um cômodo só, sem parede entre elas */
  room?: string;
}

/**
 * Monta o grid a partir de um mapa em texto: cada letra é um cômodo e nasce
 * parede em toda borda entre cômodos diferentes (quando um dos lados é
 * interno). Duas letras podem dividir o mesmo cômodo com pisos diferentes.
 */
export function gridFromMap(
  rows: string[],
  styles: Record<string, RoomStyle>,
  doors: string[],
  windows: string[] = [],
): Grid {
  const h = rows.length;
  const w = rows[0].length;
  const floor: string[] = [];
  const edges: Record<string, EdgeKind> = {};
  const at = (x: number, y: number) => (x < 0 || y < 0 || x >= w || y >= h ? null : rows[y][x]);
  const indoor = (c: string | null) => (c !== null && styles[c]?.indoor) === true;
  const roomOf = (c: string | null) => (c === null ? null : (styles[c]?.room ?? c));

  for (let y = 0; y < h; y++) {
    if (rows[y].length !== w) throw new Error(`linha ${y} do mapa tem largura diferente`);
    for (let x = 0; x < w; x++) {
      const c = rows[y][x];
      const style = styles[c];
      if (!style) throw new Error(`cômodo desconhecido no mapa: "${c}"`);
      floor.push(style.floor);
      const north = at(x, y - 1);
      const west = at(x - 1, y);
      if (roomOf(north) !== roomOf(c) && (indoor(c) || indoor(north))) edges[`${x},${y},N`] = 'wall';
      if (roomOf(west) !== roomOf(c) && (indoor(c) || indoor(west))) edges[`${x},${y},W`] = 'wall';
    }
  }
  for (const key of doors) {
    if (edges[key] !== 'wall') throw new Error(`porta fora de uma parede: ${key}`);
    edges[key] = 'door';
  }
  for (const key of windows) {
    if (edges[key] !== 'wall') throw new Error(`janela fora de uma parede: ${key}`);
    edges[key] = 'window';
  }
  return { w, h, floor, edges, coverings: {} };
}

export interface FolkSeed {
  name: string;
  traits: string[];
  x: number;
  y: number;
  needs?: Partial<Needs>;
  look?: Partial<Look>;
  skills?: Record<string, number>;
  /** bloco 5 (padrão: 5 em tudo, neutro) */
  temper?: Temper;
  month?: number;
  outfit?: Outfit;
}

export interface ObjectSeed {
  defId: string;
  x: number;
  y: number;
  rot?: Rotation;
}

/** Vizinho como dado: o id nasce quando o mundo é criado. */
export type NeighborSeed = Omit<Neighbor, 'id' | 'look' | 'temper' | 'month'> & {
  look: Partial<Look>;
  temper?: Temper;
  month?: number;
};

/** Relação inicial entre dois folks da casa, pelos nomes (vale para os dois lados). */
export interface RelationSeed {
  a: string;
  b: string;
  friendship?: number;
  romance?: number;
  respect?: number;
}

export interface WorldSeed {
  seed: number;
  startTick: number;
  grid: Grid;
  objects: ObjectSeed[];
  folks: FolkSeed[];
  /** tostões no começo */
  funds: number;
  /** tile na calçada de onde a condução sai */
  exit: Vec;
  neighbors?: NeighborSeed[];
  relations?: RelationSeed[];
  /** porções na despensa no começo (padrão START_PANTRY) */
  pantry?: number;
}

/** De quanto em quanto tempo as contas chegam, em minutos. */
export const BILL_INTERVAL = 3 * 24 * 60;
/** Hora em que as contas chegam. */
export const BILL_HOUR = 10;

/** Primeiro tick de cobrança depois de `tick`. */
export function firstBillAfter(tick: number): number {
  const day = Math.floor(tick / 1440);
  return day * 1440 + BILL_HOUR * 60 + BILL_INTERVAL;
}

/** Despensa, correio e serviços de uma casa nova (bloco 2). */
export function freshHousehold(pantry: number): Omit<World['household'], 'funds' | 'nextBills'> {
  return { lastBill: 0, pantry, takeout: 0, bills: [], orders: [], maid: false, paperDay: -1, readDay: -1, lightMinutes: 0 };
}

/** Vizinhos com ids novos a partir de `nextId`. */
export function seedNeighbors(seeds: NeighborSeed[], nextId: number): Neighbor[] {
  return seeds.map((n, i) => ({
    ...n,
    id: nextId + i,
    traits: [...n.traits],
    look: fullLook(n.look),
    temper: { ...(n.temper ?? NEUTRAL_TEMPER) },
    month: n.month ?? 0,
    skills: { ...n.skills },
    career: n.career ? { ...n.career } : null,
  }));
}

/** Vizinhos que só prestam serviço não aparecem sem avisar nem viram colegas. */
export function isServiceNeighbor(n: Neighbor): boolean {
  return n.service !== undefined;
}

/**
 * Colegas da vizinhança já se conhecem pelo serviço: amizade morna e
 * respeito; o chefe é respeitado pela equipe.
 */
export function seedWorkplaceTies(world: World): void {
  const byCareer = new Map<string, Neighbor[]>();
  for (const n of world.neighbors) {
    if (!n.career) continue;
    if (!byCareer.has(n.career.id)) byCareer.set(n.career.id, []);
    byCareer.get(n.career.id)!.push(n);
  }
  for (const staff of byCareer.values()) {
    for (let i = 0; i < staff.length; i++) {
      for (let j = i + 1; j < staff.length; j++) {
        const a = personOf(world, staff[i].id)!;
        const b = personOf(world, staff[j].id)!;
        if (staff[i].boss || staff[j].boss) {
          introduce(world, a, b, 10, 15);
          const [boss, emp] = staff[i].boss ? [a, b] : [b, a];
          ensureRelation(world, emp.id, boss.id).respect = 25;
        } else {
          introduce(world, a, b, 18, 12);
        }
      }
    }
  }
}

/** Relações iniciais pelos nomes (moradores ou vizinhos), valendo para os dois lados. */
export function seedRelations(world: World, seeds: RelationSeed[]): void {
  const find = (name: string) =>
    world.folks.find((f) => f.name === name)?.id ?? world.neighbors.find((n) => n.name === name)?.id;
  for (const r of seeds) {
    const a = find(r.a);
    const b = find(r.b);
    if (a === undefined || b === undefined) throw new Error(`relação inicial com folk desconhecido: ${r.a} / ${r.b}`);
    for (const [x, y] of [
      [a, b],
      [b, a],
    ]) {
      const rel = ensureRelation(world, x, y);
      rel.friendship = r.friendship ?? 0;
      rel.romance = r.romance ?? 0;
      rel.respect = r.respect ?? 0;
      rel.last = world.tick - 60;
      if (!rel.memories.some((m) => m.kind === 'met')) rel.memories.push({ tick: world.tick, kind: 'met' });
    }
  }
}

export function createWorld(seed: WorldSeed): World {
  let nextId = 1;
  const objects = seed.objects.map((o) => ({
    defId: o.defId,
    x: o.x,
    y: o.y,
    rot: o.rot ?? 0,
    paid: 0,
    id: nextId++,
    state: freshState(),
  }));
  const folks: Folk[] = seed.folks.map((f) => ({
    id: nextId++,
    name: f.name,
    traits: [...f.traits],
    x: f.x,
    y: f.y,
    px: f.x,
    py: f.y,
    facing: { x: 0, y: 1 },
    needs: { ...fullNeeds(70), ...f.needs },
    queue: [],
    path: [],
    autonomy: true,
    idleTicks: 0,
    collapsed: 0,
    look: fullLook(f.look),
    temper: { ...(f.temper ?? NEUTRAL_TEMPER) },
    month: f.month ?? 0,
    outfit: f.outfit ?? 'day',
    habits: {},
    thought: null,
    wishes: [],
    wishDay: -1,
    spark: 0,
    inspired: 0,
    alarm: true,
    skills: { ...f.skills },
    job: null,
    away: null,
    gig: null,
    business: null,
    visit: null,
  }));
  const neighbors = seedNeighbors(seed.neighbors ?? [], nextId);
  nextId += neighbors.length;
  const world: World = {
    tick: seed.startTick,
    speed: 1,
    rngState: seed.seed | 0,
    nextId,
    grid: seed.grid,
    objects,
    folks,
    household: { ...freshHousehold(seed.pantry ?? START_PANTRY), funds: seed.funds, nextBills: firstBillAfter(seed.startTick) },
    exit: { ...seed.exit },
    log: [],
    neighbors,
    relations: {},
    pendingVisits: [],
    lastDropIn: seed.startTick,
    news: [],
    reputation: {},
    gigBoard: [],
    mess: [],
  };
  seedRelations(world, seed.relations ?? []);
  seedWorkplaceTies(world);
  return world;
}
