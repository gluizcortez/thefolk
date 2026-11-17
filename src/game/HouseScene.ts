import Phaser from 'phaser';
import { t } from '../i18n';
import { TICKS_PER_SECOND, clockOf, footprint, nearestFootprintTile } from '../sim';
import type { Folk, NeedId, Speed, WorldObject } from '../sim';
import { NEED_IDS } from '../sim';
import type { Hud } from '../ui/hud';
import { paintFolk } from './art/folk';
import type { FolkPose } from './art/folk';
import { painterFor, seatHeight } from './art/objects';
import { PAL } from './art/palette';
import { TILE_H, TILE_W, iso, quad, unIso } from './art/shapes';
import { paintDoorstep, paintFloor, wallPieces } from './art/terrain';
import type { GameController } from './controller';

const MAX_STEPS_PER_FRAME = 60;
const CLICK_SLOP = 6;

interface Ping {
  x: number;
  y: number;
  age: number;
}

/**
 * A cena só lê o estado da simulação e manda comandos pelo controller.
 * Nenhuma regra de jogo mora aqui.
 */
export class HouseScene extends Phaser.Scene {
  private builtVersion = -1;
  private staticArt: Phaser.GameObjects.Graphics[] = [];
  private hoverG!: Phaser.GameObjects.Graphics;
  private ringG!: Phaser.GameObjects.Graphics;
  private folkG!: Phaser.GameObjects.Graphics;
  private fxG!: Phaser.GameObjects.Graphics;
  private nightG!: Phaser.GameObjects.Graphics;
  private acc = 0;
  private animTime = 0;
  private hudClock = 0;
  private lastSpeed: Speed = 1;
  private pings: Ping[] = [];
  private hover: { obj?: WorldObject; tile?: { x: number; y: number } } = {};

  constructor(
    private readonly ctrl: GameController,
    private readonly hud: Hud,
  ) {
    super('house');
  }

  create(): void {
    this.hoverG = this.add.graphics().setDepth(-900);
    this.ringG = this.add.graphics().setDepth(-890);
    this.folkG = this.add.graphics();
    this.fxG = this.add.graphics();
    this.nightG = this.add.graphics().setDepth(1_000_000);

    const cam = this.cameras.main;
    cam.setBackgroundColor(PAL.bg);
    cam.setZoom(this.scale.width > 1100 ? 1.5 : this.scale.width > 700 ? 1.2 : 0.8);

    this.input.on('pointermove', (p: Phaser.Input.Pointer) => this.onMove(p));
    this.input.on('pointerup', (p: Phaser.Input.Pointer) => this.onUp(p));
    this.input.on('wheel', (_p: unknown, _o: unknown, _dx: number, dy: number) => {
      cam.setZoom(Phaser.Math.Clamp(cam.zoom * (dy > 0 ? 0.9 : 1.1), 0.5, 2.6));
    });
    this.input.on('gameout', () => {
      this.hover = {};
    });

    const kb = this.input.keyboard;
    kb?.on('keydown-SPACE', () => this.togglePause());
    kb?.on('keydown-ONE', () => this.ctrl.command({ type: 'setSpeed', speed: 1 }));
    kb?.on('keydown-TWO', () => this.ctrl.command({ type: 'setSpeed', speed: 2 }));
    kb?.on('keydown-THREE', () => this.ctrl.command({ type: 'setSpeed', speed: 3 }));
    kb?.on('keydown-ESC', () => this.hud.closeMenu());

    this.rebuild();
  }

  togglePause(): void {
    const speed = this.ctrl.world.speed;
    if (speed === 0) {
      this.ctrl.command({ type: 'setSpeed', speed: this.lastSpeed });
    } else {
      this.lastSpeed = speed;
      this.ctrl.command({ type: 'setSpeed', speed: 0 });
    }
  }

  // ---------- arte estática (chão, paredes, objetos) ----------

  private rebuild(): void {
    for (const g of this.staticArt) g.destroy();
    this.staticArt = [];
    const world = this.ctrl.world;
    const { grid } = world;

    const floor = this.add.graphics().setDepth(-1000);
    paintFloor(floor, grid);
    paintDoorstep(floor, grid);
    this.staticArt.push(floor);

    for (const piece of wallPieces(grid)) {
      const g = this.add.graphics().setDepth(piece.depth);
      piece.paint(g);
      this.staticArt.push(g);
    }

    for (const obj of world.objects) {
      const def = this.ctrl.sim.defOf(obj);
      if (!def) continue;
      const g = this.add.graphics().setDepth(this.objectDepth(obj));
      painterFor(def.art)(g, obj.x, obj.y);
      this.staticArt.push(g);
    }

    this.nightG.clear();
    const a = iso(0, grid.h);
    const b = iso(grid.w, 0);
    const c = iso(grid.w, grid.h);
    this.nightG.fillStyle(PAL.night, 1);
    this.nightG.fillRect(a.x - 3000, -3000, b.x - a.x + 6000, c.y + 6000);

    const center = iso(grid.w / 2, grid.h / 2 - 0.5);
    this.cameras.main.centerOn(center.x, center.y);
    this.builtVersion = this.ctrl.worldVersion;
    this.acc = 0;
    this.pings = [];
    this.hud.closeMenu();
  }

