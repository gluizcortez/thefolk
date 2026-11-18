// Plano 2, bloco 6: atividades a fundo I. Como o motor de atividades do
// bloco 4, isto acrescenta etapas e interações aos objetos que já existiam,
// sem mexer em cada definição:
//
// - fogão: um "cozinhar" por prato da casa (que vira geladeira, bancada,
//   fogão e travessa) e as etapas escondidas de picar, mexer e servir;
// - geladeira: pegar os ingredientes; bancada e mesa: picar, receber a
//   travessa e comer a porção servida;
// - pia: lavar a louça empilhada, lavar as mãos, escovar os dentes e se
//   arrumar no espelho do banheiro;
// - privada: levantar a tampa, dar descarga e lavar as mãos;
// - chuveiro: tirar a roupa, ensaboar, enxaguar e secar com a toalha;
// - cama: virar no sono, arrumar a cama desfeita; sofá: cochilar deitado.

import type { InteractionDef, ObjectDef } from '../sim/types';
import { FETCH_MINUTES, HOME_DISHES, PLATE_UP_MINUTES } from '../sim/kitchen';

/** Um "cozinhar" por prato; as etapas de verdade vêm em sim (CookJob). */
function cookDishes(xp: number): InteractionDef[] {
  return HOME_DISHES.map((d) => ({
    id: `cook_${d.id}`,
    label: `act.cook.${d.id}`,
    cook: d.id,
    kids: 'no',
    duration: FETCH_MINUTES + d.prep + d.cook + PLATE_UP_MINUTES,
    effects: {},
    autonomous: false,
    portions: 1,
    residentOnly: true,
    skill: { id: 'cooking', xpPerMinute: xp },
  }));
}

/** Etapa escondida do cozinhar (a duração de verdade vem do prato). */
const step = (id: string, s: InteractionDef['step'], hold: InteractionDef['hold'], anim: string, extra: Partial<InteractionDef> = {}): InteractionDef => ({
  id,
  label: `act.step.${id}`,
  duration: 999,
  effects: {},
  hidden: true,
  step: s,
  hold,
  anim,
  kids: 'no',
  residentOnly: true,
  ...extra,
});

const fetchFood = () => step('fetchFood', 'fetch', 'groceries', 'fetch');
const prep = () => step('prep', 'prep', 'knife', 'chop', { skill: { id: 'cooking', xpPerMinute: 0.4 } });
const stir = (xp: number) => step('stir', 'stir', 'spoon', 'stir', { skill: { id: 'cooking', xpPerMinute: xp }, effects: { fun: 0.05 } });
const plateUp = () => step('plateUp', 'plateUp', 'pot', 'serve');

/** Comer a porção que trouxe da travessa (a fome por minuto vem do prato). */
export const eatServed = (): InteractionDef => ({
  id: 'eatServed',
  label: 'act.eatServed',
  duration: 50,
  effects: { hunger: 2.6, energy: -0.02 },
  until: 'hunger',
  atTable: true,
  hidden: true,
  served: true,
  hold: 'fork',
  anim: 'eat',
  // o prato é de verdade: sempre sobra para alguém levar à pia
  leaves: { kind: 'plate', chance: 1 },
  trash: 4,
});

const washUp = (): InteractionDef => ({
  id: 'washUp',
  label: 'act.washUp',
  duration: 60,
  effects: { hygiene: -0.05, fun: -0.02 },
  care: 'washUp',
  hold: 'sponge',
  anim: 'washUp',
  skill: { id: 'tidiness', xpPerMinute: 0.7 },
});

const washHands = (): InteractionDef => ({
  id: 'washHands',
  label: 'act.washHands',
  duration: 2,
  effects: { hygiene: 2 },
  hidden: true,
  anim: 'washHands',
});

