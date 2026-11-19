import { describe, expect, it } from 'vitest';
import { CATALOG } from '../src/data/catalog';
import { CITY } from '../src/data/city';
import { CENTRO } from '../src/data/downtown';
import { starterHouse } from '../src/data/house';
import { NEIGHBORS, NEIGHBOR_TIES } from '../src/data/neighbors';
import { TOWN } from '../src/data/town';
import {
  CENTRO_DOOR,
  RIVER,
  STREET_WIDTH,
  Sim,
  VEHICLE_PRICE,
  activeFamily,
  activeLot,
  addressOf,
  centroDoor,
  centroLevel,
  cityStreets,
  createWorld,
  deserialize,
  foundTown,
  lotDoor,
  lotLevel,
  lotPlace,
  lotRect,
  personLevel,
  pointAlong,
  serialize,
  streetRoute,
  streetSide,
  toCity,
  toLocal,
  travelCost,
  travelMinutes,
  tripState,
} from '../src/sim';
import type { Pt, World } from '../src/sim';
import { playStep } from './helpers/player';

const CTX = { neighbors: NEIGHBORS, ties: NEIGHBOR_TIES, catalog: CATALOG, town: CITY };

function citySim(seed = 3): Sim {
  const world = createWorld(starterHouse(seed));
  foundTown(world, CATALOG, CITY);
  return new Sim(CATALOG, world);
}

function until(sim: Sim, hour: number): void {
  while (Math.floor((sim.world.tick % 1440) / 60) !== hour) playStep(sim);
}

const tome = (w: World) => w.folks.find((f) => f.name === 'Tomé Varanda')!;
const lia = (w: World) => w.folks.find((f) => f.name === 'Lia Sacada')!;

/** O ponto fica numa rua (dentro da largura da pista com as calçadas)? */
function onStreet(w: World, p: Pt): boolean {
  return cityStreets(w.town!).some((s) => {
    const half = STREET_WIDTH / 2 + 0.01;
    const horiz = Math.abs(s.a.z - s.b.z) < 0.01;
    return horiz
      ? Math.abs(p.z - s.a.z) <= half && p.x >= Math.min(s.a.x, s.b.x) - half && p.x <= Math.max(s.a.x, s.b.x) + half
      : Math.abs(p.x - s.a.x) <= half && p.z >= Math.min(s.a.z, s.b.z) - half && p.z <= Math.max(s.a.z, s.b.z) + half;
  });
}

