import React, { useState } from 'react';
import { useEditorStore } from '../../../store/useEditorStore';

const TRANSITIONS = [
  { id: 'fade',       name: 'Fade',          icon: '◐', color: '#6366f1' },
  { id: 'wipe_right', name: 'Wipe →',        icon: '▶', color: '#3b82f6' },
  { id: 'wipe_left',  name: 'Wipe ←',        icon: '◀', color: '#3b82f6' },
  { id: 'zoom_in',    name: 'Zoom In',        icon: '⊕', color: '#10b981' },
  { id: 'zoom_out',   name: 'Zoom Out',       icon: '⊖', color: '#10b981' },
  { id: 'slide_up',   name: 'Slide Up',       icon: '▲', color: '#f59e0b' },
  { id: 'slide_down', name: 'Slide Down',     icon: '▼', color: '#f59e0b' },
  { id: 'spin',       name: 'Spin',           icon: '↻', color: '#a855f7' },
  { id: 'flash',      name: 'Flash',          icon: '⚡', color: '#ec4899' },
  { id: 'glitch',     name: 'Glitch',         icon: '▒', color: '#ef4444' },
  { id: 'blur',       name: 'Blur',           icon: '◉', color: '#06b6d4' },
  { id: 'cross_blur', name: 'Cross Blur',     icon: '⊛', color: '#8b5cf6' },
  { id: 'film_burn',  name: 'Film Burn',      icon: '🔥', color: '#f97316' },
  { id: 'morph',      name: 'Morph',          icon: '⇌', color: '#14b8a6' },
  { id: 'dip_black',  name: 'Dip to Black',   icon: '■', color: '#1f2937' },
  { id: 'dip_white',  name: 'Dip to White',   icon: '□', color: '#f3f4f6' },
];

const DURATIONS = [0.3, 0.5, 0.75, 1.0, 1.5, 2.0];

export default function TransitionsPicker({ onClose }: { onClose?: () => void }) {
  const tracks = useEditorStore(s => s.tracks);
  const [selected, setSelected] = useState<string>('fade');
  const [duration, setDuration] = useState<number>(0.5);
  const [search, setSearch] = useState('');

  const app = (window as any).app;

  const applyToSelected = () => {
    if (!app) return;
    const ids = Array.from(app.selectedClipIds || new Set()) as string[];

    if (ids.length === 0) {
      // Apply to all cut points in all tracks
      app.tracks?.forEach((track: any) => {
        if (track.type !== 'audio') {
          track.clips.forEach((clip: any) => {
            const cutTime = clip.start + clip.duration;
            app.addTransition?.(track.id, cutTime, selected);
          });
        }
      });
    } else {
      // Apply at the end of each selected clip
      ids.forEach((clipId: any) => {
        const track = app.tracks?.find((t: any) => t.clips.some((c: any) => c.id === clipId));
        if (!track) return;
        const clip = track.clips.find((c: any) => c.id === clipId);
        if (clip) {
          const cutTime = clip.start + clip.duration;
          // Store custom duration in the transition
          const existingMethod = app.addTransition;
          if (existingMethod) {
            app.addTransition(track.id, cutTime, selected);
            // Patch duration on the last added transition
            const lastTrans = track.transitions?.[track.transitions.length - 1];
            if (lastTrans) lastTrans.duration = duration;
          }
        }
      });
    }
    app.saveState?.();
    app.renderAll?.();
    app.commitStateToReact?.();
  };

  const filtered = TRANSITIONS.filter(t => t.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="flex flex-col h-full bg-[#0d1421]">
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-white/10">
        <i className="fa-solid fa-film text-indigo-400 text-[11px]" />
        <span className="text-[11px] font-bold text-gray-300">Transitions</span>
        <div className="flex-1" />
        {onClose && <button onClick={onClose} className="text-gray-500 hover:text-white"><i className="fa-solid fa-xmark text-[11px]" /></button>}
      </div>

      {/* Search */}
      <div className="px-2 py-1.5">
        <input
          type="text"
          placeholder="Search transitions..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full text-[10px] bg-white/5 border border-white/10 rounded px-2 py-1 text-gray-300 outline-none focus:border-indigo-500/50 placeholder-gray-600"
        />
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-y-auto px-2 pb-2">
        <div className="grid grid-cols-4 gap-1.5">
          {filtered.map(t => (
            <button
              key={t.id}
              className={`flex flex-col items-center gap-1 py-2 px-1 rounded-lg border transition-all text-center ${
                selected === t.id
                  ? 'border-indigo-500 bg-indigo-500/20 scale-105 shadow-lg shadow-indigo-500/20'
                  : 'border-white/5 bg-white/3 hover:bg-white/8 hover:border-white/20'
              }`}
              onClick={() => setSelected(t.id)}
              onDoubleClick={applyToSelected}
              title={`Double-click to apply ${t.name}`}
            >
              <span className="text-[18px] leading-none" style={{ filter: `drop-shadow(0 0 4px ${t.color})` }}>{t.icon}</span>
              <span className="text-[8px] text-gray-400 leading-none truncate w-full">{t.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Duration + Apply */}
      <div className="border-t border-white/10 p-2 space-y-2">
        <div className="flex items-center gap-2">
          <span className="text-[9px] text-gray-500">Duration:</span>
          <div className="flex gap-1 flex-1">
            {DURATIONS.map(d => (
              <button
                key={d}
                className={`flex-1 py-0.5 text-[9px] rounded transition-colors ${Math.abs(duration - d) < 0.01 ? 'bg-indigo-600 text-white' : 'bg-white/5 hover:bg-white/15 text-gray-400'}`}
                onClick={() => setDuration(d)}
              >
                {d}s
              </button>
            ))}
          </div>
        </div>
        <button
          className="w-full py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-bold rounded-lg transition-colors flex items-center justify-center gap-2"
          onClick={applyToSelected}
        >
          <i className="fa-solid fa-wand-magic-sparkles text-[10px]" />
          Apply {TRANSITIONS.find(t => t.id === selected)?.name} ({duration}s)
        </button>
        <button
          className="w-full py-1 bg-white/5 hover:bg-white/10 text-gray-400 text-[10px] rounded-lg transition-colors"
          onClick={() => {
            if (!app) return;
            app.tracks?.forEach((track: any) => { track.transitions = []; });
            app.saveState?.(); app.renderAll?.(); app.commitStateToReact?.();
          }}
        >
          Clear All Transitions
        </button>
      </div>
    </div>
  );
}
