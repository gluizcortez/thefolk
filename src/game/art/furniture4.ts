import * as THREE from 'three';
import { ball, box, colorMat, cyl, fronted, lathe, rbox, rod, texMat, tileUV } from './build';
import type { FurnitureSpec } from './furniture';
import { WALL_FACE, chair, chrome, tvPicture, enamelMat, feet, framed, fridge, group, porcelain, shower, stove, toilet } from './furniture';
import { PAL, mix, seeded, shade } from './palette';
import { getTexture } from './textures';

// Bloco 4: modelos do catálogo em faixas de preço e dos jogos. As versões
// baratas são magras, de lata, lona e compensado; as caras são estofadas,
// de madeira escura, mármore e metal dourado. Tudo com as mesmas peças de
// montar do resto dos móveis (formas arredondadas, esmalte e cromado).

const brass = () => colorMat(PAL.brass, { gloss: 0.9 });
const tin = () => colorMat(0x9aa2a6, { gloss: 0.5 });
const plastic = () => colorMat(PAL.plastic, { gloss: 0.5 });

/** Tela de TV que liga quando alguém assiste (mesmas texturas da TV média). */
function screen(): { mat: THREE.MeshPhongMaterial; tick(time: number, using: string | undefined, channel: string | undefined): void } {
  const off = getTexture('tvOff');
  const mat = new THREE.MeshPhongMaterial({ map: off, emissive: 0xffffff, emissiveMap: off, emissiveIntensity: 0, specular: 0x555555, shininess: 50 });
  return {
    mat,
    tick(time, using, channel) {
      const map = tvPicture(time, using, channel) ?? off;
      if (mat.map !== map) {
        mat.map = map;
        mat.emissiveMap = map;
      }
      mat.emissiveIntensity = map !== off ? 0.75 + Math.sin(time * 23) * 0.06 : 0;
    },
  };
}

/** Lâmpada: ponto de luz e um material que brilha quando acesa. */
function bulb(y: number, glow: THREE.MeshPhongMaterial, power = 1): { light: THREE.PointLight; tick(night: number, lit?: boolean): void } {
  const light = new THREE.PointLight(0xffd9a0, 0, 7, 1.6);
  light.position.y = y;
  return {
    light,
    tick(night, lit) {
      glow.emissiveIntensity = lit ? 0.45 + night * 0.55 : 0.08;
      light.intensity = lit ? (1.5 + night * 4.5) * power : 0;
    },
  };
}

/** Banquinho redondo (para os jogos de mesa). */
function stool(z: number, top: THREE.Material): THREE.Group {
  const m = chrome();
  const g = group(cyl(0.17, 0.17, 0.06, 14, top, 0, 0.42, z), cyl(0.02, 0.02, 0.42, 6, m, 0, 0, z), cyl(0.15, 0.17, 0.02, 12, m, 0, 0, z));
  return g;
}

// ---------- bloco 9: mesa de petiscos ----------

/** Mesa comprida de festa com toalha; travessas aparecem conforme o que sobrou. */
const buffet: FurnitureSpec = {
  build(seed) {
    const top = colorMat(0xf1e6c6, { gloss: 0.2 });
    const cloth = colorMat(0xc23a32, { gloss: 0.15 });
    const leg = texMat('oak', { gloss: 0.4 });
    const g = group(rbox(1.86, 0.05, 0.8, 0.02, top, 0, 0.72, 0));
    // toalha caindo pelas bordas, com barrado
    g.add(box(1.9, 0.22, 0.84, cloth, 0, 0.53, 0), box(1.91, 0.03, 0.85, colorMat(0xf4efdf), 0, 0.53, 0));
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) g.add(cyl(0.035, 0.03, 0.53, 8, leg, sx * 0.84, 0, sz * 0.34));
    const rnd = seeded(seed + 9);
    const plates: THREE.Object3D[] = [];
    const foods = [0xe8b830, 0x6aa846, 0xc9382f, 0xe07a2c, 0x8a5a2a, 0xf4efdf];
    for (let i = 0; i < 6; i++) {
      const x = -0.66 + i * 0.27;
      const z = (i % 2 ? 0.14 : -0.14) + (rnd() - 0.5) * 0.05;
      const plate = group(cyl(0.12, 0.1, 0.02, 14, porcelain(), x, 0.77, z));
      for (let k = 0; k < 4; k++) {
        plate.add(ball(0.035, 0.03, 0.035, colorMat(foods[(i + k) % foods.length], { gloss: 0.4 }), x + (rnd() - 0.5) * 0.12, 0.8, z + (rnd() - 0.5) * 0.12, 6));
      }
      plates.push(plate);
      g.add(plate);
    }
    // jarra de suco no meio
    g.add(cyl(0.06, 0.05, 0.2, 10, colorMat(0xf2c14e, { gloss: 0.9 }), 0.0, 0.77, 0));
    return {
      group: g,
      tick({ stock }) {
        const left = Math.ceil(((stock ?? 0) / 16) * plates.length);
        plates.forEach((p, i) => (p.visible = i < left));
      },
    };
  },
};

// ---------- bloco 10: vida a dois ----------

/** Cama de casal média: cabeceira de madeira clara com dois travesseiros. */
const COUPLE_TOP = 0.48;
const bedcouple: FurnitureSpec = {
  lie: { x: -0.45, y: COUPLE_TOP + 0.12, z: 0.9, heading: 0 },
  lies: [
    { x: -0.45, y: COUPLE_TOP + 0.12, z: 0.9, heading: 0 },
    { x: 0.45, y: COUPLE_TOP + 0.12, z: 0.9, heading: 0 },
  ],
  build(_seed, paint) {
    const wood = texMat('pine', { gloss: 0.45 });
    const white = colorMat(0xf2eee2);
    const color = paint ?? 0x3f6aa8;
    const duvet = tileUV(box(1.8, 0.08, 1.2, texMat('duvet', { color: mix(0xffffff, color, 0.6) }), 0, COUPLE_TOP, 0.34), 2.5, 2);
    const g = group(
      ...feet(1.86, 1.86, 0.16, wood, 0.04),
      box(1.9, 0.16, 1.9, wood, 0, 0.14, 0.02),
      rbox(1.82, 0.2, 1.8, 0.06, white, 0, 0.29, 0.04),
      // cabeceira de ripas com travessa curva em cima
      box(1.96, 0.9, 0.08, wood, 0, 0.14, -0.94),
      rbox(2.02, 0.1, 0.12, 0.04, wood, 0, 1.02, -0.94),
      // pezeira baixa
      box(1.96, 0.36, 0.06, wood, 0, 0.14, 0.94),
      duvet,
      // dobra do lençol
      rbox(1.8, 0.08, 0.16, 0.03, white, 0, COUPLE_TOP, -0.24),
    );
    for (const sx of [-1, 1]) {
      g.add(rbox(0.6, 0.14, 0.32, 0.07, white, sx * 0.45, COUPLE_TOP - 0.02, -0.66));
      // ripas da cabeceira
      for (let i = 0; i < 3; i++) g.add(box(0.06, 0.62, 0.02, colorMat(shade(0xc89a5a, 0.82)), sx * (0.25 + i * 0.25), 0.3, -0.895));
    }
    let raised = 1;
    return {
      group: g,
      tick({ using }) {
        const target = using ? 3 : 1;
        raised += (target - raised) * 0.2;
        duvet.scale.y = raised;
        duvet.position.y = COUPLE_TOP + 0.04 * raised;
      },
    };
  },
};

