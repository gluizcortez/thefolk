import { describe, expect, it } from 'vitest';
import { CATALOG } from '../src/data/catalog';
import { NEIGHBORS } from '../src/data/neighbors';
import {
  MINUTES_PER_DAY,
  SAVE_VERSION,
  acceptChance,
  availableSocials,
  belongingsOf,
  bondOf,
  dailyHearts,
  deserialize,
  ensureRelation,
  fianceOf,
  isServiceNeighbor,
  relationOf,
  romanceLabel,
  savingsOf,
  serialize,
  setBond,
  setDating,
  spotNear,
  spouseOf,
  wearsRing,
  weddingNames,
} from '../src/sim';
import type { Folk, Sim } from '../src/sim';
import { crowd, householdSim, run } from './helpers';

/** Põe o relógio num horário do dia 1 sem passar pelas contas. */
function at(sim: Sim, hour: number, day = 1): void {
  sim.world.tick = day * MINUTES_PER_DAY + hour * 60;
  sim.world.household.nextBills = sim.world.tick + 3 * MINUTES_PER_DAY;
}

function love(sim: Sim, a: number, b: number, romance = 85, friendship = 70): void {
  for (const [x, y] of [
    [a, b],
    [b, a],
  ]) {
    const rel = ensureRelation(sim.world, x, y);
    rel.friendship = friendship;
    rel.romance = romance;
    rel.last = sim.world.tick;
  }
  setDating(sim.world, a, b, true);
}

function happy(f: Folk): void {
  for (const k of Object.keys(f.needs) as (keyof Folk['needs'])[]) f.needs[k] = 90;
}

/** Roda até a condição valer (ou estourar o limite de minutos). */
function until(sim: Sim, ok: () => boolean, max: number): void {
  for (let m = 0; m < max && !ok(); m++) sim.step();
}

/** Casa pronta com Tomé e Lia namorando firme, sem IA (só o que mandarmos). */
function couple(seed = 1) {
  const sim = householdSim(seed);
  at(sim, 10);
  const [a, b] = sim.residents();
  love(sim, a.id, b.id);
  for (const f of sim.world.folks) {
    f.autonomy = false;
    happy(f);
  }
  return { sim, a, b };
}

/** Compra um estojo de aliança num lugar livre. */
function buyRing(sim: Sim): void {
  const spot = spotNear(sim.world, CATALOG, 'ringbox', sim.residents()[0])!;
  sim.world.household.funds += 1000;
  expect(sim.dispatch({ type: 'buy', defId: 'ringbox', x: spot.x, y: spot.y, rot: spot.rot })).toBe(true);
}

describe('sobrenome e economias (bloco 10)', () => {
  it('escolhe o sobrenome do casal', () => {
    expect(weddingNames('Tomé Varanda', 'Lia Sacada', 'host')).toEqual(['Tomé Varanda', 'Lia Varanda']);
    expect(weddingNames('Tomé Varanda', 'Lia Sacada', 'partner')).toEqual(['Tomé Sacada', 'Lia Sacada']);
    expect(weddingNames('Tomé Varanda', 'Lia Sacada', 'both')).toEqual(['Tomé Varanda Sacada', 'Lia Varanda Sacada']);
    expect(weddingNames('Tomé Varanda', 'Lia Sacada', 'keep')).toEqual(['Tomé Varanda', 'Lia Sacada']);
    expect(weddingNames('Tomé Varanda', 'Lia Varanda', 'both')).toEqual(['Tomé Varanda', 'Lia Varanda']);
  });

  it('vizinhos têm economias pelo cargo e trazem móveis pelo gosto', () => {
    const low = savingsOf({ id: 10, career: null });
    const high = savingsOf({ id: 10, career: { id: 'office', level: 8 } });
    expect(high).toBeGreaterThan(low);
    expect(savingsOf({ id: 10, career: null, funds: 7 })).toBe(7);
    expect(belongingsOf(CATALOG, { skills: { creativity: 500, logic: 10 }, traits: [] })).toEqual(['easel', 'plant']);
    expect(belongingsOf(CATALOG, { skills: {}, traits: ['caseiro'] })[0]).toBe('armchaircheap');
  });
});

