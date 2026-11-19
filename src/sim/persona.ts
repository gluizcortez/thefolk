// Plano 2, bloco 10: o jeito de cada folk. Traços (até cinco no adulto, menos
// na criança, com pares proibidos), sonho de vida, pontos de satisfação e
// benefícios, gostos (comida, música, cor) e voz. Só regras puras; os dados
// ficam em data/traits.ts, data/dreams.ts e data/perks.ts.

import { MINUTES_PER_DAY } from './clock';
import { ensembleOf, pieceStyle } from './clothes';
import type { Ensemble } from './clothes';
import { childrenOf, stageOf } from './life';
import { relationOf } from './relations';
import { MAX_SKILL_LEVEL, skillLevel } from './skills';
import { TEMPER_AXES } from './temper';
import type {
  Age,
  Catalog,
  DreamDef,
  Folk,
  LifeStage,
  Temper,
  TraitDef,
  TraitMood,
  TraitMoodWhen,
  World,
} from './types';
import { roomAt, roomsOf } from './rooms';

const clampNeed = (v: number) => (v < 0 ? 0 : v > 100 ? 100 : v);

// ---------- traços ----------

/** Quantos traços cabem em cada fase (o resto vem ao crescer). */
export const TRAIT_SLOTS: Record<LifeStage, number> = { baby: 1, child: 3, teen: 4, adult: 5, elder: 5 };

export function traitSlots(age: Age | undefined): number {
  return TRAIT_SLOTS[stageOf({ age })];
}

/** Pares que não podem vir juntos (um desfaz o outro). */
export const TRAIT_CLASHES: [string, string][] = [
  ['caprichoso', 'desleixado'],
  ['tagarela', 'reservado'],
  ['caseiro', 'agitado'],
  ['gentil', 'esquentado'],
  ['madrugador', 'coruja'],
  ['atletico', 'molenga'],
  ['pe_no_chao', 'avoado'],
  ['medroso', 'destemido'],
  ['sortudo', 'desastrado'],
  ['festeiro', 'reservado'],
  ['gentil', 'ranzinza'],
  ['faz_tudo', 'desastrado'],
  ['caseiro', 'bicho_do_mato'],
  ['festeiro', 'ranzinza'],
];

/** Traços que não podem vir juntos. */
export function traitsClash(a: string, b: string): boolean {
  return TRAIT_CLASHES.some(([x, y]) => (x === a && y === b) || (x === b && y === a));
}

/** Por que não dá para pôr este traço (null = dá). */
export type TraitBlock = 'have' | 'full' | 'clash' | 'grown' | 'unknown';

export function traitBlock(catalog: Pick<Catalog, 'traits'>, traits: readonly string[], id: string, age: Age | undefined): TraitBlock | null {
  const def = catalog.traits[id];
  if (!def) return 'unknown';
  if (traits.includes(id)) return 'have';
  if (def.grown && (age === 'baby' || age === 'child')) return 'grown';
  if (traits.some((t) => traitsClash(t, id))) return 'clash';
  if (traits.length >= traitSlots(age)) return 'full';
  return null;
}

/** Lista de traços válida para a idade (sem repetido, sem par proibido, sem passar do limite). */
export function traitsProblem(catalog: Pick<Catalog, 'traits'>, traits: readonly string[], age: Age | undefined): TraitBlock | null {
  const seen: string[] = [];
  for (const t of traits) {
    const why = traitBlock(catalog, seen, t, age);
    if (why) return why;
    seen.push(t);
  }
  return null;
}

/** Quanto o traço combina com um temperamento (soma do puxão de cada eixo pelo quanto o eixo está marcado). */
export function traitFit(def: TraitDef, temper: Temper): number {
  let s = 0;
  for (const a of TEMPER_AXES) s += (def.temper?.[a] ?? 0) * (temper[a] - 5);
  return s;
}

function hashStr(s: string, seed: number): number {
  let h = (seed | 0) ^ 0x811c9dc5;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return (h >>> 0) / 4294967296;
}

/**
 * Completa a lista de traços até o limite da idade. Primeiro os que combinam
 * com o temperamento (a conversão dos eixos do bloco 5), depois os que têm
 * `bonus` (o que a criação puxou), por fim um sorteio fixo pela semente.
 */
