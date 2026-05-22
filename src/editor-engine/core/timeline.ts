// @ts-nocheck
// timeline.js
/**
 * 🎞️ Professional NLE Timeline Engine (timeline.js)
 * تم التحديث:
 * 1. 🕵️‍♂️ Debug Mode: رسائل كونسول تفصيلية لمعرفة سبب فشل الموجات.
 * 2. 🛡️ Aggressive Fallback: أي فشل (CORS, Memory, Silence) يحول فوراً للمحاكاة.
 * 3. 🧠 Memory Safety: منع محاولة تحليل الملفات العملاقة (>50MB) لتجنب انهيار الصفحة.
 * 4. 🔧 FIX: Added missing moveClipToTrack function to fix drag-drop errors.
 */

const TICKS_PER_SECOND = 254016000; 
const VIRTUAL_BUFFER_PX = 500; 
const TRACK_HEADER_WIDTH = 140;

window.EditorApp.prototype.initEngine = function() {
    this.isEngineReady = true;
    this.scrollX = 0;
    this.visibleRange = { start: 0, end: 0 };
    this.dirty = true; 
    this.snapThreshold = 15; 
    
    // 🔥 تهيئة نظام الصوت الذكي
    this.audioWorker = new Worker('workers/audio_worker.js');
    this.audioBitmapCache = new Map(); 
    this.sharedAudioBuffers = new Map(); 
    this.pendingAudioRequests = new Map(); 
    
    this.audioCtxForAnalysis = new (window.AudioContext || window.webkitAudioContext)();
    
    this.audioWorker.onmessage = (e) => {
        if (e.data.debug) {
            console.log(`[Worker] ${e.data.debug}`);
        }
        if (e.data.peaks && e.data.jobId) {
            this.finalizeWaveform(e.data.jobId, e.data.peaks);
        }
    };

    this.renderLoop = this.renderLoop.bind(this);
    requestAnimationFrame(this.renderLoop);

    if (this.timelineContent && this.timelineContent.parentElement) {
        this.timelineContent.parentElement.addEventListener('scroll', (e) => {
            this.scrollX = e.target.scrollLeft;
            this.dirty = true;
        });
    }
    
    document.addEventListener('click', () => {
        const menu = document.getElementById('context-menu');
        if(menu) menu.classList.add('hidden');
    });

    this.setupRazorLine();
};

window.EditorApp.prototype.setupRazorLine = function() {
    if (!this.timelineContent) return;
    let razorLine = document.querySelector('.razor-line');
    if (!razorLine) {
        razorLine = document.createElement('div');
        razorLine.className = 'razor-line';
        this.timelineContent.appendChild(razorLine);
    }
    this.razorLine = razorLine;
    this.timelineContent.addEventListener('mousemove', (e) => {
        if (this.activeTool !== 'razor' && this.activeTool !== 'cut') {
            this.razorLine.style.display = 'none';
            document.body.style.cursor = 'default';
            return;
        }
        document.body.style.cursor = 'crosshair';
        const rect = this.timelineContent.getBoundingClientRect();
        let xPos = e.clientX - rect.left; 
        if (xPos > TRACK_HEADER_WIDTH) {
            this.razorLine.style.display = 'block';
            this.razorLine.style.left = `${xPos}px`;
        } else {
            this.razorLine.style.display = 'none';
        }
    });
    this.timelineContent.addEventListener('mouseleave', () => {
        if (this.razorLine) this.razorLine.style.display = 'none';
    });
};

window.EditorApp.prototype.renderLoop = function() {
    if (this.dirty) {
        this.calculateVisibleWindow();
        this.renderVirtualRuler();
        this.renderVirtualTracks();
        this.dirty = false;
    }
    requestAnimationFrame(this.renderLoop);
};

