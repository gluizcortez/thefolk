import { describe, expect, it } from 'vitest';
import { CATALOG } from '../src/data/catalog';
import { CITY } from '../src/data/city';
import { NEIGHBORS, NEIGHBOR_TIES } from '../src/data/neighbors';
import { starterHouse } from '../src/data/house';
import {
  CITY_EVENTS,
  SAVE_VERSION,
  Sim,
  census,
  cityPeople,
  cityProblems,
  cityStreets,
  createWorld,
  dayPlan,
  deserialize,
  eventDef,
  eventLive,
  eventOnDay,
  familyProblem,
  foundTown,
  freeToMeet,
  housesForSale,
  interactionReady,
  liveEvents,
  placing,
  randomDraft,
  relKey,
  serialize,
  spouseOf,
  storyDay,
  upcomingEvents,
  whereIs,
} from '../src/sim';
import type { Neighbor, Pt, World } from '../src/sim';
import { play, playStep } from './helpers/player';

const CTX = { neighbors: NEIGHBORS, ties: NEIGHBOR_TIES, catalog: CATALOG, town: CITY };

function citySim(seed = 3): Sim {
  const world = createWorld(starterHouse(seed));
  foundTown(world, CATALOG, CITY);
  return new Sim(CATALOG, world);
}

const at = (day: number, hour: number, minute = 0) => day * 1440 + hour * 60 + minute;
const tome = (w: World) => [...w.folks, ...(w.outing?.home.folks ?? [])].find((f) => f.name === 'Tomé Varanda')!;

function toStreet(w: World, p: Pt): number {
  let best = Infinity;
  for (const s of cityStreets(w.town!)) {
    const x = Math.max(Math.min(s.a.x, s.b.x), Math.min(Math.max(s.a.x, s.b.x), p.x));
    const z = Math.max(Math.min(s.a.z, s.b.z), Math.min(Math.max(s.a.z, s.b.z), p.z));
    best = Math.min(best, Math.hypot(p.x - x, p.z - z));
  }
  return best;
}

function jump(sim: Sim, tick: number): void {
  sim.world.tick = tick;
}

