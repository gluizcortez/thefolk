import { describe, expect, it } from 'vitest';
import { CATALOG } from '../src/data/catalog';
import { NEIGHBORS } from '../src/data/neighbors';
import {
  BARGAIN_MINUTES,
  BURGLAR_REWARD,
  FIRE_RESPONSE,
  MINUTES_PER_DAY,
  SAVE_VERSION,
  SCORCH_DEATH,
  STARVE_MINUTES,
  addFire,
  bargainWon,
  cookFireChance,
  deserialize,
  fireMinute,
  isFlammable,
  serialize,
  smokeSeen,
} from '../src/sim';
import type { Sim, WorldObject } from '../src/sim';
import { crowd, householdSim, run } from './helpers';

// Bloco 14: fogo, gatuno, morte, barganha, lápide, fantasma e luto.

const ok = (sim: Sim, cmd: Parameters<Sim['dispatch']>[0]) => {
  const r = sim.dispatch(cmd);
  if (!r) throw new Error(`${cmd.type}: ${sim.lastProblem}`);
};
const objOf = (sim: Sim, defId: string): WorldObject | undefined => sim.world.objects.find((o) => o.defId === defId);
const crew = (...kinds: string[]) => NEIGHBORS.filter((n) => n.service && kinds.includes(n.service));
const logged = (sim: Sim, key: string) => sim.world.log.some((l) => l.key === key);

describe('fogo (bloco 14)', () => {
  it('sofá e estante pegam fogo; telefone e lápide, não', () => {
    expect(isFlammable(CATALOG.objects.sofa)).toBe(true);
    expect(isFlammable(CATALOG.objects.bookshelf)).toBe(true);
    expect(isFlammable(CATALOG.objects.phone)).toBe(false);
    expect(isFlammable(CATALOG.objects.grave)).toBe(false);
    expect(isFlammable(CATALOG.objects.fireplace)).toBe(false);
  });

  it('esquenta, pula para o sofá do lado, queima até virar cinza e se apaga sozinho', () => {
    const sim = crowd([{ x: 10, y: 6 }], { objects: [{ defId: 'sofa', x: 2, y: 2 }], autonomy: false, seed: 3 });
    const sofa = objOf(sim, 'sofa')!;
    // fogo no chão colado ao sofá
    addFire(sim.world, CATALOG, 4, 2);
    let caught = false;
    for (let i = 0; i < 600 && sim.world.fires.length > 0; i++) {
      sim.step();
      caught ||= sim.world.fires.some((f) => f.x === 3 && f.y === 2);
    }
    expect(caught).toBe(true);
    expect(sim.findObject(sofa.id)).toBeUndefined();
    expect(logged(sim, 'log.burnt')).toBe(true);
    expect(sim.world.mess.some((m) => m.kind === 'ash')).toBe(true);
    expect(sim.world.fires).toHaveLength(0);
  });

  it('parede segura o fogo', () => {
    const sim = crowd([{ x: 10, y: 6 }], { objects: [{ defId: 'sofa', x: 2, y: 2 }], autonomy: false });
    sim.world.grid.edges['4,2,W'] = 'wall';
    const fire = addFire(sim.world, CATALOG, 4, 2)!;
    fire.heat = 100;
    for (let i = 0; i < 300; i++) fireMinute(sim.world, CATALOG);
    expect(sim.world.fires.some((f) => f.x === 3)).toBe(false);
  });

  it('com extintor, o morador apaga sozinho; sem, chama os bombeiros pelo telefone e eles apagam', () => {
    const withExt = crowd([{ x: 8, y: 5 }], { objects: [{ defId: 'extinguisher', x: 10, y: 5 }] });
    addFire(withExt.world, CATALOG, 3, 2);
    for (let i = 0; i < 200 && withExt.world.fires.length > 0; i++) withExt.step();
    expect(withExt.world.fires).toHaveLength(0);
    expect(logged(withExt, 'log.fireOut')).toBe(true);

    const sim = crowd([{ x: 8, y: 5 }], { objects: [{ defId: 'phone', x: 10, y: 5 }], neighbors: crew('firefighter') });
    addFire(sim.world, CATALOG, 3, 2);
    for (let i = 0; i < 30 && sim.world.help.fire === 0; i++) sim.step();
    expect(sim.world.help.fire).toBeGreaterThan(0);
    expect(logged(sim, 'log.calledFire')).toBe(true);
    for (let i = 0; i < FIRE_RESPONSE + 200 && (sim.world.fires.length > 0 || sim.world.help.fire !== 0); i++) sim.step();
    expect(logged(sim, 'log.firefightersArrive')).toBe(true);
    expect(sim.world.fires).toHaveLength(0);
  });

  it('o detector de fumaça chama os bombeiros sozinho', () => {
    const sim = crowd([{ x: 10, y: 6 }], { objects: [{ defId: 'smokealarm', x: 4, y: 3 }], autonomy: false, neighbors: crew('firefighter') });
    addFire(sim.world, CATALOG, 3, 2);
    expect(smokeSeen(sim.world, CATALOG)).toBe(true);
    sim.step();
    expect(logged(sim, 'log.smokeAlarm')).toBe(true);
    expect(sim.world.help.fire).toBe(sim.world.tick + FIRE_RESPONSE);
  });

  it('sem extintor nem telefone, entra em pânico do lado do fogo', () => {
    const sim = crowd([{ x: 8, y: 5 }]);
    addFire(sim.world, CATALOG, 3, 2);
    let panicked = false;
    for (let i = 0; i < 40 && !panicked; i++) {
      sim.step();
      panicked = sim.world.folks[0].queue[0]?.kind === 'panic';
    }
    expect(panicked).toBe(true);
  });

  it('cozinhar mal é arriscado; com Culinária 4, nunca', () => {
    expect(cookFireChance(0)).toBeGreaterThan(cookFireChance(2));
    expect(cookFireChance(4)).toBe(0);
  });

  it('lareira acesa com o sofá colado acaba pegando fogo', () => {
    let fires = 0;
    for (let seed = 1; seed <= 6; seed++) {
      const sim = crowd([{ x: 10, y: 6 }], { objects: [{ defId: 'fireplace', x: 2, y: 2 }, { defId: 'sofa', x: 4, y: 2 }], autonomy: false, seed });
      const hearth = objOf(sim, 'fireplace')!;
      ok(sim, { type: 'queueUse', folkId: sim.world.folks[0].id, objectId: hearth.id, interactionId: 'kindle' });
      for (let i = 0; i < 260 && sim.world.fires.length === 0; i++) sim.step();
      if (sim.world.fires.length > 0) fires++;
      expect(logged(sim, 'log.kindled')).toBe(true);
    }
    expect(fires).toBeGreaterThan(0);
  });
});

