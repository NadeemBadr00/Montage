/**
 * 📱 Frame Features Module (frame_features.js)
 * مسؤول عن إضافة البراويز (تليفون، شريط سينمائي، بولارويد) للمقاطع.
 * تم التحديث: 
 * 1. دعم "الهاتف" كعارض شرائح (Slideshow) متعدد الصور.
 * 2. إضافة التحكم في مدة عرض كل صورة (Auto Split / Manual Seconds).
 */

// 1. تعريف الخصائص الافتراضية
const ensureFrameProperties = (clip) => {
    if (!clip.frame) {
        clip.frame = {
            type: 'none', // none, phone, film, polaroid
            color: '#151515', 
            thickness: 40,
            orientation: 'vertical', 
            assets: [],
            animSpeed: 50,
            transition: 'zoom', // zoom, fade, slide, static
            durationMode: 'auto', // auto (divide clip duration), manual (seconds per slide)
            slideDuration: 3 // Default 3 seconds per slide in manual mode
        };
    }
    if (!clip.frame.orientation) clip.frame.orientation = 'vertical';
    if (clip.frame.animSpeed === undefined) clip.frame.animSpeed = 50;
    if (!clip.frame.transition) clip.frame.transition = 'zoom';
    if (!clip.frame.durationMode) clip.frame.durationMode = 'auto';
    if (!clip.frame.slideDuration) clip.frame.slideDuration = 3;
    
    // إعدادات افتراضية للبولارويد
    if (clip.frame.type === 'polaroid' && clip.frame.color === '#151515') {
        clip.frame.color = '#f8f8f8';
    }
};

// 2. واجهة التحكم
const originalUpdateEffectControlsFrame = EditorApp.prototype.updateEffectControls;

