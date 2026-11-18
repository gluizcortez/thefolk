import type { DishDef, GiftDef, InteractionDef, ObjectDef } from '../sim/types';
import type { VenuePlan } from '../sim/downtown';
import type { NeighborSeed } from '../sim/world';
import type { RoomStyle } from '../sim/world';

// Bloco 16: o centro da cidade. Um lote comunitário com o Largo do Coreto no
// meio (chafariz, bancos, ipês e lampiões) e, nos fundos, três casas de
// comércio: a Cantina Forno Velho (com garçom e cardápio), o Café Xícara
// Torta e o Bazar Fita Métrica (roupas, presentes e encomendas que chegam em
// casa). Vai-se de táxi; o lote é montado de novo a cada passeio.

// ---------- cardápio e presentes ----------

const dishes: DishDef[] = [
  { id: 'caldo', name: 'dish.caldo', price: 14, hunger: 55, fun: 6, romance: 4 },
  { id: 'galinhada', name: 'dish.galinhada', price: 26, hunger: 85, fun: 12, romance: 8 },
  { id: 'moqueca', name: 'dish.moqueca', price: 38, hunger: 95, fun: 22, romance: 14 },
  { id: 'pudim', name: 'dish.pudim', price: 12, hunger: 25, fun: 26, romance: 10 },
];

const gifts: GiftDef[] = [
  { id: 'bombons', name: 'gift.bombons', price: 12, friendship: 6, romance: 4 },
  { id: 'ramalhete', name: 'gift.ramalhete', price: 18, friendship: 4, romance: 9 },
  { id: 'poesia', name: 'gift.poesia', price: 22, friendship: 8, romance: 5 },
  { id: 'caixinha', name: 'gift.caixinha', price: 45, friendship: 9, romance: 13 },
];

export const DISHES: Record<string, DishDef> = Object.fromEntries(dishes.map((d) => [d.id, d]));
export const GIFTS: Record<string, GiftDef> = Object.fromEntries(gifts.map((g) => [g.id, g]));

/** Minutos comendo, depois que o prato chega. */
export const EAT_MINUTES = 30;

// ---------- objetos do centro ----------

function dine(d: DishDef): InteractionDef {
  return {
    id: `dish_${d.id}`,
    label: `act.dish_${d.id}`,
    duration: EAT_MINUTES,
    effects: { hunger: d.hunger / EAT_MINUTES, fun: d.fun / EAT_MINUTES, comfort: 0.6 },
    until: d.hunger >= 50 ? 'hunger' : undefined,
    autoBelow: d.id === 'pudim' ? undefined : 50,
    autonomous: d.id !== 'pudim',
    cost: d.price,
    special: 'dine',
    dish: d.id,
    pose: 'sit',
    onObject: true,
    // jantar a dois na mesma mesa aproxima
    duo: { effects: { social: 0.3 }, friendship: 0.12, romance: 0.12 },
  };
}

function giftBuy(g: GiftDef): InteractionDef {
  return {
    id: `gift_${g.id}`,
    label: `act.gift_${g.id}`,
    duration: 8,
    effects: { fun: 0.4 },
    autonomous: false,
    residentOnly: true,
    cost: g.price,
    special: 'buyGift',
    gift: g.id,
  };
}

function parcel(defId: string, price: number): InteractionDef {
  return {
    id: `order_${defId}`,
    label: `act.order_${defId}`,
    duration: 10,
    effects: { fun: 0.3 },
    autonomous: false,
    residentOnly: true,
    cost: price,
    special: 'buyParcel',
    parcel: defId,
  };
}

const sitDown: InteractionDef = { id: 'sit', label: 'act.sit', duration: 40, effects: { comfort: 1.3, fun: 0.1 }, until: 'comfort', pose: 'sit', onObject: true };

