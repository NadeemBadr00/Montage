import { useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AppLayout from '../components/AppLayout';
import { useFileStore } from '../hooks/useFileStore';

export default function Startup() {
  const navigate  = useNavigate();
  const { save, remove } = useFileStore();

  const [file, setFile]           = useState<File | null>(null);
  const [srtFile, setSrtFile]     = useState<File | null>(null);
  const [planFile, setPlanFile]   = useState<File | null>(null);
  const [dragOver, setDragOver]   = useState(false);
  const [apiKey, setApiKey]       = useState('');
  const [aiEnabled, setAiEnabled] = useState(true);
  const [autoSrt, setAutoSrt]     = useState(true);
  const [error, setError]         = useState(false);
  const [saving, setSaving]       = useState(false);
  const videoRef = useRef<HTMLInputElement>(null);
  const srtRef   = useRef<HTMLInputElement>(null);
  const planRef  = useRef<HTMLInputElement>(null);

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault(); setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f?.type.startsWith('video/')) setFile(f);
  };

  const startProject = async (mode: 'manual' | 'sandwich') => {
    if (!file) { setError(true); return; }
    setSaving(true);
    try {
      await save('p43_video', file);
      srtFile  ? await save('p43_srt', srtFile)   : await remove('p43_srt');
      planFile ? await save('p43_plan', planFile)  : await remove('p43_plan');
      sessionStorage.setItem('p43_settings', JSON.stringify({
        mode, apiKey, aiEnabled, hasSRT: !!srtFile, hasPlan: !!planFile,
        autoTranscribe: autoSrt && !srtFile, videoName: file.name,
      }));
      navigate('/editor');
    } catch { setSaving(false); alert('حدث خطأ. حاول مرة أخرى.'); }
  };

  return (
    <AppLayout showTopbar={false}>
      {saving && <SavingOverlay />}
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '2rem 1rem', position: 'relative', zIndex: 1 }}>
        <div className="startup-card">

          {/* Title */}
          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <div className="startup-tag">
              <i className="fa-solid fa-wand-magic-sparkles" style={{ color: '#818cf8', fontSize: '.75rem' }} />
              <span>مشروع جديد</span>
            </div>
            <h1 style={{ fontSize: '1.8rem', fontWeight: 900, color: '#fff', margin: '.5rem 0' }}>
              مرحباً في <span style={{ background: 'linear-gradient(to right, #818cf8, #a78bfa)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Project 43 AI</span>
            </h1>
            <p style={{ color: 'var(--tx2)', fontSize: '.87rem' }}>ابدأ مشروع المونتاج الخاص بك بتقنيات الذكاء الاصطناعي</p>
          </div>

          {/* Upload Zone */}
          <UploadZone file={file} dragOver={dragOver} inputRef={videoRef}
            onDragOver={e => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={onDrop}
            onClick={() => videoRef.current?.click()}
            onFileChange={f => { setFile(f); setError(false); }}
          />
          <input ref={videoRef} type="file" accept="video/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) { setFile(f); setError(false); } }} />

          {/* API Key */}
          <div style={{ marginBottom: '1.25rem' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '.5rem', fontSize: '.78rem', color: 'var(--tx2)', marginBottom: '.5rem' }}>
              <i className="fa-solid fa-key" style={{ color: '#f59e0b' }} /> مفتاح Gemini API
              <span style={{ background: 'rgba(255,255,255,.06)', borderRadius: '4px', padding: '.1em .4em', fontSize: '.68rem' }}>اختياري</span>
            </label>
            <input type="text" value={apiKey} onChange={e => setApiKey(e.target.value)}
              placeholder="AIzaSy..."
              style={{ width: '100%', background: 'rgba(15,23,42,.8)', border: '1px solid rgba(71,85,105,.5)', borderRadius: '10px', padding: '.65rem 1rem', color: '#fff', fontSize: '.85rem', fontFamily: 'Fira Code, monospace', boxSizing: 'border-box' }}
            />
          </div>

          {/* AI Options */}
          <AIOptions aiEnabled={aiEnabled} setAiEnabled={setAiEnabled}
            autoSrt={autoSrt} setAutoSrt={setAutoSrt}
            hasSrt={!!srtFile}
            srtRef={srtRef} planRef={planRef}
            srtFile={srtFile} planFile={planFile}
            onSrtChange={f => setSrtFile(f)}
            onPlanChange={f => setPlanFile(f)}
          />
          <input ref={srtRef}  type="file" accept=".srt"  className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) setSrtFile(f); }} />
          <input ref={planRef} type="file" accept=".json" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) setPlanFile(f); }} />

          {/* Error Message */}
          {error && <p style={{ color: '#ef4444', fontSize: '.8rem', fontWeight: 700, textAlign: 'center', marginTop: '.5rem' }}><i className="fa-solid fa-circle-exclamation" /> يرجى رفع فيديو أولاً!</p>}

          {/* Mode Buttons */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '.75rem', marginBottom: '1rem' }}>
            <ModeButton id="btn-manual" icon="fa-sliders" title="مونتاج يدوي"
              desc="تراك فيديو واحد + صوت، تحكم كامل"
              onClick={() => startProject('manual')} variant="default" />
            <ModeButton id="btn-sandwich" icon="fa-layer-group" title="مونتاج سندوتش"
              badge="AI" desc="طبقات تلقائية + تأثيرات، مثالي للكونتنت"
              onClick={() => startProject('sandwich')} variant="ai" />
          </div>

          {error && (
            <p style={{ color: '#f87171', fontSize: '.8rem', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '.4rem', marginBottom: '1rem' }}>
              <i className="fa-solid fa-circle-exclamation" /> يرجى رفع ملف فيديو أولاً
            </p>
          )}

          {/* Tools */}
          <div style={{ borderTop: '1px solid var(--bd)', paddingTop: '1.25rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '.75rem' }}>
            <Link to="/analysis" className="tool-card-sm">
              <i className="fa-solid fa-microchip" style={{ color: '#3b82f6' }} />
              <div><p style={{ color: '#fff', fontSize: '.8rem', fontWeight: 700 }}>تحليل الفيديو</p><p style={{ color: 'var(--tx3)', fontSize: '.7rem' }}>استخراج الستايل</p></div>
            </Link>
            <Link to="/style-transfer" className="tool-card-sm">
              <i className="fa-solid fa-wand-magic-sparkles" style={{ color: '#f43f5e' }} />
              <div><p style={{ color: '#fff', fontSize: '.8rem', fontWeight: 700 }}>نقل الستايل</p><p style={{ color: 'var(--tx3)', fontSize: '.7rem' }}>تطبيق ستايل مخصص</p></div>
            </Link>
          </div>

        </div>
      </div>
      <style>{startupCSS}</style>
    </AppLayout>
  );
}

