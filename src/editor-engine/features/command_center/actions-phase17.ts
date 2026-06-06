// @ts-nocheck
// actions-phase17.ts - Text outline, shadow, bold, size controls

window.EditorApp.prototype.executeTextOutline = function(color: string) {
    this.log(`🔡 جاري إضافة حد خارجي للنص (Outline) باللون: ${color}...`);
    const selectedIds = Array.from(this.selectedClipIds);
    if (selectedIds.length === 0) { this.log("❌ يرجى تحديد نص أولاً."); return; }
    this.tracks.forEach(track => {
        track.clips.forEach(clip => {
            if (selectedIds.includes(clip.id) && clip.type === 'text') {
                clip.textStyle = clip.textStyle || {};
                clip.textStyle.stroke = color || '#000000';
                clip.textStyle.strokeThickness = clip.textStyle.strokeThickness || 4;
            }
        });
    });
    this.saveState();
    this.requestRedraw();
    this.commitStateToReact();
    this.log("✅ تم تطبيق الحد الخارجي على النص!");
};

window.EditorApp.prototype.executeTextShadow = function(strength: number) {
    this.log(`🌑 جاري إضافة ظل للنص (Shadow) بقوة ${strength}...`);
    const selectedIds = Array.from(this.selectedClipIds);
    if (selectedIds.length === 0) { this.log("❌ يرجى تحديد نص أولاً."); return; }
    this.tracks.forEach(track => {
        track.clips.forEach(clip => {
            if (selectedIds.includes(clip.id) && clip.type === 'text') {
                clip.textStyle = clip.textStyle || {};
                clip.textStyle.shadowColor = 'rgba(0,0,0,0.8)';
                clip.textStyle.shadowBlur = strength || 10;
                clip.textStyle.shadowOffsetX = 3;
                clip.textStyle.shadowOffsetY = 3;
            }
        });
    });
    this.saveState();
    this.requestRedraw();
    this.commitStateToReact();
    this.log("✅ تم تطبيق الظل على النص!");
};

window.EditorApp.prototype.executeToggleBold = function() {
    this.log("🔠 جاري تبديل الخط العريض (Bold)...");
    const selectedIds = Array.from(this.selectedClipIds);
    if (selectedIds.length === 0) { this.log("❌ يرجى تحديد نص أولاً."); return; }
    this.tracks.forEach(track => {
        track.clips.forEach(clip => {
            if (selectedIds.includes(clip.id) && clip.type === 'text') {
                clip.textStyle = clip.textStyle || {};
                clip.textStyle.bold = !clip.textStyle.bold;
            }
        });
    });
    this.saveState();
    this.requestRedraw();
    this.commitStateToReact();
    this.log("✅ تم تبديل الخط العريض!");
};

window.EditorApp.prototype.executeTextScale = function(size: number) {
    this.log(`📏 جاري ضبط حجم النص إلى ${size}px...`);
    const selectedIds = Array.from(this.selectedClipIds);
    if (selectedIds.length === 0) { this.log("❌ يرجى تحديد نص أولاً."); return; }
    this.tracks.forEach(track => {
        track.clips.forEach(clip => {
            if (selectedIds.includes(clip.id) && clip.type === 'text') {
                clip.textStyle = clip.textStyle || {};
                clip.textStyle.fontSize = size;
            }
        });
    });
    this.saveState();
    this.requestRedraw();
    this.commitStateToReact();
    this.log(`✅ تم تغيير حجم النص إلى ${size}px!`);
};
