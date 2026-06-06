// @ts-nocheck
// gemini-actions.ts — executeActionSequence + executeSingleAction (30+ action cases)

async function executeActionSequence(actions) {
    for (const action of actions) {
        try { await this.executeSingleAction(action); }
        catch (err) { console.error(err); }
        await new Promise(r => setTimeout(r, 400));
    }
}

async function executeSingleAction(action) {
    let targetClip = null;
    if (action.clip_id) targetClip = window.app.findClipById(action.clip_id);
    if (!targetClip && action.track_name) {
        const track = window.app.tracks.find(t => t.name === action.track_name);
        if (track && track.clips.length > 0) {
            targetClip = track.getClipsAtTime(window.app.currentTime)[0] || track.clips[0];
        }
    }

    const getClipSuffix = () => {
        if (!targetClip) return "";
        const t = window.app.tracks.find(tr => tr.id === targetClip.trackId);
        if (!t) return "";
        const sorted = [...t.clips].sort((a, b) => a.start - b.start);
        const idx = sorted.findIndex(c => c.id === targetClip.id) + 1;
        return `${idx}${t.name}`;
    };

    const getTrackName = (fallback) => {
        if (action.track_name) return action.track_name;
        if (targetClip) {
            const t = window.app.tracks.find(tr => tr.id === targetClip.trackId);
            return t ? t.name : fallback;
        }
        return fallback;
    };

    switch (action.action) {

        case 'split': {
            const time = action.time !== undefined ? action.time : window.app.currentTime;
            this.runCLI(`c${this.timeToCLI(time)}${getTrackName('V1')}`);
            break;
        }

        case 'upload': {
            const start = action.start !== undefined ? action.start : window.app.currentTime;
            const track = getTrackName('V1');
            const cmd = action.end !== undefined
                ? `u${this.timeToCLI(start)}:${this.timeToCLI(action.end)}${track}`
                : `u${this.timeToCLI(start)}${track}`;
            this.runCLI(cmd);
            break;
        }

        case 'remove_silence': {
            const source = action.source_track || 'A1';
            const exceptions = action.exceptions || [];
            let cmd = `rms${source}`;
            if (exceptions.length > 0) cmd += `e${exceptions.join('')}`;
            this.runCLI(cmd);
            break;
        }

        case 'modify': {
            if (!targetClip) {
                this.pushMessage('ai', '⚠️ لم أجد الكليب المطلوب — تأكد من تحديده أو تحديد clip_id صحيح.');
                break;
            }
            const data = action.data || {};
            const suffix = getClipSuffix();
            if (data.scale !== undefined)  this.runCLI(`sc${data.scale}c${suffix}`);
            if (data.scaleX !== undefined) this.runCLI(`sx${data.scaleX}c${suffix}`);
            if (data.scaleY !== undefined) this.runCLI(`sy${data.scaleY}c${suffix}`);
            if (data.width !== undefined && data.height !== undefined) {
                this.runCLI(`sz${data.width}x${data.height}c${suffix}`);
            }
            if (data.opacity !== undefined)  this.runCLI(`op${data.opacity}c${suffix}`);
            if (data.rotation !== undefined) this.runCLI(`ro${data.rotation}c${suffix}`);
            if (data.x !== undefined || data.y !== undefined) {
                const posMap = { left:'l', right:'r', center:'c', middle:'c', top:'u', up:'u', bottom:'d', down:'d', l:'l', r:'r', c:'c', u:'u', d:'d' };
                const resolveCoord = (val, axis) => {
                    if (val === undefined || val === null) return null;
                    const clean = String(val).toLowerCase().replace(/[xy]/g, '').trim();
                    if (posMap[clean]) return `${posMap[clean]}${axis}`;
                    if (!isNaN(parseFloat(clean))) return `${clean}${axis}`;
                    return null;
                };
                const xPart = resolveCoord(data.x, 'x');
                const yPart = resolveCoord(data.y, 'y');
                if (xPart || yPart) this.runCLI(`mv${xPart || ''}${yPart || ''}${getClipSuffix()}`);
            }
            break;
        }

        case 'delete_range': {
            if (action.start !== undefined && action.end !== undefined && action.track_name) {
                this.runCLI(`d${this.timeToCLI(action.start)}:${this.timeToCLI(action.end)}${action.track_name}`);
            }
            break;
        }

        case 'clear_track': {
            if (action.track_name) this.runCLI(`d${action.track_name}`);
            break;
        }

        case 'delete': {
            if (targetClip) {
                const t = window.app.tracks.find(tr => tr.id === targetClip.trackId);
                if (t) {
                    const sorted = [...t.clips].sort((a, b) => a.start - b.start);
                    const idx = sorted.findIndex(c => c.id === targetClip.id);
                    if (idx !== -1) { this.runCLI(`d${idx + 1}${t.name}`); return; }
                }
                window.app.selectClip(targetClip.id);
                window.app.deleteSelectedClips();
            }
            break;
        }

        // ── New CMD-parity actions ──────────────────────────────────────
        case 'delete_selected':   this.runCLI('del');  break;
        case 'ripple_delete':     this.runCLI('rdel'); break;
        case 'duplicate':         this.runCLI('dup');  break;
        case 'add_text':          this.runCLI('txt');  break;
        case 'add_video_track':   this.runCLI('atv');  break;
        case 'add_audio_track':   this.runCLI('ata');  break;
        case 'undo':              this.runCLI('undo'); break;
        case 'redo':              this.runCLI('redo'); break;

        // ── Phase 1: Speed / Volume / Fade / Crop ──────────────────────
        case 'speed': {
            if (!targetClip) { this.pushMessage('ai', '⚠️ لم أجد الكليب.'); break; }
            const t = window.app.tracks.find(tr => tr.id === targetClip.trackId);
            if (!t) break;
            const sorted = [...t.clips].sort((a, b) => a.start - b.start);
            const idx = sorted.findIndex(c => c.id === targetClip.id) + 1;
            const sp = Math.max(0.1, Math.min(16, action.speed || 1));
            this.runCLI(`sp${sp}c${idx}${t.name}`);
            break;
        }

        case 'volume': {
            if (!targetClip) { this.pushMessage('ai', '⚠️ لم أجد الكليب.'); break; }
            const t = window.app.tracks.find(tr => tr.id === targetClip.trackId);
            if (!t) break;
            const sorted = [...t.clips].sort((a, b) => a.start - b.start);
            const idx = sorted.findIndex(c => c.id === targetClip.id) + 1;
            const vol = Math.max(0, Math.min(200, action.volume ?? 100));
            this.runCLI(`vol${vol}c${idx}${t.name}`);
            break;
        }

        case 'fade_in': {
            if (!targetClip) { this.pushMessage('ai', '⚠️ لم أجد الكليب.'); break; }
            const t = window.app.tracks.find(tr => tr.id === targetClip.trackId);
            if (!t) break;
            const sorted = [...t.clips].sort((a, b) => a.start - b.start);
            const idx = sorted.findIndex(c => c.id === targetClip.id) + 1;
            const dur = action.duration || 1;
            this.runCLI(`fi${dur}c${idx}${t.name}`);
            break;
        }

        case 'fade_out': {
            if (!targetClip) { this.pushMessage('ai', '⚠️ لم أجد الكليب.'); break; }
            const t = window.app.tracks.find(tr => tr.id === targetClip.trackId);
            if (!t) break;
            const sorted = [...t.clips].sort((a, b) => a.start - b.start);
            const idx = sorted.findIndex(c => c.id === targetClip.id) + 1;
            const dur = action.duration || 1;
            this.runCLI(`fo${dur}c${idx}${t.name}`);
            break;
        }

        case 'crop': {
            if (!targetClip) { this.pushMessage('ai', '⚠️ لم أجد الكليب.'); break; }
            const t = window.app.tracks.find(tr => tr.id === targetClip.trackId);
            if (!t) break;
            const sorted = [...t.clips].sort((a, b) => a.start - b.start);
            const idx = sorted.findIndex(c => c.id === targetClip.id) + 1;
            const x1 = action.x1 ?? 0, y1 = action.y1 ?? 0;
            const x2 = action.x2 ?? 100, y2 = action.y2 ?? 100;
            this.runCLI(`cr${x1},${y1},${x2},${y2}c${idx}${t.name}`);
            break;
        }

        case 'crop_reset': {
            if (!targetClip) { this.pushMessage('ai', '⚠️ لم أجد الكليب.'); break; }
            const t = window.app.tracks.find(tr => tr.id === targetClip.trackId);
            if (!t) break;
            const sorted = [...t.clips].sort((a, b) => a.start - b.start);
            const idx = sorted.findIndex(c => c.id === targetClip.id) + 1;
            this.runCLI(`cr0,0,100,100c${idx}${t.name}`);
            break;
        }

        // ── Phase 2: Color Grading ──────────────────────────────────────
        case 'brightness':
        case 'contrast':
        case 'saturation':
        case 'hue': {
            if (!targetClip) { this.pushMessage('ai', '⚠️ لم أجد الكليب.'); break; }
            const t = window.app.tracks.find(tr => tr.id === targetClip.trackId);
            if (!t) break;
            const sorted = [...t.clips].sort((a, b) => a.start - b.start);
            const idx = sorted.findIndex(c => c.id === targetClip.id) + 1;
            const val = action.value ?? 100;
            const cmdPrefix: Record<string, string> = { brightness: 'br', contrast: 'cn', saturation: 'sat', hue: 'hue' };
            this.runCLI(`${cmdPrefix[action.action]}${val}c${idx}${t.name}`);
            break;
        }

        case 'tint': {
            if (!targetClip) { this.pushMessage('ai', '⚠️ لم أجد الكليب.'); break; }
            const t = window.app.tracks.find(tr => tr.id === targetClip.trackId);
            if (!t) break;
            const sorted = [...t.clips].sort((a, b) => a.start - b.start);
            const idx = sorted.findIndex(c => c.id === targetClip.id) + 1;
            const color = (action.color || '#ff0000').replace('#', '%23');
            const opacity = action.opacity ?? 30;
            // tint uses direct API call since hex in CLI is complex
            const clip = targetClip;
            if (!clip.properties) clip.properties = {};
            if (!clip.properties.colorGrading) clip.properties.colorGrading = { brightness: 100, contrast: 100, saturation: 100, hue: 0, tintColor: null, tintOpacity: 0 };
            clip.properties.colorGrading.tintColor = action.color || '#ff0000';
            clip.properties.colorGrading.tintOpacity = opacity / 100;
            window.app._cmdFinalize?.();
            this.pushMessage('ai', `🎨 تم تطبيق tint ${action.color} بنسبة ${opacity}%`);
            break;
        }

        case 'filter_preset': {
            if (!targetClip) { this.pushMessage('ai', '⚠️ لم أجد الكليب.'); break; }
            const t = window.app.tracks.find(tr => tr.id === targetClip.trackId);
            if (!t) break;
            const sorted = [...t.clips].sort((a, b) => a.start - b.start);
            const idx = sorted.findIndex(c => c.id === targetClip.id) + 1;
            const preset = action.preset || 'cinematic';
            this.runCLI(`filter:${preset} c${idx}${t.name}`);
            break;
        }

        case 'color_reset': {
            if (!targetClip) { this.pushMessage('ai', '⚠️ لم أجد الكليب.'); break; }
            const t = window.app.tracks.find(tr => tr.id === targetClip.trackId);
            if (!t) break;
            const sorted = [...t.clips].sort((a, b) => a.start - b.start);
            const idx = sorted.findIndex(c => c.id === targetClip.id) + 1;
            this.runCLI(`colorreset c${idx}${t.name}`);
            break;
        }

        case 'seek':

            if (typeof action.time === 'number') {
                // engine pattern: set currentTime then seek(0) to re-render
                window.app.currentTime = action.time;
                if (window.app.seek) window.app.seek(0);
                window.app.requestRedraw?.();
            }
            break;

        // ── Phase 3: Shapes + Ken Burns ────────────────────────────────
        case 'add_shape': {
            const trackName = action.track || 'V1';
            const shape = action.shape || 'rect';
            const color = (action.color || '#ffffff') + Math.round((action.opacity ?? 80) * 255 / 100).toString(16).padStart(2, '0');
            const wPct = action.widthPct ?? 50;
            const hPct = action.heightPct ?? 30;
            const x = action.x ?? 0;
            const y = action.y ?? 0;
            const dur = action.duration ?? 3;
            this.runCLI(`shape:${shape}${color} ${wPct}x${hPct} @${x},${y} ${dur}s ${trackName}`);
            break;
        }

        case 'ken_burns': {
            if (!targetClip) { this.pushMessage('ai', '⚠️ لم أجد الكليب.'); break; }
            const t = window.app.tracks.find(tr => tr.id === targetClip.trackId);
            if (!t) break;
            const sorted = [...t.clips].sort((a, b) => a.start - b.start);
            const idx = sorted.findIndex(c => c.id === targetClip.id) + 1;
            const sx = action.startX ?? 0, sy = action.startY ?? 0, ss = action.startScale ?? 1;
            const ex = action.endX ?? 100, ey = action.endY ?? 50, es = action.endScale ?? 1.3;
            this.runCLI(`kb:${sx},${sy},${ss}:${ex},${ey},${es} c${idx}${t.name}`);
            break;
        }

        case 'ken_burns_reset': {
            if (!targetClip) { this.pushMessage('ai', '⚠️ لم أجد الكليب.'); break; }
            const t = window.app.tracks.find(tr => tr.id === targetClip.trackId);
            if (!t) break;
            const sorted = [...t.clips].sort((a, b) => a.start - b.start);
            const idx = sorted.findIndex(c => c.id === targetClip.id) + 1;
            this.runCLI(`kbreset c${idx}${t.name}`);
            break;
        }

        // ── Phase 4: Transitions ───────────────────────────────────────
        case 'add_transition': {
            const tName = action.track_name || 'V1';
            const ct = action.cut_time ?? window.app.currentTime;
            const type = action.type || 'dissolve';
            const dur = action.duration ?? 1;
            this.runCLI(`tr:${type} @${ct} ${dur}s ${tName}`);
            break;
        }

        case 'remove_transition': {
            const tName = action.track_name || 'V1';
            const ct = action.cut_time ?? window.app.currentTime;
            this.runCLI(`trremove @${ct} ${tName}`);
            break;
        }

        // ── Phase 5: Smart AI Actions ──────────────────────────────────
        case 'auto_cut_silence': {
            const trackName = action.track_name || 'A1';
            this.runCLI(`rmsilence ${trackName} except:[]`);
            break;
        }

        case 'smart_color_match': {
            // Match target clip colors to reference clip using luminance-based estimation
            const refId  = action.ref_clip_id;
            const tgtId  = action.target_clip_id;
            const allClips = window.app.tracks.flatMap((t: any) => t.clips);
            const ref = allClips.find((c: any) => c.id === refId || c.id === targetClip?.id);
            const tgt = allClips.find((c: any) => c.id === tgtId);
            if (!ref || !tgt) { this.pushMessage('ai', '⚠️ تعذّر العثور على الكليبات'); break; }
            // Copy color grading from ref to tgt
            if (ref.properties?.colorGrading) {
                if (!tgt.properties) tgt.properties = {};
                tgt.properties.colorGrading = { ...ref.properties.colorGrading };
                window.app._cmdFinalize?.();
                this.pushMessage('ai', `🎨 تم مطابقة ألوان "${tgt.name}" مع "${ref.name}"`);
            } else {
                this.pushMessage('ai', `⚠️ الكليب المرجعي لا يحتوي على color grading`);
            }
            break;
        }

        case 'batch_speed': {
            const trackName = action.track_name;
            const speed = action.speed ?? 1;
            const track = window.app.tracks.find((t: any) => t.name === trackName);
            if (!track) { this.pushMessage('ai', `⚠️ Track ${trackName} غير موجود`); break; }
            const sorted = [...track.clips].sort((a: any, b: any) => a.start - b.start);
            sorted.forEach((_: any, i: number) => {
                this.runCLI(`sp${speed}c${i + 1}${track.name}`);
            });
            break;
        }

        // ── Phase 6: Freeze Frame + Markers ───────────────────────────
        case 'freeze_frame': {
            if (!targetClip) { this.pushMessage('ai', '⚠️ لم أجد الكليب.'); break; }
            const t = window.app.tracks.find(tr => tr.id === targetClip.trackId);
            if (!t) break;
            const sorted = [...t.clips].sort((a, b) => a.start - b.start);
            const idx = sorted.findIndex(c => c.id === targetClip.id) + 1;
            const dur = action.duration ?? 2;
            this.runCLI(`freeze ${dur}s c${idx}${t.name}`);
            break;
        }

        case 'add_marker': {
            const label = (action.label || 'marker').replace(/\s+/g, '_');
            const time = action.time ?? window.app.currentTime;
            this.runCLI(`mark:${label} @${time}`);
            break;
        }

        case 'remove_marker': {
            const time = action.time ?? window.app.currentTime;
            this.runCLI(`markremove @${time}`);
            break;
        }

        case 'clear_markers':
            this.runCLI('markclear');
            break;

        case 'goto_marker': {
            const label = (action.label || '').replace(/\s+/g, '_');
            this.runCLI(`goto:${label}`);
            break;
        }

    }


}

export function bindGeminiActions(cls: any) {
    cls.prototype.executeActionSequence = executeActionSequence;
    cls.prototype.executeSingleAction = executeSingleAction;
}
