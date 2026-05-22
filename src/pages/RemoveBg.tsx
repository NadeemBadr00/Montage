import AppLayout from '../components/AppLayout';

export default function RemoveBg() {
  return (
    <AppLayout showTopbar={false}>
      <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>

        {/* Header */}
        <header style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--bd)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h1 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#60a5fa' }}>🎬 إزالة خلفية الفيديو</h1>
        </header>

        {/* Content */}
        <main style={{ flex: 1, padding: '1.5rem' }}>
          <div style={{ maxWidth: '960px', margin: '0 auto' }}>
            <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ fontSize: '1.6rem', fontWeight: 700, color: '#fff', marginBottom: '.5rem' }}>أداة إزالة الخلفية بالذكاء الاصطناعي</h2>
              <p style={{ color: 'var(--tx2)' }}>ارفع الفيديو داخل الأداة مباشرة وسيتم معالجته على السيرفر</p>
            </div>
            <div style={{ width: '100%', height: '850px', borderRadius: '16px', overflow: 'hidden', border: '1px solid rgba(255,255,255,.1)', boxShadow: '0 20px 60px rgba(0,0,0,.5)' }}>
              <iframe
                src="https://nadeemmohamed-removebg.hf.space"
                style={{ width: '100%', height: '100%', border: 'none' }}
                loading="lazy"
                allow="camera; microphone; clipboard-read; clipboard-write"
                title="إزالة الخلفية"
              />
            </div>
          </div>
        </main>

        {/* Footer */}
        <footer style={{ textAlign: 'center', fontSize: '.75rem', color: 'var(--tx3)', padding: '1rem', borderTop: '1px solid var(--bd)' }}>
          © 2026 — AI Tools by Nadeem Mohamed
        </footer>
      </div>
    </AppLayout>
  );
}
