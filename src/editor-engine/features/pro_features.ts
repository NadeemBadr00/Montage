// @ts-nocheck
/**
 * dYs? Project 43 Pro Features Module
 * UI UPDATE: Handles Smart Sandwich Mode logic with Animation & Layer Awareness.
 * FEATURE: Apply to All sets Track Defaults for future clips.
 * FIX: ensureProProperties now auto-repairs Broken Smart Objects created by Deep Copy.
 * UPDATE: Added Non-Uniform Scaling Support (ScaleX, ScaleY) & Force Size (Fit to Shape).
 */

const originalClip = window.Clip; 

function forceHex(value) {
    if (!value || value === 'transparent') return '#000000';
    if (value.startsWith('#')) return value;
    return '#000000'; 
}

// 🔥 NEW: Check if Sandwich Mode should be active based on timeline context
window.EditorApp.prototype.isSandwichContextActive = function(clip) {
    if (!this.tracks || !clip) return false;
    
    // 1. Get current track index
    const currentTrack = this.tracks.find(t => t.id === clip.trackId);
    if (!currentTrack) return false;
    const currentTrackIndex = this.tracks.indexOf(currentTrack);

    // 2. Scan tracks BELOW this one
    let hasBackground = false;

    for (let i = currentTrackIndex + 1; i < this.tracks.length; i++) {
        const track = this.tracks[i];
        if (track.type === 'audio') continue;
        if (track.role === 'main') continue; // Ignore base layer

        const clipsAtCursor = track.getClipsAtTime(this.currentTime);
        if (clipsAtCursor.length > 0) {
            hasBackground = true;
            break;
        }
    }

    return hasBackground;
};

