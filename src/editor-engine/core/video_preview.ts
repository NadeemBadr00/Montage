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

// Playback Logic
window.EditorApp.prototype.togglePlay = function() { 
    if (this.audioCtx.state === 'suspended') this.audioCtx.resume();
    if (this.playbackRate !== 0) this.pausePlayback(); 
    else this.startPlayback(); 
};

window.EditorApp.prototype.startPlayback = function() {
    this.playbackRate = 1; 
    this.isPlaying = true;
    // FIX #5: notify Zustand immediately so React play button updates without polling
    if (window.useEditorStore) window.useEditorStore.setState({ isPlaying: true });
    
    // Stop Lookahead when playing to save resources
    if(this.stopPredictiveCaching) this.stopPredictiveCaching();

    this.lastTick = performance.now();
    this.playbackStartTime = this.audioCtx.currentTime - this.currentTime;
    this.updatePlayStateUI();
    this.players.forEach(p => { 
        if(p.getAttribute('data-key') && p.paused) p.play().catch(()=>{}); 
        p.playbackRate = 1; 
    });
    this.requestRedraw();
};

window.EditorApp.prototype.pausePlayback = function() {
    this.playbackRate = 0; 
    this.isPlaying = false;
    // FIX #5: notify Zustand immediately so React play button updates without polling
    if (window.useEditorStore) window.useEditorStore.setState({ isPlaying: false });
    this.players.forEach(p => p.pause()); 
    this.updatePlayStateUI();
    this.requestRedraw();

    // Trigger Predictive Lookahead on Idle (Background task)
    if(this.startPredictiveCaching) {
        setTimeout(() => {
            if(!this.isPlaying && !this.isScrubbing) this.startPredictiveCaching();
        }, 500);
    }
};

window.EditorApp.prototype.updatePlayStateUI = function() {
    const btn = document.getElementById('play-pause-btn'); if (!btn) return;
    btn.innerHTML = this.playbackRate === 0 ? '<i class="fa-solid fa-play ml-0.5 text-sm"></i>' : '<i class="fa-solid fa-pause text-sm"></i>';
};

window.EditorApp.prototype.handleJKL = function(key) {
    const overlay = document.getElementById('jkl-overlay'); let msg = "";
    if (key === 'k') { this.pausePlayback(); msg = "⏸️ Pause"; } 
    else if (key === 'l') {
        if (this.playbackRate < 0) this.playbackRate = 0; else if (this.playbackRate === 0) this.playbackRate = 1; else if (this.playbackRate < 8) this.playbackRate *= 2; 
        msg = `⏩ x${this.playbackRate}`;
    } else if (key === 'j') {
        if (this.playbackRate > 0) this.playbackRate = 0; else if (this.playbackRate === 0) this.playbackRate = -1; else if (this.playbackRate > -8) this.playbackRate *= 2; 
        msg = `⏪ x${Math.abs(this.playbackRate)}`;
    }
    this.isPlaying = (this.playbackRate !== 0); 
    if(this.isPlaying) {
        if(this.stopPredictiveCaching) this.stopPredictiveCaching();
        this.playbackStartTime = performance.now() / 1000 - this.currentTime;
    }
    this.updatePlayStateUI();
    this.players.forEach(p => { if (this.playbackRate > 0) p.playbackRate = this.playbackRate; });
    if(overlay) { overlay.innerText = msg; overlay.style.opacity = 1; clearTimeout(this.jklTimer); this.jklTimer = setTimeout(() => overlay.style.opacity = 0, 800); }
    this.requestRedraw();
};