export function completeTraits(
  catalog: Pick<Catalog, 'traits'>,
  have: readonly string[],
  temper: Temper,
  age: Age | undefined,
  seed: number,
  bonus: Record<string, number> = {},
  fill = true,
): string[] {
  const out = have.filter((t, i) => catalog.traits[t] && have.indexOf(t) === i);
  // quem tinha mais do que cabe (criança com traço de adulto) perde os que não cabem
  const kept: string[] = [];
  for (const t of out) if (!traitBlock(catalog, kept, t, age)) kept.push(t);
  const ranked = Object.values(catalog.traits)
    .map((def) => ({ id: def.id, score: traitFit(def, temper) + (bonus[def.id] ?? 0), roll: hashStr(def.id, seed) }))
    .sort((a, b) => b.score - a.score || a.roll - b.roll);
  for (const r of ranked) {
    if (kept.length >= traitSlots(age)) break;
    if (r.score <= 0) break;
    if (!traitBlock(catalog, kept, r.id, age)) kept.push(r.id);
  }
  if (fill) {
    for (const r of [...ranked].sort((a, b) => a.roll - b.roll)) {
      if (kept.length >= traitSlots(age)) break;
      if (!traitBlock(catalog, kept, r.id, age)) kept.push(r.id);
    }
  }
  return kept;
}

/**
 * Quem cresce ganha os traços que faltam para a idade nova, de acordo com
 * como foi criado: o temperamento (que já pegou o jeito de quem cuidou), os
 * traços de quem mais cuidou e as habilidades que mais treinou.
 */
export function growTraits(world: World, catalog: Pick<Catalog, 'traits'>, folk: Folk): string[] {
  const bonus: Record<string, number> = {};
  const cares = folk.kid?.cares ?? {};
  const givers = Object.entries(cares)
    .sort((a, b) => b[1] - a[1] || Number(a[0]) - Number(b[0]))
    .slice(0, 2)
    .map(([id]) => world.folks.find((f) => f.id === Number(id)) ?? world.neighbors.find((n) => n.id === Number(id)));
  for (const p of folk.parents ?? folk.kid?.parents ?? []) {
    const who = world.folks.find((f) => f.id === p) ?? world.neighbors.find((n) => n.id === p);
    if (who && !givers.includes(who)) givers.push(who);
  }
  for (const g of givers) for (const t of g?.traits ?? []) bonus[t] = (bonus[t] ?? 0) + 3;
  for (const def of Object.values(catalog.traits)) {
    for (const [skill, k] of Object.entries(def.skills ?? {})) {
      if (k > 1) bonus[def.id] = (bonus[def.id] ?? 0) + skillLevel(folk, skill) * 2;
    }
  }
  const before = folk.traits;
  folk.traits = completeTraits(catalog, before, folk.temper, folk.age, folk.id * 31 + world.tick, bonus);
  return folk.traits.filter((t) => !before.includes(t));
}

/** Produto de um multiplicador numérico dos traços. */
export function traitProduct(catalog: Pick<Catalog, 'traits'>, traits: readonly string[], key: 'luck' | 'work' | 'scare'): number {
  let m = 1;
  for (const t of traits) m *= catalog.traits[t]?.[key] ?? 1;
  return m;
}

/** Quanto os traços (e o benefício de aprender rápido) multiplicam o treino de uma habilidade. */
export function traitTraining(catalog: Pick<Catalog, 'traits'>, folk: Pick<Folk, 'traits' | 'perks'>, skill: string): number {
  let m = 1;
  for (const t of folk.traits) m *= catalog.traits[t]?.skills?.[skill] ?? 1;
  if (folk.perks?.includes('quickStudy')) m *= QUICK_STUDY;
  return m;
}

/** Pontos a mais na nota do prato (traços e benefício de cozinheiro). */
export function cookBonus(catalog: Pick<Catalog, 'traits'>, folk: Pick<Folk, 'traits' | 'perks'>): number {
  let b = 0;
  for (const t of folk.traits) b += catalog.traits[t]?.cook ?? 0;
  if (folk.perks?.includes('chef')) b += CHEF_BONUS;
  return b;
}

/**
 * Relógio do corpo: o madrugador cansa menos de manhã e mais tarde da
 * noite; a coruja ao contrário. Multiplica o gasto de energia.
 */
