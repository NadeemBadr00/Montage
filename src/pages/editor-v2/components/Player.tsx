import React, { useEffect, useState, useRef } from 'react';
import { useEditorStore } from '../../../store/useEditorStore';
import { CanvasSettingsDropdown } from '../panels/CanvasSettingsDropdown';

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

          {/* ═══════════════════════════════════════════════════════ */}
          {/* Phase 43 — 📐 Advanced Alignment Mini-HUD               */}
          {/* ═══════════════════════════════════════════════════════ */}
          {useEditorStore(state => state.selectedClipIds).size > 1 && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 flex items-center gap-1 bg-[#1e293b]/90 backdrop-blur border border-gray-700 p-1.5 rounded-lg shadow-2xl">
              <button className="w-7 h-7 rounded hover:bg-blue-600 transition-colors text-gray-300 hover:text-white" title="Align Left" onClick={() => (window as any).app?.alignSelectedClips?.('left')}><i className="fa-solid fa-align-left text-[10px]"></i></button>
              <button className="w-7 h-7 rounded hover:bg-blue-600 transition-colors text-gray-300 hover:text-white" title="Align Center X" onClick={() => (window as any).app?.alignSelectedClips?.('center-x')}><i className="fa-solid fa-align-center text-[10px]"></i></button>
              <button className="w-7 h-7 rounded hover:bg-blue-600 transition-colors text-gray-300 hover:text-white" title="Align Right" onClick={() => (window as any).app?.alignSelectedClips?.('right')}><i className="fa-solid fa-align-right text-[10px]"></i></button>
              <div className="w-[1px] h-4 bg-gray-600 mx-1"></div>
              <button className="w-7 h-7 rounded hover:bg-blue-600 transition-colors text-gray-300 hover:text-white" title="Align Top" onClick={() => (window as any).app?.alignSelectedClips?.('top')}><i className="fa-solid fa-arrow-up-to-line text-[10px]"></i></button>
              <button className="w-7 h-7 rounded hover:bg-blue-600 transition-colors text-gray-300 hover:text-white" title="Align Center Y" onClick={() => (window as any).app?.alignSelectedClips?.('center-y')}><i className="fa-solid fa-arrows-up-down text-[10px]"></i></button>
              <button className="w-7 h-7 rounded hover:bg-blue-600 transition-colors text-gray-300 hover:text-white" title="Align Bottom" onClick={() => (window as any).app?.alignSelectedClips?.('bottom')}><i className="fa-solid fa-arrow-down-to-line text-[10px]"></i></button>
            </div>
          )}

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
        
        <div className="w-32 flex justify-end gap-3 items-center">
          <i 
            className="fa-solid fa-camera cursor-pointer text-[11px] text-gray-400 hover:text-white transition-colors"
            onClick={() => {
                const canvas = document.getElementById('preview-canvas') as HTMLCanvasElement;
                if(canvas) {
                    const dataUrl = canvas.toDataURL('image/png');
                    const a = document.createElement('a');
                    a.href = dataUrl;
                    a.download = `montage-snapshot-${Date.now()}.png`;
                    a.click();
                }
            }}
            title="Snapshot Canvas (PNG)"
          ></i>
          <i 
            className={`fa-solid fa-border-all cursor-pointer text-[11px] transition-colors ${useEditorStore(state => state.showRuleOfThirds) ? 'text-blue-400' : 'text-gray-400 hover:text-white'}`}
            onClick={() => useEditorStore.getState().setShowRuleOfThirds(!useEditorStore.getState().showRuleOfThirds)}
            title="Toggle Rule of Thirds"
          ></i>
          <i 
            className={`fa-solid fa-crop-simple cursor-pointer text-[11px] transition-colors ${useEditorStore(state => state.showSafeZones) ? 'text-red-400' : 'text-gray-400 hover:text-white'}`}
            onClick={() => useEditorStore.getState().setShowSafeZones(!useEditorStore.getState().showSafeZones)}
            title="Toggle Safe Zones"
          ></i>
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
