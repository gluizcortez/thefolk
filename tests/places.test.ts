import { describe, expect, it } from 'vitest';
import { CATALOG } from '../src/data/catalog';
import { CITY } from '../src/data/city';
import { PLACES, PLACE_PLANS } from '../src/data/places';
import { starterHouse } from '../src/data/house';
import {
  GROCERIES,
  SHIPPING_FEE,
  Sim,
  buildHome,
  cityStreets,
  createWorld,
  crowdOf,
  foundTown,
  insideOf,
  lotRect,
  minutesToShut,
  nextShift,
  placeDoor,
  placeOpen,
  placeProblem,
  placeSpot,
  styledShift,
  toCity,
  travelCost,
  unpaidBills,
} from '../src/sim';
import type { Folk, PlaceDef, World } from '../src/sim';
import { GARMENTS } from '../src/sim/clothes';
import { playStep } from './helpers/player';

function citySim(seed = 3): Sim {
  const world = createWorld(starterHouse(seed));
  foundTown(world, CATALOG, CITY);
  return new Sim(CATALOG, world);
}

const at = (day: number, hour: number, minute = 0) => day * 1440 + hour * 60 + minute;

function until(sim: Sim, hour: number): void {
  while (Math.floor((sim.world.tick % 1440) / 60) !== hour) playStep(sim);
}

const tome = (w: World) => w.folks.find((f) => f.name === 'Tomé Varanda')!;
const lia = (w: World) => [...w.folks, ...(w.outing?.home.folks ?? [])].find((f) => f.name === 'Lia Sacada')!;

/** Retângulos se cruzam (com folga)? */
function overlaps(a: [number, number, number, number], b: [number, number, number, number], pad = 0): boolean {
  return a[0] < b[2] + pad && b[0] < a[2] + pad && a[1] < b[3] + pad && b[1] < a[3] + pad;
}

const rectOf = (p: PlaceDef): [number, number, number, number] => [p.rect.x, p.rect.z, p.rect.x + p.rect.w, p.rect.z + p.rect.h];

/** Distância do ponto à rua mais perto. */
function toStreet(w: World, p: { x: number; z: number }): number {
  let best = Infinity;
  for (const s of cityStreets(w.town!)) {
    const x = Math.max(Math.min(s.a.x, s.b.x), Math.min(Math.max(s.a.x, s.b.x), p.x));
    const z = Math.max(Math.min(s.a.z, s.b.z), Math.min(Math.max(s.a.z, s.b.z), p.z));
    best = Math.min(best, Math.hypot(p.x - x, p.z - z));
  }
  return best;
}

describe('plano 2, bloco 13: os lugares no mapa', () => {
  it('nove lugares abertos e cinco prédios fechados, sem cair em cima de lote, de rua ou de outro lugar', () => {
    const w = citySim().world;
    const all = Object.values(PLACES);
    expect(all.filter((p) => p.kind === 'venue')).toHaveLength(9);
    expect(all.filter((p) => p.kind === 'building').map((p) => p.building).sort()).toEqual(['cityhall', 'hospital', 'police', 'school', 'work']);
    for (const a of all) {
      for (const b of all) if (a !== b) expect(overlaps(rectOf(a), rectOf(b)), `${a.id} x ${b.id}`).toBe(false);
      for (const lot of w.town!.lots) expect(overlaps(rectOf(a), lotRect(lot), 1), `${a.id} x lote ${lot.id}`).toBe(false);
      // nenhuma rua passa por dentro do lugar
      const c = { x: a.rect.x + a.rect.w / 2, z: a.rect.z + a.rect.h / 2 };
      expect(toStreet(w, c), a.id).toBeGreaterThan(Math.min(a.rect.w, a.rect.h) / 2);
    }
  });

  it('cada lugar aberto monta sem móvel fora do lugar, do tamanho do retângulo, com a porta na rua', () => {
    const w = citySim().world;
    for (const p of Object.values(PLACES).filter((x) => x.kind === 'venue')) {
      const plan = CATALOG.venues![p.id]!;
      expect(plan, p.id).toBeDefined();
      expect(plan.map[0].length, p.id).toBe(p.rect.w);
      expect(plan.map.length, p.id).toBe(p.rect.h);
      if (PLACE_PLANS[p.id]) {
        const { misplaced, home } = buildHome({ ...w, nextId: 1 }, CATALOG, plan);
        expect(misplaced, p.id).toEqual([]);
        // os objetos do "o que fazer" existem no lote
        for (const act of p.plans ?? []) expect(home.objects.some((o) => o.defId === act.obj), `${p.id}:${act.id}`).toBe(true);
      }
      // a saída (canto do lote girado ou não) dá na calçada de uma rua
      expect(toStreet(w, placeDoor(p, plan.exit)), p.id).toBeLessThan(6);
      // a saída fica na frente do lote, do lado da rua
      const exit = toCity(placeSpot(p), plan.exit.x + 0.5, plan.exit.y + 0.5);
      expect(exit.z > p.rect.z + p.rect.h / 2, p.id).toBe(!p.flip);
    }
    for (const p of Object.values(PLACES).filter((x) => x.kind === 'building')) expect(toStreet(w, placeDoor(p)), p.id).toBeLessThan(6);
  });
});

