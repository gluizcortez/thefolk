import type { Catalog } from '../sim/types';
import { CAREERS } from './careers';
import { MEMORIES } from './memories';
import { NEEDS } from './needs';
import { OBJECTS } from './objects';
import { SKILLS } from './skills';
import { SOCIALS } from './socials';
import { TRAITS } from './traits';

export const CATALOG: Catalog = {
  needs: NEEDS,
  objects: OBJECTS,
  traits: TRAITS,
  socials: SOCIALS,
  memories: MEMORIES,
  skills: SKILLS,
  careers: CAREERS,
};
