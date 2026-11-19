import { isWorkout } from './clothes';
import type { Closet } from './clothes';
import { VOICE_MAX, traitSlots, traitsClash, traitsProblem } from './persona';
import { LOOK_LIMITS, TEMPER_AXES, validTemper } from './temper';
import type { Catalog, Folk, InteractionDef, Look, Outfit, Tastes, Temper, Wear } from './types';
import type { FolkSeed } from './world';

// Bloco 5: criar família. O rascunho vem da tela de criação; daqui sai o
// motivo de recusa (ou null) e, em data/family.ts, o mundo novo.

export const MAX_FAMILY = 8;
/** plano 2, bloco 10: traços do adulto (criança e jovem têm menos; veja TRAIT_SLOTS) */
export const MAX_TRAITS = 5;
export const MAX_NAME = 18;


/** Plano 2, bloco 10: como dois membros da família criada se ligam. */
export type TieKind = 'spouse' | 'sibling' | 'parent' | 'roommate';

/** `parent`: `a` é pai ou mãe de `b`. Sem laço entre dois membros = colegas de casa. */
export interface FamilyTie {
  a: number;
  b: number;
  kind: TieKind;
}

export interface MemberDraft {
  /** primeiro nome (o sobrenome é o da casa) */
  name: string;
  look: Look;
  traits: string[];
  temper: Temper;
  month: number;
  /** bloco 17: jovem ou idoso (sem campo = adulto); plano 2, bloco 10: criança também */
  age?: 'child' | 'teen' | 'elder';
  /** plano 2, bloco 10: sonho de vida, gostos e voz */
  dream?: string;
  tastes?: Tastes;
  voice?: number;
  /** plano 2, bloco 9/10: guarda-roupa montado no criador */
  closet?: Closet;
}

