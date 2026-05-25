// @ts-nocheck
import { syncGridOrder } from './helpers';
import { calculateLayout } from './layout';

function drawCell(ctx: CanvasRenderingContext2D, app: any, clip: any, item: any, cell: any, scale: number, isActive: boolean, offset: any, label: string) {
    if (!item) return;
    const g = clip.gridGallery;
    const cx = cell.x + offset.x;
    const cy = cell.y + offset.y;
    const w = cell.w * scale;
    const h = cell.h * scale;
    
    ctx.save();
    
    if (!isActive) {
        if (g.focusEffect === 'blur') ctx.filter = 'blur(4px)';
        if (g.focusEffect === 'grayscale') ctx.filter = 'grayscale(100%)';
    }

    const rot = (clip.properties.rotation || 0) * Math.PI / 180;
    ctx.translate(cx, cy);
    ctx.rotate(-rot);
    ctx.translate(-cx, -cy);

    ctx.beginPath();
    const r = Math.min(w, h) / 2;
    
    if (g.shape === 'circle') {
        ctx.arc(cx, cy, r, 0, Math.PI*2);
    } else if (g.shape === 'square' || g.shape.startsWith('strip')) {
        if(ctx.roundRect) ctx.roundRect(cx - w/2, cy - h/2, w, h, 20);
        else ctx.rect(cx - w/2, cy - h/2, w, h);
    } else if (g.shape === 'hexagon') {
        for (let i = 0; i < 6; i++) {
            const angle = (Math.PI / 3) * i;
            const hx = cx + r * Math.cos(angle);
            const hy = cy + r * Math.sin(angle);
            if (i === 0) ctx.moveTo(hx, hy);
            else ctx.lineTo(hx, hy);
        }
        ctx.closePath();
    }
    
    ctx.save();
    ctx.clip();
    
    let drawImg = null;
    let drawVideo = null;

    if (item === 'MAIN_VIDEO') {
        if (clip.type === 'video') {
            const key = `visual_${clip.src}`;
            const player = app.players.find((p: any) => p.getAttribute('data-key') === key);
            if (player && player.readyState >= 2) drawVideo = player;
        } else if (clip.type === 'image') {
            drawImg = app.getImageFromCache(clip.src);
        }
    } else {
        if (item.type === 'video') drawVideo = item.el;
        else drawImg = item.el;
    }

    if (drawVideo) {
         const ratio = Math.max(w / drawVideo.videoWidth, h / drawVideo.videoHeight);
         const dw = drawVideo.videoWidth * ratio;
         const dh = drawVideo.videoHeight * ratio;
         ctx.drawImage(drawVideo, cx - dw/2, cy - dh/2, dw, dh);
    } else if (drawImg && drawImg.complete) {
         const ratio = Math.max(w / drawImg.width, h / drawImg.height);
         const dw = drawImg.width * ratio;
         const dh = drawImg.height * ratio;
         ctx.drawImage(drawImg, cx - dw/2, cy - dh/2, dw, dh);
    } else {
        ctx.fillStyle = '#333';
        ctx.fillRect(cx - w/2, cy - h/2, w, h);
    }
    ctx.restore(); 

    if (g.borderWidth > 0) {
        ctx.lineWidth = g.borderWidth;
        ctx.strokeStyle = isActive ? g.activeBorderColor : g.borderColor;
        ctx.stroke();
    }

    if (g.showLabels && label) {
        ctx.fillStyle = isActive ? g.activeBorderColor : '#ffffff';
        ctx.font = `bold ${Math.max(10, w/6)}px Cairo`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.shadowColor = 'black';
        ctx.shadowBlur = 4;
        ctx.fillText(label, cx, cy + (h/2) + 10);
    }

    ctx.restore(); 
}

