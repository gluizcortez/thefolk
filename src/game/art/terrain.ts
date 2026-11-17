import type Phaser from 'phaser';
import type { Grid } from '../../sim';
import { PAL, hash, mix, shade } from './palette';
import { LIGHT_EAST, LIGHT_SOUTH, box, faceEast, faceSouth, iso, quad } from './shapes';

type G = Phaser.GameObjects.Graphics;

export type WallMode = 'cutaway' | 'down' | 'up';

export const WALL_TALL = 96;
const WALL_LOW = 9;
const DOOR_H = 78;
const T = 0.06; // meia espessura da parede, em tiles

const INDOOR = new Set(['wood', 'carpet', 'tile']);

export function isIndoor(grid: Grid, x: number, y: number): boolean {
  if (x < 0 || y < 0 || x >= grid.w || y >= grid.h) return false;
  return INDOOR.has(grid.floor[y * grid.w + x]);
}

// ---------- pisos ----------

function paintGrass(g: G, x: number, y: number): void {
  quad(g, x, y, x + 1, y + 1, 0, mix(PAL.grass, PAL.grassLo, hash(x, y) * 0.35));
  for (let i = 0; i < 9; i++) {
    const r1 = hash(x * 13 + i, y * 7 + 1);
    const r2 = hash(x * 5 + 3, y * 11 + i);
    const r3 = hash(x + i * 17, y + i * 29);
    const p = iso(x + 0.06 + r1 * 0.88, y + 0.06 + r2 * 0.88);
    g.fillStyle(r3 > 0.5 ? PAL.grassHi : PAL.grassLo, 0.55);
    g.fillEllipse(p.x, p.y, 3 + r3 * 6, 1.5 + r3 * 2);
  }
  if (hash(x * 3 + 1, y * 3 + 2) > 0.93) {
    const p = iso(x + 0.5, y + 0.5);
    g.fillStyle(PAL.cream, 0.9);
    g.fillCircle(p.x, p.y, 1.2);
    g.fillCircle(p.x + 4, p.y + 1, 1);
  }
}

function paintWood(g: G, x: number, y: number): void {
  // tábuas correndo no eixo x, com emendas desencontradas
  const planks = 4;
  for (let i = 0; i < planks; i++) {
    const y0 = y + i / planks;
    const y1 = y + (i + 1) / planks;
    const row = y * planks + i;
    const joint = hash(row, 77) * 0.8 + 0.1;
    const left = shade(PAL.woodFloor, 0.9 + hash(x, row) * 0.2);
    const right = shade(PAL.woodFloor, 0.9 + hash(x + 101, row) * 0.2);
    quad(g, x, y0, x + joint, y1, 0, left);
    quad(g, x + joint, y0, x + 1, y1, 0, right);
    const a = iso(x, y1);
    const b = iso(x + 1, y1);
    g.lineStyle(1, shade(PAL.woodFloor, 0.7), 0.55);
    g.lineBetween(a.x, a.y, b.x, b.y);
    const j0 = iso(x + joint, y0);
    const j1 = iso(x + joint, y1);
    g.lineBetween(j0.x, j0.y, j1.x, j1.y);
  }
}

function paintCarpet(g: G, x: number, y: number): void {
  quad(g, x, y, x + 1, y + 1, 0, shade(PAL.carpet, 0.97 + hash(x, y) * 0.06));
  for (let i = 0; i < 14; i++) {
    const p = iso(x + hash(x * 31 + i, y) * 0.96 + 0.02, y + hash(x, y * 17 + i) * 0.96 + 0.02);
    g.fillStyle(i % 2 ? shade(PAL.carpet, 0.86) : shade(PAL.carpet, 1.1), 0.6);
    g.fillRect(p.x, p.y, 2, 1);
  }
}

function paintTile(g: G, x: number, y: number): void {
  for (let i = 0; i < 2; i++) {
    for (let j = 0; j < 2; j++) {
      const alt = (x * 2 + i + y * 2 + j) % 2 === 0;
      const base = alt ? PAL.tileFloor : PAL.tileFloorB;
      quad(g, x + i / 2, y + j / 2, x + (i + 1) / 2, y + (j + 1) / 2, 0, shade(PAL.tileFloorB, 0.8));
      quad(g, x + i / 2 + 0.015, y + j / 2 + 0.015, x + (i + 1) / 2 - 0.015, y + (j + 1) / 2 - 0.015, 0, base);
      // brilho de cerâmica
      quad(g, x + i / 2 + 0.05, y + j / 2 + 0.05, x + i / 2 + 0.2, y + j / 2 + 0.12, 0, 0xffffff, 0.25);
    }
  }
}

