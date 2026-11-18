import { describe, expect, it } from 'vitest';
import { MAX_QUEUE, fullNeeds } from '../src/sim';
import { crowd, openField, run } from './helpers';

function setup() {
  const sim = openField(
    8,
    3,
    [
      { defId: 'fridge', x: 6, y: 1 },
      { defId: 'tv', x: 0, y: 1 },
    ],
    { x: 3, y: 1, needs: { ...fullNeeds(60) } },
  );
  const folk = sim.world.folks[0];
  const [fridge, tv] = sim.world.objects;
  return { sim, folk, fridge, tv };
}

describe('fila de ações (plano 2: ordem substitui, Shift enfileira)', () => {
  it('com Shift, executa na ordem: anda, usa e passa para a próxima', () => {
    const { sim, folk, fridge, tv } = setup();
    sim.dispatch({ type: 'queueUse', folkId: folk.id, objectId: fridge.id, interactionId: 'snack' });
    sim.dispatch({ type: 'queueUse', folkId: folk.id, objectId: tv.id, interactionId: 'watch', append: true });
    expect(folk.queue).toHaveLength(2);

    sim.step();
    expect(folk.queue[0].phase).toBe('walking');
    run(sim, 3);
    expect({ x: folk.x, y: folk.y }).toEqual({ x: 5, y: 1 });
    expect(folk.queue[0].phase).toBe('using');
    run(sim, 12);
    expect(folk.queue).toHaveLength(1);
    expect(folk.queue[0].objectId).toBe(tv.id);
    run(sim, 10);
    expect({ x: folk.x, y: folk.y }).toEqual({ x: 1, y: 1 });
  });

  it('sem Shift, a ordem nova vira a ação atual e a fila antiga cai', () => {
    const { sim, folk, fridge, tv } = setup();
    sim.dispatch({ type: 'queueUse', folkId: folk.id, objectId: fridge.id, interactionId: 'snack' });
    sim.dispatch({ type: 'queueUse', folkId: folk.id, objectId: fridge.id, interactionId: 'snack', append: true });
    run(sim, 5);
    expect(folk.queue[0].phase).toBe('using');
    expect(sim.dispatch({ type: 'queueUse', folkId: folk.id, objectId: tv.id, interactionId: 'watch' })).toBe(true);
    expect(folk.queue).toHaveLength(1);
    expect(folk.queue[0]).toMatchObject({ objectId: tv.id, phase: 'queued', source: 'player' });
    run(sim, 6);
    expect({ x: folk.x, y: folk.y }).toEqual({ x: 1, y: 1 });
  });

  it('ordem recusada não derruba o que o folk está fazendo', () => {
    const { sim, folk, fridge, tv } = setup();
    sim.dispatch({ type: 'queueUse', folkId: folk.id, objectId: fridge.id, interactionId: 'snack' });
    run(sim, 2);
    const current = folk.queue[0].id;
    expect(sim.dispatch({ type: 'queueUse', folkId: folk.id, objectId: tv.id, interactionId: 'nope' })).toBe(false);
    expect(folk.queue.map((a) => a.id)).toEqual([current]);
  });

  it('cancela a ação em andamento ou uma que está esperando', () => {
    const { sim, folk, fridge, tv } = setup();
    sim.dispatch({ type: 'queueUse', folkId: folk.id, objectId: fridge.id, interactionId: 'snack' });
    sim.dispatch({ type: 'queueUse', folkId: folk.id, objectId: tv.id, interactionId: 'watch', append: true });
    run(sim, 2);
    const [first, second] = folk.queue;
    expect(sim.dispatch({ type: 'cancel', folkId: folk.id, actionId: second.id })).toBe(true);
    expect(folk.queue).toHaveLength(1);
    expect(sim.dispatch({ type: 'cancel', folkId: folk.id, actionId: first.id })).toBe(true);
    expect(folk.queue).toHaveLength(0);
    const pos = { x: folk.x, y: folk.y };
    run(sim, 5);
    expect({ x: folk.x, y: folk.y }).toEqual(pos);
    expect(sim.dispatch({ type: 'cancel', folkId: folk.id, actionId: 9999 })).toBe(false);
  });

  it('saída limpa: largar a conversa solta o outro, largar o prato deixa o prato', () => {
    const sim = crowd([{ x: 1, y: 1 }, { x: 3, y: 1 }], { relations: [{ a: 'Pessoa 1', b: 'Pessoa 2', friendship: 30 }] });
    const [a, b] = sim.world.folks;
    expect(sim.dispatch({ type: 'queueSocial', folkId: a.id, otherId: b.id, socialId: 'chat' })).toBe(true);
    for (let i = 0; i < 20 && b.queue[0]?.kind !== 'listen'; i++) sim.step();
    expect(b.queue[0]?.kind).toBe('listen');
    expect(sim.dispatch({ type: 'queueGoto', folkId: a.id, x: 8, y: 5 })).toBe(true);
    expect(b.queue.some((q) => q.kind === 'listen' && q.otherId === a.id)).toBe(false);

    const dine = openField(10, 8, [
      { defId: 'fridge', x: 1, y: 1 },
      { defId: 'tablefold', x: 6, y: 3 },
      { defId: 'chair', x: 6, y: 4, rot: 2 },
    ], { x: 1, y: 3, needs: { hunger: 15, comfort: 30 } });
    const folk = dine.world.folks[0];
    const fridge = dine.world.objects[0];
    expect(dine.dispatch({ type: 'queueUse', folkId: folk.id, objectId: fridge.id, interactionId: 'meal' })).toBe(true);
    for (let i = 0; i < 40 && folk.queue[0]?.eatAt === undefined; i++) dine.step();
    expect(folk.queue[0]?.eatAt).toBeDefined();
    const mess = dine.world.mess.length;
    expect(dine.dispatch({ type: 'queueGoto', folkId: folk.id, x: 9, y: 7 })).toBe(true);
    expect(dine.world.mess).toHaveLength(mess + 1);
    expect(dine.world.mess[mess].kind).toBe('plate');
  });

  it('tem limite de 8 na fila (com Shift) e recusa comandos inválidos', () => {
    const { sim, folk, tv } = setup();
    expect(MAX_QUEUE).toBe(8);
    for (let i = 0; i < MAX_QUEUE; i++) {
      expect(sim.dispatch({ type: 'queueUse', folkId: folk.id, objectId: tv.id, interactionId: 'watch', append: true })).toBe(true);
    }
    expect(sim.dispatch({ type: 'queueUse', folkId: folk.id, objectId: tv.id, interactionId: 'watch', append: true })).toBe(false);
    expect(sim.lastProblem).toBe('queueFull');
    // sem Shift, a fila cheia não impede: a ordem nova substitui tudo
    expect(sim.dispatch({ type: 'queueUse', folkId: folk.id, objectId: tv.id, interactionId: 'watch' })).toBe(true);
    expect(folk.queue).toHaveLength(1);
    expect(sim.dispatch({ type: 'queueUse', folkId: folk.id, objectId: tv.id, interactionId: 'nope' })).toBe(false);
    expect(sim.dispatch({ type: 'queueGoto', folkId: folk.id, x: 0, y: 1 })).toBe(false);
  });

  it('"ir até aqui" leva o folk ao tile', () => {
    const { sim, folk } = setup();
    sim.dispatch({ type: 'queueGoto', folkId: folk.id, x: 3, y: 0 });
    run(sim, 3);
    expect({ x: folk.x, y: folk.y }).toEqual({ x: 3, y: 0 });
    expect(folk.queue).toHaveLength(0);
  });
});
