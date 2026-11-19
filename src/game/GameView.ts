import * as THREE from 'three';
import { t } from '../i18n';
import {
  NEED_IDS,
  TICKS_PER_SECOND,
  idleGesture,
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
  isSpoiled,
  isWarm,
  STAIR_RUN,
  edgeLevel,
  levelOfRow,
  rowOn,
  stairPlan,
  stairStepAt,
  strideOf,
  cityOn,
} from '../sim';
import type {
  Action,
  BuildCommand,
  Folk,
  InteractionDef,
  HeldProp,
  MealAct,
  Mess,
  MessKind,
  NeedId,
  ObjectDef,
  RelDelta,
  Side,
  SocialCategory,
  SocialDef,
  Speed,
  WorldObject,
} from '../sim';
import type { Expression } from './art/textures';
import type { Hud } from '../ui/hud';
import { FolkModel } from './art/folk';
import type { FolkAnim } from './art/folk';
import { isAnim } from './art/anims';
import { buildFurniture, furnitureSpec, objectArt } from './art/furniture';
import { LIFT_STEP, clampNudge, hasSurface, supportAt, zonesOf } from '../sim/modular';
import { styleFromColor } from '../sim/style';
import type { Anchor, FurnitureModel, FurnitureSpec } from './art/furniture';
import { COVER_ART, FLOOR_ART, HALF_H, House, LEVEL_H, LOW_H, POOL_SURFACE, TH, WALL_H, sceneZ } from './art/house';
import { CHILD_SCALE, TEEN_SCALE } from './art/folk';
import { poolOf, poolTiles } from '../sim/yard';
import { raining } from '../sim/garden';
import { isLineTool, isOpeningTool } from './controller';
import { texMat } from './art/build';
import { PAL } from './art/palette';
import { wearOf } from '../sim/family';
import { ensembleKey, ensembleOf } from '../sim/clothes';
import type { Ensemble } from '../sim/clothes';
import { thoughtOf } from '../sim/will';
import { reactionTo } from '../sim/topics';
import { stationDef } from '../sim/music';
import { isWatch, spotCell, spotFace, spotsOf, stagesOf } from '../sim/activity';
import { speechMouth, toneOf as speechTone, voiceOf } from '../audio/folkes';
import type { Tone } from '../audio/folkes';
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
import { buildBoard, buildCover, buildDishStack, buildMeal, buildPot, buildRumple } from './art/chores';
import type { Animated } from './art/chores';
import type { GameController } from './controller';
import { CITY_ZOOM, CityLayer, MAP_ZOOM } from './city';
import type { MapMark } from './city';
import { shownWallMode } from './viewMode';

/** 30° dá a projeção 2:1 das vistas isométricas clássicas */
const ELEVATION = THREE.MathUtils.degToRad(30);
const CAMERA_DISTANCE = 400;
/**
 * Altura-alvo da imagem interna, em linhas. A cena é renderizada perto disso e
 * ampliada por um fator inteiro, com pixels nítidos, como num monitor da época.
 */
const TARGET_LINES = 600;
const MAX_STEPS_PER_FRAME = 60;

/** Plano 2, bloco 1: moldura retangular fina (contorno do objeto sob o mouse), deitada no chão. */
function outlineGeometry(w: number, h: number, line: number): THREE.BufferGeometry {
  const shape = new THREE.Shape();
  shape.moveTo(-w / 2, -h / 2);
  shape.lineTo(w / 2, -h / 2);
  shape.lineTo(w / 2, h / 2);
  shape.lineTo(-w / 2, h / 2);
  shape.lineTo(-w / 2, -h / 2);
  const hole = new THREE.Path();
  const iw = w / 2 - line;
  const ih = h / 2 - line;
  hole.moveTo(-iw, -ih);
  hole.lineTo(-iw, ih);
  hole.lineTo(iw, ih);
  hole.lineTo(iw, -ih);
  hole.lineTo(-iw, -ih);
  shape.holes.push(hole);
  return new THREE.ShapeGeometry(shape);
}
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

/** Plano 2, bloco 7: gestos de toque, e quanto cada um chega mais perto do outro. */
const CLOSE_ANIMS: Partial<Record<string, number>> = {
  hug: 0.3,
  kiss: 0.3,
  cuddle: 0.3,
  slowDance: 0.33,
  backRub: 0.25,
  handshake: 0.18,
  highFive: 0.18,
  joke: 0.14,
  handOver: 0.15,
};

/** Plano 2, bloco 7: gestos de conversa em que a boca fala. */
const TALKING_ANIMS = new Set<string>(['talk', 'argue', 'joke', 'fingerWag', 'apologize', 'flirt', 'tease', 'handOver', 'kneel', 'backRub']);

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

/** Plano 2, bloco 6: como se recolhe cada bagunça (rodo, vassoura, prato na mão). */
const TIDY_LOOK: Partial<Record<MessKind, { anim: FolkAnim; hold?: HeldProp }>> = {
  puddle: { anim: 'mop', hold: 'mop' },
  trash: { anim: 'sweep', hold: 'broom' },
  ash: { anim: 'sweep', hold: 'broom' },
  plate: { anim: 'reach_low', hold: 'dirtyPlate' },
  paper: { anim: 'reach_low' },
  book: { anim: 'reach_low', hold: 'book' },
  meal: { anim: 'serve', hold: 'pot' },
};

/** Plano 2, bloco 6: o corpo em cada coisa que se faz com a travessa. */
const MEAL_LOOK: Record<MealAct, { anim: FolkAnim; hold?: HeldProp }> = {
  serve: { anim: 'scoop', hold: 'plate' },
  call: { anim: 'callOut' },
  reheat: { anim: 'stir', hold: 'spoon' },
  scrap: { anim: 'serve', hold: 'pot' },
};

/** Plano 2, bloco 6: deitado no sofá, de ponta a ponta, a cabeça no braço da esquerda. */
function couchLie(spec: FurnitureSpec): Anchor | undefined {
  const sit = spec.sit;
  if (!sit || sit.length < 2) return undefined;
  const right = Math.max(...sit.map((a) => a.x));
  return { x: right + 0.42, y: sit[0].y + 0.05, z: sit[0].z, heading: Math.PI / 2 };
}

/** Plano 2, bloco 6: altura do tampo onde vão a panela, a tábua, a travessa e a louça. */
const CHORE_TOP: Record<string, number> = {
  stove: 0.9,
  stovecheap: 0.9,
  stoveluxe: 0.92,
  counter: 0.92,
  kitchensink: 0.92,
  sink: 0.86,
  dinette: 0.77,
  tablefold: 0.76,
  table: 0.76,
  tablemarble: 0.78,
};

/** Plano 2, bloco 8: altura do tampo de um objeto posto (kit sabe a sua; os antigos, pela tabela). */
function surfaceTop(e: { def: ObjectDef; spec: FurnitureSpec }): number {
  return SURFACE_TOP[e.def.art] ?? (hasSurface(e.def) ? e.spec.top : undefined) ?? 0.76;
}

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

/** Plano 2, bloco 5: cara de cada gesto de conversa (romance dá cara de apaixonado). */
function socialExpr(anim: FolkAnim, category: SocialCategory): Expression | undefined {
  if (anim === 'argue' || anim === 'fingerWag') return 'angry';
  if (anim === 'apologize') return 'sad';
  if (anim === 'tease' || anim === 'highFive' || anim === 'tag' || anim === 'joke') return 'laugh';
  if (anim === 'slowDance' || anim === 'cuddle' || anim === 'kneel' || anim === 'flirt') return 'love';
  if (anim === 'laugh') return 'laugh';
  if (category === 'romantic' && (anim === 'kiss' || anim === 'hug' || anim === 'talk')) return 'love';
  if (anim === 'talk') return undefined;
  return 'happy';
}

