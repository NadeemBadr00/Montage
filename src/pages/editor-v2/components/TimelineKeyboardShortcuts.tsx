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
          app?.togglePlay?.();
          break;
        case 'k':
          app?.togglePlay?.();
          break;
        case 'j':
          app?.seek?.(-5);
          break;
        case 'l':
          app?.seek?.(5);
          break;
        case 'ArrowLeft':
          app?.seek?.(ctrl ? -10 : -1);
          break;
        case 'ArrowRight':
          app?.seek?.(ctrl ? 10 : 1);
          break;
        case 'Home':
          app?.seek?.(-(app?.currentTime || 0));
          break;
        case 'End':
          app?.seek?.((app?.duration || 0) - (app?.currentTime || 0));
          break;

        /* Edit */
        case 'z':
          if (ctrl) { e.preventDefault(); app?.undo?.(); }
          break;
        case 'y':
          if (ctrl) { e.preventDefault(); app?.redo?.(); }
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

        /* Markers */
        case 'i':
          if (app) {
            if (!app.markers) app.markers = [];
            app.markers.push({ id: 'mk_' + Date.now(), time: app.currentTime || 0, label: 'In', color: '#22c55e', type: 'Cue' });
            app.commitStateToReact?.();
          }
          break;
        case 'o':
          if (app) {
            if (!app.markers) app.markers = [];
            app.markers.push({ id: 'mk_' + Date.now(), time: app.currentTime || 0, label: 'Out', color: '#ef4444', type: 'Cue' });
            app.commitStateToReact?.();
          }
          break;

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
  }, [isMagneticMode, setMagneticMode, setZoomPercentage]);

  return null; // purely behavioral
}
