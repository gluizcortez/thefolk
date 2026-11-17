import type { CareerDef, CareerLevel, Needs, UniformDef, VehicleDef } from '../sim/types';

// Carreiras. Cada uma tem dez cargos: quanto paga por turno, que horas começa,
// quantas horas dura, em que dias da semana (0 = segunda), que níveis de
// habilidade e quantos amigos da família são exigidos para ser promovido até
// ele. `shiftEffects` é o que o turno faz com as necessidades a cada minuto,
// além do decaimento normal. A carona e o uniforme mudam por faixa de cargos
// (1 a 4, 5 a 7, 8 a 10). Os textos ficam em i18n: career.<id>,
// place.<id> e job.<id>.<n> (n de 1 a 10).

/** Cargos por carreira. */
export const CAREER_LEVELS = 10;

const WEEK = [0, 1, 2, 3, 4];
const WEEKEND_TOO = [2, 3, 4, 5, 6];

/** Pagamento-base por cargo; cada carreira multiplica pelo seu fator. */
const PAY = [80, 110, 150, 200, 260, 330, 420, 530, 670, 850];

/**
 * Exigências por cargo para as três habilidades da carreira (a primeira é a
 * principal) e os amigos da família. Carreiras de muita gente (`social`)
 * pedem mais amigos; as de pouca gente, menos.
 */
const MAIN = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
const SECOND = [0, 0, 1, 1, 2, 3, 4, 5, 6, 7];
const THIRD = [0, 0, 0, 1, 1, 2, 2, 3, 4, 5];
const FRIENDS = [0, 0, 0, 1, 1, 2, 3, 4, 6, 8];

/** Horário de um cargo: hora de início, horas e dias. */
type Slot = [start: number, hours: number, days: number[]];

interface CareerSeed {
  id: string;
  skills: [string, string, string];
  shiftEffects: Partial<Needs>;
  payFactor: number;
  /** multiplica os amigos exigidos */
  social: number;
  /** horários dos dez cargos (um por cargo) */
  slots: Slot[];
  vehicles: [VehicleDef, VehicleDef, VehicleDef];
  uniforms: [UniformDef, UniformDef, UniformDef];
}

function career(seed: CareerSeed): CareerDef {
  const [a, b, c] = seed.skills;
  const levels: CareerLevel[] = seed.slots.map(([startHour, hours, days], i) => {
    const requires: Record<string, number> = {};
    if (MAIN[i]) requires[a] = MAIN[i];
    if (SECOND[i]) requires[b] = SECOND[i];
    if (THIRD[i]) requires[c] = THIRD[i];
    return {
      title: `job.${seed.id}.${i + 1}`,
      pay: Math.round((PAY[i] * seed.payFactor) / 5) * 5,
      startHour,
      hours,
      days: [...days],
      requires,
      friends: Math.round(FRIENDS[i] * seed.social),
    };
  });
  return {
    id: seed.id,
    name: `career.${seed.id}`,
    workplace: `place.${seed.id}`,
    skills: [...seed.skills],
    shiftEffects: seed.shiftEffects,
    levels,
    vehicles: seed.vehicles,
    uniforms: seed.uniforms,
  };
}

/** Repete um horário por vários cargos seguidos. */
function times(n: number, slot: Slot): Slot[] {
  return Array.from({ length: n }, () => slot);
}

