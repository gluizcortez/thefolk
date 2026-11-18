import * as THREE from 'three';
import { MATERIALS, SWATCHES } from '../../sim/style';
import type { ObjStyle, PartStyle, PatternId } from '../../sim/style';
import { colorMat, texMat } from './build';
import { css, mix, PAL, shade } from './palette';

// Plano 2, bloco 8: materiais de cada parte (madeira, tecido, metal,
// plástico, pedra) com cor e padrão. As texturas são claras e em tons de
// cinza com o desenho do material e do padrão; a cor escolhida multiplica a
// textura, o que dá estampa tom sobre tom no espírito dos 16 bits.

type Ctx = CanvasRenderingContext2D;
type Rnd = () => number;

/** Cor final de uma parte: a escolhida (tecido, laqueado), o tingido (madeira) ou a natural. */
export function partColor(p: PartStyle): number {
  const mat = MATERIALS[p.mat];
  if (!mat) return 0xcccccc;
  const chosen = p.color !== undefined ? SWATCHES[p.color] : undefined;
  if (chosen === undefined || mat.tint === 'none') return mat.base;
  if (mat.tint === 'stain') return mix(mat.base, chosen, 0.4);
  return chosen;
}

/** Nome da textura de um material com padrão (registrada em textures.ts como fin:...). */
export function finishTexture(p: PartStyle): string | null {
  const mat = MATERIALS[p.mat];
  if (!mat) return null;
  const pattern = mat.patterns && p.pattern ? p.pattern : 'plain';
  switch (mat.family) {
    case 'fabric':
      return `fin:${p.mat}:${pattern}`;
    case 'wood':
      return p.mat === 'painted' ? null : 'fin:wood:plain';
    case 'metal':
      return p.mat === 'iron' ? null : 'chrome';
    case 'stone':
      return `fin:${p.mat}:plain`;
    case 'plastic':
      return p.mat === 'formica' ? `fin:formica:${pattern}` : null;
  }
}

/** Material Three.js de uma parte (em cache: o mesmo estilo dá o mesmo material). */
export function finishMat(p: PartStyle): THREE.MeshPhongMaterial {
  const mat = MATERIALS[p.mat];
  const color = partColor(p);
  const tex = finishTexture(p);
  const gloss = mat?.gloss ?? 0.2;
  const mtl = tex ? texMat(tex, { color, gloss }) : colorMat(color, { gloss });
  mtl.userData.role = mat?.family === 'fabric' ? 'fabric' : mat?.family === 'wood' ? 'wood' : mat?.family === 'metal' ? 'metal' : mat?.family === 'stone' ? 'stone' : 'finish';
  mtl.userData.styled = true;
  return mtl;
}

/** Amostra de cor para a interface (o material com a cor, sem a textura). */
export function partCss(p: PartStyle): string {
  return css(partColor(p));
}

// ---------- texturas ----------

function px(c: Ctx, x: number, y: number, w: number, h: number, v: number, a = 1): void {
  c.fillStyle = `rgba(${v},${v},${v},${a})`;
  c.fillRect(x, y, w, h);
}

/** Trama do tecido: base clara com o fio cruzado. */
function weave(c: Ctx, w: number, h: number, rnd: Rnd, mat: string): void {
  px(c, 0, 0, w, h, 240);
  const rough = mat === 'tweed' ? 0.22 : mat === 'linen' ? 0.1 : mat === 'velvet' ? 0.03 : mat === 'leather' ? 0.02 : 0.07;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if ((x + y) % 2 === 0) px(c, x, y, 1, 1, 0, rough * (0.5 + rnd()));
      if (mat === 'tweed' && rnd() < 0.08) px(c, x, y, 1, 1, rnd() > 0.5 ? 255 : 40, 0.35);
    }
  }
  if (mat === 'velvet') {
    // reflexo macio do veludo: faixa clara na diagonal
    for (let y = 0; y < h; y++) px(c, 0, y, w, 1, 255, 0.1 * Math.max(0, Math.sin((y / h) * Math.PI)));
  }
  if (mat === 'leather') {
    // vincos do couro
    for (let i = 0; i < 6; i++) {
      const y = Math.floor(rnd() * h);
      const x = Math.floor(rnd() * w * 0.6);
      px(c, x, y, Math.floor(4 + rnd() * 8), 1, 0, 0.18);
      px(c, x, y + 1, Math.floor(4 + rnd() * 8), 1, 255, 0.12);
    }
  }
}

