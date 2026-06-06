// @ts-nocheck
// preview-playback.ts — togglePlay, startPlayback, pausePlayback, playbackLoop, handleJKL, keyboard shortcuts
window.EditorApp.prototype.togglePlay = function() { 
    if (this.audioCtx.state === 'suspended') this.audioCtx.resume();
    if (this.playbackRate !== 0) {
        this.pausePlayback();
    } else {
        // If at the end → restart from the beginning
        if (this.currentTime >= this.duration - 0.05) {
            this.currentTime = 0;
        }
        this.startPlayback();
    }
};

window.EditorApp.prototype.startPlayback = function() {
    // If already at the end → restart from beginning
    if (this.currentTime >= this.duration - 0.05) {
        this.currentTime = 0;
    }
    this.playbackRate = 1; 
    this.isPlaying = true;
    // FIX #5: notify Zustand immediately so React play button updates without polling
    if (window.useEditorStore) window.useEditorStore.setState({ isPlaying: true });
    
    // 🔥 FIX: Bless all HTML5 video elements during this trusted user gesture!
    // This allows them to be played unmuted later inside requestAnimationFrame by managePlayers.
    if (!this._playersBlessed) {
        this.players.forEach(p => {
            const isPlaying = !p.paused;
            const prom = p.play();
            if (prom !== undefined) {
                prom.catch(()=>{});
            }
            if (!isPlaying) p.pause(); // Restore paused state if it wasn't supposed to play yet
        });
        this._playersBlessed = true;
    }
    
    // Stop Lookahead when playing to save resources
    if(this.stopPredictiveCaching) this.stopPredictiveCaching();

    this.lastTick = performance.now();
    this.lastTimePerf = performance.now();
    this.playbackStartTime = this.audioCtx.currentTime - this.currentTime;
    // Mark if we started while suspended so we can re-sync when it wakes up
    this._startedSuspended = (this.audioCtx.state === 'suspended');

    this.updatePlayStateUI();
    this.players.forEach(p => { 
        if(p.getAttribute('data-key') && p.paused) p.play().catch(()=>{}); 
        p.playbackRate = 1; 
    });
    this.requestRedraw();
};

window.EditorApp.prototype.pausePlayback = function() {
    this.playbackRate = 0; 
    this.isPlaying = false;
    // FIX #5: notify Zustand immediately so React play button updates without polling
    if (window.useEditorStore) window.useEditorStore.setState({ isPlaying: false });
    this.players.forEach(p => p.pause()); 
    this.updatePlayStateUI();
    this.requestRedraw();

    // Trigger Predictive Lookahead on Idle (Background task)
    if(this.startPredictiveCaching) {
        setTimeout(() => {
            if(!this.isPlaying && !this.isScrubbing) this.startPredictiveCaching();
        }, 500);
    }
};

window.EditorApp.prototype.updatePlayStateUI = function() {
    const btn = document.getElementById('play-pause-btn'); if (!btn) return;
    btn.innerHTML = this.playbackRate === 0 ? '<i class="fa-solid fa-play ml-0.5 text-sm"></i>' : '<i class="fa-solid fa-pause text-sm"></i>';
};

window.EditorApp.prototype.handleJKL = function(key) {
    const overlay = document.getElementById('jkl-overlay'); let msg = "";
    if (key === 'k') { this.pausePlayback(); msg = "⏸️ Pause"; } 
    else if (key === 'l') {
        if (this.playbackRate < 0) this.playbackRate = 0; else if (this.playbackRate === 0) this.playbackRate = 1; else if (this.playbackRate < 8) this.playbackRate *= 2; 
        msg = `⏩ x${this.playbackRate}`;
    } else if (key === 'j') {
        if (this.playbackRate > 0) this.playbackRate = 0; else if (this.playbackRate === 0) this.playbackRate = -1; else if (this.playbackRate > -8) this.playbackRate *= 2; 
        msg = `⏪ x${Math.abs(this.playbackRate)}`;
    }
    this.isPlaying = (this.playbackRate !== 0); 
    if(this.isPlaying) {
        if(this.stopPredictiveCaching) this.stopPredictiveCaching();
        this.playbackStartTime = performance.now() / 1000 - this.currentTime;
    }
    this.updatePlayStateUI();
    this.players.forEach(p => { if (this.playbackRate > 0) p.playbackRate = this.playbackRate; });
    if(overlay) { overlay.innerText = msg; overlay.style.opacity = 1; clearTimeout(this.jklTimer); this.jklTimer = setTimeout(() => overlay.style.opacity = 0, 800); }
    this.requestRedraw();
};

window.EditorApp.prototype.bindKeyboardShortcuts = function() {
    document.addEventListener('keydown', (e) => {
        // Ignore if typing in input fields
        if(e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

        // FIX #2: Block ALL playback shortcuts when CMD center is focused
        if (window.app && window.app.isCmdFocused) return;

        // FIX #2 (secondary): Also block when there's text in the buffer
        if (window.app && window.app.commandBuffer && window.app.commandBuffer.length > 0) return;

        if (e.code === 'KeyJ') this.handleJKL('j');
        if (e.code === 'KeyK') this.handleJKL('k');
        if (e.code === 'KeyL') this.handleJKL('l');
        
        if (e.code === 'Space') { e.preventDefault(); this.togglePlay(); }

        // Undo / Redo
        if (e.ctrlKey || e.metaKey) {
            if (e.code === 'KeyZ') {
                e.preventDefault();
                if (e.shiftKey) this.redo();
                else this.undo();
            } else if (e.code === 'KeyY') {
                e.preventDefault();
                this.redo();
            }
        }
    });
};

window.EditorApp.prototype.playbackLoop = function(now) {
    if (this.isExporting) {
        requestAnimationFrame(this.playbackLoop);
        return;
    }

    if (!this.lastTick) this.lastTick = now;
    this.lastTick = now;

    if (this.isPlaying) {
        const dt = (now - (this.lastTimePerf || now)) / 1000;
        this.currentTime += dt * this.playbackRate;
        this.lastTimePerf = now;

        if (this.currentTime >= this.duration) { this.currentTime = this.duration; this.pausePlayback(); } 
        else if (this.currentTime <= 0) { this.currentTime = 0; this.pausePlayback(); }
        
        // Mark for redraw only when time changes
        this.needsRedraw = true;
    } else {
        this.lastTimePerf = now;
    }

    // OPTIMIZATION: Dirty Check Logic
    // If NOT playing and NOT marked for redraw, SKIP rendering entirely.
    // This saves GPU/CPU cycles when idle.
    if (this.needsRedraw) {
        this.managePlayers(); 
        this.renderFrameToCanvas(); 
        this.updatePlayheadPosition();
        this.needsRedraw = false;
    }

    requestAnimationFrame(this.playbackLoop);
};
