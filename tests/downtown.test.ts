import { describe, expect, it } from 'vitest';
import { CATALOG } from '../src/data/catalog';
import { CENTRO } from '../src/data/downtown';
import { starterHouse } from '../src/data/house';
import { NEIGHBORS, NEIGHBOR_TIES } from '../src/data/neighbors';
import { TOWN } from '../src/data/town';
import {
  CLOSE_HOUR,
  DATE_ROMANCE,
  SAVE_VERSION,
  Sim,
  TAXI_FARE,
  buildHome,
  createWorld,
  dateGrade,
  dateScore,
  deserialize,
  ensureRelation,
  foundTown,
  relationOf,
  serialize,
  useTiles,
  buildNav,
  newJob,
} from '../src/sim';
import type { DateState, Folk, World } from '../src/sim';
import { reachable } from '../src/sim/economy';
import { run } from './helpers';

const CTX = { neighbors: NEIGHBORS, ties: NEIGHBOR_TIES, catalog: CATALOG, town: TOWN };

function townSim(seed = 3): Sim {
  const world = createWorld(starterHouse(seed));
  foundTown(world, CATALOG, TOWN);
  return new Sim(CATALOG, world);
}

/** Avança até a hora `hour` (do mesmo dia ou do seguinte). */
function until(sim: Sim, hour: number): void {
  while (Math.floor((sim.world.tick % 1440) / 60) !== hour) sim.step();
}

const tome = (w: World) => w.folks.find((f) => f.name === 'Tomé Varanda')!;
const lia = (w: World) => w.folks.find((f) => f.name === 'Lia Sacada')!;
const objectOf = (w: World, defId: string) => w.objects.find((o) => o.defId === defId)!;
const calm = (sim: Sim) => {
  for (const f of sim.world.folks.filter((x) => !x.visit)) sim.dispatch({ type: 'setAutonomy', folkId: f.id, on: false });
};
const fill = (f: Folk) => {
  f.needs = { ...f.needs, hunger: 30, energy: 90, bladder: 90, hygiene: 90, fun: 60, social: 60, comfort: 70 };
};

describe('bloco 16: o lote do centro', () => {
  it('a planta do centro monta sem móvel fora do lugar e tudo é alcançável da calçada', () => {
    const sim = townSim();
    const { home, misplaced } = buildHome(sim.world, CATALOG, CENTRO);
    expect(misplaced).toEqual([]);
    const w = { ...sim.world, grid: home.grid, objects: home.objects, exit: home.exit, folks: [], fires: [] } as World;
    const nav = buildNav(w, CATALOG);
    for (const o of home.objects) {
      const def = CATALOG.objects[o.defId];
      if (def.layer || def.interactions.length === 0) continue;
      const reach = reachable(nav, home.exit);
      expect(useTiles(w, nav, o, def).some((t) => reach.has(t.y * home.grid.w + t.x)), `${o.defId}@${o.x},${o.y}`).toBe(true);
    }
    expect(nav.isFree(CENTRO.pass!.x, CENTRO.pass!.y)).toBe(true);
    // cantina, café, bazar e largo
    for (const id of ['bistro', 'espresso', 'clothesrack', 'giftshelf', 'bazaar', 'fountain', 'parkbench', 'toilet']) {
      expect(home.objects.some((o) => o.defId === id), id).toBe(true);
    }
  });

  it('a nota do encontro cresce com humor, conversa, jantar e presente', () => {
    const base: DateState = { host: 1, guest: 2, since: 0, mood: 0, samples: 0, good: 0, bad: 0, dined: 0, gifts: 0, wishes: 0 };
    const dull = dateScore({ ...base, mood: 40 * 4, samples: 4 });
    const great = dateScore({ ...base, mood: 80 * 4, samples: 4, good: 4, dined: 16, gifts: 1 });
    const awful = dateScore({ ...base, mood: 30 * 4, samples: 4, bad: 4 });
    expect(great).toBeGreaterThan(dull);
    expect(dull).toBeGreaterThan(awful);
    expect(dateGrade(great)).toBe(5);
    expect(dateGrade(awful)).toBe(1);
  });
});

