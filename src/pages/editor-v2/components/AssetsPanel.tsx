import React, { useRef, useState, useMemo } from 'react';
import { useEditorStore } from '../../../store/useEditorStore';
import { TemplatesTab } from '../panels/TemplatesTab';
export default function AssetsPanel() {
  const assetsList = useEditorStore(state => state.assetsList);
  const addAsset = useEditorStore(state => state.addAsset);
  const removeAssets = useEditorStore(state => state.removeAssets);
  const setDraggedAsset = useEditorStore(state => state.setDraggedAsset);
  
  // local cache for duration (avoids direct Zustand state mutation)
  const durationCache = useRef<Map<string, number>>(new Map());

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [activeTab, setActiveTab] = useState<'library' | 'templates' | 'stock'>('library');
  const [gridCols, setGridCols] = useState<2 | 3 | 4>(2);

  // Phase 61: Folders, Sorting, Multi-Select
  const [currentFolder, setCurrentFolder] = useState<string | null>(null);
  const [folders, setFolders] = useState<{id: string, name: string}[]>([]);
  const [sortMode, setSortMode] = useState<'newest' | 'oldest' | 'az' | 'za'>('newest');
  const [selectedAssetIds, setSelectedAssetIds] = useState<Set<string>>(new Set());
  
  const [stockProvider, setStockProvider] = useState<'pexels' | 'pixabay' | 'unsplash'>('pexels');
  const [stockSearchQuery, setStockSearchQuery] = useState('');

  const MOCK_STOCK_DB = useMemo(() => [
     { name: "Cinematic City", type: "image" as const, url: "https://images.pexels.com/photos/374870/pexels-photo-374870.jpeg?auto=compress&cs=tinysrgb&w=400", tags: ["city", "urban", "night", "street"] },
     { name: "Forest Nature", type: "image" as const, url: "https://images.pexels.com/photos/167699/pexels-photo-167699.jpeg?auto=compress&cs=tinysrgb&w=400", tags: ["nature", "forest", "trees", "drone", "green"] },
     { name: "Ocean Waves", type: "image" as const, url: "https://images.pexels.com/photos/1001682/pexels-photo-1001682.jpeg?auto=compress&cs=tinysrgb&w=400", tags: ["ocean", "water", "sea", "waves", "beach"] },
     { name: "Mountain Landscape", type: "image" as const, url: "https://images.pexels.com/photos/164170/pexels-photo-164170.jpeg?auto=compress&cs=tinysrgb&w=400", tags: ["mountain", "nature", "landscape", "snow"] },
     { name: "Business Meeting", type: "image" as const, url: "https://images.pexels.com/photos/3183150/pexels-photo-3183150.jpeg?auto=compress&cs=tinysrgb&w=400", tags: ["business", "office", "people", "meeting", "work"] },
     { name: "Cyberpunk Street", type: "image" as const, url: "https://images.pexels.com/photos/311012/pexels-photo-311012.jpeg?auto=compress&cs=tinysrgb&w=400", tags: ["cyberpunk", "city", "neon", "night", "dark"] },
     { name: "Coffee Desk", type: "image" as const, url: "https://images.pexels.com/photos/374016/pexels-photo-374016.jpeg?auto=compress&cs=tinysrgb&w=400", tags: ["coffee", "desk", "work", "laptop", "cafe"] },
     { name: "Abstract Fluid", type: "image" as const, url: "https://images.pexels.com/photos/2832382/pexels-photo-2832382.jpeg?auto=compress&cs=tinysrgb&w=400", tags: ["abstract", "fluid", "color", "art", "paint"] },
     { name: "Dog Running", type: "image" as const, url: "https://images.pexels.com/photos/2246476/pexels-photo-2246476.jpeg?auto=compress&cs=tinysrgb&w=400", tags: ["dog", "animal", "pet", "cute", "run"] },
     { name: "Car Driving", type: "image" as const, url: "https://images.pexels.com/photos/120049/pexels-photo-120049.jpeg?auto=compress&cs=tinysrgb&w=400", tags: ["car", "driving", "road", "travel", "speed"] },
     { name: "Happy Woman", type: "image" as const, url: "https://images.pexels.com/photos/733872/pexels-photo-733872.jpeg?auto=compress&cs=tinysrgb&w=400", tags: ["woman", "happy", "smile", "people", "portrait"] },
     { name: "Space Galaxy", type: "image" as const, url: "https://images.pexels.com/photos/2150/sky-space-dark-galaxy.jpg?auto=compress&cs=tinysrgb&w=400", tags: ["space", "galaxy", "stars", "dark", "universe"] },
     { name: "Sunset Beach", type: "image" as const, url: "https://images.pexels.com/photos/3178786/pexels-photo-3178786.jpeg?auto=compress&cs=tinysrgb&w=400", tags: ["sunset", "beach", "sun", "sea", "summer"] },
     { name: "Food Pizza", type: "image" as const, url: "https://images.pexels.com/photos/1146760/pexels-photo-1146760.jpeg?auto=compress&cs=tinysrgb&w=400", tags: ["food", "pizza", "restaurant", "eat", "delicious"] },
     { name: "Fitness Gym", type: "image" as const, url: "https://images.pexels.com/photos/841130/pexels-photo-841130.jpeg?auto=compress&cs=tinysrgb&w=400", tags: ["fitness", "gym", "workout", "sport", "health"] },
     { name: "Typing Keyboard", type: "image" as const, url: "https://images.pexels.com/photos/1714208/pexels-photo-1714208.jpeg?auto=compress&cs=tinysrgb&w=400", tags: ["typing", "keyboard", "computer", "work", "office"] },
     { name: "Rain Drops", type: "image" as const, url: "https://images.pexels.com/photos/125510/pexels-photo-125510.jpeg?auto=compress&cs=tinysrgb&w=400", tags: ["rain", "water", "drops", "weather", "dark"] },
     { name: "Tech Circuit", type: "image" as const, url: "https://images.pexels.com/photos/163065/mobile-phone-android-apps-phone-163065.jpeg?auto=compress&cs=tinysrgb&w=400", tags: ["technology", "circuit", "tech", "computer"] },
     { name: "Cat Sleeping", type: "image" as const, url: "https://images.pexels.com/photos/104827/cat-pet-animal-domestic-104827.jpeg?auto=compress&cs=tinysrgb&w=400", tags: ["cat", "animal", "pet", "cute", "sleep"] },
     { name: "Money Cash", type: "image" as const, url: "https://images.pexels.com/photos/259027/pexels-photo-259027.jpeg?auto=compress&cs=tinysrgb&w=400", tags: ["money", "cash", "finance", "business"] }
  ].sort(() => Math.random() - 0.5), []); // Shuffle once on mount!

  const filteredStock = useMemo(() => {
      // Create variations based on provider to simulate different APIs
      let providerDB = [...MOCK_STOCK_DB];
      if (stockProvider === 'pexels') {
          providerDB = providerDB.filter((_, i) => i % 2 === 0);
      } else if (stockProvider === 'pixabay') {
          providerDB = providerDB.filter((_, i) => i % 3 !== 0);
      } else {
          providerDB = providerDB.filter((_, i) => i % 2 !== 0);
      }

      if (!stockSearchQuery) return providerDB;
      const q = stockSearchQuery.toLowerCase();
      return providerDB.filter(s => s.name.toLowerCase().includes(q) || s.tags.some(t => t.includes(q)));
  }, [stockSearchQuery, stockProvider, MOCK_STOCK_DB]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      Array.from(e.target.files).forEach(f => {
        const type = f.type.startsWith('image') ? 'image' : (f.type.startsWith('audio') ? 'audio' : 'video');
        const url = URL.createObjectURL(f);
        const newAsset: any = {
          id: `loc_${Date.now()}_${Math.random()}`,
          name: f.name,
          type: type,
          src: url,
          folderId: currentFolder, // Phase 61
          createdAt: Date.now() // Phase 61
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

    // Phase 61 Multi-select drag support (if multiple selected, we still just use the primary one for now, or group them)
    // For simplicity, we drag the clicked asset.
    if (!selectedAssetIds.has(asset.id)) {
        setSelectedAssetIds(new Set([asset.id]));
    }

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

    // ✅ P6: Cache track row bounding rects ONCE at drag start (avoids DOM scan on every move)
    const trackRowCache = Array.from(document.querySelectorAll<HTMLElement>('.track-row')).map(el => ({
        el,
        top: el.getBoundingClientRect().top,
        bottom: el.getBoundingClientRect().bottom,
        left: el.getBoundingClientRect().left,
        right: el.getBoundingClientRect().right,
        trackId: parseInt(el.getAttribute('data-track-id') || '0'),
        trackType: el.getAttribute('data-track-type') || ''
    }));

    // ✅ P6: RAF throttle state — limits mousemove processing to 60fps
    let _dragRafId: number | null = null;

    const moveHandler = (moveEvent: MouseEvent) => {
      // RAF throttle: skip if a frame is already queued
      if (_dragRafId !== null) return;
      _dragRafId = requestAnimationFrame(() => {
        _dragRafId = null;

        // ✅ P6: Math-based track hit test using cached bounds (O(n_tracks) vs O(DOM))
        const trackRowMatch = trackRowCache.find(b =>
            moveEvent.clientY >= b.top && moveEvent.clientY <= b.bottom
        );
        const hoveredTrackId = trackRowMatch?.trackId ?? null;
        const hoveredTrackType = trackRowMatch?.trackType ?? null;
      
      if (trackRowMatch) {
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
      }); // end RAF
    };

    const upHandler = (upEvent: MouseEvent) => {
      if (_dragRafId !== null) { cancelAnimationFrame(_dragRafId); _dragRafId = null; }
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

                      (window as any).app.commitStateToReact();
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
                          const app = (window as any).app;
                          const allAudioTracks: any[] = app.tracks.filter((t: any) => t.type === 'audio');
                          
                          // Helper: does this audio track have any clip overlapping [dropStart, dropEnd)?
                          const hasCollisionAt = (track: any, start: number, end: number) =>
                              track.clips.some((c: any) => c.start < end && (c.start + c.duration) > start);

                          // 1. Find first audio track with NO collision at drop range
                          let audioTrack = allAudioTracks.find(
                              (t: any) => !hasCollisionAt(t, currentDropTime, currentDropTime + duration)
                          );

                          // 2. If all existing audio tracks are occupied → create a new one
                          if (!audioTrack) {
                              const existingNames = allAudioTracks.map((t: any) => t.name);
                              let newTrackNum = allAudioTracks.length + 1;
                              let newTrackName = `A${newTrackNum}: Audio ${newTrackNum}`;
                              while (existingNames.includes(newTrackName)) {
                                  newTrackNum++;
                                  newTrackName = `A${newTrackNum}: Audio ${newTrackNum}`;
                              }
                              // Use a lower track id so it appears at the bottom
                              const minId = Math.min(...app.tracks.map((t: any) => t.id), 0) - 1;
                              if (app.addNewTrack) {
                                  app.addNewTrack('audio');
                                  audioTrack = app.tracks.find((t: any) => t.type === 'audio' && !allAudioTracks.includes(t));
                              }
                          }

                          if (audioTrack) {
                              const audioClip = new (window as any).Clip(
                                  `c_${Date.now()}_audio`,
                                  `${asset.name} (Audio)`,
                                  currentDropTime,
                                  duration,
                                  'audio',
                                  asset.src
                              );
                              audioClip.groupId = groupId;
                              audioTrack.addClip(audioClip);
                              // resolve collisions on whichever track the audio landed on
                              if (app.resolveCollisions) {
                                  app.resolveCollisions(audioTrack.id, audioClip);
                              }
                          }
                      }

                      if ((window as any).app.renderTracks) (window as any).app.renderTracks();
                      if ((window as any).app.saveState) (window as any).app.saveState();
                      (window as any).app.requestRedraw();
                      (window as any).app.commitStateToReact();
                  }
              } catch (err) {
                  console.error('AssetsPanel drop error:', err);
              } finally {
                  if ((window as any).app?.commitStateToReact) (window as any).app.commitStateToReact();
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
          } else if (asset.type === 'overlay') {
              // ✅ SOCIAL OVERLAY: create a special image clip with overlay data
              addClipWithDuration(asset.duration || 30);
              // After clip is created, find it and enable the social overlay
              setTimeout(() => {
                  const app = (window as any).app;
                  if (!app?.enableSocialOverlay) return;
                  const targetTrack = app.tracks.find((t: any) => t.id === currentTargetTrackId);
                  if (!targetTrack) return;
                  // find the most recently added clip in this track at the drop time
                  const added = [...targetTrack.clips]
                      .filter((c: any) => Math.abs(c.start - currentDropTime) < 0.5)
                      .sort((a: any, b: any) => b.start - a.start)[0];
                  if (added) {
                      const platform = asset.templateData?.effects?.socialOverlay?.platform || 'tiktok';
                      app.enableSocialOverlay(added.id, platform);
                  }
              }, 100);
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
    if ((a.folderId || null) !== (currentFolder || null)) return false;
    if (filterType !== 'all' && a.type !== filterType) return false;
    if (searchQuery && !a.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  }).sort((a, b) => {
    // Phase 61: Sorting logic
    if (sortMode === 'newest') return (b.createdAt || 0) - (a.createdAt || 0);
    if (sortMode === 'oldest') return (a.createdAt || 0) - (b.createdAt || 0);
    if (sortMode === 'az') return a.name.localeCompare(b.name);
    if (sortMode === 'za') return b.name.localeCompare(a.name);
    return 0;
  });

  const createFolder = () => {
      const name = prompt('Folder name:');
      if (name) {
          setFolders(prev => [...prev, { id: `folder_${Date.now()}`, name }]);
      }
  };

  const removeUnused = () => {
      const app = (window as any).app;
      if (!app) return;
      const usedSrcs = new Set();
      app.tracks.forEach((t: any) => {
          t.clips.forEach((c: any) => usedSrcs.add(c.src));
      });
      const unused = assetsList.filter(a => !usedSrcs.has(a.src)).map(a => a.id);
      if (unused.length > 0) {
          if (confirm(`Remove ${unused.length} unused assets?`)) {
              removeAssets(unused);
              setSelectedAssetIds(new Set());
          }
      } else {
          alert('No unused assets found.');
      }
  };

  const deleteSelected = () => {
      if (selectedAssetIds.size > 0 && confirm(`Delete ${selectedAssetIds.size} assets?`)) {
          removeAssets(Array.from(selectedAssetIds));
          setSelectedAssetIds(new Set());
      }
  };

  const simulateStockDownload = (url: string, type: 'image'|'video', name: string) => {
      addAsset({
          id: `stock_${Date.now()}`,
          name: name,
          type: type,
          src: url,
          createdAt: Date.now(),
          folderId: null
      });
      alert(`✅ ${name} downloaded and added to Library!`);
  };

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
        <button 
            className={`flex-1 py-2 outline-none transition-colors ${activeTab === 'stock' ? 'text-red-500 border-b-2 border-red-500 bg-[#151c2e]' : 'text-gray-400 hover:text-gray-200 hover:bg-[#111827]'}`}
            onClick={() => setActiveTab('stock')}
        >
            Stock Media
        </button>
      </div>
      
      {activeTab === 'library' && (
      <div className="p-2 border-b border-gray-700 flex flex-wrap gap-2 items-center text-gray-400">
        <div className="relative flex-grow min-w-[100px]">
          <i className="fa-solid fa-search absolute left-2 top-2 text-[10px]"></i>
          <input 
            type="text" 
            placeholder="Search" 
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full bg-[#1e293b] border border-gray-700 rounded-full pl-6 pr-2 py-1 text-[10px] focus:outline-none focus:border-red-500"
          />
        </div>
        <div className="flex items-center gap-1">
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
        </div>
        <div className="flex items-center gap-1">
          <i className="fa-solid fa-sort text-[10px] text-gray-500"></i>
          <select 
            className="bg-transparent text-[10px] text-gray-400 outline-none cursor-pointer hover:text-white appearance-none min-w-[50px]"
            value={sortMode}
            onChange={e => setSortMode(e.target.value as any)}
          >
            <option value="newest" className="bg-[#1e293b] text-gray-300">Newest</option>
            <option value="oldest" className="bg-[#1e293b] text-gray-300">Oldest</option>
            <option value="az" className="bg-[#1e293b] text-gray-300">A-Z</option>
            <option value="za" className="bg-[#1e293b] text-gray-300">Z-A</option>
          </select>
        </div>
        <div className="flex gap-1">
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
          <TemplatesTab handleAssetDrag={handleAssetDrag} gridCols={gridCols} />
        )}

        {/* === LIBRARY TAB === */}
        {activeTab === 'library' && (
          <div className="flex flex-col gap-2">
            {/* Folders Breadcrumb */}
            <div className="flex items-center gap-1 text-[10px] bg-[#1e293b] p-1.5 rounded border border-gray-700">
                <button onClick={() => setCurrentFolder(null)} className={`hover:text-white ${!currentFolder ? 'text-red-400 font-bold' : 'text-gray-400'}`}>
                    <i className="fa-solid fa-home mr-1"></i> Root
                </button>
                {currentFolder && (
                    <>
                        <i className="fa-solid fa-chevron-right text-[8px] text-gray-600"></i>
                        <span className="text-red-400 font-bold truncate">
                            <i className="fa-solid fa-folder mr-1"></i>
                            {folders.find(f => f.id === currentFolder)?.name || 'Folder'}
                        </span>
                    </>
                )}
                <div className="flex-1"></div>
                {selectedAssetIds.size > 0 && (
                    <button onClick={deleteSelected} className="text-gray-400 hover:text-red-400 mr-2" title="Delete Selected">
                        <i className="fa-solid fa-trash text-xs"></i>
                    </button>
                )}
                <button onClick={removeUnused} className="text-gray-400 hover:text-yellow-400 mr-2" title="Remove Unused">
                    <i className="fa-solid fa-broom text-xs"></i>
                </button>
                <button onClick={createFolder} className="text-gray-400 hover:text-green-400" title="New Folder">
                    <i className="fa-solid fa-folder-plus text-xs"></i>
                </button>
            </div>

            {/* Folders List (only show in root) */}
            {!currentFolder && folders.length > 0 && (
                <div className="grid grid-cols-2 gap-2 mb-2">
                    {folders.map(folder => (
                        <div 
                            key={folder.id} 
                            onClick={() => setCurrentFolder(folder.id)}
                            className="bg-[#1e293b] hover:bg-[#334155] border border-gray-700 rounded p-2 flex items-center gap-2 cursor-pointer transition-colors"
                        >
                            <i className="fa-solid fa-folder text-yellow-500 text-lg"></i>
                            <span className="text-[10px] text-gray-300 font-bold truncate">{folder.name}</span>
                        </div>
                    ))}
                </div>
            )}

          {viewMode === 'grid' ? (
            <div className={`grid gap-2 ${gridCols === 2 ? 'grid-cols-2' : gridCols === 3 ? 'grid-cols-3' : 'grid-cols-4'}`}>
              <div className="asset-item group relative aspect-video bg-[#1e293b] rounded border border-gray-700 overflow-hidden cursor-pointer hover:border-red-500 flex flex-col items-center justify-center gap-1" onClick={() => fileInputRef.current?.click()}>
                 <i className="fa-solid fa-plus text-gray-500 text-lg"></i>
                 <span className="text-[9px] text-gray-500 font-bold text-center">Add<br/>Asset</span>
              </div>
              {filteredAssets.map((asset) => (
                <div 
                  key={asset.id} 
                  title={`Name: ${asset.name}\nType: ${asset.type}\nAdded: ${new Date(asset.createdAt || Date.now()).toLocaleString()}`}
                  className={`asset-item group relative aspect-video bg-[#1e293b] rounded border overflow-hidden cursor-grab active:cursor-grabbing transition-all ${selectedAssetIds.has(asset.id) ? 'border-red-500 shadow-[0_0_8px_rgba(239,68,68,0.4)]' : 'border-gray-700 hover:border-red-500'}`}
                  onMouseDown={(e) => {
                      if (e.ctrlKey || e.metaKey) {
                          const newSet = new Set(selectedAssetIds);
                          if (newSet.has(asset.id)) newSet.delete(asset.id);
                          else newSet.add(asset.id);
                          setSelectedAssetIds(newSet);
                      } else {
                          setSelectedAssetIds(new Set([asset.id]));
                          handleAssetDrag(e, asset);
                      }
                  }}
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
                    <div className="w-full h-full flex items-center justify-center bg-[#1e293b] text-gray-500 relative">
                      <i className={`fa-solid fa-${asset.type === 'audio' ? 'volume-high' : 'file-lines'} text-xl opacity-50 transition-opacity drop-shadow`}></i>
                      {asset.type === 'audio' && (
                        <div 
                           className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center z-20 cursor-pointer"
                           onMouseDown={(e) => {
                               e.stopPropagation();
                               if ((window as any).previewAudio?.src === asset.src && !(window as any).previewAudio.paused) {
                                   (window as any).previewAudio.pause();
                               } else {
                                   if ((window as any).previewAudio) (window as any).previewAudio.pause();
                                   const audio = new Audio(asset.src);
                                   audio.volume = 0.6;
                                   audio.play();
                                   (window as any).previewAudio = audio;
                               }
                           }}
                        >
                            <i className="fa-solid fa-play text-white text-lg"></i>
                        </div>
                      )}
                    </div>
                  )}
                  <div className="absolute bottom-0 w-full bg-black/80 py-0.5 px-1 text-[8px] text-center text-gray-300 font-medium truncate pointer-events-none z-30">
                    {asset.name}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div id="assets-list" className="flex flex-col content-start w-full">
              {/* Table Header */}
              <div className="flex items-center gap-2 px-2 py-1.5 border-b border-gray-700/50 text-[9px] text-gray-500 font-bold uppercase tracking-wider mb-1">
                  <div className="w-8 shrink-0 text-center"></div>
                  <div className="flex-1">Name</div>
                  <div className="w-12 shrink-0">Type</div>
                  <div className="w-16 shrink-0 text-right">Date</div>
              </div>

              <div className="flex items-center gap-2 px-2 py-2 mb-1 bg-white/[0.02] hover:bg-white/[0.05] rounded-lg border border-dashed border-gray-600/50 cursor-pointer hover:border-red-500/50 transition-all backdrop-blur-sm" onClick={() => fileInputRef.current?.click()}>
                 <div className="w-8 flex items-center justify-center"><i className="fa-solid fa-plus text-gray-400"></i></div>
                 <span className="text-[10px] text-gray-300 font-bold">Add New Asset</span>
              </div>
              
              {filteredAssets.map((asset) => (
                <div 
                  key={asset.id} 
                  title={`Name: ${asset.name}\nType: ${asset.type}\nAdded: ${new Date(asset.createdAt || Date.now()).toLocaleString()}`}
                  className={`flex items-center gap-2 px-2 py-1.5 mb-0.5 rounded-md border backdrop-blur-md cursor-grab active:cursor-grabbing transition-all ${
                      selectedAssetIds.has(asset.id) 
                        ? 'bg-red-500/10 border-red-500/30 text-white' 
                        : 'bg-white/[0.02] border-transparent hover:bg-white/[0.06] hover:border-white/10 text-gray-300'
                  }`}
                  onMouseDown={(e) => {
                      if (e.ctrlKey || e.metaKey) {
                          const newSet = new Set(selectedAssetIds);
                          if (newSet.has(asset.id)) newSet.delete(asset.id);
                          else newSet.add(asset.id);
                          setSelectedAssetIds(newSet);
                      } else {
                          setSelectedAssetIds(new Set([asset.id]));
                          handleAssetDrag(e, asset);
                      }
                  }}
                >
                  <div className="w-8 h-8 rounded bg-black/50 border border-white/5 flex items-center justify-center overflow-hidden shrink-0 shadow-inner">
                     {asset.type === 'image' ? (
                       <img src={asset.src} className="w-full h-full object-cover pointer-events-none" />
                     ) : asset.type === 'video' ? (
                       <video src={asset.src} className="w-full h-full object-cover pointer-events-none" />
                     ) : (
                       <div className="relative w-full h-full flex items-center justify-center group/audio">
                         <i className={`fa-solid fa-${asset.type === 'audio' ? 'volume-high' : 'file-lines'} text-[10px] ${selectedAssetIds.has(asset.id) ? 'text-red-300' : 'text-gray-500'}`}></i>
                         {asset.type === 'audio' && (
                            <div 
                               className="absolute inset-0 bg-black/60 opacity-0 group-hover/audio:opacity-100 transition-opacity flex items-center justify-center z-20 cursor-pointer"
                               onMouseDown={(e) => {
                                   e.stopPropagation();
                                   if ((window as any).previewAudio?.src === asset.src && !(window as any).previewAudio.paused) {
                                       (window as any).previewAudio.pause();
                                   } else {
                                       if ((window as any).previewAudio) (window as any).previewAudio.pause();
                                       const audio = new Audio(asset.src);
                                       audio.volume = 0.6;
                                       audio.play();
                                       (window as any).previewAudio = audio;
                                   }
                               }}
                            >
                                <i className="fa-solid fa-play text-white text-[10px]"></i>
                            </div>
                         )}
                       </div>
                     )}
                  </div>
                  <div className="flex-1 min-w-0 font-medium text-[10px] truncate">{asset.name}</div>
                  <div className="w-12 shrink-0 text-[9px] uppercase tracking-wider opacity-60">{asset.type}</div>
                  <div className="w-16 shrink-0 text-[9px] text-right opacity-50">{new Date(asset.createdAt || Date.now()).toLocaleDateString(undefined, {month: 'short', day: 'numeric'})}</div>
                </div>
              ))}
            </div>
          )}
          </div>
        )}

        {/* === STOCK MEDIA TAB === */}
        {activeTab === 'stock' && (
            <div className="flex flex-col gap-3 h-full">
                <div className="flex gap-2">
                    <button onClick={() => setStockProvider('pexels')} className={`flex-1 rounded py-1 text-[10px] font-bold ${stockProvider === 'pexels' ? 'bg-green-600/20 text-green-500 border border-green-500/50' : 'bg-[#1e293b] text-gray-400 border border-gray-700 hover:text-white'}`}>Pexels</button>
                    <button onClick={() => setStockProvider('pixabay')} className={`flex-1 rounded py-1 text-[10px] font-bold ${stockProvider === 'pixabay' ? 'bg-blue-600/20 text-blue-500 border border-blue-500/50' : 'bg-[#1e293b] text-gray-400 border border-gray-700 hover:text-white'}`}>Pixabay</button>
                    <button onClick={() => setStockProvider('unsplash')} className={`flex-1 rounded py-1 text-[10px] font-bold ${stockProvider === 'unsplash' ? 'bg-gray-600/20 text-gray-200 border border-gray-500/50' : 'bg-[#1e293b] text-gray-400 border border-gray-700 hover:text-white'}`}>Unsplash</button>
                </div>
                <div className="relative mt-2">
                    <i className="fa-solid fa-search absolute left-3 top-2.5 text-gray-500 text-xs"></i>
                    <input 
                        type="text" 
                        placeholder={`Search in ${stockProvider}... (e.g. city, nature)`} 
                        value={stockSearchQuery}
                        onChange={(e) => setStockSearchQuery(e.target.value)}
                        className="w-full bg-[#0f172a] border border-gray-700 rounded-lg text-xs pl-8 pr-3 py-2 focus:border-red-500 outline-none text-white shadow-inner transition-all focus:ring-1 focus:ring-red-500/50" 
                    />
                </div>
                
                <div className="columns-2 gap-2 mt-3 overflow-y-auto pb-10 scrollbar-hide space-y-2">
                    {filteredStock.length > 0 ? filteredStock.map((stock, i) => (
                        <div key={`${stock.name}-${i}`} className="group relative bg-[#1e293b] rounded-lg border border-gray-700 overflow-hidden break-inside-avoid shadow-sm hover:shadow-red-500/20 transition-all hover:border-gray-500">
                            <img src={stock.url} className="w-full object-cover opacity-80 group-hover:opacity-100 group-hover:scale-105 transition-all duration-300" alt={stock.name} />
                            
                            {/* Hover Overlay */}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 flex flex-col justify-end p-2 transition-opacity duration-300">
                                <span className="text-[9px] font-medium text-white mb-1 drop-shadow-md truncate">{stock.name}</span>
                                <button onClick={() => simulateStockDownload(stock.url, stock.type, `${stock.name} (${stockProvider})`)} className="bg-red-600/90 text-white w-full py-1.5 rounded flex items-center justify-center hover:bg-red-500 shadow-lg cursor-pointer backdrop-blur-sm transition-colors">
                                    <i className="fa-solid fa-download text-[10px] mr-1"></i>
                                    <span className="text-[10px] font-bold">Download</span>
                                </button>
                            </div>
                            
                            {/* Provider Badge */}
                            <div className="absolute top-1 right-1 bg-black/60 backdrop-blur-sm px-1.5 py-0.5 rounded text-[8px] font-bold text-gray-300 opacity-100 group-hover:opacity-0 transition-opacity">
                                {stockProvider}
                            </div>
                        </div>
                    )) : (
                        <div className="col-span-2 text-center text-gray-500 py-12 flex flex-col items-center">
                            <i className="fa-solid fa-search text-2xl mb-2 text-gray-600"></i>
                            <span className="text-xs">No results found for "{stockSearchQuery}"</span>
                            <span className="text-[9px] mt-1 text-gray-600">Try keywords like: nature, city, dog, tech</span>
                        </div>
                    )}
                </div>
            </div>
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
