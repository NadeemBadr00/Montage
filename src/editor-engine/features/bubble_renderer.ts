// @ts-nocheck
// bubble_renderer.ts — Canvas rendering: drawBubbleScene, drawShapedImage, drawClipContent patch

// 1. تهيئة الخصائص
export const ensureBubbleProperties = (clip) => {
    if (!clip.bubbles) {
        clip.bubbles = {
            enabled: false,
            count: 30, 
            speed: 3, 
            bgColor: '#0f172a',
            activeSize: 50, 
            activeShape: 'circle',
            fitMode: 'cover',
            layout: null, 
            assets: [] 
        };
    }
    if (clip.bubbles.activeSize === undefined) clip.bubbles.activeSize = 50;
    if (!clip.bubbles.activeShape) clip.bubbles.activeShape = 'circle';
    if (!clip.bubbles.fitMode) clip.bubbles.fitMode = 'cover';
};

// 2. توليد تخطيط عشوائي ثابت
export const generateBubbleLayout = (w, h, count) => {
    const layout = [];
    for (let i = 0; i < count; i++) {
        layout.push({
            x: Math.random() * w,
            y: Math.random() * h,
            r: (Math.random() * 50) + 20, 
            speedX: (Math.random() - 0.5) * 0.5, 
            speedY: (Math.random() - 0.5) * 0.5,
            assetIndex: Math.floor(Math.random() * 100) 
        });
    }
    return layout;
};

// 5. محرك الرسم
const prevDrawClipContentBubble = window.EditorApp.prototype.drawClipContent;

window.EditorApp.prototype.drawClipContent = function(ctx, clip, track, w, h) {
    if (clip.bubbles && clip.bubbles.enabled) {
        const centerX = w / 2;
        const centerY = h / 2;
        const posX = clip.properties.positionX || 0;
        const posY = clip.properties.positionY || 0;
        const rot = clip.properties.rotation || 0;
        const scale = (clip.properties.scale || 100) / 100;

        ctx.save();
        ctx.translate(centerX + posX, centerY + posY);
        ctx.rotate((rot * Math.PI) / 180);
        ctx.scale(scale, scale);

        ctx.beginPath();
        ctx.rect(-w/2, -h/2, w, h);
        ctx.clip(); 

        this.drawBubbleScene(ctx, clip, w, h);

        ctx.restore();
    } else {
        prevDrawClipContentBubble.call(this, ctx, clip, track, w, h);
    }
};

// 🔥 رسم مشهد الفقاعات
window.EditorApp.prototype.drawBubbleScene = function(ctx, clip, w, h) {
    const props = clip.bubbles;
    const assets = props.assets || [];
    const contentList = ['MAIN_VIDEO', ...assets];
    const totalCount = contentList.length;

    // 1. الخلفية
    ctx.fillStyle = props.bgColor;
    ctx.fillRect(-w/2, -h/2, w, h);

    if (!props.layout || props.layout.length !== props.count) {
        props.layout = generateBubbleLayout(w, h, props.count);
    }

    const timeInClip = Math.max(0, window.app.currentTime - clip.start);
    
    // 2. الفقاعات الخلفية (دائرية دائماً)
    props.layout.forEach((circle, i) => {
        const floatX = Math.sin(timeInClip + i) * 10;
        const floatY = Math.cos(timeInClip + i) * 10;
        
        const cx = (circle.x - w/2) + floatX;
        const cy = (circle.y - h/2) + floatY;
        
        const imgIndex = circle.assetIndex % contentList.length;
        const item = contentList[imgIndex];

        // الخلفية دائماً دوائر
        drawShapedImage(ctx, this, clip, item, cx, cy, circle.r, circle.r, 0.6, false, 'cover', 'circle'); 
    });

    // 3. الدائرة النشطة
    const slideDuration = props.speed || 3;
    let currentIndex = Math.floor(timeInClip / slideDuration) % totalCount;
    
    const timeInSlide = timeInClip % slideDuration;
    const progress = timeInSlide / slideDuration;

    const activeItem = contentList[currentIndex];

    // حساب الحجم والأبعاد
    const baseSize = Math.min(w, h) * 0.5; 
    const sizeMultiplier = (props.activeSize || 50) / 50; 
    
    let radiusX = baseSize * sizeMultiplier;
    let radiusY = baseSize * sizeMultiplier;
    
    let shapeType = 'circle';

    if (props.activeShape === 'horizontal') {
        radiusX *= 1.33; 
        radiusY *= 1.0; 
        shapeType = 'rect';
    } else if (props.activeShape === 'vertical') {
        radiusX *= 0.75; 
        radiusY *= 1.33;
        shapeType = 'rect';
    } else {
        shapeType = 'circle';
    }

    const scale = 0.9 + (progress * 0.2); 
    let opacity = 1;
    
    if (progress < 0.1) opacity = progress * 10;
    if (progress > 0.9) opacity = (1 - progress) * 10;

    const centerX = 0;
    const centerY = 0;

    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.5)';
    ctx.shadowBlur = 30;
    
    const fitMode = props.fitMode || 'cover';
    drawShapedImage(ctx, this, clip, activeItem, centerX, centerY, radiusX * scale, radiusY * scale, opacity, true, fitMode, shapeType);
    
    ctx.restore();
};

