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
  | 'alarm'
  // bloco 14
  | 'fire'
  | 'ghost'
  | 'burglar'
  | 'grave'
  | 'swim';

/** Plano 2, bloco 2: ícones da HUD (modos, fila, abas). */
export type HudIcon = 'map' | 'gear' | 'walk' | 'work' | 'gift' | 'bell' | 'hand' | 'back' | 'viewRoof' | 'viewUp' | 'viewCut' | 'viewDown' | 'pin';

export type IconId = NeedId | 'sleep' | ThoughtIcon | HudIcon;

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
  // bloco 14: chama, fantasma, gatuno de máscara, lápide e alguém se debatendo na água
  fire: 'M12 2c0.800 3.500 5.500 5.800 5.500 11a5.500 5.500 0 0 1-11 0c0-2.800 1.600-4.200 2.200-6.500 0.900 1 1.600 2.200 1.700 3.800 1-2 1.600-4.800 1.600-8.300z',
  ghost: 'M5 21V10a7 7 0 0 1 14 0v11l-2.300-2-2.300 2-2.400-2-2.300 2-2.300-2zM9.500 8.700a1.300 1.500 0 1 0 0.010 0zM14.500 8.700a1.300 1.500 0 1 0 0.010 0z',
  burglar: 'M12 3.500a8 8 0 1 0 0.010 0zM4.300 10h15.400M4.300 14h15.400M8.500 12h1.200M14.300 12h1.200',
  grave: 'M7 20V9a5 5 0 0 1 10 0v11zM4 20h16M12 10.500v5M10 12.500h4',
  swim: 'M12 4a2 2 0 1 0 0.010 0zM8 11l4-2.500 4 2.500M3 14.500c2-2 4-2 6 0s4 2 6 0 4-2 6 0M3 19c2-2 4-2 6 0s4 2 6 0 4-2 6 0',
  // plano 2, bloco 2
  map: 'M3 6l6-2 6 2 6-2v14l-6 2-6-2-6 2zM9 4v14M15 6v14',
  gear: 'M12 9a3 3 0 1 0 0.010 0zM12 2v3M12 19v3M2 12h3M19 12h3M4.900 4.900l2.100 2.100M17 17l2.100 2.100M4.900 19.100L7 17M17 7l2.100-2.100',
  walk: 'M13 4a1.800 1.800 0 1 0 0.010 0zM10 21l2-6 3 3v3M12 15l-1-5 4 2 3 1M11 10l-3 2-1 3',
  work: 'M3 8h18v11H3zM9 8V5h6v3M3 13h18',
  gift: 'M4 10h16v10H4zM3 7h18v3H3zM12 7v13M12 7c-2-4-6-3-4 0M12 7c2-4 6-3 4 0',
  bell: 'M6 17v-6a6 6 0 0 1 12 0v6l2 2H4zM10 21h4',
  hand: 'M7 12V6a1.500 1.500 0 0 1 3 0v5M10 11V4.500a1.500 1.500 0 0 1 3 0V11M13 11V5.500a1.500 1.500 0 0 1 3 0V12M16 12V8.500a1.500 1.500 0 0 1 3 0V15a6 6 0 0 1-6 6h-1a6 6 0 0 1-5-3l-3-5a1.500 1.500 0 0 1 2.500-1.500L7 13',
  back: 'M10 6l-6 6 6 6M4 12h16',
  // plano 2, bloco 3: modos de vista (telhado, paredes inteiras, recortadas, baixas) e fixar
  viewRoof: 'M2 12L12 4l10 8M5 10v10h14V10M10 20v-5h4v5',
  viewUp: 'M4 5h16M5 5v15h14V5M9 9h2M13 9h2',
  viewCut: 'M4 20V5h9M4 20h16v-6M13 5v3M4 9h9',
  viewDown: 'M3 20h18M4 20v-4h16v4M9 16v4M15 16v4',
  pin: 'M9 3h6l-1 6 3 3H7l3-3zM12 12v9',
};

