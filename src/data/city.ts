import type { TownPlan } from '../sim/town';
import { TOWN } from './town';

// Plano 2, bloco 12: a cidade de Arribada. A Vila Taramela (bloco 15) é o
// primeiro dos três bairros; os outros dois ficam ao sul dela, ligados pelas
// avenidas, e o centro (bloco 16) fica do outro lado do Rio Manso. Algumas
// pessoas que moravam "fora" (chefes que tinham casa no centro) passam a ter
// endereço nos bairros novos; o resto são casas à venda e terrenos vagos.

export const CITY: TownPlan = {
  ...TOWN,
  city: 'Arribada',
  districts: [
    {
      name: 'Jardim Cambará',
      street: 'Rua dos Cambarás',
      lots: [
        { number: 1, side: 0, col: 0, land: 1300, house: 'casarao', family: { name: 'Cumeeira', members: ['Hermínia Cumeeira'], funds: 5200 } },
        { number: 3, side: 0, col: 1, land: 1100 },
        { number: 5, side: 0, col: 2, land: 1200, house: 'chaleEmpty' },
        { number: 7, side: 0, col: 3, land: 1400, house: 'chale', family: { name: 'Mansarda', members: ['Severino Mansarda'], funds: 3900 } },
        { number: 9, side: 0, col: 4, land: 1000 },
        { number: 2, side: 1, col: 0, land: 1200, house: 'starter', family: { name: 'Fachada', members: ['Amélia Fachada'], funds: 3100 } },
        { number: 4, side: 1, col: 1, land: 1000, house: 'chaleEmpty' },
        { number: 6, side: 1, col: 2, land: 900 },
        { number: 8, side: 1, col: 3, land: 1100 },
        { number: 10, side: 1, col: 4, land: 1300, house: 'chaleEmpty' },
      ],
    },
    {
      name: 'Alto do Moinho',
      street: 'Rua do Moinho',
      lots: [
        { number: 1, side: 0, col: 0, land: 1500, house: 'chaleEmpty' },
        { number: 3, side: 0, col: 1, land: 1700, house: 'casarao', family: { name: 'Claraboia', members: ['Vera Claraboia'], funds: 6100 } },
        { number: 5, side: 0, col: 2, land: 1400 },
        { number: 7, side: 0, col: 3, land: 1300 },
        { number: 9, side: 0, col: 4, land: 1600, house: 'chale', family: { name: 'Calha', members: ['Gaspar Calha'], funds: 4400 } },
        { number: 2, side: 1, col: 0, land: 1200 },
        { number: 4, side: 1, col: 1, land: 1500, house: 'starter', family: { name: 'Chaminé', members: ['Ivone Chaminé'], funds: 3600 } },
        { number: 6, side: 1, col: 2, land: 1300, house: 'chaleEmpty' },
        { number: 8, side: 1, col: 3, land: 1100 },
        { number: 10, side: 1, col: 4, land: 1400 },
      ],
    },
  ],
};
