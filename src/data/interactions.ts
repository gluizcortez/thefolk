import type { InteractionDef } from '../sim/types';

// ---------- bloco 3: interruptor e quadros ----------
// Acender e apagar só aparecem quando fazem sentido (veja sim/upkeep.ts).
export const lightOn = (): InteractionDef => ({ id: 'lightOn', label: 'act.lightOn', duration: 1, effects: {}, light: 'on', autonomous: false });
export const lightOff = (): InteractionDef => ({ id: 'lightOff', label: 'act.lightOff', duration: 1, effects: {}, light: 'off', autonomous: false });
/** parar um pouco diante do quadro: diverte pouco, mas quem é criativo aprende */
export const admire = (fun: number): InteractionDef => ({
  id: 'admire',
  label: 'act.admire',
  duration: 15,
  effects: { fun },
  until: 'fun',
  autoBelow: 60,
  skill: { id: 'creativity', xpPerMinute: 0.2 },
});

// ---------- bloco 7: botão do som ----------
// Ligar põe a estação preferida de quem ligou; trocar passa para a próxima.
export const tuneOn = (): InteractionDef => ({ id: 'tuneOn', label: 'act.tuneOn', duration: 1, effects: {}, tune: 'on', autonomous: false });
export const tuneNext = (): InteractionDef => ({ id: 'tuneNext', label: 'act.tuneNext', duration: 1, effects: {}, tune: 'next', autonomous: false });
export const tuneOff = (): InteractionDef => ({ id: 'tuneOff', label: 'act.tuneOff', duration: 1, effects: {}, tune: 'off', autonomous: false });
/** os três botões, para pôr em todo objeto de som */
export const tuning = (): InteractionDef[] => [tuneOn(), tuneNext(), tuneOff()];

// ---------- bloco 1: cuidados com a casa ----------
// Interações de cuidado só aparecem quando há o que fazer (sujeira, objeto
// quebrado, desgaste, lixeira com lixo). Veja sim/upkeep.ts.
export const clean = (): InteractionDef => ({
  id: 'clean',
  label: 'act.clean',
  duration: 60,
  effects: { hygiene: -0.06, fun: -0.03 },
  care: 'clean',
  hold: 'rag',
  skill: { id: 'tidiness', xpPerMinute: 0.8 },
});
export const repair = (): InteractionDef => ({
  id: 'repair',
  label: 'act.repair',
  duration: 180,
  effects: { hygiene: -0.05, fun: -0.02 },
  care: 'repair',
  skill: { id: 'handiness', xpPerMinute: 1 },
});
export const service = (): InteractionDef => ({
  id: 'service',
  label: 'act.service',
  duration: 60,
  effects: { fun: 0.05 },
  care: 'service',
  autonomous: false,
  skill: { id: 'handiness', xpPerMinute: 0.8 },
});
export const dishes = (): InteractionDef => ({
  id: 'dishes',
  label: 'act.dishes',
  duration: 2,
  hold: 'dirtyPlate',
  effects: { hygiene: -0.1 },
  care: 'dishes',
  hidden: true,
  skill: { id: 'tidiness', xpPerMinute: 0.6 },
});

