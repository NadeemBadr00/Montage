// @ts-nocheck
// actions-phase51-60.ts — Advanced Graphics, Particles, Interaction

// Phase 51: Neon Glow Text
window.EditorApp.prototype.executeNeonGlow = function(color: string) {
    this.log(`💡 Neon Glow باللون ${color}...`);
    const ids = Array.from(this.selectedClipIds);
    this.tracks.forEach(t => t.clips.forEach(c => {
        if (ids.includes(c.id) && c.type === 'text') {
            c.textStyle = c.textStyle || {};
            c.textStyle.fill = color || '#00ffff';
            c.textStyle.shadowColor = color || '#00ffff';
            c.textStyle.shadowBlur = 30;
            c.textStyle.stroke = color || '#00ffff';
            c.textStyle.strokeThickness = 2;
        }
    }));
    this.saveState(); this.requestRedraw(); this.commitStateToReact();
    this.log("✅ Neon Glow مطبّق!");
};

// Phase 52: Retro VHS Effect
window.EditorApp.prototype.executeVHSEffect = function() {
    this.log("📼 تطبيق تأثير VHS الكلاسيكي...");
    const ids = Array.from(this.selectedClipIds);
    this.tracks.forEach(t => t.clips.forEach(c => {
        if (ids.includes(c.id)) {
            c.properties = c.properties || {};
            c.properties.vhs = true;
            c.properties.saturation = 70;
            c.properties.contrast = 90;
            c.properties.noise = 0.15;
            c.properties.scanLines = true;
        }
    }));
    this.saveState(); this.requestRedraw(); this.commitStateToReact();
    this.log("✅ VHS Effect مطبّق!");
};

// Phase 53: Film Grain
window.EditorApp.prototype.executeFilmGrain = function(intensity: number) {
    this.log(`🎞️ Film Grain بشدة ${intensity}...`);
    const ids = Array.from(this.selectedClipIds);
    this.tracks.forEach(t => t.clips.forEach(c => {
        if (ids.includes(c.id)) {
            c.properties = c.properties || {};
            c.properties.filmGrain = intensity || 0.2;
        }
    }));
    this.saveState(); this.requestRedraw(); this.commitStateToReact();
    this.log("✅ Film Grain مطبّق!");
};

// Phase 54: Pixelate Effect
window.EditorApp.prototype.executePixelate = function(size: number) {
    this.log(`🟦 تأثير تقطيع البكسل (Pixelate) بحجم ${size}...`);
    const ids = Array.from(this.selectedClipIds);
    this.tracks.forEach(t => t.clips.forEach(c => {
        if (ids.includes(c.id)) {
            c.properties = c.properties || {};
            c.properties.pixelate = size || 20;
        }
    }));
    this.saveState(); this.requestRedraw(); this.commitStateToReact();
    this.log("✅ Pixelate مطبّق!");
};

// Phase 55: Split Screen (2 panels)
window.EditorApp.prototype.executeSplitScreen = function() {
    this.log("📺 جاري تجهيز Split Screen...");
    const ids = Array.from(this.selectedClipIds);
    if (ids.length < 2) { this.log("❌ حدد كليبين على الأقل."); return; }
    const leftId = ids[0], rightId = ids[1];
    this.tracks.forEach(t => t.clips.forEach(c => {
        if (c.id === leftId)  { c.properties = { ...c.properties, x: -25, y: 0, scale: 50 }; }
        if (c.id === rightId) { c.properties = { ...c.properties, x:  25, y: 0, scale: 50 }; }
    }));
    this.saveState(); this.requestRedraw(); this.commitStateToReact();
    this.log("✅ Split Screen جاهز!");
};

// Phase 56: AI Trim Silence Pockets
window.EditorApp.prototype.executeTrimSilence = function() {
    this.log("✂️ AI Trim — حذف المقاطع الصامتة أو الفارغة...");
    let removed = 0;
    this.tracks.forEach(t => {
        const before = t.clips.length;
        t.clips = t.clips.filter(c => !(c.type === 'audio' && c.duration < 0.2));
        removed += before - t.clips.length;
    });
    this.saveState(); this.requestRedraw(); this.commitStateToReact();
    this.log(`✅ تم حذف ${removed} مقطع صامت!`);
};

// Phase 57: Animate Opacity (Pulse)
window.EditorApp.prototype.executeOpacityPulse = function() {
    this.log("💓 تطبيق نبضة الشفافية (Opacity Pulse)...");
    const ids = Array.from(this.selectedClipIds);
    this.tracks.forEach(t => t.clips.forEach(c => {
        if (ids.includes(c.id)) {
            c.keyframes = c.keyframes || {};
            c.keyframes.opacity = [
                { time: 0, value: 100 },
                { time: c.duration * 0.25, value: 20 },
                { time: c.duration * 0.5,  value: 100 },
                { time: c.duration * 0.75, value: 20 },
                { time: c.duration,        value: 100 },
            ];
        }
    }));
    this.saveState(); this.requestRedraw(); this.commitStateToReact();
    this.log("✅ Opacity Pulse مطبّق!");
};

// Phase 58: Color Tint Overlay
window.EditorApp.prototype.executeColorTint = function(color: string) {
    this.log(`🎨 Color Tint باللون ${color}...`);
    let overlayTrack = this.tracks.find(t => t.type === 'overlay');
    if (!overlayTrack) {
        overlayTrack = { id: 'ot_' + Date.now(), type: 'overlay', name: 'Overlay', clips: [] };
        this.tracks.push(overlayTrack);
    }
    overlayTrack.clips.push({
        id: 'clip_tint_' + Date.now(),
        name: 'ColorTint',
        type: 'shape', shapeType: 'rect',
        start: this.currentTime, duration: 5,
        sourceIn: 0,
        properties: { widthPct: 100, heightPct: 100, shapeColor: color || '#ff0055', opacity: 20 }
    });
    this.saveState(); this.requestRedraw(); this.commitStateToReact();
    this.log("✅ Color Tint مضاف!");
};

// Phase 59: Export WAV
window.EditorApp.prototype.executeExportWAV = function() {
    this.log("🎵 جاري تصدير الصوت (WAV)...");
    this.log("⚙️ يعتمد على دعم WebCodecs في المتصفح. ابحث عن زر Export في واجهة التصدير.");
    if (this.executeExport) this.executeExport({ audioOnly: true, format: 'wav' });
};

// Phase 60: Smart Fill Gaps
window.EditorApp.prototype.executeSmartFillGaps = function() {
    this.log("🧩 Smart Fill — ملء الفراغات في التايم لاين...");
    this.tracks.forEach(t => {
        t.clips.sort((a: any, b: any) => a.start - b.start);
        for (let i = 1; i < t.clips.length; i++) {
            const prev = t.clips[i-1], curr = t.clips[i];
            const gap = curr.start - (prev.start + prev.duration);
            if (gap > 0.1 && gap < 2) {
                prev.duration += gap; // Extend previous clip to fill gap
            }
        }
    });
    this.saveState(); this.requestRedraw(); this.commitStateToReact();
    this.log("✅ تم ملء الفراغات الصغيرة تلقائياً!");
};
