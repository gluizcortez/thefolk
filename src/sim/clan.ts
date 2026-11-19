import { objectValue, sellValue } from './economy';
import { cleanName, memberSeed } from './family';
import type { FamilyDraft } from './family';
import { isAdult } from './kids';
import { bondOf } from './marriage';
import { relationOf } from './relations';
import { applyFamilyTies } from './ties';
import { ensureInterests } from './topics';
import {
  NEW_FAMILY_FUNDS,
  activeFamily,
  activeLot,
  buildValue,
  dissolve,
  emptyVisitors,
  familyById,
  folkFromNeighbor,
  fundsOf,
  leaveFamily,
  leaveProblem,
  lotById,
  lotSaleValue,
  neighborFrom,
  placeAtHome,
  priceOf,
  pushFeed,
  settle,
  stripHome,
} from './town';
import type { TownProblem } from './town';
import { START_PANTRY, billTotal } from './services';
import { firstBillAfter, freshHousehold, isServiceNeighbor, makeFolk } from './world';
import type { Catalog, Family, Folk, Neighbor, World } from './types';

// Plano 2, bloco 11: gestão de família na cidade. A gaveta guarda famílias
// sem casa (Family.lotId = 0, membros em Family.bin, fora do mundo); dá para
// pôr uma família da gaveta num lote, mandar uma família do bairro de volta
// para a gaveta, dividir a família em jogo (quem sai forma outra, com parte do
// dinheiro), juntar outra família à de agora (aqui ou na casa dela) e chamar
// alguém de perto para morar junto. A tela de fundos lê `familyLedger`.

export type ClanProblem =
  | TownProblem
  | 'notInBin'
  | 'inBin'
  | 'noOne'
  | 'allOfThem'
  | 'noAdult'
  | 'kidNeedsAdult'
  | 'babyStays'
  | 'memberAway'
  | 'houseFull'
  | 'notClose'
  | 'noLotThere';

/** Até quantos moram numa casa (o mesmo do bloco 10). */
export const MAX_HOUSEHOLD = 8;
/** Amizade mínima para chamar alguém de fora para morar junto (sem ser parente nem par). */
export const INVITE_FRIENDSHIP = 50;

/** Família guardada na gaveta? */
export function inBin(fam: Family): boolean {
  return fam.lotId === 0;
}

/** Famílias da gaveta, na ordem em que entraram. */
export function binFamilies(world: World): Family[] {
  return world.town?.families.filter(inBin) ?? [];
}

/** Quem é da família, onde quer que esteja (em jogo, no bairro ou na gaveta). */
export function peopleOf(world: World, fam: Family): (Folk | Neighbor)[] {
  if (world.town?.active === fam.id) return world.folks.filter((f) => !f.visit);
  if (inBin(fam)) return fam.bin ?? [];
  return world.neighbors.filter((n) => n.home === fam.id);
}

// ---------- gaveta ----------

/** Folks de um rascunho do criador (com os laços já ligados). */
function draftFolks(world: World, catalog: Catalog, draft: FamilyDraft): Folk[] {
  const surname = cleanName(draft.surname);
  const folks = draft.members.map((m) => makeFolk(world.nextId++, memberSeed(m, `${cleanName(m.name)} ${surname}`, 0, 0)));
  for (const f of folks) f.interests = { ...ensureInterests(catalog, f) };
  applyFamilyTies(world, folks, draft);
  return folks;
}

/** Família nova direto para a gaveta (chega com o mesmo dinheiro de quem chega ao bairro). */
export function binDraft(world: World, catalog: Catalog, draft: FamilyDraft): Family | null {
  const town = world.town;
  if (!town) return null;
  const folks = draftFolks(world, catalog, draft);
  const fam: Family = { id: town.nextFamily++, name: cleanName(draft.surname), lotId: 0, funds: NEW_FAMILY_FUNDS, stash: null, since: world.tick };
  fam.bin = folks.map((f) => neighborFrom(f, fam.id));
  fam.stash = { folks, household: { ...freshHousehold(START_PANTRY), funds: fam.funds, nextBills: firstBillAfter(world.tick) }, mess: [], at: world.tick, unplaced: true };
  town.families.push(fam);
  pushFeed(world, 'feed.binNew', { family: fam.name });
  return fam;
}

