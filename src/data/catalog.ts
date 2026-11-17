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

export const CATALOG: Catalog = {
  needs: NEEDS,
  floors: FLOORS,
  coverings: COVERINGS,
  parts: PARTS,
  objects: OBJECTS,
  traits: TRAITS,
  socials: SOCIALS,
  memories: MEMORIES,
  skills: SKILLS,
  careers: CAREERS,
  workEvents: WORK_EVENTS,
  gigs: GIGS,
  businesses: BUSINESSES,
  news: NEWS,
};
