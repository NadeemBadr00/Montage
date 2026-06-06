import React from 'react';
import TimelineTracks from './TimelineTracks';
import Playhead from './Playhead';
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
  const [localZoom, setLocalZoom] = React.useState(Math.round(zoomLevel).toString());

  // Matches engine formula in timeline.ts → calculateVisibleWindow
  // 300px padding so clips at the end have breathing room
  const timelineContentWidth = Math.max(2000, duration * pixelsPerSecond + 300);

  React.useEffect(() => {
    setLocalZoom(Math.round(zoomLevel).toString());
  }, [zoomLevel]);

  const applyZoom = () => {
    let val = parseInt(localZoom);
    if (isNaN(val)) val = 100;
    setZoomPercentage(val);
  };

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
          <button id="tool-select" className="toolbar-btn active" title="Selection (V)" onClick={() => (window as any).app?.setTool?.('select')}>
            <i className="fa-solid fa-arrow-pointer text-[11px]" />
          </button>
          <button id="tool-cut" className="toolbar-btn border-l border-gray-700" title="Razor (C)" onClick={() => (window as any).app?.setTool?.('cut')}>
            <i className="fa-solid fa-scissors text-[11px]" />
          </button>
          <button className="toolbar-btn border-l border-gray-700" title="Slip Tool (Y)">
            <i className="fa-solid fa-arrows-left-right-to-line text-[11px]" />
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

        {/* Spacer */}
        <div className="flex-1" />

        {/* Zoom to Fit */}
        <button
          className="toolbar-btn bg-gray-800 rounded hover:bg-gray-700 text-gray-300 text-[9px] px-1.5 gap-0.5 w-auto"
          title="Zoom to Fit (Shift+F)"
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
            <div className="time-ruler relative flex-grow flex items-end overflow-hidden" id="timeline-ruler"></div>
          </div>
          
          {/* Tracks Container */}
          <div className="relative w-full min-h-full bg-gray-900 pt-2 pb-10" id="tracks-container">
            <TimelineTracks />
          </div>
          
          {/* Playhead rendered last to guarantee top z-index */}
          <Playhead />
          
        </div>
      </div>
    </div>
  );
}
