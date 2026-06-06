import { create } from 'zustand';
import { Asset, Track, Clip, EditorSettings } from '../types/editor.types';

interface EditorState {
  // Data
  assetsList: Asset[];
  tracks: Track[];
  settings: EditorSettings | null;
  
  // Playback
  currentTime: number;
  isPlaying: boolean;
  duration: number; // total duration of the timeline
  
  // UI State
  zoomLevel: number;
  pixelsPerSecond: number;
  activeTool: 'select' | 'cut' | 'text' | 'delete' | 'slip' | 'slide' | 'rolling';
  selectedClipIds: Set<string>;
  headerWidth: number;
  
  // Canvas Settings
  aspectRatio: string;
  resolution: string;
  customWidth: number;
  customHeight: number;
  fps: number;
  
  // Actions
  syncApp: (tracks: Track[], currentTime: number, isPlaying: boolean) => void;
  setSettings: (settings: EditorSettings) => void;
  addAsset: (asset: Asset) => void;
  addTrack: (track: Track) => void;
  addClipToTrack: (trackId: number, clip: Clip) => void;
  updateClip: (clipId: string, updates: Partial<Clip>) => void;
  moveClipToTrack: (clipId: string, sourceTrackId: number, targetTrackId: number) => void;
  setHeaderWidth: (width: number) => void;
  setCanvasSettings: (aspectRatio: string, resolution: string, customW?: number, customH?: number) => void;
  setFps: (fps: number) => void;
  
  // Phase 35, 39: Canvas Overlays
  showRuleOfThirds: boolean;
  setShowRuleOfThirds: (show: boolean) => void;
  showSafeZones: boolean;
  setShowSafeZones: (show: boolean) => void;
  
  // Playback Actions
  togglePlay: () => void;
  setCurrentTime: (time: number) => void;
  setZoomPercentage: (percent: number) => void;
  setTool: (tool: 'select' | 'cut' | 'text' | 'delete' | 'slip' | 'slide' | 'rolling') => void;
  
  // Drag State
  draggedAsset: Asset | null;
  setDraggedAsset: (asset: Asset | null) => void;

  // Log (for system log modal in Modals.tsx)
  logs: { msg: string; time: string }[];
  addLog: (msg: string) => void;

  // Visual Feedback (Phase 25)
  highlightedClip: string | null;
  setHighlightedClip: (id: string | null) => void;

  // CMD Aliases (Macros)
  cmdAliases: Record<string, string>;
  setCmdAlias: (name: string, commands: string) => void;

  // Context Menu & Modals
  contextMenu: { x: number, y: number, time?: number, clipId?: string, trackId?: number } | null;
  setContextMenu: (menu: { x: number, y: number, time?: number, clipId?: string, trackId?: number } | null) => void;
  speedModal: { clipId: string } | null;
  setSpeedModal: (modal: { clipId: string } | null) => void;
  exportVideoModal: boolean;
  setExportVideoModal: (open: boolean) => void;

  // Timeline Features
  isMagneticMode: boolean;
  setMagneticMode: (mode: boolean) => void;
  collapsedTracks: Set<number>;
  toggleTrackCollapse: (trackId: number) => void;

  // Phase 26: Loop Region
  loopRegion: { in: number; out: number } | null;
  setLoopRegion: (region: { in: number; out: number } | null) => void;
  isLooping: boolean;
  setIsLooping: (v: boolean) => void;
}

