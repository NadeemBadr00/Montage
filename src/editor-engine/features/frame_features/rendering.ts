// @ts-nocheck
export const injectFrameRendering = () => {
    window.EditorApp.prototype.applyFrameClip = function(ctx: any, clip: any, w: number, h: number) {
        const type = clip.frame.type;
        const thickness = clip.frame.thickness || 25;
        const halfW = w / 2;
        const halfH = h / 2;
        ctx.beginPath();

        if (type === 'phone') {
            const cornerRadius = Math.min(w, h) * 0.14;
            if (ctx.roundRect) ctx.roundRect(-halfW - thickness, -halfH - thickness, w + (thickness*2), h + (thickness*2), cornerRadius + 5);
            else ctx.rect(-halfW - thickness, -halfH - thickness, w + (thickness*2), h + (thickness*2));
            ctx.clip();
        }
    };

    const originalDrawClipContentWithFrameDraw = window.EditorApp.prototype.drawClipContent;

    window.EditorApp.prototype.drawClipContent = function(ctx: any, clip: any, track: any, w: number, h: number) {
        const hasFrame = clip.frame && clip.frame.type !== 'none';

        if (hasFrame) {
            ctx.save();
            
            const centerX = w / 2;
            const centerY = h / 2;
            const posX = clip.properties.positionX || 0;
            const posY = clip.properties.positionY || 0;
            const rot = clip.properties.rotation || 0;
            const scale = (clip.properties.scale || 100) / 100;

            ctx.translate(centerX + posX, centerY + posY);
            ctx.rotate((rot * Math.PI) / 180);
            ctx.scale(scale, scale);

            if (clip.frame.type === 'film') {
                this.drawFilmStrip(ctx, clip, w, h);
            } else if (clip.frame.type === 'polaroid') {
                this.drawPolaroidStack(ctx, clip, w, h);
            } else if (clip.frame.type === 'phone') {
                if (clip.frame.assets && clip.frame.assets.length > 0) {
                    this.drawPhoneSlideshow(ctx, clip, w, h);
                } else {
                    this.applyFrameClip(ctx, clip, w, h);
                    ctx.scale(1/scale, 1/scale);
                    ctx.rotate(-(rot * Math.PI) / 180);
                    ctx.translate(-(centerX + posX), -(centerY + posY));
                    originalDrawClipContentWithFrameDraw.call(this, ctx, clip, track, w, h);
                    ctx.restore(); 
                    ctx.save();
                    ctx.translate(centerX + posX, centerY + posY);
                    ctx.rotate((rot * Math.PI) / 180);
                    ctx.scale(scale, scale);
                    this.drawFrameOverlay(ctx, clip, w, h);
                }
            }
            
            ctx.restore();

        } else {
            originalDrawClipContentWithFrameDraw.call(this, ctx, clip, track, w, h);
        }
    };

    window.EditorApp.prototype.drawSlideshowContent = function(ctx: any, clip: any, w: number, h: number, contentList: any[]) {
        const totalCount = contentList.length;
        if (totalCount === 0) return;

        const clipDur = clip.duration || 10;
        const timeInClip = Math.max(0, window.app.currentTime - clip.start);
        
        let perImageDur = 3;
        
        if (clip.frame.durationMode === 'auto') {
            perImageDur = clipDur / totalCount;
        } else {
            perImageDur = clip.frame.slideDuration || 3;
        }
        
        let currentIndex = Math.floor(timeInClip / perImageDur) % totalCount;
        
        const timeInSlide = timeInClip % perImageDur;
        const progress = timeInSlide / perImageDur;
        
        const item = contentList[currentIndex];
        const nextItem = contentList[(currentIndex + 1) % totalCount];
        
        const transitionType = clip.frame.transition || 'zoom';

        const drawItem = (contentItem: any, opacity: number, scale: number, translateX: number) => {
            if (!contentItem) return;
            ctx.save();
            ctx.globalAlpha *= opacity;
            ctx.scale(scale, scale);
            ctx.translate(translateX, 0);

            if (contentItem === 'MAIN_VIDEO') {
                if (clip.type === 'video') {
                    const key = `visual_${clip.src}`;
                    const player = this.players.find((p: any) => p.getAttribute('data-key') === key);
                    if (player && player.readyState >= 2) ctx.drawImage(player, -w/2, -h/2, w, h);
                } else if (clip.type === 'image') {
                    const img = this.getImageFromCache(clip.src);
                    if (img.complete) ctx.drawImage(img, -w/2, -h/2, w, h);
                }
            } else if (contentItem._isVideoAsset) {
                // Video element added as a frame asset
                if (contentItem.readyState >= 2) {
                    try { ctx.drawImage(contentItem, -w/2, -h/2, w, h); } catch(e){}
                }
            } else {
                if (contentItem && contentItem.complete) {
                    try { ctx.drawImage(contentItem, -w/2, -h/2, w, h); } catch(e){}
                }
            }
            ctx.restore();
        };

        if (transitionType === 'zoom') {
            const scale = 1 + (progress * 0.1); 
            drawItem(item, 1, scale, 0);
            if (progress > 0.9) {
                const fadeProg = (progress - 0.9) / 0.1;
                drawItem(nextItem, fadeProg, 1, 0);
            }
        } else if (transitionType === 'fade') {
            drawItem(item, 1, 1, 0);
            const fadeStart = 0.8;
            if (progress > fadeStart) {
                const fadeProg = (progress - fadeStart) / (1 - fadeStart);
                drawItem(nextItem, fadeProg, 1, 0);
            }
        } else if (transitionType === 'slide') {
            const slideStart = 0.8;
            if (progress < slideStart) {
                drawItem(item, 1, 1, 0);
            } else {
                const slideProg = (progress - slideStart) / (1 - slideStart);
                const ease = slideProg < .5 ? 2 * slideProg * slideProg : -1 + (4 - 2 * slideProg) * slideProg;
                drawItem(item, 1, 1, -w * ease);
                drawItem(nextItem, 1, 1, w * (1 - ease));
            }
        } else {
            drawItem(item, 1, 1, 0);
        }
    };

    window.EditorApp.prototype.drawPhoneSlideshow = function(ctx: any, clip: any, w: number, h: number) {
        const thickness = clip.frame.thickness || 25;
        const cornerRadius = Math.min(w, h) * 0.14; 
        const halfW = w / 2;
        const halfH = h / 2;

        this.drawFrameOverlay(ctx, clip, w, h); 

        ctx.save();
        ctx.beginPath();
        if (ctx.roundRect) ctx.roundRect(-halfW, -halfH, w, h, cornerRadius - 5);
        else ctx.rect(-halfW, -halfH, w, h);
        ctx.clip(); 

        const contentList = ['MAIN_VIDEO', ...clip.frame.assets];
        this.drawSlideshowContent(ctx, clip, w, h, contentList);

        ctx.restore();

        this.drawFrameOverlay(ctx, clip, w, h);
    };

    window.EditorApp.prototype.drawPolaroidStack = function(ctx: any, clip: any, w: number, h: number) {
        const padding = clip.frame.thickness || 30;
        const bottomPadding = padding * 3.5;
        const bgColor = clip.frame.color || '#f8f8f8';
        
        const totalH = h + padding + bottomPadding;
        const totalW = w + padding * 2;
        
        ctx.save();
        ctx.shadowColor = 'rgba(0,0,0,0.3)';
        ctx.shadowBlur = 15;
        ctx.shadowOffsetY = 5;
        ctx.fillStyle = bgColor;
        ctx.fillRect(-totalW/2, -totalH/2, totalW, totalH);
        ctx.shadowColor = 'transparent';
        
        const imgCenterY = -totalH/2 + padding + h/2;
        ctx.translate(0, imgCenterY); 

        ctx.beginPath();
        ctx.rect(-w/2, -h/2, w, h);
        ctx.clip();

        const contentList = ['MAIN_VIDEO', ...clip.frame.assets];
        this.drawSlideshowContent(ctx, clip, w, h, contentList);

        ctx.restore();
    };

    window.EditorApp.prototype.drawFilmStrip = function(ctx: any, clip: any, w: number, h: number) {
        const color = clip.frame.color || '#151515';
        const thickness = clip.frame.thickness || 40;
        const orientation = clip.frame.orientation || 'vertical';
        const animSpeed = clip.frame.animSpeed || 50;
        const assets = clip.frame.assets || [];
        const contentList = ['MAIN_VIDEO', ...assets];
        const halfW = w / 2;
        const halfH = h / 2;
        const dividerH = thickness / 2;
        const unit = (orientation === 'vertical' ? (h + thickness) : (w + thickness));
        
        const timeInClip = Math.max(0, window.app.currentTime - clip.start);
        const scroll = (timeInClip * animSpeed * 5); 
        const baseIndex = Math.floor(scroll / unit);
        const buffer = 4;

        for (let i = baseIndex - buffer; i <= baseIndex + buffer; i++) {
            let contentIndex = i % contentList.length;
            if (contentIndex < 0) contentIndex += contentList.length;
            const item = contentList[contentIndex];
            const offset = (i * unit) - scroll;
            let dx = -halfW;
            let dy = -halfH;
            if (orientation === 'vertical') dy = -halfH + offset;
            else dx = -halfW + offset;

            if (item === 'MAIN_VIDEO') {
                if (clip.type === 'video') {
                    const key = `visual_${clip.src}`;
                    const player = this.players.find((p: any) => p.getAttribute('data-key') === key);
                    if (player && player.readyState >= 2) ctx.drawImage(player, dx, dy, w, h);
                } else if (clip.type === 'image') {
                    const img = this.getImageFromCache(clip.src);
                    if (img.complete) ctx.drawImage(img, dx, dy, w, h);
                }
            } else {
                if (item && item.complete) {
                    try { ctx.drawImage(item, dx, dy, w, h); } catch(e){}
                }
            }
        }

        let filmGradient;
        if (orientation === 'vertical') {
            filmGradient = ctx.createLinearGradient(-halfW - thickness, 0, halfW + thickness, 0);
        } else {
            filmGradient = ctx.createLinearGradient(0, -halfH - thickness, 0, halfH + thickness);
        }
        filmGradient.addColorStop(0, '#0a0a0a');
        filmGradient.addColorStop(0.2, '#2b2b2b'); 
        filmGradient.addColorStop(0.5, '#111111');
        filmGradient.addColorStop(0.8, '#2b2b2b');
        filmGradient.addColorStop(1, '#0a0a0a');

        ctx.fillStyle = filmGradient;
        ctx.beginPath();
        const extend = (buffer * unit); 
        
        if (orientation === 'vertical') {
            ctx.rect(-halfW - thickness, -halfH - extend, thickness, (h + extend*2));
            ctx.rect(halfW, -halfH - extend, thickness, (h + extend*2));
            for(let i = baseIndex - buffer; i <= baseIndex + buffer + 1; i++) {
                const y = -halfH + ((i * unit) - scroll) - dividerH;
                ctx.rect(-halfW - thickness, y, w + thickness*2, dividerH);
            }
        } else {
            ctx.rect(-halfW - extend, -halfH - thickness, (w + extend*2), thickness);
            ctx.rect(-halfW - extend, halfH, (w + extend*2), thickness);
            for(let i = baseIndex - buffer; i <= baseIndex + buffer + 1; i++) {
                const x = -halfW + ((i * unit) - scroll) - dividerH;
                ctx.rect(x, -halfH - thickness, dividerH, h + thickness*2);
            }
        }
        ctx.fill();

        ctx.globalCompositeOperation = 'destination-out';
        ctx.fillStyle = '#000';
        ctx.beginPath();
        const holeW = orientation === 'vertical' ? thickness * 0.5 : thickness * 0.65;
        const holeH = orientation === 'vertical' ? thickness * 0.65 : thickness * 0.5;
        const gap = Math.max(holeW, holeH) * 0.8;
        const spUnit = (orientation === 'vertical' ? holeH : holeW) + gap;
        const sprocketScroll = scroll % spUnit;
        const totalSpan = (buffer * 2 + 2) * unit;
        const countHoles = Math.ceil(totalSpan / spUnit);
        
        if (orientation === 'vertical') {
            const startY = -halfH - (buffer * unit);
            for(let i=0; i<countHoles; i++) {
                const y = startY + (i * spUnit) - sprocketScroll;
                if (ctx.roundRect) {
                    ctx.roundRect(-halfW - thickness/2 - holeW/2, y, holeW, holeH, 2);
                    ctx.roundRect(halfW + thickness/2 - holeW/2, y, holeW, holeH, 2);
                } else {
                    ctx.rect(-halfW - thickness/2 - holeW/2, y, holeW, holeH);
                    ctx.rect(halfW + thickness/2 - holeW/2, y, holeW, holeH);
                }
            }
        } else {
            const startX = -halfW - (buffer * unit);
            for(let i=0; i<countHoles; i++) {
                const x = startX + (i * spUnit) - sprocketScroll;
                if (ctx.roundRect) {
                    ctx.roundRect(x, -halfH - thickness/2 - holeH/2, holeW, holeH, 2);
                    ctx.roundRect(x, halfH + thickness/2 - holeH/2, holeW, holeH, 2);
                } else {
                    ctx.rect(x, -halfH - thickness/2 - holeH/2, holeW, holeH);
                    ctx.rect(x, halfH + thickness/2 - holeH/2, holeW, holeH);
                }
            }
        }
        ctx.fill();
        ctx.globalCompositeOperation = 'source-over';
    };

    window.EditorApp.prototype.drawFrameOverlay = function(ctx: any, clip: any, w: number, h: number) {
        const type = clip.frame.type;
        const color = clip.frame.color || '#363636';
        const thickness = clip.frame.thickness || 25;
        const halfW = w / 2;
        const halfH = h / 2;

        ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
        ctx.shadowBlur = 20;
        ctx.shadowOffsetX = 10;
        ctx.shadowOffsetY = 10;

        if (type === 'phone') {
            const cornerRadius = Math.min(w, h) * 0.14; 
            
            ctx.fillStyle = color;
            ctx.beginPath();
            if (ctx.roundRect) ctx.roundRect(-halfW - thickness, -halfH - thickness, w + (thickness*2), h + (thickness*2), cornerRadius + 5);
            else ctx.rect(-halfW - thickness, -halfH - thickness, w + (thickness*2), h + (thickness*2));
            
            if (ctx.roundRect) ctx.roundRect(-halfW, -halfH, w, h, cornerRadius - 5);
            else ctx.rect(-halfW, -halfH, w, h);
            
            ctx.fill('evenodd');
            ctx.shadowColor = 'transparent';

            ctx.fillStyle = color; 
            const btnW = thickness * 0.6;
            const btnH = h * 0.1;
            ctx.fillRect(halfW + thickness, -halfH + (h * 0.2), btnW, btnH); 
            ctx.fillRect(-halfW - thickness - btnW, -halfH + (h * 0.2), btnW, btnH * 0.8); 
            ctx.fillRect(-halfW - thickness - btnW, -halfH + (h * 0.35), btnW, btnH * 0.8); 

            const innerBezel = Math.max(2, thickness * 0.2); 
            ctx.strokeStyle = '#000000';
            ctx.lineWidth = innerBezel;
            ctx.beginPath();
            if (ctx.roundRect) ctx.roundRect(-halfW, -halfH, w, h, cornerRadius - 5);
            ctx.stroke();

            ctx.fillStyle = '#000000';
            const notchW = Math.min(w * 0.35, 160); 
            const notchH = thickness + 15; 
            const notchRadius = 18;
            ctx.beginPath();
            if(ctx.roundRect) ctx.roundRect(-notchW/2, -halfH - thickness + 5, notchW, notchH, notchRadius);
            ctx.fill();

            ctx.fillStyle = '#1a1a1a';
            ctx.beginPath();
            ctx.arc(notchW/2 - 20, -halfH - (thickness/2) + 12, 6, 0, Math.PI * 2); 
            ctx.fill();

            ctx.save();
            ctx.beginPath();
            if (ctx.roundRect) ctx.roundRect(-halfW - thickness, -halfH - thickness, w + (thickness*2), h + (thickness*2), cornerRadius + 5);
            ctx.clip();
            const grad = ctx.createLinearGradient(-halfW, -halfH, halfW, -halfH);
            grad.addColorStop(0, 'rgba(255,255,255,0.1)');
            grad.addColorStop(0.1, 'rgba(255,255,255,0)');
            grad.addColorStop(0.9, 'rgba(255,255,255,0)');
            grad.addColorStop(1, 'rgba(255,255,255,0.1)');
            ctx.fillStyle = grad;
            ctx.fillRect(-halfW - thickness, -halfH - thickness, w + (thickness*2), h + (thickness*2));
            ctx.restore();
        }
    };
};
