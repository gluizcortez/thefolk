import { reachable } from './economy';
import {
  VOID,
  blocksFloor,
  buildNav,
  edgeKey,
  edgeLevel,
  footprint,
  inBounds,
  isWindow,
  levelOfRow,
  levelsOf,
  objectSize,
  rowOn,
  stairPlan,
  strideOf,
  useTiles,
  wallBehind,
} from './grid';
import { roofArea } from './roof';
import { computeRooms, roomAt } from './rooms';
import type { Catalog, Command, EdgeKind, Grid, Roof, Side, Stair, Vec, World } from './types';

// Modo construção: paredes, portas e janelas nas bordas dos tiles, pisos nos
// tiles e revestimentos nas faces das paredes. Toda mudança vira um
// `GridChange` (o que muda e para quê), que é validado, cobrado e guardado
// invertido para poder ser desfeito.

export type BuildProblem =
  | 'outside'
  | 'nothing'
  | 'noWall'
  | 'cutsObject'
  | 'trapsFolk'
  | 'blocksObject'
  | 'holdsDecor'
  | 'unknown'
  | 'funds'
  | 'undoEmpty'
  | 'undoBlocked'
  // bloco 12
  | 'noSupport'
  | 'holdsFloor'
  | 'noLevel'
  | 'noLanding'
  | 'stairsBlocked'
  | 'cutsStairs'
  | 'noStairs';

/** O que muda no grid. `null` apaga a entrada. */
export interface GridChange {
  edges: Record<string, EdgeKind | null>;
  /** índice do tile (y * w + x) → piso */
  floor: Record<number, string>;
  coverings: Record<string, string | null>;
  /** bloco 12: lista nova de escadas, colunas e telhado (só quando mudam) */
  stairs?: Stair[];
  columns?: string[];
  roof?: Roof;
}

const BUILD_TYPES = [
  'buildWalls',
  'eraseWalls',
  'placeOpening',
  'paintFloor',
  'paintWalls',
  'buildHalfWalls',
  'placeStairs',
  'removeStairs',
  'toggleColumn',
  'setRoof',
] as const;

export type BuildCommand = Extract<Command, { type: (typeof BUILD_TYPES)[number] }>;

export interface BuildPlan {
  ok: boolean;
  problem?: BuildProblem;
  /** tostões que a mudança custa */
  cost: number;
  change: GridChange;
}

export function isBuildCommand(cmd: Command): cmd is BuildCommand {
  return (BUILD_TYPES as readonly string[]).includes(cmd.type);
}

export function emptyChange(): GridChange {
  return { edges: {}, floor: {}, coverings: {} };
}

function changeSize(c: GridChange): number {
  return (
    Object.keys(c.edges).length +
    Object.keys(c.floor).length +
    Object.keys(c.coverings).length +
    (c.stairs ? 1 : 0) +
    (c.columns ? 1 : 0) +
    (c.roof ? 1 : 0)
  );
}

/** Bloco 12: a mudança mexe em por onde se anda (e precisa da validação)? */
export function touchesNav(c: GridChange): boolean {
  return Object.keys(c.edges).length > 0 || !!c.stairs || Object.values(c.floor).includes(VOID);
}

// ---------- geometria ----------

/** A borda fica no terreno (entre dois tiles ou na divisa do lote), em algum andar? */
export function validEdge(grid: Grid, key: string): boolean {
  const [xs, ys, side] = key.split(',');
  const x = Number(xs);
  const y = Number(ys);
  if (!Number.isInteger(x) || !Number.isInteger(y)) return false;
  if (side === 'N') return x >= 0 && x < grid.w && edgeLevel(grid, key) >= 0;
  if (side === 'W') return x >= 0 && x <= grid.w && levelOfRow(grid, y) >= 0;
  return false;
}

/** Bloco 12: andar de um vértice (a linha logo depois do andar ainda é dele). */
export function vertexLevel(grid: Grid, y: number): number {
  const own = levelOfRow(grid, y);
  return own >= 0 ? own : levelOfRow(grid, y - 1);
}

