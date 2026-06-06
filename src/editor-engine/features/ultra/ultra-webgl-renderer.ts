// @ts-nocheck
// ultra-webgl-renderer.ts — WebGL composition rendering, layer drawing, transitions, masks

window.EditorApp.prototype.getSourceElement = function(clip) {
    // ✅ FIX: Priority to offline decoded VideoFrames during export
    // If we are exporting and a frame was decoded for this clip, use it directly!
    // This makes offline export frame-perfect and prevents WebGL from grabbing
    // a desynced frame from the background HTML5 video player.
    if (this.exportVideoFrames && this.exportVideoFrames.has(clip.id)) {
        return this.exportVideoFrames.get(clip.id);
    }

    if (clip.type === 'video') {
        const key = `visual_${clip.src}`;
        if (!this.players) return null;
        const player = this.players.find(p => p.getAttribute('data-key') === key);
        return (player && player.readyState >= 2) ? player : null;
    } else if (clip.type === 'image') {
        if (this.getImageFromCache) {
            const img = this.getImageFromCache(clip.src);
            return (img && img.complete && img.naturalWidth > 0) ? img : null;
        }
        if (!this.imgCache) return null;
        const img = this.imgCache.get(clip.src);
        return (img && img.complete) ? img : null;
    }
    return null;
};

