import { describe, expect, it } from 'vitest';
import { CATALOG } from '../src/data/catalog';
import {
  MAX_MESS,
  SAVE_VERSION,
  Sim,
  addMess,
  ambienceTarget,
  breakChance,
  careAvailable,
  careDrive,
  deserialize,
  freshState,
  relationOf,
  scoreOptions,
  skillLevel,
  xpForLevel,
} from '../src/sim';
import type { Folk, LogEntry, Sim as SimT } from '../src/sim';
import { crowd, householdSim, openField, run } from './helpers';

const objOf = (sim: SimT, defId: string) => sim.world.objects.find((o) => o.defId === defId)!;

/** Roda e guarda tudo o que passou pelo log (o log do mundo só guarda os últimos 30). */
function runLogged(sim: SimT, ticks: number, seen: LogEntry[] = []): LogEntry[] {
  let last = sim.world.log.length ? sim.world.log[sim.world.log.length - 1].tick : -1;
  for (let i = 0; i < ticks; i++) {
    sim.step();
    for (const e of sim.world.log) if (e.tick > last) seen.push(e);
    if (sim.world.log.length) last = sim.world.log[sim.world.log.length - 1].tick;
  }
  return seen;
}

/** Roda até a fila do folk esvaziar (ou estourar o limite), anotando as interações usadas. */
function runUntilIdle(sim: SimT, folk: Folk, limit = 400): string[] {
  const used: string[] = [];
  for (let i = 0; i < limit && folk.queue.length > 0; i++) {
    const a = folk.queue[0];
    const tag = a.kind === 'use' ? a.interactionId! : a.kind;
    if (a.phase === 'using' && used[used.length - 1] !== tag) used.push(tag);
    sim.step();
  }
  return used;
}

function solo(objects: Parameters<typeof openField>[2], opts: Parameters<typeof openField>[3] = { x: 1, y: 1 }, seed = 1) {
  const sim = openField(8, 8, objects, { needs: { hunger: 90, energy: 90, bladder: 90, hygiene: 90, comfort: 90, fun: 90, social: 90 }, ...opts }, seed);
  const folk = sim.world.folks[0];
  folk.autonomy = false;
  return { sim, folk };
}

describe('bloco 1: sujeira e desgaste', () => {
  it('usar suja e gasta o objeto', () => {
    const { sim, folk } = solo([{ defId: 'shower', x: 3, y: 3 }, { defId: 'tv', x: 5, y: 1 }], { x: 3, y: 2 });
    const shower = objOf(sim, 'shower');
    folk.needs.hygiene = 10;
    expect(sim.dispatch({ type: 'queueUse', folkId: folk.id, objectId: shower.id, interactionId: 'shower' })).toBe(true);
    runUntilIdle(sim, folk);
    expect(shower.state.dirt).toBeGreaterThan(5);
    expect(shower.state.wear).toBeGreaterThan(0);
    const tv = objOf(sim, 'tv');
    folk.needs.fun = 5;
    sim.dispatch({ type: 'queueUse', folkId: folk.id, objectId: tv.id, interactionId: 'watch' });
    runUntilIdle(sim, folk);
    expect(tv.state.wear).toBeGreaterThan(5);
    expect(tv.state.dirt).toBe(0);
  });

  it('a chance de quebrar cresce com o desgaste e com o remendo', () => {
    expect(breakChance(freshState())).toBe(0);
    const worn = { ...freshState(), wear: 70 };
    expect(breakChance(worn)).toBeGreaterThan(0.1);
    expect(breakChance({ ...worn, patched: true })).toBeCloseTo(breakChance(worn) * 2);
    expect(breakChance({ ...freshState(), wear: 100 })).toBe(1);
  });

  it('limpar tira a sujeira e treina Capricho', () => {
    const { sim, folk } = solo([{ defId: 'toilet', x: 3, y: 3 }], { x: 3, y: 5 });
    const toilet = objOf(sim, 'toilet');
    toilet.state.dirt = 90;
    const clean = CATALOG.objects.toilet.interactions.find((i) => i.care === 'clean')!;
    expect(careAvailable(toilet, clean)).toBe(true);
    expect(sim.dispatch({ type: 'queueUse', folkId: folk.id, objectId: toilet.id, interactionId: 'clean' })).toBe(true);
    runUntilIdle(sim, folk);
    expect(toilet.state.dirt).toBe(0);
    expect(folk.skills.tidiness).toBeGreaterThan(0);
    // limpo, não tem mais o que limpar
    expect(careAvailable(toilet, clean)).toBe(false);
    expect(sim.dispatch({ type: 'queueUse', folkId: folk.id, objectId: toilet.id, interactionId: 'clean' })).toBe(false);
    expect(sim.lastProblem).toBe('nothingToDo');
  });
});

