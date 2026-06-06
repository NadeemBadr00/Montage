// @ts-nocheck
// bubble_feature.ts — UI controls: updateEffectControls patch + action methods

import { ensureBubbleProperties } from './bubble_renderer';

// 3. حقن واجهة التحكم
const prevUpdateEffectControlsBubble = window.EditorApp.prototype.updateEffectControls;

window.EditorApp.prototype.updateEffectControls = function() {
    if (prevUpdateEffectControlsBubble) {
        prevUpdateEffectControlsBubble.call(this);
    }

    const panelArea = document.getElementById('pro-features-area');
    if (!panelArea) return;
    // ✅ Smart group: handle video+audio groupId pair
    let clipId = null;
    if (this.selectedClipIds.size === 1) {
        clipId = Array.from(this.selectedClipIds)[0];
    } else if (this.selectedClipIds.size > 1) {
        const allSel = Array.from(this.selectedClipIds).map(id => this.tracks.flatMap(t => t.clips).find(c => c.id === id)).filter(Boolean);
        const grpIds = [...new Set(allSel.map(c => c.groupId).filter(Boolean))];
        if (grpIds.length === 1) {
            const p = allSel.find(c => c.type === 'video') || allSel.find(c => c.type !== 'audio');
            if (p) clipId = p.id;
        }
    }
    if (!clipId) return;

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
