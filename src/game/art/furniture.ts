import * as THREE from 'three';
import { box, colorMat, cyl, fronted, setShadows, texMat, tileUV } from './build';
import { PAL, seeded, shade } from './palette';
import { getTexture } from './textures';

// Modelos 3D dos objetos. Cada um é montado com poucas peças simples e os
// detalhes vão pintados nas texturas (portas, livros, botões), como se fazia
// nos jogos 3D antigos. Os modelos são centrados na base do objeto e têm a
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
}

export interface FurnitureModel {
  group: THREE.Group;
  tick?(info: TickInfo): void;
}

export interface FurnitureSpec {
  build(seed: number): FurnitureModel;
  facing?: 'S' | 'E';
  /** onde o folk senta, deita ou fica quando está "em cima" do objeto */
  sit?: Anchor[];
  lie?: Anchor;
  stand?: Anchor;
}

const chrome = () => colorMat(PAL.chrome);
const porcelain = () => colorMat(PAL.porcelain);

function group(...parts: THREE.Object3D[]): THREE.Group {
  const g = new THREE.Group();
  g.add(...parts);
  return g;
}

function legs(w: number, d: number, h: number, mat: THREE.Material, t = 0.07): THREE.Mesh[] {
  const out: THREE.Mesh[] = [];
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) out.push(box(t, h, t, mat, (sx * (w - t)) / 2, 0, (sz * (d - t)) / 2));
  return out;
}

// ---------- cozinha ----------

const fridge: FurnitureSpec = {
  build() {
    const side = texMat('enamel');
    const g = group(
      box(0.76, 1.8, 0.68, fronted(side, texMat('fridgeFront'), colorMat(PAL.enamel)), 0, 0, -0.04),
      box(0.035, 0.25, 0.05, chrome(), 0.255, 1.375, 0.32),
      box(0.035, 0.5, 0.05, chrome(), 0.255, 0.65, 0.32),
    );
    return { group: g };
  },
};

// ---------- quarto ----------

const MATTRESS_TOP = 0.48;

const bed: FurnitureSpec = {
  lie: { x: 0, y: MATTRESS_TOP + 0.11, z: 0.9, heading: 0 },
  build() {
    const wood = texMat('walnut');
    const white = colorMat(0xfdfcf7);
    const duvet = tileUV(box(0.88, 0.07, 1.25, texMat('duvet'), 0, MATTRESS_TOP, 0.28), 1, 1.5);
    const g = group(
      ...legs(0.88, 1.9, 0.2, wood, 0.08),
      box(0.9, 0.14, 1.9, wood, 0, 0.18, 0),
      box(0.92, 0.95, 0.08, wood, 0, 0, -0.95),
      box(0.98, 0.06, 0.12, wood, 0, 0.95, -0.95),
      box(0.92, 0.5, 0.06, wood, 0, 0, 0.95),
      box(0.84, 0.16, 1.8, white, 0, 0.32, 0),
      box(0.56, 0.1, 0.32, white, 0, MATTRESS_TOP, -0.68),
      duvet,
      box(0.88, 0.075, 0.14, white, 0, MATTRESS_TOP, -0.3),
    );
    let raised = 1;
    return {
      group: g,
      tick({ using }) {
        // com alguém dormindo, o edredom sobe e cobre o corpo
        const target = using ? 4.4 : 1;
        raised += (target - raised) * 0.2;
        duvet.scale.y = raised;
        duvet.position.y = MATTRESS_TOP + 0.035 * raised;
      },
    };
  },
};

// ---------- banheiro ----------

