/**
 * Plano 2, bloco 2: regras puras do menu em anel (sem DOM, para os testes).
 *
 * - `interactionState`: se a opção aparece, e se aparece em cinza, com o
 *   motivo. O que é de contexto (consertar o que não quebrou, ligar o som
 *   ligado, cuidar do berço vazio, socorro sem emergência) continua sumindo;
 *   o que o folk quer e não pode agora aparece em cinza com o porquê.
 * - `ringSlots`: até RING_MAX opções vão direto no anel; passando disso, as
 *   que têm grupo viram uma fatia por grupo (que abre um segundo anel).
 * - `ringPoints` e `ringCenter`: onde fica cada fatia e onde o anel cabe.
 */
import type { Catalog, Folk, InteractionDef, NeedId, SocialDef, World, WorldObject } from '../sim';
import { DISH_BY_ID, interactionOpen, interactionReady, isAdult, kidAllows, knowsDish, refusal, relationOf, socialAllowed, stateOf } from '../sim';

/** Opções que cabem soltas no anel antes de agrupar. */
export const RING_MAX = 6;

export type Unavailable = 'age' | 'broken' | 'noFood' | 'noTakeout' | 'fairClosed' | 'noBills' | 'notNight' | 'notNow' | 'skill';

export interface InteractionState {
  show: boolean;
  /** motivo de estar em cinza (null = dá para fazer) */
  why: Unavailable | null;
  /** dá para mandar, mas ele vai reclamar (mau humor ou corpo pedindo) */
  reluctant: NeedId | 'mood' | null;
}

const HIDE: InteractionState = { show: false, why: null, reluctant: null };

/** Se a interação aparece no menu deste objeto para este folk, e como. */
export function interactionState(world: World, catalog: Catalog, folk: Folk, obj: WorldObject, it: InteractionDef): InteractionState {
  if (it.hidden) return HIDE;
  const grey = (why: Unavailable): InteractionState => ({ show: true, why, reluctant: null });
  if (!kidAllows(folk, it)) {
    // coisa de criança (lição, brinquedo) some para o adulto; o que é de adulto fica em cinza para a criança
    if (isAdult(folk) || it.homework || it.kids === 'only' || it.baby) return HIDE;
    return grey('age');
  }
  // de contexto: só aparece quando muda alguma coisa
  if (it.care || it.baby || it.tune || it.light || it.special === 'kindle' || it.channel === 'off' || it.canvas === 'sell' || it.canvas === 'scrap') {
    if (!interactionOpen(obj, it)) return HIDE;
  }
  if (it.special === 'douse' || it.special === 'callFire' || it.special === 'callPolice') {
    if (!interactionReady(world, it)) return HIDE;
  }
  const state = stateOf(obj);
  if (state.broken && !it.care) return grey('broken');
  if (!interactionReady(world, it)) {
    if (it.takeout) return grey('noTakeout');
    if (it.special === 'fair') return grey('fairClosed');
    if (it.special === 'payBills') return grey('noBills');
    if (it.night) return grey('notNight');
    if (it.portions) return grey('noFood');
    return grey('notNow');
  }
  if (!interactionOpen(obj, it)) return grey('notNow');
  // plano 2, bloco 6: prato que o folk ainda não sabe fazer
  const dish = it.cook ? DISH_BY_ID[it.cook] : undefined;
  if (dish && !knowsDish(folk, dish)) return grey('skill');
  return { show: true, why: null, reluctant: refusal(catalog, folk, it, world.tick) };
}

/** Grupo de uma interação de objeto no anel (quando passa de RING_MAX). */
export function objectGroup(it: InteractionDef): string {
  if (it.care) return 'care';
  // plano 2, bloco 9: as trocas de roupa ficam juntas numa fatia
  if (it.dress) return 'dress';
  // plano 2, bloco 6: os pratos do fogão ficam juntos numa fatia
  if (it.cook) return 'cook';
  if (it.special === 'call' || it.special === 'services' || it.special === 'invite' || it.special === 'party' || it.special === 'answer') return 'phone';
  if (it.special === 'buyGift' || it.special === 'buyClothes' || it.special === 'buyParcel' || it.special === 'fair' || it.special === 'dine') return 'shop';
  if (it.skill) return 'learn';
  // plano 2, bloco 4: os canais da TV ficam juntos numa fatia
  if (it.channel) return 'channel';
  return 'use';
}

