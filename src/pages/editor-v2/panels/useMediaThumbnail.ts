import React, { useState, useEffect } from 'react';
import { Clip } from '../../../types/editor.types';

// Hook to generate real video thumbnails and audio waveforms in the browser
export function useMediaThumbnail(clip: Clip) {
  const [thumbnails, setThumbnails] = useState<string[]>([]);

  useEffect(() => {
    if (!clip.src) return;

    let isMounted = true;

    if (clip.type === 'video') {
       const video = document.createElement('video');
       video.src = clip.src;
       video.crossOrigin = 'anonymous';
       video.muted = true;
       
       const THUMB_COUNT = 10;
       const generatedThumbs: string[] = [];
       let currentThumbIndex = 0;

       video.onloadeddata = () => {
          extractNextFrame();
       };

       const extractNextFrame = () => {
          if (currentThumbIndex >= THUMB_COUNT || !isMounted) {
             if (isMounted && generatedThumbs.length > 0) setThumbnails([...generatedThumbs]);
             return;
          }
          // Distribute frames evenly across the duration
          const time = (video.duration / THUMB_COUNT) * currentThumbIndex;
          video.currentTime = time;
       };

       video.onseeked = () => {
          const canvas = document.createElement('canvas');
          canvas.width = 160;
          canvas.height = 90;
          const ctx = canvas.getContext('2d');
          if (ctx) {
             ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
             generatedThumbs.push(canvas.toDataURL());
             
             // Progressive update so the user sees thumbnails loading one by one
             if (isMounted) setThumbnails([...generatedThumbs]);
             
             currentThumbIndex++;
             extractNextFrame();
          }
       };
    } else if (clip.type === 'audio') {
       // Basic Waveform generator
       const generateWaveform = async () => {
          try {
             const response = await fetch(clip.src);
             const arrayBuffer = await response.arrayBuffer();
             const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
             const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
             
             const channelData = audioBuffer.getChannelData(0);
             const canvas = document.createElement('canvas');
             canvas.width = 500;
             canvas.height = 50;
             const ctx = canvas.getContext('2d');
             if (ctx) {
                 ctx.fillStyle = 'transparent';
                 ctx.fillRect(0, 0, canvas.width, canvas.height);
                 ctx.fillStyle = 'rgba(255, 255, 255, 0.7)'; // White waveform
                 const step = Math.ceil(channelData.length / canvas.width);
                 const amp = canvas.height / 2;
                 for (let i = 0; i < canvas.width; i++) {
                     let min = 1.0;
                     let max = -1.0;
                     for (let j = 0; j < step; j++) {
                         const datum = channelData[(i * step) + j];
                         if (datum < min) min = datum;
                         if (datum > max) max = datum;
                     }
                     // draw vertical bar
                     ctx.fillRect(i, (1 + min) * amp, 1, Math.max(1, (max - min) * amp));
                 }
                 if (isMounted) setThumbnails([canvas.toDataURL()]);
             }
          } catch(e) {
             console.error("Waveform error", e);
          }
       };
       generateWaveform();
    } else if (clip.type === 'image') {
       setThumbnails([clip.src]);
    }

    return () => { isMounted = false; };
  }, [clip.src, clip.type]);

  return thumbnails;
}
