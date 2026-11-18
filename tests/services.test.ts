import { describe, expect, it } from 'vitest';
import { CATALOG } from '../src/data/catalog';
import { NEIGHBORS, NEIGHBOR_TIES } from '../src/data/neighbors';
import {
  BAILIFF_GRACE_DAYS,
  BILL_DUE_DAYS,
  FAIR,
  GROCERIES,
  MAID,
  MINUTES_PER_DAY,
  SAVE_VERSION,
  TAKEOUT,
  classifiedsOpen,
  debtOf,
  deserialize,
  frontDoor,
  makeBill,
  serialize,
  serviceNeighbor,
} from '../src/sim';
import type { Folk, Sim } from '../src/sim';
import { householdSim, run } from './helpers';

/** Casa pronta com a vizinhança, sem visitas surpresa. */
function house(seed = 1): Sim {
  const sim = householdSim(seed);
  sim.world.lastDropIn = sim.world.tick + 99999;
  return sim;
}

/** Roda até a condição valer (ou estourar o limite). */
function runUntil(sim: Sim, cond: () => boolean, max = 600): boolean {
  for (let i = 0; i < max; i++) {
    if (cond()) return true;
    sim.step();
  }
  return cond();
}

/** Vai até a hora pedida do dia `day` (índice a partir de 0). */
function goTo(sim: Sim, day: number, hour: number): void {
  sim.world.tick = day * MINUTES_PER_DAY + hour * 60 - 1;
  sim.world.household.nextBills = sim.world.tick + 99 * MINUTES_PER_DAY;
}

const hasLog = (sim: Sim, key: string) => sim.world.log.some((l) => l.key === key);

