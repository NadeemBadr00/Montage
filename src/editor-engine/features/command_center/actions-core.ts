// @ts-nocheck
// actions-core.ts — executeCommand dispatcher + core timeline ops (cut/move/delete/upload/silence)
import { parseCommand } from '../../commands/command_parser';

export const injectActionsCore = () => {
    window.EditorApp.prototype.executeCommand = function() {
        const cmdStr = this.commandBuffer;
        const parsed = parseCommand(cmdStr);
        
        if (!parsed) {
            this.log("❌ Unknown Command");
            setTimeout(() => this.clearCommand(), 1000);
            return;
        }

        this.log(`🚀 Executing: ${cmdStr}`);

        // Track command history (Phase 20)
        if (!window.__cmdHistory__) window.__cmdHistory__ = [];
        window.__cmdHistory__.push(cmdStr);
        if (window.__cmdHistory__.length > 50) window.__cmdHistory__.shift();

        switch (parsed.type) {
            case 'UNDO':
                this.undo();
                break;
            case 'REDO':
                this.redo();
                break;
            // BUG #1 FIX: new toolbar-equivalent commands
            case 'DELETE_SELECTED':
                this.deleteSelectedClips();
                break;
            case 'RIPPLE_DELETE_SELECTED':
                this.rippleDelete();
                break;
            case 'DUPLICATE_SELECTED':
                this.duplicateSelectedClip();
                break;
            case 'ADD_TEXT':
                this.addTextClip();
                break;
            case 'ADD_TRACK':
                this.addNewTrack(parsed.trackType);
                break;
            case 'RANGE_DELETE':
                this.executeRangeDelete(parsed.startTime, parsed.endTime, parsed.trackName);
                break;
            case 'CLIP_INDEX_DELETE':
                this.executeClipIndexDelete(parsed.index, parsed.trackName);
                break;
            case 'TRACK_CLEAR':
                this.executeTrackClear(parsed.trackName);
                break;
            case 'UPLOAD':
                this.executeUploadCommand(parsed.startTime, parsed.finalDuration, parsed.trackName);
                break;
            case 'CUT':
                this.executeCutCommand(parsed.time, parsed.trackName);
                break;
            case 'MOVE':
                this.executeMoveCommand(parsed.paramsStr);
                break;
            case 'REMOVE_SILENCE':
                this.executeRemoveSilenceCommand(parsed.sourceTrack, parsed.exceptions);
                break;
            case 'PROPERTY_UPDATE':
                this.executePropertyCommand(parsed.trackName, parsed.index, parsed.property, parsed.val);
                break;
            case 'SIZE_UPDATE':
                this.executePropertyCommand(parsed.trackName, parsed.index, 'size', { width: parsed.w, height: parsed.h });
                break;
            // ─────────────────────────────────────────────────────────────
            // Phase 1: Speed / Volume / Fade / Crop
            // ─────────────────────────────────────────────────────────────
            case 'SPEED_UPDATE':
                this.executeSpeedCommand(parsed.trackName, parsed.index, parsed.speed);
                break;
            case 'VOLUME_UPDATE':
                this.executeVolumeCommand(parsed.trackName, parsed.index, parsed.volume);
                break;
            case 'FADE_IN':
                this.executeFadeCommand(parsed.trackName, parsed.index, 'in', parsed.duration);
                break;
            case 'FADE_OUT':
                this.executeFadeCommand(parsed.trackName, parsed.index, 'out', parsed.duration);
                break;
            case 'CROP_UPDATE':
                this.executeCropCommand(parsed.trackName, parsed.index, parsed.x1, parsed.y1, parsed.x2, parsed.y2);
                break;
            case 'CROP_RESET':
                this.executeCropCommand(parsed.trackName, parsed.index, 0, 0, 100, 100);
                break;

            // ─────────────────────────────────────────────────────────────
            // Phase 2: Color Grading
            // ─────────────────────────────────────────────────────────────
            case 'COLOR_UPDATE':
                this.executeColorCommand(parsed.trackName, parsed.index, parsed.property, parsed.val);
                break;
            case 'TINT_UPDATE':
                this.executeTintCommand(parsed.trackName, parsed.index, parsed.color, parsed.opacity);
                break;
            case 'FILTER_PRESET':
                this.executeFilterPresetCommand(parsed.trackName, parsed.index, parsed.preset);
                break;
            case 'COLOR_RESET':
                this.executeColorResetCommand(parsed.trackName, parsed.index);
                break;

            // ─────────────────────────────────────────────────────────────
            // Phase 3: Shapes + Ken Burns
            // ─────────────────────────────────────────────────────────────
            case 'SHAPE_ADD':
                this.executeShapeAddCommand(parsed);
                break;
            case 'KEN_BURNS':
                this.executeKenBurnsCommand(parsed.trackName, parsed.index, parsed.startX, parsed.startY, parsed.startScale, parsed.endX, parsed.endY, parsed.endScale);
                break;
            case 'KEN_BURNS_RESET':
                this.executeKenBurnsResetCommand(parsed.trackName, parsed.index);
                break;

            // ─────────────────────────────────────────────────────────────
            // Phase 4: Track Transitions
            // ─────────────────────────────────────────────────────────────
            case 'TRANSITION_ADD':
                this.executeTransitionAddCommand(parsed.trackName, parsed.cutTime, parsed.transType, parsed.duration);
                break;
            case 'TRANSITION_REMOVE':
                this.executeTransitionRemoveCommand(parsed.trackName, parsed.cutTime);
                break;

            // ─────────────────────────────────────────────────────────────
            // Phase 6: Freeze Frame + Markers
            // ─────────────────────────────────────────────────────────────
            case 'FREEZE_FRAME':
                this.executeFreezeFrameCommand(parsed.trackName, parsed.index, parsed.duration);
                break;
            case 'MARKER_ADD':
                this.executeMarkerAddCommand(parsed.label, parsed.time);
                break;
            case 'MARKER_REMOVE':
                this.executeMarkerRemoveCommand(parsed.time);
                break;
            case 'MARKER_CLEAR':
                this.executeMarkerClearCommand();
                break;
            case 'GOTO_MARKER':
                this.executeGotoMarkerCommand(parsed.label);
                break;
            case 'BEAT_DETECT':
                if (this.executeBeatDetection) this.executeBeatDetection();
                break;
            case 'SCENE_DETECT':
                if (this.executeSceneDetection) this.executeSceneDetection();
                break;
            case 'AUTO_DUCKING':
                if (this.executeAutoDucking) this.executeAutoDucking();
                break;
            case 'PROGRESS_BAR':
                if (this.executeProgressBar) this.executeProgressBar();
                break;
            case 'THUMBNAIL_GENERATE':
                if (this.executeThumbnailGenerate) this.executeThumbnailGenerate(parsed.text);
                break;
            case 'LOWER_THIRD':
                if (this.executeLowerThird) this.executeLowerThird(parsed.name, parsed.title);
                break;
            case 'EMOJI_REACTION':
                if (this.executeEmojiReaction) this.executeEmojiReaction(parsed.emoji);
                break;
            case 'VOICEOVER_GENERATE':
                if (this.executeVoiceover) this.executeVoiceover(parsed.text);
                break;
            case 'AUTO_CAPTIONS':
                if (this.executeAutoCaptions) this.executeAutoCaptions();
                break;
            case 'CUSTOM_FONT':
                if (this.executeCustomFont) this.executeCustomFont(parsed.fontName);
                break;
            case 'AUDIO_MASTER':
                if (this.executeAudioMaster) this.executeAudioMaster(parsed.filter);
                break;
            case 'REVERSE_CLIP':
                if (this.executeReverseClip) this.executeReverseClip();
                break;
            case 'EXPORT_CHAPTERS':
                if (this.executeExportChapters) this.executeExportChapters();
                break;
            case 'SAVE_SNAPSHOT':
                if (this.executeSaveSnapshot) this.executeSaveSnapshot(parsed.name);
                break;
            case 'SPEED_RAMP':
                if (this.executeSpeedRamp) this.executeSpeedRamp(parsed.direction);
                break;
            case 'LETTERBOX_TOGGLE':
                if (this.executeLetterbox) this.executeLetterbox();
                break;
            case 'BROLL_SUGGEST':
                if (this.executeBRollSuggest) this.executeBRollSuggest();
                break;
            case 'BATCH_EXPORT':
                if (this.executeBatchExport) this.executeBatchExport();
                break;
            case 'GRID_LAYOUT':
                if (this.executeGridLayout) this.executeGridLayout(parsed.cols, parsed.rows);
                break;
            case 'COUNTDOWN_TIMER':
                if (this.executeCountdownTimer) this.executeCountdownTimer(parsed.seconds);
                break;
            case 'QUICK_FILTER':
                if (this.executeQuickFilter) this.executeQuickFilter(parsed.filterType);
                break;
            case 'CINEMATIC_TITLE':
                if (this.executeCinematicTitle) this.executeCinematicTitle(parsed.text);
                break;
            case 'CHROMA_KEY':
                if (this.executeChromaKey) this.executeChromaKey();
                break;
            case 'AUTO_ZOOM':
                if (this.executeAutoZoom) this.executeAutoZoom(parsed.direction);
                break;
            case 'AUDIO_WAVEFORM':
                if (this.executeAudioWaveform) this.executeAudioWaveform();
                break;
            case 'FREEZE_FRAME':
                if (this.executeFreezeFrame) this.executeFreezeFrame();
                break;
            case 'EXPORT_XML':
                if (this.executeExportXML) this.executeExportXML();
                break;
            case 'BEAT_MATCH':
                if (this.executeBeatMatch) this.executeBeatMatch();
                break;
            case 'KARAOKE_SUBTITLES':
                if (this.executeKaraokeSubtitles) this.executeKaraokeSubtitles();
                break;
            case 'LOOP_CLIP':
                if (this.executeLoopClip) this.executeLoopClip(parsed.times);
                break;

            // ═══ Phase 14 ═══
            case 'PITCH_SHIFT':
                if (this.executePitchShift) this.executePitchShift(parsed.semitones);
                break;
            case 'COLOR_MATCH':
                if (this.executeColorMatch) this.executeColorMatch();
                break;
            case 'GIF_EXPORT':
                if (this.executeGifExport) this.executeGifExport();
                break;
            case 'SOCIAL_PRESET':
                if (this.executeSocialPreset) this.executeSocialPreset(parsed.platform);
                break;

            // ═══ Phase 15 ═══
            case 'CAMERA_SHAKE':
                if (this.executeCameraShake) this.executeCameraShake();
                break;
            case 'VIGNETTE_TOGGLE':
                if (this.executeVignette) this.executeVignette();
                break;
            case 'GLITCH_EFFECT':
                if (this.executeGlitchEffect) this.executeGlitchEffect();
                break;
            case 'BLUR_EFFECT':
                if (this.executeBlurEffect) this.executeBlurEffect(parsed.amount);
                break;

            // ═══ Phase 16 ═══
            case 'LENS_FLARE':
                if (this.executeLensFlare) this.executeLensFlare();
                break;
            case 'RAIN_OVERLAY':
                if (this.executeRainOverlay) this.executeRainOverlay();
                break;
            case 'SPARKLE_OVERLAY':
                if (this.executeSparkleOverlay) this.executeSparkleOverlay();
                break;
            case 'LIGHT_SWEEP':
                if (this.executeLightSweep) this.executeLightSweep();
                break;

            // ═══ Phase 17 ═══
            case 'TEXT_OUTLINE':
                if (this.executeTextOutline) this.executeTextOutline(parsed.color);
                break;
            case 'TEXT_SHADOW':
                if (this.executeTextShadow) this.executeTextShadow(parsed.strength);
                break;
            case 'TEXT_BOLD':
                if (this.executeToggleBold) this.executeToggleBold();
                break;
            case 'TEXT_SCALE':
                if (this.executeTextScale) this.executeTextScale(parsed.size);
                break;

            // ═══ Phase 18 ═══
            case 'WATERMARK':
                if (this.executeWatermark) this.executeWatermark(parsed.text);
                break;
            case 'LOGO_OVERLAY':
                if (this.executeLogoOverlay) this.executeLogoOverlay();
                break;
            case 'COPYRIGHT_STRIP':
                if (this.executeCopyrightStrip) this.executeCopyrightStrip();
                break;
            case 'BRAND_COLOR':
                if (this.executeBrandColor) this.executeBrandColor(parsed.color);
                break;

            // ═══ Phase 19 ═══
            case 'STORYBOARD':
                if (this.executeStoryboard) this.executeStoryboard();
                break;
            case 'CLEANUP_TIMELINE':
                if (this.executeCleanupTimeline) this.executeCleanupTimeline();
                break;
            case 'MOOD_MODE':
                if (this.executeMoodMode) this.executeMoodMode(parsed.mood);
                break;

            // ═══ Phase 20 ═══
            case 'SHOW_HELP':
                if (this.executeHelp) this.executeHelp();
                break;
            case 'SHOW_INFO':
                if (this.executeShowInfo) this.executeShowInfo();
                break;
            case 'SHOW_HISTORY':
                if (this.executeShowHistory) this.executeShowHistory();
                break;
            case 'RESET_EFFECTS':
                if (this.executeResetEffects) this.executeResetEffects();
                break;

            // ═══ Phase 21-30 ═══
            case 'SMART_TRANSITION':
                if (this.executeSmartTransition) this.executeSmartTransition(parsed.transType);
                break;
            case 'PIP_MODE':
                if (this.executePiP) this.executePiP(parsed.position);
                break;
            case 'MASK_SHAPE':
                if (this.executeMask) this.executeMask(parsed.shape);
                break;
            case 'FLIP':
                if (this.executeFlip) this.executeFlip(parsed.axis);
                break;
            case 'APPLY_LUT':
                if (this.executeApplyLUT) this.executeApplyLUT(parsed.lutName);
                break;
            case 'AUDIO_COMPRESS':
                if (this.executeAudioCompress) this.executeAudioCompress();
                break;
            case 'TEXT_ANIMATION':
                if (this.executeTextAnimation) this.executeTextAnimation(parsed.animName);
                break;
            case 'ADD_MARKER':
                if (this.executeAddLabeledMarker) this.executeAddLabeledMarker(parsed.label);
                break;
            case 'PROJECT_REPORT':
                if (this.executeProjectReport) this.executeProjectReport();
                break;

            // ═══ Phase 31-40 ═══
            case 'MOTION_BLUR':        if (this.executeMotionBlur) this.executeMotionBlur(parsed.amount); break;
            case 'STABILIZE':          if (this.executeStabilize) this.executeStabilize(); break;
            case 'AUTO_REFRAME':       if (this.executeAutoReframe) this.executeAutoReframe(parsed.ratio); break;
            case 'SPEED_PRESET':       if (this.executeSpeedPreset) this.executeSpeedPreset(parsed.preset); break;
            case 'EXPORT_SRT':         if (this.executeExportSRT) this.executeExportSRT(); break;
            case 'SAFE_ZONE':          if (this.executeSafeZone) this.executeSafeZone(); break;
            case 'FADE_ALL':           if (this.executeFadeAll) this.executeFadeAll(); break;
            case 'RENAME_CLIP':        if (this.executeRenameClip) this.executeRenameClip(parsed.name); break;

            // ═══ Phase 41-50 ═══
            case 'AUTO_COLOR_GRADE':   if (this.executeAutoColorGrade) this.executeAutoColorGrade(); break;
            case 'SMART_CROP':         if (this.executeSmartCrop) this.executeSmartCrop(); break;
            case 'FADE_TO_BLACK':      if (this.executeFadeToBlack) this.executeFadeToBlack(parsed.duration || 2); break;
            case 'FADE_FROM_BLACK':    if (this.executeFadeFromBlack) this.executeFadeFromBlack(parsed.duration || 2); break;
            case 'TIMESTAMP_OVERLAY':  if (this.executeTimestampOverlay) this.executeTimestampOverlay(); break;
            case 'LOOP_TOGGLE':        if (this.executeToggleLoop) this.executeToggleLoop(); break;
            case 'AUTO_BALANCE':       if (this.executeAutoBalance) this.executeAutoBalance(); break;

            // ═══ Phase 51-60 ═══
            case 'NEON_GLOW':         if (this.executeNeonGlow) this.executeNeonGlow(parsed.color); break;
            case 'VHS_EFFECT':        if (this.executeVHSEffect) this.executeVHSEffect(); break;
            case 'FILM_GRAIN':        if (this.executeFilmGrain) this.executeFilmGrain(parsed.intensity); break;
            case 'PIXELATE':          if (this.executePixelate) this.executePixelate(parsed.size); break;
            case 'SPLIT_SCREEN':      if (this.executeSplitScreen) this.executeSplitScreen(); break;
            case 'TRIM_SILENCE':      if (this.executeTrimSilence) this.executeTrimSilence(); break;
            case 'OPACITY_PULSE':     if (this.executeOpacityPulse) this.executeOpacityPulse(); break;
            case 'COLOR_TINT':        if (this.executeColorTint) this.executeColorTint(parsed.color); break;
            case 'EXPORT_WAV':        if (this.executeExportWAV) this.executeExportWAV(); break;
            case 'SMART_FILL_GAPS':   if (this.executeSmartFillGaps) this.executeSmartFillGaps(); break;

            // ═══ Phase 61-70 ═══
            case 'SAVE_TEMPLATE':     if (this.executeSaveTemplate) this.executeSaveTemplate(parsed.name); break;
            case 'LOAD_TEMPLATE':     if (this.executeLoadTemplate) this.executeLoadTemplate(parsed.name); break;
            case 'LIST_TEMPLATES':    if (this.executeListTemplates) this.executeListTemplates(); break;
            case 'EXPORT_JSON':       if (this.executeExportJSON) this.executeExportJSON(); break;
            case 'IMPORT_JSON':       if (this.executeImportJSON) this.executeImportJSON(); break;
            case 'MEME_TEXT':         if (this.executeMemeText) this.executeMemeText(parsed.top, parsed.bottom); break;
            case 'CONTENT_ANALYSIS':  if (this.executeContentAnalysis) this.executeContentAnalysis(); break;
            case 'ADD_BG_MUSIC':      if (this.executeAddBGMusic) this.executeAddBGMusic(parsed.mood); break;
            case 'PREVIEW_THUMBNAIL': if (this.executePreviewThumbnail) this.executePreviewThumbnail(); break;
            case 'NORMALIZE_AUDIO':   if (this.executeNormalizeAudio) this.executeNormalizeAudio(); break;

            // ═══ Phase 71-80 ═══
            case 'ADD_BORDER':        if (this.executeAddBorder) this.executeAddBorder(parsed.color, parsed.thickness); break;
            case 'RADIAL_BLUR':       if (this.executeRadialBlur) this.executeRadialBlur(); break;
            case 'SLOW_MO_HIGHLIGHT': if (this.executeSlowMoHighlight) this.executeSlowMoHighlight(); break;
            case 'RENDER_PREVIEW':    if (this.executeRenderPreview) this.executeRenderPreview(); break;
            case 'BATCH_COLOR_GRADE': if (this.executeBatchColorGrade) this.executeBatchColorGrade(parsed.preset); break;
            case 'JUMP_CUTS':         if (this.executeJumpCuts) this.executeJumpCuts(parsed.intervalSec); break;
            case 'INTRO_OUTRO':       if (this.executeAddIntroOutro) this.executeAddIntroOutro(parsed.introOrOutro); break;
            case 'DUP_TO_NEW_TRACK':  if (this.executeDuplicateToNewTrack) this.executeDuplicateToNewTrack(); break;
            case 'REDUCE_FPS':        if (this.executeReduceFPS) this.executeReduceFPS(parsed.targetFPS); break;
            case 'ADD_CHAPTER_CLIP':  if (this.executeAddChapterClip) this.executeAddChapterClip(parsed.title); break;

            // ═══ Phase 81-100 ═══
            case 'HDR_LOOK':           if (this.executeHDRLook) this.executeHDRLook(); break;
            case 'DEHAZE':             if (this.executeDehaze) this.executeDehaze(); break;
            case 'SKIN_SMOOTH':        if (this.executeSkinSmooth) this.executeSkinSmooth(); break;
            case 'LONG_SHADOW':        if (this.executeLongShadow) this.executeLongShadow(); break;
            case 'DUOTONE':            if (this.executeDuotone) this.executeDuotone(parsed.color1, parsed.color2); break;
            case 'TILT_3D':            if (this.executeTilt3D) this.executeTilt3D(parsed.tiltX, parsed.tiltY); break;
            case 'EARTHQUAKE':         if (this.executeEarthquake) this.executeEarthquake(); break;
            case 'TIKTOK_SUBTITLES':   if (this.executeTikTokSubtitles) this.executeTikTokSubtitles(); break;
            case 'END_SCREEN':         if (this.executeEndScreen) this.executeEndScreen(); break;
            case 'AUTO_CHAPTERS':      if (this.executeAutoChapters) this.executeAutoChapters(); break;
            case 'STORY_MODE':         if (this.executeStoryMode) this.executeStoryMode(); break;
            case 'ADD_SFX':            if (this.executeSFX) this.executeSFX(parsed.sfxName); break;
            case 'SMART_EXPORT':       if (this.executeSmartExport) this.executeSmartExport(parsed.platform); break;
            case 'PROJECT_WIZARD':     if (this.executeProjectWizard) this.executeProjectWizard(); break;
            case 'REVERB':             if (this.executeReverb) this.executeReverb(parsed.reverbType); break;
            case 'ZOOM_TO_FACE':       if (this.executeZoomToFace) this.executeZoomToFace(); break;
            case 'MULTI_LANG_CAPTIONS':if (this.executeMultiLangCaptions) this.executeMultiLangCaptions(parsed.lang); break;

            default:
                this.log("❌ Unknown Command Type");

        }
        
        this.clearCommand();

    };

    // ─────────────────────────────────────────────────────────────
    // Helper: call after every mutation so React Timeline updates
    // ─────────────────────────────────────────────────────────────
    window.EditorApp.prototype._cmdFinalize = function() {
        if (this.refreshProjectTopology) this.refreshProjectTopology(); // re-numbers clips/tracks
        if (this.renderTracks) this.renderTracks();                     // marks canvas dirty
        if (this.syncOverlays) this.syncOverlays();                     // update canvas overlays
        this.requestRedraw();                                           // canvas redraw
        this.commitStateToReact();                                             // ← Zustand → React re-render
    };

    // ─────────────────────────────────────────────────────────────
    // PROPERTY UPDATE (scale, opacity, rotation, scaleX, scaleY, size)
    // ─────────────────────────────────────────────────────────────
    window.EditorApp.prototype.executePropertyCommand = function(trackName: string, clipIndex: number, property: string, value: any) {
        const track = this.tracks.find((t: any) => t.name === trackName);
        if (!track) { this.log(`❌ Track ${trackName} not found.`); return; }

        const sortedClips = [...track.clips].sort((a, b) => a.start - b.start);
        
        if (clipIndex < 1 || clipIndex > sortedClips.length) {
            this.log(`⚠️ Invalid Clip Index: ${clipIndex}. Track has ${sortedClips.length} clips.`);
            return;
        }

        const targetClip = sortedClips[clipIndex - 1]; 
        this.saveState();

        // VISUAL FEEDBACK
        if ((window as any).useEditorStore) {
            (window as any).useEditorStore.getState().setHighlightedClip(targetClip.id);
            setTimeout(() => {
                if ((window as any).useEditorStore.getState().highlightedClipId === targetClip.id) {
                    (window as any).useEditorStore.getState().setHighlightedClip(null);
                }
            }, 1000);
        }

        if (typeof (window as any).ensureProProperties === 'function') {
            (window as any).ensureProProperties(targetClip);
        } else {
            if (!targetClip.properties) targetClip.properties = { 
                scale: 100, positionX: 0, positionY: 0, rotation: 0, opacity: 100 
            };
        }

        if (property === 'scale') targetClip.properties.scale = value;
        else if (property === 'scaleX') targetClip.properties.scaleX = value;
        else if (property === 'scaleY') targetClip.properties.scaleY = value;
        else if (property === 'opacity') targetClip.properties.opacity = Math.max(0, Math.min(100, value));
        else if (property === 'rotation') targetClip.properties.rotation = value;
        else if (property === 'size') {
            targetClip.properties.forcedWidth = value.width;
            targetClip.properties.forcedHeight = value.height;
            targetClip.properties.scale = 100;
            targetClip.properties.scaleX = 100;
            targetClip.properties.scaleY = 100;
            this.log(`✨ Squeezed ${targetClip.name} to ${value.width}x${value.height}px`);
            this._cmdFinalize();
            return;
        }

        this.log(`✨ Set ${property} to ${value} on ${targetClip.name}`);
        this._cmdFinalize();

        // BUG #2 FIX: always refresh EffectControls regardless of selection.
        // CMD targets clips by index, not by selection — the panel should always reflect the change.
        if (typeof this.updateEffectControls === 'function') {
            this.updateEffectControls();
        }
    };

    // ─────────────────────────────────────────────────────────────
    // TRACK CLEAR  (dv1 → clears all clips on track V1)
    // FIX: added rebuildTree() + _cmdFinalize()
    // ─────────────────────────────────────────────────────────────
    window.EditorApp.prototype.executeTrackClear = function(trackName: string) {
        const track = this.tracks.find((t: any) => t.name === trackName);
        if (!track) { this.log(`❌ Track ${trackName} not found.`); return; }

        if (track.clips.length === 0) {
            this.log(`⚠️ Track ${trackName} is already empty.`);
            return;
        }

        this.saveState();
        const count = track.clips.length;
        track.clips = [];
        track.rebuildTree(); // FIX #5: keep IntervalTree in sync

        this.log(`🗑️ Cleared ${count} clips from ${trackName}`);
        this._cmdFinalize(); // FIX #1: sync Zustand + topology
    };

    // ─────────────────────────────────────────────────────────────
    // RANGE DELETE  (d10s:20sv1)
    // FIX: added _cmdFinalize()
    // ─────────────────────────────────────────────────────────────
    window.EditorApp.prototype.executeRangeDelete = function(startTime: number, endTime: number, trackName: string) {
        const track = this.tracks.find((t: any) => t.name === trackName);
        if (!track) { this.log(`❌ Track ${trackName} not found.`); return; }

        this.saveState(); 

        const originalTime = this.currentTime;

        // Split at end first, then at start (order matters)
        this.currentTime = endTime;
        let clipsAtEnd = track.getClipsAtTime(endTime);
        if (clipsAtEnd.length > 0) {
            this.performSplit(clipsAtEnd[0], track, { simulated: true });
        }

        this.currentTime = startTime;
        let clipsAtStart = track.getClipsAtTime(startTime);
        if (clipsAtStart.length > 0) {
            this.performSplit(clipsAtStart[0], track, { simulated: true });
        }

        this.currentTime = originalTime; // restore playhead

        const initialCount = track.clips.length;
        track.clips = track.clips.filter((c: any) => {
            const midPoint = c.start + (c.duration / 2);
            const shouldDelete = midPoint >= startTime && midPoint < endTime;
            return !shouldDelete;
        });
        
        const deletedCount = initialCount - track.clips.length;
        track.rebuildTree(); // FIX: keep IntervalTree in sync

        if (deletedCount === 0) {
            this.log(`⚠️ No clips found between ${this.formatTime(startTime)} and ${this.formatTime(endTime)}`);
            return;
        }
        
        this.log(`🗑️ Deleted ${deletedCount} segments from ${this.formatTime(startTime)} to ${this.formatTime(endTime)}`);
        this._cmdFinalize(); // FIX #1 + #4
    };

    // ─────────────────────────────────────────────────────────────
    // CLIP INDEX DELETE  (d2v1 → delete clip #2 on V1)
    // FIX: added _cmdFinalize()
    // ─────────────────────────────────────────────────────────────
    window.EditorApp.prototype.executeClipIndexDelete = function(index: number, trackName: string) {
        const track = this.tracks.find((t: any) => t.name === trackName);
        if (!track) { this.log(`❌ Track ${trackName} not found.`); return; }

        const sortedClips = [...track.clips].sort((a, b) => a.start - b.start);
        
        if (index < 1 || index > sortedClips.length) {
            this.log(`⚠️ Invalid Clip Index: ${index}. Track has ${sortedClips.length} clips.`);
            return;
        }

        const clipToDelete = sortedClips[index - 1]; 
        this.saveState();
        
        track.clips = track.clips.filter((c: any) => c.id !== clipToDelete.id);
        track.rebuildTree(); // FIX: keep IntervalTree in sync
        
        this.log(`🗑️ Deleted Clip #${index} from ${trackName}`);
        this._cmdFinalize(); // FIX #1 + #4
    };

    // ─────────────────────────────────────────────────────────────
    // UPLOAD  (u10sv1, u10s:20sv1)
    // FIX: added _cmdFinalize() after inserting clip
    // ─────────────────────────────────────────────────────────────
    window.EditorApp.prototype.executeUploadCommand = function(startTime: number, customDuration: number | null, trackName: string) {
        const track = this.tracks.find((t: any) => t.name === trackName);
        if (!track) {
            this.log(`❌ Track ${trackName} not found.`);
            return;
        }

        this.log(`📂 Select file for ${trackName} at ${this.formatTime(startTime)}...`);

        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*,video/*,audio/*';
        
        input.onchange = (e: any) => {
            if (e.target.files.length === 0) return;
            const file = e.target.files[0];
            const url = URL.createObjectURL(file);
            const type = file.type.startsWith('image') ? 'image' : (file.type.startsWith('audio') ? 'audio' : 'video');
            
            const assetId = `u_asset_${Date.now()}`;
            const newAsset = { id: assetId, name: file.name, type: type, src: url };
            
            // Add to legacy engine
            this.assetsList.push(newAsset);
            
            // Add to Zustand Store so AssetsPanel re-renders instantly
            if ((window as any).useEditorStore) {
                (window as any).useEditorStore.getState().addAsset(newAsset);
            }


            const insertClip = (finalDuration: number) => {
                this.saveState();

                const clip = new (window as any).Clip(`u_clip_${Date.now()}`, file.name, startTime, finalDuration, type, url);
                track.addClip(clip); // addClip already calls rebuildTree
                if (this.resolveCollisions) this.resolveCollisions(track.id, clip);
                
                if (type === 'video') {
                    const audioTrack = this.tracks.find((t: any) => t.type === 'audio');
                    if (audioTrack) {
                        const aClip = new (window as any).Clip(`u_aclip_${Date.now()}`, `${file.name} [Audio]`, startTime, finalDuration, 'audio', url);
                        audioTrack.addClip(aClip); // addClip already calls rebuildTree
                        if (this.resolveCollisions) this.resolveCollisions(audioTrack.id, aClip);
                    }
                }
                this.log(`✅ Added ${file.name} (Duration: ${finalDuration.toFixed(1)}s)`);
                this._cmdFinalize(); // FIX #1: sync Zustand → React timeline updates
            };

            if (customDuration !== null) {
                insertClip(customDuration);
            } else {
                if (type === 'image') {
                    insertClip(5); 
                } else {
                    const mediaEl = document.createElement(type === 'audio' ? 'audio' : 'video');
                    mediaEl.preload = 'metadata';
                    mediaEl.src = url;
                    mediaEl.onloadedmetadata = () => {
                        let dur = mediaEl.duration;
                        if (!dur || isNaN(dur)) dur = 10; 
                        insertClip(dur);
                    };
                    mediaEl.onerror = () => {
                        this.log("⚠️ Failed to read duration, using 10s default.");
                        insertClip(10);
                    };
                }
            }
        };
        input.click();
    };

    // ─────────────────────────────────────────────────────────────
    // CUT  (c20sv1, c1m30sv1)
    // FIX #2: removed currentTime mutation side-effect.
    //   Now we temporarily set currentTime, call performSplit with
    //   simulated=true, then restore. performSplit reads this.currentTime
    //   when simulated — this is intentional and correct.
    //   After split, _cmdFinalize() syncs everything.
    // ─────────────────────────────────────────────────────────────
    window.EditorApp.prototype.executeCutCommand = function(time: number, trackName: string) {
        const track = this.tracks.find((t: any) => t.name === trackName);
        if (!track) { this.log(`❌ Track ${trackName} not found.`); return; }

        // Re-query AFTER potential topology changes (names may have shifted)
        track.rebuildTree();
        const clips = track.getClipsAtTime(time);
        if (clips.length === 0) { this.log(`⚠️ No clip at ${this.formatTime(time)} on ${trackName}`); return; }

        const clipToCut = clips[0];

        this.saveState();
        const splitResult = this.performSplit(clipToCut, track, { simulated: true });

        // VISUAL FEEDBACK
        if (splitResult && splitResult.length > 0 && (window as any).useEditorStore) {
            const firstPartId = splitResult[0].id;
            (window as any).useEditorStore.getState().setHighlightedClip(firstPartId);
            setTimeout(() => {
                if ((window as any).useEditorStore.getState().highlightedClipId === firstPartId) {
                    (window as any).useEditorStore.getState().setHighlightedClip(null);
                }
            }, 1000);
        }

        this.log(`✂️ Cut ${trackName} at ${this.formatTime(time)}`);
        this.updatePlayheadPosition();
    };

    // ─────────────────────────────────────────────────────────────
    // MOVE  (mv100x200y1v1)
    // FIX #6: search by topology name first, then fallback to clip.name
    // ─────────────────────────────────────────────────────────────
    window.EditorApp.prototype.executeMoveCommand = function(paramsStr: string) {
        // Target is like "1v1" at end of string (clipIndex + trackName)
        const clipNameMatch = paramsStr.match(/(\d+)([vta]\d+)$/i);
        if (!clipNameMatch) { this.log("❌ Invalid Move Command: Target clip not found."); return; }
        
        const clipIndex = parseInt(clipNameMatch[1]);       // e.g. 1
        const targetTrackName = clipNameMatch[2].toUpperCase(); // e.g. V1
        const transformsStr = paramsStr.substring(0, paramsStr.length - clipNameMatch[0].length);

        const track = this.tracks.find((t: any) => t.name === targetTrackName);
        if (!track) { this.log(`❌ Track ${targetTrackName} not found.`); return; }

        // FIX #6: find by sorted index (topology), not by .name string
        const sortedClips = [...track.clips].sort((a: any, b: any) => a.start - b.start);
        if (clipIndex < 1 || clipIndex > sortedClips.length) {
            this.log(`⚠️ Invalid clip index ${clipIndex}. Track ${targetTrackName} has ${sortedClips.length} clips.`);
            return;
        }
        const targetClip = sortedClips[clipIndex - 1];

        if (typeof (window as any).ensureProProperties === 'function') {
            (window as any).ensureProProperties(targetClip);
        }

        const isAiMode = targetClip.aiSegmentation && targetClip.aiSegmentation.enabled;

        const resolveVal = (valStr: string, axis: string) => {
            if (!valStr) return null;
            if (!isNaN(valStr as any)) return parseInt(valStr);
            if (axis === 'x') {
                if (valStr === 'l') return -800;
                if (valStr === 'r') return 800;
                if (valStr === 'c') return 0;
            }
            if (axis === 'y') {
                if (valStr === 'u') return -400;
                if (valStr === 'd') return 400;
                if (valStr === 'c') return 0;
            }
            return null;
        };
        
        const xMatch = transformsStr.match(/([^xy]+)x/);
        const yMatch = transformsStr.match(/([^xy]+)y/);

        let changed = false;
        
        if (!targetClip.properties) targetClip.properties = { scale: 100, positionX: 0, positionY: 0 };

        if (xMatch || yMatch) {
            this.saveState(); 
        
            // VISUAL FEEDBACK
            if ((window as any).useEditorStore) {
                (window as any).useEditorStore.getState().setHighlightedClip(targetClip.id);
                setTimeout(() => {
                    if ((window as any).useEditorStore.getState().highlightedClipId === targetClip.id) {
                        (window as any).useEditorStore.getState().setHighlightedClip(null);
                    }
                }, 1000);
            }
        }

        if (xMatch) {
            const val = resolveVal(xMatch[1], 'x');
            if (val !== null) { 
                if (isAiMode && targetClip.sandwich) targetClip.sandwich.offsetX = val;
                else targetClip.properties.positionX = val;
                changed = true; 
            }
        }
        
        if (yMatch) {
            const val = resolveVal(yMatch[1], 'y');
            if (val !== null) { 
                if (isAiMode && targetClip.sandwich) targetClip.sandwich.offsetY = val;
                else targetClip.properties.positionY = val; 
                changed = true; 
            }
        }

        if (changed) {
            this.log(`✅ Moved clip #${clipIndex} on ${targetTrackName} (${isAiMode ? 'Sandwich' : 'Standard'})`);
            this._cmdFinalize(); // FIX #1
            if (typeof this.updateEffectControls === 'function') this.updateEffectControls();
        } else {
            this.log(`⚠️ No valid moves in "${transformsStr}"`);
        }
    };

    // ─────────────────────────────────────────────────────────────
    // REMOVE SILENCE  (rmsa1ev1)
    // FIX: added _cmdFinalize() at end
    // ─────────────────────────────────────────────────────────────
    window.EditorApp.prototype.executeRemoveSilenceCommand = async function(sourceTrackName: string, exceptionTracks: string[]) {
        const track = this.tracks.find((t: any) => t.name === sourceTrackName);
        if (!track) { this.log(`❌ Track ${sourceTrackName} not found.`); return; }
        if (track.type !== 'audio' && track.type !== 'video') { this.log("❌ Source must be audio/video."); return; }

        const normalizedExceptions = exceptionTracks.map(t => t.toUpperCase());
        this.log(`🔍 Analyzing silence on ${sourceTrackName}...`);
        
        const intervals = await this.detectSilenceIntervals(track);
        
        if (intervals.length === 0) {
            this.log("⚠️ No silence detected.");
            return;
        }
        
        this.log(`✂️ Found ${intervals.length} silent gaps. Removing...`);
        
        intervals.sort((a: any, b: any) => b.start - a.start);
        
        this.saveState();
        
        let deletedCount = 0;
        
        for (const interval of intervals) {
            this.executeMultiTrackRippleDelete(interval.start, interval.end, normalizedExceptions);
            deletedCount++;
        }
        
        this.log(`✅ Removed ${deletedCount} gaps. Timeline compacted.`);
        this._cmdFinalize(); // FIX #1
    };

    // ─────────────────────────────────────────────────────────────
    // DETECT SILENCE INTERVALS  (helper for removeRemoveSilenceCommand)
    // ─────────────────────────────────────────────────────────────
    window.EditorApp.prototype.detectSilenceIntervals = async function(track: any) {
        const intervals = [];
        const SILENCE_THRESH = 0.02; 
        const MIN_DURATION = 0.5; 
        
        const sortedClips = [...track.clips].sort((a, b) => a.start - b.start);
        
        for (const clip of sortedClips) {
            let buffer = this.sharedAudioBuffers ? this.sharedAudioBuffers.get(clip.src) : null;
            
            if (!buffer) {
                 try {
                    const resp = await fetch(clip.src);
                    const ab = await resp.arrayBuffer();
                    if (this.audioCtxForAnalysis) {
                        buffer = await this.audioCtxForAnalysis.decodeAudioData(ab);
                        if (this.sharedAudioBuffers) this.sharedAudioBuffers.set(clip.src, buffer);
                    } else {
                        console.warn("Audio Context not ready.");
                        continue;
                    }
                 } catch(e) {
                     console.warn("Skipping clip, cannot load audio", clip.name);
                     continue;
                 }
            }
            
            const data = buffer.getChannelData(0);
            const sampleRate = buffer.sampleRate;
            
            const clipStart = clip.start;
            const clipDur = clip.duration;
            const sourceIn = clip.sourceIn || 0;
            
            const startSample = Math.floor(sourceIn * sampleRate);
            const endSample = Math.floor((sourceIn + clipDur) * sampleRate);
            
            let isSilent = false;
            let silenceStartSample = -1;
            const step = 1000; 
            
            for (let i = startSample; i < endSample; i += step) {
                 let localMax = 0;
                 for (let j = 0; j < step && (i + j) < endSample; j++) {
                     const val = Math.abs(data[i + j]);
                     if (val > localMax) localMax = val;
                 }
                 
                 if (localMax < SILENCE_THRESH) {
                     if (!isSilent) {
                         isSilent = true;
                         silenceStartSample = i;
                     }
                 } else {
                     if (isSilent) {
                         const durationSec = (i - silenceStartSample) / sampleRate;
                         if (durationSec >= MIN_DURATION) {
                             const relStart = (silenceStartSample - startSample) / sampleRate;
                             const relEnd = (i - startSample) / sampleRate;
                             intervals.push({
                                 start: clipStart + relStart,
                                 end: clipStart + relEnd
                             });
                         }
                         isSilent = false;
                     }
                 }
            }
            
            if (isSilent) {
                 const i = endSample;
                 const durationSec = (i - silenceStartSample) / sampleRate;
                 if (durationSec >= MIN_DURATION) {
                     const relStart = (silenceStartSample - startSample) / sampleRate;
                     const relEnd = (i - startSample) / sampleRate;
                     intervals.push({
                         start: clipStart + relStart,
                         end: clipStart + relEnd
                     });
                 }
            }
        }
        
        return intervals;
    };

    // ─────────────────────────────────────────────────────────────
    // MULTI-TRACK RIPPLE DELETE  (helper for Remove Silence)
    // FIX: added rebuildTree() per track after mutation
    // ─────────────────────────────────────────────────────────────
    window.EditorApp.prototype.executeMultiTrackRippleDelete = function(start: number, end: number, exceptions: string[]) {
        const duration = end - start;
        
        this.tracks.forEach((track: any) => {
            if (exceptions.includes(track.name.toUpperCase())) return;
            
            let clipsAtEnd = track.getClipsAtTime(end);
            if (clipsAtEnd.length > 0) this.performSplit(clipsAtEnd[0], track, { simulated: true });
            
            let clipsAtStart = track.getClipsAtTime(start);
            if (clipsAtStart.length > 0) this.performSplit(clipsAtStart[0], track, { simulated: true });
            
            const EPSILON = 0.001;
            track.clips = track.clips.filter((c: any) => {
                 const cMid = c.start + (c.duration / 2);
                 return !(cMid > start - EPSILON && cMid < end + EPSILON);
            });
            
            track.clips.forEach((c: any) => {
                if (c.start >= end - EPSILON) {
                    c.start -= duration;
                }
            });

            track.rebuildTree(); // FIX: keep IntervalTree in sync after mutation
        });
    };
};
