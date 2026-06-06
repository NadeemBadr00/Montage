import React, { useState, useEffect } from 'react';
import { useEditorStore } from '../../../store/useEditorStore';

/** Quick-action button */
function FxBtn({
  icon, label, cmd, color = 'text-gray-300', title
}: { icon: string; label: string; cmd: string; color?: string; title?: string }) {
  const run = () => {
    const app = (window as any).app;
    if (!app) return;
    app.commandBuffer = cmd;
    app.isCmdFocused = true;
    document.dispatchEvent(new KeyboardEvent('keydown', {
      key: 'Enter', code: 'Enter', bubbles: true, cancelable: true,
    }));
  };
  return (
    <button
      title={title || label}
      onClick={run}
      className="flex flex-col items-center gap-0.5 p-1.5 rounded-lg bg-[#0f172a] hover:bg-[#1a2540] border border-gray-800 hover:border-gray-600 transition-all group flex-1 min-w-[44px]"
    >
      <i className={`fa-solid ${icon} text-[11px] ${color} group-hover:scale-110 transition-transform`} />
      <span className="text-[7px] text-gray-500 group-hover:text-gray-300 leading-tight text-center">{label}</span>
    </button>
  );
}

/** Section with collapsible header */
function FxSection({ title, icon, color, children, defaultOpen = false }: {
  title: string; icon: string; color: string; children: React.ReactNode; defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border border-gray-800/60 rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className={`w-full flex items-center gap-2 px-2 py-1.5 bg-[#0a0f1d] hover:bg-[#0f172a] transition-colors text-[9px] font-bold ${color}`}
      >
        <i className={`fa-solid ${icon} text-[9px]`} />
        <span className="flex-1 text-left">{title}</span>
        <i className={`fa-solid fa-chevron-${open ? 'up' : 'down'} text-[8px] text-gray-600`} />
      </button>
      {open && <div className="p-1.5 bg-[#060b14]">{children}</div>}
    </div>
  );
}

/** Slider row */
function FxSlider({ label, min, max, step = 1, defaultVal, onChange }: {
  label: string; min: number; max: number; step?: number; defaultVal: number;
  onChange: (val: number) => void;
}) {
  const [val, setVal] = useState(defaultVal);
  return (
    <div className="flex items-center gap-2 py-0.5">
      <span className="text-[8px] text-gray-500 w-14 flex-shrink-0">{label}</span>
      <input
        type="range" min={min} max={max} step={step} value={val}
        onChange={e => { const v = parseFloat(e.target.value); setVal(v); onChange(v); }}
        className="flex-1 h-1 accent-purple-500"
      />
      <span className="text-[8px] text-gray-400 w-6 text-right">{val}</span>
    </div>
  );
}

/** Apply a property to selected clips */
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

/** Apply a text style property to selected text clips */
function applyTextStyle(key: string, value: any) {
  const app = (window as any).app;
  if (!app) return;
  const ids = Array.from(app.selectedClipIds || []);
  app.tracks?.forEach((t: any) => {
    t.clips?.forEach((c: any) => {
      if (ids.includes(c.id) && c.type === 'text') {
        c.textStyle = c.textStyle || {};
        c.textStyle[key] = value;
      }
    });
  });
  app.saveState?.();
  app.requestRedraw?.();
  app.commitStateToReact?.();
}

