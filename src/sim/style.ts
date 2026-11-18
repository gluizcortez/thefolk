// Plano 2, bloco 8: estilo por parte. Cada parte de um objeto (o assento, os
// pés, o tampo, a madeira da estrutura) tem um material, uma cor e um padrão.
// Este módulo é puro: só sabe os nomes, as famílias e os preços. Quem desenha
// as texturas é game/art/finish.ts.

/** Família de material: diz o que combina com cada parte. */
export type MatFamily = 'fabric' | 'wood' | 'metal' | 'plastic' | 'stone';

export interface MaterialDef {
  id: string;
  family: MatFamily;
  /** cor natural (quando a parte não escolhe cor) */
  base: number;
  /** brilho: 0 fosco, 1 polido */
  gloss: number;
  /** quanto a mais custa por parte com este material */
  price: number;
  /** aceita cor (madeira e metal têm a cor do próprio material, tingida de leve) */
  tint: 'full' | 'stain' | 'none';
  /** aceita padrão */
  patterns: boolean;
}

export const MATERIALS: Record<string, MaterialDef> = {
  // tecidos
  cotton: { id: 'cotton', family: 'fabric', base: 0xd9cdb0, gloss: 0, price: 0, tint: 'full', patterns: true },
  linen: { id: 'linen', family: 'fabric', base: 0xe8dcc0, gloss: 0, price: 5, tint: 'full', patterns: true },
  tweed: { id: 'tweed', family: 'fabric', base: 0x8a7a66, gloss: 0, price: 12, tint: 'full', patterns: false },
  velvet: { id: 'velvet', family: 'fabric', base: 0x6b3a6e, gloss: 0.25, price: 25, tint: 'full', patterns: false },
  leather: { id: 'leather', family: 'fabric', base: 0x6a3b22, gloss: 0.55, price: 45, tint: 'full', patterns: false },
  // madeiras
  pine: { id: 'pine', family: 'wood', base: 0xcfa468, gloss: 0.25, price: 0, tint: 'stain', patterns: false },
  oak: { id: 'oak', family: 'wood', base: 0xb07a42, gloss: 0.3, price: 8, tint: 'stain', patterns: false },
  walnut: { id: 'walnut', family: 'wood', base: 0x6e4427, gloss: 0.3, price: 15, tint: 'stain', patterns: false },
  cherry: { id: 'cherry', family: 'wood', base: 0x8e3f26, gloss: 0.4, price: 20, tint: 'stain', patterns: false },
  ebony: { id: 'ebony', family: 'wood', base: 0x2e221c, gloss: 0.45, price: 30, tint: 'none', patterns: false },
  painted: { id: 'painted', family: 'wood', base: 0xeee9da, gloss: 0.35, price: 4, tint: 'full', patterns: false },
  // metais
  chrome: { id: 'chrome', family: 'metal', base: 0xc6d0d6, gloss: 1, price: 6, tint: 'none', patterns: false },
  brass: { id: 'brass', family: 'metal', base: 0xc29a3e, gloss: 0.9, price: 18, tint: 'none', patterns: false },
  copper: { id: 'copper', family: 'metal', base: 0xb06a3c, gloss: 0.85, price: 18, tint: 'none', patterns: false },
  iron: { id: 'iron', family: 'metal', base: 0x2f3134, gloss: 0.4, price: 0, tint: 'stain', patterns: false },
  // plásticos e laqueados
  lacquer: { id: 'lacquer', family: 'plastic', base: 0xeee9da, gloss: 0.65, price: 6, tint: 'full', patterns: false },
  vinyl: { id: 'vinyl', family: 'plastic', base: 0xc23a32, gloss: 0.7, price: 0, tint: 'full', patterns: false },
  formica: { id: 'formica', family: 'plastic', base: 0xe7dfc6, gloss: 0.55, price: 0, tint: 'full', patterns: true },
  // pedras
  marble: { id: 'marble', family: 'stone', base: 0xe9e4da, gloss: 0.7, price: 60, tint: 'stain', patterns: false },
  granite: { id: 'granite', family: 'stone', base: 0x4a4a4e, gloss: 0.6, price: 40, tint: 'stain', patterns: false },
};

/** Amostras de cor (as seis primeiras são as do bloco 4, que viram estilo na migração). */
export const SWATCHES: Record<string, number> = {
  red: 0xb8352b,
  blue: 0x2c55a6,
  green: 0x3f7a4a,
  mustard: 0xd9a22e,
  plum: 0x6b3a6e,
  brown: 0x7a4a2c,
  cream: 0xeadfc2,
  white: 0xf4f1e8,
  grey: 0x8b8d90,
  black: 0x242326,
  navy: 0x1f3357,
  teal: 0x2f8a86,
  sky: 0x86b8dc,
  olive: 0x6d7040,
  orange: 0xd46a2a,
  rose: 0xd88a96,
};

export type PatternId = 'plain' | 'stripes' | 'check' | 'dots' | 'floral' | 'chevron';
export const PATTERNS: PatternId[] = ['plain', 'stripes', 'check', 'dots', 'floral', 'chevron'];
/** padrão custa um pouco a mais (tecido estampado) */
const PATTERN_PRICE = 8;

export interface PartStyle {
  mat: string;
  color?: string;
  pattern?: PatternId;
}

/** Estilo de um objeto: uma entrada por zona (parte do kit ou papel do material). */
export type ObjStyle = Record<string, PartStyle>;

