import type { Clip } from './clip';

// Gestos de conversa. Falar e ouvir trocam de variação de tempos em tempos,
// para a conversa não ficar com o mesmo braço subindo e descendo.

export const SOCIAL = {
  talk: {
    variants: ['talk', 'talk_both', 'talk_point', 'talk_shrug'],
    every: 4.5,
    tracks: {
      armRX: { b: -0.55, a: 0.25, f: 4 },
      armROut: 0.18,
      elbowR: { b: -1.25, a: 0.35, f: 3.1 },
      wristR: { a: 0.25, f: 4 },
      gripR: 0.08,
      armLX: -0.15,
      elbowL: { b: -0.55, a: -0.2, f: 2.3, sh: 'pos' },
      headY: { a: 0.1, f: 1.7 },
      headX: { b: -0.12, a: 0.05, f: 5 },
      torsoY: { a: 0.05, f: 4 },
    },
  },
  /** as duas mãos abertas, palmas para cima, explicando */
  talk_both: {
    tracks: {
      armLX: { b: -0.7, a: 0.15, f: 3.4 },
      armRX: { b: -0.7, a: -0.15, f: 3.4 },
      armsOut: 0.12,
      elbowL: { b: -1.1, a: 0.2, f: 3.4 },
      elbowR: { b: -1.1, a: -0.2, f: 3.4 },
      wristL: -0.35,
      wristR: -0.35,
      grips: 0.05,
      headY: { a: 0.08, f: 1.3 },
      headX: { b: -0.12, a: 0.04, f: 4.4 },
      chestX: { a: 0.03, f: 3.4 },
    },
  },
  /** aponta com o indicador, marcando o que diz */
  talk_point: {
    tracks: {
      armRX: { b: -1.05, a: 0.12, f: 5.5 },
      armROut: 0.05,
      elbowR: { b: -0.55, a: 0.15, f: 5.5 },
      gripR: 1,
      pointR: 1,
      armLX: 0.2,
      armLOut: 0.5,
      elbowL: -1.7,
      gripL: 0.6,
      headX: { b: -0.1, a: 0.06, f: 5.5 },
      torsoX: 0.05,
    },
  },
  /** encolhe os ombros com as mãos abertas */
  talk_shrug: {
    tracks: {
      shoulders: { b: 0.02, a: 0.025, f: 2.2, sh: 'pos' },
      armsX: -0.35,
      armsOut: { b: 0.3, a: 0.12, f: 2.2, sh: 'pos' },
      elbows: -1.3,
      wristL: -0.5,
      wristR: -0.5,
      grips: 0,
      headZ: { a: 0.12, f: 2.2, sh: 'pos' },
      headX: -0.16,
    },
  },
  listen: {
    variants: ['listen', 'listen_hips', 'listen_chin'],
    every: 7,
    tracks: {
      armsX: -0.35,
      armsOut: -0.28,
      elbowL: -1.65,
      elbowR: -1.55,
      grips: 0.6,
      headX: { b: -0.12, a: 0.09, f: 2.4, sh: 'pos' },
      headZ: 0.06,
    },
  },
  /** mãos na cintura, acenando com a cabeça */
  listen_hips: {
    tracks: {
      armsX: 0.25,
      armsOut: 0.55,
      elbows: -1.7,
      wristL: -0.3,
      wristR: -0.3,
      grips: 0.5,
      headX: { b: -0.1, a: 0.1, f: 2, sh: 'pos' },
      hipsSway: 0.02,
      hipsRoll: 0.04,
      kneeL: 0.12,
    },
  },
  /** um braço cruzado e a mão no queixo, pensando */
  listen_chin: {
    tracks: {
      armLX: -0.45,
      armLOut: -0.45,
      elbowL: -1.6,
      armRX: -0.65,
      armROut: -0.3,
      elbowR: -2.35,
      wristR: 0.3,
      gripR: 0.7,
      gripL: 0.5,
      headX: -0.06,
      headZ: { a: 0.08, f: 0.8 },
    },
  },
  laugh: {
    tracks: {
      torsoX: { b: 0.05, a: 0.08, f: 11, sh: 'abs' },
      headX: { b: -0.28, a: 0.1, f: 11, sh: 'abs' },
      shoulders: { a: 0.02, f: 11, sh: 'abs' },
      armsX: -0.45,
      armsOut: -0.1,
      elbows: -1.25,
      grips: 0.5,
      hipsY: { b: 0.9, a: -0.015, f: 11, sh: 'abs' },
    },
  },
  wave: {
    tracks: {
      armRX: -2.7,
      armROut: { b: 0.25, a: 0.3, f: 9 },
      elbowR: -0.35,
      wristR: { a: 0.25, f: 9 },
      gripR: 0,
      armLX: 0.05,
      headZ: 0.08,
    },
  },
  hug: {
    tracks: {
      torsoX: 0.12,
      armsX: -1.35,
      armsOut: -0.45,
      elbows: -0.75,
      grips: 0.2,
      headX: 0,
      headZ: 0.18,
      torsoZ: { a: 0.03, f: 1.5 },
    },
  },
  kiss: {
    tracks: {
      torsoX: 0.2,
      headX: 0.02,
      headZ: 0.22,
      armsX: -0.85,
      armsOut: -0.3,
      elbows: -0.65,
      grips: 0.25,
    },
  },
  /** aponta o dedo com uma mão, a outra na cintura */
  argue: {
    tracks: {
      armRX: { b: -1.2, a: 0.4, f: 7 },
      armROut: 0.1,
      elbowR: { b: -0.35, a: 0.25, f: 7 },
      gripR: 1,
      pointR: 1,
      armLX: 0.25,
      armLOut: 0.55,
      elbowL: -1.7,
      gripL: 0.8,
      torsoX: 0.1,
      headY: { a: 0.12, f: 5.3 },
      headX: -0.06,
    },
  },
  /** braços cruzados na frente do peito e a cabeça dizendo que não */
  refuse: {
    tracks: {
      armsX: -1.1,
      armsOut: -0.5,
      elbows: -1.9,
      grips: 0.7,
      headY: { a: 0.42, f: 9 },
      headX: -0.17,
      torsoX: -0.06,
    },
  },
  /** os dois braços para cima, punhos fechados, num pulinho */
  cheer: {
    tracks: {
      armsX: -2.8,
      armsOut: { b: 0.35, a: 0.15, f: 8, sh: 'pos' },
      elbows: -0.2,
      grips: 1,
      hipsY: { b: 0.9, a: 0.05, f: 8, sh: 'pos' },
      headX: -0.25,
    },
  },
} satisfies Record<string, Clip>;
