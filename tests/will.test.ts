import { describe, expect, it } from 'vitest';
import { CATALOG } from '../src/data/catalog';
import { starterHouse } from '../src/data/house';
import { NEIGHBORS, NEIGHBOR_TIES } from '../src/data/neighbors';
import {
  ALARM_LEAD,
  INSPIRE_COST,
  MAX_WISHES,
  MINUTES_PER_DAY,
  SAVE_VERSION,
  Sim,
  THINK_EVERY,
  createWorld,
  deserialize,
  isEffort,
  missedOne,
  moodOf,
  nextShift,
  refusal,
  rollWishes,
  sleepPressure,
  think,
  thoughtOf,
  wishOnUse,
} from '../src/sim';
import type { Folk, InteractionDef, Sim as SimType } from '../src/sim';
import { crowd, householdSim, openField, run, starterSim } from './helpers';

const LOW = { hunger: 30, energy: 30, hygiene: 25, bladder: 40, comfort: 20, fun: 10, social: 15 };

function interaction(defId: string, id: string): InteractionDef {
  return CATALOG.objects[defId].interactions.find((i) => i.id === id)!;
}

function deskSim(needs?: Record<string, number>): SimType {
  const sim = openField(8, 8, [{ defId: 'desk', x: 3, y: 3 }, { defId: 'fridge', x: 6, y: 1 }], { x: 3, y: 5, needs });
  sim.world.folks[0].autonomy = false;
  return sim;
}

function deskId(sim: SimType): number {
  return sim.world.objects.find((o) => o.defId === 'desk')!.id;
}

describe('recusa (bloco 6)', () => {
  it('treinar e trabalhar por conta própria são esforço; comer, limpar e ver TV, não', () => {
    expect(isEffort(interaction('bookshelf', 'study'))).toBe(true);
    expect(isEffort(interaction('desk', 'freelance'))).toBe(true);
    expect(isEffort(interaction('easel', 'paint'))).toBe(true);
    expect(isEffort(interaction('fridge', 'meal'))).toBe(false);
    expect(isEffort(interaction('bookshelf', 'read'))).toBe(false);
    expect(isEffort(interaction('tv', 'watch'))).toBe(false);
    expect(isEffort(interaction('trashcan', 'empty'))).toBe(false);
  });

  it('de mau humor o folk recusa a ordem, diz por quê no balão e o jogo explica', () => {
    const sim = deskSim(LOW);
    const folk = sim.world.folks[0];
    expect(moodOf(CATALOG, folk.needs)).toBeLessThan(33);
    const ok = sim.dispatch({ type: 'queueUse', folkId: folk.id, objectId: deskId(sim), interactionId: 'puzzles' });
    expect(ok).toBe(false);
    expect(sim.lastProblem).toBe('refused');
    expect(sim.lastRefusal).toBe('mood');
    expect(folk.queue.length).toBe(0);
    expect(thoughtOf(folk, sim.world.tick)).toMatchObject({ kind: 'refuse', icon: 'mood' });
    // comer ele topa
    const fridge = sim.world.objects.find((o) => o.defId === 'fridge')!;
    expect(sim.dispatch({ type: 'queueUse', folkId: folk.id, objectId: fridge.id, interactionId: 'meal' })).toBe(true);
  });

  it('com uma necessidade do corpo no fim, a recusa diz qual é', () => {
    const sim = deskSim({ hunger: 8, energy: 90, hygiene: 90, bladder: 90, comfort: 90, fun: 90, social: 90 });
    const folk = sim.world.folks[0];
    expect(sim.dispatch({ type: 'queueUse', folkId: folk.id, objectId: deskId(sim), interactionId: 'puzzles' })).toBe(false);
    expect(sim.lastRefusal).toBe('hunger');
    expect(folk.thought?.icon).toBe('hunger');
  });

  it('de bom humor, topa; Pique alto aguenta mais antes de recusar', () => {
    const happy = deskSim();
    const f = happy.world.folks[0];
    expect(happy.dispatch({ type: 'queueUse', folkId: f.id, objectId: deskId(happy), interactionId: 'puzzles' })).toBe(true);

    const it = interaction('desk', 'puzzles');
    const folk = deskSim().world.folks[0];
    folk.needs = { ...folk.needs, ...LOW, hunger: 45, energy: 45, comfort: 35, fun: 30, social: 35 };
    const mood = moodOf(CATALOG, folk.needs);
    folk.temper = { order: 5, outgoing: 5, pep: 0, wit: 10, warmth: 5 };
    const lazy = refusal(CATALOG, folk, it, 0);
    folk.temper = { order: 5, outgoing: 5, pep: 10, wit: 0, warmth: 5 };
    const lively = refusal(CATALOG, folk, it, 0);
    expect(mood).toBeGreaterThan(23);
    expect(mood).toBeLessThan(43);
    expect(lazy).toBe('mood');
    expect(lively).toBeNull();
  });

  it('se o humor cai no caminho, chega lá e desiste', () => {
    const sim = deskSim();
    const folk = sim.world.folks[0];
    folk.x = 3;
    folk.y = 7;
    expect(sim.dispatch({ type: 'queueUse', folkId: folk.id, objectId: deskId(sim), interactionId: 'puzzles' })).toBe(true);
    sim.step();
    Object.assign(folk.needs, LOW);
    run(sim, 10);
    expect(folk.queue.length).toBe(0);
    expect(sim.world.log.some((l) => l.key === 'log.refused.mood')).toBe(true);
    expect(folk.skills.logic ?? 0).toBe(0);
  });

  it('a IA também não pega no pesado de mau humor', () => {
    const sim = openField(8, 8, [{ defId: 'desk', x: 3, y: 3 }], { x: 3, y: 5, needs: { ...LOW, fun: 90 } });
    const folk = sim.world.folks[0];
    run(sim, 60);
    expect(folk.skills.logic ?? 0).toBe(0);
  });
});

