/**
 * 🚀 Project 43 Pro Features Module
 * ✨ UI UPDATE: Handles Smart Sandwich Mode logic with Animation & Layer Awareness.
 * 🆕 FEATURE: "Apply to All" sets Track Defaults for future clips.
 * 🔧 FIX: ensureProProperties now auto-repairs "Broken Smart Objects" created by Deep Copy.
 * 🔥 UPDATE: Added Non-Uniform Scaling Support (ScaleX, ScaleY) & Force Size (Fit to Shape).
 */

const originalClip = window.Clip; 

function forceHex(value) {
    if (!value || value === 'transparent') return '#000000';
    if (value.startsWith('#')) return value;
    return '#000000'; 
}

// 🔥 NEW: Check if Sandwich Mode should be active based on timeline context
EditorApp.prototype.isSandwichContextActive = function(clip) {
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
function ensureProProperties(clip) {
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
    if (clip.properties.rotation === undefined) clip.properties.rotation = getDef('properties', 'rotation', 0);
    if (clip.properties.opacity === undefined) clip.properties.opacity = getDef('properties', 'opacity', 100);
    
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
}

EditorApp.prototype.calculateClipProperties = function(clip) {
    ensureProProperties(clip); 
    const timeInClip = this.currentTime - clip.start;
    if (clip.getPropertyValue) {
        clip.properties.scale = clip.getPropertyValue('scale', timeInClip);
        // ✨ Retrieve X/Y Scales
        clip.properties.scaleX = clip.getPropertyValue('scaleX', timeInClip) || 100;
        clip.properties.scaleY = clip.getPropertyValue('scaleY', timeInClip) || 100;
        
        clip.properties.positionX = clip.getPropertyValue('positionX', timeInClip);
        clip.properties.positionY = clip.getPropertyValue('positionY', timeInClip);
        clip.properties.rotation = clip.getPropertyValue('rotation', timeInClip);
        clip.properties.opacity = clip.getPropertyValue('opacity', timeInClip);
    }
};

// 🔥 UPDATED: Apply Non-Uniform Scaling in rendering
EditorApp.prototype.applyClipTransforms = function(ctx, clip, w, h) {
    const timeInClip = this.currentTime - clip.start;
    const timeRemaining = clip.end - this.currentTime;
    
    // 1. Transitions
    if (clip.transitions) {
        const transDur = clip.transitions.duration || 1.0;
        let progress = 1;
        if (timeInClip < transDur) {
            progress = timeInClip / transDur;
            this.applyTransitionEffect(ctx, clip.transitions.in, progress, w, h, 'in');
        } else if (timeRemaining < transDur) {
            progress = timeRemaining / transDur;
            this.applyTransitionEffect(ctx, clip.transitions.out, progress, w, h, 'out');
        }
    }
    
    // 2. Opacity
    const opacity = (clip.properties.opacity !== undefined ? clip.properties.opacity : 100) / 100;
    ctx.globalAlpha *= opacity;

    // 3. ✨ Forced Dimensions Logic (Squeeze to Shape)
    if (clip.properties.forcedWidth && clip.properties.forcedHeight) {
        // Calculate the scale needed to hit the target pixels exactly
        // Warning: This overrides standard scale
        const scaleX = clip.properties.forcedWidth / w;
        const scaleY = clip.properties.forcedHeight / h;
        ctx.scale(scaleX, scaleY);
    } 
    // 4. ✨ Standard & Non-Uniform Scaling
    else {
        // Combine Master Scale with Individual Axis Scales
        const masterScale = (clip.properties.scale || 100) / 100;
        const sX = (clip.properties.scaleX || 100) / 100;
        const sY = (clip.properties.scaleY || 100) / 100;
        
        ctx.scale(masterScale * sX, masterScale * sY);
    }
};

EditorApp.prototype.applyTransitionEffect = function(ctx, type, progress, w, h, mode) {
    if (type === 'none') return;
    if (type === 'fade') ctx.globalAlpha *= progress;
    else if (type === 'slideLeft') ctx.translate((1 - progress) * w, 0);
    else if (type === 'slideRight') ctx.translate((1 - progress) * -w, 0);
    else if (type === 'slideUp') ctx.translate(0, (1 - progress) * h);
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
};

EditorApp.prototype.drawAdvancedText = function(ctx, clip, w, h) {
    const style = clip.textStyle || {};
    const text = clip.src || "Text";
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
    ctx.font = `${style.fontWeight || 'bold'} ${fontSize}px "${style.fontFamily || 'Cairo'}", sans-serif`;
    ctx.textAlign = "center"; ctx.textBaseline = "middle";

    const maxWidth = w * 0.8;
    const words = text.split(' ');
    let line = ''; const lines = [];
    for (let n = 0; n < words.length; n++) {
        const testLine = line + words[n] + ' ';
        const metrics = ctx.measureText(testLine);
        if (metrics.width > maxWidth && n > 0) { lines.push(line); line = words[n] + ' '; } 
        else { line = testLine; }
    }
    lines.push(line);

    const lineHeight = fontSize * 1.4;
    const totalHeight = lines.length * lineHeight;
    let maxLineWidth = 0;
    lines.forEach(l => { const m = ctx.measureText(l); if(m.width > maxLineWidth) maxLineWidth = m.width; });
    
    const padding = style.padding || 20;
    const boxW = maxLineWidth + (padding * 2);
    const boxH = totalHeight + (padding * 2);
    const startY = -(totalHeight / 2) + (lineHeight / 2);

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

    lines.forEach((l, i) => {
        const currentY = startY + (i * lineHeight);
        if (style.strokeWidth > 0) ctx.strokeText(l.trim(), 0, currentY);
        ctx.fillText(l.trim(), 0, currentY);
    });
    ctx.restore();
};

EditorApp.prototype.updateSandwichLimits = function(newScale) {
    if (this.selectedClipIds.size !== 1) return;
    const clipId = Array.from(this.selectedClipIds)[0];
    const clip = this.findClipById(clipId);
    if (!clip || !clip.sandwich) return;

    // Use raw setter if available (repaired object), else plain set
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
             
             // Access via _raw if possible to get intended value, or use getter
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

// 🔥🔥 UI CONTROLLER UPDATED
EditorApp.prototype.updateEffectControls = function() {
    const panel = document.getElementById('effect-controls-content');
    if (!panel) return;
    if (this.selectedClipIds.size !== 1) {
        panel.innerHTML = '<div class="text-gray-500 text-center py-4 text-xs">No Clip Selected</div>';
        return;
    }

    const clipId = Array.from(this.selectedClipIds)[0];
    this.lastSelectedClipId = clipId;
    const clip = this.findClipById(clipId);
    if (!clip) return;
    ensureProProperties(clip); 
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
        
        val = parseFloat(val) || 0;
        if (unit === '%') val = Math.round(val);
        
        const uniqueId = `${objName}_${prop}`;
        const inputId = `input_${uniqueId}`;
        const rangeId = `range_${uniqueId}`;
        
        return `
        <div class="mb-3">
            <div class="flex justify-between items-center mb-1">
                <label class="text-[10px] text-gray-400 w-16">${label}</label>
                <div class="flex items-center gap-1">
                     <i class="fa-regular fa-clock cursor-pointer text-gray-600 hover:text-primary text-[10px]" title="Add Keyframe" onclick="app.addKeyframeUI('${clipId}', '${prop}')"></i>
                    <input type="number" id="${inputId}" value="${val}" min="${min}" max="${max}" step="${step}"
                        class="bg-gray-900 border border-gray-600 rounded text-[10px] text-white w-14 px-1 text-center focus:border-blue-500 outline-none"
                        oninput="app.updateProProperty('${clipId}', '${objName}', '${prop}', this.value); document.getElementById('${rangeId}').value = this.value; ${extraOnInput}">
                    <span class="text-[9px] text-gray-500 w-4">${unit}</span>
                </div>
            </div>
            <input type="range" id="${rangeId}" min="${min}" max="${max}" step="${step}" value="${val}" 
                class="w-full h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer range-sm accent-blue-500"
                oninput="app.updateProProperty('${clipId}', '${objName}', '${prop}', this.value); document.getElementById('${inputId}').value = this.value; ${extraOnInput}">
        </div>`;
    };

    const createSelect = (label, objName, prop, options) => {
        const val = clip[objName][prop];
        const opts = options.map(o => `<option value="${o.val}" ${val === o.val ? 'selected' : ''}>${o.label}</option>`).join('');
        return `
        <div class="flex items-center justify-between mb-2">
            <label class="text-[10px] text-gray-400 w-16">${label}</label>
            <select class="flex-1 bg-gray-700 text-[10px] rounded border border-gray-600 px-1 py-0.5 outline-none"
                onchange="app.updateProProperty('${clipId}', '${objName}', '${prop}', this.value)">
                ${opts}
            </select>
        </div>`;
    };

    const isAiEnabled = clip.aiSegmentation && clip.aiSegmentation.enabled;
    const isSandwichContext = this.isSandwichContextActive(clip);

    if (isAiEnabled) {
        // --- SANDWICH CONTROLS ---
        const currentScale = clip.sandwich.scale || 50;
        const startLimitX = Math.floor((W * (1 - currentScale/100)) / 2);
        const startLimitY = Math.floor((H * (1 - currentScale/100)) / 2);

        let statusBadge = isSandwichContext 
            ? `<div class="text-[9px] text-pink-300 mb-2 opacity-70"><i class="fa-solid fa-layer-group"></i> Sandwich Active (Layer Detected).</div>`
            : `<div class="text-[9px] text-gray-400 mb-2 opacity-70"><i class="fa-solid fa-expand"></i> Auto-Fullscreen (No Background).</div>`;

        const opacityClass = isSandwichContext ? '' : 'opacity-50 pointer-events-none grayscale';

        const sandwichHTML = `
        <div class="mb-4 bg-pink-900/20 p-2 rounded border border-pink-700/50">
            <h3 class="text-xs font-bold text-pink-400 mb-2 uppercase border-b border-pink-700/50 pb-1 flex justify-between">
                <span>Sandwich Mode</span>
                ${!isSandwichContext ? '<i class="fa-solid fa-lock text-[10px]" title="Locked: No background layer found"></i>' : ''}
            </h3>
            ${statusBadge}
            <div class="${opacityClass} transition-opacity duration-300">
                ${createDualControl('Size', 'sandwich', 'scale', 10, 100, '%', 1, 'app.updateSandwichLimits(this.value)')}
                ${createDualControl('Offset X', 'sandwich', 'offsetX', -startLimitX, startLimitX, 'px')}
                ${createDualControl('Offset Y', 'sandwich', 'offsetY', -startLimitY, startLimitY, 'px')}
            </div>
        </div>
        `;
        panel.insertAdjacentHTML('beforeend', sandwichHTML);
    } else {
        // --- STANDARD CONTROLS (UPDATED) ---
        let transformHTML = `
            <div class="mb-4">
                <h3 class="text-xs font-bold text-gray-400 mb-2 uppercase border-b border-gray-700 pb-1">Transform</h3>
                ${createDualControl('Master Scale', 'properties', 'scale', 10, 500, '%')}
                
                <div class="grid grid-cols-2 gap-2">
                    ${createDualControl('Scale X', 'properties', 'scaleX', 10, 500, '%')}
                    ${createDualControl('Scale Y', 'properties', 'scaleY', 10, 500, '%')}
                </div>

                ${createDualControl('Pos X', 'properties', 'positionX', -limitW, limitW, 'px')} 
                ${createDualControl('Pos Y', 'properties', 'positionY', -limitH, limitH, 'px')}
                ${createDualControl('Rotation', 'properties', 'rotation', -360, 360, '°')}
                ${createDualControl('Opacity', 'properties', 'opacity', 0, 100, '%')}
            </div>
        `;
        panel.insertAdjacentHTML('beforeend', transformHTML);
    }
    
    let applyButtons = '';
    if (clip.type === 'text') {
        const track = this.tracks.find(t => t.id === clip.trackId);
        const isSubtitle = track && track.type === 'subtitle';
        if (isSubtitle) {
            applyButtons = `<div class="mb-3 border-b border-gray-700 pb-2 flex flex-col gap-2"><button onclick="app.applyAttributesToAll('${clipId}', 'subtitle_only')" class="bg-orange-600 hover:bg-orange-700 text-white text-[10px] py-1 rounded w-full font-bold"><i class="fa-solid fa-copy"></i> Apply to All Transcripts</button></div>`;
        } else {
            applyButtons = `<div class="mb-3 border-b border-gray-700 pb-2 flex flex-col gap-2"><button onclick="app.applyAttributesToAll('${clipId}', 'text_only')" class="bg-blue-600 hover:bg-blue-700 text-white text-[10px] py-1 rounded w-full font-bold"><i class="fa-solid fa-copy"></i> Apply to All Texts</button></div>`;
        }
    } else if (clip.type === 'image' || clip.type === 'video') {
        applyButtons = `<div class="mb-3 border-b border-gray-700 pb-2"><button onclick="app.applyAttributesToAll('${clipId}', 'image')" class="bg-purple-600 hover:bg-purple-700 text-white text-[10px] py-1 rounded w-full font-bold"><i class="fa-solid fa-images"></i> Set as Track Default & Apply All</button></div>`;
    }
    panel.insertAdjacentHTML('beforeend', applyButtons);
    
    const transitionsHTML = `
    <div class="mb-3 border-b border-gray-700 pb-2 mt-2">
        <h4 class="font-bold text-xs text-indigo-400 mb-2"><i class="fa-solid fa-bolt mr-1"></i> Transitions</h4>
        ${createSelect('In Anim', 'transitions', 'in', [{val:'none', label:'None'}, {val:'fade', label:'Fade In'}, {val:'slideLeft', label:'Slide Left'}, {val:'slideRight', label:'Slide Right'}, {val:'slideUp', label:'Slide Up'}, {val:'zoom', label:'Zoom In'}, {val:'wipe', label:'Iris Wipe'}])}
        ${createSelect('Out Anim', 'transitions', 'out', [{val:'none', label:'None'}, {val:'fade', label:'Fade Out'}, {val:'slideLeft', label:'Slide Left'}, {val:'slideRight', label:'Slide Right'}, {val:'slideUp', label:'Slide Up'}, {val:'zoom', label:'Zoom Out'}, {val:'wipe', label:'Iris Wipe'}])}
        ${createDualControl('Duration', 'transitions', 'duration', 0.1, 5.0, 's', 0.1)}
    </div>`;
    panel.insertAdjacentHTML('beforeend', transitionsHTML);

    if (clip.type === 'text') {
        const textHTML = `
        <div class="mb-3 border-b border-gray-700 pb-2">
            <h4 class="font-bold text-xs text-blue-400 mb-2"><i class="fa-solid fa-i-cursor mr-1"></i> Text Style</h4>
            <div class="flex items-center justify-between mb-2">
                <label class="text-[10px] text-gray-400">Color</label>
                <input type="color" value="${forceHex(clip.textStyle.color)}" onchange="app.updateProProperty('${clipId}', 'textStyle', 'color', this.value)" class="w-10 h-6 bg-transparent border-0 cursor-pointer">
            </div>
            <div class="flex items-center justify-between mb-2">
                <label class="text-[10px] text-gray-400">Bg Color</label>
                <div class="flex items-center gap-2">
                    <input type="color" value="${forceHex(clip.textStyle.backgroundColor)}" onchange="app.updateProProperty('${clipId}', 'textStyle', 'backgroundColor', this.value)" class="w-8 h-6 bg-transparent border-0 cursor-pointer">
                    <input type="number" min="0" max="100" value="${clip.textStyle.backgroundOpacity || 0}" onchange="app.updateProProperty('${clipId}', 'textStyle', 'backgroundOpacity', this.value)" class="w-10 bg-gray-800 text-[9px] border border-gray-600 px-1 rounded text-center" title="Bg Opacity %">
                </div>
            </div>
             ${createDualControl('Stroke', 'textStyle', 'strokeWidth', 0, 20, 'px')}
             ${createDualControl('Padding', 'textStyle', 'padding', 0, 100, 'px')}
             ${createDualControl('Shadow', 'textStyle', 'shadowBlur', 0, 50, 'px')}
        </div>`;
        panel.insertAdjacentHTML('beforeend', textHTML);
    }
};

EditorApp.prototype.updateProProperty = function(clipId, objName, prop, value) {
    const clip = this.findClipById(clipId);
    if(clip) {
        ensureProProperties(clip);
        if(!clip[objName]) clip[objName] = {};
        
        let parsedValue = parseFloat(value);
        if (prop.toLowerCase().includes('color') && !prop.includes('Opacity')) {
            parsedValue = forceHex(value);
        } else if (prop === 'in' || prop === 'out') {
            parsedValue = value;
        }

        clip[objName][prop] = parsedValue;
        this.requestRedraw();
    }
};

EditorApp.prototype.updateClipSource = function(clipId, newText) {
    const clip = this.findClipById(clipId);
    if (clip && clip.type === 'text') {
        clip.src = newText;
        if(this.syncOverlays) this.syncOverlays(); 
    }
};

EditorApp.prototype.addKeyframeUI = function(clipId, prop) {
    const clip = this.findClipById(clipId);
    if (!clip) return;
    ensureProProperties(clip);
    const timeRelative = this.currentTime - clip.start;
    let currentVal = clip.properties[prop];
    clip.addKeyframe(prop, timeRelative, currentVal);
    this.log(`💎 Keyframe added for ${prop} at ${timeRelative.toFixed(1)}s`);
    this.requestRedraw();
};

EditorApp.prototype.applyAttributesToAll = function(sourceClipId, mode) {
    const sourceClip = this.findClipById(sourceClipId);
    if (!sourceClip) return;
    const track = this.tracks.find(t => t.id === sourceClip.trackId);
    if (!track) return;
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
        ensureProProperties(targetClip);
    });
    this.requestRedraw();
};

