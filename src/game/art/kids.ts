import * as THREE from 'three';
import { ball, box, colorMat, cyl, lathe, rbox, rod, texMat } from './build';
import type { FurnitureSpec } from './furniture';
import { group } from './furniture';
import { PAL, mix, seeded, shade } from './palette';

// Bloco 11: berço e brinquedos. Madeira clara envernizada, esmalte de cores
// de bala e tecido de algodão, nas mesmas peças de montar dos outros móveis.

const MATTRESS = 0.46;

/** Berço de grades com móbile girando por cima; o bebê deita no colchão. */
const crib: FurnitureSpec = {
  lie: { x: 0.24, y: MATTRESS + 0.06, z: 0, heading: Math.PI / 2 },
  build(seed, paint) {
    const wood = texMat('pine', { gloss: 0.5 });
    const color = paint ?? 0x2c55a6;
    const enamel = colorMat(mix(0xffffff, color, 0.55), { gloss: 0.6 });
    const sheet = texMat('duvet', { color: mix(0xffffff, color, 0.25) });
    const g = group(
      // colchão e lençol
      rbox(0.86, 0.1, 0.54, 0.04, colorMat(0xf4efdf), 0, MATTRESS - 0.1, 0),
      rbox(0.5, 0.05, 0.5, 0.025, sheet, 0.14, MATTRESS, 0),
      // travesseirinho na cabeceira (oeste)
      rbox(0.16, 0.05, 0.26, 0.025, colorMat(0xf8f4ea), -0.3, MATTRESS, 0),
      // estrado
      box(0.9, 0.04, 0.58, wood, 0, MATTRESS - 0.14, 0),
    );
    // cabeceira e pezeira mais altas, com bolinha em cima dos pés
    for (const sx of [-1, 1]) {
      g.add(rbox(0.05, 0.26, 0.6, 0.02, enamel, sx * 0.45, 0.62, 0));
      for (const sz of [-1, 1]) {
        g.add(rod([sx * 0.45, 0, sz * 0.29], [sx * 0.45, 0.92, sz * 0.29], 0.025, wood, 8));
        g.add(ball(0.035, 0.035, 0.035, enamel, sx * 0.45, 0.94, sz * 0.29, 8));
      }
    }
    // grades dos lados compridos
    for (const sz of [-1, 1]) {
      g.add(rod([-0.43, 0.88, sz * 0.29], [0.43, 0.88, sz * 0.29], 0.016, wood, 6));
      g.add(rod([-0.43, MATTRESS - 0.12, sz * 0.29], [0.43, MATTRESS - 0.12, sz * 0.29], 0.016, wood, 6));
      for (let i = 0; i < 9; i++) {
        const x = -0.38 + i * 0.095;
        g.add(rod([x, MATTRESS - 0.12, sz * 0.29], [x, 0.88, sz * 0.29], 0.009, wood, 5));
      }
    }
    // móbile: haste na cabeceira, braço por cima e quatro bichinhos pendurados
    const metal = colorMat(0xd8d0bc, { gloss: 0.7 });
    g.add(rod([-0.45, 0.9, 0.29], [-0.45, 1.32, 0.29], 0.012, metal, 6), rod([-0.45, 1.32, 0.29], [-0.1, 1.32, 0.05], 0.01, metal, 6));
    const mobile = new THREE.Group();
    mobile.position.set(-0.1, 1.3, 0.05);
    const rnd = seeded(seed + 11);
    const cols = [0xf2c744, 0xe07aa8, 0x7ec8e3, 0xa8d672];
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2;
      const x = Math.cos(a) * 0.14;
      const z = Math.sin(a) * 0.14;
      mobile.add(rod([0, 0, 0], [x, 0, z], 0.005, metal, 4), rod([x, 0, z], [x, -0.12 - rnd() * 0.05, z], 0.003, metal, 3));
      const star = ball(0.035, 0.03, 0.02, colorMat(cols[i], { gloss: 0.4 }), x, -0.17, z, 6);
      mobile.add(star);
    }
    g.add(mobile);
    let spin = 0;
    return {
      group: g,
      tick({ time, using }) {
        // o móbile gira devagar sempre; mais rápido quando alguém nina
        spin += using === 'lullBaby' ? 0.05 : 0.008;
        mobile.rotation.y = spin;
        mobile.rotation.z = Math.sin(time * 0.7) * 0.03;
      },
    };
  },
};