describe('bloco 1: quebrar e consertar', () => {
  it('objeto quebrado não oferece o uso normal, nem para o jogador nem para a IA', () => {
    const { sim, folk } = solo([{ defId: 'tv', x: 3, y: 1 }], { x: 2, y: 1, needs: { fun: 5 } });
    const tv = objOf(sim, 'tv');
    tv.state.broken = true;
    expect(sim.dispatch({ type: 'queueUse', folkId: folk.id, objectId: tv.id, interactionId: 'watch' })).toBe(false);
    expect(sim.lastProblem).toBe('broken');
    const opts = scoreOptions(sim.world, CATALOG, folk, sim.getNav());
    expect(opts.some((o) => o.interactionId === 'watch')).toBe(false);
    expect(opts.some((o) => o.interactionId === 'repair')).toBe(true);
  });

  it('quem chega num objeto que quebrou no caminho desiste', () => {
    const { sim, folk } = solo([{ defId: 'tv', x: 6, y: 6 }], { x: 0, y: 0, needs: { fun: 5 } });
    const tv = objOf(sim, 'tv');
    sim.dispatch({ type: 'queueUse', folkId: folk.id, objectId: tv.id, interactionId: 'watch' });
    run(sim, 2);
    tv.state.broken = true;
    const seen = runLogged(sim, 30);
    expect(folk.queue.length).toBe(0);
    expect(seen.some((e) => e.key === 'log.foundBroken')).toBe(true);
  });

  it('conserto com pouco Jeito vira gambiarra; com Jeito, sai mais rápido e fica novo', () => {
    const minutes = (xp: number) => {
      const { sim, folk } = solo([{ defId: 'speaker', x: 3, y: 3 }], { x: 3, y: 4, skills: { handiness: xp } });
      const sp = objOf(sim, 'speaker');
      sp.state.broken = true;
      sp.state.wear = 100;
      expect(sim.dispatch({ type: 'queueUse', folkId: folk.id, objectId: sp.id, interactionId: 'repair' })).toBe(true);
      const start = sim.world.tick;
      runUntilIdle(sim, folk);
      return { state: sp.state, took: sim.world.tick - start, folk };
    };
    const rookie = minutes(0);
    expect(rookie.state.broken).toBe(false);
    expect(rookie.state.patched).toBe(true);
    expect(rookie.state.wear).toBe(30);
    expect(rookie.folk.skills.handiness).toBeGreaterThan(0);
    const pro = minutes(xpForLevel(6));
    expect(pro.state.patched).toBe(false);
    expect(pro.state.wear).toBe(5);
    expect(pro.took).toBeLessThan(rookie.took);
  });

  it('gambiarra às vezes dá choque', () => {
    let shocks = 0;
    for (let seed = 1; seed <= 20; seed++) {
      const sim = openField(6, 6, [{ defId: 'tv', x: 3, y: 1 }], { x: 2, y: 1 }, seed);
      const folk = sim.world.folks[0];
      folk.autonomy = false;
      objOf(sim, 'tv').state.broken = true;
      sim.dispatch({ type: 'queueUse', folkId: folk.id, objectId: objOf(sim, 'tv').id, interactionId: 'repair' });
      const seen = runLogged(sim, 200);
      if (seen.some((e) => e.key === 'log.shock')) shocks++;
    }
    expect(shocks).toBeGreaterThan(0);
    expect(shocks).toBeLessThan(20);
  });

  it('revisão tira o desgaste e só aparece com desgaste', () => {
    const { sim, folk } = solo([{ defId: 'tv', x: 3, y: 1 }], { x: 2, y: 1 });
    const tv = objOf(sim, 'tv');
    expect(sim.dispatch({ type: 'queueUse', folkId: folk.id, objectId: tv.id, interactionId: 'service' })).toBe(false);
    tv.state.wear = 60;
    expect(sim.dispatch({ type: 'queueUse', folkId: folk.id, objectId: tv.id, interactionId: 'service' })).toBe(true);
    runUntilIdle(sim, folk);
    expect(tv.state.wear).toBe(0);
    expect(skillLevel(folk, 'handiness')).toBe(0);
    expect(folk.skills.handiness).toBeGreaterThan(0);
  });

  it('objeto quebrado vale metade na revenda', () => {
    const { sim } = solo([{ defId: 'tv', x: 3, y: 1 }]);
    const tv = objOf(sim, 'tv');
    tv.state.broken = true;
    const before = sim.world.household.funds;
    sim.dispatch({ type: 'sell', objectId: tv.id });
    expect(sim.world.household.funds - before).toBe(Math.round(CATALOG.objects.tv.price * 0.7 * 0.5));
  });
});

