import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useEditorStore } from '../../../store/useEditorStore';
import { QuickFxPanel } from '../panels/QuickFxPanel';

/**
 * EffectControls Panel — now with a dual-tab UI:
 *  Tab 1: "Controls"  — engine-injected clip controls (existing behaviour)
 *  Tab 2: "Quick FX"  — visual buttons for all 80+ commands
 */
export default function EffectControls() {
  const [tab, setTab] = useState<'controls' | 'fx'>('controls');
  const selectedClipIds = useEditorStore(state => state.selectedClipIds);
  const panelRef = useRef<HTMLDivElement>(null);

  const placeholderLabel = useMemo(() => {
    if (selectedClipIds.size === 0) return 'No Clip Selected';
    const app = (window as any).app;
    if (app?.findClipById) {
      const clips = Array.from(selectedClipIds)
        .map(id => app.findClipById(id as string))
        .filter(Boolean);
      const hasNonAudio = clips.some((c: any) => c.type !== 'audio');
      if (hasNonAudio) return 'Loading...';
      if (clips.every((c: any) => c.type === 'audio')) return 'No Clip Selected';
    }
    return 'Loading...';
  }, [selectedClipIds]);

  useEffect(() => {
    if (tab !== 'controls') return;
    const app = (window as any).app;
    if (!app?.updateEffectControls) return;
    const timer = setTimeout(() => { app.updateEffectControls(); }, 20);
    return () => clearTimeout(timer);
  }, [selectedClipIds, tab]);

  useEffect(() => {
    if (tab !== 'controls') return;
    const app = (window as any).app;
    if (!app?.updateEffectControls) return;
    const timer = setTimeout(() => { app.updateEffectControls(); }, 30);
    return () => clearTimeout(timer);
  });

  return (
    <div id="tools-panel" className="editor-panel glow-border-red bg-[#0a0f1d] rounded-lg w-[240px] flex flex-col flex-shrink-0 overflow-hidden min-w-0">

      {/* Dual tab header */}
      <div className="flex border-b border-gray-700 flex-shrink-0 text-[9px] font-bold bg-[#0a0f1d]">
        <button
          onClick={() => setTab('controls')}
          className={`flex-1 py-2 text-center transition-all flex items-center justify-center gap-1 ${tab === 'controls' ? 'text-purple-400 border-b-2 border-purple-500 bg-[#0f172a]' : 'text-gray-500 hover:text-gray-300'}`}
        >
          <i className="fa-solid fa-sliders text-[9px]" />
          Controls
        </button>
        <button
          onClick={() => setTab('fx')}
          className={`flex-1 py-2 text-center transition-all flex items-center justify-center gap-1 ${tab === 'fx' ? 'text-pink-400 border-b-2 border-pink-500 bg-[#0f172a]' : 'text-gray-500 hover:text-gray-300'}`}
        >
          <i className="fa-solid fa-wand-magic-sparkles text-[9px]" />
          Quick FX
        </button>
      </div>

      {/* Content */}
      <div className="flex-grow flex flex-col overflow-hidden bg-[#0a0f1d] rounded-b-lg">

        {tab === 'controls' ? (
          <div
            ref={panelRef}
            id="effect-controls-panel"
            lang="en"
            dir="ltr"
            className="p-4 overflow-y-auto custom-scrollbar flex-shrink-0 h-full text-[11px] text-gray-300"
          >
            <div id="effect-controls-content" className="flex flex-col gap-4">
              <div className="text-gray-500 text-center py-4 text-xs font-medium border border-gray-800 rounded bg-[#1e293b]/30">
                {placeholderLabel}
              </div>
            </div>
          </div>
        ) : (
          <QuickFxPanel />
        )}

      </div>
    </div>
  );
}
