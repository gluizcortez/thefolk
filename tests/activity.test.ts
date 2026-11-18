import { describe, expect, it } from 'vitest';
import { CATALOG } from '../src/data/catalog';
import { GET_UP, LIE_DOWN, RISE, SIT_DOWN, bestSeat, spotCell, spotsOf, viewArea } from '../src/sim/activity';
import { SAVE_VERSION, deserialize, fullNeeds, serialize } from '../src/sim';
import type { Folk, Sim } from '../src/sim';
import { crowd, openField, run } from './helpers';

/**
 * Sala de teste: TV na parede oeste olhando para leste, sofá de dois lugares
 * virado para ela a três tiles, poltrona de costas para a TV e uma cadeira
 * longe, fora da área de visão.
 */
function livingRoom(people: { x: number; y: number; needs?: Partial<Folk['needs']> }[] = [{ x: 8, y: 6 }]): Sim {
  const relations = people.length > 1 ? [{ a: 'P0', b: 'P1', friendship: 40 }] : undefined;
  return crowd(
    people.map((p, i) => ({ name: `P${i}`, x: p.x, y: p.y, needs: { fun: 20, comfort: 40, ...p.needs } })),
    {
      w: 10,
      h: 8,
      objects: [
        { defId: 'tv', x: 1, y: 3 },
        { defId: 'sofa', x: 4, y: 2, rot: 3 },
        { defId: 'armchair', x: 5, y: 5, rot: 1 },
        { defId: 'chair', x: 8, y: 0 },
      ],
      relations,
    },
  );
}

const byDef = (sim: Sim, id: string) => sim.world.objects.find((o) => o.defId === id)!;

describe('lugares nos objetos (plano 2, bloco 4)', () => {
  it('sofá de dois lugares tem dois assentos; poltrona e cadeira, um; tabuleiro, um por lado', () => {
    expect(spotsOf(CATALOG.objects.sofa)).toHaveLength(2);
    expect(spotsOf(CATALOG.objects.armchair)).toHaveLength(1);
    expect(spotsOf(CATALOG.objects.chair)).toHaveLength(1);
    expect(spotsOf(CATALOG.objects.chessboard).map((s) => s.side)).toEqual(['N', 'S']);
    // TV, geladeira e cama não têm assento
    expect(spotsOf(CATALOG.objects.tv)).toHaveLength(0);
    expect(spotsOf(CATALOG.objects.fridge)).toHaveLength(0);
  });

  it('os lugares giram junto com o objeto e ficam dentro dele', () => {
    const def = CATALOG.objects.sofa;
    for (const rot of [0, 1, 2, 3] as const) {
      const obj = { x: 3, y: 3, rot };
      const cells = spotsOf(def).map((s) => spotCell(obj, def, s));
      const w = rot % 2 ? def.size.h : def.size.w;
      const h = rot % 2 ? def.size.w : def.size.h;
      for (const c of cells) {
        expect(c.x).toBeGreaterThanOrEqual(3);
        expect(c.x).toBeLessThan(3 + w);
        expect(c.y).toBeGreaterThanOrEqual(3);
        expect(c.y).toBeLessThan(3 + h);
      }
      expect(new Set(cells.map((c) => `${c.x},${c.y}`)).size).toBe(2);
    }
  });

  it('a TV vê um leque na frente dela', () => {
    const sim = livingRoom();
    const tv = byDef(sim, 'tv');
    const area = viewArea(sim.world, CATALOG, tv, CATALOG.objects.tv);
    expect(area.has('2,3')).toBe(true);
    expect(area.has('4,2')).toBe(true);
    expect(area.has('4,3')).toBe(true);
    // atrás e do lado da TV, não
    expect(area.has('0,3')).toBe(false);
    expect(area.has('1,2')).toBe(false);
  });
});

