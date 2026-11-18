import { C } from './clip';
import type { Clip } from './clip';

// Animações das atividades: sentar, assistir, ler, telefonar, comer, mexer
// em objetos, dormir, nadar, perigos. As que se repetem por muito tempo têm
// variações do laço (cruzar as pernas, apoiar o queixo, virar a página).

/** Pernas cruzadas sentado: a direita por cima da esquerda. */
const CROSSED = {
  hipsY: 0.1,
  legLX: -1.5,
  kneeL: 1.45,
  legLOut: 0.08,
  legRX: -1.68,
  kneeR: 1.52,
  legROut: -0.3,
  ankleR: 0.3,
} as const;

export const ACTIVITY = {
  sit: {
    ownLegs: true,
    variants: ['sit', 'sit_cross', 'sit_lean', 'sit_knees'],
    every: 11,
    tracks: {
      hipsY: 0.1,
      legsX: -1.5,
      knees: 1.45,
      legOut: 0.06,
      torsoX: -0.18,
      armsX: -0.4,
      elbows: -0.85,
      headY: { a: 0.12, f: 0.7 },
    },
  },
  /** sentado de pernas cruzadas, as mãos sobre o joelho */
  sit_cross: {
    base: 'sit',
    tracks: { ...CROSSED, armsX: -0.35, armsOut: -0.15, elbows: -0.6, torsoX: -0.05, grips: 0.4 },
  },
  /** recostado, braços abertos no encosto */
  sit_lean: {
    base: 'sit',
    tracks: { torsoX: -0.32, armsX: -0.05, armsOut: 0.4, elbows: -0.45, headX: -0.2, legOut: 0.12, ankleL: -0.2, ankleR: -0.2 },
  },
  /** para a frente, mãos nos joelhos */
  sit_knees: {
    base: 'sit',
    tracks: { torsoX: 0.25, armsX: -0.6, elbows: -0.45, headX: -0.06, grips: 0.5, headY: { a: 0.2, f: 0.5 } },
  },
  watch: {
    variants: ['watch', 'watch_lean', 'watch_chin', 'watch_cross'],
    every: 12,
    tracks: {
      armsX: -0.3,
      armsOut: -0.3,
      elbowL: -1.7,
      elbowR: -1.6,
      grips: 0.45,
      headY: { a: 0.1, f: 0.8 },
      torsoZ: { a: 0.03, f: 0.6 },
    },
  },
  /** recostado no sofá, os braços largados */
  watch_lean: {
    tracks: { torsoX: -0.22, armsX: -0.05, armsOut: 0.35, elbows: -0.5, grips: 0.3, headX: -0.18 },
    seat: { legOut: 0.14, ankleL: -0.2, ankleR: -0.2 },
  },
  /** cotovelo no joelho e o queixo na mão, vidrado na tela */
  watch_chin: {
    tracks: {
      torsoX: 0.62,
      armRX: -0.95,
      armROut: -0.2,
      elbowR: -2.45,
      wristR: 0.5,
      gripR: 0.7,
      armLX: -0.6,
      armLOut: -0.1,
      elbowL: -0.6,
      headX: -0.3,
    },
  },
  /** pernas cruzadas e braços cruzados */
  watch_cross: {
    tracks: { armsX: -0.25, armsOut: -0.5, elbows: -1.35, grips: 0.6, torsoX: -0.1, headY: { a: 0.08, f: 0.6 } },
    seat: CROSSED,
  },
  read: {
    variants: ['read', 'read_turn', 'read_close'],
    every: 9,
    tracks: {
      armsX: -0.6,
      armsOut: -0.12,
      elbows: -1.5,
      wristL: -0.3,
      wristR: -0.3,
      grips: 0.7,
      headX: 0.23,
      headY: { a: 0.08, f: 0.9 },
    },
  },
  /** vira a página com a mão direita */
  read_turn: {
    base: 'read',
    tracks: {
      armRX: { b: -0.7, a: 0.12, f: 1.7 },
      armROut: { b: -0.05, a: 0.18, f: 1.7 },
      elbowR: { b: -1.35, a: 0.2, f: 1.7 },
      gripR: 0.2,
      headY: { a: 0.12, f: 1.7 },
    },
  },
  /** livro mais perto do rosto, concentrado */
  read_close: {
    base: 'read',
    tracks: { armsX: -0.85, elbows: -1.75, headX: 0.12, torsoX: 0.08, headY: 0 },
  },
  phone: {
    variants: ['phone', 'phone_hip'],
    every: 10,
    tracks: {
      armRX: -0.55,
      armROut: 0.3,
      elbowR: -2.35,
      wristR: 0.3,
      gripR: 0.75,
      headZ: -0.14,
      headY: { a: 0.1, f: 1.3 },
      headX: { b: -0.12, a: 0.06, f: 3.1 },
      armLX: { b: -0.25, a: 0.15, f: 2.2 },
      elbowL: { b: -0.8, a: -0.3, f: 2.2 },
      gripL: 0.1,
    },
  },
  /** a outra mão na cintura, o peso numa perna só */
  phone_hip: {
    base: 'phone',
    tracks: { armLX: 0.25, armLOut: 0.55, elbowL: -1.7, gripL: 0.5, hipsSway: 0.025, hipsRoll: 0.05, kneeL: 0.15, headY: { a: 0.18, f: 0.7 } },
  },
  /** prato na mão esquerda, garfo da direita até a boca */
  eat: {
    tracks: {
      armLX: -0.6,
      armLOut: -0.1,
      elbowL: -1.25,
      gripL: 0.7,
      armRX: { b: -0.75, a: -0.5, f: 2.2, sh: 'pos' },
      armROut: -0.12,
      elbowR: { b: -1.4, a: -0.75, f: 2.2, sh: 'pos' },
      gripR: 0.8,
      headX: { b: 0, a: -0.12, f: 2.2, sh: 'pos' },
    },
  },
  reach: {
    variants: ['reach', 'reach_low'],
    every: 8,
    tracks: {
      armLX: { b: -1.15, a: 0.12, f: 5 },
      armRX: { b: -1.05, a: -0.12, f: 5 },
      elbowL: -0.45,
      elbowR: -0.55,
      wristL: -0.2,
      wristR: -0.2,
      grips: 0.6,
      torsoX: 0.12,
      headX: 0.03,
    },
  },
  /** abaixa um pouco, dobrando os joelhos */
  reach_low: {
    base: 'reach',
    tracks: {
      armLX: { b: -0.8, a: 0.1, f: 4 },
      armRX: { b: -0.75, a: -0.1, f: 4 },
      torsoX: 0.38,
      knees: 0.35,
      legsX: -0.22,
      ankleL: 0.12,
      ankleR: 0.12,
      hipsY: 0.85,
      headX: -0.1,
    },
  },
  scrub: {
    tracks: {
      armLX: { b: -2.5, a: 0.3, f: 6 },
      armRX: { b: -2.5, a: -0.3, f: 6 },
      armsOut: 0.15,
      elbowL: { b: -1.6, a: -0.3, f: 6 },
      elbowR: { b: -1.6, a: 0.3, f: 6 },
      grips: 0.8,
      torsoY: { a: 0.2, f: 3 },
      headX: -0.1,
    },
  },
  /** braço esticado apontando o controle para a TV */
  remote: {
    tracks: { armRX: -1.35, armROut: 0.05, elbowR: -0.12, gripR: 0.85, armLX: -0.3, elbowL: -0.7, headX: -0.1 },
  },
  /** a meio caminho entre de pé e sentado, mãos nos joelhos */
  perch: {
    ownLegs: true,
    tracks: {
      hipsY: 0.52,
      legsX: -0.85,
      knees: 0.95,
      legOut: 0.05,
      ankleL: 0.1,
      ankleR: 0.1,
      torsoX: 0.32,
      armsX: -0.55,
      elbows: -0.5,
      grips: 0.5,
      headX: -0.22,
    },
  },
  /** bebê no colo: braços dobrados na frente, embalando */
  cradle: {
    tracks: {
      torsoX: -0.06,
      armLX: -0.75,
      armRX: -0.55,
      armLOut: -0.2,
      armROut: -0.32,
      elbowL: -1.35,
      elbowR: -1.5,
      grips: 0.3,
      headX: 0.2,
      torsoY: { a: 0.12, f: 1.4 },
      hipsSway: { a: 0.015, f: 1.4 },
    },
  },
  dance: {
    tracks: {
      hipsY: { b: 0.87, a: 0.04, f: 8, sh: 'abs' },
      hipsSway: { a: 0.03, f: 4 },
      torsoY: { a: 0.4, f: 4 },
      torsoZ: { a: 0.1, f: 8 },
      torsoX: 0,
      armLX: { b: -2.4, a: 0.4, f: 8 },
      armRX: { b: -2.4, a: -0.4, f: 8 },
      armsOut: 0.4,
      elbowL: { b: -0.6, a: -0.3, f: 8 },
      elbowR: { b: -0.6, a: 0.3, f: 8 },
      grips: 0.6,
      legLX: { a: -0.3, f: 8, sh: 'pos' },
      kneeL: { a: 0.6, f: 8, sh: 'pos' },
      legRX: { a: -0.3, f: 8, sh: 'neg' },
      kneeR: { a: 0.6, f: 8, sh: 'neg' },
      headZ: { a: 0.12, f: 4 },
      headX: -0.05,
    },
  },
  sleep: {
    still: true,
    ownLegs: true,
    // plano 2, bloco 6: vira durante o sono (de lado, de barriga para cima)
    variants: ['sleep', 'sleep_sideR', 'sleep_back', 'sleep_sideL'],
    every: 30,
    tracks: {
      lie: 1,
      headX: 0,
      headZ: 0.1,
      armsOut: 0.14,
      elbows: -0.1,
      grips: 0.3,
      legOut: 0.04,
      chestX: { a: 0.02, f: 1.2 },
    },
  },
  collapsed: {
    still: true,
    ownLegs: true,
    tracks: { lie: 1, headX: 0, headZ: 0.4, armLOut: 0.9, armROut: 0.6, elbows: -0.1, grips: 0.1, legOut: 0.2 },
  },
  /** nado de peito: braços abrem e voltam na frente, pernas batem */
  swim: {
    still: true,
    ownLegs: true,
    tracks: {
      torsoX: 0.35,
      headX: -0.45,
      armsX: { b: -1.5, a: 0.25, f: 3.2, ph: C },
      armsOut: { b: 0.3, a: 0.55, f: 3.2, sh: 'pos' },
      elbows: { b: -0.3, a: -0.5, f: 3.2, sh: 'neg' },
      grips: 0,
      legLX: { b: 0.5, a: 0.3, f: 3.2 },
      legRX: { b: 0.5, a: -0.3, f: 3.2 },
      knees: 0.6,
      ankleL: 0.6,
      ankleR: 0.6,
      legOut: 0.12,
    },
  },
  /** na ponta da prancha: braços para cima, joelhos dobram e esticam */
  dive: {
    still: true,
    ownLegs: true,
    tracks: {
      armsX: -2.9,
      armsOut: 0.12,
      elbows: -0.05,
      grips: 0,
      knees: { len: 0.77, k: [[0, 0], [0.25, 0.7], [0.5, 0], [1, 0]] },
      legsX: { len: 0.77, k: [[0, 0], [0.25, -0.35], [0.5, 0], [1, 0]] },
      hipsY: { len: 0.77, k: [[0, 0.9], [0.25, 0.78], [0.5, 0.9], [1, 0.9]] },
      torsoX: { len: 0.77, k: [[0, 0], [0.25, 0.25], [0.5, 0], [1, 0]] },
      headX: -0.2,
    },
  },
  /** chorando: mãos no rosto, ombros sacudindo */
  cry: {
    tracks: {
      armsX: -0.95,
      armsOut: -0.22,
      elbows: -2.25,
      grips: 0.2,
      wristL: 0.3,
      wristR: 0.3,
      headX: 0.16,
      torsoX: 0.1,
      torsoZ: { a: 0.04, f: 15 },
      shoulders: { a: 0.015, f: 7.5, sh: 'abs' },
    },
  },
  /** susto: mãos nas bochechas, corpo para trás */
  gasp: {
    tracks: { armsX: -0.7, armsOut: 0.28, elbows: -2.05, grips: 0, torsoX: -0.14, headX: -0.22, shoulders: 0.03 },
  },
  /** pânico: braços sacudindo no alto, pulinhos, cabeça olhando para os lados */
  panic: {
    tracks: {
      armLX: { b: -2.6, a: 0.35, f: 14 },
      armRX: { b: -2.6, a: -0.35, f: 14 },
      armLOut: { b: 0.5, a: 0.25, f: 14 },
      armROut: { b: 0.5, a: -0.25, f: 14 },
      elbowL: { b: -0.5, a: -0.3, f: 14, sh: 'pos' },
      elbowR: { b: -0.5, a: -0.3, f: 14, sh: 'neg' },
      grips: 0,
      hipsY: { b: 0.9, a: 0.04, f: 7, sh: 'pos' },
      headY: { a: 0.5, f: 5 },
      headX: -0.3,
      shoulders: 0.03,
    },
  },
  /** extintor apontado para a frente, corpo inclinado, balanço curto */
  spray: {
    tracks: {
      armRX: { b: -1.25, a: 0.08, f: 6 },
      armLX: { b: -1.05, a: 0.08, f: 6 },
      armROut: -0.15,
      armLOut: -0.3,
      elbowR: -0.25,
      elbowL: -0.9,
      grips: 0.9,
      torsoX: 0.1,
      torsoY: { a: 0.12, f: 6 },
      legLX: -0.25,
      legRX: 0.2,
    },
  },
  /** lanterna erguida na direita, livro aberto na esquerda */
  lantern: {
    tracks: {
      armRX: -1.7,
      armROut: 0.15,
      elbowR: -0.3,
      gripR: 0.8,
      armLX: -0.7,
      elbowL: -1.2,
      armLOut: -0.2,
      headX: { b: -0.05, a: 0.05, f: 0.6 },
      torsoZ: { a: 0.02, f: 0.5 },
    },
  },
} satisfies Record<string, Clip>;
