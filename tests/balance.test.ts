import { describe, expect, it } from 'vitest';
import { CATALOG } from '../src/data/catalog';
import { CITY } from '../src/data/city';
import { starterHouse } from '../src/data/house';
import { AID, GROCERIES, Sim, carryable, createWorld, foundTown, lootTarget, needsAid } from '../src/sim';
import { play } from './helpers/player';

/** Plano 2, bloco 15: equilíbrio com o jogador de teste (sem jogo sozinho, tempo lento). */
function town(jobs: string[]): Sim {
  const world = createWorld(starterHouse(5));
  foundTown(world, CATALOG, CITY);
  const sim = new Sim(CATALOG, world);
  const adults = world.folks.filter((f) => !f.visit);
  jobs.forEach((careerId, i) => expect(sim.dispatch({ type: 'takeJob', folkId: adults[i].id, careerId })).toBe(true));
  return sim;
}

const family = (sim: Sim) => [...sim.world.folks, ...(sim.world.outing?.home.folks ?? [])].filter((f) => !f.visit);

describe('plano 2, bloco 15: equilíbrio de quatro semanas', () => {
  it('família parada, sem emprego: o dinheiro acaba mas ninguém morre de fome (cesta da prefeitura)', () => {
    const sim = town([]);
    play(sim, 28 * 1440, 5);
    expect(family(sim)).toHaveLength(2);
    expect(sim.world.log.some((e) => e.key.startsWith('log.died'))).toBe(false);
    expect(sim.world.household.aidAt).toBeDefined();
  }, 120_000);

  it('um emprego no primeiro cargo quase empata as contas; dois juntam dinheiro', () => {
    const one = town(['office']);
    play(one, 28 * 1440, 5);
    expect(family(one)).toHaveLength(2);
    expect(one.world.household.funds).toBeGreaterThan(1150);
    expect(one.world.household.funds).toBeLessThan(2200);
    const two = town(['office', 'kitchen']);
    play(two, 28 * 1440, 5);
    expect(family(two)).toHaveLength(2);
    expect(two.world.household.funds).toBeGreaterThan(2400);
  }, 240_000);

  it('a cesta só vem para casa sem comida, sem nada a caminho e sem dinheiro, e não todo dia', () => {
    const sim = town([]);
    const w = sim.world;
    w.household.pantry = 0;
    w.household.funds = GROCERIES.price;
    expect(needsAid(w, CATALOG)).toBe(false);
    w.household.funds = 10;
    expect(needsAid(w, CATALOG)).toBe(true);
    w.tick = 9 * 60 + 59;
    sim.step();
    expect(w.log.some((e) => e.key === 'log.aidSent')).toBe(true);
    expect(w.household.orders.some((o) => o.kind === 'groceries' && o.price === 0)).toBe(true);
    // já está a caminho: não pede outra
    expect(needsAid(w, CATALOG)).toBe(false);
    w.household.orders = [];
    w.tick += (AID.everyDays - 1) * 1440;
    expect(needsAid(w, CATALOG)).toBe(false);
    w.tick += 1440;
    expect(needsAid(w, CATALOG)).toBe(true);
  });

  it('o gatuno não leva geladeira, fogão, cama nem vaso', () => {
    for (const id of ['fridge', 'stove', 'bed', 'toilet']) expect(carryable(CATALOG.objects[id]), id).toBe(false);
    expect(carryable(CATALOG.objects.tv)).toBe(true);
    const sim = town([]);
    const loot = lootTarget(sim.world, CATALOG, () => true);
    expect(loot).not.toBeNull();
    expect(carryable(CATALOG.objects[loot!.defId])).toBe(true);
  });
});
