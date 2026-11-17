import type { World } from './types';

/** Aumente ao mudar o formato do World e registre a migração abaixo. */
export const SAVE_VERSION = 1;

export interface SaveFile {
  version: number;
  savedAt: number;
  world: World;
}

type Migration = (data: Record<string, unknown>) => Record<string, unknown>;

/**
 * migrations[n] leva um save da versão n para a n+1.
 * Exemplo para o futuro:
 *   1: (save) => ({ ...save, world: { ...save.world, money: 0 } }),
 */
const migrations: Record<number, Migration> = {};

export class SaveError extends Error {}

export function serialize(world: World, savedAt: number): SaveFile {
  return { version: SAVE_VERSION, savedAt, world: JSON.parse(JSON.stringify(world)) as World };
}

export function deserialize(raw: unknown): SaveFile {
  if (typeof raw !== 'object' || raw === null) throw new SaveError('save inválido');
  let data = raw as Record<string, unknown>;
  let version = data.version;
  if (typeof version !== 'number' || !Number.isInteger(version) || version < 1) {
    throw new SaveError('save sem versão');
  }
  if (version > SAVE_VERSION) throw new SaveError('save de uma versão mais nova do jogo');
  while (version < SAVE_VERSION) {
    const migrate = migrations[version];
    if (!migrate) throw new SaveError(`sem migração a partir da versão ${version}`);
    data = migrate(data);
    version++;
    data.version = version;
  }
  const world = data.world as World | undefined;
  if (
    !world ||
    typeof world.tick !== 'number' ||
    !world.grid ||
    !Array.isArray(world.objects) ||
    !Array.isArray(world.folks)
  ) {
    throw new SaveError('save corrompido');
  }
  return {
    version,
    savedAt: typeof data.savedAt === 'number' ? data.savedAt : 0,
    world: JSON.parse(JSON.stringify(world)) as World,
  };
}
