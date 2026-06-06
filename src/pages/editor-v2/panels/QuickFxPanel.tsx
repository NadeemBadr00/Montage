// @ts-nocheck
/**
 * QuickFxPanel — Phases 6-20: Complete redesign
 * - Phase 6: FX Chain + Active state + Search + Favorites + Grid layout
 * - Phase 7: Keyframe Animator tab
 * - Phase 8: One-Click Fix Presets + Style Packs
 * - Phase 9: Export Settings Quick Panel
 * - Phase 16: New FX categories — audio, image, text
 * - Phase 17: Updated FX_CATS
 * - Phase 18: Smart Presets per Clip Type
 * - Phase 19: Clip Type Info Bar
 * - Phase 20: Type-aware Style Packs
 */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useEditorStore } from '../../../store/useEditorStore';

/* ─── Helpers ───────────────────────────────────────────────── */
function runCmd(cmd: string) {
  const app = (window as any).app;
  if (!app) return;
  app.commandBuffer = cmd;
  app.isCmdFocused = true;
  document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', bubbles: true, cancelable: true }));
}

function applyProp(propKey: string, value: any) {
  const app = (window as any).app;
  if (!app) return;
  const ids = Array.from(app.selectedClipIds || []);
  app.tracks?.forEach((t: any) => {
    t.clips?.forEach((c: any) => {
      if (ids.includes(c.id)) {
        c.properties = c.properties || {};
        c.properties[propKey] = value;
      }
    });
  });
  app.saveState?.();
  app.requestRedraw?.();
  app.commitStateToReact?.();
}

function applyTextStyle(propKey: string, value: any) {
  const app = (window as any).app;
  if (!app) return;
  const ids = Array.from(app.selectedClipIds || []);
  app.tracks?.forEach((t: any) => {
    t.clips?.forEach((c: any) => {
      if (ids.includes(c.id)) {
        c.textStyle = c.textStyle || {};
        c.textStyle[propKey] = value;
      }
    });
  });
  app.saveState?.();
  app.requestRedraw?.();
  app.commitStateToReact?.();
}

