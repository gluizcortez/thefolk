import { describe, expect, it } from 'vitest';
import { CATALOG } from '../src/data/catalog';
import { NEED_IDS, ambienceTarget, fullNeeds, moodOf } from '../src/sim';
import { openField, run, starterSim } from './helpers';
import { TestPlayer } from './helpers/player';

describe('necessidades', () => {
  it('decaem com o tempo e nunca saem de 0..100', () => {
    const sim = openField(5, 5, [], { x: 2, y: 2, needs: fullNeeds(100) });
    const folk = sim.world.folks[0];
    run(sim, 60);
    for (const id of NEED_IDS) {
      if (id === 'ambience') continue;
      expect(folk.needs[id]).toBeLessThan(100);
      expect(folk.needs[id]).toBeCloseTo(100 - CATALOG.needs[id].decayPerMinute * 60, 5);
    }
    run(sim, 5000);
    for (const id of NEED_IDS) {
      expect(folk.needs[id]).toBeGreaterThanOrEqual(0);
      expect(folk.needs[id]).toBeLessThanOrEqual(100);
    }
  });

  it('traços mudam a velocidade do decaimento', () => {
    const plain = openField(5, 5, [], { x: 2, y: 2, needs: fullNeeds(100) });
    const chatty = openField(5, 5, [], { x: 2, y: 2, needs: fullNeeds(100), traits: ['tagarela'] });
    run(plain, 100);
    run(chatty, 100);
    expect(chatty.world.folks[0].needs.social).toBeLessThan(plain.world.folks[0].needs.social);
    expect(chatty.world.folks[0].needs.hunger).toBeCloseTo(plain.world.folks[0].needs.hunger, 8);
  });

  it('usar um objeto recupera a necessidade e termina quando enche', () => {
    const sim = openField(5, 5, [{ defId: 'fridge', x: 3, y: 2 }], {
      x: 2,
      y: 2,
      needs: { ...fullNeeds(90), hunger: 20 },
    });
    const folk = sim.world.folks[0];
    const fridge = sim.world.objects[0];
    sim.dispatch({ type: 'queueUse', folkId: folk.id, objectId: fridge.id, interactionId: 'meal' });
    run(sim, 10);
    expect(folk.needs.hunger).toBeGreaterThan(30);
    run(sim, 60);
    expect(folk.needs.hunger).toBeGreaterThan(90);
    expect(folk.queue).toHaveLength(0);
  });

  it('humor cai muito quando uma única necessidade está no vermelho', () => {
    const good = moodOf(CATALOG, fullNeeds(80));
    const oneBad = moodOf(CATALOG, { ...fullNeeds(80), hunger: 5 });
    const naiveAverage = (80 * 7 + 5) / 8;
    expect(good).toBeCloseTo(80, 5);
    expect(oneBad).toBeLessThan(naiveAverage);
  });

  it('ambiente tende ao que há por perto', () => {
    const bare = openField(9, 9, [], { x: 4, y: 4, needs: fullNeeds(50) });
    const nice = openField(
      9,
      9,
      [
        { defId: 'plant', x: 3, y: 4 },
        { defId: 'lamp', x: 5, y: 4 },
      ],
      { x: 4, y: 4, needs: fullNeeds(50) },
    );
    expect(ambienceTarget(nice.world, CATALOG, nice.world.folks[0])).toBeGreaterThan(
      ambienceTarget(bare.world, CATALOG, bare.world.folks[0]),
    );
    run(bare, 120);
    run(nice, 120);
    expect(nice.world.folks[0].needs.ambience).toBeGreaterThan(bare.world.folks[0].needs.ambience);
  });

  it('bexiga no zero causa um acidente; energia no zero causa desmaio', () => {
    const sim = openField(5, 5, [], { x: 2, y: 2, needs: { ...fullNeeds(90), bladder: 0.1 } });
    run(sim, 2);
    const folk = sim.world.folks[0];
    expect(folk.needs.bladder).toBeGreaterThan(90);
    expect(folk.needs.hygiene).toBeLessThan(20);
    expect(sim.world.log.some((l) => l.key === 'log.accident')).toBe(true);

    const tired = openField(5, 5, [], { x: 2, y: 2, needs: { ...fullNeeds(90), energy: 0.05 } });
    run(tired, 2);
    expect(tired.world.folks[0].collapsed).toBeGreaterThan(0);
    run(tired, 200);
    expect(tired.world.folks[0].collapsed).toBe(0);
    expect(tired.world.folks[0].needs.energy).toBeGreaterThan(20);
  });

  it('com o jogador de teste, um folk sobrevive vários dias na casa inicial', () => {
    const sim = starterSim(7);
    const player = new TestPlayer(sim);
    const folk = sim.world.folks[0];
    let collapses = 0;
    let moodSum = 0;
    const total = 5 * 1440;
    for (let i = 0; i < total; i++) {
      player.step();
      moodSum += moodOf(CATALOG, folk.needs);
    }
    collapses = sim.world.log.filter((l) => l.key === 'log.collapse').length;
    expect(collapses).toBe(0);
    expect(moodSum / total).toBeGreaterThan(55);
    expect(folk.needs.hunger).toBeGreaterThan(5);
  });
});
