import { describe, expect, it } from 'vitest';
import { CATALOG } from '../src/data/catalog';
import { SAVE_VERSION, SaveError, Sim, clockOf, deserialize, formatClock, serialize } from '../src/sim';
import { run, starterSim } from './helpers';

describe('determinismo e save', () => {
  it('mesma seed, mesmo futuro; seeds diferentes divergem', () => {
    const a = starterSim(42);
    const b = starterSim(42);
    const c = starterSim(43);
    run(a, 3000);
    run(b, 3000);
    run(c, 3000);
    expect(JSON.stringify(a.world)).toBe(JSON.stringify(b.world));
    expect(JSON.stringify(a.world)).not.toBe(JSON.stringify(c.world));
  });

  it('salvar e carregar no meio continua exatamente igual', () => {
    const original = starterSim(9);
    run(original, 1234);
    const file = JSON.parse(JSON.stringify(serialize(original.world, 111)));
    const restored = new Sim(CATALOG, deserialize(file).world);
    run(original, 2000);
    run(restored, 2000);
    expect(JSON.stringify(restored.world)).toBe(JSON.stringify(original.world));
  });

  it('o save é versionado e rejeita lixo', () => {
    const sim = starterSim();
    const file = serialize(sim.world, 5);
    expect(file.version).toBe(SAVE_VERSION);
    expect(deserialize(file).savedAt).toBe(5);
    expect(() => deserialize(null)).toThrow(SaveError);
    expect(() => deserialize({ world: sim.world })).toThrow(SaveError);
    expect(() => deserialize({ version: SAVE_VERSION + 1, world: sim.world })).toThrow(SaveError);
    expect(() => deserialize({ version: SAVE_VERSION, world: { tick: 'x' } })).toThrow(SaveError);
  });

  it('relógio: 1 tick = 1 minuto', () => {
    expect(clockOf(0)).toMatchObject({ day: 1, hour: 0, minute: 0 });
    expect(clockOf(7 * 60 + 5)).toMatchObject({ day: 1, hour: 7, minute: 5 });
    expect(clockOf(1440 + 61)).toMatchObject({ day: 2, hour: 1, minute: 1 });
    expect(formatClock(23 * 60 + 9)).toBe('23:09');
    const sim = starterSim();
    const before = sim.world.tick;
    run(sim, 90);
    expect(sim.world.tick).toBe(before + 90);
  });
});

describe('migração de save', () => {
  it('um save da fatia 1 (versão 1) carrega com dinheiro, habilidades e sem emprego', () => {
    const sim = starterSim(4);
    const v1 = JSON.parse(JSON.stringify({ version: 1, savedAt: 9, world: sim.world }));
    delete v1.world.household;
    delete v1.world.exit;
    for (const o of v1.world.objects) {
      delete o.rot;
      delete o.paid;
    }
    for (const f of v1.world.folks) {
      delete f.skills;
      delete f.job;
      delete f.away;
    }
    const file = deserialize(v1);
    expect(file.version).toBe(SAVE_VERSION);
    const world = file.world;
    expect(world.household.funds).toBeGreaterThan(0);
    expect(world.household.nextBills).toBeGreaterThan(world.tick);
    expect(world.exit).toEqual(sim.world.exit);
    expect(world.objects.every((o) => o.rot === 0 && o.paid === 0)).toBe(true);
    expect(world.folks[0]).toMatchObject({ skills: {}, job: null, away: null });
    // e o jogo segue rodando normalmente
    const startTick = world.tick;
    const restored = new Sim(CATALOG, world);
    run(restored, 3000);
    expect(restored.world.tick).toBe(startTick + 3000);
  });
});
