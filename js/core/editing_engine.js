/**
 * 🛠️ Editing Engine (editing_engine.js) - CLEAN CORE
 * هذا الملف يحتوي فقط على المنطق الأساسي للمحرر.
 * تم نقل جميع أكواد الـ Command Center إلى command_center.js
 */

// =========================================================
// 1. Core Data Structures (Interval Tree)
// =========================================================

class IntervalNode {
    constructor(clip) {
        this.interval = { start: clip.start, end: clip.start + clip.duration };
        this.max = this.interval.end;
        this.clip = clip;
        this.left = null;
        this.right = null;
    }
}

class IntervalTree {
    constructor() { this.root = null; }
    insert(clip) {
        const newNode = new IntervalNode(clip);
        if (!this.root) this.root = newNode;
        else this._insertNode(this.root, newNode);
    }
    _insertNode(node, newNode) {
        if (newNode.max > node.max) node.max = newNode.max;
        if (newNode.interval.start < node.interval.start) {
            if (!node.left) node.left = newNode;
            else this._insertNode(node.left, newNode);
        } else {
            if (!node.right) node.right = newNode;
            else this._insertNode(node.right, newNode);
        }
    }
    query(time) {
        const result = [];
        this._queryNode(this.root, time, result);
        return result;
    }
    _queryNode(node, time, result) {
        if (!node) return;
        if (time > node.max) return;
        if (node.clip.start <= time && node.clip.end > time) result.push(node.clip);
        if (node.left && node.left.max >= time) this._queryNode(node.left, time, result);
        this._queryNode(node.right, time, result);
    }
    clear() { this.root = null; }
    search(time) { return this.query(time); }
}

// =========================================================
// 2. Base Classes (Clip & Track)
// =========================================================

class Clip {
    constructor(id, name, start, duration, type, src) {
        this.id = id;
        this.name = name;
        this.start = start; 
        this.duration = duration; 
        this.type = type; 
        this.src = src;
        this.trackId = null;
        this.sourceIn = 0;
        
        this.properties = { scale: 100, positionX: 0, positionY: 0, rotation: 0, opacity: 100, volume: 100 };
        this.keyframes = { scale: [], positionX: [], positionY: [], rotation: [], opacity: [], volume: [] };
        this.textStyle = { fontFamily: 'Cairo', fontWeight: 'bold', color: '#ffffff', strokeColor: '#000000', strokeWidth: 0, shadowBlur: 0, backgroundColor: '#000000', backgroundOpacity: 0, padding: 20 };
        this.transitions = { in: 'none', out: 'none', duration: 1.0 };
        this.chromaKey = { enabled: false, color: '#00ff00', threshold: 50 };
        this.aiSegmentation = { enabled: false, loading: false };
        this.mask = null;
        this.blendMode = 'source-over';
        this.sandwich = { scale: 50, offsetX: 0, offsetY: 0 };
    }

    get end() { return this.start + this.duration; }
    
    getPropertyValue(prop, timeRelative) {
        if (!this.keyframes[prop] || this.keyframes[prop].length === 0) {
            return this.properties[prop] !== undefined ? this.properties[prop] : (prop === 'scale' ? 100 : 0);
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
    }

    addKeyframe(prop, time, value) {
        if(!this.keyframes[prop]) this.keyframes[prop] = [];
        this.keyframes[prop] = this.keyframes[prop].filter(k => Math.abs(k.t - time) > 0.01);
        this.keyframes[prop].push({ t: time, v: parseFloat(value) });
    }
}

class Track {
    constructor(id, name, type, colorClass, role = 'generic') {
        this.id = id;
        this.name = name;
        this.type = type; 
        this.colorClass = colorClass;
        this.role = role;
        this.clips = [];
        this.tree = new IntervalTree();
        this.isMuted = false;
        this.isSolo = false;
        this.defaultStyle = null;
    }

    addClip(clip) {
        clip.trackId = this.id;
        this.clips.push(clip);
        this.rebuildTree();
    }

    removeClip(clipId) {
        const index = this.clips.findIndex(c => c.id === clipId);
        if (index > -1) {
            this.clips.splice(index, 1);
            this.rebuildTree();
            return true;
        }
        return false;
    }

