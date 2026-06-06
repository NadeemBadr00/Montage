import React, { useState, useRef } from 'react';
import { useEditorStore } from '../../../store/useEditorStore';

const TRACK_COLORS = ['#ef4444','#f97316','#f59e0b','#22c55e','#06b6d4','#3b82f6','#8b5cf6','#ec4899','#14b8a6','#84cc16'];
const TRACK_ICONS: Record<string, string> = {
  main: 'fa-film', video: 'fa-video', audio: 'fa-music',
  subtitle: 'fa-closed-captioning', overlay: 'fa-layer-group', text: 'fa-font',
};

interface TrackHeaderProps {
  track: any;
  trackIndex: number;
  height: number;
  onHeightChange: (idx: number, h: number) => void;
}

export default function TimelineTrackHeader({ track, trackIndex, height, onHeightChange }: TrackHeaderProps) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(track.name || track.type);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const resizerRef = useRef<HTMLDivElement>(null);

  const app = (window as any).app;

  const commitName = () => {
    setEditing(false);
    track.name = name;
    app?.commitStateToReact?.();
  };

  const toggleLock   = () => { track.locked = !track.locked;   app?.commitStateToReact?.(); };
  const toggleMute   = () => { track.muted  = !track.muted;    app?.commitStateToReact?.(); };
  const toggleSolo   = () => {
    const wasSolo = track.solo;
    app?.tracks?.forEach((t: any) => { t.muted = !wasSolo && t !== track; t.solo = false; });
    track.solo  = !wasSolo;
    track.muted = false;
    app?.commitStateToReact?.();
  };
  const toggleHide   = () => { track.hidden = !track.hidden;   app?.commitStateToReact?.(); app?.requestRedraw?.(); };
  const setColor     = (c: string) => { track.color = c; setShowColorPicker(false); app?.commitStateToReact?.(); };

  /* Height resize by dragging bottom edge */
  const startResize = (e: React.MouseEvent) => {
    e.preventDefault();
    const startY = e.clientY;
    const startH = height;
    const move = (ev: MouseEvent) => {
      const newH = Math.max(36, Math.min(200, startH + (ev.clientY - startY)));
      onHeightChange(trackIndex, newH);
    };
    const up = () => { window.removeEventListener('mousemove', move); window.removeEventListener('mouseup', up); };
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
  };

  const menuAction = (action: string) => {
    setShowMenu(false);
    const app = (window as any).app;
    if (!app) return;
    if (action === 'addAbove') {
      app.tracks.splice(trackIndex, 0, { id: 'track_' + Date.now(), type: 'overlay', name: 'New Track', clips: [] });
    } else if (action === 'addBelow') {
      app.tracks.splice(trackIndex + 1, 0, { id: 'track_' + Date.now(), type: 'overlay', name: 'New Track', clips: [] });
    } else if (action === 'delete') {
      app.tracks.splice(trackIndex, 1);
    } else if (action === 'clear') {
      track.clips = [];
    } else if (action === 'duplicate') {
      const clone = JSON.parse(JSON.stringify(track));
      clone.id = 'track_' + Date.now();
      clone.clips.forEach((c: any) => { c.id = 'clip_' + Date.now() + Math.random(); });
      app.tracks.splice(trackIndex + 1, 0, clone);
    }
    app.saveState?.(); app.commitStateToReact?.();
  };

  return (
    <div
      className="relative flex flex-col select-none border-b border-white/5"
      style={{
        height,
        background: track.hidden ? '#0d1117' : '#111827',
        opacity: track.hidden ? 0.45 : 1,
        borderLeft: `3px solid ${track.color || '#374151'}`,
      }}
    >
      {/* Main row */}
      <div className="flex items-center gap-1 px-1.5 pt-1 flex-1 min-h-0 overflow-hidden">

        {/* Track icon + type */}
        <i className={`fa-solid ${TRACK_ICONS[track.type] || 'fa-layer-group'} text-[10px] text-gray-500 flex-shrink-0`} />

        {/* Track name */}
        {editing ? (
          <input
            ref={inputRef}
            className="text-[11px] bg-white/10 text-white rounded px-1 w-full outline-none border border-indigo-500/50"
            value={name}
            autoFocus
            onChange={e => setName(e.target.value)}
            onBlur={commitName}
            onKeyDown={e => { if (e.key === 'Enter') commitName(); if (e.key === 'Escape') { setEditing(false); setName(track.name || track.type); } }}
          />
        ) : (
          <span
            className="text-[11px] text-gray-300 truncate cursor-pointer hover:text-white flex-1"
            title="Double-click to rename"
            onDoubleClick={() => { setEditing(true); setTimeout(() => inputRef.current?.select(), 0); }}
          >
            {name}
          </span>
        )}

        {/* Color dot */}
        <div className="relative flex-shrink-0">
          <div
            className="w-3 h-3 rounded-full cursor-pointer hover:scale-125 transition-transform border border-white/20"
            style={{ background: track.color || '#374151' }}
            onClick={() => setShowColorPicker(v => !v)}
          />
          {showColorPicker && (
            <div className="absolute left-4 top-0 z-[9999] bg-[#1a2540] border border-white/10 rounded p-2 flex flex-wrap gap-1 w-[80px] shadow-2xl">
              {TRACK_COLORS.map(c => (
                <div key={c} className="w-4 h-4 rounded-full cursor-pointer hover:scale-125 transition-transform border border-white/20"
                  style={{ background: c }} onClick={() => setColor(c)} />
              ))}
            </div>
          )}
        </div>

        {/* ⋮ menu */}
        <div className="relative flex-shrink-0">
          <button
            className="w-5 h-5 text-[10px] text-gray-500 hover:text-white hover:bg-white/10 rounded flex items-center justify-center"
            onClick={() => setShowMenu(v => !v)}
          >
            <i className="fa-solid fa-ellipsis-vertical" />
          </button>
          {showMenu && (
            <div className="absolute right-0 top-6 z-[9999] bg-[#1a2540] border border-white/10 rounded shadow-2xl min-w-[160px] text-[11px] text-gray-200 py-1">
              <div className="px-3 py-1.5 hover:bg-white/10 cursor-pointer flex items-center gap-2" onClick={() => menuAction('addAbove')}>
                <i className="fa-solid fa-arrow-up w-3" /> Add Track Above
              </div>
              <div className="px-3 py-1.5 hover:bg-white/10 cursor-pointer flex items-center gap-2" onClick={() => menuAction('addBelow')}>
                <i className="fa-solid fa-arrow-down w-3" /> Add Track Below
              </div>
              <div className="px-3 py-1.5 hover:bg-white/10 cursor-pointer flex items-center gap-2" onClick={() => menuAction('duplicate')}>
                <i className="fa-solid fa-copy w-3" /> Duplicate Track
              </div>
              <div className="h-px bg-white/10 my-1 mx-2" />
              <div className="px-3 py-1.5 hover:bg-white/10 cursor-pointer flex items-center gap-2" onClick={() => menuAction('clear')}>
                <i className="fa-solid fa-eraser w-3" /> Clear Track
              </div>
              <div className="px-3 py-1.5 hover:bg-red-600/70 cursor-pointer flex items-center gap-2 text-red-400" onClick={() => menuAction('delete')}>
                <i className="fa-solid fa-trash w-3" /> Delete Track
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Controls row */}
      <div className="flex items-center gap-0.5 px-1.5 pb-1">
        {/* LOCK */}
        <button
          title={track.locked ? 'Unlock' : 'Lock track'}
          className={`track-ctrl-btn ${track.locked ? 'text-yellow-400 bg-yellow-400/10' : 'text-gray-600 hover:text-yellow-400'}`}
          onClick={toggleLock}
        >
          <i className={`fa-solid ${track.locked ? 'fa-lock' : 'fa-lock-open'} text-[9px]`} />
        </button>

        {/* MUTE */}
        <button
          title={track.muted ? 'Unmute' : 'Mute track'}
          className={`track-ctrl-btn ${track.muted ? 'text-red-400 bg-red-400/10' : 'text-gray-600 hover:text-red-400'}`}
          onClick={toggleMute}
        >
          <i className={`fa-solid ${track.muted ? 'fa-volume-xmark' : 'fa-volume-high'} text-[9px]`} />
        </button>

        {/* SOLO */}
        <button
          title={track.solo ? 'Unsolo' : 'Solo track'}
          className={`track-ctrl-btn ${track.solo ? 'text-green-400 bg-green-400/10' : 'text-gray-600 hover:text-green-400'}`}
          onClick={toggleSolo}
        >
          <i className="fa-solid fa-headphones text-[9px]" />
        </button>

        {/* HIDE */}
        <button
          title={track.hidden ? 'Show' : 'Hide track'}
          className={`track-ctrl-btn ${track.hidden ? 'text-blue-400 bg-blue-400/10' : 'text-gray-600 hover:text-blue-400'}`}
          onClick={toggleHide}
        >
          <i className={`fa-solid ${track.hidden ? 'fa-eye-slash' : 'fa-eye'} text-[9px]`} />
        </button>

        {/* Clip count badge */}
        <span className="ml-auto text-[9px] text-gray-600 tabular-nums">{track.clips?.length ?? 0}</span>
      </div>

      {/* Resize handle (bottom edge) */}
      <div
        ref={resizerRef}
        className="absolute bottom-0 left-0 right-0 h-1 cursor-row-resize hover:bg-indigo-500/50 transition-colors group z-10"
        onMouseDown={startResize}
      >
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-white/10 rounded group-hover:bg-indigo-400/60 transition-colors" />
      </div>
    </div>
  );
}
