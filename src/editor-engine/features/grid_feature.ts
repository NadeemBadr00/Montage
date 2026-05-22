// @ts-nocheck
/**
 * 🔢 Grid Feature Module (grid_feature.js)
 * الإصدار الشامل (Ultimate Edition) - V5
 * المميزات:
 * 1. 📐 Shapes & Layouts: أشكال وأنماط توزيع متعددة.
 * 2. 👁️ Focus FX: مؤثرات بصرية.
 * 3. 🚀 Entry Anim: حركات دخول.
 * 4. 🎛️ Scaling: تحكم كامل (Active/Passive Size).
 * 5. 🫁 Shrink Neighbors: إعادة تأثير "تنفس" الفقاعات المجاورة.
 * 6. 🗑️ Management: حذف الصور وإخفاء الأصل.
 */

// =========================================================
// 1. تهيئة الخصائص (Properties Init)
// =========================================================
const ensureGridProperties = (clip) => {
    if (!clip.gridGallery) {
        clip.gridGallery = {
            enabled: false,
            // --- Timing ---
            durationMode: 'manual', // manual | auto
            speed: 2,
            
            // --- Layout & Shape ---
            pattern: 'grid', 
            shape: 'circle', 
            gap: 10,
            spreadX: 1.0,
            spreadY: 1.0,
            
            // --- Scaling & Animation ---
            activeScale: 1.3,   // الحجم عند التنشيط
            passiveScale: 0.8,  // الحجم الطبيعي
            shrinkPassive: true, // 🔥 هل ينكمش الجيران عند التنشيط؟
            entryAnim: 'pop', 
            
            // --- Styling ---
            bgColor: '#1e293b',
            bgOpacity: 100,
            
            // --- Focus & Borders ---
            focusEffect: 'none', 
            borderWidth: 0,
            borderColor: '#ffffff',
            activeBorderColor: '#ffd700', 
            
            // --- Content ---
            showMain: true,
            showLabels: false,
            assets: [], 
            labels: [], 
            order: [],
            layout: null
        };
    }

    const g = clip.gridGallery;
    if (g.showMain === undefined) g.showMain = true;
    if (!g.pattern) g.pattern = 'grid';
    if (!g.shape) g.shape = 'circle';
    if (!g.focusEffect) g.focusEffect = 'none';
    if (g.borderWidth === undefined) g.borderWidth = 0;
    if (!g.borderColor) g.borderColor = '#ffffff';
    if (!g.activeBorderColor) g.activeBorderColor = '#ffd700';
    if (!g.entryAnim) g.entryAnim = 'pop';
    if (!g.labels) g.labels = [];
    if (g.bgOpacity === undefined) g.bgOpacity = 100;
    if (!g.bgColor) g.bgColor = '#1e293b';
    
    // Scaling Defaults
    if (g.activeScale === undefined) g.activeScale = 1.3;
    if (g.passiveScale === undefined) g.passiveScale = 0.8;
    if (g.shrinkPassive === undefined) g.shrinkPassive = true;

    syncGridOrder(clip);
};

// مزامنة الترتيب
const syncGridOrder = (clip) => {
    const g = clip.gridGallery;
    const baseCount = g.showMain ? 1 : 0;
    const assetsCount = g.assets ? g.assets.length : 0;
    const totalItems = baseCount + assetsCount;

    if (g.order.length !== totalItems) {
        g.order = Array.from({length: totalItems}, (_, i) => i);
    }
    
    if (g.labels.length < totalItems) {
        for(let i = g.labels.length; i < totalItems; i++) {
            if (g.showMain && i === 0) g.labels[i] = "Main";
            else g.labels[i] = `Item ${i + 1}`;
        }
    } else if (g.labels.length > totalItems) {
        g.labels = g.labels.slice(0, totalItems);
    }
};

