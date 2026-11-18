import * as THREE from 'three';
import type { Catalog, EdgeKind, Grid, Side } from '../../sim';
import {
  STAIR_RUN,
  edgeLevel,
  inBounds,
  isDoorway,
  levelOfRow,
  levelsOf,
  roofHeights,
  ROOF_PITCH,
  roofMask,
  rowOn,
  stairPlan,
  strideOf,
} from '../../sim';
import { box, colorMat, cyl, setShadows, texMat } from './build';
import { PAL } from './palette';

export type WallMode = 'cutaway' | 'down' | 'up';

export const WALL_H = 2.6;
export const LOW_H = 0.28;
export const TH = 0.18;
const DOOR_H = 2.08;
const DOOR_W = 0.8;
/** bloco 12: altura de um andar (o piso de cima apoia no topo das paredes) */
export const LEVEL_H = WALL_H;
/** bloco 12: meia parede */
export const HALF_H = 1.05;
/** bloco 12: espessura da laje do andar de cima */
const SLAB = 0.16;
/** bloco 12: beiral do telhado para fora das paredes */
const EAVE = 0.32;

/** Bloco 12: cores das telhas (ids de data/build.ts ROOF_COLORS). */
export const ROOF_TINT: Record<string, number> = {
  terracotta: 0xd8735a,
  slate: 0x7d8796,
  moss: 0x87a46a,
  cobalt: 0x6787be,
  cocoa: 0x8f6a52,
  sand: 0xe4bf86,
};

/**
 * Bloco 12: onde um ponto do grid (x, y em linhas do grid inteiro) fica na
 * cena: o andar sobe LEVEL_H e volta para cima do térreo.
 */
export function sceneZ(grid: Grid, y: number): { level: number; z: number; base: number } {
  const level = Math.max(0, levelOfRow(grid, Math.floor(y)) >= 0 ? levelOfRow(grid, Math.floor(y)) : Math.floor(y / strideOf(grid)));
  return { level, z: y - level * strideOf(grid), base: level * LEVEL_H };
}

/** Tile com piso de dentro? Sem catálogo, só a grama (e o vão) conta como fora. */
export function isIndoor(grid: Grid, x: number, y: number, floors?: Catalog['floors']): boolean {
  if (!inBounds(grid, x, y)) return false;
  const f = grid.floor[y * grid.w + x];
  return floors ? floors[f]?.outdoor !== true : f !== 'grass' && f !== 'void';
}

/** Tile com chão (de dentro ou de fora), em qualquer andar. */
function hasFloor(grid: Grid, x: number, y: number): boolean {
  if (!inBounds(grid, x, y)) return false;
  return grid.floor[y * grid.w + x] !== 'void';
}

interface Finish {
  tex: string;
  window: string;
}

/** Textura de cada revestimento (ids de data/build.ts) e a cortina da janela. */
export const COVER_ART: Record<string, Finish> = {
  living: { tex: 'wallLiving', window: 'windowIn:wood' },
  bedroom: { tex: 'wallBedroom', window: 'windowIn:carpet' },
  bath: { tex: 'wallBath', window: 'windowIn:tile' },
  kitchen: { tex: 'wallKitchen', window: 'windowIn:kitchen' },
  plaster: { tex: 'wallPlaster', window: 'windowIn:lace' },
  stripes: { tex: 'wallStripes', window: 'windowIn:lace' },
  panel: { tex: 'wallPanel', window: 'windowIn:carpet' },
  brick: { tex: 'wallExterior', window: 'windowIn:wood' },
};

const EXTERIOR: Finish = { tex: 'wallExterior', window: 'windowOut' };

/** Revestimento de uma face sem escolha do jogador: segue o piso do cômodo. */
const DEFAULT_COVER: Record<string, string> = {
  wood: 'living',
  carpet: 'bedroom',
  tile: 'bath',
  kitchen: 'kitchen',
};

/** Pisos que a casa sabe desenhar (textura com o mesmo nome); outros caem no assoalho. */
export const FLOOR_ART = ['wood', 'carpet', 'tile', 'kitchen', 'parquet', 'checker', 'slate'];