export const DOWNTOWN_OBJECTS: ObjectDef[] = [
  {
    id: 'bistro',
    name: 'obj.bistro',
    art: 'bistro',
    price: 380,
    buyable: false,
    category: 'surfaces',
    size: { w: 3, h: 1 },
    ambience: 5,
    slots: 2,
    dining: 'both',
    interactions: [sitDown, ...dishes.map(dine)],
  },
  {
    id: 'espresso',
    name: 'obj.espresso',
    art: 'espresso',
    price: 900,
    buyable: false,
    category: 'appliances',
    size: { w: 2, h: 1 },
    useSides: ['S'],
    slots: 2,
    ambience: 4,
    interactions: [
      { id: 'coffee', label: 'act.coffee', duration: 12, effects: { energy: 0.9, fun: 0.4, social: 0.2 }, until: 'energy', autoBelow: 45, cost: 6, hold: 'cup' },
      { id: 'cake', label: 'act.cake', duration: 15, effects: { hunger: 1.8, fun: 0.6 }, until: 'hunger', autoBelow: 40, cost: 9, hold: 'plate' },
    ],
  },
  {
    id: 'clothesrack',
    name: 'obj.clothesrack',
    art: 'clothesrack',
    price: 300,
    buyable: false,
    category: 'decor',
    size: { w: 2, h: 1 },
    useSides: ['S'],
    slots: 2,
    ambience: 3,
    interactions: [
      { id: 'browse', label: 'act.browse', duration: 25, effects: { fun: 0.9 }, until: 'fun', autoBelow: 60 },
      { id: 'clothes', label: 'act.buyClothes', duration: 15, effects: { fun: 0.6 }, autonomous: false, residentOnly: true, cost: 60, special: 'buyClothes' },
      { id: 'formal', label: 'act.buyFormal', duration: 15, effects: { fun: 0.6 }, autonomous: false, residentOnly: true, cost: 90, special: 'buyClothes' },
    ],
  },
  {
    id: 'giftshelf',
    name: 'obj.giftshelf',
    art: 'giftshelf',
    price: 260,
    buyable: false,
    category: 'decor',
    size: { w: 2, h: 1 },
    useSides: ['S'],
    slots: 2,
    ambience: 4,
    interactions: [{ id: 'browse', label: 'act.browse', duration: 20, effects: { fun: 0.8 }, until: 'fun', autoBelow: 60 }, ...gifts.map(giftBuy)],
  },
  {
    id: 'bazaar',
    name: 'obj.bazaar',
    art: 'bazaar',
    price: 240,
    buyable: false,
    category: 'decor',
    size: { w: 2, h: 1 },
    useSides: ['S'],
    ambience: 3,
    interactions: [parcel('aquarium', 340), parcel('globe', 190), parcel('flowers', 30)],
  },
  {
    id: 'fountain',
    name: 'obj.fountain',
    art: 'fountain',
    price: 2400,
    buyable: false,
    category: 'outdoor',
    size: { w: 2, h: 2 },
    slots: 4,
    ambience: 10,
    interactions: [
      { id: 'admire', label: 'act.admire', duration: 15, effects: { fun: 0.6, comfort: 0.3 }, until: 'fun', autoBelow: 70 },
      { id: 'wish', label: 'act.wishCoin', duration: 4, effects: { fun: 1.5 }, autonomous: false, residentOnly: true, cost: 1, special: 'wishCoin' },
    ],
  },
  {
    id: 'parkbench',
    name: 'obj.parkbench',
    art: 'parkbench',
    price: 220,
    buyable: false,
    category: 'outdoor',
    size: { w: 2, h: 1 },
    useSides: ['S'],
    slots: 2,
    ambience: 2,
    interactions: [{ id: 'rest', label: 'act.rest', duration: 45, effects: { comfort: 1.6, fun: 0.15 }, until: 'comfort', pose: 'sit', onObject: true }],
  },
  {
    id: 'lamppost',
    name: 'obj.lamppost',
    art: 'lamppost',
    price: 180,
    buyable: false,
    category: 'lighting',
    size: { w: 1, h: 1 },
    ambience: 2,
    light: 1,
    fixture: true,
    interactions: [],
  },
  // ---------- encomendas do bazar (chegam em casa; não estão no catálogo) ----------
  {
    id: 'aquarium',
    name: 'obj.aquarium',
    art: 'aquarium',
    price: 340,
    buyable: false,
    category: 'decor',
    size: { w: 1, h: 1 },
    useSides: ['S'],
    ambience: 7,
    upkeep: { dirt: 0.25 },
    interactions: [{ id: 'fish', label: 'act.watchFish', duration: 30, effects: { fun: 0.8, comfort: 0.4 }, until: 'fun' }],
  },
  {
    id: 'globe',
    name: 'obj.globe',
    art: 'globe',
    price: 190,
    buyable: false,
    category: 'hobbies',
    size: { w: 1, h: 1 },
    useSides: ['S'],
    ambience: 3,
    interactions: [{ id: 'spin', label: 'act.spinGlobe', duration: 40, effects: { fun: 0.5 }, until: 'fun', skill: { id: 'logic', xpPerMinute: 1.2 } }],
  },
];

