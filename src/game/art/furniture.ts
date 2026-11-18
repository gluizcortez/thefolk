import * as THREE from 'three';
import { ball, box, colorMat, cyl, fronted, lathe, rbox, rod, setShadows, texMat, tileUV } from './build';
import { PAL, mix, seeded, shade } from './palette';
import { FURNITURE4 } from './furniture4';
import { REWARD_ART } from './rewards';
import { DOWNTOWN_ART } from './downtown';
import { KID_ART } from './kids';
import { YARD_ART, livingPot } from './yard';
import { PERIL_ART } from './peril';
import type { PlantState } from '../../sim';
import { getTexture } from './textures';

// Modelos 3D dos objetos. As formas são arredondadas, com esmalte, vinil e
// cromados brilhantes, e os detalhes miúdos (portas, livros, botões) vão
// pintados nas texturas. Os modelos são centrados na base do objeto e têm a
// frente virada para +z (sul); `facing: 'E'` gira a frente para o leste.
// A simulação não conhece nada disto: a ligação é só o id `art` do objeto.

export interface Anchor {
  x: number;
  y: number;
  z: number;
  heading: number;
}

export interface TickInfo {
  time: number;
  /** id da interação em uso, se houver um folk usando o objeto */
  using?: string;
  /** 0 de dia, 1 no meio da noite */
  night: number;
  /** bloco 3: a luminária está acesa */
  lit?: boolean;
  /** bloco 9: telefone tocando */
  ringing?: boolean;
  /** plano 2, bloco 4: canal ligado na TV (sem isso, desligada) */
  channel?: string;
  /** bloco 9: porções na mesa de petiscos */
  stock?: number;
  /** bloco 13: estado da planta viva */
  plant?: PlantState;
  /** bloco 14: alarme disparado (fumaça ou gatuno) */
  alarm?: boolean;
}

export interface FurnitureModel {
  group: THREE.Group;
  tick?(info: TickInfo): void;
}

export interface FurnitureSpec {
  /** `paint` = cor escolhida na compra (bloco 4), quando o objeto tem cores */
  build(seed: number, paint?: number): FurnitureModel;
  facing?: 'S' | 'E';
  /** onde o folk senta, deita ou fica quando está "em cima" do objeto */
  sit?: Anchor[];
  lie?: Anchor;
  /** bloco 4: cama de dois lugares (um lugar por vaga) */
  lies?: Anchor[];
  stand?: Anchor;
}

export const chrome = () => texMat('chrome', { gloss: 1 });
export const porcelain = () => colorMat(PAL.porcelain, { gloss: 0.8 });
export const enamelMat = () => texMat('enamel', { gloss: 0.6 });

export function group(...parts: THREE.Object3D[]): THREE.Group {
  const g = new THREE.Group();
  if (parts.length) g.add(...parts);
  return g;
}

export function feet(w: number, d: number, h: number, mat: THREE.Material, r = 0.03): THREE.Mesh[] {
  const out: THREE.Mesh[] = [];
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) out.push(cyl(r, r * 0.8, h, 8, mat, (sx * (w - r * 2)) / 2, 0, (sz * (d - r * 2)) / 2));
  return out;
}

// ---------- cozinha ----------

export const fridge: FurnitureSpec = {
  build() {
    const g = group(
      rbox(0.8, 1.78, 0.68, 0.05, colorMat(PAL.enamel, { gloss: 0.6 }), 0, 0.02, -0.06),
      box(0.74, 1.7, 0.03, fronted(enamelMat(), texMat('fridgeFront', { gloss: 0.6 })), 0, 0.06, 0.275),
      box(0.8, 0.03, 0.64, colorMat(0x26262b), 0, 0, -0.06),
      rod([0.27, 1.34, 0.33], [0.27, 1.66, 0.33], 0.016, chrome()),
      rod([0.27, 0.62, 0.33], [0.27, 1.18, 0.33], 0.016, chrome()),
    );
    for (const y of [1.36, 1.64, 0.64, 1.16]) g.add(rod([0.27, y, 0.29], [0.27, y, 0.335], 0.012, chrome()));
    return { group: g };
  },
};

export const stove: FurnitureSpec = {
  build() {
    const side = enamelMat();
    const steel = colorMat(0x3a3d42, { gloss: 0.7 });
    const g = group(
      box(0.82, 0.04, 0.6, colorMat(0x26262b), 0, 0, -0.1),
      box(0.84, 0.86, 0.66, [side, side, texMat('stoveTop', { gloss: 0.5 }), side, texMat('stoveFront', { gloss: 0.6 }), side], 0, 0.04, -0.08),
      // painel traseiro
      box(0.84, 0.2, 0.06, colorMat(PAL.enamel, { gloss: 0.6 }), 0, 0.9, -0.38),
      box(0.3, 0.09, 0.02, colorMat(0x1b1c20, { gloss: 0.5 }), 0, 0.96, -0.345),
      // puxador do forno
      rod([-0.3, 0.72, 0.29], [0.3, 0.72, 0.29], 0.016, chrome()),
      rod([-0.26, 0.72, 0.25], [-0.26, 0.72, 0.29], 0.011, chrome()),
      rod([0.26, 0.72, 0.25], [0.26, 0.72, 0.29], 0.011, chrome()),
      // panela e chaleira
      cyl(0.105, 0.095, 0.09, 14, steel, 0.19, 0.9, -0.24),
      cyl(0.11, 0.11, 0.012, 14, colorMat(0x5b6066, { gloss: 0.8 }), 0.19, 0.99, -0.24),
      ball(0.02, 0.015, 0.02, colorMat(0x1b1c20), 0.19, 1.012, -0.24, 8),
      rod([0.28, 0.96, -0.24], [0.4, 0.97, -0.24], 0.012, colorMat(0x1b1c20)),
      ball(0.085, 0.07, 0.085, colorMat(PAL.vinyl, { gloss: 0.8 }), -0.19, 0.965, 0.06, 12),
      rod([-0.12, 0.98, 0.06], [-0.06, 1.03, 0.06], 0.012, colorMat(PAL.vinyl, { gloss: 0.8 })),
      cyl(0.02, 0.025, 0.02, 8, colorMat(0x1b1c20), -0.19, 1.03, 0.06),
    );
    return { group: g };
  },
};

const counter: FurnitureSpec = {
  build(seed) {
    const body = colorMat(shade(PAL.cabinet, 0.9));
    const g = group(
      box(0.96, 0.05, 0.56, colorMat(0x1d1b19), 0, 0, -0.14),
      box(1.0, 0.82, 0.62, fronted(body, texMat('counterFront', { gloss: 0.3 })), 0, 0.05, -0.12),
      rbox(1.02, 0.05, 0.68, 0.02, texMat('laminate', { gloss: 0.5 }), 0, 0.87, -0.1),
      box(1.0, 0.1, 0.03, texMat('laminate', { gloss: 0.5 }), 0, 0.92, -0.42),
      // tábua, pão e fruteira
      rbox(0.3, 0.025, 0.2, 0.01, texMat('pine'), -0.25, 0.92, -0.02),
      rbox(0.16, 0.07, 0.09, 0.035, colorMat(0xc98a4a), -0.25, 0.945, -0.02),
      lathe(
        [
          [0.05, 0],
          [0.07, 0.01],
          [0.13, 0.06],
          [0.135, 0.07],
        ],
        14,
        colorMat(0xf1ecdc, { gloss: 0.8, doubleSide: true }),
        0.24,
        0.92,
        -0.14,
      ),
    );
    const rnd = seeded(seed + 11);
    const fruit = [0xc9382f, 0xe8b830, 0xe07a2c, 0x6aa846];
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + rnd();
      g.add(ball(0.04, 0.04, 0.04, colorMat(fruit[i], { gloss: 0.5 }), 0.24 + Math.cos(a) * 0.05, 1.0 + (i === 3 ? 0.04 : 0), -0.14 + Math.sin(a) * 0.05, 8));
    }
    return { group: g };
  },
};

/** Cadeira de cozinha de tubo cromado e assento de vinil, com a frente para +z. */
export function chair(vinyl: THREE.Material): THREE.Group {
  const m = chrome();
  const g = group(
    rbox(0.4, 0.07, 0.4, 0.03, vinyl, 0, 0.4, 0),
    rbox(0.38, 0.26, 0.05, 0.025, vinyl, 0, 0.7, -0.2),
  );
  for (const sx of [-1, 1]) {
    g.add(
      rod([sx * 0.17, 0.42, 0.17], [sx * 0.2, 0, 0.21], 0.014, m),
      rod([sx * 0.17, 0.42, -0.17], [sx * 0.2, 0, -0.23], 0.014, m),
      rod([sx * 0.17, 0.44, -0.19], [sx * 0.17, 0.92, -0.215], 0.014, m),
    );
  }
  g.add(rod([-0.19, 0.2, 0.19], [0.19, 0.2, 0.19], 0.01, m));
  return g;
}

