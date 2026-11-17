import { describe, expect, it } from 'vitest';
import { CATALOG } from '../src/data/catalog';
import { NEIGHBORS, NEIGHBOR_TIES } from '../src/data/neighbors';
import { starterHouse } from '../src/data/house';
import {
  SAVE_VERSION,
  Sim,
  ambienceTarget,
  checkPlacement,
  computeRooms,
  createWorld,
  deserialize,
  gridFromMap,
  isDark,
  lightsIn,
  roomAt,
  roomKind,
  roomScore,
  roomsOf,
  serialize,
} from '../src/sim';
import type { World, WorldSeed } from '../src/sim';
import { householdSim, run, starterSim } from './helpers';

const NOON = 12 * 60;
const NIGHT = 22 * 60;

/** Terreno com cômodos desenhados em letras (paredes nascem entre letras). */
function mapSim(rows: string[], doors: string[], windows: string[], objects: WorldSeed['objects'], folk = { x: 0, y: 0 }, traits: string[] = [], tick = NOON): Sim {
  const grid = gridFromMap(
    rows,
    {
      '.': { floor: 'grass', indoor: false },
      L: { floor: 'parquet', indoor: true },
      H: { floor: 'wood', indoor: true },
      S: { floor: 'carpet', indoor: true },
    },
    doors,
    windows,
  );
  return new Sim(
    CATALOG,
    createWorld({
      seed: 5,
      startTick: tick,
      grid,
      objects,
      folks: [{ name: 'Teste', traits, x: folk.x, y: folk.y }],
      funds: 5000,
      exit: { x: 0, y: rows.length - 1 },
    }),
  );
}

// uma sala grande e bonita e um corredor estreito, lado a lado
const ROWS = [
  '..............',
  '.LLLLLL..H....',
  '.LLLLLL..H....',
  '.LLLLLL..H....',
  '.LLLLLL..H....',
  '.LLLLLL..H....',
  '..............',
];

