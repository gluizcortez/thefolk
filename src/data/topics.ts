import type { TopicDef } from '../sim/types';

// Bloco 9: assuntos de conversa. Cada pessoa gosta mais ou menos de cada um
// (de -5 a 5), pelo temperamento, pelos traços e pelo que sabe fazer; o gosto
// muda devagar com o que ouve dos amigos. Os nomes são nossos.
//
// `axes`: quanto cada ponto do eixo acima de 5 soma ao gosto (abaixo, tira).
const list: TopicDef[] = [
  { id: 'weather', name: 'topic.weather', axes: { order: 0.25, outgoing: -0.15 }, traits: { caseiro: 1.5, agitado: -1 } },
  { id: 'critters', name: 'topic.critters', axes: { warmth: 0.5 }, traits: { gentil: 2, esquentado: -1 } },
  { id: 'recipes', name: 'topic.recipes', axes: { order: 0.15, warmth: 0.2 }, traits: { guloso: 2.5, caseiro: 1 }, skill: 'cooking' },
  { id: 'sports', name: 'topic.sports', axes: { pep: 0.6 }, traits: { agitado: 2, reservado: -1 }, skill: 'fitness' },
  { id: 'money', name: 'topic.money', axes: { order: 0.4, wit: -0.2 }, traits: { ambicioso: 3, brincalhao: -1 } },
  { id: 'stars', name: 'topic.stars', axes: { outgoing: -0.4, wit: 0.2 }, traits: { reservado: 1.5, romantico: 1 }, skill: 'logic' },
  { id: 'music', name: 'topic.music', axes: { pep: 0.3, wit: 0.3 }, traits: { brincalhao: 1, romantico: 1 }, skill: 'creativity' },
  { id: 'gossip', name: 'topic.gossip', axes: { outgoing: 0.5, order: -0.2 }, traits: { fofoqueiro: 3, tagarela: 1.5, reservado: -2, gentil: -0.5 } },
  { id: 'gadgets', name: 'topic.gadgets', axes: { order: 0.3, warmth: -0.2 }, traits: { caprichoso: 1, desleixado: -1 }, skill: 'handiness' },
  { id: 'romance', name: 'topic.romance', axes: { warmth: 0.4, wit: 0.2 }, traits: { romantico: 3, ciumento: 1, ambicioso: -1 } },
];

export const TOPICS: Record<string, TopicDef> = Object.fromEntries(list.map((t) => [t.id, t]));
