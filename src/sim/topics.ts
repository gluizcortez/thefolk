import { nextFloat } from './rng';
import { levelOf } from './skills';
import type { Catalog, Neighbor, Folk, Temper, World } from './types';

// Bloco 9: assuntos. Cada pessoa tem um gosto (-5 a 5) por assunto; o papo
// a dois, a roda de conversa e o telefone escolhem um assunto, e quem ouve
// reage pelo gosto dele. Ouvir um amigo falar com gosto puxa o gosto um
// pouquinho (o assunto pega).

export const INTEREST_MIN = -5;
export const INTEREST_MAX = 5;
/** a partir daqui o assunto é "adora"; abaixo de -INTEREST_HATE, "detesta" */
export const INTEREST_LOVE = 3;
export const INTEREST_LIKE = 1;
export const INTEREST_HATE = -2;
/** quanto o gosto anda quando um amigo fala do assunto com gosto */
export const INTEREST_CATCH = 0.2;

/** Quem tem gosto por assunto: morador, visita ou vizinho. */
export type Talker = Pick<Folk, 'id' | 'traits'> & { temper?: Temper; skills?: Record<string, number>; interests?: Record<string, number> };

export type Reaction = 'love' | 'like' | 'meh' | 'hate';

/** Número de 0 a 1 que depende só de `id` e do texto (sem mexer no RNG do mundo). */
function hash01(id: number, key: string): number {
  let h = (id * 2654435761) >>> 0;
  for (let i = 0; i < key.length; i++) h = Math.imul(h ^ key.charCodeAt(i), 16777619) >>> 0;
  h ^= h >>> 13;
  h = Math.imul(h, 0x5bd1e995) >>> 0;
  h ^= h >>> 15;
  return (h >>> 0) / 4294967296;
}

function clampInterest(v: number): number {
  return Math.max(INTEREST_MIN, Math.min(INTEREST_MAX, v));
}

/**
 * Gostos de nascença: temperamento, traços, o que já sabe fazer e um tanto
 * de acaso fixo por pessoa (sempre o mesmo para o mesmo id).
 */
export function seedInterests(catalog: Pick<Catalog, 'topics'>, p: Talker): Record<string, number> {
  const out: Record<string, number> = {};
  for (const t of Object.values(catalog.topics)) {
    let v = (hash01(p.id, t.id) - 0.5) * 4;
    for (const [axis, w] of Object.entries(t.axes)) v += ((p.temper?.[axis as keyof Temper] ?? 5) - 5) * (w ?? 0);
    for (const tr of p.traits) v += t.traits?.[tr] ?? 0;
    if (t.skill) v += Math.min(2, levelOf(p.skills?.[t.skill] ?? 0) * 0.4);
    out[t.id] = Math.round(clampInterest(v) * 10) / 10;
  }
  return out;
}

/** Garante que a pessoa tem os gostos preenchidos (saves antigos, gente nova). */
export function ensureInterests(catalog: Pick<Catalog, 'topics'>, p: Talker): Record<string, number> {
  if (!p.interests) p.interests = seedInterests(catalog, p);
  else {
    // assunto novo no catálogo entra com o gosto de nascença
    const missing = Object.keys(catalog.topics).filter((id) => p.interests![id] === undefined);
    if (missing.length) {
      const seed = seedInterests(catalog, p);
      for (const id of missing) p.interests[id] = seed[id];
    }
  }
  return p.interests;
}

export function interestIn(catalog: Pick<Catalog, 'topics'>, p: Talker, topic: string): number {
  return ensureInterests(catalog, p)[topic] ?? 0;
}

export function reactionTo(catalog: Pick<Catalog, 'topics'>, p: Talker, topic: string): Reaction {
  const v = interestIn(catalog, p, topic);
  if (v >= INTEREST_LOVE) return 'love';
  if (v >= INTEREST_LIKE) return 'like';
  if (v <= INTEREST_HATE) return 'hate';
  return 'meh';
}

/** Quanto a amizade de quem ouve muda por reação. */
export const REACTION_FRIENDSHIP: Record<Reaction, number> = { love: 3, like: 1.5, meh: 0, hate: -2 };
/** Quanto a chance de topar o papo muda por reação. */
export const REACTION_ACCEPT: Record<Reaction, number> = { love: 0.15, like: 0.07, meh: 0, hate: -0.18 };
/** Diversão a mais por minuto ouvindo um assunto de que gosta. */
export const REACTION_FUN: Record<Reaction, number> = { love: 0.4, like: 0.2, meh: 0, hate: -0.2 };

