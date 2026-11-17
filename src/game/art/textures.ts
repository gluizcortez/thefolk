import * as THREE from 'three';
import { HAIR, PAL, PANTS, SHIRT, SKIN, css, seeded, shade } from './palette';

// Todas as texturas do jogo são pintadas aqui, por código, em canvases
// pequenos (cerca de 64 pixels por metro). Cada uma recebe um granulado por
// cima e é amostrada sem suavização, para ter a cara dos gráficos de PC do fim
// dos anos 90: detalhe denso, pixels nítidos e cores cheias.
// Para trocar por arte definitiva, basta `getTexture` devolver imagens
// carregadas com os mesmos nomes.

type Ctx = CanvasRenderingContext2D;
type Painter = (c: Ctx, w: number, h: number, rnd: () => number) => void;

interface Spec {
  w: number;
  h: number;
  paint: Painter;
  repeat?: boolean;
  /** força do granulado (padrão 7; 0 desliga) */
  grain?: number;
  /** filtro suave: só para sombras e efeitos */
  smooth?: boolean;
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

/** Manchas largas e suaves, para a superfície não ficar chapada. */
function mottle(c: Ctx, w: number, h: number, rnd: () => number, n: number, base: number, a = 0.3): void {
  for (let i = 0; i < n; i++) {
    c.fillStyle = css(shade(base, rnd() > 0.5 ? 0.9 : 1.08), a);
    c.fillRect(Math.floor(rnd() * w) - 3, Math.floor(rnd() * h) - 3, 3 + rnd() * 10, 2 + rnd() * 8);
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

/** Volume de cilindro: escurece as laterais (u = 0.25 e 0.75) e as costas. */
function wrapShade(c: Ctx, w: number, h: number, dark = 0.28): void {
  const g = c.createLinearGradient(0, 0, w, 0);
  g.addColorStop(0, `rgba(0,0,0,${dark * 0.7})`);
  g.addColorStop(0.2, `rgba(0,0,0,${dark})`);
  g.addColorStop(0.42, 'rgba(255,255,255,0.06)');
  g.addColorStop(0.58, 'rgba(255,255,255,0.06)');
  g.addColorStop(0.8, `rgba(0,0,0,${dark})`);
  g.addColorStop(1, `rgba(0,0,0,${dark * 0.7})`);
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

/** Painel em relevo: luz em cima e à esquerda, sombra embaixo e à direita. */
function bevel(c: Ctx, x: number, y: number, w: number, h: number, light = 0.4, dark = 0.35): void {
  fill(c, 0xffffff, x, y, w, 1, light);
  fill(c, 0xffffff, x, y, 1, h, light * 0.7);
  fill(c, 0x000000, x, y + h - 1, w, 1, dark);
  fill(c, 0x000000, x + w - 1, y, 1, h, dark * 0.7);
}

/** Painel rebaixado (almofada de porta de armário). */
function inset(c: Ctx, x: number, y: number, w: number, h: number): void {
  fill(c, 0x000000, x, y, w, 1, 0.35);
  fill(c, 0x000000, x, y, 1, h, 0.25);
  fill(c, 0xffffff, x, y + h - 1, w, 1, 0.35);
  fill(c, 0xffffff, x + w - 1, y, 1, h, 0.25);
}

function scaled(paint: Painter, k: number): Painter {
  return (c, w, h, rnd) => {
    c.save();
    c.scale(k, k);
    paint(c, w / k, h / k, rnd);
    c.restore();
  };
}

function grainPass(c: Ctx, w: number, h: number, rnd: () => number, amount: number): void {
  const img = c.getImageData(0, 0, w, h);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    if (d[i + 3] === 0) continue;
    const n = (rnd() - 0.5) * 2 * amount;
    d[i] += n;
    d[i + 1] += n;
    d[i + 2] += n;
  }
  c.putImageData(img, 0, 0);
}

function woodGrain(c: Ctx, w: number, h: number, rnd: () => number, base: number): void {
  fill(c, base);
  for (let i = 0; i < h * 0.7; i++) {
    const y = rnd() * h;
    c.strokeStyle = css(shade(base, rnd() > 0.5 ? 0.78 : 1.14), 0.32);
    c.lineWidth = 1;
    c.beginPath();
    c.moveTo(0, y);
    c.bezierCurveTo(w * 0.3, y + rnd() * 4 - 2, w * 0.6, y + rnd() * 4 - 2, w, y + rnd() * 3 - 1.5);
    c.stroke();
  }
  // um ou dois nós
  for (let i = 0; i < 2; i++) {
    const x = rnd() * w;
    const y = rnd() * h;
    oval(c, x, y, 3 + rnd() * 2, 1.5, shade(base, 0.6), 0.5);
    oval(c, x, y, 1.2, 0.7, shade(base, 0.4), 0.7);
  }
  vshade(c, w, h, 0.08, 0.12);
}

function panelDoors(c: Ctx, w: number, h: number, base: number, knob: number): void {
  for (let i = 0; i < 2; i++) {
    const x = i * (w / 2);
    c.strokeStyle = css(shade(base, 0.5), 0.9);
    c.lineWidth = 1;
    c.strokeRect(x + 1.5, 1.5, w / 2 - 3, h - 3);
    inset(c, x + 7, 7, w / 2 - 14, h - 14);
    fill(c, 0xffffff, x + 9, 9, w / 2 - 18, h - 18, 0.07);
    const kx = i === 0 ? w / 2 - 5 : w / 2 + 5;
    disc(c, kx, h / 2, 2.4, shade(knob, 0.6));
    disc(c, kx, h / 2, 1.8, knob);
    disc(c, kx - 0.6, h / 2 - 0.6, 0.7, 0xffffff, 0.9);
  }
}

// ---------- pisos e terreno ----------

const grass: Painter = (c, w, h, rnd) => {
  fill(c, PAL.grass);
  const tones = [0x4a8c35, 0x35722a, 0x447f2f, 0x2f6626, 0x55963b];
  for (let i = 0; i < 460; i++) {
    c.fillStyle = css(tones[Math.floor(rnd() * tones.length)], 0.5);
    c.fillRect(Math.floor(rnd() * w), Math.floor(rnd() * h), 2 + rnd() * 6, 1 + rnd() * 3);
  }
  for (let i = 0; i < 300; i++) {
    c.fillStyle = css(rnd() > 0.5 ? 0x6aa846 : 0x24551e, 0.8);
    c.fillRect(Math.floor(rnd() * w), Math.floor(rnd() * h), 1, 2 + Math.floor(rnd() * 2));
  }
  for (let i = 0; i < 6; i++) fill(c, rnd() > 0.5 ? 0xf3efe2 : 0xf2d24a, Math.floor(rnd() * w), Math.floor(rnd() * h), 1, 1);
};

const wood: Painter = (c, w, h, rnd) => {
  const rows = 8;
  const rh = h / rows;
  for (let r = 0; r < rows; r++) {
    let x = -rnd() * 60;
    while (x < w) {
      const len = 48 + rnd() * 64;
      const base = shade(PAL.wood, 0.8 + rnd() * 0.32);
      fill(c, base, x, r * rh, len, rh);
      for (let k = 0; k < 3; k++) {
        const y = r * rh + 2 + rnd() * (rh - 4);
        line(c, x + 2, y, x + len - 2, y + rnd() * 2 - 1, shade(base, rnd() > 0.5 ? 0.8 : 1.12), 0.45);
      }
      line(c, Math.floor(x) + 0.5, r * rh, Math.floor(x) + 0.5, (r + 1) * rh, shade(PAL.wood, 0.42), 0.85);
      x += len;
    }
    line(c, 0, (r + 1) * rh - 0.5, w, (r + 1) * rh - 0.5, shade(PAL.wood, 0.42), 0.85);
    line(c, 0, r * rh + 0.5, w, r * rh + 0.5, 0xffffff, 0.16);
  }
};

const carpet: Painter = (c, w, h, rnd) => {
  fill(c, PAL.carpet);
  speckle(c, w, h, rnd, 1500, [shade(PAL.carpet, 0.72), shade(PAL.carpet, 1.25), shade(PAL.carpet, 0.86), 0x8098dc], 0.75);
  speckle(c, w, h, rnd, 60, [0xb9c6f0, 0x22316a], 0.8);
};

/** Banheiro: pastilhas pequenas em xadrez, quatro por tile. */
const tile: Painter = (c, w, _h, rnd) => {
  const n = 4;
  const s = w / n;
  fill(c, PAL.grout);
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      const base = shade((i + j) % 2 === 0 ? PAL.tileA : PAL.tileB, 0.93 + rnd() * 0.1);
      fill(c, base, i * s + 1, j * s + 1, s - 1, s - 1);
      bevel(c, i * s + 1, j * s + 1, s - 1, s - 1, 0.45, 0.22);
      fill(c, 0xffffff, i * s + 3, j * s + 3, 4, 1, 0.5);
    }
  }
};

/** Cozinha: lajotas de barro com tozetos claros nos cantos. */
const kitchen: Painter = (c, w, h, rnd) => {
  const s = w / 2;
  fill(c, 0x4a382b);
  for (let i = 0; i < 2; i++) {
    for (let j = 0; j < 2; j++) {
      const base = shade(PAL.terracotta, 0.86 + rnd() * 0.24);
      const x = i * s + 1;
      const y = j * s + 1;
      fill(c, base, x, y, s - 2, s - 2);
      for (let k = 0; k < 22; k++) {
        c.fillStyle = css(shade(base, rnd() > 0.5 ? 0.86 : 1.12), 0.4);
        c.fillRect(x + rnd() * (s - 8), y + rnd() * (s - 6), 2 + rnd() * 7, 1 + rnd() * 4);
      }
      bevel(c, x, y, s - 2, s - 2, 0.28, 0.3);
    }
  }
  for (const [cx, cy] of [[0, 0], [s, 0], [w, 0], [0, s], [s, s], [w, s], [0, h], [s, h], [w, h]]) {
    c.save();
    c.translate(cx, cy);
    c.rotate(Math.PI / 4);
    fill(c, 0x4a382b, -7, -7, 14, 14);
    fill(c, 0xe3d2a6, -6, -6, 12, 12);
    fill(c, 0xffffff, -6, -6, 12, 1, 0.4);
    fill(c, 0x000000, -6, 5, 12, 1, 0.25);
    c.restore();
  }
};

const road: Painter = (c, w, h, rnd) => {
  fill(c, PAL.road);
  speckle(c, w, h, rnd, 700, [0x5d5f66, 0x3e4046, 0x6a6c73, 0x34363b], 0.65);
};

const sidewalk: Painter = (c, w, h, rnd) => {
  fill(c, PAL.sidewalk);
  speckle(c, w, h, rnd, 420, [0xc9c4b6, 0xa6a193, 0x97927f], 0.6);
  line(c, 0.5, 0, 0.5, h, 0x6f6b5f, 0.9);
  line(c, 0, 0.5, w, 0.5, 0x6f6b5f, 0.9);
  line(c, 1.5, 0, 1.5, h, 0xffffff, 0.25);
  line(c, 0, 1.5, w, 1.5, 0xffffff, 0.25);
};

// ---------- paredes (y medido a partir do rodapé; 160 px = 2,6 m) ----------

type WallDetail = (c: Ctx, w: number, h: number, by: (y: number) => number, rnd: () => number) => void;

function wall(base: number, detail: WallDetail): Painter {
  return (c, w, h, rnd) => {
    fill(c, base);
    mottle(c, w, h, rnd, 50, base, 0.3);
    detail(c, w, h, (y) => h - y, rnd);
    const g = c.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, 'rgba(0,0,0,0.1)');
    g.addColorStop(0.08, 'rgba(255,255,255,0.05)');
    g.addColorStop(0.7, 'rgba(0,0,0,0)');
    g.addColorStop(1, 'rgba(0,0,0,0.22)');
    c.fillStyle = g;
    c.fillRect(0, 0, w, h);
  };
}