describe('despensa', () => {
  it('a refeição gasta porção; sem estoque a geladeira só dá lanche ou comida pedida', () => {
    const sim = house();
    const [tome] = sim.world.folks;
    for (const f of sim.world.folks) f.autonomy = false;
    const fridge = sim.world.objects.find((o) => o.defId === 'fridge')!;
    const before = sim.world.household.pantry;
    tome.needs.hunger = 20;
    expect(sim.dispatch({ type: 'queueUse', folkId: tome.id, objectId: fridge.id, interactionId: 'meal' })).toBe(true);
    run(sim, 60);
    expect(sim.world.household.pantry).toBe(before - 1);
    expect(tome.needs.hunger).toBeGreaterThan(60);

    sim.world.household.pantry = 0;
    expect(sim.dispatch({ type: 'queueUse', folkId: tome.id, objectId: fridge.id, interactionId: 'meal' })).toBe(false);
    expect(sim.lastProblem).toBe('noFood');
    expect(sim.dispatch({ type: 'queueUse', folkId: tome.id, objectId: fridge.id, interactionId: 'takeout' })).toBe(false);
    expect(sim.dispatch({ type: 'queueUse', folkId: tome.id, objectId: fridge.id, interactionId: 'snack' })).toBe(true);
  });

  it('mercado por telefone: paga na hora, o entregador toca a campainha e as porções entram', () => {
    const sim = house(2);
    goTo(sim, 1, 9);
    const [tome, lia] = sim.world.folks;
    lia.autonomy = false;
    tome.autonomy = true;
    for (const f of sim.world.folks) Object.assign(f.needs, { hunger: 90, energy: 90, bladder: 90, hygiene: 90, fun: 90, social: 90, comfort: 90 });
    sim.world.household.pantry = 2;
    const funds = sim.world.household.funds;
    expect(sim.dispatch({ type: 'callService', folkId: tome.id, service: 'groceries' })).toBe(true);
    expect(runUntil(sim, () => hasLog(sim, 'log.ordered.groceries'), 120)).toBe(true);
    expect(sim.world.household.funds).toBe(funds - GROCERIES.price);
    expect(sim.world.household.orders).toHaveLength(1);
    const zeca = serviceNeighbor(sim.world, 'courier')!;
    expect(runUntil(sim, () => !!sim.findFolk(zeca.id)?.visit?.rang && sim.findFolk(zeca.id)!.visit!.rang > 0, 200)).toBe(true);
    // ele espera na porta da frente, do lado de fora
    const door = frontDoor(sim.world, CATALOG);
    const courier = sim.findFolk(zeca.id)!;
    expect([courier.x, courier.y]).toEqual([door.x, door.y]);
    // quem está em casa atende
    expect(runUntil(sim, () => hasLog(sim, 'log.groceriesIn'), 120)).toBe(true);
    expect(sim.world.household.pantry).toBe(2 + GROCERIES.portions);
  });

  it('comida pronta: chega, é paga na porta com gorjeta e vira porções para todos', () => {
    const sim = house(3);
    goTo(sim, 1, 12);
    const [tome, lia] = sim.world.folks;
    lia.autonomy = false;
    sim.world.household.pantry = 0;
    const funds = sim.world.household.funds;
    expect(sim.dispatch({ type: 'callService', folkId: tome.id, service: 'takeout' })).toBe(true);
    // pedir duas vezes não dá
    run(sim, 30);
    expect(sim.dispatch({ type: 'callService', folkId: tome.id, service: 'takeout' })).toBe(false);
    expect(sim.lastProblem).toBe('already');
    expect(runUntil(sim, () => sim.world.household.takeout > 0, 300)).toBe(true);
    const paid = funds - sim.world.household.funds;
    expect(paid).toBeGreaterThanOrEqual(TAKEOUT.price / 2);
    expect(sim.world.household.takeout).toBe(TAKEOUT.portions);
    const zeca = serviceNeighbor(sim.world, 'courier')!;
    if (hasLog(sim, 'log.takeoutIn') || hasLog(sim, 'log.takeoutLate')) {
      expect(sim.world.relations[`${zeca.id}>${tome.id}`] ?? sim.world.relations[`${zeca.id}>${lia.id}`]).toBeDefined();
    }
    const fridge = sim.world.objects.find((o) => o.defId === 'fridge')!;
    // só a Lia come agora (o Tomé, com fome, poderia pegar uma porção também)
    tome.autonomy = false;
    tome.queue = [];
    lia.needs.hunger = 20;
    expect(sim.dispatch({ type: 'queueUse', folkId: lia.id, objectId: fridge.id, interactionId: 'takeout' })).toBe(true);
    run(sim, 40);
    expect(sim.world.household.takeout).toBe(TAKEOUT.portions - 1);
  });

  it('feira de sábado de manhã: mais barata, só na calçada e só até as 10h', () => {
    const sim = house(4);
    const [tome, lia] = sim.world.folks;
    for (const f of sim.world.folks) f.autonomy = false;
    const box = sim.world.objects.find((o) => o.defId === 'mailbox')!;
    goTo(sim, 2, 8); // quarta
    sim.step();
    expect(sim.dispatch({ type: 'queueUse', folkId: tome.id, objectId: box.id, interactionId: 'fair' })).toBe(false);
    expect(sim.lastProblem).toBe('closed');
    goTo(sim, FAIR.day, 7); // sábado
    sim.step();
    sim.world.household.pantry = 4;
    const funds = sim.world.household.funds;
    expect(sim.dispatch({ type: 'queueUse', folkId: lia.id, objectId: box.id, interactionId: 'fair' })).toBe(true);
    expect(runUntil(sim, () => hasLog(sim, 'log.fairBought'), 120)).toBe(true);
    expect(sim.world.household.pantry).toBe(4 + FAIR.portions);
    expect(sim.world.household.funds).toBe(funds - FAIR.price);
    expect(FAIR.price).toBeLessThan(GROCERIES.price);
  });

  it('com a geladeira vazia e gente com fome, a IA pede comida sozinha', () => {
    const sim = house(5);
    goTo(sim, 1, 12);
    sim.world.household.pantry = 0;
    for (const f of sim.world.folks) f.needs.hunger = 30;
    expect(
      runUntil(sim, () => hasLog(sim, 'log.ordered.groceries') || hasLog(sim, 'log.ordered.takeout'), 240),
    ).toBe(true);
  });
});

