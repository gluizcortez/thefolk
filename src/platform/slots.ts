// Bloco 7: vários jogos salvos. Três vagas com nome, dia, dinheiro e uma
// miniatura da casa; exportar e importar arquivo. O armazenamento de verdade
// (IndexedDB) fica atrás de SaveBackend, para os testes usarem um Map.

import { SAVE_VERSION, SaveError, deserialize, serialize } from '../sim/save';
import type { MigrationContext, SaveFile } from '../sim/save';
import { clockOf } from '../sim/clock';
import type { World } from '../sim/types';
import { t } from '../i18n';

export const SLOT_IDS = ['vaga1', 'vaga2', 'vaga3'] as const;
export type SlotId = (typeof SLOT_IDS)[number];
/** a vaga única de antes do bloco 7 */
export const LEGACY_SLOT = 'principal';
/** chave onde fica a vaga em uso */
const CURRENT_KEY = 'vaga-atual';
/** marca dos arquivos exportados */
export const EXPORT_FORMAT = 'thefolk-save';
export const NAME_MAX = 32;

export interface SaveBackend {
  get(key: string): Promise<unknown | undefined>;
  put(key: string, value: unknown): Promise<void>;
  delete(key: string): Promise<void>;
}

/** O que a tela de jogos salvos mostra sem abrir o mundo. */
export interface SlotMeta {
  name: string;
  savedAt: number;
  /** dia de jogo (1 = primeiro) */
  day: number;
  funds: number;
  /** nomes dos moradores */
  people: string[];
  /** miniatura (data URL), se a tela conseguiu tirar */
  thumb?: string;
}

export interface SlotRecord {
  meta: SlotMeta;
  save: SaveFile;
}

/** Arquivo exportado: o save de sempre com marca e nome. */
export interface ExportFile extends SaveFile {
  format: typeof EXPORT_FORMAT;
  name: string;
}

export function isSlotId(id: unknown): id is SlotId {
  return typeof id === 'string' && (SLOT_IDS as readonly string[]).includes(id);
}

/** Nome limpo para a vaga (sem espaços sobrando, com limite). */
export function cleanSlotName(name: string, fallback: string): string {
  const clean = name.replace(/\s+/g, ' ').trim().slice(0, NAME_MAX);
  return clean || fallback;
}

/** Nome padrão: a família pelo sobrenome do primeiro morador. */
export function defaultSlotName(world: World): string {
  const first = world.folks.find((f) => !f.visit);
  const parts = first?.name.trim().split(/\s+/) ?? [];
  return parts.length > 1 ? t('slots.family', { name: parts[parts.length - 1] }) : first ? t('slots.houseOf', { name: first.name }) : t('slots.house');
}

export function metaOf(world: World, name: string, savedAt: number, thumb?: string): SlotMeta {
  const meta: SlotMeta = {
    name: cleanSlotName(name, defaultSlotName(world)),
    savedAt,
    day: clockOf(world.tick).day,
    funds: Math.round(world.household.funds),
    people: world.folks.filter((f) => !f.visit).map((f) => f.name),
  };
  if (thumb) meta.thumb = thumb;
  return meta;
}

function isRecord(v: unknown): v is SlotRecord {
  if (typeof v !== 'object' || v === null) return false;
  const r = v as Partial<SlotRecord>;
  return typeof r.meta === 'object' && r.meta !== null && typeof r.save === 'object' && r.save !== null;
}

/** As três vagas, na ordem (null = vazia ou ilegível). */
export async function listSlots(db: SaveBackend): Promise<(SlotMeta | null)[]> {
  const out: (SlotMeta | null)[] = [];
  for (const id of SLOT_IDS) {
    const raw = await db.get(id);
    out.push(isRecord(raw) ? raw.meta : null);
  }
  return out;
}

export async function writeSlot(db: SaveBackend, id: SlotId, world: World, name: string, savedAt: number, thumb?: string): Promise<SlotMeta> {
  const meta = metaOf(world, name, savedAt, thumb);
  const record: SlotRecord = { meta, save: serialize(world, savedAt) };
  await db.put(id, record);
  return meta;
}

