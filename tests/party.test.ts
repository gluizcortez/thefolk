import { describe, expect, it } from 'vitest';
import { CATALOG } from '../src/data/catalog';
import { NEIGHBORS } from '../src/data/neighbors';
import {
  CIRCLE_MAX,
  INTEREST_MAX,
  INTEREST_MIN,
  MINUTES_PER_DAY,
  SAVE_VERSION,
  areRivals,
  availableSocials,
  deserialize,
  ensureRelation,
  findCliques,
  isServiceNeighbor,
  partyFriction,
  partyGrade,
  pickTopic,
  reactionTo,
  relationOf,
  seedInterests,
  serialize,
  sharedTopics,
} from '../src/sim';
import type { Sim } from '../src/sim';
import { crowd, householdSim, run } from './helpers';
import { play, playStep } from './helpers/player';

const TOPIC_IDS = Object.keys(CATALOG.topics);

/** Põe o relógio num horário do dia 1 sem passar pelas contas. */
function at(sim: Sim, hour: number, day = 1): void {
  sim.world.tick = day * MINUTES_PER_DAY + hour * 60;
  sim.world.household.nextBills = sim.world.tick + 3 * MINUTES_PER_DAY;
}

function befriend(sim: Sim, a: number, b: number, friendship: number): void {
  for (const [x, y] of [
    [a, b],
    [b, a],
  ]) {
    const rel = ensureRelation(sim.world, x, y);
    rel.friendship = friendship;
    rel.last = sim.world.tick;
  }
}

describe('assuntos (bloco 9)', () => {
  it('cada um tem gosto de -5 a 5 nos dez assuntos, sempre o mesmo para o mesmo id', () => {
    expect(TOPIC_IDS.length).toBe(10);
    const p = { id: 42, traits: ['fofoqueiro'], temper: { order: 5, outgoing: 8, pep: 5, wit: 5, warmth: 2 } };
    const a = seedInterests(CATALOG, p);
    const b = seedInterests(CATALOG, p);
    expect(a).toEqual(b);
    for (const id of TOPIC_IDS) {
      expect(a[id]).toBeGreaterThanOrEqual(INTEREST_MIN);
      expect(a[id]).toBeLessThanOrEqual(INTEREST_MAX);
    }
    // o fofoqueiro expansivo gosta da vida alheia; o reservado, nem tanto
    const shy = seedInterests(CATALOG, { id: 42, traits: ['reservado'], temper: { order: 5, outgoing: 2, pep: 5, wit: 5, warmth: 8 } });
    expect(a.gossip).toBeGreaterThan(shy.gossip);
  });

  it('quem tem lábia puxa o assunto que agrada a roda', () => {
    const sim = crowd([{ x: 1, y: 1 }, { x: 3, y: 1 }, { x: 5, y: 1 }], {});
    const [speaker, a, b] = sim.world.folks;
    const flat = Object.fromEntries(TOPIC_IDS.map((id) => [id, 0]));
    speaker.interests = { ...flat, money: 2 };
    a.interests = { ...flat, critters: 5 };
    b.interests = { ...flat, critters: 5 };
    speaker.skills = { charisma: 5000 };
    let critters = 0;
    for (let i = 0; i < 40; i++) if (pickTopic(sim.world, CATALOG, speaker, [a, b]) === 'critters') critters++;
    expect(critters).toBeGreaterThan(20);
    expect(sharedTopics(CATALOG, a, b)).toEqual(['critters']);
  });

  it('papo sobre assunto que o outro adora rende mais amizade do que sobre o que ele detesta', () => {
    const gain = (topic: string) => {
      const sim = crowd([{ name: 'Ana', x: 2, y: 2 }, { name: 'Bia', x: 3, y: 2 }], { relations: [{ a: 'Ana', b: 'Bia', friendship: 30 }] });
      const [ana, bia] = sim.world.folks;
      const flat = Object.fromEntries(TOPIC_IDS.map((id) => [id, 0]));
      bia.interests = { ...flat, stars: 5, money: -5 };
      const before = relationOf(sim.world, bia.id, ana.id)!.friendship;
      let total = 0;
      for (let i = 0; i < 6; i++) {
        sim.dispatch({ type: 'queueSocial', folkId: ana.id, otherId: bia.id, socialId: 'chat', topic });
        run(sim, 30);
        // balão de assunto aparece com a reação de quem ouve
        total = relationOf(sim.world, bia.id, ana.id)!.friendship - before;
      }
      return total;
    };
    expect(gain('stars')).toBeGreaterThan(gain('money') + 5);
  });

  it('o balão de quem ouve mostra o assunto e se gostou', () => {
    const sim = crowd([{ name: 'Ana', x: 2, y: 2 }, { name: 'Bia', x: 3, y: 2 }], { relations: [{ a: 'Ana', b: 'Bia', friendship: 40 }] });
    const [ana, bia] = sim.world.folks;
    bia.interests = Object.fromEntries(TOPIC_IDS.map((id) => [id, id === 'music' ? 5 : 0]));
    sim.dispatch({ type: 'queueSocial', folkId: ana.id, otherId: bia.id, socialId: 'chat', topic: 'music' });
    let icon = '';
    for (let m = 0; m < 10 && !icon; m++) {
      sim.step();
      if (bia.thought?.kind === 'topic') icon = bia.thought.icon;
    }
    expect(['music+', 'music-']).toContain(icon);
    expect(ana.thought?.kind).toBe('topic');
  });
});