window.EditorApp.prototype.bindKeyboardShortcuts = function() {
    document.addEventListener('keydown', (e) => {
        // Ignore if typing in input fields
        if(e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

        // FIX #2: Block ALL playback shortcuts when CMD center is focused
        if (window.app && window.app.isCmdFocused) return;

        // FIX #2 (secondary): Also block when there's text in the buffer
        if (window.app && window.app.commandBuffer && window.app.commandBuffer.length > 0) return;

        if (e.code === 'KeyJ') this.handleJKL('j');
        if (e.code === 'KeyK') this.handleJKL('k');
        if (e.code === 'KeyL') this.handleJKL('l');
        
        if (e.code === 'Space') { e.preventDefault(); this.togglePlay(); }

        // Undo / Redo
        if (e.ctrlKey || e.metaKey) {
            if (e.code === 'KeyZ') {
                e.preventDefault();
                if (e.shiftKey) this.redo();
                else this.undo();
            } else if (e.code === 'KeyY') {
                e.preventDefault();
                this.redo();
            }
        }
    });
};

window.EditorApp.prototype.playbackLoop = function(now) {
    if (this.isExporting) {
        requestAnimationFrame(this.playbackLoop);
        return;
    }

    if (!this.lastTick) this.lastTick = now;
    this.lastTick = now;

    if (this.isPlaying) {
        if (this.playbackRate === 1) {
            this.currentTime = this.audioCtx.currentTime - this.playbackStartTime;
        } else {
             const dt = (now - this.lastTimePerf || now) / 1000;
             this.currentTime += dt * this.playbackRate;
        }
        this.lastTimePerf = now;

        if (this.currentTime >= this.duration) { this.currentTime = this.duration; this.pausePlayback(); } 
        else if (this.currentTime <= 0) { this.currentTime = 0; this.pausePlayback(); }
        
        // Mark for redraw only when time changes
        this.needsRedraw = true;
    } else {
        this.lastTimePerf = now;
    }

    // OPTIMIZATION: Dirty Check Logic
    // If NOT playing and NOT marked for redraw, SKIP rendering entirely.
    // This saves GPU/CPU cycles when idle.
    if (this.needsRedraw) {
        this.managePlayers(); 
        this.renderFrameToCanvas(); 
        this.updatePlayheadPosition();
        this.needsRedraw = false;
    }

    requestAnimationFrame(this.playbackLoop);
};

// Canvas Interaction
window.EditorApp.prototype.setupCanvasInteraction = function() {
    this.isDragging = false; let mode = 'none'; let startX = 0, startY = 0;
    let initialProps = {}; let activeClip = null; 
    
    // Viewport Pan/Zoom state
    this.canvasZoom = 1;
    this.canvasPanX = 0;
    this.canvasPanY = 0;
    this.isPanning = false;
    let panStartX = 0, panStartY = 0;

    this.applyCanvasTransform = () => {
        this.canvas.style.transform = `translate(${this.canvasPanX}px, ${this.canvasPanY}px) scale(${this.canvasZoom})`;
        this.canvas.style.transition = this.isPanning ? 'none' : 'transform 0.1s ease-out';
    };

    // Wheel to Zoom
    this.canvas.parentElement.addEventListener('wheel', (e) => {
        if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            const zoomDelta = e.deltaY > 0 ? 0.9 : 1.1;
            this.canvasZoom *= zoomDelta;
            this.canvasZoom = Math.max(0.1, Math.min(this.canvasZoom, 5));
            this.applyCanvasTransform();
        }
    }, { passive: false });

    this.canvas.addEventListener('mousedown', (e) => {
        // Pan Mode (Alt + Drag OR Middle Mouse Button)
        if (e.altKey || e.button === 1) {
            e.preventDefault();
            this.isPanning = true;
            panStartX = e.clientX - this.canvasPanX;
            panStartY = e.clientY - this.canvasPanY;
            this.canvas.style.cursor = 'grabbing';
            return;
        }

        const { x, y } = this.getCanvasCoordinates(e);
        if (this.selectedClipIds.size === 1) {
            const clipId = Array.from(this.selectedClipIds)[0];
            const clip = this.findClipById(clipId);
            const handle = this.checkResizeHandles(x, y, clip);
            if (clip && handle) {
                // ✅ Save undo snapshot before any canvas mutation
                this.saveState();
                this.isDragging = true; mode = 'resize'; activeClip = clip;
                this.resizeHandle = handle;
                startX = x; startY = y;
                initialProps = { ...clip.properties, sandwich: clip.sandwich ? { ...clip.sandwich } : null };
                return; 
            }
        }
        const hitClips = this.hitTestAll(x, y);
        let hitClip = null;
        
        if (hitClips.length > 0) {
            const selectedHit = hitClips.find(h => this.selectedClipIds.has(h.clip.id));
            if (selectedHit) {
                hitClip = selectedHit.clip; // Priority to already selected layer
            } else {
                hitClip = hitClips[0].clip; // Fallback to top-most layer
            }
        }

        if (hitClip) {
            this.selectClip(hitClip.id);
            // ✅ Save undo snapshot before any canvas mutation
            this.saveState();
            this.isDragging = true; 
            mode = 'move'; startX = x; startY = y; activeClip = hitClip;
            initialProps = { ...hitClip.properties, sandwich: hitClip.sandwich ? { ...hitClip.sandwich } : null };
            this.requestRedraw();
        } else { this.deselectAll(); this.requestRedraw(); }
    });

    this.canvas.addEventListener('mousemove', (e) => {
        if (this.isPanning) {
            this.canvasPanX = e.clientX - panStartX;
            this.canvasPanY = e.clientY - panStartY;
            this.applyCanvasTransform();
            return;
        }
        
        const { x, y } = this.getCanvasCoordinates(e);
        if (this.isDragging && activeClip) {
            if (mode === 'move') {
                const deltaX = x - startX; const deltaY = y - startY;
                
                let newX = (initialProps.positionX || 0) + deltaX;
                let newY = (initialProps.positionY || 0) + deltaY;
                
                this.snappedX = false; this.snappedY = false;
                if (Math.abs(newX) < 15) { newX = 0; this.snappedX = true; }
                if (Math.abs(newY) < 15) { newY = 0; this.snappedY = true; }
                
                activeClip.properties.positionX = Math.round(newX);
                activeClip.properties.positionY = Math.round(newY);
            } else if (mode === 'resize') {
                const centerX = this.canvas.width / 2; const centerY = this.canvas.height / 2;
                const posX = initialProps.positionX || 0;
                const posY = initialProps.positionY || 0;
                const cx = centerX + posX; const cy = centerY + posY;
                
                if (this.resizeHandle === 'rotate') {
                    const dx = x - cx; const dy = y - cy;
                    const newRot = Math.atan2(dy, dx) * (180 / Math.PI) + 90;
                    activeClip.properties.rotation = Math.round(newRot * 10) / 10;
                } else {
                    const distInitial = Math.sqrt(Math.pow(startX - cx, 2) + Math.pow(startY - cy, 2));
                    const distCurrent = Math.sqrt(Math.pow(x - cx, 2) + Math.pow(y - cy, 2));
                    if (distInitial > 0) {
                        const scaleDelta = distCurrent / distInitial;
                        const newScale = (initialProps.scale || 100) * scaleDelta;
                        activeClip.properties.scale = Math.round(newScale * 10) / 10;
                    }
                }
            }
            this.requestRedraw(); this.updateEffectControls(); return;
        }
        
        let cursor = 'default';
        const handle = (this.selectedClipIds.size === 1) ? this.checkResizeHandles(x, y, this.findClipById(Array.from(this.selectedClipIds)[0])) : null;
        if (handle) {
            if (handle === 'rotate') cursor = 'grab';
            else if (['tl', 'br'].includes(handle)) cursor = 'nwse-resize';
            else if (['tr', 'bl'].includes(handle)) cursor = 'nesw-resize';
            else if (['t', 'b'].includes(handle)) cursor = 'ns-resize';
            else if (['l', 'r'].includes(handle)) cursor = 'ew-resize';
        } else {
            const hit = this.hitTest(x, y);
            if (hit) cursor = 'move';
            if (this.hoveredClip !== hit) { this.hoveredClip = hit; this.requestRedraw(); }
        }
        this.canvas.dataset.cursor = cursor;
        this.canvas.style.cursor = cursor; // Keep inline as fallback
    });

    this.canvas.addEventListener('mouseup', () => { 
        if (this.isPanning) {
            this.isPanning = false;
            this.canvas.dataset.cursor = 'default';
            this.canvas.style.cursor = 'default';
            return;
        }
        this.isDragging = false; 
        mode = 'none'; activeClip = null; 
        this.snappedX = false; this.snappedY = false;
        this.requestRedraw();
        // ✅ Persist canvas position changes to Zustand so the store stays in sync
        this.commitStateToReact();
    });

    this.canvas.addEventListener('mouseleave', () => {
        if (this.isPanning) {
            this.isPanning = false;
            this.canvas.dataset.cursor = 'default';
            this.canvas.style.cursor = 'default';
        }
    });

    this.canvas.addEventListener('dblclick', (e) => {
        const { x, y } = this.getCanvasCoordinates(e);
        const hitClip = this.hitTest(x, y);
        if (hitClip && hitClip.type === 'text') {
            this.openOnCanvasTextEditor(hitClip);
        } else if (hitClip && hitClip.src && hitClip.src.includes('frame_')) {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = 'image/*,video/*';
            input.onchange = (ev) => this.handleFrameUpload(ev, hitClip);
            input.click();
        } else {
            // Add a new text clip at the exact clicked position
            if (this.addTextAtCanvasPosition) {
                // Let's convert x, y to percentage or keeping them as absolute pixels?
                // `addTextAtCanvasPosition` expects position offsets from center.
                // Our `x` and `y` from `getCanvasCoordinates` are internal canvas pixels, where center is w/2, h/2.
                const centerX = this.canvas.width / 2;
                const centerY = this.canvas.height / 2;
                
                // Convert internal canvas pixels to user coordinates (offsets from center)
                const posX = x - centerX;
                const posY = y - centerY;
                
                this.addTextAtCanvasPosition(posX, posY);
            }
        }
    });

    this.canvas.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        const { x, y } = this.getCanvasCoordinates(e);
        const hitClips = this.hitTestAll(x, y);
        if (hitClips.length > 1) {
            this.showLayerSelectionMenu(e.clientX, e.clientY, hitClips);
        } else if (hitClips.length === 1) {
            this.selectClip(hitClips[0].clip.id);
            this.requestRedraw();
        }
    });

    this.canvas.addEventListener('dragover', (e) => {
        e.preventDefault();
        const { x, y } = this.getCanvasCoordinates(e);
        const hit = this.hitTest(x, y);
        if (hit && hit.src && hit.src.includes('frame_')) {
            e.dataTransfer.dropEffect = 'copy';
            this.hoveredClip = hit;
            this.requestRedraw();
        } else {
            e.dataTransfer.dropEffect = 'none';
            this.hoveredClip = null;
            this.requestRedraw();
        }
    });

    this.canvas.addEventListener('dragleave', (e) => {
        e.preventDefault();
        this.hoveredClip = null;
        this.requestRedraw();
    });

    this.canvas.addEventListener('drop', (e) => {
        e.preventDefault();
        const { x, y } = this.getCanvasCoordinates(e);
        const hit = this.hitTest(x, y);
        
        if (hit && hit.src && hit.src.includes('frame_') && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            this.handleFrameUpload({ target: { files: e.dataTransfer.files } }, hit);
        }
        this.hoveredClip = null;
        this.requestRedraw();
    });
};

window.EditorApp.prototype.handleFrameUpload = function(e, frameClip) {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    const type = file.type.startsWith('image') ? 'image' : (file.type.startsWith('video') ? 'video' : null);
    if (!type) return;

    const url = URL.createObjectURL(file);
    const newId = `loc_${Date.now()}_${Math.random()}`;
    
    // Add to library
    const asset = { id: newId, name: file.name, type: type, src: url };
    if (window.useEditorStore) {
        window.useEditorStore.getState().addAsset(asset);
    }
    this.assetsList.push(asset);
    if (this.renderAssetsLibrary) this.renderAssetsLibrary();
    
    frameClip.properties.innerMediaType = type;
    frameClip.properties.innerMediaSrc = url;
    
    if (this.fitMediaToFrame) {
        this.fitMediaToFrame(frameClip.id, 'fill');
    }

    if (type === 'video') {
        const tempVid = document.createElement('video');
        tempVid.src = url;
        tempVid.onloadedmetadata = () => {
            const d = tempVid.duration;
            if (isFinite(d) && d > 0) {
                // ✅ Use the centralized engine helper — handles topology, Zustand, dirty flag, and sync
                if (this.stretchClipDuration) {
                    this.stretchClipDuration(frameClip.id, d);
                }
                this.requestRedraw();
                if (this.updateEffectControls) this.updateEffectControls();
            }
        };
    } else {
        this.commitStateToReact();
        this.requestRedraw();
        if (this.updateEffectControls) this.updateEffectControls();
    }
};

