import * as THREE from 'three';
import type { Grid } from '../../sim';
import { box, colorMat, setShadows, texMat } from './build';
import { PAL } from './palette';

export type WallMode = 'cutaway' | 'down' | 'up';

export const WALL_H = 2.6;
const LOW_H = 0.28;
const TH = 0.18;
const DOOR_H = 2.08;
const DOOR_W = 0.8;

export function isIndoor(grid: Grid, x: number, y: number): boolean {
  if (x < 0 || y < 0 || x >= grid.w || y >= grid.h) return false;
  return grid.floor[y * grid.w + x] !== 'grass';
}

interface Finish {
  tex: string;
  window: string;
}

const FINISH: Record<string, Finish> = {
  wood: { tex: 'wallLiving', window: 'windowIn:wood' },
  carpet: { tex: 'wallBedroom', window: 'windowIn:carpet' },
  tile: { tex: 'wallBath', window: 'windowIn:tile' },
  kitchen: { tex: 'wallKitchen', window: 'windowIn:kitchen' },
  exterior: { tex: 'wallExterior', window: 'windowOut' },
};

/** Pisos que a casa sabe desenhar; qualquer outro cai no assoalho. */
const FLOORS = ['wood', 'carpet', 'tile', 'kitchen'];

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
 * A casa em 3D: pisos, paredes grossas, portas, janelas, quadros e o caminho
 * de pedras. Cada parede existe em duas versões (inteira e cortada) e
 * `update` escolhe qual mostrar conforme o modo e o lado de onde a câmera olha.
 */
export class House {
  readonly group = new THREE.Group();
  private walls: WallPiece[] = [];
  private posts: Post[] = [];

  /** `occupied`: tiles com móveis ("x,y"), para não pendurar quadro atrás deles. */
  constructor(
    private readonly grid: Grid,
    private readonly occupied: Set<string> = new Set(),
  ) {
    this.buildFloors();
    this.buildWalls();
    this.buildPosts();
    this.buildPath();
  }

  private finishOf(x: number, y: number): Finish {
    if (!isIndoor(this.grid, x, y)) return FINISH.exterior;
    return FINISH[this.grid.floor[y * this.grid.w + x]] ?? FINISH.wood;
  }

  private buildFloors(): void {
    const { grid } = this;
    for (const kind of FLOORS) {
      const pos: number[] = [];
      const uv: number[] = [];
      const idx: number[] = [];
      for (let y = 0; y < grid.h; y++) {
        for (let x = 0; x < grid.w; x++) {
          const f = grid.floor[y * grid.w + x];
          if (f === 'grass') continue;
          if ((FLOORS.includes(f) ? f : 'wood') !== kind) continue;
          const b = pos.length / 3;
          pos.push(x, 0, y, x + 1, 0, y, x, 0, y + 1, x + 1, 0, y + 1);
          uv.push(x, -y, x + 1, -y, x, -(y + 1), x + 1, -(y + 1));
          idx.push(b, b + 2, b + 1, b + 1, b + 2, b + 3);
        }
      }
      if (idx.length === 0) continue;
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
      geo.setIndex(idx);
      geo.computeVertexNormals();
      const mesh = new THREE.Mesh(geo, texMat(kind, { gloss: kind === 'carpet' ? 0 : 0.25 }));
      mesh.position.y = 0.012;
      mesh.receiveShadow = true;
      this.group.add(mesh);
    }
  }

