// Phase 24: Keyframe Lane — shows below a track when keyframe mode is enabled
import React, { useState } from 'react';
import { useEditorStore } from '../../../store/useEditorStore';

interface Props {
  track: any;
  headerWidth: number;
}

const PROPERTIES = ['opacity', 'scale', 'positionX', 'positionY', 'volume'];
const PROP_COLORS: Record<string, string> = {
  opacity:   '#6366f1',
  scale:     '#10b981',
  positionX: '#f59e0b',
  positionY: '#ec4899',
  volume:    '#06b6d4',
};

export default function KeyframeLane({ track, headerWidth }: Props) {
  const pixelsPerSecond = useEditorStore(s => s.pixelsPerSecond);
  const [activeProp, setActiveProp] = useState('opacity');
  const app = (window as any).app;

  const allKeyframes: { clipId: string; time: number; value: number; prop: string }[] = [];
  track.clips?.forEach((clip: any) => {
    const kfs = clip.keyframes?.[activeProp] || [];
    kfs.forEach((kf: any) => {
      allKeyframes.push({
        clipId: clip.id,
        time: clip.start + kf.time,
        value: kf.value,
        prop: activeProp,
      });
    });
  });

  const addKeyframe = (e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const time = Math.max(0, (x - headerWidth) / pixelsPerSecond);
    const clip = track.clips?.find((c: any) => time >= c.start && time <= c.start + c.duration);
    if (!clip) return;
    if (!clip.keyframes) clip.keyframes = {};
    if (!clip.keyframes[activeProp]) clip.keyframes[activeProp] = [];
    const localTime = time - clip.start;
    const defaultValue = activeProp === 'opacity' ? 100 : activeProp === 'scale' ? 100 : 0;
    clip.keyframes[activeProp].push({ time: localTime, value: defaultValue, easing: 'linear' });
    clip.keyframes[activeProp].sort((a: any, b: any) => a.time - b.time);
    app?.commitStateToReact?.();
  };

  const removeKeyframe = (clipId: string, time: number) => {
    const clip = track.clips?.find((c: any) => c.id === clipId);
    if (!clip?.keyframes?.[activeProp]) return;
    const localTime = time - (clip.start || 0);
    clip.keyframes[activeProp] = clip.keyframes[activeProp].filter(
      (kf: any) => Math.abs(kf.time - localTime) > 0.01
    );
    app?.commitStateToReact?.();
  };

  return (
    <div
      className="keyframe-lane relative flex"
      style={{ height: 44, background: '#060b18', borderTop: '1px solid rgba(99,102,241,0.3)' }}
      onDoubleClick={addKeyframe}
    >
      {/* Property selector — fixed left column */}
      <div
        className="flex-shrink-0 flex flex-col items-start justify-center gap-0.5 px-1 border-r border-white/5"
        style={{ width: headerWidth }}
      >
        <div className="flex flex-wrap gap-0.5">
          {PROPERTIES.map(p => (
            <button
              key={p}
              onClick={e => { e.stopPropagation(); setActiveProp(p); }}
              className="text-[7px] px-1 py-0.5 rounded border transition-colors"
              style={{
                background: activeProp === p ? PROP_COLORS[p] + '33' : 'rgba(255,255,255,0.04)',
                color: activeProp === p ? PROP_COLORS[p] : '#4b5563',
                borderColor: activeProp === p ? PROP_COLORS[p] + '66' : 'transparent',
              }}
              title={p}
            >
              {p.slice(0, 3).toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Keyframe canvas area */}
      <div className="relative flex-1 overflow-hidden">
        {/* Center baseline */}
        <div
          className="absolute left-0 right-0 pointer-events-none"
          style={{ top: '50%', height: 1, background: 'rgba(255,255,255,0.06)' }}
        />

        {/* Keyframe diamonds */}
        {allKeyframes.map((kf, i) => (
          <div
            key={i}
            className="absolute top-1/2 cursor-pointer hover:scale-150 transition-transform"
            style={{
              left: kf.time * pixelsPerSecond,
              transform: 'translateY(-50%) rotate(45deg)',
              width: 8,
              height: 8,
              background: PROP_COLORS[kf.prop],
              border: '1.5px solid white',
              boxShadow: `0 0 6px ${PROP_COLORS[kf.prop]}`,
              zIndex: 10,
            }}
            title={`${kf.prop}: ${kf.value} @ ${kf.time.toFixed(2)}s`}
            onContextMenu={e => {
              e.preventDefault();
              e.stopPropagation();
              removeKeyframe(kf.clipId, kf.time);
            }}
          />
        ))}

        {/* Hint text */}
        <div className="absolute top-1 right-2 text-[8px] text-gray-700 pointer-events-none select-none">
          Double-click to add · Right-click to remove
        </div>
      </div>
    </div>
  );
}
