// Bloco 3: cômodos de verdade. Um cômodo é a região de tiles ligada sem
// cruzar parede, porta ou janela; a nota de ambiente de quem está dentro sai
// do cômodo inteiro (objetos, enfeites, sujeira, tamanho, janelas, luz, piso,
// revestimento e cantos), e não mais de um raio em volta do folk.

import { daylightAt } from './clock';
import { blocksFloor, edgeKey, footprint, inBounds, isDoorway, isWindow, rowsOf, splitsRoom } from './grid';
import { MESS_AMBIENCE, messSenseOf, stateAmbience } from './upkeep';
import { plantAmbience } from './garden';
import type { Catalog, Folk, Grid, ObjectDef, RoomTaste, Side, Vec, World, WorldObject } from './types';

export interface Room {
  id: number;
  /** quantos tiles */
  tiles: number;
  /**
   * quintal: a região encosta na divisa do lote. Um cercado de paredes conta
   * como cômodo mesmo antes de ganhar piso (grama só não soma na nota).
   */
  outdoor: boolean;
  /** janelas na volta do cômodo */
  windows: number;
  /** faces de parede viradas para dentro (para o revestimento) */
  faces: string[];
  /** tiles de canto (duas paredes em ângulo) */
  corners: Vec[];
  /** média do piso, já em pontos de ambiente */
  floorScore: number;
  /** média do revestimento, já em pontos de ambiente */
  coverScore: number;
}

export interface RoomMap {
  w: number;
  h: number;
  /** id do cômodo de cada tile (y * w + x) */
  of: Int32Array;
  rooms: Room[];
}

const SIDES: { side: Side; dx: number; dy: number }[] = [
  { side: 'N', dx: 0, dy: -1 },
  { side: 'E', dx: 1, dy: 0 },
  { side: 'S', dx: 0, dy: 1 },
  { side: 'W', dx: -1, dy: 0 },
];

/** Separa o terreno em cômodos. Função pura do grid (e dos pisos do catálogo). */
export function computeRooms(grid: Grid, catalog: Catalog): RoomMap {
  // bloco 12: todos os andares; as linhas do vão entre eles ficam de fora
  const { w } = grid;
  const h = rowsOf(grid);
  const of = new Int32Array(w * h).fill(-1);
  const rooms: Room[] = [];
  for (let start = 0; start < w * h; start++) {
    if (of[start] !== -1 || !inBounds(grid, start % w, Math.floor(start / w))) continue;
    const id = rooms.length;
    const queue = [start];
    of[start] = id;
    let tiles = 0;
    let border = false;
    let floorSum = 0;
    const faces: string[] = [];
    const corners: Vec[] = [];
    const windows = new Set<string>();
    for (let qi = 0; qi < queue.length; qi++) {
      const i = queue[qi];
      const x = i % w;
      const y = Math.floor(i / w);
      tiles++;
      const floor = catalog.floors[grid.floor[i]];
      floorSum += floor?.ambience ?? 0;
      const closed: Record<Side, boolean> = { N: false, E: false, S: false, W: false };
      for (const d of SIDES) {
        const nx = x + d.dx;
        const ny = y + d.dy;
        const key = edgeKey(x, y, nx, ny);
        const kind = grid.edges[key];
        if (kind) {
          closed[d.side] = !isDoorway(kind);
          if (kind === 'wall' || kind === 'half') faces.push(`${x},${y},${d.side}`);
          if (isWindow(kind)) windows.add(key);
          // bloco 12: meia parede fecha o passo, mas o cômodo continua do outro lado
          // (bloco 13: cerca, mureta e portão também)
          if (splitsRoom(kind)) continue;
        }
        if (!inBounds(grid, nx, ny)) {
          border = true;
          continue;
        }
        const j = ny * w + nx;
        if (of[j] !== -1) continue;
        of[j] = id;
        queue.push(j);
      }
      if ((closed.N || closed.S) && (closed.E || closed.W)) corners.push({ x, y });
    }
    let coverSum = 0;
    for (const face of faces) {
      const chosen = grid.coverings[face];
      const [fx, fy] = face.split(',').map(Number);
      const cover = chosen ?? catalog.floors[grid.floor[fy * w + fx]]?.cover;
      coverSum += (cover && catalog.coverings[cover]?.ambience) || 0;
    }
    rooms.push({
      id,
      tiles,
      outdoor: border,
      windows: windows.size,
      faces,
      corners,
      floorScore: tiles > 0 ? floorSum / tiles : 0,
      coverScore: faces.length > 0 ? coverSum / faces.length : 0,
    });
  }
  return { w, h, of, rooms };
}

const cache = new WeakMap<Grid, { sig: string; map: RoomMap }>();

function gridSig(grid: Grid): string {
  let s = `${grid.w}x${grid.h}x${grid.levels ?? 1}|`;
  for (const k in grid.edges) s += k + grid.edges[k] + ';';
  s += '|' + grid.floor.join(',') + '|';
  for (const k in grid.coverings) s += k + grid.coverings[k] + ';';
  return s;
}

