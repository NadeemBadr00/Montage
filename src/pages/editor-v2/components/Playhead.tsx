import React from 'react';

export default function Playhead() {
  return (
    <div 
      id="playhead" 
      className="playhead-marker h-full absolute cursor-ew-resize" 
      style={{ zIndex: 9999 }}
    >
      <div className="playhead-head bg-accent w-3 h-3 rounded-sm absolute -top-1.5 -left-1.5 shadow-md"></div>
      <div className="playhead-line w-px bg-accent h-full shadow-[0_0_5px_rgba(255,0,0,0.5)]"></div>
    </div>
  );
}