EditorApp.prototype.updateEffectControls = function() {
    if (originalUpdateEffectControlsFrame) {
        originalUpdateEffectControlsFrame.call(this);
    }

    const panelArea = document.getElementById('pro-features-area');
    if (!panelArea || this.selectedClipIds.size !== 1) return;

    const clipId = Array.from(this.selectedClipIds)[0];
    const clip = this.tracks.flatMap(t => t.clips).find(c => c.id === clipId);
    if (!clip) return;

    ensureFrameProperties(clip);

    // توليد قائمة الصور
    let assetsListHTML = '';
    if (clip.frame.assets && clip.frame.assets.length > 0) {
        assetsListHTML = `<div class="grid grid-cols-4 gap-2 mb-2">`;
        clip.frame.assets.forEach((img, idx) => {
            assetsListHTML += `
                <div class="relative group bg-gray-900 rounded border border-gray-600 p-1">
                    <div class="aspect-square bg-gray-800 mb-1 flex items-center justify-center overflow-hidden rounded">
                        <img src="${img.src}" class="w-full h-full object-cover">
                    </div>
                    <div class="flex justify-between gap-0.5">
                        <button onclick="window.app.moveFilmAsset('${clipId}', ${idx}, -1)" class="text-[8px] bg-gray-700 hover:bg-gray-600 text-white flex-1 rounded py-0.5"><i class="fa-solid fa-chevron-left"></i></button>
                        <button onclick="window.app.removeFilmAsset('${clipId}', ${idx})" class="text-[8px] bg-red-900 hover:bg-red-700 text-white flex-1 rounded py-0.5"><i class="fa-solid fa-xmark"></i></button>
                        <button onclick="window.app.moveFilmAsset('${clipId}', ${idx}, 1)" class="text-[8px] bg-gray-700 hover:bg-gray-600 text-white flex-1 rounded py-0.5"><i class="fa-solid fa-chevron-right"></i></button>
                    </div>
                </div>
            `;
        });
        assetsListHTML += `</div>`;
    }

    const frameUI = `
    <div class="mt-4 border-t border-gray-700 pt-4">
        <h3 class="text-xs font-bold text-gray-400 mb-2 uppercase flex items-center gap-2">
            <i class="fa-solid fa-crop-simple"></i> Frame Style
        </h3>
        
        <div class="grid grid-cols-4 gap-1 mb-3">
            ${['none', 'phone', 'film', 'polaroid'].map(type => `
                <button onclick="window.app.updateFrameProp('${clipId}', 'type', '${type}')" 
                    class="p-2 rounded text-[9px] uppercase font-bold transition-all truncate
                    ${clip.frame.type === type ? 'bg-blue-600 text-white shadow-glow' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}">
                    ${type === 'film' ? '<i class="fa-solid fa-film"></i>' : (type === 'polaroid' ? '<i class="fa-solid fa-image"></i>' : (type === 'phone' ? '<i class="fa-solid fa-mobile"></i>' : ''))} ${type}
                </button>
            `).join('')}
        </div>

        ${clip.frame.type !== 'none' ? `
        <div class="space-y-3 animate-fade-in-up">
            
            ${(clip.frame.type === 'film' || clip.frame.type === 'polaroid' || clip.frame.type === 'phone') ? `
            <div class="bg-gray-800 p-2 rounded border border-gray-700 shadow-inner">
                
                ${clip.frame.type === 'film' ? `
                <!-- Film Controls -->
                <div class="flex justify-between items-center mb-3">
                    <span class="text-[10px] text-gray-300 font-bold">Orientation</span>
                    <div class="flex bg-gray-900 rounded p-0.5">
                        <button onclick="window.app.updateFrameProp('${clipId}', 'orientation', 'vertical')" 
                            class="px-2 py-1 text-[9px] rounded ${clip.frame.orientation === 'vertical' ? 'bg-blue-600 text-white' : 'text-gray-400'}">
                            Vert
                        </button>
                        <button onclick="window.app.updateFrameProp('${clipId}', 'orientation', 'horizontal')" 
                            class="px-2 py-1 text-[9px] rounded ${clip.frame.orientation === 'horizontal' ? 'bg-blue-600 text-white' : 'text-gray-400'}">
                            Horz
                        </button>
                    </div>
                </div>
                <div class="mb-3">
                    <div class="flex justify-between text-[10px] text-gray-400 mb-1">
                        <span>Film Speed</span>
                        <span class="text-white">${clip.frame.animSpeed}</span>
                    </div>
                    <input type="range" min="0" max="1000" value="${clip.frame.animSpeed}" 
                        class="w-full h-1 bg-gray-600 rounded-lg cursor-pointer accent-orange-500"
                        oninput="window.app.updateFrameProp('${clipId}', 'animSpeed', this.value)">
                </div>
                ` : `
                <!-- Slideshow Controls (Phone & Polaroid) -->
                <div class="mb-3">
                    <div class="flex justify-between text-[10px] text-gray-400 mb-1">
                        <span>Transition</span>
                    </div>
                    <select onchange="window.app.updateFrameProp('${clipId}', 'transition', this.value)" 
                        class="w-full bg-gray-700 text-white text-[10px] p-1 rounded border border-gray-600 outline-none">
                        <option value="zoom" ${clip.frame.transition === 'zoom' ? 'selected' : ''}>Slow Zoom</option>
                        <option value="fade" ${clip.frame.transition === 'fade' ? 'selected' : ''}>Cross Fade</option>
                        <option value="slide" ${clip.frame.transition === 'slide' ? 'selected' : ''}>Slide</option>
                        <option value="static" ${clip.frame.transition === 'static' ? 'selected' : ''}>Static</option>
                    </select>
                </div>

                <!-- Duration Control -->
                <div class="mb-3 border-t border-gray-700 pt-2">
                    <div class="flex justify-between items-center mb-2">
                        <span class="text-[10px] text-gray-300">Timing</span>
                        <div class="flex bg-gray-900 rounded p-0.5">
                            <button onclick="window.app.updateFrameProp('${clipId}', 'durationMode', 'auto')" 
                                class="px-2 py-0.5 text-[9px] rounded ${clip.frame.durationMode === 'auto' ? 'bg-blue-600 text-white' : 'text-gray-400'}">
                                Auto
                            </button>
                            <button onclick="window.app.updateFrameProp('${clipId}', 'durationMode', 'manual')" 
                                class="px-2 py-0.5 text-[9px] rounded ${clip.frame.durationMode === 'manual' ? 'bg-blue-600 text-white' : 'text-gray-400'}">
                                Manual
                            </button>
                        </div>
                    </div>
                    
                    ${clip.frame.durationMode === 'manual' ? `
                    <div>
                        <div class="flex justify-between text-[9px] text-gray-500 mb-1">
                            <span>Seconds per Slide</span>
                            <span class="text-white">${clip.frame.slideDuration}s</span>
                        </div>
                        <input type="range" min="0.5" max="10" step="0.5" value="${clip.frame.slideDuration}" 
                            class="w-full h-1 bg-gray-700 rounded-lg cursor-pointer accent-blue-500"
                            oninput="window.app.updateFrameProp('${clipId}', 'slideDuration', this.value)">
                    </div>
                    ` : `
                    <div class="text-[9px] text-gray-500 text-center">
                        Total duration (${clip.duration.toFixed(1)}s) split evenly.
                    </div>
                    `}
                </div>
                `}

                ${assetsListHTML}
                
                <label class="flex items-center justify-center w-full p-2 bg-gray-700 hover:bg-gray-600 rounded cursor-pointer transition-colors border border-dashed border-gray-500">
                    <span class="text-[10px] text-gray-300 flex items-center gap-2">
                        <i class="fa-solid fa-plus"></i> Add Images/Videos
                    </span>
                    <input type="file" multiple accept="image/*,video/*" class="hidden" 
                        onchange="window.app.handleFilmAssets('${clipId}', this)">
                </label>
            </div>
            ` : ''}

            <div>
                <div class="flex justify-between text-[10px] text-gray-500 mb-1">
                    <span>${clip.frame.type === 'polaroid' ? 'Frame Padding' : 'Frame Thickness'}</span>
                    <span class="text-white" id="frame-thickness-val">${clip.frame.thickness}px</span>
                </div>
                <input type="range" min="10" max="150" value="${clip.frame.thickness}" 
                    class="w-full h-1 bg-gray-700 rounded-lg cursor-pointer accent-blue-500"
                    oninput="window.app.updateFrameProp('${clipId}', 'thickness', this.value)">
            </div>

            <div class="flex items-center justify-between">
                <span class="text-[10px] text-gray-500">Frame Color</span>
                <div class="flex items-center gap-2">
                    <input type="color" value="${clip.frame.color}" 
                        class="w-6 h-6 bg-transparent border-0 cursor-pointer rounded overflow-hidden"
                        oninput="window.app.updateFrameProp('${clipId}', 'color', this.value)">
                </div>
            </div>
        </div>
        ` : ''}
    </div>
    `;

    const div = document.createElement('div');
    div.innerHTML = frameUI;
    panelArea.appendChild(div);
};

