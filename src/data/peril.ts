import type { InteractionDef, ObjectDef } from '../sim/types';
import { clean, repair } from './interactions';

// Bloco 14: segurança da casa (extintor, detector de fumaça, alarme contra
// gatuno), a lareira (aconchego que pode virar perigo) e o que fica no lote
// quando alguém morre: lápide no quintal ou urna dentro de casa. Lápide e
// urna não se compram; nascem com a morte e aceitam homenagem.

/** Prestar homenagem: flores e um minuto de silêncio; acalma o fantasma (uma vez por dia). */
const honor = (): InteractionDef => ({
  id: 'honor',
  label: 'act.honor',
  duration: 25,
  effects: { social: 0.3, comfort: 0.2 },
  autonomous: false,
  residentOnly: true,
  special: 'honor',
});

export const PERIL_OBJECTS: ObjectDef[] = [
  {
    id: 'extinguisher',
    name: 'obj.extinguisher',
    art: 'extinguisher',
    price: 120,
    category: 'appliances',
    size: { w: 1, h: 1 },
    ambience: -1,
    safety: 'extinguisher',
    interactions: [
      {
        // pega o extintor e corre até o fogo mais perto (veja Sim.processDouse)
        id: 'douse',
        label: 'act.douse',
        duration: 1,
        effects: {},
        autonomous: false,
        kids: 'no',
        special: 'douse',
      },
    ],
  },
  {
    id: 'smokealarm',
    name: 'obj.smokealarm',
    art: 'smokealarm',
    price: 60,
    category: 'electronics',
    size: { w: 1, h: 1 },
    layer: 'ceiling',
    ambience: 0,
    safety: 'smoke',
    interactions: [],
  },
  {
    id: 'burglaralarm',
    name: 'obj.burglaralarm',
    art: 'burglaralarm',
    price: 250,
    category: 'electronics',
    size: { w: 1, h: 1 },
    layer: 'wall',
    ambience: 0,
    safety: 'burglar',
    upkeep: { wear: 0.02, breaks: true },
    interactions: [repair()],
  },
  {
    id: 'fireplace',
    name: 'obj.fireplace',
    art: 'fireplace',
    price: 900,
    tier: 2,
    category: 'decor',
    size: { w: 2, h: 1 },
    useSides: ['S'],
    ambience: 14,
    // a lareira em si é de tijolo: o perigo é o que fica colado nela
    flammable: false,
    hearth: true,
    slots: 2,
    upkeep: { dirt: 0.05 },
    interactions: [
      {
        id: 'kindle',
        label: 'act.kindle',
        duration: 6,
        effects: { fun: 0.3 },
        autonomous: false,
        kids: 'no',
        special: 'kindle',
      },
      {
        // aquecer-se: só com o fogo aceso
        id: 'warm',
        label: 'act.warm',
        duration: 40,
        effects: { comfort: 1.1, fun: 0.4, ambience: 0.3 },
        until: 'comfort',
        autoBelow: 60,
        blaze: true,
        duo: { effects: { social: 0.6, fun: 0.2 }, friendship: 0.05, romance: 0.05 },
      },
      {
        id: 'smother',
        label: 'act.smother',
        duration: 3,
        effects: {},
        autonomous: false,
        blaze: true,
        special: 'smother',
      },
      clean(),
    ],
  },
  {
    id: 'grave',
    name: 'obj.grave',
    art: 'grave',
    price: 0,
    buyable: false,
    category: 'decor',
    size: { w: 1, h: 1 },
    ambience: -3,
    memorial: true,
    interactions: [honor()],
  },
  {
    id: 'urn',
    name: 'obj.urn',
    art: 'urn',
    price: 0,
    buyable: false,
    category: 'decor',
    size: { w: 1, h: 1 },
    ambience: -1,
    memorial: true,
    interactions: [honor()],
  },
];
