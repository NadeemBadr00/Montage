import AppLayout from '../components/AppLayout';

export default function Editor() {
  return (
    <AppLayout showTopbar={false}>
      <iframe
        src="/editor.html"
        style={{ width: '100%', flex: 1, border: 'none', height: 'calc(100vh)' }}
        title="المحرر"
      />
    </AppLayout>
  );
}
