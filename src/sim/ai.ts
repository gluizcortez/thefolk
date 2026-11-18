import type { Nav } from './grid';
import { useTiles } from './grid';
import { NEED_MAX, clampNeed, moodOf, needWeight } from './needs';
import { careAvailable, careDrive, messScore, messTaken, messTiles, objectCareScore } from './upkeep';
import { canUse, houseOptions } from './services';
import { skillBoost } from './skills';
import { findPathToAny } from './pathfinding';
import { nextFloat } from './rng';
import { freshness, knows, relationOf } from './relations';
import { grudge, pickGossip } from './gossip';
import { committedElsewhere, guessAccept, onLot, socialAllowed, socialTaste, talkTiles, talkingWith } from './social';
import type { Catalog, Folk, InteractionDef, Needs, ServiceOrder, SocialDef, World } from './types';
import { NEED_IDS } from './types';
import { temperPull } from './temper';
import { JOIN_BONUS, TIER_PULL, duoPartners, occupiedId, tierOf } from './furnish';
import { isSleep, refusal, sleepPressure } from './will';
import { wishPull, wishTalkPull, wishTidyPull } from './wishes';
import { kidAllows } from './kids';

/** Bloco 6: quanto a hora de deitar soma na vontade de dormir (com pressão 1). */
export const BEDTIME_BONUS = 70;
/** bexiga ou fome abaixo disso tiram o sono */
const RESTLESS_BELOW = 15;
/** a não ser que a energia esteja abaixo disso */
const RESTLESS_ENERGY = 8;

/** Bloco 4: vontade de entrar na atividade a dois que alguém já começou. */
export function joinUtility(world: World, catalog: Catalog, folk: Folk, objectId: number, it: InteractionDef): number {
  const partners = duoPartners(world, folk, objectId, it);
  if (partners.length === 0 || !it.duo) return 0;
  let best = 0;
  for (const p of partners) {
    const f = relationOf(world, folk.id, p.id)?.friendship ?? 0;
    if (f <= -30) continue;
    best = Math.max(best, JOIN_BONUS * (1 + Math.max(0, f) / 100));
  }
  return best + effectsUtility(catalog, folk, it.duo.effects, expectedDuration(folk, it));
}

/** Uma opção da IA: usar um objeto ou puxar conversa com alguém. */
export interface Option {
  objectId?: number;
  interactionId?: string;
  otherId?: number;
  socialId?: string;
  /** bagunça para recolher */
  messId?: number;
  /** serviço a pedir pelo telefone */
  serviceId?: ServiceOrder;
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
  return effectsUtility(catalog, folk, it.effects, expectedDuration(folk, it), (id) => skillBoost(folk, it, id));
}

/** Quanto `minutes` minutos destes efeitos valem para o folk agora. */
export function effectsUtility(
  catalog: Catalog,
  folk: Folk,
  effects: Partial<Needs>,
  minutes: number,
  boost: (id: keyof Needs) => number = () => 1,
): number {
  let score = 0;
  for (const id of NEED_IDS) {
    const base = effects[id];
    if (!base) continue;
    const rate = base > 0 ? base * boost(id) : base;
    const cur = folk.needs[id];
    const delta = clampNeed(cur + rate * minutes) - cur;
    score += delta * urgency(cur) * needWeight(catalog, folk, id);
  }
  return score;
}

/** Quantos outros folks estão usando o objeto ou indo até ele. */
export function objectUsers(world: World, objectId: number, except?: Folk): number {
  let n = 0;
  for (const f of world.folks) {
    if (f === except) continue;
    const a = f.queue[0];
    if (a?.kind === 'use' && occupiedId(a) === objectId && (a.phase !== 'queued' || a.eatAt !== undefined)) n++;
  }
  return n;
}

/** Bônus de curiosidade para cumprimentar quem ainda não conhece. */
const MEET_BONUS = 25;
/** quanto a mais a IA puxa conversa quando um dos dois é visita */
const GUEST_BIAS = 1.5;
/** minutos sem repetir conversa autônoma com a mesma pessoa */
const PAIR_COOLDOWN = 20;

