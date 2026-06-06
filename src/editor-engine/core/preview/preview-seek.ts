// @ts-nocheck
// preview-seek.ts — managePlayers, seek, seekToAbsolute, seekFrame, seekToStart, seekToEnd, framesToTimecode, manualTimeUpdate, syncOverlays, updatePlayheadPosition, setupPlayheadScrubbing

window.EditorApp.prototype.seekFrame = function(frames) { const fd = 1/this.FPS; this.currentTime = Math.max(0, Math.min(this.currentTime + (frames*fd), this.duration)); this.seek(0); };
window.EditorApp.prototype.seekToStart = function() { this.currentTime = 0; this.seek(0); };
window.EditorApp.prototype.seekToEnd = function() { this.currentTime = this.duration; this.seek(0); };
window.EditorApp.prototype.framesToTimecode = function(s) { const f=Math.floor(s*this.FPS)%this.FPS, ts=Math.floor(s), ss=ts%60, mm=Math.floor(ts/60)%60, hh=Math.floor(ts/3600); const p=n=>n.toString().padStart(2,'0'); return `${p(hh)};${p(mm)};${p(ss)};${p(f)}`; };
window.EditorApp.prototype.manualTimeUpdate = function(str) { const p=str.split(';'); if(p.length!==4)return; const s=(parseInt(p[0])*3600)+(parseInt(p[1])*60)+parseInt(p[2])+(parseInt(p[3])/this.FPS); this.currentTime=Math.max(0,Math.min(s,this.duration)); this.seek(0); };

