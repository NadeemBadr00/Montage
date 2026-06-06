// @ts-nocheck
// actions.ts — barrel: orchestrates all action injectors
import { injectActionsCore } from './actions-core';
import { injectActionsClipFx } from './actions-clip-fx';
import { injectActionsColor } from './actions-color';
import { injectActionsTransitions } from './actions-transitions';
import { injectActionsPhase4 } from './actions-phase4';
import { injectActionsPhase5 } from './actions-phase5';

export const injectCommandCenterActions = () => {
  injectActionsCore();
  injectActionsClipFx();
  injectActionsColor();
  injectActionsTransitions();
  injectActionsPhase4();
  injectActionsPhase5();
};
