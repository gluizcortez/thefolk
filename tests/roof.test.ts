import { describe, expect, it } from 'vitest';
import { CATALOG } from '../src/data/catalog';
import { NEIGHBORS } from '../src/data/neighbors';
import {
  PITCH,
  ROOF_FLAT,
  ROOF_SLOPE,
  SAVE_VERSION,
  deserialize,
  gridFromMap,
  planBuild,
  roofArea,
  roofEaves,
  roofHeights,
  roofMask,
  roofRidges,
  rowOn,
  serialize,
  storied,
} from '../src/sim';
import type { Grid } from '../src/sim';
import { ROOM_ZOOM, WALL_MODES, shownWallMode, stepWallMode } from '../src/game/viewMode';
import { TOWN } from '../src/data/town';
import { starterHouse } from '../src/data/house';
import { Sim, createWorld, foundTown } from '../src/sim';
import { starterSim } from './helpers';

function townSim(): Sim {
  const world = createWorld(starterHouse(3));
  foundTown(world, CATALOG, TOWN);
  return new Sim(CATALOG, world);
}

const STYLES = {
  '.': { floor: 'grass', indoor: false },
  r: { floor: 'wood', indoor: true },
  k: { floor: 'kitchen', indoor: true },
  // varanda: piso de dentro, sem paredes em volta
  p: { floor: 'wood', indoor: false },
  // pátio cercado: grama dentro das paredes
  g: { floor: 'grass', indoor: true },
};

function lot(rows: string[]): Grid {
  return storied(gridFromMap(rows, STYLES, []));
}

/** A máscara do térreo em texto: # telha, = laje, . nada. */
function drawn(grid: Grid): string[] {
  const m = roofMask(grid, CATALOG)[0];
  const out: string[] = [];
  for (let y = 0; y < grid.h; y++) {
    let line = '';
    for (let x = 0; x < grid.w; x++) line += m[y * grid.w + x] === ROOF_SLOPE ? '#' : m[y * grid.w + x] === ROOF_FLAT ? '=' : '.';
    out.push(line);
  }
  return out;
}

const L_HOUSE = [
  '........',
  '.rrr....',
  '.rrr....',
  '.rrkkkk.',
  '.rrkkkk.',
  '........',
];

const U_HOUSE = [
  '.........',
  '.rr...kk.',
  '.rr...kk.',
  '.rrrrrkk.',
  '.rrrrrkk.',
  '.........',
];

const PATIO_HOUSE = [
  '.........',
  '.rrrrrrr.',
  '.rrrrrrr.',
  '.rrgggrr.',
  '.rrgggrr.',
  '.rrrrrrr.',
  '.........',
];

