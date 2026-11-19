import { isAdult } from './kids';
import type { Folk, Lot, Town, TravelMode, Trip, OwnVehicle, World } from './types';

// Plano 2, bloco 12: a cidade aberta. Os lotes dos três bairros, o centro e a
// área dos lugares públicos ficam num mapa só, em coordenadas de tile (x para
// leste, z para o sul, as mesmas da cena). Cada bairro é uma rua reta com
// cinco lotes de cada lado (como a Vila Taramela do bloco 15); as ruas dos
// bairros se ligam por duas avenidas, e a do leste atravessa o rio pela ponte
// até o centro. Aqui ficam só as regras puras: onde fica cada lote, o caminho
// pela rua de um ponto a outro, quanto tempo e quanto custa cada jeito de ir e
// em que nível cada lote e cada pessoa é simulada.

/** Largura e fundo de um lote (o quintal de trás até a calçada de dentro). */
export const LOT_W = 17;
export const LOT_H = 14;
/** Um lote mais o corredor até o próximo. */
export const LOT_PITCH = 19;
/** Do fundo dos lotes de cima até o meio da rua. */
export const STREET_Z = 18.9;
/** Do fundo dos lotes de cima até o fundo dos de baixo (que ficam girados). */
export const DISTRICT_DEPTH = 37.8;
/** Largura de uma rua com as duas calçadas. */
export const STREET_WIDTH = 7.8;
/** Onde começa cada bairro (fundo do lote 1). */
export const DISTRICT_ORIGINS: { x: number; z: number }[] = [
  { x: 0, z: 0 },
  { x: 0, z: 64 },
  { x: 0, z: 128 },
];
/** Avenidas que ligam as ruas dos bairros (meio da pista). */
export const WEST_X = -14;
export const EAST_X = 104;
/** O rio corre de norte a sul entre a avenida do leste e o centro. */
export const RIVER = { x0: 113, x1: 127 };
/** O lote do centro (24 x 17) com a frente para a avenida da ponte. */
export const CENTRO_AT = { x: 144, z: 61 };
export const CENTRO_SIZE = { w: 24, h: 17 };
/** Ponto da avenida em frente ao largo do centro. */
export const CENTRO_DOOR = { x: 155.5, z: 82.9 };
/** A avenida da ponte segue até aqui (depois dela, o fim da cidade). */
export const AVENUE_END = 204;
/**
 * Área dos lugares públicos e a praça do coreto. Plano 2, bloco 13: a área
 * tem três ruas próprias (a Rua das Portas desce da avenida da ponte e cruza
 * a Rua da Biblioteca e a Rua do Lago) e a praça ganhou a Rua da Praça, que
 * sai da avenida do oeste. Os lotes de cada lugar ficam em data/places.ts.
 */
export const PUBLIC_AREA = { x0: 132, z0: 87, x1: 208, z1: 184 };
export const SQUARE = { x0: -56, z0: 74, x1: -26, z1: 96 };
export const DOORS_X = 136;
export const LIBRARY_Z = 112;
export const LAKE_Z = 158;
export const PLAZA_Z = 100.9;
export const PLACES_END = AVENUE_END;
/** Até onde vai o chão da cidade. */
export const CITY_BOUNDS = { x0: -110, z0: -60, x1: 250, z1: 220 };

export interface Pt {
  x: number;
  z: number;
}

/** Onde o canto (0, 0) do lote cai na cidade; `flip` = girado meia volta (frente para o norte). */
export interface Place extends Pt {
  flip: boolean;
}

export function districtOrigin(district = 0): Pt {
  return DISTRICT_ORIGINS[district] ?? DISTRICT_ORIGINS[0];
}

export function streetZ(district = 0): number {
  return districtOrigin(district).z + STREET_Z;
}

export function lotPlace(lot: Pick<Lot, 'col' | 'side' | 'district'>): Place {
  const o = districtOrigin(lot.district);
  const x0 = o.x + lot.col * LOT_PITCH;
  return lot.side === 0 ? { x: x0, z: o.z, flip: false } : { x: x0 + LOT_W, z: o.z + DISTRICT_DEPTH, flip: true };
}

