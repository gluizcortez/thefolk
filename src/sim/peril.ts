import { MINUTES_PER_DAY } from './clock';
import { checkPlacement, objectBusy, sellValue } from './economy';
import type { Nav } from './grid';
import { edgeKey, footprint, inBounds, isWallLike, levelOfRow } from './grid';
import { computeRooms } from './rooms';
import { nextFloat, nextInt } from './rng';
import { stateOf } from './upkeep';
import { isSleep } from './will';
import type { Catalog, DeathCause, Fire, Folk, ObjectDef, Vec, World, WorldObject } from './types';

// Bloco 14: perigos. Fogo que começa no fogão (de quem cozinha mal), na
// lareira acesa perto de coisa que queima ou na faísca de um conserto
// malfeito; ele esquenta, espalha para o que queima ao lado e come os móveis.
// O detector de fumaça chama os bombeiros; sem ele, alguém precisa ligar.
// De noite pode vir um gatuno; o alarme chama a polícia. Fome extrema,
// afogamento (piscina sem escadinha) e fogo matam, e quem morre vira lápide
// ou urna no lote, com fantasma de noite até descansar. Tudo puro e
// determinístico pelo RNG do mundo; quem anda e age é a Sim (sim.ts).

// ---------- números ----------

/** tiles em chamas no máximo (o lote não vira um mar de fogo infinito) */
export const FIRE_MAX = 16;
/** quanto o fogo esquenta por minuto até o máximo (100) */
export const FIRE_GROW = 1.4;
/** a partir daqui o fogo pula para o lado */
export const FIRE_SPREAD_AT = 35;
/** chance por minuto de pular para um vizinho com coisa que queima */
export const FIRE_SPREAD_CHANCE = 0.012;
/** chance por minuto de pular para o tile de quem está parado em volta (em pânico) */
export const FIRE_SPREAD_FOLK = 0.005;
/** combustível de um tile com móvel que queima (e de um tile sem nada) */
export const FUEL_FULL = 100;
export const FUEL_BARE = 30;
/** quanto combustível o fogo come por minuto no máximo */
export const FUEL_BURN = 1.5;
/** sem combustível, as chamas baixam tanto por minuto */
export const FIRE_FADE = 3;
/** quanto cada minuto de extintor e de mangueira dos bombeiros apaga */
export const DOUSE_EXTINGUISHER = 7;
export const DOUSE_HOSE = 12;
/** minutos no meio das chamas até cair */
export const SCORCH_DEATH = 30;
/** bombeiros e polícia chegam tantos minutos depois de chamados */
export const FIRE_RESPONSE = 30;
export const POLICE_RESPONSE = 10;
/** detector de fumaça percebe fogo no mesmo cômodo ou até tantos tiles */
export const SMOKE_RADIUS = 4;
/** fogão e churrasqueira: chance de pegar fogo a cada prato, por nível de Culinária que falta para 4 */
export const COOK_FIRE = 0.025;
export const COOK_SAFE_LEVEL = 4;
/** lareira acesa: chance por minuto de cada coisa que queima colada nela pegar fogo */
export const HEARTH_SPARK = 0.0015;
/** lareira acende por tantos minutos */
export const HEARTH_MINUTES = 4 * 60;
/** conserto com Jeito zero: chance de a faísca do choque virar fogo */
export const SHOCK_FIRE = 0.1;
/** chamuscado do choque (cabelo em pé) por tantos minutos */
export const SOOTY_MINUTES = 3 * 60;
/** minutos de fome no zero até cair */
export const STARVE_MINUTES = 6 * 60;
/** presa na piscina sem escadinha: energia a mais que gasta por minuto */
export const ADRIFT_DRAIN = 0.25;
/** gatuno: hora em que pode aparecer, chance na noite, dias entre um e outro e valor mínimo que vale o risco */
export const BURGLAR_HOUR = 2;
export const BURGLAR_CHANCE = 0.15;
export const BURGLAR_GAP_DAYS = 3;
export const BURGLAR_MIN_VALUE = 100;
/** minutos que o gatuno leva para soltar e levar o objeto */
export const STEAL_MINUTES = 20;
/** a polícia corre tantos tiles por minuto atrás do gatuno */
export const CHASE_STEPS = 2;
/** o gatuno vê a polícia a tantos tiles e foge */
export const FLEE_RADIUS = 5;
/** recompensa por gatuno pego */
export const BURGLAR_REWARD = 250;
/** Seu Sereno espera a barganha por tantos minutos antes de fechar o livro */
export const BARGAIN_MINUTES = 120;
/** quem escapa por pouco fica caído tantos minutos */
export const NEAR_MISS_REST = 90;
/** luto: dias, e a amizade mínima para sentir */
export const MOURN_DAYS = 3;
export const MOURN_FRIENDSHIP = 20;
/** fantasma: aparece às tantas, some às tantas; inquietação que perde por noite e por homenagem */
export const SPIRIT_FROM = 23;
export const SPIRIT_TO = 5;
export const SPIRIT_CHANCE = 0.75;
export const SPIRIT_REST_PER_NIGHT = 15;
export const HONOR_REST = 40;
/** fantasma: anda a cada tantos minutos, até tantos tiles da lápide; assusta a tantos tiles */
export const SPIRIT_STEP = 4;
export const SPIRIT_ROAM = 6;
export const SCARE_RADIUS = 2;
/** depois de um susto, tantos minutos de sossego */
export const SCARE_GAP = 120;

