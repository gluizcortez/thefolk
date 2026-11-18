import { describe, expect, it } from 'vitest';
import { CATALOG } from '../src/data/catalog';
import { familySeed } from '../src/data/family';
import { starterHouse } from '../src/data/house';
import { NEIGHBORS, NEIGHBOR_TIES } from '../src/data/neighbors';
import {
  HABIT_PERIOD_DAYS,
  HABIT_SHIFT,
  MINUTES_PER_DAY,
  NEUTRAL_TEMPER,
  SAVE_VERSION,
  Sim,
  TEMPER_AXES,
  TEMPER_BUDGET,
  affinity,
  createWorld,
  deserialize,
  familyProblem,
  fitTemper,
  monthChemistry,
  monthFor,
  needWeight,
  decayMultiplier,
  relationOf,
  settleHabits,
  socialTaste,
  temperFromTraits,
  temperSum,
  validTemper,
  wearOf,
} from '../src/sim';
import type { FamilyDraft, Folk, Look, LogEntry, MemberDraft, Temper } from '../src/sim';
import { run } from './helpers';
import { play, playStep } from './helpers/player';

const LOOK: Look = { skin: 1, hair: 2, shirt: 3, pants: 1, style: 2, face: 1, body: 2, formal: 1, sleepwear: 0, swimwear: 3 };

function member(name: string, temper: Temper, traits: string[] = [], month = 0): MemberDraft {
  return { name, look: { ...LOOK }, traits, temper: { ...temper }, month };
}

function draftOf(...members: MemberDraft[]): FamilyDraft {
  return { surname: 'Goiabeira', members };
}

function runLogged(sim: Sim, ticks: number): LogEntry[] {
  const seen: LogEntry[] = [];
  let last = sim.world.tick;
  for (let i = 0; i < ticks; i++) {
    sim.step();
    for (const e of sim.world.log) if (e.tick > last) seen.push(e);
    last = sim.world.tick;
  }
  return seen;
}

describe('temperamento (bloco 5)', () => {
  it('cinco em tudo é o orçamento e não muda nada', () => {
    expect(temperSum(NEUTRAL_TEMPER)).toBe(TEMPER_BUDGET);
    expect(validTemper(NEUTRAL_TEMPER)).toBe(true);
    const folk = { traits: [], temper: NEUTRAL_TEMPER } as unknown as Folk;
    for (const need of ['social', 'fun', 'comfort', 'hygiene', 'energy'] as const) {
      expect(needWeight(CATALOG, folk, need)).toBe(1);
      expect(decayMultiplier(CATALOG, folk, need)).toBe(1);
    }
    expect(socialTaste(CATALOG, folk, 'mean')).toBe(1);
  });

  it('acerta o orçamento mexendo primeiro nos eixos do meio', () => {
    const t = fitTemper({ order: 9, outgoing: 9, pep: 9, wit: 5, warmth: 5 });
    expect(temperSum(t)).toBe(TEMPER_BUDGET);
    expect(t.order).toBeGreaterThanOrEqual(8);
    expect(t.wit + t.warmth).toBe(0);
    expect(validTemper(t)).toBe(true);
    expect(validTemper({ ...NEUTRAL_TEMPER, order: 11, outgoing: -1 })).toBe(false);
    expect(validTemper({ ...NEUTRAL_TEMPER, order: 6 })).toBe(false);
  });

  it('o temperamento sai coerente com os traços', () => {
    const tome = temperFromTraits(CATALOG, ['tagarela', 'caseiro']);
    expect(tome.outgoing).toBeGreaterThan(5);
    expect(tome.order).toBeGreaterThan(5);
    const lia = temperFromTraits(CATALOG, ['agitado', 'gentil']);
    expect(lia.pep).toBeGreaterThan(5);
    expect(lia.warmth).toBeGreaterThan(5);
    const rosa = temperFromTraits(CATALOG, ['esquentado']);
    expect(rosa.warmth).toBeLessThan(5);
    for (const t of [tome, lia, rosa]) expect(validTemper(t)).toBe(true);
  });

  it('expansivo perde social mais rápido; pouco Afeto gosta de provocar', () => {
    const loud = { traits: [], temper: { order: 5, outgoing: 10, pep: 5, wit: 5, warmth: 0 } } as unknown as Folk;
    const quiet = { traits: [], temper: { order: 5, outgoing: 0, pep: 5, wit: 5, warmth: 10 } } as unknown as Folk;
    expect(decayMultiplier(CATALOG, loud, 'social')).toBeGreaterThan(decayMultiplier(CATALOG, quiet, 'social') * 1.5);
    expect(socialTaste(CATALOG, loud, 'mean')).toBeGreaterThanOrEqual(1.5);
    expect(socialTaste(CATALOG, quiet, 'mean')).toBeLessThan(0.5);
  });

  it('mês de nascimento: cada um sugere um temperamento válido e a afinidade conta', () => {
    expect(CATALOG.months).toHaveLength(12);
    for (const m of CATALOG.months) {
      expect(validTemper(m.temper), `mês ${m.id}`).toBe(true);
      expect(monthFor(CATALOG, m.temper)).toBe(m.id);
      for (const o of m.likes) expect(CATALOG.months[o].likes).toContain(m.id);
      for (const o of m.dislikes) expect(CATALOG.months[o].dislikes).toContain(m.id);
      expect(m.likes.some((x) => m.dislikes.includes(x))).toBe(false);
    }
    const [a, b] = [0, CATALOG.months[0].likes[0]];
    const c = CATALOG.months[0].dislikes[0];
    expect(monthChemistry(CATALOG, a, b)).toBe(1);
    expect(monthChemistry(CATALOG, a, c)).toBe(-1);
    expect(affinity(CATALOG, { traits: [], month: a }, { traits: [], month: b })).toBe(1);
    expect(affinity(CATALOG, { traits: [], month: a }, { traits: [], month: c })).toBe(-1);
  });
});

