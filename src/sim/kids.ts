import { MINUTES_PER_DAY } from './clock';
import { NEED_MAX, clampNeed } from './needs';
import { ensureRelation } from './relations';
import { nextFloat, nextInt } from './rng';
import { skillLevel } from './skills';
import { TEMPER_AXES, TEMPER_MAX, fitTemper, monthFor } from './temper';
import type {
  Age,
  BabyCare,
  Catalog,
  Folk,
  InteractionDef,
  Kid,
  Look,
  Neighbor,
  NeedId,
  ObjectDef,
  Temper,
  TemperAxis,
  World,
  WorldObject,
} from './types';
import { NEED_IDS } from './types';

// Bloco 11: bebês, crianças e escola. Tudo que é regra pura mora aqui; o
// Sim só chama (nascer, cuidar do berço, ônibus da escola, boletim,
// visitadora social e colégio interno).

// ---------- bebê ----------

/** Dias de bebê até virar criança. */
export const BABY_DAYS = 3;
/** Decaimento por minuto do bebê acordado (as outras necessidades ficam paradas). */
export const BABY_DECAY: Partial<Record<NeedId, number>> = { hunger: 0.11, hygiene: 0.09, social: 0.1, energy: 0.11 };
/** Dormindo, o bebê gasta bem menos e recupera a energia. */
export const BABY_SLEEP_SCALE = 0.4;
export const BABY_SLEEP_GAIN = 0.45;
/** Energia em que o bebê pega no sono sozinho e em que acorda. */
export const BABY_DOZE = 22;
export const BABY_WAKE = 96;
/** Abaixo disso o bebê chora (e a casa ouve). */
export const CRY_BELOW = 35;
/** Abaixo disso os adultos já vão cuidar sem o bebê chorar. */
export const CARE_BELOW = 55;
/** Fome ou fralda abaixo disso conta como descaso grave. */
export const NEGLECT_BELOW = 10;
/** Minutos de descaso grave até a visitadora social aparecer. */
export const NEGLECT_VISIT = 180;
/** Minutos de descaso que somem a cada minuto bem cuidado. */
export const NEGLECT_HEAL = 0.25;
/** O que cada cuidado faz por minuto no bebê. */
export const BABY_CARE: Record<BabyCare, Partial<Record<NeedId, number>>> = {
  feed: { hunger: 5 },
  change: { hygiene: 12 },
  hold: { social: 4, fun: 3 },
  lull: { energy: 0.6 },
};
/** Qual necessidade cada cuidado resolve (termina quando enche). */
export const CARE_NEED: Record<BabyCare, NeedId> = { feed: 'hunger', change: 'hygiene', hold: 'social', lull: 'energy' };

/** Bebê a caminho: horas até nascer depois que o casal resolve aumentar a família. */
export const EXPECT_HOURS = 20;
/** Chance de dar certo cada vez que o casal tenta. */
export const TRY_CHANCE = 0.55;
/** Taxa da adoção (cobrada ao ligar) e hora em que a agência traz o bebê. */
export const ADOPT_FEE = 250;
export const ADOPT_HOUR = 10;

// ---------- escola ----------

/** Dias de aula (0 = segunda) e horários (minuto do dia). */
export const SCHOOL_DAYS = [0, 1, 2, 3, 4];
/** O ônibus encosta, espera até `SCHOOL_BUS_LEAVES` e a aula vai até `SCHOOL_END`. */
export const SCHOOL_CALL = 7 * 60;
export const SCHOOL_BUS_LEAVES = 7 * 60 + 40;
export const SCHOOL_START = 8 * 60;
export const SCHOOL_END = 15 * 60;
/** Despertador da criança: tanto antes do ônibus. */
export const SCHOOL_ALARM_LEAD = 60;
/** Boletim de quem começa a estudar. */
export const GRADE_START = 60;
/** Lição feita soma, esquecida tira; faltar tira mais. */
export const HOMEWORK_BONUS = 5;
export const HOMEWORK_PENALTY = 7;
export const MISSED_SCHOOL = 9;
/** Abaixo disso a nota está no vermelho. */
export const GRADE_LOW = 25;
/** Dias seguidos no vermelho: aviso da escola e colégio interno. */
export const GRADE_WARN_DAYS = 3;
export const BOARDING_DAYS = 5;
/** Nota de quadro de honra na sexta. */
export const HONOR_AT = 85;
/** Na escola a merenda segura a fome neste piso. */
export const SCHOOL_LUNCH = 45;

