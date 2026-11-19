import { cleanStyle, resolvedStyle } from './style';
import type { ObjStyle, PatternId, ZoneDef } from './style';
import type { Age, Folk, InteractionDef, Look, Outfit, Wear } from './types';

// Plano 2, bloco 9: roupas montadas por peças. Cada folk tem um guarda-roupa
// com até 3 conjuntos por ocasião (dia a dia, festa, dormir, nadar,
// exercício, frio e calor). Um conjunto é uma peça por lugar do corpo (parte
// de cima, de baixo ou peça inteira, sapatos, meias e acessórios), e cada
// peça tem uma ou mais áreas com material, cor e padrão — o mesmo sistema de
// estilo dos móveis (sim/style.ts). Este módulo é puro; quem desenha é
// game/art/folk.ts e game/art/garb.ts.

export type ClothSlot = 'top' | 'bottom' | 'full' | 'shoes' | 'socks' | 'hat' | 'glasses' | 'earrings' | 'watch' | 'bag' | 'scarf';
export const CLOTH_SLOTS: ClothSlot[] = ['top', 'bottom', 'full', 'shoes', 'socks', 'hat', 'glasses', 'earrings', 'watch', 'bag', 'scarf'];
/** Lugares que não precisam de peça (sem chapéu, sem meia, descalço). */
export const OPTIONAL_SLOTS: ClothSlot[] = ['shoes', 'socks', 'hat', 'glasses', 'earrings', 'watch', 'bag', 'scarf'];

export type Occasion = Exclude<Outfit, 'work'>;
export const OCCASIONS: Occasion[] = ['day', 'formal', 'sleep', 'swim', 'gym', 'cold', 'hot'];
export const MAX_SETS = 3;

/** Faixa de idade das peças (bebê vai na manta, sem guarda-roupa). */
export type Band = 'child' | 'teen' | 'adult' | 'elder';
export const BANDS: Band[] = ['child', 'teen', 'adult', 'elder'];

export type SleeveCut = 'none' | 'short' | 'long';
/** comprida, bermuda, curtinha (de banho), saia no joelho, saia longa, nada (pernas de fora) */
export type LegCut = 'long' | 'shorts' | 'brief' | 'skirt' | 'longskirt' | 'none';
export type NeckCut = 'collar' | 'crew' | 'vee' | 'scoop' | 'lapel' | 'hood' | 'high';
export type ShoeCut = 'sneaker' | 'shoe' | 'boot' | 'sandal' | 'slipper' | 'heel';

export interface GarmentDef {
  id: string;
  slot: ClothSlot;
  bands: Band[];
  /** preço na loja; 0 = peça básica, que toda casa já tem */
  price: number;
  /** áreas de cor (a primeira é a principal) */
  zones: ZoneDef[];
  /** ocasiões em que a peça cai bem (para sortear e para a loja) */
  fit: Occasion[];
  sleeve?: SleeveCut;
  leg?: LegCut;
  neck?: NeckCut;
  shoe?: ShoeCut;
  /** casaco comprido: a barra cobre o quadril */
  long?: boolean;
  /** calça com cinto e fivela */
  belt?: boolean;
  /** só aparece em ocasião especial (roupão do banho) */
  hidden?: boolean;
}

const fab = (mat: string, color?: string, pattern?: PatternId): ZoneDef['base'] => ({ mat, ...(color ? { color } : {}), ...(pattern ? { pattern } : {}) });
const z = (id: string, base: ZoneDef['base'], families: ZoneDef['families'] = ['fabric']): ZoneDef => ({ id, families, base });

const ALL: Band[] = ['child', 'teen', 'adult', 'elder'];
const GROWN: Band[] = ['teen', 'adult', 'elder'];
const KIDS: Band[] = ['child', 'teen'];
const OLDER: Band[] = ['adult', 'elder'];

