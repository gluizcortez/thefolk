import { binDraft, placeFamily } from './clan';
import { MINUTES_PER_DAY } from './clock';
import { CITY_EVENTS, eventKey, eventOnDay, rivalPoints } from './cityEvents';
import type { CityEventDef } from './cityEvents';
import type { FamilyDraft, MemberDraft } from './family';
import { inheritLook, inheritTemper, inheritTraits, isAdult, mixLooks, surnameOf } from './kids';
import { lifeOn, setStage, stageOf } from './life';
import { firstName, placeFree, rename, savingsOf, setBond, spouseOf } from './marriage';
import { defaultTastes, suggestDream, traitBlock, traitSlots, VOICE_MAX } from './persona';
import { affinity, ensureRelation, relationOf, setDating } from './relations';
import { nextFloat, nextInt } from './rng';
import { levelOf } from './skills';
import { legacyCloset } from './clothes';
import { temperFromTraits } from './temper';
import { activeLot, familyById, homeOf, hasHouse, leaveFamily, lotById, lotSaleValue, priceOf, pushFeed } from './town';
import type { Catalog, Family, Lot, Neighbor, StoryState, World } from './types';

// Plano 2, bloco 14: a história que anda sozinha. Uma vez por dia (logo
// depois da vida resumida das outras casas), as famílias que não estão em
// jogo namoram, ficam noivas, casam (um vai morar com o outro, ou os dois
// compram uma casa à venda), têm filhos, arrumam e trocam de emprego, mudam
// para uma casa maior (ou menor, se apertou) e reformam a casa; quando sobram
// casas vazias chega gente nova, com nome e rosto sorteados. Tudo sai no
// jornal da cidade (o mural do bairro). O relógio da vida (bloco 17) continua
// sendo quem envelhece e leva as pessoas; `rules.story = false` deixa a
// cidade parada. A família em jogo nunca é mexida aqui.

/** Chance por dia de começar um namoro novo na cidade. */
export const DATING_CHANCE = 0.35;
/** Dias de namoro antes de pensar em noivado, e a chance por dia depois disso. */
export const ENGAGE_AFTER = 4;
export const ENGAGE_CHANCE = 0.2;
/** Dias de noivado até o casamento. */
export const WED_AFTER = 2;
/** Chance por dia de um namoro sem compromisso acabar. */
export const SPLIT_CHANCE = 0.025;
/** Chance por dia de um casal morando junto ter um bebê (e o limite da casa). */
export const BIRTH_CHANCE = 0.07;
export const HOUSE_MAX = 6;
/** Dias de bebê quando o relógio da vida está desligado (depois vira criança e fica). */
export const STILL_BABY_DAYS = 3;
/** Chances por dia: arrumar o primeiro emprego, trocar de área. */
export const JOB_CHANCE = 0.15;
export const SWITCH_CHANCE = 0.008;
/** Chance por dia de uma família pensar em mudar e de reformar (e quanto precisa ter). */
export const MOVE_CHANCE = 0.05;
export const RENOVATE_CHANCE = 0.03;
export const RENOVATE_FUNDS = 2600;
/** Chance por dia de chegar família nova quando há casas sobrando; quantas casas ficam para o jogador. */
export const ARRIVE_CHANCE = 0.3;
export const KEEP_FOR_SALE = 1;
/** Teto de gente morando nos bairros (para a cidade não lotar). */
export const TOWN_CAP = 70;

/** A história da cidade anda? (sem bairro, ou com a opção de cidade parada, não) */
export function storyOn(world: World): boolean {
  return !!world.town?.city && world.rules.story !== false;
}

export function storyState(world: World): StoryState {
  const town = world.town!;
  return (town.story ??= { since: {}, contests: {} });
}

const pairKey = (a: number, b: number) => (a < b ? `${a}>${b}` : `${b}>${a}`);

// ---------- quem entra na história ----------

/**
 * Gente da cidade que vive a história: não presta serviço, não está longe,
 * não é da família em jogo nem está no lote mostrado agora (visita, encontro).
 */
export function storyPeople(world: World): Neighbor[] {
  const town = world.town;
  if (!town) return [];
  const here = new Set([...world.folks, ...(world.outing?.home.folks ?? [])].map((f) => f.id));
  return world.neighbors.filter((n) => !n.service && !n.away && !here.has(n.id) && n.home !== town.active);
}

