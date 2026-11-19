import { MINUTES_PER_DAY, clockOf } from './clock';
import { toCity } from './city';
import type { Place, Pt } from './city';
import { skillLevel } from './skills';
import type { Catalog, Folk, NeedId, PlaceDef, SchoolStyle, Vec, World, WorkStyle } from './types';

// Plano 2, bloco 13: os lugares da cidade. Cada lugar aberto é um lote com
// prédio, móveis e gente (a praça, a biblioteca, a academia, o mercado, a
// loja, a cantina e o café do centro, o cinema, o bar e o parque); os prédios
// fechados (trabalho, escola, prefeitura, hospital, delegacia) não abrem lote:
// quem entra some lá dentro, e o prédio mostra quem está e quanto falta.
// Aqui ficam as regras puras: onde fica, quando abre, quanta gente cabe,
// quanto custa e como o jeito de se portar no trabalho e na escola muda o
// turno.

export type VenueProblem = 'venueClosed' | 'placeFull' | 'funds' | 'noPlace';

export function placesOf(catalog: Catalog): PlaceDef[] {
  return Object.values(catalog.places ?? {});
}

export function placeById(catalog: Catalog, id: string | undefined): PlaceDef | undefined {
  return id ? catalog.places?.[id] : undefined;
}

/** O lugar aberto que o passeio de agora abriu (sem campo, o centro do bloco 16). */
export function outingPlace(world: World, catalog: Catalog): PlaceDef | undefined {
  return placeById(catalog, world.outing?.venue ?? 'centro');
}

/** Onde o canto (0, 0) do lote do lugar cai na cidade (girado = frente para o norte). */
export function placeSpot(def: PlaceDef): Place {
  const r = def.rect;
  return def.flip ? { x: r.x + r.w, z: r.z + r.h, flip: true } : { x: r.x, z: r.z, flip: false };
}

/** Centro do retângulo do lugar. */
export function placeCenter(def: PlaceDef): Pt {
  return { x: def.rect.x + def.rect.w / 2, z: def.rect.z + def.rect.h / 2 };
}

/**
 * Porta do lugar na cidade. Lugar aberto: o tile de saída do lote (da
 * planta). Prédio fechado: o meio da frente, virado para a rua.
 */
export function placeDoor(def: PlaceDef, exit?: Vec): Pt {
  if (exit) return toCity(placeSpot(def), exit.x + 0.5, exit.y + 0.5);
  const r = def.rect;
  return { x: r.x + r.w / 2, z: def.flip ? r.z - 0.5 : r.z + r.h + 0.5 };
}

// ---------- horários ----------

const dayIndex = (tick: number) => Math.floor(tick / MINUTES_PER_DAY);

/** Aberto neste minuto? Quem fecha depois da meia-noite conta o dia de quando abriu. */
export function placeOpen(def: PlaceDef, tick: number): boolean {
  const [open, close] = def.hours;
  const { hour } = clockOf(tick);
  const day = dayIndex(tick);
  const onDay = (d: number) => !def.days || def.days.includes(((d % 7) + 7) % 7);
  if (open === close) return onDay(day);
  if (open < close) return hour >= open && hour < close && onDay(day);
  // passa da meia-noite: de noite conta hoje, de madrugada conta ontem
  if (hour >= open) return onDay(day);
  if (hour < close) return onDay(day - 1);
  return false;
}

/** Minutos até fechar (0 se fechado; um dia inteiro se não fecha). */
export function minutesToShut(def: PlaceDef, tick: number): number {
  if (!placeOpen(def, tick)) return 0;
  for (let m = 1; m <= MINUTES_PER_DAY * 2; m++) if (!placeOpen(def, tick + m)) return m;
  return MINUTES_PER_DAY * 2;
}

/** Minutos até abrir (0 se já está aberto). */
export function minutesToOpen(def: PlaceDef, tick: number): number {
  for (let m = 0; m <= MINUTES_PER_DAY * 8; m += 15) {
    const at = m === 0 ? tick : tick - (tick % 15) + m;
    if (placeOpen(def, at)) return Math.max(0, at - tick);
  }
  return MINUTES_PER_DAY * 8;
}

// ---------- lotação ----------

function hash(a: number, b: string): number {
  let h = 2166136261 ^ a;
  for (let i = 0; i < b.length; i++) h = Math.imul(h ^ b.charCodeAt(i), 16777619);
  return ((h >>> 0) % 1000) / 1000;
}

/**
 * Gente da cidade no lugar a esta hora (sem contar a família em jogo): sobe
 * perto da hora de pico, muda um pouco de um dia para o outro e some com o
 * lugar fechado. Determinístico, sem gastar o sorteio do mundo.
 */
export function crowdOf(def: PlaceDef, tick: number): number {
  if (!placeOpen(def, tick)) return 0;
  const { hour } = clockOf(tick);
  const away = Math.min(Math.abs(hour - def.peak), 24 - Math.abs(hour - def.peak));
  const curve = Math.max(0.15, 1 - away / 7);
  const jitter = 0.75 + hash(dayIndex(tick), def.id) * 0.5;
  // fim de semana enche os lugares de lazer
  const weekend = dayIndex(tick) % 7 >= 5 && def.kind === 'venue' ? 1.25 : 1;
  return Math.min(def.capacity, Math.round(def.capacity * def.busy * curve * jitter * weekend));
}

