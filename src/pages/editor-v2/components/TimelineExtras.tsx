// Phase 28: Track Render Bar — shows render status (green=rendered, yellow=dirty) on ruler
// Phase 29: Comment Markers — speech bubble markers with text
// Phase 30: Shortcuts Cheatsheet overlay

import React, { useState, useEffect } from 'react';
import { useEditorStore } from '../../../store/useEditorStore';

/* ═══════════════ PHASE 28: Render Status Bar ═══════════════ */
export function RenderStatusBar() {
  const pixelsPerSecond = useEditorStore(s => s.pixelsPerSecond);
  const duration       = useEditorStore(s => s.duration);
  const headerWidth    = useEditorStore(s => s.headerWidth);
  const [renderRegions, setRenderRegions] = useState<{ start: number; end: number; status: 'rendered' | 'dirty' }[]>([]);

  // Listen for render cache updates
  useEffect(() => {
    const handler = (e: CustomEvent) => setRenderRegions(e.detail || []);
    window.addEventListener('render-cache-update' as any, handler);
    return () => window.removeEventListener('render-cache-update' as any, handler);
  }, []);

  if (renderRegions.length === 0) return null;

  return (
    <div
      className="absolute left-0 right-0 pointer-events-none"
      style={{ top: 0, height: 3, marginLeft: headerWidth, zIndex: 56 }}
    >
      {renderRegions.map((r, i) => (
        <div
          key={i}
          className="absolute top-0 bottom-0 transition-all"
          style={{
            left:  `${r.start * pixelsPerSecond}px`,
            width: `${(r.end - r.start) * pixelsPerSecond}px`,
            background: r.status === 'rendered' ? 'rgba(34, 197, 94, 0.7)' : 'rgba(251, 191, 36, 0.6)',
          }}
          title={`${r.status === 'rendered' ? 'Rendered' : 'Unrendered'}: ${r.start.toFixed(1)}s — ${r.end.toFixed(1)}s`}
        />
      ))}
    </div>
  );
}

/* ═══════════════ PHASE 29: Comment Markers ═══════════════ */
interface Comment {
  id: string;
  time: number;
  text: string;
  color: 'info' | 'warning' | 'error';
  author?: string;
}

const COMMENT_COLORS = {
  info:    { bg: '#3b82f6', border: '#60a5fa', label: 'Info' },
  warning: { bg: '#f59e0b', border: '#fbbf24', label: 'Warning' },
  error:   { bg: '#ef4444', border: '#f87171', label: 'Error' },
};

