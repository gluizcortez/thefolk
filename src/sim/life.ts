import { MINUTES_PER_DAY } from './clock';
import { refitCloset } from './clothes';
import type { Closet } from './clothes';
import { levelOfJob, payFor } from './career';
import { freshKid } from './kids';
import { spouseOf } from './marriage';
import { nextFloat } from './rng';
import type { Age, AlbumEntry, Catalog, Folk, Job, LifePace, LifeStage, Neighbor, World } from './types';

// Bloco 17: gerações. O relógio da vida é opcional (jogo novo); desligado,
// ninguém envelhece além de bebê virar criança, como sempre foi. Ligado:
// criança → jovem → adulto → idoso → fim. Aqui moram as regras puras
// (quanto dura cada fase, pensão, herança, álbum, árvore); o Sim só chama.

/** Dias de cada fase por ritmo (o bebê continua com BABY_DAYS). */
export const LIFE_PACES: Record<Exclude<LifePace, 'off'>, Record<'child' | 'teen' | 'adult' | 'elder', number>> = {
  short: { child: 4, teen: 4, adult: 12, elder: 5 },
  normal: { child: 7, teen: 7, adult: 24, elder: 10 },
  long: { child: 12, teen: 12, adult: 45, elder: 18 },
};
export const LIFE_PACE_IDS: LifePace[] = ['off', 'short', 'normal', 'long'];

/** Quem já está numa fase quando o relógio pega ele (jogo novo, mudança) começa num ponto qualquer dela, a partir disto. */
export const LATE_START_MIN = 0.35;

/** Pensão por dia: esta parte do que o último cargo rendia por dia. */
export const PENSION_SHARE = 0.5;

/** Pensão de quem já chega idoso sem carreira no jogo (criador de família). */
export const BASE_PENSION = 35;

/** Pecúlio que quem morre deixa: base mais tanto por cargo alcançado. */
export const ESTATE_BASE = 300;
export const ESTATE_PER_LEVEL = 180;

/** Álbum: páginas no máximo e fotos de verdade (as mais velhas saem primeiro). */
export const ALBUM_MAX = 60;
export const PHOTO_MAX = 16;
/** Foto maior que isto (data URL) não entra no save. */
export const PHOTO_BYTES = 60_000;

/** Minutos que o Seu Sereno espera quando vem por velhice (sem barganha). */
export const FAREWELL_MINUTES = 30;

/** Árvore: quantas gerações para cima e para baixo de quem mora na casa. */
export const TREE_DEPTH = 3;

type Person = Pick<Folk | Neighbor, 'id' | 'age'> & { nextAge?: number };

export function lifePace(world: World): LifePace {
  return world.rules.life ?? 'off';
}

export function lifeOn(world: World): boolean {
  return lifePace(world) !== 'off';
}

export function stageOf(p: { age?: Age } | undefined): LifeStage {
  return p?.age ?? 'adult';
}

export function isTeen(p: { age?: Age } | undefined): boolean {
  return p?.age === 'teen';
}

export function isElder(p: { age?: Age } | undefined): boolean {
  return p?.age === 'elder';
}

/** Vai à escola: criança e jovem. */
export function inSchool(p: { age?: Age } | undefined): boolean {
  return p?.age === 'child' || p?.age === 'teen';
}

/** Dias da fase neste ritmo (null = a fase não acaba pelo relógio). */
export function stageDays(pace: LifePace, stage: LifeStage): number | null {
  if (pace === 'off' || stage === 'baby') return null;
  return LIFE_PACES[pace][stage];
}

/** Fase seguinte (null depois de idoso: é o fim). */
export function nextStage(stage: LifeStage): LifeStage | null {
  const order: LifeStage[] = ['baby', 'child', 'teen', 'adult', 'elder'];
  const i = order.indexOf(stage);
  return i >= 0 && i < order.length - 1 ? order[i + 1] : null;
}

/** Põe a pessoa na fase (adulto = sem campo). */
export function setStage(p: { age?: Age; closet?: Closet }, stage: LifeStage): void {
  if (stage === 'adult') delete p.age;
  else p.age = stage;
  // plano 2, bloco 9: quem cresce troca as peças que não servem mais pelas da idade nova
  if (p.closet) p.closet = refitCloset(p.closet, p.age);
}

/**
 * Marca quando a fase termina. `fresh` = acabou de entrar nela (fase
 * inteira); senão começa num ponto qualquer, para a família criada de uma
 * vez não envelhecer toda no mesmo dia. Relógio desligado tira a marca.
 */
