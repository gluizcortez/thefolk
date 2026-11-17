// Bloco 7: música procedural própria. Cada estilo tem andamento, tom,
// sequências de acordes (por graus da escala) e uma batida; os compassos são
// compostos na hora, com um gerador repetível. Nada aqui imita trilha
// existente: os acordes são empilhados em terças na escala e a melodia anda
// por passos, preferindo notas do acorde nos tempos fortes.
// Só a parte pura (notas); quem toca é audio/engine.ts.

import { seeded } from './folkes';

export type Instrument = 'keys' | 'pad' | 'bass' | 'lead' | 'marimba' | 'pluck' | 'power' | 'kick' | 'snare' | 'hat' | 'shaker';

export interface NoteEvent {
  /** começo, em tempos a partir do início do compasso */
  at: number;
  /** duração, em tempos */
  dur: number;
  /** nota MIDI (bateria ignora) */
  midi: number;
  inst: Instrument;
  /** 0 a 1 */
  vel: number;
}

/** Uma batida: em que posições (em colcheias de 0 a 7) cada peça toca. */
interface Groove {
  kick: number[];
  snare: number[];
  hat: number[];
  shaker?: number[];
}

export interface StyleDef {
  id: string;
  bpm: number;
  /** quanto as colcheias pares atrasam (0 = reto, 0.33 = bem balançado) */
  swing: number;
  /** tônica (MIDI) */
  root: number;
  /** escala, em semitons a partir da tônica */
  scale: number[];
  /** sequências de graus (0 = primeiro grau), uma por compasso */
  progressions: number[][];
  /** instrumento dos acordes, do baixo e da melodia */
  chord: Instrument;
  bass: Instrument;
  lead: Instrument | null;
  /** chance de cada colcheia da melodia ter nota */
  density: number;
  /** como o acorde é tocado: segurado, em arpejo, em batidas curtas ou em quinta só */
  comp: 'hold' | 'arp' | 'stab' | 'power';
  /** baixo: 'root' (tônica no 1), 'walk' (anda), 'bossa' (1 e 3 com antecipação), 'drive' (colcheias) */
  bassLine: 'root' | 'walk' | 'bossa' | 'drive';
  groove: Groove | null;
}

const MAJOR = [0, 2, 4, 5, 7, 9, 11];
const DORIAN = [0, 2, 3, 5, 7, 9, 10];
const MINOR = [0, 2, 3, 5, 7, 8, 10];
const MIXO = [0, 2, 4, 5, 7, 9, 10];

/** Estilos da trilha (um por modo) e das três estações de rádio. */
export const STYLES: Record<string, StyleDef> = {
  // modo viver: piano elétrico de sala, sem pressa
  live: {
    id: 'live',
    bpm: 92,
    swing: 0.18,
    root: 53,
    scale: MAJOR,
    progressions: [
      [0, 5, 1, 4],
      [3, 2, 1, 4],
      [0, 3, 5, 4],
      [1, 4, 0, 5],
    ],
    chord: 'keys',
    bass: 'bass',
    lead: 'lead',
    density: 0.32,
    comp: 'hold',
    bassLine: 'walk',
    groove: { kick: [0, 5], snare: [], hat: [2, 6], shaker: [1, 3, 5, 7] },
  },
  // modo comprar: marimba e violão de vitrine
  buy: {
    id: 'buy',
    bpm: 118,
    swing: 0,
    root: 50,
    scale: MAJOR,
    progressions: [
      [0, 1, 4, 0],
      [3, 4, 2, 5],
      [0, 5, 3, 4],
    ],
    chord: 'pluck',
    bass: 'bass',
    lead: 'marimba',
    density: 0.45,
    comp: 'stab',
    bassLine: 'bossa',
    groove: { kick: [0, 3, 4, 7], snare: [], hat: [], shaker: [0, 1, 2, 3, 4, 5, 6, 7] },
  },
  // modo construir: suingue de oficina
  build: {
    id: 'build',
    bpm: 104,
    swing: 0.12,
    root: 57,
    scale: DORIAN,
    progressions: [
      [0, 3, 0, 3],
      [0, 0, 6, 3],
      [3, 4, 0, 6],
    ],
    chord: 'pluck',
    bass: 'bass',
    lead: 'keys',
    density: 0.28,
    comp: 'stab',
    bassLine: 'drive',
    groove: { kick: [0, 3, 6], snare: [2, 6], hat: [0, 1, 2, 3, 4, 5, 6, 7] },
  },
  // Rádio Brisa: calma, de fim de tarde
  brisa: {
    id: 'brisa',
    bpm: 84,
    swing: 0.1,
    root: 51,
    scale: MAJOR,
    progressions: [
      [0, 3, 1, 4],
      [5, 3, 0, 4],
    ],
    chord: 'pad',
    bass: 'bass',
    lead: 'keys',
    density: 0.25,
    comp: 'arp',
    bassLine: 'root',
    groove: { kick: [0], snare: [4], hat: [2, 6] },
  },
  // Rádio Chiclete: pop alegre, de refrão
  chiclete: {
    id: 'chiclete',
    bpm: 116,
    swing: 0,
    root: 60,
    scale: MIXO,
    progressions: [
      [0, 4, 5, 3],
      [0, 6, 3, 0],
      [3, 4, 0, 0],
    ],
    chord: 'keys',
    bass: 'bass',
    lead: 'lead',
    density: 0.6,
    comp: 'stab',
    bassLine: 'drive',
    groove: { kick: [0, 2, 4, 6], snare: [2, 6], hat: [1, 3, 5, 7] },
  },
  // Rádio Trovão: batida forte e rápida
  trovao: {
    id: 'trovao',
    bpm: 140,
    swing: 0,
    root: 52,
    scale: MINOR,
    progressions: [
      [0, 5, 6, 0],
      [0, 3, 5, 6],
      [5, 6, 0, 0],
    ],
    chord: 'power',
    bass: 'bass',
    lead: 'lead',
    density: 0.35,
    comp: 'power',
    bassLine: 'drive',
    groove: { kick: [0, 3, 4], snare: [2, 6], hat: [0, 1, 2, 3, 4, 5, 6, 7] },
  },
};

