// @ts-nocheck
// effects_panel_ui.ts — Effects panel HTML builder: updateEffectControls, updateProProperty, updateClipSource

export const injectEffectsPanel = () => {

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

    // ✅ Smart group detection: a video+audio pair shares the same groupId.
    // When the user clicks the video clip, both get selected (size=2).
    // Instead of showing "No Selection", find the primary (non-audio) clip.
    let clipId = null;
    if (this.selectedClipIds.size === 1) {
        clipId = Array.from(this.selectedClipIds)[0];
    } else if (this.selectedClipIds.size > 1) {
        // Check if all selected clips belong to the same group
        const allSelected = Array.from(this.selectedClipIds)
            .map(id => this.findClipById(id))
            .filter(Boolean);
        const groupIds = [...new Set(allSelected.map(c => c.groupId).filter(Boolean))];
        if (groupIds.length === 1) {
            // Single group selected → prefer video, then image, then first non-audio
            const primary = allSelected.find(c => c.type === 'video')
                         || allSelected.find(c => c.type === 'image')
                         || allSelected.find(c => c.type !== 'audio');
            if (primary) clipId = primary.id;
        }
    }

    if (!clipId) {
        panel.innerHTML = '<div class="text-gray-500 text-center py-4 text-xs">No Selection</div>';
        return;
    }

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
                    <div class="flex items-center gap-1 flex-grow">
                        <input type="color" value="${forceHex(clip.textStyle.color)}" onchange="app.updateProProperty('${clipId}', 'textStyle', 'color', this.value)" class="flex-grow h-7 bg-[#050811] border border-gray-700 rounded cursor-pointer">
                        <button onclick="if(window.EyeDropper){new EyeDropper().open().then(r => {app.updateProProperty('${clipId}','textStyle','color',r.sRGBHex);app.updateEffectControls();}).catch(e=>console.log(e));}else{alert('Eyedropper API not supported in this browser.');}" class="w-7 h-7 bg-[#1e293b] rounded text-gray-400 hover:text-white transition-colors flex-shrink-0" title="Pick color from canvas"><i class="fa-solid fa-eye-dropper text-[10px]"></i></button>
                    </div>
                </div>
                <div class="flex items-center justify-between mb-3 gap-3">
                    <label class="text-[10px] text-gray-400 w-20 flex-shrink-0 select-none">Bg Color</label>
                    <div class="flex items-center gap-1 flex-grow">
                        <input type="color" value="${forceHex(clip.textStyle.backgroundColor)}" onchange="app.updateProProperty('${clipId}', 'textStyle', 'backgroundColor', this.value)" class="flex-grow h-7 bg-[#050811] border border-gray-700 rounded cursor-pointer">
                        <button onclick="if(window.EyeDropper){new EyeDropper().open().then(r => {app.updateProProperty('${clipId}','textStyle','backgroundColor',r.sRGBHex);app.updateEffectControls();}).catch(e=>console.log(e));}" class="w-7 h-7 bg-[#1e293b] rounded text-gray-400 hover:text-white transition-colors flex-shrink-0" title="Pick color from canvas"><i class="fa-solid fa-eye-dropper text-[10px]"></i></button>
                        <input type="number" min="0" max="100" value="${clip.textStyle.backgroundOpacity || 0}" lang="en" dir="ltr" onchange="app.updateProProperty('${clipId}', 'textStyle', 'backgroundOpacity', this.value)" class="w-10 bg-[#050811] text-[10px] text-gray-200 border border-gray-700 py-1 rounded text-center focus:border-red-500 outline-none" title="Bg Opacity %">
                    </div>
                </div>
                <div class="flex items-center justify-between mb-3 gap-3">
                    <label class="text-[10px] text-gray-400 w-20 flex-shrink-0 select-none">Stroke Color</label>
                    <div class="flex items-center gap-1 flex-grow">
                        <input type="color" value="${forceHex(clip.textStyle.strokeColor || '#000000')}" onchange="app.updateProProperty('${clipId}', 'textStyle', 'strokeColor', this.value)" class="flex-grow h-7 bg-[#050811] border border-gray-700 rounded cursor-pointer">
                        <button onclick="if(window.EyeDropper){new EyeDropper().open().then(r => {app.updateProProperty('${clipId}','textStyle','strokeColor',r.sRGBHex);app.updateEffectControls();}).catch(e=>console.log(e));}" class="w-7 h-7 bg-[#1e293b] rounded text-gray-400 hover:text-white transition-colors flex-shrink-0" title="Pick color from canvas"><i class="fa-solid fa-eye-dropper text-[10px]"></i></button>
                    </div>
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

};
