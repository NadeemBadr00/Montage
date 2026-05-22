// @ts-nocheck
/**
 * 🌟 Project 43 Ultra Features Module
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
        this.aiWorker = new Worker('workers/ai_worker.js');

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
    out vec2 v_texCoord;
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
        v_texCoord = a_texCoord;
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
    in vec2 v_texCoord;
    out vec4 outColor;
    void main() {
        vec4 color = texture(u_image, v_texCoord);
        if (u_useMask == 1) {
            vec4 maskColor = texture(u_mask, v_texCoord);
            float alpha = maskColor.r; 
            color = vec4(color.rgb, color.a * alpha);
        }
        if (u_useChroma == 1) {
            float dist = distance(color.rgb, u_chromaColor);
            if (dist < u_chromaThreshold) color.a = 0.0;
        }
        color.a *= u_opacity;
        color.rgb *= color.a; 
        outColor = color;
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
            resolution: gl.getUniformLocation(this.program, "u_resolution"),
            translation: gl.getUniformLocation(this.program, "u_translation"),
            scale: gl.getUniformLocation(this.program, "u_scale"),
            rotation: gl.getUniformLocation(this.program, "u_rotation"),
            image: gl.getUniformLocation(this.program, "u_image"),
            mask: gl.getUniformLocation(this.program, "u_mask"),
            useMask: gl.getUniformLocation(this.program, "u_useMask"),
            useChroma: gl.getUniformLocation(this.program, "u_useChroma"),
            chromaColor: gl.getUniformLocation(this.program, "u_chromaColor"),
            chromaThreshold: gl.getUniformLocation(this.program, "u_chromaThreshold"),
            opacity: gl.getUniformLocation(this.program, "u_opacity"),
        },
        buffers: { position: positionBuffer, texCoord: texCoordBuffer }
    };

    this.videoTexture = gl.createTexture();
    this.maskTexture = gl.createTexture();
    this.setupTexture(this.videoTexture);
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

window.EditorApp.prototype.renderWebGLComposition = function(visibleClips, w, h) {
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

    for (const clip of visibleClips) {
        if (clip.type !== 'video' && clip.type !== 'image') continue;

        const sourceEl = this.getSourceElement(clip);
        if (!sourceEl) continue;

        if (clip.aiSegmentation?.enabled) {
            // OPTIMIZATION: Throttling Logic
            const rawFrame = Math.floor(this.currentTime * 30);
            const bucketFrame = Math.floor(rawFrame / (this.AI_THROTTLE_RATE || 3)) * (this.AI_THROTTLE_RATE || 3);
            
            const cachedMask = this.maskCache.get(bucketFrame);
            
            if (cachedMask) {
                clip.aiMask = cachedMask;
            } 
            else if (!this.isWorkerBusy) {
                this.currentProcessingClipId = clip.id;
                this.isWorkerBusy = true; 
                
                this.aiDownscaleCtx.drawImage(sourceEl, 0, 0, 360, 202);
                const bitmap = this.aiDownscaleCanvas.transferToImageBitmap();
                
                this.aiWorker.postMessage({ 
                    type: 'PROCESS_FRAME', 
                    image: bitmap, 
                    timestamp: this.currentTime, 
                    isPrediction: false,
                    id: clip.id 
                }, [bitmap]);
            }
        }

        this.drawLayerInWebGL(gl, clip, sourceEl, w, h);
    }

    return this.glCanvas;
};

window.EditorApp.prototype.drawLayerInWebGL = function(gl, clip, sourceEl, canvasW, canvasH) {
    gl.activeTexture(gl.TEXTURE0);

    // 🔥 OPTIMIZED TEXTURE BINDING
    if (clip.type === 'image') {
        // For Images: Use Cached Texture (Uploaded once, rescaled)
        const cachedTex = this.getOrUpdateImageTexture(gl, clip, sourceEl);
        gl.bindTexture(gl.TEXTURE_2D, cachedTex);
    } else {
        // For Videos: Must update every frame
        gl.bindTexture(gl.TEXTURE_2D, this.videoTexture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, sourceEl);
    }

    gl.uniform1i(this.glInfo.uniforms.image, 0);

    const useMask = (clip.aiSegmentation?.enabled && clip.aiMask);
    if (useMask) {
        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D, this.maskTexture);
        try {
            if (clip.aiMask && clip.aiMask.width > 0) {
                gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, clip.aiMask);
                gl.uniform1i(this.glInfo.uniforms.mask, 1);
                gl.uniform1i(this.glInfo.uniforms.useMask, 1);
            } else {
                gl.uniform1i(this.glInfo.uniforms.useMask, 0);
            }
        } catch (e) {
            gl.uniform1i(this.glInfo.uniforms.useMask, 0);
        }
    } else {
        gl.uniform1i(this.glInfo.uniforms.useMask, 0);
    }

    if (clip.chromaKey?.enabled) {
        gl.uniform1i(this.glInfo.uniforms.useChroma, 1);
        const hex = clip.chromaKey.color;
        const r = parseInt(hex.slice(1, 3), 16) / 255;
        const g = parseInt(hex.slice(3, 5), 16) / 255;
        const b = parseInt(hex.slice(5, 7), 16) / 255;
        gl.uniform3f(this.glInfo.uniforms.chromaColor, r, g, b);
        gl.uniform1f(this.glInfo.uniforms.chromaThreshold, clip.chromaKey.threshold / 255);
    } else {
        gl.uniform1i(this.glInfo.uniforms.useChroma, 0);
    }

    // ✨✨✨ UPDATED TRANSFORM LOGIC ✨✨✨
    let rawScale = clip.properties.scale || 100;
    let rawScaleX = clip.properties.scaleX !== undefined ? clip.properties.scaleX : 100;
    let rawScaleY = clip.properties.scaleY !== undefined ? clip.properties.scaleY : 100;
    let rawX = clip.properties.positionX || 0;
    let rawY = clip.properties.positionY || 0;

    if (useMask && clip.sandwich) {
        rawScale = clip.sandwich.scale !== undefined ? clip.sandwich.scale : 50;
        rawX = clip.sandwich.offsetX || 0;
        rawY = clip.sandwich.offsetY || 0;
    }

    // 🔥 ASPECT FILL (COVER MODE)
    let srcW = sourceEl.naturalWidth || sourceEl.videoWidth || canvasW;
    let srcH = sourceEl.naturalHeight || sourceEl.videoHeight || canvasH;

    const scaleX = canvasW / srcW;
    const scaleY = canvasH / srcH;
    const coverRatio = Math.max(scaleX, scaleY);

    let width = srcW * coverRatio;
    let height = srcH * coverRatio;

    // ✨✨✨ Final Size Calculation ✨✨✨
    // Supports:
    // 1. Forced Size (sz command)
    // 2. Non-Uniform Scaling (sx/sy commands)
    let finalWidth, finalHeight;

    if (clip.properties.forcedWidth && clip.properties.forcedHeight) {
        finalWidth = clip.properties.forcedWidth;
        finalHeight = clip.properties.forcedHeight;
    } else {
        // Apply Master Scale * Individual Scale
        const userScale = rawScale / 100;
        const sX = rawScaleX / 100;
        const sY = rawScaleY / 100;
        
        finalWidth = width * userScale * sX;
        finalHeight = height * userScale * sY;
    }

    const rotation = (clip.properties.rotation || 0) * (Math.PI / 180);
    const x = (canvasW / 2) + rawX;
    const y = (canvasH / 2) + rawY;

    gl.uniform2f(this.glInfo.uniforms.translation, x, y);
    gl.uniform2f(this.glInfo.uniforms.scale, finalWidth, finalHeight);
    gl.uniform1f(this.glInfo.uniforms.rotation, rotation);
    gl.uniform1f(this.glInfo.uniforms.opacity, (clip.properties.opacity || 100) / 100);

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
    if (!panel || this.selectedClipIds.size !== 1) return;
    const clipId = Array.from(this.selectedClipIds)[0];
    const clip = this.findClipById(clipId);
    if (!clip || clip.type === 'audio') return; 

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
    </div>`;
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
        clip[objName][prop] = (prop === 'type' || prop === 'color') ? value : parseFloat(value);
    }
    
    if ((objName === 'mask' && prop === 'type') || (objName === 'chromaKey' && prop === 'enabled')) {
        this.updateEffectControls();
    }
    this.requestRedraw();
};