/**
 * Uma família do bairro (fora de jogo) vai para a gaveta: a casa fica à venda
 * com as paredes, os móveis são vendidos e o dinheiro vai junto.
 */
export function binFamily(world: World, catalog: Catalog, familyId: number): ClanProblem | null {
  const town = world.town;
  if (!town) return 'noTown';
  const fam = familyById(world, familyId);
  if (!fam) return 'noFamily';
  if (fam.id === town.active) return 'sameFamily';
  if (inBin(fam)) return 'inBin';
  const lot = lotById(world, fam.lotId);
  if (lot?.home) {
    const before = lot.home.objects;
    const sold = lot.home.objects.filter((o) => (catalog.objects[o.defId]?.price ?? 0) > 0);
    let value = lot.land + buildValue(catalog, lot.home.grid);
    for (const o of sold) {
      const def = catalog.objects[o.defId];
      if (def) value += sellValue(world, o, def);
    }
    lot.home.objects = before.filter((o) => !sold.includes(o));
    fam.funds += Math.round(value);
  } else if (lot) fam.funds += lot.land;
  if (lot) lot.familyId = 0;
  const members = world.neighbors.filter((n) => n.home === fam.id);
  const ids = new Set(members.map((n) => n.id));
  fam.bin = members;
  world.neighbors = world.neighbors.filter((n) => !ids.has(n.id));
  // quem estava de visita no lote em jogo volta para casa (para a gaveta)
  world.folks = world.folks.filter((f) => !(f.visit && ids.has(f.id)));
  world.pendingVisits = world.pendingVisits.filter((v) => !ids.has(v.neighborId));
  for (const c of world.circles) c.members = c.members.filter((m) => !ids.has(m.id));
  if (fam.stash) fam.stash.unplaced = true;
  fam.lotId = 0;
  pushFeed(world, 'feed.binned', { family: fam.name });
  return null;
}

/** Família da gaveta compra um lote (mobiliado ou só a obra) e passa a morar no bairro. */
export function placeFamily(world: World, catalog: Catalog, familyId: number, lotId: number, bare = false): ClanProblem | null {
  const town = world.town;
  if (!town) return 'noTown';
  const fam = familyById(world, familyId);
  if (!fam) return 'noFamily';
  if (!inBin(fam)) return 'notInBin';
  const lot = lotById(world, lotId);
  if (!lot) return 'noLot';
  if (lot.familyId !== 0 || lot.id === activeLot(world)?.id) return 'lotTaken';
  const cost = priceOf(world, catalog, lot, bare);
  if (fam.funds < cost) return 'cantAfford';
  if (bare && lot.home) stripHome(catalog, lot.home);
  fam.funds -= cost;
  fam.lotId = lot.id;
  lot.familyId = fam.id;
  for (const n of fam.bin ?? []) {
    n.home = fam.id;
    world.neighbors.push(n);
  }
  delete fam.bin;
  if (fam.stash) fam.stash.unplaced = true;
  pushFeed(world, 'feed.arrived', { family: fam.name, number: lot.number });
  return null;
}

// ---------- dividir ----------

/** Dá para dividir a família em jogo assim? (`ids` = quem sai) */
export function splitProblem(world: World, ids: number[]): ClanProblem | null {
  if (!world.town || !activeFamily(world)) return 'noTown';
  const busy = leaveProblem(world);
  if (busy) return busy;
  const home = world.folks.filter((f) => !f.visit);
  const going = home.filter((f) => ids.includes(f.id));
  const staying = home.filter((f) => !ids.includes(f.id));
  if (going.length === 0) return 'noOne';
  if (staying.length === 0) return 'allOfThem';
  if (going.some((f) => f.age === 'baby')) return 'babyStays';
  if (going.some((f) => f.away)) return 'memberAway';
  if (!going.some((f) => isAdult(f))) return going.some((f) => f.age === 'teen' || f.age === 'child') ? 'kidNeedsAdult' : 'noAdult';
  if (!staying.some((f) => isAdult(f))) return 'noAdult';
  return null;
}

