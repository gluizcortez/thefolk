import { MINUTES_PER_DAY } from './clock';
import { NEED_MAX, clampNeed } from './needs';
import { relationOf } from './relations';
import { SKILL_AXIS, axisPull } from './temper';
import type { Catalog, Folk, InteractionDef, ObjectCategory, SocialDef, TemperAxis, Wish, WishDef, World } from './types';
import { MAX_SPARK, hashFloat, isEffort, setThought } from './will';

// Bloco 6: desejos do dia. Pela manhã cada morador sorteia até três desejos
// pequenos (pelo temperamento e pelos traços); cumprir dá humor e ânimo.

export const MAX_WISHES = 3;
/** hora em que os desejos do dia são sorteados (quem acorda depois sorteia ao acordar) */
export const WISH_HOUR = 6;
/** diversão a mais quando um desejo se cumpre */
export const WISH_FUN = 15;
/** e conforto */
export const WISH_COMFORT = 6;
/** quanto mais a IA procura o que cumpre um desejo */
export const WISH_PULL = 1.5;
/** habilidades que um desejo de treino pode pedir, por desejo */
export const WISH_SKILLS: Record<string, string[]> = {
  sweat: ['fitness'],
  learn: ['logic', 'creativity', 'charisma', 'cooking', 'handiness'],
};

type Logger = (key: string, params?: Record<string, string | number>) => void;

/** Peso de um desejo para este folk (temperamento e traços). */
export function wishWeight(def: WishDef, folk: Folk): number {
  let w = def.weight;
  for (const [axis, k] of Object.entries(def.temper ?? {})) w *= Math.max(0.1, 1 + (k ?? 0) * axisPull(folk.temper, axis as TemperAxis));
  for (const t of folk.traits) w *= def.traits?.[t] ?? 1;
  return w;
}

/** Interações que existem na casa agora (para não pedir o que não dá para fazer). */
function houseInteractions(world: World, catalog: Catalog): InteractionDef[] {
  const out: InteractionDef[] = [];
  for (const o of world.objects) {
    const def = catalog.objects[o.defId];
    if (def && !o.state?.broken) out.push(...def.interactions);
  }
  return out;
}

/** Quem serve de alvo para um desejo de conversa (o mais querido entre os possíveis). */
function talkTarget(world: World, def: WishDef, folk: Folk, roll: number): number | null {
  const options: { id: number; score: number }[] = [];
  const consider = (id: number) => {
    if (id === folk.id) return;
    const rel = relationOf(world, folk.id, id);
    if (def.romance) {
      if (!rel || !(rel.dating || rel.romance >= 20)) return;
    } else if (!world.folks.some((f) => f.id === id && !f.visit) && (!rel || rel.friendship < 15)) {
      return; // vizinho só se já for chegado
    }
    options.push({ id, score: (rel?.friendship ?? 0) + (rel?.dating ? 40 : 0) + 30 });
  };
  for (const f of world.folks) if (!f.visit) consider(f.id);
  for (const n of world.neighbors) if (!n.service) consider(n.id);
  if (options.length === 0) return null;
  options.sort((a, b) => b.score - a.score || a.id - b.id);
  const top = options.slice(0, 3);
  return top[Math.floor(roll * top.length)].id;
}