/** Ninguém no coração (sem namoro, noivado nem casamento com ninguém). */
export function isSingle(world: World, id: number): boolean {
  const prefix = `${id}>`;
  for (const [k, rel] of Object.entries(world.relations)) if (rel.dating && k.startsWith(prefix)) return false;
  return true;
}

/** Parentes de sangue perto (pais, filhos, irmãos) não namoram. */
export function kin(a: Pick<Neighbor, 'id' | 'parents'>, b: Pick<Neighbor, 'id' | 'parents'>): boolean {
  const pa = a.parents ?? [];
  const pb = b.parents ?? [];
  return pa.includes(b.id) || pb.includes(a.id) || pa.some((p) => pb.includes(p));
}

function grown(n: Neighbor): boolean {
  return isAdult(n);
}

// ---------- o dia ----------

/** Um dia da história da cidade (chamado às 3h, depois da vida resumida). */
export function storyDay(world: World, catalog: Catalog): void {
  if (!storyOn(world)) return;
  storyState(world);
  romance(world, catalog);
  births(world);
  stillBabies(world);
  jobs(world, catalog);
  moves(world, catalog);
  renovations(world, catalog);
  arrivals(world, catalog);
}

// ---------- namoro, noivado e casamento ----------

function romance(world: World, catalog: Catalog): void {
  const st = storyState(world);
  const pool = storyPeople(world);
  const byId = new Map(pool.map((n) => [n.id, n]));
  // casais que já existem: cada um no seu passo
  const seen = new Set<string>();
  for (const [k, rel] of Object.entries(world.relations)) {
    if (!rel.dating) continue;
    const [a, b] = k.split('>').map(Number);
    const key = pairKey(a, b);
    if (seen.has(key)) continue;
    seen.add(key);
    const na = byId.get(a);
    const nb = byId.get(b);
    if (!na || !nb) continue;
    // quem namora fora de jogo segue com o romance aquecido (sem a família para esfriar)
    for (const [x, y] of [
      [a, b],
      [b, a],
    ]) {
      const r = ensureRelation(world, x, y);
      r.romance = Math.min(100, Math.max(r.romance, 30) + 1);
      r.last = world.tick;
    }
    const since = (st.since[key] ??= world.tick);
    const days = (world.tick - since) / MINUTES_PER_DAY;
    if (rel.bond === 'married') continue;
    if (rel.bond === 'engaged') {
      if (days >= WED_AFTER) wed(world, catalog, na, nb);
      continue;
    }
    if (days >= 3 && nextFloat(world) < SPLIT_CHANCE) {
      setDating(world, a, b, false);
      delete st.since[key];
      pushFeed(world, 'feed.story.split', { a: na.name, b: nb.name });
      continue;
    }
    if (days >= ENGAGE_AFTER && nextFloat(world) < ENGAGE_CHANCE) {
      setBond(world, a, b, 'engaged');
      st.since[key] = world.tick;
      pushFeed(world, 'feed.story.engaged', { a: na.name, b: nb.name });
    }
  }
  // um namoro novo
  if (nextFloat(world) >= DATING_CHANCE) return;
  const singles = pool.filter((n) => grown(n) && isSingle(world, n.id));
  if (singles.length < 2) return;
  const a = singles[nextInt(world, singles.length)];
  const fits = singles.filter(
    (b) => b !== a && (b.home === undefined || b.home !== a.home) && !kin(a, b) && (stageOf(a) === 'elder') === (stageOf(b) === 'elder'),
  );
  if (!fits.length) return;
  // quem combina mais (afinidade e amizade) tem mais chance: o melhor de três sorteados
  let best: Neighbor | null = null;
  let bestScore = -Infinity;
  for (let i = 0; i < 3; i++) {
    const b = fits[nextInt(world, fits.length)];
    const score = affinity(catalog, a, b) * 10 + (relationOf(world, a.id, b.id)?.friendship ?? 0);
    if (score > bestScore) {
      best = b;
      bestScore = score;
    }
  }
  if (!best) return;
  for (const [x, y] of [
    [a.id, best.id],
    [best.id, a.id],
  ]) {
    const r = ensureRelation(world, x, y);
    r.friendship = Math.max(r.friendship, 40);
    r.romance = Math.max(r.romance, 40);
    r.last = world.tick;
  }
  setDating(world, a.id, best.id, true);
  st.since[pairKey(a.id, best.id)] = world.tick;
  pushFeed(world, 'feed.story.dating', { a: a.name, b: best.name });
}

