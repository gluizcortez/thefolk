import * as THREE from 'three';
import type { Grid } from '../../sim';
import { box, colorMat, setShadows, texMat } from './build';
import { PAL } from './palette';

export type WallMode = 'cutaway' | 'down' | 'up';

export const WALL_H = 2.6;
const LOW_H = 0.22;
const TH = 0.12;
const DOOR_H = 2.1;

const INDOOR = new Set(['wood', 'carpet', 'tile']);

export function isIndoor(grid: Grid, x: number, y: number): boolean {
  if (x < 0 || y < 0 || x >= grid.w || y >= grid.h) return false;
  return INDOOR.has(grid.floor[y * grid.w + x]);
}

interface Finish {
  tex: string;
  base: number;
  window: string;
}

const FINISH: Record<string, Finish> = {
  wood: { tex: 'wallLiving', base: PAL.wallLiving, window: 'windowIn:wood' },
  carpet: { tex: 'wallBedroom', base: PAL.wallBedroom, window: 'windowIn:carpet' },
  tile: { tex: 'wallBath', base: PAL.wallBath, window: 'windowIn:tile' },
  exterior: { tex: 'wallExterior', base: PAL.wallExterior, window: 'windowOut' },
};

interface WallPiece {
  key: string;
  north: boolean;
  x: number;
  y: number;
  tall: THREE.Group;
  low: THREE.Group;
  isTall: boolean;
}

interface Post {
  walls: WallPiece[];
  tall: THREE.Mesh;
  low: THREE.Mesh;
}

/**
 * A casa em 3D: pisos, paredes, portas, janelas e o caminho de pedras.
 * Cada parede existe em duas versões (inteira e cortada) e `update` escolhe
 * qual mostrar conforme o modo e o lado de onde a câmera olha.
 */
export class House {
  readonly group = new THREE.Group();
  private walls: WallPiece[] = [];
  private posts: Post[] = [];

  constructor(private readonly grid: Grid) {
    this.buildFloors();
    this.buildWalls();
    this.buildPosts();
    this.buildPath();
  }

  private finishOf(x: number, y: number): Finish {
    return isIndoor(this.grid, x, y) ? FINISH[this.grid.floor[y * this.grid.w + x]] : FINISH.exterior;
  }

  private buildFloors(): void {
    const { grid } = this;
    const scale: Record<string, number> = { wood: 0.5, carpet: 1, tile: 1 };
    for (const kind of Object.keys(scale)) {
      const pos: number[] = [];
      const uv: number[] = [];
      const idx: number[] = [];
      for (let y = 0; y < grid.h; y++) {
        for (let x = 0; x < grid.w; x++) {
          if (grid.floor[y * grid.w + x] !== kind) continue;
          const b = pos.length / 3;
          const s = scale[kind];
          pos.push(x, 0, y, x + 1, 0, y, x, 0, y + 1, x + 1, 0, y + 1);
          uv.push(x * s, -y * s, (x + 1) * s, -y * s, x * s, -(y + 1) * s, (x + 1) * s, -(y + 1) * s);
          idx.push(b, b + 2, b + 1, b + 1, b + 2, b + 3);
        }
      }
      if (idx.length === 0) continue;
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
      geo.setIndex(idx);
      geo.computeVertexNormals();
      const mesh = new THREE.Mesh(geo, texMat(kind));
      mesh.position.y = 0.012;
      mesh.receiveShadow = true;
      this.group.add(mesh);
    }
  }

