import { describe, expect, it } from 'vitest';
import { CATALOG } from '../src/data/catalog';
import { NEIGHBORS } from '../src/data/neighbors';
import {
  BABY_DAYS,
  BOARDING_DAYS,
  CRY_BELOW,
  GRADE_LOW,
  GRADE_START,
  MINUTES_PER_DAY,
  NEGLECT_VISIT,
  SAVE_VERSION,
  SCHOOL_CALL,
  SCHOOL_END,
  TEMPER_BUDGET,
  availableSocials,
  babyIn,
  cribOf,
  createBaby,
  deserialize,
  ensureRelation,
  gradeBand,
  gradeText,
  inheritTemper,
  isServiceNeighbor,
  kidAllows,
  learnFromCaregiver,
  nextSchoolCall,
  rideFor,
  serialize,
  setDating,
  spotNear,
  temperSum,
  wakeTime,
} from '../src/sim';
import type { Folk, InteractionDef, Sim, WorldObject } from '../src/sim';
import { householdSim, run } from './helpers';
import { playStep } from './helpers/player';

/** Põe o relógio num horário (dia 0 = segunda) sem passar pelas contas. */
function at(sim: Sim, hour: number, day = 0, minute = 0): void {
  sim.world.tick = day * MINUTES_PER_DAY + hour * 60 + minute;
  sim.world.household.nextBills = sim.world.tick + 3 * MINUTES_PER_DAY;
}

function happy(f: Folk): void {
  for (const k of Object.keys(f.needs) as (keyof Folk['needs'])[]) f.needs[k] = 95;
}

function until(sim: Sim, ok: () => boolean, max: number): number {
  let m = 0;
  for (; m < max && !ok(); m++) sim.step();
  return m;
}

/** Compra um objeto num lugar livre perto do primeiro morador. */
function place(sim: Sim, defId: string): WorldObject {
  const spot = spotNear(sim.world, CATALOG, defId, sim.residents()[0])!;
  sim.world.household.funds += 2000;
  expect(sim.dispatch({ type: 'buy', defId, x: spot.x, y: spot.y, rot: spot.rot })).toBe(true);
  sim.dispatch({ type: 'closeBuy' });
  return sim.world.objects[sim.world.objects.length - 1];
}

/** Casa pronta com Tomé e Lia casados e um berço, sem IA. */
function family(seed = 1) {
  const sim = householdSim(seed);
  at(sim, 10);
  const [a, b] = sim.residents();
  for (const [x, y] of [
    [a.id, b.id],
    [b.id, a.id],
  ]) {
    const rel = ensureRelation(sim.world, x, y);
    rel.friendship = 70;
    rel.romance = 80;
  }
  setDating(sim.world, a.id, b.id, true);
  for (const f of sim.world.folks) {
    happy(f);
  }
  const crib = place(sim, 'crib');
  return { sim, a, b, crib };
}

function withBaby(seed = 1) {
  const f = family(seed);
  const baby = createBaby(f.sim.world, CATALOG, [f.a, f.b], f.crib, false);
  return { ...f, baby };
}

const it_ = (obj: string, id: string): InteractionDef => CATALOG.objects[obj].interactions.find((i) => i.id === id)!;

describe('idades e o que cada um faz (bloco 11)', () => {
  it('bebê não faz nada sozinho; criança não cozinha nem trabalha; brinquedo de criança é só dela', () => {
    const baby = { age: 'baby' as const, kid: undefined };
    const child = { age: 'child' as const, kid: { homework: 'due' } as Folk['kid'] };
    const adult = { age: undefined, kid: undefined };
    expect(kidAllows(baby, it_('fridge', 'snack'))).toBe(false);
    expect(kidAllows(child, it_('stove', 'cook'))).toBe(false);
    expect(kidAllows(child, it_('desk', 'freelance'))).toBe(false);
    expect(kidAllows(child, it_('fridge', 'snack'))).toBe(true);
    expect(kidAllows(child, it_('spintop', 'spinTop'))).toBe(true);
    expect(kidAllows(adult, it_('spintop', 'spinTop'))).toBe(false);
    expect(kidAllows(adult, it_('dollhouse', 'playHouse'))).toBe(true);
    expect(kidAllows(child, it_('desk', 'homework'))).toBe(true);
    expect(kidAllows({ age: 'child', kid: { homework: 'done' } as Folk['kid'] }, it_('desk', 'homework'))).toBe(false);
    expect(kidAllows(child, it_('crib', 'feedBaby'))).toBe(false);
    expect(kidAllows(adult, it_('crib', 'feedBaby'))).toBe(true);
    expect(kidAllows(child, it_('phone', 'adopt'))).toBe(false);
  });

  it('criança não namora, não arruma emprego e não dá festa', () => {
    const { sim, a, baby } = withBaby();
    baby.age = 'child';
    const socials = availableSocials(sim.world, CATALOG, a, baby).map((d) => d.id);
    expect(socials.some((id) => CATALOG.socials[id].category === 'romantic')).toBe(false);
    expect(sim.dispatch({ type: 'takeJob', folkId: baby.id, careerId: 'office' })).toBe(false);
    expect(sim.lastProblem).toBe('tooYoung');
    expect(sim.dispatch({ type: 'throwParty', folkId: baby.id, guestIds: [sim.world.neighbors[0].id] })).toBe(false);
    expect(sim.lastProblem).toBe('tooYoung');
  });
});

