import type { Nav } from './grid';
import { buildNav, edgeKey, footprint, inBounds, objectSize, useTiles, wallBehind } from './grid';
import { roomAt, roomsOf } from './rooms';
import { freshState } from './upkeep';
import { currentValue, resaleValue } from './furnish';
import type { Catalog, ObjectDef, Rotation, Vec, World, WorldObject } from './types';

/** símbolo da moeda (tostões) */
export const CURRENCY = '⟡';
/** parte fixa das contas */
export const BILL_BASE = 25;
/** parte das contas que depende do valor dos móveis da casa */
export const BILL_RATE = 0.012;

export function formatMoney(value: number): string {
  const n = Math.round(value);
  const abs = Math.abs(n)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${n < 0 ? '−' : ''}${CURRENCY} ${abs}`;
}

/** Quanto o objeto vale hoje (bloco 4: perde no primeiro dia e com o uso). */
export function objectValue(world: World, obj: WorldObject, def: ObjectDef): number {
  return currentValue(world, obj, def);
}

/** O que a venda devolve (o valor de hoje; quebrado vale metade). */
export function sellValue(world: World, obj: WorldObject, def: ObjectDef): number {
  return resaleValue(world, obj, def);
}

/** Valor da conta: uma parte fixa mais uma fração do valor dos móveis. */
export function billAmount(world: World, catalog: Catalog): number {
  let value = 0;
  for (const obj of world.objects) {
    const def = catalog.objects[obj.defId];
    if (def) value += objectValue(world, obj, def);
  }
  return Math.round(BILL_BASE + value * BILL_RATE);
}

export type PlaceProblem =
  | 'unknown'
  | 'outside'
  | 'occupied'
  | 'folk'
  | 'wall'
  | 'blocksWay'
  | 'unreachable'
  | 'inUse'
  | 'funds'
  | 'needsWall'
  | 'needsRoof';

export interface PlaceCheck {
  ok: boolean;
  problem?: PlaceProblem;
}

/** Tiles alcançáveis a pé a partir de um ponto (busca em largura). */
export function reachable(nav: Nav, from: Vec): Set<number> {
  const seen = new Set<number>();
  if (!nav.isFree(from.x, from.y)) return seen;
  const queue: Vec[] = [from];
  seen.add(from.y * nav.w + from.x);
  while (queue.length > 0) {
    const cur = queue.shift()!;
    for (const [dx, dy] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ]) {
      const nx = cur.x + dx;
      const ny = cur.y + dy;
      const key = ny * nav.w + nx;
      if (seen.has(key) || !nav.canStep(cur.x, cur.y, nx, ny)) continue;
      seen.add(key);
      queue.push({ x: nx, y: ny });
    }
  }
  return seen;
}

/** Algum objeto está sendo usado ou é o destino da ação atual de alguém? */
export function objectBusy(world: World, objectId: number): boolean {
  return world.folks.some((f) => {
    const a = f.queue[0];
    return a?.phase === 'using' && (a.objectId === objectId || a.eatAt === objectId);
  });
}

/**
 * Diz se dá para pôr um objeto em (x, y) com a rotação dada. `ignoreId` é o
 * próprio objeto, quando ele está sendo movido.
 *
 * Regras: cabe no terreno; não fica em cima de outro objeto nem de um folk;
 * não atravessa parede ou porta; não fecha passagem (tudo o que o folk
 * alcançava continua alcançável); e, se tem uso, dá para chegar até ele.
 */
export function checkPlacement(
  world: World,
  catalog: Catalog,
  defId: string,
  x: number,
  y: number,
  rot: Rotation,
  ignoreId?: number,
): PlaceCheck {
  const def = catalog.objects[defId];
  if (!def) return { ok: false, problem: 'unknown' };
  if (def.layer) return checkLayered(world, catalog, def, x, y, rot, ignoreId);
  const others: World = { ...world, objects: world.objects.filter((o) => o.id !== ignoreId) };
  const before = buildNav(others, catalog);
  const tiles = footprint({ x, y, rot }, def);

  for (const t of tiles) {
    if (!inBounds(world.grid, t.x, t.y)) return { ok: false, problem: 'outside' };
    if (!before.isFree(t.x, t.y)) return { ok: false, problem: 'occupied' };
    // a calçada de onde sai a condução fica sempre livre
    if (t.x === world.exit.x && t.y === world.exit.y) return { ok: false, problem: 'blocksWay' };
    if (world.folks.some((f) => !f.away && f.x === t.x && f.y === t.y)) return { ok: false, problem: 'folk' };
  }
  // um objeto grande não pode ficar dividido por parede ou porta
  const size = objectSize(def, rot);
  for (let dy = 0; dy < size.h; dy++) {
    for (let dx = 0; dx < size.w; dx++) {
      const tx = x + dx;
      const ty = y + dy;
      if (dx > 0 && world.grid.edges[edgeKey(tx - 1, ty, tx, ty)]) return { ok: false, problem: 'wall' };
      if (dy > 0 && world.grid.edges[edgeKey(tx, ty - 1, tx, ty)]) return { ok: false, problem: 'wall' };
    }
  }

  const placed: WorldObject = { id: -1, defId, x, y, rot, paid: 0, state: freshState() };
  const after = buildNav({ ...others, objects: [...others.objects, placed] }, catalog);
  const tileSet = new Set(tiles.map((t) => t.y * world.grid.w + t.x));
  for (const folk of world.folks) {
    if (folk.away) continue;
    const reachBefore = reachable(before, folk);
    const reachAfter = reachable(after, folk);
    for (const key of reachBefore) {
      if (!tileSet.has(key) && !reachAfter.has(key)) return { ok: false, problem: 'blocksWay' };
    }
    if (def.interactions.length > 0) {
      const uses = useTiles(world, after, placed, def);
      if (!uses.some((u) => reachAfter.has(u.y * world.grid.w + u.x))) {
        return { ok: false, problem: 'unreachable' };
      }
    }
  }
  return { ok: true };
}

/**
 * Bloco 3: quadro, tapete e luminária de teto não ocupam o chão. Só não podem
 * ficar em cima de outro da mesma camada; o quadro precisa de parede atrás,
 * a luminária de teto precisa de cômodo coberto e o tapete não passa por
 * baixo de parede.
 */
function checkLayered(
  world: World,
  catalog: Catalog,
  def: ObjectDef,
  x: number,
  y: number,
  rot: Rotation,
  ignoreId?: number,
): PlaceCheck {
  const tiles = footprint({ x, y, rot }, def);
  const taken = new Set<string>();
  for (const o of world.objects) {
    if (o.id === ignoreId) continue;
    const od = catalog.objects[o.defId];
    if (!od || od.layer !== def.layer) continue;
    for (const t of footprint(o, od)) taken.add(`${t.x},${t.y}`);
  }
  for (const t of tiles) {
    if (!inBounds(world.grid, t.x, t.y)) return { ok: false, problem: 'outside' };
    if (taken.has(`${t.x},${t.y}`)) return { ok: false, problem: 'occupied' };
  }
  const size = objectSize(def, rot);
  for (let dy = 0; dy < size.h; dy++) {
    for (let dx = 0; dx < size.w; dx++) {
      const tx = x + dx;
      const ty = y + dy;
      if (dx > 0 && world.grid.edges[edgeKey(tx - 1, ty, tx, ty)]) return { ok: false, problem: 'wall' };
      if (dy > 0 && world.grid.edges[edgeKey(tx, ty - 1, tx, ty)]) return { ok: false, problem: 'wall' };
    }
  }
  if (def.layer === 'wall') {
    if (world.grid.edges[wallBehind({ x, y, rot })] !== 'wall') return { ok: false, problem: 'needsWall' };
  }
  if (def.layer === 'ceiling') {
    const room = roomAt(roomsOf(world, catalog), x, y);
    if (!room || room.outdoor) return { ok: false, problem: 'needsRoof' };
  }
  if (def.interactions.length > 0) {
    const nav = buildNav(world, catalog);
    const placed: WorldObject = { id: -1, defId: def.id, x, y, rot, paid: 0, state: freshState() };
    const uses = useTiles(world, nav, placed, def);
    for (const folk of world.folks) {
      if (folk.away) continue;
      const reach = reachable(nav, folk);
      if (!uses.some((u) => reach.has(u.y * world.grid.w + u.x))) return { ok: false, problem: 'unreachable' };
    }
  }
  return { ok: true };
}
