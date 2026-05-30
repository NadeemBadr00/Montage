// command_parser.ts
// Central logic for parsing string commands

export function parseSmartTime(timeStr: string): number {
    if (!timeStr) return 0;
    const matches = Array.from(timeStr.matchAll(/(\d+)([hms])/g));
    let totalSeconds = 0;
    let found = false;

    for (const match of matches) {
        found = true;
        const val = parseInt(match[1]);
        const unit = match[2];
        if (unit === 'h') totalSeconds += val * 3600;
        if (unit === 'm') totalSeconds += val * 60;
        if (unit === 's') totalSeconds += val;
    }
    
    if (!found && !isNaN(timeStr as any)) return parseInt(timeStr);
    return totalSeconds;
}

export function parseCommand(cmdString: string): any {
    const cmd = cmdString.trim().toLowerCase();
    if (!cmd) return null;

    if (cmd === 'undo') return { type: 'UNDO' };
    if (cmd === 'redo') return { type: 'REDO' };

    // Range Delete: d10s:20sv3
    const rangeDelRegex = /^d([0-9hms]+):([0-9hms]+)([vta]\d+)$/;
    const rangeDelMatch = cmd.match(rangeDelRegex);
    if (rangeDelMatch) {
        return {
            type: 'RANGE_DELETE',
            startTime: parseSmartTime(rangeDelMatch[1]),
            endTime: parseSmartTime(rangeDelMatch[2]),
            trackName: rangeDelMatch[3].toUpperCase()
        };
    }

    // Clip Index Delete: d1v2
    const clipDelRegex = /^d(\d+)([vta]\d+)$/;
    const clipDelMatch = cmd.match(clipDelRegex);
    if (clipDelMatch) {
        return {
            type: 'CLIP_INDEX_DELETE',
            index: parseInt(clipDelMatch[1]),
            trackName: clipDelMatch[2].toUpperCase()
        };
    }

    // Clear Track: dv2
    const trackClearRegex = /^d([vta]\d+)$/;
    const trackClearMatch = cmd.match(trackClearRegex);
    if (trackClearMatch) {
        return {
            type: 'TRACK_CLEAR',
            trackName: trackClearMatch[1].toUpperCase()
        };
    }

    // Upload Command: u10s:20sv1
    const uploadRegex = /^u([0-9hms]+)(?::([0-9hms]+))?([vta]\d+)$/;
    const uploadMatch = cmd.match(uploadRegex);
    if (uploadMatch) {
        const startTime = parseSmartTime(uploadMatch[1]);
        const endTimeStr = uploadMatch[2];
        const trackName = uploadMatch[3].toUpperCase();
        
        let finalDuration = null;
        if (endTimeStr) {
            const endTime = parseSmartTime(endTimeStr);
            if (endTime > startTime) {
                finalDuration = endTime - startTime;
            }
        }
        return {
            type: 'UPLOAD',
            startTime,
            finalDuration,
            trackName
        };
    }

    // Cut Command: c20sv1
    const cutRegex = /^c(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?([vta]\d+)$/;
    const cutMatch = cmd.match(cutRegex);
    if (cutMatch) {
        const h = parseInt(cutMatch[1] || '0');
        const m = parseInt(cutMatch[2] || '0');
        const s = parseInt(cutMatch[3] || '0');
        return {
            type: 'CUT',
            time: (h * 3600) + (m * 60) + s,
            trackName: cutMatch[4].toUpperCase()
        };
    }

    // Move Command
    if (cmd.startsWith('mv')) {
        return { type: 'MOVE', paramsStr: cmd.substring(2) };
    }

    // Remove Silence Command
    const rmsRegex = /^rms([vta]\d+)e(.+)$/i;
    const rmsMatch = cmd.match(rmsRegex);
    if (rmsMatch) {
        return {
            type: 'REMOVE_SILENCE',
            sourceTrack: rmsMatch[1].toUpperCase(),
            exceptions: rmsMatch[2].toUpperCase().match(/[vta]\d+/gi) || []
        };
    }

    // ─────────────────────────────────────────────────────────────
    // BUG #1 FIX: Toolbar actions that had no CMD equivalents
    // ─────────────────────────────────────────────────────────────

    // Delete selected clip(s): del
    if (cmd === 'del') return { type: 'DELETE_SELECTED' };

    // Ripple-delete selected clip(s): rdel
    if (cmd === 'rdel') return { type: 'RIPPLE_DELETE_SELECTED' };

    // Duplicate selected clip: dup
    if (cmd === 'dup') return { type: 'DUPLICATE_SELECTED' };

    // Add text clip at playhead: txt
    if (cmd === 'txt') return { type: 'ADD_TEXT' };

    // Add video track: atv
    if (cmd === 'atv') return { type: 'ADD_TRACK', trackType: 'video' };

    // Add audio track: ata
    if (cmd === 'ata') return { type: 'ADD_TRACK', trackType: 'audio' };

    // Property commands (Scale, Opacity, Rotation, ScaleX, ScaleY)
    // FIX #4: Require explicit 'c' separator before clip index: sc150c1v1
    // This eliminates ambiguity (e.g. sc1501v1 = scale 150 clip 1, or scale 1 clip 50 + 1?)
    // Legacy format sc150%1v1 (with %) is also still supported.
    const propRegex = /^(sc|op|ro|sx|sy)(-?\d+)[%c](\d+)([vta]\d+)$/i;
    const propMatch = cmd.match(propRegex);
    if (propMatch) {
        const cmdMap: any = { sc: 'scale', op: 'opacity', ro: 'rotation', sx: 'scaleX', sy: 'scaleY' };
        return {
            type: 'PROPERTY_UPDATE',
            property: cmdMap[propMatch[1].toLowerCase()],
            val: parseInt(propMatch[2]),
            index: parseInt(propMatch[3]),
            trackName: propMatch[4].toUpperCase()
        };
    }

    // ── Phase 1: Speed — sp2c1V1 (2x speed) or sp0.5c1V1 (0.5x slow-mo)
    const speedRegex = /^sp(\d*\.?\d+)c(\d+)([vta]\d+)$/i;
    const speedMatch = cmd.match(speedRegex);
    if (speedMatch) {
        return {
            type: 'SPEED_UPDATE',
            speed: parseFloat(speedMatch[1]),
            index: parseInt(speedMatch[2]),
            trackName: speedMatch[3].toUpperCase()
        };
    }

    // ── Phase 1: Volume — vol80c1A1 (80% volume) or vol0c1A1 (mute)
    const volRegex = /^vol(\d+)c(\d+)([vta]\d+)$/i;
    const volMatch = cmd.match(volRegex);
    if (volMatch) {
        return {
            type: 'VOLUME_UPDATE',
            volume: Math.max(0, Math.min(200, parseInt(volMatch[1]))),
            index: parseInt(volMatch[2]),
            trackName: volMatch[3].toUpperCase()
        };
    }

    // ── Phase 1: Fade In — fi2c1V1 (2s fade-in on clip 1 in V1)
    const fadeInRegex = /^fi(\d*\.?\d+)c(\d+)([vta]\d+)$/i;
    const fadeInMatch = cmd.match(fadeInRegex);
    if (fadeInMatch) {
        return {
            type: 'FADE_IN',
            duration: parseFloat(fadeInMatch[1]),
            index: parseInt(fadeInMatch[2]),
            trackName: fadeInMatch[3].toUpperCase()
        };
    }

    // ── Phase 1: Fade Out — fo1.5c1V1 (1.5s fade-out)
    const fadeOutRegex = /^fo(\d*\.?\d+)c(\d+)([vta]\d+)$/i;
    const fadeOutMatch = cmd.match(fadeOutRegex);
    if (fadeOutMatch) {
        return {
            type: 'FADE_OUT',
            duration: parseFloat(fadeOutMatch[1]),
            index: parseInt(fadeOutMatch[2]),
            trackName: fadeOutMatch[3].toUpperCase()
        };
    }

    // ── Phase 1: Crop — cr10,20,90,80c1V1 (x1%,y1%,x2%,y2% crop)
    const cropRegex = /^cr(\d+),(\d+),(\d+),(\d+)c(\d+)([vta]\d+)$/i;
    const cropMatch = cmd.match(cropRegex);
    if (cropMatch) {
        return {
            type: 'CROP_UPDATE',
            x1: parseInt(cropMatch[1]),
            y1: parseInt(cropMatch[2]),
            x2: parseInt(cropMatch[3]),
            y2: parseInt(cropMatch[4]),
            index: parseInt(cropMatch[5]),
            trackName: cropMatch[6].toUpperCase()
        };
    }

    // ── Phase 1: Crop Reset — crreset c1V1
    if (/^crreset c(\d+)([vta]\d+)$/i.test(cmd)) {
        const m = cmd.match(/^crreset c(\d+)([vta]\d+)$/i)!;
        return { type: 'CROP_RESET', index: parseInt(m[1]), trackName: m[2].toUpperCase() };
    }

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

    return null;
}