/** Monta um desejo concreto (com alvo e habilidade), ou null se não dá hoje. */
function makeWish(world: World, catalog: Catalog, def: WishDef, folk: Folk, roll: number): Omit<Wish, 'id'> | null {
  const base = { defId: def.id, progress: 0, done: false };
  switch (def.kind) {
    case 'talk': {
      const other = talkTarget(world, def, folk, roll);
      return other === null ? null : { ...base, other };
    }
    case 'use': {
      const its = houseInteractions(world, catalog);
      return its.some((it) => def.interactions?.includes(it.id)) ? base : null;
    }
    case 'skill': {
      const its = houseInteractions(world, catalog).filter(isEffort);
      const skills = (WISH_SKILLS[def.id] ?? []).filter((s) => its.some((it) => it.skill?.id === s));
      if (skills.length === 0) return null;
      // o temperamento puxa para a habilidade que combina
      const weighted = skills.map((s) => {
        const link = SKILL_AXIS[s];
        return { s, w: link ? Math.max(0.2, 1 + link.sign * axisPull(folk.temper, link.axis)) : 1 };
      });
      const total = weighted.reduce((a, b) => a + b.w, 0);
      let r = roll * total;
      for (const x of weighted) {
        r -= x.w;
        if (r <= 0) return { ...base, skill: x.s };
      }
      return { ...base, skill: weighted[weighted.length - 1].s };
    }
    case 'buy': {
      const prices = Object.values(catalog.objects)
        .filter((o) => o.category === def.category && o.buyable !== false)
        .map((o) => o.price);
      return prices.length > 0 && world.household.funds >= Math.min(...prices) ? base : null;
    }
    case 'host': {
      const phone = houseInteractions(world, catalog).some((it) => it.special === 'invite');
      const friend = world.neighbors.some((n) => !n.service && (relationOf(world, folk.id, n.id)?.friendship ?? -1) >= 0);
      return phone && friend ? base : null;
    }
    case 'tidy':
      return base;
  }
}

/** Sorteia os desejos do dia (os de ontem que sobraram somem). */
export function rollWishes(world: World, catalog: Catalog, folk: Folk): void {
  const day = Math.floor(world.tick / MINUTES_PER_DAY);
  folk.wishDay = day;
  folk.wishes = [];
  const pool = Object.values(catalog.wishes).map((def) => ({ def, w: wishWeight(def, folk) }));
  let salt = 100;
  while (folk.wishes.length < MAX_WISHES && pool.length > 0) {
    const total = pool.reduce((s, p) => s + p.w, 0);
    let r = hashFloat(world, day, folk.id, salt++) * total;
    let i = 0;
    for (; i < pool.length - 1; i++) {
      r -= pool[i].w;
      if (r <= 0) break;
    }
    const { def } = pool.splice(i, 1)[0];
    const wish = makeWish(world, catalog, def, folk, hashFloat(world, day, folk.id, salt++));
    if (wish) folk.wishes.push({ id: world.nextId++, ...wish });
  }
}

/** Hora de sortear os desejos? (manhã de um dia novo, ou nunca sorteou) */
export function wishesDue(folk: Folk, tick: number): boolean {
  if (folk.visit) return false;
  const day = Math.floor(tick / MINUTES_PER_DAY);
  if (folk.wishDay < 0) return true;
  return folk.wishDay < day && tick % MINUTES_PER_DAY >= WISH_HOUR * 60;
}

/** Soma progresso num desejo e, se completou, dá a recompensa. */
function advance(world: World, catalog: Catalog, log: Logger, folk: Folk, wish: Wish, amount: number): void {
  const def = catalog.wishes[wish.defId];
  if (!def || wish.done) return;
  wish.progress += amount;
  if (wish.progress < def.amount) return;
  wish.done = true;
  folk.needs.fun = clampNeed(folk.needs.fun + WISH_FUN);
  folk.needs.comfort = clampNeed(Math.min(NEED_MAX, folk.needs.comfort + WISH_COMFORT));
  folk.spark = Math.min(MAX_SPARK, folk.spark + 1);
  setThought(folk, 'wish', def.icon, world.tick, 8);
  log('log.wishDone', { name: folk.name, wish: def.label, ...wishParams(world, catalog, wish) });
  if (folk.wishes.length === MAX_WISHES && folk.wishes.every((w) => w.done)) {
    folk.spark = Math.min(MAX_SPARK, folk.spark + 1);
    log('log.allWishes', { name: folk.name });
  }
}

