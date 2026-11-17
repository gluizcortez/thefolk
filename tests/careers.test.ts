import { describe, expect, it } from 'vitest';
import { CATALOG } from '../src/data/catalog';
import { NEIGHBORS, NEIGHBOR_TIES } from '../src/data/neighbors';
import { REWARD_LEVEL } from '../src/data/rewards';
import { ptBR } from '../src/i18n/pt-BR';
import {
  CALL_AHEAD,
  FRIEND_AT,
  MINUTES_PER_DAY,
  PROMOTE_AT,
  RIDE_GRACE,
  SAVE_VERSION,
  Sim,
  adsOfDay,
  bossOf,
  coolFactor,
  coolRelations,
  deserialize,
  ensureRelation,
  familyFriends,
  missingFriends,
  nextShift,
  promoteNewBoss,
  relationOf,
  rideFor,
  serialize,
  shiftOn,
  staffShuffle,
  startWorkEvent,
  resolveWorkEvent,
  tierOfLevel,
  uniformOf,
  vehicleOf,
  xpForLevel,
} from '../src/sim';
import type { Folk, World } from '../src/sim';
import { householdSim, workSim } from './helpers';

function until(sim: Sim, tick: number): void {
  while (sim.world.tick < tick) sim.step();
}

function hired(careerId = 'office', seed = 5): { sim: Sim; folk: Folk } {
  const sim = workSim(seed);
  const folk = sim.world.folks[0];
  expect(sim.dispatch({ type: 'takeJob', folkId: folk.id, careerId })).toBe(true);
  return { sim, folk };
}

/** Faz de `n` vizinhos amigos de verdade do folk. */
function befriend(world: World, folk: Folk, n: number): void {
  const others = world.neighbors.filter((x) => !x.service).slice(0, n);
  for (const o of others) {
    ensureRelation(world, folk.id, o.id).friendship = FRIEND_AT + 10;
    relationOf(world, folk.id, o.id)!.last = world.tick;
  }
}

/** Habilidades no máximo pedido pelo cargo. */
function qualify(folk: Folk, careerId: string, level: number): void {
  for (const [id, need] of Object.entries(CATALOG.careers[careerId].levels[level].requires)) folk.skills[id] = xpForLevel(need);
}

describe('dez carreiras de dez cargos (bloco 8)', () => {
  const careers = Object.values(CATALOG.careers);

  it('são dez, todas com dez cargos, textos, caronas e uniformes', () => {
    expect(careers).toHaveLength(10);
    for (const c of careers) {
      expect(c.levels, c.id).toHaveLength(10);
      expect(ptBR[c.name], c.id).toBeTruthy();
      expect(ptBR[c.workplace!], c.id).toBeTruthy();
      expect(c.vehicles).toHaveLength(3);
      expect(c.uniforms).toHaveLength(3);
      for (const l of c.levels) expect(ptBR[l.title], l.title).toBeTruthy();
      for (const v of c.vehicles) expect(ptBR[`ride.${v.kind}`], v.kind).toBeTruthy();
      for (const s of c.skills) expect(CATALOG.skills[s], s).toBeDefined();
    }
  });

  it('cargos pagam mais e pedem mais (habilidades e amigos) a cada degrau', () => {
    for (const c of careers) {
      for (let i = 1; i < c.levels.length; i++) {
        const a = c.levels[i - 1];
        const b = c.levels[i];
        expect(b.pay, `${c.id} ${i}`).toBeGreaterThan(a.pay);
        expect(b.friends).toBeGreaterThanOrEqual(a.friends);
        for (const [id, need] of Object.entries(a.requires)) expect(b.requires[id] ?? 0).toBeGreaterThanOrEqual(need);
      }
      expect(c.levels[0].friends).toBe(0);
      expect(c.levels[9].friends).toBeGreaterThan(2);
      // todo turno cabe num dia e começa numa hora válida
      for (const l of c.levels) {
        expect(l.startHour).toBeGreaterThanOrEqual(0);
        expect(l.startHour).toBeLessThan(24);
        expect(l.days.length).toBeGreaterThan(0);
      }
    }
  });

  it('cada carreira nova tem chefe na vizinhança', () => {
    const sim = workSim(3);
    for (const c of careers) expect(bossOf(sim.world, c.id), c.id).toBeDefined();
  });

  it('o jornal traz quatro vagas por dia, sempre as mesmas no mesmo dia', () => {
    const a = adsOfDay(CATALOG, 4, 'office').map((c) => c.id);
    expect(a).toHaveLength(4);
    expect(new Set(a).size).toBe(4);
    expect(a).not.toContain('office');
    expect(adsOfDay(CATALOG, 4, 'office').map((c) => c.id)).toEqual(a);
    const seen = new Set<string>();
    for (let d = 0; d < 20; d++) for (const c of adsOfDay(CATALOG, d)) seen.add(c.id);
    expect(seen.size).toBe(10);
  });

  it('as dez carreiras dão para jogar: um turno em cada, com pagamento', () => {
    for (const c of careers) {
      const { sim, folk } = hired(c.id, 7);
      const shift = nextShift(CATALOG, folk, sim.world.tick)!;
      expect(shift, c.id).not.toBeNull();
      const funds = sim.world.household.funds;
      until(sim, shift.start + 1);
      expect(folk.away, c.id).not.toBeNull();
      until(sim, shift.end + 1);
      expect(folk.away).toBeNull();
      expect(folk.job!.shifts, c.id).toBe(1);
      expect(sim.world.log.some((l) => l.key === 'log.backFromWork')).toBe(true);
      expect(sim.world.household.funds).not.toBe(funds);
    }
  });
});