describe('assistir TV de verdade (plano 2, bloco 4)', () => {
  it('escolhe o melhor assento livre virado para a TV, senta e assiste', () => {
    const sim = livingRoom();
    const folk = sim.world.folks[0];
    const tv = byDef(sim, 'tv');
    const sofa = byDef(sim, 'sofa');
    const choice = bestSeat(sim.world, CATALOG, sim.getNav(), folk, tv, CATALOG.objects.tv);
    expect(choice?.seat.id).toBe(sofa.id);
    expect(sim.dispatch({ type: 'queueUse', folkId: folk.id, objectId: tv.id, interactionId: 'watch' })).toBe(true);
    run(sim, 20);
    const a = folk.queue[0];
    expect(a.phase).toBe('using');
    expect(a.seatAt).toBe(sofa.id);
    expect(folk.posture).toMatchObject({ kind: 'sit', objectId: sofa.id });
    expect(tv.channel).toBeDefined();
    const fun = folk.needs.fun;
    run(sim, 10);
    expect(folk.needs.fun).toBeGreaterThan(fun);
  });

  it('assento ocupado: o segundo pega o outro lugar do sofá', () => {
    const sim = livingRoom([
      { x: 8, y: 6 },
      { x: 8, y: 7 },
    ]);
    const [a, b] = sim.world.folks;
    const tv = byDef(sim, 'tv');
    const sofa = byDef(sim, 'sofa');
    sim.dispatch({ type: 'queueUse', folkId: a.id, objectId: tv.id, interactionId: 'watch' });
    sim.dispatch({ type: 'queueUse', folkId: b.id, objectId: tv.id, interactionId: 'watch' });
    run(sim, 25);
    expect(a.posture?.objectId).toBe(sofa.id);
    expect(b.posture?.objectId).toBe(sofa.id);
    expect(a.posture!.spot).not.toBe(b.posture!.spot);
  });

  it('sem assento na área de visão, assiste de pé na frente da TV', () => {
    const sim = openField(8, 5, [{ defId: 'tv', x: 0, y: 2 }, { defId: 'armchair', x: 6, y: 0 }], { x: 5, y: 4, needs: { ...fullNeeds(50) } });
    const folk = sim.world.folks[0];
    const tv = sim.world.objects[0];
    sim.dispatch({ type: 'queueUse', folkId: folk.id, objectId: tv.id, interactionId: 'watch' });
    run(sim, 10);
    expect(folk.queue[0].phase).toBe('using');
    expect(folk.queue[0].seatAt).toBeUndefined();
    expect(folk.posture).toBeUndefined();
    expect({ x: folk.x, y: folk.y }).toEqual({ x: 1, y: 2 });
  });

  it('o canal de culinária ensina a cozinhar, e quem assiste reage', () => {
    const sim = livingRoom();
    const folk = sim.world.folks[0];
    const tv = byDef(sim, 'tv');
    sim.dispatch({ type: 'queueUse', folkId: folk.id, objectId: tv.id, interactionId: 'watch_cook' });
    const before = folk.skills.cooking ?? 0;
    let reacted = false;
    for (let i = 0; i < 80; i++) {
      sim.step();
      reacted ||= !!folk.react;
    }
    expect(tv.channel).toBe('cook');
    expect(folk.skills.cooking ?? 0).toBeGreaterThan(before);
    expect(reacted).toBe(true);
  });

  it('desligar a TV pelo controle, sentado mesmo', () => {
    const sim = livingRoom();
    const folk = sim.world.folks[0];
    const tv = byDef(sim, 'tv');
    sim.dispatch({ type: 'queueUse', folkId: folk.id, objectId: tv.id, interactionId: 'watch' });
    run(sim, 20);
    const seat = folk.posture;
    expect(sim.dispatch({ type: 'queueUse', folkId: folk.id, objectId: tv.id, interactionId: 'tvOff' })).toBe(true);
    run(sim, 4);
    expect(tv.channel).toBeUndefined();
    expect(folk.posture).toEqual(seat);
  });
});

