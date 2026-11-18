import * as THREE from 'three';
import { ball, box, colorMat, cyl, rbox } from './build';
import { seeded } from './palette';

// Plano 2, bloco 6: o que aparece na casa por causa das atividades: a
// panela no fogão com vapor, a tábua com legumes na bancada, a travessa
// servida (cheia, pela metade, fria, estragada com moscas), a louça
// empilhada na pia e a cama desfeita. Tudo modelado por código.

/** Algo da cena que se mexe sozinho (vapor, moscas). */
export interface Animated {
  group: THREE.Group;
  tick?(time: number): void;
}

/** Cor da comida de cada prato. */
const FOOD: Record<string, number> = {
  toast: 0xc98a3c,
  eggs: 0xf0c83a,
  pasta: 0xd8642a,
  soup: 0x8a9a3a,
  pancakes: 0xd9a04a,
  chickenrice: 0xe8d080,
  fishstew: 0xd8702a,
  palmpie: 0xd9a845,
};

/** Fiapos de vapor subindo (esferas claras que sobem e somem). */
function steam(rnd: () => number, n: number, spread: number, rise: number): Animated {
  const g = new THREE.Group();
  const puffs: { mesh: THREE.Mesh; mat: THREE.MeshBasicMaterial; ph: number; x: number; z: number }[] = [];
  for (let i = 0; i < n; i++) {
    const mat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.5, depthWrite: false });
    const mesh = new THREE.Mesh(new THREE.IcosahedronGeometry(0.035, 0), mat);
    const x = (rnd() - 0.5) * spread;
    const z = (rnd() - 0.5) * spread;
    g.add(mesh);
    puffs.push({ mesh, mat, ph: rnd(), x, z });
  }
  return {
    group: g,
    tick(time) {
      for (const p of puffs) {
        const k = (time * 0.5 + p.ph) % 1;
        p.mesh.position.set(p.x + Math.sin(time * 2 + p.ph * 6) * 0.03, k * rise, p.z);
        p.mesh.scale.setScalar(0.7 + k * 1.6);
        p.mat.opacity = 0.45 * (1 - k);
      }
    },
  };
}

/** Moscas rodando em volta da comida estragada. */
function flies(rnd: () => number): Animated {
  const g = new THREE.Group();
  const mat = colorMat(0x141414);
  const list: { mesh: THREE.Mesh; ph: number; r: number }[] = [];
  for (let i = 0; i < 4; i++) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(0.018, 0.012, 0.018), mat);
    g.add(mesh);
    list.push({ mesh, ph: rnd() * 6, r: 0.1 + rnd() * 0.1 });
  }
  return {
    group: g,
    tick(time) {
      for (const f of list) {
        const a = time * 3 + f.ph;
        f.mesh.position.set(Math.cos(a) * f.r, 0.12 + Math.sin(a * 1.7) * 0.05, Math.sin(a) * f.r);
      }
    },
  };
}

export interface MealLook {
  dish: string;
  /** 0..1: quanto ainda tem */
  fill: number;
  warm: boolean;
  spoiled: boolean;
  burnt: boolean;
}

/** A travessa servida, em cima do tampo (a origem é o tampo). */
export function buildMeal(look: MealLook, seed: number): Animated {
  const g = new THREE.Group();
  const rnd = seeded(seed * 17 + 3);
  const ceramic = colorMat(0xf4efdf, { gloss: 0.8 });
  const rim = colorMat(0x3a6aa8, { gloss: 0.7 });
  const pie = look.dish === 'palmpie' || look.dish === 'pancakes';
  // travessa funda para os pratos de panela, forma rasa para torta e panqueca
  const h = pie ? 0.06 : 0.1;
  g.add(rbox(0.42, h, 0.3, 0.04, ceramic, 0, h / 2, 0), box(0.44, 0.012, 0.32, rim, 0, h, 0));
  let color = FOOD[look.dish] ?? 0xc9822f;
  if (look.burnt) color = 0x3a2416;
  if (look.spoiled) color = 0x7a8a5a;
  const food = colorMat(color, { gloss: look.dish === 'soup' || look.dish === 'fishstew' ? 0.6 : 0.3 });
  if (look.fill > 0) {
    // a comida forma um monte por cima da borda, menor conforme vão se servindo
    const mound = 0.015 + 0.045 * look.fill;
    const top = h + mound;
    const width = 0.2 + 0.16 * Math.min(1, look.fill * 1.4);
    g.add(rbox(width, mound + 0.02, 0.22 + 0.04 * look.fill, 0.012, food, 0, h + (mound - 0.02) / 2 + 0.01, 0));
    // pedaços por cima (legume, ervas, queijo), menos quando está acabando
    const bits = Math.round(2 + look.fill * 5);
    const bit = colorMat(look.spoiled ? 0x4a5a3a : look.burnt ? 0x1a120c : 0x3f9455);
    for (let i = 0; i < bits; i++) {
      g.add(ball(0.02, 0.012, 0.02, i % 2 ? bit : food, (rnd() - 0.5) * width * 0.8, top + 0.004, (rnd() - 0.5) * 0.18, 6));
    }
  }
  // a colher de servir encostada
  g.add(box(0.03, 0.012, 0.22, colorMat(0xc9ccd2, { gloss: 1 }), 0.16, h + 0.02, 0.05));
  const parts: Animated[] = [];
  if (look.warm && !look.spoiled && look.fill > 0) parts.push(steam(rnd, 5, 0.2, 0.45));
  if (look.spoiled) parts.push(flies(rnd));
  for (const p of parts) {
    p.group.position.y = h;
    g.add(p.group);
  }
  return { group: g, tick: (time) => parts.forEach((p) => p.tick?.(time)) };
}