    clear() { this.clips = []; this.tree.clear(); }
    rebuildTree() { this.tree.clear(); this.clips.forEach(clip => this.tree.insert(clip)); }
    getClipsAtTime(time) { return this.tree.query(time); }
}

// =========================================================
// 3. Main Editor Application
// =========================================================

class EditorApp {
    constructor() {
        this.tracks = [];
        this.currentTime = 0;
        this.isPlaying = false;
        this.duration = 300; 
        this.pixelsPerSecond = 20; 
        this.activeTool = 'select'; 
        this.selectedClipIds = new Set(); 

        this.history = [];
        this.redoStack = [];
        this.maxHistory = 50;
        this.snapThreshold = 15; 
        this.needsRedraw = true; 

        this.videoPlayer = null;
        this.timelineContent = null;
        this.logContainer = null;
    }

    requestRedraw() {
        this.needsRedraw = true;
    }

    init() {
        this.videoPlayer = document.getElementById('source-video-a'); 
        this.timelineContent = document.getElementById('timeline-content');
        this.playhead = document.getElementById('playhead');
        this.timeDisplay = document.getElementById('time-display');
        this.logContainer = document.getElementById('system-log');
        this.tracksContainer = document.getElementById('tracks-container');
        this.timelineScrollArea = document.getElementById('timeline-scroll-area');
        this.rulerContainer = document.getElementById('timeline-ruler');
        this.effectControls = document.getElementById('effect-controls-panel');

        if (!this.timelineContent) {
            console.error("❌ Critical Error: DOM Elements not found.");
            return;
        }

        if(this.setupTracks) this.setupTracks(); 
        if(this.renderAll) this.renderAll();     
        if(this.setupEditingTools) this.setupEditingTools();
        
        // 🔥 استدعاء Command Center إذا كان الملف محملاً
        if (this.initCommandCenter) {
            this.initCommandCenter();
        }

        if (typeof this.setupVideoSync === 'function') {
            this.setupVideoSync();
            if(this.setupPlayheadScrubbing) this.setupPlayheadScrubbing();
        }
        
        this.log("✅ Engine Ready: Logic Core Loaded.");
    }

    log(msg) {
        if (!this.logContainer) return;
        const div = document.createElement('div');
        div.innerText = `> ${msg}`;
        this.logContainer.appendChild(div);
        this.logContainer.scrollTop = this.logContainer.scrollHeight;
    }

    formatTime(seconds) {
        const date = new Date(0);
        date.setSeconds(seconds);
        return date.toISOString().substr(11, 8);
    }

    // --- Tools ---

    setToolUI(toolName) {
        document.querySelectorAll('.toolbar-btn').forEach(btn => btn.classList.remove('active', 'text-accent'));
        let targetId = toolName === 'select' ? 'tool-select' : (toolName === 'razor' || toolName === 'cut' ? 'tool-cut' : '');
        const btn = document.getElementById(targetId);
        if(btn) btn.classList.add('active', 'text-accent');
    }

    setTool(tool) {
        this.activeTool = tool;
        const uiName = (tool === 'razor' || tool === 'cut') ? 'cut' : 'select';
        this.setToolUI(uiName); 
        if (uiName === 'cut') { this.activeTool = 'razor'; document.body.style.cursor = 'crosshair'; } 
        else { this.activeTool = 'select'; document.body.style.cursor = 'default'; }
        this.log(`Tool: ${this.activeTool.toUpperCase()}`);
    }

    // --- Core Operations (Used by CLI) ---

    performRazorSplit() {
        if (this.selectedClipIds.size === 0) {
            const tracksToCheck = this.tracks.slice().reverse(); 
            for (const track of tracksToCheck) {
                const clips = track.getClipsAtTime(this.currentTime);
                if (clips.length > 0) {
                    this.performSplit(clips[0], track, { clientX: 0, simulated: true });
                    return;
                }
            }
            this.log("⚠️ Please select a clip to cut.");
            return;
        }

        const clipId = Array.from(this.selectedClipIds)[0];
        const clip = this.findClipById(clipId);
        if (!clip) return;
        const track = this.tracks.find(t => t.id === clip.trackId);
        
        this.performSplit(clip, track, { clientX: 0, simulated: true });
    }

