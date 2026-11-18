import * as THREE from 'three';
import { ball, box, colorMat, cyl, lathe, rbox, rod, texMat } from './build';
import type { FurnitureSpec } from './furniture';
import { chair, chrome, group } from './furniture';
import { PAL } from './palette';

// Bloco 16: o centro da cidade. Mesa de cantina com toalha xadrez e vela na
// garrafa, balcão do café com a máquina cromada, arara de roupas, prateleira
// de presentes, balcão de encomendas, chafariz de pedra, banco de praça e
// lampião; e as duas encomendas que chegam em casa (aquário e globo).
// Mesma regra dos outros modelos: centro na base, frente para +z.

const walnut = () => texMat('walnut', { gloss: 0.45 });
const pine = () => texMat('pine', { gloss: 0.3 });
const iron = () => colorMat(0x26282b, { gloss: 0.5 });
const stone = () => colorMat(0xc9c0ae, { gloss: 0.15 });

/** Mesa de cantina: tampo quadrado, toalha xadrez vermelha, vela na garrafa e cadeiras de madeira nas pontas. */
const bistro: FurnitureSpec = {
  sit: [
    { x: -1.08, y: 0.47, z: 0, heading: Math.PI / 2 },
    { x: 1.08, y: 0.47, z: 0, heading: -Math.PI / 2 },
  ],
  build() {
    const wood = walnut();
    const west = chair(texMat('walnut', { gloss: 0.35, color: 0xc89a6a }));
    west.position.x = -1.0;
    west.rotation.y = Math.PI / 2;
    const east = chair(texMat('walnut', { gloss: 0.35, color: 0xc89a6a }));
    east.position.x = 1.0;
    east.rotation.y = -Math.PI / 2;
    const red = colorMat(0xb8342c, { gloss: 0.2 });
    const white = colorMat(0xf2ece0, { gloss: 0.2 });
    const g = group(west, east, box(0.9, 0.04, 0.9, wood, 0, 0.7, 0));
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) g.add(box(0.05, 0.7, 0.05, wood, sx * 0.38, 0, sz * 0.38));
    // toalha xadrez: quadradinhos alternados e a barra caindo pelos lados
    const n = 6;
    const s = 0.98 / n;
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) g.add(box(s, 0.008, s, (i + j) % 2 ? white : red, -0.49 + s * (i + 0.5), 0.74, -0.49 + s * (j + 0.5)));
    }
    for (const [w, d, x, z] of [
      [1.0, 0.01, 0, 0.495],
      [1.0, 0.01, 0, -0.495],
      [0.01, 1.0, 0.495, 0],
      [0.01, 1.0, -0.495, 0],
    ]) {
      g.add(box(w, 0.16, d, red, x, 0.59, z));
    }
    // garrafa com vela, pratos, taças e um cesto de pão
    g.add(
      lathe(
        [
          [0.05, 0],
          [0.055, 0.12],
          [0.02, 0.2],
          [0.018, 0.25],
        ],
        10,
        colorMat(0x2f5a34, { gloss: 0.9 }),
        0,
        0.75,
        0,
      ),
      cyl(0.014, 0.014, 0.08, 8, colorMat(0xf4eedc), 0, 1.0, 0),
      ball(0.012, 0.022, 0.012, colorMat(0xffd27a, { emissive: 0xffb84a, emissiveIntensity: 0.9 }), 0, 1.1, 0, 6),
      cyl(0.11, 0.09, 0.03, 12, white, 0, 0.75, 0.18),
    );
    for (const sx of [-1, 1]) {
      g.add(
        cyl(0.12, 0.08, 0.015, 14, colorMat(0xf4f2ea, { gloss: 0.8 }), sx * 0.27, 0.75, 0),
        rod([sx * 0.27, 0.75, -0.2], [sx * 0.27, 0.83, -0.2], 0.006, colorMat(0xd8ecf2, { gloss: 0.9, opacity: 0.8 })),
        cyl(0.035, 0.02, 0.06, 10, colorMat(0xd8ecf2, { gloss: 0.9, opacity: 0.75 }), sx * 0.27, 0.83, -0.2),
      );
    }
    g.add(ball(0.04, 0.025, 0.03, colorMat(0xd99a4e), -0.03, 0.78, 0.18, 8), ball(0.04, 0.025, 0.03, colorMat(0xc98a3e), 0.04, 0.78, 0.17, 8));
    return { group: g };
  },
};

