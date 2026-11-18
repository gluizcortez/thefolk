import * as THREE from 'three';
import type { Assembly, KitDef, KitParts, PartSlot } from '../../sim/parts';
import { KINDS, assemble, kitZonesOf, partOf, partsOfObject } from '../../sim/parts';
import type { ObjStyle } from '../../sim/style';
import { resolvedStyle } from '../../sim/style';
import { ball, box, colorMat, cyl, lathe, rbox, rod, texMat, tileUV } from './build';
import { finishMat } from './finish';
import type { Anchor, FurnitureModel, FurnitureSpec, TickInfo } from './furniture';

// Plano 2, bloco 8: desenho dos móveis montados por peças. Cada peça tem uma
// função que desenha com as medidas da montagem (sim/parts.ts) e o material
// da sua zona. O assento, o colchão e o tampo ficam sempre na mesma altura,
// então os lugares de sentar e deitar e os pratos em cima não mudam.

type Mats = Record<PartSlot, THREE.Material>;

function grp(...parts: THREE.Object3D[]): THREE.Group {
  const g = new THREE.Group();
  if (parts.length) g.add(...parts);
  return g;
}

/** Repete a textura conforme o tamanho (um ladrilho a cada ~30 cm). */
function tiled(mesh: THREE.Mesh, w: number, h: number): THREE.Mesh {
  return tileUV(mesh, Math.max(1, w / 0.3), Math.max(1, h / 0.3));
}

const dark = () => colorMat(0x1d1b19);

// ---------- pés ----------

function legsAt(kind: string, mat: THREE.Material, h: number, pts: [number, number][], all: THREE.Object3D[]): void {
  if (h <= 0.001) return;
  for (const [x, z] of pts) {
    switch (kind) {
      case 'peg':
        all.push(cyl(0.022, 0.032, h, 8, mat, x, 0, z));
        break;
      case 'block':
        all.push(box(0.07, h, 0.07, mat, x, 0, z));
        break;
      case 'bun': {
        const b = ball(0.045, h / 2, 0.045, mat, x, h / 2, z, 10);
        all.push(b);
        break;
      }
      case 'hairpin': {
        const sx = Math.sign(x) || 1;
        const sz = Math.sign(z) || 1;
        all.push(rod([x, h, z], [x - sx * 0.02, 0, z - sz * 0.05], 0.008, mat), rod([x, h, z], [x - sx * 0.02, 0, z + sz * 0.03], 0.008, mat));
        break;
      }
      default:
        all.push(cyl(0.022, 0.022, h, 8, mat, x, 0, z));
    }
  }
}

function corners(w: number, d: number, inset: number): [number, number][] {
  const x = w / 2 - inset;
  const z = d / 2 - inset;
  return [
    [-x, -z],
    [x, -z],
    [-x, z],
    [x, z],
  ];
}

// ---------- estofados (sofá e poltrona) ----------

