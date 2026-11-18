import type { Catalog, EdgeKind, Grid, ObjectDef, Rotation, Side, Stair, Vec, World, WorldObject } from './types';

/** Parede, meia parede e janela fecham a passagem; porta e arco (ou borda vazia) deixam passar. */
export function blocksStep(kind: EdgeKind | undefined): boolean {
  return kind !== undefined && !isDoorway(kind);
}

/** Bloco 12: porta de qualquer estilo, ou arco: dá para passar. */
export function isDoorway(kind: EdgeKind | undefined): boolean {
  return kind === 'door' || kind === 'doorGlass' || kind === 'doorDouble' || kind === 'arch';
}

/** Bloco 12: janela de qualquer estilo. */
export function isWindow(kind: EdgeKind | undefined): boolean {
  return kind === 'window' || kind === 'windowTall' || kind === 'windowHigh';
}

/** Bloco 12: a borda divide cômodos? A meia parede não divide (só não deixa passar). */
export function splitsRoom(kind: EdgeKind | undefined): boolean {
  return kind !== undefined && kind !== 'half';
}

// ---------- bloco 12: andares ----------

/** Linhas vazias entre um andar e outro no `floor` (ninguém anda por elas). */
export const LEVEL_GAP = 2;
/** Térreo e mais dois andares. */
export const MAX_LEVELS = 3;
/** Quantos tiles a escada ocupa no andar de baixo. */
export const STAIR_RUN = 3;
/** Piso de quem não tem piso (vão do andar de cima). */
export const VOID = 'void';

export function levelsOf(grid: Grid): number {
  return grid.levels ?? 1;
}

/** Distância, em linhas, de um andar para o de cima. */
export function strideOf(grid: Grid): number {
  return grid.h + LEVEL_GAP;
}

/** Linhas do `floor`, com todos os andares e os vãos entre eles. */
export function rowsOf(grid: Grid): number {
  return grid.h + (levelsOf(grid) - 1) * strideOf(grid);
}

/** Andar de uma linha do grid (-1 = vão entre andares ou fora). */
export function levelOfRow(grid: Grid, y: number): number {
  if (y < 0 || y >= rowsOf(grid)) return -1;
  const s = strideOf(grid);
  const level = Math.floor(y / s);
  return y - level * s < grid.h ? level : -1;
}

/** Linha dentro do próprio andar (0 a h - 1). */
export function localRow(grid: Grid, y: number): number {
  return y - Math.max(0, levelOfRow(grid, y)) * strideOf(grid);
}

/** Linha do grid de uma linha local num andar. */
export function rowOn(grid: Grid, level: number, localY: number): number {
  return level * strideOf(grid) + localY;
}

/**
 * Andar de uma borda. A borda norte da linha logo depois do andar (a divisa
 * do fundo do lote) ainda é do andar de cima dela.
 */
export function edgeLevel(grid: Grid, key: string): number {
  const [, ys, side] = key.split(',');
  const y = Number(ys);
  const own = levelOfRow(grid, y);
  if (own >= 0 || side !== 'N') return own;
  return levelOfRow(grid, y - 1);
}

/** Grid com `n` andares (os novos começam sem piso). Não mexe nos que já existem. */
export function withLevels(grid: Grid, n: number): Grid {
  const have = levelsOf(grid);
  if (have >= n) return grid;
  const floor = [...grid.floor];
  const rows = grid.h + (n - 1) * strideOf(grid);
  while (floor.length < rows * grid.w) floor.push(VOID);
  return { ...grid, floor, levels: n };
}

/** Telhado de quem ainda não escolheu. */
export const DEFAULT_ROOF = { style: 'hip', color: 'terracotta' } as const;

/** Grid pronto para o bloco 12: todos os andares, lista de escadas e colunas, telhado. */
export function storied(grid: Grid): Grid {
  const out = withLevels(grid, MAX_LEVELS);
  return {
    ...out,
    stairs: out.stairs ?? [],
    columns: out.columns ?? [],
    roof: out.roof ?? { ...DEFAULT_ROOF },
  };
}

const STEP: Record<Side, Vec> = { N: { x: 0, y: -1 }, E: { x: 1, y: 0 }, S: { x: 0, y: 1 }, W: { x: -1, y: 0 } };

export function sideStep(side: Side): Vec {
  return STEP[side];
}

/** Onde a escada pisa: pé (de onde se sobe), degraus, patamar (no andar de cima) e o vão aberto em cima. */
export interface StairPlan {
  entry: Vec;
  run: Vec[];
  landing: Vec;
  hole: Vec[];
}

export function stairPlan(grid: Grid, st: Pick<Stair, 'x' | 'y' | 'dir'>): StairPlan {
  const d = STEP[st.dir];
  const up = strideOf(grid);
  const run: Vec[] = [];
  for (let i = 0; i < STAIR_RUN; i++) run.push({ x: st.x + d.x * i, y: st.y + d.y * i });
  const top = run[run.length - 1];
  return {
    entry: { x: st.x - d.x, y: st.y - d.y },
    run,
    landing: { x: top.x + d.x, y: top.y + d.y + up },
    hole: run.map((t) => ({ x: t.x, y: t.y + up })),
  };
}