describe('dia inspirado (bloco 6)', () => {
  it('sem ânimo não dá; com ânimo, gasta, treina em dobro e topa tudo', () => {
    const sim = deskSim();
    const folk = sim.world.folks[0];
    expect(sim.dispatch({ type: 'inspire', folkId: folk.id })).toBe(false);
    expect(sim.lastProblem).toBe('noSpark');
    folk.spark = INSPIRE_COST + 1;
    expect(sim.dispatch({ type: 'inspire', folkId: folk.id })).toBe(true);
    expect(folk.spark).toBe(1);
    expect(sim.dispatch({ type: 'inspire', folkId: folk.id })).toBe(false);
    expect(sim.lastProblem).toBe('already');
    // inspirado não recusa, mesmo de mau humor
    Object.assign(folk.needs, LOW);
    expect(refusal(CATALOG, folk, interaction('desk', 'puzzles'), sim.world.tick)).toBeNull();

    // treino em dobro: compara com um folk igual sem inspiração
    const a = deskSim();
    const b = deskSim();
    b.world.folks[0].spark = INSPIRE_COST;
    expect(b.dispatch({ type: 'inspire', folkId: b.world.folks[0].id })).toBe(true);
    for (const s of [a, b]) {
      s.dispatch({ type: 'queueUse', folkId: s.world.folks[0].id, objectId: deskId(s), interactionId: 'puzzles' });
      run(s, 40);
    }
    const xa = a.world.folks[0].skills.logic;
    const xb = b.world.folks[0].skills.logic;
    expect(xa).toBeGreaterThan(0);
    expect(xb / xa).toBeGreaterThan(1.9);
  });
});

