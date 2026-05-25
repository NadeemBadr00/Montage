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
  activeTool: 'select' | 'cut' | 'text' | 'delete';
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
  
  // Playback Actions
  togglePlay: () => void;
  setCurrentTime: (time: number) => void;
  setZoomPercentage: (percent: number) => void;
  setTool: (tool: 'select' | 'cut' | 'text' | 'delete') => void;
  
  // Drag State
  draggedAsset: Asset | null;
  setDraggedAsset: (asset: Asset | null) => void;

  // Log (for system log modal in Modals.tsx)
  logs: { msg: string; time: string }[];
  addLog: (msg: string) => void;

  // Visual Feedback
  highlightedClipId: string | null;
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
}

export const useEditorStore = create<EditorState>((set, get) => ({
  assetsList: [],
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
  
  logs: [{ msg: 'Ready...', time: new Date().toLocaleTimeString('ar-EG', { hour12: false, hour: 'numeric', minute: 'numeric', second: 'numeric' }) }],
  
  highlightedClipId: null,
  setHighlightedClip: (id) => set({ highlightedClipId: id }),

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
  addAsset: (asset) => set((state) => {
    if (state.assetsList.some(a => a.id === asset.id)) return state;
    return { assetsList: [...state.assetsList, asset] };
  }),
  addTrack: (track) => set((state) => {
    if (state.tracks.some(t => t.id === track.id)) return state;
    return { tracks: [...state.tracks, track] };
  }),
  
  addClipToTrack: (trackId, clip) => set((state) => ({
    tracks: state.tracks.map(t => 
      t.id === trackId ? { ...t, clips: [...t.clips, clip] } : t
    )
  })),

  updateClip: (clipId, updates) => set((state) => ({
    tracks: state.tracks.map(t => ({
      ...t,
      clips: t.clips.map(c => c.id === clipId ? { ...c, ...updates } : c)
    }))
  })),

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
  
  addLog: (msg) => set((state) => ({ 
    logs: [...state.logs, { msg, time: new Date().toLocaleTimeString('ar-EG', { hour12: false, hour: 'numeric', minute: 'numeric', second: 'numeric' }) }] 
  })),
}));

// Expose to window for vanilla JS engine access
if (typeof window !== 'undefined') {
  (window as any).useEditorStore = useEditorStore;
}
