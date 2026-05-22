interface Props { statusBar: string; color: string; title: string; }

export default function AnalysisHeader({ statusBar, color, title }: Props) {
  return (
    <header style={{ height: '64px', background: 'rgba(30,41,59,.5)', borderBottom: '1px solid #374151', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 1.5rem', flexShrink: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '.75rem' }}>
        <div style={{ width: '36px', height: '36px', background: `linear-gradient(135deg,${color},${color}88)`, borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <i className="fa-solid fa-microchip" style={{ color: '#fff', fontSize: '.9rem' }} />
        </div>
        <h1 style={{ fontWeight: 700, fontSize: '1rem' }}>{title}</h1>
      </div>
      <span style={{ fontSize: '.78rem', color: '#9ca3af', fontFamily: 'Fira Code, monospace' }}>{statusBar}</span>
    </header>
  );
}
