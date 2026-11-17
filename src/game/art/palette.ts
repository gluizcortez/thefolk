// Paleta do thefolk: tons naturais e sóbrios, com cara de maquete iluminada.
// Toda cor do jogo sai daqui.
export const PAL = {
  night: 0x141b33,
  bg: 0x23201e,
  ink: 0x1f1b19,
  white: 0xf3f1ea,
  cream: 0xece4d0,
  paper: 0xdccfb4,
  mustard: 0xd9a441,
  terracotta: 0xb9623f,
  teal: 0x3d7f85,

  // construção
  plaster: 0xe6dfcd,
  wallCut: 0x6f675c,
  siding: 0xd0c3a6,
  foundation: 0x8d8b85,
  trim: 0xf0ebdd,
  glass: 0x9fc6d9,
  glassHi: 0xd6ebf2,

  // pisos
  woodFloor: 0xb3875a,
  carpet: 0xb7a486,
  tileFloor: 0xe2e5e1,
  tileFloorB: 0xcdd6d6,
  grass: 0x5d8c45,
  grassHi: 0x6f9e52,
  grassLo: 0x4f7a3b,
  stone: 0xb9b3a6,
  soil: 0x5c4630,

  // materiais
  oak: 0xa9794b,
  walnut: 0x6b4a30,
  pine: 0xc9a06c,
  enamel: 0xeae8df,
  porcelain: 0xf2f2ee,
  chrome: 0xb8c1c6,
  chromeDark: 0x7d868c,
  plastic: 0x2b2a2c,
  screen: 0x4c7f9a,
  brass: 0xb5924c,
  linen: 0xe9dfc6,
  fabricBlue: 0x5a7193,
  fabricRed: 0x9c4a3f,
  fabricGreen: 0x4f6f54,
  ceramic: 0xb5654a,
  leaf: 0x3f7a3a,
  leafHi: 0x5c9a4a,
  leafLo: 0x2f5f30,
} as const;

export const SKIN = [0xf1c9a5, 0xd9a67c, 0xa97850, 0x74492f];
export const HAIR = [0x2a221d, 0x5e3f28, 0x8f4a2b, 0xc9a45c, 0xb9b3aa];
export const SHIRT = [0x3f6f8c, 0xa8483c, 0xd8c690, 0x4f7a55, 0x6f5a86, 0xe6e2d8];
export const PANTS = [0x3a4660, 0x4a3f36, 0x5c6350, 0x77736c];

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

/** Ruído determinístico 0..1 a partir de dois inteiros. */
export function hash(x: number, y: number): number {
  let h = (Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