/**
 * Quem sai da casa em jogo vira vizinho (o Folk inteiro fica guardado, com
 * roupas, sonho e lembranças) e forma uma família nova na gaveta, levando
 * `money` do caixa. As relações ficam como estavam.
 */
export function splitFamily(world: World, ids: number[], money: number, surname?: string): ClanProblem | null {
  const why = splitProblem(world, ids);
  if (why) return why;
  const town = world.town!;
  const mine = activeFamily(world)!;
  const going = world.folks.filter((f) => !f.visit && ids.includes(f.id));
  const take = Math.max(0, Math.min(Math.round(money), Math.max(0, world.household.funds)));
  world.household.funds -= take;
  const name = cleanName(surname ?? '') || mine.name;
  const fam: Family = { id: town.nextFamily++, name, lotId: 0, funds: take, stash: null, since: world.tick };
  const gone = new Set(going.map((f) => f.id));
  for (const f of going) detach(world, f);
  for (const f of going) settle(f, false);
  fam.bin = going.map((f) => neighborFrom(f, fam.id));
  const hh = world.household;
  fam.stash = {
    folks: going,
    household: {
      ...freshHousehold(START_PANTRY),
      funds: take,
      nextBills: firstBillAfter(world.tick),
      // o álbum e as roupas compradas vão junto (uma cópia para cada casa)
      ...(hh.album ? { album: JSON.parse(JSON.stringify(hh.album)) } : {}),
      ...(hh.garments ? { garments: [...hh.garments] } : {}),
    },
    mess: [],
    at: world.tick,
    unplaced: true,
  };
  town.families.push(fam);
  world.folks = world.folks.filter((f) => !gone.has(f.id));
  pushFeed(world, 'feed.split', { family: mine.name, other: fam.name, n: going.length });
  return null;
}

/** Tira um morador do lote sem apagar nada dele (para dividir): rodas, filas e objetos esquecem. */
function detach(world: World, folk: Folk): void {
  const id = folk.id;
  for (const c of world.circles) c.members = c.members.filter((m) => m.id !== id);
  world.circles = world.circles.filter((c) => c.members.length > 1);
  for (const f of world.folks) {
    if (f.id === id) continue;
    const idx = f.queue.findIndex((a) => a.otherId === id);
    if (idx < 0) continue;
    f.queue = f.queue.filter((a) => a.otherId !== id);
    if (idx === 0) f.path = [];
  }
  if (world.party?.host === id) world.party = null;
  if (world.call?.answeredBy === id) world.call = null;
}

// ---------- juntar e chamar para morar ----------

/** Dá para trazer a família `fam` para a casa em jogo (ou ir para a dela)? */
export function joinProblem(world: World, familyId: number, where: 'here' | 'there'): ClanProblem | null {
  const town = world.town;
  if (!town) return 'noTown';
  const fam = familyById(world, familyId);
  if (!fam) return 'noFamily';
  if (fam.id === town.active) return 'sameFamily';
  const busy = leaveProblem(world);
  if (busy) return busy;
  const people = peopleOf(world, fam).length;
  if (people === 0) return 'noFamily';
  if (world.folks.filter((f) => !f.visit).length + people > MAX_HOUSEHOLD) return 'houseFull';
  if (where === 'there' && (inBin(fam) || !lotById(world, fam.lotId)?.home)) return 'noLotThere';
  return null;
}

/**
 * Junta a família `fam` à família em jogo. 'here': todos se mudam para a casa
 * em jogo e a casa deles (se tiver) é vendida. 'there': a família em jogo
 * vende a casa e vai morar na deles, com o que tem dentro. O dinheiro soma.
 */
