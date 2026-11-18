// Plano 2, bloco 8: o que a simulação sabe dos objetos modulares: zonas de
// pintura, preço com peças e estilo, tampos onde se põe coisa em cima,
// enfeites soltos e objetos de parede em qualquer altura. Puro.

import { footprint } from './grid';
import type { KitParts } from './parts';
import { KINDS, cleanParts, kitPrice, kitZonesOf } from './parts';
import type { ObjStyle, ZoneDef } from './style';
import { ROLE_ZONES, cleanStyle, stylePrice } from './style';
import type { Catalog, ObjectDef, World, WorldObject } from './types';

/** Até onde um enfeite anda dentro do tile, para cada lado. */
export const NUDGE_MAX = 0.35;
/** Objeto de parede: de quanto em quanto sobe ou desce (metros). */
export const LIFT_STEP = 0.25;
export const LIFT_MIN = -3;
export const LIFT_MAX = 4;
/** Objetos de parede em alturas diferentes não se chocam a partir desta distância (degraus). */
export const LIFT_GAP = 2;

/**
 * Zonas de pintura do objeto: as do kit, ou os papéis do material para os
 * desenhos antigos. Nos antigos a fábrica é o próprio desenho (base vazia).
 */
export function zonesOf(def: ObjectDef): ZoneDef[] {
  if (def.kit) return kitZonesOf(def.kit);
  return Object.values(ROLE_ZONES).map((z) => ({ ...z, base: { mat: '' } }));
}

/** Tamanho do objeto em tiles, sem girar. */
const tilesOf = (def: ObjectDef) => def.size;

/** Preço com as peças e o estilo escolhidos. */
export function priceWith(def: ObjectDef, parts?: KitParts, style?: ObjStyle): number {
  if (def.kit) return kitPrice(def.price, def.kit, parts, style, tilesOf(def));
  return def.price + stylePrice(zonesOf(def), cleanStyle(zonesOf(def), style));
}

/** Peças e estilo limpos (só o que difere da fábrica e encaixa). */
export function cleanLook(def: ObjectDef, parts?: KitParts, style?: ObjStyle): { parts?: KitParts; style?: ObjStyle } {
  return {
    parts: def.kit ? cleanParts(def.kit, parts, tilesOf(def)) : undefined,
    style: cleanStyle(zonesOf(def), style),
  };
}

/** Tem tampo onde se põe enfeite. */
export function hasSurface(def: ObjectDef | undefined): boolean {
  if (!def || def.layer) return false;
  if (def.surface !== undefined) return def.surface;
  return !!def.kit && !!KINDS[def.kit.kind].surface;
}

/** O objeto com tampo debaixo deste tile (ou nada). */
export function supportAt(world: World, catalog: Catalog, x: number, y: number, ignoreId?: number): WorldObject | undefined {
  return world.objects.find((o) => {
    if (o.id === ignoreId) return false;
    const def = catalog.objects[o.defId];
    if (!hasSurface(def)) return false;
    return footprint(o, def!).some((t) => t.x === x && t.y === y);
  });
}

/** Enfeites em cima de um objeto com tampo. */
export function itemsOn(world: World, catalog: Catalog, support: WorldObject): WorldObject[] {
  const def = catalog.objects[support.defId];
  if (!hasSurface(def)) return [];
  const tiles = new Set(footprint(support, def!).map((t) => `${t.x},${t.y}`));
  return world.objects.filter((o) => {
    if (o.id === support.id) return false;
    const od = catalog.objects[o.defId];
    return od?.layer === 'surface' && tiles.has(`${o.x},${o.y}`);
  });
}

export function clampNudge(n: { dx: number; dy: number } | undefined): { dx: number; dy: number } | undefined {
  if (!n) return undefined;
  const c = (v: number) => Math.round(Math.max(-NUDGE_MAX, Math.min(NUDGE_MAX, Number.isFinite(v) ? v : 0)) * 100) / 100;
  const out = { dx: c(n.dx), dy: c(n.dy) };
  return out.dx === 0 && out.dy === 0 ? undefined : out;
}

export function clampLift(v: number | undefined): number | undefined {
  if (v === undefined || !Number.isFinite(v)) return undefined;
  const out = Math.max(LIFT_MIN, Math.min(LIFT_MAX, Math.round(v)));
  return out === 0 ? undefined : out;
}

export function clampTurn(v: number | undefined): number | undefined {
  if (v === undefined || !Number.isFinite(v)) return undefined;
  const out = ((Math.round(v) % 8) + 8) % 8;
  return out === 0 ? undefined : out;
}

/**
 * Onde o objeto sai: deslocamento, giro e altura limpos conforme a camada
 * (enfeite anda e gira em oitavos; objeto de parede sobe e desce).
 */
export function placementExtras(
  def: ObjectDef,
  extra: { nudge?: { dx: number; dy: number }; turn8?: number; lift?: number },
): Pick<WorldObject, 'nudge' | 'turn8' | 'lift'> {
  const out: Pick<WorldObject, 'nudge' | 'turn8' | 'lift'> = {};
  if (def.layer === 'surface') {
    const n = clampNudge(extra.nudge);
    if (n) out.nudge = n;
  }
  if (def.turns8) {
    const t = clampTurn(extra.turn8);
    if (t !== undefined) out.turn8 = t;
  }
  if (def.layer === 'wall') {
    const l = clampLift(extra.lift);
    if (l !== undefined) out.lift = l;
  }
  return out;
}

/** Aplica no objeto (apagando o que voltou ao padrão). */
export function setExtras(obj: WorldObject, extras: Pick<WorldObject, 'nudge' | 'turn8' | 'lift'>): void {
  delete obj.nudge;
  delete obj.turn8;
  delete obj.lift;
  Object.assign(obj, extras);
}
