import { useState, useRef, useEffect } from 'react';
import type { NavigateFunction } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../../firebase';
import { getFile } from '../../hooks/useFileStore';

interface Props {
  navigate: NavigateFunction;
  loadingRef: React.RefObject<HTMLDivElement | null>;
}

/** Load a <script> tag and wait for it to fully execute */
function loadScript(src: string, isModule = false): Promise<void> {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) { resolve(); return; }
    const s = document.createElement('script');
    s.src = src;
    if (isModule) s.type = 'module';
    s.onload  = () => resolve();
    s.onerror = () => {
      console.warn(`Could not load ${src}`);
      resolve(); // Don't block — resolve even on error
    };
    document.body.appendChild(s);
  });
}

export function useEditorInit({ navigate, loadingRef }: Props) {
  const [loading, setLoading]             = useState(true);
  const [loadingStatus, setLoadingStatus] = useState('جارٍ تحميل المحرر...');
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    // Auth check (non-blocking)
    const cached = localStorage.getItem('p43_user');
    const unsub  = onAuthStateChanged(auth, user => {
      if (!user && !cached) navigate('/login', { replace: true });
    });

    initEditor();
    return () => unsub();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function initEditor() {
    try {
      setLoadingStatus('جارٍ تحميل محركات المحرر...');

      // ── 1. Load core scripts sequentially (order matters!) ─────────────────
      // Note: editing_engine.js defines EditorApp class
      // assets.js extends it with initProject (which calls init() internally)
      // timeline.js extends it with renderAll, renderTracks
      // video_preview.js extends it with setupVideoSync
      const coreScripts = [
        '/js/core/editing_engine.js',  // must be FIRST — defines EditorApp class
        '/js/core/assets.js',          // adds initProject, renderAssetsLibrary
        '/js/core/timeline.js',        // adds renderAll, renderTracks, setupTracks
        '/js/core/video_preview.js',   // adds setupVideoSync
        '/js/core/file_store.js',      // adds window.FileStore
      ];
      const featureScripts = [
        '/js/features/command_center.js',
        '/js/features/xml_exporter.js',
        '/js/features/pro_features.js',
        '/js/features/ultra_features.js',
        '/js/features/frame_features.js',
        '/js/features/bubble_feature.js',
        '/js/features/grid_feature.js',
      ];
      const moduleScripts = [
        '/js/ai/gemini_chat.js',
        '/js/ai/gemini_plan.js',
        '/js/ai/ai.js',
      ];

      for (const src of [...coreScripts, ...featureScripts]) {
        await loadScript(src);
      }
      // AI modules load async in parallel
      moduleScripts.forEach(src => loadScript(src, true));

      setLoadingStatus('جارٍ تهيئة المحرر...');

      // ── 2. Get session settings set by Startup page ─────────────────────────
      const raw      = sessionStorage.getItem('p43_settings');
      const settings = raw ? JSON.parse(raw) : null;
      const win      = window as unknown as Record<string, unknown>;

      // ── 3. Instantiate EditorApp (DO NOT call init() manually here!) ─────────
      //    initProject() in assets.js calls this.init() internally.
      //    If we call init() here first it would double-init and break DOM setup.
      if (win['EditorApp']) {
        try {
          win['app'] = new (win['EditorApp'] as new () => unknown)();
        } catch (e) {
          console.error('EditorApp constructor error:', e);
        }
      }

      // ── 4. If no settings → open editor in empty mode (user came directly) ──
      if (!settings) {
        // Still call init() to set up DOM bindings for empty editor
        try {
          const app = win['app'] as { init?: () => void };
          app?.init?.();
        } catch (e) {
          console.error('Editor empty init error:', e);
        }
        fadeOutLoader();
        return;
      }

      // ── 5. Load video file from IndexedDB ────────────────────────────────────
      setLoadingStatus(`جارٍ تحميل "${settings.videoName || 'الفيديو'}"...`);
      let videoFile: File | undefined;
      try { videoFile = await getFile('p43_video'); } catch { /* noop */ }

      if (!videoFile) {
        // No video found — open empty editor (don't redirect)
        try {
          const app = win['app'] as { init?: () => void };
          app?.init?.();
        } catch (e) { console.error(e); }
        fadeOutLoader();
        return;
      }

      // ── 6. Apply Gemini API key ────────────────────────────────────────────
      if (settings.apiKey) {
        sessionStorage.setItem('p43_gemini_key', settings.apiKey);
        win['_geminiAPIKey'] = settings.apiKey;
      }

      // ── 7. Configure Gemini Chat ───────────────────────────────────────────
      const applyGemini = () => {
        const gc = win['geminiChat'] as { enabled?: boolean; init?: () => void } | undefined;
        if (gc) { gc.enabled = settings.aiEnabled !== false; if (gc.enabled) gc.init?.(); }
      };
      applyGemini();
      setTimeout(applyGemini, 1500);

      // ── 8. Init project WITH video ─────────────────────────────────────────
      //    initProject() in assets.js calls this.init() internally — no need to call init() before
      setLoadingStatus('جارٍ بناء التايم لاين...');
      try {
        const app = win['app'] as {
          initProject?: (f: File, mode: string, at: boolean) => Promise<void>;
        };
        await app?.initProject?.(videoFile, settings.mode ?? 'manual', settings.autoTranscribe ?? false);
      } catch (e) {
        console.error('initProject error:', e);
      }

      // ── 9. Apply SRT / Plan files ──────────────────────────────────────────
      if (settings.hasSRT) {
        setTimeout(async () => {
          const srtFile = await getFile('p43_srt').catch(() => undefined);
          if (srtFile) {
            (win['aiManager'] as { processExternalSRT?: (f: File) => void })?.processExternalSRT?.(srtFile);
          }
        }, 1500);
      }
      if (settings.hasPlan) {
        setTimeout(async () => {
          const planFile = await getFile('p43_plan').catch(() => undefined);
          if (planFile) {
            const gc = win['geminiChat'] as { enabled?: boolean; init?: () => void } | undefined;
            if (!gc?.enabled && gc) { gc.enabled = true; gc.init?.(); }
            (win['geminiPlan'] as { handlePlanUpload?: (x: { files: File[]; value: string }) => void })
              ?.handlePlanUpload?.({ files: [planFile], value: '' });
          }
        }, 2000);
      }

      // ── 10. Cleanup ────────────────────────────────────────────────────────
      setTimeout(() => sessionStorage.removeItem('p43_settings'), 5000);

    } catch (err) {
      console.error('Editor init error:', err);
    } finally {
      fadeOutLoader();
    }
  }

  function fadeOutLoader() {
    const loader = loadingRef.current;
    if (loader) {
      loader.style.transition = 'opacity 0.4s';
      loader.style.opacity    = '0';
      setTimeout(() => setLoading(false), 450);
    } else {
      setLoading(false);
    }
  }

  return { loading, loadingStatus };
}