export function joinFamily(world: World, catalog: Catalog, familyId: number, where: 'here' | 'there'): ClanProblem | null {
  const why = joinProblem(world, familyId, where);
  if (why) return why;
  const town = world.town!;
  const fam = familyById(world, familyId)!;
  const mine = activeFamily(world)!;
  const members = inBin(fam) ? (fam.bin ?? []) : world.neighbors.filter((n) => n.home === fam.id);
  const ids = new Set(members.map((n) => n.id));
  // quem estava de visita vira morador pelo caminho de sempre (sai como visita antes)
  world.folks = world.folks.filter((f) => !(f.visit && ids.has(f.id)));
  world.pendingVisits = world.pendingVisits.filter((v) => !ids.has(v.neighborId));
  const lot = inBin(fam) ? undefined : lotById(world, fam.lotId);
  let money = fam.funds;
  if (where === 'there' && lot) {
    // a família em jogo vende a casa e vai para a deles (que já é deles: não paga)
    const from = activeLot(world)!;
    money += lotSaleValue(world, catalog, from);
    emptyVisitors(world);
    const keep = world.objects.filter((o) => (catalog.objects[o.defId]?.price ?? 0) === 0);
    from.home = { grid: world.grid, objects: keep, exit: world.exit };
    from.familyId = 0;
    const home = lot.home!;
    world.grid = home.grid;
    world.objects = home.objects;
    world.exit = { ...home.exit };
    lot.home = null;
    lot.familyId = mine.id;
    mine.lotId = lot.id;
    world.household.lightMinutes = 0;
    world.mess = [];
    world.spirits = [];
    for (const f of world.folks) settle(f, true);
  } else if (lot) {
    money += lotSaleValue(world, catalog, lot);
    if (lot.home) lot.home.objects = lot.home.objects.filter((o) => (catalog.objects[o.defId]?.price ?? 0) === 0);
    lot.familyId = 0;
  }
  world.neighbors = world.neighbors.filter((n) => !ids.has(n.id));
  const newcomers = members.map((n) => {
    n.home = undefined;
    delete n.home;
    return folkFromNeighbor(world, catalog, n, fam.stash?.folks.find((f) => f.id === n.id));
  });
  world.folks.push(...newcomers);
  // na casa nova todo mundo procura lugar; na de agora, só quem chegou
  placeAtHome(world, catalog, where === 'there' ? world.folks.filter((f) => !f.visit && !f.away) : newcomers);
  world.household.funds += money;
  mine.inherited = (mine.inherited ?? 0) + (fam.inherited ?? 0);
  // o inventário e as roupas compradas da outra casa vêm junto
  const other = fam.stash?.household;
  if (other?.stored?.length) (world.household.stored ??= []).push(...other.stored);
  if (other?.garments?.length) world.household.garments = [...new Set([...(world.household.garments ?? []), ...other.garments])];
  fam.bin = [];
  town.families = town.families.filter((f) => f.id !== fam.id);
  pushFeed(world, 'feed.joined', { family: mine.name, other: fam.name });
  return null;
}

/** Quem é perto o bastante para ser chamado para morar junto (parente, par ou amigo do peito). */
export function closeTo(world: World, personId: number): boolean {
  const home = world.folks.filter((f) => !f.visit);
  const n = world.neighbors.find((x) => x.id === personId);
  for (const r of home) {
    if (bondOf(world, r.id, personId)) return true;
    if (relationOf(world, r.id, personId)?.dating) return true;
    if (n?.parents?.includes(r.id) || r.parents?.includes(personId)) return true;
    if ((relationOf(world, personId, r.id)?.friendship ?? 0) >= INVITE_FRIENDSHIP && (relationOf(world, r.id, personId)?.friendship ?? 0) >= INVITE_FRIENDSHIP) return true;
  }
  return false;
}

/** Dá para chamar esta pessoa para morar na casa em jogo? */
export function inviteProblem(world: World, personId: number): ClanProblem | null {
  if (!world.town) return 'noTown';
  const busy = leaveProblem(world);
  if (busy) return busy;
  const n = world.neighbors.find((x) => x.id === personId);
  if (!n || n.service || n.away || n.boss) return 'noFamily';
  if (world.folks.some((f) => f.id === personId && !f.visit)) return 'sameFamily';
  if (world.folks.filter((f) => !f.visit).length >= MAX_HOUSEHOLD) return 'houseFull';
  const home = world.folks.filter((f) => !f.visit);
  // criança e bebê só vêm se um dos pais mora aqui
  if (!isAdult(n) && n.age !== 'teen' && !home.some((r) => n.parents?.includes(r.id))) return 'kidNeedsAdult';
  if (!closeTo(world, personId)) return 'notClose';
  return null;
}

