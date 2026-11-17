import { monthChemistry } from './temper';
import type { Catalog, Folk, Memory, RelAxis, RelDelta, Relation, World } from './types';

export const REL_MIN = -100;
export const REL_MAX = 100;
/** lembranças guardadas por relação (as mais antigas saem primeiro, menos "conheceu") */
export const MAX_MEMORIES = 10;
/** minutos para o cansaço de repetir conversa cair um ponto */
const TIRED_RECOVERY = 120;
/** quanto cada ponto de cansaço come do ganho */
const TIRED_FACTOR = 0.35;
const AXES: RelAxis[] = ['friendship', 'romance', 'respect'];

export function relKey(from: number, to: number): string {
  return `${from}>${to}`;
}

/** Como `from` vê `to`, ou undefined se nunca se falaram. */
export function relationOf(world: World, from: number, to: number): Relation | undefined {
  return world.relations[relKey(from, to)];
}

export function newRelation(tick: number): Relation {
  return { friendship: 0, romance: 0, respect: 0, dating: false, last: tick, tired: 0, memories: [] };
}

/** Garante a relação nos dois sentidos (quando dois folks se encontram). */
export function ensureRelation(world: World, a: number, b: number): Relation {
  for (const [x, y] of [
    [a, b],
    [b, a],
  ]) {
    const k = relKey(x, y);
    if (!world.relations[k]) world.relations[k] = newRelation(world.tick);
  }
  return world.relations[relKey(a, b)];
}

export function knows(world: World, a: number, b: number): boolean {
  return relKey(a, b) in world.relations;
}

function clampRel(v: number): number {
  return v < REL_MIN ? REL_MIN : v > REL_MAX ? REL_MAX : v;
}

/**
 * Afinidade de `a` por `b` vinda dos traços: +1 para cada traço do outro de
 * que gosta, -1 para cada um que dá atrito, +0,5 por traço em comum.
 */
export function affinity(catalog: Catalog, a: Pick<Folk, 'traits'> & { month?: number }, b: Pick<Folk, 'traits'> & { month?: number }): number {
  // bloco 5: o mês de nascimento combina (ou não) com o do outro
  let sum = monthChemistry(catalog, a.month, b.month);
  for (const ta of a.traits) {
    const def = catalog.traits[ta];
    for (const tb of b.traits) {
      if (ta === tb) sum += 0.5;
      if (def?.likes?.includes(tb)) sum += 1;
      if (def?.dislikes?.includes(tb)) sum -= 1;
    }
  }
  return sum;
}

/** Peso somado das lembranças que `from` tem de `to`. */
export function memoryWeight(catalog: Catalog, rel: Relation | undefined): number {
  if (!rel) return 0;
  let sum = 0;
  for (const m of rel.memories) sum += catalog.memories[m.kind]?.weight ?? 0;
  return sum;
}

/** Fator que diminui o ganho quando o par repete interações em pouco tempo. */
export function freshness(rel: Relation, tick: number): number {
  const tired = Math.max(0, rel.tired - (tick - rel.last) / TIRED_RECOVERY);
  return 1 / (1 + tired * TIRED_FACTOR);
}

/**
 * Aplica uma mudança na relação de `from` por `to`. Ganhos são escalados pela
 * afinidade e pelo cansaço; perdas pesam mais quando há atrito.
 * Devolve o que de fato mudou.
 */
export function applyDelta(
  world: World,
  catalog: Catalog,
  from: Pick<Folk, 'id' | 'traits'>,
  to: Pick<Folk, 'id' | 'traits'>,
  delta: RelDelta,
  bonus: RelDelta = {},
): RelDelta {
  const rel = ensureRelation(world, from.id, to.id);
  const aff = affinity(catalog, from, to);
  const fresh = freshness(rel, world.tick);
  const out: RelDelta = {};
  for (const axis of AXES) {
    const base = (delta[axis] ?? 0) + (bonus[axis] ?? 0);
    if (!base) continue;
    const before = rel[axis];
    // quanto mais alto, mais difícil subir: amizade de verdade leva semanas
    const ceiling = Math.max(0.15, 1 - Math.max(0, before) / 110);
    const scaled =
      base > 0 ? base * Math.max(0.4, 1 + aff * 0.15) * fresh * ceiling : base * Math.max(0.5, 1 - aff * 0.1);
    rel[axis] = clampRel(before + scaled);
    const change = rel[axis] - before;
    if (change !== 0) out[axis] = change;
  }
  return out;
}