/** Expositor de canto com o estojo de veludo aberto e a aliança brilhando. */
const ringbox: FurnitureSpec = {
  build() {
    const wood = texMat('walnut', { gloss: 0.6 });
    const velvet = colorMat(0x8a1f3a, { gloss: 0.15 });
    const gold = colorMat(PAL.brass, { gloss: 1 });
    const g = group(
      // coluninha torneada
      lathe(
        [
          [0.2, 0],
          [0.2, 0.05],
          [0.09, 0.1],
          [0.07, 0.45],
          [0.1, 0.7],
          [0.2, 0.74],
          [0.2, 0.8],
        ],
        14,
        wood,
      ),
      // toalhinha de renda
      cyl(0.19, 0.19, 0.01, 16, colorMat(0xf4efdf), 0, 0.8, 0),
      // estojo: base e tampa aberta
      rbox(0.18, 0.08, 0.15, 0.03, velvet, 0, 0.81, 0.01),
    );
    const lid = rbox(0.18, 0.08, 0.03, 0.02, velvet, 0, 0.0, 0);
    const hinge = group(lid);
    hinge.position.set(0, 0.89, -0.06);
    hinge.rotation.x = -0.35;
    g.add(hinge, box(0.14, 0.012, 0.11, colorMat(0xf1e6c6, { gloss: 0.4 }), 0, 0.885, 0.015));
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.03, 0.008, 6, 16), gold);
    ring.position.set(0, 0.92, 0.02);
    const stone = ball(0.012, 0.014, 0.012, colorMat(0xe8f4ff, { gloss: 1 }), 0, 0.955, 0.02, 8);
    g.add(ring, stone);
    let t = 0;
    return {
      group: g,
      tick() {
        t += 0.016;
        ring.rotation.y = t * 0.8;
        (stone.material as THREE.MeshPhongMaterial).emissive.setHex(Math.sin(t * 4) > 0.6 ? 0x445566 : 0x000000);
      },
    };
  },
};

/** Arco de flores: duas colunas brancas com treliça e flores por cima. */
const weddingarch: FurnitureSpec = {
  build(seed) {
    const white = colorMat(0xf4f1e6, { gloss: 0.5 });
    const leaf = colorMat(PAL.leaf);
    const g = group();
    for (const sx of [-1, 1]) {
      // vaso na base e coluna de treliça
      g.add(cyl(0.16, 0.13, 0.26, 12, colorMat(0xe8e0cc, { gloss: 0.6 }), sx * 0.82, 0, 0));
      g.add(rod([sx * 0.82 - 0.05, 0.26, 0], [sx * 0.82 - 0.05, 1.7, 0], 0.02, white), rod([sx * 0.82 + 0.05, 0.26, 0], [sx * 0.82 + 0.05, 1.7, 0], 0.02, white));
      for (let i = 0; i < 6; i++) g.add(rod([sx * 0.82 - 0.05, 0.35 + i * 0.24, 0], [sx * 0.82 + 0.05, 0.47 + i * 0.24, 0], 0.01, white, 5));
    }
    // arco de cima, feito de gomos
    const steps = 14;
    const pts: [number, number, number][] = [];
    for (let i = 0; i <= steps; i++) {
      const a = Math.PI - (i / steps) * Math.PI;
      pts.push([Math.cos(a) * 0.82, 1.7 + Math.sin(a) * 0.5, 0]);
    }
    for (let i = 0; i < steps; i++) g.add(rod(pts[i], pts[i + 1], 0.035, white, 6));
    // flores e folhas em cachos ao longo do arco e das colunas
    const rnd = seeded(seed + 21);
    const cols = [0xf3efe2, 0xe07aa8, 0xf2c744, 0xd9483f, 0xf6c7d4];
    for (let i = 0; i < 34; i++) {
      const p = i < 22 ? pts[Math.floor(rnd() * pts.length)] : ([(rnd() < 0.5 ? -1 : 1) * 0.82, 0.4 + rnd() * 1.3, 0] as [number, number, number]);
      const x = p[0] + (rnd() - 0.5) * 0.12;
      const y = p[1] + (rnd() - 0.5) * 0.1;
      const z = (rnd() - 0.5) * 0.14;
      if (i % 3 === 0) g.add(ball(0.06, 0.025, 0.04, leaf, x, y, z, 6));
      else g.add(ball(0.045, 0.04, 0.045, colorMat(cols[i % cols.length]), x, y, z, 7));
    }
    // fita pendurada no meio
    g.add(box(0.05, 0.3, 0.01, colorMat(0xe07aa8), 0, 1.9, 0.03));
    return { group: g };
  },
};

/** Mala de couro com alça e cantoneiras (de quem acabou de chegar). */
const suitcase: FurnitureSpec = {
  build(seed) {
    const leather = colorMat(seed % 2 ? 0x8a4a22 : 0x4a5a7a, { gloss: 0.35 });
    const metal = colorMat(PAL.brass, { gloss: 0.9 });
    const g = group(
      rbox(0.62, 0.42, 0.24, 0.04, leather, 0, 0.02, 0),
      box(0.64, 0.03, 0.26, colorMat(0x3a2418), 0, 0.2, 0),
      rod([-0.1, 0.46, 0], [-0.1, 0.52, 0], 0.012, metal, 5),
      rod([0.1, 0.46, 0], [0.1, 0.52, 0], 0.012, metal, 5),
      rod([-0.1, 0.52, 0], [0.1, 0.52, 0], 0.016, colorMat(0x3a2418), 6),
    );
    for (const sx of [-1, 1]) g.add(box(0.05, 0.05, 0.02, metal, sx * 0.28, 0.4, 0.12), box(0.04, 0.03, 0.02, metal, sx * 0.12, 0.33, 0.125));
    // etiqueta de viagem
    g.add(box(0.08, 0.05, 0.005, colorMat(0xf4efdf), 0.2, 0.3, 0.125));
    g.rotation.y = 0.3;
    return { group: g };
  },
};

// ---------- camas ----------

const bedcot: FurnitureSpec = {
  lie: { x: 0, y: 0.5, z: 0.9, heading: 0 },
  build() {
    const m = tin();
    const canvas = colorMat(0x8b7d4e);
    const g = group(rbox(0.78, 0.05, 1.86, 0.02, canvas, 0, 0.38, 0), rbox(0.5, 0.1, 0.3, 0.05, colorMat(0xe9e3d0), 0, 0.42, -0.7));
    // armação dobrável em X nas pontas e no meio
    for (const z of [-0.85, 0, 0.85]) {
      g.add(rod([-0.38, 0.4, z], [0.38, 0, z], 0.014, m), rod([0.38, 0.4, z], [-0.38, 0, z], 0.014, m));
    }
    for (const sx of [-1, 1]) g.add(rod([sx * 0.39, 0.41, -0.93], [sx * 0.39, 0.41, 0.93], 0.016, m));
    // cobertor dobrado no pé
    g.add(rbox(0.7, 0.06, 0.4, 0.03, texMat('fabric', { color: 0x6d7d5a }), 0, 0.42, 0.6));
    return { group: g };
  },
};