/** Bloco 12: o tile tem piso de verdade (nem grama, nem vão)? */
function solid(grid: Grid, catalog: Catalog, x: number, y: number): boolean {
  if (!inBounds(grid, x, y)) return false;
  const f = catalog.floors[grid.floor[y * grid.w + x]];
  return !!f && !f.outdoor;
}

/** Bloco 12: tile de andar de cima com chão (qualquer piso que não seja o vão)? */
function floored(grid: Grid, catalog: Catalog, x: number, y: number): boolean {
  if (!inBounds(grid, x, y)) return false;
  return !catalog.floors[grid.floor[y * grid.w + x]]?.void;
}

/**
 * Bloco 12: parede de andar de cima precisa de apoio: piso de um dos lados no
 * próprio andar, ou parede logo embaixo.
 */
function supportedEdge(grid: Grid, catalog: Catalog, key: string): boolean {
  const level = edgeLevel(grid, key);
  if (level <= 0) return true;
  const [xs, ys, side] = key.split(',');
  const x = Number(xs);
  const y = Number(ys);
  if (grid.edges[`${x},${y - strideOf(grid)},${side}`]) return true;
  const [bx, by] = side === 'N' ? [x, y - 1] : [x - 1, y];
  return floored(grid, catalog, x, y) || floored(grid, catalog, bx, by);
}

/**
 * Bordas ao longo de uma linha reta entre dois vértices do grid (o vértice
 * (x, y) é o canto noroeste do tile (x, y)). Trechos fora do terreno ficam de
 * fora. Linha torta devolve null.
 */
export function lineEdges(grid: Grid, x0: number, y0: number, x1: number, y1: number): string[] | null {
  const out: string[] = [];
  if (y0 === y1) {
    for (let x = Math.min(x0, x1); x < Math.max(x0, x1); x++) out.push(`${x},${y0},N`);
  } else if (x0 === x1) {
    for (let y = Math.min(y0, y1); y < Math.max(y0, y1); y++) out.push(`${x0},${y},W`);
  } else {
    return null;
  }
  return out.filter((k) => validEdge(grid, k));
}

/** Chave da face de parede do lado `side` do tile (x, y). */
export function faceKey(x: number, y: number, side: Side): string {
  return `${x},${y},${side}`;
}

/** Borda onde fica uma face. */
export function edgeOfFace(face: string): string {
  const [xs, ys, side] = face.split(',');
  const x = Number(xs);
  const y = Number(ys);
  if (side === 'S') return `${x},${y + 1},N`;
  if (side === 'E') return `${x + 1},${y},W`;
  return `${x},${y},${side}`;
}

/** As duas faces de uma borda: a do tile da chave e a do vizinho. */
export function facesOfEdge(key: string): [string, string] {
  const [xs, ys, side] = key.split(',');
  const x = Number(xs);
  const y = Number(ys);
  return side === 'N' ? [faceKey(x, y, 'N'), faceKey(x, y - 1, 'S')] : [faceKey(x, y, 'W'), faceKey(x - 1, y, 'E')];
}

const SIDES: { side: Side; dx: number; dy: number }[] = [
  { side: 'N', dx: 0, dy: -1 },
  { side: 'E', dx: 1, dy: 0 },
  { side: 'S', dx: 0, dy: 1 },
  { side: 'W', dx: -1, dy: 0 },
];

/**
 * Todas as faces de parede viradas para o cômodo do tile (x, y). O cômodo é o
 * conjunto de tiles ligados sem cruzar parede, porta ou janela.
 */