/* ── Sub-components ──────────────────────────────────── */

function SavingOverlay() {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(2,8,23,.95)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1rem' }}>
      <div className="startup-spinner" />
      <p style={{ color: '#818cf8', fontWeight: 700 }}>جارٍ تحميل المشروع...</p>
      <p style={{ color: 'var(--tx3)', fontSize: '.85rem' }}>يتم حفظ الفيديو وتجهيز المحرر</p>
    </div>
  );
}

interface UploadZoneProps {
  file: File | null; dragOver: boolean;
  inputRef: React.RefObject<HTMLInputElement | null>;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: () => void;
  onDrop: (e: React.DragEvent) => void;
  onClick: () => void;
  onFileChange: (f: File) => void;
}

function UploadZone({ file, dragOver, onDragOver, onDragLeave, onDrop, onClick }: UploadZoneProps) {
  return (
    <div
      className={`upload-zone${dragOver ? ' drag-over' : ''}${file ? ' has-file' : ''}`}
      onClick={onClick}
      onDragOver={onDragOver} onDragLeave={onDragLeave} onDrop={onDrop}
      style={{ marginBottom: '1.25rem' }}
    >
      {file ? (
        <>
          <div className="upload-icon" style={{ background: 'rgba(16,185,129,.1)', border: '1px solid rgba(16,185,129,.2)' }}>
            <i className="fa-solid fa-circle-check" style={{ color: '#10b981', fontSize: '1.5rem' }} />
          </div>
          <p style={{ color: '#10b981', fontWeight: 700, marginBottom: '.25rem' }}>{file.name}</p>
          <p style={{ color: 'var(--tx3)', fontSize: '.75rem' }}>{(file.size / 1024 / 1024).toFixed(1)} MB · اضغط لتغيير</p>
        </>
      ) : (
        <>
          <div className="upload-icon"><i className="fa-solid fa-cloud-arrow-up" style={{ color: '#818cf8', fontSize: '1.5rem' }} /></div>
          <p style={{ color: '#fff', fontWeight: 700, marginBottom: '.25rem' }}>اسحب الفيديو هنا أو اضغط للاختيار</p>
          <p style={{ color: 'var(--tx3)', fontSize: '.75rem' }}>MP4 · MOV · WebM · AVI · MKV</p>
        </>
      )}
    </div>
  );
}

