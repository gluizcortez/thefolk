import * as THREE from 'three';
import { GARMENTS, pieceStyle } from '../../sim/clothes';
import type { GarmentDef, Piece } from '../../sim/clothes';
import { MATERIALS } from '../../sim/style';
import type { PartStyle, PatternId } from '../../sim/style';
import { colorMat, texMat } from './build';
import { finishSpec, partColor } from './finish';
import { css, seeded, shade } from './palette';

// Plano 2, bloco 9: pintura das roupas por peças. Cada peça vira texturas
// por parte do corpo (tronco, manga, quadril, perna, saia), com o tecido
// escolhido (trama e padrão do bloco 8, na cor da área) e os detalhes do
// modelo (gola, botões, bolso, punho, listra, alça) na cor da área de
// acabamento. Nome: garb:peça:parte:área1~área2... (área = mat.cor.padrão).

type Ctx = CanvasRenderingContext2D;
type Rnd = () => number;
export type GarbPart = 'torso' | 'sleeve' | 'hip' | 'leg' | 'skirt';

function zoneCode(p: PartStyle): string {
  return `${p.mat}.${p.color ?? ''}.${p.pattern ?? ''}`;
}

function parseZone(code: string | undefined): PartStyle | undefined {
  if (!code) return undefined;
  const [mat, color, pattern] = code.split('.');
  if (!mat) return undefined;
  return { mat, ...(color ? { color } : {}), ...(pattern ? { pattern: pattern as PatternId } : {}) };
}

/** Nome da textura de uma parte de uma peça. */
export function garbTexture(piece: Piece, part: GarbPart): string {
  const g = GARMENTS[piece.g];
  const st = pieceStyle(piece);
  const zones = (g?.zones ?? []).map((z) => zoneCode(st[z.id] ?? z.base)).join('~');
  return `garb:${piece.g}:${part}:${zones}`;
}

/** Material da parte de uma peça (tecido com padrão e detalhes). */
export function garbMat(piece: Piece, part: GarbPart): THREE.MeshPhongMaterial {
  const st = pieceStyle(piece);
  const main = st.main;
  const gloss = main ? (MATERIALS[main.mat]?.gloss ?? 0) * 0.6 : 0;
  return texMat(garbTexture(piece, part), { gloss });
}

/** Material liso da área de uma peça (sapato, chapéu, brinco, relógio). */
export function zoneMat(piece: Piece, zone: string, fallback = 0x888888): THREE.MeshPhongMaterial {
  const p = pieceStyle(piece)[zone];
  if (!p) return colorMat(fallback);
  return colorMat(partColor(p), { gloss: MATERIALS[p.mat]?.gloss ?? 0.2 });
}

/** Cor de uma área (para a interface e o retrato). */
export function zoneColor(piece: Piece | undefined, zone = 'main'): number | undefined {
  if (!piece) return undefined;
  const p = pieceStyle(piece)[zone];
  return p ? partColor(p) : undefined;
}

// ---------- pintura ----------

const tiles = new Map<string, HTMLCanvasElement>();

/** Ladrilho cinza do tecido (trama e padrão), que a cor multiplica. */
function tileFor(p: PartStyle): HTMLCanvasElement {
  const mat = MATERIALS[p.mat];
  const pat = mat?.patterns && p.pattern ? p.pattern : 'plain';
  const key = `${p.mat}:${pat}`;
  const hit = tiles.get(key);
  if (hit) return hit;
  const canvas = document.createElement('canvas');
  const spec = mat?.family === 'fabric' ? finishSpec(p.mat, pat) : undefined;
  canvas.width = spec?.w ?? 8;
  canvas.height = spec?.h ?? 8;
  const c = canvas.getContext('2d')!;
  if (spec) spec.paint(c, canvas.width, canvas.height, seeded(key.length * 977 + 13));
  else {
    c.fillStyle = mat?.family === 'metal' ? '#e8e8e8' : '#f4f4f4';
    c.fillRect(0, 0, canvas.width, canvas.height);
  }
  tiles.set(key, canvas);
  return canvas;
}

