import React, { useState, useRef } from 'react';
import { useEditorStore } from '../../../store/useEditorStore';

/* ── Phase 12: Speed Ramp Badge on ClipItem overlay ──────────────── */
export function ClipSpeedBadge({ clip, width }: { clip: any; width: number }) {
  const speed = clip.properties?.playbackSpeed;
  if (!speed || speed === 1 || width < 48) return null;
  return (
    <div
      className="absolute bottom-1 right-6 z-20 pointer-events-none"
    >
      <span className={`text-[8px] font-bold px-1 rounded-sm ${speed > 1 ? 'bg-orange-500/80 text-white' : 'bg-blue-500/80 text-white'}`}>
        {speed > 1 ? `${speed}×` : `${Math.round(100 / speed)}%`}
      </span>
    </div>
  );
}

/* ── Phase 12: Clip Fade Indicator bars ────────────────────────────── */
export function ClipFadeOverlay({ clip, width }: { clip: any; width: number }) {
  const pps = useEditorStore(s => s.pixelsPerSecond);
  const fadeIn = clip.properties?.fadeIn || 0;
  const fadeOut = clip.properties?.fadeOut || 0;
  if (fadeIn === 0 && fadeOut === 0) return null;
  const fadeInW = Math.min(width / 2, fadeIn * pps);
  const fadeOutW = Math.min(width / 2, fadeOut * pps);
  return (
    <div className="absolute inset-0 pointer-events-none z-[15] overflow-hidden rounded-md">
      {fadeIn > 0 && (
        <div
          className="absolute top-0 left-0 bottom-0"
          style={{
            width: `${fadeInW}px`,
            background: 'linear-gradient(to right, rgba(0,0,0,0.8) 0%, transparent 100%)',
          }}
        />
      )}
      {fadeOut > 0 && (
        <div
          className="absolute top-0 right-0 bottom-0"
          style={{
            width: `${fadeOutW}px`,
            background: 'linear-gradient(to left, rgba(0,0,0,0.8) 0%, transparent 100%)',
          }}
        />
      )}
    </div>
  );
}

/* ── Phase 12: Inline Speed Editor (double-click badge) ─────────────── */
export function ClipSpeedEditor({ clip, onClose }: { clip: any; onClose: () => void }) {
  const app = (window as any).app;
  const [speed, setSpeed] = useState<number>(clip.properties?.playbackSpeed || 1);

  const apply = (s: number) => {
    const newDur = (clip.properties?._originalDuration || clip.duration) / s;
    app?.updateClipSpeedAndDuration?.(clip.id, s, newDur);
    onClose();
  };

  return (
    <div className="absolute bottom-8 right-0 z-[9999] bg-[#131c2e] border border-white/10 rounded-xl shadow-2xl p-3 w-48" onMouseDown={e => e.stopPropagation()}>
      <div className="text-[10px] text-gray-400 font-bold mb-2">⚡ Clip Speed</div>
      <div className="flex gap-1 flex-wrap mb-2">
        {[0.25, 0.5, 0.75, 1, 1.5, 2, 4].map(s => (
          <button
            key={s}
            className={`px-2 py-0.5 text-[10px] rounded transition-colors ${Math.abs(speed - s) < 0.01 ? 'bg-indigo-600 text-white' : 'bg-white/10 hover:bg-white/20 text-gray-300'}`}
            onClick={() => { setSpeed(s); apply(s); }}
          >
            {s === 1 ? '1×' : s < 1 ? `${Math.round(s * 100)}%` : `${s}×`}
          </button>
        ))}
      </div>
      <div className="flex items-center gap-2">
        <input
          type="range" min="0.1" max="8" step="0.05"
          value={speed}
          className="flex-1 accent-indigo-500"
          onChange={e => setSpeed(parseFloat(e.target.value))}
          onMouseUp={() => apply(speed)}
        />
        <span className="text-[10px] text-gray-300 w-8 text-right">{speed.toFixed(2)}×</span>
      </div>
      <button className="mt-2 w-full text-[9px] text-gray-500 hover:text-gray-300" onClick={onClose}>Close</button>
    </div>
  );
}
