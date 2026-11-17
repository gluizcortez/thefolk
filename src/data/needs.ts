import type { NeedDef, NeedId } from '../sim/types';

// Decaimento em pontos por minuto de jogo (0 a 100).
// "ambience" não decai: ela tende ao valor do que há ao redor do folk.
export const NEEDS: Record<NeedId, NeedDef> = {
  hunger: { id: 'hunger', decayPerMinute: 0.14, moodWeight: 1.2 },
  energy: { id: 'energy', decayPerMinute: 0.075, moodWeight: 1.2 },
  hygiene: { id: 'hygiene', decayPerMinute: 0.07, moodWeight: 0.8 },
  bladder: { id: 'bladder', decayPerMinute: 0.21, moodWeight: 1.0 },
  comfort: { id: 'comfort', decayPerMinute: 0.16, moodWeight: 0.8 },
  fun: { id: 'fun', decayPerMinute: 0.14, moodWeight: 1.0 },
  social: { id: 'social', decayPerMinute: 0.083, moodWeight: 0.8 },
  ambience: { id: 'ambience', decayPerMinute: 0, moodWeight: 0.5 },
};
