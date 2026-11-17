import * as THREE from 'three';
import { HAIR, PAL, SHIRT, SKIN, css, seeded, shade } from './palette';

// Todas as texturas do jogo são pintadas aqui, por código, em canvases bem
// pequenos (16 a 128 px). A baixa resolução com filtro bilinear é proposital:
// dá o aspecto levemente borrado dos jogos 3D de PC do fim dos anos 90.
// Para trocar por arte definitiva, basta `getTexture` devolver imagens
// carregadas com os mesmos nomes.

type Ctx = CanvasRenderingContext2D;
type Painter = (c: Ctx, w: number, h: number, rnd: () => number) => void;

interface Spec {
  w: number;
  h: number;
  paint: Painter;
  repeat?: boolean;
}

const cache = new Map<string, THREE.CanvasTexture>();

// ---------- utilitários de pintura ----------

function fill(c: Ctx, color: number, x = 0, y = 0, w = c.canvas.width, h = c.canvas.height, a = 1): void {
  c.fillStyle = css(color, a);
  c.fillRect(x, y, w, h);
}

function speckle(c: Ctx, w: number, h: number, rnd: () => number, n: number, colors: number[], a: number, size = 1): void {
  for (let i = 0; i < n; i++) {
    c.fillStyle = css(colors[Math.floor(rnd() * colors.length)], a);
    c.fillRect(Math.floor(rnd() * w), Math.floor(rnd() * h), size + Math.floor(rnd() * size), size);
  }
}

/** Sombreado "pintado à mão": clareia em cima e escurece embaixo. */
function vshade(c: Ctx, w: number, h: number, light = 0.12, dark = 0.16): void {
  const g = c.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, `rgba(255,255,255,${light})`);
  g.addColorStop(0.5, 'rgba(255,255,255,0)');
  g.addColorStop(1, `rgba(0,0,0,${dark})`);
  c.fillStyle = g;
  c.fillRect(0, 0, w, h);
}

function line(c: Ctx, x0: number, y0: number, x1: number, y1: number, color: number, a = 1, width = 1): void {
  c.strokeStyle = css(color, a);
  c.lineWidth = width;
  c.beginPath();
  c.moveTo(x0, y0);
  c.lineTo(x1, y1);
  c.stroke();
}

function disc(c: Ctx, x: number, y: number, r: number, color: number, a = 1): void {
  c.fillStyle = css(color, a);
  c.beginPath();
  c.arc(x, y, r, 0, Math.PI * 2);
  c.fill();
}

function oval(c: Ctx, x: number, y: number, rx: number, ry: number, color: number, a = 1, rot = 0): void {
  c.fillStyle = css(color, a);
  c.beginPath();
  c.ellipse(x, y, rx, ry, rot, 0, Math.PI * 2);
  c.fill();
}

function woodGrain(c: Ctx, w: number, h: number, rnd: () => number, base: number): void {
  fill(c, base);
  for (let i = 0; i < h / 2; i++) {
    const y = rnd() * h;
    c.strokeStyle = css(shade(base, rnd() > 0.5 ? 0.82 : 1.12), 0.35);
    c.lineWidth = 1;
    c.beginPath();
    c.moveTo(0, y);
    c.bezierCurveTo(w * 0.3, y + rnd() * 3 - 1.5, w * 0.6, y + rnd() * 3 - 1.5, w, y + rnd() * 2 - 1);
    c.stroke();
  }
  vshade(c, w, h, 0.08, 0.12);
}

function panelDoors(c: Ctx, w: number, h: number, base: number, knob: number): void {
  for (let i = 0; i < 2; i++) {
    const x = i * (w / 2);
    c.strokeStyle = css(shade(base, 0.62), 0.9);
    c.lineWidth = 1;
    c.strokeRect(x + 1.5, 1.5, w / 2 - 3, h - 3);
    c.strokeStyle = css(shade(base, 0.8), 0.9);
    c.strokeRect(x + 4.5, 4.5, w / 2 - 9, h - 9);
    line(c, x + 5, 5.5, x + w / 2 - 5, 5.5, 0xffffff, 0.35);
    const kx = i === 0 ? w / 2 - 3.5 : w / 2 + 3.5;
    disc(c, kx, h / 2, 1.6, knob);
    disc(c, kx - 0.5, h / 2 - 0.5, 0.6, 0xffffff, 0.8);
  }
}

// ---------- pisos e terreno ----------

const grass: Painter = (c, w, h, rnd) => {
  fill(c, PAL.grass);
  for (let i = 0; i < 70; i++) {
    c.fillStyle = css([0x6bb552, 0x55993f, 0x64ad4c, 0x4f9140][Math.floor(rnd() * 4)], 0.45);
    c.fillRect(Math.floor(rnd() * w), Math.floor(rnd() * h), 3 + rnd() * 6, 2 + rnd() * 3);
  }
  speckle(c, w, h, rnd, 160, [0x7cc25c, 0x488a38], 0.6);
};

