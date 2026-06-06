// @ts-nocheck
// plan_gating_engine.ts — Injects plan checking into EditorApp prototype
// Called from main.ts to apply gates to all gated commands

import { canUseFeature, showUpgradePrompt, getActivePlan, FEATURE_GATES, type FeatureKey } from './plan_gating';

export function injectPlanGating() {
    if (!window.EditorApp?.prototype) return;

    // ─────────────────────────────────────────────────────────────
    // Core gate method — used by all gated operations
    // ─────────────────────────────────────────────────────────────
    window.EditorApp.prototype.checkFeature = function(featureKey: FeatureKey): boolean {
        if (canUseFeature(featureKey)) return true;
        const gate = FEATURE_GATES[featureKey];
        this.log(`🔒 "${gate?.label || featureKey}" يتطلب خطة ${gate?.minPlan?.toUpperCase() || 'PRO'}.`);
        this.log(`⚡ يمكن الترقية من /pricing لفتح هذه الميزة.`);
        showUpgradePrompt(featureKey);
        return false;
    };

    // ─────────────────────────────────────────────────────────────
    // Wrap gated methods — preserves original functionality
    // ─────────────────────────────────────────────────────────────
    function gateMethod(proto: any, methodName: string, featureKey: FeatureKey) {
        const original = proto[methodName];
        if (!original || typeof original !== 'function') return;
        proto[methodName] = function(...args: any[]) {
            if (!this.checkFeature(featureKey)) return;
            return original.apply(this, args);
        };
    }

    const p = window.EditorApp.prototype;

    // ── Ultra features ──────────────────────────────────────────
    gateMethod(p, 'executeAutoMontage',       'AUTO_MONTAGE');
    gateMethod(p, 'runAutoMontage',            'AUTO_MONTAGE');
    gateMethod(p, 'executeAutoCaption',        'AUTO_CAPTIONS');
    gateMethod(p, 'executeBeatDetection',      'BEAT_DETECTION');
    gateMethod(p, 'executeBeatSync',           'BEAT_DETECTION');
    gateMethod(p, 'executeSceneDetection',     'SCENE_DETECTION');
    gateMethod(p, 'saveVersion',               'VERSION_HISTORY');
    gateMethod(p, 'listVersions',              'VERSION_HISTORY');
    gateMethod(p, 'restoreVersion',            'VERSION_HISTORY');
    gateMethod(p, 'executeVoiceover',          'AI_VOICEOVER');
    gateMethod(p, 'executeAutoColorGrade',     'AUTO_COLOR_GRADE');
    gateMethod(p, 'executeGifExport',          'EXPORT_GIF');
    gateMethod(p, 'executeExportWAV',          'EXPORT_WAV');
    gateMethod(p, 'executeExportXML',          'EXPORT_XML');
    gateMethod(p, 'downloadXML',              'EXPORT_XML');

    // ── Pro features ────────────────────────────────────────────
    gateMethod(p, 'loadCustomFont',            'CUSTOM_FONTS');
    gateMethod(p, 'executeChromaKey',          'CHROMA_KEY');
    gateMethod(p, 'executeMotionBlur',         'MOTION_BLUR');
    gateMethod(p, 'executeColorMatch',         'COLOR_MATCH');
    gateMethod(p, 'executeBatchExport',        'BATCH_EXPORT');
    gateMethod(p, 'executeSpeedRamp',          'SPEED_RAMP');

    // ── Export gating ───────────────────────────────────────────
    // Allow 1080p for free, require Pro for 4K
    const originalExport = p.exportVideoClientSide;
    if (originalExport) {
        p.exportVideoClientSide = function(options: any) {
            const is4K = options?.height > 1080 || options?.width > 1920 ||
                         options?.quality === '4k' || options?.resolution === '4k';
            if (is4K && !this.checkFeature('EXPORT_4K')) return;
            return originalExport.call(this, options);
        };
    }

    console.log(`[PlanGating] ✅ Injected — Current plan: ${getActivePlan()}`);
}
