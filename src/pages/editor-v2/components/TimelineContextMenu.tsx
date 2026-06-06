import React, { useState, useEffect } from 'react';
import { useEditorStore } from '../../../store/useEditorStore';

export default function TimelineContextMenu() {
  const { contextMenu, setContextMenu } = useEditorStore();
  const [legacyClip, setLegacyClip] = useState<any>(null);

  useEffect(() => {
    if (contextMenu?.clipId) {
      const app = (window as any).app;
      if (app) {
        for (const t of app.tracks) {
          const clip = t.clips.find((c: any) => c.id === contextMenu.clipId);
          if (clip) {
            setLegacyClip(clip);
            break;
          }
        }
      }
    } else {
      setLegacyClip(null);
    }
  }, [contextMenu]);

  if (!contextMenu) return null;

  const handleAction = (action: string, extraArgs?: any) => {
    const app = (window as any).app;
    if (!app) return;

    if (contextMenu.clipId) {
      let parentTrack = null;
      for (const t of app.tracks) {
        if (t.clips.find((c: any) => c.id === contextMenu.clipId)) {
          parentTrack = t; break;
        }
      }

      if (legacyClip && parentTrack) {
        if (action === 'delete') {
          app.deleteClip(legacyClip, parentTrack);
          parentTrack.rebuildTree();
          if (app.renderAll) app.renderAll();
          app.commitStateToReact();
        } else if (action === 'cut') {
          app.performSplit(legacyClip, parentTrack, { simulated: true });
        } else if (action === 'group') {
          if (app.groupSelectedClips) app.groupSelectedClips();
        } else if (action === 'ungroup') {
          if (app.ungroupSelectedClips) app.ungroupSelectedClips(legacyClip.id);
        } else if (action === 'flipH') {
          if (app.updateUltraProp) app.updateUltraProp(legacyClip.id, 'properties', 'flipX', !legacyClip.properties.flipX);
        } else if (action === 'flipV') {
          if (app.updateUltraProp) app.updateUltraProp(legacyClip.id, 'properties', 'flipY', !legacyClip.properties.flipY);
        } else if (action === 'customSpeed') {
          useEditorStore.getState().setSpeedModal({ clipId: legacyClip.id });
        } else if (action === 'textColor') {
          if (app.updateUltraProp) app.updateUltraProp(legacyClip.id, 'textStyle', 'color', extraArgs);
        } else if (action === 'textBg') {
          if (app.updateUltraProp) {
              app.updateUltraProp(legacyClip.id, 'textStyle', 'backgroundColor', extraArgs);
              app.updateUltraProp(legacyClip.id, 'textStyle', 'backgroundOpacity', extraArgs === 'transparent' ? 0 : 1);
          }
        } else if (action === 'autoCaptions') {
          if ((window as any).aiManager) {
              (window as any).aiManager.generateSubtitlesForClip(legacyClip);
          }
        } else if (action === 'autoReframe') {
          if ((window as any).applyAutoReframe) {
              (window as any).applyAutoReframe(legacyClip.id);
          } else {
              // Lazy load it dynamically if not already loaded
              import('../../../editor-engine/features/auto-reframe').then(mod => {
                  mod.applyAutoReframe(legacyClip.id);
              });
          }
        }
      }
    } else if (contextMenu.trackId) {
      if (action === 'paste') {
         console.log("Paste not implemented yet");
      } else if (action === 'addText') {
         if (app.addTextClip) app.addTextClip(contextMenu.trackId, contextMenu.time);
      } else if (action === 'addSolid') {
         if (app.addSolidClip) app.addSolidClip(contextMenu.trackId, contextMenu.time, '#000000');
      }
    }

    setContextMenu(null);
  };

  const renderClipActions = () => {
    if (!legacyClip) return null;
    
    const isText = legacyClip.type === 'text';
    const app = (window as any).app;
    
    let canGroup = false;
    let canUngroup = false;
    
    if (app && app.selectedClipIds) {
        const selectedIds = Array.from(app.selectedClipIds);
        const selectedClips: any[] = [];
        app.tracks.forEach((t: any) => {
            t.clips.forEach((c: any) => {
                if (selectedIds.includes(c.id)) selectedClips.push(c);
            });
        });
        
        if (selectedClips.length === 1) {
            canGroup = !selectedClips[0].groupId;
            canUngroup = !!selectedClips[0].groupId;
        } else if (selectedClips.length > 1) {
            const firstGroupId = selectedClips[0].groupId;
            canGroup = selectedClips.some(c => !c.groupId || c.groupId !== firstGroupId);
            canUngroup = selectedClips.some(c => !!c.groupId);
        }
    }

    return (
      <>
        <div className="px-3 py-2 hover:bg-blue-600 cursor-pointer flex items-center gap-2" onMouseDown={(e) => { e.stopPropagation(); handleAction('cut'); }}>
          <i className="fa-solid fa-scissors w-4"></i> Cut at Playhead
        </div>
        <div className="px-3 py-2 hover:bg-red-600 cursor-pointer flex items-center gap-2" onMouseDown={(e) => { e.stopPropagation(); handleAction('delete'); }}>
          <i className="fa-solid fa-trash w-4"></i> Delete
        </div>
        <div className="h-[1px] bg-gray-600 w-full my-1"></div>
        {canGroup && (
            <div className="px-3 py-2 hover:bg-blue-600 cursor-pointer flex items-center gap-2" onMouseDown={(e) => { e.stopPropagation(); handleAction('group'); }}>
              <i className="fa-solid fa-link w-4"></i> Group Selected
            </div>
        )}
        {canUngroup && (
            <div className="px-3 py-2 hover:bg-blue-600 cursor-pointer flex items-center gap-2" onMouseDown={(e) => { e.stopPropagation(); handleAction('ungroup'); }}>
              <i className="fa-solid fa-unlink w-4"></i> Ungroup
            </div>
        )}
        {(canGroup || canUngroup) && <div className="h-[1px] bg-gray-600 w-full my-1"></div>}

        {isText ? (
           <>
             {/* Text Specific Options */}
             <div className="px-3 py-2 text-xs text-gray-400 font-bold uppercase tracking-wider bg-black/20">Text Color</div>
             <div className="px-3 py-2 flex gap-2">
                <div className="w-5 h-5 rounded-full bg-white cursor-pointer border border-gray-400 hover:scale-110" onMouseDown={(e) => { e.stopPropagation(); handleAction('textColor', '#ffffff'); }}></div>
                <div className="w-5 h-5 rounded-full bg-black cursor-pointer border border-gray-400 hover:scale-110" onMouseDown={(e) => { e.stopPropagation(); handleAction('textColor', '#000000'); }}></div>
                <div className="w-5 h-5 rounded-full bg-yellow-400 cursor-pointer border border-gray-400 hover:scale-110" onMouseDown={(e) => { e.stopPropagation(); handleAction('textColor', '#facc15'); }}></div>
                <div className="w-5 h-5 rounded-full bg-red-500 cursor-pointer border border-gray-400 hover:scale-110" onMouseDown={(e) => { e.stopPropagation(); handleAction('textColor', '#ef4444'); }}></div>
                <div className="w-5 h-5 rounded-full bg-blue-500 cursor-pointer border border-gray-400 hover:scale-110" onMouseDown={(e) => { e.stopPropagation(); handleAction('textColor', '#3b82f6'); }}></div>
             </div>
             
             <div className="px-3 py-2 text-xs text-gray-400 font-bold uppercase tracking-wider bg-black/20 mt-1">Background</div>
             <div className="px-3 py-2 flex gap-2">
                <div className="w-5 h-5 rounded bg-transparent cursor-pointer border border-red-500 relative hover:scale-110 flex items-center justify-center text-red-500 text-[10px]" onMouseDown={(e) => { e.stopPropagation(); handleAction('textBg', 'transparent'); }}><i className="fa-solid fa-ban"></i></div>
                <div className="w-5 h-5 rounded bg-black cursor-pointer border border-gray-400 hover:scale-110" onMouseDown={(e) => { e.stopPropagation(); handleAction('textBg', '#000000'); }}></div>
                <div className="w-5 h-5 rounded bg-white cursor-pointer border border-gray-400 hover:scale-110" onMouseDown={(e) => { e.stopPropagation(); handleAction('textBg', '#ffffff'); }}></div>
                <div className="w-5 h-5 rounded bg-blue-600 cursor-pointer border border-gray-400 hover:scale-110" onMouseDown={(e) => { e.stopPropagation(); handleAction('textBg', '#2563eb'); }}></div>
             </div>
           </>
        ) : (
           <>
             {/* Video/Image Specific Options */}
             <div className="px-3 py-2 text-xs text-gray-400 font-bold uppercase tracking-wider bg-black/20">Transform</div>
             <div className="px-3 py-2 hover:bg-blue-600 cursor-pointer flex items-center gap-2" onMouseDown={(e) => { e.stopPropagation(); handleAction('flipH'); }}>
                <i className="fa-solid fa-arrows-left-right w-4"></i> Flip Horizontal
             </div>
             <div className="px-3 py-2 hover:bg-blue-600 cursor-pointer flex items-center gap-2" onMouseDown={(e) => { e.stopPropagation(); handleAction('flipV'); }}>
                <i className="fa-solid fa-arrows-up-down w-4"></i> Flip Vertical
             </div>
             
             {/* AI Options */}
             <div className="h-[1px] bg-gray-600 w-full my-1"></div>
             <div className="px-3 py-2 text-xs text-indigo-400 font-bold uppercase tracking-wider bg-black/20 flex items-center gap-2">
                <i className="fa-solid fa-wand-magic-sparkles"></i> AI Tools
             </div>
             <div className="px-3 py-2 hover:bg-indigo-600 cursor-pointer flex items-center justify-between gap-2" onMouseDown={(e) => { e.stopPropagation(); handleAction('autoCaptions'); }}>
                <div className="flex items-center gap-2"><i className="fa-solid fa-closed-captioning w-4"></i> Auto Captions (Gemini)</div>
                <i className="fa-solid fa-chevron-right text-[10px] text-gray-500"></i>
             </div>
             <div className="px-3 py-2 hover:bg-indigo-600 cursor-pointer flex items-center justify-between gap-2" onMouseDown={(e) => { e.stopPropagation(); handleAction('autoReframe'); }}>
                <div className="flex items-center gap-2"><i className="fa-solid fa-crop-simple w-4"></i> Auto Reframe (Face Track)</div>
                <i className="fa-solid fa-chevron-right text-[10px] text-gray-500"></i>
             </div>
             
             <div className="h-[1px] bg-gray-600 w-full my-1"></div>
             <div className="px-3 py-2 text-xs text-gray-400 font-bold uppercase tracking-wider bg-black/20">Speed</div>
             <div className="px-3 py-2 hover:bg-blue-600 cursor-pointer flex items-center justify-between gap-2" onMouseDown={(e) => { e.stopPropagation(); handleAction('customSpeed'); }}>
                <div className="flex items-center gap-2"><i className="fa-solid fa-gauge-high w-4"></i> Speed & Duration</div>
                <i className="fa-solid fa-chevron-right text-[10px] text-gray-500"></i>
             </div>
           </>
        )}
      </>
    );
  };

  const renderBackgroundActions = () => {
    return (
      <>
        <div className="px-3 py-2 hover:bg-blue-600 cursor-pointer flex items-center gap-2" onMouseDown={(e) => { e.stopPropagation(); handleAction('addText'); }}>
           <i className="fa-solid fa-t w-4 text-center"></i> Add Text Here
        </div>
        <div className="px-3 py-2 hover:bg-blue-600 cursor-pointer flex items-center gap-2" onMouseDown={(e) => { e.stopPropagation(); handleAction('addSolid'); }}>
           <i className="fa-solid fa-square w-4 text-center"></i> Add Black Matte
        </div>
        <div className="h-[1px] bg-gray-600 w-full my-1"></div>
        <div className="px-3 py-2 hover:bg-blue-600 cursor-pointer flex items-center gap-2" onMouseDown={(e) => { e.stopPropagation(); handleAction('paste'); }}>
           <i className="fa-solid fa-paste w-4 text-center"></i> Paste
        </div>
      </>
    );
  };

  return (
    <div 
      className="context-menu-container fixed z-[99999] bg-[#1e293b] border border-gray-600 rounded shadow-2xl overflow-hidden min-w-[160px] text-sm text-gray-200 pb-1"
      style={{ 
          left: contextMenu.x, 
          ...(contextMenu.y > window.innerHeight - 300 ? { bottom: window.innerHeight - contextMenu.y } : { top: contextMenu.y })
      }}
      onMouseLeave={() => setContextMenu(null)}
      onMouseDown={(e) => e.stopPropagation()}
    >
       {contextMenu.clipId ? renderClipActions() : renderBackgroundActions()}
    </div>
  );
}
