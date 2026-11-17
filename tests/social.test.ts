import { describe, expect, it } from 'vitest';
import { CATALOG } from '../src/data/catalog';
import { NEIGHBORS } from '../src/data/neighbors';
import {
  acceptChance,
  affinity,
  applyDelta,
  availableSocials,
  coolRelations,
  SAVE_VERSION,
  deserialize,
  friendshipLabel,
  relationOf,
  scoreOptions,
  serialize,
} from '../src/sim';
import { crowd, householdSim, run } from './helpers';

const ids = (sim: ReturnType<typeof crowd>) => sim.world.folks.map((f) => f.id);

describe('relações', () => {
  it('são dirigidas: A pode gostar de B sem volta', () => {
    const sim = crowd([{ x: 1, y: 1 }, { x: 3, y: 1 }], { autonomy: false });
    const [a, b] = sim.world.folks;
    applyDelta(sim.world, CATALOG, a, b, { friendship: 10 });
    expect(relationOf(sim.world, a.id, b.id)!.friendship).toBeGreaterThan(5);
    expect(relationOf(sim.world, b.id, a.id)!.friendship).toBe(0);
  });

  it('ficam entre -100 e 100 e sobem cada vez mais devagar', () => {
    const sim = crowd([{ x: 1, y: 1 }, { x: 3, y: 1 }], { autonomy: false });
    const [a, b] = sim.world.folks;
    const first = applyDelta(sim.world, CATALOG, a, b, { friendship: 10 }).friendship!;
    relationOf(sim.world, a.id, b.id)!.friendship = 80;
    relationOf(sim.world, a.id, b.id)!.tired = 0;
    const late = applyDelta(sim.world, CATALOG, a, b, { friendship: 10 }).friendship!;
    expect(late).toBeLessThan(first / 2);
    for (let i = 0; i < 50; i++) applyDelta(sim.world, CATALOG, a, b, { friendship: -40 });
    expect(relationOf(sim.world, a.id, b.id)!.friendship).toBe(-100);
  });

  it('traços dão afinidade ou atrito', () => {
    expect(affinity(CATALOG, { traits: ['tagarela'] }, { traits: ['brincalhao'] })).toBeGreaterThan(0);
    expect(affinity(CATALOG, { traits: ['tagarela'] }, { traits: ['reservado'] })).toBeLessThan(0);
    // atrito faz a mesma conversa render menos
    const sim = crowd(
      [
        { x: 1, y: 1, traits: ['reservado'] },
        { x: 3, y: 1, traits: ['tagarela'] },
        { x: 5, y: 1, traits: ['caseiro'] },
      ],
      { autonomy: false },
    );
    const [a, chatty, homey] = sim.world.folks;
    const bad = applyDelta(sim.world, CATALOG, a, chatty, { friendship: 5 }).friendship!;
    const good = applyDelta(sim.world, CATALOG, a, homey, { friendship: 5 }).friendship!;
    expect(good).toBeGreaterThan(bad);
  });

  it('esfriam sem contato, mas o respeito fica', () => {
    const sim = crowd([{ x: 1, y: 1 }, { x: 3, y: 1 }], { autonomy: false });
    const [a, b] = sim.world.folks;
    applyDelta(sim.world, CATALOG, a, b, { friendship: 40, romance: 30, respect: 20 });
    const rel = relationOf(sim.world, a.id, b.id)!;
    const before = { ...rel };
    sim.world.tick += 3 * 1440;
    coolRelations(sim.world);
    expect(rel.friendship).toBeLessThan(before.friendship);
    expect(rel.romance).toBeLessThan(before.romance);
    expect(rel.respect).toBe(before.respect);
  });

  it('rótulos seguem a amizade', () => {
    expect(friendshipLabel(undefined)).toBe('rel.stranger');
    const sim = crowd([{ x: 1, y: 1 }, { x: 3, y: 1 }], { relations: [{ a: 'Pessoa 1', b: 'Pessoa 2', friendship: 80 }] });
    const [a, b] = ids(sim);
    expect(friendshipLabel(relationOf(sim.world, a, b))).toBe('rel.bestFriend');
  });
});