// =========================================================
// 2. محرك التخطيط (Layout Engine)
// =========================================================
const calculateLayout = (w, h, gap, count, props) => {
    const { pattern, spreadX, spreadY, shape } = props;
    const layout = [];
    if (count === 0) return layout;

    const centerX = w / 2;
    const centerY = h / 2;
    
    let itemAspect = 1; 
    if (shape === 'strip_h') itemAspect = 16/9;
    if (shape === 'strip_v') itemAspect = 9/16;

    // --- A. Grid Layout ---
    if (pattern === 'grid') {
        let bestCols = 1, bestRows = 1, maxSize = 0;
        for (let c = 1; c <= count; c++) {
            const r = Math.ceil(count / c);
            const availW = (w - (gap * (c + 1))) / c;
            const availH = (h - (gap * (r + 1))) / r;
            
            let itemW, itemH;
            if (availW / itemAspect <= availH) {
                itemW = availW; itemH = itemW / itemAspect;
            } else {
                itemH = availH; itemW = itemH * itemAspect;
            }
            if (itemW > maxSize) {
                maxSize = itemW; bestCols = c; bestRows = r;
            }
        }
        
        const cellW = maxSize;
        const cellH = maxSize / itemAspect;
        const gridTotalW = (bestCols * cellW) + ((bestCols - 1) * gap);
        const gridTotalH = (bestRows * cellH) + ((bestRows - 1) * gap);
        const startX = centerX - (gridTotalW / 2) + (cellW / 2);
        const startY = centerY - (gridTotalH / 2) + (cellH / 2);

        for (let i = 0; i < count; i++) {
            const row = Math.floor(i / bestCols);
            const col = i % bestCols;
            let rowOffsetX = 0;
            const isLastRow = row === bestRows - 1;
            const itemsInLastRow = count % bestCols || bestCols;
            if (isLastRow && itemsInLastRow < bestCols) {
                const empty = bestCols - itemsInLastRow;
                rowOffsetX = (empty * (cellW + gap)) / 2;
            }
            const baseX = startX + (col * (cellW + gap)) + rowOffsetX;
            const baseY = startY + (row * (cellH + gap));
            const vecX = baseX - centerX;
            const vecY = baseY - centerY;

            layout.push({
                x: centerX + (vecX * spreadX),
                y: centerY + (vecY * spreadY),
                w: cellW, h: cellH, slotIndex: i
            });
        }
    } 
    // --- B. Circle Layout ---
    else if (pattern === 'circle') {
        const radius = (Math.min(w, h) / 3) * Math.max(spreadX, spreadY);
        const circumference = 2 * Math.PI * radius;
        const itemSize = Math.min(w/4, (circumference / count) - gap);
        
        for (let i = 0; i < count; i++) {
            const angle = (i / count) * Math.PI * 2 - (Math.PI / 2);
            layout.push({
                x: centerX + (Math.cos(angle) * radius * spreadX),
                y: centerY + (Math.sin(angle) * radius * spreadY),
                w: itemSize, h: itemSize / itemAspect, slotIndex: i
            });
        }
    }
    // --- C. Cinema Line ---
    else if (pattern === 'line_h' || pattern === 'line_v') {
        const isH = pattern === 'line_h';
        const itemSize = isH ? w / Math.max(2, count) : h / Math.max(2, count);
        const totalLen = (count * itemSize) + ((count - 1) * gap);
        const start = (isH ? centerX : centerY) - (totalLen / 2) + (itemSize / 2);

        for (let i = 0; i < count; i++) {
            const pos = start + (i * (itemSize + gap));
            layout.push({
                x: isH ? (centerX - (centerX - pos) * spreadX) : centerX,
                y: isH ? centerY : (centerY - (centerY - pos) * spreadY),
                w: itemSize, h: itemSize / itemAspect, slotIndex: i
            });
        }
    }
    // --- D. Scatter ---
    else if (pattern === 'scatter') {
        const pseudoRandom = (seed) => {
            const x = Math.sin(seed * 12.9898) * 43758.5453;
            return x - Math.floor(x);
        };
        const itemSize = Math.min(w, h) / 4;
        for (let i = 0; i < count; i++) {
            const rndX = (pseudoRandom(i) - 0.5) * 2; 
            const rndY = (pseudoRandom(i + 100) - 0.5) * 2; 
            layout.push({
                x: centerX + (rndX * (w/2.5) * spreadX),
                y: centerY + (rndY * (h/2.5) * spreadY),
                w: itemSize, h: itemSize / itemAspect, slotIndex: i
            });
        }
    }
    return layout;
};

