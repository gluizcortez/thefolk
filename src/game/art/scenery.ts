import * as THREE from 'three';
import type { Grid } from '../../sim';
import { ball, box, colorMat, cyl, lathe, rbox, rod, setShadows, texMat, tileUV } from './build';
import { PAL, seeded } from './palette';

// Tudo que fica em volta do terreno e é só cenário: gramado, calçada, rua,
// cerca, árvores e as casas dos vizinhos. Nada daqui existe na simulação.

function tree(x: number, z: number, s: number, rnd: () => number): THREE.Group {
  const g = new THREE.Group();
  const leaves = texMat('treeLeaves');
  g.add(cyl(0.11 * s, 0.2 * s, 1.4 * s, 8, texMat('bark')));
  const clumps: [number, number, number, number][] = [
    [0, 2.0, 0, 0.95],
    [0.5, 1.6, 0.25, 0.7],
    [-0.45, 1.65, -0.3, 0.74],
    [0.1, 2.6, -0.1, 0.62],
    [-0.2, 1.5, 0.45, 0.55],
  ];
  for (const [dx, dy, dz, r] of clumps) {
    const clump = new THREE.Mesh(new THREE.IcosahedronGeometry(r * s, 2), leaves);
    clump.position.set(dx * s, dy * s, dz * s);
    clump.rotation.set(rnd() * 6, rnd() * 6, 0);
    clump.scale.y = 0.85;
    tileUV(clump, 3, 3);
    g.add(clump);
  }
  g.position.set(x, 0, z);
  return g;
}

function bush(x: number, z: number, s: number): THREE.Mesh {
  const m = new THREE.Mesh(new THREE.IcosahedronGeometry(0.45 * s, 2), texMat('treeLeaves', { color: 0xc8e8b8 }));
  tileUV(m, 2, 2);
  m.scale.y = 0.75;
  m.position.set(x, 0.25 * s, z);
  return m;
}

/** Canteiro de flores: planos cruzados, como a folhagem dos vasos. */
function flowerBed(x: number, z: number, len: number, alongX: boolean): THREE.Group {
  const g = new THREE.Group();
  const mat = texMat('flowers', { alphaTest: 0.5, doubleSide: true });
  const soil = box(alongX ? len : 0.5, 0.05, alongX ? 0.5 : len, colorMat(0x4a3423));
  g.add(soil);
  for (const off of [-0.12, 0.12]) {
    const card = new THREE.Mesh(new THREE.PlaneGeometry(len, 0.55), mat);
    tileUV(card, len / 0.9, 1);
    card.position.set(alongX ? 0 : off, 0.3, alongX ? off : 0);
    card.rotation.y = alongX ? 0 : Math.PI / 2;
    g.add(card);
  }
  const n = Math.round(len / 0.45);
  for (let i = 0; i < n; i++) {
    const cross = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.55), mat);
    tileUV(cross, 0.55, 1);
    const t = -len / 2 + ((i + 0.5) * len) / n;
    cross.position.set(alongX ? t : 0, 0.3, alongX ? 0 : t);
    cross.rotation.y = alongX ? Math.PI / 2 : 0;
    g.add(cross);
  }
  g.position.set(x, 0, z);
  return g;
}

/** Carro estacionado na rua, com a frente para +x. */
function car(x: number, z: number, color: number): THREE.Group {
  const g = new THREE.Group();
  const paint = colorMat(color, { gloss: 0.9 });
  const steel = texMat('chrome', { gloss: 1 });
  const glass = texMat('carGlass', { gloss: 0.9 });
  const tire = colorMat(0x1b1b1e);
  g.add(
    rbox(4.1, 0.55, 1.7, 0.16, paint, 0, 0.3, 0),
    rbox(2.1, 0.55, 1.5, 0.2, paint, -0.25, 0.8, 0),
    box(1.5, 0.36, 1.52, [paint, paint, paint, paint, glass, glass], -0.25, 0.88, 0),
    box(2.02, 0.36, 1.3, [glass, glass, paint, paint, paint, paint], -0.25, 0.88, 0),
    rbox(0.1, 0.14, 1.74, 0.04, steel, 2.06, 0.34, 0),
    rbox(0.1, 0.14, 1.74, 0.04, steel, -2.06, 0.34, 0),
    box(0.02, 0.1, 0.5, colorMat(0xf4efdf), -2.07, 0.4, 0),
  );
  for (const sz of [-1, 1]) {
    g.add(
      ball(0.05, 0.1, 0.14, colorMat(0xfff3c0, { emissive: 0xfff3c0, emissiveIntensity: 0.3 }), 2.04, 0.62, sz * 0.58, 8),
      ball(0.04, 0.08, 0.12, colorMat(0xc9382f, { gloss: 0.8 }), -2.04, 0.62, sz * 0.6, 8),
      rod([-1.0, 0.72, sz * 0.86], [0.6, 0.72, sz * 0.86], 0.012, steel, 6),
    );
    for (const sx of [-1.25, 1.3]) {
      const wheel = cyl(0.34, 0.34, 0.22, 14, tire, sx, 0, sz * 0.78);
      wheel.rotation.x = Math.PI / 2;
      wheel.position.y = 0.34;
      const hub = cyl(0.18, 0.18, 0.02, 12, steel, sx, 0, sz * 0.9);
      hub.rotation.x = Math.PI / 2;
      hub.position.y = 0.34;
      g.add(wheel, hub);
    }
  }
  g.position.set(x, 0.02, z);
  return g;
}