describe('cômodos (bloco 3)', () => {
  it('acha os cômodos da casa pronta pelas paredes, portas e janelas', () => {
    const sim = starterSim();
    const map = roomsOf(sim.world, CATALOG);
    const bedroom = roomAt(map, 3, 2)!;
    const bath = roomAt(map, 8, 2)!;
    const living = roomAt(map, 5, 8)!;
    expect(bedroom).toBe(roomAt(map, 7, 5));
    expect(bedroom).not.toBe(bath);
    // a cozinha é aberta para a sala: mesmo cômodo
    expect(roomAt(map, 12, 3)).toBe(living);
    expect(bedroom.tiles).toBe(20);
    expect(bath.tiles).toBe(12);
    expect(living.tiles).toBe(67);
    expect(roomAt(map, 0, 0)!.outdoor).toBe(true);
    expect(living.outdoor).toBe(false);
    expect(living.windows).toBeGreaterThanOrEqual(6);
  });

  it('recalcula quando a obra muda', () => {
    const sim = starterSim(1);
    const before = roomsOf(sim.world, CATALOG);
    expect(roomAt(before, 3, 2)).toBe(roomAt(before, 3, 5));
    // uma parede de ponta a ponta divide o quarto em dois
    for (let x = 3; x <= 7; x++) sim.world.grid.edges[`${x},4,N`] = 'wall';
    const after = roomsOf(sim.world, CATALOG);
    expect(after.rooms.length).toBe(before.rooms.length + 1);
    expect(roomAt(after, 3, 2)).not.toBe(roomAt(after, 3, 5));
    expect(roomAt(after, 3, 2)!.tiles).toBe(10);
  });

  it('dá nome ao cômodo pelo uso', () => {
    const sim = starterSim();
    const map = roomsOf(sim.world, CATALOG);
    expect(roomKind(sim.world, CATALOG, map, roomAt(map, 3, 2)!)).toEqual(['bedroom']);
    expect(roomKind(sim.world, CATALOG, map, roomAt(map, 8, 2)!)).toEqual(['bath']);
    expect(roomKind(sim.world, CATALOG, map, roomAt(map, 5, 8)!).sort()).toEqual(['kitchen', 'living']);
    expect(roomKind(sim.world, CATALOG, map, roomAt(map, 0, 0)!)).toEqual(['yard']);
  });

  it('o mesmo sofá dá ambiente bem diferente na sala bonita e no corredor vazio', () => {
    const sim = mapSim(ROWS, ['3,6,N', '9,6,N'], ['2,1,N', '4,1,N', '1,3,W'], [
      { defId: 'sofa', x: 2, y: 4 },
      { defId: 'sofa', x: 9, y: 2, rot: 1 },
      { defId: 'plant', x: 1, y: 1 },
      { defId: 'plant', x: 6, y: 1 },
      { defId: 'canvas', x: 3, y: 1 },
      { defId: 'bigrug', x: 2, y: 2 },
      { defId: 'armchair', x: 6, y: 5 },
      { defId: 'lamp', x: 1, y: 5 },
    ]);
    const map = roomsOf(sim.world, CATALOG);
    const nice = roomScore(sim.world, CATALOG, map, roomAt(map, 2, 4)!).total;
    const hall = roomScore(sim.world, CATALOG, map, roomAt(map, 9, 2)!).total;
    expect(nice).toBeGreaterThan(hall + 25);
    // e quem senta lá sente: o ambiente do folk segue o cômodo
    const folk = sim.world.folks[0];
    folk.x = 3;
    folk.y = 5;
    const inNice = ambienceTarget(sim.world, CATALOG, folk);
    folk.x = 9;
    folk.y = 4;
    expect(ambienceTarget(sim.world, CATALOG, folk)).toBeLessThan(inNice - 25);
  });

  it('piso e revestimento entram na nota', () => {
    const sim = mapSim(ROWS, ['3,6,N', '9,6,N'], [], []);
    const map = roomsOf(sim.world, CATALOG);
    const room = roomAt(map, 2, 2)!;
    const before = roomScore(sim.world, CATALOG, map, room).total;
    // tijolo aparente em todas as paredes da sala
    for (const face of room.faces) sim.world.grid.coverings[face] = 'brick';
    const after = roomScore(sim.world, CATALOG, roomsOf(sim.world, CATALOG), roomAt(roomsOf(sim.world, CATALOG), 2, 2)!).total;
    expect(after).toBeGreaterThan(before);
  });

  it('cômodo apertado e cantos vazios pesam', () => {
    const big = mapSim(ROWS, ['3,6,N', '9,6,N'], [], []);
    const map = roomsOf(big.world, CATALOG);
    const s = roomScore(big.world, CATALOG, map, roomAt(map, 2, 2)!);
    expect(s.corners).toBeLessThan(0);
    const filled = mapSim(ROWS, ['3,6,N', '9,6,N'], [], [
      { defId: 'plant', x: 1, y: 1 },
      { defId: 'plant', x: 6, y: 1 },
      { defId: 'plant', x: 1, y: 5 },
      { defId: 'plant', x: 6, y: 5 },
    ]);
    const m2 = roomsOf(filled.world, CATALOG);
    expect(roomScore(filled.world, CATALOG, m2, roomAt(m2, 2, 2)!).corners).toBe(0);
    const tiny = mapSim(['.....', '.SS..', '.....'], ['1,2,N'], [], []);
    const m3 = roomsOf(tiny.world, CATALOG);
    expect(roomScore(tiny.world, CATALOG, m3, roomAt(m3, 1, 1)!).size).toBeLessThan(0);
  });

  it('cada traço tem seu gosto de cômodo', () => {
    // quartinho de 6 tiles: o reservado gosta, o agitado não
    const rows = ['.......', '.SSS...', '.SSS...', '.......'];
    const shy = mapSim(rows, ['2,3,N'], ['2,1,N'], [], { x: 2, y: 2 }, ['reservado']);
    const busy = mapSim(rows, ['2,3,N'], ['2,1,N'], [], { x: 2, y: 2 }, ['agitado']);
    const a = ambienceTarget(shy.world, CATALOG, shy.world.folks[0]);
    const b = ambienceTarget(busy.world, CATALOG, busy.world.folks[0]);
    expect(a).toBeGreaterThan(b + 5);
  });
});