describe('pedido de casamento (bloco 10)', () => {
  it('sem aliança não dá; com aliança, o sim vira noivado e leva o estojo', () => {
    const { sim, a, b } = couple(3);
    expect(availableSocials(sim.world, CATALOG, a, b).some((d) => d.id === 'propose')).toBe(true);
    expect(sim.dispatch({ type: 'queueSocial', folkId: a.id, otherId: b.id, socialId: 'propose' })).toBe(false);
    expect(sim.lastProblem).toBe('noRing');
    buyRing(sim);
    let engaged = false;
    for (let tries = 0; tries < 6 && !engaged; tries++) {
      for (const f of [a, b]) happy(f);
      sim.dispatch({ type: 'queueSocial', folkId: a.id, otherId: b.id, socialId: 'propose' });
      run(sim, 40);
      engaged = bondOf(sim.world, a.id, b.id) === 'engaged';
    }
    expect(engaged).toBe(true);
    expect(fianceOf(sim.world, a.id)).toBe(b.id);
    expect(fianceOf(sim.world, b.id)).toBe(a.id);
    expect(wearsRing(sim.world, b.id)).toBe(true);
    expect(sim.world.objects.some((o) => o.defId === 'ringbox')).toBe(false);
    expect(sim.world.news.some((n) => n.kind === 'engaged')).toBe(true);
    expect(romanceLabel(relationOf(sim.world, a.id, b.id))).toBe('rel.engaged');
    // noivo não pede de novo, nem outra pessoa
    expect(availableSocials(sim.world, CATALOG, a, b).some((d) => d.id === 'propose')).toBe(false);
  });

  it('a chance de aceitar sobe com o romance e cai com o mau humor', () => {
    const { sim, a, b } = couple(4);
    const def = CATALOG.socials.propose;
    love(sim, a.id, b.id, 70, 40);
    const lukewarm = acceptChance(sim.world, CATALOG, a, b, def);
    love(sim, a.id, b.id, 100, 80);
    const smitten = acceptChance(sim.world, CATALOG, a, b, def);
    expect(smitten).toBeGreaterThan(lukewarm);
    for (const k of Object.keys(b.needs) as (keyof Folk['needs'])[]) b.needs[k] = 5;
    expect(acceptChance(sim.world, CATALOG, a, b, def)).toBeLessThan(smitten);
    expect(lukewarm).toBeLessThan(0.97);
  });

  it('terminar o noivado desfaz tudo; casado não "termina", pede o divórcio', () => {
    const { sim, a, b } = couple(5);
    setBond(sim.world, a.id, b.id, 'engaged');
    expect(availableSocials(sim.world, CATALOG, a, b).some((d) => d.id === 'breakUp')).toBe(true);
    setBond(sim.world, a.id, b.id, 'married');
    const ids = availableSocials(sim.world, CATALOG, a, b).map((d) => d.id);
    expect(ids).not.toContain('breakUp');
    expect(ids).toContain('divorce');
    expect(ids).not.toContain('vows');
    // casamento não acaba sozinho quando o romance esfria
    for (const k of [`${a.id}>${b.id}`, `${b.id}>${a.id}`]) sim.world.relations[k].romance = 0;
    dailyHearts(sim.world, CATALOG, () => {});
    expect(spouseOf(sim.world, a.id)).toBe(b.id);
    // noivado sim
    setBond(sim.world, a.id, b.id, 'engaged');
    dailyHearts(sim.world, CATALOG, () => {});
    expect(bondOf(sim.world, a.id, b.id)).toBeNull();
  });
});