function streetLamp(x: number, z: number): THREE.Group {
  const g = new THREE.Group();
  const iron = colorMat(0x24332c, { gloss: 0.4 });
  g.add(
    lathe(
      [
        [0.16, 0],
        [0.16, 0.06],
        [0.08, 0.2],
        [0.05, 0.5],
      ],
      10,
      iron,
    ),
    rod([0, 0.4, 0], [0, 3.4, 0], 0.045, iron),
    rod([0, 3.3, 0], [0, 3.45, 0.7], 0.03, iron),
    box(0.2, 0.06, 0.36, iron, 0, 3.44, 0.7),
    box(0.16, 0.08, 0.3, colorMat(0xfff0b8, { emissive: 0xffd98a, emissiveIntensity: 0.7 }), 0, 3.36, 0.7),
  );
  g.position.set(x, 0, z);
  return g;
}

function trashCan(x: number, z: number): THREE.Group {
  const g = new THREE.Group();
  const tin = texMat('chrome', { color: 0x9aa3a8, gloss: 0.5 });
  g.add(cyl(0.24, 0.2, 0.62, 12, tin), cyl(0.26, 0.26, 0.05, 12, tin, 0, 0.62, 0), ball(0.2, 0.08, 0.2, tin, 0, 0.68, 0, 10), rod([-0.06, 0.76, 0], [0.06, 0.76, 0], 0.012, colorMat(0x26262b), 6));
  for (let y = 0.12; y < 0.6; y += 0.16) g.add(cyl(0.245 - (0.6 - y) * 0.06, 0.245 - (0.6 - y) * 0.06, 0.015, 12, colorMat(0x6c7377), 0, y, 0, true));
  g.position.set(x, 0, z);
  return g;
}

/** Banco de jardim de ripas, com a frente para +z. */
function bench(x: number, z: number, turn: number): THREE.Group {
  const g = new THREE.Group();
  const wood = texMat('pine');
  const iron = colorMat(0x24332c, { gloss: 0.4 });
  for (let i = 0; i < 4; i++) g.add(box(1.5, 0.03, 0.09, wood, 0, 0.42, -0.15 + i * 0.105));
  for (let i = 0; i < 3; i++) {
    const slat = box(1.5, 0.09, 0.03, wood, 0, 0.56 + i * 0.12, -0.24 - i * 0.03);
    g.add(slat);
  }
  for (const sx of [-0.68, 0.68]) {
    g.add(rod([sx, 0, 0.18], [sx, 0.43, 0.16], 0.025, iron), rod([sx, 0, -0.22], [sx, 0.92, -0.32], 0.025, iron), rod([sx, 0.62, -0.26], [sx, 0.62, 0.18], 0.02, iron));
  }
  g.position.set(x, 0, z);
  g.rotation.y = turn;
  return g;
}

function birdbath(x: number, z: number): THREE.Group {
  const g = new THREE.Group();
  const stoneMat = texMat('stone');
  g.add(
    lathe(
      [
        [0.2, 0],
        [0.2, 0.05],
        [0.08, 0.1],
        [0.06, 0.6],
        [0.12, 0.66],
        [0.34, 0.74],
        [0.36, 0.8],
      ],
      14,
      stoneMat,
    ),
    cyl(0.31, 0.31, 0.01, 14, colorMat(0x8fcfe6, { gloss: 0.9 }), 0, 0.775, 0),
    ball(0.045, 0.04, 0.07, colorMat(0xc9382f), 0.26, 0.86, 0.1, 8),
    ball(0.028, 0.028, 0.03, colorMat(0xc9382f), 0.26, 0.91, 0.16, 6),
  );
  g.position.set(x, 0, z);
  return g;
}

