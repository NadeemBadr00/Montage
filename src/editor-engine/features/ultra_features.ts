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

// =========================================================
// 2. Full WebGL Compositing Pipeline (Centered Geometry)
// =========================================================

window.EditorApp.prototype.initWebGL = function() {
    this.glCanvas = document.createElement('canvas');
    this.glCanvas.width = 1920; 
    this.glCanvas.height = 1080;
    
    this.gl = this.glCanvas.getContext('webgl2', { 
        premultipliedAlpha: true, 
        alpha: true,
        preserveDrawingBuffer: false 
    });

    if (!this.gl) return;
    const gl = this.gl;

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);

    // 🔥 FIX: Transformed Order: Scale -> Rotate -> Translate
    const vsSource = `#version 300 es
    in vec2 a_position;
    in vec2 a_texCoord;
    uniform vec2 u_resolution;
    uniform vec2 u_translation;
    uniform vec2 u_scale;
    uniform float u_rotation;
    uniform vec2 u_uvScale;
    uniform vec2 u_uvOffset;
    uniform int u_uvRotation;
    out vec2 v_texCoord;
    out vec2 v_quadPos;
    void main() {
        // 1. Scale first (This applies dimensions to the unit quad)
        // This ensures the quad takes the shape of the image aspect ratio
        vec2 scaledPosition = a_position * u_scale;

        // 2. Rotate the SHAPED quad
        float c = cos(u_rotation);
        float s = sin(u_rotation);
        vec2 rotatedPosition = vec2(scaledPosition.x * c - scaledPosition.y * s, scaledPosition.x * s + scaledPosition.y * c);
        
        // 3. Translate
        vec2 position = rotatedPosition + u_translation;
        
        // Convert pixel coords (0..W, 0..H) to Clip Space (-1..1, -1..1)
        vec2 zeroToOne = position / u_resolution;
        vec2 zeroToTwo = zeroToOne * 2.0;
        vec2 clipSpace = zeroToTwo - 1.0;
        
        // Flip Y for WebGL Coordinate System
        gl_Position = vec4(clipSpace * vec2(1, -1), 0, 1); 
        v_quadPos = a_position;
        
        vec2 uv = a_texCoord;
        if (u_uvRotation == 1) uv = vec2(uv.y, 1.0 - uv.x);
        else if (u_uvRotation == 2) uv = vec2(1.0 - uv.x, 1.0 - uv.y);
        else if (u_uvRotation == 3) uv = vec2(1.0 - uv.y, uv.x);
        
        v_texCoord = (uv * u_uvScale) + u_uvOffset;
    }`;

    const fsSource = `#version 300 es
    precision mediump float;
    uniform sampler2D u_image;
    uniform sampler2D u_mask;
    uniform int u_useMask;
    uniform int u_useChroma;
    uniform vec3 u_chromaColor;
    uniform float u_chromaThreshold;
    uniform float u_opacity;
    // Logo Remover Uniforms
    uniform int u_numRemovers;
    uniform vec4 u_removerRects[3]; // x, y, width, height (0.0 to 1.0)
    uniform int u_removerModes[3]; // 0=blur, 1=pixelate, 2=interpolate
    uniform float u_removerStrengths[3]; // 0.0 to 1.0
    
    // Transition uniforms
    uniform sampler2D u_imageB;
    uniform int u_isTransition;      // 0 = single, 1 = transition
    uniform int u_transitionType;    // 1: dissolve/fade, 2: wipe right, 3: zoom
    uniform float u_transitionProgress;
    
    // Border Radius Uniforms
    uniform float u_borderRadius;
    uniform vec2 u_quadSize;
    
    in vec2 v_texCoord;
    in vec2 v_quadPos;
    out vec4 outColor;
    
    void main() {
        if (v_texCoord.x < 0.0 || v_texCoord.x > 1.0 || v_texCoord.y < 0.0 || v_texCoord.y > 1.0) {
            outColor = vec4(0.0, 0.0, 0.0, 1.0);
            return;
        }
        
        if (u_borderRadius > 0.0 && u_quadSize.x > 0.0 && u_quadSize.y > 0.0) {
            float minDim = min(u_quadSize.x, u_quadSize.y);
            float r = u_borderRadius * minDim; 
            
            vec2 pixelPos = abs(v_quadPos) * u_quadSize; 
            vec2 safeArea = (u_quadSize * 0.5) - vec2(r);
            
            if (pixelPos.x > safeArea.x && pixelPos.y > safeArea.y) {
                float dist = length(pixelPos - safeArea);
                if (dist > r) {
                    outColor = vec4(0.0);
                    return;
                }
            }
        }
        
        vec4 color = texture(u_image, v_texCoord);
        
        // --- Object / Logo Removal ---
        for (int i = 0; i < 3; i++) {
            if (i >= u_numRemovers) break;
            vec4 rect = u_removerRects[i];
            
            // Check if inside rect
            if (v_texCoord.x >= rect.x && v_texCoord.x <= rect.x + rect.z &&
                v_texCoord.y >= rect.y && v_texCoord.y <= rect.y + rect.w) {
                
                int mode = u_removerModes[i];
                float str = u_removerStrengths[i];
                
                if (mode == 0) { // Blur
                    vec4 blurColor = vec4(0.0);
                    float blurSize = str * 0.01; 
                    for(float bx=-2.0; bx<=2.0; bx++) {
                        for(float by=-2.0; by<=2.0; by++) {
                            blurColor += texture(u_image, v_texCoord + vec2(bx, by) * blurSize);
                        }
                    }
                    color = blurColor / 25.0;
                } 
                else if (mode == 1) { // Pixelate
                    float blocks = 150.0 - (str * 140.0); // 10 to 150 blocks
                    if (blocks < 1.0) blocks = 1.0;
                    vec2 uv = floor(v_texCoord * blocks) / blocks;
                    color = texture(u_image, uv);
                } 
                else if (mode == 2) { // Interpolate
                    vec4 cLeft = texture(u_image, vec2(rect.x, v_texCoord.y));
                    vec4 cRight = texture(u_image, vec2(rect.x + rect.z, v_texCoord.y));
                    vec4 cTop = texture(u_image, vec2(v_texCoord.x, rect.y));
                    vec4 cBottom = texture(u_image, vec2(v_texCoord.x, rect.y + rect.w));
                    float tX = (v_texCoord.x - rect.x) / rect.z;
                    float tY = (v_texCoord.y - rect.y) / rect.w;
                    vec4 cX = mix(cLeft, cRight, tX);
                    vec4 cY = mix(cTop, cBottom, tY);
                    color = (cX + cY) / 2.0;
                }
            }
        }
        
        if (u_useMask == 1) {
            vec4 maskColor = texture(u_mask, v_texCoord);
            float maskVal = maskColor.r;
            if (maskVal > 0.498) { // 127/255 (equivalent to > 0.5 in python)
                color = vec4(color.rgb, color.a);
            } else {
                color = vec4(0.0);
            }
        }
        if (u_useChroma == 1) {
            float dist = distance(color.rgb, u_chromaColor);
            if (dist < u_chromaThreshold) color.a = 0.0;
        }
        color.a *= u_opacity;
        if (u_isTransition == 1) {
            vec4 colorB = texture(u_imageB, v_texCoord);
            float p = u_transitionProgress;
            if (u_transitionType == 2) { // Wipe Right
                outColor = (v_texCoord.x < p) ? colorB : color;
            } else if (u_transitionType == 3) { // Zoom Blur
                vec2 centered = v_texCoord - 0.5;
                float sc = 1.0 + p * 0.5;
                vec2 zc = (centered / sc) + 0.5;
                vec4 zoomedB = (zc.x >= 0.0 && zc.x <= 1.0 && zc.y >= 0.0 && zc.y <= 1.0)
                    ? texture(u_imageB, zc) : color;
                outColor = mix(color, zoomedB, p);
            } else { // Cross Dissolve / Fade (type 1 or default)
                outColor = mix(color, colorB, p);
            }
        } else {
            outColor = color;
        }
        outColor.rgb *= outColor.a;
    }`;

    const createShader = (gl, type, source) => {
        const shader = gl.createShader(type);
        gl.shaderSource(shader, source);
        gl.compileShader(shader);
        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) return null;
        return shader;
    };

    const vs = createShader(gl, gl.VERTEX_SHADER, vsSource);
    const fs = createShader(gl, gl.FRAGMENT_SHADER, fsSource);
    this.program = gl.createProgram();
    gl.attachShader(this.program, vs);
    gl.attachShader(this.program, fs);
    gl.linkProgram(this.program);

    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
        -0.5, -0.5,  0.5, -0.5, -0.5,  0.5,
        -0.5,  0.5,  0.5, -0.5,  0.5,  0.5
    ]), gl.STATIC_DRAW);

    const texCoordBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, texCoordBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
        0, 0, 1, 0, 0, 1,
        0, 1, 1, 0, 1, 1
    ]), gl.STATIC_DRAW);

    this.glInfo = {
        program: this.program,
        attribs: {
            position: gl.getAttribLocation(this.program, "a_position"),
            texCoord: gl.getAttribLocation(this.program, "a_texCoord"),
        },
        uniforms: {
            resolution:       gl.getUniformLocation(this.program, "u_resolution"),
            translation:      gl.getUniformLocation(this.program, "u_translation"),
            scale:            gl.getUniformLocation(this.program, "u_scale"),
            rotation:         gl.getUniformLocation(this.program, "u_rotation"),
            uvScale:          gl.getUniformLocation(this.program, "u_uvScale"),
            uvOffset:         gl.getUniformLocation(this.program, "u_uvOffset"),
            uvRotation:       gl.getUniformLocation(this.program, "u_uvRotation"),
            image:            gl.getUniformLocation(this.program, "u_image"),
            imageB:           gl.getUniformLocation(this.program, "u_imageB"),
            isTransition:     gl.getUniformLocation(this.program, "u_isTransition"),
            transitionType:   gl.getUniformLocation(this.program, "u_transitionType"),
            transitionProgress: gl.getUniformLocation(this.program, "u_transitionProgress"),
            mask:             gl.getUniformLocation(this.program, "u_mask"),
            useMask:          gl.getUniformLocation(this.program, "u_useMask"),
            useChroma:        gl.getUniformLocation(this.program, "u_useChroma"),
            chromaColor:      gl.getUniformLocation(this.program, "u_chromaColor"),
            chromaThreshold:  gl.getUniformLocation(this.program, "u_chromaThreshold"),
            opacity:          gl.getUniformLocation(this.program, "u_opacity"),
            numRemovers:      gl.getUniformLocation(this.program, "u_numRemovers"),
            removerRects:     gl.getUniformLocation(this.program, "u_removerRects"),
            removerModes:     gl.getUniformLocation(this.program, "u_removerModes"),
            removerStrengths: gl.getUniformLocation(this.program, "u_removerStrengths"),
            borderRadius:     gl.getUniformLocation(this.program, "u_borderRadius"),
            quadSize:         gl.getUniformLocation(this.program, "u_quadSize"),
        },
        buffers: { position: positionBuffer, texCoord: texCoordBuffer }
    };

    this.videoTexture  = gl.createTexture();
    this.videoTextureB = gl.createTexture(); // for transition second clip
    this.maskTexture   = gl.createTexture();
    this.setupTexture(this.videoTexture);
    this.setupTexture(this.videoTextureB);
    this.setupTexture(this.maskTexture);
    
    // 🔥 NEW: Cache for Static Image Textures to avoid re-uploading every frame
    this.staticTextureCache = new Map();
};

