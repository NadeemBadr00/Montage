// @ts-nocheck
// actions-phase15.ts - Camera Shake, Vignette, Blur, Glitch Effects

window.EditorApp.prototype.executeCameraShake = function() {
    this.log("📳 جاري تطبيق تأثير اهتزاز الكاميرا (Camera Shake)...");
    const selectedIds = Array.from(this.selectedClipIds);
    if (selectedIds.length === 0) { this.log("❌ يرجى تحديد مقطع فيديو أولاً."); return; }
    this.tracks.forEach(track => {
        track.clips.forEach(clip => {
            if (selectedIds.includes(clip.id)) {
                clip.properties = clip.properties || {};
                clip.properties.shakeIntensity = 8;
                clip.properties.shakeFrequency = 15;
            }
        });
    });
    this.saveState();
    this.requestRedraw();
    this.commitStateToReact();
    this.log("✅ تم تطبيق Camera Shake على المقطع!");
};

window.EditorApp.prototype.executeVignette = function() {
    this.log("🔲 جاري إضافة تأثير الحواف الداكنة (Vignette)...");
    let overlayTrack = this.tracks.find(t => t.type === 'overlay');
    if (!overlayTrack) {
        overlayTrack = { id: 'track_overlay_' + Date.now(), type: 'overlay', name: 'Overlay', clips: [] };
        this.tracks.push(overlayTrack);
    }
    // Check toggle
    const existingIdx = overlayTrack.clips.findIndex(c => c.name === 'VignetteOverlay');
    if (existingIdx >= 0) {
        overlayTrack.clips.splice(existingIdx, 1);
        this.log("✅ تم إزالة الـ Vignette.");
    } else {
        overlayTrack.clips.push({
            id: 'clip_vignette_' + Date.now(),
            name: 'VignetteOverlay',
            type: 'shape',
            shapeType: 'vignette',
            start: 0,
            duration: this.duration || 30,
            sourceIn: 0,
            properties: { opacity: 70, shapeColor: '#000000' }
        });
        this.log("✅ تم إضافة الـ Vignette!");
    }
    this.saveState();
    this.requestRedraw();
    this.commitStateToReact();
};

window.EditorApp.prototype.executeBlurEffect = function(amount: number) {
    this.log(`💨 جاري تطبيق Gaussian Blur بقوة ${amount}...`);
    const selectedIds = Array.from(this.selectedClipIds);
    if (selectedIds.length === 0) { this.log("❌ يرجى تحديد مقطع أولاً."); return; }
    this.tracks.forEach(track => {
        track.clips.forEach(clip => {
            if (selectedIds.includes(clip.id)) {
                clip.properties = clip.properties || {};
                clip.properties.blur = amount;
            }
        });
    });
    this.saveState();
    this.requestRedraw();
    this.commitStateToReact();
    this.log(`✅ تم تطبيق Blur بقوة ${amount}px!`);
};

window.EditorApp.prototype.executeGlitchEffect = function() {
    this.log("⚡ جاري تطبيق تأثير Glitch الرقمي...");
    const selectedIds = Array.from(this.selectedClipIds);
    if (selectedIds.length === 0) { this.log("❌ يرجى تحديد مقطع أولاً."); return; }
    this.tracks.forEach(track => {
        track.clips.forEach(clip => {
            if (selectedIds.includes(clip.id)) {
                clip.properties = clip.properties || {};
                clip.properties.glitch = !clip.properties.glitch;
                clip.properties.glitchIntensity = 0.3;
            }
        });
    });
    this.saveState();
    this.requestRedraw();
    this.commitStateToReact();
    this.log("✅ تم تفعيل/إلغاء تأثير الـ Glitch!");
};
