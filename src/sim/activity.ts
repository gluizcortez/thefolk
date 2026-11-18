// Plano 2, bloco 4: motor de atividades.
//
// Uma interação deixa de ser "andar até o objeto e ficar lá N minutos" e vira
// um pequeno roteiro: chegar ao LUGAR certo do objeto (o assento do sofá, o
// lado da cama), ENTRAR (sentar, deitar), o LAÇO da atividade (com variações)
// e SAIR (levantar). Sentado é uma POSTURA que fica entre uma ação e outra:
// quem está no sofá não levanta para fazer outra coisa que também se faz
// sentado, e o que passa na TV em frente segue divertindo enquanto conversa
// com quem está ao lado ou come o prato que trouxe.
//
// Tudo aqui é puro (lê o mundo, não muda nada); quem muda é o Sim.

import { blazing } from './peril';
import { footprint, levelOfRow, useTiles, type Nav } from './grid';
import { findPathToAny } from './pathfinding';
import { playing } from './music';
import { roomAt, roomsOf } from './rooms';
import { isChild } from './kids';
import type {
  Action,
  Catalog,
  Folk,
  InteractionDef,
  Needs,
  ObjectDef,
  Reaction2,
  Side,
  SkillGain,
  SpotDef,
  StageDef,
  Vec,
  ViewDef,
  World,
  WorldObject,
} from './types';

/** Minutos para sentar (etapa de entrada de quem senta). */
export const SIT_DOWN = 1;
/** Minutos para levantar (etapa de saída de quem estava sentado). */
export const RISE = 1;
/** Deitar e levantar da cama. */
export const LIE_DOWN = 2;
export const GET_UP = 2;
/** Assistir sentado rende um pouco de conforto do assento, além da diversão. */
export const SEAT_COMFORT = 0.35;
/** Fração do que a TV (ou o som, ou o fogo) rende para quem só está por perto sentado. */
export const PASSIVE = 0.6;
/** Distância do meio da roda de conversa até onde dá para participar sentado. */
export const CIRCLE_SEATED = 3;
/** Até quantos passos o folk anda para achar um assento melhor para assistir. */
export const VIEW_REACH = 18;

const DIR: Record<Side, Vec> = { N: { x: 0, y: -1 }, E: { x: 1, y: 0 }, S: { x: 0, y: 1 }, W: { x: -1, y: 0 } };
const SIDES: Side[] = ['S', 'E', 'N', 'W'];

function rotSide(side: Side, rot: number): Side {
  return SIDES[(SIDES.indexOf(side) + rot) % 4];
}

const key = (x: number, y: number) => `${x},${y}`;

// ---------- lugares ----------

/** O objeto tem assento (alguma interação de sentar em cima dele)? */
export function isSeat(def: ObjectDef | undefined): boolean {
  return !!def && spotsOf(def).some((s) => s.kind === 'sit');
}

const spotCache = new Map<string, SpotDef[]>();

/**
 * Lugares de uso do objeto: os feitos à mão (`def.spots`) ou, sem eles, um
 * assento por vaga ao longo do lado de uso para tudo em que se senta em cima
 * (sofá de 2 lugares = 2 assentos, poltrona e cadeira = 1). Objetos de outro
 * tipo seguem com os tiles de uso de sempre (lista vazia).
 */