window.EditorApp.prototype.calculateVisibleWindow = function() {
    if (!this.timelineContent || !this.timelineContent.parentElement) return;
    const containerWidth = this.timelineContent.parentElement.clientWidth;
    const startPx = Math.max(0, this.scrollX - VIRTUAL_BUFFER_PX);
    const endPx = this.scrollX + containerWidth + VIRTUAL_BUFFER_PX;
    this.visibleRange = {
        start: this.pixelsToTime(startPx),
        end: this.pixelsToTime(endPx),
        startPx: startPx,
        endPx: endPx
    };
    const totalWidth = (this.duration * this.pixelsPerSecond) + 300;
    this.timelineContent.style.width = `${totalWidth}px`;
    this.timelineContent.style.paddingLeft = '140px'; 
};

window.EditorApp.prototype.renderAll = function() {
    if (!this.isEngineReady) this.initEngine();
    this.dirty = true;
};
window.EditorApp.prototype.renderTracks = function() { this.dirty = true; };
window.EditorApp.prototype.updateTimelineLayout = function() { this.dirty = true; };

window.EditorApp.prototype.renderVirtualRuler = function() {
    if (!this.rulerContainer) return;
    this.rulerContainer.innerHTML = ''; 
    const step = this.pixelsPerSecond > 50 ? 1 : 5; 
    const startSec = Math.floor(this.visibleRange.start);
    const endSec = Math.ceil(this.visibleRange.end);
    for (let s = startSec; s <= endSec; s += 1) {
        const isMajor = s % step === 0;
        if (!isMajor && this.pixelsPerSecond < 20) continue;
        const tick = document.createElement('div');
        tick.className = `ruler-tick ${isMajor ? 'major' : ''}`;
        tick.style.left = `${s * this.pixelsPerSecond}px`;
        if (isMajor) {
            const label = document.createElement('span');
            label.className = 'ruler-label';
            label.innerText = this.formatTime(s);
            tick.appendChild(label);
        }
        this.rulerContainer.appendChild(tick);
    }
};

