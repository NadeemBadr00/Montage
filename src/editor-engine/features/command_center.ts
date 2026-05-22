// @ts-nocheck
/**
 * ⌨️ Command Center Module (command_center.js)
 * المسؤول عن:
 * 1. واجهة سطر الأوامر (CLI UI).
 * 2. نظام الاختصارات (Keyboard Shortcuts).
 * 3. تحليل وتنفيذ الأوامر (Parsing & Execution).
 * 4. إدارة النافذة العائمة (Floating Window Management).
 * 🔥 FIX: إصلاح Undo بعد الرفع + إصلاح الحذف الرقمي (d1v4) بالحذف الجبري.
 * 🚀 NEW: إضافة أمر rms (Remove Silence) للحذف الذكي للفراغات.
 * ✨ NEW: أوامر التحويل (Transform Commands): 
 * - sc (Uniform Scale)
 * - sx (Scale X - Stretch Width)
 * - sy (Scale Y - Stretch Height)
 * - sz (Size - Force Pixels WxHy...) -> Updated format
 * - op (Opacity), ro (Rotation).
 */

// تهيئة النظام عند تشغيل المحرك
window.EditorApp.prototype.initCommandCenter = function() {
    this.commandBuffer = "";
    this.isCommandMode = false;
    // 🔥 FIX: جعل الكونسول مخفياً افتراضياً عند بدء التشغيل لمنع تداخله مع نافذة البداية
    this.isConsoleVisible = false; 
    this.isMinimized = false;
    this.isCmdFocused = false; 

    // 🔥 Setup UI
    this.setupCommandConsoleUI();
    
    // 🔥 Setup Listeners (Inputs & Shortcuts)
    this.setupCommandListeners();

    this.log("✅ Command Center Module Loaded (Hidden by Default).");
};

// --- UI Management ---

window.EditorApp.prototype.setupCommandConsoleUI = function() {
    let consoleEl = document.getElementById('cmd-console');
    this.cmdContainer = consoleEl;
    this.cmdBufferEl = document.getElementById('cmd-buffer');
    this.cmdMinimized = document.getElementById('cmd-minimized');
    this.cmdHeader = document.getElementById('cmd-header');
    this.cmdCursor = this.cmdContainer ? this.cmdContainer.querySelector('.animate-pulse') : null;

    if (this.cmdContainer && this.cmdHeader) {
        this.setupDraggable(this.cmdContainer, this.cmdHeader);
        
        // 1. عند النقر على الكونسول: تفعيل التركيز
        this.cmdContainer.addEventListener('mousedown', (e) => {
            if (e.target.closest('button')) return;
            this.isCmdFocused = true;
            this.updateConsoleVisuals();
            e.stopPropagation(); 
        });
    }
    
    // 2. عند النقر في أي مكان آخر: إلغاء التركيز
    document.addEventListener('mousedown', (e) => {
        if (this.cmdContainer && !this.cmdContainer.contains(e.target) && !e.target.closest('#cmd-minimized')) {
            this.isCmdFocused = false;
            this.updateConsoleVisuals();
        }
    });

    if (this.cmdMinimized) {
        this.setupDraggable(this.cmdMinimized, this.cmdMinimized);
    }
    
    // تطبيق الحالة الافتراضية (الآن هي hidden)
    if(this.isConsoleVisible) this.cmdContainer.classList.remove('hidden');
    else this.cmdContainer.classList.add('hidden');
    
    this.updateConsoleVisuals(); 
};

window.EditorApp.prototype.updateConsoleVisuals = function() {
    if (!this.cmdContainer) return;

    if (this.isCmdFocused) {
        this.cmdContainer.classList.add('border-green-500', 'shadow-[0_0_15px_rgba(16,185,129,0.3)]');
        this.cmdContainer.classList.remove('border-green-500/30');
        this.cmdContainer.style.opacity = '1';
        if(this.cmdCursor) this.cmdCursor.style.display = 'inline-block';
    } else {
        this.cmdContainer.classList.remove('border-green-500', 'shadow-[0_0_15px_rgba(16,185,129,0.3)]');
        this.cmdContainer.classList.add('border-green-500/30');
        this.cmdContainer.style.opacity = '0.9'; 
        if(this.cmdCursor) this.cmdCursor.style.display = 'none'; 
    }
};