window.EditorApp.prototype.managePlayers = function() {
    this.anySolo = this.tracks.some(t => t.isSolo); const reqs = new Map(); 
    this.tracks.forEach(track => {
        const clips = track.getClipsAtTime(this.currentTime); if(clips.length>0) {
            const clip = clips[0];
            if ((clip.type === 'video') && (track.type === 'video' || track.type === 'main' || track.type === 'overlay') && !track.isMuted && (!this.anySolo || track.isSolo)) {
                const key = `visual_${clip.src}`; if(!reqs.has(key)) reqs.set(key, { src: clip.src, type: 'visual', clip: clip });
            }
            if ((clip.properties && clip.properties.innerMediaType === 'video') && clip.properties.innerMediaSrc && !track.isMuted && (!this.anySolo || track.isSolo)) {
                const innerKey = `visual_${clip.properties.innerMediaSrc}`;
                if(!reqs.has(innerKey)) reqs.set(innerKey, { src: clip.properties.innerMediaSrc, type: 'visual', clip: clip });
            }
            if ((clip.type === 'audio') && (track.type === 'audio') && !track.isMuted && (!this.anySolo || track.isSolo)) {
                const key = `audio_${clip.src}`; if(!reqs.has(key)) reqs.set(key, { src: clip.src, type: 'audio', clip: clip, vol: 0 });
                const r = reqs.get(key);
                // ✅ FIX: Use getPropertyValue for keyframe-animated volume
                // clip.properties.volume is the static value; keyframes override it
                const timeInClip = this.currentTime - clip.start;
                const animVol = clip.getPropertyValue
                    ? clip.getPropertyValue('volume', timeInClip)
                    : (clip.properties.volume !== undefined ? clip.properties.volume : 100);
                r.vol = Math.max(r.vol, animVol / 100);
            }
        }
    });
    const avail = this.players ? this.players.filter(p => p) : []; const assign = {}; 
    reqs.forEach((r,k) => { const ex = avail.find(p => p.getAttribute('data-key') === k); if(ex) { assign[k] = ex; avail.splice(avail.indexOf(ex), 1); } });
    reqs.forEach((r,k) => { if(!assign[k] && avail.length>0) { const p = avail.pop(); p.setAttribute('data-key', k); p.setAttribute('data-type', r.type); if(p.getAttribute('data-current-src')!==r.src) { p.setAttribute('data-current-src', r.src); p.src = r.src; p.load(); } assign[k] = p; } });
    Object.keys(assign).forEach(k => {
        const p = assign[k], r = reqs.get(k), off = this.currentTime - r.clip.start;
        
        // ✅ F5: Speed Ramping Support
        // Get the dynamic speed at the current relative time
        const currentSpeed = r.clip.getPropertyValue 
            ? r.clip.getPropertyValue('playbackSpeed', off) 
            : (r.clip.properties?.playbackSpeed || 1.0);
            
        // Calculate source time. (Ideally, this should be integrated over time for perfect accuracy 
        // with complex curves, but for basic speed ramping, using the current speed gives the "rate" effect)
        // If there are no keyframes, it's exact.
        let t = (r.clip.sourceIn || 0) + (off * currentSpeed);
        // ✅ Phase 4: Reverse Clip Support
        if (r.clip.properties?.reverse) {
            t = (r.clip.sourceIn || 0) + r.clip.duration - (off * currentSpeed);
        }

        if (Math.abs(p.currentTime - t) > 0.15 && p.readyState > 0) {
            try { p.currentTime = t; } catch(e) {}
        }
        
        // --- DEBUG LOGGING ---
        if (!window._debugLastLog) window._debugLastLog = 0;
        if (performance.now() - window._debugLastLog > 1000) {
            console.log(`[Playback Debug] key=${k} readyState=${p.readyState} p.currentTime=${p.currentTime.toFixed(3)} t=${t.toFixed(3)} | this.currentTime=${this.currentTime.toFixed(3)} start=${r.clip.start.toFixed(3)} off=${off.toFixed(3)} sourceIn=${r.clip.sourceIn} speed=${currentSpeed}`);
            window._debugLastLog = performance.now();
        }
        // ---------------------
        
        p.playbackRate = Math.max(0.0625, Math.min(16.0, currentSpeed)); // Chrome limits 0.0625 to 16.0
        
        // ✅ F5: Preserve Pitch
        if ('preservesPitch' in p) {
            p.preservesPitch = r.clip.properties?.preservesPitch !== false; // Default to true
        }

        // ✅ Phase 4: Audio Equalizer (3-Band EQ)
        if (r.type === 'audio' && r.clip.properties?.eq) {
            // Setup EQ nodes once per player if not exists
            if (!p.audioNodes) {
                if (!this.audioCtx) this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
                try {
                    const source = this.audioCtx.createMediaElementSource(p);
                    const low = this.audioCtx.createBiquadFilter(); low.type = 'lowshelf'; low.frequency.value = 320;
                    const mid = this.audioCtx.createBiquadFilter(); mid.type = 'peaking'; mid.frequency.value = 1000; mid.Q.value = 0.5;
                    const high = this.audioCtx.createBiquadFilter(); high.type = 'highshelf'; high.frequency.value = 3200;
                    source.connect(low); low.connect(mid); mid.connect(high); high.connect(this.audioCtx.destination);
                    p.audioNodes = { low, mid, high, connected: true };
                } catch (e) {
                    console.warn("Could not create audio node for EQ", e);
                }
            }
            if (p.audioNodes) {
                const eq = r.clip.properties.eq;
                p.audioNodes.low.gain.value = eq.low || 0;
                p.audioNodes.mid.gain.value = eq.mid || 0;
                p.audioNodes.high.gain.value = eq.high || 0;
            }
        }

        if (this.isPlaying && p.paused) p.play().catch(e=>{}); else if (!this.isPlaying && !p.paused) p.pause();
        if (r.type === 'visual') { p.muted = true; p.volume = 0; } else { 
            p.muted = false; 
            // ── Audio Fade In/Out gain ramp ──────────────────────────
            const timeInClip = this.currentTime - r.clip.start;
            const clipDur = r.clip.duration || 1;
            const fadeIn  = r.clip.properties?.fadeIn  || 0;
            const fadeOut = r.clip.properties?.fadeOut || 0;
            let gainMult = 1;
            if (fadeIn  > 0 && timeInClip < fadeIn)  gainMult = Math.min(1, timeInClip / fadeIn);
            if (fadeOut > 0 && timeInClip > clipDur - fadeOut) gainMult = Math.min(gainMult, Math.max(0, (clipDur - timeInClip) / fadeOut));
            p.volume = Math.max(0, Math.min(1, r.vol * gainMult));
            // ── Loop ─────────────────────────────────────────────────
            p.loop = r.clip.properties?.loop === true;
        }
    });
    avail.forEach(p => { 
        if(p.getAttribute('data-key')) { 
            p.removeAttribute('data-key'); 
            p.removeAttribute('data-type'); 
            p.pause(); 
            p.muted = true; 
            if (p.audioNodes) {
                p.audioNodes.low.gain.value = 0;
                p.audioNodes.mid.gain.value = 0;
                p.audioNodes.high.gain.value = 0;
            }
        } 
    });
};

window.EditorApp.prototype.seek = function(d) { 
    this.currentTime = Math.max(0, Math.min(this.currentTime + d, this.duration)); 
    if (this.isPlaying && this.playbackRate === 1) {
        this.playbackStartTime = this.audioCtx.currentTime - this.currentTime;
    }
    this.managePlayers(); 
    this.renderFrameToCanvas(); 
    this.updatePlayheadPosition(); 
    this.requestRedraw(); 
};

/**
 * seekToAbsolute(time) — the CORRECT way to seek while scrubbing.
 * 1. Auto-pauses playback.
 * 2. Moves all video elements to the target time.
 * 3. Waits for browser 'seeked' events before rendering (fixes lag/stale frame bug).
 * 4. Resumes playback only if caller requests it.
 */