describe('postura e etapas (plano 2, bloco 4)', () => {
  it('sentar leva um minuto; quem está sentado fica sentado quando a ação acaba', () => {
    const sim = livingRoom();
    const folk = sim.world.folks[0];
    const sofa = byDef(sim, 'sofa');
    sim.dispatch({ type: 'queueUse', folkId: folk.id, objectId: sofa.id, interactionId: 'rest' });
    let entered = false;
    for (let i = 0; i < 20 && !(folk.queue[0]?.phase === 'using' && folk.queue[0].stage === undefined); i++) {
      sim.step();
      entered ||= folk.queue[0]?.stage === 'enter';
    }
    expect(entered).toBe(true);
    expect(SIT_DOWN).toBe(1);
    folk.needs.comfort = 99.9;
    run(sim, 3);
    expect(folk.queue).toHaveLength(0);
    expect(folk.posture?.objectId).toBe(sofa.id);
    // parado sentado, segue confortável e não sai do lugar
    const at = { x: folk.x, y: folk.y };
    run(sim, 10);
    expect({ x: folk.x, y: folk.y }).toEqual(at);
    expect(folk.posture).toBeDefined();
  });

  it('para fazer outra coisa longe, primeiro levanta (etapa de saída), depois anda', () => {
    const sim = livingRoom();
    const folk = sim.world.folks[0];
    const sofa = byDef(sim, 'sofa');
    sim.dispatch({ type: 'queueUse', folkId: folk.id, objectId: sofa.id, interactionId: 'rest' });
    run(sim, 20);
    expect(folk.posture).toBeDefined();
    const at = { x: folk.x, y: folk.y };
    expect(sim.dispatch({ type: 'queueGoto', folkId: folk.id, x: 9, y: 7 })).toBe(true);
    sim.step();
    expect(folk.posture?.rising).toBe(RISE);
    expect({ x: folk.x, y: folk.y }).toEqual(at);
    run(sim, RISE);
    expect(folk.posture).toBeUndefined();
    run(sim, 12);
    expect({ x: folk.x, y: folk.y }).toEqual({ x: 9, y: 7 });
  });

  it('cancelar o sono no meio passa pela saída: levanta da cama antes de largar', () => {
    const sim = openField(6, 5, [{ defId: 'bed', x: 2, y: 1 }], { x: 0, y: 4, needs: { ...fullNeeds(80), energy: 10 } });
    const folk = sim.world.folks[0];
    const bed = sim.world.objects[0];
    sim.dispatch({ type: 'queueUse', folkId: folk.id, objectId: bed.id, interactionId: 'sleep' });
    for (let i = 0; i < 20 && folk.queue[0]?.stage !== undefined || folk.queue[0]?.phase !== 'using'; i++) sim.step();
    run(sim, LIE_DOWN + 5);
    const sleep = folk.queue[0];
    expect(sleep.stage).toBeUndefined();
    expect(sim.dispatch({ type: 'cancel', folkId: folk.id, actionId: sleep.id })).toBe(true);
    expect(folk.queue[0]).toMatchObject({ id: sleep.id, stage: 'exit', stageLeft: GET_UP });
    run(sim, GET_UP);
    expect(folk.queue).toHaveLength(0);
  });

  it('ordem nova no meio do sono: levanta primeiro, depois faz a ordem', () => {
    const sim = openField(6, 5, [{ defId: 'bed', x: 2, y: 1 }], { x: 0, y: 4, needs: { ...fullNeeds(80), energy: 10 } });
    const folk = sim.world.folks[0];
    const bed = sim.world.objects[0];
    sim.dispatch({ type: 'queueUse', folkId: folk.id, objectId: bed.id, interactionId: 'sleep' });
    run(sim, 15);
    const sleep = folk.queue[0];
    expect(sim.dispatch({ type: 'queueGoto', folkId: folk.id, x: 5, y: 4 })).toBe(true);
    expect(folk.queue.map((a) => a.kind)).toEqual(['use', 'goto']);
    expect(folk.queue[0]).toMatchObject({ id: sleep.id, stage: 'exit' });
    run(sim, GET_UP + 10);
    expect({ x: folk.x, y: folk.y }).toEqual({ x: 5, y: 4 });
  });
});

