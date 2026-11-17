import type { Person } from './people';
import { personOf, tileDistance, traitFactor } from './people';
import { addMemory, applyDelta, ensureRelation, relKey, relationOf, setDating, touch } from './relations';
import { nextFloat } from './rng';
import type { Catalog, Folk, News, World } from './types';

// Fofoca, reputação, ciúme e término. Tudo puro: recebe o mundo, o catálogo
// e uma função de aviso (o log da Sim).

export type Logger = (key: string, params?: Record<string, string | number>) => void;

export const REP_MIN = -100;
export const REP_MAX = 100;
/** notícias guardadas no mundo (as mais velhas caem primeiro) */
export const MAX_NEWS = 40;
/** quem está a até tantos tiles vê o que acontece no lote */
export const WITNESS_RANGE = 7;
/** amizade mínima para passar fofoca adiante fora do lote */
export const GOSSIP_FRIENDSHIP = 12;
/** chance base, por dia, de quem sabe contar para cada amigo (vezes o "suculento") */
export const NETWORK_SPREAD = 0.35;
/** chance, no fim de um papo amigável, de puxar um assunto (vezes o "suculento") */
export const CHAT_SPREAD = 0.3;
/** abaixo deste romance quem descobre uma traição termina */
export const BREAKUP_ROMANCE = 30;
/** um namoro em que um dos lados caiu abaixo disto termina sozinho */
export const FADED_ROMANCE = 12;

export function reputationOf(world: World, id: number): number {
  return world.reputation[String(id)] ?? 0;
}

export function addReputation(world: World, id: number, delta: number): void {
  const v = reputationOf(world, id) + delta;
  world.reputation[String(id)] = Math.max(REP_MIN, Math.min(REP_MAX, Math.round(v * 10) / 10));
}

/** Rótulo da reputação (chave de texto). */
export function reputationLabel(rep: number): string {
  if (rep >= 40) return 'rep.admired';
  if (rep >= 15) return 'rep.liked';
  if (rep > -15) return 'rep.plain';
  if (rep > -40) return 'rep.talked';
  return 'rep.notorious';
}

/** Com quem esta pessoa namora (pode ser mais de um, quando há traição). */
export function partnersOf(world: World, id: number): number[] {
  const out: number[] = [];
  const prefix = `${id}>`;
  for (const [k, rel] of Object.entries(world.relations)) {
    if (rel.dating && k.startsWith(prefix)) out.push(Number(k.slice(prefix.length)));
  }
  return out;
}

export function knowsNews(news: News, id: number): boolean {
  return news.knownBy.includes(id);
}

/**
 * Cria uma notícia. Quem sabe de saída: os envolvidos e quem viu. A
 * reputação de quem é o assunto já muda por cada testemunha.
 */
export function createNews(
  world: World,
  catalog: Catalog,
  log: Logger,
  kind: string,
  about: number,
  other: number,
  witnesses: number[] = [],
): News | null {
  const def = catalog.news[kind];
  if (!def) return null;
  const news: News = { id: world.nextId++, kind, about, other, tick: world.tick, knownBy: [] };
  world.news.push(news);
  if (world.news.length > MAX_NEWS) world.news.splice(0, world.news.length - MAX_NEWS);
  news.knownBy.push(about);
  if (other && other !== about) news.knownBy.push(other);
  for (const w of witnesses) learnNews(world, catalog, log, news, w, 'saw');
  return news;
}

/**
 * Alguém fica sabendo. A reputação do assunto muda, a opinião de quem ouve
 * também (se já o conhece), e quem namora o assunto pode sentir ciúme.
 * Devolve false se já sabia.
 */
export function learnNews(
  world: World,
  catalog: Catalog,
  log: Logger,
  news: News,
  hearerId: number,
  how: 'saw' | 'heard',
  tellerId = 0,
): boolean {
  if (knowsNews(news, hearerId) || hearerId === news.about) return false;
  const def = catalog.news[news.kind];
  const hearer = personOf(world, hearerId);
  if (!def || !hearer) return false;
  news.knownBy.push(hearerId);
  addReputation(world, news.about, def.reputation);
  const about = personOf(world, news.about);
  if (about && def.opinion && relationOf(world, hearerId, news.about)) {
    applyDelta(world, catalog, hearer, about, def.opinion);
  }
  // quem namora o assunto e não é o "outro" da história: ciúme
  if (def.jealousy && news.other !== hearerId && relationOf(world, hearerId, news.about)?.dating) {
    jealousy(world, catalog, log, hearerId, news.about, news.other, how === 'saw');
  } else if (hearer.resident && how === 'heard' && about) {
    const teller = personOf(world, tellerId);
    log('log.heardGossip', {
      name: hearer.name,
      teller: teller?.name ?? '',
      news: def.label,
      about: about.name,
      other: personOf(world, news.other)?.name ?? '',
    });
  }
  return true;
}

