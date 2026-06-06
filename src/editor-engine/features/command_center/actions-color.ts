// @ts-nocheck
// actions-color.ts — Color grading, filter presets, shapes, Ken Burns

export const injectActionsColor = () => {
    // ─────────────────────────────────────────────────────────────
    // 🎨 PHASE 2 — Color Grading Handlers
    // ─────────────────────────────────────────────────────────────

    // Helper: ensure colorGrading object exists on clip
    const _ensureColor = (clip: any) => {
        if (!clip.properties) clip.properties = {};
        if (!clip.properties.colorGrading) {
            clip.properties.colorGrading = {
                brightness: 100, contrast: 100, saturation: 100, hue: 0,
                tintColor: null, tintOpacity: 0, preset: null
            };
        }
        return clip.properties.colorGrading;
    };

    // Helper: resolve clip by trackName + index (shared by all Phase 2 handlers)
    const _resolveClip = (app: any, trackName: string, clipIndex: number) => {
        const track = app.tracks.find((t: any) => t.name === trackName);
        if (!track) { app.log(`❌ Track ${trackName} not found.`); return null; }
        const sorted = [...track.clips].sort((a: any, b: any) => a.start - b.start);
        if (clipIndex < 1 || clipIndex > sorted.length) { app.log(`⚠️ Invalid clip index ${clipIndex}`); return null; }
        return sorted[clipIndex - 1];
    };

    // BRIGHTNESS / CONTRAST / SATURATION / HUE
    // Values stored in clip.properties.colorGrading and applied as CSS filter in _cmdFinalize render
    window.EditorApp.prototype.executeColorCommand = function(trackName: string, clipIndex: number, property: string, val: number) {
        const clip = _resolveClip(this, trackName, clipIndex);
        if (!clip) return;
        this.saveState();
        const cg = _ensureColor(clip);
        if (property === 'brightness')  cg.brightness  = Math.max(0, Math.min(400, val));
        if (property === 'contrast')    cg.contrast    = Math.max(0, Math.min(400, val));
        if (property === 'saturation')  cg.saturation  = Math.max(0, Math.min(400, val));
        if (property === 'hue')         cg.hue         = val % 360;
        this.log(`🎨 ${property} → ${val} on ${clip.name}`);
        this._cmdFinalize();
    };

    // TINT — applies a color overlay at a given opacity
    window.EditorApp.prototype.executeTintCommand = function(trackName: string, clipIndex: number, color: string, opacity: number) {
        const clip = _resolveClip(this, trackName, clipIndex);
        if (!clip) return;
        this.saveState();
        const cg = _ensureColor(clip);
        cg.tintColor   = color;
        cg.tintOpacity = Math.max(0, Math.min(100, opacity)) / 100;
        this.log(`🎨 Tint ${color} @ ${opacity}% on ${clip.name}`);
        this._cmdFinalize();
    };

    // FILTER PRESETS — maps friendly names to colorGrading values
    const FILTER_PRESETS: Record<string, any> = {
        cinematic:  { brightness: 90,  contrast: 115, saturation: 80,  hue: 0,   tintColor: '#0a1628', tintOpacity: 0.15 },
        bw:         { brightness: 100, contrast: 110, saturation: 0,   hue: 0,   tintColor: null, tintOpacity: 0 },
        warm:       { brightness: 105, contrast: 100, saturation: 110, hue: 15,  tintColor: '#ff9900', tintOpacity: 0.08 },
        cool:       { brightness: 100, contrast: 105, saturation: 90,  hue: -15, tintColor: '#0044ff', tintOpacity: 0.08 },
        vintage:    { brightness: 95,  contrast: 90,  saturation: 70,  hue: 10,  tintColor: '#8b4513', tintOpacity: 0.12 },
        reset:      { brightness: 100, contrast: 100, saturation: 100, hue: 0,   tintColor: null, tintOpacity: 0 },
    };

    window.EditorApp.prototype.executeFilterPresetCommand = function(trackName: string, clipIndex: number, preset: string) {
        const clip = _resolveClip(this, trackName, clipIndex);
        if (!clip) return;
        this.saveState();
        const cg = _ensureColor(clip);
        const values = FILTER_PRESETS[preset];
        if (!values) { this.log(`❌ Unknown preset: ${preset}`); return; }
        Object.assign(cg, values, { preset });
        this.log(`✨ Filter preset "${preset}" applied to ${clip.name}`);
        this._cmdFinalize();
    };

    // COLOR RESET — restores defaults
    window.EditorApp.prototype.executeColorResetCommand = function(trackName: string, clipIndex: number) {
        const clip = _resolveClip(this, trackName, clipIndex);
        if (!clip) return;
        this.saveState();
        if (clip.properties) {
            clip.properties.colorGrading = { brightness: 100, contrast: 100, saturation: 100, hue: 0, tintColor: null, tintOpacity: 0, preset: null };
        }
        this.log(`🔄 Color reset on ${clip.name}`);
        this._cmdFinalize();
    };

    // ─────────────────────────────────────────────────────────────
    // 🔷 PHASE 3 — Shapes + Ken Burns
    // ─────────────────────────────────────────────────────────────

    // SHAPE ADD — creates a new 'shape' clip on the specified track
    window.EditorApp.prototype.executeShapeAddCommand = function(parsed: any) {
        const track = this.tracks.find((t: any) => t.name === parsed.trackName);
        if (!track) { this.log(`❌ Track ${parsed.trackName} not found`); return; }
        this.saveState();
        const insertTime = this.currentTime;
        const clipId = `shape_${Date.now()}`;
        const newClip: any = {
            id: clipId,
            type: 'shape',
            src: `shape:${parsed.shape}`,
            name: `Shape (${parsed.shape})`,
            start: insertTime,
            duration: parsed.duration,
            get end() { return this.start + this.duration; },
            properties: {
                shapeType:   parsed.shape,
                shapeColor:  parsed.color,
                widthPct:    parsed.widthPct,   // % of canvas width
                heightPct:   parsed.heightPct,  // % of canvas height
                positionX:   parsed.x,
                positionY:   parsed.y,
                opacity:     100,
                rotation:    0,
                scale:       100,
            },
            trackId: track.id,
            keyframes: [],
            getPropertyValue(prop: string) { return this.properties[prop] ?? 0; }
        };
        track.clips.push(newClip);
        if (track.rebuildTree) track.rebuildTree();
        this.log(`🔷 Shape "${parsed.shape}" added at ${insertTime.toFixed(2)}s`);
        this._cmdFinalize();
    };

    // KEN BURNS — stores animated pan+zoom keyframes on a clip
    window.EditorApp.prototype.executeKenBurnsCommand = function(
        trackName: string, clipIndex: number,
        startX: number, startY: number, startScale: number,
        endX: number, endY: number, endScale: number
    ) {
        const clip = _resolveClip(this, trackName, clipIndex);
        if (!clip) return;
        this.saveState();
        clip.properties.kenBurns = { startX, startY, startScale, endX, endY, endScale };
        this.log(`🎥 Ken Burns: (${startX},${startY},${startScale}x) → (${endX},${endY},${endScale}x) on ${clip.name}`);
        this._cmdFinalize();
    };

    window.EditorApp.prototype.executeKenBurnsResetCommand = function(trackName: string, clipIndex: number) {
        const clip = _resolveClip(this, trackName, clipIndex);
        if (!clip) return;
        this.saveState();
        delete clip.properties.kenBurns;
        this.log(`🔄 Ken Burns reset on ${clip.name}`);
        this._cmdFinalize();
    };
};
