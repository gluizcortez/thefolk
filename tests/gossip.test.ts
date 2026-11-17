import { describe, expect, it } from 'vitest';
import { CATALOG } from '../src/data/catalog';
import {
  acceptChance,
  addMemory,
  availableSocials,
  createNews,
  dailyHearts,
  ensureRelation,
  learnNews,
  partnersOf,
  relationOf,
  reputationOf,
  romanticAct,
  scoreSocialOptions,
  setDating,
  spreadNews,
} from '../src/sim';
import type { Sim } from '../src/sim';
import { crowd, run } from './helpers';

const noLog = () => {};

function rel(sim: Sim, a: number, b: number, v: { friendship?: number; romance?: number; respect?: number }) {
  const r = ensureRelation(sim.world, a, b);
  Object.assign(r, v);
  return r;
}

describe('ciúme e traição', () => {
  it('quem vê o namorado num chamego com outra pessoa sente ciúme e pode terminar', () => {
    const sim = crowd(
      [
        { name: 'Ana', x: 1, y: 1 },
        { name: 'Beto', x: 2, y: 1 },
        { name: 'Caio', x: 4, y: 1, traits: ['ciumento'] },
      ],
      { autonomy: false },
    );
    const [ana, beto, caio] = sim.world.folks;
    rel(sim, ana.id, caio.id, { romance: 50, friendship: 40 });
    rel(sim, caio.id, ana.id, { romance: 45, friendship: 40 });
    setDating(sim.world, ana.id, caio.id, true);
    rel(sim, ana.id, beto.id, { romance: 50 });
    rel(sim, caio.id, beto.id, { friendship: 10 });
    const logs: string[] = [];
    romanticAct(sim.world, CATALOG, (k) => logs.push(k), ana.id, beto.id, [caio.id]);
    const view = relationOf(sim.world, caio.id, ana.id)!;
    expect(view.memories.some((m) => m.kind === 'cheatedOnMe')).toBe(true);
    expect(relationOf(sim.world, caio.id, beto.id)!.memories.some((m) => m.kind === 'rival')).toBe(true);
    expect(relationOf(sim.world, caio.id, beto.id)!.friendship).toBeLessThan(0);
    // ciumento: o romance despenca e o namoro acaba
    expect(view.dating).toBe(false);
    expect(logs).toContain('log.jealousSaw');
    expect(logs).toContain('log.breakUpCheated');
    expect(sim.world.news.some((n) => n.kind === 'cheated' && n.about === ana.id)).toBe(true);
  });

  it('quem não viu fica sabendo pela fofoca, e aí vem o ciúme', () => {
    const sim = crowd(
      [
        { name: 'Ana', x: 1, y: 1 },
        { name: 'Beto', x: 2, y: 1 },
        { name: 'Caio', x: 10, y: 6 },
        { name: 'Dani', x: 11, y: 6, traits: ['fofoqueiro'] },
      ],
      { autonomy: false },
    );
    const [ana, beto, caio, dani] = sim.world.folks;
    rel(sim, ana.id, caio.id, { romance: 70 });
    rel(sim, caio.id, ana.id, { romance: 70 });
    setDating(sim.world, ana.id, caio.id, true);
    romanticAct(sim.world, CATALOG, noLog, ana.id, beto.id, []);
    const news = sim.world.news.find((n) => n.kind === 'cheated')!;
    expect(news.knownBy).toEqual(expect.arrayContaining([ana.id, beto.id]));
    expect(news.knownBy).not.toContain(caio.id);
    // Dani soube por Beto e conta para Caio
    learnNews(sim.world, CATALOG, noLog, news, dani.id, 'heard', beto.id);
    const before = relationOf(sim.world, caio.id, ana.id)!.romance;
    learnNews(sim.world, CATALOG, noLog, news, caio.id, 'heard', dani.id);
    expect(relationOf(sim.world, caio.id, ana.id)!.romance).toBeLessThan(before);
    expect(relationOf(sim.world, caio.id, ana.id)!.memories.some((m) => m.kind === 'cheatedOnMe')).toBe(true);
    // a fama de Ana caiu a cada pessoa que ficou sabendo
    expect(reputationOf(sim.world, ana.id)).toBeLessThan(0);
  });

  it('quem namora firme resiste a flerte de outra pessoa', () => {
    const sim = crowd([{ x: 1, y: 1 }, { x: 2, y: 1 }, { x: 5, y: 1 }], { autonomy: false });
    const [a, b, c] = sim.world.folks;
    rel(sim, b.id, a.id, { friendship: 40, romance: 30 });
    const flirt = CATALOG.socials.flirt;
    const free = acceptChance(sim.world, CATALOG, a, b, flirt);
    rel(sim, b.id, c.id, { romance: 70 });
    rel(sim, c.id, b.id, { romance: 70 });
    setDating(sim.world, b.id, c.id, true);
    expect(acceptChance(sim.world, CATALOG, a, b, flirt)).toBeLessThan(free - 0.2);
  });
});

