import React, { useRef, useEffect, useState } from 'react';
import { useEditorStore } from '../../../store/useEditorStore';

export default function TimelineMiniMap() {
  const tracks       = useEditorStore(s => s.tracks);
  const duration     = useEditorStore(s => s.duration);
  const pixelsPerSecond = useEditorStore(s => s.pixelsPerSecond);
  const headerWidth  = useEditorStore(s => s.headerWidth);
  const canvasRef    = useRef<HTMLCanvasElement>(null);
  const [dragging, setDragging] = useState(false);

  const HEIGHT = 36;

  /* ── draw mini-map ── */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || duration <= 0) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const W = canvas.width;
    const H = canvas.height;
    ctx.clearRect(0, 0, W, H);

    /* background */
    ctx.fillStyle = '#0a0f1d';
    ctx.fillRect(0, 0, W, H);

    const totalTracks = tracks.length || 1;
    const trackH = Math.max(2, H / totalTracks);

    const TYPE_COLORS: Record<string, string> = {
      video: '#6366f1', audio: '#3b82f6', image: '#10b981',
      text: '#f59e0b', subtitle: '#a855f7', main: '#6366f1', overlay: '#8b5cf6',
    };

    tracks.forEach((track, ti) => {
      const y = ti * trackH;
      track.clips.forEach((clip: any) => {
        const x = (clip.start / duration) * W;
        const w = Math.max(1, (clip.duration / duration) * W);
        ctx.fillStyle = (track as any).color || TYPE_COLORS[track.type] || '#4b5563';
        ctx.globalAlpha = 0.7;
        ctx.fillRect(x, y + 1, w, trackH - 2);
        ctx.globalAlpha = 1;
      });
    });

    /* playhead */
    const app = (window as any).app;
    if (app) {
      const px = ((app.currentTime || 0) / duration) * W;
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(px, 0);
      ctx.lineTo(px, H);
      ctx.stroke();
    }

    /* viewport rect */
    const scrollArea = document.getElementById('timeline-scroll-area');
    if (scrollArea) {
      const contentW = duration * pixelsPerSecond + 300;
      const vpStart = Math.max(0, scrollArea.scrollLeft - headerWidth) / contentW;
      const vpWidth = scrollArea.clientWidth / contentW;
      ctx.strokeStyle = 'rgba(255,255,255,0.35)';
      ctx.lineWidth = 1;
      ctx.strokeRect(vpStart * W, 0, vpWidth * W, H);
      ctx.fillStyle = 'rgba(255,255,255,0.05)';
      ctx.fillRect(vpStart * W, 0, vpWidth * W, H);
    }
  });

  /* ── scroll by clicking/dragging on mini-map ── */
  const seekFromEvent = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const ratio = (e.clientX - rect.left) / canvas.width;
    const scrollArea = document.getElementById('timeline-scroll-area');
    if (scrollArea) {
      const contentW = duration * pixelsPerSecond + 300;
      scrollArea.scrollLeft = ratio * contentW - scrollArea.clientWidth / 2 + headerWidth;
    }
  };

  return (
    <div className="border-t border-white/10 bg-[#0a0f1d] flex-shrink-0 relative" title="Timeline overview — double-click ruler to add marker">
      {/* Label */}
      <div className="absolute left-0 top-0 bottom-0 flex items-center justify-center text-[9px] text-gray-600 font-bold z-10 select-none px-1" style={{ width: `${useEditorStore.getState().headerWidth}px` }}>
        OVERVIEW
      </div>
      <canvas
        ref={canvasRef}
        height={HEIGHT}
        width={800}
        className="w-full cursor-crosshair"
        style={{ height: `${HEIGHT}px`, marginLeft: `${useEditorStore.getState().headerWidth}px`, width: `calc(100% - ${useEditorStore.getState().headerWidth}px)` }}
        onMouseDown={(e) => { setDragging(true); seekFromEvent(e); }}
        onMouseMove={(e) => { if (dragging) seekFromEvent(e); }}
        onMouseUp={() => setDragging(false)}
        onMouseLeave={() => setDragging(false)}
      />
    </div>
  );
}
