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
    
    // ✅ F4: Motion Graphics (Animations)
    const app = (window as any).app;
    const currentTime = app ? app.currentTime : clip.start;
    const timeInClip = currentTime - clip.start;
    const timeRemaining = clip.end - currentTime;
    
    let animScale = scale;
    let animX = posX;
    let animY = posY;
    let animAlpha = 1;
    let animRot = rot;

    if (clip.animation) {
        // IN Animation
        if (clip.animation.in && timeInClip < 1.0) {
            const p = timeInClip; // 0 to 1
            const easeOutBack = (x: number) => 1 + 2.70158 * Math.pow(x - 1, 3) + 1.70158 * Math.pow(x - 1, 2);
            if (clip.animation.in === 'pop') {
                animScale = scale * easeOutBack(p);
            } else if (clip.animation.in === 'slideUp') {
                animY += (1 - p) * 200;
                animAlpha = p;
            } else if (clip.animation.in === 'fadeIn') {
                animAlpha = p;
            }
        }
        
        // OUT Animation
        if (clip.animation.out && timeRemaining < 1.0) {
            const p = 1.0 - timeRemaining; // 0 to 1
            if (clip.animation.out === 'popOut') {
                animScale = scale * (1 - p);
            } else if (clip.animation.out === 'slideDown') {
                animY += p * 200;
                animAlpha = 1 - p;
            } else if (clip.animation.out === 'fadeOut') {
                animAlpha = 1 - p;
            }
        }
        
        // LOOP Animation
        if (clip.animation.loop) {
            if (clip.animation.loop === 'pulse') {
                animScale *= 1.0 + Math.sin(currentTime * 5) * 0.1;
            } else if (clip.animation.loop === 'shake') {
                animRot += Math.sin(currentTime * 20) * 5;
            } else if (clip.animation.loop === 'wave') {
                animY += Math.sin(currentTime * 4) * 20;
            }
        }
    }

    ctx.globalAlpha *= Math.max(0, Math.min(1, animAlpha));
    ctx.translate(centerX + animX, centerY + animY);
    ctx.rotate((animRot * Math.PI) / 180);
    ctx.scale(animScale, animScale);
    
    const fontSize = h * 0.05; 
    const fontStyle = style.fontStyle === 'italic' ? 'italic' : 'normal';
    const fontStr = `${fontStyle} ${style.fontWeight || 'bold'} ${fontSize}px "${style.fontFamily || 'Cairo'}", "Segoe UI Emoji", "Apple Color Emoji", sans-serif`;
    ctx.font = fontStr;
    
    const align = style.textAlign || 'center';
    ctx.textAlign = align as CanvasTextAlign; 
    ctx.textBaseline = "middle";

    // ✅ P7: Cache word-wrapping and measureText results per clip (O(1) rendering instead of O(m) per frame)
    const padding = style.padding !== undefined ? style.padding : 20;
    const cacheKey = `${text}|${fontStr}|${w}|${padding}`;

    let lines: string[] = [];
    let boxW = 0, boxH = 0, startY = 0, lineHeight = fontSize * 1.4;

    if ((clip as any)._lastTextCacheKey === cacheKey && (clip as any)._cachedLines) {
        lines = (clip as any)._cachedLines;
        boxW = (clip as any)._computedWidth;
        boxH = (clip as any)._computedHeight;
        startY = (clip as any)._cachedStartY;
    } else {
        const maxWidth = w * 0.8;
        const rawLines = text.split('\n');
        
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

        const totalHeight = lines.length * lineHeight;
        let maxLineWidth = 0;
        lines.forEach((l: string) => { const m = ctx.measureText(l); if(m.width > maxLineWidth) maxLineWidth = m.width; });
        
        boxW = maxLineWidth + (padding * 2);
        boxH = totalHeight + (padding * 2);
        startY = -(totalHeight / 2) + (lineHeight / 2);

        // Save computed dimensions for UI bounding box (Canvas transform handles) and fast render
        (clip as any)._lastTextCacheKey = cacheKey;
        (clip as any)._cachedLines = lines;
        (clip as any)._computedWidth = boxW;
        (clip as any)._computedHeight = boxH;
        (clip as any)._cachedStartY = startY;
    }

    // Render Background
    const bgOpacity = (style.backgroundOpacity !== undefined ? style.backgroundOpacity : 0) / 100;
    if (bgOpacity > 0) {
        ctx.save();
        ctx.globalAlpha *= bgOpacity;
        ctx.fillStyle = forceHex(style.backgroundColor);
        ctx.fillRect(-boxW/2, -boxH/2, boxW, boxH);
        ctx.restore();
    }

    // Phase 27A: Glow/Neon (double-render: first as blur shadow, then sharp)
    if (style.glowBlur && style.glowBlur > 0) {
        ctx.shadowBlur = style.glowBlur;
        ctx.shadowColor = style.glowColor || '#e879f9';
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;
    } else if (style.shadowBlur > 0) {
        ctx.shadowColor = 'rgba(0,0,0,0.8)';
        ctx.shadowBlur = style.shadowBlur;
        ctx.shadowOffsetX = 2;
        ctx.shadowOffsetY = 2;
    } else {
        ctx.shadowColor = 'transparent';
    }

    // Phase 27B: Gradient Text or solid color
    let fillStyle: string | CanvasGradient = forceHex(style.color);
    if (style.gradientEnabled && style.gradientFrom && style.gradientTo) {
        const dir = style.gradientDir || '→';
        let grad: CanvasGradient;
        if (dir === '↓') {
            // vertical
            const halfH = (lines.length * lineHeight) / 2;
            grad = ctx.createLinearGradient(0, -halfH, 0, halfH);
        } else if (dir === '↗') {
            // diagonal
            const halfW = boxW / 2;
            const halfH = (lines.length * lineHeight) / 2;
            grad = ctx.createLinearGradient(-halfW, halfH, halfW, -halfH);
        } else {
            // horizontal →
            grad = ctx.createLinearGradient(-boxW / 2, 0, boxW / 2, 0);
        }
        grad.addColorStop(0, style.gradientFrom);
        grad.addColorStop(1, style.gradientTo);
        fillStyle = grad;
    }

    ctx.fillStyle = fillStyle;
    ctx.strokeStyle = forceHex(style.strokeColor);
    ctx.lineWidth = style.strokeWidth || 0;

    // Calculate X origin based on alignment
    let textX = 0;
    if (align === 'left') textX = -boxW/2 + padding;
    else if (align === 'right') textX = boxW/2 - padding;

    lines.forEach((l: string, i: number) => {
        const currentY = startY + (i * lineHeight);
        const trimmed = l.trim();

        // Neon: draw glow pass first
        if (style.glowBlur && style.glowBlur > 0) {
            ctx.save();
            ctx.globalAlpha *= (style.glowOpacity !== undefined ? style.glowOpacity / 100 : 0.8);
            ctx.fillStyle = style.glowColor || '#e879f9';
            ctx.shadowBlur = style.glowBlur * 2;
            ctx.shadowColor = style.glowColor || '#e879f9';
            ctx.fillText(trimmed, textX, currentY);
            ctx.restore();
            // Reset shadow for the sharp pass
            ctx.shadowBlur = 0;
            ctx.shadowColor = 'transparent';
            ctx.fillStyle = fillStyle; // restore gradient/solid
        }

        if (style.strokeWidth > 0) ctx.strokeText(trimmed, textX, currentY);
        ctx.fillText(trimmed, textX, currentY);

        // Karaoke highlight word
        if (style.isKaraoke && style.activeWordIndex !== undefined) {
            const words = trimmed.split(' ');
            let wordX = textX;
            if (align === 'center') {
                const totalW = ctx.measureText(trimmed).width;
                wordX = -totalW / 2;
            }
            words.forEach((word, wi) => {
                const wm = ctx.measureText(word + ' ');
                if (wi === style.activeWordIndex) {
                    ctx.save();
                    ctx.fillStyle = '#fbbf24'; // highlight color
                    ctx.fillText(word, wordX, currentY);
                    ctx.restore();
                    ctx.fillStyle = fillStyle;
                }
                wordX += wm.width;
            });
        }

        // Render Underline
        if (style.textDecoration === 'underline') {
            const m = ctx.measureText(trimmed);
            const uw = m.width;
            let lineX = textX;
            if (align === 'center') lineX -= uw / 2;
            else if (align === 'right') lineX -= uw;

            ctx.save();
            ctx.beginPath();
            const yOffset = currentY + (fontSize * 0.4);
            ctx.moveTo(lineX, yOffset);
            ctx.lineTo(lineX + uw, yOffset);
            ctx.lineWidth = Math.max(1, fontSize * 0.08);
            ctx.strokeStyle = forceHex(style.color);
            ctx.stroke();
            ctx.restore();
        }
    });
    ctx.restore();
}