window.EditorApp.prototype.seekToAbsolute = function(time, { resume = false } = {}) {
    const wasPlaying = this.isPlaying;
    if (wasPlaying) this.pausePlayback();

    this.currentTime = Math.max(0, Math.min(time, this.duration));
    if (wasPlaying && this.playbackRate === 1) {
        this.playbackStartTime = this.audioCtx.currentTime - this.currentTime;
    }
    this.managePlayers();
    this.updatePlayheadPosition();

    // Wait for all active video players to finish seeking
    const activePlayers = this.players.filter(p => p && p.getAttribute('data-key') && p.readyState >= 1);
    if (activePlayers.length === 0) {
        this.renderFrameToCanvas();
        this.requestRedraw();
        if (resume && wasPlaying) this.startPlayback();
        return;
    }

    let done = false;
    let seekedCount = 0;
    const total = activePlayers.length;

    const finish = () => {
        if (done) return;
        done = true;
        this.renderFrameToCanvas();
        this.requestRedraw();
        if (resume && wasPlaying) this.startPlayback();
    };

    const onSeeked = () => {
        seekedCount++;
        if (seekedCount >= total) finish();
    };

    activePlayers.forEach(p => p.addEventListener('seeked', onSeeked, { once: true }));
    // Fallback: render anyway after 400ms even if seeked never fires
    setTimeout(finish, 400);
};

window.EditorApp.prototype.syncOverlays = function() { this.managePlayers(); this.renderFrameToCanvas(); this.requestRedraw(); }; 

window.EditorApp.prototype.updatePlayheadPosition = function() {
    // FIX #1: update DOM playhead position
    if (this.playhead) {
        // ✅ Use this.headerWidth (kept in sync by store.setHeaderWidth) instead of
        // the hardcoded TRACK_HEADER_WIDTH_PREVIEW so the playhead stays accurate
        // after the user resizes the track header panel.
        const headerW = this.headerWidth || 140;
        const pos = (this.currentTime * this.pixelsPerSecond) + headerW;
        this.playhead.style.left = `${pos}px`;
        const ti = document.getElementById('time-display');
        if (ti && document.activeElement !== ti) ti.value = this.framesToTimecode(this.currentTime);
        if (this.isPlaying && !this.isScrubbing && this.timelineScrollArea) {
            const vw = this.timelineScrollArea.clientWidth;
            const sl = this.timelineScrollArea.scrollLeft;
            if (pos > sl + vw - 50) this.timelineScrollArea.scrollLeft = pos - headerW - 100;
        }
    }
    // FIX #1: also sync Zustand so React Playhead component re-renders
    if (window.useEditorStore) {
        window.useEditorStore.setState({ currentTime: this.currentTime });
    }
};

window.EditorApp.prototype.setupPlayheadScrubbing = function() {
    if (!this.playhead) return;
    
    if (this.timelineContent) {
        this.timelineContent.addEventListener('mousedown', (e) => {
            if (e.button !== 0 || !e.target.closest('.time-ruler') || e.target.closest('.playhead-marker')) return;

            const scrollAreaRect = this.timelineScrollArea.getBoundingClientRect();
            const clickXInViewport = e.clientX - scrollAreaRect.left;
            const absoluteX = clickXInViewport + this.timelineScrollArea.scrollLeft;
            const timeX = absoluteX - (this.headerWidth || 140);

            if (timeX >= 0) {
                const targetTime = timeX / this.pixelsPerSecond;
                // ── FIX: pause → seek → wait seeked → render ──
                this.seekToAbsolute(targetTime, { resume: false });
            }
        });
    }

    this.playhead.onmousedown = (e) => {
        e.preventDefault(); e.stopPropagation();
        this.isScrubbing = true;
        document.body.style.cursor = 'grabbing';

        const wp = this.isPlaying;
        if (wp) this.pausePlayback();

        // ✅ P3: Replace setTimeout debounce with RAF throttle for perfectly smooth 60fps scrubbing
        let _scrubRafId = null;
        let _lastScrubTime = 0;
        
        const onMove = (ev) => {
            const x = (ev.clientX - this.timelineContent.getBoundingClientRect().left)
                      + this.timelineScrollArea.scrollLeft
                      - (this.headerWidth || 140);
            const t = Math.max(0, Math.min(x / this.pixelsPerSecond, this.duration));
            this.currentTime = t;
            this.updatePlayheadPosition();
            
            if (_scrubRafId !== null) return;
            
            _scrubRafId = requestAnimationFrame((now) => {
                _scrubRafId = null;
                // Limit heavy DOM/WebGL updates to ~30-60fps while scrubbing
                if (now - _lastScrubTime > 16) {
                    this.managePlayers();
                    this.renderFrameToCanvas();
                    this.requestRedraw();
                    _lastScrubTime = now;
                }
            });
        };

        const onUp = () => {
            if (_scrubRafId !== null) cancelAnimationFrame(_scrubRafId);
            this.isScrubbing = false;
            document.body.style.cursor = 'default';
            document.removeEventListener('mousemove', onMove);
            document.removeEventListener('mouseup', onUp);
            // Final accurate seek-and-render on mouse release
            this.seekToAbsolute(this.currentTime, { resume: wp });
        };

        document.addEventListener('mousemove', onMove);
        document.addEventListener('mouseup', onUp);
    };
};
