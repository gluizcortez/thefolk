import type { WorkChoiceDef, WorkEventDef, WorkOutcome } from '../sim/types';

// Acontecimentos do expediente. Cada um tem um texto, um ator (o chefe, um
// colega ou ninguém) e escolhas. Uma escolha pode ter teste de sorte
// (`check`), com resultado de sucesso e de fracasso. Os textos ficam em i18n
// com as chaves geradas abaixo: wev.<id>, wev.<id>.c<n>, wev.<id>.c<n>.ok e
// wev.<id>.c<n>.fail.
//
// Em `xp`, o id 'career' quer dizer "a primeira habilidade da carreira".
// `news` cria uma notícia sobre o folk (ou sobre o ator, com `newsAboutActor`).
// `romantic` trata o resultado como um gesto romântico (ciúme e traição valem).

type ChoiceSeed = Omit<WorkChoiceDef, 'label' | 'success' | 'fail'> & {
  success: Omit<WorkOutcome, 'text'>;
  fail?: Omit<WorkOutcome, 'text'>;
};
type EventSeed = Omit<WorkEventDef, 'text' | 'choices'> & { choices: ChoiceSeed[] };

function ev(seed: EventSeed): WorkEventDef {
  return {
    ...seed,
    text: `wev.${seed.id}`,
    choices: seed.choices.map((c, i) => {
      const key = `wev.${seed.id}.c${i + 1}`;
      return {
        ...c,
        label: key,
        success: { ...c.success, text: `${key}.ok` },
        fail: c.fail ? { ...c.fail, text: `${key}.fail` } : undefined,
      };
    }),
  };
}