function baseboard(c: Ctx, w: number, by: (y: number) => number, color: number, hgt = 8): void {
  fill(c, color, 0, by(hgt), w, hgt);
  fill(c, 0xffffff, 0, by(hgt), w, 1, 0.35);
  fill(c, 0x000000, 0, by(hgt) - 1, w, 1, 0.3);
  fill(c, 0x000000, 0, by(1), w, 1, 0.4);
}

function crown(c: Ctx, w: number, color: number): void {
  fill(c, color, 0, 0, w, 5);
  fill(c, 0xffffff, 0, 1, w, 1, 0.4);
  fill(c, 0x000000, 0, 5, w, 1, 0.3);
}

const wallLiving = wall(PAL.wallLiving, (c, w, h, by, rnd) => {
  // papel listrado tom sobre tom
  for (let x = 0; x < w; x += 16) {
    fill(c, shade(PAL.wallLiving, 0.86), x + 5, 0, 6, h, 0.55);
    fill(c, 0xf1dca0, x + 4, 0, 1, h, 0.5);
    fill(c, 0xf1dca0, x + 11, 0, 1, h, 0.5);
  }
  // lambri de madeira até a altura do peitoril
  const top = 50;
  fill(c, 0x7c4e2a, 0, by(top), w, top);
  for (let x = 0; x < w; x += 16) {
    fill(c, shade(0x7c4e2a, 0.86 + rnd() * 0.25), x + 1, by(top), 14, top);
    for (let k = 0; k < 4; k++) {
      const gx = x + 2 + rnd() * 12;
      line(c, gx, by(top), gx + rnd() * 2 - 1, by(0), shade(0x7c4e2a, rnd() > 0.5 ? 0.7 : 1.15), 0.4);
    }
    fill(c, 0x000000, x, by(top), 1, top, 0.55);
    fill(c, 0xffffff, x + 1, by(top), 1, top, 0.14);
  }
  fill(c, 0x8f5d33, 0, by(top + 5), w, 5);
  fill(c, 0xffffff, 0, by(top + 5), w, 1, 0.4);
  fill(c, 0x000000, 0, by(top), w, 1, 0.45);
  baseboard(c, w, by, 0x5b3920);
  crown(c, w, PAL.trim);
});

