import AppLayout from '../components/AppLayout';

export default function SrtSplitter() {
  return (
    <AppLayout showTopbar={false}>
      <iframe
        src="/srt.html"
        style={{ width: '100%', flex: 1, border: 'none', height: '100vh' }}
        title="SRT Splitter"
      />
    </AppLayout>
  );
}
