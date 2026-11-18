import * as THREE from 'three';
import { ball, box, colorMat, cyl, lathe, rbox, rod, texMat } from './build';
import type { FurnitureSpec } from './furniture';
import { PAL } from './palette';

// Bloco 14: extintor de parede no pé, detector de fumaça no teto, alarme
// contra gatuno na parede (pisca quando dispara), lareira de tijolinho (chamas
// quando acesa), lápide de granito com flores e urna de louça num pedestal.
// Os modelos seguem a mesma regra dos outros: centro na base, frente para +z.

const WALL_FACE = -0.5 + 0.09;

function group(...parts: THREE.Object3D[]): THREE.Group {
  const g = new THREE.Group();
  if (parts.length) g.add(...parts);
  return g;
}

const extinguisher: FurnitureSpec = {
  build() {
    const red = colorMat(0xc8261e, { gloss: 0.85 });
    const black = colorMat(0x1c1c20, { gloss: 0.4 });
    const g = group(
      // suporte de parede atrás
      box(0.26, 0.5, 0.03, colorMat(0x9aa0a6, { gloss: 0.7 }), 0, 0.22, -0.36),
      cyl(0.11, 0.11, 0.56, 14, red, 0, 0.02, -0.25),
      ball(0.11, 0.07, 0.11, red, 0, 0.58, -0.25, 12),
      cyl(0.04, 0.04, 0.08, 8, black, 0, 0.62, -0.25),
      rod([0.02, 0.68, -0.25], [0.12, 0.66, -0.19], 0.012, black, 6),
      rod([0, 0.66, -0.25], [0.1, 0.3, -0.12], 0.014, black, 6),
      // etiqueta
      box(0.16, 0.18, 0.012, colorMat(0xf1ece0), 0, 0.22, -0.14),
      box(0.12, 0.03, 0.013, colorMat(0xc8261e), 0, 0.33, -0.138),
    );
    return { group: g };
  },
};

const smokealarm: FurnitureSpec = {
  build() {
    const white = colorMat(0xf1eee6, { gloss: 0.6 });
    const led = colorMat(0x3a1414, { emissive: 0xff2a1a, emissiveIntensity: 0, unique: true });
    const g = group(
      cyl(0.16, 0.14, 0.05, 16, white, 0, 2.5, 0),
      cyl(0.11, 0.11, 0.015, 16, colorMat(0xd8d3c6), 0, 2.485, 0),
      ball(0.018, 0.012, 0.018, led, 0.08, 2.49, 0.04, 6),
    );
    return {
      group: g,
      tick({ time, alarm }) {
        // pisca devagar de rotina e ligeiro quando sente fumaça
        led.emissiveIntensity = alarm ? (Math.sin(time * 18) > 0 ? 1.4 : 0.1) : Math.sin(time * 1.2) > 0.96 ? 0.9 : 0;
      },
    };
  },
};

const burglaralarm: FurnitureSpec = {
  build() {
    const case_ = colorMat(0xe6e1d4, { gloss: 0.6 });
    const lamp = colorMat(0x5a1810, { emissive: 0xff3a1a, emissiveIntensity: 0, unique: true });
    const g = group(
      rbox(0.34, 0.26, 0.06, 0.02, case_, 0, 1.45, WALL_FACE + 0.03),
      box(0.22, 0.1, 0.012, colorMat(0x2a3a2e, { emissive: 0x2a6a3a, emissiveIntensity: 0.4 }), 0, 1.56, WALL_FACE + 0.065),
      // teclado
      box(0.2, 0.08, 0.01, colorMat(0x9aa0a6), 0, 1.47, WALL_FACE + 0.065),
      ball(0.04, 0.04, 0.03, lamp, 0.12, 1.75, WALL_FACE + 0.04, 10),
    );
    return {
      group: g,
      tick({ time, alarm }) {
        lamp.emissiveIntensity = alarm ? (Math.sin(time * 14) > 0 ? 1.6 : 0.15) : 0.08;
      },
    };
  },
};

/** Chamas: cones e gotas laranja e amarelas que tremem (as mesmas do fogo solto). */
export function flames(scale: number, seed: number): { group: THREE.Group; tick(time: number, heat: number): void } {
  const g = new THREE.Group();
  const outer = colorMat(0xff6a1a, { emissive: 0xff4a10, emissiveIntensity: 1, unique: true, opacity: 0.92 });
  const inner = colorMat(0xffd84a, { emissive: 0xffc030, emissiveIntensity: 1.1, unique: true });
  const tongues: { mesh: THREE.Mesh; phase: number; base: number }[] = [];
  const n = 5;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + seed;
    const r = i === 0 ? 0 : 0.16 * scale;
    const h = (i === 0 ? 0.75 : 0.45 + ((seed * 7 + i * 3) % 5) * 0.06) * scale;
    const cone = new THREE.Mesh(new THREE.ConeGeometry(0.13 * scale, h, 7), i === 0 ? inner : outer);
    cone.position.set(Math.cos(a) * r, h / 2, Math.sin(a) * r);
    g.add(cone);
    tongues.push({ mesh: cone, phase: seed * 1.7 + i * 1.3, base: h });
  }
  g.traverse((o) => {
    o.castShadow = false;
    o.receiveShadow = false;
  });
  return {
    group: g,
    tick(time, heat) {
      const k = 0.35 + 0.65 * Math.min(1, heat / 100);
      for (const t of tongues) {
        const flick = 0.75 + 0.25 * Math.sin(time * 11 + t.phase) + 0.12 * Math.sin(time * 23 + t.phase * 2);
        t.mesh.scale.set(k, k * flick, k);
        t.mesh.position.y = (t.base * k * flick) / 2;
      }
      outer.emissiveIntensity = 0.8 + 0.3 * Math.sin(time * 9 + seed);
    },
  };
}