/** Em qual degrau (0 a STAIR_RUN - 1) da escada o tile está, ou -1. */
export function stairStepAt(grid: Grid, x: number, y: number): { stair: Stair; step: number } | null {
  for (const st of grid.stairs ?? []) {
    const plan = stairPlan(grid, st);
    const i = plan.run.findIndex((t) => t.x === x && t.y === y);
    if (i >= 0) return { stair: st, step: i };
  }
  return null;
}

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

/** O tile existe (em algum andar)? As linhas do vão entre andares não contam. */
export function inBounds(grid: Grid, x: number, y: number): boolean {
  return x >= 0 && x < grid.w && levelOfRow(grid, y) >= 0;
}

export function floorAt(grid: Grid, x: number, y: number): string {
  return grid.floor[y * grid.w + x];
}

/** O objeto ocupa o chão (fecha passagem)? Quadros, tapetes e luminárias de teto não. */
export function blocksFloor(def: ObjectDef): boolean {
  return def.layer === undefined;
}

/** Tile e lado da parede atrás de um objeto de parede (`layer: 'wall'`). */
export function wallBehind(obj: Pick<WorldObject, 'x' | 'y' | 'rot'>): string {
  const side = rotateSide('N', obj.rot ?? 0);
  if (side === 'N') return `${obj.x},${obj.y},N`;
  if (side === 'S') return `${obj.x},${obj.y + 1},N`;
  if (side === 'W') return `${obj.x},${obj.y},W`;
  return `${obj.x + 1},${obj.y},W`;
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
  /** linhas do grid inteiro (todos os andares) */
  h: number;
  /** bloco 12: fundura de um andar e distância em linhas entre andares */
  lotH: number;
  stride: number;
  blocked: Uint8Array;
  /** bloco 12: passos de escada (índice do tile → vizinhos pela escada) */
  links: Map<number, number[]>;
  /** true se dá para passar do tile a para o vizinho b */
  canStep(ax: number, ay: number, bx: number, by: number): boolean;
  isFree(x: number, y: number): boolean;
}

/** Bloco 12: degrau de escada (fora do chão livre; só se anda nele pela escada). */
const STAIR = 2;

export function buildNav(world: World, catalog: Catalog): Nav {
  const { grid } = world;
  const rows = rowsOf(grid);
  const blocked = new Uint8Array(grid.w * rows);
  for (let i = 0; i < blocked.length; i++) {
    const f = grid.floor[i];
    if (f === undefined || catalog.floors[f]?.void || f === VOID) blocked[i] = 1;
  }
  for (const obj of world.objects) {
    const def = catalog.objects[obj.defId];
    if (!def || !blocksFloor(def)) continue;
    for (const t of footprint(obj, def)) {
      if (inBounds(grid, t.x, t.y)) blocked[t.y * grid.w + t.x] = 1;
    }
  }
  const links = new Map<number, number[]>();
  const link = (a: Vec, b: Vec) => {
    const ia = a.y * grid.w + a.x;
    const ib = b.y * grid.w + b.x;
    links.set(ia, [...(links.get(ia) ?? []), ib]);
    links.set(ib, [...(links.get(ib) ?? []), ia]);
  };
  for (const st of grid.stairs ?? []) {
    const plan = stairPlan(grid, st);
    const chain = [plan.entry, ...plan.run, plan.landing];
    if (!chain.every((t) => inBounds(grid, t.x, t.y))) continue;
    for (const t of plan.run) blocked[t.y * grid.w + t.x] = STAIR;
    for (let i = 1; i < chain.length; i++) link(chain[i - 1], chain[i]);
  }
  const isFree = (x: number, y: number) => inBounds(grid, x, y) && blocked[y * grid.w + x] === 0;
  return {
    w: grid.w,
    h: rows,
    lotH: grid.h,
    stride: strideOf(grid),
    blocked,
    links,
    isFree,
    canStep(ax, ay, bx, by) {
      const a = ay * grid.w + ax;
      const b = by * grid.w + bx;
      const via = links.get(a);
      if (via?.includes(b)) return blocked[b] !== 1;
      // do degrau só se sai pela própria escada
      if (blocked[a] === STAIR) return false;
      if (!isFree(bx, by)) return false;
      return !blocksStep(grid.edges[edgeKey(ax, ay, bx, by)]);
    },
  };
}

/** Bloco 12: o tile é degrau de escada? */
export function onStairs(nav: Nav, x: number, y: number): boolean {
  return nav.blocked[y * nav.w + x] === STAIR;
}

/** Vizinhos de passo (4 direções e a escada). */
export function stepNeighbors(nav: Nav, x: number, y: number): Vec[] {
  const out: Vec[] = [
    { x, y: y - 1 },
    { x: x + 1, y },
    { x, y: y + 1 },
    { x: x - 1, y },
  ];
  for (const j of nav.links.get(y * nav.w + x) ?? []) out.push({ x: j % nav.w, y: Math.floor(j / nav.w) });
  return out;
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
  // o que não ocupa o chão (luminária de teto) se usa debaixo dele também
  if (!blocksFloor(def)) for (const t of own) if (nav.isFree(t.x, t.y)) out.push({ ...t });
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
