import { temperMessSense, temperTidy } from './temper';
import type { Nav } from './grid';
import { edgeKey, footprint } from './grid';
import type { Logger } from './gossip';
import { addMemory, relationOf } from './relations';
import { nextFloat } from './rng';
import { skillLevel } from './skills';
import { AUTO_WATER_BELOW } from './garden';
import type { Catalog, Folk, InteractionDef, Mess, MessKind, ObjectDef, ObjectState, Vec, World, WorldObject } from './types';

// Bloco 1, casa viva: objetos sujam e gastam com o uso, quebram com o
// desgaste e pedem conserto; pratos, poças e lixo ficam pela casa até alguém
// recolher. Tudo puro, determinístico pelo RNG do mundo.

/** habilidade de consertar e mexer em aparelho */
export const HANDINESS = 'handiness';
/** habilidade de limpar rápido e sujar menos */
export const TIDINESS = 'tidiness';

/** sujeira a partir da qual o objeto parece sujo (manchas e moscas) */
export const DIRTY_AT = 50;
/** a partir daqui o jogador já pode mandar limpar */
export const CLEAN_MIN = 8;
/** a IA só pensa em limpar a partir daqui */
export const AUTO_CLEAN_AT = 30;
/** a IA só pensa em esvaziar a lixeira a partir daqui */
export const AUTO_EMPTY_AT = 60;
export const BIN_FULL = 100;
/** revisão só faz sentido com algum desgaste */
export const SERVICE_MIN = 15;
/** consertar com Jeito abaixo disso vira gambiarra (quebra de novo mais cedo) */
export const PATCH_BELOW = 3;
/** abaixo disso o conserto pode dar choque */
export const SHOCK_BELOW = 4;
/** limite de bagunça solta no lote (a casa não vira um lixão infinito) */
export const MAX_MESS = 40;
/** minutos entre duas reclamações da mesma pessoa sobre a mesma outra */
const COMPLAIN_GAP = 12 * 60;

export function freshState(): ObjectState {
  return { dirt: 0, wear: 0, broken: false, patched: false, repair: 0, fill: 0 };
}

/** O estado do objeto, criando um novo se faltar (saves antigos, testes). */
export function stateOf(obj: WorldObject): ObjectState {
  if (!obj.state) obj.state = freshState();
  return obj.state;
}

// ---------- traços ----------

/** Vontade de limpar e consertar (produto dos traços; 1 = normal). */
export function tidyOf(catalog: Catalog, folk: Folk): number {
  let m = 1;
  for (const t of folk.traits) m *= catalog.traits[t]?.tidy ?? 1;
  return m * temperTidy(folk.temper);
}

/** Quanto a bagunça incomoda o folk (1 = normal). */
export function messSenseOf(catalog: Catalog, folk: Folk): number {
  let m = 1;
  for (const t of folk.traits) m *= catalog.traits[t]?.messSense ?? 1;
  return m * temperMessSense(folk.temper);
}

/** Quem é desleixado suja mais; quem é caprichoso, menos. */
function dirtMultiplier(catalog: Catalog, folk: Folk): number {
  const tidy = tidyOf(catalog, folk);
  const bySkill = 1 - 0.05 * skillLevel(folk, TIDINESS);
  return Math.max(0.5, Math.min(1.4, 1.5 - 0.5 * tidy)) * bySkill;
}

// ---------- disponibilidade ----------

/** A interação de cuidado tem o que fazer neste objeto agora? */
export function careAvailable(obj: WorldObject, it: InteractionDef): boolean {
  const s = stateOf(obj);
  switch (it.care) {
    case 'clean':
      return s.dirt >= CLEAN_MIN;
    case 'repair':
      return s.broken;
    case 'service':
      return !s.broken && s.wear >= SERVICE_MIN;
    case 'empty':
      return s.fill >= 10;
    case 'dishes':
    case 'dump':
      return true;
    // bloco 13: plantas (veja sim/garden.ts)
    case 'water':
      return !!obj.plant && obj.plant.health > 0 && obj.plant.water < 90;
    case 'harvest':
      return !!obj.plant && obj.plant.fruit > 0;
    case 'replant':
      return !!obj.plant && obj.plant.health <= 0;
    default:
      return false;
  }
}

