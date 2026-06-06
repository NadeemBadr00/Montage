import React, { useEffect } from 'react';
import { useEditorStore } from '../../../store/useEditorStore';

/**
 * Global keyboard shortcuts for the timeline editor.
 * Mounted once at the app level (inside EditorV2).
 */
export default function TimelineKeyboardShortcuts() {
  const setZoomPercentage = useEditorStore(s => s.setZoomPercentage);
  const setMagneticMode   = useEditorStore(s => s.setMagneticMode);
  const isMagneticMode    = useEditorStore(s => s.isMagneticMode);
  const setTool           = useEditorStore(s => s.setTool);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const app = (window as any).app;
      const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
      const isInput = tag === 'input' || tag === 'textarea' || (e.target as HTMLElement)?.isContentEditable;
      if (isInput) return;

      const ctrl = e.ctrlKey || e.metaKey;

      switch (e.key) {
        /* Playback */
        case ' ':
          e.preventDefault();
          e.stopPropagation();
          if (!app) break;
          // Safe toggle — handle suspended AudioContext gracefully
          try {
            if (app.audioCtx?.state === 'suspended') app.audioCtx.resume();
            app.togglePlay();
          } catch {
            // Fallback if engine not fully ready
            const nowPlaying = (window as any).useEditorStore?.getState()?.isPlaying;
            if (nowPlaying) {
              app.isPlaying = false; app.playbackRate = 0;
              (window as any).useEditorStore?.setState({ isPlaying: false });
            } else {
              app.isPlaying = true; app.playbackRate = 1;
              (window as any).useEditorStore?.setState({ isPlaying: true });
            }
          }
          break;

        case 'k':
          e.preventDefault();
          if (app) {
            try { app.togglePlay?.(); } catch {}
          }
          break;

        /* JKL scrub */
        case 'j': {
          e.preventDefault();
          if (!app) break;
          const t = Math.max(0, (app.currentTime || 0) - 5);
          app.seekToAbsolute?.(t, { resume: false });
          break;
        }
        case 'l': {
          e.preventDefault();
          if (!app) break;
          const t2 = Math.min(app.duration || 300, (app.currentTime || 0) + 5);
          app.seekToAbsolute?.(t2, { resume: false });
          break;
        }

        case 'ArrowLeft': {
          e.preventDefault();
          if (!app) break;
          const step = ctrl ? 10 : 1;
          app.seekToAbsolute?.(Math.max(0, (app.currentTime || 0) - step), { resume: app.isPlaying });
          break;
        }
        case 'ArrowRight': {
          e.preventDefault();
          if (!app) break;
          const step2 = ctrl ? 10 : 1;
          app.seekToAbsolute?.(Math.min(app.duration || 300, (app.currentTime || 0) + step2), { resume: app.isPlaying });
          break;
        }
        case 'Home':
          e.preventDefault();
          app?.seekToAbsolute?.(0, { resume: false });
          break;
        case 'End':
          e.preventDefault();
          app?.seekToAbsolute?.(app?.duration || 0, { resume: false });
          break;

        /* Edit */
        case 'z':
          if (ctrl) { e.preventDefault(); app?.undo?.(); }
          break;
        case 'y':
          if (ctrl) { e.preventDefault(); app?.redo?.(); }
          else { e.preventDefault(); setTool('slip'); }
          break;
        case 'u':
          if (!ctrl && !isInput) { e.preventDefault(); setTool('slide'); }
          break;
        case 'n':
          if (!ctrl && !isInput) { e.preventDefault(); setTool('rolling'); }
          break;
        case 'f':
          if (ctrl) { e.preventDefault(); window.dispatchEvent(new CustomEvent('timeline-search-toggle')); }
          break;
        case 'c':
          if (ctrl) { e.preventDefault(); app?.copySelectedClip?.(); }
          else app?.setTool?.('cut');
          break;
        case 'v':
          if (ctrl) { e.preventDefault(); app?.pasteCopiedClip?.(); }
          else app?.setTool?.('select');
          break;
        case 'd':
          if (ctrl) { e.preventDefault(); app?.duplicateSelectedClip?.(); }
          break;
        case 'a':
          if (ctrl) { e.preventDefault(); app?.selectAllClips?.(); }
          break;
        case 'Delete':
        case 'Backspace':
          app?.deleteSelectedClip?.();
          break;

        /* Tools */
        case 'V':
        case 'v':
          if (!ctrl) app?.setTool?.('select');
          break;
        case 'C':
          app?.setTool?.('cut');
          break;
        case 'm':
        case 'M':
          setMagneticMode(!isMagneticMode);
          break;

        /* i/o keys are handled by Timeline.tsx for Loop Region (Phase 26) */
        /* They set In/Out points — no duplicate marker push here */

        /* Zoom */
        case '=':
        case '+':
          if (ctrl) {
            e.preventDefault();
            const cur = useEditorStore.getState().zoomLevel;
            setZoomPercentage(Math.min(500, cur + 25));
          }
          break;
        case '-':
          if (ctrl) {
            e.preventDefault();
            const cur = useEditorStore.getState().zoomLevel;
            setZoomPercentage(Math.max(10, cur - 25));
          }
          break;
        case '0':
          if (ctrl) {
            e.preventDefault();
            const dur = app?.duration || 30;
            const area = document.getElementById('timeline-scroll-area');
            if (area) {
              const w = area.clientWidth - (useEditorStore.getState().headerWidth || 160);
              setZoomPercentage(Math.max(10, Math.floor(w / dur)));
            }
          }
          break;
      }
    };

    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isMagneticMode, setMagneticMode, setZoomPercentage, setTool]);

  return null; // purely behavioral
}
