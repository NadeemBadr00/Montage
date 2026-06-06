// @ts-nocheck
// sandwich_clip_core.ts — Clip property init, Smart Sandwich mode, keyframe animation engine

const originalClip = window.Clip; 

function forceHex(value) {
    if (!value || value === 'transparent') return '#000000';
    if (value.startsWith('#')) return value;
    return '#000000'; 
}

export const injectSandwichCore = () => {

// 🔥 NEW: Check if Sandwich Mode should be active based on timeline context
window.EditorApp.prototype.isSandwichContextActive = function(clip) {
    if (!this.tracks || !clip) return false;
    
    // 1. Get current track index
    const currentTrack = this.tracks.find(t => t.id === clip.trackId);
    if (!currentTrack) return false;
    const currentTrackIndex = this.tracks.indexOf(currentTrack);

    // 2. Scan tracks BELOW this one
    let hasBackground = false;

    for (let i = currentTrackIndex + 1; i < this.tracks.length; i++) {
        const track = this.tracks[i];
        if (track.type === 'audio') continue;
        if (track.role === 'main') continue; // Ignore base layer

        const clipsAtCursor = track.getClipsAtTime(this.currentTime);
        if (clipsAtCursor.length > 0) {
            hasBackground = true;
            break;
        }
    }

    return hasBackground;
};

// 🔥 UPDATED: Ensures properties exist AND Repairs Broken Smart Objects
// ✨ Added: scaleX, scaleY, forcedWidth, forcedHeight
window.EditorApp.prototype.ensureProProperties = function(clip) {
    if (!clip) return;
    
    // 1. Try to find parent track defaults
    const app = window.app;
    let trackDefaults = null;
    if (app && app.tracks) {
        const track = app.tracks.find(t => t.id === clip.trackId);
        if (track && track.defaultStyle && track.defaultStyle.type === clip.type) {
            trackDefaults = track.defaultStyle;
        }
    }

    // 2. Helper to get default value
    const getDef = (cat, prop, fallback) => {
        if (trackDefaults && trackDefaults[cat] && trackDefaults[cat][prop] !== undefined) {
            return trackDefaults[cat][prop];
        }
        return fallback;
    };

    if (clip.properties.scale === undefined) clip.properties.scale = getDef('properties', 'scale', 100);
    if (clip.properties.scaleX === undefined) clip.properties.scaleX = getDef('properties', 'scaleX', 100); // NEW
    if (clip.properties.scaleY === undefined) clip.properties.scaleY = getDef('properties', 'scaleY', 100); // NEW
    
    if (clip.properties.positionX === undefined) clip.properties.positionX = getDef('properties', 'positionX', 0);
    if (clip.properties.positionY === undefined) clip.properties.positionY = getDef('properties', 'positionY', 0);
    if (clip.properties.rotation  === undefined) clip.properties.rotation  = getDef('properties', 'rotation',  0);
    if (clip.properties.opacity   === undefined) clip.properties.opacity   = getDef('properties', 'opacity',   100);
    if (clip.properties.volume    === undefined) clip.properties.volume    = getDef('properties', 'volume',    100); // ✅ ensure old clips default to 100
    
    if (!clip.keyframes) {
        clip.keyframes = { scale: [], positionX: [], positionY: [], rotation: [], opacity: [], volume: [] };
    }

    // ✅ Ensure AI/Ultra properties exist so ultra_features never throws
    if (!clip.aiSegmentation) clip.aiSegmentation = { enabled: false, loading: false };
    if (!clip.chromaKey)      clip.chromaKey      = { enabled: false, color: '#00ff00', threshold: 50 };
    if (!clip.logoRemovers)   clip.logoRemovers   = [];

    if (clip.type === 'text' && !clip.textStyle) {
        clip.textStyle = {
            fontFamily: 'Cairo', fontWeight: 'bold',
            color: '#ffffff', strokeColor: '#000000', strokeWidth: 0,
            shadowBlur: 0, backgroundColor: '#000000', backgroundOpacity: 0,
            padding: 20
        };
        if (trackDefaults && trackDefaults.textStyle) {
            Object.assign(clip.textStyle, trackDefaults.textStyle);
        }
    }

    if (!clip.transitions) {
        clip.transitions = { in: 'none', out: 'none', duration: 1.0 };
        if (trackDefaults && trackDefaults.transitions) {
            Object.assign(clip.transitions, trackDefaults.transitions);
        }
    }
    
    // 🔥 SMART SANDWICH REPAIR LOGIC
    let isBrokenSmart = false;
    if (clip.sandwich && clip.sandwich._isSmart) {
        const descriptor = Object.getOwnPropertyDescriptor(clip.sandwich, 'scale');
        if (!descriptor || !descriptor.get) {
            isBrokenSmart = true;
        }
    }

    if (!clip.sandwich || !clip.sandwich._isSmart || isBrokenSmart) {
        const has = (prop) => clip.sandwich && clip.sandwich[prop] !== undefined;

        const currentScale = has('scale') ? clip.sandwich.scale : getDef('sandwich', 'scale', 50);
        const currentX = has('offsetX') ? clip.sandwich.offsetX : getDef('sandwich', 'offsetX', 0);
        const currentY = has('offsetY') ? clip.sandwich.offsetY : getDef('sandwich', 'offsetY', 0);

        if (isBrokenSmart) {
            clip.sandwich = { _isSmart: true };
        } else if (!clip.sandwich) {
            clip.sandwich = { _isSmart: true };
        } else {
             clip.sandwich._isSmart = true;
        }

        const _storage = {
            scale: parseFloat(currentScale),
            offsetX: parseFloat(currentX),
            offsetY: parseFloat(currentY),
            _animScale: parseFloat(currentScale),
            _animX: parseFloat(currentX),
            _animY: parseFloat(currentY)
        };

        const smoothValue = (current, target, speed = 0.15) => {
            if (Math.abs(current - target) < 0.1) return target;
            return current + (target - current) * speed;
        };

        Object.defineProperties(clip.sandwich, {
            'scale': {
                get: function() {
                    const app = window.app;
                    const target = (window.app && window.app.isSandwichContextActive(clip)) ? _storage.scale : 100;
                    _storage._animScale = smoothValue(_storage._animScale, target, 0.15);
                    if (_storage._animScale !== target && window.app) window.app.requestRedraw();
                    return _storage._animScale;
                },
                set: function(v) { _storage.scale = parseFloat(v); },
                enumerable: true,
                configurable: true
            },
            'offsetX': {
                get: function() {
                    const app = window.app;
                    const target = (window.app && window.app.isSandwichContextActive(clip)) ? _storage.offsetX : 0;
                    _storage._animX = smoothValue(_storage._animX, target, 0.15);
                    if (_storage._animX !== target && window.app) window.app.requestRedraw();
                    return _storage._animX;
                },
                set: function(v) { _storage.offsetX = parseFloat(v); },
                enumerable: true,
                configurable: true
            },
            'offsetY': {
                get: function() {
                    const app = window.app;
                    const target = (window.app && window.app.isSandwichContextActive(clip)) ? _storage.offsetY : 0;
                    _storage._animY = smoothValue(_storage._animY, target, 0.15);
                    if (_storage._animY !== target && window.app) window.app.requestRedraw();
                    return _storage._animY;
                },
                set: function(v) { _storage.offsetY = parseFloat(v); },
                enumerable: true,
                configurable: true
            },
            '_rawScale': { get: () => _storage.scale, configurable: true },
            '_rawOffsetX': { get: () => _storage.offsetX, configurable: true },
            '_rawOffsetY': { get: () => _storage.offsetY, configurable: true }
        });
        
        if (isBrokenSmart && window.app) {
             window.app.log(`🔧 Repaired Smart Sandwich for Clip: ${clip.id}`);
        }
    }

    if (!clip.getPropertyValue) {
        clip.getPropertyValue = function(prop, timeRelative) {
            if (!this.keyframes[prop] || this.keyframes[prop].length === 0) {
                return this.properties[prop] !== undefined ? this.properties[prop] : (prop.includes('scale') ? 100 : 0);
            }
            const keys = this.keyframes[prop].sort((a, b) => a.t - b.t);
            if (timeRelative <= keys[0].t) return keys[0].v;
            if (timeRelative >= keys[keys.length - 1].t) return keys[keys.length - 1].v;
            for (let i = 0; i < keys.length - 1; i++) {
                const k1 = keys[i];
                const k2 = keys[i+1];
                if (timeRelative >= k1.t && timeRelative < k2.t) {
                    const ratio = (timeRelative - k1.t) / (k2.t - k1.t);
                    return k1.v + (k2.v - k1.v) * ratio;
                }
            }
            return this.properties[prop];
        };
    }
    if (!clip.addKeyframe) {
        clip.addKeyframe = function(prop, time, value) {
            if(!this.keyframes[prop]) this.keyframes[prop] = [];
            this.keyframes[prop] = this.keyframes[prop].filter(k => Math.abs(k.t - time) > 0.01);
            this.keyframes[prop].push({ t: time, v: parseFloat(value) });
        };
    }
};

window.EditorApp.prototype.calculateClipProperties = function(clip) {
    if (window.app && typeof window.app.ensureProProperties === 'function') {
        window.app.ensureProProperties(clip);
    }
    
    const timeInClip = this.currentTime - clip.start;
    if (clip.getPropertyValue) {
        clip.properties.scale     = clip.getPropertyValue('scale',     timeInClip);
        clip.properties.scaleX    = clip.getPropertyValue('scaleX',    timeInClip) || 100;
        clip.properties.scaleY    = clip.getPropertyValue('scaleY',    timeInClip) || 100;
        
        clip.properties.positionX = clip.getPropertyValue('positionX', timeInClip);
        clip.properties.positionY = clip.getPropertyValue('positionY', timeInClip);
        clip.properties.rotation  = clip.getPropertyValue('rotation',  timeInClip);
        clip.properties.opacity   = clip.getPropertyValue('opacity',   timeInClip);
        clip.properties.volume    = clip.getPropertyValue('volume',    timeInClip); // ✅ volume keyframes now animate
    }
};

};
