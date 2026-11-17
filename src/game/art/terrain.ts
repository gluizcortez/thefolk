import type Phaser from 'phaser';
import type { Grid } from '../../sim';
import { PAL, shade } from './palette';
import { box, faceEast, faceSouth, iso, quad } from './shapes';

type G = Phaser.GameObjects.Graphics;

const WALL_TALL = 46;
const WALL_LOW = 7;
const T = 0.07; // meia espessura da parede, em tiles

function hash(x: number, y: number): number {
  let h = (x * 374761393 + y * 668265263) | 0;
  h = (h ^ (h >>> 13)) * 1274126177;
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

const INDOOR = new Set(['wood', 'carpet', 'tile']);

export function isIndoor(grid: Grid, x: number, y: number): boolean {
  if (x < 0 || y < 0 || x >= grid.w || y >= grid.h) return false;
  return INDOOR.has(grid.floor[y * grid.w + x]);
}

export function paintFloor(g: G, grid: Grid): void {
  // moldura de terra sob o terreno
  box(g, 0, 0, grid.w, grid.h, -10, 0, 0x6b5138);
  for (let y = 0; y < grid.h; y++) {
    for (let x = 0; x < grid.w; x++) {
      const kind = grid.floor[y * grid.w + x];
      const alt = (x + y) % 2 === 0;
      switch (kind) {
        case 'wood': {
          quad(g, x, y, x + 1, y + 1, 0, alt ? PAL.floorWoodA : PAL.floorWoodB);
          g.lineStyle(1, shade(PAL.floorWoodB, 0.86), 0.7);
          for (const f of [0.33, 0.66]) {
            const a = iso(x, y + f);
            const b = iso(x + 1, y + f);
            g.lineBetween(a.x, a.y, b.x, b.y);
          }
          break;
        }
        case 'carpet': {
          quad(g, x, y, x + 1, y + 1, 0, alt ? PAL.floorCarpetA : PAL.floorCarpetB);
          const c = iso(x + 0.5, y + 0.5);
          g.fillStyle(shade(PAL.floorCarpetA, 1.12), 0.8);
          g.fillEllipse(c.x, c.y, 8, 4);
          break;
        }
        case 'tile': {
          quad(g, x, y, x + 1, y + 1, 0, alt ? PAL.floorTileA : PAL.floorTileB);
          break;
        }
        default: {
          quad(g, x, y, x + 1, y + 1, 0, alt ? PAL.grassA : PAL.grassB);
          const r = hash(x, y);
          if (r > 0.55) {
            const p = iso(x + 0.2 + hash(y, x) * 0.6, y + 0.2 + r * 0.5);
            g.fillStyle(r > 0.9 ? PAL.mustard : PAL.leaf, r > 0.9 ? 0.9 : 0.6);
            g.fillEllipse(p.x, p.y, r > 0.9 ? 4 : 7, r > 0.9 ? 3 : 3);
          }
        }
      }
    }
  }
}

/** Caminho de pedras do lado de fora de uma porta externa. */
export function paintDoorstep(g: G, grid: Grid): void {
  for (const key of Object.keys(grid.edges)) {
    if (grid.edges[key] !== 'door') continue;
    const [xs, ys, side] = key.split(',');
    const x = Number(xs);
    const y = Number(ys);
    if (side === 'N' && isIndoor(grid, x, y - 1) && !isIndoor(grid, x, y)) {
      for (let i = 0; y + i < grid.h; i++) {
        quad(g, x + 0.2, y + i + 0.15, x + 0.8, y + i + 0.85, 0, i % 2 ? PAL.stone : shade(PAL.stone, 0.93));
      }
    }
  }
}

export interface WallPiece {
  depth: number;
  paint(g: G): void;
}

/**
 * Uma peça por borda. Paredes do fundo (norte e oeste da casa) são altas; as
 * demais ficam baixinhas, em corte, para o interior continuar visível.
 */
export function wallPieces(grid: Grid): WallPiece[] {
  const pieces: WallPiece[] = [];
  for (const key of Object.keys(grid.edges)) {
    const kind = grid.edges[key];
    const [xs, ys, side] = key.split(',');
    const x = Number(xs);
    const y = Number(ys);
    const north = side === 'N';
    const behindIndoor = north ? isIndoor(grid, x, y - 1) : isIndoor(grid, x - 1, y);
    const tall = !behindIndoor;
    const h = tall ? WALL_TALL : WALL_LOW;
    const color = tall ? PAL.wall : shade(PAL.wall, 0.94);
    const window = tall && kind === 'wall' && (x + y) % 3 === 0;
    const depth = (x + y) * 10 - 4;

    pieces.push({
      depth,
      paint(g) {
        // rodapé escuro dá o "peso" da parede
        const x0 = north ? x - T : x - T;
        const y0 = north ? y - T : y - T;
        const x1 = north ? x + 1 + T : x + T;
        const y1 = north ? y + T : y + 1 + T;
        if (kind === 'door') {
          const post = 0.14;
          if (north) {
            box(g, x0, y0, x + post, y1, 0, h, color);
            box(g, x + 1 - post, y0, x1, y1, 0, h, color);
            quad(g, x + post, y0, x + 1 - post, y1, 0.3, PAL.woodDark);
            if (tall) box(g, x + post, y0, x + 1 - post, y1, h - 9, h, color);
          } else {
            box(g, x0, y0, x1, y + post, 0, h, color);
            box(g, x0, y + 1 - post, x1, y1, 0, h, color);
            quad(g, x0, y + post, x1, y + 1 - post, 0.3, PAL.woodDark);
            if (tall) box(g, x0, y + post, x1, y + 1 - post, h - 9, h, color);
          }
          return;
        }
        box(g, x0, y0, x1, y1, 0, h, color);
        if (tall) {
          if (north) faceSouth(g, y1 + 0.005, x0, x1, 0, 5, PAL.terracotta);
          else faceEast(g, x1 + 0.005, y0, y1, 0, 5, shade(PAL.terracotta, 0.82));
        }
        if (window) {
          if (north) {
            faceSouth(g, y1 + 0.006, x + 0.22, x + 0.78, 17, 37, PAL.woodDark);
            faceSouth(g, y1 + 0.007, x + 0.26, x + 0.74, 19, 35, PAL.sky);
            faceSouth(g, y1 + 0.008, x + 0.49, x + 0.51, 19, 35, PAL.woodDark);
          } else {
            faceEast(g, x1 + 0.006, y + 0.22, y + 0.78, 17, 37, PAL.woodDark);
            faceEast(g, x1 + 0.007, y + 0.26, y + 0.74, 19, 35, shade(PAL.sky, 0.88));
            faceEast(g, x1 + 0.008, y + 0.49, y + 0.51, 19, 35, PAL.woodDark);
          }
        }
      },
    });
  }
  return pieces;
}
