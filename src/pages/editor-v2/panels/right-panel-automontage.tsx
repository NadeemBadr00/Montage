import React, { useState } from 'react';

// ─── AutoMontage Bar ───────────────────────────────────────────────────────────
// Runs AI-powered automatic montage with style selection and progress feedback

const MONTAGE_STYLES = [
  { id: 'cinematic', label: 'سينمائي', icon: 'fa-film', color: 'text-amber-400' },
  { id: 'energetic', label: 'نشيط', icon: 'fa-bolt', color: 'text-yellow-400' },
  { id: 'documentary', label: 'وثائقي', icon: 'fa-video', color: 'text-blue-400' },
  { id: 'social', label: 'سوشيال', icon: 'fa-hashtag', color: 'text-pink-400' },
];

export function AutoMontageBar() {
  const [style, setStyle] = useState('cinematic');
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusMsg, setStatusMsg] = useState('');
  const [showStyles, setShowStyles] = useState(false);
  const currentStyle = MONTAGE_STYLES.find(s => s.id === style) || MONTAGE_STYLES[0];

  const handleRun = async () => {
    const engine = (window as any).autoMontage;
    if (!engine) {
      (window as any).geminiChat?.pushMessage?.('ai', '⚠️ AutoMontage engine not loaded.');
      return;
    }
    setRunning(true);
    setProgress(0);
    setStatusMsg('جاري التهيئة...');
    try {
      await engine.run(style, (msg: string, pct: number) => {
        setProgress(pct);
        setStatusMsg(msg);
      });
    } catch(e) {
      console.error(e);
    } finally {
      setRunning(false);
      setProgress(100);
      setTimeout(() => { setProgress(0); setStatusMsg(''); }, 3000);
    }
  };

  return (
    <div className="flex-shrink-0 border-b border-gray-800/60 bg-gradient-to-r from-[#0a0f1d] to-[#0d1225] px-2.5 py-2">
      {/* Header row */}
      <div className="flex items-center gap-2 mb-1.5">
        <div className="flex items-center gap-1.5 flex-1">
          <div className="w-5 h-5 rounded-md bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center flex-shrink-0">
            <i className="fa-solid fa-wand-sparkles text-white text-[8px]" />
          </div>
          <span className="text-[10px] font-bold text-amber-400">AutoMontage</span>
          <span className="text-[8px] text-gray-600">— مونتاج تلقائي بالذكاء الاصطناعي</span>
        </div>
        {/* Style selector */}
        <div className="relative">
          <button
            onClick={() => setShowStyles(v => !v)}
            disabled={running}
            className={`flex items-center gap-1 bg-[#0f172a] border border-gray-700 hover:border-amber-500/50 rounded-lg px-2 py-1 text-[9px] ${currentStyle.color} transition-all`}
          >
            <i className={`fa-solid ${currentStyle.icon} text-[8px]`} />
            {currentStyle.label}
            <i className="fa-solid fa-chevron-down text-[6px] text-gray-600" />
          </button>
          {showStyles && (
            <div className="absolute bottom-full right-0 mb-1 bg-[#0a0f1d] border border-gray-700 rounded-lg overflow-hidden shadow-xl z-50 min-w-[110px]">
              {MONTAGE_STYLES.map(s => (
                <button key={s.id}
                  onClick={() => { setStyle(s.id); setShowStyles(false); }}
                  className={`w-full flex items-center gap-2 px-2.5 py-1.5 text-[9px] hover:bg-gray-800 transition-colors ${s.color} ${s.id === style ? 'bg-gray-800/60' : ''}`}
                >
                  <i className={`fa-solid ${s.icon} text-[8px]`} />
                  {s.label}
                  {s.id === style && <i className="fa-solid fa-check text-[7px] ml-auto" />}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Progress bar */}
      {(running || progress > 0) && (
        <div className="mb-1.5">
          <div className="flex items-center justify-between mb-0.5">
            <span id="auto-montage-progress-text" className="text-[8px] text-gray-400 truncate flex-1">{statusMsg}</span>
            <span className="text-[8px] text-amber-400 font-mono flex-shrink-0 ml-1">{progress}%</span>
          </div>
          <div className="h-1 bg-gray-800 rounded-full overflow-hidden">
            <div
              id="auto-montage-progress-bar"
              className="h-full bg-gradient-to-r from-amber-500 to-orange-500 rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Run button */}
      <button
        id="auto-montage-run-btn"
        onClick={handleRun}
        disabled={running}
        className={`w-full py-1.5 rounded-lg text-[10px] font-bold transition-all flex items-center justify-center gap-2 ${
          running
            ? 'bg-gray-800 text-gray-500 cursor-not-allowed'
            : 'bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white shadow-md shadow-amber-900/30 hover:shadow-amber-900/50 hover:scale-[1.02] active:scale-[0.98]'
        }`}
      >
        {running ? (
          <><i className="fa-solid fa-spinner fa-spin text-[9px]" />جاري التحليل والمونتاج...</>
        ) : (
          <><i className="fa-solid fa-magic text-[9px]" />✨ منتج الفيديو التلقائي</>
        )}
      </button>
    </div>
  );
}