window.EditorApp.prototype.getClipTransform = function(clip, timeInClip) {
    const gv = (prop, def) => clip.getPropertyValue ? clip.getPropertyValue(prop, timeInClip) : (clip.properties[prop] !== undefined ? clip.properties[prop] : def);
    
    let posX = gv('positionX', 0);
    let posY = gv('positionY', 0);
    let scale = gv('scale', 100) / 100;
    const rot = gv('rotation', 0);
    
    return { posX, posY, scale, rot };
};

window.EditorApp.prototype.openOnCanvasTextEditor = function(clip) {
    if (this.textEditorOverlay) { this.textEditorOverlay.remove(); }
    
    const w = this.canvas.width; const h = this.canvas.height;
    const { drawW, drawH } = this.getClipDrawRect(clip, w, h);
    
    const timeInClip = this.currentTime - clip.start;
    const { posX, posY, scale, rot } = this.getClipTransform(clip, timeInClip);
    
    const rect = this.canvas.getBoundingClientRect();
    const ratioX = rect.width / w;
    const ratioY = rect.height / h;
    
    const cx = (w / 2 + posX) * ratioX + rect.left;
    const cy = (h / 2 + posY) * ratioY + rect.top;
    
    const textarea = document.createElement('textarea');
    textarea.value = clip.src || "Your Text Here";
    
    textarea.style.position = 'absolute';
    textarea.style.left = `${cx}px`;
    textarea.style.top = `${cy}px`;
    textarea.style.width = `${drawW * ratioX}px`;
    textarea.style.height = `${drawH * ratioY}px`;
    textarea.style.transform = `translate(-50%, -50%) rotate(${rot}deg) scale(${scale})`;
    textarea.style.transformOrigin = 'center center';
    textarea.style.margin = '0';
    textarea.style.padding = '10px';
    textarea.style.border = '2px dashed #00ffcc';
    textarea.style.background = 'rgba(0,0,0,0.5)';
    textarea.style.color = clip.properties.color || '#ffffff';
    textarea.style.fontFamily = clip.properties.fontFamily || 'Inter, sans-serif';
    textarea.style.fontSize = `${(clip.properties.fontSize || 48) * ratioY}px`;
    textarea.style.textAlign = 'center';
    textarea.style.resize = 'none';
    textarea.style.zIndex = '9999';
    textarea.style.overflow = 'hidden';
    textarea.style.outline = 'none';
    textarea.style.borderRadius = '8px';
    textarea.style.backdropFilter = 'blur(4px)';
    
    document.body.appendChild(textarea);
    textarea.focus();
    
    this.textEditorOverlay = textarea;
    
    const saveAndClose = () => {
        if (textarea.value !== clip.src) {
            this.saveState();
            clip.src = textarea.value;
            this.commitStateToReact();
            this.requestRedraw();
            this.updateEffectControls();
        }
        textarea.remove();
        this.textEditorOverlay = null;
    };
    
    textarea.addEventListener('blur', saveAndClose);
    textarea.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            textarea.value = clip.text; 
            textarea.blur();
        }
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            textarea.blur();
        }
    });
};

window.EditorApp.prototype.hitTest = function(x, y) {
    const w = this.canvas.width; const h = this.canvas.height;
    const centerX = w / 2; const centerY = h / 2;
    // ✅ Compute anySolo live (same as renderFrameToCanvas) — this.anySolo is never updated
    const anySolo = this.tracks.some(t => t.isSolo);
    const visibleTracks = this.tracks.filter(t => (t.type === 'video' || t.type === 'main' || t.type === 'overlay' || t.type === 'subtitle') && !t.isMuted && (!anySolo || t.isSolo));

    // FIX: Check from top-most layer (V3) to bottom-most (V1)
    // Tracks are stored [V3, V2, V1], so checking them directly checks top-first!
    for (const track of visibleTracks) {
        const clips = track.getClipsAtTime(this.currentTime);
        if (clips.length > 0) {
            const clip = clips[0];
            const timeInClip = this.currentTime - clip.start;
            const { posX, posY, scale, rot } = this.getClipTransform(clip, timeInClip);
            
            // Inverse transform mouse coordinates to clip's local space
            const dx = x - (centerX + posX);
            const dy = y - (centerY + posY);
            
            const rad = (-rot * Math.PI) / 180;
            let lx = dx * Math.cos(rad) - dy * Math.sin(rad);
            let ly = dx * Math.sin(rad) + dy * Math.cos(rad);
            
            const gv = (prop, def) => clip.getPropertyValue ? clip.getPropertyValue(prop, timeInClip) : (clip.properties[prop] !== undefined ? clip.properties[prop] : def);
            const scaleX = gv('scaleX', 100) / 100;
            const scaleY = gv('scaleY', 100) / 100;
            let effScaleX = scale * scaleX;
            let effScaleY = scale * scaleY;
            if (clip.properties.forcedWidth && clip.properties.forcedHeight) {
                effScaleX = 1; effScaleY = 1;
            }
            lx /= effScaleX; ly /= effScaleY;
            
            const { drawW, drawH } = this.getClipDrawRect(clip, w, h);
            
            // Check if within bounds
            if (lx >= -drawW / 2 && lx <= drawW / 2 && ly >= -drawH / 2 && ly <= drawH / 2) return clip;
        }
    }
    return null;
};

window.EditorApp.prototype.hitTestAll = function(x, y) {
    const w = this.canvas.width; const h = this.canvas.height;
    const centerX = w / 2; const centerY = h / 2;
    const anySolo = this.tracks.some(t => t.isSolo);
    const visibleTracks = this.tracks.filter(t => (t.type === 'video' || t.type === 'main' || t.type === 'overlay' || t.type === 'subtitle') && !t.isMuted && (!anySolo || t.isSolo));

    const hits = [];
    for (const track of visibleTracks) {
        const clips = track.getClipsAtTime(this.currentTime);
        if (clips.length > 0) {
            const clip = clips[0];
            const timeInClip = this.currentTime - clip.start;
            const { posX, posY, scale, rot } = this.getClipTransform(clip, timeInClip);
            
            const dx = x - (centerX + posX);
            const dy = y - (centerY + posY);
            
            const rad = (-rot * Math.PI) / 180;
            let lx = dx * Math.cos(rad) - dy * Math.sin(rad);
            let ly = dx * Math.sin(rad) + dy * Math.cos(rad);
            
            const gv = (prop, def) => clip.getPropertyValue ? clip.getPropertyValue(prop, timeInClip) : (clip.properties[prop] !== undefined ? clip.properties[prop] : def);
            const scaleX = gv('scaleX', 100) / 100;
            const scaleY = gv('scaleY', 100) / 100;
            let effScaleX = scale * scaleX;
            let effScaleY = scale * scaleY;
            if (clip.properties.forcedWidth && clip.properties.forcedHeight) {
                effScaleX = 1; effScaleY = 1;
            }
            lx /= effScaleX; ly /= effScaleY;
            
            const { drawW, drawH } = this.getClipDrawRect(clip, w, h);
            
            if (lx >= -drawW / 2 && lx <= drawW / 2 && ly >= -drawH / 2 && ly <= drawH / 2) {
                hits.push({ clip, track });
            }
        }
    }
    return hits;
};

window.EditorApp.prototype.showLayerSelectionMenu = function(x, y, hits) {
    if (this.layerMenuOverlay) this.layerMenuOverlay.remove();
    
    const menu = document.createElement('div');
    menu.style.position = 'fixed';
    menu.style.left = `${x}px`;
    menu.style.top = `${y}px`;
    menu.style.background = '#1e1e1e';
    menu.style.border = '1px solid #333';
    menu.style.borderRadius = '8px';
    menu.style.padding = '8px 0';
    menu.style.zIndex = '10000';
    menu.style.boxShadow = '0 10px 25px rgba(0,0,0,0.5)';
    menu.style.color = '#fff';
    menu.style.fontFamily = 'Inter, sans-serif';
    menu.style.minWidth = '150px';
    
    hits.forEach((hit, index) => {
        const item = document.createElement('div');
        item.style.padding = '8px 16px';
        item.style.cursor = 'pointer';
        item.style.fontSize = '14px';
        item.style.display = 'flex';
        item.style.alignItems = 'center';
        item.style.justifyContent = 'space-between';
        
        item.onmouseenter = () => {
            item.style.background = '#3b82f6';
            this.hoveredClip = hit.clip;
            this.requestRedraw();
        };
        item.onmouseleave = () => item.style.background = 'transparent';
        
        item.onclick = () => {
            this.selectClip(hit.clip.id);
            this.requestRedraw();
            menu.remove();
            this.layerMenuOverlay = null;
        };
        
        let typeIcon = 'fa-video';
        if (hit.clip.type === 'image') typeIcon = 'fa-image';
        if (hit.clip.type === 'text') typeIcon = 'fa-font';
        if (hit.clip.type === 'audio') typeIcon = 'fa-music';
        
        item.innerHTML = `
            <span><i class="fa-solid ${typeIcon}" style="margin-right: 8px; width: 16px; text-align: center;"></i> ${hit.track.name || hit.clip.type}</span>
            ${index === 0 ? '<span style="font-size: 10px; color: #aaa; margin-left: 12px;">(Top)</span>' : ''}
        `;
        menu.appendChild(item);
    });
    
    document.body.appendChild(menu);
    this.layerMenuOverlay = menu;
    
    const closeMenu = (e) => {
        if (!menu.contains(e.target)) {
            menu.remove();
            this.layerMenuOverlay = null;
            document.removeEventListener('mousedown', closeMenu);
        }
    };
    setTimeout(() => document.addEventListener('mousedown', closeMenu), 10);
};

