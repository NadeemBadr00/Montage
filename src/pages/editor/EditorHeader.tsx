import { Link } from 'react-router-dom';
import type { UserData } from '../../types';

interface Props { userData: UserData | null; }

export default function EditorHeader({ userData }: Props) {
  return (
    <header style={{ height: '52px', background: '#1f2937', borderBottom: '1px solid #374151', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 1rem', flexShrink: 0 }}>
      {/* Left: Logo + Back */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '.4rem', color: '#9ca3af', fontSize: '.8rem', textDecoration: 'none', transition: 'color .2s' }}>
          <i className="fa-solid fa-arrow-right" />
        </Link>
        <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem' }}>
          <div style={{ width: '28px', height: '28px', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', borderRadius: '7px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <i className="fa-solid fa-brain" style={{ color: '#fff', fontSize: '.8rem' }} />
          </div>
          <span style={{ fontWeight: 700, fontSize: '.9rem' }}>Project 43 <span style={{ color: '#818cf8' }}>AI ULTRA</span></span>
        </div>
      </div>

      {/* Right: Action buttons */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem' }}>
        <EditorBtn id="cmd-toggle-btn" icon="fa-terminal" label="CMD"
          onClick={() => (window as unknown as Record<string, unknown>)['app'] && (window as unknown as Record<string, { toggleCommandConsole: () => void }>)['app'].toggleCommandConsole()} />
        <EditorBtn id="plan-btn" icon="fa-map" label="Plan"
          onClick={() => (window as unknown as Record<string, { showLastPlan: () => void }>)['geminiPlan']?.showLastPlan()} />
        <EditorBtn id="srt-splitter-btn" icon="fa-scissors" label="SRT"
          onClick={() => document.getElementById('srt-tool-modal')?.classList.remove('hidden')} />
        <EditorBtn id="export-mp4-btn" icon="fa-video" label="MP4"
          onClick={() => (window as unknown as Record<string, { exportToMP4: () => void }>)['app']?.exportToMP4()} color="#10b981" />
        <EditorBtn id="download-xml-btn" icon="fa-code" label="XML"
          onClick={() => (window as unknown as Record<string, { downloadXML: () => void }>)['app']?.downloadXML()} color="#f59e0b" />

        {/* Plan upload hidden input */}
        <input type="file" id="header-plan-upload" accept=".json" style={{ display: 'none' }} />

        {/* Avatar */}
        {userData?.photo && (
          <Link to="/" id="header-user-avatar">
            <img src={userData.photo} alt={userData.name || ''} style={{ width: '28px', height: '28px', borderRadius: '50%', border: '1px solid rgba(99,102,241,.4)' }} />
          </Link>
        )}
      </div>
    </header>
  );
}

interface BtnProps { id: string; icon: string; label: string; onClick: () => void; color?: string; }
function EditorBtn({ id, icon, label, onClick, color }: BtnProps) {
  return (
    <button id={id} onClick={onClick}
      style={{ display: 'flex', alignItems: 'center', gap: '.35rem', padding: '.35rem .75rem', background: 'rgba(255,255,255,.05)', border: '1px solid rgba(255,255,255,.08)', borderRadius: '7px', color: color || '#d1d5db', fontSize: '.78rem', cursor: 'pointer', fontFamily: 'Cairo, sans-serif', transition: 'all .2s' }}>
      <i className={`fa-solid ${icon}`} style={color ? { color } : {}} /> {label}
    </button>
  );
}