const brushTeeth = (): InteractionDef => ({
  id: 'brushTeeth',
  label: 'act.brushTeeth',
  duration: 4,
  effects: { hygiene: 2.2, comfort: 0.2 },
  hold: 'toothbrush',
  anim: 'brush',
  autonomous: false,
});

const groom = (): InteractionDef => ({
  id: 'groom',
  label: 'act.groom',
  duration: 8,
  effects: { hygiene: 0.6, fun: 0.4, social: 0.1 },
  hold: 'comb',
  anim: 'groom',
  autonomous: false,
  skill: { id: 'charisma', xpPerMinute: 0.25 },
});

const makeBed = (): InteractionDef => ({
  id: 'makeBed',
  label: 'act.makeBed',
  duration: 3,
  effects: { fun: -0.02 },
  care: 'makeBed',
  anim: 'makeBed',
  skill: { id: 'tidiness', xpPerMinute: 0.5 },
});

/** Cochilo deitado no sofá (pega o sofá inteiro). */
const napCouch = (): InteractionDef => ({
  id: 'napCouch',
  label: 'act.napCouch',
  duration: 90,
  effects: { energy: 0.16, comfort: 0.35 },
  until: 'energy',
  decayScale: 0.6,
  autonomous: false,
  residentOnly: true,
  pose: 'lie',
  onObject: true,
});

export function withChores(def: ObjectDef): ObjectDef {
  const its = def.interactions;
  const has = (id: string) => its.some((i) => i.id === id);
  const add = (...more: InteractionDef[]): ObjectDef => ({ ...def, interactions: [...its, ...more.filter((m) => !has(m.id))] });
  // fogão: o cozinhar antigo (cozinha e come) vira um por prato
  const cook = its.find((i) => i.id === 'cook');
  if (cook) {
    const xp = cook.skill?.xpPerMinute ?? 1.2;
    const rest = its.filter((i) => i.id !== 'cook');
    return { ...def, interactions: [...cookDishes(xp * 0.3), ...rest, prep(), stir(xp), plateUp(), eatServed()] };
  }
  if (def.line === 'fridge' || has('meal')) return add(fetchFood());
  if (def.art === 'counter') return add(prep(), plateUp(), eatServed());
  if (def.category === 'surfaces' && (def.line === 'table' || def.dining)) return add(plateUp(), eatServed());
  // pias: a da cozinha lava a louça; a do banheiro também escova e arruma
  if (its.some((i) => i.care === 'dishes')) {
    const bath = def.room === 'bath';
    return add(washUp(), washHands(), ...(bath ? [brushTeeth(), groom()] : []));
  }
  if (def.line === 'toilet' || its.some((i) => i.id === 'use' && (i.effects.bladder ?? 0) > 0)) {
    return {
      ...def,
      interactions: its.map((i) =>
        (i.effects.bladder ?? 0) > 0
          ? { ...i, stages: { enter: { minutes: 1, anim: 'lidUp' }, exit: { minutes: 1, anim: 'flush' } }, after: 'washHands' as const }
          : i,
      ),
    };
  }
  if (def.line === 'shower' || has('shower')) {
    return {
      ...def,
      interactions: its.map((i) =>
        i.id === 'shower'
          ? {
              ...i,
              anim: 'soap',
              hold: 'sponge',
              phases: [
                { at: 0, anim: 'undress' },
                { at: 2, anim: 'soap', hold: 'sponge' as const },
                { at: 9, anim: 'rinse' },
              ],
              stages: { exit: { minutes: 2, anim: 'towel', hold: 'towel' as const } },
            }
          : i,
      ),
    };
  }
  if (def.category === 'beds' || def.line === 'bed') return add(makeBed());
  if (def.line === 'sofa' && its.some((i) => i.pose === 'sit' && i.onObject)) return add(napCouch());
  if (def.art === 'mirror') return { ...def, interactions: [...its.map((i) => (i.id === 'practice' ? { ...i, anim: 'talk' } : i)), ...(has('groom') ? [] : [groom()])] };
  return def;
}