export function spotsOf(def: ObjectDef): SpotDef[] {
  if (def.spots) return def.spots;
  const hit = spotCache.get(def.id);
  if (hit) return hit;
  const out: SpotDef[] = [];
  const sits = def.interactions.some((i) => i.pose === 'sit' && i.onObject);
  if (sits) {
    const side = def.useSides?.[0] ?? 'S';
    const { w, h } = def.size;
    if (def.dining === 'both' && w >= 2 && h === 1) {
      // mesa com cadeiras: uma em cada ponta
      const n = Math.max(1, def.slots ?? 1);
      const ends: SpotDef[] = [
        { kind: 'sit', cell: { x: 0, y: 0 }, side: 'W' },
        { kind: 'sit', cell: { x: w - 1, y: 0 }, side: 'E' },
      ];
      const out2 = ends.slice(0, Math.min(2, n));
      spotCache.set(def.id, out2);
      return out2;
    }
    const n = Math.max(1, def.slots ?? 1);
    if (def.useSides && def.useSides.length > 1 && n > 1) {
      // usado de vários lados (tabuleiro, mesinha): um lugar por lado
      const out2 = def.useSides.slice(0, n).map((sd): SpotDef => ({
        kind: 'sit',
        cell: { x: sd === 'E' ? w - 1 : sd === 'W' ? 0 : Math.floor((w - 1) / 2), y: sd === 'S' ? h - 1 : sd === 'N' ? 0 : Math.floor((h - 1) / 2) },
        side: sd,
      }));
      spotCache.set(def.id, out2);
      return out2;
    }
    const cells: Vec[] = [];
    if (side === 'S' || side === 'N') for (let x = 0; x < w; x++) cells.push({ x, y: side === 'S' ? h - 1 : 0 });
    else for (let y = 0; y < h; y++) cells.push({ x: side === 'E' ? w - 1 : 0, y });
    const m = Math.min(cells.length, n);
    for (let i = 0; i < m; i++) out.push({ kind: 'sit', cell: cells[i], side });
  }
  spotCache.set(def.id, out);
  return out;
}

/** Célula do mundo de um lugar (gira junto com o objeto). */
export function spotCell(obj: Pick<WorldObject, 'x' | 'y' | 'rot'>, def: ObjectDef, spot: SpotDef): Vec {
  let { x, y } = spot.cell;
  let w = def.size.w;
  let h = def.size.h;
  for (let r = 0; r < (obj.rot ?? 0); r++) {
    const nx = y;
    const ny = w - 1 - x;
    x = nx;
    y = ny;
    [w, h] = [h, w];
  }
  return { x: obj.x + x, y: obj.y + y };
}

/** Para onde o folk fica virado sentado nesse lugar. */
export function spotFace(obj: Pick<WorldObject, 'rot'>, spot: SpotDef): Vec {
  return { ...DIR[rotSide(spot.side, obj.rot ?? 0)] };
}

export interface SpotPlace {
  index: number;
  spot: SpotDef;
  /** célula do objeto onde o folk fica */
  cell: Vec;
  /** para onde fica virado */
  face: Vec;
  /** tiles de chegada (do lado de uso, colados na célula) */
  from: Vec[];
}

/** Lugares do objeto já no mundo, com os tiles de onde se chega a cada um. */
export function spotPlaces(world: World, nav: Nav, obj: WorldObject, def: ObjectDef): SpotPlace[] {
  const spots = spotsOf(def);
  if (spots.length === 0) return [];
  const tiles = useTiles(world, nav, obj, def);
  return spots.map((spot, index) => {
    const cell = spotCell(obj, def, spot);
    const face = spotFace(obj, spot);
    // primeiro o tile da frente do assento; depois os outros lados colados nele
    const front = { x: cell.x + face.x, y: cell.y + face.y };
    let near = tiles.filter((t) => Math.abs(t.x - cell.x) + Math.abs(t.y - cell.y) === 1);
    // sem tile colado (mesa com cadeira na ponta, só usada de um lado): qualquer tile de uso serve
    if (near.length === 0) near = tiles.slice();
    near.sort((a, b) => Number(b.x === front.x && b.y === front.y) - Number(a.x === front.x && a.y === front.y));
    return { index, spot, cell, face, from: near };
  });
}

/** O objeto que a ação ocupa como assento (comer, assistir, sentar), se ela tem lugar. */
export function seatOfAction(a: Action): number | undefined {
  if (a.kind !== 'use') return undefined;
  return a.seatAt ?? a.eatAt ?? a.objectId;
}

/** Quem está no lugar (sentado, sentando ou a caminho), menos `except`. */
export function spotOwner(world: World, objectId: number, index: number, except?: Folk): Folk | undefined {
  for (const f of world.folks) {
    if (f === except || f.away) continue;
    if (f.posture && f.posture.objectId === objectId && f.posture.spot === index) return f;
    const a = f.queue[0];
    if (a && a.phase !== 'queued' && a.slot === index && seatOfAction(a) === objectId) return f;
  }
  return undefined;
}

