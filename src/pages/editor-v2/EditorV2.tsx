import React, { useEffect, useState, useRef } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import Timeline from './components/Timeline';
import Player from './components/Player';
import AssetsPanel from './components/AssetsPanel';
import EffectControls from './components/EffectControls';
import Modals from './components/Modals';
import RightPanel from './components/RightPanel';
import { useEditorStore } from '../../store/useEditorStore';
import { useFileStore } from '../../hooks/useFileStore'; // Ensures window.FileStore is always registered

// BUG #1 FIX: Expose Zustand store on window so the Legacy Engine
// (video_preview.ts, tracks.ts, clips.ts) can call
// window.useEditorStore.setState() reliably at any time.
(window as any).useEditorStore = useEditorStore;

// AutoMontage Bridge: keep window.mediaLibraryItems in sync with Zustand assetsList
// This allows auto_montage.ts (a non-React module) to read all uploaded media.
useEditorStore.subscribe(
  (state) => { (window as any).mediaLibraryItems = state.assetsList; }
);
// Initial sync
(window as any).mediaLibraryItems = useEditorStore.getState().assetsList;


// Import the legacy engine (this will evaluate the scripts and register window classes)
import '../../editor-engine/main';

export default function EditorV2() {
  const { userData } = useAuth();
  const { id } = useParams();
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
      if ((window as any).EditorApp && !(window as any).app) {
        try { (window as any).app = new (window as any).EditorApp(); }
        catch (e) { console.error(e); }
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
  return (
    <div className="flex flex-col h-screen w-full max-w-full bg-[#050811] text-gray-300 font-cairo overflow-hidden box-border m-0 p-0 absolute inset-0">
      {/* GLOBAL HEADER */}
      <header 
        className="bg-[#0a0f1d] border-b border-gray-800 py-1 flex-shrink-0 h-10 flex items-center justify-between select-none w-full box-border"
        style={{ paddingLeft: '32px', paddingRight: '32px' }}
      >
        {/* LOGO AREA */}
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-red-600/20 rounded flex items-center justify-center border border-red-500/50">
            <i className="fa-solid fa-brain text-xs text-red-500"></i>
          </div>
          <h1 className="text-[13px] font-bold tracking-wide text-gray-200">
            AI4Montage <span className="bg-red-600 text-white text-[9px] rounded px-1 ml-1 font-mono">AI ULTRA</span>
          </h1>
        </div>
        
        {/* CONTROLS & USER AREA */}
        <div className="flex items-center gap-3">
          <button 
            className="flex items-center gap-1 bg-blue-600 hover:bg-blue-500 text-white px-3 py-1 rounded text-[11px] font-bold transition-colors shadow-lg"
            onClick={async () => {
              const app = (window as any).app;
              if (app && (window as any).FileStore) {
                const btn = document.getElementById('export-btn-icon');
                if (btn) btn.className = "fa-solid fa-spinner fa-spin";
                
                try {
                  const exportManifest = {
                    tracks: app.tracks.map((t: any) => ({
                        id: t.id,
                        type: t.type,
                        clips: t.clips.map((c: any) => ({
                            id: c.id,
                            type: c.type,
                            src: c.src,
                            start: c.start,
                            duration: c.duration,
                            sourceIn: c.sourceIn,
                            properties: c.properties,
                            text: c.src, // Text content is in src
                            textStyle: c.textStyle,
                            transitions: c.transitions,
                            aiSegmentation: c.aiSegmentation,
                            logoRemovers: c.logoRemovers
                        }))
                    })),
                    duration: app.duration,
                    fps: app.FPS,
                    baseWidth: app.canvas?.width || 1280,
                    baseHeight: app.canvas?.height || 720
                  };
                  
                  await (window as any).FileStore.save(`${id}_export_manifest`, new Blob([JSON.stringify(exportManifest)], { type: 'application/json' }));
                } catch(e) {
                  console.error('Failed to save export manifest', e);
                  useEditorStore.getState().addLog(`❌ فشل حفظ خريطة التصدير: ${e.message}`);
                }
                
                if (btn) btn.className = "fa-solid fa-download";
              }
              useEditorStore.getState().addLog(`🎬 جاري التصدير (مدة التايم لاين: ${app?.duration.toFixed(2)} ثانية, الفريمات: ${app?.FPS})`);
              window.open(`/export.html?id=${id}`, '_blank');
            }}
          >
            <i id="export-btn-icon" className="fa-solid fa-download"></i> MP4 Export
          </button>
          <button 
            className="flex items-center gap-1 bg-green-600 hover:bg-green-500 text-white px-3 py-1 rounded text-[11px] font-bold transition-colors shadow-lg"
            onClick={() => (window as any).app?.downloadXML()}
          >
            <i className="fa-solid fa-file-code"></i> XML Export
          </button>

          {/* AutoSave indicator */}
          {autoSaveLabel && (
            <div className={`flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border transition-all ${
              autoSaveLabel === 'saving'
                ? 'bg-yellow-600/20 text-yellow-400 border-yellow-600/40'
                : 'bg-green-600/20 text-green-400 border-green-600/40'
            }`}>
              <div className={`w-1.5 h-1.5 rounded-full ${
                autoSaveLabel === 'saving' ? 'bg-yellow-400 animate-pulse' : 'bg-green-400'
              }`}></div>
              {autoSaveLabel === 'saving' ? 'جاري الحفظ...' : '✓ محفوظ'}
            </div>
          )}

          {/* Reset to original button */}
          <button
            title="مسح التعديلات والرجوع للمشروع الأصلي"
            className="flex items-center gap-1 text-[10px] text-gray-500 hover:text-red-400 bg-[#1e293b] px-2 py-1 rounded border border-gray-700 hover:border-red-600/50 transition-all"
            onClick={async () => {
              if (!confirm('هتمسح كل التعديلات وترجع للمشروع الأصلي. مش هتقدر ترجع تاني. متأكد؟')) return;
              const AS = (window as any).AutoSave;
              if (AS && id) {
                await AS.delete(`${id}_tracks_state`);
              }
              window.location.reload();
            }}
          >
            <i className="fa-solid fa-rotate-left text-[9px]"></i> Reset
          </button>
          
          <button 
            onClick={() => document.getElementById('system-log-modal')?.classList.remove('hidden')}
            className="text-gray-400 hover:text-white text-[10px] flex items-center gap-1 bg-[#1e293b] px-2 py-1 rounded border border-gray-700 transition-colors"
            title="System Log"
          >
            <i className="fa-solid fa-list-check"></i> System Log
          </button>

          <Link to="/" className="text-[11px] text-gray-400 hover:text-white transition-colors bg-[#1e293b] px-3 py-1 rounded-full border border-gray-700 flex items-center gap-1 shadow-sm">
            <i className="fa-solid fa-house text-[10px]"></i> Home
          </Link>
          
          <div className="w-[1px] h-4 bg-gray-700 mx-1"></div>

          <div className="flex items-center gap-2">
            {userData?.photo ? (
              <img src={userData.photo} alt="User" className="w-7 h-7 rounded-full border border-gray-600 object-cover" id="header-user-avatar" referrerPolicy="no-referrer" />
            ) : (
              <div className="w-7 h-7 bg-gray-700 rounded-full flex items-center justify-center overflow-hidden border border-gray-600" id="header-user-avatar">
                <i className="fa-solid fa-user text-white text-[10px]"></i>
              </div>
            )}
            <span className="text-[11px] text-gray-300 font-bold max-w-[100px] truncate">{userData?.name || 'مستخدم'}</span>
          </div>
        </div>
      </header>

      <main className="relative flex-grow w-full h-[calc(100vh-40px)] overflow-hidden box-border">
        
        {/* Top Left (Visual Left in RTL) -> RightPanel (CMD Center) */}
        <div className="absolute" style={{ top: '12px', bottom: 'calc(45% + 4px)', left: '12px', width: '300px' }}>
          <div className="w-full h-full [&>div]:!h-full [&>div]:!w-full [&>div]:!max-w-full">
            <RightPanel />
          </div>
        </div>

        {/* Top Middle -> Player (Canvas) */}
        <div className="absolute" style={{ top: '12px', bottom: 'calc(45% + 4px)', left: '320px', right: '260px' }}>
          <div className="w-full h-full [&>div]:!h-full [&>div]:!w-full [&>div]:!max-w-full">
            <Player />
          </div>
        </div>

        {/* Top Right (Visual Right in RTL) -> EffectControls */}
        <div className="absolute" style={{ top: '12px', bottom: 'calc(45% + 4px)', right: '12px', width: '240px' }}>
          <div className="w-full h-full [&>div]:!h-full [&>div]:!w-full [&>div]:!max-w-full">
            <EffectControls />
          </div>
        </div>

        {/* Bottom Left (Visual Left) -> Assets Panel */}
        <div className="absolute" style={{ top: 'calc(55% + 4px)', bottom: '12px', left: '12px', width: '320px' }}>
          <div className="w-full h-full [&>div]:!h-full [&>div]:!w-full [&>div]:!max-w-full">
            <AssetsPanel />
          </div>
        </div>

        {/* Bottom Right + Middle (Visual Right & Middle) -> Timeline */}
        <div className="absolute" style={{ top: 'calc(55% + 4px)', bottom: '12px', left: '340px', right: '12px' }}>
          <div className="w-full h-full [&>div]:!h-full [&>div]:!w-full [&>div]:!max-w-full">
            <Timeline />
          </div>
        </div>

      </main>

      <Modals />
    </div>
  );
}
