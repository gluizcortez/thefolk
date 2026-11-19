import { describe, expect, it } from 'vitest';
import { faceFromSeed, fullLook } from '../src/sim/temper';
import { CATALOG } from '../src/data/catalog';
import { starterHouse } from '../src/data/house';
import { familySeed } from '../src/data/family';
import { NEIGHBORS, NEIGHBOR_TIES } from '../src/data/neighbors';
import { TOWN } from '../src/data/town';
import {
  ALBUM_MAX,
  BASE_PENSION,
  ESTATE_BASE,
  ESTATE_PER_LEVEL,
  LIFE_PACES,
  MINUTES_PER_DAY,
  NEUTRAL_TEMPER,
  PART_TIME_START,
  PHOTO_MAX,
  SAVE_VERSION,
  Sim,
  TOWN_HOUR,
  addAlbum,
  ageNeighbor,
  createBaby,
  createWorld,
  deserialize,
  ensureRelation,
  familyProblem,
  familyTree,
  foundTown,
  heirsOf,
  levelOfJob,
  newJob,
  nextStage,
  payFor,
  pensionFor,
  rideFor,
  romanceAllowed,
  scheduleAge,
  serialize,
  setBond,
  setDating,
  spotNear,
  splitEstate,
  stageDays,
  stageOf,
  townDay,
} from '../src/sim';
import type { Folk, LifePace, MemberDraft, World, WorldObject } from '../src/sim';
import { run } from './helpers';
import { play } from './helpers/player';

const CTX = { neighbors: NEIGHBORS, ties: NEIGHBOR_TIES, catalog: CATALOG, town: TOWN };

function home(life: LifePace = 'short', death = true): Sim {
  const sim = new Sim(CATALOG, createWorld({ ...starterHouse(7), life, death }));
  return sim;
}

function townHome(life: LifePace = 'short'): Sim {
  const world = createWorld({ ...starterHouse(3), life });
  foundTown(world, CATALOG, TOWN);
  return new Sim(CATALOG, world);
}

function couple(sim: Sim): [Folk, Folk] {
  const [a, b] = sim.residents();
  setDating(sim.world, a.id, b.id, true);
  setBond(sim.world, a.id, b.id, 'married');
  return [a, b];
}

function place(sim: Sim, defId: string): WorldObject {
  const spot = spotNear(sim.world, CATALOG, defId, sim.residents()[0])!;
  sim.world.household.funds += 3000;
  expect(sim.dispatch({ type: 'buy', defId, x: spot.x, y: spot.y, rot: spot.rot })).toBe(true);
  sim.dispatch({ type: 'closeBuy' });
  return sim.world.objects[sim.world.objects.length - 1];
}

function babyOf(sim: Sim): Folk {
  const [a, b] = couple(sim);
  const crib = place(sim, 'crib');
  return createBaby(sim.world, CATALOG, [a, b], crib, false);
}

function happy(f: Folk): void {
  for (const k of Object.keys(f.needs) as (keyof Folk['needs'])[]) f.needs[k] = 95;
}

const logged = (sim: Sim, key: string) => sim.world.log.some((l) => l.key === key);