describe('sono com horário (bloco 6)', () => {
  function worker(seed = 1): { sim: SimType; folk: Folk } {
    const sim = starterSim(seed);
    const folk = sim.world.folks[0];
    expect(sim.dispatch({ type: 'takeJob', folkId: folk.id, careerId: 'office' })).toBe(true);
    return { sim, folk };
  }

  it('a vontade de dormir sobe perto da hora de deitar e zera depois do despertador', () => {
    const { sim, folk } = worker();
    sim.world.tick = 12 * 60; // meio-dia: o próximo turno é amanhã às 9h
    const shift = nextShift(CATALOG, folk, sim.world.tick)!;
    const wake = shift.start - ALARM_LEAD;
    folk.needs.energy = 50;
    const at = (t: number) => sleepPressure(CATALOG, folk, t);
    expect(at(wake - 12 * 60)).toBe(0);
    expect(at(wake - 30)).toBe(1);
    expect(at(wake + 1)).toBe(0);
    // quanto mais cansado, mais cedo deita
    const tired = { ...folk, needs: { ...folk.needs, energy: 10 } };
    expect(sleepPressure(CATALOG, tired, wake - 8 * 60)).toBeGreaterThan(at(wake - 8 * 60));
  });

  it('o despertador acorda antes do turno; desligado, não', () => {
    for (const alarm of [true, false]) {
      const { sim, folk } = worker(3);
      folk.alarm = alarm;
      const shift = nextShift(CATALOG, folk, sim.world.tick)!;
      const wake = shift.start - ALARM_LEAD;
      // pula para a madrugada, já dormindo e com sono de sobra
      sim.world.tick = wake - 120;
      folk.needs.energy = 10;
      const bed = sim.world.objects.find((o) => o.defId === 'bed')!;
      folk.autonomy = false;
      expect(sim.dispatch({ type: 'queueUse', folkId: folk.id, objectId: bed.id, interactionId: 'sleep' })).toBe(true);
      run(sim, 130);
      const rang = sim.world.log.some((l) => l.key === 'log.alarm');
      expect(rang).toBe(alarm);
      if (alarm) expect(thoughtOf(folk, wake + 2)?.kind).toBe('alarm');
    }
  });

  it('sete dias com emprego: ninguém sai para o turno sem dormir, ninguém desmaia, desejos se cumprem', () => {
    for (const seed of [1, 2, 3]) {
      const sim = householdSim(seed);
      const [a, b] = sim.world.folks;
      sim.dispatch({ type: 'takeJob', folkId: a.id, careerId: 'office' });
      sim.dispatch({ type: 'takeJob', folkId: b.id, careerId: 'kitchen' });
      const atDeparture: number[] = [];
      const awayBefore = new Map<number, boolean>();
      for (let m = 0; m < 7 * MINUTES_PER_DAY; m++) {
        for (const f of sim.world.folks) awayBefore.set(f.id, !!f.away);
        sim.step();
        for (const f of sim.world.folks) if (f.away && !awayBefore.get(f.id)) atDeparture.push(f.needs.energy);
      }
      const keys = sim.world.log.map((l) => l.key);
      expect(atDeparture.length).toBeGreaterThanOrEqual(8);
      // o primeiro dia começa como a casa veio; dali em diante, todo mundo descansado
      expect(Math.min(...atDeparture.slice(2))).toBeGreaterThan(55);
      expect(keys).not.toContain('log.collapse');
      expect(keys).not.toContain('log.missedWork');
      expect(sim.world.folks.filter((f) => !f.visit).reduce((s, f) => s + f.spark, 0)).toBeGreaterThan(0);
      expect(sim.world.household.funds).toBeGreaterThan(0);
    }
  });
});

