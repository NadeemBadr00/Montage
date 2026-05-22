import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import EditorHeader from './EditorHeader';
import EditorLoading from './EditorLoading';
import EditorLayout from './EditorLayout';
import { useEditorInit } from './useEditorInit';

export default function Editor() {
  const { userData } = useAuth();
  const navigate = useNavigate();
  const loadingRef = useRef<HTMLDivElement>(null);
  const { loading, loadingStatus } = useEditorInit({ navigate, loadingRef });

  return (
    <div style={{ background: '#111827', color: '#fff', minHeight: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', fontFamily: 'Cairo, sans-serif' }}>

      {/* Loading overlay */}
      {loading && <EditorLoading ref={loadingRef} status={loadingStatus} />}

      {/* Header */}
      <EditorHeader userData={userData} />

      {/* Main Editor Layout */}
      <EditorLayout />

      {/* Modals & Overlays */}
      <EditorModals />

      {/* Load external JS engines */}
      <EditorScripts />
    </div>
  );
}

function EditorModals() {
  return (
    <>
      {/* Context Menu */}
      <div id="context-menu" className="hidden" style={{ position: 'fixed', zIndex: 1000, background: '#1f2937', border: '1px solid #374151', borderRadius: '8px', padding: '.25rem', minWidth: '160px', boxShadow: '0 10px 30px rgba(0,0,0,.5)' }}>
        <div id="ctx-transcribe" className="hidden ctx-item"><i className="fa-solid fa-closed-captioning" style={{ color: '#10b981' }} /> استخراج نص</div>
        <div id="ctx-ripple" className="ctx-item"><i className="fa-solid fa-scissors" style={{ color: '#f59e0b' }} /> Ripple Delete</div>
        <div id="ctx-delete" className="ctx-item" style={{ color: '#f87171' }}><i className="fa-solid fa-trash" /> حذف</div>
      </div>

      {/* Export Modal */}
      <div id="export-modal" className="hidden" style={{ position: 'fixed', inset: 0, zIndex: 900, background: 'rgba(0,0,0,.8)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ background: '#1f2937', border: '1px solid #374151', borderRadius: '16px', padding: '2rem', width: '600px', maxWidth: '90vw' }}>
          <h2 style={{ fontWeight: 700, marginBottom: '1rem', color: '#10b981' }}>✅ XML Ready</h2>
          <pre id="xml-preview" style={{ background: '#111827', borderRadius: '8px', padding: '1rem', fontSize: '.75rem', overflow: 'auto', maxHeight: '300px', color: '#94a3b8' }} />
          <div style={{ display: 'flex', gap: '.75rem', marginTop: '1rem' }}>
            <button onClick={() => document.getElementById('export-modal')?.classList.add('hidden')}
              style={{ padding: '.5rem 1rem', background: 'rgba(255,255,255,.08)', border: '1px solid rgba(255,255,255,.1)', borderRadius: '8px', color: '#fff', cursor: 'pointer', fontFamily: 'Cairo, sans-serif' }}>
              إغلاق
            </button>
            <a id="download-link" style={{ padding: '.5rem 1rem', background: '#10b981', borderRadius: '8px', color: '#fff', textDecoration: 'none', fontWeight: 700 }}>
              ⬇ تحميل XML
            </a>
          </div>
        </div>
      </div>

      {/* SRT Tool Modal */}
      <div id="srt-tool-modal" className="hidden" style={{ position: 'fixed', inset: 0, zIndex: 900, background: 'rgba(0,0,0,.8)' }}>
        <div style={{ position: 'absolute', top: '5%', left: '5%', right: '5%', bottom: '5%', background: '#1f2937', borderRadius: '16px', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 1.5rem', borderBottom: '1px solid #374151' }}>
            <span style={{ fontWeight: 700 }}>SRT Splitter</span>
            <button onClick={() => document.getElementById('srt-tool-modal')?.classList.add('hidden')}
              style={{ background: 'none', border: 'none', color: '#9ca3af', cursor: 'pointer', fontSize: '1.2rem' }}>✕</button>
          </div>
          <iframe src="/srt.html" style={{ flex: 1, border: 'none' }} title="SRT Splitter" />
        </div>
      </div>

      {/* Command Console */}
      <div id="cmd-console" className="hidden" style={{ position: 'fixed', bottom: '1rem', left: '1rem', width: '560px', background: '#0f172a', border: '1px solid #334155', borderRadius: '12px', zIndex: 800, fontFamily: 'Fira Code, monospace', fontSize: '.8rem', overflow: 'hidden' }}>
        <div id="cmd-header" style={{ padding: '.5rem 1rem', background: '#1e293b', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'move', borderBottom: '1px solid #334155' }}>
          <span style={{ color: '#10b981', fontWeight: 700 }}>⌨ Command Console</span>
          <div style={{ display: 'flex', gap: '.5rem' }}>
            <button id="cmd-minimize" style={{ background: 'none', border: 'none', color: '#9ca3af', cursor: 'pointer' }}>─</button>
            <button id="cmd-close" style={{ background: 'none', border: 'none', color: '#9ca3af', cursor: 'pointer' }}>✕</button>
          </div>
        </div>
        <div style={{ padding: '1rem', color: '#94a3b8', maxHeight: '300px', overflowY: 'auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem', marginBottom: '1rem' }}>
            <span style={{ color: '#10b981' }}>❯</span>
            <span id="cmd-buffer" style={{ color: '#fff', minWidth: '2px' }} />
            <span style={{ animation: 'blink 1s step-end infinite', color: '#10b981' }}>█</span>
          </div>
        </div>
      </div>

      {/* CMD minimized button */}
      <div id="cmd-minimized" className="hidden" style={{ position: 'fixed', bottom: '1rem', left: '1rem', zIndex: 800 }}>
        <button style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', padding: '.5rem 1rem', color: '#10b981', cursor: 'pointer', fontFamily: 'Fira Code, monospace', fontSize: '.8rem' }}>
          ⌨ CMD
        </button>
      </div>
    </>
  );
}

function EditorScripts() {
  useEffect(() => {
    const scripts = [
      '/js/core/file_store.js',
      '/js/core/editing_engine.js',
      '/js/core/assets.js',
      '/js/core/timeline.js',
      '/js/core/video_preview.js',
      '/js/features/command_center.js',
      '/js/features/xml_exporter.js',
      '/js/features/pro_features.js',
      '/js/features/ultra_features.js',
      '/js/features/frame_features.js',
      '/js/features/bubble_feature.js',
      '/js/features/grid_feature.js',
    ];
    const moduleScripts = [
      '/js/ai/gemini_chat.js',
      '/js/ai/gemini_plan.js',
      '/js/ai/ai.js',
    ];

    const loaded: HTMLScriptElement[] = [];

    scripts.forEach(src => {
      const s = document.createElement('script');
      s.src = src; s.async = false;
      document.body.appendChild(s);
      loaded.push(s);
    });
    moduleScripts.forEach(src => {
      const s = document.createElement('script');
      s.src = src; s.type = 'module';
      document.body.appendChild(s);
      loaded.push(s);
    });

    return () => { loaded.forEach(s => s.remove()); };
  }, []);

  return null;
}
