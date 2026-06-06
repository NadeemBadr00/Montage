import React, { useRef, useEffect, useState, useCallback } from 'react';
import { useEditorStore } from '../../../store/useEditorStore';

type RulerMode = 'timecode' | 'frames' | 'seconds';

export default function TimelineRuler() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pixelsPerSecond = useEditorStore(s => s.pixelsPerSecond);
  const duration       = useEditorStore(s => s.duration);
  const [mode, setMode] = useState<RulerMode>('timecode');
  const [showModes, setShowModes] = useState(false);
  const [scrollLeft, setScrollLeft] = useState(0);

  const HEIGHT = 30;
  const FPS = (window as any).app?.FPS || 30;

  // Phase 17 FIX: Listen to scroll to redraw ruler
  useEffect(() => {
    const el = document.getElementById('timeline-scroll-area');
    if (!el) return;
    const onScroll = () => setScrollLeft(el.scrollLeft);
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, []);

  const formatLabel = (t: number): string => {
    if (mode === 'frames') return `${Math.round(t * FPS)}f`;
    if (mode === 'seconds') return `${t.toFixed(1)}s`;
    const h = Math.floor(t / 3600);
    const m = Math.floor((t % 3600) / 60);
    const s = Math.floor(t % 60);
    const f = Math.round((t % 1) * FPS);
    if (h > 0) return `${h}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
    if (m > 0) return `${m}:${String(s).padStart(2,'0')}`;
    return `${s}:${String(f).padStart(2,'0')}`;
  };

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const W = canvas.offsetWidth || canvas.parentElement?.clientWidth || 800;
    if (W === 0) return;
    canvas.width = W;
    canvas.height = HEIGHT;

    ctx.clearRect(0, 0, W, HEIGHT);

    // Background
    const grad = ctx.createLinearGradient(0, 0, 0, HEIGHT);
    grad.addColorStop(0, '#0f1628');
    grad.addColorStop(1, '#0a0f1d');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, HEIGHT);

    // Tick spacing
    const minPxBetweenTicks = 60;
    const niceIntervals = [0.05, 0.1, 0.2, 0.25, 0.5, 1, 2, 5, 10, 15, 30, 60];
    const interval = niceIntervals.find(i => i * pixelsPerSecond >= minPxBetweenTicks) || 60;

    const startTime = Math.max(0, scrollLeft / pixelsPerSecond);
    const endTime   = Math.min(duration + 5, (scrollLeft + W) / pixelsPerSecond);
    const firstTick = Math.floor(startTime / interval) * interval;

    ctx.font = '9px Inter, monospace';
    ctx.textBaseline = 'bottom';

    for (let t = firstTick; t <= endTime + interval; t += interval) {
      const x = t * pixelsPerSecond - scrollLeft;
      if (x < -2 || x > W + 2) continue;

      // Sub-ticks (4 per interval)
      for (let s = 1; s < 4; s++) {
        const sx = x + (s / 4) * interval * pixelsPerSecond;
        if (sx > W) break;
        ctx.beginPath();
        ctx.moveTo(sx, HEIGHT - 4);
        ctx.lineTo(sx, HEIGHT);
        ctx.globalAlpha = 0.2;
        ctx.strokeStyle = 'rgba(255,255,255,0.4)';
        ctx.lineWidth = 0.5;
        ctx.stroke();
        ctx.globalAlpha = 1;
      }

      // Main tick
      ctx.beginPath();
      ctx.moveTo(x, HEIGHT - 13);
      ctx.lineTo(x, HEIGHT);
      ctx.strokeStyle = 'rgba(255,255,255,0.35)';
      ctx.lineWidth = 1;
      ctx.stroke();

      // Label
      const label = formatLabel(t);
      ctx.fillStyle = t === 0 ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.5)';
      ctx.fillText(label, x + 3, HEIGHT - 2);
    }

    // In/Out markers
    const app = (window as any).app;
    if (app?.inPoint >= 0) {
      const ix = app.inPoint * pixelsPerSecond - scrollLeft;
      ctx.fillStyle = '#22c55e';
      ctx.beginPath();
      ctx.moveTo(ix, 0); ctx.lineTo(ix + 9, 0); ctx.lineTo(ix, 14);
      ctx.closePath(); ctx.fill();
    }
    if (app?.outPoint >= 0) {
      const ox = app.outPoint * pixelsPerSecond - scrollLeft;
      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.moveTo(ox, 0); ctx.lineTo(ox - 9, 0); ctx.lineTo(ox, 14);
      ctx.closePath(); ctx.fill();
    }

    // Duration end marker
    const endX = duration * pixelsPerSecond - scrollLeft;
    if (endX >= 0 && endX <= W) {
      ctx.strokeStyle = 'rgba(239,68,68,0.6)';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([3, 2]);
      ctx.beginPath();
      ctx.moveTo(endX, 0); ctx.lineTo(endX, HEIGHT);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.lineWidth = 1;
    }

    // Playhead tick on ruler (red vertical line)
    const ct = (window as any).app?.currentTime || 0;
    const px2 = ct * pixelsPerSecond - scrollLeft;
    if (px2 >= 0 && px2 <= W) {
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(px2, 0); ctx.lineTo(px2, HEIGHT);
      ctx.stroke();
      ctx.lineWidth = 1;
    }
  }, [pixelsPerSecond, duration, mode, scrollLeft]);

  // Redraw on any dependency change
  useEffect(() => { draw(); }, [draw]);

  // Also redraw on currentTime change (engine ticker) — plain subscribe
  useEffect(() => {
    let prev = useEditorStore.getState().currentTime;
    const unsub = useEditorStore.subscribe((state) => {
      if (state.currentTime !== prev) {
        prev = state.currentTime;
        draw();
      }
    });
    return unsub;
  }, [draw]);

  return (
    <div
      id="timeline-ruler-container"
      className="relative flex-grow flex items-stretch overflow-hidden cursor-pointer select-none"
    >
      <canvas
        ref={canvasRef}
        className="w-full h-full"
        style={{ height: `${HEIGHT}px`, display: 'block' }}
        onDoubleClick={(e) => {
          const app = (window as any).app;
          if (!app) return;
          const rect = e.currentTarget.getBoundingClientRect();
          const t = Math.max(0, (e.clientX - rect.left + scrollLeft) / pixelsPerSecond);
          if (!app.markers) app.markers = [];
          app.markers.push({ id: 'mk_' + Date.now(), time: t, label: 'Marker', color: '#f59e0b', type: 'Chapter' });
          app.commitStateToReact?.();
        }}
        onMouseDown={(e) => {
          if (e.button !== 0 || e.detail === 2) return;
          const app = (window as any).app;
          if (!app) return;
          const rect = e.currentTarget.getBoundingClientRect();
          const t = Math.max(0, (e.clientX - rect.left + scrollLeft) / pixelsPerSecond);
          app.seekToAbsolute?.(t, { resume: false });
        }}
      />
      {/* Ruler mode picker */}
      <button
        className="absolute top-0.5 right-0.5 text-[8px] text-gray-500 hover:text-gray-200 px-1 py-0.5 rounded bg-black/50 transition-colors z-10 font-mono"
        onClick={e => { e.stopPropagation(); setShowModes(v => !v); }}
        title="Change ruler mode"
      >
        {mode === 'timecode' ? 'TC' : mode === 'frames' ? 'FR' : 'S'}
      </button>
      {showModes && (
        <div className="absolute top-6 right-0 bg-[#1a2540] border border-white/10 rounded shadow-xl z-[9999] py-1 min-w-[90px]">
          {(['timecode', 'seconds', 'frames'] as RulerMode[]).map(m => (
            <button
              key={m}
              className={`w-full text-left px-3 py-1 text-[10px] hover:bg-white/10 transition-colors ${mode === m ? 'text-indigo-400 font-bold' : 'text-gray-300'}`}
              onClick={() => { setMode(m); setShowModes(false); }}
            >
              {m === 'timecode' ? 'Timecode (MM:SS)' : m === 'frames' ? 'Frames' : 'Seconds'}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
