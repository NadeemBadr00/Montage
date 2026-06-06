// @ts-nocheck
// plan_gating.ts — Feature Gating Engine
// Runs in the legacy engine context. Checks user plan and blocks/allows features.

// ─────────────────────────────────────────────────────────────────────────────
// PLAN DEFINITIONS
// ─────────────────────────────────────────────────────────────────────────────

export const PLAN_LEVELS: Record<string, number> = {
  free: 0,
  pro: 1,
  ultra: 2,
};

export const FEATURE_GATES = {
  // Free features (always available)
  BASIC_EDIT:         { minPlan: 'free',  label: 'Basic Editing' },
  EXPORT_1080P:       { minPlan: 'free',  label: '1080p Export' },
  SRT_IMPORT:         { minPlan: 'free',  label: 'SRT Import' },
  AI_CHAT:            { minPlan: 'free',  label: 'AI Assistant' },
  BASIC_TRANSITIONS:  { minPlan: 'free',  label: 'Basic Transitions' },
  TEXT_OVERLAY:       { minPlan: 'free',  label: 'Text Overlays' },
  BASIC_FILTERS:      { minPlan: 'free',  label: 'Basic Filters' },

  // Pro features ($5/mo)
  EXPORT_4K:          { minPlan: 'pro',   label: '4K Export' },
  UNLIMITED_PROJECTS: { minPlan: 'pro',   label: 'Unlimited Projects' },
  BACKGROUND_REMOVE:  { minPlan: 'pro',   label: 'Background Remover' },
  VIDEO_ANALYSIS:     { minPlan: 'pro',   label: 'AI Video Analysis' },
  CHROMA_KEY:         { minPlan: 'pro',   label: 'Chroma Key (Green Screen)' },
  CUSTOM_FONTS:       { minPlan: 'pro',   label: 'Custom Font Upload' },
  BATCH_EXPORT:       { minPlan: 'pro',   label: 'Batch Export' },
  SPEED_RAMP:         { minPlan: 'pro',   label: 'Speed Ramp' },
  MOTION_BLUR:        { minPlan: 'pro',   label: 'Motion Blur' },
  COLOR_MATCH:        { minPlan: 'pro',   label: 'Color Match' },

  // Ultra features ($10/mo)
  AUTO_MONTAGE:       { minPlan: 'ultra', label: 'Auto Montage AI' },
  AUTO_CAPTIONS:      { minPlan: 'ultra', label: 'AI Auto Captions' },
  BEAT_DETECTION:     { minPlan: 'ultra', label: 'Beat Detection & Sync' },
  SCENE_DETECTION:    { minPlan: 'ultra', label: 'Smart Scene Detection' },
  VERSION_HISTORY:    { minPlan: 'ultra', label: 'Version History' },
  AI_VOICEOVER:       { minPlan: 'ultra', label: 'AI Voiceover' },
  STYLE_TRANSFER:     { minPlan: 'ultra', label: 'AI Style Transfer' },
  AUTO_COLOR_GRADE:   { minPlan: 'ultra', label: 'Auto Color Grading' },
  EXPORT_GIF:         { minPlan: 'ultra', label: 'GIF Export' },
  EXPORT_WAV:         { minPlan: 'ultra', label: 'WAV Audio Export' },
  EXPORT_XML:         { minPlan: 'ultra', label: 'FCPXML Export' },
  LOGO_REMOVE:        { minPlan: 'ultra', label: 'Logo / Object Remover' },
} as const;

export type FeatureKey = keyof typeof FEATURE_GATES;

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Get the currently active plan from Zustand store or localStorage.
 */
export function getActivePlan(): string {
  try {
    const stored = JSON.parse(localStorage.getItem('p43_user') || 'null');
    if (!stored) return 'free';
    const plan = stored.plan || 'free';
    const expiresAt = stored.planExpiresAt;
    // Check if plan is actually active
    if (plan !== 'free' && (!expiresAt || expiresAt < Date.now())) {
      return 'free'; // Expired — treat as free
    }
    return plan;
  } catch {
    return 'free';
  }
}

/**
 * Check if a feature is allowed for the current user's plan.
 */
export function canUseFeature(featureKey: FeatureKey): boolean {
  const gate = FEATURE_GATES[featureKey];
  if (!gate) return true; // Unknown feature = allow (fail open)
  const currentLevel = PLAN_LEVELS[getActivePlan()] ?? 0;
  const requiredLevel = PLAN_LEVELS[gate.minPlan] ?? 0;
  return currentLevel >= requiredLevel;
}

/**
 * Show the upgrade prompt in the editor.
 */
export function showUpgradePrompt(featureKey: FeatureKey): void {
  const gate = FEATURE_GATES[featureKey];
  const requiredPlan = gate?.minPlan || 'pro';
  const featureLabel = gate?.label || featureKey;

  // Dispatch a custom event that React can listen to
  window.dispatchEvent(new CustomEvent('ai4m:upgrade-required', {
    detail: { feature: featureLabel, requiredPlan }
  }));
}

/**
 * Gate a feature: if allowed → run fn, else → show upgrade prompt.
 * Returns true if allowed, false if blocked.
 */
export function withPlanGate(featureKey: FeatureKey, fn: () => void): boolean {
  if (canUseFeature(featureKey)) {
    fn();
    return true;
  }
  showUpgradePrompt(featureKey);
  return false;
}
