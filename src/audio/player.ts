// Bloco 7: toca um estilo de música (trilha do modo ou estação de rádio),
// compondo compasso a compasso um pouco à frente do relógio do áudio.

import { STYLES, beatSeconds, composeBar } from './compose';
import type { StyleDef } from './compose';
import type { AudioEngine } from './engine';

/** Como soa a saída: trilha limpa ou alto-falante pequeno/médio/grande. */
export type Voicing = 'clean' | 'radio' | 'speaker' | 'jukebox';

const LOOKAHEAD = 0.35;
const FADE = 0.6;

export class MusicPlayer {
  private gain: GainNode | null = null;
  private pan: StereoPannerNode | null = null;
  private hp: BiquadFilterNode | null = null;
  private lp: BiquadFilterNode | null = null;
  private style: StyleDef | null = null;
  private wanted: string | null = null;
  private switchAt = 0;
  private seed = 1;
  private bar = 0;
  private nextBarAt = 0;
  private level = 0;
  private voicing: Voicing = 'clean';

  constructor(private readonly engine: AudioEngine) {}

  private wire(): boolean {
    const ctx = this.engine.ctx;
    const bus = this.engine.bus('music');
    if (!ctx || !bus) return false;
    if (this.gain) return true;
    this.gain = ctx.createGain();
    this.gain.gain.value = 0;
    this.hp = ctx.createBiquadFilter();
    this.hp.type = 'highpass';
    this.hp.frequency.value = 20;
    this.lp = ctx.createBiquadFilter();
    this.lp.type = 'lowpass';
    this.lp.frequency.value = 16000;
    this.pan = ctx.createStereoPanner();
    this.gain.connect(this.hp).connect(this.lp).connect(this.pan).connect(bus);
    return true;
  }

  /** Estilo a tocar (null = silêncio). A troca passa por um fade curto. */
  setStyle(id: string | null): void {
    if (id === this.wanted) return;
    this.wanted = id;
    this.switchAt = this.engine.now + FADE;
    if (this.gain && this.engine.ctx) this.gain.gain.setTargetAtTime(0, this.engine.now, FADE / 4);
  }

  get current(): string | null {
    return this.wanted;
  }

  /** Volume (0 a 1) e posição (-1 a 1). */
  setLevel(level: number, pan = 0): void {
    this.level = level;
    if (!this.wire() || !this.engine.ctx) return;
    const now = this.engine.now;
    if (now >= this.switchAt) this.gain!.gain.setTargetAtTime(level, now, 0.15);
    this.pan!.pan.setTargetAtTime(Math.max(-1, Math.min(1, pan)), now, 0.15);
  }

  setVoicing(v: Voicing): void {
    if (v === this.voicing || !this.wire()) return;
    this.voicing = v;
    const now = this.engine.now;
    const [hp, lp] = v === 'radio' ? [380, 3600] : v === 'speaker' ? [120, 7000] : v === 'jukebox' ? [60, 9000] : [20, 16000];
    this.hp!.frequency.setTargetAtTime(hp, now, 0.05);
    this.lp!.frequency.setTargetAtTime(lp, now, 0.05);
  }

  /** Chame sempre (a cada quadro): compõe e agenda os próximos compassos. */
  pump(): void {
    if (!this.engine.ready || !this.wire()) return;
    const now = this.engine.now;
    if (this.style?.id !== this.wanted && now >= this.switchAt) {
      this.style = this.wanted ? STYLES[this.wanted] ?? null : null;
      this.seed = (Math.random() * 1e9) | 0;
      this.bar = 0;
      this.nextBarAt = now + 0.05;
      this.gain!.gain.setTargetAtTime(this.level, now, 0.2);
    }
    const style = this.style;
    if (!style || this.level <= 0.001) {
      // sem som: não agenda, mas mantém o relógio andando
      if (style) while (this.nextBarAt < now) this.advance(style);
      return;
    }
    if (this.nextBarAt < now - 1) this.nextBarAt = now + 0.05;
    const beat = beatSeconds(style);
    while (this.nextBarAt < now + LOOKAHEAD) {
      for (const ev of composeBar(style, this.seed, this.bar)) this.engine.note(ev, this.nextBarAt + ev.at * beat, beat, this.gain!);
      this.advance(style);
    }
  }

  private advance(style: StyleDef): void {
    this.nextBarAt += 4 * beatSeconds(style);
    this.bar++;
  }
}