describe('bloco 17: regras do relógio da vida', () => {
  it('fases em ordem, com dias por ritmo; desligado não conta nada', () => {
    expect(nextStage('baby')).toBe('child');
    expect(nextStage('child')).toBe('teen');
    expect(nextStage('teen')).toBe('adult');
    expect(nextStage('adult')).toBe('elder');
    expect(nextStage('elder')).toBeNull();
    expect(stageDays('off', 'adult')).toBeNull();
    expect(stageDays('short', 'baby')).toBeNull();
    expect(stageDays('normal', 'teen')).toBe(LIFE_PACES.normal.teen);
    expect(LIFE_PACES.short.adult).toBeLessThan(LIFE_PACES.normal.adult);
    expect(LIFE_PACES.normal.adult).toBeLessThan(LIFE_PACES.long.adult);
  });

  it('quem entra na fase ganha ela inteira; quem já estava nela começa num ponto qualquer', () => {
    const sim = home('normal');
    const [a, b] = sim.residents();
    scheduleAge(sim.world, a, true);
    expect(a.nextAge).toBe(sim.world.tick + LIFE_PACES.normal.adult * MINUTES_PER_DAY);
    scheduleAge(sim.world, b, false);
    expect(b.nextAge!).toBeGreaterThan(sim.world.tick);
    expect(b.nextAge!).toBeLessThanOrEqual(sim.world.tick + LIFE_PACES.normal.adult * MINUTES_PER_DAY);
  });

  it('pensão e pecúlio crescem com o cargo; a herança reparte por casa', () => {
    const low = { ...newJob('office'), level: 0 };
    const high = { ...newJob('office'), level: 8 };
    expect(pensionFor(CATALOG, high)).toBeGreaterThan(pensionFor(CATALOG, low));
    expect(pensionFor(CATALOG, { ...low, partTime: true })).toBe(0);
    const split = splitEstate(1000, [
      { id: 1, where: 'home', tie: 'spouse' },
      { id: 2, where: 7, tie: 'child' },
      { id: 3, where: 'home', tie: 'child' },
    ]);
    expect(split.get('home')! + split.get(7)!).toBe(1000);
    expect(split.get(7)).toBe(333);
    expect(splitEstate(500, []).get('home')).toBe(500);
  });
});

describe('bloco 17: uma vida inteira, acelerada', () => {
  it('com o relógio ligado o bebê vira criança, jovem, adulto, idoso e um dia se vai', () => {
    const sim = home('short', true);
    const kid = babyOf(sim);
    expect(kid.parents).toHaveLength(2);
    const seen: string[] = [stageOf(kid)];
    const busy = (f: Folk) => {
      // ninguém sai de casa nesta corrida (sem escola nem trabalho no meio)
      f.away = null;
      f.queue = f.queue.filter((a) => a.kind !== 'school' && a.kind !== 'work');
      for (const o of sim.residents()) happy(o);
    };
    // bebê → criança pelo berço; depois cada fase acaba quando o relógio manda
    kid.kid!.grows = sim.world.tick + 1;
    for (let guard = 0; guard < 40 && sim.findFolk(kid.id); guard++) {
      if (seen[seen.length - 1] !== stageOf(kid)) seen.push(stageOf(kid));
      busy(kid);
      if (kid.age !== 'baby' && kid.nextAge !== undefined && !kid.down) {
        // a fase tem a duração do ritmo curto
        const left = kid.nextAge - sim.world.tick;
        expect(left).toBeLessThanOrEqual(LIFE_PACES.short[kid.age === undefined ? 'adult' : (kid.age as 'child')] * MINUTES_PER_DAY);
        kid.nextAge = sim.world.tick + 1;
      }
      run(sim, kid.down ? 120 : 2);
    }
    expect(seen).toEqual(['baby', 'child', 'teen', 'adult', 'elder']);
    expect(sim.findFolk(kid.id)).toBeUndefined();
    const gone = sim.world.departed.find((d) => d.id === kid.id)!;
    expect(gone.cause).toBe('age');
    expect(gone.age).toBe('elder');
    expect(gone.parents).toEqual(kid.parents);
    for (const k of ['log.grewUp', 'log.becameTeen', 'log.becameAdult', 'log.becameElder', 'log.fell.age', 'log.died.age']) expect(logged(sim, k)).toBe(true);
    const kinds = sim.world.household.album!.map((e) => e.kind);
    for (const k of ['teen', 'graduated', 'elder', 'passing']) expect(kinds).toContain(k);
  });

  it('a criança cresce de verdade, minuto a minuto, quando a infância acaba', () => {
    const sim = home('short', false);
    const kid = babyOf(sim);
    kid.kid!.grows = sim.world.tick + 1;
    run(sim, 3);
    expect(kid.age).toBe('child');
    expect(kid.nextAge).toBe(sim.world.tick - 2 + LIFE_PACES.short.child * MINUTES_PER_DAY);
    // pula até perto do fim da infância e deixa o tempo correr
    kid.nextAge = sim.world.tick + 90;
    run(sim, 120);
    expect(kid.age).toBe('teen');
    expect(kid.kid).toBeDefined();
  });

  it('desligado, ninguém envelhece além de bebê virar criança', () => {
    const sim = home('off');
    const kid = babyOf(sim);
    kid.kid!.grows = sim.world.tick + 1;
    play(sim, 3 * MINUTES_PER_DAY);
    expect(kid.age).toBe('child');
    for (const f of sim.household()) expect(f.nextAge).toBeUndefined();
    expect(sim.residents().filter((f) => f.age === undefined)).toHaveLength(2);
  });

  it('sem morte ligada, o idoso vive além do relógio', () => {
    const sim = home('short', false);
    const [a] = sim.residents();
    a.age = 'elder';
    a.nextAge = sim.world.tick + 1;
    run(sim, 3);
    expect(sim.findFolk(a.id)).toBeDefined();
    expect(a.nextAge).toBe(-1);
    expect(logged(sim, 'log.longLife')).toBe(true);
    run(sim, 60);
    expect(a.nextAge).toBe(-1);
  });
});