/** Minutos de cuidado que a ajuda na lição vale para aprender com quem ajuda. */
export const HELP_CARE = 30;
/** Cuidado mínimo para a criança puxar alguma coisa de alguém. */
export const LEARN_MIN_CARE = 60;

// ---------- quem é quem ----------

export function isBaby(f: Pick<Folk, 'age'> | undefined): boolean {
  return f?.age === 'baby';
}
export function isChild(f: Pick<Folk, 'age'> | undefined): boolean {
  return f?.age === 'child';
}
/** Adulto de verdade (bloco 17: idoso também; jovem ainda não). */
export function isAdult(f: Pick<Folk, 'age'> | undefined): boolean {
  return !!f && (f.age === undefined || f.age === 'elder');
}

/** Interações que só adultos fazem quando quem pede é criança. */
const ADULT_SPECIALS = new Set(['services', 'payBills', 'party', 'invite', 'adopt', 'fair', 'buffet']);

/**
 * O folk (pela idade) pode fazer esta interação? Bebê não faz nada sozinho;
 * criança não cozinha no fogão, não conserta, não trabalha por conta nem
 * resolve coisa da casa pelo telefone; brinquedo de criança é só dela.
 */
export function kidAllows(folk: Pick<Folk, 'age' | 'kid'>, it: InteractionDef): boolean {
  if (folk.age === 'baby') return false;
  if (it.homework) return (folk.age === 'child' || folk.age === 'teen') && folk.kid?.homework === 'due';
  if (it.kids === 'only') return folk.age === 'child';
  if (it.baby) return isAdult(folk);
  if (isAdult(folk)) return true;
  // bloco 17: o jovem já cozinha e conserta, mas coisa da casa é com os adultos
  if (folk.age === 'teen') return !(it.special && ADULT_SPECIALS.has(it.special));
  if (it.kids === 'no' || it.task || it.care === 'repair' || it.care === 'service') return false;
  return !(it.special && ADULT_SPECIALS.has(it.special));
}

// ---------- berço ----------

export function isCrib(def: ObjectDef | undefined): boolean {
  return !!def?.crib;
}

/** Berço sem bebê (o primeiro da lista), ou null. */
export function freeCrib(world: World, catalog: Catalog): WorldObject | null {
  for (const obj of world.objects) {
    if (!isCrib(catalog.objects[obj.defId]) || obj.state?.broken) continue;
    if (obj.baby === undefined || !world.folks.some((f) => f.id === obj.baby)) return obj;
  }
  return null;
}

/** O berço do bebê. */
export function cribOf(world: World, baby: Folk): WorldObject | undefined {
  return world.objects.find((o) => o.baby === baby.id);
}

/** O bebê do berço. */
export function babyIn(world: World, obj: WorldObject): Folk | undefined {
  if (obj.baby === undefined) return undefined;
  return world.folks.find((f) => f.id === obj.baby && f.age === 'baby');
}

// ---------- nascer ----------

/** Nomes de bebê (o sobrenome vem da família). */
export const BABY_NAMES = [
  'Lalá', 'Tito', 'Bia', 'Juca', 'Mimi', 'Dudu', 'Nara', 'Tuca', 'Lelê', 'Rafa',
  'Cacá', 'Zezé', 'Pipa', 'Nico', 'Tatá', 'Bento', 'Iara', 'Caju', 'Lua', 'Teo',
  'Mel', 'Davi', 'Flor', 'Guto', 'Isis', 'Lino', 'Maya', 'Otto', 'Sol', 'Vivi',
];

/** Sobrenome de alguém (tudo depois do primeiro nome). */
export function surnameOf(name: string): string {
  const parts = name.trim().split(/\s+/);
  return parts.length > 1 ? parts.slice(1).join(' ') : '';
}

/** Um nome que ninguém da casa e da vizinhança usa. */
export function babyName(world: World, surname: string): string {
  const taken = new Set([...world.folks.map((f) => f.name), ...world.neighbors.map((n) => n.name)]);
  const start = nextInt(world, BABY_NAMES.length);
  for (let i = 0; i < BABY_NAMES.length; i++) {
    const first = BABY_NAMES[(start + i) % BABY_NAMES.length];
    const name = surname ? `${first} ${surname}` : first;
    if (!taken.has(name)) return name;
  }
  return `${BABY_NAMES[start]} ${surname} ${world.nextId}`.trim();
}

type Parent = Pick<Folk | Neighbor, 'id' | 'name' | 'traits' | 'look' | 'temper'>;

/**
 * Temperamento de quem nasce: a média dos pais com um ou dois pontos de
 * sorte para cada lado (adotado: qualquer um). Sempre no orçamento.
 */
