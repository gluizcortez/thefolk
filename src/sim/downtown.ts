import { clockOf } from './clock';
import { isAdult } from './kids';
import { moodOf } from './needs';
import { relationOf } from './relations';
import { buildHome } from './town';
import type { HousePlan } from './town';
import { freshPlant } from './garden';
import type { Catalog, DateResult, DateState, Folk, LotHome, Neighbor, Vec, World } from './types';

// Bloco 16: o centro da cidade. Ir de táxi tira quem vai do lote de casa (a
// casa fica guardada em `Outing.home`, com quem ficou em vida resumida) e
// abre o lote do centro no World; voltar faz o caminho inverso e traz as
// encomendas. Aqui ficam as regras puras: horário, quem pode ir, nota do
// encontro e o que ela muda na relação.

export type OutingProblem =
  | 'onOuting'
  | 'notOnOuting'
  | 'noGoers'
  | 'cantGo'
  | 'babyAlone'
  | 'kidAlone'
  | 'venueClosed'
  | 'funds'
  | 'busyLot'
  | 'dateBusy'
  | 'dateRefused'
  | 'noVenue';

/** Táxi, por viagem (ida ou volta), para quem for. */
export const TAXI_FARE = 25;
/** O centro abre às 7h e fecha às 2h da madrugada (quem estiver lá volta de táxi). */
export const OPEN_HOUR = 7;
export const CLOSE_HOUR = 2;
/** De quanto em quanto tempo o humor do casal é medido no encontro. */
export const DATE_SAMPLE = 30;
/** Encontro de verdade: pelo menos isto juntos (menos que isso, não tem nota). */
export const DATE_MIN_MINUTES = 45;
/** Minutos que a cozinha leva para o prato ficar pronto. */
export const COOK_MINUTES = 14;
/** Sem garçom, o prato chega sozinho depois disto. */
export const SELF_SERVE_MINUTES = 25;
/** Esperando o prato mais que isto, desiste da mesa. */
export const ORDER_PATIENCE = 90;
/** Figurantes no largo ao mesmo tempo, no máximo. */
export const EXTRAS_MAX = 4;
/** Figurante fica entre isto e o dobro. */
export const EXTRA_STAY = 90;
/** Cansado demais (energia abaixo disso), quem está no centro volta para casa. */
export const TIRED_HOME = 12;

export interface VenuePlan extends HousePlan {
  id: string;
  /** chave de texto */
  name: string;
  /** onde o garçom espera os pratos */
  pass?: Vec;
}

/** O centro está aberto a esta hora? */
export function venueOpen(tick: number): boolean {
  const { hour } = clockOf(tick);
  return hour >= OPEN_HOUR || hour < CLOSE_HOUR;
}

/** Monta o lote do centro (de novo a cada passeio). Lampiões acesos à noite, plantas crescidas. */
export function buildVenue(world: World, catalog: Catalog, plan: VenuePlan): LotHome {
  const { home } = buildHome(world, catalog, plan);
  for (const o of home.objects) {
    const def = catalog.objects[o.defId];
    if (def?.plant) o.plant = freshPlant(def.plant, true);
  }
  lightVenue(home.objects, catalog, world.tick);
  return home;
}

/** Lampiões e luminárias do centro acendem ao anoitecer e apagam de manhã. */
export function lightVenue(objects: World['objects'], catalog: Catalog, tick: number): void {
  const { hour } = clockOf(tick);
  const dark = hour >= 18 || hour < 6;
  for (const o of objects) {
    const def = catalog.objects[o.defId];
    if (def?.light) o.lit = dark || (def.layer === 'ceiling');
  }
}

/** Quem pode entrar no táxi: morador em casa, acordado, de pé e que não é bebê. */
export function canGo(folk: Folk): boolean {
  return !folk.visit && !folk.away && folk.age !== 'baby' && !folk.down && folk.collapsed === 0;
}

/**
 * Pode sair esta turma? Criança só vai com um adulto, bebê só fica com um
 * adulto em casa (no trabalho também conta: volta para casa no fim do turno).
 */