/** Pinta o tecido da área num recorte (o caminho já traçado em `shape`). */
function cloth(c: Ctx, p: PartStyle, shape?: (c: Ctx) => void): void {
  const { width: w, height: h } = c.canvas;
  c.save();
  if (shape) {
    c.beginPath();
    shape(c);
    c.clip();
  }
  const pattern = c.createPattern(tileFor(p), 'repeat');
  if (pattern) {
    c.fillStyle = pattern;
    c.fillRect(0, 0, w, h);
  }
  c.globalCompositeOperation = 'multiply';
  c.fillStyle = css(partColor(p));
  c.fillRect(0, 0, w, h);
  c.restore();
}

function fill(c: Ctx, color: number, x: number, y: number, w: number, h: number, a = 1): void {
  c.fillStyle = css(color, a);
  c.fillRect(x, y, w, h);
}

function line(c: Ctx, x0: number, y0: number, x1: number, y1: number, color: number, a = 1, width = 1): void {
  c.strokeStyle = css(color, a);
  c.lineWidth = width;
  c.beginPath();
  c.moveTo(x0, y0);
  c.lineTo(x1, y1);
  c.stroke();
}

function wrapShade(c: Ctx, w: number, h: number, dark = 0.26): void {
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

function vshade(c: Ctx, w: number, h: number): void {
  const g = c.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, 'rgba(255,255,255,0.06)');
  g.addColorStop(0.5, 'rgba(255,255,255,0)');
  g.addColorStop(1, 'rgba(0,0,0,0.2)');
  c.fillStyle = g;
  c.fillRect(0, 0, w, h);
}

/** Dobras soltas do tecido. */
function folds(c: Ctx, w: number, h: number, rnd: Rnd, base: number, n: number): void {
  for (let i = 0; i < n; i++) {
    const x = rnd() * w;
    line(c, x, h * 0.4 + rnd() * h * 0.2, x + rnd() * 6 - 3, h, shade(base, 0.6), 0.25, 1.5);
  }
}

function buttons(c: Ctx, x: number, from: number, to: number, step: number, color: number): void {
  for (let y = from; y < to; y += step) {
    fill(c, color, x - 1, y, 2, 2);
    fill(c, 0x000000, x - 1, y + 2, 2, 1, 0.3);
  }
}

/** Uma área "V" na frente do tronco (decote, camisa por baixo do paletó). */
function vee(cx: number, depth: number, half: number): (c: Ctx) => void {
  return (c) => {
    c.moveTo(cx - half, 0);
    c.lineTo(cx, depth);
    c.lineTo(cx + half, 0);
    c.closePath();
  };
}