    performSplit(clip, track, e) {
        // 🔥🔥🔥 GUARD: Protect AI Track from Cutting 🔥🔥🔥
        const isAiTrack = (track && (track.name.includes('AI') || track.name === 'V3' || track.role === 'speaker')) || (track && track.id === 4);
        if (isAiTrack) {
            this.log("🚫 Action Blocked: AI Track (V3) cannot be cut. Use Keyframes.");
            return;
        }

        this.saveState(); 
        
        let splitTime;
        if (e.simulated) {
            splitTime = this.currentTime;
        } else {
            const rect = this.timelineContent.getBoundingClientRect();
            const timelineX = (e.clientX - rect.left) - 140; 
            splitTime = timelineX / this.pixelsPerSecond;
        }

        if (splitTime <= (clip.start + 0.01) || splitTime >= (clip.end - 0.01)) {
            this.log("⚠️ Too close to edge");
            return;
        }

        const splitPointOffset = splitTime - clip.start;
        const remainingDuration = clip.duration - splitPointOffset;
        clip.duration = splitPointOffset;
        track.rebuildTree();
        
        const currentSourceIn = clip.sourceIn || 0;
        const newSourceIn = currentSourceIn + splitPointOffset;
        const newClip = new Clip(`c_split_${Date.now()}`, "Pending...", splitTime, remainingDuration, clip.type, clip.src);
        newClip.sourceIn = newSourceIn; 
        
        this.deepCopyClipData(clip, newClip); 
        
        track.addClip(newClip); 
        this.selectedClipIds.clear();
        this.selectedClipIds.add(newClip.id);
        
        this.refreshProjectTopology();

        this.log(`✂️ Cut at ${this.formatTime(splitTime)}`);
        this.renderTracks();
        if(this.syncOverlays) this.syncOverlays(); 
        if(this.updateEffectControls) this.updateEffectControls();
        this.requestRedraw();
    }

    deepCopyClipData(source, target) {
        if (source.properties) target.properties = JSON.parse(JSON.stringify(source.properties));
        if (source.aiSegmentation) target.aiSegmentation = JSON.parse(JSON.stringify(source.aiSegmentation));
        if (source.chromaKey) target.chromaKey = JSON.parse(JSON.stringify(source.chromaKey));
        if (source.mask) target.mask = JSON.parse(JSON.stringify(source.mask));
        target.blendMode = source.blendMode;
        if (source.textStyle) target.textStyle = JSON.parse(JSON.stringify(source.textStyle));
        if (source.effects) target.effects = JSON.parse(JSON.stringify(source.effects));
        if (source.transitions) target.transitions = JSON.parse(JSON.stringify(source.transitions));
        if (source.keyframes) target.keyframes = JSON.parse(JSON.stringify(source.keyframes));

        if (source.sandwich) {
            target.sandwich = {};
            const getVal = (prop, rawProp) => {
                if (source.sandwich._isSmart && source.sandwich[rawProp] !== undefined) {
                    return source.sandwich[rawProp];
                }
                return source.sandwich[prop];
            };
            target.sandwich.scale = getVal('scale', '_rawScale');
            target.sandwich.offsetX = getVal('offsetX', '_rawOffsetX');
            target.sandwich.offsetY = getVal('offsetY', '_rawOffsetY');
        }
    }

    addTextClip() {
        this.saveState();
        let targetTrack = this.tracks.find(t => t.type === 'overlay');
        if (!targetTrack) targetTrack = this.tracks.find(t => (t.type === 'video' || t.type === 'main'));
        if (!targetTrack) { this.addNewTrack('video'); targetTrack = this.tracks.find(t => t.type !== 'audio'); }

        const start = this.currentTime;
        const duration = 5;
        const id = `text_${Date.now()}`;
        const newClip = new Clip(id, "New Text", start, duration, 'text', "Double Click to Edit");
        
        if (targetTrack) {
            targetTrack.addClip(newClip);
            this.resolveCollisions(targetTrack.id, newClip);
            this.refreshProjectTopology();
            this.log(`📝 Text Added to ${targetTrack.name}`);
            this.renderTracks();
            if (this.syncOverlays) this.syncOverlays();
            this.requestRedraw(); 
        }
    }