/* ─── FX definitions ──────────────────────────────────────────── */
const ALL_FX = [
  // Visual FX
  { id: 'bw',        label: 'B&W',        icon: 'fa-circle-half-stroke', color: '#94a3b8', cmd: 'filter bw',        cat: 'visual' },
  { id: 'cinematic', label: 'Cinema',      icon: 'fa-film',               color: '#a78bfa', cmd: 'filter cinematic', cat: 'visual' },
  { id: 'vintage',   label: 'Vintage',     icon: 'fa-camera-retro',       color: '#fbbf24', cmd: 'filter vintage',   cat: 'visual' },
  { id: 'vivid',     label: 'Vivid',       icon: 'fa-sun',                color: '#f59e0b', cmd: 'filter vivid',     cat: 'visual' },
  { id: 'vignette',  label: 'Vignette',    icon: 'fa-eye-slash',          color: '#6b7280', cmd: 'vignette',         cat: 'visual' },
  { id: 'glitch',    label: 'Glitch',      icon: 'fa-bolt',               color: '#4ade80', cmd: 'glitch',           cat: 'visual' },
  { id: 'blur',      label: 'Blur',        icon: 'fa-wind',               color: '#60a5fa', cmd: 'blur 15',          cat: 'visual' },
  { id: 'shake',     label: 'Shake',       icon: 'fa-circle-dot',         color: '#fb923c', cmd: 'shake',            cat: 'visual' },
  { id: 'flare',     label: 'Flare',       icon: 'fa-star',               color: '#fde68a', cmd: 'flare',            cat: 'visual' },
  { id: 'grain',     label: 'Grain',       icon: 'fa-spray-can',          color: '#9ca3af', cmd: 'grain',            cat: 'visual' },
  { id: 'letterbox', label: 'Letterbox',   icon: 'fa-border-top-left',    color: '#6b7280', cmd: 'letterbox',        cat: 'visual' },
  { id: 'chroma',    label: 'Chroma',      icon: 'fa-scissors',           color: '#22c55e', cmd: 'chroma',           cat: 'visual' },
  // Speed & Time
  { id: 'reverse',   label: 'Reverse',     icon: 'fa-backward',           color: '#f59e0b', cmd: 'reverse',          cat: 'speed' },
  { id: 'freeze',    label: 'Freeze',      icon: 'fa-snowflake',          color: '#67e8f9', cmd: 'freeze',           cat: 'speed' },
  { id: 'rampup',    label: 'Speed ↑',     icon: 'fa-gauge-high',         color: '#fb923c', cmd: 'ramp up',          cat: 'speed' },
  { id: 'rampdown',  label: 'Speed ↓',     icon: 'fa-gauge',              color: '#fca5a5', cmd: 'ramp down',        cat: 'speed' },
  // Mood / AI
  { id: 'happy',     label: 'Happy',       icon: 'fa-face-laugh',         color: '#fde68a', cmd: 'mood happy',       cat: 'mood' },
  { id: 'epic',      label: 'Epic',        icon: 'fa-fire',               color: '#f87171', cmd: 'mood epic',        cat: 'mood' },
  { id: 'chill',     label: 'Chill',       icon: 'fa-umbrella-beach',     color: '#6ee7b7', cmd: 'mood chill',       cat: 'mood' },
  { id: 'dark',      label: 'Dark',        icon: 'fa-moon',               color: '#818cf8', cmd: 'mood sad',         cat: 'mood' },
  { id: 'cyber',     label: 'Cyber',       icon: 'fa-microchip',          color: '#22d3ee', cmd: 'mood cyberpunk',   cat: 'mood' },
  { id: 'romantic',  label: 'Romance',     icon: 'fa-heart',              color: '#f9a8d4', cmd: 'mood romantic',    cat: 'mood' },
  // Overlays
  { id: 'progress',  label: 'Progress',    icon: 'fa-chart-simple',       color: '#f87171', cmd: 'progress',         cat: 'overlay' },
  { id: 'waveform',  label: 'Waveform',    icon: 'fa-wave-square',        color: '#22d3ee', cmd: 'waveform',         cat: 'overlay' },
  { id: 'watermark', label: 'Watermark',   icon: 'fa-tag',                color: '#9ca3af', cmd: 'watermark',        cat: 'overlay' },
  { id: 'lightsweep',label: 'Light Sweep', icon: 'fa-lightbulb',          color: '#fef9c3', cmd: 'lightsweep',       cat: 'overlay' },
  // Audio FX
  { id: 'reverb',    label: 'Reverb',      icon: 'fa-broadcast-tower',    color: '#818cf8', cmd: 'reverb hall',      cat: 'audio' },
  { id: 'echo',      label: 'Echo',        icon: 'fa-rotate-right',       color: '#6366f1', cmd: 'echo',             cat: 'audio' },
  { id: 'chorus',    label: 'Chorus',      icon: 'fa-users',              color: '#8b5cf6', cmd: 'chorus',           cat: 'audio' },
  { id: 'distort',   label: 'Distortion',  icon: 'fa-guitar',             color: '#f87171', cmd: 'distortion',       cat: 'audio' },
  { id: 'vinyl',     label: 'Vinyl',       icon: 'fa-record-vinyl',       color: '#9ca3af', cmd: 'vinyl crackle',    cat: 'audio' },
  { id: 'radio',     label: 'Radio',       icon: 'fa-radio',              color: '#fbbf24', cmd: 'radio effect',     cat: 'audio' },
  { id: '8bit',      label: '8-Bit',       icon: 'fa-gamepad',            color: '#4ade80', cmd: '8bit sound',       cat: 'audio' },
  { id: 'robot',     label: 'Robot',       icon: 'fa-robot',              color: '#22d3ee', cmd: 'robot voice',      cat: 'audio' },
  { id: 'whisper',   label: 'Whisper',     icon: 'fa-comment-dots',       color: '#e2e8f0', cmd: 'whisper',          cat: 'audio' },
  { id: 'telephone', label: 'Telephone',   icon: 'fa-phone',              color: '#fb923c', cmd: 'telephone',        cat: 'audio' },
  // Image FX
  { id: 'oilpaint',  label: 'Oil Paint',   icon: 'fa-paintbrush',         color: '#f59e0b', cmd: 'oil paint',        cat: 'image' },
  { id: 'watercolor',label: 'Watercolor',  icon: 'fa-fill',               color: '#60a5fa', cmd: 'watercolor',       cat: 'image' },
  { id: 'pencil',    label: 'Pencil',      icon: 'fa-pencil',             color: '#d1d5db', cmd: 'pencil sketch',    cat: 'image' },
  { id: 'neon-out',  label: 'Neon Edge',   icon: 'fa-atom',               color: '#22d3ee', cmd: 'neon outline',     cat: 'image' },
  { id: 'popart',    label: 'Pop Art',     icon: 'fa-bomb',               color: '#f87171', cmd: 'pop art',          cat: 'image' },
  { id: 'infrared',  label: 'Infrared',    icon: 'fa-thermometer-half',   color: '#fb923c', cmd: 'infrared',         cat: 'image' },
  { id: 'tiltshift', label: 'Tilt Shift',  icon: 'fa-magnifying-glass',   color: '#a78bfa', cmd: 'tilt shift',       cat: 'image' },
  { id: 'crossproc', label: 'Cross Proc',  icon: 'fa-rotate',             color: '#34d399', cmd: 'cross process',    cat: 'image' },
  { id: 'bleach',    label: 'Bleach',      icon: 'fa-eye-slash',          color: '#f1f5f9', cmd: 'bleach bypass',    cat: 'image' },
  { id: 'solarize',  label: 'Solarize',    icon: 'fa-sun',                color: '#fde68a', cmd: 'solarize',         cat: 'image' },
  // Text FX
  { id: 'neon-txt',  label: 'Neon Glow',   icon: 'fa-lightbulb',          color: '#22d3ee', cmd: 'text neon',        cat: 'text' },
  { id: 'shadow-drp',label: 'Drop Shadow', icon: 'fa-clone',              color: '#475569', cmd: 'text shadow',      cat: 'text' },
  { id: 'grad-fill', label: 'Gradient',    icon: 'fa-fill',               color: '#8b5cf6', cmd: 'text gradient',    cat: 'text' },
  { id: 'bold-out',  label: 'Bold Outline',icon: 'fa-bold',               color: '#f1f5f9', cmd: 'text bold outline',cat: 'text' },
  { id: 'typewrite', label: 'Typewriter',  icon: 'fa-keyboard',           color: '#6ee7b7', cmd: 'typewriter',       cat: 'text' },
  { id: 'kinetic',   label: 'Kinetic',     icon: 'fa-running',            color: '#f59e0b', cmd: 'kinetic type',     cat: 'text' },
  { id: 'shake-txt', label: 'Shake',       icon: 'fa-arrows-left-right',  color: '#f87171', cmd: 'text shake',       cat: 'text' },
  { id: 'rainbow',   label: 'Rainbow',     icon: 'fa-rainbow',            color: '#fb923c', cmd: 'rainbow text',     cat: 'text' },
];