/** Casamento: um vai morar com o outro (quem tem a casa menor muda), ou os dois compram uma casa. */
function wed(world: World, catalog: Catalog, a: Neighbor, b: Neighbor): void {
  const st = storyState(world);
  setBond(world, a.id, b.id, 'married');
  st.since[pairKey(a.id, b.id)] = world.tick;
  pushFeed(world, 'feed.story.married', { a: a.name, b: b.name });
  settleCouple(world, catalog, a, b);
}

function membersOf(world: World, famId: number): Neighbor[] {
  return world.neighbors.filter((n) => n.home === famId);
}

/** O casal passa a morar junto. Devolve a família onde ficaram (ou null, se ficaram sem casa no bairro). */
export function settleCouple(world: World, catalog: Catalog, a: Neighbor, b: Neighbor): Family | null {
  const town = world.town!;
  const fa = a.home !== undefined ? familyById(world, a.home) : undefined;
  const fb = b.home !== undefined ? familyById(world, b.home) : undefined;
  if (fa && fb && fa === fb) return fa;
  if (fa && fb) {
    // quem vem da casa com menos gente se muda (empate: b)
    const [mover, target] = membersOf(world, fa.id).length < membersOf(world, fb.id).length ? [a, fb] : [b, fa];
    const share = leaveFamily(world, mover);
    mover.home = target.id;
    target.funds += share;
    takeSurname(world, mover, target);
    return target;
  }
  if (fa || fb) {
    const target = (fa ?? fb)!;
    const mover = fa ? b : a;
    mover.home = target.id;
    target.funds += savingsOf(mover);
    takeSurname(world, mover, target);
    return target;
  }
  // nenhum dos dois mora no bairro: compram uma casa à venda, se der
  const funds = savingsOf(a) + savingsOf(b);
  const lot = cheapestForSale(world, catalog, funds);
  if (!lot) return null;
  const fam: Family = { id: town.nextFamily++, name: surnameOf(a.name) || a.name, lotId: lot.id, funds: funds - priceOf(world, catalog, lot), stash: null, since: world.tick };
  town.families.push(fam);
  lot.familyId = fam.id;
  a.home = fam.id;
  b.home = fam.id;
  takeSurname(world, b, fam);
  pushFeed(world, 'feed.story.newHome', { family: fam.name, number: lot.number });
  return fam;
}

function takeSurname(world: World, n: Neighbor, fam: Family): void {
  if (!fam.name || surnameOf(n.name) === fam.name || nextFloat(world) >= 0.5) return;
  rename(world, n.id, `${firstName(n.name)} ${fam.name}`);
}

/** Casas à venda (com casa em pé, sem ninguém e fora do lote em jogo). */
export function housesForSale(world: World): Lot[] {
  const town = world.town;
  if (!town) return [];
  const mine = activeLot(world)?.id;
  return town.lots.filter((l) => l.familyId === 0 && l.id !== mine && hasHouse(homeOf(world, l)));
}

function cheapestForSale(world: World, catalog: Catalog, funds: number): Lot | null {
  const lots = housesForSale(world)
    .map((l) => ({ l, price: priceOf(world, catalog, l) }))
    .filter((x) => x.price <= funds)
    .sort((x, y) => x.price - y.price || x.l.id - y.l.id);
  return lots[0]?.l ?? null;
}

// ---------- filhos ----------

