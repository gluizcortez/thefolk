// Plano 2, bloco 8: objetos montados por peças. Um sofá é "estrutura reta +
// almofadas soltas + encosto alto + braço curvo + pé palito". Cada tipo de
// móvel (kind) diz que encaixes tem; cada peça diz em que tipos entra, o que
// ela pede das outras e quanto ocupa. `assemble` monta, confere e mede.
// Puro: o desenho de cada peça mora em game/art/parts.ts.

import type { MatFamily, ObjStyle, PartStyle, ZoneDef } from './style';
import { cleanStyle, stylePrice } from './style';

export type KitKind =
  | 'sofa'
  | 'armchair'
  | 'chair'
  | 'stool'
  | 'bench'
  | 'bed'
  | 'table'
  | 'coffee'
  | 'side'
  | 'desk'
  | 'counter'
  | 'dresser'
  | 'nightstand'
  | 'bookshelf'
  | 'wardrobe'
  | 'cabinet';

export type PartSlot =
  | 'frame'
  | 'seat'
  | 'back'
  | 'arms'
  | 'legs'
  | 'headboard'
  | 'bedding'
  | 'top'
  | 'body'
  | 'doors'
  | 'handles';

export type KitParts = Partial<Record<PartSlot, string>>;

export interface KitDef {
  kind: KitKind;
  parts: KitParts;
  /** estilo de fábrica (por cima do natural de cada zona) */
  style?: ObjStyle;
}

export interface PartDef {
  id: string;
  slot: PartSlot;
  kinds: KitKind[];
  /** quanto a mais custa (em relação à peça mais simples do encaixe) */
  price: number;
  /** altura que a peça soma ou ocupa, em metros */
  h?: number;
  /** quanto come da largura em cada lado (braços, laterais) */
  side?: number;
  /** o que precisa das outras peças: encaixe → ids aceitos */
  needs?: Partial<Record<PartSlot, string[]>>;
  /** a peça tem o tecido por fora (pede zona de tecido) */
  soft?: boolean;
}

export interface KindDef {
  /** encaixes, na ordem do editor */
  slots: PartSlot[];
  /** famílias de material por encaixe (a primeira é a natural) */
  families: Partial<Record<PartSlot, MatFamily[]>>;
  /** material de fábrica por encaixe */
  base: Partial<Record<PartSlot, PartStyle>>;
  /** profundidade do móvel em metros */
  depth: number;
  /** assento: altura de cima da almofada (fixa: é onde o folk senta) */
  seatTop?: number;
  /** tampo ou colchão: altura (fixa: é onde vão os pratos e as coisas) */
  top?: number;
  /** lugares por tile de largura (sofá 1, banco 1) */
  seatsPerTile?: number;
  /** largura mínima de cada lugar */
  seatWidth?: number;
  /** as pernas vão do chão até a estrutura (cadeira, mesa); sem isso, o pé é curto e soma */
  tallLegs?: boolean;
  /** altura do corpo (estante, guarda-roupa), sem o tampo */
  bodyH?: number;
  /** tem tampo onde se põe coisa em cima */
  surface?: boolean;
}

const FABRIC: MatFamily[] = ['fabric'];
const WOOD: MatFamily[] = ['wood', 'metal', 'plastic'];
const LEGS: MatFamily[] = ['wood', 'metal', 'plastic'];
const SOFT_OR_WOOD: MatFamily[] = ['fabric', 'wood', 'metal', 'plastic'];
const TOPS: MatFamily[] = ['wood', 'stone', 'plastic'];
const BODY: MatFamily[] = ['wood', 'plastic', 'metal'];

const wood = (mat = 'walnut'): PartStyle => ({ mat });
const cloth = (color = 'blue', mat = 'cotton'): PartStyle => ({ mat, color });

