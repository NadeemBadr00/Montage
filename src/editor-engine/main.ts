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
import './features/missing_features_phase4';
import './features/missing_features_phase5';
import './features/audio/audio-analysis';
import './features/ultra/scene-detector';
import './features/command_center/actions-phase7';
import './features/command_center/actions-phase8';
import './features/command_center/actions-phase9';
import './features/command_center/actions-phase10';
import './features/command_center/actions-phase11';
import './features/command_center/actions-phase12';
import './features/command_center/actions-phase13';
import './features/command_center/actions-phase14';
import './features/command_center/actions-phase15';
import './features/command_center/actions-phase16';
import './features/command_center/actions-phase17';
import './features/command_center/actions-phase18';
import './features/command_center/actions-phase19';
import './features/command_center/actions-phase20';
import './features/command_center/actions-phase21-30';
import './features/command_center/actions-phase31-40';
import './features/command_center/actions-phase41-50';
import './features/command_center/actions-phase51-60';
import './features/command_center/actions-phase61-70';
import './features/command_center/actions-phase71-80';
import './features/command_center/actions-phase81-100';

// 5. Setup AI modules
import './ai/gemini_chat';
import './ai/gemini_plan';
import './ai/ai';
import './ai/auto_montage';
import './core/file_store';
import { injectTemplateManager } from './features/templates/template-manager';

import { exportToMP4ClientSide } from './features/video_export';

console.log('Editor Engine Initialized via Vite');

// Inject systems before assigning prototypes
const appMock = (window as any).EditorApp.prototype;
injectTemplateManager(appMock);

(window as any).EditorApp.prototype.exportVideoClientSide = function(options: any) {
    exportToMP4ClientSide(this, options);
};