const dinette: FurnitureSpec = {
  sit: [
    { x: -1.08, y: 0.47, z: 0, heading: Math.PI / 2 },
    { x: 1.08, y: 0.47, z: 0, heading: -Math.PI / 2 },
  ],
  build() {
    const vinyl = colorMat(PAL.vinyl, { gloss: 0.7 });
    const top = texMat('laminate', { gloss: 0.6, color: 0xbfe0d6 });
    const west = chair(vinyl);
    west.position.x = -1.0;
    west.rotation.y = Math.PI / 2;
    const east = chair(vinyl);
    east.position.x = 1.0;
    east.rotation.y = -Math.PI / 2;
    const g = group(
      west,
      east,
      // mesa redonda de fórmica com aro e pé cromados
      cyl(0.56, 0.56, 0.035, 24, [chrome(), top, top], 0, 0.725, 0),
      lathe(
        [
          [0.3, 0],
          [0.3, 0.02],
          [0.06, 0.06],
          [0.04, 0.1],
          [0.04, 0.66],
          [0.12, 0.72],
        ],
        14,
        chrome(),
      ),
      // jarro de flores, pratos e copos
      lathe(
        [
          [0.035, 0],
          [0.06, 0.05],
          [0.04, 0.13],
          [0.025, 0.17],
          [0.035, 0.19],
        ],
        12,
        colorMat(0x2c55a6, { gloss: 0.8 }),
        0,
        0.76,
        0,
      ),
    );
    const blooms = [0xf2c744, 0xd9483f, 0xf3efe2];
    blooms.forEach((col, i) => {
      const a = i * 2.1;
      g.add(rod([0, 0.94, 0], [Math.cos(a) * 0.06, 1.08, Math.sin(a) * 0.06], 0.006, colorMat(0x3f7a2e)));
      g.add(ball(0.035, 0.03, 0.035, colorMat(col), Math.cos(a) * 0.06, 1.09, Math.sin(a) * 0.06, 8));
    });
    for (const sx of [-1, 1]) {
      g.add(
        cyl(0.11, 0.07, 0.015, 14, colorMat(0xf4f2ea, { gloss: 0.8 }), sx * 0.32, 0.76, 0),
        cyl(0.03, 0.025, 0.07, 10, colorMat(0xd8ecf2, { gloss: 0.9, opacity: 0.75 }), sx * 0.3, 0.76, -0.17),
      );
    }
    return { group: g };
  },
};

// ---------- quarto ----------

const MATTRESS_TOP = 0.5;

const bed: FurnitureSpec = {
  lie: { x: 0, y: MATTRESS_TOP + 0.11, z: 0.9, heading: 0 },
  build(_seed, paint) {
    const wood = texMat('walnut', { gloss: 0.3 });
    const white = colorMat(0xf4f1e6);
    const duvet = tileUV(box(0.9, 0.08, 1.24, texMat('duvet', paint ? { color: mix(0xffffff, paint, 0.7) } : {}), 0, MATTRESS_TOP, 0.3), 1.5, 2);
    const g = group(
      ...feet(0.9, 1.9, 0.14, wood, 0.04),
      box(0.92, 0.16, 1.92, wood, 0, 0.12, 0),
      rbox(0.96, 1.02, 0.09, 0.03, wood, 0, 0, -0.95),
      rbox(1.0, 0.07, 0.13, 0.03, wood, 0, 0.98, -0.95),
      rbox(0.96, 0.52, 0.07, 0.03, wood, 0, 0, 0.95),
      rbox(0.86, 0.24, 1.82, 0.07, white, 0, 0.27, 0),
      rbox(0.6, 0.13, 0.34, 0.06, white, 0, MATTRESS_TOP - 0.02, -0.68),
      duvet,
      rbox(0.9, 0.09, 0.16, 0.04, white, 0, MATTRESS_TOP, -0.33),
    );
    let raised = 1;
    return {
      group: g,
      tick({ using }) {
        // com alguém dormindo, o edredom sobe e cobre o corpo
        const target = using ? 3.6 : 1;
        raised += (target - raised) * 0.2;
        duvet.scale.y = raised;
        duvet.position.y = MATTRESS_TOP + 0.04 * raised;
      },
    };
  },
};

// ---------- banheiro ----------

export const shower: FurnitureSpec = {
  stand: { x: 0, y: 0.06, z: 0, heading: 0 },
  build(seed) {
    const glass = colorMat(PAL.glass, { opacity: 0.25, unique: true, gloss: 0.8 });
    const m = chrome();
    const g = group(rbox(0.92, 0.07, 0.92, 0.03, porcelain()));
    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) g.add(rod([sx * 0.43, 0.06, sz * 0.43], [sx * 0.43, 2.06, sz * 0.43], 0.02, m));
      g.add(rod([sx * 0.43, 2.05, -0.43], [sx * 0.43, 2.05, 0.43], 0.02, m));
      g.add(rod([-0.43, 2.05, sx * 0.43], [0.43, 2.05, sx * 0.43], 0.02, m));
      g.add(box(0.012, 1.96, 0.84, glass, sx * 0.43, 0.07, 0));
      g.add(box(0.84, 1.96, 0.012, glass, 0, 0.07, sx * 0.43));
    }
    g.add(
      rod([-0.36, 0.07, -0.36], [-0.36, 1.96, -0.36], 0.016, m),
      rod([-0.36, 1.96, -0.36], [-0.22, 1.92, -0.22], 0.014, m),
      cyl(0.04, 0.1, 0.06, 12, m, -0.2, 1.85, -0.2),
      cyl(0.05, 0.05, 0.012, 10, colorMat(0x8d979c, { gloss: 0.8 }), 0, 0.07, 0),
      ball(0.03, 0.03, 0.03, m, -0.36, 1.1, -0.33, 8),
    );

    // gotas: riscos finos que caem em laço enquanto alguém toma banho
    const rnd = seeded(seed + 5);
    const dropMat = new THREE.MeshBasicMaterial({ color: PAL.water, transparent: true, opacity: 0.8 });
    const drops: { mesh: THREE.Mesh; phase: number }[] = [];
    for (let i = 0; i < 18; i++) {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.13, 0.012), dropMat);
      mesh.position.set(-0.12 + (rnd() - 0.5) * 0.5, 1, -0.12 + (rnd() - 0.5) * 0.5);
      mesh.visible = false;
      g.add(mesh);
      drops.push({ mesh, phase: rnd() });
    }
    let steam = 0;
    return {
      group: g,
      tick({ time, using }) {
        // o vidro embaça durante o banho (e esconde quem está lá dentro)
        steam += ((using ? 1 : 0) - steam) * 0.12;
        glass.opacity = 0.25 + steam * 0.6;
        glass.color.setHex(PAL.glass).lerp(new THREE.Color(0xffffff), steam * 0.8);
        for (const d of drops) {
          d.mesh.visible = !!using;
          const k = (time * 1.6 + d.phase) % 1;
          d.mesh.position.y = 1.8 - k * 1.7;
        }
      },
    };
  },
};

export const toilet: FurnitureSpec = {
  sit: [{ x: 0, y: 0.45, z: 0.02, heading: 0 }],
  build() {
    const p = porcelain();
    const bowl = lathe(
      [
        [0.11, 0],
        [0.135, 0.03],
        [0.12, 0.2],
        [0.19, 0.36],
        [0.215, 0.41],
        [0.19, 0.425],
      ],
      16,
      p,
      0,
      0,
      0.08,
    );
    bowl.scale.z = 1.18;
    const seat = new THREE.Mesh(new THREE.TorusGeometry(0.165, 0.04, 8, 18), p);
    seat.rotation.x = Math.PI / 2;
    seat.scale.set(1, 1.18, 0.5);
    seat.position.set(0, 0.435, 0.08);
    const lid = rbox(0.38, 0.44, 0.035, 0.017, p, 0, 0.44, -0.2);
    lid.rotation.x = -0.12;
    const g = group(
      bowl,
      seat,
      lid,
      cyl(0.14, 0.14, 0.01, 12, colorMat(PAL.water, { gloss: 0.9 }), 0, 0.36, 0.09),
      rbox(0.3, 0.42, 0.16, 0.04, p, 0, 0, -0.3),
      rbox(0.5, 0.4, 0.2, 0.045, p, 0, 0.42, -0.33),
      rbox(0.54, 0.05, 0.24, 0.02, p, 0, 0.81, -0.33),
      rod([0.2, 0.74, -0.22], [0.2, 0.74, -0.19], 0.014, chrome()),
      rod([0.2, 0.74, -0.19], [0.12, 0.72, -0.19], 0.012, chrome()),
    );
    return { group: g };
  },
};

