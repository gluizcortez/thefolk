// Plano 2, bloco 4: o que o motor de atividades acrescenta aos objetos que
// já existiam. Em vez de mexer em cada definição, a TV, o som e a lareira
// ganham aqui as interações de assistir/ouvir/olhar sentado, os canais e a
// área de visão; os assentos ganham lugares sozinhos (veja sim/activity.ts).

import type { InteractionDef, ObjectDef } from '../sim/types';
import { CHANNELS } from '../sim/activity';

/** Uma interação por canal: liga (ou troca) e assiste. */
function channels(base: InteractionDef): InteractionDef[] {
  return CHANNELS.map((c) => ({
    ...base,
    id: `watch_${c.id}`,
    label: `act.watchChannel.${c.id}`,
    channel: c.id,
    autonomous: false,
  }));
}

const tvOff = (): InteractionDef => ({ id: 'tvOff', label: 'act.tvOff', duration: 1, effects: {}, channel: 'off', watch: true, autonomous: false });

const listen = (fun: number): InteractionDef => ({
  id: 'listenMusic',
  label: 'act.listenMusic',
  duration: 60,
  effects: { fun, comfort: 0.2 },
  until: 'fun',
  watch: true,
});

const gaze: InteractionDef = {
  id: 'gaze',
  label: 'act.gaze',
  duration: 45,
  effects: { comfort: 1.0, fun: 0.5 },
  until: 'comfort',
  blaze: true,
  watch: true,
};

/** Só sentar: senta e fica sentado até a próxima ordem (sem ficar "usando"). */
const sitHere = (): InteractionDef => ({ id: 'sit', label: 'act.sit', duration: 1, effects: {}, pose: 'sit', onObject: true, autonomous: false });

export function withActivities(def: ObjectDef): ObjectDef {
  if (def.category === 'seating' && def.interactions.some((i) => i.pose === 'sit' && i.onObject) && !def.interactions.some((i) => i.id === 'sit')) {
    return { ...def, interactions: [sitHere(), ...def.interactions] };
  }
  if (def.line === 'tv') {
    const watch = def.interactions.find((i) => i.id === 'watch');
    if (!watch) return def;
    const base = { ...watch, watch: true };
    const rest = def.interactions.filter((i) => i.id !== 'watch');
    return { ...def, interactions: [base, ...channels(base), tvOff(), ...rest] };
  }
  if (def.line === 'stereo') {
    const dance = def.interactions.find((i) => i.pose === 'dance');
    const fun = Math.max(0.6, (dance?.effects.fun ?? 1) * 0.7);
    return { ...def, interactions: [...def.interactions, listen(fun)] };
  }
  if (def.hearth) {
    return { ...def, view: def.view ?? { kind: 'fire', depth: 4 }, interactions: [...def.interactions, gaze] };
  }
  return def;
}
