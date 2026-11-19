import { MINUTES_PER_DAY } from './clock';
import { BILL_BASE, BILL_RATE, checkPlacement, formatMoney, objectValue, sellValue } from './economy';
import { cleanName, copyTemper, familyProblem, memberSeed } from './family';
import { applyFamilyTies } from './ties';
import type { FamilyDraft } from './family';
import { introduce } from './gossip';
import { buildNav, footprint, levelOfRow, storied } from './grid';
import { savingsOf, spotNear, spouseOf } from './marriage';
import { ageNeighbor, copyLife, estateOf, fitKid, heirsOf, splitEstate } from './life';
import { personOf } from './people';
import { ensureRelation, relationOf } from './relations';
import { nextFloat, nextInt } from './rng';
import { roofArea } from './roof';
import { START_PANTRY } from './services';
import { ensureInterests } from './topics';
import { freshState } from './upkeep';
import { newJob } from './career';
import { surnameOf } from './kids';
import { lotDoor, streetRoute } from './city';
import { firstBillAfter, freshHousehold, gridFromMap, makeFolk } from './world';
import type { ObjectSeed, RoomStyle } from './world';
import type { Catalog, Family, Folk, Grid, Lot, LotHome, LogEntry, Neighbor, Town, Vec, World, WorldObject } from './types';

// Bloco 15: o bairro. O World continua sendo o lote em jogo (grid, objetos,
// moradores, caixa da casa); os outros lotes guardam a casa em `Lot.home` e as
// outras famílias vivem como vizinhos (Neighbor.home = id da família), com a
// vida andando de forma resumida uma vez por dia (salário, gastos, amizades).
// Trocar de família guarda a de agora (FamilyStash) e abre a outra.

export type TownProblem = 'noTown' | 'noFamily' | 'sameFamily' | 'noLot' | 'lotTaken' | 'sameLot' | 'cantAfford' | 'busyLot' | 'badDraft';

/** Tostões com que uma família nova chega ao bairro (o terreno sai daqui). */
export const NEW_FAMILY_FUNDS = 6000;
/** Quanto a vida resumida gasta por pessoa por dia (comida e miudezas). */
export const DAILY_UPKEEP = 18;
/** Entradas guardadas no mural do bairro. */
export const FEED_MAX = 24;
/** Amizade de quem mora junto no começo. */
export const HOUSEMATE_FRIENDSHIP = 35;
/** Chance por dia de um morador de fora de jogo passar na casa de um amigo (resumido). */
export const VISIT_CHANCE = 0.18;
/** Hora em que a vida das outras casas anda (de madrugada). */
export const TOWN_HOUR = 3;

// ---------- planta do bairro (vem de data/town.ts) ----------

export interface HousePlan {
  map: string[];
  rooms: Record<string, RoomStyle>;
  doors: string[];
  windows: string[];
  objects: ObjectSeed[];
  exit: Vec;
}

export interface LotPlan {
  number: number;
  side: 0 | 1;
  col: number;
  land: number;
  /** id da planta da casa (sem = terreno vazio) */
  house?: string;
  /** quem mora (nomes de vizinhos) */
  family?: { name: string; members: string[]; funds: number };
  /** o lote da família em jogo (a casa dela é a do World) */
  home?: boolean;
}

export interface TownPlan {
  name: string;
  street: string;
  houses: Record<string, HousePlan>;
  lots: LotPlan[];
  /** plano 2, bloco 12: nome da cidade (sem ele, o bairro fica sozinho, como nos testes antigos) */
  city?: string;
  /** plano 2, bloco 12: os outros bairros da cidade (o primeiro é o deste plano) */
  districts?: DistrictPlan[];
}

/** Plano 2, bloco 12: um bairro a mais na cidade. */
export interface DistrictPlan {
  name: string;
  street: string;
  lots: LotPlan[];
}

// ---------- consultas ----------

export function activeFamily(world: World): Family | undefined {
  const town = world.town;
  return town?.families.find((f) => f.id === town.active);
}

export function familyById(world: World, id: number): Family | undefined {
  return world.town?.families.find((f) => f.id === id);
}

export function lotById(world: World, id: number): Lot | undefined {
  return world.town?.lots.find((l) => l.id === id);
}

/** Lote onde a família em jogo mora. */
export function activeLot(world: World): Lot | undefined {
  const fam = activeFamily(world);
  return fam ? lotById(world, fam.lotId) : undefined;
}

/** Casa de um lote: a do World quando é o lote em jogo. */
export function homeOf(world: World, lot: Lot): LotHome | null {
  if (lot.id === activeLot(world)?.id) return { grid: world.grid, objects: world.objects, exit: world.exit };
  return lot.home;
}

