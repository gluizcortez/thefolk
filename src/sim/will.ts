import { SCHOOL_ALARM_LEAD, nextSchoolCall } from './kids';
import { CALL_AHEAD, nextShift } from './career';
import { MINUTES_PER_DAY } from './clock';
import { NEED_MAX, moodOf } from './needs';
import { relKey } from './relations';
import { axisPull } from './temper';
import { DIRTY_AT, messSenseOf } from './upkeep';
import { isLitter } from './kitchen';
import type { Catalog, Folk, InteractionDef, NeedId, Thought, ThoughtKind, World } from './types';
import { NEED_IDS } from './types';

// Bloco 6: o humor manda. O folk recusa esforço quando está mal, mostra num
// balão o que pensa, planeja a hora de dormir para chegar inteiro ao turno e
// guarda ânimo para gastar num dia inspirado.

// ---------- sorte sem gastar o RNG do mundo ----------

/**
 * Número de 0 a 1 tirado de um hash (estado do RNG, tick, quem, para quê).
 * É determinístico e não anda o RNG do mundo, então balões e desejos não
 * mudam o resto da simulação.
 */
export function hashFloat(world: World, a: number, b: number, salt: number): number {
  let h = (world.rngState ^ Math.imul(a + 0x9e3779b9, 0x85ebca6b) ^ Math.imul(b + 0x632be5ab, 0xc2b2ae35) ^ Math.imul(salt, 0x27d4eb2f)) | 0;
  h = Math.imul(h ^ (h >>> 16), 0x7feb352d);
  h = Math.imul(h ^ (h >>> 15), 0x846ca68b);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

// ---------- sono ----------

export function isSleep(it: InteractionDef): boolean {
  return (it.effects.energy ?? 0) > 0 && it.pose === 'lie';
}

/** minutos antes do início do turno em que o despertador toca */
export const ALARM_LEAD = CALL_AHEAD + 60;
/** quanto a energia sobe por minuto de sono numa cama comum (líquido) */
const SLEEP_NET = 0.16;
/** começa a pesar este tanto de minutos antes da hora de deitar */
const BEDTIME_RAMP = 90;
/** sem turno amanhã: de madrugada também dá sono, mas de leve */
const NIGHT_PRESSURE = 0.35;

/** Tick em que o despertador toca antes do próximo turno (null = sem turno nas próximas 20 h). */
export function wakeTime(catalog: Catalog, folk: Folk, tick: number): number | null {
  // bloco 11: criança acorda para pegar o ônibus da escola
  // bloco 17: jovem também; com meio período, o despertador é o da escola (de manhã)
  if (folk.age === 'child' || folk.age === 'teen') {
    const call = nextSchoolCall(tick);
    if (call < 0) return null;
    const wake = call - SCHOOL_ALARM_LEAD;
    return wake - tick > 20 * 60 ? null : wake;
  }
  if (folk.age === 'baby') return null;
  const shift = nextShift(catalog, folk, tick);
  if (!shift) return null;
  const wake = shift.start - ALARM_LEAD;
  if (wake - tick > 20 * 60) return null;
  return wake;
}

/** Minutos de sono para encher a energia a partir de agora. */
export function sleepMinutes(folk: Folk): number {
  return Math.min(600, Math.ceil((NEED_MAX - 5 - folk.needs.energy) / SLEEP_NET) + 20);
}

/** Tick em que o folk deveria deitar para acordar descansado no turno (null = sem turno). */
export function bedtime(catalog: Catalog, folk: Folk, tick: number): number | null {
  const wake = wakeTime(catalog, folk, tick);
  if (wake === null) return null;
  return wake - sleepMinutes(folk);
}

/**
 * Vontade de ir dormir pelo relógio (0 a 1), além da energia: sobe nas 1h30
 * antes da hora planejada de deitar e fica em 1 até o despertador. Sem turno,
 * só um pouco de madrugada.
 */
export function sleepPressure(catalog: Catalog, folk: Folk, tick: number): number {
  if (folk.visit || folk.needs.energy >= 92) return 0;
  const wake = wakeTime(catalog, folk, tick);
  if (wake !== null) {
    if (tick >= wake) return 0;
    const bed = wake - sleepMinutes(folk);
    if (tick >= bed) return 1;
    if (tick >= bed - BEDTIME_RAMP) return (tick - (bed - BEDTIME_RAMP)) / BEDTIME_RAMP;
  }
  const hour = Math.floor((tick % MINUTES_PER_DAY) / 60);
  if ((hour >= 23 || hour < 5) && folk.needs.energy < 75) return NIGHT_PRESSURE;
  return 0;
}

// ---------- recusa ----------

/** humor abaixo disso o folk recusa esforço (com Pique 5) */
export const REFUSE_MOOD = 33;
/** necessidade do corpo abaixo disso: recusa e diz qual é */
export const REFUSE_NEED = 15;
const BODY_NEEDS: NeedId[] = ['hunger', 'energy', 'bladder', 'hygiene', 'comfort'];

/** Treinar, estudar e trabalhar por conta própria contam como esforço (comer e limpar, não). */
export function isEffort(it: InteractionDef): boolean {
  if (it.task) return true;
  if (!it.skill || it.care || it.skill.boosts) return false;
  return it.skill.xpPerMinute >= 0.8;
}

/** Abaixo de que humor o folk recusa: Pique alto aguenta mais, Pique baixo menos. */
export function refuseMood(folk: Folk): number {
  return REFUSE_MOOD - 10 * axisPull(folk.temper, 'pep');
}

/**
 * Por que o folk recusaria esta ordem agora: a necessidade do corpo mais
 * baixa, 'mood' (está de mau humor) ou null (topa). Quem está inspirado topa tudo.
 */
export function refusal(catalog: Catalog, folk: Folk, it: InteractionDef, tick: number): NeedId | 'mood' | null {
  if (folk.visit || !isEffort(it) || folk.inspired > tick) return null;
  let worst: NeedId | null = null;
  for (const id of BODY_NEEDS) {
    if (folk.needs[id] < REFUSE_NEED && (!worst || folk.needs[id] < folk.needs[worst])) worst = id;
  }
  if (worst) return worst;
  // plano 2, bloco 10: com o benefício "firme", o mau humor não faz recusar
  if (folk.perks?.includes('steady')) return null;
  return moodOf(catalog, folk.needs) < refuseMood(folk) ? 'mood' : null;
}

// ---------- balões ----------

/** Quanto cada tipo de balão pesa: um mais importante não é coberto por outro. */
const THOUGHT_RANK: Record<ThoughtKind, number> = { fear: 6, refuse: 5, alarm: 4, wish: 4, chat: 3, topic: 3, want: 2, mess: 1, miss: 1 };

/** O balão de agora (null se não há ou já passou). */
export function thoughtOf(folk: Folk, tick: number): Thought | null {
  const th = folk.thought;
  return th && th.until > tick ? th : null;
}

/** Põe um balão, se não houver outro mais importante. Devolve true se pôs. */
export function setThought(folk: Folk, kind: ThoughtKind, icon: string, tick: number, minutes: number, other?: number): boolean {
  const cur = thoughtOf(folk, tick);
  if (cur && cur !== null && THOUGHT_RANK[cur.kind] > THOUGHT_RANK[kind]) return false;
  folk.thought = { kind, icon, at: tick, until: tick + minutes };
  if (other !== undefined) folk.thought.other = other;
  return true;
}

/** De quantos em quantos minutos o folk pensa em algo para o balão */
export const THINK_EVERY = 20;
/** necessidade abaixo disso vira balão de vontade */
export const WANT_BELOW = 30;
/** distância (tiles) em que bagunça e sujeira incomodam */
const MESS_RADIUS = 4;
/** depois de tantos dias sem ver alguém querido, bate saudade */
export const MISS_AFTER_DAYS = 2;
const MISS_FRIENDSHIP = 40;

/**
 * Um momento de pensar (a cada THINK_EVERY minutos): uma necessidade
 * pedindo, a bagunça por perto ou saudade de alguém viram balão.
 */
export function think(world: World, catalog: Catalog, folk: Folk, busyWith?: InteractionDef): void {
  const tick = world.tick;
  if (folk.visit || folk.away || folk.collapsed > 0) return;
  if (thoughtOf(folk, tick)) return;
  // 1) a necessidade mais baixa, se não está cuidando dela
  let low: NeedId | null = null;
  for (const id of NEED_IDS) {
    if (id === 'ambience') continue;
    if (folk.needs[id] < WANT_BELOW && (!low || folk.needs[id] < folk.needs[low])) low = id;
  }
  if (low && !((busyWith?.effects[low] ?? 0) > 0) && hashFloat(world, tick, folk.id, 1) < 0.75) {
    setThought(folk, 'want', low, tick, 15);
    return;
  }
  // 2) bagunça e sujeira por perto (quem tem Ordem sente mais)
  let dirt = 0;
  for (const m of world.mess) if (isLitter(m, world.tick) && Math.abs(m.x - folk.x) + Math.abs(m.y - folk.y) <= MESS_RADIUS) dirt++;
  for (const o of world.objects) {
    if ((o.state?.dirt ?? 0) < DIRTY_AT && !(o.state?.broken ?? false)) continue;
    if (Math.abs(o.x - folk.x) + Math.abs(o.y - folk.y) <= MESS_RADIUS) dirt++;
  }
  if (dirt > 0 && hashFloat(world, tick, folk.id, 2) < Math.min(0.85, 0.18 * dirt * messSenseOf(catalog, folk))) {
    setThought(folk, 'mess', 'mess', tick, 15);
    return;
  }
  // 3) saudade de alguém querido que não aparece há dias
  const missed = missedOne(world, folk);
  if (missed !== null && hashFloat(world, tick, folk.id, 3) < 0.15 * (1 + axisPull(folk.temper, 'warmth') * 0.5)) {
    setThought(folk, 'miss', 'miss', tick, 20, missed);
  }
}

/** Alguém querido (amizade alta ou namoro) longe do lote há dias, ou null. */
export function missedOne(world: World, folk: Folk): number | null {
  const tick = world.tick;
  let best: { id: number; f: number } | null = null;
  const prefix = `${folk.id}>`;
  for (const [key, rel] of Object.entries(world.relations)) {
    if (!key.startsWith(prefix)) continue;
    if (rel.friendship < MISS_FRIENDSHIP && !rel.dating) continue;
    if (tick - rel.last < MISS_AFTER_DAYS * MINUTES_PER_DAY) continue;
    const id = Number(key.slice(prefix.length));
    const here = world.folks.find((f) => f.id === id);
    if (here && !here.away) continue;
    const score = rel.friendship + (rel.dating ? 50 : 0);
    if (!best || score > best.f) best = { id, f: score };
  }
  return best?.id ?? null;
}

/** A relação de `folk` com `other` existe? (atalho para a interface) */
export function relationKey(folk: Folk, otherId: number): string {
  return relKey(folk.id, otherId);
}

// ---------- ânimo e dia inspirado ----------

/** ânimo guardado no máximo */
export const MAX_SPARK = 9;
/** quanto ânimo custa um dia inspirado */
export const INSPIRE_COST = 3;
/** quanto dura o dia inspirado, em minutos */
export const INSPIRE_MINUTES = 4 * 60;
/** multiplicador do treino inspirado */
export const INSPIRED_TRAINING = 2;

export function isInspired(folk: Folk, tick: number): boolean {
  return folk.inspired > tick;
}

/** Problema para começar um dia inspirado (null = pode). */
export function inspireProblem(folk: Folk, tick: number): 'visitor' | 'noSpark' | 'already' | null {
  if (folk.visit) return 'visitor';
  if (isInspired(folk, tick)) return 'already';
  if (folk.spark < INSPIRE_COST) return 'noSpark';
  return null;
}

/** Gasta o ânimo e começa o dia inspirado. */
export function inspire(folk: Folk, tick: number): void {
  folk.spark -= INSPIRE_COST;
  folk.inspired = tick + INSPIRE_MINUTES;
}
