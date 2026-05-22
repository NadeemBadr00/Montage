import { forwardRef } from 'react';

interface Props { status: string; }

const EditorLoading = forwardRef<HTMLDivElement, Props>(({ status }, ref) => (
  <div ref={ref} id="editor-loading" style={{ position: 'fixed', inset: 0, zIndex: 9999, background: '#111827', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1rem' }}>
    <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    <div style={{ width: '48px', height: '48px', border: '3px solid rgba(99,102,241,.2)', borderTopColor: '#6366f1', borderRadius: '50%', animation: 'spin .8s linear infinite' }} />
    <p style={{ color: '#818cf8', fontWeight: 700, fontSize: '1.1rem' }}>جارٍ تحميل المحرر...</p>
    <p id="loading-status" style={{ color: '#64748b', fontSize: '.85rem' }}>{status}</p>
  </div>
));
EditorLoading.displayName = 'EditorLoading';
export default EditorLoading;