function torso(c: Ctx, w: number, h: number, rnd: Rnd, g: GarmentDef, z: (id: string) => PartStyle | undefined): void {
  const main = z('main')!;
  const trim = z('trim') ?? main;
  const base = partColor(main);
  const tc = partColor(trim);
  const cx = w / 2;
  if (g.id === 'overalls') {
    // camiseta por baixo; o peitilho e as alças da jardineira por cima
    cloth(c, z('inner') ?? main);
    cloth(c, main, (k) => {
      k.rect(cx - 12, 22, 24, h - 22);
      k.rect(0, 40, w, h - 40);
      k.rect(cx - 12, 0, 5, 24);
      k.rect(cx + 7, 0, 5, 24);
      k.rect(4, 0, 5, 42);
      k.rect(w - 9, 0, 5, 42);
    });
    const metal = z('metal');
    const m = metal ? partColor(metal) : 0xc29a3e;
    fill(c, m, cx - 11, 23, 3, 3);
    fill(c, m, cx + 8, 23, 3, 3);
    c.strokeStyle = css(shade(base, 0.55), 0.9);
    c.strokeRect(cx - 6.5, 28.5, 13, 9);
    wrapShade(c, w, h);
    vshade(c, w, h);
    return;
  }
  cloth(c, main);
  folds(c, w, h, rnd, base, g.id === 'blazer' || g.id === 'coat' ? 4 : 8);
  switch (g.neck) {
    case 'crew':
      fill(c, tc, 0, 0, w, 3);
      fill(c, 0x000000, 0, 3, w, 1, 0.2);
      break;
    case 'collar':
      fill(c, tc, 0, 0, w, 4);
      fill(c, 0x000000, 0, 4, w, 1, 0.3);
      c.fillStyle = css(tc);
      c.beginPath();
      c.moveTo(cx - 9, 0);
      c.lineTo(cx - 1, 12);
      c.lineTo(cx - 1, 0);
      c.moveTo(cx + 9, 0);
      c.lineTo(cx + 1, 12);
      c.lineTo(cx + 1, 0);
      c.fill();
      fill(c, shade(base, 0.62), cx - 0.5, 12, 1, g.id === 'polo' ? 14 : h - 12, 0.9);
      buttons(c, cx, 16, g.id === 'polo' ? 26 : h - 4, 10, g.id === 'pjtop' ? tc : 0xf7f3ea);
      break;
    case 'scoop':
      c.save();
      c.beginPath();
      c.ellipse(cx, 0, 11, 9, 0, 0, Math.PI);
      c.lineWidth = 3;
      c.strokeStyle = css(tc);
      c.stroke();
      c.restore();
      break;
    case 'vee': {
      cloth(c, z('inner') ?? trim, vee(cx, 24, 10));
      line(c, cx - 10, 0, cx, 24, tc, 1, 2);
      line(c, cx + 10, 0, cx, 24, tc, 1, 2);
      if (g.id === 'cardigan') buttons(c, cx, 28, h - 4, 9, tc);
      break;
    }
    case 'lapel': {
      cloth(c, z('inner') ?? trim, vee(cx, 28, 10));
      if (g.id === 'blazer') {
        const tie = z('tie');
        if (tie)
          cloth(c, tie, (k) => {
            k.moveTo(cx - 2, 3);
            k.lineTo(cx + 2, 3);
            k.lineTo(cx + 3, 22);
            k.lineTo(cx, 26);
            k.lineTo(cx - 3, 22);
            k.closePath();
          });
        buttons(c, cx, 32, 46, 12, shade(base, 0.55));
      } else {
        // casaco trespassado: duas fileiras de botões e cinto
        for (const dx of [-5, 5]) buttons(c, cx + dx, 32, h - 10, 10, tc);
        fill(c, shade(base, 0.8), 0, h - 8, w, 4);
      }
      line(c, cx - 10, 0, cx, 28, shade(base, 0.5), 1, 1.5);
      line(c, cx + 10, 0, cx, 28, shade(base, 0.5), 1, 1.5);
      fill(c, shade(base, 1.35), cx + 9, 18, 6, 2, 0.8);
      break;
    }
    case 'hood':
      fill(c, tc, cx - 4, 2, 1, 10);
      fill(c, tc, cx + 3, 2, 1, 10);
      // bolso canguru
      fill(c, shade(base, 0.85), cx - 12, h - 22, 24, 14);
      line(c, cx - 12, h - 22, cx + 12, h - 22, shade(base, 0.55), 0.8);
      fill(c, tc, 0, h - 4, w, 4, 0.7);
      break;
    case 'high':
      fill(c, tc, 0, 0, w, 4);
      fill(c, tc, cx - 1, 0, 2, h);
      fill(c, shade(base, 0.6), cx - 0.5, 0, 1, h, 0.7);
      for (const x of [cx - 20, cx + 18]) fill(c, tc, x, 6, 2, h - 6, 0.85);
      break;
  }
  if (g.id === 'shirt' || g.id === 'longshirt') {
    c.strokeStyle = css(shade(base, 0.55), 0.9);
    c.lineWidth = 1;
    c.strokeRect(cx + 5.5, 17.5, 7, 8);
    fill(c, shade(base, 1.3), cx + 6, 18, 6, 2, 0.8);
  }
  if (g.id === 'kidtee') {
    // estrela no peito
    c.fillStyle = css(tc);
    c.beginPath();
    for (let i = 0; i < 10; i++) {
      const r = i % 2 ? 3 : 8;
      const a = -Math.PI / 2 + (i * Math.PI) / 5;
      c.lineTo(cx + Math.cos(a) * r, 24 + Math.sin(a) * r);
    }
    c.fill();
  }
  if (g.id === 'sweater') {
    for (let x = 2; x < w; x += 4) fill(c, shade(base, 0.8), x, 4, 1, h - 10, 0.35);
    fill(c, tc, 0, h - 6, w, 6, 0.9);
    for (let x = 0; x < w; x += 2) fill(c, shade(tc, 0.7), x, h - 6, 1, 6, 0.5);
  }
  if (g.slot === 'full' && g.id !== 'swimsuit' && g.id !== 'robe') fill(c, tc, 0, h - 8, w, 3, 0.9);
  if (g.id === 'robe') fill(c, tc, 0, h - 10, w, 5);
  if (g.id === 'swimsuit') for (const x of [cx - 22, cx + 20]) fill(c, tc, x, 0, 2, h, 0.9);
  if (g.id === 'tracktop') fill(c, tc, 0, h - 4, w, 4, 0.8);
  wrapShade(c, w, h);
  vshade(c, w, h);
  if (g.slot === 'top' && !g.long) fill(c, 0x000000, 0, h - 2, w, 2, 0.25);
}

