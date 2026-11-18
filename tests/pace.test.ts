import { describe, expect, it } from 'vitest';
import { CATALOG } from '../src/data/catalog';
import { NEIGHBORS, NEIGHBOR_TIES } from '../src/data/neighbors';
import { TOWN } from '../src/data/town';
import {
  GESTURE_AFTER,
  GESTURE_EVERY,
  SAVE_VERSION,
  SKIP_SPEED,
  TICKS_PER_SECOND,
  canSkip,
  deserialize,
  fullNeeds,
  idleGesture,
  serialize,
  skipBlocker,
} from '../src/sim';
import type { Folk } from '../src/sim';
import { householdSim, run, starterSim } from './helpers';
import { play } from './helpers/player';

const CTX = { neighbors: NEIGHBORS, ties: NEIGHBOR_TIES, catalog: CATALOG, town: TOWN };

describe('ritmo do tempo (plano 2, bloco 1)', () => {
  it('normal 1 minuto por segundo, rápido 3, muito rápido 10, pular 60', () => {
    expect([...TICKS_PER_SECOND]).toEqual([0, 1, 3, 10, 60]);
    // a tela avança por acumulador: meio segundo no normal é meio minuto
    let acc = 0;
    let ticks = 0;
    for (let f = 0; f < 60; f++) {
      acc += (1 / 60) * TICKS_PER_SECOND[1];
      const n = Math.floor(acc);
      ticks += n;
      acc -= n;
    }
    expect(ticks + Math.round(acc)).toBe(1);
  });

  it('pular só vale com todos dormindo, fora ou ocupados com algo longo', () => {
    const sim = householdSim(3);
    const home = sim.residents();
    expect(canSkip(sim.world, CATALOG)).toBe(false);
    expect(sim.dispatch({ type: 'setSpeed', speed: SKIP_SPEED })).toBe(false);
    expect(sim.lastProblem).toBe('cantSkip');
    expect(skipBlocker(sim.world, CATALOG)).toBe(home[0]);

    // todo mundo deitado: dá para pular
    const beds = sim.world.objects.filter((o) => o.defId === 'bed' || o.defId === 'doublebed');
    expect(beds.length).toBeGreaterThan(0);
    home.forEach((f, i) => {
      f.needs = { ...f.needs, energy: 20 };
      expect(sim.dispatch({ type: 'queueUse', folkId: f.id, objectId: beds[i % beds.length].id, interactionId: 'sleep' })).toBe(true);
    });
    for (let i = 0; i < 60 && !canSkip(sim.world, CATALOG); i++) sim.step();
    expect(canSkip(sim.world, CATALOG)).toBe(true);
    expect(sim.dispatch({ type: 'setSpeed', speed: SKIP_SPEED })).toBe(true);
    expect(sim.world.speed).toBe(SKIP_SPEED);

    // alguém acorda (ordem nova): volta ao normal sozinho
    expect(sim.dispatch({ type: 'queueGoto', folkId: home[0].id, x: sim.world.exit.x, y: sim.world.exit.y - 1 })).toBe(true);
    sim.step();
    expect(sim.world.speed).toBe(1);
  });

  it('pular também volta ao normal quando o sono acaba', () => {
    const sim = starterSim(2, { ...fullNeeds(90), energy: 60 });
    const folk = sim.world.folks[0];
    const bed = sim.world.objects.find((o) => o.defId === 'bed')!;
    sim.dispatch({ type: 'queueUse', folkId: folk.id, objectId: bed.id, interactionId: 'sleep' });
    for (let i = 0; i < 60 && !canSkip(sim.world, CATALOG); i++) sim.step();
    expect(sim.dispatch({ type: 'setSpeed', speed: SKIP_SPEED })).toBe(true);
    for (let i = 0; i < 1440 && folk.queue.length > 0; i++) sim.step();
    sim.step();
    expect(sim.world.speed).toBe(1);
  });
});

describe('sem jogo sozinho (plano 2, bloco 1)', () => {
  it('parado, o folk faz gestos de espera que seguem a necessidade mais baixa', () => {
    const sim = starterSim(1, fullNeeds(90));
    const folk = sim.world.folks[0];
    const at = (needs: Partial<Folk['needs']>, idle: number) => {
      folk.needs = { ...fullNeeds(90), ...needs };
      folk.idleTicks = idle;
      return idleGesture(folk, sim.world.tick, 80);
    };
    expect(at({}, 0)).toBe('none');
    expect(at({ hunger: 10 }, GESTURE_AFTER)).toBe('belly');
    expect(at({ energy: 10 }, GESTURE_AFTER)).toBe('yawn');
    expect(at({ bladder: 10 }, GESTURE_AFTER + GESTURE_EVERY)).toBe('fidget');
    expect(at({}, GESTURE_AFTER + GESTURE_EVERY - 1)).toBe('none');
    expect(['look', 'stretch', 'scratch', 'arms']).toContain(at({}, GESTURE_AFTER));
    // com uma ordem na fila, nada de gesto
    folk.needs = fullNeeds(90);
    folk.queue = [{ id: 1, kind: 'goto', source: 'player', phase: 'queued', elapsed: 0, target: { x: 1, y: 1 } }];
    expect(idleGesture(folk, 0, 80)).toBe('none');
  });

  it('sem ordem, a casa sofre as consequências e o jogo não trava', () => {
    const sim = householdSim(6);
    run(sim, 2 * 1440);
    for (const f of sim.residents()) expect(f.needs.hunger).toBeLessThan(20);
    expect(sim.world.mess.length + sim.world.log.length).toBeGreaterThan(0);
    expect(sim.world.tick).toBeGreaterThan(2 * 1440);
  });

  it('o jogador de teste segura a casa: ninguém desmaia nem passa fome em 3 dias', () => {
    const sim = householdSim(6);
    const player = play(sim, 3 * 1440);
    expect(player.orders).toBeGreaterThan(30);
    expect(sim.world.log.some((l) => l.key === 'log.collapse')).toBe(false);
    for (const f of sim.residents()) expect(f.needs.hunger).toBeGreaterThan(10);
  });
});

describe('save v22 (plano 2, bloco 1)', () => {
  it('o save antigo perde a autonomia e o que era feito por conta própria', () => {
    const sim = householdSim(4);
    run(sim, 30);
    const old = JSON.parse(JSON.stringify(serialize(sim.world, 0)));
    old.version = 21;
    for (const f of old.world.folks) {
      f.autonomy = true;
      f.queue = [{ id: 999, kind: 'goto', source: 'auto', phase: 'queued', elapsed: 0, target: { x: 1, y: 1 } }];
    }
    const file = deserialize(old, CTX);
    expect(file.version).toBe(SAVE_VERSION);
    expect(SAVE_VERSION).toBeGreaterThanOrEqual(22);
    for (const f of file.world.folks) {
      expect('autonomy' in f).toBe(false);
      if (!f.visit) expect(f.queue).toHaveLength(0);
    }
  });
});
