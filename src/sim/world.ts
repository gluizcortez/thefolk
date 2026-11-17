import { fullNeeds } from './needs';
import { introduce } from './gossip';
import { personOf } from './people';
import { ensureRelation } from './relations';
import type { EdgeKind, Folk, Grid, Neighbor, Needs, Rotation, Vec, World } from './types';

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
  look?: Folk['look'];
  skills?: Record<string, number>;
}

export interface ObjectSeed {
  defId: string;
  x: number;
  y: number;
  rot?: Rotation;
}

/** Vizinho como dado: o id nasce quando o mundo é criado. */
export type NeighborSeed = Omit<Neighbor, 'id'>;

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

/** Vizinhos com ids novos a partir de `nextId`. */
export function seedNeighbors(seeds: NeighborSeed[], nextId: number): Neighbor[] {
  return seeds.map((n, i) => ({
    ...n,
    id: nextId + i,
    traits: [...n.traits],
    look: { ...n.look },
    skills: { ...n.skills },
    career: n.career ? { ...n.career } : null,
  }));
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
  const objects = seed.objects.map((o) => ({ defId: o.defId, x: o.x, y: o.y, rot: o.rot ?? 0, paid: 0, id: nextId++ }));
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
    look: f.look ?? { skin: 0, hair: 0, shirt: 0, pants: 0 },
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
    household: { funds: seed.funds, nextBills: firstBillAfter(seed.startTick), lastBill: 0 },
    exit: { ...seed.exit },
    log: [],
    neighbors,
    relations: {},
    pendingVisits: [],
    lastDropIn: seed.startTick,
    news: [],
    reputation: {},
    gigBoard: [],
  };
  seedRelations(world, seed.relations ?? []);
  seedWorkplaceTies(world);
  return world;
}