/** Tem casa (alguma parede de pé)? */
export function hasHouse(home: LotHome | null): boolean {
  return !!home && Object.values(home.grid.edges).some((k) => k === 'wall' || k === 'door' || k === 'window');
}

/** Quem é da família: moradores (em jogo) ou vizinhos com essa casa. */
export function membersOf(world: World, familyId: number): { id: number; name: string }[] {
  if (world.town?.active === familyId) return world.folks.filter((f) => !f.visit).map((f) => ({ id: f.id, name: f.name }));
  return world.neighbors.filter((n) => n.home === familyId).map((n) => ({ id: n.id, name: n.name }));
}

/** Tostões da família (em jogo vale o caixa da casa). */
export function fundsOf(world: World, fam: Family): number {
  return world.town?.active === fam.id ? world.household.funds : fam.funds;
}

/** Endereço por extenso ("Rua das Taramelas, 5"). */
export function addressOf(world: World, lot: Lot): string {
  const street = world.town?.city?.districts[lot.district ?? 0]?.street ?? world.town?.street ?? '';
  return `${street}, ${lot.number}`;
}

/** Quanto valem as paredes, os pisos, as escadas e o telhado de uma casa. */
export function buildValue(catalog: Catalog, grid: Grid): number {
  let value = 0;
  for (const f of grid.floor) {
    const def = catalog.floors[f];
    if (def && !def.outdoor && !def.void) value += def.price;
    else if (def?.yard) value += def.price;
  }
  for (const kind of Object.values(grid.edges)) value += catalog.parts[kind]?.price ?? 0;
  value += (grid.stairs?.length ?? 0) * catalog.parts.stairs.price;
  value += roofArea(grid, catalog) * catalog.parts.roof.price;
  return Math.round(value);
}

/** Valor dos móveis de hoje (o que se paga ao comprar a casa mobiliada). */
function furnitureValue(world: World, catalog: Catalog, objects: WorldObject[], resale: boolean): number {
  let v = 0;
  for (const o of objects) {
    const def = catalog.objects[o.defId];
    if (def) v += resale ? sellValue(world, o, def) : objectValue(world, o, def);
  }
  return Math.round(v);
}

/** Preço de um lote à venda: terreno, casa e o que ficou dentro. */
export function lotPrice(world: World, catalog: Catalog, lot: Lot): number {
  const home = homeOf(world, lot);
  if (!home) return lot.land;
  return lot.land + buildValue(catalog, home.grid) + furnitureValue(world, catalog, home.objects, false);
}

/** Plano 2, bloco 11: preço do lote sem os móveis (terreno e construção). */
export function barePrice(world: World, catalog: Catalog, lot: Lot): number {
  const home = homeOf(world, lot);
  return lot.land + (home ? buildValue(catalog, home.grid) : 0);
}

/** Preço de um lote mobiliado (`bare` = false) ou só com a obra. */
export function priceOf(world: World, catalog: Catalog, lot: Lot, bare = false): number {
  return bare ? barePrice(world, catalog, lot) : lotPrice(world, catalog, lot);
}

/** Tira da casa guardada o que se paga (móveis e enfeites); o que é de graça fica. */
export function stripHome(catalog: Catalog, home: LotHome): WorldObject[] {
  const gone = home.objects.filter((o) => (catalog.objects[o.defId]?.price ?? 0) > 0);
  home.objects = home.objects.filter((o) => !gone.includes(o));
  return gone;
}

/** Quanto vale a casa guardada de um lote, vendida: terreno, obra e móveis pelo valor de revenda. */
export function lotSaleValue(world: World, catalog: Catalog, lot: Lot): number {
  const home = homeOf(world, lot);
  if (!home) return lot.land;
  return lot.land + buildValue(catalog, home.grid) + furnitureValue(world, catalog, home.objects, true);
}

/** O que a família em jogo recebe vendendo a casa (terreno, obra e móveis pelo valor de revenda). */
export function salePrice(world: World, catalog: Catalog): number {
  const lot = activeLot(world);
  if (!lot) return 0;
  return lot.land + buildValue(catalog, world.grid) + furnitureValue(world, catalog, world.objects, true);
}

/** Dá para sair do lote agora? (fogo, festa ou alguém caído seguram a família). */
export function leaveProblem(world: World): TownProblem | null {
  if (!world.town) return 'noTown';
  if (world.outing || world.trip || world.fires.length > 0 || world.party || world.passings.length > 0 || world.folks.some((f) => f.down)) return 'busyLot';
  return null;
}

/**
 * De que ponta da calçada chega (e para onde volta) quem mora no bairro:
 * -1 = ponta x = 0, 1 = ponta x = w - 1, 0 = não mora no bairro (vem pela condução).
 */
