// Bloco 7: volume e mudo. Ficam no navegador (localStorage), fora do World:
// não entram no save nem no arquivo exportado.

export interface AudioPrefs {
  /** 0 a 1 */
  master: number;
  music: number;
  sfx: number;
  voice: number;
  muted: boolean;
}

export const DEFAULT_PREFS: AudioPrefs = { master: 0.8, music: 0.55, sfx: 0.8, voice: 0.8, muted: false };
const KEY = 'thefolk.audio';

const unit = (v: unknown, fallback: number): number =>
  typeof v === 'number' && Number.isFinite(v) ? Math.min(1, Math.max(0, v)) : fallback;

/** Aceita qualquer coisa (texto velho, lixo) e devolve preferências válidas. */
export function cleanPrefs(raw: unknown): AudioPrefs {
  const r = (typeof raw === 'object' && raw !== null ? raw : {}) as Partial<AudioPrefs>;
  return {
    master: unit(r.master, DEFAULT_PREFS.master),
    music: unit(r.music, DEFAULT_PREFS.music),
    sfx: unit(r.sfx, DEFAULT_PREFS.sfx),
    voice: unit(r.voice, DEFAULT_PREFS.voice),
    muted: typeof r.muted === 'boolean' ? r.muted : DEFAULT_PREFS.muted,
  };
}

/** Volume final de um canal (0 com mudo). */
export function busGain(p: AudioPrefs, bus: 'music' | 'sfx' | 'voice'): number {
  return p.muted ? 0 : p.master * p[bus];
}

export function loadPrefs(store: Pick<Storage, 'getItem'> | undefined = globalThis.localStorage): AudioPrefs {
  try {
    const text = store?.getItem(KEY);
    return cleanPrefs(text ? JSON.parse(text) : null);
  } catch {
    return { ...DEFAULT_PREFS };
  }
}

export function savePrefs(p: AudioPrefs, store: Pick<Storage, 'setItem'> | undefined = globalThis.localStorage): void {
  try {
    store?.setItem(KEY, JSON.stringify(cleanPrefs(p)));
  } catch {
    // navegador sem armazenamento (aba anônima): vale só até fechar
  }
}
