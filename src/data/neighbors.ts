import type { NeighborSeed } from '../sim/world';

// Quem mora na vizinhança. Aparecem sem avisar de vez em quando ou quando
// alguém da casa liga convidando. Para criar um vizinho, adicione aqui.
// `skills` é experiência (o nível sai dela: 60 = nível 1, 180 = 2, 360 = 3).
export const NEIGHBORS: NeighborSeed[] = [
  {
    name: 'Dora Alpendre',
    traits: ['gentil', 'tagarela'],
    look: { skin: 2, hair: 1, shirt: 3, pants: 3 },
    skills: { cooking: 360, charisma: 180 },
    career: { id: 'kitchen', level: 2 },
  },
  {
    name: 'Caio Telhado',
    traits: ['brincalhao', 'agitado'],
    look: { skin: 0, hair: 3, shirt: 2, pants: 0 },
    skills: { fitness: 180, creativity: 60 },
    career: { id: 'studio', level: 1 },
  },
  {
    name: 'Nina Varal',
    traits: ['romantico', 'gentil'],
    look: { skin: 1, hair: 2, shirt: 4, pants: 1 },
    skills: { creativity: 360 },
    career: { id: 'studio', level: 2 },
  },
  {
    name: 'Joaquim Pilastra',
    traits: ['ambicioso', 'reservado'],
    look: { skin: 3, hair: 4, shirt: 5, pants: 0 },
    skills: { logic: 600, charisma: 180 },
    career: { id: 'office', level: 3 },
  },
  {
    name: 'Rosa Cancela',
    traits: ['esquentado', 'ambicioso'],
    look: { skin: 1, hair: 0, shirt: 1, pants: 2 },
    skills: { logic: 180, cooking: 60 },
    career: { id: 'office', level: 1 },
  },
  {
    name: 'Otto Mirante',
    traits: ['caseiro', 'guloso'],
    look: { skin: 2, hair: 3, shirt: 0, pants: 3 },
    skills: { cooking: 180 },
    career: null,
  },
];