function sleeve(c: Ctx, w: number, h: number, g: GarmentDef, z: (id: string) => PartStyle | undefined): void {
  const main = (g.id === 'overalls' ? z('inner') : z('main')) ?? z('main')!;
  const trim = z('trim') ?? main;
  const base = partColor(main);
  cloth(c, main);
  wrapShade(c, w, h, 0.3);
  if (g.id === 'tracktop') {
    fill(c, partColor(trim), 0, 0, 2, h);
    fill(c, partColor(trim), 4, 0, 1, h);
  }
  const cuffed = g.id === 'sweater' || g.id === 'hoodie' || g.id === 'cardigan' || g.id === 'tracktop' || g.id === 'pjtop';
  if (cuffed && g.sleeve === 'long') fill(c, partColor(trim), 0, h - 3, w, 3);
  else fill(c, shade(base, 0.6), 0, h - 3, w, 3, 0.6);
  fill(c, 0xffffff, 0, h - 4, w, 1, 0.12);
}

function hip(c: Ctx, w: number, h: number, rnd: Rnd, g: GarmentDef, z: (id: string) => PartStyle | undefined): void {
  const main = z('main')!;
  const trim = z('trim');
  const base = partColor(main);
  const dark = shade(base, 0.5);
  cloth(c, main);
  folds(c, w, h, rnd, base, 4);
  wrapShade(c, w, h, 0.3);
  if (g.id === 'jeans') {
    const st = trim ? partColor(trim) : 0xd9a22e;
    line(c, w / 2 + 0.5, h * 0.25, w / 2 + 0.5, h, dark, 0.9);
    line(c, w * 0.34, h * 0.3, w * 0.28, h * 0.62, st, 0.8);
    line(c, w * 0.66, h * 0.3, w * 0.72, h * 0.62, st, 0.8);
    c.strokeStyle = css(st, 0.8);
    c.strokeRect(w * 0.06 + 0.5, h * 0.35 + 0.5, 4, 5);
    c.strokeRect(w * 0.94 - 4.5, h * 0.35 + 0.5, 4, 5);
  } else if (g.id === 'slacks') {
    line(c, w / 2 + 0.5, h * 0.25, w / 2 + 0.5, h, dark, 0.9);
    line(c, w * 0.34, h * 0.3, w * 0.3, h * 0.5, dark, 0.7);
    line(c, w * 0.66, h * 0.3, w * 0.7, h * 0.5, dark, 0.7);
  } else if (g.id === 'overalls') {
    c.strokeStyle = css(dark, 0.9);
    c.strokeRect(w * 0.3 + 0.5, h * 0.3 + 0.5, 8, 7);
  } else if (g.id === 'robe' && trim) {
    fill(c, partColor(trim), 0, 2, w, 4);
  }
  if (trim && (g.id === 'shorts' || g.id === 'trunks' || g.id === 'trackpants' || g.id === 'skirt' || g.id === 'longskirt')) fill(c, partColor(trim), 0, 0, w, 4);
  if (trim && g.id === 'trackpants') for (const x of [w * 0.25, w * 0.75]) fill(c, partColor(trim), x - 1, 0, 2, h);
  if (trim && g.id === 'trunks') for (const x of [w * 0.25, w * 0.75]) fill(c, partColor(trim), x - 1, 0, 2, h, 0.9);
}