function upholstered(a: Assembly, m: Mats): { group: THREE.Group; sit: Anchor[] } {
  const k = KINDS[a.kind];
  const W = a.size.w;
  const D = a.size.d;
  const seatTop = k.seatTop!;
  const legH = a.legH;
  const frameH = a.frameH;
  const arms = partOf('arms', a.parts.arms)!;
  const side = arms.side ?? 0;
  const seat = partOf('seat', a.parts.seat)!;
  const back = partOf('back', a.parts.back)!;
  const all: THREE.Object3D[] = [];
  legsAt(a.parts.legs, m.legs, legH, corners(W, D, 0.07), all);
  // estrutura
  const y0 = legH;
  const backT = a.parts.back === 'pillows' ? 0.16 : 0.2;
  switch (a.parts.frame) {
    case 'skirt': {
      all.push(tiled(rbox(W, frameH, D, 0.03, m.frame, 0, 0.0, 0), W, frameH));
      // babado: faixa um pouco mais larga embaixo, com a costura
      all.push(box(W + 0.02, 0.08, D + 0.02, m.frame, 0, 0.0, 0), box(W + 0.024, 0.008, D + 0.024, dark(), 0, 0.08, 0));
      break;
    }
    case 'slim':
      all.push(tiled(rbox(W, frameH, D - 0.02, 0.02, m.frame, 0, y0, 0), W, frameH));
      all.push(box(W - 0.04, 0.012, 0.01, dark(), 0, y0 + 0.02, D / 2 - 0.006));
      break;
    default:
      all.push(tiled(rbox(W, frameH, D, 0.05, m.frame, 0, y0, 0), W, frameH));
  }
  const seatY = seatTop - (seat.h ?? 0.12);
  const inner = W - 2 * side;
  const seatD = D - backT - 0.02;
  const seatZ = (D / 2 - seatD / 2) - 0.01;
  const n = a.seats;
  // assento
  if (a.parts.seat === 'cushions' || a.parts.seat === 'tufted') {
    const cw = inner / n;
    for (let i = 0; i < n; i++) {
      const cx = -inner / 2 + cw * (i + 0.5);
      all.push(tiled(rbox(cw - 0.02, seat.h!, seatD, 0.05, m.seat, cx, seatY, seatZ), cw, seatD));
      if (a.parts.seat === 'tufted') {
        for (const bx of [-0.25, 0.25]) for (const bz of [-0.2, 0.15]) all.push(ball(0.012, 0.008, 0.012, dark(), cx + bx * cw, seatTop + 0.002, seatZ + bz * seatD, 6));
      }
    }
  } else {
    all.push(tiled(rbox(inner - 0.01, seat.h ?? 0.1, seatD, 0.04, m.seat, 0, seatY, seatZ), inner, seatD));
  }
  // encosto
  const backH = back.h ?? 0.3;
  const bz = -D / 2 + backT / 2;
  if (backH > 0) {
    if (a.parts.back === 'pillows') {
      all.push(tiled(rbox(W - 0.02, seatTop + 0.14 - y0, backT, 0.05, m.frame, 0, y0, bz), W, 0.4));
      const cw = inner / n;
      for (let i = 0; i < n; i++) {
        const p = rbox(cw - 0.06, backH - 0.04, 0.16, 0.07, m.back, -inner / 2 + cw * (i + 0.5), seatTop - 0.02, bz + 0.12);
        p.rotation.x = -0.18;
        all.push(tiled(p, cw, backH));
      }
    } else if (a.parts.back === 'curved') {
      all.push(tiled(rbox(W - 0.02, backH + seatTop - y0 - 0.06, backT, 0.08, m.back, 0, y0, bz), W, backH));
      const roll = cyl(0.08, 0.08, W - 0.06, 14, m.back, 0, 0, 0);
      roll.rotation.z = Math.PI / 2;
      roll.position.set(0, seatTop + backH - 0.06, bz);
      all.push(roll);
    } else {
      all.push(tiled(rbox(W - 0.02, seatTop + backH - y0, backT, 0.05, m.back, 0, y0, bz), W, backH));
    }
  }
  // braços
  if (side > 0) {
    const armTop = seatTop + 0.2;
    for (const sx of [-1, 1]) {
      const ax = sx * (W / 2 - side / 2);
      if (a.parts.arms === 'round') {
        all.push(tiled(rbox(side, armTop - y0 - 0.06, D - 0.02, 0.04, m.arms, ax, y0, 0.01), side, D));
        const roll = cyl(0.09, 0.09, D - 0.02, 14, m.arms, 0, 0, 0);
        roll.rotation.x = Math.PI / 2;
        roll.position.set(ax, armTop - 0.06, 0.01);
        all.push(roll);
      } else if (a.parts.arms === 'thin') {
        all.push(rbox(side, 0.04, D - 0.04, 0.015, m.arms, ax, armTop - 0.04, 0.0));
        all.push(box(side * 0.7, armTop - 0.04 - seatY, 0.05, m.arms, ax, seatY, D / 2 - 0.08));
        all.push(box(side * 0.7, armTop - 0.04 - seatY, 0.05, m.arms, ax, seatY, -D / 2 + 0.12));
      } else {
        all.push(tiled(rbox(side, armTop - y0, D, 0.03, m.arms, ax, y0, 0), side, D));
      }
    }
  }
  const sit: Anchor[] = [];
  const cw = inner / n;
  for (let i = 0; i < n; i++) sit.push({ x: n === 1 ? 0 : -inner / 2 + cw * (i + 0.5), y: seatTop, z: 0.06, heading: 0 });
  return { group: grp(...all), sit };
}

// ---------- cadeira, banqueta e banco ----------