describe('amigos da família', () => {
  it('contam gente de fora com amizade alta, uma vez só', () => {
    const sim = householdSim(2);
    const [a, b] = sim.world.folks;
    const out = sim.world.neighbors.find((n) => !n.service)!;
    expect(familyFriends(sim.world)).not.toContain(out.id);
    ensureRelation(sim.world, a.id, out.id).friendship = FRIEND_AT;
    ensureRelation(sim.world, b.id, out.id).friendship = FRIEND_AT + 20;
    expect(familyFriends(sim.world).filter((id) => id === out.id)).toHaveLength(1);
    // morador não conta como amigo da família
    ensureRelation(sim.world, a.id, b.id).friendship = 90;
    expect(familyFriends(sim.world)).not.toContain(b.id);
  });

  it('sem amigos a promoção não sai; com amigos, sai', () => {
    const { sim, folk } = hired('office');
    const job = folk.job!;
    job.level = 3;
    const next = CATALOG.careers.office.levels[4];
    expect(next.friends).toBeGreaterThan(0);
    qualify(folk, 'office', 4);
    const boss = bossOf(sim.world, 'office')!;
    const shift = nextShift(CATALOG, folk, sim.world.tick)!;
    until(sim, shift.start + 1);
    ensureRelation(sim.world, boss.id, folk.id).respect = 100;
    job.performance = 100;
    folk.away!.nextEvent = -1;
    expect(missingFriends(sim.world, next)).toBeGreaterThan(0);
    until(sim, shift.end + 1);
    expect(job.level).toBe(3);
    expect(sim.world.log.some((l) => l.key === 'log.needFriends')).toBe(true);

    befriend(sim.world, folk, next.friends);
    expect(missingFriends(sim.world, next)).toBe(0);
    const again = nextShift(CATALOG, folk, sim.world.tick)!;
    until(sim, again.start + 1);
    befriend(sim.world, folk, next.friends);
    relationOf(sim.world, boss.id, folk.id)!.respect = 100;
    job.performance = 100;
    folk.away!.nextEvent = -1;
    until(sim, again.end + 1);
    expect(folk.job!.level).toBe(4);
  });
});

describe('amizade esfria sem contato', () => {
  it('cai a cada dia sem se ver, e mais depressa com pouco Afeto', () => {
    const sim = householdSim(4);
    const [cold, warm] = sim.world.folks;
    cold.temper = { ...cold.temper, warmth: 0 };
    warm.temper = { ...warm.temper, warmth: 10 };
    const n = sim.world.neighbors.find((x) => !x.service)!;
    const rc = ensureRelation(sim.world, cold.id, n.id);
    const rw = ensureRelation(sim.world, warm.id, n.id);
    rc.friendship = rw.friendship = 60;
    rc.romance = 30;
    rc.respect = 20;
    rc.last = rw.last = sim.world.tick;
    sim.world.tick += 2 * MINUTES_PER_DAY;
    coolRelations(sim.world);
    expect(rc.friendship).toBeLessThan(60);
    expect(rw.friendship).toBeLessThan(60);
    expect(60 - rc.friendship).toBeGreaterThan(60 - rw.friendship);
    expect(rc.romance).toBeLessThan(30);
    expect(rc.respect).toBe(20);
    expect(coolFactor(0)).toBeGreaterThan(coolFactor(5));
    expect(coolFactor(10)).toBeLessThan(coolFactor(5));
  });

  it('um amigo esquecido deixa de contar para a família', () => {
    const sim = householdSim(4);
    const me = sim.world.folks[0];
    const n = sim.world.neighbors.find((x) => !x.service)!;
    const rel = ensureRelation(sim.world, me.id, n.id);
    rel.friendship = FRIEND_AT + 3;
    rel.last = sim.world.tick;
    expect(familyFriends(sim.world)).toContain(n.id);
    for (let d = 0; d < 5; d++) {
      sim.world.tick += MINUTES_PER_DAY;
      coolRelations(sim.world);
    }
    expect(familyFriends(sim.world)).not.toContain(n.id);
  });

  it('relação só entre vizinhos não esfria (eles se veem fora da tela)', () => {
    const sim = workSim(1);
    const [a, b] = sim.world.neighbors;
    const rel = ensureRelation(sim.world, a.id, b.id);
    rel.friendship = 40;
    rel.last = sim.world.tick;
    sim.world.tick += 5 * MINUTES_PER_DAY;
    coolRelations(sim.world);
    expect(rel.friendship).toBe(40);
  });
});

