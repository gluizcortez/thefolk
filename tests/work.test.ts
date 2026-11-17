import { describe, expect, it } from 'vitest';
import { CATALOG } from '../src/data/catalog';
import {
  EVENT_WAIT,
  MINUTES_PER_DAY,
  PROMOTE_AT,
  Sim,
  bossOf,
  bossRespectFor,
  coworkersOf,
  nextShift,
  raiseChance,
  relationOf,
  transferLevel,
  workRelationTerm,
  xpForLevel,
} from '../src/sim';
import type { Folk } from '../src/sim';
import { run, workSim } from './helpers';

function hired(seed = 5, careerId = 'office'): { sim: Sim; folk: Folk } {
  const sim = workSim(seed);
  const folk = sim.world.folks[0];
  expect(sim.dispatch({ type: 'takeJob', folkId: folk.id, careerId })).toBe(true);
  return { sim, folk };
}

function until(sim: Sim, tick: number): void {
  while (sim.world.tick < tick) sim.step();
}

/** Leva o folk até o começo do próximo turno, já fora de casa. */
function toWork(sim: Sim, folk: Folk): number {
  const shift = nextShift(CATALOG, folk, sim.world.tick)!;
  until(sim, shift.start + 1);
  expect(folk.away).not.toBeNull();
  return shift.end;
}

describe('chefe e colegas de verdade', () => {
  it('cada carreira tem um chefe e colegas que moram na vizinhança', () => {
    const { sim, folk } = hired();
    expect(bossOf(sim.world, 'office')?.name).toBe('Hermínia Cumeeira');
    const names = coworkersOf(sim.world, folk).map((c) => c.name);
    expect(names).toEqual(expect.arrayContaining(['Joaquim Pilastra', 'Rosa Cancela']));
    expect(names).not.toContain('Hermínia Cumeeira');
    // colegas da vizinhança já se conhecem pelo serviço
    const boss = bossOf(sim.world, 'office')!;
    const joaquim = sim.world.neighbors.find((n) => n.name === 'Joaquim Pilastra')!;
    expect(relationOf(sim.world, joaquim.id, boss.id)!.respect).toBeGreaterThan(10);
  });

  it('no primeiro dia o folk conhece todo mundo, e o convívio vira relação', () => {
    const { sim, folk } = hired();
    const boss = bossOf(sim.world, 'office')!;
    expect(relationOf(sim.world, folk.id, boss.id)).toBeUndefined();
    const end = toWork(sim, folk);
    expect(relationOf(sim.world, folk.id, boss.id)).toBeDefined();
    expect(sim.world.log.some((l) => l.key === 'log.metWorkplace')).toBe(true);
    folk.needs = { ...folk.needs, fun: 100, social: 100, comfort: 100, hunger: 100, energy: 100 };
    const mate = coworkersOf(sim.world, folk)[0];
    until(sim, end);
    expect(relationOf(sim.world, folk.id, mate.id)!.friendship).toBeGreaterThan(5);
  });

  it('o respeito do chefe e o clima com os colegas pesam no turno', () => {
    const { sim, folk } = hired();
    toWork(sim, folk);
    const boss = bossOf(sim.world, 'office')!;
    relationOf(sim.world, boss.id, folk.id)!.respect = 80;
    const good = workRelationTerm(sim.world, folk);
    relationOf(sim.world, boss.id, folk.id)!.respect = -80;
    const bad = workRelationTerm(sim.world, folk);
    expect(good).toBeGreaterThan(0);
    expect(bad).toBeLessThan(0);
  });
});

describe('eventos do expediente', () => {
  it('um evento aparece no turno e a escolha do jogador tem consequência', () => {
    const { sim, folk } = hired(7);
    toWork(sim, folk);
    folk.away!.event = null;
    folk.away!.nextEvent = sim.world.tick + 1;
    sim.step();
    sim.step();
    const ev = folk.away!.event as { defId: string } | null;
    expect(ev).not.toBeNull();
    expect(CATALOG.workEvents[ev!.defId]).toBeDefined();
    const before = JSON.stringify([folk.job, folk.needs, sim.world.relations, sim.world.household]);
    expect(sim.dispatch({ type: 'workChoice', folkId: folk.id, choice: 0 })).toBe(true);
    expect(folk.away!.event).toBeNull();
    expect(sim.world.log.some((l) => l.key === 'log.workResult')).toBe(true);
    // pelo menos algo mudou: desempenho, necessidades, relações ou dinheiro
    expect(JSON.stringify([folk.job, folk.needs, sim.world.relations, sim.world.household])).not.toBe(before);
    // sem evento pendente, a escolha é recusada
    expect(sim.dispatch({ type: 'workChoice', folkId: folk.id, choice: 0 })).toBe(false);
    expect(sim.lastProblem).toBe('noEvent');
  });

  it('sem resposta do jogador, o folk decide sozinho', () => {
    const { sim, folk } = hired(8);
    toWork(sim, folk);
    folk.away!.event = { defId: 'deadline', actorId: 0, deadline: sim.world.tick + EVENT_WAIT };
    folk.away!.nextEvent = -1;
    run(sim, EVENT_WAIT + 1);
    expect(folk.away!.event).toBeNull();
    expect(sim.world.log.some((l) => l.key === 'log.workAuto')).toBe(true);
  });

  it('ser dedurado por roubar crédito vira fofoca sobre o colega', () => {
    const { sim, folk } = hired(9);
    toWork(sim, folk);
    const rosa = sim.world.neighbors.find((n) => n.name === 'Rosa Cancela')!;
    const choice = CATALOG.workEvents.creditThief.choices[0];
    folk.skills.charisma = xpForLevel(10);
    // força o sucesso: tenta algumas vezes até a sorte ajudar
    let news = sim.world.news.find((n) => n.kind === 'tookCredit');
    for (let i = 0; i < 20 && !news; i++) {
      folk.away!.event = { defId: 'creditThief', actorId: rosa.id, deadline: sim.world.tick + 60 };
      sim.dispatch({ type: 'workChoice', folkId: folk.id, choice: 0 });
      news = sim.world.news.find((n) => n.kind === 'tookCredit');
    }
    expect(choice.check).toBeDefined();
    expect(news?.about).toBe(rosa.id);
    expect(relationOf(sim.world, folk.id, rosa.id)!.memories.some((m) => m.kind === 'tookCredit')).toBe(true);
  });
});

