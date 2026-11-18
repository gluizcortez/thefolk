import * as THREE from 'three';
import type { MessKind, ObjectState } from '../../sim/types';
import { box, colorMat, cyl, setShadows } from './build';
import { seeded } from './palette';

// Bloco 1, casa viva: o que aparece quando a casa suja e as coisas quebram.
// Pratos sujos, poças brilhantes e lixo no chão; manchas e moscas em objeto
// sujo; fumacinha e faísca em objeto quebrado; fita isolante no remendado.
// Tudo desenhado em canvas pequeno com pixels nítidos, como o resto.

const cache = new Map<string, THREE.CanvasTexture>();

function pixelTexture(key: string, size: number, paint: (ctx: CanvasRenderingContext2D, rnd: () => number) => void): THREE.CanvasTexture {
  const hit = cache.get(key);
  if (hit) return hit;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  paint(ctx, seeded(key.length * 977 + size));
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.NearestFilter;
  tex.generateMipmaps = false;
  cache.set(key, tex);
  return tex;
}

/** Mancha irregular, desenhada pixel a pixel com borda pontilhada. */
function blotch(ctx: CanvasRenderingContext2D, size: number, rnd: () => number, color: string, edge: string): void {
  const c = size / 2;
  const lobes = Array.from({ length: 5 }, () => ({ a: rnd() * Math.PI * 2, r: 0.55 + rnd() * 0.35 }));
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = (x + 0.5 - c) / c;
      const dy = (y + 0.5 - c) / c;
      const a = Math.atan2(dy, dx);
      let r = 0.5;
      for (const l of lobes) r += 0.12 * l.r * Math.cos(a - l.a) ** 4;
      const d = Math.hypot(dx, dy);
      if (d > r) continue;
      // borda em pontilhado, como as cores de 16 bits do resto da cena
      const rim = d > r - 0.16;
      if (rim && (x + y) % 2 === 0) continue;
      ctx.fillStyle = rim ? edge : color;
      ctx.fillRect(x, y, 1, 1);
    }
  }
}

const stainTex = () =>
  pixelTexture('stain', 24, (ctx, rnd) => blotch(ctx, 24, rnd, 'rgba(78,58,30,0.7)', 'rgba(96,74,40,0.55)'));

const puddleTex = () =>
  pixelTexture('puddle', 32, (ctx, rnd) => {
    blotch(ctx, 32, rnd, 'rgba(120,178,214,0.62)', 'rgba(160,206,232,0.55)');
    // reflexo de luz
    ctx.fillStyle = 'rgba(240,250,255,0.9)';
    ctx.fillRect(10, 11, 5, 1);
    ctx.fillRect(9, 12, 2, 1);
    ctx.fillRect(18, 18, 3, 1);
  });

const flyTex = () =>
  pixelTexture('fly', 8, (ctx) => {
    ctx.fillStyle = '#16140f';
    ctx.fillRect(3, 3, 2, 2);
    ctx.fillStyle = 'rgba(220,230,240,0.85)';
    ctx.fillRect(2, 2, 1, 1);
    ctx.fillRect(5, 2, 1, 1);
  });

const smokeTex = () =>
  pixelTexture('smoke', 16, (ctx, rnd) => blotch(ctx, 16, rnd, 'rgba(58,56,60,0.85)', 'rgba(104,102,106,0.7)'));

const sparkTex = () =>
  pixelTexture('spark', 12, (ctx) => {
    ctx.fillStyle = '#fff4a8';
    ctx.fillRect(5, 1, 2, 10);
    ctx.fillRect(1, 5, 10, 2);
    ctx.fillStyle = '#ffd23a';
    ctx.fillRect(3, 3, 2, 2);
    ctx.fillRect(7, 7, 2, 2);
    ctx.fillRect(7, 3, 2, 2);
    ctx.fillRect(3, 7, 2, 2);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(5, 5, 2, 2);
  });

function flat(tex: THREE.Texture, w: number, d: number, y: number): THREE.Mesh {
  const m = new THREE.Mesh(
    new THREE.PlaneGeometry(w, d),
    new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 }),
  );
  m.rotation.x = -Math.PI / 2;
  m.position.y = y;
  m.renderOrder = 1;
  return m;
}