const FX_CATS = [
  { id: 'all',    label: 'All',     icon: 'fa-border-all' },
  { id: 'visual', label: 'Visual',  icon: 'fa-eye' },
  { id: 'speed',  label: 'Speed',   icon: 'fa-gauge-high' },
  { id: 'mood',   label: 'Mood',    icon: 'fa-face-smile' },
  { id: 'overlay',label: 'Overlay', icon: 'fa-layer-group' },
  { id: 'audio',  label: 'Audio',   icon: 'fa-music' },
  { id: 'image',  label: 'Image',   icon: 'fa-image' },
  { id: 'text',   label: 'Text',    icon: 'fa-font' },
];

/* ─── One-Click Fix Presets ───────────────────────────────────── */

const VIDEO_PRESETS = [
  {
    id: 'auto-relight', label: 'Auto Relight', icon: 'fa-lightbulb', color: '#fbbf24',
    apply: () => { applyProp('relightIntensity', 80); applyProp('brightness', 110); applyProp('shadows', 20); }
  },
  {
    id: 'color-match', label: 'Color Match', icon: 'fa-wand-magic-sparkles', color: '#a78bfa',
    apply: () => { applyProp('colorMatchActive', true); runCmd('color match'); }
  },
  {
    id: 'denoise', label: 'Denoise (AI)', icon: 'fa-broom', color: '#34d399',
    apply: () => { applyProp('denoiseAmount', 50); applyProp('sharpness', 110); }
  },
  {
    id: 'auto-color', label: 'Auto Color', icon: 'fa-palette', color: '#22d3ee',
    apply: () => { applyProp('saturation', 120); applyProp('colorTemp', 5); applyProp('contrast', 108); }
  },
  {
    id: 'cinematic-dark', label: 'Cinematic', icon: 'fa-film', color: '#818cf8',
    apply: () => { runCmd('filter cinematic'); applyProp('contrast', 130); applyProp('saturation', 70); }
  },
  {
    id: 'film-grain', label: 'Film Grain', icon: 'fa-spray-can', color: '#9ca3af',
    apply: () => { runCmd('grain'); applyProp('contrast', 110); }
  },
];

/* ─── Smart Presets per Clip Type ────────────────────────────── */
const AUDIO_PRESETS = [
  { id: 'voice-enhance', label: 'AI Voice Enhance', icon: 'fa-wand-magic-sparkles', color: '#6366f1',
    apply: () => { applyProp('aiVoiceEnhance', true); applyProp('deNoise', true); applyProp('eqMid', 5); } },
  { id: 'de-esser', label: 'De-Esser', icon: 'fa-scissors', color: '#f472b6',
    apply: () => { applyProp('deEsserAmount', 60); applyProp('eqHigh', -4); } },
  { id: 'auto-ducking', label: 'Auto Ducking', icon: 'fa-water', color: '#22d3ee',
    apply: () => { applyProp('autoDucking', true); applyProp('duckThreshold', -25); } },
  { id: 'podcast',    label: 'Podcast EQ',     icon: 'fa-microphone',    color: '#8b5cf6',
    apply: () => { applyProp('eqMid', 3); applyProp('compThreshold', -20); applyProp('compRatio', 3); applyProp('deNoise', true); } },
  { id: 'cine-sound', label: 'Cine Sound',  icon: 'fa-film',          color: '#a78bfa',
    apply: () => { applyProp('reverbWet', 20); applyProp('reverbSize', 60); applyProp('eqBass', -2); } },
  { id: 'lofi',       label: 'Lo-Fi',       icon: 'fa-record-vinyl',  color: '#fbbf24',
    apply: () => { applyProp('eqAir', -6); applyProp('eqBass', 3); runCmd('vinyl crackle'); } },
];

const IMAGE_PRESETS = [
  { id: '3d-photo', label: '3D Parallax', icon: 'fa-cube', color: '#f59e0b',
    apply: () => { applyProp('parallax3D', true); applyProp('parallaxDepth', 50); runCmd('3d photo'); } },
  { id: 'auto-cutout', label: 'Auto Cutout', icon: 'fa-scissors', color: '#ec4899',
    apply: () => { applyProp('removeBg', true); runCmd('remove bg'); } },
  { id: 'upscale', label: 'AI Upscale', icon: 'fa-expand', color: '#3b82f6',
    apply: () => { applyProp('aiUpscale', true); runCmd('upscale image'); } },
  { id: 'portrait',  label: 'Portrait',      icon: 'fa-user',         color: '#f472b6',
    apply: () => { applyProp('bgBlur', 60); applyProp('sharpness', 120); applyProp('brightness', 108); applyProp('saturation', 105); } },
  { id: 'product',   label: 'Product Shot',  icon: 'fa-box',          color: '#a78bfa',
    apply: () => { applyProp('sharpness', 150); applyProp('contrast', 115); applyProp('saturation', 100); applyProp('bgBlur', 0); } },
  { id: 'bw-photo',  label: 'B&W Photo',     icon: 'fa-circle-half-stroke', color: '#94a3b8',
    apply: () => { applyProp('saturation', 0); applyProp('contrast', 120); applyProp('sharpness', 110); } },
];