EditorApp.prototype.exportToMP4 = async function() {
    const btn = document.getElementById('export-mp4-btn');
    const isSecure = typeof SharedArrayBuffer !== 'undefined';
    if (!isSecure) {
        if (btn) btn.innerText = "🔴 Rec (WebM)...";
        this.startCanvasRecording(null);
        return;
    }
    if (typeof FFmpeg === 'undefined') {
        this.startCanvasRecording(null);
        return;
    }
    const { createFFmpeg } = FFmpeg;
    const ffmpeg = createFFmpeg({ log: true });
    if(btn) btn.innerText = "⏳ Init FFmpeg...";
    try {
        await ffmpeg.load();
        const assets = new Set();
        this.tracks.forEach(t => t.clips.forEach(c => {
            if(c.type === 'video' || c.type === 'image' || c.type === 'audio') assets.add(c.src);
        }));
        for (const src of assets) {
            try {
                const data = await fetch(src).then(r => r.arrayBuffer());
                const fileName = src.replace(/[^a-zA-Z0-9._-]/g, '_'); 
                ffmpeg.FS('writeFile', fileName, new Uint8Array(data));
            } catch(e) { }
        }
        if(btn) btn.innerText = "🔴 Rec (MP4)...";
        this.startCanvasRecording(ffmpeg);
    } catch (e) {
        if(btn) btn.innerText = "🔴 Rec (Fallback)...";
        this.startCanvasRecording(null); 
    }
};

