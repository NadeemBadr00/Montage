// @ts-nocheck
// plan-preview.ts — Preview playback methods: startPreviewMode, playRange, exitPreviewMode, previewSelectedScenes

import { getPreviewUIHTML } from './ui';

export function injectPreviewUI(self: any) {
    document.body.insertAdjacentHTML('beforeend', getPreviewUIHTML());
}

export function startPreviewMode(self: any, index: number) {
    const item = self.plannerData[index];
    self.hidePlanModal();
    document.getElementById('ai-preview-overlay')!.classList.remove('hidden');
    document.getElementById('ai-preview-overlay')!.classList.add('flex');
    self.activePreviewRange = { start: item.start, end: item.end || item.start + 5 };
    self.playRange(self.activePreviewRange.start, self.activePreviewRange.end);
}

export function replayCurrentPreview(self: any) {
    if (self.activePreviewRange) {
        self.playRange(self.activePreviewRange.start, self.activePreviewRange.end);
    }
}

export function exitPreviewMode(self: any) {
    if (window.app) window.app.pausePlayback();
    if (self.previewLoopId) cancelAnimationFrame(self.previewLoopId);

    const overlay = document.getElementById('ai-preview-overlay');
    if (overlay) {
        overlay.classList.add('hidden');
        overlay.classList.remove('flex');
    }
    self.showLastPlan();
}

export async function previewSelectedScenes(self: any) {
    if (self.selectedScenes.size === 0) return;
    const indices = Array.from(self.selectedScenes).sort((a, b) => a - b);
    self.hidePlanModal();
    document.getElementById('ai-preview-overlay')!.classList.remove('hidden');
    document.getElementById('ai-preview-overlay')!.classList.add('flex');

    const playNext = (i: number) => {
        if (i >= indices.length || document.getElementById('ai-preview-overlay')!.classList.contains('hidden')) {
            if (!document.getElementById('ai-preview-overlay')!.classList.contains('hidden')) {
                self.exitPreviewMode();
            }
            return;
        }
        const idx = indices[i];
        const item = self.plannerData[idx];
        self.activePreviewRange = { start: item.start, end: item.end || item.start + 5 };
        self.playRange(item.start, item.end || item.start + 5, () => {
            setTimeout(() => playNext(i + 1), 500);
        });
    };
    playNext(0);
}

export function playRange(self: any, start: number, end: number, onComplete?: () => void) {
    if (!window.app) return;
    if (self.previewLoopId) cancelAnimationFrame(self.previewLoopId);

    window.app.currentTime = start;
    window.app.seek(0);
    setTimeout(() => window.app.startPlayback(), 50);

    const checkTime = () => {
        const overlay = document.getElementById('ai-preview-overlay');
        if (!overlay || overlay.classList.contains('hidden')) return;

        if (window.app.isPlaying && window.app.currentTime >= end) {
            window.app.pausePlayback();
            if (onComplete) onComplete();
        } else {
            self.previewLoopId = requestAnimationFrame(checkTime);
        }
    };
    self.previewLoopId = requestAnimationFrame(checkTime);
}

export function bindPreviewMethods(cls: any) {
    cls.prototype.injectPreviewUI = function() { return injectPreviewUI(this); };
    cls.prototype.startPreviewMode = function(...a: any[]) { return startPreviewMode(this, ...a); };
    cls.prototype.replayCurrentPreview = function() { return replayCurrentPreview(this); };
    cls.prototype.exitPreviewMode = function() { return exitPreviewMode(this); };
    cls.prototype.previewSelectedScenes = function() { return previewSelectedScenes(this); };
    cls.prototype.playRange = function(...a: any[]) { return playRange(this, ...a); };
}
