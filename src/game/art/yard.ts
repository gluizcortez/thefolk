import * as THREE from 'three';
import type { PlantState } from '../../sim';
import { ball, box, colorMat, cyl, lathe, rbox, rod, texMat, tileUV } from './build';
import type { FurnitureModel, FurnitureSpec, TickInfo } from './furniture';
import { PAL, seeded } from './palette';

// Bloco 13: modelos do quintal. As plantas mudam com o estado (muda, adulta,
// florida, murcha, seca; frutos maduros aparecendo) pelo `tick`, que recebe o
// estado da planta. Folhagem em cartões cruzados e bolas facetadas, como as
// árvores do cenário, sem nada de geometria moderna.

const chrome = () => texMat('chrome', { gloss: 1 });

function group(...parts: THREE.Object3D[]): THREE.Group {
  const g = new THREE.Group();
  if (parts.length) g.add(...parts);
  return g;
}

// ---------- plantas ----------

/** Cor da folhagem conforme a saúde: verde viçoso → amarelado → palha seca. */
function foliageTint(p: PlantState | undefined): number {
  if (!p) return 0xffffff;
  if (p.health <= 0) return 0x9a7a4a;
  const dry = p.water <= 0 || p.health < 40 ? 1 : p.water < 25 ? 0.45 : 0;
  return new THREE.Color(0xffffff).lerp(new THREE.Color(0xc9b25a), dry).getHex();
}

/**
 * Monta um modelo de planta que reage ao estado: `crown` cresce com a planta,
 * murcha (tomba) com sede, e as flores e frutos só aparecem quando estão bem.
 */
function livingPlant(
  build: (g: THREE.Group, crown: THREE.Group, blooms: THREE.Group, fruits: THREE.Object3D[], tinted: THREE.MeshPhongMaterial[]) => void,
  minScale = 0.35,
): FurnitureModel {
  const g = new THREE.Group();
  const crown = new THREE.Group();
  const blooms = new THREE.Group();
  const fruits: THREE.Object3D[] = [];
  const tinted: THREE.MeshPhongMaterial[] = [];
  g.add(crown);
  crown.add(blooms);
  build(g, crown, blooms, fruits, tinted);
  let key = '';
  return {
    group: g,
    tick(info: TickInfo) {
      const p = info.plant;
      const growth = p ? p.growth / 100 : 1;
      const k = `${Math.round(growth * 20)}|${p ? Math.round(p.health / 10) : 10}|${p ? Math.round(p.water / 12) : 9}|${p?.fruit ?? 0}`;
      // balança de leve com o vento
      crown.rotation.z = Math.sin(info.time * 0.9 + g.id) * 0.02;
      if (k === key) return;
      key = k;
      const s = minScale + (1 - minScale) * growth;
      crown.scale.setScalar(s);
      const tint = foliageTint(p);
      for (const m of tinted) m.color.setHex(tint);
      const wilted = !!p && (p.health < 40 || p.water <= 0 || p.health <= 0);
      crown.rotation.x = wilted ? 0.22 : 0;
      crown.position.y = wilted ? -0.04 : 0;
      blooms.visible = !p || (growth >= 1 && p.health >= 70 && p.water >= 25);
      const ripe = p?.fruit ?? 0;
      fruits.forEach((f, i) => (f.visible = growth >= 1 && i < ripe * 2 && (p?.health ?? 0) > 0));
    },
  };
}

/** Terra do canteiro com borda de tijolinho. */
function bedBox(w: number, d: number): THREE.Object3D[] {
  const brick = colorMat(PAL.brick);
  return [
    box(w, 0.08, d, colorMat(PAL.soil), 0, 0, 0),
    box(w, 0.14, 0.06, brick, 0, 0, d / 2 - 0.03),
    box(w, 0.14, 0.06, brick, 0, 0, -d / 2 + 0.03),
    box(0.06, 0.14, d, brick, w / 2 - 0.03, 0, 0),
    box(0.06, 0.14, d, brick, -w / 2 + 0.03, 0, 0),
  ];
}

/** Moita de folhas em cartões cruzados (como os vasos). */
function cards(tex: string, size: number, y: number, n: number, tinted: THREE.MeshPhongMaterial[], seed: number): THREE.Group {
  const mat = texMat(tex, { alphaTest: 0.5, doubleSide: true, unique: true });
  tinted.push(mat);
  const g = new THREE.Group();
  for (let i = 0; i < n; i++) {
    const card = new THREE.Mesh(new THREE.PlaneGeometry(size, size), mat);
    card.position.y = y;
    card.rotation.y = (i * Math.PI) / n + seed * 0.7;
    g.add(card);
  }
  return g;
}

