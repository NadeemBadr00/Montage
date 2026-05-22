/**
 * 🗺️ Gemini Plan Engine (gemini_plan.js) - v9.1 (Syntax Fix & Stability)
 * التحديثات:
 * 1. 🛡️ JSON Stability: تقليل مدة الـ Chunk إلى 60 ثانية لمنع انقطاع النص (Truncation).
 * 2. 🚫 No Comments: تعديل البرومبت لمنع الموديل من كتابة تعليقات داخل الـ JSON تسبب SyntaxError.
 * 3. 🎨 Custom Style: (موجود سابقاً) إضافة حقل لإدخال ستايل المونتاج.
 * 4. ✏️ Manual Edit: (موجود سابقاً) إمكانية التعديل اليدوي.
 */

const PLAN_CHUNK_DURATION = 60; // تم التقليل من 90 لضمان استجابة JSON كاملة
const PLAN_OVERLAP = 5;         // تقليل التداخل قليلاً

class GeminiPlan {
    constructor() {
        this.plannerData = [];
        this.currentPlan = null; 
        this.fullTranscript = ""; 
        this.selectedScenes = new Set(); 
        this.activePreviewRange = null; 
        this.previewLoopId = null;
        this.manualPlanLoaded = false;
        
        this.injectPreviewUI();
    }

    // --- 1. Plan Generation Logic ---

    async createPlanFromTranscript(srtContent, customStyle = "") {
        this.fullTranscript = srtContent; 
        
        if (this.manualPlanLoaded) {
            const confirmReplace = confirm("توجد خطة محملة بالفعل. هل تريد إنشاء خطة جديدة واستبدال الحالية؟");
            if (!confirmReplace) return;
            this.manualPlanLoaded = false;
        }

        const totalDuration = this.getSRTDuration(srtContent);
        if (totalDuration === 0) {
            window.geminiChat.addChatMessage("model", "⚠️ ملف الترجمة فارغ أو غير صالح.");
            return;
        }

        // 🔥 قراءة الأبعاد من الفيديو الأساسي أو الكانفاس
        const canvas = document.getElementById('preview-canvas');
        let width = 1920;
        let height = 1080;
        
        if (canvas) {
            width = canvas.width;
            height = canvas.height;
        }

        const videoDims = `${width}x${height}`;
        const safeY = Math.floor(height / 2 * 0.75); // تقريباً 75% من النصف السفلي
        const safeX = Math.floor(width / 2 * 0.7);   // هامش أمان أفقي

        window.geminiChat.addChatMessage("system", `✅ جاري بناء الخطة (${customStyle || 'Minimalist'}) للأبعاد ${videoDims}...`);

        const promises = [];
        let chunkIndex = 0;

        for (let startTime = 0; startTime < totalDuration; startTime += PLAN_CHUNK_DURATION) {
            const endTime = startTime + PLAN_CHUNK_DURATION + PLAN_OVERLAP; 
            const chunkSRT = this.extractSRTChunkRange(srtContent, startTime, endTime);
            if (chunkSRT.trim().length > 0) {
                promises.push(this.generatePlanForChunk(chunkSRT, startTime, endTime, width, height, safeX, safeY, chunkIndex, customStyle));
                chunkIndex++;
            }
        }

        try {
            window.geminiChat.addChatMessage("system", `🚀 جاري هندسة المشاهد وتوزيع الطبقات (${promises.length} blocks)...`);
            const chunksResults = await Promise.all(promises);
            const fullPlan = this.stitchPlanResults(chunksResults);
            
            this.plannerData = fullPlan;
            this.currentPlan = fullPlan;
            
            window.geminiChat.addChatMessage("model", "✅ تم إنشاء الخطة بنجاح!");
            this.downloadPlanFile(fullPlan);
            this.showPlanApprovalModal(fullPlan);

        } catch (e) {
            console.error("Full Plan Error:", e);
            window.geminiChat.addChatMessage("model", "❌ حدث خطأ أثناء تجميع الخطة.");
        }
    }