const wood: Painter = (c, w, h, rnd) => {
  const rows = 8;
  const rh = h / rows;
  for (let r = 0; r < rows; r++) {
    let x = -rnd() * 30;
    while (x < w) {
      const len = 22 + rnd() * 20;
      const base = shade(PAL.wood, 0.88 + rnd() * 0.22);
      fill(c, base, x, r * rh, len, rh);
      line(c, x + 2, r * rh + 2.5 + rnd() * 2, x + len - 2, r * rh + 3 + rnd() * 2, shade(base, 0.8), 0.4);
      line(c, x + 0.5, r * rh, x + 0.5, (r + 1) * rh, shade(PAL.wood, 0.55), 0.7);
      x += len;
    }
    line(c, 0, (r + 1) * rh - 0.5, w, (r + 1) * rh - 0.5, shade(PAL.wood, 0.55), 0.6);
    line(c, 0, r * rh + 0.5, w, r * rh + 0.5, 0xffffff, 0.12);
  }
};

const carpet: Painter = (c, w, h, rnd) => {
  fill(c, PAL.carpet);
  speckle(c, w, h, rnd, 260, [shade(PAL.carpet, 0.85), shade(PAL.carpet, 1.12), shade(PAL.carpet, 0.93)], 0.7);
};

const tile: Painter = (c, w) => {
  const s = w / 2;
  for (let i = 0; i < 2; i++) {
    for (let j = 0; j < 2; j++) {
      const base = (i + j) % 2 === 0 ? PAL.tileA : PAL.tileB;
      fill(c, shade(PAL.tileB, 0.72), i * s, j * s, s, s);
      fill(c, base, i * s + 1, j * s + 1, s - 1, s - 1);
      fill(c, 0xffffff, i * s + 2, j * s + 2, 5, 2, 0.45);
      fill(c, 0x000000, i * s + 1, j * s + s - 3, s - 1, 2, 0.06);
    }
  }
};

const road: Painter = (c, w, h, rnd) => {
  fill(c, PAL.road);
  speckle(c, w, h, rnd, 320, [0x6b6d73, 0x4c4e54, 0x77797f], 0.6);
};

const sidewalk: Painter = (c, w, h, rnd) => {
  fill(c, PAL.sidewalk);
  speckle(c, w, h, rnd, 90, [0xdcd8cd, 0xbdb9ae], 0.6);
  line(c, 0.5, 0, 0.5, h, 0x8f8b80, 0.8);
  line(c, 0, 0.5, w, 0.5, 0x8f8b80, 0.8);
};

// ---------- paredes (y medido a partir do rodapé) ----------

function wall(base: number, detail: (c: Ctx, w: number, h: number, by: (y: number) => number, rnd: () => number) => void): Painter {
  return (c, w, h, rnd) => {
    fill(c, base);
    speckle(c, w, h, rnd, 60, [shade(base, 0.95), shade(base, 1.04)], 0.5, 2);
    detail(c, w, h, (y) => h - y, rnd);
    const g = c.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, 'rgba(255,255,255,0.06)');
    g.addColorStop(0.75, 'rgba(0,0,0,0)');
    g.addColorStop(1, 'rgba(0,0,0,0.12)');
    c.fillStyle = g;
    c.fillRect(0, 0, w, h);
  };
}

function baseboard(c: Ctx, w: number, by: (y: number) => number): void {
  fill(c, PAL.trim, 0, by(6), w, 6);
  line(c, 0, by(6) - 0.5, w, by(6) - 0.5, 0x000000, 0.22);
  line(c, 0, by(0) - 0.5, w, by(0) - 0.5, 0x000000, 0.25);
}

const wallLiving = wall(PAL.wallLiving, (c, w, h, by) => {
  for (let x = 0; x < w; x += 8) fill(c, 0xffffff, x + 3, 0, 2, h, 0.22);
  fill(c, 0x4fa3a0, 0, by(73), w, 5);
  line(c, 0, by(73) + 0.5, w, by(73) + 0.5, 0xffffff, 0.8);
  line(c, 0, by(68) - 0.5, w, by(68) - 0.5, 0xffffff, 0.8);
  baseboard(c, w, by);
});

const wallBedroom = wall(PAL.wallBedroom, (c, w, h, by) => {
  for (let y = 12; y < h; y += 10) {
    for (let x = 0; x < w; x += 8) {
      const ox = x + ((y / 10) % 2 ? 4 : 0);
      fill(c, 0xe58f8a, ox + 1, by(y), 2, 2, 0.9);
      fill(c, 0xffffff, ox + 5, by(y - 5), 1, 1, 0.9);
      fill(c, 0x7fb07a, ox, by(y) + 2, 1, 1, 0.9);
    }
  }
  baseboard(c, w, by);
});

const wallBath = wall(PAL.wallBath, (c, w, _h, by) => {
  fill(c, 0xf7f9f7, 0, by(42), w, 42);
  for (let y = 8; y <= 40; y += 8) line(c, 0, by(y) + 0.5, w, by(y) + 0.5, 0xb6cbc9, 0.9);
  for (let x = 0; x < w; x += 8) line(c, x + 0.5, by(42), x + 0.5, by(0), 0xb6cbc9, 0.9);
  for (let y = 0; y < 40; y += 8) for (let x = 0; x < w; x += 8) fill(c, 0xffffff, x + 2, by(y + 6), 3, 1, 0.8);
  fill(c, 0x3fa9a5, 0, by(46), w, 4);
  line(c, 0, by(46) + 0.5, w, by(46) + 0.5, 0xffffff, 0.5);
});

