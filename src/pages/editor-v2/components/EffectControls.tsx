import React from 'react';

export default function EffectControls() {
  return (
    <div id="tools-panel" className="editor-panel glow-border-red bg-[#0a0f1d] rounded-lg w-[240px] flex flex-col flex-shrink-0 overflow-hidden min-w-0">
      <div className="p-2 border-b border-gray-700 font-bold text-[11px] text-gray-300 flex justify-between items-center bg-[#0a0f1d]">
        <span>Effect Controls</span>
        <i className="fa-solid fa-ellipsis-vertical text-gray-500"></i>
      </div>
      <div className="flex-grow flex flex-col overflow-hidden bg-[#0a0f1d] rounded-b-lg">
        <div id="effect-controls-panel" lang="en" dir="ltr" className="p-4 overflow-y-auto custom-scrollbar flex-shrink-0 h-full text-[11px] text-gray-300">
          <div id="effect-controls-content" className="flex flex-col gap-4">
            <div className="text-gray-500 text-center py-4 text-xs font-medium border border-gray-800 rounded bg-[#1e293b]/30">No Clip Selected</div>
          </div>
        </div>
      </div>
    </div>
  );
}