window.EditorApp.prototype.setupTexture = function(tex) {
    const gl = this.gl;
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
};

// 🔥 NEW: Helper to resize huge images to 1080p for Preview Texture (Speed up)
window.EditorApp.prototype.getOrUpdateImageTexture = function(gl, clip, sourceEl) {
    if (this.staticTextureCache.has(clip.src)) {
        return this.staticTextureCache.get(clip.src);
    }

    // Create a new texture for this image
    const tex = gl.createTexture();
    this.setupTexture(tex);
    
    // Downscale logic
    const MAX_DIM = 1920; 
    let width = sourceEl.naturalWidth;
    let height = sourceEl.naturalHeight;
    
    // If image is huge, resize it for the texture upload
    if (width > MAX_DIM || height > MAX_DIM) {
        const ratio = Math.min(MAX_DIM / width, MAX_DIM / height);
        const w = Math.floor(width * ratio);
        const h = Math.floor(height * ratio);
        
        // Use a temporary canvas to resize
        const tempCanvas = new OffscreenCanvas(w, h);
        const ctx = tempCanvas.getContext('2d');
        ctx.drawImage(sourceEl, 0, 0, w, h);
        
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, tempCanvas);
    } else {
        // Use original if small enough
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, sourceEl);
    }

    // Cache it!
    this.staticTextureCache.set(clip.src, tex);
    return tex;
};

window.EditorApp.prototype.getSourceElement = function(clip) {
    // ✅ FIX: Priority to offline decoded VideoFrames during export
    // If we are exporting and a frame was decoded for this clip, use it directly!
    // This makes offline export frame-perfect and prevents WebGL from grabbing
    // a desynced frame from the background HTML5 video player.
    if (this.exportVideoFrames && this.exportVideoFrames.has(clip.id)) {
        return this.exportVideoFrames.get(clip.id);
    }

    if (clip.type === 'video') {
        const key = `visual_${clip.src}`;
        if (!this.players) return null;
        const player = this.players.find(p => p.getAttribute('data-key') === key);
        return (player && player.readyState >= 2) ? player : null;
    } else if (clip.type === 'image') {
        if (this.getImageFromCache) {
            const img = this.getImageFromCache(clip.src);
            return (img && img.complete && img.naturalWidth > 0) ? img : null;
        }
        if (!this.imgCache) return null;
        const img = this.imgCache.get(clip.src);
        return (img && img.complete) ? img : null;
    }
    return null;
};

window.EditorApp.prototype.renderWebGLComposition = function(renderJobs, w, h) {
    if (!this.gl) return;
    const gl = this.gl;

    if (this.glCanvas.width !== w || this.glCanvas.height !== h) {
        this.glCanvas.width = w; this.glCanvas.height = h;
        gl.viewport(0, 0, w, h);
    }
    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.useProgram(this.program);
    gl.uniform2f(this.glInfo.uniforms.resolution, w, h);

    this.bindQuadAttributes(gl);

    for (const job of renderJobs) {
        if (job.type === 'single') {
            const clip = job.clip;
            if (clip.type !== 'video' && clip.type !== 'image') continue;

            const sourceEl = this.getSourceElement(clip);
            if (!sourceEl) continue;

            if (clip.aiSegmentation?.enabled) {
                const rawFrame = Math.floor(this.currentTime * 30);
                const bucketFrame = Math.floor(rawFrame / (this.AI_THROTTLE_RATE || 3)) * (this.AI_THROTTLE_RATE || 3);
                const cachedMask = this.maskCache.get(bucketFrame);
                if (cachedMask) {
                    clip.aiMask = cachedMask;
                } else if (!this.isWorkerBusy) {
                    this.currentProcessingClipId = clip.id;
                    this.isWorkerBusy = true;
                    this.aiDownscaleCtx.drawImage(sourceEl, 0, 0, 360, 202);
                    const bitmap = this.aiDownscaleCanvas.transferToImageBitmap();
                    this.aiWorker.postMessage({ type: 'PROCESS_FRAME', image: bitmap, timestamp: this.currentTime, isPrediction: false, id: clip.id }, [bitmap]);
                }
            }

            // If it's a frame with inner media, draw the inner media FIRST
            if (clip.src.includes('frame_') && clip.properties.innerMediaSrc) {
                const uvScaleX = clip.properties.innerUvScaleX !== undefined ? clip.properties.innerUvScaleX : 1.0;
                const uvScaleY = clip.properties.innerUvScaleY !== undefined ? clip.properties.innerUvScaleY : 1.0;
                
                const baseOffsetX = (1.0 - uvScaleX) / 2.0;
                const baseOffsetY = (1.0 - uvScaleY) / 2.0;
                
                const panX = -((clip.properties.innerOffsetX || 0) / 1000.0) * 0.5;
                const panY = -((clip.properties.innerOffsetY || 0) / 1000.0) * 0.5;

                let dxFrac = 0; let dyFrac = 0;
                if (clip.src.includes('frame_real_ipad')) { dxFrac = -0.5 / 840; dyFrac = -0.5 / 634; }
                else if (clip.src.includes('frame_real_iphone')) { dxFrac = 0.0 / 365; dyFrac = -0.5 / 730; }
                else if (clip.src.includes('frame_real_laptop')) { dxFrac = -0.5 / 942; dyFrac = -114.0 / 766; }
                else if (clip.src.includes('frame_real_monitor')) { dxFrac = -0.5 / 840; dyFrac = -88.0 / 680; }
                else if (clip.src.includes('frame_real_samsung')) { dxFrac = -3.0 / 427; dyFrac = -3.0 / 868; }
                else if (clip.src.includes('frame_real_ui_instagram')) { dxFrac = -0.5 / 462; dyFrac = -1.5 / 913; }
                else if (clip.src.includes('frame_real_ui_tiktok')) { dxFrac = -5.5 / 427; dyFrac = -4.0 / 818; }
                else if (clip.src.includes('frame_real_ui_youtube')) { dxFrac = -6.5 / 842; dyFrac = 1.5 / 430; }
                
                let parentShiftX = 0; let parentShiftY = 0;
                if (dxFrac !== 0 || dyFrac !== 0) {
                    let srcW = sourceEl ? (sourceEl.naturalWidth || sourceEl.videoWidth || w) : w;
                    let srcH = sourceEl ? (sourceEl.naturalHeight || sourceEl.videoHeight || h) : h;
                    const coverRatio = Math.max(w / srcW, h / srcH);
                    const userScale = (clip.properties.scale || 100) / 100;
                    let outerW = srcW * coverRatio * userScale * ((clip.properties.scaleX !== undefined ? clip.properties.scaleX : 100) / 100);
                    let outerH = srcH * coverRatio * userScale * ((clip.properties.scaleY !== undefined ? clip.properties.scaleY : 100) / 100);
                    parentShiftX = dxFrac * outerW;
                    parentShiftY = dyFrac * outerH;
                }

                let innerBr = clip.properties.innerBorderRadius !== undefined ? parseFloat(clip.properties.innerBorderRadius) : (clip.src.includes('frame_real') ? 0.06 : 0.0);
                let innerScaleX = clip.properties.innerScaleX !== undefined ? parseFloat(clip.properties.innerScaleX) : 100;
                let innerScaleY = clip.properties.innerScaleY !== undefined ? parseFloat(clip.properties.innerScaleY) : 100;
                
                if (clip.properties.innerFitMode === 'tight') {
                    innerScaleX *= 0.95;
                    innerScaleY *= 0.95;
                } else if (clip.properties.innerFitMode === 'smart') {
                    innerBr = 0.15;
                }

                const innerMockClip = {
                    id: clip.id + '_inner',
                    type: clip.properties.innerMediaType,
                    src: clip.properties.innerMediaSrc,
                    properties: {
                        scale: clip.properties.scale,
                        scaleX: innerScaleX,
                        scaleY: innerScaleY,
                        positionX: clip.properties.positionX,
                        positionY: clip.properties.positionY,
                        rotation: clip.properties.rotation,
                        opacity: clip.properties.opacity,
                        flipX: clip.properties.innerFlipX,
                        flipY: clip.properties.innerFlipY,
                        forcedWidth: clip.properties.innerForcedWidth,
                        forcedHeight: clip.properties.innerForcedHeight,
                        uvScaleX: uvScaleX,
                        uvScaleY: uvScaleY,
                        uvOffsetX: baseOffsetX + panX,
                        uvOffsetY: baseOffsetY + panY,
                        innerRotation: clip.properties.innerRotation || 0,
                        parentShiftX: parentShiftX,
                        parentShiftY: parentShiftY,
                        borderRadius: innerBr
                    }
                };
                const innerSourceEl = this.getSourceElement(innerMockClip);
                if (innerSourceEl) {
                    this.drawLayerInWebGL(gl, innerMockClip, innerSourceEl, w, h, null, null, null, 0);
                }
            }

            // Apply overrideOpacity from track-level Fade In/Out transitions
            const savedOpacity = clip.properties.opacity;
            if (job.overrideOpacity !== undefined) {
                clip.properties.opacity = Math.round(job.overrideOpacity * 100);
            }
            this.drawLayerInWebGL(gl, clip, sourceEl, w, h, null, null, null, 0);
            if (job.overrideOpacity !== undefined) {
                clip.properties.opacity = savedOpacity; // restore
            }


        } else if (job.type === 'transition') {
            const { clipA, clipB, transition, progress } = job;
            const sourceElA = clipA ? this.getSourceElement(clipA) : null;
            const sourceElB = clipB ? this.getSourceElement(clipB) : null;
            if (!sourceElA && !sourceElB) continue;

            this.drawLayerInWebGL(gl, clipA || clipB, sourceElA, w, h, clipB || clipA, sourceElB, transition, progress);
        }
    }

    return this.glCanvas;
};

