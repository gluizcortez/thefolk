import type { CareerDef } from '../sim/types';

// Carreiras. Cada nível é um cargo: quanto paga por turno, que horas começa,
// quantas horas dura, em que dias da semana (0 = segunda) e que níveis de
// habilidade são exigidos para ser promovido até ele. `shiftEffects` é o que o
// turno faz com as necessidades a cada minuto, além do decaimento normal.
// Para criar uma carreira, adicione uma entrada aqui e os textos em i18n.
const WEEKDAYS = [0, 1, 2, 3, 4];

export const CAREERS: Record<string, CareerDef> = {
  office: {
    id: 'office',
    name: 'career.office',
    workplace: 'place.office',
    skills: ['logic', 'charisma'],
    shiftEffects: { fun: -0.06, comfort: 0.05 },
    levels: [
      { title: 'job.office.1', pay: 95, startHour: 9, hours: 7, days: WEEKDAYS, requires: {} },
      { title: 'job.office.2', pay: 135, startHour: 9, hours: 7, days: WEEKDAYS, requires: { logic: 2 } },
      { title: 'job.office.3', pay: 190, startHour: 9, hours: 7, days: WEEKDAYS, requires: { logic: 3, charisma: 2 } },
      { title: 'job.office.4', pay: 270, startHour: 9, hours: 8, days: WEEKDAYS, requires: { logic: 5, charisma: 4 } },
      { title: 'job.office.5', pay: 390, startHour: 10, hours: 7, days: WEEKDAYS, requires: { logic: 7, charisma: 6 } },
    ],
  },
  kitchen: {
    id: 'kitchen',
    name: 'career.kitchen',
    workplace: 'place.kitchen',
    skills: ['cooking', 'fitness'],
    shiftEffects: { hygiene: -0.08, energy: -0.03, hunger: 0.06 },
    levels: [
      { title: 'job.kitchen.1', pay: 90, startHour: 11, hours: 6, days: [2, 3, 4, 5, 6], requires: {} },
      { title: 'job.kitchen.2', pay: 125, startHour: 11, hours: 6, days: [2, 3, 4, 5, 6], requires: { cooking: 2 } },
      { title: 'job.kitchen.3', pay: 180, startHour: 15, hours: 7, days: [2, 3, 4, 5, 6], requires: { cooking: 4, fitness: 1 } },
      { title: 'job.kitchen.4', pay: 260, startHour: 15, hours: 7, days: [2, 3, 4, 5, 6], requires: { cooking: 6, fitness: 3 } },
      { title: 'job.kitchen.5', pay: 380, startHour: 16, hours: 6, days: [2, 3, 4, 5, 6], requires: { cooking: 8, fitness: 4, charisma: 3 } },
    ],
  },
  studio: {
    id: 'studio',
    name: 'career.studio',
    workplace: 'place.studio',
    skills: ['creativity', 'charisma'],
    shiftEffects: { fun: 0.03, energy: -0.02 },
    levels: [
      { title: 'job.studio.1', pay: 80, startHour: 13, hours: 5, days: [0, 1, 2, 3, 4, 5], requires: {} },
      { title: 'job.studio.2', pay: 115, startHour: 13, hours: 5, days: [0, 1, 2, 3, 4, 5], requires: { creativity: 2 } },
      { title: 'job.studio.3', pay: 165, startHour: 12, hours: 6, days: [0, 1, 2, 3, 4], requires: { creativity: 4, charisma: 1 } },
      { title: 'job.studio.4', pay: 250, startHour: 12, hours: 6, days: [0, 1, 2, 3, 4], requires: { creativity: 6, charisma: 3 } },
      { title: 'job.studio.5', pay: 400, startHour: 14, hours: 5, days: [1, 2, 3, 4], requires: { creativity: 8, charisma: 5 } },
    ],
  },
};
