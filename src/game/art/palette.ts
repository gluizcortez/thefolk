// Paleta do thefolk: tons terrosos e quentes. Toda cor do jogo sai daqui.
export const PAL = {
  night: 0x1b2340,
  bg: 0x2b2420,
  cream: 0xf4ead8,
  paper: 0xe6d9c0,
  terracotta: 0xc8643c,
  clay: 0xa9502f,
  moss: 0x6f8f4e,
  leaf: 0x4f7a3a,
  mustard: 0xe0a83a,
  teal: 0x2f6f73,
  sky: 0x9fd0cf,
  wood: 0x9a6b44,
  woodDark: 0x6e4a2e,
  ink: 0x2a2320,
  white: 0xfbf7ee,
  steel: 0xb9c2c4,
  wall: 0xead9bd,
  grassA: 0x86a85c,
  grassB: 0x7d9f55,
  floorWoodA: 0xc99a66,
  floorWoodB: 0xc09160,
  floorCarpetA: 0xb9856f,
  floorCarpetB: 0xb27d68,
  floorTileA: 0xcfe0dc,
  floorTileB: 0xb9d0cc,
  stone: 0xcbbfa9,
} as const;

export const SKIN = [0xf0c9a0, 0xd9a273, 0xa8744d, 0x7a4f33];
export const HAIR = [0x2a2320, 0x6e4a2e, 0xc8643c, 0xe0a83a, 0xd8d2c4];
export const SHIRT = [0x2f6f73, 0xc8643c, 0xe0a83a, 0x6f8f4e, 0x7c5c8a];
export const PANTS = [0x3b4a5c, 0x5a4636, 0x44513a, 0x6b6460];

export function shade(color: number, f: number): number {
  const r = Math.min(255, Math.round(((color >> 16) & 0xff) * f));
  const g = Math.min(255, Math.round(((color >> 8) & 0xff) * f));
  const b = Math.min(255, Math.round((color & 0xff) * f));
  return (r << 16) | (g << 8) | b;
}
