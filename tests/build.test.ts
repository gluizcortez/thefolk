import { describe, expect, it } from 'vitest';
import { CATALOG } from '../src/data/catalog';
import { starterHouse } from '../src/data/house';
import {
  SAVE_VERSION,
  Sim,
  ambienceTarget,
  roomAt,
  roomsOf,
  createWorld,
  deserialize,
  facesOfEdge,
  findPath,
  isIndoorTile,
  legacyWindows,
  lineEdges,
  planBuild,
  roomFaces,
  serialize,
} from '../src/sim';
import { openField, run, starterSim } from './helpers';

const WALL = CATALOG.parts.wall.price;
const DOOR = CATALOG.parts.door.price;
const WINDOW = CATALOG.parts.window.price;

/** Caixa de paredes em volta do tile (x, y), traçada como 4 linhas. */
function box(sim: Sim, x: number, y: number): boolean[] {
  return [
    sim.dispatch({ type: 'buildWalls', x0: x, y0: y, x1: x + 1, y1: y }),
    sim.dispatch({ type: 'buildWalls', x0: x + 1, y0: y, x1: x + 1, y1: y + 1 }),
    sim.dispatch({ type: 'buildWalls', x0: x, y0: y + 1, x1: x + 1, y1: y + 1 }),
    sim.dispatch({ type: 'buildWalls', x0: x, y0: y, x1: x, y1: y + 1 }),
  ];
}

describe('modo construção: paredes', () => {
  it('linha de vértice a vértice vira bordas; linha torta não vale', () => {
    const { grid } = openField(6, 6, [], { x: 0, y: 0 }).world;
    expect(lineEdges(grid, 1, 2, 4, 2)).toEqual(['1,2,N', '2,2,N', '3,2,N']);
    expect(lineEdges(grid, 3, 4, 3, 1)).toEqual(['3,1,W', '3,2,W', '3,3,W']);
    // a divisa do lote aceita parede; fora dela, não
    expect(lineEdges(grid, 0, 0, 3, 0)).toEqual(['0,0,N', '1,0,N', '2,0,N']);
    expect(lineEdges(grid, 5, 6, 8, 6)).toEqual(['5,6,N']);
    expect(lineEdges(grid, 7, 0, 7, 2)).toEqual([]);
    expect(lineEdges(grid, 0, 0, 2, 2)).toBeNull();
  });

  it('cobra por trecho novo, bloqueia o caminho e não cobra o que já existe', () => {
    const sim = openField(6, 6, [], { x: 0, y: 0 }, 1, 1000);
    expect(sim.dispatch({ type: 'buildWalls', x0: 3, y0: 0, x1: 3, y1: 4 })).toBe(true);
    expect(sim.world.household.funds).toBe(1000 - 4 * WALL);
    expect(sim.getNav().canStep(2, 1, 3, 1)).toBe(false);
    // a linha maior só paga os dois trechos que faltam
    expect(sim.dispatch({ type: 'buildWalls', x0: 3, y0: 0, x1: 3, y1: 6 })).toBe(true);
    expect(sim.world.household.funds).toBe(1000 - 6 * WALL);
    // agora não há caminho de um lado ao outro
    expect(findPath(sim.getNav(), { x: 0, y: 0 }, { x: 5, y: 0 })).toBeNull();
  });

  it('linha só por cima do que já existe é recusada sem custo', () => {
    const sim = openField(6, 6, [], { x: 0, y: 0 });
    sim.dispatch({ type: 'buildWalls', x0: 1, y0: 3, x1: 4, y1: 3 });
    const funds = sim.world.household.funds;
    expect(sim.dispatch({ type: 'buildWalls', x0: 2, y0: 3, x1: 4, y1: 3 })).toBe(false);
    expect(sim.lastProblem).toBe('nothing');
    expect(sim.world.household.funds).toBe(funds);
  });

  it('sem dinheiro não constrói', () => {
    const sim = openField(6, 6, [], { x: 0, y: 0 }, 1, 2 * WALL);
    expect(sim.dispatch({ type: 'buildWalls', x0: 1, y0: 3, x1: 4, y1: 3 })).toBe(false);
    expect(sim.lastProblem).toBe('funds');
    expect(Object.keys(sim.world.grid.edges)).toHaveLength(0);
  });

  it('parede não corta objeto ao meio', () => {
    const sim = openField(6, 6, [{ defId: 'sofa', x: 2, y: 2 }], { x: 0, y: 0 });
    expect(sim.dispatch({ type: 'buildWalls', x0: 3, y0: 1, x1: 3, y1: 4 })).toBe(false);
    expect(sim.lastProblem).toBe('cutsObject');
  });

  it('não prende ninguém: a última parede da caixa em volta do folk é recusada', () => {
    const sim = openField(6, 6, [], { x: 2, y: 2 });
    expect(box(sim, 2, 2)).toEqual([true, true, true, false]);
    expect(sim.lastProblem).toBe('trapsFolk');
  });

  it('cômodo vazio pode ser fechado; a porta abre a passagem', () => {
    const sim = openField(6, 6, [], { x: 0, y: 0 }, 1, 1000);
    expect(box(sim, 3, 2)).toEqual([true, true, true, true]);
    expect(findPath(sim.getNav(), { x: 0, y: 0 }, { x: 3, y: 2 })).toBeNull();
    expect(sim.dispatch({ type: 'placeOpening', edge: '3,3,N', kind: 'door' })).toBe(true);
    expect(sim.world.household.funds).toBe(1000 - 4 * WALL - DOOR);
    expect(findPath(sim.getNav(), { x: 0, y: 0 }, { x: 3, y: 2 })).not.toBeNull();
  });

  it('não deixa objeto sem lado para usar', () => {
    const sim = openField(6, 6, [{ defId: 'plant', x: 3, y: 2 }], { x: 0, y: 0 });
    expect(box(sim, 3, 2)).toEqual([true, true, true, false]);
    expect(sim.lastProblem).toBe('blocksObject');
  });
});