describe('ter um bebê (bloco 11)', () => {
  it('sem berço livre, o casal não consegue aumentar a família', () => {
    const sim = householdSim(1);
    at(sim, 10);
    const [a, b] = sim.residents();
    for (const [x, y] of [
      [a.id, b.id],
      [b.id, a.id],
    ]) Object.assign(ensureRelation(sim.world, x, y), { friendship: 70, romance: 80 });
    setDating(sim.world, a.id, b.id, true);
    expect(sim.dispatch({ type: 'queueSocial', folkId: a.id, otherId: b.id, socialId: 'tryBaby' })).toBe(false);
    expect(sim.lastProblem).toBe('noCrib');
  });

  it('o sim do casal traz o bebê para o berço no dia seguinte, com o sobrenome e o jeito dos pais', () => {
    const { sim, a, b, crib } = family(3);
    expect(sim.dispatch({ type: 'queueSocial', folkId: a.id, otherId: b.id, socialId: 'tryBaby' })).toBe(true);
    // tenta até dar certo (a chance é por tentativa)
    for (let i = 0; i < 12 && !sim.world.household.expecting; i++) {
      (sim as unknown as { tryBaby(x: Folk, y: Folk): void }).tryBaby(a, b);
    }
    const exp = sim.world.household.expecting!;
    expect(exp.parents).toEqual([a.id, b.id]);
    // um bebê de cada vez
    expect(sim.dispatch({ type: 'queueSocial', folkId: a.id, otherId: b.id, socialId: 'tryBaby' })).toBe(false);
    expect(sim.lastProblem).toBe('expecting');
    sim.world.tick = exp.due - 1;
    sim.step();
    const baby = sim.world.folks.find((f) => f.age === 'baby')!;
    expect(baby).toBeDefined();
    expect(sim.world.household.expecting).toBeNull();
    expect(crib.baby).toBe(baby.id);
    expect(baby.x).toBe(crib.x);
    expect(baby.name.endsWith('Varanda')).toBe(true);
    expect(temperSum(baby.temper)).toBe(TEMPER_BUDGET);
    expect(baby.kid!.parents).toEqual([a.id, b.id]);
    expect(sim.world.relations[`${a.id}>${baby.id}`]?.friendship).toBeGreaterThanOrEqual(50);
    expect(sim.world.log.some((l) => l.key === 'log.babyBorn')).toBe(true);
    // berço com bebê não se vende
    expect(sim.dispatch({ type: 'sell', objectId: crib.id })).toBe(false);
    // bebê não recebe ordens
    expect(sim.dispatch({ type: 'queueGoto', folkId: baby.id, x: 5, y: 9 })).toBe(false);
    expect(sim.lastProblem).toBe('baby');
  });

  it('o temperamento herdado fica perto da média dos pais', () => {
    const { sim, a, b } = family(5);
    a.temper = { order: 10, outgoing: 2, pep: 5, wit: 5, warmth: 3 };
    b.temper = { order: 8, outgoing: 4, pep: 5, wit: 3, warmth: 5 };
    for (let i = 0; i < 20; i++) {
      const t = inheritTemper(sim.world, [a, b]);
      expect(temperSum(t)).toBe(TEMPER_BUDGET);
      expect(t.order).toBeGreaterThanOrEqual(6);
    }
  });

  it('adoção pelo telefone: precisa de berço, cobra a taxa e o bebê chega às 10h do dia seguinte', () => {
    const sim = householdSim(1);
    at(sim, 11);
    const tome = sim.residents()[0];
    happy(tome);
    const phone = sim.world.objects.find((o) => o.defId === 'phone')!;
    expect(sim.dispatch({ type: 'queueUse', folkId: tome.id, objectId: phone.id, interactionId: 'adopt' })).toBe(false);
    expect(sim.lastProblem).toBe('noCrib');
    place(sim, 'crib');
    const funds = sim.world.household.funds;
    expect(sim.dispatch({ type: 'queueUse', folkId: tome.id, objectId: phone.id, interactionId: 'adopt' })).toBe(true);
    until(sim, () => !!sim.world.household.expecting, 120);
    expect(sim.world.household.funds).toBeLessThan(funds);
    const due = sim.world.household.expecting!.due;
    expect(due % MINUTES_PER_DAY).toBe(10 * 60);
    expect(Math.floor(due / MINUTES_PER_DAY)).toBe(1);
    sim.world.tick = due - 1;
    sim.step();
    const baby = sim.world.folks.find((f) => f.age === 'baby')!;
    expect(baby.kid!.adopted).toBe(true);
    expect(sim.world.log.some((l) => l.key === 'log.babyAdopted')).toBe(true);
  });
});

