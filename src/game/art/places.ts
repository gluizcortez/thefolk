import * as THREE from 'three';
import { ball, box, colorMat, cyl, rbox, rod, texMat } from './build';
import type { FurnitureSpec } from './furniture';
import { chrome, group } from './furniture';

// Plano 2, bloco 13: os móveis dos lugares da cidade. Gôndola e caixa do
// mercado, churrasqueira (usa a de casa), coreto da praça, esteira da
// academia, tela e poltronas do cinema, carrinho de pipoca, balcão e palco do
// bar e o trapiche de pesca do lago. Mesma regra dos outros modelos: centro
// na base, frente para +z, um tile = 1.

const pine = () => texMat('pine', { gloss: 0.3 });
const walnut = () => texMat('walnut', { gloss: 0.45 });
const iron = () => colorMat(0x26282b, { gloss: 0.5 });
const white = () => colorMat(0xf2ede2, { gloss: 0.4 });

const PRODUCT = [0xc9382f, 0x2f7fc4, 0xe8b830, 0x3f9455, 0xe9e4d6, 0xd27a2a, 0x7d55ad, 0x5fb3a8];

/** Gôndola: estante de metal de três prateleiras cheias de caixas, latas e garrafas. */
const gondola: FurnitureSpec = {
  build(seed) {
    const metal = colorMat(0xd9dcd8, { gloss: 0.6 });
    const g = group(box(2.9, 1.6, 0.06, metal, 0, 0, -0.38), box(2.9, 0.1, 0.7, colorMat(0x4a4d52), 0, 0, -0.08));
    for (const sx of [-1.43, 1.43]) g.add(box(0.05, 1.62, 0.7, metal, sx, 0, -0.08));
    let k = seed;
    for (const y of [0.1, 0.55, 1.0, 1.42]) {
      g.add(box(2.86, 0.03, 0.66, metal, 0, y, -0.08));
      // produtos de frente: caixas, latas e garrafas alternando
      for (let x = -1.32; x < 1.32; x += 0.16) {
        k = (k * 1103515245 + 12345) & 0x7fffffff;
        const pick = (k >>> 16) % PRODUCT.length;
        const col = colorMat(PRODUCT[pick], { gloss: 0.35 });
        const kind = (k >>> 12) % 3;
        if (kind === 0) g.add(box(0.13, 0.26, 0.2, col, x, y + 0.03, 0.08));
        else if (kind === 1) g.add(cyl(0.055, 0.055, 0.16, 8, col, x, y + 0.03, 0.12));
        else g.add(cyl(0.035, 0.05, 0.3, 8, colorMat(PRODUCT[pick], { gloss: 0.9, opacity: 0.85 }), x, y + 0.03, 0.12));
      }
    }
    // faixa de preço amarela
    g.add(box(2.86, 0.06, 0.02, colorMat(0xf4d03f), 0, 1.0, 0.25));
    return { group: g };
  },
};

/** Caixa do mercado: balcão com esteira de borracha, registradora e luz de número. */
const checkout: FurnitureSpec = {
  build() {
    const g = group(rbox(1.9, 0.86, 0.6, 0.03, colorMat(0xe9e4d6, { gloss: 0.5 }), 0, 0, 0));
    g.add(box(1.4, 0.03, 0.4, colorMat(0x1e1f22, { gloss: 0.2 }), -0.2, 0.86, 0));
    g.add(rbox(0.36, 0.22, 0.32, 0.03, colorMat(0x3a3d42, { gloss: 0.5 }), 0.7, 0.86, 0), box(0.26, 0.14, 0.03, colorMat(0x7fe0a0, { emissive: 0x3fb06a, emissiveIntensity: 0.6 }), 0.7, 1.12, 0.1));
    g.add(rod([0.85, 0.86, -0.25], [0.85, 1.7, -0.25], 0.02, chrome()), box(0.3, 0.22, 0.05, colorMat(0xc9382f, { emissive: 0x7a1a14, emissiveIntensity: 0.4 }), 0.85, 1.7, -0.25));
    return { group: g };
  },
};