export function paintFloor(g: G, grid: Grid): void {
  // bloco de terra sob o terreno
  box(g, 0, 0, grid.w, grid.h, -14, 0, PAL.soil);
  for (let y = 0; y < grid.h; y++) {
    for (let x = 0; x < grid.w; x++) {
      switch (grid.floor[y * grid.w + x]) {
        case 'wood':
          paintWood(g, x, y);
          break;
        case 'carpet':
          paintCarpet(g, x, y);
          break;
        case 'tile':
          paintTile(g, x, y);
          break;
        default:
          paintGrass(g, x, y);
      }
    }
  }
  // sombra suave que as paredes do fundo jogam no piso
  for (const key of Object.keys(grid.edges)) {
    const [xs, ys, side] = key.split(',');
    const x = Number(xs);
    const y = Number(ys);
    if (!isIndoor(grid, x, y)) continue;
    if (side === 'N') {
      quad(g, x, y, x + 1, y + 0.35, 0, PAL.ink, 0.07);
      quad(g, x, y, x + 1, y + 0.14, 0, PAL.ink, 0.09);
    } else {
      quad(g, x, y, x + 0.35, y + 1, 0, PAL.ink, 0.07);
      quad(g, x, y, x + 0.14, y + 1, 0, PAL.ink, 0.09);
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
        const w = hash(x, y + i) * 0.08;
        quad(g, x + 0.14, y + i + 0.1, x + 0.9, y + i + 0.94, 0, PAL.ink, 0.18);
        quad(g, x + 0.12 + w, y + i + 0.08, x + 0.86, y + i + 0.9 - w, 0, shade(PAL.stone, 0.92 + hash(i, x) * 0.14));
      }
    }
  }
}

// ---------- paredes ----------

export interface WallPiece {
  depth: number;
  paint(g: G): void;
}

type Face = (a0: number, a1: number, z0: number, z1: number, color: number, alpha?: number) => void;

/** Acabamento da face visível, conforme o cômodo para onde ela olha. */
function paintFinish(F: Face, style: string, h: number, seed: number): void {
  switch (style) {
    case 'wood': {
      // sala: pintura quente com lambri de madeira
      F(0, 1, 0, h, 0xdccba6);
      F(0, 1, 0, 32, 0xc2a577);
      for (let i = 0; i < 4; i++) F(i / 4 + 0.005, i / 4 + 0.02, 6, 30, shade(0xc2a577, 0.82));
      F(0, 1, 30, 34, PAL.trim);
      F(0, 1, 0, 6, PAL.walnut);
      break;
    }
    case 'carpet': {
      // quarto: papel de parede listrado
      for (let i = 0; i < 8; i++) F(i / 8, (i + 1) / 8, 0, h, i % 2 ? 0xa9b8c8 : 0x9fb0c2);
      for (let i = 0; i < 8; i += 2) F(i / 8 + 0.055, i / 8 + 0.07, 6, h, 0xdfe6ec, 0.5);
      F(0, 1, 0, 7, PAL.trim);
      break;
    }
    case 'tile': {
      // banheiro: meia parede de azulejo
      F(0, 1, 0, h, 0xcfe1db);
      F(0, 1, 0, 50, 0xf0f1ec);
      for (let z = 12; z < 50; z += 12) F(0, 1, z, z + 1, 0xc4cdcc);
      for (let i = 0; i < 4; i++) F(i / 4, i / 4 + 0.012, 0, 50, 0xc4cdcc);
      F(0, 1, 50, 55, PAL.teal);
      break;
    }
    default: {
      // fachada: tábuas horizontais sobre fundação de pedra
      F(0, 1, 0, h, PAL.siding);
      for (let z = 14; z < h; z += 9) F(0, 1, z, z + 1.5, shade(PAL.siding, 0.8));
      F(0, 1, 0, 9, PAL.foundation);
      void seed;
    }
  }
  if (h > 40) {
    F(0, 1, h - 5, h, PAL.trim);
    F(0, 1, 0, 16, PAL.ink, 0.06);
    F(0, 1, h - 20, h - 5, 0xffffff, 0.05);
  }
}

function paintWindow(F: Face, curtain: number): void {
  F(0.16, 0.84, 34, 82, PAL.trim);
  F(0.2, 0.8, 38, 78, PAL.glass);
  F(0.2, 0.8, 60, 78, PAL.glassHi, 0.45);
  F(0.2, 0.5, 38, 50, 0xffffff, 0.12);
  F(0.49, 0.51, 38, 78, PAL.trim);
  F(0.2, 0.8, 57, 59, PAL.trim);
  // cortinas
  F(0.14, 0.27, 34, 86, curtain);
  F(0.73, 0.86, 34, 86, curtain);
  F(0.19, 0.21, 34, 86, shade(curtain, 0.8));
  F(0.79, 0.81, 34, 86, shade(curtain, 0.8));
  F(0.12, 0.88, 85, 88, PAL.walnut);
  // peitoril
  F(0.14, 0.86, 31, 34, shade(PAL.trim, 0.9));
}

