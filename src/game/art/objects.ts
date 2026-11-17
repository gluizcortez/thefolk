import type Phaser from 'phaser';
import { PAL, hash, shade } from './palette';
import {
  LIGHT_EAST,
  LIGHT_SOUTH,
  box,
  discEast,
  discSouth,
  faceEast,
  faceSouth,
  floorEllipse,
  frustum,
  iso,
  leaf,
  limb,
  quad,
  shadow,
} from './shapes';

type G = Phaser.GameObjects.Graphics;

/**
 * Desenho de um objeto: recebe o Graphics e o tile de origem (canto norte do
 * objeto). A frente dos móveis fica para o sul ou para o leste, que são as
 * faces que a câmera vê. Para trocar por sprites depois, basta a cena usar
 * outra fonte para o mesmo id de `art` — a simulação não sabe nada disto.
 */
export type ObjectPainter = (g: G, x: number, y: number) => void;

const S = (c: number) => shade(c, LIGHT_SOUTH);
const E = (c: number) => shade(c, LIGHT_EAST);

/** Quatro pés nos cantos de um retângulo. */
function feet(g: G, x0: number, y0: number, x1: number, y1: number, h: number, color: number, w = 0.07): void {
  box(g, x0, y0, x0 + w, y0 + w, 0, h, color);
  box(g, x1 - w, y0, x1, y0 + w, 0, h, color);
  box(g, x0, y1 - w, x0 + w, y1, 0, h, color);
  box(g, x1 - w, y1 - w, x1, y1, 0, h, color);
}

const fridge: ObjectPainter = (g, x, y) => {
  const x0 = x + 0.12;
  const y0 = y + 0.14;
  const x1 = x + 0.88;
  const y1 = y + 0.84;
  shadow(g, x0, y0, x1, y1);
  box(g, x0 + 0.02, y0, x1 - 0.02, y1 - 0.02, 0, 4, PAL.plastic);
  box(g, x0, y0, x1, y1, 4, 68, PAL.enamel);
  // portas (congelador em cima), um pouco à frente do corpo
  const f = y1 + 0.012;
  faceSouth(g, f, x0 + 0.02, x1 - 0.02, 6, 46, S(shade(PAL.enamel, 1.04)));
  faceSouth(g, f, x0 + 0.02, x1 - 0.02, 48, 66, S(shade(PAL.enamel, 1.04)));
  faceSouth(g, f, x0 + 0.02, x1 - 0.02, 46, 48, S(shade(PAL.enamel, 0.7)));
  faceSouth(g, f, x0 + 0.02, x0 + 0.05, 6, 66, 0xffffff, 0.35);
  // puxadores cromados
  faceSouth(g, f + 0.01, x1 - 0.14, x1 - 0.1, 22, 42, PAL.chrome);
  faceSouth(g, f + 0.01, x1 - 0.14, x1 - 0.1, 51, 62, PAL.chrome);
  faceSouth(g, f + 0.01, x1 - 0.11, x1 - 0.1, 22, 42, PAL.chromeDark);
  // ímãs e um bilhete
  faceSouth(g, f + 0.01, x0 + 0.14, x0 + 0.26, 30, 39, PAL.linen);
  faceSouth(g, f + 0.012, x0 + 0.18, x0 + 0.22, 38, 41, PAL.terracotta);
  faceSouth(g, f + 0.012, x0 + 0.34, x0 + 0.39, 34, 38, PAL.mustard);
  // grade lateral
  for (let z = 10; z < 22; z += 3) faceEast(g, x1 + 0.004, y0 + 0.1, y1 - 0.1, z, z + 1, E(shade(PAL.enamel, 0.75)));
};