/**
 * `partnerId` descobre que quem namora (`cheaterId`) andou de chamego com
 * `thirdId`. O romance despenca, nascem lembranças amargas e, se não sobrar
 * muito, o namoro acaba.
 */
export function jealousy(
  world: World,
  catalog: Catalog,
  log: Logger,
  partnerId: number,
  cheaterId: number,
  thirdId: number,
  saw: boolean,
): void {
  const partner = personOf(world, partnerId);
  const cheater = personOf(world, cheaterId);
  const third = personOf(world, thirdId);
  if (!partner || !cheater) return;
  const j = traitFactor(partner.traits, catalog.traits, 'jealousy');
  applyDelta(world, catalog, partner, cheater, { romance: -22 * j, friendship: -10 * j });
  addMemory(world, catalog, partnerId, cheaterId, 'cheatedOnMe');
  if (third) {
    applyDelta(world, catalog, partner, third, { friendship: -14 * j });
    addMemory(world, catalog, partnerId, thirdId, 'rival');
  }
  if (partner.folk && j >= 1) {
    // quem viu na hora fica arrasado
    partner.folk.needs.comfort = Math.max(0, partner.folk.needs.comfort - 20 * j);
    partner.folk.needs.fun = Math.max(0, partner.folk.needs.fun - 15 * j);
  }
  const names = { name: partner.name, other: cheater.name, third: third?.name ?? '' };
  if (partner.resident || cheater.resident || saw) log(saw ? 'log.jealousSaw' : 'log.jealousHeard', names);
  const rel = relationOf(world, partnerId, cheaterId);
  if (rel?.dating && rel.romance < BREAKUP_ROMANCE) breakUp(world, catalog, log, partnerId, cheaterId, 'cheated');
}

/** `fromId` termina com `toId`. */
export function breakUp(
  world: World,
  catalog: Catalog,
  log: Logger,
  fromId: number,
  toId: number,
  why: 'cheated' | 'faded' | 'asked',
): void {
  const from = personOf(world, fromId);
  const to = personOf(world, toId);
  if (!from || !to || !relationOf(world, fromId, toId)?.dating) return;
  setDating(world, fromId, toId, false);
  applyDelta(world, catalog, to, from, { romance: -30, friendship: why === 'faded' ? -4 : -12 });
  applyDelta(world, catalog, from, to, { romance: why === 'faded' ? -10 : -20 });
  addMemory(world, catalog, fromId, toId, 'brokeUp');
  addMemory(world, catalog, toId, fromId, 'gotDumped');
  touch(world, fromId, toId);
  log(why === 'cheated' ? 'log.breakUpCheated' : why === 'faded' ? 'log.breakUpFaded' : 'log.breakUp', {
    name: from.name,
    other: to.name,
  });
  createNews(world, catalog, log, 'brokeUp', fromId, toId, onLotWitnesses(world, from.folk, [fromId, toId]));
}

/**
 * Um gesto romântico entre `a` e `b` foi aceito. Se um dos dois namora outra
 * pessoa, é traição: quem estava perto viu, e a notícia passa a correr.
 */
export function romanticAct(
  world: World,
  catalog: Catalog,
  log: Logger,
  a: number,
  b: number,
  witnesses: number[],
): void {
  for (const [cheater, third] of [
    [a, b],
    [b, a],
  ]) {
    const betrayed = partnersOf(world, cheater).filter((p) => p !== third);
    if (!betrayed.length) continue;
    const news = createNews(world, catalog, log, 'cheated', cheater, third, []);
    if (!news) continue;
    for (const w of witnesses) if (w !== a && w !== b) learnNews(world, catalog, log, news, w, 'saw');
  }
}

/** Quem está no lote, acordado e perto o bastante para ver o que `at` faz. */
export function onLotWitnesses(world: World, at: Folk | undefined, except: number[]): number[] {
  if (!at) return [];
  return world.folks
    .filter(
      (f) =>
        !except.includes(f.id) &&
        !f.away &&
        f.collapsed === 0 &&
        tileDistance(f, at) <= WITNESS_RANGE,
    )
    .map((f) => f.id);
}

/**
 * Melhor assunto que `teller` tem para contar a `hearer`: uma notícia que um
 * sabe e o outro não, que não é sobre o próprio ouvinte. Ninguém espalha
 * coisa ruim de si mesmo.
 */