// 3. Helpers
EditorApp.prototype.updateFrameProp = function(clipId, prop, value) {
    const clip = this.tracks.flatMap(t => t.clips).find(c => c.id === clipId);
    if (clip) {
        ensureFrameProperties(clip);
        
        if (prop === 'type' && value === 'polaroid' && clip.frame.color === '#151515') {
            clip.frame.color = '#f8f8f8';
        }

        const finalValue = (prop === 'thickness' || prop === 'animSpeed' || prop === 'slideDuration') ? parseFloat(value) : value;
        clip.frame[prop] = finalValue;
        if (prop === 'thickness') {
            const el = document.getElementById('frame-thickness-val');
            if(el) el.innerText = `${finalValue}px`;
        }
        
        this.renderFrameToCanvas();
        if (['type', 'orientation', 'transition', 'durationMode'].includes(prop)) this.updateEffectControls(); 
    }
};

EditorApp.prototype.handleFilmAssets = function(clipId, input) {
    if (!input.files || input.files.length === 0) return;
    const clip = this.tracks.flatMap(t => t.clips).find(c => c.id === clipId);
    if (!clip) return;
    ensureFrameProperties(clip);
    if (!clip.frame.assets) clip.frame.assets = [];

    Array.from(input.files).forEach(file => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.src = e.target.result;
            clip.frame.assets.push(img);
            img.onload = () => this.renderFrameToCanvas();
        };
        reader.readAsDataURL(file);
    });
    setTimeout(() => this.updateEffectControls(), 500);
};

EditorApp.prototype.moveFilmAsset = function(clipId, index, direction) {
    const clip = this.tracks.flatMap(t => t.clips).find(c => c.id === clipId);
    if (!clip || !clip.frame.assets) return;
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= clip.frame.assets.length) return;
    const temp = clip.frame.assets[index];
    clip.frame.assets[index] = clip.frame.assets[newIndex];
    clip.frame.assets[newIndex] = temp;
    this.renderFrameToCanvas();
    this.updateEffectControls();
};

