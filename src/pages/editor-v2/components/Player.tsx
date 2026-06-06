import React, { useEffect, useState, useRef } from 'react';
import { useEditorStore } from '../../../store/useEditorStore';

function CanvasSettingsDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  const aspectRatio = useEditorStore(state => state.aspectRatio);
  const resolution = useEditorStore(state => state.resolution);
  const customWidth = useEditorStore(state => state.customWidth);
  const customHeight = useEditorStore(state => state.customHeight);
  const fps = useEditorStore(state => state.fps);
  const setCanvasSettings = useEditorStore(state => state.setCanvasSettings);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleApply = (ar: string, res: string, cw: number, ch: number) => {
      setCanvasSettings(ar, res, cw, ch);

      if (!(window as any).app) return;
      const app = (window as any).app;

      // Get native video dimensions
      let vidW = 1920, vidH = 1080;
      if (window.app?.tracks) {
        let earliest = Infinity, firstClip: any = null;
        window.app.tracks.forEach((t: any) => {
          if (t.type === 'video' || t.type === 'main' || t.type === 'overlay') {
            t.clips.forEach((c: any) => {
              if ((c.type === 'video' || c.type === 'image') && c.start < earliest) {
                earliest = c.start; firstClip = c;
              }
            });
          }
        });
        if (firstClip) {
          const src = window.app.getSourceElement(firstClip);
          if (src?.videoWidth)  { vidW = src.videoWidth;  vidH = src.videoHeight; }
          if (src?.naturalWidth){ vidW = src.naturalWidth; vidH = src.naturalHeight; }
        }
      }

      // ── STEP 1: Determine pixel size from Resolution (independent of AR) ──
      let pxW: number, pxH: number;
      if (res === 'original') {
        // Use native video pixel size
        pxW = vidW; pxH = vidH;
      } else if (res === 'custom') {
        pxW = cw; pxH = ch;
      } else {
        const resMap: Record<string, [number, number]> = {
          '4k':    [3840, 2160],
          '1080p': [1920, 1080],
          '720p':  [1280, 720],
          '480p':  [854,  480],
          '360p':  [640,  360],
          '144p':  [256,  144],
        };
        [pxW, pxH] = resMap[res] ?? [1920, 1080];
      }

      // ── STEP 2: Apply Aspect Ratio (reshape canvas keeping pixel area) ──
      let newW = pxW, newH = pxH;
      if (ar === 'original') {
        // Use video's native ratio at the chosen pixel budget
        const videoAR = vidW / vidH;
        const area = pxW * pxH;
        newW = Math.round(Math.sqrt(area * videoAR));
        newH = Math.round(Math.sqrt(area / videoAR));
      } else if (ar === '16:9') {
        const long = Math.max(pxW, pxH);
        newW = long; newH = Math.round(long * 9 / 16);
      } else if (ar === '9:16') {
        const long = Math.max(pxW, pxH);
        newH = long; newW = Math.round(long * 9 / 16);
      } else if (ar === '1:1') {
        const side = Math.min(pxW, pxH);
        newW = side; newH = side;
      } else if (ar === 'custom') {
        newW = cw; newH = ch;
      }

      const canvas = document.getElementById('preview-canvas') as HTMLCanvasElement;
      if (canvas) {
        setTimeout(() => {
          canvas.width  = newW;
          canvas.height = newH;
          app.canvas = canvas;
          app.requestRedraw?.();
          app.log?.(`Canvas → ${newW}×${newH}`);
        }, 50);
      }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <i 
        className="fa-solid fa-gear text-gray-500 hover:text-white cursor-pointer transition-colors"
        onClick={() => setIsOpen(!isOpen)}
        title="Canvas Settings"
      ></i>
      {isOpen && (
        <div className="absolute left-0 top-full mt-2 w-64 bg-gray-900 border border-gray-700 rounded-md shadow-xl z-50 p-3 flex flex-col gap-3 font-sans cursor-default">
          <div>
            <label className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-1 block">Aspect Ratio</label>
            <select 
              className="w-full bg-gray-800 border border-gray-700 rounded text-xs text-white p-1.5 outline-none cursor-pointer"
              value={aspectRatio}
              onChange={(e) => {
                handleApply(e.target.value, resolution, customWidth, customHeight);
              }}
            >
              <option value="original">Original Video Ratio</option>
              <option value="16:9">16:9 (Landscape - YouTube)</option>
              <option value="9:16">9:16 (Portrait - TikTok/Reels)</option>
              <option value="1:1">1:1 (Square - Instagram)</option>
              <option value="custom">Custom</option>
            </select>
          </div>
          
          <div>
            <label className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-1 block">Project FPS</label>
            <select 
              className="w-full bg-gray-800 border border-gray-700 rounded text-xs text-white p-1.5 outline-none cursor-pointer"
              value={fps}
              onChange={(e) => {
                const newFps = parseInt(e.target.value);
                useEditorStore.getState().setFps(newFps);
              }}
            >
              <option value="24">24 FPS (Cinematic)</option>
              <option value="30">30 FPS (Standard)</option>
              <option value="60">60 FPS (Smooth / Gaming)</option>
            </select>
          </div>
          
          <div>{aspectRatio === 'custom' && (
            <div className="flex gap-2">
              <div className="flex-1">
                <label className="text-[10px] text-gray-400 block mb-1">Width</label>
                <input 
                  type="number" 
                  value={customWidth} 
                  onChange={(e) => {
                    const val = parseInt(e.target.value) || 1920;
                    setCanvasSettings(aspectRatio, resolution, val, customHeight);
                    handleApply(aspectRatio, resolution, val, customHeight);
                  }}
                  className="w-full bg-gray-800 border border-gray-700 rounded text-xs text-white p-1.5 outline-none"
                />
              </div>
              <div className="flex-1">
                <label className="text-[10px] text-gray-400 block mb-1">Height</label>
                <input 
                  type="number" 
                  value={customHeight} 
                  onChange={(e) => {
                    const val = parseInt(e.target.value) || 1080;
                    setCanvasSettings(aspectRatio, resolution, customWidth, val);
                    handleApply(aspectRatio, resolution, customWidth, val);
                  }}
                  className="w-full bg-gray-800 border border-gray-700 rounded text-xs text-white p-1.5 outline-none"
                />
              </div>
            </div>
          )}
          </div>

          <div>
            <label className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-1 block">Resolution (Quality)</label>
            <select 
              className="w-full bg-gray-800 border border-gray-700 rounded text-xs text-white p-1.5 outline-none cursor-pointer"
              value={resolution}
              onChange={(e) => {
                handleApply(aspectRatio, e.target.value, customWidth, customHeight);
              }}
            >
              <option value="original">Native Video Size</option>
              <option value="4k">4K (3840×2160)</option>
              <option value="1080p">1080p (1920×1080)</option>
              <option value="720p">720p (1280×720)</option>
              <option value="480p">480p (854×480)</option>
              <option value="360p">360p (640×360)</option>
              <option value="144p">144p (256×144)</option>
            </select>
          </div>
        </div>
      )}
    </div>
  );
}

