// @ts-nocheck
/**
 * 🎬 AI4Montage Preview Engine — Bootstrap
 * تم تقسيم هذا الملف إلى 6 وحدات منفصلة في مجلد preview/
 * هذا الملف يستورد الوحدات بالترتيب الصحيح
 *
 * الترتيب مهم — كل وحدة تُضاف على window.EditorApp.prototype
 * ولا يجب تغيير ترتيب الـ imports
 */

// 1. Constants, setupVideoSync, image cache
import './preview/preview-setup';

// 2. togglePlay, startPlayback, pausePlayback, playbackLoop, JKL, keyboard shortcuts
import './preview/preview-playback';

// 3. setupCanvasInteraction (mouse/touch/drag/resize), handleFrameUpload
import './preview/preview-canvas-events';

// 4. getClipTransform, openOnCanvasTextEditor, hitTest, hitTestAll,
//    showLayerSelectionMenu, getCanvasCoordinates, findClipById,
//    getClipDrawRect, checkResizeHandles
import './preview/preview-geometry';

// 5. renderFrameToCanvas, drawUIOverlays, drawBoundingBox
import './preview/preview-renderer';

// 6. managePlayers, seek, seekToAbsolute, seekFrame, seekToStart, seekToEnd,
//    framesToTimecode, manualTimeUpdate, syncOverlays,
//    updatePlayheadPosition, setupPlayheadScrubbing
import './preview/preview-seek';