const QUEEN_TOP = 0.52;
const bedqueen: FurnitureSpec = {
  lie: { x: -0.45, y: QUEEN_TOP + 0.12, z: 0.9, heading: 0 },
  lies: [
    { x: -0.45, y: QUEEN_TOP + 0.12, z: 0.9, heading: 0 },
    { x: 0.45, y: QUEEN_TOP + 0.12, z: 0.9, heading: 0 },
  ],
  build(_seed, paint) {
    const pad = texMat('fabric', { color: paint ?? 0x6b3a6e });
    const wood = texMat('walnut', { gloss: 0.4 });
    const white = colorMat(0xf4f1e6);
    const duvet = tileUV(box(1.82, 0.09, 1.24, texMat('duvet', { color: mix(0xffffff, paint ?? 0x6b3a6e, 0.55) }), 0, QUEEN_TOP, 0.32), 2.5, 2);
    const g = group(
      ...feet(1.86, 1.86, 0.12, wood, 0.05),
      rbox(1.92, 0.2, 1.92, 0.05, pad, 0, 0.1, 0.02),
      rbox(1.84, 0.24, 1.82, 0.08, white, 0, 0.29, 0.04),
      // cabeceira alta e estofada, com moldura de madeira
      rbox(2.0, 1.3, 0.16, 0.07, pad, 0, 0.0, -0.92),
      rbox(2.06, 0.08, 0.2, 0.03, wood, 0, 1.3, -0.92),
      duvet,
      rbox(1.82, 0.1, 0.18, 0.05, white, 0, QUEEN_TOP, -0.3),
    );
    for (const sx of [-1, 1]) {
      g.add(rbox(0.62, 0.15, 0.34, 0.07, white, sx * 0.45, QUEEN_TOP - 0.02, -0.68));
      // botões do capitonê
      for (let i = 0; i < 3; i++) g.add(ball(0.025, 0.025, 0.02, colorMat(shade(paint ?? 0x6b3a6e, 0.6)), sx * (0.3 + i * 0.25), 0.9, -0.835, 6));
    }
    let raised = 1;
    return {
      group: g,
      tick({ using }) {
        const target = using ? 3.2 : 1;
        raised += (target - raised) * 0.2;
        duvet.scale.y = raised;
        duvet.position.y = QUEEN_TOP + 0.045 * raised;
      },
    };
  },
};

// ---------- sofás e poltronas ----------

const sofacheap: FurnitureSpec = {
  sit: [
    { x: -0.4, y: 0.42, z: 0.08, heading: 0 },
    { x: 0.4, y: 0.42, z: 0.08, heading: 0 },
  ],
  build(_seed, paint) {
    const fab = texMat('fabric', { color: paint ?? 0x7a4a2c });
    const m = tin();
    const g = group(
      box(1.86, 0.18, 0.78, fab, 0, 0.2, 0.0),
      box(1.86, 0.5, 0.16, fab, 0, 0.36, -0.32),
      rbox(0.86, 0.1, 0.6, 0.03, texMat('fabric', { color: shade(paint ?? 0x7a4a2c, 1.15) }), -0.44, 0.38, 0.06),
      rbox(0.86, 0.1, 0.6, 0.03, texMat('fabric', { color: shade(paint ?? 0x7a4a2c, 1.15) }), 0.44, 0.38, 0.06),
    );
    for (const sx of [-1, 1]) {
      g.add(box(0.1, 0.32, 0.78, fab, sx * 0.88, 0.36, 0));
      g.add(rod([sx * 0.85, 0.2, 0.33], [sx * 0.88, 0, 0.36], 0.015, m), rod([sx * 0.85, 0.2, -0.33], [sx * 0.88, 0, -0.36], 0.015, m));
    }
    return { group: g };
  },
};

const sofaluxe: FurnitureSpec = {
  sit: [
    { x: -0.42, y: 0.45, z: 0.06, heading: 0 },
    { x: 0.42, y: 0.45, z: 0.06, heading: 0 },
  ],
  build(_seed, paint) {
    const col = paint ?? 0x7a4a2c;
    const leather = colorMat(col, { gloss: 0.55 });
    const dark = colorMat(shade(col, 0.7), { gloss: 0.5 });
    const wood = texMat('walnut', { gloss: 0.5 });
    const g = group(rbox(1.96, 0.26, 0.88, 0.06, leather, 0, 0.1, 0.02), rbox(1.96, 0.62, 0.22, 0.08, leather, 0, 0.3, -0.34));
    for (const sx of [-1, 1]) {
      // braços enrolados
      const arm = cyl(0.17, 0.17, 0.9, 14, leather, sx * 0.9, 0.0, 0);
      arm.rotation.x = Math.PI / 2;
      arm.position.set(sx * 0.9, 0.62, 0.0);
      g.add(arm, rbox(0.24, 0.5, 0.86, 0.08, leather, sx * 0.9, 0.1, 0));
      g.add(rbox(0.82, 0.14, 0.64, 0.06, leather, sx * 0.41, 0.34, 0.1));
      for (const sz of [-1, 1]) g.add(ball(0.05, 0.05, 0.05, wood, sx * 0.88, 0.05, sz * 0.36, 8));
    }
    // capitonê: botões em losango no encosto
    for (let i = 0; i < 7; i++) for (let j = 0; j < 2; j++) g.add(ball(0.022, 0.022, 0.015, dark, -0.75 + i * 0.25 + (j ? 0.125 : 0), 0.62 + j * 0.16, -0.225, 6));
    g.add(rbox(0.32, 0.3, 0.1, 0.05, texMat('fabric', { color: PAL.duvet }), 0.55, 0.48, -0.12));
    return { group: g };
  },
};

const armchaircheap: FurnitureSpec = {
  sit: [{ x: 0, y: 0.4, z: 0.06, heading: 0 }],
  build() {
    const wicker = texMat('pine', { color: 0xe0c48c, gloss: 0.2 });
    const bowl = lathe(
      [
        [0.12, 0],
        [0.3, 0.06],
        [0.42, 0.3],
        [0.44, 0.34],
      ],
      18,
      colorMat(0xc9a46a, { doubleSide: true }),
      0,
      0.32,
      0,
    );
    bowl.rotation.x = -0.35;
    const g = group(
      lathe(
        [
          [0.3, 0],
          [0.3, 0.03],
          [0.06, 0.3],
          [0.06, 0.34],
        ],
        14,
        wicker,
      ),
      bowl,
      rbox(0.5, 0.08, 0.46, 0.04, texMat('fabric', { color: 0xc9382f }), 0, 0.36, 0.05),
    );
    return { group: g };
  },
};

const recliner: FurnitureSpec = {
  sit: [{ x: 0, y: 0.45, z: 0.04, heading: 0 }],
  build(_seed, paint) {
    const fab = texMat('fabric', { color: paint ?? 0x3f7a4a });
    const light = texMat('fabric', { color: shade(paint ?? 0x3f7a4a, 1.18) });
    const g = group(
      rbox(0.86, 0.3, 0.8, 0.06, fab, 0, 0.06, 0),
      rbox(0.86, 0.9, 0.26, 0.1, fab, 0, 0.2, -0.3),
      rbox(0.6, 0.16, 0.6, 0.07, light, 0, 0.34, 0.06),
      rbox(0.6, 0.45, 0.16, 0.07, light, 0, 0.5, -0.16),
    );
    for (const sx of [-1, 1]) g.add(rbox(0.15, 0.56, 0.8, 0.07, fab, sx * 0.36, 0.08, 0));
    const rest = rbox(0.56, 0.12, 0.4, 0.05, fab, 0, 0, 0);
    rest.position.set(0, 0.12, 0.36);
    g.add(rest);
    let up = 0;
    return {
      group: g,
      tick({ using }) {
        // o apoio dos pés sobe quando alguém deita o encosto
        up += ((using ? 1 : 0) - up) * 0.15;
        rest.position.set(0, 0.12 + up * 0.22, 0.36 + up * 0.18);
        rest.rotation.x = -up * 0.25;
      },
    };
  },
};

// ---------- cadeiras e mesas ----------

const chairfold: FurnitureSpec = {
  sit: [{ x: 0, y: 0.45, z: 0.0, heading: 0 }],
  build() {
    const m = colorMat(0x6f777b, { gloss: 0.5 });
    const g = group(rbox(0.4, 0.04, 0.38, 0.015, m, 0, 0.44, 0), rbox(0.38, 0.22, 0.03, 0.01, m, 0, 0.66, -0.2));
    for (const sx of [-1, 1]) {
      g.add(rod([sx * 0.18, 0.88, -0.22], [sx * 0.19, 0, 0.18], 0.012, m), rod([sx * 0.17, 0.45, -0.2], [sx * 0.19, 0, -0.22], 0.012, m));
    }
    return { group: g };
  },
};