/** Uma zona que dá para pintar: o nome e o que combina com ela. */
export interface ZoneDef {
  id: string;
  /** famílias aceitas, a primeira é a natural */
  families: MatFamily[];
  /** como vem de fábrica */
  base: PartStyle;
}

/** Estilo salvo pela família para usar de novo. */
export interface SavedStyle {
  id: number;
  name: string;
  style: ObjStyle;
}

/** Quantos estilos a família guarda (os mais velhos saem). */
export const MAX_SAVED_STYLES = 12;

/**
 * Zonas dos objetos que não são montados por peças: em vez de parte, o papel
 * do material no desenho (o tecido, a madeira, o metal, o esmalte, a pedra).
 * O desenho marca cada material com o papel dele (game/art/finish.ts).
 */
export const ROLE_ZONES: Record<string, ZoneDef> = {
  fabric: { id: 'fabric', families: ['fabric'], base: { mat: 'cotton' } },
  wood: { id: 'wood', families: ['wood', 'plastic'], base: { mat: 'walnut' } },
  metal: { id: 'metal', families: ['metal'], base: { mat: 'chrome' } },
  finish: { id: 'finish', families: ['plastic', 'metal', 'wood'], base: { mat: 'lacquer' } },
  stone: { id: 'stone', families: ['stone', 'wood', 'plastic'], base: { mat: 'marble' } },
};

export function isSwatch(id: string | undefined): boolean {
  return id !== undefined && id in SWATCHES;
}

/** Uma parte com material, cor e padrão que combinam com a zona. */
export function validPart(zone: ZoneDef, p: PartStyle | undefined): boolean {
  if (!p) return false;
  const mat = MATERIALS[p.mat];
  if (!mat || !zone.families.includes(mat.family)) return false;
  if (p.color !== undefined && (!isSwatch(p.color) || mat.tint === 'none')) return false;
  if (p.pattern !== undefined && p.pattern !== 'plain' && (!PATTERNS.includes(p.pattern) || !mat.patterns)) return false;
  return true;
}

/**
 * Limpa um estilo pedido: tira zonas que o objeto não tem e partes que não
 * combinam. O que sobra é guardado no objeto (o resto fica de fábrica).
 */
export function cleanStyle(zones: ZoneDef[], style: ObjStyle | undefined): ObjStyle | undefined {
  if (!style) return undefined;
  const out: ObjStyle = {};
  for (const z of zones) {
    const p = style[z.id];
    if (!validPart(z, p)) continue;
    const part: PartStyle = { mat: p.mat };
    if (p.color) part.color = p.color;
    if (p.pattern && p.pattern !== 'plain') part.pattern = p.pattern;
    if (part.mat === z.base.mat && part.color === z.base.color && part.pattern === z.base.pattern) continue;
    out[z.id] = part;
  }
  return Object.keys(out).length ? out : undefined;
}

/** Como cada zona fica: o escolhido por cima do de fábrica. */
export function resolvedStyle(zones: ZoneDef[], style: ObjStyle | undefined): ObjStyle {
  const out: ObjStyle = {};
  for (const z of zones) out[z.id] = style?.[z.id] ?? z.base;
  return out;
}

/** Quanto o estilo soma ao preço (materiais nobres e estampas custam mais). */
export function stylePrice(zones: ZoneDef[], style: ObjStyle | undefined): number {
  let total = 0;
  for (const z of zones) {
    const chosen = style?.[z.id];
    if (!chosen) continue;
    const delta = (MATERIALS[chosen.mat]?.price ?? 0) - (MATERIALS[z.base.mat]?.price ?? 0);
    total += Math.max(0, delta);
    if (chosen.pattern && chosen.pattern !== 'plain') total += PATTERN_PRICE;
  }
  return total;
}

/**
 * Um estilo salvo posto em outro objeto: a zona de mesmo nome vem igual; as
 * outras pegam a primeira zona salva de material que combina (o tecido do
 * sofá vai para o assento da cadeira, a madeira para os pés).
 */
export function adaptStyle(saved: ObjStyle, zones: ZoneDef[]): ObjStyle | undefined {
  const out: ObjStyle = {};
  const entries = Object.entries(saved);
  for (const z of zones) {
    const same = saved[z.id];
    if (same && validPart(z, same)) {
      out[z.id] = same;
      continue;
    }
    const natural = z.families[0];
    const match =
      entries.find(([, p]) => MATERIALS[p.mat]?.family === natural && validPart(z, p)) ??
      entries.find(([, p]) => validPart(z, p));
    if (match) out[z.id] = match[1];
  }
  return cleanStyle(zones, out);
}

/** Bloco 4 → bloco 8: a cor escolhida na compra vira a cor das zonas de tecido. */
export function styleFromColor(zones: ZoneDef[], color: string | undefined): ObjStyle | undefined {
  if (!color || !isSwatch(color)) return undefined;
  const out: ObjStyle = {};
  for (const z of zones) {
    if (z.families[0] !== 'fabric') continue;
    // nos desenhos antigos a fábrica é o próprio desenho: a cor vai no algodão
    out[z.id] = { ...z.base, mat: z.base.mat || 'cotton', color };
  }
  return cleanStyle(zones, out);
}

/** A cor principal (a da primeira zona de tecido), para quem só quer uma cor. */
export function mainColor(zones: ZoneDef[], style: ObjStyle | undefined): string | undefined {
  for (const z of zones) {
    if (z.families[0] !== 'fabric') continue;
    return (style?.[z.id] ?? z.base).color;
  }
  return undefined;
}