function SeekBar() {
  const [localTime, setLocalTime] = React.useState(0);
  const isDragging = React.useRef(false);
  const wasPlaying  = React.useRef(false);
  const duration = useEditorStore(state => state.duration);
  const storeTime = useEditorStore(state => state.currentTime);

  React.useEffect(() => {
    if (!isDragging.current) setLocalTime(storeTime);
  }, [storeTime]);

  // While dragging: update visual only (no engine calls to avoid flood)
  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    setLocalTime(time);
    if ((window as any).app) {
      // Just update the playhead display while dragging
      (window as any).app.currentTime = time;
      (window as any).app.updatePlayheadPosition?.();
    }
  };

  // Pause on drag start
  const handleMouseDown = () => {
    isDragging.current = true;
    const app = (window as any).app;
    if (app) {
      wasPlaying.current = !!app.isPlaying;
      if (app.isPlaying) app.pausePlayback();
    }
  };

  // Accurate seek + optional resume on drag end
  const handleMouseUp = () => {
    isDragging.current = false;
    const app = (window as any).app;
    if (app?.seekToAbsolute) {
      app.seekToAbsolute(localTime, { resume: wasPlaying.current });
    } else if (app) {
      app.currentTime = localTime;
      app.seek?.(0);
      app.renderFrame?.(localTime);
      app.requestRedraw?.();
      if (wasPlaying.current) app.startPlayback?.();
    }
  };

  const percentage = duration > 0 ? (localTime / duration) * 100 : 0;

  return (
    <div dir="ltr" className="w-full h-1.5 bg-gray-800 relative cursor-pointer group flex-shrink-0 z-10 hover:h-2 transition-all">
      {/* Background Track */}
      <div className="absolute inset-0 bg-gray-700/50"></div>
      
      {/* Progress Fill */}
      <div 
        className="h-full bg-red-500 absolute left-0 top-0 pointer-events-none group-hover:bg-red-400 transition-colors" 
        style={{ width: `${percentage}%` }}
      ></div>
      
      {/* Playhead thumb (visible on hover) */}
      <div 
        className="absolute w-3 h-3 bg-red-500 rounded-full top-1/2 -translate-y-1/2 -ml-1.5 pointer-events-none opacity-0 group-hover:opacity-100 shadow-[0_0_8px_rgba(239,68,68,0.8)] transition-opacity"
        style={{ left: `${percentage}%` }}
      ></div>
      
      {/* Hidden native range input for interaction */}
      <input 
        type="range" 
        min={0} 
        max={duration || 1} 
        step={0.01} 
        value={localTime} 
        onChange={handleSeek}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onTouchStart={handleMouseDown}
        onTouchEnd={handleMouseUp}
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" 
      />
    </div>
  );
}