    rippleDelete() {
        if (this.selectedClipIds.size === 0) return;
        this.saveState();
        const idsToDelete = Array.from(this.selectedClipIds);
        let deletedCount = 0;
        const trackDeletions = {}; 
        this.tracks.forEach(track => {
            track.clips.forEach(clip => {
                if (idsToDelete.includes(clip.id)) {
                    if (!trackDeletions[track.id]) trackDeletions[track.id] = [];
                    trackDeletions[track.id].push(clip);
                }
            });
        });
        Object.keys(trackDeletions).forEach(trackId => {
            const track = this.tracks.find(t => t.id == trackId);
            const clipsToDelete = trackDeletions[trackId];
            clipsToDelete.sort((a, b) => b.start - a.start);
            clipsToDelete.forEach(clip => {
                const gapStart = clip.start;
                const gapDuration = clip.duration;
                track.removeClip(clip.id); 
                deletedCount++;
                track.clips.forEach(c => { if (c.start > gapStart) c.start -= gapDuration; });
                track.rebuildTree(); 
            });
        });
        if (deletedCount > 0) {
            this.refreshProjectTopology();
            this.log(`🗑️ Ripple Deleted ${deletedCount} Clips`);
            this.selectedClipIds.clear();
            this.renderTracks();
            if (this.syncOverlays) this.syncOverlays();
            if (this.updateEffectControls) this.updateEffectControls();
            this.requestRedraw();
        }
    }

    saveState() {
        const state = JSON.stringify(this.tracks);
        this.history.push(state);
        if (this.history.length > this.maxHistory) this.history.shift();
        this.redoStack = []; 
    }

    undo() {
        if (this.history.length === 0) return;
        this.redoStack.push(JSON.stringify(this.tracks));
        this.restoreState(this.history.pop());
        this.log("↪️ Undone");
    }

    redo() {
        if (this.redoStack.length === 0) return;
        this.history.push(JSON.stringify(this.tracks));
        this.restoreState(this.redoStack.pop());
        this.log("↪️ Redone");
    }

    restoreState(jsonState) {
        const plainTracks = JSON.parse(jsonState);
        this.tracks = plainTracks.map(tData => {
            const track = new Track(tData.id, tData.name, tData.type, tData.colorClass, tData.role || 'generic');
            track.isMuted = tData.isMuted || false;
            track.isSolo = tData.isSolo || false;
            track.clips = tData.clips.map(cData => {
                const clip = new Clip(cData.id, cData.name, cData.start, cData.duration, cData.type, cData.src);
                clip.trackId = tData.id;
                clip.sourceIn = cData.sourceIn || 0;
                
                if(cData.properties) clip.properties = cData.properties;
                if(cData.aiSegmentation) clip.aiSegmentation = cData.aiSegmentation;
                if(cData.chromaKey) clip.chromaKey = cData.chromaKey;
                if(cData.sandwich) clip.sandwich = cData.sandwich;
                if(cData.mask) clip.mask = cData.mask;
                if(cData.blendMode) clip.blendMode = cData.blendMode;
                if(cData.textStyle) clip.textStyle = cData.textStyle;
                if(cData.effects) clip.effects = cData.effects;
                if(cData.transitions) clip.transitions = cData.transitions;
                if(cData.keyframes) clip.keyframes = cData.keyframes;

                return clip;
            });
            track.rebuildTree();
            return track;
        });
        this.refreshProjectTopology();
        this.deselectAll();
        this.renderTracks();
        if (this.syncOverlays) this.syncOverlays();
        this.requestRedraw();
    }

