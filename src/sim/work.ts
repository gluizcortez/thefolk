import { careerOf, missingSkills, payFor } from './career';
import { MINUTES_PER_DAY } from './clock';
import { formatMoney } from './economy';
import type { Logger } from './gossip';
import { createNews, introduce, reputationOf, romanticAct } from './gossip';
import { clampNeed, moodOf } from './needs';
import type { Person } from './people';
import { personOf } from './people';
import { addMemory, applyDelta, relationOf, touch } from './relations';
import { nextFloat, nextInt } from './rng';
import { skillLevel } from './skills';
import type { CareerDef, Catalog, Folk, Job, WorkChoiceDef, WorkEventDef, WorkOutcome, World } from './types';

// O lado de dentro do trabalho: chefe e colegas de verdade, eventos do
// expediente com escolhas, pedido de aumento e troca de área.

/** minutos que o evento espera a escolha do jogador antes de o folk decidir sozinho */
export const EVENT_WAIT = 60;
/** chance de um turno ter um evento; e de ter um segundo */
export const EVENT_CHANCE = 0.85;
export const SECOND_EVENT_CHANCE = 0.3;
/** dias entre um pedido de aumento e outro */
export const RAISE_COOLDOWN = 3;
export const RAISE_STEP = 0.1;
export const MAX_RAISE = 0.5;
/** com o chefe vendo o folk assim, demite mesmo com desempenho razoável */
export const BOSS_FIRES_AT = -55;

/** Respeito do chefe necessário para chegar ao cargo `level` (índice). */
export function bossRespectFor(level: number): number {
  return level <= 0 ? -100 : 10 * level - 5;
}

/** Chefe da carreira, se houver alguém nesse posto. */
export function bossOf(world: World, careerId: string): Person | undefined {
  const n = world.neighbors.find((x) => x.boss && x.career?.id === careerId);
  return n ? personOf(world, n.id) : undefined;
}

/**
 * Colegas: vizinhos que trabalham na mesma carreira (fora o chefe) e
 * moradores com o mesmo emprego.
 */
export function coworkersOf(world: World, folk: Folk): Person[] {
  const careerId = folk.job?.careerId;
  if (!careerId) return [];
  const out: Person[] = [];
  for (const n of world.neighbors) {
    if (n.boss || n.career?.id !== careerId) continue;
    const p = personOf(world, n.id);
    if (p) out.push(p);
  }
  for (const f of world.folks) {
    if (f !== folk && !f.visit && f.job?.careerId === careerId) out.push(personOf(world, f.id)!);
  }
  return out;
}

/** Quanto as relações no trabalho pesam no turno: chefe e clima com os colegas. */
export function workRelationTerm(world: World, folk: Folk): number {
  const job = folk.job;
  if (!job) return 0;
  const boss = bossOf(world, job.careerId);
  const bossRespect = boss ? (relationOf(world, boss.id, folk.id)?.respect ?? 0) : 0;
  const mates = coworkersOf(world, folk);
  let mood = 0;
  for (const c of mates) mood += relationOf(world, c.id, folk.id)?.friendship ?? 0;
  const avg = mates.length ? mood / mates.length : 0;
  return Math.max(-6, Math.min(6, bossRespect / 20 + avg / 30));
}


/**
 * Quem troca de área leva parte da experiência: entra no cargo mais alto da
 * nova carreira que as habilidades permitem, até um abaixo do cargo atual.
 */
export function transferLevel(folk: Folk, from: Job | null, to: CareerDef): number {
  if (!from) return 0;
  const cap = Math.max(0, from.level - 1);
  let best = 0;
  for (let i = 1; i <= Math.min(cap, to.levels.length - 1); i++) {
    if (Object.keys(missingSkills(folk, to.levels[i])).length === 0) best = i;
  }
  return best;
}