describe('bloco 16: ir ao centro de táxi', () => {
  it('quem vai sai de casa, a casa fica guardada com quem ficou e o garçom está na cantina', () => {
    const sim = townSim();
    const w = sim.world;
    const funds = w.household.funds;
    const homeObjects = w.objects.length;
    expect(sim.dispatch({ type: 'goDowntown', folkIds: [tome(w).id] })).toBe(true);
    expect(w.outing).not.toBeNull();
    expect(w.household.funds).toBe(funds - TAXI_FARE);
    expect(w.folks.filter((f) => !f.visit).map((f) => f.name)).toEqual(['Tomé Varanda']);
    expect(w.outing!.home.folks.map((f) => f.name)).toEqual(['Lia Sacada']);
    expect(w.outing!.home.objects).toHaveLength(homeObjects);
    expect(w.objects.some((o) => o.defId === 'fountain')).toBe(true);
    const waiter = w.folks.find((f) => f.visit?.service?.kind === 'waiter');
    expect(waiter?.name).toBe('Tadeu Travessa');
    // não dá para ir de novo, nem trocar de família no meio do passeio
    expect(sim.dispatch({ type: 'goDowntown', folkIds: [tome(w).id] })).toBe(false);
    expect(sim.lastProblem).toBe('onOuting');
    // o tempo corre lá também; a volta traz todo mundo e cobra a volta
    run(sim, 60);
    expect(sim.dispatch({ type: 'goHome' })).toBe(true);
    expect(w.outing).toBeNull();
    expect(w.household.funds).toBeLessThanOrEqual(funds - 2 * TAXI_FARE);
    expect(w.folks.filter((f) => !f.visit).map((f) => f.name).sort()).toEqual(['Lia Sacada', 'Tomé Varanda']);
    expect(w.objects.some((o) => o.defId === 'fountain')).toBe(false);
    expect(w.objects).toHaveLength(homeObjects);
  });

  it('fechado de madrugada; criança não vai sem adulto', () => {
    const sim = townSim();
    const w = sim.world;
    w.tick = 3 * 60 + 1440; // dia 2, 3h
    expect(sim.dispatch({ type: 'goDowntown', folkIds: [tome(w).id] })).toBe(false);
    expect(sim.lastProblem).toBe('venueClosed');
    w.tick = 10 * 60 + 1440;
    lia(w).age = 'child';
    expect(sim.dispatch({ type: 'goDowntown', folkIds: [lia(w).id] })).toBe(false);
    expect(sim.lastProblem).toBe('kidAlone');
    expect(sim.dispatch({ type: 'goDowntown', folkIds: [tome(w).id] })).toBe(false);
    expect(sim.lastProblem).toBe('babyAlone');
    expect(sim.dispatch({ type: 'goDowntown', folkIds: [tome(w).id, lia(w).id] })).toBe(true);
  });

  it('às 2h o centro fecha e todo mundo volta sozinho', () => {
    const sim = townSim();
    const w = sim.world;
    until(sim, 22);
    expect(sim.dispatch({ type: 'goDowntown', folkIds: [tome(w).id, lia(w).id] })).toBe(true);
    for (const f of w.folks.filter((x) => !x.visit)) f.needs.energy = 100;
    calm(sim);
    until(sim, CLOSE_HOUR);
    run(sim, 1);
    expect(w.outing).toBeNull();
    expect(w.log.some((l) => l.key === 'log.venueClosing')).toBe(true);
  });

  it('quem ficou em casa vai trabalhar e volta para casa, não para o centro', () => {
    const sim = townSim();
    const w = sim.world;
    lia(w).job = newJob('office');
    const job = lia(w).job!;
    expect(sim.dispatch({ type: 'goDowntown', folkIds: [tome(w).id] })).toBe(true);
    const stayer = w.outing!.home.folks[0];
    const before = w.household.funds;
    // um dia inteiro no centro (ninguém cansa: Tomé fica de pé)
    for (let i = 0; i < 20 * 60 && w.outing; i++) {
      const t = tome(w);
      if (!t) throw new Error(`sumiu no tick ${w.tick}: ${w.folks.map((f) => f.name).join(',')} | ${w.log.slice(-5).map((l) => l.key).join(',')}`);
      t.needs.energy = 100;
      sim.step();
    }
    expect(job.shifts + (stayer.away ? 1 : 0)).toBeGreaterThan(0);
    expect(w.household.funds).toBeGreaterThan(before - 200);
  });
});

