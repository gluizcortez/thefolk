import { fullNeeds } from './needs';
import type { EdgeKind, Folk, Grid, Needs, Rotation, Vec, World } from './types';

export interface RoomStyle {
  floor: string;
  indoor: boolean;
  /** letras com o mesmo `room` formam um cômodo só, sem parede entre elas */
  room?: string;
}

/**
 * Monta o grid a partir de um mapa em texto: cada letra é um cômodo e nasce
 * parede em toda borda entre cômodos diferentes (quando um dos lados é
 * interno). Duas letras podem dividir o mesmo cômodo com pisos diferentes.
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
  const roomOf = (c: string | null) => (c === null ? null : (styles[c]?.room ?? c));

  for (let y = 0; y < h; y++) {
    if (rows[y].length !== w) throw new Error(`linha ${y} do mapa tem largura diferente`);
    for (let x = 0; x < w; x++) {
      const c = rows[y][x];
      const style = styles[c];
      if (!style) throw new Error(`cômodo desconhecido no mapa: "${c}"`);
      floor.push(style.floor);
      const north = at(x, y - 1);
      const west = at(x - 1, y);
      if (roomOf(north) !== roomOf(c) && (indoor(c) || indoor(north))) edges[`${x},${y},N`] = 'wall';
      if (roomOf(west) !== roomOf(c) && (indoor(c) || indoor(west))) edges[`${x},${y},W`] = 'wall';
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
  skills?: Record<string, number>;
}

export interface ObjectSeed {
  defId: string;
  x: number;
  y: number;
  rot?: Rotation;
}

export interface WorldSeed {
  seed: number;
  startTick: number;
  grid: Grid;
  objects: ObjectSeed[];
  folks: FolkSeed[];
  /** tostões no começo */
  funds: number;
  /** tile na calçada de onde a condução sai */
  exit: Vec;
}

/** De quanto em quanto tempo as contas chegam, em minutos. */
export const BILL_INTERVAL = 3 * 24 * 60;
/** Hora em que as contas chegam. */
export const BILL_HOUR = 10;

/** Primeiro tick de cobrança depois de `tick`. */
export function firstBillAfter(tick: number): number {
  const day = Math.floor(tick / 1440);
  return day * 1440 + BILL_HOUR * 60 + BILL_INTERVAL;
}

export function createWorld(seed: WorldSeed): World {
  let nextId = 1;
  const objects = seed.objects.map((o) => ({ defId: o.defId, x: o.x, y: o.y, rot: o.rot ?? 0, paid: 0, id: nextId++ }));
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
    skills: { ...f.skills },
    job: null,
    away: null,
  }));
  return {
    tick: seed.startTick,
    speed: 1,
    rngState: seed.seed | 0,
    nextId,
    grid: seed.grid,
    objects,
    folks,
    household: { funds: seed.funds, nextBills: firstBillAfter(seed.startTick), lastBill: 0 },
    exit: { ...seed.exit },
    log: [],
  };
}
