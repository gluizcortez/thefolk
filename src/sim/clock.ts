export const MINUTES_PER_HOUR = 60;
export const MINUTES_PER_DAY = 24 * MINUTES_PER_HOUR;

/** ticks (minutos de jogo) por segundo real em cada velocidade */
export const TICKS_PER_SECOND = [0, 2, 6, 20] as const;

export interface ClockTime {
  day: number;
  hour: number;
  minute: number;
  /** 0..1 ao longo do dia */
  dayFraction: number;
}

export function clockOf(tick: number): ClockTime {
  const minuteOfDay = ((tick % MINUTES_PER_DAY) + MINUTES_PER_DAY) % MINUTES_PER_DAY;
  return {
    day: Math.floor(tick / MINUTES_PER_DAY) + 1,
    hour: Math.floor(minuteOfDay / MINUTES_PER_HOUR),
    minute: minuteOfDay % MINUTES_PER_HOUR,
    dayFraction: minuteOfDay / MINUTES_PER_DAY,
  };
}

export function formatClock(tick: number): string {
  const c = clockOf(tick);
  return `${String(c.hour).padStart(2, '0')}:${String(c.minute).padStart(2, '0')}`;
}
