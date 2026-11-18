import * as THREE from 'three';
import { activeLot, homeOf, objectSize } from '../sim';
import type { Lot, LotHome } from '../sim';
import { box, colorMat, setShadows, texMat, tileUV } from './art/build';
import { buildFurniture, furnitureSpec } from './art/furniture';
import { House, sceneZ } from './art/house';
import { PAINT, PAL, seeded } from './art/palette';
import { bush, car, hydrant, streetLamp, tree } from './art/scenery';
import { colorOf } from '../sim/furnish';
import type { GameController } from './controller';

// Bloco 15: a vista do bairro. As casas de verdade de cada lote (as mesmas
// paredes, pisos, telhados e o que fica do lado de fora), dos dois lados de
// uma rua só, vistas do alto no mesmo estilo do jogo. Nada aqui mexe na
// simulação: o clique só escolhe um lote (ctrl.townLot) e o painel decide.

const ELEVATION = THREE.MathUtils.degToRad(30);
const DISTANCE = 140;
/** largura de um lote mais o corredor entre lotes */
const PITCH = 19;
/** do fundo dos lotes de cima até a frente dos de baixo */
const STREET_FROM = 15;
const STREET_TO = 22.8;
const SOUTH_FRONT = 23.8;

interface LotView {
  lot: Lot;
  group: THREE.Group;
  /** retângulo no chão (x0, z0, x1, z1) */
  rect: [number, number, number, number];
  /** onde vai a plaquinha (frente do lote, no alto) */
  tag: THREE.Vector3;
}

