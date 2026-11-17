import * as THREE from 'three';
import { t } from '../i18n';
import {
  NEED_IDS,
  TICKS_PER_SECOND,
  checkPlacement,
  clockOf,
  edgeOfFace,
  faceKey,
  facesOfEdge,
  formatMoney,
  lineEdges,
  moodOf,
  objectSize,
  planBuild,
  roomFaces,
} from '../sim';
import type {
  Action,
  BuildCommand,
  Folk,
  InteractionDef,
  Mess,
  NeedId,
  ObjectDef,
  RelDelta,
  Side,
  SocialDef,
  Speed,
  WorldObject,
} from '../sim';
import type { Expression } from './art/textures';
import type { Hud } from '../ui/hud';
import { FolkModel } from './art/folk';
import type { FolkAnim } from './art/folk';
import { buildFurniture, furnitureSpec } from './art/furniture';
import type { Anchor, FurnitureModel, FurnitureSpec } from './art/furniture';
import { COVER_ART, FLOOR_ART, House, LOW_H, TH, WALL_H } from './art/house';
import { texMat } from './art/build';
import { PAL } from './art/palette';
import { buildScenery } from './art/scenery';
import { getTexture } from './art/textures';
import { WearFx, buildMess } from './art/upkeep';
import type { GameController } from './controller';

/** 30° dá a projeção 2:1 das vistas isométricas clássicas */
const ELEVATION = THREE.MathUtils.degToRad(30);
const CAMERA_DISTANCE = 60;
/**
 * Altura-alvo da imagem interna, em linhas. A cena é renderizada perto disso e
 * ampliada por um fator inteiro, com pixels nítidos, como num monitor da época.
 */
const TARGET_LINES = 600;
const MAX_STEPS_PER_FRAME = 60;
const CLICK_SLOP = 6;

/** Animação do folk para interações que não são só "sentar/deitar/dançar". */
const ANIMS: Record<string, FolkAnim> = {
  'phone:call': 'phone',
  'bookshelf:read': 'read',
  'tv:watch': 'watch',
  'shower:shower': 'scrub',
};

/** Cuidados com a casa: a mesma animação em qualquer objeto. */
const CARE_ANIMS: Record<string, FolkAnim> = {
  clean: 'scrub',
  repair: 'scrub',
  service: 'reach',
  dishes: 'scrub',
  empty: 'reach',
  dump: 'reach',
};

/** Altura do tampo das superfícies, para o prato ficar em cima (o resto vai no chão). */
const SURFACE_TOP: Record<string, number> = { dinette: 0.77, desk: 0.77, counter: 0.92, kitchensink: 0.92 };

interface ObjectEntry {
  obj: WorldObject;
  def: ObjectDef;
  spec: FurnitureSpec;
  model: FurnitureModel;
  center: THREE.Vector3;
  turn: number;
  /** manchas, moscas, fumaça e faísca (bloco 1) */
  fx: WearFx;
}

interface FolkEntry {
  model: FolkModel;
  zzz: THREE.Sprite[];
  /** plaquinha do tipo de conversa, sobre quem puxou */
  icon: THREE.Sprite;
  iconKey: string;
}

interface Hover {
  entry?: ObjectEntry;
  mess?: Mess;
  tile?: { x: number; y: number };
  folk?: Folk;
}

/** O que a conversa em andamento pede de animação para este folk. */
interface SocialLook {
  anim: FolkAnim;
  expr?: Expression;
  /** com quem (para chegar mais perto no abraço e no beijo) */
  other: Folk;
  /** plaquinha a mostrar, se for quem puxou */
  icon?: string;
}

interface Ping {
  mesh: THREE.Mesh;
  age: number;
}

/**
 * A vista 3D do jogo (Three.js). Só lê o estado da simulação e manda comandos
 * pelo controller: nenhuma regra de jogo mora aqui.
 */