/** Parâmetros do texto de um desejo: com quem, que habilidade, que categoria. */
export function wishParams(world: World, catalog: Catalog, wish: Wish): Record<string, string> {
  const def = catalog.wishes[wish.defId];
  const out: Record<string, string> = {};
  if (wish.other !== undefined) {
    out.other =
      world.folks.find((f) => f.id === wish.other)?.name ?? world.neighbors.find((n) => n.id === wish.other)?.name ?? '?';
  }
  if (wish.skill) out.skill = catalog.skills[wish.skill]?.name ?? wish.skill;
  if (def?.category) out.category = `cat.${def.category}`;
  return out;
}

/** Um minuto usando uma interação. */
export function wishOnUse(world: World, catalog: Catalog, log: Logger, folk: Folk, it: InteractionDef): void {
  for (const w of folk.wishes) {
    if (w.done) continue;
    const def = catalog.wishes[w.defId];
    if (!def) continue;
    if (def.kind === 'use' && def.interactions?.includes(it.id)) advance(world, catalog, log, folk, w, 1);
    else if (def.kind === 'skill' && !it.care && it.skill?.id === w.skill) advance(world, catalog, log, folk, w, 1);
  }
}

/** Uma conversa terminou (aceita ou não). */
export function wishOnTalk(world: World, catalog: Catalog, log: Logger, folk: Folk, otherId: number, social: SocialDef, ok: boolean): void {
  if (!ok) return;
  for (const w of folk.wishes) {
    const def = catalog.wishes[w.defId];
    if (w.done || def?.kind !== 'talk' || w.other !== otherId) continue;
    if ((def.socials ?? ['friendly']).includes(social.category)) advance(world, catalog, log, folk, w, 1);
  }
}

/** Arrumou uma bagunça, limpou ou consertou algo. */
export function wishOnTidy(world: World, catalog: Catalog, log: Logger, folk: Folk): void {
  for (const w of folk.wishes) if (!w.done && catalog.wishes[w.defId]?.kind === 'tidy') advance(world, catalog, log, folk, w, 1);
}

/** A casa comprou um objeto: quem queria algo dessa categoria fica contente. */
export function wishOnBuy(world: World, catalog: Catalog, log: Logger, category: ObjectCategory): void {
  for (const folk of world.folks) {
    if (folk.visit) continue;
    for (const w of folk.wishes) {
      const def = catalog.wishes[w.defId];
      if (!w.done && def?.kind === 'buy' && def.category === category) advance(world, catalog, log, folk, w, 1);
    }
  }
}

/** Uma visita convidada por este folk chegou. */
export function wishOnHost(world: World, catalog: Catalog, log: Logger, host: Folk): void {
  for (const w of host.wishes) if (!w.done && catalog.wishes[w.defId]?.kind === 'host') advance(world, catalog, log, host, w, 1);
}

/** Quanto a IA puxa para esta interação por causa de um desejo aberto. */
export function wishPull(catalog: Catalog, folk: Folk, it: InteractionDef): number {
  for (const w of folk.wishes) {
    if (w.done) continue;
    const def = catalog.wishes[w.defId];
    if (def?.kind === 'use' && def.interactions?.includes(it.id)) return WISH_PULL;
    if (def?.kind === 'skill' && !it.care && it.skill?.id === w.skill) return WISH_PULL;
  }
  return 1;
}

/** Puxão para conversar com alguém que está nos desejos. */
export function wishTalkPull(catalog: Catalog, folk: Folk, otherId: number, social: SocialDef): number {
  for (const w of folk.wishes) {
    const def = catalog.wishes[w.defId];
    if (!w.done && def?.kind === 'talk' && w.other === otherId && (def.socials ?? ['friendly']).includes(social.category)) {
      return WISH_PULL + 0.3;
    }
  }
  return 1;
}

/** Puxão para arrumar a casa quando há desejo de faxina. */
export function wishTidyPull(catalog: Catalog, folk: Folk): number {
  return folk.wishes.some((w) => !w.done && catalog.wishes[w.defId]?.kind === 'tidy') ? WISH_PULL : 1;
}