/** Os cômodos do mundo, recalculados só quando a obra muda. */
export function roomsOf(world: World, catalog: Catalog): RoomMap {
  const sig = gridSig(world.grid);
  const hit = cache.get(world.grid);
  if (hit && hit.sig === sig) return hit.map;
  const map = computeRooms(world.grid, catalog);
  cache.set(world.grid, { sig, map });
  return map;
}

export function roomAt(map: RoomMap, x: number, y: number): Room | undefined {
  if (x < 0 || y < 0 || x >= map.w || y >= map.h) return undefined;
  return map.rooms[map.of[y * map.w + x]];
}

/** Cômodo de um objeto (pelo canto de origem; parede não corta objeto). */
export function roomOfObject(map: RoomMap, obj: WorldObject): Room | undefined {
  return roomAt(map, obj.x, obj.y);
}

export function objectsInRoom(world: World, map: RoomMap, room: Room): WorldObject[] {
  return world.objects.filter((o) => roomOfObject(map, o) === room);
}

// ---------- luz ----------

/** Abaixo disto o cômodo conta como escuro. */
export const DARK_BELOW = 0.4;
/** Cada luminária acesa ilumina bem um cômodo de até tantos tiles. */
const LIGHT_SPREAD = 18;

/** A luminária está acesa e funcionando? */
export function shining(obj: WorldObject, def: ObjectDef | undefined): boolean {
  return !!def?.light && !!obj.lit && !obj.state?.broken;
}

/**
 * Luz do cômodo agora (0 a 1): o dia entra pelas janelas (cômodo sem janela
 * fica na penumbra mesmo ao meio-dia) e as luminárias acesas somam.
 */
export function roomLight(world: World, catalog: Catalog, map: RoomMap, room: Room): number {
  const day = daylightAt(world.tick);
  if (room.outdoor) return Math.max(0.15, day);
  let light = day * Math.min(1, 0.2 + (room.windows * 8) / Math.max(room.tiles, 8));
  light += lampLight(world, catalog, map, room);
  return Math.min(1, light);
}

/** Só a parte das luminárias acesas. */
export function lampLight(world: World, catalog: Catalog, map: RoomMap, room: Room): number {
  let light = 0;
  for (const obj of world.objects) {
    const def = catalog.objects[obj.defId];
    if (!shining(obj, def) || roomOfObject(map, obj) !== room) continue;
    light += def!.light! * Math.min(1, LIGHT_SPREAD / room.tiles);
  }
  return light;
}

export function isDark(world: World, catalog: Catalog, map: RoomMap, room: Room): boolean {
  return !room.outdoor && roomLight(world, catalog, map, room) < DARK_BELOW;
}

/** Luminárias do cômodo (acesas ou não, fora as quebradas). */
export function lightsIn(world: World, catalog: Catalog, map: RoomMap, room: Room): WorldObject[] {
  return world.objects.filter((o) => {
    const def = catalog.objects[o.defId];
    return !!def?.light && !o.state?.broken && roomOfObject(map, o) === room;
  });
}

// ---------- nota do cômodo ----------

/** Peças da nota, para a tela explicar e os testes conferirem. */
export interface RoomScore {
  total: number;
  base: number;
  objects: number;
  windows: number;
  finish: number;
  size: number;
  corners: number;
  mess: number;
  light: number;
  taste: number;
  /** luz de 0 a 1 */
  level: number;
}

const ROOM_BASE = 30;
const OUTDOOR_BASE = 36;
/** raio em que objetos do quintal contam (no quintal não há paredes) */
export const OUTDOOR_RADIUS = 6;
/** teto da soma dos objetos (rende cada vez menos perto dele) */
const OBJECTS_CAP = 46;

/** Quanto os tiles de um cômodo pesam: apertado tira, espaçoso soma um pouco. */
export function sizeScore(tiles: number): number {
  if (tiles <= 3) return -10;
  if (tiles <= 6) return -4;
  if (tiles <= 9) return 0;
  if (tiles <= 24) return 2;
  return 3;
}

/** Os tamanhos e jeitos que cada gosto de traço procura. */
function tasteHits(room: Room, objects: number, light: number, lamps: number, night: boolean): Record<RoomTaste, boolean> {
  return {
    small: room.tiles <= 12,
    large: room.tiles >= 25,
    full: objects / Math.max(1, room.tiles) >= 0.3,
    bare: objects / Math.max(1, room.tiles) < 0.12,
    // aconchego: noite, à luz de luminária, sem estar claro demais
    cozy: night && lamps > 0 && light >= DARK_BELOW && light < 0.85,
    bright: light >= 0.85,
  };
}

/**
 * Nota do cômodo onde o folk está, peça por peça. Sem `folk`, sai a nota
 * "neutra" (sem gosto de traço e com a bagunça pesando o normal).
 */
