// @ts-nocheck
/**
 * 🫧 Bubble Feature Module (bubble_feature.js)
 * ميزة جديدة: شاشة مليئة بالفقاعات (الدوائر) مع تكبير متتابع للصور.
 * تم التحديث: 
 * 1. إضافة خاصية "Ferris Wheel": الفقاعات تحافظ على اتجاهها الرأسي حتى عند تدوير الخلفية.
 * 2. استخدام translate/rotate لعكس دوران الكليب لكل فقاعة.
 */

// 1. تهيئة الخصائص
const ensureBubbleProperties = (clip) => {
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
const generateBubbleLayout = (w, h, count) => {
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

// 3. حقن واجهة التحكم
const prevUpdateEffectControlsBubble = window.EditorApp.prototype.updateEffectControls;

window.EditorApp.prototype.updateEffectControls = function() {
    if (prevUpdateEffectControlsBubble) {
        prevUpdateEffectControlsBubble.call(this);
    }

    const panelArea = document.getElementById('pro-features-area');
    if (!panelArea || this.selectedClipIds.size !== 1) return;

    const clipId = Array.from(this.selectedClipIds)[0];
    const clip = this.tracks.flatMap(t => t.clips).find(c => c.id === clipId);
    if (!clip) return;

    ensureBubbleProperties(clip);

    const bubbleUI = `
    <div class="mt-4 border-t border-gray-700 pt-4">
        <div class="flex justify-between items-center mb-2">
            <h3 class="text-xs font-bold text-gray-400 uppercase flex items-center gap-2">
                <i class="fa-solid fa-soap"></i> Bubble Gallery
            </h3>
            <button onclick="window.app.toggleBubbleMode('${clipId}')" 
                class="text-[9px] px-2 py-1 rounded font-bold transition-all ${clip.bubbles.enabled ? 'bg-purple-600 text-white shadow-glow' : 'bg-gray-700 text-gray-400'}">
                ${clip.bubbles.enabled ? 'ON' : 'OFF'}
            </button>
        </div>

        ${clip.bubbles.enabled ? `
        <div class="space-y-3 animate-fade-in-up bg-gray-900/50 p-2 rounded border border-gray-700">
            
            <!-- Shape & Fit Mode -->
            <div class="flex justify-between items-center mb-2 gap-2">
                <!-- Shape -->
                <div class="flex bg-gray-800 rounded p-0.5 gap-1 flex-1 justify-center">
                    <button onclick="window.app.updateBubbleProp('${clipId}', 'activeShape', 'circle')" 
                        class="px-2 py-1 text-[9px] rounded ${clip.bubbles.activeShape === 'circle' ? 'bg-purple-600 text-white' : 'text-gray-400'}" title="Circle">
                        <i class="fa-regular fa-circle"></i>
                    </button>
                    <button onclick="window.app.updateBubbleProp('${clipId}', 'activeShape', 'horizontal')" 
                        class="px-2 py-1 text-[9px] rounded ${clip.bubbles.activeShape === 'horizontal' ? 'bg-purple-600 text-white' : 'text-gray-400'}" title="Landscape">
                        <i class="fa-regular fa-square" style="transform: scaleX(1.3);"></i>
                    </button>
                    <button onclick="window.app.updateBubbleProp('${clipId}', 'activeShape', 'vertical')" 
                        class="px-2 py-1 text-[9px] rounded ${clip.bubbles.activeShape === 'vertical' ? 'bg-purple-600 text-white' : 'text-gray-400'}" title="Portrait">
                        <i class="fa-regular fa-square" style="transform: scaleY(1.3);"></i>
                    </button>
                </div>
                
                <!-- Fit Mode -->
                <div class="flex bg-gray-800 rounded p-0.5 gap-1 flex-1 justify-center">
                    <button onclick="window.app.updateBubbleProp('${clipId}', 'fitMode', 'cover')" 
                        class="px-2 py-1 text-[9px] rounded ${clip.bubbles.fitMode === 'cover' ? 'bg-purple-600 text-white' : 'text-gray-400'}" title="Cover (Fill)">
                        Cover
                    </button>
                    <button onclick="window.app.updateBubbleProp('${clipId}', 'fitMode', 'contain')" 
                        class="px-2 py-1 text-[9px] rounded ${clip.bubbles.fitMode === 'contain' ? 'bg-purple-600 text-white' : 'text-gray-400'}" title="Contain (Show All)">
                        Fit
                    </button>
                </div>
            </div>

            <!-- Active Size -->
            <div>
                <div class="flex justify-between text-[10px] text-gray-500 mb-1">
                    <span>Active Bubble Size</span>
                    <span class="text-white">${clip.bubbles.activeSize}%</span>
                </div>
                <input type="range" min="20" max="100" value="${clip.bubbles.activeSize}" 
                    class="w-full h-1 bg-gray-700 rounded-lg cursor-pointer accent-purple-500"
                    oninput="window.app.updateBubbleProp('${clipId}', 'activeSize', this.value)">
            </div>

            <!-- Upload Assets -->
            <label class="flex items-center justify-center w-full p-2 bg-gray-800 hover:bg-gray-700 rounded cursor-pointer transition-colors border border-dashed border-gray-600">
                <span class="text-[10px] text-gray-300 flex items-center gap-2">
                    <i class="fa-solid fa-images"></i> Upload Gallery Images
                </span>
                <input type="file" multiple accept="image/*" class="hidden" 
                    onchange="window.app.handleBubbleAssets('${clipId}', this)">
            </label>
            <div class="text-[9px] text-gray-500 text-center mb-2">
                ${clip.bubbles.assets ? clip.bubbles.assets.length : 0} images loaded.
            </div>

            <!-- Duration per Photo -->
            <div>
                <div class="flex justify-between text-[10px] text-gray-500 mb-1">
                    <span>Seconds per Photo</span>
                    <span class="text-white">${clip.bubbles.speed}s</span>
                </div>
                <input type="range" min="1" max="10" step="0.5" value="${clip.bubbles.speed}" 
                    class="w-full h-1 bg-gray-700 rounded-lg cursor-pointer accent-purple-500"
                    oninput="window.app.updateBubbleProp('${clipId}', 'speed', this.value)">
            </div>

            <!-- Bubble Count -->
            <div>
                <div class="flex justify-between text-[10px] text-gray-500 mb-1">
                    <span>Background Bubbles</span>
                    <span class="text-white">${clip.bubbles.count}</span>
                </div>
                <input type="range" min="10" max="100" value="${clip.bubbles.count}" 
                    class="w-full h-1 bg-gray-700 rounded-lg cursor-pointer accent-purple-500"
                    oninput="window.app.updateBubbleProp('${clipId}', 'count', this.value)">
            </div>

            <!-- BG Color -->
            <div class="flex items-center justify-between">
                <span class="text-[10px] text-gray-500">Background</span>
                <input type="color" value="${clip.bubbles.bgColor}" 
                    class="w-6 h-6 bg-transparent border-0 cursor-pointer rounded"
                    oninput="window.app.updateBubbleProp('${clipId}', 'bgColor', this.value)">
            </div>
        </div>
        ` : ''}
    </div>
    `;

    const div = document.createElement('div');
    div.innerHTML = bubbleUI;
    panelArea.appendChild(div);
};

// 4. دوال التحكم
window.EditorApp.prototype.toggleBubbleMode = function(clipId) {
    const clip = this.tracks.flatMap(t => t.clips).find(c => c.id === clipId);
    if (clip) {
        ensureBubbleProperties(clip);
        clip.bubbles.enabled = !clip.bubbles.enabled;
        
        if (clip.bubbles.enabled) {
            if (!clip.frame) clip.frame = {};
            clip.frame.type = 'none'; 
        }
        
        this.renderFrameToCanvas();
        this.updateEffectControls();
    }
};

window.EditorApp.prototype.updateBubbleProp = function(clipId, prop, value) {
    const clip = this.tracks.flatMap(t => t.clips).find(c => c.id === clipId);
    if (clip) {
        if (['speed', 'count', 'activeSize'].includes(prop)) {
            clip.bubbles[prop] = parseFloat(value);
        } else {
            clip.bubbles[prop] = value;
        }

        if (prop === 'count') clip.bubbles.layout = null; 
        
        this.renderFrameToCanvas();
        if (prop === 'activeShape' || prop === 'fitMode') this.updateEffectControls(); 
    }
};

window.EditorApp.prototype.handleBubbleAssets = function(clipId, input) {
    if (!input.files || input.files.length === 0) return;
    const clip = this.tracks.flatMap(t => t.clips).find(c => c.id === clipId);
    if (!clip) return;
    
    ensureBubbleProperties(clip);
    if (!clip.bubbles.assets) clip.bubbles.assets = [];

    Array.from(input.files).forEach(file => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.src = e.target.result;
            clip.bubbles.assets.push(img);
            img.onload = () => this.renderFrameToCanvas();
        };
        reader.readAsDataURL(file);
    });
    setTimeout(() => this.updateEffectControls(), 500);
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