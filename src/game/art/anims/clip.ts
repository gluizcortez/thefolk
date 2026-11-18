import type { Joint } from './pose';

// Plano 2, bloco 5: formato das animações. Cada animação é um dado: para cada
// junta, um valor fixo, uma oscilação ou uma lista de quadros-chave. O
// tocador (sample.ts) lê isso; nenhuma animação é código.

/** Forma da onda: seno, módulo do seno, só a metade de cima, só a de baixo. */
export type Wave = 'sin' | 'abs' | 'pos' | 'neg';

/** Oscilação: b + a * onda(f * t + ph). */
export interface Osc {
  b?: number;
  a: number;
  f: number;
  ph?: number;
  sh?: Wave;
}

/** Quadros-chave num laço de `len` segundos; cada chave é [fração 0..1, valor]. */
export interface Keys {
  len: number;
  k: [number, number][];
}

/** Valor de uma junta: fixo, oscilando, por quadros-chave ou a soma de vários. */
export type Track = number | Osc | Keys | Track[];

/**
 * Canais de atalho: `torsoX` reparte entre barriga e peito, `legOut` abre as
 * duas pernas, `arms*`/`elbows`/`grips` valem para os dois lados.
 */
export type Alias = 'torsoX' | 'torsoY' | 'torsoZ' | 'legOut' | 'armsX' | 'armsOut' | 'elbows' | 'grips' | 'knees' | 'legsX' | 'shoulders';

export type Tracks = Partial<Record<Joint | Alias, Track>>;

export interface Clip {
  /** começa dos canais de outra animação e troca só o que vier aqui */
  base?: string;
  tracks: Tracks;
  /** sem a camada de postura (humor, cansaço): deitado, nadando */
  still?: boolean;
  /** a própria animação já é sentada (ou deitada): as pernas não dobram por cima */
  ownLegs?: boolean;
  /** pernas quando o folk está sentado (no lugar das pernas dobradas de sempre) */
  seat?: Tracks;
  /** variações do laço, trocadas a cada `every` segundos de animação */
  variants?: string[];
  every?: number;
}

/** Meia volta, para escrever cosseno como seno adiantado. */
export const C = Math.PI / 2;
