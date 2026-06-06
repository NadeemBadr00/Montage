// ─── CMD Reference Data & Executor ────────────────────────────────────────────
import { SuggestionItem } from './right-panel-types';

export const CMD_REFERENCE = [
  { category: '✂️ Cut & Split', color: 'text-yellow-400', icon: 'fa-scissors', commands: [
    { cmd: 'c20sv1', desc: 'Cut at 20s on V1' },
    { cmd: 'c1m30sv1', desc: 'Cut at 1:30 on V1' },
    { cmd: 'split', desc: 'Split selected clip at playhead' },
  ]},
  { category: '🗑️ Delete', color: 'text-red-400', icon: 'fa-trash', commands: [
    { cmd: 'd10s:20sv1', desc: 'Delete 10s→20s on V1' },
    { cmd: 'd2v1', desc: 'Delete clip #2 on V1' },
    { cmd: 'del', desc: 'Delete selected clip(s)' },
    { cmd: 'rdel', desc: 'Ripple-delete selected' },
  ]},
  { category: '📁 Upload & Assets', color: 'text-blue-400', icon: 'fa-upload', commands: [
    { cmd: 'u10sv1', desc: 'Upload at 10s on V1' },
    { cmd: 'dup', desc: 'Duplicate selected clip' },
    { cmd: 'loop 3', desc: 'Loop selected clip 3 times' },
  ]},
  { category: '📐 Transform', color: 'text-cyan-400', icon: 'fa-arrows-up-down-left-right', commands: [
    { cmd: 'mv100x200y1v1', desc: 'Move clip 1 → X=100, Y=200' },
    { cmd: 'sc150c1v1', desc: 'Scale clip 1 → 150%' },
    { cmd: 'op50c1v1', desc: 'Opacity clip 1 → 50%' },
    { cmd: 'ro45c1v1', desc: 'Rotation clip 1 → 45°' },
    { cmd: 'zoom in', desc: 'Auto zoom-in keyframes' },
    { cmd: 'zoom out', desc: 'Auto zoom-out keyframes' },
    { cmd: 'grid 2x2', desc: 'Auto grid layout 2×2' },
    { cmd: 'grid 1x2', desc: 'Auto grid layout 1×2' },
  ]},
  { category: '🎨 Color & Filters', color: 'text-purple-400', icon: 'fa-palette', commands: [
    { cmd: 'filter bw', desc: 'Black & White filter' },
    { cmd: 'filter cinematic', desc: 'Cinematic color grade' },
    { cmd: 'filter vintage', desc: 'Vintage filter' },
    { cmd: 'filter vivid', desc: 'Vivid colors' },
    { cmd: 'colormatch', desc: 'Match colors between 2 clips' },
    { cmd: 'mood epic', desc: 'AI mood: epic/happy/sad/horror/romantic/cyberpunk' },
    { cmd: 'reset', desc: 'Reset all effects on clip' },
  ]},
  { category: '🎭 Visual FX', color: 'text-pink-400', icon: 'fa-magic', commands: [
    { cmd: 'vignette', desc: 'Cinematic vignette overlay (toggle)' },
    { cmd: 'letterbox', desc: 'Cinematic black bars 2.35:1 (toggle)' },
    { cmd: 'shake', desc: 'Camera shake effect' },
    { cmd: 'blur 10', desc: 'Gaussian blur (px amount)' },
    { cmd: 'glitch', desc: 'Digital glitch effect (toggle)' },
    { cmd: 'chroma', desc: 'Green screen chroma key (toggle)' },
    { cmd: 'reverse', desc: 'Reverse clip playback' },
    { cmd: 'freeze', desc: 'Freeze frame for 2 seconds' },
  ]},
  { category: '✨ Particles & Lights', color: 'text-yellow-300', icon: 'fa-star', commands: [
    { cmd: 'flare', desc: 'Lens flare overlay (toggle)' },
    { cmd: 'rain', desc: 'Rain effect overlay (toggle)' },
    { cmd: 'sparkle', desc: 'Sparkle overlay (toggle)' },
    { cmd: 'lightsweep', desc: 'Light sweep animation (toggle)' },
  ]},
  { category: '🎞️ Cinematic', color: 'text-orange-400', icon: 'fa-film', commands: [
    { cmd: 'ramp up', desc: 'Speed ramp up (slow → fast)' },
    { cmd: 'ramp down', desc: 'Speed ramp down (fast → slow)' },
    { cmd: 'title My Title', desc: 'Add cinematic opening title' },
    { cmd: 'lower Name - Role', desc: 'Animated lower third' },
    { cmd: 'countdown 5', desc: '5-second countdown timer' },
    { cmd: 'progress', desc: 'Video progress bar overlay' },
    { cmd: 'waveform', desc: 'Audio waveform visualizer' },
  ]},
  { category: '📝 Text & Typography', color: 'text-indigo-400', icon: 'fa-font', commands: [
    { cmd: 'txt', desc: 'Add text clip at playhead' },
    { cmd: 'font Roboto', desc: 'Load Google Font for selected text' },
    { cmd: 'bold', desc: 'Toggle bold on selected text' },
    { cmd: 'outline #FF0000', desc: 'Add colored outline to text' },
    { cmd: 'shadow 15', desc: 'Drop shadow on text (strength)' },
    { cmd: 'textscale 80', desc: 'Set text font size' },
    { cmd: 'karaoke', desc: 'Karaoke word-highlight effect' },
    { cmd: 'captions', desc: 'Auto-generate subtitles' },
  ]},
  { category: '😂 Overlays', color: 'text-emerald-400', icon: 'fa-icons', commands: [
    { cmd: 'emoji 🔥', desc: 'Animated emoji reaction' },
    { cmd: 'watermark @Name', desc: 'Semi-transparent watermark' },
    { cmd: 'copyright', desc: 'Copyright strip' },
    { cmd: 'logo', desc: 'Pin logo from assets' },
    { cmd: 'brand #FF0055', desc: 'Apply brand color to all text' },
  ]},
  { category: '🎵 Audio', color: 'text-teal-400', icon: 'fa-music', commands: [
    { cmd: 'voice Hello world', desc: 'AI Text-to-Speech voiceover' },
    { cmd: 'bass', desc: 'Boost bass frequencies' },
    { cmd: 'noise', desc: 'Noise reduction filter' },
    { cmd: 'pitch +5', desc: 'Pitch shift (+/- semitones)' },
    { cmd: 'ducking', desc: 'Auto duck music under speech' },
    { cmd: 'beat', desc: 'Mark beat at playhead' },
    { cmd: 'beatmatch', desc: 'Auto-cut clips to beats' },
  ]},
  { category: '📱 Social Media', color: 'text-rose-400', icon: 'fa-mobile', commands: [
    { cmd: 'social tiktok', desc: 'Resize for TikTok (1080×1920)' },
    { cmd: 'social instagram', desc: 'Square format (1080×1080)' },
    { cmd: 'social youtube', desc: 'YouTube (1920×1080)' },
    { cmd: 'social shorts', desc: 'YouTube Shorts (1080×1920 60fps)' },
    { cmd: 'thumb My Title', desc: 'Generate YouTube thumbnail' },
    { cmd: 'chapters', desc: 'Export YouTube chapter timestamps' },
  ]},
  { category: '📤 Export', color: 'text-green-400', icon: 'fa-file-export', commands: [
    { cmd: 'batchexport', desc: 'Export MP4 + WAV + GIF at once' },
    { cmd: 'export xml', desc: 'Export FCPXML for Premiere Pro' },
    { cmd: 'gif', desc: 'Export as GIF' },
  ]},
  { category: '🤖 AI Features', color: 'text-violet-400', icon: 'fa-robot', commands: [
    { cmd: 'storyboard', desc: 'Show visual storyboard in console' },
    { cmd: 'scene', desc: 'Auto detect scenes' },
    { cmd: 'broll', desc: 'AI B-Roll suggestions' },
    { cmd: 'mood happy', desc: 'AI mood color grading' },
    { cmd: 'cleanup', desc: 'Remove gaps, compress timeline' },
    { cmd: 'snapshot v1', desc: 'Save project version snapshot' },
  ]},
  { category: '💡 Utility', color: 'text-gray-300', icon: 'fa-wrench', commands: [
    { cmd: 'help', desc: 'Show all commands in console' },
    { cmd: 'info', desc: 'Project stats (clips, duration)' },
    { cmd: 'history', desc: 'Show last 10 commands run' },
    { cmd: 'undo', desc: 'Undo last action' },
    { cmd: 'redo', desc: 'Redo last action' },
  ]},
  { category: '⌨️ Keyboard Shortcuts', color: 'text-pink-400', icon: 'fa-keyboard', commands: [
    { cmd: 'Space', desc: 'Play / Pause' },
    { cmd: 'C', desc: 'Razor / Cut Tool' },
    { cmd: 'V', desc: 'Select Tool' },
    { cmd: 'Del', desc: 'Delete selected clip' },
    { cmd: 'Shift+Del', desc: 'Ripple Delete selected' },
    { cmd: 'Ctrl+Z', desc: 'Undo' },
    { cmd: 'Ctrl+Y', desc: 'Redo' },
    { cmd: 'Ctrl+/', desc: 'Focus command input' },
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
