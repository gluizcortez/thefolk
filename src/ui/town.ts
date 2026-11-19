import type { GameController } from '../game/controller';
import type { TownView } from '../game/town';
import { t } from '../i18n';
import {
  NEW_FAMILY_FUNDS,
  barePrice,
  binFamilies,
  inBin,
  peopleOf,
  activeFamily,
  activeLot,
  familyById,
  formatMoney,
  fundsOf,
  homeOf,
  lotPrice,
  lotStatus,
  membersOf,
  salePrice,
} from '../sim';
import type { Lot } from '../sim';

// Bloco 15: o painel da tela do bairro. Plaquinha em cima de cada lote, um
// cartão com o lote escolhido (quem mora, quanto vale, o que dá para fazer)
// e o mural do que andou acontecendo nas outras casas.

function el<K extends keyof HTMLElementTagNameMap>(tag: K, className?: string, text?: string): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

export class TownPanel {
  private root = el('div', 'town');
  private head = el('div', 'card town-head');
  private detail = el('div', 'card town-detail');
  private feed = el('div', 'card town-feed');
  private tagsEl = el('div', 'town-tags');
  private tags = new Map<number, HTMLButtonElement>();
  private shownKey = '';
  /** abre a tela de criar família para um lote (main liga ao criador) */
  newFamilyAt: ((lotId: number) => void) | null = null;
  /** plano 2, bloco 11: abre o criador para uma família da gaveta */
  newFamilyInBin: (() => void) | null = null;
  /** plano 2, bloco 11: cartão do lote ou lista de famílias (com a gaveta) */
  private tab: 'lot' | 'families' = 'lot';
  /** plano 2, bloco 11: comprar a casa à venda sem os móveis */
  private bare = false;
  /** plano 2, bloco 11: na mudança, levar os móveis para o inventário */
  private pack = false;