describe('casamento em casa (bloco 10)', () => {
  it('festa de casamento: votos, sobrenome novo, convidados lembram', () => {
    const { sim, a, b } = couple(6);
    setBond(sim.world, a.id, b.id, 'engaged');
    const guests = sim.world.neighbors.filter((n) => !isServiceNeighbor(n)).slice(0, 3);
    for (const g of guests) {
      for (const r of [a, b]) {
        const rel = ensureRelation(sim.world, g.id, r.id);
        rel.friendship = 60;
        ensureRelation(sim.world, r.id, g.id).friendship = 60;
      }
    }
    expect(sim.dispatch({ type: 'planWedding', folkId: a.id, partnerId: 999, guestIds: [], surname: 'host' })).toBe(false);
    expect(sim.lastProblem).toBe('notEngaged');
    expect(sim.dispatch({ type: 'planWedding', folkId: a.id, partnerId: b.id, guestIds: guests.map((g) => g.id), surname: 'host' })).toBe(true);
    until(sim, () => !!sim.world.party, 60);
    expect(sim.world.party?.wedding?.stage).toBe('waiting');
    until(sim, () => spouseOf(sim.world, a.id) !== 0, 4 * 60);
    expect(spouseOf(sim.world, a.id)).toBe(b.id);
    expect(b.name).toBe('Lia Varanda');
    expect(b.bornName).toBe('Lia Sacada');
    expect(sim.world.news.some((n) => n.kind === 'wedding' && n.about === a.id)).toBe(true);
    expect(relationOf(sim.world, a.id, b.id)?.memories.some((m) => m.kind === 'married')).toBe(true);
    const went = sim.world.folks.filter((f) => f.visit && relationOf(sim.world, f.id, a.id)?.memories.some((m) => m.kind === 'atWedding'));
    expect(went.length).toBeGreaterThan(0);
    until(sim, () => !sim.world.party, 5 * 60);
    expect(sim.world.lastParty).toBeTruthy();
    // a roupa de gala volta para a de sempre
    expect(a.outfit).toBe('day');
    expect(romanceLabel(relationOf(sim.world, a.id, b.id))).toBe('rel.married');
  });

  it('casar com alguém de fora: vem morar junto com as economias e a mala', () => {
    const sim = householdSim(7);
    at(sim, 10);
    const [a] = sim.residents();
    const n = sim.world.neighbors.find((x) => !isServiceNeighbor(x) && x.career)!;
    love(sim, a.id, n.id);
    setBond(sim.world, a.id, n.id, 'engaged');
    for (const f of sim.world.folks) {
      f.autonomy = false;
      happy(f);
    }
    const savings = savingsOf(n);
    expect(savings).toBeGreaterThan(0);
    const funds = sim.world.household.funds;
    expect(sim.dispatch({ type: 'planWedding', folkId: a.id, partnerId: n.id, guestIds: [], surname: 'partner' })).toBe(true);
    until(sim, () => spouseOf(sim.world, a.id) !== 0, 6 * 60);
    expect(spouseOf(sim.world, a.id)).toBe(n.id);
    const moved = sim.findFolk(n.id)!;
    expect(moved.visit).toBeNull();
    expect(sim.world.neighbors.some((x) => x.id === n.id)).toBe(false);
    expect(moved.job?.careerId).toBe(n.career!.id);
    expect(sim.world.household.funds).toBeGreaterThanOrEqual(funds + savings - 200);
    expect(a.name.endsWith(n.name.split(' ').slice(1).join(' '))).toBe(true);
    // a mala fica no chão até desfazer; aí vêm os móveis
    expect(sim.world.objects.some((o) => o.defId === 'suitcase')).toBe(true);
    const before = sim.world.objects.length;
    until(sim, () => !sim.world.objects.some((o) => o.defId === 'suitcase'), 3 * 60);
    expect(sim.world.objects.some((o) => o.defId === 'suitcase')).toBe(false);
    expect(sim.world.objects.length).toBeGreaterThanOrEqual(before);
    expect(sim.world.log.some((e) => e.key === 'log.unpacked' || e.key === 'log.noRoomSold')).toBe(true);
  });
});