export function scheduleAge(world: World, p: Person, fresh: boolean): void {
  const days = stageDays(lifePace(world), stageOf(p));
  if (days === null) {
    delete p.nextAge;
    return;
  }
  const part = fresh ? 1 : LATE_START_MIN + (1 - LATE_START_MIN) * nextFloat(world);
  p.nextAge = world.tick + Math.round(days * part * MINUTES_PER_DAY);
}

/** Dias que faltam para a próxima fase (null = não muda). */
export function daysToNextStage(world: World, p: Person): number | null {
  if (p.nextAge === undefined || !lifeOn(world)) return null;
  return Math.max(0, Math.ceil((p.nextAge - world.tick) / MINUTES_PER_DAY));
}

/** Ficha de escola para quem é jovem sem ter passado pela infância no jogo (criador, migração). */
export function schoolKid(tick: number, parents: number[]): Folk['kid'] {
  const kid = freshKid(tick, parents, false);
  kid.grows = tick;
  return kid;
}

// ---------- trabalho e aposentadoria ----------

/** Pensão por dia de quem se aposenta neste emprego. */
export function pensionFor(catalog: Catalog, job: Job): number {
  const level = levelOfJob(catalog, job);
  if (!level || job.partTime) return 0;
  return Math.round((payFor(catalog, job) * level.days.length * PENSION_SHARE) / 7);
}

// ---------- herança ----------

/** Pecúlio que a pessoa deixa (cresce com o cargo que alcançou). */
export function estateOf(p: Pick<Folk, 'job' | 'retired' | 'age'> & { career?: Neighbor['career'] }): number {
  if (p.age === 'baby' || p.age === 'child' || p.age === 'teen') return 0;
  const level = p.job && !p.job.partTime ? p.job.level + 1 : p.retired ? p.retired.level + 1 : 0;
  return ESTATE_BASE + ESTATE_PER_LEVEL * level;
}

/** Filhos vivos de alguém (moradores e gente do bairro). */
export function childrenOf(world: World, id: number): number[] {
  const out = new Set<number>();
  for (const f of world.folks) if (!f.visit && (f.parents ?? f.kid?.parents ?? []).includes(id)) out.add(f.id);
  for (const n of world.neighbors) if ((n.parents ?? []).includes(id)) out.add(n.id);
  return [...out].sort((a, b) => a - b);
}

export interface Heir {
  id: number;
  /** 'home' = mora na casa em jogo; número = família do bairro; 'out' = mora fora */
  where: 'home' | number | 'out';
  /** cônjuge ou filho */
  tie: 'spouse' | 'child';
}

/** Herdeiros: o cônjuge e os filhos vivos, com onde cada um mora. */
export function heirsOf(world: World, deadId: number, spouse: number = spouseOf(world, deadId)): Heir[] {
  const where = (id: number): Heir['where'] => {
    if (world.folks.some((f) => f.id === id && !f.visit)) return 'home';
    const n = world.neighbors.find((x) => x.id === id);
    return n?.home !== undefined ? n.home : 'out';
  };
  const out: Heir[] = [];
  if (spouse && (world.folks.some((f) => f.id === spouse) || world.neighbors.some((n) => n.id === spouse))) {
    out.push({ id: spouse, where: where(spouse), tie: 'spouse' });
  }
  for (const id of childrenOf(world, deadId)) if (id !== spouse) out.push({ id, where: where(id), tie: 'child' });
  return out;
}

/**
 * Reparte o pecúlio: partes iguais por herdeiro, somadas por casa. Quem mora
 * fora do bairro também tem parte (o dinheiro vai embora com ele). Sem
 * herdeiro, tudo fica com a casa.
 */
export function splitEstate(total: number, heirs: Heir[]): Map<Heir['where'], number> {
  const out = new Map<Heir['where'], number>();
  if (heirs.length === 0) {
    out.set('home', total);
    return out;
  }
  const share = Math.floor(total / heirs.length);
  heirs.forEach((h, i) => {
    const extra = i === 0 ? total - share * heirs.length : 0;
    out.set(h.where, (out.get(h.where) ?? 0) + share + extra);
  });
  return out;
}

/**
 * Quem herda os objetos queridos: o cônjuge que mora na casa, depois o filho
 * mais velho da casa, depois quem mais usou o objeto. 0 = ninguém.
 */