export default function Player() {
  const isPlaying = useEditorStore(state => state.isPlaying);
  const togglePlay = useEditorStore(state => state.togglePlay);
  const resolution = useEditorStore(state => state.resolution);

  // FIX #5: isPlaying is now pushed directly to Zustand by startPlayback/pausePlayback.
  // No polling interval needed anymore.


  const toggleFullscreen = () => {
    // Fullscreen the entire player panel to include the controls
    const wrapper = document.getElementById('player-container');
    if (!wrapper) return;
    
    if (!document.fullscreenElement) {
      wrapper.requestFullscreen().catch(err => {
        console.error(`Error attempting to enable fullscreen: ${err.message}`);
      });
    } else {
      document.exitFullscreen();
    }
  };

  return (
    <div id="player-container" className="editor-panel glow-border-red flex-grow relative overflow-hidden flex flex-col min-w-0 cursor-default bg-[#0a0f1d]">
      <div className="p-2 border-b border-gray-800 font-bold text-[11px] text-gray-300 flex justify-between items-center bg-[#0a0f1d] flex-shrink-0 z-50">
        <span>Canvas</span>
        <CanvasSettingsDropdown />
      </div>

      <div className="flex-grow p-4 flex flex-col items-center justify-center bg-[#0f172a] relative overflow-hidden">
        
        {/* Video Canvas Wrapper */}
        <div 
          id="video-wrapper" 
          className="relative bg-black rounded shadow-2xl overflow-hidden group flex items-center justify-center box-content w-full h-full" 
        >
          <canvas id="preview-canvas" className="w-full h-full object-contain z-10 cursor-default" style={{ imageRendering: resolution === '144p' || resolution === '360p' ? 'pixelated' : 'auto' }}></canvas>
          
          <div id="jkl-overlay" className="absolute top-4 right-4 text-2xl font-bold text-white drop-shadow-md opacity-0 transition-opacity duration-300 pointer-events-none"></div>

          <div id="ai-loading" className="absolute inset-0 bg-black/80 z-20 hidden flex-col items-center justify-center">
            <i className="fa-solid fa-circle-notch fa-spin text-4xl text-cyan-400 mb-2"></i>
            <span className="text-xs font-mono text-cyan-200">Loading AI Model...</span>
          </div>

          {/* Hidden video elements for processing (Must not use display: none for requestVideoFrameCallback) */}
          <div style={{ opacity: 0, position: 'absolute', width: '1px', height: '1px', pointerEvents: 'none', overflow: 'hidden' }}>
            <video id="source-video-a" playsInline preload="auto" crossOrigin="anonymous"></video>
            <video id="source-video-b" playsInline preload="auto" crossOrigin="anonymous"></video>
            <video id="source-video-c" playsInline preload="auto" crossOrigin="anonymous"></video>
            <video id="source-video-d" playsInline preload="auto" crossOrigin="anonymous"></video>
            <video id="source-video-e" playsInline preload="auto" crossOrigin="anonymous"></video>
            <video id="source-video-f" playsInline preload="auto" crossOrigin="anonymous"></video>
            <div id="img-cache"></div>
          </div>
        </div>
      </div>
      
      {/* Video Seek Bar */}
      <SeekBar />

      {/* Minimal Playback Controls */}
      <div dir="ltr" className="h-10 bg-[#0a0f1d] border-t border-gray-800 flex items-center px-4 flex-shrink-0 justify-between">
        
        <div className="w-32">
          <input 
            type="text" 
            id="time-display" 
            defaultValue="00;00;00;00" 
            className="bg-transparent border-none text-[11px] font-mono text-gray-400 focus:outline-none focus:text-white"
            readOnly
          />
        </div>

        <div className="flex items-center gap-4 text-gray-400">
          <button className="hover:text-white transition-colors" title="Home" onClick={() => { if((window as any).app) { (window as any).app.currentTime = 0; (window as any).app.seek(0); (window as any).app.requestRedraw(); } }}>
            <i className="fa-solid fa-backward-step text-[10px]"></i>
          </button>
          <button className="hover:text-white transition-colors" title="Previous Frame" onClick={() => { if((window as any).app) { (window as any).app.pausePlayback(); (window as any).app.seek(-1 / ((window as any).app.FPS || 30)); (window as any).app.requestRedraw(); } }}>
            <i className="fa-solid fa-backward text-[10px]"></i>
          </button>
          <button 
            id="play-pause-btn" 
            className="text-white hover:text-red-500 transition-colors mx-2" 
            title="Play/Pause (Space/K)" 
            onClick={() => {
              if ((window as any).app) (window as any).app.togglePlay();
            }}
          >
            <i className={`fa-solid ${isPlaying ? 'fa-pause' : 'fa-play'} text-sm`}></i>
          </button>
          <button className="hover:text-white transition-colors" title="Next Frame" onClick={() => { if((window as any).app) { (window as any).app.pausePlayback(); (window as any).app.seek(1 / ((window as any).app.FPS || 30)); (window as any).app.requestRedraw(); } }}>
            <i className="fa-solid fa-forward text-[10px]"></i>
          </button>
          <button className="hover:text-white transition-colors" title="End" onClick={() => { if((window as any).app) { (window as any).app.currentTime = (window as any).app.duration; (window as any).app.seek(0); (window as any).app.requestRedraw(); } }}>
            <i className="fa-solid fa-forward-step text-[10px]"></i>
          </button>
        </div>
        
        <div className="w-32 flex justify-end">
          <i 
            className="fa-solid fa-expand text-gray-400 hover:text-white cursor-pointer text-[10px]"
            onClick={toggleFullscreen}
            title="Fullscreen"
          ></i>
        </div>
      </div>

    </div>
  );
}