export function clockEnergy(catalog: Pick<Catalog, 'traits'>, folk: Pick<Folk, 'traits'>, tick: number): number {
  const hour = Math.floor((tick % MINUTES_PER_DAY) / 60);
  let m = 1;
  for (const t of folk.traits) {
    const c = catalog.traits[t]?.clock;
    if (c === 'lark') m *= hour >= 5 && hour < 12 ? 0.75 : hour >= 22 || hour < 4 ? 1.3 : 1;
    if (c === 'owl') m *= hour >= 20 || hour < 3 ? 0.75 : hour >= 6 && hour < 11 ? 1.3 : 1;
  }
  return m;
}

// ---------- humor dos traços e dos gostos ----------

/** Com quanto dinheiro a casa conta como folgada (e abaixo de quanto, apertada). */
export const RICH_FUNDS = 8000;
export const BROKE_FUNDS = 300;
/** De quantos em quantos minutos o humor dos traços é olhado (o efeito vem somado). */
export const MOOD_EVERY = 10;
/** Diversão a mais por minuto vestindo a cor favorita. */
export const FAV_COLOR_FUN = 0.015;
/** Diversão ao comer o prato favorito. */
export const FAV_FOOD_FUN = 12;

export interface MoodHit {
  trait: string;
  mood: TraitMood;
}

/** Peças vestidas agora. */
function wornNow(folk: Folk): Ensemble {
  return ensembleOf(folk, folk.outfit ?? 'day');
}

/** O folk está vestindo a cor favorita em alguma peça. */
export function wearsFavorite(folk: Folk): boolean {
  const color = folk.tastes?.color;
  if (!color || folk.age === 'baby') return false;
  for (const p of Object.values(wornNow(folk))) {
    if (!p) continue;
    for (const part of Object.values(pieceStyle(p))) if (part.color === color) return true;
  }
  return false;
}

/** As situações de agora que algum traço sente. */
export function moodSituations(world: World, catalog: Catalog, folk: Folk): Set<TraitMoodWhen> {
  const out = new Set<TraitMoodWhen>();
  const hour = Math.floor((world.tick % MINUTES_PER_DAY) / 60);
  const act = folk.queue[0];
  const using = act?.phase === 'using' && act.objectId !== undefined ? world.objects.find((o) => o.id === act.objectId) : undefined;
  const useDef = using ? catalog.objects[using.defId] : undefined;
  const it = useDef && act ? useDef.interactions.find((i) => i.id === act.interactionId) : undefined;
  if (folk.away) {
    if (!folk.away.school) out.add('working');
    return out;
  }
  if (act?.kind === 'use' && it?.task) out.add('working');
  const asleep = act?.phase === 'using' && !!it && (it.id === 'sleep' || it.id === 'nap');
  if (!asleep) {
    if (hour >= 5 && hour < 10) out.add('morning');
    if (hour >= 22 || hour < 3) out.add('night');
  }
  const room = roomAt(roomsOf(world, catalog), folk.x, folk.y);
  out.add(room && !room.outdoor ? 'indoors' : 'outdoors');
  if (folk.needs.hygiene >= 80) out.add('clean');
  if (world.mess.filter((m) => m.kind !== 'meal').length >= 3) out.add('messy');
  if (world.household.funds >= RICH_FUNDS) out.add('rich');
  if (world.household.funds < BROKE_FUNDS) out.add('broke');
  let near = 0;
  let far = true;
  let kids = false;
  for (const f of world.folks) {
    if (f === folk || f.away) continue;
    const d = Math.abs(f.x - folk.x) + Math.abs(f.y - folk.y);
    if (d <= 4 && f.age !== 'baby') near++;
    if (d <= 6) far = false;
    if (d <= 5 && (f.age === 'child' || f.age === 'baby')) kids = true;
  }
  if (near >= 3) out.add('crowd');
  if (far) out.add('alone');
  if (kids) out.add('kids');
  if (it && useDef?.line === 'tv' && it.watch) out.add('tv');
  if (it?.hold === 'book' || it?.book) out.add('reading');
  for (const o of world.objects) {
    if (!o.tune || o.state?.broken) continue;
    if (Math.abs(o.x - folk.x) + Math.abs(o.y - folk.y) <= 6) {
      out.add('music');
      break;
    }
  }
  return out;
}

/** O que os traços sentem agora. */
export function traitMoods(world: World, catalog: Catalog, folk: Folk): MoodHit[] {
  const sits = moodSituations(world, catalog, folk);
  const out: MoodHit[] = [];
  for (const t of folk.traits) {
    for (const mood of catalog.traits[t]?.moods ?? []) if (sits.has(mood.when)) out.push({ trait: t, mood });
  }
  return out;
}

