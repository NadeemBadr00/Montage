// @ts-nocheck
import { ensureFrameProperties } from './types';

export const injectFrameUI = () => {
    const originalUpdateEffectControlsFrame = window.EditorApp.prototype.updateEffectControls;

    window.EditorApp.prototype.updateEffectControls = function() {
        if (originalUpdateEffectControlsFrame) {
            originalUpdateEffectControlsFrame.call(this);
        }

        const panelArea = document.getElementById('pro-features-area');
        if (!panelArea) return;
        // ✅ Smart group: handle video+audio groupId pair
        let clipId = null;
        if (this.selectedClipIds.size === 1) {
            clipId = Array.from(this.selectedClipIds)[0];
        } else if (this.selectedClipIds.size > 1) {
            const allSel = Array.from(this.selectedClipIds).map((id: string) => this.tracks.flatMap((t: any) => t.clips).find((c: any) => c.id === id)).filter(Boolean);
            const grpIds = [...new Set(allSel.map((c: any) => c.groupId).filter(Boolean))];
            if (grpIds.length === 1) {
                const p = allSel.find((c: any) => c.type === 'video') || allSel.find((c: any) => c.type !== 'audio');
                if (p) clipId = (p as any).id;
            }
        }
        if (!clipId) return;

        const clip = this.tracks.flatMap((t: any) => t.clips).find((c: any) => c.id === clipId);
        if (!clip) return;

        ensureFrameProperties(clip);

        // Collect video assets and their durations for the "Match" button
        let videoAssets: any[] = [];
        let totalVideoDuration = 0;
        if (clip.frame.assets && clip.frame.assets.length > 0) {
            clip.frame.assets.forEach((asset: any) => {
                if (asset._isVideoAsset || asset.tagName === 'VIDEO') {
                    videoAssets.push(asset);
                    if (asset.duration && isFinite(asset.duration)) {
                        totalVideoDuration += asset.duration;
                    }
                }
            });
        }

        const matchBtnHTML = videoAssets.length > 0 ? `
        <div class="mt-3 mb-1">
            <button 
                onclick="window.app.matchFrameToVideoDuration('${clipId}')"
                class="w-full py-2 px-3 rounded-lg bg-teal-700/60 hover:bg-teal-600/80 border border-teal-500/40 text-teal-200 text-[10px] font-bold transition-all flex items-center justify-center gap-2 group shadow-[0_0_12px_rgba(20,184,166,0.15)] hover:shadow-[0_0_16px_rgba(20,184,166,0.3)]"
                title="Set clip duration to match the uploaded video duration"
            >
                <i class="fa-solid fa-link-horizontal group-hover:scale-110 transition-transform"></i>
                Match Video Duration
                <span class="ml-auto bg-teal-900/60 text-teal-300 px-1.5 py-0.5 rounded text-[9px] font-mono">${totalVideoDuration > 0 ? totalVideoDuration.toFixed(1) + 's' : '?s'}</span>
            </button>
        </div>
        ` : '';

        let assetsListHTML = '';
        if (clip.frame.assets && clip.frame.assets.length > 0) {
            assetsListHTML = `<div class="grid grid-cols-4 gap-2 mb-2">`;
            clip.frame.assets.forEach((img: any, idx: number) => {
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

                    ${matchBtnHTML}
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
};