// =========================================================
// 3. UI Control Injection
// =========================================================
const prevUpdateEffectControlsGrid = window.EditorApp.prototype.updateEffectControls;

window.EditorApp.prototype.updateEffectControls = function() {
    if (prevUpdateEffectControlsGrid) prevUpdateEffectControlsGrid.call(this);

    const panelArea = document.getElementById('pro-features-area');
    if (!panelArea || this.selectedClipIds.size !== 1) return;

    const clipId = Array.from(this.selectedClipIds)[0];
    const clip = this.tracks.flatMap(t => t.clips).find(c => c.id === clipId);
    if (!clip) return;

    ensureGridProperties(clip);
    syncGridOrder(clip);

    const g = clip.gridGallery;
    const baseCount = g.showMain ? 1 : 0;
    const totalItems = baseCount + (g.assets ? g.assets.length : 0);
    const autoDurationVal = clip.duration / Math.max(1, totalItems);
    const createOption = (val, label, current) => `<option value="${val}" ${current===val?'selected':''}>${label}</option>`;

    // --- Order List UI ---
    let orderListHTML = '<div class="flex gap-1 overflow-x-auto pb-4 pt-2 px-1 custom-scrollbar">';
    g.order.forEach((contentIndex, uiIndex) => {
        const isMain = g.showMain && contentIndex === 0;
        let label = g.labels[uiIndex] || (isMain ? "Main" : `Img ${contentIndex}`);
        if(label.length > 5) label = label.substring(0,4) + "..";

        let colorClass = isMain ? "bg-blue-600 border-blue-400" : "bg-gray-700 border-gray-500";
        const deleteBtn = !isMain ? `
            <button onclick="window.app.deleteGridAsset('${clipId}', ${uiIndex})" 
                class="absolute -top-2 -right-1 w-4 h-4 bg-red-500 hover:bg-red-600 rounded-full text-[8px] flex items-center justify-center text-white shadow-sm border border-gray-800 z-10 transition-transform hover:scale-110" title="Delete">
                <i class="fa-solid fa-times"></i>
            </button>
        ` : '';

        orderListHTML += `
            <div class="relative flex flex-col items-center gap-1 min-w-[50px] group">
                ${deleteBtn}
                <div class="w-10 h-10 rounded-lg flex items-center justify-center text-[9px] font-bold text-white border-2 ${colorClass} cursor-pointer shadow-md transition-all hover:brightness-110"
                     onclick="window.app.promptGridLabel('${clipId}', ${uiIndex})">
                    ${label}
                </div>
                <div class="flex gap-0.5 opacity-50 group-hover:opacity-100 transition-opacity">
                    <button onclick="window.app.moveGridItem('${clipId}', ${uiIndex}, -1)" class="w-4 h-4 bg-gray-800 hover:bg-gray-600 rounded text-[7px] text-gray-300"><i class="fa-solid fa-chevron-left"></i></button>
                    <button onclick="window.app.moveGridItem('${clipId}', ${uiIndex}, 1)" class="w-4 h-4 bg-gray-800 hover:bg-gray-600 rounded text-[7px] text-gray-300"><i class="fa-solid fa-chevron-right"></i></button>
                </div>
            </div>
        `;
    });
    orderListHTML += '</div>';

    const gridUI = `
    <div class="mt-4 border-t border-gray-700 pt-4">
        <div class="flex justify-between items-center mb-2">
            <h3 class="text-xs font-bold text-gray-400 uppercase flex items-center gap-2">
                <i class="fa-solid fa-border-all"></i> Smart Grid 
                <span class="text-[8px] bg-blue-900 text-blue-200 px-1 rounded">Ult</span>
            </h3>
            <button onclick="window.app.toggleGridMode('${clipId}')" 
                class="text-[9px] px-2 py-1 rounded font-bold transition-all ${g.enabled ? 'bg-green-600 text-white shadow-glow' : 'bg-gray-700 text-gray-400'}">
                ${g.enabled ? 'ON' : 'OFF'}
            </button>
        </div>

        ${g.enabled ? `
        <div class="space-y-3 animate-fade-in-up bg-gray-900/50 p-2 rounded border border-gray-700">
            
            <!-- Pattern & Shape -->
            <div class="grid grid-cols-2 gap-2">
                <div>
                    <label class="text-[9px] text-gray-400">Pattern</label>
                    <select class="w-full bg-gray-800 text-[10px] p-1 rounded border border-gray-600"
                        onchange="window.app.updateGridProp('${clipId}', 'pattern', this.value)">
                        ${createOption('grid', 'Smart Grid', g.pattern)}
                        ${createOption('circle', 'Orbit Circle', g.pattern)}
                        ${createOption('line_h', 'Cinema Line H', g.pattern)}
                        ${createOption('line_v', 'Cinema Line V', g.pattern)}
                        ${createOption('scatter', 'Random Scatter', g.pattern)}
                    </select>
                </div>
                <div>
                    <label class="text-[9px] text-gray-400">Shape</label>
                    <select class="w-full bg-gray-800 text-[10px] p-1 rounded border border-gray-600"
                        onchange="window.app.updateGridProp('${clipId}', 'shape', this.value)">
                        ${createOption('circle', 'Circle Bubble', g.shape)}
                        ${createOption('square', 'Rounded Square', g.shape)}
                        ${createOption('hexagon', 'Hexagon Tech', g.shape)}
                        ${createOption('strip_h', 'Wide Strip', g.shape)}
                        ${createOption('strip_v', 'Tall Strip', g.shape)}
                    </select>
                </div>
            </div>

            <!-- Upload & Order -->
            <label class="flex items-center justify-center w-full p-2 bg-gray-800 hover:bg-gray-700 rounded cursor-pointer border border-dashed border-gray-600 transition-colors">
                <span class="text-[10px] text-gray-300 flex items-center gap-2">
                    <i class="fa-solid fa-plus"></i> Add Images/Videos
                </span>
                <input type="file" multiple accept="image/*,video/*" class="hidden" 
                    onchange="window.app.handleGridAssets('${clipId}', this)">
            </label>
            
            <div class="bg-gray-800 p-2 rounded border border-gray-700">
                 <div class="flex justify-between items-center mb-1 border-b border-gray-700 pb-1">
                    <span class="text-[9px] text-gray-400">Manage Items (${totalItems})</span>
                    <div class="flex gap-3">
                        <label class="flex items-center gap-1 text-[9px] cursor-pointer text-blue-300 hover:text-white transition-colors" title="Include Original Video in Grid">
                            <input type="checkbox" ${g.showMain ? 'checked' : ''} 
                                onchange="window.app.updateGridProp('${clipId}', 'showMain', this.checked)"> 
                            Show Main
                        </label>
                        <label class="flex items-center gap-1 text-[9px] cursor-pointer text-gray-400 hover:text-white transition-colors">
                            <input type="checkbox" ${g.showLabels ? 'checked' : ''} 
                                onchange="window.app.updateGridProp('${clipId}', 'showLabels', this.checked)"> 
                            Labels
                        </label>
                    </div>
                </div>
                ${orderListHTML}
            </div>

            <!-- Focus & FX -->
            <div class="bg-gray-800 p-2 rounded border border-gray-700">
                <div class="grid grid-cols-2 gap-2 mb-2">
                    <div>
                        <label class="text-[9px] text-gray-400">Focus FX</label>
                        <select class="w-full bg-gray-900 text-[9px] p-1 rounded"
                            onchange="window.app.updateGridProp('${clipId}', 'focusEffect', this.value)">
                            ${createOption('none', 'None', g.focusEffect)}
                            ${createOption('blur', 'Blur Others', g.focusEffect)}
                            ${createOption('grayscale', 'B&W Passive', g.focusEffect)}
                            ${createOption('glow', 'Glow Active', g.focusEffect)}
                        </select>
                    </div>
                    <div>
                        <label class="text-[9px] text-gray-400">Entry Anim</label>
                        <select class="w-full bg-gray-900 text-[9px] p-1 rounded"
                            onchange="window.app.updateGridProp('${clipId}', 'entryAnim', this.value)">
                            ${createOption('pop', 'Staggered Pop', g.entryAnim)}
                            ${createOption('fly_in', 'Fly In', g.entryAnim)}
                            ${createOption('none', 'Instant', g.entryAnim)}
                        </select>
                    </div>
                </div>
                 <div class="flex items-center justify-between gap-2 mb-1">
                     <span class="text-[9px] text-gray-400">Background</span>
                     <input type="color" value="${g.bgColor}" class="w-4 h-4 border-0 p-0 rounded"
                        oninput="window.app.updateGridProp('${clipId}', 'bgColor', this.value)">
                     <input type="range" min="0" max="100" value="${g.bgOpacity}" class="w-10 h-1 bg-gray-900 rounded-lg"
                        oninput="window.app.updateGridProp('${clipId}', 'bgOpacity', this.value)">
                 </div>
                 <div class="flex items-center justify-between gap-2">
                     <span class="text-[9px] text-gray-400">Border Width</span>
                     <input type="number" min="0" max="20" value="${g.borderWidth}" 
                        class="w-8 bg-gray-900 text-[9px] p-0.5 rounded text-center"
                        oninput="window.app.updateGridProp('${clipId}', 'borderWidth', this.value)">
                     <input type="color" value="${g.borderColor}" class="w-4 h-4 border-0 p-0"
                        oninput="window.app.updateGridProp('${clipId}', 'borderColor', this.value)">
                 </div>
            </div>

            <!-- 🔥🔥 Scaling & Breathing 🔥🔥 -->
            <div class="bg-gray-800 p-2 rounded border border-gray-700">
                
                <!-- 1. Active Size -->
                <div class="flex justify-between text-[10px] text-gray-300 mb-1">
                    <span>Active Size (Focus)</span>
                    <span class="text-white font-mono" id="val-scale">x${g.activeScale}</span>
                </div>
                <input type="range" min="0.5" max="2.5" step="0.05" value="${g.activeScale}" 
                    class="w-full h-1 bg-gray-600 rounded-lg accent-pink-500 mb-3"
                    oninput="window.app.updateGridProp('${clipId}', 'activeScale', this.value)">

                <!-- 2. Passive Size + Shrink Toggle -->
                <div class="flex justify-between items-center mb-1">
                    <span class="text-[10px] text-gray-300">Passive Size (Resting)</span>
                    <span class="text-white font-mono" id="val-passive-scale">x${g.passiveScale}</span>
                </div>
                <div class="flex items-center gap-2 mb-1">
                    <input type="range" min="0.1" max="1.5" step="0.05" value="${g.passiveScale}" 
                        class="flex-1 h-1 bg-gray-600 rounded-lg accent-gray-400"
                        oninput="window.app.updateGridProp('${clipId}', 'passiveScale', this.value)">
                    
                    <!-- 🔥 Toggle Restored 🔥 -->
                    <label class="flex items-center gap-1 text-[8px] text-blue-300 cursor-pointer border border-gray-600 p-1 rounded hover:bg-gray-700" title="Neighbors shrink when active expands">
                        <input type="checkbox" ${g.shrinkPassive ? 'checked' : ''} 
                            onchange="window.app.updateGridProp('${clipId}', 'shrinkPassive', this.checked)"> 
                        Shrink
                    </label>
                </div>

                <!-- Spacing -->
                <div class="flex justify-between text-[10px] text-gray-400 mb-1 mt-2 border-t border-gray-700 pt-2">
                    <span>Spread X / Y</span>
                </div>
                <div class="flex gap-2">
                    <input type="range" min="0.5" max="3.0" step="0.1" value="${g.spreadX}" class="w-1/2 h-1 bg-gray-700 accent-blue-500"
                        oninput="window.app.updateGridProp('${clipId}', 'spreadX', this.value)">
                    <input type="range" min="0.5" max="3.0" step="0.1" value="${g.spreadY}" class="w-1/2 h-1 bg-gray-700 accent-blue-500"
                        oninput="window.app.updateGridProp('${clipId}', 'spreadY', this.value)">
                </div>
            </div>

            <!-- Timing -->
            <div class="bg-gray-800 p-2 rounded border border-gray-700 mt-2">
                <div class="flex justify-between items-center">
                    <button onclick="window.app.updateGridMode('${clipId}', 'auto')" class="text-[9px] px-2 py-0.5 rounded ${g.durationMode==='auto'?'bg-green-600':'bg-gray-700'}">Auto</button>
                    <span class="text-[9px] text-gray-300">
                        ${g.durationMode === 'auto' ? `~${autoDurationVal.toFixed(1)}s / item` : `Manual Speed`}
                    </span>
                    <button onclick="window.app.updateGridMode('${clipId}', 'manual')" class="text-[9px] px-2 py-0.5 rounded ${g.durationMode==='manual'?'bg-green-600':'bg-gray-700'}">Manual</button>
                </div>
                ${g.durationMode === 'manual' ? `
                    <input type="range" min="0.5" max="5" step="0.1" value="${g.speed}" class="w-full h-1 mt-2 bg-gray-700 accent-green-500"
                    oninput="window.app.updateGridProp('${clipId}', 'speed', this.value)">
                `:''}
            </div>
        </div>
        ` : ''}
    </div>
    `;

    const div = document.createElement('div');
    div.innerHTML = gridUI;
    panelArea.appendChild(div);
};

