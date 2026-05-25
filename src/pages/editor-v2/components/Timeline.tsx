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
      <div id="timeline-header" className="h-10 bg-[#0a0f1d] border-b border-gray-700 flex items-center px-4 gap-2 text-[10px] select-none justify-between">
        <span className="text-gray-300 font-bold">Timeline - Sequence 1</span>
        
        <div className="flex items-center gap-1">
          <div className="flex bg-gray-900 rounded border border-gray-700 mr-2">
            <button className="toolbar-btn" title="Undo" onClick={() => {
              if ((window as any).app) (window as any).app.undo();
            }}>
              <i className="fa-solid fa-rotate-left text-yellow-500"></i>
            </button>
            <button className="toolbar-btn border-r border-gray-700" title="Redo" onClick={() => {
              if ((window as any).app) (window as any).app.redo();
            }}>
              <i className="fa-solid fa-rotate-right text-blue-500"></i>
            </button>
          </div>
          <div className="flex bg-gray-900 rounded border border-gray-700 mr-2">
            <button id="tool-select" className="toolbar-btn active" title="Selection (V)" onClick={() => (window as any).app?.setTool('select')}>
              <i className="fa-solid fa-arrow-pointer"></i>
            </button>
            <button id="tool-cut" className="toolbar-btn border-r border-gray-700" title="Razor (C)" onClick={() => (window as any).app?.setTool('cut')}>
              <i className="fa-solid fa-cut"></i>
            </button>
            <button className="toolbar-btn border-r border-gray-700" title="Slip Tool (Y)">
              <i className="fa-solid fa-arrows-left-right-to-line"></i>
            </button>
            <button 
              className={`toolbar-btn border-r border-gray-700 transition-colors ${isMagneticMode ? 'text-green-400 bg-gray-800' : 'text-gray-400'}`} 
              title="Magnetic Timeline (M)" 
              onClick={() => setMagneticMode(!isMagneticMode)}
            >
              <i className="fa-solid fa-magnet"></i>
            </button>
          </div>
          <div className="flex gap-1">
            <button className="toolbar-btn bg-gray-700 hover:bg-gray-600 rounded text-yellow-400" title="Add Text" onClick={() => (window as any).app?.addTextClip()}>
              <i className="fa-solid fa-font"></i>
            </button>
            <button className="toolbar-btn bg-gray-700 hover:bg-gray-600 rounded text-blue-400" title="Duplicate (Ctrl+D)" onClick={() => (window as any).app?.duplicateSelectedClip()}>
              <i className="fa-solid fa-copy"></i>
            </button>
            <button className="toolbar-btn bg-gray-700 hover:bg-gray-600 rounded text-red-400" title="Ripple Delete" onClick={() => (window as any).app?.rippleDelete()}>
              <i className="fa-solid fa-link-slash"></i>
            </button>
            <button className="toolbar-btn bg-gray-700 hover:bg-gray-600 rounded text-red-300" title="Delete" onClick={() => (window as any).app?.deleteSelectedClip()}>
              <i className="fa-solid fa-trash"></i>
            </button>
          </div>
        </div>
        
        <div className="flex items-center gap-2 border-l border-r border-gray-700 px-2">
          <button className="toolbar-btn text-purple-400" title="Add Video Track" onClick={() => (window as any).app?.addNewTrack('video')}>
            <i className="fa-solid fa-video"></i>+
          </button>
          <button className="toolbar-btn text-green-400" title="Add Audio Track" onClick={() => (window as any).app?.addNewTrack('audio')}>
            <i className="fa-solid fa-music"></i>+
          </button>
        </div>
        
        <div className="flex items-center gap-2">
          <button className="w-5 h-5 bg-gray-700 rounded flex items-center justify-center hover:bg-gray-600 text-[10px]" onClick={() => setZoomPercentage(zoomLevel - 10)}>
            <i className="fa-solid fa-minus"></i>
          </button>
          <div className="flex items-center text-gray-400 text-[10px]">
            <span>Zoom:</span>
            <input 
              type="number" 
              className="w-10 bg-transparent text-center outline-none border-b border-gray-600 mx-1 hide-arrows focus:border-red-500" 
              value={localZoom}
              onChange={(e) => setLocalZoom(e.target.value)}
              onBlur={applyZoom}
              onKeyDown={(e) => { if(e.key === 'Enter') { applyZoom(); e.currentTarget.blur(); } }}
            />
            <span>%</span>
          </div>
          <button className="w-5 h-5 bg-gray-700 rounded flex items-center justify-center hover:bg-gray-600 text-[10px]" onClick={() => setZoomPercentage(zoomLevel + 10)}>
            <i className="fa-solid fa-plus"></i>
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