interface AIOptionsProps {
  aiEnabled: boolean; setAiEnabled: (v: boolean) => void;
  autoSrt: boolean; setAutoSrt: (v: boolean) => void;
  hasSrt: boolean;
  srtRef: React.RefObject<HTMLInputElement | null>;
  planRef: React.RefObject<HTMLInputElement | null>;
  srtFile: File | null; planFile: File | null;
  onSrtChange: (f: File) => void; onPlanChange: (f: File) => void;
}

function AIOptions({ aiEnabled, setAiEnabled, autoSrt, setAutoSrt, hasSrt, srtRef, planRef, srtFile, planFile }: AIOptionsProps) {
  return (
    <div className="ai-options-box" style={{ marginBottom: '1.25rem' }}>
      <p style={{ fontSize: '.75rem', fontWeight: 700, color: 'var(--tx2)', display: 'flex', alignItems: 'center', gap: '.5rem', marginBottom: '.75rem' }}>
        <i className="fa-solid fa-sliders" style={{ color: 'var(--p2)' }} /> خيارات الذكاء الاصطناعي
      </p>
      <label className="ai-toggle-row">
        <div style={{ display: 'flex', alignItems: 'center', gap: '.75rem' }}>
          <div style={{ width: '32px', height: '32px', background: 'rgba(139,92,246,.1)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <i className="fa-solid fa-sparkles" style={{ color: '#a78bfa', fontSize: '.8rem' }} />
          </div>
          <div><p style={{ color: '#fff', fontSize: '.85rem', fontWeight: 700 }}>مساعد Gemini</p><p style={{ color: 'var(--tx3)', fontSize: '.7rem' }}>Chat + Plan + ترجمة تلقائية</p></div>
        </div>
        <input type="checkbox" checked={aiEnabled} onChange={e => setAiEnabled(e.target.checked)} style={{ accentColor: '#6366f1' }} />
      </label>
      <label style={{ display: 'flex', alignItems: 'center', gap: '.75rem', padding: '.5rem .75rem', borderRadius: '10px', cursor: 'pointer' }}>
        <input type="checkbox" checked={autoSrt && !hasSrt} disabled={hasSrt || !aiEnabled}
          onChange={e => setAutoSrt(e.target.checked)} style={{ accentColor: '#6366f1' }} />
        <div><p style={{ color: 'var(--tx2)', fontSize: '.8rem', fontWeight: 700 }}>استخراج الترجمة تلقائياً</p><p style={{ color: 'var(--tx3)', fontSize: '.7rem' }}>Gemini + تحميل تلقائي للـ SRT</p></div>
      </label>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '.5rem', marginTop: '.5rem' }}>
        <button onClick={() => srtRef.current?.click()} className="file-btn">
          <i className="fa-solid fa-file-arrow-up" style={{ color: '#f59e0b' }} />
          {srtFile ? `✓ ${srtFile.name}` : 'ملف SRT'}
        </button>
        <button onClick={() => planRef.current?.click()} className="file-btn file-btn-purple">
          <i className="fa-solid fa-map" style={{ color: '#a78bfa' }} />
          {planFile ? `✓ ${planFile.name}` : 'ملف خطة JSON'}
        </button>
        <Link to="/srt" className="file-btn file-btn-teal">
          <i className="fa-solid fa-scissors" style={{ color: '#14b8a6' }} /> أداة تقسيم SRT
        </Link>
      </div>
    </div>
  );
}

interface ModeButtonProps {
  id: string; icon: string; title: string;
  desc: string; badge?: string;
  onClick: () => void; variant: 'default' | 'ai';
}

function ModeButton({ id, icon, title, desc, badge, onClick, variant }: ModeButtonProps) {
  const isAi = variant === 'ai';
  return (
    <button id={id} onClick={onClick} className={`mode-btn ${isAi ? 'mode-btn-ai' : 'mode-btn-default'}`}>
      <div className={`mode-icon ${isAi ? 'mode-icon-ai' : ''}`}>
        <i className={`fa-solid ${icon}`} style={{ color: isAi ? '#fff' : 'var(--tx2)' }} />
      </div>
      <h3 style={{ color: '#fff', fontWeight: 700, fontSize: '.88rem', marginBottom: '.25rem' }}>
        {title} {badge && <span style={{ fontSize: '.6rem', background: '#6366f1', borderRadius: '3px', padding: '.1em .35em', verticalAlign: 'middle' }}>{badge}</span>}
      </h3>
      <p style={{ color: isAi ? 'rgba(165,180,252,.7)' : 'var(--tx3)', fontSize: '.72rem', lineHeight: 1.5 }}>{desc}</p>
    </button>
  );
}