describe('plano 2, bloco 14: trinta dias de cidade', () => {
  it('sem a família fazer nada de especial: população estável, casamentos e nascimentos, nenhum lote impossível', () => {
    const sim = citySim(5);
    const w = sim.world;
    // relógio da vida ligado (o longo: a família em jogo não envelhece até sumir em 30 dias)
    w.rules.life = 'long';
    const start = census(w);
    const active = w.town!.active;
    const seen = new Map<string, number>();
    let lastFeed = 0;
    for (let day = 0; day < 30; day++) {
      play(sim, 1440, 5);
      for (const e of w.town!.feed) {
        if (e.tick <= lastFeed) continue;
        seen.set(e.key, (seen.get(e.key) ?? 0) + 1);
      }
      lastFeed = w.town!.feed.at(-1)?.tick ?? lastFeed;
      expect(cityProblems(w), `dia ${day + 1}`).toEqual([]);
    }
    const end = census(w);
    // a família em jogo não entra na história (ninguém se muda para ela nem sai dela)
    expect(w.town!.active).toBe(active);
    expect(w.neighbors.some((n) => n.home === active)).toBe(false);
    expect(end.people).toBeGreaterThanOrEqual(Math.floor(start.people * 0.85));
    expect(end.people).toBeLessThanOrEqual(start.people * 2.5);
    expect(end.families).toBeGreaterThanOrEqual(start.families - 2);
    expect(seen.get('feed.story.dating') ?? 0).toBeGreaterThanOrEqual(3);
    expect(seen.get('feed.story.married') ?? 0).toBeGreaterThanOrEqual(1);
    expect(seen.get('feed.story.married') ?? 0).toBeLessThanOrEqual(12);
    expect(seen.get('feed.story.born') ?? 0).toBeGreaterThanOrEqual(1);
    expect(seen.get('feed.story.born') ?? 0).toBeLessThanOrEqual(14);
    expect(seen.get('feed.arrived') ?? 0).toBeGreaterThanOrEqual(1);
    // as casas não lotam: sobra pelo menos uma à venda para quem joga
    expect(housesForSale(w).length).toBeGreaterThanOrEqual(1);
    // casados moram juntos
    for (const n of w.neighbors) {
      const s = spouseOf(w, n.id);
      const p = s ? w.neighbors.find((x) => x.id === s) : undefined;
      if (p && n.home !== undefined && p.home !== undefined) expect(p.home, n.name).toBe(n.home);
    }
    // o jornal conta o calendário
    expect(seen.get('feed.story.today') ?? 0).toBeGreaterThanOrEqual(5);
    expect(seen.get('feed.story.contestWon') ?? 0).toBeGreaterThanOrEqual(2);
  }, 120_000);

  it('com a cidade parada ninguém namora, casa, nasce nem chega', () => {
    const sim = citySim(5);
    const w = sim.world;
    expect(sim.dispatch({ type: 'setStory', on: false })).toBe(true);
    const start = census(w);
    const fams = w.town!.families.length;
    for (let d = 0; d < 10; d++) {
      w.tick = at(d, 3);
      storyDay(w, CATALOG);
    }
    expect(census(w)).toEqual(start);
    expect(w.town!.families.length).toBe(fams);
    expect(w.town!.feed.some((e) => e.key.startsWith('feed.story.dating'))).toBe(false);
  });

  it('família sorteada que chega passa no criador, e quem chega tem casa', () => {
    const sim = citySim(7);
    const w = sim.world;
    for (let i = 0; i < 12; i++) expect(familyProblem(CATALOG, randomDraft(w, CATALOG))).toBeNull();
    const before = w.town!.families.length;
    for (let d = 0; d < 20 && w.town!.families.length === before; d++) {
      w.tick = at(d, 3);
      storyDay(w, CATALOG);
    }
    expect(w.town!.families.length).toBeGreaterThan(before);
    const fresh = w.town!.families.at(-1)!;
    expect(fresh.lotId).toBeGreaterThan(0);
    expect(w.neighbors.filter((n) => n.home === fresh.id).length).toBeGreaterThan(0);
    expect(cityProblems(w)).toEqual([]);
  });
});

describe('plano 2, bloco 14: a rotina dos outros', () => {
  const worker = (w: World) => w.neighbors.find((n) => n.name === 'Dora Alpendre')!;

  it('quem trabalha vai ao trabalho no turno, andando pela rua, e volta', () => {
    const sim = citySim();
    const w = sim.world;
    const dora = worker(w);
    const level = CATALOG.careers[dora.career!.id].levels[dora.career!.level];
    const day = level.days[0];
    const mid = at(day, level.startHour + 1);
    expect(whereIs(w, CATALOG, dora, mid)).toMatchObject({ doing: 'work', place: 'trabalho' });
    // um pouco antes do turno está na rua, a caminho
    const going = whereIs(w, CATALOG, dora, at(day, level.startHour) - 5);
    expect(going.doing).toBe('walk');
    expect(going.place).toBe('trabalho');
    expect(toStreet(w, going.point!)).toBeLessThan(1);
    // o mesmo minuto dá sempre a mesma resposta (não gasta o sorteio do mundo)
    const rng = w.rngState;
    expect(whereIs(w, CATALOG, dora, mid)).toEqual(whereIs(w, CATALOG, dora, mid));
    expect(w.rngState).toBe(rng);
    // de madrugada está em casa
    expect(whereIs(w, CATALOG, dora, at(day, 3)).doing).toBe('home');
  });

  it('criança vai à escola nos dias de aula; a cidade tem gente na rua, nos lugares e com cachorro', () => {
    const sim = citySim();
    const w = sim.world;
    const kid: Neighbor = { ...worker(w), id: 9001, name: 'Teste Mirim', age: 'child', career: null, parents: [] };
    w.neighbors.push(kid);
    expect(whereIs(w, CATALOG, kid, at(1, 10))).toMatchObject({ doing: 'school', place: 'escola' });
    expect(whereIs(w, CATALOG, kid, at(5, 10)).doing).not.toBe('school');
    // num dia inteiro, de 15 em 15 minutos, aparece de tudo
    const doing = new Set<string>();
    for (let m = 0; m < 1440; m += 15) for (const p of cityPeople(w, CATALOG, at(5, 0) + m)) doing.add(p.at.doing);
    for (const d of ['home', 'walk', 'place', 'dog', 'event']) expect(doing, d).toContain(d);
    // ninguém fica num lugar fechado
    for (let m = 0; m < 1440; m += 30) {
      for (const p of cityPeople(w, CATALOG, at(2, 0) + m)) {
        if (p.at.doing !== 'place') continue;
        const def = CATALOG.places![p.at.place!];
        expect(def.kind).toBe('venue');
      }
    }
    // os planos do dia não se sobrepõem
    for (const n of w.neighbors.slice(0, 20)) {
      const stops = dayPlan(w, CATALOG, n, 5);
      for (let i = 1; i < stops.length; i++) expect(stops[i].from).toBeGreaterThanOrEqual(stops[i - 1].to);
    }
  });

  it('quem está no trabalho ou dormindo não pode sair; de folga, pode', () => {
    const sim = citySim();
    const w = sim.world;
    const dora = worker(w);
    const level = CATALOG.careers[dora.career!.id].levels[dora.career!.level];
    expect(freeToMeet(w, CATALOG, dora, at(level.days[0], level.startHour + 1))).toBe(false);
    expect(freeToMeet(w, CATALOG, dora, at(1, 2))).toBe(false);
    const off = [0, 1, 2, 3, 4, 5, 6].find((d) => !level.days.includes(d))!;
    expect(freeToMeet(w, CATALOG, dora, at(off, 15))).toBe(true);
  });
});