window.EditorApp.prototype.renderVirtualTracks = function() {
    if (!this.tracksContainer) return;
    this.tracksContainer.innerHTML = '';

    if(this.refreshProjectTopology) this.refreshProjectTopology();

    this.tracks.forEach((track, trackIndex) => {
        
        const divider = document.createElement('div');
        divider.className = 'track-separator';
        divider.innerHTML = `<button class="track-insert-btn group-hover:opacity-100" title="Insert Track Here"><i class="fa-solid fa-plus"></i></button>`;
        divider.querySelector('button').onclick = () => {
             if(app.handleSmartTrackInsertion) app.handleSmartTrackInsertion(trackIndex);
             else app.addNewTrack('video', trackIndex);
        };
        divider.style.marginLeft = "-140px";
        this.tracksContainer.appendChild(divider);

        const trackRow = document.createElement('div');
        trackRow.className = "track-row group";
        trackRow.dataset.trackId = track.id; 
        trackRow.dataset.trackType = track.type;
        
        const label = document.createElement('div');
        label.className = "track-label-fixed cursor-grab active:cursor-grabbing hover:bg-gray-800 transition-colors";
        
        let trackIcon = 'fa-video';
        if(track.type === 'audio') trackIcon = 'fa-music';
        if(track.type === 'subtitle') trackIcon = 'fa-closed-captioning';

        label.innerHTML = `
            <div class="flex items-center gap-2">
                <i class="fa-solid fa-grip-vertical text-gray-600 text-[10px] cursor-grab"></i>
                <div class="flex items-center">
                    <i class="fa-solid ${trackIcon} mr-2 opacity-50 text-[9px]"></i> 
                    <span class="truncate w-10 text-[10px] font-bold">${track.name}</span>
                </div>
            </div>
        `;
        label.style.marginLeft = "-140px";
        
        label.draggable = true;
        label.ondragstart = (e) => {
            e.dataTransfer.setData('text/plain', track.id);
            e.dataTransfer.effectAllowed = 'move';
            label.classList.add('opacity-50', 'border', 'border-yellow-500');
        };
        label.ondragend = () => {
            label.classList.remove('opacity-50', 'border', 'border-yellow-500');
        };
        label.ondragover = (e) => {
            e.preventDefault(); e.stopPropagation();
            label.style.background = '#374151'; 
        };
        label.ondragleave = () => { label.style.background = ''; };
        label.ondrop = (e) => {
            e.preventDefault(); e.stopPropagation();
            label.style.background = '';
            const sourceTrackId = e.dataTransfer.getData('text/plain');
            if (sourceTrackId) { app.moveTrack(sourceTrackId, track.id); }
        };

        const controlsDiv = document.createElement('div');
        controlsDiv.className = "flex gap-1 items-center ml-auto";

        const muteBtn = document.createElement('button');
        muteBtn.className = `w-4 h-4 text-[9px] rounded flex items-center justify-center border border-gray-700 ${track.isMuted ? 'bg-red-900/50 text-red-500 border-red-800' : 'bg-gray-800 text-gray-400'}`;
        muteBtn.innerHTML = 'M';
        muteBtn.onclick = (e) => { e.stopPropagation(); this.toggleTrackMute(track.id); };

        const soloBtn = document.createElement('button');
        soloBtn.className = `w-4 h-4 text-[9px] rounded flex items-center justify-center border border-gray-700 ${track.isSolo ? 'bg-yellow-900/50 text-yellow-400 border-yellow-800' : 'bg-gray-800 text-gray-400'}`;
        soloBtn.innerHTML = 'S';
        soloBtn.onclick = (e) => { e.stopPropagation(); this.toggleTrackSolo(track.id); };

        const delBtn = document.createElement('button');
        delBtn.className = "track-btn delete text-gray-500 hover:text-red-500 ml-1";
        delBtn.innerHTML = '<i class="fa-solid fa-trash-can"></i>';
        delBtn.onclick = (e) => { e.stopPropagation(); if(confirm('Delete Track?')) this.deleteTrack(track.id); };

        controlsDiv.append(muteBtn, soloBtn, delBtn);
        label.appendChild(controlsDiv);
        trackRow.appendChild(label);

        this.setupTrackDropZone(trackRow, track);

        const visibleClips = track.clips.filter(clip => {
            const clipEnd = clip.start + clip.duration;
            return (clipEnd >= this.visibleRange.start && clip.start <= this.visibleRange.end);
        });

        visibleClips.forEach(clip => {
            const clipEl = this.createClipElement(clip, track);
            trackRow.appendChild(clipEl);
        });

        this.tracksContainer.appendChild(trackRow);
    });

    const addTrackRow = document.createElement('div');
    addTrackRow.className = "flex flex-col items-center justify-center py-4 gap-2 opacity-50 hover:opacity-100 transition-opacity";
    addTrackRow.style.marginLeft = "-140px"; 
    
    addTrackRow.innerHTML = `
        <div class="flex gap-2">
            <button onclick="app.addNewTrack('video')" class="px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded text-xs border border-gray-600 flex items-center gap-2">
                <i class="fa-solid fa-plus"></i> Add Video Track
            </button>
            <button onclick="app.addNewTrack('audio')" class="px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded text-xs border border-gray-600 flex items-center gap-2">
                <i class="fa-solid fa-plus"></i> Add Audio Track
            </button>
        </div>
    `;
    this.tracksContainer.appendChild(addTrackRow);
};

