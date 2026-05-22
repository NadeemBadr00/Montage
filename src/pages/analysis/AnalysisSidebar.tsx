import type { RefObject } from 'react';

const DEFAULT_KEYS = `AIzaSyDxVh9Y2JZkLmN1pQwRsT8uVoXyAeD3fG4
AIzaSyEyWi7Z3KAoMnO2qRxStU9vWpYzBfE4gH5
AIzaSyFzXj8A4LBpNoP3rSyTuV0wXqZaCgF5hI6
AIzaSyGaBk9B5MCqOpQ4sTzUvW1xYrAbDhG6iJ7
AIzaSyHbCl0C6NDrPqR5tUaVwX2yZsBiEiH7jK8
AIzaSyIcDm1D7OEsQrS6uVbWxY3zAtCjFjI8kL9
AIzaSyJdEn2E8PFtRsT7vWcXyZ4aBuDkGkJ9lM0
AIzaSyKeFo3F9QGuStU8wXdYzA5bCvElHlK0mN1
AIzaSyLfGp4G0RHvTuV9xYeZaB6cDwFmImL1nO2
AIzaSyMgHq5H1SIwUvW0yZfAbC7dExGnJnM2oP3`;

interface Props {
  apiKeys: string[]; setApiKeys: (k: string[]) => void;
  selectedFile: File | null; setSelectedFile: (f: File | null) => void;
  transcript: string; setTranscript: (t: string) => void;
  modelName: string; setModelName: (m: string) => void;
  hiddenVideoRef: RefObject<HTMLVideoElement | null>;
  onDurationLoad: (d: number) => void;
  onStart: () => void; running: boolean;
  onDownload: () => void; hasResults: boolean;
  logLines: string[];
  accentColor: string;
  styleRef?: string; setStyleRef?: (s: string) => void;
  wide?: boolean;
}

