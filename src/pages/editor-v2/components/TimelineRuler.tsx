import React, { useRef, useEffect, useState } from 'react';
import { useEditorStore } from '../../../store/useEditorStore';

type RulerMode = 'timecode' | 'frames' | 'seconds';

export default function TimelineRuler() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pixelsPerSecond = useEditorStore(s => s.pixelsPerSecond);
  const duration       = useEditorStore(s => s.duration);
  const headerWidth    = useEditorStore(s => s.headerWidth);
  const [mode, setMode] = useState<RulerMode>('timecode');
  const [showModes, setShowModes] = useState(false);

  const HEIGHT = 30;
  const FPS = (window as any).app?.FPS || 30;

  const formatLabel = (t: number): string => {
    if (mode === 'frames') return `${Math.round(t * FPS)}f`;
    if (mode === 'seconds') return `${t.toFixed(1)}s`;
    // Timecode: HH;MM;SS;FF
    const h = Math.floor(t / 3600);
    const m = Math.floor((t % 3600) / 60);
    const s = Math.floor(t % 60);
    const f = Math.round((t % 1) * FPS);
    if (h > 0) return `${h}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
    if (m > 0) return `${m}:${String(s).padStart(2,'0')}`;
    return `${s}:${String(f).padStart(2,'0')}`;
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const W = canvas.offsetWidth;
    canvas.width = W;
    canvas.height = HEIGHT;

    ctx.clearRect(0, 0, W, HEIGHT);

    // Background gradient
    const grad = ctx.createLinearGradient(0, 0, 0, HEIGHT);
    grad.addColorStop(0, '#0f1628');
    grad.addColorStop(1, '#0a0f1d');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, HEIGHT);

    // Scroll offset from parent
    const scrollArea = document.getElementById('timeline-scroll-area');
    const scrollLeft = scrollArea?.scrollLeft || 0;

    // Determine tick spacing
    const minPxBetweenTicks = 60;
    const rawInterval = minPxBetweenTicks / pixelsPerSecond;
    const niceIntervals = [0.05, 0.1, 0.2, 0.25, 0.5, 1, 2, 5, 10, 15, 30, 60];
    let interval = niceIntervals.find(i => i * pixelsPerSecond >= minPxBetweenTicks) || 60;

    const startTime = Math.max(0, (scrollLeft) / pixelsPerSecond);
    const endTime   = Math.min(duration + 5, (scrollLeft + W) / pixelsPerSecond);

    const firstTick = Math.floor(startTime / interval) * interval;

    ctx.strokeStyle = 'rgba(255,255,255,0.15)';
    ctx.fillStyle   = 'rgba(255,255,255,0.55)';
    ctx.font        = '9px Inter, sans-serif';
    ctx.textBaseline = 'bottom';

    for (let t = firstTick; t <= endTime + interval; t += interval) {
      const x = t * pixelsPerSecond - scrollLeft;
      if (x < 0 || x > W) continue;

      // Sub-ticks
      const subCount = 4;
      for (let s = 1; s < subCount; s++) {
        const sx = x + (s / subCount) * interval * pixelsPerSecond;
        if (sx > W) break;
        ctx.beginPath();
        ctx.moveTo(sx, HEIGHT - 5);
        ctx.lineTo(sx, HEIGHT);
        ctx.globalAlpha = 0.25;
        ctx.stroke();
        ctx.globalAlpha = 1;
      }

      // Main tick
      ctx.beginPath();
      ctx.moveTo(x, HEIGHT - 12);
      ctx.lineTo(x, HEIGHT);
      ctx.strokeStyle = 'rgba(255,255,255,0.35)';
      ctx.stroke();

      // Label
      const label = formatLabel(t);
      ctx.fillStyle = t === 0 ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.45)';
      ctx.fillText(label, x + 3, HEIGHT - 2);
    }

    // In/Out markers (from app.inPoint / app.outPoint)
    const app = (window as any).app;
    if (app?.inPoint !== undefined && app.inPoint >= 0) {
      const ix = app.inPoint * pixelsPerSecond - scrollLeft;
      ctx.fillStyle = '#22c55e';
      ctx.beginPath();
      ctx.moveTo(ix, 0);
      ctx.lineTo(ix + 8, 0);
      ctx.lineTo(ix, 12);
      ctx.closePath();
      ctx.fill();
    }
    if (app?.outPoint !== undefined && app.outPoint >= 0) {
      const ox = app.outPoint * pixelsPerSecond - scrollLeft;
      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.moveTo(ox, 0);
      ctx.lineTo(ox - 8, 0);
      ctx.lineTo(ox, 12);
      ctx.closePath();
      ctx.fill();
    }

    // Duration end line
    const endX = duration * pixelsPerSecond - scrollLeft;
    if (endX >= 0 && endX <= W) {
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([3, 2]);
      ctx.beginPath();
      ctx.moveTo(endX, 0);
      ctx.lineTo(endX, HEIGHT);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.lineWidth = 1;
    }
  });

  return (
    <div className="relative flex-grow flex items-stretch overflow-hidden cursor-pointer select-none" id="timeline-ruler-container">
      <canvas
        ref={canvasRef}
        className="w-full h-full"
        height={HEIGHT}
        style={{ height: `${HEIGHT}px` }}
        onDoubleClick={(e) => {
          const app = (window as any).app;
          if (!app) return;
          const rect = e.currentTarget.getBoundingClientRect();
          const scrollArea = document.getElementById('timeline-scroll-area');
          const scrollLeft = scrollArea?.scrollLeft || 0;
          const t = Math.max(0, (e.clientX - rect.left + scrollLeft) / pixelsPerSecond);
          if (!app.markers) app.markers = [];
          app.markers.push({ id: 'mk_' + Date.now(), time: t, label: 'Marker', color: '#f59e0b', type: 'Chapter' });
          app.commitStateToReact?.();
        }}
        onMouseDown={(e) => {
          // Single click → move playhead
          if (e.button !== 0 || e.detail === 2) return;
          const app = (window as any).app;
          if (!app) return;
          const rect = e.currentTarget.getBoundingClientRect();
          const scrollArea = document.getElementById('timeline-scroll-area');
          const scrollLeft = scrollArea?.scrollLeft || 0;
          const t = Math.max(0, (e.clientX - rect.left + scrollLeft) / pixelsPerSecond);
          app.seekToAbsolute?.(t, { resume: false });
        }}
      />
      {/* Mode picker button */}
      <button
        className="absolute top-0.5 right-0.5 text-[8px] text-gray-600 hover:text-gray-300 px-1 py-0.5 rounded bg-black/40 transition-colors z-10"
        onClick={e => { e.stopPropagation(); setShowModes(v => !v); }}
        title="Change ruler mode"
      >
        {mode === 'timecode' ? 'TC' : mode === 'frames' ? 'FR' : 'S'}
      </button>
      {showModes && (
        <div className="absolute top-6 right-0 bg-[#1a2540] border border-white/10 rounded shadow-xl z-[9999] py-1 min-w-[90px]">
          {(['timecode', 'seconds', 'frames'] as RulerMode[]).map(m => (
            <button key={m} className={`w-full text-left px-3 py-1 text-[10px] hover:bg-white/10 ${mode === m ? 'text-indigo-400' : 'text-gray-300'}`}
              onClick={() => { setMode(m); setShowModes(false); }}>
              {m.charAt(0).toUpperCase() + m.slice(1)}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