window.EditorApp.prototype.getCanvasCoordinates = function(e) {
    const rect = this.canvas.getBoundingClientRect();
    
    const canvasAR = this.canvas.width / this.canvas.height;
    const rectAR = rect.width / rect.height;
    
    let drawW = rect.width;
    let drawH = rect.height;
    let offsetX = 0;
    let offsetY = 0;
    
    if (canvasAR > rectAR) {
        drawH = rect.width / canvasAR;
        offsetY = (rect.height - drawH) / 2;
    } else {
        drawW = rect.height * canvasAR;
        offsetX = (rect.width - drawW) / 2;
    }
    
    return { 
        x: (e.clientX - rect.left - offsetX) * (this.canvas.width / drawW), 
        y: (e.clientY - rect.top - offsetY) * (this.canvas.height / drawH) 
    };
};

window.EditorApp.prototype.findClipById = function(id) {
    let result = null; this.tracks.some(t => { result = t.clips.find(c => c.id === id); return result; }); return result;
};

window.EditorApp.prototype.getClipDrawRect = function(clip, w, h) {
    let drawW = w, drawH = h;
    if (clip.type === 'text' && clip._computedWidth && clip._computedHeight) {
        drawW = clip._computedWidth;
        drawH = clip._computedHeight;
    } else if (clip.type === 'video' || clip.type === 'image') {
        if (clip.properties.forcedWidth && clip.properties.forcedHeight) {
            drawW = clip.properties.forcedWidth; drawH = clip.properties.forcedHeight;
        } else {
            const source = this.getSourceElement(clip);
            if (source) {
                let srcW = source.videoWidth || source.naturalWidth || w;
                let srcH = source.videoHeight || source.naturalHeight || h;
                const coverRatio = Math.max(w / srcW, h / srcH);
                drawW = srcW * coverRatio; drawH = srcH * coverRatio;
            }
        }
    } else if (clip.type === 'text') { 
        if (this.ctx) {
            const style = clip.textStyle || {};
            const text = clip.src || "Double Click to Edit";
            const fontSize = h * 0.05; 
            this.ctx.save();
            this.ctx.font = `${style.fontWeight || 'bold'} ${fontSize}px "${style.fontFamily || 'Cairo'}", sans-serif`;
            
            const maxWidth = w * 0.8;
            const rawLines = text.split('\n');
            const lines = [];
            
            for (const rawLine of rawLines) {
                const words = rawLine.split(' ');
                let line = '';
                for (let n = 0; n < words.length; n++) {
                    const testLine = line + words[n] + ' ';
                    const metrics = this.ctx.measureText(testLine);
                    if (metrics.width > maxWidth && n > 0) { 
                        lines.push(line.trim()); 
                        line = words[n] + ' '; 
                    } else { 
                        line = testLine; 
                    }
                }
                lines.push(line.trim());
            }

            const lineHeight = fontSize * 1.4;
            const totalHeight = lines.length * lineHeight;
            let maxLineWidth = 0;
            lines.forEach(l => { 
                const m = this.ctx.measureText(l); 
                if(m.width > maxLineWidth) maxLineWidth = m.width; 
            });
            
            const padding = style.padding !== undefined ? style.padding : 20;
            drawW = maxLineWidth + (padding * 2);
            drawH = totalHeight + (padding * 2);
            
            this.ctx.restore();
        } else {
            drawW = w * 0.8; drawH = h * 0.2; 
        }
    }
    return { drawW, drawH };
};

window.EditorApp.prototype.checkResizeHandles = function(x, y, clip) { 
    if (!clip) return null;
    const w = this.canvas.width; const h = this.canvas.height;
    const centerX = w / 2; const centerY = h / 2;
    
    const timeInClip = this.currentTime - clip.start;
    const { posX, posY, scale, rot } = this.getClipTransform(clip, timeInClip);
    
    const gv = (prop, def) => clip.getPropertyValue ? clip.getPropertyValue(prop, timeInClip) : (clip.properties[prop] !== undefined ? clip.properties[prop] : def);
    const scaleX = gv('scaleX', 100) / 100;
    const scaleY = gv('scaleY', 100) / 100;
    
    const dx = x - (centerX + posX);
    const dy = y - (centerY + posY);
    
    const rad = (-rot * Math.PI) / 180;
    let lx = dx * Math.cos(rad) - dy * Math.sin(rad);
    let ly = dx * Math.sin(rad) + dy * Math.cos(rad);
    
    let effectiveScaleX = scale * scaleX;
    let effectiveScaleY = scale * scaleY;
    if (clip.properties.forcedWidth && clip.properties.forcedHeight) {
        effectiveScaleX = 1; effectiveScaleY = 1;
    }
    
    lx /= effectiveScaleX; 
    ly /= effectiveScaleY;
    
    const { drawW, drawH } = this.getClipDrawRect(clip, w, h);
    
    const hsX = 25 / Math.abs(effectiveScaleX); 
    const hsY = 25 / Math.abs(effectiveScaleY); 
    
    const isHit = (hx, hy) => Math.abs(lx - hx) < hsX && Math.abs(ly - hy) < hsY;
    
    // 1. Traditional Handles
    if (isHit(0, -drawH/2 - (40 / Math.abs(effectiveScaleY)))) return 'rotate';
    if (isHit(drawW/2, drawH/2)) return 'br';
    if (isHit(-drawW/2, drawH/2)) return 'bl';
    if (isHit(drawW/2, -drawH/2)) return 'tr';
    if (isHit(-drawW/2, -drawH/2)) return 'tl';
    if (isHit(0, drawH/2)) return 'b';
    if (isHit(0, -drawH/2)) return 't';
    if (isHit(drawW/2, 0)) return 'r';
    if (isHit(-drawW/2, 0)) return 'l';
    
    // 2. Photoshop-style Rotation (Slightly outside corners)
    const rotHsX = 45 / Math.abs(effectiveScaleX);
    const rotHsY = 45 / Math.abs(effectiveScaleY);
    const isRotHit = (hx, hy) => Math.abs(lx - hx) < rotHsX && Math.abs(ly - hy) < rotHsY;
    
    if (isRotHit(drawW/2, drawH/2) || 
        isRotHit(-drawW/2, drawH/2) || 
        isRotHit(drawW/2, -drawH/2) || 
        isRotHit(-drawW/2, -drawH/2)) {
        return 'rotate';
    }
    
    return null; 
};

