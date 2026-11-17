// Bloco 7: os cartões do canto de cima: Jogos salvos (três vagas com nome e
// miniatura, exportar e importar arquivo) e Som (volumes e mudo).

import { cue } from '../audio/cues';
import type { AudioEngine } from '../audio/engine';
import { loadPrefs, savePrefs } from '../audio/prefs';
import type { AudioPrefs } from '../audio/prefs';
import type { GameController } from '../game/controller';
import { t } from '../i18n';
import { SLOT_IDS } from '../platform/slots';
import type { SlotMeta } from '../platform/slots';

function el<K extends keyof HTMLElementTagNameMap>(tag: K, cls?: string, text?: string): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
}

type Card = 'saves' | 'sound' | null;

export class SystemCards {
  readonly el = el('div', 'card syscard');
  private open: Card = null;
  private engine: AudioEngine | null = null;
  private prefs: AudioPrefs = loadPrefs();
  /** vaga esperando o segundo clique para apagar */
  private armed: string | null = null;
  private fileInput = el('input');
  onChange: (() => void) | null = null;

  constructor(private readonly ctrl: GameController) {
    this.el.hidden = true;
    this.fileInput.type = 'file';
    this.fileInput.accept = '.json,application/json';
    this.fileInput.hidden = true;
    this.fileInput.addEventListener('change', () => void this.importFile());
    this.el.append(this.fileInput);
    document.addEventListener('keydown', (e) => {
      if (e.target instanceof HTMLInputElement || document.querySelector('.creator:not([hidden])')) return;
      if (e.key === 'm' || e.key === 'M') this.toggleMute();
    });
  }

  setAudio(engine: AudioEngine): void {
    this.engine = engine;
    engine.setPrefs(this.prefs);
  }

  get muted(): boolean {
    return this.prefs.muted;
  }

  toggle(card: Exclude<Card, null>): void {
    this.open = this.open === card ? null : card;
    this.armed = null;
    cue(this.open ? 'open' : 'close');
    void this.render();
  }

  close(): void {
    if (!this.open) return;
    this.open = null;
    this.el.hidden = true;
  }

  isOpen(card: Exclude<Card, null>): boolean {
    return this.open === card;
  }

  toggleMute(): void {
    this.setPrefs({ ...this.prefs, muted: !this.prefs.muted });
    this.ctrl.toast(t(this.prefs.muted ? 'sound.mutedToast' : 'sound.unmutedToast'));
    if (this.open === 'sound') void this.render();
  }

  private setPrefs(p: AudioPrefs): void {
    this.prefs = p;
    savePrefs(p);
    this.engine?.setPrefs(p);
    this.onChange?.();
  }

  private head(title: string): HTMLElement {
    const head = el('div', 'panel-head');
    const close = el('button', 'pill-cancel', '✕');
    close.title = t('hud.close');
    close.setAttribute('aria-label', t('hud.close'));
    close.addEventListener('click', () => this.toggle(this.open ?? 'saves'));
    head.append(el('div', 'panel-title', title), close);
    return head;
  }

  async render(): Promise<void> {
    const keep = this.fileInput;
    if (!this.open) {
      this.el.hidden = true;
      return;
    }
    this.el.hidden = false;
    if (this.open === 'sound') {
      this.el.replaceChildren(keep, this.head(t('sound.title')), ...this.soundRows());
      return;
    }
    const slots = await this.ctrl.slots();
    if (this.open !== 'saves') return;
    this.el.replaceChildren(keep, this.head(t('slots.title')), ...SLOT_IDS.map((id, i) => this.slotRow(id, slots[i])), this.fileRow());
  }

  // ---------- som ----------

  private soundRows(): HTMLElement[] {
    const rows: HTMLElement[] = [];
    for (const key of ['master', 'music', 'sfx', 'voice'] as const) {
      const row = el('label', 'sound-row');
      const input = el('input');
      input.type = 'range';
      input.min = '0';
      input.max = '100';
      input.value = String(Math.round(this.prefs[key] * 100));
      const value = el('span', 'sound-value', `${input.value}%`);
      input.addEventListener('input', () => {
        value.textContent = `${input.value}%`;
        this.setPrefs({ ...this.prefs, [key]: Number(input.value) / 100 });
      });
      input.addEventListener('change', () => cue('click'));
      row.append(el('span', 'sound-label', t(`sound.${key}`)), input, value);
      rows.push(row);
    }
    const mute = el('button', `btn btn-small ${this.prefs.muted ? 'on' : ''}`, t(this.prefs.muted ? 'sound.unmute' : 'sound.mute'));
    mute.addEventListener('click', () => this.toggleMute());
    const foot = el('div', 'sound-foot');
    foot.append(mute, el('span', 'catalog-hint', t('sound.hint')));
    rows.push(foot);
    return rows;
  }

