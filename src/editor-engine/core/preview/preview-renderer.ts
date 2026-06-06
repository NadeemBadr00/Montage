// @ts-nocheck
// preview-renderer.ts — renderFrameToCanvas, drawUIOverlays, drawBoundingBox
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
    }

    // ── Always render Social Overlays (even with no video renderJobs) ──
    // This runs AFTER the WebGL block so overlays always appear on top.
    if (typeof (this as any).renderSocialOverlays === 'function') {
        (this as any).renderSocialOverlays(ctx, renderJobs, w, h);
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
