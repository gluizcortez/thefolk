import type { BuildParts, CoveringDef, FloorDef } from '../sim/types';

// Material do modo construção. Tudo aqui é dado: para um piso ou revestimento
// novo, adicione a entrada, o texto em i18n e a textura com o mesmo id em
// game/art/house.ts (sem textura própria, cai no assoalho / no reboco).

// `ambience` é quanto o piso (média do cômodo) e o revestimento (média das
// paredes) somam à nota do cômodo (bloco 3); `cover` é o revestimento que a
// parede usa quando o jogador não escolheu nenhum.
const floors: FloorDef[] = [
  { id: 'grass', name: 'floor.grass', price: 0, outdoor: true },
  { id: 'carpet', name: 'floor.carpet', price: 8, ambience: 3, cover: 'bedroom' },
  { id: 'checker', name: 'floor.checker', price: 9, ambience: 2 },
  { id: 'wood', name: 'floor.wood', price: 10, ambience: 3, cover: 'living' },
  { id: 'kitchen', name: 'floor.kitchen', price: 11, ambience: 2, cover: 'kitchen' },
  { id: 'tile', name: 'floor.tile', price: 12, ambience: 2, cover: 'bath' },
  { id: 'slate', name: 'floor.slate', price: 13, ambience: 4 },
  { id: 'parquet', name: 'floor.parquet', price: 15, ambience: 6 },
  // bloco 12: o vão do andar de cima (sem piso); pintar com ele tira o piso
  { id: 'void', name: 'floor.void', price: 0, outdoor: true, void: true },
];

const coverings: CoveringDef[] = [
  { id: 'plaster', name: 'cover.plaster', price: 3, ambience: 0 },
  { id: 'stripes', name: 'cover.stripes', price: 5, ambience: 2 },
  { id: 'bedroom', name: 'cover.bedroom', price: 5, ambience: 2 },
  { id: 'kitchen', name: 'cover.kitchen', price: 7, ambience: 3 },
  { id: 'living', name: 'cover.living', price: 8, ambience: 3 },
  { id: 'panel', name: 'cover.panel', price: 8, ambience: 4 },
  { id: 'bath', name: 'cover.bath', price: 9, ambience: 4 },
  { id: 'brick', name: 'cover.brick', price: 9, ambience: 4 },
];

export const FLOORS: Record<string, FloorDef> = Object.fromEntries(floors.map((f) => [f.id, f]));
export const COVERINGS: Record<string, CoveringDef> = Object.fromEntries(coverings.map((c) => [c.id, c]));

// bloco 12: estilos de porta e janela, meia parede, escada, coluna e
// telhado (preço por tile coberto ao trocar estilo ou cor)
export const PARTS: BuildParts = {
  wall: { price: 14 },
  half: { price: 9 },
  door: { price: 90 },
  doorGlass: { price: 150 },
  doorDouble: { price: 190 },
  arch: { price: 55 },
  window: { price: 70, ambience: 4 },
  windowTall: { price: 125, ambience: 6 },
  windowHigh: { price: 45, ambience: 2 },
  stairs: { price: 650 },
  column: { price: 40 },
  roof: { price: 2 },
};

/** Bloco 12: cores de telhado (id → cor da telha). */
export const ROOF_COLORS: Record<string, number> = {
  terracotta: 0xb4553a,
  slate: 0x56606e,
  moss: 0x5f7a45,
  cobalt: 0x3f5f93,
  cocoa: 0x6b4a36,
  sand: 0xc49a5c,
};
