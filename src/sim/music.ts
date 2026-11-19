// Bloco 7: o som de casa. Rádio, caixa de som e jukebox tocam uma de três
// estações; cada folk tem a sua preferida (pelo temperamento) e dança melhor
// com ela. Som ligado gasta luz e atrapalha quem dorme no mesmo cômodo.
// Só regras puras: a música de verdade é feita em src/audio.

import type { Catalog, Folk, InteractionDef, ObjectDef, Temper, World, WorldObject } from './types';
import { roomOfObject } from './rooms';
import type { Room, RoomMap } from './rooms';

/** Estação: id, andamento (batidas por minuto) e o que cada eixo do temperamento acha dela. */
export interface StationDef {
  id: string;
  /** chave de texto (i18n) */
  name: string;
  bpm: number;
  /** peso de cada eixo (0 a 10) no gosto; o eixo pode contar ao contrário (peso negativo) */
  taste: Partial<Record<keyof Temper, number>>;
}

/** As três estações, na ordem do botão "trocar estação". */
export const STATIONS: StationDef[] = [
  // calma, de fim de tarde: para quem é carinhoso e sem pressa
  { id: 'brisa', name: 'station.brisa', bpm: 84, taste: { warmth: 1, pep: -1 } },
  // pop alegre, de refrão: para quem é expansivo e engraçado
  { id: 'chiclete', name: 'station.chiclete', bpm: 116, taste: { outgoing: 1, wit: 1 } },
  // batida forte e rápida: para quem tem pique e não liga para ordem
  { id: 'trovao', name: 'station.trovao', bpm: 140, taste: { pep: 1, order: -1 } },
];

/** Diversão a mais (ou a menos) por minuto dançando, conforme o gosto (de -DANCE_TASTE a +DANCE_TASTE). */
export const DANCE_TASTE = 0.45;
/** Quem dorme com som ligado no cômodo recupera menos energia (fração perdida). */
export const NOISY_SLEEP = 0.3;

export function stationDef(id: string | undefined): StationDef | undefined {
  return STATIONS.find((s) => s.id === id);
}

/** Objeto de som (rádio, caixa, jukebox): tudo da linha 'stereo'. */
export function isStereo(def: ObjectDef | undefined): boolean {
  return def?.line === 'stereo';
}

/** O som está tocando agora (ligado e inteiro). */
export function playing(obj: WorldObject, def?: ObjectDef): boolean {
  return !!obj.tune && !!stationDef(obj.tune) && !obj.state?.broken && (def === undefined || isStereo(def));
}

/** Nota de 0 a 20 do quanto o folk gosta da estação (10 = tanto faz). */
export function stationTaste(folk: Pick<Folk, 'temper'> & { tastes?: Folk['tastes'] }, station: StationDef): number {
  // plano 2, bloco 10: a estação favorita é nota máxima
  if (folk.tastes?.music === station.id) return 20;
  if (folk.tastes?.music) return Math.min(16, stationScore(folk, station));
  return stationScore(folk, station);
}

function stationScore(folk: Pick<Folk, 'temper'>, station: StationDef): number {
  const t = folk.temper;
  let score = 0;
  let weight = 0;
  for (const [axis, w] of Object.entries(station.taste) as [keyof Temper, number][]) {
    const v = t?.[axis] ?? 5;
    score += w > 0 ? v : 10 - v;
    weight += Math.abs(w);
  }
  return weight ? (score / weight) * 2 : 10;
}

/** A estação preferida do folk (a primeira, se empatar). */
export function favoriteStation(folk: Pick<Folk, 'temper'>): StationDef {
  let best = STATIONS[0];
  let bestScore = -Infinity;
  for (const s of STATIONS) {
    const v = stationTaste(folk, s);
    if (v > bestScore + 1e-9) {
      best = s;
      bestScore = v;
    }
  }
  return best;
}

/** Diversão extra por minuto de dança com esta estação tocando. */
export function danceBonus(folk: Pick<Folk, 'temper'>, stationId: string | undefined): number {
  const s = stationDef(stationId);
  if (!s) return 0;
  return ((stationTaste(folk, s) - 10) / 10) * DANCE_TASTE;
}

/** A estação seguinte no botão (desligado liga na primeira). */
export function nextStation(current: string | undefined): string {
  const i = STATIONS.findIndex((s) => s.id === current);
  return STATIONS[(i + 1) % STATIONS.length].id;
}

/**
 * O botão do som foi apertado. Ligar põe a estação preferida de quem ligou;
 * trocar passa para a próxima; desligar desliga. Devolve se mudou algo.
 */
export function pressTune(obj: WorldObject, it: InteractionDef, folk: Pick<Folk, 'temper'>): boolean {
  if (!it.tune) return false;
  const before = obj.tune;
  if (it.tune === 'off') delete obj.tune;
  else if (it.tune === 'next') obj.tune = nextStation(obj.tune);
  else obj.tune = favoriteStation(folk).id;
  return before !== obj.tune;
}

/** Sons tocando no cômodo. */
export function stereosIn(world: World, catalog: Catalog, map: RoomMap, room: Room): WorldObject[] {
  return world.objects.filter((o) => playing(o, catalog.objects[o.defId]) && roomOfObject(map, o) === room);
}

/** Todos os sons tocando agora na casa (a tela usa para tocar a música certa no lugar certo). */
export function playingStereos(world: World, catalog: Catalog): WorldObject[] {
  return world.objects.filter((o) => playing(o, catalog.objects[o.defId]));
}