const SIDES: [number, number][] = [
  [0, -1],
  [1, 0],
  [0, 1],
  [-1, 0],
];

// ---------- o que queima ----------

/** O objeto pega fogo? (estofados, camas, madeira, papel, plantas; não louça, metal nem água) */
export function isFlammable(def: ObjectDef | undefined): boolean {
  if (!def) return false;
  if (def.flammable !== undefined) return def.flammable;
  if (def.memorial || def.safety || def.pool) return false;
  if (def.layer === 'ceiling') return false;
  return ['seating', 'beds', 'surfaces', 'decor', 'hobbies', 'games'].includes(def.category);
}

/** Objetos que ocupam o tile (x, y). */
export function objectsAt(world: World, catalog: Catalog, x: number, y: number): WorldObject[] {
  return world.objects.filter((o) => {
    const def = catalog.objects[o.defId];
    return !!def && footprint(o, def).some((t) => t.x === x && t.y === y);
  });
}

export function fireAt(world: World, x: number, y: number): Fire | undefined {
  return world.fires.find((f) => f.x === x && f.y === y);
}

/** Tem algo que queima neste tile? */
export function burnableAt(world: World, catalog: Catalog, x: number, y: number): boolean {
  return objectsAt(world, catalog, x, y).some((o) => isFlammable(catalog.objects[o.defId]));
}

/** Acende fogo no tile (se ainda não há e cabe mais). Devolve o fogo novo. */
export function addFire(world: World, catalog: Catalog, x: number, y: number): Fire | null {
  if (!inBounds(world.grid, x, y) || fireAt(world, x, y) || world.fires.length >= FIRE_MAX) return null;
  // água de piscina não pega fogo
  if (catalog.floors[world.grid.floor[y * world.grid.w + x]]?.water) return null;
  const fire: Fire = { id: world.nextId++, x, y, heat: 10, fuel: burnableAt(world, catalog, x, y) ? FUEL_FULL : FUEL_BARE, at: world.tick };
  world.fires.push(fire);
  return fire;
}

/** O fogo passa de um tile para o vizinho? (parede e janela seguram; porta aberta e cerca, não) */
export function fireCrosses(world: World, ax: number, ay: number, bx: number, by: number): boolean {
  const kind = world.grid.edges[edgeKey(ax, ay, bx, by)];
  if (!kind) return true;
  if (kind === 'door' || kind === 'doorGlass' || kind === 'doorDouble' || kind === 'arch' || kind === 'gate') return true;
  return !isWallLike(kind);
}

export interface FireMinute {
  /** objetos que acabaram de queimar inteiros (a Sim tira do lote) */
  burnt: WorldObject[];
  /** objetos que não queimam mas estragaram no fogo */
  ruined: WorldObject[];
  /** fogos que se apagaram sozinhos (sem nada para queimar) */
  died: Fire[];
  /** fogos novos que pularam */
  spread: Fire[];
}

/**
 * Um minuto de fogo: esquenta, come o combustível, queima o que está no tile
 * quando chega ao máximo e pula para os vizinhos com coisa que queima (ou
 * gente parada). Objetos queimados são devolvidos para a Sim tirar do lote.
 */