/** Na primeira ida ao trabalho o folk conhece o chefe e os colegas. */
export function meetWorkplace(world: World, catalog: Catalog, log: Logger, folk: Folk): void {
  const job = folk.job;
  if (!job) return;
  const me = personOf(world, folk.id)!;
  const boss = bossOf(world, job.careerId);
  const first: string[] = [];
  if (boss && !relationOf(world, folk.id, boss.id)) {
    introduce(world, me, boss, 0, 0);
    first.push(boss.name);
  }
  for (const c of coworkersOf(world, folk)) {
    if (!relationOf(world, folk.id, c.id)) {
      introduce(world, me, c, 5, 0);
      first.push(c.name);
    }
  }
  if (first.length) {
    const place = careerOf(catalog, job)?.workplace ?? '';
    log('log.metWorkplace', { name: folk.name, people: first.join(', '), place });
  }
}

/**
 * Fim do turno: o convívio com os colegas rende um pouco de amizade, e o
 * chefe e os colegas veem como foi o turno (respeito sobe ou desce).
 */
export function workplaceShift(world: World, catalog: Catalog, folk: Folk, score: number): void {
  const job = folk.job;
  if (!job) return;
  const me = personOf(world, folk.id)!;
  const mates = coworkersOf(world, folk).filter((c) => !c.folk || c.folk.away);
  for (const c of mates) {
    applyDelta(world, catalog, me, c, { friendship: 1.5 });
    applyDelta(world, catalog, c, me, { friendship: 1.5, respect: score / 8 });
    touch(world, folk.id, c.id);
  }
  const boss = bossOf(world, job.careerId);
  if (boss && !boss.folk) {
    applyDelta(world, catalog, boss, me, { respect: score / 5 });
    touch(world, folk.id, boss.id);
  }
}

// ---------- eventos do expediente ----------

/** Eventos que podem acontecer com este folk agora, com o ator escolhido. */
export function eligibleEvents(world: World, catalog: Catalog, folk: Folk): { def: WorkEventDef; actorId: number }[] {
  const job = folk.job;
  if (!job) return [];
  const boss = bossOf(world, job.careerId);
  const mates = coworkersOf(world, folk).filter((c) => !c.folk || c.folk.away);
  const out: { def: WorkEventDef; actorId: number }[] = [];
  for (const def of Object.values(catalog.workEvents)) {
    if (def.chained) continue;
    if (def.careers && !def.careers.includes(job.careerId)) continue;
    if ((def.minLevel ?? 0) > job.level) continue;
    let pool: Person[] = [];
    if (def.actor === 'boss') pool = boss && !boss.folk ? [boss] : [];
    else if (def.actor === 'coworker') pool = mates;
    const req = def.requires;
    if (req) {
      pool = pool.filter((p) => {
        const f = relationOf(world, folk.id, p.id)?.friendship ?? 0;
        if (req.friendshipBelow !== undefined && f >= req.friendshipBelow) return false;
        if (req.friendshipAbove !== undefined && f <= req.friendshipAbove) return false;
        return true;
      });
    }
    if (def.actor !== 'none' && pool.length === 0) continue;
    const actorId = def.actor === 'none' ? 0 : pool[nextInt(world, pool.length)].id;
    out.push({ def, actorId });
  }
  return out;
}

/** Sorteia um evento para agora e o deixa esperando escolha. */
export function startWorkEvent(world: World, catalog: Catalog, log: Logger, folk: Folk): boolean {
  const away = folk.away;
  if (!away || away.event) return false;
  // bloco 8: uma consequência marcada vem antes de qualquer sorteio
  const chain = folk.job?.chain;
  if (chain && chain.day <= Math.floor(world.tick / MINUTES_PER_DAY) && catalog.workEvents[chain.defId]) {
    folk.job!.chain = null;
    const def = catalog.workEvents[chain.defId];
    const actorOk = def.actor === 'none' || (chain.actorId > 0 && personOf(world, chain.actorId));
    if (actorOk) {
      away.event = { defId: def.id, actorId: def.actor === 'none' ? 0 : chain.actorId, deadline: world.tick + EVENT_WAIT };
      log('log.workEvent', { name: folk.name });
      return true;
    }
  }
  const options = eligibleEvents(world, catalog, folk);
  if (!options.length) return false;
  const total = options.reduce((s, o) => s + (o.def.weight ?? 1), 0);
  let roll = nextFloat(world) * total;
  let pick = options[options.length - 1];
  for (const o of options) {
    roll -= o.def.weight ?? 1;
    if (roll <= 0) {
      pick = o;
      break;
    }
  }
  away.event = { defId: pick.def.id, actorId: pick.actorId, deadline: world.tick + EVENT_WAIT };
  log('log.workEvent', { name: folk.name });
  return true;
}