function hardSeat(a: Assembly, m: Mats): { group: THREE.Group; sit: Anchor[] } {
  const k = KINDS[a.kind];
  const W = a.kind === 'bench' ? a.size.w - 0.04 : a.kind === 'stool' ? 0.36 : 0.42;
  const D = a.kind === 'stool' ? 0.36 : k.depth - 0.04;
  const seatTop = k.seatTop!;
  const seat = partOf('seat', a.parts.seat)!;
  const back = partOf('back', a.parts.back);
  const seatH = seat.h ?? 0.05;
  const frameH = partOf('frame', a.parts.frame)?.h ?? 0.04;
  const legH = a.legH;
  const all: THREE.Object3D[] = [];
  const pts = corners(W, D, 0.04);
  switch (a.parts.legs) {
    case 'tube':
      for (const sx of [-1, 1]) {
        all.push(
          rod([sx * (W / 2 - 0.03), legH + frameH, D / 2 - 0.04], [sx * (W / 2 - 0.01), 0, D / 2 + 0.01], 0.014, m.legs),
          rod([sx * (W / 2 - 0.03), legH + frameH, -D / 2 + 0.04], [sx * (W / 2 - 0.01), 0, -D / 2 - 0.02], 0.014, m.legs),
        );
      }
      all.push(rod([-W / 2 + 0.03, legH * 0.45, D / 2 - 0.02], [W / 2 - 0.03, legH * 0.45, D / 2 - 0.02], 0.01, m.legs));
      break;
    case 'pedestal':
      all.push(
        lathe(
          [
            [0.17, 0],
            [0.17, 0.02],
            [0.04, 0.05],
            [0.03, legH - 0.04],
            [0.08, legH + frameH],
          ],
          12,
          m.legs,
        ),
      );
      // apoio de pé da banqueta
      if (a.kind === 'stool') {
        const ring = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.012, 6, 16), m.legs);
        ring.rotation.x = Math.PI / 2;
        ring.position.y = legH * 0.4;
        all.push(ring);
      }
      break;
    case 'trestle':
      for (const sx of [-1, 1]) {
        const x = sx * (W / 2 - 0.08);
        all.push(box(0.05, legH, D * 0.7, m.legs, x, 0, 0), box(0.07, 0.04, D * 0.85, m.legs, x, 0, 0));
      }
      all.push(box(W - 0.2, 0.05, 0.04, m.legs, 0, legH * 0.35, 0));
      break;
    default:
      legsAt(a.parts.legs, m.legs, legH, pts, all);
      // travessa baixa nas pernas altas
      if (a.kind === 'stool') all.push(box(W - 0.1, 0.02, 0.02, m.legs, 0, legH * 0.35, D / 2 - 0.05), box(W - 0.1, 0.02, 0.02, m.legs, 0, legH * 0.35, -D / 2 + 0.05));
  }
  // estrutura sob o assento
  if (a.parts.frame !== 'tube') all.push(box(W - 0.02, frameH, D - 0.02, m.frame, 0, legH, 0));
  // assento
  const sy = seatTop - seatH;
  if (a.parts.seat === 'slab') all.push(tiled(rbox(W, seatH, D, 0.012, m.seat, 0, sy, 0), W, D));
  else if (a.parts.seat === 'saddle') all.push(rbox(W, seatH, D, 0.03, m.seat, 0, sy, 0), rbox(W - 0.08, 0.012, D - 0.08, 0.006, m.seat, 0, seatTop - 0.008, 0));
  else all.push(tiled(rbox(W, seatH, D, 0.03, m.seat, 0, sy, 0), W, D));
  // encosto
  const backH = back?.h ?? 0;
  if (back && backH > 0) {
    const bz = -D / 2 + 0.03;
    const postMat = a.parts.frame === 'tube' ? m.legs : m.back;
    for (const sx of [-1, 1]) {
      if (a.parts.frame === 'tube') all.push(rod([sx * (W / 2 - 0.03), seatTop - 0.02, bz], [sx * (W / 2 - 0.03), seatTop + backH, bz - 0.03], 0.014, postMat));
      else all.push(box(0.04, seatTop + backH - legH, 0.04, postMat, sx * (W / 2 - 0.03), legH, bz));
    }
    if (a.parts.back === 'slats') {
      const n = Math.max(3, Math.round(W / 0.1));
      for (let i = 0; i < n; i++) {
        const x = -W / 2 + 0.08 + ((W - 0.16) * i) / (n - 1);
        all.push(box(0.025, backH - 0.08, 0.02, m.back, x, seatTop + 0.03, bz));
      }
      all.push(box(W - 0.02, 0.06, 0.035, m.back, 0, seatTop + backH - 0.06, bz));
    } else if (a.parts.back === 'curved') {
      const panel = rbox(W - 0.04, backH * 0.6, 0.05, 0.022, m.back, 0, seatTop + backH * 0.4, bz - 0.02);
      panel.rotation.x = 0.08;
      all.push(panel);
    } else {
      all.push(rbox(W - 0.04, backH * 0.55, 0.045, 0.015, m.back, 0, seatTop + backH * 0.45, bz));
    }
  }
  const sit: Anchor[] = [];
  const n = a.seats;
  for (let i = 0; i < n; i++) sit.push({ x: n === 1 ? 0 : -W / 2 + (W / n) * (i + 0.5), y: seatTop, z: a.kind === 'chair' ? 0 : 0.02, heading: 0 });
  return { group: grp(...all), sit };
}

