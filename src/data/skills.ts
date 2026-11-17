import type { SkillDef } from '../sim/types';

// Habilidades. Sobem com o uso de objetos (veja `skill` nas interações, em
// objects.ts) e contam no desempenho e nas promoções do trabalho (careers.ts).
export const SKILLS: Record<string, SkillDef> = {
  cooking: { id: 'cooking', name: 'skill.cooking' },
  logic: { id: 'logic', name: 'skill.logic' },
  creativity: { id: 'creativity', name: 'skill.creativity' },
  charisma: { id: 'charisma', name: 'skill.charisma' },
  fitness: { id: 'fitness', name: 'skill.fitness' },
};