/** 'career' vira a primeira habilidade da carreira do folk. */
export function careerSkill(catalog: Catalog, folk: Folk, id: string | undefined): string | undefined {
  if (id !== 'career') return id;
  return folk.job ? careerOf(catalog, folk.job)?.skills[0] : undefined;
}

/** Chance de a escolha dar certo (1 quando não tem teste). */
export function choiceChance(world: World, catalog: Catalog, folk: Folk, choice: WorkChoiceDef, actorId: number): number {
  const c = choice.check;
  if (!c) return 1;
  let p = c.base;
  const skill = careerSkill(catalog, folk, c.skill);
  if (skill) p += (c.perLevel ?? 0.06) * skillLevel(folk, skill);
  if (c.mood) p += (moodOf(catalog, folk.needs) - 50) / 200;
  if (c.actorRespect && actorId) p += (relationOf(world, actorId, folk.id)?.respect ?? 0) / 200;
  return Math.max(0.05, Math.min(0.95, p));
}

/** O que o folk escolheria sozinho: pesa traços e a chance de dar certo. */
export function autoChoice(world: World, catalog: Catalog, folk: Folk, def: WorkEventDef, actorId: number): number {
  const weights = def.choices.map((ch) => {
    let w = 1;
    for (const t of folk.traits) w += ch.traits?.[t] ?? 0;
    w = Math.max(0.1, w);
    if (ch.check) w *= 0.4 + choiceChance(world, catalog, folk, ch, actorId);
    return w;
  });
  const total = weights.reduce((s, w) => s + w, 0);
  let roll = nextFloat(world) * total;
  for (let i = 0; i < weights.length; i++) {
    roll -= weights[i];
    if (roll <= 0) return i;
  }
  return weights.length - 1;
}

/** Aplica a escolha `index` do evento pendente. Devolve o resultado aplicado. */
export function resolveWorkEvent(
  world: World,
  catalog: Catalog,
  log: Logger,
  folk: Folk,
  index: number,
  auto: boolean,
): WorkOutcome | null {
  const pending = folk.away?.event;
  const def = pending && catalog.workEvents[pending.defId];
  const choice = def?.choices[index];
  if (!pending || !def || !choice || !folk.job) return null;
  folk.away!.event = null;
  const ok = nextFloat(world) < choiceChance(world, catalog, folk, choice, pending.actorId);
  const out = ok || !choice.fail ? choice.success : choice.fail;
  const me = personOf(world, folk.id)!;
  const actor = pending.actorId ? personOf(world, pending.actorId) : undefined;
  const job = folk.job;
  if (out.performance) job.performance = Math.max(-100, Math.min(100, job.performance + out.performance));
  if (actor) {
    if (out.actor) applyDelta(world, catalog, actor, me, out.actor);
    if (out.self) applyDelta(world, catalog, me, actor, out.self);
    if (out.memory?.self) addMemory(world, catalog, folk.id, actor.id, out.memory.self);
    if (out.memory?.actor) addMemory(world, catalog, actor.id, folk.id, out.memory.actor);
    touch(world, folk.id, actor.id);
  }
  if (out.boss) {
    const boss = bossOf(world, job.careerId);
    if (boss && boss.id !== actor?.id) applyDelta(world, catalog, boss, me, out.boss);
  }
  if (out.coworkers) {
    for (const c of coworkersOf(world, folk)) applyDelta(world, catalog, c, me, out.coworkers);
  }
  if (out.needs) for (const [id, v] of Object.entries(out.needs)) folk.needs[id as keyof Folk['needs']] = clampNeed(folk.needs[id as keyof Folk['needs']] + v);
  if (out.money) world.household.funds += out.money;
  const xpSkill = out.xp && careerSkill(catalog, folk, out.xp.id);
  if (out.xp && xpSkill) folk.skills[xpSkill] = (folk.skills[xpSkill] ?? 0) + out.xp.amount;
  // quem estava no trabalho viu: chefe e colegas
  const seen = [bossOf(world, job.careerId)?.id, ...coworkersOf(world, folk).map((c) => c.id)].filter(
    (x): x is number => x !== undefined,
  );
  if (out.news) {
    const about = out.newsAboutActor && actor ? actor.id : folk.id;
    const other = about === folk.id ? (actor?.id ?? 0) : folk.id;
    createNews(world, catalog, log, out.news, about, other, seen.filter((id) => id !== about && id !== other));
  }
  if (out.romantic && actor) romanticAct(world, catalog, log, folk.id, actor.id, seen);
  if (out.chain && catalog.workEvents[out.chain.event]) {
    job.chain = {
      defId: out.chain.event,
      actorId: pending.actorId,
      day: Math.floor(world.tick / MINUTES_PER_DAY) + out.chain.days,
    };
  }
  log(auto ? 'log.workAuto' : 'log.workResult', {
    name: folk.name,
    choice: choice.label,
    result: out.text,
    actor: actor?.name ?? '',
  });
  return out;
}