export function roomFaces(grid: Grid, x: number, y: number): string[] {
  if (!inBounds(grid, x, y)) return [];
  const seen = new Set<number>([y * grid.w + x]);
  const queue: Vec[] = [{ x, y }];
  const faces: string[] = [];
  while (queue.length > 0) {
    const cur = queue.shift()!;
    for (const d of SIDES) {
      const nx = cur.x + d.dx;
      const ny = cur.y + d.dy;
      if (grid.edges[edgeKey(cur.x, cur.y, nx, ny)]) {
        faces.push(faceKey(cur.x, cur.y, d.side));
        continue;
      }
      if (!inBounds(grid, nx, ny) || seen.has(ny * grid.w + nx)) continue;
      seen.add(ny * grid.w + nx);
      queue.push({ x: nx, y: ny });
    }
  }
  return faces;
}

/** O tile é de dentro (tem piso de cômodo) ou de fora (grama)? */
export function isIndoorTile(grid: Grid, catalog: Catalog, x: number, y: number): boolean {
  if (!inBounds(grid, x, y)) return false;
  return catalog.floors[grid.floor[y * grid.w + x]]?.outdoor !== true;
}

// ---------- aplicar e desfazer ----------

/** Grid novo com a mudança aplicada (o original não muda). */
export function applyChange(grid: Grid, change: GridChange): Grid {
  const edges = { ...grid.edges };
  for (const [k, v] of Object.entries(change.edges)) {
    if (v === null) delete edges[k];
    else edges[k] = v;
  }
  const floor = [...grid.floor];
  for (const [i, v] of Object.entries(change.floor)) floor[Number(i)] = v;
  const coverings = { ...grid.coverings };
  for (const [k, v] of Object.entries(change.coverings)) {
    if (v === null) delete coverings[k];
    else coverings[k] = v;
  }
  const out: Grid = { ...grid, floor, edges, coverings };
  if (change.stairs) out.stairs = change.stairs;
  if (change.columns) out.columns = change.columns;
  if (change.roof) out.roof = change.roof;
  return out;
}

/** A mudança que leva de volta ao grid de antes. */
export function invertChange(grid: Grid, change: GridChange): GridChange {
  const back = emptyChange();
  for (const k of Object.keys(change.edges)) back.edges[k] = grid.edges[k] ?? null;
  for (const i of Object.keys(change.floor)) back.floor[Number(i)] = grid.floor[Number(i)];
  for (const k of Object.keys(change.coverings)) back.coverings[k] = grid.coverings[k] ?? null;
  if (change.stairs) back.stairs = grid.stairs ?? [];
  if (change.columns) back.columns = grid.columns ?? [];
  if (change.roof && grid.roof) back.roof = grid.roof;
  return back;
}

// ---------- validação ----------

/**
 * Diz se o grid novo deixa a casa jogável:
 * - nenhuma parede corta um objeto ao meio;
 * - quem alcançava a calçada a pé continua alcançando;
 * - todo objeto que dava para usar continua com um lado alcançável.
 * Cômodos vazios fechados são permitidos (a porta pode vir depois).
 */
