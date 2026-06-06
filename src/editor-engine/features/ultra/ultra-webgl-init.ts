// @ts-nocheck
// ultra-webgl-init.ts — WebGL context init, GLSL shaders, texture setup and caching

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
    
    // ✅ P2: Color Grading Uniforms (replaces N× CSS filter WebGL passes)
    uniform float u_cgBrightness;   // 1.0 = normal
    uniform float u_cgContrast;     // 1.0 = normal
    uniform float u_cgSaturation;   // 1.0 = normal
    uniform float u_cgHue;          // 0.0 = no change (0..1 range)
    
    in vec2 v_texCoord;
    in vec2 v_quadPos;
    out vec4 outColor;
    
    // ✅ P2: HSV helper functions for hue/saturation in GLSL
    vec3 rgb2hsv(vec3 c) {
        vec4 K = vec4(0.0, -1.0/3.0, 2.0/3.0, -1.0);
        vec4 p = mix(vec4(c.bg, K.wz), vec4(c.gb, K.xy), step(c.b, c.g));
        vec4 q = mix(vec4(p.xyw, c.r), vec4(c.r, p.yzx), step(p.x, c.r));
        float d = q.x - min(q.w, q.y);
        float e = 1.0e-10;
        return vec3(abs(q.z + (q.w - q.y) / (6.0 * d + e)), d / (q.x + e), q.x);
    }
    vec3 hsv2rgb(vec3 c) {
        vec4 K = vec4(1.0, 2.0/3.0, 1.0/3.0, 3.0);
        vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
        return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
    }
    
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
        
        // ✅ P2: Apply color grading in GPU (eliminates N× WebGL passes + CSS filter GPU readbacks)
        if (u_cgBrightness != 1.0 || u_cgContrast != 1.0 || u_cgSaturation != 1.0 || u_cgHue != 0.0) {
            // Brightness
            color.rgb *= u_cgBrightness;
            // Contrast: pivot around mid-gray
            color.rgb = (color.rgb - 0.5) * u_cgContrast + 0.5;
            // Saturation + Hue via HSV
            if (u_cgSaturation != 1.0 || u_cgHue != 0.0) {
                vec3 hsv = rgb2hsv(color.rgb);
                hsv.x = fract(hsv.x + u_cgHue);
                hsv.y = clamp(hsv.y * u_cgSaturation, 0.0, 1.0);
                color.rgb = hsv2rgb(hsv);
            }
            color.rgb = clamp(color.rgb, 0.0, 1.0);
        }
        
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
            // ✅ P2: Color grading uniforms
            cgBrightness:     gl.getUniformLocation(this.program, "u_cgBrightness"),
            cgContrast:       gl.getUniformLocation(this.program, "u_cgContrast"),
            cgSaturation:     gl.getUniformLocation(this.program, "u_cgSaturation"),
            cgHue:            gl.getUniformLocation(this.program, "u_cgHue"),
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
    // ✅ P2: Dirty-flag keys for video textures — avoids re-uploading same frame
    this._lastVideoKey  = '';
    this._lastVideoBKey = '';
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
    if (!sourceEl || sourceEl.naturalWidth === 0 || sourceEl.naturalHeight === 0) {
        return this.videoTexture; // Return fallback texture if not loaded
    }
    
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