const wallBedroom = wall(PAL.wallBedroom, (c, w, h, by) => {
  for (let x = 0; x < w; x += 4) fill(c, 0xffffff, x, 0, 1, h, 0.07);
  for (let y = 18; y < h - 8; y += 16) {
    for (let x = 0; x < w; x += 16) {
      const ox = x + ((y / 16) % 2 >= 1 ? 8 : 0) + 4;
      const oy = by(y);
      // raminho: losango claro, miolo rosado e duas folhas
      c.fillStyle = css(0xe9e2c4, 0.9);
      c.beginPath();
      c.moveTo(ox, oy - 3);
      c.lineTo(ox + 3, oy);
      c.lineTo(ox, oy + 3);
      c.lineTo(ox - 3, oy);
      c.fill();
      fill(c, 0xc8646a, ox - 1, oy - 1, 2, 2);
      fill(c, 0x55784f, ox - 4, oy + 3, 2, 1);
      fill(c, 0x55784f, ox + 2, oy + 3, 2, 1);
    }
  }
  baseboard(c, w, by, PAL.trim);
  crown(c, w, PAL.trim);
});

const wallBath = wall(PAL.wallBath, (c, w, _h, by, rnd) => {
  const top = 72;
  fill(c, 0x9aa7a2, 0, by(top), w, top);
  for (let y = 0; y < top; y += 8) {
    for (let x = 0; x < w; x += 8) {
      const accent = y === 56;
      fill(c, shade(accent ? PAL.tileB : 0xeef0ea, 0.94 + rnd() * 0.08), x + 1, by(y + 8) + 1, 7, 7);
      fill(c, 0xffffff, x + 1, by(y + 8) + 1, 7, 1, 0.55);
      fill(c, 0x000000, x + 1, by(y) - 1, 7, 1, 0.12);
    }
  }
  fill(c, shade(PAL.tileB, 0.7), 0, by(top + 4), w, 4);
  fill(c, 0xffffff, 0, by(top + 4), w, 1, 0.45);
  crown(c, w, PAL.white);
});

const wallKitchen = wall(PAL.wallKitchen, (c, w, _h, by, rnd) => {
  // faixa de azulejos atrás da bancada
  const y0 = 54;
  const y1 = 86;
  fill(c, 0xa9a595, 0, by(y1), w, y1 - y0);
  for (let y = y0; y < y1; y += 8) {
    for (let x = 0; x < w; x += 8) {
      const k = (x / 8 + (y - y0) / 8) % 4;
      const col = k === 0 ? PAL.mustard : k === 2 ? PAL.cabinet : 0xf1ecdc;
      fill(c, shade(col, 0.94 + rnd() * 0.08), x + 1, by(y + 8) + 1, 7, 7);
      fill(c, 0xffffff, x + 1, by(y + 8) + 1, 7, 1, 0.5);
    }
  }
  fill(c, 0x000000, 0, by(y1) - 1, w, 1, 0.25);
  baseboard(c, w, by, 0x6e4427);
  crown(c, w, PAL.trim);
});

const wallExterior = wall(PAL.brick, (c, w, h, by, rnd) => {
  fill(c, PAL.mortar);
  for (let y = 0; y < h; y += 6) {
    const off = (y / 6) % 2 ? 0 : 8;
    for (let x = -16; x < w; x += 16) {
      fill(c, shade(PAL.brick, 0.78 + rnd() * 0.42), x + off, by(y + 6) + 1, 15, 5);
      fill(c, 0xffffff, x + off, by(y + 6) + 1, 15, 1, 0.14);
      fill(c, 0x000000, x + off, by(y) - 1, 15, 1, 0.2);
    }
  }
  fill(c, 0x8f8a7c, 0, by(10), w, 10);
  for (let x = 0; x < w; x += 21) fill(c, 0x000000, x, by(10), 1, 10, 0.3);
  fill(c, 0xffffff, 0, by(10), w, 1, 0.35);
  crown(c, w, PAL.white);
});

function windowTex(inside: boolean, curtain: number): Painter {
  return (c, w, h) => {
    fill(c, PAL.trim);
    bevel(c, 0, 0, w, h, 0.5, 0.35);
    const gx = 6;
    const gy = 6;
    const gw = w - 12;
    const gh = h - 16;
    const g = c.createLinearGradient(0, gy, 0, gy + gh);
    g.addColorStop(0, inside ? '#5fa8de' : '#35557a');
    g.addColorStop(1, inside ? '#c6e6f5' : '#6f93b3');
    c.fillStyle = g;
    c.fillRect(gx, gy, gw, gh);
    if (inside) {
      oval(c, gx + gw * 0.3, gy + gh * 0.26, 9, 4, 0xffffff, 0.85);
      oval(c, gx + gw * 0.45, gy + gh * 0.31, 7, 3, 0xffffff, 0.85);
      fill(c, 0x4a8c35, gx, gy + gh - 14, gw, 14);
      oval(c, gx + gw * 0.7, gy + gh - 15, 12, 9, 0x2f6a28);
      oval(c, gx + gw * 0.66, gy + gh - 18, 6, 4, 0x4f9a3c);
    }
    c.fillStyle = `rgba(255,255,255,${inside ? 0.28 : 0.35})`;
    c.beginPath();
    c.moveTo(gx + 4, gy + gh);
    c.lineTo(gx + 20, gy);
    c.lineTo(gx + 28, gy);
    c.lineTo(gx + 12, gy + gh);
    c.fill();
    // travessas
    fill(c, PAL.trim, w / 2 - 1.5, gy, 3, gh);
    fill(c, PAL.trim, gx, gy + gh * 0.45, gw, 3);
    fill(c, 0x000000, w / 2 + 1.5, gy, 1, gh, 0.25);
    fill(c, 0x000000, gx, gy + gh * 0.45 + 3, gw, 1, 0.25);
    inset(c, gx - 1, gy - 1, gw + 2, gh + 2);
    // cortinas (por dentro com cor; por fora só o forro claro)
    const cloth = inside ? curtain : 0xe6dfc9;
    for (const x of [gx - 2, gx + gw - 12]) {
      fill(c, cloth, x, gy - 2, 14, gh + 5);
      for (let i = 2; i < 14; i += 4) {
        fill(c, shade(cloth, 0.66), x + i, gy - 2, 1, gh + 5, 0.85);
        fill(c, shade(cloth, 1.25), x + i + 1, gy - 2, 1, gh + 5, 0.5);
      }
    }
    if (inside) {
      fill(c, shade(cloth, 0.8), gx - 4, gy - 5, gw + 8, 7);
      fill(c, 0xffffff, gx - 4, gy - 5, gw + 8, 1, 0.35);
      fill(c, 0x000000, gx - 4, gy + 2, gw + 8, 1, 0.3);
    }
    // peitoril
    fill(c, shade(PAL.trim, 1.05), 0, h - 8, w, 4);
    fill(c, 0x000000, 0, h - 4, w, 4, 0.3);
  };
}

// ---------- móveis ----------

const enamel: Painter = (c, w, h) => {
  fill(c, PAL.enamel);
  vshade(c, w, h, 0.14, 0.18);
};

