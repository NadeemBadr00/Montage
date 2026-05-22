import { useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import EditorHeader from './EditorHeader';
import EditorLoading from './EditorLoading';
import EditorLayout from './EditorLayout';
import { useEditorInit } from './useEditorInit';

export default function Editor() {
  const { userData } = useAuth();
  const navigate     = useNavigate();
  const loadingRef   = useRef<HTMLDivElement>(null);
  const { loading, loadingStatus } = useEditorInit({ navigate, loadingRef });

  return (
    <div style={{
      background: '#111827', color: '#fff',
      height: '100vh', display: 'flex', flexDirection: 'column',
      overflow: 'hidden', fontFamily: 'Cairo, sans-serif',
    }}>
      {loading && <EditorLoading ref={loadingRef} status={loadingStatus} />}
      <EditorHeader userData={userData} />
      <EditorLayout />
      <EditorModals />
    </div>
  );
}

/* ── Modals ─────────────────────────────────────────── */
function EditorModals() {
  return (
    <>
      {/* Context Menu */}
      <div id="context-menu" className="hidden" style={ctxStyle}>
        <div id="ctx-transcribe" className="hidden" style={ctxItem}>
          <i className="fa-solid fa-closed-captioning" style={{ color: '#10b981', marginLeft: '.4rem' }} /> استخراج نص
        </div>
        <div id="ctx-ripple" style={ctxItem}>
          <i className="fa-solid fa-scissors" style={{ color: '#f59e0b', marginLeft: '.4rem' }} /> Ripple Delete
        </div>
        <div id="ctx-delete" style={{ ...ctxItem, color: '#f87171' }}>
          <i className="fa-solid fa-trash" style={{ marginLeft: '.4rem' }} /> حذف
        </div>
      </div>

      {/* Export XML Modal */}
      <div id="export-modal" className="hidden" style={overlayStyle}>
        <div style={modalBox}>
          <h2 style={{ fontWeight: 700, marginBottom: '1rem', color: '#10b981' }}>✅ XML Ready</h2>
          <pre id="xml-preview" style={{ background: '#111827', borderRadius: '8px', padding: '1rem', fontSize: '.75rem', overflow: 'auto', maxHeight: '300px', color: '#94a3b8' }} />
          <div style={{ display: 'flex', gap: '.75rem', marginTop: '1rem' }}>
            <button onClick={() => document.getElementById('export-modal')?.classList.add('hidden')} style={closeBtn}>إغلاق</button>
            <a id="download-link" style={{ padding: '.5rem 1rem', background: '#10b981', borderRadius: '8px', color: '#fff', textDecoration: 'none', fontWeight: 700 }}>⬇ تحميل XML</a>
          </div>
        </div>
      </div>

      {/* SRT Tool Modal */}
      <div id="srt-tool-modal" className="hidden" style={overlayStyle}>
        <div style={{ position: 'absolute', top: '5%', left: '5%', right: '5%', bottom: '5%', background: '#1f2937', borderRadius: '16px', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 1.5rem', borderBottom: '1px solid #374151' }}>
            <span style={{ fontWeight: 700 }}>SRT Splitter</span>
            <button onClick={() => document.getElementById('srt-tool-modal')?.classList.add('hidden')}
              style={{ background: 'none', border: 'none', color: '#9ca3af', cursor: 'pointer', fontSize: '1.2rem' }}>✕</button>
          </div>
          {/* Embed React SRT component via iframe pointing to its own route */}
          <iframe src="/srt-tool" style={{ flex: 1, border: 'none' }} title="SRT Splitter" />
        </div>
      </div>

      {/* Command Console */}
      <div id="cmd-console" className="hidden" style={{ position: 'fixed', bottom: '1rem', left: '1rem', width: '560px', background: '#0f172a', border: '1px solid #334155', borderRadius: '12px', zIndex: 800, fontFamily: 'Fira Code, monospace', fontSize: '.8rem', overflow: 'hidden' }}>
        <div id="cmd-header" style={{ padding: '.5rem 1rem', background: '#1e293b', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'move', borderBottom: '1px solid #334155' }}>
          <span style={{ color: '#10b981', fontWeight: 700 }}>⌨ Command Console</span>
          <div style={{ display: 'flex', gap: '.5rem' }}>
            <button id="cmd-minimize" style={iconBtn}>─</button>
            <button id="cmd-close" style={iconBtn}>✕</button>
          </div>
        </div>
        <div style={{ padding: '1rem', color: '#94a3b8', maxHeight: '300px', overflowY: 'auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem', marginBottom: '1rem' }}>
            <span style={{ color: '#10b981' }}>❯</span>
            <span id="cmd-buffer" style={{ color: '#fff', minWidth: '2px' }} />
            <span style={{ color: '#10b981' }}>█</span>
          </div>
        </div>
      </div>

      {/* CMD Minimized */}
      <div id="cmd-minimized" className="hidden" style={{ position: 'fixed', bottom: '1rem', left: '1rem', zIndex: 800 }}>
        <button style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', padding: '.5rem 1rem', color: '#10b981', cursor: 'pointer', fontFamily: 'Fira Code, monospace', fontSize: '.8rem' }}>⌨ CMD</button>
      </div>

      {/* Hidden plan upload input (used by EditorHeader) */}
      <input type="file" id="header-plan-upload" accept=".json" style={{ display: 'none' }} />
    </>
  );
}

/* ── Styles ─────────────────────────────────────────── */
const ctxStyle: React.CSSProperties = { position: 'fixed', zIndex: 1000, background: '#1f2937', border: '1px solid #374151', borderRadius: '8px', padding: '.25rem', minWidth: '160px', boxShadow: '0 10px 30px rgba(0,0,0,.5)' };
const ctxItem: React.CSSProperties  = { padding: '.5rem .75rem', fontSize: '.82rem', cursor: 'pointer', borderRadius: '6px', color: '#d1d5db', display: 'flex', alignItems: 'center' };
const overlayStyle: React.CSSProperties = { position: 'fixed', inset: 0, zIndex: 900, background: 'rgba(0,0,0,.8)', display: 'flex', alignItems: 'center', justifyContent: 'center' };
const modalBox: React.CSSProperties = { background: '#1f2937', border: '1px solid #374151', borderRadius: '16px', padding: '2rem', width: '600px', maxWidth: '90vw' };
const closeBtn: React.CSSProperties = { padding: '.5rem 1rem', background: 'rgba(255,255,255,.08)', border: '1px solid rgba(255,255,255,.1)', borderRadius: '8px', color: '#fff', cursor: 'pointer', fontFamily: 'Cairo, sans-serif' };
const iconBtn: React.CSSProperties  = { background: 'none', border: 'none', color: '#9ca3af', cursor: 'pointer', fontSize: '1rem' };