const sink: FurnitureSpec = {
  facing: 'E',
  build() {
    const white = colorMat(0xe6e2d4);
    const m = chrome();
    const g = group(
      box(0.76, 0.06, 0.44, colorMat(PAL.plastic), 0, 0, -0.15),
      box(0.8, 0.8, 0.5, fronted(white, texMat('doorsWhite', { gloss: 0.3 })), 0, 0.06, -0.15),
      rbox(0.86, 0.06, 0.58, 0.02, texMat('laminate', { gloss: 0.6, color: 0xf2f2ee }), 0, 0.86, -0.13),
      // cuba
      lathe(
        [
          [0.03, 0.0],
          [0.13, 0.02],
          [0.185, 0.07],
          [0.2, 0.075],
        ],
        16,
        colorMat(PAL.porcelain, { gloss: 0.8, doubleSide: true }),
        0,
        0.86,
        -0.1,
      ),
      cyl(0.12, 0.12, 0.008, 12, colorMat(PAL.water, { gloss: 0.9 }), 0, 0.895, -0.1),
      // torneira
      rod([0, 0.92, -0.34], [0, 1.08, -0.34], 0.016, m),
      rod([0, 1.08, -0.34], [0, 1.06, -0.2], 0.014, m),
      ball(0.022, 0.022, 0.022, m, -0.09, 0.95, -0.34, 8),
      ball(0.022, 0.022, 0.022, m, 0.09, 0.95, -0.34, 8),
      // espelho com moldura e miudezas
      box(0.8, 0.98, 0.05, fronted(colorMat(0xf1ecdc), texMat('mirror', { gloss: 0.9 })), 0, 0.96, -0.415),
      rbox(0.1, 0.035, 0.065, 0.015, colorMat(0xf2a7b5, { gloss: 0.5 }), 0.3, 0.92, -0.02),
      cyl(0.03, 0.026, 0.09, 10, colorMat(0x5fb4c9, { gloss: 0.7 }), -0.31, 0.92, -0.3),
      rod([-0.31, 1.0, -0.3], [-0.29, 1.09, -0.3], 0.006, colorMat(0xd9483f)),
    );
    return { group: g };
  },
};

// ---------- sala ----------

const sofa: FurnitureSpec = {
  sit: [
    { x: -0.4, y: 0.43, z: 0.06, heading: 0 },
    { x: 0.4, y: 0.43, z: 0.06, heading: 0 },
  ],
  build(_seed, paint) {
    const fab = texMat('fabric', { color: paint ?? PAL.sofa });
    const light = texMat('fabric', { color: shade(paint ?? PAL.sofa, 1.2) });
    const wood = texMat('walnut');
    const g = group(
      ...feet(1.8, 0.78, 0.1, wood, 0.035),
      rbox(1.92, 0.24, 0.84, 0.05, fab, 0, 0.08, 0.0),
      rbox(1.92, 0.7, 0.24, 0.09, fab, 0, 0.18, -0.34),
    );
    for (const sx of [-1, 1]) {
      g.add(rbox(0.24, 0.52, 0.86, 0.11, fab, sx * 0.86, 0.14, 0.0));
      g.add(rbox(0.74, 0.16, 0.6, 0.06, light, sx * 0.37, 0.28, 0.1));
      const back = rbox(0.72, 0.42, 0.18, 0.07, light, sx * 0.37, 0.42, -0.22);
      back.rotation.x = -0.14;
      g.add(back);
    }
    const pillow = rbox(0.3, 0.3, 0.11, 0.05, texMat('fabric', { color: PAL.duvet }), -0.56, 0.44, -0.06);
    pillow.rotation.set(-0.3, 0.3, 0.15);
    g.add(pillow);
    return { group: g };
  },
};

/** Plano 2, bloco 4: quadros de cada canal (dois por canal, alternando). */
const TV_FRAMES: Record<string, string[]> = {
  drama: ['tvDrama0', 'tvDrama1'],
  sport: ['tvSport0', 'tvSport1'],
  cook: ['tvCook0', 'tvCook1'],
  toon: ['tvToon0', 'tvToon1'],
};

/** O que aparece na tela: o canal ligado, ou a imagem antiga quando alguém usa sem canal; null = desligada. */
export function tvPicture(time: number, using: string | undefined, channel: string | undefined): THREE.Texture | null {
  const frames = channel ? TV_FRAMES[channel] : undefined;
  if (frames) return getTexture(frames[Math.floor(time / 1.4) % frames.length]);
  if (!using) return null;
  const old = ['tvOn0', 'tvOn1', 'tvOn2'];
  return getTexture(old[Math.floor(time / 3) % old.length]);
}

export const tv: FurnitureSpec = {
  facing: 'E',
  build() {
    const oak = texMat('oak', { gloss: 0.3 });
    const plastic = colorMat(PAL.plastic, { gloss: 0.5 });
    const off = getTexture('tvOff');
    const screen = new THREE.MeshPhongMaterial({
      map: off,
      emissive: 0xffffff,
      emissiveMap: off,
      emissiveIntensity: 0,
      specular: 0x555555,
      shininess: 50,
    });
    const g = group(
      ...feet(0.86, 0.46, 0.06, colorMat(PAL.walnut), 0.03),
      box(0.92, 0.5, 0.52, fronted(oak, texMat('doorsOak', { gloss: 0.3 })), 0, 0.06, -0.05),
      rbox(0.96, 0.04, 0.56, 0.015, oak, 0, 0.56, -0.05),
      rbox(0.76, 0.6, 0.3, 0.05, plastic, 0, 0.6, 0.02),
      box(0.72, 0.56, 0.02, fronted(plastic, screen), 0, 0.62, 0.17),
      rbox(0.54, 0.46, 0.26, 0.08, plastic, 0, 0.64, -0.2),
      cyl(0.05, 0.06, 0.03, 10, plastic, 0, 1.2, -0.08),
      rod([0, 1.22, -0.08], [-0.22, 1.6, -0.12], 0.008, chrome(), 6),
      rod([0, 1.22, -0.08], [0.2, 1.62, -0.12], 0.008, chrome(), 6),
    );
    return {
      group: g,
      tick({ time, using, channel }) {
        const map = tvPicture(time, using, channel) ?? off;
        if (screen.map !== map) {
          screen.map = map;
          screen.emissiveMap = map;
        }
        screen.emissiveIntensity = map !== off ? 0.75 + Math.sin(time * 23) * 0.06 : 0;
      },
    };
  },
};

const bookshelf: FurnitureSpec = {
  build() {
    const oak = texMat('oak', { gloss: 0.25 });
    const g = group(
      box(1.9, 2.0, 0.4, fronted(oak, texMat('books')), 0, 0, -0.27),
      rbox(1.98, 0.07, 0.46, 0.02, oak, 0, 2.0, -0.27),
      box(1.94, 0.08, 0.43, oak, 0, 0, -0.27),
      // enfeites em cima
      lathe(
        [
          [0.05, 0],
          [0.09, 0.08],
          [0.05, 0.2],
          [0.06, 0.24],
        ],
        12,
        colorMat(0x3f9a8f, { gloss: 0.8 }),
        -0.6,
        2.07,
        -0.27,
      ),
      rbox(0.28, 0.06, 0.2, 0.01, colorMat(0xc9382f), 0.5, 2.07, -0.27),
      rbox(0.24, 0.05, 0.18, 0.01, colorMat(0xe8b830), 0.52, 2.13, -0.27),
    );
    return { group: g };
  },
};

const phone: FurnitureSpec = {
  build() {
    const wood = texMat('oak', { gloss: 0.4 });
    const red = colorMat(PAL.phone, { gloss: 0.7 });
    const g = group(
      lathe(
        [
          [0.2, 0],
          [0.2, 0.02],
          [0.05, 0.06],
          [0.035, 0.12],
          [0.035, 0.6],
          [0.1, 0.66],
        ],
        14,
        wood,
      ),
      cyl(0.31, 0.31, 0.045, 20, wood, 0, 0.66, 0),
      // aparelho: base, disco e fone
      rbox(0.24, 0.08, 0.2, 0.035, red, 0, 0.705, 0),
      cyl(0.055, 0.055, 0.012, 12, colorMat(PAL.linen, { gloss: 0.5 }), 0, 0.785, 0.03),
    );
    const handset = group(
      rod([-0.13, 0.82, -0.05], [0.13, 0.82, -0.05], 0.022, red),
      ball(0.045, 0.04, 0.045, red, -0.13, 0.8, -0.05, 8),
      ball(0.045, 0.04, 0.045, red, 0.13, 0.8, -0.05, 8),
    );
    g.add(handset);
    return {
      group: g,
      tick({ using, ringing, time }) {
        // durante a ligação o fone está na mão do folk
        handset.visible = !using;
        // bloco 9: tocando, o fone pula no gancho
        const hop = ringing && !using && Math.sin(time * 40) > 0 && time % 1.2 < 0.7;
        handset.position.y = hop ? 0.025 : 0;
        handset.rotation.z = hop ? Math.sin(time * 70) * 0.08 : 0;
      },
    };
  },
};