export function streetSide(world: World, personId: number): -1 | 0 | 1 {
  const n = world.neighbors.find((x) => x.id === personId);
  if (!n?.home) return 0;
  const fam = familyById(world, n.home);
  const there = fam ? lotById(world, fam.lotId) : undefined;
  const here = activeLot(world);
  if (!there || !here) return 0;
  // plano 2, bloco 12: de outro bairro, vem pela ponta da rua por onde o caminho entra
  if (world.town?.city && (there.district ?? 0) !== (here.district ?? 0)) {
    const a = lotDoor(here, world.exit);
    const route = streetRoute(world.town, lotDoor(there, there.home?.exit ?? world.exit), a);
    const before = route.points[route.points.length - 3] ?? route.points[0];
    const d = Math.sign(before.x - a.x);
    if (d === 0) return 0;
    return ((here.side === 0 ? d : -d) as -1 | 1);
  }
  // do lado de baixo da rua o lote está girado: oeste fica à direita
  const flip = here.side === 0 ? 1 : -1;
  const d = there.col - here.col || (there.side === here.side ? 0 : there.number % 2 ? -1 : 1);
  if (d === 0) return 0;
  return (Math.sign(d) * flip) as -1 | 1;
}

// ---------- montar o bairro ----------

/** Terreno vazio: grama, caixa de correio e latão na calçada. */
export function blankHome(world: World, catalog: Catalog, w = 17, h = 14, exit: Vec = { x: 7, y: 13 }): LotHome {
  const grid = storied(gridFromMap(Array.from({ length: h }, () => '.'.repeat(w)), { '.': { floor: 'grass', indoor: false } }, []));
  const objects: WorldObject[] = [];
  for (const [defId, x] of [
    ['mailbox', exit.x - 2],
    ['curbbin', exit.x + 2],
  ] as [string, number][]) {
    if (catalog.objects[defId]) objects.push({ id: world.nextId++, defId, x, y: exit.y, rot: 0, paid: 0, state: freshState() });
  }
  return { grid, objects, exit: { ...exit } };
}

/** Folk de mentira na calçada, para conferir que tudo dentro da casa é alcançável. */
function probe(exit: Vec): Folk {
  return makeFolk(-1, { name: '', traits: [], x: exit.x, y: exit.y });
}

/**
 * Casa pronta de um lote do bairro. Cada móvel vai onde a planta manda; se
 * não couber ali, vai para o lugar livre mais perto (os testes conferem que
 * as plantas não dependem disso).
 */
export function buildHome(world: World, catalog: Catalog, plan: HousePlan): { home: LotHome; misplaced: string[] } {
  const grid = storied(gridFromMap(plan.map, plan.rooms, plan.doors, plan.windows));
  const objects: WorldObject[] = [];
  const misplaced: string[] = [];
  const room: World = { ...world, grid, objects, folks: [probe(plan.exit)], exit: plan.exit, fires: [] };
  for (const o of plan.objects) {
    const rot = o.rot ?? 0;
    let spot: { x: number; y: number; rot: typeof rot } | null = checkPlacement(room, catalog, o.defId, o.x, o.y, rot).ok ? { x: o.x, y: o.y, rot } : null;
    if (!spot) {
      misplaced.push(`${o.defId}@${o.x},${o.y}`);
      spot = spotNear(room, catalog, o.defId, o, 6);
    }
    if (!spot) continue;
    objects.push({ id: world.nextId++, defId: o.defId, x: spot.x, y: spot.y, rot: spot.rot, paid: 0, state: freshState() });
  }
  return { home: { grid, objects, exit: { ...plan.exit } }, misplaced };
}

/** Quem mora junto se conhece (amizade morna), sem apagar o que já existia. */
function housemates(world: World, ids: number[]): void {
  for (let i = 0; i < ids.length; i++) {
    for (let j = i + 1; j < ids.length; j++) {
      const a = personOf(world, ids[i]);
      const b = personOf(world, ids[j]);
      if (!a || !b) continue;
      introduce(world, a, b, HOUSEMATE_FRIENDSHIP, 10);
      for (const [x, y] of [
        [a.id, b.id],
        [b.id, a.id],
      ]) {
        const rel = ensureRelation(world, x, y);
        rel.friendship = Math.max(rel.friendship, HOUSEMATE_FRIENDSHIP);
      }
    }
  }
}

/**
 * Monta o bairro em volta do lote em jogo: a família de agora fica no lote
 * marcado como `home`, os vizinhos citados nas famílias passam a morar nas
 * casas prontas e o resto vira casa à venda ou terreno vago. Vizinho que já
 * mora na casa em jogo (ou que não existe) fica de fora.
 */