export const KINDS: Record<KitKind, KindDef> = {
  sofa: {
    slots: ['frame', 'seat', 'back', 'arms', 'legs'],
    families: { frame: SOFT_OR_WOOD, seat: FABRIC, back: FABRIC, arms: SOFT_OR_WOOD, legs: LEGS },
    base: { frame: cloth(), seat: cloth(), back: cloth(), arms: cloth(), legs: wood() },
    depth: 0.86,
    seatTop: 0.43,
    seatsPerTile: 1,
    seatWidth: 0.5,
  },
  armchair: {
    slots: ['frame', 'seat', 'back', 'arms', 'legs'],
    families: { frame: SOFT_OR_WOOD, seat: FABRIC, back: FABRIC, arms: SOFT_OR_WOOD, legs: LEGS },
    base: { frame: cloth('red'), seat: cloth('red'), back: cloth('red'), arms: cloth('red'), legs: wood() },
    depth: 0.84,
    seatTop: 0.43,
    seatsPerTile: 1,
    seatWidth: 0.5,
  },
  chair: {
    slots: ['frame', 'seat', 'back', 'legs'],
    families: { frame: WOOD, seat: ['fabric', 'wood', 'plastic'], back: SOFT_OR_WOOD, legs: LEGS },
    base: { frame: { mat: 'chrome' }, seat: { mat: 'vinyl', color: 'red' }, back: { mat: 'vinyl', color: 'red' }, legs: { mat: 'chrome' } },
    depth: 0.46,
    seatTop: 0.47,
    seatsPerTile: 1,
    seatWidth: 0.38,
    tallLegs: true,
  },
  stool: {
    slots: ['frame', 'seat', 'legs'],
    families: { frame: WOOD, seat: ['fabric', 'wood', 'plastic'], legs: LEGS },
    base: { frame: { mat: 'chrome' }, seat: { mat: 'vinyl', color: 'red' }, legs: { mat: 'chrome' } },
    depth: 0.4,
    seatTop: 0.68,
    seatsPerTile: 1,
    seatWidth: 0.34,
    tallLegs: true,
  },
  bench: {
    slots: ['frame', 'seat', 'back', 'legs'],
    families: { frame: WOOD, seat: ['wood', 'fabric', 'plastic'], back: SOFT_OR_WOOD, legs: LEGS },
    base: { frame: wood('oak'), seat: wood('oak'), back: wood('oak'), legs: wood('oak') },
    depth: 0.46,
    seatTop: 0.45,
    seatsPerTile: 1,
    seatWidth: 0.45,
    tallLegs: true,
  },
  bed: {
    slots: ['frame', 'headboard', 'legs', 'bedding'],
    families: { frame: SOFT_OR_WOOD, headboard: SOFT_OR_WOOD, legs: LEGS, bedding: FABRIC },
    base: { frame: wood(), headboard: wood(), legs: wood(), bedding: cloth('mustard') },
    depth: 1.92,
    top: 0.5,
  },
  table: {
    slots: ['top', 'frame', 'legs'],
    families: { top: TOPS, frame: WOOD, legs: LEGS },
    base: { top: wood('oak'), frame: wood('oak'), legs: wood('oak') },
    depth: 0.9,
    top: 0.76,
    tallLegs: true,
    surface: true,
  },
  coffee: {
    slots: ['top', 'frame', 'legs'],
    families: { top: TOPS, frame: WOOD, legs: LEGS },
    base: { top: wood('walnut'), frame: wood('walnut'), legs: wood('walnut') },
    depth: 0.6,
    top: 0.42,
    tallLegs: true,
    surface: true,
  },
  side: {
    slots: ['top', 'frame', 'legs'],
    families: { top: TOPS, frame: WOOD, legs: LEGS },
    base: { top: wood('oak'), frame: wood('oak'), legs: wood('oak') },
    depth: 0.5,
    top: 0.56,
    tallLegs: true,
    surface: true,
  },
  desk: {
    slots: ['top', 'body', 'doors', 'handles', 'legs'],
    families: { top: TOPS, body: BODY, doors: BODY, handles: ['metal', 'wood', 'plastic'], legs: LEGS },
    base: { top: wood('oak'), body: wood('oak'), doors: wood('oak'), handles: { mat: 'brass' }, legs: wood('oak') },
    depth: 0.7,
    top: 0.76,
    tallLegs: true,
    surface: true,
  },
  counter: {
    slots: ['top', 'body', 'doors', 'handles', 'legs'],
    families: { top: TOPS, body: BODY, doors: BODY, handles: ['metal', 'wood', 'plastic'], legs: LEGS },
    base: { top: { mat: 'formica' }, body: { mat: 'lacquer', color: 'teal' }, doors: { mat: 'lacquer', color: 'teal' }, handles: { mat: 'chrome' }, legs: { mat: 'iron' } },
    depth: 0.62,
    top: 0.92,
    bodyH: 0.84,
    surface: true,
  },
  dresser: {
    slots: ['top', 'body', 'doors', 'handles', 'legs'],
    families: { top: TOPS, body: BODY, doors: BODY, handles: ['metal', 'wood', 'plastic'], legs: LEGS },
    base: { top: wood(), body: wood(), doors: wood(), handles: { mat: 'brass' }, legs: wood() },
    depth: 0.5,
    top: 0.84,
    bodyH: 0.8,
    surface: true,
  },
  nightstand: {
    slots: ['top', 'body', 'doors', 'handles', 'legs'],
    families: { top: TOPS, body: BODY, doors: BODY, handles: ['metal', 'wood', 'plastic'], legs: LEGS },
    base: { top: wood(), body: wood(), doors: wood(), handles: { mat: 'brass' }, legs: wood() },
    depth: 0.44,
    top: 0.56,
    bodyH: 0.52,
    surface: true,
  },
  bookshelf: {
    slots: ['top', 'body', 'doors', 'handles', 'legs'],
    families: { top: TOPS, body: BODY, doors: BODY, handles: ['metal', 'wood', 'plastic'], legs: LEGS },
    base: { top: wood('oak'), body: wood('oak'), doors: wood('oak'), handles: { mat: 'brass' }, legs: wood('oak') },
    depth: 0.38,
    top: 1.78,
    bodyH: 1.74,
  },
  wardrobe: {
    slots: ['top', 'body', 'doors', 'handles', 'legs'],
    families: { top: TOPS, body: BODY, doors: BODY, handles: ['metal', 'wood', 'plastic'], legs: LEGS },
    base: { top: wood(), body: wood(), doors: wood(), handles: { mat: 'brass' }, legs: wood() },
    depth: 0.6,
    top: 1.92,
    bodyH: 1.88,
  },
  cabinet: {
    slots: ['top', 'body', 'doors', 'handles', 'legs'],
    families: { top: TOPS, body: BODY, doors: BODY, handles: ['metal', 'wood', 'plastic'], legs: LEGS },
    base: { top: wood(), body: wood(), doors: wood(), handles: { mat: 'brass' }, legs: wood() },
    depth: 0.48,
    top: 0.82,
    bodyH: 0.78,
    surface: true,
  },
};