/** Bola de folhagem facetada (copa, arbusto). */
function clump(r: number, x: number, y: number, z: number, mat: THREE.Material, rnd: () => number): THREE.Mesh {
  const m = new THREE.Mesh(new THREE.IcosahedronGeometry(r, 1), mat);
  m.position.set(x, y, z);
  m.rotation.set(rnd() * 6, rnd() * 6, 0);
  m.scale.y = 0.85;
  tileUV(m, 2, 2);
  return m;
}

const flowerbed: FurnitureSpec = {
  build(seed) {
    return livingPlant((g, crown, blooms, _f, tinted) => {
      g.add(...bedBox(0.9, 0.9));
      crown.add(cards('leaves', 0.7, 0.42, 3, tinted, seed));
      const daisies = cards('blossoms:daisy', 0.78, 0.46, 3, [], seed + 1);
      blooms.add(daisies);
    });
  },
};

const rosebush: FurnitureSpec = {
  build(seed) {
    return livingPlant((g, crown, blooms, _f, tinted) => {
      g.add(cyl(0.3, 0.33, 0.06, 12, colorMat(PAL.soil)));
      crown.add(cards('leaves', 1.05, 0.58, 4, tinted, seed));
      blooms.add(cards('blossoms:rose', 1.0, 0.62, 3, [], seed + 2));
      // botões grandes por cima
      const rnd = seeded(seed + 9);
      for (let i = 0; i < 7; i++) {
        const a = rnd() * Math.PI * 2;
        const r = 0.12 + rnd() * 0.22;
        blooms.add(ball(0.06, 0.05, 0.06, colorMat(0xc8303f, { gloss: 0.3 }), Math.cos(a) * r, 0.75 + rnd() * 0.35, Math.sin(a) * r, 8));
      }
    });
  },
};

const hedge: FurnitureSpec = {
  build(seed) {
    return livingPlant((g, crown, blooms, _f, tinted) => {
      const rnd = seeded(seed + 4);
      const mat = texMat('treeLeaves', { color: 0xd8f0c0, unique: true });
      tinted.push(mat);
      g.add(cyl(0.3, 0.32, 0.05, 10, colorMat(PAL.soil)));
      // arbusto podado: um bloco arredondado de folhas
      const body = rbox(0.86, 0.78, 0.86, 0.22, mat, 0, 0.04, 0);
      tileUV(body, 2, 2);
      crown.add(body);
      for (let i = 0; i < 5; i++) crown.add(clump(0.16, (rnd() - 0.5) * 0.6, 0.78 + rnd() * 0.06, (rnd() - 0.5) * 0.6, mat, rnd));
      blooms.add(ball(0.04, 0.04, 0.04, colorMat(0xf3efe2), 0.2, 0.84, 0.3, 6), ball(0.04, 0.04, 0.04, colorMat(0xf3efe2), -0.25, 0.8, -0.1, 6));
    }, 0.3);
  },
};

const veggiebed: FurnitureSpec = {
  build(seed) {
    return livingPlant((g, crown, blooms, fruits, tinted) => {
      g.add(...bedBox(1.9, 0.9));
      const rnd = seeded(seed + 5);
      const stake = texMat('pine');
      const leafMat = texMat('treeLeaves', { color: 0xc8f0a8, unique: true });
      tinted.push(leafMat);
      // fileira de tomate (com estacas) e fileira de couve
      for (let i = 0; i < 4; i++) {
        const x = -0.72 + i * 0.48;
        crown.add(box(0.03, 0.75, 0.03, stake, x, 0.08, -0.2));
        crown.add(clump(0.17, x, 0.5, -0.2, leafMat, rnd), clump(0.13, x + 0.05, 0.28, -0.18, leafMat, rnd));
        for (let k = 0; k < 2; k++) {
          const tomato = ball(0.05, 0.05, 0.05, colorMat(0xd0322a, { gloss: 0.6 }), x + (k ? 0.1 : -0.08), 0.35 + k * 0.18, -0.08, 8);
          fruits.push(tomato);
          crown.add(tomato);
        }
        const kale = clump(0.15, x + 0.12, 0.2, 0.22, leafMat, rnd);
        kale.scale.y = 0.6;
        crown.add(kale);
      }
      blooms.add(ball(0.03, 0.03, 0.03, colorMat(0xf2d24a), -0.6, 0.62, -0.12, 6));
    }, 0.25);
  },
};