const chairvinyl: FurnitureSpec = {
  sit: [{ x: 0, y: 0.47, z: 0.0, heading: 0 }],
  build(_seed, paint) {
    return { group: group(chair(colorMat(paint ?? PAL.vinyl, { gloss: 0.7 }))) };
  },
};

const chairhigh: FurnitureSpec = {
  sit: [{ x: 0, y: 0.48, z: 0.02, heading: 0 }],
  build(_seed, paint) {
    const wood = texMat('walnut', { gloss: 0.45 });
    const pad = texMat('fabric', { color: paint ?? 0x6b3a6e });
    const g = group(rbox(0.46, 0.1, 0.44, 0.03, pad, 0, 0.42, 0.02), box(0.46, 0.06, 0.44, wood, 0, 0.38, 0.02));
    for (const sx of [-1, 1]) {
      g.add(box(0.05, 0.4, 0.05, wood, sx * 0.2, 0, 0.21), box(0.05, 1.22, 0.05, wood, sx * 0.2, 0, -0.19));
    }
    g.add(rbox(0.36, 0.62, 0.05, 0.02, pad, 0, 0.6, -0.19), rbox(0.48, 0.07, 0.07, 0.03, wood, 0, 1.2, -0.19));
    return { group: g };
  },
};

const tablefold: FurnitureSpec = {
  build() {
    const top = colorMat(0xe8e1cf, { gloss: 0.3 });
    const m = tin();
    const g = group(rbox(0.8, 0.03, 0.8, 0.01, top, 0, 0.72, 0), box(0.8, 0.06, 0.8, colorMat(0xc23a32), 0, 0.69, 0));
    for (const sx of [-1, 1]) g.add(rod([sx * 0.34, 0.7, -0.34], [sx * 0.34, 0, 0.34], 0.014, m), rod([sx * 0.34, 0.7, 0.34], [sx * 0.34, 0, -0.34], 0.014, m));
    // toalha xadrez de plástico por cima
    g.add(box(0.84, 0.005, 0.84, texMat('chessboard', { color: 0xffb0a0 }), 0, 0.751, 0));
    return { group: g };
  },
};

const table: FurnitureSpec = {
  build(seed) {
    const oak = texMat('oak', { gloss: 0.4 });
    const g = group(rbox(1.84, 0.06, 0.88, 0.02, oak, 0, 0.7, 0), box(1.7, 0.1, 0.76, oak, 0, 0.62, 0));
    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) {
        g.add(
          lathe(
            [
              [0.04, 0],
              [0.05, 0.08],
              [0.03, 0.2],
              [0.045, 0.4],
              [0.035, 0.62],
            ],
            10,
            oak,
            sx * 0.8,
            0,
            sz * 0.34,
          ),
        );
      }
    }
    // caminho de mesa e fruteira
    g.add(box(1.2, 0.006, 0.3, colorMat(0xf1e6c6), 0, 0.76, 0));
    const rnd = seeded(seed + 3);
    g.add(cyl(0.16, 0.1, 0.06, 14, colorMat(0x2c55a6, { gloss: 0.8 }), 0, 0.76, 0));
    for (let i = 0; i < 4; i++) g.add(ball(0.045, 0.045, 0.045, colorMat([0xc9382f, 0xe8b830, 0x6aa846, 0xe07a2c][i], { gloss: 0.5 }), (rnd() - 0.5) * 0.14, 0.84, (rnd() - 0.5) * 0.14, 8));
    return { group: g };
  },
};

const tablemarble: FurnitureSpec = {
  build() {
    const marble = texMat('marble', { gloss: 0.9 });
    const gold = brass();
    const g = group(rbox(1.9, 0.06, 0.92, 0.03, marble, 0, 0.72, 0));
    for (const sx of [-1, 1]) {
      g.add(
        lathe(
          [
            [0.24, 0],
            [0.24, 0.03],
            [0.08, 0.1],
            [0.05, 0.3],
            [0.09, 0.45],
            [0.05, 0.6],
            [0.18, 0.72],
          ],
          14,
          texMat('walnut', { gloss: 0.5 }),
          sx * 0.6,
          0,
          0,
        ),
      );
    }
    // castiçal dourado com três velas
    g.add(cyl(0.08, 0.1, 0.03, 12, gold, 0, 0.78, 0), rod([0, 0.78, 0], [0, 0.98, 0], 0.015, gold), rod([-0.12, 0.92, 0], [0.12, 0.92, 0], 0.012, gold));
    for (const x of [-0.12, 0, 0.12]) g.add(cyl(0.018, 0.018, 0.12, 8, colorMat(0xf4f0e2), x, x === 0 ? 0.98 : 0.92, 0));
    return { group: g };
  },
};

// ---------- banheiro ----------

const showercheap: FurnitureSpec = {
  stand: { x: 0, y: 0.04, z: 0, heading: 0 },
  build(seed) {
    const m = tin();
    const curtain = colorMat(0xbfe0d6, { opacity: 0.55, doubleSide: true, unique: true });
    const g = group(
      box(0.9, 0.04, 0.9, colorMat(0xa9a595), 0, 0, 0),
      cyl(0.04, 0.04, 0.01, 8, colorMat(0x55585a), 0, 0.04, 0),
      rod([-0.4, 0.04, -0.4], [-0.4, 2.0, -0.4], 0.016, m),
      rod([-0.4, 2.0, -0.4], [-0.15, 1.98, -0.15], 0.014, m),
      cyl(0.03, 0.07, 0.05, 10, m, -0.13, 1.92, -0.13),
      // varão e cortina de plástico
      rod([-0.44, 2.02, 0.44], [0.44, 2.02, 0.44], 0.012, m),
      rod([0.44, 2.02, -0.44], [0.44, 2.02, 0.44], 0.012, m),
      box(0.86, 1.6, 0.01, curtain, 0, 0.38, 0.44),
      box(0.01, 1.6, 0.86, curtain, 0.44, 0.38, 0),
    );
    const rnd = seeded(seed + 9);
    const dropMat = new THREE.MeshBasicMaterial({ color: PAL.water, transparent: true, opacity: 0.8 });
    const drops: { mesh: THREE.Mesh; phase: number }[] = [];
    for (let i = 0; i < 10; i++) {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.13, 0.012), dropMat);
      mesh.position.set(-0.13 + (rnd() - 0.5) * 0.3, 1, -0.13 + (rnd() - 0.5) * 0.3);
      g.add(mesh);
      drops.push({ mesh, phase: rnd() });
    }
    return {
      group: g,
      tick({ time, using }) {
        for (const d of drops) {
          d.mesh.visible = !!using;
          d.mesh.position.y = 1.85 - ((time * 1.4 + d.phase) % 1) * 1.75;
        }
      },
    };
  },
};

const showerluxe: FurnitureSpec = {
  stand: { x: 0, y: 0.07, z: 0, heading: 0 },
  build(seed) {
    const base = shower.build(seed);
    const gold = brass();
    // parede de mármore no fundo, segundo chuveiro dourado e banco de madeira
    base.group.add(
      box(0.86, 1.96, 0.04, texMat('marble', { gloss: 0.7 }), 0, 0.07, -0.41),
      cyl(0.09, 0.09, 0.02, 14, gold, 0.18, 2.0, -0.05),
      rod([0.18, 2.06, -0.38], [0.18, 2.06, -0.05], 0.014, gold),
      box(0.6, 0.05, 0.24, texMat('pine', { gloss: 0.3 }), 0, 0.48, -0.26),
      box(0.04, 0.42, 0.2, texMat('pine'), -0.26, 0.07, -0.26),
      box(0.04, 0.42, 0.2, texMat('pine'), 0.26, 0.07, -0.26),
    );
    return base;
  },
};