export function foundTown(world: World, catalog: Catalog, plan: TownPlan): Town {
  const town: Town = { name: plan.name, street: plan.street, lots: [], families: [], active: 1, nextFamily: 2, feed: [] };
  if (plan.city) town.city = { name: plan.city, districts: [{ name: plan.name, street: plan.street }] };
  const residents = world.folks.filter((f) => !f.visit);
  const homeIdx = Math.max(0, plan.lots.findIndex((l) => l.home));
  town.families.push({ id: 1, name: surnameOf(residents[0]?.name ?? '') || residents[0]?.name || plan.name, lotId: homeIdx + 1, funds: 0, stash: null, since: world.tick });
  world.town = town;
  plan.lots.forEach((lp, i) => {
    const lot: Lot = { id: i + 1, number: lp.number, side: lp.side, col: lp.col, land: lp.land, familyId: 0, home: null };
    if (plan.city) lot.district = 0;
    town.lots.push(lot);
    if (i === homeIdx) {
      lot.familyId = 1;
      return;
    }
    settleLot(world, catalog, plan, lot, lp);
  });
  growCity(world, catalog, plan);
  return town;
}

/** Casa pronta e família (se a planta disser) num lote recém-criado. */
function settleLot(world: World, catalog: Catalog, plan: TownPlan, lot: Lot, lp: LotPlan): void {
  const town = world.town!;
  const housePlan = lp.house ? plan.houses[lp.house] : undefined;
  if (housePlan) lot.home = buildHome(world, catalog, housePlan).home;
  if (!lp.family || !lot.home) return;
  const members = lp.family.members
    .map((name) => world.neighbors.find((n) => n.name === name && !n.service && !n.away && n.home === undefined))
    .filter((n): n is Neighbor => !!n && !world.folks.some((f) => f.id === n.id) && !(world.outing?.home.folks ?? []).some((f) => f.id === n.id));
  if (members.length === 0) return;
  const fam: Family = { id: town.nextFamily++, name: lp.family.name, lotId: lot.id, funds: lp.family.funds, stash: null, since: world.tick };
  town.families.push(fam);
  lot.familyId = fam.id;
  for (const n of members) n.home = fam.id;
  housemates(
    world,
    members.map((n) => n.id),
  );
}

/**
 * Plano 2, bloco 12: o bairro vira um pedaço da cidade. Os lotes que já
 * existem ficam no bairro 0 (com o mesmo número e a mesma casa) e os bairros
 * que faltam chegam com as casas e as famílias da planta. Serve para o jogo
 * novo e para a migração (não refaz o que já existe).
 */
export function growCity(world: World, catalog: Catalog, plan: TownPlan): void {
  const town = world.town;
  if (!town || !plan.city) return;
  town.city ??= { name: plan.city, districts: [{ name: town.name, street: town.street }] };
  for (const lot of town.lots) lot.district ??= 0;
  (plan.districts ?? []).forEach((dp, i) => {
    const d = i + 1;
    if (town.city!.districts[d]) return;
    town.city!.districts[d] = { name: dp.name, street: dp.street };
    for (const lp of dp.lots) {
      const lot: Lot = { id: Math.max(0, ...town.lots.map((l) => l.id)) + 1, number: lp.number, side: lp.side, col: lp.col, land: lp.land, familyId: 0, home: null, district: d };
      town.lots.push(lot);
      settleLot(world, catalog, plan, lot, lp);
    }
  });
}

// ---------- trocar de família ----------

/** Vizinho a partir de um morador que sai de jogo (o emprego e o jeito vão junto). */
export function neighborFrom(folk: Folk, home: number): Neighbor {
  const n: Neighbor = {
    id: folk.id,
    name: folk.name,
    traits: [...folk.traits],
    look: { ...folk.look },
    temper: { ...folk.temper },
    month: folk.month,
    skills: { ...folk.skills },
    career: folk.job ? { id: folk.job.careerId, level: folk.job.level } : null,
    interests: folk.interests ? { ...folk.interests } : undefined,
    funds: 0,
    home,
  };
  if (folk.bornName) n.bornName = folk.bornName;
  // bloco 17: a fase, os pais e a aposentadoria vão junto; meio período não conta como carreira
  copyLife({ ...folk, parents: folk.parents ?? (folk.kid?.parents.length ? folk.kid.parents : undefined) }, n);
  if (folk.job?.partTime) n.career = null;
  return n;
}

/** Visitas vão embora na hora (levando o que aprenderam) e o lote fica quieto. */
export function emptyVisitors(world: World): void {
  for (const f of world.folks) {
    if (!f.visit) continue;
    const n = world.neighbors.find((x) => x.id === f.id);
    if (!n) continue;
    n.skills = { ...f.skills };
    if (f.interests) n.interests = { ...f.interests };
  }
  world.folks = world.folks.filter((f) => !f.visit);
  world.circles = [];
  world.call = null;
  world.pendingVisits = [];
  world.party = null;
  world.help = { fire: 0, police: 0 };
  world.spirits = [];
}