// =========================================================
// 4. وظائف التحكم (Actions)
// =========================================================
window.EditorApp.prototype.toggleGridMode = function(clipId) {
    const clip = this.tracks.flatMap(t => t.clips).find(c => c.id === clipId);
    if (clip) {
        ensureGridProperties(clip);
        clip.gridGallery.enabled = !clip.gridGallery.enabled;
        if(clip.gridGallery.enabled) {
            clip.frame = clip.frame || {}; clip.frame.type = 'none';
        }
        this.renderFrameToCanvas();
        this.updateEffectControls();
    }
};

window.EditorApp.prototype.updateGridMode = function(clipId, mode) {
    const clip = this.tracks.flatMap(t => t.clips).find(c => c.id === clipId);
    if (clip) { clip.gridGallery.durationMode = mode; this.updateEffectControls(); }
};

window.EditorApp.prototype.updateGridProp = function(clipId, prop, value) {
    const clip = this.tracks.flatMap(t => t.clips).find(c => c.id === clipId);
    if (clip) {
        const numProps = ['speed', 'gap', 'spreadX', 'spreadY', 'activeScale', 'passiveScale', 'bgOpacity', 'borderWidth'];
        if (numProps.includes(prop)) {
            clip.gridGallery[prop] = parseFloat(value);
        } else if (['showLabels', 'showMain', 'shrinkPassive'].includes(prop)) {
            clip.gridGallery[prop] = value; 
            if (prop === 'showMain') {
                clip.gridGallery.order = []; 
                syncGridOrder(clip);
                clip.gridGallery.layout = null;
                this.updateEffectControls();
            }
        } else {
            clip.gridGallery[prop] = value;
        }

        if (['pattern', 'shape', 'gap', 'spreadX', 'spreadY'].includes(prop)) {
            clip.gridGallery.layout = null;
        }

        const valId = prop === 'activeScale' ? 'val-scale' : (prop === 'passiveScale' ? 'val-passive-scale' : null);
        if(valId) document.getElementById(valId).innerText = `x${clip.gridGallery[prop]}`;

        this.renderFrameToCanvas();
        if(['pattern', 'shape'].includes(prop)) this.updateEffectControls();
    }
};