export function fireMinute(world: World, catalog: Catalog): FireMinute {
  const out: FireMinute = { burnt: [], ruined: [], died: [], spread: [] };
  for (const fire of [...world.fires]) {
    if (fire.fuel > 0) {
      fire.heat = Math.min(100, fire.heat + FIRE_GROW);
      if (fire.heat >= 100) fire.fuel = Math.max(0, fire.fuel - FUEL_BURN);
    } else {
      fire.heat -= FIRE_FADE;
    }
    if (fire.heat <= 0) {
      world.fires = world.fires.filter((f) => f !== fire);
      out.died.push(fire);
      continue;
    }
    if (fire.heat >= 100) {
      for (const obj of objectsAt(world, catalog, fire.x, fire.y)) {
        const def = catalog.objects[obj.defId];
        if (!def || def.memorial) continue;
        if (isFlammable(def)) {
          if (!out.burnt.includes(obj)) out.burnt.push(obj);
        } else if (!stateOf(obj).broken && !def.pool) {
          const s = stateOf(obj);
          s.broken = true;
          s.dirt = 100;
          out.ruined.push(obj);
        }
      }
    }
    if (fire.heat < FIRE_SPREAD_AT) continue;
    for (const [dx, dy] of SIDES) {
      const x = fire.x + dx;
      const y = fire.y + dy;
      if (!inBounds(world.grid, x, y) || fireAt(world, x, y) || !fireCrosses(world, fire.x, fire.y, x, y)) continue;
      const burnable = burnableAt(world, catalog, x, y);
      const someone = world.folks.some((f) => f.x === x && f.y === y && !f.away && f.age !== 'baby');
      const p = burnable ? FIRE_SPREAD_CHANCE : someone ? FIRE_SPREAD_FOLK : 0;
      if (p > 0 && nextFloat(world) < p * (fire.heat / 100)) {
        const fresh = addFire(world, catalog, x, y);
        if (fresh) out.spread.push(fresh);
      }
    }
  }
  return out;
}

/** Apaga um pouco do fogo. Devolve true se apagou de vez. */
export function douseFire(world: World, fire: Fire, amount: number): boolean {
  fire.heat -= amount;
  if (fire.heat > 0) return false;
  world.fires = world.fires.filter((f) => f !== fire);
  return true;
}

/** Fogo mais perto do ponto (no mesmo andar), até `radius` passos (Manhattan). */
export function nearestFire(world: World, from: Vec, radius = Infinity): Fire | undefined {
  const level = levelOfRow(world.grid, from.y);
  let best: Fire | undefined;
  let bestD = Infinity;
  for (const f of world.fires) {
    if (levelOfRow(world.grid, f.y) !== level) continue;
    const d = Math.abs(f.x - from.x) + Math.abs(f.y - from.y);
    if (d <= radius && d < bestD) {
      best = f;
      bestD = d;
    }
  }
  return best;
}

/** Tiles livres em volta do fogo, de onde dá para apagar ou entrar em pânico (fora das chamas). */
export function fireSideTiles(world: World, nav: Nav, fire: Pick<Fire, 'x' | 'y'>): Vec[] {
  const out: Vec[] = [];
  for (const [dx, dy] of SIDES) {
    const x = fire.x + dx;
    const y = fire.y + dy;
    if (!nav.isFree(x, y) || fireAt(world, x, y) || !fireCrosses(world, fire.x, fire.y, x, y)) continue;
    out.push({ x, y });
  }
  if (out.length > 0) return out;
  // fogo cercado de móveis (em cima da cama, atrás do armário): o jato alcança de um passo mais longe,
  // em linha reta ou na diagonal, desde que nenhuma parede fique no meio
  for (const [dx, dy] of SIDES) {
    const mx = fire.x + dx;
    const my = fire.y + dy;
    if (!fireCrosses(world, fire.x, fire.y, mx, my)) continue;
    const ahead: [number, number][] = [[dx * 2, dy * 2], dx === 0 ? [1, dy] : [dx, 1], dx === 0 ? [-1, dy] : [dx, -1]];
    for (const [ax, ay] of ahead) {
      const x = fire.x + ax;
      const y = fire.y + ay;
      if (out.some((t) => t.x === x && t.y === y)) continue;
      if (!nav.isFree(x, y) || fireAt(world, x, y) || !fireCrosses(world, mx, my, x, y)) continue;
      out.push({ x, y });
    }
  }
  return out;
}

