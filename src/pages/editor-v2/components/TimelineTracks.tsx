import React, { useRef } from 'react';
import { useEditorStore } from '../../../store/useEditorStore';
import TrackHeader from './TrackHeader';
import ClipItem from './ClipItem';
import TransitionItem from './TransitionItem';
import { Clip } from '../../../types/editor.types';
import TimelineContextMenu from './TimelineContextMenu';

export default function TimelineTracks() {
  const tracks = useEditorStore(state => state.tracks);
  const headerWidth = useEditorStore(state => state.headerWidth);
  const collapsedTracks = useEditorStore(state => state.collapsedTracks);
  const timelineRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [dropPreview, setDropPreview] = React.useState<{ trackId: number, start: number, duration: number } | null>(null);

  // Lasso Selection State
  const [lassoRect, setLassoRect] = React.useState<{ x: number, y: number, w: number, h: number } | null>(null);
  const [lassoStart, setLassoStart] = React.useState<{ x: number, y: number } | null>(null);

  const handleDragOver = (e: React.DragEvent, trackId: number) => {
      e.preventDefault();
      e.currentTarget.classList.add('bg-gray-700');
      
      const containerRect = document.getElementById('timeline-scroll-area')?.getBoundingClientRect();
      const scrollLeft = document.getElementById('timeline-scroll-area')?.scrollLeft || 0;
      if (containerRect) {
         const currentHeaderWidth = useEditorStore.getState().headerWidth || 140;
         const relativeX = (e.clientX - containerRect.left) + scrollLeft - currentHeaderWidth;
         const pps = (window as any).app?.pixelsPerSecond || 20;
         let dropTime = Math.max(0, relativeX / pps);
         
         // Apply Magnetic Snap
         if ((window as any).app?.getSnapPoint) {
            const snap = (window as any).app.getSnapPoint(dropTime);
            if (snap !== null) dropTime = snap;
         }

         // Fetch actual duration from dragged asset if available
         const asset = useEditorStore.getState().draggedAsset;
         const duration = asset && (asset as any).duration ? (asset as any).duration : 5;
         
         setDropPreview({ trackId, start: dropTime, duration: duration });
      }
  };

  const handleDragLeave = (e: React.DragEvent) => {
      e.currentTarget.classList.remove('bg-gray-700');
      setDropPreview(null);
  };

  const handleDrop = (e: React.DragEvent, trackId: number) => {
    e.preventDefault();
    e.currentTarget.classList.remove('bg-gray-700');
    setDropPreview(null);

    // Support both: HTML5 dataTransfer (external drag) and AssetsPanel custom mousedown drag
    let rawData = e.dataTransfer.getData('application/json');
    let asset: any = null;
    if (rawData) {
        try { asset = JSON.parse(rawData); } catch (_) {}
    }
    // Fallback: AssetsPanel uses custom mousedown drag and sets draggedAsset in the store
    if (!asset) {
        asset = useEditorStore.getState().draggedAsset;
    }

    if (asset && (window as any).app) {
      try {
        const containerRect = document.getElementById('timeline-scroll-area')?.getBoundingClientRect();
        const scrollLeft = document.getElementById('timeline-scroll-area')?.scrollLeft || 0;
        if (containerRect) {
          const currentHeaderWidth = useEditorStore.getState().headerWidth || 140;
          const relativeX = (e.clientX - containerRect.left) + scrollLeft - currentHeaderWidth;
          const pps = (window as any).app.pixelsPerSecond || 20;
          let dropTime = Math.max(0, relativeX / pps);
          
          if ((window as any).app?.getSnapPoint) {
             const snap = (window as any).app.getSnapPoint(dropTime);
             if (snap !== null) dropTime = snap;
          }
          
          const addClipWithDuration = (duration: number) => {
            const groupId = asset.type === 'video' ? `group_${Date.now()}` : undefined;
            const newClip = new (window as any).Clip(`drop_${Date.now()}`, asset.name, dropTime, duration, asset.type, asset.src);
            if (groupId) newClip.groupId = groupId;
            
            const targetTrack = (window as any).app.tracks.find((t: any) => t.id === trackId);
            if (targetTrack) {
              targetTrack.addClip(newClip);
              if ((window as any).app.resolveCollisions) {
                (window as any).app.resolveCollisions(targetTrack.id, newClip);
              }
            }
            if (asset.type === 'video') {
              const audioTrack = (window as any).app.tracks.find((t: any) => t.type === 'audio');
              if (audioTrack) {
                const audioClip = new (window as any).Clip(`drop_a_${Date.now()}`, `${asset.name} [Audio]`, dropTime, duration, 'audio', asset.src);
                audioClip.groupId = groupId;
                audioTrack.addClip(audioClip);
                if ((window as any).app.resolveCollisions) {
                  (window as any).app.resolveCollisions(audioTrack.id, audioClip);
                }
              }
            }
            // saveState AFTER mutation so undo correctly removes the dropped clip
            if ((window as any).app?.saveState) (window as any).app.saveState();
            if ((window as any).app.commitStateToReact) (window as any).app.commitStateToReact();
          };

          if (asset.type === 'transition') {
            if ((window as any).app.addTransition) {
              (window as any).app.addTransition(trackId, dropTime, asset.transitionType || 'cross_dissolve');
            }
          } else if (asset.duration) {
              addClipWithDuration(asset.duration);
          } else if (asset.type === 'video' || asset.type === 'audio') {
            const el = document.createElement(asset.type);
            el.src = asset.src;
            el.onloadedmetadata = () => addClipWithDuration(el.duration || 10);
            el.onerror = () => addClipWithDuration(10);
          } else {
            addClipWithDuration(5);
          }
        }
      } catch (err) {
        console.error("Drop error", err);
      }
    }
  };

  const handleInsertTrack = (index: number) => {
      if ((window as any).app?.handleSmartTrackInsertion) {
          (window as any).app.handleSmartTrackInsertion(index);
      }
  };

  const handleBackgroundMouseDown = (e: React.MouseEvent) => {
    // Left click clears selection and starts lasso
    if (e.button === 0) {
      if ((window as any).app?.selectClip) {
          (window as any).app.selectClip(null);
      }
      setLassoStart({ x: e.clientX, y: e.clientY });
      setLassoRect({
          x: e.clientX - e.currentTarget.getBoundingClientRect().left,
          y: e.clientY - e.currentTarget.getBoundingClientRect().top,
          w: 0,
          h: 0
      });
      useEditorStore.getState().setContextMenu(null);
    }
  };

  React.useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
        if (!lassoStart) return;
        const container = document.getElementById('timeline-scroll-area');
        const trackContainer = timelineRef.current;
        if (!container || !trackContainer) return;
        
        const rect = trackContainer.getBoundingClientRect();
        
        const currentX = e.clientX;
        const currentY = e.clientY;
        
        const x = Math.min(lassoStart.x, currentX) - rect.left;
        const y = Math.min(lassoStart.y, currentY) - rect.top;
        const w = Math.abs(currentX - lassoStart.x);
        const h = Math.abs(currentY - lassoStart.y);
        
        setLassoRect({ x, y, w, h });
    };

    const handleMouseUp = (e: MouseEvent) => {
        if (!lassoStart) return;
        
        if (lassoRect && lassoRect.w > 5 && lassoRect.h > 5) {
            const selectionRect = {
                left: Math.min(lassoStart.x, e.clientX),
                top: Math.min(lassoStart.y, e.clientY),
                right: Math.max(lassoStart.x, e.clientX),
                bottom: Math.max(lassoStart.y, e.clientY)
            };

            const clips = Array.from(document.querySelectorAll('.timeline-clip'));
            const selectedIds: string[] = [];
            clips.forEach(clipEl => {
                const rect = clipEl.getBoundingClientRect();
                const intersect = !(
                    rect.right < selectionRect.left || 
                    rect.left > selectionRect.right || 
                    rect.bottom < selectionRect.top || 
                    rect.top > selectionRect.bottom
                );
                if (intersect) {
                    const id = clipEl.getAttribute('data-clip-id');
                    if (id) selectedIds.push(id);
                }
            });

            if (selectedIds.length > 0 && (window as any).app?.selectClip) {
                (window as any).app.deselectAll();
                selectedIds.forEach(id => {
                    (window as any).app.selectClip(id, true, true); // multi-select = true, forceSelect = true
                });
            }
        } else {
            // Single click on background without dragging: jump playhead!
            const app = (window as any).app;
            if (app && typeof app.seek === 'function') {
                const headerW = useEditorStore.getState().headerWidth;
                const pxPerSec = useEditorStore.getState().pixelsPerSecond;
                const scrollArea = document.getElementById('timeline-scroll-area');
                if (scrollArea) {
                    const scrollAreaRect = scrollArea.getBoundingClientRect();
                    const clickXInViewport = e.clientX - scrollAreaRect.left;
                    const absoluteX = clickXInViewport + scrollArea.scrollLeft;
                    const timeX = absoluteX - headerW;
                    
                    if (timeX >= 0) {
                         app.seek((timeX / pxPerSec) - app.currentTime);
                    }
                }
            }
        }
        
        setLassoStart(null);
        setLassoRect(null);
    };

    if (lassoStart) {
        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [lassoStart, lassoRect]);

  const handleContextMenu = (e: React.MouseEvent, trackId?: number) => {
    e.preventDefault();
    const time = Math.max(0, (e.clientX - headerWidth) / pixelsPerSecond);
    useEditorStore.getState().setContextMenu({
        x: e.clientX,
        y: e.clientY,
        time,
        trackId
    });
  };

  return (
    <div 
      className="relative w-full flex flex-col pb-10" 
      ref={timelineRef}
      onMouseDown={handleBackgroundMouseDown}
      onContextMenu={(e) => handleContextMenu(e)}
    >
      {/* Top Divider for inserting before the first track */}
      <div 
        className="group h-2 -my-1 z-50 relative flex items-center opacity-0 hover:opacity-100 transition-opacity"
      >
          <div className="absolute inset-0 bg-blue-500/20" style={{ left: `${headerWidth}px` }}></div>
          <div className="absolute left-0 h-full flex items-center justify-center" style={{ width: `${headerWidth}px` }}>
              <button 
                className="bg-blue-500 hover:bg-blue-400 text-white text-[10px] px-2 py-0.5 rounded-full cursor-pointer shadow-md transition-colors z-50"
                onClick={() => handleInsertTrack(0)}
              >
                + Add Track
              </button>
          </div>
      </div>

      {tracks.map((track, index) => {
        const isCollapsed = collapsedTracks.has(track.id);
        const currentHeight = isCollapsed ? 28 : (track.height || 96);

        return (
        <React.Fragment key={track.id}>
          <div 
            className={`track-row relative w-full bg-gray-800/80 border-b border-gray-700/50 flex group hover:bg-gray-800 transition-all duration-300 ${isCollapsed ? 'opacity-80' : ''}`}
            style={{ height: `${currentHeight}px` }}
            data-track-id={track.id}
            data-track-type={track.type}
            onDragOver={(e) => handleDragOver(e, track.id)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, track.id)}
            onContextMenu={(e) => {
               e.stopPropagation();
               handleContextMenu(e, track.id);
            }}
          >
            
            {/* Track Header (Fixed Left) */}
            <TrackHeader track={track} />

            <div className="relative flex-grow h-full" style={{ minWidth: '2000px' }}>
              {/* Transitions rendered FIRST (below) so clip handles on top in DOM stacking order */}
              {track.transitions?.map((trans: any) => (
                <TransitionItem 
                  key={trans.id} 
                  transition={trans} 
                  trackId={track.id} 
                />
              ))}

              {track.clips.map((clip: Clip) => (
                <ClipItem 
                  key={clip.id} 
                  clip={clip} 
                  trackId={track.id}
                  colorClass={track.colorClass} 
                />
              ))}
              
              {/* Drop Preview Box */}
              {dropPreview && dropPreview.trackId === track.id && (
                  <div 
                    className="absolute top-1 bottom-1 bg-blue-400/30 border-2 border-dashed border-blue-400/60 rounded-md z-0 pointer-events-none"
                    style={{
                       left: `${dropPreview.start * (useEditorStore.getState().pixelsPerSecond || 20)}px`,
                       width: `${dropPreview.duration * (useEditorStore.getState().pixelsPerSecond || 20)}px`
                    }}
                  />
              )}
            </div>
          </div>
          
          {/* Divider between tracks for insertion */}
          <div 
            className="group h-2 -my-1 z-50 relative flex items-center opacity-0 hover:opacity-100 transition-opacity"
          >
              <div className="absolute inset-0 bg-blue-500/20" style={{ left: `${headerWidth}px` }}></div>
              <div className="absolute left-0 h-full flex items-center justify-center" style={{ width: `${headerWidth}px` }}>
                  <button 
                    className="bg-blue-500 hover:bg-blue-400 text-white text-[10px] px-2 py-0.5 rounded-full cursor-pointer shadow-md transition-colors z-50"
                    onClick={() => handleInsertTrack(index + 1)}
                  >
                    + Add Track
                  </button>
              </div>
          </div>
        </React.Fragment>
      )})}

      {/* Lasso Selection Box */}
      {lassoRect && (
        <div 
          className="absolute bg-blue-500/20 border border-blue-400 z-50 pointer-events-none"
          style={{
            left: `${lassoRect.x}px`,
            top: `${lassoRect.y}px`,
            width: `${lassoRect.w}px`,
            height: `${lassoRect.h}px`,
          }}
        />
      )}

      <TimelineContextMenu />
    </div>
  );
}