/** Padrão por cima: tom mais escuro do mesmo tecido. */
function pattern(c: Ctx, w: number, h: number, kind: PatternId): void {
  const ink = (x: number, y: number, ww = 1, hh = 1, a = 0.42) => px(c, x, y, ww, hh, 20, a);
  const light = (x: number, y: number, ww = 1, hh = 1, a = 0.5) => px(c, x, y, ww, hh, 255, a);
  switch (kind) {
    case 'stripes':
      for (let x = 0; x < w; x += 8) {
        ink(x, 0, 3, h);
        light(x + 5, 0, 1, h, 0.3);
      }
      break;
    case 'check':
      for (let y = 0; y < h; y += 8) for (let x = 0; x < w; x += 8) if (((x + y) / 8) % 2 === 0) ink(x, y, 8, 8, 0.32);
      for (let x = 0; x < w; x += 8) ink(x, 0, 1, h, 0.25);
      for (let y = 0; y < h; y += 8) ink(0, y, w, 1, 0.25);
      break;
    case 'dots':
      for (let y = 2; y < h; y += 8) {
        for (let x = (y / 8) % 2 ? 6 : 2; x < w; x += 8) {
          light(x, y, 2, 2, 0.75);
          ink(x + 1, y + 2, 2, 1, 0.25);
        }
      }
      break;
    case 'chevron':
      for (let y = 0; y < h; y += 8) {
        for (let x = 0; x < w; x++) {
          const k = x % 8;
          const dy = k < 4 ? k : 7 - k;
          ink(x, y + dy, 1, 2, 0.45);
        }
      }
      break;
    case 'floral':
      for (let y = 3; y < h; y += 11) {
        for (let x = (y / 11) % 2 ? 9 : 3; x < w; x += 12) {
          // pétalas claras em cruz, miolo escuro e duas folhas
          light(x, y - 2, 2, 2, 0.7);
          light(x, y + 2, 2, 2, 0.7);
          light(x - 2, y, 2, 2, 0.7);
          light(x + 2, y, 2, 2, 0.7);
          ink(x, y, 2, 2, 0.6);
          ink(x + 3, y + 4, 2, 1, 0.4);
          ink(x - 3, y + 4, 2, 1, 0.4);
        }
      }
      break;
    default:
      break;
  }
}

/** Veio de madeira em tons claros (a cor da madeira multiplica). */
function grain(c: Ctx, w: number, h: number, rnd: Rnd): void {
  px(c, 0, 0, w, h, 236);
  for (let i = 0; i < h * 0.8; i++) {
    const y = rnd() * h;
    c.strokeStyle = `rgba(${rnd() > 0.5 ? 120 : 255},${rnd() > 0.5 ? 110 : 250},${rnd() > 0.5 ? 100 : 240},0.3)`;
    c.lineWidth = 1;
    c.beginPath();
    c.moveTo(0, y);
    for (let x = 0; x <= w; x += 8) c.lineTo(x, y + Math.sin(x * 0.15 + i) * 1.4);
    c.stroke();
  }
  // nós
  for (let i = 0; i < 2; i++) {
    const x = rnd() * w;
    const y = rnd() * h;
    c.fillStyle = 'rgba(90,70,50,0.35)';
    c.beginPath();
    c.ellipse(x, y, 3, 1.5, 0, 0, Math.PI * 2);
    c.fill();
  }
}

function marble(c: Ctx, w: number, h: number, rnd: Rnd): void {
  px(c, 0, 0, w, h, 246);
  for (let i = 0; i < 7; i++) {
    let x = rnd() * w;
    let y = 0;
    c.strokeStyle = `rgba(110,110,120,${0.2 + rnd() * 0.25})`;
    c.lineWidth = rnd() > 0.7 ? 2 : 1;
    c.beginPath();
    c.moveTo(x, y);
    while (y < h) {
      x += (rnd() - 0.5) * 8;
      y += 4 + rnd() * 6;
      c.lineTo(x, y);
    }
    c.stroke();
  }
}

function granite(c: Ctx, w: number, h: number, rnd: Rnd): void {
  px(c, 0, 0, w, h, 200);
  for (let i = 0; i < w * h * 0.5; i++) {
    const v = rnd() > 0.5 ? 255 : rnd() > 0.5 ? 30 : 140;
    px(c, Math.floor(rnd() * w), Math.floor(rnd() * h), 1, 1, v, 0.5);
  }
}