function leg(c: Ctx, w: number, h: number, rnd: Rnd, g: GarmentDef, z: (id: string) => PartStyle | undefined): void {
  const main = z('main')!;
  const trim = z('trim');
  const base = partColor(main);
  cloth(c, main);
  folds(c, w, h, rnd, base, 5);
  wrapShade(c, w, h, 0.3);
  if (g.id === 'slacks') fill(c, 0xffffff, w / 2, 0, 1, h, 0.16);
  if (g.id === 'jeans' && trim) {
    fill(c, partColor(trim), w * 0.25, 0, 1, h, 0.6);
    fill(c, partColor(trim), w * 0.75, 0, 1, h, 0.6);
  } else {
    fill(c, 0x000000, w * 0.25, 0, 1, h, 0.25);
    fill(c, 0x000000, w * 0.75, 0, 1, h, 0.25);
  }
  if (g.id === 'trackpants' && trim) for (const x of [w * 0.25, w * 0.75]) fill(c, partColor(trim), x - 1, 0, 2, h);
  if (g.id === 'trackpants' || g.id === 'pjpants') fill(c, shade(base, 0.7), 0, h - 3, w, 3, 0.7);
}

function skirt(c: Ctx, w: number, h: number, rnd: Rnd, g: GarmentDef, z: (id: string) => PartStyle | undefined): void {
  const main = z('main')!;
  const trim = z('trim') ?? main;
  const base = partColor(main);
  cloth(c, main);
  // pregas
  for (let x = 0; x < w; x += 4) fill(c, shade(base, 0.7), x, 0, 1, h, 0.3 + rnd() * 0.15);
  wrapShade(c, w, h, 0.3);
  fill(c, partColor(trim), 0, h - 3, w, 3, g.id === 'coat' ? 0.3 : 0.9);
  vshade(c, w, h);
}

/** Textura garb:... (chamada por textures.ts). */
export function garbSpec(parts: string[]): { w: number; h: number; grain: number; paint: (c: Ctx, w: number, h: number, rnd: Rnd) => void } | undefined {
  const g = GARMENTS[parts[1]];
  if (!g) return undefined;
  const part = parts[2] as GarbPart;
  const codes = (parts[3] ?? '').split('~');
  const byZone = new Map<string, PartStyle>();
  g.zones.forEach((zd, i) => byZone.set(zd.id, parseZone(codes[i]) ?? zd.base));
  const z = (id: string) => byZone.get(id);
  switch (part) {
    case 'torso':
      return { w: 64, h: 64, grain: 6, paint: (c, w, h, r) => torso(c, w, h, r, g, z) };
    case 'sleeve':
      return { w: 32, h: 16, grain: 6, paint: (c, w, h) => sleeve(c, w, h, g, z) };
    case 'hip':
      return { w: 32, h: 32, grain: 6, paint: (c, w, h, r) => hip(c, w, h, r, g, z) };
    case 'leg':
      return { w: 32, h: 32, grain: 6, paint: (c, w, h, r) => leg(c, w, h, r, g, z) };
    case 'skirt':
      return { w: 64, h: 32, grain: 6, paint: (c, w, h, r) => skirt(c, w, h, r, g, z) };
    default:
      return undefined;
  }
}
