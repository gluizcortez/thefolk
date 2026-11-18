// Plano 2, bloco 5: a pose do folk, junta por junta. Tudo aqui é número
// (ângulos em radianos, frente do corpo = +z), para que duas poses possam ser
// misturadas canal a canal. Não depende do three.js: dá para testar puro.

/** Altura do quadril em pé, em metros (adulto). */
export const HIPS_Y = 0.9;

export interface Pose {
  /** altura do quadril e balanço de lado (peso no andar) */
  hipsY: number;
  hipsSway: number;
  hipsRoll: number;
  hipsYaw: number;
  /** 0 = em pé, 1 = deitado */
  lie: number;
  /** tronco em duas partes: barriga (spine) e peito (chest) */
  spineX: number;
  spineY: number;
  spineZ: number;
  chestX: number;
  chestY: number;
  chestZ: number;
  neckX: number;
  neckY: number;
  headX: number;
  headY: number;
  headZ: number;
  /** ombros: quanto sobem (encolher os ombros, suspirar) */
  shoulderL: number;
  shoulderR: number;
  armLX: number;
  armRX: number;
  armLOut: number;
  armROut: number;
  elbowL: number;
  elbowR: number;
  /** pulso: dobra para a frente (+) ou para trás (-) */
  wristL: number;
  wristR: number;
  /** mão: 0 aberta, 0,35 solta, 0,7 segurando, 1 fechada */
  gripL: number;
  gripR: number;
  /** indicador esticado (apontar), 0..1 */
  pointL: number;
  pointR: number;
  legLX: number;
  legRX: number;
  legLOut: number;
  legROut: number;
  kneeL: number;
  kneeR: number;
  /** tornozelo: ponta do pé para cima (-) ou para baixo (+) */
  ankleL: number;
  ankleR: number;
}

export type Joint = keyof Pose;

const REST: Pose = {
  hipsY: HIPS_Y,
  hipsSway: 0,
  hipsRoll: 0,
  hipsYaw: 0,
  lie: 0,
  spineX: 0,
  spineY: 0,
  spineZ: 0,
  chestX: 0,
  chestY: 0,
  chestZ: 0,
  neckX: 0,
  neckY: 0,
  // a cabeça fica um pouco erguida para o rosto aparecer para a câmera alta
  headX: -0.12,
  headY: 0,
  headZ: 0,
  shoulderL: 0,
  shoulderR: 0,
  armLX: 0,
  armRX: 0,
  armLOut: 0.07,
  armROut: 0.07,
  elbowL: -0.12,
  elbowR: -0.12,
  wristL: 0.05,
  wristR: 0.05,
  gripL: 0.35,
  gripR: 0.35,
  pointL: 0,
  pointR: 0,
  legLX: 0,
  legRX: 0,
  legLOut: 0.02,
  legROut: 0.02,
  kneeL: 0,
  kneeR: 0,
  ankleL: 0,
  ankleR: 0,
};

export const JOINTS = Object.keys(REST) as Joint[];

export function rest(): Pose {
  return { ...REST };
}

/** Mistura duas poses: w = 0 dá `a`, w = 1 dá `b`. */
export function blendPose(a: Pose, b: Pose, w: number, out: Pose = rest()): Pose {
  const k = Math.min(1, Math.max(0, w));
  for (const j of JOINTS) out[j] = a[j] + (b[j] - a[j]) * k;
  return out;
}

/** Curva de transição: começa e termina devagar. */
export function smoothstep(x: number): number {
  const k = Math.min(1, Math.max(0, x));
  return k * k * (3 - 2 * k);
}

/** Maior diferença entre duas poses (para testes e para saber se assentou). */
export function poseDistance(a: Pose, b: Pose): number {
  let d = 0;
  for (const j of JOINTS) d = Math.max(d, Math.abs(a[j] - b[j]));
  return d;
}
