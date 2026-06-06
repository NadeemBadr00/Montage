// @ts-nocheck
// clip-transitions.ts — addTransition, addSmartTransition, deleteTransition, selectTransition, findTransitionById, resolveCollisions, cleanupOrphanedTransitions
import { Track } from '../../models/Track';
import { Clip } from '../../models/Clip';
import { useEditorStore } from '../../../store/useEditorStore';

export const injectEngineTransitions = () => {

window.EditorApp.prototype.addTransition = function(trackId, dropTime, transitionType) {
    this.saveState(); // ✅ Ctrl+Z removes the added transition
    const track = this.tracks.find(t => String(t.id) === String(trackId));
    if (!track) return;
    
    // Find the closest cut point to dropTime
    const snapThreshold = 1.0; // 1 second snap radius
    let closestCut = null;
    let minDiff = snapThreshold;
    
    track.clips.forEach(clip => {
        const diffStart = Math.abs(clip.start - dropTime);
        const diffEnd = Math.abs(clip.end - dropTime);
        
        if (diffStart < minDiff && clip.start > 0) {
            minDiff = diffStart;
            closestCut = clip.start;
        }
        if (diffEnd < minDiff) {
            minDiff = diffEnd;
            closestCut = clip.end;
        }
    });
    
    if (closestCut !== null) {
        const newTrans = {
            id: 'trans_' + Date.now(),
            type: transitionType,
            cutTime: closestCut,
            inOffset: 0.5,
            outOffset: 0.5,
            alignment: 'center'
        };
        if (!track.transitions) track.transitions = [];
        
        // Remove existing transition at this cut point if any
        track.transitions = track.transitions.filter(t => Math.abs(t.cutTime - closestCut) > 0.01);
        
        track.transitions.push(newTrans);
        this.log(`Added ${transitionType} Transition`);
        
        if (this.renderTracks) this.renderTracks();
        this.requestRedraw();
        this.commitStateToReact();
        
        // Auto-select the new transition so Effect Controls opens for it immediately
        if (this.selectTransition) this.selectTransition(newTrans.id);
    }
};

window.EditorApp.prototype.addSmartTransition = function(trackId, time, edge) {
    // edge: 'start' | 'end' | undefined — tells us WHICH handle the user tapped
    this.saveState();
    const track = this.tracks.find(t => String(t.id) === String(trackId));
    if (!track) return;

    let isStartOfClip = false;
    let isEndOfClip   = false;

    // Use start + duration instead of clip.end getter (may be undefined on plain objects)
    track.clips.forEach(clip => {
        const clipEnd = clip.start + clip.duration;
        if (Math.abs(clip.start - time) < 0.15) isStartOfClip = true;
        if (Math.abs(clipEnd   - time) < 0.15) isEndOfClip   = true;
    });

    let transType = 'cross_dissolve';
    let alignment = 'center';
    let inOff  = 0.5;
    let outOff = 0.5;

    if (isStartOfClip && isEndOfClip) {
        // Cut point between two clips → Cross Dissolve centered on the cut
        transType = 'cross_dissolve';
        alignment = 'center';
        inOff  = 0.5;
        outOff = 0.5;
    } else if (isEndOfClip || edge === 'end') {
        // End handle tapped (or only end of clip) → Fade Out, stays inside this clip
        transType = 'fade';
        alignment = 'end';
        inOff  = 1.0;
        outOff = 0;
    } else if (isStartOfClip || edge === 'start') {
        // Start handle tapped (or only start of clip) → Fade In, stays inside this clip
        transType = 'fade';
        alignment = 'start';
        inOff  = 0;
        outOff = 1.0;
    }

    const newTrans = {
        id: 'trans_' + Date.now(),
        type: transType,
        cutTime: time,
        inOffset: inOff,
        outOffset: outOff,
        alignment: alignment
    };

    if (!track.transitions) track.transitions = [];
    track.transitions = track.transitions.filter(t => Math.abs(t.cutTime - time) > 0.01);
    track.transitions.push(newTrans);

    this.log(`Added Smart ${transType} Transition (${alignment}) at ${time.toFixed(2)}s`);

    if (this.renderTracks) this.renderTracks();
    this.requestRedraw();
    this.commitStateToReact();

    if (this.selectTransition) this.selectTransition(newTrans.id);
};

window.EditorApp.prototype.deleteTransition = function(transId, trackId) {
    this.saveState(); // ✅ Ctrl+Z restores the deleted transition
    // Use loose match (String vs Number) so React's string trackId finds the engine's number track.id
    const track = this.tracks.find(t => String(t.id) === String(trackId));
    if (!track || !track.transitions) return;
    
    track.transitions = track.transitions.filter(t => t.id !== transId);
    
    // Remove from selection and sync React/Zustand
    this.selectedClipIds.delete(transId);
    useEditorStore.setState({ selectedClipIds: new Set(this.selectedClipIds) });
    
    if (this.renderTracks) this.renderTracks();
    if (this.updateEffectControls) this.updateEffectControls();
    this.requestRedraw();
    this.commitStateToReact();
};

window.EditorApp.prototype.selectTransition = function(transId) {
    this.selectedClipIds.clear();
    this.selectedClipIds.add(transId);
    if (this.renderTracks) this.renderTracks();
    if (this.updateEffectControls) this.updateEffectControls();
    // Sync with React/Zustand so TransitionItem isSelected state updates
    useEditorStore.setState({ selectedClipIds: new Set(this.selectedClipIds) });
};

window.EditorApp.prototype.findTransitionById = function(id) {
    if (!this.tracks) return null;
    for (let t of this.tracks) {
        if (t.transitions) {
            for (let trans of t.transitions) {
                if (trans.id === id) return { trans, track: t };
            }
        }
    }
    return null;
};

window.EditorApp.prototype.resolveCollisions = function(trackId, activeClip) {
    const track = this.tracks.find(t => t.id === trackId);
    if (!track) return;

    let modified = false;
    
    for (let i = track.clips.length - 1; i >= 0; i--) {
        const c = track.clips[i];
        if (c.id === activeClip.id) continue;

        const cStart = c.start;
        const cEnd = c.start + c.duration;
        const aStart = activeClip.start;
        const aEnd = activeClip.start + activeClip.duration;

        // Condition 1: c is completely swallowed by activeClip
        if (cStart >= aStart && cEnd <= aEnd) {
            track.clips.splice(i, 1);
            modified = true;
        }
        // Condition 2: c is split in two by activeClip!
        else if (cStart < aStart && cEnd > aEnd) {
            const newDuration1 = aStart - cStart;

            // ✅ Use a proper Clip instance (not JSON clone) so clip.end getter,
            // getSnapPoint, and applyClipTransforms out-transitions all work correctly
            const c2 = new (window as any).Clip(
                'split_' + Date.now() + Math.floor(Math.random() * 1000),
                c.name,
                aEnd,
                cEnd - aEnd,
                c.type,
                c.src
            );
            c2.sourceIn = (c.sourceIn || 0) + (aEnd - cStart);
            c2.trackId = c.trackId;
            this.deepCopyClipData(c, c2);

            c.duration = newDuration1;
            track.clips.push(c2);
            modified = true;
        }
        // Condition 3: activeClip overlaps the END of c
        else if (cStart < aStart && cEnd > aStart) {
            c.duration = aStart - cStart;
            modified = true;
        }
        // Condition 4: activeClip overlaps the START of c
        else if (cStart < aEnd && cEnd > aEnd) {
            const overlap = aEnd - cStart;
            c.start = aEnd;
            c.duration = cEnd - aEnd;
            c.sourceIn = (c.sourceIn || 0) + overlap;
            modified = true;
        }
    }
    
    if (modified) {
        track.rebuildTree();
    }
    this.cleanupOrphanedTransitions(trackId);
};

window.EditorApp.prototype.cleanupOrphanedTransitions = function(trackId) {
    const track = this.tracks.find(t => String(t.id) === String(trackId));
    if (!track || !track.transitions) return;
    
    const initialLen = track.transitions.length;
    track.transitions = track.transitions.filter(t => {
        // A transition is valid if it touches the start OR end of ANY clip on the track
        return track.clips.some(c => {
            const cEnd = c.start + c.duration;
            return Math.abs(c.start - t.cutTime) < 0.1 || Math.abs(cEnd - t.cutTime) < 0.1;
        });
    });
    
    if (track.transitions.length !== initialLen) {
        this.requestRedraw();
        // ✅ Sync Zustand so React removes orphaned transitions from the UI
        this.commitStateToReact();
    }
};

};
