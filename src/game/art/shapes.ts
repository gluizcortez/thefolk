import type Phaser from 'phaser';
import { shade } from './palette';

export const TILE_W = 64;
export const TILE_H = 32;

type G = Phaser.GameObjects.Graphics;

/** Projeção isométrica: tile (x,y) e altura z em pixels -> tela. */
export function iso(x: number, y: number, z = 0): { x: number; y: number } {
  return { x: ((x - y) * TILE_W) / 2, y: ((x + y) * TILE_H) / 2 - z };
}

/** Inverso da projeção no chão (z = 0). */
export function unIso(sx: number, sy: number): { x: number; y: number } {
  const a = sx / (TILE_W / 2);
  const b = sy / (TILE_H / 2);
  return { x: (a + b) / 2, y: (b - a) / 2 };
}

function poly(g: G, pts: { x: number; y: number }[], color: number, alpha = 1): void {
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

/** Caixa isométrica com três tons (topo, face sul, face leste). */
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
  faceSouth(g, y1, x0, x1, z0, z1, shade(color, 0.84), alpha);
  faceEast(g, x1, y0, y1, z0, z1, shade(color, 0.68), alpha);
  quad(g, x0, y0, x1, y1, z1, color, alpha);
}

/** Elipse "deitada" no chão, centrada no tile (cx, cy). */
export function floorEllipse(
  g: G,
  cx: number,
  cy: number,
  z: number,
  radiusTiles: number,
  color: number,
  alpha = 1,
): void {
  const p = iso(cx, cy, z);
  g.fillStyle(color, alpha);
  g.fillEllipse(p.x, p.y, radiusTiles * TILE_W, radiusTiles * TILE_H);
}
