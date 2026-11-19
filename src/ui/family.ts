import type { GameController } from '../game/controller';
import { t } from '../i18n';
import { activeFamily, binFamilies, familyLedger, formatMoney, inBin, invitable, joinProblem, peopleOf, sellValue, splitProblem } from '../sim';
import type { Family, Folk, Speed } from '../sim';
import { ensembleOf } from '../sim/clothes';
import type { Portraiter } from './wardrobe';

// Plano 2, bloco 11: a tela da família em jogo. Três abas: a gente da casa
// (editar no criador, dividir a família), fundos e bens (dinheiro, casa,
// inventário, contas, herança) e juntar (chamar alguém para morar, juntar
// outra família aqui ou ir morar na casa dela). O tempo para enquanto está aberta.

function el<K extends keyof HTMLElementTagNameMap>(tag: K, className?: string, text?: string): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

export type FamilyTab = 'people' | 'money' | 'join';

export class FamilyPanel {
  readonly el = el('div', 'card wardrobe family-panel');
  private tab: FamilyTab = 'people';
  /** quem vai sair na divisão */
  private leaving = new Set<number>();
  private money = 0;
  private surname = '';
  private shownKey = '';
  private speedBefore: Speed = 0;
  portraiter: Portraiter | null = null;
  /** abre o criador num morador (main liga) */
  editFolk: ((folkId: number) => void) | null = null;