const toiletcheap: FurnitureSpec = {
  sit: [{ x: 0, y: 0.44, z: 0.02, heading: 0 }],
  build() {
    const p = colorMat(0xe9e5d6, { gloss: 0.6 });
    const bowl = lathe(
      [
        [0.11, 0],
        [0.13, 0.03],
        [0.12, 0.2],
        [0.18, 0.36],
        [0.2, 0.41],
      ],
      14,
      p,
      0,
      0,
      0.06,
    );
    bowl.scale.z = 1.15;
    const seat = new THREE.Mesh(new THREE.TorusGeometry(0.155, 0.035, 6, 14), colorMat(0x1d1c1e, { gloss: 0.6 }));
    seat.rotation.x = Math.PI / 2;
    seat.scale.set(1, 1.15, 0.5);
    seat.position.set(0, 0.425, 0.06);
    // caixa de descarga lá no alto, com corrente
    const g = group(
      bowl,
      seat,
      cyl(0.13, 0.13, 0.01, 12, colorMat(PAL.water, { gloss: 0.9 }), 0, 0.36, 0.07),
      rod([0, 0.3, -0.18], [0, 1.75, -0.36], 0.025, tin()),
      rbox(0.44, 0.24, 0.18, 0.02, colorMat(0x7f8a72, { gloss: 0.4 }), 0, 1.72, -0.34),
      rod([0.18, 1.72, -0.26], [0.18, 1.2, -0.24], 0.005, tin(), 4),
      ball(0.025, 0.035, 0.025, colorMat(0xe9e5d6), 0.18, 1.18, -0.24, 6),
    );
    return { group: g };
  },
};

const toiletluxe: FurnitureSpec = {
  sit: [{ x: 0, y: 0.45, z: 0.02, heading: 0 }],
  build(seed) {
    const base = toilet.build(seed);
    // braço com painel da ducha e assento de madeira clara
    const panel = rbox(0.12, 0.05, 0.3, 0.02, colorMat(0xf4f2ea, { gloss: 0.8 }), 0.27, 0.48, 0.08);
    base.group.add(
      panel,
      box(0.06, 0.04, 0.06, colorMat(0x3f9a8f, { gloss: 0.8 }), 0.27, 0.53, 0.14),
      box(0.06, 0.04, 0.06, colorMat(0xc9382f, { gloss: 0.8 }), 0.27, 0.53, 0.04),
      rbox(0.08, 0.42, 0.08, 0.02, porcelain(), 0.27, 0.06, 0.0),
      cyl(0.03, 0.03, 0.14, 8, brass(), 0.0, 0.85, -0.33),
    );
    return base;
  },
};

// ---------- cozinha ----------

const fridgecheap: FurnitureSpec = {
  build() {
    const body = colorMat(0xc9e2d6, { gloss: 0.6 });
    const g = group(
      rbox(0.68, 1.42, 0.62, 0.14, body, 0, 0.08, -0.08),
      box(0.6, 0.08, 0.5, colorMat(0x26262b), 0, 0, -0.08),
      box(0.04, 0.24, 0.05, chrome(), 0.24, 0.9, 0.25),
      box(0.5, 0.02, 0.01, colorMat(0x8aa79a), 0, 1.1, 0.235),
      // emblema e ímã
      rbox(0.16, 0.04, 0.01, 0.01, chrome(), 0, 1.3, 0.233),
      rbox(0.08, 0.1, 0.01, 0.01, colorMat(0xe8b830), -0.18, 1.0, 0.235),
    );
    return { group: g };
  },
};

const fridgeluxe: FurnitureSpec = {
  build(seed) {
    const base = fridge.build(seed);
    // duas portas lado a lado, dispenser de água e acabamento escovado
    base.group.scale.set(1.12, 1.06, 1);
    base.group.add(
      box(0.012, 1.68, 0.02, colorMat(0x2a2b2e), 0, 0.06, 0.29),
      rbox(0.2, 0.3, 0.02, 0.02, colorMat(0x30343a, { gloss: 0.8 }), -0.17, 0.95, 0.29),
      box(0.12, 0.03, 0.02, colorMat(PAL.water, { gloss: 1, emissive: 0x3f7f9f, emissiveIntensity: 0.4 }), -0.17, 1.15, 0.3),
    );
    return base;
  },
};

const stovecheap: FurnitureSpec = {
  build() {
    const top = texMat('laminate', { gloss: 0.3 });
    const m = colorMat(0x3a3d42, { gloss: 0.6 });
    const g = group(
      rbox(0.9, 0.05, 0.6, 0.02, top, 0, 0.78, -0.1),
      box(0.84, 0.78, 0.04, texMat('pine'), 0, 0, -0.38),
      // fogareiro de duas bocas em cima, botijão embaixo
      rbox(0.56, 0.1, 0.32, 0.02, enamelMat(), 0, 0.83, -0.12),
      cyl(0.08, 0.08, 0.015, 12, m, -0.14, 0.93, -0.12),
      cyl(0.08, 0.08, 0.015, 12, m, 0.14, 0.93, -0.12),
      lathe(
        [
          [0.06, 0],
          [0.15, 0.02],
          [0.16, 0.3],
          [0.12, 0.4],
          [0.04, 0.44],
        ],
        14,
        colorMat(0x2f6fb0, { gloss: 0.6 }),
        0.2,
        0,
        -0.12,
      ),
      rod([0.2, 0.44, -0.12], [-0.1, 0.83, -0.12], 0.01, colorMat(0xe07a2c)),
      cyl(0.1, 0.09, 0.08, 12, m, -0.14, 0.94, -0.12),
    );
    for (const sx of [-1, 1]) g.add(box(0.04, 0.78, 0.04, texMat('pine'), sx * 0.4, 0, 0.16));
    return { group: g };
  },
};

const stoveluxe: FurnitureSpec = {
  build(seed) {
    const base = stove.build(seed);
    const steel = colorMat(0xb7bec2, { gloss: 0.8 });
    // coifa de inox e mais um painel de botões
    base.group.add(
      lathe(
        [
          [0.0, 0.0],
          [0.45, 0.0],
          [0.45, 0.06],
          [0.18, 0.4],
          [0.14, 0.9],
        ],
        4,
        steel,
        0,
        1.55,
        -0.14,
      ),
      box(0.8, 0.05, 0.02, colorMat(PAL.brass, { gloss: 0.9 }), 0, 0.82, 0.255),
    );
    return base;
  },
};

// ---------- TV, som, estante e luz ----------

const tvcheap: FurnitureSpec = {
  facing: 'E',
  build() {
    const scr = screen();
    const body = colorMat(0xe8e1cf, { gloss: 0.5 });
    const m = tin();
    const g = group(
      rbox(0.5, 0.03, 0.4, 0.01, texMat('pine'), 0, 0.6, 0),
      rbox(0.42, 0.34, 0.32, 0.04, body, 0, 0.63, -0.02),
      box(0.3, 0.24, 0.02, fronted(body, scr.mat), -0.04, 0.68, 0.14),
      box(0.04, 0.2, 0.01, colorMat(0x55585a), 0.16, 0.7, 0.14),
      rod([-0.16, 0.97, -0.02], [0.16, 0.97, -0.02], 0.012, m),
      rod([-0.16, 0.97, -0.02], [-0.16, 0.92, -0.02], 0.012, m),
      rod([0.16, 0.97, -0.02], [0.16, 0.92, -0.02], 0.012, m),
    );
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) g.add(rod([sx * 0.22, 0.6, sz * 0.17], [sx * 0.2, 0, sz * 0.15], 0.012, m));
    return { group: g, tick: ({ time, using, channel }) => scr.tick(time, using, channel) };
  },
};

