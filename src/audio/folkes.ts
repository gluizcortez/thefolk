// Bloco 7: o "folquês", a fala inventada dos folks. Aqui só a parte pura
// (voz de cada um, sílabas e entonação), que os testes conferem; o som é
// feito em audio/engine.ts. As sílabas não querem dizer nada de propósito.

import type { Folk, SocialCategory } from '../sim/types';

/** Jeito da fala (vem do tipo de conversa e de como ela vai). */
export type Tone = 'happy' | 'romantic' | 'argue' | 'work' | 'sad' | 'calm';

export interface Voice {
  /** altura média da voz, em Hz */
  pitch: number;
  /** multiplica as formantes (boca maior ou menor) */
  formant: number;
  /** sílabas por segundo */
  rate: number;
  /** 0 a 1: quanto ar na voz */
  breath: number;
  /** 0 a 1: quanto a voz sobe e desce */
  swing: number;
}

export interface Syllable {
  /** consoante de abertura ('' = começa na vogal) */
  c: string;
  v: Vowel;
  /** segundos */
  dur: number;
  /** Hz no começo e no fim da vogal */
  from: number;
  to: number;
  /** 0 a 1 */
  gain: number;
  /** pausa depois (fim de palavra) */
  gap: number;
}

export type Vowel = 'a' | 'e' | 'i' | 'o' | 'u';
export const VOWELS: Vowel[] = ['a', 'e', 'i', 'o', 'u'];
/** consoantes macias (carinho, calma) e duras (briga) */
export const SOFT = ['m', 'n', 'l', 'b', 'v', 'w', 'y', ''];
export const HARD = ['k', 't', 'g', 'z', 'p', 'd', 'x', 'r'];
/** fricativas viram chiado; o resto é estalo ou som de nariz */
export const FRICATIVES = new Set(['z', 'v', 'x', 's', 'f']);
export const PLOSIVES = new Set(['k', 't', 'g', 'p', 'd', 'b']);

/** Formantes (F1, F2) de cada vogal, em Hz, numa boca média. */
export const FORMANTS: Record<Vowel, [number, number]> = {
  a: [780, 1250],
  e: [480, 1850],
  i: [300, 2250],
  o: [500, 900],
  u: [330, 780],
};

interface ToneShape {
  rate: number;
  pitch: number;
  /** subida do começo ao fim da frase (fração da altura) */
  slope: number;
  /** variação de sílaba para sílaba (fração) */
  jitter: number;
  gain: number;
  /** chance de consoante dura */
  hard: number;
  /** a última sílaba sobe (pergunta, alegria) ou desce */
  end: number;
}

export const TONES: Record<Tone, ToneShape> = {
  happy: { rate: 1.1, pitch: 1.12, slope: 0.08, jitter: 0.16, gain: 0.85, hard: 0.25, end: 0.18 },
  romantic: { rate: 0.72, pitch: 0.93, slope: -0.05, jitter: 0.08, gain: 0.6, hard: 0.05, end: 0.1 },
  argue: { rate: 1.38, pitch: 1.22, slope: -0.12, jitter: 0.2, gain: 1, hard: 0.75, end: -0.22 },
  work: { rate: 1, pitch: 1, slope: -0.03, jitter: 0.06, gain: 0.75, hard: 0.4, end: -0.06 },
  sad: { rate: 0.78, pitch: 0.88, slope: -0.14, jitter: 0.05, gain: 0.55, hard: 0.15, end: -0.15 },
  calm: { rate: 0.95, pitch: 1, slope: -0.04, jitter: 0.1, gain: 0.7, hard: 0.3, end: 0 },
};

/** Número de 0 a 1 tirado de um texto (sempre o mesmo para o mesmo texto). */
export function hash01(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 100000) / 100000;
}

