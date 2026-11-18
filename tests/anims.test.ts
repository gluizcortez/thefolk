import { describe, expect, it } from 'vitest';
import { CATALOG } from '../src/data/catalog';
import { CLIPS, JOINTS, PoseMixer, blendPose, poseDistance, rest, sampleClip, trackValue, variantOf } from '../src/game/art/anims';
import type { FolkAnim } from '../src/game/art/anims';
import { SAVE_VERSION, Sim, deserialize, serialize } from '../src/sim';
import { FACE_ROWS, LOOK_LIMITS, faceFromSeed, fullLook } from '../src/sim/temper';
import { starterSim } from './helpers';
import { chance } from '../src/sim/activity';

const ALIASES = ['torsoX', 'torsoY', 'torsoZ', 'legOut', 'legsX', 'knees', 'armsX', 'armsOut', 'elbows', 'grips', 'shoulders'];
const CTX = { mood: 60, energy: 80 };

describe('biblioteca de animações (plano 2, bloco 5)', () => {
  it('toda animação é dado válido: juntas conhecidas, base e variações existentes', () => {
    const known = new Set<string>([...JOINTS, ...ALIASES]);
    for (const [name, clip] of Object.entries(CLIPS) as [string, (typeof CLIPS)[FolkAnim]][]) {
      const c = clip as { base?: string; tracks: object; seat?: object; variants?: string[] };
      for (const key of [...Object.keys(c.tracks), ...Object.keys(c.seat ?? {})]) expect(known.has(key), `${name}.${key}`).toBe(true);
      if (c.base) expect(c.base in CLIPS, name).toBe(true);
      for (const v of c.variants ?? []) expect(v in CLIPS, `${name} -> ${v}`).toBe(true);
    }
    for (const walk of ['walk', 'walk_hurry', 'walk_tired', 'walk_sad', 'walk_happy']) expect(walk in CLIPS).toBe(true);
  });

  it('canais: fixo, oscilação, metade da onda, quadros-chave e soma', () => {
    expect(trackValue(0.3, 5)).toBe(0.3);
    expect(trackValue({ b: 1, a: 2, f: 1 }, Math.PI / 2)).toBeCloseTo(3);
    expect(trackValue({ a: 1, f: 1, sh: 'pos' }, -Math.PI / 2)).toBe(0);
    expect(trackValue({ a: 1, f: 1, sh: 'abs' }, -Math.PI / 2)).toBeCloseTo(1);
    const keys = { len: 2, k: [[0, 0], [0.5, 1], [1, 0]] as [number, number][] };
    expect(trackValue(keys, 1)).toBeCloseTo(1);
    expect(trackValue(keys, 0.5)).toBeCloseTo(0.5);
    expect(trackValue(keys, 3)).toBeCloseTo(1); // laço
    expect(trackValue([0.5, { a: 1, f: 1 }], 0)).toBeCloseTo(0.5);
  });

  it('mistura de poses: extremos e meio', () => {
    const a = sampleClip('idle', 0, CTX);
    const b = sampleClip('cheer', 0, CTX);
    expect(poseDistance(blendPose(a, b, 0), a)).toBeLessThan(1e-9);
    expect(poseDistance(blendPose(a, b, 1), b)).toBeLessThan(1e-9);
    const m = blendPose(a, b, 0.5);
    expect(m.armLX).toBeCloseTo((a.armLX + b.armLX) / 2);
    expect(poseDistance(blendPose(a, b, 2), b)).toBeLessThan(1e-9);
  });

  it('a troca de animação é suave: sem salto no quadro da troca, assentada no fim', () => {
    const mixer = new PoseMixer(0.3);
    const dt = 1 / 60;
    let t = 0;
    let last = { ...mixer.target('idle', t, dt, CTX) };
    for (let i = 0; i < 30; i++) last = { ...mixer.target('idle', (t += dt), dt, CTX) };
    const first = mixer.target('cheer', (t += dt), dt, CTX);
    // a pose do quadro da troca é a mesma de antes (nada de troca seca)
    expect(poseDistance(first, last)).toBeLessThan(1e-9);
    let prev = { ...first };
    let biggest = 0;
    for (let i = 0; i < 40; i++) {
      const p = mixer.target('cheer', (t += dt), dt, CTX);
      biggest = Math.max(biggest, poseDistance(p, prev));
      prev = { ...p };
    }
    // nenhum quadro pula mais que uma fração do caminho todo
    expect(biggest).toBeLessThan(0.4);
    expect(mixer.progress).toBe(1);
    expect(poseDistance(prev, sampleClip('cheer', t, CTX))).toBeLessThan(1e-9);
  });

  it('sentado dobra as pernas por baixo de qualquer animação, e a variação pode cruzar', () => {
    const watch = sampleClip('watch', 1, { ...CTX, seated: true });
    expect(watch.hipsY).toBeCloseTo(0.1);
    expect(watch.kneeL).toBeCloseTo(1.45);
    const cross = sampleClip('watch_cross', 1, { ...CTX, seated: true });
    expect(cross.legRX).toBeLessThan(watch.legRX);
    const standing = sampleClip('watch', 1, CTX);
    expect(standing.kneeL).toBeLessThan(0.3);
  });

  it('postura: humor ruim curva o tronco e baixa a cabeça; dormir não', () => {
    const good = sampleClip('idle', 0, { mood: 90 });
    const bad = sampleClip('idle', 0, { mood: 10 });
    expect(bad.chestX).toBeGreaterThan(good.chestX);
    expect(bad.headX).toBeGreaterThan(good.headX);
    const a = sampleClip('sleep', 0, { mood: 90 });
    const b = sampleClip('sleep', 0, { mood: 10 });
    expect(a.headX).toBeCloseTo(b.headX);
  });

  it('variações do laço: sempre da lista, repetem pelo mesmo folk e se alternam no tempo', () => {
    const seen = new Set<string>();
    for (let t = 0; t < 600; t += 3) {
      const v = variantOf('watch', 7, t);
      expect(CLIPS.watch.variants).toContain(v);
      expect(variantOf('watch', 7, t)).toBe(v);
      seen.add(v);
    }
    expect(seen.size).toBeGreaterThan(2);
    expect(variantOf('walk', 7, 30)).toBe('walk');
  });

  it('mãos: segurar e apontar são canais da pose', () => {
    const p = sampleClip('argue', 0, CTX);
    expect(p.pointR).toBe(1);
    expect(p.gripR).toBe(1);
    expect(rest().pointR).toBe(0);
  });
});