// 🔥 FULL PIPELINE RENDERER (Updated)
window.EditorApp.prototype.renderFrameToCanvas = function() {
    const ctx = this.ctx; 
    const w = this.canvas.width; 
    const h = this.canvas.height;
    
    // Clear Main 2D Canvas
    ctx.fillStyle = "#000000"; 
    ctx.fillRect(0, 0, w, h);

    const anySolo = this.tracks.some(t => t.isSolo);
    const videoTracks = this.tracks.filter(t => (t.type === 'video' || t.type === 'main' || t.type === 'overlay') && !t.isMuted && (!anySolo || t.isSolo));
    
    // 1. Collect Visible Video Clips for WebGL
    const renderJobs = [];
    // Tracks are usually Top to Bottom in UI (Array), so for painting back-to-front we reverse
    [...videoTracks].reverse().forEach(track => {
        let activeTransition = null;
        if (track.transitions) {
            activeTransition = track.transitions.find(tr => {
                const totalDur = (tr.inOffset || 0) + (tr.outOffset || 0);
                let tStart, tEnd;
                if (tr.alignment === 'start') {
                    // Transition starts at cutTime and extends forward
                    tStart = tr.cutTime;
                    tEnd   = tr.cutTime + totalDur;
                } else if (tr.alignment === 'end') {
                    // Transition ends at cutTime, extending backward
                    tStart = tr.cutTime - totalDur;
                    tEnd   = tr.cutTime;
                } else {
                    // center (default): cutTime is the middle
                    tStart = tr.cutTime - (tr.inOffset || 0);
                    tEnd   = tr.cutTime + (tr.outOffset || 0);
                }
                return this.currentTime >= tStart && this.currentTime <= tEnd;
            });
        }

        if (activeTransition) {
            // Recalculate tStart/duration using same alignment logic
            const totalDur = (activeTransition.inOffset || 0) + (activeTransition.outOffset || 0);
            let tStart;
            if (activeTransition.alignment === 'start') {
                tStart = activeTransition.cutTime;
            } else if (activeTransition.alignment === 'end') {
                tStart = activeTransition.cutTime - totalDur;
            } else {
                tStart = activeTransition.cutTime - (activeTransition.inOffset || 0);
            }
            const progress = Math.max(0, Math.min(1, totalDur > 0 ? (this.currentTime - tStart) / totalDur : 0));

            // Find clipA (ends at cutTime) and clipB (starts at cutTime)
            const clipA = track.clips.find((c: any) => Math.abs((c.start + c.duration) - activeTransition.cutTime) < 0.15) || null;
            const clipB = track.clips.find((c: any) => Math.abs(c.start - activeTransition.cutTime) < 0.15) || null;

            if (!clipA && !clipB) return;

            if (clipA && clipB && clipA !== clipB) {
                // ✅ True cut between two clips → Cross Dissolve / Wipe / Zoom
                renderJobs.push({
                    type: 'transition',
                    clipA: clipA,
                    clipB: clipB,
                    transition: activeTransition,
                    progress: progress
                });
            } else {
                // ✅ Single clip fade (Fade In or Fade Out) — render as single clip with baked opacity
                const singleClip = clipA || clipB;
                let opacity = 1;
                if (activeTransition.alignment === 'end') {
                    // Fade Out: opacity goes from 1 → 0
                    opacity = 1 - progress;
                } else if (activeTransition.alignment === 'start') {
                    // Fade In: opacity goes from 0 → 1
                    opacity = progress;
                }
                renderJobs.push({
                    type: 'single',
                    clip: singleClip,
                    overrideOpacity: opacity
                });
            }
        } else {
            const clips = track.getClipsAtTime(this.currentTime);
            if (clips.length > 0) renderJobs.push({ type: 'single', clip: clips[0] });
        }

    });


    // 2. Render All Video Layers in WebGL (Compositing)
    if (this.renderWebGLComposition && renderJobs.length > 0) {
        const glCanvas = this.renderWebGLComposition(renderJobs, w, h);
        if (glCanvas) {
            // ── Phase 2: Per-clip Color Grading ────────────────────────────
            // Check if ANY clip in this frame has colorGrading applied.
            // If so, we need to composite per-clip with CSS filters.
            const hasColorGrading = renderJobs.some(job => {
                const clip = job.clip || job.clipA;
                return clip && clip.properties && clip.properties.colorGrading &&
                    (clip.properties.colorGrading.brightness !== 100 ||
                     clip.properties.colorGrading.contrast    !== 100 ||
                     clip.properties.colorGrading.saturation  !== 100 ||
                     clip.properties.colorGrading.hue         !== 0   ||
                     clip.properties.colorGrading.tintColor);
            });

            if (hasColorGrading) {
                // Render each clip individually with its own filter
                for (const job of renderJobs) {
                    const clip = job.clip || job.clipA;
                    if (!clip) continue;
                    const cg = clip.properties?.colorGrading;

                    // Build isolated clip canvas via WebGL (single job)
                    const singleGl = this.renderWebGLComposition([{ ...job }], w, h);
                    if (!singleGl) continue;

                    if (cg && (cg.brightness !== 100 || cg.contrast !== 100 || cg.saturation !== 100 || cg.hue !== 0)) {
                        const filterStr = [
                            `brightness(${cg.brightness / 100})`,
                            `contrast(${cg.contrast / 100})`,
                            `saturate(${cg.saturation / 100})`,
                            `hue-rotate(${cg.hue}deg)`
                        ].join(' ');
                        ctx.save();
                        ctx.filter = filterStr;
                        ctx.drawImage(singleGl, 0, 0);
                        ctx.filter = 'none';
                        ctx.restore();
                    } else {
                        ctx.drawImage(singleGl, 0, 0);
                    }

                    // Tint overlay
                    if (cg && cg.tintColor && cg.tintOpacity > 0) {
                        const timeInClip = this.currentTime - clip.start;
                        const { posX, posY, scale } = this.getClipTransform(clip, timeInClip);
                        const { drawW, drawH } = this.getClipDrawRect(clip, w, h);
                        const finalScale = (scale || 1);
                        const drawFW = drawW * finalScale;
                        const drawFH = drawH * finalScale;
                        const drawX = (w / 2 + posX) - drawFW / 2;
                        const drawY = (h / 2 + posY) - drawFH / 2;
                        ctx.save();
                        ctx.globalAlpha = cg.tintOpacity;
                        ctx.fillStyle = cg.tintColor;
                        ctx.fillRect(drawX, drawY, drawFW, drawFH);
                        ctx.globalAlpha = 1;
                        ctx.restore();
                    }
                }
            } else {
                // Fast path: no color grading, draw entire WebGL output at once
                ctx.drawImage(glCanvas, 0, 0);
            }
        }
        
        // 2.5 Render Social Media Overlays for Frames
        if (typeof (this as any).renderSocialOverlays === 'function') {
            (this as any).renderSocialOverlays(ctx, renderJobs, w, h);
        }
    } else {
        // Fallback or Empty
    }

    // 3. Render Text Clips (On CPU/2D Canvas)
    // ✅ FIX: Filter by CLIP type (text), not TRACK type (subtitle).
    // addTextClip() places text clips on 'overlay' tracks, not 'subtitle' tracks.
    // Checking only subtitle tracks caused text clips to be invisible on canvas.
    const allTracksForText = this.tracks.filter(t => !t.isMuted && (!anySolo || t.isSolo));
    [...allTracksForText].reverse().forEach(track => {
        const clips = track.getClipsAtTime(this.currentTime);
        if (clips.length > 0 && clips[0].type === 'text') {
            const clip = clips[0];
            ctx.save();

            // Apply clip-level in/out transitions — mirrors the WebGL path in ultra_features.ts
            if (clip.transitions) {
                const transDur = clip.transitions.duration || 1.0;
                const timeInClip    = this.currentTime - clip.start;
                const timeRemaining = clip.end - this.currentTime;
                let animProgress = 1, animType = 'none', animMode = '';

                if (timeInClip < transDur && clip.transitions.in && clip.transitions.in !== 'none') {
                    animProgress = Math.max(0, timeInClip / transDur);
                    animType = clip.transitions.in;
                    animMode = 'in';
                } else if (timeRemaining < transDur && clip.transitions.out && clip.transitions.out !== 'none') {
                    animProgress = Math.max(0, timeRemaining / transDur);
                    animType = clip.transitions.out;
                    animMode = 'out';
                }

                const dir = animMode === 'in' ? 1 : -1;
                if      (animType === 'fade')       ctx.globalAlpha *= animProgress;
                else if (animType === 'slideLeft')  ctx.translate((1 - animProgress) * w *  dir, 0);
                else if (animType === 'slideRight') ctx.translate((1 - animProgress) * -w * dir, 0);
                else if (animType === 'slideUp')    ctx.translate(0, (1 - animProgress) * h * dir);
                else if (animType === 'slideDown')  ctx.translate(0, (1 - animProgress) * -h * dir);
                else if (animType === 'zoom' || animType === 'zoomIn') {
                    const scaleFactor = animMode === 'in' ? animProgress : (1 - animProgress);
                    ctx.translate(w / 2, h / 2);
                    ctx.scale(Math.max(0.01, scaleFactor), Math.max(0.01, scaleFactor));
                    ctx.translate(-w / 2, -h / 2);
                }
                else if (animType === 'zoomOut') {
                    const scaleFactor = animMode === 'in' ? (2 - animProgress) : (1 + animProgress);
                    ctx.globalAlpha *= animProgress; // Also fade so it disappears smoothly
                    ctx.translate(w / 2, h / 2);
                    ctx.scale(Math.max(0.01, scaleFactor), Math.max(0.01, scaleFactor));
                    ctx.translate(-w / 2, -h / 2);
                }
                else if (animType === 'pop') {
                    // Pop creates a bouncy effect (overshoots then settles)
                    let scaleFactor = 1;
                    if (animMode === 'in') {
                        // ease out back formula
                        const t = animProgress - 1;
                        scaleFactor = 1 + t * t * (2.70158 * t + 1.70158);
                    } else {
                        scaleFactor = animProgress;
                    }
                    ctx.globalAlpha *= animProgress;
                    ctx.translate(w / 2, h / 2);
                    ctx.scale(Math.max(0.01, scaleFactor), Math.max(0.01, scaleFactor));
                    ctx.translate(-w / 2, -h / 2);
                }
                else if (animType === 'typewriter') {
                    // Wipe from left to right (clip bounding box)
                    const clipDir = animMode === 'in' ? animProgress : (1 - animProgress);
                    ctx.beginPath();
                    ctx.rect(0, 0, w * clipDir, h);
                    ctx.clip();
                }
                else if (animType === 'wipe') {
                    const clipDir = animMode === 'in' ? animProgress : (1 - animProgress);
                    ctx.beginPath();
                    const maxRadius = Math.sqrt(w * w + h * h) / 2;
                    ctx.arc(w / 2, h / 2, maxRadius * Math.max(0.001, clipDir), 0, Math.PI * 2);
                    ctx.clip();
                }
            }

            drawAdvancedText(ctx, clip, w, h);
            ctx.restore();
        }
    });

    // 3.3 Render Shape Clips + Apply Ken Burns on video/image clips
    // ─────────────────────────────────────────────────────────────
    const allTracksForShapes = this.tracks.filter(t => !t.isMuted && (!anySolo || t.isSolo));
    [...allTracksForShapes].reverse().forEach(track => {
        const clips = track.getClipsAtTime(this.currentTime);
        if (clips.length === 0) return;
        const clip = clips[0];

        // ── Ken Burns: animate positionX/Y + scale live during render ──
        if ((clip.type === 'video' || clip.type === 'image') && clip.properties?.kenBurns) {
            const kb = clip.properties.kenBurns;
            const timeInClip = Math.max(0, this.currentTime - clip.start);
            const t = clip.duration > 0 ? Math.min(1, timeInClip / clip.duration) : 0;
            // Ease-in-out (smoothstep)
            const ease = t * t * (3 - 2 * t);
            clip.properties.positionX = kb.startX + (kb.endX - kb.startX) * ease;
            clip.properties.positionY = kb.startY + (kb.endY - kb.startY) * ease;
            // Scale is stored as % (100=normal), kenBurns scale is a multiplier
            const startScalePct = (kb.startScale || 1) * 100;
            const endScalePct   = (kb.endScale   || 1) * 100;
            clip.properties.scale = startScalePct + (endScalePct - startScalePct) * ease;
        }

        // ── Shape clips: render directly on 2D canvas ──
        if (clip.type !== 'shape') return;
        const props = clip.properties || {};
        const shapeW = ((props.widthPct  || 50) / 100) * w;
        const shapeH = ((props.heightPct || 30) / 100) * h;
        const cx = (w / 2) + (props.positionX || 0);
        const cy = (h / 2) + (props.positionY || 0);
        const rot = (props.rotation || 0) * Math.PI / 180;
        const alpha = (props.opacity !== undefined ? props.opacity : 100) / 100;

        // Parse color: supports #RRGGBB or #RRGGBBAA
        let colorStr = props.shapeColor || '#ffffff';
        let fillAlpha = 1;
        if (colorStr.length === 9) { // #RRGGBBAA
            fillAlpha = parseInt(colorStr.slice(7, 9), 16) / 255;
            colorStr = colorStr.slice(0, 7);
        }

        ctx.save();
        ctx.globalAlpha = alpha * fillAlpha;
        ctx.fillStyle = colorStr;
        ctx.strokeStyle = colorStr;
        ctx.translate(cx, cy);
        if (rot !== 0) ctx.rotate(rot);

        const shapeType = props.shapeType || 'rect';
        if (shapeType === 'rect') {
            ctx.fillRect(-shapeW / 2, -shapeH / 2, shapeW, shapeH);
        } else if (shapeType === 'circle') {
            ctx.beginPath();
            ctx.ellipse(0, 0, shapeW / 2, shapeH / 2, 0, 0, Math.PI * 2);
            ctx.fill();
        } else if (shapeType === 'triangle') {
            ctx.beginPath();
            ctx.moveTo(0, -shapeH / 2);
            ctx.lineTo(shapeW / 2, shapeH / 2);
            ctx.lineTo(-shapeW / 2, shapeH / 2);
            ctx.closePath();
            ctx.fill();
        } else if (shapeType === 'line') {
            ctx.lineWidth = Math.max(2, shapeH);
            ctx.beginPath();
            ctx.moveTo(-shapeW / 2, 0);
            ctx.lineTo(shapeW / 2, 0);
            ctx.stroke();
        }
        ctx.restore();
    });

    // 3.5 Render Hovered Template (Preview from Assets Panel)

    if (this.hoveredTemplate) {
        ctx.save();
        const fakeClip = {
            src: this.hoveredTemplate.src,
            properties: this.hoveredTemplate.templateData?.properties || {},
            textStyle: this.hoveredTemplate.templateData?.textStyle || {}
        };
        
        // Loop the 'in' animation using Date.now()
        const animType = this.hoveredTemplate.templateData?.transitions?.in || 'none';
        if (animType !== 'none') {
            const transDurMs = (this.hoveredTemplate.templateData?.transitions?.duration || 1) * 1000;
            // Add a small pause at the end of the loop
            const totalLoopTime = transDurMs + 1000; 
            const elapsed = Date.now() - (this.hoverStartTime || Date.now());
            const loopElapsed = elapsed % totalLoopTime;
            
            let animProgress = 1;
            if (loopElapsed < transDurMs) {
                animProgress = Math.max(0, loopElapsed / transDurMs);
            }
            
            const animMode = 'in';
            const dir = 1;

            // Re-apply animation transforms
            if      (animType === 'fade')       ctx.globalAlpha *= animProgress;
            else if (animType === 'slideLeft')  ctx.translate((1 - animProgress) * w *  dir, 0);
            else if (animType === 'slideRight') ctx.translate((1 - animProgress) * -w * dir, 0);
            else if (animType === 'slideUp')    ctx.translate(0, (1 - animProgress) * h * dir);
            else if (animType === 'slideDown')  ctx.translate(0, (1 - animProgress) * -h * dir);
            else if (animType === 'zoom' || animType === 'zoomIn') {
                const scaleFactor = animMode === 'in' ? animProgress : (1 - animProgress);
                ctx.translate(w / 2, h / 2);
                ctx.scale(Math.max(0.01, scaleFactor), Math.max(0.01, scaleFactor));
                ctx.translate(-w / 2, -h / 2);
            }
            else if (animType === 'pop') {
                let scaleFactor = 1;
                const t = animProgress - 1;
                scaleFactor = 1 + t * t * (2.70158 * t + 1.70158);
                ctx.globalAlpha *= animProgress;
                ctx.translate(w / 2, h / 2);
                ctx.scale(Math.max(0.01, scaleFactor), Math.max(0.01, scaleFactor));
                ctx.translate(-w / 2, -h / 2);
            }
            else if (animType === 'typewriter') {
                const clipDir = animMode === 'in' ? animProgress : (1 - animProgress);
                ctx.beginPath();
                ctx.rect(0, 0, w * clipDir, h);

                ctx.clip();
            }
        }

        if (this.hoveredTemplate.type === 'image') {
            const imgSrc = this.hoveredTemplate.src;
            if (!(window as any)._hoverImgCache) (window as any)._hoverImgCache = {};
            let img = (window as any)._hoverImgCache[imgSrc];
            if (!img) {
                img = new Image();
                img.crossOrigin = "anonymous";
                img.src = imgSrc;
                (window as any)._hoverImgCache[imgSrc] = img;
            }
            if (img.complete && img.naturalWidth) {
                const props = fakeClip.properties;
                const scale = (props.scale || 100) / 100;
                ctx.translate(w / 2 + (props.positionX || 0), h / 2 + (props.positionY || 0));
                ctx.scale(scale, scale);
                if (props.rotation) ctx.rotate(props.rotation * Math.PI / 180);
                // calculate aspect ratio to fit inside a reasonable preview box if too large
                let drawW = img.naturalWidth;
                let drawH = img.naturalHeight;
                // standard limit to avoid taking up the whole screen
                const maxDim = 800;
                if (drawW > maxDim || drawH > maxDim) {
                    const ratio = Math.min(maxDim / drawW, maxDim / drawH);
                    drawW *= ratio;
                    drawH *= ratio;
                }
                ctx.drawImage(img, -drawW / 2, -drawH / 2, drawW, drawH);
            }
        } else {
            drawAdvancedText(ctx, fakeClip, w, h);
        }
        ctx.restore();
    }

    // 4. Draw UI Overlays (Bounding Boxes)
    this.drawUIOverlays(ctx, w, h);
};

