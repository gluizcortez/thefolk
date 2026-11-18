import * as THREE from 'three';
import type { Catalog, EdgeKind, Grid, Side } from '../../sim';
import {
  STAIR_RUN,
  edgeLevel,
  inBounds,
  isDoorway,
  isFence,
  splitsRoom,
  levelOfRow,
  levelsOf,
  PITCH,
  ROOF_FLAT,
  ROOF_PITCH,
  ROOF_SLOPE,
  roofEaves,
  roofHeights,
  roofMask,
  roofRidges,
  rowOn,
  stairPlan,
  strideOf,
} from '../../sim';
import { ball, box, colorMat, cyl, rod, setShadows, texMat } from './build';
import { PAL } from './palette';

import type { WallMode } from '../viewMode';
export type { WallMode } from '../viewMode';

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
    this.buildYard();
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

  /** Bloco 12: paredes inteiras à vista (para o clique não atravessar parede). Cerca não conta. */
  solidWalls(): THREE.Object3D[] {
    return this.walls
      .filter((w) => w.isTall && w.tall.visible && this.levels[w.level]?.visible && !isFence(this.grid.edges[w.key]))
      .map((w) => w.tall);
  }

  /** Bloco 13: materiais que a tela anima (a água da piscina ondula). */
  readonly waterMats: THREE.MeshPhongMaterial[] = [];

  /**
   * Bloco 13: chão do quintal no térreo: caminho de pedras, deck e a piscina
   * (fundo e paredes de pastilha, borda de pedra clara e a água por cima).
   * O gramado do cenário tem um buraco onde a piscina foi cavada.
   */
  private buildYard(): void {
    const { grid } = this;
    const floors = this.floors;
    if (!floors) return;
    const kindAt = (x: number, y: number) => (inBounds(grid, x, y) && levelOfRow(grid, y) === 0 ? grid.floor[y * grid.w + x] : '');
    const wet = (x: number, y: number) => !!floors[kindAt(x, y)]?.water;
    const quads: Record<string, number[]> = {};
    const uvs: Record<string, number[]> = {};
    const push = (tex: string, p: number[][], uv: number[][]) => {
      (quads[tex] ??= []).push(...p[0], ...p[1], ...p[2], ...p[0], ...p[2], ...p[3]);
      (uvs[tex] ??= []).push(...uv[0], ...uv[1], ...uv[2], ...uv[0], ...uv[2], ...uv[3]);
    };
    const D = POOL_DEPTH;
    const S = POOL_SURFACE;
    for (let y = 0; y < grid.h; y++) {
      for (let x = 0; x < grid.w; x++) {
        const f = kindAt(x, y);
        if (f === 'stonepath' || f === 'deck') {
          push(f, [[x, 0.014, y], [x, 0.014, y + 1], [x + 1, 0.014, y + 1], [x + 1, 0.014, y]], [[x, -y], [x, -(y + 1)], [x + 1, -(y + 1)], [x + 1, -y]]);
          continue;
        }
        if (!wet(x, y)) continue;
        // fundo
        push('poolTile', [[x, -D, y], [x, -D, y + 1], [x + 1, -D, y + 1], [x + 1, -D, y]], [[x, -y], [x, -(y + 1)], [x + 1, -(y + 1)], [x + 1, -y]]);
        // água
        push('water', [[x, -S, y], [x, -S, y + 1], [x + 1, -S, y + 1], [x + 1, -S, y]], [[x, -y], [x, -(y + 1)], [x + 1, -(y + 1)], [x + 1, -y]]);
        // paredes de dentro, viradas para a água
        const vu = (a: number, b: number) => [[a, 0], [a, -D], [b, -D], [b, 0]];
        if (!wet(x, y - 1)) push('poolTile', [[x, 0, y], [x, -D, y], [x + 1, -D, y], [x + 1, 0, y]], vu(x, x + 1));
        if (!wet(x, y + 1)) push('poolTile', [[x + 1, 0, y + 1], [x + 1, -D, y + 1], [x, -D, y + 1], [x, 0, y + 1]], vu(x + 1, x));
        if (!wet(x - 1, y)) push('poolTile', [[x, 0, y + 1], [x, -D, y + 1], [x, -D, y], [x, 0, y]], vu(y + 1, y));
        if (!wet(x + 1, y)) push('poolTile', [[x + 1, 0, y], [x + 1, -D, y], [x + 1, -D, y + 1], [x + 1, 0, y + 1]], vu(y, y + 1));
      }
    }
    for (const tex of Object.keys(quads)) {
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(quads[tex], 3));
      geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs[tex], 2));
      geo.computeVertexNormals();
      const water = tex === 'water';
      const mat = water ? texMat('water', { gloss: 0.9, opacity: 0.78, unique: true }) : texMat(tex, { gloss: tex === 'poolTile' ? 0.5 : 0.1 });
      if (water) this.waterMats.push(mat);
      const mesh = new THREE.Mesh(geo, mat);
      mesh.receiveShadow = !water;
      if (water) mesh.renderOrder = 2;
      this.levels[0].add(mesh);
    }
    // borda de pedra em volta da água
    const coping = texMat('coping', { gloss: 0.15 });
    for (let y = 0; y < grid.h; y++) {
      for (let x = 0; x < grid.w; x++) {
        if (!wet(x, y)) continue;
        if (!wet(x, y - 1)) this.levels[0].add(box(1.2, 0.07, 0.28, coping, x + 0.5, 0, y - 0.1));
        if (!wet(x, y + 1)) this.levels[0].add(box(1.2, 0.07, 0.28, coping, x + 0.5, 0, y + 1.1));
        if (!wet(x - 1, y)) this.levels[0].add(box(0.28, 0.07, 1.2, coping, x - 0.1, 0, y + 0.5));
        if (!wet(x + 1, y)) this.levels[0].add(box(0.28, 0.07, 1.2, coping, x + 1.1, 0, y + 0.5));
      }
    }
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

      if (isFence(kind)) {
        // bloco 13: cerca, mureta e portão: baixos, iguais nas duas versões
        tall.add(fencePart(kind));
        low.add(fencePart(kind));
      } else if (isDoorway(kind)) {
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

  /** Pilares onde as paredes fazem quina, se cruzam ou terminam (cerca tem os próprios mourões). */
  private buildPosts(): void {
    const byKey = new Map(this.walls.filter((w) => !isFence(this.grid.edges[w.key])).map((w) => [w.key, w]));
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
   * (pontas das duas águas, fundo da uma água) sobe um oitão.
   *
   * Plano 2, bloco 3: a casa parece inteira de fora. Beiral com testeira
   * (a tábua que acompanha a beira, inclusive na rampa do oitão), calha nas
   * beiras baixas com condutor descendo nos cantos do térreo, cumeeira de
   * telha capa, oitão com a mesma textura da parede de baixo e laje plana
   * com platibanda onde o jogador marcou.
   */
  private buildRoofs(): void {
    if (!this.catalog) return;
    const { grid } = this;
    const roof = grid.roof;
    const style = roof?.style ?? 'hip';
    const pitch = PITCH[roof?.pitch ?? 'mid'] ?? ROOF_PITCH;
    const tint = ROOF_TINT[roof?.color ?? 'terracotta'] ?? ROOF_TINT.terracotta;
    const masks = roofMask(grid, this.catalog);
    const tiles = texMat('roofTile', { color: tint, doubleSide: true });
    const capMat = texMat('roofTile', { color: shade(tint, 0.78) });
    const fasciaMat = colorMat(PAL.white, { doubleSide: true });
    const gutterMat = colorMat(0x8c9097, { gloss: 0.5 });
    const slabMat = colorMat(0xbdb6a8);
    const parapetMat = texMat('wallExterior');
    const parapetCap = colorMat(PAL.wallCap);
    const W = grid.w + 1;
    for (let n = 0; n < masks.length && n < this.roofs.length; n++) {
      const mask = masks[n];
      if (!mask.some((v) => v !== 0)) continue;
      const holder = this.roofs[n];
      const heights = roofHeights(mask, grid.w, grid.h, style, pitch);
      const top = rowOn(grid, n, 0);
      const inside = (x: number, y: number) => x >= 0 && y >= 0 && x < grid.w && y < grid.h;
      const anyRoof = (x: number, y: number) => inside(x, y) && mask[y * grid.w + x] !== 0;
      const slope = (x: number, y: number) => inside(x, y) && mask[y * grid.w + x] === ROOF_SLOPE;
      const flat = (x: number, y: number) => inside(x, y) && mask[y * grid.w + x] === ROOF_FLAT;
      const eaveDrop = EAVE * pitch;
      // canto puxado para fora no beiral (não avança sobre a laje vizinha)
      const corner = (vx: number, vy: number): [number, number, number] => {
        let dx = 0;
        let dz = 0;
        for (const [tx, ty] of [
          [vx - 1, vy - 1],
          [vx, vy - 1],
          [vx - 1, vy],
          [vx, vy],
        ]) {
          if (anyRoof(tx, ty)) continue;
          dx += tx + 0.5 - vx;
          dz += ty + 0.5 - vy;
        }
        let h = heights[vy * W + vx];
        const m = Math.max(Math.abs(dx), Math.abs(dz));
        const ox = m > 0.01 ? (dx / m) * EAVE : 0;
        const oz = m > 0.01 ? (dz / m) * EAVE : 0;
        // a beira desce um pouco além da parede
        if (m > 0.01 && h <= 0) h = -eaveDrop;
        return [vx + ox, WALL_H + 0.04 + Math.max(h, -eaveDrop), top + vy + oz];
      };

      // ---- telhas ----
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
          if (!slope(x, y)) continue;
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
      if (pos.length) {
        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
        geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
        geo.computeVertexNormals();
        const mesh = new THREE.Mesh(geo, tiles);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        holder.add(mesh);
      }

      // ---- testeira: a tábua que acompanha toda a beira das telhas ----
      const fp: number[] = [];
      const board = (a: number[], b: number[]) => {
        const lo = 0.13;
        fp.push(...a, ...b, b[0], b[1] - lo, b[2], ...a, b[0], b[1] - lo, b[2], a[0], a[1] - lo, a[2]);
      };
      for (let y = 0; y < grid.h; y++) {
        for (let x = 0; x < grid.w; x++) {
          if (!slope(x, y)) continue;
          if (!anyRoof(x, y - 1)) board(corner(x, y), corner(x + 1, y));
          if (!anyRoof(x, y + 1)) board(corner(x + 1, y + 1), corner(x, y + 1));
          if (!anyRoof(x - 1, y)) board(corner(x, y + 1), corner(x, y));
          if (!anyRoof(x + 1, y)) board(corner(x + 1, y), corner(x + 1, y + 1));
        }
      }
      if (fp.length) {
        const g = new THREE.BufferGeometry();
        g.setAttribute('position', new THREE.Float32BufferAttribute(fp, 3));
        g.computeVertexNormals();
        holder.add(new THREE.Mesh(g, fasciaMat));
      }

      // ---- cumeeira ----
      for (const r of roofRidges(heights, grid.w, grid.h)) {
        const h = heights[r.y0 * W + r.x0];
        const alongX = r.y0 === r.y1;
        // meia telha capa deitada ao longo de x (a metade de cima), girada para z se preciso
        const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 1.04, 6, 1, false, 0, Math.PI), capMat);
        cap.rotation.z = Math.PI / 2;
        cap.castShadow = true;
        const pivot = new THREE.Group();
        pivot.add(cap);
        if (!alongX) pivot.rotation.y = Math.PI / 2;
        pivot.position.set((r.x0 + r.x1) / 2, WALL_H + 0.04 + h + 0.01, top + (r.y0 + r.y1) / 2);
        holder.add(pivot);
      }

      // ---- calha nas beiras baixas e condutores nos cantos do térreo ----
      for (const e of roofEaves(mask, heights, grid.w, grid.h)) {
        const alongX = e.y0 === e.y1;
        // estica até o canto do beiral quando a beira dobra ali
        const innerX = alongX ? 0 : e.dx < 0 ? e.x0 : e.x0 - 1;
        const innerY = alongX ? (e.dy < 0 ? e.y0 : e.y0 - 1) : 0;
        const startOpen = alongX ? !anyRoof(e.x0 - 1, innerY) : !anyRoof(innerX, e.y0 - 1);
        const endOpen = alongX ? !anyRoof(e.x1, innerY) : !anyRoof(innerX, e.y1);
        const a = (alongX ? e.x0 : e.y0) - (startOpen ? EAVE : 0);
        const b = (alongX ? e.x1 : e.y1) + (endOpen ? EAVE : 0);
        const gy = WALL_H + 0.04 - eaveDrop - 0.12;
        const ox = alongX ? 0 : e.dx * (EAVE + 0.05);
        const oz = alongX ? e.dy * (EAVE + 0.05) : 0;
        const gut = alongX
          ? box(b - a, 0.09, 0.11, gutterMat, (a + b) / 2, gy, top + e.y0 + oz)
          : box(0.11, 0.09, b - a, gutterMat, e.x0 + ox, gy, top + (a + b) / 2);
        holder.add(gut);
        if (n !== 0) continue;
        // condutor: desce no canto de fora até o chão
        for (const [open, at] of [
          [startOpen, a + 0.08],
          [endOpen, b - 0.08],
        ] as [boolean, number][]) {
          if (!open) continue;
          const px = alongX ? at : e.x0 + ox;
          const pz = alongX ? top + e.y0 + oz : top + at;
          holder.add(box(0.07, gy, 0.07, gutterMat, px, 0, pz));
        }
      }

      // ---- oitões: beira com canto alto vira parede com a textura da parede de baixo ----
      const gables = new Map<string, { p: number[]; uv: number[] }>();
      const wall = (tex: string, x0: number, z0: number, x1: number, z1: number, h0: number, h1: number) => {
        if (h0 <= 0 && h1 <= 0) return;
        const yb = WALL_H;
        const p = [
          [x0, yb, z0],
          [x1, yb, z1],
          [x1, yb + Math.max(0, h1) + 0.04, z1],
          [x0, yb + Math.max(0, h0) + 0.04, z0],
        ];
        const out = gables.get(tex) ?? { p: [], uv: [] };
        for (const i of [0, 1, 2, 0, 2, 3]) {
          out.p.push(...p[i]);
          // o desenho da parede de um metro, recomeçando em cima da parede de baixo
          out.uv.push(i === 1 || i === 2 ? 1 : 0, (p[i][1] - yb) / WALL_H);
        }
        gables.set(tex, out);
      };
      // a face de fora do oitão: a da parede de baixo; ao lado de laje (cômodo), tijolo de fora
      const outer = (x: number, y: number, side: string) => (this.indoor(x, y) ? EXTERIOR.tex : this.finishOf(x, y, side).tex);
      for (let y = 0; y < grid.h; y++) {
        for (let x = 0; x < grid.w; x++) {
          if (!slope(x, y)) continue;
          const z = top + y;
          if (!slope(x, y - 1)) wall(outer(x, z - 1, 'S'), x, z, x + 1, z, heights[y * W + x], heights[y * W + x + 1]);
          if (!slope(x, y + 1)) wall(outer(x, z + 1, 'N'), x, z + 1, x + 1, z + 1, heights[(y + 1) * W + x], heights[(y + 1) * W + x + 1]);
          if (!slope(x - 1, y)) wall(outer(x - 1, z, 'E'), x, z, x, z + 1, heights[y * W + x], heights[(y + 1) * W + x]);
          if (!slope(x + 1, y)) wall(outer(x + 1, z, 'W'), x + 1, z, x + 1, z + 1, heights[y * W + x + 1], heights[(y + 1) * W + x + 1]);
        }
      }
      for (const [tex, g] of gables) {
        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.Float32BufferAttribute(g.p, 3));
        geo.setAttribute('uv', new THREE.Float32BufferAttribute(g.uv, 2));
        geo.computeVertexNormals();
        const gm = new THREE.Mesh(geo, texMat(tex, { doubleSide: true }));
        gm.receiveShadow = true;
        gm.castShadow = true;
        holder.add(gm);
      }

      // ---- laje: placa plana com platibanda onde dá para fora ----
      for (let y = 0; y < grid.h; y++) {
        for (let x = 0; x < grid.w; x++) {
          if (!flat(x, y)) continue;
          const z = top + y;
          const slab = box(1.002, 0.16, 1.002, slabMat, x + 0.5, WALL_H - 0.04, z + 0.5);
          slab.receiveShadow = true;
          holder.add(slab);
          const P = 0.42;
          const T = 0.14;
          const side = (open: boolean, w: number, d: number, cx: number, cz: number) => {
            if (!open) return;
            holder.add(box(w, P, d, parapetMat, cx, WALL_H, cz), box(w + 0.04, 0.05, d + 0.04, parapetCap, cx, WALL_H + P, cz));
          };
          side(!anyRoof(x, y - 1), 1, T, x + 0.5, z + T / 2);
          side(!anyRoof(x, y + 1), 1, T, x + 0.5, z + 1 - T / 2);
          side(!anyRoof(x - 1, y), T, 1, x + T / 2, z + 0.5);
          side(!anyRoof(x + 1, y), T, 1, x + 1 - T / 2, z + 0.5);
        }
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
    // plano 2, bloco 3: telhado à vista mostra a casa inteira, todos os andares
    const full = mode === 'roof';
    this.levels.forEach((g, n) => (g.visible = full || n <= view));
    // o telhado dos andares de baixo do que se vê fica sempre (varanda do térreo)
    this.roofs.forEach((g, n) => (g.visible = full || n < view));
    for (const w of this.walls) {
      let behindIndoor: boolean;
      if (w.north) behindIndoor = camZ > 0 ? this.roomy(w.x, w.y - 1) : this.roomy(w.x, w.y);
      else behindIndoor = camX > 0 ? this.roomy(w.x - 1, w.y) : this.roomy(w.x, w.y);
      const m = full || w.level < view ? 'up' : mode;
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
      const tall = full || c.level < view || mode !== 'down';
      c.tall.visible = tall;
      c.low.visible = !tall;
    }
  }
}

