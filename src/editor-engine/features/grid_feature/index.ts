// @ts-nocheck
import { injectGridUI } from './ui';
import { injectGridActions } from './actions';
import { injectGridRendering } from './rendering';

// Preserve original prototype methods
const prevUpdateEffectControlsGrid = window.EditorApp.prototype.updateEffectControls;
const prevDrawClipContentGrid = window.EditorApp.prototype.drawClipContent;

export const initGridFeature = () => {
    injectGridUI(prevUpdateEffectControlsGrid);
    injectGridActions();
    injectGridRendering(prevDrawClipContentGrid);
};

// Immediately execute the injection if EditorApp is already defined globally
if (window.EditorApp && window.EditorApp.prototype) {
    initGridFeature();
}