const bed: ObjectPainter = (g, x, y) => {
  const x0 = x + 0.06;
  const x1 = x + 0.94;
  shadow(g, x0, y + 0.02, x1, y + 1.96);
  // cabeceira com almofada de madeira
  box(g, x0, y + 0.0, x1, y + 0.09, 0, 40, PAL.walnut);
  faceSouth(g, y + 0.094, x0 + 0.08, x1 - 0.08, 22, 36, S(shade(PAL.walnut, 1.25)));
  // estrado e pés
  feet(g, x0, y + 0.09, x1, y + 1.95, 6, shade(PAL.walnut, 0.8));
  box(g, x0, y + 0.09, x1, y + 1.95, 5, 12, PAL.walnut);
  // peseira
  box(g, x0, y + 1.9, x1, y + 1.97, 5, 22, PAL.walnut);
  // colchão e lençol
  box(g, x0 + 0.04, y + 0.1, x1 - 0.04, y + 1.9, 12, 20, PAL.white);
  // travesseiro
  box(g, x0 + 0.16, y + 0.16, x1 - 0.16, y + 0.46, 20, 25, shade(PAL.white, 1.03));
  quad(g, x0 + 0.2, y + 0.2, x1 - 0.2, y + 0.42, 25.2, 0xffffff, 0.5);
  // edredom com dobra e listras
  box(g, x0 + 0.02, y + 0.62, x1 - 0.02, y + 1.91, 12, 22, PAL.fabricBlue);
  quad(g, x0 + 0.02, y + 0.62, x1 - 0.02, y + 0.8, 22.3, PAL.linen);
  for (let i = 0; i < 4; i++) {
    const sy = y + 0.95 + i * 0.24;
    quad(g, x0 + 0.02, sy, x1 - 0.02, sy + 0.05, 22.3, shade(PAL.fabricBlue, 1.25), 0.8);
  }
  faceEast(g, x1 - 0.016, y + 0.62, y + 1.91, 12, 14, E(shade(PAL.fabricBlue, 0.8)));
};

const shower: ObjectPainter = (g, x, y) => {
  const x0 = x + 0.06;
  const y0 = y + 0.06;
  const x1 = x + 0.94;
  const y1 = y + 0.94;
  shadow(g, x0, y0, x1, y1, 0.6);
  box(g, x0, y0, x1, y1, 0, 5, PAL.porcelain);
  quad(g, x0 + 0.08, y0 + 0.08, x1 - 0.08, y1 - 0.08, 5.2, shade(PAL.tileFloorB, 0.95));
  floorEllipse(g, x + 0.5, y + 0.5, 5.4, 0.06, PAL.chromeDark);
  // vidros do fundo
  faceSouth(g, y0 + 0.02, x0, x1, 5, 86, PAL.glass, 0.38);
  faceEast(g, x0 + 0.02, y0, y1, 5, 86, PAL.glass, 0.3);
  faceSouth(g, y0 + 0.021, x0 + 0.1, x0 + 0.2, 10, 80, 0xffffff, 0.22);
  // coluna do chuveiro e ducha
  box(g, x0 + 0.1, y0 + 0.08, x0 + 0.15, y0 + 0.13, 5, 80, PAL.chrome);
  box(g, x0 + 0.1, y0 + 0.08, x0 + 0.38, y0 + 0.13, 78, 81, PAL.chrome);
  floorEllipse(g, x0 + 0.38, y0 + 0.2, 76, 0.13, PAL.chromeDark);
  floorEllipse(g, x0 + 0.38, y0 + 0.2, 77.5, 0.13, PAL.chrome);
  box(g, x0 + 0.09, y0 + 0.07, x0 + 0.17, y0 + 0.15, 38, 44, PAL.chromeDark);
  // perfis de alumínio
  for (const [px, py] of [[x0, y0], [x1 - 0.03, y0], [x0, y1 - 0.03], [x1 - 0.03, y1 - 0.03]]) {
    box(g, px, py, px + 0.03, py + 0.03, 5, 86, PAL.chrome);
  }
  // vidros da frente, quase invisíveis
  faceSouth(g, y1, x0, x1, 5, 86, PAL.glass, 0.13);
  faceEast(g, x1, y0, y1, 5, 86, PAL.glass, 0.1);
  box(g, x0, y1 - 0.03, x1, y1, 84, 86, PAL.chrome);
  box(g, x1 - 0.03, y0, x1, y1, 84, 86, PAL.chrome);
};

