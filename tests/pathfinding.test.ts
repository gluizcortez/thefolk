import { describe, expect, it } from 'vitest';
import { CATALOG } from '../src/data/catalog';
import { buildNav, createWorld, findPath, gridFromMap, useTiles } from '../src/sim';
import type { Vec, WorldSeed } from '../src/sim';
import { starterSim } from './helpers';

const STYLES = {
  '.': { floor: 'grass', indoor: false },
  A: { floor: 'wood', indoor: true },
  B: { floor: 'wood', indoor: true },
};

function navOf(rows: string[], doors: string[] = [], objects: WorldSeed['objects'] = []) {
  const world = createWorld({
    seed: 1,
    startTick: 0,
    grid: gridFromMap(rows, STYLES, doors),
    objects,
    folks: [],
  });
  return { world, nav: buildNav(world, CATALOG) };
}

function assertContiguous(from: Vec, path: Vec[]) {
  let prev = from;
  for (const p of path) {
    expect(Math.abs(p.x - prev.x) + Math.abs(p.y - prev.y)).toBe(1);
    prev = p;
  }
}

describe('pathfinding (A*)', () => {
  it('acha o caminho mais curto em campo aberto', () => {
    const { nav } = navOf(['.....', '.....', '.....']);
    const path = findPath(nav, { x: 0, y: 0 }, { x: 4, y: 2 })!;
    expect(path).toHaveLength(6);
    expect(path[path.length - 1]).toEqual({ x: 4, y: 2 });
    assertContiguous({ x: 0, y: 0 }, path);
  });

  it('devolve [] quando já está no destino', () => {
    const { nav } = navOf(['...']);
    expect(findPath(nav, { x: 1, y: 0 }, { x: 1, y: 0 })).toEqual([]);
  });

  it('não atravessa paredes: sem porta não há caminho', () => {
    const { nav } = navOf(['AAABBB', 'AAABBB', 'AAABBB']);
    expect(findPath(nav, { x: 0, y: 0 }, { x: 5, y: 0 })).toBeNull();
  });

  it('passa pela porta, mesmo que seja o caminho mais longo', () => {
    const { nav } = navOf(['AAABBB', 'AAABBB', 'AAABBB'], ['3,2,W']);
    const path = findPath(nav, { x: 2, y: 0 }, { x: 3, y: 0 })!;
    expect(path).not.toBeNull();
    // vizinhos de parede: precisa descer até a porta (linha 2) e voltar
    expect(path).toHaveLength(5);
    expect(path).toContainEqual({ x: 2, y: 2 });
    expect(path).toContainEqual({ x: 3, y: 2 });
    assertContiguous({ x: 2, y: 0 }, path);
  });

  it('desvia de objetos e não aceita destino ocupado', () => {
    const { nav } = navOf(
      ['.....', '.....', '.....'],
      [],
      [
        { defId: 'fridge', x: 2, y: 0 },
        { defId: 'fridge', x: 2, y: 1 },
      ],
    );
    const path = findPath(nav, { x: 0, y: 0 }, { x: 4, y: 0 })!;
    expect(path).toHaveLength(8);
    expect(path).not.toContainEqual({ x: 2, y: 0 });
    expect(path).not.toContainEqual({ x: 2, y: 1 });
    expect(findPath(nav, { x: 0, y: 0 }, { x: 2, y: 1 })).toBeNull();
  });

  it('é determinístico', () => {
    const { nav } = navOf(['......', '......', '......', '......']);
    const a = findPath(nav, { x: 0, y: 0 }, { x: 5, y: 3 });
    const b = findPath(nav, { x: 0, y: 0 }, { x: 5, y: 3 });
    expect(a).toEqual(b);
  });

  it('tiles de uso não ficam do outro lado de uma parede', () => {
    const { world, nav } = navOf(['AAABBB', 'AAABBB', 'AAABBB'], [], [{ defId: 'fridge', x: 2, y: 1 }]);
    const tiles = useTiles(world, nav, world.objects[0], CATALOG.objects.fridge);
    expect(tiles).not.toContainEqual({ x: 3, y: 1 });
    expect(tiles).toContainEqual({ x: 1, y: 1 });
  });

  it('useSides limita de que lados o objeto é usado', () => {
    const { world, nav } = navOf(['.....', '.....', '.....'], [], [{ defId: 'tv', x: 2, y: 1 }]);
    const tiles = useTiles(world, nav, world.objects[0], CATALOG.objects.tv);
    expect(tiles).toEqual([{ x: 3, y: 1 }]);
  });

  it('todo objeto com interação da casa inicial é alcançável', () => {
    const sim = starterSim();
    const folk = sim.world.folks[0];
    const nav = sim.getNav();
    for (const obj of sim.world.objects) {
      const def = CATALOG.objects[obj.defId];
      if (def.interactions.length === 0) continue;
      const tiles = useTiles(sim.world, nav, obj, def);
      const reachable = tiles.some((t) => findPath(nav, folk, t) !== null);
      expect(reachable, `${def.id} em ${obj.x},${obj.y}`).toBe(true);
    }
  });
});