describe('luz, dia e noite (bloco 3)', () => {
  it('de dia a janela ilumina; cômodo sem janela fica na penumbra; à noite escurece', () => {
    const sim = mapSim(ROWS, ['3,6,N', '9,6,N'], ['2,1,N', '4,1,N'], []);
    const map = roomsOf(sim.world, CATALOG);
    const living = roomAt(map, 2, 2)!;
    const hall = roomAt(map, 9, 2)!;
    expect(isDark(sim.world, CATALOG, map, living)).toBe(false);
    expect(isDark(sim.world, CATALOG, map, hall)).toBe(true);
    sim.world.tick = NIGHT;
    expect(isDark(sim.world, CATALOG, map, living)).toBe(true);
    const dark = roomScore(sim.world, CATALOG, map, living).total;
    sim.world.tick = NOON;
    expect(roomScore(sim.world, CATALOG, map, living).total).toBeGreaterThan(dark + 15);
  });

  it('luminária acesa clareia e dá ambiente à noite', () => {
    const sim = starterSim(1);
    sim.world.tick = NIGHT;
    const map = roomsOf(sim.world, CATALOG);
    const bedroom = roomAt(map, 3, 2)!;
    expect(isDark(sim.world, CATALOG, map, bedroom)).toBe(true);
    const before = roomScore(sim.world, CATALOG, map, bedroom).total;
    for (const l of lightsIn(sim.world, CATALOG, map, bedroom)) l.lit = true;
    expect(isDark(sim.world, CATALOG, map, bedroom)).toBe(false);
    expect(roomScore(sim.world, CATALOG, map, bedroom).total).toBeGreaterThan(before + 15);
  });

  it('o interruptor só oferece o que muda e o jogador pode acender e apagar', () => {
    const sim = starterSim(1);
    const folk = sim.world.folks[0];
    folk.autonomy = false;
    const lamp = sim.world.objects.find((o) => o.defId === 'lamp')!;
    expect(sim.dispatch({ type: 'queueUse', folkId: folk.id, objectId: lamp.id, interactionId: 'lightOff' })).toBe(false);
    expect(sim.lastProblem).toBe('nothingToDo');
    expect(sim.dispatch({ type: 'queueUse', folkId: folk.id, objectId: lamp.id, interactionId: 'lightOn' })).toBe(true);
    run(sim, 30);
    expect(lamp.lit).toBe(true);
    sim.dispatch({ type: 'queueUse', folkId: folk.id, objectId: lamp.id, interactionId: 'lightOff' });
    run(sim, 30);
    expect(lamp.lit).toBe(false);
  });

  it('à noite, antes de usar algo num cômodo escuro, o folk acende a luz', () => {
    const sim = starterSim(1, { fun: 20 });
    sim.world.tick = NIGHT;
    const folk = sim.world.folks[0];
    folk.autonomy = false;
    const shelf = sim.world.objects.find((o) => o.defId === 'bookshelf')!;
    expect(sim.dispatch({ type: 'queueUse', folkId: folk.id, objectId: shelf.id, interactionId: 'read' })).toBe(true);
    run(sim, 40);
    const map = roomsOf(sim.world, CATALOG);
    const bedroom = roomAt(map, 6, 3)!;
    expect(lightsIn(sim.world, CATALOG, map, bedroom).some((l) => l.lit)).toBe(true);
    expect(folk.queue[0]?.interactionId).toBe('read');
    expect(folk.queue[0]?.phase).toBe('using');
  });

  it('de dia, com janela, ninguém acende nada', () => {
    const sim = starterSim(1, { fun: 20 });
    const folk = sim.world.folks[0];
    folk.autonomy = false;
    const shelf = sim.world.objects.find((o) => o.defId === 'bookshelf')!;
    sim.dispatch({ type: 'queueUse', folkId: folk.id, objectId: shelf.id, interactionId: 'read' });
    run(sim, 40);
    expect(sim.world.objects.some((o) => o.lit)).toBe(false);
  });

  it('quem vai dormir apaga a luz do quarto', () => {
    const sim = starterSim(1, { energy: 10 });
    sim.world.tick = NIGHT;
    const folk = sim.world.folks[0];
    folk.autonomy = false;
    const lamp = sim.world.objects.find((o) => o.defId === 'lamp')!;
    lamp.lit = true;
    const bed = sim.world.objects.find((o) => o.defId === 'bed')!;
    sim.dispatch({ type: 'queueUse', folkId: folk.id, objectId: bed.id, interactionId: 'sleep' });
    run(sim, 40);
    expect(folk.queue[0]?.interactionId).toBe('sleep');
    expect(lamp.lit).toBe(false);
  });

  it('o caprichoso apaga ao sair; o desleixado deixa acesa', () => {
    const count = (traits: string[]) => {
      let off = 0;
      for (let seed = 1; seed <= 20; seed++) {
        const s = starterHouse(seed);
        s.folks = [{ ...s.folks[0], traits, x: 4, y: 4 }];
        s.neighbors = [];
        s.relations = [];
        const sim = new Sim(CATALOG, createWorld(s));
        sim.world.tick = NIGHT;
        const folk = sim.world.folks[0];
        folk.autonomy = false;
        const lamp = sim.world.objects.find((o) => o.defId === 'lamp')!;
        lamp.lit = true;
        sim.dispatch({ type: 'queueGoto', folkId: folk.id, x: 8, y: 9 });
        run(sim, 20);
        if (!lamp.lit) off++;
      }
      return off;
    };
    expect(count(['caprichoso'])).toBeGreaterThan(count(['desleixado']) + 8);
  });

  it('lâmpada acesa sobe a conta de luz', () => {
    const bill = (lit: boolean) => {
      const sim = starterSim(1);
      sim.world.folks[0].autonomy = false;
      for (const o of sim.world.objects) if (o.defId === 'ceilinglamp' || o.defId === 'lamp') o.lit = lit;
      run(sim, sim.world.household.nextBills - sim.world.tick);
      return sim.world.household.bills.at(-1)!;
    };
    const off = bill(false);
    const on = bill(true);
    expect(on.power).toBeGreaterThan(off.power + 20);
    expect(on.water).toBe(off.water);
  });
});

