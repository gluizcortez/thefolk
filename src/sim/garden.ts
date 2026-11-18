// Bloco 13: jardim vivo. Plantas crescem de muda a adulta, bebem água (a
// chuva rega o que está no quintal), murcham quando secam, florescem quando
// estão bem cuidadas e, na horta e no pomar, dão frutos que vão para a
// despensa. O que seca de vez fica feio até ser replantado. Tudo puro e
// determinístico pelo RNG do mundo.

import { MINUTES_PER_DAY } from './clock';
import { inBounds } from './grid';
import type { Logger } from './gossip';
import { NEED_MAX } from './needs';
import { nextFloat, nextInt } from './rng';
import { roomAt, roomsOf } from './rooms';
import { stockPantry } from './services';
import type { Catalog, Folk, ObjectDef, PlantDef, PlantState, World, WorldObject } from './types';

/** abaixo disso a planta está com sede (e murcha devagar) */
export const THIRSTY_BELOW = 25;
/** abaixo disso de saúde, a planta está murcha */
export const WILT_BELOW = 40;
/** a IA pensa em regar a partir daqui */
export const AUTO_WATER_BELOW = 40;
/** o jardineiro rega a partir daqui */
export const GARDENER_WATER_BELOW = 70;
/** água por hora de chuva, nas plantas do quintal */
export const RAIN_PER_HOUR = 18;
/** chance de chover num dia, e a hora em que o tempo é decidido */
export const RAIN_CHANCE = 0.3;
export const WEATHER_HOUR = 4;
/** quantas levas de fruto a planta segura antes de parar de dar */
const MAX_LOADS = 2;
/** fração do preço para replantar o que secou */
export const REPLANT_SHARE = 0.3;

/** Planta nova: muda (ou adulta, se já vem crescida, como o vaso). */
export function freshPlant(def: PlantDef, grown = def.grow <= 0): PlantState {
  return { water: 80, growth: grown ? 100 : 0, health: 100, fruit: 0, ripen: 0 };
}

/** O estado da planta, criado (adulta e regada) se faltar: saves antigos, casa pronta. */
export function plantOf(obj: WorldObject, def: ObjectDef | undefined): PlantState | null {
  if (!def?.plant) return null;
  if (!obj.plant) obj.plant = freshPlant(def.plant, true);
  return obj.plant;
}

export type PlantStage = 'sprout' | 'growing' | 'grown' | 'bloom' | 'wilted' | 'dead';

/** Fase da planta, para a tela e para a nota de ambiente. */
export function plantStage(p: PlantState): PlantStage {
  if (p.health <= 0) return 'dead';
  if (p.health < WILT_BELOW || p.water <= 0) return 'wilted';
  if (p.growth < 35) return 'sprout';
  if (p.growth < 100) return 'growing';
  return p.water >= THIRSTY_BELOW && p.health >= 70 ? 'bloom' : 'grown';
}

/** Quanto a planta soma (ou tira) do ambiente além do valor base do objeto. */
export function plantAmbience(obj: WorldObject, def: ObjectDef): number {
  if (!def.plant || !obj.plant) return 0;
  const p = obj.plant;
  switch (plantStage(p)) {
    case 'dead':
      return -def.ambience - 12;
    case 'wilted':
      return -Math.round(def.ambience * 0.6) - 4;
    case 'sprout':
      return -Math.round(def.ambience * 0.6);
    case 'growing':
      return -Math.round(def.ambience * 0.3);
    case 'grown':
      return 0;
    case 'bloom':
      return def.plant.bloom;
  }
}

// ---------- tempo ----------

/** Está chovendo agora? */
export function raining(world: World): boolean {
  const r = world.rain;
  return !!r && world.tick >= r.from && world.tick < r.to;
}

/** De madrugada o tempo do dia é decidido: chove ou não, e quando. */
export function rollWeather(world: World): void {
  const day = Math.floor(world.tick / MINUTES_PER_DAY);
  if (nextFloat(world) >= RAIN_CHANCE) {
    world.rain = null;
    return;
  }
  const from = day * MINUTES_PER_DAY + (6 + nextInt(world, 14)) * 60 + nextInt(world, 60);
  world.rain = { from, to: from + (2 + nextInt(world, 4)) * 60 };
}

/** A planta fica no quintal (a chuva molha)? */
export function underSky(world: World, catalog: Catalog, obj: WorldObject): boolean {
  if (!inBounds(world.grid, obj.x, obj.y)) return false;
  return roomAt(roomsOf(world, catalog), obj.x, obj.y)?.outdoor !== false;
}

/**
 * Uma hora no jardim: cada planta bebe, cresce se está bem, murcha se secou,
 * amadurece frutos. A chuva rega o que está ao ar livre.
 */
export function gardenHour(world: World, catalog: Catalog, log: Logger): void {
  const wet = raining(world);
  for (const obj of world.objects) {
    const def = catalog.objects[obj.defId];
    const p = plantOf(obj, def);
    if (!p || !def?.plant) continue;
    if (p.health <= 0) continue;
    const pd = def.plant;
    if (wet && underSky(world, catalog, obj)) p.water = Math.min(100, p.water + RAIN_PER_HOUR);
    else p.water = Math.max(0, p.water - pd.thirst);
    const was = p.health;
    if (p.water <= 0) p.health = Math.max(0, p.health - 2);
    else if (p.water < THIRSTY_BELOW) p.health = Math.max(0, p.health - 0.75);
    else p.health = Math.min(100, p.health + 3);
    if (p.health <= 0) {
      p.fruit = 0;
      log('log.plantDied', { object: def.name });
      continue;
    }
    if (was >= WILT_BELOW && p.health < WILT_BELOW) log('log.plantWilting', { object: def.name });
    const thriving = p.water >= THIRSTY_BELOW && p.health >= WILT_BELOW;
    if (thriving && p.growth < 100) {
      p.growth = Math.min(100, p.growth + 100 / Math.max(1, pd.grow));
      if (p.growth >= 100) log('log.plantGrown', { object: def.name });
    }
    if (pd.fruit && p.growth >= 100 && thriving && p.fruit < pd.fruit.portions * MAX_LOADS) {
      p.ripen += 100 / Math.max(1, pd.fruit.hours);
      if (p.ripen >= 100) {
        p.ripen = 0;
        p.fruit += pd.fruit.portions;
        log('log.plantRipe', { object: def.name });
      }
    }
  }
}

// ---------- cuidado ----------

/** Colhe o que está maduro: vai para a despensa (o que não cabe vira lanche de quem colheu). */
export function harvest(world: World, catalog: Catalog, log: Logger, folk: Folk, obj: WorldObject, def: ObjectDef): number {
  const p = plantOf(obj, def);
  if (!p || p.fruit <= 0) return 0;
  const got = p.fruit;
  p.fruit = 0;
  const lost = stockPantry(world, catalog, got);
  if (lost > 0) folk.needs.hunger = Math.min(NEED_MAX, folk.needs.hunger + 6);
  log(lost >= got ? 'log.harvestNoRoom' : 'log.harvested', { name: folk.name, object: def.name, portions: got - lost });
  return got - lost;
}

/** Replanta o que secou: volta a ser muda. */
export function replant(obj: WorldObject, def: ObjectDef): void {
  if (!def.plant) return;
  obj.plant = freshPlant(def.plant, def.plant.grow <= 0);
}

/** Preço de replantar. */
export function replantCost(def: ObjectDef): number {
  return Math.max(5, Math.round(def.price * REPLANT_SHARE));
}
