import { describe, expect, it } from 'vitest';
import { CATALOG } from '../src/data/catalog';
import { NEIGHBORS, NEIGHBOR_TIES } from '../src/data/neighbors';
import { SAVE_VERSION, serialize } from '../src/sim';
import type { World } from '../src/sim';
import {
  EXPORT_FORMAT,
  LEGACY_SLOT,
  SLOT_IDS,
  adoptLegacy,
  cleanSlotName,
  currentSlot,
  defaultSlotName,
  deleteSlot,
  exportFileName,
  exportSave,
  freeSlot,
  importSave,
  listSlots,
  readSlot,
  renameSlot,
  setCurrentSlot,
  writeSlot,
} from '../src/platform/slots';
import type { SaveBackend } from '../src/platform/slots';
import { householdSim, run } from './helpers';

const CTX = { neighbors: NEIGHBORS, ties: NEIGHBOR_TIES, catalog: CATALOG };

/** IndexedDB de mentira: um Map que copia como o navegador copia. */
function memoryDb(): SaveBackend & { data: Map<string, unknown> } {
  const data = new Map<string, unknown>();
  const copy = (v: unknown) => (v === undefined ? undefined : structuredClone(v));
  return {
    data,
    get: async (k) => copy(data.get(k)),
    put: async (k, v) => void data.set(k, copy(v)),
    delete: async (k) => void data.delete(k),
  };
}

function playedWorld(seed: number, minutes = 600): World {
  const sim = householdSim(seed);
  run(sim, minutes);
  return sim.world;
}

describe('três vagas de jogo salvo (bloco 7)', () => {
  it('cada vaga guarda um jogo com nome, dia, dinheiro e miniatura', async () => {
    const db = memoryDb();
    expect(await listSlots(db)).toEqual([null, null, null]);
    const a = playedWorld(1);
    const b = playedWorld(2, 2000);
    const c = playedWorld(3, 30);
    await writeSlot(db, 'vaga1', a, 'Casa do lago', 1000, 'data:image/png;base64,AAAA');
    await writeSlot(db, 'vaga2', b, '', 2000);
    await writeSlot(db, 'vaga3', c, '  muito    espaço  ', 3000);
    const list = await listSlots(db);
    expect(list.map((m) => m?.name)).toEqual(['Casa do lago', defaultSlotName(b), 'muito espaço']);
    expect(list[0]?.thumb).toContain('data:image/png');
    expect(list[1]?.day).toBe(Math.floor(b.tick / 1440) + 1);
    expect(list[0]?.funds).toBe(Math.round(a.household.funds));
    expect(list[0]?.people.length).toBe(a.folks.filter((f) => !f.visit).length);
    expect(await freeSlot(db)).toBeNull();

    // cada vaga devolve o seu mundo, igualzinho
    for (const [id, w] of [['vaga1', a], ['vaga2', b], ['vaga3', c]] as const) {
      const back = await readSlot(db, id, CTX);
      expect(back?.world).toEqual(serialize(w, 0).world);
    }
  });

  it('renomear, apagar e lembrar a vaga em uso', async () => {
    const db = memoryDb();
    const w = playedWorld(4, 60);
    await writeSlot(db, 'vaga2', w, 'Primeiro', 1);
    expect(await renameSlot(db, 'vaga2', 'Segundo nome')).toBe(true);
    expect(await renameSlot(db, 'vaga3', 'nada')).toBe(false);
    expect((await listSlots(db))[1]?.name).toBe('Segundo nome');
    expect(await currentSlot(db)).toBe('vaga1');
    await setCurrentSlot(db, 'vaga2');
    expect(await currentSlot(db)).toBe('vaga2');
    expect(await freeSlot(db)).toBe('vaga1');
    await deleteSlot(db, 'vaga2');
    expect(await listSlots(db)).toEqual([null, null, null]);
    expect(await readSlot(db, 'vaga2', CTX)).toBeUndefined();
  });

  it('o save antigo de vaga única vira a vaga 1 na primeira abertura', async () => {
    const db = memoryDb();
    const w = playedWorld(5, 120);
    await db.put(LEGACY_SLOT, serialize(w, 777));
    expect(await adoptLegacy(db, CTX)).toBe(true);
    expect(db.data.has(LEGACY_SLOT)).toBe(false);
    const back = await readSlot(db, SLOT_IDS[0], CTX);
    expect(back?.world).toEqual(serialize(w, 0).world);
    expect(back?.meta.savedAt).toBe(777);
    expect(back?.meta.name).toBe(defaultSlotName(w));
    expect(await adoptLegacy(db, CTX)).toBe(false);
  });

  it('nomes limpos e nome padrão pela família', () => {
    expect(cleanSlotName('   ', 'Padrão')).toBe('Padrão');
    expect(cleanSlotName('x'.repeat(80), 'P')).toHaveLength(32);
    const w = householdSim(1).world;
    expect(defaultSlotName(w)).toMatch(/^Família /);
  });
});

describe('exportar e importar (bloco 7)', () => {
  it('exportar e importar devolvem o mesmo mundo', () => {
    const w = playedWorld(6, 3000);
    w.objects.find((o) => o.defId === 'speaker')!.tune = 'chiclete';
    const text = exportSave(w, 'Família Teste', 123);
    const file = JSON.parse(text);
    expect(file.format).toBe(EXPORT_FORMAT);
    expect(file.version).toBe(SAVE_VERSION);
    const back = importSave(text, CTX);
    expect(back.name).toBe('Família Teste');
    expect(back.world).toEqual(serialize(w, 0).world);
    // e o mundo importado segue jogando igual ao original
    const again = importSave(exportSave(back.world, back.name, 1), CTX);
    expect(again.world).toEqual(back.world);
  });

  it('arquivo de versão antiga passa pelas migrações', () => {
    const w = serialize(playedWorld(7, 100), 5);
    // v10: antes dos campos do bloco 6 (o bloco 8 levou o save para v12)
    const old = { ...w, version: 10, format: EXPORT_FORMAT, name: 'Antigo' };
    // a v10 não tinha os campos do bloco 6: a migração precisa repor
    for (const f of old.world.folks as unknown as Record<string, unknown>[]) {
      delete f.thought;
      delete f.wishes;
      delete f.spark;
    }
    const back = importSave(JSON.stringify(old), CTX);
    expect(back.version).toBe(10);
    expect(back.world.folks.every((f) => Array.isArray(f.wishes))).toBe(true);
  });

  it('arquivos que não são save são recusados com motivo', () => {
    expect(() => importSave('não é json', CTX)).toThrow('arquivo não é um save');
    expect(() => importSave(JSON.stringify({ version: 1, world: {} }), CTX)).toThrow('arquivo não é um save');
    const future = { ...serialize(householdSim(1).world, 1), version: SAVE_VERSION + 1, format: EXPORT_FORMAT, name: 'x' };
    expect(() => importSave(JSON.stringify(future), CTX)).toThrow('versão mais nova');
  });

  it('nome do arquivo sem acento nem espaço', () => {
    expect(exportFileName('Família Sacadura Ção', 12)).toBe('familia-sacadura-cao-dia12.folk.json');
    expect(exportFileName('???', 1)).toBe('thefolk-dia1.folk.json');
  });
});
