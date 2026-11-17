import * as THREE from 'three';
import { ball, box, colorMat, cyl, lathe, rbox, rod, texMat } from './build';
import type { FurnitureSpec } from './furniture';
import { chrome, group } from './furniture';
import { PAL } from './palette';

// Bloco 8: recompensas de carreira. Um objeto por carreira, liberado num
// cargo alto. Frente para +z, ocupando um tile centrado na origem.

const walnut = () => texMat('walnut', { gloss: 0.45 });
const brass = () => colorMat(PAL.brass, { gloss: 0.9 });

/** Ábaco de mogno sobre um pedestal (repartição). */
const abacus: FurnitureSpec = {
  build() {
    const wood = walnut();
    const g = group(
      cyl(0.16, 0.2, 0.06, 12, wood, 0, 0, 0),
      cyl(0.05, 0.06, 0.7, 10, wood, 0, 0.06, 0),
      rbox(0.78, 0.06, 0.3, 0.02, wood, 0, 0.76, 0),
    );
    // moldura em pé com as varetas e as contas coloridas
    const frame = new THREE.Group();
    frame.add(box(0.7, 0.04, 0.05, wood, 0, 0, 0), box(0.7, 0.04, 0.05, wood, 0, 0.46, 0));
    for (const sx of [-1, 1]) frame.add(box(0.04, 0.5, 0.05, wood, sx * 0.33, 0, 0));
    frame.add(box(0.62, 0.025, 0.04, wood, 0, 0.32, 0));
    const colors = [0xc9382f, 0xe8b830, 0x2f8a86, 0x2f4f86, 0xf4efdf];
    for (let r = 0; r < 5; r++) {
      const y = 0.06 + r * 0.075 + (r > 3 ? 0.04 : 0);
      frame.add(rod([-0.31, y, 0], [0.31, y, 0], 0.005, brass(), 4));
      for (let i = 0; i < 6; i++) {
        const slide = (r * 37 + i * 13) % 5 === 0 ? 0.18 : 0;
        frame.add(ball(0.028, 0.024, 0.028, colorMat(colors[r], { gloss: 0.7 }), -0.26 + i * 0.045 + slide, y, 0, 8));
      }
    }
    frame.position.set(0, 0.82, -0.02);
    g.add(frame);
    return { group: g };
  },
};

/** Carrinho de temperos com potes e réstia de alho (cozinha). */
const spicecart: FurnitureSpec = {
  build(seed) {
    const wood = texMat('pine', { gloss: 0.3 });
    const g = group(
      rbox(0.82, 0.05, 0.56, 0.02, wood, 0, 0.82, 0),
      rbox(0.78, 0.04, 0.5, 0.02, wood, 0, 0.42, 0),
      box(0.82, 0.12, 0.03, wood, 0, 0.87, -0.27),
    );
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) g.add(box(0.04, 0.82, 0.04, wood, sx * 0.38, 0.04, sz * 0.24));
    for (const sx of [-1, 1]) {
      const wheel = cyl(0.05, 0.05, 0.03, 10, colorMat(0x2a2a2a), sx * 0.38, 0, 0.24);
      wheel.rotation.x = Math.PI / 2;
      wheel.position.y = 0.05;
      g.add(wheel);
    }
    const tones = [0xc9382f, 0xe8b830, 0x5a8a3a, 0x8a4a2a, 0xd27a2a, 0x6b3a6e];
    for (let i = 0; i < 6; i++) {
      const x = -0.3 + (i % 3) * 0.3;
      const z = i < 3 ? -0.1 : 0.12;
      g.add(cyl(0.07, 0.07, 0.12, 10, colorMat(0xe8f0ec, { gloss: 0.9 }), x, 0.87, z));
      g.add(cyl(0.065, 0.065, 0.07, 10, colorMat(tones[(i + seed) % tones.length]), x, 0.88, z));
      g.add(cyl(0.072, 0.072, 0.025, 10, wood, x, 0.99, z));
    }
    // ramo de ervas e réstia de alho penduradas na grade de trás
    for (let i = 0; i < 4; i++) g.add(ball(0.035, 0.03, 0.035, colorMat(0xf2ead6), -0.3 + i * 0.05, 0.86 - i * 0.04, -0.29, 8));
    g.add(rod([0.2, 0.98, -0.29], [0.3, 0.84, -0.29], 0.02, colorMat(0x4f7a3a), 6));
    return { group: g };
  },
};