window.EditorApp.prototype.drawLayerInWebGL = function(gl, clip, sourceEl, canvasW, canvasH, clipB, sourceElB, transition, progress) {
    if (!clip && !clipB) return;
    const baseClip = clip || clipB;

    // --- Texture A (primary clip) ---
    if (!this.emptyTexture) {
        this.emptyTexture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, this.emptyTexture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([0,0,0,0]));
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    }

    gl.activeTexture(gl.TEXTURE0);
    if (clip && sourceEl) {
        if (clip.type === 'image') {
            gl.bindTexture(gl.TEXTURE_2D, this.getOrUpdateImageTexture(gl, clip, sourceEl));
        } else {
            gl.bindTexture(gl.TEXTURE_2D, this.videoTexture);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, sourceEl);
        }
    } else {
        gl.bindTexture(gl.TEXTURE_2D, this.emptyTexture);
    }
    gl.uniform1i(this.glInfo.uniforms.image, 0);

    // --- Transition (Texture B) ---
    if (transition && (clipB || clip)) {
        gl.activeTexture(gl.TEXTURE2);
        if (clipB && sourceElB) {
            if (clipB.type === 'image') {
                gl.bindTexture(gl.TEXTURE_2D, this.getOrUpdateImageTexture(gl, clipB, sourceElB));
            } else {
                gl.bindTexture(gl.TEXTURE_2D, this.videoTextureB);
                gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, sourceElB);
            }
        } else {
            gl.bindTexture(gl.TEXTURE_2D, this.emptyTexture);
        }
        gl.uniform1i(this.glInfo.uniforms.imageB, 2);
        gl.uniform1i(this.glInfo.uniforms.isTransition, 1);
        let tType = 1; // default: cross dissolve
        if (transition.type === 'wipe') tType = 2;
        if (transition.type === 'zoom') tType = 3;
        gl.uniform1i(this.glInfo.uniforms.transitionType, tType);
        gl.uniform1f(this.glInfo.uniforms.transitionProgress, progress || 0);
    } else {
        gl.uniform1i(this.glInfo.uniforms.isTransition, 0);
    }

    // --- Mask ---
    const useMask = (baseClip.aiSegmentation?.enabled && baseClip.aiMask);
    if (useMask) {
        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D, this.maskTexture);
        try {
            if (baseClip.aiMask && baseClip.aiMask.width > 0) {
                gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, baseClip.aiMask);
                gl.uniform1i(this.glInfo.uniforms.mask, 1);
                gl.uniform1i(this.glInfo.uniforms.useMask, 1);
            } else { gl.uniform1i(this.glInfo.uniforms.useMask, 0); }
        } catch (e) { gl.uniform1i(this.glInfo.uniforms.useMask, 0); }
    } else {
        gl.uniform1i(this.glInfo.uniforms.useMask, 0);
    }

    // --- Chroma Key ---
    if (baseClip.chromaKey?.enabled) {
        gl.uniform1i(this.glInfo.uniforms.useChroma, 1);
        const hex = baseClip.chromaKey.color;
        gl.uniform3f(this.glInfo.uniforms.chromaColor,
            parseInt(hex.slice(1,3),16)/255,
            parseInt(hex.slice(3,5),16)/255,
            parseInt(hex.slice(5,7),16)/255);
        gl.uniform1f(this.glInfo.uniforms.chromaThreshold, baseClip.chromaKey.threshold / 255);
    } else {
        gl.uniform1i(this.glInfo.uniforms.useChroma, 0);
    }

    // --- Transform ---
    let rawScale = baseClip.properties.scale || 100;
    let rawScaleX = baseClip.properties.scaleX !== undefined ? baseClip.properties.scaleX : 100;
    let rawScaleY = baseClip.properties.scaleY !== undefined ? baseClip.properties.scaleY : 100;
    let rawX = baseClip.properties.positionX || 0;
    let rawY = baseClip.properties.positionY || 0;

    const refEl = sourceEl || sourceElB;
    let srcW = refEl ? (refEl.naturalWidth || refEl.videoWidth || canvasW) : canvasW;
    let srcH = refEl ? (refEl.naturalHeight || refEl.videoHeight || canvasH) : canvasH;
    const coverRatio = Math.max(canvasW / srcW, canvasH / srcH);
    let width  = srcW * coverRatio;
    let height = srcH * coverRatio;

    let finalWidth, finalHeight;
    if (baseClip.properties.forcedWidth && baseClip.properties.forcedHeight) {
        const userScale = rawScale / 100;
        finalWidth  = baseClip.properties.forcedWidth * userScale;
        finalHeight = baseClip.properties.forcedHeight * userScale;
    } else {
        const userScale = rawScale / 100;
        finalWidth  = width  * userScale * (rawScaleX / 100);
        finalHeight = height * userScale * (rawScaleY / 100);
    }

    const rotation = (baseClip.properties.rotation || 0) * (Math.PI / 180);
    let x = (canvasW / 2) + rawX;
    let y = (canvasH / 2) + rawY;
    
    let dx = baseClip.properties.parentShiftX || 0;
    let dy = baseClip.properties.parentShiftY || 0;
    if (dx !== 0 || dy !== 0) {
        const c = Math.cos(rotation);
        const s = Math.sin(rotation);
        x += (dx * c - dy * s);
        y += (dx * s + dy * c);
    }
    let finalOpacity = (baseClip.properties.opacity !== undefined ? baseClip.properties.opacity : 100) / 100;

    // Clip-level In/Out animation (from Effect Controls "Transitions" section)
    if (baseClip.transitions && !transition) {
        const transDur = baseClip.transitions.duration || 1.0;
        const timeInClip   = this.currentTime - baseClip.start;
        const timeRemaining = (baseClip.start + baseClip.duration) - this.currentTime;
        let animProgress = 1, animType = 'none', animMode = '';
        if (timeInClip < transDur && baseClip.transitions.in && baseClip.transitions.in !== 'none') {
            animProgress = Math.max(0, timeInClip / transDur);
            animType = baseClip.transitions.in;
            animMode = 'in';
        } else if (timeRemaining < transDur && baseClip.transitions.out && baseClip.transitions.out !== 'none') {
            animProgress = Math.max(0, timeRemaining / transDur);
            animType = baseClip.transitions.out;
            animMode = 'out';
        }
        if      (animType === 'fade')       finalOpacity *= animProgress;
        else if (animType === 'slideLeft')  x += (1 - animProgress) * canvasW  * (animMode === 'in' ? 1 : -1);
        else if (animType === 'slideRight') x += (1 - animProgress) * -canvasW * (animMode === 'in' ? 1 : -1);
        else if (animType === 'slideUp')    y += (1 - animProgress) * canvasH  * (animMode === 'in' ? 1 : -1);
        else if (animType === 'wipe') {
            // Uniform scale from center — matches canvas_renderer iris clip
            const dir = animMode === 'in' ? animProgress : (1 - animProgress);
            finalWidth  *= Math.max(0.001, dir);
            finalHeight *= Math.max(0.001, dir);
        }
        else if (animType === 'zoom') { finalWidth *= Math.max(0.01, animProgress); finalHeight *= Math.max(0.01, animProgress); }
    }

    if (baseClip.properties.flipX) finalWidth *= -1;
    if (baseClip.properties.flipY) finalHeight *= -1;

    gl.uniform2f(this.glInfo.uniforms.translation, x, y);
    gl.uniform2f(this.glInfo.uniforms.scale, finalWidth, finalHeight);
    gl.uniform1f(this.glInfo.uniforms.rotation, rotation);
    gl.uniform1f(this.glInfo.uniforms.opacity, finalOpacity);
    
    const uvScaleX = baseClip.properties.uvScaleX !== undefined ? baseClip.properties.uvScaleX : 1.0;
    const uvScaleY = baseClip.properties.uvScaleY !== undefined ? baseClip.properties.uvScaleY : 1.0;
    const uvOffsetX = baseClip.properties.uvOffsetX !== undefined ? baseClip.properties.uvOffsetX : 0.0;
    const uvOffsetY = baseClip.properties.uvOffsetY !== undefined ? baseClip.properties.uvOffsetY : 0.0;
    
    const uvRot = baseClip.properties.innerRotation || 0;
    let uvRotIndex = 0;
    if (uvRot === 90) uvRotIndex = 1;
    else if (uvRot === 180) uvRotIndex = 2;
    else if (uvRot === 270) uvRotIndex = 3;
    
    gl.uniform2f(this.glInfo.uniforms.uvScale, uvScaleX, uvScaleY);
    gl.uniform2f(this.glInfo.uniforms.uvOffset, uvOffsetX, uvOffsetY);
    gl.uniform1i(this.glInfo.uniforms.uvRotation, uvRotIndex);
    
    // --- Logo / Object Removers ---
    const removers = baseClip.logoRemovers || [];
    gl.uniform1i(this.glInfo.uniforms.numRemovers, removers.length);
    if (removers.length > 0) {
        const rects = new Float32Array(3 * 4);
        const modes = new Int32Array(3);
        const strengths = new Float32Array(3);
        
        for (let i = 0; i < Math.min(3, removers.length); i++) {
            const rm = removers[i];
            const px = (rm.x / 100) - (rm.width / 200);
            const py = (rm.y / 100) - (rm.height / 200);
            const pw = rm.width / 100;
            const ph = rm.height / 100;
            rects.set([px, py, pw, ph], i * 4);
            
            let m = 0;
            if (rm.mode === 'pixelate') m = 1;
            else if (rm.mode === 'interpolate') m = 2;
            modes[i] = m;
            
            strengths[i] = rm.strength / 100;
        }
        gl.uniform4fv(this.glInfo.uniforms.removerRects, rects);
        gl.uniform1iv(this.glInfo.uniforms.removerModes, modes);
        gl.uniform1fv(this.glInfo.uniforms.removerStrengths, strengths);
    }

    gl.uniform2f(this.glInfo.uniforms.quadSize, finalWidth, finalHeight);
    gl.uniform1f(this.glInfo.uniforms.borderRadius, baseClip.properties.borderRadius || 0.0);

    gl.drawArrays(gl.TRIANGLES, 0, 6);
};