const wallExterior = wall(PAL.wallExterior, (c, w, h, by) => {
  for (let y = 12; y < h; y += 6) {
    line(c, 0, by(y) + 0.5, w, by(y) + 0.5, shade(PAL.wallExterior, 0.74), 0.9);
    line(c, 0, by(y) + 1.5, w, by(y) + 1.5, 0xffffff, 0.35);
  }
  fill(c, PAL.brick, 0, by(9), w, 9);
  for (let y = 0; y < 9; y += 3) {
    line(c, 0, by(y) - 0.5, w, by(y) - 0.5, 0xe6d6c4, 0.7);
    for (let x = (y / 3) % 2 ? 0 : 4; x < w; x += 8) line(c, x + 0.5, by(y + 3), x + 0.5, by(y), 0xe6d6c4, 0.7);
  }
});

function windowTex(inside: boolean, curtain: number): Painter {
  return (c, w, h) => {
    fill(c, PAL.trim);
    const gx = 5;
    const gy = 5;
    const gw = w - 10;
    const gh = h - 12;
    const g = c.createLinearGradient(0, gy, 0, gy + gh);
    g.addColorStop(0, inside ? '#7cc4f2' : '#5f9fd0');
    g.addColorStop(1, inside ? '#d8f1fb' : '#a9d3ea');
    c.fillStyle = g;
    c.fillRect(gx, gy, gw, gh);
    if (inside) {
      oval(c, gx + gw * 0.3, gy + gh * 0.3, 7, 3, 0xffffff, 0.8);
      oval(c, gx + gw * 0.42, gy + gh * 0.34, 5, 2.5, 0xffffff, 0.8);
      fill(c, 0x6bb552, gx, gy + gh - 9, gw, 9);
      oval(c, gx + gw * 0.7, gy + gh - 10, 8, 6, 0x4f9140);
    }
    // reflexos
    c.fillStyle = 'rgba(255,255,255,0.3)';
    c.beginPath();
    c.moveTo(gx + 3, gy + gh);
    c.lineTo(gx + 14, gy);
    c.lineTo(gx + 20, gy);
    c.lineTo(gx + 9, gy + gh);
    c.fill();
    // travessas
    fill(c, PAL.trim, w / 2 - 1, gy, 2, gh);
    fill(c, PAL.trim, gx, gy + gh / 2 - 1, gw, 2);
    c.strokeStyle = 'rgba(0,0,0,0.25)';
    c.strokeRect(gx - 0.5, gy - 0.5, gw + 1, gh + 1);
    if (inside) {
      // cortinas
      for (const x of [gx - 2, gx + gw - 9]) {
        fill(c, curtain, x, gy - 2, 11, gh + 4);
        for (let i = 2; i < 11; i += 3) line(c, x + i + 0.5, gy - 2, x + i + 0.5, gy + gh + 2, shade(curtain, 0.72), 0.8);
        line(c, x + 1.5, gy - 2, x + 1.5, gy + gh + 2, 0xffffff, 0.3);
      }
      fill(c, shade(curtain, 0.85), gx - 3, gy - 4, gw + 6, 5);
    }
    // peitoril
    fill(c, shade(PAL.trim, 0.86), 0, h - 5, w, 2);
  };
}

// ---------- móveis ----------

const enamel: Painter = (c, w, h) => {
  fill(c, PAL.enamel);
  vshade(c, w, h, 0.1, 0.14);
};

const fridgeFront: Painter = (c, w, h) => {
  fill(c, PAL.enamel);
  vshade(c, w, h, 0.1, 0.1);
  fill(c, 0xffffff, 2, 2, 2, h - 12, 0.5);
  fill(c, 0x8f979a, 0, 20, w, 2);
  c.strokeStyle = 'rgba(0,0,0,0.25)';
  c.strokeRect(0.5, 0.5, w - 1, h - 9);
  // puxadores
  for (const [y0, len] of [[7, 10], [26, 20]]) {
    fill(c, 0x9aa3a8, w - 7, y0, 3, len);
    fill(c, 0xffffff, w - 7, y0, 1, len, 0.8);
    fill(c, 0x000000, w - 4, y0 + 1, 1, len, 0.2);
  }
  // ímãs e bilhete
  fill(c, 0xfff7c9, 7, 30, 8, 9);
  line(c, 8, 33.5, 14, 33.5, 0x6a6a6a, 0.6);
  line(c, 8, 36.5, 13, 36.5, 0x6a6a6a, 0.6);
  fill(c, 0xd9483f, 10, 29, 3, 3);
  fill(c, 0x4fa864, 18, 34, 3, 3);
  fill(c, 0x3f8fd0, 9, 46, 4, 3);
  // grade de baixo
  fill(c, 0x3a3c40, 0, h - 8, w, 8);
  for (let y = h - 7; y < h; y += 2) line(c, 2, y + 0.5, w - 2, y + 0.5, 0x7b7f85, 0.9);
};