// دالة رسم تدعم الدوائر والمستطيلات وعكس الدوران
function drawShapedImage(ctx, app, clip, item, x, y, rx, ry, alpha, border = false, fitMode = 'cover', shapeType = 'circle') {
    if (!item) return;

    ctx.save();
    ctx.globalAlpha = alpha;
    
    // 🔥🔥 Counter-Rotation Logic 🔥🔥
    // نحصل على زاوية دوران الكليب الأصلية
    const rotation = (clip.properties.rotation || 0) * (Math.PI / 180);
    
    // نذهب لمركز الفقاعة
    ctx.translate(x, y);
    // نعكس الدوران (ليصبح المحتوى واقفاً مهما دار الكليب)
    ctx.rotate(-rotation);
    // الآن الرسم يتم بالنسبة لـ (0,0) الذي هو مركز الفقاعة
    
    // رسم المسار
    ctx.beginPath();
    
    if (shapeType === 'rect') {
        const w = Math.abs(rx) * 2;
        const h = Math.abs(ry) * 2;
        const radius = Math.min(w, h) * 0.15; 
        
        if (ctx.roundRect) {
            ctx.roundRect(-Math.abs(rx), -Math.abs(ry), w, h, radius);
        } else {
            ctx.rect(-Math.abs(rx), -Math.abs(ry), w, h);
        }
    } else {
        // دائرة / بيضاوي (مركزه 0,0)
        ctx.ellipse(0, 0, Math.abs(rx), Math.abs(ry), 0, 0, Math.PI * 2);
    }
    
    ctx.closePath();
    
    ctx.save();
    ctx.clip(); 

    // أبعاد منطقة الرسم
    const targetW = Math.abs(rx) * 2;
    const targetH = Math.abs(ry) * 2;

    // بما أننا عملنا translate(x,y) ثم رسمنا المسار حول 0,0
    // فالصورة أيضاً يجب رسمها حول 0,0
    const imgX = -targetW/2; // خطأ بسيط هنا، الـ drawImage يحتاج التوسيط بناء على حجم الصورة المرسومة
    // لكننا سنستخدم التوسيط الديناميكي بالأسفل

    if (item === 'MAIN_VIDEO') {
        if (clip.type === 'video') {
            const key = `visual_${clip.src}`;
            const player = app.players.find(p => p.getAttribute('data-key') === key);
            if (player && player.readyState >= 2) {
                let ratio;
                if (fitMode === 'contain') {
                    ratio = Math.min(targetW / player.videoWidth, targetH / player.videoHeight);
                } else {
                    ratio = Math.max(targetW / player.videoWidth, targetH / player.videoHeight);
                }
                const drawW = player.videoWidth * ratio;
                const drawH = player.videoHeight * ratio;
                ctx.drawImage(player, -drawW/2, -drawH/2, drawW, drawH);
            }
        } else if (clip.type === 'image') {
            const img = app.getImageFromCache(clip.src);
            if (img.complete) {
                let ratio;
                if (fitMode === 'contain') {
                    ratio = Math.min(targetW / img.width, targetH / img.height);
                } else {
                    ratio = Math.max(targetW / img.width, targetH / img.height);
                }
                const drawW = img.width * ratio;
                const drawH = img.height * ratio;
                ctx.drawImage(img, -drawW/2, -drawH/2, drawW, drawH);
            }
        }
    } else {
        if (item && item.complete) {
            let ratio;
            if (fitMode === 'contain') {
                ratio = Math.min(targetW / item.width, targetH / item.height);
            } else {
                ratio = Math.max(targetW / item.width, targetH / item.height);
            }
            const drawW = item.width * ratio;
            const drawH = item.height * ratio;
            try {
                ctx.drawImage(item, -drawW/2, -drawH/2, drawW, drawH);
            } catch(e){}
        }
    }
    
    ctx.restore(); // إزالة القص

    // رسم الإطار (حول 0,0)
    if (border) {
        ctx.lineWidth = 8;
        ctx.strokeStyle = '#ffffff';
        ctx.stroke();
    } else {
        ctx.lineWidth = 1;
        ctx.strokeStyle = 'rgba(255,255,255,0.2)';
        ctx.stroke();
    }

    ctx.restore(); // استعادة التحويلات (translate/rotate)
}
