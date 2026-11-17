// Bloco 7: o diretor de som. A cada quadro olha o mundo (só lê, como a tela)
// e decide o que soa: passos, ações, conversas em folquês, campainha,
// telefone, caixa registradora, trilha do modo e o rádio ligado.

import type { GameController } from '../game/controller';
import { playingStereos, stationDef } from '../sim/music';
import { skillLevel } from '../sim/skills';
import type { Folk, World } from '../sim/types';
import { playedNote } from './compose';
import { onCue } from './cues';
import type { AudioEngine, SfxName } from './engine';
import { toneOf, utterance, utteranceLength, voiceOf } from './folkes';
import type { Tone } from './folkes';
import { MusicPlayer } from './player';
import type { Voicing } from './player';
import { actionSound, commandSound, logSound, stepSound } from './sounds';
import type { ActionSound } from './sounds';

/** Quanto se ouve de um ponto do chão (tile) e de que lado: a tela calcula. */
export type Hearing = (x: number, y: number) => { gain: number; pan: number };

interface FolkEar {
  tile: string;
  stepAt: number;
  act: string;
  sound: ActionSound | null;
  talkIn: number;
  note: number;
  noteIn: number;
  thoughtAt: number;
}

const STEP_GAP = [0.2, 0.2, 0.12, 0.22];
const LOOP_LEVEL = 0.55;

export class AudioDirector {
  private ears = new Map<number, FolkEar>();
  private seenLog: number;
  private worldVersion: number;
  private readonly score: MusicPlayer;
  private readonly radio: MusicPlayer;
  private clock = 0;
  private talkSeed = 1;

  constructor(
    private readonly ctrl: GameController,
    private readonly engine: AudioEngine,
    private readonly hear: Hearing,
  ) {
    this.score = new MusicPlayer(engine);
    this.radio = new MusicPlayer(engine);
    this.seenLog = ctrl.world.tick;
    this.worldVersion = ctrl.worldVersion;
    ctrl.onCommand((cmd, ok) => {
      const s = commandSound(cmd, ok);
      if (s) this.engine.sfx(s, 0.8);
    });
    onCue((name) => this.engine.sfx(name, 0.7));
  }

  update(dt: number): void {
    this.clock += dt;
    const ctrl = this.ctrl;
    const world = ctrl.world;
    if (ctrl.worldVersion !== this.worldVersion) {
      // jogo trocado: esquece quem era quem e não toca o log antigo
      this.worldVersion = ctrl.worldVersion;
      for (const key of this.engine.loopKeys()) this.engine.stopLoop(key);
      this.ears.clear();
      this.seenLog = world.tick;
    }
    const running = world.speed !== 0 && ctrl.mode === 'live';

    this.music();
    this.logSounds(world);
    const alive = new Set<number>();
    for (const folk of world.folks) {
      alive.add(folk.id);
      this.folk(folk, running, dt);
    }
    for (const [id] of this.ears) {
      if (!alive.has(id)) {
        this.engine.stopLoop(`folk:${id}`);
        this.ears.delete(id);
      }
    }
  }

  // ---------- trilha e rádio ----------

  private music(): void {
    const ctrl = this.ctrl;
    const world = ctrl.world;
    // o som de casa mais alto que se ouve daqui
    let best: { station: string; gain: number; pan: number; voicing: Voicing } | null = null;
    if (ctrl.mode === 'live') {
      for (const obj of playingStereos(world, ctrl.sim.catalog)) {
        const def = ctrl.sim.catalog.objects[obj.defId];
        const h = this.hear(obj.x, obj.y);
        const size = def?.art === 'jukebox' ? 1 : def?.art === 'radio' ? 0.65 : 0.85;
        const gain = h.gain * size;
        if (!best || gain > best.gain) {
          const voicing: Voicing = def?.art === 'jukebox' ? 'jukebox' : def?.art === 'radio' ? 'radio' : 'speaker';
          best = { station: obj.tune!, gain, pan: h.pan, voicing };
        }
      }
    }
    if (best && stationDef(best.station)) {
      this.radio.setStyle(best.station);
      this.radio.setVoicing(best.voicing);
      this.radio.setLevel(best.gain * 0.9, best.pan * 0.6);
    } else {
      this.radio.setLevel(0);
    }
    // a trilha do modo abaixa quando o rádio está perto
    const duck = best ? Math.min(0.9, best.gain) : 0;
    this.score.setStyle(ctrl.mode);
    this.score.setLevel(0.7 * (1 - duck));
    this.score.pump();
    this.radio.pump();
  }

  // ---------- log: campainha, carta, quebrou, promoção ----------

  private logSounds(world: World): void {
    let last = this.seenLog;
    for (const entry of world.log) {
      if (entry.tick <= this.seenLog) continue;
      last = Math.max(last, entry.tick);
      const s = logSound(entry.key);
      if (s) this.engine.sfx(s, 0.85);
    }
    this.seenLog = last;
  }

  // ---------- cada folk ----------

