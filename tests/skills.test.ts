import { describe, expect, it } from 'vitest';
import { MAX_SKILL_LEVEL, levelOf, levelProgress, skillLevel, trainSkill, xpForLevel } from '../src/sim';
import { CATALOG } from '../src/data/catalog';
import { openField, run } from './helpers';

describe('habilidades', () => {
  it('curva de experiência: cada nível custa mais que o anterior', () => {
    expect(levelOf(0)).toBe(0);
    expect(levelOf(xpForLevel(1) - 0.01)).toBe(0);
    expect(levelOf(xpForLevel(1))).toBe(1);
    expect(levelOf(xpForLevel(5))).toBe(5);
    expect(levelOf(1e9)).toBe(MAX_SKILL_LEVEL);
    for (let n = 1; n < MAX_SKILL_LEVEL; n++) {
      expect(xpForLevel(n + 1) - xpForLevel(n)).toBeGreaterThan(xpForLevel(n) - xpForLevel(n - 1));
    }
    expect(levelProgress(xpForLevel(2) + (xpForLevel(3) - xpForLevel(2)) / 2)).toBeCloseTo(0.5);
  });

  it('usar um objeto de treino sobe a habilidade e avisa no log', () => {
    const sim = openField(6, 6, [{ defId: 'easel', x: 2, y: 2 }], { x: 2, y: 4, needs: { fun: 0 } });
    const folk = sim.world.folks[0];
    sim.dispatch({ type: 'queueUse', folkId: folk.id, objectId: sim.world.objects[0].id, interactionId: 'paint' });
    run(sim, 70);
    expect(folk.skills.creativity).toBeGreaterThan(40);
    expect(skillLevel(folk, 'creativity')).toBe(1);
    expect(sim.world.log.some((l) => l.key === 'log.skillUp')).toBe(true);
  });

  it('de mau humor o treino rende metade (bloco 6: quando ele ainda topa treinar)', () => {
    const it = CATALOG.objects.recorder.interactions.find((i) => i.id === 'rehearse')!;
    const happy = openField(6, 6, [], { x: 2, y: 3 }).world.folks[0];
    const grumpy = openField(6, 6, [], { x: 2, y: 3 }).world.folks[0];
    for (let m = 0; m < 20; m++) {
      trainSkill(happy, it, 80);
      trainSkill(grumpy, it, 20);
    }
    const a = happy.skills.charisma;
    const b = grumpy.skills.charisma;
    expect(b).toBeGreaterThan(0);
    expect(b).toBeLessThan(a * 0.75);
  });

  it('quem cozinha melhor mata mais a fome por minuto', () => {
    const novice = openField(6, 6, [{ defId: 'fridge', x: 2, y: 2 }], { x: 2, y: 3, needs: { hunger: 10 } });
    const chef = openField(6, 6, [{ defId: 'fridge', x: 2, y: 2 }], {
      x: 2,
      y: 3,
      needs: { hunger: 10 },
      skills: { cooking: xpForLevel(8) },
    });
    for (const sim of [novice, chef]) {
      const folk = sim.world.folks[0];
      sim.dispatch({ type: 'queueUse', folkId: folk.id, objectId: sim.world.objects[0].id, interactionId: 'meal' });
      run(sim, 12);
    }
    expect(chef.world.folks[0].needs.hunger).toBeGreaterThan(novice.world.folks[0].needs.hunger + 5);
  });
});