window.EditorApp.prototype.deleteGridAsset = function(clipId, uiIndex) {
    const clip = this.tracks.flatMap(t => t.clips).find(c => c.id === clipId);
    if (!clip) return;
    
    const g = clip.gridGallery;
    const contentIndex = g.order[uiIndex];
    const offset = g.showMain ? 1 : 0;
    const assetIndex = contentIndex - offset;

    if (g.showMain && contentIndex === 0) {
        alert("Use 'Show Main' checkbox to hide the original source.");
        return;
    }

    if (assetIndex >= 0 && assetIndex < g.assets.length) {
        g.assets.splice(assetIndex, 1);
        g.order = []; 
        g.layout = null;
        syncGridOrder(clip);

        this.renderFrameToCanvas();
        this.updateEffectControls();
    }
};

window.EditorApp.prototype.promptGridLabel = function(clipId, index) {
    const clip = this.tracks.flatMap(t => t.clips).find(c => c.id === clipId);
    if (!clip) return;
    const current = clip.gridGallery.labels[index] || "";
    const newVal = prompt("Enter label text:", current);
    if (newVal !== null) {
        clip.gridGallery.labels[index] = newVal;
        this.renderFrameToCanvas();
        this.updateEffectControls();
    }
};

window.EditorApp.prototype.moveGridItem = function(clipId, index, dir) {
    const clip = this.tracks.flatMap(t => t.clips).find(c => c.id === clipId);
    if (!clip) return;
    const g = clip.gridGallery;
    const newIdx = index + dir;
    if (newIdx >= 0 && newIdx < g.order.length) {
        [g.order[index], g.order[newIdx]] = [g.order[newIdx], g.order[index]];
        if(g.labels[index] && g.labels[newIdx]) {
            [g.labels[index], g.labels[newIdx]] = [g.labels[newIdx], g.labels[index]];
        }
        this.renderFrameToCanvas();
        this.updateEffectControls();
    }
};

