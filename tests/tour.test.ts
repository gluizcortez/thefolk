import { describe, expect, it } from 'vitest';
import { TOUR_STEPS, nextTourStep, stepOfCommand } from '../src/ui/tour';
import { t } from '../src/i18n';

describe('plano 2, bloco 15: primeiros passos', () => {
  it('cada comando aceito marca o passo certo', () => {
    expect(stepOfCommand({ type: 'queueUse', folkId: 1, objectId: 2, interactionId: 'sit' })).toEqual(['order']);
    expect(stepOfCommand({ type: 'queueUse', folkId: 1, objectId: 2, interactionId: 'sit', append: true })).toEqual(['order', 'queue']);
    expect(stepOfCommand({ type: 'setSpeed', speed: 1 })).toEqual([]);
    expect(stepOfCommand({ type: 'setSpeed', speed: 3 })).toEqual(['speed']);
    expect(stepOfCommand({ type: 'buy', defId: 'lamp', x: 1, y: 1, rot: 0 })).toEqual(['buy']);
    expect(stepOfCommand({ type: 'goDowntown', place: 'praca' } as never)).toEqual(['leave']);
  });

  it('mostra o primeiro passo que falta, em qualquer ordem, e nada depois de pular', () => {
    expect(nextTourStep({ done: [], off: false })).toBe('select');
    expect(nextTourStep({ done: ['select', 'speed'], off: false })).toBe('order');
    expect(nextTourStep({ done: [...TOUR_STEPS], off: false })).toBeNull();
    expect(nextTourStep({ done: [], off: true })).toBeNull();
  });

  it('todo passo tem texto', () => {
    for (const s of [...TOUR_STEPS, 'end']) expect(t(`tour.${s}`)).not.toBe(`tour.${s}`);
    for (const s of TOUR_STEPS) expect(t(`tour.short.${s}`)).not.toBe(`tour.short.${s}`);
  });
});
