import React, { useRef, useState } from 'react';
import { useEditorStore } from '../../../store/useEditorStore';
import { textTemplates } from '../../../assets/textTemplates';
import { sfxTemplates } from '../../../assets/sfxTemplates';
import { imageTemplates } from '../../../assets/imageTemplates';
import { framesTemplates } from '../../../assets/framesTemplates';
export default function AssetsPanel() {
  const assetsList = useEditorStore(state => state.assetsList);
  const addAsset = useEditorStore(state => state.addAsset);
  const setDraggedAsset = useEditorStore(state => state.setDraggedAsset);
  
  // local cache for duration (avoids direct Zustand state mutation)
  const durationCache = useRef<Map<string, number>>(new Map());

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [activeTab, setActiveTab] = useState<'library' | 'templates'>('library');
  const [templateMode, setTemplateMode] = useState<'text' | 'sfx' | 'image' | 'frame'>('text');
  const [gridCols, setGridCols] = useState<2 | 3 | 4>(2);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      Array.from(e.target.files).forEach(f => {
        const type = f.type.startsWith('image') ? 'image' : (f.type.startsWith('audio') ? 'audio' : 'video');
        const url = URL.createObjectURL(f);
        const newAsset: any = {
          id: `loc_${Date.now()}_${Math.random()}`,
          name: f.name,
          type: type,
          src: url
        };
        
        const addToStore = (asset: any) => {
            addAsset(asset);
            if ((window as any).app) {
                // push to engine only after duration is known (avoids duration mismatch)
                if (!(window as any).app.assetsList.find((a: any) => a.id === asset.id)) {
                    (window as any).app.assetsList.push(asset);
                }
                if ((window as any).app.renderAssetsLibrary) {
                    (window as any).app.renderAssetsLibrary();
                }
            }
        };

        if (type === 'video' || type === 'audio') {
            const el = document.createElement(type);
            el.src = url;
            el.onloadedmetadata = () => {
                newAsset.duration = el.duration;
                addToStore(newAsset);
            };
            // add anyway if metadata fails (corrupted / unsupported codec)
            el.onerror = () => addToStore(newAsset);
        } else {
            addToStore(newAsset);
        }
      });
    }
  };

  const handleAssetDrag = (e: React.MouseEvent, asset: any) => {
    e.preventDefault();
    e.stopPropagation();

    const pixelsPerSecond = useEditorStore.getState().pixelsPerSecond;
    let duration = asset.duration || durationCache.current.get(asset.id) || 5;

    // Notify store that drag is in progress (other components can react)
    setDraggedAsset(asset);
    
    // Create a floating fake clip element
    const ghost = document.createElement('div');
    ghost.className = `timeline-clip absolute rounded-md shadow-md border overflow-hidden flex items-center px-2 transition-none select-none z-[9999] border-white/50 bg-blue-600/50 opacity-90`;
    ghost.style.height = '24px';
    ghost.style.width = `${duration * pixelsPerSecond}px`;
    ghost.style.pointerEvents = 'none'; // let mouse events pass through to tracks below!
    
    const updateWidth = (dur: number) => {
        duration = dur;
        ghost.style.width = `${dur * pixelsPerSecond}px`;
    };

    if (!asset.duration && !durationCache.current.has(asset.id) && (asset.type === 'video' || asset.type === 'audio')) {
        const el = document.createElement(asset.type);
        el.src = asset.src;
        el.onloadedmetadata = () => {
            // cache duration without mutating the Zustand object
            durationCache.current.set(asset.id, el.duration || 10);
            updateWidth(el.duration || 10);
        };
    }
    
    const label = document.createElement('span');
    label.className = 'text-[9px] font-bold text-white whitespace-nowrap truncate drop-shadow-md';
    label.innerText = asset.name;
    ghost.appendChild(label);
    
    document.body.appendChild(ghost);
    
    const updateGhostPos = (x: number, y: number) => {
        ghost.style.left = `${x}px`;
        ghost.style.top = `${y - 12}px`;
    };
    updateGhostPos(e.clientX, e.clientY);

    let currentTargetTrackId: number | null = null;
    let currentDropTime = 0;

    const moveHandler = (moveEvent: MouseEvent) => {
      const elementsBelow = document.elementsFromPoint(moveEvent.clientX, moveEvent.clientY);
      const trackRowEl = elementsBelow.find(el => el.classList.contains('track-row'));
      
      if (trackRowEl) {
        const hoveredTrackId = parseInt(trackRowEl.getAttribute('data-track-id') || '0');
        const hoveredTrackType = trackRowEl.getAttribute('data-track-type');
        
        let isValidTarget = false;
        if (asset.type === 'audio' && hoveredTrackType === 'audio') isValidTarget = true;
        if ((asset.type === 'video' || asset.type === 'image' || asset.type === 'text') && 
            (hoveredTrackType === 'video' || hoveredTrackType === 'main' || hoveredTrackType === 'overlay' || hoveredTrackType === 'subtitle')) isValidTarget = true;
        // ✅ Transitions can be dropped on any video/main/overlay track
        if (asset.type === 'transition' &&
            (hoveredTrackType === 'video' || hoveredTrackType === 'main' || hoveredTrackType === 'overlay')) isValidTarget = true;

            
        if (isValidTarget) {
            currentTargetTrackId = hoveredTrackId;
            const containerRect = document.getElementById('timeline-scroll-area')?.getBoundingClientRect();
            const scrollLeft = document.getElementById('timeline-scroll-area')?.scrollLeft || 0;
            const headerWidth = useEditorStore.getState().headerWidth || 140;
            
            if (containerRect) {
                const relativeX = (moveEvent.clientX - containerRect.left) + scrollLeft - headerWidth;
                let dropTime = Math.max(0, relativeX / pixelsPerSecond);
                if ((window as any).app?.getSnapPoint) {
                    const snap = (window as any).app.getSnapPoint(dropTime);
                    if (snap !== null) dropTime = snap;
                }
                currentDropTime = dropTime;
                const snappedX = containerRect.left - scrollLeft + headerWidth + (dropTime * pixelsPerSecond);
                updateGhostPos(snappedX, moveEvent.clientY);
                return;
            }
        } else {
            currentTargetTrackId = null;
        }
      } else {
          currentTargetTrackId = null;
      }
      updateGhostPos(moveEvent.clientX, moveEvent.clientY);
    };

    const upHandler = (upEvent: MouseEvent) => {
      document.removeEventListener('mousemove', moveHandler);
      document.removeEventListener('mouseup', upHandler);
      if (ghost.parentNode) ghost.parentNode.removeChild(ghost);
      setDraggedAsset(null); // clear drag state
      
      const elementsBelow = document.elementsFromPoint(upEvent.clientX, upEvent.clientY);
      const frameControlsEl = elementsBelow.find(el => el.id === 'smart-frame-controls-group');
      
      if (frameControlsEl && (window as any).app && asset.type !== 'transition') {
          if (asset.type === 'video' || asset.type === 'image') {
              const clipId = Array.from((window as any).app.selectedClipIds)[0] as string;
              if (clipId) {
                  const c = (window as any).app.findClipById(clipId);
                  if (c && c.src && c.src.includes('frame_')) {
                      c.properties.innerMediaType = asset.type;
                      c.properties.innerMediaSrc = asset.src;
                      if ((window as any).app.fitMediaToFrame) {
                          (window as any).app.fitMediaToFrame(clipId, 'fill');
                      }

                      // ✅ If video — use central engine helper to stretch frame clip + timeline
                      if (asset.type === 'video' && asset.src) {
                          const tempVid = document.createElement('video');
                          tempVid.preload = 'metadata';
                          tempVid.src = asset.src;
                          tempVid.onloadedmetadata = () => {
                              const d = tempVid.duration;
                              if (isFinite(d) && d > 0) {
                                  (window as any).app.stretchClipDuration(clipId, d);
                              }
                          };
                      }

                      (window as any).app.syncToStore();
                      (window as any).app.requestRedraw();
                      (window as any).app.updateEffectControls();
                  }
              }
          }
          return; // Prevent adding to timeline
      }

      
      if (currentTargetTrackId !== null && (window as any).app) {
          const addClipWithDuration = (duration: number) => {
              try {
                  const targetTrack = (window as any).app.tracks.find((t: any) => t.id === currentTargetTrackId);
                  if (targetTrack) {
                      const groupId = asset.type === 'video' ? `group_asset_${Date.now()}` : undefined;
                      const newClip = new (window as any).Clip(`c_${Date.now()}`, asset.name, currentDropTime, duration, asset.type, asset.src);
                      if (groupId) newClip.groupId = groupId;
                      
                      // Apply Template Data if available
                      if (asset.templateData) {
                          if (asset.templateData.textStyle) newClip.textStyle = JSON.parse(JSON.stringify(asset.templateData.textStyle));
                          if (asset.templateData.properties) newClip.properties = JSON.parse(JSON.stringify(asset.templateData.properties));
                          if (asset.templateData.transitions) newClip.transitions = JSON.parse(JSON.stringify(asset.templateData.transitions));
                          if (asset.templateData.effects) newClip.effects = JSON.parse(JSON.stringify(asset.templateData.effects));
                      }
                      
                      targetTrack.addClip(newClip);
                      if ((window as any).app.resolveCollisions) {
                        (window as any).app.resolveCollisions(targetTrack.id, newClip);
                      }
                      if (asset.type === 'video') {
                          const audioTrack = (window as any).app.tracks.find((t: any) => t.type === 'audio');
                          if (audioTrack) {
                              const audioClip = new (window as any).Clip(`c_${Date.now()}_audio`, `${asset.name} (Audio)`, currentDropTime, duration, 'audio', asset.src);
                              audioClip.groupId = groupId;
                              audioTrack.addClip(audioClip);
                              if ((window as any).app.resolveCollisions) {
                                (window as any).app.resolveCollisions(audioTrack.id, audioClip);
                              }
                          }
                      }
                      if ((window as any).app.renderTracks) (window as any).app.renderTracks();
                      if ((window as any).app.saveState) (window as any).app.saveState();
                      (window as any).app.requestRedraw();
                      (window as any).app.syncToStore();
                  }
              } catch (err) {
                  console.error('AssetsPanel drop error:', err);
              } finally {
                  if ((window as any).app?.syncToStore) (window as any).app.syncToStore();
              }
          };

          // ✅ TRANSITION: route to engine's addTransition (not addClipWithDuration)
          if (asset.type === 'transition') {
              if ((window as any).app?.addTransition) {
                  (window as any).app.addTransition(
                      currentTargetTrackId,
                      currentDropTime,
                      asset.transitionType || 'cross_dissolve'
                  );
              }
          } else if (asset.duration) {
              addClipWithDuration(asset.duration);
          } else if (durationCache.current.has(asset.id)) {
              addClipWithDuration(durationCache.current.get(asset.id)!);
          } else if (asset.type === 'video' || asset.type === 'audio') {
              const el = document.createElement(asset.type);
              el.src = asset.src;
              el.onloadedmetadata = () => {
                  const dur = el.duration || 10;
                  durationCache.current.set(asset.id, dur); // cache without mutating store
                  addClipWithDuration(dur);
              };
          } else {
              addClipWithDuration(5);
          }

      }
    };

    document.addEventListener('mousemove', moveHandler);
    document.addEventListener('mouseup', upHandler);
  };

  const filteredAssets = assetsList.filter(a => {
    if (filterType !== 'all' && a.type !== filterType) return false;
    if (searchQuery && !a.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  return (
    <div id="assets-panel" className="editor-panel glow-border-red w-[320px] flex flex-col flex-shrink-0 overflow-hidden min-w-0 bg-[#0a0f1d]">
      <div className="flex border-b border-gray-700 text-[11px] font-bold">
        <button 
            className={`flex-1 py-2 outline-none transition-colors ${activeTab === 'library' ? 'text-red-500 border-b-2 border-red-500 bg-[#151c2e]' : 'text-gray-400 hover:text-gray-200 hover:bg-[#111827]'}`}
            onClick={() => setActiveTab('library')}
        >
            Library
        </button>
        <button 
            className={`flex-1 py-2 outline-none transition-colors ${activeTab === 'templates' ? 'text-red-500 border-b-2 border-red-500 bg-[#151c2e]' : 'text-gray-400 hover:text-gray-200 hover:bg-[#111827]'}`}
            onClick={() => setActiveTab('templates')}
        >
            Templates
        </button>
      </div>
      
      {activeTab === 'library' && (
      <div className="p-2 border-b border-gray-700 flex gap-2 items-center text-gray-400">
        <div className="relative flex-grow">
          <i className="fa-solid fa-search absolute left-2 top-2 text-[10px]"></i>
          <input 
            type="text" 
            placeholder="Search" 
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full bg-[#1e293b] border border-gray-700 rounded-full pl-6 pr-2 py-1 text-[10px] focus:outline-none focus:border-red-500"
          />
        </div>
        <i className="fa-solid fa-filter text-[10px] text-gray-500"></i>
        <select 
          className="bg-transparent text-[10px] text-gray-400 outline-none cursor-pointer hover:text-white appearance-none"
          value={filterType}
          onChange={e => setFilterType(e.target.value)}
        >
          <option value="all" className="bg-[#1e293b] text-gray-300">All</option>
          <option value="video" className="bg-[#1e293b] text-gray-300">Video</option>
          <option value="audio" className="bg-[#1e293b] text-gray-300">Audio</option>
          <option value="image" className="bg-[#1e293b] text-gray-300">Image</option>
        </select>
        <div className="flex gap-1 ml-2">
           {viewMode === 'grid' && (
             <div className="flex items-center bg-[#1e293b] rounded mr-1 px-1">
               <button 
                 onClick={() => setGridCols(prev => (prev > 2 ? prev - 1 : prev) as 2|3|4)}
                 className="text-gray-500 hover:text-white px-1 disabled:opacity-30"
                 disabled={gridCols === 2}
               ><i className="fa-solid fa-minus text-[8px]"></i></button>
               <span className="text-[9px] text-gray-400 font-bold px-1 w-3 text-center">{gridCols}</span>
               <button 
                 onClick={() => setGridCols(prev => (prev < 4 ? prev + 1 : prev) as 2|3|4)}
                 className="text-gray-500 hover:text-white px-1 disabled:opacity-30"
                 disabled={gridCols === 4}
               ><i className="fa-solid fa-plus text-[8px]"></i></button>
             </div>
           )}
           <i 
             className={`fa-solid fa-list cursor-pointer p-1 rounded ${viewMode === 'list' ? 'text-white bg-[#334155]' : 'hover:text-white bg-[#1e293b] text-gray-500'}`}
             onClick={() => setViewMode('list')}
           ></i>
           <i 
             className={`fa-solid fa-border-all cursor-pointer p-1 rounded ${viewMode === 'grid' ? 'text-white bg-[#334155]' : 'hover:text-white bg-[#1e293b] text-gray-500'}`}
             onClick={() => setViewMode('grid')}
           ></i>
        </div>
      </div>
      )}

      <input 
        type="file" 
        ref={fileInputRef}
        className="hidden" 
        multiple 
        accept="image/*,video/*,audio/*" 
        onChange={handleFileUpload}
      />
      
      <div className="flex-1 overflow-y-auto p-2 scrollbar-hide bg-[#050811]">
        
        {/* === TEMPLATES TAB === */}
        {activeTab === 'templates' && (
            <>
                <div className="flex gap-2 mb-3 mt-1 px-1 flex-wrap">
                    <button 
                        onClick={() => setTemplateMode('text')} 
                        className={`flex-1 min-w-[70px] py-1.5 text-[11px] font-bold rounded border ${templateMode === 'text' ? 'bg-red-600/20 text-red-500 border-red-500/50' : 'bg-[#1e293b] text-gray-400 border-gray-700 hover:text-gray-200'}`}
                    >
                        <i className="fa-solid fa-font mr-1"></i> Texts
                    </button>
                    <button 
                        onClick={() => setTemplateMode('image')} 
                        className={`flex-1 min-w-[70px] py-1.5 text-[11px] font-bold rounded border ${templateMode === 'image' ? 'bg-green-600/20 text-green-500 border-green-500/50' : 'bg-[#1e293b] text-gray-400 border-gray-700 hover:text-gray-200'}`}
                    >
                        <i className="fa-solid fa-image mr-1"></i> Images
                    </button>
                    <button 
                        onClick={() => setTemplateMode('frame')} 
                        className={`flex-1 min-w-[70px] py-1.5 text-[11px] font-bold rounded border ${templateMode === 'frame' ? 'bg-purple-600/20 text-purple-500 border-purple-500/50' : 'bg-[#1e293b] text-gray-400 border-gray-700 hover:text-gray-200'}`}
                    >
                        <i className="fa-solid fa-mobile-screen mr-1"></i> Frames
                    </button>
                    <button 
                        onClick={() => setTemplateMode('sfx')} 
                        className={`flex-1 min-w-[80px] py-1.5 text-[11px] font-bold rounded border ${templateMode === 'sfx' ? 'bg-blue-600/20 text-blue-500 border-blue-500/50' : 'bg-[#1e293b] text-gray-400 border-gray-700 hover:text-gray-200'}`}
                    >
                        <i className="fa-solid fa-bolt mr-1"></i> SFX
                    </button>
                </div>
                <div className={`grid gap-2 ${gridCols === 2 ? 'grid-cols-2' : gridCols === 3 ? 'grid-cols-3' : 'grid-cols-4'}`}>
                    {(templateMode === 'text' ? textTemplates : templateMode === 'image' ? imageTemplates : templateMode === 'frame' ? framesTemplates : sfxTemplates).map(tpl => (
                    <div 
                        key={tpl.id} 
                        className="bg-[#0f172a] rounded overflow-hidden border border-gray-700 hover:border-red-500 cursor-grab active:cursor-grabbing flex flex-col group transition-all duration-300"
                        onMouseDown={(e) => handleAssetDrag(e, tpl)}
                        onMouseEnter={() => { 
                            if (tpl.type === 'audio') {
                                if ((window as any).previewAudio) {
                                    (window as any).previewAudio.pause();
                                }
                                const audio = new Audio(tpl.src);
                                audio.volume = 0.6;
                                audio.play().catch(e => console.log('Audio preview blocked', e));
                                (window as any).previewAudio = audio;
                            } else if ((window as any).app) { 
                                (window as any).app.hoveredTemplate = tpl; 
                                (window as any).app.hoverStartTime = Date.now();
                                if (!(window as any).app.hoverAnimFrame) {
                                    const loop = () => {
                                        if ((window as any).app.hoveredTemplate) {
                                            (window as any).app.requestRedraw();
                                            (window as any).app.hoverAnimFrame = requestAnimationFrame(loop);
                                        } else {
                                            cancelAnimationFrame((window as any).app.hoverAnimFrame);
                                            (window as any).app.hoverAnimFrame = null;
                                        }
                                    };
                                    loop();
                                }
                            } 
                        }}
                        onMouseLeave={() => { 
                            if (tpl.type === 'audio') {
                                if ((window as any).previewAudio) {
                                    (window as any).previewAudio.pause();
                                    (window as any).previewAudio = null;
                                }
                            } else if ((window as any).app) { 
                                (window as any).app.hoveredTemplate = null; 
                                (window as any).app.requestRedraw(); 
                            } 
                        }}
                        onDoubleClick={() => {
                            if ((window as any).app && (window as any).app.tracks) {
                                const targetType = tpl.type === 'audio' ? 'audio' : (tpl.type === 'image' ? 'main' : 'subtitle');
                                const targetTrack = (window as any).app.tracks.find((t: any) => t.type === targetType);
                                if (targetTrack) {
                                    const newClip = new (window as any).Clip(`c_${Date.now()}`, tpl.name, (window as any).app.currentTime || 0, tpl.duration || 5, tpl.type, tpl.src);
                                    if (tpl.templateData) {
                                        if (tpl.templateData.textStyle) newClip.textStyle = JSON.parse(JSON.stringify(tpl.templateData.textStyle));
                                        if (tpl.templateData.properties) newClip.properties = JSON.parse(JSON.stringify(tpl.templateData.properties));
                                        if (tpl.templateData.transitions) newClip.transitions = JSON.parse(JSON.stringify(tpl.templateData.transitions));
                                        if (tpl.templateData.effects) newClip.effects = JSON.parse(JSON.stringify(tpl.templateData.effects));
                                    }
                                    targetTrack.addClip(newClip);
                                    if ((window as any).app.resolveCollisions) (window as any).app.resolveCollisions(targetTrack.id, newClip);
                                    if ((window as any).app.saveState) (window as any).app.saveState();
                                    (window as any).app.requestRedraw();
                                    (window as any).app.syncToStore();
                                } else {
                                    if (tpl.type === 'audio') {
                                        (window as any).app.addNewTrack('audio');
                                        const newTarget = (window as any).app.tracks.find((t: any) => t.type === 'audio');
                                        if (newTarget) {
                                            const newClip = new (window as any).Clip(`c_${Date.now()}`, tpl.name, (window as any).app.currentTime || 0, tpl.duration || 5, 'audio', tpl.src);
                                            newTarget.addClip(newClip);
                                            if ((window as any).app.saveState) (window as any).app.saveState();
                                            (window as any).app.requestRedraw();
                                            (window as any).app.syncToStore();
                                        }
                                    }
                                }
                            }
                        }}
                    >
                        {tpl.type === 'audio' ? (
                            <div className="w-full aspect-video flex items-center justify-center relative overflow-hidden bg-black">
                                <img src={tpl.thumbnail || "https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?auto=format&fit=crop&q=80&w=300"} alt="SFX" className="w-full h-full object-cover opacity-50" />
                                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                    <div className="bg-red-600/80 w-10 h-10 rounded-full flex items-center justify-center shadow-lg shadow-red-900/50 backdrop-blur-md">
                                        <i className="fa-solid fa-music text-white text-lg"></i>
                                    </div>
                                </div>
                                <div className="absolute bottom-1 right-1 bg-black/80 px-1.5 py-0.5 rounded text-[8px] text-white font-mono z-20 pointer-events-none border border-white/20">
                                    {tpl.duration}s
                                </div>
                            </div>
                        ) : tpl.type === 'image' ? (
                            <div className="w-full aspect-video flex items-center justify-center relative overflow-hidden bg-[url('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAYAAACNMs+9AAAAOklEQVQYV2NkYGAwYkAD////Z8SRAaYIE2RYgDCAUgwjO4xXGHE6n2QzGGkG49bA0EGGp+x4Mh22CQBM5A81T+uOBAAAAABJRU5ErkJggg==')]">
                                <div className="absolute inset-0 bg-black/60 z-0"></div>
                                <img 
                                    src={tpl.thumbnail || tpl.src} 
                                    alt={tpl.name} 
                                    className="relative z-10 w-auto h-auto max-w-full max-h-full object-contain transition-transform duration-500 group-hover:scale-110 pointer-events-none" 
                                />
                            </div>
                        ) : (
                            <div className="w-full aspect-video flex items-center justify-center relative overflow-hidden bg-[url('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAYAAACNMs+9AAAAOklEQVQYV2NkYGAwYkAD////Z8SRAaYIE2RYgDCAUgwjO4xXGHE6n2QzGGkG49bA0EGGp+x4Mh22CQBM5A81T+uOBAAAAABJRU5ErkJggg==')]">
                                <div className="absolute inset-0 bg-black/60 z-0"></div>
                                
                                <div className="absolute z-10 w-full h-full pointer-events-none" style={{
                                    transform: `translate(calc(${((tpl.templateData?.properties?.positionX || 0) / 1920) * 100}%), calc(${((tpl.templateData?.properties?.positionY || 0) / 1080) * 100}%))`
                                }}>
                                    <div className="absolute left-1/2 top-1/2" style={{ transform: 'translate(-50%, -50%)' }}>
                                        <div className="transition-transform duration-500 group-hover:scale-110" style={{
                                            transform: `scale(${(tpl.templateData?.properties?.scale || 100) / 100}) rotate(${tpl.templateData?.properties?.rotation || 0}deg)`,
                                            transformOrigin: 'center center'
                                        }}>
                                            <div className={`inline-block ${gridCols === 4 ? 'text-[4px]' : gridCols === 3 ? 'text-[6px]' : 'text-[8px]'} whitespace-pre`} style={{
                                                fontFamily: tpl.templateData?.textStyle?.fontFamily || 'Inter',
                                                fontWeight: tpl.templateData?.textStyle?.fontWeight || 'bold',
                                                fontStyle: tpl.templateData?.textStyle?.fontStyle || 'normal',
                                                color: tpl.templateData?.textStyle?.color || '#ffffff',
                                                textShadow: tpl.templateData?.textStyle?.shadowBlur > 0 ? `0px 0px ${tpl.templateData.textStyle.shadowBlur}px ${tpl.templateData.textStyle.color}` : 'none',
                                                textTransform: (tpl.templateData?.textStyle?.textTransform === 'none' ? undefined : tpl.templateData?.textStyle?.textTransform) as any,
                                                backgroundColor: (tpl.templateData?.textStyle?.backgroundOpacity || 0) > 0 ? tpl.templateData?.textStyle?.backgroundColor : 'transparent',
                                                padding: (tpl.templateData?.textStyle?.backgroundOpacity || 0) > 0 ? `${(tpl.templateData?.textStyle?.padding || 10) / 4}px ${(tpl.templateData?.textStyle?.padding || 10) / 2}px` : '0',
                                                borderRadius: '2px',
                                                border: tpl.templateData?.textStyle?.strokeWidth > 0 ? `${tpl.templateData.textStyle.strokeWidth / 2}px solid ${tpl.templateData.textStyle.strokeColor}` : 'none'
                                            }}>
                                                {tpl.src}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                        <div className="p-2 flex flex-col gap-0.5 bg-[#151c2e]">
                            <div className="text-[10px] text-gray-200 font-bold truncate">{tpl.name}</div>
                            <div className="text-[7px] text-gray-500 uppercase flex gap-1">
                                {tpl.templateData?.properties?.positionY < -200 ? 'Top' : tpl.templateData?.properties?.positionY > 200 ? 'Bottom' : 'Center'}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
            </>
        )}

        {/* === LIBRARY TAB === */}
        {activeTab === 'library' && (
          viewMode === 'grid' ? (
            <div className={`grid gap-2 ${gridCols === 2 ? 'grid-cols-2' : gridCols === 3 ? 'grid-cols-3' : 'grid-cols-4'}`}>
              <div className="asset-item group relative aspect-video bg-[#1e293b] rounded border border-gray-700 overflow-hidden cursor-pointer hover:border-red-500 flex flex-col items-center justify-center gap-1" onClick={() => fileInputRef.current?.click()}>
                 <i className="fa-solid fa-plus text-gray-500 text-lg"></i>
                 <span className="text-[9px] text-gray-500 font-bold text-center">Add<br/>Asset</span>
              </div>
              {filteredAssets.map((asset) => (
                <div 
                  key={asset.id} 
                  className="asset-item group relative aspect-video bg-[#1e293b] rounded border border-gray-700 overflow-hidden cursor-grab active:cursor-grabbing hover:border-red-500 transition-all"
                  onMouseDown={(e) => handleAssetDrag(e, asset)}
                >
                  {asset.type === 'image' ? (
                    <img src={asset.src} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 pointer-events-none transition-opacity" alt={asset.name} />
                  ) : asset.type === 'video' ? (
                    <div className="w-full h-full relative">
                       <video src={asset.src} className="w-full h-full object-cover opacity-60 group-hover:opacity-90 pointer-events-none transition-opacity" />
                       <div className="absolute inset-0 flex items-center justify-center">
                          <i className="fa-solid fa-play text-white/50 group-hover:text-white/80 drop-shadow-md transition-colors"></i>
                       </div>
                    </div>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-[#1e293b] text-gray-500 pointer-events-none">
                      <i className={`fa-solid fa-${asset.type === 'audio' ? 'volume-high' : 'file-lines'} text-xl opacity-50 group-hover:opacity-100 transition-opacity drop-shadow`}></i>
                    </div>
                  )}
                  <div className="absolute bottom-0 w-full bg-black/80 py-0.5 px-1 text-[8px] text-center text-gray-300 font-medium truncate pointer-events-none">
                    {asset.name}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div id="assets-list" className="flex flex-col gap-1 content-start">
              <div className="flex items-center gap-2 p-2 bg-[#1e293b] rounded border border-gray-700 cursor-pointer hover:border-red-500" onClick={() => fileInputRef.current?.click()}>
                 <i className="fa-solid fa-plus text-gray-500 text-lg w-8 text-center"></i>
                 <span className="text-[10px] text-gray-400 font-bold">Add New Asset</span>
              </div>
              {filteredAssets.map((asset) => (
                <div 
                  key={asset.id} 
                  className="flex items-center gap-2 p-1.5 bg-[#1e293b] rounded border border-transparent hover:border-gray-600 cursor-grab active:cursor-grabbing transition-all"
                  onMouseDown={(e) => handleAssetDrag(e, asset)}
                >
                  <div className="w-8 h-8 rounded bg-black flex items-center justify-center overflow-hidden shrink-0">
                     {asset.type === 'image' ? (
                       <img src={asset.src} className="w-full h-full object-cover pointer-events-none" />
                     ) : asset.type === 'video' ? (
                       <video src={asset.src} className="w-full h-full object-cover pointer-events-none" />
                     ) : (
                       <i className={`fa-solid fa-${asset.type === 'audio' ? 'volume-high' : 'file-lines'} text-[10px] text-gray-500`}></i>
                     )}
                  </div>
                  <div className="flex flex-col min-w-0 flex-grow">
                     <span className="text-[10px] text-gray-300 font-medium truncate">{asset.name}</span>
                     <span className="text-[8px] text-gray-500 uppercase">{asset.type}</span>
                  </div>
                </div>
              ))}
            </div>
          )
        )}
        
        {activeTab === 'library' && filteredAssets.length === 0 && (
          <div className="text-center py-10 text-[10px] text-gray-600">
            No assets found. Click + to add some.
          </div>
        )}
      </div>

      {activeTab === 'library' && (
      <div className="p-2 border-t border-gray-700 bg-[#0a0f1d]">
        <button 
          onClick={() => fileInputRef.current?.click()}
          className="w-full bg-red-600 hover:bg-red-500 text-white text-[11px] font-bold py-1.5 rounded transition-colors flex items-center justify-center gap-2 shadow-[0_0_10px_rgba(220,38,38,0.3)]"
        >
          <i className="fa-solid fa-plus"></i> Add Files
        </button>
      </div>
      )}
    </div>
  );
}
