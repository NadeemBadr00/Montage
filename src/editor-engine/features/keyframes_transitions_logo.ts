// @ts-nocheck
// keyframes_transitions_logo.ts — Keyframe UI, apply-to-all, transitions panel, logo/object remover

export const injectKeyframesTransitions = () => {

window.EditorApp.prototype.addKeyframeUI = function(clipId, prop) {
    const clip = this.findClipById(clipId);
    if (!clip) return;
    if(window.app)window.app.ensureProProperties(clip);
    const timeRelative = this.currentTime - clip.start;
    let currentVal = clip.properties[prop];
    clip.addKeyframe(prop, timeRelative, currentVal);
    this.log(`💎 Keyframe added for ${prop} at ${timeRelative.toFixed(1)}s`);
    this.requestRedraw();
};

window.EditorApp.prototype.applyAttributesToAll = function(sourceClipId, mode) {
    const sourceClip = this.findClipById(sourceClipId);
    if (!sourceClip) return;
    const track = this.tracks.find(t => t.id === sourceClip.trackId);
    if (!track) return;

    // BUG #3 FIX: save undo state before mutating all clips
    this.saveState();
    const styleSnapshot = {
        type: sourceClip.type,
        properties: { ...sourceClip.properties },
        transitions: { ...sourceClip.transitions }
    };
    if (sourceClip.sandwich) {
        styleSnapshot.sandwich = {
            scale: sourceClip.sandwich._rawScale !== undefined ? sourceClip.sandwich._rawScale : sourceClip.sandwich.scale,
            offsetX: sourceClip.sandwich._rawOffsetX !== undefined ? sourceClip.sandwich._rawOffsetX : sourceClip.sandwich.offsetX,
            offsetY: sourceClip.sandwich._rawOffsetY !== undefined ? sourceClip.sandwich._rawOffsetY : sourceClip.sandwich.offsetY
        };
    }
    if (sourceClip.type === 'text') {
        styleSnapshot.textStyle = { ...sourceClip.textStyle };
    }
    track.defaultStyle = JSON.parse(JSON.stringify(styleSnapshot));
    this.log(`💾 Track Defaults Saved for ${sourceClip.type}s`);
    track.clips.forEach(targetClip => {
        if (targetClip.id === sourceClipId) return; 
        if (mode === 'text_only' && targetClip.type === 'text') {
            Object.assign(targetClip.properties, styleSnapshot.properties);
            Object.assign(targetClip.transitions, styleSnapshot.transitions);
            Object.assign(targetClip.textStyle, styleSnapshot.textStyle);
        } 
        else if (mode === 'image' && (targetClip.type === 'image' || targetClip.type === 'video')) {
            Object.assign(targetClip.properties, styleSnapshot.properties);
            Object.assign(targetClip.transitions, styleSnapshot.transitions);
            if (styleSnapshot.sandwich) { targetClip.sandwich = null; }
        }
        else if (mode === 'subtitle_only' && targetClip.type === 'text') {
             Object.assign(targetClip.textStyle, styleSnapshot.textStyle);
             Object.assign(targetClip.properties, styleSnapshot.properties); 
        }
        if(window.app)window.app.ensureProProperties(targetClip);
    });
    this.requestRedraw();
    // BUG #3 FIX: sync Zustand so React re-renders the timeline with the new styles
    this.commitStateToReact();
    this.log(`✨ Applied style to all ${mode.replace('_', ' ')} clips on ${track.name}`);
};

// The following export functions have been moved to src/editor-engine/features/video_export.ts
// exportToMP4, startCanvasRecording, downloadBlob

window.EditorApp.prototype.renderTransitionEffectControls = function(panel, trans, trackId) {
    const createSelect = (label, prop, options) => {
        let optsHtml = options.map(opt => `<option value="${opt.value}" ${trans[prop] === opt.value ? 'selected' : ''}>${opt.label}</option>`).join('');
        return `
        <div class="flex items-center justify-between mb-3">
            <label class="text-[10px] text-gray-400 w-20 flex-shrink-0">${label}</label>
            <select class="flex-1 bg-[#050811] text-[10px] text-gray-200 rounded border border-gray-700 px-2 py-1 outline-none focus:border-orange-500 transition-colors cursor-pointer"
                onchange="app.updateTransitionProp('${trans.id}', '${prop}', this.value, '${trackId}')">
                ${optsHtml}
            </select>
        </div>`;
    };

    const createNumberInput = (label, prop, min, max, step) => {
        const numId = `numInput_${prop}_${trans.id}`;
        const rangeId = `rangeInput_${prop}_${trans.id}`;
        return `
        <div class="mb-3 flex items-center justify-between gap-3">
            <label class="text-[10px] text-gray-400 w-20 flex-shrink-0">${label}</label>
            <div class="flex-grow flex items-center gap-2">
                <input type="range" id="${rangeId}" min="${min}" max="${max}" step="${step}" value="${trans[prop]}" 
                    class="w-full h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer range-sm accent-orange-500"
                    oninput="app.updateTransitionProp('${trans.id}', '${prop}', parseFloat(this.value), '${trackId}'); document.getElementById('${numId}').value = this.value;">
                <div class="flex items-center gap-1 w-16 justify-end flex-shrink-0">
                    <input type="number" id="${numId}" value="${trans[prop]}" min="${min}" max="${max}" step="${step}" lang="en" dir="ltr"
                        class="bg-[#050811] border border-gray-700 rounded text-[10px] text-gray-200 w-12 py-0.5 text-center focus:border-orange-500 focus:text-white outline-none transition-colors font-mono"
                        oninput="app.updateTransitionProp('${trans.id}', '${prop}', parseFloat(this.value), '${trackId}'); document.getElementById('${rangeId}').value = this.value;">
                    <span class="text-[9px] text-gray-500 w-3">s</span>
                </div>
            </div>
        </div>`;
    };

    const html = `
        <div class="mb-3 pb-2 mt-2 px-2">
            <h4 class="font-bold text-xs text-orange-400 mb-4 flex items-center border-b border-orange-900/60 pb-2">
                <i class="fa-solid fa-film mr-2"></i> TRANSITION CONTROLS
            </h4>
            
            ${createSelect('Type', 'type', [
                { value: 'cross_dissolve', label: 'Cross Dissolve' },
                { value: 'fade', label: 'Fade to Black' },
                { value: 'wipe', label: 'Wipe Right' },
                { value: 'zoom', label: 'Zoom Blur' }
            ])}

            ${createSelect('Alignment', 'alignment', [
                { value: 'center', label: 'Center at Cut' },
                { value: 'start', label: 'Start at Cut' },
                { value: 'end', label: 'End at Cut' }
            ])}

            ${createNumberInput('In Offset', 'inOffset', 0.1, 5.0, 0.1)}
            ${createNumberInput('Out Offset', 'outOffset', 0.1, 5.0, 0.1)}
            
            <button class="w-full mt-4 bg-red-600/30 hover:bg-red-600/80 border border-red-700 text-[10px] text-white rounded py-1.5 transition-colors"
                onclick="app.deleteTransition('${trans.id}', '${trackId}')">
                <i class="fa-solid fa-trash mr-1"></i> Delete Transition
            </button>
        </div>
    `;
    panel.innerHTML = html;
};

window.EditorApp.prototype.updateTransitionProp = function(transId, prop, value, trackId) {
    const transInfo = this.findTransitionById(transId);
    if (transInfo) {
        transInfo.trans[prop] = value;
        
        // For numeric props (sliders), skip re-rendering the panel to avoid losing focus.
        // Just patch the sibling input/range element's value directly.
        const isNumericProp = (prop === 'inOffset' || prop === 'outOffset');
        if (!isNumericProp) {
            // For type/alignment selects: full re-render is fine (no focus issue)
            this.updateEffectControls();
        }
        // Always redraw canvas and sync store
        this.requestRedraw();
        this.commitStateToReact();
    }
};

window.EditorApp.prototype.addLogoRemover = function(clipId) {
    const clip = this.findClipById(clipId);
    if (!clip) return;
    if (!clip.logoRemovers) clip.logoRemovers = [];
    
    clip.logoRemovers.push({
        id: 'rm_' + Math.random().toString(36).substr(2, 9),
        x: 50,
        y: 50,
        width: 10,
        height: 10,
        mode: 'blur',
        strength: 50,
        cloneX: 0,
        cloneY: 0
    });
    
    this.updateEffectControls();
    this.requestRedraw();
    this.commitStateToReact();
};

window.EditorApp.prototype.updateLogoRemover = function(clipId, rmId, prop, value) {
    const clip = this.findClipById(clipId);
    if (!clip || !clip.logoRemovers) return;
    
    const rm = clip.logoRemovers.find(r => r.id === rmId);
    if (!rm) return;
    
    if (prop === 'mode') {
        rm[prop] = value;
    } else {
        rm[prop] = parseFloat(value) || 0;
    }
    
    if (prop === 'mode') {
        this.updateEffectControls();
    } else {
        // Sync sibling input/slider manually if needed, but it's simpler to just redraw
        const sibling = event ? event.target.nextElementSibling || event.target.previousElementSibling : null;
        if (sibling && sibling.tagName === 'SPAN') sibling.innerText = Math.round(rm[prop]);
    }
    
    this.requestRedraw();
    this.commitStateToReact();
};

window.EditorApp.prototype.deleteLogoRemover = function(clipId, rmId) {
    const clip = this.findClipById(clipId);
    if (!clip || !clip.logoRemovers) return;
    
    clip.logoRemovers = clip.logoRemovers.filter(r => r.id !== rmId);
    
    this.updateEffectControls();
    this.requestRedraw();
    this.commitStateToReact();
};

};
