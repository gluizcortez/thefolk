import * as THREE from 'three';
import { ball, box, colorMat, cyl, fronted, rbox, rod, texMat } from './build';
import type { FurnitureSpec } from './furniture';
import { chair, group } from './furniture';
import { seeded } from './palette';
import { getTexture } from './textures';

// Plano 2, bloco 7: modelos dos objetos novos do lazer e do estudo (o
// computador de mesa com monitor de tubo, o violão no suporte, o tapete de
// ioga e a caixa de blocos). Tudo de peças de montar, como o resto.

const plastic = () => colorMat(0xd8d2c0, { gloss: 0.45 });

/** Tela que troca de imagem pelo que o folk está fazendo (navegar, jogar, escrever...). */
function pcScreen(): { mat: THREE.MeshPhongMaterial; tick(time: number, mode: string | undefined): void } {
  const off = getTexture('pc:off:0');
  const mat = new THREE.MeshPhongMaterial({ map: off, emissive: 0xffffff, emissiveMap: off, emissiveIntensity: 0, specular: 0x555555, shininess: 60 });
  return {
    mat,
    tick(time, mode) {
      const frames = mode === 'game' ? 2 : mode === 'text' || mode === 'code' ? 3 : 2;
      const step = mode === 'game' ? 0.45 : mode === 'text' || mode === 'code' ? 1.6 : 2.2;
      const map = mode ? getTexture(`pc:${mode}:${Math.floor(time / step) % frames}`) : off;
      if (mat.map !== map) {
        mat.map = map;
        mat.emissiveMap = map;
      }
      mat.emissiveIntensity = mode ? 0.7 + Math.sin(time * 21) * 0.04 : 0;
    },
  };
}

const computer: FurnitureSpec = {
  sit: [{ x: 0, y: 0.47, z: 0.34, heading: Math.PI }],
  build() {
    const oak = texMat('oak', { gloss: 0.35, color: 0xd8c8a8 });
    const beige = plastic();
    const scr = pcScreen();
    const seat = chair(colorMat(0x3a4a6b, { gloss: 0.6 }));
    seat.position.set(0, 0, 0.36);
    seat.rotation.y = Math.PI;
    const g = group(
      seat,
      rbox(1.5, 0.05, 0.62, 0.02, oak, 0, 0.72, -0.15),
      box(0.05, 0.72, 0.56, oak, -0.7, 0, -0.15),
      box(0.05, 0.72, 0.56, oak, 0.7, 0, -0.15),
      box(1.3, 0.3, 0.02, oak, 0, 0.42, -0.44),
      // monitor de tubo: caixa funda atrás, moldura e a tela
      rbox(0.5, 0.42, 0.42, 0.05, beige, -0.05, 0.79, -0.27),
      rbox(0.36, 0.32, 0.18, 0.06, beige, -0.05, 0.84, -0.46),
      box(0.42, 0.32, 0.02, fronted(beige, scr.mat), -0.05, 0.84, -0.05),
      rbox(0.22, 0.04, 0.2, 0.01, beige, -0.05, 0.77, -0.25),
      // teclado, mouse no tapetinho e o gabinete embaixo
      rbox(0.46, 0.03, 0.15, 0.01, beige, -0.05, 0.77, 0.04),
      box(0.42, 0.006, 0.11, texMat('keys', { color: 0xbab4a2 }), -0.05, 0.8, 0.04),
      box(0.2, 0.005, 0.16, colorMat(0x2c55a6), 0.34, 0.77, 0.02),
      rbox(0.05, 0.025, 0.08, 0.012, beige, 0.34, 0.776, 0.02),
      rbox(0.2, 0.48, 0.46, 0.02, beige, 0.5, 0.02, -0.18),
      box(0.14, 0.02, 0.005, colorMat(0x3a3d44), 0.5, 0.36, 0.05),
      box(0.03, 0.02, 0.005, colorMat(0x3f9455, { emissive: 0x3f9455, emissiveIntensity: 0.5 }), 0.46, 0.3, 0.052),
      // caixas de disquete e uma caneca
      box(0.12, 0.06, 0.14, colorMat(0x2a2a30), 0.55, 0.77, -0.3),
      cyl(0.035, 0.035, 0.09, 10, colorMat(0xc9382f, { gloss: 0.6 }), -0.55, 0.77, -0.2),
    );
    const led = box(0.02, 0.012, 0.005, colorMat(0xffd040, { emissive: 0xffd040, emissiveIntensity: 0 }), 0.54, 0.3, 0.052);
    g.add(led);
    return {
      group: g,
      tick({ time, screen }) {
        scr.tick(time, screen);
        const m = led.material as THREE.MeshPhongMaterial;
        m.emissiveIntensity = screen && Math.sin(time * 17) > 0.3 ? 1 : 0;
      },
    };
  },
};

