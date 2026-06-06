// @ts-nocheck
// ultra-frame-overlay.ts — Social media frame overlay UI (TikTok/YouTube/Instagram) + fitMediaToFrame

window.EditorApp.prototype.renderFrameOverlayUI = function(ctx, renderJobs, w, h) {
    renderJobs.forEach(job => {
        const processClip = (clip, opacityMult) => {
            if (!clip || !clip.src || !clip.properties || !clip.src.includes('frame_') || !clip.properties.overlayUI || clip.properties.overlayUI === 'none') return;
            
            const sourceEl = this.getSourceElement(clip);
            let srcW = sourceEl ? (sourceEl.naturalWidth || sourceEl.videoWidth || w) : w;
            let srcH = sourceEl ? (sourceEl.naturalHeight || sourceEl.videoHeight || h) : h;
            
            if (clip.src.includes('frame_laptop')) { srcW = 1600; srcH = 1200; }
            else if (clip.src.includes('frame_monitor')) { srcW = 1920; srcH = 1400; }
            else if (clip.src.includes('frame_tv')) { srcW = 2000; srcH = 1200; }
            else if (clip.src.includes('frame_tablet')) { srcW = 1200; srcH = 1600; }
            else if (clip.src.includes('frame_phone')) { srcW = 800; srcH = 1600; }
            
            const coverRatio = Math.max(w / srcW, h / srcH);
            const userScale = (clip.properties.scale || 100) / 100;
            const outerW = srcW * coverRatio * userScale * ((clip.properties.scaleX !== undefined ? clip.properties.scaleX : 100) / 100);
            const outerH = srcH * coverRatio * userScale * ((clip.properties.scaleY !== undefined ? clip.properties.scaleY : 100) / 100);
            
            let wRatio = 1, hRatio = 1;
            if (clip.src.includes('frame_phone')) { wRatio = 650/800; hRatio = 1450/1600; }
            else if (clip.src.includes('frame_real_ipad')) { wRatio = 765/840; hRatio = 559/634; }
            else if (clip.src.includes('frame_real_iphone')) { wRatio = 321/365; hRatio = 689/730; }
            else if (clip.src.includes('frame_real_laptop')) { wRatio = 731/942; hRatio = 454/766; }
            else if (clip.src.includes('frame_real_monitor')) { wRatio = 799/840; hRatio = 458/680; }
            else if (clip.src.includes('frame_real_samsung')) { wRatio = 375/427; hRatio = 812/868; }
            else if (clip.src.includes('frame_real_ui_instagram')) { wRatio = 395/462; hRatio = 850/913; }
            else if (clip.src.includes('frame_real_ui_tiktok')) { wRatio = 350/427; hRatio = 750/818; }
            else if (clip.src.includes('frame_real_ui_youtube')) { wRatio = 787/842; hRatio = 381/430; }
            else if (clip.src.includes('frame_laptop')) { wRatio = 1240/1600; hRatio = 780/1200; }
            else if (clip.src.includes('frame_monitor')) { wRatio = 1640/1920; hRatio = 880/1400; }
            else if (clip.src.includes('frame_tv')) { wRatio = 1860/2000; hRatio = 960/1200; }
            else if (clip.src.includes('frame_tablet')) { wRatio = 840/1200; hRatio = 1240/1600; }
            
            let innerScaleX = clip.properties.innerScaleX !== undefined ? parseFloat(clip.properties.innerScaleX) : 100;
            let innerScaleY = clip.properties.innerScaleY !== undefined ? parseFloat(clip.properties.innerScaleY) : 100;
            
            if (clip.properties.innerFitMode === 'tight') {
                innerScaleX *= 0.95;
                innerScaleY *= 0.95;
            }

            const holeW = outerW * wRatio * (innerScaleX / 100);
            const holeH = outerH * hRatio * (innerScaleY / 100);
            
            let dxFrac = 0; let dyFrac = 0;
            if (clip.src.includes('frame_real_ipad')) { dxFrac = -0.5 / 840; dyFrac = -0.5 / 634; }
            else if (clip.src.includes('frame_real_iphone')) { dxFrac = 0.0 / 365; dyFrac = -0.5 / 730; }
            else if (clip.src.includes('frame_real_laptop')) { dxFrac = -0.5 / 942; dyFrac = -114.0 / 766; }
            else if (clip.src.includes('frame_real_monitor')) { dxFrac = -0.5 / 840; dyFrac = -88.0 / 680; }
            else if (clip.src.includes('frame_real_samsung')) { dxFrac = -3.0 / 427; dyFrac = -3.0 / 868; }
            else if (clip.src.includes('frame_real_ui_instagram')) { dxFrac = -0.5 / 462; dyFrac = -1.5 / 913; }
            else if (clip.src.includes('frame_real_ui_tiktok')) { dxFrac = -5.5 / 427; dyFrac = -4.0 / 818; }
            else if (clip.src.includes('frame_real_ui_youtube')) { dxFrac = -6.5 / 842; dyFrac = 1.5 / 430; }
            
            const shiftX = dxFrac * outerW;
            const shiftY = dyFrac * outerH;
            
            const cx = (w / 2) + (clip.properties.positionX || 0);
            const cy = (h / 2) + (clip.properties.positionY || 0);
            const rotation = (clip.properties.rotation || 0) * (Math.PI / 180);
            
            const opacity = ((clip.properties.opacity !== undefined ? clip.properties.opacity : 100) / 100) * opacityMult;
            
            ctx.save();
            ctx.globalAlpha = opacity;
            ctx.translate(cx, cy);
            ctx.rotate(rotation);
            ctx.translate(shiftX, shiftY);
            
            const left = -holeW / 2;
            const right = holeW / 2;
            const top = -holeH / 2;
            const bottom = holeH / 2;
            
            ctx.beginPath();
            let br = clip.properties.innerBorderRadius !== undefined ? parseFloat(clip.properties.innerBorderRadius) : (clip.src.includes('frame_real') ? 0.06 : 0.0);
            if (clip.properties.innerFitMode === 'smart') {
                br = 0.15;
            }
            const r = br * Math.min(holeW, holeH);
            if (ctx.roundRect && r > 0) {
                ctx.roundRect(left, top, holeW, holeH, r);
            } else {
                ctx.rect(left, top, holeW, holeH);
            }
            ctx.clip();
            
            const uiType = clip.properties.overlayUI;
            const scaleBase = Math.min(holeW, holeH) / 400; 
            
            const drawText = (text, x, y, size, align, isBold) => {
                ctx.font = `${isBold ? 'bold' : 'normal'} ${size}px "Segoe UI", sans-serif`;
                ctx.textAlign = align;
                ctx.textBaseline = 'middle';
                ctx.fillStyle = 'white';
                ctx.shadowColor = 'rgba(0,0,0,0.8)';
                ctx.shadowBlur = 8;
                ctx.shadowOffsetX = 1;
                ctx.shadowOffsetY = 1;
                ctx.fillText(text, x, y);
                ctx.shadowColor = 'transparent';
            };
            
            const drawIcon = (unicode, x, y, size, isBrand) => {
                ctx.font = `900 ${size}px "Font Awesome 6 Free"`; 
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillStyle = 'white';
                ctx.shadowColor = 'rgba(0,0,0,0.8)';
                ctx.shadowBlur = 10;
                ctx.shadowOffsetX = 1;
                ctx.shadowOffsetY = 1;
                ctx.fillText(unicode, x, y);
                ctx.shadowColor = 'transparent';
            };
            
            if (uiType === 'tiktok') {
                const iconSize = 35 * scaleBase;
                const textSize = 14 * scaleBase;
                const iconX = right - (30 * scaleBase);
                
                drawIcon('\uf2bd', iconX, bottom - (260 * scaleBase), iconSize + 5, false); // User
                drawIcon('\uf004', iconX, bottom - (190 * scaleBase), iconSize, false); // Heart
                drawText(clip.properties.uiLikes || '1.2M', iconX, bottom - (160 * scaleBase), textSize, 'center', true);
                drawIcon('\uf075', iconX, bottom - (120 * scaleBase), iconSize - 5, false); // Comment
                drawText(clip.properties.uiComments || '45K', iconX, bottom - (90 * scaleBase), textSize, 'center', true);
                drawIcon('\uf02e', iconX, bottom - (50 * scaleBase), iconSize - 5, false); // Bookmark
                drawText(clip.properties.uiShares || '12K', iconX, bottom - (20 * scaleBase), textSize, 'center', true);
                drawIcon('\uf1d8', iconX, bottom + (20 * scaleBase), iconSize - 5, false); // Share 
                
                const descX = left + (20 * scaleBase);
                drawText(clip.properties.uiUsername || '@username', descX, bottom - (50 * scaleBase), textSize + 2, 'left', true);
                drawText(clip.properties.uiDescription || 'Check out this awesome video! #viral', descX, bottom - (25 * scaleBase), textSize, 'left', false);
            }
            else if (uiType === 'instagram') {
                const iconSize = 30 * scaleBase;
                const textSize = 14 * scaleBase;
                const iconX = right - (30 * scaleBase);
                
                drawIcon('\uf004', iconX, bottom - (170 * scaleBase), iconSize, false);
                drawText(clip.properties.uiLikes || '1.2M', iconX, bottom - (145 * scaleBase), textSize, 'center', true);
                drawIcon('\uf075', iconX, bottom - (110 * scaleBase), iconSize, false);
                drawText(clip.properties.uiComments || '45K', iconX, bottom - (85 * scaleBase), textSize, 'center', true);
                drawIcon('\uf1d8', iconX, bottom - (50 * scaleBase), iconSize, false);
                drawText(clip.properties.uiShares || '12K', iconX, bottom - (25 * scaleBase), textSize, 'center', true);
                drawIcon('\uf141', iconX, bottom + (10 * scaleBase), iconSize * 0.7, false);
                
                const descX = left + (20 * scaleBase);
                drawIcon('\uf2bd', descX + 15*scaleBase, bottom - (50 * scaleBase), 30*scaleBase, false); 
                drawText(clip.properties.uiUsername || '@username', descX + 40*scaleBase, bottom - (50 * scaleBase), textSize + 2, 'left', true);
                drawText(clip.properties.uiDescription || 'Check out this awesome video! #viral', descX, bottom - (20 * scaleBase), textSize, 'left', false);
            }
            else if (uiType === 'youtube') {
                const iconSize = 25 * scaleBase;
                const textSize = 14 * scaleBase;
                const rightX = right - (20 * scaleBase);
                const leftX = left + (20 * scaleBase);
                
                ctx.fillStyle = 'rgba(255,255,255,0.3)';
                ctx.fillRect(left, bottom - (10 * scaleBase), holeW, 4 * scaleBase);
                ctx.fillStyle = '#cc0000';
                ctx.fillRect(left, bottom - (10 * scaleBase), holeW * 0.3, 4 * scaleBase);
                
                drawIcon('\uf04b', leftX + 10*scaleBase, bottom - (30 * scaleBase), iconSize*0.8, false); 
                
                drawIcon('\uf004', rightX - 140*scaleBase, bottom - (30 * scaleBase), iconSize, false);
                drawText(clip.properties.uiLikes || '1.2M', rightX - 110*scaleBase, bottom - (30 * scaleBase), textSize, 'left', true);
                drawIcon('\uf075', rightX - 60*scaleBase, bottom - (30 * scaleBase), iconSize, false);
                
                ctx.fillStyle = '#cc0000';
                ctx.beginPath();
                if(ctx.roundRect) {
                    ctx.roundRect(rightX - 250*scaleBase, bottom - (45*scaleBase), 90*scaleBase, 30*scaleBase, 15*scaleBase);
                } else {
                    ctx.rect(rightX - 250*scaleBase, bottom - (45*scaleBase), 90*scaleBase, 30*scaleBase);
                }
                ctx.fill();
                drawText('SUBSCRIBE', rightX - 205*scaleBase, bottom - (30*scaleBase), textSize*0.8, 'center', true);
                
                drawText(clip.properties.uiUsername || 'Channel Name', leftX, bottom - (70 * scaleBase), textSize + 2, 'left', true);
                drawText(clip.properties.uiDescription || '1.5M Subscribers', leftX, bottom - (50 * scaleBase), textSize, 'left', false);
            }
            
            ctx.restore();
        };

        if (job.type === 'single') {
            processClip(job.clip, 1.0);
        } else if (job.type === 'transition') {
            processClip(job.clipA, 1.0 - job.progress);
            processClip(job.clipB, job.progress);
        }
    });
};

