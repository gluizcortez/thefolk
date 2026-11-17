import type { BusinessDef, GigDef } from '../sim/types';

// Frilas: trabalhos avulsos que aparecem no mural toda manhã. `work` são
// minutos de trabalho de quem está no nível 0 (cada nível rende 12% a mais).
// `objects` são os objetos da casa onde dá para fazer o serviço.
const gigs: GigDef[] = [
  { id: 'ledger', name: 'gig.ledger', skill: 'logic', minLevel: 1, work: 150, pay: 120, days: 2, objects: ['desk'] },
  { id: 'audit', name: 'gig.audit', skill: 'logic', minLevel: 3, work: 280, pay: 290, days: 3, objects: ['desk'] },
  { id: 'poster', name: 'gig.poster', skill: 'creativity', minLevel: 1, work: 140, pay: 110, days: 2, objects: ['easel', 'desk'] },
  { id: 'portrait', name: 'gig.portrait', skill: 'creativity', minLevel: 3, work: 260, pay: 280, days: 3, objects: ['easel'] },
  { id: 'lunchboxes', name: 'gig.lunchboxes', skill: 'cooking', minLevel: 1, work: 130, pay: 120, days: 1, objects: ['stove'] },
  { id: 'weddingCake', name: 'gig.weddingCake', skill: 'cooking', minLevel: 4, work: 260, pay: 320, days: 3, objects: ['stove'] },
  { id: 'speech', name: 'gig.speech', skill: 'charisma', minLevel: 2, work: 120, pay: 170, days: 2, objects: ['desk', 'recorder'] },
  { id: 'jingle', name: 'gig.jingle', skill: 'charisma', minLevel: 0, work: 90, pay: 70, days: 1, objects: ['recorder'] },
];

// Negócios próprios: abrem em casa e fecham o caixa todo dia às 21h.
// Fregueses = `customers` x qualidade x habilidade x reputação.
const businesses: BusinessDef[] = [
  { id: 'bakery', name: 'biz.bakery', cost: 900, skill: 'cooking', objects: ['stove'], upkeep: 55, price: 9, customers: 18 },
  { id: 'signShop', name: 'biz.signShop', cost: 800, skill: 'creativity', objects: ['easel', 'desk'], upkeep: 45, price: 32, customers: 5 },
  { id: 'bookkeeping', name: 'biz.bookkeeping', cost: 1000, skill: 'logic', objects: ['desk'], upkeep: 60, price: 45, customers: 4 },
];

export const GIGS: Record<string, GigDef> = Object.fromEntries(gigs.map((g) => [g.id, g]));
export const BUSINESSES: Record<string, BusinessDef> = Object.fromEntries(businesses.map((b) => [b.id, b]));
