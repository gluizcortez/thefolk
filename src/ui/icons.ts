import type { NeedId } from '../sim';

/** Bloco 6: ícones de balão e de desejo, além das necessidades. */
export type ThoughtIcon =
  | 'yes'
  | 'no'
  | 'mood'
  | 'mess'
  | 'miss'
  | 'heart'
  | 'book'
  | 'phone'
  | 'house'
  | 'broom'
  | 'coin'
  | 'skill'
  | 'spark'
  | 'alarm';

export type IconId = NeedId | 'sleep' | ThoughtIcon;

// Ícones próprios, em SVG gerado por código (24x24, usa a cor do texto).
// Os mesmos desenhos viram balão em 3D (game/art/textures.ts, via Path2D).
export const ICON_PATHS: Record<IconId, string> = {
  hunger: 'M3 12h18a9 8 0 0 1-18 0zM8 9c-1.5-2 1.5-3 0-5M12 9c-1.5-2 1.5-3 0-5M16 9c-1.5-2 1.5-3 0-5',
  energy: 'M20 14.5A8.5 8.5 0 1 1 9.5 4 6.8 6.8 0 0 0 20 14.5z',
  hygiene: 'M12 3c4 5 6.5 8.2 6.5 11.5a6.5 6.5 0 0 1-13 0C5.500 11.2 8 8 12 3z',
  bladder: 'M4 4h13v4H4zM6 8h9l-1 6H7zM9 14h3v6H9zM17 5h3v2h-3z',
  comfort: 'M6 5h12a2 2 0 0 1 2 2v4h1.500v6H19v3h-2v-3H7v3H5v-3H2.500v-6H4V7a2 2 0 0 1 2-2z',
  fun: 'M12 2l2.6 7.400L22 12l-7.400 2.600L12 22l-2.600-7.400L2 12l7.400-2.600z',
  social: 'M4 4h16v12H11l-5 4.500V16H4z',
  ambience: 'M5 19.500C4 10 10 4 20.500 3.500 21 14 15 20.500 5 19.500zM5 19.500L13 11',
  sleep: 'M5 5h7l-7 8h7M13 12h6l-6 7h6',
  // bloco 6
  yes: 'M4 13l5 5L20 6',
  no: 'M6 6l12 12M18 6L6 18',
  mood: 'M12 3a9 9 0 1 0 0.010 0zM8 10h0.500M15.500 10h0.500M8 17c2-2 6-2 8 0',
  mess: 'M4 20h16M6 20c0-4 2-6 6-6s6 2 6 6M9 9c-1-2 1-3 0-5M13 10c-1-2 1-3 0-5M17 9c-1-2 1-3 0-5',
  miss: 'M7 9a3 3 0 1 0 0.010 0zM2.500 20c0-4 2-6 4.500-6s4.500 2 4.500 6zM17 18l-4-4a2.400 2.400 0 0 1 4-2.800 2.400 2.400 0 0 1 4 2.800z',
  heart: 'M12 20L4.500 12.500A4.500 4.500 0 0 1 12 6.800 4.500 4.500 0 0 1 19.500 12.500z',
  book: 'M3 5c3-1 6-1 9 1v14c-3-2-6-2-9-1zM21 5c-3-1-6-1-9 1v14c3-2 6-2 9-1z',
  phone: 'M7 3h4l1.500 5-2.500 1.500a11 11 0 0 0 4.500 4.500L16 11.500l5 1.500v4c0 1-1 2-2 2C10 19 5 14 5 5c0-1 1-2 2-2z',
  house: 'M3 11l9-8 9 8h-3v9h-4.500v-5h-3v5H6v-9z',
  broom: 'M14 3l-3 9M7 12h8l2 9H5zM9 15v5M12 15v5',
  coin: 'M12 3a9 9 0 1 0 0.010 0zM12 6.500v11M9 9.500c0-1.500 6-1.500 6 0s-6 1.500-6 4 6 2.500 6 0',
  skill: 'M4 20V10M10 20V6M16 20v-8M22 20H2M20 3l-4 4-3-2-5 5',
  spark: 'M12 2l2.600 7.400L22 12l-7.400 2.600L12 22l-2.600-7.400L2 12l7.400-2.600z',
  alarm: 'M12 6a7 7 0 1 0 0.010 0zM12 9v4l2.500 2M4 5l3-2.500M20 5l-3-2.500',
};

/** Ícones desenhados só com traço (sem preenchimento). */
export const STROKED = new Set<IconId>(['sleep', 'yes', 'no', 'mood', 'mess', 'miss', 'broom', 'coin', 'skill', 'alarm', 'book']);

export function iconSvg(id: IconId, size = 18): string {
  const stroked = STROKED.has(id);
  const style = stroked
    ? 'fill="none" stroke="currentColor" stroke-width="2.200" stroke-linecap="round" stroke-linejoin="round"'
    : 'fill="currentColor" stroke="currentColor" stroke-width="1.200" stroke-linejoin="round" stroke-linecap="round" fill-rule="evenodd"';
  return `<svg viewBox="0 0 24 24" width="${size}" height="${size}" aria-hidden="true"><path d="${ICON_PATHS[id]}" ${style}/></svg>`;
}
