import { describe, expect, it } from 'vitest';
import { CATALOG } from '../src/data/catalog';
import type { Action, Folk, Mess, Sim } from '../src/sim';
import {
  HOME_DISHES,
  SPOIL_MINUTES,
  WARM_MINUTES,
  burnChance,
  feelingsOf,
  isLitter,
  isWarm,
  messLevel,
  servedFactor,
  xpForLevel,
} from '../src/sim';
import { householdSim, openField, run } from './helpers';

// Plano 2, bloco 6: cozinha em etapas, travessa com porções, mesa, louça na
// pia, banheiro e cama.

const KITCHEN = [
  { defId: 'fridge', x: 1, y: 1 },
  { defId: 'counter', x: 3, y: 1 },
  { defId: 'stove', x: 4, y: 1 },
  { defId: 'kitchensink', x: 6, y: 1 },
  { defId: 'trashcan', x: 7, y: 1 },
  { defId: 'dinette', x: 2, y: 5 },
  { defId: 'chair', x: 2, y: 6, rot: 2 as const },
  { defId: 'chair', x: 3, y: 6, rot: 2 as const },
];

function kitchen(skills: Record<string, number> = {}, seed = 1): { sim: Sim; folk: Folk } {
  const sim = openField(10, 9, KITCHEN, { x: 5, y: 3, needs: { hunger: 40, energy: 90, bladder: 90, hygiene: 90, comfort: 90, fun: 90, social: 90 }, skills }, seed);
  return { sim, folk: sim.world.folks[0] };
}

const obj = (sim: Sim, defId: string) => sim.world.objects.find((o) => o.defId === defId)!;
const meals = (sim: Sim): Mess[] => sim.world.mess.filter((m) => m.kind === 'meal');

/** Roda até a fila esvaziar, guardando por onde a ação passou (objeto:interação). */
function trace(sim: Sim, folk: Folk, limit = 300): string[] {
  const seen: string[] = [];
  for (let i = 0; i < limit && folk.queue.length > 0; i++) {
    const a: Action = folk.queue[0];
    if (a.phase === 'using') {
      const o = a.objectId !== undefined ? sim.findObject(a.objectId) : undefined;
      const tag = a.kind === 'use' ? `${o?.defId}:${a.interactionId}` : `${a.kind}:${a.mealAct ?? ''}`;
      if (seen[seen.length - 1] !== tag) seen.push(tag);
    }
    sim.step();
  }
  return seen;
}

describe('plano 2, bloco 6: cozinhar em etapas', () => {
  it('o fogão tem um cozinhar por prato, agrupado, e as etapas escondidas', () => {
    const stove = CATALOG.objects.stove;
    const dishes = stove.interactions.filter((i) => i.cook);
    expect(dishes.map((i) => i.cook)).toEqual(HOME_DISHES.map((d) => d.id));
    expect(stove.interactions.some((i) => i.id === 'cook')).toBe(false);
    for (const id of ['prep', 'stir', 'plateUp', 'eatServed']) expect(stove.interactions.find((i) => i.id === id)?.hidden).toBe(true);
    expect(CATALOG.objects.fridge.interactions.some((i) => i.id === 'fetchFood')).toBe(true);
    expect(CATALOG.objects.counter.interactions.some((i) => i.id === 'prep')).toBe(true);
  });

  it('geladeira, bancada, fogão e travessa: as porções saem da despensa e a travessa fica na bancada', () => {
    const { sim, folk } = kitchen();
    const pantry = sim.world.household.pantry;
    expect(sim.dispatch({ type: 'queueUse', folkId: folk.id, objectId: obj(sim, 'stove').id, interactionId: 'cook_pasta' })).toBe(true);
    const path = trace(sim, folk);
    expect(path).toEqual(['fridge:fetchFood', 'counter:prep', 'stove:stir', 'counter:plateUp']);
    const [meal] = meals(sim);
    expect(meal.meal!.dish).toBe('pasta');
    // um morador só: prato de família sai com 2 porções
    expect(meal.meal!.servings).toBe(2);
    expect(sim.world.household.pantry).toBe(pantry - 2);
    expect(meal.meal!.on).toBe(obj(sim, 'counter').id);
    expect(isWarm(meal.meal!, sim.world.tick)).toBe(true);
  });

  it('prato acima da habilidade não sai; quem sabe mais faz melhor e queima menos', () => {
    const { sim, folk } = kitchen();
    expect(sim.dispatch({ type: 'queueUse', folkId: folk.id, objectId: obj(sim, 'stove').id, interactionId: 'cook_palmpie' })).toBe(false);
    expect(sim.lastProblem).toBe('skillTooLow');
    const pasta = HOME_DISHES.find((d) => d.id === 'pasta')!;
    expect(burnChance(0, pasta)).toBeGreaterThan(burnChance(8, pasta) * 4);
    const quality = (level: number) => {
      let sum = 0;
      let n = 0;
      for (let seed = 1; seed <= 10; seed++) {
        const k = kitchen({ cooking: xpForLevel(level) }, seed);
        k.sim.dispatch({ type: 'queueUse', folkId: k.folk.id, objectId: obj(k.sim, 'stove').id, interactionId: 'cook_pasta' });
        trace(k.sim, k.folk);
        // quem nunca cozinhou às vezes põe fogo no fogão (bloco 14): aí não sai travessa
        const m = meals(k.sim)[0]?.meal;
        if (!m) continue;
        sum += m.quality;
        n++;
      }
      expect(n).toBeGreaterThan(5);
      return sum / n;
    };
    expect(quality(8)).toBeGreaterThan(quality(0) + 25);
  });
});