export class TownView {
  readonly scene = new THREE.Scene();
  readonly camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 1, 400);
  private root = new THREE.Group();
  private views: LotView[] = [];
  private built = -1;
  private hemi = new THREE.HemisphereLight(0xffffff, 0xc4b295, 1.5);
  private sun = new THREE.DirectionalLight(PAL.sun, 2.0);
  private target = new THREE.Vector3();
  private viewHeight = 50;
  private azimuth = Math.PI / 5;
  private pick = new THREE.Group();
  private hoverMark: THREE.Group;
  private selectMark: THREE.Group;
  private raycaster = new THREE.Raycaster();
  /** lote sob o mouse (0 = nenhum) */
  hover = 0;
  private drag: { x: number; y: number; moved: boolean } | null = null;

  constructor(private readonly ctrl: GameController) {
    this.scene.background = new THREE.Color(PAL.sky);
    this.scene.add(this.hemi, this.sun, this.sun.target, this.root, this.pick);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048, 2048);
    this.sun.shadow.bias = -0.0012;
    this.sun.shadow.normalBias = 0.04;
    this.sun.shadow.intensity = 0.42;
    const sc = this.sun.shadow.camera;
    sc.left = -70;
    sc.right = 70;
    sc.top = 70;
    sc.bottom = -70;
    sc.near = 1;
    sc.far = 200;
    this.hoverMark = frame(0xffffff, 0.45);
    this.selectMark = frame(PAL.mustard, 0.95);
    this.pick.add(this.hoverMark, this.selectMark);
  }

  // ---------- montagem ----------

  private rebuild(): void {
    this.root.traverse((o) => {
      if (o instanceof THREE.Mesh) o.geometry.dispose();
    });
    this.root.clear();
    this.views = [];
    const world = this.ctrl.world;
    const town = world.town;
    this.built = this.ctrl.townVersion;
    if (!town) return;
    const cols = Math.max(...town.lots.map((l) => l.col)) + 1;
    const width = cols * PITCH - 2;
    this.root.add(this.ground(width));
    for (const lot of town.lots) {
      const home = homeOf(world, lot);
      const g = new THREE.Group();
      const x0 = lot.col * PITCH;
      if (lot.side === 0) {
        g.position.set(x0, 0, 0);
      } else {
        // do lado de baixo o lote é girado: a frente olha para a rua (norte)
        g.rotation.y = Math.PI;
        g.position.set(x0 + 17, 0, SOUTH_FRONT + 14);
      }
      const w = home?.grid.w ?? 17;
      const h = home?.grid.h ?? 14;
      g.add(lotGround(w, h, home, this.ctrl), this.lotEdge(w, h, lot.col * 7 + lot.side));
      if (home) this.addHouse(g, home);
      this.root.add(g);
      const z0 = lot.side === 0 ? 0 : SOUTH_FRONT;
      const tagZ = lot.side === 0 ? 11 : SOUTH_FRONT + 3;
      this.views.push({ lot, group: g, rect: [x0, z0, x0 + w, z0 + h], tag: new THREE.Vector3(x0 + w / 2, 5.2, tagZ) });
    }
    this.root.add(this.street(width));
    setShadows(this.root, true, true);
    // um pouco para a esquerda e para cima: os cartões ficam nos cantos de cima
    this.target.set(width / 2 - 6, 0, (SOUTH_FRONT + 14) / 2 - 3);
    this.sun.target.position.copy(this.target);
  }

  /** Gramado em volta de tudo (um pouco abaixo do gramado dos lotes). */
  private ground(width: number): THREE.Mesh {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(width + 160, 200), texMat('grass'));
    tileUV(m, (width + 160) / 2, 100);
    m.rotation.x = -Math.PI / 2;
    m.position.set(width / 2, -0.02, (SOUTH_FRONT + 14) / 2);
    m.receiveShadow = true;
    return m;
  }

  /** Rua de mão dupla com calçadas, postes, carros e árvores entre os lotes. */
  private street(width: number): THREE.Group {
    const g = new THREE.Group();
    const strip = (z0: number, z1: number, tex: string, y: number, rep: number) => {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(width + 160, z1 - z0), texMat(tex));
      tileUV(m, (width + 160) * rep, (z1 - z0) * rep);
      m.rotation.x = -Math.PI / 2;
      m.position.set(width / 2, y, (z0 + z1) / 2);
      m.receiveShadow = true;
      g.add(m);
    };
    strip(STREET_FROM, STREET_FROM + 1.4, 'sidewalk', 0.02, 1);
    strip(STREET_FROM + 1.4, STREET_TO - 1.4, 'road', 0.015, 0.5);
    strip(STREET_TO - 1.4, STREET_TO, 'sidewalk', 0.02, 1);
    for (let x = -70; x < width + 70; x += 3) g.add(box(1.4, 0.005, 0.14, colorMat(0xd9cf8a), x, 0.02, (STREET_FROM + STREET_TO) / 2));
    const rnd = seeded(515);
    const cols = Math.round((width + 2) / PITCH);
    for (let c = 0; c <= cols; c++) {
      const x = c * PITCH - 1;
      // árvore e arbustos no corredor entre lotes, de cada lado
      g.add(tree(x, 3 + rnd() * 6, 1 + rnd() * 0.3, rnd), tree(x, SOUTH_FRONT + 5 + rnd() * 6, 1 + rnd() * 0.3, rnd));
      g.add(bush(x, 12.5, 0.9), bush(x, SOUTH_FRONT + 1.5, 0.9));
      g.add(streetLamp(x, STREET_FROM + 0.9));
      if (c % 2 === 1) g.add(hydrant(x + 0.6, STREET_TO - 0.7));
    }
    // fileira de árvores no fundo dos lotes
    for (let x = -12; x < width + 12; x += 7 + rnd() * 3) g.add(tree(x, -4 - rnd() * 3, 1.1 + rnd() * 0.3, rnd), tree(x + 3, SOUTH_FRONT + 18 + rnd() * 3, 1.1 + rnd() * 0.3, rnd));
    g.add(car(width * 0.22, STREET_FROM + 3.4, 0x2f8a86), car(width * 0.71, STREET_TO - 3.4, 0xc9382f));
    return g;
  }

  /** Cerca baixa de ripas no fundo e nas laterais do lote (só enfeite). */
  private lotEdge(w: number, h: number, seed: number): THREE.Group {
    const g = new THREE.Group();
    const wood = colorMat(seed % 2 ? 0xe9e1cf : 0xd7c39f);
    const rail = (x0: number, z0: number, x1: number, z1: number) => {
      const len = Math.hypot(x1 - x0, z1 - z0);
      const r = box(len, 0.08, 0.06, wood, (x0 + x1) / 2, 0.55, (z0 + z1) / 2);
      r.rotation.y = -Math.atan2(z1 - z0, x1 - x0);
      g.add(r);
      for (let i = 0; i <= len; i += 1) {
        const k = i / len;
        g.add(box(0.08, 0.7, 0.08, wood, x0 + (x1 - x0) * k, 0.35, z0 + (z1 - z0) * k));
      }
    };
    rail(-0.3, -0.3, w + 0.3, -0.3);
    rail(-0.3, -0.3, -0.3, h);
    rail(w + 0.3, -0.3, w + 0.3, h);
    return g;
  }

  /** A casa do lote: paredes, pisos e telhado de verdade, e o que fica do lado de fora. */
  private addHouse(g: THREE.Group, home: LotHome): void {
    const catalog = this.ctrl.sim.catalog;
    const house = new House(home.grid, catalog.floors, catalog);
    const levels = home.grid.levels ?? 1;
    house.update('up', 1, 1, levels - 1);
    g.add(house.group);
    for (const obj of home.objects) {
      const def = catalog.objects[obj.defId];
      if (!def || def.layer) continue;
      const at = sceneZ(home.grid, obj.y);
      if (at.level !== 0) continue;
      const floor = catalog.floors[home.grid.floor[obj.y * home.grid.w + obj.x]];
      if (!floor?.outdoor) continue;
      const spec = furnitureSpec(def.art);
      const paint = colorOf(obj, def);
      const model = buildFurniture(def.art, obj.id, paint ? PAINT[paint] : undefined);
      const size = objectSize(def, obj.rot);
      model.group.position.set(obj.x + size.w / 2, at.base, at.z + size.h / 2);
      model.group.rotation.y = (spec.facing === 'E' ? Math.PI / 2 : 0) + obj.rot * (Math.PI / 2);
      g.add(model.group);
    }
  }

  // ---------- câmera, mouse e plaquinhas ----------

  private updateCamera(aspect: number): void {
    const cam = this.camera;
    cam.top = this.viewHeight / 2;
    cam.bottom = -this.viewHeight / 2;
    cam.right = (this.viewHeight * aspect) / 2;
    cam.left = -cam.right;
    const sin = Math.sin(this.azimuth);
    const cos = Math.cos(this.azimuth);
    cam.position.set(sin * Math.cos(ELEVATION), Math.sin(ELEVATION), cos * Math.cos(ELEVATION)).multiplyScalar(DISTANCE).add(this.target);
    cam.lookAt(this.target);
    cam.updateProjectionMatrix();
    cam.updateMatrixWorld();
    const sunAz = this.azimuth - 0.55;
    this.sun.position.set(Math.sin(sunAz) * 0.62, 1, Math.cos(sunAz) * 0.62).multiplyScalar(60).add(this.sun.target.position);
  }

  /** Desenha o bairro na imagem interna do jogo (o retoque de 16 bits é o mesmo). */
  render(renderer: THREE.WebGLRenderer, target: THREE.WebGLRenderTarget, aspect: number): void {
    if (this.built !== this.ctrl.townVersion) this.rebuild();
    this.updateCamera(aspect);
    this.place(this.hoverMark, this.hover !== this.ctrl.townLot ? this.hover : 0);
    this.place(this.selectMark, this.ctrl.townLot);
    renderer.setRenderTarget(target);
    renderer.render(this.scene, this.camera);
  }

  private place(mark: THREE.Group, lotId: number): void {
    const v = this.views.find((x) => x.lot.id === lotId);
    mark.visible = !!v;
    if (!v) return;
    const [x0, z0, x1, z1] = v.rect;
    mark.position.set((x0 + x1) / 2, 0.06, (z0 + z1) / 2);
    mark.scale.set(x1 - x0 + 0.8, 1, z1 - z0 + 0.8);
  }

  /** Lote debaixo de um ponto da tela (0 = nenhum). */
  lotAt(ndcX: number, ndcY: number): number {
    this.raycaster.setFromCamera(new THREE.Vector2(ndcX, ndcY), this.camera);
    const p = new THREE.Vector3();
    if (!this.raycaster.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), p)) return 0;
    const v = this.views.find((x) => p.x >= x.rect[0] - 0.4 && p.x <= x.rect[2] + 0.4 && p.z >= x.rect[1] - 0.4 && p.z <= x.rect[3] + 0.4);
    return v?.lot.id ?? 0;
  }

  /** Onde fica a plaquinha de cada lote na tela (de 0 a 1, de cima para baixo). */
  tags(): { lotId: number; x: number; y: number }[] {
    return this.views.map((v) => {
      const p = v.tag.clone().project(this.camera);
      return { lotId: v.lot.id, x: (p.x + 1) / 2, y: (1 - p.y) / 2 };
    });
  }

  zoom(dir: number): void {
    this.viewHeight = THREE.MathUtils.clamp(this.viewHeight * (dir > 0 ? 1.1 : 0.9), 18, 70);
  }

  pan(dxPx: number, dyPx: number, heightPx: number): void {
    const unit = this.viewHeight / Math.max(1, heightPx);
    const along = (dyPx * unit) / Math.sin(ELEVATION);
    const rightX = Math.cos(this.azimuth);
    const rightZ = -Math.sin(this.azimuth);
    const fwdX = -Math.sin(this.azimuth);
    const fwdZ = -Math.cos(this.azimuth);
    this.target.x = THREE.MathUtils.clamp(this.target.x - rightX * dxPx * unit + fwdX * along, -10, 100);
    this.target.z = THREE.MathUtils.clamp(this.target.z - rightZ * dxPx * unit + fwdZ * along, -10, 50);
  }

  /** Botão apertado, arrasto e soltura (a tela do jogo repassa quando o bairro está aberto). */
  pointerDown(x: number, y: number): void {
    this.drag = { x, y, moved: false };
  }

  pointerMove(x: number, y: number, ndcX: number, ndcY: number, heightPx: number): void {
    const d = this.drag;
    if (d) {
      if (!d.moved && Math.hypot(x - d.x, y - d.y) > 5) d.moved = true;
      if (d.moved) {
        this.pan(x - d.x, y - d.y, heightPx);
        d.x = x;
        d.y = y;
        return;
      }
    }
    this.hover = this.lotAt(ndcX, ndcY);
  }

  /** Devolve o lote clicado (0 = arrastou ou não pegou lote). */
  pointerUp(ndcX: number, ndcY: number): number {
    const moved = this.drag?.moved ?? false;
    this.drag = null;
    if (moved) return 0;
    return this.lotAt(ndcX, ndcY);
  }

  /** Para os testes no navegador: o lote da família em jogo. */
  activeLotId(): number {
    return activeLot(this.ctrl.world)?.id ?? 0;
  }
}