EditorApp.prototype.removeFilmAsset = function(clipId, index) {
    const clip = this.tracks.flatMap(t => t.clips).find(c => c.id === clipId);
    if (!clip || !clip.frame.assets) return;
    clip.frame.assets.splice(index, 1);
    this.renderFrameToCanvas();
    this.updateEffectControls();
};

// 4. القص
EditorApp.prototype.applyFrameClip = function(ctx, clip, w, h) {
    const type = clip.frame.type;
    const thickness = clip.frame.thickness || 25;
    const halfW = w / 2;
    const halfH = h / 2;
    ctx.beginPath();

    if (type === 'phone') {
        const cornerRadius = Math.min(w, h) * 0.14;
        // للجسم الخارجي
        if (ctx.roundRect) ctx.roundRect(-halfW - thickness, -halfH - thickness, w + (thickness*2), h + (thickness*2), cornerRadius + 5);
        else ctx.rect(-halfW - thickness, -halfH - thickness, w + (thickness*2), h + (thickness*2));
        ctx.clip();
    }
};

// 5. منطق الرسم المخصص
const originalDrawClipContentWithFrameDraw = EditorApp.prototype.drawClipContent;

EditorApp.prototype.drawClipContent = function(ctx, clip, track, w, h) {
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

        // توجيه الرسم حسب النوع
        if (clip.frame.type === 'film') {
            this.drawFilmStrip(ctx, clip, w, h);
        } else if (clip.frame.type === 'polaroid') {
            this.drawPolaroidStack(ctx, clip, w, h);
        } else if (clip.frame.type === 'phone') {
            // للهاتف: إذا كان هناك صور إضافية، نعامله كـ Slideshow
            if (clip.frame.assets && clip.frame.assets.length > 0) {
                this.drawPhoneSlideshow(ctx, clip, w, h);
            } else {
                // هاتف عادي (فيديو واحد)
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

// =========================================================
// 🚀 Helper: Draw Slideshow Content (Logic Shared by Phone & Polaroid)
// =========================================================
EditorApp.prototype.drawSlideshowContent = function(ctx, clip, w, h, contentList) {
    const totalCount = contentList.length;
    if (totalCount === 0) return;

    const clipDur = clip.duration || 10;
    const timeInClip = Math.max(0, window.app.currentTime - clip.start);
    
    let perImageDur = 3; // default manual
    
    // حساب المدة بناءً على الوضع
    if (clip.frame.durationMode === 'auto') {
        perImageDur = clipDur / totalCount;
    } else {
        perImageDur = clip.frame.slideDuration || 3;
    }
    
    // تحديد الصورة الحالية بناءً على الوقت (Looping)
    let currentIndex = Math.floor(timeInClip / perImageDur) % totalCount;
    
    const timeInSlide = timeInClip % perImageDur;
    const progress = timeInSlide / perImageDur;
    
    const item = contentList[currentIndex];
    const nextItem = contentList[(currentIndex + 1) % totalCount];
    
    const transitionType = clip.frame.transition || 'zoom';

    const drawItem = (contentItem, opacity, scale, translateX) => {
        if (!contentItem) return;
        ctx.save();
        ctx.globalAlpha *= opacity;
        ctx.scale(scale, scale);
        ctx.translate(translateX, 0);

        if (contentItem === 'MAIN_VIDEO') {
            if (clip.type === 'video') {
                const key = `visual_${clip.src}`;
                const player = this.players.find(p => p.getAttribute('data-key') === key);
                if (player && player.readyState >= 2) ctx.drawImage(player, -w/2, -h/2, w, h);
            } else if (clip.type === 'image') {
                const img = this.getImageFromCache(clip.src);
                if (img.complete) ctx.drawImage(img, -w/2, -h/2, w, h);
            }
        } else {
            if (contentItem && contentItem.complete) {
                try { ctx.drawImage(contentItem, -w/2, -h/2, w, h); } catch(e){}
            }
        }
        ctx.restore();
    };

    // تطبيق الترانزيشن
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

// 🔥 Phone with Slideshow
EditorApp.prototype.drawPhoneSlideshow = function(ctx, clip, w, h) {
    const thickness = clip.frame.thickness || 25;
    const cornerRadius = Math.min(w, h) * 0.14; 
    const halfW = w / 2;
    const halfH = h / 2;

    // 1. رسم الإطار الخلفي للهاتف
    this.drawFrameOverlay(ctx, clip, w, h); // هذا يرسم الجسم الخارجي والنوتش

    // 2. تحديد منطقة الشاشة للقص
    // نحتاج للرسم *تحت* النوتش ولكن *فوق* الخلفية
    // بما أن drawFrameOverlay يرسم كل شيء، سنقوم بقص منطقة الشاشة ورسم المحتوى
    // ملاحظة: drawFrameOverlay في وضع Phone ترسم "إطاراً مفرغاً"
    // لذا سنرسم المحتوى أولاً (مقصوصاً بحدود الشاشة) ثم نرسم الإطار فوقه مرة أخرى لضمان الحواف
    
    ctx.save();
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(-halfW, -halfH, w, h, cornerRadius - 5);
    else ctx.rect(-halfW, -halfH, w, h);
    ctx.clip(); // قص داخل الشاشة

    // 3. رسم المحتوى (Slideshow)
    const contentList = ['MAIN_VIDEO', ...clip.frame.assets];
    this.drawSlideshowContent(ctx, clip, w, h, contentList);

    ctx.restore();

    // 4. إعادة رسم الإطار (ليغطي حواف القص ويكون في الأعلى)
    this.drawFrameOverlay(ctx, clip, w, h);
};

// 🔥 Polaroid with Slideshow
EditorApp.prototype.drawPolaroidStack = function(ctx, clip, w, h) {
    const padding = clip.frame.thickness || 30;
    const bottomPadding = padding * 3.5;
    const bgColor = clip.frame.color || '#f8f8f8';
    
    const totalH = h + padding + bottomPadding;
    const totalW = w + padding * 2;
    
    // 1. الإطار
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.3)';
    ctx.shadowBlur = 15;
    ctx.shadowOffsetY = 5;
    ctx.fillStyle = bgColor;
    ctx.fillRect(-totalW/2, -totalH/2, totalW, totalH);
    ctx.shadowColor = 'transparent';
    
    // 2. منطقة الصورة (قص)
    // إزاحة المركز ليكون في وسط منطقة الصورة
    const imgCenterY = -totalH/2 + padding + h/2;
    ctx.translate(0, imgCenterY); // نقل المركز لمنطقة الصورة

    ctx.beginPath();
    ctx.rect(-w/2, -h/2, w, h);
    ctx.clip();

    // 3. المحتوى
    const contentList = ['MAIN_VIDEO', ...clip.frame.assets];
    this.drawSlideshowContent(ctx, clip, w, h, contentList);

    ctx.restore();
};

// --- رسم شريط الفيلم (بدون تغيير، يستخدم منطقه الخاص للتمرير) ---
EditorApp.prototype.drawFilmStrip = function(ctx, clip, w, h) {
    // ... [نفس كود drawFilmStrip السابق] ...
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
                const player = this.players.find(p => p.getAttribute('data-key') === key);
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

EditorApp.prototype.drawFrameOverlay = function(ctx, clip, w, h) {
    // Legacy Phone Overlay Drawing Logic (Kept for drawing the phone body)
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

        // Buttons
        ctx.fillStyle = color; 
        const btnW = thickness * 0.6;
        const btnH = h * 0.1;
        ctx.fillRect(halfW + thickness, -halfH + (h * 0.2), btnW, btnH); 
        ctx.fillRect(-halfW - thickness - btnW, -halfH + (h * 0.2), btnW, btnH * 0.8); 
        ctx.fillRect(-halfW - thickness - btnW, -halfH + (h * 0.35), btnW, btnH * 0.8); 

        // Inner Bezel
        const innerBezel = Math.max(2, thickness * 0.2); 
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = innerBezel;
        ctx.beginPath();
        if (ctx.roundRect) ctx.roundRect(-halfW, -halfH, w, h, cornerRadius - 5);
        ctx.stroke();

        // Notch
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

        // Reflection
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