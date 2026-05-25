import React from 'react';
import { useEditorStore } from '../../../store/useEditorStore';

interface TransitionItemProps {
  transition: any;
  trackId: string;
}

export default function TransitionItem({ transition, trackId }: TransitionItemProps) {
  const pixelsPerSecond = useEditorStore(state => state.pixelsPerSecond);
  const selectedClipIds = useEditorStore(state => state.selectedClipIds);
  const [isHovered, setIsHovered] = React.useState(false);
  
  const isSelected = selectedClipIds.has(transition.id);
  
  // Respect alignment when computing visual start position — must match video_preview.ts logic
  const alignment = transition.alignment || 'center';
  const totalDur = (transition.inOffset || 0) + (transition.outOffset || 0);
  let startTime: number;
  if (alignment === 'start') {
    // Transition begins at cutTime and extends forward
    startTime = transition.cutTime;
  } else if (alignment === 'end') {
    // Transition ends at cutTime, extending backward
    startTime = transition.cutTime - totalDur;
  } else {
    // center (default): cutTime is in the middle
    startTime = transition.cutTime - (transition.inOffset || 0);
  }
  const duration = totalDur;
  

  const leftPos = startTime * pixelsPerSecond;
  const width = duration * pixelsPerSecond;
  
  const handlePointerDown = (e: React.PointerEvent) => {
    e.stopPropagation();
    if ((window as any).app && (window as any).app.selectTransition) {
        (window as any).app.selectTransition(transition.id);
    }
  };

  const handleDelete = (e: React.MouseEvent) => {
      e.stopPropagation();
      if ((window as any).app?.deleteTransition) {
          (window as any).app.deleteTransition(transition.id, trackId);
          if ((window as any).app.renderAll) (window as any).app.renderAll();
      }
  };

  const getIcon = () => {
    switch (transition.type) {
      case 'cross_dissolve': return 'fa-circle-half-stroke';
      case 'fade': return 'fa-adjust';
      case 'fade_in': return 'fa-sign-in-alt';
      case 'fade_out': return 'fa-sign-out-alt';
      case 'wipe': return 'fa-arrow-right';
      case 'zoom': return 'fa-search-plus';
      default: return 'fa-circle-half-stroke';
    }
  };

  const getLabel = () => {
    switch (transition.type) {
      case 'cross_dissolve': return 'Dissolve';
      case 'fade': return 'Fade';
      case 'wipe': return 'Wipe';
      case 'zoom': return 'Zoom';
      default: return transition.type;
    }
  };

  return (
    <div
      id={transition.id}
      className={`timeline-transition group absolute top-0 bottom-0 z-50 rounded-sm box-border border
        ${isSelected ? 'border-white bg-orange-500/80 shadow-[0_0_10px_rgba(249,115,22,0.8)]' : 'border-orange-300/60 bg-orange-500/50 hover:bg-orange-500/70'}
      `}
      style={{
        left: `${leftPos}px`,
        width: `${width}px`,
        minWidth: '2px',
        // Clip handle zones (10px each side) remain pointer-events-none so clip handles show through
        // We achieve this by using a CSS clip-path or just pointer-events tricks on sub-elements
        pointerEvents: 'none', // Entire container non-blocking, children opt-in
      }}
      title={`${transition.type} (${duration.toFixed(2)}s)`}
    >
      {/* Left edge dead-zone (10px) — pointer-events: none, so clip handle underneath is reachable */}
      <div className="absolute left-0 top-0 bottom-0 w-[10px] pointer-events-none" />

      {/* Center clickable zone */}
      <div
        className="absolute top-0 bottom-0 cursor-pointer"
        style={{ left: '10px', right: '10px' }}
        onPointerDown={handlePointerDown}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Cut-point marker */}
        {duration > 0 && (
          <div
            className="absolute top-0 bottom-0 left-0 border-r border-dashed border-white/40 pointer-events-none"
            style={{ width: `${((transition.inOffset || 0) / duration) * 100}%` }}
          />
        )}
        <div className="w-full h-full flex items-center justify-center pointer-events-none opacity-80 overflow-hidden">
          <i className={`fa-solid ${getIcon()} text-[10px] text-white`}></i>
        </div>
      </div>

      {/* Right edge dead-zone (10px) — pointer-events: none */}
      <div className="absolute right-0 top-0 bottom-0 w-[10px] pointer-events-none" />

      <button
        className={`absolute -top-1.5 -right-1.5 w-4 h-4 bg-red-500 hover:bg-red-400 text-white rounded-full flex items-center justify-center transition-opacity shadow-sm z-50 text-[10px] leading-none pointer-events-auto ${isSelected || isHovered ? 'opacity-100' : 'opacity-0'}`}
        onPointerDown={handleDelete}
        title="Delete Transition"
      >
        <i className="fa-solid fa-times"></i>
      </button>
      
      {/* Warning Stripes if Insufficient Media */}
      {transition.hasInsufficientMedia && (
        <div 
            className="absolute inset-0 opacity-50 pointer-events-none" 
            style={{
                backgroundImage: 'repeating-linear-gradient(45deg, rgba(255, 0, 0, 0.4), rgba(255, 0, 0, 0.4) 5px, transparent 5px, transparent 10px)'
            }}
        />
      )}
    </div>
  );
}