window.EditorApp.prototype.bindQuadAttributes = function(gl) {
    gl.bindBuffer(gl.ARRAY_BUFFER, this.glInfo.buffers.position);
    gl.enableVertexAttribArray(this.glInfo.attribs.position);
    gl.vertexAttribPointer(this.glInfo.attribs.position, 2, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.glInfo.buffers.texCoord);
    gl.enableVertexAttribArray(this.glInfo.attribs.texCoord);
    gl.vertexAttribPointer(this.glInfo.attribs.texCoord, 2, gl.FLOAT, false, 0, 0);
};

// UI Helpers (Toggle AI, etc)
const prevUpdateEffectControls = window.EditorApp.prototype.updateEffectControls;
window.EditorApp.prototype.updateEffectControls = function() {
    if(prevUpdateEffectControls) prevUpdateEffectControls.call(this);
    const panel = document.getElementById('effect-controls-content');
    if (!panel) return;

    // ✅ Same smart group logic as pro_features: handle video+audio groupId pairs
    let clipId = null;
    if (this.selectedClipIds.size === 1) {
        clipId = Array.from(this.selectedClipIds)[0];
    } else if (this.selectedClipIds.size > 1) {
        const allSelected = Array.from(this.selectedClipIds)
            .map(id => this.findClipById(id))
            .filter(Boolean);
        const groupIds = [...new Set(allSelected.map(c => c.groupId).filter(Boolean))];
        if (groupIds.length === 1) {
            const primary = allSelected.find(c => c.type === 'video')
                         || allSelected.find(c => c.type === 'image')
                         || allSelected.find(c => c.type !== 'audio');
            if (primary) clipId = primary.id;
        }
    }
    if (!clipId) return;

    const clip = this.findClipById(clipId);
    if (!clip || clip.type === 'audio' || clip.type === 'text') return; 

    if(document.getElementById('ultra-controls-group')) return;

    const createRange = (label, objName, prop, min, max, unit) => `
        <div class="flex items-center justify-between mb-2">
            <label class="text-[10px] text-gray-400 w-16">${label}</label>
            <div class="flex items-center gap-2 flex-1">
                <input type="range" min="${min}" max="${max}" value="${clip[objName][prop]}" 
                    class="w-full h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer range-sm"
                    oninput="app.updateUltraProp('${clipId}', '${objName}', '${prop}', this.value)">
                <span class="text-[9px] text-gray-500 w-6 text-right">${unit}</span>
            </div>
        </div>`;

    const frameHTML = clip.src && clip.src.includes('frame_') ? `
    <div id="smart-frame-controls-group" class="mb-3 pb-3 mt-1 bg-pink-900/20 p-3 rounded-lg border-2 border-pink-700 border-dashed transition-colors"
        ondragover="event.preventDefault(); this.classList.add('bg-pink-900/60', 'border-pink-400');"
        ondragleave="this.classList.remove('bg-pink-900/60', 'border-pink-400');"
        ondrop="event.preventDefault(); this.classList.remove('bg-pink-900/60', 'border-pink-400'); const data = event.dataTransfer.getData('text/plain'); if(data) { try { const d = JSON.parse(data); if(d.type==='image' || d.type==='video') { const c = app.findClipById('${clipId}'); c.properties.innerMediaType = d.type; c.properties.innerMediaSrc = d.src; app.fitMediaToFrame('${clipId}', 'fill'); if(d.type==='video' && d.src){ const tv=document.createElement('video'); tv.preload='metadata'; tv.src=d.src; tv.onloadedmetadata=()=>{ if(isFinite(tv.duration)&&tv.duration>0){ app.stretchClipDuration('${clipId}', tv.duration); } }; } app.commitStateToReact(); app.requestRedraw(); app.updateEffectControls(); } } catch(e){} }">

        <h4 class="font-bold text-[13px] text-pink-400 mb-2 flex items-center justify-between">
            <span><i class="fa-solid fa-mobile-screen mr-1"></i> Frame Media</span>
        </h4>
        <div class="flex flex-col gap-2 mb-3">
            <button class="w-full bg-purple-800 hover:bg-purple-600 text-xs py-2 rounded-lg border border-gray-600 transition-colors flex items-center justify-center gap-2 font-bold shadow-lg"
                onclick="const f = document.createElement('input'); f.type='file'; f.accept='image/*,video/*'; f.onchange = (e) => app.handleFrameUpload(e, app.findClipById('${clipId}')); f.click();">
                <i class="fa-solid fa-upload text-sm"></i> Upload Media Here
            </button>
            <div class="text-[10px] text-center text-pink-300 opacity-70">Or Drop Image/Video from Library Here</div>
        </div>
        <div class="flex gap-2">
            <button class="flex-1 bg-gray-800 hover:bg-pink-600 text-[10px] py-1.5 rounded border border-gray-600 transition-colors"
                onclick="app.fitMediaToFrame('${clipId}', 'fill')">
                <i class="fa-solid fa-expand"></i> Stretch
            </button>
            <button class="flex-1 bg-gray-800 hover:bg-pink-600 text-[10px] py-1.5 rounded border border-gray-600 transition-colors"
                onclick="app.fitMediaToFrame('${clipId}', 'crop')">
                <i class="fa-solid fa-crop"></i> Crop
            </button>
            <button class="flex-1 bg-gray-800 hover:bg-pink-600 text-[10px] py-1.5 rounded border border-gray-600 transition-colors"
                onclick="app.fitMediaToFrame('${clipId}', 'fit')">
                <i class="fa-solid fa-compress"></i> Fit
            </button>
        </div>
        ${clip.properties.innerMediaSrc ? `
        <div class="h-[1px] bg-pink-700/50 w-full my-3"></div>
        <div class="flex items-center justify-between mb-2">
            <label class="text-[10px] text-pink-300 w-16">Pan X</label>
            <div class="flex items-center gap-2 flex-1">
                <input type="range" min="-1000" max="1000" value="${clip.properties.innerOffsetX || 0}" 
                    class="w-full h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer range-sm accent-pink-500"
                    oninput="app.updateUltraProp('${clipId}', 'properties', 'innerOffsetX', this.value)">
            </div>
        </div>
        <div class="flex items-center justify-between mb-1">
            <label class="text-[10px] text-pink-300 w-16">Pan Y</label>
            <div class="flex items-center gap-2 flex-1">
                <input type="range" min="-1000" max="1000" value="${clip.properties.innerOffsetY || 0}" 
                    class="w-full h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer range-sm accent-pink-500"
                    oninput="app.updateUltraProp('${clipId}', 'properties', 'innerOffsetY', this.value)">
            </div>
        </div>
        <div class="flex items-center justify-between mb-1">
            <label class="text-[10px] text-pink-300 w-16" title="Screen Corner Radius">Corners</label>
            <div class="flex items-center gap-2 flex-1">
                <input type="range" min="0" max="0.5" step="0.01" value="${clip.properties.innerBorderRadius !== undefined ? clip.properties.innerBorderRadius : (clip.src.includes('frame_real') ? 0.06 : 0.0)}" 
                    class="w-full h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer range-sm accent-pink-500"
                    oninput="app.updateUltraProp('${clipId}', 'properties', 'innerBorderRadius', this.value); app.requestRedraw();">
            </div>
        </div>
        <div class="flex items-center justify-between mb-1">
            <label class="text-[10px] text-pink-300 w-16" title="Scale Width">Size X</label>
            <div class="flex items-center gap-2 flex-1">
                <input type="range" min="80" max="120" step="0.5" value="${clip.properties.innerScaleX || 100}" 
                    class="w-full h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer range-sm accent-pink-500"
                    oninput="app.updateUltraProp('${clipId}', 'properties', 'innerScaleX', this.value); app.requestRedraw();">
            </div>
        </div>
        <div class="flex items-center justify-between mb-1">
            <label class="text-[10px] text-pink-300 w-16" title="Scale Height">Size Y</label>
            <div class="flex items-center gap-2 flex-1">
                <input type="range" min="80" max="120" step="0.5" value="${clip.properties.innerScaleY || 100}" 
                    class="w-full h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer range-sm accent-pink-500"
                    oninput="app.updateUltraProp('${clipId}', 'properties', 'innerScaleY', this.value); app.requestRedraw();">
            </div>
        </div>
        <div class="flex items-center justify-between mb-1 mt-2">
            <label class="text-[10px] text-pink-300 w-16" title="Smart Fit Mode">Fit Mode</label>
            <div class="flex items-center gap-2 flex-1">
                <select class="w-full bg-gray-800 text-[10px] text-white p-1 rounded border border-gray-600"
                    onchange="app.updateUltraProp('${clipId}', 'properties', 'innerFitMode', this.value); app.requestRedraw();">
                    <option value="standard" ${clip.properties.innerFitMode === 'standard' || !clip.properties.innerFitMode ? 'selected' : ''}>Standard Fit</option>
                    <option value="smart" ${clip.properties.innerFitMode === 'smart' ? 'selected' : ''}>Smart Curved Mask</option>
                    <option value="tight" ${clip.properties.innerFitMode === 'tight' ? 'selected' : ''}>Tight (No Bleed)</option>
                </select>
            </div>
        </div>
        <div class="flex items-center gap-2 mb-2 mt-2">
            <button class="flex-1 bg-gray-800 hover:bg-gray-700 text-[10px] py-1 rounded border border-gray-600 ${clip.properties.innerFlipX ? 'ring-1 ring-blue-500 bg-blue-900/30' : ''}"
                onclick="app.updateUltraProp('${clipId}', 'properties', 'innerFlipX', ${!clip.properties.innerFlipX}); app.fitMediaToFrame('${clipId}', '${clip.properties.innerMode || 'fill'}');">
                <i class="fa-solid fa-arrows-left-right"></i> Flip H
            </button>
            <button class="flex-1 bg-gray-800 hover:bg-gray-700 text-[10px] py-1 rounded border border-gray-600 ${clip.properties.innerFlipY ? 'ring-1 ring-blue-500 bg-blue-900/30' : ''}"
                onclick="app.updateUltraProp('${clipId}', 'properties', 'innerFlipY', ${!clip.properties.innerFlipY}); app.fitMediaToFrame('${clipId}', '${clip.properties.innerMode || 'fill'}');">
                <i class="fa-solid fa-arrows-up-down"></i> Flip V
            </button>
        </div>
        <div class="flex items-center justify-between mb-1">
            <label class="text-[10px] text-pink-300 w-16">Rotate</label>
            <div class="flex gap-1 flex-1">
                <button class="flex-1 ${clip.properties.innerRotation === 0 || !clip.properties.innerRotation ? 'bg-pink-600' : 'bg-gray-700 hover:bg-gray-600'} text-[10px] py-1 rounded transition-colors" onclick="app.updateUltraProp('${clipId}', 'properties', 'innerRotation', 0); app.fitMediaToFrame('${clipId}', '${clip.properties.innerMode || 'fill'}');">0°</button>
                <button class="flex-1 ${clip.properties.innerRotation === 90 ? 'bg-pink-600' : 'bg-gray-700 hover:bg-gray-600'} text-[10px] py-1 rounded transition-colors" onclick="app.updateUltraProp('${clipId}', 'properties', 'innerRotation', 90); app.fitMediaToFrame('${clipId}', '${clip.properties.innerMode || 'fill'}');">90°</button>
                <button class="flex-1 ${clip.properties.innerRotation === 180 ? 'bg-pink-600' : 'bg-gray-700 hover:bg-gray-600'} text-[10px] py-1 rounded transition-colors" onclick="app.updateUltraProp('${clipId}', 'properties', 'innerRotation', 180); app.fitMediaToFrame('${clipId}', '${clip.properties.innerMode || 'fill'}');">180°</button>
                <button class="flex-1 ${clip.properties.innerRotation === 270 ? 'bg-pink-600' : 'bg-gray-700 hover:bg-gray-600'} text-[10px] py-1 rounded transition-colors" onclick="app.updateUltraProp('${clipId}', 'properties', 'innerRotation', 270); app.fitMediaToFrame('${clipId}', '${clip.properties.innerMode || 'fill'}');">270°</button>
            </div>
        </div>
        
        <div class="h-[1px] bg-pink-900 w-full my-3"></div>
        <h4 class="font-bold text-[11px] text-pink-400 mb-2 flex items-center justify-between">
            <span><i class="fa-solid fa-heart mr-1"></i> Social Media Overlay</span>
        </h4>
        
        <div class="flex items-center justify-between mb-2">
            <select class="w-full bg-gray-800 text-[10px] text-white p-1 rounded border border-gray-600"
                onchange="app.updateUltraProp('${clipId}', 'properties', 'overlayUI', this.value)">
                <option value="none" ${clip.properties.overlayUI === 'none' || !clip.properties.overlayUI ? 'selected' : ''}>None</option>
                <option value="tiktok" ${clip.properties.overlayUI === 'tiktok' ? 'selected' : ''}>TikTok UI</option>
                <option value="instagram" ${clip.properties.overlayUI === 'instagram' ? 'selected' : ''}>Instagram Reels UI</option>
                <option value="youtube" ${clip.properties.overlayUI === 'youtube' ? 'selected' : ''}>YouTube UI</option>
            </select>
        </div>
        
        ${clip.properties.overlayUI && clip.properties.overlayUI !== 'none' ? `
            <div class="space-y-2 mt-2 bg-pink-900/20 p-2 rounded border border-pink-900/50">
                <div class="flex items-center justify-between">
                    <label class="text-[9px] text-pink-300 w-16">Likes</label>
                    <input type="text" value="${clip.properties.uiLikes || '1.2M'}" 
                        onchange="app.updateUltraProp('${clipId}', 'properties', 'uiLikes', this.value)"
                        class="flex-1 bg-gray-800 text-[10px] text-white px-2 py-1 rounded border border-gray-600">
                </div>
                <div class="flex items-center justify-between">
                    <label class="text-[9px] text-pink-300 w-16">Comments</label>
                    <input type="text" value="${clip.properties.uiComments || '45K'}" 
                        onchange="app.updateUltraProp('${clipId}', 'properties', 'uiComments', this.value)"
                        class="flex-1 bg-gray-800 text-[10px] text-white px-2 py-1 rounded border border-gray-600">
                </div>
                ${clip.properties.overlayUI === 'tiktok' || clip.properties.overlayUI === 'instagram' ? `
                <div class="flex items-center justify-between">
                    <label class="text-[9px] text-pink-300 w-16">Shares</label>
                    <input type="text" value="${clip.properties.uiShares || '12K'}" 
                        onchange="app.updateUltraProp('${clipId}', 'properties', 'uiShares', this.value)"
                        class="flex-1 bg-gray-800 text-[10px] text-white px-2 py-1 rounded border border-gray-600">
                </div>
                <div class="flex items-center justify-between">
                    <label class="text-[9px] text-pink-300 w-16">Username</label>
                    <input type="text" value="${clip.properties.uiUsername || '@username'}" 
                        onchange="app.updateUltraProp('${clipId}', 'properties', 'uiUsername', this.value)"
                        class="flex-1 bg-gray-800 text-[10px] text-white px-2 py-1 rounded border border-gray-600">
                </div>
                <div class="flex items-center justify-between">
                    <label class="text-[9px] text-pink-300 w-16">Desc.</label>
                    <input type="text" value="${clip.properties.uiDescription || 'Check out this awesome video! #viral'}" 
                        onchange="app.updateUltraProp('${clipId}', 'properties', 'uiDescription', this.value)"
                        class="flex-1 bg-gray-800 text-[10px] text-white px-2 py-1 rounded border border-gray-600">
                </div>
                ` : ''}
                ${clip.properties.overlayUI === 'youtube' ? `
                <div class="flex items-center justify-between">
                    <label class="text-[9px] text-pink-300 w-16">Channel</label>
                    <input type="text" value="${clip.properties.uiUsername || 'Channel Name'}" 
                        onchange="app.updateUltraProp('${clipId}', 'properties', 'uiUsername', this.value)"
                        class="flex-1 bg-gray-800 text-[10px] text-white px-2 py-1 rounded border border-gray-600">
                </div>
                <div class="flex items-center justify-between">
                    <label class="text-[9px] text-pink-300 w-16">Subs</label>
                    <input type="text" value="${clip.properties.uiDescription || '1.5M Subscribers'}" 
                        onchange="app.updateUltraProp('${clipId}', 'properties', 'uiDescription', this.value)"
                        class="flex-1 bg-gray-800 text-[10px] text-white px-2 py-1 rounded border border-gray-600">
                </div>
                ` : ''}
            </div>
        ` : ''}
        ` : ''}
    </div>` : '';

    const ultraHTML = `
    <div id="ultra-controls-group" class="mb-3 border-b border-gray-700 pb-2 mt-2 bg-gray-900/50 p-2 rounded border border-gray-700">
        <h4 class="font-bold text-xs text-cyan-400 mb-2 flex items-center justify-between">
            <span><i class="fa-solid fa-microchip mr-1"></i> GPU Pipeline</span>
            <span class="text-[9px] bg-cyan-900 text-cyan-300 px-1 rounded">ACTIVE</span>
        </h4>
        <h4 class="font-bold text-xs text-purple-400 mb-2 flex items-center justify-between">
            <span><i class="fa-solid fa-brain mr-1"></i> AI Removal</span>
            <input type="checkbox" ${clip.aiSegmentation.enabled ? 'checked' : ''} 
                onchange="app.toggleAI('${clipId}', this.checked)"
                class="accent-purple-500 cursor-pointer">
        </h4>
        <h4 class="font-bold text-xs text-green-400 mb-2 flex items-center justify-between">
            <span><i class="fa-solid fa-users-viewfinder mr-1"></i> Chroma Key</span>
            <input type="checkbox" ${clip.chromaKey.enabled ? 'checked' : ''} 
                onchange="app.updateUltraProp('${clipId}', 'chromaKey', 'enabled', this.checked)"
                class="accent-green-500 cursor-pointer">
        </h4>
        ${clip.chromaKey.enabled ? `
            <div class="flex items-center justify-between mb-2">
                <label class="text-[10px] text-gray-400 w-16">Key Color</label>
                <input type="color" value="${clip.chromaKey.color}" 
                    onchange="app.updateUltraProp('${clipId}', 'chromaKey', 'color', this.value)"
                    class="w-full h-6 bg-transparent border-0 cursor-pointer">
            </div>
            ${createRange('Threshold', 'chromaKey', 'threshold', 0, 150, '')}
        ` : ''}
        
        <div class="h-[1px] bg-gray-700 w-full my-3"></div>
        <h4 class="font-bold text-xs text-yellow-400 mb-2 flex items-center justify-between">
            <span><i class="fa-solid fa-gauge mr-1"></i> Speed & Transform</span>
        </h4>
        <div class="flex items-center justify-between mb-2">
            <label class="text-[10px] text-gray-400 w-16">Speed</label>
            <div class="flex items-center gap-2 flex-1">
                <input type="range" min="0.1" max="5" step="0.1" value="${clip.properties.playbackSpeed || 1}" 
                    class="w-full h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer range-sm"
                    oninput="app.updateUltraProp('${clipId}', 'properties', 'playbackSpeed', parseFloat(this.value))">
                <span class="text-[9px] text-gray-500 w-6 text-right">${clip.properties.playbackSpeed || 1}x</span>
            </div>
        </div>
        <div class="flex items-center gap-2 mb-2">
            <button class="flex-1 bg-gray-800 hover:bg-gray-700 text-[10px] py-1 rounded border border-gray-600 ${clip.properties.flipX ? 'ring-1 ring-blue-500 bg-blue-900/30' : ''}"
                onclick="app.updateUltraProp('${clipId}', 'properties', 'flipX', ${!clip.properties.flipX})">
                <i class="fa-solid fa-arrows-left-right"></i> Flip H
            </button>
            <button class="flex-1 bg-gray-800 hover:bg-gray-700 text-[10px] py-1 rounded border border-gray-600 ${clip.properties.flipY ? 'ring-1 ring-blue-500 bg-blue-900/30' : ''}"
                onclick="app.updateUltraProp('${clipId}', 'properties', 'flipY', ${!clip.properties.flipY})">
                <i class="fa-solid fa-arrows-up-down"></i> Flip V
            </button>
        </div>
    </div>`;
    if(frameHTML) panel.insertAdjacentHTML('afterbegin', frameHTML);
    panel.insertAdjacentHTML('beforeend', ultraHTML);
};

