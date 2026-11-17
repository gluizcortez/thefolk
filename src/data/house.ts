import type { RoomStyle, WorldSeed } from '../sim/world';
import { gridFromMap } from '../sim/world';

// A casa pronta da fatia 1. Cada letra é um cômodo; paredes nascem sozinhas
// entre letras diferentes. Portas são bordas: "x,y,N" = borda norte do tile.
const MAP = [
  '................',
  '................',
  '...BBBBBTTTLL...',
  '...BBBBBTTTLL...',
  '...BBBBBTTTLL...',
  '...BBBBBTTTLL...',
  '...LLLLLLLLLL...',
  '...LLLLLLLLLL...',
  '...LLLLLLLLLL...',
  '...LLLLLLLLLL...',
  '...LLLLLLLLLL...',
  '................',
  '................',
  '................',
];

const ROOMS: Record<string, RoomStyle> = {
  '.': { floor: 'grass', indoor: false },
  B: { floor: 'carpet', indoor: true },
  T: { floor: 'tile', indoor: true },
  L: { floor: 'wood', indoor: true },
};

const DOORS = ['4,6,N', '9,6,N', '7,11,N'];

export function starterHouse(seed = 20001): WorldSeed {
  return {
    seed,
    startTick: 7 * 60, // dia 1, 07:00
    grid: gridFromMap(MAP, ROOMS, DOORS),
    objects: [
      { defId: 'bed', x: 3, y: 2 },
      { defId: 'plant', x: 7, y: 2 },
      { defId: 'lamp', x: 3, y: 5 },
      { defId: 'toilet', x: 8, y: 2 },
      { defId: 'shower', x: 10, y: 2 },
      { defId: 'sink', x: 8, y: 4 },
      { defId: 'bookshelf', x: 11, y: 2 },
      { defId: 'lamp', x: 11, y: 5 },
      { defId: 'tv', x: 3, y: 8 },
      { defId: 'sofa', x: 6, y: 6 },
      { defId: 'phone', x: 3, y: 6 },
      { defId: 'plant', x: 3, y: 10 },
      { defId: 'speaker', x: 12, y: 8 },
      { defId: 'fridge', x: 12, y: 10 },
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