const SEATING: KitKind[] = ['sofa', 'armchair'];
const HARD: KitKind[] = ['chair', 'stool', 'bench'];
const TABLES: KitKind[] = ['table', 'coffee', 'side', 'desk'];
const CASES: KitKind[] = ['desk', 'counter', 'dresser', 'nightstand', 'bookshelf', 'wardrobe', 'cabinet'];

const p = (id: string, slot: PartSlot, kinds: KitKind[], price: number, extra: Partial<PartDef> = {}): PartDef => ({ id, slot, kinds, price, ...extra });

export const PARTS: PartDef[] = [
  // estrutura do estofado: a caixa que segura as almofadas
  p('box', 'frame', [...SEATING, 'bed'], 0, { h: 0.18 }),
  p('slim', 'frame', [...SEATING, 'bed'], 0, { h: 0.08 }),
  p('skirt', 'frame', SEATING, 30, { h: 0.2, soft: true, needs: { legs: ['none'] } }),
  p('platform', 'frame', ['bed'], 40, { h: 0.22, needs: { legs: ['none', 'block'] } }),
  // estrutura das cadeiras e mesas: travessa entre as pernas
  p('rail', 'frame', [...HARD, ...TABLES.filter((k) => k !== 'desk')], 0, { h: 0.06 }),
  p('apron', 'frame', [...HARD, ...TABLES.filter((k) => k !== 'desk')], 20, { h: 0.1 }),
  p('tube', 'frame', ['chair', 'stool'], 15, { h: 0.03, needs: { legs: ['tube'] } }),
  // assento
  p('cushions', 'seat', SEATING, 0, { h: 0.14, soft: true }),
  p('bench', 'seat', [...SEATING, 'bench'], 0, { h: 0.12, soft: true }),
  p('tufted', 'seat', SEATING, 40, { h: 0.13, soft: true }),
  p('pad', 'seat', [...SEATING, ...HARD], 0, { h: 0.06, soft: true }),
  p('slab', 'seat', HARD, 0, { h: 0.04 }),
  p('saddle', 'seat', ['stool', 'chair'], 15, { h: 0.06 }),
  // encosto
  p('low', 'back', [...SEATING, 'chair', 'bench'], 0, { h: 0.26 }),
  p('high', 'back', [...SEATING, 'chair'], 20, { h: 0.46 }),
  p('pillows', 'back', SEATING, 35, { h: 0.4, soft: true }),
  p('curved', 'back', [...SEATING, 'chair'], 25, { h: 0.34 }),
  p('slats', 'back', ['chair', 'bench'], 10, { h: 0.44 }),
  p('noBack', 'back', ['bench'], 0, { h: 0 }),
  // braços
  p('square', 'arms', SEATING, 0, { side: 0.15 }),
  p('round', 'arms', SEATING, 25, { side: 0.17, soft: true }),
  p('thin', 'arms', SEATING, 10, { side: 0.06 }),
  p('noArms', 'arms', SEATING, 0, { side: 0 }),
  // pés
  p('peg', 'legs', [...SEATING, 'bed', ...HARD, ...TABLES, ...CASES], 0, { h: 0.14 }),
  p('block', 'legs', [...SEATING, 'bed', ...HARD, ...TABLES, ...CASES], 0, { h: 0.08 }),
  p('bun', 'legs', [...SEATING, 'bed', ...CASES], 10, { h: 0.06 }),
  p('hairpin', 'legs', [...SEATING, 'bed', ...HARD, ...TABLES, ...CASES], 15, { h: 0.16 }),
  p('tube', 'legs', ['chair', 'stool'], 0, { h: 0 }),
  p('pedestal', 'legs', ['table', 'side', 'coffee', 'stool'], 25, { h: 0 }),
  p('trestle', 'legs', ['table', 'desk', 'bench', 'coffee'], 20, { h: 0 }),
  p('none', 'legs', [...SEATING, 'bed', ...CASES], 0, { h: 0 }),
  // cabeceira
  p('panel', 'headboard', ['bed'], 0, { h: 0.5 }),
  p('tuftedHead', 'headboard', ['bed'], 45, { h: 0.6, soft: true }),
  p('slatsHead', 'headboard', ['bed'], 15, { h: 0.55 }),
  p('arched', 'headboard', ['bed'], 30, { h: 0.66 }),
  p('noHead', 'headboard', ['bed'], 0, { h: 0 }),
  // roupa de cama
  p('duvet', 'bedding', ['bed'], 0, { soft: true }),
  p('quilt', 'bedding', ['bed'], 15, { soft: true }),
  p('sheet', 'bedding', ['bed'], 0, { soft: true }),
  // tampo
  p('rect', 'top', [...TABLES, ...CASES], 0, { h: 0.04 }),
  p('thick', 'top', [...TABLES, ...CASES], 20, { h: 0.07 }),
  p('round', 'top', ['table', 'side', 'coffee'], 15, { h: 0.04, needs: { legs: ['pedestal', 'peg', 'hairpin'] } }),
  p('crown', 'top', ['bookshelf', 'wardrobe', 'cabinet', 'dresser'], 20, { h: 0.06 }),
  // corpo dos armários
  p('case', 'body', CASES, 0),
  p('rounded', 'body', CASES, 20),
  p('open', 'body', ['bookshelf', 'desk', 'cabinet', 'counter', 'nightstand'], 0, { needs: { doors: ['noDoors'] } }),
  // portas e gavetas
  p('doors', 'doors', ['counter', 'wardrobe', 'cabinet', 'nightstand', 'bookshelf'], 0),
  p('glass', 'doors', ['bookshelf', 'cabinet', 'wardrobe'], 30),
  p('louver', 'doors', ['wardrobe', 'cabinet', 'counter'], 20),
  p('drawers', 'doors', ['desk', 'counter', 'dresser', 'nightstand', 'cabinet'], 10),
  p('noDoors', 'doors', ['bookshelf', 'desk', 'cabinet', 'counter', 'nightstand'], 0),
  // puxadores
  p('knob', 'handles', CASES, 0),
  p('bar', 'handles', CASES, 5),
  p('cup', 'handles', CASES, 10),
  p('noHandles', 'handles', CASES, 0),
];