function births(world: World): void {
  const town = world.town!;
  for (const fam of town.families) {
    if (fam.id === town.active || fam.lotId === 0) continue;
    const members = membersOf(world, fam.id);
    if (members.length >= HOUSE_MAX || members.some((m) => m.age === 'baby')) continue;
    const couple = members.find((m) => {
      if (stageOf(m) !== 'adult') return false;
      const s = spouseOf(world, m.id);
      const other = members.find((x) => x.id === s);
      return !!other && stageOf(other) === 'adult' && m.id < other.id;
    });
    if (!couple || nextFloat(world) >= BIRTH_CHANCE) continue;
    const partner = members.find((x) => x.id === spouseOf(world, couple.id))!;
    const parents = [couple, partner];
    const baby: Neighbor = {
      id: world.nextId++,
      name: '',
      traits: inheritTraits(world, parents),
      look: inheritLook(world, parents),
      temper: inheritTemper(world, parents),
      month: nextInt(world, 12),
      skills: {},
      career: null,
      age: 'baby',
      home: fam.id,
      parents: [couple.id, partner.id],
    };
    baby.name = babyNameFor(world, fam.name);
    // sem o relógio da vida o bebê vira criança depois de uns dias (e fica criança)
    if (!lifeOn(world)) baby.nextAge = world.tick + STILL_BABY_DAYS * MINUTES_PER_DAY;
    world.neighbors.push(baby);
    for (const p of [...parents, ...members.filter((m) => !parents.includes(m))]) {
      for (const [x, y] of [
        [p.id, baby.id],
        [baby.id, p.id],
      ]) {
        const r = ensureRelation(world, x, y);
        r.friendship = Math.max(r.friendship, parents.includes(p) ? 50 : 30);
        r.last = world.tick;
      }
    }
    pushFeed(world, 'feed.story.born', { name: baby.name, a: couple.name, b: partner.name });
  }
}

/** Nomes de bebê da cidade (o sobrenome vem da família). */
export const CITY_BABY_NAMES = [
  'Ana Lu', 'Beto', 'Cora', 'Dani', 'Elói', 'Fafá', 'Gabi', 'Hugo', 'Inês', 'Joca', 'Kika', 'Léo',
  'Malu', 'Nando', 'Olívia', 'Pedrinho', 'Quitéria', 'Rui', 'Sara', 'Tavinho', 'Úrsula', 'Vito', 'Zuza', 'Lia',
];

function babyNameFor(world: World, surname: string): string {
  const taken = new Set([...world.folks.map((f) => f.name), ...world.neighbors.map((n) => n.name)]);
  const start = nextInt(world, CITY_BABY_NAMES.length);
  for (let i = 0; i < CITY_BABY_NAMES.length; i++) {
    const name = `${CITY_BABY_NAMES[(start + i) % CITY_BABY_NAMES.length]} ${surname}`.trim();
    if (!taken.has(name)) return name;
  }
  return `${CITY_BABY_NAMES[start]} ${surname} ${world.nextId}`.trim();
}

/** Relógio da vida desligado: o bebê da cidade vira criança uma vez (e fica assim). */
function stillBabies(world: World): void {
  if (lifeOn(world)) return;
  for (const n of world.neighbors) {
    if (n.age !== 'baby' || n.nextAge === undefined || n.nextAge < 0 || world.tick < n.nextAge) continue;
    setStage(n, 'child');
    n.nextAge = -1;
    pushFeed(world, 'feed.became.child', { name: n.name });
  }
}

// ---------- emprego ----------

function jobs(world: World, catalog: Catalog): void {
  const careers = Object.keys(catalog.careers);
  if (!careers.length) return;
  for (const n of storyPeople(world)) {
    if (stageOf(n) !== 'adult' || n.downtown || n.retired) continue;
    if (!n.career) {
      // quem nunca trabalhou (ou acabou de crescer) arruma o primeiro emprego; quem foi mandado embora segue o remanejo de domingo
      if (n.wasFired || nextFloat(world) >= JOB_CHANCE) continue;
      const id = careers[nextInt(world, careers.length)];
      n.career = { id, level: 0 };
      pushFeed(world, 'feed.story.job', { name: n.name, place: catalog.careers[id].workplace ?? catalog.careers[id].name });
      continue;
    }
    if (n.boss || nextFloat(world) >= SWITCH_CHANCE) continue;
    const others = careers.filter((c) => c !== n.career!.id);
    if (!others.length) continue;
    const id = others[nextInt(world, others.length)];
    n.career = { id, level: Math.max(0, n.career.level - 2) };
    pushFeed(world, 'feed.story.newCareer', { name: n.name, place: catalog.careers[id].workplace ?? catalog.careers[id].name });
  }
}

// ---------- casa ----------