/** Casinha de bonecas de dois andares num banquinho, com telhado vermelho. */
const dollhouse: FurnitureSpec = {
  build(seed) {
    const wood = texMat('pine', { gloss: 0.45 });
    const wall = colorMat(0xf2e3c0, { gloss: 0.3 });
    const roof = colorMat(0xb8352b, { gloss: 0.4 });
    const trim = colorMat(0xf8f6f0, { gloss: 0.5 });
    const g = group(
      // banquinho
      rbox(0.7, 0.06, 0.5, 0.02, wood, 0, 0.3, 0),
      ...[-1, 1].flatMap((sx) => [-1, 1].map((sz) => rod([sx * 0.3, 0, sz * 0.2], [sx * 0.3, 0.3, sz * 0.2], 0.02, wood, 6))),
      // corpo da casa
      box(0.6, 0.46, 0.4, wall, 0, 0.36, -0.02),
      // piso do meio aparecendo na frente aberta
      box(0.58, 0.02, 0.06, wood, 0, 0.58, 0.19),
    );
    // telhado de duas águas
    const shape = new THREE.Shape();
    shape.moveTo(-0.36, 0);
    shape.lineTo(0, 0.26);
    shape.lineTo(0.36, 0);
    shape.lineTo(-0.36, 0);
    const prism = new THREE.Mesh(new THREE.ExtrudeGeometry(shape, { depth: 0.46, bevelEnabled: false }), roof);
    prism.position.set(0, 0.82, -0.25);
    g.add(prism);
    // chaminé
    g.add(box(0.07, 0.14, 0.07, colorMat(0x8a4a2c), 0.16, 0.92, -0.06));
    // janelas e porta na frente, com moldura branca
    const glass = colorMat(0x7ec8e3, { gloss: 0.9 });
    for (const [x, y] of [
      [-0.16, 0.66],
      [0.16, 0.66],
      [-0.16, 0.44],
    ]) {
      g.add(box(0.12, 0.11, 0.01, trim, x, y - 0.005, 0.185), box(0.09, 0.08, 0.012, glass, x, y + 0.01, 0.186));
    }
    g.add(box(0.1, 0.17, 0.012, colorMat(0x3f7a4a), 0.16, 0.36, 0.186), ball(0.008, 0.008, 0.008, colorMat(PAL.brass, { gloss: 1 }), 0.19, 0.44, 0.195, 5));
    // bonequinhos na janela de cima
    const rnd = seeded(seed + 3);
    for (const x of [-0.18, 0.14]) {
      g.add(ball(0.018, 0.022, 0.018, colorMat(0xf0c49c), x + rnd() * 0.04, 0.64, 0.17, 6));
    }
    return { group: g };
  },
};

/** Pião de madeira listrado num tapetinho redondo; gira quando a criança brinca. */
const spintop: FurnitureSpec = {
  build() {
    const g = group(cyl(0.34, 0.34, 0.012, 20, texMat('fabric', { color: 0x7ec8e3 }), 0, 0, 0));
    const top = new THREE.Group();
    const body = lathe(
      [
        [0.002, 0],
        [0.05, 0.04],
        [0.1, 0.1],
        [0.11, 0.13],
        [0.08, 0.16],
        [0.02, 0.17],
        [0.015, 0.22],
        [0.002, 0.23],
      ],
      14,
      colorMat(0xd9483f, { gloss: 0.6 }),
    );
    top.add(body, cyl(0.112, 0.112, 0.025, 14, colorMat(0xf2c744, { gloss: 0.6 }), 0, 0.105, 0, true));
    top.add(cyl(0.085, 0.085, 0.02, 14, colorMat(0x2c55a6, { gloss: 0.6 }), 0, 0.145, 0, true));
    top.position.set(0.05, 0.012, 0.04);
    // cordão enrolado do lado
    const cord = new THREE.Mesh(new THREE.TorusGeometry(0.05, 0.008, 4, 12), colorMat(0xe9e4d6));
    cord.rotation.x = -Math.PI / 2;
    cord.position.set(-0.18, 0.02, -0.12);
    g.add(top, cord);
    let spin = 0;
    return {
      group: g,
      tick({ time, using }) {
        if (using) {
          spin += 0.6;
          top.rotation.set(Math.sin(time * 3) * 0.06, spin, Math.cos(time * 3) * 0.06);
          top.position.x = 0.05 + Math.sin(time * 1.6) * 0.08;
          top.position.z = 0.04 + Math.cos(time * 1.3) * 0.08;
        } else {
          // parado, deitado de lado
          top.rotation.set(0, 0.4, 1.15);
          top.position.set(0.05, 0.1, 0.04);
        }
      },
    };
  },
};

