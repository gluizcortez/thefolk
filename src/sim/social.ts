import type { Nav } from './grid';
import { edgeKey } from './grid';
import { moodOf } from './needs';
import { affinity, knows, memoryWeight, relationOf } from './relations';
import type { Catalog, Folk, SocialCategory, SocialDef, Vec, World } from './types';

/** Gosto do folk por um tipo de interação social (produto dos traços). */
export function socialTaste(catalog: Catalog, folk: Pick<Folk, 'traits'>, cat: SocialCategory): number {
  let m = 1;
  for (const t of folk.traits) m *= catalog.traits[t]?.social?.[cat] ?? 1;
  return m;
}

/** O folk está em casa e em condição de conversar com alguém? */
export function onLot(folk: Folk): boolean {
  return !folk.away && folk.collapsed === 0 && !folk.visit?.leaving;
}

/** Com quem o folk está conversando agora (0 = ninguém). */
export function talkingWith(folk: Folk): number {
  const a = folk.queue[0];
  if (!a || a.otherId === undefined) return 0;
  if (a.kind === 'listen') return a.otherId;
  if (a.kind === 'social' && a.phase === 'using') return a.otherId;
  return 0;
}

/**
 * Diz se `a` pode puxar esta interação com `b`, olhando só os requisitos
 * (amizade, romance, quem é visita). Usa como `a` vê `b`.
 */
export function socialAllowed(world: World, def: SocialDef, a: Folk, b: Folk): boolean {
  const req = def.requires;
  if (!req) return knows(world, a.id, b.id);
  const rel = relationOf(world, a.id, b.id);
  const known = rel !== undefined;
  if (req.known !== 'any' && (req.known === false ? known : !known)) return false;
  if (req.visitor !== undefined && (b.visit !== null) !== req.visitor) return false;
  if (req.resident && a.visit !== null) return false;
  const f = rel?.friendship ?? 0;
  if (req.friendship !== undefined && f < req.friendship) return false;
  if (req.maxFriendship !== undefined && f > req.maxFriendship) return false;
  if (req.romance !== undefined && (rel?.romance ?? 0) < req.romance) return false;
  if (req.dating !== undefined && (rel?.dating ?? false) !== req.dating) return false;
  return true;
}

/** Interações que `a` pode puxar com `b`, na ordem do catálogo. */
export function availableSocials(world: World, catalog: Catalog, a: Folk, b: Folk): SocialDef[] {
  return Object.values(catalog.socials).filter((def) => socialAllowed(world, def, a, b));
}

/**
 * Chance de `b` topar a interação puxada por `a`, de 0 a 1. Pesam: como `b`
 * vê `a` (amizade, romance, respeito e lembranças), a afinidade de traços, o
 * humor de `b` e o gosto dele por esse tipo de conversa.
 */
export function acceptChance(world: World, catalog: Catalog, a: Folk, b: Folk, def: SocialDef): number {
  const rel = relationOf(world, b.id, a.id);
  let p = def.accept;
  p += (rel?.friendship ?? 0) / 200;
  if (def.category === 'romantic') p += (rel?.romance ?? 0) / 150 + (rel?.dating ? 0.25 : 0);
  if (def.category === 'professional') p += (rel?.respect ?? 0) / 200;
  p += affinity(catalog, b, a) * 0.06;
  p += memoryWeight(catalog, rel) * 0.02;
  p += (moodOf(catalog, b.needs) - 50) / 250;
  p += (socialTaste(catalog, b, def.category) - 1) * 0.25;
  for (const t of b.traits) p += def.traitAccept?.[t] ?? 0;
  return Math.max(0.03, Math.min(0.97, p));
}

/** Palpite de `a` sobre a chance de dar certo, só pelo que ele sente. */
export function guessAccept(world: World, a: Folk, b: Folk, def: SocialDef): number {
  const rel = relationOf(world, a.id, b.id);
  let p = def.accept + (rel?.friendship ?? 0) / 200;
  if (def.category === 'romantic') p += (rel?.romance ?? 0) / 150;
  return Math.max(0.05, Math.min(0.95, p));
}

const ORTHO: Vec[] = [
  { x: 0, y: -1 },
  { x: 1, y: 0 },
  { x: 0, y: 1 },
  { x: -1, y: 0 },
];

/** `a` está colado em `b` (lado a lado, sem parede no meio)? */
export function adjacent(world: World, a: Vec, b: Vec): boolean {
  const d = Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
  if (d !== 1) return false;
  return world.grid.edges[edgeKey(a.x, a.y, b.x, b.y)] !== 'wall';
}

/**
 * Tiles de onde dá para conversar com `b`: os vizinhos de lado, livres, sem
 * parede no meio e sem outro folk em pé (menos quem vai conversar).
 */
export function talkTiles(world: World, nav: Nav, b: Folk, a: Folk): Vec[] {
  const out: Vec[] = [];
  for (const d of ORTHO) {
    const x = b.x + d.x;
    const y = b.y + d.y;
    if (!nav.isFree(x, y)) continue;
    if (world.grid.edges[edgeKey(b.x, b.y, x, y)] === 'wall') continue;
    const taken = world.folks.some((f) => f !== a && f !== b && !f.away && f.x === x && f.y === y);
    if (!taken) out.push({ x, y });
  }
  return out;
}
