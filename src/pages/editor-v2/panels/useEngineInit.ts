// @ts-nocheck
import { useEffect, useRef, useState } from 'react';
import { useEditorStore } from '../../../store/useEditorStore';

export function useEngineInit(id: string) {
  const [autoSaveLabel, setAutoSaveLabel] = useState<'saved'|'saving'|null>(null);
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout>|null>(null);

  // Patch AutoSave to show indicator in UI
  useEffect(() => {
    const interval = setInterval(() => {
      const AS = (window as any).AutoSave;
      if (!AS) return;
      if (!AS.__patched) {
        const origPersist = AS.persist.bind(AS);
        AS.persist = async (key: string, json: string) => {
          setAutoSaveLabel('saving');
          await origPersist(key, json);
          setAutoSaveLabel('saved');
          if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
          autoSaveTimerRef.current = setTimeout(() => setAutoSaveLabel(null), 3000);
        };
        AS.__patched = true;
      }
    }, 500);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const initEngine = async () => {
      // 1. Init Editor App
      // ✅ FIX: On Vite HMR, window.app may already exist from a previous module load.
      // Always replace it with a fresh instance to prevent stale playback loops.
      if ((window as any).EditorApp) {
        if ((window as any).app) {
          // Kill old instance gracefully: mark it as stale so its RAF loop exits
          (window as any).app._stale = true;
          // Pause any ongoing playback
          try { (window as any).app.pausePlayback?.(); } catch {}
        }
        try { 
          const newApp = new (window as any).EditorApp();
          (window as any).app = newApp; // ← atomic swap: old RAF sees window.app !== this → exits
        } catch (e) { console.error(e); }
      }

      // 2. Read settings from localStorage
      if (!id) { window.location.href = '/startup'; return; }

      const raw = localStorage.getItem(`${id}_settings`);
      if (!raw) { window.location.href = '/startup'; return; }

      const settings = JSON.parse(raw);
      console.log('Starting Engine with settings:', settings);

      // ── KEY FIX: detect project change and force re-init ──────────────────
      const lastId = (window as any).__activeProjectId;
      if (lastId && lastId !== id) {
        // New project — reset engine so it loads fresh
        console.log(`Project changed ${lastId} → ${id}. Re-initializing engine.`);
        if ((window as any).app) {
          try { (window as any).app.destroy?.(); } catch {}
          (window as any).app = null;
        }
        (window as any).__pendingVideoFile  = null;
        (window as any).__pendingExtraFiles = [];
        // Re-create the app
        if ((window as any).EditorApp) {
          try { (window as any).app = new (window as any).EditorApp(); }
          catch (e) { console.error(e); }
        }
      }
      (window as any).__activeProjectId = id;
      // ─────────────────────────────────────────────────────────────────────

      // 3. Read video file from IndexedDB
      let videoFile: File | null = null;
      try {
        const fs = (window as any).FileStore;
        if (fs) videoFile = await fs.load(`${id}_video`) || null;
        if (!videoFile && (window as any).__pendingVideoFile)
          videoFile = (window as any).__pendingVideoFile;
      } catch(e) {
        console.error('IndexedDB read failed:', e);
        videoFile = (window as any).__pendingVideoFile || null;
      }

      // 4. Start the engine
      if ((window as any).app) {
        if (!(window as any).app.isInitialized) {
          (window as any).app.initProject(videoFile, settings.mode, settings.autoTranscribe);
          (window as any).app.isInitialized = true;
        }

        // 5. Apply SRT file if any
        if (settings.hasSRT) {
          setTimeout(async () => {
              const srtFile = await (window as any).FileStore?.load(`${id}_srt`).catch(() => null);
              if (srtFile && (window as any).aiManager) {
                  (window as any).aiManager.processExternalSRT(srtFile);
              }
          }, 1000);
        }

        // 6. Load extra files (images, additional videos, audio) uploaded from Startup
        setTimeout(async () => {
          try {
            const fs = (window as any).FileStore;
            if (!fs) return;
            const extraCount = parseInt(localStorage.getItem(`${id}_extra_count`) || '0', 10);

            // Also check in-memory extras (same session)
            const pendingExtras: File[] = (window as any).__pendingExtraFiles || [];

            const extraFiles: File[] = [];
            for (let i = 0; i < extraCount; i++) {
              try {
                const f = await fs.load(`${id}_extra_${i}`);
                if (f) extraFiles.push(f);
              } catch (_) {}
            }

            // Merge: prefer IndexedDB, fall back to in-memory
            const allExtras = extraFiles.length > 0 ? extraFiles : pendingExtras;

            if (allExtras.length > 0 && (window as any).useEditorStore) {
              const { addAsset } = (window as any).useEditorStore.getState();
              for (const file of allExtras) {
                const src = URL.createObjectURL(file);
                const type = file.type.startsWith('video/') ? 'video'
                  : file.type.startsWith('image/') ? 'image'
                  : file.type.startsWith('audio/') ? 'audio'
                  : 'video';
                const asset = {
                  id: `extra_${Date.now()}_${Math.random().toString(36).slice(2)}`,
                  name: file.name,
                  type,
                  src,
                  duration: undefined,
                };
                addAsset(asset);
                console.log(`[EditorV2] Loaded extra file: ${file.name} (${type})`);
              }
              (window as any).app?.log?.(`📁 تم تحميل ${allExtras.length} ملف إضافي من المشروع`);
            }
          } catch (e) {
            console.error('[EditorV2] Failed to load extra files:', e);
          }
        }, 1500); // بعد تهيئة الـ engine بـ 1.5 ثانية

        // ── 7. AUTO-RESTORE: reload saved timeline state from IndexedDB ──────
        setTimeout(async () => {
          try {
            const AutoSave = (window as any).AutoSave;
            if (!AutoSave) return;

            const savedJson = await AutoSave.load(`${id}_tracks_state`);
            if (!savedJson) {
              console.log('[AutoRestore] No saved state found — starting fresh.');
              return;
            }

            const app = (window as any).app;
            if (!app || !app.restoreState) return;

            // Build a map: file key → object URL for re-linking clip srcs
            const fs = (window as any).FileStore;
            const fileUrlMap: Record<string, string> = {};

            if (fs) {
              // Main video
              const vFile = await fs.load(`${id}_video`).catch(() => null);
              if (vFile) fileUrlMap['__main_video__'] = URL.createObjectURL(vFile);

              // Extra files
              const extraCount = parseInt(localStorage.getItem(`${id}_extra_count`) || '0', 10);
              for (let i = 0; i < extraCount; i++) {
                try {
                  const f = await fs.load(`${id}_extra_${i}`);
                  if (f) fileUrlMap[`__extra_${i}__`] = URL.createObjectURL(f);
                } catch (_) {}
              }
            }

            // Parse saved JSON and re-link srcs
            let parsed: any[] = [];
            try { parsed = JSON.parse(savedJson); } catch { return; }

            // Re-link: any clip src that is an expired blob:// gets replaced
            // by the fresh object URL from the re-opened file.
            // Strategy: for video clips, use the main video url;
            //           for extra clips, match by index ordering.
            let extraIdx = 0;
            parsed.forEach((track: any) => {
              track.clips?.forEach((clip: any) => {
                if (!clip.src) return;
                // Text and subtitle clips: src IS the text content — keep as-is
                if (clip.type === 'text' || clip.type === 'subtitle') return;
                // If src is a blob URL (will be dead after refresh), re-link
                if (clip.src.startsWith('blob:')) {
                  if (clip.type === 'video' && track.type !== 'audio') {
                    clip.src = fileUrlMap['__main_video__'] || clip.src;
                  } else if (clip.type === 'audio' && fileUrlMap['__main_video__']) {
                    // Audio extracted from the same video
                    clip.src = fileUrlMap['__main_video__'] || clip.src;
                  } else {
                    // Extra asset — assign by order
                    const key = `__extra_${extraIdx}__`;
                    if (fileUrlMap[key]) { clip.src = fileUrlMap[key]; extraIdx++; }
                  }
                }
              });
            });

            // Feed back to the engine
            // Temporarily replace tracks with the saved snapshot
            app.restoreState(JSON.stringify(parsed));

            // ✅ FIX: Always force-stop playback after restore.
            // The saved state might have isPlaying=true if editor was playing when saved.
            app.isPlaying = false;
            app.playbackRate = 0;
            app.isScrubbing = false;
            if (window.useEditorStore) window.useEditorStore.setState({ isPlaying: false });
            app.updatePlayStateUI?.();

            app.log('♻️ تم استعادة التعديلات السابقة تلقائياً');
            console.log(`[AutoRestore] ✅ Restored ${parsed.length} tracks for project ${id}`);
          } catch (e) {
            console.warn('[AutoRestore] Failed to restore state:', e);
          }
        }, 2500); // Run AFTER extra files are loaded (step 6 at 1500ms)
        // ─────────────────────────────────────────────────────────────────────
      }
    };

    initEngine();
  }, [id]);
}
