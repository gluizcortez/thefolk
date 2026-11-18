import { describe, expect, it } from 'vitest';
import { CATALOG } from '../src/data/catalog';
import {
  SAVE_VERSION,
  STAIR_RUN,
  buildNav,
  deserialize,
  findPath,
  levelOfRow,
  planBuild,
  roofHeights,
  roofMask,
  rowOn,
  rowsOf,
  serialize,
  stairPlan,
} from '../src/sim';
import type { Sim } from '../src/sim';
import { NEIGHBORS } from '../src/data/neighbors';
import { householdSim, run, starterSim } from './helpers';

const UP = (y: number) => rowOn({ h: 14 } as never, 1, y);

/** Monta o andar de cima sobre a sala da casa pronta, com escada. */
function sobrado(sim: Sim): void {
  sim.world.household.funds = 20000;
  const ok = (cmd: Parameters<Sim['dispatch']>[0]) => {
    const r = sim.dispatch(cmd);
    if (!r) throw new Error(`${cmd.type}: ${sim.lastProblem}`);
  };
  ok({ type: 'paintFloor', x0: 3, y0: UP(6), x1: 13, y1: UP(10), floorId: 'wood' });
  ok({ type: 'buildWalls', x0: 3, y0: UP(6), x1: 14, y1: UP(6) });
  ok({ type: 'buildWalls', x0: 14, y0: UP(6), x1: 14, y1: UP(11) });
  ok({ type: 'buildWalls', x0: 14, y0: UP(11), x1: 3, y1: UP(11) });
  ok({ type: 'buildWalls', x0: 3, y0: UP(11), x1: 3, y1: UP(6) });
  ok({ type: 'placeStairs', x: 10, y: 10, dir: 'E' });
}

