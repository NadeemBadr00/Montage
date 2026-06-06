import React, { useState, useEffect, useRef } from 'react';
import { useEditorStore } from '../../../store/useEditorStore';

export function VideoExportModalPro() {
  const { exportVideoModal, setExportVideoModal, tracks } = useEditorStore();
  
  // -- Settings State --
  const [format, setFormat] = useState('mp4'); // mp4, webm, gif, mp3
  const [resolution, setResolution] = useState("1080");
  const [preset, setPreset] = useState<'youtube' | 'tiktok' | 'instagram' | 'custom'>('youtube');
  const [fps, setFps] = useState("30");
  const [quality, setQuality] = useState("medium"); // high, medium, low
  const [exportRange, setExportRange] = useState<'full' | 'range'>('full');
  const [watermark, setWatermark] = useState(false);
  const [draftMode, setDraftMode] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [codec, setCodec] = useState('avc');

  // -- Progress State --
  const [exportStatus, setExportStatus] = useState<'idle' | 'rendering' | 'done'>('idle');
  const [progress, setProgress] = useState(0);
  const [eta, setEta] = useState<string>('--:--');
  const [renderedUrl, setRenderedUrl] = useState<string | null>(null);

  // -- Summary Stats --
  const [duration, setDuration] = useState(0);
  const [estimatedSize, setEstimatedSize] = useState('0 MB');

  // Confetti ref
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (exportVideoModal) {
      setExportStatus('idle');
      setProgress(0);
      setRenderedUrl(null);
      
      const app = (window as any).app;
      const dur = app?.duration || 10;
      setDuration(dur);
      calculateEstimatedSize(dur, resolution, quality);
    }
  }, [exportVideoModal]);

  useEffect(() => {
    calculateEstimatedSize(duration, resolution, quality);
  }, [resolution, quality, duration, format]);

  // Sync Preset to settings
  const handlePresetChange = (p: 'youtube' | 'tiktok' | 'instagram' | 'custom') => {
      setPreset(p);
      if (p === 'youtube') setResolution("1080");
      if (p === 'tiktok') setResolution("1080"); // Vertical, but we'll just set resolution level here
      if (p === 'instagram') setResolution("1080");
  };

  const handleDraftToggle = () => {
      const newDraft = !draftMode;
      setDraftMode(newDraft);
      if (newDraft) {
          setResolution("360");
          setQuality("low");
          setFps("24");
      } else {
          setResolution("1080");
          setQuality("medium");
          setFps("30");
      }
  };

  const calculateEstimatedSize = (dur: number, res: string, qual: string) => {
      if (format === 'mp3') {
          setEstimatedSize((dur * 0.015).toFixed(1) + ' MB');
          return;
      }
      let baseSizePerSec = 0.5; // 1080p medium
      if (res === "2160") baseSizePerSec = 2.0;
      if (res === "1080") baseSizePerSec = 0.5;
      if (res === "720") baseSizePerSec = 0.25;
      if (res === "360") baseSizePerSec = 0.1;
      
      if (qual === "high") baseSizePerSec *= 1.5;
      if (qual === "low") baseSizePerSec *= 0.5;

      const totalSize = dur * baseSizePerSec;
      setEstimatedSize(totalSize.toFixed(1) + ' MB');
  };

  const startRender = async () => {
      setExportStatus('rendering');
      setProgress(100);
      setEta('تم بدء التصدير في نافذة جديدة...');

      const app = (window as any).app;
      if (!app) {
          finishRender(null);
          return;
      }

      try {
          const id = app.projectId || `proj_${Date.now()}`;
            const isVertical = preset === 'tiktok';
            const isSquare = preset === 'instagram';
            let finalWidth = resolution === '4320' ? 7680 : resolution === '2160' ? 3840 : resolution === '1080' ? 1920 : resolution === '720' ? 1280 : resolution === '480' ? 854 : resolution === '360' ? 640 : resolution === '240' ? 426 : 256;
            let finalHeight = parseInt(resolution) || 1080;
            
            if (isVertical) {
                finalWidth = finalHeight;
                finalHeight = resolution === '4320' ? 7680 : resolution === '2160' ? 3840 : resolution === '1080' ? 1920 : resolution === '720' ? 1280 : resolution === '480' ? 854 : resolution === '360' ? 640 : resolution === '240' ? 426 : 256;
            } else if (isSquare) {
                finalWidth = finalHeight;
            }

            const exportManifest = {
            tracks: app.tracks.map((t: any) => ({
                id: t.id,
                type: t.type,
                clips: t.clips.map((c: any) => ({
                    id: c.id,
                    type: c.type,
                    src: c.src,
                    start: c.start,
                    duration: c.duration,
                    sourceIn: c.sourceIn,
                    properties: c.properties,
                    text: c.src,
                    textStyle: c.textStyle,
                    transitions: c.transitions,
                    aiSegmentation: c.aiSegmentation,
                    logoRemovers: c.logoRemovers
                }))
            })),
            duration: app.duration,
            fps: parseInt(fps) || app.FPS || 30,
            baseWidth: finalWidth,
            baseHeight: finalHeight,
            quality: quality,
            format: format
          };
          
          if ((window as any).FileStore) {
              await (window as any).FileStore.save(`${id}_export_manifest`, new Blob([JSON.stringify(exportManifest)], { type: 'application/json' }));
          }

          // Open old reliable export page
          window.open(`/export.html?id=${id}&res=${resolution}&fps=${fps}&quality=${quality}&codec=${codec}&auto=true`, '_blank');
          
          setExportStatus('done');
          useEditorStore.getState().addLog(`✅ تم إرسال مشروعك للتصدير في علامة تبويب جديدة.`);
          triggerConfetti();

      } catch (e) {
          console.error("Export start failed", e);
          setExportStatus('idle');
          alert("حدث خطأ أثناء بدء التصدير.");
      }
  };

  const finishRender = (blob: Blob | null) => {
      if (!blob) {
          setExportStatus('idle');
          useEditorStore.getState().addLog(`⚠️ فشل التصدير. يرجى محاولة تقليل الجودة أو الدقة.`);
          alert('❌ فشل التصدير. حدث خطأ في محرك الفيديو. راجع الـ Console للحصول على التفاصيل.');
          return;
      }
      
      setExportStatus('done');
      
      const url = URL.createObjectURL(blob);
      setRenderedUrl(url);
      
      setTimeout(() => {
          const a = document.createElement('a');
          a.href = url;
          a.download = `AI4Montage_Export_${Date.now()}.mp4`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          setTimeout(() => URL.revokeObjectURL(url), 10000);
          
          useEditorStore.getState().addLog(`✅ اكتمل التصدير! تم تنزيل الفيديو (${estimatedSize}) بنجاح`);
      }, 500);

      triggerConfetti();
  };

  const triggerConfetti = () => {
      if (!canvasRef.current) return;
      // Simple mockup confetti
      const ctx = canvasRef.current.getContext('2d');
      if (!ctx) return;
      ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      for(let i=0; i<100; i++) {
          ctx.fillStyle = `hsl(${Math.random() * 360}, 100%, 50%)`;
          ctx.beginPath();
          ctx.arc(Math.random() * canvasRef.current.width, Math.random() * canvasRef.current.height, Math.random() * 5 + 2, 0, Math.PI * 2);
          ctx.fill();
      }
      setTimeout(() => {
          if (canvasRef.current) {
              const c = canvasRef.current.getContext('2d');
              c?.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
          }
      }, 3000);
  };

  if (!exportVideoModal) return null;

  return (
    <div className="fixed inset-0 z-[10000] bg-black/70 flex items-center justify-center backdrop-blur-md p-4 transition-all">
        {/* Render Progress State */}
        {exportStatus === 'rendering' && (
            <div className="bg-[#0f172a]/90 backdrop-blur-xl rounded-2xl border border-gray-700 p-8 w-full max-w-lg shadow-[0_0_50px_rgba(59,130,246,0.3)] flex flex-col items-center animate-fade-in-up">
                <div className="w-20 h-20 mb-6 relative">
                    <div className="absolute inset-0 border-4 border-blue-500/20 rounded-full"></div>
                    <div className="absolute inset-0 border-4 border-blue-500 rounded-full border-t-transparent animate-spin"></div>
                    <i className="fa-solid fa-rocket absolute inset-0 m-auto w-6 h-6 text-blue-400 text-2xl flex items-center justify-center"></i>
                </div>
                <h2 className="text-2xl font-bold font-cairo text-white mb-2">جاري الرندر والتصدير...</h2>
                <p className="text-gray-400 text-sm mb-8 text-center">يرجى عدم إغلاق هذه النافذة أو المتصفح حتى تنتهي العملية.</p>
                
                <div className="w-full bg-gray-800 rounded-full h-4 mb-2 overflow-hidden border border-gray-700">
                    <div className="bg-gradient-to-r from-blue-600 to-purple-500 h-full transition-all duration-100 ease-out relative" style={{width: `${progress}%`}}>
                        <div className="absolute inset-0 bg-white/20 animate-pulse"></div>
                    </div>
                </div>
                
                <div className="flex justify-between w-full text-xs font-mono text-gray-400">
                    <span>{progress.toFixed(1)}%</span>
                    <span>الوقت المتبقي: <span className="text-blue-400 font-bold">{eta}</span></span>
                </div>
                
                <button onClick={() => setExportStatus('idle')} className="mt-8 px-6 py-2 rounded-lg border border-red-500/50 text-red-400 hover:bg-red-500/10 transition-colors text-sm">
                    إلغاء العملية
                </button>
            </div>
        )}

        {/* Render Done State */}
        {exportStatus === 'done' && (
            <div className="bg-[#0f172a]/95 backdrop-blur-xl rounded-2xl border border-green-500/30 p-8 w-full max-w-lg shadow-[0_0_50px_rgba(34,197,94,0.2)] flex flex-col items-center animate-fade-in-up relative overflow-hidden">
                <canvas ref={canvasRef} width={500} height={400} className="absolute inset-0 pointer-events-none z-0"></canvas>
                
                <div className="w-20 h-20 mb-6 bg-green-500/20 rounded-full flex items-center justify-center border border-green-500/50 z-10">
                    <i className="fa-solid fa-check text-4xl text-green-400"></i>
                </div>
                <h2 className="text-3xl font-bold font-cairo text-white mb-2 z-10">تم بدء التصدير! 🎉</h2>
                <p className="text-gray-400 text-sm mb-8 text-center z-10">تم فتح نافذة التصدير المستقلة بنجاح.</p>
                
                <div className="flex flex-col gap-3 w-full z-10">
                    <button onClick={() => setExportVideoModal(false)} className="w-full py-3 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold transition-all flex items-center justify-center gap-2 shadow-lg">
                        <i className="fa-solid fa-check text-lg"></i> إغلاق النافذة
                    </button>
                </div>
                
                <button onClick={() => setExportVideoModal(false)} className="mt-6 text-gray-500 hover:text-white transition-colors text-sm z-10 underline">
                    العودة للمشروع
                </button>
            </div>
        )}

        {/* Main Export Settings State */}
        {exportStatus === 'idle' && (
            <div className="bg-[#0f172a]/90 backdrop-blur-xl rounded-2xl border border-gray-700 w-full max-w-4xl shadow-2xl flex overflow-hidden animate-fade-in-up font-cairo" dir="rtl">
                
                {/* Left Side: Settings Panel */}
                <div className="w-2/3 p-6 flex flex-col h-[80vh] overflow-y-auto custom-scrollbar">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-xl font-bold text-white flex items-center gap-2">
                            <i className="fa-solid fa-rocket text-blue-500"></i> إعدادات التصدير الاحترافية
                        </h2>
                        {draftMode && <span className="bg-yellow-500/20 text-yellow-500 border border-yellow-500/50 px-2 py-0.5 rounded text-[10px] font-bold animate-pulse">Draft Mode Active</span>}
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-6">
                        <div className="flex flex-col gap-2">
                            <label className="text-xs text-gray-400 font-bold">صيغة الملف (Format)</label>
                            <select disabled={draftMode} value={format} onChange={e => setFormat(e.target.value)} className="bg-gray-800/80 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white focus:border-blue-500 outline-none backdrop-blur-sm disabled:opacity-50">
                                <option value="mp4">Video (.mp4)</option>
                                <option value="webm">Web Video (.webm)</option>
                                <option value="gif">Animated Image (.gif)</option>
                                <option value="mp3">Audio Only (.mp3)</option>
                            </select>
                        </div>
                        <div className="flex flex-col gap-2">
                            <label className="text-xs text-gray-400 font-bold">الدقة (Resolution)</label>
                            <select disabled={draftMode} value={resolution} onChange={e => setResolution(e.target.value)} className="bg-gray-800/80 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white focus:border-blue-500 outline-none backdrop-blur-sm disabled:opacity-50">
                                <option value="4320">8K UHD (4320p)</option>
                                <option value="2160">4K UHD (2160p)</option>
                                <option value="1080">FHD (1080p)</option>
                                <option value="720">HD (720p)</option>
                                <option value="480">SD (480p)</option>
                                <option value="360">Low (360p)</option>
                                <option value="240">Very Low (240p)</option>
                                <option value="144">Lowest (144p)</option>
                            </select>
                        </div>
                    </div>

                    <div className="mb-6">
                        <label className="text-xs text-gray-400 font-bold mb-2 block">قوالب السوشيال ميديا (Presets)</label>
                        <div className="flex gap-2">
                            <button onClick={() => handlePresetChange('youtube')} className={`flex-1 py-2 rounded-lg border flex flex-col items-center justify-center gap-1 transition-all ${preset === 'youtube' ? 'bg-red-600/20 border-red-500 text-red-400' : 'bg-gray-800/50 border-gray-700 text-gray-400 hover:bg-gray-800'}`}>
                                <i className="fa-brands fa-youtube text-lg"></i>
                                <span className="text-[10px]">YouTube (16:9)</span>
                            </button>
                            <button onClick={() => handlePresetChange('tiktok')} className={`flex-1 py-2 rounded-lg border flex flex-col items-center justify-center gap-1 transition-all ${preset === 'tiktok' ? 'bg-cyan-600/20 border-cyan-500 text-cyan-400' : 'bg-gray-800/50 border-gray-700 text-gray-400 hover:bg-gray-800'}`}>
                                <i className="fa-brands fa-tiktok text-lg"></i>
                                <span className="text-[10px]">TikTok (9:16)</span>
                            </button>
                            <button onClick={() => handlePresetChange('instagram')} className={`flex-1 py-2 rounded-lg border flex flex-col items-center justify-center gap-1 transition-all ${preset === 'instagram' ? 'bg-pink-600/20 border-pink-500 text-pink-400' : 'bg-gray-800/50 border-gray-700 text-gray-400 hover:bg-gray-800'}`}>
                                <i className="fa-brands fa-instagram text-lg"></i>
                                <span className="text-[10px]">Instagram (1:1)</span>
                            </button>
                            <button onClick={() => setPreset('custom')} className={`flex-1 py-2 rounded-lg border flex flex-col items-center justify-center gap-1 transition-all ${preset === 'custom' ? 'bg-blue-600/20 border-blue-500 text-blue-400' : 'bg-gray-800/50 border-gray-700 text-gray-400 hover:bg-gray-800'}`}>
                                <i className="fa-solid fa-sliders text-lg"></i>
                                <span className="text-[10px]">مخصص</span>
                            </button>
                        </div>
                    </div>

                    <div className="bg-gray-800/40 rounded-lg border border-gray-700 p-4 mb-6">
                        <div className="flex justify-between items-center mb-4 cursor-pointer" onClick={() => setAdvancedOpen(!advancedOpen)}>
                            <h3 className="text-sm font-bold text-gray-300">إعدادات متقدمة (Advanced)</h3>
                            <i className={`fa-solid fa-chevron-${advancedOpen ? 'up' : 'down'} text-gray-500 text-xs`}></i>
                        </div>
                        
                        {advancedOpen && (
                            <div className="grid grid-cols-2 gap-4 animate-fade-in-up">
                                <div className="flex flex-col gap-2">
                                    <label className="text-xs text-gray-400">معدل الإطارات (FPS)</label>
                                    <select disabled={draftMode} value={fps} onChange={e => setFps(e.target.value)} className="bg-gray-900 border border-gray-600 rounded px-2 py-1.5 text-xs text-white focus:border-blue-500 outline-none disabled:opacity-50">
                                        <option value="60">60 fps (Smooth)</option>
                                        <option value="30">30 fps (Standard)</option>
                                        <option value="24">24 fps (Cinematic)</option>
                                    </select>
                                </div>
                                <div className="flex flex-col gap-2">
                                    <label className="text-xs text-gray-400">نسبة ضغط الفيديو (Compression)</label>
                                    <select disabled={draftMode} value={quality} onChange={e => setQuality(e.target.value)} className="bg-gray-900 border border-gray-600 rounded px-2 py-1.5 text-xs text-white focus:border-blue-500 outline-none disabled:opacity-50">
                                        <option value="high">عالية الجودة (بدون ضغط تقريباً)</option>
                                        <option value="medium">متوازنة (Medium)</option>
                                        <option value="low">حجم صغير (ضغط عالي)</option>
                                    </select>
                                </div>
                                <div className="col-span-2 flex flex-col gap-2">
                                    <label className="text-xs text-gray-400">نوع الكوديك (Codec)</label>
                                    <select disabled={draftMode} value={codec} onChange={e => setCodec(e.target.value)} className="bg-gray-900 border border-gray-600 rounded px-2 py-1.5 text-xs text-white focus:border-blue-500 outline-none disabled:opacity-50">
                                        <option value="avc">H.264 (الأكثر توافقاً - لا يدعم 8K على كل الأجهزة)</option>
                                        <option value="hevc">HEVC / H.265 (أفضل جودة وحجم - يدعم 8K و 4K بامتياز)</option>
                                        <option value="av1">AV1 (أفضل توافق برمجي للـ 8K بدون الحاجة لكارت شاشة خاص)</option>
                                    </select>
                                </div>
                                <div className="col-span-2 flex items-center justify-between mt-2">
                                    <span className="text-xs text-gray-400">تصدير نطاق محدد فقط (In/Out)</span>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input type="checkbox" className="sr-only peer" checked={exportRange === 'range'} onChange={() => setExportRange(exportRange === 'range' ? 'full' : 'range')} />
                                        <div className="w-9 h-5 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-500"></div>
                                    </label>
                                </div>
                                <div className="col-span-2 flex items-center justify-between">
                                    <span className="text-xs text-gray-400">إضافة علامة مائية (Watermark)</span>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input type="checkbox" className="sr-only peer" checked={watermark} onChange={() => setWatermark(!watermark)} />
                                        <div className="w-9 h-5 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-500"></div>
                                    </label>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="mt-auto pt-4 flex gap-3">
                        <button onClick={handleDraftToggle} className={`flex-1 py-3 rounded-lg border font-bold text-sm transition-all flex items-center justify-center gap-2 ${draftMode ? 'bg-yellow-600/20 border-yellow-500 text-yellow-400 shadow-[0_0_15px_rgba(234,179,8,0.2)]' : 'bg-gray-800/50 border-gray-700 text-gray-400 hover:text-white'}`}>
                            <i className="fa-solid fa-bolt"></i> {draftMode ? 'Draft Mode Active' : 'Fast Draft Export'}
                        </button>
                    </div>

                </div>

                {/* Right Side: Summary & Action */}
                <div className="w-1/3 bg-[#0a0f1d]/90 border-r border-gray-800 p-6 flex flex-col justify-between">
                    
                    <div>
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-gray-400 text-xs font-bold uppercase tracking-wider">ملخص التصدير</h3>
                            <button onClick={() => setExportVideoModal(false)} className="text-gray-500 hover:text-white transition w-6 h-6 flex items-center justify-center bg-gray-800 rounded-full">
                                <i className="fa-solid fa-xmark text-xs"></i>
                            </button>
                        </div>
                        
                        <div className="aspect-video bg-black rounded-lg border border-gray-700 mb-6 flex items-center justify-center relative overflow-hidden shadow-inner">
                            <div className="absolute inset-0 bg-gradient-to-br from-blue-900/20 to-purple-900/20"></div>
                            <i className="fa-solid fa-film text-4xl text-gray-700"></i>
                            {watermark && <div className="absolute bottom-2 right-2 text-[8px] text-white/50 font-mono">AI4Montage</div>}
                        </div>

                        <div className="space-y-4">
                            <div className="flex justify-between border-b border-gray-800 pb-2">
                                <span className="text-gray-500 text-xs">اسم المشروع</span>
                                <span className="text-gray-300 text-xs font-bold truncate max-w-[120px]">{(window as any).__activeProjectId || 'My Project'}</span>
                            </div>
                            <div className="flex justify-between border-b border-gray-800 pb-2">
                                <span className="text-gray-500 text-xs">المدة الزمنية</span>
                                <span className="text-gray-300 text-xs font-mono">{duration.toFixed(1)}s {exportRange === 'range' ? '(Range)' : ''}</span>
                            </div>
                            <div className="flex justify-between border-b border-gray-800 pb-2">
                                <span className="text-gray-500 text-xs">أبعاد الفيديو</span>
                                <span className="text-gray-300 text-xs font-mono">
                                    {preset === 'tiktok' ? `1080x1920` : preset === 'instagram' ? `1080x1080` : `${resolution === '4320' ? 7680 : resolution === '2160' ? 3840 : resolution === '1080' ? 1920 : resolution === '720' ? 1280 : resolution === '480' ? 854 : resolution === '360' ? 640 : resolution === '240' ? 426 : 256}x${resolution}`}
                                </span>
                            </div>
                            <div className="flex justify-between bg-blue-900/20 p-2 rounded border border-blue-500/20">
                                <span className="text-blue-400 text-xs font-bold">الحجم المتوقع</span>
                                <span className="text-blue-400 text-xs font-mono font-bold">{estimatedSize}</span>
                            </div>
                        </div>
                    </div>

                    <div className="pt-6 mt-6 border-t border-gray-800">
                        <button onClick={startRender} className="w-full py-4 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-bold text-lg shadow-[0_0_20px_rgba(59,130,246,0.4)] transition-all transform hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2">
                            <i className="fa-solid fa-download"></i> تصدير (Export)
                        </button>
                        <p className="text-center text-[9px] text-gray-500 mt-3">يتم التصدير باستخدام قدرات الـ GPU الخاصة بجهازك محلياً.</p>
                    </div>

                </div>
            </div>
        )}
    </div>
  );
}
