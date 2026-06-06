// @ts-nocheck
// actions.ts — barrel: orchestrates all action injectors
import { injectActionsCore } from './actions-core';
import { injectActionsClipFx } from './actions-clip-fx';
import { injectActionsColor } from './actions-color';
import { injectActionsTransitions } from './actions-transitions';

export const injectCommandCenterActions = () => {
  injectActionsCore();
  injectActionsClipFx();
  injectActionsColor();
  injectActionsTransitions();
};
