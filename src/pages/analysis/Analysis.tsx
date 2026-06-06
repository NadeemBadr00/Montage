import { useState, useRef } from 'react';
import AnalysisHeader from './AnalysisHeader';
import AnalysisSidebar from './AnalysisSidebar';
import ChunksGrid from './ChunksGrid';
import type { ChunkCard } from './types';
import { splitIntoChunks, processChunkWithRetry, downloadReport, log } from './analysisUtils';

export default function Analysis() {
  const [chunks, setChunks]         = useState<ChunkCard[]>([]);
  const [logLines, setLogLines]     = useState<string[]>([]);
  const [statusBar, setStatusBar]   = useState('جاهز...');
  const [running, setRunning]       = useState(false);
  const [apiKeys, setApiKeys]       = useState<string[]>([]);
  const [modelName, setModelName]   = useState('gemini-2.5-flash');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [transcript, setTranscript] = useState('');
  const [videoDuration, setVideoDuration] = useState(0);
  const hiddenVideoRef = useRef<HTMLVideoElement>(null);

  const addLog = (msg: string) => setLogLines(prev => [...prev.slice(-100), `[${new Date().toLocaleTimeString()}] ${msg}`]);

  const startProcess = async () => {
    if (!selectedFile) { addLog('❌ يرجى رفع ملف فيديو'); return; }
    if (!apiKeys.length) { addLog('❌ يرجى إضافة مفتاح API'); return; }
    setRunning(true);
    setStatusBar('جارٍ المعالجة...');
    const duration = videoDuration || 60;
    const newChunks = splitIntoChunks(duration, 30, 5);
    setChunks(newChunks.map((c, i) => ({ ...c, id: i + 1, status: 'pending', progress: 0, result: '' })));
    addLog(`📦 ${newChunks.length} chunk للمعالجة`);
    try {
      await Promise.all(
        newChunks.map((c, i) =>
          processChunkWithRetry({
            chunk: c, id: i + 1, apiKeys, modelName, file: selectedFile, transcript,
            onUpdate: (id, update) => setChunks(prev => prev.map(ch => ch.id === id ? { ...ch, ...update } : ch)),
            onLog: addLog, mode: 'analysis',
          })
        )
      );
      setStatusBar('✅ اكتملت المعالجة!');
      addLog('✅ اكتملت جميع الـ chunks');
    } catch { addLog('⚠️ حدث خطأ أثناء المعالجة'); }
    setRunning(false);
  };

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: '#0f172a', color: '#fff', fontFamily: 'Cairo, sans-serif' }}>
      <AnalysisHeader statusBar={statusBar} color="#8b5cf6" title="AI4Montage Analyzer Ultra" />
      <main style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        <AnalysisSidebar
          apiKeys={apiKeys} setApiKeys={setApiKeys}
          selectedFile={selectedFile} setSelectedFile={setSelectedFile}
          transcript={transcript} setTranscript={setTranscript}
          modelName={modelName} setModelName={setModelName}
          hiddenVideoRef={hiddenVideoRef}
          onDurationLoad={setVideoDuration}
          onStart={startProcess} running={running}
          onDownload={() => downloadReport(chunks, 'analysis_report.txt')}
          hasResults={chunks.some(c => c.result)}
          logLines={logLines}
          accentColor="#8b5cf6"
        />
        <ChunksGrid chunks={chunks} accentColor="#8b5cf6" />
      </main>
      <video ref={hiddenVideoRef} style={{ display: 'none' }}
        onLoadedMetadata={() => setVideoDuration(hiddenVideoRef.current?.duration || 0)} />
    </div>
  );
}

// Re-export for backward compat
export { log };