window.EditorApp.prototype.drawUIOverlays = function(ctx, w, h) {
    // Draw Snapping Guides
    if (this.isDragging && this.snappedX) {
        ctx.save(); ctx.beginPath();
        ctx.moveTo(w / 2, 0); ctx.lineTo(w / 2, h);
        ctx.strokeStyle = '#00ffff'; ctx.lineWidth = 1.5; ctx.setLineDash([5, 5]);
        ctx.stroke(); ctx.restore();
    }
    if (this.isDragging && this.snappedY) {
        ctx.save(); ctx.beginPath();
        ctx.moveTo(0, h / 2); ctx.lineTo(w, h / 2);
        ctx.strokeStyle = '#00ffff'; ctx.lineWidth = 1.5; ctx.setLineDash([5, 5]);
        ctx.stroke(); ctx.restore();
    }

    // Helper to find visible clips for UI hit testing
    // ✅ Compute anySolo live — this.anySolo is never updated
    const anySolo = this.tracks.some(t => t.isSolo);
    const visibleTracks = this.tracks.filter(t => !t.isMuted && (!anySolo || t.isSolo));
    
    // FIX: Reverse here so that the top-most track (V3) overlay is drawn LAST (on top of V1's overlay)
    for (const track of [...visibleTracks].reverse()) {
        const clips = track.getClipsAtTime(this.currentTime);
        if (clips.length > 0) {
            const clip = clips[0];
            if (this.selectedClipIds.has(clip.id)) {
                this.drawBoundingBox(ctx, clip, track, w, h, '#3b82f6', false);
                
                // Draw Motion Path
                if (clip.keyframes && (clip.keyframes.positionX || clip.keyframes.positionY)) {
                    const times = new Set();
                    if (clip.keyframes.positionX) clip.keyframes.positionX.forEach(k => times.add(k.t));
                    if (clip.keyframes.positionY) clip.keyframes.positionY.forEach(k => times.add(k.t));
                    const sortedTimes = Array.from(times).sort((a, b) => a - b);
                    
                    if (sortedTimes.length > 1) {
                        ctx.save();
                        ctx.beginPath();
                        ctx.strokeStyle = 'rgba(59, 130, 246, 0.8)';
                        ctx.lineWidth = 2;
                        ctx.setLineDash([5, 5]);
                        
                        const centerX = w / 2; const centerY = h / 2;
                        const points = [];
                        
                        for (const t of sortedTimes) {
                            const px = clip.getPropertyValue ? clip.getPropertyValue('positionX', t) : (clip.properties.positionX || 0);
                            const py = clip.getPropertyValue ? clip.getPropertyValue('positionY', t) : (clip.properties.positionY || 0);
                            points.push({x: centerX + px, y: centerY + py});
                        }
                        
                        ctx.moveTo(points[0].x, points[0].y);
                        for (let i = 1; i < points.length; i++) {
                            ctx.lineTo(points[i].x, points[i].y);
                        }
                        ctx.stroke();
                        
                        // Draw Nodes
                        ctx.fillStyle = '#ffffff';
                        ctx.setLineDash([]);
                        for (const p of points) {
                            ctx.beginPath();
                            ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
                            ctx.fill();
                            ctx.stroke();
                        }
                        ctx.restore();
                    }
                }
            } else if (this.hoveredClip && this.hoveredClip.id === clip.id) {
                this.drawBoundingBox(ctx, clip, track, w, h, 'rgba(255, 255, 255, 0.8)', true);
            }
        }
    }
};