export function inheritTemper(world: World, parents: Parent[]): Temper {
  const raw = {} as Temper;
  for (const a of TEMPER_AXES) {
    const base = parents.length ? parents.reduce((s, p) => s + p.temper[a], 0) / parents.length : 5;
    const swing = parents.length >= 2 ? 1.5 : parents.length === 1 ? 2.5 : 3.5;
    raw[a] = Math.max(0, Math.min(TEMPER_MAX, base + (nextFloat(world) * 2 - 1) * swing));
  }
  return fitTemper(raw);
}

/** Traços de quem nasce: cada pai passa um dos seus, às vezes. */
export function inheritTraits(world: World, parents: Parent[]): string[] {
  const out: string[] = [];
  for (const p of parents) {
    if (p.traits.length === 0 || nextFloat(world) >= 0.5) continue;
    const t = p.traits[nextInt(world, p.traits.length)];
    if (!out.includes(t)) out.push(t);
  }
  return out.slice(0, 2);
}

/** Cara de quem nasce: pele e cabelo dos pais, o resto da sorte. */
export function inheritLook(world: World, parents: Parent[]): Look {
  const pick = <T>(xs: T[], fallback: T) => (xs.length ? xs[nextInt(world, xs.length)] : fallback);
  const skins = parents.map((p) => p.look.skin);
  const hairs = parents.map((p) => p.look.hair);
  return {
    skin: pick(skins, nextInt(world, 4)),
    hair: pick(hairs, nextInt(world, 5)),
    shirt: nextInt(world, 6),
    pants: nextInt(world, 4),
    style: nextInt(world, 4),
    face: nextInt(world, 3),
    body: 1,
    formal: nextInt(world, 4),
    sleepwear: nextInt(world, 4),
    swimwear: nextInt(world, 4),
  };
}

/** Ficha nova de bebê. */
export function freshKid(tick: number, parents: number[], adopted: boolean): Kid {
  return {
    born: tick,
    grows: tick + BABY_DAYS * MINUTES_PER_DAY,
    parents,
    adopted: adopted || undefined,
    grade: GRADE_START,
    homework: 'none',
    calledDay: -1,
    schoolDay: -1,
    lowDays: 0,
    cares: {},
    neglect: 0,
    warned: 0,
  };
}

/**
 * Cria o bebê no berço: herda dos pais (temperamento, traços, pele, cabelo,
 * sobrenome) e já conhece a casa (os pais com carinho de família).
 */
export function createBaby(world: World, catalog: Catalog, parents: Parent[], crib: WorldObject, adopted: boolean): Folk {
  const genes = adopted ? [] : parents;
  const temper = inheritTemper(world, genes);
  const surname = parents.map((p) => surnameOf(p.name)).find((s) => s) ?? '';
  const baby: Folk = {
    id: world.nextId++,
    name: babyName(world, surname),
    traits: inheritTraits(world, genes),
    x: crib.x,
    y: crib.y,
    px: crib.x,
    py: crib.y,
    facing: { x: 0, y: 1 },
    needs: { hunger: 80, energy: 70, hygiene: 90, bladder: 100, comfort: 100, fun: 80, social: 70, ambience: 60 },
    queue: [],
    path: [],
    idleTicks: 0,
    collapsed: 0,
    look: inheritLook(world, genes),
    temper,
    month: monthFor(catalog, temper),
    outfit: 'day',
    habits: {},
    thought: null,
    wishes: [],
    wishDay: -1,
    spark: 0,
    inspired: 0,
    alarm: true,
    skills: {},
    job: null,
    away: null,
    gig: null,
    business: null,
    visit: null,
    age: 'baby',
    kid: freshKid(world.tick, parents.map((p) => p.id), adopted),
  };
  // bloco 17: os pais ficam para sempre (a ficha de criança some quando cresce)
  if (parents.length) baby.parents = parents.map((p) => p.id);
  world.folks.push(baby);
  crib.baby = baby.id;
  // a casa inteira já conhece o bebê; pai e mãe com carinho de família
  for (const f of world.folks) {
    if (f === baby || f.visit) continue;
    const parent = parents.some((p) => p.id === f.id);
    for (const [a, b] of [
      [f.id, baby.id],
      [baby.id, f.id],
    ]) {
      const rel = ensureRelation(world, a, b);
      rel.friendship = Math.max(rel.friendship, parent ? 50 : 25);
      if (!rel.memories.some((m) => m.kind === 'met')) rel.memories.push({ tick: world.tick, kind: 'met' });
    }
  }
  return baby;
}