/** Prensa de gravura com volante (ateliê). */
const press: FurnitureSpec = {
  build() {
    const iron = colorMat(0x2a2d30, { gloss: 0.6 });
    const g = group(
      box(0.86, 0.06, 0.6, iron, 0, 0, 0),
      rbox(0.8, 0.06, 0.5, 0.01, colorMat(0xd8d0bc), 0, 0.72, 0),
      box(0.6, 0.008, 0.38, colorMat(0xf4efdf), 0, 0.78, 0.02),
    );
    for (const sx of [-1, 1]) {
      g.add(box(0.06, 0.72, 0.5, iron, sx * 0.4, 0.06, 0), box(0.08, 0.5, 0.08, iron, sx * 0.4, 0.78, -0.05));
    }
    // rolo de cima e volante de raios
    const roller = cyl(0.08, 0.08, 0.78, 14, chrome(), 0, 0, -0.05);
    roller.rotation.z = Math.PI / 2;
    roller.position.set(0, 0.95, -0.05);
    const wheel = new THREE.Group();
    wheel.add(new THREE.Mesh(new THREE.TorusGeometry(0.26, 0.022, 6, 18), colorMat(0xc9382f, { gloss: 0.7 })));
    for (let i = 0; i < 4; i++) {
      const spoke = box(0.52, 0.02, 0.02, iron);
      spoke.position.y = -0.01;
      spoke.rotation.z = (i * Math.PI) / 4;
      wheel.add(spoke);
    }
    wheel.rotation.y = Math.PI / 2;
    wheel.position.set(0.48, 0.95, -0.05);
    g.add(roller, wheel);
    return {
      group: g,
      tick({ time, using }) {
        if (using) wheel.rotation.x = time * 1.8;
      },
    };
  },
};

/** Esqueleto de estudo num suporte com rodinhas (posto de saúde). */
const skeleton: FurnitureSpec = {
  build() {
    const bone = colorMat(0xeee6d0, { gloss: 0.4 });
    const steel = chrome();
    const g = group(cyl(0.22, 0.24, 0.04, 12, colorMat(0x3a3f48), 0, 0, 0), cyl(0.012, 0.012, 1.6, 6, steel, 0, 0.04, -0.12));
    g.add(rod([0, 1.62, -0.12], [0, 1.62, -0.03], 0.012, steel, 6));
    // crânio, coluna, costelas, bacia, braços e pernas
    g.add(ball(0.09, 0.11, 0.1, bone, 0, 1.5, 0, 10), ball(0.06, 0.04, 0.06, bone, 0, 1.4, 0.02, 8));
    g.add(cyl(0.018, 0.018, 0.6, 6, bone, 0, 0.82, -0.02));
    for (let i = 0; i < 5; i++) {
      const rib = new THREE.Mesh(new THREE.TorusGeometry(0.11 - i * 0.008, 0.01, 4, 14, Math.PI * 1.6), bone);
      rib.rotation.set(Math.PI / 2, 0, Math.PI * 0.7);
      rib.position.set(0, 1.28 - i * 0.06, 0.0);
      g.add(rib);
    }
    g.add(ball(0.13, 0.06, 0.08, bone, 0, 0.84, 0, 10));
    for (const sx of [-1, 1]) {
      g.add(rod([sx * 0.12, 1.32, 0], [sx * 0.17, 1.02, 0.02], 0.016, bone), rod([sx * 0.17, 1.02, 0.02], [sx * 0.18, 0.78, 0.08], 0.013, bone));
      g.add(rod([sx * 0.07, 0.82, 0], [sx * 0.08, 0.44, 0.02], 0.02, bone), rod([sx * 0.08, 0.44, 0.02], [sx * 0.08, 0.08, 0], 0.016, bone));
      g.add(box(0.06, 0.02, 0.12, bone, sx * 0.08, 0.06, 0.04));
    }
    return { group: g };
  },
};