/** O lugar em que o folk está sentado agora (ou undefined). */
export function seatedPlace(world: World, _nav: Nav, catalog: Catalog, folk: Folk): (SpotPlace & { obj: WorldObject; def: ObjectDef }) | undefined {
  const p = folk.posture;
  if (!p) return undefined;
  const obj = world.objects.find((o) => o.id === p.objectId);
  const def = obj && catalog.objects[obj.defId];
  if (!obj || !def) return undefined;
  const spot = spotsOf(def)[p.spot];
  if (!spot) return undefined;
  return { obj, def, index: p.spot, spot, cell: spotCell(obj, def, spot), face: spotFace(obj, spot), from: [] };
}

/** Lugar livre do objeto mais perto do folk a pé (o que ele já ocupa vale primeiro). */
export function freeSeatSpot(world: World, nav: Nav, folk: Folk, obj: WorldObject, def: ObjectDef): { place: SpotPlace; path: Vec[] } | null {
  const places = spotPlaces(world, nav, obj, def);
  if (folk.posture?.objectId === obj.id) {
    const mine = places.find((p) => p.index === folk.posture!.spot);
    if (mine) return { place: mine, path: [] };
  }
  let best: { place: SpotPlace; path: Vec[] } | null = null;
  for (const place of places) {
    if (!whoFits(folk, place.spot) || spotOwner(world, obj.id, place.index, folk)) continue;
    if (place.from.length === 0) continue;
    const path = findPathToAny(nav, folk, place.from);
    if (!path) continue;
    if (!best || path.length < best.path.length) best = { place, path };
  }
  return best;
}

function whoFits(folk: Folk, spot: SpotDef): boolean {
  if (spot.who === 'child') return isChild(folk);
  if (spot.who === 'adult') return !isChild(folk);
  return true;
}

// ---------- área de visão ----------

/** Área de visão (ou de escuta) do objeto: a feita à mão ou a da linha (TV, som). */
export function viewOf(def: ObjectDef | undefined): ViewDef | undefined {
  if (!def) return undefined;
  if (def.view) return def.view;
  if (def.line === 'tv') return { kind: 'tv', depth: def.tier === 2 ? 6 : 5 };
  if (def.line === 'stereo') return { kind: 'music', depth: 6 };
  return undefined;
}

/** Lado para onde o objeto olha (a tela da TV, a boca da lareira). */
export function frontOf(obj: Pick<WorldObject, 'rot'>, def: ObjectDef): Vec {
  return { ...DIR[rotSide(def.useSides?.[0] ?? 'S', obj.rot ?? 0)] };
}

/**
 * Tiles de onde se vê (ou ouve) o objeto. TV e lareira: um leque que abre na
 * frente, um tile a mais para cada lado a cada dois de fundo. Som: um raio. Só
 * no mesmo andar e no mesmo cômodo do tile da frente (parede tapa a vista).
 */
export function viewArea(world: World, catalog: Catalog, obj: WorldObject, def: ObjectDef): Set<string> {
  const view = viewOf(def);
  const out = new Set<string>();
  if (!view) return out;
  const own = footprint(obj, def);
  const grid = world.grid;
  const level = levelOfRow(grid, obj.y);
  const rooms = roomsOf(world, catalog);
  const f = frontOf(obj, def);
  const ref = view.kind === 'music' ? own[0] : { x: own[0].x + f.x, y: own[0].y + f.y };
  const home = roomAt(rooms, ref.x, ref.y)?.id ?? -1;
  const ok = (x: number, y: number) =>
    x >= 0 && x < grid.w && levelOfRow(grid, y) === level && !own.some((t) => t.x === x && t.y === y) && (roomAt(rooms, x, y)?.id ?? -1) === home;
  if (view.kind === 'music') {
    for (const t of own) {
      for (let dy = -view.depth; dy <= view.depth; dy++) {
        for (let dx = -view.depth; dx <= view.depth; dx++) {
          if (Math.abs(dx) + Math.abs(dy) > view.depth) continue;
          if (ok(t.x + dx, t.y + dy)) out.add(key(t.x + dx, t.y + dy));
        }
      }
    }
    return out;
  }
  // tiles da borda da frente e o eixo lateral
  const lat = { x: f.y !== 0 ? 1 : 0, y: f.x !== 0 ? 1 : 0 };
  const edge = own.filter((t) => !own.some((o) => o.x === t.x + f.x && o.y === t.y + f.y));
  for (let k = 1; k <= view.depth; k++) {
    const spread = Math.floor(k / 2);
    for (const t of edge) {
      for (let s = -spread; s <= spread; s++) {
        const x = t.x + f.x * k + lat.x * s;
        const y = t.y + f.y * k + lat.y * s;
        if (ok(x, y)) out.add(key(x, y));
      }
    }
  }
  return out;
}

