// @ts-nocheck
/**
 * QuickFxPanel — Phases 6-9: Complete redesign
 * - Phase 6: FX Chain + Active state + Search + Favorites + Grid layout
 * - Phase 7: Keyframe Animator tab
 * - Phase 8: One-Click Fix Presets + Style Packs
 * - Phase 9: Export Settings Quick Panel
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
  { id: 'progress',  label: 'Progress',    icon: 'fa-bars-progress',      color: '#f87171', cmd: 'progress',         cat: 'overlay' },
  { id: 'waveform',  label: 'Waveform',    icon: 'fa-waveform-lines',     color: '#22d3ee', cmd: 'waveform',         cat: 'overlay' },
  { id: 'watermark', label: 'Watermark',   icon: 'fa-tag',                color: '#9ca3af', cmd: 'watermark',        cat: 'overlay' },
  { id: 'lightsweep',label: 'Light Sweep', icon: 'fa-lightbulb',          color: '#fef9c3', cmd: 'lightsweep',       cat: 'overlay' },
];

const FX_CATS = [
  { id: 'all',     label: 'All',     icon: 'fa-th-large' },
  { id: 'visual',  label: 'Visual',  icon: 'fa-eye' },
  { id: 'speed',   label: 'Speed',   icon: 'fa-gauge-high' },
  { id: 'mood',    label: 'Mood',    icon: 'fa-face-laugh' },
  { id: 'overlay', label: 'Overlay', icon: 'fa-layer-group' },
];

/* ─── One-Click Fix Presets ───────────────────────────────────── */
const FIX_PRESETS = [
  {
    id: 'auto-levels', label: 'Auto Levels', icon: 'fa-sliders', color: '#a78bfa',
    apply: () => { applyProp('brightness', 110); applyProp('contrast', 115); applyProp('saturation', 105); }
  },
  {
    id: 'auto-color', label: 'Auto Color', icon: 'fa-palette', color: '#34d399',
    apply: () => { applyProp('saturation', 120); applyProp('colorTemp', 5); applyProp('contrast', 108); }
  },
  {
    id: 'cinematic-dark', label: 'Cinematic', icon: 'fa-film', color: '#818cf8',
    apply: () => { runCmd('filter cinematic'); applyProp('contrast', 130); applyProp('saturation', 70); }
  },
  {
    id: 'sunrise', label: 'Sunrise', icon: 'fa-cloud-sun', color: '#fbbf24',
    apply: () => { applyProp('colorTemp', 25); applyProp('brightness', 115); applyProp('saturation', 120); }
  },
  {
    id: 'night', label: 'Night', icon: 'fa-moon', color: '#6366f1',
    apply: () => { applyProp('brightness', 85); applyProp('colorTemp', -20); applyProp('contrast', 125); }
  },
  {
    id: 'normalize', label: 'Normalize Audio', icon: 'fa-volume-high', color: '#22d3ee',
    apply: () => { applyProp('volume', 100); runCmd('normalize'); }
  },
  {
    id: 'film-grain', label: 'Film Grain', icon: 'fa-spray-can', color: '#9ca3af',
    apply: () => { runCmd('grain'); applyProp('contrast', 110); }
  },
  {
    id: 'vivid-pop', label: 'Vivid Pop', icon: 'fa-sun', color: '#f59e0b',
    apply: () => { applyProp('saturation', 170); applyProp('contrast', 115); applyProp('brightness', 105); }
  },
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

  const [activeTab, setActiveTab] = useState<'fx' | 'fix' | 'export'>('fx');
  const [fxCat, setFxCat]   = useState('all');
  const [fxSearch, setFxSearch] = useState('');
  const [favorites, setFavorites] = useState<string[]>([]);
  const [fxChain, setFxChain] = useState<string[]>([]);  // active effects applied
  const [appliedPreset, setAppliedPreset] = useState<string | null>(null);

  // Export state
  const [expFormat, setExpFormat] = useState('mp4');
  const [expRes, setExpRes]       = useState('1080p');
  const [expFps, setExpFps]       = useState('30');
  const [expQuality, setExpQuality] = useState('high');

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
    return matchCat && matchSearch;
  });

  const favItems = ALL_FX.filter(fx => favorites.includes(fx.id));

  const TABS = [
    { id: 'fx',    label: 'Effects',  icon: 'fa-wand-magic-sparkles' },
    { id: 'fix',   label: 'Presets',  icon: 'fa-bolt' },
    { id: 'export',label: 'Export',   icon: 'fa-file-export' },
  ];

  return (
    <div className="flex flex-col h-full text-[9px] overflow-hidden">

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
            <i className="fa-solid fa-bolt text-yellow-500" /> One-Click Fix Presets
          </p>

          <div className="grid grid-cols-2 gap-1">
            {FIX_PRESETS.map(p => {
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

          {/* Style Packs */}
          <div className="mt-2">
            <p className="text-[8px] text-gray-500 px-1 mb-1 flex items-center gap-1">
              <i className="fa-solid fa-wand-magic-sparkles text-purple-400" /> Style Packs
            </p>
            <div className="flex flex-wrap gap-1">
              {['TikTok', 'YouTube', 'Documentary', 'Music Video', 'News'].map(style => (
                <button
                  key={style}
                  onClick={() => runCmd(`social ${style.toLowerCase().replace(' ', '')}`)}
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
