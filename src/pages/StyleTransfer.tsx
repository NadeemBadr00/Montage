import AppLayout from '../components/AppLayout';

export default function StyleTransfer() {
  return (
    <AppLayout showTopbar={false}>
      <iframe
        src="/AI_Style_Transfer_Analyzer.html"
        style={{ width: '100%', flex: 1, border: 'none', height: '100vh' }}
        title="نقل الستايل"
      />
    </AppLayout>
  );
}
