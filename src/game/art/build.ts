import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { getTexture } from './textures';

// Peças de montar: materiais em cache e malhas básicas. As formas são
// arredondadas e sombreadas de forma suave, com um brilho especular simples
// nos materiais lisos (esmalte, vinil, cromado), para lembrar os objetos
// pré-renderizados dos jogos antigos. Nada de materiais realistas (PBR).

export interface MatOpts {
  /** cor que multiplica a textura (ou a própria cor, sem textura) */
  color?: number;
  opacity?: number;
  alphaTest?: number;
  doubleSide?: boolean;
  emissive?: number;
  emissiveIntensity?: number;
  /** brilho: 0 = fosco, 1 = bem polido */
  gloss?: number;
  /** não compartilha: para materiais que mudam em tempo de jogo */
  unique?: boolean;
}

export type Mat = THREE.Material | THREE.Material[];

const cache = new Map<string, THREE.MeshPhongMaterial>();

function make(map: string | null, o: MatOpts): THREE.MeshPhongMaterial {
  const key = `${map ?? ''}|${JSON.stringify(o)}`;
  if (!o.unique) {
    const hit = cache.get(key);
    if (hit) return hit;
  }
  const gloss = o.gloss ?? 0;
  const mat = new THREE.MeshPhongMaterial({
    color: o.color ?? 0xffffff,
    map: map ? getTexture(map) : null,
    transparent: o.opacity !== undefined && o.opacity < 1,
    opacity: o.opacity ?? 1,
    alphaTest: o.alphaTest ?? 0,
    side: o.doubleSide ? THREE.DoubleSide : THREE.FrontSide,
    emissive: o.emissive ?? 0x000000,
    emissiveIntensity: o.emissiveIntensity ?? 1,
    specular: new THREE.Color().setScalar(gloss * 0.55),
    shininess: 8 + gloss * 70,
  });
  if (mat.transparent) mat.depthWrite = false;
  // plano 2, bloco 8: o nome da textura diz o papel do material (madeira, tecido...)
  if (map) mat.userData.tex = map;
  if (!o.unique) cache.set(key, mat);
  return mat;
}

export function colorMat(color: number, opts: MatOpts = {}): THREE.MeshPhongMaterial {
  return make(null, { ...opts, color });
}

export function texMat(name: string, opts: MatOpts = {}): THREE.MeshPhongMaterial {
  return make(name, opts);
}

/** Caixa com base em y e centro em (x, z). Materiais em ordem +x,-x,+y,-y,+z,-z. */
export function box(w: number, h: number, d: number, mat: Mat, x = 0, y = 0, z = 0): THREE.Mesh {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  mesh.position.set(x, y + h / 2, z);
  return mesh;
}

/** Caixa de cantos arredondados (um material só), com base em y. */
export function rbox(w: number, h: number, d: number, r: number, mat: THREE.Material, x = 0, y = 0, z = 0): THREE.Mesh {
  const radius = Math.min(r, w / 2, h / 2, d / 2);
  const mesh = new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 3, radius), mat);
  mesh.position.set(x, y + h / 2, z);
  return mesh;
}

/** Materiais de uma caixa com a frente (+z) diferente do resto. */
export function fronted(side: THREE.Material, front: THREE.Material, top: THREE.Material = side): THREE.Material[] {
  return [side, side, top, side, front, side];
}

/** Cilindro (ou tronco de cone) com base em y. */
export function cyl(
  rTop: number,
  rBottom: number,
  h: number,
  sides: number,
  mat: Mat,
  x = 0,
  y = 0,
  z = 0,
  open = false,
): THREE.Mesh {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(rTop, rBottom, h, sides, 1, open, Math.PI), mat);
  mesh.position.set(x, y + h / 2, z);
  return mesh;
}

/** Elipsoide centrado em (x, y, z). O centro da textura (u = 0.5) fica na frente. */
export function ball(rx: number, ry: number, rz: number, mat: THREE.Material, x = 0, y = 0, z = 0, seg = 12): THREE.Mesh {
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(1, seg, Math.max(6, Math.round(seg * 0.7)), -Math.PI / 2), mat);
  mesh.scale.set(rx, ry, rz);
  mesh.position.set(x, y, z);
  return mesh;
}