/** Dá para usar esta interação agora? Objeto quebrado só aceita cuidado. */
export function interactionOpen(obj: WorldObject, it: InteractionDef): boolean {
  if (it.care) return careAvailable(obj, it);
  // bloco 11: cuidado com bebê só com um bebê no berço
  if (it.baby) return obj.baby !== undefined && !stateOf(obj).broken;
  // bloco 3: o interruptor só oferece o que muda alguma coisa
  if (it.light === 'on') return !obj.lit && !stateOf(obj).broken;
  if (it.light === 'off') return !!obj.lit;
  // bloco 7: o botão do som (ligar, trocar de estação, desligar); veja sim/music.ts
  if (it.tune === 'on') return !obj.tune && !stateOf(obj).broken;
  if (it.tune === 'next') return !!obj.tune && !stateOf(obj).broken;
  if (it.tune === 'off') return !!obj.tune;
  // bloco 13: cheirar as flores só com a planta adulta e viçosa
  if (it.bloom) return !!obj.plant && obj.plant.growth >= 100 && obj.plant.health >= 70 && obj.plant.water >= 25;
  // bloco 14: lareira: acender só apagada; aquecer-se e abafar só acesa
  if (it.special === 'kindle') return !obj.lit && !stateOf(obj).broken;
  if (it.blaze) return !!obj.lit;
  if (it.special === 'honor') return !!obj.memorial;
  // bloco 9: só dá para beliscar com petisco na mesa
  if (it.snacks === 'eat') return (obj.snacks ?? 0) > 0 && !stateOf(obj).broken;
  return !stateOf(obj).broken;
}

// ---------- uso: suja, gasta e quebra ----------

/** Um minuto de uso normal do objeto. */
export function wearTick(catalog: Catalog, folk: Folk, obj: WorldObject, def: ObjectDef): void {
  const u = def.upkeep;
  if (!u) return;
  const s = stateOf(obj);
  if (u.dirt) s.dirt = Math.min(100, s.dirt + u.dirt * dirtMultiplier(catalog, folk));
  if (u.wear) s.wear = Math.min(100, s.wear + u.wear * (s.patched ? 1.5 : 1));
}

/** Chance de quebrar ao fim de um uso, pelo desgaste. */
export function breakChance(s: ObjectState): number {
  if (s.wear >= 100) return 1;
  const w = s.wear / 100;
  return 0.4 * w * w * w * (s.patched ? 2 : 1);
}


/** O que encadear depois de uma ação (lavar o prato, levar o saco à calçada). */
export type Chain = 'dishes' | 'dump' | null;

/**
 * Fim de um uso normal: o objeto pode quebrar, o folk pode deixar um prato
 * ou uma poça e o lixo vai para a lixeira. Devolve o que o folk faz em seguida.
 */
export function afterUse(
  world: World,
  catalog: Catalog,
  log: Logger,
  folk: Folk,
  obj: WorldObject,
  def: ObjectDef,
  it: InteractionDef,
): Chain {
  const s = stateOf(obj);
  if (def.upkeep?.breaks && !s.broken && nextFloat(world) < breakChance(s)) {
    s.broken = true;
    s.repair = 0;
    log('log.broke', { object: def.name, name: folk.name });
  }
  let chain: Chain = null;
  if (it.trash) addTrash(world, catalog, log, folk, it.trash);
  if (it.leaves && !folk.visit) {
    const chance = it.leaves.chance * (1 - 0.06 * skillLevel(folk, TIDINESS));
    if (nextFloat(world) < chance) {
      if (it.leaves.kind === 'plate') {
        // quem é caprichoso costuma lavar o próprio prato na hora
        const tidy = tidyOf(catalog, folk);
        if (tidy >= 1.25 && hasCare(world, catalog, 'dishes') && nextFloat(world) < Math.min(0.85, tidy - 0.6)) {
          chain = 'dishes';
        } else {
          const spot = plateSpot(world, catalog, folk);
          addMess(world, 'plate', spot.x, spot.y, folk.id);
        }
      } else {
        addMess(world, it.leaves.kind, folk.x, folk.y, folk.id);
      }
    }
  }
  return chain;
}