/** Sorteia quando cai o próximo evento do turno (ou -1). */
export function planEvent(world: World, from: number, until: number, chance: number): number {
  if (until - from < 90 || nextFloat(world) >= chance) return -1;
  return from + 30 + nextInt(world, Math.max(1, until - from - 90));
}

// ---------- aumento ----------

export function canAskRaise(folk: Folk, tick: number): boolean {
  const job = folk.job;
  if (!job || job.raisePending) return false;
  const day = Math.floor(tick / MINUTES_PER_DAY);
  return day - (job.lastRaiseDay ?? -99) >= RAISE_COOLDOWN && (job.raise ?? 0) < MAX_RAISE;
}

/** Chance de o chefe dar o aumento. */
export function raiseChance(world: World, folk: Folk): number {
  const job = folk.job;
  if (!job) return 0;
  const boss = bossOf(world, job.careerId);
  const respect = boss ? (relationOf(world, boss.id, folk.id)?.respect ?? 0) : 0;
  const p =
    0.15 +
    job.performance / 200 +
    respect / 150 +
    skillLevel(folk, 'charisma') * 0.04 +
    reputationOf(world, folk.id) / 400 -
    (job.raise ?? 0) * 0.6;
  return Math.max(0.03, Math.min(0.9, p));
}

/** Conversa do aumento com o chefe, no fim do turno. */
export function resolveRaise(world: World, catalog: Catalog, log: Logger, folk: Folk): boolean {
  const job = folk.job;
  if (!job?.raisePending) return false;
  job.raisePending = false;
  const boss = bossOf(world, job.careerId);
  const me = personOf(world, folk.id)!;
  const ok = nextFloat(world) < raiseChance(world, folk);
  if (ok) {
    job.raise = Math.min(MAX_RAISE, Math.round(((job.raise ?? 0) + RAISE_STEP) * 100) / 100);
    log('log.raiseYes', { name: folk.name, boss: boss?.name ?? '', pay: formatMoney(payFor(catalog, job)) });
  } else {
    job.performance = Math.max(-100, job.performance - 4);
    if (boss) {
      applyDelta(world, catalog, boss, me, { respect: -5 });
      addMemory(world, catalog, folk.id, boss.id, 'deniedRaise');
    }
    log('log.raiseNo', { name: folk.name, boss: boss?.name ?? '' });
  }
  return ok;
}

/**
 * O chefe barra a promoção? Devolve o respeito que falta (0 = libera).
 * Sem chefe no posto, ninguém barra.
 */
export function bossBlocks(world: World, folk: Folk, nextLevel: number): number {
  const job = folk.job;
  if (!job) return 0;
  const boss = bossOf(world, job.careerId);
  if (!boss) return 0;
  const respect = relationOf(world, boss.id, folk.id)?.respect ?? 0;
  return Math.max(0, Math.ceil(bossRespectFor(nextLevel) - respect));
}

/** O chefe não suporta mais o folk? */
export function bossFed(world: World, folk: Folk): boolean {
  const job = folk.job;
  if (!job || job.performance >= 20) return false;
  const boss = bossOf(world, job.careerId);
  return !!boss && (relationOf(world, boss.id, folk.id)?.respect ?? 0) <= BOSS_FIRES_AT;
}