describe('mudar para fora e divórcio (bloco 10)', () => {
  it('mandar alguém se mudar: vira vizinho e sai de mala; o último não sai', () => {
    const sim = householdSim(8);
    at(sim, 10);
    const [a, b] = sim.residents();
    for (const f of sim.world.folks) f.autonomy = false;
    expect(sim.dispatch({ type: 'takeJob', folkId: b.id, careerId: 'office' })).toBe(true);
    expect(sim.dispatch({ type: 'queueSocial', folkId: a.id, otherId: b.id, socialId: 'moveOut' })).toBe(true);
    until(sim, () => !!b.visit, 30);
    expect(b.visit?.moving).toBe(true);
    expect(b.job).toBeNull();
    const n = sim.world.neighbors.find((x) => x.id === b.id)!;
    expect(n).toBeTruthy();
    expect(n.career?.id).toBe('office');
    expect(sim.residents().map((f) => f.id)).toEqual([a.id]);
    expect(relationOf(sim.world, b.id, a.id)?.memories.some((m) => m.kind === 'toldToLeave')).toBe(true);
    until(sim, () => !sim.findFolk(b.id), 60);
    expect(sim.findFolk(b.id)).toBeUndefined();
    // e pode voltar de visita depois, com as relações de sempre
    expect(relationOf(sim.world, a.id, b.id)).toBeTruthy();
    const alone = sim.residents()[0];
    const fake = crowd([{ x: 1, y: 1 }, { x: 2, y: 1 }], { autonomy: false });
    expect(availableSocials(fake.world, CATALOG, fake.world.folks[0], fake.world.folks[1]).some((d) => d.id === 'moveOut')).toBe(false);
    expect(alone.id).toBe(a.id);
  });

  it('divórcio: quem foi deixado sai levando metade do caixa e volta ao nome de solteiro', () => {
    const { sim, a, b } = couple(9);
    setBond(sim.world, a.id, b.id, 'married');
    // casaram com o sobrenome dele
    b.bornName = b.name;
    b.name = 'Lia Varanda';
    sim.world.household.funds = 2000;
    expect(sim.dispatch({ type: 'queueSocial', folkId: a.id, otherId: b.id, socialId: 'divorce' })).toBe(true);
    until(sim, () => !!b.visit, 40);
    expect(spouseOf(sim.world, a.id)).toBe(0);
    expect(relationOf(sim.world, a.id, b.id)?.ex).toBe(true);
    expect(romanceLabel(relationOf(sim.world, a.id, b.id))).toBe('rel.exSpouse');
    expect(b.name).toBe('Lia Sacada');
    expect(sim.world.household.funds).toBe(1000);
    expect(sim.world.neighbors.find((x) => x.id === b.id)?.funds).toBe(1000);
    expect(relationOf(sim.world, b.id, a.id)?.memories.some((m) => m.kind === 'gotDivorced')).toBe(true);
    expect(sim.world.news.some((n) => n.kind === 'divorce' && n.about === a.id)).toBe(true);
    expect(sim.world.log.some((e) => e.key === 'log.divorce')).toBe(true);
  });
});

describe('cama de casal (bloco 10)', () => {
  it('deitar abraçadinho chama o par e sobe o romance; dormir junto vira lembrança', () => {
    const sim = crowd(
      [
        { name: 'Ana', x: 1, y: 4 },
        { name: 'Bruno', x: 6, y: 4 },
      ],
      { autonomy: false, objects: [{ defId: 'bedcouple', x: 3, y: 1 }] },
    );
    const [ana, bruno] = sim.world.folks;
    love(sim, ana.id, bruno.id, 50, 50);
    const bed = sim.world.objects.find((o) => o.defId === 'bedcouple')!;
    expect(sim.dispatch({ type: 'queueUse', folkId: ana.id, objectId: bed.id, interactionId: 'snuggle' })).toBe(true);
    until(sim, () => bruno.queue[0]?.interactionId === 'snuggle', 30);
    expect(bruno.queue[0]?.interactionId).toBe('snuggle');
    const before = relationOf(sim.world, ana.id, bruno.id)!.romance;
    run(sim, 30);
    expect(relationOf(sim.world, ana.id, bruno.id)!.romance).toBeGreaterThan(before);
    run(sim, 30);
    for (const f of [ana, bruno]) f.needs.energy = 10;
    sim.dispatch({ type: 'queueUse', folkId: ana.id, objectId: bed.id, interactionId: 'sleep' });
    sim.dispatch({ type: 'queueUse', folkId: bruno.id, objectId: bed.id, interactionId: 'sleep' });
    run(sim, 60);
    expect(relationOf(sim.world, ana.id, bruno.id)!.memories.some((m) => m.kind === 'sleptTogether')).toBe(true);
  });
});