export function centroPlace(): Place {
  return { x: CENTRO_AT.x, z: CENTRO_AT.z, flip: false };
}

/** Ponto do lote (x, z locais, em tiles) na cidade. */
export function toCity(p: Place, x: number, z: number): Pt {
  return p.flip ? { x: p.x - x, z: p.z - z } : { x: p.x + x, z: p.z + z };
}

/** Ponto da cidade nas coordenadas locais do lote. */
export function toLocal(p: Place, x: number, z: number): Pt {
  return p.flip ? { x: p.x - x, z: p.z - z } : { x: x - p.x, z: z - p.z };
}

/** Retângulo do lote na cidade (x0, z0, x1, z1). */
export function lotRect(lot: Pick<Lot, 'col' | 'side' | 'district'>): [number, number, number, number] {
  const p = lotPlace(lot);
  return p.flip ? [p.x - LOT_W, p.z - LOT_H, p.x, p.z] : [p.x, p.z, p.x + LOT_W, p.z + LOT_H];
}

/** A cidade está ligada? (o bairro sozinho dos testes antigos não tem ruas para andar) */
export function cityOn(world: World): boolean {
  return !!world.town?.city;
}

export function districtOf(town: Town, lot: Lot): { name: string; street: string } {
  return town.city?.districts[lot.district ?? 0] ?? { name: town.name, street: town.street };
}

// ---------- ruas ----------

export interface Street {
  /** chave de texto do nome */
  name: string;
  a: Pt;
  b: Pt;
}

/** Todas as ruas da cidade (cada uma é uma reta). */
export function cityStreets(town: Pick<Town, 'city' | 'street'>): Street[] {
  const n = town.city?.districts.length ?? 1;
  const out: Street[] = [];
  for (let d = 0; d < n; d++) {
    const z = streetZ(d);
    out.push({ name: town.city?.districts[d]?.street ?? town.street, a: { x: WEST_X, z }, b: { x: EAST_X, z } });
  }
  const last = streetZ(n - 1);
  out.push({ name: 'city.street.west', a: { x: WEST_X, z: streetZ(0) }, b: { x: WEST_X, z: last } });
  out.push({ name: 'city.street.east', a: { x: EAST_X, z: streetZ(0) }, b: { x: EAST_X, z: last } });
  // plano 2, bloco 13: ruas dos lugares públicos e da praça (só na cidade)
  if (town.city) {
    out.push({ name: 'city.street.plaza', a: { x: SQUARE.x0 - 2, z: PLAZA_Z }, b: { x: WEST_X, z: PLAZA_Z } });
    out.push({ name: 'city.street.doors', a: { x: DOORS_X, z: CENTRO_DOOR.z }, b: { x: DOORS_X, z: LAKE_Z } });
    out.push({ name: 'city.street.library', a: { x: DOORS_X, z: LIBRARY_Z }, b: { x: PLACES_END, z: LIBRARY_Z } });
    out.push({ name: 'city.street.lake', a: { x: DOORS_X, z: LAKE_Z }, b: { x: PLACES_END, z: LAKE_Z } });
  }
  // a avenida da ponte fica por último (o ponto do centro entra nela)
  out.push({ name: 'city.street.bridge', a: { x: EAST_X, z: CENTRO_DOOR.z }, b: { x: AVENUE_END, z: CENTRO_DOOR.z } });
  return out;
}

/** Nós das esquinas e trechos entre eles (para achar caminho). */
interface Graph {
  nodes: Pt[];
  edges: [number, number][];
}

