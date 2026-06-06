// @ts-nocheck
// preview-canvas-events.ts — setupCanvasInteraction (mouse/touch events, drag, resize, selection), handleFrameUpload
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
            this.saveState();
            this.isDragging = true;
            mode = 'move'; startX = x; startY = y; activeClip = hitClip;
            initialProps = { ...hitClip.properties, sandwich: hitClip.sandwich ? { ...hitClip.sandwich } : null };
            this.requestRedraw();
        } else {
            // ── Fallback: if no hit at currentTime, try seeking to first visible clip ──
            let foundClip = null;
            for (const track of this.tracks) {
                if (track.isMuted) continue;
                for (const c of track.clips) {
                    if (c.type !== 'audio') { foundClip = c; break; }
                }
                if (foundClip) break;
            }
            if (foundClip && (this.currentTime < foundClip.start || this.currentTime > foundClip.start + foundClip.duration)) {
                // Seek to where the clip is, then re-select
                const seekTime = foundClip.start + 0.1;
                this.currentTime = seekTime;
                if (this.seek) this.seek(0);
                this.requestRedraw();
                // Try selecting after seek settles
                setTimeout(() => {
                    const { x: x2, y: y2 } = this.getCanvasCoordinates(e);
                    const retryHit = this.hitTest(x2, y2);
                    if (retryHit) { this.selectClip(retryHit.id); this.requestRedraw(); }
                }, 80);
            } else {
                this.deselectAll();
                this.requestRedraw();
            }
        }
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
                const cw = this.canvas.width;
                const ch = this.canvas.height;
                const deltaX = x - startX; const deltaY = y - startY;
                
                let newX = (initialProps.positionX || 0) + deltaX;
                let newY = (initialProps.positionY || 0) + deltaY;
                
                this.snappedX = false; this.snappedY = false;
                this.snappedEdgeX = ''; this.snappedEdgeY = ''; // 'left', 'right', 'top', 'bottom'

                // Phase 34: PiP Snap Corners (Hold Shift)
                if (e.shiftKey) {
                    const pipScale = 30; // 30% scale
                    activeClip.properties.scale = pipScale;
                    // determine quadrant
                    if (newX < 0 && newY < 0) { newX = -cw/2 + (cw * pipScale/200) + 20; newY = -ch/2 + (ch * pipScale/200) + 20; }
                    else if (newX > 0 && newY < 0) { newX = cw/2 - (cw * pipScale/200) - 20; newY = -ch/2 + (ch * pipScale/200) + 20; }
                    else if (newX < 0 && newY > 0) { newX = -cw/2 + (cw * pipScale/200) + 20; newY = ch/2 - (ch * pipScale/200) - 20; }
                    else if (newX > 0 && newY > 0) { newX = cw/2 - (cw * pipScale/200) - 20; newY = ch/2 - (ch * pipScale/200) - 20; }
                } else {
                    // Phase 31: Smart Snapping (Center & Edges)
                    const snapThreshold = 15;
                    const { drawW, drawH } = this.getClipDrawRect(activeClip, cw, ch);
                    const scale = (activeClip.properties.scale || 100) / 100;
                    const cHalfW = (drawW * scale) / 2;
                    const cHalfH = (drawH * scale) / 2;

                    // X Snapping
                    if (Math.abs(newX) < snapThreshold) { newX = 0; this.snappedX = true; } // Center
                    else if (Math.abs(newX - (-cw/2 + cHalfW)) < snapThreshold) { newX = -cw/2 + cHalfW; this.snappedX = true; this.snappedEdgeX = 'left'; }
                    else if (Math.abs(newX - (cw/2 - cHalfW)) < snapThreshold) { newX = cw/2 - cHalfW; this.snappedX = true; this.snappedEdgeX = 'right'; }

                    // Y Snapping
                    if (Math.abs(newY) < snapThreshold) { newY = 0; this.snappedY = true; } // Center
                    else if (Math.abs(newY - (-ch/2 + cHalfH)) < snapThreshold) { newY = -ch/2 + cHalfH; this.snappedY = true; this.snappedEdgeY = 'top'; }
                    else if (Math.abs(newY - (ch/2 - cHalfH)) < snapThreshold) { newY = ch/2 - cHalfH; this.snappedY = true; this.snappedEdgeY = 'bottom'; }
                }
                
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
            // Double-click on text clip → open inline editor
            this.openOnCanvasTextEditor(hitClip);
        } else if (hitClip && hitClip.src && hitClip.src.includes('frame_')) {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = 'image/*,video/*';
            input.onchange = (ev) => this.handleFrameUpload(ev, hitClip);
            input.click();
        }
        // NOTE: double-clicking empty canvas no longer adds text.
        // Use the "Add Text" button in the right panel instead.
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