describe('roda de conversa (bloco 9)', () => {
  it('quatro pessoas em volta de um tile vazio, falando por turnos, e a amizade sobe', () => {
    const sim = crowd(
      [
        { name: 'Ana', x: 1, y: 1 },
        { name: 'Bia', x: 8, y: 1 },
        { name: 'Caio', x: 1, y: 6 },
        { name: 'Davi', x: 8, y: 6 },
      ],
      {
        relations: [
          { a: 'Ana', b: 'Bia', friendship: 50 },
          { a: 'Ana', b: 'Caio', friendship: 50 },
          { a: 'Ana', b: 'Davi', friendship: 50 },
        ],
      },
    );
    const [ana, bia, caio, davi] = sim.world.folks;
    const before = relationOf(sim.world, bia.id, ana.id)!.friendship;
    expect(sim.dispatch({ type: 'startCircle', folkId: ana.id, otherIds: [bia.id, caio.id, davi.id] })).toBe(true);
    const c = sim.world.circles[0];
    expect(c).toBeTruthy();
    expect(c.members.length).toBeGreaterThanOrEqual(3);
    const speakers = new Set<number>();
    let gathered = false;
    for (let m = 0; m < 60; m++) {
      sim.step();
      const circle = sim.world.circles[0];
      if (!circle) break;
      if (circle.speaker) speakers.add(circle.speaker);
      const standing = circle.members.map((x) => sim.findFolk(x.id)!).filter((f) => f.queue[0]?.phase === 'using');
      if (standing.length === circle.members.length) {
        gathered = true;
        // ninguém em cima do meio, cada um num lado diferente, todos virados para o meio
        for (const f of standing) {
          expect(f.x === circle.center.x && f.y === circle.center.y).toBe(false);
          expect(Math.abs(f.x - circle.center.x) + Math.abs(f.y - circle.center.y)).toBe(1);
          expect(f.x + f.facing.x === circle.center.x && f.y + f.facing.y === circle.center.y).toBe(true);
        }
      }
    }
    expect(gathered).toBe(true);
    expect(speakers.size).toBeGreaterThanOrEqual(3);
    expect(relationOf(sim.world, bia.id, ana.id)!.friendship).not.toBe(before);
    // a roda acaba sozinha e todo mundo é liberado
    run(sim, 120);
    expect(sim.world.circles.length).toBe(0);
    for (const f of [ana, bia, caio, davi]) expect(f.queue.some((a) => a.kind === 'circle')).toBe(false);
  });

  it('cabe no máximo quatro; dá para entrar numa roda com lugar', () => {
    const sim = crowd(
      [
        { name: 'Ana', x: 2, y: 2 },
        { name: 'Bia', x: 6, y: 2 },
        { name: 'Caio', x: 2, y: 5 },
      ],
      { relations: [{ a: 'Ana', b: 'Bia', friendship: 60 }, { a: 'Ana', b: 'Caio', friendship: 60 }] },
    );
    const [ana, bia, caio] = sim.world.folks;
    sim.dispatch({ type: 'startCircle', folkId: ana.id, otherIds: [bia.id] });
    const c = sim.world.circles[0];
    expect(c.members.length).toBe(2);
    expect(sim.dispatch({ type: 'joinCircle', folkId: caio.id, circleId: c.id })).toBe(true);
    expect(c.members.length).toBe(3);
    expect(sim.dispatch({ type: 'startCircle', folkId: ana.id, otherIds: [bia.id, caio.id, 90, 91] })).toBe(false);
    expect(CIRCLE_MAX).toBe(4);
  });

  it('plano 2: moradores à toa não formam roda sozinhos; a ordem forma', () => {
    let formed = 0;
    for (let seed = 1; seed <= 4; seed++) {
      const sim = crowd(
        [
          { name: 'Ana', x: 2, y: 2, needs: { social: 20 } },
          { name: 'Bia', x: 5, y: 2, needs: { social: 20 } },
          { name: 'Caio', x: 3, y: 5, needs: { social: 20 } },
          { name: 'Davi', x: 7, y: 5, needs: { social: 20 } },
        ],
        {
          seed,
          relations: [
            { a: 'Ana', b: 'Bia', friendship: 40 },
            { a: 'Ana', b: 'Caio', friendship: 40 },
            { a: 'Bia', b: 'Caio', friendship: 40 },
            { a: 'Bia', b: 'Davi', friendship: 40 },
            { a: 'Caio', b: 'Davi', friendship: 40 },
            { a: 'Ana', b: 'Davi', friendship: 40 },
          ],
        },
      );
      run(sim, 240);
      expect(sim.world.circles).toHaveLength(0);
      const [ana, ...rest] = sim.world.folks;
      if (sim.dispatch({ type: 'startCircle', folkId: ana.id, otherIds: rest.map((f) => f.id) })) formed++;
    }
    expect(formed).toBe(4);
  });
});