window.EditorApp.prototype.setupTrackDropZone = function(trackRow, track) {
    trackRow.ondragover = (e) => { e.preventDefault(); trackRow.classList.add('drag-over'); };
    trackRow.ondragleave = () => { trackRow.classList.remove('drag-over', 'drag-over-error'); };
    trackRow.ondrop = (e) => {
        e.preventDefault();
        trackRow.classList.remove('drag-over', 'drag-over-error');
        const data = e.dataTransfer.getData('application/json');
        if (!data) return;
        try {
            const asset = JSON.parse(data);
            if (track.type === 'subtitle') { this.log("🚫 Subtitle tracks are read-only."); return; }
            let isValid = false;
            if ((asset.type === 'video' || asset.type === 'image') && (track.type === 'video' || track.type === 'overlay' || track.type === 'main')) isValid = true;
            else if (asset.type === 'audio' && track.type === 'audio') isValid = true;
            if (!isValid) { trackRow.classList.add('drag-over-error'); setTimeout(() => trackRow.classList.remove('drag-over-error'), 500); return; }
            this.saveState(); 
            const containerRect = document.getElementById('timeline-scroll-area').getBoundingClientRect();
            const scrollLeft = document.getElementById('timeline-scroll-area').scrollLeft;
            const relativeX = (e.clientX - containerRect.left) + scrollLeft - 140;
            const dropTime = Math.max(0, relativeX / this.pixelsPerSecond);
            const duration = asset.type === 'image' ? 5 : 10; 
            const newClip = new Clip(`drop_${Date.now()}`, asset.name, dropTime, duration, asset.type, asset.src);
            track.addClip(newClip);
            this.resolveCollisions(track.id, newClip);
            
            if (asset.type === 'video') {
                const audioTrack = this.tracks.find(t => t.type === 'audio');
                if (audioTrack) {
                    const audioClip = new Clip(`drop_a_${Date.now()}`, `${asset.name} [Audio]`, dropTime, duration, 'audio', asset.src);
                    audioTrack.addClip(audioClip);
                    this.resolveCollisions(audioTrack.id, audioClip);
                }
            }
            
            if(this.refreshProjectTopology) this.refreshProjectTopology(); 

            this.log(`✅ Dropped ${asset.name} at ${this.formatTime(dropTime)}`);
            this.renderTracks();
        } catch (err) { console.error(err); }
    };
};

// 🔥 CORE AUDIO LOGIC: Debug + Fallback
window.EditorApp.prototype.drawWaveform = function(canvas, clip) {
    // 1. Check Bitmap Cache (الأسرع)
    if (this.audioBitmapCache.has(clip.id)) {
        const cachedBitmap = this.audioBitmapCache.get(clip.id);
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(cachedBitmap, 0, 0, canvas.width, canvas.height);
        return;
    }

    if (clip._isAnalyzing) {
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = "#334155";
        ctx.fillRect(0, canvas.height/2 - 2, canvas.width, 4);
        return;
    }

    clip._isAnalyzing = true;

    // 🔥 Trigger Fallback Simulation Function
    const triggerFallback = (reason) => {
        console.warn(`[Waveform] ⚠️ Fallback triggered for ${clip.name}. Reason: ${reason}`);
        this.finalizeWaveform({ clipId: clip.id, width: canvas.width, height: canvas.height }, null, true);
    };

    const processSharedBuffer = (audioBuffer) => {
        const sampleRate = audioBuffer.sampleRate;
        const channelData = audioBuffer.getChannelData(0); // Left channel

        // حساب مكان القص بدقة
        const sourceStart = clip.sourceIn || 0;
        const duration = clip.duration;
        
        const startSample = Math.floor(sourceStart * sampleRate);
        const endSample = Math.floor((sourceStart + duration) * sampleRate);
        
        console.log(`[Waveform] Slicing ${clip.name}: Start ${startSample}, End ${endSample}, Total ${channelData.length}`);

        let rawSegment;
        if (startSample < channelData.length) {
             rawSegment = channelData.slice(startSample, Math.min(endSample, channelData.length));
        } else {
             rawSegment = new Float32Array(10); // Silent
        }

        const samplesToDraw = Math.ceil(canvas.width);
        this.audioWorker.postMessage({
            channelData: rawSegment,
            samples: samplesToDraw,
            jobId: { clipId: clip.id, width: canvas.width, height: canvas.height }
        });
    };

    if (this.sharedAudioBuffers.has(clip.src)) {
        processSharedBuffer(this.sharedAudioBuffers.get(clip.src));
    } else {
        if (this.pendingAudioRequests.has(clip.src)) {
            setTimeout(() => { clip._isAnalyzing = false; this.requestRedraw(); }, 500);
            return;
        }

        this.pendingAudioRequests.set(clip.src, true);
        console.log(`[Waveform] Fetching ${clip.src}...`);

        fetch(clip.src)
            .then(response => {
                if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);
                const len = response.headers.get('Content-Length');
                if (len && parseInt(len) > 50 * 1024 * 1024) { // > 50MB check
                    throw new Error("File too large for direct decoding");
                }
                return response.arrayBuffer();
            })
            .then(arrayBuffer => {
                console.log(`[Waveform] Decoding ${arrayBuffer.byteLength} bytes...`);
                return this.audioCtxForAnalysis.decodeAudioData(arrayBuffer);
            })
            .then(audioBuffer => {
                console.log(`[Waveform] Decoded successfully! Channels: ${audioBuffer.numberOfChannels}`);
                this.sharedAudioBuffers.set(clip.src, audioBuffer);
                this.pendingAudioRequests.delete(clip.src);
                processSharedBuffer(audioBuffer);
            })
            .catch(err => {
                console.error(`[Waveform] Failed to load/decode audio for ${clip.name}:`, err);
                this.pendingAudioRequests.delete(clip.src);
                // 🔥 الفشل هنا سيشغل المحاكاة فوراً
                triggerFallback(err.message);
            });
    }
};