export function roomScore(world: World, catalog: Catalog, map: RoomMap, room: Room, folk?: Folk, at?: Vec): RoomScore {
  const level = roomLight(world, catalog, map, room);
  const sense = folk ? messSenseOf(catalog, folk) : 1;
  let positive = 0;
  let negative = 0;
  let mess = 0;
  let count = 0;
  const near = (v: Vec) => !at || Math.abs(v.x - at.x) + Math.abs(v.y - at.y) <= OUTDOOR_RADIUS;
  const occupied = new Set<string>();
  for (const obj of world.objects) {
    const def = catalog.objects[obj.defId];
    if (!def || roomOfObject(map, obj) !== room) continue;
    if (room.outdoor && !near(obj)) continue;
    // bloco 13: planta florida soma mais; murcha ou seca, tira
    const amb = def.ambience + plantAmbience(obj, def);
    if (amb >= 0) positive += amb;
    else negative += amb;
    mess += stateAmbience(obj, def);
    if (blocksFloor(def) || def.layer === 'floor') count++;
    for (const t of footprint(obj, def)) occupied.add(`${t.x},${t.y}`);
  }
  for (const m of world.mess ?? []) {
    if (roomAt(map, m.x, m.y) !== room) continue;
    if (room.outdoor && !near(m)) continue;
    mess += MESS_AMBIENCE[m.kind];
  }
  const objects = OBJECTS_CAP * (1 - Math.exp(-positive / OBJECTS_CAP)) + negative;
  const out: RoomScore = {
    total: 0,
    base: room.outdoor ? OUTDOOR_BASE : ROOM_BASE,
    objects,
    windows: 0,
    finish: 0,
    size: 0,
    corners: 0,
    mess: mess < 0 ? mess * sense : 0,
    light: 0,
    taste: 0,
    level,
  };
  if (room.outdoor) {
    // céu aberto: bom de dia, meio triste no escuro
    out.light = Math.round((level - 0.5) * 12);
  } else {
    out.windows = Math.min(room.windows, 3) * catalog.parts.window.ambience;
    out.finish = room.floorScore + room.coverScore;
    out.size = sizeScore(room.tiles);
    if (room.tiles >= 8) {
      const empty = room.corners.filter((c) => !occupied.has(`${c.x},${c.y}`)).length;
      if (empty > 1) out.corners = -Math.min(8, 2 * (empty - 1));
    }
    if (level < 0.5) out.light = -(0.5 - level) * 44;
    else if (level >= 0.8) out.light = 4;
  }
  if (folk && !room.outdoor) {
    const night = daylightAt(world.tick) < 0.5;
    const lamps = lampLight(world, catalog, map, room);
    const hits = tasteHits(room, count, level, lamps, night);
    for (const tr of folk.traits) {
      const taste = catalog.traits[tr]?.roomTaste;
      if (!taste) continue;
      for (const [k, v] of Object.entries(taste) as [RoomTaste, number][]) if (hits[k]) out.taste += v;
    }
  }
  out.total =
    out.base + out.objects + out.windows + out.finish + out.size + out.corners + out.mess + out.light + out.taste;
  out.total = Math.max(0, Math.min(100, out.total));
  return out;
}

/** Para onde a necessidade "ambiente" do folk tende agora. */
export function roomAmbience(world: World, catalog: Catalog, folk: Folk): number {
  const map = roomsOf(world, catalog);
  const room = roomAt(map, folk.x, folk.y);
  if (!room) return ROOM_BASE;
  return roomScore(world, catalog, map, room, folk, room.outdoor ? folk : undefined).total;
}

// ---------- nome ----------

/**
 * Nome sugerido pelo uso: o tipo de cômodo que mais objetos pedem. Empate
 * entre dois tipos fortes vira nome duplo ("sala e cozinha"). Devolve ids
 * de data (room.<id> no i18n).
 */
export function roomKind(world: World, catalog: Catalog, map: RoomMap, room: Room): string[] {
  if (room.outdoor) return ['yard'];
  const votes = new Map<string, number>();
  for (const obj of world.objects) {
    const def = catalog.objects[obj.defId];
    if (!def?.room || roomOfObject(map, obj) !== room) continue;
    votes.set(def.room, (votes.get(def.room) ?? 0) + 1);
  }
  const ranked = [...votes.entries()].sort((a, b) => b[1] - a[1]);
  if (ranked.length === 0) return [room.tiles <= 8 ? 'hall' : 'empty'];
  const [first, second] = ranked;
  if (second && second[1] >= 2 && second[1] >= first[1] - 1) return [first[0], second[0]];
  return [first[0]];
}

/** Palavra para a nota (0 a 100): ids de texto room.grade.<n>. */
export function roomGrade(total: number): number {
  return total >= 80 ? 4 : total >= 62 ? 3 : total >= 45 ? 2 : total >= 28 ? 1 : 0;
}
