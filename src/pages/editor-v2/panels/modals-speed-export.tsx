import React, { useState, useEffect } from 'react';
import { useEditorStore } from '../../../store/useEditorStore';

export function SpeedDurationModal() {
  const { speedModal, setSpeedModal, tracks } = useEditorStore();
  const [speed, setSpeed] = React.useState<number | string>(1);
  const [duration, setDuration] = React.useState<number | string>(0);
  const [sourceTime, setSourceTime] = React.useState(0);
  const [clipName, setClipName] = React.useState('');

  React.useEffect(() => {
    if (speedModal) {
      let foundClip = null;
      for (const t of tracks) {
        const c = t.clips.find(c => c.id === speedModal.clipId);
        if (c) { foundClip = c; break; }
      }
      
      if (foundClip) {
        const currentSpeed = foundClip.properties?.playbackSpeed || 1;
        const currentDuration = foundClip.duration || 5;
        const srcTime = currentDuration * currentSpeed; // Total media time consumed
        
        setClipName(foundClip.name || "Clip");
        setSpeed(Number(currentSpeed.toFixed(2)));
        setDuration(Number(currentDuration.toFixed(2)));
        setSourceTime(srcTime);
      }
    }
  }, [speedModal, tracks]);

  if (!speedModal) return null;

  const handleSpeedChange = (valStr: string) => {
    setSpeed(valStr);
    const newSpeed = parseFloat(valStr);
    if (!isNaN(newSpeed) && newSpeed > 0) {
        setDuration(Number((sourceTime / newSpeed).toFixed(2)));
    }
  };

  const handleDurationChange = (valStr: string) => {
    setDuration(valStr);
    const newDuration = parseFloat(valStr);
    if (!isNaN(newDuration) && newDuration > 0) {
        setSpeed(Number((sourceTime / newDuration).toFixed(2)));
    }
  };

  const applyChanges = () => {
    const finalSpeed = parseFloat(speed as string) || 1;
    const finalDuration = parseFloat(duration as string) || (sourceTime / finalSpeed);
    
    const app = (window as any).app;
    if (app && app.updateClipSpeedAndDuration) {
        app.updateClipSpeedAndDuration(speedModal.clipId, finalSpeed, finalDuration);
    }
    setSpeedModal(null);
  };

  return (
    <div className="fixed inset-0 z-[10000] bg-black/60 flex items-center justify-center backdrop-blur-sm p-4">
        <div className="bg-[#0f172a] rounded-xl border border-gray-600 w-full max-w-sm shadow-2xl flex flex-col overflow-hidden animate-fade-in-up">
            <div className="p-4 bg-[#0a0f1d] border-b border-gray-700 flex justify-between items-center">
                <h2 className="text-sm font-bold text-blue-400"><i className="fa-solid fa-gauge-high"></i> Speed / Duration</h2>
                <button onClick={() => setSpeedModal(null)} className="text-gray-400 hover:text-white transition-colors bg-gray-800 w-6 h-6 rounded flex items-center justify-center">
                    <i className="fa-solid fa-xmark"></i>
                </button>
            </div>
            
            <div className="p-5 flex flex-col gap-4 text-sm text-gray-200">
                <div className="text-xs text-gray-400 truncate">Clip: <span className="text-gray-200 font-bold">{clipName}</span></div>
                
                <div className="flex flex-col gap-2">
                    <label className="text-xs text-gray-400 uppercase font-bold tracking-wide">Speed Multiplier</label>
                    <div className="flex items-center gap-3">
                        <input 
                            type="range" 
                            min="0.1" 
                            max="10" 
                            step="0.01" 
                            value={speed === '' ? 1 : speed} 
                            onChange={(e) => handleSpeedChange(e.target.value)}
                            className="flex-grow"
                            dir="ltr"
                        />
                        <input 
                            type="number" 
                            min="0.1" 
                            max="50" 
                            step="0.01" 
                            value={speed}
                            onChange={(e) => handleSpeedChange(e.target.value)}
                            className="w-20 bg-gray-800 border border-gray-600 rounded px-2 py-1 text-center outline-none focus:border-blue-500 font-mono"
                            dir="ltr"
                        />
                        <span className="text-gray-500">x</span>
                    </div>
                </div>

                <div className="flex flex-col gap-2 mt-2">
                    <label className="text-xs text-gray-400 uppercase font-bold tracking-wide">Target Duration</label>
                    <div className="flex items-center gap-3">
                        <input 
                            type="number" 
                            min="0.1" 
                            step="0.1" 
                            value={duration}
                            onChange={(e) => handleDurationChange(e.target.value)}
                            className="w-24 bg-gray-800 border border-gray-600 rounded px-2 py-1 outline-none focus:border-blue-500 font-mono"
                            dir="ltr"
                        />
                        <span className="text-gray-500 text-xs">Seconds</span>
                    </div>
                </div>
            </div>

            <div className="p-4 border-t border-gray-700 bg-[#0a0f1d] flex gap-3 justify-end">
                <button onClick={() => setSpeedModal(null)} className="px-4 py-2 rounded text-gray-400 hover:text-white hover:bg-gray-800 transition">Cancel</button>
                <button onClick={applyChanges} className="px-6 py-2 rounded bg-blue-600 hover:bg-blue-500 text-white font-bold transition shadow-lg">Apply</button>
            </div>
        </div>
    </div>
  );
}