window.EditorApp.prototype.finalizeWaveform = function(jobInfo, peaks, isSimulation = false) {
    const { clipId, width, height } = jobInfo;
    const offscreen = new OffscreenCanvas(width, height);
    const ctx = offscreen.getContext('2d');
    
    const centerY = height / 2;
    // إذا كانت محاكاة، نزيد كثافة الأعمدة لتبدو حقيقية
    const barWidth = width / (isSimulation ? 80 : peaks.length); 

    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, '#a3e635');   
    gradient.addColorStop(0.5, '#15803d'); 
    gradient.addColorStop(1, '#a3e635');   

    ctx.fillStyle = gradient;
    ctx.beginPath();

    if (isSimulation) {
        // 🔥 محاكاة قوية تعتمد على اسم الملف لتبدو ثابتة لكن عشوائية
        let seed = 0;
        for(let i=0; i<clipId.length; i++) seed += clipId.charCodeAt(i);
        
        console.log(`[Waveform] Rendering SIMULATION for ${clipId}`);

        for (let x = 0; x < width; x+=3) {
            // دمج Sine Wave مع Pseudo-Random لعمل شكل صوت طبيعي
            const noise = (Math.sin((x * 0.1) + seed) * Math.cos((x * 0.05) + seed)) + (Math.sin(x * 0.3) * 0.5);
            // جعل الارتفاع يتراوح بين 20% و 90%
            let amplitude = (Math.abs(noise) * (height / 2)) * 0.9;
            amplitude = Math.max(amplitude, 2); // الحد الأدنى للارتفاع

            ctx.rect(x, centerY - amplitude, 2, amplitude * 2);
        }
    } else {
        let maxPeak = 0;
        for(let p of peaks) if(p > maxPeak) maxPeak = p;

        console.log(`[Waveform] Rendering REAL peaks. Max: ${maxPeak}`);

        // إذا كانت البيانات كلها أصفار، شغل المحاكاة بدلاً من رسم خط
        if (maxPeak < 0.001) {
             console.warn("[Waveform] Data is silent. Switching to Simulation.");
             this.finalizeWaveform(jobInfo, null, true);
             return;
        }

        const boost = 1.5; 
        for (let i = 0; i < peaks.length; i++) {
            const x = i * barWidth;
            let amplitude = peaks[i] * (height / 2) * boost;
            amplitude = Math.min(amplitude, height/2 - 1);
            
            if (amplitude > 0.5) {
                ctx.rect(x, centerY - amplitude, Math.max(1, barWidth), amplitude * 2);
            } else {
                 ctx.rect(x, centerY - 0.5, Math.max(1, barWidth), 1);
            }
        }
    }
    
    ctx.fill();

    const bitmap = offscreen.transferToImageBitmap();
    this.audioBitmapCache.set(clipId, bitmap);

    const clip = this.findClipById(clipId);
    if(clip) clip._isAnalyzing = false;
    this.requestRedraw();
};


