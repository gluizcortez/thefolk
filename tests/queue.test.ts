import { describe, expect, it } from 'vitest';
import { MAX_QUEUE, fullNeeds } from '../src/sim';
import { openField, run, starterSim } from './helpers';

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
  folk.autonomy = false;
  const [fridge, tv] = sim.world.objects;
  return { sim, folk, fridge, tv };
}

describe('fila de ações', () => {
  it('executa na ordem: anda, usa e passa para a próxima', () => {
    const { sim, folk, fridge, tv } = setup();
    sim.dispatch({ type: 'queueUse', folkId: folk.id, objectId: fridge.id, interactionId: 'snack' });
    sim.dispatch({ type: 'queueUse', folkId: folk.id, objectId: tv.id, interactionId: 'watch' });
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

  it('cancela a ação em andamento ou uma que está esperando', () => {
    const { sim, folk, fridge, tv } = setup();
    sim.dispatch({ type: 'queueUse', folkId: folk.id, objectId: fridge.id, interactionId: 'snack' });
    sim.dispatch({ type: 'queueUse', folkId: folk.id, objectId: tv.id, interactionId: 'watch' });
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

  it('ordem do jogador substitui a ação autônoma', () => {
    const sim = starterSim(5, { ...fullNeeds(85), fun: 10 });
    const folk = sim.world.folks[0];
    run(sim, 6);
    expect(folk.queue[0]?.source).toBe('auto');
    const bed = sim.world.objects.find((o) => o.defId === 'bed')!;
    sim.dispatch({ type: 'queueUse', folkId: folk.id, objectId: bed.id, interactionId: 'nap' });
    expect(folk.queue).toHaveLength(1);
    expect(folk.queue[0].source).toBe('player');
  });

  it('tem limite de tamanho e recusa comandos inválidos', () => {
    const { sim, folk, tv } = setup();
    for (let i = 0; i < MAX_QUEUE; i++) {
      expect(
        sim.dispatch({ type: 'queueUse', folkId: folk.id, objectId: tv.id, interactionId: 'watch' }),
      ).toBe(true);
    }
    expect(
      sim.dispatch({ type: 'queueUse', folkId: folk.id, objectId: tv.id, interactionId: 'watch' }),
    ).toBe(false);
    expect(
      sim.dispatch({ type: 'queueUse', folkId: folk.id, objectId: tv.id, interactionId: 'nope' }),
    ).toBe(false);
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
