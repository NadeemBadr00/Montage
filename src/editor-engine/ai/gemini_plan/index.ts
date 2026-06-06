// @ts-nocheck
import { PlanItem, PreviewRange } from './types';
import { generatePlanForChunk } from './api';
import { getSRTDuration, extractSRTChunkRange, stitchPlanResults } from './parser';
import { getPlanOptionsModalHTML, getPlanApprovalModalHTML, getPreviewUIHTML } from './ui';
import { bindPreviewMethods } from './plan-preview';

const PLAN_CHUNK_DURATION = 60;
const PLAN_OVERLAP = 5;

export class GeminiPlan {
    plannerData: PlanItem[];
    currentPlan: PlanItem[] | null;
    fullTranscript: string;
    selectedScenes: Set<number>;
    activePreviewRange: PreviewRange | null;
    previewLoopId: number | null;
    manualPlanLoaded: boolean;

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

    async createPlanFromTranscript(srtContent: string, customStyle: string = "") {
        this.fullTranscript = srtContent; 
        
        if (this.manualPlanLoaded) {
            const confirmReplace = confirm("توجد خطة محملة بالفعل. هل تريد إنشاء خطة جديدة واستبدال الحالية؟");
            if (!confirmReplace) return;
            this.manualPlanLoaded = false;
        }

        const totalDuration = getSRTDuration(srtContent);
        if (totalDuration === 0) {
            window.geminiChat.pushMessage('ai', '⚠️ ملف الترجمة فارغ أو غير صالح.');
            return;
        }

        const canvas = document.getElementById('preview-canvas') as HTMLCanvasElement;
        let width = 1920;
        let height = 1080;
        
        if (canvas) {
            width = canvas.width;
            height = canvas.height;
        }

        const videoDims = `${width}x${height}`;
        const safeY = Math.floor(height / 2 * 0.75);
        const safeX = Math.floor(width / 2 * 0.7);

        window.geminiChat.pushMessage('ai', `✅ جاري بناء الخطة (${customStyle || 'Minimalist'}) للأبعاد ${videoDims}...`);

        const promises = [];
        let chunkIndex = 0;

        for (let startTime = 0; startTime < totalDuration; startTime += PLAN_CHUNK_DURATION) {
            const endTime = startTime + PLAN_CHUNK_DURATION + PLAN_OVERLAP; 
            const chunkSRT = extractSRTChunkRange(srtContent, startTime, endTime);
            if (chunkSRT.trim().length > 0) {
                promises.push(generatePlanForChunk(chunkSRT, startTime, endTime, width, height, safeX, safeY, chunkIndex, customStyle));
                chunkIndex++;
            }
        }

        try {
            window.geminiChat.pushMessage('ai', `🚀 جاري هندسة المشاهد وتوزيع الطبقات (${promises.length} blocks)...`);
            const chunksResults = await Promise.all(promises);
            const fullPlan = stitchPlanResults(chunksResults);
            
            this.plannerData = fullPlan;
            this.currentPlan = fullPlan;
            
            window.geminiChat.pushMessage('ai', '✅ تم إنشاء الخطة بنجاح!');
            this.downloadPlanFile(fullPlan);
            this.showPlanApprovalModal(fullPlan);

        } catch (e) {
            console.error("Full Plan Error:", e);
            window.geminiChat.pushMessage('ai', '❌ حدث خطأ أثناء تجميع الخطة.');
        }
    }

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
        document.body.insertAdjacentHTML('beforeend', getPlanOptionsModalHTML());
    }

    closeOptionsModal() {
        const modal = document.getElementById('plan-options-modal');
        if(modal) modal.remove();
    }

    triggerAutoGeneration() {
        const styleInput = document.getElementById('plan-custom-style') as HTMLTextAreaElement;
        const customStyle = styleInput ? styleInput.value.trim() : "";

        this.closeOptionsModal();
        let targetSRT = this.fullTranscript;
        if (!targetSRT && window.aiManager && window.aiManager.lastGeneratedSRT) {
            targetSRT = window.aiManager.lastGeneratedSRT;
        }
        if (targetSRT) {
            this.createPlanFromTranscript(targetSRT, customStyle);
        } else {
            window.geminiChat.pushMessage('ai', '⚠️ لا يوجد ملف ترجمة (SRT) جاهز في الذاكرة.');
        }
    }

    hidePlanModal() {
        const modal = document.getElementById('ai-plan-modal');
        if (modal) modal.classList.add('hidden');
    }

    updatePlanItem(index: number, field: keyof PlanItem, value: string) {
        if (!this.plannerData[index]) return;
        
        if (field === 'start') {
            const num = parseFloat(value);
            if (!isNaN(num)) this.plannerData[index].start = num;
        } else if (field === 'track_id') {
             const num = parseInt(value.replace(/[^0-9]/g, ''));
             if (!isNaN(num)) this.plannerData[index].track_id = num;
        } else {
            (this.plannerData[index] as any)[field] = value.trim();
        }
    }

    deletePlanItem(index: number) {
        if (confirm('هل أنت متأكد من حذف هذا المشهد؟')) {
            this.plannerData.splice(index, 1);
            this.showPlanApprovalModal(this.plannerData);
        }
    }

    addNewPlanItem() {
        const newItem: PlanItem = {
            action: "upload",
            track_id: 2,
            start: 0,
            end: 5,
            desc: "New Scene",
            asset_query: "nature",
            cli_cmd: ""
        };
        this.plannerData.push(newItem);
        this.showPlanApprovalModal(this.plannerData);
        
        setTimeout(() => {
            const container = document.querySelector('#ai-plan-modal .custom-scrollbar');
            if(container) container.scrollTop = container.scrollHeight;
        }, 100);
    }

    showPlanApprovalModal(plan: PlanItem[]) {
        const existing = document.getElementById('ai-plan-modal');
        if(existing) existing.remove();

        this.selectedScenes.clear(); 
        document.body.insertAdjacentHTML('beforeend', getPlanApprovalModalHTML(plan));
    }

    toggleSceneSelection(index: number, isChecked: boolean) {
        if (isChecked) this.selectedScenes.add(index);
        else this.selectedScenes.delete(index);
    }

    changeAsset(index: number) {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*,video/*';
        input.style.display = 'none';
        document.body.appendChild(input);
        
        input.onchange = (e: any) => {
            const file = e.target.files[0];
            if (file) {
                const url = URL.createObjectURL(file);
                this.plannerData[index].custom_src = url; 
                this.plannerData[index].custom_type = file.type.startsWith('video') ? 'video' : 'image';
                this.plannerData[index].custom_name = file.name;
                
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

    executePlanItem(index: number, btnElement: HTMLElement | null) {
        const item = this.plannerData[index];
        const trackName = `V${item.track_id}`; 
        let isPlaceholder = false;

        if (item.action === 'upload') {
            if (item.custom_src) {
                this.addCustomAssetToTrack(item); 
            } else {
                isPlaceholder = true;
                const placeholderItem: PlanItem = {
                    ...item,
                    custom_name: `Scene ${index + 1} (Placeholder)`,
                    custom_type: 'image',
                    custom_src: `https://placehold.co/1920x1080/2a2a2a/FFF?text=${item.track_id === 4 ? 'Overlay' : 'Scene'}+${index + 1}+%0A${encodeURIComponent(item.asset_query)}`
                };
                this.addCustomAssetToTrack(placeholderItem);
            }
        } 
        else if (item.action === 'modify') {
            window.app.log(`> 🔧 Modifying ${trackName} at ${item.start}s`);
        }

        if (item.cli_cmd && item.cli_cmd.trim() !== '--') {
            setTimeout(() => {
                const track = window.app.tracks.find((t: any) => t.name === trackName);
                if (track) {
                    let targetIndex = -1;

                    if (item.action === 'upload') {
                        targetIndex = track.clips.length; 
                    } else {
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
                            // property commands (sc/op/ro/sx/sy/sz) need 'c' separator before clip index
                            // mv commands do NOT need it (they end with 'y' already)
                            const needsSep = /^(sc|op|ro|sx|sy|sz)\d/.test(singleCmd);
                            const finalCmd = needsSep
                                ? `${singleCmd}c${targetIndex}${trackName}`
                                : `${singleCmd}${targetIndex}${trackName}`;
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
            }
        }
    }

    addCustomAssetToTrack(item: PlanItem) {
        const targetTrackName = `V${item.track_id}`;
        const track = window.app.tracks.find((t: any) => t.name === targetTrackName); 
        
        if (track) {
            const newClip = new (window as any).Clip(
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
            if (window.app.saveState)  window.app.saveState();   // enable undo
            if (window.app.commitStateToReact) window.app.commitStateToReact(); // update React timeline
            
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
        window.geminiChat.pushMessage('ai', 'تم بدء تنفيذ الخطة بالكامل.');
    }

    downloadPlanFile(plan: PlanItem[]) {
        const blob = new Blob([JSON.stringify(plan, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `video_plan_${Date.now()}.json`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    async handlePlanUpload(input: HTMLInputElement) {
        const file = input.files?.[0];
        if (!file) return;
        try {
            const text = await file.text();
            const plan = JSON.parse(text);
            if (Array.isArray(plan)) {
                this.plannerData = plan;
                this.currentPlan = plan;
                this.manualPlanLoaded = true;
                window.geminiChat.pushMessage('ai', `📂 تم استدعاء الخطة: ${file.name}`);
                this.showPlanApprovalModal(plan);
            }
        } catch (e) {
            window.geminiChat.pushMessage('ai', '❌ ملف الخطة غير صالح.');
        }
        input.value = ''; 
    }
}

bindPreviewMethods(GeminiPlan);

// Inject instance globally
if (typeof window !== 'undefined') {
    window.geminiPlan = new GeminiPlan();
}