describe('desejos do dia (bloco 6)', () => {
  it('cada morador sorteia até três desejos diferentes e possíveis, sempre os mesmos com o mesmo mundo', () => {
    const a = householdSim(4);
    const b = householdSim(4);
    run(a, 2);
    run(b, 2);
    for (const f of a.world.folks.filter((x) => !x.visit)) {
      expect(f.wishes.length).toBeGreaterThan(0);
      expect(f.wishes.length).toBeLessThanOrEqual(MAX_WISHES);
      expect(new Set(f.wishes.map((w) => w.defId)).size).toBe(f.wishes.length);
      for (const w of f.wishes) {
        const def = CATALOG.wishes[w.defId];
        if (def.kind === 'talk') expect(w.other).toBeDefined();
        if (def.kind === 'skill') expect(w.skill).toBeDefined();
      }
    }
    expect(JSON.stringify(a.world.folks.map((f) => f.wishes))).toBe(JSON.stringify(b.world.folks.map((f) => f.wishes)));
  });

  it('desejos não mexem no resto da simulação (o RNG do mundo não anda)', () => {
    const sim = householdSim(5);
    const before = sim.world.rngState;
    const folk = sim.world.folks[0];
    rollWishes(sim.world, CATALOG, folk);
    think(sim.world, CATALOG, folk);
    expect(sim.world.rngState).toBe(before);
  });

  it('o temperamento puxa: quem tem muita Ordem quer arrumar a casa bem mais vezes', () => {
    const sim = householdSim(6);
    const folk = sim.world.folks[0];
    const count = (order: number) => {
      folk.temper = { order, outgoing: 5, pep: 5, wit: 5, warmth: 10 - order };
      folk.traits = [];
      let n = 0;
      for (let d = 0; d < 120; d++) {
        sim.world.tick = d * MINUTES_PER_DAY + 7 * 60;
        rollWishes(sim.world, CATALOG, folk);
        if (folk.wishes.some((w) => w.defId === 'tidyUp')) n++;
      }
      return n;
    };
    const neat = count(10);
    const messy = count(0);
    expect(neat).toBeGreaterThan(messy * 2);
  });

  it('cumprir um desejo dá diversão, ânimo, balão e aviso', () => {
    const sim = deskSim();
    const folk = sim.world.folks[0];
    folk.wishes = [{ id: 900, defId: 'learn', skill: 'logic', progress: 0, done: false }];
    folk.wishDay = Math.floor(sim.world.tick / MINUTES_PER_DAY);
    folk.needs.fun = 40;
    const it = interaction('desk', 'puzzles');
    for (let m = 0; m < CATALOG.wishes.learn.amount; m++) wishOnUse(sim.world, CATALOG, () => {}, folk, it);
    expect(folk.wishes[0].done).toBe(true);
    expect(folk.spark).toBe(1);
    expect(folk.needs.fun).toBeGreaterThan(50);
    expect(folk.thought?.kind).toBe('wish');
    // e de verdade, pela simulação: estudar até cumprir
    const s2 = deskSim();
    const f2 = s2.world.folks[0];
    f2.wishes = [{ id: 901, defId: 'learn', skill: 'logic', progress: 0, done: false }];
    f2.wishDay = Math.floor(s2.world.tick / MINUTES_PER_DAY);
    s2.dispatch({ type: 'queueUse', folkId: f2.id, objectId: deskId(s2), interactionId: 'puzzles' });
    run(s2, 60);
    expect(f2.wishes[0].done).toBe(true);
    expect(s2.world.log.some((l) => l.key === 'log.wishDone')).toBe(true);
  });

  it('desejo de conversa se cumpre com papo aceito com aquela pessoa; o de compra, comprando', () => {
    const sim = crowd([{ name: 'Ana', x: 2, y: 2 }, { name: 'Bia', x: 4, y: 2 }], { autonomy: false, relations: [{ a: 'Ana', b: 'Bia', friendship: 40 }] });
    const [ana, bia] = sim.world.folks;
    ana.wishes = [
      { id: 950, defId: 'chatWith', other: bia.id, progress: 0, done: false },
      { id: 951, defId: 'newDecor', progress: 0, done: false },
    ];
    ana.wishDay = 0;
    bia.wishDay = 0;
    for (let i = 0; i < 5 && !ana.wishes[0].done; i++) {
      sim.dispatch({ type: 'queueSocial', folkId: ana.id, otherId: bia.id, socialId: 'chat' });
      run(sim, 40);
      const rel = sim.world.relations[`${ana.id}>${bia.id}`];
      if (rel) rel.last = -999;
    }
    expect(ana.wishes[0].done).toBe(true);
    expect(sim.dispatch({ type: 'buy', defId: 'plant', x: 8, y: 6, rot: 0 })).toBe(true);
    expect(ana.wishes[1].done).toBe(true);
  });
});

