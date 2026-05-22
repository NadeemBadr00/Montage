import type { ChunkCard } from './types';
import { formatTime } from './analysisUtils';

interface Props { chunks: ChunkCard[]; accentColor: string; }

export default function ChunksGrid({ chunks, accentColor }: Props) {
  if (!chunks.length) {
    return (
      <section style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#4b5563' }}>
        <div style={{ textAlign: 'center' }}>
          <i className="fa-solid fa-film" style={{ fontSize: '3rem', marginBottom: '1rem', color: '#1e293b' }} />
          <p style={{ fontWeight: 700 }}>ارفع فيديو وابدأ التحليل</p>
          <p style={{ fontSize: '.85rem', marginTop: '.25rem' }}>سيتم تقسيم الفيديو إلى chunks وتحليل كل واحد</p>
        </div>
      </section>
    );
  }

  return (
    <section style={{ flex: 1, overflow: 'auto', padding: '1.5rem', background: 'rgba(17,24,39,.5)' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {chunks.map(chunk => <ChunkCardView key={chunk.id} chunk={chunk} accentColor={accentColor} />)}
      </div>
    </section>
  );
}

function ChunkCardView({ chunk, accentColor }: { chunk: ChunkCard; accentColor: string }) {
  const statusColor = { pending: '#4b5563', processing: accentColor, done: '#10b981', error: '#ef4444' }[chunk.status];
  const statusLabel = { pending: 'في الانتظار', processing: 'جارٍ التحليل...', done: 'اكتمل', error: 'خطأ' }[chunk.status];

  return (
    <div style={{ background: 'rgba(30,41,59,.7)', backdropFilter: 'blur(10px)', border: `1px solid ${chunk.status === 'done' ? accentColor + '44' : chunk.status === 'error' ? '#ef444444' : 'rgba(255,255,255,.1)'}`, borderRadius: '12px', padding: '1rem', transition: 'all .3s' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '.75rem' }}>
          <div style={{ width: '32px', height: '32px', background: `${statusColor}22`, border: `1px solid ${statusColor}44`, borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '.8rem', fontWeight: 700, color: statusColor }}>
            {chunk.id}
          </div>
          <span style={{ fontSize: '.85rem', color: '#94a3b8', fontFamily: 'Fira Code, monospace' }}>
            {formatTime(chunk.start)} → {formatTime(chunk.end)}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '.75rem' }}>
          {chunk.key && <span style={{ fontSize: '.7rem', color: '#6b7280' }}>{chunk.key}</span>}
          {chunk.execTime && <span style={{ fontSize: '.7rem', color: '#6b7280' }}>{chunk.execTime.toFixed(1)}s</span>}
          <span style={{ fontSize: '.75rem', color: statusColor, fontWeight: 700 }}>{statusLabel}</span>
        </div>
      </div>

      {/* Progress Bar */}
      {chunk.status === 'processing' && (
        <div style={{ background: '#1e293b', borderRadius: '4px', height: '4px', marginBottom: '.75rem', overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${chunk.progress}%`, background: accentColor, transition: 'width .3s', borderRadius: '4px' }} />
        </div>
      )}

      {/* Result */}
      {chunk.result && (
        <div style={{ background: 'rgba(0,0,0,.3)', borderRadius: '8px', padding: '.75rem', fontSize: '.82rem', color: '#d1d5db', lineHeight: 1.6, whiteSpace: 'pre-wrap', maxHeight: '200px', overflow: 'auto' }}>
          {chunk.result}
        </div>
      )}

      {/* Error */}
      {chunk.error && (
        <div style={{ background: 'rgba(239,68,68,.1)', borderRadius: '8px', padding: '.6rem .75rem', fontSize: '.8rem', color: '#fca5a5' }}>
          ❌ {chunk.error}
        </div>
      )}
    </div>
  );
}