describe('multitarefa sentado (plano 2, bloco 4)', () => {
  function couch(): { sim: Sim; a: Folk; b: Folk } {
    const sim = livingRoom([
      { x: 8, y: 6, needs: { social: 30 } },
      { x: 8, y: 7, needs: { social: 30 } },
    ]);
    const [a, b] = sim.world.folks;
    const tv = byDef(sim, 'tv');
    sim.dispatch({ type: 'queueUse', folkId: a.id, objectId: tv.id, interactionId: 'watch' });
    sim.dispatch({ type: 'queueUse', folkId: b.id, objectId: tv.id, interactionId: 'watch' });
    run(sim, 25);
    return { sim, a, b };
  }

  it('sentado vendo TV, conversa com quem está do lado sem levantar e a TV segue rendendo', () => {
    const { sim, a, b } = couch();
    expect(a.posture && b.posture).toBeTruthy();
    const seat = a.posture;
    expect(sim.dispatch({ type: 'queueSocial', folkId: a.id, otherId: b.id, socialId: 'chat' })).toBe(true);
    const fun = a.needs.fun;
    run(sim, 6);
    expect(a.queue[0]?.kind).toBe('social');
    expect(a.queue[0]?.phase).toBe('using');
    expect(a.posture).toEqual(seat);
    expect(b.posture).toBeDefined();
    expect(a.needs.fun).toBeGreaterThan(fun);
  });

  it('chamar para ver junto: quem está perto vem sentar e assistir', () => {
    const sim = livingRoom([
      { x: 8, y: 6 },
      { x: 9, y: 7 },
    ]);
    const [a, b] = sim.world.folks;
    const tv = byDef(sim, 'tv');
    sim.dispatch({ type: 'queueUse', folkId: a.id, objectId: tv.id, interactionId: 'watch' });
    run(sim, 20);
    expect(sim.dispatch({ type: 'watchTogether', folkId: a.id, otherId: b.id })).toBe(true);
    run(sim, 20);
    expect(b.posture?.objectId).toBe(byDef(sim, 'sofa').id);
    expect(sim.watchedBy(b)?.id).toBe(tv.id);
  });

  it('o prato que trouxe vai junto para o sofá e é comido vendo TV', () => {
    const sim = crowd([{ name: 'P', x: 8, y: 6, needs: { hunger: 20, fun: 20 } }], {
      w: 10,
      h: 8,
      objects: [
        { defId: 'tv', x: 1, y: 3 },
        { defId: 'sofa', x: 4, y: 2, rot: 3 },
        { defId: 'fridge', x: 9, y: 0 },
      ],
    });
    const folk = sim.world.folks[0];
    const fridge = byDef(sim, 'fridge');
    const tv = byDef(sim, 'tv');
    sim.dispatch({ type: 'queueUse', folkId: folk.id, objectId: fridge.id, interactionId: 'snack' });
    for (let i = 0; i < 30 && folk.queue[0]?.eatAt === undefined; i++) sim.step();
    expect(folk.queue[0]?.eatAt).toBeDefined();
    // com o prato na mão, manda assistir: o prato vai junto
    expect(sim.dispatch({ type: 'queueUse', folkId: folk.id, objectId: tv.id, interactionId: 'watch' })).toBe(true);
    expect(folk.carry?.kind).toBe('plate');
    const hunger = folk.needs.hunger;
    run(sim, 20);
    expect(folk.posture).toBeDefined();
    expect(folk.needs.hunger).toBeGreaterThan(hunger + 5);
    run(sim, 30);
    expect(folk.carry).toBeUndefined();
    expect(sim.world.mess.some((m) => m.kind === 'plate')).toBe(true);
  });

  it('sentado dá para ler e ligar dali; em pé, não', () => {
    const sim = crowd([{ name: 'P', x: 8, y: 6, needs: { fun: 20 } }], {
      w: 10,
      h: 8,
      objects: [
        { defId: 'sofa', x: 4, y: 2, rot: 3 },
        { defId: 'bookshelf', x: 8, y: 0 },
        { defId: 'phone', x: 0, y: 0 },
      ],
    });
    const folk = sim.world.folks[0];
    expect(sim.dispatch({ type: 'seated', folkId: folk.id, what: 'read' })).toBe(false);
    expect(sim.lastProblem).toBe('notSeated');
    sim.dispatch({ type: 'queueUse', folkId: folk.id, objectId: byDef(sim, 'sofa').id, interactionId: 'sit' });
    run(sim, 15);
    const seat = folk.posture;
    expect(seat).toBeDefined();
    expect(sim.dispatch({ type: 'seated', folkId: folk.id, what: 'read' })).toBe(true);
    const fun = folk.needs.fun;
    run(sim, 10);
    expect(folk.queue[0]?.interactionId).toBe('seatRead');
    expect(folk.needs.fun).toBeGreaterThan(fun);
    expect(folk.posture).toEqual(seat);
    expect(sim.dispatch({ type: 'seated', folkId: folk.id, what: 'stand' })).toBe(true);
    run(sim, RISE + 2);
    expect(folk.posture).toBeUndefined();
  });

  it('save v24: a TV que alguém assistia fica ligada num canal e ninguém começa sentado', () => {
    const sim = livingRoom();
    const folk = sim.world.folks[0];
    const tv = byDef(sim, 'tv');
    sim.dispatch({ type: 'queueUse', folkId: folk.id, objectId: tv.id, interactionId: 'watch' });
    run(sim, 20);
    expect(SAVE_VERSION).toBeGreaterThanOrEqual(24);
    const old = serialize(sim.world, 0);
    const w = JSON.parse(JSON.stringify(old.world));
    delete w.objects.find((o: { id: number }) => o.id === tv.id).channel;
    const loaded = deserialize({ ...old, version: 23, world: w });
    expect(loaded.world.objects.find((o) => o.id === tv.id)!.channel).toBeDefined();
    expect(loaded.world.folks[0].posture).toBeUndefined();
  });
});
