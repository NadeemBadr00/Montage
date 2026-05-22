import AppLayout from '../components/AppLayout';

export default function Analysis() {
  return (
    <AppLayout showTopbar={false}>
      <iframe
        src="/analysis.html"
        style={{ width: '100%', flex: 1, border: 'none', height: '100vh' }}
        title="محلل الفيديو"
      />
    </AppLayout>
  );
}