describe('criar família (bloco 5)', () => {
  it('recusa família inválida e explica', () => {
    expect(familyProblem(CATALOG, draftOf())).toBe('noMembers');
    expect(familyProblem(CATALOG, { ...draftOf(member('Bento', NEUTRAL_TEMPER)), surname: '  ' })).toBe('noSurname');
    expect(familyProblem(CATALOG, draftOf(member(' ', NEUTRAL_TEMPER)))).toBe('noName');
    expect(familyProblem(CATALOG, draftOf(member('Bento', NEUTRAL_TEMPER), member('bento', NEUTRAL_TEMPER)))).toBe('sameName');
    expect(familyProblem(CATALOG, draftOf(member('Bento', NEUTRAL_TEMPER, ['gentil', 'caseiro', 'tagarela'])))).toBe('tooManyTraits');
    expect(familyProblem(CATALOG, draftOf(member('Bento', NEUTRAL_TEMPER, ['caprichoso', 'desleixado'])))).toBe('clashingTraits');
    expect(familyProblem(CATALOG, draftOf(member('Bento', { ...NEUTRAL_TEMPER, order: 6 })))).toBe('temper');
    expect(familyProblem(CATALOG, draftOf(member('Bento', NEUTRAL_TEMPER, [], 12)))).toBe('month');
    expect(familyProblem(CATALOG, draftOf({ ...member('Bento', NEUTRAL_TEMPER), look: { ...LOOK, body: 3 } }))).toBe('look');
    const nine = Array.from({ length: 9 }, (_, i) => member(`F${i}`, NEUTRAL_TEMPER));
    expect(familyProblem(CATALOG, draftOf(...nine))).toBe('tooMany');
    expect(familyProblem(CATALOG, draftOf(member('Bento', NEUTRAL_TEMPER, ['gentil', 'caseiro'])))).toBeNull();
  });

  it('uma família de 3 criada do zero muda para a casa e vive três dias', () => {
    const months = CATALOG.months;
    const draft = draftOf(
      member('Iara', months[4].temper, ['gentil'], 4),
      member('Bento', months[7].temper, ['ambicioso', 'caprichoso'], 7),
      member('Teca', months[9].temper, ['brincalhao'], 9),
    );
    expect(familyProblem(CATALOG, draft)).toBeNull();
    const sim = new Sim(CATALOG, createWorld(familySeed(draft, 5)));
    const home = sim.residents();
    expect(home.map((f) => f.name)).toEqual(['Iara Goiabeira', 'Bento Goiabeira', 'Teca Goiabeira']);
    expect(new Set(home.map((f) => `${f.x},${f.y}`)).size).toBe(3);
    expect(home[1].temper).toEqual(months[7].temper);
    expect(home[1].look.body).toBe(2);
    expect(home[0].month).toBe(4);
    // quem mora junto já é amigo; a vizinhança veio junto, sem Tomé e Lia
    expect(relationOf(sim.world, home[0].id, home[2].id)?.friendship).toBe(35);
    expect(sim.world.neighbors.length).toBe(NEIGHBORS.length);
    expect(sim.world.folks.some((f) => f.name.startsWith('Tomé'))).toBe(false);
    expect(sim.world.objects.some((o) => o.defId === 'wardrobe')).toBe(true);
    let collapses = 0;
    for (let m = 0; m < 3 * MINUTES_PER_DAY; m++) {
      sim.step();
      for (const f of sim.residents()) if (f.collapsed > 0) collapses++;
    }
    expect(collapses).toBe(0);
    for (const f of sim.residents()) expect(Object.values(f.needs).every((v) => v >= 0)).toBe(true);
  });

  it('cabem oito moradores, cada um num lugar livre', () => {
    const eight = Array.from({ length: 8 }, (_, i) => member(`F${i}`, NEUTRAL_TEMPER));
    const world = createWorld(familySeed(draftOf(...eight), 2));
    expect(world.folks).toHaveLength(8);
    expect(new Set(world.folks.map((f) => `${f.x},${f.y}`)).size).toBe(8);
  });

  it('dois folks de eixos opostos vivem de jeitos bem diferentes', () => {
    const neat = { order: 10, outgoing: 10, pep: 0, wit: 0, warmth: 5 };
    const slob = { order: 0, outgoing: 0, pep: 10, wit: 10, warmth: 5 };
    let neatCare = 0;
    let slobCare = 0;
    let neatTalk = 0;
    let slobTalk = 0;
    for (const seed of [3, 4]) {
      const sim = new Sim(CATALOG, createWorld(familySeed(draftOf(member('Ana', neat), member('Beto', slob)), seed)));
      const [a, b] = sim.residents();
      for (let m = 0; m < 4 * MINUTES_PER_DAY; m++) {
        playStep(sim);
        for (const f of [a, b]) {
          const act = f.queue[0];
          if (!act || act.phase !== 'using') continue;
          const it = act.kind === 'use' ? sim.interactionOf(act) : undefined;
          const caring = act.kind === 'tidy' || !!it?.care;
          const talking = act.kind === 'social';
          if (f === a) {
            neatCare += caring ? 1 : 0;
            neatTalk += talking ? 1 : 0;
          } else {
            slobCare += caring ? 1 : 0;
            slobTalk += talking ? 1 : 0;
          }
        }
      }
    }
    expect(neatCare).toBeGreaterThan(slobCare * 2);
    expect(neatTalk).toBeGreaterThan(slobTalk);
  });
});

