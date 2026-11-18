import { MINUTES_PER_DAY } from './clock';
import type { Nav } from './grid';
import { footprint, useTiles } from './grid';
import { findPathToAny } from './pathfinding';
import type { Action, Catalog, Folk, InteractionDef, ObjectDef, Tier, Vec, World, WorldObject } from './types';

// Bloco 4: catálogo em faixas de preço, depreciação, objetos queridos, comer
// à mesa e atividades a dois. Módulo puro: só lê e mexe no World.

/** quanto o objeto perde na virada do primeiro dia (ou no primeiro uso) */
export const FIRST_DAY_LOSS = 0.15;
/** minutos de uso para o valor cair pela metade da parte que sobra */
export const USE_LIFE = 16000;
/** o valor nunca cai abaixo desta fração do preço */
export const VALUE_FLOOR = 0.3;
/** quebrado vale menos na revenda */
export const BROKEN_RESALE = 0.5;
/** minutos de uso até virar o objeto querido de alguém */
export const BELOVED_MINUTES = 1200;
/** bônus por minuto usando o próprio objeto querido */
export const BELOVED_BONUS = { fun: 0.15, comfort: 0.1 } as const;
/** o que dói ver o objeto querido ir embora */
export const BELOVED_LOSS = { fun: 30, comfort: 10 } as const;
/** bônus por minuto de comer sentado à mesa */
export const TABLE_BONUS = { comfort: 0.9, fun: 0.15 } as const;
/** e comendo junto com alguém na mesma mesa */
export const TABLE_COMPANY = { social: 0.6 } as const;
export const TABLE_FRIENDSHIP = 0.04;
/** quanto cada faixa puxa a escolha da IA (barato, médio, caro) */
export const TIER_PULL: Record<Tier, number> = { 0: 0.85, 1: 1, 2: 1.2 };
/** quanto a vontade de juntar-se a uma atividade a dois pesa na IA */
export const JOIN_BONUS = 18;

export function tierOf(def: ObjectDef): Tier {
  return def.tier ?? 1;
}

/** Preço de referência: o que foi pago, ou o de tabela se veio com a casa. */
export function basePrice(obj: WorldObject, def: ObjectDef): number {
  return obj.paid > 0 ? obj.paid : def.price;
}

/** Ainda está novo em folha (comprado hoje e quase sem uso): vale o que custou. */
export function stillNew(world: World, obj: WorldObject): boolean {
  if (obj.bought === undefined) return false;
  const sameDay = Math.floor(obj.bought / MINUTES_PER_DAY) === Math.floor(world.tick / MINUTES_PER_DAY);
  return sameDay && (obj.used ?? 0) < 1;
}

/** Quanto o objeto vale hoje: perde no primeiro dia e vai perdendo com o uso. */
export function currentValue(world: World, obj: WorldObject, def: ObjectDef): number {
  const base = basePrice(obj, def);
  if (stillNew(world, obj)) return base;
  const wear = Math.max(0, 1 - (obj.used ?? 0) / (USE_LIFE * 2));
  return Math.round(base * Math.max(VALUE_FLOOR, (1 - FIRST_DAY_LOSS) * wear));
}

/** O que a venda devolve: o valor de hoje (metade, se estiver quebrado). */
export function resaleValue(world: World, obj: WorldObject, def: ObjectDef): number {
  return Math.round(currentValue(world, obj, def) * (obj.state?.broken ? BROKEN_RESALE : 1));
}

/** Cor do objeto (a escolhida ou a primeira do catálogo). */
export function colorOf(obj: WorldObject, def: ObjectDef): string | undefined {
  return obj.color ?? def.colors?.[0];
}

/**
 * Um minuto de uso: conta para a depreciação e para o apego. Devolve true
 * quando o objeto acabou de virar o querido deste folk.
 */
export function countUse(folk: Folk, obj: WorldObject, def: ObjectDef): boolean {
  obj.used = (obj.used ?? 0) + 1;
  if (folk.visit || def.fixture) return false;
  const uses = (obj.uses ??= {});
  const key = String(folk.id);
  uses[key] = (uses[key] ?? 0) + 1;
  if (obj.beloved !== undefined || uses[key] < BELOVED_MINUTES) return false;
  // só vira querido de quem mais usou
  for (const [id, n] of Object.entries(uses)) if (id !== key && n > uses[key]) return false;
  obj.beloved = folk.id;
  return true;
}