  private folk(folk: Folk, running: boolean, dt: number): void {
    let ear = this.ears.get(folk.id);
    const tile = `${folk.x},${folk.y}`;
    if (!ear) {
      ear = { tile, stepAt: 0, act: '', sound: null, talkIn: 0.5 + Math.random(), note: 0, noteIn: 0, thoughtAt: folk.thought?.at ?? -1 };
      this.ears.set(folk.id, ear);
    }
    const sim = this.ctrl.sim;
    const world = sim.world;
    const loopKey = `folk:${folk.id}`;
    if (folk.away || !running) {
      // fora de casa, ou jogo parado: tudo o que é contínuo cala
      this.engine.stopLoop(loopKey);
      ear.tile = tile;
      if (folk.away) ear.act = '';
      return;
    }
    const h = this.hear(folk.x, folk.y);

    // passos, pelo piso
    if (tile !== ear.tile) {
      ear.tile = tile;
      const gap = STEP_GAP[world.speed] ?? 0.2;
      if (this.clock - ear.stepAt >= gap) {
        ear.stepAt = this.clock;
        const floor = world.grid.floor[folk.y * world.grid.w + folk.x];
        this.engine.sfx(stepSound(floor), 0.5 * h.gain, h.pan);
      }
    }

    // ação de agora
    const a = folk.queue[0];
    const using = a?.phase === 'using';
    const act = using ? `${a.kind}:${a.objectId ?? ''}:${a.interactionId ?? a.socialId ?? ''}:${a.id}` : '';
    if (act !== ear.act) {
      // terminou a anterior
      if (ear.sound?.end) this.engine.sfx(ear.sound.end, 0.8 * h.gain, h.pan);
      this.engine.stopLoop(loopKey);
      ear.act = act;
      ear.sound = null;
      if (using && a.kind === 'use') {
        const obj = sim.findObject(a.objectId ?? -1);
        const it = sim.interactionOf(a);
        if (it) {
          ear.sound = actionSound(obj && sim.defOf(obj), it);
          if (ear.sound?.start) this.engine.sfx(ear.sound.start, 0.8 * h.gain, h.pan);
          ear.talkIn = 0.8;
        }
      } else if (using && a.kind === 'door') {
        ear.sound = { start: 'door' };
        this.engine.sfx('door', 0.8 * h.gain, h.pan);
      } else if (using && a.kind === 'tidy') {
        ear.sound = { start: 'brush' };
        this.engine.sfx('brush', 0.7 * h.gain, h.pan);
      }
    }
    if (ear.sound?.loop) this.engine.loop(loopKey, ear.sound.loop, LOOP_LEVEL * h.gain, h.pan);

    // tocar instrumento: notas de verdade, com erro para quem tem pouca Criatividade
    if (ear.sound?.music) {
      ear.noteIn -= dt;
      if (ear.noteIn <= 0) {
        const n = playedNote(folk.id, ear.note++, skillLevel(folk, 'creativity'));
        const bus = this.engine.bus('sfx');
        if (bus && this.engine.ctx) {
          this.engine.note({ at: 0, dur: 0.6, midi: n.midi, inst: ear.sound.music, vel: 0.9 * h.gain }, this.engine.now + 0.01, 0.5, bus);
        }
        ear.noteIn = 0.28 + (ear.note % 4 === 3 ? 0.3 : 0);
      }
    }

    // conversa: quem puxa fala, quem ouve responde de vez em quando
    const tone = this.talkTone(folk, ear);
    if (tone) {
      ear.talkIn -= dt;
      if (ear.talkIn <= 0) {
        const voice = voiceOf(folk);
        const sylls = utterance(voice, tone.tone, folk.id * 7919 + this.talkSeed++);
        if (tone.speaks) this.engine.speak(sylls, voice, 0.9 * h.gain, h.pan);
        ear.talkIn = utteranceLength(sylls) + 0.5 + Math.random() * (tone.speaks ? 0.9 : 2.4);
      }
    }

    // balão novo: recusa resmunga, desejo cumprido comemora
    const th = folk.thought;
    if (th && th.at !== ear.thoughtAt) {
      ear.thoughtAt = th.at;
      if (th.kind === 'refuse') {
        const voice = voiceOf(folk);
        this.engine.speak(utterance(voice, 'argue', th.at).slice(0, 2), voice, 0.8 * h.gain, h.pan);
      }
    }
  }

  /** Se o folk está falando agora, em que tom (e se a vez é dele). */
  private talkTone(folk: Folk, ear: FolkEar): { tone: Tone; speaks: boolean } | null {
    const sim = this.ctrl.sim;
    const a = folk.queue[0];
    if (!a || a.phase !== 'using') return null;
    if (ear.sound?.talk) return { tone: a.interactionId === 'practice' ? 'work' : 'happy', speaks: true };
    if (a.kind === 'social') {
      const def = sim.catalog.socials[a.socialId ?? ''];
      return { tone: toneOf(def?.category, def?.anim, a.accepted === false && a.elapsed > 1), speaks: true };
    }
    if (a.kind === 'listen' && a.otherId !== undefined) {
      const other = sim.findFolk(a.otherId);
      const theirs = other?.queue[0];
      if (theirs?.kind !== 'social' || theirs.phase !== 'using') return null;
      const def = sim.catalog.socials[theirs.socialId ?? ''];
      // o ouvinte responde menos (e às vezes só escuta)
      return { tone: toneOf(def?.category, def?.targetAnim ?? def?.anim, theirs.accepted === false), speaks: Math.random() < 0.55 };
    }
    return null;
  }

  /** Efeito avulso (para a interface). */
  play(name: SfxName, gain = 0.8): void {
    this.engine.sfx(name, gain);
  }
}