describe('bloco 16: encontros', () => {
  it('casal janta na cantina: o garçom anota, traz o prato e o encontro ganha nota e muda a relação', () => {
    const sim = townSim(5);
    const w = sim.world;
    until(sim, 19);
    const a = tome(w);
    const b = lia(w);
    for (const [x, y] of [
      [a.id, b.id],
      [b.id, a.id],
    ]) {
      const rel = ensureRelation(w, x, y);
      rel.friendship = 60;
      rel.romance = 40;
      rel.dating = true;
    }
    const before = relationOf(w, b.id, a.id)!.romance;
    expect(sim.dispatch({ type: 'goDowntown', folkIds: [a.id, b.id], dateId: b.id })).toBe(true);
    expect(w.outing!.date).toMatchObject({ host: a.id, guest: b.id });
    calm(sim);
    fill(a);
    fill(b);
    const table = objectOf(w, 'bistro');
    expect(sim.dispatch({ type: 'queueUse', folkId: a.id, objectId: table.id, interactionId: 'dish_moqueca' })).toBe(true);
    expect(sim.dispatch({ type: 'queueUse', folkId: b.id, objectId: table.id, interactionId: 'dish_galinhada' })).toBe(true);
    let served = 0;
    for (let i = 0; i < 150; i++) {
      sim.step();
      served = Math.max(served, w.outing!.orders.filter((o) => o.stage === 'served').length);
    }
    expect(w.log.some((l) => l.key === 'log.orderTaken')).toBe(true);
    expect(served).toBe(2);
    expect(a.needs.hunger).toBeGreaterThan(60);
    // conversa a dois no fim da noite
    sim.dispatch({ type: 'queueSocial', folkId: a.id, otherId: b.id, socialId: 'flirt' });
    run(sim, 30);
    expect(sim.dispatch({ type: 'goHome' })).toBe(true);
    const r = w.lastDate!;
    expect(r).toMatchObject({ host: a.id, guest: b.id });
    expect(r.grade).toBeGreaterThanOrEqual(3);
    const after = relationOf(w, b.id, a.id)!.romance;
    expect(after).toBeGreaterThanOrEqual(Math.min(100, before + DATE_ROMANCE[r.grade]) - 1);
    expect(w.log.some((l) => l.key === 'log.dateGreat' || l.key === 'log.dateOk')).toBe(true);
  });

  it('vizinho chamado para sair vem como visita do encontro, pode jantar e a casa paga', () => {
    const sim = townSim(7);
    const w = sim.world;
    until(sim, 18);
    const a = tome(w);
    const n = w.neighbors.find((x) => x.name === 'Heitor Vitrine')!;
    for (const [x, y] of [
      [a.id, n.id],
      [n.id, a.id],
    ]) {
      const rel = ensureRelation(w, x, y);
      rel.friendship = 80;
      rel.romance = 70;
      rel.dating = true;
    }
    // namorando firme, quase sempre topa (tenta de novo se o dado não ajudar)
    let went = false;
    for (let i = 0; i < 4 && !went; i++) went = sim.dispatch({ type: 'goDowntown', folkIds: [a.id], dateId: n.id });
    expect(went, String(sim.lastProblem)).toBe(true);
    const guest = w.folks.find((f) => f.id === n.id)!;
    expect(guest.visit?.date).toBe(true);
    // a visita não recebe ordens, mas com fome pede sozinha (e a conta vai para a casa)
    expect(sim.dispatch({ type: 'queueUse', folkId: guest.id, objectId: objectOf(w, 'bistro').id, interactionId: 'dish_caldo' })).toBe(false);
    guest.needs.hunger = 12;
    const funds = w.household.funds;
    run(sim, 60);
    expect(w.household.funds).toBeLessThan(funds);
    expect(w.log.some((l) => (l.key === 'log.ordered' || l.key === 'log.served') && JSON.stringify(l.params).includes('Heitor'))).toBe(true);
    sim.dispatch({ type: 'goHome' });
    expect(w.lastDate?.guest).toBe(n.id);
    expect(w.folks.some((f) => f.id === n.id)).toBe(false);
  });

  it('quem não gosta de quem chama recusa o convite', () => {
    const sim = townSim(2);
    const w = sim.world;
    const n = w.neighbors.find((x) => x.name === 'Iara Banca')!;
    const rel = ensureRelation(w, n.id, tome(w).id);
    rel.friendship = -80;
    rel.romance = -50;
    ensureRelation(w, tome(w).id, n.id);
    let refused = 0;
    for (let i = 0; i < 6; i++) {
      if (!sim.dispatch({ type: 'goDowntown', folkIds: [tome(w).id], dateId: n.id })) refused++;
      else sim.dispatch({ type: 'goHome' });
    }
    expect(refused).toBeGreaterThanOrEqual(5);
  });
});