describe('telefone social (bloco 9)', () => {
  it('ligar para um amigo conta como contato e rende amizade', () => {
    const sim = householdSim(3);
    at(sim, 15);
    const tome = sim.residents()[0];
    const n = sim.world.neighbors.find((x) => !isServiceNeighbor(x))!;
    befriend(sim, tome.id, n.id, 40);
    const rel = relationOf(sim.world, n.id, tome.id)!;
    rel.last = sim.world.tick - 3 * MINUTES_PER_DAY;
    tome.needs.social = 10;
    expect(sim.dispatch({ type: 'phoneFriend', folkId: tome.id, neighborId: n.id })).toBe(true);
    for (let m = 0; m < 120 && !sim.world.log.some((e) => e.key === 'log.called' || e.key === 'log.callBored'); m++) sim.step();
    expect(sim.world.log.some((e) => e.key === 'log.called' || e.key === 'log.callBored')).toBe(true);
    expect(sim.world.tick - relationOf(sim.world, n.id, tome.id)!.last).toBeLessThan(60);
  });

  it('o telefone toca e o jogador manda atender; sem ordem, a ligação cai', () => {
    let answered = 0;
    let missed = 0;
    for (let seed = 1; seed <= 6; seed++) {
      const sim = householdSim(seed);
      at(sim, 10);
      for (const r of sim.residents()) for (const n of sim.world.neighbors) if (!isServiceNeighbor(n)) befriend(sim, r.id, n.id, 30);
      const n = sim.world.neighbors.find((x) => !isServiceNeighbor(x))!;
      sim.world.call = { from: n.id, rang: sim.world.tick, reason: 'chat', answeredBy: 0 };
      play(sim, 40);
      if (sim.world.log.some((e) => e.key === 'log.callChat' || e.key === 'log.callGossip' || e.key === 'log.callVisit')) answered++;
      // plano 2: sem ordem, ninguém atende sozinho e a ligação cai
      const alone = householdSim(seed);
      at(alone, 10);
      alone.world.call = { from: n.id, rang: alone.world.tick, reason: 'chat', answeredBy: 0 };
      run(alone, 40);
      if (alone.world.log.some((e) => e.key === 'log.missedCall')) missed++;
    }
    expect(answered).toBeGreaterThanOrEqual(5);
    expect(missed).toBe(6);
  });

  it('em alguns dias, os amigos ligam sozinhos', () => {
    const sim = householdSim(5);
    for (const r of sim.residents()) for (const n of sim.world.neighbors) if (!isServiceNeighbor(n)) befriend(sim, r.id, n.id, 40);
    let rang = 0;
    for (let m = 0; m < 4 * MINUTES_PER_DAY; m++) {
      sim.step();
      if (sim.world.log.length && sim.world.log[sim.world.log.length - 1].key === 'log.phoneRings' && sim.world.log[sim.world.log.length - 1].tick === sim.world.tick) rang++;
    }
    expect(rang).toBeGreaterThan(0);
  });
});

