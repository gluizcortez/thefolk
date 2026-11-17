import type Phaser from 'phaser';
import { HAIR, PAL, PANTS, SHIRT, SKIN, shade } from './palette';
import { limb, poly } from './shapes';

type G = Phaser.GameObjects.Graphics;

export type FolkPose = 'stand' | 'walk' | 'sit' | 'lie' | 'dance' | 'collapsed';

export interface FolkLook {
  skin: number;
  hair: number;
  shirt: number;
  pants: number;
}

export interface FolkDrawState {
  pose: FolkPose;
  /** direção na tela: x > 0 olha para a direita; y < 0 está de costas */
  faceX: number;
  faceY: number;
  /** tempo em segundos, para as animações */
  time: number;
  /** direção na tela quando deitado (da cabeça para os pés) */
  lieX?: number;
  lieY?: number;
}

/** Altura aproximada, em pixels, de um folk em pé (para balões e afins). */
export const FOLK_HEIGHT = 66;

const SHOE = 0x2b2623;

/**
 * Desenha um folk de proporção humana, em vista 3/4, de frente ou de costas.
 * A origem (0,0) é o ponto de apoio: os pés em pé, o assento quando sentado e
 * o centro do corpo quando deitado. Trocar por sprites depois é trocar só
 * esta função.
 */
