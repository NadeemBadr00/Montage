import React, { useState, useEffect } from 'react';
import { Clip } from '../../../types/editor.types';

// ✅ P4: Global cache for waveforms to avoid redundant worker tasks and DOM repaints
const waveformCache = new Map<string, string>(); // src -> dataURL
const pendingCallbacks = new Map<string, ((url: string) => void)[]>();
let sharedWaveformWorker: Worker | null = null;

function getWaveformWorker() {
    if (!sharedWaveformWorker) {
        // Use relative path to worker
        sharedWaveformWorker = new Worker(new URL('../../../editor-engine/workers/waveform-worker.ts', import.meta.url), { type: 'module' });
        sharedWaveformWorker.onmessage = (e) => {
            const { src, points, width, height, error } = e.data;
            if (error || !points) {
                console.warn("Waveform worker error, falling back to dummy:", error);
                // Fallback to empty waveform string
                const dummyCanvas = document.createElement('canvas');
                dummyCanvas.width = width;
                dummyCanvas.height = height;
                const dCtx = dummyCanvas.getContext('2d');
                if (dCtx) {
                    dCtx.fillStyle = 'rgba(255, 255, 255, 0.2)';
                    dCtx.fillRect(0, height/2 - 1, width, 2);
                }
                const dataUrl = dummyCanvas.toDataURL();
                waveformCache.set(src, dataUrl);
                const callbacks = pendingCallbacks.get(src) || [];
                callbacks.forEach(cb => cb(dataUrl));
                pendingCallbacks.delete(src);
                return;
            }
            
            // Draw points to canvas (Drawing is very fast, the heavy decode happened in Worker)
            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.fillStyle = 'transparent';
                ctx.fillRect(0, 0, width, height);
                ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
                const amp = height / 2;
                for (let i = 0; i < width; i++) {
                    const min = points[i*2];
                    const max = points[i*2 + 1];
                    ctx.fillRect(i, (1 + min) * amp, 1, Math.max(1, (max - min) * amp));
                }
                const dataUrl = canvas.toDataURL();
                waveformCache.set(src, dataUrl);
                
                // Notify all listeners waiting for this waveform
                const callbacks = pendingCallbacks.get(src) || [];
                callbacks.forEach(cb => cb(dataUrl));
                pendingCallbacks.delete(src);
            }
        };
    }
    return sharedWaveformWorker;
}

// ✅ P3: Global cache and worker for Video Thumbnails
const videoThumbCache = new Map<string, string[]>(); 
const pendingVidCallbacks = new Map<string, ((urls: string[]) => void)[]>();
let sharedThumbWorker: Worker | null = null;

function getThumbWorker() {
    if (!sharedThumbWorker) {
        sharedThumbWorker = new Worker(new URL('../../../editor-engine/workers/thumbnail-worker.ts', import.meta.url), { type: 'module' });
        sharedThumbWorker.onmessage = (e) => {
            const { src, thumbs, fallback, error } = e.data;
            const callbacks = pendingVidCallbacks.get(src) || [];
            
            if (fallback || error) {
                // Tell listeners to use fallback
                callbacks.forEach(cb => cb(['FALLBACK']));
                pendingVidCallbacks.delete(src);
                return;
            }
            
            if (thumbs) {
                videoThumbCache.set(src, thumbs);
                callbacks.forEach(cb => cb(thumbs));
                // Only clear pending if we've received the full 10 thumbs, but we get incremental updates
                // Actually, just let it update progressively. We will keep callbacks alive until 10 thumbs or unmount
            }
        };
    }
    return sharedThumbWorker;
}

// Hook to generate real video thumbnails and audio waveforms in the browser
export function useMediaThumbnail(clip: Clip) {
  const [thumbnails, setThumbnails] = useState<string[]>([]);

  useEffect(() => {
    if (!clip.src) return;

    let isMounted = true;

    if (clip.type === 'video') {
       if (videoThumbCache.has(clip.src)) {
           setThumbnails([...videoThumbCache.get(clip.src)!]);
           return;
       }

       const THUMB_COUNT = 10;
       let useFallback = false;

       const startFallback = () => {
           if (useFallback) return;
           useFallback = true;
           
           const video = document.createElement('video');
           video.src = clip.src;
           video.crossOrigin = 'anonymous';
           video.muted = true;
           
           const generatedThumbs: string[] = [];
           let currentThumbIndex = 0;

           const extractNextFrame = () => {
              if (currentThumbIndex >= THUMB_COUNT || !isMounted) {
                 if (isMounted && generatedThumbs.length > 0) {
                     setThumbnails([...generatedThumbs]);
                     videoThumbCache.set(clip.src, generatedThumbs);
                 }
                 return;
              }
              video.currentTime = (video.duration / THUMB_COUNT) * currentThumbIndex;
           };

           video.onloadeddata = () => extractNextFrame();

           video.onseeked = () => {
              const canvas = document.createElement('canvas');
              canvas.width = 160; canvas.height = 90;
              const ctx = canvas.getContext('2d');
              if (ctx) {
                 ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                 generatedThumbs.push(canvas.toDataURL());
                 if (isMounted) setThumbnails([...generatedThumbs]);
                 currentThumbIndex++;
                 extractNextFrame();
              }
           };
       };

       const onWorkerUpdate = (thumbs: string[]) => {
           if (thumbs[0] === 'FALLBACK') {
               startFallback();
           } else if (isMounted) {
               setThumbnails([...thumbs]);
           }
       };

       if (pendingVidCallbacks.has(clip.src)) {
           pendingVidCallbacks.get(clip.src)!.push(onWorkerUpdate);
       } else {
           pendingVidCallbacks.set(clip.src, [onWorkerUpdate]);
           try {
               const worker = getThumbWorker();
               worker.postMessage({ src: clip.src, thumbCount: THUMB_COUNT, width: 160, height: 90 });
           } catch(e) {
               startFallback();
           }
       }
    } else if (clip.type === 'audio') {
       // ✅ P4: Optimized Waveform Generator via Worker
       if (waveformCache.has(clip.src)) {
           setThumbnails([waveformCache.get(clip.src)!]);
           return;
       }

       const width = 500;
       const height = 50;

       // Register callback for when the worker finishes
       const onReady = (url: string) => {
           if (isMounted) setThumbnails([url]);
       };

       if (pendingCallbacks.has(clip.src)) {
           pendingCallbacks.get(clip.src)!.push(onReady);
       } else {
           pendingCallbacks.set(clip.src, [onReady]);
           try {
               const worker = getWaveformWorker();
               worker.postMessage({ src: clip.src, width, height });
           } catch(e) {
               console.warn("Waveform worker failed, fallback ignored for performance.", e);
           }
       }
    } else if (clip.type === 'image') {
       setThumbnails([clip.src]);
    }

    return () => { isMounted = false; };
  }, [clip.src, clip.type]);

  return thumbnails;
}
