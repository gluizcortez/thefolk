// Bloco 7: que som cada coisa do jogo faz. Tabelas puras (os testes conferem
// que toda ação principal tem som); quem toca é audio/director.ts.

import type { Command, InteractionDef, ObjectDef } from '../sim/types';
import type { LoopName, SfxName } from './engine';

export interface ActionSound {
  /** efeito ao começar */
  start?: SfxName;
  /** som contínuo enquanto dura */
  loop?: LoopName;
  /** efeito ao terminar */
  end?: SfxName;
  /** fala sozinho (telefone, espelho) */
  talk?: boolean;
  /** toca notas de verdade (piano, teclado, flauta) */
  music?: 'keys' | 'lead' | 'marimba';
}

/**
 * Interações que ficam em silêncio de propósito: dormir, sentar, descansar,
 * admirar quadro. Dançar também: quem faz o som é o rádio ligado.
 */
export const SILENT = new Set(['sleep', 'nap', 'sit', 'rest', 'admire', 'dance', 'stargaze', 'wardrobe']);

/** Som de uma interação num objeto. */
export function actionSound(def: ObjectDef | undefined, it: InteractionDef): ActionSound | null {
  const art = def?.art ?? '';
  if (it.light || it.tune) return { start: 'switch' };
  switch (it.care) {
    case 'clean':
      return { loop: 'scrub' };
    case 'repair':
    case 'service':
      return { loop: 'saw', end: 'hammer' };
    case 'dishes':
      return { loop: 'water' };
    case 'empty':
    case 'dump':
      return { start: 'thunk' };
  }
  switch (it.id) {
    case 'shower':
    case 'wash':
      return { start: 'switch', loop: 'water' };
    case 'soak':
      return { start: 'splash', loop: 'bubbles' };
    case 'use':
      return art.startsWith('toilet') ? { end: 'flush' } : { start: 'click' };
    case 'cook':
      return { start: 'fridge', loop: 'sizzle' };
    case 'meal':
    case 'snack':
    case 'nibble':
    case 'setBuffet':
    case 'takeout':
      return art.startsWith('fridge') ? { start: 'fridge', loop: 'clink' } : { loop: 'clink' };
    case 'watch':
      return { start: 'switch', loop: 'tv' };
    case 'play':
    case 'videogame':
      return art === 'videogame' || def?.category === 'electronics' ? { loop: 'game' } : { loop: 'clink' };
    case 'chess':
    case 'cards':
    case 'puzzles':
      return { loop: 'clink' };
    case 'write':
    case 'freelance':
    case 'business':
      return { loop: 'typing' };
    case 'study':
    case 'read':
    case 'recipes':
    case 'manual':
      return art === 'desk' ? { loop: 'typing' } : { start: 'page' };
    case 'call':
    case 'answer':
    case 'party':
    case 'services':
    case 'invite':
      return { start: 'dial', talk: true };
    case 'pay':
    case 'fair':
      return { start: 'mail' };
    case 'practice':
    case 'rehearse':
      return { talk: true };
    case 'playMusic':
      return { music: art === 'recorder' ? 'lead' : art === 'keyboard' ? 'marimba' : 'keys' };
    case 'paint':
      return { loop: 'scrub' };
    case 'tinker':
    case 'workbench':
      return { loop: 'saw', end: 'hammer' };
    case 'punch':
      return { start: 'punch', loop: 'scrub' };
    case 'pedal':
      return { loop: 'pedal' };
    case 'water':
      return { start: 'splash' };
    // bloco 11
    case 'feedBaby':
      return { loop: 'clink' };
    case 'changeBaby':
      return { start: 'thunk', loop: 'scrub' };
    case 'homework':
      return { start: 'page' };
  }
  if (SILENT.has(it.id) || it.pose === 'dance' || it.pose === 'lie' || it.pose === 'sit') return null;
  return { start: 'click' };
}

/** Efeito para uma linha nova do log (null = sem som). */
export function logSound(key: string): SfxName | null {
  if (key.startsWith('log.ring')) return 'bell';
  const map: Record<string, SfxName> = {
    'log.billArrived': 'mail',
    'log.broke': 'clunk',
    'log.foundBroken': 'clunk',
    'log.shock': 'buzz',
    'log.promoted': 'fanfare',
    'log.raiseYes': 'fanfare',
    'log.allWishes': 'fanfare',
    'log.fired': 'sad',
    'log.firedByBoss': 'sad',
    'log.seized': 'sad',
    'log.breakUp': 'sad',
    'log.wishDone': 'chime',
    'log.skillUp': 'chime',
    'log.firstKiss': 'chime',
    'log.inspired': 'chime',
    'log.beloved': 'chime',
    'log.workCall': 'honk',
    'log.rideHonk': 'honk',
    'log.needFriends': 'sad',
    'log.rewardUnlocked': 'chime',
    'log.alarm': 'alarm',
    'log.phoneRings': 'phone',
    'log.partyStart': 'fanfare',
    'log.partyBrawl': 'punch',
    'log.noiseComplaint': 'buzz',
    'log.missedCall': 'sad',
    'log.collapse': 'thunk',
    'log.repaired': 'hammer',
    'log.groceriesIn': 'door',
    'log.takeoutIn': 'door',
    // bloco 11
    'log.babyCries': 'cry',
    'log.babyBorn': 'fanfare',
    'log.babyAdopted': 'fanfare',
    'log.grewUp': 'chime',
    'log.schoolBus': 'honk',
    'log.reportCard': 'mail',
    'log.honorRoll': 'fanfare',
    'log.homeworkDone': 'page',
    'log.socialTook': 'sad',
    'log.toBoarding': 'sad',
    'log.missedSchool': 'sad',
  };
  return map[key] ?? null;
}

/** Efeito de um comando do jogador (null = sem som próprio). */
export function commandSound(cmd: Command, ok: boolean): SfxName | null {
  if (cmd.type === 'setSpeed' || cmd.type === 'closeBuy') return null;
  if (!ok) return cmd.type === 'setAlarm' ? null : 'buzz';
  switch (cmd.type) {
    case 'buy':
      return 'register';
    case 'sell':
    case 'undoBuy':
      return 'coins';
    case 'move':
      return 'thunk';
    case 'buildWalls':
    case 'placeOpening':
      return 'hammer';
    case 'paintFloor':
    case 'paintWalls':
      return 'brush';
    case 'eraseWalls':
    case 'undoBuild':
      return 'thunk';
    case 'inspire':
      return 'chime';
    case 'takeJob':
    case 'takeGig':
    case 'openBusiness':
      return 'register';
  }
  return null;
}

/** Tipo de passo pelo piso. */
export function stepSound(floor: string | undefined): SfxName {
  if (floor === 'carpet') return 'step:soft';
  if (floor === 'wood' || floor === 'parquet') return 'step:wood';
  if (floor === 'grass' || floor === undefined) return 'step:grass';
  return 'step:hard';
}