describe('plano 2, bloco 12: o mapa da cidade', () => {
  it('três bairros com 30 lotes, a Vila Taramela no meio deles e a família em jogo no 5', () => {
    const w = citySim().world;
    const town = w.town!;
    expect(town.city?.name).toBe('Arribada');
    expect(town.city?.districts.map((d) => d.name)).toEqual(['Vila Taramela', 'Jardim Cambará', 'Alto do Moinho']);
    expect(town.lots).toHaveLength(30);
    expect(activeLot(w)?.number).toBe(5);
    expect(activeLot(w)?.district).toBe(0);
    expect(town.families.length).toBeGreaterThanOrEqual(13);
    const cumeeira = town.families.find((f) => f.name === 'Cumeeira')!;
    const lot = town.lots.find((l) => l.id === cumeeira.lotId)!;
    expect(addressOf(w, lot)).toBe('Rua dos Cambarás, 1');
    // nenhum lote cai em cima do outro, nem do rio, nem das ruas
    const rects = town.lots.map(lotRect);
    for (let i = 0; i < rects.length; i++) {
      const [x0, z0, x1, z1] = rects[i];
      expect(x1 < RIVER.x0).toBe(true);
      for (let j = i + 1; j < rects.length; j++) {
        const [a0, b0, a1, b1] = rects[j];
        expect(x1 <= a0 || a1 <= x0 || z1 <= b0 || b1 <= z0, `${i} x ${j}`).toBe(true);
      }
      for (const s of cityStreets(town)) {
        const horiz = Math.abs(s.a.z - s.b.z) < 0.01;
        if (horiz) expect(s.a.z + STREET_WIDTH / 2 <= z0 || s.a.z - STREET_WIDTH / 2 >= z1 || Math.max(s.a.x, s.b.x) < x0 || Math.min(s.a.x, s.b.x) > x1).toBe(true);
      }
    }
  });

  it('o lote de baixo da rua é girado: a frente dele olha para a mesma rua', () => {
    const w = citySim().world;
    const up = w.town!.lots.find((l) => l.number === 1 && (l.district ?? 0) === 0)!;
    const down = w.town!.lots.find((l) => l.number === 2 && (l.district ?? 0) === 0)!;
    const a = lotDoor(up, { x: 7, y: 13 });
    const b = lotDoor(down, { x: 7, y: 13 });
    expect(a.z).toBeLessThan(18.9);
    expect(b.z).toBeGreaterThan(18.9);
    const p = lotPlace(down);
    const c = toCity(p, 3, 4);
    expect(toLocal(p, c.x, c.z)).toEqual({ x: 3, z: 4 });
  });

  it('caminho de casa até o centro anda só por rua, atravessa a ponte e chega na porta do largo', () => {
    const w = citySim().world;
    const home = activeLot(w)!;
    const from = lotDoor(home, w.exit);
    const to = centroDoor(CENTRO.exit);
    const route = streetRoute(w.town!, from, to);
    expect(route.points[0]).toEqual(from);
    expect(route.points[route.points.length - 1]).toEqual(to);
    // cada trecho é reto (de leste a oeste ou de norte a sul) e anda por cima de rua
    for (let i = 1; i < route.points.length; i++) {
      const a = route.points[i - 1];
      const b = route.points[i];
      expect(Math.abs(a.x - b.x) < 0.01 || Math.abs(a.z - b.z) < 0.01).toBe(true);
      for (let k = 0; k <= 10; k++) {
        const p = { x: a.x + ((b.x - a.x) * k) / 10, z: a.z + ((b.z - a.z) * k) / 10 };
        // a primeira e a última pernada são a calçada de dentro do lote até a rua
        if (i === 1 || i === route.points.length - 1) continue;
        expect(onStreet(w, p), `${p.x},${p.z}`).toBe(true);
      }
    }
    // atravessa o rio pela avenida da ponte
    expect(route.points.some((p) => Math.abs(p.z - CENTRO_DOOR.z) < 0.01 && p.x < RIVER.x0)).toBe(true);
    expect(route.length).toBeGreaterThan(120);
    expect(route.length).toBeLessThan(260);
    // o caminho de volta tem o mesmo tamanho
    expect(streetRoute(w.town!, to, from).length).toBeCloseTo(route.length, 5);
  });

  it('de outro bairro o caminho passa pela avenida; vizinho de porta é logo ali', () => {
    const w = citySim().world;
    const home = activeLot(w)!;
    const far = w.town!.lots.find((l) => l.district === 2 && l.number === 9)!;
    const near = w.town!.lots.find((l) => (l.district ?? 0) === 0 && l.number === 7)!;
    const d1 = streetRoute(w.town!, lotDoor(home, w.exit), lotDoor(far, w.exit)).length;
    const d2 = streetRoute(w.town!, lotDoor(home, w.exit), lotDoor(near, w.exit)).length;
    expect(d2).toBeLessThan(40);
    expect(d1).toBeGreaterThan(130);
    expect(travelMinutes(d1, 'walk')).toBeGreaterThan(travelMinutes(d1, 'bike'));
    expect(travelMinutes(d1, 'bike')).toBeGreaterThan(travelMinutes(d1, 'car'));
    expect(travelCost(d1, 'walk')).toBe(0);
    expect(travelCost(d1, 'taxi')).toBeGreaterThan(travelCost(d1, 'car'));
    // quem mora no outro bairro chega pela ponta da calçada do lado da avenida
    const vera = w.neighbors.find((n) => n.name === 'Vera Claraboia')!;
    expect(streetSide(w, vera.id)).not.toBe(0);
  });

  it('pointAlong anda pelo caminho e termina no último ponto', () => {
    const pts = [0, 0, 10, 0, 10, 5];
    expect(pointAlong(pts, 5)).toMatchObject({ x: 5, z: 0, dx: 1, dz: 0 });
    expect(pointAlong(pts, 12)).toMatchObject({ x: 10, z: 2, dx: 0, dz: 1 });
    expect(pointAlong(pts, 99)).toMatchObject({ x: 10, z: 5 });
  });
});