// ---------- um minuto de bebê ----------

/** O que o bebê está pedindo mais (a necessidade mais baixa entre as dele), ou null. */
export function babyWant(baby: Folk, below = CRY_BELOW): BabyCare | null {
  let best: { care: BabyCare; v: number } | null = null;
  for (const care of ['feed', 'change', 'hold'] as BabyCare[]) {
    const v = baby.needs[CARE_NEED[care]];
    if (v < below && (!best || v < best.v)) best = { care, v };
  }
  if (best) return best.care;
  if (!baby.kid?.asleep && baby.needs.energy < Math.min(below, BABY_DOZE + 15)) return 'lull';
  return null;
}

export function crying(baby: Folk): boolean {
  return isBaby(baby) && !baby.kid?.asleep && babyWant(baby) !== null && babyWant(baby) !== 'lull';
}

/**
 * Um minuto do bebê: as necessidades dele andam (as de adulto ficam
 * paradas), dorme e acorda sozinho e conta o descaso grave. Devolve se
 * pegou no sono ou acordou agora, para o log.
 */
export function babyTick(baby: Folk, held: boolean): 'slept' | 'woke' | null {
  const kid = baby.kid!;
  const scale = kid.asleep ? BABY_SLEEP_SCALE : 1;
  for (const id of NEED_IDS) {
    const d = BABY_DECAY[id];
    if (d === undefined) {
      if (id !== 'ambience') baby.needs[id] = Math.max(baby.needs[id], 80);
      continue;
    }
    if (id === 'energy') continue;
    baby.needs[id] = clampNeed(baby.needs[id] - d * (id === 'social' && held ? 0 : scale));
  }
  // a diversão do bebê é o colo e a companhia
  baby.needs.fun = clampNeed(Math.max(baby.needs.fun - 0.05, baby.needs.social - 10));
  let change: 'slept' | 'woke' | null = null;
  if (kid.asleep) {
    baby.needs.energy = clampNeed(baby.needs.energy + BABY_SLEEP_GAIN);
    // acorda descansado, ou com fome demais para dormir
    if (baby.needs.energy >= BABY_WAKE || baby.needs.hunger < NEGLECT_BELOW + 5) {
      kid.asleep = false;
      change = 'woke';
    }
  } else {
    baby.needs.energy = clampNeed(baby.needs.energy - (BABY_DECAY.energy ?? 0));
    if (baby.needs.energy < BABY_DOZE && !held) {
      kid.asleep = true;
      change = 'slept';
    }
  }
  const neglected = baby.needs.hunger < NEGLECT_BELOW || baby.needs.hygiene < NEGLECT_BELOW;
  kid.neglect = neglected ? kid.neglect + 1 : Math.max(0, kid.neglect - NEGLECT_HEAL);
  return change;
}

/**
 * Um minuto de cuidado no bebê. Devolve true quando o cuidado terminou (a
 * necessidade encheu; ninar termina quando ele dorme).
 */
export function babyCareTick(baby: Folk, care: BabyCare, adultId: number): boolean {
  const kid = baby.kid!;
  kid.cares[adultId] = (kid.cares[adultId] ?? 0) + 1;
  if (care === 'lull') {
    baby.needs.energy = clampNeed(baby.needs.energy + (BABY_CARE.lull.energy ?? 0));
    baby.needs.social = clampNeed(baby.needs.social + 1);
    if (baby.needs.energy < 85) {
      kid.asleep = true;
      return true;
    }
    return baby.needs.energy >= NEED_MAX - 2;
  }
  // quem pega no colo acorda o bebê
  if (care === 'hold' || care === 'feed') kid.asleep = false;
  for (const [id, v] of Object.entries(BABY_CARE[care]) as [NeedId, number][]) baby.needs[id] = clampNeed(baby.needs[id] + v);
  return baby.needs[CARE_NEED[care]] >= NEED_MAX - 1;
}

// ---------- crescer e aprender com quem cuida ----------

/**
 * A criança pega um pouco do jeito de quem mais cuidou dela: o eixo em que
 * os dois mais diferem anda um ponto na direção do cuidador (e outro eixo
 * devolve o ponto). Metade do cuidado contado fica para a próxima vez.
 */
