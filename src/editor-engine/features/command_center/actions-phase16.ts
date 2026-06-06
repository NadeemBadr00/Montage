// @ts-nocheck
// actions-phase16.ts - Lens Flare, Rain, Sparkle, Light Sweep

function addOverlayShape(engine: any, name: string, shapeType: string, color: string) {
    let overlayTrack = engine.tracks.find((t: any) => t.type === 'overlay');
    if (!overlayTrack) {
        overlayTrack = { id: 'track_overlay_' + Date.now(), type: 'overlay', name: 'Overlay', clips: [] };
        engine.tracks.push(overlayTrack);
    }
    // Toggle
    const existingIdx = overlayTrack.clips.findIndex((c: any) => c.name === name);
    if (existingIdx >= 0) {
        overlayTrack.clips.splice(existingIdx, 1);
        engine.log(`✅ تم إزالة ${name}.`);
    } else {
        overlayTrack.clips.push({
            id: 'clip_' + name.toLowerCase() + '_' + Date.now(),
            name,
            type: 'shape',
            shapeType,
            start: 0,
            duration: engine.duration || 30,
            sourceIn: 0,
            properties: { opacity: 80, shapeColor: color }
        });
        engine.log(`✅ تم إضافة ${name}!`);
    }
    engine.saveState();
    engine.requestRedraw();
    engine.commitStateToReact();
}

window.EditorApp.prototype.executeLensFlare = function() {
    this.log("🌟 جاري إضافة وميض العدسة (Lens Flare)...");
    addOverlayShape(this, 'LensFlare', 'lens_flare', '#FFFFFF');
};

window.EditorApp.prototype.executeRainOverlay = function() {
    this.log("🌧️ جاري إضافة تأثير المطر (Rain)...");
    addOverlayShape(this, 'RainOverlay', 'rain', '#AAAAFF');
};

window.EditorApp.prototype.executeSparkleOverlay = function() {
    this.log("✨ جاري إضافة تأثير البريق (Sparkle)...");
    addOverlayShape(this, 'SparkleOverlay', 'sparkle', '#FFFF00');
};

window.EditorApp.prototype.executeLightSweep = function() {
    this.log("💡 جاري إضافة تأثير مسح الضوء (Light Sweep)...");
    addOverlayShape(this, 'LightSweep', 'light_sweep', '#FFFFFF');
};