describe('plano 2, bloco 12: andar pela cidade', () => {
  it('a pé até o centro: sai pela calçada, leva o tempo do caminho e o centro só abre na chegada', () => {
    const sim = citySim();
    until(sim, 10);
    const w = sim.world;
    const funds = w.household.funds;
    expect(sim.dispatch({ type: 'goDowntown', folkIds: [tome(w).id], mode: 'walk' })).toBe(true);
    expect(w.household.funds).toBe(funds);
    const trip = w.trip!;
    expect(trip.kind).toBe('downtown');
    expect(w.outing).toBeNull();
    expect(tome(w).away?.trip).toBe(true);
    const minutes = trip.arrive - trip.from;
    expect(minutes).toBe(travelMinutes(trip.length, 'walk'));
    // no meio do caminho está na rua, entre a casa e o centro
    for (let i = 0; i < Math.floor(minutes / 2); i++) playStep(sim);
    const mid = tripState(trip, w.tick);
    expect(mid.phase).toBe('going');
    expect(onStreet(w, mid)).toBe(true);
    // não dá para sair de novo nem trocar de família com alguém na rua
    expect(sim.dispatch({ type: 'goDowntown', folkIds: [lia(w).id], mode: 'walk' })).toBe(false);
    expect(sim.dispatch({ type: 'playFamily', familyId: w.town!.families[1].id })).toBe(false);
    while (!w.outing && w.tick < trip.arrive + 2) playStep(sim);
    expect(w.outing?.mode).toBe('walk');
    expect(w.trip).toBeNull();
    expect(w.folks.filter((f) => !f.visit).map((f) => f.name)).toEqual(['Tomé Varanda']);
    expect(tome(w).away).toBeNull();
    expect(w.objects.some((o) => o.defId === 'fountain')).toBe(true);
  });

  it('de táxi paga pela distância e chega antes; a volta abre a casa e traz quem foi pela rua', () => {
    const sim = citySim();
    until(sim, 11);
    const w = sim.world;
    const funds = w.household.funds;
    expect(sim.dispatch({ type: 'goDowntown', folkIds: [tome(w).id], mode: 'taxi' })).toBe(true);
    const trip = w.trip!;
    expect(w.household.funds).toBe(funds - travelCost(trip.length, 'taxi'));
    expect(trip.arrive - trip.from).toBeLessThan(travelMinutes(trip.length, 'walk'));
    while (!w.outing) playStep(sim);
    for (let i = 0; i < 30; i++) playStep(sim);
    expect(sim.dispatch({ type: 'goHome', mode: 'walk' })).toBe(true);
    expect(w.outing).toBeNull();
    expect(w.trip?.kind).toBe('home');
    // a casa voltou e quem ficou está nela; quem foi ainda está na rua
    expect(lia(w).away).toBeNull();
    expect(tome(w).away?.trip).toBe(true);
    const back = w.trip!;
    while (w.trip) playStep(sim);
    expect(w.tick).toBeGreaterThanOrEqual(back.arrive);
    expect(tome(w).away).toBeNull();
    // chega pela calçada de casa
    expect(Math.abs(tome(w).y - w.exit.y)).toBeLessThanOrEqual(1);
  });

  it('bicicleta e carro precisam ser da família; carro precisa de motorista adulto', () => {
    const sim = citySim();
    until(sim, 10);
    const w = sim.world;
    expect(sim.dispatch({ type: 'goDowntown', folkIds: [tome(w).id], mode: 'bike' })).toBe(false);
    expect(sim.lastProblem).toBe('noBike');
    expect(sim.dispatch({ type: 'goDowntown', folkIds: [tome(w).id], mode: 'car' })).toBe(false);
    expect(sim.lastProblem).toBe('noCar');
    w.household.funds = 10000;
    expect(sim.dispatch({ type: 'buyVehicle', kind: 'bike' })).toBe(true);
    expect(sim.dispatch({ type: 'buyVehicle', kind: 'car' })).toBe(true);
    expect(w.household.funds).toBe(10000 - VEHICLE_PRICE.bike - VEHICLE_PRICE.car);
    expect(sim.dispatch({ type: 'buyVehicle', kind: 'car' })).toBe(false);
    // duas pessoas, uma bicicleta
    expect(sim.dispatch({ type: 'goDowntown', folkIds: [tome(w).id, lia(w).id], mode: 'bike' })).toBe(false);
    expect(sim.lastProblem).toBe('noBike');
    expect(sim.dispatch({ type: 'goDowntown', folkIds: [tome(w).id, lia(w).id], mode: 'car' })).toBe(true);
    expect(w.trip?.mode).toBe('car');
    expect(sim.dispatch({ type: 'sellVehicle', kind: 'car' })).toBe(false);
    expect(sim.dispatch({ type: 'sellVehicle', kind: 'bike' })).toBe(true);
  });

  it('visita a um vizinho: anda até a casa dele, a amizade sobe, e volta para casa sozinho', () => {
    const sim = citySim();
    until(sim, 14);
    const w = sim.world;
    const fam = w.town!.families.find((f) => f.name === 'Telhado')!;
    const caio = w.neighbors.find((n) => n.name === 'Caio Telhado')!;
    const before = w.relations[`${tome(w).id}>${caio.id}`]?.friendship ?? 0;
    expect(sim.dispatch({ type: 'visitLot', folkIds: [tome(w).id], lotId: fam.lotId, mode: 'walk' })).toBe(true);
    const trip = w.trip!;
    expect(trip.kind).toBe('visit');
    expect(trip.back! - trip.leave!).toBe(trip.arrive - trip.from);
    while (w.tick < trip.arrive + 10) playStep(sim);
    expect(tripState(trip, w.tick).phase).toBe('there');
    expect(w.relations[`${tome(w).id}>${caio.id}`].friendship).toBeGreaterThan(before);
    while (w.trip) playStep(sim);
    expect(tome(w).away).toBeNull();
    expect(w.tick).toBeGreaterThanOrEqual(trip.back!);
    // casa sem ninguém e de madrugada não dá
    const empty = w.town!.lots.find((l) => l.familyId === 0)!;
    expect(sim.dispatch({ type: 'visitLot', folkIds: [tome(w).id], lotId: empty.id, mode: 'walk' })).toBe(false);
    expect(sim.lastProblem).toBe('nobodyThere');
    until(sim, 23);
    expect(sim.dispatch({ type: 'visitLot', folkIds: [tome(w).id], lotId: fam.lotId, mode: 'walk' })).toBe(false);
    expect(sim.lastProblem).toBe('visitHours');
  });
});