// ---------- cama ----------

function bedKit(a: Assembly, m: Mats): { group: THREE.Group; lies: Anchor[]; refs: { duvet: THREE.Object3D } } {
  const W = a.size.w;
  const D = a.size.d;
  const top = KINDS.bed.top!;
  const legH = a.legH;
  const frameH = a.frameH;
  const all: THREE.Object3D[] = [];
  legsAt(a.parts.legs, m.legs, legH, corners(W, D, 0.06), all);
  const fy = legH;
  switch (a.parts.frame) {
    case 'platform':
      all.push(tiled(box(W + 0.06, frameH, D + 0.04, m.frame, 0, fy, 0.01), W, frameH));
      break;
    case 'slim':
      for (const sx of [-1, 1]) all.push(box(0.04, frameH, D, m.frame, sx * (W / 2 - 0.02), fy, 0));
      all.push(box(W, frameH, 0.04, m.frame, 0, fy, D / 2 - 0.02));
      all.push(box(W - 0.06, 0.02, D - 0.06, m.frame, 0, fy + frameH - 0.03, 0));
      break;
    default:
      all.push(tiled(box(W, frameH, D, m.frame, 0, fy, 0), W, frameH));
      // pé da cama baixo
      all.push(rbox(W + 0.02, top - 0.02, 0.06, 0.02, m.frame, 0, 0, D / 2 - 0.02));
  }
  // colchão
  const white = colorMat(0xf4f1e6);
  all.push(rbox(W - 0.06, 0.24, D - 0.1, 0.06, white, 0, top - 0.24, 0));
  // travesseiros
  const pillows = W > 1.4 ? [-W / 4, W / 4] : [0];
  for (const px of pillows) all.push(rbox(Math.min(0.6, W / pillows.length - 0.14), 0.13, 0.34, 0.06, white, px, top - 0.02, -D / 2 + 0.28));
  // roupa de cama
  const bl = D * 0.64;
  let duvet: THREE.Mesh;
  if (a.parts.bedding === 'sheet') {
    duvet = tiled(box(W - 0.04, 0.03, bl, m.bedding, 0, top - 0.01, D / 2 - bl / 2 - 0.05), W, bl);
  } else {
    duvet = tiled(rbox(W - 0.02, a.parts.bedding === 'quilt' ? 0.07 : 0.09, bl, 0.035, m.bedding, 0, top - 0.02, D / 2 - bl / 2 - 0.04), W, bl);
    // dobra do lençol no alto
    all.push(box(W - 0.04, 0.02, 0.12, white, 0, top + 0.05, D / 2 - bl - 0.02));
  }
  all.push(duvet);
  if (a.parts.bedding === 'quilt') all.push(box(W + 0.02, 0.2, 0.02, m.bedding, 0, top - 0.17, D / 2 - 0.03));
  // cabeceira
  const head = partOf('headboard', a.parts.headboard)!;
  const hh = head.h ?? 0;
  const hz = -D / 2 + 0.03;
  if (hh > 0) {
    const baseH = top + hh;
    switch (a.parts.headboard) {
      case 'tuftedHead':
        all.push(tiled(rbox(W + 0.06, baseH, 0.1, 0.05, m.headboard, 0, 0, hz), W, baseH));
        for (let i = 0; i < Math.round(W / 0.2); i++) {
          for (let j = 0; j < 2; j++) all.push(ball(0.012, 0.012, 0.008, dark(), -W / 2 + 0.1 + i * 0.2, top + 0.16 + j * 0.2, hz + 0.052, 6));
        }
        break;
      case 'slatsHead': {
        for (const sx of [-1, 1]) all.push(box(0.06, baseH, 0.06, m.headboard, sx * (W / 2 + 0.0), 0, hz));
        const n = Math.round(W / 0.14);
        for (let i = 0; i < n; i++) all.push(box(0.04, hh - 0.1, 0.03, m.headboard, -W / 2 + 0.08 + ((W - 0.16) * i) / Math.max(1, n - 1), top + 0.04, hz));
        all.push(box(W + 0.08, 0.06, 0.07, m.headboard, 0, baseH - 0.06, hz));
        break;
      }
      case 'arched': {
        all.push(tiled(rbox(W + 0.04, baseH - 0.14, 0.08, 0.02, m.headboard, 0, 0, hz), W, baseH));
        const arch = new THREE.Mesh(new THREE.CylinderGeometry(W / 2 + 0.02, W / 2 + 0.02, 0.08, 20, 1, false, -Math.PI / 2, Math.PI), m.headboard);
        arch.rotation.x = Math.PI / 2;
        arch.scale.set(1, 1, 0.28 / (W / 2 + 0.02));
        arch.position.set(0, baseH - 0.15, hz);
        all.push(arch);
        break;
      }
      default:
        all.push(tiled(rbox(W + 0.04, baseH, 0.08, 0.03, m.headboard, 0, 0, hz), W, baseH));
        all.push(rbox(W + 0.08, 0.06, 0.12, 0.03, m.headboard, 0, baseH - 0.04, hz));
    }
  }
  const lieY = top + 0.11;
  const lies = W > 1.4 ? [-0.45, 0.45].map((x) => ({ x, y: lieY, z: 0.9, heading: 0 })) : [{ x: 0, y: lieY, z: 0.9, heading: 0 }];
  return { group: grp(...all), lies, refs: { duvet } };
}