// 🔥 UPDATED: Ensures properties exist AND Repairs Broken Smart Objects
// ✨ Added: scaleX, scaleY, forcedWidth, forcedHeight
window.EditorApp.prototype.ensureProProperties = function(clip) {
    if (!clip) return;
    
    // 1. Try to find parent track defaults
    const app = window.app;
    let trackDefaults = null;
    if (app && app.tracks) {
        const track = app.tracks.find(t => t.id === clip.trackId);
        if (track && track.defaultStyle && track.defaultStyle.type === clip.type) {
            trackDefaults = track.defaultStyle;
        }
    }

    // 2. Helper to get default value
    const getDef = (cat, prop, fallback) => {
        if (trackDefaults && trackDefaults[cat] && trackDefaults[cat][prop] !== undefined) {
            return trackDefaults[cat][prop];
        }
        return fallback;
    };

    if (clip.properties.scale === undefined) clip.properties.scale = getDef('properties', 'scale', 100);
    if (clip.properties.scaleX === undefined) clip.properties.scaleX = getDef('properties', 'scaleX', 100); // NEW
    if (clip.properties.scaleY === undefined) clip.properties.scaleY = getDef('properties', 'scaleY', 100); // NEW
    
    if (clip.properties.positionX === undefined) clip.properties.positionX = getDef('properties', 'positionX', 0);
    if (clip.properties.positionY === undefined) clip.properties.positionY = getDef('properties', 'positionY', 0);
    if (clip.properties.rotation  === undefined) clip.properties.rotation  = getDef('properties', 'rotation',  0);
    if (clip.properties.opacity   === undefined) clip.properties.opacity   = getDef('properties', 'opacity',   100);
    if (clip.properties.volume    === undefined) clip.properties.volume    = getDef('properties', 'volume',    100); // ✅ ensure old clips default to 100
    
    if (!clip.keyframes) {
        clip.keyframes = { scale: [], positionX: [], positionY: [], rotation: [], opacity: [], volume: [] };
    }

    if (clip.type === 'text' && !clip.textStyle) {
        clip.textStyle = {
            fontFamily: 'Cairo', fontWeight: 'bold',
            color: '#ffffff', strokeColor: '#000000', strokeWidth: 0,
            shadowBlur: 0, backgroundColor: '#000000', backgroundOpacity: 0,
            padding: 20
        };
        if (trackDefaults && trackDefaults.textStyle) {
            Object.assign(clip.textStyle, trackDefaults.textStyle);
        }
    }

    if (!clip.transitions) {
        clip.transitions = { in: 'none', out: 'none', duration: 1.0 };
        if (trackDefaults && trackDefaults.transitions) {
            Object.assign(clip.transitions, trackDefaults.transitions);
        }
    }
    
    // 🔥 SMART SANDWICH REPAIR LOGIC
    let isBrokenSmart = false;
    if (clip.sandwich && clip.sandwich._isSmart) {
        const descriptor = Object.getOwnPropertyDescriptor(clip.sandwich, 'scale');
        if (!descriptor || !descriptor.get) {
            isBrokenSmart = true;
        }
    }

    if (!clip.sandwich || !clip.sandwich._isSmart || isBrokenSmart) {
        const has = (prop) => clip.sandwich && clip.sandwich[prop] !== undefined;

        const currentScale = has('scale') ? clip.sandwich.scale : getDef('sandwich', 'scale', 50);
        const currentX = has('offsetX') ? clip.sandwich.offsetX : getDef('sandwich', 'offsetX', 0);
        const currentY = has('offsetY') ? clip.sandwich.offsetY : getDef('sandwich', 'offsetY', 0);

        if (isBrokenSmart) {
            clip.sandwich = { _isSmart: true };
        } else if (!clip.sandwich) {
            clip.sandwich = { _isSmart: true };
        } else {
             clip.sandwich._isSmart = true;
        }

        const _storage = {
            scale: parseFloat(currentScale),
            offsetX: parseFloat(currentX),
            offsetY: parseFloat(currentY),
            _animScale: parseFloat(currentScale),
            _animX: parseFloat(currentX),
            _animY: parseFloat(currentY)
        };

        const smoothValue = (current, target, speed = 0.15) => {
            if (Math.abs(current - target) < 0.1) return target;
            return current + (target - current) * speed;
        };

        Object.defineProperties(clip.sandwich, {
            'scale': {
                get: function() {
                    const app = window.app;
                    const target = (window.app && window.app.isSandwichContextActive(clip)) ? _storage.scale : 100;
                    _storage._animScale = smoothValue(_storage._animScale, target, 0.15);
                    if (_storage._animScale !== target && window.app) window.app.requestRedraw();
                    return _storage._animScale;
                },
                set: function(v) { _storage.scale = parseFloat(v); },
                enumerable: true,
                configurable: true
            },
            'offsetX': {
                get: function() {
                    const app = window.app;
                    const target = (window.app && window.app.isSandwichContextActive(clip)) ? _storage.offsetX : 0;
                    _storage._animX = smoothValue(_storage._animX, target, 0.15);
                    if (_storage._animX !== target && window.app) window.app.requestRedraw();
                    return _storage._animX;
                },
                set: function(v) { _storage.offsetX = parseFloat(v); },
                enumerable: true,
                configurable: true
            },
            'offsetY': {
                get: function() {
                    const app = window.app;
                    const target = (window.app && window.app.isSandwichContextActive(clip)) ? _storage.offsetY : 0;
                    _storage._animY = smoothValue(_storage._animY, target, 0.15);
                    if (_storage._animY !== target && window.app) window.app.requestRedraw();
                    return _storage._animY;
                },
                set: function(v) { _storage.offsetY = parseFloat(v); },
                enumerable: true,
                configurable: true
            },
            '_rawScale': { get: () => _storage.scale, configurable: true },
            '_rawOffsetX': { get: () => _storage.offsetX, configurable: true },
            '_rawOffsetY': { get: () => _storage.offsetY, configurable: true }
        });
        
        if (isBrokenSmart && window.app) {
             window.app.log(`🔧 Repaired Smart Sandwich for Clip: ${clip.id}`);
        }
    }

    if (!clip.getPropertyValue) {
        clip.getPropertyValue = function(prop, timeRelative) {
            if (!this.keyframes[prop] || this.keyframes[prop].length === 0) {
                return this.properties[prop] !== undefined ? this.properties[prop] : (prop.includes('scale') ? 100 : 0);
            }
            const keys = this.keyframes[prop].sort((a, b) => a.t - b.t);
            if (timeRelative <= keys[0].t) return keys[0].v;
            if (timeRelative >= keys[keys.length - 1].t) return keys[keys.length - 1].v;
            for (let i = 0; i < keys.length - 1; i++) {
                const k1 = keys[i];
                const k2 = keys[i+1];
                if (timeRelative >= k1.t && timeRelative < k2.t) {
                    const ratio = (timeRelative - k1.t) / (k2.t - k1.t);
                    return k1.v + (k2.v - k1.v) * ratio;
                }
            }
            return this.properties[prop];
        };
    }
    if (!clip.addKeyframe) {
        clip.addKeyframe = function(prop, time, value) {
            if(!this.keyframes[prop]) this.keyframes[prop] = [];
            this.keyframes[prop] = this.keyframes[prop].filter(k => Math.abs(k.t - time) > 0.01);
            this.keyframes[prop].push({ t: time, v: parseFloat(value) });
        };
    }
};

