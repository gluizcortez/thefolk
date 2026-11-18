import { describe, expect, it } from 'vitest';
import { CATALOG } from '../src/data/catalog';
import { NEIGHBORS, NEIGHBOR_TIES } from '../src/data/neighbors';
import {
  DANCE_TASTE,
  MINUTES_PER_DAY,
  STATIONS,
  danceBonus,
  deserialize,
  favoriteStation,
  nextStation,
  playing,
  playingStereos,
  serialize,
  stationTaste,
} from '../src/sim';
import type { Sim, Temper } from '../src/sim';
import { STYLES, beatSeconds, chordTones, composeBar, playedNote } from '../src/audio/compose';
import { FORMANTS, phraseText, toneOf, utterance, utteranceLength, voiceOf } from '../src/audio/folkes';
import { DEFAULT_PREFS, busGain, cleanPrefs, loadPrefs, savePrefs } from '../src/audio/prefs';
import { SILENT, actionSound, commandSound, logSound, stepSound } from '../src/audio/sounds';
import { householdSim, openField, run } from './helpers';

const temper = (t: Partial<Temper>): Temper => ({ order: 5, outgoing: 5, pep: 5, wit: 5, warmth: 5, ...t });

function radioSim(t?: Partial<Temper>): Sim {
  const sim = openField(8, 8, [{ defId: 'speaker', x: 3, y: 3 }], { x: 3, y: 5, needs: { fun: 10, energy: 90 } });
  if (t) sim.world.folks[0].temper = temper(t);
  return sim;
}

describe('estações de rádio (bloco 7)', () => {
  it('cada temperamento tem a sua estação preferida', () => {
    expect(favoriteStation({ temper: temper({ warmth: 9, pep: 1 }) }).id).toBe('brisa');
    expect(favoriteStation({ temper: temper({ outgoing: 9, wit: 9, pep: 3, warmth: 2, order: 2 }) }).id).toBe('chiclete');
    expect(favoriteStation({ temper: temper({ pep: 10, order: 0 }) }).id).toBe('trovao');
    for (const s of STATIONS) {
      const v = stationTaste({ temper: temper({}) }, s);
      expect(v).toBe(10);
    }
  });

  it('o botão liga na preferida, troca em roda e desliga', () => {
    const sim = radioSim({ pep: 10, order: 0 });
    const obj = sim.world.objects[0];
    expect(sim.dispatch({ type: 'queueUse', folkId: sim.world.folks[0].id, objectId: obj.id, interactionId: 'tuneNext' })).toBe(false);
    expect(sim.dispatch({ type: 'queueUse', folkId: sim.world.folks[0].id, objectId: obj.id, interactionId: 'tuneOn' })).toBe(true);
    run(sim, 20);
    expect(obj.tune).toBe('trovao');
    expect(playing(obj, CATALOG.objects.speaker)).toBe(true);
    expect(nextStation('trovao')).toBe('brisa');
    sim.dispatch({ type: 'queueUse', folkId: sim.world.folks[0].id, objectId: obj.id, interactionId: 'tuneNext' });
    run(sim, 10);
    expect(obj.tune).toBe('brisa');
    sim.dispatch({ type: 'queueUse', folkId: sim.world.folks[0].id, objectId: obj.id, interactionId: 'tuneOff' });
    run(sim, 10);
    expect(obj.tune).toBeUndefined();
    expect(playingStereos(sim.world, CATALOG)).toHaveLength(0);
  });

  it('dançar liga o som e diverte mais com a estação de que se gosta', () => {
    const fan = { temper: temper({ pep: 10, order: 0 }) };
    expect(danceBonus(fan, 'trovao')).toBeCloseTo(DANCE_TASTE, 5);
    expect(danceBonus(fan, 'brisa')).toBeLessThan(0);
    expect(danceBonus(fan, undefined)).toBe(0);

    const funAfter = (station: string | undefined) => {
      const sim = radioSim({ pep: 10, order: 0 });
      const obj = sim.world.objects[0];
      if (station) obj.tune = station;
      sim.dispatch({ type: 'queueUse', folkId: sim.world.folks[0].id, objectId: obj.id, interactionId: 'dance' });
      run(sim, 25);
      return { fun: sim.world.folks[0].needs.fun, tune: obj.tune };
    };
    const own = funAfter(undefined);
    expect(own.tune).toBe('trovao');
    const liked = funAfter('trovao');
    const disliked = funAfter('brisa');
    expect(liked.fun).toBeGreaterThan(disliked.fun + 4);
  });

  it('som ligado gasta luz e atrapalha o sono no mesmo cômodo; quem vai dormir desliga', () => {
    const sim = householdSim(3);
    const speaker = sim.world.objects.find((o) => o.defId === 'speaker')!;
    speaker.tune = 'chiclete';
    const before = sim.world.household.lightMinutes ?? 0;
    run(sim, 30);
    expect((sim.world.household.lightMinutes ?? 0) - before).toBeGreaterThanOrEqual(30);
  });

  it('dormir com o som ligado ao lado descansa menos', () => {
    const energyAfter = (tune?: string) => {
      const sim = openField(8, 8, [{ defId: 'bed', x: 1, y: 1 }, { defId: 'speaker', x: 5, y: 1 }], { x: 1, y: 4, needs: { energy: 20 } });
      if (tune) sim.world.objects[1].tune = tune;
      const bed = sim.world.objects[0];
      sim.dispatch({ type: 'queueUse', folkId: sim.world.folks[0].id, objectId: bed.id, interactionId: 'sleep' });
      run(sim, 150);
      return sim.world.folks[0].needs.energy;
    };
    const quiet = energyAfter();
    const noisy = energyAfter('trovao');
    expect(noisy).toBeLessThan(quiet - 5);
  });

  it('o som entra e sai do save sem migração (campo opcional)', () => {
    const sim = radioSim();
    sim.world.objects[0].tune = 'brisa';
    const back = deserialize(JSON.parse(JSON.stringify(serialize(sim.world, 1))), { neighbors: NEIGHBORS, ties: NEIGHBOR_TIES, catalog: CATALOG }).world;
    expect(back.objects[0].tune).toBe('brisa');
  });

  it('casa inteira por 7 dias com o som ligado não desanda', () => {
    const sim = householdSim(11);
    sim.world.objects.find((o) => o.defId === 'speaker')!.tune = 'trovao';
    for (let m = 0; m < 7 * MINUTES_PER_DAY; m++) sim.step();
    const keys = sim.world.log.map((l) => l.key);
    expect(keys).not.toContain('log.collapse');
    expect(sim.world.folks.filter((f) => !f.visit).every((f) => f.needs.energy > 0)).toBe(true);
  });
});

