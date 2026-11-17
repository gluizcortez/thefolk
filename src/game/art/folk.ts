import type Phaser from 'phaser';
import { HAIR, PAL, PANTS, SHIRT, SKIN, shade } from './palette';

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
  /** direção da cama na tela quando deitado (da cabeça para os pés) */
  lieX?: number;
  lieY?: number;
}

/**
 * Desenha um folk com os pés em (0,0). Corpo de "feijão", sem pescoço, com um
 * topete — a silhueta própria do thefolk. Trocar por sprite depois é trocar
 * só esta função.
 */
export function paintFolk(g: G, look: FolkLook, s: FolkDrawState): void {
  const skin = SKIN[look.skin % SKIN.length];
  const hair = HAIR[look.hair % HAIR.length];
  const shirt = SHIRT[look.shirt % SHIRT.length];
  const pants = PANTS[look.pants % PANTS.length];
  g.clear();

  if (s.pose === 'lie' || s.pose === 'collapsed') {
    const dx = s.lieX ?? 0.89;
    const dy = s.lieY ?? 0.45;
    const breathe = Math.sin(s.time * 1.6) * 0.6;
    const seg = (a: number, b: number, w: number, color: number) => {
      g.lineStyle(w, color, 1);
      g.lineBetween(dx * a, dy * a - 4, dx * b, dy * b - 4);
      g.fillStyle(color, 1);
      g.fillCircle(dx * a, dy * a - 4, w / 2);
      g.fillCircle(dx * b, dy * b - 4, w / 2);
    };
    if (s.pose === 'collapsed') {
      g.fillStyle(PAL.ink, 0.18);
      g.fillEllipse(0, 0, 44, 16);
    }
    seg(4, 20, 9, pants);
    seg(-12, 4, 13 + breathe, shirt);
    const hx = dx * -18;
    const hy = dy * -18 - 6;
    g.fillStyle(skin, 1);
    g.fillCircle(hx, hy, 8);
    g.fillStyle(hair, 1);
    g.fillEllipse(hx - dx * 4, hy - dy * 4 - 2, 13, 10);
    return;
  }

  const walking = s.pose === 'walk';
  const dancing = s.pose === 'dance';
  const sitting = s.pose === 'sit';
  const swing = walking ? Math.sin(s.time * 11) : dancing ? Math.sin(s.time * 8) : 0;
  const bob = walking
    ? Math.abs(Math.sin(s.time * 11)) * 2
    : dancing
      ? Math.abs(Math.sin(s.time * 8)) * 4
      : Math.sin(s.time * 2) * 0.6;
  const sway = dancing ? Math.sin(s.time * 4) * 3 : 0;
  const drop = sitting ? 7 : 0;
  const back = s.faceY < 0;
  const side = s.faceX >= 0 ? 1 : -1;

  // sombra
  g.fillStyle(PAL.ink, 0.2);
  g.fillEllipse(0, 0, 22, 9);

  // pernas
  g.fillStyle(pants, 1);
  if (sitting) {
    g.fillRoundedRect(-7 + side * 3, -11, 6, 8, 2);
    g.fillRoundedRect(1 + side * 3, -11, 6, 8, 2);
  } else {
    g.fillRoundedRect(-7, -11 - Math.max(0, swing) * 3, 6, 11, 2);
    g.fillRoundedRect(1, -11 - Math.max(0, -swing) * 3, 6, 11, 2);
  }

  // corpo
  const by = -30 - bob + drop;
  g.fillStyle(shirt, 1);
  g.fillRoundedRect(-9 + sway, by, 18, 22, 8);
  g.fillStyle(shade(shirt, 0.82), 1);
  g.fillRoundedRect(-9 + sway, by + 15, 18, 7, { tl: 0, tr: 0, bl: 7, br: 7 });

  // braços
  g.fillStyle(shade(shirt, 0.9), 1);
  if (dancing) {
    g.fillRoundedRect(-13 + sway, by - 6 - swing * 3, 5, 12, 2);
    g.fillRoundedRect(8 + sway, by - 6 + swing * 3, 5, 12, 2);
  } else {
    g.fillRoundedRect(-12 + sway, by + 3 + swing * 2, 5, 12, 2);
    g.fillRoundedRect(7 + sway, by + 3 - swing * 2, 5, 12, 2);
  }

  // cabeça
  const hx = sway * 1.3;
  const hy = by - 7;
  g.fillStyle(skin, 1);
  g.fillCircle(hx, hy, 9);
  g.fillStyle(hair, 1);
  if (back) {
    g.fillCircle(hx, hy - 1, 9);
  } else {
    g.fillEllipse(hx - side * 1.5, hy - 5, 18, 10);
    g.fillStyle(PAL.ink, 1);
    g.fillCircle(hx + side * 2 - 3, hy + 1, 1.3);
    g.fillCircle(hx + side * 2 + 3, hy + 1, 1.3);
    g.fillStyle(shade(skin, 0.8), 1);
    g.fillEllipse(hx + side * 2, hy + 5, 4, 1.6);
  }
  // topete
  g.fillStyle(hair, 1);
  g.fillEllipse(hx + side * 3, hy - 10, 7, 6);
}