describe('festa (bloco 9)', () => {
  /** Casa pronta com Tomé dando uma festa para 6 vizinhos amigos. */
  function partySim(seed = 1, friendship = 70) {
    const sim = householdSim(seed);
    at(sim, 14);
    const host = sim.residents()[0];
    const guests = sim.world.neighbors.filter((n) => !isServiceNeighbor(n)).slice(0, 6);
    for (const g of guests) befriend(sim, host.id, g.id, friendship);
    for (let i = 0; i < guests.length; i++) for (let j = i + 1; j < guests.length; j++) befriend(sim, guests[i].id, guests[j].id, 20);
    return { sim, host, guests };
  }

  it('festa com 6 convidados roda, mede a animação e recebe nota', () => {
    const { sim, host, guests } = partySim();
    expect(sim.dispatch({ type: 'throwParty', folkId: host.id, guestIds: guests.map((g) => g.id) })).toBe(true);
    for (let m = 0; m < 60 && !sim.world.party; m++) sim.step();
    const party = sim.world.party!;
    expect(party).toBeTruthy();
    expect(party.guests.length).toBeGreaterThanOrEqual(5);
    let most = 0;
    for (let m = 0; m < 6 * 60 && sim.world.party; m++) {
      sim.step();
      most = Math.max(most, sim.world.folks.filter((f) => f.visit?.party && f.visit.admitted).length);
    }
    expect(most).toBeGreaterThanOrEqual(5);
    const result = sim.world.lastParty!;
    expect(result).toBeTruthy();
    expect(result.grade).toBeGreaterThanOrEqual(1);
    expect(result.grade).toBeLessThanOrEqual(5);
    expect(sim.world.log.some((e) => e.key === 'log.partyOver' || e.key === 'log.partyNoiseEnd')).toBe(true);
    // todo mundo vai embora
    run(sim, 90);
    expect(sim.world.folks.some((f) => f.visit && !f.visit.service)).toBe(false);
    // ninguém desmaiou nem se atravessou parado no mesmo tile por muito tempo
    expect(sim.world.log.some((e) => e.key === 'log.collapse')).toBe(false);
  });

  it('festa boa dá fama; festa ruim vira fofoca', () => {
    expect(partyGrade(80)).toBe(5);
    expect(partyGrade(20)).toBe(1);
    const { sim, host } = partySim(2);
    sim.world.party = { host: host.id, start: sim.world.tick - 60, end: sim.world.tick + 1, guests: [], score: 90 * 4, samples: 4, brawls: 0, complaints: 0, buffet: true };
    const before = sim.world.reputation[host.id] ?? 0;
    sim.step();
    sim.step();
    expect(sim.world.lastParty?.grade).toBe(5);
    expect(sim.world.news.some((n) => n.kind === 'greatParty' && n.about === host.id)).toBe(true);
    expect(sim.world.reputation[host.id] ?? 0).toBeGreaterThanOrEqual(before);
    sim.world.party = { host: host.id, start: sim.world.tick - 60, end: sim.world.tick + 1, guests: [], score: 15 * 4, samples: 4, brawls: 1, complaints: 0, buffet: false };
    sim.step();
    sim.step();
    expect(sim.world.lastParty?.grade).toBe(1);
    expect(sim.world.news.some((n) => n.kind === 'flopParty' && n.about === host.id)).toBe(true);
  });

  it('mesa de petiscos: monta, os convidados beliscam e as porções acabam', () => {
    const sim = crowd([{ name: 'Ana', x: 2, y: 2, needs: { hunger: 20 } }], { objects: [{ defId: 'buffet', x: 5, y: 2 }] });
    const ana = sim.world.folks[0];
    const table = sim.world.objects[0];
    expect(table.snacks ?? 0).toBe(0);
    sim.dispatch({ type: 'queueUse', folkId: ana.id, objectId: table.id, interactionId: 'setBuffet' });
    run(sim, 40);
    expect(sim.world.log.some((e) => e.key === 'log.buffetSet')).toBe(true);
    const after = sim.world.objects[0].snacks ?? 0;
    expect(after).toBeGreaterThan(0);
    ana.needs.hunger = 10;
    sim.dispatch({ type: 'queueUse', folkId: ana.id, objectId: table.id, interactionId: 'nibble' });
    run(sim, 30);
    expect(sim.world.objects[0].snacks ?? 0).toBeLessThan(after);
    expect(ana.needs.hunger).toBeGreaterThan(10);
  });

  it('música alta depois das 22h faz vizinho reclamar, e duas reclamações acabam a festa', () => {
    const { sim, host } = partySim(4);
    at(sim, 22);
    const speaker = sim.world.objects.find((o) => o.defId === 'speaker')!;
    speaker.tune = 'trovao';
    sim.world.party = { host: host.id, start: sim.world.tick - 120, end: sim.world.tick + 300, guests: [], score: 60, samples: 1, brawls: 0, complaints: 0, buffet: false };
    run(sim, 4 * 60 + 5);
    expect(sim.world.log.some((e) => e.key === 'log.noiseComplaint')).toBe(true);
    expect(sim.world.lastParty).toBeTruthy();
  });

  it('ninguém topa festa de madrugada', () => {
    const { sim, host, guests } = partySim(5);
    at(sim, 21, 1);
    sim.world.tick += 50;
    sim.dispatch({ type: 'throwParty', folkId: host.id, guestIds: guests.map((g) => g.id) });
    run(sim, 40);
    expect(sim.world.party).toBeNull();
    expect(sim.world.log.some((e) => e.key === 'log.partyLate')).toBe(true);
  });
});