describe('hábito muda o temperamento devagar (bloco 5)', () => {
  it('o eixo exercitado ganha um ponto e outro devolve', () => {
    const folk = { temper: { ...NEUTRAL_TEMPER }, habits: { order: HABIT_SHIFT + 10, wit: 40 } } as Folk;
    const shift = settleHabits(folk);
    expect(shift?.axis).toBe('order');
    expect(folk.temper.order).toBe(6);
    expect(temperSum(folk.temper)).toBe(TEMPER_BUDGET);
    expect(folk.habits).toEqual({});
    // pouco hábito não mexe em nada
    folk.habits = { pep: HABIT_SHIFT - 1 };
    expect(settleHabits(folk)).toBeNull();
  });

  it('quem limpa muito ganha Ordem na virada do período', () => {
    const sim = new Sim(CATALOG, createWorld(starterHouse(7)));
    const tome = sim.residents()[0];
    const before = tome.temper.order;
    const target = HABIT_PERIOD_DAYS * MINUTES_PER_DAY;
    sim.world.tick = target - 5;
    tome.habits = { order: HABIT_SHIFT * 2 };
    const log = runLogged(sim, 10);
    expect(tome.temper.order).toBe(before + 1);
    expect(temperSum(tome.temper)).toBe(TEMPER_BUDGET);
    expect(log.some((e) => e.key === 'log.temperUp' && e.params?.name === tome.name)).toBe(true);
  });

  it('limpar e conversar contam como hábito', () => {
    const sim = new Sim(CATALOG, createWorld(starterHouse(8)));
    play(sim, 6 * 60);
    const total = sim.residents().reduce((s, f) => s + TEMPER_AXES.reduce((x, a) => x + Math.abs(f.habits[a] ?? 0), 0), 0);
    expect(total).toBeGreaterThan(0);
  });
});