const toilet: ObjectPainter = (g, x, y) => {
  shadow(g, x + 0.24, y + 0.1, x + 0.76, y + 0.86, 0.8);
  // caixa acoplada
  box(g, x + 0.24, y + 0.08, x + 0.76, y + 0.3, 16, 40, PAL.porcelain);
  box(g, x + 0.22, y + 0.06, x + 0.78, y + 0.32, 40, 43, PAL.porcelain);
  floorEllipse(g, x + 0.5, y + 0.19, 43.3, 0.05, PAL.chrome);
  // pedestal e bacia
  frustum(g, x + 0.5, y + 0.5, 0.17, 0.2, 0, 10, PAL.porcelain);
  box(g, x + 0.34, y + 0.26, x + 0.66, y + 0.44, 0, 17, PAL.porcelain);
  frustum(g, x + 0.5, y + 0.58, 0.2, 0.3, 8, 17, PAL.porcelain);
  floorEllipse(g, x + 0.5, y + 0.58, 17.5, 0.3, shade(PAL.porcelain, 1.03));
  floorEllipse(g, x + 0.5, y + 0.58, 17.5, 0.22, shade(PAL.porcelain, 0.8));
  floorEllipse(g, x + 0.5, y + 0.6, 17, 0.16, 0xa9cbd6);
};

const sink: ObjectPainter = (g, x, y) => {
  const x0 = x + 0.08;
  const y0 = y + 0.12;
  const x1 = x + 0.7;
  const y1 = y + 0.88;
  shadow(g, x0, y0, x1, y1);
  box(g, x0 + 0.02, y0 + 0.02, x1 - 0.04, y1 - 0.02, 0, 4, PAL.plastic);
  box(g, x0, y0, x1, y1, 4, 30, PAL.trim);
  // portas viradas para o leste
  const f = x1 + 0.006;
  faceEast(g, f, y0 + 0.04, y0 + 0.37, 7, 27, E(shade(PAL.trim, 1.12)));
  faceEast(g, f, y0 + 0.39, y1 - 0.04, 7, 27, E(shade(PAL.trim, 1.12)));
  discEast(g, f + 0.004, y0 + 0.33, 18, 1.4, PAL.chrome);
  discEast(g, f + 0.004, y0 + 0.43, 18, 1.4, PAL.chrome);
  // tampo e cuba
  box(g, x0 - 0.02, y0 - 0.02, x1 + 0.03, y1 + 0.02, 30, 33, 0xd9d6cc);
  floorEllipse(g, x + 0.42, y + 0.5, 33.2, 0.24, shade(PAL.porcelain, 0.82));
  floorEllipse(g, x + 0.42, y + 0.51, 33.2, 0.2, PAL.porcelain);
  floorEllipse(g, x + 0.42, y + 0.52, 33, 0.05, PAL.chromeDark);
  // torneira
  const base = iso(x + 0.16, y + 0.5, 33);
  limb(g, base.x, base.y, base.x, base.y - 9, 2.4, PAL.chrome);
  limb(g, base.x, base.y - 9, base.x + 7, base.y - 6, 2.2, PAL.chrome);
  // sabonete
  box(g, x + 0.2, y + 0.76, x + 0.3, y + 0.82, 33, 35, 0xe7b7a8);
};

const sofa: ObjectPainter = (g, x, y) => {
  const c = PAL.fabricGreen;
  const x0 = x + 0.04;
  const x1 = x + 1.96;
  shadow(g, x0, y + 0.08, x1, y + 0.94);
  feet(g, x0 + 0.04, y + 0.12, x1 - 0.04, y + 0.92, 4, PAL.walnut, 0.06);
  // encosto
  box(g, x0, y + 0.06, x1, y + 0.3, 4, 38, c);
  // base
  box(g, x0, y + 0.3, x1, y + 0.92, 4, 13, shade(c, 0.92));
  // braços arredondados
  for (const ax of [x0, x1 - 0.2]) {
    box(g, ax, y + 0.28, ax + 0.2, y + 0.94, 4, 24, c);
    box(g, ax - 0.01, y + 0.27, ax + 0.21, y + 0.95, 24, 27, shade(c, 1.08));
  }
  // almofadas do assento e do encosto
  for (let i = 0; i < 2; i++) {
    const a = x0 + 0.22 + i * 0.77;
    box(g, a, y + 0.3, a + 0.75, y + 0.93, 13, 19, shade(c, 1.1));
    faceSouth(g, y + 0.932, a + 0.02, a + 0.73, 15.5, 16.5, S(shade(c, 0.8)));
    box(g, a + 0.02, y + 0.26, a + 0.73, y + 0.4, 19, 36, shade(c, 1.04));
  }
  // almofada solta
  box(g, x0 + 0.28, y + 0.4, x0 + 0.5, y + 0.5, 19, 31, PAL.mustard);
  faceSouth(g, y + 0.502, x0 + 0.31, x0 + 0.47, 22, 28, S(shade(PAL.mustard, 1.15)));
};

