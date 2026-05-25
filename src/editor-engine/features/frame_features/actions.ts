// @ts-nocheck
import { ensureFrameProperties } from './types';

export const injectFrameActions = () => {
    window.EditorApp.prototype.updateFrameProp = function(clipId: string, prop: string, value: any) {
        const clip = this.tracks.flatMap(t => t.clips).find((c: any) => c.id === clipId);
        if (clip) {
            ensureFrameProperties(clip);
            
            if (prop === 'type' && value === 'polaroid' && clip.frame.color === '#151515') {
                clip.frame.color = '#f8f8f8';
            }

            const finalValue = (prop === 'thickness' || prop === 'animSpeed' || prop === 'slideDuration') ? parseFloat(value) : value;
            clip.frame[prop] = finalValue;
            if (prop === 'thickness') {
                const el = document.getElementById('frame-thickness-val');
                if(el) el.innerText = `${finalValue}px`;
            }
            
            this.renderFrameToCanvas();
            if (['type', 'orientation', 'transition', 'durationMode'].includes(prop)) this.updateEffectControls(); 
        }
    };

    window.EditorApp.prototype.handleFilmAssets = function(clipId: string, input: any) {
        if (!input.files || input.files.length === 0) return;
        const clip = this.tracks.flatMap(t => t.clips).find((c: any) => c.id === clipId);
        if (!clip) return;
        ensureFrameProperties(clip);
        if (!clip.frame.assets) clip.frame.assets = [];

        // Helper: stretch clip & timeline to fit video duration — delegates to the central engine method
        const stretchClipToVideoDuration = (videoDuration: number) => {
            if (!videoDuration || isNaN(videoDuration) || !isFinite(videoDuration)) return;
            if (this.stretchClipDuration) {
                this.stretchClipDuration(clipId, videoDuration);
            }
        };

        Array.from(input.files).forEach((file: any) => {
            const isVideo = file.type.startsWith('video/');
            const reader = new FileReader();
            reader.onload = (e: any) => {
                if (isVideo) {
                    // Use a video element so we can read duration and render frames
                    const vid = document.createElement('video');
                    vid.src = e.target.result;
                    vid.muted = true;
                    vid.preload = 'metadata';
                    // Mark so renderer knows it's a video asset
                    (vid as any)._isVideoAsset = true;
                    // Treat as "complete" once metadata loaded (mirrors img.complete)
                    Object.defineProperty(vid, 'complete', { get: () => vid.readyState >= 2, configurable: true });
                    clip.frame.assets.push(vid);
                    vid.onloadedmetadata = () => {
                        stretchClipToVideoDuration(vid.duration);
                        this.renderFrameToCanvas();
                    };
                    vid.onerror = () => this.renderFrameToCanvas();
                } else {
                    const img = new Image();
                    img.src = e.target.result;
                    clip.frame.assets.push(img);
                    img.onload = () => this.renderFrameToCanvas();
                }
            };
            reader.readAsDataURL(file);
        });
        setTimeout(() => this.updateEffectControls(), 500);
    };

    window.EditorApp.prototype.moveFilmAsset = function(clipId: string, index: number, direction: number) {
        const clip = this.tracks.flatMap(t => t.clips).find((c: any) => c.id === clipId);
        if (!clip || !clip.frame.assets) return;
        const newIndex = index + direction;
        if (newIndex < 0 || newIndex >= clip.frame.assets.length) return;
        const temp = clip.frame.assets[index];
        clip.frame.assets[index] = clip.frame.assets[newIndex];
        clip.frame.assets[newIndex] = temp;
        this.renderFrameToCanvas();
        this.updateEffectControls();
    };

    window.EditorApp.prototype.removeFilmAsset = function(clipId: string, index: number) {
        const clip = this.tracks.flatMap(t => t.clips).find((c: any) => c.id === clipId);
        if (!clip || !clip.frame.assets) return;
        clip.frame.assets.splice(index, 1);
        this.renderFrameToCanvas();
        this.updateEffectControls();
    };

    // ✅ Match clip duration EXACTLY to the uploaded video(s) duration
    // Unlike stretchClipDuration, this can also SHRINK the clip duration.
    window.EditorApp.prototype.matchFrameToVideoDuration = function(clipId: string) {
        const clip = this.tracks.flatMap(t => t.clips).find((c: any) => c.id === clipId);
        if (!clip || !clip.frame || !clip.frame.assets) return;

        // Sum durations of all video assets
        let totalDuration = 0;
        clip.frame.assets.forEach((asset: any) => {
            if ((asset._isVideoAsset || asset.tagName === 'VIDEO') && asset.duration && isFinite(asset.duration)) {
                totalDuration += asset.duration;
            }
        });

        if (!totalDuration || totalDuration <= 0) {
            this.log('⚠️ No video assets with known duration found.');
            return;
        }

        this.saveState();

        // Set duration directly (grow OR shrink)
        clip.duration = totalDuration;

        // Find track and cleanup transitions
        const track = this.tracks.find(t => t.clips.some((c: any) => c.id === clipId));
        if (track) {
            track.rebuildTree();
            if (this.cleanupOrphanedTransitions) this.cleanupOrphanedTransitions(track.id);
        }

        this.refreshProjectTopology();
        this.syncToStore();
        if (this.renderTracks) this.renderTracks();
        this.requestRedraw();
        if (this.updateEffectControls) this.updateEffectControls();

        this.log(`🔗 Matched frame duration → ${totalDuration.toFixed(2)}s`);
    };
};