describe('plano 2, bloco 12: níveis de simulação', () => {
  it('o lote em jogo é detalhado; os outros, resumidos; a troca de família troca os níveis', () => {
    const sim = citySim();
    const w = sim.world;
    const mine = activeLot(w)!;
    const telhado = w.town!.families.find((f) => f.name === 'Telhado')!;
    const theirs = w.town!.lots.find((l) => l.id === telhado.lotId)!;
    const vacant = w.town!.lots.find((l) => l.familyId === 0)!;
    expect(lotLevel(w, mine)).toBe('full');
    expect(lotLevel(w, theirs)).toBe('light');
    expect(lotLevel(w, vacant)).toBe('idle');
    const caio = w.neighbors.find((n) => n.name === 'Caio Telhado')!;
    expect(personLevel(w, tome(w).id)).toBe('full');
    expect(personLevel(w, caio.id)).toBe('light');
    expect(sim.dispatch({ type: 'playFamily', familyId: telhado.id })).toBe(true);
    expect(activeFamily(w)?.name).toBe('Telhado');
    expect(lotLevel(w, theirs)).toBe('full');
    expect(lotLevel(w, mine)).toBe('light');
    expect(personLevel(w, caio.id)).toBe('full');
    const varanda = w.neighbors.find((n) => n.name === 'Tomé Varanda')!;
    expect(personLevel(w, varanda.id)).toBe('light');
  });

  it('no passeio, o centro fica detalhado e a casa resumida; quem anda na rua continua detalhado', () => {
    const sim = citySim();
    until(sim, 10);
    const w = sim.world;
    const mine = activeLot(w)!;
    expect(centroLevel(w)).toBe('idle');
    sim.dispatch({ type: 'goDowntown', folkIds: [tome(w).id], mode: 'walk' });
    // na rua: as necessidades andam minuto a minuto
    expect(personLevel(w, tome(w).id)).toBe('full');
    const fun = tome(w).needs.fun;
    playStep(sim);
    playStep(sim);
    expect(tome(w).needs.fun).toBeLessThan(fun);
    while (!w.outing) playStep(sim);
    expect(centroLevel(w)).toBe('full');
    expect(lotLevel(w, mine)).toBe('light');
    expect(personLevel(w, lia(w)?.id ?? w.outing!.home.folks[0].id)).toBe('full');
  });
});