/** Coreto: base octogonal de alvenaria, oito colunas brancas, guarda-corpo e telhado em ponta com bandeirinha. */
const bandstand: FurnitureSpec = {
  build() {
    const g = new THREE.Group();
    const r = 1.85;
    g.add(cyl(r, r + 0.05, 0.55, 8, colorMat(0xc9b896, { gloss: 0.1 }), 0, 0, 0));
    g.add(cyl(r - 0.05, r - 0.05, 0.04, 8, texMat('wood', { gloss: 0.3 }), 0, 0.55, 0));
    // degraus na frente
    for (let i = 0; i < 3; i++) g.add(box(1.0, 0.18, 0.3, colorMat(0xbfae8c), 0, i * 0.18, r + 0.35 - i * 0.28));
    const col = white();
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 + Math.PI / 8;
      const x = Math.sin(a) * (r - 0.2);
      const z = Math.cos(a) * (r - 0.2);
      g.add(cyl(0.07, 0.08, 2.3, 8, col, x, 0.59, z));
      // guarda-corpo entre as colunas (menos na frente)
      if (i !== 7 && i !== 0) {
        const b = ((i + 1) / 8) * Math.PI * 2 + Math.PI / 8;
        g.add(rod([x, 1.05, z], [Math.sin(b) * (r - 0.2), 1.05, Math.cos(b) * (r - 0.2)], 0.03, col));
      }
    }
    // telhado de oito águas, verde, com a ponta e a bandeirinha
    g.add(cyl(0.05, r + 0.2, 0.9, 8, colorMat(0x3f7a52, { gloss: 0.35 }), 0, 2.85, 0));
    g.add(cyl(r + 0.2, r + 0.2, 0.12, 8, col, 0, 2.75, 0));
    g.add(rod([0, 3.7, 0], [0, 4.3, 0], 0.02, iron()), box(0.3, 0.18, 0.01, colorMat(0xd9a441), 0.15, 4.1, 0));
    // estantes de partitura e um tambor (a banda da cidade)
    for (const [x, z] of [
      [-0.7, -0.4],
      [0.7, -0.4],
    ]) {
      g.add(rod([x, 0.59, z], [x, 1.5, z], 0.015, iron()), box(0.4, 0.3, 0.02, iron(), x, 1.45, z));
    }
    g.add(cyl(0.28, 0.28, 0.3, 14, colorMat(0xb8342c, { gloss: 0.5 }), 0, 0.59, -0.9), cyl(0.27, 0.27, 0.02, 14, colorMat(0xf2ece0), 0, 0.89, -0.9));
    return { group: g };
  },
};

/** Esteira: lona preta entre roletes, painel com visor e as barras de apoio. */
const treadmill: FurnitureSpec = {
  stand: { x: 0, y: 0.17, z: 0.15, heading: Math.PI },
  build() {
    const g = group(rbox(0.8, 0.14, 1.8, 0.05, colorMat(0x3a3d42, { gloss: 0.5 }), 0, 0, 0.05));
    const belt = box(0.62, 0.02, 1.6, colorMat(0x16171a, { gloss: 0.1 }), 0, 0.14, 0.05);
    g.add(belt);
    const metal = colorMat(0xb8bcc0, { gloss: 0.8 });
    for (const sx of [-0.38, 0.38]) g.add(rod([sx, 0.14, -0.7], [sx, 1.2, -0.85], 0.035, metal), rod([sx, 1.0, -0.8], [sx, 1.0, -0.2], 0.025, metal));
    g.add(rbox(0.72, 0.32, 0.16, 0.04, colorMat(0x2b2d33, { gloss: 0.5 }), 0, 1.15, -0.88));
    const screen = box(0.36, 0.14, 0.02, colorMat(0x7fe0d0, { emissive: 0x2fa090, emissiveIntensity: 0.6 }), 0, 1.24, -0.79);
    g.add(screen);
    let t = 0;
    return {
      group: g,
      tick({ using }) {
        // a lona corre quando alguém corre
        if (using) t += 0.06;
        belt.position.z = 0.05 + (Math.sin(t * 9) * 0.004);
      },
    };
  },
};

