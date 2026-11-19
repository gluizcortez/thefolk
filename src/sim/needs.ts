import { clockEnergy, perkDecay } from './persona';
import { roomAmbience } from './rooms';
import { skillBoost } from './skills';
import { temperDecay, temperWeight } from './temper';
import type { Catalog, Folk, InteractionDef, NeedId, Needs, World } from './types';
import { NEED_IDS } from './types';

export const NEED_MAX = 100;
/** raio (distância de Manhattan) em que objetos do quintal influenciam o ambiente */
export const AMBIENCE_RADIUS = 6;
const AMBIENCE_DRIFT = 0.5;

export function clampNeed(v: number): number {
  return v < 0 ? 0 : v > NEED_MAX ? NEED_MAX : v;
}

export function fullNeeds(value = NEED_MAX): Needs {
  const n = {} as Needs;
  for (const id of NEED_IDS) n[id] = value;
  return n;
}

/** Multiplicador de decaimento de um folk para uma necessidade (traços). */
export function decayMultiplier(catalog: Catalog, folk: Folk, need: NeedId): number {
  let m = 1;
  for (const t of folk.traits) m *= catalog.traits[t]?.decay?.[need] ?? 1;
  // plano 2, bloco 10: benefícios (dormir menos, estômago de ferro...)
  return m * temperDecay(folk.temper, need) * perkDecay(folk, need);
}

/** Peso que a IA do folk dá a uma necessidade (traços). */
export function needWeight(catalog: Catalog, folk: Folk, need: NeedId): number {
  let m = 1;
  for (const t of folk.traits) m *= catalog.traits[t]?.needWeight?.[need] ?? 1;
  return m * temperWeight(folk.temper, need);
}

/**
 * Valor para onde a necessidade "ambiente" tende. Bloco 3: sai da nota do
 * cômodo inteiro onde o folk está (veja sim/rooms.ts).
 */
export function ambienceTarget(world: World, catalog: Catalog, folk: Folk): number {
  return clampNeed(roomAmbience(world, catalog, folk));
}

/** Aplica um minuto de decaimento natural (e a deriva do ambiente). */
export function decayNeeds(world: World, catalog: Catalog, folk: Folk, scale = 1): void {
  for (const id of NEED_IDS) {
    if (id === 'ambience') continue;
    let rate = catalog.needs[id].decayPerMinute * decayMultiplier(catalog, folk, id) * scale;
    // plano 2, bloco 10: madrugador e coruja cansam conforme a hora
    if (id === 'energy') rate *= clockEnergy(catalog, folk, world.tick);
    folk.needs[id] = clampNeed(folk.needs[id] - rate);
  }
  const target = ambienceTarget(world, catalog, folk);
  const cur = folk.needs.ambience;
  const delta = Math.max(-AMBIENCE_DRIFT, Math.min(AMBIENCE_DRIFT, target - cur));
  folk.needs.ambience = clampNeed(cur + delta);
}

/** Aplica um minuto dos efeitos de uma interação. */
export function applyEffects(folk: Folk, interaction: InteractionDef): void {
  for (const id of NEED_IDS) {
    const e = interaction.effects[id];
    if (e) folk.needs[id] = clampNeed(folk.needs[id] + (e > 0 ? e * skillBoost(folk, interaction, id) : e));
  }
}

/**
 * Humor de 0 a 100: média ponderada das necessidades, em que necessidades
 * baixas pesam bem mais (uma única necessidade no vermelho derruba o humor).
 */
export function moodOf(catalog: Catalog, needs: Needs): number {
  let total = 0;
  let weights = 0;
  for (const id of NEED_IDS) {
    const v = needs[id];
    const lack = (NEED_MAX - v) / NEED_MAX;
    const w = catalog.needs[id].moodWeight * (1 + 2 * lack * lack);
    total += v * w;
    weights += w;
  }
  return weights > 0 ? total / weights : 0;
}