  private objectDepth(obj: WorldObject): number {
    const def = this.ctrl.sim.defOf(obj);
    const w = def?.size.w ?? 1;
    const h = def?.size.h ?? 1;
    return (obj.x + w - 1 + obj.y + h - 1) * 10 + 1;
  }

  // ---------- entrada ----------

  private objectAtTile(x: number, y: number): WorldObject | undefined {
    for (const obj of this.ctrl.world.objects) {
      const def = this.ctrl.sim.defOf(obj);
      if (def && footprint(obj, def).some((tl) => tl.x === x && tl.y === y)) return obj;
    }
    return undefined;
  }

  private pick(p: Phaser.Input.Pointer): { obj?: WorldObject; tile?: { x: number; y: number } } {
    const wp = this.cameras.main.getWorldPoint(p.x, p.y);
    const base = unIso(wp.x, wp.y);
    const tile = { x: Math.floor(base.x), y: Math.floor(base.y) };
    const direct = this.objectAtTile(tile.x, tile.y);
    if (direct) return { obj: direct };
    // objetos são altos: o ponteiro pode estar sobre o corpo de um objeto
    // cuja base fica um pouco mais abaixo na tela
    const lower = unIso(wp.x, wp.y + TILE_H / 2);
    const tall = this.objectAtTile(Math.floor(lower.x), Math.floor(lower.y));
    if (tall) return { obj: tall };
    return this.ctrl.sim.getNav().isFree(tile.x, tile.y) ? { tile } : {};
  }

  private onMove(p: Phaser.Input.Pointer): void {
    if (p.isDown && p.getDistance() > CLICK_SLOP) {
      const cam = this.cameras.main;
      cam.scrollX -= (p.x - p.prevPosition.x) / cam.zoom;
      cam.scrollY -= (p.y - p.prevPosition.y) / cam.zoom;
      this.hover = {};
      this.hud.closeMenu();
      return;
    }
    this.hover = this.pick(p);
    this.input.setDefaultCursor(this.hover.obj ? 'pointer' : 'default');
  }

  private onUp(p: Phaser.Input.Pointer): void {
    if (p.getDistance() > CLICK_SLOP) return;
    if (this.hud.isMenuOpen()) {
      this.hud.closeMenu();
      return;
    }
    const hit = this.pick(p);
    const folk = this.ctrl.folk;
    if (hit.obj) {
      this.hud.openMenu(p.x, p.y, hit.obj);
    } else if (hit.tile) {
      if (this.ctrl.command({ type: 'queueGoto', folkId: folk.id, ...hit.tile })) {
        this.pings.push({ ...hit.tile, age: 0 });
      } else {
        this.ctrl.toast(
          folk.collapsed > 0 ? t('toast.collapsed', { name: folk.name }) : t('toast.queueFull'),
        );
      }
    }
  }

  // ---------- quadro a quadro ----------

  update(_time: number, deltaMs: number): void {
    if (this.builtVersion !== this.ctrl.worldVersion) this.rebuild();
    const world = this.ctrl.world;
    const dt = Math.min(deltaMs, 250) / 1000;

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

    this.drawHover();
    this.drawPings(dt);
    for (const folk of world.folks) this.drawFolk(folk, alpha);
    this.nightG.setAlpha(nightAlpha(clockOf(world.tick).dayFraction + alpha / 1440));

    this.hudClock += deltaMs;
    if (this.hudClock > 90) {
      this.hudClock = 0;
      this.hud.update();
    }
  }

  private drawHover(): void {
    const g = this.hoverG;
    g.clear();
    const { obj, tile } = this.hover;
    if (obj) {
      const def = this.ctrl.sim.defOf(obj);
      if (!def) return;
      const pad = 0.04;
      const x1 = obj.x + def.size.w;
      const y1 = obj.y + def.size.h;
      quad(g, obj.x - pad, obj.y - pad, x1 + pad, y1 + pad, 0, PAL.mustard, 0.55);
      quad(g, obj.x + pad, obj.y + pad, x1 - pad, y1 - pad, 0, PAL.cream, 0.5);
    } else if (tile) {
      quad(g, tile.x + 0.1, tile.y + 0.1, tile.x + 0.9, tile.y + 0.9, 0, PAL.cream, 0.28);
    }
  }

  private drawPings(dt: number): void {
    for (const ping of this.pings) ping.age += dt;
    this.pings = this.pings.filter((p) => p.age < 0.6);
    for (const ping of this.pings) {
      const k = ping.age / 0.6;
      const c = iso(ping.x + 0.5, ping.y + 0.5);
      this.hoverG.lineStyle(2, PAL.mustard, 1 - k);
      this.hoverG.strokeEllipse(c.x, c.y, TILE_W * (0.3 + k * 0.5), TILE_H * (0.3 + k * 0.5));
    }
  }

