import type Phaser from 'phaser';
import { PAL, shade } from './palette';

export const TILE_W = 64;
export const TILE_H = 32;
/** fator de luz das faces: topo, face sul (clara) e face leste (sombra) */
export const LIGHT_SOUTH = 0.86;
export const LIGHT_EAST = 0.68;

type G = Phaser.GameObjects.Graphics;
type P = { x: number; y: number };

/** Projeção isométrica: tile (x,y) e altura z em pixels -> tela. */
export function iso(x: number, y: number, z = 0): P {
  return { x: ((x - y) * TILE_W) / 2, y: ((x + y) * TILE_H) / 2 - z };
}

/** Inverso da projeção no chão (z = 0). */
export function unIso(sx: number, sy: number): P {
  const a = sx / (TILE_W / 2);
  const b = sy / (TILE_H / 2);
  return { x: (a + b) / 2, y: (b - a) / 2 };
}

export function poly(g: G, pts: P[], color: number, alpha = 1): void {
  g.fillStyle(color, alpha);
  g.fillPoints(pts as Phaser.Types.Math.Vector2Like[], true);
}

/** Losango no chão (ou a uma altura z). */
export function quad(
  g: G,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  z: number,
  color: number,
  alpha = 1,
): void {
  poly(g, [iso(x0, y0, z), iso(x1, y0, z), iso(x1, y1, z), iso(x0, y1, z)], color, alpha);
}

/** Retângulo no plano y = const (face virada para o sul, visível). */
export function faceSouth(
  g: G,
  y: number,
  x0: number,
  x1: number,
  z0: number,
  z1: number,
  color: number,
  alpha = 1,
): void {
  poly(g, [iso(x0, y, z1), iso(x1, y, z1), iso(x1, y, z0), iso(x0, y, z0)], color, alpha);
}

/** Retângulo no plano x = const (face virada para o leste, visível). */
export function faceEast(
  g: G,
  x: number,
  y0: number,
  y1: number,
  z0: number,
  z1: number,
  color: number,
  alpha = 1,
): void {
  poly(g, [iso(x, y0, z1), iso(x, y1, z1), iso(x, y1, z0), iso(x, y0, z0)], color, alpha);
}

/**
 * Caixa isométrica sombreada: topo claro, face sul média, face leste escura,
 * com escurecimento perto da base e um filete de luz nas quinas de cima.
 */
export function box(
  g: G,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  z0: number,
  z1: number,
  color: number,
  alpha = 1,
): void {
  faceSouth(g, y1, x0, x1, z0, z1, shade(color, LIGHT_SOUTH), alpha);
  faceEast(g, x1, y0, y1, z0, z1, shade(color, LIGHT_EAST), alpha);
  quad(g, x0, y0, x1, y1, z1, color, alpha);
  const h = z1 - z0;
  if (alpha === 1 && h > 8) {
    const zb = z0 + h * 0.4;
    faceSouth(g, y1, x0, x1, z0, zb, PAL.ink, 0.06);
    faceEast(g, x1, y0, y1, z0, zb, PAL.ink, 0.07);
    faceSouth(g, y1, x0, x1, z0, z0 + Math.min(4, h * 0.15), PAL.ink, 0.08);
    faceEast(g, x1, y0, y1, z0, z0 + Math.min(4, h * 0.15), PAL.ink, 0.08);
    const a = iso(x0, y1, z1);
    const b = iso(x1, y1, z1);
    const c = iso(x1, y0, z1);
    g.lineStyle(1, 0xffffff, 0.28);
    g.lineBetween(a.x, a.y, b.x, b.y);
    g.lineStyle(1, 0xffffff, 0.14);
    g.lineBetween(b.x, b.y, c.x, c.y);
  }
}

/** Sombra de contato no chão sob um objeto. */
export function shadow(g: G, x0: number, y0: number, x1: number, y1: number, strength = 1): void {
  quad(g, x0 - 0.05, y0 - 0.05, x1 + 0.12, y1 + 0.12, 0, PAL.ink, 0.1 * strength);
  quad(g, x0, y0, x1 + 0.06, y1 + 0.06, 0, PAL.ink, 0.12 * strength);
}