/** Efeitos a mais por usar o próprio objeto querido. */
export function belovedBonus(folk: Folk, obj: WorldObject): void {
  if (obj.beloved !== folk.id) return;
  folk.needs.fun = Math.min(100, folk.needs.fun + BELOVED_BONUS.fun);
  folk.needs.comfort = Math.min(100, folk.needs.comfort + BELOVED_BONUS.comfort);
}

/** O objeto querido foi embora (venda ou penhora): devolve quem sentiu, se ainda mora aqui. */
export function missBeloved(world: World, obj: WorldObject): Folk | null {
  if (obj.beloved === undefined) return null;
  const folk = world.folks.find((f) => f.id === obj.beloved && !f.visit);
  if (!folk) return null;
  folk.needs.fun = Math.max(0, folk.needs.fun - BELOVED_LOSS.fun);
  folk.needs.comfort = Math.max(0, folk.needs.comfort - BELOVED_LOSS.comfort);
  return folk;
}

// ---------- comer à mesa ----------

const FRONT: Vec[] = [
  { x: 0, y: 1 },
  { x: 1, y: 0 },
  { x: 0, y: -1 },
  { x: -1, y: 0 },
];

/** Tiles ocupados por mesas. */
function tableTiles(world: World, catalog: Catalog): Set<string> {
  const out = new Set<string>();
  for (const o of world.objects) {
    const d = catalog.objects[o.defId];
    if (d?.dining !== 'table') continue;
    for (const t of footprint(o, d)) out.add(`${t.x},${t.y}`);
  }
  return out;
}

/** Lugares à mesa: cadeira virada para uma mesa, ou mesa com cadeiras. */
export function diningSeats(world: World, catalog: Catalog): WorldObject[] {
  const tables = tableTiles(world, catalog);
  return world.objects.filter((o) => {
    const d = catalog.objects[o.defId];
    if (d?.dining === 'both') return true;
    if (d?.dining !== 'seat') return false;
    const f = FRONT[o.rot];
    return tables.has(`${o.x + f.x},${o.y + f.y}`);
  });
}

/** Objeto que a ação ocupa (o lugar à mesa, quando está comendo sentado). */
export function occupiedId(action: Action): number | undefined {
  return action.eatAt ?? action.objectId;
}

/** Quantos outros estão sentados (ou indo sentar) neste objeto. */
export function seatTaken(world: World, objectId: number, except: Folk): number {
  let n = 0;
  for (const f of world.folks) {
    if (f === except) continue;
    const a = f.queue[0];
    if (a?.kind !== 'use' || (a.phase !== 'using' && a.eatAt === undefined)) continue;
    if (occupiedId(a) === objectId) n++;
  }
  return n;
}

/** O lugar livre à mesa mais perto (a pé), ou null. */
export function findSeat(world: World, catalog: Catalog, nav: Nav, folk: Folk): { seat: WorldObject; steps: number } | null {
  let best: { seat: WorldObject; steps: number } | null = null;
  for (const seat of diningSeats(world, catalog)) {
    const def = catalog.objects[seat.defId]!;
    if (seatTaken(world, seat.id, folk) >= (def.slots ?? 1)) continue;
    const path = findPathToAny(nav, folk, useTiles(world, nav, seat, def));
    if (!path) continue;
    if (!best || path.length < best.steps) best = { seat, steps: path.length };
  }
  return best;
}

/** Até quantos passos o folk anda com o prato na mão para comer sentado. */
export const SEAT_REACH = 14;

/** Alguém mais está comendo à mesa perto deste lugar? Devolve quem. */
export function tableCompany(world: World, folk: Folk): Folk[] {
  const a = folk.queue[0];
  if (a?.eatAt === undefined || a.phase !== 'using') return [];
  return world.folks.filter((f) => {
    if (f === folk) return false;
    const b = f.queue[0];
    return b?.eatAt !== undefined && b.phase === 'using' && Math.abs(f.x - folk.x) + Math.abs(f.y - folk.y) <= 3;
  });
}

// ---------- atividades a dois ----------

/** Quem está fazendo a mesma atividade a dois no mesmo objeto agora. */
export function duoPartners(world: World, folk: Folk, objectId: number, it: InteractionDef): Folk[] {
  if (!it.duo) return [];
  return world.folks.filter((f) => {
    if (f === folk || f.away) return false;
    const a = f.queue[0];
    // plano 2, bloco 4: na TV, qualquer canal conta como assistir junto
    const same = a?.interactionId === it.id || (!!it.watch && !!a?.interactionId?.startsWith('watch'));
    return a?.kind === 'use' && a.phase === 'using' && a.stage === undefined && a.objectId === objectId && same;
  });
}
