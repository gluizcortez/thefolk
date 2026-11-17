import type { Nav } from './grid';
import { useTiles } from './grid';
import { NEED_MAX, clampNeed, needWeight } from './needs';
import { skillBoost } from './skills';
import { findPathToAny } from './pathfinding';
import { nextFloat } from './rng';
import type { Catalog, Folk, InteractionDef, World } from './types';
import { NEED_IDS } from './types';

export interface Option {
  objectId: number;
  interactionId: string;
  score: number;
  distance: number;
}

/** abaixo disso o folk prefere ficar à toa */
export const MIN_SCORE = 10;
const DISTANCE_COST = 0.04;
/** opções com pelo menos esta fração da melhor nota entram no sorteio */
const NEAR_BEST = 0.75;
const MAX_CANDIDATES = 3;

/** Quanto uma necessidade "grita": cresce forte quando o valor está baixo. */
export function urgency(value: number): number {
  const lack = (NEED_MAX - value) / NEED_MAX;
  return 0.2 + 3 * lack * lack;
}

/** Minutos que a interação deve durar para este folk, dado o `until`. */
export function expectedDuration(folk: Folk, it: InteractionDef): number {
  if (it.until) {
    const rate = (it.effects[it.until] ?? 0) * skillBoost(folk, it, it.until);
    if (rate > 0) {
      const needed = Math.ceil((NEED_MAX - folk.needs[it.until]) / rate);
      return Math.max(1, Math.min(it.duration, needed));
    }
  }
  return it.duration;
}

/** Utilidade de uma interação para o folk, sem contar a distância. */
export function interactionUtility(catalog: Catalog, folk: Folk, it: InteractionDef): number {
  const minutes = expectedDuration(folk, it);
  let score = 0;
  for (const id of NEED_IDS) {
    const base = it.effects[id];
    if (!base) continue;
    const rate = base > 0 ? base * skillBoost(folk, it, id) : base;
    const cur = folk.needs[id];
    const delta = clampNeed(cur + rate * minutes) - cur;
    score += delta * urgency(cur) * needWeight(catalog, folk, id);
  }
  return score;
}

/** Todas as opções autônomas alcançáveis, da melhor para a pior. */
export function scoreOptions(world: World, catalog: Catalog, folk: Folk, nav: Nav): Option[] {
  const options: Option[] = [];
  for (const obj of world.objects) {
    const def = catalog.objects[obj.defId];
    if (!def) continue;
    const auto = def.interactions.filter(
      (it) =>
        it.autonomous !== false &&
        (it.cost ?? 0) <= world.household.funds &&
        (it.autoBelow === undefined || !it.until || folk.needs[it.until] < it.autoBelow),
    );
    if (auto.length === 0) continue;
    const path = findPathToAny(nav, folk, useTiles(world, nav, obj, def));
    if (!path) continue;
    for (const it of auto) {
      const utility = interactionUtility(catalog, folk, it);
      const score = utility / (1 + DISTANCE_COST * path.length);
      options.push({ objectId: obj.id, interactionId: it.id, score, distance: path.length });
    }
  }
  // ordenação estável e determinística
  options.sort(
    (a, b) =>
      b.score - a.score || a.objectId - b.objectId || a.interactionId.localeCompare(b.interactionId),
  );
  return options;
}

/**
 * Escolhe o que o folk faz sozinho: sorteia, com peso pela nota, entre as
 * melhores opções. Devolve null se nada vale a pena.
 */
export function chooseAutonomous(
  world: World,
  catalog: Catalog,
  folk: Folk,
  nav: Nav,
): Option | null {
  const options = scoreOptions(world, catalog, folk, nav);
  if (options.length === 0 || options[0].score < MIN_SCORE) return null;
  const best = options[0].score;
  const pool = options.filter((o) => o.score >= best * NEAR_BEST).slice(0, MAX_CANDIDATES);
  const total = pool.reduce((s, o) => s + o.score, 0);
  let roll = nextFloat(world) * total;
  for (const o of pool) {
    roll -= o.score;
    if (roll <= 0) return o;
  }
  return pool[pool.length - 1];
}