function graphOf(town: Pick<Town, 'city' | 'street'>): Graph {
  const nodes: Pt[] = [];
  const at = (p: Pt) => {
    const i = nodes.findIndex((q) => Math.abs(q.x - p.x) < 0.01 && Math.abs(q.z - p.z) < 0.01);
    if (i >= 0) return i;
    nodes.push({ ...p });
    return nodes.length - 1;
  };
  const streets = cityStreets(town);
  // as esquinas são os pontos onde duas ruas se cruzam (ou uma termina na outra)
  const cuts = streets.map((s) => [s.a, s.b]);
  for (let i = 0; i < streets.length; i++) {
    for (let j = 0; j < streets.length; j++) {
      if (i === j) continue;
      const p = crossing(streets[i], streets[j]);
      if (p) cuts[i].push(p);
    }
  }
  at(CENTRO_DOOR);
  cuts[cuts.length - 1].push(CENTRO_DOOR);
  const edges: [number, number][] = [];
  streets.forEach((s, i) => {
    const horiz = Math.abs(s.a.z - s.b.z) < 0.01;
    const pts = cuts[i].sort((p, q) => (horiz ? p.x - q.x : p.z - q.z));
    for (let k = 1; k < pts.length; k++) {
      const u = at(pts[k - 1]);
      const v = at(pts[k]);
      if (u !== v) edges.push([u, v]);
    }
  });
  return { nodes, edges };
}

function crossing(s: Street, t: Street): Pt | null {
  const sh = Math.abs(s.a.z - s.b.z) < 0.01;
  const th = Math.abs(t.a.z - t.b.z) < 0.01;
  if (sh === th) return null;
  const h = sh ? s : t;
  const v = sh ? t : s;
  const x = v.a.x;
  const z = h.a.z;
  const within = (a: number, b: number, c: number) => c >= Math.min(a, b) - 0.01 && c <= Math.max(a, b) + 0.01;
  return within(h.a.x, h.b.x, x) && within(v.a.z, v.b.z, z) ? { x, z } : null;
}

const dist = (a: Pt, b: Pt) => Math.abs(a.x - b.x) + Math.abs(a.z - b.z);

/** Ponto na rua mais perto de `p` (projeção num dos trechos). */
function snap(g: Graph, p: Pt): { pt: Pt; edge: number } {
  let best = { pt: g.nodes[0], edge: 0, d: Infinity };
  g.edges.forEach(([u, v], i) => {
    const a = g.nodes[u];
    const b = g.nodes[v];
    const q = { x: clamp(p.x, Math.min(a.x, b.x), Math.max(a.x, b.x)), z: clamp(p.z, Math.min(a.z, b.z), Math.max(a.z, b.z)) };
    const d = Math.hypot(q.x - p.x, q.z - p.z);
    if (d < best.d) best = { pt: q, edge: i, d };
  });
  return { pt: best.pt, edge: best.edge };
}

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

/** Caminho pela rua de `from` até `to` (pontos da cidade): sai pela calçada, anda pelas ruas, entra pela calçada. */
export function streetRoute(town: Pick<Town, 'city' | 'street'>, from: Pt, to: Pt): { points: Pt[]; length: number } {
  const g = graphOf(town);
  const s = snap(g, from);
  const t = snap(g, to);
  const n = g.nodes.length;
  const S = n;
  const T = n + 1;
  const nodes = [...g.nodes, s.pt, t.pt];
  const adj: [number, number][][] = nodes.map(() => []);
  const link = (u: number, v: number) => {
    const d = dist(nodes[u], nodes[v]);
    adj[u].push([v, d]);
    adj[v].push([u, d]);
  };
  g.edges.forEach(([u, v], i) => {
    if (i !== s.edge && i !== t.edge) link(u, v);
  });
  for (const [p, e] of [
    [S, s.edge],
    [T, t.edge],
  ] as [number, number][]) {
    const [u, v] = g.edges[e];
    link(p, u);
    link(p, v);
  }
  if (s.edge === t.edge) link(S, T);
  // Dijkstra (o grafo tem poucas dezenas de nós)
  const best = nodes.map(() => Infinity);
  const prev = nodes.map(() => -1);
  const done = nodes.map(() => false);
  best[S] = 0;
  for (;;) {
    let u = -1;
    for (let i = 0; i < nodes.length; i++) if (!done[i] && best[i] < Infinity && (u < 0 || best[i] < best[u])) u = i;
    if (u < 0 || u === T) break;
    done[u] = true;
    for (const [v, d] of adj[u]) {
      if (best[u] + d < best[v]) {
        best[v] = best[u] + d;
        prev[v] = u;
      }
    }
  }
  const path: Pt[] = [];
  for (let v = T; v >= 0; v = prev[v]) path.unshift(nodes[v]);
  const points = [from, ...path, to].filter((p, i, all) => i === 0 || dist(p, all[i - 1]) > 0.01);
  let length = 0;
  for (let i = 1; i < points.length; i++) length += Math.hypot(points[i].x - points[i - 1].x, points[i].z - points[i - 1].z);
  return { points, length };
}