/** Tubo entre dois pontos (pernas cromadas, hastes, armações). */
export function rod(a: [number, number, number], b: [number, number, number], r: number, mat: THREE.Material, sides = 8): THREE.Mesh {
  const va = new THREE.Vector3(...a);
  const vb = new THREE.Vector3(...b);
  const len = va.distanceTo(vb);
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, sides), mat);
  mesh.position.copy(va).add(vb).multiplyScalar(0.5);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), vb.sub(va).normalize());
  return mesh;
}

/** Sólido de revolução a partir de um perfil [raio, altura]. */
export function lathe(profile: [number, number][], sides: number, mat: THREE.Material, x = 0, y = 0, z = 0): THREE.Mesh {
  const pts = profile.map(([r, h]) => new THREE.Vector2(Math.max(r, 0.0001), h));
  const mesh = new THREE.Mesh(new THREE.LatheGeometry(pts, sides), mat);
  mesh.position.set(x, y, z);
  return mesh;
}

export interface Ring {
  y: number;
  rx: number;
  rz: number;
  x?: number;
  z?: number;
}

/**
 * Casca suave feita de anéis elípticos empilhados: é como se modelam troncos,
 * braços e pernas. A textura dá a volta no corpo, com u = 0.5 na frente (+z).
 */
/** `v` diz que faixa da textura (de baixo para cima) esta casca usa: dá para cortar um tronco em dois sem mexer na roupa. */
export function loft(rings: Ring[], sides: number, mat: THREE.Material, v: [number, number] = [0, 1]): THREE.Mesh {
  const pos: number[] = [];
  const uv: number[] = [];
  const idx: number[] = [];
  const y0 = rings[0].y;
  const y1 = rings[rings.length - 1].y;
  const cols = sides + 1;
  rings.forEach((ring) => {
    for (let j = 0; j <= sides; j++) {
      const u = j / sides;
      const a = Math.PI * 2 * (u - 0.5);
      pos.push((ring.x ?? 0) + ring.rx * Math.sin(a), ring.y, (ring.z ?? 0) + ring.rz * Math.cos(a));
      uv.push(u, v[0] + ((ring.y - y0) / (y1 - y0 || 1)) * (v[1] - v[0]));
    }
  });
  for (let i = 0; i < rings.length - 1; i++) {
    for (let j = 0; j < sides; j++) {
      const a = i * cols + j;
      const b = a + 1;
      const c = a + cols;
      const d = c + 1;
      idx.push(a, b, c, b, d, c);
    }
  }
  // tampas: um leque até o centro do primeiro e do último anel
  const cap = (ringIndex: number, top: boolean) => {
    const ring = rings[ringIndex];
    const center = pos.length / 3;
    pos.push(ring.x ?? 0, ring.y, ring.z ?? 0);
    uv.push(0.5, top ? v[1] : v[0]);
    for (let j = 0; j < sides; j++) {
      const a = ringIndex * cols + j;
      if (top) idx.push(a, a + 1, center);
      else idx.push(a + 1, a, center);
    }
  };
  cap(0, false);
  cap(rings.length - 1, true);

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  // a costura da textura não pode aparecer no sombreamento
  const n = geo.getAttribute('normal');
  for (let i = 0; i < rings.length; i++) {
    const a = i * cols;
    const b = a + sides;
    const v = new THREE.Vector3(n.getX(a) + n.getX(b), n.getY(a) + n.getY(b), n.getZ(a) + n.getZ(b)).normalize();
    n.setXYZ(a, v.x, v.y, v.z);
    n.setXYZ(b, v.x, v.y, v.z);
  }
  return new THREE.Mesh(geo, mat);
}

/** Multiplica as coordenadas de textura (para repetir um padrão). */
export function tileUV(mesh: THREE.Mesh, su: number, sv: number): THREE.Mesh {
  const uv = mesh.geometry.getAttribute('uv');
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * su, uv.getY(i) * sv);
  uv.needsUpdate = true;
  return mesh;
}

/** Liga sombras em tudo que é opaco dentro de um objeto. */
export function setShadows(root: THREE.Object3D, cast = true, receive = true): void {
  root.traverse((o) => {
    if (!(o instanceof THREE.Mesh)) return;
    const mats = Array.isArray(o.material) ? o.material : [o.material];
    const solid = mats.every((m) => !m.transparent && m.alphaTest === 0);
    o.castShadow = cast && solid;
    o.receiveShadow = receive && solid;
  });
}