function formica(c: Ctx, w: number, h: number, rnd: Rnd): void {
  px(c, 0, 0, w, h, 242);
  // pontinhos da fórmica de cozinha
  for (let i = 0; i < 40; i++) px(c, Math.floor(rnd() * w), Math.floor(rnd() * h), 1, 1, rnd() > 0.5 ? 150 : 255, 0.6);
}

export interface FinishSpec {
  w: number;
  h: number;
  repeat: boolean;
  grain: number;
  paint: (c: Ctx, w: number, h: number, rnd: Rnd) => void;
}

/** Textura fin:material:padrão (usada por textures.ts). */
export function finishSpec(mat: string, pat: string): FinishSpec | undefined {
  const pid = pat as PatternId;
  if (mat === 'wood') return { w: 64, h: 64, repeat: true, grain: 4, paint: grain };
  if (mat === 'marble') return { w: 64, h: 64, repeat: true, grain: 2, paint: marble };
  if (mat === 'granite') return { w: 32, h: 32, repeat: true, grain: 3, paint: granite };
  if (mat === 'formica')
    return {
      w: 32,
      h: 32,
      repeat: true,
      grain: 2,
      paint: (c, w, h, r) => {
        formica(c, w, h, r);
        pattern(c, w, h, pid);
      },
    };
  if (MATERIALS[mat]?.family === 'fabric')
    return {
      w: 32,
      h: 32,
      repeat: true,
      grain: 3,
      paint: (c, w, h, r) => {
        weave(c, w, h, r, mat);
        pattern(c, w, h, pid);
      },
    };
  return undefined;
}

// ---------- estilo nos desenhos antigos ----------

const WOOD_TEX = new Set(['walnut', 'pine', 'oak', 'doorsOak']);
const FABRIC_TEX = new Set(['fabric', 'duvet']);
const FINISH_TEX = new Set(['enamel', 'fridgeFront', 'stoveFront', 'counterFront', 'laminate', 'doorsWhite']);
const FINISH_COLORS = new Set<number>([PAL.enamel, PAL.vinyl, PAL.cabinet, shade(PAL.cabinet, 0.9)]);
const METAL_COLORS = new Set<number>([PAL.brass, PAL.chrome]);

/** Papel de um material no desenho (o que o estilo pode trocar). */
export function roleOf(m: THREE.Material): string | undefined {
  if (m.userData.role) return m.userData.role as string;
  const phong = m as THREE.MeshPhongMaterial;
  const tex = (phong.map?.userData?.name as string | undefined) ?? (m.userData.tex as string | undefined);
  if (tex) {
    if (WOOD_TEX.has(tex)) return 'wood';
    if (FABRIC_TEX.has(tex)) return 'fabric';
    if (tex === 'chrome') return 'metal';
    if (tex === 'marble') return 'stone';
    if (FINISH_TEX.has(tex)) return 'finish';
    return undefined;
  }
  if (m.transparent || (phong.emissive && phong.emissive.getHex() !== 0)) return undefined;
  const hex = phong.color?.getHex();
  if (hex === undefined) return undefined;
  if (FINISH_COLORS.has(hex)) return 'finish';
  if (METAL_COLORS.has(hex)) return 'metal';
  return undefined;
}

/** Que papéis um desenho tem (para o editor saber que zonas mostrar). */
export function rolesIn(root: THREE.Object3D): string[] {
  const out = new Set<string>();
  root.traverse((o) => {
    if (!(o instanceof THREE.Mesh)) return;
    const mats = Array.isArray(o.material) ? o.material : [o.material];
    for (const m of mats) {
      const r = roleOf(m);
      if (r) out.add(r);
    }
  });
  return [...out];
}

/** Troca os materiais de um desenho antigo pelos do estilo, papel por papel. */
export function restyle(root: THREE.Object3D, style: ObjStyle | undefined): void {
  if (!style || !Object.keys(style).length) return;
  const cache = new Map<string, THREE.Material>();
  const swap = (m: THREE.Material): THREE.Material => {
    const role = roleOf(m);
    const p = role ? style[role] : undefined;
    if (!p || !p.mat || !MATERIALS[p.mat]) return m;
    const key = `${role}`;
    let out = cache.get(key);
    if (!out) {
      out = finishMat(p);
      cache.set(key, out);
    }
    return out;
  };
  root.traverse((o) => {
    if (!(o instanceof THREE.Mesh)) return;
    if (Array.isArray(o.material)) o.material = o.material.map(swap);
    else o.material = swap(o.material);
  });
}
