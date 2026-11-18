import { MINUTES_PER_DAY } from './clock';
import { SCHOOL_BUS_LEAVES, SCHOOL_CALL } from './kids';
import { skillLevel } from './skills';
import { relationOf } from './relations';
import type { CareerDef, CareerLevel, Catalog, Folk, Job, Needs, UniformDef, VehicleDef, World } from './types';

/** minutos antes do turno em que a carona chega e o folk é chamado */
export const CALL_AHEAD = 60;
/**
 * Bloco 8: a carona espera até a hora do turno e mais isto; depois vai
 * embora, e quem não embarcou perde o turno.
 */
export const RIDE_GRACE = 10;
/** minutos antes de a carona partir em que ela buzina de novo */
export const HONK_AGAIN = 15;
/** amizade a partir da qual alguém conta como amigo da família */
export const FRIEND_AT = 50;
/** desempenho a partir do qual vem a promoção (se as habilidades bastarem) */
export const PROMOTE_AT = 60;
/** desempenho em que o folk é demitido */
export const FIRE_AT = -60;
export const PERFORMANCE_AFTER_PROMOTION = 10;
/** quanto um turno perdido derruba o desempenho */
export const MISSED_PENALTY = 30;
/**
 * Como cada necessidade decai durante o turno: o trabalho tem banheiro,
 * almoço, cadeira e colegas para conversar.
 */
export const AWAY_DECAY: Partial<Needs> = { bladder: 0, hunger: 0.6, hygiene: 0.8, comfort: 0.5, social: 0.5 };

export interface Shift {
  day: number;
  start: number;
  end: number;
}

export function careerOf(catalog: Catalog, job: Job): CareerDef | undefined {
  return catalog.careers[job.careerId];
}

export function levelOfJob(catalog: Catalog, job: Job): CareerLevel | undefined {
  return careerOf(catalog, job)?.levels[job.level];
}

export function weekdayOf(tick: number): number {
  return Math.floor(tick / MINUTES_PER_DAY) % 7;
}

/** O turno de um dia (índice a partir de 0), se for dia de trabalho. */
export function shiftOn(level: CareerLevel, day: number): Shift | null {
  if (!level.days.includes(day % 7)) return null;
  const start = day * MINUTES_PER_DAY + level.startHour * 60;
  return { day, start, end: start + level.hours * 60 };
}

/** Próximo turno que ainda não foi resolvido, a partir de agora. */
export function nextShift(catalog: Catalog, folk: Folk, tick: number): Shift | null {
  const job = folk.job;
  const level = job && levelOfJob(catalog, job);
  if (!job || !level) return null;
  const today = Math.floor(tick / MINUTES_PER_DAY);
  for (let d = today; d < today + 8; d++) {
    const s = shiftOn(level, d);
    if (!s || job.doneDay >= d) continue;
    // se já passou da hora de chamar e ele não foi chamado, esse turno não conta
    if (s.start - CALL_AHEAD <= tick && job.calledDay !== d) continue;
    return s;
  }
  return null;
}

// ---------- bloco 8: amigos da família, carona, uniforme ----------

/**
 * Amigos da família: pessoas de fora da casa de quem algum morador gosta de
 * verdade (amizade a partir de FRIEND_AT). Cada pessoa conta uma vez só,
 * mesmo que seja amiga de mais de um morador.
 */
export function familyFriends(world: World): number[] {
  const residents = world.folks.filter((f) => !f.visit);
  const home = new Set(residents.map((f) => f.id));
  const out = new Set<number>();
  for (const key of Object.keys(world.relations)) {
    const [from, to] = key.split('>').map(Number);
    if (!home.has(from) || home.has(to)) continue;
    if ((relationOf(world, from, to)?.friendship ?? 0) >= FRIEND_AT) out.add(to);
  }
  return [...out].sort((a, b) => a - b);
}

/** Quantos amigos da família faltam para o cargo (0 = basta). */
export function missingFriends(world: World, level: CareerLevel): number {
  return Math.max(0, (level.friends ?? 0) - familyFriends(world).length);
}

/** Faixa de cargos (0: cargos 1 a 4; 1: 5 a 7; 2: 8 a 10) que escolhe carona e uniforme. */
export function tierOfLevel(level: number): number {
  return level < 4 ? 0 : level < 7 ? 1 : 2;
}

export function vehicleOf(catalog: Catalog, job: Job): VehicleDef | undefined {
  const c = careerOf(catalog, job);
  return c?.vehicles?.[Math.min(tierOfLevel(job.level), c.vehicles.length - 1)];
}

export function uniformOf(catalog: Catalog, job: Job): UniformDef | undefined {
  const c = careerOf(catalog, job);
  return c?.uniforms?.[Math.min(tierOfLevel(job.level), c.uniforms.length - 1)];
}

