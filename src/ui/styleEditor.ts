import type { GameController } from '../game/controller';
import { artRoles } from '../game/art/furniture';
import { partCss } from '../game/art/finish';
import { t } from '../i18n';
import { formatMoney } from '../sim/economy';
import { cleanLook, priceWith, zonesOf } from '../sim/modular';
import type { KitParts, PartSlot } from '../sim/parts';
import { KINDS, assemble, partOf, partsFor, partsOfObject } from '../sim/parts';
import type { MatFamily, ObjStyle, PartStyle, PatternId, ZoneDef } from '../sim/style';
import { MATERIALS, PATTERNS, SWATCHES, adaptStyle, styleFromColor } from '../sim/style';
import type { ObjectDef, WorldObject } from '../sim/types';

// Plano 2, bloco 8: editor de estilo do modo compra. Troca as peças de um
// móvel montado e o material, a cor e o padrão de cada parte; guarda estilos
// para usar de novo. Serve para o que vai ser comprado (o fantasma muda na
// hora) e para um objeto que já está na casa (paga a diferença ao aplicar).

function el<K extends keyof HTMLElementTagNameMap>(tag: K, className?: string, text?: string): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

const FAMILY_ORDER: MatFamily[] = ['fabric', 'wood', 'metal', 'plastic', 'stone'];

/** Peças escolhidas acertadas: o que a peça nova pede, as outras seguem. */
export function fitParts(def: ObjectDef, parts: KitParts, changed: PartSlot): KitParts {
  const kit = def.kit!;
  let out: KitParts = { ...parts };
  for (let guard = 0; guard < 6; guard++) {
    const a = assemble(kit.kind, partsOfObject(kit, out), def.size);
    const need = a.problems.find((p) => p.startsWith('needs:'));
    if (!need) break;
    const [, slot, , other] = need.split(':') as [string, PartSlot, string, PartSlot];
    // quem acabou de ser escolhido manda; o outro lado se ajusta
    const fix = slot === changed ? other : slot;
    const keep = fix === other ? slot : other;
    const ok = partsFor(kit.kind, fix).find((cand) => {
      const trial = { ...out, [fix]: cand.id };
      const t2 = assemble(kit.kind, partsOfObject(kit, trial), def.size);
      return !t2.problems.some((p) => p.startsWith('needs:') && p.includes(`:${keep}`) && p.includes(`:${fix}`));
    });
    if (!ok) break;
    out = { ...out, [fix]: ok.id };
  }
  return out;
}

export class StyleEditor {
  readonly el = el('div', 'card style-editor');
  private def: ObjectDef | null = null;
  private target: WorldObject | null = null;
  private parts: KitParts = {};
  private style: ObjStyle = {};
  private zone = '';
  private sig = '';
  onClose: () => void = () => {};

  constructor(private ctrl: GameController) {
    this.el.hidden = true;
  }

  get open(): boolean {
    return !this.el.hidden;
  }

  /** Abre para o que vai ser comprado (o fantasma acompanha). */
  editPlacing(): void {
    const p = this.ctrl.placing;
    const def = p && this.ctrl.sim.catalog.objects[p.defId];
    if (!p || !def || p.moveId !== undefined) return;
    this.def = def;
    this.target = null;
    this.parts = { ...(p.parts ?? {}) };
    this.style = { ...(p.style ?? styleFromColor(zonesOf(def), p.color) ?? {}) };
    this.zone = this.zones()[0]?.id ?? '';
    this.show();
  }

  /** Abre para um objeto que já está na casa. */
  editObject(obj: WorldObject): void {
    const def = this.ctrl.sim.defOf(obj);
    if (!def) return;
    this.def = def;
    this.target = obj;
    this.parts = { ...(obj.parts ?? {}) };
    this.style = { ...(obj.style ?? {}) };
    this.zone = this.zones()[0]?.id ?? '';
    this.show();
  }

  close(): void {
    this.el.hidden = true;
    this.def = null;
    this.target = null;
    this.onClose();
  }

  private show(): void {
    this.el.hidden = false;
    this.sig = '';
    this.render();
  }

  /** As zonas que este objeto tem (no desenho antigo, só os papéis que aparecem nele). */
  private zones(): ZoneDef[] {
    if (!this.def) return [];
    const all = zonesOf(this.def);
    if (this.def.kit) return all;
    const roles = artRoles(this.def);
    return all.filter((z) => roles.includes(z.id));
  }

  /** Mantém o fantasma e o preço em dia. */
  private push(): void {
    if (!this.def) return;
    if (!this.target) this.ctrl.setPlacingLook(Object.keys(this.parts).length ? this.parts : undefined, Object.keys(this.style).length ? this.style : undefined);
    this.sig = '';
    this.render();
  }

