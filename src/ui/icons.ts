import type { NeedId } from '../sim';

// Ícones próprios, em SVG gerado por código (24x24, usa a cor do texto).
const PATHS: Record<NeedId | 'sleep', string> = {
  hunger: 'M3 12h18a9 8 0 0 1-18 0zM8 9c-1.5-2 1.5-3 0-5M12 9c-1.5-2 1.5-3 0-5M16 9c-1.5-2 1.5-3 0-5',
  energy: 'M20 14.5A8.5 8.5 0 1 1 9.5 4 6.8 6.8 0 0 0 20 14.5z',
  hygiene: 'M12 3c4 5 6.5 8.2 6.5 11.5a6.5 6.5 0 0 1-13 0C5.500 11.2 8 8 12 3z',
  bladder: 'M4 4h13v4H4zM6 8h9l-1 6H7zM9 14h3v6H9zM17 5h3v2h-3z',
  comfort: 'M6 5h12a2 2 0 0 1 2 2v4h1.500v6H19v3h-2v-3H7v3H5v-3H2.500v-6H4V7a2 2 0 0 1 2-2z',
  fun: 'M12 2l2.6 7.400L22 12l-7.400 2.600L12 22l-2.600-7.400L2 12l7.400-2.600z',
  social: 'M4 4h16v12H11l-5 4.500V16H4z',
  ambience: 'M5 19.500C4 10 10 4 20.500 3.500 21 14 15 20.500 5 19.500zM5 19.500L13 11',
  sleep: 'M5 5h7l-7 8h7M13 12h6l-6 7h6',
};

const STROKED = new Set(['sleep']);

export function iconSvg(id: NeedId | 'sleep', size = 18): string {
  const stroked = STROKED.has(id);
  const style = stroked
    ? 'fill="none" stroke="currentColor" stroke-width="2.200" stroke-linecap="round" stroke-linejoin="round"'
    : 'fill="currentColor" stroke="currentColor" stroke-width="1.200" stroke-linejoin="round" stroke-linecap="round" fill-rule="evenodd"';
  return `<svg viewBox="0 0 24 24" width="${size}" height="${size}" aria-hidden="true"><path d="${PATHS[id]}" ${style}/></svg>`;
}
