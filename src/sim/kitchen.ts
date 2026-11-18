// Plano 2, bloco 6: atividades a fundo I. Regras puras da cozinha e da mesa:
// os pratos de casa, quanto rende e como fica cada um, a travessa servida
// (quente, fria, estragada), a louça empilhada na pia e a cama desfeita.
// Nada de DOM nem Three.js; o sorteio sai do RNG do mundo.

import { footprint } from './grid';
import { isAdult } from './kids';
import { nextFloat } from './rng';
import { skillLevel } from './skills';
import type { Catalog, Folk, Mess, MealInfo, ObjectDef, ServedPlate, World, WorldObject } from './types';

export const COOKING = 'cooking';

/** Um prato que se faz em casa. */
export interface HomeDish {
  id: string;
  /** nível de Cozinha a partir do qual aparece liberado */
  skill: number;
  /** minutos picando na bancada */
  prep: number;
  /** minutos no fogão */
  cook: number;
  /** 'one' = uma porção; 'group' = uma por morador (de 2 a 6) */
  servings: 'one' | 'group';
  /** fome por minuto comendo */
  hunger: number;
  /** quanto um prato bem feito diverte comendo */
  fun: number;
}

/** Os pratos da casa, do mais simples ao mais caprichado. */
export const HOME_DISHES: HomeDish[] = [
  { id: 'toast', skill: 0, prep: 3, cook: 4, servings: 'one', hunger: 2.2, fun: 0 },
  { id: 'eggs', skill: 0, prep: 3, cook: 7, servings: 'one', hunger: 2.5, fun: 0.05 },
  { id: 'pasta', skill: 0, prep: 8, cook: 16, servings: 'group', hunger: 2.8, fun: 0.1 },
  { id: 'soup', skill: 2, prep: 12, cook: 24, servings: 'group', hunger: 3.0, fun: 0.15 },
  { id: 'pancakes', skill: 3, prep: 10, cook: 14, servings: 'group', hunger: 2.9, fun: 0.25 },
  { id: 'chickenrice', skill: 4, prep: 12, cook: 28, servings: 'group', hunger: 3.3, fun: 0.25 },
  { id: 'fishstew', skill: 6, prep: 15, cook: 32, servings: 'group', hunger: 3.6, fun: 0.35 },
  { id: 'palmpie', skill: 8, prep: 18, cook: 36, servings: 'group', hunger: 3.8, fun: 0.45 },
];

export const DISH_BY_ID: Record<string, HomeDish> = Object.fromEntries(HOME_DISHES.map((d) => [d.id, d]));

/** Minutos na geladeira escolhendo os ingredientes. */
export const FETCH_MINUTES = 2;
/** Minutos levando a panela e servindo na travessa. */
export const PLATE_UP_MINUTES = 3;
/** Minutos pegando uma porção da travessa. */
export const SERVE_MINUTES = 2;
/** A comida fica quente por tanto tempo depois de servida (ou esquentada). */
export const WARM_MINUTES = 90;
/** E estraga depois disso, fora da geladeira. */
export const SPOIL_MINUTES = 12 * 60;
/** Minutos esquentando a travessa. */
export const REHEAT_MINUTES = 4;
/** Comida fria rende menos. */
export const COLD_FACTOR = 0.8;
/** Máximo de pratos empilhados na pia. */
export const SINK_STACK = 10;
/** Minutos para lavar cada prato da pilha (com Capricho, menos). */
export const WASH_MINUTES = 3;
/** Ambiente que cada prato sujo na pia tira do cômodo. */
export const SINK_DISH_AMBIENCE = -1.5;
/** Ambiente que a cama desfeita tira do quarto. */
export const UNMADE_AMBIENCE = -4;
/** Ambiente que a comida estragada tira (fede). */
export const SPOILED_AMBIENCE = -10;

/** Quantas porções sai um prato para esta casa (moradores, sem bebê). */
export function servingsFor(world: World, dish: HomeDish): number {
  if (dish.servings === 'one') return 1;
  const eaters = world.folks.filter((f) => !f.visit && f.age !== 'baby').length;
  return Math.max(2, Math.min(6, eaters));
}

/** O folk já sabe fazer este prato? */
export function knowsDish(folk: Folk, dish: HomeDish): boolean {
  return skillLevel(folk, COOKING) >= dish.skill;
}

/** Chance de passar do ponto no fogão: alta para quem nunca cozinhou, quase nada para quem sabe. */
export function burnChance(level: number, dish: HomeDish): number {
  const hard = Math.max(0, dish.skill - level) * 0.05;
  return Math.max(0.01, 0.22 - level * 0.025 + hard + (dish.servings === 'group' ? 0.03 : 0));
}

