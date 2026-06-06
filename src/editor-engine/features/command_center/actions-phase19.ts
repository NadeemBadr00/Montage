// @ts-nocheck
// actions-phase19.ts - Enhanced AutoMontage, Storyboard, Mood, Cleanup

window.EditorApp.prototype.executeStoryboard = function() {
    this.log("🎨 جاري توليد لوحة القصة المصورة (Storyboard)...");
    const mainTrack = this.tracks.find(t => t.type === 'main');
    if (!mainTrack || mainTrack.clips.length === 0) {
        this.log("❌ التايم لاين فارغ. يرجى إضافة فيديوهات أولاً.");
        return;
    }
    this.log("📊 لوحة القصة المصورة لمشروعك:");
    this.log("═══════════════════════════════════");
    mainTrack.clips.forEach((clip, i) => {
        const startFmt = new Date(clip.start * 1000).toISOString().substr(14, 5);
        const endFmt   = new Date((clip.start + clip.duration) * 1000).toISOString().substr(14, 5);
        this.log(`📌 Scene ${i+1}: [${startFmt} → ${endFmt}] — "${clip.name || 'Unnamed Clip'}"`);
    });
    this.log("═══════════════════════════════════");
    this.log(`📏 المدة الكلية: ${this.duration?.toFixed(1)}s | ${mainTrack.clips.length} مشاهد`);
};

window.EditorApp.prototype.executeMoodMode = function(mood: string) {
    this.log(`🌡️ جاري تطبيق المزاج: ${mood.toUpperCase()}...`);
    const moodPresets: Record<string, any> = {
        happy:      { brightness: 115, saturation: 130, contrast: 105, hue: 10 },
        sad:        { brightness: 85,  saturation: 60,  contrast: 110, hue: -10 },
        epic:       { brightness: 100, saturation: 80,  contrast: 130, hue: 0 },
        horror:     { brightness: 70,  saturation: 20,  contrast: 140, hue: -20 },
        romantic:   { brightness: 110, saturation: 110, contrast: 95,  hue: 15 },
        cyberpunk:  { brightness: 90,  saturation: 150, contrast: 120, hue: 200 },
        vintage:    { brightness: 95,  saturation: 60,  contrast: 95,  hue: 30 },
    };
    const preset = moodPresets[mood.toLowerCase()];
    if (!preset) {
        this.log(`❌ مزاج غير معروف. الخيارات: happy, sad, epic, horror, romantic, cyberpunk, vintage`);
        return;
    }
    // Apply to ALL video clips
    let count = 0;
    this.tracks.forEach(track => {
        track.clips.forEach(clip => {
            if (clip.type === 'video' || clip.type === 'image') {
                clip.properties = clip.properties || {};
                Object.assign(clip.properties, preset);
                count++;
            }
        });
    });
    this.saveState();
    this.requestRedraw();
    this.commitStateToReact();
    this.log(`✅ تم تطبيق مزاج "${mood}" على ${count} مقطع!`);
};

window.EditorApp.prototype.executeCleanupTimeline = function() {
    this.log("🧹 جاري تنظيف التايم لاين وإزالة الفراغات...");
    let removed = 0;
    this.tracks.forEach(track => {
        // Sort clips by start time
        track.clips.sort((a: any, b: any) => a.start - b.start);
        // Remove zero-duration or negative-duration clips
        const before = track.clips.length;
        track.clips = track.clips.filter((c: any) => c.duration > 0.05);
        removed += before - track.clips.length;
        
        // Close gaps (ripple left)
        let cursor = 0;
        track.clips.forEach((clip: any) => {
            if (clip.start > cursor + 0.05) {
                clip.start = cursor;
            }
            cursor = clip.start + clip.duration;
        });
    });
    this.saveState();
    this.requestRedraw();
    this.commitStateToReact();
    this.log(`✅ تم التنظيف! إزالة ${removed} كليب فارغ وضغط الفراغات.`);
};
