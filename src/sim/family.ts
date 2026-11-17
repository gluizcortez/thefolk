import { LOOK_LIMITS, TEMPER_AXES, validTemper } from './temper';
import type { Catalog, Folk, InteractionDef, Look, Outfit, Temper, Wear } from './types';

// Bloco 5: criar família. O rascunho vem da tela de criação; daqui sai o
// motivo de recusa (ou null) e, em data/family.ts, o mundo novo.

export const MAX_FAMILY = 8;
export const MAX_TRAITS = 2;
export const MAX_NAME = 18;

export interface MemberDraft {
  /** primeiro nome (o sobrenome é o da casa) */
  name: string;
  look: Look;
  traits: string[];
  temper: Temper;
  month: number;
}

export interface FamilyDraft {
  surname: string;
  members: MemberDraft[];
}

export type FamilyProblem =
  | 'noMembers'
  | 'tooMany'
  | 'noSurname'
  | 'noName'
  | 'sameName'
  | 'tooManyTraits'
  | 'unknownTrait'
  | 'clashingTraits'
  | 'temper'
  | 'month'
  | 'look';

/** Nome sem espaços sobrando, com no máximo MAX_NAME letras. */
export function cleanName(s: string): string {
  return s.replace(/\s+/g, ' ').trim().slice(0, MAX_NAME);
}

const CLASHES: [string, string][] = [
  ['caprichoso', 'desleixado'],
  ['tagarela', 'reservado'],
  ['caseiro', 'agitado'],
  ['gentil', 'esquentado'],
];

/** Traços que não podem vir juntos (um desfaz o outro). */
export function traitsClash(a: string, b: string): boolean {
  return CLASHES.some(([x, y]) => (x === a && y === b) || (x === b && y === a));
}

/** O que impede de criar esta família (null = pode). */
export function familyProblem(catalog: Catalog, draft: FamilyDraft): FamilyProblem | null {
  const members = draft.members;
  if (members.length === 0) return 'noMembers';
  if (members.length > MAX_FAMILY) return 'tooMany';
  if (!cleanName(draft.surname)) return 'noSurname';
  const names = new Set<string>();
  for (const m of members) {
    const name = cleanName(m.name);
    if (!name) return 'noName';
    if (names.has(name.toLowerCase())) return 'sameName';
    names.add(name.toLowerCase());
    if (m.traits.length > MAX_TRAITS) return 'tooManyTraits';
    if (m.traits.some((t) => !catalog.traits[t])) return 'unknownTrait';
    if (m.traits.length === 2 && (m.traits[0] === m.traits[1] || traitsClash(m.traits[0], m.traits[1]))) return 'clashingTraits';
    if (!validTemper(m.temper)) return 'temper';
    if (!Number.isInteger(m.month) || !catalog.months[m.month]) return 'month';
    for (const k of Object.keys(LOOK_LIMITS) as (keyof Look)[]) {
      const v = m.look[k];
      if (!Number.isInteger(v) || v < 0 || v >= LOOK_LIMITS[k]) return 'look';
    }
  }
  return null;
}

/** Cópia limpa de um temperamento (só os cinco eixos). */
export function copyTemper(t: Temper): Temper {
  const out = {} as Temper;
  for (const a of TEMPER_AXES) out[a] = t[a];
  return out;
}

/**
 * O que o folk está vestindo agora: a roupa que a interação pede enquanto
 * dura (pijama na cama, roupão no chuveiro) ou a roupa de sempre.
 */
export function wearOf(folk: Pick<Folk, 'outfit'>, using?: Pick<InteractionDef, 'wear'>): Wear {
  return using?.wear ?? folk.outfit ?? 'day';
}

/** Roupa com que o folk sai de casa para o trabalho. */
export function streetOutfit(outfit: Outfit): Outfit {
  return outfit === 'formal' ? 'formal' : 'day';
}