  private buildWalls(): void {
    const { grid } = this;
    const plaster = colorMat(PAL.trim);
    const cap = colorMat(PAL.wallCap);
    for (const key of Object.keys(grid.edges)) {
      const kind = grid.edges[key];
      const [xs, ys, side] = key.split(',');
      const x = Number(xs);
      const y = Number(ys);
      const north = side === 'N';
      // frente (+z local) = tile (x,y); fundo = o vizinho do outro lado
      const front = this.finishOf(x, y);
      const back = north ? this.finishOf(x, y - 1) : this.finishOf(x - 1, y);
      const frontIn = isIndoor(grid, x, y);
      const backIn = north ? isIndoor(grid, x, y - 1) : isIndoor(grid, x - 1, y);

      const tall = new THREE.Group();
      const low = new THREE.Group();
      const flat = [plaster, plaster, cap, cap, colorMat(front.base), colorMat(back.base)];

      if (kind === 'door') {
        const jamb = 0.1;
        for (const sx of [-1, 1]) {
          tall.add(box(jamb, WALL_H, TH, flat, sx * (0.5 - jamb / 2), 0, 0));
          low.add(box(jamb, LOW_H, TH, flat, sx * (0.5 - jamb / 2), 0, 0));
          tall.add(box(0.06, DOOR_H, TH + 0.05, plaster, sx * (0.5 - jamb - 0.03), 0, 0));
        }
        tall.add(box(1 - jamb * 2, WALL_H - DOOR_H, TH, flat, 0, DOOR_H, 0));
        tall.add(box(1 - jamb * 2 + 0.04, 0.07, TH + 0.05, plaster, 0, DOOR_H - 0.035, 0));
        const sill = box(1 - jamb * 2, 0.025, TH + 0.02, colorMat(PAL.walnut), 0, 0, 0);
        this.group.add(place(sill, north, x, y));
      } else {
        tall.add(box(1, WALL_H, TH, [plaster, plaster, cap, cap, texMat(front.tex), texMat(back.tex)]));
        low.add(box(1, LOW_H, TH, flat));
        if (frontIn !== backIn && (x * 2 + y) % 3 === 0) {
          tall.add(
            box(0.8, 1.2, TH + 0.07, [plaster, plaster, plaster, plaster, texMat(front.window), texMat(back.window)], 0, 0.92, 0),
          );
        }
      }
      setShadows(tall);
      setShadows(low);
      this.group.add(place(tall, north, x, y), place(low, north, x, y));
      this.walls.push({ key, north, x, y, tall, low, isTall: true });
    }
  }

  /** Pilares onde as paredes fazem quina, se cruzam ou terminam. */
  private buildPosts(): void {
    const byKey = new Map(this.walls.map((w) => [w.key, w]));
    const mat = colorMat(PAL.trim);
    for (let vy = 0; vy <= this.grid.h; vy++) {
      for (let vx = 0; vx <= this.grid.w; vx++) {
        const horizontal = [byKey.get(`${vx - 1},${vy},N`), byKey.get(`${vx},${vy},N`)].filter(Boolean) as WallPiece[];
        const vertical = [byKey.get(`${vx},${vy - 1},W`), byKey.get(`${vx},${vy},W`)].filter(Boolean) as WallPiece[];
        const n = horizontal.length + vertical.length;
        if (n === 0) continue;
        if (n === 2 && (horizontal.length === 2 || vertical.length === 2)) continue;
        const tall = box(TH + 0.04, WALL_H + 0.02, TH + 0.04, mat, vx, 0, vy);
        const low = box(TH + 0.04, LOW_H + 0.02, TH + 0.04, mat, vx, 0, vy);
        setShadows(tall);
        setShadows(low);
        this.group.add(tall, low);
        this.posts.push({ walls: [...horizontal, ...vertical], tall, low });
      }
    }
  }

  /** Caminho de pedras da porta da frente até a calçada. */
  private buildPath(): void {
    const { grid } = this;
    for (const key of Object.keys(grid.edges)) {
      if (grid.edges[key] !== 'door') continue;
      const [xs, ys, side] = key.split(',');
      const x = Number(xs);
      const y = Number(ys);
      if (side !== 'N' || !isIndoor(grid, x, y - 1) || isIndoor(grid, x, y)) continue;
      for (let z = y; z < grid.h + 1; z++) {
        const slab = box(0.72, 0.03, 0.72, texMat('stone'), x + 0.5, 0, z + 0.5);
        slab.rotation.y = ((z * 7) % 5) * 0.03 - 0.06;
        slab.receiveShadow = true;
        this.group.add(slab);
      }
    }
  }

  /**
   * camX/camZ: de que lado a câmera está (sinal de posição - alvo).
   * No modo "cutaway" cai toda parede que ficaria na frente de um cômodo.
   */
  update(mode: WallMode, camX: number, camZ: number): void {
    for (const w of this.walls) {
      let behindIndoor: boolean;
      if (w.north) behindIndoor = camZ > 0 ? isIndoor(this.grid, w.x, w.y - 1) : isIndoor(this.grid, w.x, w.y);
      else behindIndoor = camX > 0 ? isIndoor(this.grid, w.x - 1, w.y) : isIndoor(this.grid, w.x, w.y);
      w.isTall = mode === 'up' || (mode === 'cutaway' && !behindIndoor);
      w.tall.visible = w.isTall;
      w.low.visible = !w.isTall;
    }
    for (const p of this.posts) {
      const tall = p.walls.some((w) => w.isTall);
      p.tall.visible = tall;
      p.low.visible = !tall;
    }
  }
}

function place<T extends THREE.Object3D>(obj: T, north: boolean, x: number, y: number): T {
  const holder = new THREE.Group();
  holder.add(obj);
  if (north) {
    holder.position.set(x + 0.5, 0, y);
  } else {
    holder.position.set(x, 0, y + 0.5);
    holder.rotation.y = Math.PI / 2;
  }
  return holder as unknown as T;
}
