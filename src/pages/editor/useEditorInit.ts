import { useState, useRef, useEffect } from 'react';
import type { NavigateFunction } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../../firebase';
import { getFile } from '../../hooks/useFileStore';

interface Props {
  navigate: NavigateFunction;
  loadingRef: React.RefObject<HTMLDivElement | null>;
}

export function useEditorInit({ navigate, loadingRef }: Props) {
  const [loading, setLoading]           = useState(true);
  const [loadingStatus, setLoadingStatus] = useState('جارٍ التحقق من الجلسة...');
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    // Auth check
    const cached = localStorage.getItem('p43_user');
    const unsub = onAuthStateChanged(auth, user => {
      if (!user && !cached) navigate('/login', { replace: true });
    });

    // Delay init to let external scripts load
    setTimeout(() => initEditor(), 300);

    return () => unsub();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function initEditor() {
    const raw = sessionStorage.getItem('p43_settings');
    if (!raw) { navigate('/startup', { replace: true }); return; }
    const settings = JSON.parse(raw);
    setLoadingStatus(`جارٍ تحميل "${settings.videoName || 'الفيديو'}"...`);

    // Wait for EditorApp to be available (loaded from external script)
    let attempts = 0;
    while (!(window as unknown as Record<string, unknown>)['EditorApp'] && attempts < 30) {
      await sleep(200); attempts++;
    }

    const win = window as unknown as Record<string, unknown>;
    if (win['EditorApp']) {
      try { win['app'] = new (win['EditorApp'] as new () => unknown)(); }
      catch (e) { console.error('EditorApp init error:', e); }
    }

    // Load video from IndexedDB
    let videoFile: File | undefined;
    try { videoFile = await getFile('p43_video'); } catch { /* noop */ }
    if (!videoFile) { navigate('/startup', { replace: true }); return; }

    // Apply API key
    if (settings.apiKey) {
      sessionStorage.setItem('p43_gemini_key', settings.apiKey);
      (win as Record<string, unknown>)['_geminiAPIKey'] = settings.apiKey;
    }

    // Configure Gemini
    const applyGemini = () => {
      const gc = win['geminiChat'] as { enabled?: boolean; init?: () => void };
      if (gc) { gc.enabled = settings.aiEnabled !== false; if (gc.enabled) gc.init?.(); }
    };
    applyGemini(); setTimeout(applyGemini, 800);

    // Init project
    setLoadingStatus('جارٍ بناء التايم لاين...');
    const app = win['app'] as { initProject?: (f: File, mode: string, at: boolean) => void };
    app?.initProject?.(videoFile, settings.mode, settings.autoTranscribe);

    // Fade out loader
    const loader = loadingRef.current;
    if (loader) {
      loader.style.transition = 'opacity 0.4s';
      loader.style.opacity = '0';
      setTimeout(() => setLoading(false), 450);
    } else setLoading(false);

    // Apply SRT/Plan files
    if (settings.hasSRT) {
      setTimeout(async () => {
        const srtFile = await getFile('p43_srt').catch(() => undefined);
        if (srtFile) (win['aiManager'] as { processExternalSRT?: (f: File) => void })?.processExternalSRT?.(srtFile);
      }, 1500);
    }
    if (settings.hasPlan) {
      setTimeout(async () => {
        const planFile = await getFile('p43_plan').catch(() => undefined);
        if (planFile) {
          const gc = win['geminiChat'] as { enabled?: boolean; init?: () => void };
          if (!gc?.enabled) { if (gc) { gc.enabled = true; gc.init?.(); } }
          (win['geminiPlan'] as { handlePlanUpload?: (x: { files: File[]; value: string }) => void })
            ?.handlePlanUpload?.({ files: [planFile], value: '' });
        }
      }, 2000);
    }

    // Cleanup
    setTimeout(async () => {
      try { await getFile('p43_video'); } catch { /* noop */ }
      sessionStorage.removeItem('p43_settings');
    }, 5000);
  }

  return { loading, loadingStatus };
}

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));