window.EditorApp.prototype.toggleAI = async function(clipId, enabled) {
    const clip = this.findClipById(clipId);
    if (!clip) return;
    clip.aiSegmentation.enabled = enabled;
    if (enabled) {
        if (!this.aiWorker) {
            const success = await this.initAIModel();
            if (!success) {
                clip.aiSegmentation.enabled = false;
                this.updateEffectControls();
                return;
            }
        }
    }
    this.requestRedraw();
};

window.EditorApp.prototype.updateUltraProp = function(clipId, objName, prop, value) {
    const clip = this.findClipById(clipId);
    if(!clip) return;
    
    if (objName === 'blendMode' || (prop === 'blendMode' && objName === null)) {
        clip.blendMode = value;
    } else if (objName === 'chromaKey' && prop === 'enabled') {
        clip.chromaKey.enabled = value;
    } else {
        clip[objName][prop] = (typeof value === 'boolean' || prop === 'type' || prop === 'color' || prop === 'overlayUI' || prop.startsWith('ui')) ? value : parseFloat(value);
    }
    
    if ((objName === 'mask' && prop === 'type') || (objName === 'chromaKey' && prop === 'enabled') || prop === 'flipX' || prop === 'flipY' || prop === 'overlayUI') {
        this.updateEffectControls();
    }
    this.commitStateToReact();
    this.requestRedraw();
};