describe('interações sociais', () => {
  it('quem não se conhece só pode cumprimentar', () => {
    const sim = crowd([{ x: 1, y: 1 }, { x: 3, y: 1 }], { autonomy: false });
    const [a, b] = sim.world.folks;
    expect(availableSocials(sim.world, CATALOG, a, b).map((s) => s.id)).toEqual(['greet']);
  });

  it('o menu abre conforme a relação: abraço com amizade, beijo com romance', () => {
    const sim = crowd([{ x: 1, y: 1 }, { x: 3, y: 1 }], {
      relations: [{ a: 'Pessoa 1', b: 'Pessoa 2', friendship: 45, romance: 45 }],
      autonomy: false,
    });
    const [a, b] = sim.world.folks;
    const list = availableSocials(sim.world, CATALOG, a, b).map((s) => s.id);
    expect(list).toContain('hug');
    expect(list).toContain('kiss');
    expect(list).not.toContain('greet');
    expect(list).not.toContain('askOut'); // precisa de romance 60
    expect(sim.dispatch({ type: 'queueSocial', folkId: a.id, otherId: b.id, socialId: 'askOut' })).toBe(false);
  });

  it('pela fila: anda até o outro, conversam e a amizade e o social sobem', () => {
    const sim = crowd([{ x: 1, y: 1, needs: { social: 30 } }, { x: 6, y: 1, needs: { social: 30 } }], {
      relations: [{ a: 'Pessoa 1', b: 'Pessoa 2', friendship: 20 }],
      autonomy: false,
    });
    const [a, b] = sim.world.folks;
    expect(sim.dispatch({ type: 'queueSocial', folkId: a.id, otherId: b.id, socialId: 'chat' })).toBe(true);
    run(sim, 3);
    // o outro para e espera
    expect(b.queue[0]?.kind).toBe('listen');
    run(sim, 60);
    expect(a.queue).toHaveLength(0);
    expect(b.queue).toHaveLength(0);
    expect(Math.abs(a.x - b.x) + Math.abs(a.y - b.y)).toBe(1);
    expect(a.needs.social).toBeGreaterThan(30);
    expect(b.needs.social).toBeGreaterThan(30);
    const ab = relationOf(sim.world, a.id, b.id)!.friendship;
    const ba = relationOf(sim.world, b.id, a.id)!.friendship;
    // topou (sobe) ou recusou (cai): de um jeito ou de outro, mudou
    expect(ab).not.toBe(20);
    expect(ba).not.toBe(20);
  });

  it('cumprimentar faz os dois se conhecerem e guarda a lembrança', () => {
    const sim = crowd([{ x: 1, y: 1 }, { x: 2, y: 1 }], { autonomy: false });
    const [a, b] = sim.world.folks;
    sim.dispatch({ type: 'queueSocial', folkId: a.id, otherId: b.id, socialId: 'greet' });
    run(sim, 10);
    expect(relationOf(sim.world, a.id, b.id)!.memories.map((m) => m.kind)).toContain('met');
    expect(relationOf(sim.world, b.id, a.id)!.memories.map((m) => m.kind)).toContain('met');
  });

  it('a chance de topar sobe com amizade, afinidade e humor', () => {
    const sim = crowd(
      [
        { x: 1, y: 1 },
        { x: 3, y: 1, traits: ['romantico'] },
        { x: 5, y: 1, traits: ['reservado'] },
      ],
      { autonomy: false },
    );
    const [a, fan, shy] = sim.world.folks;
    const flirt = CATALOG.socials.flirt;
    expect(acceptChance(sim.world, CATALOG, a, fan, flirt)).toBeGreaterThan(acceptChance(sim.world, CATALOG, a, shy, flirt));
    const cold = acceptChance(sim.world, CATALOG, a, fan, flirt);
    applyDelta(sim.world, CATALOG, fan, a, { friendship: 50, romance: 40 });
    expect(acceptChance(sim.world, CATALOG, a, fan, flirt)).toBeGreaterThan(cold);
  });

  it('pedido de namoro aceito liga o namoro dos dois lados', () => {
    // com romance alto e o outro romântico, a chance é alta; testa várias seeds
    let dated = 0;
    for (let seed = 1; seed <= 12; seed++) {
      const sim = crowd([{ x: 1, y: 1 }, { x: 2, y: 1, traits: ['romantico'] }], {
        relations: [{ a: 'Pessoa 1', b: 'Pessoa 2', friendship: 70, romance: 80 }],
        autonomy: false,
        seed,
      });
      const [a, b] = sim.world.folks;
      sim.dispatch({ type: 'queueSocial', folkId: a.id, otherId: b.id, socialId: 'askOut' });
      run(sim, 15);
      const ab = relationOf(sim.world, a.id, b.id)!;
      const ba = relationOf(sim.world, b.id, a.id)!;
      expect(ab.dating).toBe(ba.dating);
      if (ab.dating) {
        dated++;
        expect(ab.memories.some((m) => m.kind === 'startedDating')).toBe(true);
      } else {
        expect(ab.memories.some((m) => m.kind === 'gotTurnedDown')).toBe(true);
        expect(ba.memories.some((m) => m.kind === 'turnedDown')).toBe(true);
      }
    }
    expect(dated).toBeGreaterThan(0);
  });

  it('brigas deixam lembrança que pesa contra na próxima conversa', () => {
    const sim = crowd([{ x: 1, y: 1 }, { x: 2, y: 1 }], {
      relations: [{ a: 'Pessoa 1', b: 'Pessoa 2', friendship: 0 }],
      autonomy: false,
    });
    const [a, b] = sim.world.folks;
    const before = acceptChance(sim.world, CATALOG, a, b, CATALOG.socials.chat);
    relationOf(sim.world, b.id, a.id)!.memories.push({ tick: 0, kind: 'fought' });
    expect(acceptChance(sim.world, CATALOG, a, b, CATALOG.socials.chat)).toBeLessThan(before);
  });

  it('cancelar a conversa libera quem estava esperando', () => {
    const sim = crowd([{ x: 1, y: 1 }, { x: 8, y: 1 }], {
      relations: [{ a: 'Pessoa 1', b: 'Pessoa 2', friendship: 20 }],
      autonomy: false,
    });
    const [a, b] = sim.world.folks;
    sim.dispatch({ type: 'queueSocial', folkId: a.id, otherId: b.id, socialId: 'chat' });
    run(sim, 2);
    expect(b.queue[0]?.kind).toBe('listen');
    sim.dispatch({ type: 'cancel', folkId: a.id, actionId: a.queue[0].id });
    run(sim, 1);
    expect(b.queue).toHaveLength(0);
  });

  it('com a social baixa e alguém por perto, a IA puxa conversa', () => {
    const sim = crowd([{ x: 1, y: 1, needs: { social: 10 } }, { x: 4, y: 1 }], {
      relations: [{ a: 'Pessoa 1', b: 'Pessoa 2', friendship: 30 }],
    });
    const [a] = sim.world.folks;
    const best = scoreOptions(sim.world, CATALOG, a, sim.getNav())[0];
    expect(best.socialId).toBeDefined();
    run(sim, 120);
    expect(a.needs.social).toBeGreaterThan(30);
  });

  it('a IA não flerta sem interesse nem é maldosa sem motivo', () => {
    const sim = crowd([{ x: 1, y: 1, needs: { social: 5, fun: 5 } }, { x: 4, y: 1 }], {
      relations: [{ a: 'Pessoa 1', b: 'Pessoa 2', friendship: 50 }],
    });
    const [a] = sim.world.folks;
    const options = scoreOptions(sim.world, CATALOG, a, sim.getNav()).filter((o) => o.socialId);
    const cats = new Set(options.map((o) => CATALOG.socials[o.socialId!].category));
    expect(cats.has('romantic')).toBe(false);
    expect(cats.has('mean')).toBe(false);
  });

  it('ninguém acorda quem está dormindo para conversar', () => {
    const sim = crowd([{ x: 1, y: 1, needs: { social: 5 } }, { x: 4, y: 1, needs: { energy: 5 } }], {
      relations: [{ a: 'Pessoa 1', b: 'Pessoa 2', friendship: 30 }],
      objects: [{ defId: 'bed', x: 4, y: 2 }],
    });
    const [a, b] = sim.world.folks;
    a.autonomy = false;
    run(sim, 30);
    expect(b.queue[0]?.interactionId).toBe('sleep');
    a.autonomy = true;
    const options = scoreOptions(sim.world, CATALOG, a, sim.getNav());
    expect(options.some((o) => o.otherId === b.id)).toBe(false);
  });
});