export function heirloomHeir(world: World, deadId: number, uses: Record<string, number> | undefined, heirs: Heir[]): number {
  const home = heirs.filter((h) => h.where === 'home');
  const spouse = home.find((h) => h.tie === 'spouse');
  if (spouse) return spouse.id;
  const kids = home.filter((h) => h.tie === 'child').map((h) => world.folks.find((f) => f.id === h.id)!);
  const grownFirst = kids.filter((k) => k && k.age !== 'baby').sort((a, b) => (a.kid?.born ?? -1e9) - (b.kid?.born ?? -1e9) || a.id - b.id);
  if (grownFirst[0]) return grownFirst[0].id;
  let best = 0;
  let most = 0;
  for (const [id, m] of Object.entries(uses ?? {})) {
    const f = world.folks.find((x) => x.id === Number(id) && !x.visit && x.age !== 'baby');
    if (f && Number(id) !== deadId && m > most) {
      best = f.id;
      most = m;
    }
  }
  return best;
}

// ---------- álbum ----------

/** Cola uma página no álbum da casa (tira as mais velhas quando enche). */
export function addAlbum(world: World, page: Omit<AlbumEntry, 'id' | 'tick'>): AlbumEntry | null {
  if (page.photo && page.photo.length > PHOTO_BYTES) return null;
  const album = (world.household.album ??= []);
  const entry: AlbumEntry = { id: world.nextId++, tick: world.tick, ...page };
  album.push(entry);
  const photos = album.filter((e) => e.photo);
  if (photos.length > PHOTO_MAX) world.household.album = album.filter((e) => e !== photos[0]);
  if (world.household.album!.length > ALBUM_MAX) world.household.album!.splice(0, world.household.album!.length - ALBUM_MAX);
  return entry;
}

// ---------- árvore da família ----------

export interface TreePerson {
  id: number;
  name: string;
  stage: LifeStage;
  gone: boolean;
  /** mora na casa em jogo */
  home: boolean;
  parents: number[];
  spouse: number;
  look: Folk['look'];
}

export interface TreeRow {
  /** 0 = a geração de quem mora na casa (o mais velho de lá); negativo = antepassados */
  gen: number;
  people: TreePerson[];
}

/** Todo mundo que a árvore conhece: moradores, gente do bairro e quem já se foi. */
export function treePeople(world: World): Map<number, TreePerson> {
  const map = new Map<number, TreePerson>();
  for (const d of world.departed) {
    map.set(d.id, { id: d.id, name: d.name, stage: stageOf(d), gone: true, home: false, parents: d.parents ?? [], spouse: d.spouse ?? 0, look: d.look });
  }
  for (const n of world.neighbors) {
    if (n.service) continue;
    map.set(n.id, { id: n.id, name: n.name, stage: stageOf(n), gone: false, home: false, parents: n.parents ?? [], spouse: spouseOf(world, n.id), look: n.look });
  }
  for (const f of world.folks) {
    if (f.visit && map.has(f.id)) continue;
    map.set(f.id, {
      id: f.id,
      name: f.name,
      stage: stageOf(f),
      gone: false,
      home: !f.visit,
      parents: f.parents ?? f.kid?.parents ?? [],
      spouse: spouseOf(world, f.id),
      look: f.look,
    });
  }
  return map;
}

/**
 * A árvore a partir de quem mora na casa: pais e avós para cima, filhos e
 * netos para baixo, cônjuges ao lado. Cada linha é uma geração; casais
 * ficam juntos e irmãos perto.
 */