describe('campainha', () => {
  function guestAtDoor(sim: Sim): Folk {
    const n = sim.world.neighbors.find((x) => !x.service)!;
    sim.world.pendingVisits.push({ neighborId: n.id, at: sim.world.tick + 1, hostId: 0 });
    runUntil(sim, () => (sim.findFolk(n.id)?.visit?.rang ?? -1) >= 0, 120);
    return sim.findFolk(n.id)!;
  }

  it('quem chega toca e espera do lado de fora; ninguém atende e vai embora chateado', () => {
    const sim = house(6);
    goTo(sim, 1, 14);
    for (const f of sim.world.folks) f.autonomy = false;
    const guest = guestAtDoor(sim);
    expect(guest.visit!.admitted).toBe(false);
    expect(hasLog(sim, 'log.ring')).toBe(true);
    // na porta não dá para puxar conversa: primeiro alguém atende
    const host = sim.world.folks[0];
    expect(sim.dispatch({ type: 'queueSocial', folkId: host.id, otherId: guest.id, socialId: 'chat' })).toBe(false);
    expect(sim.lastProblem).toBe('atDoor');
    expect(runUntil(sim, () => hasLog(sim, 'log.noAnswer'), 120)).toBe(true);
    const mem = sim.world.relations[`${guest.id}>${host.id}`]?.memories ?? [];
    expect(mem.some((m) => m.kind === 'leftAtDoor')).toBe(true);
  });

  it('atender: convidar para entrar ou dispensar', () => {
    const sim = house(7);
    goTo(sim, 1, 14);
    for (const f of sim.world.folks) f.autonomy = false;
    const host = sim.world.folks[0];
    const guest = guestAtDoor(sim);
    expect(sim.dispatch({ type: 'answerDoor', folkId: host.id, otherId: guest.id, welcome: true })).toBe(true);
    expect(runUntil(sim, () => guest.visit!.admitted, 120)).toBe(true);
    expect(sim.world.log.some((e) => e.key.startsWith('log.welcomed'))).toBe(true);

    const sim2 = house(8);
    goTo(sim2, 1, 14);
    for (const f of sim2.world.folks) f.autonomy = false;
    const host2 = sim2.world.folks[0];
    const guest2 = guestAtDoor(sim2);
    expect(sim2.dispatch({ type: 'answerDoor', folkId: host2.id, otherId: guest2.id, welcome: false })).toBe(true);
    expect(runUntil(sim2, () => guest2.visit!.leaving, 120)).toBe(true);
    const mem = sim2.world.relations[`${guest2.id}>${host2.id}`]?.memories ?? [];
    expect(mem.some((m) => m.kind === 'turnedAway')).toBe(true);
  });

  it('com a IA ligada, alguém da casa larga o que faz e atende', () => {
    const sim = house(9);
    goTo(sim, 1, 14);
    const guest = guestAtDoor(sim);
    expect(runUntil(sim, () => guest.visit!.admitted || guest.visit!.leaving, 60)).toBe(true);
    expect(guest.visit!.admitted).toBe(true);
  });

  it('sem ninguém para atender, o mercado fica na porta', () => {
    const sim = house(10);
    goTo(sim, 1, 10);
    for (const f of sim.world.folks) f.autonomy = false;
    sim.world.household.pantry = 0;
    sim.world.household.orders.push({ id: 999, kind: 'groceries', at: sim.world.tick + 2, promised: 0, by: 0, price: 0 });
    expect(runUntil(sim, () => hasLog(sim, 'log.groceriesLeft'), 200)).toBe(true);
    expect(sim.world.household.pantry).toBe(GROCERIES.portions);
  });
});

