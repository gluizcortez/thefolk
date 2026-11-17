import type { GameController } from '../game/controller';
import { t } from '../i18n';
import { NEED_IDS, clockOf, formatClock, moodOf } from '../sim';
import type { Action, NeedId, Speed, WorldObject } from '../sim';
import { iconSvg } from './icons';

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className?: string,
  text?: string,
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

const SEGMENTS = 10;

interface NeedRow {
  segs: HTMLElement[];
  row: HTMLElement;
}

/** HUD em HTML por cima do canvas. Só lê o estado e manda comandos. */
export class Hud {
  private clockDay = el('span', 'clock-day');
  private clockTime = el('span', 'clock-time');
  private clockSky = el('span', 'clock-sky');
  private speedButtons: HTMLButtonElement[] = [];
  private needRows = new Map<NeedId, NeedRow>();
  private nameEl = el('div', 'folk-name');
  private traitsEl = el('div', 'folk-traits');
  private moodWord = el('span', 'mood-word');
  private moodFill = el('div', 'mood-fill');
  private moodMouth: SVGPathElement | null = null;
  private autonomyInput = el('input');
  private queueEl = el('div', 'queue-list');
  private queueSig = '';
  private toastsEl = el('div', 'toasts');
  private menuEl = el('div', 'menu card');
  private bubbleEl = el('div', 'bubble');
  private bubbleIcon: string | null = null;
  private menuOpen = false;
  private lastPausedSpeed: Speed = 1;

  constructor(
    private readonly root: HTMLElement,
    private readonly ctrl: GameController,
  ) {
    this.buildClock();
    this.buildSystem();
    this.buildFolkCard();
    this.buildNeeds();
    this.buildQueue();
    this.root.append(this.toastsEl, this.menuEl, this.bubbleEl, el('div', 'help', t('hud.help')));
    this.menuEl.hidden = true;
    this.bubbleEl.hidden = true;
    ctrl.onToast((text) => this.showToast(text));
    this.update();
  }

  // ---------- montagem ----------

  private buildClock(): void {
    const card = el('div', 'card clock');
    const info = el('div', 'clock-info');
    info.append(this.clockSky, this.clockDay, this.clockTime);
    const speeds = el('div', 'speeds');
    const defs: [Speed, string, string][] = [
      [0, '❙❙', 'hud.pause'],
      [1, '▸', 'hud.speed1'],
      [2, '▸▸', 'hud.speed2'],
      [3, '▸▸▸', 'hud.speed3'],
    ];
    for (const [speed, glyph, tip] of defs) {
      const b = el('button', 'speed', glyph);
      b.title = t(tip);
      b.setAttribute('aria-label', t(tip));
      b.addEventListener('click', () => this.setSpeed(speed));
      this.speedButtons.push(b);
      speeds.append(b);
    }
    card.append(info, speeds);
    this.root.append(card);
  }

  private setSpeed(speed: Speed): void {
    const cur = this.ctrl.world.speed;
    if (speed === 0 && cur === 0) {
      this.ctrl.command({ type: 'setSpeed', speed: this.lastPausedSpeed });
    } else {
      if (speed === 0) this.lastPausedSpeed = cur;
      this.ctrl.command({ type: 'setSpeed', speed });
    }
    this.update();
  }

  private buildSystem(): void {
    const bar = el('div', 'system');
    const save = el('button', 'btn', t('hud.save'));
    save.addEventListener('click', () => void this.ctrl.save());
    const load = el('button', 'btn', t('hud.load'));
    load.addEventListener('click', () => void this.ctrl.load());
    const fresh = el('button', 'btn btn-quiet', t('hud.new'));
    let armed = 0;
    fresh.addEventListener('click', () => {
      if (armed) {
        window.clearTimeout(armed);
        armed = 0;
        fresh.textContent = t('hud.new');
        fresh.classList.remove('armed');
        this.ctrl.newGame();
        return;
      }
      fresh.textContent = t('hud.newConfirm');
      fresh.classList.add('armed');
      armed = window.setTimeout(() => {
        armed = 0;
        fresh.textContent = t('hud.new');
        fresh.classList.remove('armed');
      }, 3500);
    });
    const walls = el('button', 'btn', t(`hud.walls.${this.ctrl.wallMode}`));
    walls.title = t('hud.wallsTip');
    walls.addEventListener('click', () => {
      walls.textContent = t(`hud.walls.${this.ctrl.cycleWallMode()}`);
    });
    bar.append(walls, save, load, fresh);
    this.root.append(bar);
  }