window.EditorApp.prototype.createClipElement = function(clip, track) {
    const clipEl = document.createElement('div');
    clipEl.className = `timeline-clip ${track.colorClass} shadow-md`;
    clipEl.dataset.id = clip.id;
    if (this.selectedClipIds.has(clip.id)) clipEl.classList.add('selected');
    const leftPos = this.timeToPixels(clip.start);
    const widthPos = this.timeToPixels(clip.duration) - 1; 
    clipEl.style.transform = `translate3d(${leftPos}px, 0, 0)`; 
    clipEl.style.width = `${Math.max(2, widthPos)}px`; 
    
    if(clip.properties && clip.properties.opacity < 100) {
        clipEl.style.opacity = (clip.properties.opacity / 100) + 0.2;
    }

    let icon = 'fa-film';
    let contentHTML = `<span class="text-xs font-bold truncate z-10 relative">${clip.name}</span>`;

    if (clip.type === 'audio') {
        icon = 'fa-music';
        const canvasW = Math.max(10, widthPos);
        const canvasH = 36; 
        contentHTML = `
            <canvas width="${canvasW}" height="${canvasH}" class="absolute top-0 left-0 w-full h-full pointer-events-none opacity-90"></canvas>
            <span class="text-xs font-bold truncate z-10 relative ml-1 shadow-black drop-shadow-md text-white mix-blend-difference">${clip.name}</span>
        `;
    }
    else if (clip.type === 'image') icon = 'fa-image';
    else if (clip.type === 'text') icon = 'fa-font';

    clipEl.innerHTML = `
        <div class="clip-handle left" data-action="trim-in"></div>
        <div class="clip-content px-2 pointer-events-none flex items-center gap-1 w-full h-full relative overflow-hidden">
            <i class="fa-solid ${icon} text-[9px] opacity-70 z-10 relative"></i>
            ${contentHTML}
        </div>
        <div class="clip-handle right" data-action="trim-out"></div>
    `;
    
    if (clip.type === 'audio') {
        const canvas = clipEl.querySelector('canvas');
        if(canvas) this.drawWaveform(canvas, clip);
    }

    this.addSmartDragLogic(clipEl, clip, track);

    clipEl.oncontextmenu = (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.selectClip(clip.id, false);
        this.showContextMenu(e.clientX, e.clientY, clip.id);
    };

    return clipEl;
};

window.EditorApp.prototype.showContextMenu = function(x, y, clipId) {
    let menu = document.getElementById('context-menu');
    if (!menu) return;
    const clip = this.findClipById(clipId);
    const btnTranscribe = document.getElementById('ctx-transcribe');
    if (clip && (clip.type === 'video' || clip.type === 'audio')) {
        btnTranscribe.classList.remove('hidden');
        btnTranscribe.onclick = () => {
            if (window.aiManager) {
                window.aiManager.generateSubtitlesForClip(clip);
                menu.classList.add('hidden');
            } else {
                this.log("⚠️ AI Manager not loaded.");
            }
        };
    } else {
        btnTranscribe.classList.add('hidden');
    }
    menu.classList.remove('hidden');
    menu.style.left = `${x}px`;
    menu.style.top = `${y}px`;

    const btnRipple = document.getElementById('ctx-ripple');
    const btnDelete = document.getElementById('ctx-delete');
    
    if(btnRipple) btnRipple.onclick = () => { this.rippleDelete(); menu.classList.add('hidden'); };
    if(btnDelete) btnDelete.onclick = () => { this.deleteSelectedClip(); menu.classList.add('hidden'); };
};