const TEXT_PRESETS = [
  { id: 'curved-text', label: 'Curved Text',  icon: 'fa-archway',      color: '#ec4899',
    apply: () => { applyTextStyle('isCurved', true); applyTextStyle('curveRadius', 150); } },
  { id: 'tracking',   label: 'Tracking (+)',    icon: 'fa-text-width', color: '#10b981',
    apply: () => { applyTextStyle('letterSpacing', 10); } },
  { id: 'auto-resize',   label: 'Auto Resize', icon: 'fa-compress',         color: '#3b82f6',
    apply: () => { applyTextStyle('autoFit', true); } },
  { id: 'title-card', label: 'Title Card',  icon: 'fa-heading',      color: '#818cf8',
    apply: () => { applyTextStyle('fontSize', 72); applyTextStyle('fontWeight', 'bold'); applyTextStyle('entryAnim', 'fade'); applyTextStyle('glowBlur', 15); } },
  { id: 'subtitle',   label: 'Subtitle',    icon: 'fa-closed-captioning', color: '#94a3b8',
    apply: () => { applyTextStyle('fontSize', 28); applyTextStyle('backgroundColor', '#00000099'); applyTextStyle('textAlign', 'center'); } },
  { id: 'meme',       label: 'Meme Text',   icon: 'fa-face-laugh',   color: '#fde68a',
    apply: () => { applyTextStyle('fontSize', 48); applyTextStyle('fontWeight', 'bold'); applyTextStyle('color', '#ffffff'); applyTextStyle('strokeWidth', 3); applyTextStyle('strokeColor', '#000000'); } },
];

/* ─── Export Formats ──────────────────────────────────────────── */
const PLATFORMS = [
  { id: 'youtube', label: 'YouTube',   icon: 'fa-youtube',   brand: true,  color: '#ef4444', cmd: 'social youtube' },
  { id: 'tiktok',  label: 'TikTok',    icon: 'fa-tiktok',    brand: true,  color: '#f1f5f9', cmd: 'social tiktok' },
  { id: 'insta',   label: 'Instagram', icon: 'fa-instagram', brand: true,  color: '#e879f9', cmd: 'social instagram' },
  { id: 'shorts',  label: 'Shorts',    icon: 'fa-play',      brand: false, color: '#f87171', cmd: 'social shorts' },
];

