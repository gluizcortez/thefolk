// Plano 2, bloco 10: os laços escolhidos no criador viram relações de verdade
// (cônjuges casados, pais e filhos na árvore, irmãos chegados) quando a
// família chega à casa.

import type { FamilyDraft } from './family';
import { tieOf } from './family';
import { schoolKid } from './life';
import { setBond } from './marriage';
import { ensureRelation } from './relations';
import type { Folk, World } from './types';

/** Quanto cada laço começa (amizade, romance, respeito). */
export const TIE_START: Record<string, { friendship: number; romance: number; respect: number }> = {
  spouse: { friendship: 60, romance: 70, respect: 25 },
  parent: { friendship: 55, romance: 0, respect: 30 },
  sibling: { friendship: 45, romance: 0, respect: 15 },
  roommate: { friendship: 35, romance: 0, respect: 10 },
};

/**
 * Relações iniciais da família criada: `folks` na mesma ordem dos membros do
 * rascunho. Cônjuges já casados, filhos com os pais na ficha (e na árvore).
 */
export function applyFamilyTies(world: World, folks: Folk[], draft: FamilyDraft): void {
  for (let i = 0; i < folks.length; i++) {
    for (let j = i + 1; j < folks.length; j++) {
      const { kind } = tieOf(draft, i, j);
      const start = TIE_START[kind] ?? TIE_START.roommate;
      for (const [a, b] of [
        [folks[i].id, folks[j].id],
        [folks[j].id, folks[i].id],
      ]) {
        const rel = ensureRelation(world, a, b);
        rel.friendship = start.friendship;
        rel.romance = start.romance;
        rel.respect = start.respect;
        rel.last = world.tick;
        if (!rel.memories.some((m) => m.kind === 'met')) rel.memories.push({ tick: world.tick, kind: 'met' });
      }
      if (kind === 'spouse') setBond(world, folks[i].id, folks[j].id, 'married');
    }
  }
  for (const t of draft.ties ?? []) {
    if (t.kind !== 'parent') continue;
    const parent = folks[t.a];
    const child = folks[t.b];
    if (!parent || !child) continue;
    child.parents = [...new Set([...(child.parents ?? []), parent.id])];
    if (child.age === 'child' || child.age === 'teen') {
      const kid = child.kid ?? schoolKid(world.tick, []);
      if (kid) {
        kid.parents = [...child.parents];
        child.kid = kid;
      }
    }
  }
}
