// Phase 26: Loop Region Overlay — shows In/Out points on the ruler
// Renders a shaded region + bracket handles. I/O keys set In/Out points.
import React, { useEffect, useState } from 'react';
import { useEditorStore } from '../../../store/useEditorStore';

export default function LoopRegion() {
  const loopRegion   = useEditorStore(s => s.loopRegion);
  const setLoopRegion = useEditorStore(s => s.setLoopRegion);
  const isLooping    = useEditorStore(s => s.isLooping);
  const setIsLooping = useEditorStore(s => s.setIsLooping);
  const pixelsPerSecond = useEditorStore(s => s.pixelsPerSecond);
  const headerWidth  = useEditorStore(s => s.headerWidth);
  const duration     = useEditorStore(s => s.duration);
  const [scrollLeft, setScrollLeft] = useState(0);

  useEffect(() => {
    const el = document.getElementById('timeline-scroll-area');
    if (!el) return;
    const onScroll = () => setScrollLeft(el.scrollLeft);
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, []);

  // Listen for loop-toggle event from playback loop
  useEffect(() => {
    if (!isLooping || !loopRegion) return;
    const app = (window as any).app;
    if (!app) return;
    // Patch playback loop to enforce loop region
    const origPause = app.pausePlayback?.bind(app);
    const checkLoop = () => {
      if (app.isPlaying && app.currentTime >= loopRegion.out) {
        app.seekToAbsolute?.(loopRegion.in, { resume: true });
      }
    };
    const interval = setInterval(checkLoop, 50);
    return () => clearInterval(interval);
  }, [isLooping, loopRegion]);

  if (!loopRegion) return null;

  const inX  = loopRegion.in  * pixelsPerSecond + headerWidth - scrollLeft;
  const outX = loopRegion.out * pixelsPerSecond + headerWidth - scrollLeft;
  const width = outX - inX;

  return (
    <div className="absolute inset-0 pointer-events-none z-[55] overflow-hidden">
      {/* Shaded region */}
      <div
        className="absolute top-0 bottom-0"
        style={{
          left: `${inX}px`,
          width: `${Math.max(0, width)}px`,
          background: isLooping
            ? 'rgba(16, 185, 129, 0.15)'
            : 'rgba(99, 102, 241, 0.12)',
          borderLeft: `2px solid ${isLooping ? '#10b981' : '#6366f1'}`,
          borderRight: `2px solid ${isLooping ? '#10b981' : '#ef4444'}`,
        }}
      />

      {/* In bracket */}
      <div
        className="absolute top-0 flex flex-col items-center pointer-events-auto"
        style={{ left: `${inX - 1}px` }}
      >
        <div
          className="text-[8px] font-bold px-1 py-0.5 rounded-b-sm select-none cursor-pointer"
          style={{ background: '#10b981', color: '#fff', marginTop: 0 }}
          title={`In: ${loopRegion.in.toFixed(2)}s — Click to remove`}
          onClick={() => setLoopRegion({ in: 0, out: loopRegion.out })}
        >
          IN
        </div>
        <div className="w-px flex-1" style={{ background: '#10b981', opacity: 0.6 }} />
      </div>

      {/* Out bracket */}
      <div
        className="absolute top-0 flex flex-col items-center pointer-events-auto"
        style={{ left: `${outX - 1}px` }}
      >
        <div
          className="text-[8px] font-bold px-1 py-0.5 rounded-b-sm select-none cursor-pointer"
          style={{ background: '#ef4444', color: '#fff' }}
          title={`Out: ${loopRegion.out.toFixed(2)}s — Click to remove`}
          onClick={() => setLoopRegion({ in: loopRegion.in, out: duration })}
        >
          OUT
        </div>
        <div className="w-px flex-1" style={{ background: '#ef4444', opacity: 0.6 }} />
      </div>

      {/* Loop toggle button (center of region) */}
      {width > 60 && (
        <div
          className="absolute top-0 flex items-center justify-center pointer-events-auto cursor-pointer"
          style={{ left: `${inX + width / 2 - 20}px`, width: 40 }}
        >
          <button
            onClick={() => setIsLooping(!isLooping)}
            className="text-[7px] px-1.5 py-0.5 rounded-full font-bold mt-0.5 transition-all"
            style={{
              background: isLooping ? '#10b981' : 'rgba(255,255,255,0.1)',
              color: isLooping ? '#fff' : '#9ca3af',
              border: `1px solid ${isLooping ? '#10b981' : 'rgba(255,255,255,0.1)'}`,
            }}
            title="Toggle loop playback"
          >
            {isLooping ? '🔁 ON' : '🔁'}
          </button>
        </div>
      )}
    </div>
  );
}
