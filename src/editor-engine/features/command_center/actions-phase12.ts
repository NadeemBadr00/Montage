// @ts-nocheck
// actions-phase12.ts - Phase 12 Features (Chroma Key, Auto Zoom, Audio Waveforms, Freeze Frame)

window.EditorApp.prototype.executeChromaKey = function() {
    this.log("🟢 جاري تفعيل تفريغ الخلفية الخضراء (Chroma Key)...");
    
    const selectedIds = Array.from(this.selectedClipIds);
    if (selectedIds.length === 0) {
        this.log("❌ يرجى تحديد مقطع فيديو أولاً.");
        return;
    }
    
    let appliedCount = 0;
    this.tracks.forEach(track => {
        track.clips.forEach(clip => {
            if (selectedIds.includes(clip.id) && clip.type === 'video') {
                clip.properties = clip.properties || {};
                // Toggle chroma key
                clip.properties.chromaKey = !clip.properties.chromaKey;
                clip.properties.chromaColor = '#00FF00'; // Default green
                clip.properties.chromaTolerance = 0.4;
                appliedCount++;
            }
        });
    });
    
    if (appliedCount > 0) {
        this.saveState();
        this.requestRedraw();
        this.commitStateToReact();
        this.log("✅ تم تطبيق الكروما بنجاح! إذا كانت مدعومة في الـ Renderer ستصبح الخلفية شفافة.");
    }
};

window.EditorApp.prototype.executeAutoZoom = function(direction: string) {
    this.log(`🔍 جاري تفعيل الزووم التلقائي البطيء (${direction})...`);
    
    const selectedIds = Array.from(this.selectedClipIds);
    if (selectedIds.length === 0) {
        this.log("❌ يرجى تحديد مقطع فيديو أولاً.");
        return;
    }
    
    let appliedCount = 0;
    this.tracks.forEach(track => {
        track.clips.forEach(clip => {
            if (selectedIds.includes(clip.id)) {
                clip.properties = clip.properties || {};
                
                // Remove existing keyframes
                clip.keyframes = clip.keyframes || {};
                clip.keyframes.scale = [];
                
                // Add new keyframes spanning the clip duration
                if (direction === 'in') {
                    clip.keyframes.scale.push({ time: 0, value: 100, easing: 'linear' });
                    clip.keyframes.scale.push({ time: clip.duration, value: 130, easing: 'linear' });
                } else {
                    clip.keyframes.scale.push({ time: 0, value: 130, easing: 'linear' });
                    clip.keyframes.scale.push({ time: clip.duration, value: 100, easing: 'linear' });
                }
                
                appliedCount++;
            }
        });
    });
    
    if (appliedCount > 0) {
        this.saveState();
        this.requestRedraw();
        this.commitStateToReact();
        this.log("✅ تم إضافة إطارات الزووم (Keyframes) بنجاح!");
    }
};

window.EditorApp.prototype.executeAudioWaveform = function() {
    this.log("🎵 جاري إنشاء الموجات الصوتية المرئية...");
    
    let overlayTrack = this.tracks.find(t => t.type === 'overlay');
    if (!overlayTrack) {
        overlayTrack = { id: 'track_overlay_' + Date.now(), type: 'overlay', name: 'Overlay', clips: [] };
        this.tracks.push(overlayTrack);
    }
    
    const waveformClip = {
        id: 'clip_waveform_' + Date.now(),
        type: 'shape',
        shapeType: 'waveform', // Will be rendered by a custom branch in preview-renderer
        start: this.currentTime,
        duration: this.duration > this.currentTime ? this.duration - this.currentTime : 10,
        sourceIn: 0,
        properties: {
            x: 0,
            y: 30, // Bottom third
            scale: 100,
            opacity: 100,
            shapeColor: '#00FFFF' // Cyan waveform
        }
    };
    
    overlayTrack.clips.push(waveformClip);
    this.saveState();
    this.requestRedraw();
    this.commitStateToReact();
    this.log("✅ تم إضافة مقطع الموجات الصوتية للتايم لاين!");
};

window.EditorApp.prototype.executeFreezeFrame = function() {
    this.log("❄️ جاري تجميد اللقطة الحالية (Freeze Frame)...");
    
    const selectedIds = Array.from(this.selectedClipIds);
    if (selectedIds.length === 0) {
        this.log("❌ يرجى تحديد مقطع فيديو أولاً.");
        return;
    }
    
    let targetClip = null;
    let targetTrack = null;
    
    this.tracks.forEach(track => {
        track.clips.forEach(clip => {
            if (selectedIds.includes(clip.id) && clip.type === 'video') {
                targetClip = clip;
                targetTrack = track;
            }
        });
    });
    
    if (!targetClip) {
        this.log("❌ تعذر العثور على مقطع فيديو للقيام بتجميده.");
        return;
    }
    
    // Check if current time is within clip
    if (this.currentTime < targetClip.start || this.currentTime > targetClip.start + targetClip.duration) {
        this.log("❌ مؤشر التشغيل ليس فوق المقطع المحدد.");
        return;
    }
    
    this.saveState();
    
    // Split the clip at currentTime
    const splitTime = this.currentTime;
    const clip1Duration = splitTime - targetClip.start;
    const remainingDuration = targetClip.duration - clip1Duration;
    const sourceSplitTime = targetClip.sourceIn + clip1Duration;
    
    // Adjust original clip
    targetClip.duration = clip1Duration;
    
    // Create the freeze frame (simulated as an image clip or a video clip with 0 playback speed)
    const freezeDuration = 2.0; // 2 seconds freeze
    
    const freezeClip = {
        ...JSON.parse(JSON.stringify(targetClip)),
        id: 'clip_freeze_' + Date.now(),
        start: splitTime,
        duration: freezeDuration,
        sourceIn: sourceSplitTime,
        playbackSpeed: 0 // Engine will handle this as a frozen frame
    };
    freezeClip.properties = freezeClip.properties || {};
    freezeClip.properties.isFrozen = true;
    
    // Create the second half of the original clip
    const clip2 = {
        ...JSON.parse(JSON.stringify(targetClip)),
        id: 'clip_split_' + Date.now(),
        start: splitTime + freezeDuration,
        duration: remainingDuration,
        sourceIn: sourceSplitTime
    };
    
    // Insert them
    targetTrack.clips.push(freezeClip, clip2);
    
    // Shift all other clips on the timeline that are after this point
    this.tracks.forEach(t => {
        t.clips.forEach(c => {
            if (c.id !== targetClip.id && c.id !== freezeClip.id && c.id !== clip2.id) {
                if (c.start >= splitTime) {
                    c.start += freezeDuration;
                }
            }
        });
    });
    
    this.requestRedraw();
    this.commitStateToReact();
    this.log(`✅ تم تجميد اللقطة لمدة ثانيتين!`);
};
