import * as THREE from 'three';
import type { VehicleDef, VehicleKind } from '../../sim/types';
import { ball, box, colorMat, cyl, rbox, rod, texMat } from './build';
import { shade } from './palette';

// Bloco 8: as caronas de cada carreira. Um montador só, com o perfil de cada
// tipo (comprimento, altura da lataria, onde fica a cabine) e o que vai no
// teto. Frente virada para +x, como os carros estacionados do cenário.

interface Profile {
  len: number;
  width: number;
  /** altura da lataria (sem a cabine) */
  body: number;
  /** cabine de vidro: de onde a onde (em x, a partir do centro) e altura */
  cab: [number, number];
  cabH: number;
  /** caçamba aberta atrás da cabine */
  bed?: boolean;
  /** lataria alta e quadrada (furgão, ônibus): a cabine é uma faixa de janelas */
  boxy?: boolean;
  wheel: number;
  /** distância do chão até a lataria */
  lift: number;
}

const PROFILES: Record<VehicleKind, Profile> = {
  compact: { len: 3.3, width: 1.6, body: 0.55, cab: [-1.0, 0.55], cabH: 0.52, wheel: 0.3, lift: 0.18 },
  sedan: { len: 4.1, width: 1.7, body: 0.55, cab: [-1.3, 0.8], cabH: 0.55, wheel: 0.34, lift: 0.2 },
  wagon: { len: 4.4, width: 1.72, body: 0.58, cab: [-1.95, 0.8], cabH: 0.58, wheel: 0.34, lift: 0.2 },
  van: { len: 4.5, width: 1.8, body: 1.45, cab: [-2.0, 1.6], cabH: 0, boxy: true, wheel: 0.36, lift: 0.22 },
  minibus: { len: 5.8, width: 1.9, body: 1.65, cab: [-2.6, 2.6], cabH: 0, boxy: true, wheel: 0.4, lift: 0.25 },
  pickup: { len: 4.5, width: 1.75, body: 0.62, cab: [0.0, 1.3], cabH: 0.62, bed: true, wheel: 0.38, lift: 0.3 },
  jeep: { len: 3.7, width: 1.7, body: 0.7, cab: [-1.2, 0.7], cabH: 0.6, wheel: 0.42, lift: 0.38 },
  limo: { len: 6.2, width: 1.8, body: 0.55, cab: [-2.4, 1.5], cabH: 0.55, wheel: 0.34, lift: 0.18 },
  truck: { len: 6.4, width: 2.0, body: 1.25, cab: [1.4, 2.8], cabH: 0.7, wheel: 0.48, lift: 0.4 },
  sport: { len: 4.0, width: 1.75, body: 0.42, cab: [-0.9, 0.5], cabH: 0.42, wheel: 0.32, lift: 0.14 },
};

/** Comprimento do veículo (para a tela saber onde parar). */
export function vehicleLength(kind: VehicleKind): number {
  return PROFILES[kind].len;
}

export interface VehicleModel {
  group: THREE.Group;
  /** gira as rodas conforme o quanto andou */
  roll(distance: number): void;
  /** pisca as luzes do teto (quando tem) */
  tick(time: number): void;
}

