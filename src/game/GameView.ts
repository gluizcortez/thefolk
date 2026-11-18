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
  nightAmount,
  objectSize,
  planBuild,
  roomFaces,
  wallBehind,
  wearsRing,
  STAIR_RUN,
  edgeLevel,
  levelOfRow,
  rowOn,
  stairPlan,
  stairStepAt,
  strideOf,
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
import { COVER_ART, FLOOR_ART, HALF_H, House, LEVEL_H, LOW_H, POOL_SURFACE, TH, WALL_H, sceneZ } from './art/house';
import { CHILD_SCALE, TEEN_SCALE } from './art/folk';
import { poolOf, poolTiles } from '../sim/yard';
import { raining } from '../sim/garden';
import { isLineTool, isOpeningTool } from './controller';
import { texMat } from './art/build';
import { PAINT, PAL } from './art/palette';
import { colorOf } from '../sim/furnish';
import { wearOf } from '../sim/family';
import { thoughtOf } from '../sim/will';
import { reactionTo } from '../sim/topics';
import { stationDef } from '../sim/music';
import type { Age, Look, UniformDef, Wear } from '../sim/types';
import { SCHOOL_BUS, ridesWaiting, uniformOf, vehicleOf } from '../sim/career';
import { cribOf } from '../sim/kids';
import { buildVehicle, vehicleLength } from './art/vehicles';
import type { VehicleModel } from './art/vehicles';
import { buildScenery } from './art/scenery';
import { getTexture } from './art/textures';
import { flames } from './art/peril';
import { fireAt } from '../sim/peril';
import type { Fire, Spirit } from '../sim/types';
import { WearFx, buildMess } from './art/upkeep';
import type { GameController } from './controller';
import { TownView } from './town';

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
/** Bloco 14: bombeiro (capa vermelha e capacete), policial, gatuno (de preto e gorro) e o Seu Sereno (terno cor de anoitecer e cartola). */
const CREW_UNIFORMS: Partial<Record<string, UniformDef>> = {
  firefighter: { style: 'coat', top: 0xb8261e, bottom: 0x2a2a30, accent: 0xf2c94c, hat: 'helmet' },
  police: { style: 'jacket', top: 0x2c3e66, bottom: 0x1e2433, accent: 0xd9b13a, hat: 'cap' },
  burglar: { style: 'track', top: 0x26262c, bottom: 0x1c1c22, accent: 0x5a5a66, hat: 'band' },
  reaper: { style: 'coat', top: 0x3a3f66, bottom: 0x23263f, accent: 0xc8b88a, hat: 'top' },
};

const ANIMS: Record<string, FolkAnim> = {
  'phone:call': 'phone',
  'bookshelf:read': 'read',
  'tv:watch': 'watch',
  'shower:shower': 'scrub',
  // bloco 4
  'bookcrate:read': 'read',
  'bookcase:read': 'read',
  'tvcheap:watch': 'watch',
  'tvbig:watch': 'watch',
  'showercheap:shower': 'scrub',
  'showerluxe:shower': 'scrub',
  'mirror:practice': 'talk',
  'telescope:stargaze': 'reach',
  'punchbag:punch': 'argue',
  // bloco 11
  'crib:feedBaby': 'reach',
  'crib:changeBaby': 'scrub',
  'crib:holdBaby': 'cradle',
  'crib:lullBaby': 'cradle',
  'dollhouse:playHouse': 'reach',
  'spintop:spinTop': 'reach',
};

/** Cuidados com a casa: a mesma animação em qualquer objeto. */
const CARE_ANIMS: Record<string, FolkAnim> = {
  clean: 'scrub',
  repair: 'scrub',
  service: 'reach',
  dishes: 'scrub',
  empty: 'reach',
  dump: 'reach',
  // bloco 13
  water: 'reach',
  harvest: 'reach',
  replant: 'scrub',
};

/** Altura do tampo das superfícies, para o prato ficar em cima (o resto vai no chão). */
const SURFACE_TOP: Record<string, number> = {
  dinette: 0.77,
  desk: 0.77,
  counter: 0.92,
  kitchensink: 0.92,
  tablefold: 0.76,
  table: 0.76,
  tablemarble: 0.78,
};

interface ObjectEntry {
  obj: WorldObject;
  def: ObjectDef;
  spec: FurnitureSpec;
  model: FurnitureModel;
  center: THREE.Vector3;
  turn: number;
  /** manchas, moscas, fumaça e faísca (bloco 1) */
  fx: WearFx;
  /** altura do modelo (bloco 7: as notas do som saem daí) */
  height: number;
  /** bloco 7: notas que sobem do som ligado */
  notes?: { station: string; sprites: THREE.Sprite[] };
  /** bloco 12: andar do objeto */
  level: number;
}

interface FolkEntry {
  model: FolkModel;
  /** bloco 5: aparência e roupa com que o modelo foi montado */
  lookKey: string;
  zzz: THREE.Sprite[];
  /** plaquinha do tipo de conversa, sobre quem puxou */
  icon: THREE.Sprite;
  iconKey: string;
  /** bloco 6: balão cujo gesto já começou (tick em que nasceu) e há quanto tempo (s reais) */
  gestureOf: number;
  gestureT: number;
}

interface Hover {
  entry?: ObjectEntry;
  mess?: Mess;
  tile?: { x: number; y: number };
  folk?: Folk;
}

function lookKey(look: Look, wear: Wear, uniform?: UniformDef, age?: Age): string {
  return `${JSON.stringify(look)}|${wear}|${uniform ? JSON.stringify(uniform) : ''}|${age ?? ''}`;
}

/** Bloco 8: uma carona na rua. */
interface RideView {
  model: VehicleModel;
  /** posição ao longo da rua (x do centro) e quanto já andou */
  x: number;
  dist: number;
  /** chegando, parado esperando, parado deixando alguém, indo embora */
  phase: 'in' | 'wait' | 'drop' | 'out';
  /** segundos parado deixando quem voltou */
  hold: number;
  stopX: number;
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
  /** bloco 8: caronas na rua (chegando, esperando, indo embora) */
  private rides = new Map<string, RideView>();
  private rideRoot = new THREE.Group();
  /** quem estava no trabalho no quadro anterior (para ver a volta para casa) */
  /** quem está fora e se foi à escola (true) ou ao trabalho */
  private wasAway = new Map<number, boolean>();
  /** bloco 12: altura do alvo da câmera (sobe e desce com o andar) */
  private aimY = 0;
  /** bloco 12: quem estava selecionado e em que andar (a vista segue quando muda) */
  private followKey = '';
  /** bloco 12: degrau de cada tile de escada (índice do tile → degrau) */
  private stairSteps = new Map<number, number>();
  /** bloco 14: chamas, fumaça, fantasmas e o jato do extintor */
  private perilRoot = new THREE.Group();
  private fireViews = new Map<number, { group: THREE.Group; tick(time: number, heat: number): void; smoke: THREE.Sprite[]; light: THREE.PointLight | null }>();
  private spiritViews = new Map<string, { model: FolkModel; mats: THREE.MeshPhongMaterial[] }>();
  private sprays = new Map<number, THREE.Mesh>();
  /** bloco 15: a vista do bairro (desenhada na mesma imagem interna) */
  readonly town: TownView;

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

    this.scene.add(this.hemi, this.sun, this.sun.target, this.worldRoot, this.rideRoot);
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
    this.scene.add(this.ring, this.hoverTile, this.hoverPad, this.ghostPad, this.buildPreview, this.perilRoot);