const fireplace: FurnitureSpec = {
  stand: { x: 0, y: 0, z: 0.85, heading: Math.PI },
  build() {
    const brick = texMat('wallExterior', { color: 0xd88a6a });
    const stone = texMat('stone', { color: 0xcfc6b8 });
    const soot = colorMat(0x1a1514);
    const g = group(
      // corpo de tijolinho com a boca escura no meio
      box(1.9, 1.15, 0.6, brick, 0, 0, -0.18),
      box(0.9, 0.62, 0.02, soot, 0, 0.12, 0.125),
      // consolo de pedra e a chaminé subindo
      box(2.05, 0.08, 0.72, stone, 0, 1.15, -0.14),
      box(1.1, 1.4, 0.5, brick, 0, 1.23, -0.24),
      // soleira
      box(1.6, 0.06, 0.42, stone, 0, 0, 0.28),
    );
    // lenha
    const wood = colorMat(0x6a4024);
    const log1 = cyl(0.06, 0.06, 0.6, 8, wood, 0, 0, 0);
    log1.rotation.z = Math.PI / 2;
    log1.position.set(0, 0.12, 0.24);
    const log2 = cyl(0.055, 0.055, 0.55, 8, wood, 0, 0, 0);
    log2.rotation.z = Math.PI / 2;
    log2.rotation.y = 0.4;
    log2.position.set(0.02, 0.19, 0.22);
    g.add(log1, log2);
    // enfeites no consolo
    g.add(lathe([[0.04, 0], [0.06, 0.08], [0.03, 0.2], [0.05, 0.24]], 10, colorMat(PAL.brass, { gloss: 0.9 }), -0.7, 1.23, -0.1));
    g.add(rbox(0.22, 0.28, 0.06, 0.02, colorMat(0x4a3220, { gloss: 0.5 }), 0.62, 1.23, -0.2));
    // a lenha e as chamas ficam na soleira, rente à boca (dentro do tijolo não apareciam)
    const fire = flames(0.55, 3);
    fire.group.position.set(0, 0.12, 0.23);
    const glow = new THREE.PointLight(0xff9a40, 0, 5, 1.6);
    glow.position.set(0, 0.5, 0.4);
    g.add(fire.group, glow);
    return {
      group: g,
      tick({ time, lit }) {
        fire.group.visible = !!lit;
        if (lit) fire.tick(time, 70);
        glow.intensity = lit ? 2.2 + 0.5 * Math.sin(time * 7) : 0;
      },
    };
  },
};

const grave: FurnitureSpec = {
  build(seed) {
    const granite = texMat('marble', { color: 0x8c8a90 });
    const g = group(
      // pedra arredondada em cima, base e uma moldura de jardim
      rbox(0.5, 0.62, 0.12, 0.06, granite, 0, 0.12, -0.12),
      ball(0.25, 0.12, 0.06, granite, 0, 0.74, -0.12, 14),
      box(0.62, 0.12, 0.3, texMat('stone', { color: 0xb8b0a4 }), 0, 0, -0.1),
      box(0.56, 0.05, 0.5, colorMat(0x5a4632), 0, 0, 0.18),
      // plaquinha clara
      box(0.32, 0.18, 0.01, colorMat(0xe7dfc8, { gloss: 0.4 }), 0, 0.42, -0.055),
    );
    // flores no pé
    const colors = [0xd9483f, 0xf2c94c, 0xf3efe2, 0xb06ac0];
    for (let i = 0; i < 5; i++) {
      const c = colors[(seed + i) % colors.length];
      const x = -0.2 + i * 0.1;
      g.add(rod([x, 0.05, 0.2], [x, 0.18, 0.22], 0.006, colorMat(0x3f7a32), 4), ball(0.03, 0.025, 0.03, colorMat(c), x, 0.19, 0.22, 6));
    }
    return { group: g };
  },
};

const urn: FurnitureSpec = {
  build() {
    const china = colorMat(0x2c4c7a, { gloss: 0.9 });
    const gold = colorMat(PAL.brass, { gloss: 1 });
    const g = group(
      // pedestal de madeira escura
      box(0.42, 0.8, 0.42, texMat('walnut'), 0, 0, 0),
      box(0.48, 0.04, 0.48, texMat('walnut'), 0, 0.8, 0),
      lathe(
        [
          [0.08, 0],
          [0.13, 0.05],
          [0.15, 0.16],
          [0.11, 0.3],
          [0.07, 0.34],
          [0.09, 0.38],
        ],
        14,
        china,
        0,
        0.84,
        0,
      ),
      cyl(0.152, 0.152, 0.02, 14, gold, 0, 0.98, 0),
      ball(0.05, 0.035, 0.05, gold, 0, 1.25, 0, 8),
      // retratinho do lado
      rbox(0.12, 0.15, 0.02, 0.01, gold, 0.14, 0.84, 0.12),
    );
    return { group: g };
  },
};

export const PERIL_ART: Record<string, FurnitureSpec> = {
  extinguisher,
  smokealarm,
  burglaralarm,
  fireplace,
  grave,
  urn,
};