describe('plano 2, bloco 12: migração', () => {
  it('save v31 vira a cidade: a família na casa que tinha, vizinhos onde estavam, bairros novos em volta', () => {
    const sim = new Sim(CATALOG, (() => {
      const world = createWorld(starterHouse(5));
      foundTown(world, CATALOG, TOWN);
      return world;
    })());
    const old = sim.world;
    const lots = old.town!.lots.map((l) => ({ id: l.id, number: l.number, familyId: l.familyId }));
    const grid = JSON.stringify(old.grid);
    const raw = JSON.parse(JSON.stringify({ version: 31, savedAt: 1, world: old }));
    delete raw.world.trip;
    const file = deserialize(raw, CTX);
    const w = file.world;
    expect(file.version).toBeGreaterThanOrEqual(32);
    expect(w.town!.city?.districts).toHaveLength(3);
    expect(w.town!.lots).toHaveLength(30);
    for (const l of lots) {
      const now = w.town!.lots.find((x) => x.id === l.id)!;
      expect(now.number).toBe(l.number);
      expect(now.familyId).toBe(l.familyId);
      expect(now.district).toBe(0);
    }
    expect(activeLot(w)?.number).toBe(5);
    expect(JSON.stringify(w.grid)).toBe(grid);
    expect(w.trip).toBeNull();
    expect(w.household.vehicles).toEqual([]);
    // o save novo volta igual
    const again = deserialize(JSON.parse(JSON.stringify(serialize(w, 2))), CTX).world;
    expect(again.town!.lots).toHaveLength(30);
  });

  it('save v31 no meio de um passeio continua no centro e volta pela rua', () => {
    const world = createWorld(starterHouse(5));
    foundTown(world, CATALOG, TOWN);
    const sim = new Sim(CATALOG, world);
    until(sim, 12);
    expect(sim.dispatch({ type: 'goDowntown', folkIds: [world.folks[0].id] })).toBe(true);
    const raw = JSON.parse(JSON.stringify({ version: 31, savedAt: 1, world }));
    const w = deserialize(raw, CTX).world;
    expect(w.outing?.mode).toBe('taxi');
    const back = new Sim(CATALOG, w);
    expect(back.dispatch({ type: 'goHome' })).toBe(true);
    expect(w.trip?.kind).toBe('home');
  });
});