  private buildFolkCard(): void {
    const card = el('div', 'card folk');
    const face = el('div', 'folk-face');
    face.innerHTML =
      '<svg viewBox="0 0 24 24" width="44" height="44" aria-hidden="true">' +
      '<circle cx="12" cy="12" r="10.500" fill="currentColor"/>' +
      '<circle cx="8.500" cy="10" r="1.300" fill="#2a2320"/><circle cx="15.500" cy="10" r="1.300" fill="#2a2320"/>' +
      '<path class="mouth" d="M8 15 Q12 18 16 15" fill="none" stroke="#2a2320" stroke-width="1.600" stroke-linecap="round"/></svg>';
    this.moodMouth = face.querySelector('.mouth');
    const body = el('div', 'folk-body');
    const mood = el('div', 'mood');
    const moodLabel = el('span', 'mood-label', `${t('mood.label')}: `);
    const moodTrack = el('div', 'mood-track');
    moodTrack.append(this.moodFill);
    const moodLine = el('div', 'mood-line');
    moodLine.append(moodLabel, this.moodWord);
    mood.append(moodLine, moodTrack);
    const auto = el('label', 'autonomy');
    this.autonomyInput.type = 'checkbox';
    this.autonomyInput.addEventListener('change', () => {
      this.ctrl.command({
        type: 'setAutonomy',
        folkId: this.ctrl.folk.id,
        on: this.autonomyInput.checked,
      });
      this.queueSig = '';
    });
    auto.append(this.autonomyInput, el('span', 'switch'), el('span', '', t('hud.autonomy')));
    body.append(this.nameEl, this.traitsEl, mood, auto);
    card.append(face, body);
    this.root.append(card);
  }

  private buildNeeds(): void {
    const card = el('div', 'card needs');
    for (const id of NEED_IDS) {
      const row = el('div', 'need');
      const icon = el('span', 'need-icon');
      icon.innerHTML = iconSvg(id, 16);
      const label = el('span', 'need-label', t(`need.${id}`));
      const meter = el('div', 'meter');
      const segs: HTMLElement[] = [];
      for (let i = 0; i < SEGMENTS; i++) {
        const s = el('span', 'seg');
        segs.push(s);
        meter.append(s);
      }
      row.append(icon, label, meter);
      card.append(row);
      this.needRows.set(id, { segs, row });
    }
    this.root.append(card);
  }

  private buildQueue(): void {
    const wrap = el('div', 'queue');
    wrap.append(el('div', 'queue-title', t('queue.title')), this.queueEl);
    this.root.append(wrap);
  }

  // ---------- atualização ----------

  update(): void {
    const world = this.ctrl.world;
    const folk = this.ctrl.folk;
    const clock = clockOf(world.tick);

    this.clockDay.textContent = t('hud.day', { day: clock.day });
    this.clockTime.textContent =
      world.speed === 0 ? `${formatClock(world.tick)} · ${t('hud.paused')}` : formatClock(world.tick);
    const night = clock.hour < 6 || clock.hour >= 19;
    this.clockSky.classList.toggle('night', night);
    this.speedButtons.forEach((b, i) => b.classList.toggle('on', i === world.speed));

    this.nameEl.textContent = folk.name;
    const traitText = folk.traits.map((id) => t(`trait.${id}`)).join(' · ');
    if (this.traitsEl.textContent !== traitText) this.traitsEl.textContent = traitText;
    this.autonomyInput.checked = folk.autonomy;

    const mood = moodOf(this.ctrl.sim.catalog, folk.needs);
    const level = mood >= 80 ? 5 : mood >= 62 ? 4 : mood >= 45 ? 3 : mood >= 28 ? 2 : 1;
    this.moodWord.textContent = t(`mood.${level}`);
    this.moodFill.style.width = `${Math.round(mood)}%`;
    this.moodFill.dataset.level = String(level);
    this.moodMouth?.setAttribute('d', `M8 15 Q12 ${(11 + (mood / 100) * 8).toFixed(1)} 16 15`);

    for (const id of NEED_IDS) {
      const row = this.needRows.get(id);
      if (!row) continue;
      const v = folk.needs[id];
      const tone = v < 25 ? 'low' : v < 55 ? 'mid' : 'high';
      if (row.row.dataset.tone !== tone) row.row.dataset.tone = tone;
      row.row.title = `${t(`need.${id}`)}: ${Math.round(v)}`;
      row.segs.forEach((s, i) => s.classList.toggle('on', v >= (i + 0.5) * (100 / SEGMENTS)));
    }

    this.renderQueue();
  }

  private actionLabel(action: Action): string {
    if (action.kind === 'goto') return t('act.goto');
    const obj = action.objectId !== undefined ? this.ctrl.sim.findObject(action.objectId) : undefined;
    const def = obj && this.ctrl.sim.defOf(obj);
    const it = this.ctrl.sim.interactionOf(action);
    if (!def || !it) return '…';
    return `${t(def.name)}: ${t(it.label)}`;
  }