describe('gatuno (bloco 14)', () => {
  /** Casa fechada (a parte de dentro é piso de madeira) com um objeto caro e a porta para o quintal. */
  function house(alarm: boolean): Sim {
    const objects = [{ defId: 'tv', x: 6, y: 2 }];
    if (alarm) objects.push({ defId: 'phone', x: 2, y: 6 });
    const sim = crowd([{ x: 10, y: 6 }], { objects, autonomy: false, neighbors: crew('burglar', 'police'), startTick: 1 * 60 });
    // metade de cima vira dentro de casa
    for (let y = 0; y < 4; y++) for (let x = 0; x < 12; x++) sim.world.grid.floor[y * sim.world.grid.w + x] = 'wood';
    if (alarm) {
      sim.world.objects.push({ id: sim.world.nextId++, defId: 'burglaralarm', x: 1, y: 1, rot: 0, paid: 0, state: { dirt: 0, wear: 0, broken: false, patched: false, repair: 0, fill: 0 } });
    }
    sim.world.lastBurglary = -99 * MINUTES_PER_DAY;
    sim.invalidateNav();
    return sim;
  }
  const spawnThief = (sim: Sim) => {
    // força a noite de gatuno
    for (let tries = 0; tries < 200 && !sim.world.folks.some((f) => f.visit?.service?.kind === 'burglar'); tries++) {
      sim.world.tick = MINUTES_PER_DAY * (tries + 1) + 2 * 60 - 1;
      sim.world.lastBurglary = -99 * MINUTES_PER_DAY;
      sim.step();
    }
    return sim.world.folks.find((f) => f.visit?.service?.kind === 'burglar');
  };

  it('sem alarme, leva o objeto caro e some', () => {
    const sim = house(false);
    const tv = objOf(sim, 'tv')!;
    expect(spawnThief(sim)).toBeTruthy();
    for (let i = 0; i < 300 && sim.world.folks.some((f) => f.visit?.service?.kind === 'burglar'); i++) sim.step();
    expect(sim.findObject(tv.id)).toBeUndefined();
    expect(logged(sim, 'log.stolen')).toBe(true);
    expect(logged(sim, 'log.burglarEscaped')).toBe(true);
  });

  it('com alarme, a polícia vem, corre atrás, pega o gatuno, devolve o objeto e a casa ganha a recompensa', () => {
    const sim = house(true);
    const tv = objOf(sim, 'tv')!;
    expect(spawnThief(sim)).toBeTruthy();
    const funds = sim.world.household.funds;
    for (let i = 0; i < 400 && sim.world.folks.some((f) => f.visit?.service && ['burglar', 'police'].includes(f.visit.service.kind)); i++) sim.step();
    expect(logged(sim, 'log.burglarAlarm')).toBe(true);
    expect(logged(sim, 'log.burglarCaught')).toBe(true);
    expect(sim.world.household.funds).toBe(funds + BURGLAR_REWARD);
    expect(sim.world.objects.some((o) => o.id === tv.id)).toBe(true);
    expect(sim.world.news.some((n) => n.kind === 'caughtBurglar')).toBe(true);
  });
});