/** O detector de fumaça percebe este fogo? (mesmo cômodo ou perto, no mesmo andar) */
export function smokeSeen(world: World, catalog: Catalog, fires: Fire[] = world.fires): boolean {
  const detectors = world.objects.filter((o) => catalog.objects[o.defId]?.safety === 'smoke' && !stateOf(o).broken);
  if (detectors.length === 0 || fires.length === 0) return false;
  const map = computeRooms(world.grid, catalog);
  for (const d of detectors) {
    const room = map.of[d.y * map.w + d.x];
    for (const f of fires) {
      if (levelOfRow(world.grid, f.y) !== levelOfRow(world.grid, d.y)) continue;
      if (Math.abs(f.x - d.x) + Math.abs(f.y - d.y) <= SMOKE_RADIUS) return true;
      const fr = map.of[f.y * map.w + f.x];
      if (fr >= 0 && fr === room && !map.rooms[fr]?.outdoor) return true;
    }
  }
  return false;
}

/** Algum objeto de segurança deste tipo no lote (inteiro)? */
export function safetyOf(world: World, catalog: Catalog, kind: NonNullable<ObjectDef['safety']>): WorldObject | undefined {
  return world.objects.find((o) => catalog.objects[o.defId]?.safety === kind && !stateOf(o).broken);
}

// ---------- quando o fogo começa ----------

/** Chance de quem cozinha com tal nível de Culinária pôr fogo no fogão neste prato. */
export function cookFireChance(cookingLevel: number): number {
  return Math.max(0, COOK_SAFE_LEVEL - cookingLevel) * COOK_FIRE;
}

/** Coisas que queimam coladas na lareira (até 1 tile de distância da área dela). */
export function hearthNeighbors(world: World, catalog: Catalog, hearth: WorldObject): WorldObject[] {
  const def = catalog.objects[hearth.defId];
  if (!def) return [];
  const tiles = footprint(hearth, def);
  const level = levelOfRow(world.grid, hearth.y);
  return world.objects.filter((o) => {
    if (o === hearth) return false;
    const d = catalog.objects[o.defId];
    if (!d || !isFlammable(d) || d.layer === 'wall') return false;
    return footprint(o, d).some(
      (t) => levelOfRow(world.grid, t.y) === level && tiles.some((h) => Math.max(Math.abs(h.x - t.x), Math.abs(h.y - t.y)) <= 1),
    );
  });
}

/** Lareira acesa agora? */
export function blazing(world: World, obj: WorldObject): boolean {
  return (obj.blaze ?? 0) > world.tick;
}

// ---------- gatuno ----------

/**
 * Plano 2, bloco 15: o gatuno só leva o que cabe nos braços. Geladeira, fogão,
 * cama, vaso e móvel de mais de um tile ficam: sem eles a casa não come, não
 * dorme e não vai ao banheiro, e a família parada morria de fome sem saber.
 */
export function carryable(def: ObjectDef): boolean {
  if (def.fixture || def.memorial || def.buyable === false || def.layer === 'ceiling' || def.pool || def.plant) return false;
  if (def.pantry || def.size.w * def.size.h > 1) return false;
  return !def.interactions.some(
    (it) => isSleep(it) || (it.effects.bladder ?? 0) > 0 || (it.effects.hunger ?? 0) > 0 || !!it.cook,
  );
}

/** O que o gatuno levaria: o objeto de mais valor que se carrega (sem obra, sem lápide). */
export function lootTarget(world: World, catalog: Catalog, reachable: (obj: WorldObject) => boolean): WorldObject | null {
  let best: WorldObject | null = null;
  let bestV = BURGLAR_MIN_VALUE - 1;
  for (const obj of world.objects) {
    const def = catalog.objects[obj.defId];
    if (!def || !carryable(def)) continue;
    if (objectBusy(world, obj.id)) continue;
    const v = sellValue(world, obj, def);
    if (v <= bestV || !reachable(obj)) continue;
    best = obj;
    bestV = v;
  }
  return best;
}

/** Hoje é noite de gatuno? (sorteio às BURGLAR_HOUR) */
export function burglarNight(world: World, catalog: Catalog): boolean {
  if (world.tick - world.lastBurglary < BURGLAR_GAP_DAYS * MINUTES_PER_DAY) return false;
  if (world.party) return false;
  const worth = world.objects.some((o) => {
    const def = catalog.objects[o.defId];
    return !!def && carryable(def) && sellValue(world, o, def) >= BURGLAR_MIN_VALUE;
  });
  return worth && nextFloat(world) < BURGLAR_CHANCE;
}