  private drawFolk(folk: Folk, alpha: number): void {
    const sim = this.ctrl.sim;
    const action = folk.queue[0];
    const it = action?.phase === 'using' ? sim.interactionOf(action) : undefined;
    const obj = it && action?.objectId !== undefined ? sim.findObject(action.objectId) : undefined;
    const def = obj && sim.defOf(obj);

    const fx = folk.px + (folk.x - folk.px) * alpha;
    const fy = folk.py + (folk.y - folk.py) * alpha;
    const ground = iso(fx + 0.5, fy + 0.5);
    let pos = ground;
    let depth = (fx + fy) * 10 + 2;
    let pose: FolkPose = 'stand';
    let faceX = folk.facing.x - folk.facing.y;
    let faceY = folk.facing.x + folk.facing.y;
    let lieX: number | undefined;
    let lieY: number | undefined;

    if (folk.collapsed > 0) {
      pose = 'collapsed';
    } else if (it && obj && def) {
      pose = it.pose ?? 'stand';
      if (it.onObject) {
        depth = this.objectDepth(obj) + 0.5;
        const z = seatHeight(def.art);
        if (pose === 'lie') {
          pos = iso(obj.x + def.size.w / 2, obj.y + def.size.h / 2, z);
          const along = def.size.h >= def.size.w ? iso(0, 1) : iso(1, 0);
          const len = Math.hypot(along.x, along.y);
          lieX = along.x / len;
          lieY = along.y / len;
        } else {
          const seat = nearestFootprintTile(obj, def, folk);
          pos = iso(seat.x + 0.5, seat.y + 0.62, z);
          faceX = -1;
          faceY = 1;
        }
      }
    } else if (folk.px !== folk.x || folk.py !== folk.y) {
      pose = 'walk';
    }

    this.folkG.setPosition(pos.x, pos.y).setDepth(depth);
    paintFolk(this.folkG, folk.look, { pose, faceX, faceY, time: this.animTime, lieX, lieY });

    // anel de seleção: dois arcos girando no chão
    const selected = folk.id === this.ctrl.selectedFolkId;
    const ring = this.ringG;
    ring.clear();
    if (selected && !(it?.onObject)) {
      ring.setPosition(ground.x, ground.y).setScale(1, 0.5);
      const r = 19 + Math.sin(this.time.now / 300) * 1.5;
      const rot = this.time.now / 700;
      ring.lineStyle(3, PAL.mustard, 0.95);
      for (const off of [0, Math.PI]) {
        ring.beginPath();
        ring.arc(0, 0, r, rot + off, rot + off + Math.PI * 0.7);
        ring.strokePath();
      }
    }

    this.drawFx(folk, pose, pos, depth, it?.effects.hygiene !== undefined && pose === 'stand' && !!it?.onObject);

    // balão com o que o folk está fazendo (HTML, por cima do canvas)
    const cam = this.cameras.main;
    const headY = pose === 'lie' || pose === 'collapsed' ? pos.y - 26 : pos.y - 52;
    const sx = (pos.x - cam.worldView.x) * cam.zoom;
    const sy = (headY - cam.worldView.y) * cam.zoom;
    this.hud.setBubble(selected ? sx : -999, sy, bubbleIcon(folk, it?.effects));
  }

  private drawFx(
    folk: Folk,
    pose: FolkPose,
    pos: { x: number; y: number },
    depth: number,
    showering: boolean,
  ): void {
    const g = this.fxG;
    g.clear();
    g.setDepth(depth + 0.2);
    const tt = this.animTime;
    if (pose === 'lie' || folk.collapsed > 0) {
      // "z" subindo
      for (let i = 0; i < 3; i++) {
        const k = (tt * 0.5 + i / 3) % 1;
        const s = 3 + k * 4;
        const x = pos.x + 6 + k * 14 + Math.sin(k * 6) * 2;
        const y = pos.y - 24 - k * 26;
        g.lineStyle(2, PAL.cream, 1 - k);
        g.beginPath();
        g.moveTo(x - s, y - s);
        g.lineTo(x + s, y - s);
        g.lineTo(x - s, y + s);
        g.lineTo(x + s, y + s);
        g.strokePath();
      }
    } else if (showering) {
      g.lineStyle(1.5, PAL.sky, 0.9);
      for (let i = 0; i < 9; i++) {
        const k = (tt * 2.2 + i * 0.37) % 1;
        const x = pos.x - 12 + ((i * 7) % 24);
        const y = pos.y - 52 + k * 46;
        g.lineBetween(x, y, x - 1, y + 5);
      }
    }
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

/** 0 de dia, até ~0.42 no meio da noite. */
function nightAlpha(dayFraction: number): number {
  const h = (dayFraction % 1) * 24;
  const max = 0.42;
  if (h >= 7 && h < 17.5) return 0;
  if (h >= 17.5 && h < 21) return ((h - 17.5) / 3.5) * max;
  if (h >= 5 && h < 7) return (1 - (h - 5) / 2) * max;
  return max;
}