export function paintFolk(g: G, look: FolkLook, s: FolkDrawState): void {
  const skin = SKIN[look.skin % SKIN.length];
  const hair = HAIR[look.hair % HAIR.length];
  const shirt = SHIRT[look.shirt % SHIRT.length];
  const pants = PANTS[look.pants % PANTS.length];
  g.clear();

  if (s.pose === 'lie' || s.pose === 'collapsed') {
    paintLying(g, skin, hair, shirt, pants, s);
    return;
  }

  const walking = s.pose === 'walk';
  const dancing = s.pose === 'dance';
  const sitting = s.pose === 'sit';
  const front = s.faceY >= 0;
  const side = s.faceX >= 0 ? 1 : -1;
  const phase = s.time * (dancing ? 8 : 10);
  const bob = walking
    ? Math.abs(Math.cos(phase)) * 1.6
    : dancing
      ? Math.abs(Math.sin(phase)) * 3
      : Math.sin(s.time * 1.8) * 0.5;
  const sway = dancing ? Math.sin(phase / 2) * 3 : 0;

  const hipY = sitting ? -4 : -30 - bob;
  const shY = hipY - 21;
  const dirX = side;
  const dirY = front ? 0.5 : -0.5;

  if (!sitting) {
    g.fillStyle(PAL.ink, 0.24);
    g.fillEllipse(0, 0, 26, 10);
  }

  // ---------- pernas ----------
  for (const leg of [-1, 1]) {
    const far = leg === -side;
    const color = far ? shade(pants, 0.85) : pants;
    const hx = leg * 3.4 + sway * 0.5;
    let kx: number, ky: number, fx: number, fy: number;
    if (sitting) {
      kx = hx + dirX * 8;
      ky = hipY + 4;
      fx = kx + dirX * 1.5;
      fy = ky + 16;
    } else {
      const sw = walking ? Math.sin(phase + (leg > 0 ? 0 : Math.PI)) : 0;
      const lift = walking ? Math.max(0, Math.cos(phase + (leg > 0 ? 0 : Math.PI))) * 3 : 0;
      const step = dancing ? Math.sin(phase + (leg > 0 ? 0 : Math.PI)) * 1.5 : 0;
      fx = leg * 3.6 + dirX * sw * 6 + sway * 0.2;
      fy = dirY * sw * 5 - lift - Math.max(0, step);
      kx = (hx + fx) / 2 + dirX * (lift > 0 ? 2.5 : 0.6);
      ky = (hipY + fy) / 2 - 0.5;
    }
    limb(g, hx, hipY, kx, ky, 6.4, color);
    limb(g, kx, ky, fx, fy - 2, 5.2, color);
    g.fillStyle(SHOE, 1);
    g.fillEllipse(fx + dirX * 1.6, fy - 0.5 + (front ? 0.6 : -0.6), 8, 4.4);
  }

  // ---------- tronco ----------
  const tx = sway;
  const torso = [
    { x: tx - 8.5, y: shY + 2 },
    { x: tx - 6, y: shY - 1 },
    { x: tx + 6, y: shY - 1 },
    { x: tx + 8.5, y: shY + 2 },
    { x: tx * 0.5 + 7, y: hipY + 1 },
    { x: tx * 0.5 - 7, y: hipY + 1 },
  ];
  // quadril
  g.fillStyle(pants, 1);
  g.fillRoundedRect(tx * 0.5 - 7, hipY - 2, 14, 7, 3);
  poly(g, torso, shirt);
  // lado direito na sombra
  poly(
    g,
    [
      { x: tx + 3, y: shY - 1 },
      { x: tx + 6, y: shY - 1 },
      { x: tx + 8.5, y: shY + 2 },
      { x: tx * 0.5 + 7, y: hipY + 1 },
      { x: tx * 0.5 + 3.5, y: hipY + 1 },
    ],
    shade(shirt, 0.82),
  );
  // cinto
  g.fillStyle(shade(pants, 0.6), 1);
  g.fillRect(tx * 0.5 - 7, hipY - 1, 14, 1.6);
  if (front) {
    // gola e abotoamento
    poly(g, [{ x: tx - 3, y: shY - 1 }, { x: tx + 3, y: shY - 1 }, { x: tx + side * 0.8, y: shY + 4 }], skin);
    g.lineStyle(1, shade(shirt, 0.7), 0.8);
    g.lineBetween(tx + side * 0.8, shY + 4, tx * 0.5 + side * 0.8, hipY - 1);
  }

  // ---------- braços ----------
  for (const arm of [-1, 1]) {
    const far = arm === -side;
    const sleeve = far ? shade(shirt, 0.8) : shade(shirt, 0.94);
    const flesh = far ? shade(skin, 0.86) : skin;
    const sx = tx + arm * 9;
    const sy = shY + 3;
    let ex: number, ey: number, hx: number, hy: number;
    if (dancing) {
      const up = Math.sin(phase + (arm > 0 ? 0 : Math.PI));
      ex = sx + arm * 5;
      ey = sy + 2 - up * 3;
      hx = ex + arm * 1 + sway * 0.4;
      hy = ey - 10 - up * 4;
    } else if (sitting) {
      ex = sx + arm * 1.5;
      ey = sy + 10;
      hx = ex + dirX * 5;
      hy = ey + 6;
    } else {
      const sw = walking ? Math.sin(phase + (arm > 0 ? Math.PI : 0)) : 0;
      ex = sx + arm * 1.2 + dirX * sw * 2;
      ey = sy + 10;
      hx = sx + arm * 1 + dirX * sw * 5;
      hy = sy + 20 + dirY * sw * 3 - Math.abs(sw) * 1.5;
    }
    limb(g, sx, sy, ex, ey, 5, sleeve);
    limb(g, ex, ey, hx, hy, 4, flesh);
    g.fillStyle(flesh, 1);
    g.fillCircle(hx, hy + 0.5, 2.5);
  }

  // ---------- pescoço e cabeça ----------
  const hx = tx * 1.2 + (front ? side * 0.6 : 0);
  const hy = shY - 10.5;
  g.fillStyle(shade(skin, 0.86), 1);
  g.fillRect(tx - 2.2, shY - 5, 4.4, 5);
  paintHead(g, hx, hy, skin, hair, front, side);
}

