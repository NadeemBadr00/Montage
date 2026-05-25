// @ts-nocheck
import { injectCommandCenterUI } from './ui';
import { injectCommandCenterState } from './state';
import { injectCommandCenterActions } from './actions';

export const initCommandCenterFeature = () => {
    injectCommandCenterState();
    injectCommandCenterUI();
    injectCommandCenterActions();
};

if (window.EditorApp && window.EditorApp.prototype) {
    initCommandCenterFeature();
}
