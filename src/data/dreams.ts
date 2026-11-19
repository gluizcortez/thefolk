import type { DreamDef, PerkDef } from '../sim/types';

// Plano 2, bloco 10: sonhos de vida e benefícios. Tudo aqui é dado: para
// criar um sonho, adicione a entrada e os textos em i18n (dream.<id> e
// dreamHint.<id>). As regras ficam em sim/persona.ts.

const dreams: DreamDef[] = [
  { id: 'topo', name: 'dream.topo', hint: 'dreamHint.topo', icon: 'work', goal: 'careerTop', amount: 1, traits: ['ambicioso', 'pe_de_boi', 'cabeca_boa'], reward: 120 },
  { id: 'casaCheia', name: 'dream.casaCheia', hint: 'dreamHint.casaCheia', icon: 'heart', goal: 'kids', amount: 5, traits: ['familia', 'gentil', 'caseiro', 'romantico'], reward: 120 },
  { id: 'amigoDeTodos', name: 'dream.amigoDeTodos', hint: 'dreamHint.amigoDeTodos', icon: 'social', goal: 'friends', amount: 20, traits: ['tagarela', 'festeiro', 'boa_pinta', 'fofoqueiro', 'gentil'], reward: 100 },
  { id: 'mestre', name: 'dream.mestre', hint: 'dreamHint.mestre', icon: 'skill', goal: 'skillsMax', amount: 3, traits: ['cabeca_boa', 'pe_no_chao', 'rato_de_biblioteca', 'ambicioso'], reward: 120 },
  { id: 'chef', name: 'dream.chef', hint: 'dreamHint.chef', icon: 'hunger', goal: 'skillMax', ref: 'cooking', amount: 10, traits: ['mao_de_fada', 'guloso', 'caseiro'], reward: 70 },
  { id: 'peDeMeia', name: 'dream.peDeMeia', hint: 'dreamHint.peDeMeia', icon: 'money', goal: 'funds', amount: 50000, traits: ['mao_de_vaca', 'ambicioso', 'pe_no_chao'], reward: 90 },
  { id: 'obraPrima', name: 'dream.obraPrima', hint: 'dreamHint.obraPrima', icon: 'spark', goal: 'works', amount: 12, traits: ['artistico', 'avoado', 'rato_de_biblioteca', 'coruja'], reward: 90 },
  { id: 'galeria', name: 'dream.galeria', hint: 'dreamHint.galeria', icon: 'ambience', goal: 'paintings', amount: 8, traits: ['artistico', 'avoado', 'bicho_do_mato'], reward: 80 },
  { id: 'emForma', name: 'dream.emForma', hint: 'dreamHint.emForma', icon: 'energy', goal: 'skillMax', ref: 'fitness', amount: 10, traits: ['atletico', 'agitado', 'madrugador', 'destemido'], reward: 70 },
  { id: 'fazTudo', name: 'dream.fazTudo', hint: 'dreamHint.fazTudo', icon: 'hand', goal: 'skillMax', ref: 'handiness', amount: 10, traits: ['faz_tudo', 'pe_no_chao', 'madrugador'], reward: 70 },
  { id: 'gala', name: 'dream.gala', hint: 'dreamHint.gala', icon: 'heart', goal: 'skillMax', ref: 'charisma', amount: 10, traits: ['boa_pinta', 'vaidoso', 'tagarela', 'pe_de_valsa'], reward: 70 },
  { id: 'bodas', name: 'dream.bodas', hint: 'dreamHint.bodas', icon: 'heart', goal: 'married', amount: 90, traits: ['romantico', 'familia', 'ciumento', 'coracao_mole'], reward: 80 },
  { id: 'casaDosSonhos', name: 'dream.casaDosSonhos', hint: 'dreamHint.casaDosSonhos', icon: 'ambience', goal: 'houseValue', amount: 40000, traits: ['caprichoso', 'vaidoso', 'caseiro', 'molenga'], reward: 90 },
  { id: 'sossego', name: 'dream.sossego', hint: 'dreamHint.sossego', icon: 'comfort', goal: 'funds', amount: 20000, traits: ['ranzinza', 'noveleiro', 'medroso', 'desleixado', 'sortudo', 'desastrado', 'brincalhao', 'esquentado', 'reservado'], reward: 70 },
];

export const DREAMS: Record<string, DreamDef> = Object.fromEntries(dreams.map((d) => [d.id, d]));

const perks: PerkDef[] = [
  { id: 'restful', name: 'perk.restful', hint: 'perkHint.restful', icon: 'energy', cost: 60 },
  { id: 'chef', name: 'perk.chef', hint: 'perkHint.chef', icon: 'hunger', cost: 40 },
  { id: 'quickStudy', name: 'perk.quickStudy', hint: 'perkHint.quickStudy', icon: 'skill', cost: 80 },
  { id: 'luckyLove', name: 'perk.luckyLove', hint: 'perkHint.luckyLove', icon: 'heart', cost: 50 },
  { id: 'charm', name: 'perk.charm', hint: 'perkHint.charm', icon: 'social', cost: 50 },
  { id: 'ironStomach', name: 'perk.ironStomach', hint: 'perkHint.ironStomach', icon: 'hunger', cost: 40 },
  { id: 'ironBladder', name: 'perk.ironBladder', hint: 'perkHint.ironBladder', icon: 'bladder', cost: 30 },
  { id: 'fresh', name: 'perk.fresh', hint: 'perkHint.fresh', icon: 'hygiene', cost: 30 },
  { id: 'steady', name: 'perk.steady', hint: 'perkHint.steady', icon: 'mood', cost: 70 },
  // plano 2, bloco 11: troca os traços uma vez (pelo criador, no espelho ou na tela da família)
  { id: 'newLeaf', name: 'perk.newLeaf', hint: 'perkHint.newLeaf', icon: 'mood', cost: 60 },
];

export const PERKS: Record<string, PerkDef> = Object.fromEntries(perks.map((p) => [p.id, p]));