export function VideoExportModal() {
  const { exportVideoModal, setExportVideoModal } = useEditorStore();
  const [resolution, setResolution] = React.useState("1080");
  const [compression, setCompression] = React.useState("0.6");
  const [codec, setCodec] = React.useState("avc");

  if (!exportVideoModal) return null;

  const handleStartExport = () => {
      const app = (window as any).app;
      if (app && app.exportVideoClientSide) {
          app.exportVideoClientSide({
              resolution: parseInt(resolution),
              compressionMult: parseFloat(compression),
              codec
          });
      }
      setExportVideoModal(false);
  };

  return (
    <div className="fixed inset-0 z-[10000] bg-black/80 flex items-center justify-center backdrop-blur-sm p-4">
        <div className="bg-[#0f172a] rounded-xl border border-gray-600 w-full max-w-md shadow-2xl flex flex-col overflow-hidden animate-fade-in-up">
            <div className="p-4 bg-[#0a0f1d] border-b border-gray-700 flex justify-between items-center">
                <h2 className="text-sm font-bold text-green-400"><i className="fa-solid fa-download"></i> MP4 Export (Local GPU)</h2>
                <button onClick={() => setExportVideoModal(false)} className="text-gray-400 hover:text-white transition-colors bg-gray-800 w-6 h-6 rounded flex items-center justify-center">
                    <i className="fa-solid fa-xmark"></i>
                </button>
            </div>
            
            <div className="p-6 flex flex-col gap-5 text-sm text-gray-200 font-cairo" dir="rtl">
                
                <div className="flex flex-col gap-2">
                    <label className="text-xs text-gray-400 uppercase font-bold tracking-wide">جودة الفيديو</label>
                    <select 
                        value={resolution} 
                        onChange={(e) => setResolution(e.target.value)}
                        className="bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 outline-none focus:border-green-500 text-sm"
                    >
                        <option value="2160">4K (UHD)</option>
                        <option value="1440">2K (QHD)</option>
                        <option value="1080">1080p (FHD)</option>
                        <option value="720">720p (HD)</option>
                        <option value="540">540p (qHD)</option>
                        <option value="480">480p (SD)</option>
                        <option value="360">360p (Low)</option>
                        <option value="240">240p (Very Low)</option>
                        <option value="144">144p (Tiny)</option>
                    </select>
                </div>

                <div className="flex flex-col gap-2">
                    <label className="text-xs text-gray-400 uppercase font-bold tracking-wide">حجم الملف</label>
                    <select 
                        value={compression} 
                        onChange={(e) => setCompression(e.target.value)}
                        className="bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 outline-none focus:border-green-500 text-sm"
                    >
                        <option value="1">جودة أصلية (حجم كبير)</option>
                        <option value="0.6">متوازن (حجم مناسب)</option>
                        <option value="0.3">مضغوط جداً (حجم صغير)</option>
                        <option value="0.1">أقصى ضغط ممكن (حجم نملة 🐜)</option>
                    </select>
                </div>

                <div className="flex flex-col gap-2">
                    <label className="text-xs text-gray-400 uppercase font-bold tracking-wide">نوع الضغط (Codec)</label>
                    <select 
                        value={codec} 
                        onChange={(e) => setCodec(e.target.value)}
                        className="bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 outline-none focus:border-green-500 text-sm"
                    >
                        <option value="avc">H.264 (الأكثر توافقاً)</option>
                        <option value="hevc">HEVC / H.265 (أفضل جودة وحجم)</option>
                    </select>
                </div>

            </div>

            <div className="p-4 border-t border-gray-700 bg-[#0a0f1d] flex gap-3 justify-end font-cairo" dir="rtl">
                <button onClick={() => setExportVideoModal(false)} className="px-4 py-2 rounded text-gray-400 hover:text-white hover:bg-gray-800 transition">إلغاء</button>
                <button onClick={handleStartExport} className="px-6 py-2 rounded bg-green-600 hover:bg-green-500 text-white font-bold transition shadow-lg flex items-center gap-2">
                    <i className="fa-solid fa-rocket"></i> بدء الرندرة
                </button>
            </div>
        </div>
    </div>
  );
}
