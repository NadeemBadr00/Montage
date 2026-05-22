// Wrapper around IndexedDB for video/srt/plan file storage
// Replaces the global window.FileStore from the old js/core/file_store.js

const DB_NAME    = 'P43FileStore';
const STORE_NAME = 'files';
const DB_VERSION = 1;

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE_NAME);
    req.onsuccess = () => resolve(req.result);
    req.onerror   = () => reject(req.error);
  });
}

async function saveFile(key: string, file: File): Promise<void> {
  const db  = await openDB();
  const tx  = db.transaction(STORE_NAME, 'readwrite');
  tx.objectStore(STORE_NAME).put(file, key);
  return new Promise((res, rej) => { tx.oncomplete = () => res(); tx.onerror = () => rej(tx.error); });
}

async function removeFile(key: string): Promise<void> {
  const db  = await openDB();
  const tx  = db.transaction(STORE_NAME, 'readwrite');
  tx.objectStore(STORE_NAME).delete(key);
  return new Promise((res, rej) => { tx.oncomplete = () => res(); tx.onerror = () => rej(tx.error); });
}

export async function getFile(key: string): Promise<File | undefined> {
  const db  = await openDB();
  const tx  = db.transaction(STORE_NAME, 'readonly');
  const req = tx.objectStore(STORE_NAME).get(key);
  return new Promise((res, rej) => { req.onsuccess = () => res(req.result); req.onerror = () => rej(req.error); });
}

export function useFileStore() {
  return { save: saveFile, remove: removeFile, get: getFile };
}

// Expose to window for legacy JS compatibility (editor.html JS modules)
if (typeof window !== 'undefined') {
  (window as unknown as Record<string, unknown>)['FileStore'] = { save: saveFile, remove: removeFile, get: getFile };
}