const fridgeFront: Painter = (c, w, h) => {
  fill(c, PAL.enamel);
  const g = c.createLinearGradient(0, 0, w, 0);
  g.addColorStop(0, 'rgba(0,0,0,0.12)');
  g.addColorStop(0.2, 'rgba(255,255,255,0.22)');
  g.addColorStop(0.5, 'rgba(255,255,255,0)');
  g.addColorStop(1, 'rgba(0,0,0,0.16)');
  c.fillStyle = g;
  c.fillRect(0, 0, w, h);
  const split = 38;
  // portas
  for (const [y0, y1] of [[1, split - 1], [split + 1, h - 12]]) {
    c.strokeStyle = 'rgba(0,0,0,0.3)';
    c.strokeRect(1.5, y0 + 0.5, w - 3, y1 - y0);
    fill(c, 0xffffff, 3, y0 + 2, w - 6, 1, 0.6);
    fill(c, 0xffffff, 3, y0 + 2, 1, y1 - y0 - 3, 0.4);
  }
  fill(c, 0x6c7377, 0, split - 1, w, 2);
  // plaquinha da marca
  fill(c, 0x9aa3a8, w / 2 - 8, 6, 16, 4);
  fill(c, 0xd9483f, w / 2 - 6, 7, 4, 2);
  // ímãs e bilhetes
  fill(c, 0xfff3bf, 10, 52, 13, 15);
  line(c, 12, 56.5, 21, 56.5, 0x6a6a6a, 0.7);
  line(c, 12, 59.5, 20, 59.5, 0x6a6a6a, 0.7);
  line(c, 12, 62.5, 18, 62.5, 0x6a6a6a, 0.7);
  disc(c, 16.5, 52, 2, 0xd9483f);
  fill(c, 0xb9dcf0, 28, 60, 11, 9);
  fill(c, 0x4f9a3c, 28, 66, 11, 3);
  disc(c, 36, 62, 1.5, 0xf2d24a);
  fill(c, 0x3f8fd0, 12, 78, 5, 4);
  fill(c, 0x4fa864, 30, 82, 4, 4);
  disc(c, 22, 90, 2.5, 0xf2b632);
  // grade de baixo
  fill(c, 0x2f3135, 0, h - 11, w, 11);
  for (let y = h - 9; y < h; y += 2) line(c, 3, y + 0.5, w - 3, y + 0.5, 0x777b82, 0.9);
};

const stoveFront: Painter = (c, w, h) => {
  fill(c, PAL.enamel);
  vshade(c, w, h, 0.1, 0.16);
  // painel de botões
  fill(c, 0x2a2b30, 0, 0, w, 13);
  fill(c, 0xffffff, 0, 0, w, 1, 0.25);
  for (let i = 0; i < 4; i++) {
    const x = 9 + i * 11 + (i > 1 ? 14 : 0);
    disc(c, x, 6.5, 3.6, 0x9aa3a8);
    disc(c, x, 6.5, 2.6, 0xe9e4d6);
    fill(c, 0x2a2b30, x - 0.5, 3.5, 1, 3);
  }
  fill(c, 0x0f2a1e, 27, 3, 10, 7);
  fill(c, 0x4fe08a, 29, 5, 2, 3);
  fill(c, 0x4fe08a, 33, 5, 2, 3);
  // porta do forno com visor
  c.strokeStyle = 'rgba(0,0,0,0.3)';
  c.strokeRect(2.5, 16.5, w - 5, 36);
  fill(c, 0xffffff, 4, 18, w - 8, 1, 0.6);
  c.fillStyle = '#1a1d22';
  c.beginPath();
  c.roundRect(10, 26, w - 20, 20, 3);
  c.fill();
  c.fillStyle = 'rgba(255,255,255,0.22)';
  c.beginPath();
  c.moveTo(14, 46);
  c.lineTo(26, 26);
  c.lineTo(32, 26);
  c.lineTo(20, 46);
  c.fill();
  fill(c, 0x8a3a1c, 14, 41, w - 28, 2, 0.6);
  // gaveta
  c.strokeStyle = 'rgba(0,0,0,0.3)';
  c.strokeRect(2.5, 54.5, w - 5, 8);
  fill(c, 0x9aa3a8, w / 2 - 9, 57, 18, 2);
};

const stoveTop: Painter = (c, w, h) => {
  fill(c, PAL.enamel);
  bevel(c, 0, 0, w, h, 0.5, 0.25);
  const burner = (x: number, y: number, r: number) => {
    disc(c, x, y, r + 2.5, 0xb7bcc0);
    disc(c, x, y, r + 1.5, 0x1b1c20);
    for (let k = r; k > 1.5; k -= 2.4) {
      c.strokeStyle = css(0x55575e);
      c.lineWidth = 1.3;
      c.beginPath();
      c.arc(x, y, k, 0, Math.PI * 2);
      c.stroke();
    }
    disc(c, x, y, 1.6, 0x77797f);
    c.strokeStyle = 'rgba(255,255,255,0.25)';
    c.lineWidth = 1;
    c.beginPath();
    c.arc(x, y, r - 1, Math.PI * 1.1, Math.PI * 1.5);
    c.stroke();
  };
  burner(w * 0.27, h * 0.3, 8);
  burner(w * 0.73, h * 0.3, 10.5);
  burner(w * 0.27, h * 0.72, 10.5);
  burner(w * 0.73, h * 0.72, 8);
};

const counterFront: Painter = (c, w, h) => {
  fill(c, PAL.cabinet);
  vshade(c, w, h, 0.1, 0.2);
  const dark = shade(PAL.cabinet, 0.45);
  // gaveta em cima, duas portas embaixo
  for (let i = 0; i < 2; i++) {
    const x = i * (w / 2);
    c.strokeStyle = css(dark, 0.95);
    c.strokeRect(x + 1.5, 1.5, w / 2 - 3, 13);
    bevel(c, x + 3, 3, w / 2 - 6, 10, 0.3, 0.3);
    fill(c, PAL.chrome, x + w / 4 - 5, 7, 10, 2);
    fill(c, 0xffffff, x + w / 4 - 5, 7, 10, 1, 0.8);
    c.strokeStyle = css(dark, 0.95);
    c.strokeRect(x + 1.5, 17.5, w / 2 - 3, h - 24);
    inset(c, x + 6, 22, w / 2 - 12, h - 33);
    fill(c, 0xffffff, x + 8, 24, w / 2 - 16, h - 37, 0.08);
    const kx = i === 0 ? w / 2 - 5 : w / 2 + 5;
    disc(c, kx, 26, 2.2, shade(PAL.chrome, 0.6));
    disc(c, kx, 26, 1.6, PAL.chrome);
    disc(c, kx - 0.5, 25.5, 0.6, 0xffffff);
  }
  fill(c, 0x1d1b19, 0, h - 5, w, 5);
};

const laminate: Painter = (c, w, h, rnd) => {
  fill(c, PAL.laminate);
  speckle(c, w, h, rnd, 520, [0xcdbf9a, 0xf6f0dc, 0xa99a78, 0x8fa39c], 0.75);
  speckle(c, w, h, rnd, 50, [0x6f6a5c, 0xc87f4a], 0.7);
};

const doorsOak: Painter = (c, w, h, rnd) => {
  woodGrain(c, w, h, rnd, PAL.oak);
  panelDoors(c, w, h, PAL.oak, PAL.brass);
};

const doorsWhite: Painter = (c, w, h) => {
  fill(c, 0xece8da);
  vshade(c, w, h, 0.08, 0.14);
  panelDoors(c, w, h, 0xbdb8a8, PAL.chrome);
};

const duvet: Painter = (c, w, h) => {
  fill(c, PAL.duvet);
  for (let i = 0; i < w; i += 32) {
    fill(c, 0xfbf3d6, i + 9, 0, 10, h, 0.6);
    fill(c, 0xfbf3d6, 0, i + 9, w, 10, 0.6);
    fill(c, 0xc9541f, i + 25, 0, 2, h, 0.9);
    fill(c, 0xc9541f, 0, i + 25, w, 2, 0.9);
    fill(c, 0x7a3a16, i + 3, 0, 1, h, 0.5);
    fill(c, 0x7a3a16, 0, i + 3, w, 1, 0.5);
  }
  // costura do acolchoado
  for (let i = 0; i < w; i += 16) {
    for (let k = 0; k < w; k += 3) {
      fill(c, 0x000000, i, k, 1, 1, 0.16);
      fill(c, 0x000000, k, i, 1, 1, 0.16);
    }
  }
};

