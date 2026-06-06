import React, { useState } from 'react';

export default function UndoHistoryPanel() {
  const [open, setOpen] = useState(false);

  const app = (window as any).app;
  const history: any[] = app?.undoStack || [];
  const redoStack: any[] = app?.redoStack || [];

  return (
    <div className="relative">
      <button
        className={`toolbar-btn bg-gray-800 rounded hover:bg-gray-700 text-gray-400 hover:text-white transition-colors text-[9px] px-1.5 gap-0.5 w-auto ${open ? 'text-white bg-gray-700' : ''}`}
        title="Undo History"
        onClick={() => setOpen(v => !v)}
      >
        <i className="fa-solid fa-clock-rotate-left text-[10px]" />
        <span className="text-[9px]">{history.length}</span>
      </button>

      {open && (
        <div className="absolute bottom-full mb-1 right-0 w-56 bg-[#131c2e] border border-white/10 rounded-lg shadow-2xl z-[9999] py-1 max-h-[300px] overflow-y-auto">
          <div className="px-3 py-1.5 text-[10px] font-bold text-gray-400 border-b border-white/10 flex items-center justify-between">
            <span>History ({history.length})</span>
            <button className="text-red-400 hover:text-red-300 text-[9px]"
              onClick={() => { app?.clearHistory?.(); setOpen(false); }}>
              Clear
            </button>
          </div>
          {history.length === 0 && (
            <div className="px-3 py-3 text-[10px] text-gray-600 text-center">No history yet</div>
          )}
          {[...history].reverse().map((entry: any, idx: number) => (
            <div
              key={idx}
              className="px-3 py-1.5 text-[10px] text-gray-300 hover:bg-white/10 cursor-pointer flex items-center gap-2"
              onClick={() => {
                // Jump to that state
                const stepsBack = history.length - 1 - (history.length - 1 - idx);
                for (let i = 0; i < stepsBack; i++) app?.undo?.();
                setOpen(false);
              }}
            >
              <i className="fa-solid fa-rotate-left text-[9px] text-gray-600" />
              <span className="truncate">{entry.label || `State ${history.length - idx}`}</span>
              <span className="ml-auto text-[8px] text-gray-600 tabular-nums">
                {idx === 0 ? 'now' : `−${idx}`}
              </span>
            </div>
          ))}
          {redoStack.length > 0 && (
            <>
              <div className="px-3 py-1 text-[9px] text-gray-600 border-t border-white/10 mt-1">Redo available ({redoStack.length})</div>
              {redoStack.map((entry: any, idx: number) => (
                <div key={idx} className="px-3 py-1.5 text-[10px] text-gray-500 hover:bg-white/5 cursor-pointer flex items-center gap-2"
                  onClick={() => { app?.redo?.(); setOpen(false); }}>
                  <i className="fa-solid fa-rotate-right text-[9px] text-gray-700" />
                  <span className="truncate">{entry.label || `Redo ${idx + 1}`}</span>
                </div>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}
