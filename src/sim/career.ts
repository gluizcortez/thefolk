import { MINUTES_PER_DAY } from './clock';
import { skillLevel } from './skills';
import type { CareerDef, CareerLevel, Catalog, Folk, Job, Needs } from './types';

/** minutos antes do turno em que o folk é chamado para ir à calçada */
export const CALL_AHEAD = 60;
/** depois de tantos minutos de atraso a condução vai embora sem ele */
export const LATE_LIMIT = 60;
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
    if (s.start - CALL_AHEAD < tick && job.calledDay !== d) continue;
    return s;
  }
  return null;
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
  return { careerId, level: 0, performance: 0, calledDay: -1, doneDay: -1, shifts: 0 };
}

/** Quanto de dinheiro entra num turno trabalhado. */
export function payFor(catalog: Catalog, job: Job): number {
  return levelOfJob(catalog, job)?.pay ?? 0;
}