function paintHead(g: G, hx: number, hy: number, skin: number, hair: number, front: boolean, side: number): void {
  // orelhas
  g.fillStyle(shade(skin, 0.9), 1);
  g.fillCircle(hx - 6.3, hy + 1, 1.8);
  g.fillCircle(hx + 6.3, hy + 1, 1.8);
  if (!front) {
    g.fillStyle(skin, 1);
    g.fillEllipse(hx, hy, 13, 15);
    g.fillStyle(hair, 1);
    g.fillEllipse(hx, hy - 1.5, 14, 14);
    g.fillStyle(shade(hair, 1.25), 0.5);
    g.fillEllipse(hx - 2.5, hy - 5, 5, 3);
    return;
  }
  g.fillStyle(skin, 1);
  g.fillEllipse(hx, hy, 13, 15);
  // sombra do lado direito do rosto
  g.fillStyle(shade(skin, 0.86), 0.55);
  g.fillEllipse(hx + 3.6, hy + 1, 5, 12);
  // cabelo: calota e costeletas
  g.fillStyle(hair, 1);
  g.fillEllipse(hx, hy - 4.6, 14, 8.4);
  g.fillRect(hx - 7, hy - 4.5, 2.2, 5);
  g.fillRect(hx + 4.8, hy - 4.5, 2.2, 5);
  g.fillEllipse(hx - side * 2.5, hy - 6.4, 9, 5);
  g.fillStyle(shade(hair, 1.3), 0.45);
  g.fillEllipse(hx - 2, hy - 7, 5, 2);
  // rosto
  const fx = hx + side * 1.4;
  g.fillStyle(0xffffff, 0.9);
  g.fillEllipse(fx - 2.5, hy + 0.6, 2.6, 2);
  g.fillEllipse(fx + 2.5, hy + 0.6, 2.6, 2);
  g.fillStyle(0x2a2320, 1);
  g.fillCircle(fx - 2.5 + side * 0.3, hy + 0.7, 0.9);
  g.fillCircle(fx + 2.5 + side * 0.3, hy + 0.7, 0.9);
  g.lineStyle(1, shade(hair, 0.9), 0.9);
  g.lineBetween(fx - 3.8, hy - 1.4, fx - 1.2, hy - 1.6);
  g.lineBetween(fx + 1.2, hy - 1.6, fx + 3.8, hy - 1.4);
  g.lineStyle(1, shade(skin, 0.72), 0.9);
  g.lineBetween(fx + side * 0.4, hy + 1.6, fx + side * 0.9, hy + 3.2);
  g.lineStyle(1.2, shade(skin, 0.55), 0.9);
  g.lineBetween(fx - 1.6, hy + 5, fx + 1.6, hy + 5);
}

function paintLying(g: G, skin: number, hair: number, shirt: number, pants: number, s: FolkDrawState): void {
  const dx = s.lieX ?? 0.89;
  const dy = s.lieY ?? 0.45;
  // perpendicular na tela, para afastar pernas e braços
  const px = -dy;
  const py = dx * 0.5;
  const breathe = Math.sin(s.time * 1.6) * 0.5;
  const at = (k: number, off = 0) => ({ x: dx * k + px * off, y: dy * k + py * off - 4 });

  if (s.pose === 'collapsed') {
    g.fillStyle(PAL.ink, 0.22);
    g.fillEllipse(dx * 2, dy * 2 + 1, 62, 18);
  }
  // pernas
  for (const leg of [-1, 1]) {
    const a = at(4, leg * 3);
    const b = at(28, leg * 3.4);
    limb(g, a.x, a.y, b.x, b.y, 6, leg < 0 ? shade(pants, 0.86) : pants);
    g.fillStyle(SHOE, 1);
    g.fillEllipse(b.x + dx * 2, b.y + dy * 2 - 1.5, 5, 6);
  }
  // braços ao longo do corpo
  for (const arm of [-1, 1]) {
    const a = at(-14, arm * 8.5);
    const b = at(-5, arm * 9);
    const c = at(4, arm * 8.5);
    limb(g, a.x, a.y, b.x, b.y, 4.6, shade(shirt, arm < 0 ? 0.8 : 0.94));
    limb(g, b.x, b.y, c.x, c.y, 3.8, arm < 0 ? shade(skin, 0.86) : skin);
  }
  // tronco
  const t0 = at(-15);
  const t1 = at(4);
  limb(g, t0.x, t0.y, t1.x, t1.y, 15 + breathe, shirt);
  const h0 = at(2);
  const h1 = at(5);
  limb(g, h0.x, h0.y, h1.x, h1.y, 13, pants);
  // cabeça
  const head = at(-25);
  g.fillStyle(skin, 1);
  g.fillEllipse(head.x, head.y - 1, 14, 13);
  g.fillStyle(hair, 1);
  g.fillEllipse(head.x - dx * 3.5, head.y - dy * 3.5 - 2.5, 13, 10);
  // olhos fechados
  g.lineStyle(1, 0x2a2320, 0.8);
  g.lineBetween(head.x + dx * 1 - 2.5, head.y + 0.5, head.x + dx * 1 - 0.5, head.y + 0.8);
  g.lineBetween(head.x + dx * 1 + 1.5, head.y + 1.2, head.x + dx * 1 + 3.5, head.y + 1.5);
}
