// @ts-nocheck
import React, { useEffect, useRef, useState } from 'react';
import { useEditorStore } from '../../../store/useEditorStore';
import { QuickFxPanel } from '../panels/QuickFxPanel';

/* ─────────────────────────────────────────────────────────────
   Helper: get the first selected clip from the store
───────────────────────────────────────────────────────────── */
function useSelectedClip() {
  const selectedClipIds = useEditorStore(s => s.selectedClipIds);
  const tracks = useEditorStore(s => s.tracks);
  if (selectedClipIds.size === 0) return null;
  const id = Array.from(selectedClipIds)[0] as string;
  for (const t of tracks) {
    const c = t.clips.find((c: any) => c.id === id);
    if (c) return c as any;
  }
  return null;
}

/* ─────────────────────────────────────────────────────────────
   applyProp — mutates clip in engine + triggers redraw
───────────────────────────────────────────────────────────── */
function applyProp(propKey: string, value: any) {
  const app = (window as any).app;
  if (!app) return;
  const ids = Array.from(app.selectedClipIds || []) as string[];
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
  const ids = Array.from(app.selectedClipIds || []) as string[];
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

/* ─────────────────────────────────────────────────────────────
   runCmd — dispatch command to engine
───────────────────────────────────────────────────────────── */
function runCmd(cmd: string) {
  const app = (window as any).app;
  if (!app) return;
  app.commandBuffer = cmd;
  app.isCmdFocused = true;
  document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', bubbles: true, cancelable: true }));
}

/* ─────────────────────────────────────────────────────────────
   PropSlider — live-synced range input
───────────────────────────────────────────────────────────── */
function PropSlider({ label, propKey, min, max, step = 1, unit = '', color = '#6366f1', clip, isText = false }: any) {
  const getLiveVal = () => {
    if (isText) return clip?.textStyle?.[propKey] ?? 0;
    if (propKey === 'opacity' || propKey === 'scale') return clip?.properties?.[propKey] ?? 100;
    return clip?.properties?.[propKey] ?? 0;
  };
  const [val, setVal] = useState(getLiveVal());

  // Sync whenever the clip changes OR the underlying property changes (e.g. after Reset)
  const liveVal = getLiveVal();
  useEffect(() => {
    setVal(liveVal);
  }, [clip?.id, propKey, liveVal]);

  const handle = (v: number) => {
    setVal(v);
    if (isText) applyTextStyle(propKey, v);
    else applyProp(propKey, v);
  };

  const pct = ((val - min) / (max - min)) * 100;

  return (
    <div className="flex items-center gap-2 py-[3px] group">
      <span className="text-[9px] text-gray-500 w-[68px] flex-shrink-0 truncate group-hover:text-gray-400 transition-colors">{label}</span>
      <div className="flex-1 relative">
        <div className="absolute inset-y-0 left-0 rounded-full pointer-events-none" style={{ width: `${Math.max(0, Math.min(100, pct))}%`, background: color, opacity: 0.35, height: '6px', top: '50%', transform: 'translateY(-50%)' }} />
        <input
          type="range" min={min} max={max} step={step} value={val}
          onChange={e => handle(parseFloat(e.target.value))}
          className="w-full h-[6px] rounded-full appearance-none cursor-pointer bg-[#1e293b] relative z-10"
          style={{ accentColor: color }}
        />
      </div>
      <span className="text-[9px] text-gray-300 w-10 text-right font-mono tabular-nums">{typeof val === 'number' && !Number.isInteger(val) ? val.toFixed(1) : val}{unit}</span>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   Small action button
───────────────────────────────────────────────────────────── */
function ActionBtn({ label, icon, onClick, active = false, color = '#6366f1' }: any) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1 px-2 py-1 rounded text-[9px] font-semibold border transition-all duration-150 ${active ? 'border-transparent text-white' : 'border-gray-700 text-gray-400 hover:text-gray-200 hover:border-gray-500'}`}
      style={active ? { background: color, borderColor: color } : {}}
    >
      {icon && <i className={`fa-solid ${icon} text-[8px]`} />}
      {label}
    </button>
  );
}

/* ─────────────────────────────────────────────────────────────
   SectionLabel
───────────────────────────────────────────────────────────── */
function Section({ title, children }: any) {
  return (
    <div className="mb-3">
      <div className="text-[8px] uppercase tracking-widest text-gray-600 font-bold mb-1 px-0.5">{title}</div>
      <div className="bg-[#0d1526] border border-[#1e293b] rounded-lg px-2 py-1.5">{children}</div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   TypeOnlyState — empty state for wrong clip type
───────────────────────────────────────────────────────────── */
function TypeOnlyState({ icon, typeName }: { icon: string; typeName: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-8 gap-2 text-center">
      <div className="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center">
        <i className={`fa-solid ${icon} text-gray-600 text-lg`} />
      </div>
      <p className="text-[9px] text-gray-600 leading-relaxed">Select a <span className="text-gray-400 font-semibold">{typeName}</span> clip<br/>to use this tab</p>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   Inline Toggle helper (reusable)
───────────────────────────────────────────────────────────── */
function Toggle({ label, checked, onChange, color = '#38bdf8' }: any) {
  return (
    <div className="flex items-center justify-between py-1">
      <span className="text-[9px] text-gray-400">{label}</span>
      <label className="relative inline-flex items-center cursor-pointer">
        <input type="checkbox" className="sr-only peer" checked={!!checked} onChange={e => onChange(e.target.checked)} />
        <div
          className="w-7 h-4 rounded-full bg-gray-700 peer-checked:transition-colors after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:w-3 after:h-3 after:rounded-full after:bg-white after:transition-transform peer-checked:after:translate-x-3"
          style={{ ['--tw-peer-checked-bg' as any]: color }}
        />
      </label>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   TAB: Transform
───────────────────────────────────────────────────────────── */
function TransformTab({ clip }: any) {
  const flipH = clip?.properties?.flipH ?? false;
  const flipV = clip?.properties?.flipV ?? false;

  const resetTransform = () => {
    ['positionX', 'positionY', 'scale', 'opacity', 'rotation', 'flipH', 'flipV'].forEach(k => {
      const def = k === 'scale' || k === 'opacity' ? 100 : (k === 'flipH' || k === 'flipV' ? false : 0);
      applyProp(k, def);
    });
  };

  return (
    <div>
      <Section title="Position">
        <PropSlider label="X" propKey="positionX" min={-960} max={960} step={1} unit="px" color="#6366f1" clip={clip} />
        <PropSlider label="Y" propKey="positionY" min={-540} max={540} step={1} unit="px" color="#6366f1" clip={clip} />
      </Section>
      <Section title="Transform">
        <PropSlider label="Scale" propKey="scale" min={10} max={400} step={1} unit="%" color="#8b5cf6" clip={clip} />
        <PropSlider label="Opacity" propKey="opacity" min={0} max={100} step={1} unit="%" color="#a78bfa" clip={clip} />
        <PropSlider label="Rotation" propKey="rotation" min={-180} max={180} step={0.5} unit="°" color="#c4b5fd" clip={clip} />
      </Section>
      <Section title="Flip">
        <div className="flex gap-2">
          <ActionBtn label="Flip H" icon="fa-left-right" active={flipH} color="#6366f1" onClick={() => applyProp('flipH', !flipH)} />
          <ActionBtn label="Flip V" icon="fa-up-down" active={flipV} color="#6366f1" onClick={() => applyProp('flipV', !flipV)} />
        </div>
      </Section>
      <button
        onClick={resetTransform}
        className="w-full mt-1 py-1.5 rounded-lg border border-gray-700 text-gray-400 hover:text-white hover:border-gray-500 text-[9px] font-semibold transition-all duration-150 hover:bg-[#1e293b]/50 flex items-center justify-center gap-1.5"
      >
        <i className="fa-solid fa-rotate-left text-[9px]" />
        Reset Transform
      </button>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   TAB: Color
───────────────────────────────────────────────────────────── */
const COLOR_PRESETS = [
  { label: 'B&W',       icon: 'fa-circle-half-stroke', props: { saturation: 0, brightness: 110, contrast: 120 } },
  { label: 'Cine',      icon: 'fa-film',               props: { brightness: 95, contrast: 115, saturation: 80, colorTemp: -10 } },
  { label: 'Warm',      icon: 'fa-sun',                props: { colorTemp: 60, brightness: 108, saturation: 110 } },
  { label: 'Cool',      icon: 'fa-snowflake',          props: { colorTemp: -60, brightness: 105, saturation: 90 } },
  { label: 'Fade',      icon: 'fa-cloud',              props: { brightness: 130, contrast: 80, saturation: 70 } },
  { label: 'Punch',     icon: 'fa-bolt',               props: { contrast: 150, saturation: 160, brightness: 100 } },
];

function ColorTab({ clip }: any) {
  const applyPreset = (props: Record<string, number>) => {
    Object.entries(props).forEach(([k, v]) => applyProp(k, v));
  };

  return (
    <div>
      <Section title="Tone">
        <PropSlider label="Brightness" propKey="brightness" min={50} max={200} step={1} unit="" color="#f59e0b" clip={clip} />
        <PropSlider label="Contrast"   propKey="contrast"   min={50} max={200} step={1} unit="" color="#ef4444" clip={clip} />
        <PropSlider label="Exposure"   propKey="exposure"   min={-100} max={100} step={1} unit="" color="#f97316" clip={clip} />
      </Section>
      <Section title="Color">
        <PropSlider label="Saturation" propKey="saturation" min={0} max={300} step={1} unit="" color="#ec4899" clip={clip} />
        <PropSlider label="Hue Rotate" propKey="hueRotate"  min={0} max={360} step={1} unit="°" color="#a855f7" clip={clip} />
        <PropSlider label="Temp"       propKey="colorTemp"  min={-100} max={100} step={1} unit="" color="#38bdf8" clip={clip} />
      </Section>
      <Section title="Presets">
        <div className="grid grid-cols-3 gap-1">
          {COLOR_PRESETS.map(p => (
            <button
              key={p.label}
              onClick={() => applyPreset(p.props)}
              className="flex flex-col items-center gap-0.5 py-1.5 px-1 rounded border border-gray-700 hover:border-indigo-500 text-gray-400 hover:text-white transition-all duration-150 text-[8px] font-semibold hover:bg-indigo-500/10"
            >
              <i className={`fa-solid ${p.icon} text-[10px]`} />
              {p.label}
            </button>
          ))}
        </div>
      </Section>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   TAB: Audio
───────────────────────────────────────────────────────────── */
const EQ_PRESETS = [
  { label: 'Bass Boost', props: { audioBass: 6, audisTreble: 0 } },
  { label: 'Treble',     props: { audioBass: 0, audisTreble: 6 } },
  { label: 'Flat',       props: { audioBass: 0, audisTreble: 0 } },
  { label: 'Voice',      props: { audioBass: -3, audisTreble: 3 } },
];

function AudioTab({ clip }: any) {
  const isAudio = clip?.type === 'audio';

  const normalize = () => {
    applyProp('volume', 100);
    applyProp('audioPan', 0);
  };

  return (
    <div>
      {!isAudio && (
        <div className="mb-2 px-2 py-1.5 bg-yellow-500/10 border border-yellow-500/20 rounded-lg text-[9px] text-yellow-400 flex items-center gap-1.5">
          <i className="fa-solid fa-triangle-exclamation" />
          Video clip — audio properties may not apply
        </div>
      )}
      <Section title="Levels">
        <PropSlider label="Volume"   propKey="volume"    min={0} max={200} step={1} unit="%" color="#10b981" clip={clip} />
        <PropSlider label="Pan"      propKey="audioPan"  min={-100} max={100} step={1} unit="" color="#34d399" clip={clip} />
      </Section>
      <Section title="Fade">
        <PropSlider label="Fade In"  propKey="fadeIn"   min={0} max={10} step={0.1} unit="s" color="#6ee7b7" clip={clip} />
        <PropSlider label="Fade Out" propKey="fadeOut"  min={0} max={10} step={0.1} unit="s" color="#6ee7b7" clip={clip} />
      </Section>
      <Section title="Pitch">
        <PropSlider label="Semitones" propKey="audioPitch" min={-12} max={12} step={0.5} unit=" st" color="#22d3ee" clip={clip} />
      </Section>
      <Section title="EQ Presets">
        <div className="grid grid-cols-2 gap-1">
          {EQ_PRESETS.map(p => (
            <button
              key={p.label}
              onClick={() => Object.entries(p.props).forEach(([k, v]) => applyProp(k, v))}
              className="py-1.5 rounded border border-gray-700 hover:border-emerald-500 text-gray-400 hover:text-white transition-all text-[9px] font-semibold hover:bg-emerald-500/10"
            >
              {p.label}
            </button>
          ))}
        </div>
      </Section>
      <button
        onClick={normalize}
        className="w-full mt-1 py-1.5 rounded-lg border border-gray-700 text-gray-400 hover:text-white hover:border-emerald-500 text-[9px] font-semibold transition-all duration-150 hover:bg-emerald-500/10 flex items-center justify-center gap-1.5"
      >
        <i className="fa-solid fa-wave-square text-[9px]" />
        Normalize
      </button>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   TAB: Text
───────────────────────────────────────────────────────────── */
function TextTab({ clip }: any) {
  const isText = clip?.type === 'text';
  const ts = clip?.textStyle || {};
  const [bold,      setBold]      = useState(ts.fontWeight === 'bold');
  const [italic,    setItalic]    = useState(ts.fontStyle === 'italic');
  const [underline, setUnderline] = useState(ts.textDecoration === 'underline');
  const [align,     setAlign]     = useState(ts.textAlign || 'left');
  const [color,     setColor]     = useState(ts.color || '#ffffff');
  const [bgColor,   setBgColor]   = useState(ts.backgroundColor || '#00000000');

  useEffect(() => {
    const ts2 = clip?.textStyle || {};
    setBold(ts2.fontWeight === 'bold');
    setItalic(ts2.fontStyle === 'italic');
    setUnderline(ts2.textDecoration === 'underline');
    setAlign(ts2.textAlign || 'left');
    setColor(ts2.color || '#ffffff');
    setBgColor(ts2.backgroundColor || '#000000');
  }, [clip?.id]);

  if (!isText) {
    return (
      <div className="flex flex-col items-center justify-center py-10 gap-3 text-center">
        <div className="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center">
          <i className="fa-solid fa-font text-gray-600 text-lg" />
        </div>
        <p className="text-[9px] text-gray-600 leading-relaxed">Select a <span className="text-gray-400 font-semibold">Text</span> clip<br/>to edit typography</p>
      </div>
    );
  }

  const toggleBold      = () => { const n = !bold;      setBold(n);      applyTextStyle('fontWeight',     n ? 'bold' : 'normal'); };
  const toggleItalic    = () => { const n = !italic;    setItalic(n);    applyTextStyle('fontStyle',      n ? 'italic' : 'normal'); };
  const toggleUnderline = () => { const n = !underline; setUnderline(n); applyTextStyle('textDecoration', n ? 'underline' : 'none'); };
  const setAlignment    = (a: string) => { setAlign(a);   applyTextStyle('textAlign', a); };
  const handleColor     = (c: string) => { setColor(c);   applyTextStyle('color', c); };
  const handleBgColor   = (c: string) => { setBgColor(c); applyTextStyle('backgroundColor', c); };

  return (
    <div>
      <Section title="Size & Spacing">
        <PropSlider label="Font Size"     propKey="fontSize"       min={12}  max={200} step={1}   unit="px" color="#f472b6" clip={clip} isText />
        <PropSlider label="Letter Spacing" propKey="letterSpacing" min={-5}  max={30}  step={0.5} unit="px" color="#e879f9" clip={clip} isText />
        <PropSlider label="Line Height"   propKey="lineHeight"     min={0.5} max={3.0} step={0.1} unit="x"  color="#c084fc" clip={clip} isText />
      </Section>
      <Section title="Style">
        <div className="flex gap-1.5 mb-2">
          <ActionBtn label="B"  active={bold}      color="#f472b6" onClick={toggleBold} />
          <ActionBtn label="I"  active={italic}    color="#f472b6" onClick={toggleItalic} />
          <ActionBtn label="U"  active={underline} color="#f472b6" onClick={toggleUnderline} />
        </div>
        <div className="flex gap-1">
          {['left','center','right'].map(a => (
            <ActionBtn key={a} icon={`fa-align-${a}`} label="" active={align === a} color="#f472b6" onClick={() => setAlignment(a)} />
          ))}
        </div>
      </Section>
      <Section title="Colors">
        <div className="flex items-center gap-2 py-1">
          <span className="text-[9px] text-gray-500 w-[68px]">Text Color</span>
          <input type="color" value={color} onChange={e => handleColor(e.target.value)} className="w-6 h-6 rounded cursor-pointer border border-gray-700 bg-transparent" />
          <span className="text-[9px] text-gray-400 font-mono">{color}</span>
        </div>
        <div className="flex items-center gap-2 py-1">
          <span className="text-[9px] text-gray-500 w-[68px]">Background</span>
          <input type="color" value={bgColor.length === 9 ? bgColor.slice(0,7) : bgColor} onChange={e => handleBgColor(e.target.value)} className="w-6 h-6 rounded cursor-pointer border border-gray-700 bg-transparent" />
          <span className="text-[9px] text-gray-400 font-mono">{bgColor.slice(0,7)}</span>
        </div>
      </Section>
      <Section title="Shadow & Outline">
        <PropSlider label="Shadow Blur" propKey="shadowBlur"    min={0} max={30} step={1} unit="px" color="#a78bfa" clip={clip} isText />
        <PropSlider label="Outline"     propKey="strokeWidth"   min={0} max={20} step={1} unit="px" color="#818cf8" clip={clip} isText />
        <div className="flex items-center gap-2 py-1 mt-1">
          <span className="text-[9px] text-gray-500 w-[68px]">Outline Color</span>
          <input type="color" value={clip?.textStyle?.strokeColor || '#000000'} onChange={e => applyTextStyle('strokeColor', e.target.value)} className="w-6 h-6 rounded cursor-pointer border border-gray-700 bg-transparent" />
          <span className="text-[9px] text-gray-400 font-mono">{clip?.textStyle?.strokeColor || '#000000'}</span>
        </div>
      </Section>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   TAB: Speed
───────────────────────────────────────────────────────────── */
function SpeedTab({ clip }: any) {
  const speed   = clip?.properties?.playbackSpeed ?? 100;
  const reverse = clip?.properties?.reverse ?? false;
  const frameBlend = clip?.properties?.frameBlend ?? false;
  const baseDur = clip?.duration ?? 0;
  const computedDur = baseDur > 0 ? (baseDur / (speed / 100)).toFixed(2) : '—';

  const freezeFrame = () => {
    const app = (window as any).app;
    if (app?.executeCommand) app.executeCommand('freeze');
    else applyProp('frozen', true);
  };

  return (
    <div>
      <Section title="Playback">
        <PropSlider label="Speed" propKey="playbackSpeed" min={1} max={400} step={1} unit="%" color="#38bdf8" clip={clip} />
        <div className="flex items-center justify-between py-1 mt-0.5">
          <span className="text-[9px] text-gray-500">Output Duration</span>
          <span className="text-[9px] text-sky-400 font-mono tabular-nums">{computedDur}s</span>
        </div>
      </Section>
      <Section title="Options">
        <div className="flex items-center justify-between py-1">
          <span className="text-[9px] text-gray-400">Reverse</span>
          <label className="relative inline-flex items-center cursor-pointer">
            <input type="checkbox" className="sr-only peer" checked={reverse} onChange={e => applyProp('reverse', e.target.checked)} />
            <div className="w-7 h-4 rounded-full bg-gray-700 peer-checked:bg-sky-500 transition-colors after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:w-3 after:h-3 after:rounded-full after:bg-white after:transition-transform peer-checked:after:translate-x-3" />
          </label>
        </div>
        <div className="flex items-center justify-between py-1">
          <span className="text-[9px] text-gray-400">Frame Blend</span>
          <label className="relative inline-flex items-center cursor-pointer">
            <input type="checkbox" className="sr-only peer" checked={frameBlend} onChange={e => applyProp('frameBlend', e.target.checked)} />
            <div className="w-7 h-4 rounded-full bg-gray-700 peer-checked:bg-sky-500 transition-colors after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:w-3 after:h-3 after:rounded-full after:bg-white after:transition-transform peer-checked:after:translate-x-3" />
          </label>
        </div>
      </Section>
      <button
        onClick={freezeFrame}
        className="w-full mt-1 py-1.5 rounded-lg border border-gray-700 text-gray-400 hover:text-white hover:border-sky-500 text-[9px] font-semibold transition-all duration-150 hover:bg-sky-500/10 flex items-center justify-center gap-1.5"
      >
        <i className="fa-solid fa-pause text-[9px]" />
        Freeze Frame
      </button>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   TAB 6: Spectrum — Audio Spectrum (audio/video only)
───────────────────────────────────────────────────────────── */
function SpectrumTab({ clip }: any) {
  const clipType = clip?.type ?? '';
  const isValid = clipType === 'audio' || clipType === 'video';

  if (!isValid) return <TypeOnlyState icon="fa-wave-square" typeName="audio or video" />;

  const deNoise  = clip?.properties?.deNoise  ?? false;
  const deReverb = clip?.properties?.deReverb ?? false;
  const monoMix  = clip?.properties?.monoMix  ?? false;

  return (
    <div>
      <Section title="EQ Bands">
        <PropSlider label="Sub Bass" propKey="eqSub"  min={-12} max={12} step={0.5} unit=" dB" color="#0891b2" clip={clip} />
        <PropSlider label="Bass"     propKey="eqBass" min={-12} max={12} step={0.5} unit=" dB" color="#06b6d4" clip={clip} />
        <PropSlider label="Mid"      propKey="eqMid"  min={-12} max={12} step={0.5} unit=" dB" color="#22d3ee" clip={clip} />
        <PropSlider label="High"     propKey="eqHigh" min={-12} max={12} step={0.5} unit=" dB" color="#67e8f9" clip={clip} />
        <PropSlider label="Air"      propKey="eqAir"  min={-12} max={12} step={0.5} unit=" dB" color="#a5f3fc" clip={clip} />
      </Section>
      <Section title="Compressor">
        <PropSlider label="Threshold"  propKey="compThreshold" min={-60}  max={0}    step={1}   unit=" dB" color="#0ea5e9" clip={clip} />
        <PropSlider label="Ratio"      propKey="compRatio"     min={1}    max={20}   step={0.5} unit=":1"  color="#38bdf8" clip={clip} />
        <PropSlider label="Attack"     propKey="compAttack"    min={0}    max={100}  step={1}   unit=" ms" color="#7dd3fc" clip={clip} />
        <PropSlider label="Release"    propKey="compRelease"   min={10}   max={1000} step={10}  unit=" ms" color="#bae6fd" clip={clip} />
      </Section>
      <Section title="Spatial">
        <PropSlider label="Reverb"       propKey="reverbWet"   min={0} max={100} step={1} unit="%" color="#818cf8" clip={clip} />
        <PropSlider label="Room Size"    propKey="reverbSize"  min={0} max={100} step={1} unit="%" color="#a78bfa" clip={clip} />
        <PropSlider label="Stereo Width" propKey="stereoWidth" min={0} max={200} step={1} unit="%" color="#c4b5fd" clip={clip} />
      </Section>
      <Section title="Filters">
        <div className="flex items-center justify-between py-1">
          <span className="text-[9px] text-gray-400">De-Noise</span>
          <label className="relative inline-flex items-center cursor-pointer">
            <input type="checkbox" className="sr-only peer" checked={deNoise} onChange={() => applyProp('deNoise', !deNoise)} />
            <div className="w-7 h-4 rounded-full bg-gray-700 peer-checked:bg-cyan-500 transition-colors after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:w-3 after:h-3 after:rounded-full after:bg-white after:transition-transform peer-checked:after:translate-x-3" />
          </label>
        </div>
        <div className="flex items-center justify-between py-1">
          <span className="text-[9px] text-gray-400">De-Reverb</span>
          <label className="relative inline-flex items-center cursor-pointer">
            <input type="checkbox" className="sr-only peer" checked={deReverb} onChange={() => applyProp('deReverb', !deReverb)} />
            <div className="w-7 h-4 rounded-full bg-gray-700 peer-checked:bg-cyan-500 transition-colors after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:w-3 after:h-3 after:rounded-full after:bg-white after:transition-transform peer-checked:after:translate-x-3" />
          </label>
        </div>
        <div className="flex items-center justify-between py-1">
          <span className="text-[9px] text-gray-400">Mono Mix</span>
          <label className="relative inline-flex items-center cursor-pointer">
            <input type="checkbox" className="sr-only peer" checked={monoMix} onChange={() => applyProp('monoMix', !monoMix)} />
            <div className="w-7 h-4 rounded-full bg-gray-700 peer-checked:bg-cyan-500 transition-colors after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:w-3 after:h-3 after:rounded-full after:bg-white after:transition-transform peer-checked:after:translate-x-3" />
          </label>
        </div>
      </Section>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   TAB 7: Motion — Video Motion (video only)
───────────────────────────────────────────────────────────── */
const LUT_NAMES = ['Rec709', 'Log', 'ACES', 'Flat'];

function MotionTab({ clip }: any) {
  const clipType = clip?.type ?? '';
  if (clipType !== 'video') return <TypeOnlyState icon="fa-film" typeName="video" />;

  const stabilize         = clip?.properties?.stabilize          ?? false;
  const rollingShutterFix = clip?.properties?.rollingShutterFix  ?? false;
  const lutEnabled        = clip?.properties?.lutEnabled         ?? false;

  return (
    <div>
      <Section title="Blur & Shake">
        <PropSlider label="Motion Blur" propKey="motionBlur"  min={0} max={100} step={1} unit="%" color="#fbbf24" clip={clip} />
        <PropSlider label="Radial Blur" propKey="radialBlur"  min={0} max={100} step={1} unit="%" color="#f59e0b" clip={clip} />
      </Section>
      <Section title="Lens">
        <PropSlider label="Fisheye"      propKey="lensDistortion"     min={-100} max={100} step={1}   unit=""   color="#f97316" clip={clip} />
        <PropSlider label="Chromatic AB" propKey="chromaticAberration" min={0}   max={20}  step={0.5} unit="px" color="#ef4444" clip={clip} />
        <PropSlider label="Vignette"     propKey="vignetteStrength"    min={0}   max={100} step={1}   unit="%"  color="#dc2626" clip={clip} />
      </Section>
      <Section title="Stabilization">
        <div className="flex items-center justify-between py-1">
          <span className="text-[9px] text-gray-400">Stabilize</span>
          <label className="relative inline-flex items-center cursor-pointer">
            <input type="checkbox" className="sr-only peer" checked={stabilize} onChange={() => applyProp('stabilize', !stabilize)} />
            <div className="w-7 h-4 rounded-full bg-gray-700 peer-checked:bg-amber-500 transition-colors after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:w-3 after:h-3 after:rounded-full after:bg-white after:transition-transform peer-checked:after:translate-x-3" />
          </label>
        </div>
        <div className="flex items-center justify-between py-1">
          <span className="text-[9px] text-gray-400">Rolling Shutter Fix</span>
          <label className="relative inline-flex items-center cursor-pointer">
            <input type="checkbox" className="sr-only peer" checked={rollingShutterFix} onChange={() => applyProp('rollingShutterFix', !rollingShutterFix)} />
            <div className="w-7 h-4 rounded-full bg-gray-700 peer-checked:bg-amber-500 transition-colors after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:w-3 after:h-3 after:rounded-full after:bg-white after:transition-transform peer-checked:after:translate-x-3" />
          </label>
        </div>
        <ActionBtn label="Auto Level Horizon" icon="fa-ruler-horizontal" onClick={() => applyProp('autoLevel', true)} color="#f59e0b" />
      </Section>
      <Section title="Color Science">
        <div className="flex items-center justify-between py-1">
          <span className="text-[9px] text-gray-400">LUT Apply</span>
          <label className="relative inline-flex items-center cursor-pointer">
            <input type="checkbox" className="sr-only peer" checked={lutEnabled} onChange={() => applyProp('lutEnabled', !lutEnabled)} />
            <div className="w-7 h-4 rounded-full bg-gray-700 peer-checked:bg-amber-500 transition-colors after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:w-3 after:h-3 after:rounded-full after:bg-white after:transition-transform peer-checked:after:translate-x-3" />
          </label>
        </div>
        <PropSlider label="LUT Strength" propKey="lutStrength" min={0} max={100} step={1} unit="%" color="#d97706" clip={clip} />
        <div className="flex flex-wrap gap-1 mt-1">
          {LUT_NAMES.map(name => (
            <ActionBtn key={name} label={name} onClick={() => applyProp('lutName', name)} color="#f59e0b" />
          ))}
        </div>
      </Section>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   TAB 8: Image — Image Depth (image only)
───────────────────────────────────────────────────────────── */
function ImageTab({ clip }: any) {
  const clipType = clip?.type ?? '';

  // ALL hooks MUST come before any conditional return (Rules of Hooks)
  const [color1, setColor1] = useState(clip?.properties?.duotoneColor1 || '#6366f1');
  const [color2, setColor2] = useState(clip?.properties?.duotoneColor2 || '#f43f5e');

  useEffect(() => {
    setColor1(clip?.properties?.duotoneColor1 || '#6366f1');
    setColor2(clip?.properties?.duotoneColor2 || '#f43f5e');
  }, [clip?.id]);

  if (clipType !== 'image') return <TypeOnlyState icon="fa-image" typeName="image" />;

  const duotoneEnabled = clip?.properties?.duotoneEnabled ?? false;

  const kenBurnsPresets = [
    { label: 'Pan Left',  value: { startX: 0, startY: 0, startScale: 1.1, endX: -5, endY: 0,  endScale: 1.1 } },
    { label: 'Pan Right', value: { startX: 0, startY: 0, startScale: 1.1, endX: 5,  endY: 0,  endScale: 1.1 } },
    { label: 'Zoom In',   value: { startX: 0, startY: 0, startScale: 1,   endX: 0,  endY: 0,  endScale: 1.3 } },
    { label: 'Zoom Out',  value: { startX: 0, startY: 0, startScale: 1.3, endX: 0,  endY: 0,  endScale: 1   } },
  ];

  return (
    <div>
      <Section title="Enhancement">
        <PropSlider label="Sharpen"  propKey="sharpness" min={0}    max={200} step={1} unit=""  color="#34d399" clip={clip} />
        <PropSlider label="De-Noise" propKey="denoise"   min={0}    max={100} step={1} unit="%" color="#6ee7b7" clip={clip} />
        <PropSlider label="Clarity"  propKey="clarity"   min={-100} max={100} step={1} unit=""  color="#a7f3d0" clip={clip} />
      </Section>
      <Section title="Depth">
        <PropSlider label="BG Blur (Bokeh)" propKey="bgBlur"  min={0} max={100} step={1} unit="%" color="#10b981" clip={clip} />
        <PropSlider label="Focus Point X"   propKey="focusX"  min={0} max={100} step={1} unit="%" color="#059669" clip={clip} />
        <PropSlider label="Focus Point Y"   propKey="focusY"  min={0} max={100} step={1} unit="%" color="#047857" clip={clip} />
      </Section>
      <Section title="Ken Burns Presets">
        <div className="grid grid-cols-2 gap-1">
          {kenBurnsPresets.map(p => (
            <ActionBtn key={p.label} label={p.label} onClick={() => applyProp('kenBurns', p.value)} color="#34d399" />
          ))}
        </div>
      </Section>
      <Section title="Duotone">
        <div className="flex items-center gap-2 py-1">
          <span className="text-[9px] text-gray-500 w-[68px]">Color 1</span>
          <input type="color" value={color1} onChange={e => { setColor1(e.target.value); applyProp('duotoneColor1', e.target.value); }} className="w-6 h-6 rounded cursor-pointer border border-gray-700 bg-transparent" />
          <span className="text-[9px] text-gray-400 font-mono">{color1}</span>
        </div>
        <div className="flex items-center gap-2 py-1">
          <span className="text-[9px] text-gray-500 w-[68px]">Color 2</span>
          <input type="color" value={color2} onChange={e => { setColor2(e.target.value); applyProp('duotoneColor2', e.target.value); }} className="w-6 h-6 rounded cursor-pointer border border-gray-700 bg-transparent" />
          <span className="text-[9px] text-gray-400 font-mono">{color2}</span>
        </div>
        <div className="flex items-center justify-between py-1">
          <span className="text-[9px] text-gray-400">Enable Duotone</span>
          <label className="relative inline-flex items-center cursor-pointer">
            <input type="checkbox" className="sr-only peer" checked={duotoneEnabled} onChange={() => applyProp('duotoneEnabled', !duotoneEnabled)} />
            <div className="w-7 h-4 rounded-full bg-gray-700 peer-checked:bg-emerald-500 transition-colors after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:w-3 after:h-3 after:rounded-full after:bg-white after:transition-transform peer-checked:after:translate-x-3" />
          </label>
        </div>
      </Section>
      <button
        onClick={() => runCmd('removebg')}
        className="w-full mt-1 py-1.5 rounded-lg text-white text-[9px] font-semibold transition-all duration-150 flex items-center justify-center gap-1.5"
        style={{ background: 'linear-gradient(90deg, #059669, #34d399)' }}
      >
        <i className="fa-solid fa-scissors text-[9px]" />
        Remove Background
      </button>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   TAB 9: TextAnim — Text Animation (text only)
───────────────────────────────────────────────────────────── */
const ENTRY_ANIMS = ['None', 'Fade', 'Slide Up', 'Slide Down', 'Typewriter', 'Bounce', 'Glitch', 'Scale Up'];
const EXIT_ANIMS  = ['None', 'Fade Out', 'Slide Out', 'Shrink', 'Blur Out'];
const GRAD_DIRS   = ['→', '↓', '↗'];

function TextAnimTab({ clip }: any) {
  const clipType = clip?.type ?? '';

  // ALL hooks MUST come before any conditional return (Rules of Hooks)
  const [entryAnim, setEntryAnim] = useState(clip?.textStyle?.entryAnim   || 'None');
  const [exitAnim,  setExitAnim]  = useState(clip?.textStyle?.exitAnim    || 'None');
  const [gradFrom,  setGradFrom]  = useState(clip?.textStyle?.gradientFrom || '#6366f1');
  const [gradTo,    setGradTo]    = useState(clip?.textStyle?.gradientTo   || '#f43f5e');
  const [gradDir,   setGradDir]   = useState(clip?.textStyle?.gradientDir  || '→');
  const [glowColor, setGlowColor] = useState(clip?.textStyle?.glowColor    || '#e879f9');

  useEffect(() => {
    const ts = clip?.textStyle || {};
    setEntryAnim(ts.entryAnim   || 'None');
    setExitAnim(ts.exitAnim     || 'None');
    setGradFrom(ts.gradientFrom || '#6366f1');
    setGradTo(ts.gradientTo     || '#f43f5e');
    setGradDir(ts.gradientDir   || '→');
    setGlowColor(ts.glowColor   || '#e879f9');
  }, [clip?.id]);

  if (clipType !== 'text') return <TypeOnlyState icon="fa-text-height" typeName="text" />;

  const gradEnabled = clip?.textStyle?.gradientEnabled ?? false;

  return (
    <div>
      <Section title="Entry Animation">
        <div className="grid grid-cols-2 gap-1">
          {ENTRY_ANIMS.map(anim => (
            <ActionBtn
              key={anim}
              label={anim}
              active={entryAnim === anim}
              color="#e879f9"
              onClick={() => { setEntryAnim(anim); applyTextStyle('entryAnim', anim); }}
            />
          ))}
        </div>
      </Section>
      <Section title="Exit Animation">
        <div className="grid grid-cols-2 gap-1">
          {EXIT_ANIMS.map(anim => (
            <ActionBtn
              key={anim}
              label={anim}
              active={exitAnim === anim}
              color="#e879f9"
              onClick={() => { setExitAnim(anim); applyTextStyle('exitAnim', anim); }}
            />
          ))}
        </div>
      </Section>
      <Section title="Timing">
        <PropSlider label="Char Delay"   propKey="charDelay"    min={0}   max={500} step={10}  unit=" ms" color="#e879f9" clip={clip} isText />
        <PropSlider label="Anim Duration" propKey="animDuration" min={0.1} max={3}   step={0.1} unit="s"   color="#d946ef" clip={clip} isText />
      </Section>
      <Section title="Gradient Text">
        <div className="flex items-center gap-2 py-1">
          <span className="text-[9px] text-gray-500 w-[68px]">From</span>
          <input type="color" value={gradFrom} onChange={e => { setGradFrom(e.target.value); applyTextStyle('gradientFrom', e.target.value); }} className="w-6 h-6 rounded cursor-pointer border border-gray-700 bg-transparent" />
          <span className="text-[9px] text-gray-400 font-mono">{gradFrom}</span>
        </div>
        <div className="flex items-center gap-2 py-1">
          <span className="text-[9px] text-gray-500 w-[68px]">To</span>
          <input type="color" value={gradTo} onChange={e => { setGradTo(e.target.value); applyTextStyle('gradientTo', e.target.value); }} className="w-6 h-6 rounded cursor-pointer border border-gray-700 bg-transparent" />
          <span className="text-[9px] text-gray-400 font-mono">{gradTo}</span>
        </div>
        <div className="flex gap-1 mt-1">
          {GRAD_DIRS.map(dir => (
            <ActionBtn key={dir} label={dir} active={gradDir === dir} color="#e879f9" onClick={() => { setGradDir(dir); applyTextStyle('gradientDir', dir); }} />
          ))}
        </div>
        <div className="flex items-center justify-between py-1 mt-1">
          <span className="text-[9px] text-gray-400">Enable Gradient</span>
          <label className="relative inline-flex items-center cursor-pointer">
            <input type="checkbox" className="sr-only peer" checked={gradEnabled} onChange={() => applyTextStyle('gradientEnabled', !gradEnabled)} />
            <div className="w-7 h-4 rounded-full bg-gray-700 peer-checked:bg-fuchsia-500 transition-colors after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:w-3 after:h-3 after:rounded-full after:bg-white after:transition-transform peer-checked:after:translate-x-3" />
          </label>
        </div>
      </Section>
      <Section title="Glow & Neon">
        <PropSlider label="Glow Blur"    propKey="glowBlur"    min={0} max={50}  step={1} unit="px" color="#f0abfc" clip={clip} isText />
        <div className="flex items-center gap-2 py-1">
          <span className="text-[9px] text-gray-500 w-[68px]">Glow Color</span>
          <input type="color" value={glowColor} onChange={e => { setGlowColor(e.target.value); applyTextStyle('glowColor', e.target.value); }} className="w-6 h-6 rounded cursor-pointer border border-gray-700 bg-transparent" />
          <span className="text-[9px] text-gray-400 font-mono">{glowColor}</span>
        </div>
        <PropSlider label="Glow Opacity" propKey="glowOpacity" min={0} max={100} step={1} unit="%" color="#e879f9" clip={clip} isText />
      </Section>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   TAB 10: Keyframes Panel (all types)
───────────────────────────────────────────────────────────── */
const KF_PROPS = ['positionX', 'positionY', 'scale', 'opacity', 'rotation', 'brightness', 'volume'];
const KF_EASES = ['Linear', 'EaseIn', 'EaseOut', 'EaseInOut'];

function KeyframesTab({ clip }: any) {
  const [selectedKfProp, setSelectedKfProp] = useState('opacity');
  const [kfEase,         setKfEase]         = useState('Linear');

  const addKey = () => {
    const app = (window as any).app;
    const time = app?.currentTime ?? 0;
    applyProp('keyframe_' + time.toFixed(2), {
      time,
      prop: selectedKfProp,
      value: clip?.properties?.[selectedKfProp],
    });
  };

  const keyframeEntries = Object.entries(clip?.properties || {}).filter(([k]) => k.startsWith('keyframe_'));

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-1.5">
          <i className="fa-solid fa-diamond text-[9px] text-orange-400" />
          <span className="text-[9px] text-gray-300 font-semibold">Keyframe Editor</span>
        </div>
        <button
          onClick={addKey}
          className="flex items-center gap-1 px-2 py-1 rounded text-[9px] font-semibold border border-orange-500/40 text-orange-400 hover:bg-orange-500/10 transition-all"
        >
          <i className="fa-solid fa-plus text-[8px]" />
          Add Key
        </button>
      </div>

      {/* Property picker */}
      <Section title="Property">
        <select
          value={selectedKfProp}
          onChange={e => setSelectedKfProp(e.target.value)}
          className="w-full bg-[#0d1526] border border-[#1e293b] rounded px-2 py-1 text-[9px] text-gray-300 outline-none"
        >
          {KF_PROPS.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
      </Section>

      {/* Ease */}
      <Section title="Easing">
        <div className="flex flex-wrap gap-1">
          {KF_EASES.map(ease => (
            <ActionBtn
              key={ease}
              label={ease}
              active={kfEase === ease}
              color="#fb923c"
              onClick={() => { setKfEase(ease); applyProp('kfEase', ease); }}
            />
          ))}
        </div>
      </Section>

      {/* Nav */}
      <div className="flex gap-1 mb-3">
        <button
          onClick={() => runCmd('prevkey')}
          className="flex-1 flex items-center justify-center gap-1 py-1 rounded border border-gray-700 text-gray-400 hover:text-white hover:border-orange-500 text-[9px] font-semibold transition-all hover:bg-orange-500/10"
        >
          <i className="fa-solid fa-chevron-left text-[8px]" />
          Prev
        </button>
        <button
          onClick={() => runCmd('nextkey')}
          className="flex-1 flex items-center justify-center gap-1 py-1 rounded border border-gray-700 text-gray-400 hover:text-white hover:border-orange-500 text-[9px] font-semibold transition-all hover:bg-orange-500/10"
        >
          Next
          <i className="fa-solid fa-chevron-right text-[8px]" />
        </button>
      </div>

      {/* Keyframe list */}
      <Section title="Keyframes">
        {keyframeEntries.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-4 gap-2 text-center">
            <i className="fa-solid fa-diamond text-gray-700 text-lg" />
            <p className="text-[9px] text-gray-600">No keyframes yet</p>
          </div>
        ) : (
          <div className="flex flex-col gap-1">
            {keyframeEntries.map(([key, val]: [string, any]) => (
              <div key={key} className="flex items-center justify-between bg-[#060b14] border border-[#1e293b] rounded px-2 py-1">
                <span className="text-[8px] text-orange-400 font-mono">{val?.time?.toFixed(2) ?? '—'}s</span>
                <span className="text-[8px] text-gray-400">{val?.prop}</span>
                <span className="text-[8px] text-gray-500 font-mono">{String(val?.value ?? '')}</span>
              </div>
            ))}
          </div>
        )}
      </Section>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   Tab config — 10 tabs
───────────────────────────────────────────────────────────── */
const TABS = [
  { id: 'transform', icon: 'fa-arrows-up-down-left-right', label: 'Transform', color: '#6366f1' },
  { id: 'color',     icon: 'fa-palette',                   label: 'Color',     color: '#f59e0b' },
  { id: 'audio',     icon: 'fa-music',                     label: 'Audio',     color: '#10b981' },
  { id: 'text',      icon: 'fa-font',                      label: 'Text',      color: '#f472b6' },
  { id: 'speed',     icon: 'fa-gauge-high',                label: 'Speed',     color: '#38bdf8' },
  { id: 'spectrum',  icon: 'fa-wave-square',               label: 'Spectrum',  color: '#22d3ee' },
  { id: 'motion',    icon: 'fa-film',                      label: 'Motion',    color: '#f59e0b' },
  { id: 'image',     icon: 'fa-image',                     label: 'Image',     color: '#34d399' },
  { id: 'textanim',  icon: 'fa-text-height',               label: 'Animate',   color: '#e879f9' },
  { id: 'keyframes', icon: 'fa-diamond',                   label: 'Keys',      color: '#fb923c' },
] as const;

type TabId = typeof TABS[number]['id'];

/* ─────────────────────────────────────────────────────────────
   Main Component
───────────────────────────────────────────────────────────── */
export default function EffectControls() {
  const [mainTab,   setMainTab]   = useState<'controls' | 'fx'>('controls');
  const [activeTab, setActiveTab] = useState<TabId>('transform');
  const clip = useSelectedClip();
  const selectedClipIds = useEditorStore(s => s.selectedClipIds);

  /* Trigger engine update when switching to controls tab */
  useEffect(() => {
    if (mainTab !== 'controls') return;
    const app = (window as any).app;
    if (!app?.updateEffectControls) return;
    const t = setTimeout(() => app.updateEffectControls(), 20);
    return () => clearTimeout(t);
  }, [selectedClipIds, mainTab]);

  const clipType  = clip?.type ?? '';
  const clipLabel = clip ? (clip.name || `${clipType.charAt(0).toUpperCase() + clipType.slice(1)} Clip`) : null;

  return (
    <div
      id="tools-panel"
      className="editor-panel glow-border-red bg-[#060b14] rounded-lg w-[240px] flex flex-col flex-shrink-0 overflow-hidden min-w-0"
      style={{ boxShadow: '0 0 0 1px #1e293b, 0 4px 32px rgba(0,0,0,0.6)' }}
    >
      {/* ── Dual top-tab bar ─────────────────────── */}
      <div className="flex border-b border-[#1e293b] flex-shrink-0 text-[8px] font-bold bg-[#060b14]">
        <button
          onClick={() => setMainTab('controls')}
          className={`flex-1 py-2 text-center transition-all flex items-center justify-center gap-1 ${mainTab === 'controls' ? 'text-purple-400 border-b-2 border-purple-500 bg-[#0a1022]' : 'text-gray-600 hover:text-gray-400'}`}
        >
          <i className="fa-solid fa-sliders text-[8px]" />
          Controls
        </button>
        <button
          onClick={() => setMainTab('fx')}
          className={`flex-1 py-2 text-center transition-all flex items-center justify-center gap-1 ${mainTab === 'fx' ? 'text-pink-400 border-b-2 border-pink-500 bg-[#0a1022]' : 'text-gray-600 hover:text-gray-400'}`}
        >
          <i className="fa-solid fa-wand-magic-sparkles text-[8px]" />
          Quick FX
        </button>
      </div>

      {/* ── Content ──────────────────────────────── */}
      {mainTab === 'fx' ? (
        <div className="flex-grow overflow-hidden"><QuickFxPanel /></div>
      ) : (
        <div id="effect-controls-panel" className="flex flex-col flex-grow overflow-hidden bg-[#060b14]" lang="en" dir="ltr">

          {/* Clip header badge */}
          {clip ? (
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 border-b border-[#1e293b] flex-shrink-0 bg-[#0a1022]">
              <i className={`fa-solid ${clipType === 'audio' ? 'fa-music' : clipType === 'text' ? 'fa-font' : 'fa-film'} text-[9px] text-indigo-400`} />
              <span className="text-[9px] text-gray-300 font-semibold truncate flex-1">{clipLabel}</span>
              <span className="text-[7px] px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wider"
                style={{
                  background: clipType === 'audio' ? '#065f46' : clipType === 'text' ? '#701a75' : '#1e1b4b',
                  color: clipType === 'audio' ? '#6ee7b7' : clipType === 'text' ? '#f0abfc' : '#a5b4fc',
                }}>
                {clipType || 'clip'}
              </span>
            </div>
          ) : null}

          {/* 10-icon tab bar — scrollable, smaller icons/labels */}
          <div className="flex border-b border-[#1e293b] flex-shrink-0 bg-[#060b14] overflow-x-auto">
            {TABS.map(t => (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                title={t.label}
                className={`flex-shrink-0 px-1 py-2 flex flex-col items-center gap-0.5 transition-all duration-150 min-w-[22px] ${activeTab === t.id ? 'border-b-2 bg-[#0a1022]' : 'border-b-2 border-transparent text-gray-600 hover:text-gray-400'}`}
                style={activeTab === t.id ? { borderColor: t.color, color: t.color } : {}}
              >
                <i className={`fa-solid ${t.icon} text-[9px]`} />
                <span className="text-[5px] font-semibold tracking-wide">{t.label}</span>
              </button>
            ))}
          </div>

          {/* No clip selected state */}
          {!clip ? (
            <div className="flex flex-col items-center justify-center flex-grow gap-3 text-center p-4">
              <div className="w-12 h-12 rounded-full bg-[#0d1526] border border-[#1e293b] flex items-center justify-center">
                <i className="fa-solid fa-layer-group text-gray-700 text-xl" />
              </div>
              <div>
                <p className="text-[10px] text-gray-500 font-semibold mb-0.5">No clip selected</p>
                <p className="text-[9px] text-gray-700">Click a clip on the timeline<br/>to edit its properties</p>
              </div>
            </div>
          ) : (
            <div className="flex-grow overflow-y-auto custom-scrollbar p-2.5">
              {activeTab === 'transform' && <TransformTab  clip={clip} />}
              {activeTab === 'color'     && <ColorTab      clip={clip} />}
              {activeTab === 'audio'     && <AudioTab      clip={clip} />}
              {activeTab === 'text'      && <TextTab       clip={clip} />}
              {activeTab === 'speed'     && <SpeedTab      clip={clip} />}
              {activeTab === 'spectrum'  && <SpectrumTab   clip={clip} />}
              {activeTab === 'motion'    && <MotionTab     clip={clip} />}
              {activeTab === 'image'     && <ImageTab      clip={clip} />}
              {activeTab === 'textanim'  && <TextAnimTab   clip={clip} />}
              {activeTab === 'keyframes' && <KeyframesTab  clip={clip} />}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
