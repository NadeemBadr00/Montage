// @ts-nocheck
import { injectFrameUI } from './ui';
import { injectFrameActions } from './actions';
import { injectFrameRendering } from './rendering';

export const initFrameFeatures = () => {
    injectFrameUI();
    injectFrameActions();
    injectFrameRendering();
};

if (window.EditorApp && window.EditorApp.prototype) {
    initFrameFeatures();
}
