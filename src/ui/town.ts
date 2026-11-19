import type { GameController } from '../game/controller';
import type { CityLayer, MapMark } from '../game/city';
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
  VEHICLE_PRICE,
  addressOf,
  canGo,
  districtOf,
  lotDoor,
  streetRoute,
  vehiclesOf,
  crowdOf,
  formatClock,
  insideOf,
  isAdult,
  minutesToOpen,
  minutesToShut,
  placeDoor,
  placeOpen,
  SCHOOL_STYLES,
  WORK_STYLES,
} from '../sim';
import type { Folk, Lot, PlaceDef, SchoolStyle, TravelMode, WorkStyle } from '../sim';
import { travelPicker, usableMode } from './travel';

// Bloco 15: o painel da tela do bairro. Plaquinha em cima de cada lote, um
// cartão com o lote escolhido (quem mora, quanto vale, o que dá para fazer)
// e o mural do que andou acontecendo nas outras casas. Plano 2, bloco 12: o
// bairro virou o mapa da cidade (a câmera afastada); as plaquinhas, as
// etiquetas de bairros e lugares e os ícones da família vêm da camada da
// cidade, e o cartão do lote ganhou a visita (a pé, de bicicleta...).

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
  private tags = new Map<string, HTMLButtonElement>();
  /** plano 2, bloco 12: quem vai na visita e como */
  private visitors: Set<number> | null = null;
  private visitMode: TravelMode = 'walk';
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
  /** plano 2, bloco 13: o que fazer no lugar e o recado escolhido */
  private placePlan = '';
  private errand = '';
  private shownPlace = '';

  constructor(
    host: HTMLElement,
    private readonly ctrl: GameController,
    private readonly city: CityLayer,
    private readonly game: { mapMarks(): MapMark[] },
  ) {
    this.root.hidden = true;
    this.root.append(this.tagsEl, this.head, this.detail, this.feed);
    // plano 2, bloco 12: por baixo da HUD (as etiquetas do mapa não cobrem os botões)
    host.prepend(this.root);
    const loop = () => {
      this.update();
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }

  private update(): void {
    const open = this.ctrl.screen === 'town';
    document.body.classList.toggle('town-open', open);
    this.root.hidden = false;
    for (const card of [this.head, this.detail, this.feed]) card.hidden = !open;
    this.updateMarks();
    if (!open) {
      this.shownKey = '';
      return;
    }
    const trip = this.ctrl.world.trip;
    if (this.ctrl.townPlace !== this.shownPlace) {
      this.shownPlace = this.ctrl.townPlace;
      this.placePlan = '';
      this.errand = '';
      this.visitors = null;
    }
    const key = `${this.ctrl.townVersion}|${this.ctrl.townLot}|${this.ctrl.townPlace}|${this.placePlan}|${this.errand}|${world_jobs(this.ctrl.world)}|${this.ctrl.world.household.funds}|${this.tab}|${this.bare}|${this.pack}|${trip?.from ?? 0}|${(this.ctrl.world.household.vehicles ?? []).join()}|${[...(this.visitors ?? [])].join()}|${this.visitMode}|${Math.floor(this.ctrl.world.tick / 30)}`;
    if (key !== this.shownKey) {
      this.shownKey = key;
      this.render();
    }
  }

  /** Plano 2, bloco 12: plaquinhas dos lotes, etiquetas do mapa e ícones da família seguem a câmera. */
  private updateMarks(): void {
    const marks = this.game.mapMarks();
    const seen = new Set<string>();
    for (const m of marks) {
      seen.add(m.key);
      let b = this.tags.get(m.key);
      if (!b) {
        b = el('button', `town-tag map-${m.kind}`);
        const id = m.id;
        if (m.kind === 'lot' && id) {
          b.addEventListener('click', () => {
            this.ctrl.townLot = id;
            this.tab = 'lot';
          });
        } else if (m.kind === 'folk' && id) {
          b.addEventListener('click', () => this.goToFolk(id));
        } else if (m.kind === 'place' && m.place) {
          // plano 2, bloco 13: a plaquinha do lugar abre o cartão dele
          const place = m.place;
          b.classList.add('map-placed');
          b.addEventListener('click', () => {
            this.ctrl.townPlace = place;
            this.tab = 'lot';
          });
        } else b.tabIndex = -1;
        this.tagsEl.append(b);
        this.tags.set(m.key, b);
      }
      const text = m.how ? `${m.text} · ${m.how}` : m.text;
      if (b.dataset.text !== text) {
        b.dataset.text = text;
        if (m.kind === 'lot') {
          const [num, ...rest] = text.split(' · ');
          b.replaceChildren(el('b', '', num), el('span', '', rest.join(' · ')));
        } else if (m.kind === 'folk') {
          b.replaceChildren(el('span', 'map-pin'), el('span', '', text));
        } else b.textContent = text;
      }
      b.style.left = `${(m.x * 100).toFixed(2)}%`;
      b.style.top = `${(m.y * 100).toFixed(2)}%`;
      b.classList.toggle('on', !!m.on);
      b.classList.toggle('hover', (m.kind === 'lot' && m.id === this.city.hover) || (m.kind === 'place' && !!m.place && m.place === this.city.hoverPlace));
    }
    for (const [key, b] of this.tags) {
      if (seen.has(key)) continue;
      b.remove();
      this.tags.delete(key);
    }
  }

  private render(): void {
    const world = this.ctrl.world;
    const town = world.town;
    if (!town) return;
    // cabeçalho: a cidade e o bairro do lote escolhido
    const picked = town.lots.find((l) => l.id === this.ctrl.townLot);
    const district = picked ? districtOf(town, picked) : { name: town.name, street: town.street };
    this.head.replaceChildren(
      el('div', 'town-title', town.city ? t('city.title', { name: town.city.name }) : t('town.title', { name: town.name })),
      el('div', 'panel-note', town.city ? t('city.district', { name: district.name, street: district.street }) : t('town.street', { street: town.street })),
    );
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
    const place = this.ctrl.townPlace ? this.ctrl.sim.catalog.places?.[this.ctrl.townPlace] : undefined;
    if (this.tab === 'families') this.renderFamilies();
    else if (place) this.renderPlace(place);
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
    d.append(el('div', 'town-sub', addressOf(world, lot)));
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
          if (town.city) this.renderGarage(d);
        }
      } else {
        if (town.city && !this.ctrl.houseEmpty) this.renderVisit(d, lot, fam.name);
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

  /**
   * Plano 2, bloco 13: o cartão de um lugar da cidade. Horário, lotação e
   * preço; nos lugares abertos, quem vai, o que fazer lá e o jeito de ir; nos
   * prédios fechados, quem está lá dentro (e até quando), como cada um se
   * porta no trabalho ou na escola e os recados que dá para fazer.
   */
  private renderPlace(def: PlaceDef): void {
    const d = this.detail;
    d.replaceChildren();
    const world = this.ctrl.world;
    const tick = world.tick;
    d.append(el('div', 'town-title', t(def.name)));
    const open = placeOpen(def, tick);
    const allDay = def.hours[0] === def.hours[1];
    const days = !def.days ? '' : def.days.length === 5 ? ` · ${t('place.days.weekdays')}` : ` · ${t('place.days.notSunday')}`;
    d.append(el('div', 'panel-note', `${allDay ? t('place.hoursAllDay') : t('place.hours', { open: def.hours[0], close: def.hours[1] })}${days}`));
    const span = (m: number) => (m >= 60 ? `${Math.floor(m / 60)}h${m % 60 ? String(m % 60).padStart(2, '0') : ''}` : `${m} min`);
    const shut = minutesToShut(def, tick);
    d.append(
      el(
        'div',
        `town-line ${open ? 'place-open' : 'place-closed'}`,
        open ? (allDay && shut >= 1440 ? t('place.openAllDay') : t('place.open', { time: span(shut) })) : t('place.closed', { time: span(minutesToOpen(def, tick)) }),
      ),
    );
    if (def.kind === 'venue') {
      d.append(el('div', 'panel-note', t('place.crowd', { n: crowdOf(def, tick), max: def.capacity })));
      d.append(el('div', 'panel-note', def.fee ? t('place.fee', { fee: formatMoney(def.fee) }) : t('place.free')));
      if (def.id === 'loja' && (world.household.pickup ?? []).length) d.append(el('div', 'town-line', t('place.pickup', { n: world.household.pickup!.length })));
      this.renderGoPlace(d, def);
      return;
    }
    // prédio fechado: quem está lá dentro
    d.append(el('div', 'town-sub', t('place.inside')));
    const inside = insideOf(world, this.ctrl.sim.catalog, def);
    const list = el('ul', 'town-people');
    for (const x of inside) {
      const li = el('li');
      li.append(el('b', '', x.folk.name), el('span', '', ` · ${t('place.leftTime', { time: formatClock(x.until) })}`));
      list.append(li);
    }
    if (!inside.length) list.append(el('li', 'panel-note', t('place.nobodyInside')));
    d.append(list);
    if (def.building === 'work' || def.building === 'school') {
      this.renderStyles(d, def.building);
      return;
    }
    this.renderErrands(d, def);
  }

  /** Plano 2, bloco 13: como cada um se porta no trabalho (ou na escola); vale até mudar. */
  private renderStyles(d: HTMLElement, kind: 'work' | 'school'): void {
    const people = this.ctrl.sim.household().filter((f) => (kind === 'work' ? !!f.job : !!f.kid && (f.age === 'child' || f.age === 'teen')));
    d.append(el('div', 'panel-note', t(kind === 'work' ? 'place.workHint' : 'place.schoolHint')));
    if (!people.length) {
      d.append(el('div', 'panel-note', t(kind === 'work' ? 'place.noWorkers' : 'place.noStudents')));
      return;
    }
    for (const f of people) {
      d.append(el('div', 'town-sub', f.name));
      const row = el('div', 'town-tabs place-styles');
      const styles: string[] = kind === 'work' ? WORK_STYLES : SCHOOL_STYLES;
      const now = (kind === 'work' ? f.job?.style : f.kid?.style) ?? 'steady';
      for (const st of styles) {
        const b = el('button', 'tab', t(`style.${kind}.${st}`));
        b.title = t(`style.${kind}.${st}.tip`);
        b.classList.toggle('on', st === now);
        b.addEventListener('click', () => {
          const cmd = kind === 'work' ? { type: 'setStyle' as const, folkId: f.id, work: st as WorkStyle } : { type: 'setStyle' as const, folkId: f.id, school: st as SchoolStyle };
          if (this.ctrl.cityCommand(cmd)) this.shownKey = '';
        });
        row.append(b);
      }
      d.append(row);
    }
  }

  /** Plano 2, bloco 13: quem vai e o jeito de ir (lugar aberto ou recado). */
  private pickGoers(d: HTMLElement): Folk[] {
    const people = this.ctrl.sim.household().filter((f) => f.age !== 'baby');
    const free = people.filter((f) => canGo(f));
    const chosen = (this.visitors ??= new Set(free.filter((f) => f.id === this.ctrl.selectedFolkId).map((f) => f.id)));
    for (const id of [...chosen]) if (!free.some((f) => f.id === id)) chosen.delete(id);
    d.append(el('div', 'town-sub', t('place.who')));
    const list = el('ul', 'town-people');
    for (const f of people) {
      const li = el('li');
      const label = el('label', 'town-check');
      const box = el('input');
      box.type = 'checkbox';
      box.checked = chosen.has(f.id);
      box.disabled = !canGo(f);
      box.addEventListener('change', () => {
        if (box.checked) chosen.add(f.id);
        else chosen.delete(f.id);
        this.shownKey = '';
      });
      label.append(box, el('span', '', f.name + (f.away ? ` · ${t(f.away.trip ? 'visit.onStreet' : 'outing.away')}` : '')));
      li.append(label);
      list.append(li);
    }
    d.append(list);
    return people.filter((f) => chosen.has(f.id));
  }

  private renderGoPlace(d: HTMLElement, def: PlaceDef): void {
    const world = this.ctrl.world;
    if (world.outing?.venue === def.id) {
      d.append(el('div', 'panel-note', t('place.hereNow')));
      return;
    }
    const home = activeLot(world);
    if (!home || this.ctrl.houseEmpty) return;
    if (world.trip || world.outing) {
      d.append(el('div', 'panel-note', t('place.busy')));
      return;
    }
    const goers = this.pickGoers(d);
    // o que fazer ao chegar
    d.append(el('div', 'town-sub', t('place.what')));
    const plans = el('div', 'place-plans');
    for (const p of [{ id: '', label: 'place.nothing' }, ...(def.plans ?? [])]) {
      const b = el('button', `tab${this.placePlan === p.id ? ' on' : ''}`, t(p.label));
      b.addEventListener('click', () => {
        this.placePlan = p.id;
        this.shownKey = '';
      });
      plans.append(b);
    }
    d.append(plans);
    const plan = this.ctrl.sim.catalog.venues?.[def.id];
    const length = plan ? streetRoute(world.town!, lotDoor(home, world.exit), placeDoor(def, plan.exit)).length : 0;
    this.visitMode = usableMode(world, goers, length, this.visitMode);
    d.append(
      travelPicker(world, goers, length, this.visitMode, (m) => {
        this.visitMode = m;
        this.shownKey = '';
      }),
    );
    const go = el('button', 'btn btn-go', t('place.go'));
    go.disabled = goers.length === 0;
    go.addEventListener('click', () => {
      const ids = goers.map((f) => f.id);
      if (this.ctrl.outingCommand({ type: 'goDowntown', folkIds: ids, mode: this.visitMode, place: def.id, ...(this.placePlan ? { plan: this.placePlan } : {}) })) {
        this.ctrl.toast(t('place.went', { place: t(def.name) }));
        this.visitors = null;
      }
    });
    d.append(go, el('div', 'panel-note', t('place.dateHint')));
  }

  private renderErrands(d: HTMLElement, def: PlaceDef): void {
    const world = this.ctrl.world;
    const home = activeLot(world);
    const errands = def.errands ?? [];
    if (!errands.length || !home || this.ctrl.houseEmpty) return;
    d.append(el('div', 'town-sub', t('place.errands')));
    if (!this.errand || !errands.some((e) => e.id === this.errand)) this.errand = errands[0].id;
    const list = el('div', 'place-plans');
    for (const e of errands) {
      const b = el('button', `tab${this.errand === e.id ? ' on' : ''}`);
      b.append(el('b', '', t(e.label)), el('span', '', ` · ${e.cost ? t('place.errandCost', { minutes: e.minutes, cost: formatMoney(e.cost) }) : t('place.errandFree', { minutes: e.minutes })}`));
      b.addEventListener('click', () => {
        this.errand = e.id;
        this.shownKey = '';
      });
      list.append(b);
    }
    d.append(list);
    if (world.trip || world.outing) {
      d.append(el('div', 'panel-note', t('place.busy')));
      return;
    }
    const goers = this.pickGoers(d);
    const length = streetRoute(world.town!, lotDoor(home, world.exit), placeDoor(def)).length;
    this.visitMode = usableMode(world, goers, length, this.visitMode, true);
    d.append(
      travelPicker(
        world,
        goers,
        length,
        this.visitMode,
        (m) => {
          this.visitMode = m;
          this.shownKey = '';
        },
        true,
      ),
    );
    const errand = errands.find((e) => e.id === this.errand)!;
    const go = el('button', 'btn btn-go', t('place.errandGo'));
    go.disabled = goers.length === 0 || (!!errand.adult && !goers.some((f) => isAdult(f)));
    go.addEventListener('click', () => {
      if (this.ctrl.cityCommand({ type: 'runErrand', folkIds: goers.map((f) => f.id), place: def.id, errand: errand.id, mode: this.visitMode })) {
        this.ctrl.toast(t('place.errandLeft', { errand: t(errand.label) }));
        this.visitors = null;
      }
    });
    d.append(go);
  }

  /** Plano 2, bloco 12: clicar no ícone de alguém da família leva a câmera até ele (ou segue a viagem). */
  private goToFolk(id: number): void {
    const f = this.ctrl.sim.findFolk(id);
    if (!f || f.visit) return;
    this.ctrl.selectedFolkId = id;
    if (f.away?.trip && this.ctrl.world.trip) {
      this.ctrl.followTrip = true;
      this.ctrl.viewRequest = { zoom: 34, where: 'here' };
      return;
    }
    if (!this.ctrl.world.folks.includes(f)) {
      this.ctrl.viewRequest = { zoom: 20, where: 'home' };
      return;
    }
    this.ctrl.closeTown();
  }

  /** Plano 2, bloco 12: quem vai visitar a família deste lote, e como. */
  private renderVisit(d: HTMLElement, lot: Lot, family: string): void {
    const world = this.ctrl.world;
    const home = activeLot(world);
    if (!home || world.outing) return;
    d.append(el('div', 'town-sub', t('visit.title', { family })));
    if (world.trip) {
      d.append(el('div', 'panel-note', t('visit.busy')));
      return;
    }
    const people = this.ctrl.sim.household().filter((f) => f.age !== 'baby');
    const free = people.filter((f) => canGo(f));
    const chosen = (this.visitors ??= new Set(free.filter((f) => f.id === this.ctrl.selectedFolkId).map((f) => f.id)));
    for (const id of [...chosen]) if (!free.some((f) => f.id === id)) chosen.delete(id);
    const list = el('ul', 'town-people');
    for (const f of people) {
      const li = el('li');
      const label = el('label', 'town-check');
      const box = el('input');
      box.type = 'checkbox';
      box.checked = chosen.has(f.id);
      box.disabled = !canGo(f);
      box.addEventListener('change', () => {
        if (box.checked) chosen.add(f.id);
        else chosen.delete(f.id);
        this.shownKey = '';
      });
      label.append(box, el('span', '', f.name + (f.away ? ` · ${t(f.away.trip ? 'visit.onStreet' : 'outing.away')}` : '')));
      li.append(label);
      list.append(li);
    }
    d.append(list);
    const goers = people.filter((f) => chosen.has(f.id));
    const length = streetRoute(world.town!, lotDoor(home, world.exit), lotDoor(lot, lot.home?.exit ?? world.exit)).length;
    this.visitMode = usableMode(world, goers, length, this.visitMode, true);
    d.append(
      travelPicker(
        world,
        goers,
        length,
        this.visitMode,
        (m) => {
          this.visitMode = m;
          this.shownKey = '';
        },
        true,
      ),
    );
    const go = el('button', 'btn btn-go', t('visit.go'));
    go.disabled = goers.length === 0;
    go.addEventListener('click', () => {
      if (this.ctrl.cityCommand({ type: 'visitLot', folkIds: [...chosen], lotId: lot.id, mode: this.visitMode })) {
        this.ctrl.toast(t('visit.left', { family }));
        this.visitors = null;
      }
    });
    d.append(go, el('div', 'panel-note', t('visit.hint')));
  }

  /** Plano 2, bloco 12: bicicletas e carro da família (comprar e vender). */
  private renderGarage(d: HTMLElement): void {
    const world = this.ctrl.world;
    const owned = vehiclesOf(world);
    const bikes = owned.filter((v) => v === 'bike').length;
    const hasCar = owned.includes('car');
    d.append(el('div', 'town-sub', t('garage.title')));
    d.append(el('div', 'panel-note', t('garage.has', { bikes, car: t(hasCar ? 'garage.car' : 'garage.noCar') })));
    const row = el('div', 'town-actions');
    const add = (label: string, enabled: boolean, cmd: Parameters<GameController['cityCommand']>[0], toast: string) => {
      const b = el('button', 'btn btn-small', label);
      b.disabled = !enabled;
      b.addEventListener('click', () => {
        if (this.ctrl.cityCommand(cmd)) this.ctrl.toast(toast);
      });
      row.append(b);
    };
    add(t('garage.buyBike', { price: formatMoney(VEHICLE_PRICE.bike) }), world.household.funds >= VEHICLE_PRICE.bike, { type: 'buyVehicle', kind: 'bike' }, t('garage.boughtBike'));
    if (hasCar) add(t('garage.sellCar', { price: formatMoney(VEHICLE_PRICE.car / 2) }), true, { type: 'sellVehicle', kind: 'car' }, t('garage.soldCar'));
    else add(t('garage.buyCar', { price: formatMoney(VEHICLE_PRICE.car) }), world.household.funds >= VEHICLE_PRICE.car, { type: 'buyVehicle', kind: 'car' }, t('garage.boughtCar'));
    if (bikes) add(t('garage.sellBike', { price: formatMoney(VEHICLE_PRICE.bike / 2) }), true, { type: 'sellVehicle', kind: 'bike' }, t('garage.soldBike'));
    d.append(row, el('div', 'panel-note', t('garage.hint')));
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
      const where = lot ? addressOf(world, lot) : t('bin.inBin');
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

/** Plano 2, bloco 13: muda quando alguém troca de emprego, de jeito ou entra no prédio (o cartão refaz). */
function world_jobs(world: { folks: Folk[] }): string {
  return world.folks.map((f) => `${f.job?.style ?? ''}${f.kid?.style ?? ''}${f.away ? 'a' : ''}`).join('');
}
