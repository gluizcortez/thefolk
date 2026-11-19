// Paleta do thefolk: tons ricos e um pouco escuros nos pisos e paredes, com
// móveis e roupas em cores vivas por cima, como nas cenas pré-renderizadas dos
// jogos de PC do fim dos anos 90. Toda cor do jogo sai daqui.
export const PAL = {
  sky: 0x7fb6e6,
  nightSky: 0x0b1026,
  sun: 0xfff3dc,
  moon: 0x8fa3d9,
  ink: 0x1f1b19,
  mustard: 0xf2b632,
  white: 0xf3efe2,
  trim: 0xe9e1cc,
  wallCap: 0xd3c3a0,

  // pisos e terreno
  grass: 0x3f7f2e,
  wood: 0xa9682f,
  carpet: 0x3d55a4,
  tileA: 0xe6e9e1,
  tileB: 0x58a596,
  grout: 0x8d9790,
  terracotta: 0xb4643c,
  road: 0x4c4e55,
  sidewalk: 0xb9b4a6,

  // paredes (cor de base de cada acabamento)
  wallLiving: 0xc9a66c,
  wallBedroom: 0x8eab86,
  wallBath: 0x78bcc0,
  wallKitchen: 0xe3d5ac,
  brick: 0xa5533a,
  mortar: 0xd8cbb4,

  // materiais
  enamel: 0xeee9da,
  porcelain: 0xf4f2ea,
  chrome: 0xc6d0d6,
  plastic: 0x26262b,
  oak: 0xb07a42,
  walnut: 0x6e4427,
  pine: 0xcfa468,
  brass: 0xc29a3e,
  linen: 0xf1e6c6,
  clay: 0xb85a36,
  soil: 0x3d2a1c,
  sofa: 0x2c55a6,
  duvet: 0xe9b93a,
  phone: 0xc8322e,
  cabinet: 0x2f8a86,
  vinyl: 0xc23a32,
  laminate: 0xe7dfc6,
  glass: 0xbfe6f5,
  water: 0x8fcfe6,
  leaf: 0x2f8530,
  bark: 0x5e4129,
  shoe: 0x241f1c,
} as const;

/** Bloco 4: cores que o jogador escolhe na compra (chaves de ObjectDef.colors). */
export const PAINT: Record<string, number> = {
  red: 0xb8352b,
  blue: 0x2c55a6,
  green: 0x3f7a4a,
  mustard: 0xd9a22e,
  plum: 0x6b3a6e,
  brown: 0x7a4a2c,
};

export const SKIN = [0xf0c49c, 0xd9a273, 0xa87148, 0x74482c];
export const HAIR = [0x231c18, 0x5e3a20, 0xa1461f, 0xd6ab4c, 0xbdb6aa];
export const SHIRT = [0x2f7fc4, 0xc9382f, 0xe8b830, 0x3f9455, 0x7d55ad, 0xe9e4d6];
export const PANTS = [0x2c3c60, 0x4d3a2b, 0x55603f, 0x6c6862];
/** bloco 5: roupa de festa, pijama e traje de banho */
export const FORMAL = [0x2b2d33, 0x1f3357, 0x6b2430, 0xd8ccb0];
export const PAJAMA = [0x9cc3e0, 0xe3a5b4, 0xa9d6b2, 0xe8d690];
export const SWIM = [0xd2382c, 0x2a6fc0, 0xe8b830, 0x2a9a8c];

export function shade(color: number, f: number): number {
  const r = Math.min(255, Math.round(((color >> 16) & 0xff) * f));
  const g = Math.min(255, Math.round(((color >> 8) & 0xff) * f));
  const b = Math.min(255, Math.round((color & 0xff) * f));
  return (r << 16) | (g << 8) | b;
}

export function mix(a: number, b: number, k: number): number {
  const ch = (s: number) => Math.round(((a >> s) & 0xff) * (1 - k) + ((b >> s) & 0xff) * k);
  return (ch(16) << 16) | (ch(8) << 8) | ch(0);
}

export function css(color: number, alpha = 1): string {
  return `rgba(${(color >> 16) & 0xff},${(color >> 8) & 0xff},${color & 0xff},${alpha})`;
}

/** Gerador pseudoaleatório com seed, para as texturas saírem sempre iguais. */
export function seeded(seed: number): () => number {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Plano 2, bloco 10: pele, cabelo e olhos em escala contínua (0 a 40). As
 * cores antigas viram pontos da escala (veja OLD_*_TONES em sim/temper.ts) e
 * o que fica entre elas é a mistura das vizinhas.
 */
const TONE_MAX = 40;
function ramp(stops: [number, number][], v: number): number {
  const x = Math.max(0, Math.min(TONE_MAX, v));
  for (let i = 1; i < stops.length; i++) {
    const [p1, c1] = stops[i];
    const [p0, c0] = stops[i - 1];
    if (x <= p1) return mix(c0, c1, p1 === p0 ? 0 : (x - p0) / (p1 - p0));
  }
  return stops[stops.length - 1][1];
}
const SKIN_STOPS: [number, number][] = [
  [0, SKIN[0]],
  [13, SKIN[1]],
  [27, SKIN[2]],
  [40, SKIN[3]],
];
const HAIR_STOPS: [number, number][] = [
  [0, HAIR[0]],
  [10, HAIR[1]],
  [20, HAIR[2]],
  [30, HAIR[3]],
  [40, HAIR[4]],
];
/** escuro, castanho, mel, verde, azul */
const EYE_STOPS: [number, number][] = [
  [0, 0x2a1d16],
  [10, 0x5a3a22],
  [20, 0x9a6a2a],
  [30, 0x4f7a3c],
  [40, 0x3f6fa8],
];
export function skinColor(tone: number): number {
  return ramp(SKIN_STOPS, tone);
}
export function hairColor(tone: number): number {
  return ramp(HAIR_STOPS, tone);
}
export function eyeColor(tone: number): number {
  return ramp(EYE_STOPS, tone);
}
/** Pele escura (corado aparece menos). */
export function darkSkin(tone: number): boolean {
  return tone >= 22;
}
/** Para as amostras do criador: a escala inteira em CSS. */
export function toneGradient(kind: 'skin' | 'hair' | 'eye'): string {
  const stops = kind === 'skin' ? SKIN_STOPS : kind === 'hair' ? HAIR_STOPS : EYE_STOPS;
  return `linear-gradient(90deg, ${stops.map(([p, c]) => `${css(c)} ${(p / TONE_MAX) * 100}%`).join(', ')})`;
}
