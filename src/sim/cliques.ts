import { isServiceNeighbor } from './world';
import { relationOf } from './relations';
import type { World } from './types';

// Bloco 9: panelinhas. O jogo olha a vizinhança inteira (moradores e
// vizinhos) e acha grupos de amigos (amizade dos dois lados alta, ligados uns
// aos outros) e rivais (quem não se suporta). Convidar rivais para a mesma
// festa vira briga.

/** amizade mínima, dos dois lados, para duas pessoas serem da mesma turma */
export const CLIQUE_AT = 45;
/** amizade (de qualquer lado) em que duas pessoas viram rivais */
export const RIVAL_AT = -30;
/** turma precisa de pelo menos tanta gente */
export const CLIQUE_MIN = 3;

export interface Clique {
  /** do mais ligado ao menos ligado */
  members: number[];
  /** quem mais tem amigos dentro da turma (dá nome a ela) */
  leader: number;
}

/** Amizade mais fria entre os dois lados (quem não conhece conta 0). */
export function mutualFriendship(world: World, a: number, b: number): number {
  return Math.min(relationOf(world, a, b)?.friendship ?? 0, relationOf(world, b, a)?.friendship ?? 0);
}

/** Os dois se estranham (algum lado em RIVAL_AT ou menos)? */
export function areRivals(world: World, a: number, b: number): boolean {
  return Math.min(relationOf(world, a, b)?.friendship ?? 0, relationOf(world, b, a)?.friendship ?? 0) <= RIVAL_AT;
}

/** Quem conta para as panelinhas: moradores e vizinhos (sem os prestadores de serviço). */
export function socialPeople(world: World): number[] {
  const ids = new Set<number>();
  for (const f of world.folks) if (!f.visit?.service) ids.add(f.id);
  for (const n of world.neighbors) if (!isServiceNeighbor(n)) ids.add(n.id);
  return [...ids].sort((a, b) => a - b);
}

/** Turmas de amigos: componentes ligados por amizade mútua de CLIQUE_AT ou mais. */
export function findCliques(world: World): Clique[] {
  const people = socialPeople(world);
  const links = new Map<number, number[]>();
  for (const id of people) links.set(id, []);
  for (let i = 0; i < people.length; i++) {
    for (let j = i + 1; j < people.length; j++) {
      if (mutualFriendship(world, people[i], people[j]) >= CLIQUE_AT) {
        links.get(people[i])!.push(people[j]);
        links.get(people[j])!.push(people[i]);
      }
    }
  }
  const seen = new Set<number>();
  const out: Clique[] = [];
  for (const id of people) {
    if (seen.has(id)) continue;
    const comp: number[] = [];
    const stack = [id];
    seen.add(id);
    while (stack.length) {
      const cur = stack.pop()!;
      comp.push(cur);
      for (const n of links.get(cur)!) {
        if (!seen.has(n)) {
          seen.add(n);
          stack.push(n);
        }
      }
    }
    if (comp.length < CLIQUE_MIN) continue;
    comp.sort((a, b) => links.get(b)!.length - links.get(a)!.length || a - b);
    out.push({ members: comp, leader: comp[0] });
  }
  return out.sort((a, b) => b.members.length - a.members.length || a.leader - b.leader);
}

/** Turma de quem (null = de nenhuma). */
export function cliqueOf(cliques: Clique[], id: number): Clique | null {
  return cliques.find((c) => c.members.includes(id)) ?? null;
}

/** Pares de rivais dentro de uma lista de gente. */
export function rivalPairs(world: World, ids: number[]): [number, number][] {
  const out: [number, number][] = [];
  for (let i = 0; i < ids.length; i++) {
    for (let j = i + 1; j < ids.length; j++) if (areRivals(world, ids[i], ids[j])) out.push([ids[i], ids[j]]);
  }
  return out;
}

/** Turmas que se estranham: algum membro de uma é rival de algum da outra. */
export function rivalCliques(world: World, cliques: Clique[]): [number, number][] {
  const out: [number, number][] = [];
  for (let i = 0; i < cliques.length; i++) {
    for (let j = i + 1; j < cliques.length; j++) {
      const hit = cliques[i].members.some((a) => cliques[j].members.some((b) => areRivals(world, a, b)));
      if (hit) out.push([i, j]);
    }
  }
  return out;
}

/**
 * Pares de convidados que podem brigar na festa: rivais de verdade (peso 1)
 * e gente de turmas rivais que não se conhece bem (peso 0,3).
 */
export function partyFriction(world: World, ids: number[]): { a: number; b: number; weight: number }[] {
  const cliques = findCliques(world);
  const rivalsC = rivalCliques(world, cliques);
  const out: { a: number; b: number; weight: number }[] = [];
  for (let i = 0; i < ids.length; i++) {
    for (let j = i + 1; j < ids.length; j++) {
      const a = ids[i];
      const b = ids[j];
      if (areRivals(world, a, b)) {
        out.push({ a, b, weight: 1 });
        continue;
      }
      const ca = cliques.findIndex((c) => c.members.includes(a));
      const cb = cliques.findIndex((c) => c.members.includes(b));
      if (ca < 0 || cb < 0 || ca === cb) continue;
      if (rivalsC.some(([x, y]) => (x === ca && y === cb) || (x === cb && y === ca)) && mutualFriendship(world, a, b) < 20) {
        out.push({ a, b, weight: 0.3 });
      }
    }
  }
  return out;
}
