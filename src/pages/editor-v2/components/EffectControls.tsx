import React, { useEffect, useMemo, useRef } from 'react';
import { useEditorStore } from '../../../store/useEditorStore';

/**
 * EffectControls Panel
 *
 * The editor engine (pro_features.ts + ultra_features.ts) uses direct DOM manipulation
 * to inject clip-specific controls into #effect-controls-content via innerHTML.
 *
 * Root bug fix: When a video is dropped from the library, it creates a video+audio
 * pair sharing the same groupId. Clicking the video clip selects BOTH (size=2),
 * which previously caused updateEffectControls to show "No Selection".
 *
 * The engine now handles the groupId logic internally (pro_features + ultra_features),
 * and this component just triggers re-injection after every React render.
 */
export default function EffectControls() {
  const selectedClipIds = useEditorStore(state => state.selectedClipIds);
  const panelRef = useRef<HTMLDivElement>(null);

  // Determine the label for the placeholder while waiting for engine injection
  const placeholderLabel = useMemo(() => {
    if (selectedClipIds.size === 0) return 'No Clip Selected';
    // Check if the selection has at least one non-audio primary clip
    const app = (window as any).app;
    if (app?.findClipById) {
      const clips = Array.from(selectedClipIds)
        .map(id => app.findClipById(id as string))
        .filter(Boolean);
      const hasNonAudio = clips.some((c: any) => c.type !== 'audio');
      if (hasNonAudio) return 'Loading...';
      // All selected clips are audio → no visual controls
      if (clips.every((c: any) => c.type === 'audio')) return 'No Clip Selected';
    }
    return 'Loading...';
  }, [selectedClipIds]);

  // Re-inject controls whenever selection changes
  useEffect(() => {
    const app = (window as any).app;
    if (!app?.updateEffectControls) return;
    // Small delay to ensure React has finished painting before engine mutates DOM
    const timer = setTimeout(() => {
      app.updateEffectControls();
    }, 20);
    return () => clearTimeout(timer);
  }, [selectedClipIds]);

  // Also re-inject after every render (catches cases where parent forces re-render)
  useEffect(() => {
    const app = (window as any).app;
    if (!app?.updateEffectControls) return;
    const timer = setTimeout(() => {
      app.updateEffectControls();
    }, 30);
    return () => clearTimeout(timer);
  });

  return (
    <div id="tools-panel" className="editor-panel glow-border-red bg-[#0a0f1d] rounded-lg w-[240px] flex flex-col flex-shrink-0 overflow-hidden min-w-0">
      <div className="p-2 border-b border-gray-700 font-bold text-[11px] text-gray-300 flex justify-between items-center bg-[#0a0f1d]">
        <span>Effect Controls</span>
        <i className="fa-solid fa-ellipsis-vertical text-gray-500"></i>
      </div>
      <div className="flex-grow flex flex-col overflow-hidden bg-[#0a0f1d] rounded-b-lg">
        <div
          ref={panelRef}
          id="effect-controls-panel"
          lang="en"
          dir="ltr"
          className="p-4 overflow-y-auto custom-scrollbar flex-shrink-0 h-full text-[11px] text-gray-300"
        >
          {/* Initial placeholder — engine will replace this via innerHTML */}
          <div id="effect-controls-content" className="flex flex-col gap-4">
            <div className="text-gray-500 text-center py-4 text-xs font-medium border border-gray-800 rounded bg-[#1e293b]/30">
              {placeholderLabel}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