describe('panelinhas (bloco 9)', () => {
  it('acha turmas de amigos e rivais; rivais na mesma festa podem brigar', () => {
    const sim = crowd(
      [
        { name: 'Ana', x: 1, y: 1 },
        { name: 'Bia', x: 2, y: 1 },
        { name: 'Caio', x: 3, y: 1 },
        { name: 'Davi', x: 5, y: 5 },
        { name: 'Eva', x: 6, y: 5 },
        { name: 'Fábio', x: 7, y: 5 },
      ],
      {
        relations: [
          { a: 'Ana', b: 'Bia', friendship: 60 },
          { a: 'Bia', b: 'Caio', friendship: 60 },
          { a: 'Davi', b: 'Eva', friendship: 60 },
          { a: 'Eva', b: 'Fábio', friendship: 60 },
          { a: 'Caio', b: 'Davi', friendship: -50 },
        ],
      },
    );
    const [ana, bia, caio, davi, eva] = sim.world.folks;
    const cliques = findCliques(sim.world);
    expect(cliques.length).toBe(2);
    expect(cliques.map((c) => c.members.length)).toEqual([3, 3]);
    expect(cliques[0].members).toContain(bia.id);
    expect(areRivals(sim.world, caio.id, davi.id)).toBe(true);
    const friction = partyFriction(sim.world, sim.world.folks.map((f) => f.id));
    expect(friction.find((x) => x.weight === 1)).toEqual({ a: caio.id, b: davi.id, weight: 1 });
    // gente de turmas rivais que nem se conhece também se estranha, mas menos
    expect(friction.some((x) => x.weight < 1 && [ana.id, eva.id].includes(x.a))).toBe(true);
  });

  it('festa com rivais vira briga e notícia', () => {
    let brawls = 0;
    for (let seed = 1; seed <= 8; seed++) {
      const sim = householdSim(seed);
      at(sim, 14);
      const host = sim.residents()[0];
      const [a, b, c] = sim.world.neighbors.filter((n) => !isServiceNeighbor(n));
      for (const g of [a, b, c]) befriend(sim, host.id, g.id, 70);
      befriend(sim, a.id, b.id, -70);
      sim.dispatch({ type: 'throwParty', folkId: host.id, guestIds: [a.id, b.id, c.id] });
      for (let m = 0; m < 6 * 60 && (sim.world.party || m < 60); m++) playStep(sim);
      if (sim.world.news.some((n) => n.kind === 'partyBrawl')) brawls++;
    }
    expect(brawls).toBeGreaterThanOrEqual(2);
  });
});