describe('roupas por ocasião (bloco 5)', () => {
  it('guarda-roupa troca a roupa; cama põe pijama e chuveiro, roupão', () => {
    const sim = new Sim(CATALOG, createWorld(starterHouse(9)));
    const tome = sim.residents()[0];
    const wardrobe = sim.world.objects.find((o) => o.defId === 'wardrobe')!;
    expect(sim.dispatch({ type: 'queueUse', folkId: tome.id, objectId: wardrobe.id, interactionId: 'dress_formal' })).toBe(true);
    for (let i = 0; i < 120 && tome.outfit !== 'formal'; i++) sim.step();
    expect(tome.outfit).toBe('formal');
    expect(wearOf(tome)).toBe('formal');
    const bed = CATALOG.objects.bed.interactions.find((i) => i.id === 'sleep')!;
    const shower = CATALOG.objects.shower.interactions.find((i) => i.id === 'shower')!;
    expect(wearOf(tome, bed)).toBe('sleep');
    expect(wearOf(tome, shower)).toBe('bath');
    // no chuveiro de verdade, o folk aparece de roupão
    const box = sim.world.objects.find((o) => o.defId === 'shower')!;
    expect(sim.dispatch({ type: 'queueUse', folkId: tome.id, objectId: box.id, interactionId: 'shower' })).toBe(true);
    let sawBath = false;
    for (let i = 0; i < 200 && !sawBath; i++) {
      sim.step();
      const a = tome.queue[0];
      if (a?.phase === 'using' && wearOf(tome, sim.interactionOf(a)) === 'bath') sawBath = true;
    }
    expect(sawBath).toBe(true);
    // depois do banho, volta para a roupa de sempre
    for (let i = 0; i < 60 && tome.queue.length; i++) sim.step();
    expect(wearOf(tome, tome.queue[0] ? sim.interactionOf(tome.queue[0]) : undefined)).toBe('formal');
  });

  it('comida, livro e pano aparecem na mão', () => {
    const meal = CATALOG.objects.fridge.interactions.find((i) => i.id === 'meal')!;
    expect(meal.hold).toBe('plate');
    expect(CATALOG.objects.bookshelf.interactions.find((i) => i.id === 'read')!.hold).toBe('book');
    expect(CATALOG.objects.fridge.interactions.find((i) => i.id === 'clean')!.hold).toBe('rag');
  });
});

describe('save v10 (bloco 5)', () => {
  it('migra da v9: Tomé e Lia ganham eixos coerentes, mês, corpo e roupa', () => {
    expect(SAVE_VERSION).toBeGreaterThanOrEqual(10);
    const world = createWorld(starterHouse(1));
    const raw = JSON.parse(JSON.stringify(world));
    for (const f of raw.folks) {
      delete f.temper;
      delete f.month;
      delete f.outfit;
      delete f.habits;
      f.look = { skin: f.look.skin, hair: f.look.hair, shirt: f.look.shirt, pants: f.look.pants };
    }
    for (const n of raw.neighbors) {
      delete n.temper;
      delete n.month;
      n.look = { skin: n.look.skin, hair: n.look.hair, shirt: n.look.shirt, pants: n.look.pants };
    }
    const { world: back } = deserialize({ version: 9, savedAt: 1, world: raw }, { neighbors: NEIGHBORS, ties: NEIGHBOR_TIES, catalog: CATALOG });
    const [tome, lia] = back.folks;
    expect(tome.temper.outgoing).toBeGreaterThan(5);
    expect(tome.temper.order).toBeGreaterThan(5);
    expect(lia.temper.pep).toBeGreaterThan(5);
    expect(lia.temper.warmth).toBeGreaterThan(5);
    for (const f of back.folks) {
      expect(validTemper(f.temper)).toBe(true);
      expect(f.outfit).toBe('day');
      expect(f.habits).toEqual({});
      expect(f.look.body).toBe(1);
      expect(f.look.style).toBe(f.look.hair % 2);
      expect(f.month).toBe(monthFor(CATALOG, f.temper));
    }
    for (const n of back.neighbors) expect(validTemper(n.temper)).toBe(true);
    // e o jogo segue
    const sim = new Sim(CATALOG, back);
    run(sim, 600);
    expect(sim.world.folks.every((f) => validTemper(f.temper))).toBe(true);
  });

  it('visita chega com o temperamento e o mês do vizinho', () => {
    const sim = new Sim(CATALOG, createWorld(starterHouse(12)));
    const n = sim.world.neighbors.find((x) => !x.service)!;
    expect(validTemper(n.temper)).toBe(true);
    // a visita nasce do vizinho (como quando toca a campainha)
    (sim as unknown as { spawnVisitor(n: unknown, until: number, host: number): void }).spawnVisitor(n, sim.world.tick + 120, 0);
    const guest = sim.world.folks.find((f) => f.id === n.id);
    expect(guest).toBeDefined();
    expect(guest!.temper).toEqual(n.temper);
    expect(guest!.month).toBe(n.month);
    expect(guest!.outfit).toBe('day');
    expect(guest!.habits).toEqual({});
  });
});