/**
 * Assunto que `speaker` puxa. Ele fala do que gosta, mas quem tem lábia lê a
 * roda e puxa o que os outros gostam também. `keep` é o assunto atual: tende
 * a continuar nele se agradou.
 */
export function pickTopic(world: World, catalog: Pick<Catalog, 'topics'>, speaker: Talker, listeners: Talker[], keep?: string): string {
  const ids = Object.keys(catalog.topics);
  const charm = Math.min(10, levelOf(speaker.skills?.charisma ?? 0));
  const read = 0.3 + charm * 0.07;
  let best = ids[0];
  let bestScore = -Infinity;
  for (const id of ids) {
    let s = interestIn(catalog, speaker, id);
    if (listeners.length) {
      let sum = 0;
      for (const l of listeners) sum += interestIn(catalog, l, id);
      s += (sum / listeners.length) * read;
    }
    if (id === keep) s += 1;
    s += nextFloat(world) * 2.5;
    if (s > bestScore) {
      bestScore = s;
      best = id;
    }
  }
  return best;
}

/**
 * Ouvir alguém falar do assunto: se quem ouve gosta de quem fala, o gosto
 * anda um pouquinho na direção do gosto de quem fala.
 */
export function catchTopic(catalog: Pick<Catalog, 'topics'>, listener: Talker, speaker: Talker, topic: string, fondness: number): void {
  if (fondness < 20) return;
  const mine = ensureInterests(catalog, listener);
  const theirs = interestIn(catalog, speaker, topic);
  const cur = mine[topic] ?? 0;
  if (Math.abs(theirs - cur) < 0.5) return;
  const step = INTEREST_CATCH * Math.sign(theirs - cur) * (fondness >= 60 ? 1.5 : 1);
  mine[topic] = Math.round(clampInterest(cur + step) * 100) / 100;
}

/** Subir de nível numa habilidade puxa o gosto pelo assunto dela. */
export function skillTopicBoost(catalog: Pick<Catalog, 'topics'>, p: Talker, skill: string): string | null {
  const t = Object.values(catalog.topics).find((x) => x.skill === skill);
  if (!t) return null;
  const mine = ensureInterests(catalog, p);
  mine[t.id] = Math.round(clampInterest((mine[t.id] ?? 0) + 0.5) * 100) / 100;
  return t.id;
}

/** Assuntos de que os dois gostam (1 ou mais), do mais forte para o mais fraco. */
export function sharedTopics(catalog: Pick<Catalog, 'topics'>, a: Talker, b: Talker): string[] {
  return Object.keys(catalog.topics)
    .map((id) => ({ id, v: Math.min(interestIn(catalog, a, id), interestIn(catalog, b, id)) }))
    .filter((x) => x.v >= INTEREST_LIKE)
    .sort((x, y) => y.v - x.v || x.id.localeCompare(y.id))
    .map((x) => x.id);
}

/** Os assuntos preferidos de alguém (para a ficha), do mais amado ao menos. */
export function favoriteTopics(catalog: Pick<Catalog, 'topics'>, p: Talker, n = 3): string[] {
  const mine = ensureInterests(catalog, p);
  return Object.keys(catalog.topics)
    .sort((x, y) => (mine[y] ?? 0) - (mine[x] ?? 0) || x.localeCompare(y))
    .slice(0, n);
}

/** O que alguém não suporta (gosto em INTEREST_HATE ou menos). */
export function hatedTopics(catalog: Pick<Catalog, 'topics'>, p: Talker): string[] {
  const mine = ensureInterests(catalog, p);
  return Object.keys(catalog.topics).filter((id) => (mine[id] ?? 0) <= INTEREST_HATE);
}

/** Preenche os gostos de todo mundo do mundo (moradores, visitas, vizinhos). */
export function ensureAllInterests(world: World, catalog: Pick<Catalog, 'topics'>): void {
  for (const f of world.folks) ensureInterests(catalog, f);
  for (const n of world.neighbors) ensureInterests(catalog, n as Neighbor);
}