    resolveCollisions(trackId, activeClip) {
        const track = this.tracks.find(t => t.id === trackId);
        if (!track || track.type === 'subtitle') return;

        const newStart = activeClip.start;
        const newEnd = activeClip.end;
        let clipsToRemove = [];
        let clipsToAdd = [];
        let clipsToModify = [];

        track.clips.forEach(existingClip => {
            if (existingClip.id === activeClip.id) return; 
            const oldStart = existingClip.start;
            const oldEnd = existingClip.end;

            if (newStart < oldEnd && newEnd > oldStart) {
                if (newStart <= oldStart && newEnd >= oldEnd) clipsToRemove.push(existingClip.id);
                else if (newStart > oldStart && newStart < oldEnd && newEnd >= oldEnd) {
                    const newDuration = newStart - oldStart;
                    if (newDuration > 0.05) clipsToModify.push({ clip: existingClip, updates: { duration: newDuration } });
                    else clipsToRemove.push(existingClip.id);
                }
                else if (newEnd > oldStart && newEnd < oldEnd && newStart <= oldStart) {
                    const overlapAmount = newEnd - oldStart;
                    const newDuration = oldEnd - newEnd;
                    if (newDuration > 0.05) clipsToModify.push({ clip: existingClip, updates: { start: newEnd, duration: newDuration, sourceIn: (existingClip.sourceIn || 0) + overlapAmount } });
                    else clipsToRemove.push(existingClip.id);
                }
                else if (newStart > oldStart && newEnd < oldEnd) {
                    const leftDuration = newStart - oldStart;
                    clipsToModify.push({ clip: existingClip, updates: { duration: leftDuration } });
                    const rightStart = newEnd;
                    const rightDuration = oldEnd - newEnd;
                    const rightSourceIn = (existingClip.sourceIn || 0) + (newEnd - oldStart);
                    const rightClip = new Clip(`split_auto_${Date.now()}`, existingClip.name, rightStart, rightDuration, existingClip.type, existingClip.src);
                    rightClip.sourceIn = rightSourceIn;
                    this.deepCopyClipData(existingClip, rightClip);
                    clipsToAdd.push(rightClip);
                }
            }
        });

        clipsToRemove.forEach(id => track.removeClip(id));
        clipsToModify.forEach(item => Object.assign(item.clip, item.updates));
        clipsToAdd.forEach(clip => track.addClip(clip));
        track.rebuildTree();
        this.refreshProjectTopology();
    }
    
    selectClip(clipId, isMultiSelect = false) {
        if (isMultiSelect) {
            if (this.selectedClipIds.has(clipId)) this.selectedClipIds.delete(clipId);
            else this.selectedClipIds.add(clipId);
        } else {
            if (this.selectedClipIds.size === 1 && this.selectedClipIds.has(clipId)) {
                if(this.updateEffectControls) this.updateEffectControls(); 
                return;
            }
            this.selectedClipIds.clear();
            this.selectedClipIds.add(clipId);
        }
        if (this.renderTracks) this.renderTracks();
        if(this.updateEffectControls) this.updateEffectControls();
        this.requestRedraw();
    }

    deselectAll() {
        if (this.selectedClipIds.size > 0) {
            this.selectedClipIds.clear();
            if (this.renderTracks) this.renderTracks();
            if(this.updateEffectControls) this.updateEffectControls();
            this.requestRedraw();
        }
    }

    deleteSelectedClip() {
        this.deleteSelectedClips();
    }

    deleteSelectedClips() {
        if (this.selectedClipIds.size === 0) return;
        this.saveState();
        const idsToDelete = Array.from(this.selectedClipIds);
        let deletedCount = 0;
        this.tracks.forEach(track => {
            for (let i = track.clips.length - 1; i >= 0; i--) {
                if (idsToDelete.includes(track.clips[i].id)) {
                    track.removeClip(track.clips[i].id);
                    deletedCount++;
                }
            }
        });
        if (deletedCount > 0) {
            this.refreshProjectTopology();
            this.log(`🗑️ Deleted ${deletedCount} Clips`);
            this.selectedClipIds.clear();
            this.renderTracks();
            if (this.syncOverlays) this.syncOverlays();
            if(this.updateEffectControls) this.updateEffectControls();
            this.requestRedraw();
        }
    }

    findClipById(clipId) {
        for (const track of this.tracks) {
            const clip = track.clips.find(c => c.id === clipId);
            if (clip) return clip;
        }
        return null;
    }

    updatePlayheadPosition() {
        if(this.renderTracks) this.renderTracks();
        this.requestRedraw();
    }

    // ========================================================
    // 4. Track Management
    // ========================================================