/** Compassos por frase (a sequência de acordes troca a cada frase). */
export const PHRASE_BARS = 4;

/** Nota da escala pelo grau (pode passar de 7: sobe oitava). */
export function degreeToMidi(style: StyleDef, degree: number): number {
  const n = style.scale.length;
  const oct = Math.floor(degree / n);
  const idx = ((degree % n) + n) % n;
  return style.root + oct * 12 + style.scale[idx];
}

/** Acorde do grau: tônica, terça, quinta e sétima empilhadas na escala. */
export function chordTones(style: StyleDef, degree: number, size = 4): number[] {
  return Array.from({ length: size }, (_, i) => degreeToMidi(style, degree + i * 2));
}

/** Segundos por tempo. */
export function beatSeconds(style: StyleDef): number {
  return 60 / style.bpm;
}

/** Posição em tempos da colcheia n (0 a 7), com o balanço do estilo. */
export function eighth(style: StyleDef, n: number): number {
  return n / 2 + (n % 2 === 1 ? style.swing * 0.5 : 0);
}

/** Que sequência de acordes uma frase usa (repetível pela semente). */
export function progressionFor(style: StyleDef, seed: number, phrase: number): number[] {
  const rnd = seeded(seed * 31 + phrase * 7919);
  return style.progressions[Math.floor(rnd() * style.progressions.length)];
}

/**
 * Compõe o compasso `bar` (4 tempos) do estilo. Mesma semente e mesmo
 * compasso dão sempre as mesmas notas.
 */