/** Lê a vaga e devolve o mundo já migrado (ou undefined se estiver vazia). */
export async function readSlot(db: SaveBackend, id: SlotId, ctx: MigrationContext): Promise<{ world: World; meta: SlotMeta } | undefined> {
  const raw = await db.get(id);
  if (raw === undefined) return undefined;
  if (!isRecord(raw)) throw new SaveError('vaga corrompida');
  return { world: deserialize(raw.save, ctx).world, meta: raw.meta };
}

export async function renameSlot(db: SaveBackend, id: SlotId, name: string): Promise<boolean> {
  const raw = await db.get(id);
  if (!isRecord(raw)) return false;
  raw.meta.name = cleanSlotName(name, raw.meta.name);
  await db.put(id, raw);
  return true;
}

export function deleteSlot(db: SaveBackend, id: SlotId): Promise<void> {
  return db.delete(id);
}

export async function currentSlot(db: SaveBackend): Promise<SlotId> {
  const raw = await db.get(CURRENT_KEY);
  return isSlotId(raw) ? raw : SLOT_IDS[0];
}

export function setCurrentSlot(db: SaveBackend, id: SlotId): Promise<void> {
  return db.put(CURRENT_KEY, id);
}

/** Primeira vaga vazia (para um jogo novo não apagar um antigo), ou null. */
export async function freeSlot(db: SaveBackend): Promise<SlotId | null> {
  const list = await listSlots(db);
  const i = list.findIndex((m) => m === null);
  return i < 0 ? null : SLOT_IDS[i];
}

/**
 * Saves de antes do bloco 7 ficavam numa vaga só. Na primeira vez, ela vira
 * a vaga 1 (se estiver livre) e a antiga é apagada. Devolve true se mudou.
 */
export async function adoptLegacy(db: SaveBackend, ctx: MigrationContext): Promise<boolean> {
  const old = await db.get(LEGACY_SLOT);
  if (old === undefined) return false;
  const target = (await db.get(SLOT_IDS[0])) === undefined ? SLOT_IDS[0] : await freeSlot(db);
  if (!target) return false;
  let world: World;
  try {
    world = deserialize(old, ctx).world;
  } catch {
    return false;
  }
  const savedAt = typeof (old as SaveFile).savedAt === 'number' ? (old as SaveFile).savedAt : Date.now();
  await writeSlot(db, target, world, defaultSlotName(world), savedAt);
  await setCurrentSlot(db, target);
  await db.delete(LEGACY_SLOT);
  return true;
}

// ---------- exportar e importar ----------

/** Texto do arquivo exportado (JSON legível, com a versão do save). */
export function exportSave(world: World, name: string, savedAt: number): string {
  const file: ExportFile = { format: EXPORT_FORMAT, name: cleanSlotName(name, defaultSlotName(world)), ...serialize(world, savedAt) };
  return JSON.stringify(file);
}

/** Nome do arquivo para baixar: sem acento nem espaço. */
export function exportFileName(name: string, day: number): string {
  const slug = name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  return `${slug || 'thefolk'}-dia${day}.folk.json`;
}

/**
 * Lê um arquivo exportado (de qualquer versão antiga, que passa pelas
 * migrações). Lança SaveError com o motivo se não der.
 */
export function importSave(text: string, ctx: MigrationContext): { world: World; name: string; version: number } {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new SaveError('arquivo não é um save');
  }
  if (typeof raw !== 'object' || raw === null || (raw as Partial<ExportFile>).format !== EXPORT_FORMAT) {
    throw new SaveError('arquivo não é um save');
  }
  const file = raw as ExportFile;
  const version = file.version;
  const world = deserialize(file, ctx).world;
  return { world, name: cleanSlotName(String(file.name ?? ''), defaultSlotName(world)), version: typeof version === 'number' ? version : SAVE_VERSION };
}
