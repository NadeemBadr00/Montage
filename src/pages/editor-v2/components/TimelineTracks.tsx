import React, { useRef, useState } from 'react';
import { useEditorStore } from '../../../store/useEditorStore';
import TimelineTrackHeader from './TimelineTrackHeader';
import TrackHeader from './TrackHeader';
import ClipItem from './ClipItem';
import TransitionItem from './TransitionItem';
import KeyframeLane from './KeyframeLane';
import { Clip } from '../../../types/editor.types';
import TimelineContextMenu from './TimelineContextMenu';
import { useTimelineDrop } from '../panels/useTimelineDrop';

export default function TimelineTracks() {
  const tracks = useEditorStore(state => state.tracks);
  const headerWidth = useEditorStore(state => state.headerWidth);
  const pixelsPerSecond = useEditorStore(state => state.pixelsPerSecond); // ✅ P5
  const collapsedTracks = useEditorStore(state => state.collapsedTracks);
  const timelineRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [trackHeights, setTrackHeights] = useState<Record<string, number>>({});

  const getTrackHeight = (track: any, isCollapsed: boolean) => {
    if (isCollapsed) return 28;
    return trackHeights[track.id] || track.height || 72;
  };

  const handleHeightChange = (idx: number, h: number) => {
    const track = tracks[idx];
    if (track) {
      setTrackHeights(prev => ({ ...prev, [track.id]: h }));
      track.height = h; // persist to engine state
    }
  };

  // ✅ P5: Virtual Timeline — track scroll position to filter visible clips only
  const [scrollLeft, setScrollLeft] = React.useState(0);
  const [viewportWidth, setViewportWidth] = React.useState(1400);

  React.useEffect(() => {
    const scrollArea = document.getElementById('timeline-scroll-area');
    if (!scrollArea) return;
    const onScroll = () => {
      setScrollLeft(scrollArea.scrollLeft);
      setViewportWidth(scrollArea.clientWidth);
    };
    scrollArea.addEventListener('scroll', onScroll, { passive: true });
    onScroll(); // initial sync
    return () => scrollArea.removeEventListener('scroll', onScroll);
  }, []);

  // Visible time window with a 1-second buffer on each side
  const pps = pixelsPerSecond || 20;
  const visibleStartTime = Math.max(0, (scrollLeft - headerWidth) / pps - 1);
  const visibleEndTime = visibleStartTime + viewportWidth / pps + 2;

  // Lasso Selection State
  const [lassoRect, setLassoRect] = React.useState<{ x: number, y: number, w: number, h: number } | null>(null);
  const [lassoStart, setLassoStart] = React.useState<{ x: number, y: number } | null>(null);

  const { handleDragOver, handleDragLeave, handleDrop, dropPreview } = useTimelineDrop();

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
        const currentHeight = getTrackHeight(track, isCollapsed);

        return (
        <React.Fragment key={track.id}>
          <div
            className={`track-row relative w-full bg-gray-800/80 border-b border-gray-700/50 flex group hover:bg-gray-800 transition-all duration-300 ${isCollapsed ? 'opacity-80' : ''} ${track.hidden ? 'opacity-40' : ''}`}
            style={{ height: `${currentHeight}px`, borderLeft: track.locked ? '2px solid #facc15' : undefined }}
            data-track-id={track.id}
            data-track-type={track.type}
            onDragOver={(e) => handleDragOver(e, track.id)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, track.id)}
            onContextMenu={(e) => { e.stopPropagation(); handleContextMenu(e, track.id); }}
          >

            {/* Track Header (Fixed Left) — New Professional Header */}
            <div className="flex-shrink-0 overflow-hidden" style={{ width: `${headerWidth}px` }}>
              <TimelineTrackHeader
                track={track}
                trackIndex={index}
                height={currentHeight}
                onHeightChange={handleHeightChange}
              />
            </div>

            <div className="relative flex-grow h-full" style={{ minWidth: '2000px' }}>
              {/* Transitions rendered FIRST (below) so clip handles on top in DOM stacking order */}
              {track.transitions?.map((trans: any) => (
                <TransitionItem 
                  key={trans.id} 
                  transition={trans} 
                  trackId={track.id} 
                />
              ))}

              {track.clips
                .filter((clip: Clip) =>
                  // ✅ P5: Virtual windowing — only render clips inside visible time window
                  clip.start < visibleEndTime && (clip.start + clip.duration) > visibleStartTime
                )
                .map((clip: Clip) => (
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

          {/* Phase 24: Keyframe Lane */}
          {track.showKeyframes && (
            <KeyframeLane track={track} headerWidth={headerWidth} />
          )}
          
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