describe('morte, barganha e fantasma (bloco 14)', () => {
  function couple(seed = 1): Sim {
    const sim = crowd(
      [
        { name: 'Ada Teste', x: 3, y: 4, needs: { hunger: 0 } },
        { name: 'Bia Teste', x: 6, y: 4 },
      ],
      { autonomy: false, neighbors: crew('reaper'), relations: [{ a: 'Ada Teste', b: 'Bia Teste', friendship: 60 }], seed },
    );
    return sim;
  }

  it('fome no zero por horas derruba; o Seu Sereno vem, espera e, sem barganha, leva: lápide, luto e fantasma', () => {
    const sim = couple();
    const [ada, bia] = sim.world.folks;
    for (let i = 0; i < STARVE_MINUTES + 5 && !ada.down; i++) {
      sim.step();
      ada.needs.hunger = 0;
      bia.needs.hunger = 90;
    }
    expect(ada.down).toBe('hunger');
    expect(sim.world.passings).toHaveLength(1);
    expect(sim.dispatch({ type: 'queueGoto', folkId: ada.id, x: 1, y: 1 })).toBe(false);
    expect(sim.lastProblem).toBe('down');
    // ele chega e abre o livro
    for (let i = 0; i < 120 && sim.world.passings[0]?.stage !== 'waiting'; i++) sim.step();
    expect(sim.world.passings[0].stage).toBe('waiting');
    expect(logged(sim, 'log.reaperArrived')).toBe(true);
    for (let i = 0; i <= BARGAIN_MINUTES; i++) {
      sim.step();
      bia.needs.hunger = 90;
    }
    expect(sim.findFolk(ada.id)).toBeUndefined();
    expect(sim.world.departed.map((d) => d.id)).toEqual([ada.id]);
    const grave = sim.world.objects.find((o) => o.memorial?.personId === ada.id)!;
    expect(grave.defId).toBe('grave'); // morreu no quintal (grama)
    expect(bia.mourning).toBeGreaterThan(sim.world.tick);
    expect(sim.world.relations[`${bia.id}>${ada.id}`].memories.some((m) => m.kind === 'mourned')).toBe(true);
    // de noite o fantasma aparece e assusta quem está perto
    let spirit = false;
    for (let i = 0; i < 2 * MINUTES_PER_DAY && !logged(sim, 'log.scared'); i++) {
      sim.step();
      bia.needs.hunger = 90;
      spirit ||= sim.world.spirits.length > 0;
      const s = sim.world.spirits[0];
      if (s && bia.queue.length === 0) {
        bia.x = s.x;
        bia.y = s.y + 1;
      }
    }
    expect(spirit).toBe(true);
    expect(logged(sim, 'log.scared')).toBe(true);
    // homenagens acalmam até descansar
    for (let day = 0; day < 4 && grave.memorial!.unrest > 0; day++) {
      bia.needs = { ...bia.needs, hunger: 90, energy: 90, comfort: 90, fun: 90, bladder: 90, hygiene: 90, social: 90 };
      ok(sim, { type: 'queueUse', folkId: bia.id, objectId: grave.id, interactionId: 'honor' });
      for (let i = 0; i < MINUTES_PER_DAY; i++) {
        sim.step();
        bia.needs.hunger = Math.max(bia.needs.hunger, 60);
      }
    }
    expect(grave.memorial!.unrest).toBe(0);
    expect(logged(sim, 'log.restInPeace') || logged(sim, 'log.restInPeaceAlone')).toBe(true);
  });

  it('par ou ímpar: quem ganha a barganha volta; quem perde vai', () => {
    expect(bargainWon('even', 2, 4)).toBe(true);
    expect(bargainWon('odd', 2, 4)).toBe(false);
    expect(bargainWon('odd', 1, 4)).toBe(true);
    let won = 0;
    let lost = 0;
    for (let seed = 1; seed <= 8; seed++) {
      const sim = couple(seed);
      const ada = sim.world.folks[0];
      for (let i = 0; i < STARVE_MINUTES + 5 && !ada.down; i++) {
        sim.step();
        ada.needs.hunger = 0;
      }
      for (let i = 0; i < 120 && sim.world.passings[0]?.stage !== 'waiting'; i++) sim.step();
      ok(sim, { type: 'bargain', pick: 'even' });
      const b = sim.world.lastBargain!;
      expect(b.won).toBe((b.mine + b.his) % 2 === 0);
      if (b.won) {
        won++;
        expect(ada.down).toBeUndefined();
        expect(sim.findFolk(ada.id)).toBeTruthy();
        expect(ada.needs.hunger).toBeGreaterThanOrEqual(40);
      } else {
        lost++;
        expect(sim.findFolk(ada.id)).toBeUndefined();
      }
      expect(sim.world.passings).toHaveLength(0);
    }
    expect(won + lost).toBe(8);
  });

  it('sem morte no jogo novo: quem cairia escapa por um triz', () => {
    const sim = couple();
    sim.world.rules.death = false;
    const ada = sim.world.folks[0];
    for (let i = 0; i < STARVE_MINUTES + 5; i++) {
      sim.step();
      if (ada.collapsed === 0) ada.needs.hunger = 0;
    }
    expect(ada.down).toBeUndefined();
    expect(sim.world.passings).toHaveLength(0);
    expect(logged(sim, 'log.nearMiss.hunger')).toBe(true);
  });

  it('no meio das chamas por tempo demais, cai', () => {
    const sim = couple();
    const bia = sim.world.folks[1];
    sim.world.folks[0].needs.hunger = 80;
    const fire = addFire(sim.world, CATALOG, bia.x, bia.y)!;
    fire.fuel = 1000;
    for (let i = 0; i < SCORCH_DEATH + 2 && !bia.down; i++) {
      bia.queue = [];
      sim.step();
    }
    expect(bia.down).toBe('fire');
  });

  it('preso na piscina sem escadinha, cansa até se afogar', () => {
    const sim = crowd([{ x: 1, y: 6, needs: { energy: 3 } }, { x: 9, y: 6 }], { autonomy: false, neighbors: crew('reaper'), w: 10, h: 8 });
    ok(sim, { type: 'paintFloor', x0: 3, y0: 2, x1: 5, y1: 3, floorId: 'pool' });
    const folk = sim.world.folks[0];
    folk.adrift = { x: 4, y: 2 };
    for (let i = 0; i < 60 && !folk.down; i++) sim.step();
    expect(folk.down).toBe('drown');
  });
});

