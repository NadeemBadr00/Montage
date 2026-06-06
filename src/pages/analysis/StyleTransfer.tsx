import { useState, useRef } from 'react';
import AnalysisHeader from './AnalysisHeader';
import AnalysisSidebar from './AnalysisSidebar';
import ChunksGrid from './ChunksGrid';
import type { ChunkCard } from './types';
import { splitIntoChunks, processChunkWithRetry, downloadReport } from './analysisUtils';

export default function StyleTransfer() {
  const [chunks, setChunks]         = useState<ChunkCard[]>([]);
  const [logLines, setLogLines]     = useState<string[]>([]);
  const [statusBar, setStatusBar]   = useState('أدخل الستايل المرجعي...');
  const [running, setRunning]       = useState(false);
  const [apiKeys, setApiKeys]       = useState<string[]>([]);
  const [modelName, setModelName]   = useState('gemini-2.5-flash');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [transcript, setTranscript] = useState('');
  const [styleRef, setStyleRef]     = useState('');
  const [videoDuration, setVideoDuration] = useState(0);
  const hiddenVideoRef = useRef<HTMLVideoElement>(null);

  const addLog = (msg: string) => setLogLines(prev => [...prev.slice(-100), `[${new Date().toLocaleTimeString()}] ${msg}`]);

  const startProcess = async () => {
    if (!selectedFile) { addLog('❌ يرجى رفع ملف فيديو'); return; }
    if (!apiKeys.length) { addLog('❌ يرجى إضافة مفتاح API'); return; }
    if (styleRef.length < 10) { addLog('❌ يرجى إدخال الستايل المرجعي'); return; }
    setRunning(true); setStatusBar('جارٍ توليد الخطة...');
    const duration = videoDuration || 60;
    const newChunks = splitIntoChunks(duration, 45, 5); // 45s chunks for style transfer
    setChunks(newChunks.map((c, i) => ({ ...c, id: i + 1, status: 'pending', progress: 0, result: '' })));
    try {
      await Promise.all(
        newChunks.map((c, i) =>
          processChunkWithRetry({
            chunk: c, id: i + 1, apiKeys, modelName, file: selectedFile, transcript,
            onUpdate: (id, update) => setChunks(prev => prev.map(ch => ch.id === id ? { ...ch, ...update } : ch)),
            onLog: addLog, mode: 'style-transfer', styleRef,
          })
        )
      );
      setStatusBar('✅ اكتملت خطة الستايل!');
    } catch { addLog('⚠️ حدث خطأ'); }
    setRunning(false);
  };

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: '#0f172a', color: '#fff', fontFamily: 'Cairo, sans-serif' }}>
      <AnalysisHeader statusBar={statusBar} color="#f43f5e" title="AI4Montage Style Transfer" />
      <main style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        <AnalysisSidebar
          apiKeys={apiKeys} setApiKeys={setApiKeys}
          selectedFile={selectedFile} setSelectedFile={setSelectedFile}
          transcript={transcript} setTranscript={setTranscript}
          modelName={modelName} setModelName={setModelName}
          hiddenVideoRef={hiddenVideoRef} onDurationLoad={setVideoDuration}
          onStart={startProcess} running={running}
          onDownload={() => downloadReport(chunks, 'style_transfer_plan.txt')}
          hasResults={chunks.some(c => c.result)}
          logLines={logLines}
          accentColor="#f43f5e"
          styleRef={styleRef} setStyleRef={setStyleRef}
          wide
        />
        <ChunksGrid chunks={chunks} accentColor="#f43f5e" />
      </main>
      <video ref={hiddenVideoRef} style={{ display: 'none' }}
        onLoadedMetadata={() => setVideoDuration(hiddenVideoRef.current?.duration || 0)} />
    </div>
  );
}
