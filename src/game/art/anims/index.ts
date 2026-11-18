import { ACTIVITY } from './activity';
import type { Alias, Clip, Track, Tracks } from './clip';
import { GESTURES } from './gestures';
import { LOCOMOTION } from './locomotion';
import { JOINTS, blendPose, rest, smoothstep } from './pose';
import type { Joint, Pose } from './pose';
import { SOCIAL } from './social';
import { CHORES } from './chores';
import { HOBBIES, SOCIAL_MORE } from './hobbies';

// Plano 2, bloco 5: biblioteca de animações. Junta as animações (dados) e
// sabe tocá-las: lê cada canal num instante, põe a camada de postura (humor,
// cansaço, respiração), dobra as pernas de quem está sentado, escolhe a
// variação do laço e mistura uma animação na outra sem troca seca.

export { HIPS_Y, JOINTS, blendPose, rest, smoothstep, poseDistance } from './pose';
export type { Joint, Pose } from './pose';
export type { Clip, Track } from './clip';

export const CLIPS = { ...GESTURES, ...LOCOMOTION, ...SOCIAL, ...ACTIVITY, ...CHORES, ...HOBBIES, ...SOCIAL_MORE } satisfies Record<string, Clip>;

export type FolkAnim = keyof typeof CLIPS;

const TABLE: Record<string, Clip> = CLIPS;

export function isAnim(name: string): name is FolkAnim {
  return name in TABLE;
}

const WAVES = {
  sin: (x: number) => Math.sin(x),
  abs: (x: number) => Math.abs(Math.sin(x)),
  pos: (x: number) => Math.max(0, Math.sin(x)),
  neg: (x: number) => Math.max(0, -Math.sin(x)),
};

/** Valor de um canal no instante t (segundos de animação). */
export function trackValue(tr: Track, t: number): number {
  if (typeof tr === 'number') return tr;
  if (Array.isArray(tr)) {
    let s = 0;
    for (const x of tr) s += trackValue(x, t);
    return s;
  }
  if ('len' in tr) {
    const keys = tr.k;
    if (keys.length === 0) return 0;
    const u = (((t / tr.len) % 1) + 1) % 1;
    for (let i = 0; i < keys.length - 1; i++) {
      const [t0, v0] = keys[i];
      const [t1, v1] = keys[i + 1];
      if (u >= t0 && u <= t1) {
        const w = t1 > t0 ? (u - t0) / (t1 - t0) : 0;
        return v0 + (v1 - v0) * (0.5 - 0.5 * Math.cos(Math.PI * w));
      }
    }
    return keys[keys.length - 1][1];
  }
  return (tr.b ?? 0) + tr.a * WAVES[tr.sh ?? 'sin'](tr.f * t + (tr.ph ?? 0));
}

/** Canais de atalho: para onde cada um vai, e com que peso. */
const ALIASES: Record<Alias, [Joint, number][]> = {
  torsoX: [['spineX', 0.45], ['chestX', 0.55]],
  torsoY: [['spineY', 0.4], ['chestY', 0.6]],
  torsoZ: [['spineZ', 0.5], ['chestZ', 0.5]],
  legOut: [['legLOut', 1], ['legROut', 1]],
  legsX: [['legLX', 1], ['legRX', 1]],
  knees: [['kneeL', 1], ['kneeR', 1]],
  armsX: [['armLX', 1], ['armRX', 1]],
  armsOut: [['armLOut', 1], ['armROut', 1]],
  elbows: [['elbowL', 1], ['elbowR', 1]],
  grips: [['gripL', 1], ['gripR', 1]],
  shoulders: [['shoulderL', 1], ['shoulderR', 1]],
};

/** Canais de uma animação já com a herança (`base`) resolvida. */
function tracksOf(name: string, depth = 0): Tracks {
  const clip = TABLE[name] ?? TABLE.idle;
  if (!clip.base || depth > 4) return clip.tracks;
  return { ...tracksOf(clip.base, depth + 1), ...clip.tracks };
}

function flagOf<K extends 'still' | 'ownLegs'>(name: string, key: K): boolean {
  let clip: Clip | undefined = TABLE[name];
  for (let i = 0; clip && i < 5; i++) {
    if (clip[key] !== undefined) return !!clip[key];
    clip = clip.base ? TABLE[clip.base] : undefined;
  }
  return false;
}

/** Escreve canais (juntas ou atalhos) numa pose. Atalho só preenche junta que a animação não deu. */
function apply(p: Pose, tracks: Tracks, t: number): void {
  const direct = new Set<string>();
  for (const [key, tr] of Object.entries(tracks)) {
    if (tr === undefined || key in ALIASES) continue;
    p[key as Joint] = trackValue(tr, t);
    direct.add(key);
  }
  for (const [key, tr] of Object.entries(tracks)) {
    if (tr === undefined || !(key in ALIASES)) continue;
    const v = trackValue(tr, t);
    for (const [j, w] of ALIASES[key as Alias]) {
      if (direct.has(j)) continue;
      // tronco: o atalho soma ao que já tem; os outros atalhos põem o valor
      if (key.startsWith('torso')) p[j] += v * w;
      else p[j] = v * w;
    }
  }
}