const LIST: GarmentDef[] = [
  // ---------- parte de cima ----------
  { id: 'tee', slot: 'top', bands: ALL, price: 0, fit: ['day', 'gym', 'hot', 'sleep'], sleeve: 'short', neck: 'crew', zones: [z('main', fab('cotton', 'blue')), z('trim', fab('cotton', 'white'))] },
  { id: 'kidtee', slot: 'top', bands: ['child'], price: 0, fit: ['day', 'hot', 'gym'], sleeve: 'short', neck: 'crew', zones: [z('main', fab('cotton', 'mustard')), z('trim', fab('cotton', 'red'))] },
  { id: 'shirt', slot: 'top', bands: GROWN, price: 0, fit: ['day', 'hot'], sleeve: 'short', neck: 'collar', zones: [z('main', fab('cotton', 'blue', 'dots')), z('trim', fab('cotton', 'white'))] },
  { id: 'longshirt', slot: 'top', bands: GROWN, price: 30, fit: ['day', 'formal', 'cold'], sleeve: 'long', neck: 'collar', zones: [z('main', fab('linen', 'white')), z('trim', fab('linen', 'white'))] },
  { id: 'polo', slot: 'top', bands: ALL, price: 25, fit: ['day', 'hot', 'gym'], sleeve: 'short', neck: 'collar', zones: [z('main', fab('cotton', 'green')), z('trim', fab('cotton', 'white'))] },
  { id: 'tank', slot: 'top', bands: ALL, price: 0, fit: ['hot', 'gym', 'swim', 'sleep'], sleeve: 'none', neck: 'scoop', zones: [z('main', fab('cotton', 'white')), z('trim', fab('cotton', 'grey'))] },
  { id: 'blouse', slot: 'top', bands: GROWN, price: 30, fit: ['day', 'formal', 'hot'], sleeve: 'short', neck: 'scoop', zones: [z('main', fab('linen', 'rose', 'floral')), z('trim', fab('linen', 'cream'))] },
  { id: 'sweater', slot: 'top', bands: ALL, price: 45, fit: ['cold', 'day'], sleeve: 'long', neck: 'crew', zones: [z('main', fab('tweed', 'red')), z('trim', fab('cotton', 'cream'))] },
  { id: 'hoodie', slot: 'top', bands: ['child', 'teen', 'adult'], price: 40, fit: ['cold', 'gym', 'day'], sleeve: 'long', neck: 'hood', zones: [z('main', fab('cotton', 'grey')), z('trim', fab('cotton', 'white'))] },
  { id: 'cardigan', slot: 'top', bands: OLDER, price: 50, fit: ['cold', 'day', 'formal'], sleeve: 'long', neck: 'vee', zones: [z('main', fab('tweed', 'olive')), z('inner', fab('cotton', 'cream')), z('trim', fab('cotton', 'brown'))] },
  { id: 'blazer', slot: 'top', bands: GROWN, price: 120, fit: ['formal'], sleeve: 'long', neck: 'lapel', zones: [z('main', fab('cotton', 'black')), z('inner', fab('cotton', 'white')), z('tie', fab('cotton', 'red'))] },
  { id: 'coat', slot: 'top', bands: GROWN, price: 150, fit: ['cold', 'formal'], sleeve: 'long', neck: 'lapel', long: true, zones: [z('main', fab('tweed', 'brown')), z('inner', fab('cotton', 'cream')), z('trim', fab('cotton', 'black'))] },
  { id: 'tracktop', slot: 'top', bands: ALL, price: 35, fit: ['gym', 'cold'], sleeve: 'long', neck: 'high', zones: [z('main', fab('cotton', 'navy')), z('trim', fab('cotton', 'white'))] },
  { id: 'pjtop', slot: 'top', bands: ALL, price: 0, fit: ['sleep'], sleeve: 'long', neck: 'collar', zones: [z('main', fab('cotton', 'sky', 'stripes')), z('trim', fab('cotton', 'white'))] },
  // ---------- parte de baixo ----------
  { id: 'jeans', slot: 'bottom', bands: ALL, price: 0, fit: ['day', 'cold'], leg: 'long', belt: true, zones: [z('main', fab('cotton', 'navy')), z('trim', fab('cotton', 'mustard'))] },
  { id: 'slacks', slot: 'bottom', bands: GROWN, price: 0, fit: ['formal', 'day'], leg: 'long', belt: true, zones: [z('main', fab('cotton', 'black'))] },
  { id: 'shorts', slot: 'bottom', bands: ALL, price: 0, fit: ['hot', 'gym', 'day'], leg: 'shorts', zones: [z('main', fab('cotton', 'olive')), z('trim', fab('cotton', 'cream'))] },
  { id: 'skirt', slot: 'bottom', bands: ALL, price: 20, fit: ['day', 'hot', 'formal'], leg: 'skirt', zones: [z('main', fab('cotton', 'plum')), z('trim', fab('cotton', 'black'))] },
  { id: 'longskirt', slot: 'bottom', bands: GROWN, price: 40, fit: ['formal', 'day', 'cold'], leg: 'longskirt', zones: [z('main', fab('linen', 'teal', 'floral')), z('trim', fab('linen', 'cream'))] },
  { id: 'trackpants', slot: 'bottom', bands: ALL, price: 25, fit: ['gym', 'cold', 'sleep'], leg: 'long', zones: [z('main', fab('cotton', 'navy')), z('trim', fab('cotton', 'white'))] },
  { id: 'pjpants', slot: 'bottom', bands: ALL, price: 0, fit: ['sleep'], leg: 'long', zones: [z('main', fab('cotton', 'sky', 'stripes'))] },
  { id: 'trunks', slot: 'bottom', bands: ALL, price: 0, fit: ['swim'], leg: 'brief', zones: [z('main', fab('cotton', 'red')), z('trim', fab('cotton', 'white'))] },
  // ---------- peça inteira ----------
  { id: 'dress', slot: 'full', bands: ALL, price: 60, fit: ['day', 'formal', 'hot'], sleeve: 'short', neck: 'scoop', leg: 'skirt', zones: [z('main', fab('cotton', 'teal', 'dots')), z('trim', fab('cotton', 'white'))] },
  { id: 'gown', slot: 'full', bands: GROWN, price: 180, fit: ['formal'], sleeve: 'none', neck: 'scoop', leg: 'longskirt', zones: [z('main', fab('velvet', 'plum')), z('trim', fab('linen', 'cream'))] },
  { id: 'overalls', slot: 'full', bands: KIDS, price: 30, fit: ['day', 'cold'], sleeve: 'short', neck: 'crew', leg: 'long', zones: [z('main', fab('cotton', 'blue')), z('inner', fab('cotton', 'red', 'check')), z('metal', fab('brass'), ['metal'])] },
  { id: 'swimsuit', slot: 'full', bands: ALL, price: 0, fit: ['swim'], sleeve: 'none', neck: 'scoop', leg: 'none', zones: [z('main', fab('cotton', 'teal')), z('trim', fab('cotton', 'white'))] },
  { id: 'nightgown', slot: 'full', bands: ALL, price: 20, fit: ['sleep'], sleeve: 'short', neck: 'scoop', leg: 'skirt', zones: [z('main', fab('cotton', 'rose', 'dots')), z('trim', fab('linen', 'white'))] },
  { id: 'robe', slot: 'full', bands: ALL, price: 0, fit: [], sleeve: 'long', neck: 'vee', leg: 'skirt', hidden: true, zones: [z('main', fab('cotton', 'white')), z('trim', fab('cotton', 'cream'))] },
  // ---------- pés ----------
  { id: 'sneakers', slot: 'shoes', bands: ALL, price: 0, fit: ['day', 'gym', 'hot', 'cold'], shoe: 'sneaker', zones: [z('main', fab('cotton', 'white')), z('trim', fab('cotton', 'red'))] },
  { id: 'shoes', slot: 'shoes', bands: GROWN, price: 0, fit: ['formal', 'day'], shoe: 'shoe', zones: [z('main', fab('leather', 'black'))] },
  { id: 'boots', slot: 'shoes', bands: ALL, price: 45, fit: ['cold', 'day'], shoe: 'boot', zones: [z('main', fab('leather', 'brown'))] },
  { id: 'sandals', slot: 'shoes', bands: ALL, price: 10, fit: ['hot', 'swim'], shoe: 'sandal', zones: [z('main', fab('leather', 'brown'))] },
  { id: 'slippers', slot: 'shoes', bands: ALL, price: 0, fit: ['sleep'], shoe: 'slipper', zones: [z('main', fab('velvet', 'plum'))] },
  { id: 'heels', slot: 'shoes', bands: GROWN, price: 50, fit: ['formal'], shoe: 'heel', zones: [z('main', fab('leather', 'red'))] },
  { id: 'socks', slot: 'socks', bands: ALL, price: 0, fit: ['day', 'gym', 'cold'], zones: [z('main', fab('cotton', 'white'))] },
  { id: 'kneesocks', slot: 'socks', bands: ALL, price: 10, fit: ['cold', 'day', 'gym'], zones: [z('main', fab('cotton', 'navy', 'stripes'))] },
  // ---------- acessórios ----------
  { id: 'cap', slot: 'hat', bands: ALL, price: 15, fit: ['hot', 'gym', 'day'], zones: [z('main', fab('cotton', 'red')), z('trim', fab('cotton', 'white'))] },
  { id: 'beanie', slot: 'hat', bands: ALL, price: 15, fit: ['cold'], zones: [z('main', fab('tweed', 'mustard')), z('trim', fab('cotton', 'cream'))] },
  { id: 'sunhat', slot: 'hat', bands: ALL, price: 25, fit: ['hot', 'swim'], zones: [z('main', fab('linen', 'cream')), z('trim', fab('cotton', 'red'))] },
  { id: 'fedora', slot: 'hat', bands: GROWN, price: 40, fit: ['formal', 'cold'], zones: [z('main', fab('tweed', 'grey')), z('trim', fab('cotton', 'black'))] },
  { id: 'sunglasses', slot: 'glasses', bands: ALL, price: 25, fit: ['hot', 'swim'], zones: [z('main', fab('vinyl', 'black'), ['plastic', 'metal'])] },
  { id: 'studs', slot: 'earrings', bands: ALL, price: 20, fit: ['day', 'formal'], zones: [z('main', fab('brass'), ['metal'])] },
  { id: 'hoops', slot: 'earrings', bands: GROWN, price: 35, fit: ['formal', 'day'], zones: [z('main', fab('brass'), ['metal'])] },
  { id: 'watch', slot: 'watch', bands: GROWN, price: 0, fit: ['day', 'formal'], zones: [z('main', fab('leather', 'brown')), z('metal', fab('brass'), ['metal'])] },
  { id: 'shoulderbag', slot: 'bag', bands: GROWN, price: 50, fit: ['day', 'formal'], zones: [z('main', fab('leather', 'brown')), z('metal', fab('brass'), ['metal'])] },
  { id: 'backpack', slot: 'bag', bands: KIDS, price: 30, fit: ['day'], zones: [z('main', fab('cotton', 'orange')), z('trim', fab('cotton', 'navy'))] },
  { id: 'scarf', slot: 'scarf', bands: ALL, price: 20, fit: ['cold'], zones: [z('main', fab('tweed', 'red', undefined)), z('trim', fab('cotton', 'cream'))] },
];