/** Onde o prato fica: na mesa ou bancada mais perto (até 2 passos), senão no chão. */
export function plateSpot(world: World, catalog: Catalog, folk: Folk): Vec {
  let best: Vec = { x: folk.x, y: folk.y };
  let bestD = 3;
  for (const obj of world.objects) {
    const def = catalog.objects[obj.defId];
    if (!def || def.category !== 'surfaces') continue;
    // mesa grande (com cadeiras nas pontas): o prato fica no meio, no tampo
    const all = footprint(obj, def);
    const tiles = all.length >= 3 ? [all[Math.floor(all.length / 2)]] : all;
    for (const t of tiles) {
      const d = Math.abs(t.x - folk.x) + Math.abs(t.y - folk.y);
      if (d < bestD) {
        bestD = d;
        best = t;
      }
    }
  }
  return best;
}

/** Põe bagunça no lote, respeitando o limite. Devolve a bagunça criada (ou null). */
export function addMess(world: World, kind: MessKind, x: number, y: number, by: number): Mess | null {
  if (world.mess.length >= MAX_MESS) return null;
  const here = world.mess.filter((m) => m.x === x && m.y === y);
  // poça em cima de poça é uma poça só; até 3 pratos empilhados
  if (kind !== 'plate' && here.some((m) => m.kind === kind)) return null;
  if (here.length >= 3) return null;
  const mess: Mess = { id: world.nextId++, kind, x, y, tick: world.tick, by };
  world.mess.push(mess);
  return mess;
}

function hasCare(world: World, catalog: Catalog, care: InteractionDef['care']): boolean {
  return world.objects.some((o) => catalog.objects[o.defId]?.interactions.some((i) => i.care === care));
}

/** A lixeira mais perto de um ponto. */
export function nearestBin(world: World, catalog: Catalog, at: Vec): WorldObject | null {
  let best: WorldObject | null = null;
  let bestD = Infinity;
  for (const obj of world.objects) {
    if (!catalog.objects[obj.defId]?.upkeep?.bin) continue;
    const d = Math.abs(obj.x - at.x) + Math.abs(obj.y - at.y);
    if (d < bestD) {
      bestD = d;
      best = obj;
    }
  }
  return best;
}

/**
 * Joga lixo na lixeira mais perto. Lixeira cheia: o lixo cai no chão.
 * Sem lixeira na casa, o lixo some (casas antigas continuam funcionando).
 */
export function addTrash(world: World, catalog: Catalog, log: Logger, folk: Folk, amount: number): void {
  const bin = nearestBin(world, catalog, folk);
  if (!bin) return;
  const s = stateOf(bin);
  if (s.fill >= BIN_FULL) {
    addMess(world, 'trash', folk.x, folk.y, folk.id);
    return;
  }
  s.fill = Math.min(BIN_FULL, s.fill + amount);
  if (s.fill >= BIN_FULL) log('log.binFull', { object: catalog.objects[bin.defId].name });
}

// ---------- cuidado: limpar, consertar, revisar, esvaziar ----------

/**
 * Um minuto de cuidado com o objeto. Devolve true quando terminou o serviço
 * (o objeto ficou limpo, consertado ou revisado).
 */
export function careTick(
  world: World,
  _catalog: Catalog,
  log: Logger,
  folk: Folk,
  obj: WorldObject,
  def: ObjectDef,
  it: InteractionDef,
): boolean {
  const s = stateOf(obj);
  const jeito = skillLevel(folk, HANDINESS);
  switch (it.care) {
    case 'clean':
      s.dirt = Math.max(0, s.dirt - 4 * (1 + 0.15 * skillLevel(folk, TIDINESS)));
      return s.dirt <= 0;
    case 'repair':
      if (!s.broken) return true;
      s.repair = Math.min(100, s.repair + 2 * (1 + 0.2 * jeito));
      if (s.repair < 100) return false;
      finishRepair(world, log, folk, s, def, jeito);
      return true;
    case 'service':
      s.wear = Math.max(0, s.wear - 1.5 * (1 + 0.2 * jeito));
      if (s.wear > 0) return false;
      if (jeito >= PATCH_BELOW) s.patched = false;
      return true;
    case 'water':
      // bloco 13: regar enche a planta de água (veja sim/garden.ts)
      if (!obj.plant) return true;
      obj.plant.water = Math.min(100, obj.plant.water + WATER_PER_MINUTE);
      return obj.plant.water >= 100;
    default:
      return false;
  }
}