window.EditorApp.prototype.setupDraggable = function(element, handle) {
    let isDragging = false;
    let startX, startY, initialLeft, initialTop;

    handle.addEventListener('mousedown', (e) => {
        if (e.target.tagName === 'BUTTON' || e.target.closest('button')) return;
        
        e.preventDefault();
        isDragging = true;
        startX = e.clientX;
        startY = e.clientY;
        
        this.isCmdFocused = true;
        this.updateConsoleVisuals();
        
        const rect = element.getBoundingClientRect();
        initialLeft = rect.left;
        initialTop = rect.top;

        element.style.bottom = 'auto';
        element.style.right = 'auto';
        element.style.left = `${initialLeft}px`;
        element.style.top = `${initialTop}px`;
        
        handle.style.cursor = 'grabbing';
    });

    document.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        const dx = e.clientX - startX;
        const dy = e.clientY - startY;
        element.style.left = `${initialLeft + dx}px`;
        element.style.top = `${initialTop + dy}px`;
    });

    document.addEventListener('mouseup', () => {
        if (isDragging) {
            isDragging = false;
            handle.style.cursor = 'move';
        }
    });
};

window.EditorApp.prototype.toggleCommandConsole = function() {
    this.isConsoleVisible = !this.isConsoleVisible;
    if (this.cmdContainer) {
        if (this.isConsoleVisible) {
            this.isMinimized = false;
            this.cmdContainer.classList.remove('hidden');
            if(this.cmdMinimized) this.cmdMinimized.classList.add('hidden');
            this.isCmdFocused = true;
            this.updateConsoleVisuals();
        }
        else {
            this.cmdContainer.classList.add('hidden');
            if(this.cmdMinimized) this.cmdMinimized.classList.add('hidden');
            this.isCmdFocused = false;
        }
    }
};

window.EditorApp.prototype.minimizeConsole = function() {
    this.isMinimized = true;
    if(this.cmdContainer) this.cmdContainer.classList.add('hidden');
    if(this.cmdMinimized) this.cmdMinimized.classList.remove('hidden');
    this.isCmdFocused = false;
};

window.EditorApp.prototype.restoreConsole = function() {
    this.isMinimized = false;
    this.isConsoleVisible = true;
    if(this.cmdContainer) this.cmdContainer.classList.remove('hidden');
    if(this.cmdMinimized) this.cmdMinimized.classList.add('hidden');
    this.isCmdFocused = true;
    this.updateConsoleVisuals();
};

// --- Input & Shortcuts Logic ---

window.EditorApp.prototype.setupCommandListeners = function() {
    window.addEventListener('keydown', (e) => {
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable) return;

        const key = e.key.toLowerCase();

        // CASE 1: Console is FOCUSED (Type Mode)
        if (this.isCmdFocused) {
            if (e.key === 'Escape') {
                this.isCmdFocused = false;
                this.updateConsoleVisuals();
                this.clearCommand();
                return;
            }
            if (e.key === 'Enter') {
                e.stopPropagation();
                this.executeCommand();
                return;
            }
            if (e.key === 'Backspace') {
                this.updateCommandBuffer('Backspace');
                e.stopPropagation();
                return;
            }
            if (e.key.length === 1) {
                this.updateCommandBuffer(e.key);
                e.stopPropagation(); 
                e.stopImmediatePropagation();
                return;
            }
            return; 
        }

        // CASE 2: Console is NOT Focused (Shortcut Mode)
        if (key === 'c' && !e.ctrlKey && !e.metaKey) {
            this.setTool('razor');
            e.preventDefault();
            return;
        }
        if (key === 'v' && !e.ctrlKey && !e.metaKey) {
            this.setTool('select');
            e.preventDefault();
            return;
        }
        if (key === 'delete' || key === 'backspace') {
            if(e.shiftKey) this.rippleDelete();
            else this.deleteSelectedClips();
            return;
        }
        if ((e.ctrlKey || e.metaKey) && key === 'z') { e.preventDefault(); this.undo(); return; }
        if ((e.ctrlKey || e.metaKey) && key === 'y') { e.preventDefault(); this.redo(); return; }

    }, true); 
};

window.EditorApp.prototype.updateCommandBuffer = function(char) {
    if (char === 'Backspace') {
        this.commandBuffer = this.commandBuffer.slice(0, -1);
    } else if (char.length === 1) {
        this.commandBuffer += char;
    }
    if (this.cmdBufferEl) this.cmdBufferEl.innerText = this.commandBuffer;
};