/** Quem dá para chamar para morar junto agora (para a tela). */
export function invitable(world: World): Neighbor[] {
  return world.neighbors.filter((n) => !isServiceNeighbor(n) && !n.boss && inviteProblem(world, n.id) === null);
}

/**
 * Chama alguém de fora para morar na casa em jogo: chega com a parte dele do
 * dinheiro da família (se tinha casa no bairro) ou com as economias.
 */
export function inviteHome(world: World, catalog: Catalog, personId: number): { problem: ClanProblem | null; folk?: Folk; money?: number } {
  const why = inviteProblem(world, personId);
  if (why) return { problem: why };
  const n = world.neighbors.find((x) => x.id === personId)!;
  world.folks = world.folks.filter((f) => f.id !== personId);
  world.pendingVisits = world.pendingVisits.filter((v) => v.neighborId !== personId);
  const money = leaveFamily(world, n);
  const old = n.home !== undefined ? familyById(world, n.home)?.stash?.folks.find((f) => f.id === n.id) : undefined;
  world.neighbors = world.neighbors.filter((x) => x.id !== personId);
  delete n.home;
  const folk = folkFromNeighbor(world, catalog, n, old);
  world.folks.push(folk);
  placeAtHome(world, catalog, [folk]);
  world.household.funds += money;
  pushFeed(world, 'feed.invited', { name: n.name, family: activeFamily(world)?.name ?? '' });
  return { problem: null, folk, money };
}

// ---------- fundos e bens ----------

export interface Ledger {
  funds: number;
  /** terreno, obra e móveis da casa (0 = sem casa, na gaveta) */
  house: number;
  land: number;
  build: number;
  furniture: number;
  /** objetos guardados no inventário (pelo valor de hoje) */
  stored: number;
  storedCount: number;
  /** contas na caixa de correio, ainda não pagas */
  bills: number;
  /** quanto entra numa semana (salários e aposentadoria) */
  weekPay: number;
  inherited: number;
  /** tudo somado, menos as contas */
  worth: number;
}

/** Fundos e bens de uma família (a de agora, uma do bairro ou uma da gaveta). */
export function familyLedger(world: World, catalog: Catalog, fam: Family): Ledger {
  const active = world.town?.active === fam.id;
  const lot = inBin(fam) ? undefined : lotById(world, fam.lotId);
  const home = lot ? (active ? { grid: world.grid, objects: world.objects } : lot.home) : null;
  let furniture = 0;
  for (const o of home?.objects ?? []) {
    const def = catalog.objects[o.defId];
    if (def) furniture += objectValue(world, o, def);
  }
  const build = home ? buildValue(catalog, home.grid) : 0;
  const land = lot?.land ?? 0;
  const hh = active ? world.household : fam.stash?.household;
  let stored = 0;
  for (const o of hh?.stored ?? []) {
    const def = catalog.objects[o.defId];
    if (def) stored += objectValue(world, o, def);
  }
  const bills = active ? world.household.bills.reduce((s, b) => s + Math.max(0, billTotal(b) - b.covered), 0) : 0;
  let weekPay = 0;
  for (const p of peopleOf(world, fam)) {
    const career = 'queue' in p ? (p.job && !p.job.partTime ? { id: p.job.careerId, level: p.job.level } : null) : p.career;
    const level = career ? catalog.careers[career.id]?.levels[career.level] : undefined;
    if (level) weekPay += level.pay * level.days.length;
    weekPay += ('pension' in p ? (p.pension ?? 0) : 0) * 7;
  }
  const funds = fundsOf(world, fam);
  const house = land + build + Math.round(furniture);
  return {
    funds,
    house,
    land,
    build,
    furniture: Math.round(furniture),
    stored: Math.round(stored),
    storedCount: hh?.stored?.length ?? 0,
    bills,
    weekPay,
    inherited: fam.inherited ?? 0,
    worth: funds + house + Math.round(stored) - bills,
  };
}

/** A família não tem mais ninguém: sai do bairro (ou da gaveta). */
export function dropEmptyFamily(world: World, fam: Family): void {
  if (inBin(fam)) {
    if (world.town) world.town.families = world.town.families.filter((f) => f.id !== fam.id);
    return;
  }
  dissolve(world, fam);
}