const speaker: FurnitureSpec = {
  build() {
    const wood = texMat('walnut', { gloss: 0.3 });
    const tower = box(0.5, 1.05, 0.44, fronted(wood, texMat('speakerFront')), 0, 0.04, 0);
    const deck = box(0.44, 0.1, 0.36, fronted(colorMat(0x2f2e33, { gloss: 0.5 }), texMat('deckFront')), 0, 1.09, 0);
    const g = group(...feet(0.46, 0.4, 0.04, colorMat(PAL.plastic), 0.03), tower, deck);
    return {
      group: g,
      tick({ time, using }) {
        // a caixa "pulsa" com a música
        const beat = using ? 1 + Math.max(0, Math.sin(time * 16)) * 0.025 : 1;
        tower.scale.set(beat, 1, beat);
      },
    };
  },
};

const plant: FurnitureSpec = {
  build(seed) {
    const pot = colorMat(PAL.clay, { gloss: 0.2 });
    const leavesMat = texMat('leaves', { alphaTest: 0.5, doubleSide: true });
    const g = group(
      cyl(0.23, 0.21, 0.025, 14, colorMat(shade(PAL.clay, 0.75))),
      lathe(
        [
          [0.15, 0],
          [0.16, 0.02],
          [0.21, 0.32],
          [0.235, 0.33],
          [0.235, 0.38],
          [0.2, 0.38],
        ],
        14,
        pot,
        0,
        0.025,
        0,
      ),
      cyl(0.2, 0.2, 0.01, 12, colorMat(PAL.soil), 0, 0.385, 0),
      cyl(0.02, 0.035, 0.7, 6, texMat('bark'), 0, 0.38, 0),
    );
    // folhagem: planos cruzados com a textura de folhas, técnica da época
    for (let i = 0; i < 4; i++) {
      const card = new THREE.Mesh(new THREE.PlaneGeometry(1.25, 1.25), leavesMat);
      card.position.y = 1.02;
      card.rotation.y = (i * Math.PI) / 4 + seed * 0.7;
      g.add(card);
    }
    return { group: g };
  },
};

const lamp: FurnitureSpec = {
  build() {
    const brass = colorMat(PAL.brass, { gloss: 0.9 });
    const shadeMat = texMat('lampShade', { doubleSide: true, emissive: 0xffd98a, emissiveIntensity: 0.2, unique: true });
    const light = new THREE.PointLight(0xffd9a0, 0, 7, 1.6);
    light.position.y = 1.42;
    const g = group(
      lathe(
        [
          [0.17, 0],
          [0.17, 0.02],
          [0.06, 0.05],
          [0.022, 0.09],
        ],
        14,
        brass,
      ),
      rod([0, 0.08, 0], [0, 1.36, 0], 0.016, brass),
      ball(0.03, 0.03, 0.03, brass, 0, 0.7, 0, 8),
      cyl(0.13, 0.27, 0.34, 16, shadeMat, 0, 1.28, 0, true),
      light,
    );
    return {
      group: g,
      tick({ night, lit }) {
        shadeMat.emissiveIntensity = lit ? 0.45 + night * 0.55 : 0.08;
        light.intensity = lit ? 1.5 + night * 4.5 : 0;
      },
    };
  },
};


// ---------- catálogo da fatia 2 ----------

const armchair: FurnitureSpec = {
  sit: [{ x: 0, y: 0.43, z: 0.05, heading: 0 }],
  build(_seed, paint) {
    const fab = texMat('fabric', { color: paint ? shade(paint, 0.85) : 0x9c3b2c });
    const light = texMat('fabric', { color: paint ?? 0xbb5640 });
    const wood = texMat('walnut', { gloss: 0.3 });
    const g = group(
      ...feet(0.7, 0.66, 0.12, wood, 0.03),
      rbox(0.8, 0.22, 0.78, 0.05, fab, 0, 0.1, 0),
      rbox(0.8, 0.76, 0.2, 0.08, fab, 0, 0.18, -0.3),
      rbox(0.56, 0.15, 0.56, 0.06, light, 0, 0.29, 0.08),
    );
    for (const sx of [-1, 1]) g.add(rbox(0.13, 0.48, 0.76, 0.06, fab, sx * 0.34, 0.14, 0.0));
    const back = rbox(0.54, 0.4, 0.15, 0.06, light, 0, 0.42, -0.18);
    back.rotation.x = -0.15;
    g.add(back);
    // capinha de crochê no encosto
    g.add(box(0.3, 0.12, 0.012, colorMat(0xf1ead6), 0, 0.8, -0.205));
    return { group: g };
  },
};

const desk: FurnitureSpec = {
  sit: [{ x: 0, y: 0.47, z: 0.34, heading: Math.PI }],
  build() {
    const oak = texMat('oak', { gloss: 0.35 });
    const drawers = fronted(oak, texMat('counterFront', { color: 0xd8b07a, gloss: 0.3 }));
    const seat = chair(colorMat(0x2f6f73, { gloss: 0.7 }));
    seat.position.set(0, 0, 0.36);
    seat.rotation.y = Math.PI;
    const g = group(
      seat,
      rbox(1.5, 0.05, 0.6, 0.02, oak, 0, 0.72, -0.16),
      box(0.42, 0.68, 0.54, drawers, 0.5, 0.04, -0.16),
      box(0.05, 0.72, 0.54, oak, -0.7, 0, -0.16),
      box(1.3, 0.3, 0.02, oak, -0.05, 0.42, -0.42),
      // luminária de braço, mata-borrão, papéis e uma caneca
      lathe(
        [
          [0.08, 0],
          [0.08, 0.02],
          [0.02, 0.04],
        ],
        12,
        colorMat(0x2a7a4a, { gloss: 0.7 }),
        -0.52,
        0.77,
        -0.32,
      ),
      rod([-0.52, 0.8, -0.32], [-0.46, 1.08, -0.28], 0.012, chrome()),
      rod([-0.46, 1.08, -0.28], [-0.34, 1.0, -0.14], 0.012, chrome()),
      cyl(0.05, 0.09, 0.09, 12, colorMat(0x2a7a4a, { gloss: 0.7, doubleSide: true }), -0.32, 0.92, -0.12, true),
      box(0.5, 0.008, 0.32, colorMat(0x3c6b45), 0.02, 0.77, -0.1),
      box(0.2, 0.006, 0.28, colorMat(0xf4efe0), 0.05, 0.778, -0.08),
      cyl(0.035, 0.035, 0.09, 10, colorMat(0xe8b830, { gloss: 0.6 }), 0.42, 0.77, -0.3),
    );
    const pencil = rod([0.2, 0.785, -0.02], [0.32, 0.785, 0.02], 0.006, colorMat(0xe8b830));
    g.add(pencil);
    return { group: g };
  },
};

const easel: FurnitureSpec = {
  build(seed) {
    const pine = texMat('pine', { gloss: 0.2 });
    const canvas = colorMat(0xf6f0e0);
    const g = group(
      rod([-0.28, 0, 0.12], [-0.06, 1.7, -0.05], 0.022, pine, 6),
      rod([0.28, 0, 0.12], [0.06, 1.7, -0.05], 0.022, pine, 6),
      rod([0, 0, -0.42], [0, 1.6, -0.06], 0.02, pine, 6),
      box(0.66, 0.04, 0.08, pine, 0, 0.66, 0.04),
      box(0.62, 0.5, 0.03, canvas, 0, 0.7, 0.02),
      // banquinho com paleta e potes de tinta
      cyl(0.16, 0.16, 0.035, 12, pine, 0.42, 0.44, 0.22),
      rod([0.32, 0, 0.12], [0.36, 0.44, 0.18], 0.014, pine, 6),
      rod([0.52, 0, 0.12], [0.48, 0.44, 0.18], 0.014, pine, 6),
      rod([0.42, 0, 0.36], [0.42, 0.44, 0.26], 0.014, pine, 6),
    );
    // pinceladas no quadro: cada cavalete tem a sua pintura
    const rnd = seeded(seed + 7);
    const paints = [0xc9382f, 0x2c55a6, 0xe8b830, 0x3f9455, 0xe07a2c, 0x7d55ad];
    const strokes: THREE.Mesh[] = [];
    for (let i = 0; i < 9; i++) {
      const w = 0.08 + rnd() * 0.22;
      const m = box(w, 0.04 + rnd() * 0.12, 0.006, colorMat(paints[Math.floor(rnd() * paints.length)]), (rnd() - 0.5) * (0.56 - w), 0.73 + rnd() * 0.36, 0.037);
      strokes.push(m);
      g.add(m);
    }
    for (let i = 0; i < 3; i++) g.add(cyl(0.03, 0.03, 0.05, 8, colorMat(paints[i], { gloss: 0.6 }), 0.36 + i * 0.06, 0.475, 0.2 + (i % 2) * 0.05));
    return {
      group: g,
      tick({ time, using }) {
        // enquanto alguém pinta, as manchas mudam devagar de tamanho
        strokes.forEach((m, i) => {
          const k = using ? 1 + Math.sin(time * 1.3 + i * 1.7) * 0.18 : 1;
          m.scale.set(k, 1, 1);
        });
      },
    };
  },
};

