// @ts-nocheck
/**
 * 🧠 Gemini Chat Engine — v10.0 (Full CMD Parity + React Bridge)
 * All CMD commands are now accessible via natural language.
 * Messages are pushed to React via onMessage/onThinkingChange callbacks.
 */

import { GoogleGenerativeAI } from "https://esm.run/@google/generative-ai";

const GEMINI_KEYS_POOL = [
    "AIzaSyDl51ZgJjb5K1kzorMkzDu3PLjWMTMR_co",
    "AIzaSyDinruhBeVGIy_giyRtfyNnZ8fPxdRqpcE",
    "AIzaSyC1YC5FFYe16W0QpfAA1PCDmwSlULPYwQw",
    "AIzaSyDs1QUbBaAnuZpNcd20TQGg5imiBMYV5Jo",
    "AIzaSyCgWiKSkc_bnldCRAy130TXd5jWsg8qKHI",
    "AIzaSyD-SM2M0jOOP0BnwAJRbGd5HS3irqOFzqc",
    "AIzaSyAnJicjY8-aorsNe-tnf-sss5ZWT11cPVo",
    "AIzaSyCSB4fZ9QSURj-xl37HYqeNUSQUeAwdA2g",
    "AIzaSyDdGWI0svALRkqbZtub9UfBk9vvmF76OrM"
];

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
        return [...GEMINI_KEYS_POOL];
    }

    async queryGemini(prompt, history = []) {
        const userKey = document.getElementById('gemini-api-key')?.value?.trim();

        const execute = async (key) => {
            const genAI = new GoogleGenerativeAI(key);
            const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
            const chat = model.startChat({ history });
            const result = await chat.sendMessage(prompt);
            return result.response.text();
        };

        if (userKey) {
            try { return await execute(userKey); }
            catch (e) { console.warn("User key failed, switching...", e); }
        }

        let availableKeys = this.getAvailableKeys();
        while (availableKeys.length > 0) {
            const randomIndex = Math.floor(Math.random() * availableKeys.length);
            const currentKey = availableKeys[randomIndex];
            try {
                return await execute(currentKey);
            } catch (error) {
                console.warn(`Key ...${currentKey.slice(-4)} failed.`);
                availableKeys.splice(randomIndex, 1);
            }
        }
        throw new Error("❌ API Keys Exhausted.");
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
            this.pushMessage('error', 'حدث خطأ في الاتصال بالذكاء الاصطناعي.');
        } finally {
            this.setThinking(false);
        }
    }

    // ─── Action Executor ─────────────────────────────────────────────────────

    async executeActionSequence(actions) {
        for (const action of actions) {
            try { await this.executeSingleAction(action); }
            catch (err) { console.error(err); }
            await new Promise(r => setTimeout(r, 400));
        }
    }

    async executeSingleAction(action) {
        let targetClip = null;
        if (action.clip_id) targetClip = window.app.findClipById(action.clip_id);
        if (!targetClip && action.track_name) {
            const track = window.app.tracks.find(t => t.name === action.track_name);
            if (track && track.clips.length > 0) {
                targetClip = track.getClipsAtTime(window.app.currentTime)[0] || track.clips[0];
            }
        }

        const getClipSuffix = () => {
            if (!targetClip) return "";
            const t = window.app.tracks.find(tr => tr.id === targetClip.trackId);
            if (!t) return "";
            const sorted = [...t.clips].sort((a, b) => a.start - b.start);
            const idx = sorted.findIndex(c => c.id === targetClip.id) + 1;
            return `${idx}${t.name}`;
        };

        const getTrackName = (fallback) => {
            if (action.track_name) return action.track_name;
            if (targetClip) {
                const t = window.app.tracks.find(tr => tr.id === targetClip.trackId);
                return t ? t.name : fallback;
            }
            return fallback;
        };

        switch (action.action) {

            case 'split': {
                const time = action.time !== undefined ? action.time : window.app.currentTime;
                this.runCLI(`c${this.timeToCLI(time)}${getTrackName('V1')}`);
                break;
            }

            case 'upload': {
                const start = action.start !== undefined ? action.start : window.app.currentTime;
                const track = getTrackName('V1');
                const cmd = action.end !== undefined
                    ? `u${this.timeToCLI(start)}:${this.timeToCLI(action.end)}${track}`
                    : `u${this.timeToCLI(start)}${track}`;
                this.runCLI(cmd);
                break;
            }

            case 'remove_silence': {
                const source = action.source_track || 'A1';
                const exceptions = action.exceptions || [];
                let cmd = `rms${source}`;
                if (exceptions.length > 0) cmd += `e${exceptions.join('')}`;
                this.runCLI(cmd);
                break;
            }

            case 'modify': {
                if (!targetClip) {
                    this.pushMessage('ai', '⚠️ لم أجد الكليب المطلوب — تأكد من تحديده أو تحديد clip_id صحيح.');
                    break;
                }
                const data = action.data || {};
                const suffix = getClipSuffix();
                if (data.scale !== undefined)  this.runCLI(`sc${data.scale}c${suffix}`);
                if (data.scaleX !== undefined) this.runCLI(`sx${data.scaleX}c${suffix}`);
                if (data.scaleY !== undefined) this.runCLI(`sy${data.scaleY}c${suffix}`);
                if (data.width !== undefined && data.height !== undefined) {
                    this.runCLI(`sz${data.width}x${data.height}c${suffix}`);
                }
                if (data.opacity !== undefined)  this.runCLI(`op${data.opacity}c${suffix}`);
                if (data.rotation !== undefined) this.runCLI(`ro${data.rotation}c${suffix}`);
                if (data.x !== undefined || data.y !== undefined) {
                    const posMap = { left:'l', right:'r', center:'c', middle:'c', top:'u', up:'u', bottom:'d', down:'d', l:'l', r:'r', c:'c', u:'u', d:'d' };
                    const resolveCoord = (val, axis) => {
                        if (val === undefined || val === null) return null;
                        const clean = String(val).toLowerCase().replace(/[xy]/g, '').trim();
                        if (posMap[clean]) return `${posMap[clean]}${axis}`;
                        if (!isNaN(parseFloat(clean))) return `${clean}${axis}`;
                        return null;
                    };
                    const xPart = resolveCoord(data.x, 'x');
                    const yPart = resolveCoord(data.y, 'y');
                    if (xPart || yPart) this.runCLI(`mv${xPart || ''}${yPart || ''}${getClipSuffix()}`);
                }
                break;
            }

            case 'delete_range': {
                if (action.start !== undefined && action.end !== undefined && action.track_name) {
                    this.runCLI(`d${this.timeToCLI(action.start)}:${this.timeToCLI(action.end)}${action.track_name}`);
                }
                break;
            }

            case 'clear_track': {
                if (action.track_name) this.runCLI(`d${action.track_name}`);
                break;
            }

            case 'delete': {
                if (targetClip) {
                    const t = window.app.tracks.find(tr => tr.id === targetClip.trackId);
                    if (t) {
                        const sorted = [...t.clips].sort((a, b) => a.start - b.start);
                        const idx = sorted.findIndex(c => c.id === targetClip.id);
                        if (idx !== -1) { this.runCLI(`d${idx + 1}${t.name}`); return; }
                    }
                    window.app.selectClip(targetClip.id);
                    window.app.deleteSelectedClips();
                }
                break;
            }

            // ── New CMD-parity actions ──────────────────────────────────────
            case 'delete_selected':   this.runCLI('del');  break;
            case 'ripple_delete':     this.runCLI('rdel'); break;
            case 'duplicate':         this.runCLI('dup');  break;
            case 'add_text':          this.runCLI('txt');  break;
            case 'add_video_track':   this.runCLI('atv');  break;
            case 'add_audio_track':   this.runCLI('ata');  break;
            case 'undo':              this.runCLI('undo'); break;
            case 'redo':              this.runCLI('redo'); break;

            case 'seek':
                if (typeof action.time === 'number') {
                    // engine pattern: set currentTime then seek(0) to re-render
                    window.app.currentTime = action.time;
                    if (window.app.seek) window.app.seek(0);
                    window.app.requestRedraw?.();
                }
                break;
        }
    }
}

window.geminiChat = new GeminiChat();