export class GameView {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 200);
  private sun = new THREE.DirectionalLight(PAL.sun, 2.0);
  private hemi = new THREE.HemisphereLight(0xffffff, 0xc4b295, 1.5);
  private frameBuffer: THREE.WebGLRenderTarget;
  private post = new THREE.Scene();
  private postCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  private internalHeight = TARGET_LINES;
  private worldRoot = new THREE.Group();
  private objectsRoot = new THREE.Group();
  private house!: House;
  private objects = new Map<number, ObjectEntry>();
  /** pratos, poças e lixo soltos pela casa */
  private messRoot = new THREE.Group();
  private messSig = '';
  private folks = new Map<number, FolkEntry>();
  private ring = new THREE.Group();
  private hoverTile: THREE.Mesh;
  private hoverPad: THREE.Mesh;
  private pings: Ping[] = [];
  /** objeto fantasma do modo compra, seguindo o mouse */
  private ghost: { key: string; group: THREE.Group } | null = null;
  private ghostPad: THREE.Mesh;
  private ghostTile: { x: number; y: number } | null = null;
  private builtObjects = -1;
  private thumbs = new Map<string, string>();
  private scenery: THREE.Group | null = null;
  private builtGrid = -1;
  /** prévia do modo construção (paredes fantasmas, piso, faces) */
  private buildPreview = new THREE.Group();
  private previewKey = '';
  /** traço em andamento no modo construção (vértices ou tiles) */
  private buildDrag: { start: { x: number; y: number }; cur: { x: number; y: number } } | null = null;
  /** comando que um clique agora faria, já com a prévia montada */
  private buildCmd: BuildCommand | null = null;
  private shiftDown = false;

  private target = new THREE.Vector3();
  private azimuth = Math.PI / 4;
  private viewHeight = 11;
  private builtVersion = -1;
  private wallState = '';
  private acc = 0;
  private animTime = 0;
  private hudClock = 0;
  private last = 0;
  private lastSpeed: Speed = 1;
  private hover: Hover = {};
  private pointer = { down: false, x: 0, y: 0, startX: 0, startY: 0, dragged: false, building: false };
  private raycaster = new THREE.Raycaster();
  private tmp = new THREE.Vector3();

  constructor(
    private readonly container: HTMLElement,
    private readonly ctrl: GameController,
    private readonly hud: Hud,
  ) {
    this.renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance' });
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    container.append(this.renderer.domElement);

    // a cena vai para uma imagem interna pequena; onde a placa não aceita
    // imagem de ponto flutuante, usa-se uma de 8 bits já em sRGB
    const ext = this.renderer.extensions;
    const float = ext.has('EXT_color_buffer_float') || ext.has('EXT_color_buffer_half_float');
    this.frameBuffer = new THREE.WebGLRenderTarget(4, 4, {
      type: float ? THREE.HalfFloatType : THREE.UnsignedByteType,
      colorSpace: float ? THREE.LinearSRGBColorSpace : THREE.SRGBColorSpace,
      magFilter: THREE.NearestFilter,
      minFilter: THREE.NearestFilter,
    });

    this.scene.add(this.hemi, this.sun, this.sun.target, this.worldRoot);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(1024, 1024);
    this.sun.shadow.bias = -0.0012;
    this.sun.shadow.normalBias = 0.03;
    this.sun.shadow.intensity = 0.42;
    const sc = this.sun.shadow.camera;
    sc.left = -17;
    sc.right = 17;
    sc.top = 17;
    sc.bottom = -17;
    sc.near = 1;
    sc.far = 90;

    const flat = (color: number, opacity: number) =>
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity, depthWrite: false, side: THREE.DoubleSide });
    for (const start of [0, Math.PI]) {
      this.ring.add(new THREE.Mesh(new THREE.RingGeometry(0.36, 0.43, 20, 1, start, Math.PI * 0.7), flat(PAL.mustard, 0.95)));
    }
    this.ring.rotation.x = -Math.PI / 2;
    this.hoverTile = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.9), flat(0xffffff, 0.3));
    this.hoverTile.rotation.x = -Math.PI / 2;
    this.hoverPad = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), flat(PAL.mustard, 0.6));
    this.hoverPad.rotation.x = -Math.PI / 2;
    this.ghostPad = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), flat(0x6fd06a, 0.45));
    this.ghostPad.rotation.x = -Math.PI / 2;
    this.ghostPad.visible = false;
    this.scene.add(this.ring, this.hoverTile, this.hoverPad, this.ghostPad, this.buildPreview);

    this.post.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), retroPass(this.frameBuffer.texture)));

    this.bindInput();
    window.addEventListener('resize', () => this.resize());
    this.resize();
  }

  start(): void {
    this.last = performance.now();
    const loop = (now: number) => {
      this.frame(Math.min(now - this.last, 250) / 1000);
      this.last = now;
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }

  // ---------- montagem do mundo ----------

  private rebuild(): void {
    this.worldRoot.traverse((o) => {
      if (o instanceof THREE.Mesh) o.geometry.dispose();
    });
    this.worldRoot.clear();
    this.objectsRoot = new THREE.Group();
    this.clearGhost();
    this.objects.clear();
    this.folks.clear();
    for (const p of this.pings) this.scene.remove(p.mesh);
    this.pings = [];

    const world = this.ctrl.world;
    const { grid } = world;
    this.scenery = null;
    this.buildHouse();
    this.worldRoot.add(this.objectsRoot);
    this.rebuildObjects();
    this.worldRoot.add(this.messRoot);
    this.messSig = '';

    this.syncFolks();

    this.target.set(grid.w / 2 + 0.3, 0, grid.h / 2 - 0.8);
    this.sun.target.position.set(grid.w / 2, 0, grid.h / 2);
    this.builtVersion = this.ctrl.worldVersion;
    this.wallState = '';
    this.acc = 0;
    this.hover = {};
    this.hud.closeMenu();
  }

  /** Monta (ou refaz, depois de uma obra) a casa e o cenário em volta. */
  private buildHouse(): void {
    const world = this.ctrl.world;
    const { grid } = world;
    const dispose = (g: THREE.Object3D) =>
      g.traverse((o) => {
        if (o instanceof THREE.Mesh) o.geometry.dispose();
      });
    if (this.house) {
      this.worldRoot.remove(this.house.group);
      dispose(this.house.group);
    }
    if (this.scenery) {
      this.worldRoot.remove(this.scenery);
      dispose(this.scenery);
    }
    const occupied = new Set<string>();
    for (const obj of world.objects) {
      const def = this.ctrl.sim.defOf(obj);
      if (!def) continue;
      const size = objectSize(def, obj.rot);
      for (let dy = 0; dy < size.h; dy++) for (let dx = 0; dx < size.w; dx++) occupied.add(`${obj.x + dx},${obj.y + dy}`);
    }
    const floors = this.ctrl.sim.catalog.floors;
    this.house = new House(grid, occupied, floors);
    const free = (x: number, y: number) =>
      x >= 0 && y >= 0 && x < grid.w && y < grid.h && floors[grid.floor[y * grid.w + x]]?.outdoor === true && !occupied.has(`${x},${y}`);
    this.scenery = buildScenery(grid, free);
    this.worldRoot.add(this.scenery, this.house.group);
    this.builtGrid = this.ctrl.gridVersion;
    this.wallState = '';
    this.previewKey = '';
  }

  /** Cria o modelo de quem chegou e tira o de quem foi embora. */
  private syncFolks(): void {
    const world = this.ctrl.world;
    for (const folk of world.folks) {
      if (this.folks.has(folk.id)) continue;
      const model = new FolkModel(folk.look);
      model.group.userData.folkId = folk.id;
      const zzz: THREE.Sprite[] = [];
      for (let i = 0; i < 3; i++) {
        const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: getTexture('zzz'), transparent: true, depthTest: false }));
        s.visible = false;
        zzz.push(s);
        this.worldRoot.add(s);
      }
      const icon = new THREE.Sprite(new THREE.SpriteMaterial({ map: getTexture('soc:friendly'), transparent: true, depthTest: false }));
      icon.visible = false;
      icon.scale.setScalar(0.42);
      icon.renderOrder = 5;
      this.worldRoot.add(model.group, icon);
      this.folks.set(folk.id, { model, zzz, icon, iconKey: 'soc:friendly' });
    }
    if (this.folks.size === world.folks.length) return;
    for (const [id, entry] of this.folks) {
      if (world.folks.some((f) => f.id === id)) continue;
      this.worldRoot.remove(entry.model.group, entry.icon, ...entry.zzz);
      entry.model.group.traverse((o) => {
        if (o instanceof THREE.Mesh) o.geometry.dispose();
      });
      this.folks.delete(id);
      if (this.hover.folk?.id === id) this.hover = {};
    }
  }

  /** Refaz só os móveis (depois de comprar, vender ou mover). */
  private rebuildObjects(): void {
    this.objectsRoot.traverse((o) => {
      if (o instanceof THREE.Mesh) o.geometry.dispose();
    });
    this.objectsRoot.clear();
    this.objects.clear();
    for (const obj of this.ctrl.world.objects) {
      const def = this.ctrl.sim.defOf(obj);
      if (!def) continue;
      const spec = furnitureSpec(def.art);
      const model = buildFurniture(def.art, obj.id);
      const size = objectSize(def, obj.rot);
      const center = new THREE.Vector3(obj.x + size.w / 2, 0, obj.y + size.h / 2);
      const turn = (spec.facing === 'E' ? Math.PI / 2 : 0) + obj.rot * (Math.PI / 2);
      const height = Math.max(0.3, new THREE.Box3().setFromObject(model.group).max.y);
      model.group.position.copy(center);
      model.group.rotation.y = turn;
      model.group.userData.objectId = obj.id;
      const fx = new WearFx(size.w, size.h, height, obj.id);
      fx.group.position.copy(center);
      this.objectsRoot.add(model.group, fx.group);
      this.objects.set(obj.id, { obj, def, spec, model, center, turn, fx });
    }
    this.builtObjects = this.ctrl.objectsVersion;
    this.hover = {};
  }

  private resize(): void {
    const w = this.container.clientWidth || window.innerWidth;
    const h = this.container.clientHeight || window.innerHeight;
    // cada pixel da cena ocupa um número inteiro de pixels da tela
    const dpr = window.devicePixelRatio || 1;
    const n = Math.max(1, Math.round((h * dpr) / TARGET_LINES));
    const iw = Math.max(1, Math.ceil((w * dpr) / n));
    const ih = Math.max(1, Math.ceil((h * dpr) / n));
    this.internalHeight = ih;
    this.renderer.setPixelRatio(1);
    this.renderer.setSize(iw, ih, false);
    this.frameBuffer.setSize(iw, ih);
  }

  // ---------- câmera ----------

  private updateCamera(dt: number): void {
    const goal = Math.PI / 4 + this.ctrl.camQuarter * (Math.PI / 2);
    this.azimuth += (goal - this.azimuth) * (1 - Math.exp(-dt * 9));
    if (Math.abs(goal - this.azimuth) < 0.0005) this.azimuth = goal;

    const el = this.renderer.domElement;
    const aspect = el.clientWidth / Math.max(1, el.clientHeight);
    const cam = this.camera;
    cam.top = this.viewHeight / 2;
    cam.bottom = -this.viewHeight / 2;
    cam.right = (this.viewHeight * aspect) / 2;
    cam.left = -cam.right;
    // o alvo anda de pixel em pixel da imagem interna: sem isso as texturas
    // "fervem" quando a câmera desliza
    const px = this.viewHeight / this.internalHeight;
    const sin = Math.sin(this.azimuth);
    const cos = Math.cos(this.azimuth);
    const along = Math.round((this.target.x * cos - this.target.z * sin) / px) * px;
    const stepDepth = px / Math.sin(ELEVATION);
    const depth = Math.round((-this.target.x * sin - this.target.z * cos) / stepDepth) * stepDepth;
    const aim = this.tmp.set(along * cos - depth * sin, 0, -along * sin - depth * cos).clone();
    cam.position
      .set(sin * Math.cos(ELEVATION), Math.sin(ELEVATION), cos * Math.cos(ELEVATION))
      .multiplyScalar(CAMERA_DISTANCE)
      .add(aim);
    cam.lookAt(aim);
    cam.updateProjectionMatrix();
    cam.updateMatrixWorld();

    // a luz vem sempre de trás e da esquerda da câmera, como numa maquete:
    // as faces da esquerda ficam claras e as da direita, na sombra
    const sunAz = this.azimuth - 0.55;
    this.sun.position
      .set(Math.sin(sunAz) * 0.62, 1, Math.cos(sunAz) * 0.62)
      .multiplyScalar(30)
      .add(this.sun.target.position);

    const state = `${this.ctrl.wallMode}|${Math.sin(this.azimuth) > 0}|${Math.cos(this.azimuth) > 0}`;
    if (state !== this.wallState) {
      this.wallState = state;
      this.house.update(this.ctrl.wallMode, Math.sin(this.azimuth), Math.cos(this.azimuth));
    }
  }

  // ---------- entrada ----------

  private bindInput(): void {
    const el = this.renderer.domElement;
    el.addEventListener('pointerdown', (e) => {
      el.setPointerCapture(e.pointerId);
      // no modo construção o botão esquerdo traça; o direito arrasta a câmera
      const building = this.ctrl.mode === 'build' && e.button === 0 && !this.hud.isMenuOpen();
      Object.assign(this.pointer, { down: true, x: e.clientX, y: e.clientY, startX: e.clientX, startY: e.clientY, dragged: false, building });
      if (building) this.beginBuildDrag(e.clientX, e.clientY);
    });
    el.addEventListener('pointermove', (e) => {
      const p = this.pointer;
      this.shiftDown = e.shiftKey;
      if (this.ctrl.mode === 'build' && (!p.down || p.building)) {
        if (p.down && Math.hypot(e.clientX - p.startX, e.clientY - p.startY) > CLICK_SLOP) p.dragged = true;
        this.hover = {};
        this.updateBuildHover(e.clientX, e.clientY);
        p.x = e.clientX;
        p.y = e.clientY;
        return;
      }
      if (p.down) {
        if (Math.hypot(e.clientX - p.startX, e.clientY - p.startY) > CLICK_SLOP) p.dragged = true;
        if (p.dragged) {
          this.pan(e.clientX - p.x, e.clientY - p.y);
          this.hover = {};
          this.hud.closeMenu();
          this.hud.setTooltip(0, 0, null);
        }
      } else if (this.ctrl.placing) {
        this.hover = {};
        this.ghostTile = this.groundTile(e.clientX, e.clientY);
        el.style.cursor = 'crosshair';
        this.hud.setTooltip(0, 0, null);
      } else {
        this.hover = this.pick(e.clientX, e.clientY);
        if (this.ctrl.mode === 'buy') this.hover.tile = undefined;
        el.style.cursor = this.hover.entry || this.hover.folk || this.hover.mess ? 'pointer' : 'default';
        const tip = this.hover.folk
          ? this.hud.folkTooltip(this.hover.folk)
          : this.hover.mess
            ? t(`mess.${this.hover.mess.kind}`)
            : this.hover.entry
              ? this.hud.objectTooltip(this.hover.entry.obj)
              : null;
        this.hud.setTooltip(e.clientX, e.clientY, tip);
      }
      p.x = e.clientX;
      p.y = e.clientY;
    });
    el.addEventListener('pointerup', (e) => {
      const wasDrag = this.pointer.dragged;
      const wasBuilding = this.pointer.building;
      this.pointer.down = false;
      this.pointer.building = false;
      if (wasBuilding) {
        this.commitBuild(e.clientX, e.clientY);
        return;
      }
      if (wasDrag) return;
      if (e.button === 2) {
        // clique direito desiste do que estava sendo posto (ou do traço)
        if (this.ctrl.placing) this.ctrl.placing = null;
        if (this.buildDrag) this.cancelBuildDrag();
        return;
      }
      this.click(e.clientX, e.clientY);
    });
    el.addEventListener('pointerleave', () => {
      this.hover = {};
      this.hud.setTooltip(0, 0, null);
      if (!this.pointer.down) this.clearBuildPreview();
    });
    el.addEventListener(
      'wheel',
      (e) => {
        e.preventDefault();
        this.viewHeight = THREE.MathUtils.clamp(this.viewHeight * (e.deltaY > 0 ? 1.1 : 0.9), 4, 24);
      },
      { passive: false },
    );
    el.addEventListener('contextmenu', (e) => e.preventDefault());

    window.addEventListener('keyup', (e) => {
      if (e.key === 'Shift') this.shiftDown = false;
    });
    window.addEventListener('keydown', (e) => {
      if (e.target instanceof HTMLInputElement) return;
      if (e.key === 'Shift') this.shiftDown = true;
      if (e.code === 'KeyZ' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        if (this.ctrl.mode === 'build') this.ctrl.undoBuild();
        return;
      }
      switch (e.code) {
        case 'Space':
          e.preventDefault();
          this.togglePause();
          break;
        case 'Digit1':
        case 'Digit2':
        case 'Digit3':
          this.ctrl.command({ type: 'setSpeed', speed: Number(e.code.slice(5)) as Speed });
          break;
        case 'KeyQ':
          this.ctrl.rotateCamera(-1);
          break;
        case 'KeyE':
          this.ctrl.rotateCamera(1);
          break;
        case 'KeyR':
          this.ctrl.rotatePlacing();
          break;
        case 'KeyB':
          this.hud.toggleBuyMode();
          break;
        case 'KeyC':
          this.hud.toggleBuildMode();
          break;
        case 'Tab':
          e.preventDefault();
          this.ctrl.selectNext();
          break;
        case 'Escape':
          if (this.hud.isMenuOpen()) this.hud.closeMenu();
          else if (this.ctrl.placing) this.ctrl.placing = null;
          else if (this.buildDrag) this.cancelBuildDrag();
          else if (this.ctrl.mode === 'buy') this.hud.toggleBuyMode();
          else if (this.ctrl.mode === 'build') this.hud.toggleBuildMode();
          break;
      }
    });
  }

  private togglePause(): void {
    const speed = this.ctrl.world.speed;
    if (speed === 0) {
      this.ctrl.command({ type: 'setSpeed', speed: this.lastSpeed });
    } else {
      this.lastSpeed = speed;
      this.ctrl.command({ type: 'setSpeed', speed: 0 });
    }
  }

  private pan(dxPx: number, dyPx: number): void {
    const el = this.renderer.domElement;
    const unit = this.viewHeight / Math.max(1, el.clientHeight);
    const rightX = Math.cos(this.azimuth);
    const rightZ = -Math.sin(this.azimuth);
    const fwdX = -Math.sin(this.azimuth);
    const fwdZ = -Math.cos(this.azimuth);
    const along = (dyPx * unit) / Math.sin(ELEVATION);
    this.target.x += -rightX * dxPx * unit + fwdX * along;
    this.target.z += -rightZ * dxPx * unit + fwdZ * along;
    const { w, h } = this.ctrl.world.grid;
    this.target.x = THREE.MathUtils.clamp(this.target.x, -6, w + 6);
    this.target.z = THREE.MathUtils.clamp(this.target.z, -6, h + 8);
  }

  private pick(clientX: number, clientY: number): Hover {
    const rect = this.renderer.domElement.getBoundingClientRect();
    const ndc = new THREE.Vector2(((clientX - rect.left) / rect.width) * 2 - 1, -((clientY - rect.top) / rect.height) * 2 + 1);
    this.raycaster.setFromCamera(ndc, this.camera);
    // gente na frente dos móveis: o clique num folk ganha
    const people = [...this.folks.values()].filter((e) => e.model.group.visible).map((e) => e.model.group);
    const who = this.raycaster.intersectObjects(people, true)[0];
    if (who && this.ctrl.mode === 'live') {
      let o: THREE.Object3D | null = who.object;
      while (o && o.userData.folkId === undefined) o = o.parent;
      const folk = o ? this.ctrl.sim.findFolk(o.userData.folkId as number) : undefined;
      if (folk) return { folk };
    }
    if (this.ctrl.mode === 'live') {
      const hitMess = this.raycaster.intersectObjects(this.messRoot.children, true)[0];
      if (hitMess) {
        let o: THREE.Object3D | null = hitMess.object;
        while (o && o.userData.messId === undefined) o = o.parent;
        const mess = o ? this.ctrl.world.mess.find((m) => m.id === o!.userData.messId) : undefined;
        if (mess) return { mess };
      }
    }
    const groups = [...this.objects.values()].map((e) => e.model.group);
    const hit = this.raycaster.intersectObjects(groups, true)[0];
    if (hit) {
      let o: THREE.Object3D | null = hit.object;
      while (o && o.userData.objectId === undefined) o = o.parent;
      const entry = o ? this.objects.get(o.userData.objectId as number) : undefined;
      if (entry) return { entry };
    }
    const ground = this.raycaster.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), this.tmp);
    if (!ground) return {};
    const tile = { x: Math.floor(ground.x), y: Math.floor(ground.z) };
    return this.ctrl.sim.getNav().isFree(tile.x, tile.y) ? { tile } : {};
  }

  /** Tile do chão sob o mouse (sem olhar para objetos), ou null fora do terreno. */
  private groundTile(clientX: number, clientY: number): { x: number; y: number } | null {
    const rect = this.renderer.domElement.getBoundingClientRect();
    const ndc = new THREE.Vector2(((clientX - rect.left) / rect.width) * 2 - 1, -((clientY - rect.top) / rect.height) * 2 + 1);
    this.raycaster.setFromCamera(ndc, this.camera);
    const ground = this.raycaster.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), this.tmp);
    if (!ground || !this.ctrl.placing) return null;
    // o tile sob o mouse fica no centro do objeto
    const def = this.ctrl.sim.catalog.objects[this.ctrl.placing.defId];
    const size = def ? objectSize(def, this.ctrl.placing.rot) : { w: 1, h: 1 };
    return { x: Math.floor(ground.x - (size.w - 1) / 2), y: Math.floor(ground.z - (size.h - 1) / 2) };
  }

  private click(clientX: number, clientY: number): void {
    if (this.hud.isMenuOpen()) {
      this.hud.closeMenu();
      return;
    }
    if (this.ctrl.mode === 'build') return;
    if (this.ctrl.mode === 'buy') {
      if (this.ctrl.placing) {
        const tile = this.groundTile(clientX, clientY);
        if (tile && this.ctrl.place(tile.x, tile.y)) this.addPing(tile.x, tile.y);
        return;
      }
      const hit = this.pick(clientX, clientY);
      if (hit.entry) this.hud.openBuyMenu(clientX, clientY, hit.entry.obj);
      return;
    }
    const hit = this.pick(clientX, clientY);
    const folk = this.ctrl.folk;
    if (hit.folk) {
      this.hud.setTooltip(0, 0, null);
      if (hit.folk.id !== folk.id) this.hud.openSocialMenu(clientX, clientY, hit.folk);
      return;
    }
    if (hit.mess) {
      this.hud.setTooltip(0, 0, null);
      this.hud.openMessMenu(clientX, clientY, hit.mess);
    } else if (hit.entry) {
      this.hud.setTooltip(0, 0, null);
      this.hud.openMenu(clientX, clientY, hit.entry.obj);
    } else if (hit.tile) {
      if (this.ctrl.commandOrExplain({ type: 'queueGoto', folkId: folk.id, ...hit.tile })) {
        this.addPing(hit.tile.x, hit.tile.y);
      }
    }
  }

  /** Refaz os modelos da bagunça quando ela muda. */
  private syncMess(): void {
    const world = this.ctrl.world;
    const mess = world.mess ?? [];
    const sig = mess.map((m) => m.id).join(',') + `|${this.ctrl.objectsVersion}`;
    if (sig === this.messSig) return;
    this.messSig = sig;
    this.messRoot.traverse((o) => {
      if (o instanceof THREE.Mesh) o.geometry.dispose();
    });
    this.messRoot.clear();
    for (const m of mess) {
      // em cima de mesa ou bancada, o prato fica no tampo
      let top = 0;
      for (const e of this.objects.values()) {
        if (SURFACE_TOP[e.def.art] === undefined) continue;
        const size = objectSize(e.def, e.obj.rot);
        if (m.x >= e.obj.x && m.y >= e.obj.y && m.x < e.obj.x + size.w && m.y < e.obj.y + size.h) top = SURFACE_TOP[e.def.art];
      }
      const stack = mess.filter((o) => o.x === m.x && o.y === m.y && o.id < m.id).length;
      const g = buildMess(m.kind, m.id, top);
      const jitter = ((m.id * 37) % 7) / 7 - 0.5;
      g.position.set(m.x + 0.5 + jitter * 0.3, top + (m.kind === 'plate' ? stack * 0.03 : m.kind === 'paper' ? stack * 0.11 : 0), m.y + 0.5 - jitter * 0.25);
      g.userData.messId = m.id;
      this.messRoot.add(g);
    }
    if (this.hover.mess && !mess.includes(this.hover.mess)) this.hover = {};
  }

  private addPing(x: number, y: number): void {
    const mesh = new THREE.Mesh(
      new THREE.RingGeometry(0.3, 0.38, 20),
      new THREE.MeshBasicMaterial({ color: PAL.mustard, transparent: true, depthWrite: false, side: THREE.DoubleSide }),
    );
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set(x + 0.5, 0.05, y + 0.5);
    this.scene.add(mesh);
    this.pings.push({ mesh, age: 0 });
  }

  // ---------- quadro a quadro ----------

  private frame(dt: number): void {
    if (this.builtVersion !== this.ctrl.worldVersion) this.rebuild();
    if (this.builtObjects !== this.ctrl.objectsVersion) {
      this.rebuildObjects();
      this.buildHouse();
    }
    if (this.builtGrid !== this.ctrl.gridVersion) this.buildHouse();
    const world = this.ctrl.world;

    const rate = TICKS_PER_SECOND[world.speed];
    if (rate > 0) {
      this.acc += dt * rate;
      let steps = Math.floor(this.acc);
      if (steps > MAX_STEPS_PER_FRAME) {
        steps = MAX_STEPS_PER_FRAME;
        this.acc = steps;
      }
      for (let i = 0; i < steps; i++) this.ctrl.step();
      this.acc -= steps;
      this.animTime += dt * Math.min(rate / 2, 2.5);
    }
    const alpha = Math.min(1, this.acc);

    this.updateCamera(dt);
    const night = nightAmount(clockOf(world.tick).dayFraction + alpha / 1440);
    this.applyDaylight(night);

    // quem está usando o quê
    const using = new Map<number, string>();
    for (const folk of world.folks) {
      const a = folk.queue[0];
      if (a?.phase === 'using' && a.objectId !== undefined && a.interactionId) using.set(a.objectId, a.interactionId);
    }
    this.syncMess();
    for (const entry of this.objects.values()) {
      entry.model.tick?.({ time: this.animTime, using: using.get(entry.obj.id), night });
      if (entry.obj.state) entry.fx.update(entry.obj.state, !!entry.def.upkeep?.bin && entry.obj.state.fill >= 100, this.animTime);
      const s = entry === this.hover.entry ? 1.04 : 1;
      entry.model.group.scale.lerp(this.tmp.set(s, s, s), 0.3);
    }

    this.syncFolks();
    for (const folk of world.folks) this.updateFolk(folk, alpha, dt);
    this.showOutcomes();
    this.updateMarkers(dt);
    this.updateGhost();
    if (this.ctrl.mode !== 'build' && (this.buildPreview.children.length > 0 || this.buildDrag)) {
      this.buildDrag = null;
      this.clearBuildPreview();
    }

    this.renderer.setRenderTarget(this.frameBuffer);
    this.renderer.render(this.scene, this.camera);
    this.renderer.setRenderTarget(null);
    this.renderer.render(this.post, this.postCamera);

    this.hudClock += dt;
    if (this.hudClock > 0.09) {
      this.hudClock = 0;
      this.hud.update();
    }
  }

  private applyDaylight(night: number): void {
    this.sun.intensity = THREE.MathUtils.lerp(2.0, 0.4, night);
    this.sun.color.setHex(PAL.sun).lerp(new THREE.Color(PAL.moon), night);
    this.hemi.intensity = THREE.MathUtils.lerp(1.5, 0.65, night);
    this.hemi.color.setHex(0xffffff).lerp(new THREE.Color(0x7f93d8), night);
    this.scene.background = new THREE.Color(PAL.sky).lerp(new THREE.Color(PAL.nightSky), night);
  }

  private anchorToWorld(entry: ObjectEntry, a: Anchor): { x: number; y: number; z: number; heading: number } {
    const cos = Math.cos(entry.turn);
    const sin = Math.sin(entry.turn);
    return {
      x: entry.center.x + a.x * cos + a.z * sin,
      y: a.y,
      z: entry.center.z - a.x * sin + a.z * cos,
      heading: a.heading + entry.turn,
    };
  }

  private updateFolk(folk: Folk, alpha: number, dt: number): void {
    const view = this.folks.get(folk.id);
    if (!view) return;
    const selected = folk.id === this.ctrl.selectedFolkId;
    // no trabalho, o folk não está em casa
    view.model.group.visible = !folk.away;
    if (folk.away) {
      view.zzz.forEach((z) => (z.visible = false));
      if (selected) {
        this.ring.visible = false;
        this.hud.setBubble(-1000, 0, null);
      }
      return;
    }
    const sim = this.ctrl.sim;
    const action = folk.queue[0];
    const it: InteractionDef | undefined = action?.phase === 'using' ? sim.interactionOf(action) : undefined;
    const entry = it && action?.objectId !== undefined ? this.objects.get(action.objectId) : undefined;

    const fx = folk.px + (folk.x - folk.px) * alpha + 0.5;
    const fz = folk.py + (folk.y - folk.py) * alpha + 0.5;
    let place = { x: fx, y: 0, z: fz, heading: Math.atan2(folk.facing.x, folk.facing.y) };
    let anim: FolkAnim = 'idle';
    let expr: Expression | undefined;
    let onObject = false;
    const social = it ? undefined : this.socialLook(folk);

    if (folk.collapsed > 0) {
      anim = 'collapsed';
      place = { x: fx, y: 0.12, z: fz + 0.8, heading: 0 };
    } else if (it && entry) {
      anim =
        ANIMS[`${entry.def.art}:${it.id}`] ??
        (it.care ? CARE_ANIMS[it.care] : undefined) ??
        (it.pose === 'sit' ? 'sit' : it.pose === 'lie' ? 'sleep' : it.pose === 'dance' ? 'dance' : 'reach');
      if (it.onObject) {
        let anchor: Anchor | undefined;
        if (anim === 'sleep') anchor = entry.spec.lie;
        else if (anim === 'sit' && entry.spec.sit && action?.slot !== undefined && entry.spec.sit[action.slot]) {
          anchor = entry.spec.sit[action.slot];
        } else if (anim === 'sit' && entry.spec.sit) {
          // senta no lugar mais perto de onde chegou
          let best = Infinity;
          for (const a of entry.spec.sit) {
            const w = this.anchorToWorld(entry, a);
            const d = Math.hypot(w.x - fx, w.z - fz);
            if (d < best) {
              best = d;
              anchor = a;
            }
          }
        } else anchor = entry.spec.stand;
        if (anchor) {
          place = this.anchorToWorld(entry, anchor);
          onObject = true;
        }
      }
    } else if (action?.kind === 'tidy' && action.phase === 'using') {
      anim = 'scrub';
    } else if (folk.px !== folk.x || folk.py !== folk.y) {
      anim = 'walk';
    } else if (social) {
      anim = social.anim;
      expr = social.expr;
      if (anim === 'talk' && Math.sin(this.animTime * 7 + folk.id) > 0.2) expr = 'talk';
      // abraço e beijo: os dois chegam mais perto do meio
      if (anim === 'hug' || anim === 'kiss') {
        const dx = social.other.x - folk.x;
        const dz = social.other.y - folk.y;
        place.x += dx * 0.3;
        place.z += dz * 0.3;
        place.heading = Math.atan2(dx, dz);
      }
    }

    const mood = moodOf(sim.catalog, folk.needs);
    view.model.update({ anim, ...place, mood, time: this.animTime, dt, expr });

    const iconKey = social?.icon;
    view.icon.visible = !!iconKey;
    if (iconKey) {
      if (iconKey !== view.iconKey) {
        view.iconKey = iconKey;
        view.icon.material.map = getTexture(iconKey);
        view.icon.material.needsUpdate = true;
      }
      const top = view.model.headTop(this.tmp);
      view.icon.position.set(top.x, top.y + 0.32 + Math.sin(this.animTime * 3) * 0.04, top.z);
    }

    if (selected) {
      this.ring.visible = !onObject && folk.collapsed === 0;
      this.ring.position.set(view.model.group.position.x, 0.04, view.model.group.position.z);
      this.ring.rotation.z += dt * 1.4;
      const pulse = 1 + Math.sin(performance.now() / 300) * 0.05;
      this.ring.scale.set(pulse, pulse, 1);
    }

    const head = view.model.headTop(this.tmp);
    const asleep = anim === 'sleep' || anim === 'collapsed';
    view.zzz.forEach((s, i) => {
      s.visible = asleep;
      if (!asleep) return;
      const k = (this.animTime * 0.45 + i / 3) % 1;
      s.position.set(head.x + 0.15 + k * 0.35, head.y + 0.1 + k * 0.9, head.z);
      s.scale.setScalar(0.16 + k * 0.2);
      s.material.opacity = 1 - k;
    });

    if (selected) {
      const el = this.renderer.domElement;
      const v = head.clone().project(this.camera);
      const sx = (v.x * 0.5 + 0.5) * el.clientWidth;
      const sy = (-v.y * 0.5 + 0.5) * el.clientHeight;
      this.hud.setBubble(sx, sy - 6, bubbleIcon(folk, it?.effects));
    }
  }

  /** Animação e expressão que uma conversa pede (quem puxa e quem ouve). */
  private socialLook(folk: Folk): SocialLook | undefined {
    const sim = this.ctrl.sim;
    const a: Action | undefined = folk.queue[0];
    if (!a || a.otherId === undefined) return undefined;
    const other = sim.findFolk(a.otherId);
    if (!other) return undefined;
    if (a.kind === 'social' && a.phase === 'using') {
      const def: SocialDef | undefined = sim.catalog.socials[a.socialId ?? ''];
      if (!def) return undefined;
      const rejected = a.accepted === false && a.elapsed > 1;
      return {
        anim: def.anim,
        expr: rejected ? 'sad' : def.anim === 'argue' ? 'angry' : def.anim === 'talk' ? undefined : 'happy',
        other,
        icon: `soc:${def.category}`,
      };
    }
    if (a.kind === 'listen') {
      const theirs = other.queue[0];
      if (theirs?.kind !== 'social' || theirs.phase !== 'using') return { anim: 'idle', other };
      const def = sim.catalog.socials[theirs.socialId ?? ''];
      if (!def) return undefined;
      if (theirs.accepted === false) return { anim: 'listen', expr: def.category === 'mean' ? 'angry' : 'neutral', other };
      const anim = def.targetAnim ?? 'listen';
      return { anim, expr: anim === 'argue' ? 'angry' : anim === 'listen' ? undefined : 'happy', other };
    }
    return undefined;
  }

  /** Mostra sobre as cabeças o que cada conversa mudou na relação. */
  private showOutcomes(): void {
    const el = this.renderer.domElement;
    const screen = (id: number) => {
      const view = this.folks.get(id);
      if (!view || !view.model.group.visible) return null;
      const v = view.model.headTop(this.tmp).clone();
      v.y += 0.55;
      v.project(this.camera);
      return { x: (v.x * 0.5 + 0.5) * el.clientWidth, y: (-v.y * 0.5 + 0.5) * el.clientHeight };
    };
    for (const o of this.ctrl.sim.drainOutcomes()) {
      const target = screen(o.toId);
      if (target) {
        const text = deltaText(o.toTarget);
        if (!o.accepted) this.hud.floatChip(target.x, target.y, t('social.rejected'), 'bad');
        else if (text) this.hud.floatChip(target.x, target.y, text, toneOf(o.toTarget));
      }
      const self = screen(o.fromId);
      const mine = deltaText(o.toSelf);
      if (self && mine) this.hud.floatChip(self.x, self.y - (o.accepted ? 0 : 0), mine, toneOf(o.toSelf));
    }
  }

  private updateMarkers(dt: number): void {
    const { entry, tile } = this.hover;
    this.hoverTile.visible = !!tile;
    if (tile) this.hoverTile.position.set(tile.x + 0.5, 0.035, tile.y + 0.5);
    this.hoverPad.visible = !!entry;
    if (entry) {
      this.hoverPad.position.set(entry.center.x, 0.03, entry.center.z);
      const size = objectSize(entry.def, entry.obj.rot);
      this.hoverPad.scale.set(size.w + 0.14, size.h + 0.14, 1);
    }
    for (const p of this.pings) {
      p.age += dt;
      const k = p.age / 0.6;
      p.mesh.scale.setScalar(1 + k * 0.9);
      (p.mesh.material as THREE.MeshBasicMaterial).opacity = Math.max(0, 1 - k);
    }
    this.pings = this.pings.filter((p) => {
      if (p.age < 0.6) return true;
      this.scene.remove(p.mesh);
      p.mesh.geometry.dispose();
      return false;
    });
  }
  // ---------- modo compra ----------

  private clearGhost(): void {
    if (!this.ghost) return;
    this.scene.remove(this.ghost.group);
    this.ghost.group.traverse((o) => {
      if (o instanceof THREE.Mesh) {
        o.geometry.dispose();
        (o.material as THREE.Material).dispose();
      }
    });
    this.ghost = null;
  }

  /** Mostra o objeto sendo posto, com o chão verde (cabe) ou vermelho (não cabe). */
  private updateGhost(): void {
    const placing = this.ctrl.mode === 'buy' ? this.ctrl.placing : null;
    const def = placing && this.ctrl.sim.catalog.objects[placing.defId];
    const tile = this.ghostTile;
    if (!placing || !def || !tile) {
      this.clearGhost();
      this.ghostPad.visible = false;
      for (const e of this.objects.values()) e.model.group.visible = true;
      return;
    }
    const key = `${placing.defId}|${placing.moveId ?? ''}`;
    if (this.ghost?.key !== key) {
      this.clearGhost();
      const group = buildFurniture(def.art, placing.moveId ?? 1).group;
      group.traverse((o) => {
        if (!(o instanceof THREE.Mesh)) return;
        const mats = Array.isArray(o.material) ? o.material : [o.material];
        const ghosts = mats.map((m: THREE.Material) => {
          const c = m.clone();
          c.transparent = true;
          c.opacity = 0.72;
          return c;
        });
        o.material = Array.isArray(o.material) ? ghosts : ghosts[0];
        o.castShadow = false;
        o.raycast = () => {};
      });
      this.scene.add(group);
      this.ghost = { key, group };
    }
    // o objeto que está sendo movido some do lugar antigo
    for (const e of this.objects.values()) e.model.group.visible = e.obj.id !== placing.moveId;

    const spec = furnitureSpec(def.art);
    const size = objectSize(def, placing.rot);
    const g = this.ghost.group;
    g.position.set(tile.x + size.w / 2, 0.02, tile.y + size.h / 2);
    g.rotation.y = (spec.facing === 'E' ? Math.PI / 2 : 0) + placing.rot * (Math.PI / 2);
    const ok = checkPlacement(this.ctrl.world, this.ctrl.sim.catalog, placing.defId, tile.x, tile.y, placing.rot, placing.moveId).ok;
    const affordable = placing.moveId !== undefined || this.ctrl.world.household.funds >= def.price;
    this.ghostPad.visible = true;
    this.ghostPad.position.set(tile.x + size.w / 2, 0.04, tile.y + size.h / 2);
    this.ghostPad.scale.set(size.w, size.h, 1);
    (this.ghostPad.material as THREE.MeshBasicMaterial).color.setHex(ok && affordable ? 0x6fd06a : 0xe0533f);
  }

  // ---------- modo construção ----------

  /** Ponto do chão (y = 0) sob o mouse. */
  private groundPoint(clientX: number, clientY: number): THREE.Vector3 | null {
    const rect = this.renderer.domElement.getBoundingClientRect();
    const ndc = new THREE.Vector2(((clientX - rect.left) / rect.width) * 2 - 1, -((clientY - rect.top) / rect.height) * 2 + 1);
    this.raycaster.setFromCamera(ndc, this.camera);
    return this.raycaster.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), new THREE.Vector3());
  }

  /** Vértice do grid mais perto do mouse (cantos dos tiles). */
  private vertexAt(clientX: number, clientY: number): { x: number; y: number } | null {
    const p = this.groundPoint(clientX, clientY);
    if (!p) return null;
    const { w, h } = this.ctrl.world.grid;
    return { x: THREE.MathUtils.clamp(Math.round(p.x), 0, w), y: THREE.MathUtils.clamp(Math.round(p.z), 0, h) };
  }

  private tileAt(clientX: number, clientY: number): { x: number; y: number } | null {
    const p = this.groundPoint(clientX, clientY);
    if (!p) return null;
    const { w, h } = this.ctrl.world.grid;
    const x = Math.floor(p.x);
    const y = Math.floor(p.z);
    return x >= 0 && y >= 0 && x < w && y < h ? { x, y } : null;
  }

  /**
   * Face de parede sob o mouse: primeiro tenta acertar uma parede de verdade
   * (vale para as inteiras, que ficam em pé na frente do chão); se não, usa a
   * borda mais perto do ponto do chão.
   */
  private faceAt(clientX: number, clientY: number): string | null {
    const rect = this.renderer.domElement.getBoundingClientRect();
    const ndc = new THREE.Vector2(((clientX - rect.left) / rect.width) * 2 - 1, -((clientY - rect.top) / rect.height) * 2 + 1);
    this.raycaster.setFromCamera(ndc, this.camera);
    const walls = this.house.pickables();
    const hit = this.raycaster.intersectObjects(
      walls.map((w) => w.object),
      true,
    )[0];
    if (hit) {
      let o: THREE.Object3D | null = hit.object;
      while (o && o.userData.edge === undefined) o = o.parent;
      const edge = o?.userData.edge as string | undefined;
      if (edge) {
        const [xs, ys, side] = edge.split(',');
        const front = side === 'N' ? hit.point.z > Number(ys) : hit.point.x > Number(xs);
        return facesOfEdge(edge)[front ? 0 : 1];
      }
    }
    const tile = this.tileAt(clientX, clientY);
    const p = this.groundPoint(clientX, clientY);
    if (!tile || !p) return null;
    const fx = p.x - tile.x;
    const fy = p.z - tile.y;
    const sides: [Side, number][] = [
      ['N', fy],
      ['S', 1 - fy],
      ['W', fx],
      ['E', 1 - fx],
    ];
    sides.sort((a, b) => a[1] - b[1]);
    return faceKey(tile.x, tile.y, sides[0][0]);
  }

  private beginBuildDrag(clientX: number, clientY: number): void {
    const tool = this.ctrl.buildTool;
    if (tool === 'wall' || tool === 'erase') {
      const v = this.vertexAt(clientX, clientY);
      if (v) this.buildDrag = { start: v, cur: v };
    } else if (tool === 'floor') {
      const t = this.tileAt(clientX, clientY);
      if (t) this.buildDrag = { start: t, cur: t };
    }
    this.updateBuildHover(clientX, clientY);
  }

  private cancelBuildDrag(): void {
    this.buildDrag = null;
    this.pointer.building = false;
    this.clearBuildPreview();
  }

  /** Monta o comando que o mouse está apontando e a prévia dele. */
  private updateBuildHover(clientX: number, clientY: number): void {
    const tool = this.ctrl.buildTool;
    const drag = this.buildDrag;
    let cmd: BuildCommand | null = null;
    if (tool === 'wall' || tool === 'erase') {
      const v = this.vertexAt(clientX, clientY);
      if (drag && v) {
        // a linha segue o eixo em que o mouse andou mais
        const dx = Math.abs(v.x - drag.start.x);
        const dy = Math.abs(v.y - drag.start.y);
        drag.cur = dx >= dy ? { x: v.x, y: drag.start.y } : { x: drag.start.x, y: v.y };
        const c = { x0: drag.start.x, y0: drag.start.y, x1: drag.cur.x, y1: drag.cur.y };
        cmd = tool === 'wall' ? { type: 'buildWalls', ...c } : { type: 'eraseWalls', ...c };
      } else if (v) {
        this.showVertex(v);
        this.hud.setTooltip(clientX, clientY, t(tool === 'wall' ? 'build.hint.wallStart' : 'build.hint.eraseStart'));
        this.buildCmd = null;
        return;
      }
    } else if (tool === 'floor') {
      const tile = this.tileAt(clientX, clientY);
      if (drag && tile) drag.cur = tile;
      const a = drag?.start ?? tile;
      const b = drag?.cur ?? tile;
      if (a && b) cmd = { type: 'paintFloor', x0: a.x, y0: a.y, x1: b.x, y1: b.y, floorId: this.ctrl.floorId };
    } else if (tool === 'door' || tool === 'window') {
      const face = this.faceAt(clientX, clientY);
      if (face) cmd = { type: 'placeOpening', edge: edgeOfFace(face), kind: tool };
    } else if (tool === 'paint') {
      const face = this.faceAt(clientX, clientY);
      if (face) {
        const [xs, ys] = face.split(',');
        const faces = this.shiftDown ? roomFaces(this.ctrl.world.grid, Number(xs), Number(ys)) : [face];
        if (faces.length) cmd = { type: 'paintWalls', faces, coveringId: this.ctrl.coveringId };
      }
    }
    this.buildCmd = cmd;
    if (!cmd) {
      this.clearBuildPreview();
      this.hud.setTooltip(0, 0, null);
      return;
    }
    const plan = planBuild(this.ctrl.world, this.ctrl.sim.catalog, cmd);
    const tip = plan.ok
      ? plan.cost > 0
        ? formatMoney(plan.cost)
        : t('build.free')
      : `${plan.cost > 0 ? `${formatMoney(plan.cost)} · ` : ''}${t(`problem.${plan.problem ?? 'invalid'}`)}`;
    this.hud.setTooltip(clientX, clientY, tip);
    const key = `${JSON.stringify(cmd)}|${plan.ok}|${this.ctrl.gridVersion}`;
    if (key !== this.previewKey) {
      this.previewKey = key;
      this.drawPreview(cmd, plan.ok);
    }
  }

  /** Solta o botão: o traço (ou o clique) vira obra. */
  private commitBuild(clientX: number, clientY: number): void {
    const tool = this.ctrl.buildTool;
    if (this.hud.isMenuOpen()) {
      this.hud.closeMenu();
      return;
    }
    this.updateBuildHover(clientX, clientY);
    const cmd = this.buildCmd;
    this.buildDrag = null;
    if (cmd) {
      const ok = this.ctrl.commandOrExplain(cmd);
      if (ok && cmd.type === 'placeOpening') this.addPing(...this.edgeCenter(cmd.edge));
      if (ok && tool === 'floor' && cmd.type === 'paintFloor') this.addPing(cmd.x1, cmd.y1);
    }
    this.previewKey = '';
    this.clearBuildPreview();
    this.updateBuildHover(clientX, clientY);
  }

  private edgeCenter(edge: string): [number, number] {
    const [xs, ys, side] = edge.split(',');
    return side === 'N' ? [Number(xs), Number(ys) - 0.5] : [Number(xs) - 0.5, Number(ys)];
  }

  private clearBuildPreview(): void {
    this.buildPreview.traverse((o) => {
      if (o instanceof THREE.Mesh) {
        o.geometry.dispose();
        const mats = Array.isArray(o.material) ? o.material : [o.material];
        for (const m of mats) if ((m as THREE.Material).userData.preview) (m as THREE.Material).dispose();
      }
    });
    this.buildPreview.clear();
    this.previewKey = '';
    this.buildCmd = null;
  }

  private showVertex(v: { x: number; y: number }): void {
    const key = `v|${v.x},${v.y}|${this.ctrl.buildTool}`;
    if (key === this.previewKey) return;
    this.clearBuildPreview();
    this.previewKey = key;
    const post = new THREE.Mesh(new THREE.BoxGeometry(TH + 0.08, 0.7, TH + 0.08), previewMat(this.ctrl.buildTool === 'erase' ? 0xe0533f : PAL.mustard, 0.85));
    post.position.set(v.x, 0.35, v.y);
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.18, 0.26, 16), previewMat(PAL.mustard, 0.9));
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(v.x, 0.03, v.y);
    this.buildPreview.add(post, ring);
  }

  /** Desenha a prévia: verde/amarelo onde dá, vermelho onde não dá. */
  private drawPreview(cmd: BuildCommand, ok: boolean): void {
    const keep = this.previewKey;
    this.clearBuildPreview();
    this.previewKey = keep;
    this.buildCmd = cmd;
    const grid = this.ctrl.world.grid;
    const bad = 0xe0533f;
    const edgeBox = (edge: string, h: number, len: number, color: number, opacity: number) => {
      const [xs, ys, side] = edge.split(',');
      const x = Number(xs);
      const y = Number(ys);
      const north = side === 'N';
      const m = new THREE.Mesh(new THREE.BoxGeometry(north ? len : TH + 0.04, h, north ? TH + 0.04 : len), previewMat(color, opacity));
      m.position.set(north ? x + 0.5 : x, h / 2, north ? y : y + 0.5);
      m.renderOrder = 3;
      this.buildPreview.add(m);
    };

    if (cmd.type === 'buildWalls' || cmd.type === 'eraseWalls') {
      const edges = lineEdges(grid, cmd.x0, cmd.y0, cmd.x1, cmd.y1) ?? [];
      for (const e of edges) {
        const exists = !!grid.edges[e];
        if (cmd.type === 'buildWalls') edgeBox(e, exists ? 0.5 : WALL_H * 0.75, 1, ok ? 0x6fd06a : bad, exists ? 0.3 : 0.55);
        else edgeBox(e, exists ? WALL_H * 0.75 : 0.12, 1, exists ? bad : 0xffffff, exists ? 0.55 : 0.35);
      }
      for (const [vx, vy] of [
        [cmd.x0, cmd.y0],
        [cmd.x1, cmd.y1],
      ]) {
        const post = new THREE.Mesh(new THREE.BoxGeometry(TH + 0.08, 0.8, TH + 0.08), previewMat(PAL.mustard, 0.9));
        post.position.set(vx, 0.4, vy);
        this.buildPreview.add(post);
      }
    } else if (cmd.type === 'placeOpening') {
      const exists = !!grid.edges[cmd.edge];
      const h = cmd.kind === 'door' ? 2.1 : 1.3;
      edgeBox(cmd.edge, exists && this.house.isTallEdge(cmd.edge) ? h : Math.max(h * 0.5, LOW_H + 0.4), cmd.kind === 'door' ? 0.8 : 0.86, ok ? 0x6fd06a : bad, 0.6);
    } else if (cmd.type === 'paintFloor') {
      const kind = FLOOR_ART.includes(cmd.floorId) ? cmd.floorId : cmd.floorId === 'grass' ? 'grass' : 'wood';
      const mat = ok ? previewTexMat(kind, 0.85) : previewMat(bad, 0.5);
      const xa = Math.max(0, Math.min(cmd.x0, cmd.x1));
      const xb = Math.min(grid.w - 1, Math.max(cmd.x0, cmd.x1));
      const ya = Math.max(0, Math.min(cmd.y0, cmd.y1));
      const yb = Math.min(grid.h - 1, Math.max(cmd.y0, cmd.y1));
      const pos: number[] = [];
      const uv: number[] = [];
      const idx: number[] = [];
      for (let y = ya; y <= yb; y++) {
        for (let x = xa; x <= xb; x++) {
          const b = pos.length / 3;
          pos.push(x, 0, y, x + 1, 0, y, x, 0, y + 1, x + 1, 0, y + 1);
          uv.push(x, -y, x + 1, -y, x, -(y + 1), x + 1, -(y + 1));
          idx.push(b, b + 2, b + 1, b + 1, b + 2, b + 3);
        }
      }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
      geo.setIndex(idx);
      // o piso aparece por cima de tudo: num cômodo ainda fechado, a parede
      // inteira esconderia o chão
      mat.depthTest = false;
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.y = 0.03;
      mesh.renderOrder = 4;
      const frame = new THREE.LineSegments(
        new THREE.EdgesGeometry(new THREE.BoxGeometry(xb - xa + 1, 0.02, yb - ya + 1)),
        new THREE.LineBasicMaterial({ color: ok ? PAL.mustard : bad }),
      );
      frame.position.set((xa + xb + 1) / 2, 0.05, (ya + yb + 1) / 2);
      this.buildPreview.add(mesh, frame);
    } else if (cmd.type === 'paintWalls') {
      const art = COVER_ART[cmd.coveringId];
      for (const face of cmd.faces) {
        const edge = edgeOfFace(face);
        if (!grid.edges[edge]) continue;
        const tall = this.house.isTallEdge(edge);
        const h = tall ? WALL_H : LOW_H + 0.02;
        const [xs, ys, side] = face.split(',');
        const x = Number(xs);
        const y = Number(ys);
        const plane = new THREE.Mesh(new THREE.PlaneGeometry(1, h), ok && art ? previewTexMat(art.tex, 0.9) : previewMat(bad, 0.5));
        if (ok && art) {
          // a textura da parede cobre 2,6 m de altura
          const uvs = plane.geometry.getAttribute('uv');
          for (let i = 0; i < uvs.count; i++) uvs.setY(i, uvs.getY(i) * (h / WALL_H));
        }
        const off = TH / 2 + 0.012;
        plane.renderOrder = 3;
        if (side === 'N') {
          plane.position.set(x + 0.5, h / 2, y + off);
        } else if (side === 'S') {
          plane.position.set(x + 0.5, h / 2, y + 1 - off);
          plane.rotation.y = Math.PI;
        } else if (side === 'W') {
          plane.position.set(x + off, h / 2, y + 0.5);
          plane.rotation.y = Math.PI / 2;
        } else {
          plane.position.set(x + 1 - off, h / 2, y + 0.5);
          plane.rotation.y = -Math.PI / 2;
        }
        this.buildPreview.add(plane);
      }
    }
  }

  /**
   * Amostra de piso ou revestimento para o catálogo do modo construção: o
   * desenho da própria textura, sem luz.
   */
  swatch(texture: string, tall = false): string {
    const key = `sw|${texture}|${tall}`;
    const hit = this.thumbs.get(key);
    if (hit) return hit;
    const img = getTexture(texture).image as HTMLCanvasElement;
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 64;
    const ctx = canvas.getContext('2d')!;
    ctx.imageSmoothingEnabled = false;
    if (tall) {
      // parede: a metade de baixo, com rodapé, que é onde está o desenho
      const sh = Math.min(img.height, img.width * 1.5);
      ctx.drawImage(img, 0, img.height - sh, img.width, sh, 10, 0, 44, 64);
    } else {
      ctx.drawImage(img, 0, 0, img.width, img.height, 0, 0, 64, 64);
    }
    const url = canvas.toDataURL();
    this.thumbs.set(key, url);
    return url;
  }

  /**
   * Miniatura de um objeto para o catálogo, renderizada com o mesmo ângulo e
   * as mesmas cores de 16 bits do jogo. Fica em cache por id de desenho.
   */
  thumbnail(art: string): string {
    const hit = this.thumbs.get(art);
    if (hit) return hit;
    const size = 96;
    const scene = new THREE.Scene();
    scene.add(new THREE.HemisphereLight(0xffffff, 0xc4b295, 1.6));
    const sun = new THREE.DirectionalLight(PAL.sun, 2.0);
    sun.position.set(-3, 6, 4);
    scene.add(sun);
    const model = buildFurniture(art, 3);
    const spec = furnitureSpec(art);
    model.group.rotation.y = spec.facing === 'E' ? Math.PI / 2 : 0;
    scene.add(model.group);
    const box = new THREE.Box3().setFromObject(model.group);
    const center = box.getCenter(new THREE.Vector3());
    const radius = Math.max(0.5, box.getSize(new THREE.Vector3()).length() / 2);
    const cam = new THREE.OrthographicCamera(-radius, radius, radius, -radius, 0.1, 50);
    const az = Math.PI / 4;
    cam.position.set(Math.sin(az) * Math.cos(ELEVATION), Math.sin(ELEVATION), Math.cos(az) * Math.cos(ELEVATION)).multiplyScalar(20).add(center);
    cam.lookAt(center);
    cam.updateMatrixWorld();

    const target = new THREE.WebGLRenderTarget(size, size, { type: THREE.UnsignedByteType, colorSpace: THREE.SRGBColorSpace });
    const prevColor = this.renderer.getClearColor(new THREE.Color());
    const prevAlpha = this.renderer.getClearAlpha();
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.setRenderTarget(target);
    this.renderer.clear();
    this.renderer.render(scene, cam);
    const pixels = new Uint8Array(size * size * 4);
    this.renderer.readRenderTargetPixels(target, 0, 0, size, size, pixels);
    this.renderer.setRenderTarget(null);
    this.renderer.setClearColor(prevColor, prevAlpha);
    target.dispose();
    model.group.traverse((o) => {
      if (o instanceof THREE.Mesh) o.geometry.dispose();
    });

    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = size;
    const ctx = canvas.getContext('2d')!;
    const img = ctx.createImageData(size, size);
    // a imagem vem de baixo para cima; reduz para 5-6-5 bits como o jogo
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const src = ((size - 1 - y) * size + x) * 4;
        const dst = (y * size + x) * 4;
        img.data[dst] = pixels[src] & 0xf8;
        img.data[dst + 1] = pixels[src + 1] & 0xfc;
        img.data[dst + 2] = pixels[src + 2] & 0xf8;
        img.data[dst + 3] = pixels[src + 3] > 8 ? 255 : 0;
      }
    }
    ctx.putImageData(img, 0, 0);
    const url = canvas.toDataURL();
    this.thumbs.set(art, url);
    return url;
  }
}

