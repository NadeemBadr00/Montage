import { useState, useRef, useEffect } from 'react';
import type { NavigateFunction } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../../firebase';
import { getFile } from '../../hooks/useFileStore';

interface Props {
  navigate: NavigateFunction;
  loadingRef: React.RefObject<HTMLDivElement | null>;
}

// Load a script and return a promise that resolves when it's done
function loadScript(src: string, isModule = false): Promise<void> {
  return new Promise((resolve, reject) => {
    // Avoid double-loading
    if (document.querySelector(`script[src="${src}"]`)) { resolve(); return; }
    const s = document.createElement('script');
    s.src = src;
    if (isModule) s.type = 'module';
    s.onload  = () => resolve();
    s.onerror = () => reject(new Error(`Failed to load ${src}`));
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

    // Auth check
    const cached = localStorage.getItem('p43_user');
    const unsub = onAuthStateChanged(auth, user => {
      if (!user && !cached) navigate('/login', { replace: true });
    });

    initEditor();
    return () => unsub();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function initEditor() {
    try {
      setLoadingStatus('جارٍ تحميل المكتبات...');

      // 1. Load all scripts in correct order (sequential, not parallel)
      const regularScripts = [
        '/js/core/file_store.js',
        '/js/core/editing_engine.js',
        '/js/core/assets.js',
        '/js/core/timeline.js',
        '/js/core/video_preview.js',
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

      for (const src of regularScripts) {
        await loadScript(src);
      }
      // Module scripts load async but we don't need to wait
      moduleScripts.forEach(src => loadScript(src, true).catch(console.warn));

      setLoadingStatus('جارٍ تهيئة المحرر...');

      // 2. Check for settings from startup page
      const raw = sessionStorage.getItem('p43_settings');
      const win = window as unknown as Record<string, unknown>;

      // 3. Instantiate EditorApp
      if (win['EditorApp']) {
        try {
          win['app'] = new (win['EditorApp'] as new () => unknown)();
          // Call init() to set up DOM bindings
          const app = win['app'] as { init?: () => void };
          app.init?.();
        } catch (e) {
          console.error('EditorApp init error:', e);
        }
      } else {
        console.error('❌ EditorApp not found after script load');
      }

      // 4. If no settings → show editor in "empty" mode (don't redirect)
      if (!raw) {
        setLoadingStatus('');
        fadeOutLoader();
        return;
      }

      const settings = JSON.parse(raw);
      setLoadingStatus(`جارٍ تحميل "${settings.videoName || 'الفيديو'}"...`);

      // 5. Load video from IndexedDB
      let videoFile: File | undefined;
      try { videoFile = await getFile('p43_video'); } catch { /* noop */ }

      if (!videoFile) {
        // No video file → still open editor without project
        fadeOutLoader();
        return;
      }

      // 6. Apply API key
      if (settings.apiKey) {
        sessionStorage.setItem('p43_gemini_key', settings.apiKey);
        win['_geminiAPIKey'] = settings.apiKey;
      }

      // 7. Configure Gemini Chat
      const applyGemini = () => {
        const gc = win['geminiChat'] as { enabled?: boolean; init?: () => void } | undefined;
        if (gc) {
          gc.enabled = settings.aiEnabled !== false;
          if (gc.enabled) gc.init?.();
        }
      };
      applyGemini();
      setTimeout(applyGemini, 1000);

      // 8. Init project with video
      setLoadingStatus('جارٍ بناء التايم لاين...');
      const app = win['app'] as { initProject?: (f: File, mode: string, at: boolean) => void };
      app?.initProject?.(videoFile, settings.mode, settings.autoTranscribe);

      // 9. Apply SRT file
      if (settings.hasSRT) {
        setTimeout(async () => {
          const srtFile = await getFile('p43_srt').catch(() => undefined);
          if (srtFile) {
            (win['aiManager'] as { processExternalSRT?: (f: File) => void })?.processExternalSRT?.(srtFile);
          }
        }, 1500);
      }

      // 10. Apply Plan file
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

      // 11. Cleanup sessionStorage
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
      loader.style.opacity = '0';
      setTimeout(() => setLoading(false), 450);
    } else {
      setLoading(false);
    }
  }

  return { loading, loadingStatus };
}