// ---------- mesas ----------

function tableKit(a: Assembly, m: Mats): THREE.Group {
  const k = KINDS[a.kind];
  const W = a.size.w;
  const D = a.size.d;
  const topY = k.top!;
  const tp = partOf('top', a.parts.top)!;
  const topH = tp.h ?? 0.04;
  const frameH = partOf('frame', a.parts.frame)?.h ?? 0.06;
  const legH = topY - topH - frameH;
  const all: THREE.Object3D[] = [];
  if (a.parts.top === 'round') {
    const r = Math.min(W, D) / 2;
    const disk = cyl(r, r, topH, 24, m.top, 0, topY - topH, 0);
    all.push(disk);
    all.push(cyl(r * 0.8, r * 0.8, frameH, 20, m.frame, 0, legH, 0));
  } else {
    all.push(tiled(rbox(W, topH, D, 0.012, m.top, 0, topY - topH, 0), W, D));
    all.push(box(W - 0.1, frameH, D - 0.1, m.frame, 0, legH, 0));
  }
  if (a.parts.legs === 'pedestal') {
    const n = W > 1.4 ? 2 : 1;
    for (let i = 0; i < n; i++) {
      const x = n === 1 ? 0 : (i ? 1 : -1) * W * 0.27;
      const g = lathe(
        [
          [0.22, 0],
          [0.22, 0.03],
          [0.06, 0.07],
          [0.05, legH - 0.04],
          [0.12, legH],
        ],
        14,
        m.legs,
      );
      g.position.x = x;
      all.push(g);
    }
  } else if (a.parts.legs === 'trestle') {
    for (const sx of [-1, 1]) {
      const x = sx * (W / 2 - 0.14);
      all.push(box(0.06, legH, 0.08, m.legs, x, 0, 0), box(0.08, 0.05, D * 0.8, m.legs, x, 0, 0), box(0.08, 0.04, D * 0.7, m.legs, x, legH - 0.04, 0));
    }
    all.push(box(W - 0.32, 0.05, 0.04, m.legs, 0, legH * 0.3, 0));
  } else {
    const inset = a.parts.top === 'round' ? Math.min(W, D) * 0.2 : 0.06;
    legsAt(a.parts.legs, m.legs, legH, corners(W, D, inset), all);
  }
  return grp(...all);
}

// ---------- caixas: bancada, cômoda, criado-mudo, estante, guarda-roupa, aparador, escrivaninha ----------

