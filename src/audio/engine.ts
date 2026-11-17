// Bloco 7: tudo o que soa no jogo é sintetizado aqui, com WebAudio (sem
// arquivo de som nenhum). Três canais (música, efeitos e vozes) com volume
// próprio, e uma saída levemente "de placa de som antiga": agudos aparados e
// um pouco de degrau na amplitude.

import type { Instrument, NoteEvent } from './compose';
import { FORMANTS, FRICATIVES, PLOSIVES } from './folkes';
import type { Syllable, Voice } from './folkes';
import { busGain } from './prefs';
import type { AudioPrefs } from './prefs';

export type Bus = 'music' | 'sfx' | 'voice';

/** Efeitos curtos. */
export type SfxName =
  | 'step:soft'
  | 'step:wood'
  | 'step:hard'
  | 'step:grass'
  | 'flush'
  | 'fridge'
  | 'door'
  | 'bell'
  | 'phone'
  | 'dial'
  | 'register'
  | 'coins'
  | 'thunk'
  | 'hammer'
  | 'brush'
  | 'buzz'
  | 'click'
  | 'open'
  | 'close'
  | 'chime'
  | 'fanfare'
  | 'sad'
  | 'clunk'
  | 'switch'
  | 'mail'
  | 'page'
  | 'splash'
  | 'punch'
  | 'yawn'
  | 'alarm'
  | 'honk';

/** Sons que duram enquanto a ação dura. */
export type LoopName = 'water' | 'sizzle' | 'tv' | 'typing' | 'scrub' | 'clink' | 'pedal' | 'game' | 'bubbles' | 'saw';

const mtof = (m: number) => 440 * Math.pow(2, (m - 69) / 12);

interface LoopHandle {
  gain: GainNode;
  pan: StereoPannerNode;
  stop: () => void;
}

export class AudioEngine {
  ctx: AudioContext | null = null;
  private buses = new Map<Bus, GainNode>();
  private noise: AudioBuffer | null = null;
  private loops = new Map<string, LoopHandle>();
  private prefs: AudioPrefs;

  constructor(prefs: AudioPrefs) {
    this.prefs = prefs;
  }

  /** O navegador só deixa tocar depois de um clique ou tecla: chame aqui. */
  unlock(): void {
    if (!this.ctx) {
      const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return;
      this.ctx = new Ctor();
      this.build(this.ctx);
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume();
  }

  get ready(): boolean {
    return !!this.ctx && this.ctx.state === 'running';
  }

  get now(): number {
    return this.ctx?.currentTime ?? 0;
  }

  setPrefs(p: AudioPrefs): void {
    this.prefs = p;
    if (!this.ctx) return;
    for (const [bus, node] of this.buses) node.gain.setTargetAtTime(busGain(p, bus), this.ctx.currentTime, 0.05);
  }

  bus(name: Bus): AudioNode | null {
    return this.buses.get(name) ?? null;
  }

  private build(ctx: AudioContext): void {
    // saída: agudos aparados e um degrau leve na amplitude (10 bits)
    const tone = ctx.createBiquadFilter();
    tone.type = 'lowpass';
    tone.frequency.value = 9500;
    const crush = ctx.createWaveShaper();
    const n = 2048;
    const curve = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const x = (i / (n - 1)) * 2 - 1;
      const soft = Math.tanh(x * 1.3) / Math.tanh(1.3);
      curve[i] = Math.round(soft * 512) / 512;
    }
    crush.curve = curve;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -14;
    comp.ratio.value = 3;
    tone.connect(crush).connect(comp).connect(ctx.destination);
    for (const bus of ['music', 'sfx', 'voice'] as Bus[]) {
      const g = ctx.createGain();
      g.gain.value = busGain(this.prefs, bus);
      g.connect(tone);
      this.buses.set(bus, g);
    }
    const len = ctx.sampleRate;
    this.noise = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = this.noise.getChannelData(0);
    let seed = 12345;
    for (let i = 0; i < len; i++) {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      data[i] = (seed / 0x7fffffff) * 2 - 1;
    }
  }

  // ---------- peças básicas ----------