const doorsOak: Painter = (c, w, h, rnd) => {
  woodGrain(c, w, h, rnd, PAL.oak);
  panelDoors(c, w, h, PAL.oak, PAL.brass);
};

const doorsWhite: Painter = (c, w, h) => {
  fill(c, 0xf1efe6);
  vshade(c, w, h, 0.06, 0.1);
  panelDoors(c, w, h, 0xc9c5b8, PAL.chrome);
};

const duvet: Painter = (c, w, h) => {
  fill(c, PAL.duvet);
  for (let i = 0; i < w; i += 16) {
    fill(c, 0xffffff, i + 5, 0, 5, h, 0.55);
    fill(c, 0xffffff, 0, i + 5, w, 5, 0.55);
    fill(c, 0xe0702c, i + 13, 0, 1, h, 0.9);
    fill(c, 0xe0702c, 0, i + 13, w, 1, 0.9);
  }
};

const fabric: Painter = (c, w, h, rnd) => {
  fill(c, 0xffffff);
  for (let y = 0; y < h; y += 2) {
    for (let x = 0; x < w; x += 2) {
      fill(c, 0x000000, x + ((y / 2) % 2 ? 1 : 0), y, 1, 1, 0.08 + rnd() * 0.06);
    }
  }
  vshade(c, w, h, 0, 0.1);
};

function tvFront(channel: number): Painter {
  return (c, w, h, rnd) => {
    fill(c, PAL.plastic);
    fill(c, 0x47474d, 0, 0, w, 1);
    const sw = w - 15;
    const sh = h - 8;
    c.fillStyle = '#0f171c';
    c.beginPath();
    c.roundRect(3, 3, sw + 2, sh + 2, 4);
    c.fill();
    c.save();
    c.beginPath();
    c.roundRect(4, 4, sw, sh, 3);
    c.clip();
    if (channel < 0) {
      const g = c.createLinearGradient(4, 4, 4 + sw, 4 + sh);
      g.addColorStop(0, '#3a5560');
      g.addColorStop(1, '#16242b');
      c.fillStyle = g;
      c.fillRect(4, 4, sw, sh);
    } else if (channel === 0) {
      fill(c, 0x7cc4f2, 4, 4, sw, sh);
      disc(c, 4 + sw * 0.75, 4 + sh * 0.3, 4, 0xffe36b);
      oval(c, 4 + sw * 0.35, 4 + sh, sw * 0.5, sh * 0.42, 0x58a84a);
      oval(c, 4 + sw * 0.8, 4 + sh, sw * 0.4, sh * 0.3, 0x478f3c);
    } else if (channel === 1) {
      fill(c, 0xf0a13c, 4, 4, sw, sh);
      fill(c, 0x3f6fb5, 4, 4 + sh * 0.7, sw, sh * 0.3);
      disc(c, 4 + sw * 0.5, 4 + sh * 0.42, 5, 0xe0ab7f);
      fill(c, 0x5a3a22, 4 + sw * 0.5 - 5, 4 + sh * 0.42 - 6, 10, 4);
      fill(c, 0xf3efe4, 4 + sw * 0.5 - 7, 4 + sh * 0.62, 14, 10);
    } else {
      const bars = [0xf3efe4, 0xf2c744, 0x4fc3c8, 0x4fa864, 0xc85fb0, 0xd9483f, 0x3f6fb5];
      bars.forEach((b, i) => fill(c, b, 4 + (i * sw) / bars.length, 4, sw / bars.length + 1, sh));
    }
    for (let y = 4; y < 4 + sh; y += 2) fill(c, 0x000000, 4, y, sw, 1, 0.12);
    c.fillStyle = 'rgba(255,255,255,0.22)';
    c.beginPath();
    c.moveTo(6, 4 + sh * 0.55);
    c.lineTo(6 + sw * 0.4, 5);
    c.lineTo(6 + sw * 0.55, 5);
    c.lineTo(6, 4 + sh * 0.8);
    c.fill();
    c.restore();
    // painel de controles
    const px = w - 9;
    for (let y = 5; y < h * 0.5; y += 2) line(c, px, y + 0.5, w - 2, y + 0.5, 0x5a5a61, 0.9);
    disc(c, px + 3.5, h * 0.64, 2.4, 0x8d949a);
    disc(c, px + 3, h * 0.64 - 0.5, 1, 0xffffff, 0.7);
    disc(c, px + 3.5, h * 0.82, 1.3, channel < 0 ? 0x7a2a25 : 0xff5a4a);
    void rnd;
  };
}

const BOOK_COLORS = [0xd9483f, 0x3f6fb5, 0xf2c744, 0xf3efe4, 0x4fa864, 0x8a63b8, 0xe0702c, 0x2f8f8a, 0x7a4f2e];

