import { monthFor, temperFromTraits } from '../sim/temper';
import type { NeighborSeed, RelationSeed } from '../sim/world';
import { MONTHS } from './months';
import { TRAITS } from './traits';

// Quem mora na vizinhança. Aparecem sem avisar de vez em quando ou quando
// alguém da casa liga convidando. Para criar um vizinho, adicione aqui.
// Quem tem `career` é colega de verdade de quem trabalha na mesma área;
// `boss: true` é quem manda no lugar (um por carreira).
// `skills` é experiência (o nível sai dela: 60 = nível 1, 180 = 2, 360 = 3).
const RAW: NeighborSeed[] = [
  {
    name: 'Dora Alpendre',
    traits: ['gentil', 'tagarela'],
    look: { skin: 2, hair: 1, shirt: 3, pants: 3 },
    skills: { cooking: 360, charisma: 180 },
    career: { id: 'kitchen', level: 4 },
  },
  {
    name: 'Caio Telhado',
    traits: ['brincalhao', 'agitado'],
    look: { skin: 0, hair: 3, shirt: 2, pants: 0 },
    skills: { fitness: 180, creativity: 60 },
    career: { id: 'studio', level: 2 },
  },
  {
    name: 'Nina Varal',
    traits: ['romantico', 'gentil'],
    look: { skin: 1, hair: 2, shirt: 4, pants: 1 },
    skills: { creativity: 360 },
    career: { id: 'studio', level: 4 },
  },
  {
    name: 'Joaquim Pilastra',
    traits: ['ambicioso', 'reservado'],
    look: { skin: 3, hair: 4, shirt: 5, pants: 0 },
    skills: { logic: 600, charisma: 180 },
    career: { id: 'office', level: 6 },
  },
  {
    name: 'Rosa Cancela',
    traits: ['esquentado', 'ambicioso'],
    look: { skin: 1, hair: 0, shirt: 1, pants: 2 },
    skills: { logic: 180, cooking: 60 },
    career: { id: 'office', level: 2 },
  },
  {
    name: 'Otto Mirante',
    traits: ['caseiro', 'guloso'],
    look: { skin: 2, hair: 3, shirt: 0, pants: 3 },
    skills: { cooking: 180 },
    career: null,
  },
  // fatia 5: chefes e mais uma colega na cozinha
  {
    name: 'Hermínia Cumeeira',
    traits: ['ambicioso', 'reservado'],
    look: { skin: 2, hair: 4, shirt: 5, pants: 3 },
    skills: { logic: 1500, charisma: 900 },
    career: { id: 'office', level: 8 },
    boss: true,
  },
  {
    name: 'Áureo Beiral',
    traits: ['esquentado', 'guloso'],
    look: { skin: 1, hair: 3, shirt: 3, pants: 0 },
    skills: { cooking: 1800, fitness: 600 },
    career: { id: 'kitchen', level: 8 },
    boss: true,
  },
  {
    name: 'Vera Claraboia',
    traits: ['romantico', 'agitado'],
    look: { skin: 0, hair: 1, shirt: 2, pants: 1 },
    skills: { creativity: 1800, charisma: 600 },
    career: { id: 'studio', level: 8 },
    boss: true,
  },
  {
    name: 'Bento Lajota',
    traits: ['fofoqueiro', 'brincalhao'],
    look: { skin: 3, hair: 2, shirt: 1, pants: 2 },
    skills: { cooking: 180, fitness: 60 },
    career: { id: 'kitchen', level: 2 },
  },
  // bloco 8: quem manda nas carreiras novas e mais alguns colegas
  {
    name: 'Celeste Persiana',
    traits: ['gentil', 'caprichoso'],
    look: { skin: 1, hair: 4, shirt: 0, pants: 1 },
    skills: { logic: 2160, tidiness: 1260, charisma: 600 },
    career: { id: 'clinic', level: 8 },
    boss: true,
  },
  {
    name: 'Gaspar Calha',
    traits: ['reservado', 'caprichoso'],
    look: { skin: 3, hair: 4, shirt: 2, pants: 0 },
    skills: { handiness: 2160, fitness: 900, logic: 600 },
    career: { id: 'workshop', level: 8 },
    boss: true,
  },
  {
    name: 'Lola Gelosia',
    traits: ['brincalhao', 'agitado'],
    look: { skin: 0, hair: 1, shirt: 4, pants: 2 },
    skills: { fitness: 2160, creativity: 1260, charisma: 900 },
    career: { id: 'circus', level: 8 },
    boss: true,
  },
  {
    name: 'Severino Mansarda',
    traits: ['reservado', 'ambicioso'],
    look: { skin: 2, hair: 4, shirt: 5, pants: 3 },
    skills: { logic: 2160, creativity: 1260, handiness: 600 },
    career: { id: 'observatory', level: 8 },
    boss: true,
  },
  {
    name: 'Amélia Fachada',
    traits: ['tagarela', 'ambicioso'],
    look: { skin: 1, hair: 0, shirt: 3, pants: 0 },
    skills: { charisma: 2160, logic: 1260, creativity: 600 },
    career: { id: 'townhall', level: 8 },
    boss: true,
  },
  {
    name: 'Tião Escada',
    traits: ['agitado', 'brincalhao'],
    look: { skin: 3, hair: 2, shirt: 1, pants: 1 },
    skills: { fitness: 2160, charisma: 1260, tidiness: 360 },
    career: { id: 'club', level: 8 },
    boss: true,
  },
  {
    name: 'Ivone Chaminé',
    traits: ['gentil', 'ambicioso'],
    look: { skin: 2, hair: 3, shirt: 1, pants: 3 },
    skills: { fitness: 2160, handiness: 1260, logic: 600 },
    career: { id: 'brigade', level: 8 },
    boss: true,
  },
  {
    name: 'Lúcio Batente',
    traits: ['gentil', 'reservado'],
    look: { skin: 0, hair: 2, shirt: 0, pants: 2 },
    skills: { logic: 180, tidiness: 360 },
    career: { id: 'clinic', level: 2 },
  },
  {
    name: 'Rita Vidraça',
    traits: ['tagarela', 'fofoqueiro'],
    look: { skin: 2, hair: 1, shirt: 5, pants: 1 },
    skills: { charisma: 600, logic: 60 },
    career: { id: 'townhall', level: 3 },
  },
  {
    name: 'Edu Manilha',
    traits: ['agitado', 'guloso'],
    look: { skin: 1, hair: 3, shirt: 2, pants: 3 },
    skills: { fitness: 600, charisma: 60 },
    career: { id: 'club', level: 2 },
  },
  // bloco 2: quem presta serviço no bairro. São vizinhos como os outros:
  // dá para fazer amizade, e a faxineira comenta o que viu nas casas.
  {
    name: 'Zeca Soleira',
    traits: ['agitado', 'tagarela'],
    look: { skin: 2, hair: 0, shirt: 1, pants: 0 },
    skills: { fitness: 360 },
    career: null,
    service: 'courier',
  },
  {
    name: 'Marta Rodapé',
    traits: ['caprichoso', 'fofoqueiro'],
    look: { skin: 3, hair: 3, shirt: 4, pants: 3 },
    skills: { tidiness: 1260, cooking: 180 },
    career: null,
    service: 'maid',
  },
  {
    name: 'Ivo Tomada',
    traits: ['reservado', 'caprichoso'],
    look: { skin: 1, hair: 4, shirt: 5, pants: 1 },
    skills: { handiness: 1680, logic: 180 },
    career: null,
    service: 'repair',
  },
  {
    name: 'Plácido Carimbo',
    traits: ['reservado', 'ambicioso'],
    look: { skin: 0, hair: 4, shirt: 3, pants: 0 },
    skills: { logic: 360, charisma: 180 },
    career: null,
    service: 'bailiff',
  },
];