describe('objetos de vários lugares', () => {
  it('dois folks dividem o sofá; um terceiro espera ou desiste', () => {
    const sim = crowd(
      [
        { x: 1, y: 4, needs: { comfort: 10 } },
        { x: 6, y: 4, needs: { comfort: 10 } },
        { x: 9, y: 4, needs: { comfort: 10 } },
      ],
      { objects: [{ defId: 'sofa', x: 4, y: 2 }], autonomy: false },
    );
    const sofa = sim.world.objects[0];
    for (const f of sim.world.folks) sim.dispatch({ type: 'queueUse', folkId: f.id, objectId: sofa.id, interactionId: 'rest' });
    run(sim, 12);
    const sitting = sim.world.folks.filter((f) => f.queue[0]?.phase === 'using');
    expect(sitting).toHaveLength(2);
    expect(new Set(sitting.map((f) => f.queue[0].slot))).toEqual(new Set([0, 1]));
  });
});

describe('visitas', () => {
  it('vizinhos aparecem sem avisar de dia e vão embora', () => {
    const sim = householdSim(3);
    let arrived = 0;
    let left = 0;
    for (let i = 0; i < 4 * 1440; i++) {
      sim.step();
      const last = sim.world.log[sim.world.log.length - 1];
      if (last?.tick === sim.world.tick && last.key === 'log.dropIn') arrived++;
      if (last?.tick === sim.world.tick && last.key === 'log.left') left++;
      // à noite não tem visita
      const hour = Math.floor((sim.world.tick % 1440) / 60);
      if (hour >= 0 && hour < 6) expect(sim.world.folks.some((f) => f.visit)).toBe(false);
    }
    expect(arrived).toBeGreaterThan(0);
    expect(left).toBeGreaterThan(0);
    // as visitas conheceram alguém da casa
    expect(Object.keys(sim.world.relations).length).toBeGreaterThan(2);
  });

  it('convite por telefone: o vizinho topa e chega depois de um tempo', () => {
    const sim = householdSim(5);
    sim.world.tick = 10 * 60; // de manhã cedo ninguém atende convite
    const host = sim.world.folks[0];
    sim.world.folks[1].autonomy = false;
    host.autonomy = false;
    sim.world.lastDropIn = sim.world.tick + 99999; // sem visitas surpresa
    const n = sim.world.neighbors[0];
    // quem gosta de quem liga topa quase sempre
    relationOf(sim.world, n.id, host.id) ?? applyDelta(sim.world, CATALOG, { ...host, id: n.id, traits: n.traits }, host, { friendship: 30 });
    expect(sim.dispatch({ type: 'invite', folkId: host.id, neighborId: n.id })).toBe(true);
    expect(host.queue[0].interactionId).toBe('invite');
    // ligar de novo para quem já vem é recusado
    run(sim, 60);
    expect(sim.world.log.some((l) => l.key === 'log.inviteYes')).toBe(true);
    expect(sim.dispatch({ type: 'invite', folkId: host.id, neighborId: n.id })).toBe(false);
    expect(sim.lastProblem).toBe('alreadyComing');
    run(sim, 90);
    expect(sim.findFolk(n.id)?.visit).toBeTruthy();
    // não dá para mandar na visita
    expect(sim.dispatch({ type: 'setAutonomy', folkId: n.id, on: false })).toBe(false);
    expect(sim.lastProblem).toBe('visitor');
  });

  it('convite tarde da noite não rola', () => {
    const sim = householdSim(5);
    sim.world.tick = 23 * 60;
    const host = sim.world.folks[0];
    host.autonomy = false;
    sim.dispatch({ type: 'invite', folkId: host.id, neighborId: sim.world.neighbors[0].id });
    run(sim, 60);
    expect(sim.world.log.some((l) => l.key === 'log.inviteLate')).toBe(true);
    expect(sim.world.pendingVisits).toHaveLength(0);
  });

  it('pedir para ir embora manda a visita para a calçada e ela some', () => {
    const sim = householdSim(5);
    const host = sim.world.folks[0];
    host.autonomy = false;
    sim.world.folks[1].autonomy = false;
    sim.world.lastDropIn = sim.world.tick + 99999;
    const n = sim.world.neighbors[1];
    sim.world.pendingVisits.push({ neighborId: n.id, at: sim.world.tick + 1, hostId: host.id });
    run(sim, 2);
    const guest = sim.findFolk(n.id)!;
    guest.autonomy = false;
    expect(sim.dispatch({ type: 'queueSocial', folkId: host.id, otherId: guest.id, socialId: 'sendHome' })).toBe(true);
    run(sim, 120);
    expect(sim.findFolk(n.id)).toBeUndefined();
    expect(sim.world.neighbors.some((x) => x.id === n.id)).toBe(true);
  });

  it('chamar para morar junto: a visita vira moradora e traz o emprego', () => {
    let moved = false;
    for (let seed = 1; seed <= 15 && !moved; seed++) {
      const sim = householdSim(seed);
      const host = sim.world.folks[0];
      host.autonomy = false;
      sim.world.folks[1].autonomy = false;
      sim.world.lastDropIn = sim.world.tick + 99999;
      const n = sim.world.neighbors[0];
      sim.world.pendingVisits.push({ neighborId: n.id, at: sim.world.tick + 1, hostId: host.id });
      run(sim, 2);
      const guest = sim.findFolk(n.id)!;
      guest.autonomy = false;
      applyDelta(sim.world, CATALOG, host, guest, { friendship: 70 });
      applyDelta(sim.world, CATALOG, guest, host, { friendship: 70 });
      relationOf(sim.world, host.id, guest.id)!.friendship = 80;
      relationOf(sim.world, guest.id, host.id)!.friendship = 80;
      expect(sim.dispatch({ type: 'queueSocial', folkId: host.id, otherId: guest.id, socialId: 'inviteMoveIn' })).toBe(true);
      run(sim, 60);
      if (guest.visit === null) {
        moved = true;
        expect(sim.world.neighbors.some((x) => x.id === n.id)).toBe(false);
        expect(guest.job?.careerId).toBe(n.career?.id);
        expect(sim.residents()).toHaveLength(3);
      }
    }
    expect(moved).toBe(true);
  });
});