// ---------- o lote do centro ----------

const ROOMS: Record<string, RoomStyle> = {
  g: { floor: 'grass', indoor: false },
  '.': { floor: 'stonepath', indoor: false },
  R: { floor: 'parquet', indoor: true },
  K: { floor: 'kitchen', indoor: true },
  W: { floor: 'tile', indoor: true },
  C: { floor: 'checker', indoor: true },
  S: { floor: 'wood', indoor: true },
};

const PLAZA = 'g......................g';

export const CENTRO: VenuePlan = {
  id: 'centro',
  name: 'venue.centro',
  map: [
    'gggggggggggggggggggggggg',
    'gRRRRRRKKKgCCCCCgSSSSSSg',
    'gRRRRRRKKKgCCCCCgSSSSSSg',
    'gRRRRRRKKKgCCCCCgSSSSSSg',
    'gRRRRRRWWWgCCCCCgSSSSSSg',
    'gRRRRRRWWWgCCCCCgSSSSSSg',
    'gRRRRRRWWWgCCCCCgSSSSSSg',
    PLAZA,
    PLAZA,
    PLAZA,
    PLAZA,
    PLAZA,
    PLAZA,
    PLAZA,
    PLAZA,
    PLAZA,
    'gggggggggggggggggggggggg',
  ],
  rooms: ROOMS,
  doors: ['3,7,N', '7,3,W', '7,5,W', '13,7,N', '19,7,N'],
  windows: ['1,7,N', '5,7,N', '1,3,W', '11,7,N', '15,7,N', '11,3,W', '16,3,W', '18,7,N', '21,7,N', '17,3,W', '23,3,W'],
  exit: { x: 11, y: 16 },
  // cozinha da cantina: o garçom espera os pratos aqui
  pass: { x: 8, y: 2 },
  objects: [
    // Cantina Forno Velho
    { defId: 'bistro', x: 1, y: 1 },
    { defId: 'bistro', x: 4, y: 1 },
    { defId: 'bistro', x: 2, y: 4 },
    { defId: 'plant', x: 6, y: 6 },
    { defId: 'painting', x: 1, y: 5, rot: 1 },
    { defId: 'ceilinglamp', x: 2, y: 3 },
    { defId: 'ceilinglamp', x: 5, y: 5 },
    { defId: 'counter', x: 7, y: 1 },
    { defId: 'counter', x: 8, y: 1 },
    { defId: 'counter', x: 9, y: 1 },
    { defId: 'ceilinglamp', x: 8, y: 2 },
    { defId: 'toilet', x: 9, y: 4 },
    { defId: 'sink', x: 9, y: 6, rot: 2 },
    { defId: 'ceilinglamp', x: 8, y: 5 },
    // Café Xícara Torta
    { defId: 'espresso', x: 12, y: 1 },
    { defId: 'dinette', x: 11, y: 3 },
    { defId: 'dinette', x: 13, y: 5 },
    { defId: 'plant', x: 15, y: 1 },
    { defId: 'ceilinglamp', x: 13, y: 2 },
    { defId: 'ceilinglamp', x: 12, y: 5 },
    // Bazar Fita Métrica
    { defId: 'clothesrack', x: 17, y: 1 },
    { defId: 'giftshelf', x: 20, y: 1 },
    { defId: 'bazaar', x: 21, y: 4 },
    { defId: 'counter', x: 17, y: 4 },
    { defId: 'plant', x: 22, y: 6 },
    { defId: 'ceilinglamp', x: 19, y: 3 },
    { defId: 'ceilinglamp', x: 19, y: 5 },
    // Largo do Coreto
    { defId: 'fountain', x: 11, y: 10 },
    { defId: 'parkbench', x: 3, y: 9 },
    { defId: 'parkbench', x: 19, y: 9 },
    { defId: 'parkbench', x: 7, y: 13 },
    { defId: 'parkbench', x: 15, y: 13 },
    { defId: 'ipe', x: 1, y: 9 },
    { defId: 'ipe', x: 22, y: 9 },
    { defId: 'ipe', x: 1, y: 14 },
    { defId: 'ipe', x: 22, y: 14 },
    { defId: 'flowerbed', x: 9, y: 9 },
    { defId: 'flowerbed', x: 14, y: 9 },
    { defId: 'flowerbed', x: 9, y: 12 },
    { defId: 'flowerbed', x: 14, y: 12 },
    { defId: 'lamppost', x: 6, y: 9 },
    { defId: 'lamppost', x: 17, y: 9 },
    { defId: 'lamppost', x: 6, y: 14 },
    { defId: 'lamppost', x: 17, y: 14 },
    { defId: 'patiotable', x: 12, y: 8 },
  ],
};