export const GARMENTS: Record<string, GarmentDef> = Object.fromEntries(LIST.map((g) => [g.id, g]));

/** Uma peça vestida: qual é e as cores escolhidas (o resto fica de fábrica). */
export interface Piece {
  g: string;
  style?: ObjStyle;
}

export type Ensemble = Partial<Record<ClothSlot, Piece>>;

/** Guarda-roupa de um folk: conjuntos por ocasião e qual está escolhido. */
export interface Closet {
  sets: Partial<Record<Occasion, Ensemble[]>>;
  pick: Partial<Record<Occasion, number>>;
}

export function bandOf(age: Age | undefined): Band | null {
  if (age === 'baby') return null;
  if (age === 'child' || age === 'teen' || age === 'elder') return age;
  return 'adult';
}

export function fitsBand(g: GarmentDef | undefined, band: Band | null): boolean {
  return !!g && !!band && g.bands.includes(band);
}

/** Peças que a casa pode vestir: as básicas e as compradas. */
export function ownedGarments(bought: readonly string[] | undefined): Set<string> {
  const out = new Set<string>();
  for (const g of LIST) if (g.price === 0 && !g.hidden) out.add(g.id);
  for (const id of bought ?? []) if (GARMENTS[id] && !GARMENTS[id].hidden) out.add(id);
  return out;
}

