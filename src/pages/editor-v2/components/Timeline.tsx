import React from 'react';
import TimelineTracks from './TimelineTracks';
import PlayheadEnhanced from './PlayheadEnhanced';
import TimelineMarkers from './TimelineMarkers';
import TimelineMiniMap from './TimelineMiniMap';
import UndoHistoryPanel from './UndoHistoryPanel';
import TimelineRuler from './TimelineRuler';
import TransitionsPicker from './TransitionsPicker';
import SnapGuides from './SnapGuides';
import TimelineSearch from './TimelineSearch';
import LoopRegion from './LoopRegion';                              // Phase 26
import { injectCompoundClipEngine } from './CompoundClip';          // Phase 27
import { RenderStatusBar, CommentMarkers, ShortcutsCheatsheet } from './TimelineExtras'; // P28-30
import { useEditorStore } from '../../../store/useEditorStore';

export default function Timeline() {
  const headerWidth = useEditorStore(state => state.headerWidth);
  const setHeaderWidth = useEditorStore(state => state.setHeaderWidth);
  const zoomLevel = useEditorStore(state => state.zoomLevel);
  const setZoomPercentage = useEditorStore(state => state.setZoomPercentage);
  const pixelsPerSecond = useEditorStore(state => state.pixelsPerSecond);
  const duration = useEditorStore(state => state.duration);
  const isMagneticMode = useEditorStore(state => state.isMagneticMode);
  const setMagneticMode = useEditorStore(state => state.setMagneticMode);
  const activeTool = useEditorStore(state => state.activeTool);
  const setTool = useEditorStore(state => state.setTool);
  const [localZoom, setLocalZoom] = React.useState(Math.round(zoomLevel).toString());
  const [showTransitions, setShowTransitions] = React.useState(false);
  const [showSearch, setShowSearch] = React.useState(false);
  const loopRegion    = useEditorStore(state => state.loopRegion);
  const setLoopRegion = useEditorStore(state => state.setLoopRegion);
  const [showCheatsheet, setShowCheatsheet] = React.useState(false);

  // Phase 27: inject compound clip engine methods once on mount
  React.useEffect(() => { injectCompoundClipEngine(); }, []);

  // Phase 30: ? key opens cheatsheet
  React.useEffect(() => {
    const h = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
      if (tag === 'input' || tag === 'textarea') return;
      if (e.key === '?') setShowCheatsheet(v => !v);
      if (e.key === 'Escape') setShowCheatsheet(false);
      // Phase 26: I/O keys for In/Out points
      if (e.key === 'i' && !e.ctrlKey && !e.metaKey) {
        const app = (window as any).app;
        if (app) setLoopRegion({ in: app.currentTime || 0, out: loopRegion?.out ?? (app.duration || 300) });
      }
      if (e.key === 'o' && !e.ctrlKey && !e.metaKey) {
        const app = (window as any).app;
        if (app) setLoopRegion({ in: loopRegion?.in ?? 0, out: app.currentTime || 0 });
      }
      // Phase 29: Ctrl+M for comment marker
      if ((e.ctrlKey || e.metaKey) && e.key === 'm') {
        e.preventDefault();
        const app = (window as any).app;
        window.dispatchEvent(new CustomEvent('add-comment-marker', { detail: { time: app?.currentTime || 0 } }));
      }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [loopRegion, setLoopRegion]);


  React.useEffect(() => {
    setLocalZoom(Math.round(zoomLevel).toString());
  }, [zoomLevel]);

  // Matches engine formula → calculateVisibleWindow. 300px padding at end.
  const timelineContentWidth = Math.max(2000, duration * pixelsPerSecond + 300);

  // Phase 25: Listen for Ctrl+F from keyboard shortcuts
  React.useEffect(() => {
    const h = () => setShowSearch(v => !v);
    window.addEventListener('timeline-search-toggle', h);
    return () => window.removeEventListener('timeline-search-toggle', h);
  }, []);

  const applyZoom = () => {
    let val = parseInt(localZoom);
    if (isNaN(val)) val = 100;
    setZoomPercentage(val);
  };

  // Phase 11: Ctrl+Wheel = Zoom, Shift+Wheel = Horizontal scroll
  React.useEffect(() => {
    const el = document.getElementById('timeline-scroll-area');
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        // Anchor zoom to mouse X position
        const rect = el.getBoundingClientRect();
        const mouseX = e.clientX - rect.left + el.scrollLeft;
        const curPPS = useEditorStore.getState().pixelsPerSecond;
        const delta = e.deltaY > 0 ? -10 : 10;
        const newZoom = Math.max(5, Math.min(500, useEditorStore.getState().zoomLevel + delta));
        useEditorStore.getState().setZoomPercentage(newZoom);
        // Keep mouse anchor point stable
        const newPPS = useEditorStore.getState().pixelsPerSecond;
        if (curPPS > 0) {
          const ratio = newPPS / curPPS;
          el.scrollLeft = mouseX * ratio - (e.clientX - rect.left);
        }
      } else if (e.shiftKey) {
        e.preventDefault();
        el.scrollLeft += e.deltaY;
      }
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, []);
  return (
    <div id="timeline-panel" className="editor-panel glow-border-red flex-grow flex flex-col overflow-hidden min-w-0">
      {/* Timeline Header (Toolbar) */}
      <div id="timeline-header" className="h-10 bg-[#0a0f1d] border-b border-gray-700/80 flex items-center px-3 gap-1.5 text-[10px] select-none">

        {/* Title */}
        <span className="text-gray-400 font-bold text-[11px] mr-1 whitespace-nowrap">Sequence 1</span>
        <div className="w-px h-5 bg-gray-700 mx-1" />

        {/* Undo/Redo */}
        <div className="flex bg-gray-900 rounded border border-gray-700/60">
          <button className="toolbar-btn" title="Undo (Ctrl+Z)" onClick={() => (window as any).app?.undo()}>
            <i className="fa-solid fa-rotate-left text-yellow-500 text-[11px]" />
          </button>
          <button className="toolbar-btn border-l border-gray-700" title="Redo (Ctrl+Y)" onClick={() => (window as any).app?.redo()}>
            <i className="fa-solid fa-rotate-right text-blue-500 text-[11px]" />
          </button>
        </div>

        <div className="w-px h-5 bg-gray-700 mx-0.5" />

        {/* Edit Tools */}
        <div className="flex bg-gray-900 rounded border border-gray-700/60">
          <button
            id="tool-select"
            className={`toolbar-btn ${activeTool === 'select' ? 'active' : ''}`}
            title="Selection (V)"
            onClick={() => { setTool('select'); (window as any).app?.setTool?.('select'); }}
          >
            <i className="fa-solid fa-arrow-pointer text-[11px]" />
          </button>
          <button
            id="tool-cut"
            className={`toolbar-btn border-l border-gray-700 ${activeTool === 'cut' ? 'active' : ''}`}
            title="Razor (C)"
            onClick={() => { setTool('cut'); (window as any).app?.setTool?.('cut'); }}
          >
            <i className="fa-solid fa-scissors text-[11px]" />
          </button>
          <button
            className={`toolbar-btn border-l border-gray-700 transition-colors ${activeTool === 'slip' ? 'text-amber-400 bg-amber-400/10' : 'text-gray-500 hover:text-amber-400'}`}
            title="Slip Tool (Y) — shift sourceIn while keeping position"
            onClick={() => setTool('slip')}
          >
            <i className="fa-solid fa-arrows-left-right-to-line text-[11px]" />
          </button>
          <button
            className={`toolbar-btn border-l border-gray-700 transition-colors ${activeTool === 'slide' ? 'text-cyan-400 bg-cyan-400/10' : 'text-gray-500 hover:text-cyan-400'}`}
            title="Slide Tool (U) — slide clip while pushing neighbors"
            onClick={() => setTool('slide')}
          >
            <i className="fa-solid fa-up-down-left-right text-[11px]" />
          </button>
          <button
            className={`toolbar-btn border-l border-gray-700 transition-colors ${activeTool === 'rolling' ? 'text-purple-400 bg-purple-400/10' : 'text-gray-500 hover:text-purple-400'}`}
            title="Rolling Edit (N) — roll the cut point between two clips"
            onClick={() => setTool('rolling')}
          >
            <i className="fa-solid fa-arrows-left-right text-[11px]" />
          </button>
          <button
            className={`toolbar-btn border-l border-gray-700 transition-colors ${isMagneticMode ? 'text-green-400 bg-green-400/10' : 'text-gray-500'}`}
            title="Magnetic Snap (M)"
            onClick={() => setMagneticMode(!isMagneticMode)}
          >
            <i className="fa-solid fa-magnet text-[11px]" />
          </button>
        </div>

        <div className="w-px h-5 bg-gray-700 mx-0.5" />

        {/* Clip Actions */}
        <div className="flex gap-0.5">
          <button className="toolbar-btn bg-gray-800 rounded hover:bg-gray-700 text-yellow-400" title="Add Text (T)" onClick={() => (window as any).app?.addTextClip()}>
            <i className="fa-solid fa-font text-[11px]" />
          </button>
          <button className="toolbar-btn bg-gray-800 rounded hover:bg-gray-700 text-blue-400" title="Duplicate (Ctrl+D)" onClick={() => (window as any).app?.duplicateSelectedClip()}>
            <i className="fa-solid fa-copy text-[11px]" />
          </button>
          <button className="toolbar-btn bg-gray-800 rounded hover:bg-gray-700 text-orange-400" title="Ripple Delete" onClick={() => (window as any).app?.rippleDelete()}>
            <i className="fa-solid fa-link-slash text-[11px]" />
          </button>
          <button className="toolbar-btn bg-gray-800 rounded hover:bg-gray-700 text-red-400" title="Delete (Del)" onClick={() => (window as any).app?.deleteSelectedClip()}>
            <i className="fa-solid fa-trash text-[11px]" />
          </button>
        </div>

        <div className="w-px h-5 bg-gray-700 mx-0.5" />

        {/* Track Management */}
        <div className="flex gap-0.5">
          <button className="toolbar-btn bg-gray-800 rounded hover:bg-gray-700 text-purple-400" title="Add Video Track" onClick={() => (window as any).app?.addNewTrack?.('video')}>
            <i className="fa-solid fa-video text-[10px]" /><span className="text-[8px] ml-0.5">+</span>
          </button>
          <button className="toolbar-btn bg-gray-800 rounded hover:bg-gray-700 text-green-400" title="Add Audio Track" onClick={() => (window as any).app?.addNewTrack?.('audio')}>
            <i className="fa-solid fa-music text-[10px]" /><span className="text-[8px] ml-0.5">+</span>
          </button>
        </div>

        <div className="w-px h-5 bg-gray-700 mx-0.5" />

        {/* Marker */}
        <button
          className="toolbar-btn bg-gray-800 rounded hover:bg-gray-700 text-amber-400"
          title="Add Marker (M)"
          onClick={() => {
            const app = (window as any).app;
            if (app) {
              if (!app.markers) app.markers = [];
              app.markers.push({ time: app.currentTime, label: 'Marker', color: '#f59e0b' });
              app.commitStateToReact?.();
            }
          }}
        >
          <i className="fa-solid fa-flag text-[11px]" />
        </button>

        {/* Phase 25: Search Clips */}
        <button
          className={`toolbar-btn bg-gray-800 rounded hover:bg-gray-700 text-[10px] px-1.5 gap-0.5 w-auto ${ showSearch ? 'text-indigo-400 bg-indigo-500/10' : 'text-gray-400'}`}
          title="Search Clips (Ctrl+F)"
          onClick={() => setShowSearch(v => !v)}
        >
          <i className="fa-solid fa-magnifying-glass text-[10px]" />
        </button>

        {/* Phase 19: Transitions picker toggle */}
        <button
          className={`toolbar-btn rounded text-[9px] px-1.5 gap-0.5 w-auto transition-colors ${showTransitions ? 'bg-indigo-600 text-white' : 'bg-gray-800 hover:bg-gray-700 text-indigo-400'}`}
          title="Transitions"
          onClick={() => setShowTransitions(v => !v)}
        >
          <i className="fa-solid fa-film text-[10px]" />
          <span>FX</span>
        </button>

        {/* Copy/Paste */}
        <div className="flex bg-gray-900 rounded border border-gray-700/60">
          <button className="toolbar-btn" title="Select All (Ctrl+A)" onClick={() => (window as any).app?.selectAllClips?.()}>
            <i className="fa-solid fa-object-group text-[10px] text-gray-400" />
          </button>
          <button className="toolbar-btn border-l border-gray-700" title="Copy (Ctrl+C)" onClick={() => (window as any).app?.copySelectedClip?.()}>
            <i className="fa-solid fa-copy text-[10px] text-gray-400" />
          </button>
          <button className="toolbar-btn border-l border-gray-700" title="Paste (Ctrl+V)" onClick={() => (window as any).app?.pasteCopiedClip?.()}>
            <i className="fa-solid fa-paste text-[10px] text-gray-400" />
          </button>
        </div>

        {/* Phase 26: Loop Region indicator */}
        {loopRegion && (
          <div className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] bg-emerald-900/30 border border-emerald-500/30">
            <span className="text-emerald-400 font-mono">IN {loopRegion.in.toFixed(1)}s</span>
            <span className="text-gray-600 mx-0.5">→</span>
            <span className="text-red-400 font-mono">{loopRegion.out.toFixed(1)}s OUT</span>
            <button onClick={() => useEditorStore.getState().setLoopRegion(null)} className="ml-1 text-gray-500 hover:text-red-400">
              <i className="fa-solid fa-xmark text-[8px]" />
            </button>
          </div>
        )}

        {/* Spacer */}
        <div className="flex-1" />

        {/* Zoom to Fit */}
        <button
          className="toolbar-btn bg-gray-800 rounded hover:bg-gray-700 text-gray-300 text-[9px] px-1.5 gap-0.5 w-auto"
          title="Zoom to Fit (Ctrl+0)"
          onClick={() => {
            const dur = (window as any).app?.duration || 30;
            const area = document.getElementById('timeline-scroll-area');
            if (area) {
              const w = area.clientWidth - (useEditorStore.getState().headerWidth || 160);
              setZoomPercentage(Math.max(10, Math.floor(w / dur)));
            }
          }}
        >
          <i className="fa-solid fa-compress text-[10px]" />
          <span>Fit</span>
        </button>

        {/* Undo History */}
        <UndoHistoryPanel />

        {/* Phase 30: Shortcut cheatsheet button */}
        <button
          className="toolbar-btn bg-gray-800 rounded hover:bg-gray-700 text-gray-500 hover:text-white font-bold text-[11px]"
          title="Keyboard Shortcuts (?)"
          onClick={() => setShowCheatsheet(v => !v)}
        >?</button>

        {/* Zoom controls */}
        <div className="flex items-center gap-1 bg-gray-900 rounded border border-gray-700/60 px-1.5 py-0.5">
          <button className="w-4 h-4 flex items-center justify-center hover:text-white text-gray-400" onClick={() => setZoomPercentage(zoomLevel - 10)}>
            <i className="fa-solid fa-minus text-[9px]" />
          </button>
          <div className="flex items-center text-gray-400 text-[10px] gap-0.5">
            <input
              type="number"
              className="w-9 bg-transparent text-center outline-none border-b border-gray-600 hide-arrows focus:border-indigo-500 text-gray-200"
              value={localZoom}
              onChange={(e) => setLocalZoom(e.target.value)}
              onBlur={applyZoom}
              onKeyDown={(e) => { if (e.key === 'Enter') { applyZoom(); e.currentTarget.blur(); } }}
            />
            <span className="text-gray-600">%</span>
          </div>
          <button className="w-4 h-4 flex items-center justify-center hover:text-white text-gray-400" onClick={() => setZoomPercentage(zoomLevel + 10)}>
            <i className="fa-solid fa-plus text-[9px]" />
          </button>
        </div>
      </div>

      {/* Phase 19: Transitions Panel (collapsible) */}
      {showTransitions && (
        <div className="border-b border-white/10 bg-[#0a0f1d]" style={{ height: '260px', flexShrink: 0 }}>
          <TransitionsPicker onClose={() => setShowTransitions(false)} />
        </div>
      )}

      {/* Timeline Scroll Area */}
      <div className="flex-grow relative overflow-y-auto overflow-x-auto timeline-container custom-scrollbar" id="timeline-scroll-area" dir="ltr">
        <div className="relative min-h-full" id="timeline-content" style={{ width: `${timelineContentWidth}px` }}>
          
          {/* Ruler Row (Sticky Top & Left) */}
          <div className="sticky top-0 z-[60] flex w-full h-[30px]">
            <div 
                className="sticky left-0 bg-[#0a0f1d] border-b border-r border-gray-700 flex items-center justify-center text-[10px] font-bold text-gray-500 z-50 flex-shrink-0"
                style={{ width: `${headerWidth}px` }}
            >
               TRACKS
            </div>
            {/* Header Resizer Handle */}
            <div 
                className="sticky z-[65] w-2 cursor-col-resize hover:bg-red-500/50 transition-colors"
                style={{ left: `${headerWidth}px`, marginLeft: '-1px' }}
                onMouseDown={(e) => {
                    e.preventDefault();
                    const startX = e.clientX;
                    const startWidth = headerWidth;
                    const onMouseMove = (moveEvent: MouseEvent) => {
                        const newWidth = startWidth + (moveEvent.clientX - startX);
                        setHeaderWidth(newWidth);
                    };
                    const onMouseUp = () => {
                        window.removeEventListener('mousemove', onMouseMove);
                        window.removeEventListener('mouseup', onMouseUp);
                    };
                    window.addEventListener('mousemove', onMouseMove);
                    window.addEventListener('mouseup', onMouseUp);
                }}
            ></div>
            {/* Improved Ruler (Phase 17) */}
            <TimelineRuler />
          </div>
          
          {/* Markers Layer — Phase 5 markers + Phase 26 Loop Region + Phase 28 Render Bar + Phase 29 Comments */}
          <div className="absolute top-0 left-0 right-0 h-[30px] z-[75] pointer-events-none" id="markers-layer">
            <TimelineMarkers />
          </div>
          {/* Phase 28: Render status bar (green/yellow) */}
          <RenderStatusBar />
          {/* Phase 26: Loop In/Out region */}
          <LoopRegion />
          {/* Phase 29: Comment markers */}
          <CommentMarkers />

          {/* Tracks Container */}
          <div className="relative w-full min-h-full bg-gray-900 pt-2 pb-10" id="tracks-container">
            <TimelineTracks />
          </div>
          
          {/* Playhead with tooltip (Phase 18) */}
          <PlayheadEnhanced />

          {/* Phase 22: Snap guide lines */}
          <SnapGuides />

          {/* Phase 25: Timeline clip search */}
          {showSearch && <TimelineSearch onClose={() => setShowSearch(false)} />}
          
        </div>
      </div>
      {/* Mini-Map Overview */}
      <TimelineMiniMap />

      {/* Phase 30: Keyboard shortcuts cheatsheet */}
      {showCheatsheet && <ShortcutsCheatsheet onClose={() => setShowCheatsheet(false)} />}
    </div>
  );
}