/** Balcão do café: armário de madeira, tampo de mármore, máquina cromada, xícaras e bolo na redoma. */
const espresso: FurnitureSpec = {
  build() {
    const wood = pine();
    const marble = colorMat(0xe9e5dc, { gloss: 0.7 });
    const g = group(
      rbox(1.9, 0.92, 0.66, 0.03, wood, 0, 0, -0.08),
      box(1.96, 0.05, 0.72, marble, 0, 0.92, -0.08),
      box(1.7, 0.06, 0.02, colorMat(0x6b3a22), 0, 0.55, 0.26),
    );
    // máquina de espresso com dois bicos e o manômetro
    const metal = chrome();
    g.add(
      rbox(0.66, 0.44, 0.4, 0.05, metal, -0.45, 0.97, -0.16),
      rbox(0.6, 0.06, 0.34, 0.02, colorMat(0x8a2a22, { gloss: 0.7 }), -0.45, 1.41, -0.16),
      ball(0.14, 0.12, 0.14, metal, -0.45, 1.5, -0.16, 12),
      cyl(0.05, 0.05, 0.02, 12, colorMat(0xf4efdf), -0.45, 1.2, 0.05),
    );
    for (const sx of [-0.6, -0.3]) g.add(rod([sx, 1.06, 0.03], [sx, 1.06, 0.12], 0.025, metal), cyl(0.04, 0.03, 0.05, 10, colorMat(0xf4f2ea, { gloss: 0.8 }), sx, 0.97, 0.12));
    // xícaras empilhadas e bolo de fubá na redoma
    for (let i = 0; i < 3; i++) g.add(cyl(0.045, 0.035, 0.05, 10, colorMat(0xf4f2ea, { gloss: 0.8 }), 0.12, 0.97 + i * 0.05, -0.1));
    g.add(
      cyl(0.18, 0.18, 0.02, 16, colorMat(0xd8d0c0, { gloss: 0.7 }), 0.55, 0.97, -0.08),
      cyl(0.14, 0.14, 0.1, 16, colorMat(0xe2b34e), 0.55, 0.99, -0.08),
      lathe(
        [
          [0.17, 0],
          [0.17, 0.12],
          [0.12, 0.2],
          [0.02, 0.24],
        ],
        14,
        colorMat(0xdff0f4, { gloss: 1, opacity: 0.35 }),
        0.55,
        0.99,
        -0.08,
      ),
    );
    return { group: g };
  },
};

/** Arara de roupas: barra cromada em dois pés, cabides com camisas e vestidos coloridos. */
const clothesrack: FurnitureSpec = {
  build(seed) {
    const metal = chrome();
    const g = group(rod([-0.85, 1.55, -0.05], [0.85, 1.55, -0.05], 0.02, metal));
    for (const sx of [-1, 1]) {
      g.add(rod([sx * 0.85, 0.05, -0.05], [sx * 0.85, 1.55, -0.05], 0.02, metal), box(0.08, 0.04, 0.5, iron(), sx * 0.85, 0, -0.05));
    }
    const tones = [0xc9382f, 0x2f7fc4, 0xe8b830, 0x3f9455, 0x7d55ad, 0xe9e4d6, 0x2b2d33, 0xd27a2a];
    for (let i = 0; i < 9; i++) {
      const x = -0.72 + i * 0.18;
      const col = colorMat(tones[(i + seed) % tones.length], { gloss: 0.15 });
      g.add(rod([x, 1.55, -0.05], [x, 1.46, -0.05], 0.006, metal, 4));
      const long = (i + seed) % 3 === 0;
      g.add(rbox(0.14, long ? 0.78 : 0.5, 0.34, 0.03, col, x, long ? 0.66 : 0.94, -0.05));
      g.add(box(0.15, 0.05, 0.34, col, x, 1.42, -0.05));
    }
    return { group: g };
  },
};