  private buildWalls(): void {
    const { grid } = this;
    const plaster = colorMat(PAL.trim);
    const cap = colorMat(PAL.wallCap);
    const frame = texMat('walnut', { color: 0xd9b48a });
    for (const key of Object.keys(grid.edges)) {
      const kind = grid.edges[key];
      const [xs, ys, side] = key.split(',');
      const x = Number(xs);
      const y = Number(ys);
      const north = side === 'N';
      // frente (+z local) = tile (x,y); fundo = o vizinho do outro lado
      const bx = north ? x : x - 1;
      const by = north ? y - 1 : y;
      const front = this.finishOf(x, y);
      const back = this.finishOf(bx, by);
      const frontIn = isIndoor(grid, x, y);
      const backIn = isIndoor(grid, bx, by);
      const mats = [plaster, plaster, cap, cap, texMat(front.tex), texMat(back.tex)];

      const tall = new THREE.Group();
      const low = new THREE.Group();

      if (kind === 'door') {
        const jamb = (1 - DOOR_W) / 2;
        for (const sx of [-1, 1]) {
          const cx = sx * (0.5 - jamb / 2);
          tall.add(wallPart(jamb, WALL_H, cx, 0, mats));
          low.add(wallPart(jamb, LOW_H, cx, 0, mats));
          tall.add(box(0.06, DOOR_H, TH + 0.07, frame, sx * (DOOR_W / 2 - 0.03), 0, 0));
        }
        tall.add(wallPart(DOOR_W, WALL_H - DOOR_H, 0, DOOR_H, mats));
        tall.add(box(DOOR_W + 0.08, 0.08, TH + 0.07, frame, 0, DOOR_H - 0.04, 0));
        // folha da porta aberta para dentro do cômodo
        const opensFront = frontIn;
        const leafMat = texMat('door', { gloss: 0.2 });
        const edge = colorMat(0x7a4d2b);
        const leaf = box(DOOR_W - 0.14, DOOR_H - 0.06, 0.045, [edge, edge, edge, edge, leafMat, leafMat], (DOOR_W - 0.14) / 2, 0, 0);
        const hinge = new THREE.Group();
        hinge.add(leaf);
        hinge.position.set(-(DOOR_W / 2 - 0.07), 0, opensFront ? TH / 2 : -TH / 2);
        hinge.rotation.y = opensFront ? -1.75 : 1.75;
        tall.add(hinge);
        const sill = box(DOOR_W, 0.03, TH + 0.04, texMat('walnut'), 0, 0, 0);
        this.group.add(place(sill, north, x, y));
      } else {
        tall.add(wallPart(1, WALL_H, 0, 0, mats));
        low.add(wallPart(1, LOW_H, 0, 0, mats));
        const outer = frontIn !== backIn;
        if (outer && (x * 2 + y) % 3 === 0) {
          tall.add(
            box(0.84, 1.26, TH + 0.08, [plaster, plaster, plaster, plaster, texMat(front.window, { gloss: 0.3 }), texMat(back.window, { gloss: 0.3 })], 0, 0.88, 0),
          );
        } else if ((x * 5 + y * 3 + (north ? 0 : 2)) % 4 === 0) {
          // quadro no lado de dentro, se não houver móvel encostado
          const sides: [boolean, number, number, number][] = [
            [frontIn, x, y, 1],
            [backIn, bx, by, -1],
          ];
          for (const [inside, tx, ty, dir] of sides) {
            if (!inside || this.occupied.has(`${tx},${ty}`)) continue;
            const n = (x + y * 2) % 3;
            const art = texMat(`painting:${n}`);
            const wood = colorMat(0x4a3220);
            const pic = box(0.66, 0.5, 0.05, [wood, wood, wood, wood, art, art], 0, 1.42, dir * (TH / 2 + 0.025));
            tall.add(pic);
            break;
          }
        }
      }
      setShadows(tall, false, true);
      setShadows(low, false, true);
      this.group.add(place(tall, north, x, y), place(low, north, x, y));
      this.walls.push({ key, north, x, y, tall, low, isTall: true });
    }
  }

  /** Pilares onde as paredes fazem quina, se cruzam ou terminam. */
  private buildPosts(): void {
    const byKey = new Map(this.walls.map((w) => [w.key, w]));
    const side = colorMat(PAL.trim);
    const cap = colorMat(PAL.wallCap);
    const mats = [side, side, cap, cap, side, side];
    for (let vy = 0; vy <= this.grid.h; vy++) {
      for (let vx = 0; vx <= this.grid.w; vx++) {
        const horizontal = [byKey.get(`${vx - 1},${vy},N`), byKey.get(`${vx},${vy},N`)].filter(Boolean) as WallPiece[];
        const vertical = [byKey.get(`${vx},${vy - 1},W`), byKey.get(`${vx},${vy},W`)].filter(Boolean) as WallPiece[];
        const n = horizontal.length + vertical.length;
        if (n === 0) continue;
        if (n === 2 && (horizontal.length === 2 || vertical.length === 2)) continue;
        const tall = box(TH + 0.03, WALL_H + 0.015, TH + 0.03, mats, vx, 0, vy);
        const low = box(TH + 0.03, LOW_H + 0.015, TH + 0.03, mats, vx, 0, vy);
        tall.receiveShadow = true;
        low.receiveShadow = true;
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
        const slab = box(0.74, 0.035, 0.74, texMat('stone'), x + 0.5, 0, z + 0.5);
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

/**
 * Pedaço de parede de largura `w` e altura `h`, centrado em `cx` ao longo da
 * parede e começando na altura `y0`. A textura é recortada de modo que os
 * pedaços (ombreiras, vergas, parede cortada) continuem o desenho da parede.
 */
function wallPart(w: number, h: number, cx: number, y0: number, mats: THREE.Material[]): THREE.Mesh {
  const mesh = box(w, h, TH, mats, cx, y0, 0);
  const pos = mesh.geometry.getAttribute('position');
  const uv = mesh.geometry.getAttribute('uv');
  for (let i = 16; i < 24; i++) {
    const along = pos.getX(i) + cx;
    const u = i < 20 ? along + 0.5 : 0.5 - along;
    uv.setXY(i, u, (pos.getY(i) + h / 2 + y0) / WALL_H);
  }
  uv.needsUpdate = true;
  return mesh;
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