const tv: ObjectPainter = (g, x, y) => {
  const y0 = y + 0.08;
  const y1 = y + 0.92;
  shadow(g, x + 0.1, y0, x + 0.7, y1);
  // rack de madeira com portas
  box(g, x + 0.1, y0, x + 0.7, y1, 0, 3, shade(PAL.oak, 0.7));
  box(g, x + 0.08, y0 - 0.01, x + 0.72, y1 + 0.01, 3, 24, PAL.oak);
  const f = x + 0.726;
  faceEast(g, f, y0 + 0.04, y + 0.48, 6, 21, E(shade(PAL.oak, 1.14)));
  faceEast(g, f, y + 0.52, y1 - 0.04, 6, 21, E(shade(PAL.oak, 1.14)));
  discEast(g, f + 0.004, y + 0.44, 14, 1.3, PAL.brass);
  discEast(g, f + 0.004, y + 0.56, 14, 1.3, PAL.brass);
  // televisor de tubo
  box(g, x + 0.16, y0 + 0.08, x + 0.6, y1 - 0.08, 24, 58, PAL.plastic);
  box(g, x + 0.6, y0 + 0.06, x + 0.66, y1 - 0.06, 24, 59, shade(PAL.plastic, 1.5));
  const s = x + 0.664;
  faceEast(g, s, y0 + 0.11, y1 - 0.26, 30, 55, 0x16242c);
  faceEast(g, s + 0.002, y0 + 0.13, y1 - 0.28, 32, 53, PAL.screen);
  faceEast(g, s + 0.004, y0 + 0.13, y0 + 0.4, 43, 53, 0xbfe0ee, 0.35);
  faceEast(g, s + 0.004, y0 + 0.15, y0 + 0.2, 34, 51, 0xffffff, 0.18);
  // painel de botões e alto-falante
  for (let z = 32; z < 46; z += 2.5) faceEast(g, s, y1 - 0.22, y1 - 0.1, z, z + 1, 0x55555a);
  discEast(g, s + 0.002, y1 - 0.16, 50.5, 2, PAL.chrome);
  discEast(g, s + 0.002, y1 - 0.12, 27, 0.9, 0xd44a3a);
  // antena
  const top = iso(x + 0.38, y + 0.5, 58);
  limb(g, top.x, top.y, top.x - 10, top.y - 17, 1.2, PAL.chrome);
  limb(g, top.x, top.y, top.x + 11, top.y - 15, 1.2, PAL.chrome);
  floorEllipse(g, x + 0.38, y + 0.5, 58.5, 0.07, PAL.chromeDark);
};

const BOOKS = [0x8c3b34, 0x2f5d6b, 0xc7a14a, 0xe2d9c2, 0x4f6f54, 0x6f4a7a, 0x9a5a34, 0x33415c];

