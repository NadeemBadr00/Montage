// @ts-nocheck
// auto-reframe.ts — Auto Reframe using MediaPipe Face Detection
// Dynamically loaded to prevent initial bundle bloat

let faceDetectorInstance = null;

async function initFaceDetector() {
    if (faceDetectorInstance) return faceDetectorInstance;

    try {
        if (window.app?.log) window.app.log("⏳ جاري تحميل نماذج الذكاء الاصطناعي للتأطير التلقائي (MediaPipe)...");

        // Lazy load mediapipe tasks-vision from CDN
        const vision = await import('https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/+esm');
        const { FaceDetector, FilesetResolver } = vision;

        const visionOptions = await FilesetResolver.forVisionTasks(
            "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/wasm"
        );

        faceDetectorInstance = await FaceDetector.createFromOptions(visionOptions, {
            baseOptions: {
                modelAssetPath: `https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/1/blaze_face_short_range.tflite`,
                delegate: "GPU"
            },
            runningMode: "VIDEO"
        });

        if (window.app?.log) window.app.log("✅ تم تحميل نماذج التأطير بنجاح!");
        return faceDetectorInstance;
    } catch (e) {
        console.error("MediaPipe Init Error:", e);
        if (window.app?.log) window.app.log("❌ فشل تحميل نماذج التأطير: " + e.message);
        throw e;
    }
}

export async function applyAutoReframe(clipId: string) {
    const app = (window as any).app;
    if (!app) return;

    const clip = app.findClipById ? app.findClipById(clipId) : null;
    if (!clip || clip.type !== 'video') {
        if (app.log) app.log("⚠️ يرجى تحديد مقطع فيديو لتطبيق التأطير التلقائي.");
        return;
    }

    const videoEl = app.getSourceElement ? app.getSourceElement(clip) : null;
    if (!videoEl || videoEl.readyState < 2) {
        if (app.log) app.log("⚠️ لا يمكن الوصول لعنصر الفيديو. حاول تشغيله قليلاً أولاً.");
        return;
    }

    try {
        const detector = await initFaceDetector();
        
        // Settings
        const FRAME_STEP = 0.5; // Analyze every 0.5s to save processing power
        const SMOOTHING = 0.15; // Exponential Moving Average smoothing factor
        
        // Reset crop/pan keyframes
        clip.properties = clip.properties || {};
        clip.properties.parentShiftX = 0;
        clip.properties.parentShiftY = 0;
        // Instead of animating x/y, we will animate innerOffsetX or positionX?
        // Let's create an array of points and use it to set `positionX` over time
        // Wait, the engine doesn't have a standard keyframe system for properties natively yet,
        // it has `transitions` and we can attach custom data. Let's just create keyframes.
        
        clip.keyframes = clip.keyframes || {};
        clip.keyframes.positionX = []; // Array of { time, value }

        let previousCenterX = 0.5;
        let isFirstFace = true;
        
        const originalTime = videoEl.currentTime;

        if (app.log) app.log(`🔍 جاري تحليل وتأطير المشهد... (${clip.duration.toFixed(1)}s)`);

        for (let t = 0; t < clip.duration; t += FRAME_STEP) {
            videoEl.currentTime = t;
            
            // Wait for video frame to seek (crude wait, we should use proper events but this is a synchronous hack often used in invisible canvases if not playing)
            // A better way is using a Promise to wait for 'seeked'
            await new Promise((resolve) => {
                videoEl.addEventListener('seeked', resolve, { once: true });
                // Fallback
                setTimeout(resolve, 200);
            });

            const timestampMs = t * 1000;
            const detections = detector.detectForVideo(videoEl, timestampMs);

            if (detections.detections.length > 0) {
                // Get the most prominent face (largest bounding box)
                const face = detections.detections.reduce((prev, current) => {
                    return (prev.boundingBox.width * prev.boundingBox.height) > (current.boundingBox.width * current.boundingBox.height) ? prev : current;
                });

                const rawCenterX = face.boundingBox.originX + (face.boundingBox.width / 2);
                
                // Normalize by video width (0.0 to 1.0)
                const normX = rawCenterX / videoEl.videoWidth;

                let smoothedX;
                if (isFirstFace) {
                    smoothedX = normX;
                    isFirstFace = false;
                } else {
                    smoothedX = (normX * SMOOTHING) + (previousCenterX * (1 - SMOOTHING));
                }
                previousCenterX = smoothedX;

                // Center is 0.5. If face is at 0.8, we need to shift camera by -0.3
                // We'll map this to pixels. Let's say we set the clip's 'parentShiftX'
                const shiftPct = (0.5 - smoothedX) * 100; // -30%
                
                clip.keyframes.positionX.push({
                    time: t,
                    value: shiftPct * 10 // scale to arbitrary engine units (e.g. 1000 = screen width)
                });
            }
        }

        // Restore
        videoEl.currentTime = originalTime;

        // Apply crop to 9:16 aspect ratio (portrait) if it's horizontal
        clip.properties.forcedWidth = 1080;
        clip.properties.forcedHeight = 1920;
        clip.properties.scale = 100;
        
        // Add flag to renderer to evaluate these keyframes
        clip.autoReframeEnabled = true;

        if (app.log) app.log("✅ تم التأطير بنجاح!");
        if (app.requestRedraw) app.requestRedraw();
        if (app.commitStateToReact) app.commitStateToReact();

    } catch (e) {
        if (app.log) app.log("❌ خطأ أثناء التأطير: " + e.message);
    }
}

// Attach to global for easy access
(window as any).applyAutoReframe = applyAutoReframe;