window.EditorApp.prototype.calculateClipProperties = function(clip) {
    if (window.app && typeof window.app.ensureProProperties === 'function') {
        window.app.ensureProProperties(clip);
    }
    
    const timeInClip = this.currentTime - clip.start;
    if (clip.getPropertyValue) {
        clip.properties.scale     = clip.getPropertyValue('scale',     timeInClip);
        clip.properties.scaleX    = clip.getPropertyValue('scaleX',    timeInClip) || 100;
        clip.properties.scaleY    = clip.getPropertyValue('scaleY',    timeInClip) || 100;
        
        clip.properties.positionX = clip.getPropertyValue('positionX', timeInClip);
        clip.properties.positionY = clip.getPropertyValue('positionY', timeInClip);
        clip.properties.rotation  = clip.getPropertyValue('rotation',  timeInClip);
        clip.properties.opacity   = clip.getPropertyValue('opacity',   timeInClip);
        clip.properties.volume    = clip.getPropertyValue('volume',    timeInClip); // ✅ volume keyframes now animate
    }
};

// The following rendering functions have been moved to src/editor-engine/renderers/canvas_renderer.ts
// applyClipTransforms, applyTransitionEffect, drawAdvancedText

window.EditorApp.prototype.updateSandwichLimits = function(newScale) {
    if (this.selectedClipIds.size !== 1) return;
    const clipId = Array.from(this.selectedClipIds)[0];
    const clip = this.findClipById(clipId);
    if (!clip || !clip.sandwich) return;

    clip.sandwich.scale = parseFloat(newScale);

    const W = (this.canvas && this.canvas.width) ? this.canvas.width : 1920;
    const H = (this.canvas && this.canvas.height) ? this.canvas.height : 1080;
    const factor = 1 - (clip.sandwich.scale / 100);
    const limitX = Math.floor((W * factor) / 2); 
    const limitY = Math.floor((H * factor) / 2);

    const updateInputRange = (axis, limit) => {
        const range = document.getElementById(`range_sandwich_offset${axis}`);
        const input = document.getElementById(`input_sandwich_offset${axis}`);
        if(range && input) {
             range.min = -limit; range.max = limit;
             input.min = -limit; input.max = limit;
             
             let currentVal = clip.sandwich[`_rawOffset${axis}`] !== undefined 
                ? clip.sandwich[`_rawOffset${axis}`] 
                : clip.sandwich[`offset${axis}`];
                
             currentVal = parseFloat(currentVal);

             let clampedVal = currentVal;
             if (currentVal > limit) clampedVal = limit;
             if (currentVal < -limit) clampedVal = -limit;
             
             if (clampedVal !== currentVal) {
                 clip.sandwich[`offset${axis}`] = clampedVal;
                 range.value = clampedVal;
                 input.value = clampedVal;
             }
        }
    };
    updateInputRange('X', limitX);
    updateInputRange('Y', limitY);
    this.requestRedraw();
};