/** Modelo de uma bagunça solta. `top` é a altura onde ela está (chão ou mesa). */
export function buildMess(kind: MessKind, seed: number, top: number): THREE.Group {
  const g = new THREE.Group();
  const rnd = seeded(seed * 31 + 7);
  if (kind === 'plate') {
    const plate = cyl(0.13, 0.1, 0.025, 14, colorMat(0xf1ecdc, { gloss: 0.8 }), 0, 0);
    const food = cyl(0.07, 0.07, 0.006, 10, colorMat(0x8a5a2b), 0.02, 0.026, -0.01);
    const sauce = cyl(0.035, 0.035, 0.007, 8, colorMat(0xb8432a), -0.04, 0.026, 0.03);
    const fork = box(0.015, 0.008, 0.16, colorMat(0xb9c0c6, { gloss: 1 }), 0.08, 0.03, 0);
    fork.rotation.y = 0.5;
    g.add(plate, food, sauce, fork);
    if (top < 0.1) g.add(flat(stainTex(), 0.36, 0.36, 0.008 - top));
  } else if (kind === 'book') {
    // plano 2, bloco 7: livro largado aberto, de capa para cima
    const covers = [0x8a2f2a, 0x2c55a6, 0x3f7f3a, 0x7d55ad];
    const cover = colorMat(covers[Math.floor(rnd() * covers.length)], { gloss: 0.4 });
    const book = new THREE.Group();
    for (const sx of [-1, 1]) {
      const half = box(0.11, 0.02, 0.16, cover, sx * 0.058, 0, 0);
      half.rotation.z = sx * 0.12;
      book.add(half);
    }
    book.add(box(0.012, 0.024, 0.155, colorMat(0xf4efdf), 0, 0.004, 0));
    book.rotation.y = rnd() * Math.PI;
    g.add(book);
  } else if (kind === 'paper') {
    // jornal enrolado com elástico, do jeito que o entregador joga na calçada
    const roll = cyl(0.06, 0.06, 0.34, 10, colorMat(0xe6e0cc), 0, 0);
    roll.rotation.z = Math.PI / 2;
    roll.position.y = 0.06;
    const print = cyl(0.062, 0.062, 0.12, 10, colorMat(0x8f8a7c), 0, 0);
    print.rotation.z = Math.PI / 2;
    print.position.set(0.08, 0.06, 0);
    const band = cyl(0.064, 0.064, 0.025, 10, colorMat(0xc9382f, { gloss: 0.6 }), 0, 0);
    band.rotation.z = Math.PI / 2;
    band.position.set(-0.07, 0.06, 0);
    const paper = new THREE.Group();
    paper.add(roll, print, band);
    paper.rotation.y = rnd() * Math.PI;
    g.add(paper);
  } else if (kind === 'ash') {
    // bloco 14: monte de cinza e tição do que pegou fogo
    g.add(flat(stainTex(), 0.9, 0.9, 0.006));
    for (let i = 0; i < 7; i++) {
      const s = 0.06 + rnd() * 0.08;
      const lump = new THREE.Mesh(new THREE.IcosahedronGeometry(s, 0), colorMat(i % 3 === 0 ? 0x2a2522 : 0x6d6862));
      lump.position.set((rnd() - 0.5) * 0.5, s * 0.4, (rnd() - 0.5) * 0.5);
      lump.scale.y = 0.5;
      lump.rotation.set(rnd() * 3, rnd() * 3, rnd() * 3);
      g.add(lump);
    }
    const brand = box(0.32, 0.05, 0.06, colorMat(0x1e1a18), 0, 0.03, 0);
    brand.rotation.y = rnd() * 3;
    g.add(brand);
  } else if (kind === 'puddle') {
    const p = flat(puddleTex(), 0.8, 0.62, 0.012);
    p.rotation.z = rnd() * Math.PI;
    g.add(p);
  } else {
    const colors = [0xd9cfb6, 0xc9382f, 0x6a8a4a, 0xe8b830, 0x8a7a64];
    for (let i = 0; i < 6; i++) {
      const s = 0.05 + rnd() * 0.06;
      const piece = new THREE.Mesh(new THREE.IcosahedronGeometry(s, 0), colorMat(colors[i % colors.length]));
      piece.position.set((rnd() - 0.5) * 0.4, s * 0.6, (rnd() - 0.5) * 0.4);
      piece.rotation.set(rnd() * 3, rnd() * 3, rnd() * 3);
      g.add(piece);
    }
    // casca de banana
    const peel = box(0.14, 0.012, 0.04, colorMat(0xe8c43a), 0.05, 0.01, 0.12);
    peel.rotation.y = rnd() * 3;
    g.add(peel, flat(stainTex(), 0.6, 0.6, 0.006));
  }
  setShadows(g, true, true);
  g.traverse((o) => {
    if (o instanceof THREE.Mesh && o.material instanceof THREE.MeshBasicMaterial) o.castShadow = false;
  });
  return g;
}

