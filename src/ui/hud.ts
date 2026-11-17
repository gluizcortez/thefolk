import type { GameController } from '../game/controller';
import { t } from '../i18n';
import {
  MAX_SKILL_LEVEL,
  NEED_IDS,
  PROMOTE_AT,
  billAmount,
  careerOf,
  clockOf,
  formatClock,
  formatMoney,
  levelOf,
  levelProgress,
  missingSkills,
  moodOf,
  nextShift,
  sellValue,
  skillLevel,
} from '../sim';
import type { Action, CareerDef, CareerLevel, NeedId, ObjectCategory, ObjectDef, Speed, WorldObject } from '../sim';
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

const CATEGORIES: (ObjectCategory | 'all')[] = [
  'all',
  'seating',
  'beds',
  'surfaces',
  'appliances',
  'plumbing',
  'electronics',
  'lighting',
  'decor',
  'hobbies',
];

type Panel = 'skills' | 'job' | null;

/** "Seg a Sex", "Qua a Dom" ou a lista, quando os dias não são seguidos. */
function daysText(days: number[]): string {
  const sorted = [...days].sort((a, b) => a - b);
  const run = sorted.every((d, i) => i === 0 || d === sorted[i - 1] + 1);
  if (run && sorted.length > 2) return `${t(`weekday.${sorted[0]}`)} a ${t(`weekday.${sorted[sorted.length - 1]}`)}`;
  return sorted.map((d) => t(`weekday.${d}`)).join(', ');
}

function hourText(h: number): string {
  return `${String(h % 24).padStart(2, '0')}:00`;
}

function scheduleText(level: CareerLevel): string {
  return t('job.schedule', {
    days: daysText(level.days),
    start: hourText(level.startHour),
    end: hourText(level.startHour + level.hours),
  });
}