window.EditorApp.prototype.renderWebGLComposition = function(renderJobs, w, h) {
    if (!this.gl) return;
    const gl = this.gl;

    if (this.glCanvas.width !== w || this.glCanvas.height !== h) {
        this.glCanvas.width = w; this.glCanvas.height = h;
        gl.viewport(0, 0, w, h);
    }
    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.useProgram(this.program);
    gl.uniform2f(this.glInfo.uniforms.resolution, w, h);

    this.bindQuadAttributes(gl);

    for (const job of renderJobs) {
        if (job.type === 'single') {
            const clip = job.clip;
            if (clip.type !== 'video' && clip.type !== 'image') continue;

            const sourceEl = this.getSourceElement(clip);
            if (!sourceEl) continue;

            if (clip.aiSegmentation?.enabled) {
                const rawFrame = Math.floor(this.currentTime * 30);
                const bucketFrame = Math.floor(rawFrame / (this.AI_THROTTLE_RATE || 3)) * (this.AI_THROTTLE_RATE || 3);
                const cachedMask = this.maskCache.get(bucketFrame);
                if (cachedMask) {
                    clip.aiMask = cachedMask;
                } else if (!this.isWorkerBusy) {
                    this.currentProcessingClipId = clip.id;
                    this.isWorkerBusy = true;
                    this.aiDownscaleCtx.drawImage(sourceEl, 0, 0, 360, 202);
                    const bitmap = this.aiDownscaleCanvas.transferToImageBitmap();
                    this.aiWorker.postMessage({ type: 'PROCESS_FRAME', image: bitmap, timestamp: this.currentTime, isPrediction: false, id: clip.id }, [bitmap]);
                }
            }

            // If it's a frame with inner media, draw the inner media FIRST
            if (clip.src.includes('frame_') && clip.properties.innerMediaSrc) {
                const uvScaleX = clip.properties.innerUvScaleX !== undefined ? clip.properties.innerUvScaleX : 1.0;
                const uvScaleY = clip.properties.innerUvScaleY !== undefined ? clip.properties.innerUvScaleY : 1.0;
                
                const baseOffsetX = (1.0 - uvScaleX) / 2.0;
                const baseOffsetY = (1.0 - uvScaleY) / 2.0;
                
                const panX = -((clip.properties.innerOffsetX || 0) / 1000.0) * 0.5;
                const panY = -((clip.properties.innerOffsetY || 0) / 1000.0) * 0.5;

                let dxFrac = 0; let dyFrac = 0;
                if (clip.src.includes('frame_real_ipad')) { dxFrac = -0.5 / 840; dyFrac = -0.5 / 634; }
                else if (clip.src.includes('frame_real_iphone')) { dxFrac = 0.0 / 365; dyFrac = -0.5 / 730; }
                else if (clip.src.includes('frame_real_laptop')) { dxFrac = -0.5 / 942; dyFrac = -114.0 / 766; }
                else if (clip.src.includes('frame_real_monitor')) { dxFrac = -0.5 / 840; dyFrac = -88.0 / 680; }
                else if (clip.src.includes('frame_real_samsung')) { dxFrac = -3.0 / 427; dyFrac = -3.0 / 868; }
                else if (clip.src.includes('frame_real_ui_instagram')) { dxFrac = -0.5 / 462; dyFrac = -1.5 / 913; }
                else if (clip.src.includes('frame_real_ui_tiktok')) { dxFrac = -5.5 / 427; dyFrac = -4.0 / 818; }
                else if (clip.src.includes('frame_real_ui_youtube')) { dxFrac = -6.5 / 842; dyFrac = 1.5 / 430; }
                
                let parentShiftX = 0; let parentShiftY = 0;
                if (dxFrac !== 0 || dyFrac !== 0) {
                    let srcW = sourceEl ? (sourceEl.naturalWidth || sourceEl.videoWidth || w) : w;
                    let srcH = sourceEl ? (sourceEl.naturalHeight || sourceEl.videoHeight || h) : h;
                    const coverRatio = Math.max(w / srcW, h / srcH);
                    const userScale = (clip.properties.scale || 100) / 100;
                    let outerW = srcW * coverRatio * userScale * ((clip.properties.scaleX !== undefined ? clip.properties.scaleX : 100) / 100);
                    let outerH = srcH * coverRatio * userScale * ((clip.properties.scaleY !== undefined ? clip.properties.scaleY : 100) / 100);
                    parentShiftX = dxFrac * outerW;
                    parentShiftY = dyFrac * outerH;
                }

                let innerBr = clip.properties.innerBorderRadius !== undefined ? parseFloat(clip.properties.innerBorderRadius) : (clip.src.includes('frame_real') ? 0.06 : 0.0);
                let innerScaleX = clip.properties.innerScaleX !== undefined ? parseFloat(clip.properties.innerScaleX) : 100;
                let innerScaleY = clip.properties.innerScaleY !== undefined ? parseFloat(clip.properties.innerScaleY) : 100;
                
                if (clip.properties.innerFitMode === 'tight') {
                    innerScaleX *= 0.95;
                    innerScaleY *= 0.95;
                } else if (clip.properties.innerFitMode === 'smart') {
                    innerBr = 0.15;
                }

                const innerMockClip = {
                    id: clip.id + '_inner',
                    type: clip.properties.innerMediaType,
                    src: clip.properties.innerMediaSrc,
                    properties: {
                        scale: clip.properties.scale,
                        scaleX: innerScaleX,
                        scaleY: innerScaleY,
                        positionX: clip.properties.positionX,
                        positionY: clip.properties.positionY,
                        rotation: clip.properties.rotation,
                        opacity: clip.properties.opacity,
                        flipX: clip.properties.innerFlipX,
                        flipY: clip.properties.innerFlipY,
                        forcedWidth: clip.properties.innerForcedWidth,
                        forcedHeight: clip.properties.innerForcedHeight,
                        uvScaleX: uvScaleX,
                        uvScaleY: uvScaleY,
                        uvOffsetX: baseOffsetX + panX,
                        uvOffsetY: baseOffsetY + panY,
                        innerRotation: clip.properties.innerRotation || 0,
                        parentShiftX: parentShiftX,
                        parentShiftY: parentShiftY,
                        borderRadius: innerBr
                    }
                };
                const innerSourceEl = this.getSourceElement(innerMockClip);
                if (innerSourceEl) {
                    this.drawLayerInWebGL(gl, innerMockClip, innerSourceEl, w, h, null, null, null, 0);
                }
            }

            // Apply overrideOpacity from track-level Fade In/Out transitions
            const savedOpacity = clip.properties.opacity;
            if (job.overrideOpacity !== undefined) {
                clip.properties.opacity = Math.round(job.overrideOpacity * 100);
            }
            this.drawLayerInWebGL(gl, clip, sourceEl, w, h, null, null, null, 0);
            if (job.overrideOpacity !== undefined) {
                clip.properties.opacity = savedOpacity; // restore
            }


        } else if (job.type === 'transition') {
            const { clipA, clipB, transition, progress } = job;
            const sourceElA = clipA ? this.getSourceElement(clipA) : null;
            const sourceElB = clipB ? this.getSourceElement(clipB) : null;
            if (!sourceElA && !sourceElB) continue;

            this.drawLayerInWebGL(gl, clipA || clipB, sourceElA, w, h, clipB || clipA, sourceElB, transition, progress);
        }
    }

    return this.glCanvas;
};

