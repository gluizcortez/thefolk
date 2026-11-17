import type { TraitDef } from '../sim/types';

// Traços: multiplicam o peso que a IA dá a cada necessidade (needWeight) e a
// velocidade com que ela decai (decay). Para criar um traço, basta adicionar
// uma entrada aqui e o nome em i18n.
export const TRAITS: Record<string, TraitDef> = {
  caseiro: {
    id: 'caseiro',
    name: 'trait.caseiro',
    needWeight: { comfort: 1.3, ambience: 1.3 },
    decay: { social: 0.8 },
  },
  tagarela: {
    id: 'tagarela',
    name: 'trait.tagarela',
    needWeight: { social: 1.5 },
    decay: { social: 1.3 },
  },
  agitado: {
    id: 'agitado',
    name: 'trait.agitado',
    needWeight: { fun: 1.3 },
    decay: { fun: 1.25, energy: 0.9 },
  },
  guloso: {
    id: 'guloso',
    name: 'trait.guloso',
    needWeight: { hunger: 1.3 },
    decay: { hunger: 1.2 },
  },
};
