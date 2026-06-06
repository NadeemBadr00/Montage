// @ts-nocheck
// actions-phase18.ts - Watermark, Logo, Brand Color, Copyright

window.EditorApp.prototype.executeWatermark = function(text: string) {
    this.log(`🔏 جاري إضافة علامة مائية (Watermark): "${text}"...`);
    let overlayTrack = this.tracks.find(t => t.type === 'overlay');
    if (!overlayTrack) {
        overlayTrack = { id: 'track_overlay_' + Date.now(), type: 'overlay', name: 'Overlay', clips: [] };
        this.tracks.push(overlayTrack);
    }
    overlayTrack.clips.push({
        id: 'clip_watermark_' + Date.now(),
        name: 'Watermark',
        type: 'text',
        text: text || '@AI4Montage',
        start: 0,
        duration: this.duration || 30,
        sourceIn: 0,
        textStyle: {
            fontSize: 28, fill: '#ffffff', opacity: 40,
            fontFamily: 'Inter', align: 'left'
        },
        properties: { x: -40, y: 43, scale: 100, opacity: 40 }
    });
    this.saveState();
    this.requestRedraw();
    this.commitStateToReact();
    this.log("✅ تم إضافة العلامة المائية!");
};

window.EditorApp.prototype.executeBrandColor = function(color: string) {
    this.log(`🎨 جاري تطبيق اللون ${color} على كل النصوص (Brand Color)...`);
    let appliedCount = 0;
    this.tracks.forEach(track => {
        track.clips.forEach(clip => {
            if (clip.type === 'text') {
                clip.textStyle = clip.textStyle || {};
                clip.textStyle.fill = color;
                appliedCount++;
            }
        });
    });
    this.saveState();
    this.requestRedraw();
    this.commitStateToReact();
    this.log(`✅ تم تطبيق لون البراند على ${appliedCount} نص!`);
};

window.EditorApp.prototype.executeCopyrightStrip = function() {
    this.log("©️ جاري إضافة شريط حقوق النشر (Copyright)...");
    let overlayTrack = this.tracks.find(t => t.type === 'overlay');
    if (!overlayTrack) {
        overlayTrack = { id: 'track_overlay_' + Date.now(), type: 'overlay', name: 'Overlay', clips: [] };
        this.tracks.push(overlayTrack);
    }
    const year = new Date().getFullYear();
    overlayTrack.clips.push({
        id: 'clip_copyright_' + Date.now(),
        name: 'Copyright',
        type: 'text',
        text: `© ${year} All Rights Reserved`,
        start: 0,
        duration: this.duration || 30,
        sourceIn: 0,
        textStyle: { fontSize: 20, fill: '#cccccc', fontFamily: 'Inter', align: 'center' },
        properties: { x: 0, y: 47, scale: 100, opacity: 70 }
    });
    this.saveState();
    this.requestRedraw();
    this.commitStateToReact();
    this.log("✅ تم إضافة شريط حقوق النشر!");
};

window.EditorApp.prototype.executeLogoOverlay = function() {
    this.log("🖼️ جاري تثبيت اللوجو (Logo Overlay)...");
    // Look for an image asset to use as logo
    const logoAsset = this.assets?.find(a => a.type === 'image');
    if (!logoAsset) {
        this.log("❌ لا يوجد صورة في مكتبة الأصول. يرجى رفع صورة اللوجو أولاً.");
        return;
    }
    let overlayTrack = this.tracks.find(t => t.type === 'overlay');
    if (!overlayTrack) {
        overlayTrack = { id: 'track_overlay_' + Date.now(), type: 'overlay', name: 'Overlay', clips: [] };
        this.tracks.push(overlayTrack);
    }
    overlayTrack.clips.push({
        id: 'clip_logo_' + Date.now(),
        name: 'Logo',
        type: 'image',
        src: logoAsset.src || logoAsset.url,
        start: 0,
        duration: this.duration || 30,
        sourceIn: 0,
        properties: { x: 40, y: -43, scale: 15, opacity: 90 }
    });
    this.saveState();
    this.requestRedraw();
    this.commitStateToReact();
    this.log("✅ تم تثبيت اللوجو في الزاوية العلوية اليمنى!");
};