/** Morador parado, sem fila nem caminho (depois de uma mudança ou de voltar a jogo). */
export function settle(folk: Folk, keepAway: boolean): void {
  folk.queue = [];
  folk.path = [];
  folk.thought = null;
  folk.collapsed = 0;
  folk.blocked = 0;
  if (!keepAway) folk.away = null;
  delete folk.adrift;
}

/** Põe os moradores em tiles livres de dentro de casa, do mais perto da porta da rua. */
export function placeAtHome(world: World, catalog: Catalog, folks: Folk[]): void {
  const nav = buildNav(world, catalog);
  const { grid } = world;
  const spots: (Vec & { d: number })[] = [];
  for (let y = 0; y < grid.h; y++) {
    if (levelOfRow(grid, y) !== 0) continue;
    for (let x = 0; x < grid.w; x++) {
      if (!nav.isFree(x, y)) continue;
      const out = catalog.floors[grid.floor[y * grid.w + x]]?.outdoor === true;
      const d = Math.abs(x - world.exit.x) + Math.abs(y - world.exit.y) + (out ? 40 : 0);
      spots.push({ x, y, d });
    }
  }
  // terreno sem casa: todo mundo uns passos para dentro do lote, longe da calçada
  if (!spots.some((s) => s.d < 40)) for (const s of spots) s.d = Math.abs(s.d - 40 - 4) + (s.y === world.exit.y ? 10 : 0);
  spots.sort((a, b) => a.d - b.d || a.y - b.y || a.x - b.x);
  // começa um pouco para dentro (não todo mundo colado na porta)
  const start = Math.min(3, Math.max(0, spots.filter((s) => s.d < 40).length - folks.length));
  folks.forEach((f, i) => {
    const s = spots[start + i] ?? spots[i] ?? world.exit;
    f.x = f.px = s.x;
    f.y = f.py = s.y;
  });
}

/** Guarda a família em jogo: moradores viram vizinhos e a casa fica no lote. */
export function stashActive(world: World): void {
  const town = world.town!;
  const fam = activeFamily(world);
  const lot = activeLot(world);
  emptyVisitors(world);
  if (lot) {
    lot.home = { grid: world.grid, objects: world.objects, exit: world.exit };
  }
  if (!fam) return;
  const folks = world.folks;
  if (folks.length === 0) {
    // ninguém sobrou: a casa fica à venda com o que tem dentro
    town.families = town.families.filter((f) => f.id !== fam.id);
    if (lot) lot.familyId = 0;
    pushFeed(world, 'feed.emptyHouse', { family: fam.name });
    return;
  }
  for (const f of folks) {
    world.neighbors = world.neighbors.filter((n) => n.id !== f.id);
    world.neighbors.push(neighborFrom(f, fam.id));
    settle(f, false);
  }
  fam.funds = world.household.funds;
  fam.stash = { folks, household: world.household, mess: world.mess, at: world.tick };
  world.folks = [];
}

/**
 * Morador a partir de um vizinho (o Folk guardado de quando foi jogado, se
 * houver): a vida, o emprego e as habilidades andaram fora de jogo.
 */
export function folkFromNeighbor(world: World, catalog: Catalog, n: Neighbor, old?: Folk): Folk {
  const folk = old ?? makeFolk(n.id, { name: n.name, traits: n.traits, x: 0, y: 0, look: n.look, temper: copyTemper(n.temper), month: n.month, skills: n.skills });
  folk.name = n.name;
  if (n.bornName) folk.bornName = n.bornName;
  else delete folk.bornName;
  folk.skills = { ...n.skills };
  folk.interests = { ...ensureInterests(catalog, n) };
  // bloco 17: a vida andou fora de jogo (cresceu, envelheceu, aposentou)
  copyLife(n, folk);
  fitKid(folk, world.tick);
  // o emprego andou sozinho (promoção, demissão) enquanto estava fora de jogo
  const career = n.career && catalog.careers[n.career.id] ? n.career : null;
  if (!career) folk.job = null;
  else if (folk.job?.careerId === career.id && folk.job.partTime) folk.job = { ...newJob(career.id), level: 0 };
  else if (folk.job?.careerId === career.id) folk.job.level = Math.min(career.level, catalog.careers[career.id].levels.length - 1);
  else folk.job = { ...newJob(career.id), level: Math.min(career.level, catalog.careers[career.id].levels.length - 1) };
  // a vida resumida deixa todo mundo nem bem nem mal
  for (const k of Object.keys(folk.needs) as (keyof Folk['needs'])[]) {
    if (k === 'ambience') continue;
    folk.needs[k] = Math.round(55 + nextFloat(world) * 30);
  }
  settle(folk, false);
  folk.visit = null;
  return folk;
}