function whenText(tick: number): string {
  const c = clockOf(tick);
  return `${t(`weekday.${(c.day - 1) % 7}`)} ${formatClock(tick)}`;
}

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
  private tooltipEl = el('div', 'tooltip');
  private bubbleIcon: string | null = null;
  private menuOpen = false;
  private lastPausedSpeed: Speed = 1;
  private fundsEl = el('button', 'funds');
  private buyButton = el('button', 'btn btn-buy');
  private panelEl = el('div', 'card panel');
  private panel: Panel = null;
  private panelSig = '';
  private panelButtons = new Map<Exclude<Panel, null>, HTMLButtonElement>();
  private catalogEl = el('div', 'card catalog');
  private catalogTabs = el('div', 'catalog-tabs');
  private catalogItems = el('div', 'catalog-items');
  private catalogHint = el('div', 'catalog-hint');
  private category: ObjectCategory | 'all' = 'all';
  private catalogSig = '';
  private thumbnail: ((art: string) => string) | null = null;

  constructor(
    private readonly root: HTMLElement,
    private readonly ctrl: GameController,
  ) {
    this.buildClock();
    this.buildSystem();
    this.buildViewBar();
    this.buildFolkCard();
    this.buildNeeds();
    this.buildQueue();
    this.buildPanel();
    this.buildCatalog();
    this.root.append(this.toastsEl, this.menuEl, this.bubbleEl, this.tooltipEl);
    this.tooltipEl.hidden = true;
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
    this.fundsEl.title = t('hud.funds');
    this.fundsEl.addEventListener('click', () => this.togglePanel('job'));
    card.append(info, this.fundsEl, speeds);
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
    bar.append(save, load, fresh);
    this.root.append(bar);
  }

  /** Controles de câmera e de paredes, no canto superior esquerdo. */
  private buildViewBar(): void {
    const bar = el('div', 'viewbar');
    const turn = (glyph: string, tip: string, dir: number) => {
      const b = el('button', 'btn btn-icon', glyph);
      b.title = t(tip);
      b.setAttribute('aria-label', t(tip));
      b.addEventListener('click', () => this.ctrl.rotateCamera(dir));
      return b;
    };
    const walls = el('button', 'btn', t(`hud.walls.${this.ctrl.wallMode}`));
    walls.title = t('hud.wallsTip');
    walls.addEventListener('click', () => {
      walls.textContent = t(`hud.walls.${this.ctrl.cycleWallMode()}`);
    });
    this.buyButton.title = t('hud.buyTip');
    this.buyButton.addEventListener('click', () => this.toggleBuyMode());
    bar.append(turn('⟲', 'hud.turnLeft', -1), turn('⟳', 'hud.turnRight', 1), walls, this.buyButton);
    this.root.append(bar, el('div', 'help', t('hud.help')));
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
    const tabs = el('div', 'folk-tabs');
    for (const id of ['skills', 'job'] as const) {
      const b = el('button', 'btn btn-small', t(`hud.${id}`));
      b.addEventListener('click', () => this.togglePanel(id));
      this.panelButtons.set(id, b);
      tabs.append(b);
    }
    body.append(this.nameEl, this.traitsEl, mood, auto, tabs);
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

    this.clockDay.textContent = t('hud.day', { day: clock.day, weekday: t(`weekday.${(clock.day - 1) % 7}`) });
    const house = world.household;
    const funds = formatMoney(house.funds);
    if (this.fundsEl.textContent !== funds) this.fundsEl.textContent = funds;
    this.fundsEl.classList.toggle('debt', house.funds < 0);
    this.fundsEl.title = `${t('hud.funds')}. ${t('hud.billsNext', {
      when: whenText(house.nextBills),
      amount: formatMoney(billAmount(world, this.ctrl.sim.catalog)),
    })}`;
    const buyLabel = this.ctrl.mode === 'buy' ? t('hud.live') : t('hud.buy');
    if (this.buyButton.textContent !== buyLabel) this.buyButton.textContent = buyLabel;
    this.buyButton.classList.toggle('on', this.ctrl.mode === 'buy');
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
    this.renderPanel();
    this.renderCatalog();
  }

  private actionLabel(action: Action): string {
    if (action.kind === 'goto') return t('act.goto');
    if (action.kind === 'work') return t('act.work');
    const obj = action.objectId !== undefined ? this.ctrl.sim.findObject(action.objectId) : undefined;
    const def = obj && this.ctrl.sim.defOf(obj);
    const it = this.ctrl.sim.interactionOf(action);
    if (!def || !it) return '…';
    return `${t(def.name)}: ${t(it.label)}`;
  }

  private renderQueue(): void {
    const folk = this.ctrl.folk;
    const sig =
      `${this.ctrl.mode}|${folk.away?.until ?? ''}|${folk.collapsed > 0}|${folk.autonomy}|` +
      folk.queue.map((a) => `${a.id}:${a.phase}`).join(',');
    if (sig === this.queueSig) return;
    this.queueSig = sig;
    this.queueEl.replaceChildren();

    if (this.ctrl.mode === 'buy') {
      this.queueEl.parentElement!.hidden = true;
      return;
    }
    this.queueEl.parentElement!.hidden = false;
    if (folk.away) {
      this.queueEl.append(el('div', 'queue-empty', t('queue.away', { time: formatClock(folk.away.until) })));
      return;
    }
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
      const extras: string[] = [];
      if (it.cost) extras.push(formatMoney(it.cost));
      if (it.skill) extras.push(t(`skill.${it.skill.id}`));
      if (extras.length) b.append(el('span', 'menu-extra', extras.join(' · ')));
      b.addEventListener('click', () => {
        this.ctrl.commandOrExplain({
          type: 'queueUse',
          folkId: folk.id,
          objectId: obj.id,
          interactionId: it.id,
        });
        this.closeMenu();
        this.update();
      });
      this.menuEl.append(b);
    }
    this.showMenuAt(x, y);
  }

  private showMenuAt(x: number, y: number): void {
    this.menuEl.hidden = false;
    this.menuOpen = true;
    const rect = this.menuEl.getBoundingClientRect();
    const left = Math.min(Math.max(8, x + 14), window.innerWidth - rect.width - 8);
    const top = Math.min(Math.max(8, y - 20), window.innerHeight - rect.height - 8);
    this.menuEl.style.left = `${left}px`;
    this.menuEl.style.top = `${top}px`;
  }


  // ---------- painéis de habilidades e trabalho ----------

  private buildPanel(): void {
    this.panelEl.hidden = true;
    this.root.append(this.panelEl);
  }

  togglePanel(panel: Exclude<Panel, null>): void {
    this.panel = this.panel === panel ? null : panel;
    this.panelSig = '';
    this.renderPanel();
  }

  private renderPanel(): void {
    for (const [id, b] of this.panelButtons) b.classList.toggle('on', this.panel === id);
    if (!this.panel) {
      this.panelEl.hidden = true;
      return;
    }
    const folk = this.ctrl.folk;
    const world = this.ctrl.world;
    const sig =
      this.panel === 'skills'
        ? `s|${folk.id}|${Object.entries(folk.skills)
            .map(([k, v]) => `${k}:${Math.floor(v)}`)
            .join(',')}`
        : `j|${folk.id}|${JSON.stringify(folk.job)}|${folk.away?.until ?? ''}|${Math.floor(world.tick / 60)}`;
    if (sig === this.panelSig) return;
    this.panelSig = sig;
    this.panelEl.hidden = false;
    this.panelEl.replaceChildren();
    const head = el('div', 'panel-head');
    const close = el('button', 'pill-cancel', '✕');
    close.title = t('hud.close');
    close.setAttribute('aria-label', t('hud.close'));
    close.addEventListener('click', () => {
      this.panel = null;
      this.renderPanel();
    });
    head.append(el('div', 'panel-title', t(`hud.${this.panel}`)), close);
    this.panelEl.append(head);
    if (this.panel === 'skills') this.renderSkills();
    else this.renderJob();
  }

  private renderSkills(): void {
    const folk = this.ctrl.folk;
    const list = el('div', 'skill-list');
    for (const skill of Object.values(this.ctrl.sim.catalog.skills)) {
      const xp = folk.skills[skill.id] ?? 0;
      const level = levelOf(xp);
      const row = el('div', 'skill');
      const top = el('div', 'skill-top');
      top.append(el('span', 'skill-name', t(skill.name)), el('span', 'skill-level', t('skills.level', { level })));
      const pips = el('div', 'pips');
      for (let i = 0; i < MAX_SKILL_LEVEL; i++) pips.append(el('span', i < level ? 'pip on' : 'pip'));
      const bar = el('div', 'skill-bar');
      const fill = el('div', 'skill-fill');
      fill.style.width = `${Math.round(levelProgress(xp) * 100)}%`;
      bar.append(fill);
      row.append(top, pips, bar);
      list.append(row);
    }
    this.panelEl.append(list, el('div', 'panel-note', t('skills.hint')), el('div', 'panel-note', t('skills.mood')));
  }

  private renderJob(): void {
    const folk = this.ctrl.folk;
    const catalog = this.ctrl.sim.catalog;
    const job = folk.job;
    const career = job && careerOf(catalog, job);
    const level = career?.levels[job!.level];
    if (job && career && level) {
      const box = el('div', 'job-box');
      box.append(
        el('div', 'job-title', t(level.title)),
        el('div', 'job-career', `${t(career.name)} · ${t('job.payShift', { pay: formatMoney(level.pay) })}`),
        el('div', 'job-line', scheduleText(level)),
      );
      // desempenho de -100 a 100, com a marca da promoção
      const perf = el('div', 'perf');
      const track = el('div', 'perf-track');
      const fill = el('div', 'perf-fill');
      const p = job.performance;
      fill.style.left = p >= 0 ? '50%' : `${50 + p / 2}%`;
      fill.style.width = `${Math.abs(p) / 2}%`;
      fill.classList.toggle('neg', p < 0);
      const mark = el('div', 'perf-mark');
      mark.style.left = `${50 + PROMOTE_AT / 2}%`;
      track.append(fill, mark);
      perf.append(el('span', 'perf-label', t('job.performance')), track);
      box.append(perf);

      const status = folk.away
        ? t('job.atWork', { time: formatClock(folk.away.until) })
        : (() => {
            const shift = nextShift(catalog, folk, this.ctrl.world.tick);
            return shift ? t('job.nextShift', { when: whenText(shift.start) }) : '';
          })();
      if (status) box.append(el('div', 'job-line strong', status));

      const next = career.levels[job.level + 1];
      if (next) {
        box.append(el('div', 'job-line', t('job.next', { title: t(next.title), pay: formatMoney(next.pay) })));
        const missing = missingSkills(folk, next);
        const req = el('div', 'job-reqs');
        for (const [id, need] of Object.entries(next.requires)) {
          const have = skillLevel(folk, id);
          const chip = el('span', `req ${id in missing ? 'miss' : 'ok'}`, `${t(`skill.${id}`)} ${have}/${need}`);
          req.append(chip);
        }
        if (Object.keys(next.requires).length) box.append(req);
        if (Object.keys(missing).length === 0) box.append(el('div', 'panel-note', t('job.ready')));
      } else {
        box.append(el('div', 'job-line', t('job.top')));
      }
      box.append(el('div', 'panel-note', t('job.howTo')));
      const quit = el('button', 'btn btn-quiet btn-small', t('job.quit'));
      let armed = 0;
      quit.addEventListener('click', () => {
        if (!armed) {
          quit.textContent = t('job.quitConfirm');
          quit.classList.add('armed');
          armed = window.setTimeout(() => {
            armed = 0;
            quit.textContent = t('job.quit');
            quit.classList.remove('armed');
          }, 3500);
          return;
        }
        window.clearTimeout(armed);
        this.ctrl.commandOrExplain({ type: 'quitJob', folkId: folk.id });
        this.panelSig = '';
        this.update();
      });
      box.append(quit);
      this.panelEl.append(box);
    } else {
      this.panelEl.append(el('div', 'panel-note', t('job.none', { name: folk.name.split(' ')[0] })));
    }

    this.panelEl.append(el('div', 'panel-sub', t('job.classifieds')));
    const ads = el('div', 'ads');
    for (const c of Object.values(catalog.careers)) {
      if (c.id === job?.careerId) continue;
      ads.append(this.adFor(c, !!job));
    }
    this.panelEl.append(ads);
  }

  private adFor(career: CareerDef, employed: boolean): HTMLElement {
    const first = career.levels[0];
    const ad = el('div', 'ad');
    const text = el('div', 'ad-text');
    text.append(
      el('div', 'ad-title', `${t(first.title)} · ${t(career.name)}`),
      el('div', 'ad-line', `${t('job.payShift', { pay: formatMoney(first.pay) })} · ${scheduleText(first)}`),
      el('div', 'ad-line', t('job.skillsUsed', { skills: career.skills.map((s) => t(`skill.${s}`)).join(', ') })),
    );
    const take = el('button', 'btn btn-small', t(employed ? 'job.switch' : 'job.take'));
    take.addEventListener('click', () => {
      this.ctrl.commandOrExplain({ type: 'takeJob', folkId: this.ctrl.folk.id, careerId: career.id });
      this.panelSig = '';
      this.update();
    });
    ad.append(text, take);
    return ad;
  }

  // ---------- modo compra ----------

  setThumbnailer(fn: (art: string) => string): void {
    this.thumbnail = fn;
  }

  toggleBuyMode(): void {
    this.closeMenu();
    this.ctrl.setMode(this.ctrl.mode === 'buy' ? 'live' : 'buy');
    this.catalogSig = '';
    this.queueSig = '';
    this.update();
  }

  private buildCatalog(): void {
    const head = el('div', 'catalog-head');
    head.append(el('div', 'panel-title', t('buy.title')), this.catalogTabs);
    for (const cat of CATEGORIES) {
      const b = el('button', 'tab', t(`cat.${cat}`));
      b.dataset.cat = cat;
      b.addEventListener('click', () => {
        this.category = cat;
        this.catalogSig = '';
        this.renderCatalog();
      });
      this.catalogTabs.append(b);
    }
    this.catalogEl.append(head, this.catalogItems, this.catalogHint);
    this.catalogEl.hidden = true;
    this.root.append(this.catalogEl);
  }

  private renderCatalog(): void {
    const buying = this.ctrl.mode === 'buy';
    this.catalogEl.hidden = !buying;
    if (!buying) return;
    const funds = this.ctrl.world.household.funds;
    const placing = this.ctrl.placing;
    const sig = `${this.category}|${funds}|${placing?.defId ?? ''}|${placing?.moveId ?? ''}`;
    if (sig === this.catalogSig) return;
    this.catalogSig = sig;
    for (const b of this.catalogTabs.children) {
      (b as HTMLElement).classList.toggle('on', (b as HTMLElement).dataset.cat === this.category);
    }
    this.catalogHint.textContent = placing ? t('buy.place') : '';
    this.catalogHint.hidden = !placing;
    this.catalogItems.replaceChildren();
    const defs = Object.values(this.ctrl.sim.catalog.objects)
      .filter((d) => d.buyable !== false && (this.category === 'all' || d.category === this.category))
      .sort((a, b) => a.price - b.price);
    for (const def of defs) this.catalogItems.append(this.catalogItem(def, funds));
  }

  private catalogItem(def: ObjectDef, funds: number): HTMLElement {
    const item = el('button', 'item');
    const affordable = funds >= def.price;
    item.classList.toggle('poor', !affordable);
    item.classList.toggle('on', this.ctrl.placing?.defId === def.id && this.ctrl.placing.moveId === undefined);
    const img = el('img', 'item-img');
    img.alt = '';
    img.width = 64;
    img.height = 64;
    if (this.thumbnail) img.src = this.thumbnail(def.art);
    const trains = [...new Set(def.interactions.filter((i) => i.skill).map((i) => t(`skill.${i.skill!.id}`)))];
    const needs = [...new Set(def.interactions.flatMap((i) => Object.entries(i.effects).filter(([, v]) => (v ?? 0) > 0.3).map(([k]) => t(`need.${k}`))))];
    const tip = [t(def.name), formatMoney(def.price)];
    if (needs.length) tip.push(needs.join(', '));
    if (trains.length) tip.push(t('buy.trains', { skill: trains.join(', ') }));
    if (def.ambience > 0) tip.push(`${t('need.ambience')} +${def.ambience}`);
    if (!affordable) tip.push(t('buy.cantAfford'));
    item.title = tip.join(' · ');
    item.append(img, el('span', 'item-name', t(def.name)), el('span', 'item-price', formatMoney(def.price)));
    item.addEventListener('click', () => {
      if (!affordable) {
        this.ctrl.toast(t('problem.funds'));
        return;
      }
      this.ctrl.startPlacing(def.id);
      this.renderCatalog();
    });
    return item;
  }

  /** Menu de um objeto no modo compra: mover, girar ou vender. */
  openBuyMenu(x: number, y: number, obj: WorldObject): void {
    const def = this.ctrl.sim.defOf(obj);
    if (!def) return;
    this.menuEl.replaceChildren(el('div', 'menu-title', t(def.name)));
    const add = (label: string, run: () => void) => {
      const b = el('button', 'menu-item');
      b.append(el('span', '', label));
      b.addEventListener('click', () => {
        run();
        this.closeMenu();
        this.update();
      });
      this.menuEl.append(b);
    };
    add(t('buy.move'), () => this.ctrl.startPlacing(obj.defId, obj.id));
    add(t('buy.rotate'), () => {
      this.ctrl.commandOrExplain({ type: 'move', objectId: obj.id, x: obj.x, y: obj.y, rot: ((obj.rot + 1) % 4) as WorldObject['rot'] });
    });
    const price = formatMoney(sellValue(obj, def));
    add(t('buy.sell', { price }), () => {
      if (this.ctrl.commandOrExplain({ type: 'sell', objectId: obj.id })) {
        this.ctrl.toast(t('buy.sold', { name: t(def.name), price }));
      }
    });
    this.showMenuAt(x, y);
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

  setTooltip(x: number, y: number, text: string | null): void {
    if (!text || this.menuOpen) {
      if (!this.tooltipEl.hidden) this.tooltipEl.hidden = true;
      return;
    }
    if (this.tooltipEl.textContent !== text) this.tooltipEl.textContent = text;
    this.tooltipEl.hidden = false;
    this.tooltipEl.style.transform = `translate(${Math.round(x + 14)}px, ${Math.round(y + 16)}px)`;
  }

  private showToast(text: string): void {
    const toast = el('div', 'toast', text);
    this.toastsEl.append(toast);
    while (this.toastsEl.children.length > 4) this.toastsEl.firstElementChild?.remove();
    window.setTimeout(() => toast.classList.add('out'), 3600);
    window.setTimeout(() => toast.remove(), 4100);
  }
}
