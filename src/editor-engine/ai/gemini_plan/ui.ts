// @ts-nocheck
import { PlanItem } from './types';

export const getPlanOptionsModalHTML = (): string => `
    <div id="plan-options-modal" class="fixed inset-0 bg-black/80 z-[2000] flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in-up">
        <div class="bg-gray-800 rounded-xl border border-gray-600 shadow-2xl p-8 max-w-md w-full text-center relative overflow-hidden">
            <div class="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-32 bg-purple-500/20 blur-[50px] rounded-full pointer-events-none"></div>
            
            <h3 class="text-xl font-bold text-white mb-6 font-cairo relative z-10">
                <i class="fa-solid fa-clipboard-list text-purple-400"></i> إدارة خطة المونتاج
            </h3>
            
            <div class="space-y-4 relative z-10">
                <button onclick="document.getElementById('header-plan-upload').click(); window.geminiPlan.closeOptionsModal()" 
                    class="w-full bg-gray-700 hover:bg-gray-600 text-white py-4 rounded-lg border border-gray-500 transition-all flex items-center justify-center gap-3 group">
                    <span class="font-bold text-sm">رفع خطة (JSON)</span>
                </button>

                <div class="border-t border-gray-600 pt-4 mt-2">
                     <div class="relative group text-right mb-4">
                        <label class="text-[10px] text-gray-400 mb-1 block font-bold">وصف الستايل (اختياري):</label>
                        <textarea id="plan-custom-style" rows="2" 
                            class="w-full bg-gray-900 border border-gray-600 rounded p-3 text-xs text-white focus:border-purple-500 focus:outline-none placeholder-gray-600 resize-none font-cairo"
                            placeholder="مثال: سريع، غامض، وثائقي، كوميدي، بطيء، ألوان زاهية..."></textarea>
                    </div>

                    <button onclick="window.geminiPlan.triggerAutoGeneration()" 
                        class="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white py-4 rounded-lg border border-indigo-400/30 transition-all flex items-center justify-center gap-3 shadow-lg hover:shadow-indigo-500/20 group">
                        <i class="fa-solid fa-wand-magic-sparkles text-yellow-300"></i>
                        <span class="font-bold text-sm">إنشاء خطة جديدة</span>
                    </button>
                </div>
            </div>

            <button onclick="window.geminiPlan.closeOptionsModal()" class="mt-6 text-gray-500 hover:text-gray-300 text-xs underline relative z-10">إغلاق</button>
        </div>
    </div>
`;