/** Torno de bancada com a peça girando (oficina). */
const lathe1: FurnitureSpec = {
  build() {
    const green = colorMat(0x4a7a5a, { gloss: 0.6 });
    const iron = colorMat(0x3a3d40, { gloss: 0.6 });
    const g = group(rbox(0.9, 0.06, 0.5, 0.02, texMat('pine', { gloss: 0.2 }), 0, 0.8, 0));
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) g.add(box(0.05, 0.8, 0.05, iron, sx * 0.4, 0, sz * 0.2));
    g.add(box(0.7, 0.06, 0.16, iron, 0, 0.86, -0.04), rbox(0.2, 0.24, 0.2, 0.03, green, -0.28, 0.9, -0.04), rbox(0.12, 0.16, 0.14, 0.03, green, 0.26, 0.9, -0.04));
    const piece = new THREE.Group();
    const wood = lathe(
      [
        [0.03, -0.18],
        [0.05, -0.12],
        [0.035, -0.04],
        [0.055, 0.04],
        [0.03, 0.12],
        [0.04, 0.18],
      ],
      10,
      texMat('pine', { color: 0xd8a868 }),
    );
    wood.rotation.z = Math.PI / 2;
    piece.add(wood);
    piece.position.set(0, 1.02, -0.04);
    g.add(piece);
    // aparas no chão do tampo
    for (let i = 0; i < 6; i++) g.add(box(0.03, 0.005, 0.015, colorMat(0xe8c890), -0.15 + i * 0.06, 0.865, 0.15 - (i % 2) * 0.05));
    return {
      group: g,
      tick({ time, using }) {
        if (using) piece.rotation.x = time * 12;
      },
    };
  },
};

/** Monociclo num suporte, com cones (trupe). */
const unicycle: FurnitureSpec = {
  build() {
    const red = colorMat(0xc9382f, { gloss: 0.8 });
    const tire = colorMat(0x1b1b1e);
    const steel = chrome();
    const g = group(box(0.5, 0.04, 0.2, colorMat(0x3a3f48), 0, 0, 0));
    const wheel = new THREE.Mesh(new THREE.TorusGeometry(0.24, 0.035, 6, 20), tire);
    wheel.rotation.y = Math.PI / 2;
    wheel.position.set(0, 0.28, 0);
    g.add(wheel, rod([0, 0.28, 0], [0, 0.95, -0.02], 0.02, red), rbox(0.1, 0.05, 0.24, 0.025, colorMat(0x1f1f24), 0, 0.95, -0.02));
    for (let i = 0; i < 6; i++) {
      const a = (i * Math.PI) / 3;
      g.add(rod([0, 0.28, 0], [0, 0.28 + Math.sin(a) * 0.22, Math.cos(a) * 0.22], 0.004, steel, 4));
    }
    for (const [x, z] of [
      [-0.35, 0.3],
      [0.35, 0.3],
    ]) {
      g.add(cyl(0.01, 0.09, 0.26, 10, colorMat(0xd27a2a), x, 0, z), box(0.18, 0.015, 0.18, colorMat(0xd27a2a), x, 0, z));
    }
    return { group: g };
  },
};

/** Planetário de mesa com órbitas que giram (observatório). */
const orrery: FurnitureSpec = {
  build() {
    const g = group(cyl(0.2, 0.26, 0.08, 14, walnut(), 0, 0, 0), cyl(0.03, 0.04, 0.7, 8, brass(), 0, 0.08, 0), cyl(0.3, 0.3, 0.03, 18, walnut(), 0, 0.78, 0));
    const sun = ball(0.08, 0.08, 0.08, colorMat(0xf0c040, { emissive: 0xf0a020, emissiveIntensity: 0.45 }), 0, 1.0, 0, 12);
    g.add(cyl(0.012, 0.012, 0.2, 6, brass(), 0, 0.8, 0), sun);
    const arms: THREE.Group[] = [];
    const planets: [number, number, number][] = [
      [0.16, 0.025, 0x9a8a7a],
      [0.24, 0.035, 0x2f6faa],
      [0.33, 0.03, 0xc9582f],
      [0.43, 0.05, 0xd8b878],
    ];
    planets.forEach(([r, size, color], i) => {
      const arm = new THREE.Group();
      arm.add(rod([0, 0, 0], [r, 0, 0], 0.005, brass(), 4), ball(size, size, size, colorMat(color, { gloss: 0.6 }), r, 0, 0, 10));
      if (i === 3) {
        const ring = new THREE.Mesh(new THREE.TorusGeometry(0.075, 0.008, 4, 16), brass());
        ring.position.set(r, 0, 0);
        ring.rotation.x = 1.2;
        arm.add(ring);
      }
      arm.position.y = 1.0 - i * 0.012;
      arm.rotation.y = i * 1.7;
      g.add(arm);
      arms.push(arm);
    });
    return {
      group: g,
      tick({ time, using }) {
        const k = using ? 1.2 : 0.08;
        arms.forEach((a, i) => (a.rotation.y = i * 1.7 + (time * k) / (i + 1)));
      },
    };
  },
};