describe('plano 2, bloco 13: horários, lotação e preço', () => {
  const lib = PLACES.biblioteca;
  const bar = PLACES.bar;
  const school = PLACES.escola;
  it('a biblioteca abre das 8h às 20h, menos domingo', () => {
    expect(placeOpen(lib, at(0, 7, 59))).toBe(false);
    expect(placeOpen(lib, at(0, 8))).toBe(true);
    expect(placeOpen(lib, at(0, 19, 59))).toBe(true);
    expect(placeOpen(lib, at(0, 20))).toBe(false);
    // dia 6 é domingo (o dia 0 é segunda)
    expect(placeOpen(lib, at(6, 12))).toBe(false);
    expect(placeOpen(lib, at(5, 12))).toBe(true);
    expect(minutesToShut(lib, at(0, 19, 30))).toBe(30);
  });

  it('o bar passa da meia-noite (18h às 3h) e a escola só abre em dia de semana', () => {
    expect(placeOpen(bar, at(2, 17, 59))).toBe(false);
    expect(placeOpen(bar, at(2, 23))).toBe(true);
    expect(placeOpen(bar, at(3, 2, 59))).toBe(true);
    expect(placeOpen(bar, at(3, 3))).toBe(false);
    expect(minutesToShut(bar, at(2, 23))).toBe(4 * 60);
    expect(placeOpen(school, at(1, 9))).toBe(true);
    expect(placeOpen(school, at(5, 9))).toBe(false);
    expect(placeOpen(PLACES.hospital, at(6, 4))).toBe(true);
  });

  it('a lotação enche perto da hora de pico, zera fechado e nunca passa do máximo', () => {
    const cine = PLACES.cinema;
    for (let d = 0; d < 14; d++) {
      for (let h = 0; h < 24; h++) {
        const n = crowdOf(cine, at(d, h));
        expect(n).toBeLessThanOrEqual(cine.capacity);
        if (!placeOpen(cine, at(d, h))) expect(n).toBe(0);
      }
      expect(crowdOf(cine, at(d, cine.peak))).toBeGreaterThan(crowdOf(cine, at(d, 15)));
    }
    const w = citySim().world;
    expect(placeProblem(w, cine, 2, at(0, 21))).toBeNull();
    expect(placeProblem(w, cine, cine.capacity, at(0, 21))).toBe('placeFull');
    expect(placeProblem(w, cine, 2, at(0, 10))).toBe('venueClosed');
    w.household.funds = 5;
    expect(placeProblem(w, PLACES.academia, 1, at(0, 10))).toBe('funds');
  });

  it('não sai para um lugar fechado; a academia cobra a entrada na chegada', () => {
    const sim = citySim();
    until(sim, 5);
    const w = sim.world;
    expect(sim.dispatch({ type: 'goDowntown', folkIds: [tome(w).id], mode: 'walk', place: 'cinema' })).toBe(false);
    expect(sim.lastProblem).toBe('venueClosed');
    until(sim, 9);
    const funds = w.household.funds;
    expect(sim.dispatch({ type: 'goDowntown', folkIds: [tome(w).id], mode: 'walk', place: 'academia', plan: 'run' })).toBe(true);
    while (!w.outing) playStep(sim);
    expect(w.outing.venue).toBe('academia');
    expect(w.household.funds).toBe(funds - PLACES.academia.fee);
    expect(w.objects.some((o) => o.defId === 'treadmill')).toBe(true);
    // foi correr na esteira
    const q = tome(w).queue[0];
    expect(q?.kind).toBe('use');
    expect(w.objects.find((o) => o.id === q.objectId)?.defId).toBe('treadmill');
  });
});