describe('correio e contas', () => {
  it('a conta chega como carta, detalhada, e é paga na caixa de correio', () => {
    const sim = house(11);
    for (const f of sim.world.folks) f.autonomy = false;
    const house0 = sim.world.household;
    house0.nextBills = sim.world.tick + 2;
    run(sim, 3);
    expect(house0.bills).toHaveLength(1);
    const bill = house0.bills[0];
    expect(bill.power).toBeGreaterThan(0);
    expect(bill.water).toBeGreaterThan(0);
    expect(bill.due - bill.tick).toBe(BILL_DUE_DAYS * MINUTES_PER_DAY);
    expect(hasLog(sim, 'log.billArrived')).toBe(true);
    const funds = house0.funds;
    const box = sim.world.objects.find((o) => o.defId === 'mailbox')!;
    const tome = sim.world.folks[0];
    expect(sim.dispatch({ type: 'queueUse', folkId: tome.id, objectId: box.id, interactionId: 'pay' })).toBe(true);
    expect(runUntil(sim, () => house0.bills.length === 0, 120)).toBe(true);
    expect(house0.funds).toBe(funds - (bill.power + bill.water + bill.furniture));
    // sem conta, não há o que pagar
    expect(sim.dispatch({ type: 'queueUse', folkId: tome.id, objectId: box.id, interactionId: 'pay' })).toBe(false);
    expect(sim.lastProblem).toBe('noBills');
  });

  it('a IA paga as contas sozinha quando tem dinheiro', () => {
    const sim = house(12);
    goTo(sim, 1, 15);
    sim.world.household.bills.push(makeBill(sim.world, CATALOG, 90));
    expect(runUntil(sim, () => sim.world.household.bills.length === 0, 2 * MINUTES_PER_DAY)).toBe(true);
  });

  it('conta vencida demais traz o oficial de penhora, que leva móveis até cobrir', () => {
    const sim = house(13);
    for (const f of sim.world.folks) f.autonomy = false;
    goTo(sim, 8, 9);
    const bill = makeBill(sim.world, CATALOG, 400);
    bill.tick = sim.world.tick - (BILL_DUE_DAYS + BAILIFF_GRACE_DAYS + 1) * MINUTES_PER_DAY;
    bill.due = bill.tick + BILL_DUE_DAYS * MINUTES_PER_DAY;
    sim.world.household.bills.push(bill);
    sim.world.household.funds = 0;
    const objects = sim.world.objects.length;
    const officer = serviceNeighbor(sim.world, 'bailiff')!;
    expect(runUntil(sim, () => !!sim.findFolk(officer.id), 90)).toBe(true);
    // ele não toca a campainha: entra direto
    expect(sim.findFolk(officer.id)!.visit!.admitted).toBe(true);
    expect(runUntil(sim, () => debtOf(sim.world) === 0, 400)).toBe(true);
    expect(sim.world.objects.length).toBeLessThan(objects);
    expect(hasLog(sim, 'log.seized')).toBe(true);
    // a caixa de correio e o latão ficam
    expect(sim.world.objects.some((o) => o.defId === 'mailbox')).toBe(true);
    expect(sim.world.news.some((n) => n.kind === 'repossessed')).toBe(true);
  });
});

describe('prestadores de serviço', () => {
  it('a faxineira contratada vem de manhã, limpa a casa e cobra a diária', () => {
    const sim = house(14);
    for (const f of sim.world.folks) f.autonomy = false;
    goTo(sim, 1, 8);
    const tome = sim.world.folks[0];
    expect(sim.dispatch({ type: 'callService', folkId: tome.id, service: 'maid' })).toBe(true);
    expect(runUntil(sim, () => sim.world.household.maid, 60)).toBe(true);
    // casa suja
    const shower = sim.world.objects.find((o) => o.defId === 'shower')!;
    shower.state.dirt = 80;
    sim.world.mess.push({ id: 9001, kind: 'plate', x: 8, y: 8, tick: sim.world.tick, by: tome.id });
    sim.world.mess.push({ id: 9002, kind: 'puddle', x: 10, y: 3, tick: sim.world.tick, by: tome.id });
    const funds = sim.world.household.funds;
    const marta = serviceNeighbor(sim.world, 'maid')!;
    expect(runUntil(sim, () => !!sim.findFolk(marta.id), 120)).toBe(true);
    // ninguém atende: ela tem a chave
    expect(runUntil(sim, () => hasLog(sim, 'log.maidDone'), 300)).toBe(true);
    expect(hasLog(sim, 'log.letSelfIn')).toBe(true);
    expect(shower.state.dirt).toBeLessThan(15);
    expect(sim.world.mess.filter((m) => m.id === 9001 || m.id === 9002)).toHaveLength(0);
    expect(sim.world.household.funds).toBeLessThanOrEqual(funds - MAID.fee);
    // dispensar de vez
    expect(sim.dispatch({ type: 'dismissService', service: 'maid' })).toBe(true);
    expect(sim.world.household.maid).toBe(false);
  });

  it('o técnico conserta o que quebrou sem gambiarra e cobra pelas horas', () => {
    const sim = house(15);
    goTo(sim, 1, 9);
    for (const f of sim.world.folks) f.autonomy = false;
    const tv = sim.world.objects.find((o) => o.defId === 'tv')!;
    tv.state.broken = true;
    tv.state.wear = 90;
    const tome = sim.world.folks[0];
    const funds = sim.world.household.funds;
    expect(sim.dispatch({ type: 'callService', folkId: tome.id, service: 'repair' })).toBe(true);
    expect(runUntil(sim, () => hasLog(sim, 'log.repairDone'), 600)).toBe(true);
    expect(tv.state.broken).toBe(false);
    expect(tv.state.patched).toBe(false);
    expect(sim.world.household.funds).toBeLessThan(funds - 40);
  });
});

