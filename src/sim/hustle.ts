import { MINUTES_PER_DAY } from './clock';
import { formatMoney } from './economy';
import type { Logger } from './gossip';
import { addReputation, createNews, reputationOf } from './gossip';
import { nextFloat, nextInt } from './rng';
import { levelOf, skillLevel } from './skills';
import type { Business, BusinessDef, Catalog, Folk, GigDef, World } from './types';

// Trabalho por conta própria: frilas do mural e negócio aberto em casa.

/** ofertas no mural a cada manhã */
export const BOARD_SIZE = 3;
/** hora em que o mural troca as ofertas */
export const BOARD_HOUR = 6;
/** hora em que o negócio fecha o caixa do dia */
export const BUSINESS_CLOSE_HOUR = 21;
/** qualidade de um negócio recém-aberto */
export const BUSINESS_START_QUALITY = 30;
/** quanto a qualidade cai por dia sem trabalho */
export const BUSINESS_DECAY = 10;
/** fração do custo devolvida ao fechar */
export const BUSINESS_RESALE = 0.25;
/** xp por minuto em frila ou negócio */
export const TASK_XP = 0.6;

/** Fator da habilidade no ritmo: cada nível rende 12% a mais. */
function pace(folk: Folk, skill: string): number {
  return 1 + skillLevel(folk, skill) * 0.12;
}

/** Frilas que o folk tem nível para pegar. */
export function gigAllowed(folk: Folk, def: GigDef): boolean {
  return skillLevel(folk, def.skill) >= def.minLevel;
}

/** Troca as ofertas do mural (uma vez por dia). */
export function refreshBoard(world: World, catalog: Catalog): void {
  const defs = Object.values(catalog.gigs);
  world.gigBoard = [];
  if (!defs.length) return;
  const used = new Set<string>();
  for (let i = 0; i < BOARD_SIZE && used.size < defs.length; i++) {
    let def = defs[nextInt(world, defs.length)];
    while (used.has(def.id)) def = defs[(defs.indexOf(def) + 1) % defs.length];
    used.add(def.id);
    const pay = Math.round(def.pay * (0.85 + nextFloat(world) * 0.3));
    world.gigBoard.push({ id: world.nextId++, defId: def.id, pay });
  }
}

/** O objeto serve para o frila ou negócio do folk? */
export function taskFits(catalog: Catalog, folk: Folk, task: 'gig' | 'business', objectDefId: string): boolean {
  // bloco 4: qualquer faixa da mesma função serve (fogareiro, fogão, fogão de seis bocas)
  const line = catalog.objects[objectDefId]?.line;
  const fits = (objects: string[]) => objects.includes(objectDefId) || (!!line && objects.includes(line));
  if (task === 'gig') {
    const def = folk.gig && catalog.gigs[folk.gig.defId];
    return !!def && fits(def.objects);
  }
  const def = folk.business && catalog.businesses[folk.business.defId];
  return !!def && fits(def.objects);
}

/** Um minuto de trabalho no frila. Devolve true quando entregou. */
export function workGig(world: World, catalog: Catalog, log: Logger, folk: Folk): boolean {
  const gig = folk.gig;
  const def = gig && catalog.gigs[gig.defId];
  if (!gig || !def) return false;
  const before = levelOf(folk.skills[def.skill] ?? 0);
  gig.progress += pace(folk, def.skill);
  folk.skills[def.skill] = (folk.skills[def.skill] ?? 0) + TASK_XP;
  const after = levelOf(folk.skills[def.skill]);
  if (after > before) log('log.skillUp', { name: folk.name, skill: catalog.skills[def.skill]?.name ?? def.skill, level: after });
  if (gig.progress < def.work) return false;
  // capricho: quem sabe mais entrega melhor e ganha um extra
  const bonus = Math.min(0.3, Math.max(0, (skillLevel(folk, def.skill) - def.minLevel) * 0.05));
  const pay = Math.round(gig.pay * (1 + bonus));
  world.household.funds += pay;
  addReputation(world, folk.id, 2);
  log('log.gigDone', { name: folk.name, gig: def.name, pay: formatMoney(pay) });
  folk.gig = null;
  return true;
}