const recorder: FurnitureSpec = {
  build() {
    const teak = texMat('walnut', { gloss: 0.35 });
    const body = colorMat(0x8a8577, { gloss: 0.6 });
    const reelMat = colorMat(0xd9d4c6, { gloss: 0.8 });
    const tape = colorMat(0x4a3324, { gloss: 0.4 });
    const reels: THREE.Group[] = [];
    const g = group(
      ...feet(0.6, 0.46, 0.5, teak, 0.025),
      rbox(0.66, 0.06, 0.5, 0.02, teak, 0, 0.5, 0),
      // gravador de rolo, um pouco inclinado
      rbox(0.5, 0.12, 0.38, 0.025, body, 0, 0.56, 0),
      box(0.46, 0.012, 0.12, colorMat(0x26262b), 0, 0.68, 0.11),
      box(0.12, 0.03, 0.04, colorMat(0xc9382f, { gloss: 0.7 }), -0.14, 0.68, 0.14),
      box(0.12, 0.03, 0.04, colorMat(0xeee9da, { gloss: 0.7 }), 0.02, 0.68, 0.14),
      // microfone de mesa
      lathe(
        [
          [0.06, 0],
          [0.06, 0.015],
          [0.015, 0.03],
        ],
        10,
        chrome(),
        0.24,
        0.56,
        0.18,
      ),
      rod([0.24, 0.58, 0.18], [0.24, 0.74, 0.16], 0.008, chrome()),
      ball(0.035, 0.05, 0.035, colorMat(0x2a2a2e, { gloss: 0.8 }), 0.24, 0.78, 0.16, 10),
    );
    for (const sx of [-1, 1]) {
      const reel = group(cyl(0.11, 0.11, 0.012, 16, reelMat), cyl(0.075, 0.075, 0.02, 14, tape, 0, 0.004, 0));
      for (let i = 0; i < 3; i++) {
        const hole = box(0.03, 0.025, 0.05, colorMat(0x5b574d), 0, 0.002, 0.065);
        hole.position.applyAxisAngle(new THREE.Vector3(0, 1, 0), (i * Math.PI * 2) / 3);
        hole.rotation.y = (i * Math.PI * 2) / 3;
        reel.add(hole);
      }
      reel.position.set(sx * 0.13, 0.68, -0.05);
      reels.push(reel);
      g.add(reel);
    }
    return {
      group: g,
      tick({ time, using }) {
        if (using) reels.forEach((r, i) => (r.rotation.y = -time * (i === 0 ? 2.2 : 2.6)));
      },
    };
  },
};

const bike: FurnitureSpec = {
  sit: [{ x: 0, y: 0.62, z: 0.12, heading: 0 }],
  build() {
    const frame = colorMat(0xd03a2e, { gloss: 0.75 });
    const black = colorMat(0x1f1f23, { gloss: 0.4 });
    const crank = new THREE.Group();
    crank.position.set(0, 0.32, -0.04);
    crank.add(
      rod([-0.08, 0, 0], [-0.08, -0.12, 0], 0.012, chrome()),
      rod([0.08, 0, 0], [0.08, 0.12, 0], 0.012, chrome()),
      box(0.06, 0.02, 0.1, black, -0.11, -0.13, -0.05),
      box(0.06, 0.02, 0.1, black, 0.11, 0.11, -0.05),
    );
    const wheel = cyl(0.2, 0.2, 0.05, 18, chrome(), 0, 0, 0);
    wheel.rotation.z = Math.PI / 2;
    const fly = group(wheel);
    fly.position.set(0, 0.26, -0.3);
    const g = group(
      // base em T no chão
      rbox(0.5, 0.05, 0.08, 0.02, black, 0, 0, -0.38),
      rbox(0.5, 0.05, 0.08, 0.02, black, 0, 0, 0.32),
      rod([0, 0.04, -0.38], [0, 0.04, 0.32], 0.03, frame),
      // quadro, selim e guidão
      rod([0, 0.04, 0.12], [0, 0.56, 0.12], 0.03, frame),
      rod([0, 0.04, -0.3], [0, 0.88, -0.28], 0.03, frame),
      rod([0, 0.32, -0.04], [0, 0.5, 0.12], 0.025, frame),
      rbox(0.2, 0.06, 0.26, 0.03, black, 0, 0.56, 0.14),
      rod([-0.2, 0.92, -0.2], [0.2, 0.92, -0.2], 0.016, black),
      rod([0, 0.88, -0.28], [0, 0.92, -0.2], 0.02, frame),
      box(0.14, 0.09, 0.03, colorMat(0x2f6f73, { gloss: 0.6 }), 0, 0.9, -0.31),
      box(0.09, 0.03, 0.006, colorMat(0x9fe08a, { emissive: 0x4a8a3a }), 0, 0.92, -0.296),
      fly,
      crank,
    );
    return {
      group: g,
      tick({ time, using }) {
        if (!using) return;
        crank.rotation.x = -time * 5;
        fly.rotation.x = -time * 9;
      },
    };
  },
};

const flowers: FurnitureSpec = {
  build(seed) {
    const g = group(
      lathe(
        [
          [0.1, 0],
          [0.15, 0.08],
          [0.16, 0.22],
          [0.1, 0.4],
          [0.075, 0.5],
          [0.095, 0.56],
        ],
        14,
        colorMat(0x2f6f73, { gloss: 0.85 }),
      ),
    );
    const rnd = seeded(seed + 3);
    const cols = [0xf2c744, 0xd9483f, 0xf3efe2, 0xe07aa8, 0xe07a2c];
    for (let i = 0; i < 9; i++) {
      const a = rnd() * Math.PI * 2;
      const r = 0.05 + rnd() * 0.16;
      const top: [number, number, number] = [Math.cos(a) * r, 0.78 + rnd() * 0.32, Math.sin(a) * r];
      g.add(rod([0, 0.5, 0], top, 0.007, colorMat(0x3f7a2e), 5));
      g.add(ball(0.05, 0.035, 0.05, colorMat(cols[i % cols.length]), top[0], top[1], top[2], 8));
      if (i % 2 === 0) {
        const leaf = ball(0.05, 0.012, 0.025, colorMat(PAL.leaf), top[0] * 0.6, 0.66, top[2] * 0.6, 6);
        leaf.rotation.y = a;
        g.add(leaf);
      }
    }
    return { group: g };
  },
};

// ---------- bloco 1: casa viva ----------