describe('determinismo e save com várias pessoas', () => {
  it('salvar e carregar no meio de uma visita não muda o futuro', () => {
    const a = householdSim(11);
    run(a, 1440 + 8 * 60);
    const copy = deserialize(JSON.parse(JSON.stringify(serialize(a.world, 0)))).world;
    const b = householdSim(11);
    b.load(copy);
    run(a, 1440);
    run(b, 1440);
    expect(JSON.stringify(b.world)).toBe(JSON.stringify(a.world));
  });

  it('save da fatia 2 vira v3: mesma casa, vizinhança nova, sem relações', () => {
    const old = householdSim(2);
    const v2 = JSON.parse(JSON.stringify(serialize(old.world, 0)));
    v2.version = 2;
    for (const f of v2.world.folks) delete f.visit;
    delete v2.world.neighbors;
    delete v2.world.relations;
    delete v2.world.pendingVisits;
    delete v2.world.lastDropIn;
    const loaded = deserialize(v2, { neighbors: NEIGHBORS });
    expect(loaded.version).toBe(SAVE_VERSION);
    expect(loaded.world.folks.every((f) => f.visit === null)).toBe(true);
    expect(loaded.world.neighbors).toHaveLength(NEIGHBORS.length);
    const ids = new Set([...loaded.world.folks.map((f) => f.id), ...loaded.world.objects.map((o) => o.id)]);
    expect(loaded.world.neighbors.every((n) => !ids.has(n.id) && n.id < loaded.world.nextId)).toBe(true);
    // moradores começam sem relações (só os colegas da vizinhança se conhecem, desde a v5)
    const residents = loaded.world.folks.map((f) => f.id);
    expect(Object.keys(loaded.world.relations).some((k) => k.split('>').some((id) => residents.includes(Number(id))))).toBe(false);
  });
});