/** Prazo estourado: o frila some e a reputação sofre. */
export function checkGigDeadline(world: World, catalog: Catalog, log: Logger, folk: Folk): void {
  const gig = folk.gig;
  if (!gig || world.tick < gig.deadline) return;
  const def = catalog.gigs[gig.defId];
  folk.gig = null;
  addReputation(world, folk.id, -5);
  log('log.gigLate', { name: folk.name, gig: def?.name ?? '' });
}

export function newBusiness(def: BusinessDef): Business {
  return { defId: def.id, quality: BUSINESS_START_QUALITY, days: 0, lastProfit: 0, lastCustomers: 0, total: 0 };
}

/** Um minuto cuidando do negócio. */
export function workBusiness(catalog: Catalog, log: Logger, folk: Folk): void {
  const b = folk.business;
  const def = b && catalog.businesses[b.defId];
  if (!b || !def) return;
  b.quality = Math.min(100, b.quality + 0.12 * pace(folk, def.skill));
  const before = levelOf(folk.skills[def.skill] ?? 0);
  folk.skills[def.skill] = (folk.skills[def.skill] ?? 0) + TASK_XP;
  const after = levelOf(folk.skills[def.skill]);
  if (after > before) log('log.skillUp', { name: folk.name, skill: catalog.skills[def.skill]?.name ?? def.skill, level: after });
}

/** Fregueses esperados num dia, sem a sorte do dia. */
export function expectedCustomers(world: World, catalog: Catalog, folk: Folk): number {
  const b = folk.business;
  const def = b && catalog.businesses[b.defId];
  if (!b || !def) return 0;
  return (
    def.customers *
    (0.25 + b.quality / 100) *
    (1 + skillLevel(folk, def.skill) * 0.06) *
    Math.max(0.3, 1 + reputationOf(world, folk.id) / 200)
  );
}

/** Fecha o caixa do dia. */
export function settleBusiness(world: World, catalog: Catalog, log: Logger, folk: Folk): void {
  const b = folk.business;
  const def = b && catalog.businesses[b.defId];
  if (!b || !def) return;
  const customers = Math.max(0, Math.round(expectedCustomers(world, catalog, folk) * (0.85 + nextFloat(world) * 0.3)));
  const profit = customers * def.price - def.upkeep;
  world.household.funds += profit;
  b.days++;
  b.lastProfit = profit;
  b.lastCustomers = customers;
  b.total += profit;
  b.quality = Math.max(0, b.quality - BUSINESS_DECAY);
  // casa cheia vira assunto na vizinhança
  if (customers >= def.customers * 1.2) addReputation(world, folk.id, 1);
  log(profit >= 0 ? 'log.businessDay' : 'log.businessLoss', {
    name: folk.name,
    business: def.name,
    customers,
    profit: formatMoney(Math.abs(profit)),
  });
}

/** Abre o negócio (o caixa já foi conferido por quem chama). */
export function openBusiness(world: World, catalog: Catalog, log: Logger, folk: Folk, def: BusinessDef): void {
  world.household.funds -= def.cost;
  folk.business = newBusiness(def);
  log('log.businessOpen', { name: folk.name, business: def.name });
  createNews(world, catalog, log, 'openedBusiness', folk.id, 0);
}

export function closeBusiness(world: World, catalog: Catalog, log: Logger, folk: Folk): void {
  const def = folk.business && catalog.businesses[folk.business.defId];
  if (!folk.business || !def) return;
  const back = Math.round(def.cost * BUSINESS_RESALE);
  world.household.funds += back;
  folk.business = null;
  log('log.businessClosed', { name: folk.name, business: def.name, back: formatMoney(back) });
}

/** Tick do prazo para um frila aceito agora. */
export function gigDeadline(tick: number, def: GigDef): number {
  const day = Math.floor(tick / MINUTES_PER_DAY);
  return (day + def.days) * MINUTES_PER_DAY + 22 * 60;
}