describe('bloco 1: bagunça solta', () => {
  it('refeição deixa prato e lixo; recolher o prato leva à pia', () => {
    let plates = 0;
    for (let seed = 1; seed <= 6; seed++) {
      const { sim, folk } = solo(
        [
          { defId: 'fridge', x: 2, y: 1 },
          { defId: 'kitchensink', x: 5, y: 1 },
          { defId: 'trashcan', x: 6, y: 1 },
        ],
        { x: 2, y: 3, needs: { hunger: 20 } },
        seed,
      );
      sim.dispatch({ type: 'queueUse', folkId: folk.id, objectId: objOf(sim, 'fridge').id, interactionId: 'meal' });
      runUntilIdle(sim, folk);
      expect(objOf(sim, 'trashcan').state.fill).toBe(7);
      const plate = sim.world.mess.find((m) => m.kind === 'plate');
      if (!plate) continue;
      plates++;
      expect(plate.by).toBe(folk.id);
      expect(sim.dispatch({ type: 'queueTidy', folkId: folk.id, messId: plate.id })).toBe(true);
      const used = runUntilIdle(sim, folk);
      expect(sim.world.mess).toHaveLength(0);
      expect(used).toEqual(['tidy', 'dishes']);
    }
    expect(plates).toBeGreaterThan(2);
  });

  it('lixeira cheia joga lixo no chão; tirar o lixo leva o saco até o latão', () => {
    const { sim, folk } = solo(
      [
        { defId: 'fridge', x: 2, y: 1 },
        { defId: 'trashcan', x: 4, y: 1 },
        { defId: 'curbbin', x: 6, y: 6 },
      ],
      { x: 2, y: 3, needs: { hunger: 60 } },
    );
    const bin = objOf(sim, 'trashcan');
    bin.state.fill = 100;
    sim.dispatch({ type: 'queueUse', folkId: folk.id, objectId: objOf(sim, 'fridge').id, interactionId: 'snack' });
    runUntilIdle(sim, folk);
    expect(sim.world.mess.some((m) => m.kind === 'trash')).toBe(true);
    // lixeira cheia fede: o ambiente em volta cai
    const smelly = ambienceTarget(sim.world, CATALOG, folk);
    expect(sim.dispatch({ type: 'queueUse', folkId: folk.id, objectId: bin.id, interactionId: 'empty' })).toBe(true);
    const used = runUntilIdle(sim, folk);
    expect(used).toEqual(['empty', 'dump']);
    expect(bin.state.fill).toBe(0);
    expect(ambienceTarget(sim.world, CATALOG, folk)).toBeGreaterThan(smelly);
  });

  it('sem latão na calçada, o saco vai até a rua', () => {
    const { sim, folk } = solo([{ defId: 'trashcan', x: 4, y: 1 }], { x: 2, y: 3 });
    objOf(sim, 'trashcan').state.fill = 50;
    sim.dispatch({ type: 'queueUse', folkId: folk.id, objectId: objOf(sim, 'trashcan').id, interactionId: 'empty' });
    let walkedOut = false;
    for (let i = 0; i < 200 && folk.queue.length; i++) {
      if (folk.queue[0].kind === 'goto') walkedOut = true;
      sim.step();
    }
    expect(walkedOut).toBe(true);
    expect(objOf(sim, 'trashcan').state.fill).toBe(0);
    expect({ x: folk.x, y: folk.y }).toEqual(sim.world.exit);
  });

  it('bexiga no zero vira poça no chão', () => {
    const { sim, folk } = solo([], { x: 3, y: 3, needs: { bladder: 0.01 } });
    run(sim, 2);
    expect(sim.world.mess).toEqual([expect.objectContaining({ kind: 'puddle', x: 3, y: 3, by: folk.id })]);
  });

  it('a bagunça tem limite', () => {
    const { sim } = solo([]);
    for (let i = 0; i < MAX_MESS + 10; i++) addMess(sim.world, 'plate', i % 8, Math.floor(i / 8) % 8, 0);
    expect(sim.world.mess.length).toBeLessThanOrEqual(MAX_MESS);
  });

  it('bagunça derruba o ambiente, mais ainda para quem é caprichoso', () => {
    const neat = crowd([{ x: 3, y: 3, traits: ['caprichoso'] }, { x: 5, y: 3, traits: ['desleixado'] }], { autonomy: false });
    const [a, b] = neat.world.folks;
    b.x = a.x;
    b.y = a.y;
    const cleanA = ambienceTarget(neat.world, CATALOG, a);
    const cleanB = ambienceTarget(neat.world, CATALOG, b);
    addMess(neat.world, 'trash', 3, 4, 0);
    addMess(neat.world, 'puddle', 4, 3, 0);
    const dropA = cleanA - ambienceTarget(neat.world, CATALOG, a);
    const dropB = cleanB - ambienceTarget(neat.world, CATALOG, b);
    expect(dropA).toBeGreaterThan(0);
    expect(dropA).toBeGreaterThan(dropB * 2);
  });

  it('caprichoso reclama de quem deixou a louça (lembrança nova)', () => {
    const sim = crowd([{ name: 'Clara', x: 2, y: 2, traits: ['caprichoso'] }, { name: 'Duda', x: 6, y: 6 }], {
      autonomy: false,
      objects: [{ defId: 'sink', x: 8, y: 2 }],
    });
    const [clara, duda] = sim.world.folks;
    const plate = addMess(sim.world, 'plate', 4, 4, duda.id)!;
    sim.dispatch({ type: 'queueTidy', folkId: clara.id, messId: plate.id });
    const seen: LogEntry[] = [];
    for (let i = 0; i < 60 && clara.queue.length; i++) runLogged(sim, 1, seen);
    expect(seen.some((e) => e.key === 'log.complainDishes')).toBe(true);
    expect(relationOf(sim.world, clara.id, duda.id)?.memories.some((m) => m.kind === 'leftMess')).toBe(true);
  });
});