/** Famílias fora de jogo com casa no bairro (a gaveta e a família em jogo ficam de fora). */
function livingFamilies(world: World): Family[] {
  const town = world.town!;
  return town.families.filter((f) => f.id !== town.active && f.lotId !== 0 && membersOf(world, f.id).length > 0);
}

function moves(world: World, catalog: Catalog): void {
  for (const fam of livingFamilies(world)) {
    if (nextFloat(world) >= MOVE_CHANCE) continue;
    const lot = lotById(world, fam.lotId);
    if (!lot) continue;
    const people = membersOf(world, fam.id).length;
    const worth = lotSaleValue(world, catalog, lot);
    const now = priceOf(world, catalog, lot);
    const offers = housesForSale(world)
      .map((l) => ({ l, price: priceOf(world, catalog, l) }))
      .filter((x) => x.l.id !== lot.id);
    // apertou (gente demais ou dívida): casa mais barata; sobrando dinheiro: uma melhor
    const broke = fam.funds < -300;
    const crowded = people >= 4;
    let pick: { l: Lot; price: number } | undefined;
    if (broke) pick = offers.filter((x) => x.price < now * 0.8 && x.price <= fam.funds + worth).sort((x, y) => x.price - y.price)[0];
    else if (crowded || fam.funds > 6000) pick = offers.filter((x) => x.price > now * 1.15 && x.price + 500 <= fam.funds + worth).sort((x, y) => y.price - x.price)[0];
    if (!pick) continue;
    fam.funds += worth - pick.price;
    lot.familyId = 0;
    pick.l.familyId = fam.id;
    fam.lotId = pick.l.id;
    if (fam.stash) fam.stash.unplaced = true;
    pushFeed(world, broke ? 'feed.story.downsized' : 'feed.story.moved', { family: fam.name, number: pick.l.number });
  }
}

function renovations(world: World, catalog: Catalog): void {
  const items = Object.values(catalog.objects)
    .filter(
      (d) =>
        d.buyable !== false &&
        !d.layer &&
        d.price >= 60 &&
        d.price <= 700 &&
        (d.category === 'decor' || d.category === 'lighting') &&
        d.size.w === 1 &&
        d.size.h === 1 &&
        d.id !== 'mailbox' &&
        !d.interactions.some((i) => i.special),
    )
    .sort((a, b) => a.id.localeCompare(b.id));
  if (!items.length) return;
  for (const fam of livingFamilies(world)) {
    if (fam.funds < RENOVATE_FUNDS || nextFloat(world) >= RENOVATE_CHANCE) continue;
    const lot = lotById(world, fam.lotId);
    const home = lot?.home;
    if (!home) continue;
    const def = items[nextInt(world, items.length)];
    // procura lugar na casa guardada (num mundo de mentira com a planta dela)
    const fake = { ...world, grid: home.grid, objects: home.objects, folks: [], mess: [] } as World;
    const obj = placeFree(fake, catalog, def.id, { x: Math.floor(home.grid.w / 2), y: Math.floor(home.grid.h / 2) });
    world.nextId = fake.nextId;
    if (!obj) continue;
    obj.paid = def.price;
    fam.funds -= def.price;
    pushFeed(world, 'feed.story.renovated', { family: fam.name, item: def.name });
  }
}

// ---------- gente nova ----------

/** Nomes de quem chega de fora (primeiro nome e sobrenome). */
export const NEWCOMER_FIRST = [
  'Bento', 'Iara', 'Otávio', 'Cecília', 'Ravi', 'Lúcia', 'Dito', 'Helena', 'Zélia', 'Ícaro', 'Nestor', 'Olga',
  'Quim', 'Teca', 'Aurora', 'Benedito', 'Clara', 'Durval', 'Estela', 'Firmino', 'Graça', 'Horácio', 'Irene', 'Jonas',
  'Laís', 'Matias', 'Noêmia', 'Orlando', 'Pietra', 'Romeu', 'Sílvia', 'Tobias', 'Vânia', 'Wagner', 'Yara', 'Zacarias',
];
export const NEWCOMER_SURNAMES = [
  'Goiabeira', 'Fresta', 'Paiol', 'Biquinha', 'Ripado', 'Caibro', 'Alizar', 'Trinco', 'Postigo', 'Mourão',
  'Pergolado', 'Lambri', 'Taipa', 'Adobe', 'Sapata', 'Viga', 'Tramela', 'Bandeirola', 'Soalho', 'Peitoril',
];

