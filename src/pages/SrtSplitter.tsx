import { useState, useRef } from 'react';
import AppLayout from '../components/AppLayout';

// SRT utility functions
function timeToMs(t: string): number {
  const [time, ms] = t.trim().split(',');
  const [h, m, s]  = time.split(':').map(Number);
  return h * 3600000 + m * 60000 + s * 1000 + parseInt(ms || '0', 10);
}

function msToTime(d: number): string {
  const ms  = Math.floor(d % 1000).toString().padStart(3, '0');
  const s   = Math.floor(d / 1000 % 60).toString().padStart(2, '0');
  const m   = Math.floor(d / 60000 % 60).toString().padStart(2, '0');
  const h   = Math.floor(d / 3600000 % 24).toString().padStart(2, '0');
  return `${h}:${m}:${s},${ms}`;
}

interface SrtBlock { id: number; start: string; end: string; text: string; }

function splitSRT(content: string, limit: number): { blocks: SrtBlock[]; origCount: number } {
  const normalized = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const rawBlocks  = normalized.trim().split(/\n\n+/);
  const result: SrtBlock[] = [];
  let counter = 1;

  rawBlocks.forEach(block => {
    const lines  = block.split('\n');
    const tiIdx  = lines.findIndex(l => l.includes('-->'));
    if (tiIdx === -1) return;
    const timeLine  = lines[tiIdx];
    const textLines = lines.slice(tiIdx + 1).filter(l => l.trim());
    if (!textLines.length) return;
    const fullText  = textLines.join(' ').trim();
    const words     = fullText.split(/\s+/);
    const [s, e]    = timeLine.split(' --> ');
    const startMs   = timeToMs(s), endMs = timeToMs(e);
    const totalMs   = endMs - startMs;

    if (words.length <= limit) {
      result.push({ id: counter++, start: s, end: e, text: fullText });
      return;
    }
    const chunks: string[] = [];
    for (let i = 0; i < words.length; i += limit) chunks.push(words.slice(i, i + limit).join(' '));
    const durPerChunk = totalMs / chunks.length;
    let cur = startMs;
    chunks.forEach(txt => {
      const end = cur + durPerChunk;
      result.push({ id: counter++, start: msToTime(cur), end: msToTime(end), text: txt });
      cur = end;
    });
  });

  return { blocks: result, origCount: rawBlocks.length };
}