/**
 * Quem já se conhece na vizinhança antes de o jogo começar (além dos colegas
 * de trabalho, que se conhecem pelo serviço). É por aqui que a fofoca anda.
 */
export const NEIGHBOR_TIES: RelationSeed[] = [
  { a: 'Dora Alpendre', b: 'Otto Mirante', friendship: 40, respect: 10 },
  { a: 'Nina Varal', b: 'Caio Telhado', friendship: 35, romance: 10 },
  { a: 'Rosa Cancela', b: 'Bento Lajota', friendship: 25 },
  { a: 'Otto Mirante', b: 'Bento Lajota', friendship: 30 },
  { a: 'Dora Alpendre', b: 'Nina Varal', friendship: 20 },
  // a faxineira conhece meio bairro (é por ela que a fofoca da casa sai)
  { a: 'Marta Rodapé', b: 'Dora Alpendre', friendship: 35 },
  { a: 'Marta Rodapé', b: 'Otto Mirante', friendship: 25 },
  { a: 'Zeca Soleira', b: 'Caio Telhado', friendship: 30 },
  // bloco 8
  { a: 'Rita Vidraça', b: 'Dora Alpendre', friendship: 30 },
  { a: 'Edu Manilha', b: 'Caio Telhado', friendship: 35 },
  { a: 'Lúcio Batente', b: 'Nina Varal', friendship: 25 },
];

/** Bloco 5: o temperamento dos vizinhos sai dos traços e o mês, do temperamento. */
export const NEIGHBORS: NeighborSeed[] = RAW.map((n) => {
  const temper = n.temper ?? temperFromTraits({ traits: TRAITS }, n.traits);
  return { ...n, temper, month: n.month ?? monthFor({ months: MONTHS }, temper) };
});
