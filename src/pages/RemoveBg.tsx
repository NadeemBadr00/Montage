import AppLayout from '../components/AppLayout';

export default function RemoveBg() {
  return (
    <AppLayout showTopbar={false}>
      <iframe
        src="/remove-bg.html"
        style={{ width: '100%', flex: 1, border: 'none', height: '100vh' }}
        title="إزالة الخلفية"
      />
    </AppLayout>
  );
}