window.EditorApp.prototype.renderFrameOverlayUI = function(ctx, renderJobs, w, h) {
    renderJobs.forEach(job => {
        const processClip = (clip, opacityMult) => {
            if (!clip || !clip.src.includes('frame_') || !clip.properties.overlayUI || clip.properties.overlayUI === 'none') return;
            
            const sourceEl = this.getSourceElement(clip);
            let srcW = sourceEl ? (sourceEl.naturalWidth || sourceEl.videoWidth || w) : w;
            let srcH = sourceEl ? (sourceEl.naturalHeight || sourceEl.videoHeight || h) : h;
            
            if (clip.src.includes('frame_laptop')) { srcW = 1600; srcH = 1200; }
            else if (clip.src.includes('frame_monitor')) { srcW = 1920; srcH = 1400; }
            else if (clip.src.includes('frame_tv')) { srcW = 2000; srcH = 1200; }
            else if (clip.src.includes('frame_tablet')) { srcW = 1200; srcH = 1600; }
            else if (clip.src.includes('frame_phone')) { srcW = 800; srcH = 1600; }
            
            const coverRatio = Math.max(w / srcW, h / srcH);
            const userScale = (clip.properties.scale || 100) / 100;
            const outerW = srcW * coverRatio * userScale * ((clip.properties.scaleX !== undefined ? clip.properties.scaleX : 100) / 100);
            const outerH = srcH * coverRatio * userScale * ((clip.properties.scaleY !== undefined ? clip.properties.scaleY : 100) / 100);
            
            let wRatio = 1, hRatio = 1;
            if (clip.src.includes('frame_phone')) { wRatio = 650/800; hRatio = 1450/1600; }
            else if (clip.src.includes('frame_real_ipad')) { wRatio = 765/840; hRatio = 559/634; }
            else if (clip.src.includes('frame_real_iphone')) { wRatio = 321/365; hRatio = 689/730; }
            else if (clip.src.includes('frame_real_laptop')) { wRatio = 731/942; hRatio = 454/766; }
            else if (clip.src.includes('frame_real_monitor')) { wRatio = 799/840; hRatio = 458/680; }
            else if (clip.src.includes('frame_real_samsung')) { wRatio = 375/427; hRatio = 812/868; }
            else if (clip.src.includes('frame_real_ui_instagram')) { wRatio = 395/462; hRatio = 850/913; }
            else if (clip.src.includes('frame_real_ui_tiktok')) { wRatio = 350/427; hRatio = 750/818; }
            else if (clip.src.includes('frame_real_ui_youtube')) { wRatio = 787/842; hRatio = 381/430; }
            else if (clip.src.includes('frame_laptop')) { wRatio = 1240/1600; hRatio = 780/1200; }
            else if (clip.src.includes('frame_monitor')) { wRatio = 1640/1920; hRatio = 880/1400; }
            else if (clip.src.includes('frame_tv')) { wRatio = 1860/2000; hRatio = 960/1200; }
            else if (clip.src.includes('frame_tablet')) { wRatio = 840/1200; hRatio = 1240/1600; }
            
            let innerScaleX = clip.properties.innerScaleX !== undefined ? parseFloat(clip.properties.innerScaleX) : 100;
            let innerScaleY = clip.properties.innerScaleY !== undefined ? parseFloat(clip.properties.innerScaleY) : 100;
            
            if (clip.properties.innerFitMode === 'tight') {
                innerScaleX *= 0.95;
                innerScaleY *= 0.95;
            }

            const holeW = outerW * wRatio * (innerScaleX / 100);
            const holeH = outerH * hRatio * (innerScaleY / 100);
            
            let dxFrac = 0; let dyFrac = 0;
            if (clip.src.includes('frame_real_ipad')) { dxFrac = -0.5 / 840; dyFrac = -0.5 / 634; }
            else if (clip.src.includes('frame_real_iphone')) { dxFrac = 0.0 / 365; dyFrac = -0.5 / 730; }
            else if (clip.src.includes('frame_real_laptop')) { dxFrac = -0.5 / 942; dyFrac = -114.0 / 766; }
            else if (clip.src.includes('frame_real_monitor')) { dxFrac = -0.5 / 840; dyFrac = -88.0 / 680; }
            else if (clip.src.includes('frame_real_samsung')) { dxFrac = -3.0 / 427; dyFrac = -3.0 / 868; }
            else if (clip.src.includes('frame_real_ui_instagram')) { dxFrac = -0.5 / 462; dyFrac = -1.5 / 913; }
            else if (clip.src.includes('frame_real_ui_tiktok')) { dxFrac = -5.5 / 427; dyFrac = -4.0 / 818; }
            else if (clip.src.includes('frame_real_ui_youtube')) { dxFrac = -6.5 / 842; dyFrac = 1.5 / 430; }
            
            const shiftX = dxFrac * outerW;
            const shiftY = dyFrac * outerH;
            
            const cx = (w / 2) + (clip.properties.positionX || 0);
            const cy = (h / 2) + (clip.properties.positionY || 0);
            const rotation = (clip.properties.rotation || 0) * (Math.PI / 180);
            
            const opacity = ((clip.properties.opacity !== undefined ? clip.properties.opacity : 100) / 100) * opacityMult;
            
            ctx.save();
            ctx.globalAlpha = opacity;
            ctx.translate(cx, cy);
            ctx.rotate(rotation);
            ctx.translate(shiftX, shiftY);
            
            const left = -holeW / 2;
            const right = holeW / 2;
            const top = -holeH / 2;
            const bottom = holeH / 2;
            
            ctx.beginPath();
            let br = clip.properties.innerBorderRadius !== undefined ? parseFloat(clip.properties.innerBorderRadius) : (clip.src.includes('frame_real') ? 0.06 : 0.0);
            if (clip.properties.innerFitMode === 'smart') {
                br = 0.15;
            }
            const r = br * Math.min(holeW, holeH);
            if (ctx.roundRect && r > 0) {
                ctx.roundRect(left, top, holeW, holeH, r);
            } else {
                ctx.rect(left, top, holeW, holeH);
            }
            ctx.clip();
            
            const uiType = clip.properties.overlayUI;
            const scaleBase = Math.min(holeW, holeH) / 400; 
            
            const drawText = (text, x, y, size, align, isBold) => {
                ctx.font = `${isBold ? 'bold' : 'normal'} ${size}px "Segoe UI", sans-serif`;
                ctx.textAlign = align;
                ctx.textBaseline = 'middle';
                ctx.fillStyle = 'white';
                ctx.shadowColor = 'rgba(0,0,0,0.8)';
                ctx.shadowBlur = 8;
                ctx.shadowOffsetX = 1;
                ctx.shadowOffsetY = 1;
                ctx.fillText(text, x, y);
                ctx.shadowColor = 'transparent';
            };
            
            const drawIcon = (unicode, x, y, size, isBrand) => {
                ctx.font = `900 ${size}px "Font Awesome 6 Free"`; 
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillStyle = 'white';
                ctx.shadowColor = 'rgba(0,0,0,0.8)';
                ctx.shadowBlur = 10;
                ctx.shadowOffsetX = 1;
                ctx.shadowOffsetY = 1;
                ctx.fillText(unicode, x, y);
                ctx.shadowColor = 'transparent';
            };
            
            if (uiType === 'tiktok') {
                const iconSize = 35 * scaleBase;
                const textSize = 14 * scaleBase;
                const iconX = right - (30 * scaleBase);
                
                drawIcon('\uf2bd', iconX, bottom - (260 * scaleBase), iconSize + 5, false); // User
                drawIcon('\uf004', iconX, bottom - (190 * scaleBase), iconSize, false); // Heart
                drawText(clip.properties.uiLikes || '1.2M', iconX, bottom - (160 * scaleBase), textSize, 'center', true);
                drawIcon('\uf075', iconX, bottom - (120 * scaleBase), iconSize - 5, false); // Comment
                drawText(clip.properties.uiComments || '45K', iconX, bottom - (90 * scaleBase), textSize, 'center', true);
                drawIcon('\uf02e', iconX, bottom - (50 * scaleBase), iconSize - 5, false); // Bookmark
                drawText(clip.properties.uiShares || '12K', iconX, bottom - (20 * scaleBase), textSize, 'center', true);
                drawIcon('\uf1d8', iconX, bottom + (20 * scaleBase), iconSize - 5, false); // Share 
                
                const descX = left + (20 * scaleBase);
                drawText(clip.properties.uiUsername || '@username', descX, bottom - (50 * scaleBase), textSize + 2, 'left', true);
                drawText(clip.properties.uiDescription || 'Check out this awesome video! #viral', descX, bottom - (25 * scaleBase), textSize, 'left', false);
            }
            else if (uiType === 'instagram') {
                const iconSize = 30 * scaleBase;
                const textSize = 14 * scaleBase;
                const iconX = right - (30 * scaleBase);
                
                drawIcon('\uf004', iconX, bottom - (170 * scaleBase), iconSize, false);
                drawText(clip.properties.uiLikes || '1.2M', iconX, bottom - (145 * scaleBase), textSize, 'center', true);
                drawIcon('\uf075', iconX, bottom - (110 * scaleBase), iconSize, false);
                drawText(clip.properties.uiComments || '45K', iconX, bottom - (85 * scaleBase), textSize, 'center', true);
                drawIcon('\uf1d8', iconX, bottom - (50 * scaleBase), iconSize, false);
                drawText(clip.properties.uiShares || '12K', iconX, bottom - (25 * scaleBase), textSize, 'center', true);
                drawIcon('\uf141', iconX, bottom + (10 * scaleBase), iconSize * 0.7, false);
                
                const descX = left + (20 * scaleBase);
                drawIcon('\uf2bd', descX + 15*scaleBase, bottom - (50 * scaleBase), 30*scaleBase, false); 
                drawText(clip.properties.uiUsername || '@username', descX + 40*scaleBase, bottom - (50 * scaleBase), textSize + 2, 'left', true);
                drawText(clip.properties.uiDescription || 'Check out this awesome video! #viral', descX, bottom - (20 * scaleBase), textSize, 'left', false);
            }
            else if (uiType === 'youtube') {
                const iconSize = 25 * scaleBase;
                const textSize = 14 * scaleBase;
                const rightX = right - (20 * scaleBase);
                const leftX = left + (20 * scaleBase);
                
                ctx.fillStyle = 'rgba(255,255,255,0.3)';
                ctx.fillRect(left, bottom - (10 * scaleBase), holeW, 4 * scaleBase);
                ctx.fillStyle = '#cc0000';
                ctx.fillRect(left, bottom - (10 * scaleBase), holeW * 0.3, 4 * scaleBase);
                
                drawIcon('\uf04b', leftX + 10*scaleBase, bottom - (30 * scaleBase), iconSize*0.8, false); 
                
                drawIcon('\uf004', rightX - 140*scaleBase, bottom - (30 * scaleBase), iconSize, false);
                drawText(clip.properties.uiLikes || '1.2M', rightX - 110*scaleBase, bottom - (30 * scaleBase), textSize, 'left', true);
                drawIcon('\uf075', rightX - 60*scaleBase, bottom - (30 * scaleBase), iconSize, false);
                
                ctx.fillStyle = '#cc0000';
                ctx.beginPath();
                if(ctx.roundRect) {
                    ctx.roundRect(rightX - 250*scaleBase, bottom - (45*scaleBase), 90*scaleBase, 30*scaleBase, 15*scaleBase);
                } else {
                    ctx.rect(rightX - 250*scaleBase, bottom - (45*scaleBase), 90*scaleBase, 30*scaleBase);
                }
                ctx.fill();
                drawText('SUBSCRIBE', rightX - 205*scaleBase, bottom - (30*scaleBase), textSize*0.8, 'center', true);
                
                drawText(clip.properties.uiUsername || 'Channel Name', leftX, bottom - (70 * scaleBase), textSize + 2, 'left', true);
                drawText(clip.properties.uiDescription || '1.5M Subscribers', leftX, bottom - (50 * scaleBase), textSize, 'left', false);
            }
            
            ctx.restore();
        };

        if (job.type === 'single') {
            processClip(job.clip, 1.0);
        } else if (job.type === 'transition') {
            processClip(job.clipA, 1.0 - job.progress);
            processClip(job.clipB, job.progress);
        }
    });
};