/** Violão encostado no suporte; quando alguém toca, só o suporte fica. */
const guitar: FurnitureSpec = {
  build() {
    const metal = colorMat(0x2a2b2e, { gloss: 0.5 });
    const spruce = colorMat(0xd9a45a, { gloss: 0.6 });
    const rim = colorMat(0x6b3a1e, { gloss: 0.5 });
    const g = group(
      rod([-0.15, 0, 0.12], [0, 0.34, -0.05], 0.012, metal),
      rod([0.15, 0, 0.12], [0, 0.34, -0.05], 0.012, metal),
      rod([0, 0, -0.2], [0, 0.34, -0.05], 0.012, metal),
      rod([-0.14, 0.1, 0.1], [0.14, 0.1, 0.1], 0.012, metal),
    );
    const inst = group(
      cyl(0.17, 0.17, 0.09, 16, [rim, spruce, rim], 0, 0.3, 0),
      cyl(0.13, 0.13, 0.09, 16, [rim, spruce, rim], 0, 0.52, 0),
      cyl(0.045, 0.045, 0.092, 12, colorMat(0x1b1310), 0, 0.42, 0),
      box(0.05, 0.42, 0.03, colorMat(0x3a2414, { gloss: 0.4 }), 0, 0.68, 0),
      box(0.08, 0.1, 0.035, colorMat(0x2a1a10), 0, 1.1, 0),
    );
    // as peças do corpo vêm deitadas (cilindro em pé): gira para a tampa olhar para a frente
    for (const m of inst.children.slice(0, 3)) m.rotation.x = Math.PI / 2;
    inst.rotation.x = -0.22;
    inst.position.set(0, 0.04, 0.06);
    g.add(inst);
    return {
      group: g,
      tick({ using }) {
        inst.visible = !using;
      },
    };
  },
};

/** Tapete de ioga com a ponta enrolada e uma toalhinha. */
const yogamat: FurnitureSpec = {
  stand: { x: 0, y: 0.012, z: 0.05, heading: 0 },
  build(seed) {
    const tones = [0x7d55ad, 0x2c8a8a, 0xd8642a, 0x3f9455];
    const tone = tones[Math.floor(seeded(seed + 3)() * tones.length)];
    const mat = colorMat(tone, { gloss: 0.3 });
    const g = group(box(0.62, 0.012, 0.92, mat, 0, 0, 0.04), cyl(0.06, 0.06, 0.62, 12, mat, 0, 0.06, -0.44));
    (g.children[1] as THREE.Mesh).rotation.z = Math.PI / 2;
    (g.children[1] as THREE.Mesh).position.set(-0.31, 0.06, -0.44);
    g.add(rbox(0.2, 0.03, 0.12, 0.01, colorMat(0xf4efdf), 0.24, 0.012, -0.32));
    return { group: g };
  },
};

/** Caixa de blocos de madeira, tampa aberta; brincando, a torre cresce na frente. */
const toybox: FurnitureSpec = {
  build(seed) {
    const pine = texMat('pine', { gloss: 0.2 });
    const g = group(
      box(0.6, 0.36, 0.5, pine, 0, 0, -0.1),
      box(0.56, 0.02, 0.46, colorMat(0x5a3a22), 0, 0.34, -0.1),
    );
    const lid = box(0.6, 0.03, 0.5, pine, 0, 0, 0);
    const hinge = new THREE.Group();
    hinge.position.set(0, 0.36, -0.35);
    lid.position.set(0, 0, 0.25);
    hinge.add(lid);
    hinge.rotation.x = -1.9;
    g.add(hinge);
    const colors = [0xc9382f, 0x2c55a6, 0xe8b830, 0x3f9455, 0xe07a2c];
    const rnd = seeded(seed + 11);
    for (let i = 0; i < 6; i++) {
      const b = box(0.09, 0.09, 0.09, colorMat(colors[i % colors.length], { gloss: 0.4 }), (rnd() - 0.5) * 0.4, 0.3, -0.1 + (rnd() - 0.5) * 0.3);
      b.rotation.y = rnd();
      g.add(b);
    }
    const tower: THREE.Mesh[] = [];
    for (let i = 0; i < 5; i++) {
      const b = box(0.1, 0.1, 0.1, colorMat(colors[(i + 2) % colors.length], { gloss: 0.4 }), 0, i * 0.1, 0.58);
      b.rotation.y = (i % 2) * 0.4;
      b.visible = false;
      tower.push(b);
      g.add(b);
    }
    g.add(ball(0.06, 0.06, 0.06, colorMat(0xc9382f, { gloss: 0.6 }), 0.32, 0.06, 0.32, 10));
    return {
      group: g,
      tick({ time, using }) {
        const n = using ? 1 + Math.floor((time / 2.2) % 5) : 0;
        tower.forEach((b, i) => (b.visible = i < n));
      },
    };
  },
};

export const HOBBY_ART: Record<string, FurnitureSpec> = { computer, guitar, yogamat, toybox };

/** Plano 2, bloco 7: material da tela do cavalete, que mostra o quadro avançando. */
export function easelCanvas(): { mat: THREE.MeshPhongMaterial; set(seed: number | undefined, progress: number): void } {
  const blank = colorMat(0xf6f0e0, { unique: true });
  let key = '';
  return {
    mat: blank,
    set(seed, progress) {
      const stage = seed === undefined ? -1 : Math.min(10, Math.floor(progress / 10));
      const k = `${seed}:${stage}`;
      if (k === key) return;
      key = k;
      if (stage < 0) {
        blank.map = null;
        blank.color.setHex(0xf6f0e0);
      } else {
        blank.map = getTexture(`easel:${seed}:${stage}`);
        blank.color.setHex(0xffffff);
      }
      blank.needsUpdate = true;
    },
  };
}