describe('bloco 17: jovem, meio período e aposentadoria', () => {
  it('o jovem pega meio período depois da aula, sem promoção; adulto fica efetivado', () => {
    const sim = home('short');
    const [a] = sim.residents();
    a.age = 'teen';
    a.kid = { born: 0, grows: 0, parents: [], grade: 70, homework: 'none', calledDay: -1, schoolDay: -1, lowDays: 0, cares: {}, neglect: 0, warned: 0 };
    expect(sim.dispatch({ type: 'takeJob', folkId: a.id, careerId: 'office' })).toBe(true);
    expect(a.job!.partTime).toBe(true);
    const lvl = levelOfJob(CATALOG, a.job!)!;
    expect(lvl.startHour).toBe(PART_TIME_START);
    expect(lvl.pay).toBeLessThan(CATALOG.careers.office.levels[0].pay);
    expect(payFor(CATALOG, a.job!)).toBe(lvl.pay);
    // na hora da carona da escola o ônibus espera; à tarde, a do trabalho
    a.job!.calledDay = 0;
    expect(rideFor(CATALOG, a, PART_TIME_START * 60 - 30)?.careerId).toBe('office');
    sim.ageUp(a);
    expect(a.age).toBeUndefined();
    expect(a.kid).toBeUndefined();
    expect(a.job!.partTime).toBeUndefined();
    expect(logged(sim, 'log.partTimeFull')).toBe(true);
  });

  it('adulto com emprego vira idoso aposentado: pensão por dia no lugar do salário', () => {
    const sim = home('short');
    const [a] = sim.residents();
    a.job = { ...newJob('clinic'), level: 5 };
    const pension = pensionFor(CATALOG, a.job);
    sim.ageUp(a);
    expect(a.age).toBe('elder');
    expect(a.job).toBeNull();
    expect(a.pension).toBe(pension);
    expect(a.retired).toEqual({ careerId: 'clinic', level: 5 });
    expect(sim.dispatch({ type: 'takeJob', folkId: a.id, careerId: 'office' })).toBe(false);
    expect(sim.lastProblem).toBe('retired');
    // a pensão cai na hora da vida do bairro
    const day = Math.floor(sim.world.tick / MINUTES_PER_DAY) + 1;
    sim.world.tick = day * MINUTES_PER_DAY + TOWN_HOUR * 60 - 1;
    sim.world.household.nextBills = sim.world.tick + 3 * MINUTES_PER_DAY;
    const before = sim.world.household.funds;
    run(sim, 1);
    expect(sim.world.household.funds - before).toBeGreaterThanOrEqual(pension - 5);
    expect(sim.world.household.album!.some((e) => e.kind === 'retired')).toBe(true);
  });

  it('romance: adulto com adulto (idoso também) ou jovem com jovem, sem noivado', () => {
    expect(romanceAllowed({ age: 'elder' }, {})).toBe(true);
    expect(romanceAllowed({ age: 'teen' }, { age: 'teen' }, 'flirt')).toBe(true);
    expect(romanceAllowed({ age: 'teen' }, { age: 'teen' }, 'propose')).toBe(false);
    expect(romanceAllowed({ age: 'teen' }, {}, 'flirt')).toBe(false);
    expect(romanceAllowed({ age: 'child' }, { age: 'child' }, 'flirt')).toBe(false);
  });
});

