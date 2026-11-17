import type { TraitDef } from '../sim/types';

// Traços: multiplicam o peso que a IA dá a cada necessidade (needWeight) e a
// velocidade com que ela decai (decay). `likes` e `dislikes` dizem com que
// traços dos outros o folk se dá bem ou tem atrito; `social` é o gosto por
// cada tipo de conversa (amigável, romântica, profissional, maldosa).
// Para criar um traço, basta adicionar uma entrada aqui e o nome em i18n.
export const TRAITS: Record<string, TraitDef> = {
  caseiro: {
    id: 'caseiro',
    name: 'trait.caseiro',
    hint: 'traitHint.caseiro',
    needWeight: { comfort: 1.3, ambience: 1.3 },
    decay: { social: 0.8 },
    likes: ['gentil', 'reservado'],
    dislikes: ['agitado'],
  },
  tagarela: {
    id: 'tagarela',
    name: 'trait.tagarela',
    hint: 'traitHint.tagarela',
    needWeight: { social: 1.5 },
    decay: { social: 1.3 },
    likes: ['tagarela', 'brincalhao'],
    dislikes: ['reservado'],
    social: { friendly: 1.3 },
  },
  agitado: {
    id: 'agitado',
    name: 'trait.agitado',
    hint: 'traitHint.agitado',
    needWeight: { fun: 1.3 },
    decay: { fun: 1.25, energy: 0.9 },
    likes: ['brincalhao', 'agitado'],
    dislikes: ['caseiro'],
  },
  guloso: {
    id: 'guloso',
    name: 'trait.guloso',
    hint: 'traitHint.guloso',
    needWeight: { hunger: 1.3 },
    decay: { hunger: 1.2 },
    likes: ['guloso'],
  },
  brincalhao: {
    id: 'brincalhao',
    name: 'trait.brincalhao',
    hint: 'traitHint.brincalhao',
    needWeight: { fun: 1.2 },
    likes: ['tagarela', 'agitado'],
    dislikes: ['ambicioso'],
    social: { friendly: 1.2, mean: 1.5 },
  },
  romantico: {
    id: 'romantico',
    name: 'trait.romantico',
    hint: 'traitHint.romantico',
    likes: ['gentil', 'romantico'],
    dislikes: ['esquentado'],
    social: { romantic: 1.6 },
  },
  esquentado: {
    id: 'esquentado',
    name: 'trait.esquentado',
    hint: 'traitHint.esquentado',
    decay: { comfort: 1.15 },
    likes: ['ambicioso'],
    dislikes: ['tagarela', 'esquentado'],
    social: { mean: 2, friendly: 0.8 },
  },
  reservado: {
    id: 'reservado',
    name: 'trait.reservado',
    hint: 'traitHint.reservado',
    needWeight: { social: 0.7 },
    decay: { social: 0.7 },
    likes: ['caseiro', 'reservado'],
    dislikes: ['tagarela'],
    social: { friendly: 0.7, romantic: 0.8 },
  },
  ambicioso: {
    id: 'ambicioso',
    name: 'trait.ambicioso',
    hint: 'traitHint.ambicioso',
    likes: ['ambicioso'],
    dislikes: ['brincalhao'],
    social: { professional: 1.7 },
  },
  gentil: {
    id: 'gentil',
    name: 'trait.gentil',
    hint: 'traitHint.gentil',
    likes: ['gentil', 'caseiro', 'romantico'],
    dislikes: ['esquentado'],
    social: { mean: 0.2, friendly: 1.15 },
  },
};