describe('save v18 (bloco 14)', () => {
  it('um save v17 abre sem fogo nem fantasma, com morte ligada e o socorro no bairro', () => {
    const sim = householdSim(2);
    const raw = JSON.parse(JSON.stringify(serialize(sim.world, 0))) as { version: number; world: Record<string, unknown> };
    raw.version = 17;
    for (const k of ['fires', 'help', 'passings', 'lastBargain', 'departed', 'spirits', 'rules', 'lastBurglary']) delete raw.world[k];
    raw.world.neighbors = (raw.world.neighbors as { service?: string }[]).filter((n) => !['firefighter', 'police', 'burglar', 'reaper'].includes(n.service ?? ''));
    const file = deserialize(raw, { neighbors: NEIGHBORS, catalog: CATALOG });
    expect(file.version).toBe(SAVE_VERSION);
    expect(SAVE_VERSION).toBeGreaterThanOrEqual(18);
    const w = file.world;
    expect(w.fires).toEqual([]);
    expect(w.help).toEqual({ fire: 0, police: 0 });
    expect(w.passings).toEqual([]);
    expect(w.spirits).toEqual([]);
    expect(w.departed).toEqual([]);
    expect(w.rules.death).toBe(true);
    for (const kind of ['firefighter', 'police', 'burglar', 'reaper']) expect(w.neighbors.some((n) => n.service === kind)).toBe(true);
  });

  it('casa inteira por 7 dias com os perigos ligados não desanda', () => {
    const sim = householdSim(7);
    run(sim, 7 * MINUTES_PER_DAY);
    expect(sim.world.fires.length).toBeLessThanOrEqual(16);
    for (const f of sim.world.folks) for (const v of Object.values(f.needs)) expect(Number.isFinite(v)).toBe(true);
    // ninguém do socorro fica preso no lote
    expect(sim.world.folks.filter((f) => f.visit?.service && ['firefighter', 'police', 'burglar'].includes(f.visit.service.kind)).length).toBeLessThanOrEqual(3);
  });
});