export function checkGrid(world: World, catalog: Catalog, after: Grid): BuildProblem | null {
  for (const obj of world.objects) {
    const def = catalog.objects[obj.defId];
    if (!def) continue;
    const size = objectSize(def, obj.rot);
    for (let dy = 0; dy < size.h; dy++) {
      for (let dx = 0; dx < size.w; dx++) {
        const tx = obj.x + dx;
        const ty = obj.y + dy;
        if (dx > 0 && after.edges[edgeKey(tx - 1, ty, tx, ty)]) return 'cutsObject';
        if (dy > 0 && after.edges[edgeKey(tx, ty - 1, tx, ty)]) return 'cutsObject';
      }
    }
  }
  // bloco 3: quadro precisa da parede atrás; luminária de teto, de teto
  let roomsAfter: ReturnType<typeof computeRooms> | null = null;
  for (const obj of world.objects) {
    const def = catalog.objects[obj.defId];
    if (def?.layer === 'wall' && after.edges[wallBehind(obj)] !== 'wall') return 'holdsDecor';
    if (def?.layer === 'ceiling') {
      roomsAfter ??= computeRooms(after, catalog);
      if (roomAt(roomsAfter, obj.x, obj.y)?.outdoor !== false) return 'holdsDecor';
    }
  }

  // bloco 12: nada de parede no caminho da escada, e objeto não fica no vão
  for (const st of after.stairs ?? []) {
    const plan = stairPlan(after, st);
    const chain = [plan.entry, ...plan.run];
    for (let i = 1; i < chain.length; i++) {
      if (after.edges[edgeKey(chain[i - 1].x, chain[i - 1].y, chain[i].x, chain[i].y)]) return 'cutsStairs';
    }
    const top = plan.hole[plan.hole.length - 1];
    if (after.edges[edgeKey(top.x, top.y, plan.landing.x, plan.landing.y)]) return 'cutsStairs';
  }
  for (const obj of world.objects) {
    const def = catalog.objects[obj.defId];
    if (!def) continue;
    for (const t of footprint(obj, def)) if (inBounds(after, t.x, t.y) && catalog.floors[after.floor[t.y * after.w + t.x]]?.void) return 'holdsFloor';
  }

  const worldAfter: World = { ...world, grid: after };
  const navBefore = buildNav(world, catalog);
  const navAfter = buildNav(worldAfter, catalog);
  const reachBefore = reachable(navBefore, world.exit);
  const reachAfter = reachable(navAfter, world.exit);
  const key = (v: Vec) => v.y * world.grid.w + v.x;

  for (const folk of world.folks) {
    if (folk.away) continue;
    if (reachBefore.has(key(folk)) && !reachAfter.has(key(folk))) return 'trapsFolk';
  }
  for (const obj of world.objects) {
    const def = catalog.objects[obj.defId];
    if (!def || def.interactions.length === 0) continue;
    const wasUsable = useTiles(world, navBefore, obj, def).some((t) => reachBefore.has(key(t)));
    if (!wasUsable) continue;
    const usable = useTiles(worldAfter, navAfter, obj, def).some((t) => reachAfter.has(key(t)));
    if (!usable) return 'blocksObject';
  }
  return null;
}

// ---------- planos de cada comando ----------

function fail(problem: BuildProblem, change = emptyChange()): BuildPlan {
  return { ok: false, problem, cost: 0, change };
}

/**
 * Monta a mudança que um comando de construção pede, com o custo, e diz se
 * pode ser feita agora (dinheiro e validação). Não altera nada: a tela usa
 * isto para a prévia, e `Sim.dispatch` para valer.
 */