/** Centro do objeto (em tiles, com meio tile). */
function centerOf(obj: WorldObject, def: ObjectDef): { x: number; y: number } {
  const own = footprint(obj, def);
  const x = own.reduce((s, t) => s + t.x, 0) / own.length;
  const y = own.reduce((s, t) => s + t.y, 0) / own.length;
  return { x, y };
}

/** O lugar está virado para o objeto (no máximo uns 60 graus de lado)? */
export function facesToward(place: Pick<SpotPlace, 'cell' | 'face'>, obj: WorldObject, def: ObjectDef): boolean {
  const c = centerOf(obj, def);
  const vx = c.x - place.cell.x;
  const vy = c.y - place.cell.y;
  const len = Math.hypot(vx, vy);
  if (len === 0) return false;
  return (place.face.x * vx + place.face.y * vy) / len >= 0.5;
}

/** Distância (em tiles) do lugar até o objeto. */
function distTo(cell: Vec, obj: WorldObject, def: ObjectDef): number {
  const c = centerOf(obj, def);
  return Math.hypot(c.x - cell.x, c.y - cell.y);
}

/** Conforto de um assento (o efeito de descansar nele). */
function seatComfort(def: ObjectDef): number {
  const it = def.interactions.find((i) => i.pose === 'sit' && i.onObject);
  return it?.effects.comfort ?? 1;
}

export interface SeatChoice {
  seat: WorldObject;
  def: ObjectDef;
  place: SpotPlace;
  path: Vec[];
}

/**
 * O melhor assento livre para assistir `target` (TV, lareira) ou ouvir (som):
 * dentro da área, virado para ela (menos no som), perto da distância boa,
 * confortável e sem andar demais. Quem já está sentado num lugar bom fica nele.
 */
export function bestSeat(world: World, catalog: Catalog, nav: Nav, folk: Folk, target: WorldObject, tdef: ObjectDef): SeatChoice | null {
  const view = viewOf(tdef);
  if (!view) return null;
  const area = viewArea(world, catalog, target, tdef);
  const ideal = view.kind === 'music' ? 2 : 2.5;
  let best: (SeatChoice & { score: number }) | null = null;
  for (const seat of world.objects) {
    if (seat.id === target.id) continue;
    const def = catalog.objects[seat.defId];
    if (!def || !isSeat(def)) continue;
    for (const place of spotPlaces(world, nav, seat, def)) {
      if (place.spot.kind !== 'sit' || !whoFits(folk, place.spot)) continue;
      if (!area.has(key(place.cell.x, place.cell.y))) continue;
      if (view.kind !== 'music' && !facesToward(place, target, tdef)) continue;
      const mine = folk.posture?.objectId === seat.id && folk.posture.spot === place.index;
      if (!mine && spotOwner(world, seat.id, place.index, folk)) continue;
      let path: Vec[] | null = [];
      if (!mine) {
        if (place.from.length === 0) continue;
        path = findPathToAny(nav, folk, place.from);
        if (!path || path.length > VIEW_REACH) continue;
      }
      const score = (mine ? -6 : 0) + path.length * 0.25 + Math.abs(distTo(place.cell, target, tdef) - ideal) * 1.4 - seatComfort(def) * 1.5;
      if (!best || score < best.score) best = { seat, def, place, path, score };
    }
  }
  return best && { seat: best.seat, def: best.def, place: best.place, path: best.path };
}

/** O lugar em que o folk está sentado fica dentro da área do objeto (e virado para ele)? */
export function seatSees(world: World, catalog: Catalog, nav: Nav, folk: Folk, target: WorldObject, tdef: ObjectDef): boolean {
  const view = viewOf(tdef);
  const at = seatedPlace(world, nav, catalog, folk);
  if (!view || !at) return false;
  if (!viewArea(world, catalog, target, tdef).has(key(at.cell.x, at.cell.y))) return false;
  return view.kind === 'music' || facesToward(at, target, tdef);
}