/** Cor um pouco mais escura (ou clara, com f > 1). */
function shade(color: number, f: number): number {
  const c = new THREE.Color(color).multiplyScalar(f);
  return c.getHex();
}

/** Bloco 13: fundura da piscina e a altura da água abaixo da borda. */
export const POOL_DEPTH = 1.35;
export const POOL_SURFACE = 0.16;

/** Bloco 13: um metro de cerca de ripas, de mureta de tijolo ou o portão de ripas entreaberto. */
function fencePart(kind: EdgeKind): THREE.Group {
  const g = new THREE.Group();
  const white = colorMat(PAL.white);
  if (kind === 'lowwall') {
    const brick = texMat('wallExterior', { color: 0xf2d6c4 });
    const m = box(1, 0.66, 0.2, [brick, brick, brick, brick, brick, brick], 0, 0, 0);
    g.add(m, box(1.06, 0.07, 0.28, colorMat(PAL.wallCap), 0, 0.66, 0));
    return g;
  }
  const picket = texMat('picket', { alphaTest: 0.5, doubleSide: true });
  const post = (x: number) => box(0.09, 1.0, 0.09, white, x, 0, 0);
  g.add(post(-0.5), post(0.5));
  if (kind === 'fence') {
    const panel = new THREE.Mesh(new THREE.PlaneGeometry(1, 0.85), picket);
    panel.position.y = 0.43;
    g.add(panel, box(1, 0.05, 0.04, white, 0, 0.62, 0.03), box(1, 0.05, 0.04, white, 0, 0.22, 0.03));
    return g;
  }
  // portão: folha de ripas presa num mourão, entreaberta
  const leaf = new THREE.Group();
  const panel = new THREE.Mesh(new THREE.PlaneGeometry(0.86, 0.8), picket);
  panel.position.set(0.43, 0.42, 0);
  leaf.add(panel, box(0.86, 0.05, 0.04, white, 0.43, 0.6, 0.03), box(0.86, 0.05, 0.04, white, 0.43, 0.22, 0.03));
  leaf.add(rod([0.05, 0.24, 0.03], [0.82, 0.6, 0.03], 0.018, white));
  leaf.add(ball(0.03, 0.03, 0.03, colorMat(0x26262b), 0.8, 0.45, 0.05, 6));
  leaf.position.x = -0.45;
  leaf.rotation.y = -0.5;
  g.add(leaf, box(0.11, 1.1, 0.11, white, -0.5, 0, 0), box(0.11, 1.1, 0.11, white, 0.5, 0, 0));
  return g;
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
    const blocks = (k: string) => splitsRoom(grid.edges[k] as EdgeKind | undefined);
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
