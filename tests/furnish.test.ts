import { describe, expect, it } from 'vitest';
import { CATALOG } from '../src/data/catalog';
import { starterHouse } from '../src/data/house';
import { NEIGHBORS } from '../src/data/neighbors';
import { ptBR } from '../src/i18n/pt-BR';
import {
  BELOVED_LOSS,
  BELOVED_MINUTES,
  MINUTES_PER_DAY,
  SAVE_VERSION,
  Sim,
  createWorld,
  currentValue,
  deserialize,
  diningSeats,
  interactionReady,
  relationOf,
  scoreOptions,
  sellValue,
  taskFits,
} from '../src/sim';
import type { World } from '../src/sim';
import { crowd, householdSim, openField, run } from './helpers';
import { playStep } from './helpers/player';

const LINES = ['bed', 'sofa', 'armchair', 'chair', 'table', 'shower', 'toilet', 'fridge', 'stove', 'tv', 'stereo', 'lamp', 'bookshelf'];

describe('catálogo em faixas (bloco 4)', () => {
  it('tem uns 65 objetos, todos com nome, e cada função tem barato, médio e caro', () => {
    const defs = Object.values(CATALOG.objects);
    expect(defs.length).toBeGreaterThanOrEqual(65);
    for (const d of defs) expect(ptBR[d.name], d.id).toBeTruthy();
    for (const line of LINES) {
      const tiers = defs.filter((d) => d.line === line && d.buyable !== false);
      const by = (t: number) => tiers.filter((d) => (d.tier ?? 1) === t);
      expect(by(0).length, line).toBeGreaterThan(0);
      expect(by(1).length, line).toBeGreaterThan(0);
      expect(by(2).length, line).toBeGreaterThan(0);
      const cheap = Math.max(...by(0).map((d) => d.price));
      const dear = Math.min(...by(2).map((d) => d.price));
      expect(cheap, line).toBeLessThan(dear);
      expect(Math.max(...by(2).map((d) => d.ambience)), line).toBeGreaterThan(Math.min(...by(0).map((d) => d.ambience)));
    }
    for (const d of defs) for (const c of d.colors ?? []) expect(ptBR[`color.${c}`], c).toBeTruthy();
    for (const d of defs) for (const it of d.interactions) expect(ptBR[it.label], it.label).toBeTruthy();
  });

  it('a IA prefere a cama cara à barata, mesmo um pouco mais longe', () => {
    const sim = openField(12, 8, [
      { defId: 'bedcot', x: 2, y: 2 },
      { defId: 'bedqueen', x: 8, y: 2 },
    ], { x: 4, y: 5, needs: { energy: 10 } });
    const folk = sim.world.folks[0];
    const opts = scoreOptions(sim.world, CATALOG, folk, sim.getNav()).filter((o) => o.interactionId === 'sleep');
    const cot = opts.find((o) => sim.findObject(o.objectId!)!.defId === 'bedcot')!;
    const queen = opts.find((o) => sim.findObject(o.objectId!)!.defId === 'bedqueen')!;
    expect(queen.distance).toBeGreaterThan(cot.distance);
    expect(queen.score).toBeGreaterThan(cot.score);
  });

  it('a versão cara enche mais rápido e dá conforto junto', () => {
    const cheap = openField(6, 6, [{ defId: 'showercheap', x: 2, y: 2 }], { x: 2, y: 3, needs: { hygiene: 10, comfort: 50 } });
    const dear = openField(6, 6, [{ defId: 'showerluxe', x: 2, y: 2 }], { x: 2, y: 3, needs: { hygiene: 10, comfort: 50 } });
    for (const sim of [cheap, dear]) {
      sim.dispatch({ type: 'queueUse', folkId: sim.world.folks[0].id, objectId: sim.world.objects[0].id, interactionId: 'shower' });
      run(sim, 12);
    }
    expect(dear.world.folks[0].needs.hygiene).toBeGreaterThan(cheap.world.folks[0].needs.hygiene);
    expect(dear.world.folks[0].needs.comfort).toBeGreaterThan(cheap.world.folks[0].needs.comfort);
  });

  it('frila e negócio aceitam qualquer faixa da mesma função', () => {
    const sim = openField(6, 6, [], { x: 1, y: 1 });
    const folk = sim.world.folks[0];
    folk.gig = { defId: 'lunchboxes', pay: 100, progress: 0, deadline: 99999 };
    expect(taskFits(CATALOG, folk, 'gig', 'stoveluxe')).toBe(true);
    expect(taskFits(CATALOG, folk, 'gig', 'stovecheap')).toBe(true);
    expect(taskFits(CATALOG, folk, 'gig', 'fridgeluxe')).toBe(false);
  });

  it('a cor escolhida na compra fica no objeto; cor que não existe é ignorada', () => {
    const sim = openField(8, 8, [], { x: 0, y: 0 }, 1, 5000);
    expect(sim.dispatch({ type: 'buy', defId: 'sofa', x: 2, y: 2, rot: 0, color: 'green' })).toBe(true);
    expect(sim.dispatch({ type: 'buy', defId: 'sofa', x: 2, y: 5, rot: 0, color: 'neon' })).toBe(true);
    expect(sim.world.objects[0].color).toBe('green');
    expect(sim.world.objects[1].color).toBeUndefined();
  });
});