interface CaseRefs {
  /** folhas de porta que abrem (pivô na dobradiça) */
  doors: THREE.Object3D[];
  /** gavetas que correm para frente */
  drawers: THREE.Object3D[];
}

function handleAt(kind: string, mat: THREE.Material, x: number, y: number, z: number, vertical: boolean): THREE.Object3D | null {
  switch (kind) {
    case 'knob':
      return ball(0.018, 0.018, 0.018, mat, x, y, z + 0.015, 8);
    case 'bar':
      return vertical ? rod([x, y - 0.07, z + 0.025], [x, y + 0.07, z + 0.025], 0.008, mat) : rod([x - 0.07, y, z + 0.025], [x + 0.07, y, z + 0.025], 0.008, mat);
    case 'cup': {
      const c = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.03, 10, 1, true, 0, Math.PI), mat);
      c.rotation.z = Math.PI / 2;
      c.rotation.y = Math.PI / 2;
      c.position.set(x, y, z + 0.012);
      return c;
    }
    default:
      return null;
  }
}

function caseKit(a: Assembly, m: Mats, books: boolean): { group: THREE.Group; refs: CaseRefs } {
  const k = KINDS[a.kind];
  const W = a.size.w;
  const D = a.size.d;
  const legH = a.parts.legs === 'none' ? 0 : partOf('legs', a.parts.legs)?.h ?? 0.1;
  const tp = partOf('top', a.parts.top)!;
  const topH = a.parts.top === 'crown' ? 0.06 : tp.h ?? 0.04;
  const topY = k.top!;
  const bodyTop = topY - topH;
  const bodyBottom = legH > 0 ? legH : 0.08;
  const bodyH = bodyTop - bodyBottom;
  const all: THREE.Object3D[] = [];
  const refs: CaseRefs = { doors: [], drawers: [] };
  // base: pés ou rodapé recuado
  if (legH > 0) legsAt(a.parts.legs, m.legs, legH, corners(W, D, 0.05), all);
  else all.push(box(W - 0.06, bodyBottom, D - 0.08, dark(), 0, 0, -0.03));
  const r = a.parts.body === 'rounded' ? 0.04 : 0.01;
  const open = a.parts.body === 'open' || a.parts.doors === 'noDoors';
  const front = D / 2;
  if (open) {
    // corpo aberto: laterais, fundo e prateleiras
    for (const sx of [-1, 1]) all.push(box(0.03, bodyH, D, m.body, sx * (W / 2 - 0.015), bodyBottom, 0));
    all.push(box(W, bodyH, 0.02, m.body, 0, bodyBottom, -D / 2 + 0.01), box(W, 0.03, D, m.body, 0, bodyBottom, 0));
  } else {
    all.push(tiled(rbox(W, bodyH, D - 0.02, r, m.body, 0, bodyBottom, -0.01), W, bodyH));
  }
  // prateleiras internas (estante, aparador aberto, escrivaninha)
  const shelves = Math.max(1, Math.round(bodyH / 0.36));
  if (open || a.parts.doors === 'glass') {
    for (let i = 1; i < shelves; i++) {
      const y = bodyBottom + (bodyH * i) / shelves;
      all.push(box(W - 0.06, 0.025, D - 0.06, m.body, 0, y, 0));
    }
    if (books) {
      const bookMat = texMat('books', { gloss: 0.15 });
      for (let i = 0; i < shelves; i++) {
        const y = bodyBottom + (bodyH * i) / shelves + 0.03;
        const h = Math.min(0.26, bodyH / shelves - 0.06);
        all.push(box(W - 0.12, h, D - 0.12, [bookMat, bookMat, dark(), dark(), bookMat, bookMat], 0, y, -0.01));
      }
    }
  }
  // frente: portas, vidro, veneziana ou gavetas
  const fz = front - 0.004;
  const cols = Math.max(1, Math.round(W / 0.5));
  const cw = (W - 0.04) / cols;
  const doorMat = m.doors;
  if (a.parts.doors === 'drawers') {
    const rows = a.kind === 'nightstand' ? 2 : a.kind === 'desk' ? 3 : a.kind === 'counter' ? (W < 1.2 ? 3 : 2) : Math.max(2, Math.round(bodyH / 0.22));
    const deskCols = a.kind === 'desk' ? 1 : cols;
    const dw = a.kind === 'desk' ? 0.42 : cw;
    for (let c = 0; c < deskCols; c++) {
      const cx = a.kind === 'desk' ? W / 2 - 0.25 : -W / 2 + 0.02 + cw * (c + 0.5);
      for (let i = 0; i < rows; i++) {
        const rh = (bodyH - 0.04) / rows;
        const y = bodyBottom + 0.02 + rh * i;
        const d = grp(rbox(dw - 0.02, rh - 0.02, 0.03, 0.008, doorMat, 0, 0, 0));
        const h = handleAt(a.parts.handles, m.handles, 0, rh / 2 - 0.01, 0.015, false);
        if (h) d.add(h);
        d.position.set(cx, y, fz);
        d.userData.baseZ = fz;
        if (c === 0 && i === rows - 1) d.userData.pull = 1;
        refs.drawers.push(d);
        all.push(d);
      }
    }
  } else if (!open) {
    for (let c = 0; c < cols; c++) {
      const left = c % 2 === 0;
      const hingeX = -W / 2 + 0.02 + cw * (left ? c : c + 1);
      const leaf = grp();
      const dx = left ? cw / 2 : -cw / 2;
      if (a.parts.doors === 'glass') {
        const frame = m.doors;
        const glass = colorMat(0xbfe6f5, { opacity: 0.28, gloss: 0.9 });
        leaf.add(
          box(cw - 0.02, 0.04, 0.03, frame, dx, 0, 0),
          box(cw - 0.02, 0.04, 0.03, frame, dx, bodyH - 0.06, 0),
          box(0.04, bodyH - 0.04, 0.03, frame, dx - (cw / 2 - 0.03), 0, 0),
          box(0.04, bodyH - 0.04, 0.03, frame, dx + (cw / 2 - 0.03), 0, 0),
          box(cw - 0.08, bodyH - 0.12, 0.01, glass, dx, 0.04, 0),
        );
      } else {
        leaf.add(tiled(rbox(cw - 0.02, bodyH - 0.04, 0.03, 0.01, doorMat, dx, 0, 0), cw, bodyH));
        if (a.parts.doors === 'louver') {
          for (let y = 0.08; y < bodyH - 0.1; y += 0.05) leaf.add(box(cw - 0.12, 0.012, 0.012, dark(), dx, y, 0.018));
        } else {
          // almofada da porta (moldura em relevo)
          leaf.add(box(cw - 0.12, bodyH - 0.2, 0.008, doorMat, dx, 0.08, 0.018));
        }
      }
      const hx = dx + (left ? cw / 2 - 0.06 : -(cw / 2 - 0.06));
      const hy = a.kind === 'counter' || a.kind === 'cabinet' || a.kind === 'nightstand' ? bodyH - 0.1 : bodyH * 0.5;
      const h = handleAt(a.parts.handles, m.handles, hx, hy, 0.015, true);
      if (h) leaf.add(h);
      leaf.position.set(hingeX, bodyBottom + 0.02, fz);
      leaf.userData.swing = left ? -1 : 1;
      refs.doors.push(leaf);
      all.push(leaf);
    }
  }
  // tampo
  if (a.parts.top === 'crown') {
    all.push(box(W + 0.04, 0.025, D + 0.02, m.top, 0, bodyTop, 0), box(W + 0.08, 0.035, D + 0.04, m.top, 0, bodyTop + 0.025, 0));
  } else {
    const over = a.kind === 'counter' ? 0.03 : 0.015;
    all.push(tiled(rbox(W + over, topH, D + over, 0.008, m.top, 0, bodyTop, over / 2), W, D));
  }
  return { group: grp(...all), refs };
}

