import { CATALOG } from '../src/data/catalog';
import { starterHouse } from '../src/data/house';
import { Sim, createWorld, gridFromMap } from '../src/sim';
import type { Needs, WorldSeed } from '../src/sim';

export function starterSim(seed = 1, needs?: Partial<Needs>): Sim {
  const s = starterHouse(seed);
  if (needs) s.folks[0].needs = { ...s.folks[0].needs, ...needs };
  return new Sim(CATALOG, createWorld(s));
}

/** Mundo pequeno e sem paredes, para testes pontuais. */
export function openField(
  w: number,
  h: number,
  objects: WorldSeed['objects'],
  folk: { x: number; y: number; needs?: Partial<Needs>; traits?: string[] },
  seed = 1,
): Sim {
  const rows = Array.from({ length: h }, () => '.'.repeat(w));
  const grid = gridFromMap(rows, { '.': { floor: 'grass', indoor: false } }, []);
  return new Sim(
    CATALOG,
    createWorld({
      seed,
      startTick: 0,
      grid,
      objects,
      folks: [{ name: 'Teste', traits: folk.traits ?? [], x: folk.x, y: folk.y, needs: folk.needs }],
    }),
  );
}

export function run(sim: Sim, ticks: number): void {
  for (let i = 0; i < ticks; i++) sim.step();
}