const fabric: Painter = (c, w, h, rnd) => {
  fill(c, 0xffffff);
  for (let y = 0; y < h; y += 2) {
    for (let x = 0; x < w; x += 2) {
      fill(c, 0x000000, x + ((y / 2) % 2 ? 1 : 0), y, 1, 1, 0.03 + rnd() * 0.07);
    }
  }
};

/** Reflexo de metal polido: faixas claras e escuras ao redor do tubo. */
const chrome: Painter = (c, w, h) => {
  const g = c.createLinearGradient(0, 0, w, 0);
  const stops: [number, string][] = [
    [0, '#5b646b'],
    [0.14, '#aeb9c0'],
    [0.3, '#f6fafb'],
    [0.4, '#c6d0d6'],
    [0.52, '#59626a'],
    [0.62, '#8f9aa2'],
    [0.8, '#dfe6ea'],
    [1, '#5b646b'],
  ];
  for (const [t, col] of stops) g.addColorStop(t, col);
  c.fillStyle = g;
  c.fillRect(0, 0, w, h);
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
  const greens = [0x2f8530, 0x3f9a3c, 0x256b29, 0x58ad48, 0x1f5a24];
  for (let i = 0; i < 7; i++) {
    c.strokeStyle = css(0x4d6a2c);
    c.lineWidth = 2;
    c.beginPath();
    c.moveTo(w / 2, h);
    c.quadraticCurveTo(w / 2 + (i - 3) * 7, h * 0.6, w / 2 + (i - 3) * 15, h * 0.22 + Math.abs(i - 3) * 9);
    c.stroke();
  }
  for (let i = 0; i < 56; i++) {
    const t = 0.12 + rnd() * 0.85;
    const side = rnd() * 2 - 1;
    const x = w / 2 + side * (w * 0.44) * (0.25 + t * 0.75);
    const y = h * (1 - t) * 0.84 + 8;
    const rot = side * 0.9 + (rnd() - 0.5) * 0.9 - Math.PI / 2;
    const color = greens[Math.floor(rnd() * greens.length)];
    const len = 11 + rnd() * 7;
    oval(c, x + 1, y + 1, len, 4 + rnd() * 2.5, shade(color, 0.55), 1, rot);
    oval(c, x, y, len, 4 + rnd() * 2.5, color, 1, rot);
    c.strokeStyle = css(shade(color, 1.45), 0.8);
    c.lineWidth = 1;
    c.beginPath();
    c.moveTo(x - Math.cos(rot) * len * 0.8, y - Math.sin(rot) * len * 0.8);
    c.lineTo(x + Math.cos(rot) * len * 0.8, y + Math.sin(rot) * len * 0.8);
    c.stroke();
  }
};

const treeLeaves: Painter = (c, w, h, rnd) => {
  fill(c, 0x2c6a2b);
  const tones = [0x3f8a36, 0x1f5223, 0x347a30, 0x58a544, 0x183f1c];
  for (let i = 0; i < 150; i++) {
    const col = tones[Math.floor(rnd() * tones.length)];
    oval(c, rnd() * w, rnd() * h, 2 + rnd() * 3, 1.2 + rnd() * 1.5, col, 0.85, rnd() * 3);
  }
  speckle(c, w, h, rnd, 60, [0x7cc25c], 0.7);
};

const bark: Painter = (c, w, h, rnd) => {
  fill(c, PAL.bark);
  for (let i = 0; i < 40; i++) {
    const x = rnd() * w;
    const y = rnd() * h;
    line(c, x, y, x + rnd() * 2 - 1, y + 6 + rnd() * 14, rnd() > 0.5 ? 0x3a2717 : 0x86603f, 0.7);
  }
  wrapShade(c, w, h, 0.25);
};

