// @ts-nocheck
// actions-transitions.ts — Transitions, freeze frame, markers

export const injectActionsTransitions = () => {
    // ─────────────────────────────────────────────────────────────
    // 🔷 PHASE 4 — Track-Level Transitions
    // ─────────────────────────────────────────────────────────────

    window.EditorApp.prototype.executeTransitionAddCommand = function(trackName: string, cutTime: number, transType: string, duration: number) {
        const track = this.tracks.find((t: any) => t.name === trackName);
        if (!track) { this.log(`❌ Track ${trackName} not found`); return; }
        this.saveState();
        if (!track.transitions) track.transitions = [];
        // Remove any existing transition near this cutTime
        track.transitions = track.transitions.filter((tr: any) => Math.abs(tr.cutTime - cutTime) > 0.1);
        // Map command type to WebGL types
        const typeMap: Record<string, string> = { dissolve: 'dissolve', fade: 'dissolve', wipe: 'wipe', zoom: 'zoom' };
        track.transitions.push({
            id: `tr_${Date.now()}`,
            cutTime,
            inOffset:  duration / 2,
            outOffset: duration / 2,
            type: typeMap[transType] || 'dissolve',
            alignment: 'center'
        });
        this.log(`🎬 Transition "${transType}" added at ${cutTime}s on ${trackName}`);
        this._cmdFinalize();
    };

    window.EditorApp.prototype.executeTransitionRemoveCommand = function(trackName: string, cutTime: number) {
        const track = this.tracks.find((t: any) => t.name === trackName);
        if (!track || !track.transitions) { this.log(`❌ No transitions on ${trackName}`); return; }
        this.saveState();
        const before = track.transitions.length;
        track.transitions = track.transitions.filter((tr: any) => Math.abs(tr.cutTime - cutTime) > 0.1);
        const removed = before - track.transitions.length;
        this.log(removed > 0 ? `✅ Transition removed at ${cutTime}s` : `⚠️ No transition found near ${cutTime}s`);
        this._cmdFinalize();
    };

    // ─────────────────────────────────────────────────────────────
    // 🔷 PHASE 6 — Freeze Frame + Markers
    // ─────────────────────────────────────────────────────────────

    // FREEZE FRAME — inserts a duplicate frozen clip after the split point
    window.EditorApp.prototype.executeFreezeFrameCommand = function(trackName: string, clipIndex: number, duration: number) {
        const track = this.tracks.find((t: any) => t.name === trackName);
        if (!track) { this.log(`❌ Track ${trackName} not found`); return; }
        const sorted = [...track.clips].sort((a: any, b: any) => a.start - b.start);
        if (clipIndex < 1 || clipIndex > sorted.length) { this.log(`⚠️ Invalid clip index`); return; }
        const origClip = sorted[clipIndex - 1];
        this.saveState();

        // Freeze at current playhead position within the clip
        const freezeAtSource = origClip.sourceIn + (this.currentTime - origClip.start);

        // 1. Shorten original clip to freeze point
        const origEnd = origClip.start + origClip.duration;
        origClip.duration = this.currentTime - origClip.start;

        // 2. Create a new 'freeze' clip
        const freezeClip: any = {
            id: `freeze_${Date.now()}`,
            type: origClip.type,
            src: origClip.src,
            name: `Freeze (${origClip.name})`,
            start: this.currentTime,
            duration: duration,
            get end() { return this.start + this.duration; },
            sourceIn: freezeAtSource,  // stays fixed
            properties: { ...origClip.properties, playbackSpeed: 0.001 }, // near-zero speed = freeze
            trackId: track.id,
            keyframes: [],
            isFrozen: true,
            getPropertyValue(prop: string) { return this.properties[prop] ?? 0; }
        };
        track.clips.push(freezeClip);

        // 3. Push remaining clips forward
        const afterFreeze = track.clips.filter((c: any) =>
            c.id !== origClip.id && c.id !== freezeClip.id && c.start >= this.currentTime
        );
        afterFreeze.forEach((c: any) => { c.start += duration; });
        if (track.rebuildTree) track.rebuildTree();
        this.log(`❄️ Freeze frame ${duration}s inserted at ${this.currentTime.toFixed(2)}s`);
        this._cmdFinalize();
    };

    // MARKERS — stored in this.markers array, shown on the timeline ruler
    window.EditorApp.prototype.executeMarkerAddCommand = function(label: string, time: number) {
        if (!this.markers) this.markers = [];
        // Remove any existing marker with the same label
        this.markers = this.markers.filter((m: any) => m.label !== label);
        this.markers.push({ id: `marker_${Date.now()}`, label, time, color: '#f59e0b' });
        this.markers.sort((a: any, b: any) => a.time - b.time);
        this.log(`📍 Marker "${label}" added at ${time}s`);
        this._cmdFinalize();
        // Notify React timeline to re-render markers
        if (this.commitStateToReact) this.commitStateToReact();
    };

    window.EditorApp.prototype.executeMarkerRemoveCommand = function(time: number) {
        if (!this.markers) return;
        const before = this.markers.length;
        this.markers = this.markers.filter((m: any) => Math.abs(m.time - time) > 0.1);
        this.log(before > this.markers.length ? `🗑️ Marker at ${time}s removed` : `⚠️ No marker near ${time}s`);
        this._cmdFinalize();
        if (this.commitStateToReact) this.commitStateToReact();
    };

    window.EditorApp.prototype.executeMarkerClearCommand = function() {
        this.markers = [];
        this.log(`🗑️ All markers cleared`);
        this._cmdFinalize();
        if (this.commitStateToReact) this.commitStateToReact();
    };

    window.EditorApp.prototype.executeGotoMarkerCommand = function(label: string) {
        if (!this.markers || this.markers.length === 0) { this.log(`⚠️ No markers found`); return; }
        const marker = this.markers.find((m: any) => m.label.toLowerCase() === label.toLowerCase());
        if (!marker) { this.log(`⚠️ Marker "${label}" not found`); return; }
        this.currentTime = marker.time;
        if (this.seek) this.seek(0);
        this.log(`⏭️ Jumped to marker "${label}" at ${marker.time}s`);
    };
};