/** Abre a família `fam` no lote dela (o lote precisa estar guardado em `lot.home`). */
function enterFamily(world: World, catalog: Catalog, fam: Family): void {
  const town = world.town!;
  const lot = lotById(world, fam.lotId)!;
  const home = lot.home ?? blankHome(world, catalog);
  world.grid = home.grid;
  world.objects = home.objects;
  world.exit = { ...home.exit };
  lot.home = null;
  lot.familyId = fam.id;
  const members = world.neighbors.filter((n) => n.home === fam.id);
  world.neighbors = world.neighbors.filter((n) => n.home !== fam.id);
  const stash = fam.stash;
  const folks: Folk[] = members.map((n) => folkFromNeighbor(world, catalog, n, stash?.folks.find((f) => f.id === n.id)));
  world.folks = folks;
  if (stash) {
    world.household = stash.household;
    world.mess = stash.mess;
  } else {
    world.household = { ...freshHousehold(START_PANTRY), funds: 0, nextBills: firstBillAfter(world.tick) };
    world.mess = [];
  }
  world.household.funds = fam.funds;
  world.household.bills = world.household.bills ?? [];
  if (world.household.nextBills <= world.tick) world.household.nextBills = firstBillAfter(world.tick);
  // casa guardada antes do bloco 15 não tem quem ficou fora; quem é novo procura lugar
  // plano 2, bloco 11: família que mudou de lote fora de jogo (gaveta, casa nova) também
  if (!stash || stash.unplaced || folks.some((f) => !stash.folks.some((s) => s.id === f.id))) placeAtHome(world, catalog, folks);
  fam.stash = null;
  town.active = fam.id;
  world.fires = [];
  world.passings = [];
  world.spirits = [];
}

/** Passa a jogar com outra família do bairro (a de agora fica guardada). */
export function playFamily(world: World, catalog: Catalog, familyId: number): TownProblem | null {
  const town = world.town;
  if (!town) return 'noTown';
  const fam = familyById(world, familyId);
  if (!fam) return 'noFamily';
  if (fam.id === town.active) return 'sameFamily';
  const busy = leaveProblem(world);
  if (busy) return busy;
  if (!world.neighbors.some((n) => n.home === fam.id)) return 'noFamily';
  stashActive(world);
  enterFamily(world, catalog, fam);
  return null;
}

/**
 * A família em jogo vende a casa (terreno, obra e móveis) e compra outro
 * lote do bairro: terreno vago ou casa à venda, com o que estiver dentro.
 * A casa antiga fica de pé, vazia, à venda.
 */
export function moveHouse(world: World, catalog: Catalog, lotId: number, opts: { bare?: boolean; pack?: boolean } = {}): TownProblem | null {
  const town = world.town;
  if (!town) return 'noTown';
  const fam = activeFamily(world);
  const from = activeLot(world);
  const to = lotById(world, lotId);
  if (!fam || !from) return 'noFamily';
  if (!to) return 'noLot';
  if (to.id === from.id) return 'sameLot';
  if (to.familyId !== 0) return 'lotTaken';
  const busy = leaveProblem(world);
  if (busy) return busy;
  // plano 2, bloco 11: levar os móveis (vão para o inventário) ou vender junto com a casa
  const sale = opts.pack ? from.land + buildValue(catalog, world.grid) : salePrice(world, catalog);
  const cost = priceOf(world, catalog, to, opts.bare);
  if (world.household.funds + sale < cost) return 'cantAfford';
  emptyVisitors(world);
  // os móveis vão vendidos (ou na mudança); o que é de graça (caixa de correio, lápide) fica
  const keep = world.objects.filter((o) => (catalog.objects[o.defId]?.price ?? 0) === 0);
  if (opts.pack) {
    const stored = (world.household.stored ??= []);
    for (const o of world.objects) if (!keep.includes(o)) stored.push(packed(o));
  }
  from.home = { grid: world.grid, objects: keep, exit: world.exit };
  from.familyId = 0;
  const home = to.home ?? blankHome(world, catalog);
  if (opts.bare) stripHome(catalog, home);
  world.grid = home.grid;
  world.objects = home.objects;
  world.exit = { ...home.exit };
  to.home = null;
  to.familyId = fam.id;
  fam.lotId = to.id;
  world.household.funds += sale - cost;
  world.household.lightMinutes = 0;
  world.mess = [];
  world.spirits = [];
  const atHome = world.folks.filter((f) => !f.away);
  for (const f of world.folks) settle(f, true);
  placeAtHome(world, catalog, atHome);
  pushFeed(world, 'feed.moved', { family: fam.name, number: to.number });
  return null;
}