describe('telhado em toda casa (plano 2, bloco 3)', () => {
  it('forma em L: cobre os dois braços e nada do quintal', () => {
    expect(drawn(lot(L_HOUSE))).toEqual(['........', '.###....', '.###....', '.######.', '.######.', '........']);
  });

  it('forma em U: cobre as três alas e deixa o meio aberto', () => {
    expect(drawn(lot(U_HOUSE))).toEqual(['.........', '.##...##.', '.##...##.', '.#######.', '.#######.', '.........']);
  });

  it('pátio cercado de paredes fica a céu aberto', () => {
    const grid = lot(PATIO_HOUSE);
    expect(drawn(grid)).toEqual(['.........', '.#######.', '.#######.', '.##...##.', '.##...##.', '.#######.', '.........']);
    // as quatro águas descem também para dentro, na beira do pátio
    const m = roofMask(grid, CATALOG)[0];
    const hip = roofHeights(m, grid.w, grid.h, 'hip');
    const W = grid.w + 1;
    expect(hip[3 * W + 3]).toBe(0);
    expect(hip[3 * W + 6]).toBe(0);
    expect(hip[2 * W + 2]).toBeGreaterThan(0);
  });

  it('varanda coberta junto da casa ganha telhado; piso solto no quintal não', () => {
    const grid = lot(['..........', '.rrrr.....', '.rrrr.....', '.pppp...p.', '..........']);
    expect(drawn(grid)).toEqual(['..........', '.####.....', '.####.....', '.####.....', '..........']);
  });

  it('a casa pronta inteira tem telhado, e o bairro também', () => {
    const sim = townSim();
    expect(roofArea(sim.world.grid, CATALOG)).toBeGreaterThan(40);
    const homes = sim.world.town!.lots.filter((l) => l.home);
    expect(homes.length).toBeGreaterThan(0);
    for (const l of homes) {
      if (!l.home) continue;
      const built = Object.values(l.home.grid.edges).some((k) => k === 'wall');
      if (built) expect(roofArea(l.home.grid, CATALOG)).toBeGreaterThan(0);
      expect(l.home.grid.roof).toBeTruthy();
    }
  });

  it('uma água: alta atrás, baixa na frente, sem cumeeira no meio', () => {
    const mask = new Uint8Array(6 * 4).fill(1);
    const shed = roofHeights(mask, 6, 4, 'shed');
    const at = (x: number, y: number) => shed[y * 7 + x];
    expect(at(3, 4)).toBe(0);
    expect(at(3, 0)).toBeGreaterThan(at(3, 2));
    expect(at(3, 2)).toBeGreaterThan(at(3, 4));
    // a ponta de trás sobe em trapézio (oitão), igual nas duas pontas
    expect(at(0, 0)).toBeCloseTo(at(6, 0));
  });

  it('a inclinação muda a altura da cumeeira', () => {
    const mask = new Uint8Array(6 * 4).fill(1);
    const low = roofHeights(mask, 6, 4, 'gable', PITCH.low);
    const steep = roofHeights(mask, 6, 4, 'gable', PITCH.steep);
    expect(steep[2 * 7 + 3]).toBeGreaterThan(low[2 * 7 + 3]);
  });

  it('cumeeira corre no alto das duas águas; calha nas beiras baixas', () => {
    const mask = new Uint8Array(6 * 4).fill(1);
    const gable = roofHeights(mask, 6, 4, 'gable');
    const ridges = roofRidges(gable, 6, 4);
    expect(ridges.length).toBe(6);
    expect(ridges.every((r) => r.y0 === 2 && r.y1 === 2)).toBe(true);
    const eaves = roofEaves(mask, gable, 6, 4);
    // só as beiras compridas (frente e fundo); as pontas são oitão
    expect(eaves.length).toBe(12);
    expect(eaves.every((e) => e.dy !== 0)).toBe(true);
    // quatro águas: calha em volta toda
    const hip = roofHeights(mask, 6, 4, 'hip');
    expect(roofEaves(mask, hip, 6, 4).length).toBe(20);
  });

  it('laje fica fora das águas e conta no telhado', () => {
    const mask = new Uint8Array(6 * 4).fill(1);
    for (let y = 0; y < 4; y++) mask[y * 6 + 5] = ROOF_FLAT;
    const hip = roofHeights(mask, 6, 4, 'hip');
    // a coluna de laje não sobe: o vértice só dela fica fora
    expect(hip[0 * 7 + 6]).toBe(-1);
  });
});

