import { C } from './clip';
import type { Clip } from './clip';

// Plano 2, bloco 7: animações do lazer, do estudo, do trabalho em casa e da
// conversa com corpo. Como as outras, são só dados (veja clip.ts). Sinais:
// braço X negativo vai para a frente e para cima, cotovelo negativo dobra,
// tronco X positivo inclina para a frente, cabeça X positiva olha para baixo.

const P = Math.PI;

export const HOBBIES = {
  // ---------- computador e escrivaninha ----------
  /** digitando com as duas mãos, os dedos batendo nas teclas, de olho na tela */
  type: {
    variants: ['type', 'type_think', 'type_lean'],
    every: 9,
    tracks: {
      armsX: -0.78,
      armsOut: -0.14,
      elbows: -1.15,
      wristL: { b: -0.15, a: 0.12, f: 15 },
      wristR: { b: -0.15, a: 0.12, f: 13, ph: 1.3 },
      gripL: { b: 0.3, a: 0.2, f: 17 },
      gripR: { b: 0.3, a: 0.2, f: 19, ph: 0.7 },
      torsoX: 0.1,
      headX: { b: 0.06, a: 0.03, f: 0.8 },
      headY: { a: 0.05, f: 0.5 },
    },
  },
  /** para de digitar e pensa, a mão no queixo, a outra no teclado */
  type_think: {
    base: 'type',
    tracks: {
      armRX: -0.65,
      armROut: -0.3,
      elbowR: -2.3,
      wristR: 0.3,
      gripR: 0.7,
      headX: -0.06,
      headZ: { a: 0.07, f: 0.6 },
      torsoX: 0.02,
    },
  },
  /** mais perto da tela, digitando rápido */
  type_lean: {
    base: 'type',
    tracks: {
      torsoX: 0.26,
      headX: -0.05,
      wristL: { b: -0.15, a: 0.16, f: 21 },
      wristR: { b: -0.15, a: 0.16, f: 19, ph: 1.1 },
    },
  },
  /** navegando: a mão direita no mouse, a esquerda descansando no tampo */
  mouse: {
    tracks: {
      armRX: -0.82,
      armROut: { b: 0.1, a: 0.04, f: 1.3 },
      elbowR: -1.05,
      wristR: { b: -0.2, a: 0.06, f: 2.1 },
      gripR: { b: 0.55, a: 0.12, f: 3.3, sh: 'pos' },
      armLX: -0.6,
      armLOut: -0.2,
      elbowL: -1.35,
      gripL: 0.3,
      torsoX: -0.04,
      headX: 0.02,
      headY: { a: 0.04, f: 0.4 },
    },
  },
  /** jogando no teclado: dedos rápidos, o corpo vai junto com o jogo */
  gamePC: {
    tracks: {
      armsX: -0.82,
      armsOut: -0.12,
      elbows: -1.2,
      wristL: { b: -0.1, a: 0.2, f: 24 },
      wristR: { b: -0.2, a: 0.1, f: 6 },
      gripL: { b: 0.4, a: 0.3, f: 22 },
      gripR: { b: 0.6, a: 0.2, f: 9, sh: 'pos' },
      torsoX: { b: 0.2, a: 0.06, f: 0.7 },
      torsoZ: { a: 0.06, f: 1.1 },
      shoulders: 0.02,
      headX: -0.06,
      headZ: { a: 0.05, f: 1.1 },
    },
  },
  /** escrevendo à mão: a esquerda segura o papel, a direita corre a caneta */
  write: {
    variants: ['write', 'write_think'],
    every: 8,
    tracks: {
      armLX: -0.75,
      armLOut: -0.25,
      elbowL: -1.3,
      gripL: 0.2,
      armRX: -0.85,
      armROut: { b: -0.05, a: 0.05, f: 1.4 },
      elbowR: -1.2,
      wristR: { b: 0.05, a: 0.12, f: 9 },
      gripR: 0.8,
      torsoX: 0.28,
      headX: 0.45,
    },
  },
  /** a caneta na boca, pensando na próxima frase */
  write_think: {
    base: 'write',
    tracks: { armRX: -1.0, elbowR: -2.2, wristR: 0.25, headX: -0.08, torsoX: 0.05, headY: { a: 0.1, f: 0.5 } },
  },
  /** charadas na escrivaninha: as mãos no tampo, cabeça inclinada, às vezes aponta */
  puzzle: {
    tracks: {
      armsX: -0.7,
      armsOut: -0.1,
      elbows: -1.3,
      grips: 0.4,
      armRX: { len: 6, k: [[0, -0.7], [0.55, -0.7], [0.65, -1.0], [0.85, -1.0], [1, -0.7]] },
      pointR: { len: 6, k: [[0, 0], [0.55, 0], [0.65, 1], [0.85, 1], [1, 0]] },
      gripR: { len: 6, k: [[0, 0.4], [0.55, 0.4], [0.65, 1], [0.85, 1], [1, 0.4]] },
      torsoX: 0.22,
      headX: 0.4,
      headZ: { a: 0.1, f: 0.4 },
    },
  },
  // ---------- livros ----------
  /** tira (ou devolve) o livro da prateleira, o braço lá em cima */
  shelve: {
    tracks: {
      armRX: { b: -2.0, a: 0.1, f: 2.5 },
      armROut: 0.08,
      elbowR: -0.35,
      gripR: 0.75,
      armLX: -0.3,
      elbowL: -0.6,
      gripL: 0.4,
      torsoX: -0.05,
      headX: -0.3,
      headY: { a: 0.15, f: 1.2 },
    },
  },
  /** lendo deitado de barriga para cima, o livro em cima do peito */
  read_lie: {
    still: true,
    ownLegs: true,
    tracks: {
      lie: 1,
      armsX: -1.25,
      armsOut: -0.22,
      elbows: -1.35,
      wristL: -0.4,
      wristR: -0.4,
      grips: 0.7,
      headX: 0.34,
      headZ: { a: 0.04, f: 0.3 },
      legOut: 0.05,
      kneeR: { b: 0.4, a: 0.06, f: 0.2 },
      legRX: -0.4,
      chestX: { a: 0.02, f: 1.2 },
    },
  },
  // ---------- arte e música ----------
  /** pinta a tela: pinceladas da direita, a paleta na esquerda */
  paint: {
    variants: ['paint', 'paint_look'],
    every: 10,
    tracks: {
      armRX: { b: -1.35, a: 0.18, f: 2.2 },
      armROut: { b: 0.05, a: 0.14, f: 1.1 },
      elbowR: { b: -0.55, a: 0.15, f: 2.2, ph: C },
      wristR: { a: 0.35, f: 4.4 },
      gripR: 0.85,
      armLX: -0.55,
      armLOut: 0.3,
      elbowL: -1.4,
      wristL: -0.5,
      gripL: 0.6,
      torsoX: { b: 0.06, a: 0.04, f: 1.1 },
      hipsSway: { a: 0.012, f: 0.55 },
      headX: -0.08,
      headZ: { a: 0.06, f: 0.55 },
    },
  },
  /** dá um passo atrás e olha o quadro, o pincel no queixo */
  paint_look: {
    base: 'paint',
    tracks: {
      armRX: -0.75,
      armROut: -0.25,
      elbowR: -2.2,
      wristR: 0.3,
      torsoX: -0.08,
      headX: -0.12,
      headZ: { a: 0.14, f: 0.4 },
      hipsSway: 0.02,
      kneeL: 0.12,
    },
  },
  /** teclado e piano: as duas mãos no teclado, dedilhando, o corpo no ritmo */
  keys: {
    variants: ['keys', 'keys_feel'],
    every: 12,
    tracks: {
      armsX: -0.85,
      armsOut: -0.08,
      elbows: -1.05,
      armLOut: { b: -0.05, a: 0.08, f: 0.9 },
      armROut: { b: -0.05, a: 0.08, f: 0.7, ph: 1 },
      wristL: { b: -0.25, a: 0.16, f: 5 },
      wristR: { b: -0.25, a: 0.16, f: 6, ph: 0.8 },
      gripL: { b: 0.35, a: 0.3, f: 8 },
      gripR: { b: 0.35, a: 0.3, f: 9.5, ph: 0.5 },
      torsoY: { a: 0.07, f: 1.2 },
      torsoX: 0.12,
      headX: { b: 0.18, a: 0.05, f: 2.4 },
    },
  },
  /** de olhos quase fechados, sentindo a música, o corpo balançando mais */
  keys_feel: {
    base: 'keys',
    tracks: { torsoY: { a: 0.14, f: 1 }, torsoZ: { a: 0.06, f: 1 }, headX: { b: -0.12, a: 0.06, f: 1 }, headZ: { a: 0.12, f: 1 } },
  },
  /** violão no colo: a esquerda no braço do violão, a direita batendo nas cordas */
  strum: {
    tracks: {
      armLX: -0.95,
      armLOut: 0.5,
      elbowL: -1.15,
      wristL: -0.35,
      gripL: { len: 2.4, k: [[0, 0.5], [0.45, 0.5], [0.5, 0.85], [0.95, 0.85], [1, 0.5]] },
      armRX: -0.45,
      armROut: -0.2,
      elbowR: -1.25,
      wristR: { a: 0.45, f: 7 },
      gripR: 0.6,
      torsoX: 0.1,
      headX: 0.28,
      headZ: { a: 0.12, f: 1.75 },
      hipsSway: { a: 0.01, f: 1.75 },
    },
  },
  // ---------- exercício ----------
  /** pedalando a bicicleta ergométrica: as pernas giram, as mãos no guidão */
  pedal: {
    ownLegs: true,
    tracks: {
      hipsY: 0.1,
      legLX: { b: -1.25, a: 0.38, f: 6 },
      kneeL: { b: 1.25, a: 0.4, f: 6, ph: C },
      legRX: { b: -1.25, a: 0.38, f: 6, ph: P },
      kneeR: { b: 1.25, a: 0.4, f: 6, ph: P + C },
      ankleL: { a: 0.2, f: 6 },
      ankleR: { a: 0.2, f: 6, ph: P },
      torsoX: 0.38,
      armsX: -1.15,
      armsOut: -0.12,
      elbows: -0.35,
      grips: 0.85,
      headX: -0.28,
      hipsRoll: { a: 0.03, f: 6 },
    },
  },
  /** saco de pancada: guarda alta e socos alternados */
  punch: {
    tracks: {
      armRX: { len: 0.9, k: [[0, -0.7], [0.2, -1.55], [0.35, -0.7], [1, -0.7]] },
      elbowR: { len: 0.9, k: [[0, -1.9], [0.2, -0.12], [0.35, -1.9], [1, -1.9]] },
      armLX: { len: 0.9, k: [[0, -0.7], [0.5, -0.7], [0.7, -1.55], [0.85, -0.7], [1, -0.7]] },
      elbowL: { len: 0.9, k: [[0, -1.9], [0.5, -1.9], [0.7, -0.12], [0.85, -1.9], [1, -1.9]] },
      armsOut: -0.22,
      grips: 1,
      hipsYaw: { len: 0.9, k: [[0, 0], [0.2, -0.25], [0.35, 0], [0.7, 0.25], [0.85, 0], [1, 0]] },
      chestY: { len: 0.9, k: [[0, 0], [0.2, -0.3], [0.35, 0], [0.7, 0.3], [0.85, 0], [1, 0]] },
      hipsY: { b: 0.84, a: 0.012, f: 7, sh: 'abs' },
      knees: 0.2,
      legLX: -0.3,
      legRX: 0.15,
      torsoX: 0.12,
      headX: 0.05,
    },
  },
  /** correndo: passada longa, braços dobrados no contrapasso, pulinho a cada passo */
  jog: {
    tracks: {
      legLX: { a: -0.85, f: 13 },
      legRX: { a: 0.85, f: 13 },
      kneeL: { b: 0.3, a: 1.3, f: 13, ph: C, sh: 'pos' },
      kneeR: { b: 0.3, a: 1.3, f: 13, ph: C, sh: 'neg' },
      ankleL: { a: -0.35, f: 13, ph: C },
      ankleR: { a: 0.35, f: 13, ph: C },
      armLX: { b: -0.3, a: 0.8, f: 13 },
      armRX: { b: -0.3, a: -0.8, f: 13 },
      elbows: -1.55,
      grips: 0.75,
      hipsY: { b: 0.88, a: 0.06, f: 13, ph: C, sh: 'abs' },
      hipsYaw: { a: 0.12, f: 13 },
      torsoX: 0.18,
      chestY: { a: -0.2, f: 13 },
      headX: -0.12,
    },
  },
  /** ioga no tapete: árvore, guerreiro e a dobra para a frente, uma depois da outra */
  yoga: {
    tracks: {
      armsX: { len: 15, k: [[0, -0.1], [0.06, -2.9], [0.3, -2.9], [0.36, -1.57], [0.63, -1.57], [0.7, -0.9], [0.94, -0.9], [1, -0.1]] },
      armsOut: { len: 15, k: [[0, 0.1], [0.06, 0.15], [0.3, 0.15], [0.36, 1.5], [0.63, 1.5], [0.7, 0.1], [1, 0.1]] },
      elbows: { len: 15, k: [[0, -0.2], [0.06, -0.15], [0.3, -0.15], [0.36, 0], [0.63, 0], [0.7, -0.1], [1, -0.2]] },
      grips: 0.1,
      legRX: { len: 15, k: [[0, 0], [0.06, -0.25], [0.3, -0.25], [0.36, 0.55], [0.63, 0.55], [0.7, 0], [1, 0]] },
      legROut: { len: 15, k: [[0, 0], [0.06, 1.1], [0.3, 1.1], [0.36, 0.1], [0.63, 0.1], [0.7, 0], [1, 0]] },
      kneeR: { len: 15, k: [[0, 0], [0.06, 1.9], [0.3, 1.9], [0.36, 0], [0.63, 0], [0.7, 0.05], [1, 0]] },
      legLX: { len: 15, k: [[0, 0], [0.3, 0], [0.36, -0.75], [0.63, -0.75], [0.7, 0], [1, 0]] },
      kneeL: { len: 15, k: [[0, 0], [0.3, 0], [0.36, 0.9], [0.63, 0.9], [0.7, 0.05], [1, 0]] },
      hipsY: { len: 15, k: [[0, 0.9], [0.3, 0.9], [0.36, 0.7], [0.63, 0.7], [0.7, 0.9], [1, 0.9]] },
      torsoX: { len: 15, k: [[0, 0], [0.3, 0], [0.36, -0.05], [0.63, -0.05], [0.7, 1.35], [0.94, 1.35], [1, 0]] },
      headX: { len: 15, k: [[0, 0], [0.06, -0.25], [0.3, -0.25], [0.36, 0], [0.63, 0], [0.7, 0.3], [1, 0]] },
      headY: { len: 15, k: [[0, 0], [0.3, 0], [0.36, 1.0], [0.63, 1.0], [0.7, 0], [1, 0]] },
    },
  },
  /** alongando: os braços lá em cima, inclinando para um lado e para o outro */
  stretch: {
    tracks: {
      armsX: -2.95,
      armsOut: 0.05,
      elbows: -0.15,
      grips: 0.35,
      torsoZ: { a: 0.3, f: 0.9 },
      hipsSway: { a: -0.02, f: 0.9 },
      headX: -0.2,
      headZ: { a: 0.15, f: 0.9 },
    },
  },
  /** abdominais deitado no tapete, joelhos dobrados e as mãos atrás da cabeça */
  situps: {
    ownLegs: true,
    tracks: {
      lie: 1,
      spineX: { b: 0.35, a: 0.35, f: 3.4, sh: 'abs' },
      chestX: { b: 0.25, a: 0.25, f: 3.4, sh: 'abs' },
      legsX: -0.8,
      knees: 1.5,
      armsX: -2.6,
      armsOut: 0.6,
      elbows: -2.1,
      grips: 0.3,
      headX: 0.2,
    },
  },
  // ---------- jogos ----------
  /** xadrez: pensa com a mão no queixo e de vez em quando move uma peça */
  chess: {
    tracks: {
      armLX: -0.55,
      armLOut: -0.3,
      elbowL: -2.25,
      wristL: 0.3,
      gripL: 0.7,
      armRX: { len: 8, k: [[0, -0.5], [0.6, -0.5], [0.7, -1.05], [0.8, -1.05], [0.9, -0.5], [1, -0.5]] },
      elbowR: { len: 8, k: [[0, -1.3], [0.6, -1.3], [0.7, -0.55], [0.8, -0.55], [0.9, -1.3], [1, -1.3]] },
      gripR: { len: 8, k: [[0, 0.4], [0.66, 0.4], [0.7, 0.9], [0.82, 0.9], [0.86, 0.4], [1, 0.4]] },
      torsoX: { len: 8, k: [[0, 0.18], [0.6, 0.18], [0.7, 0.32], [0.85, 0.32], [1, 0.18]] },
      headX: 0.42,
      headZ: { a: 0.06, f: 0.5 },
    },
  },
  /** cartas: o leque nas duas mãos, e de vez em quando joga uma na mesa */
  cards: {
    tracks: {
      armLX: -0.75,
      armLOut: -0.2,
      elbowL: -1.5,
      wristL: -0.5,
      gripL: 0.85,
      armRX: { len: 5, k: [[0, -0.75], [0.6, -0.75], [0.72, -1.15], [0.8, -1.15], [0.9, -0.75], [1, -0.75]] },
      armROut: -0.15,
      elbowR: { len: 5, k: [[0, -1.5], [0.6, -1.5], [0.72, -0.6], [0.8, -0.6], [0.9, -1.5], [1, -1.5]] },
      gripR: { len: 5, k: [[0, 0.85], [0.74, 0.85], [0.78, 0.2], [0.9, 0.2], [0.95, 0.85], [1, 0.85]] },
      torsoX: 0.12,
      headX: 0.28,
      headY: { a: 0.06, f: 0.7 },
    },
  },
  /** controle de videogame nas duas mãos, o corpo inclinando nas curvas */
  gamepad: {
    tracks: {
      armsX: -0.72,
      armsOut: -0.32,
      elbows: -1.45,
      wristL: { b: -0.3, a: 0.05, f: 11 },
      wristR: { b: -0.3, a: 0.05, f: 13, ph: 1 },
      grips: { b: 0.7, a: 0.15, f: 9 },
      torsoZ: { a: 0.14, f: 0.85 },
      torsoX: { b: 0.15, a: 0.06, f: 0.6 },
      headX: -0.05,
      headZ: { a: 0.1, f: 0.85 },
    },
  },
  /** criança sentada no chão empilhando blocos */
  playFloor: {
    ownLegs: true,
    tracks: {
      hipsY: 0.16,
      legsX: -1.45,
      knees: 1.9,
      legOut: 0.55,
      ankleL: 0.3,
      ankleR: 0.3,
      armsX: { b: -0.85, a: 0.25, f: 1.6 },
      armsOut: -0.15,
      elbows: { b: -0.7, a: 0.2, f: 1.6, ph: C },
      grips: { b: 0.6, a: 0.3, f: 1.6, sh: 'pos' },
      torsoX: 0.38,
      headX: 0.45,
      headZ: { a: 0.1, f: 0.7 },
    },
  },
  /** olhando pela janela, as mãos no parapeito, a cabeça passeando pela rua */
  gazeOut: {
    tracks: {
      armsX: -0.95,
      armsOut: -0.12,
      elbows: -0.55,
      wristL: -0.6,
      wristR: -0.6,
      grips: 0.2,
      torsoX: 0.18,
      hipsSway: { a: 0.02, f: 0.2 },
      headX: -0.08,
      headY: { a: 0.35, f: 0.22 },
    },
  },
} satisfies Record<string, Clip>;