function treeModel(seed: number, crownTex: string, fruitColor: number | null, flowersColor: number | null): FurnitureModel {
  return livingPlant((g, crown, blooms, fruits, tinted) => {
    const rnd = seeded(seed + 11);
    g.add(cyl(0.34, 0.36, 0.04, 12, colorMat(PAL.soil)));
    crown.add(cyl(0.07, 0.12, 1.5, 8, texMat('bark')));
    const mat = texMat(crownTex, { color: 0xf0f8e8, unique: true });
    tinted.push(mat);
    const parts: [number, number, number, number][] = [
      [0, 1.95, 0, 0.62],
      [0.34, 1.62, 0.18, 0.46],
      [-0.32, 1.66, -0.2, 0.48],
      [0.06, 2.35, -0.06, 0.42],
      [-0.12, 1.55, 0.32, 0.38],
    ];
    for (const [x, y, z, r] of parts) crown.add(clump(r, x, y, z, mat, rnd));
    if (fruitColor !== null) {
      for (let i = 0; i < 8; i++) {
        const a = rnd() * Math.PI * 2;
        const r = 0.35 + rnd() * 0.25;
        const f = ball(0.07, 0.07, 0.07, colorMat(fruitColor, { gloss: 0.5 }), Math.cos(a) * r, 1.5 + rnd() * 0.7, Math.sin(a) * r, 8);
        fruits.push(f);
        crown.add(f);
      }
    }
    if (flowersColor !== null) {
      for (let i = 0; i < 10; i++) {
        const a = rnd() * Math.PI * 2;
        const r = 0.3 + rnd() * 0.35;
        blooms.add(ball(0.06, 0.04, 0.06, colorMat(flowersColor), Math.cos(a) * r, 1.6 + rnd() * 0.8, Math.sin(a) * r, 6));
      }
    }
  }, 0.3);
}

const orangetree: FurnitureSpec = {
  build(seed) {
    return treeModel(seed, 'treeLeaves', 0xf08a1c, 0xf6f3e6);
  },
};

const ipe: FurnitureSpec = {
  build(seed) {
    // o ipê florido é amarelo; sem flor (sede, muda) volta a ser verde
    const model = treeModel(seed, 'treeLeaves', null, null);
    const bloom = texMat('ipeCrown', { unique: true });
    const rnd = seeded(seed + 21);
    const crown = model.group.children[0] as THREE.Group;
    const blooms = crown.children[0] as THREE.Group;
    for (const [x, y, z, r] of [
      [0, 2.0, 0, 0.66],
      [0.36, 1.66, 0.2, 0.48],
      [-0.34, 1.7, -0.22, 0.5],
      [0.04, 2.4, -0.06, 0.44],
    ] as [number, number, number, number][]) {
      blooms.add(clump(r, x, y, z, bloom, rnd));
    }
    return model;
  },
};

// ---------- piscina ----------

/** Escadinha de inox: os corrimãos curvam por cima da borda e os degraus descem na água. */
const poolladder: FurnitureSpec = {
  build() {
    const steel = chrome();
    const g = group();
    for (const sx of [-0.22, 0.22]) {
      // corrimão: sobe da água, faz a curva e desce na borda (frente = +z, onde fica o chão)
      g.add(rod([sx, -1.0, 0.18], [sx, 0.62, 0.18], 0.025, steel));
      g.add(rod([sx, 0.62, 0.18], [sx, 0.78, 0.36], 0.025, steel));
      g.add(rod([sx, 0.78, 0.36], [sx, 0.66, 0.58], 0.025, steel));
      g.add(rod([sx, 0.66, 0.58], [sx, 0.06, 0.6], 0.025, steel));
      g.add(cyl(0.045, 0.045, 0.03, 10, colorMat(0xe3dccb), sx, 0.03, 0.6));
    }
    for (let i = 0; i < 3; i++) g.add(box(0.44, 0.03, 0.12, colorMat(0xd8dde0, { gloss: 0.8 }), 0, -0.2 - i * 0.28, 0.2));
    return { group: g };
  },
};

