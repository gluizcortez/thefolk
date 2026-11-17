import * as THREE from 'three';
import { getTexture } from './textures';

// Peças de montar: materiais em cache e malhas simples. Tudo em low-poly, com
// sombreamento difuso (Lambert), sem brilho especular nem materiais realistas.

export interface MatOpts {
  /** cor que multiplica a textura (ou a própria cor, sem textura) */
  color?: number;
  opacity?: number;
  alphaTest?: number;
  doubleSide?: boolean;
  emissive?: number;
  emissiveIntensity?: number;
  /** não compartilha: para materiais que mudam em tempo de jogo */
  unique?: boolean;
}

const cache = new Map<string, THREE.MeshLambertMaterial>();

function make(map: string | null, o: MatOpts): THREE.MeshLambertMaterial {
  const key = `${map ?? ''}|${JSON.stringify(o)}`;
  if (!o.unique) {
    const hit = cache.get(key);
    if (hit) return hit;
  }
  const mat = new THREE.MeshLambertMaterial({
    color: o.color ?? 0xffffff,
    map: map ? getTexture(map) : null,
    transparent: o.opacity !== undefined && o.opacity < 1,
    opacity: o.opacity ?? 1,
    alphaTest: o.alphaTest ?? 0,
    side: o.doubleSide ? THREE.DoubleSide : THREE.FrontSide,
    emissive: o.emissive ?? 0x000000,
    emissiveIntensity: o.emissiveIntensity ?? 1,
  });
  if (mat.transparent) mat.depthWrite = false;
  if (!o.unique) cache.set(key, mat);
  return mat;
}

export function colorMat(color: number, opts: MatOpts = {}): THREE.MeshLambertMaterial {
  return make(null, { ...opts, color });
}

export function texMat(name: string, opts: MatOpts = {}): THREE.MeshLambertMaterial {
  return make(name, opts);
}

type Mat = THREE.Material | THREE.Material[];

/** Caixa com base em y e centro em (x, z). Materiais em ordem +x,-x,+y,-y,+z,-z. */
export function box(w: number, h: number, d: number, mat: Mat, x = 0, y = 0, z = 0): THREE.Mesh {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  mesh.position.set(x, y + h / 2, z);
  return mesh;
}

/** Materiais de uma caixa com a frente (+z) diferente do resto. */
export function fronted(side: THREE.Material, front: THREE.Material, top: THREE.Material = side): THREE.Material[] {
  return [side, side, top, side, front, side];
}

/** Cilindro (ou tronco de cone) com base em y. Poucos lados, de propósito. */
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