/** Um passo do humor dos traços e da cor favorita (efeito de MOOD_EVERY minutos). */
export function stepTraitMoods(world: World, catalog: Catalog, folk: Folk): void {
  if (folk.visit || folk.age === 'baby') return;
  for (const { mood } of traitMoods(world, catalog, folk)) {
    if (mood.fun) folk.needs.fun = clampNeed(folk.needs.fun + mood.fun * MOOD_EVERY);
    if (mood.comfort) folk.needs.comfort = clampNeed(folk.needs.comfort + mood.comfort * MOOD_EVERY);
    if (mood.social) folk.needs.social = clampNeed(folk.needs.social + mood.social * MOOD_EVERY);
  }
  if (wearsFavorite(folk)) folk.needs.fun = clampNeed(folk.needs.fun + FAV_COLOR_FUN * MOOD_EVERY);
}

// ---------- sonho de vida ----------

export interface DreamProgress {
  have: number;
  need: number;
}

/** Quanto do sonho já foi. */
export function dreamProgress(world: World, catalog: Catalog, folk: Folk, def: DreamDef): DreamProgress {
  const need = def.amount;
  switch (def.goal) {
    case 'careerTop': {
      const job = folk.job;
      const career = job ? catalog.careers[job.careerId] : undefined;
      const retired = folk.retired && folk.retired.level >= 0 ? catalog.careers[folk.retired.careerId] : undefined;
      const atTop = (c: typeof career, level: number) => !!c && (!def.ref || c.id === def.ref) && level >= c.levels.length - 1;
      const top = atTop(career, job?.level ?? -1) || atTop(retired, folk.retired?.level ?? -1);
      const level = job && career && (!def.ref || career.id === def.ref) ? (job.level + 1) / career.levels.length : 0;
      return { have: top ? need : Math.min(need - 0.01, level * need), need };
    }
    case 'kids':
      return { have: childrenOf(world, folk.id).length, need };
    case 'friends': {
      let n = 0;
      for (const p of [...world.folks, ...world.neighbors]) {
        if (p.id !== folk.id && (relationOf(world, folk.id, p.id)?.friendship ?? 0) >= 50) n++;
      }
      return { have: n, need };
    }
    case 'skillsMax':
      return { have: Object.keys(folk.skills).filter((s) => skillLevel(folk, s) >= MAX_SKILL_LEVEL).length, need };
    case 'skillMax':
      return { have: Math.min(need, skillLevel(folk, def.ref ?? '')), need };
    case 'funds':
      return { have: Math.min(need, Math.max(0, world.household.funds)), need };
    case 'works': {
      const w = folk.works ?? {};
      return { have: Object.values(w).reduce((s, v) => s + (v ?? 0), 0), need };
    }
    case 'paintings':
      return { have: folk.works?.painting ?? 0, need };
    case 'married': {
      const spouse = [...world.folks, ...world.neighbors].find((p) => p.id !== folk.id && relationOf(world, folk.id, p.id)?.bond === 'married');
      const romance = spouse ? (relationOf(world, folk.id, spouse.id)?.romance ?? 0) : 0;
      return { have: spouse ? Math.min(need, romance) : 0, need };
    }
    case 'houseValue': {
      let v = 0;
      for (const o of world.objects) v += catalog.objects[o.defId]?.price ?? 0;
      return { have: Math.min(need, v), need };
    }
    default:
      return { have: 0, need };
  }
}

/** Sonhos que combinam com os traços (mais traços em comum primeiro). */
export function dreamsFor(catalog: Catalog, traits: readonly string[]): DreamDef[] {
  const all = Object.values(catalog.dreams ?? {});
  const score = (d: DreamDef) => d.traits.filter((t) => traits.includes(t)).length;
  return all.filter((d) => score(d) > 0).sort((a, b) => score(b) - score(a) || a.id.localeCompare(b.id));
}

/** Sonho que o folk ganha quando ninguém escolheu (o que mais combina). */
export function suggestDream(catalog: Catalog, traits: readonly string[]): string | undefined {
  return dreamsFor(catalog, traits)[0]?.id ?? Object.keys(catalog.dreams ?? {}).sort()[0];
}

type Logger = (key: string, params?: Record<string, string | number>) => void;

