import * as THREE from 'three';
import { t } from '../i18n';
import { NEED_IDS, TICKS_PER_SECOND, clockOf, moodOf } from '../sim';
import type { Folk, InteractionDef, NeedId, ObjectDef, Speed, WorldObject } from '../sim';
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

const ELEVATION = THREE.MathUtils.degToRad(34);
const CAMERA_DISTANCE = 60;
/** resolução interna máxima: acima disso a imagem é ampliada, como num monitor antigo */
const MAX_INTERNAL_HEIGHT = 768;
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
  private sun = new THREE.DirectionalLight(PAL.sun, 2.4);
  private hemi = new THREE.HemisphereLight(0xffffff, 0xb9a98a, 1.5);
  private worldRoot = new THREE.Group();
  private house!: House;
  private objects = new Map<number, ObjectEntry>();
  private folks = new Map<number, FolkEntry>();
  private ring = new THREE.Group();
  private hoverTile: THREE.Mesh;
  private hoverPad: THREE.Mesh;
  private pings: Ping[] = [];

  private target = new THREE.Vector3();
  private azimuth = Math.PI / 4;
  private viewHeight = 13.5;
  private builtVersion = -1;
  private wallState = '';
  private acc = 0;
  private animTime = 0;
  private hudClock = 0;
  private last = 0;
  private lastSpeed: Speed = 1;
  private hover: { entry?: ObjectEntry; tile?: { x: number; y: number } } = {};
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

    this.scene.add(this.hemi, this.sun, this.sun.target, this.worldRoot);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(1024, 1024);
    this.sun.shadow.bias = -0.0012;
    this.sun.shadow.normalBias = 0.03;
    this.sun.shadow.intensity = 0.55;
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
    this.scene.add(this.ring, this.hoverTile, this.hoverPad);

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
    this.objects.clear();
    this.folks.clear();
    for (const p of this.pings) this.scene.remove(p.mesh);
    this.pings = [];

    const world = this.ctrl.world;
    const { grid } = world;
    this.house = new House(grid);
    this.worldRoot.add(buildScenery(grid), this.house.group);

    for (const obj of world.objects) {
      const def = this.ctrl.sim.defOf(obj);
      if (!def) continue;
      const spec = furnitureSpec(def.art);
      const model = buildFurniture(def.art, obj.id);
      const center = new THREE.Vector3(obj.x + def.size.w / 2, 0, obj.y + def.size.h / 2);
      const turn = spec.facing === 'E' ? Math.PI / 2 : 0;
      model.group.position.copy(center);
      model.group.rotation.y = turn;
      model.group.userData.objectId = obj.id;
      this.worldRoot.add(model.group);
      this.objects.set(obj.id, { obj, def, spec, model, center, turn });
    }

    for (const folk of world.folks) {
      const model = new FolkModel(folk.look);
      const zzz: THREE.Sprite[] = [];
      for (let i = 0; i < 3; i++) {
        const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: getTexture('zzz'), transparent: true, depthTest: false }));
        s.visible = false;
        zzz.push(s);
        this.worldRoot.add(s);
      }
      this.worldRoot.add(model.group);
      this.folks.set(folk.id, { model, zzz });
    }

    this.target.set(grid.w / 2 + 0.3, 0, grid.h / 2 - 0.8);
    this.sun.target.position.set(grid.w / 2, 0, grid.h / 2);
    this.builtVersion = this.ctrl.worldVersion;
    this.wallState = '';
    this.acc = 0;
    this.hover = {};
    this.hud.closeMenu();
  }

  private resize(): void {
    const w = this.container.clientWidth || window.innerWidth;
    const h = this.container.clientHeight || window.innerHeight;
    const scale = Math.min(1, MAX_INTERNAL_HEIGHT / h);
    this.renderer.setPixelRatio(1);
    this.renderer.setSize(Math.round(w * scale), Math.round(h * scale), false);
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
    cam.position
      .set(Math.sin(this.azimuth) * Math.cos(ELEVATION), Math.sin(ELEVATION), Math.cos(this.azimuth) * Math.cos(ELEVATION))
      .multiplyScalar(CAMERA_DISTANCE)
      .add(this.target);
    cam.lookAt(this.target);
    cam.updateProjectionMatrix();
    cam.updateMatrixWorld();

    // a luz vem sempre de trás e de um lado da câmera, como numa maquete
    const sunAz = this.azimuth + 0.75;
    this.sun.position
      .set(Math.sin(sunAz) * 0.75, 1.25, Math.cos(sunAz) * 0.75)
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
      } else {
        this.hover = this.pick(e.clientX, e.clientY);
        el.style.cursor = this.hover.entry ? 'pointer' : 'default';
        this.hud.setTooltip(e.clientX, e.clientY, this.hover.entry ? t(this.hover.entry.def.name) : null);
      }
      p.x = e.clientX;
      p.y = e.clientY;
    });
    el.addEventListener('pointerup', (e) => {
      const wasDrag = this.pointer.dragged;
      this.pointer.down = false;
      if (!wasDrag) this.click(e.clientX, e.clientY);
    });
    el.addEventListener('pointerleave', () => {
      this.hover = {};
      this.hud.setTooltip(0, 0, null);
    });
    el.addEventListener(
      'wheel',
      (e) => {
        e.preventDefault();
        this.viewHeight = THREE.MathUtils.clamp(this.viewHeight * (e.deltaY > 0 ? 1.1 : 0.9), 5, 26);
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
        case 'Escape':
          this.hud.closeMenu();
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

  private pick(clientX: number, clientY: number): { entry?: ObjectEntry; tile?: { x: number; y: number } } {
    const rect = this.renderer.domElement.getBoundingClientRect();
    const ndc = new THREE.Vector2(((clientX - rect.left) / rect.width) * 2 - 1, -((clientY - rect.top) / rect.height) * 2 + 1);
    this.raycaster.setFromCamera(ndc, this.camera);
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

  private click(clientX: number, clientY: number): void {
    if (this.hud.isMenuOpen()) {
      this.hud.closeMenu();
      return;
    }
    const hit = this.pick(clientX, clientY);
    const folk = this.ctrl.folk;
    if (hit.entry) {
      this.hud.setTooltip(0, 0, null);
      this.hud.openMenu(clientX, clientY, hit.entry.obj);
    } else if (hit.tile) {
      if (this.ctrl.command({ type: 'queueGoto', folkId: folk.id, ...hit.tile })) {
        this.addPing(hit.tile.x, hit.tile.y);
      } else {
        this.ctrl.toast(folk.collapsed > 0 ? t('toast.collapsed', { name: folk.name }) : t('toast.queueFull'));
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

    for (const folk of world.folks) this.updateFolk(folk, alpha, dt);
    this.updateMarkers(dt);

    this.renderer.render(this.scene, this.camera);

    this.hudClock += dt;
    if (this.hudClock > 0.09) {
      this.hudClock = 0;
      this.hud.update();
    }
  }

  private applyDaylight(night: number): void {
    this.sun.intensity = THREE.MathUtils.lerp(2.5, 0.45, night);
    this.sun.color.setHex(PAL.sun).lerp(new THREE.Color(PAL.moon), night);
    this.hemi.intensity = THREE.MathUtils.lerp(1.5, 0.7, night);
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
    const sim = this.ctrl.sim;
    const action = folk.queue[0];
    const it: InteractionDef | undefined = action?.phase === 'using' ? sim.interactionOf(action) : undefined;
    const entry = it && action?.objectId !== undefined ? this.objects.get(action.objectId) : undefined;

    const fx = folk.px + (folk.x - folk.px) * alpha + 0.5;
    const fz = folk.py + (folk.y - folk.py) * alpha + 0.5;
    let place = { x: fx, y: 0, z: fz, heading: Math.atan2(folk.facing.x, folk.facing.y) };
    let anim: FolkAnim = 'idle';
    let onObject = false;

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
        else if (anim === 'sit' && entry.spec.sit) {
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
    }

    const mood = moodOf(sim.catalog, folk.needs);
    view.model.update({ anim, ...place, mood, time: this.animTime, dt });

    const selected = folk.id === this.ctrl.selectedFolkId;
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

  private updateMarkers(dt: number): void {
    const { entry, tile } = this.hover;
    this.hoverTile.visible = !!tile;
    if (tile) this.hoverTile.position.set(tile.x + 0.5, 0.035, tile.y + 0.5);
    this.hoverPad.visible = !!entry;
    if (entry) {
      this.hoverPad.position.set(entry.center.x, 0.03, entry.center.z);
      this.hoverPad.scale.set(entry.def.size.w + 0.14, entry.def.size.h + 0.14, 1);
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