const bookshelf: ObjectPainter = (g, x, y) => {
  const x0 = x + 0.05;
  const x1 = x + 1.95;
  const y0 = y + 0.06;
  const y1 = y + 0.46;
  shadow(g, x0, y0, x1, y1);
  box(g, x0, y0, x1, y1, 0, 76, PAL.oak);
  box(g, x0 - 0.02, y0 - 0.01, x1 + 0.02, y1 + 0.02, 76, 79, shade(PAL.oak, 1.1));
  const f = y1 + 0.004;
  // rodapé e fundo escuro das prateleiras
  faceSouth(g, f, x0 + 0.05, x1 - 0.05, 6, 73, S(shade(PAL.walnut, 0.55)));
  faceSouth(g, f, x + 0.985, x + 1.015, 6, 73, S(PAL.oak));
  for (let shelf = 0; shelf < 4; shelf++) {
    const z0 = 7 + shelf * 17;
    faceSouth(g, f + 0.002, x0 + 0.05, x1 - 0.05, z0 - 2, z0, S(shade(PAL.oak, 1.12)));
    for (let half = 0; half < 2; half++) {
      let bx = x0 + 0.07 + half * 0.95;
      const end = x0 + 0.9 + half * 0.95;
      let i = shelf * 5 + half * 11;
      while (bx < end - 0.06) {
        const r = hash(i, shelf * 3 + half);
        const w = 0.045 + r * 0.035;
        const hgt = 9 + hash(i + 7, shelf) * 5;
        if (r > 0.9 && bx < end - 0.25) {
          // enfeite no lugar de livros
          faceSouth(g, f + 0.004, bx + 0.02, bx + 0.12, z0, z0 + 7, S(PAL.ceramic));
          faceSouth(g, f + 0.004, bx + 0.05, bx + 0.09, z0 + 7, z0 + 10, S(PAL.ceramic));
          bx += 0.2;
        } else if (r < 0.1) {
          bx += 0.06; // vão
        } else {
          const color = BOOKS[Math.floor(hash(i, 91) * BOOKS.length)];
          faceSouth(g, f + 0.004, bx, bx + w, z0, z0 + hgt, S(color));
          faceSouth(g, f + 0.005, bx, bx + w, z0 + hgt - 3, z0 + hgt - 2, S(shade(color, 1.5)), 0.7);
          faceSouth(g, f + 0.005, bx + w - 0.006, bx + w, z0, z0 + hgt, PAL.ink, 0.25);
          bx += w + 0.004;
        }
        i++;
      }
    }
  }
};

const phone: ObjectPainter = (g, x, y) => {
  const cx = x + 0.5;
  const cy = y + 0.5;
  floorEllipse(g, cx + 0.04, cy + 0.04, 0, 0.26, PAL.ink, 0.2);
  // mesinha redonda
  frustum(g, cx, cy, 0.18, 0.12, 0, 3, PAL.walnut);
  frustum(g, cx, cy, 0.04, 0.04, 3, 26, PAL.walnut);
  frustum(g, cx, cy, 0.26, 0.26, 26, 29, PAL.oak, shade(PAL.oak, 1.12));
  // aparelho
  box(g, cx - 0.12, cy - 0.1, cx + 0.12, cy + 0.12, 29, 33, 0x8c2f2a);
  quad(g, cx - 0.07, cy - 0.02, cx + 0.07, cy + 0.09, 33.2, PAL.linen);
  const a = iso(cx - 0.13, cy - 0.06, 36);
  const b = iso(cx + 0.13, cy - 0.06, 36);
  limb(g, a.x, a.y, b.x, b.y, 3.2, 0x7a2824);
  g.fillStyle(0x7a2824, 1);
  g.fillCircle(a.x, a.y + 1, 2.6);
  g.fillCircle(b.x, b.y + 1, 2.6);
  // fio
  g.lineStyle(1, PAL.ink, 0.7);
  const c = iso(cx - 0.12, cy + 0.1, 30);
  g.lineBetween(a.x, a.y + 2, c.x - 3, c.y + 2);
  g.lineBetween(c.x - 3, c.y + 2, c.x, c.y);
};

const speaker: ObjectPainter = (g, x, y) => {
  const x0 = x + 0.22;
  const y0 = y + 0.24;
  const x1 = x + 0.78;
  const y1 = y + 0.76;
  shadow(g, x0, y0, x1, y1);
  feet(g, x0 + 0.03, y0 + 0.03, x1 - 0.03, y1 - 0.03, 3, PAL.plastic, 0.06);
  box(g, x0, y0, x1, y1, 3, 52, PAL.walnut);
  const f = y1 + 0.004;
  faceSouth(g, f, x0 + 0.04, x1 - 0.04, 6, 49, 0x1d1c1e);
  const cx = (x0 + x1) / 2;
  discSouth(g, f + 0.002, cx, 19, 9.5, 0x38373a);
  discSouth(g, f + 0.003, cx, 19, 7.5, 0x242326);
  discSouth(g, f + 0.004, cx, 19, 3, 0x4a494d);
  discSouth(g, f + 0.002, cx, 39, 5, 0x38373a);
  discSouth(g, f + 0.003, cx, 39, 3.2, 0x58575c);
  discSouth(g, f + 0.004, cx - 0.1, 31, 1.2, PAL.brass);
  // toca-fitas em cima
  box(g, x0 + 0.05, y0 + 0.06, x1 - 0.05, y1 - 0.08, 52, 59, 0x3a393d);
  faceSouth(g, y1 - 0.076, x0 + 0.1, x1 - 0.22, 54, 57.5, 0x7ea3a0);
  discSouth(g, y1 - 0.074, x1 - 0.13, 55.5, 1.5, PAL.chrome);
};