describe('depreciação e desfazer no modo compra (bloco 4)', () => {
  it('no dia da compra vale o que custou; depois da virada perde 15% e o uso tira mais', () => {
    const sim = openField(8, 8, [], { x: 0, y: 0 }, 1, 5000);
    sim.dispatch({ type: 'buy', defId: 'armchair', x: 4, y: 4, rot: 0 });
    const obj = sim.world.objects[0];
    const def = CATALOG.objects.armchair;
    expect(sellValue(sim.world, obj, def)).toBe(def.price);
    run(sim, MINUTES_PER_DAY);
    const day = sellValue(sim.world, obj, def);
    expect(day).toBe(Math.round(def.price * 0.85));
    obj.used = 6000;
    expect(sellValue(sim.world, obj, def)).toBeLessThan(day);
    obj.used = 10 ** 7;
    expect(currentValue(sim.world, obj, def)).toBe(Math.round(def.price * 0.3));
  });

  it('desfaz compra (devolve tudo), venda (o objeto volta) e mudança de lugar', () => {
    const sim = openField(8, 8, [], { x: 0, y: 0 }, 1, 5000);
    const start = sim.world.household.funds;
    sim.dispatch({ type: 'buy', defId: 'easel', x: 4, y: 4, rot: 0 });
    const id = sim.world.objects[0].id;
    sim.dispatch({ type: 'move', objectId: id, x: 2, y: 2, rot: 1 });
    expect(sim.buyUndoDepth).toBe(2);
    expect(sim.dispatch({ type: 'undoBuy' })).toBe(true);
    expect(sim.findObject(id)).toMatchObject({ x: 4, y: 4, rot: 0 });
    expect(sim.dispatch({ type: 'undoBuy' })).toBe(true);
    expect(sim.world.objects).toHaveLength(0);
    expect(sim.world.household.funds).toBe(start);
    expect(sim.dispatch({ type: 'undoBuy' })).toBe(false);
    expect(sim.lastProblem).toBe('undoBuyEmpty');

    sim.dispatch({ type: 'buy', defId: 'easel', x: 4, y: 4, rot: 0 });
    run(sim, MINUTES_PER_DAY);
    const sold = sim.world.objects[0];
    const before = sim.world.household.funds;
    sim.dispatch({ type: 'sell', objectId: sold.id });
    expect(sim.dispatch({ type: 'undoBuy' })).toBe(true);
    expect(sim.findObject(sold.id)).toBeTruthy();
    expect(sim.world.household.funds).toBe(before);
    // fechar o modo compra esquece o que dava para desfazer
    sim.dispatch({ type: 'closeBuy' });
    expect(sim.buyUndoDepth).toBe(0);
  });
});