/** A peça de tal encaixe e id (o mesmo id pode estar em dois encaixes). */
export function partOf(slot: PartSlot, id: string | undefined): PartDef | undefined {
  return id === undefined ? undefined : PARTS.find((q) => q.slot === slot && q.id === id);
}

/** Peças que entram neste encaixe deste tipo de móvel. */
export function partsFor(kind: KitKind, slot: PartSlot): PartDef[] {
  return PARTS.filter((q) => q.slot === slot && q.kinds.includes(kind));
}

/** Zonas de pintura de um tipo de móvel (uma por encaixe). */
export function kitZones(kind: KitKind): ZoneDef[] {
  const k = KINDS[kind];
  return k.slots.map((slot) => ({ id: slot, families: k.families[slot] ?? ['wood'], base: k.base[slot] ?? { mat: 'oak' } }));
}

/** Zonas já com o estilo de fábrica do kit por cima. */
export function kitZonesOf(kit: KitDef): ZoneDef[] {
  return kitZones(kit.kind).map((z) => ({ ...z, base: kit.style?.[z.id] ?? z.base }));
}

export interface Assembly {
  kind: KitKind;
  parts: Record<PartSlot, string>;
  /** o que não encaixa (vazio = monta) */
  problems: string[];
  /** medida final em metros: largura, fundura e altura */
  size: { w: number; d: number; h: number };
  /** lugares para sentar */
  seats: number;
  /** largura livre do assento, entre os braços */
  inner?: number;
  /** altura de cada peça montada (para o desenho) */
  legH: number;
  frameH: number;
  /** quanto as peças somam ao preço */
  price: number;
}