function draftMember(world: World, catalog: Catalog, taken: string[], age?: MemberDraft['age']): MemberDraft {
  const free = NEWCOMER_FIRST.filter((n) => !taken.includes(n));
  const name = free[nextInt(world, free.length)] ?? `${NEWCOMER_FIRST[0]}${taken.length}`;
  const look = mixLooks([], (n) => nextInt(world, n));
  const ids = Object.keys(catalog.traits).sort();
  const traits: string[] = [];
  for (let guard = 0; traits.length < traitSlots(age) && guard < 400; guard++) {
    const id = ids[nextInt(world, ids.length)];
    if (!traitBlock(catalog, traits, id, age)) traits.push(id);
  }
  const temper = temperFromTraits(catalog, traits);
  const m: MemberDraft = {
    name,
    look,
    traits,
    temper,
    month: nextInt(world, catalog.months.length),
    tastes: defaultTastes(temper, nextInt(world, 1_000_000)),
    voice: nextInt(world, VOICE_MAX + 1),
    closet: legacyCloset(look, age),
  };
  if (age) m.age = age;
  const dream = suggestDream(catalog, traits);
  if (dream) m.dream = dream;
  return m;
}

/** Uma família sorteada: alguém sozinho, um casal, um casal com filho ou alguém com o pai idoso. */
export function randomDraft(world: World, catalog: Catalog): FamilyDraft {
  const used = new Set((world.town?.families ?? []).map((f) => f.name));
  const free = NEWCOMER_SURNAMES.filter((s) => !used.has(s));
  const surname = free.length ? free[nextInt(world, free.length)] : `${NEWCOMER_SURNAMES[nextInt(world, NEWCOMER_SURNAMES.length)]} ${world.nextId}`;
  const shape = nextInt(world, 4);
  const members: MemberDraft[] = [];
  const add = (age?: MemberDraft['age']) => members.push(draftMember(world, catalog, members.map((m) => m.name), age));
  const ties: FamilyDraft['ties'] = [];
  add();
  if (shape === 1 || shape === 2) {
    add();
    ties.push({ a: 0, b: 1, kind: 'spouse' });
  }
  if (shape === 2) {
    add(nextFloat(world) < 0.5 ? 'child' : 'teen');
    ties.push({ a: 0, b: 2, kind: 'parent' }, { a: 1, b: 2, kind: 'parent' });
  }
  if (shape === 3) {
    add('elder');
    ties.push({ a: 1, b: 0, kind: 'parent' });
  }
  return { surname, members, ties };
}

function arrivals(world: World, catalog: Catalog): void {
  const town = world.town!;
  const living = world.neighbors.filter((n) => n.home !== undefined).length;
  if (living >= TOWN_CAP) return;
  const offers = housesForSale(world);
  if (offers.length <= KEEP_FOR_SALE || nextFloat(world) >= ARRIVE_CHANCE) return;
  const budget = 6000;
  const lot = cheapestForSale(world, catalog, budget);
  if (!lot) return;
  const fam = binDraft(world, catalog, randomDraft(world, catalog), true);
  if (!fam) return;
  if (placeFamily(world, catalog, fam.id, lot.id)) {
    // não coube: desfaz
    town.families = town.families.filter((f) => f !== fam);
  }
}

// ---------- concursos (o placar da cidade) ----------

/** Pontos dos concorrentes da cidade num concurso (os melhores primeiro). */
export function contestRivals(world: World, def: CityEventDef, day: number): { id: number; name: string; points: number }[] {
  if (!def.skill) return [];
  const key = eventKey(def.id, day);
  const out = storyPeople(world)
    .filter((n) => (n.skills[def.skill!] ?? 0) >= 60 && n.age !== 'baby' && n.age !== 'child')
    .map((n) => ({ id: n.id, name: n.name, points: rivalPoints(levelOf(n.skills[def.skill!] ?? 0), n.id, key) }));
  return out.sort((a, b) => b.points - a.points || a.id - b.id).slice(0, 8);
}