describe('plano 2, bloco 13: o mercado', () => {
  it('as compras vão nas sacolas e chegam à geladeira na volta, mais em conta que pelo telefone', () => {
    const sim = citySim();
    until(sim, 10);
    const w = sim.world;
    w.household.pantry = 0;
    const funds = w.household.funds;
    expect(sim.dispatch({ type: 'goDowntown', folkIds: [tome(w).id], mode: 'walk', place: 'mercado', plan: 'cesta' })).toBe(true);
    // sem o jogador de teste (ele pediria mercado pelo telefone com a geladeira vazia)
    while (!w.outing) sim.step();
    expect(w.outing.plan).toBe('cesta');
    const folk = tome(w);
    for (let i = 0; i < 120 && !(w.outing.bags ?? 0); i++) sim.step();
    expect(w.outing.bags).toBe(12);
    expect(w.log.some((l) => l.key === 'log.boughtGroceries')).toBe(true);
    // a geladeira de casa não mudou enquanto está no mercado
    expect(w.household.pantry).toBe(0);
    expect(sim.dispatch({ type: 'goHome', mode: 'walk' })).toBe(true);
    expect(w.household.pantry).toBe(12);
    expect(funds - w.household.funds).toBe(38);
    expect(38).toBeLessThan(GROCERIES.price);
    void folk;
  });

  it('o rancho que não cabe na geladeira estraga', () => {
    const sim = citySim();
    until(sim, 10);
    const w = sim.world;
    expect(sim.dispatch({ type: 'goDowntown', folkIds: [tome(w).id], mode: 'walk', place: 'mercado', plan: 'rancho' })).toBe(true);
    while (!w.outing) playStep(sim);
    for (let i = 0; i < 120 && !(w.outing.bags ?? 0); i++) playStep(sim);
    expect(w.outing.bags).toBe(30);
    const pantry = w.outing.home ? w.household.pantry : 0;
    sim.dispatch({ type: 'goHome', mode: 'walk' });
    expect(w.household.pantry).toBeGreaterThan(pantry);
    expect(w.log.some((l) => l.key === 'log.bagsSpoiled' || l.key === 'log.bagsHome')).toBe(true);
  });
});

describe('plano 2, bloco 13: como se porta no trabalho e na escola', () => {
  /** Um turno inteiro com o jeito dado; devolve o desempenho ganho e a energia de volta. */
  function shift(style?: 'steady' | 'hard' | 'flatter' | 'easy'): { gain: number; energy: number; fun: number } {
    const sim = citySim(5);
    const w = sim.world;
    const folk = tome(w);
    expect(sim.dispatch({ type: 'takeJob', folkId: folk.id, careerId: 'office' })).toBe(true);
    if (style) expect(sim.dispatch({ type: 'setStyle', folkId: folk.id, work: style })).toBe(true);
    const s = nextShift(CATALOG, folk, w.tick)!;
    while (w.tick < s.start - 50) playStep(sim);
    // chega descansado e alimentado (todo mundo igual)
    for (const k of Object.keys(folk.needs) as (keyof Folk['needs'])[]) folk.needs[k] = 80;
    while (!folk.away || folk.away.trip) playStep(sim);
    folk.away.nextEvent = -1;
    folk.away.event = null;
    const before = folk.job!.performance;
    while (folk.away) {
      sim.step();
      if (folk.away) folk.away.nextEvent = -1;
    }
    return { gain: folk.job!.performance - before, energy: folk.needs.energy, fun: folk.needs.fun };
  }

  it('trabalhar duro rende mais e cansa; ir com calma rende menos e poupa', () => {
    const steady = shift();
    const hard = shift('hard');
    const easy = shift('easy');
    expect(hard.gain).toBeGreaterThan(steady.gain);
    expect(steady.gain).toBeGreaterThan(easy.gain);
    expect(hard.energy).toBeLessThan(steady.energy);
    expect(easy.energy).toBeGreaterThan(steady.energy);
    expect(easy.fun).toBeGreaterThan(hard.fun);
  });

  it('puxar o saco agrada o chefe e rende pela lábia', () => {
    const sim = citySim(5);
    const folk = tome(sim.world);
    folk.skills.charisma = 99999;
    expect(styledShift('flatter', 2, folk)).toBeGreaterThan(styledShift(undefined, 2, folk));
    expect(styledShift('easy', 10, folk)).toBeLessThan(10);
    // sem emprego não dá para escolher o jeito do trabalho
    expect(sim.dispatch({ type: 'setStyle', folkId: folk.id, work: 'hard' })).toBe(false);
  });

  it('quem está no trabalho aparece dentro do prédio, com a hora de sair', () => {
    const sim = citySim(5);
    const w = sim.world;
    const folk = tome(w);
    sim.dispatch({ type: 'takeJob', folkId: folk.id, careerId: 'office' });
    const s = nextShift(CATALOG, folk, w.tick)!;
    while (!folk.away || folk.away.trip) playStep(sim);
    const inside = insideOf(w, CATALOG, PLACES.trabalho);
    expect(inside.map((x) => x.folk.id)).toEqual([folk.id]);
    expect(inside[0].until).toBe(s.end);
    expect(insideOf(w, CATALOG, PLACES.escola)).toEqual([]);
  });
});