describe('plano 2, bloco 6: travessa, mesa e louça', () => {
  function cooked(): { sim: Sim; folk: Folk; meal: Mess } {
    const k = kitchen();
    k.sim.dispatch({ type: 'queueUse', folkId: k.folk.id, objectId: obj(k.sim, 'stove').id, interactionId: 'cook_pasta' });
    trace(k.sim, k.folk);
    return { ...k, meal: meals(k.sim)[0] };
  }

  it('servir-se tira uma porção, leva à mesa, come sentado e o prato sujo fica ou vai para a pia', () => {
    const { sim, folk, meal } = cooked();
    folk.needs.hunger = 30;
    expect(sim.dispatch({ type: 'mealAct', folkId: folk.id, messId: meal.id, act: 'serve' })).toBe(true);
    let seated = false;
    for (let i = 0; i < 200 && folk.queue.length > 0; i++) {
      const a = folk.queue[0];
      if (a.served && a.phase === 'using' && a.eatAt !== undefined && folk.posture) seated = true;
      sim.step();
    }
    expect(seated).toBe(true);
    expect(meal.meal!.servings).toBe(1);
    expect(folk.needs.hunger).toBeGreaterThan(80);
    expect(folk.lastMeal?.dish).toBe('pasta');
    // o prato sujo: na mesa (bagunça) ou já na pia
    const plates = sim.world.mess.filter((m) => m.kind === 'plate').length;
    const sink = obj(sim, 'kitchensink');
    expect(plates + Math.ceil(sink.dishes ?? 0)).toBe(1);
  });

  it('a última porção leva a travessa: vira prato sujo; travessa vazia não serve mais', () => {
    const { sim, folk, meal } = cooked();
    meal.meal!.servings = 1;
    folk.needs.hunger = 30;
    sim.dispatch({ type: 'mealAct', folkId: folk.id, messId: meal.id, act: 'serve' });
    run(sim, 3 + 4);
    expect(meals(sim)).toHaveLength(0);
    expect(sim.dispatch({ type: 'mealAct', folkId: folk.id, messId: meal.id, act: 'serve' })).toBe(false);
  });

  it('a travessa esfria, rende menos fria, esquenta de novo e estraga (fede e vira sujeira)', () => {
    const { sim, folk, meal } = cooked();
    const m = meal.meal!;
    const hot = { dish: m.dish, quality: m.quality, cold: false };
    expect(servedFactor({ ...hot, cold: true })).toBeLessThan(servedFactor(hot));
    expect(isLitter(meal, sim.world.tick)).toBe(false);
    run(sim, WARM_MINUTES + 1);
    expect(isWarm(m, sim.world.tick)).toBe(false);
    expect(sim.dispatch({ type: 'mealAct', folkId: folk.id, messId: meal.id, act: 'reheat' })).toBe(true);
    run(sim, 12);
    expect(isWarm(m, sim.world.tick)).toBe(true);
    const clean = messLevel(sim.world, sim.catalog);
    sim.world.tick = m.spoilAt;
    expect(isLitter(meal, sim.world.tick)).toBe(true);
    expect(messLevel(sim.world, sim.catalog)).toBeGreaterThan(clean);
    expect(sim.dispatch({ type: 'mealAct', folkId: folk.id, messId: meal.id, act: 'serve' })).toBe(false);
    expect(sim.dispatch({ type: 'mealAct', folkId: folk.id, messId: meal.id, act: 'scrap' })).toBe(true);
    run(sim, 30);
    expect(meals(sim)).toHaveLength(0);
    expect(SPOIL_MINUTES).toBeGreaterThan(WARM_MINUTES);
  });

  it('chamar a família traz todo mundo da casa para se servir', () => {
    const sim = householdSim(3);
    const cook = sim.world.folks.find((f) => !f.visit && f.age === undefined)!;
    const stove = obj(sim, 'stove');
    sim.world.household.pantry = 20;
    for (const f of sim.world.folks) Object.assign(f.needs, { hunger: 45, energy: 90, bladder: 90 });
    expect(sim.dispatch({ type: 'queueUse', folkId: cook.id, objectId: stove.id, interactionId: 'cook_pasta' })).toBe(true);
    for (let i = 0; i < 200 && cook.queue.length > 0; i++) sim.step();
    const [meal] = meals(sim);
    expect(meal).toBeDefined();
    const home = sim.world.folks.filter((f) => !f.visit && f.age !== 'baby');
    expect(meal.meal!.servings).toBe(Math.max(2, Math.min(6, home.length)));
    expect(sim.dispatch({ type: 'mealAct', folkId: cook.id, messId: meal.id, act: 'call' })).toBe(true);
    run(sim, 3);
    const coming = home.filter((f) => f.queue.some((a) => a.kind === 'meal' || a.served));
    expect(coming.length).toBe(home.length);
  });

  it('lavar a louça esvazia a pilha da pia; a pilha suja o ambiente', () => {
    const { sim, folk } = kitchen();
    const sink = obj(sim, 'kitchensink');
    const clean = messLevel(sim.world, sim.catalog);
    sink.dishes = 3;
    expect(messLevel(sim.world, sim.catalog)).toBeGreaterThan(clean);
    expect(sim.dispatch({ type: 'queueUse', folkId: folk.id, objectId: sink.id, interactionId: 'washUp' })).toBe(true);
    const path = trace(sim, folk);
    expect(path).toEqual(['kitchensink:washUp']);
    expect(sink.dishes ?? 0).toBe(0);
    expect(sim.dispatch({ type: 'queueUse', folkId: folk.id, objectId: sink.id, interactionId: 'washUp' })).toBe(false);
  });

  it('comida boa fica na boca como sensação; queimada, como sensação ruim', () => {
    const { sim, folk } = kitchen();
    folk.lastMeal = { dish: 'pasta', quality: 90, tick: sim.world.tick };
    expect(feelingsOf(sim.world, sim.catalog, folk).some((f) => f.id === 'tasty')).toBe(true);
    folk.lastMeal = { dish: 'pasta', quality: 10, tick: sim.world.tick, burnt: true };
    expect(feelingsOf(sim.world, sim.catalog, folk).some((f) => f.id === 'awfulMeal')).toBe(true);
  });
});

