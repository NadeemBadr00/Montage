import React from 'react';
import { Track } from '../../../types/editor.types';
import { useEditorStore } from '../../../store/useEditorStore';

interface TrackHeaderProps {
  track: Track;
}

export default function TrackHeader({ track }: TrackHeaderProps) {
  const headerWidth = useEditorStore(state => state.headerWidth);
  const collapsedTracks = useEditorStore(state => state.collapsedTracks);
  const toggleTrackCollapse = useEditorStore(state => state.toggleTrackCollapse);
  
  const isCollapsed = collapsedTracks.has(track.id);

  const handleMute = () => {
    if ((window as any).app?.toggleTrackMute) {
      (window as any).app.toggleTrackMute(track.id);
    }
  };

  const handleSolo = () => {
    if ((window as any).app?.toggleTrackSolo) {
      (window as any).app.toggleTrackSolo(track.id);
    }
  };

  const handleDelete = () => {
      if ((window as any).app?.deleteTrack) {
          (window as any).app.deleteTrack(track.id);
      }
  };

  return (
    <div 
      className="sticky left-0 z-40 bg-[#0a0f1d] border-r border-gray-700 flex flex-col justify-center px-2 flex-shrink-0 shadow-[4px_0_10px_rgba(0,0,0,0.5)] group/header relative"
      style={{ width: `${headerWidth}px` }}
    >
      <div className="text-[10px] font-bold text-gray-300 truncate font-mono flex items-center justify-between">
        <div className="flex items-center gap-1 overflow-hidden">
            <button 
                onClick={() => toggleTrackCollapse(track.id)}
                className="text-[8px] text-gray-500 hover:text-white mr-0.5"
                title={isCollapsed ? "Expand Track" : "Collapse Track"}
            >
                <i className={`fa-solid ${isCollapsed ? 'fa-plus' : 'fa-minus'}`} />
            </button>
            <span className="truncate pr-1">{track.name}</span>
            <div className="flex gap-0.5 opacity-50 group-hover/header:opacity-100 transition-opacity">
                <button 
                    className={`text-[8px] font-bold px-1 py-0.5 rounded transition-colors border ${track.isMuted ? 'bg-red-600 border-red-500 text-white' : 'bg-gray-800 border-gray-600 text-gray-400 hover:bg-gray-700 hover:text-white'}`}
                    onClick={handleMute}
                    title="Mute Track"
                >
                    M
                </button>
                <button 
                    className={`text-[8px] font-bold px-1 py-0.5 rounded transition-colors border ${track.isSolo ? 'bg-yellow-600 border-yellow-500 text-white' : 'bg-gray-800 border-gray-600 text-gray-400 hover:bg-gray-700 hover:text-white'}`}
                    onClick={handleSolo}
                    title="Solo Track"
                >
                    S
                </button>
            </div>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          {track.type === 'video' && <i className="fa-solid fa-video text-gray-500 text-[9px]"></i>}
          {track.type === 'audio' && <i className="fa-solid fa-music text-gray-500 text-[9px]"></i>}
          {track.type === 'subtitle' && <i className="fa-solid fa-closed-captioning text-gray-500 text-[9px]"></i>}
          <button onClick={handleDelete} className="opacity-0 group-hover/header:opacity-100 hover:text-red-400 text-gray-600 ml-1 transition-opacity">
            <i className="fa-solid fa-trash text-[9px]"></i>
          </button>
        </div>
      </div>
      
      {/* Vertical Resizer */}
      <div 
        className="absolute bottom-0 left-0 right-0 h-1 cursor-row-resize hover:bg-red-500/50 z-50 transition-colors"
        onMouseDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
            const startY = e.clientY;
            const startHeight = track.height || 24;
            
            // FIX #4: save undo state once at the start of the resize gesture
            if ((window as any).app?.saveState) {
                (window as any).app.saveState();
            }
            
            const onMouseMove = (moveEvent: MouseEvent) => {
                const newHeight = Math.max(12, startHeight + (moveEvent.clientY - startY));
                // Mirror to engine track
                const engineTrack = (window as any).app?.tracks?.find((t: any) => t.id === track.id);
                if (engineTrack) engineTrack.height = newHeight;

                // Trigger React re-render via syncApp (avoids direct Zustand mutation)
                const store = useEditorStore.getState();
                const updatedTracks = store.tracks.map(t =>
                    t.id === track.id ? { ...t, height: newHeight } : t
                );
                store.syncApp(updatedTracks, store.currentTime, store.isPlaying);

                if ((window as any).app?.requestRedraw) {
                    (window as any).app.requestRedraw();
                }
            };
            const onMouseUp = () => {
                window.removeEventListener('mousemove', onMouseMove);
                window.removeEventListener('mouseup', onMouseUp);
                // FIX #4: push final height to Zustand after resize is done
                if ((window as any).app?.commitStateToReact) {
                    (window as any).app.commitStateToReact();
                }
            };
            window.addEventListener('mousemove', onMouseMove);
            window.addEventListener('mouseup', onMouseUp);
        }}
      ></div>
    </div>
  );
}