/**
 * Às 3h: o resultado dos concursos de ontem sai no jornal (quem ganhou: a
 * família, se foi melhor que todo mundo, ou alguém da cidade), e o jornal
 * avisa os eventos de hoje.
 */
export function cityCalendar(world: World): void {
  if (!world.town?.city) return;
  const st = storyState(world);
  const day = Math.floor(world.tick / MINUTES_PER_DAY);
  for (const def of CITY_EVENTS) {
    if (def.skill && eventOnDay(def, day - 1)) {
      const key = eventKey(def.id, day - 1);
      const entry = (st.contests[key] ??= { entrants: [] });
      if (!entry.told) {
        entry.told = true;
        const best = [...entry.entrants].sort((a, b) => a.place - b.place)[0];
        const rival = contestRivals(world, def, day - 1)[0];
        const winner = best && best.place === 1 ? best.name : rival?.name;
        if (winner) pushFeed(world, 'feed.story.contestWon', { name: winner, event: `event.${def.id}` });
      }
    }
    if (eventOnDay(def, day)) pushFeed(world, 'feed.story.today', { event: `event.${def.id}`, place: `place.${def.place}` });
  }
  // o placar só guarda as últimas semanas
  for (const key of Object.keys(st.contests)) {
    const d = Number(key.split(':')[1]);
    if (day - d > 28) delete st.contests[key];
  }
  for (const [key, at] of Object.entries(st.since)) {
    const [a, b] = key.split('>').map(Number);
    if (!relationOf(world, a, b)?.dating && world.tick - at > MINUTES_PER_DAY) delete st.since[key];
  }
}

// ---------- conferência (testes e depuração) ----------

/** Contagem da cidade (fora da família em jogo). */
export function census(world: World): { families: number; people: number; couples: number; kids: number } {
  const town = world.town;
  if (!town) return { families: 0, people: 0, couples: 0, kids: 0 };
  const living = world.neighbors.filter((n) => n.home !== undefined && n.home !== town.active);
  let couples = 0;
  for (const n of living) {
    const s = spouseOf(world, n.id);
    if (s && s > n.id && living.some((x) => x.id === s)) couples++;
  }
  return {
    families: livingFamilies(world).length,
    people: living.length,
    couples,
    kids: living.filter((n) => n.age === 'baby' || n.age === 'child' || n.age === 'teen').length,
  };
}

/** Estados impossíveis na cidade (lista vazia = tudo certo). */
export function cityProblems(world: World): string[] {
  const town = world.town;
  if (!town) return [];
  const out: string[] = [];
  const famIds = new Set(town.families.map((f) => f.id));
  for (const lot of town.lots) {
    if (lot.familyId && !famIds.has(lot.familyId)) out.push(`lote ${lot.id}: família ${lot.familyId} não existe`);
    const owners = town.families.filter((f) => f.lotId === lot.id);
    if (owners.length > 1) out.push(`lote ${lot.id}: ${owners.length} famílias`);
    if (owners.length === 1 && lot.familyId !== owners[0].id) out.push(`lote ${lot.id}: dono trocado`);
  }
  for (const fam of town.families) {
    if (fam.lotId === 0) continue;
    const lot = lotById(world, fam.lotId);
    if (!lot) out.push(`família ${fam.name}: lote ${fam.lotId} não existe`);
    else if (fam.id !== town.active && !lot.home) out.push(`família ${fam.name}: mora num terreno sem casa`);
    if (fam.id !== town.active && membersOf(world, fam.id).length === 0) out.push(`família ${fam.name}: sem ninguém`);
  }
  const ids = new Set<number>();
  for (const n of world.neighbors) {
    if (ids.has(n.id)) out.push(`${n.name}: id repetido`);
    ids.add(n.id);
    if (n.home !== undefined && !famIds.has(n.home)) out.push(`${n.name}: mora numa família que não existe`);
    const s = spouseOf(world, n.id);
    const partner = s ? world.neighbors.find((x) => x.id === s) : undefined;
    if (partner && partner.home !== n.home && n.home !== undefined && partner.home !== undefined) out.push(`${n.name}: casado(a) morando em outra casa`);
    if (n.age === 'baby' && !n.parents?.length && n.home !== undefined && !town.families.some((f) => f.id === n.home)) out.push(`${n.name}: bebê sem casa`);
  }
  return out;
}
