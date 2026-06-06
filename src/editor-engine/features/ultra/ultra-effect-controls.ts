// @ts-nocheck
// ultra-effect-controls.ts — Effect Controls panel HTML generation, AI toggle, property updates

// UI Helpers (Toggle AI, etc)
const prevUpdateEffectControls = window.EditorApp.prototype.updateEffectControls;
window.EditorApp.prototype.updateEffectControls = function() {
    if(prevUpdateEffectControls) prevUpdateEffectControls.call(this);
    const panel = document.getElementById('effect-controls-content');
    if (!panel) return;

    // ✅ Same smart group logic as pro_features: handle video+audio groupId pairs
    let clipId = null;
    if (this.selectedClipIds.size === 1) {
        clipId = Array.from(this.selectedClipIds)[0];
    } else if (this.selectedClipIds.size > 1) {
        const allSelected = Array.from(this.selectedClipIds)
            .map(id => this.findClipById(id))
            .filter(Boolean);
        const groupIds = [...new Set(allSelected.map(c => c.groupId).filter(Boolean))];
        if (groupIds.length === 1) {
            const primary = allSelected.find(c => c.type === 'video')
                         || allSelected.find(c => c.type === 'image')
                         || allSelected.find(c => c.type !== 'audio');
            if (primary) clipId = primary.id;
        }
    }
    if (!clipId) return;

    const clip = this.findClipById(clipId);
    if (!clip || clip.type === 'audio' || clip.type === 'text') return; 

    if(document.getElementById('ultra-controls-group')) return;

    const createRange = (label, objName, prop, min, max, unit) => `
        <div class="flex items-center justify-between mb-2">
            <label class="text-[10px] text-gray-400 w-16">${label}</label>
            <div class="flex items-center gap-2 flex-1">
                <input type="range" min="${min}" max="${max}" value="${clip[objName][prop]}" 
                    class="w-full h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer range-sm"
                    oninput="app.updateUltraProp('${clipId}', '${objName}', '${prop}', this.value)">
                <span class="text-[9px] text-gray-500 w-6 text-right">${unit}</span>
            </div>
        </div>`;

    const frameHTML = clip.src && clip.src.includes('frame_') ? `
    <div id="smart-frame-controls-group" class="mb-3 pb-3 mt-1 bg-pink-900/20 p-3 rounded-lg border-2 border-pink-700 border-dashed transition-colors"
        ondragover="event.preventDefault(); this.classList.add('bg-pink-900/60', 'border-pink-400');"
        ondragleave="this.classList.remove('bg-pink-900/60', 'border-pink-400');"
        ondrop="event.preventDefault(); this.classList.remove('bg-pink-900/60', 'border-pink-400'); const data = event.dataTransfer.getData('text/plain'); if(data) { try { const d = JSON.parse(data); if(d.type==='image' || d.type==='video') { const c = app.findClipById('${clipId}'); c.properties.innerMediaType = d.type; c.properties.innerMediaSrc = d.src; app.fitMediaToFrame('${clipId}', 'fill'); if(d.type==='video' && d.src){ const tv=document.createElement('video'); tv.preload='metadata'; tv.src=d.src; tv.onloadedmetadata=()=>{ if(isFinite(tv.duration)&&tv.duration>0){ app.stretchClipDuration('${clipId}', tv.duration); } }; } app.commitStateToReact(); app.requestRedraw(); app.updateEffectControls(); } } catch(e){} }">

        <h4 class="font-bold text-[13px] text-pink-400 mb-2 flex items-center justify-between">
            <span><i class="fa-solid fa-mobile-screen mr-1"></i> Frame Media</span>
        </h4>
        <div class="flex flex-col gap-2 mb-3">
            <button class="w-full bg-purple-800 hover:bg-purple-600 text-xs py-2 rounded-lg border border-gray-600 transition-colors flex items-center justify-center gap-2 font-bold shadow-lg"
                onclick="const f = document.createElement('input'); f.type='file'; f.accept='image/*,video/*'; f.onchange = (e) => app.handleFrameUpload(e, app.findClipById('${clipId}')); f.click();">
                <i class="fa-solid fa-upload text-sm"></i> Upload Media Here
            </button>
            <div class="text-[10px] text-center text-pink-300 opacity-70">Or Drop Image/Video from Library Here</div>
        </div>
        <div class="flex gap-2">
            <button class="flex-1 bg-gray-800 hover:bg-pink-600 text-[10px] py-1.5 rounded border border-gray-600 transition-colors"
                onclick="app.fitMediaToFrame('${clipId}', 'fill')">
                <i class="fa-solid fa-expand"></i> Stretch
            </button>
            <button class="flex-1 bg-gray-800 hover:bg-pink-600 text-[10px] py-1.5 rounded border border-gray-600 transition-colors"
                onclick="app.fitMediaToFrame('${clipId}', 'crop')">
                <i class="fa-solid fa-crop"></i> Crop
            </button>
            <button class="flex-1 bg-gray-800 hover:bg-pink-600 text-[10px] py-1.5 rounded border border-gray-600 transition-colors"
                onclick="app.fitMediaToFrame('${clipId}', 'fit')">
                <i class="fa-solid fa-compress"></i> Fit
            </button>
        </div>
        ${clip.properties.innerMediaSrc ? `
        <div class="h-[1px] bg-pink-700/50 w-full my-3"></div>
        <div class="flex items-center justify-between mb-2">
            <label class="text-[10px] text-pink-300 w-16">Pan X</label>
            <div class="flex items-center gap-2 flex-1">
                <input type="range" min="-1000" max="1000" value="${clip.properties.innerOffsetX || 0}" 
                    class="w-full h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer range-sm accent-pink-500"
                    oninput="app.updateUltraProp('${clipId}', 'properties', 'innerOffsetX', this.value)">
            </div>
        </div>
        <div class="flex items-center justify-between mb-1">
            <label class="text-[10px] text-pink-300 w-16">Pan Y</label>
            <div class="flex items-center gap-2 flex-1">
                <input type="range" min="-1000" max="1000" value="${clip.properties.innerOffsetY || 0}" 
                    class="w-full h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer range-sm accent-pink-500"
                    oninput="app.updateUltraProp('${clipId}', 'properties', 'innerOffsetY', this.value)">
            </div>
        </div>
        <div class="flex items-center justify-between mb-1">
            <label class="text-[10px] text-pink-300 w-16" title="Screen Corner Radius">Corners</label>
            <div class="flex items-center gap-2 flex-1">
                <input type="range" min="0" max="0.5" step="0.01" value="${clip.properties.innerBorderRadius !== undefined ? clip.properties.innerBorderRadius : (clip.src.includes('frame_real') ? 0.06 : 0.0)}" 
                    class="w-full h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer range-sm accent-pink-500"
                    oninput="app.updateUltraProp('${clipId}', 'properties', 'innerBorderRadius', this.value); app.requestRedraw();">
            </div>
        </div>
        <div class="flex items-center justify-between mb-1">
            <label class="text-[10px] text-pink-300 w-16" title="Scale Width">Size X</label>
            <div class="flex items-center gap-2 flex-1">
                <input type="range" min="80" max="120" step="0.5" value="${clip.properties.innerScaleX || 100}" 
                    class="w-full h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer range-sm accent-pink-500"
                    oninput="app.updateUltraProp('${clipId}', 'properties', 'innerScaleX', this.value); app.requestRedraw();">
            </div>
        </div>
        <div class="flex items-center justify-between mb-1">
            <label class="text-[10px] text-pink-300 w-16" title="Scale Height">Size Y</label>
            <div class="flex items-center gap-2 flex-1">
                <input type="range" min="80" max="120" step="0.5" value="${clip.properties.innerScaleY || 100}" 
                    class="w-full h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer range-sm accent-pink-500"
                    oninput="app.updateUltraProp('${clipId}', 'properties', 'innerScaleY', this.value); app.requestRedraw();">
            </div>
        </div>
        <div class="flex items-center justify-between mb-1 mt-2">
            <label class="text-[10px] text-pink-300 w-16" title="Smart Fit Mode">Fit Mode</label>
            <div class="flex items-center gap-2 flex-1">
                <select class="w-full bg-gray-800 text-[10px] text-white p-1 rounded border border-gray-600"
                    onchange="app.updateUltraProp('${clipId}', 'properties', 'innerFitMode', this.value); app.requestRedraw();">
                    <option value="standard" ${clip.properties.innerFitMode === 'standard' || !clip.properties.innerFitMode ? 'selected' : ''}>Standard Fit</option>
                    <option value="smart" ${clip.properties.innerFitMode === 'smart' ? 'selected' : ''}>Smart Curved Mask</option>
                    <option value="tight" ${clip.properties.innerFitMode === 'tight' ? 'selected' : ''}>Tight (No Bleed)</option>
                </select>
            </div>
        </div>
        <div class="flex items-center gap-2 mb-2 mt-2">
            <button class="flex-1 bg-gray-800 hover:bg-gray-700 text-[10px] py-1 rounded border border-gray-600 ${clip.properties.innerFlipX ? 'ring-1 ring-blue-500 bg-blue-900/30' : ''}"
                onclick="app.updateUltraProp('${clipId}', 'properties', 'innerFlipX', ${!clip.properties.innerFlipX}); app.fitMediaToFrame('${clipId}', '${clip.properties.innerMode || 'fill'}');">
                <i class="fa-solid fa-arrows-left-right"></i> Flip H
            </button>
            <button class="flex-1 bg-gray-800 hover:bg-gray-700 text-[10px] py-1 rounded border border-gray-600 ${clip.properties.innerFlipY ? 'ring-1 ring-blue-500 bg-blue-900/30' : ''}"
                onclick="app.updateUltraProp('${clipId}', 'properties', 'innerFlipY', ${!clip.properties.innerFlipY}); app.fitMediaToFrame('${clipId}', '${clip.properties.innerMode || 'fill'}');">
                <i class="fa-solid fa-arrows-up-down"></i> Flip V
            </button>
        </div>
        <div class="flex items-center justify-between mb-1">
            <label class="text-[10px] text-pink-300 w-16">Rotate</label>
            <div class="flex gap-1 flex-1">
                <button class="flex-1 ${clip.properties.innerRotation === 0 || !clip.properties.innerRotation ? 'bg-pink-600' : 'bg-gray-700 hover:bg-gray-600'} text-[10px] py-1 rounded transition-colors" onclick="app.updateUltraProp('${clipId}', 'properties', 'innerRotation', 0); app.fitMediaToFrame('${clipId}', '${clip.properties.innerMode || 'fill'}');">0°</button>
                <button class="flex-1 ${clip.properties.innerRotation === 90 ? 'bg-pink-600' : 'bg-gray-700 hover:bg-gray-600'} text-[10px] py-1 rounded transition-colors" onclick="app.updateUltraProp('${clipId}', 'properties', 'innerRotation', 90); app.fitMediaToFrame('${clipId}', '${clip.properties.innerMode || 'fill'}');">90°</button>
                <button class="flex-1 ${clip.properties.innerRotation === 180 ? 'bg-pink-600' : 'bg-gray-700 hover:bg-gray-600'} text-[10px] py-1 rounded transition-colors" onclick="app.updateUltraProp('${clipId}', 'properties', 'innerRotation', 180); app.fitMediaToFrame('${clipId}', '${clip.properties.innerMode || 'fill'}');">180°</button>
                <button class="flex-1 ${clip.properties.innerRotation === 270 ? 'bg-pink-600' : 'bg-gray-700 hover:bg-gray-600'} text-[10px] py-1 rounded transition-colors" onclick="app.updateUltraProp('${clipId}', 'properties', 'innerRotation', 270); app.fitMediaToFrame('${clipId}', '${clip.properties.innerMode || 'fill'}');">270°</button>
            </div>
        </div>
        
        <div class="h-[1px] bg-pink-900 w-full my-3"></div>
        <h4 class="font-bold text-[11px] text-pink-400 mb-2 flex items-center justify-between">
            <span><i class="fa-solid fa-heart mr-1"></i> Social Media Overlay</span>
        </h4>
        
        <div class="flex items-center justify-between mb-2">
            <select class="w-full bg-gray-800 text-[10px] text-white p-1 rounded border border-gray-600"
                onchange="app.updateUltraProp('${clipId}', 'properties', 'overlayUI', this.value)">
                <option value="none" ${clip.properties.overlayUI === 'none' || !clip.properties.overlayUI ? 'selected' : ''}>None</option>
                <option value="tiktok" ${clip.properties.overlayUI === 'tiktok' ? 'selected' : ''}>TikTok UI</option>
                <option value="instagram" ${clip.properties.overlayUI === 'instagram' ? 'selected' : ''}>Instagram Reels UI</option>
                <option value="youtube" ${clip.properties.overlayUI === 'youtube' ? 'selected' : ''}>YouTube UI</option>
            </select>
        </div>
        
        ${clip.properties.overlayUI && clip.properties.overlayUI !== 'none' ? `
            <div class="space-y-2 mt-2 bg-pink-900/20 p-2 rounded border border-pink-900/50">
                <div class="flex items-center justify-between">
                    <label class="text-[9px] text-pink-300 w-16">Likes</label>
                    <input type="text" value="${clip.properties.uiLikes || '1.2M'}" 
                        onchange="app.updateUltraProp('${clipId}', 'properties', 'uiLikes', this.value)"
                        class="flex-1 bg-gray-800 text-[10px] text-white px-2 py-1 rounded border border-gray-600">
                </div>
                <div class="flex items-center justify-between">
                    <label class="text-[9px] text-pink-300 w-16">Comments</label>
                    <input type="text" value="${clip.properties.uiComments || '45K'}" 
                        onchange="app.updateUltraProp('${clipId}', 'properties', 'uiComments', this.value)"
                        class="flex-1 bg-gray-800 text-[10px] text-white px-2 py-1 rounded border border-gray-600">
                </div>
                ${clip.properties.overlayUI === 'tiktok' || clip.properties.overlayUI === 'instagram' ? `
                <div class="flex items-center justify-between">
                    <label class="text-[9px] text-pink-300 w-16">Shares</label>
                    <input type="text" value="${clip.properties.uiShares || '12K'}" 
                        onchange="app.updateUltraProp('${clipId}', 'properties', 'uiShares', this.value)"
                        class="flex-1 bg-gray-800 text-[10px] text-white px-2 py-1 rounded border border-gray-600">
                </div>
                <div class="flex items-center justify-between">
                    <label class="text-[9px] text-pink-300 w-16">Username</label>
                    <input type="text" value="${clip.properties.uiUsername || '@username'}" 
                        onchange="app.updateUltraProp('${clipId}', 'properties', 'uiUsername', this.value)"
                        class="flex-1 bg-gray-800 text-[10px] text-white px-2 py-1 rounded border border-gray-600">
                </div>
                <div class="flex items-center justify-between">
                    <label class="text-[9px] text-pink-300 w-16">Desc.</label>
                    <input type="text" value="${clip.properties.uiDescription || 'Check out this awesome video! #viral'}" 
                        onchange="app.updateUltraProp('${clipId}', 'properties', 'uiDescription', this.value)"
                        class="flex-1 bg-gray-800 text-[10px] text-white px-2 py-1 rounded border border-gray-600">
                </div>
                ` : ''}
                ${clip.properties.overlayUI === 'youtube' ? `
                <div class="flex items-center justify-between">
                    <label class="text-[9px] text-pink-300 w-16">Channel</label>
                    <input type="text" value="${clip.properties.uiUsername || 'Channel Name'}" 
                        onchange="app.updateUltraProp('${clipId}', 'properties', 'uiUsername', this.value)"
                        class="flex-1 bg-gray-800 text-[10px] text-white px-2 py-1 rounded border border-gray-600">
                </div>
                <div class="flex items-center justify-between">
                    <label class="text-[9px] text-pink-300 w-16">Subs</label>
                    <input type="text" value="${clip.properties.uiDescription || '1.5M Subscribers'}" 
                        onchange="app.updateUltraProp('${clipId}', 'properties', 'uiDescription', this.value)"
                        class="flex-1 bg-gray-800 text-[10px] text-white px-2 py-1 rounded border border-gray-600">
                </div>
                ` : ''}
            </div>
        ` : ''}
        ` : ''}
    </div>` : '';

    const ultraHTML = `
    <div id="ultra-controls-group" class="mb-3 border-b border-gray-700 pb-2 mt-2 bg-gray-900/50 p-2 rounded border border-gray-700">
        <h4 class="font-bold text-xs text-cyan-400 mb-2 flex items-center justify-between">
            <span><i class="fa-solid fa-microchip mr-1"></i> GPU Pipeline</span>
            <span class="text-[9px] bg-cyan-900 text-cyan-300 px-1 rounded">ACTIVE</span>
        </h4>
        <h4 class="font-bold text-xs text-purple-400 mb-2 flex items-center justify-between">
            <span><i class="fa-solid fa-brain mr-1"></i> AI Removal</span>
            <input type="checkbox" ${clip.aiSegmentation.enabled ? 'checked' : ''} 
                onchange="app.toggleAI('${clipId}', this.checked)"
                class="accent-purple-500 cursor-pointer">
        </h4>
        <h4 class="font-bold text-xs text-green-400 mb-2 flex items-center justify-between">
            <span><i class="fa-solid fa-users-viewfinder mr-1"></i> Chroma Key</span>
            <input type="checkbox" ${clip.chromaKey.enabled ? 'checked' : ''} 
                onchange="app.updateUltraProp('${clipId}', 'chromaKey', 'enabled', this.checked)"
                class="accent-green-500 cursor-pointer">
        </h4>
        ${clip.chromaKey.enabled ? `
            <div class="flex items-center justify-between mb-2">
                <label class="text-[10px] text-gray-400 w-16">Key Color</label>
                <input type="color" value="${clip.chromaKey.color}" 
                    onchange="app.updateUltraProp('${clipId}', 'chromaKey', 'color', this.value)"
                    class="w-full h-6 bg-transparent border-0 cursor-pointer">
            </div>
            ${createRange('Threshold', 'chromaKey', 'threshold', 0, 150, '')}
        ` : ''}
        
        <div class="h-[1px] bg-gray-700 w-full my-3"></div>
        <h4 class="font-bold text-xs text-yellow-400 mb-2 flex items-center justify-between">
            <span><i class="fa-solid fa-gauge mr-1"></i> Speed & Transform</span>
        </h4>
        <div class="flex items-center justify-between mb-2">
            <label class="text-[10px] text-gray-400 w-16">Speed</label>
            <div class="flex items-center gap-2 flex-1">
                <input type="range" min="0.1" max="5" step="0.1" value="${clip.properties.playbackSpeed || 1}" 
                    class="w-full h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer range-sm"
                    oninput="app.updateUltraProp('${clipId}', 'properties', 'playbackSpeed', parseFloat(this.value))">
                <span class="text-[9px] text-gray-500 w-6 text-right">${clip.properties.playbackSpeed || 1}x</span>
            </div>
        </div>
        <div class="flex items-center gap-2 mb-2">
            <button class="flex-1 bg-gray-800 hover:bg-gray-700 text-[10px] py-1 rounded border border-gray-600 ${clip.properties.flipX ? 'ring-1 ring-blue-500 bg-blue-900/30' : ''}"
                onclick="app.updateUltraProp('${clipId}', 'properties', 'flipX', ${!clip.properties.flipX})">
                <i class="fa-solid fa-arrows-left-right"></i> Flip H
            </button>
            <button class="flex-1 bg-gray-800 hover:bg-gray-700 text-[10px] py-1 rounded border border-gray-600 ${clip.properties.flipY ? 'ring-1 ring-blue-500 bg-blue-900/30' : ''}"
                onclick="app.updateUltraProp('${clipId}', 'properties', 'flipY', ${!clip.properties.flipY})">
                <i class="fa-solid fa-arrows-up-down"></i> Flip V
            </button>
        </div>
    </div>`;
    if(frameHTML) panel.insertAdjacentHTML('afterbegin', frameHTML);
    panel.insertAdjacentHTML('beforeend', ultraHTML);
};