  /** Ganho com volume e posição (pan de -1 a 1) indo para o canal. */
  private out(bus: Bus | AudioNode, gain: number, pan = 0): GainNode | null {
    const ctx = this.ctx;
    const dest = bus instanceof AudioNode ? bus : this.buses.get(bus);
    if (!ctx || !dest) return null;
    const g = ctx.createGain();
    g.gain.value = gain;
    if (pan) {
      const p = ctx.createStereoPanner();
      p.pan.value = Math.max(-1, Math.min(1, pan));
      g.connect(p).connect(dest);
    } else g.connect(dest);
    return g;
  }

  private osc(type: OscillatorType, freq: number, at: number, until: number, dest: AudioNode): OscillatorNode {
    const o = this.ctx!.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(freq, at);
    o.connect(dest);
    o.start(at);
    o.stop(until + 0.05);
    return o;
  }

  private env(at: number, attack: number, peak: number, decay: number, dest: AudioNode, sustain = 0): GainNode {
    const g = this.ctx!.createGain();
    g.gain.setValueAtTime(0.0001, at);
    g.gain.linearRampToValueAtTime(peak, at + attack);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0001, sustain || 0.0001), at + attack + decay);
    g.connect(dest);
    return g;
  }

  private noiseBurst(at: number, dur: number, type: BiquadFilterType, freq: number, q: number, peak: number, dest: AudioNode, attack = 0.002): void {
    const ctx = this.ctx!;
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    src.loop = true;
    const f = ctx.createBiquadFilter();
    f.type = type;
    f.frequency.value = freq;
    f.Q.value = q;
    const g = this.env(at, attack, peak, dur, dest);
    src.connect(f).connect(g);
    src.start(at, Math.random() * 0.5);
    src.stop(at + attack + dur + 0.05);
  }

  private blip(at: number, type: OscillatorType, freq: number, dur: number, peak: number, dest: AudioNode, slideTo?: number, attack = 0.004): void {
    const g = this.env(at, attack, peak, dur, dest);
    const o = this.osc(type, freq, at, at + attack + dur, g);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, at + attack + dur);
  }

  // ---------- instrumentos ----------

  /** Toca uma nota de música no destino (canal de música ou o do rádio). */
  note(ev: NoteEvent, when: number, beat: number, dest: AudioNode): void {
    const ctx = this.ctx;
    if (!ctx) return;
    const at = when;
    const dur = Math.max(0.05, ev.dur * beat);
    const f = mtof(ev.midi);
    const v = ev.vel;
    const inst: Instrument = ev.inst;
    if (inst === 'keys') {
      // piano elétrico: senoide modulada por outra (o "sino" some depressa)
      const g = this.env(at, 0.005, 0.22 * v, dur + 0.6, dest);
      const car = this.osc('sine', f, at, at + dur + 0.7, g);
      const mod = ctx.createOscillator();
      mod.frequency.value = f;
      const depth = ctx.createGain();
      depth.gain.setValueAtTime(f * 1.6, at);
      depth.gain.exponentialRampToValueAtTime(f * 0.08, at + 0.5);
      mod.connect(depth).connect(car.frequency);
      mod.start(at);
      mod.stop(at + dur + 0.75);
    } else if (inst === 'pad') {
      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 1100;
      const g = this.env(at, 0.6, 0.07 * v, dur + 0.8, dest, 0.03 * v);
      lp.connect(g);
      this.osc('sawtooth', f * 1.004, at, at + dur + 1.4, lp);
      this.osc('sawtooth', f * 0.996, at, at + dur + 1.4, lp);
    } else if (inst === 'bass') {
      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.setValueAtTime(900, at);
      lp.frequency.exponentialRampToValueAtTime(220, at + Math.min(dur, 0.4));
      const g = this.env(at, 0.008, 0.3 * v, dur + 0.1, dest);
      lp.connect(g);
      this.osc('triangle', f, at, at + dur + 0.15, lp);
      this.osc('square', f, at, at + dur + 0.15, this.env(at, 0.004, 0.05 * v, 0.12, lp));
    } else if (inst === 'lead') {
      const g = this.env(at, 0.02, 0.12 * v, dur + 0.25, dest);
      const o = this.osc('square', f, at, at + dur + 0.3, g);
      const vib = ctx.createOscillator();
      vib.frequency.value = 5.5;
      const vd = ctx.createGain();
      vd.gain.value = f * 0.006;
      vib.connect(vd).connect(o.frequency);
      vib.start(at);
      vib.stop(at + dur + 0.3);
    } else if (inst === 'marimba') {
      this.blip(at, 'sine', f, 0.35, 0.3 * v, dest);
      this.blip(at, 'sine', f * 4, 0.06, 0.06 * v, dest);
    } else if (inst === 'pluck') {
      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.setValueAtTime(3200, at);
      lp.frequency.exponentialRampToValueAtTime(400, at + 0.25);
      lp.connect(this.env(at, 0.003, 0.1 * v, Math.min(0.5, dur + 0.15), dest));
      this.osc('square', f, at, at + dur + 0.25, lp);
    } else if (inst === 'power') {
      const shaper = ctx.createWaveShaper();
      const c = new Float32Array(256);
      for (let i = 0; i < 256; i++) c[i] = Math.tanh(((i / 255) * 2 - 1) * 6);
      shaper.curve = c;
      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 2200;
      shaper.connect(lp).connect(this.env(at, 0.004, 0.06 * v, dur + 0.05, dest));
      this.osc('sawtooth', f, at, at + dur + 0.1, shaper);
      this.osc('sawtooth', f * 1.006, at, at + dur + 0.1, shaper);
    } else if (inst === 'kick') {
      this.blip(at, 'sine', 120, 0.22, 0.6 * v, dest, 42, 0.002);
    } else if (inst === 'snare') {
      this.noiseBurst(at, 0.14, 'bandpass', 1900, 0.8, 0.35 * v, dest);
      this.blip(at, 'triangle', 190, 0.07, 0.15 * v, dest, 150, 0.002);
    } else if (inst === 'hat') {
      this.noiseBurst(at, 0.04, 'highpass', 7500, 0.7, 0.16 * v, dest);
    } else if (inst === 'shaker') {
      this.noiseBurst(at, 0.06, 'bandpass', 5200, 1.2, 0.14 * v, dest, 0.02);
    }
  }

  // ---------- efeitos ----------

  sfx(name: SfxName, gain = 1, pan = 0): void {
    const ctx = this.ctx;
    if (!ctx || gain <= 0.01) return;
    const d = this.out('sfx', gain, pan);
    if (!d) return;
    const t = ctx.currentTime + 0.005;
    switch (name) {
      case 'step:soft':
        this.noiseBurst(t, 0.06, 'lowpass', 500, 0.7, 0.18, d, 0.01);
        break;
      case 'step:wood':
        this.blip(t, 'triangle', 170 + Math.random() * 30, 0.05, 0.16, d, 110);
        this.noiseBurst(t, 0.04, 'bandpass', 900, 1.5, 0.1, d);
        break;
      case 'step:hard':
        this.noiseBurst(t, 0.035, 'bandpass', 2600 + Math.random() * 600, 2, 0.16, d);
        this.blip(t, 'square', 320, 0.02, 0.03, d, 200);
        break;
      case 'step:grass':
        this.noiseBurst(t, 0.09, 'bandpass', 3200, 0.6, 0.08, d, 0.02);
        break;
      case 'flush': {
        this.noiseBurst(t, 1.4, 'lowpass', 1400, 0.5, 0.35, d, 0.05);
        this.noiseBurst(t + 0.3, 1.1, 'bandpass', 500, 1, 0.2, d, 0.2);
        this.blip(t + 1.2, 'sine', 300, 0.4, 0.05, d, 700);
        break;
      }
      case 'fridge':
        this.blip(t, 'sine', 90, 0.12, 0.3, d, 60, 0.002);
        this.noiseBurst(t, 0.08, 'lowpass', 600, 0.5, 0.12, d);
        break;
      case 'door':
        this.blip(t, 'sawtooth', 210, 0.25, 0.04, d, 330, 0.06);
        this.blip(t + 0.32, 'sine', 95, 0.18, 0.35, d, 55, 0.002);
        this.noiseBurst(t + 0.32, 0.08, 'lowpass', 900, 0.5, 0.15, d);
        break;
      case 'bell':
        this.blip(t, 'sine', 988, 0.7, 0.22, d);
        this.blip(t, 'sine', 988 * 2.76, 0.2, 0.05, d);
        this.blip(t + 0.42, 'sine', 784, 1.1, 0.22, d);
        this.blip(t + 0.42, 'sine', 784 * 2.76, 0.25, 0.05, d);
        break;
      case 'phone':
        for (let r = 0; r < 2; r++) {
          for (let i = 0; i < 10; i++) {
            const at = t + r * 0.55 + i * 0.04;
            this.blip(at, 'square', i % 2 ? 1200 : 1450, 0.03, 0.05, d);
          }
        }
        break;
      case 'dial':
        for (let i = 0; i < 6; i++) {
          const at = t + i * 0.13;
          const row = [697, 770, 852, 941][Math.floor(Math.random() * 4)];
          const col = [1209, 1336, 1477][Math.floor(Math.random() * 3)];
          this.blip(at, 'sine', row, 0.08, 0.06, d);
          this.blip(at, 'sine', col, 0.08, 0.06, d);
        }
        break;
      case 'register':
        this.noiseBurst(t, 0.06, 'bandpass', 1500, 2, 0.15, d);
        this.blip(t + 0.08, 'triangle', 2093, 0.5, 0.14, d);
        this.blip(t + 0.08, 'triangle', 2637, 0.6, 0.11, d);
        this.blip(t + 0.12, 'sine', 3136, 0.5, 0.06, d);
        break;
      case 'coins':
        for (let i = 0; i < 5; i++) this.blip(t + i * 0.05 + Math.random() * 0.02, 'triangle', 2400 + Math.random() * 1600, 0.12, 0.06, d);
        break;
      case 'thunk':
        this.blip(t, 'sine', 140, 0.14, 0.35, d, 60, 0.002);
        this.noiseBurst(t, 0.05, 'lowpass', 1200, 0.5, 0.1, d);
        break;
      case 'hammer':
        for (let i = 0; i < 2; i++) {
          this.blip(t + i * 0.16, 'square', 520, 0.04, 0.08, d, 300, 0.001);
          this.noiseBurst(t + i * 0.16, 0.05, 'bandpass', 2400, 2, 0.15, d);
        }
        break;
      case 'brush':
        this.noiseBurst(t, 0.22, 'bandpass', 2000, 0.6, 0.12, d, 0.06);
        this.noiseBurst(t + 0.2, 0.2, 'bandpass', 1500, 0.6, 0.1, d, 0.05);
        break;
      case 'buzz':
        this.blip(t, 'square', 140, 0.16, 0.08, d);
        this.blip(t + 0.18, 'square', 110, 0.2, 0.08, d);
        break;
      case 'click':
        this.blip(t, 'square', 1800, 0.012, 0.05, d, 900, 0.001);
        break;
      case 'open':
        this.noiseBurst(t, 0.12, 'bandpass', 3000, 0.8, 0.07, d, 0.03);
        this.blip(t, 'sine', 600, 0.08, 0.05, d, 900);
        break;
      case 'close':
        this.noiseBurst(t, 0.1, 'bandpass', 2200, 0.8, 0.06, d, 0.02);
        this.blip(t, 'sine', 800, 0.08, 0.04, d, 520);
        break;
      case 'chime':
        [72, 76, 79, 84].forEach((m, i) => this.blip(t + i * 0.08, 'triangle', mtof(m), 0.45, 0.09, d));
        break;
      case 'fanfare':
        [67, 72, 76, 79, 76, 79].forEach((m, i) => this.blip(t + i * 0.11, 'square', mtof(m), i === 5 ? 0.7 : 0.14, 0.06, d));
        break;
      case 'sad':
        [67, 66, 65, 64].forEach((m, i) => this.blip(t + i * 0.22, 'triangle', mtof(m), 0.3, 0.1, d));
        break;
      case 'clunk':
        this.blip(t, 'square', 200, 0.12, 0.08, d, 70);
        this.noiseBurst(t + 0.05, 0.25, 'bandpass', 900, 3, 0.15, d);
        this.blip(t + 0.15, 'sawtooth', 2400, 0.25, 0.02, d, 600);
        break;
      case 'switch':
        this.noiseBurst(t, 0.015, 'highpass', 3000, 0.7, 0.2, d);
        this.blip(t, 'square', 2600, 0.01, 0.03, d);
        break;
      case 'mail':
        this.blip(t, 'triangle', 520, 0.06, 0.12, d, 260);
        this.noiseBurst(t + 0.05, 0.15, 'bandpass', 3500, 0.7, 0.06, d, 0.03);
        break;
      case 'page':
        this.noiseBurst(t, 0.18, 'bandpass', 4200, 0.6, 0.05, d, 0.06);
        break;
      case 'splash':
        this.noiseBurst(t, 0.35, 'lowpass', 2400, 0.6, 0.25, d, 0.01);
        break;
      case 'punch':
        this.blip(t, 'sine', 110, 0.12, 0.4, d, 50, 0.002);
        this.noiseBurst(t, 0.06, 'lowpass', 700, 0.5, 0.2, d);
        break;
      case 'alarm':
        for (let i = 0; i < 4; i++) this.blip(t + i * 0.18, 'square', 1760, 0.08, 0.05, d);
        break;
      case 'yawn':
        this.blip(t, 'sawtooth', 260, 0.9, 0.025, d, 150, 0.2);
        break;
      case 'honk':
        // bloco 8: buzina de carona, dois toques em terça
        for (const [at, len] of [[0, 0.16], [0.24, 0.42]] as const) {
          this.blip(t + at, 'square', 392, len, 0.05, d);
          this.blip(t + at, 'square', 494, len, 0.04, d);
        }
        break;
    }
  }

  // ---------- sons contínuos ----------

  /** Começa (ou só ajusta) um som contínuo com chave própria. */
  loop(key: string, name: LoopName, gain: number, pan = 0): void {
    const ctx = this.ctx;
    if (!ctx || !this.noise) return;
    const held = this.loops.get(key);
    if (held) {
      held.gain.gain.setTargetAtTime(gain, ctx.currentTime, 0.1);
      held.pan.pan.setTargetAtTime(Math.max(-1, Math.min(1, pan)), ctx.currentTime, 0.1);
      return;
    }
    const g = ctx.createGain();
    g.gain.value = 0;
    g.gain.setTargetAtTime(gain, ctx.currentTime, 0.08);
    const p = ctx.createStereoPanner();
    p.pan.value = Math.max(-1, Math.min(1, pan));
    g.connect(p).connect(this.buses.get('sfx')!);
    const stops: (() => void)[] = [];
    const bed = (type: BiquadFilterType, freq: number, q: number, level: number, wobble = 0) => {
      const src = ctx.createBufferSource();
      src.buffer = this.noise;
      src.loop = true;
      const f = ctx.createBiquadFilter();
      f.type = type;
      f.frequency.value = freq;
      f.Q.value = q;
      const lg = ctx.createGain();
      lg.gain.value = level;
      src.connect(f).connect(lg).connect(g);
      if (wobble) {
        const lfo = ctx.createOscillator();
        lfo.frequency.value = wobble;
        const depth = ctx.createGain();
        depth.gain.value = level * 0.5;
        lfo.connect(depth).connect(lg.gain);
        lfo.start();
        stops.push(() => lfo.stop());
      }
      src.start(0, Math.random());
      stops.push(() => src.stop());
    };
    // batidas repetidas (teclado, pano, garfo...)
    const every = (ms: number, fn: () => void) => {
      const id = window.setInterval(() => {
        if (ctx.state === 'running') fn();
      }, ms);
      stops.push(() => window.clearInterval(id));
    };
    const tap = (fn: (t: number, d: AudioNode) => void) => fn(ctx.currentTime + 0.01, g);
    switch (name) {
      case 'water':
        bed('bandpass', 2600, 0.4, 0.35, 0.7);
        bed('lowpass', 700, 0.5, 0.2);
        break;
      case 'bubbles':
        bed('lowpass', 500, 0.6, 0.25, 0.4);
        every(260, () => tap((t, d) => this.blip(t, 'sine', 300 + Math.random() * 500, 0.06, 0.08, d, 900 + Math.random() * 600)));
        break;
      case 'sizzle':
        bed('highpass', 4500, 0.5, 0.18, 3.2);
        every(330, () => tap((t, d) => this.noiseBurst(t, 0.02, 'highpass', 6000, 1, 0.12, d)));
        break;
      case 'tv':
        bed('bandpass', 1400, 1.5, 0.05, 0.3);
        every(240, () => tap((t, d) => this.blip(t, 'square', 180 + Math.random() * 160, 0.12, 0.02, d, 150 + Math.random() * 200, 0.02)));
        break;
      case 'game':
        every(150, () => tap((t, d) => this.blip(t, 'square', mtof(72 + Math.floor(Math.random() * 12)), 0.06, 0.035, d)));
        break;
      case 'typing':
        every(140, () => {
          if (Math.random() < 0.75) tap((t, d) => this.noiseBurst(t, 0.015, 'bandpass', 3200 + Math.random() * 1500, 3, 0.18, d));
        });
        break;
      case 'scrub':
        every(380, () => tap((t, d) => this.noiseBurst(t, 0.18, 'bandpass', 2800, 0.7, 0.12, d, 0.05)));
        break;
      case 'clink':
        every(900, () => {
          if (Math.random() < 0.6) tap((t, d) => this.blip(t, 'triangle', 3100 + Math.random() * 900, 0.08, 0.05, d));
        });
        break;
      case 'pedal':
        bed('bandpass', 380, 3, 0.12, 1.6);
        every(600, () => tap((t, d) => this.noiseBurst(t, 0.04, 'bandpass', 1800, 4, 0.05, d)));
        break;
      case 'saw':
        every(520, () => tap((t, d) => this.noiseBurst(t, 0.22, 'bandpass', 1700 + Math.random() * 400, 2, 0.12, d, 0.04)));
        break;
    }
    this.loops.set(key, {
      gain: g,
      pan: p,
      stop: () => {
        g.gain.setTargetAtTime(0, ctx.currentTime, 0.08);
        window.setTimeout(() => {
          for (const s of stops) s();
          g.disconnect();
        }, 400);
      },
    });
  }

  stopLoop(key: string): void {
    const held = this.loops.get(key);
    if (!held) return;
    held.stop();
    this.loops.delete(key);
  }

  loopKeys(): string[] {
    return [...this.loops.keys()];
  }

  // ---------- fala ----------

  /** Diz uma fala em folquês. */
  speak(sylls: Syllable[], voice: Voice, gain = 1, pan = 0): void {
    const ctx = this.ctx;
    if (!ctx || gain <= 0.01) return;
    const d = this.out('voice', gain, pan);
    if (!d) return;
    let t = ctx.currentTime + 0.01;
    for (const s of sylls) {
      const cons = s.c ? Math.min(0.06, s.dur * 0.3) : 0;
      if (s.c) {
        if (FRICATIVES.has(s.c)) {
          const freq = s.c === 'x' ? 2600 : s.c === 'z' ? 4200 : s.c === 'v' ? 1300 : 5000;
          this.noiseBurst(t, cons, 'bandpass', freq, 1.5, 0.12 * s.gain, d, 0.01);
        } else if (PLOSIVES.has(s.c)) {
          const freq = s.c === 'k' || s.c === 'g' ? 1800 : s.c === 't' || s.c === 'd' ? 3500 : 600;
          this.noiseBurst(t + cons * 0.6, 0.012, 'bandpass', freq, 1.2, 0.2 * s.gain, d);
        } else {
          // som de nariz/língua: vogal baixinha e abafada
          const g = this.env(t, 0.01, 0.06 * s.gain, cons, d);
          const lp = ctx.createBiquadFilter();
          lp.type = 'lowpass';
          lp.frequency.value = 450;
          lp.connect(g);
          this.osc('triangle', s.from, t, t + cons, lp);
        }
      }
      const vt = t + cons;
      const vdur = Math.max(0.04, s.dur - cons);
      const [f1, f2] = FORMANTS[s.v];
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, vt);
      g.gain.linearRampToValueAtTime(0.5 * s.gain, vt + 0.02);
      g.gain.setValueAtTime(0.45 * s.gain, vt + vdur * 0.7);
      g.gain.exponentialRampToValueAtTime(0.0001, vt + vdur);
      g.connect(d);
      const src = ctx.createOscillator();
      src.type = 'sawtooth';
      src.frequency.setValueAtTime(s.from, vt);
      src.frequency.linearRampToValueAtTime(s.to, vt + vdur);
      for (const [f, q, lvl] of [
        [f1 * voice.formant, 6, 0.9],
        [f2 * voice.formant, 9, 0.45],
      ] as const) {
        const bp = ctx.createBiquadFilter();
        bp.type = 'bandpass';
        bp.frequency.value = f;
        bp.Q.value = q;
        const lg = ctx.createGain();
        lg.gain.value = lvl;
        src.connect(bp).connect(lg).connect(g);
      }
      src.start(vt);
      src.stop(vt + vdur + 0.02);
      if (voice.breath > 0.3) this.noiseBurst(vt, vdur * 0.8, 'bandpass', f2 * voice.formant, 2, 0.03 * voice.breath * s.gain, d, 0.02);
      t = vt + vdur + s.gap;
    }
  }
}