describe('comer à mesa (bloco 4)', () => {
  function diner(hunger = 15): Sim {
    // geladeira, mesa de armar e cadeira virada para ela (rot 2 = frente para o norte)
    const sim = openField(10, 8, [
      { defId: 'fridge', x: 1, y: 1 },
      { defId: 'tablefold', x: 6, y: 3 },
      { defId: 'chair', x: 6, y: 4, rot: 2 },
    ], { x: 1, y: 3, needs: { hunger, comfort: 30 } });
    return sim;
  }

  it('cadeira só conta como lugar à mesa virada para uma mesa', () => {
    const sim = diner();
    expect(diningSeats(sim.world, CATALOG).map((o) => o.defId)).toEqual(['chair']);
    sim.world.objects[2].rot = 0;
    expect(diningSeats(sim.world, CATALOG)).toHaveLength(0);
  });

  it('pega a comida na geladeira, leva até a mesa e come sentado com bônus', () => {
    const sim = diner();
    const folk = sim.world.folks[0];
    const fridge = sim.world.objects[0];
    const chair = sim.world.objects[2];
    const pantry = sim.world.household.pantry;
    sim.dispatch({ type: 'queueUse', folkId: folk.id, objectId: fridge.id, interactionId: 'meal' });
    let seated = false;
    for (let i = 0; i < 40 && !seated; i++) {
      sim.step();
      seated = folk.queue[0]?.eatAt === chair.id && folk.queue[0].phase === 'using';
    }
    expect(seated).toBe(true);
    expect(sim.world.household.pantry).toBe(pantry - 1);
    expect(Math.abs(folk.x - chair.x) + Math.abs(folk.y - chair.y)).toBe(1);
    const comfort = folk.needs.comfort;
    run(sim, 5);
    expect(folk.needs.comfort).toBeGreaterThan(comfort);
    // a geladeira fica livre para outro enquanto ele come
    expect(sim.world.folks.some((f) => f.queue[0]?.objectId === fridge.id && f.queue[0].eatAt === undefined)).toBe(false);
    run(sim, 60);
    expect(folk.needs.hunger).toBeGreaterThan(80);
    expect(folk.queue).toHaveLength(0);
  });

  it('sem mesa, come de pé na geladeira como antes', () => {
    const sim = diner();
    sim.world.objects = sim.world.objects.filter((o) => o.defId === 'fridge');
    sim.invalidateNav();
    const folk = sim.world.folks[0];
    sim.dispatch({ type: 'queueUse', folkId: folk.id, objectId: sim.world.objects[0].id, interactionId: 'meal' });
    run(sim, 10);
    expect(folk.queue[0].phase).toBe('using');
    expect(folk.queue[0].eatAt).toBeUndefined();
  });

  it('a casa pronta come na mesa com cadeiras', () => {
    const sim = householdSim(3);
    const folk = sim.world.folks[0];
    folk.needs.hunger = 10;
    const fridge = sim.world.objects.find((o) => o.defId === 'fridge')!;
    const dinette = sim.world.objects.find((o) => o.defId === 'dinette')!;
    sim.dispatch({ type: 'queueUse', folkId: folk.id, objectId: fridge.id, interactionId: 'meal' });
    let at: number | undefined;
    for (let i = 0; i < 60 && at === undefined; i++) {
      sim.step();
      if (folk.queue[0]?.phase === 'using') at = folk.queue[0].eatAt;
    }
    expect(at).toBe(dinette.id);
  });
});

describe('atividades a dois (bloco 4)', () => {
  function players(both = true): Sim {
    const sim = crowd(
      [
        { name: 'Ana', x: 5, y: 1, needs: { fun: 20, social: 30 } },
        { name: 'Bia', x: 5, y: 7, needs: { fun: 20, social: 30 } },
      ],
      { w: 10, h: 9, objects: [{ defId: 'chessboard', x: 5, y: 4 }] },
    );
    const board = sim.world.objects[0];
    const [a, b] = sim.world.folks;
    sim.dispatch({ type: 'queueUse', folkId: a.id, objectId: board.id, interactionId: 'chess' });
    if (both) sim.dispatch({ type: 'queueUse', folkId: b.id, objectId: board.id, interactionId: 'chess' });
    return sim;
  }

  it('dois jogam juntos: mais diversão, social e amizade, e guardam a lembrança', () => {
    const duo = players(true);
    const solo = players(false);
    run(duo, 30);
    run(solo, 30);
    const [a, b] = duo.world.folks;
    expect(a.queue[0]?.phase).toBe('using');
    expect(b.queue[0]?.phase).toBe('using');
    expect(a.queue[0]!.slot).not.toBe(b.queue[0]!.slot);
    expect(a.needs.fun).toBeGreaterThan(solo.world.folks[0].needs.fun);
    expect(a.needs.social).toBeGreaterThan(solo.world.folks[0].needs.social);
    expect(relationOf(duo.world, a.id, b.id)!.friendship).toBeGreaterThan(0.5);
    expect(relationOf(duo.world, b.id, a.id)!.friendship).toBeGreaterThan(0.5);
    expect(relationOf(duo.world, a.id, b.id)!.memories.some((m) => m.kind === 'playedTogether')).toBe(true);
    expect(duo.world.log.some((l) => l.key === 'log.playedTogether')).toBe(true);
  });

  it('quem está à toa tem mais vontade de entrar no jogo que alguém começou', () => {
    const sim = players(false);
    const b = sim.world.folks[1];
    const board = sim.world.objects[0];
    const before = scoreOptions(sim.world, CATALOG, b, sim.getNav()).find((o) => o.objectId === board.id)?.score ?? 0;
    run(sim, 10);
    expect(sim.world.folks[0].queue[0]?.phase).toBe('using');
    const after = scoreOptions(sim.world, CATALOG, b, sim.getNav()).find((o) => o.objectId === board.id)!.score;
    expect(after).toBeGreaterThan(before);
  });

  it('sozinho também dá para jogar, só que rende menos', () => {
    const sim = players(false);
    run(sim, 20);
    expect(sim.world.folks[0].queue[0]?.interactionId).toBe('chess');
    expect(relationOf(sim.world, sim.world.folks[0].id, sim.world.folks[1].id)?.friendship ?? 0).toBe(0);
  });

  it('luneta só de noite', () => {
    const it = CATALOG.objects.telescope.interactions[0];
    const w = { tick: 13 * 60, household: { pantry: 0, takeout: 0 } } as unknown as World;
    expect(interactionReady(w, it)).toBe(false);
    w.tick = 23 * 60;
    expect(interactionReady(w, it)).toBe(true);
  });
});