const flowers: Painter = (c, w, h, rnd) => {
  c.clearRect(0, 0, w, h);
  const blooms = [0xd9483f, 0xf2c744, 0xf3efe2, 0xc85fb0, 0xe8823a];
  for (let i = 0; i < 26; i++) {
    const x = 4 + rnd() * (w - 8);
    const top = h * (0.2 + rnd() * 0.45);
    line(c, x, h, x + rnd() * 6 - 3, top, 0x3f7a2e, 1, 1.5);
    oval(c, x + 3, (h + top) / 2, 5, 2, 0x2f6a28, 1, -0.6);
    oval(c, x - 3, (h + top) / 2 + 5, 5, 2, 0x4a8c35, 1, 0.6);
  }
  for (let i = 0; i < 26; i++) {
    const x = 5 + rnd() * (w - 10);
    const y = h * (0.12 + rnd() * 0.5);
    const col = blooms[Math.floor(rnd() * blooms.length)];
    disc(c, x, y, 3.6, shade(col, 0.7));
    disc(c, x - 0.5, y - 0.5, 3, col);
    disc(c, x, y, 1.1, 0xf6e27a);
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
  fill(c, 0xa9a494);
  speckle(c, w, h, rnd, 120, [0x8f8a7b, 0xc0bbab, 0x7d786a], 0.7);
  bevel(c, 0, 0, w, h, 0.4, 0.4);
};

/** Porta interna de madeira com almofadas. */
const door: Painter = (c, w, h, rnd) => {
  woodGrain(c, w, h, rnd, 0x8f5d33);
  c.strokeStyle = 'rgba(0,0,0,0.4)';
  c.strokeRect(0.5, 0.5, w - 1, h - 1);
  for (const [y0, hh] of [[8, 34], [48, 30], [84, 36]]) {
    for (const x0 of [6, w / 2 + 2]) {
      inset(c, x0, y0, w / 2 - 8, hh);
      fill(c, 0xffffff, x0 + 2, y0 + 2, w / 2 - 12, hh - 4, 0.06);
      bevel(c, x0 + 3, y0 + 3, w / 2 - 14, hh - 6, 0.16, 0.2);
    }
  }
  disc(c, w - 6, h * 0.52, 3, shade(PAL.brass, 0.6));
  disc(c, w - 6, h * 0.52, 2.3, PAL.brass);
  disc(c, w - 6.8, h * 0.52 - 0.8, 0.8, 0xffffff, 0.9);
};

/** Quadros de parede, cada um com sua moldura. */
function painting(kind: number): Painter {
  return (c, w, h, rnd) => {
    woodGrain(c, w, h, rnd, kind === 1 ? 0x3a2a1c : PAL.brass);
    bevel(c, 0, 0, w, h, 0.5, 0.45);
    fill(c, 0xf1ead6, 5, 5, w - 10, h - 10);
    const x = 8;
    const y = 8;
    const pw = w - 16;
    const ph = h - 16;
    c.save();
    c.beginPath();
    c.rect(x, y, pw, ph);
    c.clip();
    if (kind === 0) {
      // morros ao entardecer
      const g = c.createLinearGradient(0, y, 0, y + ph);
      g.addColorStop(0, '#f2a65a');
      g.addColorStop(0.6, '#f6d98a');
      c.fillStyle = g;
      c.fillRect(x, y, pw, ph);
      disc(c, x + pw * 0.7, y + ph * 0.42, 5, 0xfff2c0);
      oval(c, x + pw * 0.25, y + ph, pw * 0.5, ph * 0.5, 0x7a5a8a);
      oval(c, x + pw * 0.8, y + ph, pw * 0.45, ph * 0.38, 0x4f6a8a);
      fill(c, 0x2f5a3a, x, y + ph - 5, pw, 5);
    } else if (kind === 1) {
      // vaso com flores
      fill(c, 0x35524f, x, y, pw, ph);
      fill(c, 0x7a4a2c, x, y + ph - 8, pw, 8);
      oval(c, x + pw / 2, y + ph - 10, 6, 8, 0xd9c9a0);
      for (let i = 0; i < 9; i++) disc(c, x + pw / 2 + (rnd() - 0.5) * 22, y + 6 + rnd() * 12, 3, [0xd9483f, 0xf2c744, 0xf3efe2][i % 3]);
      for (let i = 0; i < 6; i++) oval(c, x + pw / 2 + (rnd() - 0.5) * 18, y + 14 + rnd() * 6, 4, 1.5, 0x3f8a36, 1, rnd() * 3);
    } else {
      // blocos de cor
      fill(c, 0xe9e1cc, x, y, pw, ph);
      fill(c, 0xc9382f, x + 3, y + 3, pw * 0.4, ph * 0.55);
      fill(c, 0x2c55a6, x + pw * 0.5, y + 3, pw * 0.45, ph * 0.3);
      fill(c, 0xe8b830, x + pw * 0.5, y + ph * 0.42, pw * 0.25, ph * 0.5);
      fill(c, 0x1f1b19, x + 3, y + ph * 0.68, pw * 0.4, ph * 0.24);
    }
    c.restore();
    inset(c, x - 1, y - 1, pw + 2, ph + 2);
  };
}

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

/**
 * Pele da cabeça, que dá a volta inteira (u = 0.5 é o centro do rosto).
 * O rosto é discreto, de proporção realista: os olhos ficam na altura do meio.
 */
function face(skinIdx: number, hairIdx: number, expr: Expression, eyesClosed: boolean): Painter {
  return (c, w, h) => {
    const skin = SKIN[skinIdx % SKIN.length];
    const hair = HAIR[hairIdx % HAIR.length];
    fill(c, skin);
    wrapShade(c, w, h, 0.2);
    const g = c.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, 'rgba(0,0,0,0.12)');
    g.addColorStop(0.3, 'rgba(255,255,255,0.05)');
    g.addColorStop(0.75, 'rgba(0,0,0,0)');
    g.addColorStop(1, 'rgba(0,0,0,0.3)');
    c.fillStyle = g;
    c.fillRect(0, 0, w, h);
    // couro cabeludo: alto da cabeça, nuca e costeletas já saem na cor do cabelo
    const top = h * 0.2;
    fill(c, hair, 0, 0, w, top);
    for (let x = 0; x < w; x += 2) fill(c, hair, x, top, 2, 1 + ((x * 7) % 5) * 0.7);
    fill(c, hair, 0, 0, w * 0.27, h * 0.66);
    fill(c, hair, w * 0.73, 0, w * 0.27, h * 0.66);
    fill(c, hair, w * 0.27, 0, w * 0.035, h * 0.5);
    fill(c, hair, w * 0.695, 0, w * 0.035, h * 0.5);
    fill(c, 0x000000, w * 0.27, top, w * 0.46, 2, 0.18);
    const cx = w / 2;
    const ey = h * 0.52;
    // corado das bochechas e sombra das órbitas
    oval(c, cx - 11, ey + 8, 5, 3.5, 0xd9655a, expr === 'happy' ? 0.38 : 0.2);
    oval(c, cx + 11, ey + 8, 5, 3.5, 0xd9655a, expr === 'happy' ? 0.38 : 0.2);
    for (const s of [-1, 1]) {
      const ex = cx + s * 7.5;
      oval(c, ex, ey - 0.5, 5.5, 3.6, shade(skin, 0.72), 0.45);
      if (eyesClosed) {
        line(c, ex - 3.2, ey + 0.5, ex + 3.2, ey + 0.5, 0x2a1d16, 1, 1.4);
      } else {
        oval(c, ex, ey, 3.4, expr === 'sad' ? 1.8 : 2.3, 0xf7f3ea);
        disc(c, ex + s * 0.2, ey + 0.1, 1.8, 0x33241a);
        fill(c, 0xffffff, Math.round(ex - 1), Math.round(ey - 1.3), 1, 1, 0.9);
        line(c, ex - 3.6, ey - 2.2, ex + 3.6, ey - 2.2, 0x2a1d16, 0.85, 1);
      }
      const tilt = expr === 'sad' ? -1.5 : expr === 'happy' ? 0.5 : 0;
      line(c, ex - 4.2, ey - 5.5 + s * tilt, ex + 4.2, ey - 5.5 - s * tilt, shade(hair, 0.85), 1, 1.8);
    }
    // sombra sob o nariz (o nariz mesmo é modelado) e narinas
    oval(c, cx, ey + 8.5, 3.2, 1.3, shade(skin, 0.62), 0.7);
    fill(c, shade(skin, 0.4), cx - 2, Math.round(ey + 8), 1, 1, 0.9);
    fill(c, shade(skin, 0.4), cx + 1, Math.round(ey + 8), 1, 1, 0.9);
    // lábio de baixo
    oval(c, cx, ey + 16.2, 3.6, 1.4, 0xb5625a, 0.55);
    // boca
    const my = ey + 15;
    c.strokeStyle = css(0x8a352f);
    c.lineWidth = 1.7;
    c.lineCap = 'round';
    c.beginPath();
    if (expr === 'happy') c.arc(cx, my - 5, 6, 0.2 * Math.PI, 0.8 * Math.PI);
    else if (expr === 'sad') c.arc(cx, my + 5, 5.5, 1.22 * Math.PI, 1.78 * Math.PI);
    else {
      c.moveTo(cx - 4, my);
      c.lineTo(cx + 4, my);
    }
    c.stroke();
    oval(c, cx, my + 3.5, 4, 1.2, shade(skin, 0.7), 0.4);
  };
}

/** Camisa que envolve o tronco (u = 0.5 é o centro do peito; a gola fica em cima). */
function clothPattern(c: Ctx, w: number, h: number, idx: number): number {
  const base = SHIRT[idx % SHIRT.length];
  fill(c, base);
  const style = idx % 3;
  {
    if (style === 1) {
      for (let y = 5; y < h; y += 10) {
        fill(c, 0xf3efe2, 0, y, w, 4, 0.9);
        fill(c, shade(base, 0.6), 0, y + 4, w, 1, 0.7);
      }
    } else if (style === 2) {
      for (let x = 0; x < w; x += 12) {
        fill(c, shade(base, 0.6), x, 0, 4, h, 0.6);
        fill(c, 0xffffff, x + 7, 0, 1, h, 0.5);
      }
      for (let y = 0; y < h; y += 12) {
        fill(c, shade(base, 0.6), 0, y, w, 4, 0.6);
        fill(c, 0xffffff, 0, y + 7, w, 1, 0.5);
      }
    } else {
      // estampa miúda
      for (let y = 8; y < h; y += 8) {
        for (let x = (y / 8) % 2 ? 2 : 6; x < w; x += 8) fill(c, shade(base, 1.5), x, y, 2, 2, 0.5);
      }
    }
  }
  return base;
}

