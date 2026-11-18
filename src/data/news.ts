import type { NewsDef } from '../sim/types';

// O que corre de boca em boca. `reputation` muda a fama de quem é o assunto a
// cada pessoa que fica sabendo; `opinion` muda como quem ouve passa a ver o
// assunto (se já o conhece); `juicy` (0 a 1) é a vontade de passar adiante.
// `jealousy`: quem namora o assunto e fica sabendo sente ciúme do {other}.
const list: NewsDef[] = [
  { id: 'cheated', label: 'news.cheated', reputation: -3, opinion: { friendship: -4, respect: -3 }, juicy: 0.95, jealousy: true, days: 8 },
  { id: 'brokeUp', label: 'news.brokeUp', reputation: 0, juicy: 0.7, days: 5 },
  { id: 'dating', label: 'news.dating', reputation: 1, opinion: { friendship: 1 }, juicy: 0.6, days: 5 },
  { id: 'fought', label: 'news.fought', reputation: -2, opinion: { friendship: -2 }, juicy: 0.65, days: 4 },
  { id: 'promoted', label: 'news.promoted', reputation: 2, opinion: { respect: 4 }, juicy: 0.45, days: 5 },
  { id: 'fired', label: 'news.fired', reputation: -2, opinion: { respect: -4 }, juicy: 0.6, days: 5 },
  { id: 'workHero', label: 'news.workHero', reputation: 3, opinion: { respect: 5, friendship: 1 }, juicy: 0.4, days: 4 },
  { id: 'workSlacker', label: 'news.workSlacker', reputation: -2, opinion: { respect: -4 }, juicy: 0.5, days: 4 },
  { id: 'tookCredit', label: 'news.tookCredit', reputation: -3, opinion: { friendship: -4, respect: -2 }, juicy: 0.75, days: 6 },
  { id: 'kindness', label: 'news.kindness', reputation: 3, opinion: { friendship: 4 }, juicy: 0.35, days: 4 },
  { id: 'openedBusiness', label: 'news.openedBusiness', reputation: 2, opinion: { respect: 3 }, juicy: 0.5, days: 6 },
  { id: 'scandal', label: 'news.scandal', reputation: -4, opinion: { respect: -3, friendship: -2 }, juicy: 0.9, days: 6 },
  // bloco 2: a faxineira conta por aí como estava a casa
  { id: 'repossessed', label: 'news.repossessed', reputation: -2, opinion: { respect: -2 }, juicy: 0.7, days: 5 },
  { id: 'messyHouse', label: 'news.messyHouse', reputation: -1, opinion: { respect: -1 }, juicy: 0.55, days: 4 },
  // bloco 9: festas
  { id: 'greatParty', label: 'news.greatParty', reputation: 3, opinion: { friendship: 2 }, juicy: 0.6, days: 6 },
  { id: 'flopParty', label: 'news.flopParty', reputation: -2, opinion: { respect: -1 }, juicy: 0.75, days: 5 },
  // bloco 10: vida a dois
  { id: 'engaged', label: 'news.engaged', reputation: 1, opinion: { friendship: 1 }, juicy: 0.7, days: 6 },
  { id: 'proposalRefused', label: 'news.proposalRefused', reputation: -1, juicy: 0.85, days: 5 },
  { id: 'wedding', label: 'news.wedding', reputation: 3, opinion: { friendship: 2 }, juicy: 0.65, days: 7 },
  { id: 'divorce', label: 'news.divorce', reputation: -1, juicy: 0.9, days: 8 },
  { id: 'movedOut', label: 'news.movedOut', reputation: 0, juicy: 0.6, days: 5 },
  // bloco 11: bebês e crianças
  { id: 'newBaby', label: 'news.newBaby', reputation: 2, opinion: { friendship: 2 }, juicy: 0.6, days: 6 },
  { id: 'kidTaken', label: 'news.kidTaken', reputation: -5, opinion: { friendship: -3, respect: -4 }, juicy: 0.95, days: 9 },
  { id: 'boarding', label: 'news.boarding', reputation: -1, opinion: { respect: -1 }, juicy: 0.7, days: 5 },
  { id: 'partyBrawl', label: 'news.partyBrawl', reputation: -3, opinion: { friendship: -2, respect: -1 }, juicy: 0.9, days: 6 },
];

export const NEWS: Record<string, NewsDef> = Object.fromEntries(list.map((n) => [n.id, n]));
