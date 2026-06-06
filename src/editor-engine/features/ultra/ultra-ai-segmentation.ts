// @ts-nocheck
// ultra-ai-segmentation.ts — AI model init, worker results, predictive caching, mask export
// @ts-nocheck
/**
 * 🌟 AI4Montage Ultra Features Module
 * 🚀 PERFORMANCE SUPER-CHARGE:
 * 1. FIXED: Shader transformation order (Scale -> Rotate -> Translate).
 * 2. This fixes the "Squashed Image" bug on rotation.
 * 3. Images now rotate preserving their aspect ratio (Portrait stays Portrait).
 * 🔥 UPDATE: Added Support for ScaleX, ScaleY, and Forced Dimensions (Fit to Shape).
 */

// =========================================================
// 1. AI Initialization & Predictive Caching
// =========================================================

window.EditorApp.prototype.initAIModel = async function() {
    if (this.aiWorker) return true;

    const loadingEl = document.getElementById('ai-loading');
    if (loadingEl) loadingEl.classList.remove('hidden');

    this.log("🧠 Initializing AI Worker (Optimized 360p Pipeline)...");

    this.maskCache = new Map();
    // OPTIMIZATION: Reduce cache size to save RAM (User Request: 100)
    this.MAX_CACHE_SIZE = 100; 
    this.AI_THROTTLE_RATE = 3; // Process 1 frame, skip 2

    // Shadow Canvas (360p Downsampling happens here naturally by canvas size)
    this.aiDownscaleCanvas = new OffscreenCanvas(360, 202);
    this.aiDownscaleCtx = this.aiDownscaleCanvas.getContext('2d', { alpha: false, willReadFrequently: true });
    
    // Shadow Player
    this.shadowVideo = document.createElement('video');
    this.shadowVideo.muted = true;
    this.shadowVideo.crossOrigin = "anonymous";
    this.isPredicting = false;

    this.isWorkerBusy = false;
    this.initWebGL();

    try {
        this.aiWorker = new Worker('/workers/ai_worker.js');

        this.aiWorker.onmessage = (e) => {
            const { type, mask, timestamp, isPrediction, id } = e.data;

            if (type === 'MODEL_LOADED') {
                this.log("✅ AI Worker Ready (Throttled Mode)!");
                this.isAIReady = true;
                if (loadingEl) loadingEl.classList.add('hidden');
                this.requestRedraw();
            } 
            else if (type === 'MASK_READY') {
                this.isWorkerBusy = false; 
                this.handleWorkerResults(mask, timestamp, isPrediction, id);
                
                if (isPrediction && !this.isPlaying) {
                    this.continuePredictionLoop();
                }
            }
        };

        this.aiWorker.postMessage({ type: 'INIT' });
        return true;

    } catch (e) {
        console.error("AI Worker Start Failed", e);
        if (loadingEl) loadingEl.classList.add('hidden');
        return false;
    }
};

window.EditorApp.prototype.handleWorkerResults = function(maskBitmap, resultTimestamp, isPrediction, clipId) {
    // OPTIMIZATION: Quantize timestamp to bucket key (matches throttling logic)
    const rawFrame = Math.floor(resultTimestamp * 30);
    const bucketFrame = Math.floor(rawFrame / this.AI_THROTTLE_RATE) * this.AI_THROTTLE_RATE;
    const cacheKey = bucketFrame;
    
    // RAM Management
    if (this.maskCache.size >= this.MAX_CACHE_SIZE) {
        const firstKey = this.maskCache.keys().next().value;
        const oldMask = this.maskCache.get(firstKey);
        
        if (this.tracks) {
            for (const track of this.tracks) {
                for (const clip of track.clips) {
                    if (clip.aiMask === oldMask) {
                        clip.aiMask = null;
                    }
                }
            }
        }

        if(oldMask && typeof oldMask.close === 'function') oldMask.close(); 
        this.maskCache.delete(firstKey);
    }
    
    this.maskCache.set(cacheKey, maskBitmap);

    if (!isPrediction) {
        if (clipId) {
            const clip = this.findClipById(clipId);
            if (clip) {
                clip.aiMask = maskBitmap;
                this.requestRedraw();
            }
        }
    }
};

// --- Predictive Lookahead Logic ---