/** Prateleira de presentes: estante de três prateleiras com caixas embrulhadas, laços e um ursinho. */
const giftshelf: FurnitureSpec = {
  build(seed) {
    const wood = walnut();
    const g = group(box(1.8, 1.7, 0.04, wood, 0, 0, -0.3));
    for (const sx of [-1, 1]) g.add(box(0.05, 1.7, 0.42, wood, sx * 0.88, 0, -0.1));
    for (const y of [0.05, 0.6, 1.15, 1.68]) g.add(box(1.8, 0.04, 0.42, wood, 0, y, -0.1));
    const tones = [0xc9382f, 0x2f8a86, 0xe8b830, 0x7d55ad, 0xf4efdf, 0x2f4f86];
    let k = seed;
    for (const y of [0.09, 0.64, 1.19]) {
      let x = -0.75;
      while (x < 0.7) {
        const w = 0.18 + ((k * 7) % 3) * 0.06;
        const h = 0.14 + ((k * 5) % 3) * 0.08;
        const col = tones[k % tones.length];
        g.add(box(w, h, 0.24, colorMat(col, { gloss: 0.5 }), x + w / 2, y, -0.08));
        // fita do laço
        g.add(box(w + 0.005, 0.03, 0.245, colorMat(tones[(k + 2) % tones.length], { gloss: 0.6 }), x + w / 2, y + h * 0.5, -0.08));
        g.add(ball(0.035, 0.025, 0.02, colorMat(tones[(k + 2) % tones.length], { gloss: 0.6 }), x + w / 2, y + h + 0.02, -0.08, 6));
        x += w + 0.06;
        k++;
      }
    }
    // ursinho sentado em cima da estante
    const bear = colorMat(0xa8743e);
    g.add(ball(0.11, 0.12, 0.1, bear, 0.55, 1.83, -0.12, 10), ball(0.08, 0.08, 0.08, bear, 0.55, 2.0, -0.1, 10));
    for (const sx of [-1, 1]) g.add(ball(0.03, 0.03, 0.02, bear, 0.55 + sx * 0.06, 2.07, -0.1, 6));
    return { group: g };
  },
};

/** Balcão de encomendas: tampo com catálogo aberto, campainha, um globo e um aquário de amostra. */
const bazaar: FurnitureSpec = {
  build() {
    const wood = walnut();
    const g = group(
      rbox(1.86, 0.9, 0.6, 0.03, wood, 0, 0, -0.1),
      box(1.92, 0.04, 0.66, colorMat(0x5d3a24, { gloss: 0.5 }), 0, 0.9, -0.1),
      box(1.7, 0.5, 0.02, colorMat(0x8a5a36), 0, 0.2, 0.21),
    );
    // catálogo aberto e campainha de balcão
    g.add(box(0.36, 0.02, 0.26, colorMat(0xf4efdf), -0.15, 0.94, 0.02), box(0.005, 0.025, 0.26, colorMat(0x8a2a22), -0.15, 0.94, 0.02));
    g.add(lathe([[0.06, 0], [0.06, 0.01], [0.045, 0.04], [0.01, 0.06]], 12, colorMat(PAL.brass, { gloss: 0.95 }), 0.25, 0.94, 0.08));
    // globo de amostra
    g.add(cyl(0.06, 0.08, 0.03, 10, wood, 0.6, 0.94, -0.18), rod([0.6, 0.97, -0.18], [0.6, 1.08, -0.18], 0.01, colorMat(PAL.brass)));
    g.add(ball(0.13, 0.13, 0.13, colorMat(0x3f7fb4, { gloss: 0.6 }), 0.6, 1.21, -0.18, 14), ball(0.07, 0.06, 0.05, colorMat(0x6b9a4a), 0.65, 1.25, -0.08, 8));
    // aquário de amostra
    g.add(ball(0.17, 0.15, 0.17, colorMat(0xbfe4ee, { gloss: 1, opacity: 0.45 }), -0.6, 1.08, -0.18, 14), ball(0.04, 0.025, 0.015, colorMat(0xf08a2a), -0.58, 1.06, -0.16, 6));
    return { group: g };
  },
};

