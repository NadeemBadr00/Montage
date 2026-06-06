import React, { useEffect, useState, useRef } from 'react';
import { useEditorStore } from '../../../store/useEditorStore';

export function CanvasSettingsDropdown() {
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