/** Família nova chega ao bairro num lote vago ou numa casa à venda e passa a ser a jogada. */
export function foundFamily(world: World, catalog: Catalog, draft: FamilyDraft, lotId: number, bare = false): TownProblem | null {
  const town = world.town;
  if (!town) return 'noTown';
  if (familyProblem(catalog, draft)) return 'badDraft';
  const lot = lotById(world, lotId);
  if (!lot) return 'noLot';
  if (lot.familyId !== 0) return 'lotTaken';
  const busy = leaveProblem(world);
  if (busy) return busy;
  const cost = priceOf(world, catalog, lot, bare);
  if (cost > NEW_FAMILY_FUNDS) return 'cantAfford';
  stashActive(world);
  if (bare && lot.home) stripHome(catalog, lot.home);
  const surname = cleanName(draft.surname);
  const fam: Family = { id: town.nextFamily++, name: surname, lotId: lot.id, funds: NEW_FAMILY_FUNDS - cost, stash: null, since: world.tick };
  town.families.push(fam);
  enterFamily(world, catalog, fam);
  const folks = draft.members.map((m) => makeFolk(world.nextId++, memberSeed(m, `${cleanName(m.name)} ${surname}`, 0, 0)));
  for (const f of folks) f.interests = { ...ensureInterests(catalog, f) };
  world.folks = folks;
  placeAtHome(world, catalog, folks);
  // plano 2, bloco 10: os laços do criador (cônjuges, pais e filhos, irmãos, colegas)
  applyFamilyTies(world, folks, draft);
  pushFeed(world, 'feed.arrived', { family: fam.name, number: lot.number });
  return null;
}

/** Quem se muda de uma família de fora de jogo para a casa em jogo leva a parte dele do dinheiro. */
export function leaveFamily(world: World, n: Neighbor): number {
  if (!n.home) return savingsOf(n);
  const fam = familyById(world, n.home);
  const left = world.neighbors.filter((x) => x.home === n.home && x.id !== n.id).length;
  delete n.home;
  if (!fam) return savingsOf(n);
  const share = Math.max(0, Math.floor(fam.funds / (left + 1)));
  fam.funds -= share;
  if (left === 0) dissolve(world, fam);
  return share;
}

/** A família acabou (todo mundo se mudou): a casa fica à venda com o que tem dentro. */
export function dissolve(world: World, fam: Family): void {
  const town = world.town!;
  town.families = town.families.filter((f) => f.id !== fam.id);
  const lot = lotById(world, fam.lotId);
  if (lot && lot.familyId === fam.id) lot.familyId = 0;
  pushFeed(world, 'feed.emptyHouse', { family: fam.name });
}

// ---------- a vida resumida das outras casas ----------

export function pushFeed(world: World, key: string, params?: Record<string, string | number>): void {
  const town = world.town;
  if (!town) return;
  const entry: LogEntry = { tick: world.tick, key };
  if (params) entry.params = params;
  town.feed.push(entry);
  if (town.feed.length > FEED_MAX) town.feed.splice(0, town.feed.length - FEED_MAX);
}

/** Gasto por dia de uma família fora de jogo: comida por pessoa e a conta da casa dividida. */
export function dailyCost(world: World, catalog: Catalog, fam: Family, people: number): number {
  const lot = lotById(world, fam.lotId);
  const home = lot?.home;
  let value = 0;
  if (home) value = furnitureValue(world, catalog, home.objects, false);
  return Math.round(people * DAILY_UPKEEP + (BILL_BASE + value * BILL_RATE) / 3);
}

/**
 * Um dia na vida das famílias fora de jogo: quem trabalha recebe (nos dias
 * de turno), a casa gasta, quem mora junto fica mais próximo e, de vez em
 * quando, alguém passa na casa de um amigo do bairro. Promoções e demissões
 * já correm para todos os vizinhos no remanejo de domingo (work.ts).
 */