/** Gestos de conversa do bloco 7: cada interação com o seu corpo. */
export const SOCIAL_MORE = {
  /** aperto de mão: a direita na frente, sacudindo, e a cabeça acenando */
  handshake: {
    tracks: {
      armRX: { b: -0.8, a: 0.1, f: 8 },
      armROut: -0.12,
      elbowR: -0.45,
      wristR: { a: 0.1, f: 8 },
      gripR: 0.85,
      armLX: 0.05,
      elbowL: -0.2,
      gripL: 0.3,
      torsoX: 0.1,
      headX: { b: 0.05, a: 0.07, f: 4, sh: 'pos' },
    },
  },
  /** conta a piada falando e, no fim, dá um tapinha nas costas do outro */
  joke: {
    tracks: {
      armRX: { len: 5, k: [[0, -0.55], [0.15, -0.85], [0.3, -0.5], [0.45, -0.9], [0.65, -0.55], [0.72, -1.45], [0.95, -1.45], [1, -0.55]] },
      armROut: { len: 5, k: [[0, 0.15], [0.65, 0.15], [0.72, 0.65], [0.95, 0.65], [1, 0.15]] },
      elbowR: [{ len: 5, k: [[0, -1.2], [0.65, -1.2], [0.72, -0.5], [0.95, -0.5], [1, -1.2]] }, { a: 0.12, f: 14 }],
      gripR: 0.1,
      armLX: -0.2,
      elbowL: -0.6,
      headX: -0.12,
      headY: { a: 0.1, f: 1.7 },
      torsoX: { len: 5, k: [[0, 0], [0.65, 0], [0.72, 0.12], [0.95, 0.12], [1, 0]] },
    },
  },
  /** tapinha nas costas (de quem chega para consolar ou dar parabéns) */
  backPat: {
    tracks: {
      armRX: -1.3,
      armROut: 0.7,
      elbowR: { b: -0.6, a: 0.25, f: 9 },
      gripR: 0.1,
      armLX: -0.1,
      torsoX: 0.1,
      headX: -0.05,
      headZ: -0.1,
    },
  },
  /** dedo em riste sacudindo, a outra mão na cintura */
  fingerWag: {
    tracks: {
      armRX: -1.6,
      armROut: 0.12,
      elbowR: -0.9,
      wristR: { a: 0.35, f: 9 },
      gripR: 1,
      pointR: 1,
      armLX: 0.25,
      armLOut: 0.55,
      elbowL: -1.7,
      gripL: 0.8,
      torsoX: 0.14,
      headX: -0.12,
      headZ: { a: 0.12, f: 4.5 },
    },
  },
  /** pedindo desculpas: cabeça baixa, as mãos juntas na frente */
  apologize: {
    tracks: {
      armsX: -0.6,
      armsOut: -0.45,
      elbows: -1.3,
      grips: 0.6,
      shoulders: 0.02,
      torsoX: 0.12,
      headX: { b: 0.35, a: 0.05, f: 1.2 },
      headZ: 0.08,
    },
  },
  /** de joelho, estendendo a caixinha com as duas mãos */
  kneel: {
    ownLegs: true,
    tracks: {
      hipsY: 0.5,
      legLX: -1.55,
      kneeL: 1.55,
      legRX: 0.15,
      kneeR: 1.7,
      ankleR: 0.6,
      armsX: -1.25,
      armsOut: -0.25,
      elbows: -0.6,
      grips: 0.8,
      torsoX: -0.05,
      headX: -0.3,
    },
  },
  /** dança lenta: uma mão no ombro, a outra na cintura, balançando */
  slowDance: {
    tracks: {
      armLX: -1.6,
      armLOut: -0.2,
      elbowL: -0.75,
      armRX: -0.85,
      armROut: -0.45,
      elbowR: -0.75,
      grips: 0.35,
      hipsSway: { a: 0.04, f: 1.8 },
      hipsYaw: { a: 0.12, f: 0.9 },
      torsoZ: { a: 0.05, f: 1.8 },
      hipsY: { b: 0.87, a: 0.012, f: 3.6, sh: 'abs' },
      headZ: { a: 0.12, f: 0.9 },
      headX: 0.05,
    },
  },
  /** massagem nas costas: as duas mãos nos ombros do outro, apertando */
  backRub: {
    tracks: {
      armsX: -1.3,
      armsOut: -0.1,
      elbows: { b: -0.8, a: 0.12, f: 3 },
      wristL: { a: 0.2, f: 3 },
      wristR: { a: 0.2, f: 3, ph: P },
      grips: { b: 0.5, a: 0.3, f: 3 },
      torsoX: 0.16,
      headX: 0.25,
    },
  },
  /** entrega o presente com as duas mãos, um pouco curvado */
  handOver: {
    tracks: {
      armsX: { len: 4, k: [[0, -0.5], [0.3, -1.15], [0.8, -1.15], [1, -0.5]] },
      armsOut: -0.22,
      elbows: { len: 4, k: [[0, -1.4], [0.3, -0.55], [0.8, -0.55], [1, -1.4]] },
      grips: 0.8,
      torsoX: { len: 4, k: [[0, 0], [0.3, 0.16], [0.8, 0.16], [1, 0]] },
      headX: 0.1,
    },
  },
  /** paquera: mão no cabelo, peso numa perna, sorriso de lado */
  flirt: {
    tracks: {
      armRX: -2.4,
      armROut: 0.55,
      elbowR: -2.0,
      wristR: { a: 0.2, f: 1.6 },
      gripR: 0.3,
      armLX: 0.1,
      armLOut: 0.2,
      elbowL: -0.4,
      hipsSway: 0.035,
      hipsRoll: 0.07,
      kneeL: 0.15,
      headZ: { b: 0.15, a: 0.05, f: 1.2 },
      headX: 0.06,
    },
  },
  /** provocação: aponta e ri, segurando a barriga */
  tease: {
    tracks: {
      armRX: -1.2,
      elbowR: -0.3,
      gripR: 1,
      pointR: 1,
      armLX: -0.4,
      armLOut: -0.3,
      elbowL: -1.4,
      gripL: 0.6,
      torsoX: { b: 0.1, a: 0.06, f: 10, sh: 'abs' },
      headX: { b: -0.22, a: 0.08, f: 10, sh: 'abs' },
      hipsY: { b: 0.89, a: -0.012, f: 10, sh: 'abs' },
    },
  },
  /** toca aqui: a direita sobe e bate na do outro */
  highFive: {
    tracks: {
      armRX: { len: 2, k: [[0, -0.6], [0.35, -2.6], [0.5, -2.45], [0.7, -2.6], [1, -0.6]] },
      armROut: 0.2,
      elbowR: { len: 2, k: [[0, -1.2], [0.35, -0.2], [0.7, -0.2], [1, -1.2]] },
      gripR: 0,
      armLX: -0.2,
      hipsY: { b: 0.88, a: 0.03, f: 3.1, sh: 'pos' },
      headX: -0.2,
    },
  },
  /** aconchego: abraçados de lado, a cabeça encostada */
  cuddle: {
    tracks: {
      armLX: -0.9,
      armLOut: -0.55,
      elbowL: -1.0,
      armRX: -1.5,
      armROut: 0.3,
      elbowR: -1.4,
      grips: 0.3,
      torsoZ: 0.1,
      headZ: 0.32,
      headX: 0.12,
      hipsSway: { a: 0.01, f: 0.7 },
    },
  },
  /** pega-pega: corre no lugar, dando a volta, e ri */
  tag: {
    base: 'jog',
    tracks: {
      armRX: { b: -1.6, a: -0.5, f: 13 },
      armROut: 0.4,
      elbowR: -0.4,
      pointR: 1,
      torsoX: 0.25,
      headX: -0.25,
    },
  },
} satisfies Record<string, Clip>;