/**
 * Como o prato ficou (0 a 100): a Cozinha do folk, o fogão, o humor e um
 * pouco de sorte. Queimado fica entre 5 e 20.
 */
export function dishQuality(world: World, level: number, bonus: number, mood: number, burnt: boolean): number {
  const luck = (nextFloat(world) - 0.5) * 24;
  if (burnt) return Math.round(5 + nextFloat(world) * 15);
  const q = 32 + level * 6 + bonus + mood * 0.08 + luck;
  return Math.round(Math.max(20, Math.min(100, q)));
}

export function isWarm(meal: MealInfo, tick: number): boolean {
  return tick < meal.warmUntil;
}

export function isSpoiled(meal: MealInfo, tick: number): boolean {
  return tick >= meal.spoilAt;
}

/** A bagunça é sujeira de verdade (a travessa só depois de estragar)? */
export function isLitter(mess: Mess, tick: number): boolean {
  if (mess.kind !== 'meal') return true;
  return !!mess.meal && isSpoiled(mess.meal, tick);
}

/** Tirar uma porção da travessa (devolve o prato servido, ou null se acabou ou estragou). */
export function takeServing(mess: Mess, tick: number): ServedPlate | null {
  const m = mess.meal;
  if (!m || m.servings <= 0 || isSpoiled(m, tick)) return null;
  m.servings--;
  return { dish: m.dish, quality: m.quality, cold: !isWarm(m, tick), burnt: m.burnt };
}

/**
 * Quanto a porção rende por minuto comendo, multiplicando a fome do prato:
 * bem feito rende mais, fria rende menos, queimada quase nada.
 */
export function servedFactor(p: ServedPlate): number {
  const q = 0.6 + p.quality / 250;
  return q * (p.cold ? COLD_FACTOR : 1);
}

/** Esquenta a travessa (perde um pouco do ponto). */
export function reheat(meal: MealInfo, tick: number): void {
  meal.warmUntil = tick + WARM_MINUTES;
  meal.quality = Math.max(5, meal.quality - 5);
}

/** Onde a travessa vai: a bancada livre mais perto do fogão, senão o próprio fogão. */
export function mealSpot(world: World, catalog: Catalog, stove: WorldObject): { obj: WorldObject; x: number; y: number } {
  let best: { obj: WorldObject; x: number; y: number; d: number } | null = null;
  const taken = new Set(world.mess.filter((m) => m.kind === 'meal').map((m) => `${m.x},${m.y}`));
  for (const obj of world.objects) {
    const def = catalog.objects[obj.defId];
    if (!def || !holdsMeal(def) || obj === stove) continue;
    for (const t of footprint(obj, def)) {
      if (taken.has(`${t.x},${t.y}`)) continue;
      const d = Math.abs(t.x - stove.x) + Math.abs(t.y - stove.y);
      if (d > 6) continue;
      if (!best || d < best.d) best = { obj, x: t.x, y: t.y, d };
    }
  }
  return best ?? { obj: stove, x: stove.x, y: stove.y };
}

/** Onde se pode pôr uma travessa: bancada e mesa (de comer). */
export function holdsMeal(def: ObjectDef): boolean {
  return def.category === 'surfaces' && def.interactions.some((i) => i.served);
}

/** Cria a travessa no mundo. */
export function serveMeal(world: World, on: WorldObject, x: number, y: number, dish: string, servings: number, quality: number, burnt: boolean, cook: number): Mess {
  const mess: Mess = {
    id: world.nextId++,
    kind: 'meal',
    x,
    y,
    tick: world.tick,
    by: cook,
    meal: {
      dish,
      servings,
      total: servings,
      quality,
      burnt: burnt || undefined,
      warmUntil: world.tick + WARM_MINUTES,
      spoilAt: world.tick + SPOIL_MINUTES,
      on: on.id,
      cook,
    },
  };
  world.mess.push(mess);
  return mess;
}

/** A travessa que está neste objeto (para comer dela). */
export function mealOn(world: World, objId: number): Mess | undefined {
  return world.mess.find((m) => m.kind === 'meal' && m.meal?.on === objId);
}

/** Pode comer da travessa (morador acordado que não é bebê)? */
export function canEat(folk: Folk): boolean {
  return folk.age !== 'baby' && !folk.visit?.service;
}

/** Pode cozinhar (adulto ou adolescente; criança não mexe no fogão)? */
export function canCook(folk: Folk): boolean {
  return isAdult(folk) || folk.age === 'teen';
}

/** Minutos para lavar a pilha toda da pia. */
export function washMinutes(folk: Folk, dishes: number): number {
  const per = Math.max(1, Math.round(WASH_MINUTES * (1 - 0.06 * skillLevel(folk, 'tidiness'))));
  return per * dishes;
}