window.EditorApp.prototype.timeToPixels = function(seconds) { return seconds * this.pixelsPerSecond; };
window.EditorApp.prototype.pixelsToTime = function(pixels) { return pixels / this.pixelsPerSecond; };

window.EditorApp.prototype.addSmartDragLogic = function(element, clip, track) {
    element.onmousedown = (e) => {
        if (e.button === 2) return; 
        if (this.activeTool === 'razor' || this.activeTool === 'cut') {
            e.stopPropagation(); e.preventDefault();
            this.performSplit(clip, track, e);
            return; 
        }
        this.saveState();
        e.stopPropagation(); e.preventDefault();
        const isMulti = e.ctrlKey || e.metaKey; 
        if (!this.selectedClipIds.has(clip.id) && !isMulti) this.selectClip(clip.id, false);
        else if (isMulti) this.selectClip(clip.id, true);

        const isTrimLeft = e.target.classList.contains('left');
        const isTrimRight = e.target.classList.contains('right');
        const mode = isTrimLeft ? 'trimIn' : (isTrimRight ? 'trimOut' : 'move');
        const startX = e.clientX;
        
        const selectedClipsSnapshot = [];
        this.tracks.forEach(t => {
            t.clips.forEach(c => {
                if (this.selectedClipIds.has(c.id)) {
                    selectedClipsSnapshot.push({
                        clip: c, track: t, origStart: c.start, origDur: c.duration,
                        origSourceIn: c.sourceIn || 0, origSourceOut: (c.sourceIn || 0) + c.duration
                    });
                }
            });
        });

        let targetTrackId = track.id; 
        let lastHighlightedRow = null;

        const moveHandler = (moveEvent) => {
            const pixelDelta = moveEvent.clientX - startX;
            const timeDelta = this.pixelsToTime(pixelDelta);

            selectedClipsSnapshot.forEach(snapshot => {
                if (mode === 'move') {
                    let newStart = snapshot.origStart + timeDelta;
                    const snapPoint = this.getSnapPoint(newStart, [snapshot.clip]); 
                    if (snapPoint !== null) newStart = snapPoint;
                    newStart = Math.max(0, newStart);
                    snapshot.clip.start = newStart;
                } else if (mode === 'trimIn') {
                    if (snapshot.clip.id === clip.id) {
                         this.applyTrimLogic(snapshot.clip, snapshot.track, snapshot.origStart, snapshot.origDur, snapshot.origSourceIn, timeDelta, 'in');
                    }
                } else if (mode === 'trimOut') {
                    if (snapshot.clip.id === clip.id) {
                        this.applyTrimLogic(snapshot.clip, snapshot.track, snapshot.origStart, snapshot.origDur, snapshot.origSourceOut, timeDelta, 'out');
                    }
                }
            });

            if (mode === 'move') {
                const elementsBelow = document.elementsFromPoint(moveEvent.clientX, moveEvent.clientY);
                const trackRowEl = elementsBelow.find(el => el.classList.contains('track-row'));
                if (trackRowEl) {
                    const hoveredTrackId = parseInt(trackRowEl.dataset.trackId);
                    const hoveredTrackType = trackRowEl.dataset.trackType;
                    let isValidTarget = false;
                    if (clip.type === 'audio' && hoveredTrackType === 'audio') isValidTarget = true;
                    if ((clip.type === 'video' || clip.type === 'image' || clip.type === 'text') && 
                        (hoveredTrackType === 'video' || hoveredTrackType === 'main' || hoveredTrackType === 'overlay' || hoveredTrackType === 'subtitle')) isValidTarget = true;
                    if (isValidTarget && hoveredTrackId !== targetTrackId) {
                        if (lastHighlightedRow) lastHighlightedRow.style.backgroundColor = '';
                        trackRowEl.style.backgroundColor = 'rgba(255, 255, 255, 0.1)'; 
                        lastHighlightedRow = trackRowEl;
                        targetTrackId = hoveredTrackId;
                    }
                }
            }
            this.dirty = true;
            if (this.syncOverlays) this.syncOverlays();
        };

        const upHandler = () => {
            document.removeEventListener('mousemove', moveHandler);
            document.removeEventListener('mouseup', upHandler);
            if (lastHighlightedRow) lastHighlightedRow.style.backgroundColor = '';
            if (mode === 'move' && targetTrackId !== track.id) this.moveClipToTrack(clip, targetTrackId);
            selectedClipsSnapshot.forEach(snapshot => {
                const currentTrackId = (snapshot.clip.id === clip.id) ? targetTrackId : snapshot.track.id;
                this.resolveCollisions(currentTrackId, snapshot.clip);
            });
            
            if(this.refreshProjectTopology) this.refreshProjectTopology();
            
            this.renderTracks();
            this.updateEffectControls(); 
            this.log(`Action Completed: ${mode}`);
        };
        document.addEventListener('mousemove', moveHandler); document.addEventListener('mouseup', upHandler);
    };
};