describe('término', () => {
  it('terminar o namoro pela conversa', () => {
    const sim = crowd([{ x: 1, y: 1 }, { x: 2, y: 1 }], { autonomy: false });
    const [a, b] = sim.world.folks;
    rel(sim, a.id, b.id, { romance: 60, friendship: 40 });
    rel(sim, b.id, a.id, { romance: 60, friendship: 40 });
    setDating(sim.world, a.id, b.id, true);
    expect(availableSocials(sim.world, CATALOG, a, b).some((d) => d.id === 'breakUp')).toBe(true);
    expect(sim.dispatch({ type: 'queueSocial', folkId: a.id, otherId: b.id, socialId: 'breakUp' })).toBe(true);
    run(sim, 30);
    expect(relationOf(sim.world, a.id, b.id)!.dating).toBe(false);
    expect(relationOf(sim.world, b.id, a.id)!.dating).toBe(false);
    expect(relationOf(sim.world, b.id, a.id)!.memories.some((m) => m.kind === 'gotDumped')).toBe(true);
    expect(relationOf(sim.world, b.id, a.id)!.romance).toBeLessThan(40);
    expect(sim.world.news.some((n) => n.kind === 'brokeUp')).toBe(true);
    expect(partnersOf(sim.world, a.id)).toEqual([]);
  });

  it('namoro que esfriou termina sozinho', () => {
    const sim = crowd([{ x: 1, y: 1 }, { x: 2, y: 1 }], { autonomy: false });
    const [a, b] = sim.world.folks;
    rel(sim, a.id, b.id, { romance: 5 });
    rel(sim, b.id, a.id, { romance: 50 });
    setDating(sim.world, a.id, b.id, true);
    const logs: string[] = [];
    dailyHearts(sim.world, CATALOG, (k) => logs.push(k));
    expect(relationOf(sim.world, a.id, b.id)!.dating).toBe(false);
    expect(logs).toContain('log.breakUpFaded');
    // quem terminou foi quem já não sentia nada
    expect(relationOf(sim.world, a.id, b.id)!.memories.some((m) => m.kind === 'brokeUp')).toBe(true);
  });
});

describe('fofoca e reputação', () => {
  it('a fofoca anda sozinha pela rede de conhecidos, de amigo em amigo', () => {
    const sim = crowd(
      [
        { name: 'Ana', x: 1, y: 1 },
        { name: 'Beto', x: 3, y: 1, traits: ['fofoqueiro'] },
        { name: 'Caio', x: 5, y: 1, traits: ['fofoqueiro'] },
        { name: 'Dani', x: 7, y: 1 },
        { name: 'Edu', x: 9, y: 1 },
      ],
      { autonomy: false },
    );
    const [ana, beto, caio, dani, edu] = sim.world.folks;
    rel(sim, beto.id, caio.id, { friendship: 50 });
    rel(sim, caio.id, dani.id, { friendship: 50 });
    rel(sim, dani.id, ana.id, { friendship: 30 });
    // Edu não conhece ninguém: nunca fica sabendo
    createNews(sim.world, CATALOG, noLog, 'fought', ana.id, 0, [beto.id]);
    const news = sim.world.news[0];
    for (let d = 0; d < 10; d++) spreadNews(sim.world, CATALOG, noLog);
    expect(news.knownBy).toContain(caio.id);
    expect(news.knownBy).toContain(dani.id);
    expect(news.knownBy).not.toContain(edu.id);
    // quem conhece Ana passou a gostar menos dela
    expect(relationOf(sim.world, dani.id, ana.id)!.friendship).toBeLessThan(30);
    expect(reputationOf(sim.world, ana.id)).toBeLessThan(0);
  });

  it('fofocar no papo passa a notícia adiante', () => {
    const sim = crowd([{ x: 1, y: 1 }, { x: 2, y: 1 }, { x: 9, y: 6 }], { autonomy: false });
    const [a, b, c] = sim.world.folks;
    rel(sim, a.id, b.id, { friendship: 60 });
    rel(sim, b.id, a.id, { friendship: 60 });
    rel(sim, b.id, c.id, { friendship: 10 });
    createNews(sim.world, CATALOG, noLog, 'fought', c.id, 0, [a.id]);
    expect(sim.dispatch({ type: 'queueSocial', folkId: a.id, otherId: b.id, socialId: 'gossip' })).toBe(true);
    run(sim, 30);
    const out = sim.drainOutcomes().find((o) => o.socialId === 'gossip')!;
    expect(out.accepted).toBe(true);
    expect(sim.world.news[0].knownBy).toContain(b.id);
    expect(sim.world.log.some((l) => l.key === 'log.heardGossip')).toBe(true);
  });

  it('ninguém espalha podre de si mesmo, nem de quem ama muito', () => {
    const sim = crowd([{ x: 1, y: 1 }, { x: 2, y: 1 }, { x: 9, y: 6 }], { autonomy: false });
    const [a, b, c] = sim.world.folks;
    createNews(sim.world, CATALOG, noLog, 'fought', a.id, 0);
    rel(sim, a.id, c.id, { friendship: 80 });
    createNews(sim.world, CATALOG, noLog, 'fought', c.id, 0, [a.id]);
    for (let d = 0; d < 6; d++) {
      rel(sim, a.id, b.id, { friendship: 60 });
      spreadNews(sim.world, CATALOG, noLog);
    }
    expect(sim.world.news.every((n) => !n.knownBy.includes(b.id))).toBe(true);
  });

  it('boa fama abre portas; má fama fecha', () => {
    const sim = crowd([{ x: 1, y: 1 }, { x: 2, y: 1 }], { autonomy: false });
    const [a, b] = sim.world.folks;
    rel(sim, b.id, a.id, { friendship: 0 });
    const chat = CATALOG.socials.shopTalk;
    sim.world.reputation[String(a.id)] = 60;
    const famous = acceptChance(sim.world, CATALOG, a, b, chat);
    sim.world.reputation[String(a.id)] = -60;
    const infamous = acceptChance(sim.world, CATALOG, a, b, chat);
    expect(famous).toBeGreaterThan(infamous + 0.25);
  });
});