window.EditorApp.prototype.startPredictiveCaching = function() {
    if (!this.isAIReady || this.isPlaying || this.isPredicting || this.isWorkerBusy) return;
    
    const activeAiClip = this.findActiveAiClip();
    if (!activeAiClip) return;

    this.isPredicting = true;
    this.predictionTargetTime = this.currentTime;
    this.predictionClip = activeAiClip;

    if (this.shadowVideo.src !== activeAiClip.src) {
        this.shadowVideo.src = activeAiClip.src;
    }

    this.continuePredictionLoop();
};

window.EditorApp.prototype.stopPredictiveCaching = function() {
    this.isPredicting = false;
};

window.EditorApp.prototype.continuePredictionLoop = function() {
    if (!this.isPredicting || this.isPlaying || this.isWorkerBusy) return;

    // OPTIMIZATION: Jump by THROTTLE_RATE frames instead of 1
    this.predictionTargetTime += (this.AI_THROTTLE_RATE / 30); 
    
    if (this.predictionTargetTime > this.currentTime + 5 || this.predictionTargetTime > this.duration) {
        this.isPredicting = false;
        return;
    }

    const rawFrame = Math.floor(this.predictionTargetTime * 30);
    const bucketFrame = Math.floor(rawFrame / this.AI_THROTTLE_RATE) * this.AI_THROTTLE_RATE;
    
    if (this.maskCache.has(bucketFrame)) {
        this.continuePredictionLoop(); 
        return;
    }

    this.shadowVideo.currentTime = this.predictionTargetTime;
    
    const onSeeked = () => {
        this.shadowVideo.removeEventListener('seeked', onSeeked);
        if (!this.isPredicting || this.isPlaying) return;

        // 360p Downsample
        this.aiDownscaleCtx.drawImage(this.shadowVideo, 0, 0, 360, 202);
        const bitmap = this.aiDownscaleCanvas.transferToImageBitmap();
        
        this.isWorkerBusy = true;
        
        this.aiWorker.postMessage({ 
            type: 'PROCESS_FRAME', 
            image: bitmap, 
            timestamp: this.predictionTargetTime,
            isPrediction: true,
            id: this.predictionClip.id
        }, [bitmap]);
    };

    this.shadowVideo.addEventListener('seeked', onSeeked, { once: true });
};

window.EditorApp.prototype.findActiveAiClip = function() {
    for (const track of this.tracks) {
        const clips = track.getClipsAtTime(this.currentTime);
        for (const clip of clips) {
            if (clip.aiSegmentation && clip.aiSegmentation.enabled) return clip;
        }
    }
    return null;
};

// =========================================================
// 1.5 Synchronous Mask Generation for Offline Export
// =========================================================

window.EditorApp.prototype.generateAiMaskForExport = function(clip, time, sourceEl, exportW, exportH) {
    return new Promise(async (resolve, reject) => {
        if (!this.aiWorker) {
            const success = await this.initAIModel();
            if (!success) return resolve(null);
        }

        if (!this.pendingExportMasks) {
            this.pendingExportMasks = new Map();
            const originalOnMessage = this.aiWorker.onmessage;
            this.aiWorker.onmessage = (e) => {
                const { type, mask, timestamp, isPrediction, id } = e.data;
                if (type === 'MASK_READY' && this.pendingExportMasks.has(id)) {
                    const res = this.pendingExportMasks.get(id);
                    this.pendingExportMasks.delete(id);
                    res(mask);
                } else if (originalOnMessage) {
                    originalOnMessage(e);
                }
            };
        }

        const id = clip.id + '_export_' + Math.random().toString(36).substring(7);
        this.pendingExportMasks.set(id, resolve);

        if (!this.exportMaskCanvas) {
            this.exportMaskCanvas = new OffscreenCanvas(exportW, exportH);
            this.exportMaskCtx = this.exportMaskCanvas.getContext('2d', { alpha: false, willReadFrequently: true });
        } else {
            if(this.exportMaskCanvas.width !== exportW) this.exportMaskCanvas.width = exportW;
            if(this.exportMaskCanvas.height !== exportH) this.exportMaskCanvas.height = exportH;
        }

        this.exportMaskCtx.drawImage(sourceEl, 0, 0, exportW, exportH);
        const bitmap = this.exportMaskCanvas.transferToImageBitmap();
        
        this.aiWorker.postMessage({ 
            type: 'PROCESS_FRAME', 
            image: bitmap, 
            timestamp: time,
            isPrediction: false,
            id: id
        }, [bitmap]);
    });
};