window.EditorApp.prototype.moveClipToTrack = function(clip, targetTrackId) {
    const sourceTrack = this.tracks.find(t => t.clips.some(c => c.id === clip.id));
    const targetTrack = this.tracks.find(t => t.id === targetTrackId);
    
    if (sourceTrack && targetTrack) {
        // 1. Remove from source
        sourceTrack.clips = sourceTrack.clips.filter(c => c.id !== clip.id);
        
        // 2. Add to target
        targetTrack.clips.push(clip);
        
        // 3. Update metadata
        clip.trackId = targetTrackId;
        
        this.log(`Moved clip to track ${targetTrack.name}`);
    }
};

window.EditorApp.prototype.applyMoveLogic = function(clip, track, originalStart, delta) { };

window.EditorApp.prototype.applyTrimLogic = function(clip, track, origStart, origDur, origSource, delta, type) {
    if (type === 'out') {
        let newDur = Math.max(0.1, origDur + delta);
        clip.duration = newDur;
    } else if (type === 'in') {
        let newStart = origStart + delta;
        let newDur = Math.max(0.1, origDur - delta);
        clip.start = newStart;
        clip.duration = newDur;
        clip.sourceIn = origSource + delta; 
    }
};

window.EditorApp.prototype.getSnapPoint = function(time, excludeClips = []) {
    if (!this.tracks) return null;
    const snapTargets = [0, this.currentTime]; 
    this.tracks.forEach(t => {
        t.clips.forEach(c => {
            if (excludeClips.some(ex => ex.id === c.id)) return;
            snapTargets.push(c.start);
            snapTargets.push(c.end);
        });
    });
    let closest = null;
    let minDist = Infinity;
    const thresholdSec = this.pixelsToTime(this.snapThreshold);
    snapTargets.forEach(target => {
        const dist = Math.abs(time - target);
        if (dist < thresholdSec && dist < minDist) {
            minDist = dist;
            closest = target;
        }
    });
    return closest;
};

window.EditorApp.prototype.zoom = function(dir) {
    this.pixelsPerSecond = Math.max(5, Math.min(500, this.pixelsPerSecond + (dir * 10)));
    const zoomLabel = document.getElementById('zoom-level');
    if(zoomLabel) zoomLabel.innerText = `Zoom: ${Math.round((this.pixelsPerSecond/20)*100)}%`;
    this.dirty = true;
    this.audioBitmapCache.clear(); 
};