const CURTAINS: Record<string, number> = { wood: 0x9c4a3f, carpet: 0xe9dfc6, tile: 0xf0f1ec };

/**
 * Uma peça por borda. No modo "cutaway" só as paredes do fundo (norte e oeste
 * da casa) ficam inteiras; as outras são cortadas para o interior aparecer.
 */
export function wallPieces(grid: Grid, mode: WallMode): WallPiece[] {
  const pieces: WallPiece[] = [];
  for (const key of Object.keys(grid.edges)) {
    const kind = grid.edges[key];
    const [xs, ys, side] = key.split(',');
    const x = Number(xs);
    const y = Number(ys);
    const north = side === 'N';
    const behindIndoor = north ? isIndoor(grid, x, y - 1) : isIndoor(grid, x - 1, y);
    const frontIndoor = isIndoor(grid, x, y);
    const tall = mode === 'up' || (mode === 'cutaway' && !behindIndoor);
    const h = tall ? WALL_TALL : WALL_LOW;
    const style = frontIndoor ? grid.floor[y * grid.w + x] : 'exterior';
    const hasWindow = tall && kind === 'wall' && !behindIndoor && frontIndoor && (x * 2 + y) % 3 === 0;

    // a0..a1 percorre a borda; a face visível fica um fio à frente da caixa
    const F: Face = north
      ? (a0, a1, z0, z1, color, alpha = 1) =>
          faceSouth(g0, y + T + 0.004, x + a0, x + a1, z0, z1, shade(color, LIGHT_SOUTH), alpha)
      : (a0, a1, z0, z1, color, alpha = 1) =>
          faceEast(g0, x + T + 0.004, y + a0, y + a1, z0, z1, shade(color, LIGHT_EAST + 0.08), alpha);
    let g0: G;

    const slab = (a0: number, a1: number, z0: number, z1: number) => {
      if (north) box(g0, x + a0 - (a0 === 0 ? T : 0), y - T, x + a1 + (a1 === 1 ? T : 0), y + T, z0, z1, PAL.plaster);
      else box(g0, x - T, y + a0 - (a0 === 0 ? T : 0), x + T, y + a1 + (a1 === 1 ? T : 0), z0, z1, PAL.plaster);
      if (!tall) {
        // topo escuro: a parede aparece "cortada"
        if (north) quad(g0, x + a0 - (a0 === 0 ? T : 0), y - T, x + a1 + (a1 === 1 ? T : 0), y + T, z1, PAL.wallCut);
        else quad(g0, x - T, y + a0 - (a0 === 0 ? T : 0), x + T, y + a1 + (a1 === 1 ? T : 0), z1, PAL.wallCut);
      }
    };

    pieces.push({
      depth: (x + y) * 10 - 4,
      paint(g) {
        g0 = g;
        if (kind === 'door') {
          const post = 0.12;
          slab(0, post, 0, h);
          slab(1 - post, 1, 0, h);
          // soleira
          if (north) quad(g, x + post, y - T, x + 1 - post, y + T, 0.4, PAL.walnut);
          else quad(g, x - T, y + post, x + T, y + 1 - post, 0.4, PAL.walnut);
          if (tall) {
            slab(post, 1 - post, DOOR_H, h);
            paintFinish((a0, a1, z0, z1, c, al) => {
              F(a0 * post, a1 * post, z0, z1, c, al);
              F(1 - post + a0 * post, 1 - post + a1 * post, z0, z1, c, al);
            }, style, h, x + y);
            F(post, 1 - post, DOOR_H, h, style === 'exterior' ? PAL.siding : PAL.plaster);
            // batente
            F(post - 0.03, post, 0, DOOR_H + 3, PAL.trim);
            F(1 - post, 1 - post + 0.03, 0, DOOR_H + 3, PAL.trim);
            F(post - 0.03, 1 - post + 0.03, DOOR_H, DOOR_H + 3, PAL.trim);
          }
          return;
        }
        slab(0, 1, 0, h);
        if (tall) {
          paintFinish(F, style, h, x + y);
          if (hasWindow) paintWindow(F, CURTAINS[style] ?? PAL.linen);
        } else {
          F(0, 1, 0, h, style === 'exterior' ? PAL.siding : PAL.plaster);
        }
      },
    });
  }
  return pieces;
}