describe('sorteio das reações', () => {
  it('chance nunca sai da lista (antes saía negativo e a reação vinha sem tipo)', () => {
    for (let tick = 0; tick < 5000; tick += 7) for (const id of [1, 34, 35, 999]) {
      const i = chance(tick, id, 3);
      expect(i).toBeGreaterThanOrEqual(0);
      expect(i).toBeLessThan(3);
    }
  });
});

describe('rosto em camadas (plano 2, bloco 5)', () => {
  it('rosto de semente: dentro dos limites e sempre igual', () => {
    for (let s = 0; s < 200; s++) {
      const f = faceFromSeed(s);
      for (const k of FACE_ROWS) {
        expect(f[k]).toBeGreaterThanOrEqual(0);
        expect(f[k]).toBeLessThan(LOOK_LIMITS[k]);
      }
      expect(faceFromSeed(s)).toEqual(f);
    }
  });

  it('aparência antiga ganha as peças do rosto sem perder as que tinha', () => {
    const l = fullLook({ skin: 2, hair: 1, nose: 3 });
    expect(l.nose).toBe(3);
    for (const k of FACE_ROWS) expect(typeof l[k]).toBe('number');
  });

  it('save v24 sobe para v25: sardas viram marca, óculos ficam, todos ganham rosto', () => {
    const up = (face: number) => {
      const file = serialize(starterSim().world, 1) as unknown as { version: number; world: { folks: { look: Record<string, number> }[] } };
      file.version = 24;
      for (const f of file.world.folks) {
        for (const k of FACE_ROWS) delete f.look[k];
        f.look.face = face;
      }
      return deserialize(file);
    };
    const freckled = up(1);
    expect(freckled.version).toBe(SAVE_VERSION);
    expect(freckled.world.folks[0].look.face).toBe(0);
    expect(freckled.world.folks[0].look.marks).toBe(1);
    const glasses = up(2);
    expect(glasses.world.folks[0].look.face).toBe(2);
    for (const f of glasses.world.folks) for (const k of FACE_ROWS) expect(typeof f.look[k]).toBe('number');
    expect(() => new Sim(CATALOG, glasses.world)).not.toThrow();
  });
});