// ---------- escrivaninha: tampo, gaveteiro, pés e a cadeira ----------

function deskKit(a: Assembly, m: Mats, chairMats: Mats): { group: THREE.Group; refs: CaseRefs; sit: Anchor[] } {
  const W = a.size.w;
  const D = a.size.d;
  const topY = KINDS.desk.top!;
  const tp = partOf('top', a.parts.top)!;
  const topH = tp.h ?? 0.04;
  const all: THREE.Object3D[] = [];
  all.push(tiled(rbox(W, topH, D, 0.01, m.top, 0, topY - topH, -0.12), W, D));
  // gaveteiro à direita, virado para quem senta (frente +z)
  const ped = { ...a, kind: 'nightstand' as const, size: { w: 0.46, d: D - 0.04, h: 0 }, parts: { ...a.parts, top: 'rect', legs: 'none' } };
  const pg = caseKit(ped as Assembly, m, false);
  // o tampo do gaveteiro some sob o tampo da mesa
  pg.group.scale.y = (topY - topH) / KINDS.nightstand.top!;
  pg.group.position.set(W / 2 - 0.26, 0, -0.12);
  all.push(pg.group);
  // pés do outro lado
  const legH = topY - topH;
  if (a.parts.legs === 'trestle') {
    all.push(box(0.06, legH, D * 0.8, m.legs, -W / 2 + 0.08, 0, -0.12));
  } else {
    legsAt(a.parts.legs, m.legs, legH, [
      [-W / 2 + 0.06, -0.12 - D / 2 + 0.06],
      [-W / 2 + 0.06, -0.12 + D / 2 - 0.06],
    ], all);
  }
  // cadeira, de costas para o sul
  const chairA = assemble('chair', { frame: 'rail', seat: 'pad', back: 'low', legs: 'peg' }, { w: 1, h: 1 });
  const ch = hardSeat(chairA, chairMats).group;
  ch.rotation.y = Math.PI;
  ch.position.set(0, 0, 0.36);
  all.push(ch);
  for (const d of pg.refs.drawers) d.userData.baseZ = d.position.z;
  return { group: grp(...all), refs: pg.refs, sit: [{ x: 0, y: 0.47, z: 0.34, heading: Math.PI }] };
}

