import React from 'react';
import { createPortal } from 'react-dom';
import { Clip } from '../../../types/editor.types';
import { useEditorStore } from '../../../store/useEditorStore';
import { useMediaThumbnail } from '../panels/useMediaThumbnail';
import { ClipSpeedBadge, ClipFadeOverlay } from './ClipOverlays';

interface ClipItemProps {
  clip: Clip;
  trackId: number;
  colorClass: string;
}

export default function ClipItem({ clip, trackId, colorClass }: ClipItemProps) {
  const pixelsPerSecond = useEditorStore(state => state.pixelsPerSecond);
  const selectedClipIds = useEditorStore(state => state.selectedClipIds);
  const highlightedClipId = useEditorStore(state => state.highlightedClipId);
  const activeTool = useEditorStore(state => state.activeTool);
  
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
  // Volume handle state
  const [showVolumeTooltip, setShowVolumeTooltip] = React.useState(false);

  const TRIM_ZONE_PX = 12; // pixels from edge that trigger trim mode

  const handleClipDrag = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.button === 2) return; // Right-click handled by onContextMenu

    const app = (window as any).app;
    const currentActiveTool = useEditorStore.getState().activeTool;

    // ✅ TRIM ZONE DETECTION: Check if mousedown is near left or right edge
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const isNearLeft = clickX <= TRIM_ZONE_PX;
    const isNearRight = clickX >= rect.width - TRIM_ZONE_PX;

    // === Phase 21: ROLLING TOOL — right-edge acts as a roll edit ===
    if (currentActiveTool === 'rolling') {
      // Rolling always trims the right edge like a rolling cut point
      handleTrimDrag(e, isNearLeft ? 'left' : 'right');
      return;
    }

    // === Phase 21: SLIP TOOL — drag changes sourceIn, keeps start+duration ===
    if (currentActiveTool === 'slip') {
      if (app?.saveState) app.saveState();
      const startX = e.clientX;
      const initialSourceIn = (clip as any).sourceIn || 0;
      const moveHandler = (moveEvent: MouseEvent) => {
        const deltaSeconds = (moveEvent.clientX - startX) / pixelsPerSecond;
        const newSourceIn = Math.max(0, initialSourceIn + deltaSeconds);
        useEditorStore.getState().updateClip(clip.id, { sourceIn: newSourceIn } as Partial<Clip>);
        const engineTrack = app?.tracks?.find((t: any) => t.clips.some((c: any) => c.id === clip.id));
        if (engineTrack) {
          const engineClip = engineTrack.clips.find((c: any) => c.id === clip.id);
          if (engineClip) { engineClip.sourceIn = newSourceIn; engineTrack.rebuildTree?.(); app?.requestRedraw?.(); }
        }
        app?.updateClipSourceIn?.(clip.id, newSourceIn);
      };
      const upHandler = () => {
        document.removeEventListener('mousemove', moveHandler);
        document.removeEventListener('mouseup', upHandler);
        app?.commitStateToReact?.();
        app?.saveState?.();
      };
      document.addEventListener('mousemove', moveHandler);
      document.addEventListener('mouseup', upHandler);
      return;
    }

    // === Phase 21: SLIDE TOOL — move clip, push neighbors ===
    if (currentActiveTool === 'slide') {
      if (app?.saveState) app.saveState();
      const startX = e.clientX;
      const initialStart = clip.start;
      const moveHandler = (moveEvent: MouseEvent) => {
        const deltaSeconds = (moveEvent.clientX - startX) / pixelsPerSecond;
        const newStart = Math.max(0, initialStart + deltaSeconds);
        useEditorStore.getState().updateClip(clip.id, { start: newStart });
        if (app) {
          const engineTrack = app.tracks?.find((t: any) => t.clips.some((c: any) => c.id === clip.id));
          if (engineTrack) {
            const engineClip = engineTrack.clips.find((c: any) => c.id === clip.id);
            if (engineClip) {
              engineClip.start = newStart;
              app.resolveCollisions?.(engineTrack.id, engineClip);
              engineTrack.rebuildTree?.();
              app.requestRedraw?.();
            }
          }
          app.slideClip?.(clip.id, deltaSeconds);
        }
      };
      const upHandler = () => {
        document.removeEventListener('mousemove', moveHandler);
        document.removeEventListener('mouseup', upHandler);
        app?.commitStateToReact?.();
        app?.saveState?.();
      };
      document.addEventListener('mousemove', moveHandler);
      document.addEventListener('mouseup', upHandler);
      return;
    }

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
      
      const isMagSnap = useEditorStore.getState().isMagneticMode;
      
      if (isMagSnap) {
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

          // Phase 22: Snap to playhead
          const playheadTime = useEditorStore.getState().currentTime;
          const snapThresholdSec = 10 / pixelsPerSecond; // 10px threshold
          if (Math.abs(newStart - playheadTime) < snapThresholdSec) {
            newStart = playheadTime;
            // Fire snap guide event
            const snapX = (playheadTime * pixelsPerSecond) + (useEditorStore.getState().headerWidth || 140);
            window.dispatchEvent(new CustomEvent('snap-guide', {
              detail: { guides: [{ x: snapX, label: 'Playhead' }] }
            }));
          } else if (Math.abs(newStart - previousClipEnd) < 1.0) {
            // Snap to clip edge guide
            const snapX = (previousClipEnd * pixelsPerSecond) + (useEditorStore.getState().headerWidth || 140);
            window.dispatchEvent(new CustomEvent('snap-guide', {
              detail: { guides: [{ x: snapX, label: 'Clip Edge' }] }
            }));
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

  // Clip type meta
  const TYPE_META: Record<string, { icon: string; gradient: string; accent: string }> = {
    video:  { icon: 'fa-film',            gradient: 'from-indigo-900/90 to-indigo-800/70',  accent: '#6366f1' },
    audio:  { icon: 'fa-music',           gradient: 'from-blue-900/90 to-blue-800/70',     accent: '#3b82f6' },
    image:  { icon: 'fa-image',           gradient: 'from-emerald-900/90 to-emerald-800/70', accent: '#10b981' },
    text:   { icon: 'fa-font',            gradient: 'from-amber-900/90 to-amber-800/70',   accent: '#f59e0b' },
    subtitle: { icon: 'fa-closed-captioning', gradient: 'from-purple-900/90 to-purple-800/70', accent: '#a855f7' },
  };
  const meta = TYPE_META[clip.type] || { icon: 'fa-shapes', gradient: 'from-gray-800/90 to-gray-700/70', accent: '#9ca3af' };
  const clipColor = (clip as any).labelColor || meta.accent;
  const isMuted = (clip as any).properties?.muted || (clip as any).muted;
  const isLocked = (clip as any).locked;

  return (
    <div
      data-clip-id={clip.id}
      className={`timeline-clip group absolute top-1 bottom-1 rounded-md shadow-lg border transition-none select-none overflow-hidden flex flex-col
        ${isSelected ? '!border-yellow-400 !ring-2 !ring-yellow-400/60 brightness-110' : 'border-white/10 hover:border-white/30'}
        ${isHighlighted ? 'ring-4 ring-green-500 scale-[1.02] transition-transform duration-200' : ''}
        ${isMuted ? 'opacity-50' : ''}
      `}
      style={{
        left: `${leftPos}px`,
        width: `${width}px`,
        transform: dragOffsetY !== 0 ? `translateY(${dragOffsetY * 0.3}px)` : 'none',
        zIndex: dragOffsetY !== 0 ? 99 : (isSelected ? 70 : 60),
        pointerEvents: dragOffsetY !== 0 ? 'none' : 'auto',
        cursor: activeTool === 'slip' ? 'ew-resize'
          : activeTool === 'slide' ? 'move'
          : activeTool === 'rolling' ? 'col-resize'
          : edgeHover ? 'col-resize'
          : (isDragging ? 'grabbing' : 'grab'),
        background: (clip as any).labelColor
          ? `linear-gradient(180deg, ${(clip as any).labelColor}35 0%, ${(clip as any).labelColor}15 100%)`
          : `linear-gradient(180deg, ${clipColor}22 0%, ${clipColor}08 100%)`,
        boxShadow: isSelected ? `0 0 0 2px ${clipColor}90, 0 4px 12px rgba(0,0,0,0.5)` : '0 2px 8px rgba(0,0,0,0.4)',
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
      {/* Color label strip at top */}
      <div className="absolute top-0 left-0 right-0 h-[3px] rounded-t-md z-20 flex-shrink-0"
           style={{ background: clipColor, opacity: 0.9 }} />

      {/* Phase 14: Group indicator */}
      {(clip as any).groupId && width > 40 && (
        <div className="absolute top-1 right-1 z-20 pointer-events-none">
          <i className="fa-solid fa-link text-[7px] text-white/50" />
        </div>
      )}

      {/* Phase 14: Note indicator */}
      {(clip as any).note && width > 50 && (
        <div className="absolute top-1 right-4 z-20 pointer-events-none" title={(clip as any).note}>
          <i className="fa-solid fa-note-sticky text-[7px] text-yellow-400/70" />
        </div>
      )}

      {/* Lock indicator */}
      {isLocked && (
        <div className="absolute inset-0 bg-yellow-400/5 z-30 pointer-events-none flex items-center justify-center">
          <i className="fa-solid fa-lock text-yellow-400/60 text-[10px]" />
        </div>
      )}
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

      {/* Phase 12: Speed & Fade overlays */}
      <ClipSpeedBadge clip={clip} width={width} />
      <ClipFadeOverlay clip={clip} width={width} />

      {/* Phase 23: Per-clip volume handle for audio clips */}
      {clip.type === 'audio' && (() => {
          const volume = (clip as any).properties?.volume ?? 100;
          const volumePct = Math.min(200, Math.max(0, volume));
          const lineTopPct = 100 - (volumePct / 200) * 100;

          const handleVolumeDrag = (e: React.MouseEvent) => {
            e.preventDefault();
            e.stopPropagation();
            const app2 = (window as any).app;
            if (app2?.saveState) app2.saveState();
            const startY = e.clientY;
            const startVol = volumePct;
            const trackEl = (e.currentTarget as HTMLElement).closest('.timeline-clip') as HTMLElement;
            const clipHeight = trackEl ? trackEl.getBoundingClientRect().height : 72;
            const moveHandler2 = (me: MouseEvent) => {
              const deltaY = startY - me.clientY;
              const newVol = Math.min(200, Math.max(0, startVol + (deltaY / clipHeight) * 200));
              if (!(clip as any).properties) (clip as any).properties = {};
              (clip as any).properties.volume = Math.round(newVol);
              app2?.updateClipVolume?.(clip.id, Math.round(newVol));
              app2?.commitStateToReact?.();
            };
            const upHandler2 = () => {
              document.removeEventListener('mousemove', moveHandler2);
              document.removeEventListener('mouseup', upHandler2);
              app2?.saveState?.();
            };
            document.addEventListener('mousemove', moveHandler2);
            document.addEventListener('mouseup', upHandler2);
          };

          return (
            <div
              key="vol-handle"
              className="clip-volume-line"
              style={{ top: `${lineTopPct}%` }}
              onMouseDown={handleVolumeDrag}
              onMouseEnter={() => setShowVolumeTooltip(true)}
              onMouseLeave={() => setShowVolumeTooltip(false)}
              title={`Volume: ${Math.round(volumePct)}%`}
            >
              <div className="clip-volume-handle" />
              {showVolumeTooltip && (
                <div className="absolute right-10 top-1/2 -translate-y-1/2 bg-black/90 text-green-400 text-[9px] px-1.5 py-0.5 rounded whitespace-nowrap z-[100] border border-green-500/30 pointer-events-none">
                  🔊 {Math.round(volumePct)}%
                </div>
              )}
            </div>
          );
        })()
      }

      {/* Clip content area */}
      <div className="relative flex items-center gap-1 px-2 flex-1 min-h-0 z-10 mt-[3px]">
        {/* Type icon */}
        {width > 36 && (
          <i className={`fa-solid ${meta.icon} text-[9px] flex-shrink-0`} style={{ color: clipColor, opacity: 0.9 }} />
        )}
        {/* Name */}
        <span className="text-[9px] font-semibold text-white/90 whitespace-nowrap truncate flex-1 drop-shadow-md">
          {clip.type === 'text' ? ((clip as any).text?.slice(0, 30) || clip.name) : clip.name}
        </span>
        {/* Duration badge (only if wide enough) */}
        {width > 80 && (
          <span className="text-[8px] text-white/40 flex-shrink-0 tabular-nums">
            {clip.duration.toFixed(1)}s
          </span>
        )}
        {/* Muted icon */}
        {isMuted && width > 50 && (
          <i className="fa-solid fa-volume-xmark text-[8px] text-red-400/80 flex-shrink-0" />
        )}
      </div>
      
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