/** Chafariz do largo: tanque redondo de pedra, coluna com bacia no alto e água azul que cintila. */
const fountain: FurnitureSpec = {
  build() {
    const rock = stone();
    const water = colorMat(0x4f9ec4, { gloss: 1, opacity: 0.8, emissive: 0x2a6a8a, emissiveIntensity: 0.15, unique: true });
    const spray = colorMat(0xd6f0fa, { gloss: 1, opacity: 0.55, unique: true });
    const g = group(
      lathe(
        [
          [0.9, 0],
          [0.95, 0.05],
          [0.95, 0.4],
          [0.86, 0.45],
          [0.8, 0.42],
          [0.8, 0.1],
        ],
        24,
        rock,
      ),
      cyl(0.81, 0.81, 0.02, 24, water, 0, 0.34, 0),
      cyl(0.12, 0.18, 0.9, 12, rock, 0, 0.3, 0),
      lathe(
        [
          [0.06, 0],
          [0.4, 0.1],
          [0.44, 0.16],
          [0.36, 0.16],
        ],
        18,
        rock,
        0,
        1.18,
        0,
      ),
      cyl(0.37, 0.37, 0.01, 18, water, 0, 1.31, 0),
      cyl(0.05, 0.06, 0.25, 10, rock, 0, 1.3, 0),
      ball(0.08, 0.08, 0.08, rock, 0, 1.6, 0, 10),
    );
    const jets: THREE.Mesh[] = [];
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      const m = rod([Math.cos(a) * 0.1, 1.62, Math.sin(a) * 0.1], [Math.cos(a) * 0.38, 1.33, Math.sin(a) * 0.38], 0.018, spray, 5);
      jets.push(m);
      g.add(m);
    }
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 + 0.2;
      g.add(rod([Math.cos(a) * 0.42, 1.3, Math.sin(a) * 0.42], [Math.cos(a) * 0.62, 0.36, Math.sin(a) * 0.62], 0.012, spray, 4));
    }
    // moedinhas no fundo
    for (let i = 0; i < 7; i++) g.add(cyl(0.025, 0.025, 0.005, 8, colorMat(PAL.brass, { gloss: 0.9 }), Math.cos(i * 2.3) * (0.3 + (i % 3) * 0.12), 0.33, Math.sin(i * 2.3) * (0.3 + (i % 3) * 0.12)));
    return {
      group: g,
      tick({ time }) {
        water.emissiveIntensity = 0.12 + 0.06 * Math.sin(time * 2.1);
        spray.opacity = 0.45 + 0.15 * Math.sin(time * 5.3);
        jets.forEach((j, i) => (j.scale.y = 0.94 + 0.06 * Math.sin(time * 6 + i)));
      },
    };
  },
};

/** Banco de praça: ripas de madeira em pés de ferro fundido com braços curvos. */
const parkbench: FurnitureSpec = {
  sit: [
    { x: -0.42, y: 0.44, z: 0.04, heading: 0 },
    { x: 0.42, y: 0.44, z: 0.04, heading: 0 },
  ],
  build() {
    const slat = texMat('pine', { gloss: 0.3, color: 0x9a6a3e });
    const metal = iron();
    const g = group();
    for (let i = 0; i < 4; i++) g.add(rbox(1.8, 0.04, 0.1, 0.015, slat, 0, 0.4, 0.2 - i * 0.12));
    for (let i = 0; i < 3; i++) {
      const back = rbox(1.8, 0.1, 0.035, 0.015, slat, 0, 0.58 + i * 0.13, -0.24);
      back.rotation.x = -0.12;
      g.add(back);
    }
    for (const sx of [-0.82, 0.82]) {
      g.add(
        rod([sx, 0, 0.24], [sx, 0.4, 0.2], 0.03, metal, 6),
        rod([sx, 0, -0.22], [sx, 0.95, -0.28], 0.03, metal, 6),
        rod([sx, 0.62, 0.22], [sx, 0.62, -0.25], 0.025, metal, 6),
        rod([sx, 0.62, 0.22], [sx, 0.4, 0.2], 0.025, metal, 6),
        ball(0.04, 0.04, 0.04, metal, sx, 0.62, 0.23, 6),
      );
    }
    return { group: g };
  },
};

/** Lampião de ferro com lanterna de vidro de quatro faces; acende ao anoitecer. */
const lamppost: FurnitureSpec = {
  build() {
    const metal = iron();
    const glass = colorMat(0xf6e7c1, { emissive: 0xffd080, emissiveIntensity: 0.05, gloss: 0.8, opacity: 0.85, unique: true });
    const light = new THREE.PointLight(0xffd8a0, 0, 10, 1.4);
    light.position.y = 2.6;
    const g = group(
      cyl(0.16, 0.2, 0.14, 10, metal, 0, 0, 0),
      lathe(
        [
          [0.08, 0],
          [0.05, 0.3],
          [0.04, 2.3],
          [0.07, 2.36],
        ],
        8,
        metal,
        0,
        0.14,
        0,
      ),
      box(0.24, 0.32, 0.24, glass, 0, 2.5, 0),
      lathe(
        [
          [0.2, 0],
          [0.16, 0.06],
          [0.04, 0.16],
          [0.01, 0.24],
        ],
        4,
        metal,
        0,
        2.82,
        0,
      ),
      box(0.26, 0.03, 0.26, metal, 0, 2.48, 0),
      light,
    );
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) g.add(rod([sx * 0.12, 2.5, sz * 0.12], [sx * 0.12, 2.82, sz * 0.12], 0.01, metal, 4));
    return {
      group: g,
      tick({ night, lit }) {
        glass.emissiveIntensity = lit ? 0.6 + night * 0.4 : 0.05;
        light.intensity = lit ? 2 + night * 4 : 0;
      },
    };
  },
};