// ---------- morte e barganha ----------

/** Dedos do par ou ímpar (0 a 5 de cada lado). */
export function throwFingers(world: World): [number, number] {
  return [nextInt(world, 6), nextInt(world, 6)];
}

/** Quem escolheu par ganha com soma par, e ímpar com soma ímpar. */
export function bargainWon(pick: 'even' | 'odd', mine: number, his: number): boolean {
  return ((mine + his) % 2 === 0) === (pick === 'even');
}

/** Lápide para quem morreu fora de casa (ou na água) e urna para quem morreu dentro. */
export function memorialKind(world: World, catalog: Catalog, at: Vec, cause: DeathCause): 'grave' | 'urn' {
  if (cause === 'drown') return 'grave';
  const floor = catalog.floors[world.grid.floor[at.y * world.grid.w + at.x]];
  return floor?.outdoor ? 'grave' : 'urn';
}

/** Lugar livre mais perto de `at` para o objeto (lápide, urna, o que o gatuno largou); null = não coube. */
export function freeSpotFor(world: World, catalog: Catalog, defId: string, at: Vec): Vec | null {
  const { grid } = world;
  const seen = new Set<number>();
  const queue: Vec[] = [at];
  seen.add(at.y * grid.w + at.x);
  const level = levelOfRow(grid, at.y);
  while (queue.length > 0) {
    const t = queue.shift()!;
    if (checkPlacement(world, catalog, defId, t.x, t.y, 0).ok && !fireAt(world, t.x, t.y)) return t;
    for (const [dx, dy] of SIDES) {
      const x = t.x + dx;
      const y = t.y + dy;
      const k = y * grid.w + x;
      if (seen.has(k) || !inBounds(grid, x, y) || levelOfRow(grid, y) !== level) continue;
      if (Math.abs(x - at.x) + Math.abs(y - at.y) > 14) continue;
      seen.add(k);
      queue.push({ x, y });
    }
  }
  return null;
}

/** Tiles livres em volta da lápide para o fantasma aparecer e andar. */
export function spiritTiles(world: World, nav: Nav, obj: WorldObject, def: ObjectDef): Vec[] {
  const out: Vec[] = [];
  const tiles = footprint(obj, def);
  for (let dy = -SPIRIT_ROAM; dy <= SPIRIT_ROAM; dy++) {
    for (let dx = -SPIRIT_ROAM; dx <= SPIRIT_ROAM; dx++) {
      const x = obj.x + dx;
      const y = obj.y + dy;
      if (levelOfRow(world.grid, y) !== levelOfRow(world.grid, obj.y)) continue;
      if (!nav.isFree(x, y) || tiles.some((t) => t.x === x && t.y === y)) continue;
      out.push({ x, y });
    }
  }
  return out;
}

/** Passo do fantasma: um vizinho livre ao acaso que não se afasta demais da lápide. */
export function spiritStep(world: World, nav: Nav, from: Vec, home: Vec): Vec {
  const options: Vec[] = [];
  for (const [dx, dy] of SIDES) {
    const x = from.x + dx;
    const y = from.y + dy;
    if (Math.abs(x - home.x) > SPIRIT_ROAM || Math.abs(y - home.y) > SPIRIT_ROAM) continue;
    if (!nav.canStep(from.x, from.y, x, y)) continue;
    options.push({ x, y });
  }
  if (options.length === 0) return from;
  return options[nextInt(world, options.length)];
}

/** Quem está dormindo agora (deitado numa interação de sono)? */
export function asleep(folk: Folk, catalog: Catalog, world: World): boolean {
  const a = folk.queue[0];
  if (a?.phase !== 'using' || a.objectId === undefined) return false;
  const obj = world.objects.find((o) => o.id === a.objectId);
  const it = obj && catalog.objects[obj.defId]?.interactions.find((i) => i.id === a.interactionId);
  return !!it && (it.effects.energy ?? 0) > 0 && it.pose === 'lie';
}

/** Distância de xadrez (8 vizinhos) no mesmo andar; Infinity em andares diferentes. */
export function reach(world: World, a: Vec, b: Vec): number {
  if (levelOfRow(world.grid, a.y) !== levelOfRow(world.grid, b.y)) return Infinity;
  return Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y));
}

/** bloco 14: minutos de pânico ao lado do fogo (depois decide de novo) */
export const PANIC_MINUTES = 12;
