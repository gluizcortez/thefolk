export const MINUTES_PER_HOUR = 60;
export const MINUTES_PER_DAY = 24 * MINUTES_PER_HOUR;

/**
 * Ticks (minutos de jogo) por segundo real em cada velocidade: pausa, normal,
 * rápido, muito rápido e pular (plano 2, bloco 1; só com a casa ocupada, veja
 * sim/pace.ts). A tela avança a sim por acumulador, então valem frações.
 */
export const TICKS_PER_SECOND = [0, 1, 3, 10, 60] as const;

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

/**
 * Bloco 3: 0 de dia, 1 no meio da noite. O sol nasce entre 5h e 7h e se põe
 * entre 17h30 e 21h. A tela usa o mesmo número para o céu e as luzes.
 */
export function nightAmount(dayFraction: number): number {
  const h = (((dayFraction % 1) + 1) % 1) * 24;
  if (h >= 7 && h < 17.5) return 0;
  if (h >= 17.5 && h < 21) return (h - 17.5) / 3.5;
  if (h >= 5 && h < 7) return 1 - (h - 5) / 2;
  return 1;
}

/** Quanto de luz do dia entra pelas janelas neste minuto (0 a 1). */
export function daylightAt(tick: number): number {
  return 1 - nightAmount(clockOf(tick).dayFraction);
}