/** A carona parada na calçada esperando este folk. */
export interface Ride {
  folkId: number;
  careerId: string;
  vehicle: VehicleDef;
  /** tick em que chegou e em que vai embora */
  arrived: number;
  leaves: number;
}

/**
 * A carona do folk, se ela está na calçada agora: chega na hora em que ele é
 * chamado e espera até o começo do turno (mais RIDE_GRACE). Some quando ele
 * embarca (o turno fica resolvido).
 */
export function rideFor(catalog: Catalog, folk: Folk, tick: number): Ride | null {
  // bloco 11: o ônibus da escola espera a criança chamada hoje
  if (folk.age === 'child' && folk.kid && !folk.away && !folk.visit) {
    const kid = folk.kid;
    const day = Math.floor(tick / MINUTES_PER_DAY);
    if (kid.calledDay !== day || kid.schoolDay === day) return null;
    const arrived = day * MINUTES_PER_DAY + SCHOOL_CALL;
    const leaves = day * MINUTES_PER_DAY + SCHOOL_BUS_LEAVES;
    if (tick < arrived || tick > leaves) return null;
    return { folkId: folk.id, careerId: 'school', vehicle: SCHOOL_BUS, arrived, leaves };
  }
  const job = folk.job;
  const level = job && levelOfJob(catalog, job);
  if (!job || !level || folk.away || folk.visit) return null;
  if (job.calledDay < 0 || job.doneDay >= job.calledDay) return null;
  const shift = shiftOn(level, job.calledDay);
  const vehicle = vehicleOf(catalog, job);
  if (!shift || !vehicle) return null;
  const arrived = shift.start - CALL_AHEAD;
  const leaves = shift.start + RIDE_GRACE;
  if (tick < arrived || tick > leaves) return null;
  return { folkId: folk.id, careerId: job.careerId, vehicle, arrived, leaves };
}

/** Bloco 11: o ônibus escolar (amarelo com faixa preta e placa no teto). */
export const SCHOOL_BUS: VehicleDef = { kind: 'minibus', color: 0xf2b632, stripe: 0x1f1f24, roof: 'sign' };

/** Todas as caronas na calçada agora. */
export function ridesWaiting(world: World, catalog: Catalog): Ride[] {
  const out: Ride[] = [];
  for (const f of world.folks) {
    const r = rideFor(catalog, f, world.tick);
    if (r) out.push(r);
  }
  return out;
}

/** Faltam habilidades para o cargo? Devolve o que falta (vazio = nada). */
export function missingSkills(folk: Folk, level: CareerLevel): Record<string, number> {
  const out: Record<string, number> = {};
  for (const [id, need] of Object.entries(level.requires)) {
    if (skillLevel(folk, id) < need) out[id] = need;
  }
  return out;
}

/**
 * Nota de um turno: humor (o mais pesado), habilidades da carreira acima do
 * esperado para o cargo e atraso.
 */
export function shiftScore(catalog: Catalog, folk: Folk, job: Job, avgMood: number, late: number): number {
  const career = careerOf(catalog, job);
  const moodTerm = (avgMood - 50) / 2.5;
  let skills = 0;
  for (const id of career?.skills ?? []) skills += skillLevel(folk, id);
  const skillTerm = Math.max(-8, Math.min(8, skills - 2 * job.level));
  const latePenalty = Math.min(25, late / 2);
  return moodTerm + skillTerm - latePenalty;
}

export function newJob(careerId: string): Job {
  return {
    careerId,
    level: 0,
    performance: 0,
    calledDay: -1,
    doneDay: -1,
    shifts: 0,
    raise: 0,
    raisePending: false,
    lastRaiseDay: -99,
  };
}

/** Quanto de dinheiro entra num turno trabalhado (com o aumento conquistado). */
export function payFor(catalog: Catalog, job: Job): number {
  const base = levelOfJob(catalog, job)?.pay ?? 0;
  return Math.round(base * (1 + (job.raise ?? 0)));
}


/** vagas que o jornal traz por dia */
export const ADS_PER_DAY = 4;

/**
 * Bloco 8: as vagas do dia no jornal. Sorteio fixo por dia (não mexe no RNG
 * do mundo): o mesmo dia mostra sempre as mesmas carreiras, sem a atual.
 */
export function adsOfDay(catalog: Catalog, day: number, except?: string): CareerDef[] {
  const list = Object.values(catalog.careers).filter((c) => c.id !== except);
  let seed = (day * 2654435761 + 97) >>> 0;
  const next = () => {
    seed = (seed * 1103515245 + 12345) >>> 0;
    return seed / 4294967296;
  };
  for (let i = list.length - 1; i > 0; i--) {
    const j = Math.floor(next() * (i + 1));
    [list[i], list[j]] = [list[j], list[i]];
  }
  return list.slice(0, ADS_PER_DAY);
}