describe('balões (bloco 6)', () => {
  it('necessidade baixa vira balão de vontade; quem ouve uma conversa mostra se gosta', () => {
    const sim = openField(8, 8, [], { x: 3, y: 3, needs: { hunger: 10 } });
    const folk = sim.world.folks[0];
    folk.autonomy = false;
    let saw = false;
    for (let m = 0; m < 4 * THINK_EVERY && !saw; m++) {
      sim.step();
      saw = thoughtOf(folk, sim.world.tick)?.kind === 'want';
    }
    expect(saw).toBe(true);
    expect(folk.thought?.icon).toBe('hunger');

    const talk = crowd([{ name: 'Ana', x: 2, y: 2 }, { name: 'Bia', x: 4, y: 2 }], { autonomy: false, relations: [{ a: 'Ana', b: 'Bia', friendship: 40 }] });
    const [ana, bia] = talk.world.folks;
    talk.dispatch({ type: 'queueSocial', folkId: ana.id, otherId: bia.id, socialId: 'joke' });
    let chat = null;
    for (let m = 0; m < 10 && !chat; m++) {
      talk.step();
      chat = thoughtOf(bia, talk.world.tick);
    }
    expect(chat?.kind).toBe('chat');
    expect(['yes', 'no']).toContain(chat?.icon);
    expect(chat?.other).toBe(ana.id);
  });

  it('bagunça por perto vira reclamação, mais para quem tem Ordem', () => {
    const tally = (order: number) => {
      const sim = openField(8, 8, [], { x: 3, y: 3 });
      const folk = sim.world.folks[0];
      folk.temper = { order, outgoing: 5, pep: 5, wit: 5, warmth: 10 - order };
      for (let i = 0; i < 4; i++) sim.world.mess.push({ id: 500 + i, kind: 'trash', x: 2 + i, y: 4, tick: 0, by: 0 });
      let n = 0;
      for (let k = 0; k < 200; k++) {
        sim.world.tick = k * 60;
        folk.thought = null;
        think(sim.world, CATALOG, folk);
        if (thoughtOf(folk, sim.world.tick)?.kind === 'mess') n++;
      }
      return n;
    };
    expect(tally(10)).toBeGreaterThan(tally(0));
    expect(tally(5)).toBeGreaterThan(20);
  });

  it('saudade de quem é querido e não aparece há dias', () => {
    const sim = householdSim(7);
    const folk = sim.world.folks[0];
    const friend = sim.world.neighbors.find((n) => !n.service)!;
    sim.world.relations[`${folk.id}>${friend.id}`] = {
      friendship: 70,
      romance: 0,
      respect: 10,
      dating: false,
      last: 0,
      tired: 0,
      memories: [],
    };
    sim.world.tick = 3 * MINUTES_PER_DAY;
    expect(missedOne(sim.world, folk)).toBe(friend.id);
    let missed = false;
    for (let k = 0; k < 200 && !missed; k++) {
      sim.world.tick += 7;
      folk.thought = null;
      for (const id of Object.keys(folk.needs) as (keyof Folk['needs'])[]) folk.needs[id] = 90;
      think(sim.world, CATALOG, folk);
      const th = thoughtOf(folk, sim.world.tick);
      missed = th?.kind === 'miss' && th.other === friend.id;
    }
    expect(missed).toBe(true);
  });

  it('balão mais importante não é coberto por um menor', () => {
    const sim = deskSim(LOW);
    const folk = sim.world.folks[0];
    sim.dispatch({ type: 'queueUse', folkId: folk.id, objectId: deskId(sim), interactionId: 'puzzles' });
    expect(folk.thought?.kind).toBe('refuse');
    think(sim.world, CATALOG, folk);
    expect(folk.thought?.kind).toBe('refuse');
  });
});

describe('save v11 (bloco 6)', () => {
  it('migra da v10: balão vazio, desejos sorteados no primeiro minuto, despertador ligado', () => {
    expect(SAVE_VERSION).toBeGreaterThanOrEqual(11);
    const world = createWorld(starterHouse(2));
    const raw = JSON.parse(JSON.stringify(world));
    for (const f of raw.folks) {
      for (const k of ['thought', 'wishes', 'wishDay', 'spark', 'inspired', 'alarm']) delete f[k];
    }
    const { world: back } = deserialize({ version: 10, savedAt: 1, world: raw }, { neighbors: NEIGHBORS, ties: NEIGHBOR_TIES, catalog: CATALOG });
    for (const f of back.folks) {
      expect(f.thought).toBeNull();
      expect(f.wishes).toEqual([]);
      expect(f.wishDay).toBe(-1);
      expect(f.spark).toBe(0);
      expect(f.inspired).toBe(0);
      expect(f.alarm).toBe(true);
    }
    const sim = new Sim(CATALOG, back);
    run(sim, 3);
    for (const f of sim.residents()) expect(f.wishes.length).toBeGreaterThan(0);
  });
});
