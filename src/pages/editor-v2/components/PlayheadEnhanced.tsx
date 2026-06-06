import React, { useEffect, useState } from 'react';
import { useEditorStore } from '../../../store/useEditorStore';

/**
 * Phase 18: Enhanced Playhead with time tooltip + smooth drag
 * 
 * ARCHITECTURE NOTE:
 * - id="playhead" → hidden element for legacy engine DOM ref (this.playhead)
 * - id="playhead-line" → visible React-driven playhead (driven by Zustand currentTime)
 * The engine calls updatePlayheadPosition() which: 
 *   1. Sets this.playhead.style.left (hidden div, keeps engine compat)
 *   2. Calls useEditorStore.setState({ currentTime }) → React re-renders this component
 */
export default function PlayheadEnhanced() {
  const currentTime     = useEditorStore(s => s.currentTime);
  const pixelsPerSecond = useEditorStore(s => s.pixelsPerSecond);
  const headerWidth     = useEditorStore(s => s.headerWidth);
  const [dragging, setDragging] = useState(false);
  const [hovered, setHovered]   = useState(false);

  const FPS = (window as any).app?.FPS || 30;
  const formatTime = (t: number) => {
    const m = Math.floor(t / 60);
    const s = Math.floor(t % 60);
    const f = Math.round((t % 1) * FPS);
    return `${m}:${String(s).padStart(2,'0')}:${String(f).padStart(2,'0')}`;
  };

  // Position = time × pps + header (same formula as engine)
  const left = currentTime * pixelsPerSecond + headerWidth;

  // Wire drag behavior on the React playhead
  useEffect(() => {
    const el = document.getElementById('playhead-line');
    if (!el) return;
    const app = (window as any).app;

    const onDown = (e: MouseEvent) => {
      // Ignore right-click
      if (e.button !== 0) return;
      e.preventDefault();
      e.stopPropagation();
      setDragging(true);
      const wasPlaying = app?.isPlaying;
      if (wasPlaying) app?.pausePlayback?.();
      document.body.style.cursor = 'grabbing';

      const area = document.getElementById('timeline-scroll-area');
      const hw = useEditorStore.getState().headerWidth;
      const pps = useEditorStore.getState().pixelsPerSecond;

      let rafId: number | null = null;
      const onMove = (ev: MouseEvent) => {
        if (rafId !== null) return;
        rafId = requestAnimationFrame(() => {
          rafId = null;
          const rect = area?.getBoundingClientRect();
          if (!rect || !area) return;
          const x = ev.clientX - rect.left + area.scrollLeft - hw;
          const t = Math.max(0, Math.min(x / pps, useEditorStore.getState().duration));
          if (app) {
            app.currentTime = t;
            // Sync both DOM playhead (for engine compat) and React state
            const hiddenPH = document.getElementById('playhead');
            if (hiddenPH) hiddenPH.style.left = `${t * pps + hw}px`;
            useEditorStore.setState({ currentTime: t });
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
        if (rafId !== null) cancelAnimationFrame(rafId);
        // Final seek to snap + resume
        app?.seekToAbsolute?.(app?.currentTime, { resume: wasPlaying });
      };

      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
    };

    el.addEventListener('mousedown', onDown);
    return () => el.removeEventListener('mousedown', onDown);
  }, []);

  return (
    <>
      {/* Hidden div for engine compat (this.playhead = getElementById('playhead')) */}
      <div
        id="playhead"
        className="playhead-marker h-full absolute cursor-ew-resize"
        style={{ left: `${left}px`, zIndex: -1, pointerEvents: 'none', width: 0, height: 0 }}
      />

      {/* Visible React Playhead */}
      <div
        id="playhead-line"
        className="absolute top-0 bottom-0 z-[80] flex flex-col items-center cursor-grab"
        style={{ left: `${left}px`, width: '2px', pointerEvents: 'auto' }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        {/* Triangle head */}
        <div
          style={{
            width: 0, height: 0, flexShrink: 0,
            borderLeft: '6px solid transparent',
            borderRight: '6px solid transparent',
            borderTop: '10px solid #ef4444',
            marginLeft: '-5px',
            cursor: 'grab',
            filter: 'drop-shadow(0 0 5px rgba(239,68,68,0.9))',
          }}
        />

        {/* Time tooltip on hover or drag */}
        {(hovered || dragging) && (
          <div
            className="absolute top-[-26px] left-1/2 -translate-x-1/2 bg-[#ef4444] text-white text-[9px] font-mono px-1.5 py-0.5 rounded-sm shadow-lg whitespace-nowrap pointer-events-none z-[9999]"
          >
            {formatTime(currentTime)}
          </div>
        )}

        {/* Glow line */}
        <div
          className="flex-1 bg-red-500"
          style={{
            width: '1.5px',
            boxShadow: '0 0 8px 1px rgba(239,68,68,0.7), 0 0 2px rgba(239,68,68,1)',
          }}
        />
      </div>
    </>
  );
}