export interface RingEntry {
  group?: string;
}

export type RingSlot<T> = { kind: 'item'; item: T } | { kind: 'group'; group: string; items: T[] };

/**
 * Fatias do anel. Com até `max` opções, cada uma é uma fatia. Passando
 * disso, as opções com o mesmo grupo viram uma fatia só (na posição da
 * primeira); grupo com uma opção só volta a ser a opção.
 */
export function ringSlots<T extends RingEntry>(items: T[], max = RING_MAX): RingSlot<T>[] {
  if (items.length <= max) return items.map((item) => ({ kind: 'item', item }));
  const slots: RingSlot<T>[] = [];
  const groups = new Map<string, { kind: 'group'; group: string; items: T[] }>();
  for (const item of items) {
    if (!item.group) {
      slots.push({ kind: 'item', item });
      continue;
    }
    let g = groups.get(item.group);
    if (!g) {
      g = { kind: 'group', group: item.group, items: [] };
      groups.set(item.group, g);
      slots.push(g);
    }
    g.items.push(item);
  }
  // tudo num grupo só (o submenu de um grupo, ou um fogão só com pratos): mostra as fatias soltas
  if (slots.length === 1) return items.map((item) => ({ kind: 'item', item }));
  return slots.map((s) => (s.kind === 'group' && s.items.length === 1 ? { kind: 'item', item: s.items[0] } : s));
}

/** Raio do anel (px) para n fatias: cresce para as fatias não se encostarem. */
export function ringRadius(n: number): number {
  return Math.round(Math.max(84, Math.min(170, 26 + n * 17)));
}

/** Posição de cada fatia, em volta de (0, 0): a primeira em cima, no sentido do relógio. */
export function ringPoints(n: number, radius: number): { x: number; y: number }[] {
  const out: { x: number; y: number }[] = [];
  for (let i = 0; i < n; i++) {
    const a = -Math.PI / 2 + (i / Math.max(1, n)) * Math.PI * 2;
    out.push({ x: Math.round(Math.cos(a) * radius), y: Math.round(Math.sin(a) * radius) });
  }
  return out;
}

/**
 * Centro do anel perto do clique, puxado para dentro da tela: `reachX` e
 * `reachY` são o quanto o anel (com as fatias) se estende para cada lado.
 */
export function ringCenter(x: number, y: number, reachX: number, reachY: number, w: number, h: number, pad = 8): { x: number; y: number } {
  const cx = w < 2 * (reachX + pad) ? w / 2 : Math.min(Math.max(x, reachX + pad), w - reachX - pad);
  const cy = h < 2 * (reachY + pad) ? h / 2 : Math.min(Math.max(y, reachY + pad), h - reachY - pad);
  return { x: Math.round(cx), y: Math.round(cy) };
}

export type SocialUnavailable = 'noGift' | 'friendship' | 'romance';

export interface SocialState {
  show: boolean;
  why: SocialUnavailable | null;
  /** quanto precisa (amizade ou romance) quando falta */
  need?: number;
}

/**
 * Se a conversa aparece no anel. O que falta por amizade, romance ou
 * presente aparece em cinza com o motivo; o que não cabe na situação (idade,
 * visita, noivado, desconhecido) continua sumindo.
 */
export function socialState(world: World, catalog: Catalog, def: SocialDef, a: Folk, b: Folk): SocialState {
  if (def.hidden) return { show: false, why: null };
  if (socialAllowed(world, catalog, def, a, b)) return { show: true, why: null };
  const req = def.requires;
  if (!req || (req.friendship === undefined && req.romance === undefined && !req.gift)) return { show: false, why: null };
  const relaxed: SocialDef = { ...def, requires: { ...req, friendship: undefined, romance: undefined, gift: undefined } };
  if (!socialAllowed(world, catalog, relaxed, a, b)) return { show: false, why: null };
  if (req.gift && !(a.gifts?.length ?? 0)) return { show: true, why: 'noGift' };
  const rel = relationOf(world, a.id, b.id);
  if (req.friendship !== undefined && (rel?.friendship ?? 0) < req.friendship) return { show: true, why: 'friendship', need: req.friendship };
  if (req.romance !== undefined && (rel?.romance ?? 0) < req.romance) return { show: true, why: 'romance', need: req.romance };
  return { show: false, why: null };
}
