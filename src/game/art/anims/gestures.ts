import type { Clip } from './clip';

// Gestos de quem está parado esperando ordem (plano 2, bloco 1; a escolha
// mora em sim/pace.ts) e o parado de sempre, com o peso trocando de perna.

export const GESTURES = {
  idle: {
    tracks: {
      torsoZ: { a: 0.025, f: 0.7 },
      headY: { a: 0.15, f: 0.45 },
      armLX: { a: 0.03, f: 1.8 },
      armRX: { a: -0.03, f: 1.8 },
      hipsSway: { a: 0.012, f: 0.35 },
      hipsRoll: { a: 0.025, f: 0.35 },
      kneeL: { b: 0.02, a: 0.08, f: 0.35, sh: 'neg' },
      kneeR: { b: 0.02, a: 0.08, f: 0.35, sh: 'pos' },
    },
  },
  /** olha em volta devagar, o corpo acompanhando um pouco */
  g_look: {
    tracks: {
      headY: { a: 0.6, f: 1.1 },
      neckY: { a: 0.15, f: 1.1 },
      chestY: { a: 0.1, f: 1.1, ph: -0.4 },
      spineY: { a: 0.04, f: 1.1, ph: -0.6 },
    },
  },
  /** espreguiça: braços para cima, mãos abertas, peito para trás */
  g_stretch: {
    tracks: {
      armsX: { b: -2.75, a: -0.15, f: 1.4 },
      armsOut: 0.22,
      elbows: -0.25,
      grips: 0,
      wristL: -0.5,
      wristR: -0.5,
      torsoX: { b: -0.06, a: -0.06, f: 1.4 },
      headX: { b: -0.22, a: -0.1, f: 1.4 },
      shoulders: { b: 0.02, a: 0.015, f: 1.4 },
      hipsY: { b: 0.9075, a: 0.0075, f: 1.4 },
    },
  },
  /** braços cruzados, o peso passando de uma perna para a outra */
  g_arms: {
    tracks: {
      armsX: -1.1,
      armsOut: -0.5,
      elbows: -1.9,
      grips: 0.6,
      torsoZ: { a: 0.05, f: 0.9 },
      legOut: 0.04,
      kneeL: { a: 0.18, f: 0.9, sh: 'pos' },
      kneeR: { a: 0.18, f: 0.9, sh: 'neg' },
      hipsSway: { a: 0.015, f: 0.9 },
      headY: { a: 0.2, f: 0.5 },
    },
  },
  /** coça a cabeça com a mão direita, cabeça de lado */
  g_scratch: {
    tracks: {
      armRX: -2.3,
      armROut: 0.55,
      elbowR: { b: -2.1, a: 0.25, f: 14 },
      gripR: 0.55,
      wristR: { a: 0.2, f: 14 },
      headZ: 0.14,
      headX: -0.06,
    },
  },
  /** fome: as duas mãos na barriga, corpo curvado */
  g_belly: {
    tracks: {
      armsX: -0.55,
      armsOut: -0.28,
      elbowL: { b: -1.45, a: 0.08, f: 3 },
      elbowR: { b: -1.45, a: -0.08, f: 3 },
      grips: 0.1,
      torsoX: 0.16,
      headX: 0,
    },
  },
  /** sono: a mão vai à boca e a cabeça cai para trás */
  g_yawn: {
    tracks: {
      armRX: -1.7,
      armROut: -0.25,
      elbowR: -2.3,
      gripR: 0.3,
      armLOut: 0.12,
      headX: { b: -0.26, a: -0.14, f: 1.2 },
      torsoX: { b: -0.025, a: -0.025, f: 1.2 },
      shoulders: { b: 0.015, a: 0.015, f: 1.2 },
    },
  },
  /** apertado: pernas juntas, pulinhos curtos no lugar */
  g_fidget: {
    tracks: {
      legOut: -0.03,
      kneeL: { b: 0.12, a: 0.12, f: 7, sh: 'abs' },
      kneeR: { b: 0.24, a: -0.12, f: 7, sh: 'abs' },
      hipsY: { b: 0.88, a: 0.02, f: 7, sh: 'abs' },
      armsX: -0.3,
      armsOut: -0.2,
      elbows: -0.9,
      grips: 0.8,
      torsoX: 0.08,
    },
  },
} satisfies Record<string, Clip>;