function shirt(idx: number): Painter {
  return (c, w, h, rnd) => {
    const base = clothPattern(c, w, h, idx);
    const cx = w / 2;
    // dobras
    for (let i = 0; i < 9; i++) {
      const x = rnd() * w;
      line(c, x, h * 0.45 + rnd() * 10, x + rnd() * 6 - 3, h, shade(base, 0.6), 0.3, 1.5);
    }
    wrapShade(c, w, h, 0.3);
    // gola e botões
    const collar = shade(base, 1.3);
    fill(c, collar, 0, 0, w, 4);
    fill(c, 0x000000, 0, 4, w, 1, 0.3);
    c.fillStyle = css(collar);
    c.beginPath();
    c.moveTo(cx - 9, 0);
    c.lineTo(cx - 1, 12);
    c.lineTo(cx - 1, 0);
    c.moveTo(cx + 9, 0);
    c.lineTo(cx + 1, 12);
    c.lineTo(cx + 1, 0);
    c.fill();
    fill(c, shade(base, 0.62), cx - 0.5, 12, 1, h - 12, 0.9);
    for (let y = 18; y < h - 4; y += 10) {
      fill(c, 0xf7f3ea, cx - 1, y, 2, 2);
      fill(c, 0x000000, cx - 1, y + 2, 2, 1, 0.3);
    }
    // bolso no peito
    c.strokeStyle = css(shade(base, 0.55), 0.9);
    c.lineWidth = 1;
    c.strokeRect(cx + 5.5, 17.5, 7, 8);
    fill(c, shade(base, 1.3), cx + 6, 18, 6, 2, 0.8);
    vshade(c, w, h, 0.05, 0.22);
    fill(c, 0x000000, 0, h - 2, w, 2, 0.3);
  };
}

/** Quadril da calça: braguilha, bolsos da frente e de trás. */
function pelvis(idx: number): Painter {
  return (c, w, h, rnd) => {
    pants(idx)(c, w, h, rnd);
    const dark = shade(PANTS[idx % PANTS.length], 0.5);
    line(c, w / 2 + 0.5, h * 0.25, w / 2 + 0.5, h, dark, 0.9);
    line(c, w * 0.34, h * 0.3, w * 0.28, h * 0.62, dark, 0.9);
    line(c, w * 0.66, h * 0.3, w * 0.72, h * 0.62, dark, 0.9);
    c.strokeStyle = css(dark, 0.9);
    c.strokeRect(w * 0.06 + 0.5, h * 0.35 + 0.5, 4, 5);
    c.strokeRect(w * 0.94 - 4.5, h * 0.35 + 0.5, 4, 5);
  };
}

/** Tapete da sala, com borda e losangos. */
const rug: Painter = (c, w, h) => {
  fill(c, 0x8a2f2a);
  fill(c, 0xe3d2a6, 4, 4, w - 8, h - 8);
  fill(c, 0x2c4a7a, 7, 7, w - 14, h - 14);
  fill(c, 0x8a2f2a, 10, 10, w - 20, h - 20);
  for (let x = 20; x < w - 12; x += 16) {
    for (let y = 20; y < h - 12; y += 16) {
      c.fillStyle = css((x / 16 + y / 16) % 2 ? 0xe3d2a6 : 0xd9a441);
      c.beginPath();
      c.moveTo(x, y - 6);
      c.lineTo(x + 6, y);
      c.lineTo(x, y + 6);
      c.lineTo(x - 6, y);
      c.fill();
      fill(c, 0x2c4a7a, x - 1, y - 1, 2, 2);
    }
  }
  for (let y = 1; y < h; y += 3) {
    fill(c, 0xe3d2a6, 0, y, 3, 1);
    fill(c, 0xe3d2a6, w - 3, y, 3, 1);
  }
};

const doormat: Painter = (c, w, h, rnd) => {
  fill(c, 0x8a6a3c);
  speckle(c, w, h, rnd, 260, [0x6a4f2a, 0xa9854f, 0x5a4020], 0.8);
  c.strokeStyle = css(0x3a2a16);
  c.lineWidth = 2;
  c.strokeRect(3, 3, w - 6, h - 6);
};

const clock: Painter = (c, w, h) => {
  fill(c, 0xc9382f);
  bevel(c, 0, 0, w, h, 0.4, 0.4);
  disc(c, w / 2, h / 2, w * 0.4, 0x2a1d14);
  disc(c, w / 2, h / 2, w * 0.36, 0xf4efdf);
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    fill(c, 0x2a1d14, Math.round(w / 2 + Math.cos(a) * w * 0.3 - 0.5), Math.round(h / 2 + Math.sin(a) * h * 0.3 - 0.5), 1, 1);
  }
  line(c, w / 2, h / 2, w / 2 + 5, h / 2 - 3, 0x2a1d14, 1, 1.5);
  line(c, w / 2, h / 2, w / 2 - 2, h / 2 - 9, 0x2a1d14, 1, 1);
  disc(c, w / 2, h / 2, 1.2, 0xc9382f);
};

const carGlass: Painter = (c, w, h) => {
  const g = c.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, '#9fc4d6');
  g.addColorStop(1, '#2f4a5c');
  c.fillStyle = g;
  c.fillRect(0, 0, w, h);
  c.fillStyle = 'rgba(255,255,255,0.35)';
  c.beginPath();
  c.moveTo(2, h);
  c.lineTo(10, 0);
  c.lineTo(15, 0);
  c.lineTo(7, h);
  c.fill();
};

/** Manga curta: a mesma estampa da camisa, com a barra embaixo. */
function sleeve(idx: number): Painter {
  return (c, w, h) => {
    const base = clothPattern(c, w, h, idx);
    wrapShade(c, w, h, 0.3);
    fill(c, shade(base, 0.6), 0, h - 3, w, 3, 0.7);
    fill(c, 0xffffff, 0, h - 4, w, 1, 0.15);
  };
}

/** Calça: vinco na frente, costura nos lados. */
function pants(idx: number): Painter {
  return (c, w, h, rnd) => {
    const base = PANTS[idx % PANTS.length];
    fill(c, base);
    for (let i = 0; i < 6; i++) {
      const x = rnd() * w;
      line(c, x, rnd() * h, x + rnd() * 4 - 2, h, shade(base, 0.7), 0.35, 1.5);
    }
    wrapShade(c, w, h, 0.3);
    fill(c, 0xffffff, w / 2, 0, 1, h, 0.14);
    fill(c, 0x000000, w * 0.25, 0, 1, h, 0.3);
    fill(c, 0x000000, w * 0.75, 0, 1, h, 0.3);
  };
}

/** Cabelo: fios descendo do alto da cabeça. */
function hairTex(idx: number): Painter {
  return (c, w, h, rnd) => {
    const base = HAIR[idx % HAIR.length];
    fill(c, base);
    for (let i = 0; i < 70; i++) {
      const x = rnd() * w;
      line(c, x, 0, x + rnd() * 6 - 3, h, rnd() > 0.45 ? shade(base, 1.5) : shade(base, 0.6), 0.5);
    }
    vshade(c, w, h, 0.16, 0.2);
  };
}