const kitchensink: FurnitureSpec = {
  build() {
    const body = colorMat(shade(PAL.cabinet, 0.9));
    const steel = chrome();
    const basin = lathe(
      [
        [0.0, 0],
        [0.2, 0],
        [0.22, 0.14],
        [0.24, 0.15],
      ],
      4,
      colorMat(0xb9c0c6, { gloss: 1, doubleSide: true }),
      0,
      0.76,
      -0.12,
    );
    basin.rotation.y = Math.PI / 4;
    basin.scale.set(1.35, 1, 0.9);
    const g = group(
      box(0.96, 0.05, 0.56, colorMat(0x1d1b19), 0, 0, -0.14),
      box(1.0, 0.82, 0.62, fronted(body, texMat('counterFront', { gloss: 0.3 })), 0, 0.05, -0.12),
      // tampo com a cuba de inox no meio
      box(1.02, 0.05, 0.12, texMat('laminate', { gloss: 0.5 }), 0, 0.87, 0.18),
      box(1.02, 0.05, 0.14, texMat('laminate', { gloss: 0.5 }), 0, 0.87, -0.37),
      box(0.18, 0.05, 0.44, texMat('laminate', { gloss: 0.5 }), -0.42, 0.87, -0.12),
      box(0.18, 0.05, 0.44, texMat('laminate', { gloss: 0.5 }), 0.42, 0.87, -0.12),
      basin,
      box(1.0, 0.1, 0.03, texMat('laminate', { gloss: 0.5 }), 0, 0.92, -0.42),
      // torneira de bica alta
      cyl(0.025, 0.03, 0.05, 8, steel, 0, 0.92, -0.36),
      rod([0, 0.96, -0.36], [0, 1.16, -0.36], 0.015, steel),
      rod([0, 1.16, -0.36], [0, 1.16, -0.2], 0.015, steel),
      rod([0, 1.16, -0.2], [0, 1.1, -0.18], 0.013, steel),
      ball(0.03, 0.02, 0.03, colorMat(0xc9382f, { gloss: 0.7 }), -0.1, 0.96, -0.36, 8),
      ball(0.03, 0.02, 0.03, colorMat(0x2f7fc4, { gloss: 0.7 }), 0.1, 0.96, -0.36, 8),
      // escorredor com dois pratos e a esponja
      box(0.14, 0.012, 0.3, steel, 0.4, 0.92, -0.14),
      cyl(0.11, 0.11, 0.012, 14, colorMat(0xf4f2ea, { gloss: 0.8 }), 0.4, 1.02, -0.18),
      cyl(0.11, 0.11, 0.012, 14, colorMat(0xf4f2ea, { gloss: 0.8 }), 0.4, 1.02, -0.08),
      box(0.08, 0.03, 0.05, colorMat(0xe8b830), -0.38, 0.92, -0.3),
      box(0.08, 0.012, 0.05, colorMat(0x3f9455), -0.38, 0.95, -0.3),
    );
    const dish = g.children[g.children.length - 4];
    dish.rotation.x = Math.PI / 2 - 0.2;
    g.children[g.children.length - 3].rotation.x = Math.PI / 2 - 0.2;
    return { group: g };
  },
};

const trashcan: FurnitureSpec = {
  build() {
    const tin = colorMat(0x7d9a8a, { gloss: 0.7 });
    const lid = colorMat(0x5c7466, { gloss: 0.8 });
    const g = group(
      lathe(
        [
          [0.15, 0],
          [0.17, 0.02],
          [0.19, 0.5],
          [0.195, 0.52],
        ],
        14,
        tin,
      ),
      lathe(
        [
          [0.0, 0.62],
          [0.12, 0.61],
          [0.2, 0.55],
          [0.205, 0.52],
        ],
        14,
        lid,
      ),
      // pedal
      box(0.12, 0.025, 0.08, colorMat(0x3a3d42, { gloss: 0.7 }), 0, 0.01, 0.2),
      rod([-0.12, 0.3, 0.19], [0.12, 0.3, 0.19], 0.008, chrome(), 6),
    );
    return { group: g };
  },
};

const curbbin: FurnitureSpec = {
  build() {
    const drum = colorMat(0x3f6e4c, { gloss: 0.5 });
    const rim = colorMat(0x2c4e36, { gloss: 0.6 });
    const g = group(
      cyl(0.3, 0.27, 0.86, 16, drum),
      cyl(0.31, 0.31, 0.04, 16, rim, 0, 0.3),
      cyl(0.31, 0.31, 0.04, 16, rim, 0, 0.6),
      cyl(0.33, 0.33, 0.05, 16, rim, 0, 0.86),
      ball(0.06, 0.035, 0.06, rim, 0, 0.92, 0, 8),
      // um saco amarrado aparecendo pela tampa
      ball(0.1, 0.07, 0.1, colorMat(0x26262b, { gloss: 0.4 }), 0.12, 0.92, 0.05, 8),
    );
    return { group: g };
  },
};

// bloco 2: caixa de correio na calçada (poste de madeira, caixa de lata com
// fresta e plaquinha amarela; nada de bandeirinha)
const mailbox: FurnitureSpec = {
  build() {
    const post = texMat('pine', { color: 0x9a6a3c, gloss: 0.2 });
    const tin = colorMat(0x2f7a78, { gloss: 0.7 });
    const trim = colorMat(0x1f5553, { gloss: 0.7 });
    const g = group(
      box(0.1, 0.9, 0.1, post, 0, 0, 0),
      box(0.3, 0.04, 0.3, post, 0, 0, 0),
      rbox(0.44, 0.34, 0.3, 0.05, tin, 0, 0.86, 0),
      rbox(0.48, 0.05, 0.34, 0.02, trim, 0, 1.19, 0),
      // fresta das cartas
      box(0.26, 0.025, 0.02, colorMat(0x1a1c20), 0, 1.08, 0.152),
      // plaquinha com o número da casa
      box(0.14, 0.07, 0.01, colorMat(0xe8c43a, { gloss: 0.5 }), 0, 0.93, 0.155),
      box(0.03, 0.04, 0.012, colorMat(0x3a2a1c), -0.03, 0.945, 0.16),
      box(0.03, 0.04, 0.012, colorMat(0x3a2a1c), 0.02, 0.945, 0.16),
    );
    return { group: g };
  },
};

const workbench: FurnitureSpec = {
  build(seed) {
    const pine = texMat('pine', { gloss: 0.2 });
    const steel = colorMat(0x5b6066, { gloss: 0.8 });
    const g = group(
      rbox(1.6, 0.08, 0.62, 0.02, pine, 0, 0.82, -0.14),
      box(1.5, 0.04, 0.5, pine, 0, 0.22, -0.14),
      // quadro de ferramentas na parede de trás
      box(1.5, 0.7, 0.03, texMat('pine', { color: 0xc8a26a }), 0, 1.0, -0.44),
      // morsa na ponta
      box(0.16, 0.1, 0.14, colorMat(0x2f6f9a, { gloss: 0.7 }), 0.62, 0.9, 0.06),
      rod([0.62, 0.95, 0.13], [0.62, 0.95, 0.24], 0.012, chrome(), 6),
      // rádio aberto em conserto, com as válvulas à mostra
      rbox(0.36, 0.22, 0.2, 0.03, texMat('walnut', { gloss: 0.5 }), -0.2, 0.9, -0.2),
      box(0.3, 0.012, 0.16, colorMat(0x3c6b45), 0.2, 0.9, -0.1),
      cyl(0.02, 0.02, 0.06, 8, colorMat(0xe8c27a, { gloss: 0.9 }), 0.14, 0.91, -0.1),
      cyl(0.02, 0.02, 0.06, 8, colorMat(0xe8c27a, { gloss: 0.9 }), 0.22, 0.91, -0.12),
      // chave de fenda e martelo
      rod([-0.55, 0.875, 0.02], [-0.38, 0.875, 0.08], 0.008, steel, 6),
      rod([-0.55, 0.875, 0.02], [-0.6, 0.875, 0.0], 0.018, colorMat(0xc9382f), 6),
    );
    for (const sx of [-1, 1]) {
      g.add(box(0.06, 0.82, 0.06, pine, sx * 0.72, 0, 0.12), box(0.06, 0.82, 0.06, pine, sx * 0.72, 0, -0.4));
    }
    // ferramentas penduradas
    const rnd = seeded(seed + 5);
    const tools = [0xc9382f, 0x8d949a, 0xe8b830, 0x2f6f9a, 0x8d949a];
    tools.forEach((col, i) => {
      const x = -0.6 + i * 0.3;
      const len = 0.18 + rnd() * 0.12;
      g.add(rod([x, 1.3, -0.42], [x + (rnd() - 0.5) * 0.05, 1.3 - len, -0.42], 0.014, colorMat(col, { gloss: 0.6 }), 6));
    });
    return { group: g };
  },
};

// ---------- miudezas ----------
// Detalhes que dão vida a cada objeto. Ficam separados do modelo principal
// para ser fácil acrescentar ou tirar sem mexer na forma do móvel.

/** Peça de chão só decorativa: não bloqueia o clique no piso. */
function decor<T extends THREE.Mesh>(mesh: T): T {
  mesh.raycast = () => {};
  mesh.userData.flat = true;
  return mesh;
}

function floorRug(w: number, d: number, x: number, z: number, mat: THREE.Material): THREE.Mesh {
  return decor(box(w, 0.014, d, mat, x, 0.006, z));
}