/** Pernas de sempre de quem está sentado. */
const SEATED: Tracks = { hipsY: 0.1, legsX: -1.5, knees: 1.45, legOut: 0.06, ankleL: 0, ankleR: 0 };

export interface PoseCtx {
  /** humor 0..100 (postura) */
  mood: number;
  /** energia 0..100 (cansaço) */
  energy?: number;
  /** sentado: as pernas dobram por baixo de qualquer animação */
  seated?: boolean;
}

/** Pose de uma animação no instante t. */
export function sampleClip(name: string, t: number, ctx: PoseCtx, out: Pose = rest()): Pose {
  const base = rest();
  for (const j of JOINTS) out[j] = base[j];
  apply(out, tracksOf(name), t);
  const clip = TABLE[name] ?? TABLE.idle;

  if (ctx.seated && !flagOf(name, 'ownLegs')) {
    for (const j of ['legLX', 'legRX', 'legLOut', 'legROut', 'kneeL', 'kneeR', 'ankleL', 'ankleR', 'hipsSway', 'hipsRoll', 'hipsYaw'] as const) {
      out[j] = base[j];
    }
    apply(out, SEATED, t);
    if (clip.seat) apply(out, clip.seat, t);
    out.hipsY = 0.1;
    out.spineX -= 0.06;
    out.chestX -= 0.06;
  }

  // respiração: o peito sobe e desce sempre, até dormindo
  const breathe = Math.sin(t * 1.8);
  out.chestX += 0.015 * breathe;
  out.shoulderL += 0.006 * breathe;
  out.shoulderR += 0.006 * breathe;
  if (flagOf(name, 'still')) return out;

  // postura: cabisbaixo quando o humor está ruim, peito aberto quando está
  // ótimo; cansado, a cabeça pesa e os ombros caem
  const tired = Math.min(1, Math.max(0, (25 - (ctx.energy ?? 100)) / 20));
  const slump = Math.min(1, Math.max(0, (55 - ctx.mood) / 40));
  const perky = Math.min(1, Math.max(0, (ctx.mood - 70) / 30));
  out.spineX += 0.08 * slump + 0.03 * tired;
  out.chestX += 0.12 * slump - 0.05 * perky + 0.05 * tired;
  out.neckX += 0.08 * slump + 0.06 * tired;
  out.headX += 0.16 * slump - 0.06 * perky + 0.1 * tired;
  out.shoulderL += -0.015 * slump + 0.01 * perky - 0.01 * tired;
  out.shoulderR += -0.015 * slump + 0.01 * perky - 0.01 * tired;
  return out;
}

function hash(n: number): number {
  let h = Math.imul(n ^ 0x9e3779b9, 0x85ebca6b);
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35);
  h ^= h >>> 16;
  return h >>> 0;
}

/**
 * Variação do laço que toca agora. A primeira da lista aparece mais (metade
 * das vezes); as outras se revezam. Cada folk tem o seu compasso (seed).
 */
export function variantOf(name: FolkAnim, seed: number, t: number): FolkAnim {
  const clip = TABLE[name];
  const list = clip?.variants;
  if (!list || list.length < 2) return name;
  const every = clip.every ?? 10;
  const slot = Math.floor(t / every + (seed % 97) * 0.37);
  const h = hash(slot * 131 + seed);
  if (h % 2 === 0) return list[0] as FolkAnim;
  return list[1 + ((h >>> 1) % (list.length - 1))] as FolkAnim;
}

/** Tempo de transição entre duas animações, em segundos reais. */
export const BLEND_TIME = 0.32;

/**
 * Mistura de poses-alvo: quando a animação muda, a pose sai da última pose
 * mostrada (congelada) e vai para a nova animação viva, numa curva suave.
 */
export class PoseMixer {
  private key = '';
  private from: Pose | null = null;
  private since = 0;
  private last = rest();
  private live = rest();

  constructor(readonly fade = BLEND_TIME) {}

  /** Pose-alvo deste quadro. `dt` em segundos reais, `t` em segundos de animação. */
  target(name: FolkAnim, t: number, dt: number, ctx: PoseCtx): Pose {
    const key = `${name}|${ctx.seated ? 1 : 0}`;
    if (key !== this.key) {
      if (this.key) this.from = { ...this.last };
      this.key = key;
      this.since = 0;
    } else this.since += dt;
    sampleClip(name, t, ctx, this.live);
    if (this.from && this.since < this.fade) blendPose(this.from, this.live, smoothstep(this.since / this.fade), this.last);
    else {
      this.from = null;
      for (const j of JOINTS) this.last[j] = this.live[j];
    }
    return this.last;
  }

  /** Quanto da transição já passou (1 = assentada). */
  get progress(): number {
    return this.from ? Math.min(1, this.since / this.fade) : 1;
  }
}