const books: Painter = (c, w, h, rnd) => {
  woodGrain(c, w, h, rnd, PAL.oak);
  const pad = 6;
  const shelves = 4;
  const sh = (h - pad * 2) / shelves;
  for (let s = 0; s < shelves; s++) {
    const y0 = pad + s * sh;
    for (let half = 0; half < 2; half++) {
      const x0 = pad + half * (w / 2 - pad / 2 + 1);
      const sw = w / 2 - pad * 1.5 - 1;
      fill(c, 0x3d2616, x0, y0, sw, sh - 4);
      fill(c, 0x000000, x0, y0, sw, 5, 0.3);
      let x = x0 + 1;
      const floorY = y0 + sh - 4;
      while (x < x0 + sw - 4) {
        const r = rnd();
        if (r > 0.93 && x < x0 + sw - 14) {
          // enfeite: vaso ou porta-retrato
          if (rnd() > 0.5) {
            oval(c, x + 6, floorY - 6, 4, 6, 0x4fc3c8);
            fill(c, 0x4fc3c8, x + 4, floorY - 14, 4, 4);
            fill(c, 0xffffff, x + 4, floorY - 9, 1, 4, 0.6);
          } else {
            fill(c, PAL.brass, x + 1, floorY - 13, 11, 13);
            fill(c, 0xbfe6f5, x + 3, floorY - 11, 7, 9);
            disc(c, x + 6.5, floorY - 7, 2, 0xe0ab7f);
          }
          x += 14;
        } else if (r < 0.07) {
          x += 4;
        } else {
          const bw = 4 + Math.floor(rnd() * 5);
          const bh = sh - 9 - Math.floor(rnd() * 8);
          const color = BOOK_COLORS[Math.floor(rnd() * BOOK_COLORS.length)];
          fill(c, color, x, floorY - bh, bw, bh);
          fill(c, 0xffffff, x, floorY - bh, 1, bh, 0.35);
          fill(c, 0x000000, x + bw - 1, floorY - bh, 1, bh, 0.3);
          fill(c, shade(color, 1.5), x + 1, floorY - bh + 3, bw - 2, 2, 0.8);
          if (bw > 5) fill(c, shade(color, 0.6), x + 1, floorY - 6, bw - 2, 1, 0.8);
          x += bw;
        }
      }
      // tábua da prateleira
      fill(c, shade(PAL.oak, 1.12), x0 - 1, floorY, sw + 2, 3);
      line(c, x0 - 1, floorY + 3.5, x0 + sw + 1, floorY + 3.5, 0x000000, 0.35);
    }
  }
  c.strokeStyle = css(shade(PAL.oak, 0.6), 0.8);
  c.strokeRect(0.5, 0.5, w - 1, h - 1);
};

const speakerFront: Painter = (c, w, h, rnd) => {
  woodGrain(c, w, h, rnd, PAL.walnut);
  fill(c, 0x1b1b1f, 3, 3, w - 6, h - 6);
  for (let y = 4; y < h - 4; y += 2) for (let x = 4 + ((y / 2) % 2); x < w - 4; x += 2) fill(c, 0x34343a, x, y, 1, 1);
  const cone = (cx: number, cy: number, r: number) => {
    disc(c, cx, cy, r, 0x55555c);
    disc(c, cx, cy, r - 1.5, 0x26262b);
    disc(c, cx, cy, r * 0.35, 0x6a6a72);
    disc(c, cx - r * 0.3, cy - r * 0.3, r * 0.18, 0xffffff, 0.35);
  };
  cone(w / 2, h * 0.68, w * 0.32);
  cone(w / 2, h * 0.3, w * 0.2);
  fill(c, PAL.brass, w / 2 - 3, h * 0.47, 6, 2);
};

const deckFront: Painter = (c, w, h) => {
  fill(c, 0xb9bfc4);
  vshade(c, w, h, 0.2, 0.2);
  fill(c, 0x1d2b2e, 3, 2, w * 0.45, h - 5);
  fill(c, 0x5fe0c8, 5, 4, w * 0.3, 2);
  for (let i = 0; i < 4; i++) disc(c, w * 0.6 + i * 4, h / 2, 1.4, 0x4a4f55);
};

const leaves: Painter = (c, w, h, rnd) => {
  c.clearRect(0, 0, w, h);
  const greens = [0x3f9a3c, 0x55b04a, 0x2f7f33, 0x6cc45a];
  // caules
  for (let i = 0; i < 5; i++) {
    c.strokeStyle = css(0x5c7a34);
    c.lineWidth = 1.5;
    c.beginPath();
    c.moveTo(w / 2, h);
    c.quadraticCurveTo(w / 2 + (i - 2) * 6, h * 0.6, w / 2 + (i - 2) * 11, h * 0.25 + Math.abs(i - 2) * 6);
    c.stroke();
  }
  for (let i = 0; i < 22; i++) {
    const t = 0.15 + rnd() * 0.8;
    const side = rnd() * 2 - 1;
    const x = w / 2 + side * (w * 0.42) * (0.3 + t * 0.7);
    const y = h * (1 - t) * 0.82 + 5;
    const rot = side * 0.9 + (rnd() - 0.5) * 0.8 - Math.PI / 2;
    const color = greens[Math.floor(rnd() * greens.length)];
    oval(c, x, y, 7 + rnd() * 3, 3 + rnd() * 1.5, color, 1, rot);
    c.strokeStyle = css(shade(color, 1.35), 0.8);
    c.lineWidth = 0.8;
    c.beginPath();
    c.moveTo(x - Math.cos(rot) * 6, y - Math.sin(rot) * 6);
    c.lineTo(x + Math.cos(rot) * 6, y + Math.sin(rot) * 6);
    c.stroke();
  }
};

