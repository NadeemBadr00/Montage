// command_parser.ts
// Central logic for parsing string commands
import { parseAdvancedCommand } from './command_parser_advanced';

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

    // ── Phase 4: Missing Features
    // scene-detect c1V1
    const sdRegex = /^scene-detect c(\d+)([vta]\d+)$/i;
    const sdMatch = cmd.match(sdRegex);
    if (sdMatch) {
        return { type: 'SCENE_DETECT', clipId: `c_${sdMatch[2].toUpperCase()}_${sdMatch[1]}` }; // Actually better to pass trackName and index, or assume standard clip IDs.
    }
    
    // auto-duck
    if (cmd === 'auto-duck') return { type: 'AUTO_DUCK' };
    
    // generate-thumbnail
    if (cmd === 'generate-thumbnail' || cmd === 'thumbnail') return { type: 'THUMBNAIL' };

    // ── Phase 5: Final Missing Features
    if (cmd === 'export-audio') return { type: 'EXPORT_AUDIO' };
    if (cmd === 'export-gif') return { type: 'EXPORT_GIF' };
    if (cmd === 'generate-chapters') return { type: 'GENERATE_CHAPTERS' };
    
    // color-match c1V1
    const cmRegex = /^color-match c(\d+)([vta]\d+)$/i;
    const cmMatch = cmd.match(cmRegex);
    if (cmMatch) {
        return { type: 'COLOR_MATCH', clipId: `c_${cmMatch[2].toUpperCase()}_${cmMatch[1]}` };
    }

    const advanced = parseAdvancedCommand(cmd);
    if (advanced) return advanced;

    // ─────────────────────────────────────────────────────────────
    // New Feature Commands
    // ─────────────────────────────────────────────────────────────

    // Beat Detection: /beatdetect
    if (cmd === 'beatdetect' || cmd === 'beat') return { type: 'BEAT_DETECT' };
    
    // Beat Sync: /beatsync (cut at every beat on main track)
    if (cmd === 'beatsync' || cmd.startsWith('beatsync ')) {
        const trackName = cmd.split(' ')[1]?.toUpperCase() || null;
        return { type: 'BEAT_SYNC', trackName };
    }
    
    // Clear beats: /clearbeats
    if (cmd === 'clearbeats' || cmd === 'clearbeats') return { type: 'CLEAR_BEATS' };

    // Version History: /saveversion [name]
    if (cmd.startsWith('saveversion') || cmd.startsWith('savevers')) {
        const name = cmd.trim().replace(/^saveversion\s*/i, '').trim() || undefined;
        return { type: 'SAVE_VERSION', name };
    }
    
    // List versions: /versions
    if (cmd === 'versions' || cmd === 'listversions' || cmd === 'history') return { type: 'LIST_VERSIONS' };
    
    // Restore version: /restore 1 or /restore 2
    if (cmd.startsWith('restore ')) {
        const idx = parseInt(cmd.split(' ')[1]);
        return { type: 'RESTORE_VERSION', index: isNaN(idx) ? 1 : idx };
    }

    // Delete version: /deleteversion 1 or /deleteversion all
    if (cmd.startsWith('deleteversion ') || cmd.startsWith('delversion ')) {
        const parts = cmd.split(' ');
        const idx = parts[1] === 'all' ? 'all' : parseInt(parts[1]);
        return { type: 'DELETE_VERSION', index: idx };
    }

    // Reverse clip: /reverse
    if (cmd === 'reverse' || cmd === 'rev') return { type: 'REVERSE_CLIP' };

    // Set clip speed: /speed 0.5 or /speed 2
    if (cmd.startsWith('speed ') || cmd.startsWith('spd ')) {
        const s = parseFloat(cmd.split(' ')[1]);
        if (!isNaN(s)) return { type: 'SET_SPEED', speed: s };
    }

    // Speed ramp: /speedramp 0.5 2  (slow → fast)
    if (cmd.startsWith('speedramp ')) {
        const parts = cmd.split(' ');
        const s1 = parseFloat(parts[1]);
        const s2 = parseFloat(parts[2]);
        return { type: 'SPEED_RAMP_V2', startSpeed: s1 || 0.5, endSpeed: s2 || 2.0 };
    }

    // Auto Captions: /captions [lang] [style]
    if (cmd === 'captions' || cmd === 'autocaptions' || cmd === 'caption') {
        return { type: 'AUTO_CAPTION', lang: 'ar', style: 'tiktok' };
    }
    if (cmd.startsWith('captions ') || cmd.startsWith('caption ')) {
        const parts = cmd.split(' ');
        return { type: 'AUTO_CAPTION', lang: parts[1] || 'ar', style: parts[2] || 'tiktok' };
    }

    // Load font: /loadfont (opens file picker)
    if (cmd === 'loadfont' || cmd === 'font') return { type: 'LOAD_FONT', url: null, name: null };
    
    // List fonts: /fonts
    if (cmd === 'fonts' || cmd === 'listfonts') return { type: 'LIST_FONTS' };
    
    // Apply font to selection: /applyfont Cairo
    if (cmd.startsWith('applyfont ')) {
        const fontName = cmd.trim().replace(/^applyfont\s*/i, '').trim();
        return { type: 'APPLY_FONT', fontName };
    }

    return null;
}