  constructor(
    host: HTMLElement,
    private readonly ctrl: GameController,
    private readonly view: TownView,
  ) {
    this.root.hidden = true;
    this.root.append(this.tagsEl, this.head, this.detail, this.feed);
    host.append(this.root);
    const loop = () => {
      this.update();
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }

  private update(): void {
    const open = this.ctrl.screen === 'town';
    document.body.classList.toggle('town-open', open);
    if (this.root.hidden === open) this.root.hidden = !open;
    if (!open) {
      this.shownKey = '';
      return;
    }
    const key = `${this.ctrl.townVersion}|${this.ctrl.townLot}|${this.ctrl.world.household.funds}|${this.tab}|${this.bare}|${this.pack}`;
    if (key !== this.shownKey) {
      this.shownKey = key;
      this.render();
    }
    // plaquinhas seguem os lotes na tela
    for (const tag of this.view.tags()) {
      const b = this.tags.get(tag.lotId);
      if (!b) continue;
      b.style.left = `${(tag.x * 100).toFixed(2)}%`;
      b.style.top = `${(tag.y * 100).toFixed(2)}%`;
      b.classList.toggle('on', tag.lotId === this.ctrl.townLot);
      b.classList.toggle('hover', tag.lotId === this.view.hover);
    }
  }

  private render(): void {
    const world = this.ctrl.world;
    const town = world.town;
    if (!town) return;
    // cabeçalho
    this.head.replaceChildren(el('div', 'town-title', t('town.title', { name: town.name })), el('div', 'panel-note', t('town.street', { street: town.street })));
    const back = el('button', 'btn btn-go', t('town.back'));
    back.addEventListener('click', () => this.ctrl.closeTown());
    back.hidden = this.ctrl.houseEmpty;
    // plano 2, bloco 11: lista de famílias com a gaveta
    const tabs = el('div', 'town-tabs');
    for (const id of ['lot', 'families'] as const) {
      const b = el('button', 'tab', id === 'lot' ? t('town.tab.lot') : t('town.tab.families', { n: binFamilies(world).length }));
      b.classList.toggle('on', this.tab === id);
      b.addEventListener('click', () => {
        this.tab = id;
        this.render();
      });
      tabs.append(b);
    }
    this.head.append(tabs, back);
    // plaquinhas
    this.tagsEl.replaceChildren();
    this.tags.clear();
    for (const lot of town.lots) {
      const status = lotStatus(world, lot);
      const fam = familyById(world, lot.familyId);
      const b = el('button', `town-tag ${status}`);
      b.append(el('b', '', t('town.lot', { number: lot.number })), el('span', '', status === 'forSale' ? t('town.forSale') : status === 'vacant' ? t('town.vacant') : (fam?.name ?? '')));
      b.addEventListener('click', () => {
        this.ctrl.townLot = lot.id;
        this.tab = 'lot';
      });
      this.tagsEl.append(b);
      this.tags.set(lot.id, b);
    }
    if (this.tab === 'families') this.renderFamilies();
    else this.renderDetail(town.lots.find((l) => l.id === this.ctrl.townLot));
    // mural
    this.feed.replaceChildren(el('div', 'town-sub', t('town.feed')));
    const list = el('ul', 'town-feed-list');
    const items = [...town.feed].reverse().slice(0, 6);
    for (const e of items) list.append(el('li', '', `${t('hud.dayShort', { day: Math.floor(e.tick / 1440) + 1 })} · ${t(e.key, e.params)}`));
    if (items.length === 0) list.append(el('li', 'panel-note', t('town.feedEmpty')));
    this.feed.append(list);
  }

  private renderDetail(lot: Lot | undefined): void {
    const d = this.detail;
    d.replaceChildren();
    if (!lot) {
      d.append(el('div', 'panel-note', t('town.pick')));
      return;
    }
    const world = this.ctrl.world;
    const town = world.town!;
    const catalog = this.ctrl.sim.catalog;
    const status = lotStatus(world, lot);
    const fam = familyById(world, lot.familyId);
    d.append(el('div', 'town-sub', t('town.address', { street: town.street, number: lot.number })));
    const title =
      status === 'active' ? `${t('town.family', { name: fam?.name ?? '' })} · ${t('town.active')}` : status === 'family' ? t('town.family', { name: fam?.name ?? '' }) : status === 'forSale' ? t('town.forSale') : t('town.vacant');
    d.append(el('div', 'town-title', title));
    const actions = el('div', 'town-actions');
    if (fam) {
      const people = el('ul', 'town-people');
      for (const m of membersOf(world, fam.id)) {
        const n = world.neighbors.find((x) => x.id === m.id);
        const f = world.folks.find((x) => x.id === m.id);
        const age = n?.age ?? f?.age;
        const career = n?.career ?? (f?.job ? { id: f.job.careerId, level: f.job.level } : null);
        const job = age === 'baby' ? t('town.baby') : age === 'child' ? t('town.kid') : age === 'teen' ? t('town.teen') : age === 'elder' ? t('town.elder') : career ? t(catalog.careers[career.id]?.levels[career.level]?.title ?? '') : t('town.jobless');
        const li = el('li');
        li.append(el('b', '', m.name), el('span', '', ` · ${job}`));
        people.append(li);
      }
      d.append(el('div', 'panel-note', t('town.members')), people);
      d.append(el('div', 'town-line', t('town.funds', { amount: formatMoney(fundsOf(world, fam)) })));
      d.append(el('div', 'panel-note', t('town.since', { day: Math.floor(fam.since / 1440) + 1 })));
      if (status === 'active') {
        if (!this.ctrl.houseEmpty) {
          const home = el('button', 'btn btn-go', t('town.goHome'));
          home.addEventListener('click', () => this.ctrl.closeTown());
          actions.append(home);
        }
      } else {
        const play = el('button', 'btn btn-go', t('town.play'));
        play.addEventListener('click', () => {
          if (this.ctrl.townCommand({ type: 'playFamily', familyId: fam.id })) this.ctrl.toast(t('town.played', { name: fam.name }));
        });
        actions.append(play);
        // plano 2, bloco 11: mandar para a gaveta (a casa fica à venda)
        const bin = el('button', 'btn btn-quiet', t('bin.send'));
        bin.addEventListener('click', () => {
          if (this.ctrl.familyCommand({ type: 'binFamily', familyId: fam.id })) this.ctrl.toast(t('bin.sent', { name: fam.name }));
        });
        actions.append(bin);
        d.append(el('div', 'panel-note', t('town.playHint')));
      }
    } else {
      const home = homeOf(world, lot);
      const full = lotPrice(world, catalog, lot);
      const bareCost = barePrice(world, catalog, lot);
      // plano 2, bloco 11: casa mobiliada ou só a obra (o terreno vago é sempre só o terreno)
      const furnished = status === 'forSale' && full > bareCost;
      const bare = furnished && this.bare;
      const price = bare ? bareCost : full;
      d.append(el('div', 'town-line', t('town.price', { amount: formatMoney(price) })));
      d.append(el('div', 'panel-note', status === 'forSale' ? t('town.priceParts', { land: formatMoney(lot.land), build: formatMoney(bareCost - lot.land), furniture: formatMoney(full - bareCost) }) : t('town.land', { amount: formatMoney(lot.land) })));
      if (status === 'forSale') d.append(el('div', 'panel-note', (home?.objects.length ?? 0) > 2 ? t('town.rooms', { n: home!.objects.length }) : t('town.empty')));
      if (furnished) {
        const opts = el('div', 'town-tabs');
        for (const v of [false, true]) {
          const b = el('button', 'tab', t(v ? 'town.buyBare' : 'town.buyFull'));
          b.classList.toggle('on', this.bare === v);
          b.addEventListener('click', () => (this.bare = v));
          opts.append(b);
        }
        d.append(opts);
      }
      // mudar a família em jogo para cá
      const mine = activeFamily(world);
      if (mine && activeLot(world) && !this.ctrl.houseEmpty) {
        const here = activeLot(world)!;
        const sale = this.pack ? barePrice(world, catalog, here) : salePrice(world, catalog);
        const funds = world.household.funds;
        const ok = funds + sale >= price;
        const move = el('button', 'btn', t('town.move'));
        move.disabled = !ok;
        move.addEventListener('click', () => {
          if (this.ctrl.townCommand({ type: 'moveHouse', lotId: lot.id, bare, pack: this.pack })) this.ctrl.toast(t('town.moved', { name: mine.name, number: lot.number }));
        });
        actions.append(move);
        // plano 2, bloco 11: levar os móveis (vão para o inventário) em vez de vender
        const packBox = el('label', 'town-check');
        const box = el('input');
        box.type = 'checkbox';
        box.checked = this.pack;
        box.addEventListener('change', () => (this.pack = box.checked));
        packBox.append(box, el('span', '', t('town.pack')));
        d.append(packBox);
        d.append(
          el(
            'div',
            'panel-note',
            ok ? t('town.moveHint', { sale: formatMoney(sale), price: formatMoney(price), left: formatMoney(funds + sale - price) }) : t('town.moveShort', { sale: formatMoney(sale), funds: formatMoney(funds), price: formatMoney(price) }),
          ),
        );
      }
      const fits = price <= NEW_FAMILY_FUNDS;
      const fresh = el('button', 'btn btn-go', t('town.newFamily'));
      fresh.disabled = !fits;
      fresh.addEventListener('click', () => this.newFamilyAt?.(lot.id));
      actions.append(fresh);
      d.append(el('div', 'panel-note', t(fits ? 'town.newHint' : 'town.newShort', { funds: formatMoney(NEW_FAMILY_FUNDS), price: formatMoney(price) })));
      // plano 2, bloco 11: famílias da gaveta que podem se mudar para cá
      const binned = binFamilies(world);
      if (binned.length) {
        const list = el('ul', 'town-people town-bin');
        for (const f of binned) {
          const li = el('li');
          const can = f.funds >= price;
          const b = el('button', 'btn btn-small', t('bin.placeHere'));
          b.disabled = !can;
          b.addEventListener('click', () => {
            if (this.ctrl.familyCommand({ type: 'placeFamily', familyId: f.id, lotId: lot.id, bare })) this.ctrl.toast(t('bin.placed', { name: f.name, number: lot.number }));
          });
          li.append(el('b', '', f.name), el('span', '', ` · ${formatMoney(f.funds)} `), b);
          list.append(li);
        }
        d.append(el('div', 'panel-note', t('bin.fromBin')), list);
      }
    }
    d.append(actions);
  }

  /** Plano 2, bloco 11: todas as famílias da cidade, as do bairro e as da gaveta. */
  private renderFamilies(): void {
    const d = this.detail;
    d.replaceChildren();
    const world = this.ctrl.world;
    const town = world.town!;
    d.append(el('div', 'town-title', t('town.tab.families', { n: binFamilies(world).length })));
    const list = el('ul', 'town-people town-families');
    const ordered = [...town.families].sort((a, b) => Number(inBin(a)) - Number(inBin(b)));
    for (const fam of ordered) {
      const li = el('li', inBin(fam) ? 'binned' : '');
      const lot = inBin(fam) ? undefined : town.lots.find((l) => l.id === fam.lotId);
      const where = lot ? t('town.lot', { number: lot.number }) : t('bin.inBin');
      const people = peopleOf(world, fam).length;
      li.append(el('b', '', fam.name), el('span', '', ` · ${where} · ${t('bin.people', { n: people })} · ${formatMoney(fundsOf(world, fam))}`));
      const row = el('span', 'town-row-actions');
      if (fam.id === town.active) row.append(el('span', 'panel-note', t('town.active')));
      else if (lot) {
        const play = el('button', 'btn btn-small', t('bin.play'));
        play.addEventListener('click', () => {
          if (this.ctrl.townCommand({ type: 'playFamily', familyId: fam.id })) this.ctrl.toast(t('town.played', { name: fam.name }));
        });
        const bin = el('button', 'btn btn-small btn-quiet', t('bin.send'));
        bin.addEventListener('click', () => {
          if (this.ctrl.familyCommand({ type: 'binFamily', familyId: fam.id })) this.ctrl.toast(t('bin.sent', { name: fam.name }));
        });
        row.append(play, bin);
      } else row.append(el('span', 'panel-note', t('bin.pickLot')));
      li.append(row);
      list.append(li);
    }
    d.append(list);
    const add = el('button', 'btn btn-go', t('bin.new'));
    add.addEventListener('click', () => this.newFamilyInBin?.());
    d.append(el('div', 'town-actions'));
    d.lastElementChild!.append(add);
    d.append(el('div', 'panel-note', t('bin.hint')));
  }
}