describe('carona', () => {
  it('chega na hora da chamada, buzina de novo e espera até o turno', () => {
    const { sim, folk } = hired('office');
    const shift = nextShift(CATALOG, folk, sim.world.tick)!;
    until(sim, shift.start - CALL_AHEAD - 1);
    expect(rideFor(CATALOG, folk, sim.world.tick)).toBeNull();
    sim.step();
    const ride = rideFor(CATALOG, folk, sim.world.tick)!;
    expect(ride).not.toBeNull();
    expect(ride.vehicle).toEqual(vehicleOf(CATALOG, folk.job!));
    expect(ride.leaves).toBe(shift.start + RIDE_GRACE);
    expect(sim.world.log.some((l) => l.key === 'log.workCall')).toBe(true);
    // vestiu o uniforme para ir
    expect(folk.outfit).toBe('work');
    // o folk embarca: a carona vai embora com ele
    until(sim, shift.start + 1);
    expect(folk.away).not.toBeNull();
    expect(rideFor(CATALOG, folk, sim.world.tick)).toBeNull();
  });

  it('quem não embarca perde a carona e o turno', () => {
    const { sim, folk } = hired('office');
    const shift = nextShift(CATALOG, folk, sim.world.tick)!;
    until(sim, shift.start - CALL_AHEAD);
    folk.queue = [];
    folk.autonomy = false;
    until(sim, shift.start + RIDE_GRACE - 5);
    expect(rideFor(CATALOG, folk, sim.world.tick)).not.toBeNull();
    expect(sim.world.log.some((l) => l.key === 'log.rideHonk')).toBe(true);
    until(sim, shift.start + RIDE_GRACE + 1);
    expect(rideFor(CATALOG, folk, sim.world.tick)).toBeNull();
    expect(folk.away).toBeNull();
    expect(folk.job!.performance).toBeLessThan(0);
    expect(sim.world.log.some((l) => l.key === 'log.missedWork')).toBe(true);
  });

  it('a carona e o uniforme mudam com a faixa de cargos', () => {
    const { folk } = hired('brigade');
    const job = folk.job!;
    const kinds = [0, 4, 7].map((lv) => {
      job.level = lv;
      return { v: vehicleOf(CATALOG, job), u: uniformOf(CATALOG, job), tier: tierOfLevel(lv) };
    });
    expect(kinds.map((k) => k.tier)).toEqual([0, 1, 2]);
    expect(kinds[0].v).not.toEqual(kinds[1].v);
    expect(kinds[1].u).not.toEqual(kinds[2].u);
  });

  it('depois do banho o uniforme sai', () => {
    const { sim, folk } = hired('office');
    folk.outfit = 'work';
    const shower = sim.world.objects.find((o) => CATALOG.objects[o.defId]?.interactions.some((i) => i.wear === 'bath'))!;
    const it = CATALOG.objects[shower.defId].interactions.find((i) => i.wear === 'bath')!;
    folk.needs.hygiene = 10;
    expect(sim.dispatch({ type: 'queueUse', folkId: folk.id, objectId: shower.id, interactionId: it.id })).toBe(true);
    for (let i = 0; i < 300 && folk.outfit === 'work'; i++) sim.step();
    expect(folk.outfit).toBe('day');
  });
});