/** Material da prévia de obra: cor chapada, meio transparente, por cima de tudo. */
function previewMat(color: number, opacity: number): THREE.MeshBasicMaterial {
  const m = new THREE.MeshBasicMaterial({ color, transparent: true, opacity, depthWrite: false, side: THREE.DoubleSide });
  m.userData.preview = true;
  return m;
}

/** Material da prévia com a textura do piso ou da parede escolhida. */
function previewTexMat(texture: string, opacity: number): THREE.MeshBasicMaterial {
  const base = texMat(texture);
  const m = new THREE.MeshBasicMaterial({ map: base.map, transparent: true, opacity, depthWrite: false, side: THREE.DoubleSide });
  m.userData.preview = true;
  return m;
}

/**
 * Passo final: converte a imagem para a tela e reduz as cores para 16 bits
 * (5-6-5) com pontilhado ordenado, como as placas de vídeo do fim dos anos 90.
 */
function retroPass(scene: THREE.Texture): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: { tScene: { value: scene } },
    depthTest: false,
    depthWrite: false,
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = vec4(position.xy, 0.0, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform sampler2D tScene;
      varying vec2 vUv;
      float bayer2(vec2 a) {
        a = floor(a);
        return fract(a.x / 2.0 + a.y * a.y * 0.75);
      }
      float bayer4(vec2 a) {
        return bayer2(0.5 * a) * 0.25 + bayer2(a);
      }
      vec3 toScreen(vec3 c) {
        return mix(c * 12.92, 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, step(0.0031308, c));
      }
      void main() {
        vec3 c = toScreen(clamp(texture2D(tScene, vUv).rgb, 0.0, 1.0));
        float d = bayer4(gl_FragCoord.xy) - 0.5;
        vec3 levels = vec3(31.0, 63.0, 31.0);
        c = floor(c * levels + 0.5 + d) / levels;
        gl_FragColor = vec4(c, 1.0);
      }
    `,
  });
}

/** "amizade +4 · romance +6", arredondado; vazio se nada mudou de verdade. */
function deltaText(d: RelDelta): string {
  const parts: string[] = [];
  for (const axis of ['friendship', 'romance', 'respect'] as const) {
    const v = Math.round(d[axis] ?? 0);
    if (v !== 0) parts.push(`${t(`rel.${axis}`)} ${v > 0 ? '+' : '−'}${Math.abs(v)}`);
  }
  return parts.join(' · ');
}

function toneOf(d: RelDelta): 'good' | 'bad' | 'love' {
  const sum = (d.friendship ?? 0) + (d.romance ?? 0) + (d.respect ?? 0);
  if (sum < 0) return 'bad';
  return (d.romance ?? 0) > 0 ? 'love' : 'good';
}

/** Ícone do balão: a necessidade que a ação mais recupera. */
function bubbleIcon(folk: Folk, effects?: Partial<Record<NeedId, number>>): NeedId | 'sleep' | null {
  if (folk.collapsed > 0) return 'sleep';
  if (!effects) return null;
  let best: NeedId | null = null;
  let bestV = 0;
  for (const id of NEED_IDS) {
    const v = effects[id] ?? 0;
    if (v > bestV) {
      bestV = v;
      best = id;
    }
  }
  return best;
}

/** 0 de dia, 1 no meio da noite. */
function nightAmount(dayFraction: number): number {
  const h = (dayFraction % 1) * 24;
  if (h >= 7 && h < 17.5) return 0;
  if (h >= 17.5 && h < 21) return (h - 17.5) / 3.5;
  if (h >= 5 && h < 7) return 1 - (h - 5) / 2;
  return 1;
}