/** Aquário redondo de vidro num pedestal de madeira, com cascalho, planta e peixinhos que nadam. */
const aquarium: FurnitureSpec = {
  build() {
    const wood = walnut();
    const g = group(
      rbox(0.56, 0.7, 0.5, 0.03, wood, 0, 0, -0.05),
      ball(0.3, 0.26, 0.3, colorMat(0xbfe4ee, { gloss: 1, opacity: 0.4 }), 0, 0.98, -0.05, 16),
      cyl(0.22, 0.24, 0.05, 14, colorMat(0xd8c08a), 0, 0.75, -0.05),
      rod([0.08, 0.78, -0.1], [0.12, 1.06, -0.12], 0.02, colorMat(0x3f8a3e), 5),
      rod([0.05, 0.78, -0.05], [0.0, 1.0, -0.1], 0.015, colorMat(0x4f9a4e), 5),
    );
    const fish: THREE.Mesh[] = [];
    for (const [col, r] of [
      [0xf08a2a, 0.15],
      [0xe8c040, 0.1],
    ] as [number, number][]) {
      const f = ball(0.05, 0.03, 0.018, colorMat(col, { gloss: 0.7 }), 0, 0, 0, 8);
      f.userData.r = r;
      fish.push(f);
      g.add(f);
    }
    return {
      group: g,
      tick({ time }) {
        fish.forEach((f, i) => {
          const a = time * (0.7 + i * 0.35) + i * 2;
          const r = f.userData.r as number;
          f.position.set(Math.cos(a) * r, 0.95 + i * 0.08 + Math.sin(time * 1.3 + i) * 0.02, -0.05 + Math.sin(a) * r);
          f.rotation.y = -a;
        });
      },
    };
  },
};

/** Globo terrestre num pé de latão, inclinado no eixo. */
const globe: FurnitureSpec = {
  build() {
    const brass = colorMat(PAL.brass, { gloss: 0.9 });
    const wood = walnut();
    const sea = colorMat(0x3f7fb4, { gloss: 0.6 });
    const land = colorMat(0x7a9a4a, { gloss: 0.4 });
    const g = group(
      cyl(0.2, 0.24, 0.06, 14, wood, 0, 0, 0),
      lathe(
        [
          [0.05, 0],
          [0.03, 0.2],
          [0.03, 0.5],
          [0.05, 0.56],
        ],
        10,
        wood,
        0,
        0.06,
        0,
      ),
    );
    const head = new THREE.Group();
    head.position.y = 0.92;
    head.rotation.z = 0.4;
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.31, 0.012, 6, 24, Math.PI * 1.4), brass);
    ring.rotation.y = Math.PI / 2;
    head.add(ring);
    const spin = new THREE.Group();
    spin.add(ball(0.28, 0.28, 0.28, sea, 0, 0, 0, 16));
    for (const [x, y, z, s] of [
      [0.18, 0.1, 0.17, 0.12],
      [-0.2, -0.05, 0.15, 0.1],
      [0.05, -0.15, -0.23, 0.11],
      [-0.1, 0.18, -0.18, 0.08],
    ]) {
      spin.add(ball(s, s * 0.8, s * 0.5, land, x, y, z, 8));
    }
    head.add(spin);
    g.add(head);
    return {
      group: g,
      tick({ time, using }) {
        spin.rotation.y += using ? 0.08 : 0.002;
        void time;
      },
    };
  },
};

export const DOWNTOWN_ART: Record<string, FurnitureSpec> = {
  bistro,
  espresso,
  clothesrack,
  giftshelf,
  bazaar,
  fountain,
  parkbench,
  lamppost,
  aquarium,
  globe,
};