/** Varal com roupa estendida, ao longo de z. */
function clothesline(x: number, z0: number, z1: number): THREE.Group {
  const g = new THREE.Group();
  const wood = texMat('pine');
  for (const z of [z0, z1]) g.add(box(0.08, 1.8, 0.08, wood, x, 0, z), box(0.9, 0.07, 0.07, wood, x, 1.73, z));
  for (const dx of [-0.36, 0.36]) g.add(rod([x + dx, 1.78, z0], [x + dx, 1.78, z1], 0.006, colorMat(0xe9e4d6), 4));
  const clothes: [number, number, number, number][] = [
    [0.36, 0.5, 0.6, 0xf4efdf],
    [0.36, 0.4, 0.45, 0x2f7fc4],
    [-0.36, 0.55, 0.7, 0xc9382f],
    [-0.36, 0.42, 0.42, 0xe8b830],
    [0.36, 0.34, 0.5, 0x3f9455],
  ];
  clothes.forEach(([dx, wdt, hgt, col], i) => {
    const zz = z0 + 0.5 + i * ((z1 - z0 - 1) / (clothes.length - 1));
    g.add(box(0.012, hgt, wdt, texMat('fabric', { color: col }), x + dx, 1.76 - hgt, zz));
  });
  return g;
}

function hydrant(x: number, z: number): THREE.Group {
  const g = new THREE.Group();
  const red = colorMat(0xc9382f, { gloss: 0.6 });
  g.add(
    lathe(
      [
        [0.13, 0],
        [0.13, 0.05],
        [0.09, 0.08],
        [0.09, 0.42],
        [0.11, 0.45],
        [0.08, 0.56],
        [0.03, 0.62],
      ],
      10,
      red,
    ),
    rod([-0.15, 0.32, 0], [0.15, 0.32, 0], 0.04, red),
    rod([0, 0.3, 0], [0, 0.3, 0.14], 0.045, red),
  );
  g.position.set(x, 0, z);
  return g;
}

function fence(x0: number, z0: number, x1: number, z1: number): THREE.Group {
  const g = new THREE.Group();
  const len = Math.hypot(x1 - x0, z1 - z0);
  const panel = new THREE.Mesh(
    new THREE.PlaneGeometry(len, 0.8),
    texMat('picket', { alphaTest: 0.5, doubleSide: true }),
  );
  tileUV(panel, len * 2, 1);
  panel.position.y = 0.4;
  g.add(panel);
  const n = Math.round(len / 2);
  for (let i = 0; i <= n; i++) g.add(box(0.09, 0.9, 0.09, colorMat(PAL.white), -len / 2 + (i * len) / n, 0, 0));
  g.position.set((x0 + x1) / 2, 0, (z0 + z1) / 2);
  g.rotation.y = -Math.atan2(z1 - z0, x1 - x0);
  return g;
}

function neighbor(x: number, z: number, w: number, d: number, variant: number, turn: number): THREE.Group {
  const g = new THREE.Group();
  const wallMat = texMat(`houseWall:${variant}`);
  const plain = colorMat([0xcf9f8f, 0xa9c29a, 0xd9c486][variant]);
  g.add(box(w, 2.7, d, [wallMat, wallMat, plain, plain, wallMat, wallMat]));
  const roofMesh = new THREE.Mesh(new THREE.ConeGeometry(1, 1.5, 4), texMat('roof'));
  roofMesh.rotation.y = Math.PI / 4;
  roofMesh.scale.set(w * 0.78, 1, d * 0.78);
  roofMesh.position.y = 2.7 + 0.75;
  g.add(roofMesh, box(0.4, 1.1, 0.4, colorMat(PAL.brick), w * 0.22, 2.9, 0));
  g.position.set(x, 0, z);
  g.rotation.y = turn;
  return g;
}

/**
 * `free(x, y)`: o tile do terreno está livre (grama e sem móvel)?
 * Enfeites do quintal só aparecem onde o jogador não construiu nada.
 */
