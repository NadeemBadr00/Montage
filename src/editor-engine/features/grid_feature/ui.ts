// @ts-nocheck
import { ensureGridProperties, syncGridOrder } from './helpers';

export const injectGridUI = (prevUpdateEffectControlsGrid: any) => {
    window.EditorApp.prototype.updateEffectControls = function() {
        if (prevUpdateEffectControlsGrid) prevUpdateEffectControlsGrid.call(this);

        const panelArea = document.getElementById('pro-features-area');
        if (!panelArea || this.selectedClipIds.size !== 1) return;

        const clipId = Array.from(this.selectedClipIds)[0];
        const clip = this.tracks.flatMap((t: any) => t.clips).find((c: any) => c.id === clipId);
        if (!clip) return;

        ensureGridProperties(clip);
        syncGridOrder(clip);

        const g = clip.gridGallery;
        const baseCount = g.showMain ? 1 : 0;
        const totalItems = baseCount + (g.assets ? g.assets.length : 0);
        const autoDurationVal = clip.duration / Math.max(1, totalItems);
        const createOption = (val: string, label: string, current: string) => `<option value="${val}" ${current===val?'selected':''}>${label}</option>`;

        let orderListHTML = '<div class="flex gap-1 overflow-x-auto pb-4 pt-2 px-1 custom-scrollbar">';
        g.order.forEach((contentIndex: number, uiIndex: number) => {
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

                <div class="bg-gray-800 p-2 rounded border border-gray-700">
                    <div class="flex justify-between text-[10px] text-gray-300 mb-1">
                        <span>Active Size (Focus)</span>
                        <span class="text-white font-mono" id="val-scale">x${g.activeScale}</span>
                    </div>
                    <input type="range" min="0.5" max="2.5" step="0.05" value="${g.activeScale}" 
                        class="w-full h-1 bg-gray-600 rounded-lg accent-pink-500 mb-3"
                        oninput="window.app.updateGridProp('${clipId}', 'activeScale', this.value)">

                    <div class="flex justify-between items-center mb-1">
                        <span class="text-[10px] text-gray-300">Passive Size (Resting)</span>
                        <span class="text-white font-mono" id="val-passive-scale">x${g.passiveScale}</span>
                    </div>
                    <div class="flex items-center gap-2 mb-1">
                        <input type="range" min="0.1" max="1.5" step="0.05" value="${g.passiveScale}" 
                            class="flex-1 h-1 bg-gray-600 rounded-lg accent-gray-400"
                            oninput="window.app.updateGridProp('${clipId}', 'passiveScale', this.value)">
                        
                        <label class="flex items-center gap-1 text-[8px] text-blue-300 cursor-pointer border border-gray-600 p-1 rounded hover:bg-gray-700" title="Neighbors shrink when active expands">
                            <input type="checkbox" ${g.shrinkPassive ? 'checked' : ''} 
                                onchange="window.app.updateGridProp('${clipId}', 'shrinkPassive', this.checked)"> 
                            Shrink
                        </label>
                    </div>

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
};