window.EditorApp.prototype.drawBoundingBox = function(ctx, clip, track, w, h, color, isDashed) {
    const centerX = w / 2; const centerY = h / 2;
    const timeInClip = this.currentTime - clip.start;
    
    const { posX, posY, scale, rot } = this.getClipTransform(clip, timeInClip);
    
    // Get scaleX/scaleY (still from properties, since Sandwich only has uniform scale)
    const gv = (prop, def) => clip.getPropertyValue ? clip.getPropertyValue(prop, timeInClip) : (clip.properties[prop] !== undefined ? clip.properties[prop] : def);
    let scaleX = gv('scaleX', 100) / 100;
    let scaleY = gv('scaleY', 100) / 100;
    
    ctx.save(); 
    ctx.translate(centerX + posX, centerY + posY); 
    ctx.rotate((rot * Math.PI) / 180); 
    
    // Check Forced Dimensions
    if (clip.properties.forcedWidth && clip.properties.forcedHeight) {
         ctx.scale(1, 1);
    } else {
         ctx.scale(scale * scaleX, scale * scaleY);
    }
    
    // 🔥 ASPECT FILL (COVER MODE) for Bounding Box
    const { drawW, drawH } = this.getClipDrawRect(clip, w, h);
    
    ctx.translate(-drawW / 2, -drawH / 2); 
    ctx.strokeStyle = color; ctx.lineWidth = 4 / scale;
    if (isDashed) ctx.setLineDash([10 / scale, 10 / scale]); 
    ctx.strokeRect(0, 0, drawW, drawH);
    
    // Draw Interactive Handles if selected (not dashed/hovered)
    if (!isDashed) {
        ctx.fillStyle = '#ffffff';
        ctx.strokeStyle = '#3b82f6';
        
        let effectiveScaleX = scale * scaleX;
        let effectiveScaleY = scale * scaleY;
        if (clip.properties.forcedWidth && clip.properties.forcedHeight) {
            effectiveScaleX = 1; effectiveScaleY = 1;
        }
        
        const avgScale = (effectiveScaleX + effectiveScaleY) / 2;
        ctx.lineWidth = 4 / avgScale; // Thicker border for handles
        const hs = 24 / avgScale; // HUGE handles (24px visual)
        
        const handles = [
            { x: 0, y: 0 }, { x: drawW / 2, y: 0 }, { x: drawW, y: 0 },
            { x: 0, y: drawH / 2 }, { x: drawW, y: drawH / 2 },
            { x: 0, y: drawH }, { x: drawW / 2, y: drawH }, { x: drawW, y: drawH }
        ];
        
        ctx.setLineDash([]);
        for (const hd of handles) {
            ctx.fillRect(hd.x - hs/2, hd.y - hs/2, hs, hs);
            ctx.strokeRect(hd.x - hs/2, hd.y - hs/2, hs, hs);
        }
        
        // --- Draw Logo Removers ---
        if (clip.logoRemovers && clip.logoRemovers.length > 0) {
            ctx.strokeStyle = 'rgba(255, 0, 0, 0.8)';
            ctx.lineWidth = 2 / avgScale;
            ctx.setLineDash([5 / avgScale, 5 / avgScale]);
            for (const rm of clip.logoRemovers) {
                const rx = (rm.x / 100) * drawW - (rm.width / 200) * drawW;
                const ry = (rm.y / 100) * drawH - (rm.height / 200) * drawH;
                const rw = (rm.width / 100) * drawW;
                const rh = (rm.height / 100) * drawH;
                ctx.strokeRect(rx, ry, rw, rh);
                
                ctx.fillStyle = 'rgba(255, 0, 0, 0.8)';
                ctx.fillRect(rx, ry - (12 / avgScale), 35 / avgScale, 12 / avgScale);
                ctx.fillStyle = 'white';
                ctx.font = `${8 / avgScale}px sans-serif`;
                ctx.fillText(rm.mode, rx + (2 / avgScale), ry - (2 / avgScale));
            }
            ctx.setLineDash([]);
        }
        
        // Rotation handle
        ctx.beginPath();
        ctx.moveTo(drawW / 2, 0);
        ctx.lineTo(drawW / 2, -40 / effectiveScaleY);
        ctx.stroke();
        
        ctx.beginPath();
        ctx.arc(drawW / 2, -40 / effectiveScaleY, hs / 1.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
    }

    ctx.restore();
};

window.EditorApp.prototype.seekFrame = function(frames) { const fd = 1/this.FPS; this.currentTime = Math.max(0, Math.min(this.currentTime + (frames*fd), this.duration)); this.seek(0); };
window.EditorApp.prototype.seekToStart = function() { this.currentTime = 0; this.seek(0); };
window.EditorApp.prototype.seekToEnd = function() { this.currentTime = this.duration; this.seek(0); };
window.EditorApp.prototype.framesToTimecode = function(s) { const f=Math.floor(s*this.FPS)%this.FPS, ts=Math.floor(s), ss=ts%60, mm=Math.floor(ts/60)%60, hh=Math.floor(ts/3600); const p=n=>n.toString().padStart(2,'0'); return `${p(hh)};${p(mm)};${p(ss)};${p(f)}`; };
window.EditorApp.prototype.manualTimeUpdate = function(str) { const p=str.split(';'); if(p.length!==4)return; const s=(parseInt(p[0])*3600)+(parseInt(p[1])*60)+parseInt(p[2])+(parseInt(p[3])/this.FPS); this.currentTime=Math.max(0,Math.min(s,this.duration)); this.seek(0); };

window.EditorApp.prototype.managePlayers = function() {
    this.anySolo = this.tracks.some(t => t.isSolo); const reqs = new Map(); 
    this.tracks.forEach(track => {
        const clips = track.getClipsAtTime(this.currentTime); if(clips.length>0) {
            const clip = clips[0];
            if ((clip.type === 'video') && (track.type === 'video' || track.type === 'main' || track.type === 'overlay') && !track.isMuted && (!this.anySolo || track.isSolo)) {
                const key = `visual_${clip.src}`; if(!reqs.has(key)) reqs.set(key, { src: clip.src, type: 'visual', clip: clip });
            }
            if ((clip.properties && clip.properties.innerMediaType === 'video') && clip.properties.innerMediaSrc && !track.isMuted && (!this.anySolo || track.isSolo)) {
                const innerKey = `visual_${clip.properties.innerMediaSrc}`;
                if(!reqs.has(innerKey)) reqs.set(innerKey, { src: clip.properties.innerMediaSrc, type: 'visual', clip: clip });
            }
            if ((clip.type === 'audio') && (track.type === 'audio') && !track.isMuted && (!this.anySolo || track.isSolo)) {
                const key = `audio_${clip.src}`; if(!reqs.has(key)) reqs.set(key, { src: clip.src, type: 'audio', clip: clip, vol: 0 });
                const r = reqs.get(key);
                // ✅ FIX: Use getPropertyValue for keyframe-animated volume
                // clip.properties.volume is the static value; keyframes override it
                const timeInClip = this.currentTime - clip.start;
                const animVol = clip.getPropertyValue
                    ? clip.getPropertyValue('volume', timeInClip)
                    : (clip.properties.volume !== undefined ? clip.properties.volume : 100);
                r.vol = Math.max(r.vol, animVol / 100);
            }
        }
    });
    const avail = [...this.players]; const assign = {}; 
    reqs.forEach((r,k) => { const ex = this.players.find(p => p.getAttribute('data-key') === k); if(ex) { assign[k] = ex; avail.splice(avail.indexOf(ex), 1); } });
    reqs.forEach((r,k) => { if(!assign[k] && avail.length>0) { const p = avail.pop(); p.setAttribute('data-key', k); p.setAttribute('data-type', r.type); if(p.getAttribute('src')!==r.src) { p.src = r.src; p.load(); } assign[k] = p; } });
    Object.keys(assign).forEach(k => {
        const p = assign[k], r = reqs.get(k), off = this.currentTime - r.clip.start;
        const speed = r.clip.properties?.playbackSpeed || 1.0;
        const t = (r.clip.sourceIn || 0) + (off * speed);
        
        if (Math.abs(p.currentTime - t) > 0.15) p.currentTime = t;
        
        p.playbackRate = speed; // Set native video speed
        if (this.isPlaying && p.paused && p.readyState >= 2) p.play().catch(e=>{}); else if (!this.isPlaying && !p.paused) p.pause();
        if (r.type === 'visual') { p.muted = true; p.volume = 0; } else { p.muted = false; p.volume = r.vol; }
    });
    avail.forEach(p => { if(p.getAttribute('data-key')) { p.removeAttribute('data-key'); p.removeAttribute('data-type'); p.pause(); p.muted = true; } });
};

window.EditorApp.prototype.seek = function(d) { 
    this.currentTime = Math.max(0, Math.min(this.currentTime + d, this.duration)); 
    if (this.isPlaying && this.playbackRate === 1) {
        this.playbackStartTime = this.audioCtx.currentTime - this.currentTime;
    }
    this.managePlayers(); 
    this.renderFrameToCanvas(); 
    this.updatePlayheadPosition(); 
    this.requestRedraw(); 
};

window.EditorApp.prototype.syncOverlays = function() { this.managePlayers(); this.renderFrameToCanvas(); this.requestRedraw(); }; 

window.EditorApp.prototype.updatePlayheadPosition = function() {
    // FIX #1: update DOM playhead position
    if (this.playhead) {
        // ✅ Use this.headerWidth (kept in sync by store.setHeaderWidth) instead of
        // the hardcoded TRACK_HEADER_WIDTH_PREVIEW so the playhead stays accurate
        // after the user resizes the track header panel.
        const headerW = this.headerWidth || 140;
        const pos = (this.currentTime * this.pixelsPerSecond) + headerW;
        this.playhead.style.left = `${pos}px`;
        const ti = document.getElementById('time-display');
        if (ti && document.activeElement !== ti) ti.value = this.framesToTimecode(this.currentTime);
        if (this.isPlaying && !this.isScrubbing && this.timelineScrollArea) {
            const vw = this.timelineScrollArea.clientWidth;
            const sl = this.timelineScrollArea.scrollLeft;
            if (pos > sl + vw - 50) this.timelineScrollArea.scrollLeft = pos - headerW - 100;
        }
    }
    // FIX #1: also sync Zustand so React Playhead component re-renders
    if (window.useEditorStore) {
        window.useEditorStore.setState({ currentTime: this.currentTime });
    }
};

window.EditorApp.prototype.setupPlayheadScrubbing = function() {
    if (!this.playhead) return;
    
    if (this.timelineContent) {
        this.timelineContent.addEventListener('mousedown', (e) => {
            // ONLY jump playhead if clicking directly on the time-ruler
            if (e.button !== 0 || !e.target.closest('.time-ruler') || e.target.closest('.playhead-marker')) return;
            
            const scrollAreaRect = this.timelineScrollArea.getBoundingClientRect();
            const clickXInViewport = e.clientX - scrollAreaRect.left;
            const absoluteX = clickXInViewport + this.timelineScrollArea.scrollLeft;
            // ✅ Use dynamic headerWidth instead of hardcoded constant
            const timeX = absoluteX - (this.headerWidth || 140);
            
            if (timeX >= 0) {
                 this.seek((timeX / this.pixelsPerSecond) - this.currentTime);
            }
        });
    }

    this.playhead.onmousedown = (e) => {
        e.preventDefault(); e.stopPropagation(); 
        this.isScrubbing = true; 
        document.body.style.cursor = 'grabbing';
        
        const wp = this.isPlaying; if (wp) this.pausePlayback();
        const onMove = (ev) => { 
            // ✅ Use dynamic headerWidth instead of hardcoded constant
            const x = (ev.clientX - this.timelineContent.getBoundingClientRect().left) + this.timelineScrollArea.scrollLeft - (this.headerWidth || 140); 
            this.currentTime = Math.max(0, Math.min(x / this.pixelsPerSecond, this.duration)); 
            this.seek(0); 
        };
        const onUp = () => { 
            this.isScrubbing = false; 
            document.body.style.cursor = 'default'; 
            document.removeEventListener('mousemove', onMove); 
            document.removeEventListener('mouseup', onUp); 
            this.requestRedraw(); 
            if (wp) this.startPlayback(); 
        };
        document.addEventListener('mousemove', onMove); document.addEventListener('mouseup', onUp);
    };
};
