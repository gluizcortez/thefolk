import type { BuildParts, CoveringDef, FloorDef } from '../sim/types';

// Material do modo construção. Tudo aqui é dado: para um piso ou revestimento
// novo, adicione a entrada, o texto em i18n e a textura com o mesmo id em
// game/art/house.ts (sem textura própria, cai no assoalho / no reboco).

const floors: FloorDef[] = [
  { id: 'grass', name: 'floor.grass', price: 0, outdoor: true },
  { id: 'carpet', name: 'floor.carpet', price: 8 },
  { id: 'checker', name: 'floor.checker', price: 9 },
  { id: 'wood', name: 'floor.wood', price: 10 },
  { id: 'kitchen', name: 'floor.kitchen', price: 11 },
  { id: 'tile', name: 'floor.tile', price: 12 },
  { id: 'slate', name: 'floor.slate', price: 13 },
  { id: 'parquet', name: 'floor.parquet', price: 15 },
];

const coverings: CoveringDef[] = [
  { id: 'plaster', name: 'cover.plaster', price: 3 },
  { id: 'stripes', name: 'cover.stripes', price: 5 },
  { id: 'bedroom', name: 'cover.bedroom', price: 5 },
  { id: 'kitchen', name: 'cover.kitchen', price: 7 },
  { id: 'living', name: 'cover.living', price: 8 },
  { id: 'panel', name: 'cover.panel', price: 8 },
  { id: 'bath', name: 'cover.bath', price: 9 },
  { id: 'brick', name: 'cover.brick', price: 9 },
];

export const FLOORS: Record<string, FloorDef> = Object.fromEntries(floors.map((f) => [f.id, f]));
export const COVERINGS: Record<string, CoveringDef> = Object.fromEntries(coverings.map((c) => [c.id, c]));

export const PARTS: BuildParts = {
  wall: { price: 14 },
  door: { price: 90 },
  window: { price: 70, ambience: 4 },
};
