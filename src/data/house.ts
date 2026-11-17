import type { RoomStyle, WorldSeed } from '../sim/world';
import { NEIGHBORS, NEIGHBOR_TIES } from './neighbors';
import { gridFromMap } from '../sim/world';
import { monthFor, temperFromTraits } from '../sim/temper';
import type { Temper } from '../sim/types';
import { MONTHS } from './months';
import { TRAITS } from './traits';

/** Bloco 5: temperamento que combina com os traços e o mês que combina com ele. */
function bornOf(traits: string[]): { temper: Temper; month: number } {
  const temper = temperFromTraits({ traits: TRAITS }, traits);
  return { temper, month: monthFor({ months: MONTHS }, temper) };
}

// A casa pronta da fatia 1. Cada letra é um cômodo; paredes nascem sozinhas
// entre letras diferentes. Portas e janelas são bordas: "x,y,N" = borda norte
// do tile, "x,y,W" = borda oeste.
const MAP = [
  '.................',
  '.................',
  '...BBBBBTTTKKK...',
  '...BBBBBTTTKKK...',
  '...BBBBBTTTKKK...',
  '...BBBBBTTTKKK...',
  '...LLLLLLLLLLL...',
  '...LLLLLLLLLLL...',
  '...LLLLLLLLLLL...',
  '...LLLLLLLLLLL...',
  '...LLLLLLLLLLL...',
  '.................',
  '.................',
  '.................',
];

const ROOMS: Record<string, RoomStyle> = {
  '.': { floor: 'grass', indoor: false },
  B: { floor: 'carpet', indoor: true },
  T: { floor: 'tile', indoor: true },
  L: { floor: 'wood', indoor: true },
  // a cozinha é aberta para a sala: mesmo cômodo, piso diferente
  K: { floor: 'kitchen', indoor: true, room: 'L' },
};

const DOORS = ['4,6,N', '9,6,N', '7,11,N'];
const WINDOWS = ['5,2,N', '8,2,N', '11,2,N', '14,2,W', '3,3,W', '14,5,W', '3,6,W', '14,8,W', '3,9,W', '5,11,N', '8,11,N', '11,11,N'];

/** tostões com que a casa começa */
export const STARTING_FUNDS = 1500;
/** tile da calçada, em frente à porta, onde a condução para */
export const HOUSE_EXIT = { x: 7, y: 13 };

export function starterHouse(seed = 20001): WorldSeed {
  return {
    seed,
    startTick: 7 * 60, // dia 1, 07:00
    grid: gridFromMap(MAP, ROOMS, DOORS, WINDOWS),
    objects: [
      { defId: 'bed', x: 3, y: 2 },
      { defId: 'bed', x: 5, y: 2 },
      { defId: 'bookshelf', x: 6, y: 2 },
      { defId: 'lamp', x: 3, y: 5 },
      { defId: 'toilet', x: 8, y: 2 },
      { defId: 'shower', x: 10, y: 2 },
      { defId: 'sink', x: 8, y: 4 },
      { defId: 'kitchensink', x: 11, y: 2 },
      { defId: 'stove', x: 12, y: 2 },
      { defId: 'fridge', x: 13, y: 2 },
      { defId: 'phone', x: 3, y: 6 },
      { defId: 'sofa', x: 5, y: 6 },
      { defId: 'lamp', x: 10, y: 6 },
      { defId: 'plant', x: 13, y: 6 },
      { defId: 'tv', x: 3, y: 8 },
      { defId: 'plant', x: 3, y: 10 },
      { defId: 'dinette', x: 9, y: 8 },
      { defId: 'speaker', x: 13, y: 9 },
      // bloco 1: lixeira na cozinha e latão na calçada
      { defId: 'trashcan', x: 13, y: 5 },
      { defId: 'curbbin', x: 9, y: 13 },
      // bloco 2: caixa de correio na calçada (o jornal cai do lado da condução)
      { defId: 'mailbox', x: 5, y: 13 },
      // bloco 3: luz de teto, quadros e tapetes viraram objetos de verdade
      { defId: 'ceilinglamp', x: 6, y: 8 },
      { defId: 'ceilinglamp', x: 10, y: 7 },
      { defId: 'ceilinglamp', x: 12, y: 4 },
      { defId: 'ceilinglamp', x: 9, y: 3 },
      { defId: 'painting', x: 4, y: 2 },
      { defId: 'painting', x: 6, y: 6 },
      { defId: 'painting', x: 10, y: 5, rot: 2 },
      { defId: 'canvas', x: 13, y: 7, rot: 3 },
      { defId: 'wallclock', x: 12, y: 2 },
      { defId: 'bigrug', x: 5, y: 7 },
      { defId: 'rug', x: 4, y: 4 },
      // bloco 5: guarda-roupa no quarto, de frente para as camas
      { defId: 'wardrobe', x: 7, y: 4, rot: 3 },
    ],
    funds: STARTING_FUNDS,
    exit: HOUSE_EXIT,
    folks: [
      {
        name: 'Tomé Varanda',
        traits: ['tagarela', 'caseiro'],
        x: 8,
        y: 8,
        needs: { hunger: 55, energy: 80, bladder: 60, fun: 50, social: 45, hygiene: 65 },
        look: { skin: 1, hair: 2, shirt: 0, pants: 1, style: 0, face: 0, body: 1, formal: 0, sleepwear: 2, swimwear: 1 },
        ...bornOf(['tagarela', 'caseiro']),
      },
      {
        name: 'Lia Sacada',
        traits: ['agitado', 'gentil'],
        x: 10,
        y: 9,
        needs: { hunger: 70, energy: 65, bladder: 75, fun: 40, social: 55, hygiene: 80 },
        look: { skin: 3, hair: 1, shirt: 4, pants: 2, style: 2, face: 1, body: 0, formal: 2, sleepwear: 1, swimwear: 3 },
        ...bornOf(['agitado', 'gentil']),
      },
    ],
    // dividem a casa há pouco tempo: já se conhecem, mas ainda sem intimidade
    relations: [{ a: 'Tomé Varanda', b: 'Lia Sacada', friendship: 22, respect: 5 }, ...NEIGHBOR_TIES],
    neighbors: NEIGHBORS,
  };
}