describe('cuidar do bebê (bloco 11)', () => {
  it('bebê com fome chora e o adulto dá mamadeira até encher', () => {
    const { sim, a, baby, crib } = withBaby();
    baby.needs.hunger = CRY_BELOW + 0.05;
    sim.step();
    expect(baby.thought?.kind).toBe('want');
    expect(baby.thought?.icon).toBe('hunger');
    expect(sim.world.log.some((l) => l.key === 'log.babyCries')).toBe(true);
    expect(sim.dispatch({ type: 'queueUse', folkId: a.id, objectId: crib.id, interactionId: 'feedBaby' })).toBe(true);
    until(sim, () => a.queue.length === 0, 120);
    expect(baby.needs.hunger).toBeGreaterThan(95);
    expect(baby.thought).toBeNull();
    expect(baby.kid!.cares[a.id]).toBeGreaterThan(0);
  });

  it('plano 2: sem ordem, ninguém cuida sozinho do bebê; o choro só avisa', () => {
    const { sim, a, b, baby } = withBaby(2);
    baby.needs.hygiene = 20;
    run(sim, 180);
    expect(baby.needs.hygiene).toBeLessThan(40);
    expect([...a.queue, ...b.queue].some((q) => q.interactionId !== undefined)).toBe(false);
  });

  it('o bebê dorme sozinho quando cansa e acorda descansado', () => {
    const { sim, baby } = withBaby();
    baby.needs.energy = 15;
    sim.step();
    expect(baby.kid!.asleep).toBe(true);
    until(sim, () => !baby.kid!.asleep, 400);
    expect(baby.needs.energy).toBeGreaterThan(90);
  });

  it('chorando de madrugada com todos dormindo, o choro acorda um adulto', () => {
    const { sim, a, b, baby } = withBaby();
    at(sim, 2);
    const beds = sim.world.objects.filter((o) => o.defId === 'bed');
    [a, b].forEach((p, i) => {
      p.needs.energy = 40;
      expect(sim.dispatch({ type: 'queueUse', folkId: p.id, objectId: beds[i].id, interactionId: 'sleep' })).toBe(true);
    });
    until(sim, () => [a, b].every((p) => p.queue[0]?.phase === 'using'), 60);
    baby.needs.hunger = 20;
    until(sim, () => sim.world.log.some((l) => l.key === 'log.babyWokeUp'), 61);
    expect(sim.world.log.some((l) => l.key === 'log.babyWokeUp')).toBe(true);
  });

  it('descaso grave traz a visitadora: primeiro um aviso, depois ela leva o bebê', () => {
    const { sim, baby } = withBaby();
    expect(sim.world.neighbors.some((n) => n.service === 'social')).toBe(true);
    baby.needs.hunger = 0;
    baby.kid!.neglect = NEGLECT_VISIT - 1;
    until(sim, () => sim.world.log.some((l) => l.key === 'log.socialWarned'), 240);
    expect(sim.world.log.some((l) => l.key === 'log.socialComing')).toBe(true);
    expect(baby.kid!.warned).toBe(1);
    expect(sim.world.folks.includes(baby)).toBe(true);
    // a casa não aprende
    baby.needs.hunger = 0;
    baby.kid!.neglect = NEGLECT_VISIT - 1;
    until(sim, () => sim.world.log.some((l) => l.key === 'log.socialTook'), 400);
    expect(sim.world.folks.some((f) => f.id === baby.id)).toBe(false);
    const n = sim.world.neighbors.find((x) => x.id === baby.id)!;
    expect(n.away).toBe('fostered');
    expect(isServiceNeighbor(n)).toBe(true);
    expect(sim.world.objects.some((o) => o.baby !== undefined && babyIn(sim.world, o))).toBe(false);
  });

  it('depois de alguns dias o bebê vira criança, sai do berço e puxa o jeito de quem mais cuidou', () => {
    const { sim, a, baby, crib } = withBaby();
    a.temper = { order: 10, outgoing: 5, pep: 5, wit: 3, warmth: 2 };
    baby.temper = { order: 3, outgoing: 5, pep: 6, wit: 6, warmth: 5 };
    baby.kid!.cares[a.id] = 200;
    expect(baby.kid!.grows - baby.kid!.born).toBe(BABY_DAYS * MINUTES_PER_DAY);
    sim.world.tick = baby.kid!.grows - 1;
    happy(baby);
    sim.step();
    expect(baby.age).toBe('child');
    expect(crib.baby).toBeUndefined();
    expect(cribOf(sim.world, baby)).toBeUndefined();
    expect(baby.temper.order).toBe(4);
    expect(temperSum(baby.temper)).toBe(TEMPER_BUDGET);
    expect(sim.world.log.some((l) => l.key === 'log.learnedFrom')).toBe(true);
  });

  it('aprender com quem cuida exige cuidado de verdade', () => {
    const { sim, a, baby } = withBaby();
    baby.kid!.cares[a.id] = 10;
    const before = { ...baby.temper };
    expect(learnFromCaregiver(sim.world, baby)).toBeNull();
    expect(baby.temper).toEqual(before);
  });
});

