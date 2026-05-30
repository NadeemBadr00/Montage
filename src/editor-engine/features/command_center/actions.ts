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
            // ─────────────────────────────────────────────────────────────
            // Phase 1: Speed / Volume / Fade / Crop
            // ─────────────────────────────────────────────────────────────
            case 'SPEED_UPDATE':
                this.executeSpeedCommand(parsed.trackName, parsed.index, parsed.speed);
                break;
            case 'VOLUME_UPDATE':
                this.executeVolumeCommand(parsed.trackName, parsed.index, parsed.volume);
                break;
            case 'FADE_IN':
                this.executeFadeCommand(parsed.trackName, parsed.index, 'in', parsed.duration);
                break;
            case 'FADE_OUT':
                this.executeFadeCommand(parsed.trackName, parsed.index, 'out', parsed.duration);
                break;
            case 'CROP_UPDATE':
                this.executeCropCommand(parsed.trackName, parsed.index, parsed.x1, parsed.y1, parsed.x2, parsed.y2);
                break;
            case 'CROP_RESET':
                this.executeCropCommand(parsed.trackName, parsed.index, 0, 0, 100, 100);
                break;

            // ─────────────────────────────────────────────────────────────
            // Phase 2: Color Grading
            // ─────────────────────────────────────────────────────────────
            case 'COLOR_UPDATE':
                this.executeColorCommand(parsed.trackName, parsed.index, parsed.property, parsed.val);
                break;
            case 'TINT_UPDATE':
                this.executeTintCommand(parsed.trackName, parsed.index, parsed.color, parsed.opacity);
                break;
            case 'FILTER_PRESET':
                this.executeFilterPresetCommand(parsed.trackName, parsed.index, parsed.preset);
                break;
            case 'COLOR_RESET':
                this.executeColorResetCommand(parsed.trackName, parsed.index);
                break;

            // ─────────────────────────────────────────────────────────────
            // Phase 3: Shapes + Ken Burns
            // ─────────────────────────────────────────────────────────────
            case 'SHAPE_ADD':
                this.executeShapeAddCommand(parsed);
                break;
            case 'KEN_BURNS':
                this.executeKenBurnsCommand(parsed.trackName, parsed.index, parsed.startX, parsed.startY, parsed.startScale, parsed.endX, parsed.endY, parsed.endScale);
                break;
            case 'KEN_BURNS_RESET':
                this.executeKenBurnsResetCommand(parsed.trackName, parsed.index);
                break;

            // ─────────────────────────────────────────────────────────────
            // Phase 4: Track Transitions
            // ─────────────────────────────────────────────────────────────
            case 'TRANSITION_ADD':
                this.executeTransitionAddCommand(parsed.trackName, parsed.cutTime, parsed.transType, parsed.duration);
                break;
            case 'TRANSITION_REMOVE':
                this.executeTransitionRemoveCommand(parsed.trackName, parsed.cutTime);
                break;

            // ─────────────────────────────────────────────────────────────
            // Phase 6: Freeze Frame + Markers
            // ─────────────────────────────────────────────────────────────
            case 'FREEZE_FRAME':
                this.executeFreezeFrameCommand(parsed.trackName, parsed.index, parsed.duration);
                break;
            case 'MARKER_ADD':
                this.executeMarkerAddCommand(parsed.label, parsed.time);
                break;
            case 'MARKER_REMOVE':
                this.executeMarkerRemoveCommand(parsed.time);
                break;
            case 'MARKER_CLEAR':
                this.executeMarkerClearCommand();
                break;
            case 'GOTO_MARKER':
                this.executeGotoMarkerCommand(parsed.label);
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

    // ─────────────────────────────────────────────────────────────
    // 🚀 PHASE 1 — Speed / Volume / Fade / Crop Handlers
    // ─────────────────────────────────────────────────────────────

    // SPEED (sp2c1V1) — sets clip.properties.playbackSpeed
    // managePlayers() already reads playbackSpeed and applies it to the HTML5 player
    window.EditorApp.prototype.executeSpeedCommand = function(trackName: string, clipIndex: number, speed: number) {
        const track = this.tracks.find((t: any) => t.name === trackName);
        if (!track) { this.log(`❌ Track ${trackName} not found.`); return; }
        const sorted = [...track.clips].sort((a: any, b: any) => a.start - b.start);
        if (clipIndex < 1 || clipIndex > sorted.length) { this.log(`⚠️ Invalid clip index ${clipIndex}`); return; }
        const clip = sorted[clipIndex - 1];
        this.saveState();
        if (!clip.properties) clip.properties = {};
        clip.properties.playbackSpeed = Math.max(0.1, Math.min(16, speed));
        this.log(`⏩ Speed set to ${clip.properties.playbackSpeed}x on ${clip.name}`);
        this._cmdFinalize();
    };

    // VOLUME (vol80c1A1) — sets clip.properties.volume (0–200%)
    // managePlayers() reads this and sets p.volume
    window.EditorApp.prototype.executeVolumeCommand = function(trackName: string, clipIndex: number, volume: number) {
        const track = this.tracks.find((t: any) => t.name === trackName);
        if (!track) { this.log(`❌ Track ${trackName} not found.`); return; }
        const sorted = [...track.clips].sort((a: any, b: any) => a.start - b.start);
        if (clipIndex < 1 || clipIndex > sorted.length) { this.log(`⚠️ Invalid clip index ${clipIndex}`); return; }
        const clip = sorted[clipIndex - 1];
        this.saveState();
        if (!clip.properties) clip.properties = {};
        clip.properties.volume = volume;
        const label = volume === 0 ? '🔇 Muted' : `🔊 ${volume}%`;
        this.log(`${label} volume on ${clip.name}`);
        this._cmdFinalize();
    };

    // FADE IN / OUT (fi2c1V1 | fo1.5c1V1)
    // Uses the existing clip.transitions system already read by the WebGL renderer
    window.EditorApp.prototype.executeFadeCommand = function(trackName: string, clipIndex: number, direction: string, duration: number) {
        const track = this.tracks.find((t: any) => t.name === trackName);
        if (!track) { this.log(`❌ Track ${trackName} not found.`); return; }
        const sorted = [...track.clips].sort((a: any, b: any) => a.start - b.start);
        if (clipIndex < 1 || clipIndex > sorted.length) { this.log(`⚠️ Invalid clip index ${clipIndex}`); return; }
        const clip = sorted[clipIndex - 1];
        this.saveState();
        if (!clip.transitions) clip.transitions = { duration: 1, in: 'none', out: 'none' };
        clip.transitions.duration = duration;
        if (direction === 'in')  clip.transitions.in  = 'fade';
        if (direction === 'out') clip.transitions.out = 'fade';
        this.log(`✨ Fade ${direction} ${duration}s applied to ${clip.name}`);
        this._cmdFinalize();
    };

    // CROP (cr10,20,90,80c1V1) — UV-based crop via WebGL uvOffset/uvScale
    // Values are percentages (0-100). x1,y1 = top-left, x2,y2 = bottom-right.
    window.EditorApp.prototype.executeCropCommand = function(trackName: string, clipIndex: number, x1: number, y1: number, x2: number, y2: number) {
        const track = this.tracks.find((t: any) => t.name === trackName);
        if (!track) { this.log(`❌ Track ${trackName} not found.`); return; }
        const sorted = [...track.clips].sort((a: any, b: any) => a.start - b.start);
        if (clipIndex < 1 || clipIndex > sorted.length) { this.log(`⚠️ Invalid clip index ${clipIndex}`); return; }
        const clip = sorted[clipIndex - 1];
        this.saveState();
        if (!clip.properties) clip.properties = {};

        // Normalize 0-100% to 0.0-1.0 UV space
        const cx1 = Math.max(0, Math.min(100, x1)) / 100;
        const cy1 = Math.max(0, Math.min(100, y1)) / 100;
        const cx2 = Math.max(0, Math.min(100, x2)) / 100;
        const cy2 = Math.max(0, Math.min(100, y2)) / 100;

        clip.properties.uvScaleX  = Math.max(0.01, cx2 - cx1);
        clip.properties.uvScaleY  = Math.max(0.01, cy2 - cy1);
        clip.properties.uvOffsetX = cx1;
        clip.properties.uvOffsetY = cy1;
        // Store raw values for UI display
        clip.properties.cropX1 = x1; clip.properties.cropY1 = y1;
        clip.properties.cropX2 = x2; clip.properties.cropY2 = y2;

        if (x1 === 0 && y1 === 0 && x2 === 100 && y2 === 100) {
            clip.properties.uvScaleX = 1; clip.properties.uvScaleY = 1;
            clip.properties.uvOffsetX = 0; clip.properties.uvOffsetY = 0;
            this.log(`🔄 Crop reset on ${clip.name}`);
        } else {
            this.log(`✂️ Crop applied: (${x1},${y1}) → (${x2},${y2}) on ${clip.name}`);
        }
        this._cmdFinalize();
        if (typeof this.updateEffectControls === 'function') this.updateEffectControls();
    };

    // ─────────────────────────────────────────────────────────────
    // 🎨 PHASE 2 — Color Grading Handlers
    // ─────────────────────────────────────────────────────────────

    // Helper: ensure colorGrading object exists on clip
    const _ensureColor = (clip: any) => {
        if (!clip.properties) clip.properties = {};
        if (!clip.properties.colorGrading) {
            clip.properties.colorGrading = {
                brightness: 100, contrast: 100, saturation: 100, hue: 0,
                tintColor: null, tintOpacity: 0, preset: null
            };
        }
        return clip.properties.colorGrading;
    };

    // Helper: resolve clip by trackName + index (shared by all Phase 2 handlers)
    const _resolveClip = (app: any, trackName: string, clipIndex: number) => {
        const track = app.tracks.find((t: any) => t.name === trackName);
        if (!track) { app.log(`❌ Track ${trackName} not found.`); return null; }
        const sorted = [...track.clips].sort((a: any, b: any) => a.start - b.start);
        if (clipIndex < 1 || clipIndex > sorted.length) { app.log(`⚠️ Invalid clip index ${clipIndex}`); return null; }
        return sorted[clipIndex - 1];
    };

    // BRIGHTNESS / CONTRAST / SATURATION / HUE
    // Values stored in clip.properties.colorGrading and applied as CSS filter in _cmdFinalize render
    window.EditorApp.prototype.executeColorCommand = function(trackName: string, clipIndex: number, property: string, val: number) {
        const clip = _resolveClip(this, trackName, clipIndex);
        if (!clip) return;
        this.saveState();
        const cg = _ensureColor(clip);
        if (property === 'brightness')  cg.brightness  = Math.max(0, Math.min(400, val));
        if (property === 'contrast')    cg.contrast    = Math.max(0, Math.min(400, val));
        if (property === 'saturation')  cg.saturation  = Math.max(0, Math.min(400, val));
        if (property === 'hue')         cg.hue         = val % 360;
        this.log(`🎨 ${property} → ${val} on ${clip.name}`);
        this._cmdFinalize();
    };

    // TINT — applies a color overlay at a given opacity
    window.EditorApp.prototype.executeTintCommand = function(trackName: string, clipIndex: number, color: string, opacity: number) {
        const clip = _resolveClip(this, trackName, clipIndex);
        if (!clip) return;
        this.saveState();
        const cg = _ensureColor(clip);
        cg.tintColor   = color;
        cg.tintOpacity = Math.max(0, Math.min(100, opacity)) / 100;
        this.log(`🎨 Tint ${color} @ ${opacity}% on ${clip.name}`);
        this._cmdFinalize();
    };

    // FILTER PRESETS — maps friendly names to colorGrading values
    const FILTER_PRESETS: Record<string, any> = {
        cinematic:  { brightness: 90,  contrast: 115, saturation: 80,  hue: 0,   tintColor: '#0a1628', tintOpacity: 0.15 },
        bw:         { brightness: 100, contrast: 110, saturation: 0,   hue: 0,   tintColor: null, tintOpacity: 0 },
        warm:       { brightness: 105, contrast: 100, saturation: 110, hue: 15,  tintColor: '#ff9900', tintOpacity: 0.08 },
        cool:       { brightness: 100, contrast: 105, saturation: 90,  hue: -15, tintColor: '#0044ff', tintOpacity: 0.08 },
        vintage:    { brightness: 95,  contrast: 90,  saturation: 70,  hue: 10,  tintColor: '#8b4513', tintOpacity: 0.12 },
        reset:      { brightness: 100, contrast: 100, saturation: 100, hue: 0,   tintColor: null, tintOpacity: 0 },
    };

    window.EditorApp.prototype.executeFilterPresetCommand = function(trackName: string, clipIndex: number, preset: string) {
        const clip = _resolveClip(this, trackName, clipIndex);
        if (!clip) return;
        this.saveState();
        const cg = _ensureColor(clip);
        const values = FILTER_PRESETS[preset];
        if (!values) { this.log(`❌ Unknown preset: ${preset}`); return; }
        Object.assign(cg, values, { preset });
        this.log(`✨ Filter preset "${preset}" applied to ${clip.name}`);
        this._cmdFinalize();
    };

    // COLOR RESET — restores defaults
    window.EditorApp.prototype.executeColorResetCommand = function(trackName: string, clipIndex: number) {
        const clip = _resolveClip(this, trackName, clipIndex);
        if (!clip) return;
        this.saveState();
        if (clip.properties) {
            clip.properties.colorGrading = { brightness: 100, contrast: 100, saturation: 100, hue: 0, tintColor: null, tintOpacity: 0, preset: null };
        }
        this.log(`🔄 Color reset on ${clip.name}`);
        this._cmdFinalize();
    };

    // ─────────────────────────────────────────────────────────────
    // 🔷 PHASE 3 — Shapes + Ken Burns
    // ─────────────────────────────────────────────────────────────

    // SHAPE ADD — creates a new 'shape' clip on the specified track
    window.EditorApp.prototype.executeShapeAddCommand = function(parsed: any) {
        const track = this.tracks.find((t: any) => t.name === parsed.trackName);
        if (!track) { this.log(`❌ Track ${parsed.trackName} not found`); return; }
        this.saveState();
        const insertTime = this.currentTime;
        const clipId = `shape_${Date.now()}`;
        const newClip: any = {
            id: clipId,
            type: 'shape',
            src: `shape:${parsed.shape}`,
            name: `Shape (${parsed.shape})`,
            start: insertTime,
            duration: parsed.duration,
            get end() { return this.start + this.duration; },
            properties: {
                shapeType:   parsed.shape,
                shapeColor:  parsed.color,
                widthPct:    parsed.widthPct,   // % of canvas width
                heightPct:   parsed.heightPct,  // % of canvas height
                positionX:   parsed.x,
                positionY:   parsed.y,
                opacity:     100,
                rotation:    0,
                scale:       100,
            },
            trackId: track.id,
            keyframes: [],
            getPropertyValue(prop: string) { return this.properties[prop] ?? 0; }
        };
        track.clips.push(newClip);
        if (track.rebuildTree) track.rebuildTree();
        this.log(`🔷 Shape "${parsed.shape}" added at ${insertTime.toFixed(2)}s`);
        this._cmdFinalize();
    };

    // KEN BURNS — stores animated pan+zoom keyframes on a clip
    window.EditorApp.prototype.executeKenBurnsCommand = function(
        trackName: string, clipIndex: number,
        startX: number, startY: number, startScale: number,
        endX: number, endY: number, endScale: number
    ) {
        const clip = _resolveClip(this, trackName, clipIndex);
        if (!clip) return;
        this.saveState();
        clip.properties.kenBurns = { startX, startY, startScale, endX, endY, endScale };
        this.log(`🎥 Ken Burns: (${startX},${startY},${startScale}x) → (${endX},${endY},${endScale}x) on ${clip.name}`);
        this._cmdFinalize();
    };

    window.EditorApp.prototype.executeKenBurnsResetCommand = function(trackName: string, clipIndex: number) {
        const clip = _resolveClip(this, trackName, clipIndex);
        if (!clip) return;
        this.saveState();
        delete clip.properties.kenBurns;
        this.log(`🔄 Ken Burns reset on ${clip.name}`);
        this._cmdFinalize();
    };

    // ─────────────────────────────────────────────────────────────
    // 🔷 PHASE 4 — Track-Level Transitions
    // ─────────────────────────────────────────────────────────────

    window.EditorApp.prototype.executeTransitionAddCommand = function(trackName: string, cutTime: number, transType: string, duration: number) {
        const track = this.tracks.find((t: any) => t.name === trackName);
        if (!track) { this.log(`❌ Track ${trackName} not found`); return; }
        this.saveState();
        if (!track.transitions) track.transitions = [];
        // Remove any existing transition near this cutTime
        track.transitions = track.transitions.filter((tr: any) => Math.abs(tr.cutTime - cutTime) > 0.1);
        // Map command type to WebGL types
        const typeMap: Record<string, string> = { dissolve: 'dissolve', fade: 'dissolve', wipe: 'wipe', zoom: 'zoom' };
        track.transitions.push({
            id: `tr_${Date.now()}`,
            cutTime,
            inOffset:  duration / 2,
            outOffset: duration / 2,
            type: typeMap[transType] || 'dissolve',
            alignment: 'center'
        });
        this.log(`🎬 Transition "${transType}" added at ${cutTime}s on ${trackName}`);
        this._cmdFinalize();
    };

    window.EditorApp.prototype.executeTransitionRemoveCommand = function(trackName: string, cutTime: number) {
        const track = this.tracks.find((t: any) => t.name === trackName);
        if (!track || !track.transitions) { this.log(`❌ No transitions on ${trackName}`); return; }
        this.saveState();
        const before = track.transitions.length;
        track.transitions = track.transitions.filter((tr: any) => Math.abs(tr.cutTime - cutTime) > 0.1);
        const removed = before - track.transitions.length;
        this.log(removed > 0 ? `✅ Transition removed at ${cutTime}s` : `⚠️ No transition found near ${cutTime}s`);
        this._cmdFinalize();
    };

    // ─────────────────────────────────────────────────────────────
    // 🔷 PHASE 6 — Freeze Frame + Markers
    // ─────────────────────────────────────────────────────────────

    // FREEZE FRAME — inserts a duplicate frozen clip after the split point
    window.EditorApp.prototype.executeFreezeFrameCommand = function(trackName: string, clipIndex: number, duration: number) {
        const track = this.tracks.find((t: any) => t.name === trackName);
        if (!track) { this.log(`❌ Track ${trackName} not found`); return; }
        const sorted = [...track.clips].sort((a: any, b: any) => a.start - b.start);
        if (clipIndex < 1 || clipIndex > sorted.length) { this.log(`⚠️ Invalid clip index`); return; }
        const origClip = sorted[clipIndex - 1];
        this.saveState();

        // Freeze at current playhead position within the clip
        const freezeAtSource = origClip.sourceIn + (this.currentTime - origClip.start);

        // 1. Shorten original clip to freeze point
        const origEnd = origClip.start + origClip.duration;
        origClip.duration = this.currentTime - origClip.start;

        // 2. Create a new 'freeze' clip
        const freezeClip: any = {
            id: `freeze_${Date.now()}`,
            type: origClip.type,
            src: origClip.src,
            name: `Freeze (${origClip.name})`,
            start: this.currentTime,
            duration: duration,
            get end() { return this.start + this.duration; },
            sourceIn: freezeAtSource,  // stays fixed
            properties: { ...origClip.properties, playbackSpeed: 0.001 }, // near-zero speed = freeze
            trackId: track.id,
            keyframes: [],
            isFrozen: true,
            getPropertyValue(prop: string) { return this.properties[prop] ?? 0; }
        };
        track.clips.push(freezeClip);

        // 3. Push remaining clips forward
        const afterFreeze = track.clips.filter((c: any) =>
            c.id !== origClip.id && c.id !== freezeClip.id && c.start >= this.currentTime
        );
        afterFreeze.forEach((c: any) => { c.start += duration; });
        if (track.rebuildTree) track.rebuildTree();
        this.log(`❄️ Freeze frame ${duration}s inserted at ${this.currentTime.toFixed(2)}s`);
        this._cmdFinalize();
    };

    // MARKERS — stored in this.markers array, shown on the timeline ruler
    window.EditorApp.prototype.executeMarkerAddCommand = function(label: string, time: number) {
        if (!this.markers) this.markers = [];
        // Remove any existing marker with the same label
        this.markers = this.markers.filter((m: any) => m.label !== label);
        this.markers.push({ id: `marker_${Date.now()}`, label, time, color: '#f59e0b' });
        this.markers.sort((a: any, b: any) => a.time - b.time);
        this.log(`📍 Marker "${label}" added at ${time}s`);
        this._cmdFinalize();
        // Notify React timeline to re-render markers
        if (this.commitStateToReact) this.commitStateToReact();
    };

    window.EditorApp.prototype.executeMarkerRemoveCommand = function(time: number) {
        if (!this.markers) return;
        const before = this.markers.length;
        this.markers = this.markers.filter((m: any) => Math.abs(m.time - time) > 0.1);
        this.log(before > this.markers.length ? `🗑️ Marker at ${time}s removed` : `⚠️ No marker near ${time}s`);
        this._cmdFinalize();
        if (this.commitStateToReact) this.commitStateToReact();
    };

    window.EditorApp.prototype.executeMarkerClearCommand = function() {
        this.markers = [];
        this.log(`🗑️ All markers cleared`);
        this._cmdFinalize();
        if (this.commitStateToReact) this.commitStateToReact();
    };

    window.EditorApp.prototype.executeGotoMarkerCommand = function(label: string) {
        if (!this.markers || this.markers.length === 0) { this.log(`⚠️ No markers found`); return; }
        const marker = this.markers.find((m: any) => m.label.toLowerCase() === label.toLowerCase());
        if (!marker) { this.log(`⚠️ Marker "${label}" not found`); return; }
        this.currentTime = marker.time;
        if (this.seek) this.seek(0);
        this.log(`⏭️ Jumped to marker "${label}" at ${marker.time}s`);
    };

};

