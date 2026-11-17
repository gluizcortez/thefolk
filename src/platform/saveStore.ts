// Persistência em IndexedDB. Só guarda e devolve o objeto do save; o formato
// e as migrações ficam em sim/save.ts.

const DB_NAME = 'thefolk';
const STORE = 'saves';
const DB_VERSION = 1;

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE)) req.result.createObjectStore(STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function run<T>(mode: IDBTransactionMode, fn: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return openDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const tx = db.transaction(STORE, mode);
        const req = fn(tx.objectStore(STORE));
        tx.oncomplete = () => {
          db.close();
          resolve(req.result);
        };
        tx.onerror = () => {
          db.close();
          reject(tx.error);
        };
        tx.onabort = () => {
          db.close();
          reject(tx.error);
        };
      }),
  );
}

export function writeSave(slot: string, data: unknown): Promise<void> {
  return run('readwrite', (s) => s.put(data, slot)).then(() => undefined);
}

export function readSave(slot: string): Promise<unknown | undefined> {
  return run('readonly', (s) => s.get(slot) as IDBRequest<unknown>);
}

export function deleteSave(slot: string): Promise<void> {
  return run('readwrite', (s) => s.delete(slot)).then(() => undefined);
}