/** O que a loja tem para uma faixa de idade, por faixa de preço. */
export function shopFor(band: Band): GarmentDef[] {
  return LIST.filter((g) => g.price > 0 && !g.hidden && g.bands.includes(band)).sort((a, b) => a.price - b.price || a.id.localeCompare(b.id));
}

export type PriceTier = 'cheap' | 'mid' | 'fine';
export function priceTier(price: number): PriceTier {
  return price < 30 ? 'cheap' : price < 80 ? 'mid' : 'fine';
}

/** Cada área da peça como fica (escolhido por cima do de fábrica). */
export function pieceStyle(p: Piece): ObjStyle {
  const g = GARMENTS[p.g];
  return g ? resolvedStyle(g.zones, p.style) : {};
}

/** Peça com estilo limpo (áreas que a peça não tem e cores que não combinam saem). */
export function cleanPiece(p: Piece): Piece | null {
  const g = GARMENTS[p.g];
  if (!g) return null;
  const style = cleanStyle(g.zones, p.style);
  return style ? { g: p.g, style } : { g: p.g };
}

/** O que falta ou sobra num conjunto (lista vazia = pode vestir). */
export function ensembleProblems(ens: Ensemble, band: Band | null, occasion: Occasion): string[] {
  const out: string[] = [];
  if (!band) return ['baby'];
  for (const slot of CLOTH_SLOTS) {
    const p = ens[slot];
    if (!p) continue;
    const g = GARMENTS[p.g];
    if (!g) out.push(`unknown:${slot}`);
    else if (g.slot !== slot) out.push(`slot:${slot}`);
    else if (!g.bands.includes(band)) out.push(`age:${slot}`);
    else if (g.hidden) out.push(`hidden:${slot}`);
  }
  if (ens.full && (ens.top || ens.bottom)) out.push('full+parts');
  // corpo coberto: peça inteira, ou parte de baixo e de cima (no banho de piscina, só a de baixo serve)
  if (!ens.full && !ens.bottom) out.push('needs:bottom');
  if (!ens.full && !ens.top && occasion !== 'swim') out.push('needs:top');
  return out;
}

