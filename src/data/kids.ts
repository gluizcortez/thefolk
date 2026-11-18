import type { BabyCare, InteractionDef, ObjectDef } from '../sim/types';
import { clean } from './interactions';

// Bloco 11: berço e brinquedos. O berço é obrigatório para ter (ou adotar) um
// bebê; os cuidados com o bebê aparecem no berço só quando há um bebê nele.
// Pião e cavalinho são só de criança; a casinha de bonecas qualquer um usa.

const care = (id: string, kind: BabyCare, duration: number, effects: InteractionDef['effects'], extra: Partial<InteractionDef> = {}): InteractionDef => ({
  id,
  label: `act.${id}`,
  duration,
  effects,
  autonomous: false,
  residentOnly: true,
  baby: kind,
  ...extra,
});

/** Lição de casa (só aparece para criança com lição pendente). */
export const homework = (extra: Partial<InteractionDef> = {}): InteractionDef => ({
  id: 'homework',
  label: 'act.homework',
  duration: 60,
  effects: { fun: -0.05, comfort: 0.2 },
  autonomous: false,
  residentOnly: true,
  homework: true,
  hold: 'book',
  skill: { id: 'logic', xpPerMinute: 0.6 },
  ...extra,
});

export const KID_OBJECTS: ObjectDef[] = [
  {
    id: 'crib',
    name: 'obj.crib',
    price: 260,
    category: 'beds',
    room: 'bedroom',
    art: 'crib',
    size: { w: 1, h: 1 },
    ambience: 3,
    crib: true,
    colors: ['blue', 'green', 'mustard', 'plum'],
    interactions: [
      care('feedBaby', 'feed', 20, { social: 0.4, fun: 0.2 }, { hold: 'bottle' }),
      care('changeBaby', 'change', 10, { hygiene: -0.3, fun: -0.1 }, { trash: 12 }),
      care('holdBaby', 'hold', 25, { social: 1.4, fun: 1 }),
      care('lullBaby', 'lull', 15, { comfort: 0.3, social: 0.3 }),
      clean(),
    ],
    upkeep: { dirt: 0.12 },
  },
  {
    id: 'dollhouse',
    name: 'obj.dollhouse',
    price: 180,
    category: 'hobbies',
    room: 'bedroom',
    art: 'dollhouse',
    useSides: ['S'],
    size: { w: 1, h: 1 },
    ambience: 4,
    interactions: [
      {
        id: 'playHouse',
        label: 'act.playHouse',
        duration: 60,
        effects: { fun: 1.3, social: 0.15 },
        until: 'fun',
        autoBelow: 75,
        skill: { id: 'creativity', xpPerMinute: 0.9 },
      },
    ],
  },
  {
    id: 'spintop',
    name: 'obj.spintop',
    price: 35,
    category: 'games',
    room: 'bedroom',
    art: 'spintop',
    size: { w: 1, h: 1 },
    ambience: 1,
    interactions: [
      {
        id: 'spinTop',
        label: 'act.spinTop',
        duration: 30,
        effects: { fun: 1.7 },
        until: 'fun',
        kids: 'only',
        skill: { id: 'handiness', xpPerMinute: 0.7 },
      },
    ],
    upkeep: { wear: 0.04 },
  },
  {
    id: 'rockinghorse',
    name: 'obj.rockinghorse',
    price: 140,
    category: 'games',
    room: 'bedroom',
    art: 'rockinghorse',
    useSides: ['E', 'W'],
    size: { w: 1, h: 1 },
    ambience: 3,
    interactions: [
      {
        id: 'rideHorse',
        label: 'act.rideHorse',
        duration: 40,
        effects: { fun: 1.5, comfort: 0.2, energy: -0.04 },
        until: 'fun',
        kids: 'only',
        pose: 'sit',
        onObject: true,
        skill: { id: 'fitness', xpPerMinute: 0.8 },
      },
    ],
  },
];
