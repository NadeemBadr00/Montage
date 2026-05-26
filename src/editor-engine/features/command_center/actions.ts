// @ts-nocheck
import { parseCommand } from '../../commands/command_parser';

export const injectCommandCenterActions = () => {
    window.EditorApp.prototype.executeCommand = function() {
        const cmdStr = this.commandBuffer;
        const parsed = parseCommand(cmdStr);
        
        if (!parsed) {
            this.log("❌ Unknown Command");
            setTimeout(() => this.clearCommand(), 1000);
            return;
        }

        this.log(`🚀 Executing: ${cmdStr}`);

        switch (parsed.type) {
            case 'UNDO':
                this.undo();
                break;
            case 'REDO':
                this.redo();
                break;
            // BUG #1 FIX: new toolbar-equivalent commands
            case 'DELETE_SELECTED':
                this.deleteSelectedClips();
                break;
            case 'RIPPLE_DELETE_SELECTED':
                this.rippleDelete();
                break;
            case 'DUPLICATE_SELECTED':
                this.duplicateSelectedClip();
                break;
            case 'ADD_TEXT':
                this.addTextClip();
                break;
            case 'ADD_TRACK':
                this.addNewTrack(parsed.trackType);
                break;
            case 'RANGE_DELETE':
                this.executeRangeDelete(parsed.startTime, parsed.endTime, parsed.trackName);
                break;
            case 'CLIP_INDEX_DELETE':
                this.executeClipIndexDelete(parsed.index, parsed.trackName);
                break;
            case 'TRACK_CLEAR':
                this.executeTrackClear(parsed.trackName);
                break;
            case 'UPLOAD':
                this.executeUploadCommand(parsed.startTime, parsed.finalDuration, parsed.trackName);
                break;
            case 'CUT':
                this.executeCutCommand(parsed.time, parsed.trackName);
                break;
            case 'MOVE':
                this.executeMoveCommand(parsed.paramsStr);
                break;
            case 'REMOVE_SILENCE':
                this.executeRemoveSilenceCommand(parsed.sourceTrack, parsed.exceptions);
                break;
            case 'PROPERTY_UPDATE':
                this.executePropertyCommand(parsed.trackName, parsed.index, parsed.property, parsed.val);
                break;
            case 'SIZE_UPDATE':
                this.executePropertyCommand(parsed.trackName, parsed.index, 'size', { width: parsed.w, height: parsed.h });
                break;
            default:
                this.log("❌ Unknown Command Type");
        }
        
        this.clearCommand();
    };

    // ─────────────────────────────────────────────────────────────
    // Helper: call after every mutation so React Timeline updates
    // ─────────────────────────────────────────────────────────────
    window.EditorApp.prototype._cmdFinalize = function() {
        if (this.refreshProjectTopology) this.refreshProjectTopology(); // re-numbers clips/tracks
        if (this.renderTracks) this.renderTracks();                     // marks canvas dirty
        if (this.syncOverlays) this.syncOverlays();                     // update canvas overlays
        this.requestRedraw();                                           // canvas redraw
        this.commitStateToReact();                                             // ← Zustand → React re-render
    };

    // ─────────────────────────────────────────────────────────────
    // PROPERTY UPDATE (scale, opacity, rotation, scaleX, scaleY, size)
    // ─────────────────────────────────────────────────────────────
    window.EditorApp.prototype.executePropertyCommand = function(trackName: string, clipIndex: number, property: string, value: any) {
        const track = this.tracks.find((t: any) => t.name === trackName);
        if (!track) { this.log(`❌ Track ${trackName} not found.`); return; }

        const sortedClips = [...track.clips].sort((a, b) => a.start - b.start);
        
        if (clipIndex < 1 || clipIndex > sortedClips.length) {
            this.log(`⚠️ Invalid Clip Index: ${clipIndex}. Track has ${sortedClips.length} clips.`);
            return;
        }

        const targetClip = sortedClips[clipIndex - 1]; 
        this.saveState();

        // VISUAL FEEDBACK
        if ((window as any).useEditorStore) {
            (window as any).useEditorStore.getState().setHighlightedClip(targetClip.id);
            setTimeout(() => {
                if ((window as any).useEditorStore.getState().highlightedClipId === targetClip.id) {
                    (window as any).useEditorStore.getState().setHighlightedClip(null);
                }
            }, 1000);
        }

        if (typeof (window as any).ensureProProperties === 'function') {
            (window as any).ensureProProperties(targetClip);
        } else {
            if (!targetClip.properties) targetClip.properties = { 
                scale: 100, positionX: 0, positionY: 0, rotation: 0, opacity: 100 
            };
        }

        if (property === 'scale') targetClip.properties.scale = value;
        else if (property === 'scaleX') targetClip.properties.scaleX = value;
        else if (property === 'scaleY') targetClip.properties.scaleY = value;
        else if (property === 'opacity') targetClip.properties.opacity = Math.max(0, Math.min(100, value));
        else if (property === 'rotation') targetClip.properties.rotation = value;
        else if (property === 'size') {
            targetClip.properties.forcedWidth = value.width;
            targetClip.properties.forcedHeight = value.height;
            targetClip.properties.scale = 100;
            targetClip.properties.scaleX = 100;
            targetClip.properties.scaleY = 100;
            this.log(`✨ Squeezed ${targetClip.name} to ${value.width}x${value.height}px`);
            this._cmdFinalize();
            return;
        }

        this.log(`✨ Set ${property} to ${value} on ${targetClip.name}`);
        this._cmdFinalize();

        // BUG #2 FIX: always refresh EffectControls regardless of selection.
        // CMD targets clips by index, not by selection — the panel should always reflect the change.
        if (typeof this.updateEffectControls === 'function') {
            this.updateEffectControls();
        }
    };

    // ─────────────────────────────────────────────────────────────
    // TRACK CLEAR  (dv1 → clears all clips on track V1)
    // FIX: added rebuildTree() + _cmdFinalize()
    // ─────────────────────────────────────────────────────────────
    window.EditorApp.prototype.executeTrackClear = function(trackName: string) {
        const track = this.tracks.find((t: any) => t.name === trackName);
        if (!track) { this.log(`❌ Track ${trackName} not found.`); return; }

        if (track.clips.length === 0) {
            this.log(`⚠️ Track ${trackName} is already empty.`);
            return;
        }

        this.saveState();
        const count = track.clips.length;
        track.clips = [];
        track.rebuildTree(); // FIX #5: keep IntervalTree in sync

        this.log(`🗑️ Cleared ${count} clips from ${trackName}`);
        this._cmdFinalize(); // FIX #1: sync Zustand + topology
    };

    // ─────────────────────────────────────────────────────────────
    // RANGE DELETE  (d10s:20sv1)
    // FIX: added _cmdFinalize()
    // ─────────────────────────────────────────────────────────────
    window.EditorApp.prototype.executeRangeDelete = function(startTime: number, endTime: number, trackName: string) {
        const track = this.tracks.find((t: any) => t.name === trackName);
        if (!track) { this.log(`❌ Track ${trackName} not found.`); return; }

        this.saveState(); 

        const originalTime = this.currentTime;

        // Split at end first, then at start (order matters)
        this.currentTime = endTime;
        let clipsAtEnd = track.getClipsAtTime(endTime);
        if (clipsAtEnd.length > 0) {
            this.performSplit(clipsAtEnd[0], track, { simulated: true });
        }

        this.currentTime = startTime;
        let clipsAtStart = track.getClipsAtTime(startTime);
        if (clipsAtStart.length > 0) {
            this.performSplit(clipsAtStart[0], track, { simulated: true });
        }

        this.currentTime = originalTime; // restore playhead

        const initialCount = track.clips.length;
        track.clips = track.clips.filter((c: any) => {
            const midPoint = c.start + (c.duration / 2);
            const shouldDelete = midPoint >= startTime && midPoint < endTime;
            return !shouldDelete;
        });
        
        const deletedCount = initialCount - track.clips.length;
        track.rebuildTree(); // FIX: keep IntervalTree in sync

        if (deletedCount === 0) {
            this.log(`⚠️ No clips found between ${this.formatTime(startTime)} and ${this.formatTime(endTime)}`);
            return;
        }
        
        this.log(`🗑️ Deleted ${deletedCount} segments from ${this.formatTime(startTime)} to ${this.formatTime(endTime)}`);
        this._cmdFinalize(); // FIX #1 + #4
    };

    // ─────────────────────────────────────────────────────────────
    // CLIP INDEX DELETE  (d2v1 → delete clip #2 on V1)
    // FIX: added _cmdFinalize()
    // ─────────────────────────────────────────────────────────────
    window.EditorApp.prototype.executeClipIndexDelete = function(index: number, trackName: string) {
        const track = this.tracks.find((t: any) => t.name === trackName);
        if (!track) { this.log(`❌ Track ${trackName} not found.`); return; }

        const sortedClips = [...track.clips].sort((a, b) => a.start - b.start);
        
        if (index < 1 || index > sortedClips.length) {
            this.log(`⚠️ Invalid Clip Index: ${index}. Track has ${sortedClips.length} clips.`);
            return;
        }

        const clipToDelete = sortedClips[index - 1]; 
        this.saveState();
        
        track.clips = track.clips.filter((c: any) => c.id !== clipToDelete.id);
        track.rebuildTree(); // FIX: keep IntervalTree in sync
        
        this.log(`🗑️ Deleted Clip #${index} from ${trackName}`);
        this._cmdFinalize(); // FIX #1 + #4
    };

    // ─────────────────────────────────────────────────────────────
    // UPLOAD  (u10sv1, u10s:20sv1)
    // FIX: added _cmdFinalize() after inserting clip
    // ─────────────────────────────────────────────────────────────
    window.EditorApp.prototype.executeUploadCommand = function(startTime: number, customDuration: number | null, trackName: string) {
        const track = this.tracks.find((t: any) => t.name === trackName);
        if (!track) {
            this.log(`❌ Track ${trackName} not found.`);
            return;
        }

        this.log(`📂 Select file for ${trackName} at ${this.formatTime(startTime)}...`);

        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*,video/*,audio/*';
        
        input.onchange = (e: any) => {
            if (e.target.files.length === 0) return;
            const file = e.target.files[0];
            const url = URL.createObjectURL(file);
            const type = file.type.startsWith('image') ? 'image' : (file.type.startsWith('audio') ? 'audio' : 'video');
            
            const assetId = `u_asset_${Date.now()}`;
            const newAsset = { id: assetId, name: file.name, type: type, src: url };
            
            // Add to legacy engine
            this.assetsList.push(newAsset);
            
            // Add to Zustand Store so AssetsPanel re-renders instantly
            if ((window as any).useEditorStore) {
                (window as any).useEditorStore.getState().addAsset(newAsset);
            }


            const insertClip = (finalDuration: number) => {
                this.saveState();

                const clip = new (window as any).Clip(`u_clip_${Date.now()}`, file.name, startTime, finalDuration, type, url);
                track.addClip(clip); // addClip already calls rebuildTree
                if (this.resolveCollisions) this.resolveCollisions(track.id, clip);
                
                if (type === 'video') {
                    const audioTrack = this.tracks.find((t: any) => t.type === 'audio');
                    if (audioTrack) {
                        const aClip = new (window as any).Clip(`u_aclip_${Date.now()}`, `${file.name} [Audio]`, startTime, finalDuration, 'audio', url);
                        audioTrack.addClip(aClip); // addClip already calls rebuildTree
                        if (this.resolveCollisions) this.resolveCollisions(audioTrack.id, aClip);
                    }
                }
                this.log(`✅ Added ${file.name} (Duration: ${finalDuration.toFixed(1)}s)`);
                this._cmdFinalize(); // FIX #1: sync Zustand → React timeline updates
            };

            if (customDuration !== null) {
                insertClip(customDuration);
            } else {
                if (type === 'image') {
                    insertClip(5); 
                } else {
                    const mediaEl = document.createElement(type === 'audio' ? 'audio' : 'video');
                    mediaEl.preload = 'metadata';
                    mediaEl.src = url;
                    mediaEl.onloadedmetadata = () => {
                        let dur = mediaEl.duration;
                        if (!dur || isNaN(dur)) dur = 10; 
                        insertClip(dur);
                    };
                    mediaEl.onerror = () => {
                        this.log("⚠️ Failed to read duration, using 10s default.");
                        insertClip(10);
                    };
                }
            }
        };
        input.click();
    };

    // ─────────────────────────────────────────────────────────────
    // CUT  (c20sv1, c1m30sv1)
    // FIX #2: removed currentTime mutation side-effect.
    //   Now we temporarily set currentTime, call performSplit with
    //   simulated=true, then restore. performSplit reads this.currentTime
    //   when simulated — this is intentional and correct.
    //   After split, _cmdFinalize() syncs everything.
    // ─────────────────────────────────────────────────────────────
    window.EditorApp.prototype.executeCutCommand = function(time: number, trackName: string) {
        const track = this.tracks.find((t: any) => t.name === trackName);
        if (!track) { this.log(`❌ Track ${trackName} not found.`); return; }

        // Re-query AFTER potential topology changes (names may have shifted)
        track.rebuildTree();
        const clips = track.getClipsAtTime(time);
        if (clips.length === 0) { this.log(`⚠️ No clip at ${this.formatTime(time)} on ${trackName}`); return; }

        const clipToCut = clips[0];

        this.saveState();
        const splitResult = this.performSplit(clipToCut, track, { simulated: true });

        // VISUAL FEEDBACK
        if (splitResult && splitResult.length > 0 && (window as any).useEditorStore) {
            const firstPartId = splitResult[0].id;
            (window as any).useEditorStore.getState().setHighlightedClip(firstPartId);
            setTimeout(() => {
                if ((window as any).useEditorStore.getState().highlightedClipId === firstPartId) {
                    (window as any).useEditorStore.getState().setHighlightedClip(null);
                }
            }, 1000);
        }

        this.log(`✂️ Cut ${trackName} at ${this.formatTime(time)}`);
        this.updatePlayheadPosition();
    };

    // ─────────────────────────────────────────────────────────────
    // MOVE  (mv100x200y1v1)
    // FIX #6: search by topology name first, then fallback to clip.name
    // ─────────────────────────────────────────────────────────────
    window.EditorApp.prototype.executeMoveCommand = function(paramsStr: string) {
        // Target is like "1v1" at end of string (clipIndex + trackName)
        const clipNameMatch = paramsStr.match(/(\d+)([vta]\d+)$/i);
        if (!clipNameMatch) { this.log("❌ Invalid Move Command: Target clip not found."); return; }
        
        const clipIndex = parseInt(clipNameMatch[1]);       // e.g. 1
        const targetTrackName = clipNameMatch[2].toUpperCase(); // e.g. V1
        const transformsStr = paramsStr.substring(0, paramsStr.length - clipNameMatch[0].length);

        const track = this.tracks.find((t: any) => t.name === targetTrackName);
        if (!track) { this.log(`❌ Track ${targetTrackName} not found.`); return; }

        // FIX #6: find by sorted index (topology), not by .name string
        const sortedClips = [...track.clips].sort((a: any, b: any) => a.start - b.start);
        if (clipIndex < 1 || clipIndex > sortedClips.length) {
            this.log(`⚠️ Invalid clip index ${clipIndex}. Track ${targetTrackName} has ${sortedClips.length} clips.`);
            return;
        }
        const targetClip = sortedClips[clipIndex - 1];

        if (typeof (window as any).ensureProProperties === 'function') {
            (window as any).ensureProProperties(targetClip);
        }

        const isAiMode = targetClip.aiSegmentation && targetClip.aiSegmentation.enabled;

        const resolveVal = (valStr: string, axis: string) => {
            if (!valStr) return null;
            if (!isNaN(valStr as any)) return parseInt(valStr);
            if (axis === 'x') {
                if (valStr === 'l') return -800;
                if (valStr === 'r') return 800;
                if (valStr === 'c') return 0;
            }
            if (axis === 'y') {
                if (valStr === 'u') return -400;
                if (valStr === 'd') return 400;
                if (valStr === 'c') return 0;
            }
            return null;
        };
        
        const xMatch = transformsStr.match(/([^xy]+)x/);
        const yMatch = transformsStr.match(/([^xy]+)y/);

        let changed = false;
        
        if (!targetClip.properties) targetClip.properties = { scale: 100, positionX: 0, positionY: 0 };

        if (xMatch || yMatch) {
            this.saveState(); 
        
            // VISUAL FEEDBACK
            if ((window as any).useEditorStore) {
                (window as any).useEditorStore.getState().setHighlightedClip(targetClip.id);
                setTimeout(() => {
                    if ((window as any).useEditorStore.getState().highlightedClipId === targetClip.id) {
                        (window as any).useEditorStore.getState().setHighlightedClip(null);
                    }
                }, 1000);
            }
        }

        if (xMatch) {
            const val = resolveVal(xMatch[1], 'x');
            if (val !== null) { 
                if (isAiMode && targetClip.sandwich) targetClip.sandwich.offsetX = val;
                else targetClip.properties.positionX = val;
                changed = true; 
            }
        }
        
        if (yMatch) {
            const val = resolveVal(yMatch[1], 'y');
            if (val !== null) { 
                if (isAiMode && targetClip.sandwich) targetClip.sandwich.offsetY = val;
                else targetClip.properties.positionY = val; 
                changed = true; 
            }
        }

        if (changed) {
            this.log(`✅ Moved clip #${clipIndex} on ${targetTrackName} (${isAiMode ? 'Sandwich' : 'Standard'})`);
            this._cmdFinalize(); // FIX #1
            if (typeof this.updateEffectControls === 'function') this.updateEffectControls();
        } else {
            this.log(`⚠️ No valid moves in "${transformsStr}"`);
        }
    };

    // ─────────────────────────────────────────────────────────────
    // REMOVE SILENCE  (rmsa1ev1)
    // FIX: added _cmdFinalize() at end
    // ─────────────────────────────────────────────────────────────
    window.EditorApp.prototype.executeRemoveSilenceCommand = async function(sourceTrackName: string, exceptionTracks: string[]) {
        const track = this.tracks.find((t: any) => t.name === sourceTrackName);
        if (!track) { this.log(`❌ Track ${sourceTrackName} not found.`); return; }
        if (track.type !== 'audio' && track.type !== 'video') { this.log("❌ Source must be audio/video."); return; }

        const normalizedExceptions = exceptionTracks.map(t => t.toUpperCase());
        this.log(`🔍 Analyzing silence on ${sourceTrackName}...`);
        
        const intervals = await this.detectSilenceIntervals(track);
        
        if (intervals.length === 0) {
            this.log("⚠️ No silence detected.");
            return;
        }
        
        this.log(`✂️ Found ${intervals.length} silent gaps. Removing...`);
        
        intervals.sort((a: any, b: any) => b.start - a.start);
        
        this.saveState();
        
        let deletedCount = 0;
        
        for (const interval of intervals) {
            this.executeMultiTrackRippleDelete(interval.start, interval.end, normalizedExceptions);
            deletedCount++;
        }
        
        this.log(`✅ Removed ${deletedCount} gaps. Timeline compacted.`);
        this._cmdFinalize(); // FIX #1
    };

    // ─────────────────────────────────────────────────────────────
    // DETECT SILENCE INTERVALS  (helper for removeRemoveSilenceCommand)
    // ─────────────────────────────────────────────────────────────
    window.EditorApp.prototype.detectSilenceIntervals = async function(track: any) {
        const intervals = [];
        const SILENCE_THRESH = 0.02; 
        const MIN_DURATION = 0.5; 
        
        const sortedClips = [...track.clips].sort((a, b) => a.start - b.start);
        
        for (const clip of sortedClips) {
            let buffer = this.sharedAudioBuffers ? this.sharedAudioBuffers.get(clip.src) : null;
            
            if (!buffer) {
                 try {
                    const resp = await fetch(clip.src);
                    const ab = await resp.arrayBuffer();
                    if (this.audioCtxForAnalysis) {
                        buffer = await this.audioCtxForAnalysis.decodeAudioData(ab);
                        if (this.sharedAudioBuffers) this.sharedAudioBuffers.set(clip.src, buffer);
                    } else {
                        console.warn("Audio Context not ready.");
                        continue;
                    }
                 } catch(e) {
                     console.warn("Skipping clip, cannot load audio", clip.name);
                     continue;
                 }
            }
            
            const data = buffer.getChannelData(0);
            const sampleRate = buffer.sampleRate;
            
            const clipStart = clip.start;
            const clipDur = clip.duration;
            const sourceIn = clip.sourceIn || 0;
            
            const startSample = Math.floor(sourceIn * sampleRate);
            const endSample = Math.floor((sourceIn + clipDur) * sampleRate);
            
            let isSilent = false;
            let silenceStartSample = -1;
            const step = 1000; 
            
            for (let i = startSample; i < endSample; i += step) {
                 let localMax = 0;
                 for (let j = 0; j < step && (i + j) < endSample; j++) {
                     const val = Math.abs(data[i + j]);
                     if (val > localMax) localMax = val;
                 }
                 
                 if (localMax < SILENCE_THRESH) {
                     if (!isSilent) {
                         isSilent = true;
                         silenceStartSample = i;
                     }
                 } else {
                     if (isSilent) {
                         const durationSec = (i - silenceStartSample) / sampleRate;
                         if (durationSec >= MIN_DURATION) {
                             const relStart = (silenceStartSample - startSample) / sampleRate;
                             const relEnd = (i - startSample) / sampleRate;
                             intervals.push({
                                 start: clipStart + relStart,
                                 end: clipStart + relEnd
                             });
                         }
                         isSilent = false;
                     }
                 }
            }
            
            if (isSilent) {
                 const i = endSample;
                 const durationSec = (i - silenceStartSample) / sampleRate;
                 if (durationSec >= MIN_DURATION) {
                     const relStart = (silenceStartSample - startSample) / sampleRate;
                     const relEnd = (i - startSample) / sampleRate;
                     intervals.push({
                         start: clipStart + relStart,
                         end: clipStart + relEnd
                     });
                 }
            }
        }
        
        return intervals;
    };

    // ─────────────────────────────────────────────────────────────
    // MULTI-TRACK RIPPLE DELETE  (helper for Remove Silence)
    // FIX: added rebuildTree() per track after mutation
    // ─────────────────────────────────────────────────────────────
    window.EditorApp.prototype.executeMultiTrackRippleDelete = function(start: number, end: number, exceptions: string[]) {
        const duration = end - start;
        
        this.tracks.forEach((track: any) => {
            if (exceptions.includes(track.name.toUpperCase())) return;
            
            let clipsAtEnd = track.getClipsAtTime(end);
            if (clipsAtEnd.length > 0) this.performSplit(clipsAtEnd[0], track, { simulated: true });
            
            let clipsAtStart = track.getClipsAtTime(start);
            if (clipsAtStart.length > 0) this.performSplit(clipsAtStart[0], track, { simulated: true });
            
            const EPSILON = 0.001;
            track.clips = track.clips.filter((c: any) => {
                 const cMid = c.start + (c.duration / 2);
                 return !(cMid > start - EPSILON && cMid < end + EPSILON);
            });
            
            track.clips.forEach((c: any) => {
                if (c.start >= end - EPSILON) {
                    c.start -= duration;
                }
            });

            track.rebuildTree(); // FIX: keep IntervalTree in sync after mutation
        });
    };
};