export function buildVehicle(def: VehicleDef): VehicleModel {
  const p = PROFILES[def.kind];
  const g = new THREE.Group();
  const paint = colorMat(def.color, { gloss: 0.9 });
  const stripe = colorMat(def.stripe, { gloss: 0.7 });
  const steel = texMat('chrome', { gloss: 1 });
  const glass = texMat('carGlass', { gloss: 0.9 });
  const tire = colorMat(0x1b1b1e);
  const half = p.len / 2;
  const hw = p.width / 2;
  const y0 = p.lift;

  // lataria
  if (p.boxy) {
    g.add(rbox(p.len, p.body, p.width, 0.14, paint, 0, y0, 0));
    // faixa de janelas dos lados e para-brisa na frente
    const winY = y0 + p.body * 0.55;
    const winH = p.body * 0.32;
    g.add(box(p.len - 0.9, winH, p.width + 0.02, [glass, glass, paint, paint, glass, glass], -0.25, winY, 0));
    g.add(box(0.02, winH * 1.15, p.width - 0.3, glass, half + 0.005, winY - 0.03, 0));
    g.add(box(p.len + 0.02, 0.14, p.width + 0.03, stripe, 0, y0 + p.body * 0.3, 0));
  } else {
    g.add(rbox(p.len, p.body, p.width, 0.16, paint, 0, y0, 0));
    g.add(box(p.len + 0.02, 0.08, p.width + 0.03, stripe, 0, y0 + p.body * 0.55, 0));
    const [c0, c1] = p.cab;
    const cl = c1 - c0;
    const cx = (c0 + c1) / 2;
    const cy = y0 + p.body - 0.02;
    g.add(rbox(cl, p.cabH, p.width - 0.2, 0.18, paint, cx, cy, 0));
    // vidros: laterais e frente/trás
    g.add(box(cl - 0.4, p.cabH * 0.62, p.width - 0.18, [glass, glass, paint, paint, glass, glass], cx, cy + p.cabH * 0.12, 0));
    g.add(box(cl + 0.02, p.cabH * 0.6, p.width - 0.4, [glass, glass, paint, paint, paint, paint], cx, cy + p.cabH * 0.12, 0));
    if (p.bed) {
      // caçamba: paredes baixas atrás da cabine
      const bl = half + c0;
      const bx = -half + bl / 2;
      const top = y0 + p.body;
      g.add(box(bl, 0.28, 0.06, paint, bx, top, hw - 0.03), box(bl, 0.28, 0.06, paint, bx, top, -hw + 0.03), box(0.06, 0.28, p.width, paint, -half + 0.03, top, 0));
      g.add(box(bl - 0.1, 0.02, p.width - 0.12, colorMat(0x3a3530), bx, top - 0.01, 0));
    }
    if (def.kind === 'truck') {
      // baú da brigada atrás da cabine, com portinholas
      const bl = half + c0 - 0.1;
      const bx = -half + bl / 2;
      g.add(rbox(bl, 0.7, p.width - 0.05, 0.06, paint, bx, y0 + p.body - 0.02, 0));
      for (let i = 0; i < 3; i++) g.add(box(bl / 3 - 0.12, 0.5, 0.02, colorMat(shade(def.color, 0.75)), -half + (i + 0.5) * (bl / 3), y0 + p.body + 0.08, hw - 0.01));
    }
    if (def.kind === 'jeep') {
      // estepe atrás e santantônio
      const spare = cyl(0.36, 0.36, 0.2, 14, tire, -half - 0.08, y0 + 0.3, 0);
      spare.rotation.z = Math.PI / 2;
      g.add(spare);
    }
  }

  // para-choques, faróis e lanternas
  g.add(rbox(0.1, 0.14, p.width + 0.04, 0.04, steel, half + 0.02, y0 + 0.04, 0), rbox(0.1, 0.14, p.width + 0.04, 0.04, steel, -half - 0.02, y0 + 0.04, 0));
  for (const sz of [-1, 1]) {
    g.add(
      ball(0.05, 0.1, 0.14, colorMat(0xfff3c0, { emissive: 0xfff3c0, emissiveIntensity: 0.35 }), half + 0.01, y0 + 0.3, sz * (hw - 0.28), 8),
      ball(0.04, 0.08, 0.12, colorMat(0xc9382f, { gloss: 0.8 }), -half - 0.01, y0 + 0.3, sz * (hw - 0.25), 8),
    );
  }

  // rodas (giram com a distância)
  const wheels: THREE.Group[] = [];
  const axles = p.len > 5 ? [-half + 0.9, -half + 1.9, half - 1.0] : [-half + 0.8, half - 0.85];
  for (const sz of [-1, 1]) {
    for (const ax of axles) {
      const hold = new THREE.Group();
      hold.position.set(ax, p.wheel, sz * (hw - 0.08));
      const wheel = cyl(p.wheel, p.wheel, 0.24, 14, tire);
      wheel.rotation.x = Math.PI / 2;
      wheel.position.set(0, 0, 0);
      // calota com um risco, para dar para ver a roda girando
      const hub = box(p.wheel * 1.2, p.wheel * 0.28, 0.02, steel);
      hub.position.set(0, 0, sz * 0.13);
      hold.add(wheel, hub);
      g.add(hold);
      wheels.push(hold);
    }
  }

  // teto
  const roofY = p.boxy ? y0 + p.body : p.cabH ? y0 + p.body + p.cabH - 0.04 : y0 + p.body;
  const roofX = p.boxy ? 0.4 : (p.cab[0] + p.cab[1]) / 2;
  const blink: THREE.MeshPhongMaterial[] = [];
  if (def.roof === 'lights') {
    const a = colorMat(0xe0302a, { emissive: 0xe0302a, emissiveIntensity: 0.2 });
    const b = colorMat(0xf0b030, { emissive: 0xf0b030, emissiveIntensity: 0.2 });
    blink.push(a, b);
    g.add(box(0.3, 0.06, 1.0, colorMat(0x2a2a2a), roofX, roofY, 0));
    g.add(rbox(0.26, 0.12, 0.42, 0.05, a, roofX, roofY + 0.06, -0.24), rbox(0.26, 0.12, 0.42, 0.05, b, roofX, roofY + 0.06, 0.24));
  } else if (def.roof === 'rack') {
    for (const sz of [-1, 1]) g.add(rod([roofX - 0.8, roofY + 0.1, sz * 0.6], [roofX + 0.6, roofY + 0.1, sz * 0.6], 0.025, steel, 6));
    g.add(box(1.0, 0.18, 0.7, texMat('pine', { color: 0xc8a26a }), roofX - 0.1, roofY + 0.12, 0));
  } else if (def.roof === 'ladder') {
    const ladder = new THREE.Group();
    for (const sz of [-1, 1]) ladder.add(rod([-2.6, 0, sz * 0.3], [1.2, 0, sz * 0.3], 0.03, steel, 6));
    for (let x = -2.5; x <= 1.1; x += 0.3) ladder.add(rod([x, 0, -0.3], [x, 0, 0.3], 0.018, steel, 6));
    ladder.position.set(-0.4, y0 + p.body + 0.72, 0);
    g.add(ladder);
  } else if (def.roof === 'sign') {
    const board = colorMat(def.stripe, { gloss: 0.4 });
    g.add(box(0.06, 0.32, 1.1, board, roofX, roofY + 0.08, 0), rod([roofX, roofY - 0.02, -0.3], [roofX, roofY + 0.1, -0.3], 0.02, steel), rod([roofX, roofY - 0.02, 0.3], [roofX, roofY + 0.1, 0.3], 0.02, steel));
    for (const sx of [-1, 1]) g.add(box(0.01, 0.12, 0.7, colorMat(def.color), roofX + sx * 0.035, roofY + 0.18, 0));
  } else if (def.roof === 'horn') {
    const cone = cyl(0.04, 0.2, 0.42, 12, colorMat(def.stripe, { gloss: 0.8 }), roofX + 0.3, roofY + 0.18, 0);
    cone.rotation.z = -Math.PI / 2;
    g.add(cone, box(0.08, 0.2, 0.08, steel, roofX, roofY, 0));
  }

  return {
    group: g,
    roll(distance) {
      for (const w of wheels) w.rotation.z = -distance / p.wheel;
    },
    tick(time) {
      blink.forEach((m, i) => {
        m.emissiveIntensity = Math.sin(time * 9 + i * Math.PI) > 0 ? 1.1 : 0.1;
      });
    },
  };
}