const SEEDS: CareerSeed[] = [
  {
    id: 'office',
    skills: ['logic', 'charisma', 'tidiness'],
    shiftEffects: { fun: -0.06, comfort: 0.05 },
    payFactor: 1.05,
    social: 1,
    slots: [...times(4, [9, 7, WEEK]), ...times(3, [9, 8, WEEK]), ...times(3, [10, 7, WEEK])],
    vehicles: [
      { kind: 'compact', color: 0x8d9296, stripe: 0x5a5f63 },
      { kind: 'sedan', color: 0x2f4f86, stripe: 0xc9cdd0 },
      { kind: 'limo', color: 0x1a1a1f, stripe: 0xb8a060 },
    ],
    uniforms: [
      { style: 'shirt', top: 0xe8e2cf, bottom: 0x4a4a52, accent: 0x6d4a2a },
      { style: 'jacket', top: 0x5a6b7d, bottom: 0x3a3f48, accent: 0xb8352b },
      { style: 'jacket', top: 0x2a2a33, bottom: 0x22222a, accent: 0xe8b830, hat: 'top' },
    ],
  },
  {
    id: 'kitchen',
    skills: ['cooking', 'fitness', 'charisma'],
    shiftEffects: { hygiene: -0.08, energy: -0.03, hunger: 0.06 },
    payFactor: 1,
    social: 0.8,
    slots: [...times(3, [11, 6, WEEKEND_TOO]), ...times(4, [15, 7, WEEKEND_TOO]), ...times(3, [16, 6, WEEKEND_TOO])],
    vehicles: [
      { kind: 'van', color: 0xe8e4da, stripe: 0xc9382f, roof: 'sign' },
      { kind: 'wagon', color: 0x7a2a33, stripe: 0xe8e4da },
      { kind: 'sedan', color: 0x3a1a22, stripe: 0xd8c08a },
    ],
    uniforms: [
      { style: 'apron', top: 0xf2efe6, bottom: 0x3a3f48, accent: 0x6b8fb0, hat: 'band' },
      { style: 'coat', top: 0xf4f1e6, bottom: 0x2a2a33, accent: 0x2a2a33, hat: 'toque' },
      { style: 'coat', top: 0x1f1f24, bottom: 0x1f1f24, accent: 0xe8b830, hat: 'toque' },
    ],
  },
  {
    id: 'studio',
    skills: ['creativity', 'charisma', 'logic'],
    shiftEffects: { fun: 0.03, energy: -0.02 },
    payFactor: 0.95,
    social: 1.1,
    slots: [...times(3, [13, 5, [0, 1, 2, 3, 4, 5]]), ...times(4, [12, 6, WEEK]), ...times(3, [14, 5, [1, 2, 3, 4]])],
    vehicles: [
      { kind: 'compact', color: 0xe0b232, stripe: 0x2a2a33 },
      { kind: 'wagon', color: 0x2f8a86, stripe: 0xf4efdf },
      { kind: 'sport', color: 0x6b3a8e, stripe: 0xf0c040 },
    ],
    uniforms: [
      { style: 'overall', top: 0xd8d0bc, bottom: 0x4a6a8a, accent: 0xc9382f },
      { style: 'shirt', top: 0xc06a3a, bottom: 0x2a2a33, accent: 0xf0c040, hat: 'beret' },
      { style: 'jacket', top: 0x6b3a8e, bottom: 0x1f1f24, accent: 0xf0c040, hat: 'beret' },
    ],
  },
  {
    id: 'clinic',
    skills: ['logic', 'tidiness', 'charisma'],
    shiftEffects: { energy: -0.03, comfort: -0.02 },
    payFactor: 1.15,
    social: 1,
    slots: [...times(3, [7, 7, WEEK]), ...times(3, [19, 8, [0, 1, 2, 3, 4, 5]]), ...times(4, [8, 8, WEEK])],
    vehicles: [
      { kind: 'compact', color: 0xf0eee8, stripe: 0x3a8a5a },
      { kind: 'van', color: 0xf4f2ec, stripe: 0xc9382f, roof: 'lights' },
      { kind: 'sedan', color: 0xc8ccd0, stripe: 0x2a5a8a },
    ],
    uniforms: [
      { style: 'shirt', top: 0x8ab8a0, bottom: 0x8ab8a0, accent: 0xf4f1e6 },
      { style: 'coat', top: 0xf4f6f4, bottom: 0x6b8fb0, accent: 0x6b8fb0 },
      { style: 'coat', top: 0xf8f8f4, bottom: 0x2a2a33, accent: 0xc9382f },
    ],
  },
  {
    id: 'workshop',
    skills: ['handiness', 'fitness', 'logic'],
    shiftEffects: { hygiene: -0.07, energy: -0.02 },
    payFactor: 0.95,
    social: 0.6,
    slots: [...times(4, [7, 8, WEEK]), ...times(3, [8, 8, WEEK]), ...times(3, [9, 7, [0, 1, 2, 3]])],
    vehicles: [
      { kind: 'pickup', color: 0xd27a2a, stripe: 0x2a2a33, roof: 'rack' },
      { kind: 'van', color: 0x4a7a4a, stripe: 0xf0c040, roof: 'rack' },
      { kind: 'pickup', color: 0x2f4f86, stripe: 0xf4efdf },
    ],
    uniforms: [
      { style: 'overall', top: 0x4a6a8a, bottom: 0x4a6a8a, accent: 0xd27a2a, hat: 'cap' },
      { style: 'overall', top: 0xd27a2a, bottom: 0x3a3f48, accent: 0xf0c040, hat: 'cap' },
      { style: 'jacket', top: 0x4a3a2a, bottom: 0x3a3f48, accent: 0xf0c040, hat: 'cap' },
    ],
  },
  {
    id: 'circus',
    skills: ['fitness', 'creativity', 'charisma'],
    shiftEffects: { fun: 0.05, energy: -0.05, hygiene: -0.04 },
    payFactor: 0.9,
    social: 1.3,
    slots: [...times(3, [14, 6, [1, 2, 3, 4, 5, 6]]), ...times(4, [16, 6, [2, 3, 4, 5, 6]]), ...times(3, [18, 5, [3, 4, 5, 6]])],
    vehicles: [
      { kind: 'minibus', color: 0xc9382f, stripe: 0xf0c040, roof: 'horn' },
      { kind: 'van', color: 0xf0c040, stripe: 0xc9382f, roof: 'horn' },
      { kind: 'limo', color: 0xf4efdf, stripe: 0xc9382f },
    ],
    uniforms: [
      { style: 'apron', top: 0xc9382f, bottom: 0xf4efdf, accent: 0xf0c040, hat: 'cap' },
      { style: 'track', top: 0x2f8a86, bottom: 0x2f8a86, accent: 0xf0c040 },
      { style: 'sash', top: 0xc9382f, bottom: 0xf4efdf, accent: 0xe8b830, hat: 'top' },
    ],
  },
  {
    id: 'observatory',
    skills: ['logic', 'creativity', 'handiness'],
    shiftEffects: { comfort: 0.03, social: -0.04 },
    payFactor: 1.1,
    social: 0.6,
    slots: [...times(3, [10, 6, WEEK]), ...times(4, [20, 6, [0, 1, 2, 3, 4]]), ...times(3, [21, 5, [1, 2, 3, 4]])],
    vehicles: [
      { kind: 'jeep', color: 0x6b7a4a, stripe: 0x3a3a2a },
      { kind: 'wagon', color: 0x22305a, stripe: 0xd8d0bc, roof: 'rack' },
      { kind: 'sedan', color: 0x14183a, stripe: 0xe8b830 },
    ],
    uniforms: [
      { style: 'overall', top: 0x7a7a6a, bottom: 0x7a7a6a, accent: 0x3a3a2a },
      { style: 'coat', top: 0xd8d0bc, bottom: 0x22305a, accent: 0x22305a },
      { style: 'jacket', top: 0x22305a, bottom: 0x14183a, accent: 0xe8b830 },
    ],
  },
  {
    id: 'townhall',
    skills: ['charisma', 'logic', 'creativity'],
    shiftEffects: { fun: -0.02, social: 0.05 },
    payFactor: 1.1,
    social: 1.5,
    slots: [...times(3, [8, 6, [0, 1, 2, 3, 4, 5]]), ...times(4, [9, 7, WEEK]), ...times(3, [10, 6, WEEK])],
    vehicles: [
      { kind: 'compact', color: 0x3a6ab0, stripe: 0xf4efdf, roof: 'sign' },
      { kind: 'sedan', color: 0x24242c, stripe: 0x9a9fa3 },
      { kind: 'limo', color: 0x101014, stripe: 0x2f8a46, roof: 'sign' },
    ],
    uniforms: [
      { style: 'sash', top: 0xf4efdf, bottom: 0x3a3f48, accent: 0x3a6ab0, hat: 'cap' },
      { style: 'jacket', top: 0x3a3f58, bottom: 0x2a2a33, accent: 0x3a6ab0 },
      { style: 'sash', top: 0x1f1f2a, bottom: 0x1f1f2a, accent: 0x2f8a46 },
    ],
  },
  {
    id: 'club',
    skills: ['fitness', 'charisma', 'tidiness'],
    shiftEffects: { energy: -0.06, hygiene: -0.08, fun: 0.04 },
    payFactor: 1,
    social: 1.2,
    slots: [...times(3, [8, 5, [1, 2, 3, 4, 5]]), ...times(4, [9, 5, [1, 2, 3, 4, 6]]), ...times(3, [13, 5, [2, 3, 5, 6]])],
    vehicles: [
      { kind: 'minibus', color: 0x2f7a3a, stripe: 0xf4efdf },
      { kind: 'van', color: 0x2f7a3a, stripe: 0xf0c040 },
      { kind: 'sport', color: 0xc9382f, stripe: 0xf4efdf },
    ],
    uniforms: [
      { style: 'track', top: 0x2f7a3a, bottom: 0x2f7a3a, accent: 0xf4efdf },
      { style: 'track', top: 0xf4efdf, bottom: 0x2f7a3a, accent: 0x2f7a3a, hat: 'band' },
      { style: 'track', top: 0xf0c040, bottom: 0x2f7a3a, accent: 0x2f7a3a, hat: 'band' },
    ],
  },
  {
    id: 'brigade',
    skills: ['fitness', 'handiness', 'logic'],
    shiftEffects: { energy: -0.05, hygiene: -0.06, comfort: -0.02 },
    payFactor: 1.05,
    social: 0.9,
    slots: [...times(3, [6, 8, [0, 2, 4, 6]]), ...times(4, [7, 9, [0, 1, 3, 5]]), ...times(3, [8, 8, [0, 2, 4]])],
    vehicles: [
      { kind: 'jeep', color: 0xb8302a, stripe: 0xf4efdf, roof: 'lights' },
      { kind: 'truck', color: 0xc9382f, stripe: 0xf4efdf, roof: 'ladder' },
      { kind: 'truck', color: 0xc9382f, stripe: 0xe8b830, roof: 'lights' },
    ],
    uniforms: [
      { style: 'overall', top: 0x5a4a2a, bottom: 0x5a4a2a, accent: 0xf0c040, hat: 'cap' },
      { style: 'jacket', top: 0x2a2a33, bottom: 0x2a2a33, accent: 0xf0c040, hat: 'helmet' },
      { style: 'jacket', top: 0x8a2a24, bottom: 0x2a2a33, accent: 0xe8b830, hat: 'helmet' },
    ],
  },
];

export const CAREERS: Record<string, CareerDef> = Object.fromEntries(SEEDS.map((s) => [s.id, career(s)]));
