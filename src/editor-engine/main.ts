// @ts-nocheck
// Entry point for the Legacy Editor Engine
import './core/engine';
import './core/assets';
import './core/timeline';
import './core/video_preview';
import './features/command_center';
import './features/xml_exporter';
import './features/pro_features';
import './features/ultra_features';
import './features/frame_features';
import './features/bubble_feature';
import './features/grid_feature';
import './features/social_overlay_feature';
import { injectAutosaveFeature } from './features/autosave_feature';
injectAutosaveFeature();
import './ai/gemini_chat';
import './ai/gemini_plan';
import './ai/ai';
import './ai/auto_montage';
import './core/file_store';

import { exportToMP4ClientSide } from './features/video_export';

console.log('Editor Engine Initialized via Vite');

(window as any).EditorApp.prototype.exportVideoClientSide = function(options: any) {
    exportToMP4ClientSide(this, options);
};
