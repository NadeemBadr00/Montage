// @ts-nocheck
// preview-setup.ts — EditorApp constants, video sync setup, image cache
// @ts-nocheck
/**
 * 🎬 Advanced Playback Engine (video_preview.js)
 * ✨ UPDATES: 
 * 1. FULL WebGL Pipeline Integration.
 * 2. Predictive Lookahead Triggers.
 * 3. Robust Player Management.
 * 🔥 PERFORMANCE UPDATE: Dirty Check & Efficient Loops.
 * 🔥 FIX: Bounding Box respects Aspect Fill & Non-Uniform Scaling (sx/sy).
 * 🔥 FIX: Removed dependency on "43.mp4". Now waits for user upload to set dimensions.
 */

import { drawAdvancedText } from '../renderers/canvas_renderer';

window.EditorApp.prototype.TRACK_HEADER_WIDTH_PREVIEW = 140;
window.EditorApp.prototype.FPS = 30;

window.EditorApp.prototype.setupVideoSync = function() {
    this.canvas = document.getElementById('preview-canvas');
    if (!this.canvas) return;
    this.ctx = this.canvas.getContext('2d', { alpha: false }); 
    
    this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    
    this.players = [
        document.getElementById('source-video-a'), document.getElementById('source-video-b'),
        document.getElementById('source-video-c'), document.getElementById('source-video-d'),
        document.getElementById('source-video-e'), document.getElementById('source-video-f')
    ];
    this.assignedPlayers = new Map(); 
    this.imgCache = new Map(); 
    this.hoveredClip = null; 
    this.isDragging = false; 
    this.playbackRate = 0; 
    this.isPlaying = false;
    this.isScrubbing = false; 

    this.players.forEach(p => { 
        if(!p) return;
        p.onerror = () => {
            // Ignore empty src errors
            if(p.getAttribute('src')) console.warn(`⚠️ Source Error on ${p.id}.`);
        };
        p.addEventListener('seeked', () => {
            if (!this.isPlaying) this.requestRedraw();
        });
        
        // 🔥 FIX: Auto-detect Dimensions from Primary Video (Upload)
        // This replaces the hardcoded "43.mp4" logic
        p.addEventListener('loadedmetadata', () => {
            if (p.id === 'source-video-a') {
                // ✅ FIX 1: Do NOT override this.duration with the video file's duration.
                // Project duration is managed solely by refreshProjectTopology()
                // which calculates it from the actual clip end times on the timeline.
                // Overriding here caused the timeline to expand to the full video file
                // length even when only a short clip was trimmed and placed.

                if (p.videoWidth && p.videoHeight) {
                    // ✅ FIX 2: Respect user's resolution setting.
                    // Only auto-detect canvas size when resolution is set to 'original'.
                    // Custom resolution (e.g. 720p, 1080p) must not be overridden.
                    const storeSettings = window.useEditorStore?.getState();
                    const useOriginal = !storeSettings || storeSettings.resolution === 'original';
                    if (useOriginal) {
                        this.canvas.width = p.videoWidth;
                        this.canvas.height = p.videoHeight;
                        this.log(`📏 Canvas auto-sized from source: ${this.canvas.width}x${this.canvas.height}`);
                    }
                }
                this.requestRedraw();
            }
        });

        try {
            const source = this.audioCtx.createMediaElementSource(p);
            source.connect(this.audioCtx.destination);
        } catch(e) { /* Already connected */ }
    });

    // 🔥 FIX: Set Safe Default Dimensions (Start Clean)
    // No more "this.players[0].src = '43.mp4'"
    this.canvas.width = 1920; // Default Landscape (Safe start)
    this.canvas.height = 1080;
    this.duration = 300;

    this.lastTick = performance.now();
    this.playbackLoop = this.playbackLoop.bind(this);
    requestAnimationFrame(this.playbackLoop);
    this.setupPlayheadScrubbing();
    this.setupCanvasInteraction(); 
    this.bindKeyboardShortcuts(); 
};

window.EditorApp.prototype.getImageFromCache = function(src) {
    if (this.imgCache.has(src)) return this.imgCache.get(src);
    const img = new Image(); img.src = src; img.crossOrigin = "Anonymous"; 
    img.onload = () => this.requestRedraw();
    this.imgCache.set(src, img); return img;
};