const startupCSS = `
.startup-card { background: rgba(15,23,42,.85); backdrop-filter: blur(20px); border: 1px solid rgba(99,102,241,.2); box-shadow: 0 0 80px rgba(99,102,241,.08),0 25px 50px rgba(0,0,0,.5); border-radius: 24px; padding: 2rem; width: 100%; max-width: 640px; }
.startup-tag { display: inline-flex; align-items: center; gap: .5rem; background: rgba(99,102,241,.1); border: 1px solid rgba(99,102,241,.2); border-radius: 999px; padding: .3rem .9rem; font-size: .75rem; color: var(--p2); margin-bottom: .75rem; }
.upload-zone { border: 2px dashed rgba(99,102,241,.3); background: rgba(99,102,241,.03); border-radius: 16px; padding: 2rem; text-align: center; cursor: pointer; transition: all .3s; }
.upload-zone:hover, .upload-zone.drag-over { border-color: #6366f1; background: rgba(99,102,241,.08); transform: translateY(-2px); box-shadow: 0 8px 30px rgba(99,102,241,.15); }
.upload-zone.has-file { border-color: #10b981; background: rgba(16,185,129,.05); }
.upload-icon { width: 56px; height: 56px; background: rgba(99,102,241,.1); border: 1px solid rgba(99,102,241,.2); border-radius: 14px; display: flex; align-items: center; justify-content: center; margin: 0 auto 1rem; }
.ai-options-box { background: rgba(30,41,59,.4); border: 1px solid rgba(71,85,105,.4); border-radius: 16px; padding: 1rem; }
.ai-toggle-row { display: flex; align-items: center; justify-content: space-between; padding: .75rem; background: rgba(15,23,42,.5); border-radius: 12px; border: 1px solid rgba(71,85,105,.5); margin-bottom: .75rem; cursor: pointer; }
.file-btn { display: inline-flex; align-items: center; gap: .5rem; background: rgba(71,85,105,.5); border: 1px solid rgba(71,85,105,.5); color: var(--tx2); font-size: .75rem; padding: .45rem .85rem; border-radius: 10px; transition: all .2s; cursor: pointer; font-family: Cairo, sans-serif; }
.file-btn:hover { background: rgba(71,85,105,.8); color: #fff; }
.file-btn-purple { background: rgba(139,92,246,.1); border-color: rgba(139,92,246,.2); color: #a78bfa; }
.file-btn-teal { background: rgba(20,184,166,.1); border-color: rgba(20,184,166,.2); color: #14b8a6; text-decoration: none; }
.mode-btn { padding: 1rem; border-radius: 16px; text-align: right; cursor: pointer; transition: all .3s; border: none; width: 100%; font-family: Cairo, sans-serif; }
.mode-btn:hover { transform: translateY(-3px); }
.mode-btn-default { background: rgba(30,41,59,.6); border: 1px solid rgba(71,85,105,.6); }
.mode-btn-default:hover { background: rgba(30,41,59,.8); border-color: rgba(71,85,105,1); }
.mode-btn-ai { background: linear-gradient(135deg,rgba(67,56,202,.8),rgba(109,40,217,.8)); border: 1px solid rgba(99,102,241,.3); }
.mode-btn-ai:hover { border-color: rgba(99,102,241,.6); }
.mode-icon { width: 40px; height: 40px; background: rgba(71,85,105,.5); border-radius: 10px; display: flex; align-items: center; justify-content: center; margin-bottom: .75rem; }
.mode-icon-ai { background: #6366f1; box-shadow: 0 0 20px rgba(99,102,241,.4); }
.tool-card-sm { display: flex; align-items: center; gap: .75rem; background: rgba(30,41,59,.5); border: 1px solid rgba(71,85,105,.4); border-radius: 12px; padding: .75rem; text-decoration: none; transition: all .25s; }
.tool-card-sm:hover { border-color: rgba(99,102,241,.4); transform: translateY(-2px); }
.startup-spinner { width: 56px; height: 56px; border: 3px solid rgba(99,102,241,.2); border-top-color: #6366f1; border-radius: 50%; animation: spin .8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
.hidden { display: none; }
`;