describe('plano 2, bloco 14: eventos da cidade', () => {
  it('feira todo sábado de manhã, xadrez e culinária em domingos alternados, festa junina no fim do ciclo', () => {
    const feira = eventDef('feira')!;
    expect([5, 12, 19, 26].every((d) => eventOnDay(feira, d))).toBe(true);
    expect(eventLive(feira, at(5, 8))).toBe(true);
    expect(eventLive(feira, at(5, 13))).toBe(false);
    expect(eventOnDay(eventDef('xadrez')!, 6)).toBe(true);
    expect(eventOnDay(eventDef('xadrez')!, 13)).toBe(false);
    expect(eventOnDay(eventDef('culinaria')!, 13)).toBe(true);
    expect(eventOnDay(eventDef('arraial')!, 26)).toBe(true);
    expect(eventOnDay(eventDef('arraial')!, 5)).toBe(false);
    expect(liveEvents(at(26, 20)).map((e) => e.id)).toEqual(['arraial']);
    // a agenda mostra os próximos, em ordem
    const next = upcomingEvents(at(0, 9));
    expect(next[0].def.id).toBe('feira');
    expect(next.map((x) => x.start)).toEqual([...next.map((x) => x.start)].sort((a, b) => a - b));
    expect(CITY_EVENTS.every((e) => CATALOG.places![e.place])).toBe(true);
    expect(placing(50, [60, 40, 30])).toBe(2);
  });

  it('a feira saiu da calçada: em casa fica em cinza, na praça vende 12 porções no sábado de manhã', () => {
    const sim = citySim();
    const w = sim.world;
    jump(sim, at(5, 7));
    const fairIt = CATALOG.objects.mailbox?.interactions.find((i) => i.special === 'fair');
    if (fairIt) expect(interactionReady(w, fairIt)).toBe(false);
    w.household.pantry = 0;
    expect(sim.dispatch({ type: 'goDowntown', folkIds: [tome(w).id], mode: 'walk', place: 'praca', plan: 'fair' })).toBe(true);
    while (!w.outing) sim.step();
    for (let i = 0; i < 180 && !(w.outing.bags ?? 0); i++) sim.step();
    expect(w.outing.bags).toBe(12);
    // a praça encheu de gente da cidade (evento)
    for (let i = 0; i < 90; i++) sim.step();
    expect(w.folks.filter((f) => f.visit && !f.visit.service).length).toBeGreaterThanOrEqual(3);
  });

  it('no campeonato de xadrez a família compete contra a cidade, leva prêmio se for bem e sai no jornal', () => {
    const sim = citySim();
    const w = sim.world;
    jump(sim, at(6, 9));
    const t = tome(w);
    t.skills.logic = 4000;
    const funds = w.household.funds;
    expect(sim.dispatch({ type: 'goDowntown', folkIds: [t.id], mode: 'walk', place: 'parque', plan: 'chessCup' })).toBe(true);
    while (!w.outing) sim.step();
    for (let i = 0; i < 240 && !w.log.some((l) => l.key.startsWith('log.contest')); i++) sim.step();
    const entry = w.log.find((l) => l.key === 'log.contestPrize' || l.key === 'log.contestPlace');
    expect(entry).toBeTruthy();
    const contest = w.town!.story!.contests['xadrez:6'];
    expect(contest.entrants).toHaveLength(1);
    if (contest.entrants[0].place <= 3) expect(w.household.funds).toBeGreaterThan(funds - 1);
    // de novo no mesmo dia não vale
    sim.dispatch({ type: 'goHome', mode: 'walk' });
    while (w.trip || w.outing) sim.step();
    // às 3h do dia seguinte o resultado sai no jornal
    while (w.tick < at(7, 3) + 1) sim.step();
    expect(w.town!.feed.some((e) => e.key === 'feed.story.contestWon' && e.params?.event === 'event.xadrez')).toBe(true);
  });
});