/** Porta de um lote na cidade: o tile de saída (na calçada de dentro). */
export function lotDoor(lot: Lot, exit: { x: number; y: number }): Pt {
  return toCity(lotPlace(lot), exit.x + 0.5, exit.y + 0.5);
}

/** Saída do lote do centro (o meio da calçada da frente do largo). */
export function centroDoor(exit: { x: number; y: number }): Pt {
  return toCity(centroPlace(), exit.x + 0.5, exit.y + 0.5);
}

/** Onde está quem anda pelo caminho, `d` tiles depois do começo; e para onde olha. */
export function pointAlong(points: number[], d: number): { x: number; z: number; dx: number; dz: number } {
  let left = Math.max(0, d);
  for (let i = 2; i + 1 < points.length; i += 2) {
    const ax = points[i - 2];
    const az = points[i - 1];
    const bx = points[i];
    const bz = points[i + 1];
    const seg = Math.hypot(bx - ax, bz - az);
    if (left <= seg || i + 2 >= points.length) {
      const k = seg > 0 ? Math.min(1, left / seg) : 1;
      return { x: ax + (bx - ax) * k, z: az + (bz - az) * k, dx: seg > 0 ? (bx - ax) / seg : 0, dz: seg > 0 ? (bz - az) / seg : 1 };
    }
    left -= seg;
  }
  return { x: points[0] ?? 0, z: points[1] ?? 0, dx: 0, dz: 1 };
}

export function flatten(points: Pt[]): number[] {
  return points.flatMap((p) => [Math.round(p.x * 100) / 100, Math.round(p.z * 100) / 100]);
}

export function unflatten(points: number[]): Pt[] {
  const out: Pt[] = [];
  for (let i = 0; i + 1 < points.length; i += 2) out.push({ x: points[i], z: points[i + 1] });
  return out;
}

// ---------- jeitos de ir ----------

export const TRAVEL_MODES: TravelMode[] = ['walk', 'bike', 'car', 'taxi'];
/** Tiles do mapa por minuto de jogo. */
export const TRAVEL_SPEED: Record<TravelMode, number> = { walk: 9, bike: 22, car: 40, taxi: 40 };
/** Minutos fixos: tirar a bicicleta, manobrar e estacionar, esperar o táxi. */
export const TRAVEL_OVERHEAD: Record<TravelMode, number> = { walk: 0, bike: 1, car: 2, taxi: 6 };
/** Preço da bicicleta e do carro (vender devolve a metade). */
export const VEHICLE_PRICE: Record<OwnVehicle, number> = { bike: 160, car: 3400 };
/** Lugares no carro (com quem dirige). */
export const CAR_SEATS = 5;
/** Visita a um vizinho: tempo na casa dele. */
export const VISIT_STAY = 90;
/** Visitas só de dia (de manhã até a hora do jantar acabar). */
export const VISIT_FROM = 8;
export const VISIT_UNTIL = 21;

export function travelMinutes(length: number, mode: TravelMode): number {
  return Math.max(2, Math.ceil(length / TRAVEL_SPEED[mode] + TRAVEL_OVERHEAD[mode]));
}

/** Quanto custa a viagem (para o grupo todo): táxi por distância, gasolina no carro. */
export function travelCost(length: number, mode: TravelMode): number {
  if (mode === 'taxi') return 10 + Math.round(length * 0.09);
  if (mode === 'car') return 2 + Math.round(length / 60);
  return 0;
}