window.EditorApp.prototype.clearCommand = function() {
    this.commandBuffer = "";
    if (this.cmdBufferEl) this.cmdBufferEl.innerText = "";
};

// --- Execution Logic ---

window.EditorApp.prototype.executeCommand = function() {
    const cmd = this.commandBuffer.trim().toLowerCase();
    if (!cmd) return;
    
    this.log(`🚀 Executing: ${cmd}`);

    // 🔥 0. Undo / Redo
    if (cmd === 'undo') {
        this.undo();
        this.clearCommand();
        return;
    }
    if (cmd === 'redo') {
        this.redo();
        this.clearCommand();
        return;
    }
    
    // 🔥 1. Range Delete: d10s:20sv3
    const rangeDelRegex = /^d([0-9hms]+):([0-9hms]+)([vta]\d+)$/;
    const rangeDelMatch = cmd.match(rangeDelRegex);

    if (rangeDelMatch) {
        const startTime = this.parseSmartTime(rangeDelMatch[1]);
        const endTime = this.parseSmartTime(rangeDelMatch[2]);
        const trackName = rangeDelMatch[3].toUpperCase();

        if (endTime <= startTime) {
            this.log(`⚠️ Invalid Range: End must be after Start.`);
            return;
        }

        this.executeRangeDelete(startTime, endTime, trackName);
        this.clearCommand();
        return;
    }

    // 🔥 2. Clip Index Delete: d1v2 (Delete 1st clip on V2)
    const clipDelRegex = /^d(\d+)([vta]\d+)$/;
    const clipDelMatch = cmd.match(clipDelRegex);

    if (clipDelMatch) {
        const index = parseInt(clipDelMatch[1]); 
        const trackName = clipDelMatch[2].toUpperCase();
        
        this.executeClipIndexDelete(index, trackName);
        this.clearCommand();
        return;
    }

    // 🔥 3. Clear Track Command: dv2
    const trackClearRegex = /^d([vta]\d+)$/;
    const trackClearMatch = cmd.match(trackClearRegex);

    if (trackClearMatch) {
        const trackName = trackClearMatch[1].toUpperCase();
        this.executeTrackClear(trackName);
        this.clearCommand();
        return;
    }

    // 4. Upload Command: u10s:20sv1
    const uploadRegex = /^u([0-9hms]+)(?::([0-9hms]+))?([vta]\d+)$/;
    const uploadMatch = cmd.match(uploadRegex);

    if (uploadMatch) {
        const startTimeStr = uploadMatch[1];
        const endTimeStr = uploadMatch[2]; 
        const trackName = uploadMatch[3].toUpperCase();

        const startTime = this.parseSmartTime(startTimeStr);
        let finalDuration = null;

        if (endTimeStr) {
            const endTime = this.parseSmartTime(endTimeStr);
            if (endTime > startTime) {
                finalDuration = endTime - startTime;
            } else {
                this.log(`⚠️ Invalid Time: End time must be after Start.`);
                return;
            }
        }

        this.executeUploadCommand(startTime, finalDuration, trackName);
        this.clearCommand();
        return;
    }

    // 5. Cut Command: c20sv1
    const cutRegex = /^c(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?([vta]\d+)$/;
    const cutMatch = cmd.match(cutRegex);
    
    if (cutMatch) {
        const h = parseInt(cutMatch[1] || 0);
        const m = parseInt(cutMatch[2] || 0);
        const s = parseInt(cutMatch[3] || 0);
        const trackName = cutMatch[4].toUpperCase();
        
        const totalSeconds = (h * 3600) + (m * 60) + s;
        this.executeCutCommand(totalSeconds, trackName);
        this.clearCommand();
        return;
    }

    // 6. Move Command: mv...
    if (cmd.startsWith('mv')) {
        this.executeMoveCommand(cmd.substring(2));
        this.clearCommand();
        return;
    }

    // 🔥 7. Remove Silence Command: rmsa1ea2v2
    const rmsRegex = /^rms([vta]\d+)e(.+)$/i;
    const rmsMatch = cmd.match(rmsRegex);

    if (rmsMatch) {
        const sourceTrack = rmsMatch[1].toUpperCase();
        const exceptionsStr = rmsMatch[2].toUpperCase();
        const exceptions = exceptionsStr.match(/[vta]\d+/gi) || [];
        
        this.executeRemoveSilenceCommand(sourceTrack, exceptions);
        this.clearCommand();
        return;
    }

    // ✨ 8. Uniform Scale Command: sc70%1v4
    const scaleRegex = /^sc(\d+)%?(\d+)([vta]\d+)$/i;
    const scaleMatch = cmd.match(scaleRegex);
    if (scaleMatch) {
        const val = parseInt(scaleMatch[1]);
        const index = parseInt(scaleMatch[2]);
        const trackName = scaleMatch[3].toUpperCase();
        this.executePropertyCommand(trackName, index, 'scale', val);
        this.clearCommand();
        return;
    }

    // ✨ 9. Opacity Command: op50%1v4
    const opacityRegex = /^op(\d+)%?(\d+)([vta]\d+)$/i;
    const opacityMatch = cmd.match(opacityRegex);
    if (opacityMatch) {
        const val = parseInt(opacityMatch[1]);
        const index = parseInt(opacityMatch[2]);
        const trackName = opacityMatch[3].toUpperCase();
        this.executePropertyCommand(trackName, index, 'opacity', val);
        this.clearCommand();
        return;
    }

    // ✨ 10. Rotation Command: ro90d1v4
    const rotationRegex = /^ro(-?\d+)d?(\d+)([vta]\d+)$/i;
    const rotationMatch = cmd.match(rotationRegex);
    if (rotationMatch) {
        const val = parseInt(rotationMatch[1]);
        const index = parseInt(rotationMatch[2]);
        const trackName = rotationMatch[3].toUpperCase();
        this.executePropertyCommand(trackName, index, 'rotation', val);
        this.clearCommand();
        return;
    }

    // 🔥✨ 11. Scale X (Stretch Width): sx150%1v4
    const scaleXRegex = /^sx(\d+)%?(\d+)([vta]\d+)$/i;
    const scaleXMatch = cmd.match(scaleXRegex);
    if (scaleXMatch) {
        const val = parseInt(scaleXMatch[1]);
        const index = parseInt(scaleXMatch[2]);
        const trackName = scaleXMatch[3].toUpperCase();
        this.executePropertyCommand(trackName, index, 'scaleX', val);
        this.clearCommand();
        return;
    }

    // 🔥✨ 12. Scale Y (Stretch Height): sy50%1v4
    const scaleYRegex = /^sy(\d+)%?(\d+)([vta]\d+)$/i;
    const scaleYMatch = cmd.match(scaleYRegex);
    if (scaleYMatch) {
        const val = parseInt(scaleYMatch[1]);
        const index = parseInt(scaleYMatch[2]);
        const trackName = scaleYMatch[3].toUpperCase();
        this.executePropertyCommand(trackName, index, 'scaleY', val);
        this.clearCommand();
        return;
    }

    // 🔥✨ 13. Fit to Size (Squeeze to Shape): sz500x300y1v4
    // Format: sz[Width]x[Height]y[Index][Track]
    // Changed pattern to include 'y' separator before index/track
    const sizeRegex = /^sz(\d+)x(\d+)y(\d+)([vta]\d+)$/i;
    const sizeMatch = cmd.match(sizeRegex);
    if (sizeMatch) {
        const w = parseInt(sizeMatch[1]);
        const h = parseInt(sizeMatch[2]);
        const index = parseInt(sizeMatch[3]);
        const trackName = sizeMatch[4].toUpperCase();
        
        // Pass object as value for special 'size' property
        this.executePropertyCommand(trackName, index, 'size', { width: w, height: h });
        this.clearCommand();
        return;
    }

    this.log("❌ Unknown Command");
    setTimeout(() => this.clearCommand(), 1000);
};

// 🔥✨ Helper: Execute Property Command (Scale, Opacity, Rotation, Size)
window.EditorApp.prototype.executePropertyCommand = function(trackName, clipIndex, property, value) {
    const track = this.tracks.find(t => t.name === trackName);
    if (!track) { this.log(`❌ Track ${trackName} not found.`); return; }

    // 1. Sort clips to match visual order (timeline order)
    const sortedClips = [...track.clips].sort((a, b) => a.start - b.start);
    
    if (clipIndex < 1 || clipIndex > sortedClips.length) {
        this.log(`⚠️ Invalid Clip Index: ${clipIndex}. Track has ${sortedClips.length} clips.`);
        return;
    }

    const targetClip = sortedClips[clipIndex - 1]; 
    this.saveState(); // Save undo state

    // 2. Ensure Properties Exist (Using pro_features logic)
    if (typeof window.ensureProProperties === 'function') {
        window.ensureProProperties(targetClip);
    } else {
        // Fallback defaults
        if (!targetClip.properties) targetClip.properties = { 
            scale: 100, positionX: 0, positionY: 0, rotation: 0, opacity: 100 
        };
    }

    // 3. Apply Property
    if (property === 'scale') targetClip.properties.scale = value;
    else if (property === 'scaleX') targetClip.properties.scaleX = value; // New
    else if (property === 'scaleY') targetClip.properties.scaleY = value; // New
    else if (property === 'opacity') targetClip.properties.opacity = Math.max(0, Math.min(100, value));
    else if (property === 'rotation') targetClip.properties.rotation = value;
    else if (property === 'size') {
        // Force specific pixel dimensions
        targetClip.properties.forcedWidth = value.width;
        targetClip.properties.forcedHeight = value.height;
        // Reset scales to avoid conflicts
        targetClip.properties.scale = 100;
        targetClip.properties.scaleX = 100;
        targetClip.properties.scaleY = 100;
        this.log(`✨ Squeezed ${targetClip.name} to ${value.width}x${value.height}px`);
        this.requestRedraw();
        return;
    }

    // 4. Update UI & Redraw
    this.log(`✨ Set ${property} to ${value} on ${targetClip.name}`);
    this.requestRedraw();
    
    // If this clip is currently selected, update the Side Panel Controls
    if (this.selectedClipIds.has(targetClip.id)) {
        if (typeof this.updateEffectControls === 'function') {
            this.updateEffectControls();
        }
    }
};

// Helper: Clear Entire Track
window.EditorApp.prototype.executeTrackClear = function(trackName) {
    const track = this.tracks.find(t => t.name === trackName);
    if (!track) { this.log(`❌ Track ${trackName} not found.`); return; }

    if (track.clips.length === 0) {
        this.log(`⚠️ Track ${trackName} is already empty.`);
        return;
    }

    this.saveState();
    const count = track.clips.length;
    track.clips = []; // Wipe everything
    
    this.log(`🗑️ Cleared ${count} clips from ${trackName}`);
    this.requestRedraw();
    this.renderTracks();
};

// Helper: Delete Range (Seconds)
window.EditorApp.prototype.executeRangeDelete = function(startTime, endTime, trackName) {
    const track = this.tracks.find(t => t.name === trackName);
    if (!track) { this.log(`❌ Track ${trackName} not found.`); return; }

    this.saveState(); 

    const originalTime = this.currentTime;

    // 1. Split at End
    this.currentTime = endTime;
    let clipsAtEnd = track.getClipsAtTime(endTime);
    if (clipsAtEnd.length > 0) {
        this.performSplit(clipsAtEnd[0], track, { simulated: true });
    }

    // 2. Split at Start
    this.currentTime = startTime;
    let clipsAtStart = track.getClipsAtTime(startTime);
    if (clipsAtStart.length > 0) {
        this.performSplit(clipsAtStart[0], track, { simulated: true });
    }

    this.currentTime = originalTime;

    // 3. Identify and Delete Clips in the range
    const initialCount = track.clips.length;
    // Filter out clips inside range
    track.clips = track.clips.filter(c => {
        const midPoint = c.start + (c.duration / 2);
        const shouldDelete = midPoint >= startTime && midPoint < endTime;
        return !shouldDelete;
    });
    
    const deletedCount = initialCount - track.clips.length;

    if (deletedCount === 0) {
        this.log(`⚠️ No clips found to delete between ${this.formatTime(startTime)} and ${this.formatTime(endTime)}`);
        return;
    }
    
    this.log(`🗑️ Deleted ${deletedCount} segments from ${this.formatTime(startTime)} to ${this.formatTime(endTime)}`);
    this.requestRedraw();
    this.renderTracks();
};

// 🔥 FIX: Delete Clip by Index (Hard Delete)
window.EditorApp.prototype.executeClipIndexDelete = function(index, trackName) {
    const track = this.tracks.find(t => t.name === trackName);
    if (!track) { this.log(`❌ Track ${trackName} not found.`); return; }

    // Sort clips by time to ensure index matches visual order
    const sortedClips = [...track.clips].sort((a, b) => a.start - b.start);
    
    if (index < 1 || index > sortedClips.length) {
        this.log(`⚠️ Invalid Clip Index: ${index}. Track has ${sortedClips.length} clips.`);
        return;
    }

    const clipToDelete = sortedClips[index - 1]; 
    this.saveState();
    
    // 🔥 Force Delete by ID Filter (Avoids relying on removeClip method)
    track.clips = track.clips.filter(c => c.id !== clipToDelete.id);
    
    this.log(`🗑️ Deleted Clip #${index} from ${trackName}`);
    this.requestRedraw();
    this.renderTracks();
};

// Helper: Parse Time
window.EditorApp.prototype.parseSmartTime = function(timeStr) {
    if (!timeStr) return 0;
    const matches = timeStr.matchAll(/(\d+)([hms])/g);
    let totalSeconds = 0;
    let found = false;

    for (const match of matches) {
        found = true;
        const val = parseInt(match[1]);
        const unit = match[2];
        if (unit === 'h') totalSeconds += val * 3600;
        if (unit === 'm') totalSeconds += val * 60;
        if (unit === 's') totalSeconds += val;
    }
    
    if (!found && !isNaN(timeStr)) return parseInt(timeStr);
    return totalSeconds;
};

// 🔥 FIX: Added saveState() before upload
window.EditorApp.prototype.executeUploadCommand = function(startTime, customDuration, trackName) {
    const track = this.tracks.find(t => t.name === trackName);
    if (!track) {
        this.log(`❌ Track ${trackName} not found.`);
        return;
    }

    this.log(`📂 Select file for ${trackName} at ${this.formatTime(startTime)}...`);

    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*,video/*,audio/*';
    
    input.onchange = (e) => {
        if (e.target.files.length === 0) return;
        const file = e.target.files[0];
        const url = URL.createObjectURL(file);
        const type = file.type.startsWith('image') ? 'image' : (file.type.startsWith('audio') ? 'audio' : 'video');
        
        const assetId = `u_asset_${Date.now()}`;
        this.assetsList.push({ id: assetId, name: file.name, type: type, src: url });
        if(this.renderAssetsLibrary) this.renderAssetsLibrary();

        const insertClip = (finalDuration) => {
            // 🔥 CRITICAL FIX: Save State BEFORE adding clip
            this.saveState();

            const clip = new Clip(`u_clip_${Date.now()}`, file.name, startTime, finalDuration, type, url);
            track.addClip(clip);
            if(this.resolveCollisions) this.resolveCollisions(track.id, clip);
            
            if (type === 'video') {
                const audioTrack = this.tracks.find(t => t.type === 'audio');
                if (audioTrack) {
                    const aClip = new Clip(`u_aclip_${Date.now()}`, `${file.name} [Audio]`, startTime, finalDuration, 'audio', url);
                    audioTrack.addClip(aClip);
                    if(this.resolveCollisions) this.resolveCollisions(audioTrack.id, aClip);
                }
            }
            this.log(`✅ Added ${file.name} (Duration: ${finalDuration.toFixed(1)}s)`);
            this.renderTracks();
            if(this.syncOverlays) this.syncOverlays();
            this.requestRedraw();
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

window.EditorApp.prototype.executeCutCommand = function(time, trackName) {
    const track = this.tracks.find(t => t.name === trackName);
    if (!track) { this.log(`❌ Track ${trackName} not found.`); return; }

    const clips = track.getClipsAtTime(time);
    if (clips.length === 0) { this.log(`⚠️ No clip at ${this.formatTime(time)} on ${trackName}`); return; }

    const clip = clips[0];
    const originalTime = this.currentTime;
    this.currentTime = time; 
    
    this.saveState(); // Ensure Cut is also undoable
    this.performSplit(clip, track, { simulated: true });
    
    this.currentTime = originalTime;
    this.updatePlayheadPosition();
};

window.EditorApp.prototype.executeMoveCommand = function(paramsStr) {
    const clipNameMatch = paramsStr.match(/(\d+[vta]\d+)$/i);
    if (!clipNameMatch) { this.log("❌ Invalid Move Command: Target clip not found."); return; }
    
    const targetClipName = clipNameMatch[1];
    const transformsStr = paramsStr.substring(0, paramsStr.lastIndexOf(targetClipName));
    
    let targetClip = null;
    for (const t of this.tracks) {
        const found = t.clips.find(c => c.name.toLowerCase() === targetClipName.toLowerCase());
        if (found) { targetClip = found; break; }
    }
    
    if (!targetClip) { this.log(`❌ Clip ${targetClipName} not found.`); return; }

    if (typeof window.ensureProProperties === 'function') {
        window.ensureProProperties(targetClip);
    }

    const isAiMode = targetClip.aiSegmentation && targetClip.aiSegmentation.enabled;

    const resolveVal = (valStr, axis) => {
        if (!valStr) return null;
        if (!isNaN(valStr)) return parseInt(valStr);
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
        this.saveState(); // Save before move
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
        this.log(`✅ Moved ${targetClipName} (${isAiMode ? 'Sandwich' : 'Standard'})`);
        this.requestRedraw();
        this.updateEffectControls();
    } else {
        this.log(`⚠️ No valid moves in "${transformsStr}"`);
    }
};

// 🔥 NEW: Execute Remove Silence Command
window.EditorApp.prototype.executeRemoveSilenceCommand = async function(sourceTrackName, exceptionTracks) {
    const track = this.tracks.find(t => t.name === sourceTrackName);
    if (!track) { this.log(`❌ Track ${sourceTrackName} not found.`); return; }
    if (track.type !== 'audio' && track.type !== 'video') { this.log("❌ Source must be audio/video."); return; }

    const normalizedExceptions = exceptionTracks.map(t => t.toUpperCase());
    this.log(`🔍 Analyzing silence on ${sourceTrackName}...`);
    
    // 1. Find Silence Intervals
    const intervals = await this.detectSilenceIntervals(track);
    
    if (intervals.length === 0) {
        this.log("⚠️ No silence detected.");
        return;
    }
    
    this.log(`✂️ Found ${intervals.length} silent gaps. Removing...`);
    
    // 2. Execute Ripple Deletes (Reverse Order)
    // We reverse to keep time indices valid for earlier cuts
    intervals.sort((a, b) => b.start - a.start);
    
    this.saveState();
    
    let deletedCount = 0;
    
    for (const interval of intervals) {
        this.executeMultiTrackRippleDelete(interval.start, interval.end, normalizedExceptions);
        deletedCount++;
    }
    
    this.log(`✅ Removed ${deletedCount} gaps. Timeline compacted.`);
    this.requestRedraw();
    this.renderTracks();
};

window.EditorApp.prototype.detectSilenceIntervals = async function(track) {
    const intervals = [];
    const SILENCE_THRESH = 0.02; // 2% volume
    const MIN_DURATION = 0.5; // seconds
    
    const sortedClips = [...track.clips].sort((a, b) => a.start - b.start);
    
    for (const clip of sortedClips) {
        // Ensure Audio Buffer Exists
        let buffer = this.sharedAudioBuffers ? this.sharedAudioBuffers.get(clip.src) : null;
        
        if (!buffer) {
             try {
                // Fetch if not available in cache
                const resp = await fetch(clip.src);
                const ab = await resp.arrayBuffer();
                if(this.audioCtxForAnalysis) {
                    buffer = await this.audioCtxForAnalysis.decodeAudioData(ab);
                    if(this.sharedAudioBuffers) this.sharedAudioBuffers.set(clip.src, buffer);
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
             for(let j=0; j<step && (i+j)<endSample; j++) {
                 const val = Math.abs(data[i+j]);
                 if(val > localMax) localMax = val;
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

window.EditorApp.prototype.executeMultiTrackRippleDelete = function(start, end, exceptions) {
    const duration = end - start;
    
    this.tracks.forEach(track => {
        if (exceptions.includes(track.name.toUpperCase())) return;
        
        // 1. Split at Boundaries
        let clipsAtEnd = track.getClipsAtTime(end);
        if (clipsAtEnd.length > 0) this.performSplit(clipsAtEnd[0], track, { simulated: true });
        
        let clipsAtStart = track.getClipsAtTime(start);
        if (clipsAtStart.length > 0) this.performSplit(clipsAtStart[0], track, { simulated: true });
        
        // 2. Delete Clips Inside
        const EPSILON = 0.001;
        track.clips = track.clips.filter(c => {
             const cMid = c.start + (c.duration/2);
             return !(cMid > start - EPSILON && cMid < end + EPSILON);
        });
        
        // 3. Ripple Shift Left
        track.clips.forEach(c => {
            if (c.start >= end - EPSILON) {
                c.start -= duration;
            }
        });
    });
};