const SADDLE = 0.5;

/** Cavalinho de balanço: corpo de madeira pintada, crina de lã e arcos no chão. */
const rockinghorse: FurnitureSpec = {
  sit: [{ x: -0.02, y: SADDLE - 0.02, z: 0, heading: Math.PI / 2 }],
  build(seed) {
    const paint = [0xf4efdf, 0xc89a5a, 0x8a4a2c][seed % 3];
    const coat = colorMat(paint, { gloss: 0.55 });
    const wood = texMat('walnut', { gloss: 0.6 });
    const mane = colorMat(shade(paint, 0.45), { gloss: 0.1 });
    const red = colorMat(0xb8352b, { gloss: 0.5 });
    const g = group();
    const rocker = new THREE.Group();
    // arcos de balanço (gomos de uma curva)
    for (const sz of [-1, 1]) {
      const steps = 10;
      for (let i = 0; i < steps; i++) {
        const a0 = -0.55 + (i / steps) * 1.1;
        const a1 = -0.55 + ((i + 1) / steps) * 1.1;
        const p = (a: number): [number, number, number] => [Math.sin(a) * 0.8, 0.9 - Math.cos(a) * 0.86, sz * 0.14];
        rocker.add(rod(p(a0), p(a1), 0.025, wood, 6));
      }
      // pernas até os arcos
      rocker.add(rod([-0.22, 0.32, sz * 0.07], [-0.3, 0.1, sz * 0.14], 0.03, coat, 6), rod([0.22, 0.32, sz * 0.07], [0.3, 0.1, sz * 0.14], 0.03, coat, 6));
    }
    rocker.add(rod([-0.55, 0.15, -0.14], [-0.55, 0.15, 0.14], 0.02, wood, 6), rod([0.55, 0.15, -0.14], [0.55, 0.15, 0.14], 0.02, wood, 6));
    // corpo, pescoço e cabeça (frente para +x)
    rocker.add(ball(0.3, 0.12, 0.11, coat, 0, 0.4, 0, 12));
    rocker.add(rod([0.2, 0.42, 0], [0.32, 0.66, 0], 0.07, coat, 8));
    const head = ball(0.13, 0.07, 0.065, coat, 0.38, 0.68, 0, 10);
    head.rotation.z = -0.5;
    rocker.add(head, ball(0.02, 0.02, 0.02, colorMat(0x15110e, { gloss: 0.9 }), 0.38, 0.72, 0.06, 6), ball(0.02, 0.02, 0.02, colorMat(0x15110e, { gloss: 0.9 }), 0.38, 0.72, -0.06, 6));
    // orelhas, crina e rabo de lã
    for (const sz of [-1, 1]) rocker.add(ball(0.02, 0.04, 0.015, coat, 0.31, 0.79, sz * 0.03, 6));
    for (let i = 0; i < 5; i++) rocker.add(ball(0.035, 0.03, 0.04, mane, 0.18 + i * 0.035, 0.52 + i * 0.055, 0, 6));
    rocker.add(rod([-0.28, 0.44, 0], [-0.4, 0.3, 0], 0.035, mane, 6));
    // sela, rédea e alças de segurar
    rocker.add(rbox(0.2, 0.04, 0.24, 0.02, red, -0.02, SADDLE - 0.04, 0));
    rocker.add(rod([0.3, 0.62, -0.08], [0.3, 0.62, 0.08], 0.012, colorMat(0xe8b830, { gloss: 0.8 }), 6));
    g.add(rocker);
    return {
      group: g,
      tick({ time, using }) {
        rocker.rotation.z = using ? Math.sin(time * 3.2) * 0.16 : rocker.rotation.z * 0.9;
      },
    };
  },
};

export const KID_ART: Record<string, FurnitureSpec> = { crib, dollhouse, spintop, rockinghorse };