export const getPlanApprovalModalHTML = (plan: PlanItem[]): string => {
    let rows = plan.map((item, idx) => {
        const isModify = item.action === 'modify';
        const trackLabel = `V${item.track_id}`;
        const trackColor = item.track_id === 3 ? 'text-green-400' : (item.track_id === 4 ? 'text-purple-400' : 'text-blue-400');
        
        const searchLink = (!isModify && item.asset_query !== 'none') ? `
            <a href="https://www.google.com/search?q=${encodeURIComponent(item.asset_query)}&tbm=isch" 
               target="_blank" class="text-purple-400 hover:text-purple-200 italic text-[10px] flex items-center gap-1 transition-colors group">
                <i class="fa-solid fa-magnifying-glass"></i>
            </a>
        ` : ``;

        const cliBadge = item.cli_cmd ? `<span class="bg-gray-700 text-yellow-300 px-1 rounded ml-1 font-mono text-[9px]">${item.cli_cmd}</span>` : '';

        return `
        <tr class="border-b border-gray-700 hover:bg-gray-700/50 transition-colors group" id="plan-row-${idx}">
            <td class="p-2 text-center w-8">
                <input type="checkbox" onchange="window.geminiPlan.toggleSceneSelection(${idx}, this.checked)" 
                class="accent-purple-600 w-3 h-3 cursor-pointer">
            </td>
            
            <td class="p-2 text-center text-gray-400 font-mono text-[10px] whitespace-nowrap w-16 border-l border-transparent hover:border-gray-600 focus-within:bg-gray-800"
                contenteditable="true"
                onblur="window.geminiPlan.updatePlanItem(${idx}, 'start', this.innerText)">
                ${Math.floor(item.start * 100) / 100}
            </td>

            <td class="p-2 text-center font-bold ${trackColor} text-[10px] w-10 border-l border-transparent hover:border-gray-600 focus-within:bg-gray-800"
                contenteditable="true"
                onblur="window.geminiPlan.updatePlanItem(${idx}, 'track_id', this.innerText)">
                ${trackLabel}
            </td>

            <td class="p-2 text-white font-cairo text-right text-[10px] max-w-[120px] truncate border-l border-transparent hover:border-gray-600 focus-within:bg-gray-800 cursor-text" 
                title="${item.desc}"
                contenteditable="true"
                onblur="window.geminiPlan.updatePlanItem(${idx}, 'desc', this.innerText)">
                ${item.desc}
            </td>

            <td class="p-2 text-left w-28 border-l border-transparent hover:border-gray-600 focus-within:bg-gray-800">
                <div class="flex items-center justify-between gap-1">
                    <span class="text-gray-400 italic text-[9px] w-full cursor-text" 
                          contenteditable="true"
                          onblur="window.geminiPlan.updatePlanItem(${idx}, 'asset_query', this.innerText)">
                          ${item.asset_query}
                    </span>
                    ${searchLink}
                    <span id="custom-file-label-${idx}" class="text-[9px] text-green-400 hidden"><i class="fa-solid fa-check"></i></span>
                </div>
            </td>

            <td class="p-2 text-center w-16 border-l border-transparent hover:border-gray-600 focus-within:bg-gray-800">
                 <span class="text-yellow-500 font-mono text-[9px] cursor-text"
                       contenteditable="true"
                       onblur="window.geminiPlan.updatePlanItem(${idx}, 'cli_cmd', this.innerText)">
                       ${item.cli_cmd || '--'}
                 </span>
            </td>

            <td class="p-2 text-center w-24">
                <div class="flex items-center justify-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                    ${!isModify ? `
                    <button onclick="window.geminiPlan.changeAsset(${idx})" class="text-gray-400 hover:text-blue-400 transition-colors text-[10px]" title="رفع ملف">
                        <i class="fa-solid fa-upload"></i>
                    </button>
                    ` : ''}
                    
                    <button onclick="window.geminiPlan.executePlanItem(${idx}, this)" class="bg-green-600 hover:bg-green-500 text-white w-5 h-5 rounded flex items-center justify-center text-[9px]" title="تطبيق">
                        <i class="fa-solid fa-plus"></i>
                    </button>

                    <button onclick="window.geminiPlan.deletePlanItem(${idx})" class="text-red-500 hover:text-red-400 transition-colors text-[10px] ml-1" title="حذف">
                        <i class="fa-solid fa-trash"></i>
                    </button>
                </div>
            </td>
        </tr>
    `}).join('');

    return `
        <div id="ai-plan-modal" class="fixed inset-0 bg-black/80 z-[2000] flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in-up">
            <div class="bg-gray-800 rounded-xl border border-purple-500 shadow-2xl w-full max-w-5xl max-h-[85vh] flex flex-col">
                <div class="p-3 border-b border-gray-700 flex justify-between items-center bg-gradient-to-r from-purple-900 to-gray-900 rounded-t-xl">
                    <div class="flex items-center gap-2">
                        <h3 class="text-md font-bold text-white font-cairo"><i class="fa-solid fa-wand-magic-sparkles"></i> خطة المونتاج (Editable)</h3>
                        <span class="text-xs text-gray-400 bg-black/30 px-2 py-1 rounded">يمكنك الضغط على النصوص للتعديل</span>
                    </div>
                    <div class="flex gap-2">
                        <button onclick="window.geminiPlan.downloadPlanFile(window.geminiPlan.currentPlan)" class="text-gray-400 hover:text-white px-2">
                            <i class="fa-solid fa-download"></i>
                        </button>
                        <button onclick="window.geminiPlan.hidePlanModal()" class="text-gray-400 hover:text-white px-2">
                            <i class="fa-solid fa-xmark"></i>
                        </button>
                    </div>
                </div>
                <div class="overflow-y-auto p-0 flex-1 custom-scrollbar" dir="rtl">
                    <table class="w-full text-xs text-right border-collapse">
                        <thead class="bg-gray-900 text-gray-400 sticky top-0 z-10 shadow-sm font-cairo">
                            <tr>
                                <th class="p-2 w-8">#</th>
                                <th class="p-2 w-16">وقت (s)</th>
                                <th class="p-2 w-10">Track</th>
                                <th class="p-2">الوصف (اضغط للتعديل)</th>
                                <th class="p-2 w-28">Asset Query</th>
                                <th class="p-2 w-16">CLI</th>
                                <th class="p-2 w-24">إجراءات</th>
                            </tr>
                        </thead>
                        <tbody>${rows}</tbody>
                    </table>
                    
                    <div class="p-2 text-center border-t border-gray-700 bg-gray-800/50 hover:bg-gray-800 transition-colors cursor-pointer" onclick="window.geminiPlan.addNewPlanItem()">
                        <i class="fa-solid fa-circle-plus text-green-500"></i> <span class="text-gray-400 text-xs font-bold">إضافة مشهد جديد</span>
                    </div>
                </div>
                <div class="p-3 border-t border-gray-700 bg-gray-900 flex justify-between items-center rounded-b-xl gap-4">
                    <button onclick="window.geminiPlan.previewSelectedScenes()" class="bg-yellow-600 hover:bg-yellow-500 text-white px-4 py-2 rounded font-bold text-xs font-cairo flex items-center gap-2">
                        <i class="fa-solid fa-play"></i> معاينة
                    </button>
                    <button onclick="window.geminiPlan.executeAllPlan()" class="bg-purple-600 hover:bg-purple-500 text-white px-4 py-2 rounded font-bold text-xs font-cairo">
                        <i class="fa-solid fa-layer-group"></i> تطبيق الكل (مع صور مؤقتة)
                    </button>
                </div>
            </div>
        </div>
    `;
};

export const getPreviewUIHTML = (): string => `
    <div id="ai-preview-overlay" class="fixed top-20 left-1/2 -translate-x-1/2 bg-gray-900/90 border border-yellow-500/50 rounded-full px-6 py-2 z-[9999] hidden flex items-center gap-4 shadow-2xl backdrop-blur-md animate-fade-in-up">
        <div class="text-yellow-400 font-bold font-cairo text-sm flex items-center gap-2">
            <i class="fa-solid fa-eye animate-pulse"></i> وضع المعاينة
        </div>
        <div class="h-4 w-px bg-gray-600"></div>
        <button onclick="window.geminiPlan.replayCurrentPreview()" class="text-white hover:text-green-400 transition-colors text-xs flex items-center gap-1">
            <i class="fa-solid fa-rotate-left"></i> إعادة
        </button>
        <div class="h-4 w-px bg-gray-600"></div>
        <button onclick="window.geminiPlan.exitPreviewMode()" class="bg-red-600 hover:bg-red-500 text-white px-3 py-1 rounded-full text-xs font-bold transition-colors">
            إنهاء
        </button>
    </div>
`;