    refreshProjectTopology() {
        if (!this.tracks) return;

        const videoTracks = this.tracks.filter(t => t.type === 'video' || t.type === 'main' || t.type === 'overlay');
        const audioTracks = this.tracks.filter(t => t.type === 'audio');
        const subTracks = this.tracks.filter(t => t.type === 'subtitle');

        let vCurrent = videoTracks.length; 
        videoTracks.forEach(track => {
            track.name = `V${vCurrent}`;
            track._topoIndex = vCurrent;
            track._topoType = 'v';
            vCurrent--;
        });

        let tCurrent = subTracks.length;
        subTracks.forEach(track => {
            track.name = `T${tCurrent}`;
            track._topoIndex = tCurrent;
            track._topoType = 't';
            tCurrent--;
        });

        let aCount = 1;
        audioTracks.forEach(track => {
            track.name = `A${aCount}`;
            track._topoIndex = aCount;
            track._topoType = 'a';
            aCount++;
        });

        this.tracks.forEach(track => {
            const sortedClips = [...track.clips].sort((a, b) => a.start - b.start);
            sortedClips.forEach((clip, index) => {
                const clipIndex = index + 1;
                clip.name = `${clipIndex}${track._topoType}${track._topoIndex}`;
            });
        });
    }

    handleSmartTrackInsertion(index) {
        const prevTrack = this.tracks[index - 1];
        const nextTrack = this.tracks[index];

        let newType = 'video';
        let ambiguous = false;

        if (prevTrack && prevTrack.type === 'audio') {
            newType = 'audio';
        }
        else if (nextTrack && nextTrack.type === 'subtitle') {
            newType = 'subtitle'; 
        }
        else if (prevTrack && prevTrack.type === 'subtitle' && nextTrack && nextTrack.type !== 'subtitle') {
            ambiguous = true;
            this.showTrackChoiceModal(index, 'subtitle_video');
            return;
        }
        else if (prevTrack && (prevTrack.type === 'video' || prevTrack.type === 'overlay' || prevTrack.type === 'main') && 
                 nextTrack && nextTrack.type === 'audio') {
            ambiguous = true;
            this.showTrackChoiceModal(index, 'video_audio');
            return;
        }
        else {
            newType = 'video';
        }

        if (!ambiguous) {
            this.addNewTrack(newType, index);
        }
    }

    showTrackChoiceModal(index, mode) {
        const modalId = 'track-choice-modal';
        let modal = document.getElementById(modalId);
        if (modal) modal.remove();

        modal = document.createElement('div');
        modal.id = modalId;
        modal.className = "fixed inset-0 z-[1000] bg-black/80 flex items-center justify-center backdrop-blur-sm";
        
        let btn1, btn2;
        if (mode === 'subtitle_video') {
            btn1 = { label: 'Transcript Track (T)', type: 'subtitle', icon: 'fa-closed-captioning', color: 'bg-orange-600' };
            btn2 = { label: 'Video Track (V)', type: 'video', icon: 'fa-video', color: 'bg-purple-600' };
        } else {
            btn1 = { label: 'Video Track (V)', type: 'video', icon: 'fa-video', color: 'bg-purple-600' };
            btn2 = { label: 'Audio Track (A)', type: 'audio', icon: 'fa-music', color: 'bg-green-600' };
        }

        modal.innerHTML = `
            <div class="bg-gray-800 p-6 rounded-xl border border-gray-600 shadow-2xl text-center animate-fade-in-up">
                <h3 class="text-white font-bold text-lg mb-4">Choose Track Type</h3>
                <div class="flex gap-4">
                    <button id="choice-btn-1" class="${btn1.color} hover:brightness-110 text-white px-4 py-3 rounded-lg flex flex-col items-center gap-2 w-32 transition-transform hover:scale-105">
                        <i class="fa-solid ${btn1.icon} text-2xl"></i>
                        <span class="text-xs font-bold">${btn1.label}</span>
                    </button>
                    <button id="choice-btn-2" class="${btn2.color} hover:brightness-110 text-white px-4 py-3 rounded-lg flex flex-col items-center gap-2 w-32 transition-transform hover:scale-105">
                        <i class="fa-solid ${btn2.icon} text-2xl"></i>
                        <span class="text-xs font-bold">${btn2.label}</span>
                    </button>
                </div>
                <button id="choice-cancel" class="mt-4 text-gray-400 text-xs hover:text-white underline">Cancel</button>
            </div>
        `;
        document.body.appendChild(modal);

        document.getElementById('choice-btn-1').onclick = () => { this.addNewTrack(btn1.type, index); modal.remove(); };
        document.getElementById('choice-btn-2').onclick = () => { this.addNewTrack(btn2.type, index); modal.remove(); };
        document.getElementById('choice-cancel').onclick = () => { modal.remove(); };
    }