describe('escola e boletim (bloco 11)', () => {
  function child(seed = 1) {
    const f = withBaby(seed);
    const kid = f.baby;
    kid.age = 'child';
    delete f.crib.baby;
    kid.x = 8;
    kid.y = 9;
    happy(kid);
    return { ...f, kid };
  }

  it('o ônibus passa às 7h nos dias úteis e a criança volta às 15h com lição', () => {
    const { sim, kid } = child();
    expect(nextSchoolCall(5 * 60)).toBe(SCHOOL_CALL);
    expect(nextSchoolCall(5 * MINUTES_PER_DAY)).toBe(7 * MINUTES_PER_DAY + SCHOOL_CALL);
    expect(wakeTime(CATALOG, kid, 3 * 60)).toBe(SCHOOL_CALL - 60);
    at(sim, 6, 0, 59);
    sim.step();
    expect(kid.queue[0]?.kind).toBe('school');
    expect(rideFor(CATALOG, kid, sim.world.tick)?.careerId).toBe('school');
    until(sim, () => !!kid.away, 60);
    expect(kid.away?.until).toBe(SCHOOL_END);
    expect(sim.world.log.some((l) => l.key === 'log.leftForSchool')).toBe(true);
    until(sim, () => !kid.away, SCHOOL_END);
    expect(sim.world.tick).toBe(SCHOOL_END);
    expect(kid.kid!.homework).toBe('due');
  });

  it('lição feita sobe a nota do dia seguinte; esquecida derruba', () => {
    const { sim, kid } = child();
    const desk = place(sim, 'desk');
    kid.kid!.homework = 'due';
    at(sim, 16);
    expect(sim.dispatch({ type: 'queueUse', folkId: kid.id, objectId: desk.id, interactionId: 'homework' })).toBe(true);
    until(sim, () => kid.kid!.homework === 'done', 120);
    expect(kid.kid!.homework).toBe('done');
    // sem lição pendente o menu recusa
    expect(sim.dispatch({ type: 'queueUse', folkId: kid.id, objectId: desk.id, interactionId: 'homework' })).toBe(false);
    const a = { ...kid, kid: { ...kid.kid!, homework: 'done' as const } };
    const b = { ...kid, kid: { ...kid.kid!, homework: 'due' as const } };
    const back = (f: Folk) => {
      const s = (sim as unknown as { backFromSchool(x: Folk): void });
      f.away = { until: 0, late: 0, mood: 70, event: null, nextEvent: -1 };
      f.kid!.grade = 50;
      s.backFromSchool.call(sim, f);
      return f.kid!.grade;
    };
    expect(back(a as Folk)).toBeGreaterThan(back(b as Folk));
  });

  it('perder o ônibus derruba a nota', () => {
    const { sim, kid } = child();
    kid.kid!.grade = GRADE_START;
    at(sim, 6, 1, 59);
    sim.step();
    kid.queue = [];
    until(sim, () => kid.kid!.schoolDay === 1, 60);
    expect(kid.kid!.grade).toBeLessThan(GRADE_START);
    expect(sim.world.log.some((l) => l.key === 'log.missedSchool')).toBe(true);
  });

  it('cinco dias de aula seguidos no vermelho mandam para o colégio interno', () => {
    const { sim, kid } = child();
    kid.kid!.grade = GRADE_LOW - 10;
    kid.kid!.lowDays = BOARDING_DAYS - 1;
    const s = sim as unknown as { checkGrade(x: Folk): void };
    s.checkGrade.call(sim, kid);
    expect(sim.world.log.some((l) => l.key === 'log.toBoarding')).toBe(true);
    expect(kid.visit?.leaving).toBe(true);
    const n = sim.world.neighbors.find((x) => x.id === kid.id)!;
    expect(n.away).toBe('boarding');
    expect(isServiceNeighbor(n)).toBe(true);
  });

  it('boletim em palavras e de 0 a 10', () => {
    expect(gradeText(64)).toBe('6,4');
    expect(gradeBand(90)).toBe(4);
    expect(gradeBand(10)).toBe(0);
  });

  it('adulto ajuda na lição: fica feita e conta como cuidado', () => {
    const { sim, a, kid } = child();
    kid.kid!.homework = 'due';
    const socials = availableSocials(sim.world, CATALOG, a, kid).map((d) => d.id);
    expect(socials).toContain('helpHomework');
    expect(socials).toContain('playTag');
    const s = sim as unknown as { socialSpecial(x: Folk, y: Folk, sp: string): void };
    s.socialSpecial.call(sim, a, kid, 'helpHomework');
    expect(kid.kid!.homework).toBe('done');
    expect(kid.kid!.cares[a.id]).toBeGreaterThanOrEqual(30);
  });
});

