import type { RoomStyle } from '../sim/world';
import type { HousePlan, TownPlan } from '../sim/town';
import { starterPlan } from './house';

// Bloco 15: o bairro. Dez lotes numa rua só, cinco de cada lado (ímpares em
// cima, pares embaixo). A família em jogo começa no 5; os vizinhos da
// vizinhança passam a morar nas casas prontas; sobram uma casa à venda e dois
// terrenos vagos. Os chefes moram no centro (fora do bairro).

const ROOMS: Record<string, RoomStyle> = {
  '.': { floor: 'grass', indoor: false },
  B: { floor: 'carpet', indoor: true },
  C: { floor: 'carpet', indoor: true },
  T: { floor: 'tile', indoor: true },
  L: { floor: 'wood', indoor: true },
  K: { floor: 'kitchen', indoor: true, room: 'L' },
};

/** Chalé: um quarto, banheiro e sala com cozinha aberta. */
const CHALE: HousePlan = {
  map: [
    '.................',
    '.................',
    '.................',
    '....BBBBBTTT.....',
    '....BBBBBTTT.....',
    '....BBBBBTTT.....',
    '....LLLLLKKK.....',
    '....LLLLLKKK.....',
    '....LLLLLKKK.....',
    '....LLLLLKKK.....',
    '.................',
    '.................',
    '.................',
    '.................',
  ],
  rooms: ROOMS,
  doors: ['6,10,N', '5,6,N', '10,6,N'],
  windows: ['7,3,N', '4,4,W', '12,4,W', '4,8,W', '12,8,W', '8,10,N', '11,10,N'],
  exit: { x: 7, y: 13 },
  objects: [
    { defId: 'bed', x: 4, y: 3 },
    { defId: 'bed', x: 7, y: 3 },
    { defId: 'wardrobe', x: 8, y: 3 },
    { defId: 'lamp', x: 6, y: 3 },
    { defId: 'toilet', x: 9, y: 3 },
    { defId: 'shower', x: 11, y: 3 },
    { defId: 'sink', x: 9, y: 5, rot: 0 },
    { defId: 'kitchensink', x: 9, y: 6 },
    { defId: 'stove', x: 11, y: 6 },
    { defId: 'fridge', x: 11, y: 9, rot: 2 },
    { defId: 'trashcan', x: 9, y: 9 },
    { defId: 'sofa', x: 7, y: 6 },
    { defId: 'tv', x: 4, y: 9 },
    { defId: 'phone', x: 4, y: 6 },
    { defId: 'plant', x: 8, y: 8 },
    { defId: 'ceilinglamp', x: 6, y: 8 },
    { defId: 'ceilinglamp', x: 10, y: 7 },
    { defId: 'ceilinglamp', x: 6, y: 4 },
    { defId: 'painting', x: 5, y: 3 },
    { defId: 'rug', x: 5, y: 7 },
    { defId: 'mailbox', x: 5, y: 13 },
    { defId: 'curbbin', x: 9, y: 13 },
  ],
};

/** Chalé vazio (a casa à venda): só o que é de graça fica. */
const CHALE_EMPTY: HousePlan = { ...CHALE, objects: CHALE.objects.filter((o) => o.defId === 'mailbox' || o.defId === 'curbbin') };

/** Casarão: dois quartos, banheiro no meio e uma sala comprida com cozinha. */
const CASARAO: HousePlan = {
  map: [
    '.................',
    '.................',
    '..BBBBBTTTCCCC...',
    '..BBBBBTTTCCCC...',
    '..BBBBBTTTCCCC...',
    '..LLLLLLLKKKKK...',
    '..LLLLLLLKKKKK...',
    '..LLLLLLLKKKKK...',
    '..LLLLLLLKKKKK...',
    '..LLLLLLLKKKKK...',
    '.................',
    '.................',
    '.................',
    '.................',
  ],
  rooms: ROOMS,
  doors: ['6,10,N', '4,5,N', '8,5,N', '11,5,N'],
  windows: ['3,2,N', '11,2,N', '2,3,W', '14,3,W', '2,7,W', '14,7,W', '4,10,N', '9,10,N', '12,10,N'],
  exit: { x: 7, y: 13 },
  objects: [
    { defId: 'bed', x: 2, y: 2 },
    { defId: 'bookshelf', x: 5, y: 2 },
    { defId: 'lamp', x: 3, y: 2 },
    { defId: 'bed', x: 13, y: 2 },
    { defId: 'wardrobe', x: 10, y: 2 },
    { defId: 'toilet', x: 7, y: 2 },
    { defId: 'shower', x: 9, y: 2 },
    { defId: 'sink', x: 7, y: 4 },
    { defId: 'kitchensink', x: 9, y: 5 },
    { defId: 'trashcan', x: 10, y: 5 },
    { defId: 'stove', x: 12, y: 5 },
    { defId: 'fridge', x: 13, y: 5 },
    { defId: 'dinette', x: 9, y: 7 },
    { defId: 'sofa', x: 2, y: 6 },
    { defId: 'tv', x: 5, y: 9 },
    { defId: 'phone', x: 2, y: 5 },
    { defId: 'speaker', x: 7, y: 6 },
    { defId: 'plant', x: 2, y: 9 },
    { defId: 'plant', x: 13, y: 9 },
    { defId: 'ceilinglamp', x: 4, y: 7 },
    { defId: 'ceilinglamp', x: 10, y: 8 },
    { defId: 'ceilinglamp', x: 4, y: 3 },
    { defId: 'ceilinglamp', x: 11, y: 3 },
    { defId: 'painting', x: 6, y: 5 },
    { defId: 'bigrug', x: 3, y: 7 },
    { defId: 'mailbox', x: 5, y: 13 },
    { defId: 'curbbin', x: 9, y: 13 },
  ],
};

export const TOWN: TownPlan = {
  name: 'Vila Taramela',
  street: 'Rua das Taramelas',
  houses: { starter: starterPlan(), chale: CHALE, chaleEmpty: CHALE_EMPTY, casarao: CASARAO },
  lots: [
    { number: 1, side: 0, col: 0, land: 1200, house: 'chale', family: { name: 'Alpendre', members: ['Dora Alpendre', 'Rita Vidraça'], funds: 1800 } },
    { number: 3, side: 0, col: 1, land: 1600, house: 'casarao', family: { name: 'Pilastra', members: ['Joaquim Pilastra'], funds: 4200 } },
    { number: 5, side: 0, col: 2, land: 1400, home: true },
    { number: 7, side: 0, col: 3, land: 1300, house: 'chale', family: { name: 'Telhado', members: ['Caio Telhado', 'Nina Varal'], funds: 1200 } },
    { number: 9, side: 0, col: 4, land: 1100 },
    { number: 2, side: 1, col: 0, land: 1300, house: 'starter', family: { name: 'Mirante', members: ['Otto Mirante', 'Bento Lajota'], funds: 1500 } },
    { number: 4, side: 1, col: 1, land: 900 },
    { number: 6, side: 1, col: 2, land: 1000, house: 'chaleEmpty' },
    { number: 8, side: 1, col: 3, land: 1500, house: 'casarao', family: { name: 'Cancela', members: ['Rosa Cancela'], funds: 2600 } },
    { number: 10, side: 1, col: 4, land: 1200, house: 'starter', family: { name: 'Batente', members: ['Lúcio Batente', 'Edu Manilha'], funds: 1400 } },
  ],
};
