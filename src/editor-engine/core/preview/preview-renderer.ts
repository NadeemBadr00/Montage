// @ts-nocheck
// preview-renderer.ts — renderFrameToCanvas, drawUIOverlays, drawBoundingBox
import { drawAdvancedText } from '../../renderers/canvas_renderer';
window.EditorApp.prototype.renderFrameToCanvas = function() {
    const ctx = this.ctx; 
    const w = this.canvas.width; 
    const h = this.canvas.height;
    
    // Clear Main 2D Canvas
    ctx.fillStyle = "#000000"; 
    ctx.fillRect(0, 0, w, h);

    // ✅ P1-OPT1: Compute anySolo ONCE per frame (was computed 3× before)
    const anySolo = this.tracks.some(t => t.isSolo);

    // ✅ P1-OPT2: Single filter pass — reused for text, shapes, and UI overlays
    const allNonMutedTracks = [];
    for (let i = 0; i < this.tracks.length; i++) {
        const t = this.tracks[i];
        if (!t.isMuted && (!anySolo || t.isSolo)) allNonMutedTracks.push(t);
    }
    const videoTracks = [];
    for (let i = 0; i < allNonMutedTracks.length; i++) {
        const t = allNonMutedTracks[i];
        if (t.type === 'video' || t.type === 'main' || t.type === 'overlay') videoTracks.push(t);
    }

    // ✅ P1-OPT3: Pre-apply Ken Burns BEFORE WebGL (was after — caused 1-frame lag)
    // Mutation kept intentionally; clip._kbApplied guards double-apply
    for (let ti = 0; ti < this.tracks.length; ti++) {
        const clips = this.tracks[ti].clips;
        for (let ci = 0; ci < clips.length; ci++) {
            const clip = clips[ci];
            if ((clip.type === 'video' || clip.type === 'image') && clip.properties?.kenBurns) {
                const kb = clip.properties.kenBurns;
                const timeInClip = Math.max(0, this.currentTime - clip.start);
                const tNorm = clip.duration > 0 ? Math.min(1, timeInClip / clip.duration) : 0;
                const ease  = tNorm * tNorm * (3 - 2 * tNorm);
                clip.properties.positionX = kb.startX + (kb.endX - kb.startX) * ease;
                clip.properties.positionY = kb.startY + (kb.endY - kb.startY) * ease;
                clip.properties.scale = ((kb.startScale || 1) * 100) + (((kb.endScale || 1) * 100) - ((kb.startScale || 1) * 100)) * ease;
            }
        }
    }

    // 1. Collect Visible Video Clips for WebGL
    const renderJobs = [];
    // ✅ P1-OPT4: Reverse for-loop — zero array allocation (was [...arr].reverse().forEach)
    for (let i = videoTracks.length - 1; i >= 0; i--) {
        const track = videoTracks[i];
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

            if (!clipA && !clipB) continue;

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
    }


    // 2. Render All Video Layers in WebGL (Compositing)
    if (this.renderWebGLComposition && renderJobs.length > 0) {
        const glCanvas = this.renderWebGLComposition(renderJobs, w, h);
        if (glCanvas) {
            // ═══════════════════════════════════════════════════════
            // Phase 41 — 🌫️ Auto-Fill Background Blur for Vertical Video
            // ═══════════════════════════════════════════════════════
            const baseJob = [...renderJobs].reverse().find(j => (j.clip || j.clipA) && ((j.clip || j.clipA).type === 'video' || (j.clip || j.clipA).type === 'image'));
            const baseClip = baseJob ? (baseJob.clip || baseJob.clipA) : null;
            if (baseClip && this.getSourceElement) {
                const sourceEl = this.getSourceElement(baseClip);
                if (sourceEl) {
                    let srcW = sourceEl.naturalWidth || sourceEl.videoWidth || w;
                    let srcH = sourceEl.naturalHeight || sourceEl.videoHeight || h;
                    const aspect = srcW / srcH;
                    const canvasAspect = w / h;
                    
                    // If video is vertical/square and canvas is wider, OR video is much narrower than canvas
                    if (aspect < canvasAspect * 0.9) {
                        ctx.save();
                        ctx.filter = 'blur(45px) brightness(0.6) saturate(1.5)';
                        const scale = Math.max(w / srcW, h / srcH) * 1.15; // slightly larger to hide blur bleeding
                        const drawW = srcW * scale;
                        const drawH = srcH * scale;
                        const drawX = w/2 - drawW/2;
                        const drawY = h/2 - drawH/2;
                        
                        try {
                            ctx.drawImage(sourceEl, drawX, drawY, drawW, drawH);
                        } catch(e) {} // Ignore cross-origin canvas taint errors temporarily if any
                        ctx.restore();
                    }
                }
            }

            // ✅ P2-OPT: Color grading now handled per-clip in GLSL shader (zero GPU readbacks)
            // Single drawImage — shader applies brightness/contrast/saturation/hue per layer
            ctx.drawImage(glCanvas, 0, 0);

            // Tint overlay (2D canvas pass — kept for tint since it needs clip bounds)
            for (const job of renderJobs) {
                const clip = job.clip || job.clipA;
                if (!clip) continue;
                const cg = clip.properties?.colorGrading;
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

                // ═══════════════════════════════════════════════════════
                // Phase 22 — 🎬 VIDEO: Motion Blur + Radial Blur
                // ═══════════════════════════════════════════════════════
                if (!clip || (clip.type !== 'video' && clip.type !== 'image')) continue;
                const motionBlurAmt = clip.properties?.motionBlur || 0;
                const radialBlurAmt = clip.properties?.radialBlur   || 0;
                if (motionBlurAmt > 0 || radialBlurAmt > 0) {
                    const timeInClip2 = this.currentTime - clip.start;
                    const { posX: mbPosX, posY: mbPosY, scale: mbScale } = this.getClipTransform(clip, timeInClip2);
                    const { drawW: mbW, drawH: mbH } = this.getClipDrawRect(clip, w, h);
                    const mbFW = mbW * (mbScale || 1);
                    const mbFH = mbH * (mbScale || 1);
                    const mbX  = (w / 2 + mbPosX) - mbFW / 2;
                    const mbY  = (h / 2 + mbPosY) - mbFH / 2;

                    if (motionBlurAmt > 0) {
                        // Motion blur: draw 4 ghost copies with decreasing opacity + horizontal offset
                        const blurPx = motionBlurAmt * 0.12;
                        ctx.save();
                        for (let g = 1; g <= 4; g++) {
                            ctx.globalAlpha = 0.08 * (5 - g);
                            ctx.drawImage(glCanvas, mbX - blurPx * g, mbY, mbFW, mbFH, mbX, mbY, mbFW, mbFH);
                        }
                        ctx.restore();
                    }
                    if (radialBlurAmt > 0) {
                        // Radial blur: draw scaled-out ghosts
                        const rFactor = 1 + radialBlurAmt * 0.002;
                        ctx.save();
                        for (let g = 1; g <= 3; g++) {
                            const sf = 1 + (rFactor - 1) * g * 0.4;
                            const gW = mbFW * sf;
                            const gH = mbFH * sf;
                            ctx.globalAlpha = 0.07 * (4 - g);
                            ctx.drawImage(glCanvas,
                                mbX, mbY, mbFW, mbFH,
                                mbX - (gW - mbFW) / 2, mbY - (gH - mbFH) / 2, gW, gH
                            );
                        }
                        ctx.restore();
                    }
                }

                // ═══════════════════════════════════════════════════════
                // Phase 23 — 🎬 VIDEO: Vignette + Chromatic Aberration
                // ═══════════════════════════════════════════════════════
                const vigStrength  = clip.properties?.vignetteStrength    || 0;
                const chromaAmt    = clip.properties?.chromaticAberration || 0;

                if (vigStrength > 0) {
                    ctx.save();
                    const vt3 = this.currentTime - clip.start;
                    const { posX: vPX, posY: vPY, scale: vSc } = this.getClipTransform(clip, vt3);
                    const { drawW: vW, drawH: vH } = this.getClipDrawRect(clip, w, h);
                    const vFW = vW * (vSc || 1); const vFH = vH * (vSc || 1);
                    const vX  = w / 2 + vPX;     const vY  = h / 2 + vPY;
                    const vAlpha = Math.min(0.9, vigStrength / 100);
                    const radGrad = ctx.createRadialGradient(vX, vY, Math.min(vFW, vFH) * 0.2, vX, vY, Math.max(vFW, vFH) * 0.8);
                    radGrad.addColorStop(0, 'rgba(0,0,0,0)');
                    radGrad.addColorStop(1, `rgba(0,0,0,${vAlpha})`);
                    ctx.fillStyle = radGrad;
                    ctx.fillRect(vX - vFW/2, vY - vFH/2, vFW, vFH);
                    ctx.restore();
                }

                if (chromaAmt > 0) {
                    // Chromatic aberration: R channel shifted right, B channel left
                    ctx.save();
                    const offset = chromaAmt * 1.2;
                    // Red channel
                    ctx.globalCompositeOperation = 'screen';
                    ctx.globalAlpha = 0.4;
                    ctx.filter = 'url("data:image/svg+xml,<svg xmlns=\'http://www.w3.org/2000/svg\'><filter id=\'r\'><feColorMatrix type=\'matrix\' values=\'1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0\'/></filter></svg>#r")';
                    ctx.drawImage(glCanvas, offset, 0);
                    // Blue channel
                    ctx.filter = 'url("data:image/svg+xml,<svg xmlns=\'http://www.w3.org/2000/svg\'><filter id=\'b\'><feColorMatrix type=\'matrix\' values=\'0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 1 0\'/></filter></svg>#b")';
                    ctx.drawImage(glCanvas, -offset, 0);
                    ctx.filter = 'none';
                    ctx.globalCompositeOperation = 'source-over';
                    ctx.globalAlpha = 1;
                    ctx.restore();
                }

                // ═══════════════════════════════════════════════════════
                // Phase 24, 25, 26 — 🖼️ IMAGE/VIDEO: Filters & Duotone
                // ═══════════════════════════════════════════════════════
                const denoiseAmt = clip.properties?.denoise || 0;
                const sharpenAmt = clip.properties?.sharpness || 0; // >100 is sharpen
                const duotoneEn  = clip.properties?.duotoneEnabled;

                if (denoiseAmt > 0 || sharpenAmt > 100 || duotoneEn) {
                    const vtF = this.currentTime - clip.start;
                    const { posX: fPX, posY: fPY, scale: fSc } = this.getClipTransform(clip, vtF);
                    const { drawW: fW, drawH: fH } = this.getClipDrawRect(clip, w, h);
                    const fFW = fW * (fSc||1); const fFH = fH * (fSc||1);
                    const fX  = (w/2 + fPX) - fFW/2;
                    const fY  = (h/2 + fPY) - fFH/2;

                    ctx.save();
                    let fStr = '';
                    if (denoiseAmt > 0) fStr += `blur(${denoiseAmt*0.02}px) contrast(1.05) `;
                    if (sharpenAmt > 100) fStr += `contrast(${(sharpenAmt/100)*1.1}) `;
                    if (duotoneEn) {
                        // Fake duotone with sepia/hue/saturate combo
                        fStr += `sepia(1) saturate(3) hue-rotate(-50deg) contrast(1.2) `;
                    }

                    if (fStr) {
                        ctx.filter = fStr.trim();
                        ctx.globalCompositeOperation = 'source-atop';
                        ctx.drawImage(glCanvas, fX, fY, fFW, fFH, fX, fY, fFW, fFH);
                        if (duotoneEn) {
                            // Overlay color 1 (Shadows) and Color 2 (Highlights) roughly using multiply/screen
                            ctx.filter = 'none';
                            ctx.globalCompositeOperation = 'multiply';
                            ctx.fillStyle = clip.properties.duotoneColor1 || '#1e3a8a';
                            ctx.fillRect(fX, fY, fFW, fFH);
                            ctx.globalCompositeOperation = 'screen';
                            ctx.globalAlpha = 0.6;
                            ctx.fillStyle = clip.properties.duotoneColor2 || '#f43f5e';
                            ctx.fillRect(fX, fY, fFW, fFH);
                        }
                    }
                    ctx.restore();
                }

                // ═══════════════════════════════════════════════════════
                // Phase 30 — 🌐 LUT Color Grade Simulation (CSS filter)
                // ═══════════════════════════════════════════════════════
                if (clip.properties?.lutEnabled) {
                    const lutName = clip.properties.lutName || 'Rec709';
                    const lutStr  = clip.properties.lutStrength !== undefined ? clip.properties.lutStrength / 100 : 1;
                    const vt30 = this.currentTime - clip.start;
                    const { posX: lPX, posY: lPY, scale: lSc } = this.getClipTransform(clip, vt30);
                    const { drawW: lW, drawH: lH } = this.getClipDrawRect(clip, w, h);
                    const lFW = lW * (lSc||1); const lFH = lH * (lSc||1);
                    const lX  = (w/2 + lPX) - lFW/2;
                    const lY  = (h/2 + lPY) - lFH/2;

                    // Build CSS filter chain per LUT
                    let filterStr = '';
                    if (lutName === 'Rec709')  filterStr = `contrast(${1+0.12*lutStr}) saturate(${1-0.08*lutStr}) brightness(${1+0.05*lutStr})`;
                    else if (lutName === 'Log') filterStr = `contrast(${1-0.25*lutStr}) brightness(${1+0.15*lutStr}) saturate(${1-0.1*lutStr})`;
                    else if (lutName === 'ACES') filterStr = `contrast(${1+0.18*lutStr}) saturate(${1+0.05*lutStr}) brightness(${1-0.03*lutStr})`;
                    else if (lutName === 'Flat') filterStr = `contrast(${1-0.35*lutStr}) brightness(${1+0.2*lutStr}) saturate(${1-0.2*lutStr})`;

                    if (filterStr) {
                        ctx.save();
                        ctx.globalAlpha = lutStr * 0.6; // blend on top
                        ctx.filter = filterStr;
                        ctx.globalCompositeOperation = 'source-atop';
                        ctx.drawImage(glCanvas, lX, lY, lFW, lFH, lX, lY, lFW, lFH);
                        ctx.filter = 'none';
                        ctx.globalCompositeOperation = 'source-over';
                        ctx.restore();
                    }
                }
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
    // ✅ P1-OPT2 reuse: allNonMutedTracks already computed at top of frame
    for (let i = allNonMutedTracks.length - 1; i >= 0; i--) {
        const track = allNonMutedTracks[i];
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
                    ctx.globalAlpha *= animProgress;
                    ctx.translate(w / 2, h / 2);
                    ctx.scale(Math.max(0.01, scaleFactor), Math.max(0.01, scaleFactor));
                    ctx.translate(-w / 2, -h / 2);
                }
                else if (animType === 'pop') {
                    let scaleFactor = 1;
                    if (animMode === 'in') {
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

            // ═══════════════════════════════════════════════════════
            // Phase 28 — 🔤 TEXT: Entry/Exit Animations from textStyle.entryAnim
            // ═══════════════════════════════════════════════════════
            if (clip.textStyle?.entryAnim || clip.textStyle?.exitAnim) {
                const tsAnimDur = clip.textStyle.animDuration || 1.0;
                const tsTimeIn  = this.currentTime - clip.start;
                const tsTimeOut = clip.end - this.currentTime;
                let tsP = 1;
                let tsType = 'none';

                if (tsTimeIn < tsAnimDur && clip.textStyle.entryAnim && clip.textStyle.entryAnim !== 'None') {
                    tsP = Math.max(0, Math.min(1, tsTimeIn / tsAnimDur));
                    tsType = clip.textStyle.entryAnim;
                } else if (tsTimeOut < tsAnimDur && clip.textStyle.exitAnim && clip.textStyle.exitAnim !== 'None') {
                    tsP = Math.max(0, Math.min(1, tsTimeOut / tsAnimDur));
                    tsType = clip.textStyle.exitAnim;
                }

                // Ease in/out cubic
                const easeP = tsP < 0.5 ? 4*tsP*tsP*tsP : 1 - Math.pow(-2*tsP+2,3)/2;

                if (tsType === 'Fade' || tsType === 'Fade Out') {
                    ctx.globalAlpha *= easeP;
                } else if (tsType === 'Slide Up') {
                    ctx.translate(0, (1 - easeP) * h * 0.25);
                } else if (tsType === 'Slide Down') {
                    ctx.translate(0, -(1 - easeP) * h * 0.25);
                } else if (tsType === 'Slide Out') {
                    ctx.translate(0, (1 - easeP) * h * 0.25);
                    ctx.globalAlpha *= easeP;
                } else if (tsType === 'Typewriter') {
                    ctx.beginPath();
                    ctx.rect(0, 0, w * easeP, h);
                    ctx.clip();
                } else if (tsType === 'Bounce') {
                    // Ease out bounce
                    let bScale = 1;
                    if (tsP < 1) {
                        const t = 1 - tsP;
                        const bounceFn = (x) => {
                            const n1 = 7.5625, d1 = 2.75;
                            if (x < 1/d1) return n1*x*x;
                            else if (x < 2/d1) { x -= 1.5/d1; return n1*x*x+0.75; }
                            else if (x < 2.5/d1) { x -= 2.25/d1; return n1*x*x+0.9375; }
                            else { x -= 2.625/d1; return n1*x*x+0.984375; }
                        };
                        bScale = bounceFn(tsP);
                    }
                    ctx.translate(w/2, h/2);
                    ctx.scale(Math.max(0.01, bScale), Math.max(0.01, bScale));
                    ctx.translate(-w/2, -h/2);
                } else if (tsType === 'Glitch') {
                    // Glitch: random horizontal jitter + color channel shift
                    const glitchAmt = (1 - easeP) * 30;
                    ctx.translate((Math.random() - 0.5) * glitchAmt, (Math.random() - 0.5) * glitchAmt * 0.3);
                    ctx.globalAlpha *= (0.7 + Math.random() * 0.3);
                } else if (tsType === 'Scale Up') {
                    ctx.translate(w/2, h/2);
                    ctx.scale(Math.max(0.01, easeP), Math.max(0.01, easeP));
                    ctx.translate(-w/2, -h/2);
                } else if (tsType === 'Shrink') {
                    ctx.translate(w/2, h/2);
                    ctx.scale(Math.max(0.01, easeP), Math.max(0.01, easeP));
                    ctx.translate(-w/2, -h/2);
                } else if (tsType === 'Blur Out') {
                    ctx.filter = `blur(${(1 - easeP) * 12}px)`;
                    ctx.globalAlpha *= easeP;
                }
            }

            if (clip.textStyle?.isCountdown) {
                const timeLeft = Math.max(0, Math.ceil(clip.duration - (this.currentTime - clip.start)));
                clip.text = timeLeft.toString();
            }

            // Karaoke effect
            if (clip.textStyle?.isKaraoke && clip.text) {
                const words = clip.text.split(' ');
                const progress = (this.currentTime - clip.start) / clip.duration;
                const currentWordIndex = Math.floor(progress * words.length);
                clip.textStyle.activeWordIndex = currentWordIndex;
            }

            if (clip.properties?.knockoutMask) {
                // Phase 59: Knockout Text Mask. 
                // By drawing text with 'destination-in', all existing pixels (like the video drawn before) 
                // are ONLY kept where the text is opaque. It clips the video to the text shape!
                ctx.globalCompositeOperation = 'destination-in';
            }

            drawAdvancedText(ctx, clip, w, h);
            
            if (clip.properties?.knockoutMask) {
                ctx.globalCompositeOperation = 'source-over'; // Reset
            }

            ctx.restore();
        }
    }

    // ═══════════════════════════════════════════════════════
    // Phase 21 — 🎵 AUDIO: Waveform HUD Overlay
    // ═══════════════════════════════════════════════════════
    // Draw animated waveform when an audio clip is active with EQ properties set
    for (let i = 0; i < allNonMutedTracks.length; i++) {
        const track = allNonMutedTracks[i];
        const clips = track.getClipsAtTime(this.currentTime);
        if (clips.length === 0) continue;
        const clip = clips[0];
        if (clip.type !== 'audio') continue;
        if (!clip.properties?.waveformVisible && !(clip.properties?.eqSub || clip.properties?.eqBass || clip.properties?.eqMid)) continue;

        const eqBass = (clip.properties?.eqBass || 0) / 12;  // -1 to +1
        const eqMid  = (clip.properties?.eqMid  || 0) / 12;
        const eqHigh = (clip.properties?.eqHigh || 0) / 12;
        const reverbWet = (clip.properties?.reverbWet || 0) / 100;
        const barCount = 48;
        const barW = w * 0.6 / barCount;
        const startXw = w * 0.2;
        const centerYw = h * 0.88;
        const t = this.currentTime * 8;

        ctx.save();
        ctx.globalAlpha = 0.75 - reverbWet * 0.3;
        for (let bi = 0; bi < barCount; bi++) {
            const freq = bi / barCount; // 0 = bass, 1 = high
            // Weighted amplitude by EQ band
            const bassW  = Math.max(0, 1 - freq * 3);
            const midW   = Math.max(0, 1 - Math.abs(freq - 0.4) * 3);
            const highW  = Math.max(0, (freq - 0.6) * 2.5);
            const eqAmp  = 1 + bassW * eqBass * 0.6 + midW * eqMid * 0.5 + highW * eqHigh * 0.4;
            const rawH   = Math.abs(Math.sin(t + bi * 0.38) * Math.cos(t * 0.4 - bi * 0.15)) * 40 + 4;
            const barH   = rawH * Math.max(0.2, eqAmp);
            const hue    = 180 + freq * 120; // cyan → magenta
            ctx.fillStyle = `hsl(${hue}, 85%, 65%)`;
            ctx.fillRect(startXw + bi * (barW + 1.5), centerYw - barH, barW, barH);
        }
        ctx.restore();
    }

    // 3.3 Render Shape Clips
    // ─────────────────────────────────────────────────────────────
    // ✅ P1-OPT3: Ken Burns now pre-applied BEFORE WebGL (see top of function)
    // ✅ P1-OPT2 reuse: allNonMutedTracks already computed at top of frame
    for (let i = allNonMutedTracks.length - 1; i >= 0; i--) {
        const track = allNonMutedTracks[i];
        const clips = track.getClipsAtTime(this.currentTime);
        if (clips.length === 0) continue;
        const clip = clips[0];

        // ── Shape clips: render directly on 2D canvas ──
        if (clip.type !== 'shape') continue;
        const props = clip.properties || {};
        const shapeW = ((props.widthPct  || 50) / 100) * w;
        const shapeH = ((props.heightPct || 30) / 100) * h;
        const cx = (w / 2) + ((props.x || props.positionX || 0) / 100) * w;
        const cy = (h / 2) + ((props.y || props.positionY || 0) / 100) * h;
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
        } else if (shapeType === 'progress_bar') {
            // Background bar
            ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
            ctx.fillRect(-shapeW / 2, -shapeH / 2, shapeW, shapeH);
            
            // Foreground bar based on progress
            const progress = Math.max(0, Math.min(1, (this.currentTime - clip.start) / clip.duration));
            ctx.fillStyle = colorStr;
            ctx.fillRect(-shapeW / 2, -shapeH / 2, shapeW * progress, shapeH);
        } else if (shapeType === 'waveform') {
            // Fake audio waveform that changes every frame based on currentTime
            const barCount = 40;
            const barWidth = (w * 0.6) / barCount;
            const startX = -(w * 0.3);
            const yPos = (h * 0.3); // Lower half
            
            ctx.fillStyle = props.shapeColor || '#00FFFF';
            for (let i = 0; i < barCount; i++) {
                // Generate pseudo-random height based on time and index
                const t = this.currentTime * 10;
                let hgt = Math.sin(t + i) * Math.cos(t * 0.5 - i * 0.2) * 50;
                hgt = Math.abs(hgt) + 5; // min height
                
                // Add a visual 'beat' every second
                if (Math.floor(t) % 10 === 0) hgt *= 1.5;
                
                ctx.fillRect(startX + (i * barWidth * 1.5), yPos - hgt/2, barWidth, hgt);
            }
        }
        ctx.restore();
    }

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
    const storeOpts = window.useEditorStore ? window.useEditorStore.getState() : {};
    
    // ═══════════════════════════════════════════════════════
    // Phase 39 — 📐 Rule of Thirds & Grid
    // ═══════════════════════════════════════════════════════
    if (storeOpts.showRuleOfThirds || this.showRuleOfThirds) {
        ctx.save();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        // Verticals
        ctx.moveTo(w / 3, 0); ctx.lineTo(w / 3, h);
        ctx.moveTo((w / 3) * 2, 0); ctx.lineTo((w / 3) * 2, h);
        // Horizontals
        ctx.moveTo(0, h / 3); ctx.lineTo(w, h / 3);
        ctx.moveTo(0, (h / 3) * 2); ctx.lineTo(w, (h / 3) * 2);
        ctx.stroke();
        // Center Crosshair
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
        ctx.beginPath();
        ctx.moveTo(w / 2 - 10, h / 2); ctx.lineTo(w / 2 + 10, h / 2);
        ctx.moveTo(w / 2, h / 2 - 10); ctx.lineTo(w / 2, h / 2 + 10);
        ctx.stroke();
        ctx.restore();
    }

    // ═══════════════════════════════════════════════════════
    // Phase 35 — 📱 Social Media Safe Zones
    // ═══════════════════════════════════════════════════════
    if (storeOpts.showSafeZones || this.showSafeZones) {
        ctx.save();
        ctx.strokeStyle = 'rgba(239, 68, 68, 0.6)'; // Red-ish
        ctx.lineWidth = 1.5;
        ctx.setLineDash([5, 5]);
        // TikTok/Reels common safe area (approx 15% top, 20% bottom, 10% sides)
        const sX = w * 0.1; const sY = h * 0.15;
        const sW = w * 0.8; const sH = h * 0.65;
        ctx.strokeRect(sX, sY, sW, sH);
        ctx.fillStyle = 'rgba(239, 68, 68, 0.8)';
        ctx.font = '12px sans-serif';
        ctx.fillText('TikTok/Reels Safe Zone', sX + 5, sY + 15);
        ctx.restore();
    }

    // ═══════════════════════════════════════════════════════
    // Phase 31 — 🧲 Smart Snapping Guides
    // ═══════════════════════════════════════════════════════
    if (this.isDragging) {
        ctx.save();
        ctx.strokeStyle = '#00ffff'; 
        ctx.lineWidth = 1.5; 
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        if (this.snappedX) {
            // Either snapped to center or edges. For simplicity, we just draw a center line
            // but ideally we'd draw it at the specific edge. We'll use center as the main indicator.
            const drawAtX = this.snappedEdgeX === 'left' ? 0 : (this.snappedEdgeX === 'right' ? w : w / 2);
            ctx.moveTo(drawAtX, 0); ctx.lineTo(drawAtX, h);
        }
        if (this.snappedY) {
            const drawAtY = this.snappedEdgeY === 'top' ? 0 : (this.snappedEdgeY === 'bottom' ? h : h / 2);
            ctx.moveTo(0, drawAtY); ctx.lineTo(w, drawAtY);
        }
        ctx.stroke(); 
        ctx.restore();
    }

    // ═══════════════════════════════════════════════════════
    // Phase 37 — ⏯️ Canvas Playhead Mini-Bar
    // ═══════════════════════════════════════════════════════
    if (this.isPlaying && this.duration > 0) {
        ctx.save();
        const progress = this.currentTime / this.duration;
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(0, h - 4, w, 4);
        ctx.fillStyle = '#3b82f6';
        ctx.fillRect(0, h - 4, w * progress, 4);
        ctx.restore();
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
                
                // ═══════════════════════════════════════════════════════
                // Phase 29 — 🌐 UNIVERSAL: Clip Type Badge HUD
                // ═══════════════════════════════════════════════════════
                ctx.save();
                const timeInClip = this.currentTime - clip.start;
                const { posX, posY } = this.getClipTransform(clip, timeInClip);
                const { drawW, drawH } = this.getClipDrawRect(clip, w, h);
                const badgeX = (w / 2 + posX) - drawW / 2;
                const badgeY = (h / 2 + posY) - drawH / 2 - 24; // Above the bounding box

                let badgeColor = '#64748b'; // default slate
                let badgeIcon = '📄';
                let badgeText = clip.type.toUpperCase();

                if (clip.type === 'audio') { badgeColor = '#06b6d4'; badgeIcon = '🎵'; }
                else if (clip.type === 'video') { badgeColor = '#6366f1'; badgeIcon = '🎬'; }
                else if (clip.type === 'image') { badgeColor = '#10b981'; badgeIcon = '🖼️'; }
                else if (clip.type === 'text') { badgeColor = '#d946ef'; badgeIcon = '🔤'; }
                else if (clip.type === 'shape') { badgeColor = '#f59e0b'; badgeIcon = '🔺'; }

                ctx.fillStyle = badgeColor;
                ctx.beginPath();
                ctx.roundRect(badgeX, badgeY, 80, 20, 4);
                ctx.fill();

                ctx.fillStyle = '#ffffff';
                ctx.font = 'bold 10px sans-serif';
                ctx.textAlign = 'left';
                ctx.textBaseline = 'middle';
                ctx.fillText(`${badgeIcon} ${badgeText}`, badgeX + 6, badgeY + 10);
                ctx.restore();
                
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