describe('andares (bloco 12)', () => {
  it('o lote nasce com três andares e o vão entre eles fica fora do terreno', () => {
    const sim = starterSim();
    const grid = sim.world.grid;
    expect(grid.levels).toBe(3);
    expect(rowsOf(grid)).toBe(14 + 2 * 16);
    expect(grid.floor.length).toBe(grid.w * rowsOf(grid));
    expect(levelOfRow(grid, 13)).toBe(0);
    expect(levelOfRow(grid, 14)).toBe(-1);
    expect(levelOfRow(grid, 16)).toBe(1);
    expect(grid.floor[UP(7) * grid.w + 5]).toBe('void');
    // ninguém pisa no andar de cima sem piso
    expect(buildNav(sim.world, CATALOG).isFree(5, UP(7))).toBe(false);
  });

  it('piso de cima precisa de cômodo embaixo', () => {
    const sim = starterSim();
    sim.world.household.funds = 5000;
    // em cima da grama do quintal, não
    const yard = planBuild(sim.world, CATALOG, { type: 'paintFloor', x0: 0, y0: UP(0), x1: 1, y1: UP(1), floorId: 'wood' });
    expect(yard.problem).toBe('noSupport');
    const room = planBuild(sim.world, CATALOG, { type: 'paintFloor', x0: 4, y0: UP(7), x1: 6, y1: UP(8), floorId: 'wood' });
    expect(room.ok).toBe(true);
    expect(room.cost).toBe(6 * 10);
  });

  it('parede de cima precisa de apoio (piso do lado ou parede embaixo)', () => {
    const sim = starterSim();
    sim.world.household.funds = 5000;
    const loose = planBuild(sim.world, CATALOG, { type: 'buildWalls', x0: 0, y0: UP(0), x1: 2, y1: UP(0) });
    expect(loose.problem).toBe('noSupport');
    // em cima da parede de fora da casa, pode
    const over = planBuild(sim.world, CATALOG, { type: 'buildWalls', x0: 3, y0: UP(2), x1: 8, y1: UP(2) });
    expect(over.ok).toBe(true);
  });

  it('escada liga os andares, abre o vão e o caminho sobe por ela', () => {
    const sim = starterSim();
    sobrado(sim);
    const grid = sim.world.grid;
    expect(grid.stairs).toHaveLength(1);
    const plan = stairPlan(grid, grid.stairs![0]);
    expect(plan.run).toHaveLength(STAIR_RUN);
    for (const t of plan.hole) expect(grid.floor[t.y * grid.w + t.x]).toBe('void');
    expect(plan.landing).toEqual({ x: 13, y: UP(10) });
    const nav = buildNav(sim.world, CATALOG);
    const path = findPath(nav, { x: 5, y: 9 }, { x: 5, y: UP(8) });
    expect(path).not.toBeNull();
    // passa pelos degraus em ordem e chega pelo patamar
    const steps = path!.map((p) => `${p.x},${p.y}`);
    const i = steps.indexOf('10,10');
    expect(steps.slice(i, i + 4)).toEqual(['10,10', '11,10', '12,10', `13,${UP(10)}`]);
    // do degrau não se sai pelo lado
    expect(nav.canStep(11, 10, 11, 9)).toBe(false);
  });

  it('escada precisa de andar de cima com patamar', () => {
    const sim = starterSim();
    sim.world.household.funds = 5000;
    const plan = planBuild(sim.world, CATALOG, { type: 'placeStairs', x: 10, y: 10, dir: 'E' });
    expect(plan.problem).toBe('noLanding');
    const top = planBuild(sim.world, CATALOG, { type: 'placeStairs', x: 10, y: UP(38 - 16 - 16 + 4), dir: 'E' });
    expect(top.ok).toBe(false);
  });

  it('parede não corta escada, e quem está em cima não fica preso', () => {
    const sim = starterSim();
    sobrado(sim);
    const cut = planBuild(sim.world, CATALOG, { type: 'buildWalls', x0: 11, y0: 9, x1: 11, y1: 11 });
    expect(cut.problem).toBe('cutsStairs');
    sim.world.folks[0].x = 6;
    sim.world.folks[0].y = UP(8);
    sim.world.folks[0].px = 6;
    sim.world.folks[0].py = UP(8);
    const gone = planBuild(sim.world, CATALOG, { type: 'removeStairs', x: 11, y: 10 });
    expect(gone.problem).toBe('trapsFolk');
  });

  it('o folk sobe a escada para dormir na cama do andar de cima', () => {
    const sim = starterSim(3, { energy: 12 });
    sobrado(sim);
    // as camas de baixo vão embora; a nova fica em cima
    for (const o of [...sim.world.objects]) if (o.defId === 'bed') expect(sim.dispatch({ type: 'sell', objectId: o.id })).toBe(true);
    expect(sim.dispatch({ type: 'buy', defId: 'bed', x: 4, y: UP(7), rot: 0 })).toBe(true);
    const folk = sim.world.folks[0];
    let climbed = false;
    let slept = false;
    for (let i = 0; i < 400 && !slept; i++) {
      run(sim, 1);
      if (levelOfRow(sim.world.grid, folk.y) === 0 && folk.x >= 10 && folk.x <= 12 && folk.y === 10) climbed = true;
      const a = folk.queue[0];
      slept = a?.phase === 'using' && sim.world.objects.find((o) => o.id === a.objectId)?.defId === 'bed';
    }
    expect(climbed).toBe(true);
    expect(slept).toBe(true);
    expect(levelOfRow(sim.world.grid, folk.y)).toBe(1);
  });

  it('meia parede fecha o passo mas não divide o cômodo', () => {
    const sim = starterSim();
    sim.world.household.funds = 5000;
    expect(sim.dispatch({ type: 'buildHalfWalls', x0: 8, y0: 7, x1: 8, y1: 9 })).toBe(true);
    expect(sim.world.grid.edges['8,7,W']).toBe('half');
    const nav = buildNav(sim.world, CATALOG);
    expect(nav.canStep(7, 7, 8, 7)).toBe(false);
  });

  it('portas de estilo e arco deixam passar; janela alta e basculante, não', () => {
    const sim = starterSim();
    sim.world.household.funds = 5000;
    for (const [edge, kind] of [
      ['4,6,N', 'doorGlass'],
      ['9,6,N', 'arch'],
    ] as const) {
      expect(sim.dispatch({ type: 'placeOpening', edge, kind })).toBe(true);
    }
    expect(sim.dispatch({ type: 'placeOpening', edge: '3,9,W', kind: 'windowTall' })).toBe(true);
    const nav = buildNav(sim.world, CATALOG);
    expect(nav.canStep(4, 6, 4, 5)).toBe(true);
    expect(nav.canStep(9, 6, 9, 5)).toBe(true);
    expect(nav.canStep(3, 9, 2, 9)).toBe(false);
    // meia parede não recebe porta
    sim.dispatch({ type: 'buildHalfWalls', x0: 8, y0: 7, x1: 8, y1: 8 });
    expect(planBuild(sim.world, CATALOG, { type: 'placeOpening', edge: '8,7,W', kind: 'door' }).problem).toBe('noWall');
  });

  it('colunas e telhado entram e saem pelo desfazer', () => {
    const sim = starterSim();
    expect(sim.dispatch({ type: 'toggleColumn', x: 1, y: 12 })).toBe(true);
    expect(sim.world.grid.columns).toEqual(['1,12']);
    expect(sim.dispatch({ type: 'setRoof', style: 'gable', color: 'slate' })).toBe(true);
    expect(sim.world.grid.roof).toEqual({ style: 'gable', color: 'slate' });
    expect(sim.dispatch({ type: 'undoBuild' })).toBe(true);
    expect(sim.world.grid.roof).toEqual({ style: 'hip', color: 'terracotta' });
    expect(sim.dispatch({ type: 'undoBuild' })).toBe(true);
    expect(sim.world.grid.columns).toEqual([]);
  });

  it('escada desfeita fecha o vão de volta', () => {
    const sim = starterSim();
    sobrado(sim);
    const hole = stairPlan(sim.world.grid, sim.world.grid.stairs![0]).hole;
    expect(sim.dispatch({ type: 'undoBuild' })).toBe(true);
    expect(sim.world.grid.stairs).toEqual([]);
    for (const t of hole) expect(sim.world.grid.floor[t.y * sim.world.grid.w + t.x]).toBe('wood');
  });
});