export function outingProblem(world: World, folkIds: number[]): OutingProblem | null {
  if (world.outing || world.trip) return 'onOuting';
  if (folkIds.length === 0) return 'noGoers';
  if (!venueOpen(world.tick)) return 'venueClosed';
  if (world.fires.length > 0 || world.party || world.passings.length > 0) return 'busyLot';
  const goers = folkIds.map((id) => world.folks.find((f) => f.id === id));
  if (goers.some((f) => !f || !canGo(f))) return 'cantGo';
  const going = goers as Folk[];
  if (going.some((f) => f.age === 'child') && !going.some((f) => isAdult(f))) return 'kidAlone';
  const stay = world.folks.filter((f) => !f.visit && !folkIds.includes(f.id));
  // bloco 17: jovem já fica em casa sozinho e olha os pequenos
  const keeper = stay.some((f) => isAdult(f) || f.age === 'teen');
  if (stay.some((f) => f.age === 'baby' || f.age === 'child') && !keeper) return 'babyAlone';
  // plano 2, bloco 12: na cidade aberta o preço depende do jeito de ir (sim/city.ts)
  if (!world.town?.city && world.household.funds < TAXI_FARE) return 'funds';
  return null;
}

/** Vizinho que dá para chamar para sair: adulto, no bairro ou na cidade, sem ser prestador. */
export function dateAvailable(n: Neighbor | undefined): boolean {
  return !!n && n.service === undefined && n.away === undefined && isAdult(n);
}

/** Chance de o vizinho topar sair com `host` (amizade, romance e namoro pesam). */
export function dateChance(world: World, catalog: Catalog, host: Folk, n: Neighbor): number {
  const rel = relationOf(world, n.id, host.id);
  if (!rel) return 0.1;
  let p = 0.2 + rel.friendship / 160 + rel.romance / 110 + (rel.dating ? 0.3 : 0);
  if (n.traits.some((t) => t === 'romantico')) p += 0.08;
  if (n.traits.some((t) => t === 'reservado')) p -= 0.08;
  p += (moodOf(catalog, host.needs) - 50) / 400;
  return Math.max(0.05, Math.min(0.95, p));
}

/** Nota do encontro, de 0 a 100: humor dos dois, conversas, jantar, presentes e desejos. */
export function dateScore(d: DateState): number {
  const mood = d.samples > 0 ? d.mood / d.samples : 50;
  const score = mood * 0.55 + d.good * 4 - d.bad * 7 + d.dined + d.gifts * 7 + d.wishes * 3;
  return Math.round(Math.max(0, Math.min(100, score)));
}

/** Estrelas (1 a 5) pela nota. */
export function dateGrade(score: number): number {
  if (score >= 78) return 5;
  if (score >= 62) return 4;
  if (score >= 46) return 3;
  if (score >= 30) return 2;
  return 1;
}

/** O que cada nota faz com a relação (de quem foi convidado por quem convidou, e de volta). */
export const DATE_ROMANCE = [0, -12, -5, 3, 9, 15];
export const DATE_FRIENDSHIP = [0, -8, -3, 3, 6, 10];

/** Fecha a conta do encontro (sem mexer no mundo). */
export function dateResult(world: World, d: DateState): DateResult {
  const score = dateScore(d);
  const grade = dateGrade(score);
  return { tick: world.tick, host: d.host, guest: d.guest, score, grade, romance: DATE_ROMANCE[grade], friendship: DATE_FRIENDSHIP[grade] };
}

/** O encontro durou o bastante para ter nota? */
export function dateCounts(world: World, d: DateState): boolean {
  return world.tick - d.since >= DATE_MIN_MINUTES;
}

/** Quanto falta (minutos) para o centro fechar. */
export function minutesToClose(tick: number): number {
  const { hour, minute } = clockOf(tick);
  const now = hour * 60 + minute;
  const close = CLOSE_HOUR * 60;
  return now < close ? close - now : 24 * 60 - now + close;
}