const plant: ObjectPainter = (g, x, y) => {
  const cx = x + 0.5;
  const cy = y + 0.5;
  floorEllipse(g, cx + 0.05, cy + 0.05, 0, 0.3, PAL.ink, 0.2);
  frustum(g, cx, cy, 0.2, 0.2, 0, 2, shade(PAL.ceramic, 0.8));
  frustum(g, cx, cy, 0.14, 0.2, 2, 18, PAL.ceramic, 0x3a2a1e);
  frustum(g, cx, cy, 0.21, 0.21, 16, 19, shade(PAL.ceramic, 1.08), 0x3a2a1e);
  const base = iso(cx, cy, 19);
  // tronco e galhos
  limb(g, base.x, base.y, base.x - 1, base.y - 22, 2.4, 0x5a4330);
  limb(g, base.x - 1, base.y - 22, base.x - 9, base.y - 34, 1.6, 0x5a4330);
  limb(g, base.x - 1, base.y - 22, base.x + 8, base.y - 36, 1.6, 0x5a4330);
  limb(g, base.x - 1, base.y - 22, base.x, base.y - 44, 1.6, 0x5a4330);
  const tones = [PAL.leafLo, PAL.leaf, PAL.leafHi];
  const seed = Math.round(x * 7 + y * 13);
  // folhas: as de trás e de baixo mais escuras
  for (let i = 0; i < 26; i++) {
    const r1 = hash(seed + i, 3);
    const r2 = hash(seed, i + 9);
    const ring = i / 26;
    const ang = r1 * Math.PI * 2;
    const rad = 4 + r2 * 13;
    const ox = base.x + Math.cos(ang) * rad * 1.1;
    const oy = base.y - 30 - ring * 16 + Math.sin(ang) * rad * 0.6 + 6;
    const dir = Math.atan2(oy - (base.y - 26), ox - base.x) + (r2 - 0.5) * 0.8;
    leaf(g, ox, oy, dir, 9 + r1 * 6, 5 + r2 * 2.5, tones[Math.min(2, Math.floor(ring * 3 + r2 * 0.6))]);
  }
};

const lamp: ObjectPainter = (g, x, y) => {
  const cx = x + 0.5;
  const cy = y + 0.5;
  floorEllipse(g, cx + 0.04, cy + 0.04, 0, 0.22, PAL.ink, 0.2);
  frustum(g, cx, cy, 0.17, 0.14, 0, 3, PAL.brass);
  frustum(g, cx, cy, 0.025, 0.025, 3, 60, PAL.brass);
  // luz que vaza da cúpula
  const glow = iso(cx, cy, 64);
  g.fillStyle(0xffe2a0, 0.1);
  g.fillCircle(glow.x, glow.y, 34);
  g.fillStyle(0xffe2a0, 0.12);
  g.fillCircle(glow.x, glow.y, 22);
  frustum(g, cx, cy, 0.24, 0.13, 54, 74, PAL.linen, 0xfff3cf);
  frustum(g, cx, cy, 0.245, 0.24, 54, 55.5, shade(PAL.linen, 0.85), 0xfff3cf);
};

const fallback: ObjectPainter = (g, x, y) => {
  shadow(g, x + 0.15, y + 0.15, x + 0.85, y + 0.85);
  box(g, x + 0.15, y + 0.15, x + 0.85, y + 0.85, 0, 28, PAL.paper);
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

/** Altura (em pixels) da superfície em que o folk fica "em cima" do objeto. */
const SEAT_Z: Record<string, number> = { bed: 23, sofa: 19, toilet: 18, shower: 5 };

export function seatHeight(art: string): number {
  return SEAT_Z[art] ?? 0;
}