export function townDay(world: World, catalog: Catalog): void {
  const town = world.town;
  if (!town) return;
  const day = Math.floor(world.tick / MINUTES_PER_DAY);
  const weekday = day % 7;
  for (const fam of [...town.families]) {
    // plano 2, bloco 11: família na gaveta não vive (nem envelhece) até ganhar um lote
    if (fam.id === town.active || fam.lotId === 0) continue;
    let members = world.neighbors.filter((n) => n.home === fam.id);
    if (members.length === 0) {
      dissolve(world, fam);
      continue;
    }
    let pay = 0;
    // bloco 17: o relógio da vida anda também nas outras casas
    for (const n of members) {
      const changed = ageNeighbor(world, catalog, n);
      if (changed === 'passed') passAway(world, n);
      else if (changed) pushFeed(world, `feed.became.${changed}`, { name: n.name });
    }
    members = members.filter((n) => world.neighbors.includes(n));
    for (const n of members) {
      pay += n.pension ?? 0;
      if (!n.career) continue;
      const level = catalog.careers[n.career.id]?.levels[n.career.level];
      if (level && level.days.includes(weekday)) pay += level.pay;
    }
    fam.funds += pay - dailyCost(world, catalog, fam, members.length);
    // quem mora junto convive (sem esfriar)
    for (const a of members) {
      for (const b of members) {
        if (a === b) continue;
        const rel = ensureRelation(world, a.id, b.id);
        rel.friendship = Math.min(70, rel.friendship + 1);
        rel.last = world.tick;
      }
      // um pouco de prática no que mais gosta
      const top = Object.entries(a.skills).sort((x, y) => y[1] - x[1])[0];
      if (top) a.skills[top[0]] = top[1] + 15;
    }
    // visita resumida a um amigo do bairro
    for (const n of members) {
      if (n.age === 'baby' || nextFloat(world) >= VISIT_CHANCE) continue;
      const friends = world.neighbors.filter(
        (o) => o.id !== n.id && o.home !== undefined && o.home !== n.home && !o.service && o.age !== 'baby' && (relationOf(world, n.id, o.id)?.friendship ?? 0) >= 15,
      );
      if (friends.length === 0) continue;
      const o = friends[nextInt(world, friends.length)];
      for (const [x, y] of [
        [n.id, o.id],
        [o.id, n.id],
      ]) {
        const rel = ensureRelation(world, x, y);
        rel.friendship = Math.min(100, rel.friendship + 3);
        rel.last = world.tick;
      }
      pushFeed(world, 'feed.visited', { name: n.name, other: o.name });
    }
    if (pay > 0 && fam.funds < 0) pushFeed(world, 'feed.broke', { family: fam.name });
  }
}

/**
 * Bloco 17: alguém de uma família fora de jogo morreu de velhice. Sai do
 * bairro, fica na lista de quem se foi (para a árvore) e o pecúlio vai para
 * os herdeiros (a casa em jogo também, se tiver filho ou cônjuge lá).
 */
function passAway(world: World, n: Neighbor): void {
  const spouse = spouseOf(world, n.id);
  const heirs = heirsOf(world, n.id, spouse);
  world.departed.push({
    id: n.id,
    name: n.name,
    look: { ...n.look },
    age: n.age,
    cause: 'age',
    died: world.tick,
    ...(n.parents?.length ? { parents: [...n.parents] } : {}),
    ...(spouse ? { spouse } : {}),
  });
  world.neighbors = world.neighbors.filter((x) => x.id !== n.id);
  for (const [key, rel] of Object.entries(world.relations)) {
    const [a, b] = key.split('>').map(Number);
    if (a !== n.id && b !== n.id) continue;
    rel.dating = false;
    delete rel.bond;
  }
  const fam = n.home !== undefined ? familyById(world, n.home) : undefined;
  pushFeed(world, 'feed.passed', { name: n.name, family: fam?.name ?? '' });
  const shares = splitEstate(estateOf({ job: null, retired: n.retired, age: n.age }), heirs.length ? heirs : [{ id: 0, where: n.home ?? 'out', tie: 'child' }]);
  for (const [where, amount] of shares) {
    if (where === 'home') {
      world.household.funds += amount;
      const mine = activeFamily(world);
      if (mine) mine.inherited = (mine.inherited ?? 0) + amount;
      world.log.push({ tick: world.tick, key: 'log.estateFromTown', params: { name: n.name, amount: formatMoney(amount) } });
    } else if (typeof where === 'number') {
      const f = familyById(world, where);
      if (f) {
        f.funds += amount;
        f.inherited = (f.inherited ?? 0) + amount;
      }
    }
  }
}

/** Objeto que vai para o inventário: sem lugar, sem sujeira de uso, sem bebê dentro. */
export function packed(o: WorldObject): WorldObject {
  const copy = JSON.parse(JSON.stringify(o)) as WorldObject;
  delete copy.baby;
  copy.x = 0;
  copy.y = 0;
  return copy;
}

/** Para a tela do bairro: lotes com o que mora (ou não) em cada um. */
export function lotStatus(world: World, lot: Lot): 'active' | 'family' | 'forSale' | 'vacant' {
  if (lot.id === activeLot(world)?.id) return 'active';
  if (lot.familyId !== 0) return 'family';
  return hasHouse(lot.home) ? 'forSale' : 'vacant';
}

/** Casa guardada de um lote (ou do World): conta de móveis, para a tela. */
export function homeObjects(world: World, lot: Lot): number {
  return homeOf(world, lot)?.objects.length ?? 0;
}

/** Ajuda para testes e migração: tiles ocupados por móveis de uma casa. */
export function takenTiles(catalog: Catalog, objects: WorldObject[]): Set<string> {
  const taken = new Set<string>();
  for (const o of objects) {
    const def = catalog.objects[o.defId];
    if (!def || def.layer) continue;
    for (const t of footprint(o, def)) taken.add(`${t.x},${t.y}`);
  }
  return taken;
}