describe('bloco 16: compras do centro', () => {
  it('presente da loja vai na sacola, dar presente aproxima e a encomenda chega em casa na volta', () => {
    const sim = townSim(4);
    const w = sim.world;
    until(sim, 10);
    const a = tome(w);
    const b = lia(w);
    expect(sim.dispatch({ type: 'goDowntown', folkIds: [a.id, b.id] })).toBe(true);
    calm(sim);
    fill(a);
    const shelf = objectOf(w, 'giftshelf');
    const bazaar = objectOf(w, 'bazaar');
    const rack = objectOf(w, 'clothesrack');
    const shirt = a.look.shirt;
    sim.dispatch({ type: 'queueUse', folkId: a.id, objectId: shelf.id, interactionId: 'gift_ramalhete' });
    sim.dispatch({ type: 'queueUse', folkId: a.id, objectId: bazaar.id, interactionId: 'order_globe' });
    sim.dispatch({ type: 'queueUse', folkId: a.id, objectId: rack.id, interactionId: 'clothes' });
    run(sim, 120);
    expect(a.gifts).toEqual(['ramalhete']);
    expect(w.outing!.parcels).toEqual(['globe']);
    expect(a.look.shirt).not.toBe(shirt);
    const friend = relationOf(w, b.id, a.id)?.friendship ?? 0;
    expect(sim.dispatch({ type: 'queueSocial', folkId: a.id, otherId: b.id, socialId: 'giveGift' })).toBe(true);
    run(sim, 30);
    expect(a.gifts).toEqual([]);
    expect(relationOf(w, b.id, a.id)!.friendship).toBeGreaterThan(friend);
    expect(sim.dispatch({ type: 'goHome' })).toBe(true);
    expect(w.objects.some((o) => o.defId === 'globe')).toBe(true);
    expect(w.log.some((l) => l.key === 'log.parcelArrived')).toBe(true);
  });

  it('figurantes aparecem no largo e dá para conhecer gente nova', () => {
    const sim = townSim(6);
    const w = sim.world;
    until(sim, 11);
    sim.dispatch({ type: 'goDowntown', folkIds: [tome(w).id, lia(w).id] });
    const seen = new Set<number>();
    for (let i = 0; i < 240; i++) {
      sim.step();
      for (const f of w.folks) if (f.visit && !f.visit.service && !f.visit.date) seen.add(f.id);
    }
    expect(seen.size).toBeGreaterThanOrEqual(2);
    expect([...seen].some((id) => w.neighbors.find((n) => n.id === id)?.downtown)).toBe(true);
  });
});

describe('bloco 16: save v20', () => {
  it('o save guarda o passeio no meio e volta igual', () => {
    const sim = townSim();
    sim.dispatch({ type: 'goDowntown', folkIds: [tome(sim.world).id] });
    run(sim, 30);
    const file = serialize(sim.world, 0);
    expect(file.version).toBe(SAVE_VERSION);
    expect(SAVE_VERSION).toBe(20);
    const back = new Sim(CATALOG, deserialize(JSON.parse(JSON.stringify(file)), CTX).world);
    expect(back.world.outing?.home.folks.map((f) => f.name)).toEqual(['Lia Sacada']);
    expect(back.dispatch({ type: 'goHome' })).toBe(true);
    expect(back.world.folks.filter((f) => !f.visit)).toHaveLength(2);
  });

  it('um save v19 abre sem passeio, com a gente do centro e o garçom', () => {
    const sim = townSim();
    const w = JSON.parse(JSON.stringify(sim.world)) as Record<string, unknown>;
    delete w.outing;
    delete w.lastDate;
    w.neighbors = (w.neighbors as { name: string; downtown?: boolean; service?: string }[]).filter((n) => !n.downtown && n.service !== 'waiter');
    const file = deserialize({ version: 19, savedAt: 0, world: w }, CTX);
    expect(file.version).toBe(20);
    expect(file.world.outing).toBeNull();
    expect(file.world.lastDate).toBeNull();
    expect(file.world.neighbors.filter((n) => n.downtown)).toHaveLength(8);
    expect(file.world.neighbors.some((n) => n.service === 'waiter')).toBe(true);
    const again = new Sim(CATALOG, file.world);
    expect(again.dispatch({ type: 'goDowntown', folkIds: [again.world.folks[0].id] })).toBe(true);
  });
});

describe('bloco 16: uma semana com passeios', () => {
  it('sete dias saindo toda noite sem colapso', () => {
    const sim = townSim(11);
    const w = sim.world;
    for (let day = 0; day < 7; day++) {
      until(sim, 19);
      const ids = w.folks.filter((f) => !f.visit && !f.away && f.collapsed === 0).map((f) => f.id);
      if (ids.length) sim.dispatch({ type: 'goDowntown', folkIds: ids, dateId: ids.length > 1 ? ids[1] : undefined });
      until(sim, 23);
      if (w.outing) sim.dispatch({ type: 'goHome' });
      run(sim, 60);
    }
    expect(w.outing).toBeNull();
    expect(w.folks.filter((f) => !f.visit)).toHaveLength(2);
    for (const f of w.folks) for (const v of Object.values(f.needs)) expect(Number.isFinite(v)).toBe(true);
  });
});
