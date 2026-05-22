/**
 * 🧠 Gemini Chat Engine (gemini_chat.js) - v9.4 (Upload Range Fix)
 * التحديثات:
 * 1. 🐛 Fix Upload Range: تحسين البرومبت ليفهم نطاقات الرفع (Start/End) بدقة.
 * 2. 📝 Explicit JSON Examples: إضافة أمثلة صريحة للرفع في تعليمات JSON.
 * 3. 🧠 Better Time Parsing: تحسين استخراج الوقت من النصوص العربية.
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
        this.lastActiveTrackIndex = null;
        this.bindStartupUI();
    }

    // --- 1. API & Core Logic ---

    getAvailableKeys() {
        return [...GEMINI_KEYS_POOL];
    }

    async queryGemini(prompt, history = []) {
        const userKey = document.getElementById('gemini-api-key')?.value?.trim();
        
        const execute = async (key) => {
            const genAI = new GoogleGenerativeAI(key);
            const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
            const chat = model.startChat({ history: history });
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
        this.createChatUI();
        window.app.log("🤖 Gemini CLI Typist v9.4 Ready");
        if (this.chatHistory.length === 0) {
            this.addChatMessage("system", "المساعد الذكي جاهز. (تم إصلاح فهم نطاقات الرفع).");
        }
    }

    bindStartupUI() {
        const initUI = () => {
            const aiCheck = document.getElementById('ai-assistant-check');
            if (aiCheck) this.enabled = aiCheck.checked;
        };
        if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initUI);
        else initUI();
    }

    createChatUI() {
        if (document.getElementById('gemini-chat-panel')) {
            document.getElementById('gemini-chat-panel').classList.remove('translate-y-[calc(100%-40px)]');
            return;
        }
        
        const chatHTML = `
            <div id="gemini-chat-panel" class="fixed bottom-4 right-4 w-80 h-96 bg-gray-900 border border-purple-500/50 rounded-xl shadow-2xl flex flex-col z-[1000] overflow-hidden transition-all transform translate-y-0 opacity-100">
                <div class="bg-gradient-to-r from-purple-900 to-indigo-900 p-3 flex justify-between items-center cursor-move" id="chat-header">
                    <div class="flex items-center gap-2 font-cairo font-bold text-white text-sm">
                        <i class="fa-solid fa-terminal text-green-400"></i> Smart CLI Agent
                    </div>
                    <div class="flex items-center gap-2">
                        <button onclick="document.getElementById('plan-upload-input').click()" class="text-white hover:text-blue-400" title="Upload Plan"><i class="fa-solid fa-file-arrow-up"></i></button>
                        <input type="file" id="plan-upload-input" accept=".json" class="hidden" onchange="window.geminiPlan && window.geminiPlan.handlePlanUpload(this)">
                        <button onclick="document.getElementById('gemini-chat-panel').classList.toggle('translate-y-[calc(100%-40px)]')" class="text-white hover:text-purple-300"><i class="fa-solid fa-chevron-down"></i></button>
                    </div>
                </div>
                <div id="chat-messages" class="flex-1 p-3 overflow-y-auto custom-scrollbar space-y-3 bg-gray-900/90 text-xs font-mono"></div>
                <div class="p-2 bg-gray-800 border-t border-gray-700 flex gap-2">
                    <input type="text" id="chat-input" placeholder="مثال: حط صورة من ثانية 10 لـ 20..." 
                        class="flex-1 bg-gray-900 border border-gray-600 rounded px-2 py-1 text-white text-xs focus:outline-none focus:border-purple-500"
                        onkeydown="if(event.key === 'Enter') window.geminiChat.handleUserMessage()">
                    <button onclick="window.geminiChat.handleUserMessage()" class="bg-purple-600 hover:bg-purple-500 text-white w-8 h-8 rounded flex items-center justify-center">
                        <i class="fa-solid fa-paper-plane text-xs"></i>
                    </button>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', chatHTML);
        
        const header = document.getElementById('chat-header');
        const panel = document.getElementById('gemini-chat-panel');
        if(header && panel && window.app.setupDraggable) {
             window.app.setupDraggable(panel, header);
        }
    }

    addChatMessage(role, text) {
        const container = document.getElementById('chat-messages');
        if (!container) return;
        const div = document.createElement('div');
        
        let style = 'bg-gray-800 text-gray-300 border border-gray-700';
        
        if (role === 'user') {
            style = 'bg-purple-600 self-end ml-auto text-white';
        } 
        else if (role === 'system') {
            style = 'bg-yellow-900/30 text-yellow-200 text-center text-[10px]';
        } 
        else if (role === 'debug') {
            style = 'bg-black text-green-400 font-mono text-[10px] border-l-2 border-green-500 p-2 shadow-sm my-1'; 
        } 
        else if (role === 'error') {
            style = 'bg-red-900/80 text-white font-bold border border-red-500 p-2';
        } 
        else if (role === 'model') {
            style = 'bg-gray-800 text-cyan-100 border-l-4 border-cyan-500 pl-2';
        }

        div.className = `p-2 rounded-lg max-w-[90%] mb-2 whitespace-pre-wrap ${style}`;
        div.innerHTML = text;
        container.appendChild(div);
        container.scrollTop = container.scrollHeight;
    }

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
        
        // 1. Set buffer
        window.app.commandBuffer = cmdStr;
        
        // 2. Visual Update
        if (window.app.cmdBufferEl) window.app.cmdBufferEl.innerText = cmdStr;
        if (window.app.updateConsoleVisuals) window.app.updateConsoleVisuals();

        // 3. Log visible to user now
        this.addChatMessage("debug", `> ⌨️ CMD: ${cmdStr}`);

        // 4. Execute
        window.app.executeCommand();
    }

    getDetailedProjectState() {
        // 🔥 Capture Canvas Dimensions
        const canvasW = window.app.canvas ? window.app.canvas.width : 1920;
        const canvasH = window.app.canvas ? window.app.canvas.height : 1080;

        const tracks = window.app.tracks.map((t, i) => {
            const sortedClips = [...t.clips].sort((a, b) => a.start - b.start);
            const clips = sortedClips.map((c, idx) => {
                // 🔥 Try to get SOURCE dimensions (Image/Video original size)
                let srcInfo = "Unknown";
                if (window.app.getSourceElement) {
                    const el = window.app.getSourceElement(c);
                    if (el) {
                        const w = el.videoWidth || el.naturalWidth || 0;
                        const h = el.videoHeight || el.naturalHeight || 0;
                        srcInfo = `${w}x${h}`;
                    }
                }

                return {
                    id: c.id,
                    name: c.name,
                    order: `Part ${idx + 1}`,
                    start: parseFloat(c.start.toFixed(1)),
                    end: parseFloat(c.end.toFixed(1)),
                    originalSize: srcInfo, // Send source size
                    props: {
                        x: c.sandwich?._isSmart ? c.sandwich.offsetX : c.properties.positionX,
                        y: c.sandwich?._isSmart ? c.sandwich.offsetY : c.properties.positionY,
                        scale: c.properties.scale,
                        opacity: c.properties.opacity
                    }
                };
            });
            return {
                name: t.name, 
                clips: clips
            };
        });

        return {
            currentTime: parseFloat(window.app.currentTime.toFixed(1)),
            canvasSize: { width: canvasW, height: canvasH },
            tracks: tracks
        };
    }

    async handleUserMessage() {
        const input = document.getElementById('chat-input');
        const text = input.value.trim();
        if (!text) return;
        
        this.addChatMessage("user", text);
        input.value = "";

        const state = this.getDetailedProjectState();
        const canvasW = state.canvasSize.width;
        const canvasH = state.canvasSize.height;

        const prompt = `
            Act as an Expert Video Editor AI controlling a CLI-based Editor.
            User Input: "${text}"
            
            **PROJECT CONTEXT:**
            - Canvas Size: ${canvasW}x${canvasH} px
            
            **COORDINATE SYSTEM (CRITICAL):**
            - Origin (0,0) is the CENTER of the Canvas.
            - X Axis: Negative = Left, Positive = Right. Range: [-${canvasW/2}, +${canvasW/2}]
            - Y Axis: Negative = Up (Top), Positive = Down (Bottom). Range: [-${canvasH/2}, +${canvasH/2}]
            
            **CLI COMMAND LIBRARY (INTERNAL REFERENCE):**
            Use this to understand what operations are possible and map user intent to the correct JSON actions.
            
            1. **Precision Cutting (c):**
               - Command: \`c{time}v{track}\` (e.g., \`c20sv1\`, \`c1m30sv1\`)
            
            2. **Smart Uploading (u):**
               - Command: \`u{start}:{end}v{track}\` or \`u{start}v{track}\` (e.g., \`u10s:20sv1\`, \`u5sv1\`)
               - Description: Places media on the timeline. Can specify a duration range or just a start point.
            
            3. **Positioning & Layout (mv):**
               - Command: \`mv{x}{y}{clip}\` (e.g., \`mv0x100y2v1\`)
            
            4. **Silence Removal (rms):**
               - Command: \`rms{source}e{exceptions}\` (e.g., \`rmsa1ea2v3\`)
            
            5. **Scaling & Sizing (sc, sx, sy, sz):**
               - Uniform: \`sc{val}%{clip}\`
               - Stretch X: \`sx{val}%{clip}\`
               - Stretch Y: \`sy{val}%{clip}\`
               - Fixed Size: \`sz{w}x{h}y{clip}\`
            
            6. **Visual Properties (op, ro):**
               - Opacity: \`op{val}%{clip}\`
               - Rotation: \`ro{val}d{clip}\`
            
            7. **Deletion Modes (d):**
               - Range: \`d{start}:{end}v{track}\`
               - Clip: \`d{index}v{track}\`
               - Track: \`d{track}\`

            **PROJECT STATE:**
            ${JSON.stringify(state)}
            
            **TASKS:**
            1. Analyze user intent (Transform, Move, Cut, Upload, Delete).
            2. Match with available clips/tracks.
            3. Return JSON actions.

            **COMMAND LOGIC (JSON) - FOLLOW THIS FORMAT STRICTLY:**
            
            - **Upload Media:** { "action": "upload", "start": number, "end": number (optional), "track_name": string }
              * Example: "Add image from 10s to 20s on V4" -> { "action": "upload", "start": 10, "end": 20, "track_name": "V4" }
              * Example: "Add video at 5s" -> { "action": "upload", "start": 5, "track_name": "V1" }

            - **Modify/Transform:** { "action": "modify", "data": { ... }, "clip_id": "..." }
              - scale, scaleX, scaleY: %
              - opacity: 0-100
              - rotation: degrees
              - width, height: pixels
              - x, y: Position (Calculated Pixels based on Canvas Size).
              
            - **Cut/Split:** { "action": "split", "time": number, "track_name": string }
            - **Delete Range:** { "action": "delete_range", "start": number, "end": number, "track_name": string }
            - **Delete Clip:** { "action": "delete", "clip_id": string }
            - **Clear Track:** { "action": "clear_track", "track_name": string }
            
            **IMPORTANT:**
            - "مط الفيديو بالعرض" -> scaleX: 150
            - "اضغط الفيديو بالطول" -> scaleY: 50
            - "شفافية 50%" -> opacity: 50
            - "لف الفيديو 90 درجة" -> rotation: 90
            - "حجم ثابت 500 في 300" -> width: 500, height: 300
            - ALWAYS output explicit X and Y values if moving to a specific corner.
            
            **RESPONSE FORMAT (JSON ONLY):**
            {
              "reply": "Arabic confirmation",
              "actions": [ ... ]
            }
        `;

        this.addChatMessage("debug", "📡 Sending...");
        
        try {
            const responseText = await this.queryGemini(prompt, this.chatHistory);
            
            this.chatHistory.push({ role: "user", parts: [{ text: prompt }] });
            this.chatHistory.push({ role: "model", parts: [{ text: responseText }] });
            
            let result = null;
            const jsonMatch = responseText.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                try { result = JSON.parse(jsonMatch[0]); } catch(e) {}
            }

            if (result) {
                if(result.reply) this.addChatMessage("model", result.reply);
                if(result.actions && result.actions.length > 0) {
                    await this.executeActionSequence(result.actions);
                }
            } else {
                this.addChatMessage("model", "🤔 لم أستطع فهم الأمر.");
            }
        } catch(e) {
            console.error(e);
            this.addChatMessage("error", "Error contacting AI.");
        }
    }

    async executeActionSequence(actions) {
        for (const action of actions) {
            try {
                await this.executeSingleAction(action);
            } catch (err) {
                console.error(err);
            }
            await new Promise(r => setTimeout(r, 400));
        }
    }

    async executeSingleAction(action) {
        // --- Resolve Helpers ---
        let targetClip = null;
        
        // 1. Try finding by ID
        if (action.clip_id) targetClip = window.app.findClipById(action.clip_id);
        
        // 2. Try finding by context
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
            // Sort to find 1-based index
            const sorted = [...t.clips].sort((a,b) => a.start - b.start);
            const idx = sorted.findIndex(c => c.id === targetClip.id) + 1;
            return `${idx}${t.name}`; // e.g. "1V1"
        };

        const getTrackName = (fallbackName) => {
            if (action.track_name) return action.track_name;
            if (targetClip) {
                const t = window.app.tracks.find(tr => tr.id === targetClip.trackId);
                return t ? t.name : fallbackName;
            }
            return fallbackName;
        };

        // --- CONVERT ACTIONS TO CLI STRINGS ---
        switch (action.action) {
            
            case 'split': {
                let time = action.time !== undefined ? action.time : window.app.currentTime;
                let track = getTrackName('V1');
                const cmd = `c${this.timeToCLI(time)}${track}`;
                this.runCLI(cmd);
                break;
            }

            case 'upload': {
                let start = action.start !== undefined ? action.start : window.app.currentTime;
                let track = getTrackName('V1');
                let cmd = "";
                if (action.end !== undefined) {
                    cmd = `u${this.timeToCLI(start)}:${this.timeToCLI(action.end)}${track}`;
                } else {
                    cmd = `u${this.timeToCLI(start)}${track}`;
                }
                this.runCLI(cmd);
                break;
            }

            case 'remove_silence': {
                let source = action.source_track || 'A1';
                let exceptions = action.exceptions || [];
                let cmd = `rms${source}`;
                if (exceptions.length > 0) {
                    cmd += `e${exceptions.join('')}`;
                }
                this.runCLI(cmd);
                break;
            }

            // 🔥 FIX: Unified Modify Action
            case 'modify': {
                if(targetClip) {
                    const data = action.data || {};
                    const suffix = getClipSuffix();
                    
                    // 1. Scale / ScaleX / ScaleY
                    if (data.scale !== undefined) this.runCLI(`sc${data.scale}%${suffix}`);
                    if (data.scaleX !== undefined) this.runCLI(`sx${data.scaleX}%${suffix}`);
                    if (data.scaleY !== undefined) this.runCLI(`sy${data.scaleY}%${suffix}`);
                    
                    // 2. Size (Forced Dimensions)
                    if (data.width !== undefined && data.height !== undefined) {
                        this.runCLI(`sz${data.width}x${data.height}y${suffix}`);
                    }

                    // 3. Opacity & Rotation
                    if (data.opacity !== undefined) this.runCLI(`op${data.opacity}%${suffix}`);
                    if (data.rotation !== undefined) this.runCLI(`ro${data.rotation}d${suffix}`);

                    // 4. Position (Move) - Supports X/Y and Strings
                    if (data.x !== undefined || data.y !== undefined) {
                        // 🗺️ Position Dictionary
                        const posMap = {
                            'left': 'l', 'right': 'r', 'center': 'c', 'middle': 'c',
                            'top': 'u', 'up': 'u', 'bottom': 'd', 'down': 'd',
                            'l': 'l', 'r': 'r', 'c': 'c', 'u': 'u', 'd': 'd'
                        };

                        const resolveCoord = (val, axis) => {
                            if (val === undefined || val === null) return null;
                            let cleanVal = String(val).toLowerCase().replace(/[xy]/g, '').trim();
                            
                            if (posMap[cleanVal]) return `${posMap[cleanVal]}${axis}`;
                            if (!isNaN(parseFloat(cleanVal))) return `${cleanVal}${axis}`;
                            return null;
                        };

                        let xPart = resolveCoord(data.x, 'x');
                        let yPart = resolveCoord(data.y, 'y');

                        if (xPart || yPart) {
                            this.runCLI(`mv${xPart || ''}${yPart || ''}${targetClip.name}`);
                        }
                    }
                } 
                break;
            }

            case 'delete_range': {
                if (action.start !== undefined && action.end !== undefined && action.track_name) {
                    const cmd = `d${this.timeToCLI(action.start)}:${this.timeToCLI(action.end)}${action.track_name}`;
                    this.runCLI(cmd);
                }
                break;
            }

            case 'clear_track': {
                if (action.track_name) this.runCLI(`d${action.track_name}`);
                break;
            }

            case 'undo': this.runCLI('undo'); break;
            case 'redo': this.runCLI('redo'); break;

            case 'seek':
                if (typeof action.time === 'number') {
                    if (window.app.seek) window.app.seek(action.time);
                    else { window.app.currentTime = action.time; window.app.requestRedraw(); }
                }
                break;

            case 'delete':
                if(targetClip) {
                    const t = window.app.tracks.find(tr => tr.id === targetClip.trackId);
                    if (t) {
                        const sorted = [...t.clips].sort((a,b) => a.start - b.start);
                        const idx = sorted.findIndex(c => c.id === targetClip.id);
                        if (idx !== -1) {
                            const cmd = `d${idx + 1}${t.name}`;
                            this.runCLI(cmd);
                            return;
                        }
                    }
                    window.app.selectClip(targetClip.id);
                    window.app.deleteSelectedClips();
                }
                break;
        }
    }
}

window.geminiChat = new GeminiChat();