describe('folquês (bloco 7)', () => {
  const folk = { id: 7, name: 'Tomé Varanda', look: { body: 1 } as never, temper: temper({}) };

  it('cada folk tem a sua voz, sempre a mesma', () => {
    const a = voiceOf(folk);
    expect(voiceOf(folk)).toEqual(a);
    const b = voiceOf({ ...folk, id: 8, name: 'Lia Sacada' });
    expect(b.pitch).not.toBeCloseTo(a.pitch, 1);
    const big = voiceOf({ ...folk, look: { body: 2 } as never });
    expect(big.pitch).toBeLessThan(a.pitch);
    const quick = voiceOf({ ...folk, temper: temper({ pep: 10 }) });
    expect(quick.rate).toBeGreaterThan(a.rate);
  });

  it('a entonação muda com o tipo de conversa', () => {
    expect(toneOf('mean')).toBe('argue');
    expect(toneOf('friendly', 'argue')).toBe('argue');
    expect(toneOf('romantic')).toBe('romantic');
    expect(toneOf('professional')).toBe('work');
    expect(toneOf('friendly')).toBe('happy');
    expect(toneOf('friendly', 'talk', true)).toBe('sad');
    const v = voiceOf(folk);
    const avg = (s: ReturnType<typeof utterance>) => s.reduce((t, x) => t + x.from, 0) / s.length;
    let argueFaster = 0;
    let romanticLower = 0;
    for (let seed = 1; seed <= 20; seed++) {
      const argue = utterance(v, 'argue', seed);
      const romantic = utterance(v, 'romantic', seed);
      const happy = utterance(v, 'happy', seed);
      const per = (s: ReturnType<typeof utterance>) => utteranceLength(s) / s.length;
      if (per(argue) < per(romantic)) argueFaster++;
      if (avg(romantic) < avg(happy)) romanticLower++;
      // briga termina descendo; alegria, subindo
      expect(argue[argue.length - 1].to).toBeLessThan(argue[argue.length - 1].from);
      expect(happy[happy.length - 1].to).toBeGreaterThan(happy[happy.length - 1].from);
    }
    expect(argueFaster).toBe(20);
    expect(romanticLower).toBeGreaterThanOrEqual(18);
  });

  it('a fala é repetível, curta e só usa sílabas inventadas', () => {
    const v = voiceOf(folk);
    const a = utterance(v, 'happy', 42);
    expect(utterance(v, 'happy', 42)).toEqual(a);
    expect(a.length).toBeGreaterThanOrEqual(2);
    expect(utteranceLength(a)).toBeLessThan(4);
    for (const s of a) expect(Object.keys(FORMANTS)).toContain(s.v);
    const text = phraseText(a, 'happy');
    expect(text).toMatch(/^[A-Z][a-z ]+!$/);
  });
});

