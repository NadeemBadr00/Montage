import React, { useState } from 'react';
import { useEditorStore } from '../../../store/useEditorStore';

const MARKER_COLORS = ['#f59e0b', '#ef4444', '#22c55e', '#3b82f6', '#a855f7', '#ec4899', '#06b6d4', '#ffffff'];
const MARKER_TYPES = ['Chapter', 'Beat', 'Comment', 'Cue'];

export default function TimelineMarkers() {
  const pixelsPerSecond = useEditorStore(s => s.pixelsPerSecond);
  const headerWidth = useEditorStore(s => s.headerWidth);
  const [editing, setEditing] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState('');

  const app = (window as any).app;
  if (!app) return null;
  const markers: any[] = app.markers || [];

  const getLeft = (time: number) => headerWidth + time * pixelsPerSecond;

  const removeMarker = (idx: number) => {
    app.markers.splice(idx, 1);
    app.commitStateToReact?.();
  };

  const startEdit = (idx: number) => {
    setEditing(String(idx));
    setEditLabel(markers[idx].label);
  };

  const commitEdit = (idx: number) => {
    if (app.markers[idx]) app.markers[idx].label = editLabel;
    app.commitStateToReact?.();
    setEditing(null);
  };

  const setColor = (idx: number, color: string) => {
    if (app.markers[idx]) app.markers[idx].color = color;
    app.commitStateToReact?.();
  };

  const jumpTo = (time: number) => {
    app.seek?.(time - (app.currentTime || 0));
  };

  return (
    <>
      {markers.map((marker: any, idx: number) => {
        const left = getLeft(marker.time);
        const isEdit = editing === String(idx);
        return (
          <div
            key={marker.id || idx}
            className="absolute top-0 z-[80] pointer-events-auto group"
            style={{ left: `${left}px` }}
          >
            {/* Vertical line */}
            <div
              className="absolute top-0 bottom-0 w-[2px] opacity-70 group-hover:opacity-100 transition-opacity"
              style={{ background: marker.color || '#f59e0b', left: '-1px' }}
            />

            {/* Flag head */}
            <div
              className="relative -top-0 cursor-pointer flex items-center"
              title={marker.label}
              onDoubleClick={() => startEdit(idx)}
              onClick={() => jumpTo(marker.time)}
            >
              {/* Flag shape */}
              <div
                className="flex items-center gap-1 px-1.5 py-0.5 rounded-sm shadow-lg text-[9px] font-bold text-black select-none whitespace-nowrap"
                style={{ background: marker.color || '#f59e0b' }}
              >
                <i className="fa-solid fa-flag text-[8px]" />
                {!isEdit && <span className="max-w-[80px] truncate">{marker.label}</span>}
              </div>

              {/* Edit input */}
              {isEdit && (
                <input
                  autoFocus
                  className="absolute left-full top-0 ml-1 text-[10px] bg-gray-900 border border-indigo-500 text-white px-1 rounded w-24 outline-none z-[9999]"
                  value={editLabel}
                  onChange={e => setEditLabel(e.target.value)}
                  onBlur={() => commitEdit(idx)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') commitEdit(idx);
                    if (e.key === 'Escape') setEditing(null);
                  }}
                />
              )}
            </div>

            {/* Hover actions */}
            <div className="absolute top-6 left-0 hidden group-hover:flex flex-col bg-[#1a2540] border border-white/10 rounded shadow-2xl z-[9999] py-1 min-w-[120px]">
              <div className="px-2 py-1 text-[9px] text-gray-400 border-b border-white/10">
                {marker.time.toFixed(2)}s — {marker.type || 'Marker'}
              </div>
              {/* Color swatches */}
              <div className="px-2 py-1 flex gap-1 flex-wrap">
                {MARKER_COLORS.map(c => (
                  <div key={c} className="w-3 h-3 rounded-full cursor-pointer hover:scale-125 transition-transform border border-white/20"
                    style={{ background: c }} onClick={() => setColor(idx, c)} />
                ))}
              </div>
              <div className="h-px bg-white/10 mx-2 my-0.5" />
              <div className="px-2 py-1 text-[10px] text-gray-300 hover:bg-white/10 cursor-pointer flex items-center gap-1"
                onClick={() => startEdit(idx)}>
                <i className="fa-solid fa-pencil text-[9px]" /> Rename
              </div>
              <div className="px-2 py-1 text-[10px] text-red-400 hover:bg-red-600/30 cursor-pointer flex items-center gap-1"
                onClick={() => removeMarker(idx)}>
                <i className="fa-solid fa-trash text-[9px]" /> Delete
              </div>
            </div>
          </div>
        );
      })}
    </>
  );
}