window.EditorApp.prototype.fitMediaToFrame = function(frameClipId, mode) {
    const frameClip = this.findClipById(frameClipId);
    if (!frameClip) return;
    
    // CLEANUP BAD STATE
    if (frameClip.properties.uvScaleX !== undefined) delete frameClip.properties.uvScaleX;
    if (frameClip.properties.uvScaleY !== undefined) delete frameClip.properties.uvScaleY;
    
    const sourceEl = this.getSourceElement(frameClip);
    const canvasW = this.canvas ? this.canvas.width : 1920;
    const canvasH = this.canvas ? this.canvas.height : 1080;
    
    let srcW = sourceEl ? (sourceEl.naturalWidth || canvasW) : 800;
    let srcH = sourceEl ? (sourceEl.naturalHeight || canvasH) : 1600;
    
    if (!frameClip.src) return;
    if (frameClip.src.includes('frame_laptop')) { srcW = 1600; srcH = 1200; }
    else if (frameClip.src.includes('frame_monitor')) { srcW = 1920; srcH = 1400; }
    else if (frameClip.src.includes('frame_tv')) { srcW = 2000; srcH = 1200; }
    else if (frameClip.src.includes('frame_tablet')) { srcW = 1200; srcH = 1600; }
    else if (frameClip.src.includes('frame_phone')) { srcW = 800; srcH = 1600; }

    const coverRatio = Math.max(canvasW / srcW, canvasH / srcH);
    const frameBaseW = srcW * coverRatio;
    const frameBaseH = srcH * coverRatio;
    
    let wRatio = 1, hRatio = 1;
    if (frameClip.src.includes('frame_phone')) { wRatio = 650/800; hRatio = 1450/1600; }
    else if (frameClip.src.includes('frame_real_ipad')) { wRatio = 766/840; hRatio = 560/634; }
    else if (frameClip.src.includes('frame_real_iphone')) { wRatio = 322/365; hRatio = 690/730; }
    else if (frameClip.src.includes('frame_real_laptop')) { wRatio = 732/942; hRatio = 455/766; }
    else if (frameClip.src.includes('frame_real_monitor')) { wRatio = 800/840; hRatio = 459/680; }
    else if (frameClip.src.includes('frame_real_samsung')) { wRatio = 376/427; hRatio = 813/868; }
    else if (frameClip.src.includes('frame_real_ui_instagram')) { wRatio = 396/462; hRatio = 851/913; }
    else if (frameClip.src.includes('frame_real_ui_tiktok')) { wRatio = 351/427; hRatio = 751/818; }
    else if (frameClip.src.includes('frame_real_ui_youtube')) { wRatio = 788/842; hRatio = 382/430; }
    else if (frameClip.src.includes('frame_laptop')) { wRatio = 1240/1600; hRatio = 780/1200; }
    else if (frameClip.src.includes('frame_monitor')) { wRatio = 1640/1920; hRatio = 880/1400; }
    else if (frameClip.src.includes('frame_tv')) { wRatio = 1860/2000; hRatio = 960/1200; }
    else if (frameClip.src.includes('frame_tablet')) { wRatio = 840/1200; hRatio = 1240/1600; }
    
    const holeW = frameBaseW * wRatio;
    const holeH = frameBaseH * hRatio;
    
    frameClip.properties.innerScaleX = 100;
    frameClip.properties.innerScaleY = 100;
    frameClip.properties.innerOffsetX = 0;
    frameClip.properties.innerOffsetY = 0;
    
    // Geometry is ALWAYS the exact size of the hole now
    frameClip.properties.innerForcedWidth = holeW;
    frameClip.properties.innerForcedHeight = holeH;
    
    if (mode === 'fill') {
        frameClip.properties.innerUvScaleX = 1.0;
        frameClip.properties.innerUvScaleY = 1.0;
        frameClip.properties.innerMode = 'fill';
    } else if (mode === 'crop' || mode === 'fit') {
        frameClip.properties.innerMode = mode;
        const innerMockClip = { id: frameClip.id + '_inner', type: frameClip.properties.innerMediaType, src: frameClip.properties.innerMediaSrc };
        const innerSourceEl = this.getSourceElement(innerMockClip);
        let mediaW = innerSourceEl ? (innerSourceEl.videoWidth || innerSourceEl.naturalWidth || canvasW) : canvasW;
        let mediaH = innerSourceEl ? (innerSourceEl.videoHeight || innerSourceEl.naturalHeight || canvasH) : canvasH;
        
        if (mediaW === 0 || mediaH === 0) { mediaW = 1920; mediaH = 1080; }
        
        const rot = frameClip.properties.innerRotation || 0;
        let origMediaW = mediaW;
        let origMediaH = mediaH;
        let effMediaW = mediaW;
        let effMediaH = mediaH;
        if (rot === 90 || rot === 270) {
            effMediaW = mediaH;
            effMediaH = mediaW;
        }
        
        let mediaFitRatio = 1;
        if (mode === 'crop') mediaFitRatio = Math.max(holeW / effMediaW, holeH / effMediaH);
        else mediaFitRatio = Math.min(holeW / effMediaW, holeH / effMediaH); // For fit mode
        
        if (rot === 90 || rot === 270) {
            frameClip.properties.innerUvScaleX = (holeH / mediaFitRatio) / origMediaW;
            frameClip.properties.innerUvScaleY = (holeW / mediaFitRatio) / origMediaH;
        } else {
            frameClip.properties.innerUvScaleX = (holeW / mediaFitRatio) / origMediaW;
            frameClip.properties.innerUvScaleY = (holeH / mediaFitRatio) / origMediaH;
        }
    }
    
    this.commitStateToReact();
    this.requestRedraw();
};

