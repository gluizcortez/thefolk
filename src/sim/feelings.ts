/**
 * Plano 2, bloco 2: sensações do folk. Não é um sistema novo de humor: junta
 * em cartões os estados que já mexem com ele (necessidade baixa, dia
 * inspirado, luto, susto, choque, cômodo bonito ou feio, escuro, festa,
 * desejos cumpridos, chuva), cada um com ícone, motivo e, quando tem, até
 * quando dura. A HUD só mostra; a regra fica aqui para ser testada.
 */
import type { Catalog, Folk, NeedId, World } from './types';
import { NEED_IDS } from './types';
import { isInspired } from './will';
import { DARK_BELOW, roomAt, roomGrade, roomScore, roomsOf } from './rooms';
import { raining } from './garden';

export type FeelingTone = 'good' | 'bad' | 'calm';

export interface Feeling {
  /** chave curta: o texto é `feel.<id>` e o motivo `feel.<id>.why` */
  id: string;
  /** ícone (um IconId da HUD) */
  icon: string;
  tone: FeelingTone;
  /** tick em que acaba (sem campo = enquanto durar o motivo) */
  until?: number;
  params?: Record<string, string | number>;
}

/** Abaixo disto a necessidade vira sensação ruim (e abaixo de LOW_NEED/2, urgente). */
export const LOW_NEED = 25;
/** Depois de um susto com fantasma, fica assustado por tanto tempo (minutos). */
export const SCARE_FEEL = 3 * 60;

const NEED_FEEL: Record<NeedId, string> = {
  hunger: 'hungry',
  energy: 'tired',
  hygiene: 'smelly',
  bladder: 'bursting',
  comfort: 'sore',
  fun: 'bored',
  social: 'lonely',
  ambience: 'gloomy',
};

/** Sensações de agora, as ruins primeiro. */
export function feelingsOf(world: World, catalog: Catalog, folk: Folk): Feeling[] {
  const tick = world.tick;
  const out: Feeling[] = [];
  for (const id of NEED_IDS) {
    const v = folk.needs[id];
    if (v >= LOW_NEED) continue;
    out.push({ id: NEED_FEEL[id], icon: id, tone: 'bad', params: { n: Math.round(v), urgent: v < LOW_NEED / 2 ? 1 : 0 } });
  }
  if (folk.collapsed > 0) out.push({ id: 'collapsed', icon: 'sleep', tone: 'bad', until: tick + folk.collapsed });
  if ((folk.starving ?? 0) > 0) out.push({ id: 'starving', icon: 'hunger', tone: 'bad' });
  if (folk.mourning !== undefined && folk.mourning > tick) out.push({ id: 'mourning', icon: 'grave', tone: 'bad', until: folk.mourning });
  if (folk.frightened !== undefined && tick - folk.frightened < SCARE_FEEL) out.push({ id: 'scared', icon: 'ghost', tone: 'bad', until: folk.frightened + SCARE_FEEL });
  if (folk.sooty !== undefined && folk.sooty > tick) out.push({ id: 'sooty', icon: 'fire', tone: 'bad', until: folk.sooty });
  if (folk.kid && folk.kid.neglect >= 30) out.push({ id: 'neglected', icon: 'miss', tone: 'bad', params: { n: Math.round(folk.kid.neglect) } });
  // o cômodo onde está (nota e luz), só em casa
  if (!folk.away && folk.queue[0]?.kind !== 'work') {
    const map = roomsOf(world, catalog);
    const room = roomAt(map, folk.x, folk.y);
    if (room) {
      const score = roomScore(world, catalog, map, room, folk, room.outdoor ? folk : undefined);
      const grade = roomGrade(score.total);
      if (grade >= 3) out.push({ id: 'niceRoom', icon: 'ambience', tone: 'good', params: { grade } });
      else if (grade === 0) out.push({ id: 'uglyRoom', icon: 'ambience', tone: 'bad' });
      if (!room.outdoor && score.level < DARK_BELOW) out.push({ id: 'dark', icon: 'energy', tone: 'bad' });
      if (room.outdoor && raining(world)) out.push({ id: 'rain', icon: 'swim', tone: 'calm' });
    }
  }
  if (isInspired(folk, tick)) out.push({ id: 'inspired', icon: 'spark', tone: 'good', until: folk.inspired });
  if (folk.wishes.length > 0 && folk.wishes.every((w) => w.done)) out.push({ id: 'wishesDone', icon: 'yes', tone: 'good' });
  const party = world.party;
  if (party && tick >= party.start && tick < party.end && !folk.away) out.push({ id: party.wedding ? 'wedding' : 'party', icon: 'heart', tone: 'good', until: party.end });
  // as boas que só aparecem quando está tudo em ordem
  const full = NEED_IDS.filter((id) => folk.needs[id] >= 85).length;
  if (full >= 6) out.push({ id: 'cared', icon: 'mood', tone: 'good', params: { n: full } });
  const rank: Record<FeelingTone, number> = { bad: 0, calm: 1, good: 2 };
  return out.sort((a, b) => rank[a.tone] - rank[b.tone]);
}