window.EditorApp.prototype.drawLayerInWebGL = function(gl, clip, sourceEl, canvasW, canvasH, clipB, sourceElB, transition, progress) {
    if (!clip && !clipB) return;
    const baseClip = clip || clipB;

    // --- Texture A (primary clip) ---
    if (!this.emptyTexture) {
        this.emptyTexture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, this.emptyTexture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([0,0,0,0]));
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    }

    gl.activeTexture(gl.TEXTURE0);
    if (clip && sourceEl) {
        if (clip.type === 'image') {
            gl.bindTexture(gl.TEXTURE_2D, this.getOrUpdateImageTexture(gl, clip, sourceEl));
        } else {
            gl.bindTexture(gl.TEXTURE_2D, this.videoTexture);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, sourceEl);
        }
    } else {
        gl.bindTexture(gl.TEXTURE_2D, this.emptyTexture);
    }
    gl.uniform1i(this.glInfo.uniforms.image, 0);

    // --- Transition (Texture B) ---
    if (transition && (clipB || clip)) {
        gl.activeTexture(gl.TEXTURE2);
        if (clipB && sourceElB) {
            if (clipB.type === 'image') {
                gl.bindTexture(gl.TEXTURE_2D, this.getOrUpdateImageTexture(gl, clipB, sourceElB));
            } else {
                gl.bindTexture(gl.TEXTURE_2D, this.videoTextureB);
                gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, sourceElB);
            }
        } else {
            gl.bindTexture(gl.TEXTURE_2D, this.emptyTexture);
        }
        gl.uniform1i(this.glInfo.uniforms.imageB, 2);
        gl.uniform1i(this.glInfo.uniforms.isTransition, 1);
        let tType = 1; // default: cross dissolve
        if (transition.type === 'wipe') tType = 2;
        if (transition.type === 'zoom') tType = 3;
        gl.uniform1i(this.glInfo.uniforms.transitionType, tType);
        gl.uniform1f(this.glInfo.uniforms.transitionProgress, progress || 0);
    } else {
        gl.uniform1i(this.glInfo.uniforms.isTransition, 0);
    }

    // --- Mask ---
    const useMask = (baseClip.aiSegmentation?.enabled && baseClip.aiMask);
    if (useMask) {
        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D, this.maskTexture);
        try {
            if (baseClip.aiMask && baseClip.aiMask.width > 0) {
                gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, baseClip.aiMask);
                gl.uniform1i(this.glInfo.uniforms.mask, 1);
                gl.uniform1i(this.glInfo.uniforms.useMask, 1);
            } else { gl.uniform1i(this.glInfo.uniforms.useMask, 0); }
        } catch (e) { gl.uniform1i(this.glInfo.uniforms.useMask, 0); }
    } else {
        gl.uniform1i(this.glInfo.uniforms.useMask, 0);
    }

    // --- Chroma Key ---
    if (baseClip.chromaKey?.enabled) {
        gl.uniform1i(this.glInfo.uniforms.useChroma, 1);
        const hex = baseClip.chromaKey.color;
        gl.uniform3f(this.glInfo.uniforms.chromaColor,
            parseInt(hex.slice(1,3),16)/255,
            parseInt(hex.slice(3,5),16)/255,
            parseInt(hex.slice(5,7),16)/255);
        gl.uniform1f(this.glInfo.uniforms.chromaThreshold, baseClip.chromaKey.threshold / 255);
    } else {
        gl.uniform1i(this.glInfo.uniforms.useChroma, 0);
    }

    // --- Transform ---
    let rawScale = baseClip.properties.scale || 100;
    let rawScaleX = baseClip.properties.scaleX !== undefined ? baseClip.properties.scaleX : 100;
    let rawScaleY = baseClip.properties.scaleY !== undefined ? baseClip.properties.scaleY : 100;
    let rawX = baseClip.properties.positionX || 0;
    let rawY = baseClip.properties.positionY || 0;

    const refEl = sourceEl || sourceElB;
    let srcW = refEl ? (refEl.naturalWidth || refEl.videoWidth || canvasW) : canvasW;
    let srcH = refEl ? (refEl.naturalHeight || refEl.videoHeight || canvasH) : canvasH;
    const coverRatio = Math.max(canvasW / srcW, canvasH / srcH);
    let width  = srcW * coverRatio;
    let height = srcH * coverRatio;

    let finalWidth, finalHeight;
    if (baseClip.properties.forcedWidth && baseClip.properties.forcedHeight) {
        const userScale = rawScale / 100;
        finalWidth  = baseClip.properties.forcedWidth * userScale;
        finalHeight = baseClip.properties.forcedHeight * userScale;
    } else {
        const userScale = rawScale / 100;
        finalWidth  = width  * userScale * (rawScaleX / 100);
        finalHeight = height * userScale * (rawScaleY / 100);
    }

    const rotation = (baseClip.properties.rotation || 0) * (Math.PI / 180);
    let x = (canvasW / 2) + rawX;
    let y = (canvasH / 2) + rawY;
    
    let dx = baseClip.properties.parentShiftX || 0;
    let dy = baseClip.properties.parentShiftY || 0;
    if (dx !== 0 || dy !== 0) {
        const c = Math.cos(rotation);
        const s = Math.sin(rotation);
        x += (dx * c - dy * s);
        y += (dx * s + dy * c);
    }
    let finalOpacity = (baseClip.properties.opacity !== undefined ? baseClip.properties.opacity : 100) / 100;

    // Clip-level In/Out animation (from Effect Controls "Transitions" section)
    if (baseClip.transitions && !transition) {
        const transDur = baseClip.transitions.duration || 1.0;
        const timeInClip   = this.currentTime - baseClip.start;
        const timeRemaining = (baseClip.start + baseClip.duration) - this.currentTime;
        let animProgress = 1, animType = 'none', animMode = '';
        if (timeInClip < transDur && baseClip.transitions.in && baseClip.transitions.in !== 'none') {
            animProgress = Math.max(0, timeInClip / transDur);
            animType = baseClip.transitions.in;
            animMode = 'in';
        } else if (timeRemaining < transDur && baseClip.transitions.out && baseClip.transitions.out !== 'none') {
            animProgress = Math.max(0, timeRemaining / transDur);
            animType = baseClip.transitions.out;
            animMode = 'out';
        }
        if      (animType === 'fade')       finalOpacity *= animProgress;
        else if (animType === 'slideLeft')  x += (1 - animProgress) * canvasW  * (animMode === 'in' ? 1 : -1);
        else if (animType === 'slideRight') x += (1 - animProgress) * -canvasW * (animMode === 'in' ? 1 : -1);
        else if (animType === 'slideUp')    y += (1 - animProgress) * canvasH  * (animMode === 'in' ? 1 : -1);
        else if (animType === 'wipe') {
            // Uniform scale from center — matches canvas_renderer iris clip
            const dir = animMode === 'in' ? animProgress : (1 - animProgress);
            finalWidth  *= Math.max(0.001, dir);
            finalHeight *= Math.max(0.001, dir);
        }
        else if (animType === 'zoom') { finalWidth *= Math.max(0.01, animProgress); finalHeight *= Math.max(0.01, animProgress); }
    }

    if (baseClip.properties.flipX) finalWidth *= -1;
    if (baseClip.properties.flipY) finalHeight *= -1;

    gl.uniform2f(this.glInfo.uniforms.translation, x, y);
    gl.uniform2f(this.glInfo.uniforms.scale, finalWidth, finalHeight);
    gl.uniform1f(this.glInfo.uniforms.rotation, rotation);
    gl.uniform1f(this.glInfo.uniforms.opacity, finalOpacity);
    
    const uvScaleX = baseClip.properties.uvScaleX !== undefined ? baseClip.properties.uvScaleX : 1.0;
    const uvScaleY = baseClip.properties.uvScaleY !== undefined ? baseClip.properties.uvScaleY : 1.0;
    const uvOffsetX = baseClip.properties.uvOffsetX !== undefined ? baseClip.properties.uvOffsetX : 0.0;
    const uvOffsetY = baseClip.properties.uvOffsetY !== undefined ? baseClip.properties.uvOffsetY : 0.0;
    
    const uvRot = baseClip.properties.innerRotation || 0;
    let uvRotIndex = 0;
    if (uvRot === 90) uvRotIndex = 1;
    else if (uvRot === 180) uvRotIndex = 2;
    else if (uvRot === 270) uvRotIndex = 3;
    
    gl.uniform2f(this.glInfo.uniforms.uvScale, uvScaleX, uvScaleY);
    gl.uniform2f(this.glInfo.uniforms.uvOffset, uvOffsetX, uvOffsetY);
    gl.uniform1i(this.glInfo.uniforms.uvRotation, uvRotIndex);
    
    // --- Logo / Object Removers ---
    const removers = baseClip.logoRemovers || [];
    gl.uniform1i(this.glInfo.uniforms.numRemovers, removers.length);
    if (removers.length > 0) {
        const rects = new Float32Array(3 * 4);
        const modes = new Int32Array(3);
        const strengths = new Float32Array(3);
        
        for (let i = 0; i < Math.min(3, removers.length); i++) {
            const rm = removers[i];
            const px = (rm.x / 100) - (rm.width / 200);
            const py = (rm.y / 100) - (rm.height / 200);
            const pw = rm.width / 100;
            const ph = rm.height / 100;
            rects.set([px, py, pw, ph], i * 4);
            
            let m = 0;
            if (rm.mode === 'pixelate') m = 1;
            else if (rm.mode === 'interpolate') m = 2;
            modes[i] = m;
            
            strengths[i] = rm.strength / 100;
        }
        gl.uniform4fv(this.glInfo.uniforms.removerRects, rects);
        gl.uniform1iv(this.glInfo.uniforms.removerModes, modes);
        gl.uniform1fv(this.glInfo.uniforms.removerStrengths, strengths);
    }

    gl.uniform2f(this.glInfo.uniforms.quadSize, finalWidth, finalHeight);
    gl.uniform1f(this.glInfo.uniforms.borderRadius, baseClip.properties.borderRadius || 0.0);

    gl.drawArrays(gl.TRIANGLES, 0, 6);
};

window.EditorApp.prototype.bindQuadAttributes = function(gl) {
    gl.bindBuffer(gl.ARRAY_BUFFER, this.glInfo.buffers.position);
    gl.enableVertexAttribArray(this.glInfo.attribs.position);
    gl.vertexAttribPointer(this.glInfo.attribs.position, 2, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.glInfo.buffers.texCoord);
    gl.enableVertexAttribArray(this.glInfo.attribs.texCoord);
    gl.vertexAttribPointer(this.glInfo.attribs.texCoord, 2, gl.FLOAT, false, 0, 0);
};

