import { describe, expect, it } from 'vitest';
import { CATALOG } from '../src/data/catalog';
import {
  CALL_AHEAD,
  FIRE_AT,
  MINUTES_PER_DAY,
  PROMOTE_AT,
  Sim,
  nextShift,
  shiftOn,
  xpForLevel,
} from '../src/sim';
import type { Folk } from '../src/sim';
import { run, starterSim } from './helpers';

const office = CATALOG.careers.office;

function hired(seed = 5): { sim: Sim; folk: Folk } {
  const sim = starterSim(seed);
  const folk = sim.world.folks[0];
  expect(sim.dispatch({ type: 'takeJob', folkId: folk.id, careerId: 'office' })).toBe(true);
  return { sim, folk };
}

/** Avança até o minuto pedido. */
function until(sim: Sim, tick: number): void {
  while (sim.world.tick < tick) sim.step();
}

describe('emprego', () => {
  it('o jogo começa na segunda e o turno respeita os dias da carreira', () => {
    const level = office.levels[0];
    expect(shiftOn(level, 0)?.start).toBe(level.startHour * 60);
    expect(shiftOn(level, 5)).toBeNull(); // sábado
    expect(shiftOn(level, 7)).not.toBeNull(); // segunda seguinte
  });

  it('chamado antes do turno, vai até a calçada, some de casa e volta pago', () => {
    const { sim, folk } = hired();
    const shift = nextShift(CATALOG, folk, sim.world.tick)!;
    expect(shift.day).toBe(0);
    until(sim, shift.start - CALL_AHEAD);
    expect(folk.queue[0]?.kind).toBe('work');
    expect(sim.world.log.some((l) => l.key === 'log.workCall')).toBe(true);
    until(sim, shift.start);
    expect(folk.away).not.toBeNull();
    expect(folk.queue).toHaveLength(0);
    // ordens não chegam a quem está fora
    expect(sim.dispatch({ type: 'queueGoto', folkId: folk.id, x: 8, y: 8 })).toBe(false);
    expect(sim.lastProblem).toBe('away');

    const funds = sim.world.household.funds;
    until(sim, shift.end);
    expect(folk.away).toBeNull();
    expect([folk.x, folk.y]).toEqual([sim.world.exit.x, sim.world.exit.y]);
    expect(sim.world.household.funds).toBe(funds + office.levels[0].pay);
    expect(folk.job!.shifts).toBe(1);
    expect(sim.world.log.some((l) => l.key === 'log.backFromWork')).toBe(true);
  });

  it('no trabalho as necessidades caem, mas sem acidente nem desmaio', () => {
    const { sim, folk } = hired();
    const shift = nextShift(CATALOG, folk, sim.world.tick)!;
    until(sim, shift.start + 1);
    folk.needs.energy = 4;
    folk.needs.bladder = 1;
    until(sim, shift.end - 1);
    expect(folk.needs.energy).toBeGreaterThanOrEqual(3);
    expect(folk.collapsed).toBe(0);
    expect(sim.world.log.some((l) => l.key === 'log.accident')).toBe(false);
  });

  it('se o jogador cancela a ida, o folk perde o turno e o desempenho cai', () => {
    const { sim, folk } = hired();
    const shift = nextShift(CATALOG, folk, sim.world.tick)!;
    until(sim, shift.start - CALL_AHEAD);
    sim.dispatch({ type: 'cancel', folkId: folk.id, actionId: folk.queue[0].id });
    until(sim, shift.end);
    expect(folk.away).toBeNull();
    expect(folk.job!.performance).toBeLessThan(0);
    expect(sim.world.log.some((l) => l.key === 'log.missedWork')).toBe(true);
  });

  it('faltar seguidamente leva à demissão', () => {
    const { sim, folk } = hired();
    folk.job!.performance = FIRE_AT + 10;
    const shift = nextShift(CATALOG, folk, sim.world.tick)!;
    until(sim, shift.start - CALL_AHEAD);
    folk.queue = [];
    until(sim, shift.start + 61);
    expect(folk.job).toBeNull();
    expect(sim.world.log.some((l) => l.key === 'log.fired')).toBe(true);
  });

  it('promoção exige desempenho e as habilidades do próximo cargo', () => {
    const { sim, folk } = hired();
    folk.job!.performance = PROMOTE_AT + 5;
    folk.needs = { ...folk.needs, fun: 100, social: 100, comfort: 100, hunger: 100, energy: 100 };
    let shift = nextShift(CATALOG, folk, sim.world.tick)!;
    until(sim, shift.end);
    // sem raciocínio 2, fica no mesmo cargo
    expect(folk.job!.level).toBe(0);
    expect(sim.world.log.some((l) => l.key === 'log.needSkills')).toBe(true);

    folk.skills.logic = xpForLevel(2);
    // o turno anterior pode ter custado desempenho (humor, evento do expediente)
    folk.job!.performance = PROMOTE_AT + 5;
    shift = nextShift(CATALOG, folk, sim.world.tick)!;
    until(sim, shift.end);
    expect(folk.job!.level).toBe(1);
    expect(sim.world.log.some((l) => l.key === 'log.promoted')).toBe(true);
  });

  it('pedir demissão e trocar de área', () => {
    const { sim, folk } = hired();
    expect(sim.dispatch({ type: 'takeJob', folkId: folk.id, careerId: 'office' })).toBe(false);
    expect(sim.dispatch({ type: 'takeJob', folkId: folk.id, careerId: 'studio' })).toBe(true);
    expect(folk.job!.careerId).toBe('studio');
    expect(sim.dispatch({ type: 'quitJob', folkId: folk.id })).toBe(true);
    expect(folk.job).toBeNull();
  });

  it('um mês de trabalho com IA ligada: o folk vai trabalhar e o caixa sobe', () => {
    const { sim, folk } = hired(11);
    const start = sim.world.household.funds;
    run(sim, 28 * MINUTES_PER_DAY);
    expect(folk.job).not.toBeNull();
    expect(folk.job!.shifts).toBeGreaterThanOrEqual(15);
    expect(sim.world.household.funds).toBeGreaterThan(start);
  });
});
