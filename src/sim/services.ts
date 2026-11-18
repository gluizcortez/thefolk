import { MINUTES_PER_DAY, clockOf, nightAmount } from './clock';
import { isAdult } from './kids';
import { formatMoney, objectBusy, sellValue } from './economy';
import type { Nav } from './grid';
import { floorAt, inBounds, useTiles } from './grid';
import type { Logger } from './gossip';
import { createNews, learnNews } from './gossip';
import { NEED_MAX } from './needs';
import { findPathToAny } from './pathfinding';
import { nextFloat, nextInt } from './rng';
import { careAvailable, interactionOpen, messTaken, messTiles, stateOf } from './upkeep';
import type {
  Bill,
  Catalog,
  Folk,
  InteractionDef,
  Mess,
  Neighbor,
  ServiceKind,
  ServiceOrder,
  Vec,
  World,
  WorldObject,
} from './types';

// Bloco 2: despensa, correio e prestadores de serviço. A comida da geladeira
// acaba e precisa ser comprada; as contas chegam como cartas e, sem pagar,
// vem o oficial de penhora; pelo telefone dá para pedir mercado, comida
// pronta, faxineira e técnico. Quem chega toca a campainha e espera alguém
// atender. Tudo puro e determinístico pelo RNG do mundo.

// ---------- números ----------

/** porções com que a casa começa */
export const START_PANTRY = 16;
/** mercado por telefone: porções e preço (pago na hora da ligação) */
export const GROCERIES = { portions: 12, price: 55 };
/** feira de sábado na calçada: mais barata para quem vai a pé */
export const FAIR = { portions: 12, price: 36, day: 5, from: 6, to: 10 };
/** comida pronta: porções, preço, prazo prometido (minutos) e gorjeta */
export const TAKEOUT = { portions: 3, price: 30, promise: 60, tip: 4, from: 10, to: 23 };
/** faxineira: diária, hora em que chega e quanto tempo fica no máximo */
export const MAID = { fee: 45, hour: 9, hours: 3 };
/** bloco 13: jardineiro: diária, hora em que chega, horas no máximo e a partir de quanto rega */
export const GARDENER = { fee: 30, hour: 8, hours: 2, waterBelow: 70 };
/** técnico: visita mais hora trabalhada */
export const REPAIR = { base: 40, hourly: 20, from: 8, to: 18 };
/** dias para pagar a conta; depois disso mais tantos dias até a penhora */
export const BILL_DUE_DAYS = 3;
export const BAILIFF_GRACE_DAYS = 3;
/** hora em que o oficial de penhora passa (se houver conta vencida demais) */
export const BAILIFF_HOUR = 10;
/** hora em que o jornal chega */
export const PAPER_HOUR = 6;
/** minutos que cada um espera alguém atender a porta */
export const RING_WAIT: Record<ServiceKind | 'guest', number> = {
  guest: 30,
  courier: 20,
  maid: 15,
  repair: 15,
  bailiff: 0,
  waiter: 0,
  social: 0,
  gardener: 15,
  // bloco 14: bombeiros, polícia, gatuno e o Seu Sereno não tocam a campainha
  firefighter: 0,
  police: 0,
  burglar: 0,
  reaper: 0,
};
/** jornais velhos acumulados na calçada, no máximo */
const MAX_PAPERS = 4;
/** horário de entrega do mercado */
const SHOP_FROM = 8;
const SHOP_TO = 21;

// ---------- despensa ----------

/** Quantas porções cabem nas geladeiras da casa. */
export function pantryCapacity(world: World, catalog: Catalog): number {
  let cap = 0;
  for (const obj of world.objects) cap += catalog.objects[obj.defId]?.pantry ?? 0;
  return cap;
}

/** Guarda porções na despensa; o que não cabe estraga. Devolve quanto se perdeu. */
export function stockPantry(world: World, catalog: Catalog, portions: number): number {
  const house = world.household;
  const cap = pantryCapacity(world, catalog);
  const room = Math.max(0, cap - house.pantry);
  const kept = Math.min(room, portions);
  house.pantry += kept;
  return portions - kept;
}

/** Porções que já estão a caminho (mercado pedido). */
export function incomingPortions(world: World): number {
  const ordered = world.household.orders.filter((o) => o.kind === 'groceries').length;
  // o entregador já está na porta com as sacolas
  const atDoor = world.folks.filter((f) => f.visit?.service?.order === 'groceries' && !f.visit.leaving).length;
  return (ordered + atDoor) * GROCERIES.portions;
}

