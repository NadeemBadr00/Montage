// @ts-nocheck
import { Track } from '../../models/Track';
import { Clip } from '../../models/Clip';
import { useEditorStore } from '../../../store/useEditorStore';

export const injectEngineClips = () => {
    window.EditorApp.prototype.performRazorSplit = function() {
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
        const track = this.tracks.find((t: any) => t.id === Number(clip.trackId) || String(t.id) === clip.trackId);
        
        if (track) this.performSplit(clip, track, { clientX: 0, simulated: true });
    };

    window.EditorApp.prototype.performSplit = function(clip: Clip, track: Track, e: any) {

        this.saveState(); 
        
        let splitTime;
        if (e.simulated) {
            splitTime = this.currentTime;
        } else {
            if (!this.timelineContent) return;
            const rect = this.timelineContent.getBoundingClientRect();
            const currentHeaderWidth = this.headerWidth || 140;
            const timelineX = (e.clientX - rect.left) - currentHeaderWidth; 
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
        const newClip = new (window as any).Clip(`c_split_${Date.now()}`, "Pending...", splitTime, remainingDuration, clip.type, clip.src);
        newClip.sourceIn = newSourceIn; 
        
        this.deepCopyClipData(clip, newClip); 
        
        track.addClip(newClip); 
        this.selectedClipIds.clear();
        this.selectedClipIds.add(newClip.id);
        
        this.refreshProjectTopology();

        this.log(`✂️ Cut at ${this.formatTime(splitTime)}`);
        if(this.renderTracks) this.renderTracks();
        if(this.syncOverlays) this.syncOverlays(); 
        if(this.updateEffectControls) this.updateEffectControls();
        this.requestRedraw();
        this.commitStateToReact();
    };

    window.EditorApp.prototype.deepCopyClipData = function(source: any, target: any) {
        if (source.properties) target.properties = JSON.parse(JSON.stringify(source.properties));
        if (source.aiSegmentation) target.aiSegmentation = JSON.parse(JSON.stringify(source.aiSegmentation));
        if (source.mask) target.mask = JSON.parse(JSON.stringify(source.mask));
        target.blendMode = source.blendMode;
        if (source.textStyle) target.textStyle = JSON.parse(JSON.stringify(source.textStyle));
        if (source.effects) target.effects = JSON.parse(JSON.stringify(source.effects));
        if (source.transitions) target.transitions = JSON.parse(JSON.stringify(source.transitions));
        if (source.keyframes) target.keyframes = JSON.parse(JSON.stringify(source.keyframes));

        if (source.sandwich) {
            target.sandwich = {};
            const getVal = (prop: string, rawProp: string) => {
                if (source.sandwich._isSmart && source.sandwich[rawProp] !== undefined) {
                    return source.sandwich[rawProp];
                }
                return source.sandwich[prop];
            };
            target.sandwich.scale = getVal('scale', '_rawScale');
            target.sandwich.offsetX = getVal('offsetX', '_rawOffsetX');
            target.sandwich.offsetY = getVal('offsetY', '_rawOffsetY');
        }
    };

    window.EditorApp.prototype.addTextClip = function(trackId?: number, time?: number) {
        this.addTextAtCanvasPosition(0, 0, trackId, time);
    };

    window.EditorApp.prototype.addTextAtCanvasPosition = function(x: number, y: number, trackId?: number, time?: number) {
        this.saveState();
        
        const start = time !== undefined ? time : Math.max(0, this.currentTime);
        const duration = 5;
        const id = `text_${Date.now()}`;
        const newClip = new (window as any).Clip(id, "New Text", start, duration, 'text', "Double Click to Edit");
        
        // Position at mouse
        newClip.properties.positionX = x;
        newClip.properties.positionY = y;
        
        let targetTrack = trackId ? this.tracks.find((t: any) => t.id === trackId) : null;
        
        // Find an empty track if not specified
        if (!targetTrack) {
            // Sort tracks by ID (smallest to largest)
            const sortedTracks = [...this.tracks]
                .filter(t => t.type !== 'audio' && t.type !== 'subtitle')
                .sort((a, b) => a.id - b.id);
                
            for (const track of sortedTracks) {
                const hasCollision = track.clips.some((c: any) => 
                    (start >= c.start && start < c.start + c.duration) || 
                    (start + duration > c.start && start + duration <= c.start + c.duration) ||
                    (start <= c.start && start + duration >= c.start + c.duration)
                );
                
                if (!hasCollision) {
                    targetTrack = track;
                    break;
                }
            }
        }
        
        // If all existing tracks are full at this time, create a new one
        if (!targetTrack) {
            this.addNewTrack('overlay');
            // The new track is the last one in the array
            targetTrack = this.tracks[this.tracks.length - 1];
        }

        if (targetTrack) {
            targetTrack.addClip(newClip);
            if ((this as any).resolveCollisions) (this as any).resolveCollisions(targetTrack.id, newClip);
            this.refreshProjectTopology();
            this.log(`📝 Text Added to ${targetTrack.name}`);
            
            // Auto-select the newly created clip
            this.selectClip(newClip.id);
            
            if (this.renderTracks) this.renderTracks();
            if (this.syncOverlays) this.syncOverlays();
            if (this.updateEffectControls) this.updateEffectControls();
            this.requestRedraw(); 
            this.commitStateToReact();
            
            // Open editor immediately
            if (this.openOnCanvasTextEditor) {
                this.openOnCanvasTextEditor(newClip);
            }
        }
    };

    window.EditorApp.prototype.addSolidClip = function(trackId?: number, time?: number, color: string = '#000000') {
        this.saveState();
        let targetTrack = trackId ? this.tracks.find((t: any) => t.id === trackId) : null;
        if (!targetTrack) targetTrack = this.tracks.find((t: any) => t.type === 'video' || t.type === 'main' || t.type === 'overlay');
        if (!targetTrack) { this.addNewTrack('video'); targetTrack = this.tracks.find((t: any) => t.type !== 'audio'); }

        const start = time !== undefined ? time : Math.max(0, this.currentTime);
        const duration = 5;
        const id = `solid_${Date.now()}`;
        
        // Use an SVG Data URI to act as an infinite resolution solid color image
        const svgUri = `data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100%25' height='100%25'%3E%3Crect width='100%25' height='100%25' fill='${encodeURIComponent(color)}'/%3E%3C/svg%3E`;
        
        const newClip = new (window as any).Clip(id, "Black Matte", start, duration, 'image', svgUri);
        
        if (targetTrack) {
            targetTrack.addClip(newClip);
            if ((this as any).resolveCollisions) (this as any).resolveCollisions(targetTrack.id, newClip);
            this.refreshProjectTopology();
            this.log(`⬛ Solid Color Added to ${targetTrack.name}`);
            if (this.renderTracks) this.renderTracks();
            if (this.syncOverlays) this.syncOverlays();
            this.requestRedraw(); 
            this.commitStateToReact();
        }
    };

    window.EditorApp.prototype.updateClipSpeedAndDuration = function(clipId: string, newSpeed: number, newDuration: number) {
        this.saveState();
        let targetClip: any = null;
        let targetTrack: any = null;
        
        for (const t of this.tracks) {
            const c = t.clips.find((c: any) => c.id === clipId);
            if (c) {
                targetClip = c;
                targetTrack = t;
                break;
            }
        }
        
        if (!targetClip || !targetTrack) return;
        
        // Update webgl playback speed
        if (!targetClip.properties) targetClip.properties = {};
        targetClip.properties.playbackSpeed = newSpeed;
        
        // Update timeline duration
        targetClip.duration = newDuration;
        
        // Resolve collisions (pushing clips to the right if duration increased and magnetic mode is on)
        if ((this as any).resolveCollisions) {
            (this as any).resolveCollisions(targetTrack.id, targetClip);
        }
        
        targetTrack.rebuildTree();
        this.refreshProjectTopology();
        
        if (this.renderTracks) this.renderTracks();
        if (this.syncOverlays) this.syncOverlays();
        this.requestRedraw(); 
        this.commitStateToReact();
    };

    window.EditorApp.prototype.rippleDelete = function() {
        if (this.selectedClipIds.size === 0) return;
        this.saveState();
        const idsToDelete = Array.from(this.selectedClipIds);
        let deletedCount = 0;
        const trackDeletions: any = {}; 
        this.tracks.forEach((track: any) => {
            track.clips.forEach((clip: any) => {
                if (idsToDelete.includes(clip.id)) {
                    if (!trackDeletions[track.id]) trackDeletions[track.id] = [];
                    trackDeletions[track.id].push(clip);
                }
            });
        });
        Object.keys(trackDeletions).forEach(trackId => {
            const track = this.tracks.find((t: any) => String(t.id) === trackId);
            if (!track) return;
            const clipsToDelete = trackDeletions[trackId];
            clipsToDelete.sort((a: any, b: any) => b.start - a.start);
            clipsToDelete.forEach((clip: any) => {
                const gapStart = clip.start;
                const gapDuration = clip.duration;
                track.removeClip(clip.id); 
                deletedCount++;
                track.clips.forEach((c: any) => { if (c.start > gapStart) c.start -= gapDuration; });
                track.rebuildTree(); 
            });
        });
        if (deletedCount > 0) {
            this.refreshProjectTopology();
            this.log(`🗑️ Ripple Deleted ${deletedCount} Clips`);
            this.selectedClipIds.clear();
            if (this.renderTracks) this.renderTracks();
            if (this.syncOverlays) this.syncOverlays();
            if (this.updateEffectControls) this.updateEffectControls();
            this.requestRedraw();
            this.commitStateToReact();
        }
    };

    window.EditorApp.prototype.selectClip = function(clipId: string | null, isMultiSelect = false, forceSelect = false) {
        if (!clipId) {
            this.deselectAll();
            return;
        }
        
        const clip = this.findClipById(clipId);
        const groupIdsToSelect = clip?.groupId ? [clipId, ...this.tracks.flatMap((t: any) => t.clips.filter((c: any) => c.groupId === clip.groupId).map((c: any) => c.id))] : [clipId];

        if (isMultiSelect) {
            const isSelected = this.selectedClipIds.has(clipId);
            groupIdsToSelect.forEach((id: string) => {
                if (isSelected && !forceSelect) this.selectedClipIds.delete(id);
                else this.selectedClipIds.add(id);
            });
        } else {
            if (!this.selectedClipIds.has(clipId) || this.selectedClipIds.size === 1) {
                this.selectedClipIds.clear();
                groupIdsToSelect.forEach((id: string) => this.selectedClipIds.add(id));
            }
        }
        
        if (this.renderTracks) this.renderTracks();
        if(this.updateEffectControls) this.updateEffectControls();
        this.requestRedraw();
        this.log(`🎯 Selected ${this.selectedClipIds.size} clips. GroupIdsToSelect: ${groupIdsToSelect.length}`);
        useEditorStore.setState({ selectedClipIds: new Set(this.selectedClipIds) });
    };

    window.EditorApp.prototype.deselectAll = function() {
        if (this.selectedClipIds.size > 0) {
            this.selectedClipIds.clear();
            if (this.renderTracks) this.renderTracks();
            if(this.updateEffectControls) this.updateEffectControls();
            this.requestRedraw();
        }
    };

    window.EditorApp.prototype.groupSelectedClips = function() {
        if (this.selectedClipIds.size >= 1) {
            const groupId = `group_${Date.now()}`;
            const idsToGroup = Array.from(this.selectedClipIds);
            
            // Smart Grouping: If only 1 clip is selected, auto-find its audio/video pair!
            if (this.selectedClipIds.size === 1) {
                const clipId = idsToGroup[0];
                const selectedClip = this.findClipById(clipId);
                if (selectedClip) {
                    const allClips = this.tracks.flatMap((t: any) => t.clips);
                    const pair = allClips.find((c: any) => 
                        c.id !== clipId && 
                        c.type !== selectedClip.type && 
                        Math.abs(c.start - selectedClip.start) < 0.1 && 
                        Math.abs((c.duration || 0) - (selectedClip.duration || 0)) < 0.1
                    );
                    if (pair) {
                        idsToGroup.push(pair.id);
                        this.selectedClipIds.add(pair.id); // Also select it!
                    }
                }
            }

            if (idsToGroup.length > 1) {
                this.tracks.forEach((track: any) => {
                    track.clips.forEach((clip: any) => {
                        if (idsToGroup.includes(clip.id)) {
                            clip.groupId = groupId;
                        }
                    });
                });
                this.log(`🔗 Smart Grouped ${idsToGroup.length} clips with ID: ${groupId}`);
                this.commitStateToReact();
                this.requestRedraw();
                this.saveState(); // Save AFTER mutation
            } else {
                this.log(`⚠️ Cannot group: no matching pair found for this clip`);
            }
        }
    };

    window.EditorApp.prototype.ungroupSelectedClips = function(keepSelectedId?: string) {
        if (this.selectedClipIds.size > 0) {
            const ids = Array.from(this.selectedClipIds);
            this.tracks.forEach((track: any) => {
                track.clips.forEach((clip: any) => {
                    if (ids.includes(clip.id)) {
                        delete clip.groupId;
                    }
                });
            });
            this.log(`🔗 Ungrouped clips!`);
            this.commitStateToReact();
            this.deselectAll();
            if (keepSelectedId) {
                this.selectClip(keepSelectedId);
            } else {
                this.requestRedraw();
            }
            this.saveState(); // Save AFTER mutation
        }
    };

    window.EditorApp.prototype.deleteSelectedClip = function() {
        this.deleteSelectedClips();
    };

    window.EditorApp.prototype.deleteSelectedClips = function() {
        if (this.selectedClipIds.size === 0) return;
        const idsToDelete = Array.from(this.selectedClipIds);
        let deletedCount = 0;
        this.tracks.forEach((track: any) => {
            for (let i = track.clips.length - 1; i >= 0; i--) {
                if (idsToDelete.includes(track.clips[i].id)) {
                    track.removeClip(track.clips[i].id);
                    deletedCount++;
                }
            }
            if (track.transitions) {
                const initLen = track.transitions.length;
                track.transitions = track.transitions.filter(t => !idsToDelete.includes(t.id));
                deletedCount += (initLen - track.transitions.length);
            }
            this.cleanupOrphanedTransitions(track.id);
        });
        if (deletedCount > 0) {
            this.refreshProjectTopology();
            this.log(`🗑️ Deleted ${deletedCount} Clips`);
            this.selectedClipIds.clear();
            if (this.renderTracks) this.renderTracks();
            if (this.syncOverlays) this.syncOverlays();
            if(this.updateEffectControls) this.updateEffectControls();
            this.requestRedraw();
            this.commitStateToReact();
        }
    };

    window.EditorApp.prototype.findClipById = function(clipId: string): Clip | null {
        for (const track of this.tracks) {
            const clip = track.clips.find((c: any) => c.id === clipId);
            if (clip) return clip;
        }
        return null;
    };

    window.EditorApp.prototype.duplicateSelectedClip = function() {
        if (this.selectedClipIds.size === 0) return;
        this.saveState();
        const idsToDuplicate = Array.from(this.selectedClipIds);
        let duplicatedCount = 0;
        
        idsToDuplicate.forEach(clipId => {
            const clip = this.findClipById(clipId);
            if (!clip) return;
            const track = this.tracks.find((t: any) => t.id === Number(clip.trackId) || String(t.id) === clip.trackId);
            if (!track) return;
            
            const newClip = new (window as any).Clip(`c_dup_${Date.now()}_${Math.random().toString(36).substring(2,7)}`, clip.name + " (Copy)", clip.start + clip.duration, clip.duration, clip.type, clip.src);
            newClip.sourceIn = clip.sourceIn;
            this.deepCopyClipData(clip, newClip);
            
            track.addClip(newClip);
            if (this.resolveCollisions) this.resolveCollisions(track.id, newClip);
            duplicatedCount++;
        });

        if (duplicatedCount > 0) {
            this.refreshProjectTopology();
            this.log(`📑 Duplicated ${duplicatedCount} Clips`);
            if (this.renderTracks) this.renderTracks();
            if (this.syncOverlays) this.syncOverlays();
            this.requestRedraw();
            this.commitStateToReact();
        }
    };



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