describe('bloco 1: a IA cuida da casa', () => {
  it('limpa o que está imundo e conserta o que quebrou, por conta própria', () => {
    const sim = openField(8, 8, [{ defId: 'toilet', x: 2, y: 2 }, { defId: 'tv', x: 5, y: 2 }], {
      x: 3,
      y: 5,
      needs: { hunger: 95, energy: 95, bladder: 95, hygiene: 95, comfort: 95, fun: 95, social: 95 },
    });
    const toilet = objOf(sim, 'toilet');
    const tv = objOf(sim, 'tv');
    toilet.state.dirt = 95;
    tv.state.broken = true;
    run(sim, 240);
    expect(toilet.state.dirt).toBeLessThan(30);
    expect(tv.state.broken).toBe(false);
  });

  it('recolhe a bagunça do chão', () => {
    const sim = openField(8, 8, [], { x: 1, y: 1, needs: { hunger: 95, energy: 95, bladder: 95, hygiene: 95, comfort: 95, fun: 95, social: 95 } });
    addMess(sim.world, 'puddle', 5, 5, 0);
    run(sim, 60);
    expect(sim.world.mess).toHaveLength(0);
  });

  it('desleixado quase não liga; caprichoso faz questão; visita não faxina', () => {
    const sim = crowd([
      { x: 1, y: 1, traits: ['desleixado'] },
      { x: 2, y: 1, traits: ['caprichoso'] },
      { x: 3, y: 1 },
    ]);
    const [lazy, neat, guest] = sim.world.folks;
    guest.visit = { until: 9999, leaving: false, hostId: 0 };
    expect(careDrive(CATALOG, neat, 70)).toBeGreaterThan(careDrive(CATALOG, lazy, 70) * 3);
    expect(careDrive(CATALOG, guest, 70)).toBe(0);
    // de mau humor, até o caprichoso empurra para depois
    expect(careDrive(CATALOG, neat, 10)).toBeLessThan(careDrive(CATALOG, neat, 70));
  });
});