export const injectGridRendering = (prevDrawClipContentGrid: any) => {
    window.EditorApp.prototype.drawClipContent = function(ctx: CanvasRenderingContext2D, clip: any, track: any, w: number, h: number) {
        if (clip.gridGallery && clip.gridGallery.enabled) {
            this.drawGridScene(ctx, clip, w, h);
        } else {
            if (prevDrawClipContentGrid) {
                prevDrawClipContentGrid.call(this, ctx, clip, track, w, h);
            }
        }
    };

    window.EditorApp.prototype.drawGridScene = function(ctx: CanvasRenderingContext2D, clip: any, w: number, h: number) {
        const g = clip.gridGallery;
        
        const rawContentList = [];
        if (g.showMain) rawContentList.push('MAIN_VIDEO');
        if (g.assets) rawContentList.push(...g.assets);

        const totalItems = rawContentList.length;
        if (!g.order || g.order.length !== totalItems) syncGridOrder(clip);

        const cx = w/2, cy = h/2;
        ctx.save();
        ctx.translate(cx + (clip.properties.positionX||0), cy + (clip.properties.positionY||0));
        ctx.rotate((clip.properties.rotation||0) * Math.PI / 180);
        ctx.scale((clip.properties.scale||100)/100, (clip.properties.scale||100)/100);
        
        ctx.beginPath(); ctx.rect(-w/2, -h/2, w, h); ctx.clip();
        ctx.translate(-cx, -cy);

        if (g.bgOpacity > 0) {
            ctx.fillStyle = g.bgColor;
            ctx.globalAlpha = g.bgOpacity / 100;
            ctx.fillRect(0,0,w,h);
            ctx.globalAlpha = 1;
        }

        if (!g.layout || g.layout.length !== totalItems) {
            g.layout = calculateLayout(w, h, g.gap, totalItems, g);
        }

        const timeInClip = Math.max(0, window.app.currentTime - clip.start);
        let durPerItem = g.durationMode === 'auto' ? (clip.duration / Math.max(1, totalItems)) : g.speed;
        const timeIndex = Math.floor(timeInClip / durPerItem) % totalItems;
        const activeSlotIndex = timeIndex;
        
        const progress = (timeInClip % durPerItem) / durPerItem;
        let zoomFactor = 0;
        if (progress < 0.2) zoomFactor = progress / 0.2; 
        else if (progress > 0.8) zoomFactor = (1 - progress) / 0.2; 
        else zoomFactor = 1; 

        g.layout.forEach((cell: any, slotIndex: number) => {
            const isActive = slotIndex === activeSlotIndex;
            const labelText = g.labels[slotIndex];

            // Entry Anim
            let entryScale = 1;
            let entryOffset = {x:0, y:0};
            const globalEntryTime = 0.5; 
            const stagger = 0.1;
            if (timeInClip < (globalEntryTime + (slotIndex * stagger))) {
                const myEntryTime = timeInClip - (slotIndex * stagger);
                if (myEntryTime < 0) entryScale = 0;
                else if (myEntryTime < 0.5) {
                    const t = myEntryTime / 0.5;
                    if (g.entryAnim === 'pop') entryScale = Math.sin(t * Math.PI/2);
                    if (g.entryAnim === 'fly_in') entryOffset.y = (1-t) * 200;
                }
            }

            let scale = 1;
            if (isActive) {
                 scale = g.passiveScale + ((g.activeScale - g.passiveScale) * zoomFactor);
            } else {
                 if (g.shrinkPassive) {
                     scale = g.passiveScale - (g.passiveScale * 0.15 * zoomFactor);
                 } else {
                     scale = g.passiveScale; 
                 }
            }
            
            scale *= entryScale; 

            if (!isActive) {
                const item = rawContentList[g.order[slotIndex]];
                drawCell(ctx, window.app, clip, item, cell, scale, isActive, entryOffset, labelText);
            }
        });

        const activeCell = g.layout[activeSlotIndex];
        if (activeCell) {
            const item = rawContentList[g.order[activeSlotIndex]];
            const labelText = g.labels[activeSlotIndex];
            
            let scale = g.passiveScale + ((g.activeScale - g.passiveScale) * zoomFactor);
            
            if (g.focusEffect === 'glow') {
                ctx.save();
                ctx.shadowBlur = 30 * zoomFactor;
                ctx.shadowColor = g.activeBorderColor;
                drawCell(ctx, window.app, clip, item, activeCell, scale, true, {x:0,y:0}, labelText);
                ctx.restore();
            } else {
                drawCell(ctx, window.app, clip, item, activeCell, scale, true, {x:0,y:0}, labelText);
            }
        }

        ctx.restore();
    };
};
