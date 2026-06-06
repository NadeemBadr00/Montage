// @ts-nocheck
// pro_features.ts — barrel: orchestrates all pro feature injectors
import { injectSandwichCore } from './sandwich_clip_core';
import { injectEffectsPanel } from './effects_panel_ui';
import { injectKeyframesTransitions } from './keyframes_transitions_logo';

export const injectProFeatures = () => {
  injectSandwichCore();
  injectEffectsPanel();
  injectKeyframesTransitions();
};

// Auto-invoke so that `import './features/pro_features'` in main.ts
// continues to work as a side-effect import with no changes required.
injectProFeatures();
