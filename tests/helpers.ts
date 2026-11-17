import { CATALOG } from '../src/data/catalog';
import { starterHouse } from '../src/data/house';
import { Sim, createWorld, gridFromMap } from '../src/sim';
import type { Needs, WorldSeed } from '../src/sim';

/**
 * Casa pronta com um folk só e sem vizinhos (como nas fatias 1 e 2), para os
 * testes de necessidades, IA de objetos e trabalho não dependerem de gente.
 */
export function starterSim(seed = 1, needs?: Partial<Needs>): Sim {
  const s = starterHouse(seed);
  s.folks = s.folks.slice(0, 1);
  s.relations = [];
  s.neighbors = [];
  if (needs) s.folks[0].needs = { ...s.folks[0].needs, ...needs };
  return new Sim(CATALOG, createWorld(s));
}

/** A casa pronta inteira: dois moradores e a vizinhança. */
export function householdSim(seed = 1): Sim {
  return new Sim(CATALOG, createWorld(starterHouse(seed)));
}

/** Mundo pequeno e sem paredes, para testes pontuais. */
export function openField(
  w: number,
  h: number,
  objects: WorldSeed['objects'],
  folk: { x: number; y: number; needs?: Partial<Needs>; traits?: string[]; skills?: Record<string, number> },
  seed = 1,
  funds = 1000,
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
      folks: [
        { name: 'Teste', traits: folk.traits ?? [], x: folk.x, y: folk.y, needs: folk.needs, skills: folk.skills },
      ],
      funds,
      exit: { x: 0, y: h - 1 },
    }),
  );
}

export function run(sim: Sim, ticks: number): void {
  for (let i = 0; i < ticks; i++) sim.step();
}

interface PersonSeed {
  name?: string;
  x: number;
  y: number;
  traits?: string[];
  needs?: Partial<Needs>;
}

/** Terreno aberto com várias pessoas e (opcional) vizinhos e relações iniciais. */
export function crowd(
  people: PersonSeed[],
  opts: {
    w?: number;
    h?: number;
    objects?: WorldSeed['objects'];
    relations?: WorldSeed['relations'];
    neighbors?: WorldSeed['neighbors'];
    seed?: number;
    startTick?: number;
    autonomy?: boolean;
  } = {},
): Sim {
  const w = opts.w ?? 12;
  const h = opts.h ?? 8;
  const rows = Array.from({ length: h }, () => '.'.repeat(w));
  const grid = gridFromMap(rows, { '.': { floor: 'grass', indoor: false } }, []);
  const sim = new Sim(
    CATALOG,
    createWorld({
      seed: opts.seed ?? 1,
      startTick: opts.startTick ?? 10 * 60,
      grid,
      objects: opts.objects ?? [],
      folks: people.map((p, i) => ({
        name: p.name ?? `Pessoa ${i + 1}`,
        traits: p.traits ?? [],
        x: p.x,
        y: p.y,
        needs: { hunger: 90, energy: 90, bladder: 90, hygiene: 90, comfort: 90, fun: 90, ...p.needs },
      })),
      funds: 1000,
      exit: { x: 0, y: h - 1 },
      relations: opts.relations,
      neighbors: opts.neighbors,
    }),
  );
  if (opts.autonomy === false) for (const f of sim.world.folks) f.autonomy = false;
  return sim;
}