export default function AnalysisSidebar({
  apiKeys, setApiKeys, selectedFile, setSelectedFile,
  transcript, setTranscript, modelName, setModelName,
  hiddenVideoRef, onDurationLoad, onStart, running,
  onDownload, hasResults, logLines, accentColor,
  styleRef, setStyleRef, wide,
}: Props) {
  const sideW = wide ? '384px' : '320px';

  const parseKeys = (raw: string) => {
    const keys = raw.split('\n').map(k => k.trim()).filter(k => k.startsWith('AIza'));
    setApiKeys(keys);
    return keys;
  };

  return (
    <aside style={{ width: sideW, background: 'rgba(30,41,59,.3)', borderLeft: '1px solid #374151', display: 'flex', flexDirection: 'column', overflow: 'auto', flexShrink: 0, padding: '1rem', gap: '1rem' }}>

      {/* API Keys */}
      <Section title="مفاتيح API" icon="fa-key">
        <textarea
          defaultValue={DEFAULT_KEYS}
          onChange={e => parseKeys(e.target.value)}
          style={{ width: '100%', height: '120px', background: '#0f172a', border: '1px solid #374151', borderRadius: '8px', padding: '.5rem', color: '#94a3b8', fontSize: '.7rem', fontFamily: 'Fira Code, monospace', resize: 'vertical', boxSizing: 'border-box' }}
        />
        <p style={{ fontSize: '.72rem', color: '#6b7280' }}>
          {apiKeys.length} مفتاح نشط
        </p>
      </Section>

      {/* Style Reference (StyleTransfer only) */}
      {setStyleRef !== undefined && (
        <Section title="الستايل المرجعي" icon="fa-wand-magic-sparkles">
          <textarea
            value={styleRef}
            onChange={e => setStyleRef(e.target.value)}
            placeholder="انسخ هنا خطة التنفيذ من تحليل الفيديو السابق..."
            style={{ width: '100%', height: '160px', background: '#0f172a', border: `1px solid ${accentColor}44`, borderRadius: '8px', padding: '.5rem', color: '#e2e8f0', fontSize: '.78rem', resize: 'vertical', boxSizing: 'border-box' }}
          />
          {(styleRef?.length || 0) > 50 && (
            <p style={{ fontSize: '.72rem', color: '#10b981' }}>✅ تم حفظ الستايل المرجعي</p>
          )}
        </Section>
      )}

      {/* Video Upload */}
      <Section title="رفع الفيديو" icon="fa-video">
        <label style={{ display: 'block', padding: '.75rem', background: 'rgba(255,255,255,.04)', border: `1px dashed ${accentColor}66`, borderRadius: '8px', cursor: 'pointer', textAlign: 'center', fontSize: '.8rem', color: '#9ca3af' }}>
          {selectedFile ? `✅ ${selectedFile.name}` : 'اضغط لرفع ملف فيديو'}
          <input type="file" accept="video/*" style={{ display: 'none' }}
            onChange={e => {
              const f = e.target.files?.[0];
              if (!f) return;
              setSelectedFile(f);
              if (hiddenVideoRef.current) {
                hiddenVideoRef.current.src = URL.createObjectURL(f);
                hiddenVideoRef.current.onloadedmetadata = () => onDurationLoad(hiddenVideoRef.current?.duration || 0);
              }
            }}
          />
        </label>
      </Section>

      {/* Transcript Upload */}
      <Section title="ملف الترجمة (اختياري)" icon="fa-closed-captioning">
        <label style={{ display: 'block', padding: '.5rem .75rem', background: 'rgba(255,255,255,.04)', border: '1px dashed #374151', borderRadius: '8px', cursor: 'pointer', fontSize: '.78rem', color: '#9ca3af' }}>
          {transcript ? '✅ تم تحميل الترجمة' : 'SRT / VTT / TXT'}
          <input type="file" accept=".srt,.vtt,.txt" style={{ display: 'none' }}
            onChange={e => {
              const f = e.target.files?.[0];
              if (!f) return;
              const r = new FileReader();
              r.onload = ev => setTranscript(ev.target?.result as string);
              r.readAsText(f);
            }}
          />
        </label>
      </Section>

      {/* Model */}
      <Section title="الموديل" icon="fa-microchip">
        <input value={modelName} onChange={e => setModelName(e.target.value)}
          style={{ width: '100%', background: '#0f172a', border: '1px solid #374151', borderRadius: '8px', padding: '.4rem .75rem', color: '#e2e8f0', fontSize: '.82rem', boxSizing: 'border-box' }}
        />
      </Section>

      {/* Start Button */}
      <button onClick={onStart} disabled={running}
        style={{ width: '100%', background: running ? '#374151' : accentColor, color: '#fff', fontWeight: 700, padding: '.85rem', borderRadius: '10px', border: 'none', cursor: running ? 'not-allowed' : 'pointer', fontSize: '.9rem', fontFamily: 'Cairo, sans-serif', transition: 'all .2s' }}>
        {running ? '⏳ جارٍ التحليل...' : '🚀 بدء التحليل'}
      </button>

      {hasResults && (
        <button onClick={onDownload}
          style={{ width: '100%', background: '#10b981', color: '#fff', fontWeight: 700, padding: '.7rem', borderRadius: '10px', border: 'none', cursor: 'pointer', fontSize: '.85rem', fontFamily: 'Cairo, sans-serif' }}>
          ⬇ تحميل التقرير
        </button>
      )}

      {/* Log */}
      <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: '8px', padding: '.5rem', height: '120px', overflow: 'auto', fontFamily: 'Fira Code, monospace', fontSize: '.68rem', color: '#10b981' }}>
        {logLines.map((l, i) => <div key={i}>{l}</div>)}
      </div>
    </aside>
  );
}

function Section({ title, icon, children }: { title: string; icon: string; children: React.ReactNode }) {
  return (
    <div>
      <p style={{ display: 'flex', alignItems: 'center', gap: '.4rem', fontSize: '.75rem', fontWeight: 700, color: '#9ca3af', marginBottom: '.5rem' }}>
        <i className={`fa-solid ${icon}`} /> {title}
      </p>
      {children}
    </div>
  );
}
