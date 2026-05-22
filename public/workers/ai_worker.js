/**
 * 🧠 AI Worker (ai_worker.js)
 * Handles AI processing in a background thread.
 * 🔥 FIX v2: Intercept Object.defineProperty to block Emscripten abort-getter on Module.arguments
 */

const VERSION = '0.1.1675465747';
const BASE_URL = `https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation@${VERSION}`;

// ── 1. DOM SIMULATION ─────────────────────────────────────────────────────────
if (typeof window === 'undefined') self.window = self;

if (typeof document === 'undefined') {
    self.document = {
        head: { appendChild: () => {} },
        body: { appendChild: () => {} },
        addEventListener: (event, cb) => {
            if (event === 'DOMContentLoaded' || event === 'load') setTimeout(cb, 0);
        },
        removeEventListener: () => {},
        createElement: (tag) => {
            if (tag === 'canvas') {
                return typeof OffscreenCanvas !== 'undefined'
                    ? new OffscreenCanvas(256, 256)
                    : { getContext: () => null, width: 256, height: 256 };
            }
            if (tag === 'script') return createSmartScript();
            return { style: {}, setAttribute: () => {}, getAttribute: () => null, appendChild: () => {}, addEventListener: () => {}, removeEventListener: () => {} };
        }
    };
    self.screen = { width: 1920, height: 1080 };
}

function createSmartScript() {
    const script = {
        _src: '', _listeners: {}, style: {}, async: false, defer: false,
        setAttribute(key, value) { if (key === 'src') this.src = value; },
        getAttribute(key) { return this[key] || null; },
        appendChild: () => {},
        addEventListener(event, cb) {
            if (!this._listeners[event]) this._listeners[event] = [];
            this._listeners[event].push(cb);
        },
        removeEventListener: () => {}
    };
    Object.defineProperty(script, 'src', {
        get() { return this._src; },
        set(url) {
            this._src = url;
            if (url && typeof url === 'string' && !url.includes('.tflite') && !url.includes('.binarypb')) {
                try {
                    importScripts(url);
                    setTimeout(() => {
                        if (this.onload) this.onload();
                        (this._listeners['load'] || []).forEach(cb => cb());
                    }, 0);
                } catch (e) { console.warn("Worker: Fake script load failed for", url, e); }
            } else {
                setTimeout(() => {
                    if (this.onload) this.onload();
                    (this._listeners['load'] || []).forEach(cb => cb());
                }, 0);
            }
        }
    });
    return script;
}

// ── 2. CRITICAL FIX: Block Emscripten from replacing Module.arguments ─────────
//
// Emscripten does:
//   Object.defineProperty(Module, 'arguments', { configurable:false, get: abort })
// after startup. If anything accesses Module.arguments after that, it aborts.
// We intercept that specific defineProperty call and skip it.
//
const _origDefProp = Object.defineProperty.bind(Object);
Object.defineProperty = function(obj, prop, descriptor) {
    if (
        obj === self.Module &&
        prop === 'arguments' &&
        descriptor &&
        typeof descriptor.get === 'function' &&
        descriptor.configurable === false
    ) {
        // Silently skip – keep our safe getter instead
        return obj;
    }
    return _origDefProp(obj, prop, descriptor);
};

// ── 3. MODULE DEFINITION ──────────────────────────────────────────────────────
self.Module = {
    locateFile: (file) => `${BASE_URL}/${file}`,
    canvas: typeof OffscreenCanvas !== 'undefined' ? new OffscreenCanvas(256, 256) : null,
    // Safe getter/setter so Emscripten can read/write without crashing
    get arguments() { return []; },
    set arguments(_) { /* intentionally ignored */ },
};

// ── 4. IMPORT SHIM ────────────────────────────────────────────────────────────
const _origImport = self.importScripts;
self.importScripts = function(...urls) {
    const valid = urls.filter(u => !u.includes('.tflite') && !u.includes('.binarypb'));
    if (valid.length) _origImport(...valid);
};

// ── 5. LOAD LIBRARY ───────────────────────────────────────────────────────────
let _libraryLoaded = false;
try {
    _origImport(`${BASE_URL}/selfie_segmentation.js`);
    _libraryLoaded = true;
} catch (e) {
    console.warn("Worker: MediaPipe library failed to load:", e);
}

// ── 6. SEGMENTATION STATE ─────────────────────────────────────────────────────
let segmentationModel = null;
let currentContext    = null;

async function initModel() {
    if (!_libraryLoaded || typeof SelfieSegmentation === 'undefined') {
        throw new Error("SelfieSegmentation library failed to load in Worker.");
    }

    segmentationModel = new SelfieSegmentation({
        locateFile: (file) => `${BASE_URL}/${file}`
    });

    segmentationModel.setOptions({ modelSelection: 1, selfieMode: false });

    segmentationModel.onResults((results) => {
        if (results.segmentationMask && currentContext) {
            createImageBitmap(results.segmentationMask).then(bitmap => {
                postMessage({
                    type: 'MASK_READY',
                    mask: bitmap,
                    timestamp: currentContext.timestamp,
                    id: currentContext.id,
                    isPrediction: currentContext.isPrediction
                }, [bitmap]);
                currentContext = null;
            });
        }
    });

    await segmentationModel.initialize();
    postMessage({ type: 'MODEL_LOADED' });
}

// ── 7. MESSAGE HANDLER ────────────────────────────────────────────────────────
onmessage = async function(e) {
    const { type, image, timestamp, id, isPrediction } = e.data;

    if (type === 'INIT') {
        try {
            await initModel();
        } catch (err) {
            console.warn("Worker: AI model unavailable (segmentation disabled):", err.message);
            postMessage({ type: 'MODEL_FAILED', reason: err.message });
        }
    }
    else if (type === 'PROCESS_FRAME') {
        if (segmentationModel && image) {
            currentContext = { timestamp, id, isPrediction };
            try {
                await segmentationModel.send({ image });
                image.close();
            } catch (err) {
                if (image) image.close();
                currentContext = null;
            }
        } else {
            if (image) image.close();
        }
    }
};