/** A feira está montada agora? (sábado de manhã) */
export function fairOpen(tick: number): boolean {
  const day = Math.floor(tick / MINUTES_PER_DAY);
  const hour = clockOf(tick).hour;
  return day % 7 === FAIR.day && hour >= FAIR.from && hour < FAIR.to;
}

/** A interação tem o que precisa da casa (comida, contas, feira)? */
export function interactionReady(world: World, it: InteractionDef): boolean {
  const house = world.household;
  if (it.portions && house.pantry < it.portions) return false;
  if (it.takeout && house.takeout <= 0) return false;
  if (it.special === 'payBills') return unpaidBills(world).length > 0;
  if (it.special === 'fair') return fairOpen(world.tick);
  // bloco 14: extintor e ligações de socorro só quando há o que fazer
  if (it.special === 'douse') return (world.fires ?? []).length > 0;
  if (it.special === 'callFire') return (world.fires ?? []).length > 0 && (world.help?.fire ?? 0) === 0;
  if (it.special === 'callPolice') {
    return (world.help?.police ?? 0) === 0 && world.folks.some((f) => f.visit?.service?.kind === 'burglar' && !f.visit.leaving);
  }
  // bloco 4: luneta só com o céu escuro
  if (it.night) return nightAmount((world.tick % MINUTES_PER_DAY) / MINUTES_PER_DAY) >= NIGHT_SKY;
  return true;
}

/** quão escuro o céu precisa estar para dar de ver as estrelas */
export const NIGHT_SKY = 0.5;

/** Dá para usar esta interação agora: objeto inteiro (ou cuidado com o que fazer) e a casa tem o que precisa. */
export function canUse(world: World, obj: WorldObject, it: InteractionDef): boolean {
  return interactionOpen(obj, it) && interactionReady(world, it);
}

/** Tira da casa o que a interação consome ao começar. */
export function consumeFor(world: World, it: InteractionDef): void {
  const house = world.household;
  if (it.portions) house.pantry = Math.max(0, house.pantry - it.portions);
  if (it.takeout) house.takeout = Math.max(0, house.takeout - 1);
}

/** A feira: compra a pé, mais barato. Devolve false se faltou dinheiro. */
export function buyAtFair(world: World, catalog: Catalog, log: Logger, folk: Folk): boolean {
  const house = world.household;
  if (house.funds < FAIR.price) {
    log('log.noMoney', { name: folk.name });
    return false;
  }
  house.funds -= FAIR.price;
  const lost = stockPantry(world, catalog, FAIR.portions);
  log(lost > 0 ? 'log.fairSpoiled' : 'log.fairBought', {
    name: folk.name,
    portions: FAIR.portions - lost,
    price: formatMoney(FAIR.price),
  });
  return true;
}

// ---------- contas ----------

export function billTotal(b: Bill): number {
  return b.power + b.water + b.furniture;
}

export function billLeft(b: Bill): number {
  return Math.max(0, billTotal(b) - b.covered);
}

/** Contas ainda não pagas, da mais velha para a mais nova. */
export function unpaidBills(world: World): Bill[] {
  return world.household.bills.filter((b) => billLeft(b) > 0);
}

export function debtOf(world: World): number {
  return unpaidBills(world).reduce((s, b) => s + billLeft(b), 0);
}

/** Contas vencidas há mais de BAILIFF_GRACE_DAYS dias (motivo para penhora). */
export function seizableBills(world: World): Bill[] {
  return unpaidBills(world).filter((b) => world.tick >= b.due + BAILIFF_GRACE_DAYS * MINUTES_PER_DAY);
}

/**
 * Monta a conta do período: luz (aparelhos, eletrônicos e luminárias), água
 * (encanamento e quem mora) e o resto pelo valor dos móveis.
 */
export function makeBill(world: World, catalog: Catalog, amount: number): Bill {
  let power = 0;
  let water = 0;
  let rest = 0;
  for (const obj of world.objects) {
    const def = catalog.objects[obj.defId];
    if (!def) continue;
    const v = obj.paid > 0 ? obj.paid : def.price;
    if (def.category === 'electronics' || def.category === 'appliances' || def.category === 'lighting') power += v;
    else if (def.category === 'plumbing') water += v;
    else rest += v;
  }
  const total = power + water + rest || 1;
  const residents = world.folks.filter((f) => !f.visit).length;
  // a parte fixa vai para luz e água; o resto se divide pelo valor
  const variable = Math.max(0, amount - 25);
  const p = Math.round(10 + (variable * power) / total);
  const w = Math.round(15 + (variable * water) / total + residents);
  const furniture = Math.max(0, amount - p - w);
  return {
    id: world.nextId++,
    tick: world.tick,
    due: world.tick + BILL_DUE_DAYS * MINUTES_PER_DAY,
    power: p,
    water: w,
    furniture,
    covered: 0,
  };
}