export const useEditorStore = create<EditorState>((set, get) => ({
  assetsList: [
    {
        id: 'asset_dummy_1',
        name: 'Cinematic B-Roll.mp4',
        type: 'video',
        src: 'https://cdn.pixabay.com/video/2020/05/11/38600-418465063_tiny.mp4',
        createdAt: Date.now() - 100000
    },
    {
        id: 'asset_dummy_2',
        name: 'Cyberpunk Aesthetic.jpg',
        type: 'image',
        src: 'https://images.pexels.com/photos/311012/pexels-photo-311012.jpeg?auto=compress&cs=tinysrgb&w=200',
        createdAt: Date.now() - 50000
    },
    {
        id: 'asset_dummy_3',
        name: 'Background Music.mp3',
        type: 'audio',
        src: 'https://cdn.pixabay.com/audio/2022/10/25/audio_291122a275.mp3',
        createdAt: Date.now() - 10000
    }
  ],
  tracks: [],
  settings: null,
  
  currentTime: 0,
  isPlaying: false,
  duration: 300, // 5 minutes default
  
  zoomLevel: 100,
  pixelsPerSecond: 20,
  activeTool: 'select',
  selectedClipIds: new Set(),
  headerWidth: 140,
  
  draggedAsset: null,
  setDraggedAsset: (asset) => set({ draggedAsset: asset }),
  
  aspectRatio: 'original',
  resolution: 'original',
  customWidth: 1920,
  customHeight: 1080,
  fps: 30,

  showRuleOfThirds: false,
  setShowRuleOfThirds: (show) => {
      set({ showRuleOfThirds: show });
      if ((window as any).app) (window as any).app.requestRedraw?.();
  },
  showSafeZones: false,
  setShowSafeZones: (show) => {
      set({ showSafeZones: show });
      if ((window as any).app) (window as any).app.requestRedraw?.();
  },
  
  logs: [{ msg: 'Ready...', time: new Date().toLocaleTimeString('ar-EG', { hour12: false, hour: 'numeric', minute: 'numeric', second: 'numeric' }) }],
  
  highlightedClip: null,
  setHighlightedClip: (id) => set({ highlightedClip: id }),

  cmdAliases: {},
  setCmdAlias: (name, commands) => set((state) => ({ 
      cmdAliases: { ...state.cmdAliases, [name]: commands } 
  })),

  contextMenu: null,
  setContextMenu: (menu) => set({ contextMenu: menu }),
  speedModal: null,
  setSpeedModal: (modal) => set({ speedModal: modal }),
  exportVideoModal: false,
  setExportVideoModal: (open) => set({ exportVideoModal: open }),

  isMagneticMode: true,
  setMagneticMode: (mode) => set({ isMagneticMode: mode }),

  collapsedTracks: new Set(),
  toggleTrackCollapse: (trackId) => set((state) => {
      const newSet = new Set(state.collapsedTracks);
      if (newSet.has(trackId)) newSet.delete(trackId);
      else newSet.add(trackId);
      return { collapsedTracks: newSet };
  }),

  // Phase 26
  loopRegion: null,
  setLoopRegion: (region) => set({ loopRegion: region }),
  isLooping: false,
  setIsLooping: (v) => set({ isLooping: v }),

  syncApp: (tracks, currentTime, isPlaying) => set({ 
    // FIX #6: one-level deep copy so React detects clip-level mutations.
    // [...tracks] alone keeps same Track references → React misses clip changes.
    tracks: tracks.map(t => ({ ...t, clips: [...t.clips] })),
    currentTime, 
    isPlaying 
  }),
  
  setSettings: (settings) => set({ settings }),
  
  setCanvasSettings: (aspectRatio, resolution, customW, customH) => set((state) => ({
      aspectRatio,
      resolution,
      customWidth: customW ?? state.customWidth,
      customHeight: customH ?? state.customHeight
  })),
  setFps: (fps) => {
      set({ fps });
      if ((window as any).app) {
          (window as any).app.FPS = fps;
      }
  },
  setHeaderWidth: (width) => {
      set({ headerWidth: Math.max(100, Math.min(width, 400)) });
      if ((window as any).app) {
          (window as any).app.headerWidth = Math.max(100, Math.min(width, 400));
          (window as any).app.requestRedraw?.();
      }
  },
  addAsset: (asset) => {
    get().addLog(`✅ تم إضافة ملف للذاكرة: ${asset.name}`);
    set((state) => {
      if (state.assetsList.some(a => a.id === asset.id)) return state;
      return { assetsList: [...state.assetsList, asset] };
    });
  },
  removeAsset: (id) => set((state) => ({ assetsList: state.assetsList.filter(a => a.id !== id) })),
  removeAssets: (ids) => set((state) => ({ assetsList: state.assetsList.filter(a => !ids.includes(a.id)) })),
  
  addTrack: (track) => {
    get().addLog(`🛤️ تم إضافة تراك جديد: ${track.type}`);
    set((state) => {
      if (state.tracks.some(t => t.id === track.id)) return state;
      return { tracks: [...state.tracks, track] };
    });
  },
  
  addClipToTrack: (trackId, clip) => {
    get().addLog(`✂️ تم وضع مقطع في التايم لاين (نوع: ${clip.type}) في تراك رقم ${trackId}`);
    set((state) => ({
      tracks: state.tracks.map(t => 
        t.id === trackId ? { ...t, clips: [...t.clips, clip] } : t
      )
    }));
  },

  updateClip: (clipId, updates) => {
    get().addLog(`⚙️ تم تعديل خصائص المقطع: ${clipId} (${Object.keys(updates).join(', ')})`);
    set((state) => ({
      tracks: state.tracks.map(t => ({
        ...t,
        clips: t.clips.map(c => c.id === clipId ? { ...c, ...updates } : c)
      }))
    }));
  },

  moveClipToTrack: (clipId, sourceTrackId, targetTrackId) => set((state) => {
    if (sourceTrackId === targetTrackId) return state;
    
    let clipToMove = null;
    const newTracks = state.tracks.map(t => {
      if (t.id === sourceTrackId) {
        clipToMove = t.clips.find(c => c.id === clipId);
        return { ...t, clips: t.clips.filter(c => c.id !== clipId) };
      }
      return t;
    });

    if (!clipToMove) return state;

    return {
      tracks: newTracks.map(t => {
        if (t.id === targetTrackId) {
          return { ...t, clips: [...t.clips, clipToMove!] };
        }
        return t;
      })
    };
  }),
  
  togglePlay: () => {
    // FIX 2: Always route through the engine so it manages audio, video players,
    // and pushes isPlaying back to Zustand via startPlayback/pausePlayback.
    // Pure Zustand toggle is only a fallback when the engine is not yet mounted.
    const app = (window as any).app;
    if (app?.togglePlay) {
      app.togglePlay();
    } else {
      set((state) => ({ isPlaying: !state.isPlaying }));
    }
  },
  setCurrentTime: (time) => set({ currentTime: Math.max(0, time) }),
  
  setZoomPercentage: (percent) => set((state) => {
    const newZoom = Math.max(10, Math.min(500, percent));
    const newPPS = (newZoom / 100) * 20; // base is 20px per second
    if ((window as any).app) {
        (window as any).app.pixelsPerSecond = newPPS;
        (window as any).app.dirty = true;
        const zoomLabel = document.getElementById('zoom-level');
        if(zoomLabel) zoomLabel.innerText = `Zoom: ${Math.round(newZoom)}%`;
    }
    return { zoomLevel: newZoom, pixelsPerSecond: newPPS };
  }),
  
  setTool: (tool) => set({ activeTool: tool }),
  
  addLog: (msg) => {
    console.log(`[Editor Log] ${msg}`);
    set((state) => ({ 
      logs: [{ msg, time: new Date().toLocaleTimeString('ar-EG', { hour12: false, hour: 'numeric', minute: 'numeric', second: 'numeric' }) }, ...state.logs].slice(0, 200)
    }));
  },
}));

// Expose to window for vanilla JS engine access
if (typeof window !== 'undefined') {
  (window as any).useEditorStore = useEditorStore;
}