/* ─── Main Component ──────────────────────────────────────────── */
export function QuickFxPanel() {
  const selectedClipIds = useEditorStore(s => s.selectedClipIds);
  const hasSelection = selectedClipIds.size > 0;
  const tracks = useEditorStore(s => s.tracks);

  const [activeTab, setActiveTab] = useState<'fx' | 'fix' | 'animate' | 'export'>('fx');
  const [fxCat, setFxCat]   = useState('all');
  const [fxSearch, setFxSearch] = useState('');
  const [favorites, setFavorites] = useState<string[]>([]);
  const [fxChain, setFxChain] = useState<string[]>([]);  // active effects applied
  const [appliedPreset, setAppliedPreset] = useState<string | null>(null);
  const [filterByType, setFilterByType] = useState(false);

  const [expFormat, setExpFormat] = useState('mp4');
  const [expRes, setExpRes]       = useState('1080p');
  const [expFps, setExpFps]       = useState('30');
  const [expQuality, setExpQuality] = useState('high');

  // Animation state
  const [enterAnim, setEnterAnim] = useState('none');
  const [exitAnim, setExitAnim]   = useState('none');
  const [animDuration, setAnimDuration] = useState('1.0');

  useEffect(() => {
    if (selectedClipIds.size !== 1) return;
    const id = Array.from(selectedClipIds)[0];
    for (const t of tracks) {
      const c = t.clips.find((c: any) => c.id === id);
      if (c) {
         setEnterAnim(c.transitions?.in || 'none');
         setExitAnim(c.transitions?.out || 'none');
         setAnimDuration((c.transitions?.duration || 1.0).toString());
         break;
      }
    }
  }, [selectedClipIds, tracks]);

  const applyTransition = (inAnim: string, outAnim: string, dur: number) => {
    const app = (window as any).app;
    if (!app) return;
    const ids = Array.from(app.selectedClipIds || []);
    app.tracks?.forEach((t: any) => {
      t.clips?.forEach((c: any) => {
        if (ids.includes(c.id)) {
          c.transitions = c.transitions || {};
          c.transitions.in = inAnim;
          c.transitions.out = outAnim;
          c.transitions.duration = dur;
        }
      });
    });
    app.saveState?.();
    app.requestRedraw?.();
    app.commitStateToReact?.();
  };

  // Detect selected clip type
  const clipType = React.useMemo(() => {
    if (selectedClipIds.size === 0) return 'none';
    const id = Array.from(selectedClipIds)[0];
    for (const t of tracks) {
      const c = t.clips.find((c: any) => c.id === id);
      if (c) return c.type || 'video';
    }
    return 'none';
  }, [selectedClipIds, tracks]);

  const toggleFavorite = (id: string) => {
    setFavorites(prev => prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id]);
  };

  const applyFx = (fx: typeof ALL_FX[0]) => {
    runCmd(fx.cmd);
    setFxChain(prev => prev.includes(fx.id) ? prev : [...prev, fx.id]);
  };

  const removeFxFromChain = (id: string) => {
    setFxChain(prev => prev.filter(f => f !== id));
    // Attempt undo for that effect
    const app = (window as any).app;
    app?.undo?.();
  };

  const applyPreset = (preset: typeof FIX_PRESETS[0]) => {
    preset.apply();
    setAppliedPreset(preset.id);
    setTimeout(() => setAppliedPreset(null), 1500);
  };

  const doExport = () => {
    runCmd(`export ${expFormat} ${expRes} ${expFps}fps ${expQuality}`);
  };

  const filtered = ALL_FX.filter(fx => {
    const matchCat = fxCat === 'all' || fx.cat === fxCat;
    const matchSearch = !fxSearch || fx.label.toLowerCase().includes(fxSearch.toLowerCase());
    const matchType = !filterByType || fx.cat === clipType || fx.cat === 'visual' || fx.cat === 'speed';
    return matchCat && matchSearch && matchType;
  });

  const favItems = ALL_FX.filter(fx => favorites.includes(fx.id));

  // Smart presets based on clip type
  const smartPresets = clipType === 'audio' ? AUDIO_PRESETS
    : clipType === 'image' ? IMAGE_PRESETS
    : clipType === 'text' ? TEXT_PRESETS
    : VIDEO_PRESETS;

  const smartPresetLabel = clipType === 'audio' ? '🎵 Audio Presets'
    : clipType === 'image' ? '🖼️ Image Presets'
    : clipType === 'text' ? '🔤 Text Presets'
    : '⚡ Video Presets';

  const TABS = [
    { id: 'fx',    label: 'Effects',  icon: 'fa-wand-magic-sparkles' },
    { id: 'fix',   label: 'Presets',  icon: 'fa-bolt' },
    { id: 'animate', label: 'Animate', icon: 'fa-film' },
    { id: 'export',label: 'Export',   icon: 'fa-file-export' },
  ];

  return (
    <div className="flex flex-col h-full text-[9px] overflow-hidden">

      {/* Clip Type Info Bar */}
      {selectedClipIds.size > 0 && (
        <div className="flex items-center gap-1.5 px-2 py-1 border-b border-gray-800/60 flex-shrink-0 bg-[#060b14]">
          <div
            className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[7px] font-bold"
            style={{
              background: clipType === 'audio' ? 'rgba(34,211,238,0.15)'
                : clipType === 'image' ? 'rgba(52,211,153,0.15)'
                : clipType === 'text' ? 'rgba(232,121,249,0.15)'
                : 'rgba(99,102,241,0.15)',
              color: clipType === 'audio' ? '#22d3ee'
                : clipType === 'image' ? '#34d399'
                : clipType === 'text' ? '#e879f9'
                : '#818cf8',
              border: `1px solid ${clipType === 'audio' ? 'rgba(34,211,238,0.3)' : clipType === 'image' ? 'rgba(52,211,153,0.3)' : clipType === 'text' ? 'rgba(232,121,249,0.3)' : 'rgba(99,102,241,0.3)'}`,
            }}
          >
            <i className={`fa-solid ${
              clipType === 'audio' ? 'fa-music'
              : clipType === 'image' ? 'fa-image'
              : clipType === 'text' ? 'fa-font'
              : 'fa-film'
            } text-[7px]`} />
            {clipType.toUpperCase()}
          </div>
          {/* Filter by type toggle */}
          <button
            onClick={() => setFilterByType(prev => !prev)}
            className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[7px] transition-all ${
              filterByType
                ? 'bg-pink-600/20 text-pink-400 border border-pink-500/30'
                : 'text-gray-600 hover:text-gray-400 border border-transparent'
            }`}
          >
            <i className="fa-solid fa-filter text-[7px]" />
            {filterByType ? 'Filtered' : 'Filter'}
          </button>
          {/* Apply to all of type button */}
          <button
            onClick={() => {
              const app = (window as any).app;
              if (!app || fxChain.length === 0) return;
              app.tracks?.forEach((t: any) => {
                t.clips?.forEach((c: any) => {
                  if ((c.type || 'video') === clipType) {
                    fxChain.forEach(id => {
                      const fx = ALL_FX.find(f => f.id === id);
                      if (fx) { app.commandBuffer = fx.cmd; document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', bubbles: true })); }
                    });
                  }
                });
              });
            }}
            disabled={fxChain.length === 0}
            className="ml-auto flex items-center gap-1 px-1.5 py-0.5 rounded text-[7px] border border-gray-800 text-gray-600 hover:text-pink-400 hover:border-pink-500/30 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
            title="Apply FX chain to all clips of this type"
          >
            <i className="fa-solid fa-wand-magic-sparkles text-[7px]" />
            All {clipType}s
          </button>
        </div>
      )}

      {/* Sub-tab bar */}
      <div className="flex border-b border-gray-800/60 bg-[#060b14] flex-shrink-0">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id as any)}
            className={`flex-1 py-1.5 flex flex-col items-center gap-0.5 transition-all ${activeTab === t.id ? 'text-pink-400 border-b border-pink-500 bg-[#0a0f1d]' : 'text-gray-600 hover:text-gray-400'}`}
          >
            <i className={`fa-solid ${t.icon} text-[9px]`} />
            <span className="text-[7px] leading-none">{t.label}</span>
          </button>
        ))}
      </div>

      {/* ══ EFFECTS TAB ══ */}
      {activeTab === 'fx' && (
        <div className="flex flex-col flex-1 overflow-hidden">

          {/* Search */}
          <div className="px-2 pt-1.5 pb-1 flex-shrink-0">
            <div className="flex items-center gap-1.5 bg-[#0f172a] border border-gray-800 rounded-lg px-2 py-1">
              <i className="fa-solid fa-magnifying-glass text-gray-600 text-[8px]" />
              <input
                type="text"
                placeholder="Search effects..."
                value={fxSearch}
                onChange={e => setFxSearch(e.target.value)}
                className="flex-1 bg-transparent text-[8px] text-gray-300 outline-none placeholder-gray-700"
              />
            </div>
          </div>

          {/* Category filter */}
          <div className="flex gap-1 px-2 pb-1 flex-shrink-0 overflow-x-auto">
            {FX_CATS.map(cat => (
              <button
                key={cat.id}
                onClick={() => setFxCat(cat.id)}
                className={`flex-shrink-0 flex items-center gap-1 px-1.5 py-0.5 rounded text-[7px] transition-all ${fxCat === cat.id ? 'bg-pink-600/30 text-pink-300 border border-pink-500/40' : 'bg-white/5 text-gray-500 hover:text-gray-300 border border-transparent'}`}
              >
                <i className={`fa-solid ${cat.icon} text-[7px]`} /> {cat.label}
              </button>
            ))}
          </div>

          {/* Favorites bar */}
          {favItems.length > 0 && (
            <div className="px-2 pb-1 flex gap-1 flex-shrink-0 flex-wrap border-b border-gray-800/40">
              <span className="text-[7px] text-yellow-600 w-full mb-0.5 flex items-center gap-1">
                <i className="fa-solid fa-star text-[6px]" /> Favorites
              </span>
              {favItems.map(fx => (
                <button
                  key={fx.id}
                  onClick={() => applyFx(fx)}
                  className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-yellow-900/20 border border-yellow-700/30 text-yellow-400 text-[7px] hover:bg-yellow-900/40 transition-all"
                >
                  <i className={`fa-solid ${fx.icon} text-[7px]`} /> {fx.label}
                </button>
              ))}
            </div>
          )}

          {/* FX Grid */}
          <div className="flex-1 overflow-y-auto custom-scrollbar px-1.5 pt-1">
            <div className="grid grid-cols-3 gap-1">
              {filtered.map(fx => {
                const isActive = fxChain.includes(fx.id);
                const isFav = favorites.includes(fx.id);
                return (
                  <div key={fx.id} className="relative group">
                    <button
                      onClick={() => applyFx(fx)}
                      onMouseEnter={() => {
                          const canvas = document.getElementById('main-canvas');
                          if (canvas && fx.cat === 'visual') {
                              let filter = '';
                              if (fx.id === 'bw') filter = 'grayscale(100%)';
                              if (fx.id === 'cinematic') filter = 'contrast(120%) saturate(80%) sepia(20%)';
                              if (fx.id === 'vintage') filter = 'sepia(80%) contrast(110%)';
                              if (fx.id === 'vivid') filter = 'saturate(200%) contrast(110%)';
                              if (fx.id === 'blur') filter = 'blur(10px)';
                              if (filter) canvas.style.filter = filter;
                          }
                      }}
                      onMouseLeave={() => {
                          const canvas = document.getElementById('main-canvas');
                          if (canvas) canvas.style.filter = 'none';
                      }}
                      className={`w-full flex flex-col items-center gap-1 p-2 rounded-lg border transition-all ${
                        isActive
                          ? 'bg-gradient-to-b from-[#1a2040] to-[#0f172a] border-pink-500/60 shadow-[0_0_8px_rgba(236,72,153,0.3)]'
                          : 'bg-[#0a0f1d] border-gray-800 hover:border-gray-600 hover:bg-[#0f172a]'
                      }`}
                    >
                      <i
                        className={`fa-solid ${fx.icon} text-[13px] transition-transform group-hover:scale-110`}
                        style={{ color: isActive ? fx.color : '#6b7280' }}
                      />
                      <span className={`text-[7px] leading-tight text-center ${isActive ? 'text-gray-200' : 'text-gray-600'}`}>
                        {fx.label}
                      </span>
                      {isActive && (
                        <div className="absolute top-0.5 right-0.5 w-1.5 h-1.5 rounded-full bg-pink-500" />
                      )}
                    </button>
                    {/* Favorite star */}
                    <button
                      onClick={() => toggleFavorite(fx.id)}
                      className={`absolute top-0.5 left-0.5 opacity-0 group-hover:opacity-100 transition-opacity text-[8px] ${isFav ? 'text-yellow-400 opacity-100' : 'text-gray-700'}`}
                      title="Favorite"
                    >
                      <i className={`fa-${isFav ? 'solid' : 'regular'} fa-star`} />
                    </button>
                  </div>
                );
              })}
            </div>

            {/* FX Chain */}
            {fxChain.length > 0 && (
              <div className="mt-2 border border-pink-500/20 rounded-lg p-1.5 bg-[#0a0f1d]">
                <div className="flex items-center gap-1 mb-1">
                  <i className="fa-solid fa-layer-group text-pink-400 text-[8px]" />
                  <span className="text-pink-400 text-[8px] font-bold">FX Chain ({fxChain.length})</span>
                  <button onClick={() => setFxChain([])} className="ml-auto text-gray-600 hover:text-red-400 text-[7px]">
                    <i className="fa-solid fa-trash text-[7px]" /> Clear
                  </button>
                </div>
                <div className="flex flex-wrap gap-1">
                  {fxChain.map(id => {
                    const fx = ALL_FX.find(f => f.id === id);
                    if (!fx) return null;
                    return (
                      <div key={id} className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[7px] border"
                        style={{ background: `${fx.color}15`, borderColor: `${fx.color}40`, color: fx.color }}>
                        <i className={`fa-solid ${fx.icon} text-[7px]`} />
                        {fx.label}
                        <button onClick={() => removeFxFromChain(id)} className="ml-0.5 text-gray-600 hover:text-red-400">
                          <i className="fa-solid fa-xmark text-[7px]" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ══ PRESETS TAB ══ */}
      {activeTab === 'fix' && (
        <div className="flex-1 overflow-y-auto custom-scrollbar p-1.5 space-y-1">

          <p className="text-[8px] text-gray-500 px-1 mb-1 flex items-center gap-1">
            <i className="fa-solid fa-bolt text-yellow-500" /> {smartPresetLabel}
          </p>

          <div className="grid grid-cols-2 gap-1">
            {smartPresets.map(p => {
              const isApplied = appliedPreset === p.id;
              return (
                <button
                  key={p.id}
                  onClick={() => applyPreset(p)}
                  className={`flex items-center gap-1.5 p-2 rounded-lg border text-left transition-all ${
                    isApplied
                      ? 'border-green-500/60 bg-green-900/20 text-green-300'
                      : 'border-gray-800 bg-[#0a0f1d] hover:bg-[#0f172a] hover:border-gray-600 text-gray-300'
                  }`}
                >
                  <i className={`fa-solid ${p.icon} text-[11px]`} style={{ color: isApplied ? '#4ade80' : p.color }} />
                  <div>
                    <p className="text-[8px] font-bold leading-none">{p.label}</p>
                    {isApplied && <p className="text-[7px] text-green-400 mt-0.5">✓ Applied</p>}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Style Packs — type-aware */}
          <div className="mt-2">
            <p className="text-[8px] text-gray-500 px-1 mb-1 flex items-center gap-1">
              <i className="fa-solid fa-wand-magic-sparkles text-purple-400" /> Style Packs
            </p>
            <div className="flex flex-wrap gap-1">
              {(clipType === 'audio'
                ? ['Podcast', 'Music', 'ASMR', 'Documentary', 'Gaming']
                : clipType === 'image'
                ? ['Instagram', 'Portfolio', 'Wedding', 'Editorial', 'Product']
                : clipType === 'text'
                ? ['Minimal', 'Bold', 'Retro', 'Neon', 'Elegant']
                : ['TikTok', 'YouTube', 'Documentary', 'Music Video', 'News']
              ).map(style => (
                <button
                  key={style}
                  onClick={() => runCmd(`style ${style.toLowerCase()}`)}
                  className="px-2 py-1 rounded text-[7px] bg-gray-800/60 hover:bg-purple-900/30 text-gray-400 hover:text-purple-300 border border-gray-700 hover:border-purple-600 transition-all"
                >
                  {style}
                </button>
              ))}
            </div>
          </div>

          {/* Random FX */}
          <button
            onClick={() => {
              const random = ALL_FX[Math.floor(Math.random() * ALL_FX.length)];
              applyFx(random);
            }}
            className="w-full flex items-center justify-center gap-2 py-2 rounded-lg border border-dashed border-gray-700 hover:border-pink-500/40 text-gray-500 hover:text-pink-400 transition-all mt-1"
          >
            <i className="fa-solid fa-shuffle text-[9px]" />
            <span className="text-[8px]">Random Effect</span>
          </button>
        </div>
      )}

      {/* ══ ANIMATE TAB ══ */}
      {activeTab === 'animate' && (
        <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-3">
          <div className="bg-[#0a0f1d] border border-gray-800 rounded-lg p-2">
             <p className="text-[9px] font-bold text-gray-300 mb-2 border-b border-gray-800 pb-1 flex items-center gap-1">
               <i className="fa-solid fa-arrow-right-to-bracket text-green-400" />
               حركة الدخول (In)
             </p>
             <div className="grid grid-cols-2 gap-1">
               {['none', 'fade', 'pop', 'zoomIn', 'slideInLeft', 'slideInRight'].map(anim => (
                 <button key={anim}
                   onClick={() => { setEnterAnim(anim); applyTransition(anim, exitAnim, parseFloat(animDuration)); }}
                   className={`px-2 py-1.5 rounded text-[8px] transition-all capitalize ${enterAnim === anim ? 'bg-green-600/20 border border-green-500 text-green-400' : 'bg-[#0f172a] border border-gray-800 hover:border-gray-600 text-gray-400'}`}>
                   {anim === 'none' ? 'لا شيء' : anim}
                 </button>
               ))}
             </div>
          </div>

          <div className="bg-[#0a0f1d] border border-gray-800 rounded-lg p-2">
             <p className="text-[9px] font-bold text-gray-300 mb-2 border-b border-gray-800 pb-1 flex items-center gap-1">
               <i className="fa-solid fa-arrow-right-from-bracket text-red-400" />
               حركة الخروج (Out)
             </p>
             <div className="grid grid-cols-2 gap-1">
               {['none', 'fade', 'pop', 'zoomOut', 'slideOutLeft', 'slideOutRight'].map(anim => (
                 <button key={anim}
                   onClick={() => { setExitAnim(anim); applyTransition(enterAnim, anim, parseFloat(animDuration)); }}
                   className={`px-2 py-1.5 rounded text-[8px] transition-all capitalize ${exitAnim === anim ? 'bg-red-600/20 border border-red-500 text-red-400' : 'bg-[#0f172a] border border-gray-800 hover:border-gray-600 text-gray-400'}`}>
                   {anim === 'none' ? 'لا شيء' : anim}
                 </button>
               ))}
             </div>
          </div>

          <div className="bg-[#0a0f1d] border border-gray-800 rounded-lg p-2">
             <p className="text-[8px] text-gray-400 mb-1 flex items-center justify-between">
               <span>المدة (Duration):</span>
               <span className="font-mono text-purple-400">{animDuration}s</span>
             </p>
             <input type="range" min="0.1" max="3.0" step="0.1" value={animDuration}
               onChange={e => {
                 setAnimDuration(e.target.value);
                 applyTransition(enterAnim, exitAnim, parseFloat(e.target.value));
               }}
               className="w-full accent-purple-500 h-1 bg-gray-800 rounded-full appearance-none mt-2"
             />
          </div>
        </div>
      )}

      {/* ══ EXPORT TAB ══ */}
      {activeTab === 'export' && (
        <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-2">

          {/* Platform quick buttons */}
          <div>
            <p className="text-[7px] text-gray-600 mb-1">Platform</p>
            <div className="grid grid-cols-2 gap-1">
              {PLATFORMS.map(p => (
                <button
                  key={p.id}
                  onClick={() => runCmd(p.cmd)}
                  className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg bg-[#0a0f1d] hover:bg-[#0f172a] border border-gray-800 hover:border-gray-600 transition-all"
                >
                  <i className={`${p.brand ? 'fa-brands' : 'fa-solid'} ${p.icon} text-[11px]`} style={{ color: p.color }} />
                  <span className="text-[8px] text-gray-300">{p.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Format */}
          <div>
            <p className="text-[7px] text-gray-600 mb-1">Format</p>
            <div className="flex gap-1">
              {['mp4', 'webm', 'gif'].map(f => (
                <button key={f} onClick={() => setExpFormat(f)}
                  className={`flex-1 py-1 rounded text-[8px] uppercase font-mono transition-all ${expFormat === f ? 'bg-indigo-600 text-white' : 'bg-gray-800/60 text-gray-500 hover:text-gray-300'}`}>
                  {f}
                </button>
              ))}
            </div>
          </div>

          {/* Resolution */}
          <div>
            <p className="text-[7px] text-gray-600 mb-1">Resolution</p>
            <div className="flex gap-1">
              {['4K', '1080p', '720p', '480p'].map(r => (
                <button key={r} onClick={() => setExpRes(r)}
                  className={`flex-1 py-1 rounded text-[7px] font-mono transition-all ${expRes === r ? 'bg-indigo-600 text-white' : 'bg-gray-800/60 text-gray-500 hover:text-gray-300'}`}>
                  {r}
                </button>
              ))}
            </div>
          </div>

          {/* FPS */}
          <div>
            <p className="text-[7px] text-gray-600 mb-1">Frame Rate</p>
            <div className="flex gap-1">
              {['24', '30', '60'].map(f => (
                <button key={f} onClick={() => setExpFps(f)}
                  className={`flex-1 py-1 rounded text-[8px] font-mono transition-all ${expFps === f ? 'bg-indigo-600 text-white' : 'bg-gray-800/60 text-gray-500 hover:text-gray-300'}`}>
                  {f} fps
                </button>
              ))}
            </div>
          </div>

          {/* Quality */}
          <div>
            <p className="text-[7px] text-gray-600 mb-1">Quality</p>
            <div className="flex gap-1">
              {[['high', 'text-green-400'], ['medium', 'text-yellow-400'], ['low', 'text-red-400']].map(([q, c]) => (
                <button key={q} onClick={() => setExpQuality(q)}
                  className={`flex-1 py-1 rounded text-[7px] capitalize transition-all ${expQuality === q ? `bg-gray-700 ${c}` : 'bg-gray-800/60 text-gray-600 hover:text-gray-300'}`}>
                  {q}
                </button>
              ))}
            </div>
          </div>

          {/* Export button */}
          <button
            onClick={doExport}
            className="w-full py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-[9px] flex items-center justify-center gap-2 shadow-lg shadow-purple-900/40 transition-all hover:scale-[1.02] mt-2"
          >
            <i className="fa-solid fa-file-export text-[11px]" />
            Export {expRes} {expFormat.toUpperCase()} @ {expFps}fps
          </button>

          {/* Estimated size hint */}
          <p className="text-center text-[7px] text-gray-700">
            Est. size: {expQuality === 'high' ? '~800MB' : expQuality === 'medium' ? '~350MB' : '~120MB'} for 10min • {expRes}
          </p>
        </div>
      )}
    </div>
  );
}