export default function SrtSplitter() {
  const [file, setFile]           = useState<File | null>(null);
  const [content, setContent]     = useState<string | null>(null);
  const [wordLimit, setWordLimit] = useState(3);
  const [outName, setOutName]     = useState('split_subtitle');
  const [result, setResult]       = useState<{ blocks: SrtBlock[]; origCount: number } | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const loadFile = (f: File) => {
    setFile(f); setResult(null);
    const reader = new FileReader();
    reader.onload = e => setContent(e.target?.result as string);
    reader.readAsText(f);
  };

  const process = () => {
    if (!content) return;
    setResult(splitSRT(content, wordLimit));
  };

  const download = () => {
    if (!result) return;
    const text = result.blocks.map(b => `${b.id}\n${b.start} --> ${b.end}\n${b.text}\n`).join('\n');
    const a    = document.createElement('a');
    a.href     = URL.createObjectURL(new Blob([text], { type: 'text/plain;charset=utf-8' }));
    a.download = outName.endsWith('.srt') ? outName : outName + '.srt';
    a.click(); URL.revokeObjectURL(a.href);
  };

  return (
    <AppLayout showTopbar={false}>
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem 1rem', background: '#f3f4f6' }}>
        <div style={{ background: '#fff', borderRadius: '16px', boxShadow: '0 10px 40px rgba(0,0,0,.1)', width: '100%', maxWidth: '640px', overflow: 'hidden' }}>

          {/* Header */}
          <div style={{ background: '#4f46e5', padding: '1.5rem', textAlign: 'center', color: '#fff' }}>
            <h1 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: '.5rem' }}>مقسم ملفات الترجمة الذكي 🎬</h1>
            <p style={{ fontSize: '.85rem', color: '#c7d2fe' }}>يقسم كل جملة طويلة إلى مقاطع صغيرة مع الحفاظ على التوقيت</p>
          </div>

          <div style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

            {/* Settings */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '.85rem', fontWeight: 600, color: '#374151', marginBottom: '.4rem' }}>أقصى عدد كلمات في السطر</label>
                <input type="number" value={wordLimit} min={1} max={10} onChange={e => setWordLimit(+e.target.value)}
                  style={{ width: '100%', padding: '.5rem 1rem', border: '1px solid #d1d5db', borderRadius: '8px', outline: 'none', boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '.85rem', fontWeight: 600, color: '#374151', marginBottom: '.4rem' }}>اسم الملف الجديد</label>
                <input type="text" value={outName} onChange={e => setOutName(e.target.value)}
                  style={{ width: '100%', padding: '.5rem 1rem', border: '1px solid #d1d5db', borderRadius: '8px', outline: 'none', boxSizing: 'border-box' }} />
              </div>
            </div>

            {/* Drop Zone */}
            <div
              onClick={() => inputRef.current?.click()}
              onDragOver={e => { e.preventDefault(); setDragActive(true); }}
              onDragLeave={() => setDragActive(false)}
              onDrop={e => { e.preventDefault(); setDragActive(false); const f = e.dataTransfer.files[0]; if (f) loadFile(f); }}
              style={{ border: `2px dashed ${dragActive ? '#4f46e5' : '#d1d5db'}`, background: dragActive ? '#eef2ff' : '#fff', borderRadius: '12px', padding: '2.5rem', textAlign: 'center', cursor: 'pointer', transition: 'all .2s' }}
            >
              <input ref={inputRef} type="file" accept=".srt" style={{ display: 'none' }} onChange={e => { const f = e.target.files?.[0]; if (f) loadFile(f); }} />
              <svg style={{ width: '48px', height: '48px', margin: '0 auto .75rem', color: dragActive ? '#4f46e5' : '#9ca3af', display: 'block' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              <p style={{ fontWeight: 600, color: '#374151' }}>اضغط لرفع ملف SRT أو اسحبه هنا</p>
              <p style={{ fontSize: '.8rem', color: '#9ca3af', marginTop: '.25rem' }}>{file ? `الملف: ${file.name}` : 'لم يتم اختيار ملف'}</p>
            </div>

            {/* Process Button */}
            <button onClick={process} disabled={!content}
              style={{ width: '100%', background: content ? '#4f46e5' : '#d1d5db', color: '#fff', fontWeight: 700, padding: '.85rem', borderRadius: '8px', border: 'none', cursor: content ? 'pointer' : 'not-allowed', fontSize: '1rem', transition: 'all .2s', fontFamily: 'Cairo, sans-serif' }}>
              بدء التقسيم والمعالجة ⚙️
            </button>

            {/* Result */}
            {result && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', padding: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '.75rem' }}>
                    <svg style={{ width: '24px', height: '24px', color: '#22c55e' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span style={{ color: '#15803d', fontWeight: 600 }}>تمت العملية بنجاح!</span>
                  </div>
                  <span style={{ fontSize: '.85rem', color: '#16a34a', fontWeight: 700 }}>
                    {result.origCount} جملة → {result.blocks.length} مقطع
                  </span>
                </div>
                <button onClick={download}
                  style={{ width: '100%', background: '#16a34a', color: '#fff', fontWeight: 700, padding: '.85rem', borderRadius: '8px', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '.5rem', fontFamily: 'Cairo, sans-serif' }}>
                  <svg style={{ width: '20px', height: '20px' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  تحميل الملف الجديد (.srt)
                </button>
              </div>
            )}

          </div>
        </div>
      </div>
    </AppLayout>
  );
}