export interface FamilyDraft {
  surname: string;
  members: MemberDraft[];
  /** plano 2, bloco 10: laços entre os membros (índices em `members`) */
  ties?: FamilyTie[];
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
  | 'grownTrait'
  /** plano 2, bloco 10: falta escolher traços (adulto escolhe cinco) */
  | 'fewTraits'
  | 'dream'
  | 'tie'
  | 'temper'
  | 'month'
  | 'look'
  /** bloco 17: a casa precisa de pelo menos um adulto (ou idoso) */
  | 'noAdult';

/** Nome sem espaços sobrando, com no máximo MAX_NAME letras. */
export function cleanName(s: string): string {
  return s.replace(/\s+/g, ' ').trim().slice(0, MAX_NAME);
}

export { VOICE_MAX, traitsClash };

const GROWN_AGES = new Set<MemberDraft['age']>([undefined, 'elder']);
const ORDER: Record<string, number> = { child: 0, teen: 1, adult: 2, elder: 3 };
const rank = (m: MemberDraft) => ORDER[m.age ?? 'adult'];

/** Plano 2, bloco 10: por que este laço não vale (null = vale). */
export function tieProblem(draft: FamilyDraft, tie: FamilyTie): boolean {
  const a = draft.members[tie.a];
  const b = draft.members[tie.b];
  if (!a || !b || tie.a === tie.b) return true;
  if (tie.kind === 'spouse') return !GROWN_AGES.has(a.age) || !GROWN_AGES.has(b.age);
  // pai ou mãe é adulto (ou idoso) e mais velho que o filho
  if (tie.kind === 'parent') return !GROWN_AGES.has(a.age) || rank(a) <= rank(b);
  return false;
}

/** O laço entre dois membros (colegas de casa quando não há). */
export function tieOf(draft: FamilyDraft, i: number, j: number): { kind: TieKind; flip: boolean } {
  for (const t of draft.ties ?? []) {
    if (t.a === i && t.b === j) return { kind: t.kind, flip: false };
    if (t.a === j && t.b === i) return { kind: t.kind, flip: true };
  }
  return { kind: 'roommate', flip: false };
}

/** Põe (ou troca) o laço entre dois membros; `parent` com `a` sendo pai ou mãe. */
export function setTie(draft: FamilyDraft, a: number, b: number, kind: TieKind): void {
  const ties = (draft.ties ?? []).filter((t) => !((t.a === a && t.b === b) || (t.a === b && t.b === a)));
  if (kind !== 'roommate') ties.push({ a, b, kind });
  draft.ties = ties;
}

/** Tira um membro do rascunho e acerta os índices dos laços. */
export function dropMember(draft: FamilyDraft, index: number): void {
  draft.members.splice(index, 1);
  draft.ties = (draft.ties ?? [])
    .filter((t) => t.a !== index && t.b !== index)
    .map((t) => ({ ...t, a: t.a > index ? t.a - 1 : t.a, b: t.b > index ? t.b - 1 : t.b }));
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
    const why = traitsProblem(catalog, m.traits, m.age);
    if (why === 'full') return 'tooManyTraits';
    if (why === 'unknown') return 'unknownTrait';
    if (why === 'clash' || why === 'have') return 'clashingTraits';
    if (why === 'grown') return 'grownTrait';
    if (m.traits.length < traitSlots(m.age)) return 'fewTraits';
    if (m.dream !== undefined && !catalog.dreams?.[m.dream]) return 'dream';
    if (!validTemper(m.temper)) return 'temper';
    if (!Number.isInteger(m.month) || !catalog.months[m.month]) return 'month';
    for (const k of Object.keys(LOOK_LIMITS) as (keyof Look)[]) {
      const v = m.look[k];
      if (!Number.isInteger(v) || v < 0 || v >= LOOK_LIMITS[k]) return 'look';
    }
    if (m.voice !== undefined && (!Number.isInteger(m.voice) || m.voice < 0 || m.voice > VOICE_MAX)) return 'look';
  }
  const ties = draft.ties ?? [];
  const spouses = new Map<number, number>();
  const parents = new Map<number, number>();
  for (const t of ties) {
    if (tieProblem(draft, t)) return 'tie';
    if (t.kind === 'spouse') {
      for (const x of [t.a, t.b]) spouses.set(x, (spouses.get(x) ?? 0) + 1);
    }
    if (t.kind === 'parent') parents.set(t.b, (parents.get(t.b) ?? 0) + 1);
  }
  if ([...spouses.values()].some((n) => n > 1) || [...parents.values()].some((n) => n > 2)) return 'tie';
  if (!members.some((m) => GROWN_AGES.has(m.age))) return 'noAdult';
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
export function wearOf(folk: Pick<Folk, 'outfit'>, using?: Pick<InteractionDef, 'wear' | 'skill' | 'book' | 'jog'>): Wear {
  // plano 2, bloco 9: exercício pesado veste a roupa de ginástica
  return using?.wear ?? (isWorkout(using) ? 'gym' : undefined) ?? folk.outfit ?? 'day';
}

/** Roupa com que o folk sai de casa para o trabalho. */
export function streetOutfit(outfit: Outfit): Outfit {
  return outfit === 'formal' || outfit === 'work' ? outfit : 'day';
}

/** Plano 2, bloco 10: a semente do morador a partir do membro do rascunho (nome já com sobrenome). */
export function memberSeed(m: MemberDraft, name: string, x: number, y: number): FolkSeed {
  return {
    name,
    traits: [...m.traits],
    x,
    y,
    needs: { hunger: 70, energy: 80, bladder: 70, fun: 60, social: 55, hygiene: 80 },
    look: { ...m.look },
    temper: copyTemper(m.temper),
    month: m.month,
    ...(m.age ? { age: m.age } : {}),
    ...(m.dream ? { dream: m.dream } : {}),
    ...(m.tastes ? { tastes: { ...m.tastes } } : {}),
    ...(m.voice !== undefined ? { voice: m.voice } : {}),
    ...(m.closet ? { closet: m.closet } : {}),
  };
}