describe('música procedural (bloco 7)', () => {
  it('cada modo e cada estação tem um estilo próprio', () => {
    for (const id of ['live', 'buy', 'build', ...STATIONS.map((s) => s.id)]) expect(STYLES[id]).toBeDefined();
    for (const s of STATIONS) expect(STYLES[s.id].bpm).toBe(s.bpm);
    const bpms = new Set(Object.values(STYLES).map((s) => s.bpm));
    expect(bpms.size).toBe(Object.keys(STYLES).length);
  });

  it('compasso é repetível, cabe nos 4 tempos e tem baixo no primeiro tempo', () => {
    for (const style of Object.values(STYLES)) {
      for (let bar = 0; bar < 12; bar++) {
        const notes = composeBar(style, 99, bar);
        expect(composeBar(style, 99, bar)).toEqual(notes);
        expect(notes.every((n) => n.at >= 0 && n.at < 4.2 && n.dur > 0 && n.vel > 0 && n.vel <= 1)).toBe(true);
        expect(notes.some((n) => n.inst === style.bass && n.at === 0)).toBe(true);
        const melody = notes.filter((n) => n.inst === style.lead && style.lead !== style.chord);
        for (const n of melody) expect(style.scale).toContain((((n.midi - style.root) % 12) + 12) % 12);
      }
      expect(beatSeconds(style)).toBeCloseTo(60 / style.bpm);
    }
    expect(composeBar(STYLES.live, 1, 0)).not.toEqual(composeBar(STYLES.live, 2, 0));
  });

  it('acordes são empilhados em terças na escala', () => {
    expect(chordTones(STYLES.live, 0)).toEqual([53, 57, 60, 64]);
  });

  it('quem toca piano com pouca Criatividade erra mais notas', () => {
    const wrong = (c: number) => Array.from({ length: 400 }, (_, n) => playedNote(3, n, c)).filter((x) => x.wrong).length;
    expect(wrong(0)).toBeGreaterThan(wrong(10) + 60);
    expect(wrong(10)).toBe(0);
  });
});

describe('som de cada coisa (bloco 7)', () => {
  it('toda ação principal do catálogo faz algum som', () => {
    const missing: string[] = [];
    for (const def of Object.values(CATALOG.objects)) {
      for (const it of def.interactions) {
        if (it.hidden || SILENT.has(it.id) || it.pose === 'dance' || it.pose === 'lie' || it.pose === 'sit') continue;
        const s = actionSound(def, it);
        if (!s || (!s.start && !s.loop && !s.end && !s.talk && !s.music)) missing.push(`${def.id}:${it.id}`);
      }
    }
    expect(missing).toEqual([]);
    expect(actionSound(CATALOG.objects.toilet, CATALOG.objects.toilet.interactions.find((i) => i.id === 'use')!)?.end).toBe('flush');
    expect(actionSound(CATALOG.objects.stove, CATALOG.objects.stove.interactions.find((i) => i.id === 'cook')!)?.loop).toBe('sizzle');
  });

  it('campainha, telefone, caixa registradora e passos pelo piso', () => {
    expect(logSound('log.ring.courier')).toBe('bell');
    expect(logSound('log.workCall')).toBe('honk');
    expect(logSound('log.nada')).toBeNull();
    expect(commandSound({ type: 'buy', defId: 'chair', x: 0, y: 0, rot: 0 }, true)).toBe('register');
    expect(commandSound({ type: 'sell', objectId: 1 }, true)).toBe('coins');
    expect(commandSound({ type: 'setSpeed', speed: 1 }, true)).toBeNull();
    expect(commandSound({ type: 'sell', objectId: 1 }, false)).toBe('buzz');
    expect(stepSound('carpet')).toBe('step:soft');
    expect(stepSound('wood')).toBe('step:wood');
    expect(stepSound('tile')).toBe('step:hard');
    expect(stepSound('grass')).toBe('step:grass');
  });
});

describe('volume e mudo (bloco 7)', () => {
  it('preferências ficam fora do mundo e sempre válidas', () => {
    expect(cleanPrefs({ master: 3, music: -1, sfx: 'x', muted: 'sim' })).toEqual({ ...DEFAULT_PREFS, master: 1, music: 0 });
    const mem = new Map<string, string>();
    const store = { getItem: (k: string) => mem.get(k) ?? null, setItem: (k: string, v: string) => void mem.set(k, v) };
    savePrefs({ ...DEFAULT_PREFS, music: 0.2, muted: true }, store);
    const back = loadPrefs(store);
    expect(back.music).toBe(0.2);
    expect(busGain(back, 'music')).toBe(0);
    expect(busGain({ ...back, muted: false }, 'voice')).toBeCloseTo(back.master * back.voice);
    expect(loadPrefs({ getItem: () => '{quebrado' })).toEqual(DEFAULT_PREFS);
    const sim = householdSim(1);
    expect(JSON.stringify(sim.world)).not.toContain('muted');
  });
});