describe('jornal', () => {
  it('chega às 6h na calçada; quem lê abre os classificados do dia; jornal velho acumula', () => {
    const sim = house(16);
    for (const f of sim.world.folks) f.autonomy = false;
    goTo(sim, 1, 6);
    sim.world.mess = [];
    run(sim, 2);
    const paper = sim.world.mess.find((m) => m.kind === 'paper')!;
    expect(paper).toBeDefined();
    expect(classifiedsOpen(sim.world)).toBe(false);
    const tome = sim.world.folks[0];
    expect(sim.dispatch({ type: 'queueTidy', folkId: tome.id, messId: paper.id })).toBe(true);
    expect(runUntil(sim, () => !sim.world.mess.some((m) => m.id === paper.id), 120)).toBe(true);
    expect(classifiedsOpen(sim.world)).toBe(true);
    // ninguém pega por vários dias: no máximo 4 jornais na calçada
    for (let d = 2; d < 9; d++) {
      goTo(sim, d, 6);
      run(sim, 2);
    }
    expect(sim.world.mess.filter((m) => m.kind === 'paper').length).toBe(4);
    expect(classifiedsOpen(sim.world)).toBe(false);
  });
});

describe('semana sem jogador (bloco 2)', () => {
  it('a casa compra comida, paga as contas e ninguém passa fome nem vê o oficial', () => {
    const sim = householdSim(21);
    const start = sim.world.tick;
    let starving = 0;
    let orders = 0;
    let seen = 0;
    while (sim.world.tick < start + 7 * MINUTES_PER_DAY) {
      sim.step();
      for (const f of sim.residents()) if (f.needs.hunger <= 0) starving++;
      for (const l of sim.world.log) {
        if (l.tick <= seen) continue;
        if (l.key.startsWith('log.ordered.') || l.key === 'log.fairBought') orders++;
      }
      seen = sim.world.tick;
    }
    expect(orders).toBeGreaterThan(0);
    expect(starving).toBeLessThan(60);
    expect(sim.world.household.funds).toBeGreaterThan(0);
    expect(sim.world.log.some((l) => l.key === 'log.seized')).toBe(false);
    // contas não acumulam: no máximo a última, ainda no prazo
    expect(sim.world.household.bills.every((b) => sim.world.tick < b.due + BAILIFF_GRACE_DAYS * MINUTES_PER_DAY)).toBe(true);
  });
});

describe('save v7', () => {
  it('um save v6 abre com despensa, prestadores novos e caixa de correio', () => {
    const sim = householdSim(30);
    const old = serialize(sim.world, 1) as unknown as { version: number; world: Record<string, unknown> };
    const w = old.world as Record<string, any>;
    old.version = 6;
    w.objects = w.objects.filter((o: { defId: string }) => o.defId !== 'mailbox');
    w.household = { funds: 900, nextBills: w.household.nextBills, lastBill: 50 };
    w.neighbors = w.neighbors.filter((n: { service?: string }) => !n.service);
    for (const n of w.neighbors) delete n.service;
    const file = deserialize(JSON.parse(JSON.stringify(old)), { neighbors: NEIGHBORS, ties: NEIGHBOR_TIES, catalog: CATALOG });
    expect(file.version).toBe(SAVE_VERSION);
    const world = file.world;
    expect(world.household.funds).toBe(900);
    expect(world.household.pantry).toBeGreaterThan(0);
    expect(world.household.bills).toEqual([]);
    expect(world.objects.some((o) => o.defId === 'mailbox')).toBe(true);
    // bloco 11: a visitadora social é a quinta; bloco 13: o jardineiro, o sexto
    // bloco 2 a 13 (6) e, no bloco 14, bombeiros (2), policial, gatuno e o Seu Sereno
    expect(world.neighbors.filter((n) => n.service).length).toBe(11);
    // e o jogo segue rodando
    const again = householdSim(30);
    const tick = world.tick;
    again.load(world);
    run(again, 600);
    expect(again.world.tick).toBe(tick + 600);
  });
});
