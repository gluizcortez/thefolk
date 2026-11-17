import type { MonthDef, Temper } from '../sim/types';

// Bloco 5: meses de nascimento. Cada mês tem nome de coisa de casa, sugere
// um temperamento e combina (ou dá atrito) com alguns outros meses. O mês
// soma na afinidade como um traço a mais. Pares valem para os dois lados.

const T = (order: number, outgoing: number, pep: number, wit: number, warmth: number): Temper => ({ order, outgoing, pep, wit, warmth });

const SUGGESTED: Temper[] = [
  T(7, 3, 3, 4, 8), // Chaleira
  T(3, 6, 8, 7, 1), // Pião
  T(7, 2, 4, 3, 9), // Lampião
  T(2, 7, 6, 8, 2), // Pipa
  T(5, 4, 2, 5, 9), // Novelo
  T(9, 3, 6, 2, 5), // Bússola
  T(4, 9, 5, 4, 3), // Sino
  T(8, 2, 9, 1, 5), // Martelo
  T(5, 1, 3, 6, 10), // Concha
  T(1, 8, 6, 7, 3), // Balão
  T(7, 5, 1, 4, 8), // Ninho
  T(2, 6, 10, 5, 2), // Faísca
];

const GOOD: [number, number][] = [
  [0, 4], [0, 10], [1, 9], [1, 11], [2, 8], [2, 5], [3, 6], [3, 9],
  [4, 8], [5, 7], [6, 11], [7, 10], [8, 10], [9, 3], [11, 1],
];
const BAD: [number, number][] = [
  [0, 11], [1, 5], [2, 9], [3, 7], [4, 6], [8, 6], [10, 3], [5, 9],
];

function pairsOf(list: [number, number][], m: number): number[] {
  const out = new Set<number>();
  for (const [a, b] of list) {
    if (a === m) out.add(b);
    if (b === m) out.add(a);
  }
  return [...out].sort((a, b) => a - b);
}

export const MONTHS: MonthDef[] = SUGGESTED.map((temper, id) => ({
  id,
  name: `month.${id}`,
  hint: `monthHint.${id}`,
  temper,
  likes: pairsOf(GOOD, id),
  dislikes: pairsOf(BAD, id),
}));