const tvbig: FurnitureSpec = {
  facing: 'E',
  build() {
    const scr = screen();
    const wood = texMat('walnut', { gloss: 0.35 });
    const g = group(
      rbox(1.86, 0.5, 0.6, 0.04, wood, 0, 0.0, -0.1),
      rbox(1.7, 1.12, 0.5, 0.06, wood, 0, 0.5, -0.12),
      box(1.4, 0.92, 0.02, fronted(colorMat(0x1b1c20), scr.mat), 0, 0.6, 0.14),
      box(1.8, 0.4, 0.02, texMat('speakerFront'), 0, 0.06, 0.205),
      rbox(1.9, 0.05, 0.62, 0.02, wood, 0, 1.6, -0.12),
    );
    return { group: g, tick: ({ time, using, channel }) => scr.tick(time, using, channel) };
  },
};

const radio: FurnitureSpec = {
  build() {
    const g = group(...feet(0.44, 0.44, 0.6, texMat('oak'), 0.02), rbox(0.5, 0.04, 0.5, 0.01, texMat('oak', { gloss: 0.3 }), 0, 0.6, 0));
    const body = group(
      rbox(0.36, 0.2, 0.14, 0.05, colorMat(0xc23a32, { gloss: 0.6 }), 0, 0, 0),
      box(0.2, 0.12, 0.01, texMat('speakerFront'), -0.05, 0.04, 0.07),
      cyl(0.03, 0.03, 0.02, 10, colorMat(0xf1e6c6), 0.12, 0.08, 0.07),
      rod([0.12, 0.2, -0.03], [0.22, 0.48, -0.03], 0.005, chrome(), 4),
    );
    body.position.y = 0.64;
    g.add(body);
    return {
      group: g,
      tick({ time, using }) {
        body.scale.setScalar(using ? 1 + Math.max(0, Math.sin(time * 16)) * 0.03 : 1);
      },
    };
  },
};

const jukebox: FurnitureSpec = {
  build() {
    const wood = texMat('walnut', { gloss: 0.5 });
    const glowMat = colorMat(0xe8b830, { emissive: 0xffa040, emissiveIntensity: 0.3, unique: true, gloss: 0.8 });
    const arch = cyl(0.42, 0.42, 0.5, 18, [wood, glowMat, wood], 0, 0, 0);
    arch.rotation.x = Math.PI / 2;
    arch.position.set(0, 1.25, -0.05);
    const g = group(
      rbox(0.84, 1.24, 0.5, 0.05, wood, 0, 0.02, -0.05),
      arch,
      box(0.56, 0.4, 0.02, texMat('speakerFront'), 0, 0.2, 0.205),
      box(0.6, 0.26, 0.02, colorMat(0xf1e6c6, { gloss: 0.9, opacity: 0.85 }), 0, 0.82, 0.205),
    );
    for (const sx of [-1, 1]) g.add(box(0.05, 1.1, 0.03, glowMat, sx * 0.36, 0.1, 0.2));
    const hues = [0xffa040, 0xff5070, 0x60c0ff];
    return {
      group: g,
      tick({ time, using }) {
        glowMat.emissive.setHex(using ? hues[Math.floor(time * 2) % hues.length] : 0xffa040);
        glowMat.emissiveIntensity = using ? 0.9 : 0.3;
      },
    };
  },
};

const bookcrate: FurnitureSpec = {
  build() {
    const crate = texMat('pine', { gloss: 0.1 });
    const g = group();
    for (const [y, x] of [
      [0, 0],
      [0.42, 0],
      [0.84, 0.05],
    ]) {
      g.add(box(0.8, 0.4, 0.38, [crate, crate, crate, crate, texMat('books'), crate], x, y, -0.2));
    }
    return { group: g };
  },
};

const bookcase: FurnitureSpec = {
  build() {
    const wood = texMat('walnut', { gloss: 0.45 });
    const books = texMat('books', { color: 0xd8c8b0 });
    const gold = brass();
    const g = group(
      box(1.94, 2.3, 0.42, fronted(wood, books), 0, 0, -0.27),
      rbox(2.04, 0.1, 0.5, 0.03, wood, 0, 2.3, -0.27),
      box(1.98, 0.1, 0.46, wood, 0, 0, -0.27),
      // escada de biblioteca no trilho dourado
      rod([-0.98, 2.15, -0.03], [0.98, 2.15, -0.03], 0.014, gold),
      rod([0.3, 2.15, -0.02], [0.45, 0, 0.3], 0.022, wood),
      rod([0.6, 2.15, -0.02], [0.75, 0, 0.3], 0.022, wood),
    );
    for (let i = 1; i < 6; i++) {
      const k = i / 6;
      g.add(rod([0.3 + 0.15 * k, 2.15 * (1 - k), -0.02 + 0.32 * k], [0.6 + 0.15 * k, 2.15 * (1 - k), -0.02 + 0.32 * k], 0.012, wood));
    }
    g.add(ball(0.09, 0.09, 0.09, colorMat(0x2c55a6, { gloss: 0.7 }), -0.6, 2.49, -0.27, 12), cyl(0.03, 0.06, 0.08, 10, gold, -0.6, 2.4, -0.27));
    return { group: g };
  },
};

const lampcheap: FurnitureSpec = {
  build() {
    const m = tin();
    const shadeMat = colorMat(0xb7bec2, { gloss: 0.6, doubleSide: true, emissive: 0xffd98a, emissiveIntensity: 0.08, unique: true });
    const b = bulb(1.3, shadeMat, 0.7);
    const g = group(cyl(0.14, 0.14, 0.03, 10, m), rod([0, 0.03, 0], [0, 1.3, 0], 0.012, m), cyl(0.05, 0.2, 0.2, 12, shadeMat, 0, 1.2, 0, true), b.light);
    return { group: g, tick: ({ night, lit }) => b.tick(night, lit) };
  },
};

const lamptiffany: FurnitureSpec = {
  build() {
    const bronze = colorMat(0x6e5a30, { gloss: 0.7 });
    const glass = colorMat(0xd98c3a, { gloss: 0.8, doubleSide: true, emissive: 0xffb060, emissiveIntensity: 0.08, unique: true });
    const b = bulb(1.25, glass, 1.1);
    const dome = lathe(
      [
        [0.4, 0],
        [0.36, 0.1],
        [0.24, 0.22],
        [0.06, 0.28],
      ],
      16,
      glass,
      0,
      1.12,
      0,
    );
    const g = group(
      lathe(
        [
          [0.2, 0],
          [0.2, 0.03],
          [0.08, 0.1],
          [0.04, 0.4],
          [0.06, 0.6],
          [0.03, 1.12],
        ],
        12,
        bronze,
      ),
      dome,
      b.light,
    );
    // faixas coloridas do vitral
    const bands = [0x3f9a8f, 0xc9382f, 0x2c55a6];
    bands.forEach((col, i) => {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.39 - i * 0.07, 0.012, 4, 20), colorMat(col, { emissive: col, emissiveIntensity: 0.3 }));
      ring.rotation.x = Math.PI / 2;
      ring.position.y = 1.13 + i * 0.07;
      g.add(ring);
    });
    return { group: g, tick: ({ night, lit }) => b.tick(night, lit) };
  },
};

// ---------- jogos ----------

const SIT_NS = [
  { x: 0, y: 0.46, z: 0.62, heading: Math.PI },
  { x: 0, y: 0.46, z: -0.62, heading: 0 },
];

const chessboard: FurnitureSpec = {
  sit: SIT_NS,
  build(seed) {
    const wood = texMat('walnut', { gloss: 0.5 });
    const g = group(
      lathe(
        [
          [0.22, 0],
          [0.22, 0.03],
          [0.06, 0.1],
          [0.05, 0.62],
          [0.14, 0.66],
        ],
        12,
        wood,
      ),
      rbox(0.62, 0.05, 0.62, 0.015, wood, 0, 0.66, 0),
      box(0.5, 0.005, 0.5, texMat('chessboard'), 0, 0.71, 0),
      stool(0.62, texMat('fabric', { color: 0x3a2414 })),
      stool(-0.62, texMat('fabric', { color: 0x3a2414 })),
    );
    // algumas peças no tabuleiro
    const rnd = seeded(seed + 21);
    for (let i = 0; i < 10; i++) {
      const white = i % 2 === 0;
      const px = (Math.floor(rnd() * 8) - 3.5) * 0.0625;
      const pz = (white ? 1 : -1) * (0.12 + rnd() * 0.1);
      g.add(
        lathe(
          [
            [0.018, 0],
            [0.014, 0.02],
            [0.008, 0.04],
            [0.012, 0.05],
          ],
          8,
          colorMat(white ? 0xf3efe2 : 0x1b1a1c, { gloss: 0.7 }),
          px,
          0.715,
          pz,
        ),
      );
    }
    return { group: g };
  },
};

