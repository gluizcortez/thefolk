// Bloco 7: sinais de som da interface (abrir cartão, fechar). A interface só
// avisa; quem toca é o diretor de som, se existir.

import type { SfxName } from './engine';

const listeners: ((name: SfxName) => void)[] = [];

export function onCue(cb: (name: SfxName) => void): void {
  listeners.push(cb);
}

export function cue(name: SfxName): void {
  for (const cb of listeners) cb(name);
}