describe('recompensas de carreira', () => {
  it('ficam trancadas até alguém chegar ao cargo', () => {
    const { sim, folk } = hired('observatory');
    const def = Object.values(CATALOG.objects).find((o) => o.reward?.career === 'observatory')!;
    expect(def.reward!.level).toBe(REWARD_LEVEL);
    sim.world.household.funds = 5000;
    const spot = (): [number, number] => {
      for (let y = 1; y < sim.world.grid.h - 1; y++) {
        for (let x = 1; x < sim.world.grid.w - 1; x++) {
          if (sim.dispatch({ type: 'buy', defId: def.id, x, y, rot: 0 })) return [x, y];
          if (sim.lastProblem === 'locked') return [-1, -1];
        }
      }
      return [-2, -2];
    };
    expect(spot()).toEqual([-1, -1]);
    const job = folk.job!;
    job.level = REWARD_LEVEL - 1;
    qualify(folk, 'observatory', REWARD_LEVEL);
    befriend(sim.world, folk, 6);
    const boss = bossOf(sim.world, 'observatory')!;
    const shift = nextShift(CATALOG, folk, sim.world.tick)!;
    until(sim, shift.start + 1);
    befriend(sim.world, folk, 6);
    ensureRelation(sim.world, boss.id, folk.id).respect = 100;
    job.performance = 100;
    folk.away!.nextEvent = -1;
    until(sim, shift.end + 1);
    expect(job.level).toBe(REWARD_LEVEL);
    expect(sim.world.household.unlocked).toContain(def.id);
    expect(sim.world.log.some((l) => l.key === 'log.rewardUnlocked')).toBe(true);
    expect(spot()[0]).toBeGreaterThan(0);
  });

  it('cada carreira tem uma recompensa com texto e que treina habilidade', () => {
    for (const c of Object.values(CATALOG.careers)) {
      const r = Object.values(CATALOG.objects).filter((o) => o.reward?.career === c.id);
      expect(r, c.id).toHaveLength(1);
      expect(ptBR[r[0].name]).toBeTruthy();
      expect(r[0].interactions.some((i) => i.skill && ptBR[i.label])).toBe(true);
    }
  });
});

describe('eventos em cadeia e equipe que muda', () => {
  it('toda consequência marcada existe, só sai em cadeia e tem texto', () => {
    const events = Object.values(CATALOG.workEvents);
    for (const e of events) {
      expect(ptBR[e.text], e.text).toBeTruthy();
      for (const c of e.choices) {
        expect(ptBR[c.label], c.label).toBeTruthy();
        expect(ptBR[c.success.text], c.success.text).toBeTruthy();
        if (c.fail) expect(ptBR[c.fail.text], c.fail.text).toBeTruthy();
        for (const o of [c.success, c.fail]) {
          if (!o?.chain) continue;
          expect(CATALOG.workEvents[o.chain.event]?.chained, o.chain.event).toBe(true);
        }
      }
    }
    // cada carreira nova tem conteúdo próprio
    for (const id of ['clinic', 'workshop', 'circus', 'observatory', 'townhall', 'club', 'brigade']) {
      expect(events.some((e) => e.careers?.includes(id) && !e.chained), id).toBe(true);
    }
  });

  it('a escolha de hoje volta dias depois como outro evento', () => {
    const { sim, folk } = hired('observatory');
    const shift = nextShift(CATALOG, folk, sim.world.tick)!;
    until(sim, shift.start + 1);
    folk.away!.event = { defId: 'blip', actorId: 0, deadline: sim.world.tick + 60 };
    const log = () => undefined;
    resolveWorkEvent(sim.world, CATALOG, log, folk, 0, false);
    const chain = folk.job!.chain!;
    expect(chain.defId).toBe('blipCheck');
    expect(chain.day).toBe(Math.floor(sim.world.tick / MINUTES_PER_DAY) + 3);
    // antes do dia marcado, não sai
    folk.away!.event = null;
    startWorkEvent(sim.world, CATALOG, log, folk);
    const pending = () => folk.away?.event ?? null;
    expect(pending()?.defId).not.toBe('blipCheck');
    // no dia marcado, sai antes de qualquer sorteio
    folk.away!.event = null;
    sim.world.tick = chain.day * MINUTES_PER_DAY + 600;
    expect(startWorkEvent(sim.world, CATALOG, log, folk)).toBe(true);
    expect(pending()?.defId).toBe('blipCheck');
    expect(folk.job!.chain).toBeNull();
  });

  it('com o tempo colegas sobem, alguém é demitido e o chefe é substituído', () => {
    const sim = workSim(9);
    const world = sim.world;
    const before = new Map(world.neighbors.map((n) => [n.id, n.career?.level ?? -1]));
    const logs: string[] = [];
    for (let week = 0; week < 40; week++) staffShuffle(world, CATALOG, (key) => logs.push(key));
    expect(world.neighbors.some((n) => n.career && n.career.level > (before.get(n.id) ?? 99))).toBe(true);
    expect(world.news.some((n) => n.kind === 'fired')).toBe(true);
    // colega nunca passa o chefe da própria carreira
    for (const n of world.neighbors) {
      if (!n.career || n.boss) continue;
      const boss = world.neighbors.find((b) => b.boss && b.career?.id === n.career!.id);
      if (boss) expect(n.career.level).toBeLessThan(boss.career!.level);
    }
    // prestador de serviço não entra na roda
    expect(world.neighbors.filter((n) => n.service).every((n) => n.career === null)).toBe(true);
  });

  it('chefe demitido: o colega mais graduado assume', () => {
    const sim = workSim(2);
    const world = sim.world;
    const old = bossOf(world, 'office')!;
    const boss = world.neighbors.find((n) => n.id === old.id)!;
    boss.boss = false;
    boss.career = null;
    promoteNewBoss(world, CATALOG, () => undefined, 'office');
    expect(bossOf(world, 'office')?.name).toBe('Joaquim Pilastra');
  });
});