/** bloco 13: água que cada minuto de rega dá */
export const WATER_PER_MINUTE = 7;

function finishRepair(world: World, log: Logger, folk: Folk, s: ObjectState, def: ObjectDef, jeito: number): void {
  s.broken = false;
  s.repair = 0;
  s.patched = jeito < PATCH_BELOW;
  s.wear = s.patched ? 30 : 5;
  log(s.patched ? 'log.patched' : 'log.repaired', { name: folk.name, object: def.name });
  // gambiarra às vezes dá choque (leve: o perigo de verdade vem com o fogo)
  if (jeito < SHOCK_BELOW && nextFloat(world) < 0.3 - 0.07 * jeito) shock(folk, log, world.tick);
}

/** bloco 14: minutos de cabelo em pé depois do choque (igual a SOOTY_MINUTES em peril.ts) */
export const SOOTY_SHOCK = 3 * 60;

/** Choque leve de quem mexeu no que não sabia. */
export function shock(folk: Folk, log: Logger, tick?: number): void {
  // bloco 14: fica chamuscado (cabelo em pé) por umas horas; com Jeito zero, a faísca pode virar fogo (Sim)
  if (tick !== undefined) folk.sooty = tick + SOOTY_SHOCK;
  folk.needs.comfort = Math.max(0, folk.needs.comfort - 25);
  folk.needs.energy = Math.max(0, folk.needs.energy - 10);
  folk.needs.hygiene = Math.max(0, folk.needs.hygiene - 10);
  log('log.shock', { name: folk.name });
}

/** Fim de um cuidado que dura um tempo fixo (esvaziar, lavar, jogar fora). */
export function afterCare(obj: WorldObject, it: InteractionDef): Chain {
  if (it.care === 'empty') {
    stateOf(obj).fill = 0;
    return 'dump';
  }
  return null;
}

// ---------- bagunça solta ----------

/** Minutos para recolher cada tipo de bagunça, pelo Capricho. */
export function tidyMinutes(kind: MessKind, folk: Folk): number {
  const base = kind === 'plate' ? 2 : kind === 'puddle' ? 8 : kind === 'paper' ? 3 : kind === 'ash' ? 10 : 5;
  return Math.max(1, Math.round(base * (1 - 0.06 * skillLevel(folk, TIDINESS))));
}

/** Tiles de onde dá para recolher a bagunça: o próprio tile ou um vizinho sem parede no meio. */
export function messTiles(world: World, nav: Nav, mess: Mess): Vec[] {
  if (nav.isFree(mess.x, mess.y)) return [{ x: mess.x, y: mess.y }];
  const out: Vec[] = [];
  for (const [dx, dy] of [
    [0, -1],
    [1, 0],
    [0, 1],
    [-1, 0],
  ]) {
    const x = mess.x + dx;
    const y = mess.y + dy;
    if (!nav.isFree(x, y) || world.grid.edges[edgeKey(mess.x, mess.y, x, y)]) continue;
    out.push({ x, y });
  }
  return out;
}

/**
 * Bagunça recolhida. Quem se incomoda com bagunça reclama de quem deixou
 * (lembrança "deixou a bagunça"). Devolve o que vem em seguida.
 */
export function finishTidy(world: World, catalog: Catalog, log: Logger, folk: Folk, mess: Mess): Chain {
  world.mess = world.mess.filter((m) => m.id !== mess.id);
  if (mess.kind === 'paper') {
    // jornal (lido ou velho) vai para a lixeira
    const bin = nearestBin(world, catalog, folk);
    if (bin && stateOf(bin).fill + 5 <= BIN_FULL) stateOf(bin).fill += 5;
    return null;
  }
  const culprit = mess.by && mess.by !== folk.id ? world.folks.find((f) => f.id === mess.by && !f.visit) : undefined;
  if (culprit && messSenseOf(catalog, folk) >= 1.25) {
    const rel = relationOf(world, folk.id, culprit.id);
    const last = rel?.memories.filter((m) => m.kind === 'leftMess').pop();
    if (!last || world.tick - last.tick >= COMPLAIN_GAP) {
      addMemory(world, catalog, folk.id, culprit.id, 'leftMess');
      log(mess.kind === 'plate' ? 'log.complainDishes' : 'log.complainMess', { name: folk.name, other: culprit.name });
    }
  }
  if (mess.kind === 'plate') return hasCare(world, catalog, 'dishes') ? 'dishes' : null;
  if (mess.kind === 'trash') {
    const bin = nearestBin(world, catalog, folk);
    if (bin && stateOf(bin).fill + 10 <= BIN_FULL) {
      stateOf(bin).fill += 10;
      return null;
    }
    return 'dump';
  }
  return null;
}