/** Elipse no chão centrada no tile (cx, cy); raio em tiles. */
export function floorEllipse(
  g: G,
  cx: number,
  cy: number,
  z: number,
  r: number,
  color: number,
  alpha = 1,
): void {
  const p = iso(cx, cy, z);
  g.fillStyle(color, alpha);
  g.fillEllipse(p.x, p.y, r * 90.5, r * 45.25);
}

/** Tronco de cone vertical (r0 embaixo, r1 em cima); cilindro se r0 = r1. */
export function frustum(
  g: G,
  cx: number,
  cy: number,
  r0: number,
  r1: number,
  z0: number,
  z1: number,
  color: number,
  topColor?: number,
): void {
  const b = iso(cx, cy, z0);
  const t = iso(cx, cy, z1);
  const rb = r0 * 45.25;
  const rt = r1 * 45.25;
  g.fillStyle(shade(color, 0.84), 1);
  g.fillEllipse(b.x, b.y, rb * 2, rb);
  poly(g, [{ x: t.x - rt, y: t.y }, { x: t.x + rt, y: t.y }, { x: b.x + rb, y: b.y }, { x: b.x - rb, y: b.y }], shade(color, 0.84));
  // lado direito na sombra, filete de brilho à esquerda
  poly(
    g,
    [{ x: t.x + rt * 0.25, y: t.y }, { x: t.x + rt, y: t.y }, { x: b.x + rb, y: b.y }, { x: b.x + rb * 0.25, y: b.y + rb * 0.48 }],
    shade(color, 0.66),
  );
  poly(
    g,
    [{ x: t.x - rt * 0.7, y: t.y }, { x: t.x - rt * 0.4, y: t.y }, { x: b.x - rb * 0.4, y: b.y + rb * 0.45 }, { x: b.x - rb * 0.7, y: b.y + rb * 0.35 }],
    0xffffff,
    0.16,
  );
  g.fillStyle(topColor ?? color, 1);
  g.fillEllipse(t.x, t.y, rt * 2, rt);
}

/** Disco em uma face sul (plano y = const): centro em (cx, cz), raio em px. */
export function discSouth(g: G, y: number, cx: number, cz: number, r: number, color: number, alpha = 1): void {
  const pts: P[] = [];
  for (let i = 0; i < 18; i++) {
    const a = (i / 18) * Math.PI * 2;
    pts.push(iso(cx + (Math.cos(a) * r) / 36, y, cz + Math.sin(a) * r));
  }
  poly(g, pts, color, alpha);
}

/** Disco em uma face leste (plano x = const). */
export function discEast(g: G, x: number, cy: number, cz: number, r: number, color: number, alpha = 1): void {
  const pts: P[] = [];
  for (let i = 0; i < 18; i++) {
    const a = (i / 18) * Math.PI * 2;
    pts.push(iso(x, cy + (Math.cos(a) * r) / 36, cz + Math.sin(a) * r));
  }
  poly(g, pts, color, alpha);
}

/** Folha (forma de amêndoa) em coordenadas de tela. */
export function leaf(g: G, x: number, y: number, angle: number, len: number, width: number, color: number): void {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const pts: P[] = [];
  const steps = 6;
  for (let i = 0; i <= steps; i++) {
    const k = i / steps;
    const w = Math.sin(k * Math.PI) * width * 0.5;
    pts.push({ x: x + cos * len * k - sin * w, y: y + sin * len * k + cos * w });
  }
  for (let i = steps; i >= 0; i--) {
    const k = i / steps;
    const w = Math.sin(k * Math.PI) * width * 0.5;
    pts.push({ x: x + cos * len * k + sin * w, y: y + sin * len * k - cos * w });
  }
  poly(g, pts, color);
}

/** Traço grosso com pontas redondas (membros do folk, canos, hastes). */
export function limb(g: G, x0: number, y0: number, x1: number, y1: number, w: number, color: number): void {
  g.lineStyle(w, color, 1);
  g.lineBetween(x0, y0, x1, y1);
  g.fillStyle(color, 1);
  g.fillCircle(x0, y0, w / 2);
  g.fillCircle(x1, y1, w / 2);
}
