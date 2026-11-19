import { MINUTES_PER_DAY } from './clock';
import { AVENUE_END, CENTRO_DOOR, cityOn, lotDoor, pointAlong, streetRoute, streetZ, travelMinutes } from './city';
import type { Pt } from './city';
import { CITY_EVENTS, eventOnDay } from './cityEvents';
import type { CityEventId } from './cityEvents';
import { stageOf } from './life';
import { placeDoor, placeOpen } from './places';
import type { Catalog, Neighbor, PlaceDef, Town, World } from './types';

// Plano 2, bloco 14: a rotina de quem não é da família em jogo. Cada pessoa
// da cidade tem um dia montado a partir do id dela e do número do dia (sem
// gastar o sorteio do mundo, então a tela e a sim chegam sempre na mesma
// resposta): quem tem emprego vai ao trabalho nos dias do cargo, criança e
// jovem vão à escola, os outros passeiam pelos lugares abertos conforme o
// jeito de cada um, há quem leve o cachorro para dar uma volta de manhã e de
// noite, e os eventos da cidade puxam gente para a praça e para o parque.
// Entre um lugar e outro a pessoa anda pela rua, no mesmo caminho que a
// família usa.

export type Doing = 'home' | 'work' | 'school' | 'place' | 'event' | 'walk' | 'dog';

export interface Stop {
  kind: 'work' | 'school' | 'place' | 'event' | 'dog';
  /** lugar (id de data/places.ts); vazio no passeio com o cachorro */
  place: string;
  /** minutos do dia em que chega e em que sai de lá */
  from: number;
  to: number;
  /** evento da cidade, quando foi por causa dele */
  event?: CityEventId;
}

export interface Whereabouts {
  doing: Doing;
  /** lugar onde está (ou para onde anda) */
  place?: string;
  event?: CityEventId;
  /** ponto da cidade quando dá para ver a pessoa (na rua ou num lugar aberto) */
  point?: Pt;
  /** para onde olha, andando */
  dir?: Pt;
  /** passeando com o cachorro */
  dog?: boolean;
}

// ---------- quem tem rotina ----------

/** Gente da cidade que leva a vida pelas ruas (não presta serviço, não está longe nem na gaveta). */
export function hasRoutine(n: Neighbor): boolean {
  return !n.service && !n.away;
}

function hash(a: number, b: string): number {
  let h = 2166136261 ^ a;
  for (let i = 0; i < b.length; i++) h = Math.imul(h ^ b.charCodeAt(i), 16777619);
  h ^= h >>> 13;
  h = Math.imul(h, 0x5bd1e995);
  h ^= h >>> 15;
  return ((h >>> 0) % 10000) / 10000;
}

/** Tem cachorro (um em cada quatro adultos com casa no bairro). */
export function hasDog(n: Neighbor): boolean {
  return n.home !== undefined && stageOf(n) !== 'child' && stageOf(n) !== 'teen' && stageOf(n) !== 'baby' && hash(n.id, 'dog') < 0.25;
}

// ---------- caminhos (guardados: as ruas não mudam) ----------

const routes = new Map<string, { points: number[]; length: number }>();

function route(town: Town, from: Pt, to: Pt): { points: number[]; length: number } {
  const key = `${town.city?.districts.length ?? 0}|${from.x.toFixed(1)},${from.z.toFixed(1)}>${to.x.toFixed(1)},${to.z.toFixed(1)}`;
  let r = routes.get(key);
  if (!r) {
    const sr = streetRoute(town, from, to);
    r = { points: sr.points.flatMap((p) => [p.x, p.z]), length: sr.length };
    if (routes.size > 4000) routes.clear();
    routes.set(key, r);
  }
  return r;
}

/** Porta de casa na cidade (quem mora fora chega pela avenida da ponte; a gente do centro mora no centro). */
export function homePoint(world: World, n: Neighbor): Pt {
  const town = world.town;
  if (town && n.home !== undefined) {
    const fam = town.families.find((f) => f.id === n.home);
    const lot = fam ? town.lots.find((l) => l.id === fam.lotId) : undefined;
    if (lot) return lotDoor(lot, lot.home?.exit ?? { x: 7, y: 13 });
  }
  if (n.downtown) return { ...CENTRO_DOOR };
  return { x: AVENUE_END, z: CENTRO_DOOR.z };
}

function doorOf(catalog: Catalog, def: PlaceDef): Pt {
  const plan = catalog.venues?.[def.id];
  return def.kind === 'venue' && plan ? placeDoor(def, plan.exit) : placeDoor(def);
}

// ---------- o dia de cada um ----------