window.EditorApp.prototype.handleGridAssets = function(clipId, input) {
    if (!input.files.length) return;
    const clip = this.tracks.flatMap(t => t.clips).find(c => c.id === clipId);
    if (!clip) return;
    ensureGridProperties(clip);
    
    Array.from(input.files).forEach(file => {
        if (file.type.startsWith('video')) {
            const video = document.createElement('video');
            video.src = URL.createObjectURL(file);
            video.muted = true;
            video.loop = true;
            video.onloadeddata = () => video.play(); 
            clip.gridGallery.assets.push({ type: 'video', el: video });
        } else {
            const img = new Image();
            img.src = URL.createObjectURL(file);
            clip.gridGallery.assets.push({ type: 'image', el: img });
        }
    });
    
    clip.gridGallery.order = [];
    clip.gridGallery.layout = null;
    syncGridOrder(clip);
    
    this.renderFrameToCanvas();
    this.updateEffectControls();
};

// =========================================================
// 5. Drawing Engine (محرك الرسم)
// =========================================================
const prevDrawClipContentGrid = window.EditorApp.prototype.drawClipContent;

window.EditorApp.prototype.drawClipContent = function(ctx, clip, track, w, h) {
    if (clip.gridGallery && clip.gridGallery.enabled) {
        this.drawGridScene(ctx, clip, w, h);
    } else {
        prevDrawClipContentGrid.call(this, ctx, clip, track, w, h);
    }
};

window.EditorApp.prototype.drawGridScene = function(ctx, clip, w, h) {
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

    g.layout.forEach((cell, slotIndex) => {
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

        // 🔥🔥 Logic Update: Interpolation + Shrinking 🔥🔥
        let scale = 1;
        if (isActive) {
             // Active expands from Passive to Active
             scale = g.passiveScale + ((g.activeScale - g.passiveScale) * zoomFactor);
        } else {
             // Passive behavior
             if (g.shrinkPassive) {
                 // Shrink down by 15% when neighbor is fully active
                 // Starts at passiveScale, goes down
                 scale = g.passiveScale - (g.passiveScale * 0.15 * zoomFactor);
             } else {
                 // Stay perfectly still
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

function drawCell(ctx, app, clip, item, cell, scale, isActive, offset, label) {
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
            const player = app.players.find(p => p.getAttribute('data-key') === key);
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