describe('bloco 17: herança', () => {
  it('quem morre deixa pecúlio para a casa e o xodó para o cônjuge', () => {
    const sim = home('off');
    const [a, b] = couple(sim);
    a.job = { ...newJob('office'), level: 2 };
    const chair = sim.world.objects.find((o) => CATALOG.objects[o.defId]?.category === 'seating') ?? sim.world.objects[0];
    chair.beloved = a.id;
    const before = sim.world.household.funds;
    expect(heirsOf(sim.world, a.id).map((h) => h.id)).toEqual([b.id]);
    (sim as unknown as { die(f: Folk, c: string): void }).die(a, 'age');
    expect(sim.world.household.funds - before).toBe(ESTATE_BASE + ESTATE_PER_LEVEL * 3);
    expect(chair.beloved).toBe(b.id);
    expect(logged(sim, 'log.heirloom')).toBe(true);
    expect(logged(sim, 'log.estate')).toBe(true);
    expect(sim.world.departed[0].spouse).toBe(b.id);
    expect(sim.world.household.album!.map((e) => e.kind)).toEqual(expect.arrayContaining(['heirloom', 'passing']));
  });

  it('o filho que mora em outra casa do bairro recebe a parte dele', () => {
    const sim = townHome('off');
    const [a, b] = couple(sim);
    const other = sim.world.town!.families.find((f) => f.id !== sim.world.town!.active)!;
    const son = sim.world.neighbors.find((n) => n.home === other.id)!;
    son.parents = [a.id, b.id];
    const famBefore = other.funds;
    const homeBefore = sim.world.household.funds;
    (sim as unknown as { die(f: Folk, c: string): void }).die(a, 'age');
    const total = ESTATE_BASE;
    expect(other.funds - famBefore + sim.world.household.funds - homeBefore).toBe(total);
    expect(other.funds - famBefore).toBe(Math.floor(total / 2));
    expect(sim.world.town!.feed.some((e) => e.key === 'feed.inherited')).toBe(true);
  });

  it('de velhice não tem barganha', () => {
    const sim = home('short', true);
    const [a] = sim.residents();
    a.age = 'elder';
    a.nextAge = sim.world.tick + 1;
    run(sim, 3);
    expect(a.down).toBe('age');
    for (let i = 0; i < 400 && sim.world.passings[0]?.stage !== 'waiting'; i++) sim.step();
    expect(sim.world.passings[0]?.stage).toBe('waiting');
    expect(sim.dispatch({ type: 'bargain', pick: 'even' })).toBe(false);
    expect(sim.lastProblem).toBe('oldAge');
    run(sim, 40);
    expect(sim.findFolk(a.id)).toBeUndefined();
  });
});