describe('quadros, tapetes e luz de teto (bloco 3)', () => {
  it('quadro precisa de parede atrás e gira sozinho só na tela; tapete não fecha passagem', () => {
    const sim = starterSim(1);
    const w = sim.world;
    // (7,8) fica no meio da sala: sem parede atrás
    expect(checkPlacement(w, CATALOG, 'painting', 7, 8, 0)).toEqual({ ok: false, problem: 'needsWall' });
    // (7,6) com a parede do quarto ao norte; janela não serve
    expect(checkPlacement(w, CATALOG, 'painting', 7, 6, 0).ok).toBe(true);
    expect(checkPlacement(w, CATALOG, 'painting', 5, 2, 0).problem).toBe('needsWall');
    // tapete pode ir debaixo do folk e dos móveis, mas não em cima de outro tapete
    const folk = w.folks[0];
    expect(checkPlacement(w, CATALOG, 'rug', folk.x, folk.y, 0).ok).toBe(true);
    expect(checkPlacement(w, CATALOG, 'rug', 5, 7, 0).problem).toBe('occupied');
    expect(sim.dispatch({ type: 'buy', defId: 'rug', x: 10, y: 10, rot: 0 })).toBe(true);
    expect(sim.getNav().isFree(10, 10)).toBe(true);
  });

  it('luz de teto só dentro de cômodo; parede com quadro não sai', () => {
    const sim = starterSim(1);
    expect(checkPlacement(sim.world, CATALOG, 'ceilinglamp', 1, 1, 0).problem).toBe('needsRoof');
    expect(checkPlacement(sim.world, CATALOG, 'ceilinglamp', 4, 8, 0).ok).toBe(true);
    expect(sim.dispatch({ type: 'eraseWalls', x0: 6, y0: 6, x1: 7, y1: 6 } as never)).toBe(false);
    expect(sim.lastProblem).toBe('holdsDecor');
  });

  it('quadro novo melhora a nota do cômodo', () => {
    const sim = starterSim(1);
    const map = roomsOf(sim.world, CATALOG);
    const before = roomScore(sim.world, CATALOG, map, roomAt(map, 8, 2)!).total;
    expect(sim.dispatch({ type: 'buy', defId: 'canvas', x: 8, y: 5, rot: 2 })).toBe(true);
    expect(roomScore(sim.world, CATALOG, map, roomAt(map, 8, 2)!).total).toBeGreaterThan(before);
  });
});