/** Tela do cinema: moldura escura, cortina vermelha dos lados e a imagem acesa (muda de cor com o filme). */
const cinescreen: FurnitureSpec = {
  build() {
    const g = group(box(6, 3.2, 0.12, colorMat(0x1a1b1e), 0, 0.4, -0.4));
    const pic = new THREE.MeshPhongMaterial({ color: 0xffffff, emissive: 0x8ab0d0, emissiveIntensity: 0.9 });
    g.add(box(5.2, 2.5, 0.02, pic, 0, 0.75, -0.33));
    const red = colorMat(0x8e1f1f, { gloss: 0.25 });
    for (const sx of [-2.85, 2.85]) {
      for (let i = 0; i < 4; i++) g.add(cyl(0.09, 0.11, 3.4, 8, red, sx + (sx < 0 ? 1 : -1) * i * 0.12, 0.3, -0.28));
    }
    g.add(box(6, 0.3, 0.3, red, 0, 3.55, -0.3));
    const tones = [0x8ab0d0, 0xe0b070, 0x70c090, 0xd07070, 0xc0c0f0, 0x406080];
    let t = 0;
    return {
      group: g,
      tick({ time }) {
        t = Math.floor(time / 2.5);
        pic.emissive.setHex(tones[t % tones.length]);
      },
    };
  },
};

/** Fileira de três poltronas de veludo vermelho, braços de madeira. */
const cineseats: FurnitureSpec = {
  sit: [-1, 0, 1].map((x) => ({ x, y: 0.45, z: 0.05, heading: 0 })),
  build() {
    const velvet = colorMat(0xa22a2a, { gloss: 0.2 });
    const wood = walnut();
    const g = new THREE.Group();
    for (const x of [-1, 0, 1]) {
      g.add(rbox(0.78, 0.18, 0.62, 0.06, velvet, x, 0.3, 0.05), rbox(0.78, 0.82, 0.16, 0.06, velvet, x, 0.3, -0.3), box(0.6, 0.3, 0.5, iron(), x, 0, 0.0));
    }
    for (const x of [-1.5, -0.5, 0.5, 1.5]) g.add(box(0.1, 0.6, 0.66, wood, x, 0.05, 0.0));
    return { group: g };
  },
};

/** Carrinho de pipoca: base vermelha com rodas, caixa de vidro cheia e o toldo listrado. */
const popcorn: FurnitureSpec = {
  build() {
    const red = colorMat(0xc9382f, { gloss: 0.6 });
    const g = group(rbox(0.8, 0.8, 0.6, 0.04, red, 0, 0.12, 0));
    for (const sx of [-0.32, 0.32]) g.add(cyl(0.12, 0.12, 0.05, 12, iron(), sx, 0.12, 0.31));
    g.add(box(0.7, 0.5, 0.5, colorMat(0xe8f4f8, { gloss: 1, opacity: 0.35 }), 0, 0.92, 0));
    for (let i = 0; i < 26; i++) g.add(ball(0.05, 0.04, 0.05, colorMat(0xfff1c4), -0.28 + (i % 6) * 0.11, 0.95 + Math.floor(i / 6) * 0.06, -0.15 + ((i * 7) % 4) * 0.1, 5));
    for (let i = 0; i < 6; i++) g.add(box(0.14, 0.04, 0.7, i % 2 ? white() : red, -0.35 + i * 0.14, 1.65, 0));
    for (const sx of [-0.38, 0.38]) g.add(rod([sx, 1.42, 0.25], [sx, 1.66, 0.25], 0.015, chrome()));
    return { group: g };
  },
};