export function CommentMarkers() {
  const pixelsPerSecond = useEditorStore(s => s.pixelsPerSecond);
  const headerWidth     = useEditorStore(s => s.headerWidth);
  const [comments, setComments] = useState<Comment[]>([]);
  const [activeComment, setActiveComment] = useState<string | null>(null);
  const [newCommentAt, setNewCommentAt] = useState<number | null>(null);
  const [newText, setNewText] = useState('');
  const [newColor, setNewColor] = useState<'info' | 'warning' | 'error'>('info');
  const [scrollLeft, setScrollLeft] = useState(0);

  useEffect(() => {
    const el = document.getElementById('timeline-scroll-area');
    if (!el) return;
    const onScroll = () => setScrollLeft(el.scrollLeft);
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, []);

  // Listen for "add-comment" event from keyboard shortcut (Ctrl+M)
  useEffect(() => {
    const handler = (e: CustomEvent) => {
      const time = e.detail?.time ?? (window as any).app?.currentTime ?? 0;
      setNewCommentAt(time);
      setNewText('');
    };
    window.addEventListener('add-comment-marker' as any, handler);
    return () => window.removeEventListener('add-comment-marker' as any, handler);
  }, []);

  const addComment = () => {
    if (newCommentAt === null || !newText.trim()) return;
    const c: Comment = {
      id: 'cmt_' + Date.now(),
      time: newCommentAt,
      text: newText.trim(),
      color: newColor,
    };
    setComments(prev => [...prev, c].sort((a, b) => a.time - b.time));
    setNewCommentAt(null);
    setNewText('');
  };

  const removeComment = (id: string) => {
    setComments(prev => prev.filter(c => c.id !== id));
    setActiveComment(null);
  };

  return (
    <div className="absolute inset-0 pointer-events-none z-[74] overflow-hidden">
      {/* New Comment Input */}
      {newCommentAt !== null && (
        <div
          className="absolute top-8 z-[9999] bg-[#0d1b2e] border border-blue-500/40 rounded-xl shadow-2xl p-3 w-[280px] pointer-events-auto"
          style={{ left: `${newCommentAt * pixelsPerSecond + headerWidth - scrollLeft - 140}px` }}
        >
          <div className="text-[10px] text-gray-400 mb-1.5">Add Comment at {newCommentAt.toFixed(2)}s</div>
          <textarea
            className="w-full bg-white/5 text-white text-[11px] rounded p-1.5 outline-none border border-white/10 focus:border-blue-500/50 resize-none"
            rows={2}
            placeholder="Type a comment..."
            value={newText}
            autoFocus
            onChange={e => setNewText(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); addComment(); } if (e.key === 'Escape') setNewCommentAt(null); }}
          />
          <div className="flex items-center gap-1 mt-1.5">
            {(['info', 'warning', 'error'] as const).map(c => (
              <button
                key={c}
                className="w-4 h-4 rounded-full border-2 transition-transform hover:scale-110"
                style={{
                  background: COMMENT_COLORS[c].bg,
                  borderColor: newColor === c ? '#fff' : 'transparent',
                }}
                onClick={() => setNewColor(c)}
                title={COMMENT_COLORS[c].label}
              />
            ))}
            <div className="flex-1" />
            <button onClick={() => setNewCommentAt(null)} className="text-[10px] text-gray-500 hover:text-gray-300">Cancel</button>
            <button onClick={addComment} className="text-[10px] px-2 py-0.5 bg-blue-600 hover:bg-blue-500 text-white rounded">Add</button>
          </div>
        </div>
      )}

      {/* Comment Bubbles */}
      {comments.map(c => {
        const x = c.time * pixelsPerSecond + headerWidth - scrollLeft;
        const col = COMMENT_COLORS[c.color];
        return (
          <div
            key={c.id}
            className="absolute top-0 pointer-events-auto cursor-pointer"
            style={{ left: `${x}px` }}
          >
            {/* Stem line */}
            <div className="absolute top-4 left-1/2 w-px" style={{ height: 'calc(100vh - 20px)', background: `${col.bg}33` }} />
            {/* Bubble */}
            <div
              className="relative -translate-x-1/2"
              onClick={() => setActiveComment(activeComment === c.id ? null : c.id)}
            >
              <div
                className="w-5 h-5 rounded-full flex items-center justify-center text-white text-[8px] font-bold shadow-lg hover:scale-110 transition-transform"
                style={{ background: col.bg, border: `1.5px solid ${col.border}`, boxShadow: `0 0 8px ${col.bg}80` }}
              >
                <i className="fa-solid fa-comment text-[7px]" />
              </div>
            </div>

            {/* Tooltip */}
            {activeComment === c.id && (
              <div
                className="absolute top-6 -translate-x-1/2 z-[9999] bg-[#0d1b2e] border rounded-lg shadow-2xl p-2 w-[180px] text-[10px]"
                style={{ borderColor: col.border + '60' }}
              >
                <div className="flex items-center gap-1 mb-1">
                  <div className="w-2 h-2 rounded-full" style={{ background: col.bg }} />
                  <span className="text-gray-400">{col.label} · {c.time.toFixed(1)}s</span>
                  <button className="ml-auto text-gray-600 hover:text-red-400" onClick={() => removeComment(c.id)}>
                    <i className="fa-solid fa-xmark text-[8px]" />
                  </button>
                </div>
                <p className="text-gray-200 leading-relaxed">{c.text}</p>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ═══════════════ PHASE 30: Shortcuts Cheatsheet ═══════════════ */
const SHORTCUTS = [
  { key: 'Space', desc: 'Play / Pause' },
  { key: 'J / K / L', desc: 'Seek ±5s / Pause / Seek +5s' },
  { key: '← / →', desc: 'Seek ±1s (Ctrl: ±10s)' },
  { key: 'Home / End', desc: 'Go to Start / End' },
  { key: 'I / O', desc: 'Set In / Out point' },
  { key: 'M', desc: 'Add Marker' },
  { key: 'C', desc: 'Razor / Cut Tool' },
  { key: 'V', desc: 'Selection Tool' },
  { key: 'Y', desc: 'Slip Tool' },
  { key: 'U', desc: 'Slide Tool' },
  { key: 'N', desc: 'Rolling Edit Tool' },
  { key: 'Ctrl+Z / Y', desc: 'Undo / Redo' },
  { key: 'Ctrl+C / V', desc: 'Copy / Paste Clip' },
  { key: 'Ctrl+D', desc: 'Duplicate Clip' },
  { key: 'Ctrl+A', desc: 'Select All Clips' },
  { key: 'Del / Backspace', desc: 'Delete Selected' },
  { key: 'Ctrl+Scroll', desc: 'Zoom In/Out' },
  { key: 'Shift+Scroll', desc: 'Horizontal Scroll' },
  { key: 'Ctrl+F', desc: 'Search Clips' },
  { key: 'Ctrl+0', desc: 'Zoom to Fit' },
  { key: 'Ctrl++ / -', desc: 'Zoom In / Out' },
  { key: '?', desc: 'Show this cheatsheet' },
];

export function ShortcutsCheatsheet({ onClose }: { onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-[99999] flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}
    >
      <div
        className="bg-[#0d1b2e] border border-white/10 rounded-2xl shadow-2xl p-5 w-[520px] max-h-[80vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 mb-4">
          <i className="fa-solid fa-keyboard text-indigo-400 text-lg" />
          <h2 className="text-white font-bold text-base">Keyboard Shortcuts</h2>
          <button onClick={onClose} className="ml-auto text-gray-500 hover:text-white">
            <i className="fa-solid fa-xmark" />
          </button>
        </div>
        <div className="grid grid-cols-2 gap-x-6 gap-y-1.5">
          {SHORTCUTS.map((s, i) => (
            <div key={i} className="flex items-center gap-3">
              <kbd
                className="text-[9px] font-mono px-1.5 py-0.5 rounded border whitespace-nowrap"
                style={{ background: 'rgba(255,255,255,0.06)', borderColor: 'rgba(255,255,255,0.15)', color: '#a5b4fc' }}
              >
                {s.key}
              </kbd>
              <span className="text-gray-400 text-[10px]">{s.desc}</span>
            </div>
          ))}
        </div>
        <div className="mt-4 text-center text-gray-600 text-[9px]">Press ? or Escape to close</div>
      </div>
    </div>
  );
}