describe('lembranças guiam o comportamento', () => {
  it('com mágoa, o folk evita papo amigável e só sobra pedir desculpas ou brigar', () => {
    const sim = crowd([{ x: 1, y: 1 }, { x: 3, y: 1 }], { autonomy: false });
    const [a, b] = sim.world.folks;
    rel(sim, a.id, b.id, { friendship: 10 });
    rel(sim, b.id, a.id, { friendship: 10 });
    sim.world.relations[`${a.id}>${b.id}`].last = 0;
    a.needs.social = 10;
    const friendly = () =>
      scoreSocialOptions(sim.world, CATALOG, a, sim.getNav()).filter(
        (o) => CATALOG.socials[o.socialId!].category === 'friendly',
      ).length;
    expect(friendly()).toBeGreaterThan(0);
    addMemory(sim.world, CATALOG, a.id, b.id, 'cheatedOnMe');
    addMemory(sim.world, CATALOG, a.id, b.id, 'fought');
    expect(friendly()).toBe(0);
    const mean = scoreSocialOptions(sim.world, CATALOG, a, sim.getNav()).filter(
      (o) => CATALOG.socials[o.socialId!].category === 'mean',
    );
    expect(mean.length).toBeGreaterThan(0);
  });

  it('pedir desculpas só aparece para quem guarda mágoa, e a lembrança boa compensa', () => {
    const sim = crowd([{ x: 1, y: 1 }, { x: 2, y: 1 }], { autonomy: false });
    const [a, b] = sim.world.folks;
    rel(sim, a.id, b.id, { friendship: 10 });
    rel(sim, b.id, a.id, { friendship: 30 });
    expect(availableSocials(sim.world, CATALOG, a, b).some((d) => d.id === 'apologize')).toBe(false);
    addMemory(sim.world, CATALOG, b.id, a.id, 'insulted');
    expect(availableSocials(sim.world, CATALOG, a, b).some((d) => d.id === 'apologize')).toBe(true);
    let accepted = false;
    for (let i = 0; i < 6 && !accepted; i++) {
      sim.dispatch({ type: 'queueSocial', folkId: a.id, otherId: b.id, socialId: 'apologize' });
      run(sim, 20);
      accepted = sim.drainOutcomes().some((o) => o.socialId === 'apologize' && o.accepted);
    }
    expect(accepted).toBe(true);
    expect(relationOf(sim.world, b.id, a.id)!.memories.some((m) => m.kind === 'apologized')).toBe(true);
    expect(availableSocials(sim.world, CATALOG, a, b).some((d) => d.id === 'apologize')).toBe(false);
  });
});
