import type { Folk, InteractionDef, NeedId } from './types';

export const MAX_SKILL_LEVEL = 10;
/** experiência para ir do nível n-1 ao n é n × isto (1 xp ≈ 1 minuto de treino puxado) */
const XP_STEP = 60;
/** quanto cada nível melhora a necessidade que a habilidade "turbina" */
export const SKILL_BOOST_PER_LEVEL = 0.06;
/** humor abaixo disso faz o treino render metade */
export const LOW_MOOD = 35;

/** Experiência total para chegar ao nível `level`. */
export function xpForLevel(level: number): number {
  const n = Math.max(0, Math.min(MAX_SKILL_LEVEL, level));
  return (XP_STEP * n * (n + 1)) / 2;
}

export function levelOf(xp: number): number {
  let level = 0;
  while (level < MAX_SKILL_LEVEL && xp >= xpForLevel(level + 1)) level++;
  return level;
}

export function skillLevel(folk: Folk, skill: string): number {
  return levelOf(folk.skills[skill] ?? 0);
}

/** Fração (0..1) do caminho até o próximo nível. */
export function levelProgress(xp: number): number {
  const level = levelOf(xp);
  if (level >= MAX_SKILL_LEVEL) return 1;
  const a = xpForLevel(level);
  const b = xpForLevel(level + 1);
  return (xp - a) / (b - a);
}

/**
 * Um minuto de treino. Devolve o novo nível se subiu, ou null.
 */
export function trainSkill(folk: Folk, it: InteractionDef, mood: number): number | null {
  const gain = it.skill;
  if (!gain) return null;
  const before = skillLevel(folk, gain.id);
  if (before >= MAX_SKILL_LEVEL) return null;
  const rate = gain.xpPerMinute * (mood < LOW_MOOD ? 0.5 : 1);
  folk.skills[gain.id] = Math.min(xpForLevel(MAX_SKILL_LEVEL), (folk.skills[gain.id] ?? 0) + rate);
  const after = skillLevel(folk, gain.id);
  return after > before ? after : null;
}

/** Multiplicador do efeito de uma interação numa necessidade, pela habilidade. */
export function skillBoost(folk: Folk, it: InteractionDef, need: NeedId): number {
  if (!it.skill || it.skill.boosts !== need) return 1;
  return 1 + SKILL_BOOST_PER_LEVEL * skillLevel(folk, it.skill.id);
}
