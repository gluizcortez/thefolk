import { fullNeeds } from './needs';
import type { EdgeKind, Folk, Grid, Needs, World, WorldObject } from './types';

export interface RoomStyle {
  floor: string;
  indoor: boolean;
}

/**
 * Monta o grid a partir de um mapa em texto: cada letra é um cômodo e nasce
 * parede em toda borda entre letras diferentes (quando um dos lados é interno).
 */
export function gridFromMap(
  rows: string[],
  styles: Record<string, RoomStyle>,
  doors: string[],
): Grid {
  const h = rows.length;
  const w = rows[0].length;
  const floor: string[] = [];
  const edges: Record<string, EdgeKind> = {};
  const at = (x: number, y: number) => (x < 0 || y < 0 || x >= w || y >= h ? null : rows[y][x]);
  const indoor = (c: string | null) => (c !== null && styles[c]?.indoor) === true;

  for (let y = 0; y < h; y++) {
    if (rows[y].length !== w) throw new Error(`linha ${y} do mapa tem largura diferente`);
    for (let x = 0; x < w; x++) {
      const c = rows[y][x];
      const style = styles[c];
      if (!style) throw new Error(`cômodo desconhecido no mapa: "${c}"`);
      floor.push(style.floor);
      const north = at(x, y - 1);
      const west = at(x - 1, y);
      if (north !== c && (indoor(c) || indoor(north))) edges[`${x},${y},N`] = 'wall';
      if (west !== c && (indoor(c) || indoor(west))) edges[`${x},${y},W`] = 'wall';
    }
  }
  for (const key of doors) {
    if (edges[key] !== 'wall') throw new Error(`porta fora de uma parede: ${key}`);
    edges[key] = 'door';
  }
  return { w, h, floor, edges };
}

export interface FolkSeed {
  name: string;
  traits: string[];
  x: number;
  y: number;
  needs?: Partial<Needs>;
  look?: Folk['look'];
}

export interface WorldSeed {
  seed: number;
  startTick: number;
  grid: Grid;
  objects: Omit<WorldObject, 'id'>[];
  folks: FolkSeed[];
}

export function createWorld(seed: WorldSeed): World {
  let nextId = 1;
  const objects = seed.objects.map((o) => ({ ...o, id: nextId++ }));
  const folks: Folk[] = seed.folks.map((f) => ({
    id: nextId++,
    name: f.name,
    traits: [...f.traits],
    x: f.x,
    y: f.y,
    px: f.x,
    py: f.y,
    facing: { x: 0, y: 1 },
    needs: { ...fullNeeds(70), ...f.needs },
    queue: [],
    path: [],
    autonomy: true,
    idleTicks: 0,
    collapsed: 0,
    look: f.look ?? { skin: 0, hair: 0, shirt: 0, pants: 0 },
  }));
  return {
    tick: seed.startTick,
    speed: 1,
    rngState: seed.seed | 0,
    nextId,
    grid: seed.grid,
    objects,
    folks,
    log: [],
  };
}