describe('promoção, demissão e aumento', () => {
  it('o chefe precisa respeitar o folk para promover', () => {
    const { sim, folk } = hired();
    folk.skills.logic = xpForLevel(2);
    toWork(sim, folk);
    folk.away!.nextEvent = -1;
    const boss = bossOf(sim.world, 'office')!;
    relationOf(sim.world, boss.id, folk.id)!.respect = -20;
    folk.job!.performance = PROMOTE_AT + 20;
    folk.needs = { ...folk.needs, fun: 100, social: 100, comfort: 100, hunger: 100, energy: 100 };
    until(sim, folk.away!.until);
    expect(folk.job!.level).toBe(0);
    expect(sim.world.log.some((l) => l.key === 'log.bossHeldBack')).toBe(true);

    toWork(sim, folk);
    folk.away!.nextEvent = -1;
    relationOf(sim.world, boss.id, folk.id)!.respect = bossRespectFor(1) + 20;
    folk.job!.performance = PROMOTE_AT + 20;
    until(sim, folk.away!.until);
    expect(folk.job!.level).toBe(1);
    // promoção vira notícia
    expect(sim.world.news.some((n) => n.kind === 'promoted' && n.about === folk.id)).toBe(true);
  });

  it('chefe que não suporta o folk demite, mesmo sem desempenho no fundo', () => {
    const { sim, folk } = hired();
    toWork(sim, folk);
    folk.away!.nextEvent = -1;
    const boss = bossOf(sim.world, 'office')!;
    relationOf(sim.world, boss.id, folk.id)!.respect = -90;
    folk.job!.performance = -10;
    until(sim, folk.away!.until);
    expect(folk.job).toBeNull();
    expect(sim.world.log.some((l) => l.key === 'log.firedByBoss')).toBe(true);
  });

  it('pedir aumento: uma vez a cada três dias, resolvido com o chefe no fim do turno', () => {
    let granted = 0;
    for (let seed = 1; seed <= 6; seed++) {
      const { sim, folk } = hired(seed);
      expect(sim.dispatch({ type: 'askRaise', folkId: folk.id })).toBe(true);
      expect(sim.dispatch({ type: 'askRaise', folkId: folk.id })).toBe(false);
      expect(sim.lastProblem).toBe('raiseTooSoon');
      toWork(sim, folk);
      folk.away!.nextEvent = -1;
      const boss = bossOf(sim.world, 'office')!;
      relationOf(sim.world, boss.id, folk.id)!.respect = 90;
      folk.job!.performance = 90;
      expect(raiseChance(sim.world, folk)).toBeGreaterThan(0.8);
      const funds = sim.world.household.funds;
      until(sim, folk.away!.until);
      expect(folk.job!.raisePending).toBe(false);
      if (folk.job!.raise > 0) {
        granted++;
        // o próximo turno já paga com aumento
        const next = toWork(sim, folk);
        const mid = sim.world.household.funds;
        until(sim, next);
        expect(sim.world.household.funds - mid).toBeGreaterThanOrEqual(Math.round(CATALOG.careers.office.levels[0].pay * 1.1) - 50);
        expect(sim.world.household.funds).toBeGreaterThan(funds);
      }
    }
    expect(granted).toBeGreaterThanOrEqual(3);
  });

  it('com o chefe de mal, a chance de aumento é baixa', () => {
    const { sim, folk } = hired();
    const boss = bossOf(sim.world, 'office')!;
    toWork(sim, folk);
    relationOf(sim.world, boss.id, folk.id)!.respect = -60;
    folk.job!.performance = -20;
    expect(raiseChance(sim.world, folk)).toBeLessThan(0.1);
  });

  it('troca de área leva parte da experiência', () => {
    const { sim, folk } = hired();
    folk.job!.level = 3;
    folk.skills = { creativity: xpForLevel(4), charisma: xpForLevel(3), logic: xpForLevel(5) };
    expect(transferLevel(folk, folk.job, CATALOG.careers.studio)).toBe(2);
    expect(sim.dispatch({ type: 'takeJob', folkId: folk.id, careerId: 'studio' })).toBe(true);
    expect(folk.job!.level).toBe(2);
    expect(sim.world.log.some((l) => l.key === 'log.switched')).toBe(true);
  });
});

describe('determinismo com o dia de trabalho completo', () => {
  it('uma semana com eventos, fofoca e vizinhos dá sempre o mesmo resultado', () => {
    const a = hired(21);
    const b = hired(21);
    run(a.sim, 7 * MINUTES_PER_DAY);
    run(b.sim, 7 * MINUTES_PER_DAY);
    expect(JSON.stringify(a.sim.world)).toBe(JSON.stringify(b.sim.world));
    expect(a.folk.job!.shifts).toBeGreaterThanOrEqual(4);
    // houve eventos no expediente
    expect(a.sim.world.log.some((l) => l.key === 'log.workAuto' || l.key === 'log.workResult') || a.folk.job!.shifts > 0).toBe(true);
  });
});