/**
 * Paga as contas da mais velha para a mais nova, enquanto houver dinheiro
 * (conta só é paga inteira). Devolve quanto pagou.
 */
export function payBills(world: World, log: Logger, folk: Folk): number {
  const house = world.household;
  let paid = 0;
  let left = 0;
  for (const b of unpaidBills(world)) {
    const due = billLeft(b);
    if (house.funds < due) {
      left++;
      continue;
    }
    house.funds -= due;
    b.covered += due;
    paid += due;
  }
  house.bills = house.bills.filter((b) => billLeft(b) > 0);
  if (paid > 0) log(left > 0 ? 'log.billsPartly' : 'log.billsPaid', { name: folk.name, amount: formatMoney(paid) });
  else if (left > 0) log('log.billsNoMoney', { name: folk.name });
  return paid;
}

/** O oficial levou um objeto: o valor de revenda abate as contas vencidas. */
export function creditSeizure(world: World, value: number): number {
  let rest = value;
  for (const b of seizableBills(world)) {
    const take = Math.min(rest, billLeft(b));
    b.covered += take;
    rest -= take;
    if (rest <= 0) break;
  }
  world.household.bills = world.household.bills.filter((b) => billLeft(b) > 0);
  return value - rest;
}

/** O que o oficial leva em seguida: o objeto de mais valor que não está em uso. */
export function seizeTarget(world: World, catalog: Catalog, nav: Nav, from: Vec): WorldObject | null {
  let best: WorldObject | null = null;
  let bestV = 0;
  for (const obj of world.objects) {
    const def = catalog.objects[obj.defId];
    if (!def || def.fixture || objectBusy(world, obj.id)) continue;
    const v = sellValue(world, obj, def);
    if (v <= bestV) continue;
    if (!findPathToAny(nav, from, besideTiles(world, catalog, nav, obj))) continue;
    best = obj;
    bestV = v;
  }
  return best;
}

/** Tiles livres em volta do objeto, de qualquer lado (para o oficial chegar perto). */
export function besideTiles(world: World, catalog: Catalog, nav: Nav, obj: WorldObject): Vec[] {
  const def = catalog.objects[obj.defId];
  if (!def) return [];
  return useTiles(world, nav, obj, { ...def, useSides: undefined });
}

// ---------- jornal ----------

/** Onde o jornal cai: na calçada, ao lado de onde a condução para. */
export function paperSpot(world: World): Vec {
  const { x, y } = world.exit;
  return inBounds(world.grid, x - 1, y) ? { x: x - 1, y } : { x, y };
}

/** Chega o jornal do dia (jornais velhos não recolhidos ficam acumulando). */
export function deliverPaper(world: World): Mess | null {
  const papers = world.mess.filter((m) => m.kind === 'paper');
  if (papers.length >= MAX_PAPERS) return null;
  const spot = paperSpot(world);
  const day = Math.floor(world.tick / MINUTES_PER_DAY);
  world.household.paperDay = day;
  const mess: Mess = { id: world.nextId++, kind: 'paper', x: spot.x, y: spot.y, tick: world.tick, by: 0 };
  world.mess.push(mess);
  return mess;
}

/** O jornal é de hoje? */
export function freshPaper(world: World, mess: Mess): boolean {
  return mess.kind === 'paper' && Math.floor(mess.tick / MINUTES_PER_DAY) === Math.floor(world.tick / MINUTES_PER_DAY);
}

/** Os classificados de hoje já foram lidos (as vagas aparecem no painel)? */
export function classifiedsOpen(world: World): boolean {
  return world.household.readDay === Math.floor(world.tick / MINUTES_PER_DAY);
}

/**
 * Ler o jornal de hoje: abre os classificados do dia e traz uma notícia do
 * bairro que o folk ainda não sabia (a fofoca também sai no jornal).
 */