// ---------- o que está passando ----------

export interface ChannelDef {
  id: string;
  /** chave de texto */
  name: string;
  /** multiplicador da diversão da TV (adulto e criança) */
  fun: number;
  kidFun: number;
  /** efeitos a mais por minuto */
  effects?: Partial<Needs>;
  /** habilidade que se aprende assistindo */
  skill?: SkillGain;
  /** reações que o canal tira de quem assiste */
  reacts: Reaction2['kind'][];
}

export const CHANNELS: ChannelDef[] = [
  { id: 'drama', name: 'channel.drama', fun: 1, kidFun: 0.5, effects: { social: 0.15 }, reacts: ['cry', 'gasp', 'laugh'] },
  { id: 'sport', name: 'channel.sport', fun: 1.15, kidFun: 0.8, reacts: ['cheer', 'cheer', 'gasp'] },
  { id: 'cook', name: 'channel.cook', fun: 0.6, kidFun: 0.4, skill: { id: 'cooking', xpPerMinute: 0.5 }, reacts: ['gasp', 'laugh'] },
  { id: 'toon', name: 'channel.toon', fun: 0.6, kidFun: 1.6, reacts: ['laugh', 'laugh', 'cheer'] },
];

export function channelDef(id: string | undefined): ChannelDef | undefined {
  return CHANNELS.find((c) => c.id === id);
}

/** Canal preferido (criança vai de desenho; o resto pelo temperamento). */
export function favoriteChannel(folk: Pick<Folk, 'id' | 'age' | 'temper'>): string {
  if (folk.age === 'child' || folk.age === 'baby') return 'toon';
  const t = folk.temper;
  if (t) {
    const axes: [number, string][] = [
      [t.pep, 'sport'],
      [t.warmth, 'drama'],
      [t.order, 'cook'],
      [t.wit, 'toon'],
    ];
    axes.sort((a, b) => b[0] - a[0]);
    if (axes[0][0] >= 6) return axes[0][1];
  }
  return CHANNELS[folk.id % 3].id;
}

/** A TV está ligada (e funcionando)? */
export function tvOn(obj: WorldObject): boolean {
  return !!obj.channel && !obj.state?.broken;
}

/** O objeto está "passando alguma coisa" (TV ligada, som tocando, fogo aceso)? */
export function showing(world: World, obj: WorldObject, def: ObjectDef): boolean {
  const view = viewOf(def);
  if (!view) return false;
  if (view.kind === 'tv') return tvOn(obj);
  if (view.kind === 'music') return playing(obj, def);
  return blazing(world, obj);
}

/** Interação que é assistir (sentado ou de pé na frente). */
export function isWatch(it: InteractionDef | undefined): boolean {
  return !!it?.watch && it.channel !== 'off';
}

/**
 * O que o folk sentado está aproveitando sem estar ativamente assistindo: a
 * TV ligada em frente, o som tocando no cômodo, o fogo aceso na lareira.
 */
export function passiveShows(world: World, catalog: Catalog, nav: Nav, folk: Folk): WorldObject[] {
  if (!folk.posture || folk.posture.rising !== undefined) return [];
  const out: WorldObject[] = [];
  for (const obj of world.objects) {
    const def = catalog.objects[obj.defId];
    if (!def || !viewOf(def) || !showing(world, obj, def)) continue;
    if (seatSees(world, catalog, nav, folk, obj, def)) out.push(obj);
  }
  return out;
}

/**
 * Sorteio sem gastar o RNG do mundo (as reações são só tempero): a cada
 * minuto, 1 chance em `n` para este folk.
 */
export function chance(tick: number, folkId: number, n: number): number {
  let h = (tick * 2654435761 + folkId * 40503) >>> 0;
  h ^= h >>> 15;
  h = Math.imul(h, 0x2c1b3c6d) >>> 0;
  h ^= h >>> 12;
  // o xor devolve inteiro com sinal: sem o >>> 0 o índice podia sair negativo
  return (h >>> 0) % n;
}

// ---------- postura e etapas ----------

