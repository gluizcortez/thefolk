import type { Catalog, Grid, ObjectDef, Rotation, Side, Vec, World, WorldObject } from './types';

/** Ordem em que um quarto de volta leva cada lado ao seguinte. */
const SIDE_ORDER: Side[] = ['S', 'E', 'N', 'W'];

export function rotateSide(side: Side, rot: Rotation): Side {
  return SIDE_ORDER[(SIDE_ORDER.indexOf(side) + rot) % 4];
}

/** Tamanho ocupado no grid, já considerando a rotação. */
export function objectSize(def: ObjectDef, rot: Rotation): { w: number; h: number } {
  return rot % 2 === 1 ? { w: def.size.h, h: def.size.w } : { w: def.size.w, h: def.size.h };
}

/** Lados de uso já girados (undefined = todos). */
export function useSidesOf(def: ObjectDef, rot: Rotation): Side[] | undefined {
  return def.useSides?.map((s) => rotateSide(s, rot));
}

export function edgeKey(ax: number, ay: number, bx: number, by: number): string {
  // borda entre dois tiles ortogonalmente vizinhos
  if (ax === bx) {
    const y = Math.max(ay, by);
    return `${ax},${y},N`;
  }
  const x = Math.max(ax, bx);
  return `${x},${ay},W`;
}

export function inBounds(grid: Grid, x: number, y: number): boolean {
  return x >= 0 && y >= 0 && x < grid.w && y < grid.h;
}

export function floorAt(grid: Grid, x: number, y: number): string {
  return grid.floor[y * grid.w + x];
}

export function footprint(obj: Pick<WorldObject, 'x' | 'y' | 'rot'>, def: ObjectDef): Vec[] {
  const tiles: Vec[] = [];
  const size = objectSize(def, obj.rot ?? 0);
  for (let dy = 0; dy < size.h; dy++) {
    for (let dx = 0; dx < size.w; dx++) {
      tiles.push({ x: obj.x + dx, y: obj.y + dy });
    }
  }
  return tiles;
}

/** Visão de navegação do mundo: o que bloqueia tiles e bordas. */
export interface Nav {
  w: number;
  h: number;
  blocked: Uint8Array;
  /** true se dá para passar do tile a para o vizinho b */
  canStep(ax: number, ay: number, bx: number, by: number): boolean;
  isFree(x: number, y: number): boolean;
}

export function buildNav(world: World, catalog: Catalog): Nav {
  const { grid } = world;
  const blocked = new Uint8Array(grid.w * grid.h);
  for (const obj of world.objects) {
    const def = catalog.objects[obj.defId];
    if (!def) continue;
    for (const t of footprint(obj, def)) {
      if (inBounds(grid, t.x, t.y)) blocked[t.y * grid.w + t.x] = 1;
    }
  }
  const isFree = (x: number, y: number) => inBounds(grid, x, y) && blocked[y * grid.w + x] === 0;
  return {
    w: grid.w,
    h: grid.h,
    blocked,
    isFree,
    canStep(ax, ay, bx, by) {
      if (!isFree(bx, by)) return false;
      return grid.edges[edgeKey(ax, ay, bx, by)] !== 'wall';
    },
  };
}

const DIRS: (Vec & { side: Side })[] = [
  { x: 0, y: -1, side: 'N' },
  { x: 1, y: 0, side: 'E' },
  { x: 0, y: 1, side: 'S' },
  { x: -1, y: 0, side: 'W' },
];

/**
 * Tiles de onde um folk pode usar o objeto: vizinhos livres do objeto (nos
 * lados permitidos por `useSides`) que não estejam separados dele por parede
 * ou porta.
 */
export function useTiles(world: World, nav: Nav, obj: WorldObject, def: ObjectDef): Vec[] {
  const own = footprint(obj, def);
  const isOwn = (x: number, y: number) => own.some((t) => t.x === x && t.y === y);
  const out: Vec[] = [];
  const sides = useSidesOf(def, obj.rot ?? 0);
  for (const t of own) {
    for (const d of DIRS) {
      if (sides && !sides.includes(d.side)) continue;
      const x = t.x + d.x;
      const y = t.y + d.y;
      if (isOwn(x, y) || !nav.isFree(x, y)) continue;
      if (world.grid.edges[edgeKey(t.x, t.y, x, y)]) continue;
      if (!out.some((o) => o.x === x && o.y === y)) out.push({ x, y });
    }
  }
  return out;
}

/** Tile do objeto mais próximo de um ponto (para o folk olhar para ele). */
export function nearestFootprintTile(obj: WorldObject, def: ObjectDef, from: Vec): Vec {
  let best = { x: obj.x, y: obj.y };
  let bestD = Infinity;
  for (const t of footprint(obj, def)) {
    const d = Math.abs(t.x - from.x) + Math.abs(t.y - from.y);
    if (d < bestD) {
      bestD = d;
      best = t;
    }
  }
  return best;
}