export function familyTree(world: World, rootIds?: number[]): TreeRow[] {
  const people = treePeople(world);
  const roots = rootIds ?? world.folks.filter((f) => !f.visit).map((f) => f.id);
  const gen = new Map<number, number>();
  const queue: number[] = [];
  const place = (id: number, g: number) => {
    if (!people.has(id) || gen.has(id) || Math.abs(g) > TREE_DEPTH) return;
    gen.set(id, g);
    queue.push(id);
  };
  // os moradores podem ser de gerações diferentes: os pais deles ficam acima
  const homeIds = new Set(roots);
  // casal na mesma linha (vale a mais funda dos dois); filho uma linha abaixo dos pais
  const level = (id: number, seen: Set<number> = new Set()): number => {
    if (seen.has(id)) return 0;
    const next = new Set(seen).add(id);
    const own = (x: number): number => {
      const ups = (people.get(x)?.parents ?? []).filter((y) => homeIds.has(y) && !next.has(y));
      return ups.length ? 1 + Math.max(...ups.map((y) => level(y, next))) : 0;
    };
    const mate = people.get(id)?.spouse ?? 0;
    return Math.max(own(id), mate && homeIds.has(mate) && !next.has(mate) ? own(mate) : 0);
  };
  for (const id of [...roots].sort((a, b) => level(a) - level(b))) place(id, level(id));
  const children = new Map<number, number[]>();
  for (const p of people.values()) for (const par of p.parents) children.set(par, [...(children.get(par) ?? []), p.id]);
  while (queue.length) {
    const id = queue.shift()!;
    const p = people.get(id)!;
    const g = gen.get(id)!;
    if (p.spouse) place(p.spouse, g);
    for (const par of p.parents) place(par, g - 1);
    for (const c of children.get(id) ?? []) place(c, g + 1);
  }
  const rows = new Map<number, TreePerson[]>();
  for (const [id, g] of gen) rows.set(g, [...(rows.get(g) ?? []), people.get(id)!]);
  const out: TreeRow[] = [];
  for (const g of [...rows.keys()].sort((a, b) => a - b)) {
    // irmãos juntos (pela ordem dos pais), casal lado a lado
    const list = rows.get(g)!.sort((a, b) => (a.parents[0] ?? 1e9) - (b.parents[0] ?? 1e9) || a.id - b.id);
    const ordered: TreePerson[] = [];
    for (const p of list) {
      if (ordered.includes(p)) continue;
      ordered.push(p);
      const mate = list.find((q) => q.id === p.spouse && !ordered.includes(q));
      if (mate) ordered.push(mate);
    }
    out.push({ gen: g, people: ordered });
  }
  return out;
}

// ---------- quem entra e sai de jogo ----------

type LifeFields = Pick<Folk, 'parents' | 'nextAge' | 'pension' | 'retired' | 'age'>;

/** Copia a vida (fase, pais, data da próxima fase, aposentadoria) de um lado para o outro. */
export function copyLife(from: LifeFields, to: LifeFields): void {
  setStage(to, stageOf(from));
  for (const k of ['parents', 'nextAge', 'pension', 'retired'] as const) {
    const v = from[k];
    if (v === undefined) delete to[k];
    else (to as Record<string, unknown>)[k] = Array.isArray(v) ? [...v] : typeof v === 'object' ? { ...v } : v;
  }
}

/** Depois de mudar de fase fora de jogo: a ficha de escola aparece ou some. */
export function fitKid(folk: Folk, tick: number): void {
  if (folk.age === 'baby' && !folk.kid) {
    folk.kid = freshKid(tick, folk.parents ?? [], false);
    folk.kid.grows = tick;
  }
  if (inSchool(folk) && !folk.kid) folk.kid = schoolKid(tick, folk.parents ?? []);
  if (folk.age === undefined || folk.age === 'elder') {
    if (folk.kid?.parents.length && !folk.parents) folk.parents = [...folk.kid.parents];
    delete folk.kid;
    if (folk.job?.partTime) delete folk.job.partTime;
  }
}

/** Dias de bebê fora de jogo (no lote em jogo vale o kid.grows). */
const BABY_DAYS_OFF = 3;

/**
 * Bloco 17: um dia na vida de quem é de uma família do bairro fora de jogo.
 * Devolve 'passed' quando chegou ao fim da velhice com a morte ligada (quem
 * chama tira a pessoa do jogo), a fase nova quando mudou, ou null.
 */
export function ageNeighbor(world: World, catalog: Catalog, n: Neighbor): LifeStage | 'passed' | null {
  if (!lifeOn(world)) return null;
  if (n.nextAge === undefined) {
    if (n.age === 'baby') n.nextAge = world.tick + BABY_DAYS_OFF * MINUTES_PER_DAY;
    else scheduleAge(world, n, false);
    return null;
  }
  if (n.nextAge < 0 || world.tick < n.nextAge) return null;
  const stage = stageOf(n);
  const next = nextStage(stage);
  if (!next) {
    if (world.rules.death) return 'passed';
    n.nextAge = -1;
    return null;
  }
  setStage(n, next);
  if (next === 'elder') {
    const career = n.career;
    n.retired = career ? { careerId: career.id, level: career.level } : { careerId: '', level: -1 };
    const level = career ? catalog.careers[career.id]?.levels[career.level] : undefined;
    n.pension = level ? Math.round((level.pay * level.days.length * PENSION_SHARE) / 7) : 0;
    n.career = null;
    delete n.boss;
  }
  scheduleAge(world, n, true);
  return next;
}
