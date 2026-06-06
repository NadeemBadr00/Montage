// @ts-nocheck
// timeline_interaction.ts — Time/pixel math, drag-and-drop, trim, snap, zoom

const TICKS_PER_SECOND = 254016000; 
const VIRTUAL_BUFFER_PX = 500; 
const TRACK_HEADER_WIDTH = 140;

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
        if (!isMulti) this.selectClip(clip.id, false);
        else this.selectClip(clip.id, true);

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
            this.commitStateToReact(); // ✅ sync Zustand after every drag/trim/move
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