/** Gerador simples e repetível (não mexe no RNG do mundo). */
export function seeded(seed: number): () => number {
  let a = seed >>> 0 || 1;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * A voz de cada folk: a altura sai do nome (sempre a mesma), o corpo deixa
 * mais grave, o Pique acelera, a Expansão faz subir e descer mais e o Afeto
 * põe ar na voz.
 */
export function voiceOf(folk: Pick<Folk, 'id' | 'name' | 'look' | 'temper'> & { voice?: number }): Voice {
  // plano 2, bloco 10: tom de voz escolhido no criador (0 grave a 20 agudo)
  const h = folk.voice !== undefined ? folk.voice / 20 : hash01(`${folk.id}:${folk.name}`);
  const h2 = hash01(`${folk.name}#voz`);
  // corpo de 0 (magro) a 20 (forte); 10 é o médio de antes
  const body = (folk.look?.body ?? 10) / 10;
  const t = folk.temper;
  const pitch = (105 + h * 135) * (1.08 - body * 0.08);
  return {
    pitch,
    formant: 0.88 + h2 * 0.26 - body * 0.04,
    rate: 4.2 + ((t?.pep ?? 5) - 5) * 0.22,
    breath: 0.15 + (t?.warmth ?? 5) * 0.04,
    swing: 0.5 + ((t?.outgoing ?? 5) - 5) * 0.08,
  };
}

/** Tom da fala pelo tipo de conversa (e se o outro topou). */
export function toneOf(category: SocialCategory | undefined, anim?: string, rejected = false): Tone {
  if (rejected) return 'sad';
  if (anim === 'argue' || category === 'mean') return 'argue';
  if (category === 'romantic') return 'romantic';
  if (category === 'professional') return 'work';
  if (category === 'friendly') return 'happy';
  return 'calm';
}

/** Uma fala de 2 a 4 palavras inventadas, com entonação pelo tom. */
export function utterance(voice: Voice, tone: Tone, seed: number): Syllable[] {
  const rnd = seeded(seed);
  const shape = TONES[tone];
  const words = 2 + Math.floor(rnd() * 3);
  const out: Syllable[] = [];
  const base = voice.pitch * shape.pitch;
  const beat = 1 / (voice.rate * shape.rate);
  const sylls: { word: number; last: boolean }[] = [];
  for (let w = 0; w < words; w++) {
    const n = 1 + Math.floor(rnd() * 3);
    for (let i = 0; i < n; i++) sylls.push({ word: w, last: i === n - 1 });
  }
  sylls.forEach((s, i) => {
    const along = sylls.length > 1 ? i / (sylls.length - 1) : 0;
    const jitter = (rnd() * 2 - 1) * shape.jitter * voice.swing;
    const start = base * (1 + shape.slope * along + jitter);
    const final = i === sylls.length - 1;
    const glide = final ? shape.end : (rnd() - 0.5) * shape.jitter * 0.5;
    const pool = rnd() < shape.hard ? HARD : SOFT;
    out.push({
      c: pool[Math.floor(rnd() * pool.length)],
      v: VOWELS[Math.floor(rnd() * VOWELS.length)],
      dur: beat * (final ? 1.6 : 0.8 + rnd() * 0.4),
      from: start,
      to: start * (1 + glide),
      gain: shape.gain * (s.last ? 0.85 : 1) * (0.85 + rnd() * 0.15),
      gap: s.last && !final ? beat * (0.25 + rnd() * 0.35) : 0,
    });
  });
  return out;
}

/** Duração total da fala, em segundos. */
export function utteranceLength(sylls: Syllable[]): number {
  return sylls.reduce((sum, s) => sum + s.dur + s.gap, 0);
}

/** A fala escrita (para testes e para quem quiser ler): "Bale mizo tu!". */
export function phraseText(sylls: Syllable[], tone: Tone): string {
  const words: string[] = [];
  let cur = '';
  for (const s of sylls) {
    cur += (s.c === 'x' ? 'ch' : s.c) + s.v;
    if (s.gap > 0) {
      words.push(cur);
      cur = '';
    }
  }
  if (cur) words.push(cur);
  const text = words.join(' ');
  const mark = tone === 'argue' ? '!' : tone === 'happy' ? '!' : tone === 'sad' ? '...' : '.';
  return text.charAt(0).toUpperCase() + text.slice(1) + mark;
}

// ---------- plano 2, bloco 7: a boca acompanha as sílabas ----------

/** Abertura da boca numa vogal: 2 = bem aberta (a, o), 1 = meio (e, i, u). */
export function mouthOfVowel(v: Vowel): 1 | 2 {
  return v === 'a' || v === 'o' ? 2 : 1;
}

/**
 * Abertura da boca `t` segundos depois do começo da fala: fechada na
 * consoante e na pausa entre palavras, aberta na vogal. Depois do fim, -1.
 */
export function mouthAt(sylls: Syllable[], t: number): -1 | 0 | 1 | 2 {
  if (t < 0) return 0;
  let at = 0;
  for (const s of sylls) {
    const cons = s.c ? Math.min(0.06, s.dur * 0.3) : 0;
    if (t < at + cons) return 0;
    if (t < at + s.dur * 0.92) return mouthOfVowel(s.v);
    if (t < at + s.dur + s.gap) return 0;
    at += s.dur + s.gap;
  }
  return -1;
}

/** Falas que estão tocando agora, por folk (o som as registra; a boca lê daqui). */
const live = new Map<number, { start: number; sylls: Syllable[] }>();

/** O som começou a falar `sylls` no instante `start` (segundos, relógio da tela). */
export function sayLive(folkId: number, sylls: Syllable[], start: number): void {
  live.set(folkId, { start, sylls });
}

/**
 * Boca do folk agora: segue a fala que o som está tocando; sem som (mudo,
 * ou o áudio ainda não começou), inventa falas no mesmo ritmo, com pausas
 * entre uma e outra, para a boca nunca bater sem compasso.
 */
export function speechMouth(folkId: number, voice: Voice, tone: Tone, now: number): 0 | 1 | 2 {
  const cur = live.get(folkId);
  if (cur) {
    const m = mouthAt(cur.sylls, now - cur.start);
    if (m >= 0) return m as 0 | 1 | 2;
    if (now - cur.start < utteranceLength(cur.sylls) + 1.2) return 0;
    live.delete(folkId);
  }
  // sem fala registrada: frases de ~3 s com respiro, sorteadas pelo compasso
  const SLOT = 3.2;
  const slot = Math.floor(now / SLOT + (folkId % 7) * 0.13);
  const sylls = utterance(voice, tone, folkId * 7919 + slot * 31);
  const m = mouthAt(sylls, now - (slot - (folkId % 7) * 0.13) * SLOT);
  return m < 0 ? 0 : (m as 0 | 1 | 2);
}
