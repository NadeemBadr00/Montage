// ─── CMD Reference Data & Executor ────────────────────────────────────────────
// Command palette data and the engine dispatcher for the CMD tab
import { SuggestionItem } from './right-panel-types';

export const CMD_REFERENCE = [
  { category: 'Cut', color: 'text-yellow-400', icon: 'fa-scissors', commands: [
    { cmd: 'c20sv1', desc: 'Cut at 20s on V1' },
    { cmd: 'c1m30sv1', desc: 'Cut at 1:30 on V1' },
  ]},
  { category: 'Delete', color: 'text-red-400', icon: 'fa-trash', commands: [
    { cmd: 'd10s:20sv1', desc: 'Delete 10s→20s on V1' },
    { cmd: 'd2v1', desc: 'Delete clip #2 on V1' },
    { cmd: 'dv1', desc: 'Clear all clips on V1' },
  ]},
  { category: 'Upload', color: 'text-blue-400', icon: 'fa-upload', commands: [
    { cmd: 'u10sv1', desc: 'Upload at 10s on V1' },
    { cmd: 'u10s:20sv1', desc: 'Upload 10s→20s' },
  ]},
  { category: 'Move / Position', color: 'text-cyan-400', icon: 'fa-arrows-up-down-left-right', commands: [
    { cmd: 'mv100x200y1v1', desc: 'Move clip 1 → X=100, Y=200' },
    { cmd: 'mvlx1v1', desc: 'Move clip 1 to Left' },
  ]},
  { category: 'Properties', color: 'text-purple-400', icon: 'fa-sliders', commands: [
    { cmd: 'sc150c1v1', desc: 'Scale clip 1 → 150%' },
    { cmd: 'op50c1v1', desc: 'Opacity clip 1 → 50%' },
    { cmd: 'ro45c1v1', desc: 'Rotation clip 1 → 45°' },
    { cmd: 'sx150c1v1', desc: 'ScaleX → 150%' },
    { cmd: 'sy80c1v1', desc: 'ScaleY → 80%' },
    { cmd: 'sz1920x1080c1v1', desc: 'Resize → 1920×1080' },
  ]},
  { category: 'Remove Silence', color: 'text-orange-400', icon: 'fa-waveform-lines', commands: [
    { cmd: 'rmsa1ev1', desc: 'Remove silence from A1, keep V1' },
  ]},
  { category: 'Selection Actions', color: 'text-rose-400', icon: 'fa-hand-pointer', commands: [
    { cmd: 'del', desc: 'Delete selected clip(s)' },
    { cmd: 'rdel', desc: 'Ripple-delete selected' },
    { cmd: 'dup', desc: 'Duplicate selected clip' },
  ]},
  { category: 'Timeline Structure', color: 'text-teal-400', icon: 'fa-layer-group', commands: [
    { cmd: 'txt', desc: 'Add text clip at playhead' },
    { cmd: 'atv', desc: 'Add new video track' },
    { cmd: 'ata', desc: 'Add new audio track' },
  ]},
  { category: 'Undo / Redo', color: 'text-green-300', icon: 'fa-rotate-left', commands: [
    { cmd: 'undo', desc: 'Undo last action' },
    { cmd: 'redo', desc: 'Redo last action' },
  ]},
  { category: 'Keyboard Shortcuts', color: 'text-pink-400', icon: 'fa-keyboard', commands: [
    { cmd: 'C', desc: 'Razor / Cut Tool' },
    { cmd: 'V', desc: 'Select Tool' },
    { cmd: 'Del / ⌫', desc: 'Delete selected clip' },
    { cmd: 'Shift+Del', desc: 'Ripple Delete selected' },
    { cmd: 'Ctrl+Z', desc: 'Undo' },
    { cmd: 'Ctrl+Y', desc: 'Redo' },
    { cmd: 'Space', desc: 'Play / Pause' },
  ]},
];

// Flat list for autocomplete suggestions
export const ALL_COMMANDS: SuggestionItem[] = CMD_REFERENCE.flatMap(s =>
  s.commands.map(c => ({ cmd: c.cmd, desc: c.desc, color: s.color, icon: s.icon, category: s.category }))
);

// Dispatches a command string to the editor engine
export function executeCmdString(cmdStr: string): boolean {
  const app = (window as any).app;
  if (!app) return false;
  app.commandBuffer = cmdStr;
  app.isCmdFocused = true;
  if (app.cmdBufferEl) app.cmdBufferEl.innerText = cmdStr;
  app.updateConsoleVisuals?.();
  document.dispatchEvent(new KeyboardEvent('keydown', {
    key: 'Enter', code: 'Enter', bubbles: true, cancelable: true,
  }));
  return true;
}