export function readPaper(world: World, catalog: Catalog, log: Logger, folk: Folk): void {
  world.household.readDay = Math.floor(world.tick / MINUTES_PER_DAY);
  folk.needs.fun = Math.min(NEED_MAX, folk.needs.fun + 8);
  const fresh = [...world.news]
    .reverse()
    .find((n) => n.about !== folk.id && !n.knownBy.includes(folk.id) && catalog.news[n.kind]);
  if (fresh && learnNews(world, catalog, () => {}, fresh, folk.id, 'saw')) {
    const def = catalog.news[fresh.kind];
    const about = personName(world, fresh.about);
    log('log.paperNews', { name: folk.name, news: def.label, about, other: personName(world, fresh.other) });
  } else {
    log('log.paperRead', { name: folk.name });
  }
}

function personName(world: World, id: number): string {
  return world.folks.find((f) => f.id === id)?.name ?? world.neighbors.find((n) => n.id === id)?.name ?? '';
}

// ---------- quem presta serviço ----------

/** O vizinho que faz este serviço (o primeiro da lista). */
export function serviceNeighbor(world: World, kind: ServiceKind): Neighbor | undefined {
  return world.neighbors.find((n) => n.service === kind);
}

/** Que tipo de prestador atende cada pedido. */
export function providerOf(order: ServiceOrder): ServiceKind {
  if (order === 'groceries' || order === 'takeout') return 'courier';
  return order;
}

/** Preço anunciado de cada serviço no telefone. */
export function servicePrice(order: ServiceOrder): number {
  switch (order) {
    case 'groceries':
      return GROCERIES.price;
    case 'takeout':
      return TAKEOUT.price;
    case 'maid':
      return MAID.fee;
    case 'gardener':
      return GARDENER.fee;
    case 'repair':
      return REPAIR.base;
  }
}

/** Primeiro tick a partir de `tick` que cai entre `from` e `to` horas. */
function withinHours(tick: number, from: number, to: number): number {
  const hour = clockOf(tick).hour;
  if (hour >= from && hour < to) return tick;
  const day = Math.floor(tick / MINUTES_PER_DAY) + (hour >= to ? 1 : 0);
  return day * MINUTES_PER_DAY + from * 60 + (tick % 7);
}

export type OrderProblem = 'funds' | 'closed' | 'already' | null;

/** Dá para pedir isto agora? (para o telefone recusar antes de ligar) */
export function orderProblem(world: World, order: ServiceOrder): OrderProblem {
  const house = world.household;
  if (order === 'groceries' && house.funds < GROCERIES.price) return 'funds';
  if (order === 'takeout') {
    const hour = clockOf(world.tick).hour;
    if (hour < TAKEOUT.from || hour >= TAKEOUT.to) return 'closed';
    if (house.funds < TAKEOUT.price) return 'funds';
    if (house.orders.some((o) => o.kind === 'takeout')) return 'already';
  }
  if (order === 'maid' && house.maid) return 'already';
  if (order === 'gardener' && house.gardener) return 'already';
  if (order === 'repair' && house.orders.some((o) => o.kind === 'repair')) return 'already';
  return null;
}

/**
 * Fim da ligação: o pedido vira uma entrega a caminho (mercado já sai pago),
 * a faxineira passa a vir todo dia, o técnico marca a visita.
 */
export function placeOrder(world: World, log: Logger, folk: Folk, order: ServiceOrder): boolean {
  const house = world.household;
  const problem = orderProblem(world, order);
  if (problem) {
    log(problem === 'funds' ? 'log.noMoney' : problem === 'closed' ? 'log.orderClosed' : 'log.orderAlready', {
      name: folk.name,
    });
    return false;
  }
  const tick = world.tick;
  if (order === 'maid') {
    house.maid = true;
    log('log.maidHired', { name: folk.name, fee: formatMoney(MAID.fee) });
    return true;
  }
  if (order === 'gardener') {
    house.gardener = true;
    log('log.gardenerHired', { name: folk.name, fee: formatMoney(GARDENER.fee) });
    return true;
  }
  let at: number;
  let promised = 0;
  let price = 0;
  if (order === 'groceries') {
    house.funds -= GROCERIES.price;
    at = withinHours(tick + 45 + nextInt(world, 45), SHOP_FROM, SHOP_TO);
  } else if (order === 'takeout') {
    promised = tick + TAKEOUT.promise;
    at = tick + 30 + nextInt(world, 45);
    price = TAKEOUT.price;
  } else {
    at = withinHours(tick + 60 + nextInt(world, 60), REPAIR.from, REPAIR.to);
  }
  house.orders.push({ id: world.nextId++, kind: order, at, promised, by: folk.id, price });
  log(`log.ordered.${order}`, { name: folk.name, when: clockText(at), price: formatMoney(servicePrice(order)) });
  return true;
}

