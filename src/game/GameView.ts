import * as THREE from 'three';
import { t } from '../i18n';
import { NEED_IDS, TICKS_PER_SECOND, checkPlacement, clockOf, moodOf, objectSize } from '../sim';
import type { Action, Folk, InteractionDef, NeedId, ObjectDef, RelDelta, SocialDef, Speed, WorldObject } from '../sim';
import type { Expression } from './art/textures';
import type { Hud } from '../ui/hud';
import { FolkModel } from './art/folk';
import type { FolkAnim } from './art/folk';
import { buildFurniture, furnitureSpec } from './art/furniture';
import type { Anchor, FurnitureModel, FurnitureSpec } from './art/furniture';
import { House } from './art/house';
import { PAL } from './art/palette';
import { buildScenery } from './art/scenery';
import { getTexture } from './art/textures';
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

interface ObjectEntry {
  obj: WorldObject;
  def: ObjectDef;
  spec: FurnitureSpec;
  model: FurnitureModel;
  center: THREE.Vector3;
  turn: number;
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
  private pointer = { down: false, x: 0, y: 0, startX: 0, startY: 0, dragged: false };
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
    this.scene.add(this.ring, this.hoverTile, this.hoverPad, this.ghostPad);

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
    const occupied = new Set<string>();
    for (const obj of world.objects) {
      const def = this.ctrl.sim.defOf(obj);
      if (!def) continue;
      for (let dy = 0; dy < def.size.h; dy++) for (let dx = 0; dx < def.size.w; dx++) occupied.add(`${obj.x + dx},${obj.y + dy}`);
    }
    this.house = new House(grid, occupied);
    this.worldRoot.add(buildScenery(grid), this.house.group);
    this.worldRoot.add(this.objectsRoot);
    this.rebuildObjects();

    this.syncFolks();

    this.target.set(grid.w / 2 + 0.3, 0, grid.h / 2 - 0.8);
    this.sun.target.position.set(grid.w / 2, 0, grid.h / 2);
    this.builtVersion = this.ctrl.worldVersion;
    this.wallState = '';
    this.acc = 0;
    this.hover = {};
    this.hud.closeMenu();
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
      model.group.position.copy(center);
      model.group.rotation.y = turn;
      model.group.userData.objectId = obj.id;
      this.objectsRoot.add(model.group);
      this.objects.set(obj.id, { obj, def, spec, model, center, turn });
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
      Object.assign(this.pointer, { down: true, x: e.clientX, y: e.clientY, startX: e.clientX, startY: e.clientY, dragged: false });
    });
    el.addEventListener('pointermove', (e) => {
      const p = this.pointer;
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
        el.style.cursor = this.hover.entry || this.hover.folk ? 'pointer' : 'default';
        const tip = this.hover.folk
          ? this.hud.folkTooltip(this.hover.folk)
          : this.hover.entry
            ? t(this.hover.entry.def.name)
            : null;
        this.hud.setTooltip(e.clientX, e.clientY, tip);
      }
      p.x = e.clientX;
      p.y = e.clientY;
    });
    el.addEventListener('pointerup', (e) => {
      const wasDrag = this.pointer.dragged;
      this.pointer.down = false;
      if (wasDrag) return;
      if (e.button === 2) {
        // clique direito desiste do que estava sendo posto
        if (this.ctrl.placing) this.ctrl.placing = null;
        return;
      }
      this.click(e.clientX, e.clientY);
    });
    el.addEventListener('pointerleave', () => {
      this.hover = {};
      this.hud.setTooltip(0, 0, null);
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

    window.addEventListener('keydown', (e) => {
      if (e.target instanceof HTMLInputElement) return;
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
        case 'Tab':
          e.preventDefault();
          this.ctrl.selectNext();
          break;
        case 'Escape':
          if (this.hud.isMenuOpen()) this.hud.closeMenu();
          else if (this.ctrl.placing) this.ctrl.placing = null;
          else if (this.ctrl.mode === 'buy') this.hud.toggleBuyMode();
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
    if (hit.entry) {
      this.hud.setTooltip(0, 0, null);
      this.hud.openMenu(clientX, clientY, hit.entry.obj);
    } else if (hit.tile) {
      if (this.ctrl.commandOrExplain({ type: 'queueGoto', folkId: folk.id, ...hit.tile })) {
        this.addPing(hit.tile.x, hit.tile.y);
      }
    }
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
    if (this.builtObjects !== this.ctrl.objectsVersion) this.rebuildObjects();
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
    for (const entry of this.objects.values()) {
      entry.model.tick?.({ time: this.animTime, using: using.get(entry.obj.id), night });
      const s = entry === this.hover.entry ? 1.04 : 1;
      entry.model.group.scale.lerp(this.tmp.set(s, s, s), 0.3);
    }

    this.syncFolks();
    for (const folk of world.folks) this.updateFolk(folk, alpha, dt);
    this.showOutcomes();
    this.updateMarkers(dt);
    this.updateGhost();

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