    addNewTrack(type, atIndex = null, role = 'generic') {
        this.saveState(); 
        const id = Date.now();
        let trackName = "New Track"; 
        let colorClass = "";
        
        if (type === 'video') { colorClass = "bg-purple-500"; } 
        else if (type === 'audio') { colorClass = "bg-green-500"; }
        else if (type === 'subtitle') { colorClass = "bg-orange-500"; }

        const newTrack = new Track(id, trackName, type, colorClass, role);
        
        if (atIndex !== null && atIndex >= 0 && atIndex <= this.tracks.length) {
            this.tracks.splice(atIndex, 0, newTrack);
        } else {
            if (type === 'subtitle') {
                this.tracks.unshift(newTrack); 
            } else if (type === 'video' || type === 'overlay') {
                let lastVidIdx = -1;
                this.tracks.forEach((t, i) => { if(t.type !== 'audio') lastVidIdx = i; });
                this.tracks.splice(lastVidIdx + 1, 0, newTrack);
            } 
            else { this.tracks.push(newTrack); }
        }

        this.refreshProjectTopology(); 
        this.log(`➕ New Track Added`);
        this.renderTracks();
        if (this.syncOverlays) this.syncOverlays();
        this.requestRedraw();
    }

    moveTrack(sourceTrackId, targetTrackId) {
        if (sourceTrackId === targetTrackId) return;
        this.saveState();
        const sourceIndex = this.tracks.findIndex(t => t.id == sourceTrackId);
        const targetIndex = this.tracks.findIndex(t => t.id == targetTrackId);
        if (sourceIndex === -1 || targetIndex === -1) return;
        const [movedTrack] = this.tracks.splice(sourceIndex, 1);
        this.tracks.splice(targetIndex, 0, movedTrack);
        this.refreshProjectTopology(); 
        this.log(`🔃 Track Reordered`);
        this.renderTracks();
        if (this.syncOverlays) this.syncOverlays();
        this.requestRedraw();
    }

    deleteTrack(trackId) {
        this.saveState(); 
        const index = this.tracks.findIndex(t => t.id === trackId);
        if (index > -1) {
            this.tracks.splice(index, 1);
            this.refreshProjectTopology(); 
            this.renderTracks();
            if (this.syncOverlays) this.syncOverlays();
            this.requestRedraw();
        }
    }
    toggleTrackMute(trackId) {
        const track = this.tracks.find(t => t.id === trackId);
        if(track) {
            track.isMuted = !track.isMuted;
            if(track.isMuted) track.isSolo = false; 
            this.renderTracks();
            if(this.syncOverlays) this.syncOverlays();
            this.requestRedraw();
        }
    }
    toggleTrackSolo(trackId) {
        const track = this.tracks.find(t => t.id === trackId);
        if(track) {
            track.isSolo = !track.isSolo;
            if(track.isSolo) track.isMuted = false;
            this.renderTracks();
            if(this.syncOverlays) this.syncOverlays();
            this.requestRedraw();
        }
    }

    // ========================================================
    // 5. Events & Tools
    // ========================================================
    setupEditingTools() {
        this.projectState = { clips: [], tracks: [], history: [], settings: {} };
        this.activeTool = 'select';
        this.isDragging = false;
        if (this.timelineContent) {
            this.timelineContent.addEventListener('mousedown', this.handleInputDown.bind(this));
        }
    }

    handleInputDown(e) {
        if (e.target.closest('.track-label-fixed')) return; 
        if (!e.target.closest('.timeline-clip')) this.deselectAll();
    }
}

// 6. Global Exports
window.Clip = Clip;
window.Track = Track;
window.EditorApp = EditorApp;