describe('bloco 17: árvore e álbum', () => {
  it('a árvore põe avós em cima, casal lado a lado e netos embaixo', () => {
    const sim = home('off');
    const kid = babyOf(sim);
    const [a, b] = sim.residents().filter((f) => f.id !== kid.id);
    // os pais de Tomé, que já se foram
    sim.world.departed.push({ id: 900, name: 'Vô Varanda', look: a.look, age: 'elder', cause: 'age', died: 0, spouse: 901 });
    sim.world.departed.push({ id: 901, name: 'Vó Varanda', look: a.look, age: 'elder', cause: 'age', died: 0, spouse: 900 });
    a.parents = [900, 901];
    const rows = familyTree(sim.world);
    expect(rows).toHaveLength(3);
    expect(rows[0].people.map((p) => p.id).sort()).toEqual([900, 901]);
    expect(rows[0].people.every((p) => p.gone)).toBe(true);
    const mid = rows[1].people.map((p) => p.id);
    expect(Math.abs(mid.indexOf(a.id) - mid.indexOf(b.id))).toBe(1);
    expect(rows[2].people.map((p) => p.id)).toEqual([kid.id]);
  });

  it('a avó que mora junto fica em cima, e a nora na linha do filho', () => {
    const sim = home('off');
    const kid = babyOf(sim);
    const [tome, lia] = sim.residents().filter((f) => f.id !== kid.id);
    const vo = { ...JSON.parse(JSON.stringify(tome)), id: 950, name: 'Vó Varanda', age: 'elder' } as Folk;
    sim.world.folks.push(vo);
    tome.parents = [vo.id];
    const rows = familyTree(sim.world);
    expect(rows.map((r) => r.people.map((p) => p.id).sort((a, b) => a - b))).toEqual([[vo.id], [tome.id, lia.id].sort((a, b) => a - b), [kid.id]]);
  });

  it('foto entra no álbum, sai quando o jogador tira, e o álbum tem limite', () => {
    const sim = home('off');
    const photo = 'data:image/jpeg;base64,AAAA';
    expect(sim.dispatch({ type: 'takePhoto', photo, caption: '  Domingo  no   quintal ', who: [sim.residents()[0].id] })).toBe(true);
    const page = sim.world.household.album!.at(-1)!;
    expect(page.caption).toBe('Domingo no quintal');
    expect(page.names).toEqual([sim.residents()[0].name]);
    expect(sim.dispatch({ type: 'dropPhoto', entryId: page.id })).toBe(true);
    expect(sim.world.household.album).toHaveLength(0);
    for (let i = 0; i < PHOTO_MAX + 4; i++) sim.dispatch({ type: 'takePhoto', photo });
    expect(sim.world.household.album!.filter((e) => e.photo)).toHaveLength(PHOTO_MAX);
    for (let i = 0; i < ALBUM_MAX + 10; i++) addAlbum(sim.world, { kind: 'teen', who: [], names: ['X'] });
    expect(sim.world.household.album!.length).toBe(ALBUM_MAX);
    expect(sim.dispatch({ type: 'takePhoto', photo: `data:image/jpeg;base64,${'A'.repeat(70_000)}` })).toBe(false);
  });

  it('casamento e cargo mais alto vão para o álbum sozinhos', () => {
    const sim = home('off');
    const [a, b] = couple(sim);
    (sim as unknown as { marry(x: Folk, y: Folk): void }).marry(a, b);
    expect(sim.world.household.album!.some((e) => e.kind === 'wedding')).toBe(true);
  });
});