describe('save v14 (bloco 10)', () => {
  it('save v13 ganha economias dos vizinhos; noivado vai e volta no save', () => {
    expect(SAVE_VERSION).toBeGreaterThanOrEqual(14);
    const { sim, a, b } = couple(10);
    setBond(sim.world, a.id, b.id, 'engaged');
    const file = serialize(sim.world, 0);
    const back = deserialize(JSON.parse(JSON.stringify(file)), { neighbors: NEIGHBORS });
    expect(bondOf(back.world, a.id, b.id)).toBe('engaged');
    const old = JSON.parse(JSON.stringify(file));
    old.version = 13;
    for (const n of old.world.neighbors) delete n.funds;
    const up = deserialize(old, { neighbors: NEIGHBORS, catalog: CATALOG });
    expect(up.version).toBe(SAVE_VERSION);
    for (const n of up.world.neighbors) expect(typeof n.funds).toBe('number');
  });
});

describe('semana headless do bloco 10', () => {
  it('casal casado com cama de casal aguenta sete dias', () => {
    const sim = householdSim(11);
    const [a, b] = sim.residents();
    love(sim, a.id, b.id);
    setBond(sim.world, a.id, b.id, 'married');
    // troca as duas camas de solteiro por uma de casal
    for (const bed of sim.world.objects.filter((o) => o.defId === 'bed')) sim.dispatch({ type: 'sell', objectId: bed.id });
    sim.world.household.funds += 1000;
    const spot = spotNear(sim.world, CATALOG, 'bedcouple', { x: 4, y: 2 })!;
    expect(sim.dispatch({ type: 'buy', defId: 'bedcouple', x: spot.x, y: spot.y, rot: spot.rot })).toBe(true);
    run(sim, 7 * MINUTES_PER_DAY);
    expect(spouseOf(sim.world, a.id)).toBe(b.id);
    for (const f of [a, b]) expect(f.needs.energy).toBeGreaterThan(0);
    expect(sim.world.log.filter((l) => l.key === 'log.collapse').length).toBeLessThan(4);
    expect(relationOf(sim.world, a.id, b.id)!.romance).toBeGreaterThan(40);
  });
});

describe('arco de flores (bloco 10)', () => {
  it('a cerimônia acontece na frente do arco (ou atrás, se a frente é parede)', () => {
    const { sim, a, b } = couple(12);
    setBond(sim.world, a.id, b.id, 'engaged');
    sim.world.household.funds += 1000;
    const spot = spotNear(sim.world, CATALOG, 'weddingarch', { x: 7, y: 8 })!;
    expect(sim.dispatch({ type: 'buy', defId: 'weddingarch', x: spot.x, y: spot.y, rot: spot.rot })).toBe(true);
    const arch = sim.world.objects.find((o) => o.defId === 'weddingarch')!;
    expect(sim.dispatch({ type: 'planWedding', folkId: a.id, partnerId: b.id, guestIds: [], surname: 'keep' })).toBe(true);
    let near = false;
    for (let m = 0; m < 5 * 60 && !spouseOf(sim.world, a.id); m++) {
      sim.step();
      const q = a.queue[0];
      if (q?.socialId === 'vows' && q.phase === 'using') {
        near = [a, b].every((f) => Math.abs(f.x - arch.x) + Math.abs(f.y - arch.y) <= 3);
      }
    }
    expect(spouseOf(sim.world, a.id)).toBe(b.id);
    expect(near).toBe(true);
    until(sim, () => !sim.world.party, 5 * 60);
    expect(sim.world.lastParty!.score).toBeGreaterThan(0);
  });
});