/** Grama do lote (com buraco onde há piscina cavada). */
function lotGround(w: number, h: number, home: LotHome | null, ctrl: GameController): THREE.Mesh {
  const floors = ctrl.sim.catalog.floors;
  const pos: number[] = [];
  const uv: number[] = [];
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (home && floors[home.grid.floor[y * home.grid.w + x]]?.water) continue;
      const p = [
        [x, y],
        [x, y + 1],
        [x + 1, y + 1],
        [x + 1, y],
      ];
      for (const i of [0, 1, 2, 0, 2, 3]) {
        pos.push(p[i][0], 0, p[i][1]);
        uv.push(p[i][0] / 2, -p[i][1] / 2);
      }
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geo.computeVertexNormals();
  const mesh = new THREE.Mesh(geo, texMat('grass'));
  mesh.receiveShadow = true;
  return mesh;
}

/** Moldura chata no chão (escala 1 = um quadrado de 1x1), para marcar o lote. */
function frame(color: number, opacity: number): THREE.Group {
  const g = new THREE.Group();
  const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity, depthWrite: false });
  const t = 0.012;
  for (const [x, z, w, d] of [
    [0, -0.5, 1, t],
    [0, 0.5, 1, t],
    [-0.5, 0, t, 1],
    [0.5, 0, t, 1],
  ]) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), mat);
    m.rotation.x = -Math.PI / 2;
    m.position.set(x, 0, z);
    m.scale.set(w, d, 1);
    m.renderOrder = 4;
    g.add(m);
  }
  g.visible = false;
  return g;
}