const treeLeaves: Painter = (c, w, h, rnd) => {
  fill(c, 0x3f8a3c);
  for (let i = 0; i < 40; i++) {
    disc(c, rnd() * w, rnd() * h, 1.5 + rnd() * 3, [0x57a84a, 0x2f7432, 0x4a973f, 0x6cb857][Math.floor(rnd() * 4)], 0.75);
  }
};

const bark: Painter = (c, w, h, rnd) => {
  fill(c, PAL.bark);
  for (let i = 0; i < 14; i++) {
    const x = rnd() * w;
    line(c, x, 0, x + rnd() * 2 - 1, h, rnd() > 0.5 ? 0x4a3220 : 0x8a6444, 0.6);
  }
};

const lampShade: Painter = (c, w, h) => {
  fill(c, PAL.linen);
  for (let x = 0; x < w; x += 2) fill(c, 0x000000, x, 0, 1, h, 0.05);
  const g = c.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, 'rgba(255,255,255,0.1)');
  g.addColorStop(0.6, 'rgba(255,240,180,0.35)');
  g.addColorStop(1, 'rgba(120,80,20,0.2)');
  c.fillStyle = g;
  c.fillRect(0, 0, w, h);
  fill(c, 0xb08f4f, 0, 0, w, 1);
  fill(c, 0xb08f4f, 0, h - 1, w, 1);
};

const mirror: Painter = (c, w, h) => {
  fill(c, 0xf7f9f7);
  for (let y = 0; y < h; y += 8) line(c, 0, y + 0.5, w, y + 0.5, 0xb6cbc9, 0.9);
  for (let x = 0; x < w; x += 8) line(c, x + 0.5, 0, x + 0.5, h, 0xb6cbc9, 0.9);
  fill(c, PAL.chrome, 4, 4, w - 8, h - 14);
  const g = c.createLinearGradient(0, 5, w, h - 10);
  g.addColorStop(0, '#e8f6fb');
  g.addColorStop(1, '#9fc4d6');
  c.fillStyle = g;
  c.fillRect(5, 5, w - 10, h - 16);
  c.fillStyle = 'rgba(255,255,255,0.5)';
  c.beginPath();
  c.moveTo(8, h - 12);
  c.lineTo(16, 6);
  c.lineTo(20, 6);
  c.lineTo(12, h - 12);
  c.fill();
};

const picket: Painter = (c, w, h) => {
  c.clearRect(0, 0, w, h);
  fill(c, 0xe9e6dc, 0, 9, w, 3);
  fill(c, 0xe9e6dc, 0, 22, w, 3);
  for (let x = 1; x < w; x += 8) {
    c.fillStyle = css(PAL.white);
    c.beginPath();
    c.moveTo(x, h);
    c.lineTo(x, 5);
    c.lineTo(x + 2.5, 1);
    c.lineTo(x + 5, 5);
    c.lineTo(x + 5, h);
    c.fill();
    fill(c, 0x000000, x + 4, 5, 1, h - 5, 0.15);
  }
};

function houseWall(base: number): Painter {
  return (c, w, h) => {
    fill(c, base);
    for (let y = 4; y < h; y += 5) line(c, 0, y + 0.5, w, y + 0.5, shade(base, 0.8), 0.7);
    fill(c, 0x9a9790, 0, h - 5, w, 5);
    const win = (x: number) => {
      fill(c, PAL.trim, x, 14, 14, 18);
      fill(c, 0x5f9fd0, x + 2, 16, 10, 14);
      fill(c, 0xffffff, x + 3, 17, 3, 12, 0.35);
      fill(c, PAL.trim, x + 6, 16, 2, 14);
    };
    win(8);
    win(42);
    fill(c, PAL.trim, 26, 18, 12, h - 23);
    fill(c, shade(base, 0.55), 28, 20, 8, h - 25);
    disc(c, 34.5, 33, 1, PAL.brass);
    vshade(c, w, h, 0.05, 0.12);
  };
}

const roof: Painter = (c, w, h) => {
  fill(c, 0xb0523c);
  for (let y = 0; y < h; y += 4) {
    line(c, 0, y + 0.5, w, y + 0.5, 0x7a3526, 0.9);
    for (let x = (y / 4) % 2 ? 0 : 4; x < w; x += 8) line(c, x + 0.5, y, x + 0.5, y + 4, 0x7a3526, 0.6);
    line(c, 0, y + 1.5, w, y + 1.5, 0xffffff, 0.12);
  }
};

const stone: Painter = (c, w, h, rnd) => {
  fill(c, 0xc9c4b6);
  speckle(c, w, h, rnd, 30, [0xb5b0a2, 0xd9d4c6], 0.7);
  c.strokeStyle = 'rgba(0,0,0,0.25)';
  c.strokeRect(0.5, 0.5, w - 1, h - 1);
};