/** Pele lisa dos braços e do pescoço, com um leve volume. */
function skinTex(idx: number): Painter {
  return (c, w, h) => {
    fill(c, SKIN[idx % SKIN.length]);
    wrapShade(c, w, h, 0.2);
  };
}

// ---------- registro ----------

const SPECS: Record<string, Spec> = {
  grass: { w: 128, h: 128, paint: grass, repeat: true, grain: 9 },
  wood: { w: 128, h: 128, paint: wood, repeat: true, grain: 6 },
  carpet: { w: 64, h: 64, paint: carpet, repeat: true, grain: 10 },
  tile: { w: 64, h: 64, paint: tile, repeat: true, grain: 4 },
  kitchen: { w: 128, h: 128, paint: kitchen, repeat: true, grain: 8 },
  road: { w: 64, h: 64, paint: road, repeat: true, grain: 8 },
  sidewalk: { w: 64, h: 64, paint: sidewalk, repeat: true, grain: 7 },
  wallLiving: { w: 64, h: 160, paint: wallLiving, grain: 5 },
  wallBedroom: { w: 64, h: 160, paint: wallBedroom, grain: 5 },
  wallBath: { w: 64, h: 160, paint: wallBath, grain: 4 },
  wallKitchen: { w: 64, h: 160, paint: wallKitchen, grain: 5 },
  wallExterior: { w: 64, h: 160, paint: wallExterior, grain: 9 },
  windowOut: { w: 64, h: 96, paint: windowTex(false, 0), grain: 3 },
  'windowIn:wood': { w: 64, h: 96, paint: windowTex(true, 0xb5322c), grain: 3 },
  'windowIn:carpet': { w: 64, h: 96, paint: windowTex(true, 0xd8b04a), grain: 3 },
  'windowIn:tile': { w: 64, h: 96, paint: windowTex(true, 0xeef0ea), grain: 3 },
  'windowIn:kitchen': { w: 64, h: 96, paint: windowTex(true, 0x2f8a86), grain: 3 },
  enamel: { w: 32, h: 32, paint: enamel, grain: 2 },
  fridgeFront: { w: 64, h: 128, paint: fridgeFront, grain: 2 },
  stoveFront: { w: 64, h: 64, paint: stoveFront, grain: 2 },
  stoveTop: { w: 64, h: 64, paint: stoveTop, grain: 2 },
  counterFront: { w: 64, h: 64, paint: counterFront, grain: 3 },
  laminate: { w: 64, h: 64, paint: laminate, repeat: true, grain: 5 },
  oak: { w: 64, h: 64, paint: (c, w, h, r) => woodGrain(c, w, h, r, PAL.oak), grain: 5 },
  walnut: { w: 64, h: 64, paint: (c, w, h, r) => woodGrain(c, w, h, r, PAL.walnut), grain: 5 },
  pine: { w: 64, h: 64, paint: (c, w, h, r) => woodGrain(c, w, h, r, PAL.pine), grain: 5 },
  doorsOak: { w: 64, h: 64, paint: doorsOak, grain: 4 },
  doorsWhite: { w: 64, h: 64, paint: doorsWhite, grain: 3 },
  duvet: { w: 64, h: 64, paint: duvet, repeat: true, grain: 7 },
  fabric: { w: 32, h: 32, paint: fabric, repeat: true, grain: 5 },
  chrome: { w: 32, h: 4, paint: chrome, grain: 0 },
  tvOff: { w: 96, h: 80, paint: scaled(tvFront(-1), 2), grain: 3 },
  tvOn0: { w: 96, h: 80, paint: scaled(tvFront(0), 2), grain: 6 },
  tvOn1: { w: 96, h: 80, paint: scaled(tvFront(1), 2), grain: 6 },
  tvOn2: { w: 96, h: 80, paint: scaled(tvFront(2), 2), grain: 6 },
  books: { w: 128, h: 128, paint: books, grain: 5 },
  speakerFront: { w: 64, h: 128, paint: scaled(speakerFront, 2), grain: 4 },
  deckFront: { w: 64, h: 24, paint: scaled(deckFront, 2), grain: 3 },
  leaves: { w: 128, h: 128, paint: leaves, grain: 8 },
  treeLeaves: { w: 64, h: 64, paint: treeLeaves, repeat: true, grain: 9 },
  bark: { w: 32, h: 64, paint: bark, grain: 8 },
  flowers: { w: 64, h: 64, paint: flowers, grain: 6 },
  lampShade: { w: 32, h: 32, paint: scaled(lampShade, 2), grain: 4 },
  mirror: { w: 64, h: 96, paint: scaled(mirror, 2), grain: 2 },
  picket: { w: 64, h: 64, paint: scaled(picket, 2), repeat: true, grain: 5 },
  'houseWall:0': { w: 128, h: 96, paint: scaled(houseWall(0xcf9f8f), 2), grain: 7 },
  'houseWall:1': { w: 128, h: 96, paint: scaled(houseWall(0xa9c29a), 2), grain: 7 },
  'houseWall:2': { w: 128, h: 96, paint: scaled(houseWall(0xd9c486), 2), grain: 7 },
  roof: { w: 64, h: 64, paint: scaled(roof, 2), repeat: true, grain: 9 },
  stone: { w: 32, h: 32, paint: stone, grain: 8 },
  door: { w: 48, h: 128, paint: door, grain: 4 },
  'painting:0': { w: 64, h: 48, paint: painting(0), grain: 5 },
  'painting:1': { w: 64, h: 48, paint: painting(1), grain: 5 },
  'painting:2': { w: 64, h: 48, paint: painting(2), grain: 5 },
  rug: { w: 128, h: 80, paint: rug, grain: 9 },
  doormat: { w: 48, h: 32, paint: doormat, grain: 9 },
  clock: { w: 32, h: 32, paint: clock, grain: 2 },
  carGlass: { w: 32, h: 16, paint: carGlass, grain: 2 },
  blob: { w: 32, h: 32, paint: blob, grain: 0, smooth: true },
  zzz: { w: 32, h: 32, paint: zzz, grain: 0, smooth: true },
};

function specFor(name: string): Spec | undefined {
  if (SPECS[name]) return SPECS[name];
  const parts = name.split(':');
  const n = Number(parts[1]);
  switch (parts[0]) {
    case 'face':
      return { w: 128, h: 64, paint: face(n, Number(parts[2]), parts[3] as Expression, parts[4] === '1'), grain: 3 };
    case 'shirt':
      return { w: 64, h: 64, paint: shirt(n), grain: 7 };
    case 'sleeve':
      return { w: 32, h: 16, paint: sleeve(n), grain: 7 };
    case 'pelvis':
      return { w: 32, h: 32, paint: pelvis(n), grain: 7 };
    case 'pants':
      return { w: 32, h: 32, paint: pants(n), grain: 7 };
    case 'hair':
      return { w: 32, h: 32, paint: hairTex(n), grain: 8 };
    case 'skin':
      return { w: 16, h: 16, paint: skinTex(n), grain: 3 };
    default:
      return undefined;
  }
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
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
  const rnd = seeded(hashName(name));
  spec.paint(ctx, spec.w, spec.h, rnd);
  const grain = spec.grain ?? 7;
  if (grain > 0) grainPass(ctx, spec.w, spec.h, rnd, grain);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  // de perto os pixels da textura aparecem nítidos, sem borrão
  tex.magFilter = spec.smooth ? THREE.LinearFilter : THREE.NearestFilter;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.anisotropy = 4;
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