  update(): void {
    if (this.el.hidden) return;
    // fechou o modo compra ou largou o objeto: fecha junto
    if (this.ctrl.mode !== 'buy' || (!this.target && this.ctrl.placing?.defId !== this.def?.id)) this.close();
    else this.render();
  }

  private render(): void {
    const def = this.def;
    if (!def) return;
    const funds = this.ctrl.world.household.funds;
    const saved = this.ctrl.world.household.styles ?? [];
    const sig = `${JSON.stringify(this.parts)}|${JSON.stringify(this.style)}|${this.zone}|${funds}|${saved.length}|${saved.map((s) => s.id).join(',')}`;
    if (sig === this.sig) return;
    this.sig = sig;
    this.el.replaceChildren();
    const head = el('div', 'style-head');
    head.append(el('div', 'style-title', `${t('style.title')}: ${t(def.name)}`));
    const x = el('button', 'style-close', '×');
    x.addEventListener('click', () => this.close());
    head.append(x);
    this.el.append(head);

    // ---------- peças ----------
    if (def.kit) {
      this.el.append(el('div', 'style-section', t('style.parts')));
      const kit = def.kit;
      const now = partsOfObject(kit, this.parts);
      const built = assemble(kit.kind, now, def.size);
      for (const slot of KINDS[kit.kind].slots) {
        const choices = partsFor(kit.kind, slot);
        if (choices.length < 2) continue;
        const row = el('div', 'style-row');
        row.append(el('span', 'style-label', t(`slot.${slot}`)));
        const chips = el('div', 'style-chips');
        for (const part of choices) {
          const b = el('button', 'chip', t(`part.${slot}.${part.id}`));
          b.classList.toggle('on', built.parts[slot] === part.id);
          // peça que não cabe na largura (braço grosso no sofá estreito) fica apagada
          const trial = fitParts(def, { ...this.parts, [slot]: part.id }, slot);
          const fits = assemble(kit.kind, partsOfObject(kit, trial), def.size).problems.length === 0;
          b.disabled = !fits;
          if (part.price > 0) b.title = `+${formatMoney(part.price)}`;
          b.addEventListener('click', () => {
            this.parts = fitParts(def, { ...this.parts, [slot]: part.id }, slot);
            this.push();
          });
          chips.append(b);
        }
        row.append(chips);
        this.el.append(row);
      }
    }

    // ---------- cores e materiais ----------
    const zones = this.zones();
    if (zones.length) {
      this.el.append(el('div', 'style-section', t('style.colors')));
      const tabs = el('div', 'style-zones');
      for (const z of zones) {
        const cur = this.style[z.id] ?? z.base;
        const b = el('button', 'zone-tab');
        const dot = el('span', 'zone-dot');
        if (cur.mat) dot.style.background = partCss(cur);
        else dot.classList.add('orig');
        b.append(dot, el('span', '', def.kit ? t(`slot.${z.id}`) : t(`zone.${z.id}`)));
        b.classList.toggle('on', this.zone === z.id);
        b.addEventListener('click', () => {
          this.zone = z.id;
          this.sig = '';
          this.render();
        });
        tabs.append(b);
      }
      this.el.append(tabs);
      const zone = zones.find((z) => z.id === this.zone) ?? zones[0];
      this.el.append(this.zonePanel(zone));
    }

    // ---------- estilos salvos ----------
    const savedBox = el('div', 'style-saved');
    const save = el('button', 'chip', t('style.save'));
    save.disabled = !Object.keys(this.style).length;
    save.addEventListener('click', () => {
      const n = (saved.reduce((m, s) => Math.max(m, s.id), 0) ?? 0) + 1;
      if (this.ctrl.commandOrExplain({ type: 'saveStyle', name: t('style.savedName', { n }), style: this.style })) this.ctrl.toast(t('style.savedToast'));
      this.sig = '';
      this.render();
    });
    savedBox.append(save);
    for (const s of saved) {
      const item = el('span', 'saved-style');
      const sw = el('span', 'saved-swatches');
      for (const p of Object.values(s.style).slice(0, 4)) {
        const d = el('span', 'zone-dot');
        d.style.background = partCss(p);
        sw.append(d);
      }
      const use = el('button', 'chip', `${s.name}`);
      use.title = t('style.apply');
      use.addEventListener('click', () => {
        const adapted = adaptStyle(s.style, zones);
        this.style = { ...(adapted ?? {}) };
        this.push();
      });
      const drop = el('button', 'chip drop', '×');
      drop.title = t('style.drop');
      drop.addEventListener('click', () => {
        this.ctrl.commandOrExplain({ type: 'dropStyle', styleId: s.id });
        this.sig = '';
        this.render();
      });
      item.append(sw, use, drop);
      savedBox.append(item);
    }
    this.el.append(el('div', 'style-section', t('style.saved')), savedBox);

    // ---------- pé: preço, voltar, aplicar ----------
    const foot = el('div', 'style-foot');
    const look = cleanLook(def, this.parts, this.style);
    const price = priceWith(def, look.parts, look.style);
    const reset = el('button', 'chip', t('style.reset'));
    reset.addEventListener('click', () => {
      this.parts = {};
      this.style = {};
      this.push();
    });
    foot.append(reset);
    if (this.target) {
      const before = priceWith(def, this.target.parts, this.target.style);
      const cost = Math.max(0, price - before);
      const apply = el('button', 'chip go', t('style.applyBtn', { price: formatMoney(cost) }));
      apply.disabled = cost > funds;
      apply.addEventListener('click', () => {
        if (this.ctrl.commandOrExplain({ type: 'restyle', objectId: this.target!.id, parts: this.parts, style: this.style })) this.close();
      });
      foot.append(apply);
    } else {
      foot.append(el('span', `style-price${price > funds ? ' poor' : ''}`, t('style.price', { price: formatMoney(price) })));
      const done = el('button', 'chip go', t('style.done'));
      done.addEventListener('click', () => this.close());
      foot.append(done);
    }
    this.el.append(foot);
  }

