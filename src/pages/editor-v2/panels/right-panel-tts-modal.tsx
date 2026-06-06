import React, { useState } from 'react';
import { TTS_VOICES } from '../../../editor-engine/ai/tts_engine';

// ─── TTS Modal Component ───────────────────────────────────────────────────────
// Generates AI voiceover from text and adds it to the timeline audio track (A2)
export function TTSModal({ onClose }: { onClose: () => void }) {
  const [text, setText] = useState('');
  const [voice, setVoice] = useState('Kore');
  const [isGenerating, setIsGenerating] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [error, setError] = useState('');

  const generate = async () => {
    if (!text.trim()) { setError('اكتب النص المراد تحويله لصوت'); return; }
    setError('');
    setIsGenerating(true);
    try {
      const engine = (window as any).ttsEngine;
      if (!engine) throw new Error('محرك TTS غير محمل');
      const url = await engine.generate(text.trim(), voice);
      setAudioUrl(url);
    } catch (e: any) {
      setError(e?.message || 'حدث خطأ أثناء توليد الصوت');
    } finally {
      setIsGenerating(false);
    }
  };

  const addToTimeline = () => {
    if (!audioUrl) return;
    const store = (window as any).useEditorStore?.getState?.();
    if (!store) return;
    const { tracks, addClipToTrack } = store;
    const audioTrack = tracks?.find((t: any) => t.id === 'A2' || (t.type === 'audio' && t.id !== 'A1'));
    if (audioTrack) {
      const clip = {
        id: `tts_${Date.now()}`,
        name: `Voiceover_${voice}`,
        src: audioUrl,
        type: 'audio',
        start: 0,
        duration: 30,
        volume: 1,
      };
      addClipToTrack(audioTrack.id, clip);
      window.app?.log?.(`🎵 تم إضافة الـ voiceover للتراك: ${audioTrack.id}`);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-sm" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-[#0d1628] border border-purple-500/30 rounded-2xl w-full max-w-md mx-4 p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-white font-black text-lg flex items-center gap-2">
            <span className="text-2xl">🔊</span> AI Voiceover
          </h2>
          <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors">✕</button>
        </div>

        {/* Text input */}
        <div className="mb-4">
          <label className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-2 block">النص</label>
          <textarea
            value={text}
            onChange={e => setText(e.target.value)}
            placeholder="اكتب هنا النص اللي تحب يتحول لصوت..."
            rows={4}
            className="w-full bg-[#0a0f1d] border border-gray-700 rounded-xl px-4 py-3 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-purple-500/60 resize-none"
          />
          <p className="text-gray-600 text-[10px] mt-1">{text.length} حرف</p>
        </div>

        {/* Voice selector */}
        <div className="mb-5">
          <label className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-2 block">الصوت</label>
          <div className="grid grid-cols-2 gap-1.5 max-h-40 overflow-y-auto pr-1">
            {TTS_VOICES.map(v => (
              <button key={v.id} onClick={() => setVoice(v.id)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-left transition-all text-xs ${
                  voice === v.id ? 'border-purple-500/60 bg-purple-500/15 text-purple-300' : 'border-gray-800 bg-[#0f172a] text-gray-400 hover:border-gray-600'
                }`}>
                <span className="text-base">{v.gender === '♀' ? '👩' : '👨'}</span>
                <div>
                  <div className="font-bold text-white">{v.name}</div>
                  <div className="text-[10px] opacity-60">{v.lang}</div>
                </div>
                {voice === v.id && <span className="ml-auto text-purple-400">✓</span>}
              </button>
            ))}
          </div>
        </div>

        {error && <p className="text-red-400 text-xs mb-3 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{error}</p>}

        {audioUrl && (
          <div className="mb-4">
            <label className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-2 block">معاينة الصوت</label>
            <audio controls src={audioUrl} className="w-full h-9" />
          </div>
        )}

        <div className="flex gap-3">
          <button onClick={generate} disabled={isGenerating || !text.trim()}
            className="flex-1 py-2.5 rounded-xl font-bold text-sm transition-all bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2">
            {isGenerating ? (
              <><svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg> جاري...</>
            ) : (<> 🔊 توليد</>)}
          </button>
          {audioUrl && (
            <button onClick={addToTimeline}
              className="flex-1 py-2.5 rounded-xl font-bold text-sm bg-cyan-600 hover:bg-cyan-500 text-white transition-colors flex items-center justify-center gap-2">
              ➕ إضافة للتايم لاين
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