/** Bloco 8: há uma consequência marcada para hoje (ou atrasada)? */
export function chainDue(folk: Folk, tick: number): boolean {
  const c = folk.job?.chain;
  return !!c && c.day <= Math.floor(tick / MINUTES_PER_DAY);
}

// ---------- bloco 8: a equipe muda ----------

/** chance por semana de um vizinho com emprego subir de cargo */
export const STAFF_PROMOTE = 0.22;
/** chance por semana de ser demitido (o chefe tem um pouco menos) */
export const STAFF_FIRE = 0.05;
export const BOSS_FIRE = 0.03;
/** chance por semana de quem está sem emprego arrumar um */
export const STAFF_HIRE = 0.5;

/**
 * Uma vez por semana a vida corre nos lugares de trabalho: colegas sobem de
 * cargo, alguém é mandado embora (e arruma outra coisa depois), e quando o
 * chefe cai o colega mais antigo assume. Moradores com emprego na área
 * ficam sabendo pelo registro.
 */
export function staffShuffle(world: World, catalog: Catalog, log: Logger): void {
  const careers = Object.keys(catalog.careers);
  const watching = (careerId: string) => world.folks.some((f) => !f.visit && f.job?.careerId === careerId);
  for (const n of world.neighbors) {
    if (n.service) continue;
    if (!n.career) {
      // vizinho sem emprego (que já trabalhou um dia) procura outro
      if (n.wasFired && nextFloat(world) < STAFF_HIRE) {
        const id = careers[nextInt(world, careers.length)];
        n.career = { id, level: 0 };
        n.wasFired = false;
        if (watching(id)) log('log.staffHired', { other: n.name, place: catalog.careers[id].workplace ?? '' });
      }
      continue;
    }
    const career = catalog.careers[n.career.id];
    if (!career) continue;
    const top = career.levels.length - 1;
    const roll = nextFloat(world);
    const fireAt = n.boss ? BOSS_FIRE : STAFF_FIRE;
    if (roll < fireAt) {
      const careerId = n.career.id;
      const wasBoss = !!n.boss;
      n.career = null;
      n.boss = false;
      n.wasFired = true;
      createNews(world, catalog, log, 'fired', n.id, 0);
      if (watching(careerId)) log(wasBoss ? 'log.bossFired' : 'log.staffFired', { other: n.name, place: career.workplace ?? '' });
      if (wasBoss) promoteNewBoss(world, catalog, log, careerId);
    } else if (roll < fireAt + STAFF_PROMOTE && n.career.level < top) {
      // colega não passa o chefe: quem passaria vira chefe só quando o posto vagar
      const boss = world.neighbors.find((x) => x.boss && x.career?.id === n.career!.id);
      const cap = n.boss || !boss ? top : Math.max(0, (boss.career?.level ?? top) - 1);
      if (n.career.level < cap) {
        n.career.level++;
        createNews(world, catalog, log, 'promoted', n.id, 0);
        if (watching(n.career.id)) log('log.staffPromoted', { other: n.name, job: career.levels[n.career.level].title });
      }
    }
  }
}

/** O posto de chefe vagou: o colega de cargo mais alto assume (se houver). */
export function promoteNewBoss(world: World, catalog: Catalog, log: Logger, careerId: string): void {
  const staff = world.neighbors
    .filter((x) => !x.boss && x.career?.id === careerId)
    .sort((a, b) => (b.career!.level - a.career!.level) || a.id - b.id);
  const heir = staff[0];
  if (!heir) return;
  heir.boss = true;
  heir.career!.level = Math.min(catalog.careers[careerId].levels.length - 1, heir.career!.level + 1);
  // a equipe passa a respeitar o novo chefe
  for (const mate of staff.slice(1)) {
    const rel = relationOf(world, mate.id, heir.id);
    if (rel) rel.respect = Math.max(rel.respect, 20);
  }
  if (world.folks.some((f) => !f.visit && f.job?.careerId === careerId)) {
    log('log.newBoss', { other: heir.name, place: catalog.careers[careerId].workplace ?? '' });
  }
}