export function composeBar(style: StyleDef, seed: number, bar: number): NoteEvent[] {
  const phrase = Math.floor(bar / PHRASE_BARS);
  const prog = progressionFor(style, seed, phrase);
  const degree = prog[bar % prog.length];
  const next = prog[(bar + 1) % prog.length];
  const rnd = seeded(seed * 104729 + bar * 131 + 17);
  const out: NoteEvent[] = [];
  const tones = chordTones(style, degree);
  const e = (n: number) => eighth(style, n);

  // acordes
  if (style.comp === 'hold') {
    for (const m of tones) out.push({ at: 0, dur: 3.8, midi: m, inst: style.chord, vel: 0.5 });
    if (rnd() < 0.5) for (const m of tones.slice(1)) out.push({ at: e(5), dur: 1.2, midi: m, inst: style.chord, vel: 0.35 });
  } else if (style.comp === 'arp') {
    for (const m of tones) out.push({ at: 0, dur: 3.9, midi: m, inst: style.chord, vel: 0.35 });
    const order = [0, 1, 2, 3, 2, 1, 0, 2];
    order.forEach((k, i) => out.push({ at: e(i), dur: 0.5, midi: tones[k] + 12, inst: 'keys', vel: 0.3 }));
  } else if (style.comp === 'stab') {
    const hits = [0, 3, 4, 6].filter((_n, i) => i === 0 || rnd() < 0.7);
    for (const n of hits) for (const m of tones.slice(0, 3)) out.push({ at: e(n), dur: 0.35, midi: m + 12, inst: style.chord, vel: 0.45 });
  } else {
    // quinta de guitarra pesada, em colcheias
    for (let n = 0; n < 8; n++) {
      const v = n % 4 === 0 ? 0.7 : 0.45;
      out.push({ at: e(n), dur: 0.45, midi: tones[0], inst: 'power', vel: v });
      out.push({ at: e(n), dur: 0.45, midi: tones[0] + 7, inst: 'power', vel: v * 0.8 });
    }
  }

  // baixo
  const low = tones[0] - 12 * (tones[0] >= 52 ? 2 : 1);
  if (style.bassLine === 'root') {
    out.push({ at: 0, dur: 1.8, midi: low, inst: style.bass, vel: 0.7 }, { at: 2, dur: 1.8, midi: low + 7, inst: style.bass, vel: 0.5 });
  } else if (style.bassLine === 'walk') {
    const target = chordTones(style, next)[0] - 12 * (tones[0] >= 52 ? 2 : 1);
    const steps = [low, low + (rnd() < 0.5 ? 4 : 3), low + 7, target + (target > low ? -1 : 1)];
    steps.forEach((m, i) => out.push({ at: i, dur: 0.9, midi: m, inst: style.bass, vel: i === 0 ? 0.75 : 0.55 }));
  } else if (style.bassLine === 'bossa') {
    out.push(
      { at: 0, dur: 1.4, midi: low, inst: style.bass, vel: 0.7 },
      { at: 1.5, dur: 0.5, midi: low + 7, inst: style.bass, vel: 0.5 },
      { at: 2, dur: 1.4, midi: low + 7, inst: style.bass, vel: 0.6 },
      { at: 3.5, dur: 0.5, midi: low, inst: style.bass, vel: 0.5 },
    );
  } else {
    for (let n = 0; n < 8; n++) {
      const oct = style.id === 'chiclete' && n % 2 === 1 ? 12 : 0;
      out.push({ at: e(n), dur: 0.4, midi: low + oct, inst: style.bass, vel: n % 2 === 0 ? 0.7 : 0.5 });
    }
  }

  // melodia: passos na escala, nota do acorde no tempo forte
  if (style.lead) {
    let deg = degree + 7 + Math.floor(rnd() * 3) * 2;
    for (let n = 0; n < 8; n++) {
      if (rnd() >= style.density) continue;
      const strong = n % 2 === 0;
      if (strong) {
        // cai na nota do acorde mais perto
        const rel = ((deg - degree) % 7 + 7) % 7;
        if (rel % 2 === 1) deg += rnd() < 0.5 ? -1 : 1;
      } else deg += rnd() < 0.5 ? -1 : 1;
      deg = Math.max(degree + 4, Math.min(degree + 13, deg));
      const long = strong && rnd() < 0.35;
      out.push({ at: e(n), dur: long ? 1 : 0.45, midi: degreeToMidi(style, deg), inst: style.lead, vel: strong ? 0.55 : 0.4 });
    }
  }

  // bateria (a variação de cada compasso vem da semente)
  const g = style.groove;
  if (g) {
    for (const n of g.kick) out.push({ at: e(n), dur: 0.25, midi: 36, inst: 'kick', vel: n === 0 ? 0.9 : 0.7 });
    for (const n of g.snare) out.push({ at: e(n), dur: 0.25, midi: 38, inst: 'snare', vel: 0.7 });
    for (const n of g.hat) if (rnd() < 0.92) out.push({ at: e(n), dur: 0.1, midi: 42, inst: 'hat', vel: n % 2 === 0 ? 0.45 : 0.3 });
    for (const n of g.shaker ?? []) out.push({ at: e(n), dur: 0.15, midi: 70, inst: 'shaker', vel: n % 2 === 0 ? 0.3 : 0.45 });
    // virada no fim da frase
    if (bar % PHRASE_BARS === PHRASE_BARS - 1 && g.snare.length) {
      out.push({ at: e(7), dur: 0.12, midi: 38, inst: 'snare', vel: 0.5 }, { at: e(7) + 0.25, dur: 0.12, midi: 38, inst: 'snare', vel: 0.6 });
    }
  }
  return out.sort((a, b) => a.at - b.at);
}

/**
 * Bloco 7: tocar piano/teclado/flauta. A melodia sai da escala maior; quem
 * tem pouca Criatividade erra notas (meio tom fora) de vez em quando.
 */
export function playedNote(seed: number, n: number, creativity: number): { midi: number; wrong: boolean } {
  const rnd = seeded(seed * 7 + n * 613);
  const style = STYLES.brisa;
  const deg = 7 + Math.round(Math.sin(n * 0.7 + seed) * 3 + rnd() * 3);
  const wrong = rnd() < Math.max(0, 0.35 - creativity * 0.035);
  return { midi: degreeToMidi(style, deg) + (wrong ? 1 : 0), wrong };
}