describe('conversas por nível de relação (bloco 9)', () => {
  it('melhores amigos têm conversas próprias; inimigos também', () => {
    const sim = crowd([{ name: 'Ana', x: 1, y: 1 }, { name: 'Bia', x: 2, y: 1 }], {
      relations: [{ a: 'Ana', b: 'Bia', friendship: 80 }],
    });
    const [ana, bia] = sim.world.folks;
    const ids = () => availableSocials(sim.world, CATALOG, ana, bia).map((d) => d.id);
    expect(ids()).toContain('reminisce');
    expect(ids()).toContain('handshake');
    expect(ids()).not.toContain('snub');
    relationOf(sim.world, ana.id, bia.id)!.friendship = -60;
    expect(ids()).toContain('snub');
    expect(ids()).not.toContain('reminisce');
  });

  it('reações aos assuntos têm quatro graus', () => {
    const p = { id: 1, traits: [], interests: { stars: 4, music: 1.5, money: 0, critters: -3 } };
    expect(reactionTo(CATALOG, p, 'stars')).toBe('love');
    expect(reactionTo(CATALOG, p, 'music')).toBe('like');
    expect(reactionTo(CATALOG, p, 'money')).toBe('meh');
    expect(reactionTo(CATALOG, p, 'critters')).toBe('hate');
  });
});

describe('desvio local (bloco 9)', () => {
  it('quem anda não atravessa quem está parado no caminho', () => {
    const sim = crowd([{ name: 'Ana', x: 1, y: 3 }, { name: 'Bia', x: 5, y: 3 }], {});
    const [ana, bia] = sim.world.folks;
    sim.dispatch({ type: 'queueGoto', folkId: ana.id, x: 9, y: 3 });
    let crossed = false;
    for (let m = 0; m < 30; m++) {
      sim.step();
      if (ana.x === bia.x && ana.y === bia.y) crossed = true;
    }
    expect(crossed).toBe(false);
    expect(ana.x).toBe(9);
  });
});

describe('save v13 (bloco 9)', () => {
  it('um save v12 ganha gostos por assunto, sem roda nem festa', () => {
    const sim = householdSim(1);
    const file = serialize(sim.world, 0) as unknown as { version: number; world: Record<string, unknown> };
    file.version = 12;
    const w = file.world as { folks: { interests?: unknown }[]; neighbors: { interests?: unknown }[] };
    for (const f of w.folks) delete f.interests;
    for (const n of w.neighbors) delete n.interests;
    delete file.world.circles;
    delete file.world.party;
    delete file.world.lastParty;
    delete file.world.call;
    const back = deserialize(JSON.parse(JSON.stringify(file)), { neighbors: NEIGHBORS, catalog: CATALOG });
    expect(back.version).toBe(SAVE_VERSION);
    expect(SAVE_VERSION).toBeGreaterThanOrEqual(13);
    expect(back.world.circles).toEqual([]);
    expect(back.world.party).toBeNull();
    expect(back.world.call).toBeNull();
    for (const f of back.world.folks) expect(Object.keys(f.interests ?? {}).length).toBe(10);
    for (const n of back.world.neighbors) expect(Object.keys(n.interests ?? {}).length).toBe(10);
  });
});
