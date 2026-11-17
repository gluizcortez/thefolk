import { describe, expect, it } from 'vitest';
import { CATALOG } from '../src/data/catalog';
import { chooseAutonomous, fullNeeds, scoreOptions, urgency } from '../src/sim';
import { openField, run, starterSim } from './helpers';

function bestDef(sim: ReturnType<typeof starterSim>) {
  const folk = sim.world.folks[0];
  const best = scoreOptions(sim.world, CATALOG, folk, sim.getNav())[0];
  return sim.findObject(best.objectId!)!.defId;
}

describe('IA por utilidade', () => {
  it('a urgência cresce quando a necessidade está baixa', () => {
    expect(urgency(10)).toBeGreaterThan(urgency(50));
    expect(urgency(50)).toBeGreaterThan(urgency(90));
  });

  it('escolhe o objeto que atende a necessidade mais urgente', () => {
    expect(bestDef(starterSim(1, { ...fullNeeds(85), hunger: 10 }))).toBe('fridge');
    expect(bestDef(starterSim(1, { ...fullNeeds(85), energy: 8 }))).toBe('bed');
    expect(bestDef(starterSim(1, { ...fullNeeds(85), bladder: 10 }))).toBe('toilet');
    expect(bestDef(starterSim(1, { ...fullNeeds(85), hygiene: 10 }))).toBe('shower');
    expect(bestDef(starterSim(1, { ...fullNeeds(85), social: 10 }))).toBe('phone');
  });

  it('entre objetos iguais, prefere o mais perto', () => {
    const sim = openField(
      12,
      3,
      [
        { defId: 'fridge', x: 10, y: 1 },
        { defId: 'fridge', x: 3, y: 1 },
      ],
      { x: 1, y: 1, needs: { ...fullNeeds(90), hunger: 20 } },
    );
    const options = scoreOptions(sim.world, CATALOG, sim.world.folks[0], sim.getNav());
    const near = sim.world.objects[1];
    expect(options[0].objectId).toBe(near.id);
  });

  it('ignora objetos inalcançáveis e interações não autônomas', () => {
    const sim = openField(
      5,
      3,
      [
        // geladeira cercada por abajures: ninguém chega nela
        { defId: 'fridge', x: 4, y: 0 },
        { defId: 'lamp', x: 3, y: 0 },
        { defId: 'lamp', x: 4, y: 1 },
        { defId: 'bed', x: 0, y: 0 },
      ],
      { x: 2, y: 2, needs: { ...fullNeeds(90), hunger: 5, energy: 30 } },
    );
    const options = scoreOptions(sim.world, CATALOG, sim.world.folks[0], sim.getNav());
    expect(options.some((o) => sim.findObject(o.objectId!)!.defId === 'fridge')).toBe(false);
    expect(options.some((o) => o.interactionId === 'nap')).toBe(false);
    expect(options.some((o) => o.interactionId === 'sleep')).toBe(true);
  });

  it('personalidade muda a nota: o tagarela valoriza mais o telefone', () => {
    const needs = { ...fullNeeds(60) };
    const plain = openField(5, 3, [{ defId: 'phone', x: 3, y: 1 }], { x: 1, y: 1, needs });
    const chatty = openField(5, 3, [{ defId: 'phone', x: 3, y: 1 }], {
      x: 1,
      y: 1,
      needs,
      traits: ['tagarela'],
    });
    const a = scoreOptions(plain.world, CATALOG, plain.world.folks[0], plain.getNav())[0];
    const b = scoreOptions(chatty.world, CATALOG, chatty.world.folks[0], chatty.getNav())[0];
    expect(b.score).toBeGreaterThan(a.score);
  });

  it('não faz nada quando está tudo bem', () => {
    const sim = openField(5, 3, [{ defId: 'fridge', x: 3, y: 1 }], {
      x: 1,
      y: 1,
      needs: fullNeeds(100),
    });
    expect(chooseAutonomous(sim.world, CATALOG, sim.world.folks[0], sim.getNav())).toBeNull();
  });

  it('o folk parado age sozinho; com autonomia desligada, não', () => {
    const auto = starterSim(3, { ...fullNeeds(85), hunger: 10 });
    run(auto, 5);
    const action = auto.world.folks[0].queue[0];
    expect(action?.source).toBe('auto');
    expect(auto.findObject(action.objectId!)!.defId).toBe('fridge');

    const manual = starterSim(3, { ...fullNeeds(85), hunger: 10 });
    manual.world.folks[0].autonomy = false;
    run(manual, 30);
    expect(manual.world.folks[0].queue).toHaveLength(0);
  });
});
