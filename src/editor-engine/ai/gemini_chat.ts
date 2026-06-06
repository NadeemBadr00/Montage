// @ts-nocheck
/**
 * 🧠 Gemini Chat Engine — v10.0 (Full CMD Parity + React Bridge)
 * All CMD commands are now accessible via natural language.
 * Messages are pushed to React via onMessage/onThinkingChange callbacks.
 */

import { GoogleGenerativeAI } from "https://esm.run/@google/generative-ai";
import { BrainInstance, AI4MONTAGE_MODELS } from "./ai4montage_brain";
import { bindGeminiActions } from './gemini-actions';

class GeminiChat {
    constructor() {
        this.enabled = false;
        this.chatHistory = [];
        // React bridge: RightPanel sets these to receive messages/thinking state
        this.onMessage = null;
        this.isThinking = false;
        this.onThinkingChange = null;
    }

    // ─── API ─────────────────────────────────────────────────────────────────

    getAvailableKeys() {
        return BrainInstance.getShuffledKeys();
    }

    async queryGemini(prompt, history = []) {
        const userKey = document.getElementById('ai4montage-api-key')?.value?.trim() || document.getElementById('gemini-api-key')?.value?.trim();
        const MODELS = [
            "gemini-2.5-flash",
            "gemini-2.0-flash"
        ]; // Use only stable models

        let availableKeys = this.getAvailableKeys();
        if (userKey) {
            availableKeys = [userKey, ...availableKeys.filter(k => k !== userKey)];
        }

        let lastGlobalErr = '';

        // Build contents from history and prompt
        const contents = [];
        if (Array.isArray(history)) {
            contents.push(...history);
        }
        contents.push({ role: 'user', parts: [{ text: prompt }] });

        for (const modelName of MODELS) {
            // Try all keys on the preferred model before falling back to an older model
            for (let i = 0; i < availableKeys.length; i++) {
                const currentKey = availableKeys[i];
                try {
                    const genAI = new GoogleGenerativeAI(currentKey);
                    const model = genAI.getGenerativeModel({
                        model: modelName,
                        safetySettings: [
                            { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_ONLY_HIGH' },
                            { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_ONLY_HIGH' },
                            { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_ONLY_HIGH' },
                            { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_ONLY_HIGH' },
                        ],
                    });

                    const result = await model.generateContent({ contents });

                    const candidate = result.response?.candidates?.[0];
                    const finishReason = candidate?.finishReason;

                    if (!candidate || finishReason === 'SAFETY' || finishReason === 'RECITATION') {
                        throw new Error(`BLOCKED:${finishReason || 'SAFETY'}`);
                    }

                    const parts = candidate.content?.parts;
                    if (!parts || parts.length === 0) {
                        throw new Error('BLOCKED:EMPTY_PARTS');
                    }

                    if (window.app?.log) window.app.log(`✅ [المساعد/Chat] نجح | مفتاح: ...${currentKey.slice(-4)} | موديل: ${modelName}`);
                    return result.response.text();

                } catch (error) {
                    const msg = String(error?.message || error);
                    lastGlobalErr = msg;
                    console.warn(`[Chat] Key ...${currentKey.slice(-4)} Model ${modelName} failed: ${msg}`);

                    // ✅ Immediately ban keys that are permanently broken (suspended/exhausted)
                    const isSuspended = msg.includes('CONSUMER_SUSPENDED') || msg.includes('403');
                    const isExhausted = msg.includes('limit: 0') || msg.includes('quota') && msg.includes('day');
                    if (isSuspended || isExhausted) {
                        BrainInstance.banKey(currentKey);
                    }

                    if (msg.startsWith('BLOCKED:')) {
                        if (window.app?.log) window.app.log(`🚫 [المساعد/Chat] تم حجب الرد أمنياً (Safety Filter)`);
                        throw error; // Safety block is terminal
                    }

                    // If it's a 400 Bad Request payload error (e.g. invalid prompt), switching keys won't help.
                    if (msg.includes('400') && !msg.includes('API key')) {
                        throw new Error(`❌ Bad Request Error: ${msg}`);
                    }

                    // Otherwise, continue to the next key
                }
            }
        }
        
        throw new Error(`❌ AI Keys Exhausted. Details: ${lastGlobalErr || 'Unknown error'}`);
    }


    async init() {
        this.enabled = true;
        if (window.app) window.app.log("🤖 AI Assistant Ready (v10.0)");
    }

    // ─── React Bridge ────────────────────────────────────────────────────────

    pushMessage(role, text) {
        if (this.onMessage) this.onMessage({ role, text, id: Date.now() + Math.random() });
    }

    setThinking(val) {
        this.isThinking = val;
        if (this.onThinkingChange) this.onThinkingChange(val);
    }

    // ─── Helpers ─────────────────────────────────────────────────────────────

    timeToCLI(seconds) {
        if (seconds === undefined || seconds === null) return "0s";
        let s = Math.floor(seconds);
        let m = Math.floor(s / 60);
        let h = Math.floor(m / 60);
        s = s % 60;
        m = m % 60;
        let str = "";
        if (h > 0) str += `${h}h`;
        if (m > 0) str += `${m}m`;
        str += `${s}s`;
        return str || "0s";
    }

    runCLI(cmdStr) {
        if (!window.app || !window.app.executeCommand) return;
        window.app.commandBuffer = cmdStr;
        if (window.app.cmdBufferEl) window.app.cmdBufferEl.innerText = cmdStr;
        if (window.app.updateConsoleVisuals) window.app.updateConsoleVisuals();
        this.pushMessage('cmd', `⌨️ ${cmdStr}`);
        window.app.executeCommand();
    }

    getDetailedProjectState() {
        const canvasW = window.app.canvas ? window.app.canvas.width : 1920;
        const canvasH = window.app.canvas ? window.app.canvas.height : 1080;

        const tracks = window.app.tracks.map((t) => {
            const sortedClips = [...t.clips].sort((a, b) => a.start - b.start);
            const clips = sortedClips.map((c, idx) => ({
                id: c.id,
                name: c.name,
                order: `Part ${idx + 1}`,
                start: parseFloat(c.start.toFixed(1)),
                end: parseFloat(c.end.toFixed(1)),
                props: {
                    x: c.sandwich?._isSmart ? c.sandwich.offsetX : c.properties?.positionX,
                    y: c.sandwich?._isSmart ? c.sandwich.offsetY : c.properties?.positionY,
                    scale: c.properties?.scale,
                    opacity: c.properties?.opacity
                }
            }));
            return { name: t.name, type: t.type, clips };
        });

        return {
            currentTime: parseFloat(window.app.currentTime.toFixed(1)),
            canvasSize: { width: canvasW, height: canvasH },
            tracks
        };
    }

    // ─── Main Message Handler ────────────────────────────────────────────────

    async handleUserMessage(text) {
        if (!text || !text.trim()) return;

        this.pushMessage('user', text);
        this.setThinking(true);

        try {
            // Guard: engine must be ready
            if (!window.app || !window.app.tracks) {
                this.pushMessage('ai', '⚠️ المحرر لم يُهيَّأ بعد، انتظر قليلاً وأعد المحاولة.');
                return;
            }

            const state = this.getDetailedProjectState();
            const canvasW = state.canvasSize.width;
            const canvasH = state.canvasSize.height;

            const selectedInfo = (() => {
                if (!window.app?.selectedClipIds?.size) return 'None';
                const id = Array.from(window.app.selectedClipIds)[0];
                const clip = window.app.findClipById(id);
                if (!clip) return 'None';
                const t = window.app.tracks.find(tr => tr.id === clip.trackId);
                return `"${clip.name}" on ${t?.name || 'Unknown'} (start:${clip.start.toFixed(1)}s)`;
            })();

            const prompt = `
Act as an Expert Video Editor AI controlling a CLI-based Editor.
User Input: "${text}"
Currently Selected Clip: ${selectedInfo}

**PROJECT CONTEXT:**
- Canvas: ${canvasW}x${canvasH}px. Origin=CENTER. X: left=neg, right=pos. Y: up=neg, down=pos.

**ALL AVAILABLE ACTIONS (return as JSON array):**

Timeline:
{ "action": "split", "time": number, "track_name": string }
{ "action": "upload", "start": number, "end": number, "track_name": string }
{ "action": "delete_range", "start": number, "end": number, "track_name": string }
{ "action": "delete", "clip_id": string }
{ "action": "delete_selected" }
{ "action": "ripple_delete" }
{ "action": "duplicate" }
{ "action": "clear_track", "track_name": string }

Structure:
{ "action": "add_text" }
{ "action": "add_video_track" }
{ "action": "add_audio_track" }

Transform:
{ "action": "modify", "clip_id": string, "data": { scale?, scaleX?, scaleY?, opacity?, rotation?, width?, height?, x?, y? } }

🆕 Phase 1 — Speed / Volume / Fade / Crop:
{ "action": "speed", "clip_id": string, "speed": number }       — e.g. speed=2 for 2x, speed=0.5 for slow-mo
{ "action": "volume", "clip_id": string, "volume": number }     — 0=mute, 100=normal, 150=louder
{ "action": "fade_in", "clip_id": string, "duration": number }  — fade in over N seconds
{ "action": "fade_out", "clip_id": string, "duration": number } — fade out over N seconds
{ "action": "crop", "clip_id": string, "x1": number, "y1": number, "x2": number, "y2": number } — percentage 0-100
{ "action": "crop_reset", "clip_id": string }                   — remove crop

🆕 Phase 2 — Color Grading:
{ "action": "brightness", "clip_id": string, "value": number }  — 0-400, normal=100
{ "action": "contrast", "clip_id": string, "value": number }    — 0-400, normal=100
{ "action": "saturation", "clip_id": string, "value": number }  — 0=grayscale, 100=normal, 200=vivid
{ "action": "hue", "clip_id": string, "value": number }         — degrees -180 to 180
{ "action": "tint", "clip_id": string, "color": string, "opacity": number } — hex color + 0-100%
{ "action": "filter_preset", "clip_id": string, "preset": string } — cinematic/bw/warm/cool/vintage/reset
{ "action": "color_reset", "clip_id": string }                  — remove all color grading

Other:
{ "action": "remove_silence", "source_track": string, "exceptions": string[] }
{ "action": "seek", "time": number }
{ "action": "undo" }
{ "action": "redo" }

**PROJECT STATE:**
${JSON.stringify(state)}

**ARABIC INTENT GUIDE:**
"احذف/امسح" → delete_selected | "ripple/ازيل مع تضييق" → ripple_delete
"كرر/نسخة" → duplicate | "أضف نص" → add_text
"تراك فيديو" → add_video_track | "تراك صوت" → add_audio_track
"حجم/كبّر/صغّر" → scale | "شفافية" → opacity | "لف/دوّر" → rotation
"حرك يمين" → x positive | "حرك يسار" → x negative
"اقطع عند" → split | "احذف من...لـ" → delete_range | "ارجع" → undo
"سرّع/ضعفين/أسرع" → speed > 1 | "بطّئ/slow motion/تبطئة" → speed < 1
"اخرس/كتم/اخفت الصوت" → volume=0 | "ارفع الصوت" → volume=150
"fade in/ادخل بالتدريج" → fade_in | "fade out/اخرج بالتدريج" → fade_out
"اقصص/crop من اليمين" → crop | "إزالة الكروب/رجّع" → crop_reset
"زود الإضاءة/أضئ" → brightness>100 | "خفف الإضاءة/قلل" → brightness<100
"زود التباين" → contrast>100 | "خلي أبيض وأسود" → saturation=0 | "احذف الألوان" → saturation=0
"فلتر سينمائي" → filter_preset:cinematic | "فلتر دافي/warm" → filter_preset:warm
"فلتر بارد/cool" → filter_preset:cool | "فلتر قديم/vintage" → filter_preset:vintage
"إزالة الفلتر/رجّع الألوان" → color_reset

🆕 Phase 3 — Shapes + Ken Burns:
{ "action": "add_shape", "shape": "rect|circle|triangle|line", "color": "#RRGGBB", "opacity": 0-100, "widthPct": number, "heightPct": number, "x": number, "y": number, "duration": number, "track": string }
{ "action": "ken_burns", "clip_id": string, "startX": number, "startY": number, "startScale": number, "endX": number, "endY": number, "endScale": number }
{ "action": "ken_burns_reset", "clip_id": string }

🆕 Phase 4 — Transitions:
{ "action": "add_transition", "track_name": string, "cut_time": number, "type": "dissolve|wipe|zoom|fade", "duration": number }
{ "action": "remove_transition", "track_name": string, "cut_time": number }

🆕 Phase 5 — Smart AI Actions:
{ "action": "auto_cut_silence", "track_name": string }         — remove silent parts automatically
{ "action": "smart_color_match", "ref_clip_id": string, "target_clip_id": string } — match colors between clips
{ "action": "batch_speed", "track_name": string, "speed": number } — set speed for ALL clips in a track

🆕 Phase 6 — Freeze Frame + Markers:
{ "action": "freeze_frame", "clip_id": string, "duration": number }
{ "action": "add_marker", "label": string, "time": number }
{ "action": "remove_marker", "time": number }
{ "action": "clear_markers" }
{ "action": "goto_marker", "label": string }

**ARABIC INTENT GUIDE:**
"احذف/امسح" → delete_selected | "ripple/ازيل مع تضييق" → ripple_delete
"كرر/نسخة" → duplicate | "أضف نص" → add_text
"تراك فيديو" → add_video_track | "تراك صوت" → add_audio_track
"حجم/كبّر/صغّر" → scale | "شفافية" → opacity | "لف/دوّر" → rotation
"حرك يمين" → x positive | "حرك يسار" → x negative
"اقطع عند" → split | "احذف من...لـ" → delete_range | "ارجع" → undo
"سرّع/ضعفين/أسرع" → speed > 1 | "بطّئ/slow motion/تبطئة" → speed < 1
"اخرس/كتم/اخفت الصوت" → volume=0 | "ارفع الصوت" → volume=150
"fade in/ادخل بالتدريج" → fade_in | "fade out/اخرج بالتدريج" → fade_out
"اقصص/crop من اليمين" → crop | "إزالة الكروب/رجّع" → crop_reset
"زود الإضاءة/أضئ" → brightness>100 | "خفف الإضاءة/قلل" → brightness<100
"خلي أبيض وأسود" → saturation=0 | "فلتر سينمائي" → filter_preset:cinematic
"فلتر دافي/warm" → filter_preset:warm | "فلتر بارد" → filter_preset:cool
"فلتر قديم/vintage" → filter_preset:vintage | "إزالة الفلتر" → color_reset
"أضف مربع/دائرة/شكل" → add_shape | "Ken Burns/حركة ديناميكية" → ken_burns
"أضف transition/وضع تأثير انتقال" → add_transition (cutTime=exact cut point)
"احذف الصمت/silence تلقائي" → auto_cut_silence
"تطابق الألوان" → smart_color_match
"ثبّت الفريم/freeze" → freeze_frame duration=2
"أضف علامة/marker" → add_marker | "اذهب لـ [label]" → goto_marker

**RESPONSE FORMAT (JSON ONLY — no markdown):**
{ "reply": "Arabic confirmation", "actions": [ ... ] }
            `;


            const responseText = await this.queryGemini(prompt, this.chatHistory);
            // Store only compact summary in history to avoid token limit
            this.chatHistory.push({ role: "user",  parts: [{ text: text }] });
            this.chatHistory.push({ role: "model", parts: [{ text: responseText }] });
            // Keep last 10 turns max (20 entries)
            if (this.chatHistory.length > 20) this.chatHistory = this.chatHistory.slice(-20);

            let result = null;
            const jsonMatch = responseText.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                try { result = JSON.parse(jsonMatch[0]); } catch(e) {}
            }

            if (result) {
                if (result.reply) this.pushMessage('ai', result.reply);
                if (result.actions && result.actions.length > 0) {
                    await this.executeActionSequence(result.actions);
                }
            } else {
                this.pushMessage('ai', '🤔 لم أستطع فهم الأمر، جرب تكون أكثر تحديداً.');
            }
        } catch(e) {
            console.error(e);
            const errMsg = String(e?.message || e);
            const isExhausted = errMsg.includes('Keys Exhausted');
            if (isExhausted) {
                // Check if user has a personal key set
                const hasUserKey = !!(document.getElementById('ai4montage-api-key')?.value?.trim()
                                   || document.getElementById('gemini-api-key')?.value?.trim());
                if (!hasUserKey) {
                    this.pushMessage('ai',
                        '⚠️ **انتهى رصيد مفاتيح AI المدمجة.**\n\n' +
                        'لمتابعة الاستخدام، أضف **مفتاحك الشخصي** من Google AI Studio:\n' +
                        '1️⃣ افتح [aistudio.google.com](https://aistudio.google.com/apikey)\n' +
                        '2️⃣ أنشئ مفتاح API مجاني\n' +
                        '3️⃣ الصقه في حقل **🔑 Personal API Key** في الإعدادات\n\n' +
                        '_المفتاح الشخصي لا يُرسَل لأي خادم — يبقى في متصفحك فقط._'
                    );
                    // Auto-show the API key input if it exists
                    const keySection = document.getElementById('api-key-section') || document.getElementById('ai-settings-section');
                    if (keySection) keySection.scrollIntoView({ behavior: 'smooth' });
                } else {
                    this.pushMessage('error', '⚠️ مفتاح API الشخصي الخاص بك أيضاً وصل الحد الأقصى. حاول لاحقاً أو استخدم مفتاحاً آخر.');
                }
            } else {
                this.pushMessage('error', 'حدث خطأ في الاتصال بالذكاء الاصطناعي. تحقق من اتصالك بالإنترنت وأعد المحاولة.');
            }
        } finally {
            this.setThinking(false);
        }
    }

    // ─── Action Executor ─────────────────────────────────────────────────────
    // (executeActionSequence and executeSingleAction are bound via bindGeminiActions below)
}

bindGeminiActions(GeminiChat);
window.geminiChat = new GeminiChat();