window.EditorApp.prototype.toggleAI = async function(clipId, enabled) {
    const clip = this.findClipById(clipId);
    if (!clip) return;
    clip.aiSegmentation.enabled = enabled;
    if (enabled) {
        if (!this.aiWorker) {
            const success = await this.initAIModel();
            if (!success) {
                clip.aiSegmentation.enabled = false;
                this.updateEffectControls();
                return;
            }
        }
    }
    this.requestRedraw();
};

window.EditorApp.prototype.updateUltraProp = function(clipId, objName, prop, value) {
    const clip = this.findClipById(clipId);
    if(!clip) return;
    
    if (objName === 'blendMode' || (prop === 'blendMode' && objName === null)) {
        clip.blendMode = value;
    } else if (objName === 'chromaKey' && prop === 'enabled') {
        clip.chromaKey.enabled = value;
    } else {
        clip[objName][prop] = (typeof value === 'boolean' || prop === 'type' || prop === 'color' || prop === 'overlayUI' || prop.startsWith('ui')) ? value : parseFloat(value);
    }
    
    if ((objName === 'mask' && prop === 'type') || (objName === 'chromaKey' && prop === 'enabled') || prop === 'flipX' || prop === 'flipY' || prop === 'overlayUI') {
        this.updateEffectControls();
    }
    this.commitStateToReact();
    this.requestRedraw();
};