  constructor(
    host: HTMLElement,
    private readonly ctrl: GameController,
  ) {
    this.el.hidden = true;
    host.append(this.el);
    const loop = () => {
      if (this.open) this.update();
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }

  get open(): boolean {
    return !this.el.hidden;
  }

  show(tab: FamilyTab = 'people'): void {
    if (!this.ctrl.world.town || this.ctrl.houseEmpty) return;
    this.tab = tab;
    this.leaving.clear();
    this.money = 0;
    this.surname = '';
    if (!this.open) {
      this.speedBefore = this.ctrl.world.speed;
      this.ctrl.command({ type: 'setSpeed', speed: 0 });
    }
    this.el.hidden = false;
    this.shownKey = '';
    this.update();
  }

  close(): void {
    if (!this.open) return;
    this.el.hidden = true;
    if (!this.ctrl.houseEmpty) this.ctrl.command({ type: 'setSpeed', speed: this.speedBefore });
  }

  private update(): void {
    const w = this.ctrl.world;
    if (this.ctrl.screen !== 'lot' || !w.town) return this.close();
    const key = `${this.tab}|${this.ctrl.townVersion}|${this.ctrl.objectsVersion}|${w.household.funds}|${w.folks.length}|${[...this.leaving].join(',')}|${this.money}`;
    if (key === this.shownKey) return;
    this.shownKey = key;
    this.render();
  }

  private render(): void {
    const w = this.ctrl.world;
    const fam = activeFamily(w);
    if (!fam) return this.close();
    const scroll = this.el.scrollTop;
    this.el.replaceChildren();
    const head = el('div', 'style-head');
    head.append(el('div', 'style-title', t('family.title', { name: fam.name })));
    const x = el('button', 'style-close', '×');
    x.addEventListener('click', () => this.close());
    head.append(x);
    const tabs = el('div', 'town-tabs');
    for (const id of ['people', 'money', 'join'] as FamilyTab[]) {
      const b = el('button', 'tab', t(`family.tab.${id}`));
      b.classList.toggle('on', this.tab === id);
      b.addEventListener('click', () => {
        this.tab = id;
        this.shownKey = '';
      });
      tabs.append(b);
    }
    this.el.append(head, tabs);
    if (this.tab === 'people') this.renderPeople();
    else if (this.tab === 'money') this.renderMoney(fam);
    else this.renderJoin();
    this.el.scrollTop = scroll;
  }

  private shot(folk: Folk): string {
    if (!this.portraiter) return '';
    return this.portraiter(folk.look, 'day', { age: folk.age, dress: ensembleOf(folk, 'day') });
  }

  // ---------- gente: editar e dividir ----------

  private renderPeople(): void {
    const w = this.ctrl.world;
    const home = w.folks.filter((f) => !f.visit);
    const grid = el('div', 'family-people');
    for (const f of home) {
      const card = el('div', 'family-person');
      card.classList.toggle('leaving', this.leaving.has(f.id));
      const img = el('img', 'family-shot');
      img.alt = '';
      img.src = this.shot(f);
      const name = el('b', '', f.name);
      const age = el('span', 'panel-note', t(`age.${f.age ?? 'adult'}`));
      const edit = el('button', 'btn btn-small', t('family.edit'));
      edit.disabled = f.age === 'baby';
      edit.addEventListener('click', () => {
        this.close();
        this.editFolk?.(f.id);
      });
      const pick = el('label', 'town-check');
      const box = el('input');
      box.type = 'checkbox';
      box.checked = this.leaving.has(f.id);
      box.disabled = f.age === 'baby';
      box.addEventListener('change', () => {
        if (box.checked) this.leaving.add(f.id);
        else this.leaving.delete(f.id);
      });
      pick.append(box, el('span', '', t('family.leaves')));
      card.append(img, name, age, edit, pick);
      grid.append(card);
    }
    this.el.append(grid);
    // dividir
    const split = el('div', 'family-split');
    split.append(el('div', 'style-section', t('family.split')));
    const ids = [...this.leaving];
    const why = splitProblem(w, ids);
    const funds = Math.max(0, w.household.funds);
    if (ids.length && !this.money) this.money = Math.round((funds * ids.length) / Math.max(1, home.length));
    this.money = Math.min(this.money, funds);
    const row = el('div', 'creator-row');
    const slider = el('input', 'creator-slider');
    slider.type = 'range';
    slider.min = '0';
    slider.max = String(funds);
    slider.step = '10';
    slider.value = String(this.money);
    const label = el('span', 'creator-label', t('family.splitMoney', { amount: formatMoney(this.money) }));
    slider.addEventListener('input', () => {
      label.textContent = t('family.splitMoney', { amount: formatMoney(Number(slider.value)) });
    });
    slider.addEventListener('change', () => (this.money = Number(slider.value)));
    row.append(label, slider);
    const nameRow = el('label', 'creator-surname');
    const input = el('input');
    input.value = this.surname;
    input.placeholder = activeFamily(w)?.name ?? '';
    input.maxLength = 24;
    input.addEventListener('input', () => (this.surname = input.value));
    nameRow.append(el('span', '', t('family.splitName')), input);
    const go = el('button', 'btn btn-go', t('family.splitGo'));
    go.disabled = why !== null;
    go.addEventListener('click', () => {
      const n = ids.length;
      if (this.ctrl.familyCommand({ type: 'splitFamily', memberIds: ids, money: this.money, surname: this.surname || undefined })) {
        this.ctrl.toast(t('family.splitDone', { n }));
        this.leaving.clear();
        this.money = 0;
        this.shownKey = '';
      }
    });
    split.append(row, nameRow, go, el('div', 'panel-note', ids.length && why ? t(`problem.${why}`) : t('family.splitHint')));
    this.el.append(split);
  }

  // ---------- fundos e bens ----------

  private renderMoney(fam: Family): void {
    const w = this.ctrl.world;
    const catalog = this.ctrl.sim.catalog;
    const l = familyLedger(w, catalog, fam);
    const table = el('div', 'family-ledger');
    const line = (label: string, value: number, cls = '') => {
      const r = el('div', `family-line ${cls}`);
      r.append(el('span', '', label), el('b', '', formatMoney(value)));
      table.append(r);
    };
    line(t('ledger.funds'), l.funds);
    line(t('ledger.land'), l.land);
    line(t('ledger.build'), l.build);
    line(t('ledger.furniture'), l.furniture);
    line(t('ledger.stored', { n: l.storedCount }), l.stored);
    if (l.bills) line(t('ledger.bills'), -l.bills, 'bad');
    line(t('ledger.worth'), l.worth, 'total');
    line(t('ledger.weekPay'), l.weekPay);
    if (l.inherited) line(t('ledger.inherited'), l.inherited);
    this.el.append(table);
    // inventário
    this.el.append(el('div', 'style-section', t('ledger.inventory')));
    const stored = w.household.stored ?? [];
    if (!stored.length) this.el.append(el('div', 'panel-note', t('ledger.inventoryEmpty')));
    const list = el('ul', 'town-people family-stored');
    for (const o of stored) {
      const def = catalog.objects[o.defId];
      if (!def) continue;
      const li = el('li');
      const put = el('button', 'btn btn-small', t('ledger.place'));
      put.addEventListener('click', () => {
        this.close();
        this.ctrl.startPlacingStored(o.id);
      });
      const value = sellValue(w, o, def);
      const sell = el('button', 'btn btn-small btn-quiet', t('ledger.sell', { amount: formatMoney(value) }));
      sell.addEventListener('click', () => {
        if (this.ctrl.commandOrExplain({ type: 'sellStored', objectId: o.id })) this.shownKey = '';
      });
      li.append(el('b', '', t(def.name)), el('span', '', ' '), put, sell);
      list.append(li);
    }
    this.el.append(list, el('div', 'panel-note', t('ledger.hint')));
  }

  // ---------- juntar e chamar para morar ----------

  private renderJoin(): void {
    const w = this.ctrl.world;
    this.el.append(el('div', 'style-section', t('family.invite')));
    const people = invitable(w);
    if (!people.length) this.el.append(el('div', 'panel-note', t('family.inviteNone')));
    const list = el('ul', 'town-people');
    for (const n of people) {
      const li = el('li');
      const fam = n.home !== undefined ? w.town?.families.find((f) => f.id === n.home) : undefined;
      const b = el('button', 'btn btn-small', t('family.inviteGo'));
      b.addEventListener('click', () => {
        if (this.ctrl.familyCommand({ type: 'inviteHome', personId: n.id })) this.ctrl.toast(t('family.invited', { name: n.name }));
      });
      li.append(el('b', '', n.name), el('span', '', fam ? ` · ${t('town.family', { name: fam.name })} ` : ' '), b);
      list.append(li);
    }
    this.el.append(list, el('div', 'panel-note', t('family.inviteHint')));
    // juntar famílias
    this.el.append(el('div', 'style-section', t('family.join')));
    const town = w.town!;
    const others = [...town.families.filter((f) => f.id !== town.active && !inBin(f)), ...binFamilies(w)];
    const fams = el('ul', 'town-people family-join');
    for (const f of others) {
      const li = el('li');
      const lot = town.lots.find((l) => l.id === f.lotId);
      li.append(el('b', '', f.name), el('span', '', ` · ${lot ? t('town.lot', { number: lot.number }) : t('bin.inBin')} · ${t('bin.people', { n: peopleOf(w, f).length })} `));
      for (const where of ['here', 'there'] as const) {
        if (where === 'there' && !lot) continue;
        const b = el('button', 'btn btn-small', t(`family.join.${where}`));
        const why = joinProblem(w, f.id, where);
        b.disabled = why !== null;
        if (why) b.title = t(`problem.${why}`);
        b.addEventListener('click', () => {
          if (this.ctrl.familyCommand({ type: 'joinFamily', familyId: f.id, where })) this.ctrl.toast(t('family.joined', { name: f.name }));
        });
        li.append(b);
      }
      fams.append(li);
    }
    this.el.append(fams, el('div', 'panel-note', t('family.joinHint')));
  }
}