/** Peça padrão de um lugar para a idade e a ocasião (a primeira básica que cai bem). */
function basicFor(slot: ClothSlot, band: Band, occasion: Occasion): Piece | undefined {
  const ok = LIST.filter((g) => g.slot === slot && g.price === 0 && !g.hidden && g.bands.includes(band));
  const g = ok.find((x) => x.fit.includes(occasion)) ?? ok[0];
  return g ? { g: g.id } : undefined;
}

/**
 * Acerta um conjunto para a idade e a ocasião: peça que não serve sai e o
 * lugar obrigatório que ficou vazio ganha a básica, levando a cor da antiga
 * (a camiseta da criança que virou jovem continua azul).
 */
export function fitEnsemble(ens: Ensemble, band: Band, occasion: Occasion): Ensemble {
  const out: Ensemble = {};
  const lost: Partial<Record<ClothSlot, ObjStyle | undefined>> = {};
  const gone = new Set<ClothSlot>();
  for (const slot of CLOTH_SLOTS) {
    const p = ens[slot];
    if (!p) continue;
    const g = GARMENTS[p.g];
    if (!g || g.slot !== slot || g.hidden || !g.bands.includes(band)) {
      lost[slot] = p.style;
      gone.add(slot);
      continue;
    }
    const clean = cleanPiece(p);
    if (clean) out[slot] = clean;
  }
  if (out.full) {
    delete out.top;
    delete out.bottom;
  } else if (gone.has('full')) {
    // a peça inteira não serve mais: vira parte de cima e de baixo
    lost.top ??= lost.full;
    lost.bottom ??= lost.full;
  }
  const refill = (slot: ClothSlot) => {
    const b = basicFor(slot, band, occasion);
    if (!b) return;
    const g = GARMENTS[b.g];
    const style = cleanStyle(g.zones, lost[slot]);
    out[slot] = style ? { g: b.g, style } : b;
  };
  if (!out.full) {
    if (!out.bottom) refill('bottom');
    if (!out.top && occasion !== 'swim') refill('top');
  }
  // sapato que não serve mais vira o básico; acessório que não serve só sai
  if (!out.shoes && gone.has('shoes')) refill('shoes');
  return out;
}

