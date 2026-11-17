import type Phaser from 'phaser';
import { PAL, shade } from './palette';
import { box, faceEast, faceSouth, floorEllipse, iso, quad } from './shapes';

type G = Phaser.GameObjects.Graphics;

/**
 * Desenho de um objeto: recebe o Graphics e o tile de origem (canto norte do
 * objeto). Para trocar por sprites depois, basta a cena usar outra fonte para
 * o mesmo id de `art` — a simulação não sabe nada disto.
 */
export type ObjectPainter = (g: G, x: number, y: number) => void;

const fridge: ObjectPainter = (g, x, y) => {
  box(g, x + 0.14, y + 0.14, x + 0.86, y + 0.86, 0, 50, PAL.ink);
  box(g, x + 0.12, y + 0.12, x + 0.88, y + 0.88, 0, 28, PAL.sky);
  box(g, x + 0.12, y + 0.12, x + 0.88, y + 0.88, 30, 50, PAL.sky);
  faceSouth(g, y + 0.89, x + 0.22, x + 0.27, 12, 24, PAL.teal);
  faceSouth(g, y + 0.89, x + 0.22, x + 0.27, 34, 44, PAL.teal);
};

const bed: ObjectPainter = (g, x, y) => {
  box(g, x + 0.06, y + 0.0, x + 0.94, y + 0.1, 0, 28, PAL.woodDark);
  box(g, x + 0.06, y + 0.1, x + 0.94, y + 1.94, 0, 9, PAL.wood);
  box(g, x + 0.1, y + 0.12, x + 0.9, y + 1.9, 9, 15, PAL.white);
  box(g, x + 0.24, y + 0.18, x + 0.76, y + 0.5, 15, 19, PAL.cream);
  box(g, x + 0.09, y + 0.7, x + 0.91, y + 1.91, 15, 18, PAL.terracotta);
  quad(g, x + 0.09, y + 0.7, x + 0.91, y + 0.84, 18.2, PAL.mustard);
};

const shower: ObjectPainter = (g, x, y) => {
  box(g, x + 0.08, y + 0.08, x + 0.92, y + 0.92, 0, 4, PAL.white);
  quad(g, x + 0.16, y + 0.16, x + 0.84, y + 0.84, 4.2, PAL.floorTileB);
  // vidros ao fundo e cano com o chuveiro
  box(g, x + 0.08, y + 0.08, x + 0.92, y + 0.12, 4, 54, PAL.sky, 0.45);
  box(g, x + 0.08, y + 0.08, x + 0.12, y + 0.92, 4, 54, PAL.sky, 0.45);
  box(g, x + 0.16, y + 0.16, x + 0.21, y + 0.21, 4, 56, PAL.steel);
  box(g, x + 0.16, y + 0.16, x + 0.5, y + 0.5, 54, 57, PAL.steel);
};

const toilet: ObjectPainter = (g, x, y) => {
  box(g, x + 0.24, y + 0.1, x + 0.76, y + 0.34, 0, 26, PAL.white);
  box(g, x + 0.3, y + 0.34, x + 0.7, y + 0.82, 0, 13, PAL.white);
  quad(g, x + 0.36, y + 0.4, x + 0.64, y + 0.76, 13.3, PAL.sky);
  faceSouth(g, y + 0.345, x + 0.6, x + 0.68, 20, 23, PAL.steel);
};

const sink: ObjectPainter = (g, x, y) => {
  box(g, x + 0.12, y + 0.14, x + 0.72, y + 0.86, 0, 22, PAL.wood);
  box(g, x + 0.1, y + 0.12, x + 0.74, y + 0.88, 22, 25, PAL.white);
  quad(g, x + 0.22, y + 0.26, x + 0.62, y + 0.74, 25.2, PAL.sky);
  box(g, x + 0.14, y + 0.46, x + 0.2, y + 0.54, 25, 33, PAL.steel);
  faceEast(g, x + 0.725, y + 0.3, y + 0.34, 8, 16, PAL.woodDark);
  faceEast(g, x + 0.725, y + 0.66, y + 0.7, 8, 16, PAL.woodDark);
};

const sofa: ObjectPainter = (g, x, y) => {
  box(g, x + 0.05, y + 0.08, x + 1.95, y + 0.3, 0, 28, PAL.moss);
  box(g, x + 0.05, y + 0.3, x + 1.95, y + 0.92, 0, 11, shade(PAL.moss, 0.9));
  box(g, x + 0.24, y + 0.3, x + 0.99, y + 0.9, 11, 15, shade(PAL.moss, 1.12));
  box(g, x + 1.01, y + 0.3, x + 1.76, y + 0.9, 11, 15, shade(PAL.moss, 1.12));
  box(g, x + 0.05, y + 0.3, x + 0.22, y + 0.92, 11, 20, PAL.moss);
  box(g, x + 1.78, y + 0.3, x + 1.95, y + 0.92, 11, 20, PAL.moss);
  box(g, x + 1.3, y + 0.32, x + 1.6, y + 0.5, 15, 23, PAL.mustard);
};