/** O folk com estes traços e esta relação teria vontade de puxar esse tipo de conversa? */
function socialMood(catalog: Catalog, world: World, folk: Folk, other: Folk, def: SocialDef): number {
  const rel = relationOf(world, folk.id, other.id);
  const f = rel?.friendship ?? 0;
  const taste = socialTaste(catalog, folk, def.category);
  // lembranças: rancor afasta do papo amigável e empurra para a briga
  const mem = grudge(world, catalog, folk.id, other.id);
  if (def.category === 'mean' && !(taste >= 1.5 || f <= -20 || mem <= -6)) return 0;
  if (def.category === 'friendly' && mem <= -8 && def.special !== 'gossip') return 0;
  if (def.category === 'romantic') {
    const into = (rel?.romance ?? 0) >= 15 || rel?.dating || (taste >= 1.3 && f >= 30);
    if (!into) return 0;
    // quem namora firme não sai flertando por aí
    if (!rel?.dating && committedElsewhere(world, folk.id, other.id)) return 0;
  }
  if (def.special === 'gossip' && !pickGossip(world, catalog, folk.id, other.id)) return 0;
  // pedir desculpas: só quem tem jeito para isso e algo a consertar
  if (def.id === 'apologize' && !folk.traits.some((t) => t === 'gentil' || t === 'caseiro')) return 0;
  // visita veio para conversar; quem mora dá atenção a quem chegou
  const guest = folk.visit || other.visit ? GUEST_BIAS : 1;
  const fondness = Math.max(-0.5, Math.min(0.6, mem * 0.06));
  return taste * guest * (1 + Math.max(0, f) / 150) * (1 + (def.category === 'mean' ? -fondness : fondness));
}

/** Conversas autônomas possíveis com quem está em casa. */
const CREW = new Set(['firefighter', 'police', 'burglar', 'reaper']);

export function scoreSocialOptions(world: World, catalog: Catalog, folk: Folk, nav: Nav): Option[] {
  const options: Option[] = [];
  for (const other of world.folks) {
    if (other === folk || !onLot(other)) continue;
    // quem ainda está na porta, esperando alguém atender, não conversa
    if (other.visit && !other.visit.admitted) continue;
    // bloco 14: bombeiro, polícia, gatuno e Seu Sereno não estão ali para prosear; nem quem caiu
    if (other.down || (other.visit?.service && CREW.has(other.visit.service.kind))) continue;
    const busyWith = talkingWith(other);
    if (busyWith !== 0 && busyWith !== folk.id) continue;
    const it = other.queue[0];
    if (it?.phase === 'using' && it.kind === 'use' && catalog.objects[objectDefIdOf(world, it.objectId)]?.interactions.find((i) => i.id === it.interactionId)?.pose === 'lie') {
      continue; // não acorda quem dorme
    }
    const rel = relationOf(world, folk.id, other.id);
    if (rel && world.tick - rel.last < PAIR_COOLDOWN) continue;
    const path = findPathToAny(nav, folk, talkTiles(world, nav, other, folk));
    if (!path) continue;
    const fresh = rel ? freshness(rel, world.tick) : 1;
    for (const def of Object.values(catalog.socials)) {
      if (def.autonomous === false || !socialAllowed(world, catalog, def, folk, other)) continue;
      const mood = socialMood(catalog, world, folk, other, def);
      if (mood <= 0) continue;
      const gain = effectsUtility(catalog, folk, def.effects, def.duration);
      const p = guessAccept(world, folk, other, def);
      let utility = gain * (0.4 + 0.6 * p) * mood * fresh * wishTalkPull(catalog, folk, other.id, def);
      if (!knows(world, folk.id, other.id)) utility += MEET_BONUS;
      const score = utility / (1 + DISTANCE_COST * path.length);
      options.push({ otherId: other.id, socialId: def.id, score, distance: path.length });
    }
  }
  return options;
}

function objectDefIdOf(world: World, id: number | undefined): string {
  return world.objects.find((o) => o.id === id)?.defId ?? '';
}