// ---------- roupas de antes do bloco 9 ----------

/** índice das cores antigas (game/art/palette.ts) para as amostras do estilo */
const SHIRT_SW = ['blue', 'red', 'mustard', 'green', 'plum', 'cream'];
const SHIRT_PAT: (PatternId | undefined)[] = ['dots', 'stripes', 'check'];
const PANTS_SW = ['navy', 'brown', 'olive', 'grey'];
const FORMAL_SW = ['black', 'navy', 'plum', 'cream'];
const PJ_SW = ['sky', 'rose', 'green', 'mustard'];
const SWIM_SW = ['red', 'blue', 'mustard', 'teal'];
const KID_SW = ['mustard', 'sky', 'green', 'orange', 'rose', 'red'];

const at = <T>(list: T[], i: number): T => list[((i % list.length) + list.length) % list.length];
const main = (color: string, pattern?: PatternId, mat = 'cotton'): ObjStyle => ({ main: { mat, color, ...(pattern ? { pattern } : {}) } });

/**
 * O conjunto de cada ocasião tirado da aparência antiga (cor da camisa, da
 * calça, da roupa de festa, do pijama e do traje de banho). Serve para quem
 * ainda não tem guarda-roupa: vizinhos, visitas e saves de antes.
 */
export function legacyEnsemble(look: Look, occasion: Occasion, age?: Age): Ensemble {
  const band = bandOf(age) ?? 'child';
  const kid = band === 'child';
  const shirt = look.shirt ?? 0;
  const pants = look.pants ?? 0;
  const top = kid ? 'kidtee' : 'shirt';
  const topStyle = kid ? main(at(KID_SW, shirt)) : main(at(SHIRT_SW, shirt), at(SHIRT_PAT, shirt));
  const day: Ensemble = {
    top: { g: top, style: topStyle },
    bottom: { g: kid ? 'shorts' : 'jeans', style: main(at(PANTS_SW, pants)) },
    shoes: { g: 'sneakers', style: kid ? undefined : { main: { mat: 'leather', color: 'black' }, trim: { mat: 'cotton', color: 'cream' } } },
    ...(kid ? { socks: { g: 'socks' } } : { watch: { g: 'watch' } }),
  };
  let out: Ensemble;
  switch (occasion) {
    case 'day':
      out = day;
      break;
    case 'formal': {
      const c = at(FORMAL_SW, look.formal ?? 0);
      out = kid
        ? { top: { g: 'polo', style: main('white') }, bottom: { g: 'jeans', style: main(c === 'cream' ? 'navy' : c) }, shoes: { g: 'sneakers' } }
        : { top: { g: 'blazer', style: { main: { mat: 'cotton', color: c }, ...(c === 'cream' ? { tie: { mat: 'cotton', color: 'mustard' } } : {}) } }, bottom: { g: 'slacks', style: main(c) }, shoes: { g: 'shoes' } };
      break;
    }
    case 'sleep': {
      const c = at(PJ_SW, look.sleepwear ?? 0);
      out = { top: { g: 'pjtop', style: main(c, 'stripes') }, bottom: { g: 'pjpants', style: main(c, 'stripes') }, shoes: { g: 'slippers' } };
      break;
    }
    case 'swim':
      out = { full: { g: 'swimsuit', style: main(at(SWIM_SW, look.swimwear ?? 0)) } };
      break;
    case 'gym':
      out = { top: { g: 'tee', style: main(at(SHIRT_SW, shirt)) }, bottom: { g: 'shorts', style: main('navy') }, shoes: { g: 'sneakers' }, socks: { g: 'socks' } };
      break;
    case 'cold':
      out = { top: { g: 'sweater', style: main(at(SHIRT_SW, shirt), undefined, 'tweed') }, bottom: { g: 'jeans', style: main(at(PANTS_SW, pants)) }, shoes: { g: 'boots' }, scarf: { g: 'scarf' } };
      break;
    case 'hot':
      out = { top: { g: 'tank', style: main(at(SHIRT_SW, shirt)) }, bottom: { g: 'shorts', style: main(at(PANTS_SW, pants)) }, shoes: { g: 'sandals' } };
      break;
  }
  return fitEnsemble(out, band, occasion);
}