window.EditorApp.prototype.fitMediaToFrame = function(frameClipId, mode) {
    const frameClip = this.findClipById(frameClipId);
    if (!frameClip) return;
    
    // CLEANUP BAD STATE
    if (frameClip.properties.uvScaleX !== undefined) delete frameClip.properties.uvScaleX;
    if (frameClip.properties.uvScaleY !== undefined) delete frameClip.properties.uvScaleY;
    
    const sourceEl = this.getSourceElement(frameClip);
    const canvasW = this.canvas ? this.canvas.width : 1920;
    const canvasH = this.canvas ? this.canvas.height : 1080;
    
    let srcW = sourceEl ? (sourceEl.naturalWidth || canvasW) : 800;
    let srcH = sourceEl ? (sourceEl.naturalHeight || canvasH) : 1600;
    
    if (frameClip.src.includes('frame_laptop')) { srcW = 1600; srcH = 1200; }
    else if (frameClip.src.includes('frame_monitor')) { srcW = 1920; srcH = 1400; }
    else if (frameClip.src.includes('frame_tv')) { srcW = 2000; srcH = 1200; }
    else if (frameClip.src.includes('frame_tablet')) { srcW = 1200; srcH = 1600; }
    else if (frameClip.src.includes('frame_phone')) { srcW = 800; srcH = 1600; }

    const coverRatio = Math.max(canvasW / srcW, canvasH / srcH);
    const frameBaseW = srcW * coverRatio;
    const frameBaseH = srcH * coverRatio;
    
    let wRatio = 1, hRatio = 1;
    if (frameClip.src.includes('frame_phone')) { wRatio = 650/800; hRatio = 1450/1600; }
    else if (frameClip.src.includes('frame_real_ipad')) { wRatio = 766/840; hRatio = 560/634; }
    else if (frameClip.src.includes('frame_real_iphone')) { wRatio = 322/365; hRatio = 690/730; }
    else if (frameClip.src.includes('frame_real_laptop')) { wRatio = 732/942; hRatio = 455/766; }
    else if (frameClip.src.includes('frame_real_monitor')) { wRatio = 800/840; hRatio = 459/680; }
    else if (frameClip.src.includes('frame_real_samsung')) { wRatio = 376/427; hRatio = 813/868; }
    else if (frameClip.src.includes('frame_real_ui_instagram')) { wRatio = 396/462; hRatio = 851/913; }
    else if (frameClip.src.includes('frame_real_ui_tiktok')) { wRatio = 351/427; hRatio = 751/818; }
    else if (frameClip.src.includes('frame_real_ui_youtube')) { wRatio = 788/842; hRatio = 382/430; }
    else if (frameClip.src.includes('frame_laptop')) { wRatio = 1240/1600; hRatio = 780/1200; }
    else if (frameClip.src.includes('frame_monitor')) { wRatio = 1640/1920; hRatio = 880/1400; }
    else if (frameClip.src.includes('frame_tv')) { wRatio = 1860/2000; hRatio = 960/1200; }
    else if (frameClip.src.includes('frame_tablet')) { wRatio = 840/1200; hRatio = 1240/1600; }
    
    const holeW = frameBaseW * wRatio;
    const holeH = frameBaseH * hRatio;
    
    frameClip.properties.innerScaleX = 100;
    frameClip.properties.innerScaleY = 100;
    frameClip.properties.innerOffsetX = 0;
    frameClip.properties.innerOffsetY = 0;
    
    // Geometry is ALWAYS the exact size of the hole now
    frameClip.properties.innerForcedWidth = holeW;
    frameClip.properties.innerForcedHeight = holeH;
    
    if (mode === 'fill') {
        frameClip.properties.innerUvScaleX = 1.0;
        frameClip.properties.innerUvScaleY = 1.0;
        frameClip.properties.innerMode = 'fill';
    } else if (mode === 'crop' || mode === 'fit') {
        frameClip.properties.innerMode = mode;
        const innerMockClip = { id: frameClip.id + '_inner', type: frameClip.properties.innerMediaType, src: frameClip.properties.innerMediaSrc };
        const innerSourceEl = this.getSourceElement(innerMockClip);
        let mediaW = innerSourceEl ? (innerSourceEl.videoWidth || innerSourceEl.naturalWidth || canvasW) : canvasW;
        let mediaH = innerSourceEl ? (innerSourceEl.videoHeight || innerSourceEl.naturalHeight || canvasH) : canvasH;
        
        if (mediaW === 0 || mediaH === 0) { mediaW = 1920; mediaH = 1080; }
        
        const rot = frameClip.properties.innerRotation || 0;
        let origMediaW = mediaW;
        let origMediaH = mediaH;
        let effMediaW = mediaW;
        let effMediaH = mediaH;
        if (rot === 90 || rot === 270) {
            effMediaW = mediaH;
            effMediaH = mediaW;
        }
        
        let mediaFitRatio = 1;
        if (mode === 'crop') mediaFitRatio = Math.max(holeW / effMediaW, holeH / effMediaH);
        else mediaFitRatio = Math.min(holeW / effMediaW, holeH / effMediaH); // For fit mode
        
        if (rot === 90 || rot === 270) {
            frameClip.properties.innerUvScaleX = (holeH / mediaFitRatio) / origMediaW;
            frameClip.properties.innerUvScaleY = (holeW / mediaFitRatio) / origMediaH;
        } else {
            frameClip.properties.innerUvScaleX = (holeW / mediaFitRatio) / origMediaW;
            frameClip.properties.innerUvScaleY = (holeH / mediaFitRatio) / origMediaH;
        }
    }
    
    this.commitStateToReact();
    this.requestRedraw();
};
