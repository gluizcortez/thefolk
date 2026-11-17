import type { RoomStyle, WorldSeed } from '../sim/world';
import { gridFromMap } from '../sim/world';

// A casa pronta da fatia 1. Cada letra é um cômodo; paredes nascem sozinhas
// entre letras diferentes. Portas são bordas: "x,y,N" = borda norte do tile.
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

export function starterHouse(seed = 20001): WorldSeed {
  return {
    seed,
    startTick: 7 * 60, // dia 1, 07:00
    grid: gridFromMap(MAP, ROOMS, DOORS),
    objects: [
      { defId: 'bed', x: 3, y: 2 },
      { defId: 'bookshelf', x: 6, y: 2 },
      { defId: 'lamp', x: 3, y: 5 },
      { defId: 'toilet', x: 8, y: 2 },
      { defId: 'shower', x: 10, y: 2 },
      { defId: 'sink', x: 8, y: 4 },
      { defId: 'counter', x: 11, y: 2 },
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
    ],
    folks: [
      {
        name: 'Tomé Varanda',
        traits: ['tagarela', 'caseiro'],
        x: 8,
        y: 8,
        needs: { hunger: 55, energy: 80, bladder: 60, fun: 50, social: 45, hygiene: 65 },
        look: { skin: 1, hair: 2, shirt: 0, pants: 1 },
      },
    ],
  };
}