const DETAILS: Record<string, (g: THREE.Group, seed: number) => void> = {
  fridge(g) {
    g.add(
      box(0.5, 0.02, 0.3, colorMat(0x3a3d42), 0, 1.8, -0.1),
      rbox(0.2, 0.28, 0.08, 0.01, colorMat(0xe8b830), -0.2, 1.82, -0.1),
      box(0.16, 0.1, 0.005, colorMat(0xc9382f), -0.2, 1.93, -0.058),
      lathe(
        [
          [0.07, 0],
          [0.11, 0.1],
          [0.115, 0.12],
        ],
        10,
        texMat('pine', { doubleSide: true }),
        0.18,
        1.82,
        -0.12,
      ),
      ball(0.04, 0.04, 0.04, colorMat(0xe07a2c), 0.16, 1.93, -0.12, 8),
      ball(0.04, 0.04, 0.04, colorMat(0xe8b830), 0.21, 1.94, -0.1, 8),
    );
  },
  stove(g) {
    const steel = texMat('chrome', { gloss: 1 });
    g.add(
      // coifa presa na parede
      box(0.86, 0.1, 0.52, enamelMat(), 0, 1.7, -0.15),
      box(0.86, 0.02, 0.52, steel, 0, 1.68, -0.15),
      box(0.34, 0.8, 0.26, enamelMat(), 0, 1.8, -0.28),
      box(0.2, 0.03, 0.01, colorMat(0x26262b), 0.2, 1.74, 0.112),
      // pano de prato no puxador
      box(0.16, 0.24, 0.02, colorMat(0xf4efdf), -0.12, 0.5, 0.3),
      box(0.16, 0.03, 0.022, colorMat(0xc9382f), -0.12, 0.54, 0.3),
      box(0.16, 0.03, 0.022, colorMat(0xc9382f), -0.12, 0.62, 0.3),
    );
  },
  counter(g) {
    const steel = texMat('chrome', { gloss: 1 });
    g.add(
      // torradeira com duas fatias
      rbox(0.2, 0.14, 0.12, 0.03, steel, -0.02, 0.92, -0.3),
      box(0.07, 0.05, 0.015, colorMat(0xc98a4a), -0.06, 1.04, -0.3),
      box(0.07, 0.05, 0.015, colorMat(0xc98a4a), 0.03, 1.04, -0.3),
      box(0.02, 0.03, 0.02, colorMat(0x26262b), 0.09, 0.97, -0.3),
      // cepo de facas
      rbox(0.09, 0.16, 0.1, 0.015, texMat('walnut'), 0.4, 0.92, -0.32),
    );
    for (let i = 0; i < 3; i++) g.add(rod([0.375 + i * 0.025, 1.07, -0.32], [0.375 + i * 0.025, 1.13, -0.34], 0.008, colorMat(0x26262b), 6));
  },
  dinette(g) {
    const mat = colorMat(0xd9a441);
    for (const sx of [-1, 1]) {
      const m = box(0.3, 0.004, 0.36, mat, sx * 0.32, 0.761, 0);
      g.add(m, rod([sx * 0.45, 0.768, -0.12], [sx * 0.45, 0.768, 0.1], 0.006, texMat('chrome', { gloss: 1 }), 6));
    }
    g.add(
      cyl(0.018, 0.02, 0.06, 8, colorMat(0xf4f2ea, { gloss: 0.8 }), 0.06, 0.76, 0.2),
      cyl(0.018, 0.02, 0.06, 8, colorMat(0x3a3d42, { gloss: 0.8 }), 0.11, 0.76, 0.22),
      box(0.09, 0.07, 0.03, texMat('chrome', { gloss: 1 }), -0.1, 0.76, 0.22),
      box(0.08, 0.075, 0.012, colorMat(0xf4efdf), -0.1, 0.765, 0.22),
    );
  },
  bed(g) {
    const brass = colorMat(PAL.brass, { gloss: 0.9 });
    g.add(
      ball(0.045, 0.045, 0.045, brass, -0.46, 1.08, -0.95, 10),
      ball(0.045, 0.045, 0.045, brass, 0.46, 1.08, -0.95, 10),
      ball(0.04, 0.04, 0.04, brass, -0.46, 0.55, 0.95, 10),
      ball(0.04, 0.04, 0.04, brass, 0.46, 0.55, 0.95, 10),
      // saia da cama e tapetinho ao lado
      box(0.9, 0.14, 1.86, texMat('fabric', { color: 0xc9541f }), 0, 0.02, 0),
      floorRug(0.62, 1.1, 0.84, 0.25, texMat('fabric', { color: 0xe3d2a6 })),
      decor(box(0.5, 0.014, 0.98, texMat('fabric', { color: 0xc9541f }), 0.84, 0.012, 0.25)),
    );
  },
  shower(g) {
    const steel = texMat('chrome', { gloss: 1 });
    g.add(
      box(0.26, 0.015, 0.1, steel, 0.24, 1.15, -0.37),
      cyl(0.03, 0.03, 0.14, 8, colorMat(0xd9a441, { gloss: 0.7 }), 0.16, 1.165, -0.37),
      cyl(0.026, 0.026, 0.11, 8, colorMat(0x7d55ad, { gloss: 0.7 }), 0.24, 1.165, -0.37),
      cyl(0.03, 0.02, 0.09, 8, colorMat(0x3f9455, { gloss: 0.7 }), 0.32, 1.165, -0.37),
      rbox(0.07, 0.03, 0.05, 0.012, colorMat(0xf4f2ea, { gloss: 0.5 }), -0.3, 0.07, 0.3),
    );
  },
  toilet(g) {
    const steel = texMat('chrome', { gloss: 1 });
    const roll = cyl(0.055, 0.055, 0.11, 12, colorMat(0xf7f5ee), 0.4, 0.5, 0.0);
    roll.rotation.x = Math.PI / 2;
    g.add(
      roll,
      rod([0.4, 0.555, -0.12], [0.4, 0.555, 0.12], 0.008, steel, 6),
      rod([0.4, 0.555, -0.12], [0.4, 0.7, -0.12], 0.008, steel, 6),
      box(0.004, 0.09, 0.1, colorMat(0xf7f5ee), 0.345, 0.42, 0),
      // escova
      cyl(0.05, 0.045, 0.14, 10, colorMat(0xf4f2ea, { gloss: 0.8 }), -0.36, 0, -0.3),
      rod([-0.36, 0.14, -0.3], [-0.36, 0.42, -0.3], 0.01, colorMat(0xf4f2ea), 6),
      floorRug(0.62, 0.36, 0, 0.62, texMat('fabric', { color: PAL.tileB })),
    );
  },
  sink(g) {
    const steel = texMat('chrome', { gloss: 1 });
    g.add(
      // toalha pendurada na lateral
      rod([0.415, 0.72, -0.3], [0.415, 0.72, 0.02], 0.01, steel, 6),
      box(0.02, 0.34, 0.22, texMat('fabric', { color: 0xe8b830 }), 0.425, 0.39, -0.14),
      box(0.022, 0.03, 0.22, colorMat(0xf4efdf), 0.425, 0.44, -0.14),
      // frasco de sabonete
      cyl(0.026, 0.03, 0.09, 8, colorMat(0xf2a7b5, { gloss: 0.7 }), 0.2, 0.92, -0.33),
      rod([0.2, 1.01, -0.33], [0.2, 1.05, -0.33], 0.008, steel, 6),
      rod([0.2, 1.05, -0.33], [0.2, 1.05, -0.29], 0.006, steel, 6),
    );
  },
  sofa(g) {
    const btn = colorMat(shade(PAL.sofa, 0.6));
    for (const sx of [-1, 1]) {
      for (const dx of [-0.17, 0.17]) g.add(ball(0.018, 0.018, 0.012, btn, sx * 0.37 + dx, 0.66, -0.135, 6));
      // debrum dos braços
      g.add(rod([sx * 0.86, 0.665, -0.38], [sx * 0.86, 0.665, 0.4], 0.012, btn, 6));
    }
    const pillow = rbox(0.28, 0.28, 0.1, 0.05, texMat('fabric', { color: 0xc9382f }), 0.58, 0.44, -0.04);
    pillow.rotation.set(-0.3, -0.35, -0.12);
    g.add(pillow);
  },
  tv(g) {
    const dark = colorMat(0x1b1c20, { gloss: 0.6 });
    g.add(
      // videocassete e fitas em cima do aparelho
      rbox(0.4, 0.07, 0.26, 0.01, dark, -0.12, 1.2, -0.06),
      box(0.14, 0.02, 0.005, colorMat(0x0f2a1e), -0.2, 1.225, 0.072),
      box(0.03, 0.012, 0.006, colorMat(0x4fe08a, { emissive: 0x4fe08a, emissiveIntensity: 0.6 }), -0.02, 1.228, 0.072),
      rbox(0.19, 0.03, 0.11, 0.006, colorMat(0x26262b), 0.24, 1.2, -0.06),
      rbox(0.19, 0.03, 0.11, 0.006, colorMat(0xe9e4d6), 0.25, 1.23, -0.05),
      // botões salientes
      cyl(0.022, 0.022, 0.02, 10, colorMat(0x8d949a, { gloss: 0.8 }), 0.31, 0.83, 0.185),
      cyl(0.016, 0.016, 0.02, 10, colorMat(0x8d949a, { gloss: 0.8 }), 0.31, 0.74, 0.185),
    );
    for (const m of g.children.slice(-2)) m.rotation.x = Math.PI / 2;
  },
  bookshelf(g) {
    const art = texMat('painting:1');
    const wood = colorMat(PAL.brass, { gloss: 0.6 });
    const frame = box(0.2, 0.26, 0.025, [wood, wood, wood, wood, art, wood], -0.05, 2.07, -0.24);
    frame.rotation.x = -0.15;
    g.add(frame, cyl(0.06, 0.05, 0.1, 10, colorMat(PAL.clay), 0.82, 2.07, -0.27), ball(0.09, 0.08, 0.09, texMat('treeLeaves'), 0.82, 2.22, -0.27, 8));
  },
  phone(g) {
    g.add(
      box(0.11, 0.012, 0.15, colorMat(0xf4efdf), 0.2, 0.705, 0.08),
      rod([0.16, 0.72, 0.14], [0.26, 0.72, 0.05], 0.006, colorMat(0xe8b830), 6),
    );
    // fio enrolado caindo da mesa
    let prev: [number, number, number] = [-0.12, 0.72, 0.02];
    for (let i = 1; i <= 8; i++) {
      const next: [number, number, number] = [-0.14 - i * 0.02, 0.72 - i * 0.045 * (i > 2 ? 1 : 0.2), 0.02 + (i % 2 ? 0.025 : -0.025)];
      g.add(rod(prev, next, 0.006, colorMat(shade(PAL.phone, 0.7)), 5));
      prev = next;
    }
  },
  speaker(g) {
    const sleeves = [0xc9382f, 0xe8b830, 0x2f7fc4, 0xf4efdf];
    sleeves.forEach((col, i) => {
      const lp = box(0.32, 0.32, 0.012, colorMat(col), 0.32 + i * 0.012, 0, -0.1 + i * 0.02);
      lp.rotation.set(-0.12, Math.PI / 2 - 0.2, 0);
      g.add(lp);
    });
    g.add(
      rbox(0.14, 0.02, 0.13, 0.004, colorMat(0xe9e4d6), 0.08, 1.19, 0),
      rbox(0.14, 0.02, 0.13, 0.004, colorMat(0x7d55ad), 0.085, 1.21, 0.005),
      cyl(0.02, 0.02, 0.015, 8, colorMat(0x8d949a, { gloss: 0.8 }), -0.14, 1.19, 0.1),
    );
  },
  lamp(g) {
    const brass = colorMat(PAL.brass, { gloss: 0.9 });
    g.add(cyl(0.274, 0.274, 0.025, 16, colorMat(0xb08f4f), 0, 1.27, 0, true), rod([0.05, 1.3, 0.05], [0.05, 1.1, 0.05], 0.004, brass, 4), ball(0.012, 0.012, 0.012, brass, 0.05, 1.1, 0.05, 6));
  },
  plant(g, seed) {
    // um regador ao lado de um dos vasos
    if (seed % 2 === 0) return;
    const tin = colorMat(0x5f8fa8, { gloss: 0.6 });
    g.add(cyl(0.08, 0.09, 0.16, 10, tin, 0.3, 0, 0.26), rod([0.37, 0.08, 0.26], [0.5, 0.2, 0.26], 0.014, tin, 6), rod([0.24, 0.05, 0.26], [0.2, 0.16, 0.26], 0.01, tin, 6));
  },
};