const cardtable: FurnitureSpec = {
  sit: SIT_NS,
  build(seed) {
    const wood = texMat('oak', { gloss: 0.4 });
    const g = group(
      cyl(0.4, 0.4, 0.05, 8, [wood, texMat('felt'), wood], 0, 0.68, 0),
      cyl(0.04, 0.04, 0.68, 8, wood, 0, 0, 0),
      cyl(0.24, 0.26, 0.03, 8, wood, 0, 0, 0),
      stool(0.62, colorMat(0xc23a32, { gloss: 0.6 })),
      stool(-0.62, colorMat(0xc23a32, { gloss: 0.6 })),
    );
    const rnd = seeded(seed + 5);
    for (let i = 0; i < 5; i++) {
      const card = box(0.06, 0.003, 0.09, colorMat(0xf4f2ea), (rnd() - 0.5) * 0.3, 0.731 + i * 0.001, (rnd() - 0.5) * 0.3);
      card.rotation.y = rnd() * Math.PI;
      g.add(card);
    }
    for (let i = 0; i < 6; i++) g.add(cyl(0.02, 0.02, 0.01, 10, colorMat([0xc9382f, 0x2c55a6, 0xe8b830][i % 3]), 0.2, 0.73 + i * 0.011, -0.05));
    return { group: g };
  },
};

const videogame: FurnitureSpec = {
  sit: [
    { x: -0.24, y: 0.26, z: 0.78, heading: Math.PI },
    { x: 0.24, y: 0.26, z: 0.78, heading: Math.PI },
  ],
  build() {
    const scr = screen();
    const g = group(
      rbox(0.8, 0.42, 0.44, 0.03, texMat('oak', { gloss: 0.3 }), 0, 0, -0.18),
      rbox(0.58, 0.46, 0.4, 0.05, plastic(), 0, 0.42, -0.2),
      box(0.48, 0.36, 0.02, fronted(plastic(), scr.mat), 0, 0.47, 0.0),
      // console e dois controles com fio
      rbox(0.26, 0.06, 0.18, 0.02, colorMat(0x8a8e94, { gloss: 0.5 }), 0, 0.42, 0.1),
      rbox(0.1, 0.025, 0.05, 0.01, colorMat(0x5a5e64), -0.2, 0.0, 0.5),
      rbox(0.1, 0.025, 0.05, 0.01, colorMat(0x5a5e64), 0.2, 0.0, 0.5),
    );
    // pufes no chão, na frente
    for (const sx of [-1, 1]) g.add(ball(0.24, 0.16, 0.24, texMat('fabric', { color: sx < 0 ? 0xc23a32 : 0x2c55a6 }), sx * 0.24, 0.12, 0.78, 12));
    return { group: g, tick: ({ time, using, channel }) => scr.tick(time, using, channel) };
  },
};

const hottub: FurnitureSpec = {
  sit: [
    { x: -0.55, y: 0.25, z: -0.55, heading: Math.PI / 4 },
    { x: 0.55, y: 0.25, z: 0.55, heading: (-3 * Math.PI) / 4 },
    { x: 0.55, y: 0.25, z: -0.55, heading: -Math.PI / 4 },
    { x: -0.55, y: 0.25, z: 0.55, heading: (3 * Math.PI) / 4 },
  ],
  build(seed) {
    const wood = texMat('pine', { gloss: 0.3, color: 0xc89060 });
    const water = colorMat(PAL.water, { gloss: 1, opacity: 0.8, emissive: 0x2a6f8f, emissiveIntensity: 0.25, unique: true });
    // tina oca: fundo, quatro paredes de ripas e a água um pouco abaixo da borda
    const g = group(
      box(1.9, 0.1, 1.9, wood, 0, 0, 0),
      box(1.9, 0.7, 0.14, wood, 0, 0, 0.88),
      box(1.9, 0.7, 0.14, wood, 0, 0, -0.88),
      box(0.14, 0.7, 1.62, wood, 0.88, 0, 0),
      box(0.14, 0.7, 1.62, wood, -0.88, 0, 0),
      box(1.62, 0.02, 1.62, water, 0, 0.56, 0),
      // banco por dentro
      box(1.62, 0.3, 0.3, wood, 0, 0.1, -0.66),
      // degrau
      box(0.6, 0.2, 0.3, wood, 0, 0, 1.06),
    );
    for (const a of [0, 1, 2, 3]) {
      const ang = (a * Math.PI) / 2;
      g.add(rod([Math.cos(ang) * 0.96, 0.7, Math.sin(ang) * 0.96], [Math.cos(ang + Math.PI / 2) * 0.96, 0.7, Math.sin(ang + Math.PI / 2) * 0.96], 0.03, wood));
    }
    const rnd = seeded(seed + 13);
    const bubbles: { mesh: THREE.Mesh; phase: number }[] = [];
    const bubbleMat = colorMat(0xffffff, { opacity: 0.7 });
    for (let i = 0; i < 14; i++) {
      const mesh = ball(0.03, 0.03, 0.03, bubbleMat, (rnd() - 0.5) * 1.4, 0.58, (rnd() - 0.5) * 1.4, 6);
      g.add(mesh);
      bubbles.push({ mesh, phase: rnd() });
    }
    return {
      group: g,
      tick({ time, using }) {
        for (const b of bubbles) {
          b.mesh.visible = !!using;
          const k = (time * 1.2 + b.phase) % 1;
          b.mesh.scale.setScalar(0.03 * (0.5 + k));
          b.mesh.position.y = 0.58 + k * 0.03;
        }
      },
    };
  },
};

const keyboard: FurnitureSpec = {
  build() {
    const m = colorMat(0x2a2b2e, { gloss: 0.4 });
    const g = group(
      rod([-0.3, 0, 0.12], [0.3, 0.72, -0.1], 0.015, m),
      rod([-0.3, 0.72, 0.12], [0.3, 0, -0.1], 0.015, m),
      rod([0.3, 0, 0.12], [-0.3, 0.72, -0.1], 0.015, m),
      rod([0.3, 0.72, 0.12], [-0.3, 0, -0.1], 0.015, m),
      rbox(0.9, 0.08, 0.3, 0.02, colorMat(0x1b1c20, { gloss: 0.5 }), 0, 0.72, 0),
      box(0.8, 0.012, 0.13, texMat('keys'), 0, 0.8, 0.07),
      box(0.12, 0.012, 0.06, colorMat(0xc9382f, { emissive: 0xc9382f, emissiveIntensity: 0.4 }), 0.3, 0.8, -0.07),
      // estante de partitura
      box(0.4, 0.26, 0.01, colorMat(0xf4f2ea), 0, 0.82, -0.1),
    );
    return { group: g };
  },
};