const blob: Painter = (c, w, h) => {
  c.clearRect(0, 0, w, h);
  const g = c.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
  g.addColorStop(0, 'rgba(0,0,0,0.5)');
  g.addColorStop(0.6, 'rgba(0,0,0,0.25)');
  g.addColorStop(1, 'rgba(0,0,0,0)');
  c.fillStyle = g;
  c.fillRect(0, 0, w, h);
};

const zzz: Painter = (c, w, h) => {
  c.clearRect(0, 0, w, h);
  c.font = `bold ${h * 0.8}px sans-serif`;
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  c.lineWidth = 4;
  c.strokeStyle = css(0x2a3a6a);
  c.strokeText('Z', w / 2, h / 2);
  c.fillStyle = '#ffffff';
  c.fillText('Z', w / 2, h / 2);
};

// ---------- folks ----------

export type Expression = 'happy' | 'neutral' | 'sad';

/** Rosto pintado na frente da cabeça (u = 0.5 é o centro do rosto). */
function face(skinIdx: number, hairIdx: number, expr: Expression, eyesClosed: boolean): Painter {
  return (c, w, h) => {
    const skin = SKIN[skinIdx % SKIN.length];
    const hair = HAIR[hairIdx % HAIR.length];
    fill(c, skin);
    // volume: laterais e queixo mais escuros
    const g = c.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, 'rgba(255,255,255,0.06)');
    g.addColorStop(0.7, 'rgba(0,0,0,0)');
    g.addColorStop(1, 'rgba(0,0,0,0.16)');
    c.fillStyle = g;
    c.fillRect(0, 0, w, h);
    const cx = w / 2;
    const ey = h * 0.47;
    // bochechas
    if (expr === 'happy') {
      oval(c, cx - 13, ey + 8, 5, 3, 0xe8776a, 0.35);
      oval(c, cx + 13, ey + 8, 5, 3, 0xe8776a, 0.35);
    }
    for (const s of [-1, 1]) {
      const ex = cx + s * 8.5;
      if (eyesClosed) {
        c.strokeStyle = css(0x2a221d);
        c.lineWidth = 1.5;
        c.beginPath();
        c.arc(ex, ey - 1, 3.2, 0.15 * Math.PI, 0.85 * Math.PI);
        c.stroke();
      } else {
        oval(c, ex, ey, 4.6, expr === 'sad' ? 3 : 3.8, 0xffffff);
        disc(c, ex + s * 0.3, ey + 0.4, 2.6, 0x3a2a1e);
        disc(c, ex + s * 0.3 - 0.9, ey - 0.7, 0.9, 0xffffff);
        line(c, ex - 4.6, ey - 3.6, ex + 4.6, ey - 3.6, shade(skin, 0.6), 0.9, 1);
      }
      // sobrancelhas: inclinadas conforme o humor
      const tilt = expr === 'sad' ? -1.6 : expr === 'happy' ? 0.6 : 0;
      line(c, ex - 5, ey - 8 + s * tilt, ex + 5, ey - 8 - s * tilt, shade(hair, 0.9), 1, 2);
    }
    // nariz
    line(c, cx + 1.5, ey + 3, cx + 2.5, ey + 9, shade(skin, 0.7), 0.9, 1.2);
    line(c, cx - 1, ey + 10, cx + 2.5, ey + 9.5, shade(skin, 0.7), 0.9, 1.2);
    // boca
    const my = ey + 16;
    c.strokeStyle = css(0x8a3a34);
    c.lineWidth = 1.8;
    c.lineCap = 'round';
    c.beginPath();
    if (expr === 'happy') {
      c.arc(cx, my - 4, 6.5, 0.15 * Math.PI, 0.85 * Math.PI);
    } else if (expr === 'sad') {
      c.arc(cx, my + 5, 5.5, 1.2 * Math.PI, 1.8 * Math.PI);
    } else {
      c.moveTo(cx - 4, my);
      c.lineTo(cx + 4, my);
    }
    c.stroke();
  };
}

/** Camisa que envolve o tronco (u = 0.5 é o centro do peito). */
function shirt(idx: number): Painter {
  return (c, w, h) => {
    const base = SHIRT[idx % SHIRT.length];
    fill(c, base);
    const style = idx % 3;
    if (style === 1) {
      for (let y = 6; y < h; y += 6) fill(c, 0xffffff, 0, y, w, 2, 0.75);
    } else if (style === 2) {
      for (let x = 0; x < w; x += 8) fill(c, shade(base, 0.72), x, 0, 2, h, 0.6);
      for (let y = 0; y < h; y += 8) fill(c, shade(base, 0.72), 0, y, w, 2, 0.6);
    }
    const cx = w / 2;
    // gola e botões
    c.fillStyle = css(shade(base, 1.35));
    c.beginPath();
    c.moveTo(cx - 7, 0);
    c.lineTo(cx, 8);
    c.lineTo(cx + 7, 0);
    c.lineTo(cx + 4, 0);
    c.lineTo(cx, 4);
    c.lineTo(cx - 4, 0);
    c.fill();
    line(c, cx + 0.5, 8, cx + 0.5, h, shade(base, 0.7), 0.8);
    for (let y = 12; y < h - 2; y += 6) fill(c, 0xffffff, cx - 0.5, y, 2, 2, 0.85);
    vshade(c, w, h, 0.04, 0.2);
  };
}