describe('modo construção: portas e janelas', () => {
  it('porta e janela só entram em parede; janela não deixa passar', () => {
    const sim = openField(6, 6, [], { x: 0, y: 0 }, 1, 1000);
    expect(sim.dispatch({ type: 'placeOpening', edge: '3,2,W', kind: 'window' })).toBe(false);
    expect(sim.lastProblem).toBe('noWall');
    sim.dispatch({ type: 'buildWalls', x0: 3, y0: 0, x1: 3, y1: 6 });
    expect(sim.dispatch({ type: 'placeOpening', edge: '3,2,W', kind: 'window' })).toBe(true);
    expect(sim.world.grid.edges['3,2,W']).toBe('window');
    expect(sim.getNav().canStep(2, 2, 3, 2)).toBe(false);
    expect(sim.world.household.funds).toBe(1000 - 6 * WALL - WINDOW);
    // trocar a janela por porta
    expect(sim.dispatch({ type: 'placeOpening', edge: '3,2,W', kind: 'door' })).toBe(true);
    expect(sim.getNav().canStep(2, 2, 3, 2)).toBe(true);
    // pôr de novo o que já está lá não faz nada
    expect(sim.dispatch({ type: 'placeOpening', edge: '3,2,W', kind: 'door' })).toBe(false);
    expect(sim.lastProblem).toBe('nothing');
  });

  it('janela no cômodo clareia o ambiente (bloco 3: conta o cômodo todo)', () => {
    const sim = openField(8, 8, [], { x: 3, y: 3 }, 1, 4000);
    sim.world.tick = 12 * 60;
    // um cômodo fechado de 4x4 em volta do folk, com porta
    expect(sim.dispatch({ type: 'buildWalls', x0: 1, y0: 1, x1: 5, y1: 1 })).toBe(true);
    expect(sim.dispatch({ type: 'buildWalls', x0: 1, y0: 5, x1: 5, y1: 5 })).toBe(true);
    expect(sim.dispatch({ type: 'placeOpening', edge: '2,5,N', kind: 'door' })).toBe(true);
    expect(sim.dispatch({ type: 'buildWalls', x0: 1, y0: 1, x1: 1, y1: 5 })).toBe(true);
    expect(sim.dispatch({ type: 'buildWalls', x0: 5, y0: 1, x1: 5, y1: 5 })).toBe(true);
    expect(roomAt(roomsOf(sim.world, CATALOG), 3, 3)?.outdoor).toBe(false);
    const before = ambienceTarget(sim.world, CATALOG, sim.world.folks[0]);
    sim.dispatch({ type: 'placeOpening', edge: '3,1,N', kind: 'window' });
    expect(ambienceTarget(sim.world, CATALOG, sim.world.folks[0])).toBeGreaterThanOrEqual(before + CATALOG.parts.window.ambience);
  });
});

