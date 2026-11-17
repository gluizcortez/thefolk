// Paleta do thefolk em 3D: cores quentes, vivas e acolhedoras, com paredes
// claras e móveis coloridos. Toda cor do jogo sai daqui.
export const PAL = {
  sky: 0x8ecbf0,
  nightSky: 0x0f1630,
  sun: 0xfff1d6,
  moon: 0x8fa3d9,
  ink: 0x1f1b19,
  mustard: 0xf2b632,
  white: 0xfbf8ee,
  trim: 0xfbf8ee,
  wallCap: 0xe9e4d6,

  // pisos e terreno
  grass: 0x5ea64a,
  wood: 0xc98f55,
  carpet: 0x7e9bd1,
  tileA: 0xf4f6f4,
  tileB: 0x8fd0cc,
  road: 0x5b5d63,
  sidewalk: 0xcfcbc0,

  // paredes (cor de base de cada acabamento)
  wallLiving: 0xf5e6a8,
  wallBedroom: 0xf7dcc8,
  wallBath: 0xcdeee8,
  wallExterior: 0xbfd8ea,
  brick: 0xb5563f,

  // materiais
  enamel: 0xf3f5f0,
  porcelain: 0xfafaf6,
  chrome: 0xc3ccd1,
  plastic: 0x2e2e33,
  oak: 0xb9814a,
  walnut: 0x7a4f2e,
  pine: 0xd9b07a,
  brass: 0xc9a24a,
  linen: 0xf6edd2,
  terracotta: 0xc9653f,
  soil: 0x4a3423,
  sofa: 0x3f6fb5,
  duvet: 0xf2c744,
  phone: 0xd2403a,
  glass: 0xbfe6f5,
  water: 0x9fd6ea,
  leaf: 0x3f9a3c,
  bark: 0x6b4a30,
  shoe: 0x2b2623,
} as const;

export const SKIN = [0xf6cfa8, 0xe0ab7f, 0xb07c53, 0x7d5034];
export const HAIR = [0x2a221d, 0x6b4426, 0xa9502b, 0xe0b85c, 0xc9c3b8];
export const SHIRT = [0x3f8fd0, 0xd9483f, 0xf2c744, 0x4fa864, 0x8a63b8, 0xf3efe4];
export const PANTS = [0x35476b, 0x5a4636, 0x5f6b4a, 0x7c7872];

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
