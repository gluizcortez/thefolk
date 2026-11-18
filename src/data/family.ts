import { buildNav } from '../sim/grid';
import { cleanName, copyTemper } from '../sim/family';
import type { FamilyDraft } from '../sim/family';
import type { RelationSeed, WorldSeed } from '../sim/world';
import { createWorld } from '../sim/world';
import { CATALOG } from './catalog';
import { starterHouse } from './house';

// Bloco 5: a família criada pelo jogador muda para a casa pronta. Os
// moradores de sempre (Tomé e Lia) saem; a vizinhança continua a mesma.

/** Onde a família aparece: perto do meio da sala. */
const GATHER = { x: 8, y: 9 };

/** Quanto quem mora junto já se gosta no primeiro dia. */
const FAMILY_FRIENDSHIP = 35;

export function familySeed(draft: FamilyDraft, seed: number): WorldSeed {
  const base = starterHouse(seed);
  const surname = cleanName(draft.surname);
  const names = draft.members.map((m) => `${cleanName(m.name)} ${surname}`);
  // tiles livres da sala, do mais perto do meio para o mais longe
  const probe = createWorld({ ...base, folks: [], relations: [], neighbors: [] });
  const nav = buildNav(probe, CATALOG);
  const spots: { x: number; y: number }[] = [];
  for (let y = 6; y <= 10; y++) {
    for (let x = 3; x <= 13; x++) if (nav.isFree(x, y)) spots.push({ x, y });
  }
  spots.sort((a, b) => Math.abs(a.x - GATHER.x) + Math.abs(a.y - GATHER.y) - (Math.abs(b.x - GATHER.x) + Math.abs(b.y - GATHER.y)) || a.y - b.y || a.x - b.x);
  base.folks = draft.members.map((m, i) => ({
    name: names[i],
    traits: [...m.traits],
    x: spots[i].x,
    y: spots[i].y,
    needs: { hunger: 70, energy: 80, bladder: 70, fun: 60, social: 55, hygiene: 80 },
    look: { ...m.look },
    temper: copyTemper(m.temper),
    month: m.month,
    ...(m.age ? { age: m.age } : {}),
  }));
  const family: RelationSeed[] = [];
  for (let i = 0; i < names.length; i++) {
    for (let j = i + 1; j < names.length; j++) family.push({ a: names[i], b: names[j], friendship: FAMILY_FRIENDSHIP, respect: 10 });
  }
  // laços da vizinhança que citam Tomé ou Lia ficam de fora
  const known = new Set([...names, ...(base.neighbors ?? []).map((n) => n.name)]);
  base.relations = [...family, ...(base.relations ?? []).filter((r) => known.has(r.a) && known.has(r.b))];
  return base;
}
