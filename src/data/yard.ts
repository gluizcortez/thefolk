import type { InteractionDef, ObjectDef, PlantDef } from '../sim/types';
import { replantCost } from '../sim/garden';
import { clean } from './interactions';

// Bloco 13: quintal. Peças de piscina (escadinha e trampolim), plantas vivas
// (canteiros, roseira, arbusto, horta e árvores), churrasqueira, mesa de
// jardim e rede. Regar, colher e replantar só aparecem quando há o que fazer
// (veja sim/upkeep.ts e sim/garden.ts).

/** Regar: enche a planta de água; quem gosta de ordem se diverte um pouco. */
export const waterPlant = (): InteractionDef => ({
  id: 'water',
  label: 'act.water',
  duration: 20,
  effects: { fun: 0.15, ambience: 0.2 },
  care: 'water',
  hold: 'cup',
  skill: { id: 'tidiness', xpPerMinute: 0.2 },
});

/** Colher: o que estava maduro vai para a despensa. */
export const harvestPlant = (): InteractionDef => ({
  id: 'harvest',
  label: 'act.harvest',
  duration: 15,
  effects: { fun: 0.4 },
  care: 'harvest',
  residentOnly: true,
});

/** Replantar: muda nova no lugar da que secou (custa uma parte do preço). */
export const replantPlant = (price: number): InteractionDef => ({
  id: 'replant',
  label: 'act.replant',
  duration: 30,
  effects: { fun: 0.1, hygiene: -0.08 },
  care: 'replant',
  autonomous: false,
  residentOnly: true,
  cost: replantCost({ price } as ObjectDef),
});

/** Cheirar as flores: um respiro curto (só com a planta florida, veja sim/upkeep.ts). */
export const smell = (fun: number): InteractionDef => ({
  id: 'smell',
  label: 'act.smell',
  duration: 10,
  effects: { fun, comfort: 0.2 },
  until: 'fun',
  autoBelow: 55,
  bloom: true,
});

function plant(
  id: string,
  price: number,
  ambience: number,
  plantDef: PlantDef,
  extra: Partial<ObjectDef> = {},
  uses: InteractionDef[] = [],
): ObjectDef {
  const its = [...uses, waterPlant()];
  if (plantDef.fruit) its.push(harvestPlant());
  its.push(replantPlant(price));
  return {
    id,
    name: `obj.${id}`,
    art: id,
    price,
    category: 'outdoor',
    size: { w: 1, h: 1 },
    ambience,
    interactions: its,
    plant: plantDef,
    ...extra,
  };
}

const swim: InteractionDef = {
  id: 'swim',
  label: 'act.swim',
  duration: 90,
  effects: { fun: 1.1, energy: -0.12, hygiene: 0.12, comfort: 0.05 },
  until: 'fun',
  autoBelow: 70,
  skill: { id: 'fitness', xpPerMinute: 1.2 },
  wear: 'swim',
  pose: 'swim',
  onObject: true,
  // nadar junto: conversa na beira e amizade
  duo: { effects: { fun: 0.3, social: 0.7 }, friendship: 0.05, romance: 0.04 },
};

const dive: InteractionDef = {
  id: 'dive',
  label: 'act.dive',
  duration: 25,
  effects: { fun: 1.8, energy: -0.3, hygiene: 0.1 },
  until: 'fun',
  autoBelow: 60,
  kids: 'no',
  skill: { id: 'fitness', xpPerMinute: 1.6 },
  wear: 'swim',
  pose: 'dive',
  onObject: true,
};

const grillUses: InteractionDef[] = [
  {
    id: 'grill',
    label: 'act.grill',
    kids: 'no',
    duration: 50,
    effects: { hunger: 2.4, fun: 0.35, social: 0.1 },
    until: 'hunger',
    atTable: true,
    hold: 'plate',
    autonomous: false,
    portions: 1,
    residentOnly: true,
    skill: { id: 'cooking', xpPerMinute: 1, boosts: 'hunger' },
    leaves: { kind: 'plate', chance: 0.9 },
    trash: 9,
    duo: { effects: { fun: 0.2, social: 0.5 }, friendship: 0.04 },
  },
  clean(),
];

export const YARD_OBJECTS: ObjectDef[] = [
  // ---------- piscina ----------
  {
    id: 'poolladder',
    name: 'obj.poolladder',
    art: 'poolladder',
    price: 220,
    category: 'outdoor',
    size: { w: 1, h: 1 },
    useSides: ['S'],
    pool: 'in',
    ambience: 2,
    slots: 4,
    interactions: [swim],
  },
  {
    id: 'diveboard',
    name: 'obj.diveboard',
    art: 'diveboard',
    price: 380,
    category: 'outdoor',
    size: { w: 1, h: 1 },
    useSides: ['S'],
    pool: 'edge',
    ambience: 3,
    interactions: [dive],
  },
  // ---------- plantas ----------
  plant('flowerbed', 60, 3, { kind: 'flower', thirst: 2, grow: 36, bloom: 10 }, {}, [smell(0.8)]),
  plant('rosebush', 150, 4, { kind: 'flower', thirst: 1.6, grow: 60, bloom: 15 }, { tier: 2 }, [smell(1)]),
  plant('hedge', 90, 5, { kind: 'shrub', thirst: 1, grow: 48, bloom: 4 }),
  plant('veggiebed', 120, 1, { kind: 'crop', thirst: 2.6, grow: 60, bloom: 3, fruit: { portions: 3, hours: 24 } }, { size: { w: 2, h: 1 }, tier: 0 }),
  plant('orangetree', 420, 6, { kind: 'tree', thirst: 0.9, grow: 120, bloom: 8, fruit: { portions: 4, hours: 48 } }, { tier: 2 }),
  plant('ipe', 320, 8, { kind: 'tree', thirst: 0.6, grow: 96, bloom: 14 }, {}, [smell(0.6)]),
  // ---------- comer e descansar ao ar livre ----------
  {
    id: 'grill',
    name: 'obj.grill',
    art: 'grill',
    price: 280,
    category: 'outdoor',
    size: { w: 1, h: 1 },
    useSides: ['S'],
    ambience: 1,
    interactions: grillUses,
    upkeep: { dirt: 0.5 },
  },
  {
    id: 'patiotable',
    tier: 0,
    line: 'table',
    dining: 'both',
    name: 'obj.patiotable',
    art: 'patiotable',
    price: 260,
    category: 'outdoor',
    size: { w: 3, h: 1 },
    ambience: 3,
    slots: 2,
    interactions: [{ id: 'sit', label: 'act.sit', duration: 40, effects: { comfort: 1.2, fun: 0.1 }, until: 'comfort', pose: 'sit', onObject: true }],
  },
  {
    id: 'hammock',
    name: 'obj.hammock',
    art: 'hammock',
    price: 230,
    category: 'outdoor',
    size: { w: 2, h: 1 },
    useSides: ['S', 'N'],
    ambience: 4,
    interactions: [
      {
        id: 'sway',
        label: 'act.sway',
        duration: 60,
        effects: { comfort: 1.3, fun: 0.5, energy: 0.06 },
        until: 'comfort',
        autoBelow: 55,
        pose: 'lie',
        onObject: true,
      },
      {
        id: 'nap',
        label: 'act.nap',
        duration: 90,
        effects: { energy: 0.16, comfort: 0.3 },
        until: 'energy',
        decayScale: 0.5,
        autonomous: false,
        residentOnly: true,
        pose: 'lie',
        onObject: true,
      },
    ],
  },
];