  // ---------- jogos salvos ----------

  private slotRow(id: (typeof SLOT_IDS)[number], meta: SlotMeta | null): HTMLElement {
    const row = el('div', `slot ${id === this.ctrl.slot ? 'current' : ''}`);
    const thumb = el('div', 'slot-thumb');
    if (meta?.thumb) {
      const img = el('img');
      img.src = meta.thumb;
      img.alt = '';
      thumb.append(img);
    } else thumb.textContent = meta ? '⌂' : '—';
    const info = el('div', 'slot-info');
    const n = SLOT_IDS.indexOf(id) + 1;
    if (meta) {
      const name = el('input', 'slot-name');
      name.value = meta.name;
      name.maxLength = 32;
      name.title = t('slots.renameTip');
      name.setAttribute('aria-label', t('slots.renameTip'));
      name.addEventListener('keydown', (e) => {
        e.stopPropagation();
        if (e.key === 'Enter') name.blur();
      });
      name.addEventListener('change', () => void this.ctrl.renameSlot(id, name.value).then(() => this.render()));
      const when = new Date(meta.savedAt);
      const date = `${String(when.getDate()).padStart(2, '0')}/${String(when.getMonth() + 1).padStart(2, '0')} ${String(when.getHours()).padStart(2, '0')}:${String(when.getMinutes()).padStart(2, '0')}`;
      info.append(
        name,
        el('div', 'slot-sub', t('slots.sub', { day: meta.day, funds: meta.funds, people: meta.people.length })),
        el('div', 'slot-sub', `${id === this.ctrl.slot ? `${t('slots.playing')} · ` : ''}${t('slots.savedAt', { date })}`),
      );
    } else {
      info.append(el('div', 'slot-empty', t('slots.empty', { n })));
    }
    const actions = el('div', 'slot-actions');
    const save = el('button', 'btn btn-small', t(meta ? 'slots.saveHere' : 'slots.saveNew'));
    save.addEventListener('click', () => void this.ctrl.save(false, id).then(() => this.render()));
    actions.append(save);
    if (meta) {
      const load = el('button', 'btn btn-small', t('slots.load'));
      load.disabled = id === this.ctrl.slot;
      load.addEventListener('click', () => void this.ctrl.loadSlot(id).then(() => this.render()));
      const del = el('button', `btn btn-small btn-quiet ${this.armed === id ? 'armed' : ''}`, t(this.armed === id ? 'slots.deleteSure' : 'slots.delete'));
      del.addEventListener('click', () => {
        if (this.armed !== id) {
          this.armed = id;
          void this.render();
          return;
        }
        this.armed = null;
        void this.ctrl.deleteSlot(id).then(() => this.render());
      });
      actions.append(load, del);
    }
    row.append(thumb, info, actions);
    return row;
  }

  private fileRow(): HTMLElement {
    const row = el('div', 'slot-files');
    const exp = el('button', 'btn btn-small', t('slots.export'));
    exp.title = t('slots.exportTip');
    exp.addEventListener('click', () => this.exportFile());
    const imp = el('button', 'btn btn-small', t('slots.import'));
    imp.title = t('slots.importTip');
    imp.addEventListener('click', () => this.fileInput.click());
    row.append(exp, imp, el('span', 'catalog-hint', t('slots.filesHint')));
    return row;
  }

  private exportFile(): void {
    const { text, fileName } = this.ctrl.exportGame();
    const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
    const a = el('a');
    a.href = url;
    a.download = fileName;
    document.body.append(a);
    a.click();
    a.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 2000);
    this.ctrl.toast(t('toast.exported'));
  }

  private async importFile(): Promise<void> {
    const file = this.fileInput.files?.[0];
    this.fileInput.value = '';
    if (!file) return;
    const text = await file.text();
    await this.ctrl.importGame(text);
    void this.render();
  }
}