describe('objeto querido (bloco 4)', () => {
  it('quem mais usa se apega; vender o objeto dói', () => {
    const sim = openField(8, 8, [{ defId: 'armchair', x: 3, y: 3 }], { x: 3, y: 4, needs: { comfort: 10 } });
    const folk = sim.world.folks[0];
    const chair = sim.world.objects[0];
    chair.uses = { [folk.id]: BELOVED_MINUTES - 2 };
    sim.dispatch({ type: 'queueUse', folkId: folk.id, objectId: chair.id, interactionId: 'rest' });
    run(sim, 6);
    expect(chair.beloved).toBe(folk.id);
    expect(sim.world.log.some((l) => l.key === 'log.beloved')).toBe(true);
    run(sim, 60);
    folk.queue = [];
    const fun = folk.needs.fun;
    expect(sim.dispatch({ type: 'sell', objectId: chair.id })).toBe(true);
    expect(folk.needs.fun).toBe(Math.max(0, fun - BELOVED_LOSS.fun));
    expect(sim.world.log.some((l) => l.key === 'log.missesBeloved')).toBe(true);
  });

  it('não vira querido de quem usou menos que outro', () => {
    const sim = openField(8, 8, [{ defId: 'armchair', x: 3, y: 3 }], { x: 3, y: 4, needs: { comfort: 10 } });
    const folk = sim.world.folks[0];
    const chair = sim.world.objects[0];
    chair.uses = { [folk.id]: BELOVED_MINUTES - 2, '999': BELOVED_MINUTES + 500 };
    sim.dispatch({ type: 'queueUse', folkId: folk.id, objectId: chair.id, interactionId: 'rest' });
    run(sim, 6);
    expect(chair.beloved).toBeUndefined();
  });
});

describe('save v9 (bloco 4)', () => {
  it('migra da v8: objetos ganham contagem de uso, sem data de compra', () => {
    expect(SAVE_VERSION).toBeGreaterThanOrEqual(9);
    const world = createWorld(starterHouse(1));
    for (const o of world.objects) {
      delete o.used;
      delete o.uses;
    }
    const { world: back } = deserialize({ version: 8, savedAt: 1, world: JSON.parse(JSON.stringify(world)) }, { neighbors: NEIGHBORS, catalog: CATALOG });
    for (const o of back.objects) {
      expect(o.used).toBe(0);
      expect(o.uses).toEqual({});
      expect(o.bought).toBeUndefined();
    }
  });
});

describe('semana com o jogador de teste (bloco 4)', () => {
  it('sete dias com jogos, mesa e cadeiras: ninguém desmaia e os dois jogam juntos', () => {
    const sim = householdSim(11);
    sim.world.household.funds = 20000;
    // troca a mesa com cadeiras por mesa e cadeiras separadas e põe jogos na sala
    const dinette = sim.world.objects.find((o) => o.defId === 'dinette')!;
    expect(sim.dispatch({ type: 'sell', objectId: dinette.id })).toBe(true);
    expect(sim.dispatch({ type: 'buy', defId: 'table', x: 9, y: 8, rot: 0 })).toBe(true);
    expect(sim.dispatch({ type: 'buy', defId: 'chair', x: 11, y: 8, rot: 3 })).toBe(true);
    expect(sim.dispatch({ type: 'buy', defId: 'chairfold', x: 9, y: 9, rot: 2 })).toBe(true);
    expect(sim.dispatch({ type: 'buy', defId: 'cardtable', x: 5, y: 10, rot: 0 })).toBe(true);
    let together = 0;
    let atTable = 0;
    for (let m = 0; m < 7 * MINUTES_PER_DAY; m++) {
      playStep(sim);
      if (m % 10 !== 0) continue;
      const card = sim.world.folks.filter((f) => f.queue[0]?.phase === 'using' && f.queue[0].interactionId === 'cards');
      if (card.length >= 2) together++;
      if (sim.world.folks.some((f) => f.queue[0]?.phase === 'using' && (f.queue[0].eatAt ?? -1) >= 0)) atTable++;
    }
    expect(sim.world.log.filter((l) => l.key === 'log.collapse').length).toBe(0);
    expect(atTable).toBeGreaterThan(5);
    expect(together).toBeGreaterThan(0);
    for (const o of sim.world.objects) expect(o.used ?? 0).toBeGreaterThanOrEqual(0);
  });
});
