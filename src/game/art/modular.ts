import * as THREE from 'three';
import { ball, box, colorMat, cyl, lathe, rbox, rod, texMat } from './build';
import { PAL } from './palette';
import type { FurnitureSpec } from './furniture';

// Plano 2, bloco 8: enfeites de pôr em cima do tampo e as máquinas que
// faltavam (banheira, lava-louças, máquina de lavar). Os enfeites nascem com
// a base em y = 0: quem os põe na altura do tampo é o GameView.

function grp(...parts: THREE.Object3D[]): THREE.Group {
  const g = new THREE.Group();
  if (parts.length) g.add(...parts);
  return g;
}

const porcelain = () => colorMat(PAL.porcelain, { gloss: 0.8 });
const chrome = () => texMat('chrome', { gloss: 1 });

const tablelamp: FurnitureSpec = {
  build() {
    const brass = colorMat(PAL.brass, { gloss: 0.9 });
    const shadeMat = texMat('lampShade', { doubleSide: true, emissive: 0xffd98a, emissiveIntensity: 0.1, unique: true });
    const light = new THREE.PointLight(0xffd9a0, 0, 4.5, 1.6);
    light.position.y = 0.42;
    const g = grp(
      lathe(
        [
          [0.08, 0],
          [0.08, 0.015],
          [0.03, 0.03],
          [0.07, 0.12],
          [0.08, 0.2],
          [0.02, 0.26],
          [0.012, 0.3],
        ],
        14,
        colorMat(0x2f6f73, { gloss: 0.8 }),
      ),
      rod([0, 0.28, 0], [0, 0.42, 0], 0.008, brass),
      cyl(0.08, 0.14, 0.17, 14, shadeMat, 0, 0.33, 0, true),
      light,
    );
    return {
      group: g,
      tick({ night, lit }) {
        shadeMat.emissiveIntensity = lit ? 0.45 + night * 0.55 : 0.06;
        light.intensity = lit ? 0.8 + night * 2.2 : 0;
      },
    };
  },
};

const vase: FurnitureSpec = {
  build(seed) {
    const glaze = colorMat([0x2c55a6, 0xb8352b, 0x2f8a86, 0xe9e1cc][seed % 4], { gloss: 0.85 });
    const g = grp(
      lathe(
        [
          [0.05, 0],
          [0.07, 0.05],
          [0.06, 0.14],
          [0.03, 0.2],
          [0.04, 0.23],
        ],
        14,
        glaze,
      ),
    );
    const blooms = [0xf2c744, 0xd9483f, 0xf3efe2, 0xd88a96];
    for (let i = 0; i < 4; i++) {
      const a = i * 1.7 + seed;
      const tip: [number, number, number] = [Math.cos(a) * 0.07, 0.36 + (i % 2) * 0.05, Math.sin(a) * 0.07];
      g.add(rod([0, 0.2, 0], tip, 0.005, colorMat(0x3f7a2e)), ball(0.03, 0.025, 0.03, colorMat(blooms[i]), ...tip, 8));
    }
    return { group: g };
  },
};

const bookstack: FurnitureSpec = {
  build(seed) {
    const cols = [0xb8352b, 0x2c55a6, 0x3f7a4a, 0xd9a22e, 0x6b3a6e];
    const g = grp();
    let y = 0;
    for (let i = 0; i < 4; i++) {
      const h = 0.03 + ((seed + i) % 3) * 0.008;
      const b = box(0.2 - i * 0.012, h, 0.15 - (i % 2) * 0.01, [colorMat(0xf1ecdc), colorMat(0xf1ecdc), colorMat(cols[(seed + i) % 5]), colorMat(cols[(seed + i) % 5]), colorMat(cols[(seed + i) % 5]), colorMat(0xf1ecdc)], 0, y, 0);
      b.rotation.y = ((i * 37) % 9) * 0.04 - 0.16;
      g.add(b);
      y += h;
    }
    return { group: g };
  },
};

const fruitbowl: FurnitureSpec = {
  build() {
    const g = grp(
      lathe(
        [
          [0.05, 0],
          [0.06, 0.01],
          [0.13, 0.06],
          [0.14, 0.07],
        ],
        16,
        colorMat(0xd9cdb0, { gloss: 0.6, doubleSide: true }),
      ),
    );
    const fruit = [0xd9483f, 0xf2c744, 0x7cae3e, 0xe8892e, 0xd9483f];
    fruit.forEach((c, i) => {
      const a = i * 1.26;
      g.add(ball(0.04, 0.038, 0.04, colorMat(c, { gloss: 0.5 }), Math.cos(a) * 0.06, 0.07 + (i === 4 ? 0.04 : 0), Math.sin(a) * 0.06, 8));
    });
    return { group: g };
  },
};

