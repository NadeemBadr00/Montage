import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Clip } from '../../../types/editor.types';
import { useEditorStore } from '../../../store/useEditorStore';

// Hook to generate real video thumbnails and audio waveforms in the browser
function useMediaThumbnail(clip: Clip) {
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

interface ClipItemProps {
  clip: Clip;
  trackId: number;
  colorClass: string;
}

export default function ClipItem({ clip, trackId, colorClass }: ClipItemProps) {
  const pixelsPerSecond = useEditorStore(state => state.pixelsPerSecond);
  const selectedClipIds = useEditorStore(state => state.selectedClipIds);
  const highlightedClipId = useEditorStore(state => state.highlightedClipId);
  
  const isSelected = selectedClipIds.has(clip.id);
  const isHighlighted = highlightedClipId === clip.id;
  const leftPos = clip.start * pixelsPerSecond;
  const width = clip.duration * pixelsPerSecond;
  
  const [dragOffsetY, setDragOffsetY] = React.useState(0);
  const isDragging = dragOffsetY !== 0;
  const realThumbnails = useMediaThumbnail(clip);
  
  // Hover preview state
  const [hoverState, setHoverState] = React.useState<{x: number, y: number, clipX: number} | null>(null);
  // Edge hover state: 'left' | 'right' | null — for showing trim cursor
  const [edgeHover, setEdgeHover] = React.useState<'left' | 'right' | null>(null);

  const TRIM_ZONE_PX = 12; // pixels from edge that trigger trim mode

  const handleClipDrag = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.button === 2) return; // Right-click handled by onContextMenu

    const app = (window as any).app;

    // ✅ TRIM ZONE DETECTION: Check if mousedown is near left or right edge
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const isNearLeft = clickX <= TRIM_ZONE_PX;
    const isNearRight = clickX >= rect.width - TRIM_ZONE_PX;

    if (isNearLeft || isNearRight) {
      // Route to trim handler directly — no z-index or DOM order issues
      handleTrimDrag(e, isNearLeft ? 'left' : 'right');
      return;
    }

    // Middle-click to cut
    if (e.button === 1) {
        if (app) {
            const track = app.tracks.find((t: any) => t.id === trackId);
            const legacyClip = track?.clips.find((c: any) => c.id === clip.id);
            if (legacyClip && track) {
                if (app.saveState) app.saveState();
                app.performSplit(legacyClip, track, e.nativeEvent);
            }
        }
        return;
    }

    if (app && (app.activeTool === 'razor' || app.activeTool === 'cut')) {
        const track = app.tracks.find((t: any) => t.id === trackId);
        const legacyClip = track?.clips.find((c: any) => c.id === clip.id);
        if (legacyClip && track) {
            app.performSplit(legacyClip, track, e.nativeEvent);
        }
        return;
    }

    // Save undo snapshot before any mutation
    if (app?.saveState) app.saveState();

    const startX = e.clientX;
    const startY = e.clientY;
    const initialStart = clip.start;
    
    // Select the clip
    if ((window as any).app?.selectClip) {
       (window as any).app.selectClip(clip.id, e.shiftKey || e.ctrlKey);
    }
    
    // Get initial starts of all selected clips (including this one, newly selected)
    const initialStarts: Record<string, number> = {};
    const selectedIds = useEditorStore.getState().selectedClipIds;
    useEditorStore.getState().tracks.forEach(t => {
        t.clips.forEach(c => {
            if (selectedIds.has(c.id) || c.id === clip.id) {
                initialStarts[c.id] = c.start;
            }
        });
    });

    let currentTargetTrackId = trackId;
    let hasMoved = false;

    const moveHandler = (moveEvent: MouseEvent) => {
      hasMoved = true;
      const deltaX = moveEvent.clientX - startX;
      const deltaY = moveEvent.clientY - startY;
      
      const deltaSeconds = deltaX / pixelsPerSecond;
      let newStart = Math.max(0, initialStart + deltaSeconds);
      
      const isMagneticMode = useEditorStore.getState().isMagneticMode;
      
      if (isMagneticMode) {
          const trackClips = useEditorStore.getState().tracks.find(t => t.id === trackId)?.clips || [];
          let previousClipEnd = 0;
          trackClips.forEach(c => {
              if (c.id !== clip.id) {
                  const cEnd = c.start + c.duration;
                  if (cEnd <= newStart + 2 && cEnd > previousClipEnd) {
                      previousClipEnd = cEnd;
                  }
              }
          });
          // Only snap if we are within 1 second of the previous clip's end
          if (Math.abs(newStart - previousClipEnd) < 1.0) {
              newStart = previousClipEnd;
          }
      } else {
          // Standard Snap
          if ((window as any).app?.getSnapPoint) {
             const snap = (window as any).app.getSnapPoint(newStart, [{ id: clip.id }]);
             if (snap !== null) newStart = snap;
          }
      }
      
      const offset = newStart - initialStart;
      
      const app = (window as any).app;
      
      Object.keys(initialStarts).forEach(id => {
          const base = initialStarts[id];
          const newPos = Math.max(0, base + offset);
          useEditorStore.getState().updateClip(id, { start: newPos });
          
          if (app) {
             const engineTrack = app.tracks.find((t: any) => t.clips.some((c: any) => c.id === id));
             if (engineTrack) {
               const engineClip = engineTrack.clips.find((c: any) => c.id === id);
               if (engineClip) {
                 engineClip.start = newPos;
                 engineTrack.rebuildTree();
               }
             }
          }
      });
      
      if (app) app.requestRedraw();
      
      setDragOffsetY(deltaY);
      
      // Track hover detection
      const elementsBelow = document.elementsFromPoint(moveEvent.clientX, moveEvent.clientY);
      const trackRowEl = elementsBelow.find(el => el.classList.contains('track-row'));
      
      if (trackRowEl) {
        const hoveredTrackId = parseInt(trackRowEl.getAttribute('data-track-id') || '0');
        const hoveredTrackType = trackRowEl.getAttribute('data-track-type');
        
        let isValidTarget = false;
        if (clip.type === 'audio' && hoveredTrackType === 'audio') isValidTarget = true;
        if ((clip.type === 'video' || clip.type === 'image' || clip.type === 'text') && 
            (hoveredTrackType === 'video' || hoveredTrackType === 'main' || hoveredTrackType === 'overlay' || hoveredTrackType === 'subtitle')) isValidTarget = true;
            
        if (isValidTarget) {
            currentTargetTrackId = hoveredTrackId;
        }
      }
    };

    const upHandler = () => {
      document.removeEventListener('mousemove', moveHandler);
      document.removeEventListener('mouseup', upHandler);
      setDragOffsetY(0);
      
      if (currentTargetTrackId !== trackId) {
          useEditorStore.getState().moveClipToTrack(clip.id, trackId, currentTargetTrackId);
          if ((window as any).app) {
              const track = (window as any).app.tracks.find((t: any) => t.clips.some((c: any) => c.id === clip.id));
              if (track) {
                  const legacyClip = track.clips.find((c: any) => c.id === clip.id);
                  if (legacyClip) {
                      (window as any).app.moveClipToTrack(legacyClip, currentTargetTrackId);
                  }
              }
          }
      }
      
      // Update legacy engine state so the Canvas reads the correct time
      if ((window as any).app) {
         const track = (window as any).app.tracks.find((t: any) => t.clips.some((c: any) => c.id === clip.id));
         if (track) {
           const legacyClip = track.clips.find((c: any) => c.id === clip.id);
           const stateClip = useEditorStore.getState().tracks.flatMap(t => t.clips).find(c => c.id === clip.id);
           if (legacyClip && stateClip) {
               legacyClip.start = stateClip.start;
               legacyClip.duration = stateClip.duration;
               legacyClip.sourceIn = stateClip.sourceIn;
               if ((window as any).app.resolveCollisions) {
                   (window as any).app.resolveCollisions(track.id, legacyClip);
               }
           }
           track.rebuildTree();
         }
         if ((window as any).app.renderAll) (window as any).app.renderAll();
         (window as any).app.commitStateToReact();
      }
      
      // If it was just a click (no drag), move the playhead to that exact spot
      if (!hasMoved) {
          const rect = (e.target as HTMLElement).closest('.timeline-clip')?.getBoundingClientRect();
          if (rect) {
              const clickX = e.clientX - rect.left;
              const clickTime = clip.start + (clickX / pixelsPerSecond);
              if ((window as any).app?.setCurrentTime) {
                  (window as any).app.setCurrentTime(clickTime);
              }
          }
      } else {
          // Save AFTER mutation to ensure localStorage has the final post-drag state
          if ((window as any).app?.saveState) (window as any).app.saveState();
      }
    };

    document.addEventListener('mousemove', moveHandler);
    document.addEventListener('mouseup', upHandler);
  };

  const handleTrimDrag = (e: React.MouseEvent, type: 'left' | 'right') => {
    e.preventDefault();
    e.stopPropagation();

    // Save undo snapshot before any mutation
    if ((window as any).app?.saveState) (window as any).app.saveState();

    const startX = e.clientX;
    const initialStart = clip.start;
    const initialDuration = clip.duration;
    const initialSourceIn = clip.sourceIn || 0;
    
    if ((window as any).app?.selectClip) {
       (window as any).app.selectClip(clip.id);
    }

    const moveHandler = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.clientX - startX;
      const deltaSeconds = deltaX / pixelsPerSecond;
      
      let newStart = initialStart;
      let newDuration = initialDuration;
      let newSourceIn = initialSourceIn;
      
      if (type === 'right') {
          newDuration = Math.max(0.1, initialDuration + deltaSeconds);
          
          if (clip.type === 'video' || clip.type === 'audio') {
              // Assume original duration is clip.duration + clip.sourceIn if sourceDuration is undefined
              const maxDuration = (clip as any).sourceDuration || 9999;
              const maxAllowed = maxDuration - newSourceIn;
              if (newDuration > maxAllowed && maxDuration !== 9999) {
                  newDuration = maxAllowed;
              }
          }
      } else if (type === 'left') {
          let proposedDelta = deltaSeconds;
          
          if (initialDuration - proposedDelta < 0.1) {
              proposedDelta = initialDuration - 0.1;
          }
          
          if (clip.type === 'video' || clip.type === 'audio') {
              if (initialSourceIn + proposedDelta < 0) {
                  proposedDelta = -initialSourceIn; 
              }
          }
          
          newStart = initialStart + proposedDelta;
          newDuration = initialDuration - proposedDelta;
          newSourceIn = initialSourceIn + proposedDelta;
      }
      
      useEditorStore.getState().updateClip(clip.id, { 
          start: newStart, 
          duration: newDuration, 
          sourceIn: newSourceIn 
      });

      // FIX 1: Also update the engine clip in real-time during trim so
      // the canvas preview stays in sync with the React timeline during trim.
      const app2 = (window as any).app;
      if (app2) {
        const engineTrack2 = app2.tracks.find((t: any) => t.clips.some((c: any) => c.id === clip.id));
        if (engineTrack2) {
          const engineClip2 = engineTrack2.clips.find((c: any) => c.id === clip.id);
          if (engineClip2) {
            engineClip2.start = newStart;
            engineClip2.duration = newDuration;
            engineClip2.sourceIn = newSourceIn;
            engineTrack2.rebuildTree();
            app2.requestRedraw();
          }
        }
      }
    };

    const upHandler = () => {
      document.removeEventListener('mousemove', moveHandler);
      document.removeEventListener('mouseup', upHandler);
            if ((window as any).app) {
           const track = (window as any).app.tracks.find((t: any) => t.clips.some((c: any) => c.id === clip.id));
           if (track) {
             const legacyClip = track.clips.find((c: any) => c.id === clip.id);
             const stateClip = useEditorStore.getState().tracks.flatMap(t => t.clips).find(c => c.id === clip.id);
             if (legacyClip && stateClip) {
                 legacyClip.start = stateClip.start;
                 legacyClip.duration = stateClip.duration;
                 legacyClip.sourceIn = stateClip.sourceIn;
                 if ((window as any).app.resolveCollisions) {
                     (window as any).app.resolveCollisions(track.id, legacyClip);
                 }
             }
             track.rebuildTree();
           }
           if ((window as any).app.renderAll) (window as any).app.renderAll();
           (window as any).app.commitStateToReact();
           // Save AFTER mutation to ensure localStorage has the final post-trim state
           if ((window as any).app.saveState) (window as any).app.saveState();
        }
    };

    document.addEventListener('mousemove', moveHandler);
    document.addEventListener('mouseup', upHandler);
  };

  // Smart transition handle: short tap (<300ms) = add transition, long press = ignored
  const handleTransitionHandlePointerDown = (e: React.PointerEvent, type: 'start' | 'end') => {
    e.preventDefault();
    e.stopPropagation();
    const pressStart = Date.now();
    const target = e.currentTarget as HTMLElement;
    target.setPointerCapture(e.pointerId);
    target.classList.add('scale-125');

    const onUp = (upE: PointerEvent) => {
      target.classList.remove('scale-125');
      target.removeEventListener('pointerup', onUp);
      target.removeEventListener('pointercancel', onUp);
      const elapsed = Date.now() - pressStart;
      if (elapsed < 300) {
        // Short tap → add transition, passing 'edge' so engine anchors it to THIS clip
        const app = (window as any).app;
        if (app?.addSmartTransition) {
          const time = type === 'start' ? clip.start : clip.start + clip.duration;
          app.addSmartTransition(trackId, time, type); // ← pass edge hint
          if (app.renderAll) app.renderAll();
        }
      }
      // Long press → do nothing (user was trying to drag/trim)
    };
    target.addEventListener('pointerup', onUp);
    target.addEventListener('pointercancel', onUp);
  };


  const handleMouseMove = (e: React.MouseEvent) => {
      const rect = e.currentTarget.getBoundingClientRect();
      const clipX = e.clientX - rect.left;
      setHoverState({
          x: e.clientX,
          y: rect.top,
          clipX
      });
      // Detect edge proximity for cursor change
      if (clipX <= TRIM_ZONE_PX) setEdgeHover('left');
      else if (clipX >= rect.width - TRIM_ZONE_PX) setEdgeHover('right');
      else setEdgeHover(null);
  };
  const handleMouseLeave = () => { setHoverState(null); setEdgeHover(null); };

  const hoverTime = hoverState ? clip.start + (hoverState.clipX / pixelsPerSecond) : 0;
  
  // Find which thumbnail to show based on hoverTime relative to clip duration
  const hoverProgress = clip.duration > 0 ? (hoverTime - clip.start) / clip.duration : 0;
  const thumbIndex = realThumbnails.length > 0 
      ? Math.max(0, Math.min(realThumbnails.length - 1, Math.floor(hoverProgress * realThumbnails.length))) 
      : 0;
  const currentHoverThumb = realThumbnails[thumbIndex];

  return (
    <div
      data-clip-id={clip.id}
      className={`timeline-clip group absolute top-1 bottom-1 rounded-md shadow-md border flex items-center px-2 transition-none select-none
        ${colorClass} 
        ${isSelected ? '!border-yellow-400 !ring-2 !ring-yellow-400/50 brightness-110' : 'border-white/20 hover:border-white/50'}
        ${isHighlighted ? 'animate-pulse ring-4 ring-green-500 scale-[1.02] transition-transform duration-200' : ''}
      `}
      style={{
        left: `${leftPos}px`,
        width: `${width}px`,
        transform: dragOffsetY !== 0 ? `translateY(${dragOffsetY}px)` : 'none',
        zIndex: dragOffsetY !== 0 ? 99 : (isSelected ? 70 : 60),
        pointerEvents: dragOffsetY !== 0 ? 'none' : 'auto',
        // Dynamic cursor: col-resize when near edge, grab otherwise
        cursor: edgeHover ? 'col-resize' : (isDragging ? 'grabbing' : 'grab'),
      }}
      onMouseDown={handleClipDrag}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onContextMenu={(e) => {
         e.preventDefault();
         e.stopPropagation();
         useEditorStore.getState().setContextMenu({
             x: e.clientX,
             y: e.clientY,
             clipId: clip.id,
             trackId: trackId
         });
      }}
    >
      {/* Hover Line & Tooltip */}
      {hoverState && !isDragging && (
          <>
            <div 
               className="absolute top-0 bottom-0 w-[1px] bg-red-500 z-[70] pointer-events-none"
               style={{ left: `${hoverState.clipX}px` }}
            />
            {createPortal(
              <div 
                className="fixed -translate-x-1/2 -translate-y-full pb-2 z-[9999] flex flex-col items-center pointer-events-none drop-shadow-2xl"
                style={{ left: `${hoverState.x}px`, top: `${hoverState.y}px` }}
              >
                 {currentHoverThumb && clip.type !== 'audio' && (
                     <div className="w-24 h-[54px] bg-black border border-gray-500 rounded shadow-lg overflow-hidden mb-1">
                        <img src={currentHoverThumb} className="w-full h-full object-cover" />
                     </div>
                 )}
                 <div className="bg-black/90 text-white text-[10px] px-1.5 py-0.5 rounded shadow whitespace-nowrap border border-gray-700">
                    {hoverTime.toFixed(2)}s
                 </div>
              </div>,
              document.body
            )}
          </>
      )}

      {/* Background Overlays Container */}
      <div className="absolute inset-0 rounded-md overflow-hidden pointer-events-none z-0">
          {/* Video Filmstrip / Thumbnail Overlay */}
          {(clip.type === 'video' || clip.type === 'image') && (
             <div className="absolute inset-0 pointer-events-none flex opacity-100 overflow-hidden">
                {realThumbnails.length > 0 ? realThumbnails.map((thumb, idx) => (
                    <img key={idx} src={thumb} className="h-full object-cover flex-1" style={{ minWidth: 0, userSelect: 'none' }} draggable="false" />
                )) : (
                    <div className="w-full h-full opacity-60 mix-blend-overlay" style={{ backgroundImage: `repeating-linear-gradient(90deg, rgba(0,0,0,0.8) 0px, rgba(0,0,0,0.8) 2px, transparent 2px, transparent 40px)` }} />
                )}
             </div>
          )}

          {/* Audio Waveform Overlay */}
          {clip.type === 'audio' && (
             <div 
               className="absolute inset-0 opacity-50 pointer-events-none"
               style={{
                 backgroundImage: realThumbnails[0] ? `url(${realThumbnails[0]})` : `repeating-linear-gradient(90deg, transparent 0px, transparent 2px, #fff 2px, #fff 4px)`,
                 backgroundSize: realThumbnails[0] ? '100% 100%' : '8px 100%',
                 backgroundRepeat: 'no-repeat',
                 backgroundPosition: 'center',
               }}
             />
          )}
      </div>

      <span className="text-[9px] font-bold text-white whitespace-nowrap truncate drop-shadow-md overflow-hidden flex-1 relative z-10 px-1 py-0.5 bg-black/30 rounded">
        {clip.name}
      </span>
      
      {/* Trim Edge Handles — VISUAL ONLY (pointer-events:none)
          Trim logic is handled by handleClipDrag via TRIM_ZONE_PX detection */}
      <div 
        className="clip-handle absolute left-0 top-0 bottom-0 w-3 bg-white/40 transition-opacity z-[10] flex items-center justify-center shadow-[2px_0_6px_rgba(0,0,0,0.6)] border-r border-black/40 rounded-l-md pointer-events-none" 
        style={{ opacity: edgeHover === 'left' || hoverState ? 1 : 0 }}
      >
          <div className="w-0.5 h-5 bg-white/80 rounded-full" />
      </div>
      <div 
        className="clip-handle absolute right-0 top-0 bottom-0 w-3 bg-white/40 transition-opacity z-[10] flex items-center justify-center shadow-[-2px_0_6px_rgba(0,0,0,0.6)] border-l border-black/40 rounded-r-md pointer-events-none" 
        style={{ opacity: edgeHover === 'right' || hoverState ? 1 : 0 }}
      >
          <div className="w-0.5 h-5 bg-white/80 rounded-full" />
      </div>

      {/* ─── Transition Handles (bottom corners of the clip) ─────────────────────
           • Triangle-shaped, sits in the bottom-left / bottom-right corner
           • Short tap  (<300ms) → addSmartTransition at that edge
           • Long press (≥300ms) → ignored, user is trimming/dragging
           • Only visible on hover, never interferes with trim or drag zones
      ──────────────────────────────────────────────────────────────────────── */}
      {clip.type !== 'audio' && width > 28 && (
        <>
          {/* LEFT handle — bottom-left triangle */}
          <div
            className="absolute bottom-0 left-0 z-[65] opacity-0 group-hover:opacity-100 transition-opacity duration-150 touch-none select-none"
            style={{
              width: 14,
              height: 14,
              cursor: 'pointer',
              clipPath: 'polygon(0 100%, 100% 100%, 0 0)',
              background: 'linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%)',
              borderBottomLeftRadius: 4,
              boxShadow: '1px -1px 4px rgba(0,0,0,0.5)',
            }}
            title="Tap to add transition at start"
            onPointerDown={(e) => handleTransitionHandlePointerDown(e, 'start')}
          />

          {/* RIGHT handle — bottom-right triangle */}
          <div
            className="absolute bottom-0 right-0 z-[65] opacity-0 group-hover:opacity-100 transition-opacity duration-150 touch-none select-none"
            style={{
              width: 14,
              height: 14,
              cursor: 'pointer',
              clipPath: 'polygon(100% 100%, 0 100%, 100% 0)',
              background: 'linear-gradient(225deg, #f59e0b 0%, #fbbf24 100%)',
              borderBottomRightRadius: 4,
              boxShadow: '-1px -1px 4px rgba(0,0,0,0.5)',
            }}
            title="Tap to add transition at end"
            onPointerDown={(e) => handleTransitionHandlePointerDown(e, 'end')}
          />
        </>
      )}
    </div>
  );
}