describe('save v8 (bloco 3)', () => {
  /** A casa como um save da versão 7 a guardaria: sem enfeites de compra nem luz de teto. */
  function v7Save(): Record<string, unknown> {
    const world = createWorld(starterHouse(1)) as World & { household: Record<string, unknown> };
    world.objects = world.objects.filter((o) => !CATALOG.objects[o.defId].layer);
    delete (world.household as Record<string, unknown>).lightMinutes;
    return { version: 7, savedAt: 1, world: JSON.parse(JSON.stringify(world)) };
  }

  it('migra da v7: quadros onde a tela pendurava, tapete do sofá e luz nos cômodos sem luminária', () => {
    expect(SAVE_VERSION).toBe(8);
    const { world } = deserialize(v7Save(), { neighbors: NEIGHBORS, ties: NEIGHBOR_TIES, catalog: CATALOG });
    expect(world.household.lightMinutes).toBe(0);
    const ids = world.objects.map((o) => o.defId);
    expect(ids.filter((d) => d === 'painting' || d === 'wallclock').length).toBeGreaterThan(2);
    expect(ids).toContain('bigrug');
    // todo cômodo fechado tem alguma luz
    const map = computeRooms(world.grid, CATALOG);
    for (const room of map.rooms) {
      if (room.outdoor) continue;
      expect(lightsIn(world, CATALOG, map, room).length).toBeGreaterThan(0);
    }
    // os quadros estão todos encostados em parede
    for (const o of world.objects.filter((x) => CATALOG.objects[x.defId].layer === 'wall')) {
      expect(checkPlacement(world, CATALOG, o.defId, o.x, o.y, o.rot, o.id).ok).toBe(true);
    }
    // ids continuam únicos
    expect(new Set(world.objects.map((o) => o.id)).size).toBe(world.objects.length);
  });

  it('salvar e carregar mantém as luzes acesas', () => {
    const sim = starterSim(1);
    sim.world.objects.find((o) => o.defId === 'lamp')!.lit = true;
    const back = deserialize(JSON.parse(JSON.stringify(serialize(sim.world, 1))));
    expect(back.world.objects.find((o) => o.defId === 'lamp')!.lit).toBe(true);
  });
});

describe('semana sem jogador (bloco 3)', () => {
  it('sete dias com dia e noite: ninguém desmaia, luzes acendem e apagam, a conta de luz cobra', () => {
    const sim = householdSim(7);
    let litAtNight = 0;
    let litAtNoon = 0;
    let darkUse = 0;
    for (let d = 0; d < 7; d++) {
      for (let m = 0; m < 1440; m++) {
        sim.step();
        const minute = sim.world.tick % 1440;
        const lit = sim.world.objects.filter((o) => o.lit).length;
        if (minute === 22 * 60) litAtNight += lit;
        if (minute === 13 * 60) litAtNoon += lit;
        if (minute % 30 === 0 && minute >= 21 * 60) {
          // quem está usando algo (fora dormir) não está no escuro
          const map = roomsOf(sim.world, CATALOG);
          for (const f of sim.world.folks) {
            const a = f.queue[0];
            if (f.away || f.visit || a?.phase !== 'using' || a.interactionId === 'sleep' || a.interactionId === 'nap') continue;
            const room = roomAt(map, f.x, f.y);
            if (room && isDark(sim.world, CATALOG, map, room) && lightsIn(sim.world, CATALOG, map, room).length > 0) darkUse++;
          }
        }
      }
    }
    expect(sim.world.log.filter((l) => l.key === 'log.collapse').length).toBe(0);
    expect(litAtNight).toBeGreaterThan(0);
    expect(litAtNoon).toBeLessThan(litAtNight);
    expect(darkUse).toBeLessThan(6);
    for (const f of sim.world.folks) if (!f.visit) expect(f.needs.ambience).toBeGreaterThan(20);
  });
});