const piano: FurnitureSpec = {
  sit: [
    { x: -0.32, y: 0.49, z: 0.55, heading: Math.PI },
    { x: 0.32, y: 0.49, z: 0.55, heading: Math.PI },
  ],
  build() {
    const wood = texMat('walnut', { gloss: 0.7 });
    const black = colorMat(0x1b1a1c, { gloss: 0.8 });
    const g = group(
      rbox(1.6, 1.32, 0.56, 0.04, wood, 0, 0.0, -0.2),
      box(1.4, 0.1, 0.3, black, 0, 0.66, 0.2),
      box(1.36, 0.02, 0.16, texMat('keys'), 0, 0.76, 0.26),
      box(1.44, 0.06, 0.36, wood, 0, 0.6, 0.18),
      box(1.0, 0.36, 0.02, colorMat(0xf4f2ea), 0, 0.84, 0.08),
      rbox(1.66, 0.05, 0.6, 0.02, wood, 0, 1.32, -0.2),
    );
    for (const sx of [-1, 1]) g.add(box(0.06, 0.6, 0.06, wood, sx * 0.68, 0, 0.32));
    // banco comprido e castiçal em cima
    g.add(rbox(1.0, 0.07, 0.34, 0.02, texMat('fabric', { color: 0x6b2a2a }), 0, 0.42, 0.55));
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) g.add(box(0.04, 0.42, 0.04, wood, sx * 0.44, 0, 0.55 + sz * 0.13));
    g.add(cyl(0.05, 0.07, 0.04, 10, brass(), 0.5, 1.37, -0.2), cyl(0.018, 0.018, 0.14, 8, colorMat(0xf4f0e2), 0.5, 1.41, -0.2));
    return { group: g };
  },
};

const telescope: FurnitureSpec = {
  build() {
    const m = colorMat(0x2a2b2e, { gloss: 0.4 });
    const gold = brass();
    const tube = group(
      cyl(0.07, 0.06, 0.95, 14, gold, 0, -0.45, 0),
      cyl(0.085, 0.085, 0.08, 14, colorMat(0x1b1c20), 0, 0.5, 0),
      cyl(0.02, 0.02, 0.08, 8, m, 0, -0.52, 0),
    );
    tube.position.set(0, 1.25, 0);
    tube.rotation.set(-0.85, 0, 0);
    const g = group(tube);
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI * 2 + 0.4;
      g.add(rod([0, 1.22, 0], [Math.cos(a) * 0.36, 0, Math.sin(a) * 0.36], 0.016, texMat('oak')));
    }
    let aim = 0;
    return {
      group: g,
      tick({ time, using }) {
        aim += ((using ? Math.sin(time * 0.2) * 0.5 : 0) - aim) * 0.05;
        tube.rotation.y = aim;
      },
    };
  },
};

const punchbag: FurnitureSpec = {
  build() {
    const m = colorMat(0x2a2b2e, { gloss: 0.4 });
    const bag = group(
      cyl(0.17, 0.17, 0.75, 14, colorMat(0xa0302a, { gloss: 0.5 }), 0, -0.95, 0),
      cyl(0.175, 0.175, 0.05, 14, colorMat(0x1b1a1c), 0, -0.6, 0),
      rod([0, -0.2, 0], [0, 0, 0], 0.008, chrome(), 4),
      rod([0, -0.2, 0], [0.12, -0.25, 0], 0.006, chrome(), 4),
      rod([0, -0.2, 0], [-0.12, -0.25, 0], 0.006, chrome(), 4),
    );
    bag.position.set(0, 2.0, 0.15);
    const g = group(
      rod([0, 0, -0.38], [0, 2.1, -0.38], 0.03, m),
      rod([0, 2.05, -0.38], [0, 2.05, 0.18], 0.025, m),
      box(0.5, 0.04, 0.4, m, 0, 0, -0.3),
      bag,
    );
    return {
      group: g,
      tick({ time, using }) {
        bag.rotation.x = using ? Math.sin(time * 9) * 0.12 : 0;
      },
    };
  },
};

// ---------- na parede ----------

const shelf: FurnitureSpec = {
  build(seed) {
    const wood = texMat('walnut', { gloss: 0.4 });
    const g = group(box(0.84, 0.035, 0.2, wood, 0, 1.45, WALL_FACE + 0.1));
    for (const sx of [-1, 1]) g.add(box(0.03, 0.12, 0.16, wood, sx * 0.34, 1.33, WALL_FACE + 0.08));
    const rnd = seeded(seed + 7);
    g.add(
      lathe(
        [
          [0.03, 0],
          [0.06, 0.06],
          [0.03, 0.16],
          [0.04, 0.2],
        ],
        10,
        colorMat([0x3f9a8f, 0xc9382f, 0xe8b830][Math.floor(rnd() * 3)], { gloss: 0.8 }),
        -0.26,
        1.485,
        WALL_FACE + 0.1,
      ),
    );
    for (let i = 0; i < 5; i++) g.add(box(0.04, 0.16 + rnd() * 0.05, 0.13, colorMat([0x2c55a6, 0x3f7a4a, 0xa0302a, 0xe9e1cc][i % 4]), 0.02 + i * 0.045, 1.485, WALL_FACE + 0.1));
    g.add(ball(0.05, 0.05, 0.05, colorMat(0xf4f2ea, { gloss: 0.8 }), 0.3, 1.535, WALL_FACE + 0.1, 8));
    for (const m of g.children) m.castShadow = false;
    return { group: g };
  },
};

const mirror: FurnitureSpec = {
  build() {
    return { group: framed(0.5, 1.3, 0.4, texMat('mirror', { gloss: 1 }), 0xc29a3e, 0.04) };
  },
};

/** Bloco 5: guarda-roupa de duas portas, com espelho numa delas e pés torneados. */
const wardrobe: FurnitureSpec = {
  build() {
    const oak = texMat('oak', { gloss: 0.3 });
    const dark = colorMat(0x5a3a22, { gloss: 0.35 });
    const knob = colorMat(PAL.brass, { gloss: 0.9 });
    const g = group(
      rbox(0.92, 1.86, 0.56, 0.03, oak, 0, 0.12, -0.2),
      // cornija e rodapé
      rbox(0.98, 0.08, 0.6, 0.02, dark, 0, 1.98, -0.2),
      box(0.94, 0.06, 0.58, dark, 0, 0.1, -0.2),
      // portas: frisos, espelho na esquerda, puxadores no meio
      box(0.42, 1.64, 0.02, oak, -0.22, 0.24, 0.085),
      box(0.42, 1.64, 0.02, oak, 0.22, 0.24, 0.085),
      box(0.012, 1.64, 0.025, dark, 0, 0.24, 0.088),
      box(0.3, 1.1, 0.012, texMat('mirror', { gloss: 1 }), -0.22, 0.5, 0.1),
      box(0.3, 1.1, 0.012, dark, 0.22, 0.5, 0.093),
      box(0.26, 1.04, 0.012, oak, 0.22, 0.53, 0.098),
      ball(0.018, 0.018, 0.018, knob, -0.04, 1.06, 0.11, 8),
      ball(0.018, 0.018, 0.018, knob, 0.04, 1.06, 0.11, 8),
    );
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) g.add(cyl(0.035, 0.025, 0.1, 8, dark, sx * 0.4, 0, -0.2 + sz * 0.23));
    return { group: g };
  },
};

export const FURNITURE4: Record<string, FurnitureSpec> = {
  buffet,
  wardrobe,
  bedcot,
  bedqueen,
  bedcouple,
  ringbox,
  weddingarch,
  suitcase,
  sofacheap,
  sofaluxe,
  armchaircheap,
  recliner,
  chairfold,
  chair: chairvinyl,
  chairhigh,
  tablefold,
  table,
  tablemarble,
  showercheap,
  showerluxe,
  toiletcheap,
  toiletluxe,
  fridgecheap,
  fridgeluxe,
  stovecheap,
  stoveluxe,
  tvcheap,
  tvbig,
  radio,
  jukebox,
  bookcrate,
  bookcase,
  lampcheap,
  lamptiffany,
  chessboard,
  cardtable,
  videogame,
  hottub,
  keyboard,
  piano,
  telescope,
  punchbag,
  shelf,
  mirror,
};