/** Guarda-roupa inicial: um conjunto por ocasião, tirado da aparência antiga. */
export function legacyCloset(look: Look, age?: Age): Closet {
  const sets: Closet['sets'] = {};
  for (const o of OCCASIONS) sets[o] = [legacyEnsemble(look, o, age)];
  return { sets, pick: {} };
}

/** Ocasião de uma roupa vestida (roupão e uniforme não são do guarda-roupa). */
export function occasionOf(wear: Wear): Occasion | null {
  return wear === 'bath' || wear === 'work' ? null : wear;
}

/** O conjunto escolhido de uma ocasião no guarda-roupa. */
export function chosenSet(closet: Closet, occasion: Occasion): { index: number; set: Ensemble } | null {
  const list = closet.sets[occasion];
  if (!list?.length) return null;
  const index = Math.min(Math.max(0, closet.pick[occasion] ?? 0), list.length - 1);
  return { index, set: list[index] };
}

/**
 * O que o folk veste agora, peça por peça. Roupão no banho; uniforme é
 * desenhado à parte (aqui vira a roupa do dia, para quem não tem uniforme).
 */
export function ensembleOf(folk: Pick<Folk, 'look' | 'age' | 'closet'>, wear: Wear): Ensemble {
  const band = bandOf(folk.age);
  if (wear === 'bath') return { full: { g: 'robe' }, shoes: { g: 'slippers', style: { main: { mat: 'cotton', color: 'white' } } } };
  const occasion = occasionOf(wear) ?? 'day';
  if (!band) return {};
  const chosen = folk.closet ? chosenSet(folk.closet, occasion) : null;
  if (!chosen) return legacyEnsemble(folk.look, occasion, folk.age);
  return fitEnsemble(chosen.set, band, occasion);
}

/** Exercício pesado (malhar, correr, ioga, pedalar) pede a roupa de ginástica. */
export function isWorkout(it: Pick<InteractionDef, 'skill' | 'book' | 'jog'> | undefined): boolean {
  if (!it || it.book) return false;
  return !!it.jog || (it.skill?.id === 'fitness' && it.skill.xpPerMinute >= 0.9);
}

/** Acerta todos os conjuntos para a idade nova (quem cresce ou envelhece). */
export function refitCloset(closet: Closet, age: Age | undefined): Closet {
  const band = bandOf(age);
  if (!band) return closet;
  const sets: Closet['sets'] = {};
  for (const o of OCCASIONS) {
    const list = closet.sets[o];
    if (list?.length) sets[o] = list.slice(0, MAX_SETS).map((e) => fitEnsemble(e, band, o));
  }
  return { sets, pick: { ...closet.pick } };
}

/** Sorteia uma peça nova da loja (compra no centro): uma que ainda não tem, se houver. */
export function pickNewGarment(band: Band, owned: Set<string>, roll: (n: number) => number): GarmentDef | null {
  const shop = shopFor(band).filter((g) => g.slot === 'top' || g.slot === 'bottom' || g.slot === 'full');
  const fresh = shop.filter((g) => !owned.has(g.id));
  const pool = fresh.length ? fresh : shop;
  return pool.length ? pool[roll(pool.length)] : null;
}

/** Peça no lugar dela: quem põe peça inteira tira as partes, e vice-versa. */
export function wearPiece(ens: Ensemble, piece: Piece | null, slot: ClothSlot): Ensemble {
  const out: Ensemble = { ...ens };
  if (!piece) {
    delete out[slot];
    return out;
  }
  out[slot] = piece;
  if (slot === 'full') {
    delete out.top;
    delete out.bottom;
  } else if (slot === 'top' || slot === 'bottom') delete out.full;
  return out;
}

/** Chave curta do conjunto (para saber quando remontar o modelo). */
export function ensembleKey(ens: Ensemble): string {
  return CLOTH_SLOTS.map((s) => {
    const p = ens[s];
    if (!p) return '';
    const st = p.style ? Object.entries(p.style).map(([k, v]) => `${k}=${v.mat}.${v.color ?? ''}.${v.pattern ?? ''}`).join(',') : '';
    return `${p.g}(${st})`;
  }).join('/');
}