/** Panela no fogão (a origem é o tampo do fogão), com vapor e o caldo borbulhando. */
export function buildPot(dish: string | undefined, seed: number): Animated {
  const g = new THREE.Group();
  const rnd = seeded(seed * 13 + 1);
  const steel = colorMat(0xb8bcc4, { gloss: 0.9 });
  g.add(cyl(0.15, 0.14, 0.16, 16, steel, -0.12, 0.08, -0.08), box(0.2, 0.025, 0.035, colorMat(0x2a2a2e), 0.08, 0.13, -0.08));
  const broth = cyl(0.135, 0.135, 0.01, 16, colorMat(FOOD[dish ?? ''] ?? 0xc9822f, { gloss: 0.6 }), -0.12, 0.15, -0.08);
  g.add(broth);
  const vapor = steam(rnd, 7, 0.18, 0.6);
  vapor.group.position.set(-0.12, 0.16, -0.08);
  g.add(vapor.group);
  return {
    group: g,
    tick(time) {
      vapor.tick?.(time);
      broth.position.y = 0.15 + Math.sin(time * 9) * 0.004;
    },
  };
}

/** Tábua de picar com legumes e faca, em cima da bancada (a origem é o tampo). */
export function buildBoard(seed: number): Animated {
  const g = new THREE.Group();
  const rnd = seeded(seed * 7 + 11);
  g.add(rbox(0.36, 0.025, 0.24, 0.02, colorMat(0xc9935a, { gloss: 0.3 }), 0, 0.012, 0));
  const veg = [0xd8402a, 0x3f9455, 0xf0a030, 0xe8e0c0];
  for (let i = 0; i < 6; i++) {
    g.add(ball(0.025, 0.018, 0.025, colorMat(veg[i % veg.length], { gloss: 0.4 }), (rnd() - 0.5) * 0.24, 0.035, (rnd() - 0.5) * 0.14, 6));
  }
  g.add(box(0.2, 0.006, 0.03, colorMat(0xdfe3ea, { gloss: 1 }), 0.1, 0.03, 0.08));
  return { group: g };
}

/** Pilha de pratos sujos na pia (a origem é o tampo). */
export function buildDishStack(n: number): Animated {
  const g = new THREE.Group();
  const china = colorMat(0xf1ecdc, { gloss: 0.8 });
  const dirt = colorMat(0x9a5a2a);
  const shown = Math.min(8, Math.ceil(n));
  for (let i = 0; i < shown; i++) {
    const tilt = (i % 3) * 0.04;
    const p = cyl(0.12, 0.095, 0.02, 12, china, (i % 2) * 0.03 - 0.015, 0.012 + i * 0.024, 0);
    p.rotation.z = tilt;
    g.add(p, ball(0.03, 0.008, 0.025, dirt, (i % 2) * 0.03, 0.025 + i * 0.024, 0.02, 5));
  }
  return { group: g };
}

/** Coberta por cima de quem dorme, dos pés até o peito (a origem é o lugar de deitar). */
export function buildCover(spots: { x: number; y: number; z: number }[], seed: number): Animated {
  const g = new THREE.Group();
  const quilt = colorMat(seed % 2 ? 0x7f9cc0 : 0xc0867a, { gloss: 0.15 });
  const hem = colorMat(0xf0ece0, { gloss: 0.2 });
  for (const s of spots) {
    // o corpo vai do lugar (pés) para -z (cabeça): a coberta para no peito
    g.add(rbox(0.68, 0.16, 1.3, 0.06, quilt, s.x, s.y + 0.09, s.z - 0.6));
    g.add(rbox(0.7, 0.17, 0.12, 0.05, hem, s.x, s.y + 0.095, s.z - 1.2));
  }
  return { group: g };
}

/** Lençol embolado e travesseiro torto: a cama desfeita (a origem é o colchão). */
export function buildRumple(w: number, seed: number): Animated {
  const g = new THREE.Group();
  const rnd = seeded(seed * 5 + 2);
  const sheet = colorMat(0xf0ece0, { gloss: 0.2 });
  const cover = colorMat(0xd8d0c0, { gloss: 0.2 });
  for (let i = 0; i < 5; i++) {
    const lump = rbox(0.3 + rnd() * 0.3, 0.08 + rnd() * 0.06, 0.28 + rnd() * 0.2, 0.05, i % 2 ? sheet : cover, (rnd() - 0.5) * (w - 0.4), 0.04, -0.1 + rnd() * 0.7);
    lump.rotation.y = (rnd() - 0.5) * 1.2;
    lump.rotation.z = (rnd() - 0.5) * 0.3;
    g.add(lump);
  }
  const pillow = rbox(0.4, 0.09, 0.22, 0.05, sheet, (rnd() - 0.5) * 0.2, 0.06, -0.7);
  pillow.rotation.y = 0.35;
  g.add(pillow);
  return { group: g };
}
