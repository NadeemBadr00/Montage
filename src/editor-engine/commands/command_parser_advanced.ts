// @ts-nocheck
// command_parser_advanced.ts — Phase 2-6: color grading, shapes, Ken Burns, transitions, freeze, markers
import { parseSmartTime } from './command_parser';

export function parseAdvancedCommand(cmd: string): any {
    // ─────────────────────────────────────────────────────────────
    // Phase 2: Color Grading
    // ─────────────────────────────────────────────────────────────

    // Brightness — br120c1V1 (120% bright)
    const brRegex = /^br(\d+)c(\d+)([vta]\d+)$/i;
    const brMatch = cmd.match(brRegex);
    if (brMatch) {
        return { type: 'COLOR_UPDATE', property: 'brightness', val: parseInt(brMatch[1]), index: parseInt(brMatch[2]), trackName: brMatch[3].toUpperCase() };
    }

    // Contrast — cn110c1V1
    const cnRegex = /^cn(\d+)c(\d+)([vta]\d+)$/i;
    const cnMatch = cmd.match(cnRegex);
    if (cnMatch) {
        return { type: 'COLOR_UPDATE', property: 'contrast', val: parseInt(cnMatch[1]), index: parseInt(cnMatch[2]), trackName: cnMatch[3].toUpperCase() };
    }

    // Saturation — sat80c1V1 (0=grayscale, 100=normal, 200=vivid)
    const satRegex = /^sat(\d+)c(\d+)([vta]\d+)$/i;
    const satMatch = cmd.match(satRegex);
    if (satMatch) {
        return { type: 'COLOR_UPDATE', property: 'saturation', val: parseInt(satMatch[1]), index: parseInt(satMatch[2]), trackName: satMatch[3].toUpperCase() };
    }

    // Hue rotate — hue45c1V1 (rotate hue by N degrees)
    const hueRegex = /^hue(-?\d+)c(\d+)([vta]\d+)$/i;
    const hueMatch = cmd.match(hueRegex);
    if (hueMatch) {
        return { type: 'COLOR_UPDATE', property: 'hue', val: parseInt(hueMatch[1]), index: parseInt(hueMatch[2]), trackName: hueMatch[3].toUpperCase() };
    }

    // Tint — tint#ff000050c1V1 (hex color + opacity 0-100)
    const tintRegex = /^tint(#[0-9a-f]{6})(\d+)c(\d+)([vta]\d+)$/i;
    const tintMatch = cmd.match(tintRegex);
    if (tintMatch) {
        return { type: 'TINT_UPDATE', color: tintMatch[1], opacity: parseInt(tintMatch[2]), index: parseInt(tintMatch[3]), trackName: tintMatch[4].toUpperCase() };
    }

    // Filter Preset — filter:cinematic c1V1  (cinematic/bw/warm/cool/vintage/reset)
    const filterRegex = /^filter:(cinematic|bw|warm|cool|vintage|reset) c(\d+)([vta]\d+)$/i;
    const filterMatch = cmd.match(filterRegex);
    if (filterMatch) {
        return { type: 'FILTER_PRESET', preset: filterMatch[1].toLowerCase(), index: parseInt(filterMatch[2]), trackName: filterMatch[3].toUpperCase() };
    }

    // Color Reset — coloreset c1V1
    const colorResetRegex = /^colorreset c(\d+)([vta]\d+)$/i;
    const colorResetMatch = cmd.match(colorResetRegex);
    if (colorResetMatch) {
        return { type: 'COLOR_RESET', index: parseInt(colorResetMatch[1]), trackName: colorResetMatch[2].toUpperCase() };
    }



    // Size (Squeeze) — sz{W}x{H}c{INDEX}{TRACK}  e.g. sz1920x1080c1v1
    const sizeRegex = /^sz(\d+)x(\d+)c(\d+)([vta]\d+)$/i;
    const sizeMatch = cmd.match(sizeRegex);
    if (sizeMatch) {
        return { type: 'SIZE_UPDATE', w: parseInt(sizeMatch[1]), h: parseInt(sizeMatch[2]), index: parseInt(sizeMatch[3]), trackName: sizeMatch[4].toUpperCase() };
    }

    // ─────────────────────────────────────────────────────────────
    // Phase 3: Shapes + Ken Burns
    // ─────────────────────────────────────────────────────────────


    // Shape — shape:rect#ff000080 50x30 @0,0 5s V1
    //         shape:circle#00ff0066 20x20 @-200,100 3s V1
    //         shape:line#ffffff 80x2 @0,200 4s V1
    const shapeRegex = /^shape:(rect|circle|line|triangle)(#[0-9a-f]{6,8})\s+(\d+)x(\d+)\s+@(-?\d+),(-?\d+)\s+([\d.]+)s\s+([VTA]\d+)$/i;
    const shapeMatch = cmd.match(shapeRegex);
    if (shapeMatch) {
        return {
            type: 'SHAPE_ADD',
            shape: shapeMatch[1].toLowerCase(),
            color: shapeMatch[2],
            widthPct: parseInt(shapeMatch[3]),
            heightPct: parseInt(shapeMatch[4]),
            x: parseInt(shapeMatch[5]),
            y: parseInt(shapeMatch[6]),
            duration: parseFloat(shapeMatch[7]),
            trackName: shapeMatch[8].toUpperCase()
        };
    }

    // Ken Burns — kb:startX,startY,startScale:endX,endY,endScale c1V1
    // Example: kb:0,0,1.0:200,100,1.5 c1V1  (pan right+down and zoom in)
    const kbRegex = /^kb:(-?\d+),(-?\d+),([\d.]+):(-?\d+),(-?\d+),([\d.]+)\s+c(\d+)([VTA]\d+)$/i;
    const kbMatch = cmd.match(kbRegex);
    if (kbMatch) {
        return {
            type: 'KEN_BURNS',
            startX: parseInt(kbMatch[1]), startY: parseInt(kbMatch[2]), startScale: parseFloat(kbMatch[3]),
            endX:   parseInt(kbMatch[4]), endY:   parseInt(kbMatch[5]), endScale:   parseFloat(kbMatch[6]),
            index: parseInt(kbMatch[7]), trackName: kbMatch[8].toUpperCase()
        };
    }

    // Ken Burns Reset — kbreset c1V1
    const kbResetRegex = /^kbreset c(\d+)([VTA]\d+)$/i;
    const kbResetMatch = cmd.match(kbResetRegex);
    if (kbResetMatch) {
        return { type: 'KEN_BURNS_RESET', index: parseInt(kbResetMatch[1]), trackName: kbResetMatch[2].toUpperCase() };
    }

    // ─────────────────────────────────────────────────────────────
    // Phase 4: Track-Level Transitions
    // ─────────────────────────────────────────────────────────────
    // tr:dissolve @5 1s V1   (add dissolve transition at time=5s, dur=1s on V1)
    // tr:wipe @10 0.5s V1
    // tr:zoom @7.5 0.8s V1
    const trRegex = /^tr:(dissolve|wipe|zoom|fade)\s+@([\d.]+)\s+([\d.]+)s\s+([VTA]\d+)$/i;
    const trMatch = cmd.match(trRegex);
    if (trMatch) {
        return {
            type: 'TRANSITION_ADD',
            transType: trMatch[1].toLowerCase(),
            cutTime: parseFloat(trMatch[2]),
            duration: parseFloat(trMatch[3]),
            trackName: trMatch[4].toUpperCase()
        };
    }

    // Remove transition — trremove @5 V1
    const trRemoveRegex = /^trremove\s+@([\d.]+)\s+([VTA]\d+)$/i;
    const trRemoveMatch = cmd.match(trRemoveRegex);
    if (trRemoveMatch) {
        return { type: 'TRANSITION_REMOVE', cutTime: parseFloat(trRemoveMatch[1]), trackName: trRemoveMatch[2].toUpperCase() };
    }

    // ─────────────────────────────────────────────────────────────
    // Phase 6: Freeze Frame + Markers
    // ─────────────────────────────────────────────────────────────

    // Freeze frame — freeze 2s c1V1  (freeze for 2 seconds at current clip position)
    const freezeRegex = /^freeze\s+([\d.]+)s\s+c(\d+)([VTA]\d+)$/i;
    const freezeMatch = cmd.match(freezeRegex);
    if (freezeMatch) {
        return { type: 'FREEZE_FRAME', duration: parseFloat(freezeMatch[1]), index: parseInt(freezeMatch[2]), trackName: freezeMatch[3].toUpperCase() };
    }

    // Marker — mark:[label] @5.5   or   mark:intro @0
    const markerRegex = /^mark:([^\s]+)\s+@([\d.]+)$/i;
    const markerMatch = cmd.match(markerRegex);
    if (markerMatch) {
        return { type: 'MARKER_ADD', label: markerMatch[1], time: parseFloat(markerMatch[2]) };
    }

    // Marker remove — markremove @5.5
    const markerRemoveRegex = /^markremove\s+@([\d.]+)$/i;
    const markerRemoveMatch = cmd.match(markerRemoveRegex);
    if (markerRemoveMatch) {
        return { type: 'MARKER_REMOVE', time: parseFloat(markerRemoveMatch[1]) };
    }

    // Marker clear all — markclear
    if (/^markclear$/i.test(cmd)) {
        return { type: 'MARKER_CLEAR' };
    }

    // Go to marker — goto:[label]
    const gotoMarkerRegex = /^goto:([^\s]+)$/i;
    const gotoMarkerMatch = cmd.match(gotoMarkerRegex);
    if (gotoMarkerMatch) {
        return { type: 'GOTO_MARKER', label: gotoMarkerMatch[1] };
    }

    // Beat Detection
    if (/^\/?beat$/i.test(cmd)) {
        return { type: 'BEAT_DETECT' };
    }

    // Scene Detection
    if (/^\/?scenes?$/i.test(cmd)) {
        return { type: 'SCENE_DETECT' };
    }

    // Auto Ducking
    if (/^\/?duck(ing)?$/i.test(cmd)) {
        return { type: 'AUTO_DUCKING' };
    }

    // Phase 7: Progress Bar, Thumbnail, Lower Third, Emoji
    const progressRegex = /^\/?progress$/i;
    if (progressRegex.test(cmd)) return { type: 'PROGRESS_BAR' };

    const thumbRegex = /^\/?thumb(?:\s+(.+))?$/i;
    const thumbMatch = cmd.match(thumbRegex);
    if (thumbMatch) return { type: 'THUMBNAIL_GENERATE', text: thumbMatch[1] || '' };

    const lowerRegex = /^\/?lower(?:\s+(.+))?$/i;
    const lowerMatch = cmd.match(lowerRegex);
    if (lowerMatch) {
        const parts = lowerMatch[1] ? lowerMatch[1].split('-').map(s=>s.trim()) : ['Name', 'Title'];
        return { type: 'LOWER_THIRD', name: parts[0] || 'Name', title: parts[1] || 'Title' };
    }

    const emojiRegex = /^\/?emoji(?:\s+(.+))?$/i;
    const emojiMatch = cmd.match(emojiRegex);
    if (emojiMatch) return { type: 'EMOJI_REACTION', emoji: emojiMatch[1] || '😂' };

    // Phase 8: Voiceover, Captions, Font
    const voiceRegex = /^\/?voice\s+(.+)$/i;
    const voiceMatch = cmd.match(voiceRegex);
    if (voiceMatch) return { type: 'VOICEOVER_GENERATE', text: voiceMatch[1] };

    const captionsRegex = /^\/?captions?$/i;
    if (captionsRegex.test(cmd)) return { type: 'AUTO_CAPTIONS' };

    const fontRegex = /^\/?font\s+(.+)$/i;
    const fontMatch = cmd.match(fontRegex);
    if (fontMatch) return { type: 'CUSTOM_FONT', fontName: fontMatch[1].trim() };

    // Phase 9: Audio Mastering, Reverse, Chapters, Snapshot
    if (/^\/?bass$/i.test(cmd)) return { type: 'AUDIO_MASTER', filter: 'bass' };
    if (/^\/?noise$/i.test(cmd)) return { type: 'AUDIO_MASTER', filter: 'noise' };
    if (/^\/?reverse$/i.test(cmd)) return { type: 'REVERSE_CLIP' };
    if (/^\/?chapters?$/i.test(cmd)) return { type: 'EXPORT_CHAPTERS' };
    
    const snapRegex = /^\/?snapshot(?:\s+(.+))?$/i;
    const snapMatch = cmd.match(snapRegex);
    if (snapMatch) return { type: 'SAVE_SNAPSHOT', name: snapMatch[1] || `Snapshot_${Date.now()}` };

    // Phase 10: Ramp, Letterbox, B-Roll, Batch Export
    const rampRegex = /^\/?ramp\s+(up|down)$/i;
    const rampMatch = cmd.match(rampRegex);
    if (rampMatch) return { type: 'SPEED_RAMP', direction: rampMatch[1].toLowerCase() };

    if (/^\/?letterbox$/i.test(cmd)) return { type: 'LETTERBOX_TOGGLE' };
    if (/^\/?broll$/i.test(cmd)) return { type: 'BROLL_SUGGEST' };
    if (/^\/?batchexport$/i.test(cmd)) return { type: 'BATCH_EXPORT' };

    // Phase 11: Grid, Countdown, Filter, Title
    const gridRegex = /^\/?grid\s+(\d+)x(\d+)$/i;
    const gridMatch = cmd.match(gridRegex);
    if (gridMatch) return { type: 'GRID_LAYOUT', cols: parseInt(gridMatch[1]), rows: parseInt(gridMatch[2]) };

    const countdownRegex = /^\/?countdown(?:\s+(\d+))?$/i;
    const countdownMatch = cmd.match(countdownRegex);
    if (countdownMatch) return { type: 'COUNTDOWN_TIMER', seconds: parseInt(countdownMatch[1]) || 5 };

    const quickFilterRegex = /^\/?filter\s+([a-zA-Z0-9_-]+)$/i;
    const quickFilterMatch = cmd.match(quickFilterRegex);
    if (quickFilterMatch) return { type: 'QUICK_FILTER', filterType: quickFilterMatch[1].toLowerCase() };

    const titleRegex = /^\/?title(?:\s+(.+))?$/i;
    const titleMatch = cmd.match(titleRegex);
    if (titleMatch) return { type: 'CINEMATIC_TITLE', text: titleMatch[1] || 'TITLE' };

    // Phase 12: Chroma, Zoom, Waveform, Freeze
    if (/^\/?chroma$/i.test(cmd)) return { type: 'CHROMA_KEY' };
    
    const zoomRegex = /^\/?zoom\s+(in|out)$/i;
    const zoomMatch = cmd.match(zoomRegex);
    if (zoomMatch) return { type: 'AUTO_ZOOM', direction: zoomMatch[1].toLowerCase() };

    if (/^\/?waveform$/i.test(cmd)) return { type: 'AUDIO_WAVEFORM' };
    if (/^\/?freeze$/i.test(cmd)) return { type: 'FREEZE_FRAME' };

    // Phase 13: FCPXML, BeatMatch, Karaoke, Loop
    if (/^\/?export\s+xml$/i.test(cmd)) return { type: 'EXPORT_XML' };
    if (/^\/?beatmatch$/i.test(cmd)) return { type: 'BEAT_MATCH' };
    if (/^\/?karaoke$/i.test(cmd)) return { type: 'KARAOKE_SUBTITLES' };
    
    const loopRegex = /^\/?loop(?:\s+(\d+))?$/i;
    const loopMatch = cmd.match(loopRegex);
    if (loopMatch) return { type: 'LOOP_CLIP', times: parseInt(loopMatch[1]) || 1 };

    // ═══════════════════════════════════════════════════
    // Phase 14: Social Presets, Pitch, Color Match, GIF
    // ═══════════════════════════════════════════════════
    const pitchRegex = /^\/?pitch\s+([+-]?\d+)$/i;
    const pitchMatch = cmd.match(pitchRegex);
    if (pitchMatch) return { type: 'PITCH_SHIFT', semitones: parseInt(pitchMatch[1]) };

    if (/^\/?colormatch$/i.test(cmd)) return { type: 'COLOR_MATCH' };
    if (/^\/?gif$/i.test(cmd)) return { type: 'GIF_EXPORT' };

    const socialRegex = /^\/?social\s+(.+)$/i;
    const socialMatch = cmd.match(socialRegex);
    if (socialMatch) return { type: 'SOCIAL_PRESET', platform: socialMatch[1].trim() };

    // ═══════════════════════════════════════════════════
    // Phase 15: Camera FX
    // ═══════════════════════════════════════════════════
    if (/^\/?shake$/i.test(cmd)) return { type: 'CAMERA_SHAKE' };
    if (/^\/?vignette$/i.test(cmd)) return { type: 'VIGNETTE_TOGGLE' };
    if (/^\/?glitch$/i.test(cmd)) return { type: 'GLITCH_EFFECT' };

    const blurRegex = /^\/?blur(?:\s+(\d+))?$/i;
    const blurMatch = cmd.match(blurRegex);
    if (blurMatch) return { type: 'BLUR_EFFECT', amount: parseInt(blurMatch[1]) || 10 };

    // ═══════════════════════════════════════════════════
    // Phase 16: Particle & Light FX
    // ═══════════════════════════════════════════════════
    if (/^\/?flare$/i.test(cmd)) return { type: 'LENS_FLARE' };
    if (/^\/?rain$/i.test(cmd)) return { type: 'RAIN_OVERLAY' };
    if (/^\/?sparkle$/i.test(cmd)) return { type: 'SPARKLE_OVERLAY' };
    if (/^\/?lightsweep$/i.test(cmd)) return { type: 'LIGHT_SWEEP' };

    // ═══════════════════════════════════════════════════
    // Phase 17: Typography Pro
    // ═══════════════════════════════════════════════════
    const outlineRegex = /^\/?outline(?:\s+(.+))?$/i;
    const outlineMatch = cmd.match(outlineRegex);
    if (outlineMatch) return { type: 'TEXT_OUTLINE', color: outlineMatch[1] || '#000000' };

    const shadowRegex = /^\/?shadow(?:\s+(\d+))?$/i;
    const shadowMatch = cmd.match(shadowRegex);
    if (shadowMatch) return { type: 'TEXT_SHADOW', strength: parseInt(shadowMatch[1]) || 10 };

    if (/^\/?bold$/i.test(cmd)) return { type: 'TEXT_BOLD' };

    const tscaleRegex = /^\/?textscale\s+(\d+)$/i;
    const tscaleMatch = cmd.match(tscaleRegex);
    if (tscaleMatch) return { type: 'TEXT_SCALE', size: parseInt(tscaleMatch[1]) };

    // ═══════════════════════════════════════════════════
    // Phase 18: Branding
    // ═══════════════════════════════════════════════════
    const watermarkRegex = /^\/?watermark(?:\s+(.+))?$/i;
    const watermarkMatch = cmd.match(watermarkRegex);
    if (watermarkMatch) return { type: 'WATERMARK', text: watermarkMatch[1] || '@AI4Montage' };

    if (/^\/?logo$/i.test(cmd)) return { type: 'LOGO_OVERLAY' };
    if (/^\/?copyright$/i.test(cmd)) return { type: 'COPYRIGHT_STRIP' };

    const brandRegex = /^\/?brand\s+(#[0-9a-fA-F]{3,6}|[a-zA-Z]+)$/i;
    const brandMatch = cmd.match(brandRegex);
    if (brandMatch) return { type: 'BRAND_COLOR', color: brandMatch[1] };

    // ═══════════════════════════════════════════════════
    // Phase 19: AI Automation
    // ═══════════════════════════════════════════════════
    if (/^\/?storyboard$/i.test(cmd)) return { type: 'STORYBOARD' };
    if (/^\/?cleanup$/i.test(cmd)) return { type: 'CLEANUP_TIMELINE' };

    const moodRegex = /^\/?mood\s+(.+)$/i;
    const moodMatch = cmd.match(moodRegex);
    if (moodMatch) return { type: 'MOOD_MODE', mood: moodMatch[1].trim() };

    // ═══════════════════════════════════════════════════
    // Phase 20: Final Polish
    // ═══════════════════════════════════════════════════
    if (/^\/?help$/i.test(cmd)) return { type: 'SHOW_HELP' };
    if (/^\/?info$/i.test(cmd)) return { type: 'SHOW_INFO' };
    if (/^\/?history$/i.test(cmd)) return { type: 'SHOW_HISTORY' };
    if (/^\/?reset$/i.test(cmd)) return { type: 'RESET_EFFECTS' };

    return null;
}
