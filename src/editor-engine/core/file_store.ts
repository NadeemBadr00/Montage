// @ts-nocheck
﻿/**
 * file_store.js — IndexedDB bridge for passing File objects between pages
 * Used by: startup.html (save) → editor.html (load)
 */

const FILE_STORE_DB   = 'p43_file_store';
const FILE_STORE_NAME = 'files';
const DB_VERSION      = 1;

function openDB() {
    return new Promise((resolve, reject) => {
        const req = indexedDB.open(FILE_STORE_DB, DB_VERSION);
        req.onupgradeneeded = (e) => {
            e.target.result.createObjectStore(FILE_STORE_NAME);
        };
        req.onsuccess = (e) => resolve(e.target.result);
        req.onerror   = (e) => reject(e.target.error);
    });
}

window.FileStore = {
    /** Save a File object under a given key */
    async save(key, file) {
        const db = await openDB();
        return new Promise((resolve, reject) => {
            const tx    = db.transaction(FILE_STORE_NAME, 'readwrite');
            const store = tx.objectStore(FILE_STORE_NAME);
            const req   = store.put(file, key);
            req.onsuccess = () => resolve();
            req.onerror   = (e) => reject(e.target.error);
        });
    },

    /** Load a File object by key */
    async load(key) {
        const db = await openDB();
        return new Promise((resolve, reject) => {
            const tx    = db.transaction(FILE_STORE_NAME, 'readonly');
            const store = tx.objectStore(FILE_STORE_NAME);
            const req   = store.get(key);
            req.onsuccess = (e) => resolve(e.target.result || null);
            req.onerror   = (e) => reject(e.target.error);
        });
    },

    /** Remove a stored file */
    async remove(key) {
        const db = await openDB();
        return new Promise((resolve, reject) => {
            const tx    = db.transaction(FILE_STORE_NAME, 'readwrite');
            const store = tx.objectStore(FILE_STORE_NAME);
            const req   = store.delete(key);
            req.onsuccess = () => resolve();
            req.onerror   = (e) => reject(e.target.error);
        });
    }
};