describe('obra do telhado (plano 2, bloco 3)', () => {
  it('forma, inclinação e cor mudam juntas e o desfazer volta', () => {
    const sim = starterSim();
    sim.world.household.funds = 5000;
    expect(sim.dispatch({ type: 'setRoof', style: 'shed', color: 'slate', pitch: 'steep' })).toBe(true);
    expect(sim.world.grid.roof).toMatchObject({ style: 'shed', color: 'slate', pitch: 'steep' });
    // mesma coisa de novo não custa nem muda
    expect(planBuild(sim.world, CATALOG, { type: 'setRoof', style: 'shed', color: 'slate', pitch: 'steep' }).problem).toBe('nothing');
    expect(sim.dispatch({ type: 'undoBuild' })).toBe(true);
    expect(sim.world.grid.roof).toMatchObject({ style: 'hip', pitch: 'mid' });
  });

  it('laje se marca por retângulo, cobra por tile e sai pelo desfazer', () => {
    const sim = starterSim();
    sim.world.household.funds = 5000;
    const grid = sim.world.grid;
    const before = roofMask(grid, CATALOG)[0];
    expect(before[7 * grid.w + 5]).toBe(ROOF_SLOPE);
    // no quintal não há telhado para virar laje
    expect(planBuild(sim.world, CATALOG, { type: 'markFlatRoof', x0: 0, y0: 0, x1: 0, y1: 0, flat: true }).problem).toBe('noRoof');
    const plan = planBuild(sim.world, CATALOG, { type: 'markFlatRoof', x0: 5, y0: 7, x1: 6, y1: 8, flat: true });
    expect(plan.ok).toBe(true);
    expect(plan.cost).toBe(4 * CATALOG.parts.slab.price);
    const funds = sim.world.household.funds;
    expect(sim.dispatch({ type: 'markFlatRoof', x0: 5, y0: 7, x1: 6, y1: 8, flat: true })).toBe(true);
    expect(sim.world.household.funds).toBe(funds - plan.cost);
    expect(roofMask(sim.world.grid, CATALOG)[0][7 * grid.w + 5]).toBe(ROOF_FLAT);
    // tirar a laje volta a telha
    expect(sim.dispatch({ type: 'markFlatRoof', x0: 5, y0: 7, x1: 5, y1: 7, flat: false })).toBe(true);
    expect(roofMask(sim.world.grid, CATALOG)[0][7 * grid.w + 5]).toBe(ROOF_SLOPE);
    expect(sim.dispatch({ type: 'undoBuild' })).toBe(true);
    expect(sim.dispatch({ type: 'undoBuild' })).toBe(true);
    expect(sim.world.grid.roof?.flat).toEqual([]);
  });

  it('laje marcada no andar de cima vale para o andar de cima', () => {
    const sim = starterSim();
    sim.world.household.funds = 5000;
    // sem cômodo em cima, o andar 1 não tem telhado
    const y = rowOn(sim.world.grid, 1, 7);
    expect(planBuild(sim.world, CATALOG, { type: 'markFlatRoof', x0: 5, y0: y, x1: 5, y1: y, flat: true }).problem).toBe('noRoof');
  });
});

describe('modos de vista (plano 2, bloco 3)', () => {
  const far = { building: false, roofTool: false, viewHeight: 11 };
  it('quatro modos, do mais baixo ao telhado, sem dar a volta', () => {
    expect(WALL_MODES).toEqual(['down', 'cutaway', 'up', 'roof']);
    expect(stepWallMode('cutaway', 1)).toBe('up');
    expect(stepWallMode('up', 1)).toBe('roof');
    expect(stepWallMode('roof', 1)).toBe('roof');
    expect(stepWallMode('down', -1)).toBe('down');
  });

  it('o telhado some sozinho na obra e de perto, e volta ao afastar', () => {
    expect(shownWallMode('roof', false, far)).toBe('roof');
    expect(shownWallMode('roof', false, { ...far, building: true })).toBe('cutaway');
    expect(shownWallMode('roof', false, { ...far, viewHeight: ROOM_ZOOM - 1 })).toBe('cutaway');
    expect(shownWallMode('roof', false, far)).toBe('roof');
  });

  it('modo fixo não muda sozinho; ferramenta de telhado sempre mostra o telhado', () => {
    expect(shownWallMode('roof', true, { ...far, building: true, viewHeight: 4 })).toBe('roof');
    expect(shownWallMode('down', false, { ...far, viewHeight: 4 })).toBe('down');
    expect(shownWallMode('cutaway', false, { ...far, building: true, roofTool: true })).toBe('roof');
  });
});

describe('save v23 (plano 2, bloco 3)', () => {
  it('save v22 abre com inclinação média e sem laje, na casa e no bairro', () => {
    const sim = townSim();
    expect(sim.world.town!.lots.some((l) => l.home)).toBe(true);
    const old = JSON.parse(JSON.stringify(serialize(sim.world, 0))) as { version: number; world: Record<string, any> };
    old.version = 22;
    old.world.grid.roof = { style: 'gable', color: 'moss' };
    for (const l of old.world.town?.lots ?? []) if (l.home) l.home.grid.roof = { style: 'hip', color: 'slate' };
    const up = deserialize(old, { neighbors: NEIGHBORS, catalog: CATALOG });
    expect(up.version).toBe(SAVE_VERSION);
    expect(SAVE_VERSION).toBeGreaterThanOrEqual(23);
    expect(up.world.grid.roof).toEqual({ style: 'gable', color: 'moss', pitch: 'mid', flat: [] });
    for (const l of up.world.town?.lots ?? []) if (l.home) expect(l.home.grid.roof).toEqual({ style: 'hip', color: 'slate', pitch: 'mid', flat: [] });
  });
});
