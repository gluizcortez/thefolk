import type { Catalog, Folk, InteractionDef, NeedId, Speed, World } from './types';
import { isSleep } from './will';

// Plano 2, bloco 1: ritmo do tempo e o folk parado esperando ordem.
// Regras puras: a tela e a sim perguntam aqui, ninguém guarda estado.

/** Velocidade de pular. */
export const SKIP_SPEED: Speed = 4;
/** Uma ação conta como "longa" (deixa pular) se faltam pelo menos tantos minutos. */
export const LONG_ACTION = 30;

/** O que impede de pular: cada morador acordado e em casa sem nada longo para fazer. */
export function skipBlocker(world: World, catalog: Catalog): Folk | null {
  if (world.outing) return world.folks.find((f) => !f.visit && !f.away) ?? null;
  for (const folk of world.folks) {
    if (folk.visit) continue;
    if (!busyForLong(world, catalog, folk)) return folk;
  }
  return null;
}

/** Dá para pular agora? (todos dormindo, fora de casa ou ocupados com algo longo) */
export function canSkip(world: World, catalog: Catalog): boolean {
  if (world.party || world.fires.length > 0) return false;
  if (world.folks.some((f) => f.visit && !f.visit.service && !f.visit.leaving)) return false;
  return skipBlocker(world, catalog) === null;
}

function busyForLong(world: World, catalog: Catalog, folk: Folk): boolean {
  if (folk.away) return true;
  if (folk.collapsed > 0) return true;
  if (folk.down || folk.adrift) return false;
  if (folk.age === 'baby') return !!folk.kid?.asleep;
  const a = folk.queue[0];
  if (!a || a.phase !== 'using' || a.kind !== 'use' || a.objectId === undefined) return false;
  // plano 2, bloco 4: saindo (levantando da cama) já é acordado
  if (a.stage === 'exit') return false;
  const it = interactionOf(world, catalog, a.objectId, a.interactionId);
  if (!it) return false;
  if (isSleep(it)) return true;
  return it.duration - a.elapsed >= LONG_ACTION;
}

function interactionOf(world: World, catalog: Catalog, objectId: number, id: string | undefined): InteractionDef | undefined {
  const obj = world.objects.find((o) => o.id === objectId);
  return obj ? catalog.objects[obj.defId]?.interactions.find((i) => i.id === id) : undefined;
}

// ---------- gestos de espera ----------

/**
 * Gesto de quem está parado sem ordem. Muda com a necessidade mais baixa
 * (mão na barriga com fome, bocejo com sono) e, sem aperto, com o humor.
 */
export type IdleGesture = 'none' | 'look' | 'stretch' | 'arms' | 'scratch' | 'belly' | 'yawn' | 'fidget';

/** Minutos parado antes do primeiro gesto; depois um gesto a cada tantos minutos. */
export const GESTURE_AFTER = 4;
export const GESTURE_EVERY = 9;
/** Quanto tempo (minutos) dura um gesto. */
export const GESTURE_LENGTH = 3;

const URGE: Partial<Record<NeedId, IdleGesture>> = {
  hunger: 'belly',
  energy: 'yawn',
  bladder: 'fidget',
  comfort: 'stretch',
  hygiene: 'scratch',
  fun: 'arms',
  social: 'look',
};
const CALM: IdleGesture[] = ['look', 'stretch', 'scratch', 'look', 'arms'];

export function idleGesture(folk: Folk, tick: number, mood: number): IdleGesture {
  if (folk.queue.length > 0 || folk.away || folk.collapsed > 0 || folk.down || folk.age === 'baby') return 'none';
  const idle = folk.idleTicks;
  if (idle < GESTURE_AFTER) return 'none';
  const phase = (idle - GESTURE_AFTER) % GESTURE_EVERY;
  if (phase >= GESTURE_LENGTH) return 'none';
  // a necessidade mais baixa abaixo de 35 manda no gesto
  let low: NeedId | null = null;
  let lowValue = 35;
  for (const [id, v] of Object.entries(folk.needs) as [NeedId, number][]) {
    if (URGE[id] && v < lowValue) {
      low = id;
      lowValue = v;
    }
  }
  if (low) return URGE[low]!;
  if (mood < 35) return 'arms';
  const n = Math.floor((idle - GESTURE_AFTER) / GESTURE_EVERY) + folk.id + Math.floor(tick / 1440);
  return CALM[((n % CALM.length) + CALM.length) % CALM.length];
}
