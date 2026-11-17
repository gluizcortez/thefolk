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

export const PARTS: BuildParts = {
  wall: { price: 14 },
  door: { price: 90 },
  window: { price: 70, ambience: 4 },
};