  private renderQueue(): void {
    const folk = this.ctrl.folk;
    const sig =
      `${folk.collapsed > 0}|${folk.autonomy}|` +
      folk.queue.map((a) => `${a.id}:${a.phase}`).join(',');
    if (sig === this.queueSig) return;
    this.queueSig = sig;
    this.queueEl.replaceChildren();

    if (folk.collapsed > 0) {
      this.queueEl.append(el('div', 'queue-empty', t('queue.collapsed')));
      return;
    }
    if (folk.queue.length === 0) {
      const key = folk.autonomy ? 'queue.empty' : 'queue.emptyManual';
      this.queueEl.append(el('div', 'queue-empty', t(key, { name: folk.name.split(' ')[0] })));
      return;
    }
    folk.queue.forEach((action, index) => {
      const pill = el('div', 'pill');
      if (index === 0) pill.classList.add('current');
      if (action.source === 'auto') pill.classList.add('auto');
      const text = el('div', 'pill-text');
      text.append(el('span', 'pill-label', this.actionLabel(action)));
      const notes: string[] = [];
      if (action.source === 'auto') notes.push(t('queue.auto'));
      if (action.phase === 'walking') notes.push(t('queue.walking'));
      if (notes.length) text.append(el('span', 'pill-note', notes.join(' · ')));
      const cancel = el('button', 'pill-cancel', '✕');
      cancel.title = t('queue.cancel');
      cancel.setAttribute('aria-label', t('queue.cancel'));
      cancel.addEventListener('click', () => {
        this.ctrl.command({ type: 'cancel', folkId: folk.id, actionId: action.id });
        this.update();
      });
      pill.append(text, cancel);
      this.queueEl.append(pill);
    });
  }

  // ---------- menu de interações ----------

  isMenuOpen(): boolean {
    return this.menuOpen;
  }

  closeMenu(): void {
    this.menuOpen = false;
    this.menuEl.hidden = true;
  }

  openMenu(x: number, y: number, obj: WorldObject): void {
    const def = this.ctrl.sim.defOf(obj);
    if (!def) return;
    const folk = this.ctrl.folk;
    this.menuEl.replaceChildren(el('div', 'menu-title', t(def.name)));
    if (def.interactions.length === 0) {
      this.menuEl.append(el('div', 'menu-note', t('menu.nothing')));
    }
    for (const it of def.interactions) {
      const b = el('button', 'menu-item');
      const main = Object.entries(it.effects).sort((a, c) => (c[1] ?? 0) - (a[1] ?? 0))[0];
      const icon = el('span', 'menu-icon');
      if (main) icon.innerHTML = iconSvg(main[0] as NeedId, 16);
      b.append(icon, el('span', '', t(it.label)));
      b.addEventListener('click', () => {
        const ok = this.ctrl.command({
          type: 'queueUse',
          folkId: folk.id,
          objectId: obj.id,
          interactionId: it.id,
        });
        if (!ok) {
          this.ctrl.toast(
            folk.collapsed > 0 ? t('toast.collapsed', { name: folk.name }) : t('toast.queueFull'),
          );
        }
        this.closeMenu();
        this.update();
      });
      this.menuEl.append(b);
    }
    this.menuEl.hidden = false;
    this.menuOpen = true;
    const rect = this.menuEl.getBoundingClientRect();
    const left = Math.min(Math.max(8, x + 14), window.innerWidth - rect.width - 8);
    const top = Math.min(Math.max(8, y - 20), window.innerHeight - rect.height - 8);
    this.menuEl.style.left = `${left}px`;
    this.menuEl.style.top = `${top}px`;
  }

  // ---------- balão e avisos ----------

  setBubble(x: number, y: number, icon: NeedId | 'sleep' | null): void {
    if (!icon || x < -500) {
      if (!this.bubbleEl.hidden) this.bubbleEl.hidden = true;
      this.bubbleIcon = null;
      return;
    }
    if (this.bubbleIcon !== icon) {
      this.bubbleIcon = icon;
      this.bubbleEl.innerHTML = iconSvg(icon, 16);
      this.bubbleEl.dataset.icon = icon;
    }
    this.bubbleEl.hidden = false;
    this.bubbleEl.style.transform = `translate(${Math.round(x)}px, ${Math.round(y)}px) translate(-50%, -100%)`;
  }

  private showToast(text: string): void {
    const toast = el('div', 'toast', text);
    this.toastsEl.append(toast);
    while (this.toastsEl.children.length > 4) this.toastsEl.firstElementChild?.remove();
    window.setTimeout(() => toast.classList.add('out'), 3600);
    window.setTimeout(() => toast.remove(), 4100);
  }
}