/** Cabe mais esta turma? */
export function roomFor(def: PlaceDef, tick: number, people: number): boolean {
  return crowdOf(def, tick) + people <= def.capacity;
}

/** Quanto custa a entrada para a turma. */
export function entryCost(def: PlaceDef, people: number): number {
  return def.fee * people;
}

/** Dá para ir a este lugar com tantas pessoas chegando em `arrive`? */
export function placeProblem(world: World, def: PlaceDef | undefined, people: number, arrive: number, travel = 0): VenueProblem | null {
  if (!def) return 'noPlace';
  if (!placeOpen(def, arrive)) return 'venueClosed';
  if (!roomFor(def, arrive, people)) return 'placeFull';
  if (entryCost(def, people) + travel > world.household.funds) return 'funds';
  return null;
}

// ---------- quem está lá dentro ----------

/** Onde está agora alguém da família que sumiu num prédio fechado (id do lugar). */
export function buildingOf(world: World, catalog: Catalog, f: Folk): string | null {
  const away = f.away;
  if (!away) return null;
  const trip = world.trip;
  if (away.trip) {
    if (trip?.kind === 'errand' && trip.place && world.tick >= trip.arrive && world.tick < (trip.leave ?? trip.arrive)) return trip.place;
    return null;
  }
  const want = away.school ? 'school' : 'work';
  return placesOf(catalog).find((p) => p.building === want)?.id ?? null;
}

/** Quem da família está dentro deste prédio, e até quando. */
export function insideOf(world: World, catalog: Catalog, def: PlaceDef): { folk: Folk; until: number }[] {
  const all = [...world.folks, ...(world.outing?.home.folks ?? [])].filter((f) => !f.visit);
  const out: { folk: Folk; until: number }[] = [];
  for (const f of all) {
    if (buildingOf(world, catalog, f) !== def.id) continue;
    const until = f.away?.trip ? (world.trip?.leave ?? world.tick) : (f.away?.until ?? world.tick);
    out.push({ folk: f, until });
  }
  return out;
}

// ---------- jeito de se portar ----------

export const WORK_STYLES: WorkStyle[] = ['steady', 'hard', 'flatter', 'easy'];
export const SCHOOL_STYLES: SchoolStyle[] = ['steady', 'study', 'friends'];

/**
 * Quanto cada necessidade cai a mais (ou a menos) no turno, por jeito.
 * Trabalhar duro cansa e aborrece; ir com calma poupa; puxar o saco conversa
 * o dia todo (o social fica cheio) mas a diversão some.
 */
export const WORK_DRAIN: Record<WorkStyle, Partial<Record<NeedId, number>>> = {
  steady: {},
  hard: { energy: 1.6, fun: 1.5, hunger: 1.2 },
  flatter: { social: 0.3, fun: 1.25 },
  easy: { energy: 0.55, fun: 0.5, comfort: 0.7 },
};

export const SCHOOL_DRAIN: Record<SchoolStyle, Partial<Record<NeedId, number>>> = {
  steady: {},
  study: { fun: 1.4, social: 1.3 },
  friends: { social: 0.2, fun: 0.6 },
};

/**
 * Nota do turno conforme o jeito. Duro: rende mais (e ganha um tanto fixo);
 * puxar o saco: rende pelo papo (lábia) e agrada o chefe; com calma: a nota
 * cai pela metade e perde um pouco.
 */
export function styledShift(style: WorkStyle | undefined, score: number, folk: Folk): number {
  switch (style) {
    case 'hard':
      return (score > 0 ? score * 1.3 : score * 0.8) + 5;
    case 'flatter':
      return score + 1 + skillLevel(folk, 'charisma') * 0.8;
    case 'easy':
      return (score > 0 ? score * 0.5 : score) - 4;
    default:
      return score;
  }
}

/** Amizade com o chefe por turno (puxar o saco agrada; ir com calma desagrada um pouco). */
export function bossFriendship(style: WorkStyle | undefined): number {
  return style === 'flatter' ? 5 : style === 'easy' ? -1 : 0;
}

/** Boletim do dia conforme o jeito na escola. */
export function styledGrade(style: SchoolStyle | undefined, delta: number): number {
  if (style === 'study') return delta + 3;
  if (style === 'friends') return delta - 1.5;
  return delta;
}

/** Necessidades com o desgaste do jeito (multiplica a queda do minuto). */
export function drainScale(f: Folk, id: NeedId): number {
  const s = f.away?.style;
  if (!s) return 1;
  const table = f.away?.school ? SCHOOL_DRAIN[s as SchoolStyle] : WORK_DRAIN[s as WorkStyle];
  return table?.[id] ?? 1;
}

// ---------- roupas pela loja ----------

/** Frete da peça comprada no guarda-roupa que chega em casa (no dia seguinte, a esta hora). */
export const SHIPPING_FEE = 6;
export const SHIPPING_HOUR = 9;

/** Peças que já chegaram (tira da lista de entrega; devolve as ids). */
export function deliverGarments(world: World): string[] {
  const hh = world.household;
  const due = (hh.shipping ?? []).filter((x) => x.due <= world.tick);
  if (due.length === 0) return [];
  hh.shipping = (hh.shipping ?? []).filter((x) => x.due > world.tick);
  for (const x of due) if (!(hh.garments ?? []).includes(x.garment)) (hh.garments ??= []).push(x.garment);
  return due.map((x) => x.garment);
}
