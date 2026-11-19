import { MONTHS } from './months';
import type { Catalog } from '../sim/types';
import { COVERINGS, FLOORS, PARTS } from './build';
import { CAREERS } from './careers';
import { BUSINESSES, GIGS } from './gigs';
import { NEWS } from './news';
import { WORK_EVENTS } from './workEvents';
import { MEMORIES } from './memories';
import { NEEDS } from './needs';
import { OBJECTS } from './objects';
import { SKILLS } from './skills';
import { SOCIALS } from './socials';
import { TRAITS } from './traits';
import { WISHES } from './wishes';
import { TOPICS } from './topics';
import { DISHES, GIFTS, VENUES } from './downtown';
import { DREAMS, PERKS } from './dreams';

export const CATALOG: Catalog = {
  needs: NEEDS,
  floors: FLOORS,
  coverings: COVERINGS,
  parts: PARTS,
  objects: OBJECTS,
  traits: TRAITS,
  dreams: DREAMS,
  perks: PERKS,
  socials: SOCIALS,
  memories: MEMORIES,
  skills: SKILLS,
  careers: CAREERS,
  workEvents: WORK_EVENTS,
  gigs: GIGS,
  businesses: BUSINESSES,
  news: NEWS,
  months: MONTHS,
  wishes: WISHES,
  topics: TOPICS,
  dishes: DISHES,
  gifts: GIFTS,
  venues: VENUES,
};
