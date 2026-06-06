// @ts-nocheck
// actions-phase14.ts - Social Media Presets, Pitch, Color Match, GIF Export

window.EditorApp.prototype.executePitchShift = function(semitones: number) {
    this.log(`🎵 جاري تطبيق Pitch Shift بمقدار ${semitones} نصف طبقة...`);
    const selectedIds = Array.from(this.selectedClipIds);
    if (selectedIds.length === 0) { this.log("❌ يرجى تحديد مقطع صوتي أولاً."); return; }
    this.tracks.forEach(track => {
        track.clips.forEach(clip => {
            if (selectedIds.includes(clip.id)) {
                clip.properties = clip.properties || {};
                clip.properties.pitchShift = semitones;
            }
        });
    });
    this.saveState();
    this.commitStateToReact();
    this.log(`✅ تم تعديل نبرة الصوت بمقدار ${semitones > 0 ? '+' : ''}${semitones} طبقة!`);
};

window.EditorApp.prototype.executeColorMatch = function() {
    this.log("🎨 جاري مطابقة الألوان (Color Match) بين الكليبات...");
    const selectedIds = Array.from(this.selectedClipIds);
    if (selectedIds.length < 2) { this.log("❌ يرجى تحديد كليبين على الأقل (المصدر والهدف)."); return; }
    // Apply averaged color grading between two clips
    this.tracks.forEach(track => {
        let clips = track.clips.filter(c => selectedIds.includes(c.id));
        if (clips.length >= 2) {
            const source = clips[0];
            const target = clips[1];
            target.properties = target.properties || {};
            target.properties.brightness = source.properties?.brightness || 100;
            target.properties.contrast = source.properties?.contrast || 100;
            target.properties.saturation = source.properties?.saturation || 100;
        }
    });
    this.saveState();
    this.requestRedraw();
    this.commitStateToReact();
    this.log("✅ تم مطابقة ألوان الكليب الثاني مع الأول!");
};

window.EditorApp.prototype.executeGifExport = function() {
    this.log("📸 جاري تجهيز تصدير GIF...");
    this.log("⚠️ تصدير GIF من الفيديو يتطلب معالجة خارجية. يمكنك استخدام FFMPEG أو أداة مثل ezgif.com لتحويل المقطع.");
    this.log("✅ يمكنك تصدير المقطع كـ MP4 أولاً ثم تحويله إلى GIF.");
    // Trigger the regular export for the selected range
    if (this.executeExport) {
        this.executeExport({ format: 'mp4', quality: 'medium' });
    }
};

window.EditorApp.prototype.executeSocialPreset = function(platform: string) {
    this.log(`📱 جاري تطبيق إعدادات منصة: ${platform.toUpperCase()}`);
    const presets = {
        tiktok:    { width: 1080, height: 1920, fps: 30, name: 'TikTok (9:16)' },
        instagram: { width: 1080, height: 1080, fps: 30, name: 'Instagram Square (1:1)' },
        youtube:   { width: 1920, height: 1080, fps: 30, name: 'YouTube (16:9)' },
        reel:      { width: 1080, height: 1920, fps: 30, name: 'Instagram Reel (9:16)' },
        shorts:    { width: 1080, height: 1920, fps: 60, name: 'YouTube Shorts (9:16)' },
        twitter:   { width: 1280, height: 720,  fps: 30, name: 'Twitter/X (16:9)' },
    };
    const preset = presets[platform.toLowerCase()];
    if (!preset) {
        this.log(`❌ منصة غير معروفة. الخيارات: tiktok, instagram, youtube, reel, shorts, twitter`);
        return;
    }
    this.canvasWidth  = preset.width;
    this.canvasHeight = preset.height;
    this.fps = preset.fps;
    this.saveState();
    this.requestRedraw();
    this.commitStateToReact();
    this.log(`✅ تم تطبيق إعدادات ${preset.name}: ${preset.width}×${preset.height} @ ${preset.fps}fps`);
};