/** Marca que o par acabou de interagir (cansaço sobe, contato renovado). */
export function touch(world: World, a: number, b: number): void {
  for (const [x, y] of [
    [a, b],
    [b, a],
  ]) {
    const rel = world.relations[relKey(x, y)];
    if (!rel) continue;
    rel.tired = Math.max(0, rel.tired - (world.tick - rel.last) / TIRED_RECOVERY) + 1;
    rel.last = world.tick;
  }
}

export function addMemory(world: World, catalog: Catalog, from: number, to: number, kind: string): boolean {
  const rel = ensureRelation(world, from, to);
  const def = catalog.memories[kind];
  if (def?.once && rel.memories.some((m) => m.kind === kind)) return false;
  const memory: Memory = { tick: world.tick, kind };
  rel.memories.push(memory);
  while (rel.memories.length > MAX_MEMORIES) {
    const idx = rel.memories.findIndex((m) => m.kind !== 'met');
    rel.memories.splice(idx < 0 ? 0 : idx, 1);
  }
  return true;
}

export function setDating(world: World, a: number, b: number, on: boolean): void {
  ensureRelation(world, a, b);
  world.relations[relKey(a, b)].dating = on;
  world.relations[relKey(b, a)].dating = on;
}

/** Bloco 8: quanto a amizade cai por dia sem contato (Afeto 5). */
export const FRIEND_COOL = 2;
/** romance esfria assim por dia sem contato; namoro esfria a um terço disso */
export const ROMANCE_COOL = 1.5;

/**
 * Bloco 8: quem tem pouco Afeto esquece os outros mais depressa. Afeto 0
 * esfria 1,5x; 5, normal; 10, metade.
 */
export function coolFactor(warmth: number | undefined): number {
  return Math.max(0.5, 1.5 - 0.1 * (warmth ?? 5));
}

/**
 * Uma vez por dia: sem contato há mais de um dia, a amizade e o romance de
 * quem mora na casa (e por quem mora na casa) esfriam. Melhores amigos
 * esfriam pela metade; namoro esfria devagar; respeito não esfria. Relações
 * só entre vizinhos ficam como estão (eles se veem fora da tela).
 */
export function coolRelations(world: World): void {
  const day = 24 * 60;
  const home = new Set(world.folks.filter((f) => !f.visit).map((f) => f.id));
  const warmth = new Map<number, number>();
  for (const f of world.folks) warmth.set(f.id, f.temper?.warmth ?? 5);
  for (const n of world.neighbors) if (!warmth.has(n.id)) warmth.set(n.id, n.temper?.warmth ?? 5);
  for (const [key, rel] of Object.entries(world.relations)) {
    if (world.tick - rel.last < day) continue;
    const [from, to] = key.split('>').map(Number);
    if (!home.has(from) && !home.has(to)) continue;
    const k = coolFactor(warmth.get(from));
    if (rel.friendship > 0) rel.friendship = Math.max(0, rel.friendship - FRIEND_COOL * k * (rel.friendship >= 75 ? 0.5 : 1));
    else if (rel.friendship < -10) rel.friendship = Math.min(-10, rel.friendship + 1);
    if (rel.romance > 0) rel.romance = Math.max(0, rel.romance - ROMANCE_COOL * k * (rel.dating ? 1 / 3 : 1));
  }
}

/** Rótulo da amizade (chave de texto). */
export function friendshipLabel(rel: Relation | undefined): string {
  if (!rel) return 'rel.stranger';
  const f = rel.friendship;
  if (f >= 75) return 'rel.bestFriend';
  if (f >= 40) return 'rel.friend';
  if (f >= 15) return 'rel.pal';
  if (f > -15) return 'rel.acquaintance';
  if (f > -50) return 'rel.dislike';
  return 'rel.enemy';
}

/** Rótulo do romance, ou null se não há nada no ar. */
export function romanceLabel(rel: Relation | undefined): string | null {
  if (!rel) return null;
  if (rel.dating) return 'rel.dating';
  if (rel.romance >= 60) return 'rel.inLove';
  if (rel.romance >= 25) return 'rel.crush';
  return null;
}

/** Rótulo do respeito profissional, ou null quando é neutro. */
export function respectLabel(rel: Relation | undefined): string | null {
  if (!rel) return null;
  if (rel.respect >= 50) return 'rel.admires';
  if (rel.respect >= 20) return 'rel.respects';
  if (rel.respect <= -30) return 'rel.scorns';
  return null;
}