/** Púlpito com microfone e bandeirinha (câmara). */
const podium: FurnitureSpec = {
  build() {
    const wood = walnut();
    const g = group(
      rbox(0.62, 0.06, 0.46, 0.02, wood, 0, 0, 0),
      rbox(0.52, 1.0, 0.36, 0.04, wood, 0, 0.06, 0),
      rbox(0.6, 0.05, 0.44, 0.02, wood, 0, 1.06, -0.02),
      box(0.36, 0.24, 0.01, colorMat(0x2f8a46), 0, 0.6, 0.18),
      ball(0.06, 0.06, 0.01, colorMat(0xe8c040), 0, 0.72, 0.19, 10),
    );
    g.add(rod([0, 1.1, -0.05], [0, 1.3, 0.12], 0.008, chrome(), 6), ball(0.03, 0.04, 0.03, colorMat(0x2a2a2a, { gloss: 0.7 }), 0, 1.31, 0.13, 8));
    g.add(rod([0.26, 1.1, -0.18], [0.26, 1.5, -0.18], 0.008, brass(), 4), box(0.2, 0.13, 0.005, colorMat(0x3a6ab0), 0.36, 1.42, -0.18));
    return { group: g };
  },
};

/** Barra fixa de ferro (clube). */
const pullbar: FurnitureSpec = {
  build() {
    const green = colorMat(0x2f7a3a, { gloss: 0.7 });
    const g = group(box(0.9, 0.03, 0.5, colorMat(0x3a3a3a), 0, 0, 0));
    for (const sx of [-1, 1]) {
      g.add(cyl(0.035, 0.035, 2.1, 8, green, sx * 0.42, 0.03, -0.05));
      g.add(rod([sx * 0.42, 0.03, 0.2], [sx * 0.42, 0.8, -0.05], 0.02, green, 6), rod([sx * 0.42, 0.03, -0.3], [sx * 0.42, 0.8, -0.05], 0.02, green, 6));
    }
    g.add(rod([-0.44, 2.0, -0.05], [0.44, 2.0, -0.05], 0.018, chrome(), 8));
    // toalha pendurada
    g.add(box(0.04, 0.4, 0.22, texMat('fabric', { color: 0xf4efdf }), 0.42, 1.2, -0.05));
    return { group: g };
  },
};

/** Painel de nós de marinheiro e cordas (brigada). */
const knotboard: FurnitureSpec = {
  build() {
    const wood = texMat('pine', { color: 0xb88a5a });
    const rope = colorMat(0xd8c08a, { gloss: 0.2 });
    const g = group(box(0.7, 0.04, 0.3, wood, 0, 0, -0.1));
    for (const sx of [-1, 1]) g.add(box(0.05, 1.5, 0.05, wood, sx * 0.32, 0.04, -0.15));
    g.add(rbox(0.74, 0.9, 0.04, 0.01, wood, 0, 0.6, -0.15), box(0.66, 0.82, 0.005, colorMat(0x8a2a24), 0, 0.64, -0.128));
    for (let i = 0; i < 6; i++) {
      const x = -0.2 + (i % 3) * 0.2;
      const y = 1.25 - Math.floor(i / 3) * 0.32;
      const knot = new THREE.Mesh(new THREE.TorusKnotGeometry(0.04, 0.012, 24, 5, 2, 3), rope);
      knot.position.set(x, y, -0.11);
      g.add(knot, rod([x, y - 0.05, -0.11], [x + 0.01, y - 0.17, -0.11], 0.01, rope, 4));
    }
    // rolo de corda no pé e o machadinho pendurado
    const coil = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.03, 6, 16), rope);
    coil.rotation.x = Math.PI / 2;
    coil.position.set(-0.2, 0.08, 0.05);
    g.add(coil, rod([0.22, 0.4, -0.12], [0.22, 0.75, -0.12], 0.015, colorMat(0xc9382f)), box(0.12, 0.08, 0.02, chrome(), 0.26, 0.72, -0.12));
    return { group: g };
  },
};

export const REWARD_ART: Record<string, FurnitureSpec> = {
  abacus,
  spicecart,
  press,
  skeleton,
  lathe: lathe1,
  unicycle,
  orrery,
  podium,
  pullbar,
  knotboard,
};