export interface WallPiece {
  key: string;
  north: boolean;
  x: number;
  y: number;
  level: number;
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
 *
 * Bloco 12: cada andar mora num grupo próprio (subido LEVEL_H e trazido de
 * volta para cima do térreo), com escadas, colunas e o telhado do andar. Os
 * andares acima do que se está vendo somem, e o telhado só aparece com as
 * paredes levantadas.
 */
export class House {
  readonly group = new THREE.Group();
  private walls: WallPiece[] = [];
  private posts: Post[] = [];
  private columns: { level: number; tall: THREE.Object3D; low: THREE.Object3D }[] = [];
  /** um grupo por andar, já na altura certa */
  private levels: THREE.Group[] = [];
  /** telhado de cada andar */
  private roofs: THREE.Group[] = [];
  /** tiles cercados por paredes (sem saída sem cruzar parede, porta ou janela) */
  private enclosed: Uint8Array;

  constructor(
    private readonly grid: Grid,
    private readonly floors?: Catalog['floors'],
    private readonly catalog?: Catalog,
  ) {
    const stride = strideOf(grid);
    for (let n = 0; n < levelsOf(grid); n++) {
      const g = new THREE.Group();
      g.position.set(0, n * LEVEL_H, -n * stride);
      const roof = new THREE.Group();
      g.add(roof);
      this.levels.push(g);
      this.roofs.push(roof);
      this.group.add(g);
    }
    this.enclosed = enclosedTiles(grid);
    this.buildFloors();
    this.buildWalls();
    this.buildPosts();
    this.buildPath();
    this.buildStairs();
    this.buildColumns();
    this.buildRoofs();
  }

  /** Grupo do andar de uma linha do grid. */
  private at(y: number): THREE.Group {
    return this.levels[Math.max(0, levelOfRow(this.grid, y))] ?? this.levels[0];
  }

  private indoor(x: number, y: number): boolean {
    return isIndoor(this.grid, x, y, this.floors);
  }

  /** Acabamento da face de parede do lado `side` do tile (x, y). */
  private finishOf(x: number, y: number, side: string): Finish {
    const chosen = this.grid.coverings[`${x},${y},${side}`];
    if (chosen && COVER_ART[chosen]) return COVER_ART[chosen];
    if (!this.indoor(x, y)) return EXTERIOR;
    const f = this.grid.floor[y * this.grid.w + x];
    return COVER_ART[this.floors?.[f]?.cover ?? DEFAULT_COVER[f] ?? 'plaster'] ?? COVER_ART.plaster;
  }

  /**
   * Para o corte de paredes, conta como cômodo o tile com piso e também o
   * cercado por paredes ainda sem piso (um cômodo recém-levantado).
   */
  private roomy(x: number, y: number): boolean {
    if (this.indoor(x, y)) return true;
    return inBounds(this.grid, x, y) && this.enclosed[y * this.grid.w + x] === 1;
  }

  /** A parede dessa borda está inteira (true) ou cortada? */
  isTallEdge(key: string): boolean {
    return this.walls.find((w) => w.key === key)?.isTall ?? true;
  }

  /** Paredes, com a borda de cada uma, para o modo construção apontar. */
  pickables(level?: number): { edge: string; object: THREE.Object3D }[] {
    return this.walls.filter((w) => level === undefined || w.level === level).map((w) => ({ edge: w.key, object: w.isTall ? w.tall : w.low }));
  }

  /** Bloco 12: paredes inteiras à vista (para o clique não atravessar parede). */
  solidWalls(): THREE.Object3D[] {
    return this.walls.filter((w) => w.isTall && w.tall.visible && this.levels[w.level]?.visible).map((w) => w.tall);
  }

