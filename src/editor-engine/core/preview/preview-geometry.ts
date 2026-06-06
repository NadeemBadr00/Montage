// @ts-nocheck
// preview-geometry.ts — getClipTransform, openOnCanvasTextEditor, hitTest, hitTestAll, showLayerSelectionMenu, getCanvasCoordinates, findClipById, getClipDrawRect, checkResizeHandles

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
    if (!this.canvas || typeof this.canvas.getBoundingClientRect !== 'function') return { x: 0, y: 0 };
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
            const fontStr = `${style.fontWeight || 'bold'} ${fontSize}px "${style.fontFamily || 'Cairo'}", sans-serif`;
            
            // ✅ P7: measureText Cache (avoids O(m) string splits & measureText calls per frame)
            const padding = style.padding !== undefined ? style.padding : 20;
            const cacheKey = `${text}|${fontStr}|${w}|${padding}`;
            if (!this._textMeasureCache) this._textMeasureCache = new Map();
            
            if (this._textMeasureCache.has(cacheKey)) {
                const cached = this._textMeasureCache.get(cacheKey);
                clip._computedWidth = cached.drawW;
                clip._computedHeight = cached.drawH;
                return cached;
            }

            this.ctx.save();
            this.ctx.font = fontStr;
            
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
            
            drawW = maxLineWidth + (padding * 2);
            drawH = totalHeight + (padding * 2);
            
            this.ctx.restore();

            // Store in cache (limit size to 100 to prevent leak)
            if (this._textMeasureCache.size > 100) {
                const firstKey = this._textMeasureCache.keys().next().value;
                this._textMeasureCache.delete(firstKey);
            }
            this._textMeasureCache.set(cacheKey, { drawW, drawH });
            clip._computedWidth = drawW;
            clip._computedHeight = drawH;
            
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
