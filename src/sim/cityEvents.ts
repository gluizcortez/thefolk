import { MINUTES_PER_DAY, clockOf } from './clock';
import type { World } from './types';

// Plano 2, bloco 14: o calendário da cidade. Quatro coisas acontecem num
// lugar e num horário certos, num ciclo de quatro semanas (o dia 0 do jogo é
// uma segunda-feira da semana 0): a feira de sábado na praça (toda semana),
// o campeonato de xadrez do parque e o concurso de culinária da praça
// (domingos alternados) e a festa junina da praça (no último sábado do ciclo,
// à noite). Regras puras, sem sorteio: a tela e a rotina dos outros perguntam
// aqui o que está acontecendo.

export type CityEventId = 'feira' | 'xadrez' | 'culinaria' | 'arraial';

export interface CityEventDef {
  id: CityEventId;
  /** lugar (data/places.ts) */
  place: string;
  /** dia da semana (0 = segunda) */
  weekday: number;
  /** semanas do ciclo de quatro em que acontece */
  weeks: number[];
  /** horas (to = 24 vai até a meia-noite) */
  from: number;
  to: number;
  /** concurso: habilidade que conta e prêmios do 1º ao 3º lugar */
  skill?: string;
  prizes?: number[];
  /** quanta gente da cidade aparece (fração dos adultos livres) */
  pull: number;
}

export const EVENT_CYCLE_WEEKS = 4;

export const CITY_EVENTS: CityEventDef[] = [
  { id: 'feira', place: 'praca', weekday: 5, weeks: [0, 1, 2, 3], from: 6, to: 12, pull: 0.35 },
  { id: 'xadrez', place: 'parque', weekday: 6, weeks: [0, 2], from: 9, to: 13, skill: 'logic', prizes: [200, 90, 40], pull: 0.2 },
  { id: 'culinaria', place: 'praca', weekday: 6, weeks: [1, 3], from: 10, to: 14, skill: 'cooking', prizes: [180, 80, 35], pull: 0.3 },
  { id: 'arraial', place: 'praca', weekday: 5, weeks: [3], from: 18, to: 24, pull: 0.5 },
];

export function eventDef(id: string | undefined): CityEventDef | undefined {
  return CITY_EVENTS.find((e) => e.id === id);
}

const dayOf = (tick: number) => Math.floor(tick / MINUTES_PER_DAY);

/** O evento acontece neste dia (índice)? */
export function eventOnDay(def: CityEventDef, day: number): boolean {
  if (day < 0) return false;
  return day % 7 === def.weekday && def.weeks.includes(Math.floor(day / 7) % EVENT_CYCLE_WEEKS);
}

/** Tick em que começa e acaba no dia `day`. */
export function eventSpan(def: CityEventDef, day: number): { start: number; end: number } {
  const base = day * MINUTES_PER_DAY;
  return { start: base + def.from * 60, end: base + def.to * 60 };
}

/** O evento está acontecendo neste minuto? */
export function eventLive(def: CityEventDef, tick: number): boolean {
  const day = dayOf(tick);
  if (!eventOnDay(def, day)) return false;
  const { hour } = clockOf(tick);
  return hour >= def.from && hour < def.to;
}

/** Eventos acontecendo agora (num lugar, ou em qualquer um). */
export function liveEvents(tick: number, place?: string): CityEventDef[] {
  return CITY_EVENTS.filter((e) => (!place || e.place === place) && eventLive(e, tick));
}

/** Próximas vezes de cada evento a partir de agora (o de hoje que ainda não acabou conta). */
export function upcomingEvents(tick: number, days = 8): { def: CityEventDef; day: number; start: number; end: number }[] {
  const out: { def: CityEventDef; day: number; start: number; end: number }[] = [];
  const today = dayOf(tick);
  for (let d = today; d < today + days; d++) {
    for (const def of CITY_EVENTS) {
      if (!eventOnDay(def, d)) continue;
      const span = eventSpan(def, d);
      if (span.end <= tick) continue;
      out.push({ def, day: d, ...span });
    }
  }
  return out.sort((a, b) => a.start - b.start);
}

/**
 * Vale a interação ligada a um evento? Só no lugar do evento (o lote aberto
 * no passeio) e na hora dele.
 */
export function eventReady(world: World, id: string): boolean {
  const def = eventDef(id);
  if (!def) return false;
  return world.outing?.venue === def.place && eventLive(def, world.tick);
}

/** Chave de um evento num dia (para o placar dos concursos). */
export function eventKey(id: string, day: number): string {
  return `${id}:${day}`;
}

// ---------- concursos ----------

function hash(a: number, b: string): number {
  let h = 2166136261 ^ a;
  for (let i = 0; i < b.length; i++) h = Math.imul(h ^ b.charCodeAt(i), 16777619);
  return ((h >>> 0) % 1000) / 1000;
}

/** Pontos de quem compete: o nível da habilidade pesa mais, o dia ajuda um pouco. */
export function contestPoints(level: number, luck: number, mood = 60): number {
  return Math.round(level * 12 + luck * 30 + (mood - 50) * 0.15);
}

/** Pontos de um concorrente da cidade (sem gastar o sorteio do mundo: o mesmo dia dá o mesmo resultado). */
export function rivalPoints(level: number, personId: number, key: string): number {
  return contestPoints(level, hash(personId, key));
}

/** Lugar (1, 2, 3...) de quem fez `points` contra os pontos dos outros. */
export function placing(points: number, rivals: number[]): number {
  return 1 + rivals.filter((r) => r > points).length;
}