/** Lugares de que cada jeito gosta (o primeiro é o preferido). */
const LIKES: Record<string, string[]> = {
  atletico: ['academia', 'parque'],
  agitado: ['academia', 'bar'],
  rato_de_biblioteca: ['biblioteca'],
  cabeca_boa: ['biblioteca', 'parque'],
  festeiro: ['bar', 'praca'],
  pe_de_valsa: ['bar', 'praca'],
  coruja: ['bar', 'cinema'],
  noveleiro: ['cinema'],
  romantico: ['cinema', 'parque'],
  guloso: ['centro', 'mercado'],
  vaidoso: ['loja', 'centro'],
  tagarela: ['praca', 'centro'],
  madrugador: ['parque', 'mercado'],
  familia: ['praca', 'parque'],
};
const DEFAULT_LIKES = ['praca', 'parque', 'mercado', 'centro', 'biblioteca'];
const KID_LIKES = ['praca', 'parque', 'biblioteca'];
const TEEN_LIKES = ['praca', 'cinema', 'academia', 'biblioteca'];
const ELDER_LIKES = ['praca', 'parque', 'biblioteca', 'mercado', 'centro'];

/** Janelas do dia para passear (minutos). */
const WINDOWS: [number, number][] = [
  [8 * 60 + 30, 12 * 60],
  [14 * 60, 17 * 60 + 30],
  [18 * 60 + 30, 22 * 60 + 30],
];

const plans = new Map<string, Stop[]>();

function overlaps(stops: Stop[], from: number, to: number, pad: number): boolean {
  return stops.some((s) => from < s.to + pad && to + pad > s.from);
}

/**
 * O dia de uma pessoa (sem as viagens: só onde fica e de quando a quando).
 * Guardado por dia; o mesmo dia dá sempre o mesmo resultado.
 */
export function dayPlan(_world: World, catalog: Catalog, n: Neighbor, day: number): Stop[] {
  const key = `${n.id}:${day}:${n.career?.id ?? ''}${n.career?.level ?? ''}:${n.age ?? ''}:${n.home ?? ''}`;
  const cached = plans.get(key);
  if (cached) return cached;
  const stops: Stop[] = [];
  const stage = stageOf(n);
  const weekday = ((day % 7) + 7) % 7;
  const r = (salt: string) => hash(n.id * 7919 + day, salt);
  const open = (id: string, from: number, to: number) => {
    const def = catalog.places?.[id];
    return !!def && placeOpen(def, day * MINUTES_PER_DAY + from) && placeOpen(def, day * MINUTES_PER_DAY + to - 1);
  };
  if (stage !== 'baby') {
    // escola (criança e jovem, de segunda a sexta)
    if ((stage === 'child' || stage === 'teen') && weekday < 5) stops.push({ kind: 'school', place: 'escola', from: 7 * 60 + 30, to: 15 * 60 });
    // trabalho nos dias do cargo
    if (stage !== 'child' && n.career) {
      const level = catalog.careers[n.career.id]?.levels[n.career.level];
      if (level && level.days.includes(weekday)) {
        const from = level.startHour * 60;
        stops.push({ kind: 'work', place: 'trabalho', from, to: Math.min(23 * 60 + 30, from + level.hours * 60) });
      }
    }
    // eventos da cidade puxam gente
    for (const ev of CITY_EVENTS) {
      if (!eventOnDay(ev, day)) continue;
      const fit = ev.skill ? ((n.skills[ev.skill] ?? 0) >= 180 ? 1.6 : 0.6) : stage === 'child' && ev.id === 'feira' ? 0.4 : 1;
      if (r(`ev${ev.id}`) >= ev.pull * fit) continue;
      const span = (ev.to - ev.from) * 60;
      const from = ev.from * 60 + Math.floor(r(`evf${ev.id}`) * Math.max(1, span / 3));
      const to = Math.min(ev.to * 60, from + 75 + Math.floor(r(`evt${ev.id}`) * 90));
      if (!overlaps(stops, from, to, 45)) stops.push({ kind: 'event', place: ev.place, from, to, event: ev.id });
    }
    // o cachorro: uma volta de manhã e outra de noite
    if (hasDog(n)) {
      for (const [from, to] of [
        [6 * 60 + 45, 7 * 60 + 15],
        [19 * 60 + 30, 20 * 60],
      ]) {
        if (!overlaps(stops, from, to, 30)) stops.push({ kind: 'dog', place: '', from, to });
      }
    }
    // passeios
    const likes = [
      ...n.traits.flatMap((tr) => LIKES[tr] ?? []),
      ...(stage === 'child' ? KID_LIKES : stage === 'teen' ? TEEN_LIKES : stage === 'elder' ? ELDER_LIKES : DEFAULT_LIKES),
    ];
    const homebody = n.traits.includes('caseiro') || n.traits.includes('bicho_do_mato');
    const weekend = weekday >= 5;
    WINDOWS.forEach(([w0, w1], i) => {
      // criança não sai de noite; quem trabalha passeia mais no fim de semana
      if (stage === 'child' && i === 2) return;
      const chance = (homebody ? 0.18 : 0.42) * (weekend ? 1.35 : 1) * (stage === 'elder' && i < 2 ? 1.3 : 1);
      if (r(`w${i}`) >= chance) return;
      const place = likes[Math.floor(r(`p${i}`) * likes.length)] ?? 'praca';
      const length = 60 + Math.floor(r(`l${i}`) * 4) * 20;
      const from = w0 + Math.floor((r(`s${i}`) * Math.max(0, w1 - w0 - length)) / 10) * 10;
      const to = from + length;
      if (!open(place, from, to) || overlaps(stops, from, to, 45)) return;
      stops.push({ kind: 'place', place, from, to });
    });
  }
  stops.sort((a, b) => a.from - b.from);
  if (plans.size > 6000) plans.clear();
  plans.set(key, stops);
  return stops;
}