const list: WorkEventDef[] = [
  ev({
    id: 'deadline',
    actor: 'none',
    choices: [
      {
        traits: { ambicioso: 1 },
        check: { base: 0.55, mood: true },
        success: { performance: 8, needs: { energy: -15 } },
        fail: { performance: 2, needs: { energy: -20, comfort: -10 } },
      },
      { traits: { caseiro: 0.8, brincalhao: 0.8 }, success: { performance: 1 } },
    ],
  }),
  ev({
    id: 'stayLate',
    actor: 'boss',
    choices: [
      {
        traits: { ambicioso: 1, gentil: 0.5 },
        success: { performance: 6, actor: { respect: 6 }, needs: { energy: -18, fun: -10 }, memory: { actor: 'helpedOut' } },
      },
      {
        traits: { caseiro: 1, esquentado: 0.5 },
        check: { skill: 'charisma', base: 0.45, perLevel: 0.07 },
        success: {},
        fail: { performance: -3, actor: { respect: -6 } },
      },
    ],
  }),
  ev({
    id: 'creditThief',
    actor: 'coworker',
    requires: { friendshipBelow: 30 },
    choices: [
      {
        traits: { ambicioso: 1, esquentado: 1 },
        check: { skill: 'charisma', base: 0.45, perLevel: 0.06 },
        success: { boss: { respect: 8 }, actor: { friendship: -10 }, self: { friendship: -8 }, memory: { self: 'tookCredit' }, news: 'tookCredit', newsAboutActor: true },
        fail: { performance: -4, boss: { respect: -6 }, actor: { friendship: -8 }, self: { friendship: -6 }, memory: { self: 'tookCredit' } },
      },
      { traits: { gentil: 1, reservado: 1 }, success: { needs: { comfort: -10 }, self: { friendship: -6 }, memory: { self: 'tookCredit' } } },
      { traits: { esquentado: 0.8 }, success: { actor: { friendship: -4, respect: 5 }, self: { friendship: -3 } } },
    ],
  }),
  ev({
    id: 'swamped',
    actor: 'coworker',
    choices: [
      {
        traits: { gentil: 1.5, tagarela: 0.5 },
        success: { performance: -1, actor: { friendship: 10, respect: 4 }, self: { friendship: 3 }, needs: { energy: -10 }, memory: { actor: 'coveredForMe' }, news: 'kindness' },
      },
      { traits: { reservado: 0.6, ambicioso: 0.6 }, success: { performance: 2, actor: { friendship: -5 } } },
    ],
  }),
  ev({
    id: 'lunch',
    actor: 'coworker',
    requires: { friendshipAbove: -10 },
    choices: [
      { traits: { tagarela: 1, guloso: 1, brincalhao: 0.5 }, success: { needs: { social: 25, fun: 10, hunger: 15 }, actor: { friendship: 8 }, self: { friendship: 8 } } },
      { traits: { ambicioso: 1, reservado: 1 }, success: { performance: 3, actor: { friendship: -2 } } },
    ],
  }),
  ev({
    id: 'gossipCircle',
    actor: 'coworker',
    choices: [
      {
        traits: { tagarela: 1.5, fofoqueiro: 2, brincalhao: 0.5 },
        check: { base: 0.7 },
        success: { needs: { fun: 15, social: 10 }, actor: { friendship: 6 }, self: { friendship: 4 } },
        fail: { needs: { fun: 5 }, actor: { friendship: 4 }, boss: { respect: -10 }, performance: -5, news: 'workSlacker' },
      },
      { traits: { ambicioso: 1, gentil: 0.5, reservado: 0.5 }, success: { actor: { friendship: -3 }, boss: { respect: 2 } } },
    ],
  }),
  ev({
    id: 'presentation',
    actor: 'boss',
    minLevel: 1,
    choices: [
      {
        traits: { ambicioso: 1, tagarela: 0.5, reservado: -0.5 },
        check: { skill: 'charisma', base: 0.35, perLevel: 0.08, mood: true },
        success: { performance: 12, actor: { respect: 8 }, xp: { id: 'charisma', amount: 30 }, news: 'workHero' },
        fail: { performance: -6, actor: { respect: -4 }, needs: { comfort: -12 } },
      },
      { traits: { reservado: 1, caseiro: 0.5 }, success: { performance: -2, actor: { respect: -3 } } },
    ],
  }),
  ev({
    id: 'mistake',
    actor: 'none',
    choices: [
      { traits: { gentil: 1 }, success: { performance: -3, boss: { respect: 4 } } },
      {
        traits: { ambicioso: 0.5 },
        check: { skill: 'career', base: 0.5, perLevel: 0.06 },
        success: { performance: 2 },
        fail: { performance: -10, boss: { respect: -8 }, news: 'workSlacker' },
      },
      {
        traits: { brincalhao: 1 },
        check: { base: 0.5 },
        success: {},
        fail: { performance: -12, boss: { respect: -10 }, news: 'workSlacker' },
      },
    ],
  }),
  ev({
    id: 'rush',
    actor: 'none',
    careers: ['kitchen'],
    weight: 1.5,
    choices: [
      {
        traits: { ambicioso: 1, agitado: 1 },
        check: { skill: 'cooking', base: 0.4, perLevel: 0.07, mood: true },
        success: { performance: 10, needs: { energy: -15, hygiene: -10 }, news: 'workHero', boss: { respect: 4 } },
        fail: { performance: -5, needs: { hygiene: -15, comfort: -10 } },
      },
      { traits: { gentil: 0.5, caseiro: 0.5 }, success: { performance: 2, coworkers: { friendship: 2 } } },
    ],
  }),
  ev({
    id: 'critic',
    actor: 'none',
    careers: ['kitchen'],
    minLevel: 2,
    choices: [
      {
        traits: { ambicioso: 1, agitado: 0.5 },
        check: { skill: 'cooking', base: 0.3, perLevel: 0.08 },
        success: { performance: 15, xp: { id: 'cooking', amount: 30 }, news: 'workHero', boss: { respect: 6 } },
        fail: { performance: -8, boss: { respect: -4 } },
      },
      { traits: { caseiro: 1, reservado: 0.5 }, success: { performance: 3 } },
    ],
  }),
  ev({
    id: 'inspection',
    actor: 'none',
    careers: ['office'],
    weight: 1.5,
    choices: [
      {
        traits: { ambicioso: 1, reservado: 0.5 },
        check: { skill: 'logic', base: 0.4, perLevel: 0.07 },
        success: { performance: 9, boss: { respect: 4 } },
        fail: { performance: -6 },
      },
      {
        traits: { tagarela: 1, brincalhao: 0.5 },
        check: { skill: 'charisma', base: 0.35, perLevel: 0.08 },
        success: { performance: 6, needs: { fun: 5 } },
        fail: { performance: -8, boss: { respect: -4 } },
      },
    ],
  }),
  ev({
    id: 'clientChange',
    actor: 'none',
    careers: ['studio'],
    weight: 1.5,
    choices: [
      {
        traits: { gentil: 0.5, caseiro: 0.5 },
        check: { skill: 'creativity', base: 0.5, perLevel: 0.06 },
        success: { performance: 5, needs: { energy: -15 } },
        fail: { performance: -2, needs: { energy: -15, fun: -10 } },
      },
      {
        traits: { esquentado: 1, ambicioso: 0.5 },
        check: { skill: 'charisma', base: 0.35, perLevel: 0.07 },
        success: { performance: 4 },
        fail: { performance: -7, boss: { respect: -3 } },
      },
    ],
  }),
  ev({
    id: 'quietAfternoon',
    actor: 'none',
    careers: ['studio', 'office'],
    choices: [
      { traits: { ambicioso: 1, reservado: 0.5 }, success: { xp: { id: 'career', amount: 40 }, needs: { fun: 5 } } },
      { traits: { tagarela: 1, brincalhao: 1 }, success: { coworkers: { friendship: 3 }, needs: { fun: 15, social: 15 } } },
    ],
  }),
  ev({
    id: 'charmed',
    actor: 'coworker',
    requires: { friendshipAbove: 25 },
    weight: 0.6,
    choices: [
      { traits: { romantico: 1.5, brincalhao: 0.5 }, success: { actor: { romance: 8 }, self: { romance: 6 }, needs: { fun: 10 }, romantic: true } },
      { traits: { reservado: 1, ambicioso: 0.5 }, success: { actor: { romance: -2, respect: 2 } } },
    ],
  }),
  ev({
    id: 'mentor',
    actor: 'boss',
    weight: 0.7,
    choices: [
      { traits: { ambicioso: 1, gentil: 0.5 }, success: { xp: { id: 'career', amount: 45 }, actor: { respect: 3 }, self: { respect: 4 }, memory: { self: 'mentoredMe' } } },
      { traits: { reservado: 0.8, esquentado: 0.5 }, success: { actor: { respect: -2 } } },
    ],
  }),
  ev({
    id: 'bossMood',
    actor: 'boss',
    choices: [
      {
        traits: { gentil: 1, tagarela: 0.5 },
        check: { skill: 'charisma', base: 0.5, perLevel: 0.06 },
        success: { actor: { friendship: 6, respect: 3 }, memory: { actor: 'cheeredUp' } },
        fail: { actor: { friendship: -3 } },
      },
      { traits: { reservado: 1, caseiro: 0.5 }, success: {} },
      { traits: { esquentado: 1 }, success: { actor: { respect: -8, friendship: -6 }, performance: -4, memory: { actor: 'insulted' } } },
    ],
  }),
];

export const WORK_EVENTS: Record<string, WorkEventDef> = Object.fromEntries(list.map((e) => [e.id, e]));