describe('bloco 17: família nova e bairro', () => {
  it('o criador faz jovem e idoso; casa só de jovens não pode', () => {
    const member = (name: string, age?: 'teen' | 'elder'): MemberDraft => ({
      name,
      look: fullLook({ skin: 0, hair: 0, shirt: 0, pants: 0, style: 0, face: 0, body: 1, formal: 0, sleepwear: 0, swimwear: 0, ...faceFromSeed(1) }),
      // plano 2, bloco 10: jovem tem quatro traços, adulto e idoso cinco
      traits: age === 'teen' ? ['gentil', 'caseiro', 'tagarela', 'artistico'] : ['gentil', 'caseiro', 'tagarela', 'romantico', 'ambicioso'],
      temper: { ...NEUTRAL_TEMPER },
      month: 0,
      ...(age ? { age } : {}),
    });
    const ok = { surname: 'Ladrilho', members: [member('Dita', 'elder'), member('Caio', 'teen')] };
    expect(familyProblem(CATALOG, { surname: 'Ladrilho', members: [member('Caio', 'teen')] })).toBe('noAdult');
    const w = createWorld({ ...familySeed(ok, 5), life: 'normal' });
    const [dita, caio] = w.folks;
    expect(dita.age).toBe('elder');
    expect(dita.pension).toBe(BASE_PENSION);
    expect(caio.age).toBe('teen');
    expect(caio.kid?.homework).toBe('none');
    expect(w.rules.life).toBe('normal');
  });

  it('as outras casas do bairro também envelhecem (e o idoso de lá um dia se vai)', () => {
    const sim = townHome('short');
    const w = sim.world;
    const fam = w.town!.families.find((f) => f.id !== w.town!.active)!;
    const n = w.neighbors.find((x) => x.home === fam.id)!;
    expect(ageNeighbor(w, CATALOG, n)).toBeNull();
    expect(n.nextAge).toBeDefined();
    n.career = { id: 'office', level: 4 };
    n.nextAge = w.tick;
    expect(ageNeighbor(w, CATALOG, n)).toBe('elder');
    expect(n.career).toBeNull();
    expect(n.pension).toBeGreaterThan(0);
    n.nextAge = w.tick;
    townDay(w, CATALOG);
    expect(w.neighbors.includes(n)).toBe(false);
    expect(w.departed.some((d) => d.id === n.id && d.cause === 'age')).toBe(true);
    expect(w.town!.feed.some((e) => e.key === 'feed.passed')).toBe(true);
  });
});

describe('bloco 17: save v21', () => {
  it('o save guarda relógio, fases, pais e álbum', () => {
    const sim = home('long');
    const kid = babyOf(sim);
    addAlbum(sim.world, { kind: 'photo', who: [], names: [], photo: 'data:image/jpeg;base64,AA' });
    play(sim, 5);
    const file = serialize(sim.world, 0);
    expect(file.version).toBe(SAVE_VERSION);
    expect(SAVE_VERSION).toBeGreaterThanOrEqual(21);
    const back = new Sim(CATALOG, deserialize(JSON.parse(JSON.stringify(file)), CTX).world);
    expect(back.world.rules.life).toBe('long');
    expect(back.findFolk(kid.id)!.parents).toEqual(kid.parents);
    expect(back.world.household.album).toHaveLength(1);
  });

  it('um save v20 abre com o relógio desligado, os pais guardados e o álbum vazio', () => {
    const sim = home('off');
    const kid = babyOf(sim);
    kid.age = 'child';
    kid.away = { until: sim.world.tick + 60, late: 0, mood: 50, event: null, nextEvent: -1 };
    const w = JSON.parse(JSON.stringify(sim.world)) as World & Record<string, unknown>;
    delete (w.rules as { life?: string }).life;
    delete w.household.album;
    for (const f of w.folks) delete f.parents;
    const file = deserialize({ version: 20, savedAt: 0, world: w }, CTX);
    expect(file.version).toBe(SAVE_VERSION);
    expect(file.world.rules.life).toBe('off');
    expect(file.world.household.album).toEqual([]);
    const k = file.world.folks.find((f) => f.id === kid.id)!;
    expect(k.parents).toEqual(kid.kid!.parents);
    expect(k.away?.school).toBe(true);
    const again = new Sim(CATALOG, file.world);
    run(again, 120);
    expect(again.findFolk(kid.id)!.away).toBeNull();
    expect(again.world.log.some((l) => l.key === 'log.backFromSchool' || l.key.startsWith('log.school') || l.key.startsWith('log.grade'))).toBe(true);
  });
});

describe('bloco 17: semana com o relógio ligado', () => {
  it('sete dias de casa com relógio curto não desandam', () => {
    const sim = home('short', true);
    babyOf(sim);
    ensureRelation(sim.world, sim.residents()[0].id, sim.residents()[1].id);
    play(sim, 7 * MINUTES_PER_DAY);
    expect(sim.household().length).toBeGreaterThan(0);
    for (const f of sim.household()) {
      if (f.age !== 'baby') expect(f.nextAge).toBeDefined();
    }
  });
});
