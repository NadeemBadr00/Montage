// @ts-nocheck
// actions-clip-fx.ts — Per-clip effects: speed, volume, fade, crop

export const injectActionsClipFx = () => {
    // ─────────────────────────────────────────────────────────────
    // 🚀 PHASE 1 — Speed / Volume / Fade / Crop Handlers
    // ─────────────────────────────────────────────────────────────

    // SPEED (sp2c1V1) — sets clip.properties.playbackSpeed
    // managePlayers() already reads playbackSpeed and applies it to the HTML5 player
    window.EditorApp.prototype.executeSpeedCommand = function(trackName: string, clipIndex: number, speed: number) {
        const track = this.tracks.find((t: any) => t.name === trackName);
        if (!track) { this.log(`❌ Track ${trackName} not found.`); return; }
        const sorted = [...track.clips].sort((a: any, b: any) => a.start - b.start);
        if (clipIndex < 1 || clipIndex > sorted.length) { this.log(`⚠️ Invalid clip index ${clipIndex}`); return; }
        const clip = sorted[clipIndex - 1];
        this.saveState();
        if (!clip.properties) clip.properties = {};
        clip.properties.playbackSpeed = Math.max(0.1, Math.min(16, speed));
        this.log(`⏩ Speed set to ${clip.properties.playbackSpeed}x on ${clip.name}`);
        this._cmdFinalize();
    };

    // VOLUME (vol80c1A1) — sets clip.properties.volume (0–200%)
    // managePlayers() reads this and sets p.volume
    window.EditorApp.prototype.executeVolumeCommand = function(trackName: string, clipIndex: number, volume: number) {
        const track = this.tracks.find((t: any) => t.name === trackName);
        if (!track) { this.log(`❌ Track ${trackName} not found.`); return; }
        const sorted = [...track.clips].sort((a: any, b: any) => a.start - b.start);
        if (clipIndex < 1 || clipIndex > sorted.length) { this.log(`⚠️ Invalid clip index ${clipIndex}`); return; }
        const clip = sorted[clipIndex - 1];
        this.saveState();
        if (!clip.properties) clip.properties = {};
        clip.properties.volume = volume;
        const label = volume === 0 ? '🔇 Muted' : `🔊 ${volume}%`;
        this.log(`${label} volume on ${clip.name}`);
        this._cmdFinalize();
    };

    // FADE IN / OUT (fi2c1V1 | fo1.5c1V1)
    // Uses the existing clip.transitions system already read by the WebGL renderer
    window.EditorApp.prototype.executeFadeCommand = function(trackName: string, clipIndex: number, direction: string, duration: number) {
        const track = this.tracks.find((t: any) => t.name === trackName);
        if (!track) { this.log(`❌ Track ${trackName} not found.`); return; }
        const sorted = [...track.clips].sort((a: any, b: any) => a.start - b.start);
        if (clipIndex < 1 || clipIndex > sorted.length) { this.log(`⚠️ Invalid clip index ${clipIndex}`); return; }
        const clip = sorted[clipIndex - 1];
        this.saveState();
        if (!clip.transitions) clip.transitions = { duration: 1, in: 'none', out: 'none' };
        clip.transitions.duration = duration;
        if (direction === 'in')  clip.transitions.in  = 'fade';
        if (direction === 'out') clip.transitions.out = 'fade';
        this.log(`✨ Fade ${direction} ${duration}s applied to ${clip.name}`);
        this._cmdFinalize();
    };

    // CROP (cr10,20,90,80c1V1) — UV-based crop via WebGL uvOffset/uvScale
    // Values are percentages (0-100). x1,y1 = top-left, x2,y2 = bottom-right.
    window.EditorApp.prototype.executeCropCommand = function(trackName: string, clipIndex: number, x1: number, y1: number, x2: number, y2: number) {
        const track = this.tracks.find((t: any) => t.name === trackName);
        if (!track) { this.log(`❌ Track ${trackName} not found.`); return; }
        const sorted = [...track.clips].sort((a: any, b: any) => a.start - b.start);
        if (clipIndex < 1 || clipIndex > sorted.length) { this.log(`⚠️ Invalid clip index ${clipIndex}`); return; }
        const clip = sorted[clipIndex - 1];
        this.saveState();
        if (!clip.properties) clip.properties = {};

        // Normalize 0-100% to 0.0-1.0 UV space
        const cx1 = Math.max(0, Math.min(100, x1)) / 100;
        const cy1 = Math.max(0, Math.min(100, y1)) / 100;
        const cx2 = Math.max(0, Math.min(100, x2)) / 100;
        const cy2 = Math.max(0, Math.min(100, y2)) / 100;

        clip.properties.uvScaleX  = Math.max(0.01, cx2 - cx1);
        clip.properties.uvScaleY  = Math.max(0.01, cy2 - cy1);
        clip.properties.uvOffsetX = cx1;
        clip.properties.uvOffsetY = cy1;
        // Store raw values for UI display
        clip.properties.cropX1 = x1; clip.properties.cropY1 = y1;
        clip.properties.cropX2 = x2; clip.properties.cropY2 = y2;

        if (x1 === 0 && y1 === 0 && x2 === 100 && y2 === 100) {
            clip.properties.uvScaleX = 1; clip.properties.uvScaleY = 1;
            clip.properties.uvOffsetX = 0; clip.properties.uvOffsetY = 0;
            this.log(`🔄 Crop reset on ${clip.name}`);
        } else {
            this.log(`✂️ Crop applied: (${x1},${y1}) → (${x2},${y2}) on ${clip.name}`);
        }
        this._cmdFinalize();
        if (typeof this.updateEffectControls === 'function') this.updateEffectControls();
    };
};