// ---------- montagem ----------

export interface KitLook {
  parts?: KitParts;
  style?: ObjStyle;
}

/** As peças, medidas e materiais de um objeto montado. */
export function kitAssembly(kit: KitDef, tiles: { w: number; h: number }, look: KitLook = {}): Assembly {
  return assemble(kit.kind, partsOfObject(kit, look.parts), tiles);
}

/** Material de cada zona com o estilo do objeto por cima do de fábrica. */
export function kitMats(kit: KitDef, style?: ObjStyle): Mats {
  const zones = kitZonesOf(kit);
  const res = resolvedStyle(zones, style);
  const out = {} as Mats;
  for (const z of zones) out[z.id as PartSlot] = finishMat(res[z.id]);
  return out;
}

/** Desenha o móvel montado e diz onde se senta, deita e o que se mexe. */
export function buildKit(kit: KitDef, tiles: { w: number; h: number }, look: KitLook = {}): { model: FurnitureModel; spec: FurnitureSpec } {
  const a = kitAssembly(kit, tiles, look);
  const m = kitMats(kit, look.style);
  const k = KINDS[kit.kind];
  const spec: FurnitureSpec = { build: () => ({ group: new THREE.Group() }) };
  let group: THREE.Group;
  let refs: CaseRefs | undefined;
  switch (kit.kind) {
    case 'sofa':
    case 'armchair': {
      const r = upholstered(a, m);
      group = r.group;
      spec.sit = r.sit;
      break;
    }
    case 'chair':
    case 'stool':
    case 'bench': {
      const r = hardSeat(a, m);
      group = r.group;
      spec.sit = r.sit;
      break;
    }
    case 'bed': {
      const r = bedKit(a, m);
      group = r.group;
      spec.lie = r.lies[0];
      if (r.lies.length > 1) spec.lies = r.lies;
      break;
    }
    case 'table':
    case 'coffee':
    case 'side':
      group = tableKit(a, m);
      break;
    case 'desk': {
      const r = deskKit(a, m, { ...m, frame: m.legs, seat: m.top, back: m.top });
      group = r.group;
      refs = r.refs;
      spec.sit = r.sit;
      break;
    }
    default: {
      const r = caseKit(a, m, kit.kind === 'bookshelf');
      group = r.group;
      refs = r.refs;
    }
  }
  spec.top = k.top ?? k.seatTop;
  let open = 0;
  const model: FurnitureModel = {
    group,
    tick: refs && (refs.doors.length || refs.drawers.length) ? (info: TickInfo) => {
      // portas abrem e gavetas correm enquanto alguém usa (troca de roupa, pega coisa)
      const want = info.using ? 1 : 0;
      open += (want - open) * 0.2;
      if (Math.abs(want - open) < 0.01) open = want;
      for (const d of refs!.doors) d.rotation.y = d.userData.swing * open * 1.6;
      for (const d of refs!.drawers) d.position.z = (d.userData.baseZ ?? d.position.z) + open * (d.userData.pull ?? 0) * 0.22;
    } : undefined,
  };
  return { model, spec };
}