/** Todas as opções autônomas alcançáveis, da melhor para a pior. */
export function scoreOptions(world: World, catalog: Catalog, folk: Folk, nav: Nav): Option[] {
  const options: Option[] = [];
  // vontade de cuidar da casa (traço e humor); visita não faxina
  const drive = careDrive(catalog, folk, moodOf(catalog, folk.needs)) * wishTidyPull(catalog, folk);
  // bloco 6: perto da hora de deitar (turno amanhã), a cama chama
  const bedtime = sleepPressure(catalog, folk, world.tick);
  for (const obj of world.objects) {
    const def = catalog.objects[obj.defId];
    if (!def) continue;
    const visitor = folk.visit !== null;
    const care =
      drive > 0
        ? def.interactions.filter((it) => it.care && !it.hidden && careAvailable(obj, it) && objectCareScore(obj, it) > 0 && kidAllows(folk, it))
        : [];
    const auto = def.interactions.filter(
      (it) =>
        it.autonomous !== false &&
        // bloco 9: ligar para um amigo é especial, mas qualquer um faz sozinho
        (!it.special || it.special === 'call') &&
        !it.care &&
        !it.hidden &&
        // bloco 11: criança não cozinha no fogão; brinquedo de criança é só dela
        kidAllows(folk, it) &&
        canUse(world, obj, it) &&
        (it.cost ?? 0) <= world.household.funds &&
        !(visitor && (it.residentOnly || (it.cost ?? 0) > 0)) &&
        (it.autoBelow === undefined || !it.until || folk.needs[it.until] < it.autoBelow || (bedtime > 0 && isSleep(it))) &&
        // bloco 6: de mau humor, nem por conta própria o folk pega no pesado
        refusal(catalog, folk, it, world.tick) === null,
    );
    if (auto.length === 0 && care.length === 0) continue;
    if (objectUsers(world, obj.id, folk) >= (def.slots ?? 1)) continue;
    const path = findPathToAny(nav, folk, useTiles(world, nav, obj, def));
    if (!path) continue;
    for (const it of auto) {
      // bloco 4: o objeto melhor puxa mais; atividade a dois com alguém já jogando também
      // bloco 5: o temperamento puxa para o que combina (malhar, pintar, ler)
      let utility = interactionUtility(catalog, folk, it) * TIER_PULL[tierOf(def)] * temperPull(folk, it) * wishPull(catalog, folk, it);
      if (it.duo) utility += joinUtility(world, catalog, folk, obj.id, it);
      if (bedtime > 0 && isSleep(it)) utility = (utility + BEDTIME_BONUS * bedtime) * (1 + bedtime);
      // ninguém pega no sono apertado para ir ao banheiro ou morto de fome (a não ser caindo de sono)
      if (isSleep(it) && folk.needs.energy > RESTLESS_ENERGY && (folk.needs.bladder < RESTLESS_BELOW || folk.needs.hunger < RESTLESS_BELOW)) {
        utility *= 0.15;
      }
      const score = utility / (1 + DISTANCE_COST * path.length);
      options.push({ objectId: obj.id, interactionId: it.id, score, distance: path.length });
    }
    for (const it of care) {
      const score = (objectCareScore(obj, it) * drive) / (1 + DISTANCE_COST * path.length);
      options.push({ objectId: obj.id, interactionId: it.id, score, distance: path.length });
    }
  }
  if (drive > 0) {
    for (const mess of world.mess) {
      if (messTaken(world, mess.id, folk)) continue;
      const path = findPathToAny(nav, folk, messTiles(world, nav, mess));
      if (!path) continue;
      const score = (messScore(mess, world.tick) * drive) / (1 + DISTANCE_COST * path.length);
      options.push({ messId: mess.id, score, distance: path.length });
    }
  }
  // bloco 2: comida acabando, feira de sábado, contas na caixa de correio
  for (const h of houseOptions(world, catalog, folk)) {
    const obj = world.objects.find((o) => o.id === h.objectId);
    const def = obj && catalog.objects[obj.defId];
    if (!obj || !def || objectUsers(world, obj.id, folk) >= (def.slots ?? 1)) continue;
    if (world.folks.some((f) => f !== folk && f.queue.some((a) => a.objectId === obj.id && a.interactionId === h.interactionId))) {
      continue; // alguém da casa já vai resolver
    }
    const path = findPathToAny(nav, folk, useTiles(world, nav, obj, def));
    if (!path) continue;
    const score = h.score / (1 + DISTANCE_COST * path.length);
    options.push({ objectId: obj.id, interactionId: h.interactionId, serviceId: h.serviceId, score, distance: path.length });
  }
  options.push(...scoreSocialOptions(world, catalog, folk, nav));
  // ordenação estável e determinística
  options.sort(
    (a, b) =>
      b.score - a.score ||
      (a.objectId ?? 0) - (b.objectId ?? 0) ||
      (a.otherId ?? 0) - (b.otherId ?? 0) ||
      (a.messId ?? 0) - (b.messId ?? 0) ||
      (a.interactionId ?? a.socialId ?? '').localeCompare(b.interactionId ?? b.socialId ?? ''),
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