// ---------- bloco 3: luz de teto, quadros e tapetes ----------
// Quadro e relógio são desenhados pendurados na parede de trás do tile (norte
// com rot 0); a luminária de teto pende do forro; o tapete é rente ao chão.

/** z da face da parede de trás, vista do centro do tile */
export const WALL_FACE = -0.5 + 0.09;

const ceilinglamp: FurnitureSpec = {
  build() {
    const brass = colorMat(PAL.brass, { gloss: 0.9 });
    const glass = colorMat(0xf6e7c1, { emissive: 0xffe2a0, emissiveIntensity: 0.05, gloss: 0.8, doubleSide: true });
    const light = new THREE.PointLight(0xffdca8, 0, 9, 1.4);
    light.position.y = 1.9;
    const g = group(
      cyl(0.08, 0.08, 0.03, 12, brass, 0, 2.57, 0),
      rod([0, 2.57, 0], [0, 2.2, 0], 0.008, colorMat(0x2a2522), 4),
      lathe(
        [
          [0.02, 0.2],
          [0.12, 0.17],
          [0.24, 0.05],
          [0.27, 0],
        ],
        16,
        glass,
        0,
        2.0,
      ),
      ball(0.06, 0.06, 0.06, glass, 0, 2.0, 0, 8),
      light,
    );
    return {
      group: g,
      tick({ night, lit }) {
        glass.emissiveIntensity = lit ? 0.5 + night * 0.5 : 0.05;
        light.intensity = lit ? 2.5 + night * 5 : 0;
      },
    };
  },
};

export function framed(w: number, h: number, y: number, art: THREE.Material, frameCol: number, depth = 0.05): THREE.Group {
  const wood = colorMat(frameCol, { gloss: 0.5 });
  const g = group(
    box(w, h, depth, [wood, wood, wood, wood, art, wood], 0, y, WALL_FACE + depth / 2),
    // moldura saltada em volta
    box(w + 0.06, 0.03, depth + 0.02, wood, 0, y + h, WALL_FACE + depth / 2),
    box(w + 0.06, 0.03, depth + 0.02, wood, 0, y - 0.03, WALL_FACE + depth / 2),
    box(0.03, h + 0.06, depth + 0.02, wood, -w / 2 - 0.015, y - 0.03, WALL_FACE + depth / 2),
    box(0.03, h + 0.06, depth + 0.02, wood, w / 2 + 0.015, y - 0.03, WALL_FACE + depth / 2),
  );
  for (const m of g.children) m.castShadow = false;
  return g;
}

const painting: FurnitureSpec = {
  build(seed) {
    return { group: framed(0.62, 0.46, 1.3, texMat(`painting:${seed % 3}`), 0x4a3220) };
  },
};

const canvas: FurnitureSpec = {
  build(seed) {
    const g = framed(0.92, 0.68, 1.12, texMat(`painting:${(seed + 1) % 3}`), PAL.brass, 0.06);
    // luz de quadro em cima, como em galeria
    const brass = colorMat(PAL.brass, { gloss: 0.9 });
    g.add(rod([-0.25, 1.95, WALL_FACE + 0.12], [0.25, 1.95, WALL_FACE + 0.12], 0.02, brass, 6), rod([0, 1.92, WALL_FACE], [0, 1.95, WALL_FACE + 0.12], 0.01, brass, 4));
    return { group: g };
  },
};

const wallclock: FurnitureSpec = {
  build() {
    const red = colorMat(0xc9382f, { gloss: 0.6 });
    const face = cyl(0.17, 0.17, 0.04, 16, [red, texMat('clock'), red], 0, 0, 0);
    face.rotation.x = Math.PI / 2;
    face.position.set(0, 1.72, WALL_FACE + 0.02);
    return { group: group(face) };
  },
};

function rugSpec(w: number, d: number, color?: number): FurnitureSpec {
  return {
    build() {
      const mat = texMat('rug', color ? { color } : {});
      const m = box(w - 0.1, 0.014, d - 0.1, mat, 0, 0.004, 0);
      m.userData.flat = true;
      m.receiveShadow = true;
      return { group: group(m) };
    },
  };
}
const rug = rugSpec(2, 1, 0x9fc0d8);
const bigrug = rugSpec(3, 2);

const fallback: FurnitureSpec = {
  build() {
    return { group: group(rbox(0.7, 0.5, 0.7, 0.04, colorMat(0xdccfb4))) };
  },
};

const SPECS: Record<string, FurnitureSpec> = {
  fridge,
  stove,
  counter,
  dinette,
  bed,
  shower,
  toilet,
  sink,
  sofa,
  tv,
  bookshelf,
  phone,
  speaker,
  plant,
  lamp,
  armchair,
  desk,
  easel,
  recorder,
  bike,
  flowers,
  kitchensink,
  trashcan,
  curbbin,
  mailbox,
  workbench,
  ceilinglamp,
  painting,
  canvas,
  wallclock,
  rug,
  bigrug,
};

export function furnitureSpec(art: string): FurnitureSpec {
  return SPECS[art] ?? FURNITURE4[art] ?? REWARD_ART[art] ?? KID_ART[art] ?? YARD_ART[art] ?? PERIL_ART[art] ?? DOWNTOWN_ART[art] ?? fallback;
}

export function buildFurniture(art: string, seed: number, paint?: number): FurnitureModel {
  let model = furnitureSpec(art).build(seed, paint);
  // bloco 13: o vaso da casa também vive (murcha sem água)
  if (art === 'plant') model = livingPot(model);
  DETAILS[art]?.(model.group, seed);
  setShadows(model.group);
  model.group.traverse((o) => {
    if (o.userData.flat) o.castShadow = false;
  });
  return model;
}
