import type { Clip } from './clip';

// Plano 2, bloco 6: animações da cozinha, da mesa, do banheiro, da cama e da
// limpeza. Como as outras, são só dados (veja clip.ts). Sinais: braço X
// negativo vai para a frente e para cima, cotovelo negativo dobra, tronco X
// positivo inclina para a frente, cabeça X positiva olha para baixo.

export const CHORES = {
  // ---------- cozinha ----------
  /** abre a geladeira e pega os ingredientes, a sacola no outro braço */
  fetch: {
    tracks: {
      armRX: { b: -1.3, a: 0.15, f: 2 },
      armROut: 0.1,
      elbowR: -0.3,
      gripR: 0.7,
      armLX: -0.45,
      elbowL: -1.25,
      gripL: 0.7,
      torsoX: 0.14,
      headX: { b: 0.05, a: 0.08, f: 1 },
    },
  },
  /** pica na tábua: a faca sobe e desce, a outra mão segura o legume */
  chop: {
    tracks: {
      armLX: -0.85,
      armLOut: -0.15,
      elbowL: -0.95,
      gripL: 0.6,
      armRX: { b: -0.95, a: 0.12, f: 9 },
      armROut: -0.05,
      elbowR: { b: -1.0, a: 0.28, f: 9 },
      wristR: { a: 0.3, f: 9 },
      gripR: 0.85,
      torsoX: 0.22,
      headX: 0.4,
      hipsSway: { a: 0.01, f: 0.8 },
    },
  },
  /** mexe a panela em círculos; a outra mão no cabo */
  stir: {
    variants: ['stir', 'stir_taste'],
    every: 9,
    tracks: {
      armRX: { b: -1.0, a: 0.1, f: 3 },
      armROut: { b: 0, a: 0.14, f: 3, ph: Math.PI / 2 },
      elbowR: -0.9,
      gripR: 0.85,
      armLX: -0.65,
      armLOut: 0.1,
      elbowL: -0.9,
      gripL: 0.7,
      torsoX: 0.14,
      headX: 0.32,
      hipsSway: { a: 0.012, f: 0.6 },
    },
  },
  /** prova da colher, de olho no ponto */
  stir_taste: {
    base: 'stir',
    tracks: {
      armRX: { len: 3, k: [[0, -1.0], [0.35, -1.45], [0.6, -1.45], [1, -1.0]] },
      elbowR: { len: 3, k: [[0, -0.9], [0.35, -2.0], [0.6, -2.0], [1, -0.9]] },
      headX: { len: 3, k: [[0, 0.32], [0.35, 0.0], [0.6, 0.0], [1, 0.32]] },
    },
  },
  /** leva a panela nas duas mãos e despeja na travessa */
  serve: {
    tracks: {
      armsX: { b: -0.95, a: 0.12, f: 1.6 },
      armsOut: -0.12,
      elbows: -1.05,
      grips: 0.85,
      torsoX: { b: 0.14, a: 0.06, f: 1.6 },
      headX: 0.3,
    },
  },
  /** tira uma porção da travessa: o prato na esquerda, a colher na direita */
  scoop: {
    tracks: {
      armLX: -0.7,
      armLOut: -0.1,
      elbowL: -1.2,
      gripL: 0.75,
      armRX: { b: -1.15, a: 0.2, f: 2.4 },
      elbowR: { b: -0.6, a: 0.25, f: 2.4 },
      gripR: 0.85,
      torsoX: 0.25,
      headX: 0.35,
    },
  },
  /** chama a família: mão em concha na boca, a outra acenando */
  callOut: {
    tracks: {
      armRX: -1.85,
      armROut: 0.4,
      elbowR: -2.05,
      gripR: 0.25,
      armLX: { b: -2.4, a: 0.25, f: 5 },
      armLOut: 0.3,
      elbowL: -0.35,
      gripL: 0,
      torsoX: -0.08,
      headX: -0.28,
      hipsY: { b: 0.9, a: 0.01, f: 5, sh: 'abs' },
    },
  },
  /** comendo à mesa e puxando assunto entre uma garfada e outra */
  eat_chat: {
    base: 'eat',
    tracks: {
      armRX: -0.55,
      elbowR: -1.1,
      armROut: { b: 0.05, a: 0.1, f: 1.4 },
      headY: { a: 0.25, f: 0.5 },
      headX: -0.05,
    },
  },
  // ---------- pia ----------
  /** lava a louça: as mãos na cuba, esfregando */
  washUp: {
    tracks: {
      armsX: { b: -1.0, a: 0.12, f: 6 },
      armsOut: -0.18,
      elbowL: { b: -1.0, a: 0.22, f: 6 },
      elbowR: { b: -1.0, a: -0.22, f: 6 },
      grips: 0.8,
      torsoX: 0.26,
      headX: 0.38,
      hipsSway: { a: 0.01, f: 0.7 },
    },
  },
  /** esfrega uma mão na outra debaixo da torneira */
  washHands: {
    tracks: {
      armsX: -0.75,
      armsOut: -0.28,
      elbows: -1.15,
      wristL: { a: 0.4, f: 7 },
      wristR: { a: -0.4, f: 7 },
      grips: 0.3,
      torsoX: 0.2,
      headX: 0.32,
    },
  },
  /** escova os dentes diante do espelho */
  brush: {
    tracks: {
      armRX: -1.25,
      armROut: -0.25,
      elbowR: -2.1,
      gripR: 0.85,
      wristR: { a: 0.35, f: 8 },
      armLX: -0.2,
      elbowL: -0.3,
      torsoX: 0.08,
      headX: -0.05,
      headY: { a: 0.06, f: 8 },
    },
  },
  /** se arruma no espelho: penteia, vira o rosto de um lado e do outro */
  groom: {
    tracks: {
      armRX: -2.3,
      armROut: 0.32,
      elbowR: -1.6,
      gripR: 0.8,
      wristR: { a: 0.4, f: 3 },
      armLX: -0.4,
      elbowL: -0.6,
      headY: { a: 0.18, f: 0.8 },
      headZ: { a: 0.08, f: 0.8 },
      headX: -0.15,
    },
  },
  // ---------- privada e chuveiro ----------
  /** abaixa para levantar a tampa */
  lidUp: {
    tracks: {
      torsoX: 0.5,
      armRX: { len: 1.4, k: [[0, -0.6], [0.5, -0.95], [1, -1.3]] },
      elbowR: -0.25,
      gripR: 0.6,
      armLX: -0.2,
      knees: 0.2,
      legsX: -0.12,
      hipsY: 0.86,
      headX: 0.42,
    },
  },
  /** de pé, aperta a descarga */
  flush: {
    tracks: {
      torsoX: 0.3,
      armRX: { len: 1.2, k: [[0, -0.7], [0.4, -0.95], [0.6, -0.95], [1, -0.7]] },
      armROut: 0.15,
      elbowR: -0.2,
      gripR: 0.3,
      pointR: 0.7,
      headX: 0.35,
    },
  },
  /** tira a roupa atrás do vapor: puxa a camiseta pela cabeça */
  undress: {
    tracks: {
      armsX: { len: 2, k: [[0, -0.6], [0.5, -2.7], [1, -0.6]] },
      armsOut: -0.28,
      elbows: { len: 2, k: [[0, -1.5], [0.5, -0.6], [1, -1.5]] },
      grips: 0.8,
      headX: { len: 2, k: [[0, 0.1], [0.5, 0.3], [1, 0.1]] },
    },
  },
  /** ensaboa os braços e o peito, girando o tronco */
  soap: {
    tracks: {
      armLX: { b: -0.75, a: 0.4, f: 3 },
      armRX: { b: -0.75, a: -0.4, f: 3 },
      armsOut: -0.38,
      elbows: { b: -1.5, a: 0.3, f: 3 },
      grips: 0.7,
      torsoY: { a: 0.2, f: 1.5 },
      headX: 0.15,
      hipsSway: { a: 0.015, f: 1.5 },
    },
  },
  /** enxágua: mãos na cabeça, rosto para o chuveiro */
  rinse: {
    tracks: {
      armsX: -2.6,
      armsOut: 0.16,
      elbows: { b: -1.8, a: 0.3, f: 2 },
      grips: 0.2,
      headX: { b: -0.38, a: 0.06, f: 1 },
      headZ: { a: 0.08, f: 0.7 },
      torsoX: -0.06,
    },
  },
  /** seca com a toalha: esfrega a cabeça e as costas */
  towel: {
    tracks: {
      armsX: { b: -1.7, a: 0.35, f: 3 },
      armsOut: 0.06,
      elbows: -1.45,
      grips: 0.8,
      headX: 0.08,
      torsoY: { a: 0.16, f: 3 },
    },
  },
  // ---------- cama ----------
  /** estica o lençol e afofa o travesseiro, debruçado na cama */
  makeBed: {
    tracks: {
      torsoX: 0.62,
      armsX: { b: -1.2, a: 0.35, f: 1.8 },
      armsOut: { b: 0.28, a: 0.2, f: 1.8 },
      elbows: -0.3,
      grips: 0.7,
      knees: 0.15,
      legsX: -0.1,
      hipsY: 0.87,
      headX: 0.38,
    },
  },
  /** dormindo meio de lado (virado para a direita): tronco e cabeça viram, as pernas ficam sob a coberta */
  sleep_sideR: {
    base: 'sleep',
    still: true,
    ownLegs: true,
    tracks: { spineY: 0.45, chestY: 0.55, headY: 0.85, headZ: 0.1, armLOut: -0.25, armROut: 0.35, elbowL: -1.1, elbowR: -0.2, legROut: -0.12, kneeL: 0.12, kneeR: 0.25 },
  },
  /** dormindo de lado (virado para a esquerda) */
  sleep_sideL: {
    base: 'sleep',
    still: true,
    ownLegs: true,
    tracks: { spineY: -0.45, chestY: -0.55, headY: -0.85, headZ: -0.1, armROut: -0.25, armLOut: 0.35, elbowR: -1.1, elbowL: -0.2, legLOut: -0.12, kneeL: 0.25, kneeR: 0.12 },
  },
  /** de barriga para cima, as mãos sobre a barriga */
  sleep_back: {
    base: 'sleep',
    still: true,
    ownLegs: true,
    tracks: { armsX: 0.05, armsOut: 0.12, elbows: -0.35, grips: 0.3, headZ: -0.08, legOut: 0.1 },
  },
  // ---------- limpeza ----------
  /** passa o pano de chão, o rodo indo e vindo */
  mop: {
    tracks: {
      armLX: -0.9,
      armRX: -0.5,
      elbowL: -0.7,
      elbowR: -1.2,
      armsOut: -0.2,
      grips: 0.85,
      torsoY: { a: 0.35, f: 1.6 },
      torsoX: 0.2,
      hipsSway: { a: 0.02, f: 1.6 },
      headX: 0.3,
    },
  },
  /** varre: a vassoura em golpes curtos */
  sweep: {
    tracks: {
      armLX: { b: -0.7, a: 0.15, f: 2.4 },
      armRX: { b: -0.35, a: 0.25, f: 2.4 },
      armsOut: -0.15,
      elbows: -0.7,
      grips: 0.85,
      torsoX: 0.25,
      torsoY: { a: 0.3, f: 2.4 },
      headX: 0.35,
    },
  },
} satisfies Record<string, Clip>;