export type TravelProblem = 'noBike' | 'noCar' | 'noDriver' | 'carFull' | 'funds';

export function vehiclesOf(world: World): OwnVehicle[] {
  return world.household.vehicles ?? [];
}

/** Dá para ir assim? (bicicleta para cada um, carro com motorista adulto e lugar, dinheiro do táxi) */
export function travelProblem(world: World, goers: Folk[], mode: TravelMode, length: number): TravelProblem | null {
  const owned = vehiclesOf(world);
  if (mode === 'bike') {
    const bikes = owned.filter((v) => v === 'bike').length;
    // a criança vai na garupa de um adulto
    const riders = goers.filter((f) => f.age !== 'child').length;
    if (bikes === 0 || bikes < riders) return 'noBike';
  }
  if (mode === 'car') {
    if (!owned.includes('car')) return 'noCar';
    if (!goers.some((f) => isAdult(f))) return 'noDriver';
    if (goers.length > CAR_SEATS) return 'carFull';
  }
  if (travelCost(length, mode) > world.household.funds) return 'funds';
  return null;
}

/** O melhor jeito disponível (o mais rápido que a família pode pagar), ou a pé. */
export function bestMode(world: World, goers: Folk[], length: number): TravelMode {
  for (const m of ['car', 'bike', 'taxi'] as TravelMode[]) if (!travelProblem(world, goers, m, length)) return m;
  return 'walk';
}

/** Onde anda a viagem agora: ponto da cidade, direção e em que parte está. */
export function tripState(trip: Trip, tick: number): { x: number; z: number; dx: number; dz: number; phase: 'going' | 'there' | 'back' } {
  const travel = Math.max(1, trip.arrive - trip.from);
  if (tick < trip.arrive) return { ...pointAlong(trip.points, (trip.length * (tick - trip.from)) / travel), phase: 'going' };
  if ((trip.kind !== 'visit' && trip.kind !== 'errand') || trip.leave === undefined || trip.back === undefined) return { ...pointAlong(trip.points, trip.length), phase: 'there' };
  if (tick < trip.leave) {
    const p = pointAlong(trip.points, trip.length);
    return { ...p, phase: 'there' };
  }
  const back = Math.max(1, trip.back - trip.leave);
  const k = Math.min(1, (tick - trip.leave) / back);
  const p = pointAlong(trip.points, trip.length * (1 - k));
  return { x: p.x, z: p.z, dx: -p.dx, dz: -p.dz, phase: 'back' };
}

// ---------- níveis de simulação ----------

/**
 * Plano 2, bloco 12: quanto da vida de cada lugar o jogo calcula. 'full' é
 * minuto a minuto (o lote em jogo, ou o centro durante o passeio); 'light' é
 * a vida resumida uma vez por dia (as outras famílias, a casa durante o
 * passeio); 'idle' é lote sem ninguém.
 */
export type SimLevel = 'full' | 'light' | 'idle';

export function lotLevel(world: World, lot: Lot): SimLevel {
  const town = world.town;
  if (!town) return 'idle';
  const active = town.families.find((f) => f.id === town.active);
  if (active && active.lotId === lot.id) return world.outing ? 'light' : 'full';
  return lot.familyId !== 0 ? 'light' : 'idle';
}

/** O centro só é simulado de verdade durante o passeio. */
export function centroLevel(world: World): SimLevel {
  return world.outing ? 'full' : 'idle';
}

/**
 * A família em jogo é sempre detalhada onde estiver (em casa, no centro, no
 * trabalho, na rua); as outras pessoas vivem a vida resumida.
 */
export function personLevel(world: World, id: number): SimLevel {
  const mine = [...world.folks, ...(world.outing?.home.folks ?? [])].some((f) => f.id === id && !f.visit);
  if (mine) return 'full';
  return world.neighbors.some((n) => n.id === id) ? 'light' : 'idle';
}
