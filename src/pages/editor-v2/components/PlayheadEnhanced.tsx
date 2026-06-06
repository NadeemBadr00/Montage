import React, { useEffect, useRef, useState } from 'react';
import { useEditorStore } from '../../../store/useEditorStore';

/**
 * Phase 18: Playhead with real-time time tooltip + double-click to set In/Out
 */
export default function PlayheadEnhanced() {
  const currentTime    = useEditorStore(s => s.currentTime);
  const pixelsPerSecond = useEditorStore(s => s.pixelsPerSecond);
  const headerWidth    = useEditorStore(s => s.headerWidth);
  const [dragging, setDragging] = useState(false);
  const [hovered, setHovered]   = useState(false);
  const lineRef = useRef<HTMLDivElement>(null);

  const FPS = (window as any).app?.FPS || 30;
  const formatTime = (t: number) => {
    const m = Math.floor(t / 60);
    const s = Math.floor(t % 60);
    const f = Math.round((t % 1) * FPS);
    return `${m}:${String(s).padStart(2,'0')}:${String(f).padStart(2,'0')}`;
  };

  const left = currentTime * pixelsPerSecond + headerWidth;

  useEffect(() => {
    const el = document.getElementById('playhead-line');
    if (!el) return;
    let wp = false;
    const app = (window as any).app;

    const onDown = (e: MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragging(true);
      wp = app?.isPlaying;
      if (wp) app?.pausePlayback?.();
      document.body.style.cursor = 'grabbing';

      const area = document.getElementById('timeline-scroll-area');
      const hw = useEditorStore.getState().headerWidth;
      const pps = useEditorStore.getState().pixelsPerSecond;

      let raf: number | null = null;
      const onMove = (ev: MouseEvent) => {
        if (raf) return;
        raf = requestAnimationFrame(() => {
          raf = null;
          const rect = area?.getBoundingClientRect();
          if (!rect || !area) return;
          const x = ev.clientX - rect.left + area.scrollLeft - hw;
          const t = Math.max(0, Math.min(x / pps, useEditorStore.getState().duration));
          if (app) {
            app.currentTime = t;
            app.updatePlayheadPosition?.();
            app.managePlayers?.();
            app.renderFrameToCanvas?.();
            app.requestRedraw?.();
          }
        });
      };

      const onUp = () => {
        setDragging(false);
        document.body.style.cursor = 'default';
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
        if (raf) cancelAnimationFrame(raf);
        app?.seekToAbsolute?.(app?.currentTime, { resume: wp });
      };

      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
    };

    el.addEventListener('mousedown', onDown);
    return () => el.removeEventListener('mousedown', onDown);
  }, []);

  return (
    <div
      id="playhead-line"
      className="absolute top-0 bottom-0 z-[80] flex flex-col items-center cursor-grab"
      style={{ left: `${left}px`, pointerEvents: 'auto', width: '2px' }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Head triangle */}
      <div className="w-0 h-0 flex-shrink-0" style={{
        borderLeft: '6px solid transparent',
        borderRight: '6px solid transparent',
        borderTop: '10px solid #ef4444',
        marginLeft: '-5px',
        cursor: 'grab',
        filter: 'drop-shadow(0 0 4px rgba(239,68,68,0.8))',
      }} />

      {/* Time tooltip */}
      {(hovered || dragging) && (
        <div
          className="absolute top-[-24px] left-1/2 -translate-x-1/2 bg-[#ef4444] text-white text-[9px] font-mono px-1.5 py-0.5 rounded shadow-lg whitespace-nowrap pointer-events-none z-[999]"
          style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.5))' }}
        >
          {formatTime(currentTime)}
        </div>
      )}

      {/* The line */}
      <div
        className="flex-1 w-[1.5px] bg-gradient-to-b from-red-500 to-red-500/30"
        style={{ boxShadow: '0 0 6px rgba(239,68,68,0.5)' }}
      />
    </div>
  );
}