/**
 * Monta um móvel: completa os encaixes vazios com a primeira peça que serve,
 * confere se cada peça entra no tipo e no que as outras pedem, e mede.
 */
export function assemble(kind: KitKind, wanted: KitParts, tiles: { w: number; h: number }): Assembly {
  const k = KINDS[kind];
  const problems: string[] = [];
  const parts = {} as Record<PartSlot, string>;
  for (const slot of k.slots) {
    const choices = partsFor(kind, slot);
    const asked = wanted[slot];
    const hit = asked !== undefined ? choices.find((c) => c.id === asked) : undefined;
    if (asked !== undefined && !hit) problems.push(`fit:${slot}:${asked}`);
    parts[slot] = (hit ?? choices[0]).id;
  }
  for (const slot of k.slots) {
    const part = partOf(slot, parts[slot])!;
    for (const [other, ids] of Object.entries(part.needs ?? {}) as [PartSlot, string[]][]) {
      if (!k.slots.includes(other)) continue;
      if (!ids.includes(parts[other])) problems.push(`needs:${slot}:${part.id}:${other}`);
    }
  }
  const width = tiles.w - 0.08;
  const depth = kind === 'bed' ? tiles.h - 0.08 : Math.min(k.depth, tiles.h - 0.06);
  const legs = partOf('legs', parts.legs);
  const frame = partOf('frame', parts.frame);
  const seat = partOf('seat', parts.seat);
  const back = partOf('back', parts.back);
  const arms = partOf('arms', parts.arms);
  const head = partOf('headboard', parts.headboard);
  const topPart = partOf('top', parts.top);
  let height = 0;
  let seats = 0;
  let inner: number | undefined;
  let legH = legs?.h ?? 0;
  let frameH = frame?.h ?? 0;
  if (k.seatTop !== undefined) {
    const seatH = seat?.h ?? 0.08;
    if (k.tallLegs) {
      legH = k.seatTop - seatH - frameH;
    } else {
      // pé curto: a estrutura cresce ou encolhe para o assento ficar na mesma altura
      frameH = k.seatTop - seatH - legH;
      if (frameH < 0.05) problems.push('tooLow');
    }
    height = k.seatTop + (back?.h ?? 0);
    inner = width - 2 * (arms?.side ?? 0);
    seats = Math.max(1, Math.round(tiles.w * (k.seatsPerTile ?? 1)));
    if (inner < seats * (k.seatWidth ?? 0.45)) problems.push('tooNarrow');
  } else if (kind === 'bed') {
    // colchão por cima da estrutura, sempre na mesma altura
    frameH = k.top! - 0.24 - legH;
    if (frameH < 0.04) problems.push('tooLow');
    height = Math.max(k.top! + 0.12, head?.h ? k.top! + (head.h ?? 0) : 0);
    seats = 0;
  } else if (k.top !== undefined) {
    const topH = topPart?.h ?? 0.04;
    if (k.tallLegs) legH = k.top - topH - (frame?.h ?? 0);
    height = k.top + (parts.top === 'crown' ? 0.04 : 0);
    if (k.bodyH !== undefined && legH > 0 && k.bodyH - legH < 0.3) problems.push('tooLow');
    void topH;
  }
  let price = 0;
  for (const slot of k.slots) {
    const part = partOf(slot, parts[slot])!;
    price += part.price;
  }
  return {
    kind,
    parts,
    problems,
    size: { w: round(width), d: round(depth), h: round(height) },
    seats,
    inner: inner === undefined ? undefined : round(inner),
    legH: round(legH),
    frameH: round(frameH),
    price,
  };
}