describe('save v15 (bloco 11)', () => {
  it('bebê, berço e bebê a caminho voltam iguais do save', () => {
    const { sim, baby, crib } = withBaby();
    sim.world.household.expecting = { parents: [1, 2], due: 9999, adopted: false };
    const file = serialize(sim.world, 0);
    const back = deserialize(JSON.parse(JSON.stringify(file)), { neighbors: NEIGHBORS });
    expect(back.world.folks.find((f) => f.id === baby.id)?.kid?.grows).toBe(baby.kid!.grows);
    expect(back.world.objects.find((o) => o.id === crib.id)?.baby).toBe(baby.id);
    expect(back.world.household.expecting?.due).toBe(9999);
  });

  it('save v14 abre com a visitadora social no bairro e sem bebê a caminho', () => {
    const sim = householdSim(4);
    const old = JSON.parse(JSON.stringify(serialize(sim.world, 0)));
    old.version = 14;
    old.world.neighbors = old.world.neighbors.filter((n: { service?: string }) => n.service !== 'social');
    delete old.world.household.expecting;
    const up = deserialize(old, { neighbors: NEIGHBORS, catalog: CATALOG });
    expect(up.version).toBe(SAVE_VERSION);
    expect(SAVE_VERSION).toBeGreaterThanOrEqual(15);
    expect(up.world.household.expecting).toBeNull();
    expect(up.world.neighbors.some((n) => n.service === 'social')).toBe(true);
  });
});

describe('equilíbrio (bloco 11)', () => {
  it('7 dias com IA, casal e bebê: ninguém chama a visitadora, o bebê cresce e vai à escola', () => {
    const sim = householdSim(7);
    const crib = place(sim, 'crib');
    place(sim, 'desk');
    const [a, b] = sim.residents();
    const baby = createBaby(sim.world, CATALOG, [a, b], crib, false);
    let minHunger = 100;
    let minHygiene = 100;
    for (let m = 0; m < 7 * MINUTES_PER_DAY; m++) {
      playStep(sim);
      if (baby.age === 'baby') {
        minHunger = Math.min(minHunger, baby.needs.hunger);
        minHygiene = Math.min(minHygiene, baby.needs.hygiene);
      }
    }
    const keys = sim.world.log.map((l) => l.key);
    expect(keys).not.toContain('log.socialComing');
    expect(sim.world.folks.some((f) => f.id === baby.id)).toBe(true);
    expect(baby.age).toBe('child');
    expect(minHunger).toBeGreaterThan(10);
    expect(minHygiene).toBeGreaterThan(10);
    expect(baby.kid!.schoolDay).toBeGreaterThan(0);
    expect(sim.world.household.funds).toBeGreaterThan(-500);
    for (const f of sim.residents()) expect(f.needs.hunger).toBeGreaterThan(0);
  });
});

run;