describe('telhado (bloco 12)', () => {
  it('cobre o térreo da casa pronta e sai de cima do que ganhou andar', () => {
    const sim = starterSim();
    const before = roofMask(sim.world.grid, CATALOG);
    const w = sim.world.grid.w;
    expect(before[0][7 * w + 5]).toBe(1);
    expect(before[0][0]).toBe(0);
    sobrado(sim);
    const after = roofMask(sim.world.grid, CATALOG);
    // a sala ganhou quarto em cima: o telhado sobe para o andar 1
    expect(after[0][7 * w + 5]).toBe(0);
    expect(after[1][7 * w + 5]).toBe(1);
    // o quarto dos fundos continua com telhado no térreo
    expect(after[0][3 * w + 5]).toBe(1);
  });

  it('quatro águas sobe do beiral para o meio; duas águas deixa oitões nas pontas', () => {
    const mask = new Uint8Array(6 * 4).fill(1);
    const hip = roofHeights(mask, 6, 4, 'hip');
    const at = (a: Float32Array, x: number, y: number) => a[y * 7 + x];
    expect(at(hip, 0, 0)).toBe(0);
    expect(at(hip, 3, 2)).toBeGreaterThan(at(hip, 1, 1));
    // a ponta da casa em quatro águas fica rente ao beiral
    expect(at(hip, 0, 2)).toBe(0);
    const gable = roofHeights(mask, 6, 4, 'gable');
    // em duas águas, a ponta sobe até a cumeeira (o oitão)
    expect(at(gable, 0, 2)).toBeCloseTo(at(gable, 3, 2));
    expect(at(gable, 3, 0)).toBe(0);
    expect(at(gable, 7 - 1, 2)).toBeGreaterThan(0);
  });
});

describe('save v16 (bloco 12)', () => {
  it('save v15 abre com os andares vazios, sem escadas e com telhado padrão', () => {
    const sim = householdSim();
    const old = serialize(sim.world, 0) as unknown as { version: number; world: Record<string, unknown> };
    const grid = { ...(old.world.grid as Record<string, unknown>) };
    const h = grid.h as number;
    const w = grid.w as number;
    grid.floor = (grid.floor as string[]).slice(0, w * h);
    delete grid.levels;
    delete grid.stairs;
    delete grid.columns;
    delete grid.roof;
    old.world.grid = grid;
    old.version = 15;
    const up = deserialize(old, { neighbors: NEIGHBORS, catalog: CATALOG });
    expect(up.version).toBe(SAVE_VERSION);
    expect(SAVE_VERSION).toBeGreaterThanOrEqual(16);
    expect(up.world.grid.levels).toBe(3);
    expect(up.world.grid.floor.length).toBe(w * rowsOf(up.world.grid));
    expect(up.world.grid.floor.slice(0, w * h)).toEqual(sim.world.grid.floor.slice(0, w * h));
    expect(up.world.grid.stairs).toEqual([]);
    expect(up.world.grid.roof).toEqual({ style: 'hip', color: 'terracotta' });
  });
});

describe('semana no sobrado (bloco 12)', () => {
  it('a casa pronta com andar de cima e escada aguenta sete dias sem travar', () => {
    const sim = householdSim(7);
    sobrado(sim);
    // um quarto em cima: as camas sobem
    const beds = sim.world.objects.filter((o) => o.defId === 'bed');
    beds.forEach((b, i) => expect(sim.dispatch({ type: 'move', objectId: b.id, x: 4 + i * 2, y: UP(7), rot: 0 })).toBe(true));
    let upstairs = 0;
    for (let day = 0; day < 7; day++) {
      for (let m = 0; m < 1440; m++) {
        sim.step();
        if (sim.world.folks.some((f) => !f.away && levelOfRow(sim.world.grid, f.y) === 1)) upstairs++;
      }
    }
    expect(upstairs).toBeGreaterThan(300);
    for (const f of sim.world.folks) {
      expect(levelOfRow(sim.world.grid, f.y)).toBeGreaterThanOrEqual(0);
      expect(f.needs.energy).toBeGreaterThan(5);
    }
  });
});