// ---------- ambiente ----------

/** Quanto a bagunça de cada tipo pesa no ambiente em volta. */
export const MESS_AMBIENCE: Record<MessKind, number> = { plate: -5, puddle: -6, trash: -9, paper: -2, ash: -8 };

/** Quanto o estado do objeto tira do ambiente (sujeira, quebrado, lixo fedendo). */
export function stateAmbience(obj: WorldObject, def: ObjectDef): number {
  const s = obj.state;
  if (!s) return 0;
  let v = 0;
  if (s.dirt > AUTO_CLEAN_AT) v -= (s.dirt - AUTO_CLEAN_AT) * 0.2;
  if (s.broken) v -= 10;
  if (def.upkeep?.bin) {
    if (s.fill >= BIN_FULL) v -= 30;
    else if (s.fill >= 75) v -= 8;
  }
  return v;
}

/** Bagunça no lote que conta para a casa (0 = um brinco). */
export function messLevel(world: World, catalog: Catalog): number {
  let v = world.mess.length * 6;
  for (const obj of world.objects) {
    const def = catalog.objects[obj.defId];
    if (def) v -= stateAmbience(obj, def);
  }
  return Math.round(v);
}

// ---------- IA ----------

/** Nota base de um cuidado com objeto (antes do traço, do humor e da distância). */
export function objectCareScore(obj: WorldObject, it: InteractionDef): number {
  const s = stateOf(obj);
  switch (it.care) {
    case 'clean':
      return s.dirt < AUTO_CLEAN_AT ? 0 : 10 + (s.dirt - AUTO_CLEAN_AT) * 0.5;
    case 'repair':
      return s.broken ? 34 : 0;
    case 'empty':
      if (s.fill < AUTO_EMPTY_AT) return 0;
      return s.fill >= BIN_FULL ? 42 : 12 + (s.fill - AUTO_EMPTY_AT) * 0.5;
    // bloco 13: regar o que está com sede, colher o que amadureceu
    case 'water':
      if (!obj.plant || obj.plant.water >= AUTO_WATER_BELOW) return 0;
      return 12 + (AUTO_WATER_BELOW - obj.plant.water) * 0.5;
    case 'harvest':
      return obj.plant && obj.plant.fruit > 0 ? 18 + obj.plant.fruit * 2 : 0;
    default:
      return 0;
  }
}

/** Nota base de recolher uma bagunça (prato velho incomoda mais). */
export function messScore(mess: Mess, tick: number): number {
  if (mess.kind === 'plate') return 16 + Math.min(20, ((tick - mess.tick) / 60) * 2);
  // jornal do dia: vontade de ler; jornal velho: só papel acumulando
  if (mess.kind === 'paper') return Math.floor(mess.tick / 1440) === Math.floor(tick / 1440) ? 20 : 12;
  return mess.kind === 'puddle' ? 22 : 26;
}

/** Multiplicador da vontade de cuidar da casa: traço e humor (de mau humor ninguém faxina). */
export function careDrive(catalog: Catalog, folk: Folk, mood: number): number {
  if (folk.visit) return 0;
  return tidyOf(catalog, folk) * Math.max(0.4, Math.min(1.2, mood / 60));
}

/** Alguém já está cuidando desta bagunça? */
export function messTaken(world: World, messId: number, except?: Folk): boolean {
  return world.folks.some((f) => f !== except && f.queue[0]?.kind === 'tidy' && f.queue[0].messId === messId);
}
