// @ts-nocheck
// rendering_slideshow.ts — Slideshow methods: drawSlideshowContent, drawPhoneSlideshow, drawPolaroidStack
export const injectSlideshowMethods = () => {
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
};