// ---------- onde está agora ----------

function placeArea(def: PlaceDef, n: Neighbor, day: number): Pt {
  const r = def.rect;
  const a = hash(n.id * 31 + day, `x${def.id}`);
  const b = hash(n.id * 37 + day, `z${def.id}`);
  return { x: r.x + 1.5 + a * Math.max(0, r.w - 3), z: r.z + 1.5 + b * Math.max(0, r.h - 3) };
}

/** Onde está a pessoa neste minuto: em casa, lá dentro de um prédio, num lugar aberto ou andando pela rua. */
export function whereIs(world: World, catalog: Catalog, n: Neighbor, tick: number): Whereabouts {
  const town = world.town;
  if (!town || !cityOn(world) || !hasRoutine(n)) return { doing: 'home' };
  const day = Math.floor(tick / MINUTES_PER_DAY);
  const minute = tick - day * MINUTES_PER_DAY;
  const home = homePoint(world, n);
  for (const s of dayPlan(world, catalog, n, day)) {
    if (s.kind === 'dog') {
      if (minute < s.from || minute >= s.to) continue;
      // uma volta pela rua de casa: vai até a esquina e volta
      const z = n.home !== undefined ? streetZ(town.lots.find((l) => l.id === town.families.find((f) => f.id === n.home)?.lotId)?.district ?? 0) : home.z;
      const turn = { x: home.x + (hash(n.id, 'side') < 0.5 ? -26 : 26), z };
      const rt = route(town, home, turn);
      const half = (s.to - s.from) / 2;
      const k = minute - s.from < half ? (minute - s.from) / half : 1 - (minute - s.from - half) / half;
      const p = pointAlong(rt.points, rt.length * k);
      const back = minute - s.from >= half;
      return { doing: 'dog', dog: true, point: { x: p.x, z: p.z }, dir: back ? { x: -p.dx, z: -p.dz } : { x: p.dx, z: p.dz } };
    }
    const def = catalog.places?.[s.place];
    if (!def) continue;
    const door = doorOf(catalog, def);
    const rt = route(town, home, door);
    const walk = travelMinutes(rt.length, 'walk');
    if (minute >= s.from - walk && minute < s.from) {
      const p = pointAlong(rt.points, (rt.length * (minute - (s.from - walk))) / walk);
      return { doing: 'walk', place: s.place, point: { x: p.x, z: p.z }, dir: { x: p.dx, z: p.dz } };
    }
    if (minute >= s.from && minute < s.to) {
      const doing: Doing = s.kind === 'work' ? 'work' : s.kind === 'school' ? 'school' : s.kind === 'event' ? 'event' : 'place';
      const out: Whereabouts = { doing, place: s.place };
      if (s.event) out.event = s.event;
      if (def.kind === 'venue') out.point = placeArea(def, n, day);
      return out;
    }
    if (minute >= s.to && minute < s.to + walk) {
      const p = pointAlong(rt.points, rt.length * (1 - (minute - s.to) / walk));
      return { doing: 'walk', place: '', point: { x: p.x, z: p.z }, dir: { x: -p.dx, z: -p.dz } };
    }
  }
  return { doing: 'home' };
}

/** Todo mundo com rotina que não está no lote mostrado agora (para a tela e o celular). */
export function cityPeople(world: World, catalog: Catalog, tick = world.tick): { n: Neighbor; at: Whereabouts }[] {
  if (!cityOn(world)) return [];
  const shown = new Set(world.folks.map((f) => f.id));
  const out: { n: Neighbor; at: Whereabouts }[] = [];
  for (const n of world.neighbors) {
    if (!hasRoutine(n) || shown.has(n.id)) continue;
    out.push({ n, at: whereIs(world, catalog, n, tick) });
  }
  return out;
}

/** Quem da cidade está num lugar agora (lá dentro ou no evento). */
export function peopleAt(world: World, catalog: Catalog, place: string, tick = world.tick): Neighbor[] {
  return cityPeople(world, catalog, tick)
    .filter((x) => x.at.place === place && x.at.doing !== 'walk')
    .map((x) => x.n);
}

/** Dá para chamar a pessoa para sair agora? (acordada, fora do trabalho e da escola) */
export function freeToMeet(world: World, catalog: Catalog, n: Neighbor, tick = world.tick): boolean {
  if (!hasRoutine(n) || stageOf(n) === 'baby' || stageOf(n) === 'child') return false;
  const hour = Math.floor((tick % MINUTES_PER_DAY) / 60);
  if (hour < 7 || hour >= 23) return false;
  const at = whereIs(world, catalog, n, tick);
  return at.doing !== 'work' && at.doing !== 'school';
}