export function planBuild(world: World, catalog: Catalog, cmd: BuildCommand): BuildPlan {
  const { grid } = world;
  const change = emptyChange();
  let cost = 0;

  switch (cmd.type) {
    case 'buildWalls':
    case 'buildHalfWalls': {
      const kind: EdgeKind = cmd.type === 'buildWalls' ? 'wall' : 'half';
      const keys = lineEdges(grid, cmd.x0, cmd.y0, cmd.x1, cmd.y1);
      if (!keys || keys.length === 0) return fail('outside');
      if (vertexLevel(grid, cmd.y0) !== vertexLevel(grid, cmd.y1)) return fail('outside');
      for (const k of keys) {
        const cur = grid.edges[k];
        // meia parede vira parede inteira (e vice-versa); porta e janela ficam
        if (!cur || ((cur === 'wall' || cur === 'half') && cur !== kind)) change.edges[k] = kind;
      }
      if (Object.keys(change.edges).some((k) => !supportedEdge(grid, catalog, k))) return fail('noSupport', change);
      cost = Object.keys(change.edges).length * catalog.parts[kind].price;
      break;
    }
    case 'eraseWalls': {
      const keys = lineEdges(grid, cmd.x0, cmd.y0, cmd.x1, cmd.y1);
      if (!keys || keys.length === 0) return fail('outside');
      for (const k of keys) {
        if (!grid.edges[k]) continue;
        change.edges[k] = null;
        for (const f of facesOfEdge(k)) if (grid.coverings[f]) change.coverings[f] = null;
      }
      break;
    }
    case 'placeOpening': {
      if (!validEdge(grid, cmd.edge)) return fail('outside');
      const cur = grid.edges[cmd.edge];
      if (!cur || cur === 'half') return fail('noWall');
      if (!catalog.parts[cmd.kind]) return fail('unknown');
      if (cur !== cmd.kind) change.edges[cmd.edge] = cmd.kind;
      cost = changeSize(change) > 0 ? catalog.parts[cmd.kind].price : 0;
      break;
    }
    case 'paintFloor': {
      let def = catalog.floors[cmd.floorId];
      if (!def) return fail('unknown');
      // bloco 12: o retângulo fica no andar do primeiro canto
      const level = levelOfRow(grid, cmd.y0);
      if (level < 0) return fail('outside');
      // no andar de cima, "grama" é tirar o piso; no térreo não existe vão
      if (level > 0 && def.outdoor) def = catalog.floors[VOID] ?? def;
      if (level === 0 && def.void) return fail('unknown');
      const top = rowOn(grid, level, 0);
      const xa = Math.max(0, Math.min(cmd.x0, cmd.x1));
      const xb = Math.min(grid.w - 1, Math.max(cmd.x0, cmd.x1));
      const ya = Math.max(top, Math.min(cmd.y0, cmd.y1));
      const yb = Math.min(top + grid.h - 1, Math.max(cmd.y0, cmd.y1));
      if (xa > xb || ya > yb) return fail('outside');
      const holes = new Set<number>();
      for (const st of grid.stairs ?? []) for (const t of stairPlan(grid, st).hole) holes.add(t.y * grid.w + t.x);
      const up = strideOf(grid);
      for (let y = ya; y <= yb; y++) {
        for (let x = xa; x <= xb; x++) {
          const i = y * grid.w + x;
          if (grid.floor[i] === def.id) continue;
          if (level > 0 && !def.void) {
            // piso de cima precisa de cômodo embaixo, e o vão da escada fica aberto
            if (holes.has(i)) return fail('stairsBlocked', change);
            if (!solid(grid, catalog, x, y - up)) return fail('noSupport', change);
          }
          // tirar o piso de baixo de um piso de cima derrubaria o andar
          if (def.outdoor && level + 1 < levelsOf(grid) && floored(grid, catalog, x, y + up)) return fail('holdsFloor', change);
          change.floor[i] = def.id;
        }
      }
      cost = Object.keys(change.floor).length * def.price;
      break;
    }
    case 'placeStairs': {
      const level = levelOfRow(grid, cmd.y);
      if (level < 0) return fail('outside');
      if (level + 1 >= levelsOf(grid)) return fail('noLevel');
      const plan = stairPlan(grid, cmd);
      const own = (t: Vec) => inBounds(grid, t.x, t.y) && levelOfRow(grid, t.y) === level;
      if (![plan.entry, ...plan.run].every(own)) return fail('outside');
      if (!inBounds(grid, plan.landing.x, plan.landing.y)) return fail('outside');
      const nav = buildNav(world, catalog);
      for (const t of [plan.entry, ...plan.run]) {
        if (!nav.isFree(t.x, t.y)) return fail('stairsBlocked');
      }
      if (!floored(grid, catalog, plan.landing.x, plan.landing.y) || !nav.isFree(plan.landing.x, plan.landing.y)) return fail('noLanding');
      const taken = new Set<string>();
      for (const o of world.objects) {
        const def = catalog.objects[o.defId];
        if (def && blocksFloor(def)) for (const t of footprint(o, def)) taken.add(`${t.x},${t.y}`);
      }
      for (const t of plan.hole) {
        if (taken.has(`${t.x},${t.y}`)) return fail('stairsBlocked');
        if (world.folks.some((f) => !f.away && f.x === t.x && f.y === t.y)) return fail('trapsFolk');
      }
      if (world.folks.some((f) => !f.away && plan.run.some((t) => t.x === f.x && t.y === f.y))) return fail('trapsFolk');
      // o andar de cima ganha o vão por onde a escada passa
      for (const t of plan.hole) if (!catalog.floors[grid.floor[t.y * grid.w + t.x]]?.void) change.floor[t.y * grid.w + t.x] = VOID;
      change.stairs = [...(grid.stairs ?? []), { x: cmd.x, y: cmd.y, dir: cmd.dir, level }];
      cost = catalog.parts.stairs.price;
      break;
    }
    case 'removeStairs': {
      const stairs = grid.stairs ?? [];
      const idx = stairs.findIndex((st) => stairPlan(grid, st).run.some((t) => t.x === cmd.x && t.y === cmd.y));
      if (idx < 0) return fail('noStairs');
      change.stairs = stairs.filter((_, i) => i !== idx);
      break;
    }
    case 'toggleColumn': {
      const level = vertexLevel(grid, cmd.y);
      if (level < 0 || cmd.x < 0 || cmd.x > grid.w || !Number.isInteger(cmd.x) || !Number.isInteger(cmd.y)) return fail('outside');
      const key = `${cmd.x},${cmd.y}`;
      const cols = grid.columns ?? [];
      if (cols.includes(key)) {
        change.columns = cols.filter((c) => c !== key);
      } else {
        change.columns = [...cols, key];
        cost = catalog.parts.column.price;
      }
      break;
    }
    case 'setRoof': {
      const cur = grid.roof;
      if (cur && cur.style === cmd.style && cur.color === cmd.color) return fail('nothing');
      if (cmd.style !== 'gable' && cmd.style !== 'hip') return fail('unknown');
      change.roof = { style: cmd.style, color: cmd.color };
      cost = roofArea(grid, catalog) * catalog.parts.roof.price;
      break;
    }
    case 'paintWalls': {
      const def = catalog.coverings[cmd.coveringId];
      if (!def) return fail('unknown');
      let walls = 0;
      for (const f of cmd.faces) {
        const edge = edgeOfFace(f);
        if (!validEdge(grid, edge) || !grid.edges[edge]) continue;
        walls++;
        if (grid.coverings[f] !== def.id) change.coverings[f] = def.id;
      }
      if (walls === 0) return fail('noWall');
      cost = Object.keys(change.coverings).length * def.price;
      break;
    }
  }

  if (changeSize(change) === 0) return fail('nothing');
  if (world.household.funds < cost) return { ok: false, problem: 'funds', cost, change };
  if (touchesNav(change)) {
    const problem = checkGrid(world, catalog, applyChange(grid, change));
    if (problem) return { ok: false, problem, cost, change };
  }
  return { ok: true, cost, change };
}

// ---------- janelas no ambiente ----------

/** distância (Manhattan) em que uma janela clareia o ambiente */
export const WINDOW_RADIUS = 3;
/** no máximo tantas janelas contam ao mesmo tempo */
export const WINDOW_MAX = 3;

/** Quanto as janelas perto do ponto somam ao ambiente. */
export function windowAmbience(world: World, catalog: Catalog, at: Vec): number {
  let n = 0;
  let sum = 0;
  for (const [key, kind] of Object.entries(world.grid.edges)) {
    if (!isWindow(kind)) continue;
    const [xs, ys, side] = key.split(',');
    const x = Number(xs);
    const y = Number(ys);
    // distância até o meio da borda, arredondada para o tile mais perto
    const ox = side === 'W' ? (at.x < x ? x - 1 : x) : x;
    const oy = side === 'N' ? (at.y < y ? y - 1 : y) : y;
    if (Math.abs(ox - at.x) + Math.abs(oy - at.y) <= WINDOW_RADIUS) {
      n++;
      sum += catalog.parts[kind].ambience ?? catalog.parts.window.ambience;
    }
    if (n >= WINDOW_MAX) break;
  }
  return sum;
}