const tv: ObjectPainter = (g, x, y) => {
  box(g, x + 0.12, y + 0.1, x + 0.62, y + 0.9, 0, 13, PAL.wood);
  faceEast(g, x + 0.625, y + 0.18, y + 0.48, 3, 10, PAL.woodDark);
  faceEast(g, x + 0.625, y + 0.52, y + 0.82, 3, 10, PAL.woodDark);
  box(g, x + 0.3, y + 0.14, x + 0.46, y + 0.86, 13, 42, PAL.ink);
  faceEast(g, x + 0.465, y + 0.19, y + 0.81, 17, 38, PAL.teal);
  faceEast(g, x + 0.47, y + 0.19, y + 0.5, 26, 38, PAL.sky, 0.55);
};

const bookshelf: ObjectPainter = (g, x, y) => {
  box(g, x + 0.06, y + 0.08, x + 1.94, y + 0.5, 0, 50, PAL.wood);
  const spines = [PAL.terracotta, PAL.teal, PAL.mustard, PAL.cream, PAL.moss, PAL.clay];
  for (let shelf = 0; shelf < 3; shelf++) {
    const z0 = 4 + shelf * 15;
    faceSouth(g, y + 0.505, x + 0.12, x + 1.88, z0, z0 + 13, PAL.woodDark);
    let bx = x + 0.15;
    let i = shelf * 2;
    while (bx < x + 1.8) {
      const w = 0.07 + ((i * 7) % 3) * 0.02;
      const hgt = 8 + ((i * 5) % 4);
      if ((i + shelf) % 6 !== 5) {
        faceSouth(g, y + 0.51, bx, bx + w, z0, z0 + hgt, spines[i % spines.length]);
      }
      bx += w + 0.012;
      i++;
    }
  }
};

const phone: ObjectPainter = (g, x, y) => {
  box(g, x + 0.3, y + 0.3, x + 0.7, y + 0.7, 0, 20, PAL.wood);
  box(g, x + 0.26, y + 0.26, x + 0.74, y + 0.74, 20, 22, PAL.woodDark);
  box(g, x + 0.36, y + 0.38, x + 0.64, y + 0.64, 22, 26, PAL.terracotta);
  box(g, x + 0.33, y + 0.42, x + 0.67, y + 0.52, 27, 30, PAL.clay);
};

const speaker: ObjectPainter = (g, x, y) => {
  box(g, x + 0.24, y + 0.24, x + 0.76, y + 0.76, 0, 38, PAL.ink);
  const big = iso(x + 0.5, y + 0.765, 14);
  const small = iso(x + 0.5, y + 0.765, 29);
  g.fillStyle(PAL.mustard, 1);
  g.fillEllipse(big.x, big.y, 13, 15);
  g.fillEllipse(small.x, small.y, 7, 8);
  g.fillStyle(PAL.ink, 1);
  g.fillEllipse(big.x, big.y, 6, 7);
};

const plant: ObjectPainter = (g, x, y) => {
  floorEllipse(g, x + 0.5, y + 0.5, 0, 0.3, PAL.ink, 0.15);
  box(g, x + 0.36, y + 0.36, x + 0.64, y + 0.64, 0, 11, PAL.terracotta);
  box(g, x + 0.33, y + 0.33, x + 0.67, y + 0.67, 11, 14, PAL.clay);
  const c = iso(x + 0.5, y + 0.5, 0);
  const leaves: [number, number, number, number, number][] = [
    [-9, -28, 13, 18, PAL.leaf],
    [9, -30, 13, 20, PAL.leaf],
    [0, -40, 14, 22, PAL.moss],
    [-5, -22, 10, 12, PAL.moss],
    [6, -21, 10, 12, shade(PAL.moss, 1.12)],
  ];
  for (const [dx, dy, w, h, color] of leaves) {
    g.fillStyle(color, 1);
    g.fillEllipse(c.x + dx, c.y + dy, w, h);
  }
};

const lamp: ObjectPainter = (g, x, y) => {
  floorEllipse(g, x + 0.5, y + 0.5, 0, 0.28, PAL.woodDark);
  box(g, x + 0.47, y + 0.47, x + 0.53, y + 0.53, 0, 38, PAL.woodDark);
  const glow = iso(x + 0.5, y + 0.5, 42);
  g.fillStyle(PAL.mustard, 0.16);
  g.fillCircle(glow.x, glow.y, 24);
  box(g, x + 0.33, y + 0.33, x + 0.67, y + 0.67, 34, 50, PAL.mustard);
  quad(g, x + 0.38, y + 0.38, x + 0.62, y + 0.62, 50.2, PAL.cream);
};

const fallback: ObjectPainter = (g, x, y) => {
  box(g, x + 0.15, y + 0.15, x + 0.85, y + 0.85, 0, 24, PAL.paper);
};

const PAINTERS: Record<string, ObjectPainter> = {
  fridge,
  bed,
  shower,
  toilet,
  sink,
  sofa,
  tv,
  bookshelf,
  phone,
  speaker,
  plant,
  lamp,
};

export function painterFor(art: string): ObjectPainter {
  return PAINTERS[art] ?? fallback;
}

/** Altura (em pixels) em que um folk fica quando está "em cima" do objeto. */
const SEAT_Z: Record<string, number> = { bed: 15, sofa: 8, toilet: 6, shower: 4 };

export function seatHeight(art: string): number {
  return SEAT_Z[art] ?? 0;
}