const photoframe: FurnitureSpec = {
  build(seed) {
    const frame = colorMat([0xc29a3e, 0x2e221c, 0xeee9da][seed % 3], { gloss: 0.6 });
    const pic = rbox(0.14, 0.18, 0.015, 0.004, frame, 0, 0.0, 0);
    pic.rotation.x = -0.18;
    const photo = box(0.11, 0.14, 0.004, colorMat([0x86b8dc, 0xd88a96, 0x6d7040][seed % 3]), 0, 0.02, 0.008);
    photo.rotation.x = -0.18;
    const sky = box(0.11, 0.05, 0.005, colorMat(0xeadfc2), 0, 0.11, 0.004);
    sky.rotation.x = -0.18;
    return { group: grp(pic, photo, sky, rod([0, 0.08, -0.02], [0, 0, -0.08], 0.005, frame)) };
  },
};

const candles: FurnitureSpec = {
  build() {
    const brass = colorMat(PAL.brass, { gloss: 0.9 });
    const wax = colorMat(0xf4efe0);
    const flame = colorMat(0xffd27a, { emissive: 0xffb84a, emissiveIntensity: 0.9 });
    const g = grp(cyl(0.12, 0.13, 0.015, 16, brass));
    [
      [-0.06, 0.16],
      [0.05, 0.22],
      [0.0, 0.12],
    ].forEach(([x, h], i) => {
      const z = i === 2 ? 0.06 : -0.02;
      g.add(cyl(0.022, 0.022, h, 10, wax, x, 0.015, z), ball(0.008, 0.02, 0.008, flame, x, h + 0.035, z, 6));
    });
    return { group: g };
  },
};

const figurine: FurnitureSpec = {
  build() {
    const bronze = colorMat(0x8a5a2b, { gloss: 0.85 });
    const stone = colorMat(0x2e221c, { gloss: 0.4 });
    return {
      group: grp(
        box(0.12, 0.05, 0.12, stone),
        lathe(
          [
            [0.035, 0.05],
            [0.05, 0.12],
            [0.03, 0.2],
            [0.045, 0.26],
            [0.001, 0.3],
          ],
          12,
          bronze,
        ),
        ball(0.035, 0.035, 0.035, bronze, 0, 0.32, 0, 10),
      ),
    };
  },
};

// ---------- banheira ----------

const bathtub: FurnitureSpec = {
  lie: { x: 0, y: 0.46, z: -0.9, heading: Math.PI },
  build() {
    const enamel = porcelain();
    const water = colorMat(0x8fcfe6, { opacity: 0.55, gloss: 0.9, unique: true });
    const foam = colorMat(0xffffff, { gloss: 0.3, unique: true });
    // casca aberta: fundo, quatro paredes com borda arredondada, pés de garra e torneira
    const g = grp(
      rbox(0.84, 0.08, 1.82, 0.04, enamel, 0, 0.1, 0),
      rbox(0.09, 0.5, 1.84, 0.04, enamel, -0.385, 0.1, 0),
      rbox(0.09, 0.5, 1.84, 0.04, enamel, 0.385, 0.1, 0),
      rbox(0.86, 0.5, 0.09, 0.04, enamel, 0, 0.1, -0.875),
      rbox(0.86, 0.5, 0.09, 0.04, enamel, 0, 0.1, 0.875),
      box(0.68, 0.01, 1.64, colorMat(0xdcd8cc, { gloss: 0.7 }), 0, 0.18, 0),
      ...[
        [-0.34, -0.78],
        [0.34, -0.78],
        [-0.34, 0.78],
        [0.34, 0.78],
      ].map(([x, z]) => ball(0.05, 0.06, 0.05, colorMat(PAL.brass, { gloss: 0.9 }), x, 0.06, z, 8)),
      rod([0, 0.6, -0.86], [0, 0.78, -0.86], 0.02, chrome()),
      rod([0, 0.78, -0.86], [0, 0.74, -0.74], 0.016, chrome()),
      ball(0.03, 0.02, 0.03, chrome(), -0.1, 0.64, -0.86, 8),
      ball(0.03, 0.02, 0.03, chrome(), 0.1, 0.64, -0.86, 8),
    );
    const surface = box(0.68, 0.02, 1.64, water, 0, 0.44, 0);
    const bubbles = grp();
    for (let i = 0; i < 14; i++) bubbles.add(ball(0.07 + (i % 3) * 0.02, 0.04, 0.07, foam, (((i * 53) % 9) / 9) * 0.5 - 0.25, 0.47, (((i * 37) % 13) / 13) * 1.4 - 0.7, 8));
    surface.visible = false;
    bubbles.visible = false;
    g.add(surface, bubbles);
    return {
      group: g,
      tick({ using, time }) {
        surface.visible = !!using;
        bubbles.visible = using === 'bubbleBath';
        if (bubbles.visible) bubbles.children.forEach((b, i) => (b.position.y = 0.47 + Math.sin(time * 1.5 + i) * 0.01));
      },
    };
  },
};

