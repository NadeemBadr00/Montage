// @ts-nocheck
import { Track } from '../../models/Track';
import { Clip } from '../../models/Clip';
import { useEditorStore } from '../../../store/useEditorStore';

import { injectEngineState } from './state';
import { injectEngineClips } from './clips';
import { injectEngineTracks } from './tracks';
import { injectEngineTools } from './tools';

export interface EditorApp {
    setupTracks?: () => void;
    renderAll?: () => void;
    setupEditingTools?: () => void;
    initCommandCenter?: () => void;
    setupVideoSync?: () => void;
    setupPlayheadScrubbing?: () => void;
    syncOverlays?: () => void;
    updateEffectControls?: () => void;
    renderTracks?: () => void;
}

export class EditorApp {
    tracks: Track[];
    currentTime: number;
    isPlaying: boolean;
    duration: number;
    pixelsPerSecond: number;
    activeTool: string;
    selectedClipIds: Set<string>;

    history: string[];
    redoStack: string[];
    maxHistory: number;
    snapThreshold: number;
    needsRedraw: boolean;

    videoPlayer: HTMLVideoElement | null;
    timelineContent: HTMLElement | null;
    playhead: HTMLElement | null;
    timeDisplay: HTMLElement | null;
    logContainer: HTMLElement | null;
    tracksContainer: HTMLElement | null;
    timelineScrollArea: HTMLElement | null;
    rulerContainer: HTMLElement | null;
    effectControls: HTMLElement | null;
    projectState: any;
    isDragging: boolean;
    
    constructor() {
        this.tracks = [];
        this.currentTime = 0;
        this.isPlaying = false;
        this.duration = 300; 
        this.pixelsPerSecond = 20; 
        this.activeTool = 'select'; 
        this.selectedClipIds = new Set(); 

        this.history = [];
        this.redoStack = [];
        this.maxHistory = 50;
        this.snapThreshold = 15; 
        this.needsRedraw = true; 

        this.videoPlayer = null;
        this.timelineContent = null;
        this.playhead = null;
        this.timeDisplay = null;
        this.logContainer = null;
        this.tracksContainer = null;
        this.timelineScrollArea = null;
        this.rulerContainer = null;
        this.effectControls = null;
        this.isDragging = false;
    }

    syncToStore() {
        const store = useEditorStore.getState();
        store.syncApp(this.tracks, this.currentTime, this.isPlaying);
        // Also push duration so Timeline content width stays accurate
        if (this.duration !== undefined) {
            useEditorStore.setState({ duration: this.duration });
        }
    }

    /**
     * Central helper — stretch a clip to a new duration and update everything:
     * engine topology → Zustand duration → timeline dirty → full store sync.
     * Call this from ANY path that adds a video inside a frame clip.
     */
    stretchClipDuration(clipId: string, newDuration: number) {
        if (!isFinite(newDuration) || newDuration <= 0) return;
        const clip = (this as any).findClipById ? (this as any).findClipById(clipId) : null;
        if (!clip) return;
        if (newDuration <= clip.duration) return; // already long enough

        // 1. Mutate clip duration on the live engine instance
        clip.duration = newDuration;

        // 2. Recalculate this.duration from all clips
        if ((this as any).refreshProjectTopology) (this as any).refreshProjectTopology();

        // 3. Push to Zustand immediately so React re-renders the timeline width NOW
        useEditorStore.setState({ duration: (this as any).duration });

        // 4. Mark vanilla timeline dirty so ruler and tracks repaint
        (this as any).dirty = true;
        if ((this as any).renderTracks) (this as any).renderTracks();

        // 5. Full store sync (tracks + currentTime + isPlaying + duration)
        this.syncToStore();

        // 6. Request canvas redraw
        this.requestRedraw();

        console.log(`[Engine] stretchClipDuration: clip ${clipId} → ${newDuration}s | project → ${(this as any).duration}s`);
    }

    requestRedraw() {
        this.needsRedraw = true;
    }


    init() {
        this.videoPlayer = document.getElementById('source-video-a') as HTMLVideoElement; 
        this.timelineContent = document.getElementById('timeline-content');
        this.playhead = document.getElementById('playhead');
        this.timeDisplay = document.getElementById('time-display');
        this.logContainer = document.getElementById('system-log');
        this.tracksContainer = document.getElementById('tracks-container');
        this.timelineScrollArea = document.getElementById('timeline-scroll-area');
        this.rulerContainer = document.getElementById('timeline-ruler');
        this.effectControls = document.getElementById('effect-controls-panel');

        if (!this.timelineContent) {
            console.error("❌ Critical Error: DOM Elements not found.");
            return;
        }

        if(this.setupTracks) this.setupTracks(); 
        if(this.renderAll) this.renderAll();     
        if(this.setupEditingTools) this.setupEditingTools();
        
        if (this.initCommandCenter) {
            this.initCommandCenter();
        }

        if (typeof this.setupVideoSync === 'function') {
            this.setupVideoSync();
            if(this.setupPlayheadScrubbing) this.setupPlayheadScrubbing();
        }
        
        this.log("✅ Engine Ready: Logic Core Loaded.");
        this.syncToStore();
    }

    log(msg: string) {
        useEditorStore.getState().addLog(msg);
        if (!this.logContainer) return;
        const div = document.createElement('div');
        div.innerText = `> ${msg}`;
        this.logContainer.appendChild(div);
        this.logContainer.scrollTop = this.logContainer.scrollHeight;
    }

    formatTime(seconds: number) {
        const date = new Date(0);
        date.setSeconds(seconds);
        return date.toISOString().substr(11, 8);
    }
}

// 6. Global Exports
(window as any).Clip = Clip;
(window as any).Track = Track;
(window as any).EditorApp = EditorApp;

// Inject features
injectEngineState();
injectEngineClips();
injectEngineTracks();
injectEngineTools();