// ---------- registro ----------

const SPECS: Record<string, Spec> = {
  grass: { w: 64, h: 64, paint: grass, repeat: true },
  wood: { w: 64, h: 64, paint: wood, repeat: true },
  carpet: { w: 32, h: 32, paint: carpet, repeat: true },
  tile: { w: 32, h: 32, paint: tile, repeat: true },
  road: { w: 64, h: 64, paint: road, repeat: true },
  sidewalk: { w: 32, h: 32, paint: sidewalk, repeat: true },
  wallLiving: { w: 32, h: 80, paint: wallLiving },
  wallBedroom: { w: 32, h: 80, paint: wallBedroom },
  wallBath: { w: 32, h: 80, paint: wallBath },
  wallExterior: { w: 32, h: 80, paint: wallExterior },
  windowOut: { w: 48, h: 72, paint: windowTex(false, 0) },
  'windowIn:wood': { w: 48, h: 72, paint: windowTex(true, 0xd9483f) },
  'windowIn:carpet': { w: 48, h: 72, paint: windowTex(true, 0x4f86c9) },
  'windowIn:tile': { w: 48, h: 72, paint: windowTex(true, 0xf7f9f7) },
  enamel: { w: 16, h: 16, paint: enamel },
  fridgeFront: { w: 32, h: 72, paint: fridgeFront },
  oak: { w: 32, h: 32, paint: (c, w, h, r) => woodGrain(c, w, h, r, PAL.oak) },
  walnut: { w: 32, h: 32, paint: (c, w, h, r) => woodGrain(c, w, h, r, PAL.walnut) },
  pine: { w: 32, h: 32, paint: (c, w, h, r) => woodGrain(c, w, h, r, PAL.pine) },
  doorsOak: { w: 32, h: 32, paint: doorsOak },
  doorsWhite: { w: 32, h: 32, paint: doorsWhite },
  duvet: { w: 32, h: 32, paint: duvet, repeat: true },
  fabric: { w: 16, h: 16, paint: fabric, repeat: true },
  tvOff: { w: 48, h: 40, paint: tvFront(-1) },
  tvOn0: { w: 48, h: 40, paint: tvFront(0) },
  tvOn1: { w: 48, h: 40, paint: tvFront(1) },
  tvOn2: { w: 48, h: 40, paint: tvFront(2) },
  books: { w: 128, h: 128, paint: books },
  speakerFront: { w: 32, h: 64, paint: speakerFront },
  deckFront: { w: 32, h: 12, paint: deckFront },
  leaves: { w: 64, h: 64, paint: leaves },
  treeLeaves: { w: 32, h: 32, paint: treeLeaves, repeat: true },
  bark: { w: 16, h: 32, paint: bark },
  lampShade: { w: 16, h: 16, paint: lampShade },
  mirror: { w: 32, h: 48, paint: mirror },
  picket: { w: 32, h: 32, paint: picket, repeat: true },
  'houseWall:0': { w: 64, h: 48, paint: houseWall(0xf2c9c0) },
  'houseWall:1': { w: 64, h: 48, paint: houseWall(0xcfe6c2) },
  'houseWall:2': { w: 64, h: 48, paint: houseWall(0xf5e6a8) },
  roof: { w: 32, h: 32, paint: roof, repeat: true },
  stone: { w: 16, h: 16, paint: stone },
  blob: { w: 32, h: 32, paint: blob },
  zzz: { w: 32, h: 32, paint: zzz },
};

function specFor(name: string): Spec | undefined {
  if (SPECS[name]) return SPECS[name];
  const parts = name.split(':');
  if (parts[0] === 'face') {
    return { w: 128, h: 64, paint: face(Number(parts[1]), Number(parts[2]), parts[3] as Expression, parts[4] === '1') };
  }
  if (parts[0] === 'shirt') return { w: 64, h: 32, paint: shirt(Number(parts[1])) };
  return undefined;
}

function hashName(name: string): number {
  let h = 2166136261;
  for (let i = 0; i < name.length; i++) h = Math.imul(h ^ name.charCodeAt(i), 16777619);
  return h;
}

export function getTexture(name: string): THREE.CanvasTexture {
  const hit = cache.get(name);
  if (hit) return hit;
  const spec = specFor(name);
  if (!spec) throw new Error(`textura desconhecida: ${name}`);
  const canvas = document.createElement('canvas');
  canvas.width = spec.w;
  canvas.height = spec.h;
  const ctx = canvas.getContext('2d')!;
  spec.paint(ctx, spec.w, spec.h, seeded(hashName(name)));
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  // filtro bilinear em textura pequena = o borrado suave da época
  tex.magFilter = THREE.LinearFilter;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  if (spec.repeat) {
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
  }
  cache.set(name, tex);
  return tex;
}

export function faceTextureName(skin: number, hair: number, expr: Expression, eyesClosed: boolean): string {
  return `face:${skin}:${hair}:${expr}:${eyesClosed ? 1 : 0}`;
}
