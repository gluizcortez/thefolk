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
  // ---------- bloco 8: carreiras novas e eventos em cadeia ----------
  // Uma escolha com `chain` marca outro evento (com `chained: true`, que nunca
  // sai no sorteio) para o primeiro turno a partir de tantos dias depois.
  ev({
    id: 'loan',
    actor: 'coworker',
    requires: { friendshipAbove: 0 },
    weight: 0.7,
    choices: [
      { traits: { gentil: 1.5, tagarela: 0.3 }, success: { money: -60, actor: { friendship: 8 }, chain: { event: 'loanBack', days: 3 } } },
      { traits: { reservado: 1, ambicioso: 0.5 }, success: { actor: { friendship: -4 } } },
    ],
  }),
  ev({
    id: 'loanBack',
    actor: 'coworker',
    chained: true,
    choices: [
      {
        traits: { gentil: 1 },
        check: { base: 0.7, actorRespect: true },
        success: { money: 80, actor: { friendship: 6, respect: 4 }, self: { friendship: 6 }, memory: { self: 'helpedOut' } },
        fail: { self: { friendship: -12 }, memory: { self: 'tookCredit' }, needs: { comfort: -10 } },
      },
      { traits: { esquentado: 1 }, success: { money: 60, actor: { friendship: -6 }, self: { friendship: -2 } } },
    ],
  }),
  ev({
    id: 'secretProject',
    actor: 'boss',
    minLevel: 2,
    weight: 0.7,
    choices: [
      { traits: { ambicioso: 1.5 }, success: { needs: { energy: -12, fun: -8 }, actor: { respect: 4 }, chain: { event: 'projectReview', days: 4 } } },
      { traits: { caseiro: 1, reservado: 0.5 }, success: { actor: { respect: -2 } } },
    ],
  }),
  ev({
    id: 'projectReview',
    actor: 'boss',
    chained: true,
    choices: [
      {
        traits: { ambicioso: 1 },
        check: { skill: 'career', base: 0.35, perLevel: 0.07, mood: true },
        success: { performance: 20, actor: { respect: 12 }, news: 'workHero', xp: { id: 'career', amount: 40 } },
        fail: { performance: -10, actor: { respect: -8 } },
      },
      { traits: { gentil: 1, reservado: 0.5 }, success: { performance: 5, actor: { respect: 3 }, coworkers: { friendship: 4 } } },
    ],
  }),
  ev({
    id: 'shortcut',
    actor: 'none',
    weight: 0.7,
    choices: [
      { traits: { brincalhao: 1, desleixado: 1, ambicioso: 0.5 }, success: { performance: 7, needs: { fun: 5 }, chain: { event: 'audit', days: 5 } } },
      { traits: { caprichoso: 1.5, gentil: 0.5 }, success: { performance: 1, needs: { energy: -6 } } },
    ],
  }),
  ev({
    id: 'audit',
    actor: 'boss',
    chained: true,
    choices: [
      { traits: { gentil: 1.5 }, success: { performance: -6, actor: { respect: 2 } } },
      {
        traits: { esquentado: 0.5, ambicioso: 1 },
        check: { skill: 'charisma', base: 0.3, perLevel: 0.07, actorRespect: true },
        success: { performance: 2 },
        fail: { performance: -16, actor: { respect: -12 }, news: 'scandal' },
      },
    ],
  }),
  // posto de saúde
  ev({
    id: 'nightPatient',
    actor: 'none',
    careers: ['clinic'],
    weight: 1.4,
    choices: [
      {
        traits: { gentil: 1.5, caprichoso: 0.5 },
        check: { skill: 'logic', base: 0.45, perLevel: 0.06 },
        success: { performance: 8, needs: { energy: -10 }, chain: { event: 'thankYou', days: 3 } },
        fail: { performance: -4, needs: { energy: -12, comfort: -8 } },
      },
      { traits: { reservado: 1, caseiro: 0.5 }, success: { performance: 1 } },
    ],
  }),
  ev({
    id: 'thankYou',
    actor: 'none',
    careers: ['clinic'],
    chained: true,
    choices: [
      { traits: { gentil: 1, tagarela: 1 }, success: { needs: { fun: 15, social: 15 }, news: 'kindness', boss: { respect: 4 } } },
      { traits: { reservado: 1 }, success: { needs: { comfort: 10 }, performance: 3 } },
    ],
  }),
  ev({
    id: 'outbreak',
    actor: 'none',
    careers: ['clinic'],
    minLevel: 2,
    choices: [
      {
        traits: { ambicioso: 1, gentil: 1 },
        check: { skill: 'tidiness', base: 0.45, perLevel: 0.06 },
        success: { performance: 12, needs: { energy: -18, hygiene: -10 }, boss: { respect: 6 }, news: 'workHero' },
        fail: { performance: 2, needs: { energy: -20, hunger: -15 } },
      },
      { traits: { caseiro: 1 }, success: { performance: -3, needs: { comfort: 5 } } },
    ],
  }),
  // oficina
  ev({
    id: 'stuckBolt',
    actor: 'none',
    careers: ['workshop'],
    weight: 1.4,
    choices: [
      {
        traits: { esquentado: 1, agitado: 1 },
        check: { skill: 'fitness', base: 0.4, perLevel: 0.07 },
        success: { performance: 6, needs: { hygiene: -12 } },
        fail: { performance: -3, needs: { comfort: -15, hygiene: -10 } },
      },
      {
        traits: { caprichoso: 1, reservado: 0.5 },
        check: { skill: 'handiness', base: 0.5, perLevel: 0.06 },
        success: { performance: 8, xp: { id: 'handiness', amount: 25 } },
        fail: { performance: -2, needs: { fun: -8 } },
      },
    ],
  }),
  ev({
    id: 'oddMachine',
    actor: 'none',
    careers: ['workshop'],
    minLevel: 2,
    choices: [
      {
        traits: { brincalhao: 1, ambicioso: 0.5 },
        check: { skill: 'logic', base: 0.35, perLevel: 0.07 },
        success: { performance: 12, money: 50, news: 'workHero' },
        fail: { performance: -5, needs: { hygiene: -15, fun: 5 } },
      },
      { traits: { caseiro: 1, reservado: 1 }, success: { performance: 1 } },
    ],
  }),
  // trupe
  ev({
    id: 'fallNet',
    actor: 'coworker',
    careers: ['circus'],
    choices: [
      { traits: { gentil: 1.5, caprichoso: 1 }, success: { performance: 3, actor: { friendship: 10, respect: 6 }, memory: { actor: 'helpedOut' } } },
      {
        traits: { brincalhao: 1, agitado: 1 },
        check: { skill: 'fitness', base: 0.45, perLevel: 0.06 },
        success: { performance: 10, needs: { fun: 15 }, news: 'workHero' },
        fail: { performance: -8, needs: { comfort: -25, energy: -10 } },
      },
    ],
  }),
  ev({
    id: 'rainShow',
    actor: 'none',
    careers: ['circus'],
    weight: 1.3,
    choices: [
      {
        traits: { brincalhao: 1.5, tagarela: 1 },
        check: { skill: 'creativity', base: 0.4, perLevel: 0.07, mood: true },
        success: { performance: 10, needs: { fun: 15 }, coworkers: { friendship: 3 } },
        fail: { performance: -4, needs: { hygiene: -15, fun: -5 } },
      },
      { traits: { caseiro: 1 }, success: { performance: -1, needs: { comfort: 8 } } },
    ],
  }),
  // observatório
  ev({
    id: 'blip',
    actor: 'none',
    careers: ['observatory'],
    weight: 1.2,
    choices: [
      { traits: { ambicioso: 1, agitado: 0.5 }, success: { needs: { energy: -10 }, chain: { event: 'blipCheck', days: 3 } } },
      { traits: { reservado: 1, caseiro: 0.5 }, success: { performance: 2 } },
    ],
  }),
  ev({
    id: 'blipCheck',
    actor: 'none',
    careers: ['observatory'],
    chained: true,
    choices: [
      {
        traits: { ambicioso: 1 },
        check: { skill: 'logic', base: 0.35, perLevel: 0.07 },
        success: { performance: 18, news: 'workHero', xp: { id: 'logic', amount: 40 }, boss: { respect: 8 } },
        fail: { performance: -6, needs: { fun: -10 }, news: 'workSlacker' },
      },
      { traits: { gentil: 1, reservado: 1 }, success: { performance: 4, coworkers: { respect: 3 } } },
    ],
  }),
  ev({
    id: 'cloudy',
    actor: 'none',
    careers: ['observatory'],
    choices: [
      { traits: { reservado: 1, ambicioso: 0.5 }, success: { xp: { id: 'career', amount: 35 }, needs: { fun: -5 } } },
      { traits: { tagarela: 1, brincalhao: 1 }, success: { needs: { fun: 12, social: 12 }, coworkers: { friendship: 3 } } },
    ],
  }),
  // câmara do bairro
  ev({
    id: 'promise',
    actor: 'none',
    careers: ['townhall'],
    weight: 1.2,
    choices: [
      { traits: { tagarela: 1.5, ambicioso: 1 }, success: { performance: 8, needs: { fun: 8 }, chain: { event: 'promiseDue', days: 4 } } },
      { traits: { reservado: 1, gentil: 0.5 }, success: { performance: 2 } },
    ],
  }),
  ev({
    id: 'promiseDue',
    actor: 'none',
    careers: ['townhall'],
    chained: true,
    choices: [
      {
        traits: { ambicioso: 1, gentil: 0.5 },
        check: { skill: 'logic', base: 0.4, perLevel: 0.06 },
        success: { performance: 12, news: 'workHero', boss: { respect: 6 } },
        fail: { performance: -10, news: 'scandal' },
      },
      {
        traits: { tagarela: 1, brincalhao: 0.5 },
        check: { skill: 'charisma', base: 0.4, perLevel: 0.07 },
        success: { performance: 2 },
        fail: { performance: -12, boss: { respect: -6 }, news: 'workSlacker' },
      },
    ],
  }),
  ev({
    id: 'debate',
    actor: 'none',
    careers: ['townhall'],
    minLevel: 3,
    choices: [
      {
        traits: { ambicioso: 1, esquentado: 0.5, tagarela: 1 },
        check: { skill: 'charisma', base: 0.3, perLevel: 0.08, mood: true },
        success: { performance: 15, xp: { id: 'charisma', amount: 30 }, news: 'workHero' },
        fail: { performance: -8, needs: { comfort: -15 }, news: 'workSlacker' },
      },
      { traits: { reservado: 1 }, success: { performance: -2 } },
    ],
  }),
  // clube
  ev({
    id: 'bigMatch',
    actor: 'none',
    careers: ['club'],
    minLevel: 2,
    weight: 1.2,
    choices: [
      {
        traits: { ambicioso: 1, agitado: 1 },
        check: { skill: 'fitness', base: 0.35, perLevel: 0.07, mood: true },
        success: { performance: 15, needs: { fun: 20, energy: -15 }, news: 'workHero', coworkers: { friendship: 4 } },
        fail: { performance: -6, needs: { fun: -10, energy: -15 } },
      },
      { traits: { gentil: 1, reservado: 0.5 }, success: { performance: 3, coworkers: { friendship: 5, respect: 3 } } },
    ],
  }),
  ev({
    id: 'sprain',
    actor: 'none',
    careers: ['club', 'circus', 'brigade'],
    weight: 0.6,
    choices: [
      { traits: { caseiro: 1, reservado: 0.5 }, success: { performance: -3, needs: { comfort: 10 } } },
      {
        traits: { ambicioso: 1, esquentado: 0.5 },
        check: { skill: 'fitness', base: 0.5, perLevel: 0.05 },
        success: { performance: 6, needs: { comfort: -10 } },
        fail: { performance: -10, needs: { comfort: -30, energy: -15 } },
      },
    ],
  }),
  // brigada
  ev({
    id: 'catTree',
    actor: 'none',
    careers: ['brigade'],
    weight: 1.3,
    choices: [
      {
        traits: { gentil: 1.5, agitado: 0.5 },
        check: { skill: 'fitness', base: 0.5, perLevel: 0.05 },
        success: { performance: 6, needs: { fun: 10 }, chain: { event: 'catOwner', days: 2 } },
        fail: { performance: 1, needs: { comfort: -15, hygiene: -10 } },
      },
      { traits: { caseiro: 1, reservado: 0.5 }, success: { performance: -1 } },
    ],
  }),
  ev({
    id: 'catOwner',
    actor: 'none',
    careers: ['brigade'],
    chained: true,
    choices: [
      { traits: { guloso: 1.5, gentil: 1 }, success: { needs: { hunger: 25, fun: 10, social: 15 }, coworkers: { friendship: 4 }, news: 'kindness' } },
      { traits: { reservado: 1, ambicioso: 0.5 }, success: { performance: 4, boss: { respect: 3 } } },
    ],
  }),
  ev({
    id: 'drill',
    actor: 'boss',
    careers: ['brigade'],
    choices: [
      {
        traits: { ambicioso: 1, caprichoso: 1 },
        check: { skill: 'handiness', base: 0.4, perLevel: 0.07 },
        success: { performance: 10, actor: { respect: 8 } },
        fail: { performance: -6, actor: { respect: -5 }, needs: { comfort: -10 } },
      },
      { traits: { brincalhao: 1.5 }, check: { base: 0.5 }, success: { needs: { fun: 15 }, coworkers: { friendship: 3 } }, fail: { performance: -8, actor: { respect: -8 } } },
    ],
  }),
];

export const WORK_EVENTS: Record<string, WorkEventDef> = Object.fromEntries(list.map((e) => [e.id, e]));
