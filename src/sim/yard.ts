// Bloco 13: piscina e quintal. A piscina é obra (tiles de água cavados no
// térreo); a escadinha fica dentro da água, com chão firme do lado de onde se
// entra, e o trampolim fica no chão com a água logo atrás. Funções puras.

import { inBounds, isWater, rotateSide, sideStep, useSidesOf, footprint, levelOfRow } from './grid';
import type { Catalog, Grid, ObjectDef, Side, Vec, World, WorldObject } from './types';

/** Tile do lado `side` de (x, y). */
function beside(t: Vec, side: Side): Vec {
  const d = sideStep(side);
  return { x: t.x + d.x, y: t.y + d.y };
}

/** Lado da frente do objeto (para onde o desenho olha), já girado. */
export function frontSide(rot: WorldObject['rot']): Side {
  return rotateSide('S', rot ?? 0);
}

/** Lado de trás do objeto, já girado. */
export function backSide(rot: WorldObject['rot']): Side {
  return rotateSide('N', rot ?? 0);
}

/** A peça de piscina está bem posta? (null = sim; senão o motivo) */
export function poolProblem(grid: Grid, catalog: Catalog, obj: Pick<WorldObject, 'x' | 'y' | 'rot'>, def: ObjectDef): 'needsPool' | 'onWater' | null {
  const tiles = footprint(obj, def);
  const wet = tiles.map((t) => isWater(grid, catalog, t.x, t.y));
  if (def.pool === 'in') {
    if (!wet.every(Boolean)) return 'needsPool';
    // do lado de uso precisa ter chão (é por ali que se entra)
    const sides = useSidesOf(def, obj.rot ?? 0) ?? [frontSide(obj.rot)];
    const ok = tiles.some((t) => sides.some((s) => {
      const b = beside(t, s);
      return inBounds(grid, b.x, b.y) && !isWater(grid, catalog, b.x, b.y);
    }));
    return ok ? null : 'needsPool';
  }
  if (wet.some(Boolean)) return 'onWater';
  if (def.pool === 'edge') {
    const back = backSide(obj.rot);
    const ok = tiles.some((t) => {
      const b = beside(t, back);
      return isWater(grid, catalog, b.x, b.y);
    });
    return ok ? null : 'needsPool';
  }
  return null;
}

/** Os tiles de água ligados a (x, y): a piscina inteira. */
export function poolTiles(grid: Grid, catalog: Catalog, x: number, y: number): Vec[] {
  if (!isWater(grid, catalog, x, y)) return [];
  const seen = new Set<number>([y * grid.w + x]);
  const out: Vec[] = [];
  const queue: Vec[] = [{ x, y }];
  while (queue.length > 0) {
    const t = queue.shift()!;
    out.push(t);
    for (const s of ['N', 'E', 'S', 'W'] as Side[]) {
      const b = beside(t, s);
      const k = b.y * grid.w + b.x;
      if (seen.has(k) || !isWater(grid, catalog, b.x, b.y)) continue;
      seen.add(k);
      queue.push(b);
    }
  }
  return out;
}

/** A água onde a peça de piscina mergulha (a escadinha está nela; o trampolim, na frente dela). */
export function poolOf(world: World, catalog: Catalog, obj: WorldObject, def: ObjectDef): Vec[] {
  const grid = world.grid;
  if (def.pool === 'in') return poolTiles(grid, catalog, obj.x, obj.y);
  if (def.pool === 'edge') {
    for (const t of footprint(obj, def)) {
      const b = beside(t, backSide(obj.rot));
      if (isWater(grid, catalog, b.x, b.y)) return poolTiles(grid, catalog, b.x, b.y);
    }
  }
  return [];
}

/** A piscina tem escadinha? (sem ela, quem pula do trampolim sai a duras penas) */
export function poolHasLadder(world: World, catalog: Catalog, pool: Vec[]): boolean {
  const keys = new Set(pool.map((t) => `${t.x},${t.y}`));
  return world.objects.some((o) => catalog.objects[o.defId]?.pool === 'in' && keys.has(`${o.x},${o.y}`));
}

/** Só o térreo tem quintal (piscina, caminho e deck). */
export function yardLevel(grid: Grid, y: number): boolean {
  return levelOfRow(grid, y) === 0;
}
