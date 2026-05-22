export default function EditorLayout() {
  return (
    <main style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

      {/* Top Panel: Preview + Tools */}
      <div id="top-panel" style={{ display: 'flex', height: '55%', flexShrink: 0 }}>

        {/* Player */}
        <div style={{ flex: 1, background: 'rgba(0,0,0,.5)', display: 'flex', flexDirection: 'column' }}>
          <div id="video-wrapper" style={{ flex: 1, position: 'relative', aspectRatio: '16/9', margin: 'auto', maxHeight: '100%' }}>
            <canvas id="preview-canvas" width={1920} height={1080} style={{ width: '100%', height: '100%', display: 'block' }} />
            <div id="jkl-overlay" style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none', opacity: 0 }}>
              <span style={{ fontSize: '2rem', fontWeight: 900, color: '#fff', textShadow: '0 2px 10px rgba(0,0,0,.8)' }} />
            </div>
            <div id="ai-loading" className="hidden" style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,.7)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ width: '40px', height: '40px', border: '3px solid rgba(99,102,241,.3)', borderTopColor: '#6366f1', borderRadius: '50%', animation: 'spin .8s linear infinite', margin: '0 auto .75rem' }} />
                <p style={{ color: '#818cf8', fontSize: '.85rem' }}>AI يعالج...</p>
              </div>
            </div>
            {/* Hidden video sources */}
            {['a','b','c','d','e','f'].map(id => (
              <video key={id} id={`source-video-${id}`} style={{ display: 'none' }} />
            ))}
            <div id="img-cache" style={{ display: 'none' }} />
          </div>

          {/* Playback Controls */}
          <div dir="ltr" style={{ padding: '.5rem 1rem', background: '#1f2937', borderTop: '1px solid #374151', display: 'flex', alignItems: 'center', gap: '.5rem' }}>
            <PlaybackControls />
          </div>
        </div>

        {/* Effect Controls Sidebar */}
        <div id="tools-panel" style={{ width: '280px', background: '#1f2937', borderLeft: '1px solid #374151', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
          <div style={{ padding: '.75rem 1rem', borderBottom: '1px solid #374151', fontSize: '.8rem', fontWeight: 700, color: '#9ca3af' }}>
            Effect Controls
          </div>
          <div id="effect-controls-panel" style={{ flex: 1, overflow: 'auto' }}>
            <div id="effect-controls-content" style={{ padding: '1rem', color: '#6b7280', fontSize: '.8rem', textAlign: 'center', marginTop: '2rem' }}>
              No Clip Selected
            </div>
          </div>
        </div>
      </div>

      {/* Vertical Resize Handle */}
      <div id="drag-handle-y" style={{ height: '4px', background: '#374151', cursor: 'row-resize', flexShrink: 0 }} />

      {/* Bottom Panel: Timeline + Assets */}
      <div id="bottom-panel" style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

        {/* Timeline */}
        <div id="timeline-panel" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <TimelineHeader />
          <div id="timeline-scroll-area" style={{ flex: 1, overflow: 'auto' }}>
            <div id="timeline-content" style={{ position: 'relative', width: '2000px', minHeight: '100%' }}>
              <div id="playhead" className="playhead-marker" style={{ position: 'absolute', top: 0, bottom: 0, left: 0, zIndex: 10, pointerEvents: 'none' }}>
                <div className="playhead-head" style={{ width: '12px', height: '12px', background: '#ef4444', borderRadius: '2px', marginLeft: '-6px' }} />
                <div className="playhead-line" style={{ width: '1px', background: '#ef4444', position: 'absolute', top: '12px', bottom: 0, left: 0 }} />
              </div>
              <div id="timeline-ruler" className="time-ruler" style={{ position: 'sticky', top: 0, zIndex: 5, height: '28px', background: '#1f2937', borderBottom: '1px solid #374151' }} />
              <div id="tracks-container" />
            </div>
          </div>
        </div>

        {/* Horizontal Resize Handle */}
        <div id="drag-handle-x" style={{ width: '4px', background: '#374151', cursor: 'col-resize', flexShrink: 0 }} />

        {/* Assets Panel */}
        <div id="assets-panel" style={{ width: '280px', background: '#1f2937', borderLeft: '1px solid #374151', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
          <div style={{ padding: '.75rem 1rem', borderBottom: '1px solid #374151', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '.8rem', fontWeight: 700, color: '#9ca3af' }}>المكتبة (Assets)</span>
            <label style={{ cursor: 'pointer', color: '#818cf8', fontSize: '.78rem' }}>
              <i className="fa-solid fa-plus" /> رفع
              <input type="file" id="file-upload" multiple accept="image/*,video/*" style={{ display: 'none' }} />
            </label>
          </div>
          <div id="assets-grid" style={{ flex: 1, overflow: 'auto', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '.5rem', padding: '.75rem' }} />
          <div id="system-log" style={{ height: '120px', overflow: 'auto', background: '#0f172a', borderTop: '1px solid #374151', padding: '.5rem', fontFamily: 'Fira Code, monospace', fontSize: '.7rem', color: '#10b981' }} />
        </div>
      </div>
    </main>
  );
}

function PlaybackControls() {
  const win = window as unknown as Record<string, unknown>;
  return (
    <>
      <button onClick={() => (win['app'] as { seekToStart?: () => void })?.seekToStart?.()} style={ctrlBtnStyle}>⏮</button>
      <button onClick={() => (win['app'] as { jkl?: (d: string) => void })?.jkl?.('j')} style={ctrlBtnStyle}>⏪</button>
      <button id="play-pause-btn" onClick={() => (win['app'] as { togglePlay?: () => void })?.togglePlay?.()} style={{ ...ctrlBtnStyle, background: 'rgba(99,102,241,.15)', color: '#818cf8', fontSize: '.9rem', width: '36px' }}>▶</button>
      <button onClick={() => (win['app'] as { jkl?: (d: string) => void })?.jkl?.('l')} style={ctrlBtnStyle}>⏩</button>
      <button onClick={() => (win['app'] as { seekToEnd?: () => void })?.seekToEnd?.()} style={ctrlBtnStyle}>⏭</button>
      <input id="time-display" defaultValue="00:00:00:00"
        style={{ background: '#111827', border: '1px solid #374151', color: '#d1d5db', borderRadius: '5px', padding: '.25rem .5rem', fontFamily: 'Fira Code, monospace', fontSize: '.8rem', width: '100px' }}
        onChange={e => (win['app'] as { manualTimeUpdate?: (v: string) => void })?.manualTimeUpdate?.(e.target.value)}
      />
    </>
  );
}

const ctrlBtnStyle: React.CSSProperties = { background: 'rgba(255,255,255,.05)', border: '1px solid rgba(255,255,255,.08)', borderRadius: '6px', color: '#d1d5db', padding: '.3rem .6rem', cursor: 'pointer', fontSize: '.8rem' };

function TimelineHeader() {
  const win = window as unknown as Record<string, unknown>;
  const app = () => win['app'] as Record<string, (...args: unknown[]) => void>;
  return (
    <div id="timeline-header" style={{ height: '40px', background: '#1f2937', borderBottom: '1px solid #374151', display: 'flex', alignItems: 'center', padding: '0 .75rem', gap: '.4rem', flexShrink: 0 }}>
      <TlBtn id="tool-undo"   onClick={() => app().undo?.()} icon="fa-rotate-left" />
      <TlBtn id="tool-redo"   onClick={() => app().redo?.()} icon="fa-rotate-right" />
      <div style={{ width: '1px', height: '20px', background: '#374151', margin: '0 .25rem' }} />
      <TlBtn id="tool-select" onClick={() => app().setTool?.('select')} label="V" />
      <TlBtn id="tool-cut"    onClick={() => app().setTool?.('cut')}    label="C" />
      <TlBtn id="tool-slip"   onClick={() => app().setTool?.('slip')}   label="S" />
      <div style={{ width: '1px', height: '20px', background: '#374151', margin: '0 .25rem' }} />
      <TlBtn onClick={() => app().addTextClip?.()}     icon="fa-font" />
      <TlBtn onClick={() => app().rippleDelete?.()}    icon="fa-compress-arrows-alt" />
      <TlBtn onClick={() => app().deleteSelectedClip?.()} icon="fa-trash" />
      <div style={{ width: '1px', height: '20px', background: '#374151', margin: '0 .25rem' }} />
      <TlBtn onClick={() => app().addNewTrack?.('video')} label="V+" />
      <TlBtn onClick={() => app().addNewTrack?.('audio')} label="A+" />
      <div style={{ flex: 1 }} />
      <TlBtn onClick={() => app().zoom?.(-1)} label="−" />
      <span id="zoom-level" style={{ fontSize: '.72rem', color: '#9ca3af', minWidth: '36px', textAlign: 'center' }}>100%</span>
      <TlBtn onClick={() => app().zoom?.(1)} label="+" />
    </div>
  );
}

interface TlBtnProps { id?: string; onClick: () => void; icon?: string; label?: string; }
function TlBtn({ id, onClick, icon, label }: TlBtnProps) {
  return (
    <button id={id} onClick={onClick}
      style={{ background: 'rgba(255,255,255,.05)', border: '1px solid rgba(255,255,255,.07)', borderRadius: '5px', color: '#9ca3af', padding: '.2rem .5rem', cursor: 'pointer', fontSize: '.75rem', fontFamily: 'Fira Code, monospace', lineHeight: 1 }}>
      {icon ? <i className={`fa-solid ${icon}`} /> : label}
    </button>
  );
}
