import type { GameController } from '../game/controller';
import { partCss } from '../game/art/finish';
import { t } from '../i18n';
import { GARMENTS, MAX_SETS, OCCASIONS, OPTIONAL_SLOTS, bandOf, chosenSet, ensembleProblems, legacyCloset, ownedGarments, pieceStyle, priceTier, shopFor, wearPiece } from '../sim/clothes';
import type { Closet, ClothSlot, Ensemble, Occasion, Piece, PriceTier } from '../sim/clothes';
import { formatMoney } from '../sim/economy';
import type { Age, Folk, Look, Wear } from '../sim/types';
import { zonePicker } from './styleEditor';

// Plano 2, bloco 9: guarda-roupa (no móvel de roupa e no espelho). Escolhe a
// ocasião, o conjunto (até 3 por ocasião), as peças de cada lugar do corpo e
// a cor, o material e o padrão de cada área da peça (o mesmo painel do
// editor de estilo dos móveis). Compra peças novas na loja por faixa de
// preço. Nada muda no jogo até guardar.

function el<K extends keyof HTMLElementTagNameMap>(tag: K, className?: string, text?: string): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

export type Portraiter = (look: Look, wear: Wear, opts: { age?: Age; dress: Ensemble }) => string;

/** Ordem das linhas de peças no painel. */
const ROWS: ClothSlot[] = ['top', 'bottom', 'full', 'shoes', 'socks', 'hat', 'glasses', 'earrings', 'watch', 'bag', 'scarf'];
const TIERS: PriceTier[] = ['cheap', 'mid', 'fine'];

export class WardrobePanel {
  readonly el = el('div', 'card wardrobe');
  private folkId = -1;
  private objectId: number | undefined;
  private occasion: Occasion = 'day';
  private index = 0;
  private draft: Ensemble = {};
  private slot: ClothSlot = 'top';
  private zone = 'main';
  private sig = '';
  private shots = new Map<string, string>();
  portraiter: Portraiter | null = null;

  constructor(private ctrl: GameController) {
    this.el.hidden = true;
  }

  get open(): boolean {
    return !this.el.hidden;
  }

  /** Abre para um folk; `objectId` é o guarda-roupa onde ele vai trocar de roupa. */
  show(folkId: number, objectId?: number): void {
    this.folkId = folkId;
    this.objectId = objectId;
    const folk = this.folk();
    if (!folk) return;
    const worn = folk.outfit === 'work' ? 'day' : folk.outfit;
    this.occasion = OCCASIONS.includes(worn as Occasion) ? (worn as Occasion) : 'day';
    this.loadSet(this.closet(folk).pick[this.occasion] ?? 0);
    this.el.hidden = false;
    this.sig = '';
    this.render();
  }

  close(): void {
    this.el.hidden = true;
  }

  update(): void {
    if (this.el.hidden) return;
    if (!this.folk()) this.close();
    else this.render();
  }

  private folk(): Folk | undefined {
    return this.ctrl.world.folks.find((f) => f.id === this.folkId && !f.visit && f.age !== 'baby');
  }

  private closet(folk: Folk): Closet {
    return folk.closet ?? legacyCloset(folk.look, folk.age);
  }

  private loadSet(index: number): void {
    const folk = this.folk();
    if (!folk) return;
    const closet = this.closet(folk);
    const list = closet.sets[this.occasion] ?? [];
    this.index = Math.min(Math.max(0, index), list.length);
    const chosen = list[this.index] ?? chosenSet(closet, this.occasion)?.set ?? {};
    this.draft = JSON.parse(JSON.stringify(chosen)) as Ensemble;
    this.slot = this.draft.full ? 'full' : 'top';
    this.zone = 'main';
  }

  private shot(folk: Folk): string {
    const key = `${folk.id}|${folk.age ?? ''}|${JSON.stringify(folk.look)}|${this.occasion}|${JSON.stringify(this.draft)}`;
    let url = this.shots.get(key);
    if (!url && this.portraiter) {
      url = this.portraiter(folk.look, this.occasion, { age: folk.age, dress: this.draft });
      if (this.shots.size > 40) this.shots.clear();
      this.shots.set(key, url);
    }
    return url ?? '';
  }

  private set(next: Ensemble): void {
    this.draft = next;
    this.sig = '';
    this.render();
  }

