import { describe, expect, it } from 'vitest';
import { CATALOG } from '../src/data/catalog';
import { BILL_INTERVAL, MINUTES_PER_DAY, billAmount, checkPlacement, footprint, formatMoney, sellValue, useTiles } from '../src/sim';
import { openField, run, starterSim } from './helpers';
import { play } from './helpers/player';

describe('dinheiro e modo compra', () => {
  it('formata tostões com separador de milhar', () => {
    expect(formatMoney(1500)).toBe('⟡ 1.500');
    expect(formatMoney(-42)).toBe('−⟡ 42');
  });

  it('comprar desconta o preço e o objeto passa a existir e bloquear o caminho', () => {
    const sim = openField(8, 8, [], { x: 0, y: 0 }, 1, 1000);
    const price = CATALOG.objects.armchair.price;
    expect(sim.dispatch({ type: 'buy', defId: 'armchair', x: 4, y: 4, rot: 0 })).toBe(true);
    expect(sim.world.household.funds).toBe(1000 - price);
    const obj = sim.world.objects[0];
    expect(obj.paid).toBe(price);
    expect(sim.getNav().isFree(4, 4)).toBe(false);
  });

  it('sem dinheiro não compra', () => {
    const sim = openField(8, 8, [], { x: 0, y: 0 }, 1, 100);
    expect(sim.dispatch({ type: 'buy', defId: 'tv', x: 4, y: 4, rot: 0 })).toBe(false);
    expect(sim.lastProblem).toBe('funds');
    expect(sim.world.objects).toHaveLength(0);
  });

  it('recusa lugar ocupado, fora do terreno, em cima do folk ou que fecha passagem', () => {
    const sim = openField(5, 5, [{ defId: 'plant', x: 2, y: 2 }], { x: 0, y: 0 });
    const check = (defId: string, x: number, y: number, rot: 0 | 1 = 0) =>
      checkPlacement(sim.world, CATALOG, defId, x, y, rot).problem;
    expect(check('plant', 2, 2)).toBe('occupied');
    expect(check('sofa', 4, 0)).toBe('outside');
    expect(check('plant', 0, 0)).toBe('folk');
    // corredor de 1 tile: fechar o único caminho é proibido
    const hall = openField(3, 1, [], { x: 0, y: 0 });
    expect(checkPlacement(hall.world, CATALOG, 'plant', 1, 0, 0).problem).toBe('blocksWay');
  });

  it('girar troca a área ocupada e os lados de uso', () => {
    const def = CATALOG.objects.sofa;
    expect(footprint({ x: 1, y: 1, rot: 0 }, def)).toEqual([
      { x: 1, y: 1 },
      { x: 2, y: 1 },
    ]);
    expect(footprint({ x: 1, y: 1, rot: 1 }, def)).toEqual([
      { x: 1, y: 1 },
      { x: 1, y: 2 },
    ]);
    const sim = openField(6, 6, [], { x: 0, y: 0 });
    sim.dispatch({ type: 'buy', defId: 'sofa', x: 2, y: 2, rot: 1 });
    const obj = sim.world.objects[0];
    // sofá virado para o leste: só se usa pelo lado leste
    const tiles = useTiles(sim.world, sim.getNav(), obj, def);
    expect(tiles.every((t) => t.x === 3)).toBe(true);
    expect(tiles).toHaveLength(2);
  });

  it('vender devolve o valor de hoje e tira o objeto da fila de quem ia usar', () => {
    const sim = openField(8, 8, [], { x: 0, y: 0 }, 1, 1000);
    sim.dispatch({ type: 'buy', defId: 'easel', x: 5, y: 5, rot: 0 });
    const obj = sim.world.objects[0];
    const folk = sim.world.folks[0];
    run(sim, MINUTES_PER_DAY); // passou da virada do dia: já desvalorizou
    sim.dispatch({ type: 'queueUse', folkId: folk.id, objectId: obj.id, interactionId: 'paint' });
    const funds = sim.world.household.funds;
    const value = sellValue(sim.world, obj, CATALOG.objects.easel);
    expect(sim.dispatch({ type: 'sell', objectId: obj.id })).toBe(true);
    expect(sim.world.household.funds).toBe(funds + value);
    expect(value).toBeLessThan(CATALOG.objects.easel.price);
    expect(folk.queue).toHaveLength(0);
  });

  it('não vende nem move o que está em uso', () => {
    const sim = openField(6, 6, [{ defId: 'easel', x: 2, y: 2 }], { x: 2, y: 3, needs: { fun: 0 } });
    const folk = sim.world.folks[0];
    const obj = sim.world.objects[0];
    sim.dispatch({ type: 'queueUse', folkId: folk.id, objectId: obj.id, interactionId: 'paint' });
    run(sim, 3);
    expect(folk.queue[0].phase).toBe('using');
    expect(sim.dispatch({ type: 'sell', objectId: obj.id })).toBe(false);
    expect(sim.lastProblem).toBe('inUse');
    expect(sim.dispatch({ type: 'move', objectId: obj.id, x: 4, y: 4, rot: 0 })).toBe(false);
  });

  it('mover troca o lugar sem custo', () => {
    const sim = openField(6, 6, [{ defId: 'plant', x: 2, y: 2 }], { x: 0, y: 0 });
    const funds = sim.world.household.funds;
    const obj = sim.world.objects[0];
    expect(sim.dispatch({ type: 'move', objectId: obj.id, x: 4, y: 1, rot: 0 })).toBe(true);
    expect([obj.x, obj.y]).toEqual([4, 1]);
    expect(sim.world.household.funds).toBe(funds);
    expect(sim.getNav().isFree(2, 2)).toBe(true);
  });

  it('a refeição sai da despensa, o lanche cobra e a IA não escolhe o que não pode pagar', () => {
    const broke = openField(6, 6, [{ defId: 'fridge', x: 2, y: 2 }], { x: 2, y: 3, needs: { hunger: 5 } }, 1, 0);
    broke.world.household.pantry = 0;
    play(broke, 30);
    expect(broke.world.folks[0].queue.some((a) => a.objectId === broke.world.objects[0].id)).toBe(false);
    expect(broke.world.folks[0].needs.hunger).toBeLessThan(5);

    // com comida na geladeira, come mesmo sem dinheiro
    const stocked = openField(6, 6, [{ defId: 'fridge', x: 2, y: 2 }], { x: 2, y: 3, needs: { hunger: 5 } }, 1, 0);
    play(stocked, 30);
    expect(stocked.world.folks[0].needs.hunger).toBeGreaterThan(20);
    expect(stocked.world.household.pantry).toBeLessThan(16);
    expect(stocked.world.household.funds).toBe(0);

    // sem estoque, sobra o lanche, que é pago
    const snack = openField(6, 6, [{ defId: 'fridge', x: 2, y: 2 }], { x: 2, y: 3, needs: { hunger: 5 } }, 1, 100);
    snack.world.household.pantry = 0;
    play(snack, 30);
    expect(snack.world.folks[0].needs.hunger).toBeGreaterThan(20);
    expect(snack.world.household.funds).toBeLessThan(100);
  });

  it('as contas chegam pelo correio a cada três dias e crescem com o valor dos móveis', () => {
    const sim = starterSim(3);
    const house = sim.world.household;
    const first = house.nextBills;
    const funds = house.funds;
    const amount = billAmount(sim.world, CATALOG);
    expect(amount).toBeGreaterThan(0);
    sim.world.folks[0].needs = { ...sim.world.folks[0].needs, bladder: 100, energy: 100 };
    while (sim.world.tick < first) sim.step();
    expect(house.nextBills).toBe(first + BILL_INTERVAL);
    expect(house.lastBill).toBe(amount);
    // bloco 2: a conta chega como carta e só sai do caixa quando alguém paga
    expect(house.bills).toHaveLength(1);
    expect(house.bills[0].power + house.bills[0].water + house.bills[0].furniture).toBe(amount);
    expect(house.funds).toBe(funds);
    sim.dispatch({ type: 'buy', defId: 'tv', x: 14, y: 10, rot: 0 });
    expect(billAmount(sim.world, CATALOG)).toBeGreaterThan(amount);
  });
});