describe('modo construção: pisos e revestimentos', () => {
  it('piso em retângulo cobra por tile trocado e muda o que é dentro e fora', () => {
    const sim = openField(6, 6, [], { x: 0, y: 0 }, 1, 1000);
    const price = CATALOG.floors.parquet.price;
    expect(isIndoorTile(sim.world.grid, CATALOG, 2, 2)).toBe(false);
    expect(sim.dispatch({ type: 'paintFloor', x0: 3, y0: 3, x1: 1, y1: 2, floorId: 'parquet' })).toBe(true);
    expect(sim.world.household.funds).toBe(1000 - 6 * price);
    expect(isIndoorTile(sim.world.grid, CATALOG, 2, 2)).toBe(true);
    // repetir só cobra o que mudou
    expect(sim.dispatch({ type: 'paintFloor', x0: 1, y0: 2, x1: 4, y1: 2, floorId: 'parquet' })).toBe(true);
    expect(sim.world.household.funds).toBe(1000 - 7 * price);
    // grama é de graça
    expect(sim.dispatch({ type: 'paintFloor', x0: 0, y0: 0, x1: 5, y1: 5, floorId: 'grass' })).toBe(true);
    expect(sim.world.household.funds).toBe(1000 - 7 * price);
    expect(sim.dispatch({ type: 'paintFloor', x0: 0, y0: 0, x1: 1, y1: 1, floorId: 'marble' })).toBe(false);
    expect(sim.lastProblem).toBe('unknown');
  });

  it('o cômodo inteiro recebe o revestimento, uma face por trecho de parede', () => {
    const sim = openField(6, 6, [], { x: 0, y: 0 }, 1, 1000);
    sim.dispatch({ type: 'buildWalls', x0: 2, y0: 1, x1: 4, y1: 1 });
    sim.dispatch({ type: 'buildWalls', x0: 4, y0: 1, x1: 4, y1: 3 });
    sim.dispatch({ type: 'buildWalls', x0: 2, y0: 3, x1: 4, y1: 3 });
    sim.dispatch({ type: 'buildWalls', x0: 2, y0: 1, x1: 2, y1: 3 });
    const faces = roomFaces(sim.world.grid, 2, 1);
    expect(faces).toHaveLength(8);
    const funds = sim.world.household.funds;
    expect(sim.dispatch({ type: 'paintWalls', faces, coveringId: 'stripes' })).toBe(true);
    expect(sim.world.household.funds).toBe(funds - 8 * CATALOG.coverings.stripes.price);
    expect(sim.world.grid.coverings['2,1,N']).toBe('stripes');
    // o lado de fora da mesma parede não mudou
    expect(sim.world.grid.coverings['2,0,S']).toBeUndefined();
    // face sem parede não aceita revestimento
    expect(sim.dispatch({ type: 'paintWalls', faces: ['0,0,E'], coveringId: 'stripes' })).toBe(false);
    expect(sim.lastProblem).toBe('noWall');
  });

  it('apagar parede é de graça e leva junto o revestimento das duas faces', () => {
    const sim = openField(6, 6, [], { x: 0, y: 0 }, 1, 1000);
    sim.dispatch({ type: 'buildWalls', x0: 1, y0: 3, x1: 4, y1: 3 });
    sim.dispatch({ type: 'paintWalls', faces: facesOfEdge('2,3,N'), coveringId: 'brick' });
    const funds = sim.world.household.funds;
    expect(sim.dispatch({ type: 'eraseWalls', x0: 0, y0: 3, x1: 6, y1: 3 })).toBe(true);
    expect(sim.world.grid.edges).toEqual({});
    expect(sim.world.grid.coverings).toEqual({});
    expect(sim.world.household.funds).toBe(funds);
  });
});