  private render(): void {
    const folk = this.folk();
    if (!folk) return;
    const hh = this.ctrl.world.household;
    const closet = this.closet(folk);
    const sig = `${folk.id}|${this.occasion}|${this.index}|${JSON.stringify(this.draft)}|${this.slot}|${this.zone}|${hh.funds}|${(hh.garments ?? []).join(',')}|${JSON.stringify(closet)}|${folk.age ?? ''}`;
    if (sig === this.sig) return;
    this.sig = sig;
    this.el.replaceChildren();
    const band = bandOf(folk.age)!;
    const owned = ownedGarments(hh.garments);

    // ---------- cabeçalho: de quem, qual ocasião ----------
    const head = el('div', 'style-head');
    head.append(el('div', 'style-title', t('wardrobe.title', { name: folk.name.split(' ')[0] })));
    const x = el('button', 'style-close', '×');
    x.addEventListener('click', () => this.close());
    head.append(x);
    this.el.append(head);
    const people = el('div', 'style-chips');
    for (const f of this.ctrl.world.folks) {
      if (f.visit || f.age === 'baby') continue;
      const b = el('button', 'chip', f.name.split(' ')[0]);
      b.classList.toggle('on', f.id === folk.id);
      b.addEventListener('click', () => this.show(f.id, this.objectId));
      people.append(b);
    }
    this.el.append(people);
    const occ = el('div', 'style-zones');
    for (const o of OCCASIONS) {
      const b = el('button', 'zone-tab', t(`occasion.${o}`));
      b.classList.toggle('on', o === this.occasion);
      b.addEventListener('click', () => {
        this.occasion = o;
        this.loadSet(closet.pick[o] ?? 0);
        this.sig = '';
        this.render();
      });
      occ.append(b);
    }
    this.el.append(occ);

    const body = el('div', 'wardrobe-body');
    // ---------- prévia ----------
    const left = el('div', 'wardrobe-left');
    const img = el('img', 'wardrobe-shot');
    img.alt = '';
    img.src = this.shot(folk);
    left.append(img);
    const sets = el('div', 'style-chips');
    const list = closet.sets[this.occasion] ?? [];
    list.forEach((_, i) => {
      const b = el('button', 'chip', t('wardrobe.set', { n: i + 1 }));
      b.classList.toggle('on', i === this.index);
      if (i === (closet.pick[this.occasion] ?? 0)) b.title = t('wardrobe.current');
      b.addEventListener('click', () => {
        this.loadSet(i);
        if (folk.closet) this.ctrl.commandOrExplain({ type: 'pickOutfit', folkId: folk.id, occasion: this.occasion, index: i });
        this.sig = '';
        this.render();
      });
      sets.append(b);
    });
    if (this.index >= list.length) {
      const b = el('button', 'chip on', t('wardrobe.set', { n: list.length + 1 }));
      sets.append(b);
    } else if (list.length < MAX_SETS) {
      const b = el('button', 'chip', t('wardrobe.new'));
      b.addEventListener('click', () => {
        this.index = list.length;
        this.sig = '';
        this.render();
      });
      sets.append(b);
    }
    if (list.length > 1 && this.index < list.length && folk.closet) {
      const b = el('button', 'chip drop', t('wardrobe.drop'));
      b.addEventListener('click', () => {
        if (this.ctrl.commandOrExplain({ type: 'dropOutfit', folkId: folk.id, occasion: this.occasion, index: this.index })) this.loadSet(folk.closet?.pick[this.occasion] ?? 0);
        this.sig = '';
        this.render();
      });
      sets.append(b);
    }
    left.append(sets);
    body.append(left);

    // ---------- peças ----------
    const right = el('div', 'wardrobe-right');
    right.append(el('div', 'style-section', t('wardrobe.pieces')));
    for (const slot of ROWS) {
      const choices = [...owned].map((id) => GARMENTS[id]).filter((g) => g.slot === slot && g.bands.includes(band));
      if (!choices.length) continue;
      const row = el('div', 'style-row');
      row.append(el('span', 'style-label', t(`cslot.${slot}`)));
      const chips = el('div', 'style-chips');
      const cur = this.draft[slot];
      if (OPTIONAL_SLOTS.includes(slot) || slot === 'full' || (slot === 'top' && this.occasion === 'swim')) {
        const none = el('button', 'chip', t('wardrobe.none'));
        none.classList.toggle('on', !cur);
        none.addEventListener('click', () => {
          let next = wearPiece(this.draft, null, slot);
          // tirou a peça inteira: volta a camiseta e a calça básicas
          if (slot === 'full') next = { ...next, top: { g: band === 'child' ? 'kidtee' : 'tee' }, bottom: { g: band === 'child' ? 'shorts' : 'jeans' } };
          this.slot = slot === 'full' ? 'top' : this.slot;
          this.set(next);
        });
        chips.append(none);
      }
      for (const g of choices) {
        const b = el('button', 'chip');
        const dot = el('span', 'zone-dot');
        const p: Piece = cur?.g === g.id ? cur : { g: g.id };
        dot.style.background = partCss(pieceStyle(p).main ?? g.zones[0].base);
        b.append(dot, el('span', '', t(`garment.${g.id}`)));
        b.classList.toggle('on', cur?.g === g.id);
        b.addEventListener('click', () => {
          this.slot = slot;
          this.zone = g.zones[0].id;
          // a peça nova leva a cor da antiga do mesmo lugar, se combinar
          const keep = cur && cur.g !== g.id ? cur.style?.main : undefined;
          const piece: Piece = cur?.g === g.id ? cur : keep ? { g: g.id, style: { [g.zones[0].id]: keep } } : { g: g.id };
          this.set(wearPiece(this.draft, piece, slot));
        });
        chips.append(b);
      }
      row.append(chips);
      right.append(row);
    }

    // ---------- cores da peça escolhida ----------
    const piece = this.draft[this.slot];
    const g = piece ? GARMENTS[piece.g] : undefined;
    if (piece && g) {
      right.append(el('div', 'style-section', t('wardrobe.colors', { garment: t(`garment.${g.id}`) })));
      const tabs = el('div', 'style-zones');
      for (const z of g.zones) {
        const b = el('button', 'zone-tab');
        const dot = el('span', 'zone-dot');
        dot.style.background = partCss(pieceStyle(piece)[z.id] ?? z.base);
        b.append(dot, el('span', '', t(`gzone.${z.id}`)));
        b.classList.toggle('on', this.zone === z.id);
        b.addEventListener('click', () => {
          this.zone = z.id;
          this.sig = '';
          this.render();
        });
        tabs.append(b);
      }
      right.append(tabs);
      const zone = g.zones.find((z) => z.id === this.zone) ?? g.zones[0];
      right.append(
        zonePicker(zone, piece.style?.[zone.id], (p) => {
          const style = { ...(piece.style ?? {}) };
          if (p) style[zone.id] = p;
          else delete style[zone.id];
          this.set({ ...this.draft, [this.slot]: Object.keys(style).length ? { g: piece.g, style } : { g: piece.g } });
        }),
      );
    }
    body.append(right);
    this.el.append(body);

    // ---------- loja ----------
    const shop = shopFor(band).filter((x) => !owned.has(x.id));
    if (shop.length) {
      this.el.append(el('div', 'style-section', t('wardrobe.shop')));
      for (const tier of TIERS) {
        const items = shop.filter((x) => priceTier(x.price) === tier);
        if (!items.length) continue;
        const row = el('div', 'style-row');
        row.append(el('span', 'style-label', t(`wardrobe.tier.${tier}`)));
        const chips = el('div', 'style-chips');
        for (const item of items) {
          const b = el('button', 'chip', `${t(`garment.${item.id}`)} · ${formatMoney(item.price)}`);
          b.disabled = item.price > hh.funds;
          b.addEventListener('click', () => {
            if (this.ctrl.commandOrExplain({ type: 'buyGarment', garmentId: item.id })) this.ctrl.toast(t('wardrobe.bought', { garment: t(`garment.${item.id}`) }));
            this.sig = '';
            this.render();
          });
          chips.append(b);
        }
        row.append(chips);
        this.el.append(row);
      }
    }

    // ---------- pé: guardar (e vestir) ----------
    const foot = el('div', 'style-foot');
    const problems = ensembleProblems(this.draft, band, this.occasion);
    if (problems.length) foot.append(el('span', 'style-price poor', t(problems.includes('needs:top') ? 'wardrobe.need.top' : problems.includes('needs:bottom') ? 'wardrobe.need.bottom' : 'wardrobe.need.fix')));
    const save = el('button', 'chip', t('wardrobe.save'));
    save.disabled = problems.length > 0;
    save.addEventListener('click', () => this.save(false));
    foot.append(save);
    if (this.objectId !== undefined) {
      const wear = el('button', 'chip go', t('wardrobe.saveWear'));
      wear.disabled = problems.length > 0;
      wear.addEventListener('click', () => this.save(true));
      foot.append(wear);
    }
    this.el.append(foot);
  }

  private save(andWear: boolean): void {
    const folk = this.folk();
    if (!folk) return;
    if (!this.ctrl.commandOrExplain({ type: 'saveOutfit', folkId: folk.id, occasion: this.occasion, index: this.index, ensemble: this.draft })) return;
    this.ctrl.toast(t('wardrobe.saved'));
    if (andWear && this.objectId !== undefined) {
      this.ctrl.commandOrExplain({ type: 'queueUse', folkId: folk.id, objectId: this.objectId, interactionId: `dress_${this.occasion}` });
      this.close();
      return;
    }
    this.sig = '';
    this.render();
  }
}