/** Olha se o sonho se realizou (uma vez por dia e quando a tela pede). Devolve true se realizou agora. */
export function checkDream(world: World, catalog: Catalog, log: Logger, folk: Folk): boolean {
  const d = folk.dream;
  if (!d || d.done !== undefined || folk.visit) return false;
  const def = catalog.dreams?.[d.id];
  if (!def) return false;
  const p = dreamProgress(world, catalog, folk, def);
  if (p.have < p.need) return false;
  d.done = world.tick;
  folk.points = (folk.points ?? 0) + def.reward;
  log('log.dreamDone', { name: folk.name, dream: def.name, points: def.reward });
  return true;
}

// ---------- pontos e benefícios ----------

/** Pontos de satisfação por desejo cumprido (e o bônus de cumprir os três). */
export const WISH_POINTS = 10;
export const ALL_WISHES_POINTS = 15;
/** efeitos dos benefícios */
export const QUICK_STUDY = 1.25;
export const CHEF_BONUS = 10;
export const PERK_DECAY: Record<string, Partial<Record<'energy' | 'hunger' | 'hygiene' | 'bladder', number>>> = {
  restful: { energy: 0.82 },
  ironStomach: { hunger: 0.8 },
  fresh: { hygiene: 0.75 },
  ironBladder: { bladder: 0.7 },
};
/** chance a mais de o outro topar, por benefício e tipo de conversa */
export const PERK_ACCEPT: Record<string, { category: 'friendly' | 'romantic'; bonus: number }> = {
  luckyLove: { category: 'romantic', bonus: 0.12 },
  charm: { category: 'friendly', bonus: 0.08 },
};

/** Plano 2, bloco 11: benefício que troca os traços uma vez (some quando é usado). */
export const NEW_LEAF = 'newLeaf';

export function hasPerk(folk: Pick<Folk, 'perks'>, id: string): boolean {
  return !!folk.perks?.includes(id);
}

/** Por que não dá para comprar (null = dá). */
export function perkProblem(catalog: Catalog, folk: Folk, perkId: string): 'unknown' | 'have' | 'points' | null {
  const def = catalog.perks?.[perkId];
  if (!def) return 'unknown';
  if (hasPerk(folk, perkId)) return 'have';
  if ((folk.points ?? 0) < def.cost) return 'points';
  return null;
}

/** Multiplicador de decaimento de uma necessidade pelos benefícios. */
export function perkDecay(folk: Pick<Folk, 'perks'>, need: string): number {
  let m = 1;
  for (const p of folk.perks ?? []) m *= PERK_DECAY[p]?.[need as 'energy'] ?? 1;
  return m;
}

// ---------- gostos e voz ----------

/** Pratos de casa que podem ser o favorito (ids de HOME_DISHES). */
export const FAVORITE_DISHES = ['toast', 'eggs', 'pasta', 'soup', 'pancakes', 'chickenrice', 'fishstew', 'palmpie'];
/** Estações de som que podem ser a favorita. */
export const FAVORITE_STATIONS = ['brisa', 'chiclete', 'trovao'];
/** Cores que podem ser a favorita (chaves de SWATCHES). */
export const FAVORITE_COLORS = ['red', 'blue', 'green', 'mustard', 'plum', 'brown', 'cream', 'white', 'grey', 'black', 'navy', 'teal', 'sky', 'olive', 'orange', 'rose'];
/** Tom de voz: 0 grave, 20 agudo. */
export const VOICE_MAX = 20;

/**
 * Gostos de quem nunca escolheu: a música sai do temperamento (o mesmo gosto
 * das estações do bloco 7), comida e cor de um sorteio fixo.
 */
export function defaultTastes(temper: Temper, seed: number): { food: string; music: string; color: string } {
  const music: Record<string, (t: Temper) => number> = {
    brisa: (t) => t.warmth + (10 - t.pep),
    chiclete: (t) => t.outgoing + t.wit,
    trovao: (t) => t.pep + (10 - t.order),
  };
  const best = FAVORITE_STATIONS.map((id) => ({ id, v: music[id](temper) + hashStr(id, seed) * 0.5 })).sort((a, b) => b.v - a.v)[0].id;
  return {
    food: FAVORITE_DISHES[Math.floor(hashStr('food', seed) * FAVORITE_DISHES.length)],
    music: best,
    color: FAVORITE_COLORS[Math.floor(hashStr('color', seed) * FAVORITE_COLORS.length)],
  };
}

/** Voz de quem nunca escolheu (fixa pela pessoa). */
export function defaultVoice(id: number): number {
  return Math.floor(hashStr('voice', id) * (VOICE_MAX + 1));
}