/** Trampolim: base de concreto na beira e a prancha azul avançando sobre a água (para o norte). */
const diveboard: FurnitureSpec = {
  stand: { x: 0, y: 0.42, z: -0.35, heading: Math.PI },
  build() {
    const g = group(
      rbox(0.5, 0.32, 0.5, 0.04, colorMat(0xd8d2c2), 0, 0, 0.2),
      box(0.12, 0.06, 0.4, chrome(), -0.18, 0.32, 0.18),
      box(0.12, 0.06, 0.4, chrome(), 0.18, 0.32, 0.18),
    );
    const board = rbox(0.46, 0.06, 1.7, 0.025, colorMat(0x2f6fb0, { gloss: 0.7 }), 0, 0, 0);
    board.position.set(0, 0.36, -0.45);
    board.rotation.x = -0.035;
    g.add(board);
    // faixa antiderrapante clara na ponta
    g.add(box(0.44, 0.005, 0.9, colorMat(0xd8e6f0), 0, 0.42, -0.75));
    return {
      group: g,
      tick(info) {
        // a prancha balança quando alguém pula
        board.rotation.x = info.using ? -0.035 + Math.sin(info.time * 9) * 0.06 : -0.035;
      },
    };
  },
};

// ---------- churrasqueira, mesa de jardim e rede ----------

const grill: FurnitureSpec = {
  build() {
    const brick = texMat('wallExterior', { color: 0xf0d8c8 });
    const g = group(
      box(0.9, 0.82, 0.62, brick, 0, 0, -0.1),
      box(0.96, 0.06, 0.68, colorMat(0xd3c3a0), 0, 0.82, -0.1),
      // fornalha e grelha
      box(0.62, 0.22, 0.4, colorMat(0x26211d), 0, 0.88, -0.14),
      box(0.58, 0.02, 0.36, colorMat(0x55575b, { gloss: 0.6 }), 0, 1.1, -0.14),
      // chaminé
      box(0.34, 0.9, 0.3, brick, 0, 1.1, -0.3),
      box(0.42, 0.06, 0.38, colorMat(0xd3c3a0), 0, 2.0, -0.3),
      // espetos e brasa
      rod([-0.24, 1.14, -0.08], [0.24, 1.14, -0.08], 0.012, chrome()),
      rod([-0.24, 1.14, -0.2], [0.24, 1.14, -0.2], 0.012, chrome()),
    );
    const ember = colorMat(0xff7a2a, { emissive: 0xff5a10, emissiveIntensity: 0.0, unique: true });
    g.add(box(0.5, 0.03, 0.3, ember, 0, 0.95, -0.14));
    const meat = [ball(0.06, 0.04, 0.05, colorMat(0x8a3a22), -0.1, 1.15, -0.08, 8), ball(0.06, 0.04, 0.05, colorMat(0x8a3a22), 0.12, 1.15, -0.2, 8)];
    g.add(...meat);
    return {
      group: g,
      tick(info) {
        const on = !!info.using;
        ember.emissiveIntensity = on ? 0.8 + Math.sin(info.time * 7) * 0.2 : 0;
        for (const m of meat) m.visible = on;
      },
    };
  },
};

/** Mesa de piquenique de madeira com dois bancos; senta-se nas pontas como na mesa da cozinha. */
const patiotable: FurnitureSpec = {
  sit: [
    { x: -1.08, y: 0.45, z: 0, heading: Math.PI / 2 },
    { x: 1.08, y: 0.45, z: 0, heading: -Math.PI / 2 },
  ],
  build() {
    const wood = texMat('pine', { color: 0xe0b888 });
    const g = group(
      // tampo de ripas
      box(1.9, 0.05, 0.86, wood, 0, 0.72, 0),
      box(0.08, 0.7, 0.08, wood, -0.8, 0.02, -0.3),
      box(0.08, 0.7, 0.08, wood, -0.8, 0.02, 0.3),
      box(0.08, 0.7, 0.08, wood, 0.8, 0.02, -0.3),
      box(0.08, 0.7, 0.08, wood, 0.8, 0.02, 0.3),
    );
    for (let i = 0; i < 4; i++) g.add(box(1.92, 0.006, 0.01, colorMat(0x5b3a22), 0, 0.773, -0.33 + i * 0.22));
    // bancos nas pontas (virados para a mesa)
    for (const sx of [-1, 1]) {
      g.add(box(0.36, 0.05, 0.9, wood, sx * 1.1, 0.42, 0), box(0.06, 0.42, 0.06, wood, sx * 1.1, 0, -0.35), box(0.06, 0.42, 0.06, wood, sx * 1.1, 0, 0.35));
    }
    // guarda-sol listrado
    g.add(rod([0, 0.72, 0], [0, 2.2, 0], 0.025, colorMat(0xf3efe2)));
    const shadeMat = colorMat(0xd9483f, { doubleSide: true });
    const cone = new THREE.Mesh(new THREE.ConeGeometry(1.0, 0.36, 8, 1, true), shadeMat);
    cone.position.y = 2.2;
    g.add(cone);
    for (let i = 0; i < 8; i += 2) {
      const a = (i / 8) * Math.PI * 2 + Math.PI / 8;
      g.add(rod([0, 2.38, 0], [Math.cos(a) * 0.99, 2.03, Math.sin(a) * 0.99], 0.012, colorMat(0xf3efe2)));
    }
    g.add(lathe([[0.05, 0], [0.07, 0.06], [0.04, 0.14]], 10, colorMat(0x2c55a6, { gloss: 0.8 }), 0.3, 0.77, 0.1));
    return { group: g };
  },
};