function clockText(tick: number): string {
  const c = clockOf(tick);
  return `${String(c.hour).padStart(2, '0')}:${String(c.minute).padStart(2, '0')}`;
}

// ---------- porta e campainha ----------

/**
 * Tile do lado de fora da porta da frente: a porta entre dentro e fora mais
 * perto de onde a condução para. Sem porta, a própria calçada.
 */
export function frontDoor(world: World, catalog: Catalog): Vec {
  const grid = world.grid;
  const outdoor = (x: number, y: number) => !inBounds(grid, x, y) || catalog.floors[floorAt(grid, x, y)]?.outdoor === true;
  let best: Vec | null = null;
  let bestD = Infinity;
  for (const [key, kind] of Object.entries(grid.edges)) {
    if (kind !== 'door') continue;
    const [xs, ys, side] = key.split(',');
    const x = Number(xs);
    const y = Number(ys);
    const bx = side === 'N' ? x : x - 1;
    const by = side === 'N' ? y - 1 : y;
    const a = outdoor(x, y);
    const b = outdoor(bx, by);
    if (a === b) continue;
    const out = a ? { x, y } : { x: bx, y: by };
    if (!inBounds(grid, out.x, out.y)) continue;
    const d = Math.abs(out.x - world.exit.x) + Math.abs(out.y - world.exit.y);
    if (d < bestD) {
      bestD = d;
      best = out;
    }
  }
  return best ?? { ...world.exit };
}

/** Quem está tocando a campainha e ainda não foi atendido. */
export function ringing(world: World): Folk[] {
  return world.folks.filter((f) => f.visit && !f.visit.admitted && !f.visit.leaving && f.visit.rang >= 0);
}

/** Alguém já está indo atender este visitante? */
export function doorTaken(world: World, visitorId: number, except?: Folk): boolean {
  return world.folks.some((f) => f !== except && f.queue.some((a) => a.kind === 'door' && a.otherId === visitorId));
}

/** Quanto tempo o visitante espera na porta antes de desistir. */
export function ringWait(folk: Folk): number {
  return RING_WAIT[folk.visit?.service?.kind ?? 'guest'];
}

// ---------- trabalho de quem presta serviço ----------

export interface ServiceTask {
  objectId?: number;
  interactionId?: string;
  messId?: number;
}

/**
 * Próxima tarefa da faxineira ou do técnico, a mais perto primeiro. A
 * faxineira recolhe bagunça (menos o jornal do dia, que é da casa), limpa e
 * esvazia a lixeira; o técnico conserta o que quebrou e revisa o que está gasto.
 */
export function serviceTask(world: World, catalog: Catalog, folk: Folk, nav: Nav): ServiceTask | null {
  const kind = folk.visit?.service?.kind;
  let best: (ServiceTask & { score: number }) | null = null;
  const consider = (task: ServiceTask, score: number, tiles: Vec[]) => {
    if (best && best.score >= score + 40) return;
    const path = findPathToAny(nav, folk, tiles);
    if (!path) return;
    const s = score - path.length;
    if (!best || s > best.score) best = { ...task, score: s };
  };
  for (const obj of world.objects) {
    const def = catalog.objects[obj.defId];
    if (!def) continue;
    for (const it of def.interactions) {
      if (!it.care || it.hidden || !careAvailable(obj, it)) continue;
      const s = stateOf(obj);
      let score = 0;
      if (kind === 'maid') {
        if (it.care === 'clean' && s.dirt >= 15) score = 40 + s.dirt / 2;
        else if (it.care === 'empty' && s.fill >= 30) score = 45 + s.fill / 4;
      } else if (kind === 'repair') {
        if (it.care === 'repair') score = 100;
        else if (it.care === 'service' && s.wear >= 35) score = 40 + s.wear / 2;
      } else if (kind === 'gardener' && obj.plant) {
        // bloco 13: rega o que tem sede e colhe o que amadureceu (não replanta: isso custa)
        if (it.care === 'water' && obj.plant.water < GARDENER.waterBelow) score = 40 + (100 - obj.plant.water) / 2;
        else if (it.care === 'harvest') score = 50;
      }
      if (score <= 0) continue;
      if (world.folks.some((f) => f !== folk && f.queue[0]?.objectId === obj.id && f.queue[0].phase !== 'queued')) continue;
      consider({ objectId: obj.id, interactionId: it.id }, score, useTiles(world, nav, obj, def));
    }
  }
  if (kind === 'maid') {
    for (const mess of world.mess) {
      if (freshPaper(world, mess) || messTaken(world, mess.id, folk)) continue;
      consider({ messId: mess.id }, 60, messTiles(world, nav, mess));
    }
  }
  const found = best as (ServiceTask & { score: number }) | null;
  if (!found) return null;
  return { objectId: found.objectId, interactionId: found.interactionId, messId: found.messId };
}