describe('plano 2, bloco 6: banheiro e cama', () => {
  it('privada: levanta a tampa, senta, dá descarga e lava as mãos na pia', () => {
    const sim = openField(8, 6, [{ defId: 'toilet', x: 2, y: 1 }, { defId: 'sink', x: 4, y: 1, rot: 0 }], { x: 2, y: 3, needs: { bladder: 20 } });
    const folk = sim.world.folks[0];
    sim.dispatch({ type: 'queueUse', folkId: folk.id, objectId: obj(sim, 'toilet').id, interactionId: 'use' });
    const stages: string[] = [];
    for (let i = 0; i < 80 && folk.queue.length > 0; i++) {
      const a = folk.queue[0];
      const tag = a.phase === 'using' ? `${a.interactionId}${a.stage ? `:${a.stage}` : ''}` : '';
      if (tag && stages[stages.length - 1] !== tag) stages.push(tag);
      sim.step();
    }
    expect(stages).toEqual(['use:enter', 'use', 'use:exit', 'washHands']);
    expect(folk.needs.bladder).toBeGreaterThan(90);
  });

  it('chuveiro tem fases (tirar a roupa, ensaboar, enxaguar) e sai secando com a toalha', () => {
    const shower = CATALOG.objects.shower.interactions.find((i) => i.id === 'shower')!;
    expect(shower.phases?.map((p) => p.anim)).toEqual(['undress', 'soap', 'rinse']);
    expect(shower.stages?.exit?.hold).toBe('towel');
    const sink = CATALOG.objects.sink.interactions.map((i) => i.id);
    expect(sink).toEqual(expect.arrayContaining(['brushTeeth', 'groom', 'washUp', 'washHands']));
  });

  it('dormir desfaz a cama; arrumar a cama volta o ambiente', () => {
    const sim = openField(8, 6, [{ defId: 'bed', x: 2, y: 1 }], { x: 3, y: 3, needs: { energy: 80 } });
    const folk = sim.world.folks[0];
    const bed = obj(sim, 'bed');
    const before = messLevel(sim.world, sim.catalog);
    sim.dispatch({ type: 'queueUse', folkId: folk.id, objectId: bed.id, interactionId: 'nap' });
    for (let i = 0; i < 200 && folk.queue.length > 0 && !bed.unmade; i++) sim.step();
    expect(bed.unmade).toBe(true);
    expect(messLevel(sim.world, sim.catalog)).toBeGreaterThan(before);
    sim.dispatch({ type: 'queueUse', folkId: folk.id, objectId: bed.id, interactionId: 'makeBed' });
    for (let i = 0; i < 200 && bed.unmade; i++) sim.step();
    expect(bed.unmade).toBeUndefined();
  });

  it('cochilar no sofá deita no sofá inteiro (ninguém senta junto)', () => {
    const sim = openField(8, 6, [{ defId: 'sofa', x: 2, y: 1 }], { x: 3, y: 3, needs: { energy: 30 } });
    const folk = sim.world.folks[0];
    const sofa = obj(sim, 'sofa');
    expect(sim.dispatch({ type: 'queueUse', folkId: folk.id, objectId: sofa.id, interactionId: 'napCouch' })).toBe(true);
    let lying = false;
    for (let i = 0; i < 40; i++) {
      sim.step();
      const a = folk.queue[0];
      if (a?.phase === 'using' && a.interactionId === 'napCouch' && !a.stage) lying = true;
    }
    expect(lying).toBe(true);
    expect(folk.needs.energy).toBeGreaterThan(30);
  });
});