/** Rede de varanda entre dois postes; o folk deita no meio. */
const hammock: FurnitureSpec = {
  lie: { x: 0.82, y: 0.5, z: 0, heading: Math.PI / 2 },
  build() {
    const post = texMat('walnut');
    const cloth = texMat('rug', { color: 0xffe0c0, doubleSide: true });
    const g = group(box(0.12, 1.5, 0.12, post, -0.92, 0, 0), box(0.12, 1.5, 0.12, post, 0.92, 0, 0));
    // pano curvado: tiras que descem no meio
    const n = 10;
    const sling = new THREE.Group();
    for (let i = 0; i < n; i++) {
      const t0 = i / n;
      const t1 = (i + 1) / n;
      const x0 = -0.72 + t0 * 1.44;
      const x1 = -0.72 + t1 * 1.44;
      const y0 = 0.92 - Math.sin(t0 * Math.PI) * 0.46;
      const y1 = 0.92 - Math.sin(t1 * Math.PI) * 0.46;
      const len = Math.hypot(x1 - x0, y1 - y0);
      const strip = box(len + 0.01, 0.025, 0.7, cloth, 0, 0, 0);
      strip.position.set((x0 + x1) / 2, (y0 + y1) / 2, 0);
      strip.rotation.z = Math.atan2(y1 - y0, x1 - x0);
      sling.add(strip);
    }
    g.add(sling);
    // cordas até os postes
    for (const sx of [-1, 1]) {
      for (const sz of [-0.3, 0, 0.3]) g.add(rod([sx * 0.72, 0.92, sz], [sx * 0.88, 1.32, 0], 0.008, colorMat(0xe9dcb8)));
    }
    return {
      group: g,
      tick(info) {
        sling.rotation.x = Math.sin(info.time * 1.6) * (info.using ? 0.12 : 0.03);
      },
    };
  },
};

export const YARD_ART: Record<string, FurnitureSpec> = {
  flowerbed,
  rosebush,
  hedge,
  veggiebed,
  orangetree,
  ipe,
  poolladder,
  diveboard,
  grill,
  patiotable,
  hammock,
};

/** Bloco 13: o vaso da sala também murcha (usa a mesma lógica das plantas do quintal). */
export function livingPot(model: FurnitureModel): FurnitureModel {
  const tinted: THREE.MeshPhongMaterial[] = [];
  model.group.traverse((o) => {
    if (o instanceof THREE.Mesh && o.material instanceof THREE.MeshPhongMaterial && o.material.map?.image && o.geometry instanceof THREE.PlaneGeometry) {
      const mat = o.material.clone();
      o.material = mat;
      tinted.push(mat);
    }
  });
  const cardsOf = model.group.children.filter((o) => o instanceof THREE.Mesh && o.geometry instanceof THREE.PlaneGeometry);
  let key = '';
  return {
    group: model.group,
    tick(info) {
      model.tick?.(info);
      const p = info.plant;
      const k = p ? `${Math.round(p.health / 10)}|${Math.round(p.water / 12)}` : '';
      if (k === key) return;
      key = k;
      const tint = foliageTint(p);
      for (const m of tinted) m.color.setHex(tint);
      const wilted = !!p && (p.health < 40 || p.water <= 0);
      for (const c of cardsOf) {
        c.scale.y = wilted ? 0.78 : 1;
        c.position.y = wilted ? 0.9 : 1.02;
      }
    },
  };
}