export function pickGossip(world: World, catalog: Catalog, tellerId: number, hearerId: number): News | null {
  let best: News | null = null;
  let bestScore = 0;
  for (const n of world.news) {
    if (!knowsNews(n, tellerId) || knowsNews(n, hearerId) || n.about === hearerId) continue;
    const def = catalog.news[n.kind];
    if (!def) continue;
    if (n.about === tellerId && def.reputation < 0) continue;
    // protege quem gosta muito: não espalha podre de quem é muito amigo
    const fondness = relationOf(world, tellerId, n.about)?.friendship ?? 0;
    if (def.reputation < 0 && fondness >= 60) continue;
    const ageDays = (world.tick - n.tick) / 1440;
    const score = def.juicy / (1 + ageDays * 0.3);
    if (score > bestScore) {
      best = n;
      bestScore = score;
    }
  }
  return best;
}

/**
 * Fim de um papo no lote: quem puxou pode aproveitar e contar uma novidade.
 * `force` = a conversa era para isso mesmo (fofocar).
 */
export function chatGossip(
  world: World,
  catalog: Catalog,
  log: Logger,
  teller: Folk,
  hearer: Folk,
  force: boolean,
): News | null {
  const news = pickGossip(world, catalog, teller.id, hearer.id);
  if (!news) return null;
  const def = catalog.news[news.kind];
  const p = force ? 1 : CHAT_SPREAD * (def?.juicy ?? 0) * traitFactor(teller.traits, catalog.traits, 'gossip');
  if (!force && nextFloat(world) >= p) return null;
  learnNews(world, catalog, log, news, hearer.id, 'heard', teller.id);
  return news;
}

/**
 * Uma vez por dia a fofoca anda sozinha pela rede de conhecidos: cada um que
 * sabe pode contar para cada amigo, fora da vista do jogador.
 */
export function spreadNews(world: World, catalog: Catalog, log: Logger): void {
  const day = 1440;
  world.news = world.news.filter((n) => world.tick - n.tick < (catalog.news[n.kind]?.days ?? 3) * day);
  // amigos de cada um, em ordem determinística
  const friends = new Map<number, number[]>();
  for (const [k, rel] of Object.entries(world.relations)) {
    if (rel.friendship < GOSSIP_FRIENDSHIP) continue;
    const [a, b] = k.split('>').map(Number);
    if (!friends.has(a)) friends.set(a, []);
    friends.get(a)!.push(b);
  }
  for (const news of world.news) {
    const def = catalog.news[news.kind];
    if (!def) continue;
    for (const teller of [...news.knownBy]) {
      const tp = personOf(world, teller);
      if (!tp) continue;
      if (news.about === teller && def.reputation < 0) continue;
      // não espalha podre de quem é muito amigo
      if (def.reputation < 0 && (relationOf(world, teller, news.about)?.friendship ?? 0) >= 60) continue;
      const g = traitFactor(tp.traits, catalog.traits, 'gossip');
      for (const q of friends.get(teller) ?? []) {
        if (knowsNews(news, q) || q === news.about) continue;
        if (nextFloat(world) < def.juicy * g * NETWORK_SPREAD) learnNews(world, catalog, log, news, q, 'heard', teller);
      }
    }
  }
}

/** Uma vez por dia: reputação volta devagar para o meio; namoros apagados terminam. */
export function dailyHearts(world: World, catalog: Catalog, log: Logger): void {
  for (const [k, v] of Object.entries(world.reputation)) {
    if (v > 0) world.reputation[k] = Math.max(0, v - 1);
    else if (v < 0) world.reputation[k] = Math.min(0, v + 1);
  }
  const seen = new Set<string>();
  for (const [k, rel] of Object.entries(world.relations)) {
    if (!rel.dating || seen.has(k)) continue;
    const [a, b] = k.split('>').map(Number);
    seen.add(k);
    seen.add(relKey(b, a));
    const back = world.relations[relKey(b, a)];
    if (!back) continue;
    if (rel.romance < FADED_ROMANCE || back.romance < FADED_ROMANCE) {
      const [from, to] = rel.romance <= back.romance ? [a, b] : [b, a];
      breakUp(world, catalog, log, from, to, 'faded');
    }
  }
}

/** Quanto o que `from` lembra de `to` pesa (para a IA guardar rancor ou carinho). */
export function grudge(world: World, catalog: Catalog, from: number, to: number): number {
  const rel = relationOf(world, from, to);
  if (!rel) return 0;
  let sum = 0;
  for (const m of rel.memories) sum += catalog.memories[m.kind]?.weight ?? 0;
  return sum;
}

/** Duas pessoas se conhecem fora do lote (colegas, vizinhos amigos). */
export function introduce(world: World, a: Person, b: Person, friendship: number, respect: number): void {
  if (relationOf(world, a.id, b.id)) return;
  ensureRelation(world, a.id, b.id);
  for (const [x, y] of [
    [a.id, b.id],
    [b.id, a.id],
  ]) {
    const rel = world.relations[relKey(x, y)];
    rel.friendship = friendship;
    rel.respect = respect;
    rel.memories.push({ tick: world.tick, kind: 'met' });
  }
}