export function QuickFxPanel() {
  const selectedClipIds = useEditorStore(s => s.selectedClipIds);
  const hasSelection = selectedClipIds.size > 0;

  const runCmd = (cmd: string) => {
    const app = (window as any).app;
    if (!app) return;
    app.commandBuffer = cmd;
    app.isCmdFocused = true;
    document.dispatchEvent(new KeyboardEvent('keydown', {
      key: 'Enter', code: 'Enter', bubbles: true, cancelable: true,
    }));
  };

  return (
    <div className="flex flex-col gap-1.5 p-1.5 text-[9px] overflow-y-auto custom-scrollbar h-full">

      {/* Header */}
      <div className="flex items-center gap-2 px-1 mb-0.5">
        <i className="fa-solid fa-wand-magic-sparkles text-purple-400 text-[10px]" />
        <span className="text-purple-300 font-bold text-[9px]">Quick FX Panel</span>
        {hasSelection && (
          <span className="ml-auto text-[7px] bg-green-900/40 text-green-400 border border-green-700/40 rounded px-1.5 py-0.5">
            {selectedClipIds.size} selected
          </span>
        )}
      </div>

      {!hasSelection && (
        <div className="text-center py-3 text-gray-600 text-[8px] border border-gray-800/50 rounded-lg">
          <i className="fa-solid fa-hand-pointer text-lg mb-1 block" />
          اختر كليب من التايم لاين<br />لتظهر أدوات التحكم
        </div>
      )}

      {/* ── Transform ── */}
      <FxSection title="Transform" icon="fa-arrows-up-down-left-right" color="text-cyan-400" defaultOpen={hasSelection}>
        <FxSlider label="Scale" min={10} max={300} defaultVal={100} onChange={v => applyProp('scale', v)} />
        <FxSlider label="Opacity" min={0} max={100} defaultVal={100} onChange={v => applyProp('opacity', v)} />
        <FxSlider label="Rotation" min={-180} max={180} defaultVal={0} onChange={v => applyProp('rotation', v)} />
        <div className="flex gap-1 mt-1">
          <FxBtn icon="fa-magnifying-glass-plus" label="Zoom In" cmd="zoom in" color="text-cyan-400" />
          <FxBtn icon="fa-magnifying-glass-minus" label="Zoom Out" cmd="zoom out" color="text-cyan-400" />
          <FxBtn icon="fa-grip" label="Grid 2×2" cmd="grid 2x2" color="text-cyan-400" />
        </div>
      </FxSection>

      {/* ── Color Grade ── */}
      <FxSection title="Color & Grade" icon="fa-palette" color="text-purple-400" defaultOpen={hasSelection}>
        <FxSlider label="Brightness" min={50} max={200} defaultVal={100} onChange={v => applyProp('brightness', v)} />
        <FxSlider label="Contrast" min={50} max={200} defaultVal={100} onChange={v => applyProp('contrast', v)} />
        <FxSlider label="Saturation" min={0} max={300} defaultVal={100} onChange={v => applyProp('saturation', v)} />
        <div className="flex flex-wrap gap-1 mt-1">
          <FxBtn icon="fa-circle-half-stroke" label="B&W" cmd="filter bw" color="text-gray-400" />
          <FxBtn icon="fa-film" label="Cinema" cmd="filter cinematic" color="text-purple-400" />
          <FxBtn icon="fa-camera-retro" label="Vintage" cmd="filter vintage" color="text-amber-400" />
          <FxBtn icon="fa-sun" label="Vivid" cmd="filter vivid" color="text-yellow-400" />
        </div>
        <div className="mt-1">
          <p className="text-[7px] text-gray-600 mb-1">AI Mood:</p>
          <div className="flex flex-wrap gap-1">
            {['happy', 'sad', 'epic', 'horror', 'cyberpunk', 'romantic'].map(m => (
              <button key={m} onClick={() => runCmd(`mood ${m}`)}
                className="text-[7px] px-1.5 py-0.5 rounded bg-gray-800 hover:bg-purple-900/50 text-gray-400 hover:text-purple-300 border border-gray-700 hover:border-purple-600 transition-all capitalize">
                {m}
              </button>
            ))}
          </div>
        </div>
      </FxSection>

      {/* ── Visual FX ── */}
      <FxSection title="Visual FX" icon="fa-magic" color="text-pink-400">
        <div className="flex flex-wrap gap-1">
          <FxBtn icon="fa-eye-slash" label="Vignette" cmd="vignette" color="text-gray-400" />
          <FxBtn icon="fa-border-top-left" label="Letterbox" cmd="letterbox" color="text-gray-400" />
          <FxBtn icon="fa-bolt" label="Glitch" cmd="glitch" color="text-green-400" />
          <FxBtn icon="fa-wind" label="Blur" cmd="blur 15" color="text-blue-400" />
          <FxBtn icon="fa-circle-dot" label="Shake" cmd="shake" color="text-orange-400" />
          <FxBtn icon="fa-scissors" label="Chroma" cmd="chroma" color="text-green-500" />
          <FxBtn icon="fa-backward" label="Reverse" cmd="reverse" color="text-yellow-400" />
          <FxBtn icon="fa-snowflake" label="Freeze" cmd="freeze" color="text-cyan-300" />
        </div>
        <div className="flex flex-wrap gap-1 mt-1">
          <FxBtn icon="fa-star" label="Flare" cmd="flare" color="text-yellow-300" />
          <FxBtn icon="fa-cloud-rain" label="Rain" cmd="rain" color="text-blue-300" />
          <FxBtn icon="fa-sparkles" label="Sparkle" cmd="sparkle" color="text-yellow-200" />
          <FxBtn icon="fa-lightbulb" label="Sweep" cmd="lightsweep" color="text-white" />
        </div>
      </FxSection>

      {/* ── Cinematic ── */}
      <FxSection title="Cinematic" icon="fa-film" color="text-orange-400">
        <div className="flex flex-wrap gap-1">
          <FxBtn icon="fa-gauge-high" label="Ramp ↑" cmd="ramp up" color="text-orange-400" />
          <FxBtn icon="fa-gauge" label="Ramp ↓" cmd="ramp down" color="text-orange-300" />
          <FxBtn icon="fa-bars" label="Progress" cmd="progress" color="text-red-400" />
          <FxBtn icon="fa-waveform-lines" label="Waveform" cmd="waveform" color="text-cyan-400" />
        </div>
        <div className="mt-1">
          <input
            type="text" placeholder="Title text..."
            className="w-full bg-[#0f172a] border border-gray-700 rounded px-2 py-1 text-[8px] text-gray-300 placeholder-gray-600 focus:outline-none focus:border-orange-500/60"
            onKeyDown={e => { if (e.key === 'Enter') { runCmd(`title ${(e.target as HTMLInputElement).value}`); (e.target as HTMLInputElement).value = ''; }}}
          />
          <p className="text-[7px] text-gray-600 mt-0.5">اكتب نص ثم Enter لإضافة عنوان سينمائي</p>
        </div>
        <div className="mt-1">
          <input
            type="number" placeholder="Countdown (seconds)" min={1} max={60} defaultValue={5}
            className="w-full bg-[#0f172a] border border-gray-700 rounded px-2 py-1 text-[8px] text-gray-300 placeholder-gray-600 focus:outline-none focus:border-orange-500/60"
            onKeyDown={e => { if (e.key === 'Enter') runCmd(`countdown ${(e.target as HTMLInputElement).value}`); }}
          />
        </div>
      </FxSection>

      {/* ── Text FX ── */}
      <FxSection title="Text FX" icon="fa-font" color="text-indigo-400">
        <FxSlider label="Font Size" min={10} max={300} defaultVal={60} onChange={v => applyTextStyle('fontSize', v)} />
        <div className="flex flex-wrap gap-1 mt-1">
          <FxBtn icon="fa-bold" label="Bold" cmd="bold" color="text-white" />
          <FxBtn icon="fa-circle-dot" label="Outline" cmd="outline #000000" color="text-black" />
          <FxBtn icon="fa-droplet" label="Shadow" cmd="shadow 15" color="text-gray-400" />
          <FxBtn icon="fa-music" label="Karaoke" cmd="karaoke" color="text-yellow-400" />
        </div>
        <div className="mt-1 flex gap-1">
          <input
            type="text" placeholder="Font name (e.g. Roboto)"
            className="flex-1 bg-[#0f172a] border border-gray-700 rounded px-2 py-1 text-[8px] text-gray-300 placeholder-gray-600 focus:outline-none focus:border-indigo-500/60"
            onKeyDown={e => { if (e.key === 'Enter') runCmd(`font ${(e.target as HTMLInputElement).value}`); }}
          />
        </div>
        <div className="flex flex-wrap gap-1 mt-1">
          <FxBtn icon="fa-closed-captioning" label="Captions" cmd="captions" color="text-yellow-400" />
          <FxBtn icon="fa-microphone" label="Voiceover" cmd="voice Hello World" color="text-purple-400" />
        </div>
      </FxSection>

      {/* ── Overlays & Branding ── */}
      <FxSection title="Overlays & Branding" icon="fa-layer-group" color="text-emerald-400">
        <div className="flex flex-wrap gap-1">
          <FxBtn icon="fa-copyright" label="Copyright" cmd="copyright" color="text-gray-400" />
          <FxBtn icon="fa-tag" label="Watermark" cmd="watermark @AI4Montage" color="text-gray-300" />
          <FxBtn icon="fa-image" label="Logo" cmd="logo" color="text-blue-400" />
        </div>
        <div className="mt-1">
          <input
            type="text" placeholder="Watermark text..."
            className="w-full bg-[#0f172a] border border-gray-700 rounded px-2 py-1 text-[8px] text-gray-300 placeholder-gray-600 focus:outline-none focus:border-emerald-500/60"
            onKeyDown={e => { if (e.key === 'Enter') { runCmd(`watermark ${(e.target as HTMLInputElement).value}`); (e.target as HTMLInputElement).value = ''; }}}
          />
        </div>
        <div className="mt-1 flex gap-1 items-center">
          <span className="text-[7px] text-gray-500">Brand Color:</span>
          <input
            type="color" defaultValue="#ff0055"
            className="w-6 h-6 rounded border border-gray-700 cursor-pointer"
            onChange={e => runCmd(`brand ${e.target.value}`)}
          />
        </div>
      </FxSection>

      {/* ── Social & Export ── */}
      <FxSection title="Social & Export" icon="fa-share-nodes" color="text-rose-400">
        <div className="flex flex-wrap gap-1">
          <FxBtn icon="fa-mobile" label="TikTok" cmd="social tiktok" color="text-white" />
          <FxBtn icon="fa-instagram" label="Instagram" cmd="social instagram" color="text-pink-400" />
          <FxBtn icon="fa-youtube" label="YouTube" cmd="social youtube" color="text-red-500" />
          <FxBtn icon="fa-play" label="Shorts" cmd="social shorts" color="text-red-400" />
        </div>
        <div className="flex flex-wrap gap-1 mt-1">
          <FxBtn icon="fa-file-export" label="Chapters" cmd="chapters" color="text-gray-300" />
          <FxBtn icon="fa-boxes-packing" label="Batch" cmd="batchexport" color="text-green-400" />
          <FxBtn icon="fa-code" label="FCPXML" cmd="export xml" color="text-orange-400" />
        </div>
      </FxSection>

      {/* ── AI Tools ── */}
      <FxSection title="AI Tools" icon="fa-robot" color="text-violet-400">
        <div className="flex flex-wrap gap-1">
          <FxBtn icon="fa-film" label="Storyboard" cmd="storyboard" color="text-violet-400" />
          <FxBtn icon="fa-broom" label="Cleanup" cmd="cleanup" color="text-gray-400" />
          <FxBtn icon="fa-cut" label="BeatMatch" cmd="beatmatch" color="text-pink-400" />
          <FxBtn icon="fa-video" label="B-Roll" cmd="broll" color="text-blue-300" />
          <FxBtn icon="fa-circle-info" label="Info" cmd="info" color="text-gray-300" />
          <FxBtn icon="fa-question-circle" label="Help" cmd="help" color="text-yellow-400" />
        </div>
      </FxSection>

    </div>
  );
}