EditorApp.prototype.startCanvasRecording = function(ffmpeg) {
    this.pausePlayback();
    this.seek(0);
    this.currentTime = 0; 
    if (!this.audioCtx) this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const audioDest = this.audioCtx.createMediaStreamDestination();
    this.players.forEach(player => {
        if (!player._sourceNode) {
            try {
                player._sourceNode = this.audioCtx.createMediaElementSource(player);
                player._sourceNode.connect(this.audioCtx.destination);
            } catch (e) { }
        }
        if (player._sourceNode) player._sourceNode.connect(audioDest);
    });
    if (this.audioCtx.state === 'suspended') this.audioCtx.resume();
    let canvasStream;
    try { canvasStream = this.canvas.captureStream(30); } catch(e) { return; }
    const combinedTracks = [...canvasStream.getVideoTracks(), ...audioDest.stream.getAudioTracks()];
    const combinedStream = new MediaStream(combinedTracks);
    let options = { mimeType: 'video/webm' };
    if (MediaRecorder.isTypeSupported('video/webm; codecs=vp9')) options = { mimeType: 'video/webm; codecs=vp9' };
    let recorder;
    try { recorder = new MediaRecorder(combinedStream, options); } catch(e) { return; }
    const chunks = [];
    recorder.ondataavailable = e => { if(e.data.size > 0) chunks.push(e.data); };
    recorder.onstop = async () => {
        const webmBlob = new Blob(chunks, { type: 'video/webm' });
        const btn = document.getElementById('export-mp4-btn');
        if (ffmpeg) {
            if (btn) btn.innerText = "⚙️ Encoding MP4...";
            try {
                const webmData = await new Response(webmBlob).arrayBuffer();
                ffmpeg.FS('writeFile', 'rec.webm', new Uint8Array(webmData));
                await ffmpeg.run('-i', 'rec.webm', '-c:v', 'copy', '-c:a', 'aac', 'out.mp4'); 
                const data = ffmpeg.FS('readFile', 'out.mp4');
                const mp4Blob = new Blob([data.buffer], { type: 'video/mp4' });
                this.downloadBlob(mp4Blob, 'project_43_final.mp4');
            } catch (e) {
                this.downloadBlob(webmBlob, 'project_43_backup.webm');
            }
        } else {
            this.downloadBlob(webmBlob, 'project_43_export.webm');
        }
        if (btn) btn.innerText = "Export MP4/WebM";
    };
    recorder.start();
    this.playbackRate = 1; 
    this.isPlaying = true; 
    this.lastTick = performance.now(); 
    const btn = document.getElementById('export-mp4-btn');
    const checkEnd = setInterval(() => {
        const remaining = Math.max(0, this.duration - this.currentTime);
        const mins = Math.floor(remaining / 60);
        const secs = Math.floor(remaining % 60);
        if (btn) btn.innerText = `🔴 Rec (${mins}:${secs.toString().padStart(2, '0')})...`;
        if (this.currentTime >= this.duration) {
            clearInterval(checkEnd);
            this.pausePlayback();
            recorder.stop();
            if (btn) btn.innerText = "Processing...";
        }
    }, 500); 
    const recordLoop = () => { if (recorder.state === 'recording') this.playbackLoop(performance.now()); };
    recordLoop();
};

EditorApp.prototype.downloadBlob = function(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
};