const round = (v: number) => Math.round(v * 1000) / 1000;

/** As peças que o objeto usa: as do kit de fábrica com as escolhidas por cima. */
export function partsOfObject(kit: KitDef, chosen: KitParts | undefined): KitParts {
  return { ...kit.parts, ...(chosen ?? {}) };
}

/** Peças pedidas que diferem do kit (o que se guarda no objeto). */
export function cleanParts(kit: KitDef, chosen: KitParts | undefined, tiles: { w: number; h: number }): KitParts | undefined {
  if (!chosen) return undefined;
  const a = assemble(kit.kind, partsOfObject(kit, chosen), tiles);
  if (a.problems.length) return undefined;
  const base = assemble(kit.kind, kit.parts, tiles).parts;
  const out: KitParts = {};
  for (const slot of KINDS[kit.kind].slots) if (a.parts[slot] !== base[slot]) out[slot] = a.parts[slot];
  return Object.keys(out).length ? out : undefined;
}

/** Quanto o objeto custa com as peças e o estilo escolhidos. */
export function kitPrice(base: number, kit: KitDef, chosen: KitParts | undefined, style: ObjStyle | undefined, tiles: { w: number; h: number }): number {
  const now = assemble(kit.kind, partsOfObject(kit, chosen), tiles).price;
  const stock = assemble(kit.kind, kit.parts, tiles).price;
  return base + Math.max(0, now - stock) + stylePrice(kitZonesOf(kit), cleanStyle(kitZonesOf(kit), style));
}