export const VENUES: Record<string, VenuePlan> = { centro: CENTRO };

// ---------- gente do centro ----------

/**
 * Figurantes: gente que anda pelo largo e que dá para conhecer. Depois de
 * conhecidos, viram vizinhos como os outros (dá para ligar e convidar).
 * O garçom da cantina é prestador de serviço (só trabalha no centro).
 */
export const DOWNTOWN_FOLKS: NeighborSeed[] = [
  { name: 'Clarice Quitanda', traits: ['tagarela', 'romantico'], look: { skin: 1, hair: 2, shirt: 1, pants: 2 }, skills: { cooking: 180, charisma: 120 }, career: null, downtown: true },
  { name: 'Moacir Coreto', traits: ['brincalhao', 'gentil'], look: { skin: 3, hair: 0, shirt: 2, pants: 0 }, skills: { creativity: 360 }, career: null, downtown: true },
  { name: 'Lena Bonde', traits: ['agitado', 'ambicioso'], look: { skin: 0, hair: 3, shirt: 4, pants: 1 }, skills: { fitness: 360, logic: 60 }, career: null, downtown: true },
  { name: 'Heitor Vitrine', traits: ['romantico', 'caprichoso'], look: { skin: 2, hair: 1, shirt: 5, pants: 3 }, skills: { charisma: 360 }, career: null, downtown: true },
  { name: 'Iara Banca', traits: ['reservado', 'gentil'], look: { skin: 3, hair: 1, shirt: 3, pants: 1 }, skills: { logic: 360 }, career: null, downtown: true },
  { name: 'Fábio Calçadão', traits: ['guloso', 'brincalhao'], look: { skin: 1, hair: 0, shirt: 0, pants: 2 }, skills: { cooking: 360 }, career: null, downtown: true },
  { name: 'Socorro Feira', traits: ['fofoqueiro', 'tagarela'], look: { skin: 2, hair: 4, shirt: 2, pants: 0 }, skills: { charisma: 180 }, career: null, downtown: true },
  { name: 'Tito Sobrado', traits: ['caseiro', 'romantico'], look: { skin: 0, hair: 2, shirt: 1, pants: 3 }, skills: { handiness: 360 }, career: null, downtown: true },
  { name: 'Tadeu Travessa', traits: ['caprichoso', 'gentil'], look: { skin: 2, hair: 4, shirt: 5, pants: 0, formal: 0 }, skills: { cooking: 600, charisma: 360 }, career: null, service: 'waiter' },
];