/**
 * Efeitos em cima de um objeto conforme o estado: manchas no chão em volta,
 * moscas rodando, fumaça e faísca quando quebra, fita no remendo.
 */
export class WearFx {
  readonly group = new THREE.Group();
  private stains: THREE.Mesh[] = [];
  private flies: THREE.Sprite[] = [];
  private smoke: THREE.Sprite[] = [];
  private sparks: THREE.Sprite[] = [];
  private tape: THREE.Group;
  private phase: number;

  constructor(
    private readonly w: number,
    private readonly d: number,
    private readonly height: number,
    seed: number,
  ) {
    const rnd = seeded(seed * 13 + 3);
    this.phase = rnd() * 10;
    for (let i = 0; i < 3; i++) {
      const s = flat(stainTex(), 0.5 + rnd() * 0.3, 0.45 + rnd() * 0.3, 0.007 + i * 0.001);
      s.position.x = (rnd() - 0.5) * (w + 0.4);
      s.position.z = (rnd() - 0.5) * (d + 0.4);
      s.rotation.z = rnd() * Math.PI;
      s.visible = false;
      this.stains.push(s);
      this.group.add(s);
    }
    const sprite = (tex: THREE.Texture, scale: number) => {
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false }));
      sp.scale.setScalar(scale);
      sp.visible = false;
      this.group.add(sp);
      return sp;
    };
    for (let i = 0; i < 4; i++) this.flies.push(sprite(flyTex(), 0.09));
    for (let i = 0; i < 3; i++) this.smoke.push(sprite(smokeTex(), 0.3));
    for (let i = 0; i < 2; i++) this.sparks.push(sprite(sparkTex(), 0.16));
    // fita isolante prateada, cruzada, num canto do objeto
    this.tape = new THREE.Group();
    const tapeMat = colorMat(0xa9adb2, { gloss: 0.9 });
    const a = box(0.22, 0.012, 0.06, tapeMat, 0, 0, 0);
    const b = box(0.22, 0.012, 0.06, tapeMat, 0, 0.002, 0);
    a.rotation.y = 0.7;
    b.rotation.y = -0.7;
    this.tape.add(a, b);
    this.tape.position.set(w * 0.25, height + 0.01, d * 0.2);
    this.tape.visible = false;
    this.group.add(this.tape);
  }

  /** Atualiza a cada quadro. `fly` = sujo ou lixo fedendo. */
  update(state: ObjectState, smelly: boolean, time: number): void {
    const dirty = state.dirt >= 50 || smelly;
    const stains = state.dirt >= 80 ? 3 : state.dirt >= 50 ? 2 : state.dirt >= 30 ? 1 : 0;
    this.stains.forEach((s, i) => (s.visible = i < stains));
    const t = time + this.phase;
    this.flies.forEach((f, i) => {
      f.visible = dirty && (i < 2 || state.dirt >= 80 || smelly);
      if (!f.visible) return;
      const a = t * (2.2 + i * 0.4) + i * 1.7;
      const r = 0.25 + 0.12 * Math.sin(t * 1.3 + i);
      f.position.set(Math.cos(a) * r, this.height + 0.25 + 0.12 * Math.sin(t * 3 + i * 2), Math.sin(a) * r);
    });
    this.smoke.forEach((s, i) => {
      s.visible = state.broken;
      if (!s.visible) return;
      const k = (t * 0.45 + i / this.smoke.length) % 1;
      s.position.set(0.12 * Math.sin(t + i * 2), this.height + 0.1 + k * 0.9, 0.08 * Math.cos(t * 0.7 + i));
      s.scale.setScalar(0.24 + k * 0.4);
      (s.material as THREE.SpriteMaterial).opacity = 0.95 * (1 - k * 0.8);
    });
    this.sparks.forEach((s, i) => {
      // faísca pisca de vez em quando
      const on = state.broken && Math.sin(t * 9 + i * 4.1) > 0.75;
      s.visible = on;
      if (on) s.position.set((i ? -1 : 1) * this.w * 0.22, this.height * 0.75, this.d * 0.3);
    });
    this.tape.visible = state.patched && !state.broken;
  }
}