window.EditorApp.prototype.openOnCanvasTextEditor = function(clip) {
    if (!this.canvas.parentElement) return;
    
    // Calculate DOM position of the text clip relative to the canvas
    const timeInClip = this.currentTime - clip.start;
    const { posX, posY, scale } = this.getClipTransform(clip, timeInClip);
    
    const cw = this.canvas.width;
    const ch = this.canvas.height;
    
    const cssW = this.canvas.clientWidth;
    const cssH = this.canvas.clientHeight;
    
    const ratioX = cssW / cw;
    const ratioY = cssH / ch;
    
    // Pixel coordinates in Canvas space
    const cx = (cw / 2) + posX;
    const cy = (ch / 2) + posY;
    
    // Pixel coordinates in CSS space
    const domX = cx * ratioX;
    const domY = cy * ratioY;
    
    const input = document.createElement('textarea');
    input.value = clip.text || clip.src || '';
    
    // Styling to match canvas text as close as possible
    const style = clip.textStyle || {};
    const fontSize = ch * 0.05 * (scale || 1) * ratioY;
    
    Object.assign(input.style, {
        position: 'absolute',
        left: `${domX}px`,
        top: `${domY}px`,
        transform: 'translate(-50%, -50%)',
        fontSize: `${fontSize}px`,
        fontFamily: style.fontFamily || 'Cairo',
        fontWeight: style.fontWeight || 'bold',
        fontStyle: style.fontStyle || 'normal',
        color: style.color || '#ffffff',
        textAlign: style.textAlign || 'center',
        background: 'rgba(0,0,0,0.4)',
        border: '2px solid #3b82f6',
        borderRadius: '8px',
        padding: '10px',
        minWidth: '200px',
        minHeight: '60px',
        zIndex: '1000',
        outline: 'none',
        resize: 'both',
        boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
        whiteSpace: 'pre-wrap',
        overflow: 'hidden'
    });
    
    // Ensure the container is position: relative
    this.canvas.parentElement.style.position = 'relative';
    this.canvas.parentElement.appendChild(input);
    
    // Select text automatically
    input.focus();
    input.setSelectionRange(0, input.value.length);
    
    const closeAndSave = () => {
        if (!input.parentElement) return; // already closed
        const newText = input.value;
        if (newText !== clip.text && newText !== clip.src) {
            clip.text = newText;
            clip.src = newText; // ensure fallback
            this.commitStateToReact();
            this.requestRedraw();
        }
        input.remove();
    };
    
    // Close on blur or Enter (if not holding shift)
    input.addEventListener('blur', closeAndSave);
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            closeAndSave();
        } else if (e.key === 'Escape') {
            input.remove(); // discard changes
        }
    });
    
    // Auto-resize textarea vertically based on content
    input.addEventListener('input', () => {
        input.style.height = 'auto';
        input.style.height = input.scrollHeight + 'px';
        clip.text = input.value;
        clip.src = input.value;
        this.requestRedraw(); // Live preview
    });
};

// Phase 43: Advanced Alignment
window.EditorApp.prototype.alignSelectedClips = function(alignment) {
    if (this.selectedClipIds.size < 2) return;
    
    const clips = Array.from(this.selectedClipIds)
        .map(id => this.findClipById(id))
        .filter(c => c && c.properties);
        
    if (clips.length < 2) return;

    // Find bounding box encompassing all clips to get edges
    // Actually, simple alignment: align to the first selected clip or the bounding box
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    
    clips.forEach(clip => {
        const x = clip.properties.positionX || 0;
        const y = clip.properties.positionY || 0;
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
    });

    const targetX = (minX + maxX) / 2;
    const targetY = (minY + maxY) / 2;

    this.saveState();

    clips.forEach(clip => {
        if (alignment === 'left') clip.properties.positionX = minX;
        if (alignment === 'right') clip.properties.positionX = maxX;
        if (alignment === 'center-x') clip.properties.positionX = targetX;
        
        if (alignment === 'top') clip.properties.positionY = minY;
        if (alignment === 'bottom') clip.properties.positionY = maxY;
        if (alignment === 'center-y') clip.properties.positionY = targetY;
    });

    this.commitStateToReact();
    this.requestRedraw();
};
