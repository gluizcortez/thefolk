import { describe, expect, it } from 'vitest';
import { CATALOG } from '../src/data/catalog';
import {
  BOARD_HOUR,
  BOARD_SIZE,
  BUSINESS_CLOSE_HOUR,
  BUSINESS_START_QUALITY,
  MINUTES_PER_DAY,
  reputationOf,
  xpForLevel,
} from '../src/sim';
import type { Sim } from '../src/sim';
import { openField, run } from './helpers';

function workshop(skills: Record<string, number> = {}, funds = 3000): Sim {
  return openField(
    10,
    8,
    [
      { defId: 'desk', x: 2, y: 2 },
      { defId: 'easel', x: 6, y: 2 },
      { defId: 'stove', x: 8, y: 5 },
    ],
    { x: 4, y: 5, skills, needs: { hunger: 100, energy: 100, bladder: 100, hygiene: 100, comfort: 100, fun: 100, social: 100 } },
    3,
    funds,
  );
}

function untilHour(sim: Sim, hour: number): void {
  do sim.step();
  while (sim.world.tick % MINUTES_PER_DAY !== hour * 60);
}

const objOf = (sim: Sim, defId: string) => sim.world.objects.find((o) => o.defId === defId)!;

describe('frilas', () => {
  it('o mural troca as ofertas toda manhã', () => {
    const sim = workshop();
    expect(sim.world.gigBoard).toHaveLength(0);
    untilHour(sim, BOARD_HOUR);
    expect(sim.world.gigBoard).toHaveLength(BOARD_SIZE);
    const first = sim.world.gigBoard.map((o) => o.id);
    untilHour(sim, BOARD_HOUR);
    expect(sim.world.gigBoard.map((o) => o.id)).not.toEqual(first);
  });

  it('pegar, fazer no objeto certo, entregar e receber', () => {
    const sim = workshop({ logic: xpForLevel(2) });
    const folk = sim.world.folks[0];
    sim.world.gigBoard = [{ id: 999, defId: 'ledger', pay: 120 }];
    // sem frila, o computador recusa
    const desk = objOf(sim, 'desk');
    expect(sim.dispatch({ type: 'queueUse', folkId: folk.id, objectId: desk.id, interactionId: 'freelance' })).toBe(false);
    expect(sim.lastProblem).toBe('noGig');
    expect(sim.dispatch({ type: 'takeGig', folkId: folk.id, offerId: 999 })).toBe(true);
    expect(sim.world.gigBoard).toHaveLength(0);
    expect(folk.gig?.defId).toBe('ledger');
    // o cavalete não serve para planilha
    const easel = objOf(sim, 'easel');
    expect(sim.dispatch({ type: 'queueUse', folkId: folk.id, objectId: easel.id, interactionId: 'freelance' })).toBe(false);
    const funds = sim.world.household.funds;
    for (let i = 0; i < 3 && folk.gig; i++) {
      sim.dispatch({ type: 'queueUse', folkId: folk.id, objectId: desk.id, interactionId: 'freelance' });
      run(sim, 130);
    }
    expect(folk.gig).toBeNull();
    expect(sim.world.household.funds).toBeGreaterThanOrEqual(funds + 120);
    expect(sim.world.log.some((l) => l.key === 'log.gigDone')).toBe(true);
    expect(reputationOf(sim.world, folk.id)).toBeGreaterThan(0);
    expect(folk.skills.logic).toBeGreaterThan(xpForLevel(2));
  });

  it('frila exige nível e estoura o prazo se ninguém fizer', () => {
    const sim = workshop();
    const folk = sim.world.folks[0];
    sim.world.gigBoard = [
      { id: 1, defId: 'audit', pay: 290 },
      { id: 2, defId: 'jingle', pay: 70 },
    ];
    expect(sim.dispatch({ type: 'takeGig', folkId: folk.id, offerId: 1 })).toBe(false);
    expect(sim.lastProblem).toBe('skillTooLow');
    expect(sim.dispatch({ type: 'takeGig', folkId: folk.id, offerId: 2 })).toBe(true);
    expect(sim.dispatch({ type: 'takeGig', folkId: folk.id, offerId: 1 })).toBe(false);
    expect(sim.lastProblem).toBe('hasGig');
    // bloco 14: dois dias sem comer matariam; aqui só interessa o prazo
    sim.world.rules.death = false;
    run(sim, 2 * MINUTES_PER_DAY + 1);
    expect(folk.gig).toBeNull();
    expect(sim.world.log.some((l) => l.key === 'log.gigLate')).toBe(true);
    expect(reputationOf(sim.world, folk.id)).toBeLessThan(0);
  });
});

describe('negócio próprio', () => {
  it('abrir custa, larga o emprego e não deixa pegar outro', () => {
    const sim = workshop();
    const folk = sim.world.folks[0];
    sim.dispatch({ type: 'takeJob', folkId: folk.id, careerId: 'kitchen' });
    const funds = sim.world.household.funds;
    expect(sim.dispatch({ type: 'openBusiness', folkId: folk.id, businessId: 'bakery' })).toBe(true);
    expect(sim.world.household.funds).toBe(funds - CATALOG.businesses.bakery.cost);
    expect(folk.job).toBeNull();
    expect(folk.business?.quality).toBe(BUSINESS_START_QUALITY);
    expect(sim.dispatch({ type: 'takeJob', folkId: folk.id, careerId: 'office' })).toBe(false);
    expect(sim.lastProblem).toBe('hasBusiness');
    expect(sim.world.news.some((n) => n.kind === 'openedBusiness')).toBe(true);
  });

  it('sem dinheiro não abre', () => {
    const sim = workshop({}, 100);
    expect(sim.dispatch({ type: 'openBusiness', folkId: sim.world.folks[0].id, businessId: 'bakery' })).toBe(false);
    expect(sim.lastProblem).toBe('funds');
  });

  it('trabalho sobe a qualidade e o caixa fecha todo dia às 21h', () => {
    const sim = workshop({ cooking: xpForLevel(3) });
    const folk = sim.world.folks[0];
    sim.world.rules.death = false; // bloco 14: sem autonomia por dois dias, a fome mataria
    sim.dispatch({ type: 'openBusiness', folkId: folk.id, businessId: 'bakery' });
    const stove = objOf(sim, 'stove');
    expect(sim.dispatch({ type: 'queueUse', folkId: folk.id, objectId: stove.id, interactionId: 'business' })).toBe(true);
    run(sim, 125);
    expect(folk.business!.quality).toBeGreaterThan(BUSINESS_START_QUALITY + 10);
    const funds = sim.world.household.funds;
    untilHour(sim, BUSINESS_CLOSE_HOUR);
    expect(folk.business!.days).toBe(1);
    expect(folk.business!.lastCustomers).toBeGreaterThan(0);
    expect(sim.world.household.funds).toBe(funds + folk.business!.lastProfit);
    // de um dia para o outro sem cuidar, a qualidade cai
    const q = folk.business!.quality;
    untilHour(sim, BUSINESS_CLOSE_HOUR);
    expect(folk.business!.quality).toBeLessThan(q);
  });

  it('fechar devolve parte do investimento', () => {
    const sim = workshop();
    const folk = sim.world.folks[0];
    sim.dispatch({ type: 'openBusiness', folkId: folk.id, businessId: 'signShop' });
    const funds = sim.world.household.funds;
    expect(sim.dispatch({ type: 'closeBusiness', folkId: folk.id })).toBe(true);
    expect(folk.business).toBeNull();
    expect(sim.world.household.funds).toBe(funds + Math.round(CATALOG.businesses.signShop.cost * 0.25));
  });
});