    this.post.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), retroPass(this.frameBuffer.texture)));

    this.town = new TownView(ctrl);
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
    this.rideRoot.clear();
    this.rides.clear();
    this.perilRoot.traverse((o) => {
      if (o instanceof THREE.Mesh) o.geometry.dispose();
    });
    this.perilRoot.clear();
    this.fireViews.clear();
    this.spiritViews.clear();
    this.sprays.clear();
    this.wasAway = new Map(this.ctrl.world.folks.filter((f) => f.away).map((f) => [f.id, !!f.away!.school || f.age === 'child']));

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
    this.followKey = '';
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
      if (!def || def.layer === 'wall' || def.layer === 'ceiling') continue;
      const size = objectSize(def, obj.rot);
      for (let dy = 0; dy < size.h; dy++) for (let dx = 0; dx < size.w; dx++) occupied.add(`${obj.x + dx},${obj.y + dy}`);
    }
    const floors = this.ctrl.sim.catalog.floors;
    this.house = new House(grid, floors, this.ctrl.sim.catalog);
    this.stairSteps.clear();
    for (const st of grid.stairs ?? []) {
      stairPlan(grid, st).run.forEach((t, i) => this.stairSteps.set(t.y * grid.w + t.x, i));
    }
    // bloco 13: caminho, deck e piscina não recebem enfeite de cenário
    const free = (x: number, y: number) =>
      x >= 0 && y >= 0 && x < grid.w && y < grid.h && floors[grid.floor[y * grid.w + x]]?.outdoor === true && !floors[grid.floor[y * grid.w + x]]?.yard && !occupied.has(`${x},${y}`);
    const hole = (x: number, y: number) => !!floors[grid.floor[y * grid.w + x]]?.water;
    this.scenery = buildScenery(grid, free, hole, !!world.outing);
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
      const model = new FolkModel(folk.look, wearOf(folk), this.uniformFor(folk), folk.age);
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
      this.folks.set(folk.id, {
        model,
        zzz,
        icon,
        iconKey: 'soc:friendly',
        lookKey: lookKey(folk.look, wearOf(folk), this.uniformFor(folk), folk.age),
        gestureOf: -1,
        gestureT: 99,
      });
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
      const paint = colorOf(obj, def);
      const model = buildFurniture(def.art, obj.id, paint ? PAINT[paint] : undefined);
      const size = objectSize(def, obj.rot);
      // bloco 12: o objeto vai para a altura do andar dele
      const at = sceneZ(this.ctrl.world.grid, obj.y);
      const center = new THREE.Vector3(obj.x + size.w / 2, at.base, at.z + size.h / 2);
      const turn = (spec.facing === 'E' ? Math.PI / 2 : 0) + obj.rot * (Math.PI / 2);
      const height = Math.max(0.3, new THREE.Box3().setFromObject(model.group).max.y);
      model.group.position.copy(center);
      model.group.rotation.y = turn;
      model.group.userData.objectId = obj.id;
      const fx = new WearFx(size.w, size.h, height, obj.id);
      fx.group.position.copy(center);
      this.objectsRoot.add(model.group, fx.group);
      this.objects.set(obj.id, { obj, def, spec, model, center, turn, fx, height, level: at.level });
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
    // bloco 12: o alvo sobe e desce com o andar que se está vendo
    const goalY = this.ctrl.viewLevel * LEVEL_H;
    this.aimY += (goalY - this.aimY) * (1 - Math.exp(-dt * 10));
    if (Math.abs(goalY - this.aimY) < 0.002) this.aimY = goalY;
    const aimY = Math.round(this.aimY / px) * px;
    const aim = this.tmp.set(along * cos - depth * sin, aimY, -along * sin - depth * cos).clone();
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

    const state = `${this.ctrl.wallMode}|${Math.sin(this.azimuth) > 0}|${Math.cos(this.azimuth) > 0}|${this.ctrl.viewLevel}`;
    if (state !== this.wallState) {
      this.wallState = state;
      this.house.update(this.ctrl.wallMode, Math.sin(this.azimuth), Math.cos(this.azimuth), this.ctrl.viewLevel);
      this.previewKey = '';
    }
  }

  // ---------- entrada ----------

  private bindInput(): void {
    const el = this.renderer.domElement;
    const ndc = (e: PointerEvent): [number, number] => {
      const rect = el.getBoundingClientRect();
      return [((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1];
    };
    el.addEventListener('pointerdown', (e) => {
      el.setPointerCapture(e.pointerId);
      // bloco 15: no bairro o clique escolhe um lote e o arrasto anda pela rua
      if (this.ctrl.screen === 'town') {
        this.town.pointerDown(e.clientX, e.clientY);
        return;
      }
      // no modo construção o botão esquerdo traça; o direito arrasta a câmera
      const building = this.ctrl.mode === 'build' && e.button === 0 && !this.hud.isMenuOpen();
      Object.assign(this.pointer, { down: true, x: e.clientX, y: e.clientY, startX: e.clientX, startY: e.clientY, dragged: false, building });
      if (building) this.beginBuildDrag(e.clientX, e.clientY);
    });
    el.addEventListener('pointermove', (e) => {
      if (this.ctrl.screen === 'town') {
        const [nx, ny] = ndc(e);
        this.town.pointerMove(e.clientX, e.clientY, nx, ny, el.clientHeight);
        el.style.cursor = this.town.hover ? 'pointer' : 'default';
        this.hud.setTooltip(0, 0, null);
        return;
      }
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
      if (this.ctrl.screen === 'town') {
        const [nx, ny] = ndc(e);
        const lot = this.town.pointerUp(nx, ny);
        if (lot) this.ctrl.townLot = lot;
        return;
      }
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
        if (this.ctrl.screen === 'town') {
          this.town.zoom(e.deltaY);
          return;
        }
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
      // bloco 5: com a tela de criar família aberta, o jogo não ouve o teclado
      if (document.querySelector('.creator:not([hidden])')) return;
      // bloco 15: no bairro só o Esc (volta para o lote) vale
      if (this.ctrl.screen === 'town') {
        if (e.code === 'Escape') this.ctrl.closeTown();
        return;
      }
      if (e.key === 'Shift') this.shiftDown = true;
      if (e.code === 'KeyZ' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        if (this.ctrl.mode === 'build') this.ctrl.undoBuild();
        else if (this.ctrl.mode === 'buy') this.ctrl.undoBuy();
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
        // bloco 12: sobe e desce o andar que se vê
        case 'PageUp':
          e.preventDefault();
          this.ctrl.changeLevel(1);
          break;
        case 'PageDown':
          e.preventDefault();
          this.ctrl.changeLevel(-1);
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
    // bloco 12: parede inteira na frente segura o clique (nada de atravessar parede)
    const wall = this.raycaster.intersectObjects(this.house.solidWalls(), true)[0];
    const wallAt = wall ? wall.distance : Infinity;
    // gente na frente dos móveis: o clique num folk ganha
    const people = [...this.folks.values()].filter((e) => e.model.group.visible).map((e) => e.model.group);
    const who = this.raycaster.intersectObjects(people, true).find((h) => h.distance < wallAt);
    if (who && this.ctrl.mode === 'live') {
      let o: THREE.Object3D | null = who.object;
      while (o && o.userData.folkId === undefined) o = o.parent;
      const folk = o ? this.ctrl.sim.findFolk(o.userData.folkId as number) : undefined;
      if (folk) return { folk };
    }
    if (this.ctrl.mode === 'live') {
      const hitMess = this.raycaster
        .intersectObjects(
          this.messRoot.children.filter((m) => m.visible),
          true,
        )
        .find((h) => h.distance < wallAt);
      if (hitMess) {
        let o: THREE.Object3D | null = hitMess.object;
        while (o && o.userData.messId === undefined) o = o.parent;
        const mess = o ? this.ctrl.world.mess.find((m) => m.id === o!.userData.messId) : undefined;
        if (mess) return { mess };
      }
    }
    // no modo vivo, tapete não rouba o clique do chão; quadro escondido não conta
    const groups = [...this.objects.values()]
      .filter((e) => e.model.group.visible && (this.ctrl.mode !== 'live' || e.def.layer !== 'floor'))
      .map((e) => e.model.group);
    const hit = this.raycaster.intersectObjects(groups, true).find((h) => h.distance < wallAt);
    if (hit) {
      let o: THREE.Object3D | null = hit.object;
      while (o && o.userData.objectId === undefined) o = o.parent;
      const entry = o ? this.objects.get(o.userData.objectId as number) : undefined;
      if (entry) return { entry };
    }
    const ground = this.levelPoint();
    if (!ground || this.raycaster.ray.origin.distanceTo(ground) > wallAt) return {};
    const tile = this.levelTile(ground);
    return tile && this.ctrl.sim.getNav().isFree(tile.x, tile.y) ? { tile } : {};
  }

  /** Bloco 12: onde o raio do mouse acerta o chão do andar que se está vendo. */
  private levelPoint(): THREE.Vector3 | null {
    const h = this.ctrl.viewLevel * LEVEL_H;
    return this.raycaster.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0, 1, 0), -h), new THREE.Vector3());
  }

  /** Bloco 12: tile (em linhas do grid inteiro) de um ponto do chão do andar visto. */
  private levelTile(p: THREE.Vector3, dx = 0, dz = 0): { x: number; y: number } | null {
    const grid = this.ctrl.world.grid;
    const x = Math.floor(p.x - dx);
    const z = Math.floor(p.z - dz);
    if (x < 0 || z < 0 || x >= grid.w || z >= grid.h) return null;
    return { x, y: rowOn(grid, this.ctrl.viewLevel, z) };
  }

  /** Tile do chão sob o mouse (sem olhar para objetos), ou null fora do terreno. */
  private groundTile(clientX: number, clientY: number): { x: number; y: number } | null {
    const rect = this.renderer.domElement.getBoundingClientRect();
    const ndc = new THREE.Vector2(((clientX - rect.left) / rect.width) * 2 - 1, -((clientY - rect.top) / rect.height) * 2 + 1);
    this.raycaster.setFromCamera(ndc, this.camera);
    const ground = this.levelPoint();
    if (!ground || !this.ctrl.placing) return null;
    // o tile sob o mouse fica no centro do objeto
    const def = this.ctrl.sim.catalog.objects[this.ctrl.placing.defId];
    const size = def ? objectSize(def, this.ctrl.placing.rot) : { w: 1, h: 1 };
    const x = Math.floor(ground.x - (size.w - 1) / 2);
    const z = Math.floor(ground.z - (size.h - 1) / 2);
    return { x, y: rowOn(this.ctrl.world.grid, this.ctrl.viewLevel, z) };
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
      const at = sceneZ(world.grid, m.y);
      g.position.set(m.x + 0.5 + jitter * 0.3, at.base + top + (m.kind === 'plate' ? stack * 0.03 : m.kind === 'paper' ? stack * 0.11 : 0), at.z + 0.5 - jitter * 0.25);
      g.userData.messId = m.id;
      g.userData.level = at.level;
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
    const at = sceneZ(this.ctrl.world.grid, y);
    mesh.position.set(x + 0.5, at.base + 0.05, at.z + 0.5);
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

    // bloco 15: com o bairro aberto, a tela mostra a rua inteira (o tempo está parado)
    if (this.ctrl.screen === 'town') {
      const el = this.renderer.domElement;
      this.town.render(this.renderer, this.frameBuffer, el.clientWidth / Math.max(1, el.clientHeight));
      this.renderer.setRenderTarget(null);
      this.renderer.render(this.post, this.postCamera);
      this.hudClock += dt;
      if (this.hudClock > 0.09) {
        this.hudClock = 0;
        this.hud.update();
      }
      return;
    }

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
    // bloco 13: chuva escurece o dia e cai em riscos; a água da piscina ondula
    const wet = raining(world);
    this.rainLevel += ((wet ? 1 : 0) - this.rainLevel) * Math.min(1, dt * 0.8);
    this.applyDaylight(night, this.rainLevel);
    this.updateRain(dt);
    const waterTex = this.house?.waterMats[0]?.map;
    if (waterTex) {
      waterTex.offset.set(Math.sin(this.animTime * 0.4) * 0.06, this.animTime * 0.035);
    }

    // quem está usando o quê
    const using = new Map<number, string>();
    for (const folk of world.folks) {
      const a = folk.queue[0];
      if (a?.phase === 'using' && a.objectId !== undefined && a.interactionId) using.set(a.objectId, a.interactionId);
    }
    this.syncMess();
    for (const m of this.messRoot.children) m.visible = (m.userData.level ?? 0) <= this.ctrl.viewLevel;
    for (const entry of this.objects.values()) {
      entry.model.tick?.({
        time: this.animTime,
        using: using.get(entry.obj.id),
        night,
        lit: (!!entry.obj.lit && !entry.obj.state?.broken) || (entry.obj.blaze ?? 0) > world.tick,
        ringing: !!world.call && !world.call.answeredBy,
        stock: entry.obj.snacks,
        plant: entry.obj.plant,
        alarm: this.alarmFor(entry.def.safety),
      });
      if (entry.obj.state) entry.fx.update(entry.obj.state, !!entry.def.upkeep?.bin && entry.obj.state.fill >= 100, this.animTime);
      this.updateNotes(entry);
      const s = entry === this.hover.entry ? 1.04 : 1;
      entry.model.group.scale.lerp(this.tmp.set(s, s, s), 0.3);
    }

    this.syncFolks();
    for (const folk of world.folks) this.updateFolk(folk, alpha, dt);
    this.updateRides(dt);
    this.updatePerils(alpha, dt);
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

  /**
   * Bloco 11: onde o bebê aparece. No colo de quem está pegando (na altura do
   * peito, atravessado nos braços); senão, deitado no colchão do berço.
   */
  private babyPlace(baby: Folk): { place: { x: number; y: number; z: number; heading: number } } | null {
    const world = this.ctrl.world;
    const crib = cribOf(world, baby);
    if (!crib) return null;
    for (const f of world.folks) {
      const a = f.queue[0];
      if (a?.phase !== 'using' || a.objectId !== crib.id) continue;
      const it = this.ctrl.sim.interactionOf(a);
      if (it?.baby !== 'hold' && it?.baby !== 'lull') continue;
      const holder = this.folks.get(f.id)?.model.group;
      if (!holder) continue;
      const h = holder.rotation.y;
      const fwdX = Math.sin(h);
      const fwdZ = Math.cos(h);
      // os pés do bebê vão para um lado e a cabeça para o outro, nos braços
      return {
        place: {
          x: holder.position.x + fwdX * 0.26 - fwdZ * 0.3,
          y: holder.position.y + 0.98 + Math.sin(this.animTime * (it.baby === 'lull' ? 2.4 : 1.2)) * 0.02,
          z: holder.position.z + fwdZ * 0.26 + fwdX * 0.3,
          heading: h - Math.PI / 2,
        },
      };
    }
    const entry = this.objects.get(crib.id);
    const anchor = entry?.spec.lie;
    if (!entry || !anchor) return null;
    return { place: this.anchorToWorld(entry, anchor) };
  }

  // ---------- bloco 14: fogo, fantasmas e o jato do extintor ----------

  /** O alarme deste tipo está disparado agora? */
  private alarmFor(kind: 'extinguisher' | 'smoke' | 'burglar' | undefined): boolean {
    const world = this.ctrl.world;
    if (kind === 'smoke') return (world.fires ?? []).length > 0;
    if (kind === 'burglar') return (world.help?.police ?? 0) !== 0 && world.folks.some((f) => f.visit?.service?.kind === 'burglar');
    return false;
  }

  /** Onde nada quem ficou preso na piscina sem escadinha. */
  private adriftPlace(folk: Folk): { x: number; y: number; z: number; heading: number } | null {
    const sim = this.ctrl.sim;
    const at = folk.adrift;
    if (!at) return null;
    const pool = poolTiles(sim.world.grid, sim.catalog, at.x, at.y);
    if (pool.length === 0) return null;
    let x0 = Infinity;
    let x1 = -Infinity;
    let z0 = Infinity;
    let z1 = -Infinity;
    for (const t of pool) {
      x0 = Math.min(x0, t.x);
      x1 = Math.max(x1, t.x + 1);
      z0 = Math.min(z0, t.y);
      z1 = Math.max(z1, t.y + 1);
    }
    const base = sceneZ(sim.world.grid, at.y);
    const rx = Math.max(0.15, (x1 - x0) / 2 - 0.45);
    const rz = Math.max(0.15, (z1 - z0) / 2 - 0.45);
    // devagar e cansado, em volta da beira
    const a = this.animTime * (0.3 / Math.max(rx, rz, 0.5)) + folk.id;
    const cx = (x0 + x1) / 2;
    const cz = base.z - at.y + (z0 + z1) / 2;
    return {
      x: cx + Math.cos(a) * rx,
      y: base.base - POOL_SURFACE - 1.32 + Math.sin(this.animTime * 2) * 0.05,
      z: cz + Math.sin(a) * rz,
      heading: Math.atan2(-Math.sin(a) * rx, Math.cos(a) * rz),
    };
  }

  private updatePerils(alpha: number, dt: number): void {
    const world = this.ctrl.world;
    const grid = world.grid;
    const view = this.ctrl.viewLevel;
    // chamas
    const fires: Fire[] = world.fires ?? [];
    for (const f of fires) {
      let v = this.fireViews.get(f.id);
      if (!v) {
        const fl = flames(1, f.id % 7);
        const smoke: THREE.Sprite[] = [];
        for (let i = 0; i < 3; i++) {
          const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: getTexture('blob'), color: 0x3a3634, transparent: true, opacity: 0.5, depthWrite: false }));
          sp.userData.phase = i / 3 + (f.id % 5) * 0.13;
          smoke.push(sp);
          fl.group.add(sp);
        }
        // uma luz só para cada grupinho de fogo (luz demais pesa)
        const light = fires.indexOf(f) % 3 === 0 ? new THREE.PointLight(0xff8a30, 0, 6, 1.6) : null;
        if (light) {
          light.position.y = 0.8;
          fl.group.add(light);
        }
        const at = sceneZ(grid, f.y);
        fl.group.position.set(f.x + 0.5, at.base, at.z + 0.5);
        fl.group.userData.level = at.level;
        this.perilRoot.add(fl.group);
        v = { group: fl.group, tick: fl.tick, smoke, light };
        this.fireViews.set(f.id, v);
      }
      v.group.visible = (v.group.userData.level ?? 0) <= view;
      v.tick(this.animTime, f.heat);
      if (v.light) v.light.intensity = 2 + 2 * (f.heat / 100) + Math.sin(this.animTime * 13 + f.id) * 0.6;
      for (const sp of v.smoke) {
        const k = (this.animTime * 0.35 + (sp.userData.phase as number)) % 1;
        sp.position.set(Math.sin(k * 6 + f.id) * 0.15, 0.8 + k * 1.8, Math.cos(k * 5) * 0.1);
        sp.scale.setScalar(0.35 + k * 0.9);
        sp.material.opacity = 0.55 * (1 - k) * Math.min(1, f.heat / 40);
      }
    }
    for (const [id, v] of this.fireViews) {
      if (fires.some((f) => f.id === id)) continue;
      this.perilRoot.remove(v.group);
      v.group.traverse((o) => {
        if (o instanceof THREE.Mesh) o.geometry.dispose();
      });
      this.fireViews.delete(id);
    }
    // jato do extintor (ou da mangueira) de quem está apagando
    for (const folk of world.folks) {
      const a = folk.queue[0];
      const target = a?.kind === 'douse' && a.phase === 'using' && a.target ? a.target : null;
      let jet = this.sprays.get(folk.id);
      if (!target || !fireAt(world, target.x, target.y)) {
        if (jet) jet.visible = false;
        continue;
      }
      if (!jet) {
        jet = new THREE.Mesh(
          new THREE.CylinderGeometry(0.03, 0.22, 1, 8, 1, true),
          new THREE.MeshBasicMaterial({ color: 0xf2f4f6, transparent: true, opacity: 0.55, depthWrite: false, side: THREE.DoubleSide }),
        );
        this.perilRoot.add(jet);
        this.sprays.set(folk.id, jet);
      }
      const from = this.footAt(folk.x, folk.y);
      const to = this.footAt(target.x, target.y);
      const a0 = new THREE.Vector3(from.x + (to.x - from.x) * 0.25, from.y + 0.95, from.z + (to.z - from.z) * 0.25);
      const b0 = new THREE.Vector3(to.x, to.y + 0.3, to.z);
      const len = a0.distanceTo(b0);
      jet.position.copy(a0).lerp(b0, 0.5);
      jet.scale.set(1 + Math.sin(this.animTime * 30) * 0.08, len, 1);
      jet.lookAt(b0);
      jet.rotateX(Math.PI / 2);
      jet.visible = true;
    }
    for (const [id, jet] of this.sprays) {
      if (world.folks.some((f) => f.id === id)) continue;
      this.perilRoot.remove(jet);
      jet.geometry.dispose();
      this.sprays.delete(id);
    }
    // fantasmas: a pessoa como era, azulada e meio transparente, flutuando
    const spirits: Spirit[] = world.spirits ?? [];
    for (const s of spirits) {
      const key = `${s.personId}:${s.objectId}`;
      let v = this.spiritViews.get(key);
      if (!v) {
        const who = (world.departed ?? []).find((d) => d.id === s.personId);
        if (!who) continue;
        const model = new FolkModel(who.look, 'day', undefined, who.age);
        const mats: THREE.MeshPhongMaterial[] = [];
        model.group.traverse((o) => {
          if (!(o instanceof THREE.Mesh)) return;
          const src = Array.isArray(o.material) ? o.material : [o.material];
          const next = src.map((m) => {
            const c = (m as THREE.MeshPhongMaterial).clone();
            c.transparent = true;
            c.opacity = 0.45;
            c.depthWrite = false;
            c.color = new THREE.Color(0x9fc4ff).lerp(c.color ?? new THREE.Color(0xffffff), 0.35);
            // só material com brilho próprio tem emissive (o básico, do rosto e dos olhos, não)
            if ((c as THREE.MeshPhongMaterial).emissive) {
              c.emissive = new THREE.Color(0x3a5a9a);
              c.emissiveIntensity = 0.8;
            }
            mats.push(c);
            return c;
          });
          o.material = Array.isArray(o.material) ? next : next[0];
          o.castShadow = false;
        });
        this.perilRoot.add(model.group);
        v = { model, mats };
        this.spiritViews.set(key, v);
      }
      const from = this.footAt(s.px, s.py);
      const to = this.footAt(s.x, s.y);
      const moving = s.px !== s.x || s.py !== s.y;
      const x = from.x + (to.x - from.x) * alpha;
      const z = from.z + (to.z - from.z) * alpha;
      const y = from.y + 0.25 + Math.sin(this.animTime * 2 + s.personId) * 0.08;
      const heading = moving ? Math.atan2(to.x - from.x, to.z - from.z) : v.model.group.rotation.y;
      v.model.update({ anim: 'idle', x, y, z, heading, mood: 30, time: this.animTime, dt, expr: 'sad' });
      v.model.group.visible = levelOfRow(grid, s.y) <= view;
      const flicker = 0.38 + 0.12 * Math.sin(this.animTime * 3 + s.personId);
      for (const m of v.mats) m.opacity = flicker;
    }
    for (const [key, v] of this.spiritViews) {
      if (spirits.some((s) => `${s.personId}:${s.objectId}` === key)) continue;
      this.perilRoot.remove(v.model.group);
      v.model.group.traverse((o) => {
        if (o instanceof THREE.Mesh) o.geometry.dispose();
      });
      this.spiritViews.delete(key);
    }
  }

  /** Bloco 8: uniforme de quem está de roupa de trabalho (e tem emprego). */
  private uniformFor(folk: Folk): UniformDef | undefined {
    // bloco 14: bombeiro, policial, gatuno e o Seu Sereno
    const crew = folk.visit?.service?.kind;
    if (crew && CREW_UNIFORMS[crew]) return CREW_UNIFORMS[crew];
    return folk.outfit === 'work' && folk.job ? uniformOf(this.ctrl.sim.catalog, folk.job) : undefined;
  }

  /**
   * Bloco 8: caronas. Chegam pela esquerda e param na frente da saída
   * enquanto esperam; vão embora pela direita quando o folk embarca ou o
   * tempo acaba. Na volta do turno, uma carona encosta, deixa o folk e segue.
   * Tudo aqui é só tela: quem decide é a simulação (rideFor).
   */
  private updateRides(dt: number): void {
    const world = this.ctrl.world;
    const catalog = this.ctrl.sim.catalog;
    const stopX = world.exit.x + 0.5;
    const laneZ = world.grid.h + 1 + 2.55;
    const waiting = ridesWaiting(world, catalog);
    const keys = new Set<string>();
    for (const r of waiting) {
      const key = `go:${r.folkId}:${r.arrived}`;
      keys.add(key);
      if (!this.rides.has(key)) {
        // chegou agora (ou o jogo foi aberto com ela parada): entra pela esquerda
        const fresh = world.tick - r.arrived < 3;
        this.spawnRide(key, r.vehicle, stopX, fresh ? 'in' : 'wait', laneZ);
      }
    }
    // quem voltou do trabalho: carona encosta, deixa e vai
    for (const f of world.folks) {
      if (f.away) this.wasAway.set(f.id, !!f.away.school || f.age === 'child');
      else if (this.wasAway.has(f.id)) {
        const school = this.wasAway.get(f.id);
        this.wasAway.delete(f.id);
        const v = school ? SCHOOL_BUS : f.job && vehicleOf(catalog, f.job);
        if (v) this.spawnRide(`back:${f.id}:${world.tick}`, v, stopX, 'in', laneZ);
      }
    }
    const speed = 7;
    for (const [key, ride] of this.rides) {
      if (key.startsWith('go:') && !keys.has(key) && (ride.phase === 'wait' || ride.phase === 'in')) ride.phase = 'out';
      let move = 0;
      if (ride.phase === 'in') {
        const left = ride.stopX - ride.x;
        move = Math.min(left, Math.max(1.2, Math.min(speed, left * 1.6)) * dt);
        if (left - move < 0.01) {
          move = left;
          ride.phase = key.startsWith('back:') ? 'drop' : 'wait';
        }
      } else if (ride.phase === 'drop') {
        ride.hold += dt;
        if (ride.hold > 1.6) ride.phase = 'out';
      } else if (ride.phase === 'out') {
        const out = ride.x - ride.stopX;
        move = Math.min(speed * 1.4, 1.5 + out * 1.4) * dt;
      }
      ride.x += move;
      ride.dist += move;
      ride.model.group.position.x = ride.x;
      ride.model.roll(ride.dist);
      ride.model.tick(this.animTime);
      if (ride.phase === 'out' && ride.x > ride.stopX + 45) {
        this.rideRoot.remove(ride.model.group);
        ride.model.group.traverse((o) => {
          if (o instanceof THREE.Mesh) o.geometry.dispose();
        });
        this.rides.delete(key);
      }
    }
  }

  private spawnRide(key: string, def: Parameters<typeof buildVehicle>[0], stopX: number, phase: RideView['phase'], z: number): void {
    const model = buildVehicle(def);
    const stop = stopX + (vehicleLength(def.kind) > 5 ? 0.6 : 0);
    const start = phase === 'in' ? stop - 40 : stop;
    model.group.position.set(start, 0.02, z);
    model.group.traverse((o) => {
      o.castShadow = true;
      o.receiveShadow = true;
    });
    this.rideRoot.add(model.group);
    this.rides.set(key, { model, x: start, dist: 0, phase, hold: 0, stopX: stop });
  }

  /** Bloco 7: som ligado solta notinhas coloridas no ritmo da estação. */
  private updateNotes(entry: ObjectEntry): void {
    const station = !entry.obj.state?.broken ? stationDef(entry.obj.tune) : undefined;
    if (!station) {
      if (entry.notes) {
        for (const s of entry.notes.sprites) this.objectsRoot.remove(s);
        entry.notes = undefined;
      }
      return;
    }
    if (entry.notes?.station !== station.id) {
      if (entry.notes) for (const s of entry.notes.sprites) this.objectsRoot.remove(s);
      const sprites = [0, 1, 2].map(() => {
        const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: getTexture(`note:${station.id}`), transparent: true, depthTest: false }));
        this.objectsRoot.add(sp);
        return sp;
      });
      entry.notes = { station: station.id, sprites };
    }
    const speed = station.bpm / 120;
    entry.notes.sprites.forEach((sp, i) => {
      const k = (performance.now() / 1000 * 0.5 * speed + i / 3) % 1;
      sp.position.set(entry.center.x + Math.sin(k * 6 + i * 2) * 0.22, entry.center.y + entry.height + 0.15 + k * 0.9, entry.center.z);
      sp.scale.setScalar(0.3 + k * 0.1);
      sp.material.opacity = k < 0.15 ? k / 0.15 : 1 - (k - 0.15) / 0.85;
    });
  }

  private applyDaylight(night: number, rain = 0): void {
    this.sun.intensity = THREE.MathUtils.lerp(2.0, 0.32, night) * (1 - 0.55 * rain);
    this.sun.color.setHex(PAL.sun).lerp(new THREE.Color(PAL.moon), night);
    this.hemi.intensity = THREE.MathUtils.lerp(1.5, 0.42, night) * (1 - 0.2 * rain);
    this.hemi.color.setHex(0xffffff).lerp(new THREE.Color(0x7f93d8), night).lerp(new THREE.Color(0xa9b4c2), rain * 0.5);
    this.scene.background = new THREE.Color(PAL.sky).lerp(new THREE.Color(0x7d8794), rain * 0.8).lerp(new THREE.Color(PAL.nightSky), night);
  }

  /** Bloco 13: quanto está chovendo na tela (sobe e desce devagar). */
  private rainLevel = 0;
  private rain: THREE.LineSegments | null = null;

  /** Bloco 13: riscos de chuva caindo em volta do lote. */
  private updateRain(dt: number): void {
    const grid = this.ctrl.world.grid;
    const N = 900;
    if (!this.rain) {
      const pos = new Float32Array(N * 6);
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      const mat = new THREE.LineBasicMaterial({ color: 0xd8e6f2, transparent: true, opacity: 0, depthWrite: false });
      this.rain = new THREE.LineSegments(geo, mat);
      this.rain.frustumCulled = false;
      this.rain.userData.drops = Array.from({ length: N }, (_, i) => ({
        x: ((i * 7919) % 1000) / 1000,
        z: ((i * 104729) % 1000) / 1000,
        y: ((i * 31337) % 1000) / 100,
      }));
      // fora do worldRoot: ele é limpo a cada novo jogo e a chuva sumiria junto
      this.scene.add(this.rain);
    }
    const mat = this.rain.material as THREE.LineBasicMaterial;
    mat.opacity = 0.8 * this.rainLevel;
    this.rain.visible = this.rainLevel > 0.02;
    if (!this.rain.visible) return;
    const pos = this.rain.geometry.getAttribute('position') as THREE.BufferAttribute;
    const drops = this.rain.userData.drops as { x: number; y: number; z: number }[];
    const w = grid.w + 12;
    const h = grid.h + 12;
    drops.forEach((d, i) => {
      d.y -= dt * 14;
      if (d.y < 0) d.y += 10;
      const x = d.x * w - 6;
      const z = d.z * h - 6;
      pos.setXYZ(i * 2, x, d.y, z);
      pos.setXYZ(i * 2 + 1, x - 0.08, d.y + 0.9, z - 0.08);
    });
    pos.needsUpdate = true;
  }

  private anchorToWorld(entry: ObjectEntry, a: Anchor): { x: number; y: number; z: number; heading: number } {
    const cos = Math.cos(entry.turn);
    const sin = Math.sin(entry.turn);
    return {
      x: entry.center.x + a.x * cos + a.z * sin,
      y: a.y + entry.center.y,
      z: entry.center.z - a.x * sin + a.z * cos,
      heading: a.heading + entry.turn,
    };
  }

  /**
   * Bloco 13: onde o folk aparece nadando. Dá voltas numa elipse dentro da
   * piscina (cada um no seu ritmo), com a cabeça e os ombros fora d'água. No
   * trampolim, fica na prancha parte do tempo e depois cai na água logo à frente.
   */
  private swimPlace(
    folk: Folk,
    entry: ObjectEntry,
    pose: 'swim' | 'dive',
    onBoard: { x: number; y: number; z: number; heading: number },
  ): { anim: FolkAnim; place: { x: number; y: number; z: number; heading: number } } {
    const sim = this.ctrl.sim;
    const pool = poolOf(sim.world, sim.catalog, entry.obj, entry.def);
    const scale = folk.age === 'child' ? CHILD_SCALE : folk.age === 'teen' ? TEEN_SCALE : 1;
    const y = -POOL_SURFACE - 1.32 * scale;
    if (pool.length === 0) return { anim: pose === 'dive' ? 'dive' : 'swim', place: onBoard };
    if (pose === 'dive') {
      const k = (this.animTime * 0.3 + folk.id * 0.37) % 1;
      if (k < 0.55) return { anim: 'dive', place: onBoard };
    }
    let x0 = Infinity;
    let x1 = -Infinity;
    let z0 = Infinity;
    let z1 = -Infinity;
    for (const t of pool) {
      x0 = Math.min(x0, t.x);
      x1 = Math.max(x1, t.x + 1);
      z0 = Math.min(z0, t.y);
      z1 = Math.max(z1, t.y + 1);
    }
    const cx = (x0 + x1) / 2;
    const cz = (z0 + z1) / 2;
    const rx = Math.max(0.15, (x1 - x0) / 2 - 0.45);
    const rz = Math.max(0.15, (z1 - z0) / 2 - 0.45);
    const dir = folk.id % 2 === 0 ? 1 : -1;
    const a = dir * this.animTime * (0.5 / Math.max(rx, rz, 0.5)) + folk.id * 1.7;
    const x = cx + Math.cos(a) * rx;
    const z = cz + Math.sin(a) * rz;
    // anda na tangente da elipse
    const heading = Math.atan2(-Math.sin(a) * rx * dir, Math.cos(a) * rz * dir);
    return { anim: 'swim', place: { x, y, z, heading } };
  }

  /** Bloco 12: ponto da cena onde fica o pé de quem está no tile (x, y), com a altura do degrau. */
  private footAt(x: number, y: number): { x: number; y: number; z: number } {
    const grid = this.ctrl.world.grid;
    const at = sceneZ(grid, y);
    const step = this.stairSteps.get(y * grid.w + x);
    const lift = step === undefined ? 0 : ((step + 0.5) / STAIR_RUN) * LEVEL_H;
    return { x: x + 0.5, y: at.base + lift, z: at.z + 0.5 };
  }

  private updateFolk(folk: Folk, alpha: number, dt: number): void {
    const view = this.folks.get(folk.id);
    if (!view) return;
    const selected = folk.id === this.ctrl.selectedFolkId;
    // bloco 12: a vista acompanha quem está selecionado quando ele troca de andar
    const level = this.ctrl.levelOf(folk);
    if (selected && !folk.away) {
      const key = `${folk.id}:${level}`;
      if (key !== this.followKey) {
        if (this.ctrl.mode === 'live' || !this.followKey.startsWith(`${folk.id}:`)) this.ctrl.viewLevel = level;
        this.followKey = key;
      }
    }
    // no trabalho, o folk não está em casa; no andar de cima do que se vê, some
    const hidden = !!folk.away || level > this.ctrl.viewLevel;
    view.model.group.visible = !hidden;
    if (hidden) {
      view.zzz.forEach((z) => (z.visible = false));
      view.icon.visible = false;
      if (selected) {
        this.ring.visible = false;
        this.hud.setBubble(-1000, 0, null);
      }
      return;
    }
    const sim = this.ctrl.sim;
    const action = folk.queue[0];
    const it: InteractionDef | undefined = action?.phase === 'using' ? sim.interactionOf(action) : undefined;
    // bloco 4: comendo sentado à mesa, o folk fica no lugar, não na geladeira
    const seatId = action?.eatAt !== undefined && action.eatAt >= 0 ? action.eatAt : undefined;
    const entry = it && action?.objectId !== undefined ? this.objects.get(seatId ?? action.objectId) : undefined;
    // bloco 5: trocou de roupa (pijama, roupão, guarda-roupa): monta o modelo de novo
    const wear = wearOf(folk, it);
    const uniform = wear === 'work' ? this.uniformFor(folk) : undefined;
    const key = lookKey(folk.look, wear, uniform, folk.age);
    if (key !== view.lookKey) {
      const old = view.model;
      const fresh = new FolkModel(folk.look, wear, uniform, folk.age);
      fresh.group.userData.folkId = folk.id;
      fresh.group.position.copy(old.group.position);
      fresh.group.rotation.copy(old.group.rotation);
      this.worldRoot.remove(old.group);
      old.group.traverse((o) => {
        if (o instanceof THREE.Mesh) o.geometry.dispose();
      });
      this.worldRoot.add(fresh.group);
      view.model = fresh;
      view.lookKey = key;
    }

    // bloco 12: o passo é interpolado já na cena (subindo a escada, o folk vai ganhando altura)
    const from = this.footAt(folk.px, folk.py);
    const to = this.footAt(folk.x, folk.y);
    const fx = from.x + (to.x - from.x) * alpha;
    const fy = from.y + (to.y - from.y) * alpha;
    const fz = from.z + (to.z - from.z) * alpha;
    let place = { x: fx, y: fy, z: fz, heading: Math.atan2(folk.facing.x, folk.facing.y) };
    let anim: FolkAnim = 'idle';
    let expr: Expression | undefined;
    let onObject = false;
    const social = it ? undefined : this.socialLook(folk);

    if (folk.age === 'baby') {
      // bloco 11: o bebê fica deitado no berço, ou no colo de quem pegou
      const baby = this.babyPlace(folk);
      if (baby) {
        place = baby.place;
        onObject = true;
      }
      anim = 'sleep';
      expr = folk.thought?.kind === 'want' ? 'sad' : folk.kid?.asleep ? undefined : 'happy';
    } else if (folk.collapsed > 0 || folk.down) {
      anim = 'collapsed';
      place = { x: fx, y: fy + 0.12, z: fz + 0.8, heading: 0 };
    } else if (folk.adrift) {
      // bloco 14: preso na piscina sem escadinha, nadando em volta sem conseguir sair
      const swim = this.adriftPlace(folk);
      if (swim) {
        anim = 'swim';
        place = swim;
        onObject = true;
        expr = 'sad';
      }
    } else if (action?.kind === 'douse' && action.phase === 'using') {
      anim = 'spray';
      expr = 'angry';
    } else if (action?.kind === 'panic' && action.phase === 'using') {
      anim = 'panic';
      expr = 'sad';
    } else if (folk.visit?.service?.kind === 'reaper' && folk.px === folk.x && folk.py === folk.y) {
      anim = 'lantern';
    } else if (folk.visit?.service?.kind === 'burglar' && folk.visit.service.target && folk.visit.service.started >= 0 && folk.queue.length === 0) {
      anim = 'reach';
    } else if (it && entry) {
      anim =
        (seatId !== undefined ? 'sit' : undefined) ??
        ANIMS[`${entry.def.art}:${it.id}`] ??
        (it.care ? CARE_ANIMS[it.care] : undefined) ??
        (it.pose === 'sit' ? 'sit' : it.pose === 'lie' ? 'sleep' : it.pose === 'dance' ? 'dance' : 'reach');
      if (it.onObject || seatId !== undefined) {
        let anchor: Anchor | undefined;
        if (anim === 'sleep') anchor = (action?.slot !== undefined ? entry.spec.lies?.[action.slot] : undefined) ?? entry.spec.lie;
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
      // bloco 13: nadando (volta pela piscina) e pulando do trampolim
      if (it.pose === 'swim' || it.pose === 'dive') {
        const swim = this.swimPlace(folk, entry, it.pose, place);
        anim = swim.anim;
        place = swim.place;
        onObject = true;
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

    // bloco 6: o balão de agora pode pedir um gesto (recusa, comemoração) e mexe na cara
    const thought = folk.collapsed > 0 || anim === 'sleep' ? null : thoughtOf(folk, sim.world.tick);
    if (thought && thought.at !== view.gestureOf) {
      view.gestureOf = thought.at;
      view.gestureT = 0;
    }
    view.gestureT += dt;
    if (thought && view.gestureT < 1.8 && (anim === 'idle' || anim === 'walk' || anim === 'reach')) {
      if (thought.kind === 'refuse') {
        anim = 'refuse';
        expr = 'angry';
      } else if (thought.kind === 'wish' && anim !== 'walk') {
        anim = 'cheer';
        expr = 'happy';
      }
    }
    if (!expr && thought) {
      if (thought.kind === 'miss') expr = 'sad';
      else if (thought.kind === 'mess' || thought.kind === 'refuse') expr = 'angry';
      else if (thought.kind === 'wish' || (thought.kind === 'chat' && thought.icon === 'yes')) expr = 'happy';
    }

    const mood = moodOf(sim.catalog, folk.needs);
    // bloco 7: dança no ritmo da estação que está tocando
    const station = anim === 'dance' && entry ? stationDef(entry.obj.tune) : undefined;
    const time = station ? this.animTime * (station.bpm / 110) : this.animTime;
    // bloco 10: quem se muda sai com a mala; noivos e casados usam aliança
    const hold = folk.visit?.moving
      ? 'suitcase'
      : action?.kind === 'douse' && action.phase === 'using'
        ? 'extinguisher'
        : folk.visit?.service?.kind === 'reaper'
          ? 'lantern'
          : it?.hold;
    view.model.update({ anim, ...place, mood, time, dt, expr, hold, energy: folk.needs.energy, ring: wearsRing(sim.world, folk.id) });

    const iconKey = social?.icon ?? (thought ? `th:${thought.kind}:${thought.icon}` : undefined);
    view.icon.visible = !!iconKey;
    if (iconKey) {
      if (iconKey !== view.iconKey) {
        view.iconKey = iconKey;
        view.icon.material.map = getTexture(iconKey);
        view.icon.material.needsUpdate = true;
      }
      const top = view.model.headTop(this.tmp);
      const balloon = iconKey.startsWith('th:');
      view.icon.scale.set(balloon ? 0.5 : 0.42, balloon ? 0.58 : 0.42, 1);
      view.icon.position.set(top.x, top.y + (balloon ? 0.42 : 0.32) + Math.sin(this.animTime * 3) * 0.04, top.z);
    }

    if (selected) {
      this.ring.visible = !onObject && folk.collapsed === 0;
      this.ring.position.set(view.model.group.position.x, fy + 0.04, view.model.group.position.z);
      this.ring.rotation.z += dt * 1.4;
      const pulse = 1 + Math.sin(performance.now() / 300) * 0.05;
      this.ring.scale.set(pulse, pulse, 1);
    }

    const head = view.model.headTop(this.tmp);
    // bloco 10: deitado abraçadinho não está dormindo (sem os Zs)
    // bloco 11: bebê deitado só ronca quando dorme de verdade
    const asleep = folk.age === 'baby' ? !!folk.kid?.asleep : (anim === 'sleep' && !it?.couple) || anim === 'collapsed';
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
      // bloco 6: com balão de pensamento em cima da cabeça, a plaquinha da ação sai
      this.hud.setBubble(sx, sy - 6, iconKey ? null : bubbleIcon(folk, it?.effects));
    }
  }

  /** Animação e expressão que uma conversa pede (quem puxa e quem ouve). */
  private socialLook(folk: Folk): SocialLook | undefined {
    const sim = this.ctrl.sim;
    const a: Action | undefined = folk.queue[0];
    // bloco 9: na roda, quem está com a palavra fala; os outros ouvem e reagem
    if (a?.kind === 'circle' && a.phase === 'using') {
      const c = sim.world.circles.find((x) => x.id === a.circleId);
      const speaker = c && sim.findFolk(c.speaker);
      if (!c || !speaker) return { anim: 'idle', other: folk };
      if (speaker === folk) return { anim: 'talk', other: folk };
      const r = reactionTo(sim.catalog, folk, c.topic);
      return {
        anim: r === 'love' ? 'laugh' : 'listen',
        expr: r === 'hate' ? 'tired' : r === 'love' || r === 'like' ? 'happy' : undefined,
        other: speaker,
      };
    }
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
    if (tile) {
      const at = sceneZ(this.ctrl.world.grid, tile.y);
      this.hoverTile.position.set(tile.x + 0.5, at.base + 0.035, at.z + 0.5);
    }
    this.hoverPad.visible = !!entry;
    if (entry) {
      this.hoverPad.position.set(entry.center.x, entry.center.y + 0.03, entry.center.z);
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
  /** Quadro em parede cortada sumiria no ar: esconde junto com a parede. */
  private shown(e: ObjectEntry): boolean {
    // bloco 12: o que está num andar acima do que se vê some junto com ele
    if (e.level > this.ctrl.viewLevel) return false;
    // luminária de teto de baixo atravessaria o piso de cima
    if (e.def.layer === 'ceiling' && e.level < this.ctrl.viewLevel) return false;
    if (e.def.layer !== 'wall' || !this.house) return true;
    return this.house.isTallEdge(wallBehind(e.obj));
  }

  private updateGhost(): void {
    const placing = this.ctrl.mode === 'buy' ? this.ctrl.placing : null;
    const def = placing && this.ctrl.sim.catalog.objects[placing.defId];
    const tile = this.ghostTile;
    if (!placing || !def || !tile) {
      this.clearGhost();
      this.ghostPad.visible = false;
      for (const e of this.objects.values()) {
        e.model.group.visible = this.shown(e);
        e.fx.group.visible = e.level <= this.ctrl.viewLevel && !(e.def.layer === 'ceiling' && e.level < this.ctrl.viewLevel);
      }
      return;
    }
    const moving = placing.moveId !== undefined ? this.ctrl.sim.findObject(placing.moveId) : undefined;
    const paint = moving ? colorOf(moving, def) : (placing.color ?? def.colors?.[0]);
    const key = `${placing.defId}|${placing.moveId ?? ''}|${paint ?? ''}`;
    if (this.ghost?.key !== key) {
      this.clearGhost();
      const group = buildFurniture(def.art, placing.moveId ?? 1, paint ? PAINT[paint] : undefined).group;
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
    for (const e of this.objects.values()) e.model.group.visible = e.obj.id !== placing.moveId && this.shown(e);

    // quadro e relógio viram sozinhos para a parede mais perto do tile
    if (def.layer === 'wall') {
      const edges = this.ctrl.world.grid.edges;
      if (edges[wallBehind({ x: tile.x, y: tile.y, rot: placing.rot })] !== 'wall') {
        const r = ([0, 1, 2, 3] as const).find((rot) => edges[wallBehind({ x: tile.x, y: tile.y, rot })] === 'wall');
        if (r !== undefined) placing.rot = r;
      }
    }
    const spec = furnitureSpec(def.art);
    const size = objectSize(def, placing.rot);
    const g = this.ghost.group;
    const at = sceneZ(this.ctrl.world.grid, tile.y);
    g.position.set(tile.x + size.w / 2, at.base + 0.02, at.z + size.h / 2);
    g.rotation.y = (spec.facing === 'E' ? Math.PI / 2 : 0) + placing.rot * (Math.PI / 2);
    const ok = checkPlacement(this.ctrl.world, this.ctrl.sim.catalog, placing.defId, tile.x, tile.y, placing.rot, placing.moveId).ok;
    const affordable = placing.moveId !== undefined || this.ctrl.world.household.funds >= def.price;
    this.ghostPad.visible = true;
    this.ghostPad.position.set(tile.x + size.w / 2, at.base + 0.04, at.z + size.h / 2);
    this.ghostPad.scale.set(size.w, size.h, 1);
    (this.ghostPad.material as THREE.MeshBasicMaterial).color.setHex(ok && affordable ? 0x6fd06a : 0xe0533f);
  }

  // ---------- modo construção ----------

  /** Ponto do chão do andar visto sob o mouse. */
  private groundPoint(clientX: number, clientY: number): THREE.Vector3 | null {
    const rect = this.renderer.domElement.getBoundingClientRect();
    const ndc = new THREE.Vector2(((clientX - rect.left) / rect.width) * 2 - 1, -((clientY - rect.top) / rect.height) * 2 + 1);
    this.raycaster.setFromCamera(ndc, this.camera);
    return this.levelPoint();
  }

  /** Vértice do grid mais perto do mouse (cantos dos tiles), já na linha do andar visto. */
  private vertexAt(clientX: number, clientY: number): { x: number; y: number } | null {
    const p = this.groundPoint(clientX, clientY);
    if (!p) return null;
    const grid = this.ctrl.world.grid;
    const z = THREE.MathUtils.clamp(Math.round(p.z), 0, grid.h);
    return { x: THREE.MathUtils.clamp(Math.round(p.x), 0, grid.w), y: rowOn(grid, this.ctrl.viewLevel, z) };
  }

  private tileAt(clientX: number, clientY: number): { x: number; y: number } | null {
    const p = this.groundPoint(clientX, clientY);
    return p ? this.levelTile(p) : null;
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
    const walls = this.house.pickables(this.ctrl.viewLevel);
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
        const grid = this.ctrl.world.grid;
        const local = Number(ys) - Math.max(0, edgeLevel(grid, edge)) * strideOf(grid);
        const front = side === 'N' ? hit.point.z > local : hit.point.x > Number(xs);
        return facesOfEdge(edge)[front ? 0 : 1];
      }
    }
    const tile = this.tileAt(clientX, clientY);
    const p = this.groundPoint(clientX, clientY);
    if (!tile || !p) return null;
    const fx = p.x - tile.x;
    const fy = p.z - Math.floor(p.z);
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
    if (isLineTool(tool)) {
      const v = this.vertexAt(clientX, clientY);
      if (v) this.buildDrag = { start: v, cur: v };
    } else if (tool === 'floor' || tool === 'yard') {
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
    if (isLineTool(tool)) {
      const v = this.vertexAt(clientX, clientY);
      if (drag && v) {
        // a linha segue o eixo em que o mouse andou mais
        const dx = Math.abs(v.x - drag.start.x);
        const dy = Math.abs(v.y - drag.start.y);
        drag.cur = dx >= dy ? { x: v.x, y: drag.start.y } : { x: drag.start.x, y: v.y };
        const c = { x0: drag.start.x, y0: drag.start.y, x1: drag.cur.x, y1: drag.cur.y };
        cmd =
          tool === 'wall'
            ? { type: 'buildWalls', ...c }
            : tool === 'half'
              ? { type: 'buildHalfWalls', ...c }
              : tool === 'fence' || tool === 'lowwall'
                ? { type: 'buildFences', ...c, kind: tool }
                : { type: 'eraseWalls', ...c };
      } else if (v) {
        this.showVertex(v);
        this.hud.setTooltip(clientX, clientY, t(tool === 'erase' ? 'build.hint.eraseStart' : 'build.hint.wallStart'));
        this.buildCmd = null;
        return;
      }
    } else if (tool === 'column') {
      const v = this.vertexAt(clientX, clientY);
      if (v) cmd = { type: 'toggleColumn', x: v.x, y: v.y };
    } else if (tool === 'stairs') {
      const tile = this.tileAt(clientX, clientY);
      if (tile) {
        const on = stairStepAt(this.ctrl.world.grid, tile.x, tile.y);
        cmd = on ? { type: 'removeStairs', x: tile.x, y: tile.y } : { type: 'placeStairs', x: tile.x, y: tile.y, dir: this.ctrl.stairDir };
      }
    } else if (tool === 'floor' || tool === 'yard') {
      const tile = this.tileAt(clientX, clientY);
      if (drag && tile) drag.cur = tile;
      const a = drag?.start ?? tile;
      const b = drag?.cur ?? tile;
      if (a && b) cmd = { type: 'paintFloor', x0: a.x, y0: a.y, x1: b.x, y1: b.y, floorId: this.ctrl.floorId };
    } else if (isOpeningTool(tool)) {
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
      if (ok && (tool === 'floor' || tool === 'yard') && cmd.type === 'paintFloor') this.addPing(cmd.x1, cmd.y1);
      if (ok && (cmd.type === 'placeStairs' || cmd.type === 'removeStairs')) this.addPing(cmd.x, cmd.y);
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

  /** Bloco 12: a prévia usa linhas do grid inteiro; o grupo dela sobe para o andar visto. */
  private placePreview(): void {
    const n = this.ctrl.viewLevel;
    this.buildPreview.position.set(0, n * LEVEL_H, -n * strideOf(this.ctrl.world.grid));
  }

  private showVertex(v: { x: number; y: number }): void {
    const key = `v|${v.x},${v.y}|${this.ctrl.buildTool}`;
    if (key === this.previewKey) return;
    this.clearBuildPreview();
    this.placePreview();
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
    this.placePreview();
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

    if (cmd.type === 'buildWalls' || cmd.type === 'buildHalfWalls' || cmd.type === 'buildFences' || cmd.type === 'eraseWalls') {
      const edges = lineEdges(grid, cmd.x0, cmd.y0, cmd.x1, cmd.y1) ?? [];
      const full = cmd.type === 'buildWalls' ? WALL_H * 0.75 : cmd.type === 'buildFences' ? (cmd.kind === 'fence' ? 1.0 : 0.7) : HALF_H;
      for (const e of edges) {
        const exists = !!grid.edges[e];
        if (cmd.type !== 'eraseWalls') edgeBox(e, exists ? 0.5 : full, 1, ok ? 0x6fd06a : bad, exists ? 0.3 : 0.55);
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
      const h = { door: 2.1, doorGlass: 2.1, doorDouble: 2.1, arch: 2.2, window: 1.3, windowTall: 2.0, windowHigh: 0.45, gate: 1.0 }[cmd.kind];
      const wide = cmd.kind === 'doorDouble' || cmd.kind === 'arch' ? 0.9 : cmd.kind.startsWith('door') ? 0.8 : 0.86;
      edgeBox(cmd.edge, exists && this.house.isTallEdge(cmd.edge) ? h : Math.max(h * 0.5, LOW_H + 0.4), wide, ok ? 0x6fd06a : bad, 0.6);
    } else if (cmd.type === 'toggleColumn') {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, WALL_H * 0.8, 10), previewMat(ok ? 0x6fd06a : bad, 0.6));
      post.position.set(cmd.x, WALL_H * 0.4, cmd.y);
      this.buildPreview.add(post);
    } else if (cmd.type === 'placeStairs' || cmd.type === 'removeStairs') {
      // degraus fantasmas subindo na direção escolhida, e o patamar em cima
      const st = cmd.type === 'placeStairs' ? cmd : stairStepAt(grid, cmd.x, cmd.y)?.stair;
      if (st) {
        const plan = stairPlan(grid, st);
        const color = cmd.type === 'removeStairs' ? bad : ok ? 0x6fd06a : bad;
        plan.run.forEach((tl, i) => {
          const h = ((i + 1) / STAIR_RUN) * LEVEL_H;
          const m = new THREE.Mesh(new THREE.BoxGeometry(0.92, h, 0.92), previewMat(color, 0.55));
          m.position.set(tl.x + 0.5, h / 2, tl.y + 0.5);
          m.renderOrder = 3;
          this.buildPreview.add(m);
        });
        const pad = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.9), previewMat(PAL.mustard, 0.7));
        pad.rotation.x = -Math.PI / 2;
        pad.position.set(plan.landing.x + 0.5, LEVEL_H + 0.05, plan.landing.y - strideOf(grid) + 0.5);
        const foot = new THREE.Mesh(new THREE.RingGeometry(0.2, 0.3, 16), previewMat(PAL.mustard, 0.9));
        foot.rotation.x = -Math.PI / 2;
        foot.position.set(plan.entry.x + 0.5, 0.04, plan.entry.y + 0.5);
        this.buildPreview.add(pad, foot);
      }
    } else if (cmd.type === 'paintFloor') {
      const upper = this.ctrl.viewLevel > 0;
      const kind = FLOOR_ART.includes(cmd.floorId) ? cmd.floorId : cmd.floorId === 'grass' ? 'grass' : 'wood';
      const mat = ok && !(upper && cmd.floorId === 'grass') ? previewTexMat(kind, 0.85) : previewMat(ok ? 0xffffff : bad, 0.5);
      const top = rowOn(grid, Math.max(0, levelOfRow(grid, cmd.y0)), 0);
      const xa = Math.max(0, Math.min(cmd.x0, cmd.x1));
      const xb = Math.min(grid.w - 1, Math.max(cmd.x0, cmd.x1));
      const ya = Math.max(top, Math.min(cmd.y0, cmd.y1));
      const yb = Math.min(top + grid.h - 1, Math.max(cmd.y0, cmd.y1));
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
  /**
   * Bloco 5: retrato de corpo inteiro (tela de criar família), em pé e de
   * frente, com a roupa pedida. Devolve uma imagem em data URL.
   */
  portrait(look: Look, wear: Wear, w = 120, h = 200): string {
    const scene = new THREE.Scene();
    scene.add(new THREE.HemisphereLight(0xffffff, 0xc4b295, 1.7));
    const sun = new THREE.DirectionalLight(PAL.sun, 2.0);
    sun.position.set(-2, 5, 6);
    scene.add(sun);
    const model = new FolkModel(look, wear);
    model.update({ anim: 'idle', x: 0, y: 0, z: 0, heading: 0.35, mood: 75, time: 0, dt: 1 });
    model.update({ anim: 'idle', x: 0, y: 0, z: 0, heading: 0.35, mood: 75, time: 0, dt: 1 });
    scene.add(model.group);
    const half = 1.05;
    const cam = new THREE.OrthographicCamera(-half * (w / h), half * (w / h), half, -half, 0.1, 50);
    cam.position.set(0, 1.25, 10);
    cam.lookAt(0, 0.95, 0);
    cam.updateMatrixWorld();
    const url = this.renderToUrl(scene, cam, w, h);
    model.group.traverse((o) => {
      if (o instanceof THREE.Mesh) o.geometry.dispose();
    });
    return url;
  }

  /** Desenha a cena fora da tela e devolve a imagem em 16 bits, como o jogo. */
  private renderToUrl(scene: THREE.Scene, cam: THREE.Camera, w: number, h: number): string {
    return this.renderToCanvas(scene, cam, w, h).toDataURL();
  }

  private renderToCanvas(scene: THREE.Scene, cam: THREE.Camera, w: number, h: number): HTMLCanvasElement {
    const target = new THREE.WebGLRenderTarget(w, h, { type: THREE.UnsignedByteType, colorSpace: THREE.SRGBColorSpace });
    const prevColor = this.renderer.getClearColor(new THREE.Color());
    const prevAlpha = this.renderer.getClearAlpha();
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.setRenderTarget(target);
    this.renderer.clear();
    this.renderer.render(scene, cam);
    const pixels = new Uint8Array(w * h * 4);
    this.renderer.readRenderTargetPixels(target, 0, 0, w, h, pixels);
    this.renderer.setRenderTarget(null);
    this.renderer.setClearColor(prevColor, prevAlpha);
    target.dispose();
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d')!;
    const img = ctx.createImageData(w, h);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const src = ((h - 1 - y) * w + x) * 4;
        const dst = (y * w + x) * 4;
        img.data[dst] = pixels[src] & 0xf8;
        img.data[dst + 1] = pixels[src + 1] & 0xfc;
        img.data[dst + 2] = pixels[src + 2] & 0xf8;
        img.data[dst + 3] = pixels[src + 3] > 8 ? 255 : 0;
      }
    }
    ctx.putImageData(img, 0, 0);
    return canvas;
  }

  /** Bloco 17: foto para o álbum (a vista de agora, em JPEG pequeno para caber no save). */
  photo(w = 288): string {
    const el = this.renderer.domElement;
    const aspect = el.clientWidth > 0 && el.clientHeight > 0 ? el.clientWidth / el.clientHeight : 16 / 9;
    const h = Math.max(48, Math.round(w / Math.max(1, aspect)));
    const shot = this.renderToCanvas(this.scene, this.camera, w, h);
    const out = document.createElement('canvas');
    out.width = w;
    out.height = h;
    const ctx = out.getContext('2d')!;
    ctx.fillStyle = '#1d2430';
    ctx.fillRect(0, 0, w, h);
    ctx.drawImage(shot, 0, 0);
    return out.toDataURL('image/jpeg', 0.72);
  }

  /**
   * Bloco 7: quanto se ouve de um tile e de que lado. Fora da tela vai
   * sumindo; com a câmera longe, tudo fica mais baixo.
   */
  hearing(x: number, y: number): { gain: number; pan: number } {
    const at = sceneZ(this.ctrl.world.grid, y);
    const v = this.tmp.set(x + 0.5, at.base + 0.6, at.z + 0.5).project(this.camera);
    const edge = Math.max(Math.abs(v.x), Math.abs(v.y));
    const off = edge <= 1 ? 1 : Math.max(0, 1 - (edge - 1) * 1.6);
    const zoom = Math.min(1, Math.max(0.45, 11 / this.viewHeight));
    return { gain: off * zoom, pan: Math.max(-1, Math.min(1, v.x)) * 0.7 };
  }

  /** Bloco 7: miniatura da vista de agora para a vaga do save (16 bits, como o jogo). */
  snapshot(w = 192): string {
    const el = this.renderer.domElement;
    const aspect = el.clientWidth > 0 && el.clientHeight > 0 ? el.clientWidth / el.clientHeight : 16 / 9;
    const h = Math.max(48, Math.round(w / aspect));
    const prev = this.scene.background;
    const url = this.renderToUrl(this.scene, this.camera, w, h);
    this.scene.background = prev;
    return url;
  }

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