describe('bloco 1: save v6', () => {
  it('um save da fatia 5 (versão 5) abre com tudo limpo e inteiro', () => {
    const sim = householdSim(3);
    run(sim, 600);
    const v5 = JSON.parse(JSON.stringify({ version: 5, savedAt: 2, world: sim.world }));
    delete v5.world.mess;
    for (const o of v5.world.objects) delete o.state;
    const file = deserialize(v5);
    expect(file.version).toBe(SAVE_VERSION);
    expect(file.world.mess).toEqual([]);
    expect(file.world.objects.every((o) => o.state && o.state.dirt === 0 && !o.state.broken)).toBe(true);
    const restored = new Sim(CATALOG, file.world);
    run(restored, 1440);
    expect(restored.world.objects.some((o) => o.state.dirt > 0 || o.state.wear > 0)).toBe(true);
  });
});

describe('bloco 1: uma semana sem jogador', () => {
  it('a casa suja, alguém limpa, algo quebra e é consertado, e ninguém entra em colapso', () => {
    const sim = householdSim(2);
    let maxDirt = 0;
    let cleaned = 0;
    let tidied = 0;
    const seen: LogEntry[] = [];
    for (let i = 0; i < 7 * 1440; i++) {
      runLogged(sim, 1, seen);
      for (const o of sim.world.objects) maxDirt = Math.max(maxDirt, o.state.dirt);
      for (const f of sim.world.folks) {
        const a = f.queue[0];
        if (a?.phase !== 'using') continue;
        if (a.kind === 'tidy') tidied++;
        if (a.kind === 'use' && a.interactionId === 'clean') cleaned++;
      }
    }
    expect(maxDirt).toBeGreaterThanOrEqual(30);
    expect(cleaned).toBeGreaterThan(0);
    expect(tidied).toBeGreaterThan(0);
    const broke = seen.filter((e) => e.key === 'log.broke').length;
    const fixed = seen.filter((e) => e.key === 'log.repaired' || e.key === 'log.patched').length;
    expect(broke).toBeGreaterThan(0);
    expect(fixed).toBeGreaterThan(0);
    // a casa não vira um lixão nem fica tudo quebrado
    expect(sim.world.mess.length).toBeLessThan(10);
    expect(sim.world.objects.filter((o) => o.state.broken).length).toBeLessThanOrEqual(1);
    for (const f of sim.residents()) {
      expect(f.needs.hunger).toBeGreaterThan(10);
      expect(f.needs.energy).toBeGreaterThan(5);
    }
    expect(sim.world.household.funds).toBeGreaterThan(0);
  });
});