  private buildFloors(): void {
    const { grid } = this;
    for (let n = 0; n < this.levels.length; n++) {
      const top = rowOn(grid, n, 0);
      for (const kind of FLOOR_ART) {
        const pos: number[] = [];
        const uv: number[] = [];
        const idx: number[] = [];
        for (let y = top; y < top + grid.h; y++) {
          for (let x = 0; x < grid.w; x++) {
            const f = grid.floor[y * grid.w + x];
            if (!this.indoor(x, y)) continue;
            if ((FLOOR_ART.includes(f) ? f : 'wood') !== kind) continue;
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
        this.levels[n].add(mesh);
      }
      if (n > 0) this.buildSlab(n);
    }
  }

  /** Bloco 12: laje do andar de cima: a borda de fora (faixa) e o forro por baixo. */
  private buildSlab(n: number): void {
    const { grid } = this;
    const top = rowOn(grid, n, 0);
    const pos: number[] = [];
    const quad = (a: number[], b: number[], c: number[], d: number[]) => pos.push(...a, ...b, ...c, ...a, ...c, ...d);
    for (let y = top; y < top + grid.h; y++) {
      for (let x = 0; x < grid.w; x++) {
        if (!hasFloor(grid, x, y)) continue;
        // forro (de baixo para cima não aparece, mas fecha a laje)
        quad([x, -SLAB, y], [x + 1, -SLAB, y], [x + 1, -SLAB, y + 1], [x, -SLAB, y + 1]);
        if (!hasFloor(grid, x, y - 1)) quad([x + 1, 0, y], [x, 0, y], [x, -SLAB, y], [x + 1, -SLAB, y]);
        if (!hasFloor(grid, x, y + 1)) quad([x, 0, y + 1], [x + 1, 0, y + 1], [x + 1, -SLAB, y + 1], [x, -SLAB, y + 1]);
        if (!hasFloor(grid, x - 1, y)) quad([x, 0, y], [x, 0, y + 1], [x, -SLAB, y + 1], [x, -SLAB, y]);
        if (!hasFloor(grid, x + 1, y)) quad([x + 1, 0, y + 1], [x + 1, 0, y], [x + 1, -SLAB, y], [x + 1, -SLAB, y + 1]);
      }
    }
    if (pos.length === 0) return;
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.computeVertexNormals();
    const mesh = new THREE.Mesh(geo, colorMat(PAL.trim, { doubleSide: true }));
    mesh.position.y = 0.012;
    mesh.receiveShadow = true;
    this.levels[n].add(mesh);
  }

  private buildWalls(): void {
    const { grid } = this;
    const plaster = colorMat(PAL.trim);
    const cap = colorMat(PAL.wallCap);
    const frame = texMat('walnut', { color: 0xd9b48a });
    for (const key of Object.keys(grid.edges)) {
      const kind = grid.edges[key];
      const level = edgeLevel(grid, key);
      if (level < 0) continue;
      const [xs, ys, side] = key.split(',');
      const x = Number(xs);
      const y = Number(ys);
      const north = side === 'N';
      // frente (+z local) = tile (x,y); fundo = o vizinho do outro lado
      const bx = north ? x : x - 1;
      const by = north ? y - 1 : y;
      const front = this.finishOf(x, y, side);
      const back = this.finishOf(bx, by, north ? 'S' : 'E');
      const frontIn = this.indoor(x, y);
      const backIn = this.indoor(bx, by);
      const mats = [plaster, plaster, cap, cap, texMat(front.tex), texMat(back.tex)];
      const holder = this.levels[level];

      const tall = new THREE.Group();
      const low = new THREE.Group();

      if (isDoorway(kind)) {
        const style = DOORS[kind as DoorKind];
        const width = style.width;
        const jamb = (1 - width) / 2;
        for (const sx of [-1, 1]) {
          const cx = sx * (0.5 - jamb / 2);
          tall.add(wallPart(jamb, WALL_H, cx, 0, mats));
          low.add(wallPart(jamb, LOW_H, cx, 0, mats));
          if (kind !== 'arch') tall.add(box(0.06, DOOR_H, TH + 0.07, frame, sx * (width / 2 - 0.03), 0, 0));
        }
        if (kind === 'arch') {
          tall.add(...archParts(width, mats, plaster));
        } else {
          tall.add(wallPart(width, WALL_H - DOOR_H, 0, DOOR_H, mats));
          tall.add(box(width + 0.08, 0.08, TH + 0.07, frame, 0, DOOR_H - 0.04, 0));
          // folha (ou folhas) aberta para dentro do cômodo
          const opensFront = frontIn;
          const leaves = kind === 'doorDouble' ? [-1, 1] : [-1];
          const leafW = (width - 0.14) / leaves.length;
          for (const hs of leaves) {
            const hinge = new THREE.Group();
            hinge.add(doorLeaf(kind as DoorKind, leafW, DOOR_H - 0.06));
            hinge.scale.x = -hs;
            hinge.position.set(hs * (width / 2 - 0.07), 0, opensFront ? TH / 2 : -TH / 2);
            hinge.rotation.y = (opensFront ? -1.75 : 1.75) * -hs;
            tall.add(hinge);
          }
        }
        const sill = box(width, 0.03, TH + 0.04, texMat('walnut'), 0, 0, 0);
        holder.add(place(sill, north, x, y));
        if (frontIn !== backIn && level === 0 && kind !== 'arch') {
          // porta da rua: capacho e luminária do lado de fora
          const out = frontIn ? -1 : 1;
          const mat = box(0.72, 0.02, 0.46, texMat('doormat'), 0, 0.03, out * 0.42);
          mat.receiveShadow = true;
          holder.add(place(mat, north, x, y));
          const glow = colorMat(0xfff0b8, { emissive: 0xffd98a, emissiveIntensity: 0.9 });
          const lx = Math.min(0.46, width / 2 + 0.06);
          tall.add(
            box(0.07, 0.05, 0.1, colorMat(0x26262b), lx, 1.92, out * (TH / 2 + 0.05)),
            box(0.11, 0.17, 0.11, glow, lx, 1.74, out * (TH / 2 + 0.1)),
            box(0.13, 0.03, 0.13, colorMat(0x26262b), lx, 1.91, out * (TH / 2 + 0.1)),
          );
        }
      } else if (kind === 'half') {
        tall.add(wallPart(1, HALF_H, 0, 0, mats));
        tall.add(box(1, 0.05, TH + 0.06, texMat('walnut'), 0, HALF_H, 0));
        low.add(wallPart(1, LOW_H, 0, 0, mats));
      } else {
        tall.add(wallPart(1, WALL_H, 0, 0, mats));
        low.add(wallPart(1, LOW_H, 0, 0, mats));
        const pane = WINDOWS[kind as WindowKind];
        if (pane) {
          const glass = (f: Finish, inside: boolean) => texMat(inside ? f.window : 'windowOut', { gloss: 0.3 });
          tall.add(box(0.84, pane.h, TH + 0.08, [plaster, plaster, plaster, plaster, glass(front, frontIn), glass(back, backIn)], 0, pane.y, 0));
          if (kind === 'windowHigh') {
            // basculante: travessa no meio e a folha de cima um pouco aberta
            tall.add(box(0.86, 0.04, TH + 0.1, frame, 0, pane.y + pane.h / 2 - 0.02, 0));
          }
          // peitoril do lado de dentro e floreira do lado de fora
          for (const [inside, dir] of [
            [frontIn, 1],
            [backIn, -1],
          ] as [boolean, number][]) {
            if (inside) {
              tall.add(box(0.94, 0.04, 0.12, plaster, 0, pane.y - 0.02, dir * (TH / 2 + 0.05)));
            } else if (frontIn !== backIn && kind === 'window') {
              tall.add(box(0.86, 0.14, 0.16, texMat('walnut'), 0, 0.72, dir * (TH / 2 + 0.09)));
              const blooms = new THREE.Mesh(new THREE.PlaneGeometry(0.86, 0.34), texMat('flowers', { alphaTest: 0.5, doubleSide: true }));
              blooms.position.set(0, 1.0, dir * (TH / 2 + 0.09));
              tall.add(blooms);
            }
          }
        }
        // bloco 3: quadros e relógio viraram objetos de compra (layer 'wall')
      }
      setShadows(tall, false, true);
      setShadows(low, false, true);
      tall.userData.edge = key;
      low.userData.edge = key;
      holder.add(place(tall, north, x, y), place(low, north, x, y));
      this.walls.push({ key, north, x, y, level, tall, low, isTall: true });
    }
  }

  /** Pilares onde as paredes fazem quina, se cruzam ou terminam. */
  private buildPosts(): void {
    const byKey = new Map(this.walls.map((w) => [w.key, w]));
    const side = colorMat(PAL.trim);
    const cap = colorMat(PAL.wallCap);
    const mats = [side, side, cap, cap, side, side];
    for (let n = 0; n < this.levels.length; n++) {
      const top = rowOn(this.grid, n, 0);
      for (let vy = top; vy <= top + this.grid.h; vy++) {
        for (let vx = 0; vx <= this.grid.w; vx++) {
          const horizontal = [byKey.get(`${vx - 1},${vy},N`), byKey.get(`${vx},${vy},N`)].filter(Boolean) as WallPiece[];
          const vertical = [byKey.get(`${vx},${vy - 1},W`), byKey.get(`${vx},${vy},W`)].filter(Boolean) as WallPiece[];
          const n4 = horizontal.length + vertical.length;
          if (n4 === 0) continue;
          if (n4 === 2 && (horizontal.length === 2 || vertical.length === 2)) continue;
          const all = [...horizontal, ...vertical];
          // só meias paredes se encontrando: pilar baixo
          const h = all.every((w) => this.grid.edges[w.key] === 'half') ? HALF_H + 0.05 : WALL_H + 0.015;
          const tall = box(TH + 0.03, h, TH + 0.03, mats, vx, 0, vy);
          const low = box(TH + 0.03, LOW_H + 0.015, TH + 0.03, mats, vx, 0, vy);
          tall.receiveShadow = true;
          low.receiveShadow = true;
          this.levels[n].add(tall, low);
          this.posts.push({ walls: all, tall, low });
        }
      }
    }
  }

  /** Caminho de pedras da porta da frente até a calçada. */
  private buildPath(): void {
    const { grid } = this;
    for (const key of Object.keys(grid.edges)) {
      if (!isDoorway(grid.edges[key])) continue;
      const [xs, ys, side] = key.split(',');
      const x = Number(xs);
      const y = Number(ys);
      if (y > grid.h) continue;
      if (side !== 'N' || !this.indoor(x, y - 1) || this.indoor(x, y)) continue;
      for (let z = y; z < grid.h + 1; z++) {
        // o caminho para onde encontra parede ou cômodo
        if (z < grid.h && (this.indoor(x, z) || (z > y && grid.edges[`${x},${z},N`]))) break;
        const slab = box(0.74, 0.035, 0.74, texMat('stone'), x + 0.5, 0, z + 0.5);
        slab.rotation.y = ((z * 7) % 5) * 0.03 - 0.06;
        slab.receiveShadow = true;
        this.levels[0].add(slab);
      }
    }
  }

  /** Bloco 12: escadas de madeira com degraus vazados, banzos e corrimão. */
  private buildStairs(): void {
    const { grid } = this;
    const tread = texMat('walnut', { color: 0xe8c9a0 });
    const side = texMat('walnut');
    const rail = colorMat(0x5b3a24, { gloss: 0.4 });
    const steps = STAIR_RUN * 4;
    for (const st of grid.stairs ?? []) {
      const plan = stairPlan(grid, st);
      if (!plan.run.every((t) => inBounds(grid, t.x, t.y))) continue;
      const g = new THREE.Group();
      // no sistema local a escada sobe ao longo de +x, de 0 a STAIR_RUN
      for (let i = 0; i < steps; i++) {
        const y1 = ((i + 1) / steps) * LEVEL_H;
        const x0 = (i / steps) * STAIR_RUN;
        g.add(box(STAIR_RUN / steps + 0.02, 0.07, 0.86, tread, x0 + STAIR_RUN / steps / 2, y1 - 0.07, 0));
      }
      const len = Math.hypot(STAIR_RUN, LEVEL_H);
      const tilt = Math.atan2(LEVEL_H, STAIR_RUN);
      for (const sz of [-0.45, 0.45]) {
        const beam = box(len + 0.1, 0.24, 0.06, side, 0, -0.12, 0);
        beam.position.set(STAIR_RUN / 2, LEVEL_H / 2 - 0.1, sz);
        beam.rotation.z = tilt;
        g.add(beam);
      }
      // corrimão do lado direito de quem sobe, com balaústres
      const handrail = box(len + 0.1, 0.05, 0.06, rail, 0, -0.025, 0);
      handrail.position.set(STAIR_RUN / 2, LEVEL_H / 2 + 0.88, 0.45);
      handrail.rotation.z = tilt;
      g.add(handrail);
      for (let i = 0; i <= STAIR_RUN * 2; i++) {
        const x = (i / (STAIR_RUN * 2)) * STAIR_RUN;
        const yb = (x / STAIR_RUN) * LEVEL_H;
        g.add(box(0.035, 0.9, 0.035, rail, x, yb, 0.45));
      }
      const d = { N: [0, -1], E: [1, 0], S: [0, 1], W: [-1, 0] }[st.dir as Side];
      const ox = st.x + 0.5 - d[0] * 0.5;
      const oz = st.y + 0.5 - d[1] * 0.5;
      g.position.set(ox, 0, oz);
      g.rotation.y = Math.atan2(-d[1], d[0]);
      setShadows(g, true, true);
      g.userData.stair = `${st.x},${st.y}`;
      this.at(st.y).add(g);
    }
  }

  /** Bloco 12: colunas de alvenaria com base e capitel. */
  private buildColumns(): void {
    const shaft = colorMat(PAL.trim, { gloss: 0.15 });
    const cap = colorMat(PAL.wallCap);
    for (const key of this.grid.columns ?? []) {
      const [vx, vy] = key.split(',').map(Number);
      const own = levelOfRow(this.grid, vy);
      const level = own >= 0 ? own : levelOfRow(this.grid, vy - 1);
      if (level < 0) continue;
      const tall = new THREE.Group();
      tall.add(
        box(0.34, 0.14, 0.34, cap, vx, 0, vy),
        cyl(0.12, 0.13, WALL_H - 0.3, 10, shaft, vx, 0.14, vy),
        box(0.34, 0.16, 0.34, cap, vx, WALL_H - 0.16, vy),
      );
      const low = box(0.3, LOW_H, 0.3, cap, vx, 0, vy);
      setShadows(tall, true, true);
      this.levels[level].add(tall, low);
      this.columns.push({ level, tall, low });
    }
  }

  /**
   * Bloco 12: telhado de cada andar, montado sobre a máscara de tiles cobertos.
   * Cada quadrado vira dois triângulos pelas alturas dos cantos; a diagonal
   * acompanha a espiga (quatro águas) ou a cumeeira. Onde a beira fica alta
   * (pontas das duas águas) sobe um oitão de alvenaria.
   */
  private buildRoofs(): void {
    if (!this.catalog) return;
    const { grid } = this;
    const style = grid.roof?.style ?? 'hip';
    const tint = ROOF_TINT[grid.roof?.color ?? 'terracotta'] ?? ROOF_TINT.terracotta;
    const masks = roofMask(grid, this.catalog);
    const tiles = texMat('roofTile', { color: tint, doubleSide: true });
    const gableMat = texMat('wallExterior', { doubleSide: true });
    const W = grid.w + 1;
    for (let n = 0; n < masks.length && n < this.roofs.length; n++) {
      const mask = masks[n];
      if (!mask.some((v) => v === 1)) continue;
      const heights = roofHeights(mask, grid.w, grid.h, style);
      const top = rowOn(grid, n, 0);
      const covered = (x: number, y: number) => x >= 0 && y >= 0 && x < grid.w && y < grid.h && mask[y * grid.w + x] === 1;
      // canto puxado para fora no beiral
      const corner = (vx: number, vy: number): [number, number, number] => {
        let dx = 0;
        let dz = 0;
        for (const [tx, ty] of [
          [vx - 1, vy - 1],
          [vx, vy - 1],
          [vx - 1, vy],
          [vx, vy],
        ]) {
          if (covered(tx, ty)) continue;
          dx += tx + 0.5 - vx;
          dz += ty + 0.5 - vy;
        }
        let h = heights[vy * W + vx];
        const m = Math.max(Math.abs(dx), Math.abs(dz));
        const ox = m > 0.01 ? (dx / m) * EAVE : 0;
        const oz = m > 0.01 ? (dz / m) * EAVE : 0;
        // a beira desce um pouco além da parede
        if (m > 0.01 && h <= 0) h = -EAVE * ROOF_PITCH;
        return [vx + ox, WALL_H + 0.04 + h, top + vy + oz];
      };
      const pos: number[] = [];
      const uv: number[] = [];
      const tri = (a: number[], b: number[], c: number[]) => {
        pos.push(...a, ...b, ...c);
        // a telha corre ao longo da beira: escolhe o eixo pela inclinação
        const n1 = new THREE.Vector3(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
        const n2 = new THREE.Vector3(c[0] - a[0], c[1] - a[1], c[2] - a[2]);
        const nrm = n1.cross(n2);
        const alongX = Math.abs(nrm.z) >= Math.abs(nrm.x);
        for (const p of [a, b, c]) {
          if (alongX) uv.push(p[0], -(p[2] + p[1]) * 1.1);
          else uv.push(p[2], -(p[0] + p[1]) * 1.1);
        }
      };
      for (let y = 0; y < grid.h; y++) {
        for (let x = 0; x < grid.w; x++) {
          if (!covered(x, y)) continue;
          const h00 = heights[y * W + x];
          const h10 = heights[y * W + x + 1];
          const h01 = heights[(y + 1) * W + x];
          const h11 = heights[(y + 1) * W + x + 1];
          const a = corner(x, y);
          const b = corner(x + 1, y);
          const c = corner(x, y + 1);
          const d = corner(x + 1, y + 1);
          if (Math.abs(h00 - h11) >= Math.abs(h10 - h01)) {
            tri(a, c, d);
            tri(a, d, b);
          } else {
            tri(a, c, b);
            tri(b, c, d);
          }
        }
      }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
      geo.computeVertexNormals();
      const mesh = new THREE.Mesh(geo, tiles);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      this.roofs[n].add(mesh);

      // oitões: beira com canto alto vira parede em triângulo (ou trapézio)
      const gp: number[] = [];
      const guv: number[] = [];
      const wall = (x0: number, z0: number, x1: number, z1: number, h0: number, h1: number) => {
        if (h0 <= 0 && h1 <= 0) return;
        const yb = WALL_H;
        const p = [
          [x0, yb, z0],
          [x1, yb, z1],
          [x1, yb + Math.max(0, h1), z1],
          [x0, yb + Math.max(0, h0), z0],
        ];
        for (const i of [0, 1, 2, 0, 2, 3]) {
          gp.push(...p[i]);
          guv.push(i === 1 || i === 2 ? 1 : 0, (p[i][1] - yb) / WALL_H + 0.1);
        }
      };
      for (let y = 0; y < grid.h; y++) {
        for (let x = 0; x < grid.w; x++) {
          if (!covered(x, y)) continue;
          const z = top + y;
          if (!covered(x, y - 1)) wall(x, z, x + 1, z, heights[y * W + x], heights[y * W + x + 1]);
          if (!covered(x, y + 1)) wall(x, z + 1, x + 1, z + 1, heights[(y + 1) * W + x], heights[(y + 1) * W + x + 1]);
          if (!covered(x - 1, y)) wall(x, z, x, z + 1, heights[y * W + x], heights[(y + 1) * W + x]);
          if (!covered(x + 1, y)) wall(x + 1, z, x + 1, z + 1, heights[y * W + x + 1], heights[(y + 1) * W + x + 1]);
        }
      }
      if (gp.length) {
        const g2 = new THREE.BufferGeometry();
        g2.setAttribute('position', new THREE.Float32BufferAttribute(gp, 3));
        g2.setAttribute('uv', new THREE.Float32BufferAttribute(guv, 2));
        g2.computeVertexNormals();
        const gm = new THREE.Mesh(g2, gableMat);
        gm.receiveShadow = true;
        this.roofs[n].add(gm);
      }
    }
  }

  /**
   * camX/camZ: de que lado a câmera está (sinal de posição - alvo).
   * No modo "cutaway" cai toda parede que ficaria na frente de um cômodo.
   * Bloco 12: só aparecem os andares até `view`; os de baixo ficam com as
   * paredes inteiras, e o telhado só com as paredes levantadas.
   */
  update(mode: WallMode, camX: number, camZ: number, view = 0): void {
    this.levels.forEach((g, n) => (g.visible = n <= view));
    this.roofs.forEach((g, n) => (g.visible = mode === 'up' && n <= view));
    for (const w of this.walls) {
      let behindIndoor: boolean;
      if (w.north) behindIndoor = camZ > 0 ? this.roomy(w.x, w.y - 1) : this.roomy(w.x, w.y);
      else behindIndoor = camX > 0 ? this.roomy(w.x - 1, w.y) : this.roomy(w.x, w.y);
      const m = w.level < view ? 'up' : mode;
      w.isTall = m === 'up' || (m === 'cutaway' && !behindIndoor);
      w.tall.visible = w.isTall;
      w.low.visible = !w.isTall;
    }
    for (const p of this.posts) {
      const tall = p.walls.some((w) => w.isTall);
      p.tall.visible = tall;
      p.low.visible = !tall;
    }
    for (const c of this.columns) {
      const tall = c.level < view || mode !== 'down';
      c.tall.visible = tall;
      c.low.visible = !tall;
    }
  }
}

type DoorKind = 'door' | 'doorGlass' | 'doorDouble' | 'arch';
type WindowKind = 'window' | 'windowTall' | 'windowHigh';

/** Bloco 12: largura do vão de cada estilo de porta. */
const DOORS: Record<DoorKind, { width: number }> = {
  door: { width: DOOR_W },
  doorGlass: { width: DOOR_W },
  doorDouble: { width: 0.92 },
  arch: { width: 0.86 },
};

/** Bloco 12: altura do vidro (h) e do meio dele (y) em cada janela. */
const WINDOWS: Record<WindowKind, { h: number; y: number }> = {
  window: { h: 1.26, y: 0.88 },
  windowTall: { h: 2.0, y: 0.22 },
  windowHigh: { h: 0.44, y: 1.66 },
};

/** Folha de porta: lisa de madeira, de vidro com caixilho, ou as duas da porta dupla. */
function doorLeaf(kind: DoorKind, w: number, h: number): THREE.Object3D {
  const edge = colorMat(0x7a4d2b);
  if (kind === 'doorGlass') {
    const g = new THREE.Group();
    const wood = texMat('walnut', { color: 0xd9b48a });
    const glass = colorMat(0xbfe1ea, { opacity: 0.5, gloss: 0.9 });
    g.add(
      box(0.07, h, 0.05, wood, 0.035, 0, 0),
      box(0.07, h, 0.05, wood, w - 0.035, 0, 0),
      box(w, 0.08, 0.05, wood, w / 2, 0, 0),
      box(w, 0.08, 0.05, wood, w / 2, h - 0.08, 0),
      box(w, 0.05, 0.05, wood, w / 2, h * 0.45, 0),
      box(w - 0.12, h - 0.16, 0.02, glass, w / 2, 0.08, 0),
    );
    return g;
  }
  const leafMat = texMat('door', { gloss: 0.2 });
  return box(w, h, 0.045, [edge, edge, edge, edge, leafMat, leafMat], w / 2, 0, 0);
}

/**
 * Bloco 12: arco: o pedaço de parede acima do vão, com a curva feita de
 * gomos (no jeito dos jogos antigos) e o intradorso liso.
 */
function archParts(width: number, mats: THREE.Material[], plaster: THREE.Material): THREE.Mesh[] {
  const out: THREE.Mesh[] = [];
  const spring = 1.86;
  const r = width / 2;
  const n = 7;
  for (let i = 0; i < n; i++) {
    const a0 = Math.PI - (i / n) * Math.PI;
    const a1 = Math.PI - ((i + 1) / n) * Math.PI;
    const x0 = Math.cos(a0) * r;
    const x1 = Math.cos(a1) * r;
    const yCurve = spring + Math.min(Math.sin(a0), Math.sin(a1)) * r * 0.9;
    const w = x1 - x0;
    const cx = (x0 + x1) / 2;
    out.push(wallPart(w, WALL_H - yCurve, cx, yCurve, mats));
    out.push(box(w, 0.02, TH + 0.01, plaster, cx, yCurve - 0.01, 0));
  }
  return out;
}

/** Tiles que não chegam à divisa do lote sem cruzar uma borda com algo (em cada andar). */
function enclosedTiles(grid: Grid): Uint8Array {
  const { w, h } = grid;
  const rows = grid.floor.length / w;
  const open = new Uint8Array(w * rows);
  for (let n = 0; n < levelsOf(grid); n++) {
    const top = rowOn(grid, n, 0);
    const bottom = top + h - 1;
    const queue: number[] = [];
    const visit = (x: number, y: number) => {
      const i = y * w + x;
      if (open[i]) return;
      open[i] = 1;
      queue.push(i);
    };
    for (let x = 0; x < w; x++) {
      if (!grid.edges[`${x},${top},N`]) visit(x, top);
      if (!grid.edges[`${x},${bottom + 1},N`]) visit(x, bottom);
    }
    for (let y = top; y <= bottom; y++) {
      if (!grid.edges[`0,${y},W`]) visit(0, y);
      if (!grid.edges[`${w},${y},W`]) visit(w - 1, y);
    }
    const blocks = (k: string) => {
      const e = grid.edges[k] as EdgeKind | undefined;
      return e !== undefined && e !== 'half';
    };
    while (queue.length > 0) {
      const i = queue.shift()!;
      const x = i % w;
      const y = Math.floor(i / w);
      if (x > 0 && !blocks(`${x},${y},W`)) visit(x - 1, y);
      if (x < w - 1 && !blocks(`${x + 1},${y},W`)) visit(x + 1, y);
      if (y > top && !blocks(`${x},${y},N`)) visit(x, y - 1);
      if (y < bottom && !blocks(`${x},${y + 1},N`)) visit(x, y + 1);
    }
  }
  return open.map((v) => (v ? 0 : 1));
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
