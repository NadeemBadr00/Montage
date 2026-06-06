// Phase 25: Timeline Search & Clip Navigator
import React, { useState, useRef, useEffect } from 'react';
import { useEditorStore } from '../../../store/useEditorStore';

interface Props {
  onClose: () => void;
}

const TYPES = ['all', 'video', 'audio', 'image', 'text'] as const;
const TYPE_ICONS: Record<string, string> = {
  all:   'fa-asterisk',
  video: 'fa-film',
  audio: 'fa-music',
  image: 'fa-image',
  text:  'fa-font',
};
const TYPE_COLORS: Record<string, string> = {
  video: 'text-indigo-400',
  audio: 'text-blue-400',
  image: 'text-emerald-400',
  text:  'text-amber-400',
};

export default function TimelineSearch({ onClose }: Props) {
  const [query, setQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [resultIdx, setResultIdx] = useState(0);
  const tracks = useEditorStore(s => s.tracks);
  const setHighlightedClip = useEditorStore(s => s.setHighlightedClip);
  const pixelsPerSecond = useEditorStore(s => s.pixelsPerSecond);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  const results = tracks.flatMap(t =>
    t.clips
      .filter((c: any) => {
        const matchType = filterType === 'all' || c.type === filterType;
        const matchName = !query || (c.name || c.src || '').toLowerCase().includes(query.toLowerCase());
        return matchType && matchName;
      })
      .map((c: any) => ({ clip: c, track: t }))
  ).sort((a, b) => a.clip.start - b.clip.start);

  const jumpTo = (idx: number) => {
    const r = results[idx];
    if (!r) return;
    const app = (window as any).app;
    app?.seekToAbsolute?.(r.clip.start, { resume: false });
    setHighlightedClip(r.clip.id);
    // Scroll timeline to this clip
    const area = document.getElementById('timeline-scroll-area');
    if (area) {
      const hw = useEditorStore.getState().headerWidth;
      area.scrollLeft = Math.max(0, r.clip.start * pixelsPerSecond + hw - 100);
    }
    setTimeout(() => setHighlightedClip(null), 1500);
  };

  const next = () => {
    if (results.length === 0) return;
    const i = (resultIdx + 1) % results.length;
    setResultIdx(i);
    jumpTo(i);
  };
  const prev = () => {
    if (results.length === 0) return;
    const i = (resultIdx - 1 + results.length) % results.length;
    setResultIdx(i);
    jumpTo(i);
  };

  return (
    <div
      className="absolute top-10 left-1/2 -translate-x-1/2 z-[9999] w-[460px]"
      style={{ filter: 'drop-shadow(0 8px 40px rgba(0,0,0,0.7))' }}
      onMouseDown={e => e.stopPropagation()}
    >
      <div className="bg-[#0d1b2e] border border-indigo-500/40 rounded-xl overflow-hidden">
        {/* Search header */}
        <div className="flex items-center gap-2 px-3 py-2.5 border-b border-white/5">
          <i className="fa-solid fa-magnifying-glass text-indigo-400 text-sm flex-shrink-0" />
          <input
            ref={inputRef}
            className="flex-1 bg-transparent text-white text-[13px] outline-none placeholder-gray-500"
            placeholder="Search clips by name, type..."
            value={query}
            onChange={e => { setQuery(e.target.value); setResultIdx(0); }}
            onKeyDown={e => {
              if (e.key === 'Escape') onClose();
              if (e.key === 'Enter') { e.shiftKey ? prev() : next(); }
              if (e.key === 'F3') { e.preventDefault(); e.shiftKey ? prev() : next(); }
            }}
          />
          <span className="text-gray-500 text-[11px] flex-shrink-0 tabular-nums">
            {results.length} clip{results.length !== 1 ? 's' : ''}
          </span>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-white transition-colors w-5 h-5 flex items-center justify-center rounded hover:bg-white/10 flex-shrink-0"
          >
            <i className="fa-solid fa-xmark text-[12px]" />
          </button>
        </div>

        {/* Type filter chips */}
        <div className="flex gap-1 px-3 py-2 border-b border-white/5">
          {TYPES.map(t => (
            <button
              key={t}
              onClick={() => { setFilterType(t); setResultIdx(0); }}
              className={`px-2.5 py-1 rounded-full text-[10px] flex items-center gap-1.5 transition-all border ${
                filterType === t
                  ? 'bg-indigo-600/40 text-indigo-300 border-indigo-500/60'
                  : 'bg-white/5 text-gray-400 hover:bg-white/10 border-transparent'
              }`}
            >
              <i className={`fa-solid ${TYPE_ICONS[t]} text-[8px]`} />
              {t}
            </button>
          ))}
        </div>

        {/* Results list */}
        <div className="max-h-52 overflow-y-auto custom-scrollbar">
          {results.length === 0 ? (
            <div className="text-center text-gray-600 py-6 text-[12px] flex flex-col items-center gap-2">
              <i className="fa-solid fa-face-frown text-gray-700 text-xl" />
              No clips found
            </div>
          ) : (
            results.map((r, i) => (
              <div
                key={r.clip.id || i}
                className={`flex items-center gap-2.5 px-3 py-2 cursor-pointer text-[11px] transition-colors border-b border-white/3 ${
                  i === resultIdx
                    ? 'bg-indigo-600/20 border-l-2 border-l-indigo-400'
                    : 'hover:bg-white/5'
                }`}
                onClick={() => { setResultIdx(i); jumpTo(i); }}
              >
                <i
                  className={`fa-solid ${TYPE_ICONS[r.clip.type] || 'fa-shapes'} text-[9px] w-3 flex-shrink-0 ${
                    TYPE_COLORS[r.clip.type] || 'text-gray-400'
                  }`}
                />
                <span className="flex-1 text-gray-200 truncate">
                  {r.clip.name || (r.clip.src?.split('/').pop()) || r.clip.type || 'Clip'}
                </span>
                <span className="text-gray-500 tabular-nums flex-shrink-0 text-[10px]">
                  {r.clip.start.toFixed(1)}s
                </span>
                <span className="text-gray-700 text-[9px] flex-shrink-0 bg-white/5 px-1 rounded">
                  {r.track.name || r.track.type}
                </span>
              </div>
            ))
          )}
        </div>

        {/* Navigation footer */}
        {results.length > 0 && (
          <div className="flex items-center justify-between px-3 py-2 border-t border-white/5 bg-white/2">
            <span className="text-gray-600 text-[10px] tabular-nums">
              {resultIdx + 1} / {results.length}
            </span>
            <div className="flex gap-1 text-[10px]">
              <kbd className="text-gray-600 text-[9px] bg-white/5 px-1 rounded">↵</kbd>
              <span className="text-gray-600">next</span>
              <span className="text-gray-700 mx-1">·</span>
              <kbd className="text-gray-600 text-[9px] bg-white/5 px-1 rounded">⇧↵</kbd>
              <span className="text-gray-600">prev</span>
              <span className="text-gray-700 mx-1">·</span>
              <kbd className="text-gray-600 text-[9px] bg-white/5 px-1 rounded">Esc</kbd>
              <span className="text-gray-600">close</span>
            </div>
            <div className="flex gap-1">
              <button
                onClick={prev}
                className="px-2 py-0.5 bg-white/5 hover:bg-white/10 rounded text-[10px] text-gray-300 flex items-center gap-1 transition-colors"
              >
                <i className="fa-solid fa-chevron-up text-[8px]" />
                Prev
              </button>
              <button
                onClick={next}
                className="px-2 py-0.5 bg-indigo-600 hover:bg-indigo-500 rounded text-[10px] text-white flex items-center gap-1 transition-colors"
              >
                Next
                <i className="fa-solid fa-chevron-down text-[8px]" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
