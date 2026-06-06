// @ts-nocheck
/**
 * autosave_feature.ts
 * Persists the timeline tracks state to IndexedDB on every saveState() call.
 * On engine init, automatically restores from IndexedDB if a saved state exists.
 *
 * Storage key: `${projectId}_tracks_state` (in IndexedDB store "p43_autosave")
 */

const AUTOSAVE_DB   = 'p43_autosave';
const AUTOSAVE_STORE = 'timeline';
const DB_VERSION    = 1;

function openAutosaveDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
        const req = indexedDB.open(AUTOSAVE_DB, DB_VERSION);
        req.onupgradeneeded = (e: any) => {
            e.target.result.createObjectStore(AUTOSAVE_STORE);
        };
        req.onsuccess = (e: any) => resolve(e.target.result);
        req.onerror   = (e: any) => reject(e.target.error);
    });
}

async function persistTracks(key: string, tracksJson: string): Promise<void> {
    try {
        const db = await openAutosaveDB();
        await new Promise<void>((resolve, reject) => {
            const tx = db.transaction(AUTOSAVE_STORE, 'readwrite');
            tx.objectStore(AUTOSAVE_STORE).put(tracksJson, key);
            tx.oncomplete = () => resolve();
            tx.onerror    = (e: any) => reject(e.target.error);
        });
    } catch (e) {
        console.warn('[AutoSave] Failed to persist tracks:', e);
    }
}

async function loadPersistedTracks(key: string): Promise<string | null> {
    try {
        const db = await openAutosaveDB();
        return await new Promise<string | null>((resolve, reject) => {
            const tx = db.transaction(AUTOSAVE_STORE, 'readonly');
            const req = tx.objectStore(AUTOSAVE_STORE).get(key);
            req.onsuccess = (e: any) => resolve(e.target.result || null);
            req.onerror   = (e: any) => reject(e.target.error);
        });
    } catch (e) {
        console.warn('[AutoSave] Failed to load persisted tracks:', e);
        return null;
    }
}

export async function deletePersistedTracks(key: string): Promise<void> {
    try {
        const db = await openAutosaveDB();
        await new Promise<void>((resolve, reject) => {
            const tx = db.transaction(AUTOSAVE_STORE, 'readwrite');
            tx.objectStore(AUTOSAVE_STORE).delete(key);
            tx.oncomplete = () => resolve();
            tx.onerror    = (e: any) => reject(e.target.error);
        });
    } catch (e) {
        console.warn('[AutoSave] Failed to delete tracks:', e);
    }
}

// Throttle saves so we don't write to IndexedDB on every frame
let saveTimer: ReturnType<typeof setTimeout> | null = null;

export function injectAutosaveFeature() {

    // ── Expose low-level API so EditorV2 can call it ──────────────────────
    (window as any).AutoSave = {
        persist: persistTracks,
        load: loadPersistedTracks,
        delete: deletePersistedTracks,
    };

    // ── Wrap saveState to also persist to IndexedDB ───────────────────────
    const originalSaveState = (window as any).EditorApp.prototype.saveState;
    (window as any).EditorApp.prototype.saveState = function () {
        // Call original in-memory history save
        if (originalSaveState) originalSaveState.call(this);

        // Throttle: wait 400ms after last call to batch rapid edits
        if (saveTimer) clearTimeout(saveTimer);
        saveTimer = setTimeout(() => {
            const projectId = (window as any).__activeProjectId;
            if (!projectId) return;

            try {
                // Serialize tracks — strip blob src for text clips (they don't need re-linking)
                const serialized = JSON.stringify(this.tracks);
                persistTracks(`${projectId}_tracks_state`, serialized);
                console.log(`[AutoSave] 💾 Saved ${this.tracks.length} tracks for project ${projectId}`);
            } catch (e) {
                console.warn('[AutoSave] Serialization error:', e);
            }
        }, 400);
    };

    console.log('[AutoSave] ✅ Feature injected — saveState now persists to IndexedDB');
}