export function learnFromCaregiver(world: World, kidFolk: Folk): { from: number; axis: TemperAxis; dir: 1 | -1 } | null {
  const kid = kidFolk.kid;
  if (!kid) return null;
  let best: { id: number; minutes: number } | null = null;
  for (const [id, minutes] of Object.entries(kid.cares)) {
    const who = world.folks.find((f) => f.id === Number(id)) ?? world.neighbors.find((n) => n.id === Number(id));
    if (!who || minutes < LEARN_MIN_CARE) continue;
    if (!best || minutes > best.minutes || (minutes === best.minutes && Number(id) < best.id)) best = { id: Number(id), minutes };
  }
  for (const id of Object.keys(kid.cares)) kid.cares[id] = Math.floor(kid.cares[id] / 2);
  if (!best) return null;
  const giver = world.folks.find((f) => f.id === best!.id) ?? world.neighbors.find((n) => n.id === best!.id);
  if (!giver) return null;
  const t = kidFolk.temper;
  let axis: TemperAxis | null = null;
  for (const a of TEMPER_AXES) {
    const d = giver.temper[a] - t[a];
    if (d === 0) continue;
    if (!axis || Math.abs(d) > Math.abs(giver.temper[axis] - t[axis])) axis = a;
  }
  if (!axis) return null;
  const dir: 1 | -1 = giver.temper[axis] > t[axis] ? 1 : -1;
  // quem devolve o ponto: o eixo que mais anda no sentido contrário do cuidador
  const back = TEMPER_AXES.filter((a) => a !== axis && (dir > 0 ? t[a] > 0 : t[a] < TEMPER_MAX)).sort(
    (a, b) => dir * ((giver.temper[a] - t[a]) - (giver.temper[b] - t[b])) || a.localeCompare(b),
  )[0];
  if (!back) return null;
  t[axis] += dir;
  t[back] -= dir;
  return { from: giver.id, axis, dir };
}

// ---------- escola ----------

export function dayOf(tick: number): number {
  return Math.floor(tick / MINUTES_PER_DAY);
}

export function isSchoolDay(day: number): boolean {
  return SCHOOL_DAYS.includes(((day % 7) + 7) % 7);
}

/** Tick da chamada do ônibus no próximo dia de aula a partir de `tick` (a de hoje, se ainda não passou). */
export function nextSchoolCall(tick: number): number {
  for (let d = dayOf(tick); d < dayOf(tick) + 8; d++) {
    const call = d * MINUTES_PER_DAY + SCHOOL_CALL;
    if (isSchoolDay(d) && call >= tick) return call;
  }
  return -1;
}

/**
 * Nota de um dia de aula: humor (de quando saiu e de quando voltou), lição
 * da véspera e o que a criança sabe (Lógica e Criatividade ajudam).
 */
export function schoolDelta(folk: Folk, avgMood: number): number {
  const kid = folk.kid!;
  let d = (avgMood - 55) / 9;
  if (kid.homework === 'done') d += HOMEWORK_BONUS;
  else if (kid.homework === 'due') d -= HOMEWORK_PENALTY;
  d += (skillLevel(folk, 'logic') + skillLevel(folk, 'creativity')) * 0.35;
  return d;
}

export function clampGrade(v: number): number {
  return Math.max(0, Math.min(100, v));
}

/** Conceito do boletim (0 = péssimo ... 4 = ótimo). */
export function gradeBand(grade: number): number {
  return grade >= 85 ? 4 : grade >= 65 ? 3 : grade >= 45 ? 2 : grade >= GRADE_LOW ? 1 : 0;
}

/** Nota de 0 a 10 com uma casa, como a escola escreve. */
export function gradeText(grade: number): string {
  return (Math.round(grade) / 10).toFixed(1).replace('.', ',');
}

/** Atualiza os dias seguidos no vermelho; devolve o que a escola faz. */
export function gradeVerdict(kid: Kid): 'ok' | 'warn' | 'boarding' {
  kid.lowDays = kid.grade < GRADE_LOW ? kid.lowDays + 1 : 0;
  if (kid.lowDays >= BOARDING_DAYS) return 'boarding';
  if (kid.lowDays === GRADE_WARN_DAYS) return 'warn';
  return 'ok';
}

/** Criança sem comer direito também conta como descaso (mais devagar que bebê). */
export function childNeglectTick(folk: Folk): void {
  const kid = folk.kid;
  if (!kid) return;
  if (folk.needs.hunger < NEGLECT_BELOW - 4) kid.neglect += 0.5;
  else kid.neglect = Math.max(0, kid.neglect - NEGLECT_HEAL);
}

/** Bebês e crianças da casa. */
export function kidsOf(world: World, age?: Age): Folk[] {
  return world.folks.filter((f) => !f.visit && f.kid && (age ? f.age === age : !isAdult(f)));
}