/** Plano 2, bloco 5: jeito de andar — com pressa, cansado, triste ou alegre. */
function walkStyle(folk: Folk, action: Action | undefined, mood: number): FolkAnim {
  const n = folk.needs;
  if (action?.kind === 'panic' || action?.kind === 'douse' || n.bladder < 15 || n.hunger < 10) return 'walk_hurry';
  if (n.energy < 25) return 'walk_tired';
  if (mood < 35) return 'walk_sad';
  if (mood >= 80) return 'walk_happy';
  return 'walk';
}

function lookKey(look: Look, wear: Wear, uniform?: UniformDef, age?: Age, dress?: Ensemble): string {
  return `${JSON.stringify(look)}|${wear}|${uniform ? JSON.stringify(uniform) : ''}|${age ?? ''}|${dress ? ensembleKey(dress) : ''}`;
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
  /** plano 2, bloco 5: está com a palavra (a boca mexe) */
  speaking?: boolean;
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
  private camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 1400);
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
  /** plano 2, bloco 6: travessas que soltam vapor (ou juntam moscas) */
  private mealFx: Animated[] = [];
  /** plano 2, bloco 6: panela no fogão, tábua na bancada, louça na pia, cama desfeita */
  private choreRoot = new THREE.Group();
  private choreFx = new Map<number, { key: string; fx: Animated }>();
  private folks = new Map<number, FolkEntry>();
  private ring = new THREE.Group();
  private hoverTile: THREE.Mesh;
  private hoverPad: THREE.Mesh;
  private hoverPadKey = '';
  private pings: Ping[] = [];
  /** objeto fantasma do modo compra, seguindo o mouse */
  private ghost: { key: string; group: THREE.Group; spec?: FurnitureSpec } | null = null;
  /** plano 2, bloco 8: onde o mouse está dentro do tile (0..1), para soltar o enfeite */
  private subTile: { x: number; y: number } | null = null;
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
  /** plano 2, bloco 12: a cidade em volta do lote (substitui a tela do bairro) */
  readonly city: CityLayer;
  /** plano 2, bloco 12: altura de vista pedida (o zoom anda até ela) */
  private zoomGoal: number | null = null;

  constructor(
    private readonly container: HTMLElement,
    private readonly ctrl: GameController,
    private readonly hud: Hud,
  ) {
    this.renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance' });
    // plano 2, bloco 13: o chão da cidade tem um buraco no lote mostrado (para a água aparecer)
    this.renderer.localClippingEnabled = true;
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
    // plano 2, bloco 1: o destaque do objeto é só um contorno no chão (nada cresce)
    this.hoverPad = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), flat(PAL.mustard, 0.5));
    this.hoverPad.rotation.x = -Math.PI / 2;
    this.ghostPad = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), flat(0x6fd06a, 0.45));
    this.ghostPad.rotation.x = -Math.PI / 2;
    this.ghostPad.visible = false;
    this.scene.add(this.ring, this.hoverTile, this.hoverPad, this.ghostPad, this.buildPreview, this.perilRoot);

    this.post.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), retroPass(this.frameBuffer.texture)));

    this.city = new CityLayer(ctrl);
    this.scene.add(this.city.root);
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
    this.worldRoot.add(this.choreRoot);
    this.choreFx.clear();
    this.choreRoot.clear();

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
    this.scenery = buildScenery(grid, free, hole, !!world.outing && world.outing.venue === 'centro', cityOn(world));
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
      const wear0 = wearOf(folk);
      const dress0 = ensembleOf(folk, wear0);
      const model = new FolkModel(folk.look, wear0, this.uniformFor(folk), folk.age, dress0);
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
        lookKey: lookKey(folk.look, wear0, this.uniformFor(folk), folk.age, dress0),
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
    const world = this.ctrl.world;
    // plano 2, bloco 8: os enfeites vão depois dos tampos (para saber a altura)
    const order = [...world.objects].sort((a, b) => Number(this.ctrl.sim.defOf(a)?.layer === 'surface') - Number(this.ctrl.sim.defOf(b)?.layer === 'surface'));
    for (const obj of order) {
      const def = this.ctrl.sim.defOf(obj);
      if (!def) continue;
      const { model, spec } = objectArt(def, obj.id, { parts: obj.parts, style: obj.style });
      const size = objectSize(def, obj.rot);
      // bloco 12: o objeto vai para a altura do andar dele
      const at = sceneZ(world.grid, obj.y);
      const center = new THREE.Vector3(obj.x + size.w / 2, at.base, at.z + size.h / 2);
      let turn = (spec.facing === 'E' ? Math.PI / 2 : 0) + obj.rot * (Math.PI / 2);
      const height = Math.max(0.3, new THREE.Box3().setFromObject(model.group).max.y);
      model.group.position.copy(center);
      // plano 2, bloco 8: enfeite em cima do tampo, solto no tile e girado em oitavos
      if (def.layer === 'surface') {
        const sup = supportAt(world, this.ctrl.sim.catalog, obj.x, obj.y);
        const se = sup ? this.objects.get(sup.id) : undefined;
        model.group.position.y += se ? surfaceTop(se) : 0.75;
        model.group.position.x += obj.nudge?.dx ?? 0;
        model.group.position.z += obj.nudge?.dy ?? 0;
      }
      if (def.turns8) turn = (spec.facing === 'E' ? Math.PI / 2 : 0) + (obj.turn8 ?? obj.rot * 2) * (Math.PI / 4);
      // plano 2, bloco 8: objeto de parede em qualquer altura
      if (def.layer === 'wall' && obj.lift) model.group.position.y += obj.lift * LIFT_STEP;
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
    this.consumeFocus(dt);
    this.followCity(dt);
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

    // plano 2, bloco 3: o modo escolhido vira o modo mostrado (o telhado some
    // sozinho na obra e de perto, a não ser que o jogador fixe o modo)
    const tool = this.ctrl.buildTool;
    const shown = shownWallMode(this.ctrl.wallMode, this.ctrl.wallPinned, {
      building: this.ctrl.mode === 'build',
      roofTool: this.ctrl.mode === 'build' && (tool === 'roof' || tool === 'slab' || tool === 'unslab'),
      viewHeight: this.viewHeight,
    });
    this.ctrl.shownWall = shown;
    const state = `${shown}|${Math.sin(this.azimuth) > 0}|${Math.cos(this.azimuth) > 0}|${this.ctrl.viewLevel}`;
    if (state !== this.wallState) {
      this.wallState = state;
      this.house.update(shown, Math.sin(this.azimuth), Math.cos(this.azimuth), this.ctrl.viewLevel);
      this.previewKey = '';
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
      // plano 2, bloco 12: no mapa da cidade o mouse aponta lotes e o arrasto anda pelo mapa
      if (this.ctrl.screen === 'town') {
        if (p.down && Math.hypot(e.clientX - p.startX, e.clientY - p.startY) > CLICK_SLOP) p.dragged = true;
        if (p.down && p.dragged) this.pan(e.clientX - p.x, e.clientY - p.y);
        else {
          // plano 2, bloco 13: lugares da cidade também se escolhem no mapa
          this.city.hoverPlace = this.mapPlaceAt(e.clientX, e.clientY);
          this.city.hover = this.city.hoverPlace ? 0 : this.mapLotAt(e.clientX, e.clientY);
        }
        el.style.cursor = this.city.hover || this.city.hoverPlace ? 'pointer' : 'default';
        this.hud.setTooltip(0, 0, null);
        p.x = e.clientX;
        p.y = e.clientY;
        return;
      }
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
            ? this.hover.mess.meal
              ? `${t(`dish.${this.hover.mess.meal.dish}`)} · ${this.hud.mealNotes(this.hover.mess)[0]?.text ?? ''}`
              : t(`mess.${this.hover.mess.kind}`)
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
        const dragged = this.pointer.dragged;
        this.pointer.down = false;
        this.pointer.building = false;
        if (!dragged) {
          const place = this.mapPlaceAt(e.clientX, e.clientY);
          const lot = place ? 0 : this.mapLotAt(e.clientX, e.clientY);
          if (place) this.ctrl.townPlace = place;
          else if (lot) {
            this.ctrl.townLot = lot;
            this.ctrl.townPlace = '';
          }
        }
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
        // plano 2, bloco 12: afastar passa da casa para a cidade inteira sem trocar de tela
        this.zoomGoal = null;
        const max = this.city.on ? CITY_ZOOM : 24;
        this.viewHeight = THREE.MathUtils.clamp(this.viewHeight * (e.deltaY > 0 ? 1.12 : 0.89), 4, max);
      },
      { passive: false },
    );
    el.addEventListener('contextmenu', (e) => e.preventDefault());

    window.addEventListener('keyup', (e) => {
      if (e.key === 'Shift') this.shiftDown = false;
      this.ctrl.shiftHeld = e.shiftKey;
    });
    // plano 2, bloco 1: o menu de interações é HTML; o Shift vale para o clique em qualquer lugar
    window.addEventListener('pointerdown', (e) => (this.ctrl.shiftHeld = e.shiftKey), true);
    window.addEventListener('blur', () => (this.ctrl.shiftHeld = false));
    window.addEventListener('keydown', (e) => {
      if (e.target instanceof HTMLInputElement) return;
      // bloco 5: com a tela de criar família aberta, o jogo não ouve o teclado
      if (document.querySelector('.creator:not([hidden])')) return;
      // plano 2, bloco 12: no mapa, o Esc volta para a casa
      if (this.ctrl.screen === 'town' && e.code === 'Escape') {
        this.ctrl.closeTown();
        return;
      }
      if (e.key === 'Shift') this.shiftDown = true;
      this.ctrl.shiftHeld = e.shiftKey;
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
        case 'Digit4':
          this.ctrl.commandOrExplain({ type: 'setSpeed', speed: Number(e.code.slice(5)) as Speed });
          break;
        case 'Digit0':
          this.togglePause();
          break;
        case 'KeyQ':
          this.ctrl.rotateCamera(-1);
          break;
        // bloco 12: sobe e desce o andar que se vê
        // plano 2, bloco 8: segurando um objeto de parede, sobe e desce ele
        case 'PageUp':
          e.preventDefault();
          if (this.liftingWall()) this.ctrl.liftPlacing(1);
          else this.ctrl.changeLevel(1);
          break;
        case 'PageDown':
          e.preventDefault();
          if (this.liftingWall()) this.ctrl.liftPlacing(-1);
          else this.ctrl.changeLevel(-1);
          break;
        // plano 2, bloco 3: modos de vista (Home sobe as paredes, End desce; P fixa)
        case 'Home':
          e.preventDefault();
          this.ctrl.stepWallMode(1);
          break;
        case 'End':
          e.preventDefault();
          this.ctrl.stepWallMode(-1);
          break;
        case 'KeyP':
          this.ctrl.wallPinned = !this.ctrl.wallPinned;
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
      this.ctrl.resumeSpeed(this.lastSpeed);
    } else {
      this.lastSpeed = speed;
      this.ctrl.command({ type: 'setSpeed', speed: 0 });
    }
  }

  /** Plano 2, bloco 2: a câmera desliza até o que a HUD pediu (retrato, aviso). */
  private focusGoal: { x: number; z: number } | null = null;

  private consumeFocus(dt: number): void {
    const req = this.ctrl.focusRequest;
    if (req) {
      this.ctrl.focusRequest = null;
      let x: number;
      let y: number;
      if ('folkId' in req) {
        const f = this.ctrl.sim.findFolk(req.folkId);
        if (!f || f.away) return;
        x = f.x;
        y = f.y;
        this.ctrl.viewLevel = this.ctrl.levelOf(f);
      } else {
        x = req.x;
        y = req.y;
        this.ctrl.viewLevel = Math.max(0, levelOfRow(this.ctrl.world.grid, y));
      }
      const p = this.footAt(x, y);
      this.focusGoal = { x: p.x, z: p.z };
    }
    const goal = this.focusGoal;
    if (!goal) return;
    const k = 1 - Math.exp(-dt * 7);
    this.target.x += (goal.x - this.target.x) * k;
    this.target.z += (goal.z - this.target.z) * k;
    if (Math.abs(goal.x - this.target.x) + Math.abs(goal.z - this.target.z) < 0.02) this.focusGoal = null;
  }

  private pan(dxPx: number, dyPx: number): void {
    this.focusGoal = null;
    const el = this.renderer.domElement;
    const unit = this.viewHeight / Math.max(1, el.clientHeight);
    const rightX = Math.cos(this.azimuth);
    const rightZ = -Math.sin(this.azimuth);
    const fwdX = -Math.sin(this.azimuth);
    const fwdZ = -Math.cos(this.azimuth);
    const along = (dyPx * unit) / Math.sin(ELEVATION);
    this.target.x += -rightX * dxPx * unit + fwdX * along;
    this.target.z += -rightZ * dxPx * unit + fwdZ * along;
    this.ctrl.followTrip = false;
    this.clampTarget();
  }

  /** Plano 2, bloco 12: a câmera não sai do lote (sem cidade) nem da cidade. */
  private clampTarget(): void {
    if (this.city.on) {
      const p = this.city.clampLocal(this.target.x, this.target.z);
      this.target.x = p.x;
      this.target.z = p.z;
      return;
    }
    const { w, h } = this.ctrl.world.grid;
    this.target.x = THREE.MathUtils.clamp(this.target.x, -6, w + 6);
    this.target.z = THREE.MathUtils.clamp(this.target.z, -6, h + 8);
  }

  /** Plano 2, bloco 12: lote da cidade debaixo do mouse (no mapa). */
  private mapLotAt(clientX: number, clientY: number): number {
    const rect = this.renderer.domElement.getBoundingClientRect();
    const ndc = new THREE.Vector2(((clientX - rect.left) / rect.width) * 2 - 1, -((clientY - rect.top) / rect.height) * 2 + 1);
    this.raycaster.setFromCamera(ndc, this.camera);
    const p = new THREE.Vector3();
    if (!this.raycaster.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), p)) return 0;
    return this.city.lotAt(p);
  }

  /** Plano 2, bloco 13: lugar da cidade debaixo do mouse (no mapa). */
  private mapPlaceAt(clientX: number, clientY: number): string {
    const rect = this.renderer.domElement.getBoundingClientRect();
    const ndc = new THREE.Vector2(((clientX - rect.left) / rect.width) * 2 - 1, -((clientY - rect.top) / rect.height) * 2 + 1);
    this.raycaster.setFromCamera(ndc, this.camera);
    const p = new THREE.Vector3();
    if (!this.raycaster.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), p)) return '';
    return this.city.placeAt(p);
  }

  /** Plano 2, bloco 12: etiquetas do mapa e ícones da família, já na tela. */
  mapMarks(): MapMark[] {
    return this.city.marks(this.camera);
  }

  /** Plano 2, bloco 12: zoom pedido de fora (abrir o mapa, voltar para casa, seguir a viagem). */
  private followCity(dt: number): void {
    const req = this.ctrl.viewRequest;
    if (req) {
      this.ctrl.viewRequest = null;
      this.zoomGoal = req.zoom;
      const p = req.where === 'city' ? this.city.cityCenterLocal() : req.where === 'home' ? this.city.homeLocal() : null;
      if (p) this.focusGoal = { x: p.x, z: p.z };
    }
    if (this.zoomGoal !== null) {
      const k = 1 - Math.exp(-dt * 4);
      this.viewHeight += (this.zoomGoal - this.viewHeight) * k;
      if (Math.abs(this.zoomGoal - this.viewHeight) < 0.05) {
        this.viewHeight = this.zoomGoal;
        this.zoomGoal = null;
      }
    }
    // a câmera acompanha quem anda pela rua
    if (this.ctrl.followTrip) {
      const p = this.city.tripLocal(this.ctrl.world.tick + Math.min(1, this.acc));
      if (!p) {
        // chegou: volta para perto de quem chegou
        this.ctrl.followTrip = false;
        if (!this.ctrl.world.trip) this.ctrl.closeTown();
      } else {
        this.focusGoal = null;
        const k = 1 - Math.exp(-dt * 6);
        this.target.x += (p.x - this.target.x) * k;
        this.target.z += (p.z - this.target.z) * k;
      }
    }
    // longe o bastante, a tela vira o mapa (cartão do lote, etiquetas)
    const map = this.city.on && this.viewHeight >= MAP_ZOOM;
    if (map !== (this.ctrl.screen === 'town')) this.ctrl.setMapScreen(map);
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
    // plano 2, bloco 3: a laje se marca na altura do telhado
    const h = this.ctrl.viewLevel * LEVEL_H + (this.slabTool() ? WALL_H : 0);
    return this.raycaster.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0, 1, 0), -h), new THREE.Vector3());
  }

  /** Plano 2, bloco 8: está segurando um quadro, prateleira ou relógio. */
  private liftingWall(): boolean {
    const p = this.ctrl.placing;
    return !!p && this.ctrl.sim.catalog.objects[p.defId]?.layer === 'wall';
  }

  /** Plano 2, bloco 3: ferramenta de marcar ou tirar laje na mão. */
  private slabTool(): boolean {
    return this.ctrl.mode === 'build' && (this.ctrl.buildTool === 'slab' || this.ctrl.buildTool === 'unslab');
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
    const def = this.ctrl.placing ? this.ctrl.sim.catalog.objects[this.ctrl.placing.defId] : undefined;
    // plano 2, bloco 8: o enfeite mira na altura dos tampos, e a posição dentro do tile vale
    const lift = def?.layer === 'surface' ? 0.76 : 0;
    const ground = lift
      ? this.raycaster.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0, 1, 0), -(this.ctrl.viewLevel * LEVEL_H + lift)), new THREE.Vector3())
      : this.levelPoint();
    if (!ground || !this.ctrl.placing) return null;
    this.subTile = { x: ground.x - Math.floor(ground.x), y: ground.z - Math.floor(ground.z) };
    // o tile sob o mouse fica no centro do objeto
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
      // plano 2, bloco 4: clicar em si mesmo sentado mostra o que dá para fazer dali
      // plano 2, bloco 7: de pé, também (olhar pela janela)
      else this.hud.openSelfMenu(clientX, clientY);
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
    const tick = world.tick;
    const sig =
      mess.map((m) => (m.meal ? `${m.id}:${m.meal.servings}:${isWarm(m.meal, tick) ? 1 : 0}${isSpoiled(m.meal, tick) ? 1 : 0}` : m.id)).join(',') +
      `|${this.ctrl.objectsVersion}`;
    if (sig === this.messSig) return;
    this.messSig = sig;
    this.messRoot.traverse((o) => {
      if (o instanceof THREE.Mesh) o.geometry.dispose();
    });
    this.messRoot.clear();
    this.mealFx = [];
    for (const m of mess) {
      // em cima de mesa ou bancada, o prato fica no tampo
      let top = 0;
      for (const e of this.objects.values()) {
        if (SURFACE_TOP[e.def.art] === undefined && !hasSurface(e.def)) continue;
        const size = objectSize(e.def, e.obj.rot);
        if (m.x >= e.obj.x && m.y >= e.obj.y && m.x < e.obj.x + size.w && m.y < e.obj.y + size.h) top = surfaceTop(e);
      }
      const stack = mess.filter((o) => o.x === m.x && o.y === m.y && o.id < m.id).length;
      let g: THREE.Group;
      if (m.meal) {
        // plano 2, bloco 6: a travessa: cheia ou pela metade, quente, fria ou estragada
        const fx = buildMeal(
          { dish: m.meal.dish, fill: m.meal.servings / Math.max(1, m.meal.total), warm: isWarm(m.meal, tick), spoiled: isSpoiled(m.meal, tick), burnt: !!m.meal.burnt },
          m.id,
        );
        this.mealFx.push(fx);
        g = fx.group;
        if (top === 0) top = CHORE_TOP[this.objects.get(m.meal.on)?.def.art ?? ''] ?? 0;
      } else g = buildMess(m.kind, m.id, top);
      const jitter = m.meal ? 0 : ((m.id * 37) % 7) / 7 - 0.5;
      const at = sceneZ(world.grid, m.y);
      g.position.set(m.x + 0.5 + jitter * 0.3, at.base + top + (m.kind === 'plate' ? stack * 0.03 : m.kind === 'paper' ? stack * 0.11 : 0), at.z + 0.5 - jitter * 0.25);
      g.userData.messId = m.id;
      g.userData.level = at.level;
      this.messRoot.add(g);
    }
    if (this.hover.mess && !mess.includes(this.hover.mess)) this.hover = {};
  }

  /**
   * Plano 2, bloco 6: o que as atividades deixam nos objetos: panela com
   * vapor no fogão de quem está mexendo, tábua com legumes na bancada de quem
   * está picando, a louça esperando na pia e a cama desfeita.
   */
  private syncChores(): void {
    const world = this.ctrl.world;
    const want = new Map<number, string>();
    // plano 2, bloco 6: quem está deitado na cama fica debaixo da coberta
    const covers = new Map<number, number[]>();
    for (const folk of world.folks) {
      const a = folk.queue[0];
      if (a?.phase !== 'using' || a.objectId === undefined || a.stage) continue;
      const it = this.ctrl.sim.interactionOf(a);
      const e = this.objects.get(a.objectId);
      if (it?.pose === 'lie' && it.onObject && e?.def.category === 'beds') covers.set(a.objectId, [...(covers.get(a.objectId) ?? []), a.slot ?? 0]);
    }
    for (const [id, slots] of covers) want.set(id, `cover:${slots.sort().join('.')}`);
    for (const folk of world.folks) {
      const a = folk.queue[0];
      if (a?.phase !== 'using' || a.objectId === undefined || !a.cook) continue;
      if (a.interactionId === 'stir') want.set(a.objectId, `pot:${a.cook.dish}`);
      else if (a.interactionId === 'prep') want.set(a.objectId, 'board');
    }
    for (const entry of this.objects.values()) {
      const o = entry.obj;
      if (want.has(o.id)) continue;
      if (o.dishes) want.set(o.id, `dishes:${Math.ceil(o.dishes)}`);
      else if (o.unmade && entry.spec.lie) want.set(o.id, `rumple:${entry.def.size.w}`);
    }
    for (const [id, cur] of this.choreFx) {
      if (want.get(id) === cur.key) continue;
      this.choreRoot.remove(cur.fx.group);
      cur.fx.group.traverse((x) => {
        if (x instanceof THREE.Mesh) x.geometry.dispose();
      });
      this.choreFx.delete(id);
    }
    for (const [id, key] of want) {
      const entry = this.objects.get(id);
      if (!entry) continue;
      let cur = this.choreFx.get(id);
      if (!cur) {
        const [kind, arg] = key.split(':');
        const lies = (arg ?? '').split('.').map((n) => entry.spec.lies?.[Number(n)] ?? entry.spec.lie ?? { x: 0, y: 0.5, z: 0.9, heading: 0 });
        const fx =
          kind === 'cover' ? buildCover(lies, id) : kind === 'pot' ? buildPot(arg, id) : kind === 'board' ? buildBoard(id) : kind === 'dishes' ? buildDishStack(Number(arg)) : buildRumple(Number(arg), id);
        const top = kind === 'cover' ? 0 : kind === 'rumple' ? (entry.spec.lie?.y ?? 0.5) - 0.11 : (CHORE_TOP[entry.def.art] ?? entry.height);
        // pilha na pia vai para o lado da cuba; o resto no meio do tampo
        const at = this.anchorToWorld(entry, { x: kind === 'dishes' ? 0.18 : 0, y: top, z: kind === 'rumple' ? 0.1 : 0, heading: 0 });
        fx.group.position.set(at.x, at.y, at.z);
        fx.group.rotation.y = entry.turn;
        this.choreRoot.add(fx.group);
        cur = { key, fx };
        this.choreFx.set(id, cur);
      }
      cur.fx.group.visible = entry.level <= this.ctrl.viewLevel;
      cur.fx.tick?.(this.animTime);
    }
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
      this.animTime += dt * Math.min(Math.max(rate, 1), 2.5);
    }
    const alpha = Math.min(1, this.acc);

    this.updateCamera(dt);
    // plano 2, bloco 12: a cidade em volta (lotes detalhados por perto, quem anda na rua)
    this.city.sync(this.target, this.viewHeight, world.tick + alpha);
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
    // plano 2, bloco 7: o que aparece na tela do computador de quem está usando
    const screens = new Map<number, string>();
    for (const folk of world.folks) {
      const a = folk.queue[0];
      if (a?.phase === 'using' && a.objectId !== undefined && a.interactionId) {
        using.set(a.objectId, a.interactionId);
        const sc = a.stage === undefined ? this.ctrl.sim.interactionOf(a)?.screen : undefined;
        if (sc) screens.set(a.objectId, sc);
      }
    }
    this.syncMess();
    for (const m of this.messRoot.children) m.visible = (m.userData.level ?? 0) <= this.ctrl.viewLevel;
    for (const f of this.mealFx) f.tick?.(this.animTime);
    this.syncChores();
    for (const entry of this.objects.values()) {
      entry.model.tick?.({
        time: this.animTime,
        using: using.get(entry.obj.id),
        night,
        lit: (!!entry.obj.lit && !entry.obj.state?.broken) || (entry.obj.blaze ?? 0) > world.tick,
        ringing: !!world.call && !world.call.answeredBy,
        channel: entry.obj.state?.broken ? undefined : entry.obj.channel,
        stock: entry.obj.snacks,
        plant: entry.obj.plant,
        alarm: this.alarmFor(entry.def.safety),
        screen: entry.obj.state?.broken ? undefined : screens.get(entry.obj.id),
        canvas: entry.obj.canvas ? { seed: entry.obj.canvas.seed, progress: entry.obj.canvas.progress } : undefined,
        running: (entry.obj.running ?? 0) > world.tick,
        load: entry.obj.laundry ?? entry.obj.dishes,
      });
      if (entry.obj.state) entry.fx.update(entry.obj.state, !!entry.def.upkeep?.bin && entry.obj.state.fill >= 100, this.animTime);
      this.updateNotes(entry);
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

  /**
   * Plano 2, bloco 4: onde o folk sentado aparece. O lugar do sim é uma célula
   * do assento; aqui vira a âncora de sentar do desenho mais perto dela (um
   * pouco para a frente, para o tabuleiro e a mesa acharem o lado certo).
   */
  private seatPlace(folk: Folk): { x: number; y: number; z: number; heading: number } | null {
    const p = folk.posture;
    const entry = p && this.objects.get(p.objectId);
    if (!p || !entry) return null;
    const spot = spotsOf(entry.def)[p.spot];
    if (!spot) return null;
    const cell = spotCell(entry.obj, entry.def, spot);
    const face = spotFace(entry.obj, spot);
    const foot = this.footAt(cell.x, cell.y);
    const tx = foot.x + face.x * 0.3;
    const tz = foot.z + face.y * 0.3;
    const anchors = entry.spec.sit ?? [];
    if (anchors.length === 0) return { x: foot.x, y: foot.y + 0.42, z: foot.z, heading: Math.atan2(face.x, face.y) };
    let best = this.anchorToWorld(entry, anchors[0]);
    let bestD = Infinity;
    for (const a of anchors) {
      const w = this.anchorToWorld(entry, a);
      const d = Math.hypot(w.x - tx, w.z - tz);
      if (d < bestD) {
        bestD = d;
        best = w;
      }
    }
    return best;
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
  /** Plano 2, bloco 7: o meio do tile, no chão da cena (para onde olhar pela janela). */
  private tileCenter(x: number, y: number): { x: number; z: number } {
    const a = this.footAt(x, y);
    return { x: a.x, z: a.z };
  }

  /**
   * Plano 2, bloco 7: o olhar puxado pelo que acontece em volta. Vendo (ou
   * sentado de frente para) a TV, o fogo ou o som, olha para lá; parado,
   * de vez em quando olha a TV ligada por perto ou quem passa andando.
   */
  private gazeOf(folk: Folk, anim: string): { x: number; z: number } | undefined {
    const sim = this.ctrl.sim;
    const shown = sim.watchedBy(folk);
    const at = (id: number) => {
      const e = this.objects.get(id);
      return e?.center ? { x: e.center.x, z: e.center.z } : undefined;
    };
    if (shown) return at(shown.id);
    const idle = anim === 'idle' || anim.startsWith('g_') || anim === 'sit' || anim.startsWith('sit_');
    if (!idle) return undefined;
    // olhadinha, não encarar: uma parte do tempo só
    const k = Math.sin(this.animTime * 0.35 + folk.id * 1.9);
    if (k < 0.25) return undefined;
    let best: { x: number; z: number; d: number } | undefined;
    for (const obj of sim.world.objects) {
      if (!obj.channel) continue;
      const d = Math.abs(obj.x - folk.x) + Math.abs(obj.y - folk.y);
      if (d > 7 || (best && d >= best.d)) continue;
      const p = at(obj.id);
      if (p) best = { ...p, d };
    }
    if (best) return best;
    for (const other of sim.world.folks) {
      if (other === folk || other.away || (other.px === other.x && other.py === other.y)) continue;
      const d = Math.abs(other.x - folk.x) + Math.abs(other.y - folk.y);
      if (d > 4 || (best && d >= best.d)) continue;
      const v = this.folks.get(other.id);
      if (v) best = { x: v.model.group.position.x, z: v.model.group.position.z, d };
    }
    return best;
  }

  /** Plano 2, bloco 7: tom da fala de agora (para a boca seguir o ritmo certo). */
  private toneFor(folk: Folk): Tone {
    const sim = this.ctrl.sim;
    const a = folk.queue[0];
    if (a?.kind === 'social') {
      const def = sim.catalog.socials[a.socialId ?? ''];
      return speechTone(def?.category, def?.anim, a.accepted === false && a.elapsed > 1);
    }
    if (a?.kind === 'listen' && a.otherId !== undefined) {
      const theirs = sim.findFolk(a.otherId)?.queue[0];
      const def = theirs?.kind === 'social' ? sim.catalog.socials[theirs.socialId ?? ''] : undefined;
      return speechTone(def?.category, def?.targetAnim ?? def?.anim);
    }
    return 'calm';
  }

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
    // plano 2, bloco 9: trocando de roupa na entrada: a roupa nova aparece no último minuto
    const changing = !!action?.changing && action.phase !== 'using';
    const nextIt = changing && action ? sim.interactionOf(action) : undefined;
    const wear = changing ? (action!.changing! > 1 ? wearOf(folk) : wearOf(folk, nextIt)) : wearOf(folk, it);
    const uniform = wear === 'work' ? this.uniformFor(folk) : undefined;
    const dress = ensembleOf(folk, wear);
    const key = lookKey(folk.look, wear, uniform, folk.age, dress);
    if (key !== view.lookKey) {
      const old = view.model;
      const fresh = new FolkModel(folk.look, wear, uniform, folk.age, dress);
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
    // plano 2, bloco 6: o que vai na mão pela fase, etapa ou tarefa (ganha da interação)
    let held: HeldProp | undefined;
    // plano 2, bloco 5: boca falando e para onde olhar
    let speaking = false;
    // plano 2, bloco 7: para onde olhar quando não é quem fala (TV, rua, quem acompanha)
    let gaze: { x: number; z: number } | undefined;
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
        expr = 'scared';
      }
    } else if (changing) {
      anim = 'dress_change';
    } else if (action?.kind === 'douse' && action.phase === 'using') {
      anim = 'spray';
      expr = 'focused';
    } else if (action?.kind === 'panic' && action.phase === 'using') {
      anim = 'panic';
      expr = 'scared';
    } else if (folk.visit?.service?.kind === 'reaper' && folk.px === folk.x && folk.py === folk.y) {
      anim = 'lantern';
    } else if (folk.visit?.service?.kind === 'burglar' && folk.visit.service.target && folk.visit.service.started >= 0 && folk.queue.length === 0) {
      anim = 'reach';
    } else if (it && entry) {
      anim =
        (seatId !== undefined ? 'sit' : undefined) ??
        (it.anim && isAnim(it.anim) ? it.anim : undefined) ??
        ANIMS[`${entry.def.art}:${it.id}`] ??
        (it.care ? CARE_ANIMS[it.care] : undefined) ??
        (it.pose === 'sit' ? 'sit' : it.pose === 'lie' ? 'sleep' : it.pose === 'dance' ? 'dance' : 'reach');
      if (it.onObject || seatId !== undefined) {
        let anchor: Anchor | undefined;
        // plano 2, bloco 7: deitado fazendo outra coisa (ler na cama) também vai para o lugar de deitar
        if (anim === 'sleep' || it.pose === 'lie') anchor = (action?.slot !== undefined ? entry.spec.lies?.[action.slot] : undefined) ?? entry.spec.lie ?? couchLie(entry.spec);
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
      // plano 2, bloco 6: fases do laço (tirar a roupa, ensaboar, enxaguar)
      if (it.phases && action && !action.stage) {
        let ph = it.phases[0];
        for (const p of it.phases) if (action.elapsed >= p.at) ph = p;
        if (ph && isAnim(ph.anim)) {
          anim = ph.anim;
          held = ph.hold;
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
      // plano 2, bloco 6: rodo na poça, vassoura no lixo e na cinza, o prato na mão
      const kind = sim.world.mess.find((m) => m.id === action.messId)?.kind;
      const how = kind ? TIDY_LOOK[kind] : undefined;
      anim = how?.anim ?? 'scrub';
      held = how?.hold;
    } else if (action?.kind === 'window' && action.phase === 'using') {
      // plano 2, bloco 7: debruçado na janela, olhando a rua
      anim = 'gazeOut';
      const out = action.route?.[0];
      if (out) gaze = this.tileCenter(out.x, out.y);
    } else if (action?.kind === 'gesture') {
      // plano 2, bloco 7: tchau da porta para a visita que vai embora
      anim = action.gesture && isAnim(action.gesture) ? action.gesture : 'wave';
      const guest = action.escort !== undefined ? this.folks.get(action.escort) : undefined;
      if (guest) gaze = { x: guest.model.group.position.x, z: guest.model.group.position.z };
    } else if (action?.kind === 'meal' && action.phase === 'using') {
      // plano 2, bloco 6: servir-se, chamar a família, esquentar e jogar fora
      const look = MEAL_LOOK[action.mealAct ?? 'serve'];
      anim = look.anim;
      held = look.hold;
      if (action.mealAct === 'call') speaking = true;
    } else if (folk.px !== folk.x || folk.py !== folk.y) {
      anim = 'walk';
      // plano 2, bloco 6: levando o prato servido até a mesa
      if (action?.served) held = 'plate';
      // plano 2, bloco 7: acompanhando a visita até a porta, conversando
      if (action?.escort !== undefined) {
        const guest = this.folks.get(action.escort);
        if (guest) {
          gaze = { x: guest.model.group.position.x, z: guest.model.group.position.z };
          speaking = Math.sin(this.animTime * 0.8 + folk.id) > -0.2;
        }
      }
    } else if (social) {
      anim = social.anim;
      expr = social.expr;
      speaking = !!social.speaking;
      // abraço e beijo: os dois chegam mais perto do meio
      // plano 2, bloco 7: e os gestos de toque (aperto de mão, tapinha, dança lenta, massagem)
      const close = CLOSE_ANIMS[anim];
      if (close) {
        const dx = social.other.x - folk.x;
        const dz = social.other.y - folk.y;
        place.x += dx * close;
        place.z += dz * close;
        place.heading = Math.atan2(dx, dz);
      }
    }

    // plano 2, bloco 4: sentado fica no assento entre uma ação e outra; o tronco
    // segue o que faz (assistir, conversar, ler, comer), as pernas ficam dobradas
    let seated = false;
    const seat = folk.collapsed === 0 && !folk.down && folk.age !== 'baby' ? this.seatPlace(folk) : null;
    if (seat) {
      place = seat;
      onObject = true;
      seated = true;
      const tick = sim.world.tick;
      const sitting = action?.stage === 'enter' && action.slot === folk.posture!.spot;
      // plano 2, bloco 6: etapa própria (levantar a tampa, dar descarga) é de pé, na frente
      const own = it && action?.stage ? stagesOf(it)[action.stage] : undefined;
      if (own?.anim && isAnim(own.anim)) {
        anim = own.anim;
        held = own.hold;
        const c = entry?.center;
        place = { x: fx, y: fy, z: fz, heading: c ? Math.atan2(c.x - fx, c.z - fz) : Math.atan2(folk.facing.x, folk.facing.y) };
        seated = false;
      } else if (folk.posture!.rising !== undefined || sitting) anim = 'perch';
      else {
        if (anim === 'idle' || anim === 'walk' || anim === 'reach' || anim.startsWith('g_')) anim = 'sit';
        const watching = isWatch(it) || (anim === 'sit' && !!sim.watchedBy(folk));
        if (watching && (anim === 'sit' || anim === 'watch')) anim = 'watch';
        if (it?.channel && action && action.elapsed === 0) anim = 'remote';
        if (folk.carry && (anim === 'sit' || anim === 'watch') && Math.sin(this.animTime * 0.9 + folk.id) > -0.3) anim = 'eat';
        // plano 2, bloco 6: à mesa, come de garfo; com companhia, conversa entre uma garfada e outra
        if (action?.eatAt !== undefined && action.phase === 'using' && !action.stage && anim === 'sit') {
          const company = sim.world.folks.some((f) => f !== folk && f.queue[0]?.eatAt === action.eatAt && f.queue[0]?.phase === 'using');
          anim = company && Math.sin(this.animTime * 0.45 + folk.id * 1.7) > 0.35 ? 'eat_chat' : 'eat';
          if (anim === 'eat_chat') speaking = true;
          // à mesa o prato fica no tampo: na mão, só o garfo
          const table = seatId !== undefined && this.objects.get(seatId)?.def.category === 'surfaces';
          if (table) held = 'cutlery';
          else if (!held && it?.hold === 'plate') held = 'fork';
        }
        const r = folk.react;
        if (r && r.until > tick && (anim === 'watch' || anim === 'sit' || anim === 'eat')) {
          anim = r.kind;
          expr = r.kind === 'cry' ? 'cry' : r.kind === 'gasp' ? 'scared' : 'laugh';
        }
      }
    } else if (it?.pose === 'lie' && action?.stage) {
      // deitando e levantando da cama: sentado na beirada, do lado de onde chegou
      anim = 'perch';
      place = { x: fx, y: fy, z: fz, heading: Math.atan2(folk.facing.x, folk.facing.y) };
      onObject = false;
    } else if (it && action?.stage) {
      // plano 2, bloco 6: etapas de pé na frente do objeto (tampa e descarga, toalha)
      const st = stagesOf(it)[action.stage];
      if (st?.anim && isAnim(st.anim)) {
        anim = st.anim;
        held = st.hold;
        place = { x: fx, y: fy, z: fz, heading: Math.atan2(folk.facing.x, folk.facing.y) };
        onObject = false;
      }
    } else if (it?.channel && action && action.elapsed === 0) anim = 'remote';

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
      else if (thought.kind === 'mess') expr = 'sick';
      else if (thought.kind === 'refuse') expr = 'angry';
      else if (thought.kind === 'wish' || (thought.kind === 'chat' && thought.icon === 'yes')) expr = 'happy';
    }

    const mood = moodOf(sim.catalog, folk.needs);
    // plano 2, bloco 1: parado sem ordem, o folk faz gestos de espera
    if (anim === 'idle' && !social && !folk.visit) {
      const g = idleGesture(folk, sim.world.tick, mood);
      if (g !== 'none') {
        anim = `g_${g}` as FolkAnim;
        if (!expr && g === 'yawn') expr = 'tired';
        if (!expr && (g === 'belly' || g === 'fidget')) expr = 'sad';
      }
    }
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
          : (held ?? it?.hold ?? (folk.carry ? 'plate' : undefined));
    // plano 2, bloco 5: o jeito de andar vem de como o folk está
    if (anim === 'walk') anim = walkStyle(folk, action, mood);
    if (!isAnim(anim)) anim = 'idle';
    // concentrado no que treina (ler, xadrez, computador); falando ao telefone e ensaiando no espelho
    const family = anim.split('_')[0];
    if (!expr && it?.skill && family !== 'talk' && family !== 'dance') expr = 'focused';
    if (family === 'phone' || (it && family === 'talk')) speaking = true;
    const otherView = social && social.other !== folk ? this.folks.get(social.other.id) : undefined;
    const lookAt = otherView ? { x: otherView.model.group.position.x, z: otherView.model.group.position.z } : (gaze ?? this.gazeOf(folk, anim));
    // plano 2, bloco 7: a boca segue as sílabas da fala inventada
    const mouth = speaking ? speechMouth(folk.id, voiceOf(folk), this.toneFor(folk), performance.now() / 1000) : undefined;
    // plano 2, bloco 6: o casal na mesma cama dorme virado um para o outro
    let shown: FolkAnim = anim;
    if (anim === 'sleep' && action?.slot !== undefined && entry && (entry.spec.lies?.length ?? 0) > 1) {
      const together = sim.world.folks.some((f) => f !== folk && f.queue[0]?.objectId === action.objectId && f.queue[0]?.phase === 'using' && !f.queue[0]?.stage);
      if (together) shown = action.slot === 0 ? 'sleep_sideR' : 'sleep_sideL';
    }
    // para as capturas e para conferir de olho (dev)
    view.model.group.userData.anim = shown;
    view.model.group.userData.hold = hold;
    view.model.update({
      anim: shown,
      ...place,
      mood,
      time,
      dt,
      expr,
      hold,
      energy: folk.needs.energy,
      ring: wearsRing(sim.world, folk.id),
      seated,
      speaking,
      mouth,
      lookAt,
      seed: folk.id,
    });

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
      if (speaker === folk) return { anim: 'talk', other: folk, speaking: true };
      const r = reactionTo(sim.catalog, folk, c.topic);
      return {
        anim: r === 'love' ? 'laugh' : 'listen',
        expr: r === 'hate' ? 'sick' : r === 'love' ? 'laugh' : r === 'like' ? 'happy' : undefined,
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
        expr: rejected ? 'sad' : socialExpr(def.anim, def.category),
        other,
        icon: `soc:${def.category}`,
        speaking: !rejected && TALKING_ANIMS.has(def.anim),
      };
    }
    if (a.kind === 'listen') {
      const theirs = other.queue[0];
      if (theirs?.kind !== 'social' || theirs.phase !== 'using') return { anim: 'idle', other };
      const def = sim.catalog.socials[theirs.socialId ?? ''];
      if (!def) return undefined;
      if (theirs.accepted === false) return { anim: 'listen', expr: def.category === 'mean' ? 'angry' : 'neutral', other };
      const anim = def.targetAnim ?? 'listen';
      return { anim, expr: anim === 'listen' ? undefined : socialExpr(anim, def.category), other, speaking: anim === 'argue' || anim === 'fingerWag' };
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
      const key = `${size.w}x${size.h}`;
      if (this.hoverPadKey !== key) {
        this.hoverPadKey = key;
        this.hoverPad.geometry.dispose();
        this.hoverPad.geometry = outlineGeometry(size.w + 0.14, size.h + 0.14, 0.05);
      }
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
    // plano 2, bloco 8: o fantasma já mostra as peças e o estilo escolhidos
    const look = moving ? { parts: moving.parts, style: moving.style } : { parts: placing.parts, style: placing.style ?? styleFromColor(zonesOf(def), placing.color) };
    const key = `${placing.defId}|${placing.moveId ?? ''}|${JSON.stringify(look)}`;
    if (this.ghost?.key !== key) {
      this.clearGhost();
      const built = objectArt(def, placing.moveId ?? 1, look);
      const group = built.model.group;
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
      this.ghost = { key, group, spec: built.spec };
    }
    // o objeto que está sendo movido some do lugar antigo
    for (const e of this.objects.values()) e.model.group.visible = e.obj.id !== placing.moveId && this.shown(e);

    const edges = this.ctrl.world.grid.edges;
    // quadro e relógio viram sozinhos para a parede mais perto do tile
    if (def.layer === 'wall') {
      if (edges[wallBehind({ x: tile.x, y: tile.y, rot: placing.rot })] !== 'wall') {
        const r = ([0, 1, 2, 3] as const).find((rot) => edges[wallBehind({ x: tile.x, y: tile.y, rot })] === 'wall');
        if (r !== undefined) placing.rot = r;
      }
    } else if (placing.autoRot && !def.layer && def.size.w === 1 && def.size.h === 1) {
      // plano 2, bloco 8: móvel de um tile encosta sozinho na parede (de costas para ela)
      const r = ([0, 1, 2, 3] as const).find((rot) => edges[wallBehind({ x: tile.x, y: tile.y, rot })] === 'wall');
      if (r !== undefined) placing.rot = r;
    } else if (placing.autoRot && !def.layer && def.useSides?.length === 1) {
      const r = ([0, 1, 2, 3] as const).find((rot) => edges[wallBehind({ x: tile.x, y: tile.y, rot })] === 'wall');
      if (r !== undefined) placing.rot = r;
    }
    const ghost = this.ghost!;
    const spec = ghost.spec ?? furnitureSpec(def.art);
    const size = objectSize(def, placing.rot);
    const g = ghost.group;
    const at = sceneZ(this.ctrl.world.grid, tile.y);
    g.position.set(tile.x + size.w / 2, at.base + 0.02, at.z + size.h / 2);
    g.rotation.y = (spec.facing === 'E' ? Math.PI / 2 : 0) + placing.rot * (Math.PI / 2);
    if (def.turns8) g.rotation.y = (spec.facing === 'E' ? Math.PI / 2 : 0) + (placing.turn8 ?? placing.rot * 2) * (Math.PI / 4);
    if (def.layer === 'surface') {
      // plano 2, bloco 8: o enfeite segue o mouse dentro do tile, em cima do tampo
      placing.nudge = clampNudge(this.subTile ? { dx: this.subTile.x - 0.5, dy: this.subTile.y - 0.5 } : undefined);
      const sup = supportAt(this.ctrl.world, this.ctrl.sim.catalog, tile.x, tile.y, placing.moveId);
      const se = sup ? this.objects.get(sup.id) : undefined;
      g.position.y = at.base + (se ? surfaceTop(se) : 0.02);
      g.position.x += placing.nudge?.dx ?? 0;
      g.position.z += placing.nudge?.dy ?? 0;
    }
    if (def.layer === 'wall' && placing.lift) g.position.y += placing.lift * LIFT_STEP;
    const ok = checkPlacement(this.ctrl.world, this.ctrl.sim.catalog, placing.defId, tile.x, tile.y, placing.rot, placing.moveId, placing.lift).ok;
    const affordable = placing.moveId !== undefined || this.ctrl.world.household.funds >= this.ctrl.placingPrice();
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
    } else if (tool === 'floor' || tool === 'yard' || tool === 'slab' || tool === 'unslab') {
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
    } else if (tool === 'slab' || tool === 'unslab') {
      const tile = this.tileAt(clientX, clientY);
      if (drag && tile) drag.cur = tile;
      const a = drag?.start ?? tile;
      const b = drag?.cur ?? tile;
      if (a && b) cmd = { type: 'markFlatRoof', x0: a.x, y0: a.y, x1: b.x, y1: b.y, flat: tool === 'slab' };
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
      if (ok && cmd.type === 'markFlatRoof') this.addPing(cmd.x1, cmd.y1);
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
    } else if (cmd.type === 'markFlatRoof') {
      // plano 2, bloco 3: retângulo da laje na altura do telhado
      const top = rowOn(grid, Math.max(0, levelOfRow(grid, cmd.y0)), 0);
      const xa = Math.max(0, Math.min(cmd.x0, cmd.x1));
      const xb = Math.min(grid.w - 1, Math.max(cmd.x0, cmd.x1));
      const ya = Math.max(top, Math.min(cmd.y0, cmd.y1));
      const yb = Math.min(top + grid.h - 1, Math.max(cmd.y0, cmd.y1));
      const color = !ok ? bad : cmd.flat ? PAL.mustard : 0x9ad0e8;
      const slab = new THREE.Mesh(new THREE.BoxGeometry(xb - xa + 1, 0.14, yb - ya + 1), previewMat(color, 0.55));
      slab.material.depthTest = false;
      slab.position.set((xa + xb + 1) / 2, WALL_H + 0.1, (ya + yb + 1) / 2);
      slab.renderOrder = 4;
      this.buildPreview.add(slab);
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
  portrait(look: Look, wear: Wear, w = 120, h = 200, opts: { age?: Age; dress?: Ensemble; heading?: number } = {}): string {
    const scene = new THREE.Scene();
    scene.add(new THREE.HemisphereLight(0xffffff, 0xc4b295, 1.7));
    const sun = new THREE.DirectionalLight(PAL.sun, 2.0);
    sun.position.set(-2, 5, 6);
    scene.add(sun);
    const model = new FolkModel(look, wear, undefined, opts.age, opts.dress);
    const heading = opts.heading ?? 0.35;
    model.update({ anim: 'idle', x: 0, y: 0, z: 0, heading, mood: 75, time: 0, dt: 1 });
    model.update({ anim: 'idle', x: 0, y: 0, z: 0, heading, mood: 75, time: 0, dt: 1 });
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
  /**
   * Plano 2, bloco 5: busto de perto (cabeça e ombros) com uma expressão.
   * Serve ao criador, às capturas e a quem quiser ver o rosto de perto.
   */
  bust(look: Look, expr: Expression, opts: { age?: Age; speaking?: boolean; turn?: number; w?: number; h?: number } = {}): string {
    const w = opts.w ?? 96;
    const h = opts.h ?? 96;
    const scene = new THREE.Scene();
    scene.add(new THREE.HemisphereLight(0xffffff, 0xc4b295, 1.7));
    const sun = new THREE.DirectionalLight(PAL.sun, 2.0);
    sun.position.set(-2, 5, 6);
    scene.add(sun);
    const model = new FolkModel(look, 'day', undefined, opts.age);
    const frame = { anim: 'idle' as FolkAnim, x: 0, y: 0, z: 0, heading: opts.turn ?? 0.25, mood: 60, time: 0, dt: 1, expr, speaking: opts.speaking };
    model.update(frame);
    model.update({ ...frame, dt: 0.05 });
    scene.add(model.group);
    model.group.updateMatrixWorld(true);
    const top = model.headTop(new THREE.Vector3());
    const sc = model.group.scale.y * (opts.age === 'child' ? 1.22 : opts.age === 'baby' ? 1.6 : 1);
    const half = 0.19 * sc;
    const cy = top.y - 0.24 * sc;
    const cam = new THREE.OrthographicCamera(-half * (w / h), half * (w / h), half, -half, 0.1, 50);
    cam.position.set(0, cy + 0.6, 10);
    cam.lookAt(0, cy, 0);
    cam.updateMatrixWorld();
    const url = this.renderToUrl(scene, cam, w, h);
    model.group.traverse((o) => {
      if (o instanceof THREE.Mesh) o.geometry.dispose();
    });
    return url;
  }

  /** Plano 2, bloco 5: quadros de uma animação, de corpo inteiro (capturas e testes de olho). */
  poseStrip(look: Look, anim: FolkAnim, times: number[], opts: { seated?: boolean; heading?: number; mood?: number; w?: number; h?: number; expr?: Expression; speaking?: boolean; hold?: HeldProp } = {}): string[] {
    const w = opts.w ?? 120;
    const h = opts.h ?? 200;
    const scene = new THREE.Scene();
    scene.add(new THREE.HemisphereLight(0xffffff, 0xc4b295, 1.7));
    const sun = new THREE.DirectionalLight(PAL.sun, 2.0);
    sun.position.set(-2, 5, 6);
    scene.add(sun);
    const model = new FolkModel(look, 'day');
    scene.add(model.group);
    const half = 1.05;
    const cam = new THREE.OrthographicCamera(-half * (w / h), half * (w / h), half, -half, 0.1, 50);
    cam.position.set(0, 1.25, 10);
    cam.lookAt(0, 0.85, 0);
    cam.updateMatrixWorld();
    const out: string[] = [];
    let t = times[0] - 1;
    const frame = (time: number, dt: number) =>
      model.update({ anim, x: 0, y: opts.seated ? 0.42 : 0, z: 0, heading: opts.heading ?? 0.9, mood: opts.mood ?? 65, time, dt, seated: opts.seated, expr: opts.expr, speaking: opts.speaking, seed: 1, hold: opts.hold });
    for (const goal of times) {
      while (t < goal) {
        t = Math.min(goal, t + 1 / 60);
        frame(t, 1 / 60);
      }
      out.push(this.renderToUrl(scene, cam, w, h));
    }
    model.group.traverse((o) => {
      if (o instanceof THREE.Mesh) o.geometry.dispose();
    });
    return out;
  }

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

