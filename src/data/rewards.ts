import type { InteractionDef, ObjectDef } from '../sim/types';
import { clean } from './interactions';

// Bloco 8: recompensas de carreira. Cada carreira libera um objeto no
// catálogo quando alguém da casa chega ao cargo marcado em `reward.level`
// (índice: 5 = sexto cargo). Todos treinam uma habilidade da carreira mais
// depressa que os objetos comuns e enfeitam a casa.

/** Cargo (índice) em que a recompensa é liberada. */
export const REWARD_LEVEL = 5;

function practice(id: string, skill: string, fun: number, extra: InteractionDef['effects'] = {}): InteractionDef {
  return {
    id,
    label: `act.${id}`,
    duration: 60,
    effects: { fun, ...extra },
    until: 'fun',
    skill: { id: skill, xpPerMinute: 1.7 },
  };
}

function reward(
  id: string,
  career: string,
  price: number,
  ambience: number,
  interaction: InteractionDef,
  extra: Partial<ObjectDef> = {},
): ObjectDef {
  return {
    id,
    name: `obj.${id}`,
    art: id,
    price,
    category: 'hobbies',
    size: { w: 1, h: 1 },
    useSides: ['S'],
    ambience,
    reward: { career, level: REWARD_LEVEL },
    upkeep: { dirt: 0.02 },
    interactions: [interaction, clean()],
    ...extra,
  };
}

export const REWARDS: ObjectDef[] = [
  reward('abacus', 'office', 180, 4, practice('abacus', 'logic', 0.45, { comfort: 0.05 })),
  reward('spicecart', 'kitchen', 220, 4, practice('spices', 'cooking', 0.6, { hunger: 0.15 }), { room: 'kitchen' }),
  reward('press', 'studio', 260, 6, practice('printing', 'creativity', 0.8, { hygiene: -0.04 }), { room: 'studio' }),
  reward('skeleton', 'clinic', 200, 3, practice('anatomy', 'logic', 0.4)),
  reward('lathe', 'workshop', 280, 3, practice('turning', 'handiness', 0.7, { hygiene: -0.05 }), { room: 'workshop' }),
  reward('unicycle', 'circus', 160, 4, practice('unicycle', 'fitness', 1.0, { energy: -0.15, hygiene: -0.05 }), { useSides: ['S', 'N', 'E', 'W'] }),
  reward('orrery', 'observatory', 300, 8, practice('orrery', 'creativity', 0.6, { comfort: 0.05 })),
  reward('podium', 'townhall', 200, 4, practice('speech', 'charisma', 0.5, { social: 0.1 })),
  reward('pullbar', 'club', 180, 2, practice('pullups', 'fitness', 0.5, { energy: -0.2, hygiene: -0.08 })),
  reward('knotboard', 'brigade', 160, 3, practice('knots', 'handiness', 0.5)),
];