/**
 * A faxineira terminou: a casa paga a diária e, se a bagunça era grande,
 * ela comenta por aí (vira notícia sobre quem mais sujou).
 */
export function finishMaid(world: World, catalog: Catalog, log: Logger, folk: Folk): void {
  const sv = folk.visit?.service;
  if (!sv) return;
  world.household.funds -= sv.fee;
  log('log.maidDone', { name: folk.name, done: sv.done, fee: formatMoney(sv.fee) });
  if (sv.done >= 6 && sv.blame && nextFloat(world) < 0.6) {
    createNews(world, catalog, log, 'messyHouse', sv.blame, folk.id);
  }
}

/** Bloco 13: o jardineiro terminou: a casa paga a diária. */
export function finishGardener(world: World, log: Logger, folk: Folk): void {
  const sv = folk.visit?.service;
  if (!sv) return;
  world.household.funds -= sv.fee;
  log('log.gardenerDone', { name: folk.name, done: sv.done, fee: formatMoney(sv.fee) });
}

/** Bloco 13: tem planta no lote (o jardineiro só vem se tiver)? */
export function hasPlants(world: World, catalog: Catalog): boolean {
  return world.objects.some((o) => !!catalog.objects[o.defId]?.plant);
}

/** O técnico terminou: cobra a visita mais as horas trabalhadas. */
export function repairBill(sv: { started: number }, tick: number): number {
  const hours = Math.max(1, Math.ceil((tick - sv.started) / 60));
  return REPAIR.base + REPAIR.hourly * hours;
}

// ---------- IA: tarefas da casa ligadas ao bloco 2 ----------

export interface HouseOption {
  objectId: number;
  interactionId: string;
  serviceId?: ServiceOrder;
  score: number;
}

/**
 * O que a casa precisa resolver por telefone ou na calçada: pedir comida
 * quando a despensa acaba, comprar na feira, pagar as contas.
 */
export function houseOptions(world: World, catalog: Catalog, folk: Folk): HouseOption[] {
  // bloco 11: compras, feira e contas são coisa de adulto
  if (folk.visit || !isAdult(folk)) return [];
  const house = world.household;
  const out: HouseOption[] = [];
  const hungry = 1 - folk.needs.hunger / NEED_MAX;
  const cap = pantryCapacity(world, catalog);
  const stock = house.pantry + incomingPortions(world);
  for (const obj of world.objects) {
    const def = catalog.objects[obj.defId];
    if (!def || stateOf(obj).broken) continue;
    for (const it of def.interactions) {
      if (it.special === 'services') {
        if (cap > 0 && stock < 4 && house.funds >= GROCERIES.price + 15 && !fairOpen(world.tick)) {
          out.push({ objectId: obj.id, interactionId: it.id, serviceId: 'groceries', score: 22 + 30 * hungry });
        }
        if (
          house.pantry === 0 &&
          house.takeout === 0 &&
          folk.needs.hunger < 45 &&
          orderProblem(world, 'takeout') === null &&
          house.funds >= TAKEOUT.price + 10
        ) {
          out.push({ objectId: obj.id, interactionId: it.id, serviceId: 'takeout', score: 30 + 30 * hungry });
        }
      } else if (it.special === 'payBills' && interactionReady(world, it)) {
        const oldest = unpaidBills(world)[0];
        if (oldest && house.funds >= billLeft(oldest)) {
          const days = (world.tick - oldest.tick) / MINUTES_PER_DAY;
          out.push({ objectId: obj.id, interactionId: it.id, score: 16 + Math.min(40, days * 10) });
        }
      } else if (it.special === 'fair' && interactionReady(world, it)) {
        if (house.pantry <= cap - 8 && house.funds >= FAIR.price + 15) {
          out.push({ objectId: obj.id, interactionId: it.id, score: 26 });
        }
      }
    }
  }
  return out;
}
