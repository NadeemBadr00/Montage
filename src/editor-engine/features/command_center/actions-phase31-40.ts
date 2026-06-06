// @ts-nocheck
// actions-phase31-40.ts — Motion Graphics, Audio FX, Timeline Tools

// Phase 31: Motion Blur
window.EditorApp.prototype.executeMotionBlur = function(amount: number) {
    this.log(`💨 Motion Blur: ${amount}...`);
    const ids = Array.from(this.selectedClipIds);
    if (!ids.length) { this.log("❌ حدد كليب أولاً."); return; }
    this.tracks.forEach(t => t.clips.forEach(c => {
        if (ids.includes(c.id)) { c.properties = c.properties || {}; c.properties.motionBlur = amount; }
    }));
    this.saveState(); this.requestRedraw(); this.commitStateToReact();
    this.log(`✅ تم تطبيق Motion Blur!`);
};

// Phase 32: Stabilize
window.EditorApp.prototype.executeStabilize = function() {
    this.log("🎯 تطبيق تثبيت الفيديو (Stabilization)...");
    const ids = Array.from(this.selectedClipIds);
    if (!ids.length) { this.log("❌ حدد كليب فيديو أولاً."); return; }
    this.tracks.forEach(t => t.clips.forEach(c => {
        if (ids.includes(c.id) && c.type === 'video') {
            c.properties = c.properties || {}; c.properties.stabilize = true;
        }
    }));
    this.saveState(); this.commitStateToReact();
    this.log("✅ تم تفعيل التثبيت!");
};

// Phase 33: Auto Reframe 9:16
window.EditorApp.prototype.executeAutoReframe = function(ratio: string) {
    this.log(`📐 Auto Reframe للنسبة: ${ratio}...`);
    const ratioMap: any = { '9:16': [1080,1920], '1:1': [1080,1080], '16:9': [1920,1080], '4:5': [1080,1350] };
    const dims = ratioMap[ratio] || ratioMap['9:16'];
    this.canvasWidth = dims[0]; this.canvasHeight = dims[1];
    // Reframe clip positions to center
    const ids = Array.from(this.selectedClipIds);
    this.tracks.forEach(t => t.clips.forEach(c => {
        if (ids.includes(c.id)) { c.properties = c.properties || {}; c.properties.x = 0; c.properties.y = 0; }
    }));
    this.saveState(); this.requestRedraw(); this.commitStateToReact();
    this.log(`✅ تم ضبط الكانفاز للنسبة ${ratio}!`);
};

// Phase 34: Sub-clip Range Select
window.EditorApp.prototype.executeRangeSelect = function(startSec: number, endSec: number) {
    this.log(`🔲 تحديد النطاق ${startSec}s → ${endSec}s...`);
    this.rangeStart = startSec; this.rangeEnd = endSec;
    this.requestRedraw(); this.commitStateToReact();
    this.log("✅ تم تحديد النطاق (ظاهر باللون الأزرق في التايم لاين)!");
};

// Phase 35: Clip Speed Preset
window.EditorApp.prototype.executeSpeedPreset = function(preset: string) {
    const speeds: any = { 'slow': 0.25, 'half': 0.5, 'normal': 1, 'double': 2, 'quad': 4 };
    const speed = speeds[preset] || 1;
    this.log(`⏱️ ضبط السرعة: ${preset} (${speed}x)...`);
    const ids = Array.from(this.selectedClipIds);
    this.tracks.forEach(t => t.clips.forEach(c => {
        if (ids.includes(c.id)) { c.playbackSpeed = speed; }
    }));
    this.saveState(); this.requestRedraw(); this.commitStateToReact();
    this.log(`✅ تم ضبط السرعة إلى ${speed}x!`);
};

// Phase 36: Export SRT
window.EditorApp.prototype.executeExportSRT = function() {
    this.log("📄 جاري تصدير ملف SRT...");
    let srt = '';
    let index = 1;
    this.tracks.forEach(t => {
        t.clips.forEach(c => {
            if (c.type === 'text' && c.text) {
                const toTime = (s: number) => {
                    const h = Math.floor(s/3600), m = Math.floor((s%3600)/60), sec = Math.floor(s%60), ms = Math.floor((s%1)*1000);
                    return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')},${String(ms).padStart(3,'0')}`;
                };
                srt += `${index++}\n${toTime(c.start)} --> ${toTime(c.start + c.duration)}\n${c.text}\n\n`;
            }
        });
    });
    if (!srt) { this.log("❌ لا توجد نصوص للتصدير."); return; }
    const blob = new Blob([srt], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'subtitles.srt'; a.click();
    URL.revokeObjectURL(url);
    this.log(`✅ تم تصدير ملف SRT بـ ${index-1} جملة!`);
};

// Phase 37: Highlight Reel (Best Moments)
window.EditorApp.prototype.executeHighlightReel = function(durationSec: number) {
    this.log(`🎯 إنشاء Highlight Reel بمدة ${durationSec}ث...`);
    const mainTrack = this.tracks.find(t => t.type === 'main');
    if (!mainTrack || !mainTrack.clips.length) { this.log("❌ التايم لاين فارغ."); return; }
    // Pick evenly spaced clips to fill the duration
    const clips = mainTrack.clips;
    const step = Math.max(1, Math.floor(clips.length / Math.ceil(durationSec / 3)));
    const selected = clips.filter((_: any, i: number) => i % step === 0);
    this.log(`📌 اختيار ${selected.length} كليب...`);
    selected.forEach((c: any, i: number) => {
        c.start = i * 3;
        c.duration = Math.min(c.duration, 3);
    });
    mainTrack.clips = selected;
    this.duration = selected.length * 3;
    this.saveState(); this.requestRedraw(); this.commitStateToReact();
    this.log("✅ تم إنشاء Highlight Reel!");
};

// Phase 38: Safe Zone Overlay
window.EditorApp.prototype.executeSafeZone = function() {
    this.log("📺 إظهار/إخفاء منطقة الأمان (Safe Zone)...");
    this.showSafeZone = !this.showSafeZone;
    this.requestRedraw(); this.commitStateToReact();
    this.log(this.showSafeZone ? "✅ Safe Zone ظاهر!" : "✅ تم إخفاء Safe Zone!");
};

// Phase 39: Clip Rename
window.EditorApp.prototype.executeRenameClip = function(newName: string) {
    this.log(`✏️ إعادة تسمية الكليب المحدد: "${newName}"...`);
    const ids = Array.from(this.selectedClipIds);
    if (!ids.length) { this.log("❌ حدد كليب أولاً."); return; }
    this.tracks.forEach(t => t.clips.forEach(c => {
        if (ids.includes(c.id)) c.name = newName;
    }));
    this.saveState(); this.commitStateToReact();
    this.log("✅ تم إعادة تسمية الكليب!");
};

// Phase 40: Fade All Clips
window.EditorApp.prototype.executeFadeAll = function() {
    this.log("🌅 تطبيق Fade In/Out على جميع الكليبات...");
    let count = 0;
    this.tracks.forEach(t => t.clips.forEach(c => {
        c.fadeIn  = c.fadeIn  || 0.3;
        c.fadeOut = c.fadeOut || 0.3;
        count++;
    }));
    this.saveState(); this.requestRedraw(); this.commitStateToReact();
    this.log(`✅ تم تطبيق Fade على ${count} كليب!`);
};