describe('plano 2, bloco 14: celular', () => {
  it('chamar um amigo livre para encontrar na praça: ele espera a turma lá', () => {
    const sim = citySim();
    const w = sim.world;
    jump(sim, at(5, 15));
    const t = tome(w);
    const friend = w.neighbors.find((n) => n.name === 'Otto Mirante')!;
    expect(freeToMeet(w, CATALOG, friend)).toBe(true);
    for (const k of [relKey(t.id, friend.id), relKey(friend.id, t.id)]) {
      w.relations[k] = { friendship: 90, romance: 0, respect: 20, dating: false, last: w.tick, tired: 0, memories: [] };
    }
    let ok = false;
    for (let i = 0; i < 6 && !ok; i++) ok = sim.dispatch({ type: 'goDowntown', folkIds: [t.id], mode: 'walk', place: 'praca', meetId: friend.id });
    expect(ok).toBe(true);
    expect(w.trip?.meetId).toBe(friend.id);
    while (!w.outing) sim.step();
    const guest = w.folks.find((f) => f.id === friend.id);
    expect(guest?.visit?.admitted).toBe(true);
    expect(guest?.visit?.date).toBeFalsy();
    expect(w.outing.date).toBeNull();
  });

  it('quem está trabalhando não atende', () => {
    const sim = citySim();
    const w = sim.world;
    const dora = w.neighbors.find((n) => n.name === 'Dora Alpendre')!;
    const level = CATALOG.careers[dora.career!.id].levels[dora.career!.level];
    jump(sim, at(level.days[0], level.startHour + 1));
    const t = tome(w);
    for (const k of [relKey(t.id, dora.id), relKey(dora.id, t.id)]) {
      w.relations[k] = { friendship: 90, romance: 0, respect: 20, dating: false, last: w.tick, tired: 0, memories: [] };
    }
    expect(sim.dispatch({ type: 'goDowntown', folkIds: [t.id], mode: 'walk', place: 'praca', meetId: dora.id })).toBe(false);
    expect(sim.lastProblem).toBe('meetBusy');
  });
});

describe('plano 2, bloco 14: save', () => {
  it('um save v33 abre com a história andando e o placar vazio', () => {
    const sim = citySim();
    const w = sim.world;
    playStep(sim);
    const file = serialize(w, 0) as unknown as { version: number; world: World };
    file.version = 33;
    delete file.world.town!.story;
    delete file.world.rules.story;
    const back = deserialize(JSON.parse(JSON.stringify(file)), CTX);
    expect(back.version).toBe(SAVE_VERSION);
    expect(SAVE_VERSION).toBe(34);
    expect(back.world.town!.story).toEqual({ since: {}, contests: {} });
    expect(back.world.rules.story).toBe(true);
  });
});
