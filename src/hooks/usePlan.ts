import { useCallback } from 'react';
import { useAuth } from './useAuth';
import { canUseFeature, showUpgradePrompt, getActivePlan, type FeatureKey } from '../editor-engine/features/plan_gating';

export type { FeatureKey };

/**
 * Hook to check plan access and trigger upgrade prompts.
 *
 * Usage:
 *   const { can, gate } = usePlan();
 *   if (can('AUTO_MONTAGE')) { ... }
 *   gate('EXPORT_4K', () => doExport4K());
 */
export function usePlan() {
  const { userData } = useAuth();

  const effectivePlan = userData
    ? (() => {
        const plan = userData.plan ?? 'free';
        const expiresAt = userData.planExpiresAt;
        if (plan !== 'free' && (!expiresAt || expiresAt < Date.now())) return 'free';
        return plan;
      })()
    : 'free';

  const isPro   = effectivePlan === 'pro' || effectivePlan === 'ultra';
  const isUltra = effectivePlan === 'ultra';
  const isFree  = effectivePlan === 'free';

  const daysLeft = userData?.planExpiresAt
    ? Math.max(0, Math.ceil((userData.planExpiresAt - Date.now()) / 86400000))
    : null;

  /** Check if user can use a feature (returns boolean) */
  const can = useCallback((feature: FeatureKey): boolean => {
    return canUseFeature(feature);
  }, [effectivePlan]);

  /**
   * Gate a feature: run fn if allowed, show upgrade modal if blocked.
   * Returns true if allowed.
   */
  const gate = useCallback((feature: FeatureKey, fn: () => void): boolean => {
    if (canUseFeature(feature)) {
      fn();
      return true;
    }
    showUpgradePrompt(feature);
    return false;
  }, [effectivePlan]);

  /**
   * Show upgrade prompt without running any function.
   */
  const requireUpgrade = useCallback((feature: FeatureKey) => {
    showUpgradePrompt(feature);
  }, []);

  return {
    plan: effectivePlan as 'free' | 'pro' | 'ultra',
    isPro,
    isUltra,
    isFree,
    daysLeft,
    can,
    gate,
    requireUpgrade,
  };
}