  /** Material (por família), cor e padrão de uma zona. */
  private zonePanel(zone: ZoneDef): HTMLElement {
    const box = el('div', 'style-zone');
    const cur: PartStyle = this.style[zone.id] ?? zone.base;
    const set = (p: PartStyle | null) => {
      if (p) this.style = { ...this.style, [zone.id]: p };
      else {
        const next = { ...this.style };
        delete next[zone.id];
        this.style = next;
      }
      this.push();
    };
    // materiais
    const mats = el('div', 'style-mats');
    if (!zone.base.mat) {
      const orig = el('button', 'chip', t('style.original'));
      orig.classList.toggle('on', !this.style[zone.id]);
      orig.addEventListener('click', () => set(null));
      mats.append(orig);
    }
    for (const fam of FAMILY_ORDER) {
      if (!zone.families.includes(fam)) continue;
      const list = Object.values(MATERIALS).filter((m) => m.family === fam);
      const group = el('div', 'mat-group');
      group.append(el('span', 'style-label', t(`family.${fam}`)));
      for (const m of list) {
        const b = el('button', 'chip mat');
        const dot = el('span', 'zone-dot');
        dot.style.background = partCss({ mat: m.id, color: m.tint === 'full' ? cur.color : undefined });
        b.append(dot, el('span', '', t(`mat.${m.id}`)));
        b.classList.toggle('on', cur.mat === m.id);
        if (m.price > 0) b.title = `+${formatMoney(m.price)}`;
        b.addEventListener('click', () => {
          const keepColor = m.tint !== 'none' ? cur.color : undefined;
          const keepPattern = m.patterns ? cur.pattern : undefined;
          set({ mat: m.id, ...(keepColor ? { color: keepColor } : {}), ...(keepPattern ? { pattern: keepPattern } : {}) });
        });
        group.append(b);
      }
      mats.append(group);
    }
    box.append(el('div', 'style-label', t('style.material')), mats);
    const mat = MATERIALS[cur.mat];
    if (!mat) return box;
    // cores
    if (mat.tint !== 'none') {
      const row = el('div', 'style-swatches');
      if (mat.tint === 'stain') {
        const nat = el('button', 'swatch natural');
        nat.title = t('style.natural');
        nat.style.background = partCss({ mat: mat.id });
        nat.classList.toggle('on', !cur.color);
        nat.addEventListener('click', () => set({ mat: mat.id, ...(cur.pattern ? { pattern: cur.pattern } : {}) }));
        row.append(nat);
      }
      for (const c of Object.keys(SWATCHES)) {
        const b = el('button', 'swatch');
        b.style.background = partCss({ mat: mat.id, color: c });
        b.title = t(`color.${c}`);
        b.classList.toggle('on', cur.color === c);
        b.addEventListener('click', () => set({ mat: mat.id, color: c, ...(cur.pattern ? { pattern: cur.pattern } : {}) }));
        row.append(b);
      }
      box.append(el('div', 'style-label', t('style.color')), row);
    }
    // padrões
    if (mat.patterns) {
      const row = el('div', 'style-chips');
      for (const pat of PATTERNS) {
        const b = el('button', 'chip', t(`pattern.${pat}`));
        b.classList.toggle('on', (cur.pattern ?? 'plain') === pat);
        b.addEventListener('click', () => set({ mat: mat.id, ...(cur.color ? { color: cur.color } : {}), ...(pat !== 'plain' ? { pattern: pat as PatternId } : {}) }));
        row.append(b);
      }
      box.append(el('div', 'style-label', t('style.pattern')), row);
    }
    void partOf;
    return box;
  }
}