/** Ícones desenhados só com traço (sem preenchimento). */
export const STROKED = new Set<IconId>(['sleep', 'yes', 'no', 'mood', 'mess', 'miss', 'broom', 'coin', 'skill', 'alarm', 'book', 'burglar', 'grave', 'swim', 'map', 'gear', 'walk', 'work', 'gift', 'bell', 'hand', 'back', 'viewRoof', 'viewUp', 'viewCut', 'viewDown', 'pin']);

export function iconSvg(id: IconId, size = 18): string {
  const stroked = STROKED.has(id);
  const style = stroked
    ? 'fill="none" stroke="currentColor" stroke-width="2.200" stroke-linecap="round" stroke-linejoin="round"'
    : 'fill="currentColor" stroke="currentColor" stroke-width="1.200" stroke-linejoin="round" stroke-linecap="round" fill-rule="evenodd"';
  return `<svg viewBox="0 0 24 24" width="${size}" height="${size}" aria-hidden="true"><path d="${ICON_PATHS[id]}" ${style}/></svg>`;
}

/** Bloco 9: ícones dos assuntos (24x24, só traço). */
export const TOPIC_PATHS: Record<string, string> = {
  // nuvem com chuva
  weather: 'M6 14a4 4 0 0 1 1-7.900A5.500 5.500 0 0 1 17.500 8 3.500 3.500 0 0 1 18 14zM8 17l-1 3M12 17l-1 3M16 17l-1 3',
  // pata
  critters: 'M12 13c3 0 5 3 5 5s-2 2-5 2-5 0-5-2 2-5 5-5zM6 9a1.800 2.300 0 1 0 0.010 0zM10 5a1.800 2.300 0 1 0 0.010 0zM14 5a1.800 2.300 0 1 0 0.010 0zM18 9a1.800 2.300 0 1 0 0.010 0z',
  // panela
  recipes: 'M4 10h16v6a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4zM2 10h2M20 10h2M9 7c-1-2 1-2 0-4M14 7c-1-2 1-2 0-4',
  // bola
  sports: 'M12 3a9 9 0 1 0 0.010 0zM3.500 9.500c4 1 13 1 17 0M3.500 14.500c4-1 13-1 17 0M12 3c-3 4-3 14 0 18M12 3c3 4 3 14 0 18',
  // moeda com cifrão próprio
  money: 'M12 3a9 9 0 1 0 0.010 0zM12 6.500v11M15 9c0-1.500-6-1.500-6 0.500s6 1 6 3-6 2-6 0',
  // lua e estrela
  stars: 'M14 4a8 8 0 1 0 6 12 6.500 6.500 0 0 1-6-12zM18 3l0.800 1.700L20.500 5.500l-1.700 0.800L18 8l-0.800-1.700L15.500 5.500l1.700-0.800z',
  // nota
  music: 'M9 18V5l11-2v13M9 18a3 2.500 0 1 1-0.010 0M20 16a3 2.500 0 1 1-0.010 0',
  // cochicho (dois balões)
  gossip: 'M3 4h11v7H8l-3 3v-3H3zM10 13h11v6h-2v3l-3-3h-6z',
  // engrenagem simples
  gadgets: 'M12 8a4 4 0 1 0 0.010 0zM12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M5 19l2-2M17 7l2-2',
  // dois corações
  romance: 'M9 18L3.500 12.500A3.300 3.300 0 0 1 9 8.300 3.300 3.300 0 0 1 14.500 12.500zM16 11l-3-3a1.900 1.900 0 0 1 3-2.200 1.900 1.900 0 0 1 3 2.200z',
};

export function topicSvg(id: string, size = 18): string {
  const d = TOPIC_PATHS[id] ?? '';
  return `<svg viewBox="0 0 24 24" width="${size}" height="${size}" aria-hidden="true"><path d="${d}" fill="none" stroke="currentColor" stroke-width="2.200" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
}