    async generatePlanForChunk(srtChunk, startTime, endTime, W, H, safeX, safeY, index, customStyle) {
        const styleInstruction = customStyle ? `"${customStyle}"` : "MINIMALIST & CLEAN";
        
        // 🔥 البرومبت المحدث (Removed comments from JSON example to prevent SyntaxError)
        const prompt = `
            Act as an elite Video Editor with a **${styleInstruction}** style.
            🎥 **Canvas Context:**
            - Size: ${W}x${H} pixels.
            - **Center is (0,0)**.
            - Bottom Edge Y is approx +${H/2}px.
            - Safe Bottom Y for Speaker: **${safeY}px**.
            - Safe X Range: -${safeX}px (Left) to +${safeX}px (Right).

            📜 **Transcript Segment:**
            (${startTime}s to ${endTime}s)
            ${srtChunk}

            🧠 **CRITICAL EDITING RULES (STRICT):**
            
            0. **STYLE:** Strictly follow the user's requested style: ${styleInstruction}. Adjust pacing and visuals accordingly.

            1. **V2 (Backgrounds) - QUALITY OVER QUANTITY:** - **DO NOT** spam images every 2-3 seconds. This is forbidden.
               - **ALLOW GAPS:** It is perfectly fine to have NO background (empty V2) for 5-10 seconds if the text is generic or transitional.
               - Aim for longer visual durations (e.g., 5s to 12s) to let the viewer breathe.

            2. **V4 (Overlays) - SPARSE:** - Only use for **Critical Keywords** or specific visual punchlines. 
               - Do not caption every word.

            3. **V3 (Speaker) - ONE-TIME STATIC SETUP:** - **RULE:** Only generate a 'modify' command for V3 **IF AND ONLY IF** the start time is **0s** (The very beginning).
               - **IF START > 0s:** **DO NOT** include any V3 commands. DO NOT move, scale, or touch the speaker layer. He must remain exactly where he was placed at 0s for the entire video.
               - **AT 0s ONLY:** Place him fixed at Y=${safeY}px (Bottom) with 'sc100%'.

            🎛️ **CLI COMMANDS:**
            - **Move:** 'mv[X]x[Y]y' (e.g., 'mv-${safeX}x${safeY}y' for Left, 'mv0x${safeY}y' for Center).
            - **Scale:** 'sc80%' (Small), 'sc100%' (Normal).

            📤 **JSON Output Structure:**
            [
                { 
                  "action": "upload",
                  "track_id": 2, 
                  "start": 0.5, 
                  "end": 5.5, 
                  "desc": "Short description", 
                  "asset_query": "Specific search term OR none", 
                  "cli_cmd": "mv... sc..." 
                }
            ]
            
            **IMPORTANT:** 1. Return ONLY the JSON array. 
            2. Valid JSON (RFC 8259). 
            3. **NO comments** (like // or /*) inside the JSON.
            4. Escape special characters in strings.
        `;

        try {
            const responseText = await window.geminiChat.queryGemini(prompt);
            const jsonStart = responseText.indexOf('[');
            const jsonEnd = responseText.lastIndexOf(']') + 1;
            
            if (jsonStart === -1) {
                console.warn(`⚠️ Chunk ${index}: No JSON found.`);
                return [];
            }

            // Extract JSON string
            let jsonString = responseText.substring(jsonStart, jsonEnd);
            
            // 🔥 محاولة تنظيف بسيطة (إزالة الكومة الزائدة في النهاية إذا وجدت)
            jsonString = jsonString.replace(/,\s*]/g, ']');

            let chunkPlan = JSON.parse(jsonString);
            
            chunkPlan = chunkPlan.map(item => {
                if (item.start < startTime) item.start = startTime;
                if (item.end > endTime + 5) item.end = endTime; 
                if (item.start >= item.end) item.end = item.start + 5;

                item.track_id = parseInt(item.track_id) || 2;
                
                // تنظيف الوصف وكلمات البحث
                if (item.asset_query && item.asset_query !== 'none') {
                    const words = item.asset_query.split(' ');
                    if (words.length > 6) item.asset_query = words.slice(0, 6).join(' ');
                }
                if (item.desc && item.desc.length > 50) item.desc = item.desc.substring(0, 50) + "..";

                return item;
            });

            return chunkPlan.filter(item => item.start >= startTime - 5 && item.start <= endTime + 5);

        } catch (e) {
            console.error(`⚠️ Plan chunk ${index} failed:`, e);
            // إظهار جزء من النص للمساعدة في التشخيص
            console.log("Failed Response Text:", responseText.substring(0, 200) + "...");
            return [];
        }
    }

    stitchPlanResults(chunksArrays) {
        let allItems = [];
        const seenStarts = new Set(); 
        chunksArrays.forEach(chunk => {
            if (Array.isArray(chunk)) {
                chunk.forEach(item => {
                    const key = `${Math.floor(item.start)}_${item.track_id}`; 
                    if (!seenStarts.has(key)) {
                        allItems.push(item);
                        seenStarts.add(key);
                    }
                });
            }
        });
        allItems.sort((a, b) => a.start - b.start || a.track_id - b.track_id);
        return allItems;
    }

    // --- 2. Plan UI Management ---

    showLastPlan() {
        const existingModal = document.getElementById('ai-plan-modal');
        if (existingModal) {
            existingModal.classList.remove('hidden');
            return;
        }
        if (this.currentPlan && this.currentPlan.length > 0) {
            this.showPlanApprovalModal(this.currentPlan);
            return;
        }
        this.showPlanOptionsModal();
    }

    showPlanOptionsModal() {
        const existing = document.getElementById('plan-options-modal');
        if(existing) existing.remove();

        const html = `
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
        document.body.insertAdjacentHTML('beforeend', html);
    }

    closeOptionsModal() {
        const modal = document.getElementById('plan-options-modal');
        if(modal) modal.remove();
    }

    triggerAutoGeneration() {
        // 🔥 قراءة الستايل من الـ Textarea
        const styleInput = document.getElementById('plan-custom-style');
        const customStyle = styleInput ? styleInput.value.trim() : "";

        this.closeOptionsModal();
        let targetSRT = this.fullTranscript;
        if (!targetSRT && window.aiManager && window.aiManager.lastGeneratedSRT) {
            targetSRT = window.aiManager.lastGeneratedSRT;
        }
        if (targetSRT) {
            // 🔥 تمرير الستايل للدالة
            this.createPlanFromTranscript(targetSRT, customStyle);
        } else {
            window.geminiChat.addChatMessage("model", "⚠️ لا يوجد ملف ترجمة (SRT) جاهز في الذاكرة.");
        }
    }

    hidePlanModal() {
        const modal = document.getElementById('ai-plan-modal');
        if (modal) modal.classList.add('hidden');
    }

    // 🔥 دوال التعديل الجديدة (Update, Delete, Add)
    updatePlanItem(index, field, value) {
        if (!this.plannerData[index]) return;
        
        // Handle special parsing for numbers
        if (field === 'start') {
            const num = parseFloat(value);
            if (!isNaN(num)) this.plannerData[index].start = num;
        } else if (field === 'track_id') {
             // Extract number from "V2", "2", etc.
             const num = parseInt(value.replace(/[^0-9]/g, ''));
             if (!isNaN(num)) this.plannerData[index].track_id = num;
        } else {
            this.plannerData[index][field] = value.trim();
        }
    }

    deletePlanItem(index) {
        if (confirm('هل أنت متأكد من حذف هذا المشهد؟')) {
            this.plannerData.splice(index, 1);
            this.showPlanApprovalModal(this.plannerData); // Refresh UI
        }
    }

    addNewPlanItem() {
        // Default new item
        const newItem = {
            "action": "upload",
            "track_id": 2,
            "start": 0,
            "end": 5,
            "desc": "New Scene",
            "asset_query": "nature",
            "cli_cmd": ""
        };
        this.plannerData.push(newItem);
        this.showPlanApprovalModal(this.plannerData); // Refresh UI
        
        // Scroll to bottom
        setTimeout(() => {
            const container = document.querySelector('#ai-plan-modal .custom-scrollbar');
            if(container) container.scrollTop = container.scrollHeight;
        }, 100);
    }

    showPlanApprovalModal(plan) {
        const existing = document.getElementById('ai-plan-modal');
        if(existing) existing.remove();

        this.selectedScenes.clear(); 

        let rows = plan.map((item, idx) => {
            const isModify = item.action === 'modify';
            const trackLabel = `V${item.track_id}`;
            const trackColor = item.track_id === 3 ? 'text-green-400' : (item.track_id === 4 ? 'text-purple-400' : 'text-blue-400');
            
            // Search Link only for uploads
            const searchLink = (!isModify && item.asset_query !== 'none') ? `
                <a href="https://www.google.com/search?q=${encodeURIComponent(item.asset_query)}&tbm=isch" 
                   target="_blank" class="text-purple-400 hover:text-purple-200 italic text-[10px] flex items-center gap-1 transition-colors group">
                    <i class="fa-solid fa-magnifying-glass"></i>
                </a>
            ` : ``;

            // Compact Description with CLI Badge
            const cliBadge = item.cli_cmd ? `<span class="bg-gray-700 text-yellow-300 px-1 rounded ml-1 font-mono text-[9px]">${item.cli_cmd}</span>` : '';

            // 🔥 EDITABLE CELLS: contenteditable="true" added to TD elements
            return `
            <tr class="border-b border-gray-700 hover:bg-gray-700/50 transition-colors group" id="plan-row-${idx}">
                <td class="p-2 text-center w-8">
                    <input type="checkbox" onchange="window.geminiPlan.toggleSceneSelection(${idx}, this.checked)" 
                    class="accent-purple-600 w-3 h-3 cursor-pointer">
                </td>
                
                <!-- Start Time (Editable) -->
                <td class="p-2 text-center text-gray-400 font-mono text-[10px] whitespace-nowrap w-16 border-l border-transparent hover:border-gray-600 focus-within:bg-gray-800"
                    contenteditable="true"
                    onblur="window.geminiPlan.updatePlanItem(${idx}, 'start', this.innerText)">
                    ${Math.floor(item.start * 100) / 100}
                </td>

                <!-- Track (Editable) -->
                <td class="p-2 text-center font-bold ${trackColor} text-[10px] w-10 border-l border-transparent hover:border-gray-600 focus-within:bg-gray-800"
                    contenteditable="true"
                    onblur="window.geminiPlan.updatePlanItem(${idx}, 'track_id', this.innerText)">
                    ${trackLabel}
                </td>

                <!-- Description (Editable) -->
                <td class="p-2 text-white font-cairo text-right text-[10px] max-w-[120px] truncate border-l border-transparent hover:border-gray-600 focus-within:bg-gray-800 cursor-text" 
                    title="${item.desc}"
                    contenteditable="true"
                    onblur="window.geminiPlan.updatePlanItem(${idx}, 'desc', this.innerText)">
                    ${item.desc}
                </td>

                <!-- Search Query (Editable) -->
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

                <!-- CLI Cmd (Editable) -->
                <td class="p-2 text-center w-16 border-l border-transparent hover:border-gray-600 focus-within:bg-gray-800">
                     <span class="text-yellow-500 font-mono text-[9px] cursor-text"
                           contenteditable="true"
                           onblur="window.geminiPlan.updatePlanItem(${idx}, 'cli_cmd', this.innerText)">
                           ${item.cli_cmd || '--'}
                     </span>
                </td>

                <!-- Actions (Upload, Execute, Delete) -->
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

        const modalHTML = `
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
                        
                        <!-- Add New Item Button -->
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
        document.body.insertAdjacentHTML('beforeend', modalHTML);
    }

    toggleSceneSelection(index, isChecked) {
        if (isChecked) this.selectedScenes.add(index);
        else this.selectedScenes.delete(index);
    }

    changeAsset(index) {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*,video/*';
        input.style.display = 'none';
        document.body.appendChild(input);
        
        input.onchange = (e) => {
            const file = e.target.files[0];
            if (file) {
                const url = URL.createObjectURL(file);
                this.plannerData[index].custom_src = url; 
                this.plannerData[index].custom_type = file.type.startsWith('video') ? 'video' : 'image';
                this.plannerData[index].custom_name = file.name;
                
                // Visual update only
                const label = document.getElementById(`custom-file-label-${index}`);
                if(label) {
                    label.classList.remove('hidden');
                    label.innerHTML = `<i class="fa-solid fa-check"></i>`;
                }
            }
            input.remove();
        };
        input.click();
    }

    executePlanItem(index, btnElement) {
        const item = this.plannerData[index];
        const trackName = `V${item.track_id}`; 
        let isPlaceholder = false;

        // 1. Upload Logic (For V2/V4)
        if (item.action === 'upload') {
            if (item.custom_src) {
                this.addCustomAssetToTrack(item); 
            } else {
                // Placeholder Logic
                isPlaceholder = true;
                const placeholderItem = {
                    ...item,
                    custom_name: `Scene ${index + 1} (Placeholder)`,
                    custom_type: 'image',
                    custom_src: `https://placehold.co/1920x1080/2a2a2a/FFF?text=${item.track_id === 4 ? 'Overlay' : 'Scene'}+${index + 1}+%0A${encodeURIComponent(item.asset_query)}`
                };
                this.addCustomAssetToTrack(placeholderItem);
            }
        } 
        // 2. Modify Logic (For V3 - Speaker)
        else if (item.action === 'modify') {
            // No upload needed, just proceed to effects
            window.app.log(`> 🔧 Modifying ${trackName} at ${item.start}s`);
        }

        // 🔥 Apply Extra CLI Commands
        if (item.cli_cmd && item.cli_cmd.trim() !== '--') {
            setTimeout(() => {
                const track = window.app.tracks.find(t => t.name === trackName);
                if (track) {
                    let targetIndex = -1;

                    if (item.action === 'upload') {
                        targetIndex = track.clips.length; 
                    } else {
                        // Find clip at start time
                        const sortedClips = [...track.clips].sort((a,b) => a.start - b.start);
                        const foundClipIdx = sortedClips.findIndex(c => 
                            item.start >= c.start && item.start < (c.start + c.duration)
                        );
                        if (foundClipIdx !== -1) targetIndex = foundClipIdx + 1;
                    }

                    if (targetIndex !== -1) {
                        const cmds = item.cli_cmd.split(' ');
                        cmds.forEach(singleCmd => {
                            if(!singleCmd) return;
                            const finalCmd = `${singleCmd}${targetIndex}${trackName}`; 
                            window.app.log(`> 🤖 Auto-Applying: ${finalCmd}`);
                            window.geminiChat.runCLI(finalCmd);
                        });
                    }
                }
            }, 1200); 
        }

        if(btnElement) {
            if (isPlaceholder && item.action === 'upload') {
                btnElement.innerHTML = '<i class="fa-solid fa-hourglass-half"></i>';
                btnElement.classList.replace('bg-green-600', 'bg-yellow-600');
                btnElement.title = "تم إضافة مؤقت - اضغط للتحديث بعد الرفع";
            } else {
                btnElement.innerHTML = '<i class="fa-solid fa-check"></i>';
                btnElement.classList.remove('bg-green-600', 'bg-yellow-600');
                btnElement.classList.add('bg-gray-600');
                // btnElement.disabled = true; // Allow re-execution if needed
            }
        }
    }

    addCustomAssetToTrack(item) {
        const targetTrackName = `V${item.track_id}`;
        const track = window.app.tracks.find(t => t.name === targetTrackName); 
        
        if (track) {
            const newClip = new Clip(
                `custom_${Date.now()}`, 
                item.custom_name, 
                item.start, 
                (item.end - item.start) || 5, 
                item.custom_type, 
                item.custom_src
            );
            track.addClip(newClip);
            window.app.resolveCollisions(track.id, newClip);
            window.app.renderTracks();
            window.app.syncOverlays();
            
            const cmdStr = `u${window.geminiChat.timeToCLI(item.start)}:${window.geminiChat.timeToCLI(item.end)}${targetTrackName}`;
            window.app.log(`> ⌨️ Auto-Executed: ${cmdStr} (Custom File)`);
        }
    }

    executeAllPlan() {
        this.plannerData.forEach((item, idx) => {
            setTimeout(() => {
                this.executePlanItem(idx, null);
            }, idx * 1500); 
        });
        this.hidePlanModal();
        window.geminiChat.addChatMessage("model", "تم بدء تنفيذ الخطة بالكامل.");
    }

    injectPreviewUI() {
        const ui = `
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
        document.body.insertAdjacentHTML('beforeend', ui);
    }

    startPreviewMode(index) {
        const item = this.plannerData[index];
        this.hidePlanModal();
        document.getElementById('ai-preview-overlay').classList.remove('hidden');
        document.getElementById('ai-preview-overlay').classList.add('flex');
        this.activePreviewRange = { start: item.start, end: item.end || item.start + 5 };
        this.playRange(this.activePreviewRange.start, this.activePreviewRange.end);
    }

    replayCurrentPreview() {
        if (this.activePreviewRange) {
            this.playRange(this.activePreviewRange.start, this.activePreviewRange.end);
        }
    }

    exitPreviewMode() {
        if (window.app) window.app.pausePlayback(); 
        if (this.previewLoopId) cancelAnimationFrame(this.previewLoopId);
        
        const overlay = document.getElementById('ai-preview-overlay');
        if (overlay) {
            overlay.classList.add('hidden');
            overlay.classList.remove('flex');
        }
        this.showLastPlan(); 
    }

    async previewSelectedScenes() {
        if (this.selectedScenes.size === 0) return;
        const indices = Array.from(this.selectedScenes).sort((a, b) => a - b);
        this.hidePlanModal();
        document.getElementById('ai-preview-overlay').classList.remove('hidden');
        document.getElementById('ai-preview-overlay').classList.add('flex');
        
        const playNext = (i) => {
            if (i >= indices.length || document.getElementById('ai-preview-overlay').classList.contains('hidden')) {
                if (!document.getElementById('ai-preview-overlay').classList.contains('hidden')) {
                    this.exitPreviewMode();
                }
                return;
            }
            const idx = indices[i];
            const item = this.plannerData[idx];
            this.activePreviewRange = { start: item.start, end: item.end || item.start + 5 };
            this.playRange(item.start, item.end || item.start + 5, () => {
                setTimeout(() => playNext(i + 1), 500);
            });
        };
        playNext(0);
    }

    playRange(start, end, onComplete) {
        if (!window.app) return;
        if (this.previewLoopId) cancelAnimationFrame(this.previewLoopId);
        
        window.app.currentTime = start;
        window.app.seek(0);
        setTimeout(() => window.app.startPlayback(), 50);
        
        const checkTime = () => {
            const overlay = document.getElementById('ai-preview-overlay');
            if (!overlay || overlay.classList.contains('hidden')) return;

            if (window.app.isPlaying && window.app.currentTime >= end) {
                window.app.pausePlayback();
                if (onComplete) onComplete();
            } else {
                this.previewLoopId = requestAnimationFrame(checkTime);
            }
        };
        this.previewLoopId = requestAnimationFrame(checkTime);
    }

    downloadPlanFile(plan) {
        const blob = new Blob([JSON.stringify(plan, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `video_plan_${Date.now()}.json`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    async handlePlanUpload(input) {
        const file = input.files[0];
        if (!file) return;
        try {
            const text = await file.text();
            const plan = JSON.parse(text);
            if (Array.isArray(plan)) {
                this.plannerData = plan;
                this.currentPlan = plan;
                this.manualPlanLoaded = true;
                window.geminiChat.addChatMessage("system", `📂 تم استدعاء الخطة: ${file.name}`);
                this.showPlanApprovalModal(plan);
            }
        } catch (e) {
            window.geminiChat.addChatMessage("model", "❌ ملف الخطة غير صالح.");
        }
        input.value = ''; 
    }

    timeStringToSeconds(timeStr) {
        if (!timeStr) return 0;
        const [p1, p2] = timeStr.split(',');
        const ms = p2 ? parseInt(p2) : 0;
        const parts = p1.split(':');
        let h = 0, m = 0, s = 0;
        if (parts.length === 3) { h = parseInt(parts[0]); m = parseInt(parts[1]); s = parseInt(parts[2]); }
        else if (parts.length === 2) { m = parseInt(parts[0]); s = parseInt(parts[1]); }
        return (h * 3600) + (m * 60) + s + (ms / 1000);
    }

    getSRTDuration(srtContent) {
        const blocks = srtContent.trim().split(/\n\s*\n/);
        if (blocks.length === 0) return 0;
        const lastBlock = blocks[blocks.length - 1];
        const lines = lastBlock.split('\n');
        const timeLine = lines.find(l => l.includes('-->'));
        if (timeLine) {
            const endStr = timeLine.split('-->')[1].trim();
            return this.timeStringToSeconds(endStr);
        }
        return 0;
    }

    extractSRTChunkRange(srtContent, startSec, endSec) {
        if (!srtContent) return "";
        const blocks = srtContent.trim().split(/\n\s*\n/);
        let chunk = "";
        for (const block of blocks) {
            const lines = block.split('\n');
            const timeLine = lines.find(l => l.includes('-->'));
            if (timeLine) {
                const rangeStr = timeLine.split('-->');
                const s = this.timeStringToSeconds(rangeStr[0].trim());
                if (s >= startSec && s < endSec) {
                    chunk += block + "\n\n";
                }
            }
        }
        return chunk;
    }
}

window.geminiPlan = new GeminiPlan();