describe('plano 2, bloco 13: recados nos prédios fechados', () => {
  it('na prefeitura paga as contas no guichê; o recado leva o tempo dele lá dentro', () => {
    const sim = citySim();
    until(sim, 9);
    const w = sim.world;
    w.household.bills.push({ id: 991, tick: w.tick, due: w.tick + 3 * 1440, power: 20, water: 20, furniture: 0, covered: 0 } as World['household']['bills'][number]);
    expect(sim.dispatch({ type: 'runErrand', folkIds: [tome(w).id], place: 'prefeitura', errand: 'payBills', mode: 'walk' })).toBe(true);
    const trip = w.trip!;
    expect(trip.kind).toBe('errand');
    while (w.tick < trip.arrive + 1) playStep(sim);
    expect(insideOf(w, CATALOG, PLACES.prefeitura).map((x) => x.folk.id)).toEqual([tome(w).id]);
    expect(unpaidBills(w)).toHaveLength(0);
    while (w.trip) playStep(sim);
    expect(w.tick).toBeGreaterThanOrEqual(trip.back!);
    expect(tome(w).away).toBeNull();
    // sem conta, nada a pagar
    expect(sim.dispatch({ type: 'runErrand', folkIds: [tome(w).id], place: 'prefeitura', errand: 'payBills', mode: 'walk' })).toBe(false);
  });

  it('a prefeitura não abre de madrugada; o hospital cobra a consulta', () => {
    const sim = citySim();
    until(sim, 3);
    const w = sim.world;
    expect(sim.dispatch({ type: 'runErrand', folkIds: [tome(w).id], place: 'prefeitura', errand: 'jobs', mode: 'walk' })).toBe(false);
    const funds = w.household.funds;
    expect(sim.dispatch({ type: 'runErrand', folkIds: [tome(w).id], place: 'hospital', errand: 'checkup', mode: 'walk' })).toBe(true);
    const trip = w.trip!;
    while (w.tick < trip.arrive + 1) playStep(sim);
    expect(funds - w.household.funds).toBe(30);
  });
});

describe('plano 2, bloco 13: encontro em qualquer lugar e roupas pela loja', () => {
  it('um encontro no cinema: os dois vão ver o mesmo filme e a nota é do encontro', () => {
    const sim = citySim();
    until(sim, 19);
    const w = sim.world;
    const t = tome(w);
    const l = lia(w);
    expect(sim.dispatch({ type: 'goDowntown', folkIds: [t.id, l.id], dateId: l.id, mode: 'walk', place: 'cinema', plan: 'comedia' })).toBe(true);
    while (!w.outing) playStep(sim);
    expect(w.outing.venue).toBe('cinema');
    expect(w.outing.date?.guest).toBe(l.id);
    const seats = [t, l].map((f) => w.objects.find((o) => o.id === f.queue[0]?.objectId)?.defId);
    expect(seats).toEqual(['cineseats', 'cineseats']);
  });

  it('a peça do guarda-roupa chega em casa no dia seguinte (com frete) ou espera na loja', () => {
    const sim = citySim();
    until(sim, 10);
    const w = sim.world;
    const [a, b] = Object.values(GARMENTS).filter((g) => !g.hidden && g.price > 0 && !(w.household.garments ?? []).includes(g.id));
    const funds = w.household.funds;
    expect(sim.dispatch({ type: 'buyGarment', garmentId: a.id, where: 'home' })).toBe(true);
    expect(funds - w.household.funds).toBe(a.price + SHIPPING_FEE);
    expect(w.household.garments ?? []).not.toContain(a.id);
    // não compra de novo o que já está a caminho
    expect(sim.dispatch({ type: 'buyGarment', garmentId: a.id, where: 'home' })).toBe(false);
    expect(sim.dispatch({ type: 'buyGarment', garmentId: b.id, where: 'store' })).toBe(true);
    const tomorrow = (Math.floor(w.tick / 1440) + 1) * 1440 + 10 * 60;
    while (w.tick < tomorrow) playStep(sim);
    expect(w.household.garments).toContain(a.id);
    expect(w.household.garments ?? []).not.toContain(b.id);
    expect(w.household.pickup).toEqual([b.id]);
    expect(sim.dispatch({ type: 'goDowntown', folkIds: [tome(w).id], mode: 'walk', place: 'loja' })).toBe(true);
    while (!w.outing) playStep(sim);
    expect(w.household.garments).toContain(b.id);
    expect(w.household.pickup).toEqual([]);
    // ida e volta não custam nada a pé
    expect(travelCost(10, 'walk')).toBe(0);
  });
});