/** Balcão do bar: madeira escura, tampo envernizado, torneiras de chope, garrafas na prateleira e três banquetas. */
const barcounter: FurnitureSpec = {
  sit: [-1.2, 0, 1.2].map((x) => ({ x, y: 0.66, z: 0.62, heading: Math.PI })),
  build() {
    const wood = walnut();
    const g = group(rbox(3.9, 1.0, 0.55, 0.03, wood, 0, 0, -0.1), box(4.0, 0.06, 0.68, texMat('walnut', { gloss: 0.9 }), 0, 1.0, -0.06));
    // prateleira de garrafas atrás
    g.add(box(3.9, 0.04, 0.2, pine(), 0, 1.7, -0.42), box(3.9, 0.04, 0.2, pine(), 0, 2.1, -0.42));
    for (let i = 0; i < 14; i++) {
      const x = -1.8 + i * 0.27;
      const col = colorMat(PRODUCT[i % PRODUCT.length], { gloss: 0.9, opacity: 0.8 });
      g.add(cyl(0.03, 0.05, 0.28, 8, col, x, 1.74, -0.42), cyl(0.03, 0.05, 0.26, 8, col, x + 0.1, 2.14, -0.42));
    }
    for (const x of [-0.3, 0, 0.3]) g.add(rod([x, 1.06, -0.25], [x, 1.32, -0.25], 0.025, chrome()), rod([x, 1.32, -0.25], [x, 1.32, -0.12], 0.02, chrome()));
    // banquetas
    for (const x of [-1.2, 0, 1.2]) {
      g.add(cyl(0.2, 0.2, 0.08, 14, colorMat(0x8e1f1f, { gloss: 0.4 }), x, 0.6, 0.62), rod([x, 0, 0.62], [x, 0.6, 0.62], 0.03, chrome()), cyl(0.18, 0.18, 0.02, 12, chrome(), x, 0, 0.62));
    }
    return { group: g };
  },
};

/** Palco: tablado de madeira, bateria, amplificador, pedestal de microfone e um violão encostado. */
const stage: FurnitureSpec = {
  stand: { x: 0, y: 0.35, z: 0.35, heading: 0 },
  build() {
    const g = group(box(3, 0.35, 2, texMat('wood', { gloss: 0.35 }), 0, 0, 0), box(3, 0.06, 0.06, colorMat(0xd9a441), 0, 0.3, 1.0));
    // bateria
    const shell = colorMat(0x2f7fc4, { gloss: 0.8 });
    const skin = colorMat(0xf2ede2);
    g.add(cyl(0.3, 0.3, 0.25, 14, shell, -0.8, 0.35, -0.55));
    const kick = cyl(0.3, 0.3, 0.3, 14, shell, -0.8, 0.65, -0.55);
    kick.rotation.x = Math.PI / 2;
    g.add(kick, cyl(0.18, 0.18, 0.14, 12, shell, -0.45, 0.8, -0.4), cyl(0.17, 0.17, 0.01, 12, skin, -0.45, 0.94, -0.4));
    g.add(rod([-1.15, 0.35, -0.35], [-1.15, 1.25, -0.35], 0.015, chrome()), cyl(0.22, 0.22, 0.01, 14, colorMat(0xd9b441, { gloss: 1 }), -1.15, 1.25, -0.35));
    // amplificador
    g.add(rbox(0.6, 0.7, 0.35, 0.03, colorMat(0x1e1f22, { gloss: 0.3 }), 0.95, 0.35, -0.6), box(0.5, 0.5, 0.02, colorMat(0x3a3d42), 0.95, 0.42, -0.42));
    // microfone
    g.add(rod([0, 0.35, 0.55], [0, 1.45, 0.55], 0.015, iron()), ball(0.04, 0.05, 0.04, colorMat(0x8a8d92, { gloss: 0.9 }), 0, 1.5, 0.55, 8));
    // luzes no alto
    for (const sx of [-1.3, 1.3]) g.add(rod([sx, 0.35, -0.9], [sx, 2.6, -0.9], 0.03, iron()), cyl(0.1, 0.14, 0.2, 10, colorMat(0xffe08a, { emissive: 0xffc040, emissiveIntensity: 0.7 }), sx, 2.45, -0.75));
    return { group: g };
  },
};

