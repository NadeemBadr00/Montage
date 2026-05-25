// canvas_renderer.ts
// Handles rendering transforms, effects, and text on Canvas

export function applyClipTransforms(ctx: CanvasRenderingContext2D, clip: any, w: number, h: number, currentTime: number) {
    const timeInClip = currentTime - clip.start;
    const timeRemaining = clip.end - currentTime;
    
    // 1. Transitions
    if (clip.transitions) {
        const transDur = clip.transitions.duration || 1.0;
        let progress = 1;
        if (timeInClip < transDur) {
            progress = timeInClip / transDur;
            applyTransitionEffect(ctx, clip.transitions.in, progress, w, h, 'in');
        } else if (timeRemaining < transDur) {
            progress = timeRemaining / transDur;
            applyTransitionEffect(ctx, clip.transitions.out, progress, w, h, 'out');
        }
    }
    
    // 2. Opacity
    const opacity = (clip.properties.opacity !== undefined ? clip.properties.opacity : 100) / 100;
    ctx.globalAlpha *= opacity;

    // 3. Forced Dimensions Logic (Squeeze to Shape)
    if (clip.properties.forcedWidth && clip.properties.forcedHeight) {
        const scaleX = clip.properties.forcedWidth / w;
        const scaleY = clip.properties.forcedHeight / h;
        ctx.scale(scaleX, scaleY);
    } 
    // 4. Standard & Non-Uniform Scaling
    else {
        const masterScale = (clip.properties.scale || 100) / 100;
        const sX = (clip.properties.scaleX || 100) / 100;
        const sY = (clip.properties.scaleY || 100) / 100;
        
        ctx.scale(masterScale * sX, masterScale * sY);
    }
}

export function applyTransitionEffect(ctx: CanvasRenderingContext2D, type: string, progress: number, w: number, h: number, mode: string) {
    if (type === 'none') return;
    const dir = mode === 'in' ? 1 : -1; // 'out' reverses exit direction to match WebGL
    if (type === 'fade') ctx.globalAlpha *= progress;
    else if (type === 'slideLeft')  ctx.translate((1 - progress) * w  *  dir, 0);
    else if (type === 'slideRight') ctx.translate((1 - progress) * -w *  dir, 0);
    else if (type === 'slideUp')    ctx.translate(0, (1 - progress) * h * dir);
    else if (type === 'zoom') {
        ctx.translate(w/2, h/2);
        ctx.scale(progress, progress);
        ctx.translate(-w/2, -h/2);
    }
    else if (type === 'wipe') {
        ctx.beginPath();
        const maxRadius = Math.sqrt(w*w + h*h) / 2;
        ctx.arc(w/2, h/2, maxRadius * progress, 0, Math.PI * 2);
        ctx.clip();
    }
}

function forceHex(value: string) {
    if (!value || value === 'transparent') return '#000000';
    if (value.startsWith('#')) return value;
    return '#000000'; 
}

export function drawAdvancedText(ctx: CanvasRenderingContext2D, clip: any, w: number, h: number) {
    const style = clip.textStyle || {};
    let text = clip.src || "Text";
    
    // 1. Text Transform
    if (style.textTransform === 'uppercase') text = text.toUpperCase();
    else if (style.textTransform === 'lowercase') text = text.toLowerCase();
    else if (style.textTransform === 'capitalize') text = text.replace(/\b\w/g, (c: string) => c.toUpperCase());

    const centerX = w / 2; const centerY = h / 2;
    const posX = clip.properties.positionX || 0;
    const posY = clip.properties.positionY || 0;
    const rot = clip.properties.rotation || 0;
    const scale = (clip.properties.scale || 100) / 100;

    ctx.save();
    ctx.translate(centerX + posX, centerY + posY);
    ctx.rotate((rot * Math.PI) / 180);
    ctx.scale(scale, scale);
    
    const fontSize = h * 0.05; 
    const fontStyle = style.fontStyle === 'italic' ? 'italic' : 'normal';
    ctx.font = `${fontStyle} ${style.fontWeight || 'bold'} ${fontSize}px "${style.fontFamily || 'Cairo'}", "Segoe UI Emoji", "Apple Color Emoji", sans-serif`;
    
    const align = style.textAlign || 'center';
    ctx.textAlign = align as CanvasTextAlign; 
    ctx.textBaseline = "middle";

    const maxWidth = w * 0.8;
    const rawLines = text.split('\n');
    const lines = [];
    
    for (const rawLine of rawLines) {
        const words = rawLine.split(' ');
        let line = '';
        for (let n = 0; n < words.length; n++) {
            const testLine = line + words[n] + ' ';
            const metrics = ctx.measureText(testLine);
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
    lines.forEach((l: string) => { const m = ctx.measureText(l); if(m.width > maxLineWidth) maxLineWidth = m.width; });
    
    const padding = style.padding !== undefined ? style.padding : 20;
    const boxW = maxLineWidth + (padding * 2);
    const boxH = totalHeight + (padding * 2);
    const startY = -(totalHeight / 2) + (lineHeight / 2);

    // Save computed dimensions for UI bounding box (Canvas transform handles)
    (clip as any)._computedWidth = boxW;
    (clip as any)._computedHeight = boxH;

    // Render Background
    const bgOpacity = (style.backgroundOpacity !== undefined ? style.backgroundOpacity : 0) / 100;
    if (bgOpacity > 0) {
        ctx.save();
        ctx.globalAlpha *= bgOpacity;
        ctx.fillStyle = forceHex(style.backgroundColor);
        ctx.fillRect(-boxW/2, -boxH/2, boxW, boxH);
        ctx.restore();
    }

    if (style.shadowBlur > 0) {
        ctx.shadowColor = "rgba(0,0,0,0.8)";
        ctx.shadowBlur = style.shadowBlur;
        ctx.shadowOffsetX = 2; ctx.shadowOffsetY = 2;
    } else { ctx.shadowColor = "transparent"; }

    ctx.fillStyle = forceHex(style.color);
    ctx.strokeStyle = forceHex(style.strokeColor);
    ctx.lineWidth = style.strokeWidth || 0;

    // Calculate X origin based on alignment
    let textX = 0;
    if (align === 'left') textX = -boxW/2 + padding;
    else if (align === 'right') textX = boxW/2 - padding;

    lines.forEach((l: string, i: number) => {
        const currentY = startY + (i * lineHeight);
        const trimmed = l.trim();
        if (style.strokeWidth > 0) ctx.strokeText(trimmed, textX, currentY);
        ctx.fillText(trimmed, textX, currentY);
        
        // Render Underline
        if (style.textDecoration === 'underline') {
            const m = ctx.measureText(trimmed);
            const w = m.width;
            let lineX = textX;
            if (align === 'center') lineX -= w / 2;
            else if (align === 'right') lineX -= w;
            
            ctx.save();
            ctx.beginPath();
            const yOffset = currentY + (fontSize * 0.4);
            ctx.moveTo(lineX, yOffset);
            ctx.lineTo(lineX + w, yOffset);
            ctx.lineWidth = Math.max(1, fontSize * 0.08);
            ctx.strokeStyle = forceHex(style.color);
            ctx.stroke();
            ctx.restore();
        }
    });
    ctx.restore();
}