const shower: FurnitureSpec = {
  stand: { x: 0, y: 0.06, z: 0, heading: 0 },
  build(seed) {
    const glass = colorMat(PAL.glass, { opacity: 0.25, unique: true });
    const g = group(box(0.9, 0.06, 0.9, porcelain()));
    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) g.add(box(0.035, 2.0, 0.035, chrome(), sx * 0.43, 0.06, sz * 0.43));
      g.add(box(0.035, 0.035, 0.86, chrome(), sx * 0.43, 2.03, 0));
      g.add(box(0.86, 0.035, 0.035, chrome(), 0, 2.03, sx * 0.43));
      g.add(box(0.012, 1.96, 0.84, glass, sx * 0.43, 0.06, 0));
      g.add(box(0.84, 1.96, 0.012, glass, 0, 0.06, sx * 0.43));
    }
    g.add(cyl(0.016, 0.016, 1.9, 6, chrome(), -0.36, 0.06, -0.36));
    const arm = box(0.025, 0.025, 0.24, chrome(), -0.3, 1.94, -0.3);
    arm.rotation.y = -Math.PI / 4;
    g.add(arm, cyl(0.04, 0.1, 0.06, 8, chrome(), -0.2, 1.86, -0.2));
    g.add(cyl(0.05, 0.05, 0.01, 8, colorMat(0x8d979c), 0, 0.06, 0));

    // gotas: caixinhas finas que caem em laço enquanto alguém toma banho
    const rnd = seeded(seed + 5);
    const dropMat = new THREE.MeshBasicMaterial({ color: PAL.water, transparent: true, opacity: 0.8 });
    const drops: { mesh: THREE.Mesh; phase: number }[] = [];
    for (let i = 0; i < 16; i++) {
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

const toilet: FurnitureSpec = {
  sit: [{ x: 0, y: 0.44, z: 0.06, heading: 0 }],
  build() {
    const p = porcelain();
    const seat = cyl(0.23, 0.23, 0.045, 10, p, 0, 0.4, 0.06);
    seat.scale.z = 1.15;
    const g = group(
      box(0.3, 0.42, 0.16, p, 0, 0, -0.33),
      box(0.5, 0.42, 0.2, p, 0, 0.42, -0.33),
      box(0.54, 0.04, 0.24, p, 0, 0.84, -0.33),
      cyl(0.03, 0.03, 0.02, 6, chrome(), 0.14, 0.88, -0.33),
      cyl(0.2, 0.13, 0.4, 8, p, 0, 0, 0.06),
      seat,
      cyl(0.15, 0.15, 0.01, 8, colorMat(PAL.water), 0, 0.441, 0.08),
    );
    return { group: g };
  },
};

const sink: FurnitureSpec = {
  facing: 'E',
  build() {
    const white = colorMat(0xf1efe6);
    const g = group(
      box(0.76, 0.06, 0.44, colorMat(PAL.plastic), 0, 0, -0.15),
      box(0.8, 0.82, 0.5, fronted(white, texMat('doorsWhite')), 0, 0.06, -0.15),
      box(0.86, 0.05, 0.56, colorMat(0xe6e0d2), 0, 0.88, -0.14),
      cyl(0.19, 0.19, 0.012, 10, colorMat(0xaebdc2), 0, 0.93, -0.12),
      cyl(0.14, 0.14, 0.014, 10, colorMat(PAL.water), 0, 0.93, -0.12),
      cyl(0.016, 0.016, 0.16, 6, chrome(), 0, 0.93, -0.35),
      box(0.03, 0.025, 0.14, chrome(), 0, 1.07, -0.29),
      box(0.8, 0.95, 0.04, fronted(white, texMat('mirror')), 0, 0.93, -0.41),
      box(0.09, 0.03, 0.06, colorMat(0xf2a7b5), 0.28, 0.93, -0.02),
    );
    return { group: g };
  },
};

// ---------- sala ----------

const sofa: FurnitureSpec = {
  sit: [
    { x: -0.375, y: 0.45, z: 0.1, heading: 0 },
    { x: 0.375, y: 0.45, z: 0.1, heading: 0 },
  ],
  build() {
    const fab = texMat('fabric', { color: PAL.sofa });
    const light = texMat('fabric', { color: shade(PAL.sofa, 1.22) });
    const wood = colorMat(PAL.walnut);
    const g = group(
      ...legs(1.84, 0.8, 0.1, wood),
      box(1.9, 0.22, 0.84, fab, 0, 0.1, 0.02),
      box(1.9, 0.62, 0.2, fab, 0, 0.32, -0.36),
    );
    for (const sx of [-1, 1]) {
      g.add(box(0.2, 0.3, 0.84, fab, sx * 0.85, 0.32, 0.02));
      const roll = cyl(0.11, 0.11, 0.84, 8, fab, sx * 0.85, 0, 0);
      roll.rotation.x = Math.PI / 2;
      roll.position.set(sx * 0.85, 0.62, 0.02);
      g.add(roll);
      g.add(box(0.74, 0.13, 0.6, light, sx * 0.375, 0.32, 0.12));
      const back = box(0.72, 0.4, 0.14, light, sx * 0.375, 0.45, -0.22);
      back.rotation.x = -0.12;
      g.add(back);
    }
    const pillow = box(0.3, 0.3, 0.1, texMat('fabric', { color: PAL.duvet }), -0.52, 0.47, -0.08);
    pillow.rotation.set(-0.3, 0.3, 0.15);
    g.add(pillow);
    return { group: g };
  },
};

const tv: FurnitureSpec = {
  facing: 'E',
  build() {
    const oak = texMat('oak');
    const plastic = colorMat(PAL.plastic);
    const off = getTexture('tvOff');
    const channels = [getTexture('tvOn0'), getTexture('tvOn1'), getTexture('tvOn2')];
    const screen = new THREE.MeshLambertMaterial({ map: off, emissive: 0xffffff, emissiveMap: off, emissiveIntensity: 0 });
    const antenna = (side: number) => {
      const a = cyl(0.008, 0.008, 0.42, 4, chrome(), 0, 0, 0);
      a.position.set(side * 0.1, 1.28, -0.12);
      a.rotation.z = -side * 0.5;
      return a;
    };
    const g = group(
      ...legs(0.84, 0.44, 0.06, colorMat(PAL.walnut), 0.06),
      box(0.9, 0.5, 0.5, fronted(oak, texMat('doorsOak')), 0, 0.06, -0.05),
      box(0.72, 0.56, 0.2, fronted(plastic, screen), 0, 0.56, 0.08),
      box(0.52, 0.44, 0.3, plastic, 0, 0.6, -0.14),
      cyl(0.05, 0.06, 0.03, 6, plastic, 0, 1.08, -0.12),
      antenna(-1),
      antenna(1),
    );
    return {
      group: g,
      tick({ time, using }) {
        const map = using ? channels[Math.floor(time / 3) % channels.length] : off;
        if (screen.map !== map) {
          screen.map = map;
          screen.emissiveMap = map;
        }
        screen.emissiveIntensity = using ? 0.75 + Math.sin(time * 23) * 0.06 : 0;
      },
    };
  },
};

const bookshelf: FurnitureSpec = {
  build() {
    const oak = texMat('oak');
    const g = group(
      box(1.9, 2.0, 0.4, fronted(oak, texMat('books')), 0, 0, -0.27),
      box(1.96, 0.06, 0.44, oak, 0, 2.0, -0.27),
    );
    return { group: g };
  },
};

const phone: FurnitureSpec = {
  build() {
    const wood = colorMat(PAL.walnut);
    const red = colorMat(PAL.phone);
    const dark = colorMat(shade(PAL.phone, 0.75));
    const g = group(
      cyl(0.16, 0.2, 0.04, 8, wood),
      cyl(0.035, 0.035, 0.62, 6, wood, 0, 0.04, 0),
      cyl(0.3, 0.3, 0.05, 10, texMat('oak'), 0, 0.66, 0),
      box(0.24, 0.07, 0.2, red, 0, 0.71, 0),
      cyl(0.06, 0.06, 0.012, 8, colorMat(PAL.linen), 0, 0.78, 0.03),
      box(0.3, 0.035, 0.06, dark, 0, 0.82, -0.05),
      box(0.07, 0.06, 0.07, dark, -0.12, 0.78, -0.05),
      box(0.07, 0.06, 0.07, dark, 0.12, 0.78, -0.05),
    );
    return { group: g };
  },
};

const speaker: FurnitureSpec = {
  build() {
    const wood = texMat('walnut');
    const tower = box(0.5, 1.05, 0.44, fronted(wood, texMat('speakerFront')), 0, 0.04, 0);
    const deck = box(0.44, 0.1, 0.36, fronted(colorMat(0x3a393d), texMat('deckFront')), 0, 1.09, 0);
    const g = group(...legs(0.46, 0.4, 0.04, colorMat(PAL.plastic), 0.06), tower, deck);
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
    const pot = colorMat(PAL.terracotta);
    const leavesMat = texMat('leaves', { alphaTest: 0.5, doubleSide: true });
    const g = group(
      cyl(0.22, 0.2, 0.03, 8, colorMat(shade(PAL.terracotta, 0.8))),
      cyl(0.21, 0.15, 0.34, 8, pot, 0, 0.03, 0),
      cyl(0.22, 0.22, 0.04, 8, pot, 0, 0.34, 0),
      cyl(0.19, 0.19, 0.01, 8, colorMat(PAL.soil), 0, 0.375, 0),
      cyl(0.025, 0.035, 0.6, 5, texMat('bark'), 0, 0.37, 0),
    );
    // folhagem: planos cruzados com a textura de folhas, técnica da época
    for (let i = 0; i < 3; i++) {
      const card = new THREE.Mesh(new THREE.PlaneGeometry(1.15, 1.15), leavesMat);
      card.position.y = 1.08;
      card.rotation.y = (i * Math.PI) / 3 + seed * 0.7;
      g.add(card);
    }
    return { group: g };
  },
};

const lamp: FurnitureSpec = {
  build() {
    const brass = colorMat(PAL.brass);
    const shadeMat = texMat('lampShade', { doubleSide: true, emissive: 0xffd98a, emissiveIntensity: 0.2, unique: true });
    const light = new THREE.PointLight(0xffd9a0, 0, 7, 1.6);
    light.position.y = 1.42;
    const g = group(
      cyl(0.16, 0.19, 0.04, 10, brass),
      cyl(0.018, 0.018, 1.3, 6, brass, 0, 0.04, 0),
      cyl(0.14, 0.26, 0.32, 10, shadeMat, 0, 1.3, 0, true),
      light,
    );
    return {
      group: g,
      tick({ night }) {
        shadeMat.emissiveIntensity = 0.2 + night * 0.8;
        light.intensity = night * 5;
      },
    };
  },
};

const fallback: FurnitureSpec = {
  build() {
    return { group: group(box(0.7, 0.5, 0.7, colorMat(0xdccfb4))) };
  },
};

const SPECS: Record<string, FurnitureSpec> = {
  fridge,
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
};

export function furnitureSpec(art: string): FurnitureSpec {
  return SPECS[art] ?? fallback;
}

export function buildFurniture(art: string, seed: number): FurnitureModel {
  const model = furnitureSpec(art).build(seed);
  setShadows(model.group);
  return model;
}
