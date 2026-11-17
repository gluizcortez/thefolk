import * as THREE from 'three';
import type { Grid } from '../../sim';
import { box, colorMat, cyl, setShadows, texMat, tileUV } from './build';
import { PAL, seeded } from './palette';

// Tudo que fica em volta do terreno e é só cenário: gramado, calçada, rua,
// cerca, árvores e as casas dos vizinhos. Nada daqui existe na simulação.

function tree(x: number, z: number, s: number, rnd: () => number): THREE.Group {
  const g = new THREE.Group();
  const leaves = texMat('treeLeaves');
  g.add(cyl(0.12 * s, 0.18 * s, 1.3 * s, 6, texMat('bark')));
  for (const [dx, dy, dz, r] of [
    [0, 1.9, 0, 0.95],
    [0.45, 1.5, 0.2, 0.7],
    [-0.4, 1.55, -0.25, 0.72],
    [0.1, 2.5, -0.1, 0.62],
  ]) {
    const blobMesh = new THREE.Mesh(new THREE.IcosahedronGeometry(r * s, 1), leaves);
    blobMesh.position.set(dx * s, dy * s, dz * s);
    blobMesh.rotation.y = rnd() * 6;
    g.add(blobMesh);
  }
  g.position.set(x, 0, z);
  return g;
}

function bush(x: number, z: number, s: number): THREE.Mesh {
  const m = new THREE.Mesh(new THREE.IcosahedronGeometry(0.45 * s, 1), texMat('treeLeaves', { color: 0xd8f0c8 }));
  m.scale.y = 0.75;
  m.position.set(x, 0.25 * s, z);
  return m;
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
  const plain = colorMat([0xf2c9c0, 0xcfe6c2, 0xf5e6a8][variant]);
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

export function buildScenery(grid: Grid): THREE.Group {
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
  g.add(box(160, 0.1, 0.12, colorMat(0xb9b5aa), w / 2, 0, front + 1.4));
  g.add(box(160, 0.1, 0.12, colorMat(0xb9b5aa), w / 2, 0, front + 6.4));
  for (let x = -70; x < 90; x += 3) g.add(box(1.4, 0.005, 0.14, colorMat(0xf2e9a6), x, 0.02, front + 3.9));

  // cerca de ripas nos fundos e nas laterais
  g.add(fence(-0.6, -0.6, w + 0.6, -0.6), fence(-0.6, -0.6, -0.6, h + 0.6), fence(w + 0.6, -0.6, w + 0.6, h + 0.6));

  // caixa de correio perto da calçada
  g.add(
    box(0.08, 0.95, 0.08, colorMat(PAL.walnut), w / 2 + 1.6, 0, front - 0.25),
    box(0.22, 0.2, 0.42, colorMat(0xd9483f), w / 2 + 1.6, 0.95, front - 0.25),
    box(0.02, 0.16, 0.06, colorMat(PAL.mustard), w / 2 + 1.72, 1.02, front - 0.14),
  );

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


  setShadows(g, true, true);
  ground.castShadow = false;
  return g;
}