describe('modo construção: desfazer, prévia e save', () => {
  it('desfazer volta o grid e o dinheiro exatamente como eram', () => {
    const sim = starterSim();
    const grid = JSON.stringify(sim.world.grid);
    const funds = sim.world.household.funds;
    expect(sim.dispatch({ type: 'buildWalls', x0: 3, y0: 12, x1: 6, y1: 12 })).toBe(true);
    expect(sim.dispatch({ type: 'paintFloor', x0: 3, y0: 12, x1: 5, y1: 12, floorId: 'slate' })).toBe(true);
    expect(sim.dispatch({ type: 'paintWalls', faces: roomFaces(sim.world.grid, 4, 4), coveringId: 'panel' })).toBe(true);
    expect(sim.undoDepth).toBe(3);
    for (let i = 0; i < 3; i++) expect(sim.dispatch({ type: 'undoBuild' })).toBe(true);
    expect(JSON.stringify(sim.world.grid)).toBe(grid);
    expect(sim.world.household.funds).toBe(funds);
    expect(sim.dispatch({ type: 'undoBuild' })).toBe(false);
    expect(sim.lastProblem).toBe('undoEmpty');
  });

  it('desfazer que quebraria a casa é recusado', () => {
    const sim = openField(6, 6, [], { x: 0, y: 0 }, 1, 3000);
    sim.dispatch({ type: 'buildWalls', x0: 3, y0: 1, x1: 3, y1: 4 });
    sim.dispatch({ type: 'eraseWalls', x0: 3, y0: 2, x1: 3, y1: 3 });
    // um sofá passa por onde a parede estava
    expect(sim.dispatch({ type: 'buy', defId: 'sofa', x: 2, y: 2, rot: 0 })).toBe(true);
    expect(sim.dispatch({ type: 'undoBuild' })).toBe(false);
    expect(sim.lastProblem).toBe('undoBlocked');
  });

  it('a prévia diz custo e problema sem mudar nada', () => {
    const sim = openField(6, 6, [], { x: 2, y: 2 });
    const snapshot = JSON.stringify(sim.world);
    const plan = planBuild(sim.world, CATALOG, { type: 'buildWalls', x0: 1, y0: 4, x1: 5, y1: 4 });
    expect(plan).toMatchObject({ ok: true, cost: 4 * WALL });
    // a linha inteira separaria o folk da calçada
    expect(planBuild(sim.world, CATALOG, { type: 'buildWalls', x0: 0, y0: 4, x1: 6, y1: 4 }).problem).toBe('trapsFolk');
    expect(JSON.stringify(sim.world)).toBe(snapshot);
  });

  it('a casa continua alcançável pela calçada: quem chega de fora acha a porta', () => {
    const sim = starterSim();
    // a porta da frente vira janela: a sala ainda tem a porta do quarto, mas
    // nenhuma saída para a rua
    expect(sim.dispatch({ type: 'placeOpening', edge: '7,11,N', kind: 'window' })).toBe(false);
    expect(sim.lastProblem).toBe('trapsFolk');
    // abrir outra porta antes resolve
    expect(sim.dispatch({ type: 'placeOpening', edge: '11,11,N', kind: 'door' })).toBe(true);
    expect(sim.dispatch({ type: 'placeOpening', edge: '7,11,N', kind: 'window' })).toBe(true);
  });

  it('obra salva e carregada continua igual, e o futuro também', () => {
    const a = starterSim(5);
    a.dispatch({ type: 'buildWalls', x0: 3, y0: 12, x1: 7, y1: 12 });
    a.dispatch({ type: 'paintFloor', x0: 3, y0: 12, x1: 6, y1: 13, floorId: 'checker' });
    run(a, 300);
    const b = new Sim(CATALOG, deserialize(JSON.parse(JSON.stringify(serialize(a.world, 0)))).world);
    run(a, 1500);
    run(b, 1500);
    expect(JSON.stringify(b.world)).toBe(JSON.stringify(a.world));
  });

  it('save da fatia 3 vira v4: as janelas de enfeite viram janelas de verdade', () => {
    const fresh = createWorld(starterHouse(3));
    const old = JSON.parse(JSON.stringify(serialize(fresh, 0)));
    old.version = 3;
    for (const [k, v] of Object.entries(old.world.grid.edges)) if (v === 'window') old.world.grid.edges[k] = 'wall';
    delete old.world.grid.coverings;
    expect(legacyWindows(old.world.grid).sort()).toEqual(
      Object.keys(fresh.grid.edges)
        .filter((k) => fresh.grid.edges[k] === 'window')
        .sort(),
    );
    const loaded = deserialize(old);
    expect(loaded.version).toBe(SAVE_VERSION);
    expect(loaded.world.grid).toEqual(fresh.grid);
  });
});
