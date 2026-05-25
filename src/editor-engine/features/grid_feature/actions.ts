// @ts-nocheck
import { ensureGridProperties, syncGridOrder } from './helpers';

export const injectGridActions = () => {
    window.EditorApp.prototype.toggleGridMode = function(clipId: string) {
        const clip = this.tracks.flatMap((t: any) => t.clips).find((c: any) => c.id === clipId);
        if (clip) {
            ensureGridProperties(clip);
            clip.gridGallery.enabled = !clip.gridGallery.enabled;
            if(clip.gridGallery.enabled) {
                clip.frame = clip.frame || {}; clip.frame.type = 'none';
            }
            this.renderFrameToCanvas();
            this.updateEffectControls();
        }
    };

    window.EditorApp.prototype.updateGridMode = function(clipId: string, mode: string) {
        const clip = this.tracks.flatMap((t: any) => t.clips).find((c: any) => c.id === clipId);
        if (clip) { clip.gridGallery.durationMode = mode; this.updateEffectControls(); }
    };

    window.EditorApp.prototype.updateGridProp = function(clipId: string, prop: string, value: any) {
        const clip = this.tracks.flatMap((t: any) => t.clips).find((c: any) => c.id === clipId);
        if (clip) {
            const numProps = ['speed', 'gap', 'spreadX', 'spreadY', 'activeScale', 'passiveScale', 'bgOpacity', 'borderWidth'];
            if (numProps.includes(prop)) {
                clip.gridGallery[prop] = parseFloat(value);
            } else if (['showLabels', 'showMain', 'shrinkPassive'].includes(prop)) {
                clip.gridGallery[prop] = value; 
                if (prop === 'showMain') {
                    clip.gridGallery.order = []; 
                    syncGridOrder(clip);
                    clip.gridGallery.layout = null;
                    this.updateEffectControls();
                }
            } else {
                clip.gridGallery[prop] = value;
            }

            if (['pattern', 'shape', 'gap', 'spreadX', 'spreadY'].includes(prop)) {
                clip.gridGallery.layout = null;
            }

            const valId = prop === 'activeScale' ? 'val-scale' : (prop === 'passiveScale' ? 'val-passive-scale' : null);
            if(valId) {
                const el = document.getElementById(valId);
                if (el) el.innerText = `x${clip.gridGallery[prop]}`;
            }

            this.renderFrameToCanvas();
            if(['pattern', 'shape'].includes(prop)) this.updateEffectControls();
        }
    };

    window.EditorApp.prototype.deleteGridAsset = function(clipId: string, uiIndex: number) {
        const clip = this.tracks.flatMap((t: any) => t.clips).find((c: any) => c.id === clipId);
        if (!clip) return;
        
        const g = clip.gridGallery;
        const contentIndex = g.order[uiIndex];
        const offset = g.showMain ? 1 : 0;
        const assetIndex = contentIndex - offset;

        if (g.showMain && contentIndex === 0) {
            alert("Use 'Show Main' checkbox to hide the original source.");
            return;
        }

        if (assetIndex >= 0 && assetIndex < g.assets.length) {
            g.assets.splice(assetIndex, 1);
            g.order = []; 
            g.layout = null;
            syncGridOrder(clip);

            this.renderFrameToCanvas();
            this.updateEffectControls();
        }
    };

    window.EditorApp.prototype.promptGridLabel = function(clipId: string, index: number) {
        const clip = this.tracks.flatMap((t: any) => t.clips).find((c: any) => c.id === clipId);
        if (!clip) return;
        const current = clip.gridGallery.labels[index] || "";
        const newVal = prompt("Enter label text:", current);
        if (newVal !== null) {
            clip.gridGallery.labels[index] = newVal;
            this.renderFrameToCanvas();
            this.updateEffectControls();
        }
    };

    window.EditorApp.prototype.moveGridItem = function(clipId: string, index: number, dir: number) {
        const clip = this.tracks.flatMap((t: any) => t.clips).find((c: any) => c.id === clipId);
        if (!clip) return;
        const g = clip.gridGallery;
        const newIdx = index + dir;
        if (newIdx >= 0 && newIdx < g.order.length) {
            [g.order[index], g.order[newIdx]] = [g.order[newIdx], g.order[index]];
            if(g.labels[index] && g.labels[newIdx]) {
                [g.labels[index], g.labels[newIdx]] = [g.labels[newIdx], g.labels[index]];
            }
            this.renderFrameToCanvas();
            this.updateEffectControls();
        }
    };

    window.EditorApp.prototype.handleGridAssets = function(clipId: string, input: any) {
        if (!input.files.length) return;
        const clip = this.tracks.flatMap((t: any) => t.clips).find((c: any) => c.id === clipId);
        if (!clip) return;
        ensureGridProperties(clip);
        
        Array.from(input.files).forEach((file: any) => {
            if (file.type.startsWith('video')) {
                const video = document.createElement('video');
                video.src = URL.createObjectURL(file);
                video.muted = true;
                video.loop = true;
                video.onloadeddata = () => video.play(); 
                clip.gridGallery.assets.push({ type: 'video', el: video });
            } else {
                const img = new Image();
                img.src = URL.createObjectURL(file);
                clip.gridGallery.assets.push({ type: 'image', el: img });
            }
        });
        
        clip.gridGallery.order = [];
        clip.gridGallery.layout = null;
        syncGridOrder(clip);
        
        this.renderFrameToCanvas();
        this.updateEffectControls();
    };
};
