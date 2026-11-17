import type { Folk, World } from './types';

/**
 * Alguém do mundo, more na casa, esteja de visita ou só na vizinhança.
 * Fofoca, colegas de trabalho e chefe podem ser qualquer um destes.
 */
export interface Person {
  id: number;
  name: string;
  traits: string[];
  /** o folk, quando está no lote (morador ou visita) */
  folk?: Folk;
  /** mora na casa */
  resident: boolean;
}

export function personOf(world: World, id: number): Person | undefined {
  const folk = world.folks.find((f) => f.id === id);
  if (folk) return { id, name: folk.name, traits: folk.traits, folk, resident: !folk.visit };
  const n = world.neighbors.find((x) => x.id === id);
  if (n) return { id, name: n.name, traits: n.traits, resident: false };
  return undefined;
}

/** Produto de um multiplicador dos traços (ciúme, gosto por fofoca...). */
export function traitFactor(
  traits: readonly string[],
  defs: Record<string, { jealousy?: number; gossip?: number }>,
  key: 'jealousy' | 'gossip',
): number {
  let m = 1;
  for (const t of traits) m *= defs[t]?.[key] ?? 1;
  return m;
}

/** Distância em tiles entre dois folks no lote. */
export function tileDistance(a: Folk, b: Folk): number {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}