window.EditorApp.prototype.updateEffectControls = function() {
    const panel = document.getElementById('effect-controls-content');
    if (!panel) return;
    if (this.selectedClipIds.size !== 1) {
        panel.innerHTML = '<div class="text-gray-500 text-center py-4 text-xs">No Selection</div>';
        return;
    }

    const clipId = Array.from(this.selectedClipIds)[0];
    this.lastSelectedClipId = clipId;
    
    // Check if it's a transition
    const transInfo = this.findTransitionById ? this.findTransitionById(clipId) : null;
    if (transInfo) {
        panel.innerHTML = '';
        if (this.renderTransitionEffectControls) {
            this.renderTransitionEffectControls(panel, transInfo.trans, transInfo.track.id);
        }
        return;
    }

    const clip = this.findClipById(clipId);
    if (!clip) return;
    if(window.app)window.app.ensureProProperties(clip); 
    panel.innerHTML = ''; 

    const W = (this.canvas && this.canvas.width) ? this.canvas.width : 1920;
    const H = (this.canvas && this.canvas.height) ? this.canvas.height : 1080;
    const limitW = W; const limitH = H;

    // Helper for Dual Control
    const createDualControl = (label, objName, prop, min, max, unit = '', step = 1, extraOnInput = '') => {
        let val;
        if (objName === 'sandwich' && clip.sandwich._isSmart) {
            val = clip.sandwich[`_raw${prop.charAt(0).toUpperCase() + prop.slice(1)}`] !== undefined 
                ? clip.sandwich[`_raw${prop.charAt(0).toUpperCase() + prop.slice(1)}`] 
                : clip.sandwich[prop];
        } else if (objName === 'properties') val = clip.properties[prop];
        else if (objName === 'transitions') val = clip.transitions[prop];
        else if (objName === 'textStyle') val = clip.textStyle[prop];
        
        val = Number((parseFloat(val) || 0).toFixed(2));
        if (unit === '%') val = Math.round(val);
        
        const uniqueId = `${objName}_${prop}`;
        const inputId = `input_${uniqueId}`;
        const rangeId = `range_${uniqueId}`;

        // Only show keyframe icon for clip.properties (transform props)
        // transitions.duration / textStyle / sandwich props don't have keyframe tracks
        const keyframeBtn = (objName === 'properties')
            ? `<i class="fa-regular fa-clock cursor-pointer text-gray-600 hover:text-red-500 transition-colors text-[10px]" title="Add Keyframe" onclick="app.addKeyframeUI('${clipId}', '${prop}')"></i>`
            : `<i class="fa-regular fa-clock text-gray-800 text-[10px]" title="Keyframes not available for this property"></i>`;
        
        return `
        <div class="mb-3 flex items-center justify-between gap-3 group">
            <div class="flex items-center gap-1 w-20 flex-shrink-0">
                ${keyframeBtn}
                <label class="text-[10px] text-gray-400 truncate select-none">${label}</label>
            </div>
            
            <div class="flex-grow flex items-center gap-2">
                <input type="range" id="${rangeId}" min="${min}" max="${max}" step="${step}" value="${val}" dir="ltr"
                    class="w-full h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer range-sm accent-red-500"
                    oninput="app.updateProProperty('${clipId}', '${objName}', '${prop}', this.value); document.getElementById('${inputId}').value = this.value; ${extraOnInput}">
                
                <div class="flex items-center gap-1 w-20 justify-end flex-shrink-0">
                    <input type="number" id="${inputId}" value="${val}" min="${min}" max="${max}" step="${step}" dir="ltr" lang="en"
                        class="bg-[#050811] border border-gray-700 rounded text-[10px] text-gray-200 w-14 py-0.5 text-center focus:border-red-500 focus:text-white outline-none transition-colors font-mono"
                        oninput="app.updateProProperty('${clipId}', '${objName}', '${prop}', this.value); document.getElementById('${rangeId}').value = this.value; ${extraOnInput}">
                    <span class="text-[9px] text-gray-500 w-4">${unit}</span>
                </div>
            </div>
        </div>`;
    };

    const createSelect = (label, objName, prop, options) => {
        const val = clip[objName][prop];
        const opts = options.map(o => `<option value="${o.val}" ${val === o.val ? 'selected' : ''}>${o.label}</option>`).join('');
        return `
        <div class="flex items-center justify-between mb-3 gap-3">
            <label class="text-[10px] text-gray-400 w-20 flex-shrink-0 select-none">${label}</label>
            <select class="flex-grow bg-[#050811] text-[10px] text-gray-200 rounded border border-gray-700 px-2 py-1 outline-none focus:border-red-500 transition-colors cursor-pointer"
                onchange="app.updateProProperty('${clipId}', '${objName}', '${prop}', this.value)">
                ${opts}
            </select>
        </div>`;
    };

    // --- STANDARD CONTROLS (UPDATED) ---
    let transformHTML = `
        <div class="mb-4 bg-[#0a0f1d] rounded-lg">
            <div class="flex items-center gap-2 mb-4 text-gray-200 bg-[#1e293b]/50 p-2 rounded border border-gray-800">
                <i class="fa-solid fa-chevron-down text-[9px] text-red-500"></i>
                <span class="text-xs font-bold uppercase tracking-wider">Transform</span>
            </div>
            <div class="px-2">
                ${createDualControl('Master Scale', 'properties', 'scale', 10, 500, '%')}
                ${createDualControl('Scale X', 'properties', 'scaleX', 10, 500, '%')}
                ${createDualControl('Scale Y', 'properties', 'scaleY', 10, 500, '%')}
            
            ${createDualControl('Pos X', 'properties', 'positionX', -limitW, limitW, 'px')} 
            ${createDualControl('Pos Y', 'properties', 'positionY', -limitH, limitH, 'px')}
            ${createDualControl('Rotation', 'properties', 'rotation', -360, 360, '°')}
            ${createDualControl('Opacity', 'properties', 'opacity', 0, 100, '%')}
            ${(clip.type === 'video' || clip.type === 'audio') ? createDualControl('Volume', 'properties', 'volume', 0, 100, '%') : ''}
            </div>
        </div>
    `;
    panel.insertAdjacentHTML('beforeend', transformHTML);
    
    let applyButtons = '';
    if (clip.type === 'text') {
        const track = this.tracks.find(t => t.id === clip.trackId);
        const isSubtitle = track && track.type === 'subtitle';
        if (isSubtitle) {
            applyButtons = `<div class="mb-4 mt-2 px-2"><button onclick="app.applyAttributesToAll('${clipId}', 'subtitle_only')" class="bg-red-600 hover:bg-red-700 text-white text-[10px] py-1.5 rounded w-full font-bold transition-colors shadow-lg shadow-red-500/20"><i class="fa-solid fa-copy mr-1"></i> Apply to All Transcripts</button></div>`;
        } else {
            applyButtons = `<div class="mb-4 mt-2 px-2"><button onclick="app.applyAttributesToAll('${clipId}', 'text_only')" class="bg-red-600 hover:bg-red-700 text-white text-[10px] py-1.5 rounded w-full font-bold transition-colors shadow-lg shadow-red-500/20"><i class="fa-solid fa-copy mr-1"></i> Apply to All Texts</button></div>`;
        }
    } else if (clip.type === 'image' || clip.type === 'video') {
        applyButtons = `<div class="mb-4 mt-2 px-2"><button onclick="app.applyAttributesToAll('${clipId}', 'image')" class="bg-red-600 hover:bg-red-700 text-white text-[10px] py-1.5 rounded w-full font-bold transition-colors shadow-lg shadow-red-500/20"><i class="fa-solid fa-images mr-1"></i> Set as Track Default & Apply All</button></div>`;
    }
    panel.insertAdjacentHTML('beforeend', applyButtons);
    
    const transitionsHTML = `
    <div class="mb-4 bg-[#0a0f1d] rounded-lg">
        <div class="flex items-center gap-2 mb-4 text-gray-200 bg-[#1e293b]/50 p-2 rounded border border-gray-800">
            <i class="fa-solid fa-chevron-down text-[9px] text-red-500"></i>
            <span class="text-xs font-bold uppercase tracking-wider">Transitions</span>
        </div>
        <div class="px-2">
            ${createSelect('In Anim', 'transitions', 'in', [{val:'none', label:'None'}, {val:'fade', label:'Fade In'}, {val:'slideLeft', label:'Slide Left'}, {val:'slideRight', label:'Slide Right'}, {val:'slideUp', label:'Slide Up'}, {val:'zoom', label:'Zoom In'}, {val:'wipe', label:'Wipe In'}])}
            ${createSelect('Out Anim', 'transitions', 'out', [{val:'none', label:'None'}, {val:'fade', label:'Fade Out'}, {val:'slideLeft', label:'Slide Left'}, {val:'slideRight', label:'Slide Right'}, {val:'slideUp', label:'Slide Up'}, {val:'zoom', label:'Zoom Out'}, {val:'wipe', label:'Wipe Out'}])}
            ${createDualControl('Duration', 'transitions', 'duration', 0.1, 5.0, 's', 0.1)}
        </div>
    </div>`;
    panel.insertAdjacentHTML('beforeend', transitionsHTML);

    if (clip.type === 'text') {
        const textHTML = `
        <div class="mb-4 bg-[#0a0f1d] rounded-lg">
            <div class="flex items-center gap-2 mb-4 text-gray-200 bg-[#1e293b]/50 p-2 rounded border border-gray-800">
                <i class="fa-solid fa-chevron-down text-[9px] text-red-500"></i>
                <span class="text-xs font-bold uppercase tracking-wider">Text Style</span>
            </div>
            <div class="px-2">
                <div class="mb-4">
                    <label class="text-[10px] text-gray-400 block mb-1 select-none">Text Content</label>
                    <textarea class="w-full bg-[#050811] text-[10px] text-gray-200 rounded border border-gray-700 px-2 py-2 outline-none focus:border-red-500 transition-colors resize-y min-h-[60px]" oninput="app.updateClipSource('${clipId}', this.value)">${clip.src || ''}</textarea>
                </div>
                <div class="flex items-center justify-between mb-3 gap-3">
                    <label class="text-[10px] text-gray-400 w-20 flex-shrink-0 select-none">Font</label>
                    <select class="flex-grow bg-[#050811] text-[10px] text-gray-200 rounded border border-gray-700 px-2 py-1 outline-none focus:border-red-500 transition-colors cursor-pointer" onchange="app.updateProProperty('${clipId}', 'textStyle', 'fontFamily', this.value)">
                        <optgroup label="Arabic">
                            <option value="Cairo" ${clip.textStyle.fontFamily === 'Cairo' ? 'selected' : ''}>Cairo</option>
                            <option value="Tajawal" ${clip.textStyle.fontFamily === 'Tajawal' ? 'selected' : ''}>Tajawal</option>
                            <option value="Almarai" ${clip.textStyle.fontFamily === 'Almarai' ? 'selected' : ''}>Almarai</option>
                            <option value="Changa" ${clip.textStyle.fontFamily === 'Changa' ? 'selected' : ''}>Changa</option>
                            <option value="Lalezar" ${clip.textStyle.fontFamily === 'Lalezar' ? 'selected' : ''}>Lalezar</option>
                            <option value="Kufam" ${clip.textStyle.fontFamily === 'Kufam' ? 'selected' : ''}>Kufam</option>
                        </optgroup>
                        <optgroup label="English">
                            <option value="Inter" ${clip.textStyle.fontFamily === 'Inter' ? 'selected' : ''}>Inter</option>
                            <option value="Roboto" ${clip.textStyle.fontFamily === 'Roboto' ? 'selected' : ''}>Roboto</option>
                            <option value="Arial" ${clip.textStyle.fontFamily === 'Arial' ? 'selected' : ''}>Arial</option>
                            <option value="Tahoma" ${clip.textStyle.fontFamily === 'Tahoma' ? 'selected' : ''}>Tahoma</option>
                            <option value="Courier New" ${clip.textStyle.fontFamily === 'Courier New' ? 'selected' : ''}>Courier New</option>
                            <option value="Times New Roman" ${clip.textStyle.fontFamily === 'Times New Roman' ? 'selected' : ''}>Times New Roman</option>
                            <option value="Impact" ${clip.textStyle.fontFamily === 'Impact' ? 'selected' : ''}>Impact</option>
                            <option value="Comic Sans MS" ${clip.textStyle.fontFamily === 'Comic Sans MS' ? 'selected' : ''}>Comic Sans MS</option>
                        </optgroup>
                    </select>
                </div>
                <div class="flex items-center justify-between mb-3 gap-3">
                    <label class="text-[10px] text-gray-400 w-20 flex-shrink-0 select-none">Style</label>
                    <div class="flex flex-grow gap-1">
                        <button onclick="app.updateProProperty('${clipId}', 'textStyle', 'fontWeight', '${clip.textStyle.fontWeight === 'bold' ? 'normal' : 'bold'}')" class="flex-1 py-1 rounded bg-[#050811] border ${clip.textStyle.fontWeight === 'bold' ? 'border-blue-500 text-blue-400' : 'border-gray-700 text-gray-400 hover:border-gray-500'} transition"><i class="fa-solid fa-bold"></i></button>
                        <button onclick="app.updateProProperty('${clipId}', 'textStyle', 'fontStyle', '${clip.textStyle.fontStyle === 'italic' ? 'normal' : 'italic'}')" class="flex-1 py-1 rounded bg-[#050811] border ${clip.textStyle.fontStyle === 'italic' ? 'border-blue-500 text-blue-400' : 'border-gray-700 text-gray-400 hover:border-gray-500'} transition"><i class="fa-solid fa-italic"></i></button>
                        <button onclick="app.updateProProperty('${clipId}', 'textStyle', 'textDecoration', '${clip.textStyle.textDecoration === 'underline' ? 'none' : 'underline'}')" class="flex-1 py-1 rounded bg-[#050811] border ${clip.textStyle.textDecoration === 'underline' ? 'border-blue-500 text-blue-400' : 'border-gray-700 text-gray-400 hover:border-gray-500'} transition"><i class="fa-solid fa-underline"></i></button>
                    </div>
                </div>
                <div class="flex items-center justify-between mb-3 gap-3">
                    <label class="text-[10px] text-gray-400 w-20 flex-shrink-0 select-none">Align</label>
                    <div class="flex flex-grow gap-1">
                        <button onclick="app.updateProProperty('${clipId}', 'textStyle', 'textAlign', 'left')" class="flex-1 py-1 rounded bg-[#050811] border ${clip.textStyle.textAlign === 'left' ? 'border-blue-500 text-blue-400' : 'border-gray-700 text-gray-400 hover:border-gray-500'} transition"><i class="fa-solid fa-align-left"></i></button>
                        <button onclick="app.updateProProperty('${clipId}', 'textStyle', 'textAlign', 'center')" class="flex-1 py-1 rounded bg-[#050811] border ${(!clip.textStyle.textAlign || clip.textStyle.textAlign === 'center') ? 'border-blue-500 text-blue-400' : 'border-gray-700 text-gray-400 hover:border-gray-500'} transition"><i class="fa-solid fa-align-center"></i></button>
                        <button onclick="app.updateProProperty('${clipId}', 'textStyle', 'textAlign', 'right')" class="flex-1 py-1 rounded bg-[#050811] border ${clip.textStyle.textAlign === 'right' ? 'border-blue-500 text-blue-400' : 'border-gray-700 text-gray-400 hover:border-gray-500'} transition"><i class="fa-solid fa-align-right"></i></button>
                    </div>
                </div>
                <div class="flex items-center justify-between mb-3 gap-3">
                    <label class="text-[10px] text-gray-400 w-20 flex-shrink-0 select-none">Case</label>
                    <div class="flex flex-grow gap-1 text-[10px] font-bold">
                        <button onclick="app.updateProProperty('${clipId}', 'textStyle', 'textTransform', 'none')" class="flex-1 py-1 rounded bg-[#050811] border ${(!clip.textStyle.textTransform || clip.textStyle.textTransform === 'none') ? 'border-blue-500 text-blue-400' : 'border-gray-700 text-gray-400 hover:border-gray-500'} transition">None</button>
                        <button onclick="app.updateProProperty('${clipId}', 'textStyle', 'textTransform', 'uppercase')" class="flex-1 py-1 rounded bg-[#050811] border ${clip.textStyle.textTransform === 'uppercase' ? 'border-blue-500 text-blue-400' : 'border-gray-700 text-gray-400 hover:border-gray-500'} transition">AA</button>
                        <button onclick="app.updateProProperty('${clipId}', 'textStyle', 'textTransform', 'lowercase')" class="flex-1 py-1 rounded bg-[#050811] border ${clip.textStyle.textTransform === 'lowercase' ? 'border-blue-500 text-blue-400' : 'border-gray-700 text-gray-400 hover:border-gray-500'} transition">aa</button>
                        <button onclick="app.updateProProperty('${clipId}', 'textStyle', 'textTransform', 'capitalize')" class="flex-1 py-1 rounded bg-[#050811] border ${clip.textStyle.textTransform === 'capitalize' ? 'border-blue-500 text-blue-400' : 'border-gray-700 text-gray-400 hover:border-gray-500'} transition">Aa</button>
                    </div>
                </div>
                <div class="flex items-center justify-between mb-3 gap-3">
                    <label class="text-[10px] text-gray-400 w-20 flex-shrink-0 select-none">Color</label>
                    <input type="color" value="${forceHex(clip.textStyle.color)}" onchange="app.updateProProperty('${clipId}', 'textStyle', 'color', this.value)" class="w-full h-7 bg-[#050811] border border-gray-700 rounded cursor-pointer">
                </div>
                <div class="flex items-center justify-between mb-3 gap-3">
                    <label class="text-[10px] text-gray-400 w-20 flex-shrink-0 select-none">Bg Color</label>
                    <div class="flex items-center gap-2 flex-grow">
                        <input type="color" value="${forceHex(clip.textStyle.backgroundColor)}" onchange="app.updateProProperty('${clipId}', 'textStyle', 'backgroundColor', this.value)" class="flex-grow h-7 bg-[#050811] border border-gray-700 rounded cursor-pointer">
                        <input type="number" min="0" max="100" value="${clip.textStyle.backgroundOpacity || 0}" lang="en" dir="ltr" onchange="app.updateProProperty('${clipId}', 'textStyle', 'backgroundOpacity', this.value)" class="w-10 bg-[#050811] text-[10px] text-gray-200 border border-gray-700 py-1 rounded text-center focus:border-red-500 outline-none" title="Bg Opacity %">
                    </div>
                </div>
                <div class="flex items-center justify-between mb-3 gap-3">
                    <label class="text-[10px] text-gray-400 w-20 flex-shrink-0 select-none">Stroke Color</label>
                    <input type="color" value="${forceHex(clip.textStyle.strokeColor || '#000000')}" onchange="app.updateProProperty('${clipId}', 'textStyle', 'strokeColor', this.value)" class="w-full h-7 bg-[#050811] border border-gray-700 rounded cursor-pointer">
                </div>
                ${createDualControl('Stroke Width', 'textStyle', 'strokeWidth', 0, 20, 'px')}
                ${createDualControl('Padding', 'textStyle', 'padding', 0, 100, 'px')}
                ${createDualControl('Shadow', 'textStyle', 'shadowBlur', 0, 50, 'px')}
            </div>
        </div>`;
        panel.insertAdjacentHTML('beforeend', textHTML);
    }
    
    // --- Logo / Object Removal ---
    let removersHTML = `
    <div class="mb-4 bg-[#0a0f1d] rounded-lg">
        <div class="flex items-center justify-between mb-2 text-gray-200 bg-[#1e293b]/50 p-2 rounded border border-gray-800">
            <div class="flex items-center gap-2">
                <i class="fa-solid fa-eraser text-[9px] text-red-500"></i>
                <span class="text-xs font-bold uppercase tracking-wider">Object Removal</span>
            </div>
            <button onclick="app.addLogoRemover('${clipId}')" class="text-[9px] bg-red-600 hover:bg-red-500 text-white px-2 py-1 rounded transition-colors">
                <i class="fa-solid fa-plus mr-1"></i> Add
            </button>
        </div>
        <div class="px-2 pb-2">
    `;
    
    if (clip.logoRemovers && clip.logoRemovers.length > 0) {
        clip.logoRemovers.forEach((rm, idx) => {
            removersHTML += `
            <div class="mb-3 p-2 bg-[#050811] border border-gray-800 rounded relative group">
                <button onclick="app.deleteLogoRemover('${clipId}', '${rm.id}')" class="absolute top-1 right-1 text-gray-600 hover:text-red-500 text-[10px] hidden group-hover:block"><i class="fa-solid fa-xmark"></i></button>
                <div class="text-[10px] text-gray-400 mb-2 font-bold">Remover ${idx + 1}</div>
                
                <div class="flex items-center justify-between mb-2 gap-2">
                    <label class="text-[9px] text-gray-500 w-12">Mode</label>
                    <select onchange="app.updateLogoRemover('${clipId}', '${rm.id}', 'mode', this.value)" class="flex-grow bg-[#1e293b] text-[9px] text-gray-200 rounded border border-gray-700 px-1 py-1 outline-none">
                        <option value="blur" ${rm.mode === 'blur' ? 'selected' : ''}>Blur</option>
                        <option value="pixelate" ${rm.mode === 'pixelate' ? 'selected' : ''}>Pixelate</option>
                        <option value="interpolate" ${rm.mode === 'interpolate' ? 'selected' : ''}>Smart Patch</option>
                    </select>
                </div>
                
                <div class="flex items-center justify-between mb-1 gap-2">
                    <label class="text-[9px] text-gray-500 w-12">X (%)</label>
                    <input type="range" min="0" max="100" step="0.1" value="${rm.x}" oninput="app.updateLogoRemover('${clipId}', '${rm.id}', 'x', this.value)" class="flex-grow h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer range-sm accent-red-500">
                    <span class="text-[9px] text-gray-400 w-6 text-right">${Math.round(rm.x)}</span>
                </div>
                <div class="flex items-center justify-between mb-1 gap-2">
                    <label class="text-[9px] text-gray-500 w-12">Y (%)</label>
                    <input type="range" min="0" max="100" step="0.1" value="${rm.y}" oninput="app.updateLogoRemover('${clipId}', '${rm.id}', 'y', this.value)" class="flex-grow h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer range-sm accent-red-500">
                    <span class="text-[9px] text-gray-400 w-6 text-right">${Math.round(rm.y)}</span>
                </div>
                <div class="flex items-center justify-between mb-1 gap-2">
                    <label class="text-[9px] text-gray-500 w-12">Width</label>
                    <input type="range" min="1" max="100" step="0.1" value="${rm.width}" oninput="app.updateLogoRemover('${clipId}', '${rm.id}', 'width', this.value)" class="flex-grow h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer range-sm accent-red-500">
                    <span class="text-[9px] text-gray-400 w-6 text-right">${Math.round(rm.width)}</span>
                </div>
                <div class="flex items-center justify-between mb-1 gap-2">
                    <label class="text-[9px] text-gray-500 w-12">Height</label>
                    <input type="range" min="1" max="100" step="0.1" value="${rm.height}" oninput="app.updateLogoRemover('${clipId}', '${rm.id}', 'height', this.value)" class="flex-grow h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer range-sm accent-red-500">
                    <span class="text-[9px] text-gray-400 w-6 text-right">${Math.round(rm.height)}</span>
                </div>
                <div class="flex items-center justify-between mb-1 gap-2">
                    <label class="text-[9px] text-gray-500 w-12">Strength</label>
                    <input type="range" min="0" max="100" step="1" value="${rm.strength}" oninput="app.updateLogoRemover('${clipId}', '${rm.id}', 'strength', this.value)" class="flex-grow h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer range-sm accent-red-500">
                    <span class="text-[9px] text-gray-400 w-6 text-right">${Math.round(rm.strength)}</span>
                </div>
            </div>`;
        });
    } else {
        removersHTML += `<div class="text-[10px] text-gray-500 text-center py-2 italic">No removers added.</div>`;
    }
    
    removersHTML += `</div></div>`;
    panel.insertAdjacentHTML('beforeend', removersHTML);
};

    window.EditorApp.prototype.updateProProperty = function(clipId, objName, prop, value) {
        const clip = this.findClipById(clipId);
        if(clip) {
            if(window.app)window.app.ensureProProperties(clip);
            if(!clip[objName]) clip[objName] = {};
            
            let parsedValue = parseFloat(value);
            const stringProps = ['fontFamily', 'fontWeight', 'fontStyle', 'textDecoration', 'textAlign', 'textTransform', 'in', 'out'];
            
            if (prop.toLowerCase().includes('color') && !prop.includes('Opacity')) {
                parsedValue = forceHex(value);
            } else if (stringProps.includes(prop)) {
                parsedValue = value;
            }
            
            clip[objName][prop] = parsedValue;
            this.requestRedraw();
            this.commitStateToReact(); // ✅ keep Zustand in sync after every property change
            
            // Refresh properties panel for text toggles to update their active HTML state
            const requiresPanelRefresh = ['fontWeight', 'fontStyle', 'textDecoration', 'textAlign', 'textTransform'].includes(prop);
            if (requiresPanelRefresh && this.updateEffectControls) {
                this.updateEffectControls();
            }
        }
    };

window.EditorApp.prototype.updateClipSource = function(clipId, newText) {
    const clip = this.findClipById(clipId);
    if (clip && clip.type === 'text') {
        clip.src = newText;
        if(this.syncOverlays) this.syncOverlays(); 
        // BUG #4 FIX: sync Zustand so React re-renders the clip label in the timeline
        if(this.commitStateToReact) this.commitStateToReact();
        if(this.requestRedraw) this.requestRedraw();
    }
};

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