export function buildScenery(grid: Grid, free: (x: number, y: number) => boolean = () => true): THREE.Group {
  const g = new THREE.Group();
  const rnd = seeded(77);
  const { w, h } = grid;

  // gramado enorme: o mesmo padrão cobre o terreno e o entorno
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(160, 160), texMat('grass'));
  tileUV(ground, 80, 80);
  ground.rotation.x = -Math.PI / 2;
  ground.position.set(w / 2, 0, h / 2);
  ground.receiveShadow = true;
  g.add(ground);

  // calçada e rua na frente (sul) do terreno
  const strip = (z0: number, z1: number, tex: string, y: number, rep: number) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(160, z1 - z0), texMat(tex));
    tileUV(m, 160 * rep, (z1 - z0) * rep);
    m.rotation.x = -Math.PI / 2;
    m.position.set(w / 2, y, (z0 + z1) / 2);
    m.receiveShadow = true;
    g.add(m);
  };
  const front = h + 1;
  strip(front, front + 1.4, 'sidewalk', 0.02, 1);
  strip(front + 1.4, front + 6.4, 'road', 0.015, 0.5);
  strip(front + 6.4, front + 7.8, 'sidewalk', 0.02, 1);
  g.add(box(160, 0.1, 0.12, colorMat(0x9a9588), w / 2, 0, front + 1.4));
  g.add(box(160, 0.1, 0.12, colorMat(0x9a9588), w / 2, 0, front + 6.4));
  for (let x = -70; x < 90; x += 3) g.add(box(1.4, 0.005, 0.14, colorMat(0xd9cf8a), x, 0.02, front + 3.9));

  // cerca de ripas nos fundos e nas laterais
  g.add(fence(-0.6, -0.6, w + 0.6, -0.6), fence(-0.6, -0.6, -0.6, h + 0.6), fence(w + 0.6, -0.6, w + 0.6, h + 0.6));

  // bloco 2: a caixa de correio virou objeto de verdade (data/objects.ts)

  // árvores, arbustos e vizinhos
  const trees: [number, number, number][] = [
    [-3.2, 2.5, 1.25],
    [-3.6, 10.5, 1.05],
    [5.5, -3.4, 1.3],
    [13.5, -3, 1.1],
    [w + 3.4, 3.5, 1.2],
    [w + 3, h - 1.5, 1],
    [-9, front + 9.5, 1.2],
    [9, front + 9.8, 1.3],
    [24, front + 9.4, 1.1],
  ];
  for (const [x, z, s] of trees) g.add(tree(x, z, s, rnd));
  for (let i = 0; i < 9; i++) g.add(bush(1 + i * 1.7 + rnd() * 0.5, -1.1 - rnd() * 0.3, 0.8 + rnd() * 0.5));
  for (let i = 0; i < 6; i++) g.add(bush(-1.2 - rnd() * 0.3, 1 + i * 2.2 + rnd() * 0.5, 0.8 + rnd() * 0.5));

  g.add(
    neighbor(2, -14, 7, 5, 0, 0),
    neighbor(15, -15, 6.5, 5.5, 1, 0),
    neighbor(-16, 5, 5.5, 7, 2, Math.PI / 2),
    neighbor(w + 17, 6, 5.5, 7, 0, -Math.PI / 2),
    neighbor(-2, front + 14, 7, 5, 1, Math.PI),
    neighbor(13, front + 14.5, 7, 5.5, 2, Math.PI),
  );

  // canteiros de flores encostados nas paredes de fora viradas para a rua
  for (const [key, kind] of Object.entries(grid.edges)) {
    if (kind === 'door') continue;
    const [xs, ys, side] = key.split(',');
    const x = Number(xs);
    const y = Number(ys);
    if (side !== 'N' || !free(x, y)) continue;
    if (grid.floor[(y - 1) * w + x] === 'grass') continue;
    g.add(flowerBed(x + 0.5, y + 0.45, 0.96, true));
  }

  // rua e calçada: carros, postes, lixeira e hidrante
  g.add(
    // bloco 8: a faixa da frente fica livre para as caronas
    car(w / 2 + 9, front + 5.2, 0x2f8a86),
    car(w / 2 - 12, front + 5.2, 0xc9382f),
    streetLamp(w / 2 - 6, front + 0.9),
    streetLamp(w / 2 + 11, front + 0.9),
    trashCan(w / 2 + 3.2, front - 0.35),
    hydrant(w / 2 - 3.5, front + 0.7),
  );
  // quintal: banco e bebedouro de passarinho na frente, varal na lateral
  const yard = (x0: number, y0: number, x1: number, y1: number) => {
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        if (!free(x, y)) return false;
        const sides = [`${x},${y},N`, `${x},${y + 1},N`, `${x},${y},W`, `${x + 1},${y},W`];
        if (sides.some((k) => grid.edges[k])) return false;
      }
    }
    return true;
  };
  if (yard(3, h - 2, 5, h - 1)) g.add(bench(4.6, front - 1.25, 0));
  if (yard(10, h - 2, 12, h - 1)) g.add(birdbath(11.2, front - 1.3));
  if (yard(w - 1, 2, w - 1, 8)) g.add(clothesline(w - 0.5, 3, 7.5));

  setShadows(g, true, true);
  ground.castShadow = false;
  return g;
}