describe('save v12', () => {
  it('saves v11 dobram o cargo, ganham recompensas vazias e os chefes novos', () => {
    const sim = workSim(6);
    const folk = sim.world.folks[0];
    sim.dispatch({ type: 'takeJob', folkId: folk.id, careerId: 'office' });
    const raw = serialize(sim.world, 1) as unknown as { version: number; world: Record<string, unknown> };
    raw.version = 11;
    const w = raw.world as unknown as World;
    w.folks[0].job!.level = 3;
    delete (w.household as Partial<World['household']>).unlocked;
    const newBosses = ['Celeste Persiana', 'Gaspar Calha', 'Lola Gelosia', 'Severino Mansarda', 'Amélia Fachada', 'Tião Escada', 'Ivone Chaminé'];
    w.neighbors = w.neighbors.filter((n) => !newBosses.includes(n.name) && !['Lúcio Batente', 'Rita Vidraça', 'Edu Manilha'].includes(n.name));
    for (const n of w.neighbors) if (n.career) n.career.level = Math.floor(n.career.level / 2);
    const back = deserialize(raw, { neighbors: NEIGHBORS, ties: NEIGHBOR_TIES, catalog: CATALOG });
    expect(back.version).toBe(SAVE_VERSION);
    expect(SAVE_VERSION).toBe(12);
    expect(back.world.folks[0].job!.level).toBe(6);
    expect(back.world.household.unlocked).toEqual([]);
    for (const name of newBosses) expect(back.world.neighbors.some((n) => n.name === name && n.boss), name).toBe(true);
    expect(back.world.neighbors.find((n) => n.name === 'Hermínia Cumeeira')!.career!.level).toBe(8);
    // a equipe nova já se conhece
    const lucio = back.world.neighbors.find((n) => n.name === 'Lúcio Batente')!;
    const celeste = back.world.neighbors.find((n) => n.name === 'Celeste Persiana')!;
    expect(relationOf(back.world, lucio.id, celeste.id)?.respect).toBeGreaterThan(0);
  });
});

describe('semana headless do bloco 8', () => {
  it('casa com dois empregos nas carreiras novas aguenta sete dias', () => {
    const sim = householdSim(8);
    const [a, b] = sim.world.folks;
    expect(sim.dispatch({ type: 'takeJob', folkId: a.id, careerId: 'brigade' })).toBe(true);
    expect(sim.dispatch({ type: 'takeJob', folkId: b.id, careerId: 'observatory' })).toBe(true);
    const shifts = (lv: number, c: string) => [...Array(7).keys()].filter((d) => shiftOn(CATALOG.careers[c].levels[lv], d)).length;
    until(sim, sim.world.tick + 7 * MINUTES_PER_DAY);
    const worked = (a.job?.shifts ?? 0) + (b.job?.shifts ?? 0);
    expect(worked).toBeGreaterThanOrEqual(Math.min(6, shifts(0, 'brigade') + shifts(0, 'observatory') - 3));
    for (const f of [a, b]) {
      expect(f.job, f.name).not.toBeNull();
      expect(f.needs.energy).toBeGreaterThan(0);
    }
    expect(sim.world.log.filter((l) => l.key === 'log.collapse').length).toBeLessThan(4);
    expect(PROMOTE_AT).toBeGreaterThan(0);
  });
});