/** Trapiche: tábuas sobre estacas avançando para dentro da água, com um balde. */
const pier: FurnitureSpec = {
  stand: { x: 0, y: 0.12, z: -0.75, heading: Math.PI },
  build() {
    const wood = pine();
    const g = new THREE.Group();
    for (let i = 0; i < 9; i++) g.add(box(0.95, 0.06, 0.2, wood, 0, 0.06, 0.4 - i * 0.22));
    for (const sx of [-0.42, 0.42]) for (const z of [0.3, -0.6, -1.4]) g.add(cyl(0.06, 0.06, 0.8, 8, texMat('walnut'), sx, -0.7, z));
    g.add(cyl(0.12, 0.1, 0.2, 10, colorMat(0x7f9bb8, { gloss: 0.7 }), 0.3, 0.12, 0.2));
    // vara de pesca encostada
    g.add(rod([-0.35, 0.12, 0.3], [-0.35, 1.6, -1.0], 0.012, colorMat(0x6b3a22)));
    return { group: g };
  },
};

/**
 * Plano 2, bloco 14: barraca da praça. Bancada de madeira com caixotes de
 * frutas e verduras, quatro paus e toldo listrado (a mesma barraca serve a
 * feira de sábado e os quitutes da festa junina).
 */
const fairstall: FurnitureSpec = {
  build(seed) {
    const wood = pine();
    const g = group(box(1.85, 0.08, 0.75, wood, 0, 0.8, 0), box(1.8, 0.75, 0.04, wood, 0, 0.05, 0.33));
    for (const sx of [-0.88, 0.88]) for (const sz of [-0.33, 0.33]) g.add(box(0.06, 2.1, 0.06, texMat('walnut'), sx, 0, sz));
    // toldo listrado, caindo um pouco para a frente
    const stripes = [[0xc9382f, 0xf2ede2], [0x2f7fc4, 0xf2ede2], [0x3f9455, 0xf4d03f]][seed % 3];
    for (let i = 0; i < 8; i++) {
      const strip = box(0.24, 0.04, 1.05, colorMat(stripes[i % 2], { gloss: 0.2 }), -0.84 + i * 0.24, 2.12, 0.05);
      strip.rotation.x = 0.12;
      g.add(strip);
    }
    // caixotes com frutas e verduras
    let k = seed + 7;
    for (const x of [-0.6, 0, 0.6]) {
      g.add(box(0.5, 0.18, 0.4, texMat('pine'), x, 0.88, 0.05));
      for (let j = 0; j < 6; j++) {
        k = (k * 1103515245 + 12345) & 0x7fffffff;
        const col = [0xd9452f, 0xe8b830, 0x5f9e3a, 0xd27a2a, 0x7d55ad][(k >>> 16) % 5];
        g.add(ball(0.07, 0.07, 0.07, colorMat(col, { gloss: 0.5 }), x - 0.16 + (j % 3) * 0.16, 1.1, j < 3 ? -0.04 : 0.12, 8));
      }
    }
    // plaquinha de preço
    g.add(box(0.36, 0.2, 0.02, colorMat(0x2b2b2b), 0.62, 1.25, 0.32), box(0.3, 0.04, 0.025, colorMat(0xf2ede2), 0.62, 1.32, 0.33));
    return { group: g };
  },
};

export const PLACE_ART: Record<string, FurnitureSpec> = {
  fairstall,
  gondola,
  checkout,
  bandstand,
  treadmill,
  cinescreen,
  cineseats,
  popcorn,
  barcounter,
  stage,
  pier,
};