/** Etapas de entrada e saída da interação (feitas à mão ou tiradas da postura). */
export function stagesOf(it: InteractionDef): { enter?: StageDef; exit?: StageDef } {
  if (it.stages) return it.stages;
  if (it.pose === 'lie' && it.onObject) return { enter: { minutes: LIE_DOWN, anim: 'lieDown' }, exit: { minutes: GET_UP, anim: 'getUp' } };
  return {};
}

/** A interação se faz sentado num assento (e deixa o folk sentado no fim)? */
export function sitsOn(it: InteractionDef | undefined): boolean {
  return !!it && it.pose === 'sit' && !!it.onObject;
}

/**
 * Quem está sentado pode começar `action` sem levantar? Conversa e roda com
 * quem está do lado, outra coisa no mesmo assento, assistir o que dá para
 * ver dali, ou algo que se faz sentado (ler, ligar, comer o prato trazido).
 */
export function keepsPosture(world: World, catalog: Catalog, nav: Nav, folk: Folk, action: Action, it: InteractionDef | undefined): boolean {
  const p = folk.posture;
  if (!p) return true;
  if (action.kind === 'social' || action.kind === 'listen') {
    // conversa já começada: se o outro levantou, ela acaba sozinha; quem ficou segue sentado
    if (action.phase === 'using' || action.kind === 'listen') return true;
    const other = world.folks.find((f) => f.id === action.otherId);
    return !!other && Math.abs(other.x - folk.x) + Math.abs(other.y - folk.y) <= 1;
  }
  if (action.kind === 'circle') {
    // roda de conversa sentada: só quem está perto do meio da roda fica no lugar
    const c = world.circles.find((x) => x.id === action.circleId);
    return !!c && Math.abs(c.center.x - folk.x) + Math.abs(c.center.y - folk.y) <= CIRCLE_SEATED;
  }
  if (action.kind !== 'use') return false;
  if (it?.seated) return true;
  if (action.seatAt !== undefined) return action.seatAt === p.objectId && action.slot === p.spot;
  if (action.eatAt !== undefined) return action.eatAt === p.objectId;
  if (action.objectId === p.objectId && sitsOn(it)) return true;
  if (isWatch(it) || it?.channel === 'off') {
    const obj = world.objects.find((o) => o.id === action.objectId);
    const def = obj && catalog.objects[obj.defId];
    if (obj && def && seatSees(world, catalog, nav, folk, obj, def)) return true;
  }
  return false;
}

/** Assento livre que não é de mesa (sofá, poltrona) até `reach` passos, para comer com o prato no colo. */
export function couchSeat(world: World, catalog: Catalog, nav: Nav, folk: Folk, reach: number): SeatChoice | null {
  let best: SeatChoice | null = null;
  for (const seat of world.objects) {
    const def = catalog.objects[seat.defId];
    if (!def || def.dining || !isSeat(def) || def.category !== 'seating') continue;
    const fs = freeSeatSpot(world, nav, folk, seat, def);
    if (!fs || fs.path.length > reach) continue;
    if (!best || fs.path.length < best.path.length) best = { seat, def, place: fs.place, path: fs.path };
  }
  return best;
}

/** O que dá para fazer sentado onde está, sem objeto na frente. */
export const SEATED: Record<string, InteractionDef> = {
  seatRead: {
    id: 'seatRead',
    label: 'act.seatRead',
    duration: 60,
    effects: { fun: 0.8, comfort: 0.2 },
    until: 'fun',
    hold: 'book',
    pose: 'sit',
    onObject: true,
    seated: true,
    autonomous: false,
  },
  seatCall: {
    id: 'seatCall',
    label: 'act.seatCall',
    duration: 40,
    effects: { social: 2.2, fun: 0.2, comfort: 0.1 },
    until: 'social',
    cost: 1,
    skill: { id: 'charisma', xpPerMinute: 0.3 },
    special: 'call',
    hold: 'phone',
    pose: 'sit',
    onObject: true,
    seated: true,
    autonomous: false,
  },
};

/** A ação é algo que se faz sentado (quem traz o prato não o larga para fazer isso)? */
export function sitFriendly(it: InteractionDef | undefined): boolean {
  return !!it && (sitsOn(it) || isWatch(it) || !!it.seated);
}