// ---------- lava-louças e máquina de lavar ----------

function machine(front: 'dishes' | 'laundry'): FurnitureSpec {
  return {
    build() {
      const body = colorMat(PAL.enamel, { gloss: 0.6 });
      const panel = colorMat(0x3a3d42, { gloss: 0.7 });
      const led = colorMat(0x2a3a2a, { emissive: 0x6fd06a, emissiveIntensity: 0, unique: true });
      const g = grp(rbox(0.82, 0.86, 0.6, 0.03, body, 0, 0.02, 0), box(0.82, 0.02, 0.6, colorMat(0x26262b), 0, 0, 0));
      const root = grp(g);
      g.add(box(0.8, 0.1, 0.02, panel, 0, 0.76, 0.3), box(0.04, 0.02, 0.01, led, 0.3, 0.8, 0.312));
      for (let i = 0; i < 3; i++) g.add(cyl(0.018, 0.018, 0.012, 10, chrome(), -0.25 + i * 0.08, 0.8, 0.31).rotateX(Math.PI / 2));
      let drum: THREE.Object3D | null = null;
      let basket: THREE.Object3D | null = null;
      let pile: THREE.Object3D | null = null;
      if (front === 'laundry') {
        // escotilha redonda com a roupa girando lá dentro
        const ring = new THREE.Mesh(new THREE.TorusGeometry(0.21, 0.03, 8, 20), chrome());
        ring.position.set(0, 0.38, 0.31);
        const glass = new THREE.Mesh(new THREE.CircleGeometry(0.2, 20), colorMat(0x8fb3c4, { opacity: 0.6, gloss: 0.9 }));
        glass.position.set(0, 0.38, 0.315);
        drum = grp(box(0.12, 0.08, 0.02, colorMat(0x2c55a6), 0.06, 0.02, 0), box(0.1, 0.07, 0.02, colorMat(0xb8352b), -0.06, -0.04, 0), box(0.08, 0.06, 0.02, colorMat(0xeadfc2), 0, -0.08, 0));
        drum.position.set(0, 0.38, 0.29);
        g.add(ring, glass, drum);
        // cesto de roupa em cima: enche a cada banho
        basket = grp(cyl(0.2, 0.17, 0.2, 12, colorMat(0xc9a66c), 0, 0, 0, true), cyl(0.17, 0.17, 0.01, 12, colorMat(0xa9834f), 0, 0.005, 0));
        pile = grp(
          ball(0.14, 0.06, 0.12, colorMat(0x2c55a6), -0.03, 0.0, 0, 8),
          ball(0.12, 0.05, 0.12, colorMat(0xeadfc2), 0.04, 0.03, 0.02, 8),
          ball(0.1, 0.05, 0.1, colorMat(0xb8352b), 0.0, 0.06, -0.03, 8),
        );
        basket.add(pile);
        basket.position.set(-0.18, 0.88, -0.05);
        g.add(basket);
      } else {
        g.add(box(0.76, 0.6, 0.015, colorMat(0xdcd8cc, { gloss: 0.7 }), 0, 0.08, 0.305), rod([-0.3, 0.66, 0.33], [0.3, 0.66, 0.33], 0.012, chrome()));
      }
      return {
        group: root,
        tick({ time, using, running, load }) {
          const on = !!running;
          if (pile) {
            pile.visible = (load ?? 0) > 0;
            pile.position.y = 0.02 + Math.min(1, (load ?? 0) / 8) * 0.16;
          }
          void basket;
          led.emissiveIntensity = on ? 0.9 : using ? 0.4 : 0;
          if (drum && on) drum.rotation.z = time * 6;
          g.position.x = on && front === 'laundry' ? Math.sin(time * 40) * 0.004 : 0;
        },
      };
    },
  };
}

export const MODULAR_ART: Record<string, FurnitureSpec> = {
  tablelamp,
  vase,
  bookstack,
  fruitbowl,
  photoframe,
  candles,
  figurine,
  bathtub,
  dishwasher: machine('dishes'),
  washer: machine('laundry'),
};
