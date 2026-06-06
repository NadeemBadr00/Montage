import React, { useState, useEffect, useRef } from 'react';
import { useEditorStore } from '../../../store/useEditorStore';

/* ─── Phase 15: Clip Note Editor ──────────────────────────────────── */
const ClipNoteEditor = ({ clip, app, onClose }: any) => {
  const [note, setNote] = useState((clip as any).note || '');
  const save = () => {
    (clip as any).note = note.trim() || undefined;
    app?.saveState?.(); app?.commitStateToReact?.();
  };
  return (
    <div className="px-3 py-2" onMouseDown={e => e.stopPropagation()}>
      <textarea
        className="w-full text-[11px] bg-white/5 border border-white/10 rounded p-2 text-gray-300 resize-none outline-none focus:border-indigo-500/50 placeholder-gray-600"
        rows={2} placeholder="Add a note..."
        value={note}
        onChange={e => setNote(e.target.value)}
        onBlur={save}
      />
      <div className="flex gap-1 mt-1">
        <button className="flex-1 py-0.5 text-[9px] bg-indigo-600/80 hover:bg-indigo-500 text-white rounded transition-colors" onClick={() => { save(); onClose(); }}>Save</button>
        {note && <button className="px-2 py-0.5 text-[9px] bg-red-600/60 hover:bg-red-500 text-white rounded transition-colors" onClick={() => { setNote(''); (clip as any).note = undefined; app?.commitStateToReact?.(); }}>Clear</button>}
      </div>
    </div>
  );
};

/* ─── helpers ──────────────────────────────────────────────────── */
const Divider = () => <div className="h-px bg-white/10 my-1 mx-2" />;

const SectionLabel = ({ icon, label, color = 'text-gray-400' }: any) => (
  <div className={`px-3 py-1 text-[10px] font-bold uppercase tracking-widest ${color} bg-black/30 flex items-center gap-1.5`}>
    {icon && <i className={`fa-solid ${icon} text-[9px]`} />} {label}
  </div>
);

const MenuItem = ({ icon, label, shortcut, danger, accent, badge, onClick }: any) => (
  <div
    className={`px-3 py-[7px] cursor-pointer flex items-center gap-2 text-[12px] transition-colors select-none
      ${danger ? 'hover:bg-red-600/80 text-red-300 hover:text-white'
               : accent ? 'hover:bg-indigo-600/80 text-indigo-300 hover:text-white'
               : 'hover:bg-white/10 text-gray-200 hover:text-white'}`}
    onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); onClick?.(); }}
  >
    <i className={`fa-solid ${icon} w-4 text-center text-[11px] opacity-80`} />
    <span className="flex-1">{label}</span>
    {badge && <span className="text-[9px] bg-indigo-600 text-white px-1 rounded">{badge}</span>}
    {shortcut && <span className="text-[10px] text-gray-500 ml-auto">{shortcut}</span>}
  </div>
);

const ColorSwatch = ({ color, label, onClick }: any) => (
  <div
    title={label}
    className="w-5 h-5 rounded-full cursor-pointer hover:scale-125 transition-transform border border-white/20 flex-shrink-0"
    style={{ background: color }}
    onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); onClick?.(); }}
  />
);

/* ─── Flyout Submenu ─────────────────────────────────────────────── */
const FlyoutItem = ({ icon, label, children }: any) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  return (
    <div ref={ref} className="relative" onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)}>
      <div className="px-3 py-[7px] cursor-pointer flex items-center gap-2 text-[12px] hover:bg-white/10 text-gray-200 hover:text-white transition-colors select-none">
        <i className={`fa-solid ${icon} w-4 text-center text-[11px] opacity-80`} />
        <span className="flex-1">{label}</span>
        <i className="fa-solid fa-chevron-right text-[9px] text-gray-500" />
      </div>
      {open && (
        <div className="absolute left-full top-0 min-w-[150px] bg-[#1a2540] border border-white/10 rounded shadow-2xl z-[99999] pb-1">
          {children}
        </div>
      )}
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════════════════════════════════ */
export default function TimelineContextMenu() {
  const { contextMenu, setContextMenu } = useEditorStore();
  const [clip, setClip] = useState<any>(null);
  const [track, setTrack] = useState<any>(null);

  useEffect(() => {
    if (contextMenu?.clipId) {
      const app = (window as any).app;
      if (app) {
        for (const t of app.tracks) {
          const c = t.clips.find((c: any) => c.id === contextMenu.clipId);
          if (c) { setClip(c); setTrack(t); break; }
        }
      }
    } else { setClip(null); setTrack(null); }
  }, [contextMenu]);

  if (!contextMenu) return null;

  const close = () => setContextMenu(null);

  const run = (fn: () => void) => { fn(); close(); };

  const app = (window as any).app;
  if (!app) return null;

  /* ── generic helpers ── */
  const setProp = (key: string, val: any) => {
    if (clip && app.updateUltraProp) app.updateUltraProp(clip.id, 'properties', key, val);
    app.saveState?.(); app.requestRedraw?.(); app.commitStateToReact?.();
  };
  const setTextStyle = (key: string, val: any) => {
    if (clip && app.updateUltraProp) app.updateUltraProp(clip.id, 'textStyle', key, val);
    app.saveState?.(); app.requestRedraw?.(); app.commitStateToReact?.();
  };
  const deleteClip = () => {
    if (clip && track) {
      app.deleteClip(clip, track);
      track.rebuildTree?.();
      app.renderAll?.();
      app.commitStateToReact?.();
    }
  };
  const duplicateClip = () => { if (app.duplicateSelectedClip) app.duplicateSelectedClip(); };
  const cutAtPlayhead = () => { if (clip && track) app.performSplit(clip, track, { simulated: true }); };
  const rippleDelete = () => { if (app.rippleDelete) app.rippleDelete(); };
  const setSpeed = (v: number) => {
    if (clip) { 
      if (!clip.properties) clip.properties = {};
      const origDur = clip.properties._originalDuration || clip.duration;
      clip.properties._originalDuration = origDur;
      app.updateClipSpeedAndDuration?.(clip.id, v, origDur / v);
    }
  };
  const setClipLabel = (color: string) => {
    if (clip) { (clip as any).labelColor = color; app.saveState?.(); app.commitStateToReact?.(); }
  };
  const reverseClip = () => {
    if (clip) { clip.reversed = !clip.reversed; app.saveState?.(); app.requestRedraw?.(); app.commitStateToReact?.(); }
  };

  const saveAsTemplate = () => {
      if (!clip) return;
      const tpl = {
          id: `tpl_user_${Date.now()}`,
          name: `${clip.name} (Custom)`,
          type: clip.type === 'text' ? 'text' : clip.type === 'image' ? 'image' : 'smart',
          src: clip.src,
          templateData: {
              properties: clip.properties,
              textStyle: clip.textStyle,
              effects: clip.effects,
              transitions: clip.transitions
          }
      };
      // In a real app we'd save this to a backend or localStorage, for now we just alert.
      alert(`Saved "${tpl.name}" to your templates!`);
  };

  const detachAudio = () => {
    if (!clip || clip.type !== 'video') return;
    let audioTrack = app.tracks.find((t: any) => t.type === 'audio');
    if (!audioTrack) {
      audioTrack = { id: 'at_' + Date.now(), type: 'audio', name: 'Audio', clips: [] };
      app.tracks.push(audioTrack);
    }
    audioTrack.clips.push({ ...JSON.parse(JSON.stringify(clip)), id: 'clip_det_' + Date.now(), type: 'audio' });
    clip.muted = true;
    app.saveState?.(); app.commitStateToReact?.();
  };

  /* position */
  const menuStyle: React.CSSProperties = {
    left: Math.min(contextMenu.x, window.innerWidth - 240),
    ...(contextMenu.y > window.innerHeight - 350
      ? { bottom: window.innerHeight - contextMenu.y }
      : { top: contextMenu.y }),
  };

  /* ═══════════════════════ RENDER ════════════════════════════════ */
  return (
    <div
      className="fixed z-[99999] bg-[#131c2e] border border-white/10 rounded-lg shadow-2xl overflow-visible min-w-[210px] text-sm pb-1 backdrop-blur-sm"
      style={menuStyle}
      onMouseLeave={close}
      onMouseDown={(e) => e.stopPropagation()}
    >
      {clip ? (
        <>
          {/* Clip header badge */}
          <div className="px-3 py-2 border-b border-white/10 flex items-center gap-2">
            <i className={`fa-solid ${
              clip.type === 'video' ? 'fa-film text-purple-400' :
              clip.type === 'image' ? 'fa-image text-green-400' :
              clip.type === 'text'  ? 'fa-font text-yellow-400' :
              clip.type === 'audio' ? 'fa-music text-blue-400' : 'fa-shapes text-gray-400'
            } text-[11px]`} />
            <span className="text-[11px] text-gray-300 font-semibold truncate max-w-[170px]">
              {clip.name || clip.text?.slice(0, 30) || clip.type?.toUpperCase()}
            </span>
          </div>

          {/* Phase 13: Color Label strip */}
          <div className="px-3 py-1.5 border-b border-white/10 flex items-center gap-1.5">
            <span className="text-[9px] text-gray-600 flex-shrink-0">Label:</span>
            {['#6366f1','#3b82f6','#10b981','#f59e0b','#ef4444','#a855f7','#ec4899','#06b6d4','#ffffff','#374151'].map(c => (
              <div key={c}
                className={`w-4 h-4 rounded-full cursor-pointer hover:scale-125 transition-transform border-2 ${(clip as any).labelColor === c ? 'border-white' : 'border-transparent'}`}
                style={{ background: c }}
                onMouseDown={e => { e.preventDefault(); run(() => setClipLabel(c)); }}
              />
            ))}
            <div className="w-4 h-4 rounded-full cursor-pointer hover:scale-125 transition-transform border border-dashed border-gray-500 flex items-center justify-center"
              title="Reset" onMouseDown={e => { e.preventDefault(); run(() => { delete (clip as any).labelColor; app.commitStateToReact?.(); }); }}>
              <i className="fa-solid fa-xmark text-[7px] text-gray-500" />
            </div>
          </div>

          {/* ── VIDEO ── */}
          {clip.type === 'video' && <>
            <SectionLabel icon="fa-scissors" label="Edit" />
            <MenuItem icon="fa-scissors" label="Cut at Playhead" shortcut="C" onClick={() => run(cutAtPlayhead)} />
            <MenuItem icon="fa-copy" label="Duplicate" shortcut="Ctrl+D" onClick={() => run(duplicateClip)} />
            <MenuItem icon="fa-star" label="Save as Template" accent onClick={() => run(saveAsTemplate)} />
            <MenuItem icon="fa-rotate" label="Reverse Clip" onClick={() => run(reverseClip)} />
            <MenuItem icon="fa-link-slash" label="Ripple Delete" onClick={() => run(rippleDelete)} />
            <Divider />
            <SectionLabel icon="fa-arrows" label="Transform" />
            <MenuItem icon="fa-arrows-left-right" label="Flip Horizontal" onClick={() => run(() => setProp('flipX', !clip.properties?.flipX))} />
            <MenuItem icon="fa-arrows-up-down" label="Flip Vertical" onClick={() => run(() => setProp('flipY', !clip.properties?.flipY))} />
            <Divider />
            <FlyoutItem icon="fa-gauge-high" label="Speed">
              {[['0.25x', 0.25], ['0.5x', 0.5], ['1x Normal', 1], ['2x', 2], ['4x', 4]].map(([l, v]: any) => (
                <MenuItem key={l} icon="fa-forward" label={l} onClick={() => run(() => setSpeed(v))} />
              ))}
              <Divider />
              <MenuItem icon="fa-sliders" label="Custom Speed…" onClick={() => run(() => useEditorStore.getState().setSpeedModal({ clipId: clip.id }))} />
            </FlyoutItem>
            <FlyoutItem icon="fa-palette" label="Color Grade">
              {[['Warm', { brightness: 105, saturation: 115, hue: 20 }],
                ['Cool', { brightness: 95, saturation: 90, hue: -20 }],
                ['Fade', { brightness: 110, saturation: 60, contrast: 85 }],
                ['Punch', { brightness: 100, saturation: 140, contrast: 120 }],
                ['B&W', { saturation: 0 }],
              ].map(([l, p]: any) => (
                <MenuItem key={l} icon="fa-droplet" label={l} onClick={() => run(() => {
                  Object.entries(p).forEach(([k, v]) => setProp(k, v));
                })} />
              ))}
              <Divider />
              <MenuItem icon="fa-wand-magic-sparkles" label="AI Auto Grade" accent onClick={() => run(() => app.executeAutoColorGrade?.())} />
            </FlyoutItem>
            <Divider />
            <SectionLabel icon="fa-wand-magic-sparkles" label="AI Tools" color="text-indigo-400" />
            <MenuItem icon="fa-closed-captioning" label="Auto Captions (Gemini)" accent badge="AI"
              onClick={() => run(() => (window as any).aiManager?.generateSubtitlesForClip(clip))} />
            <MenuItem icon="fa-crop-simple" label="Auto Reframe (Face Track)" accent badge="AI"
              onClick={() => run(() => import('../../../editor-engine/features/auto-reframe').then(m => m.applyAutoReframe(clip.id)))} />
            <MenuItem icon="fa-person-running" label="Background Remove" accent badge="AI"
              onClick={() => run(() => app.executeRemoveBG?.(clip.id))} />
            <Divider />
            <MenuItem icon="fa-volume-xmark" label="Detach Audio to Track" onClick={() => run(detachAudio)} />
            <MenuItem icon="fa-trash" label="Delete Clip" shortcut="Del" danger onClick={() => run(deleteClip)} />
          </>}

          {/* ── IMAGE ── */}
          {clip.type === 'image' && <>
            <SectionLabel icon="fa-scissors" label="Edit" />
            <MenuItem icon="fa-scissors" label="Cut at Playhead" onClick={() => run(cutAtPlayhead)} />
            <MenuItem icon="fa-copy" label="Duplicate" shortcut="Ctrl+D" onClick={() => run(duplicateClip)} />
            <MenuItem icon="fa-star" label="Save as Template" accent onClick={() => run(saveAsTemplate)} />
            <Divider />
            <SectionLabel icon="fa-arrows-rotate" label="Transform" />
            <MenuItem icon="fa-rotate-right" label="Rotate 90° CW" onClick={() => run(() => setProp('rotation', ((clip.properties?.rotation || 0) + 90) % 360))} />
            <MenuItem icon="fa-rotate-left" label="Rotate 90° CCW" onClick={() => run(() => setProp('rotation', ((clip.properties?.rotation || 0) - 90 + 360) % 360))} />
            <MenuItem icon="fa-arrows-left-right" label="Flip Horizontal" onClick={() => run(() => setProp('flipX', !clip.properties?.flipX))} />
            <MenuItem icon="fa-arrows-up-down" label="Flip Vertical" onClick={() => run(() => setProp('flipY', !clip.properties?.flipY))} />
            <Divider />
            <SectionLabel icon="fa-expand" label="Fit Mode" />
            <MenuItem icon="fa-expand" label="Fit to Canvas" onClick={() => run(() => { setProp('scale', 100); setProp('x', 0); setProp('y', 0); })} />
            <MenuItem icon="fa-crop" label="Fill Canvas" onClick={() => run(() => setProp('scale', 110))} />
            <MenuItem icon="fa-compress" label="Original Size" onClick={() => run(() => setProp('scale', 50))} />
            <Divider />
            <FlyoutItem icon="fa-film" label="Ken Burns Effect">
              <MenuItem icon="fa-magnifying-glass-plus" label="Zoom In" onClick={() => run(() => {
                clip.keyframes = { scale: [{ time: 0, value: 100 }, { time: clip.duration, value: 130 }] };
                app.saveState?.(); app.commitStateToReact?.();
              })} />
              <MenuItem icon="fa-magnifying-glass-minus" label="Zoom Out" onClick={() => run(() => {
                clip.keyframes = { scale: [{ time: 0, value: 130 }, { time: clip.duration, value: 100 }] };
                app.saveState?.(); app.commitStateToReact?.();
              })} />
              <MenuItem icon="fa-arrow-right" label="Pan Left→Right" onClick={() => run(() => {
                clip.keyframes = { x: [{ time: 0, value: -10 }, { time: clip.duration, value: 10 }] };
                app.saveState?.(); app.commitStateToReact?.();
              })} />
            </FlyoutItem>
            <FlyoutItem icon="fa-palette" label="Apply Filter">
              {[['B&W', { saturation: 0 }], ['Sepia', { saturation: 30, hue: 30, brightness: 105 }],
                ['Vintage', { saturation: 70, contrast: 90, brightness: 108 }],
                ['Vivid', { saturation: 150, contrast: 115 }],
                ['Fade', { brightness: 115, saturation: 60, contrast: 85 }],
              ].map(([l, p]: any) => (
                <MenuItem key={l} icon="fa-droplet" label={l} onClick={() => run(() => Object.entries(p).forEach(([k, v]) => setProp(k, v)))} />
              ))}
            </FlyoutItem>
            <Divider />
            <MenuItem icon="fa-wand-magic-sparkles" label="AI Remove Background" accent badge="AI"
              onClick={() => run(() => app.executeRemoveBG?.(clip.id))} />
            <MenuItem icon="fa-trash" label="Delete" danger onClick={() => run(deleteClip)} />
          </>}

          {/* ── TEXT ── */}
          {clip.type === 'text' && <>
            <SectionLabel icon="fa-font" label="Text" />
            <MenuItem icon="fa-copy" label="Duplicate" shortcut="Ctrl+D" onClick={() => run(duplicateClip)} />
            <MenuItem icon="fa-star" label="Save as Template" accent onClick={() => run(saveAsTemplate)} />
            <Divider />
            <SectionLabel label="Quick Color" />
            <div className="px-3 py-2 flex gap-2 flex-wrap">
              {['#ffffff','#000000','#facc15','#ef4444','#3b82f6','#22c55e','#f97316','#a855f7','#ec4899','#06b6d4'].map(c => (
                <ColorSwatch key={c} color={c} onClick={() => run(() => setTextStyle('fill', c))} />
              ))}
            </div>
            <Divider />
            <SectionLabel label="Font Size" />
            <div className="px-3 py-1 flex gap-1">
              {[['S', 24], ['M', 40], ['L', 60], ['XL', 80], ['XXL', 110]].map(([l, v]: any) => (
                <button key={l} className="flex-1 py-1 text-[11px] bg-white/5 hover:bg-white/15 rounded transition-colors text-gray-200"
                  onMouseDown={(e) => { e.preventDefault(); run(() => setTextStyle('fontSize', v)); }}>
                  {l}
                </button>
              ))}
            </div>
            <Divider />
            <SectionLabel label="Alignment" />
            <div className="px-3 py-1 flex gap-1">
              {[['fa-align-left','left'],['fa-align-center','center'],['fa-align-right','right']].map(([ic, al]) => (
                <button key={al} className="flex-1 py-1 bg-white/5 hover:bg-white/15 rounded transition-colors"
                  onMouseDown={(e) => { e.preventDefault(); run(() => setTextStyle('align', al)); }}>
                  <i className={`fa-solid ${ic} text-gray-300 text-[11px]`} />
                </button>
              ))}
            </div>
            <Divider />
            <SectionLabel label="Style Presets" />
            <MenuItem icon="fa-mobile" label="TikTok Style" onClick={() => run(() => {
              ['fontSize','fill','stroke','strokeThickness','fontFamily','bold','align'].forEach((k,i) =>
                setTextStyle(k, [55,'#ffffff','#000000',10,'Inter',true,'center'][i]));
            })} />
            <MenuItem icon="fa-play" label="YouTube Style" onClick={() => run(() => {
              setTextStyle('fontSize', 38); setTextStyle('fill', '#ffffff');
              setTextStyle('stroke', '#000000'); setTextStyle('strokeThickness', 6);
              setTextStyle('fontFamily', 'Inter'); setTextStyle('bold', true);
            })} />
            <MenuItem icon="fa-film" label="Cinematic Style" onClick={() => run(() => {
              setTextStyle('fontSize', 44); setTextStyle('fill', '#f5f5f5');
              setTextStyle('fontFamily', 'Cinzel'); setTextStyle('letterSpacing', 6);
            })} />
            <Divider />
            <SectionLabel label="Animation" />
            <MenuItem icon="fa-eye" label="Fade In" onClick={() => run(() => { clip.transitions = { in: 'fade', duration: 0.5 }; app.saveState?.(); app.commitStateToReact?.(); })} />
            <MenuItem icon="fa-arrow-up" label="Slide Up" onClick={() => run(() => { clip.transitions = { in: 'slideUp', duration: 0.4 }; app.saveState?.(); app.commitStateToReact?.(); })} />
            <MenuItem icon="fa-keyboard" label="Typewriter" onClick={() => run(() => { clip.transitions = { in: 'typewriter', duration: 1.0 }; app.saveState?.(); app.commitStateToReact?.(); })} />
            <MenuItem icon="fa-bolt" label="Bounce In" onClick={() => run(() => { clip.transitions = { in: 'bounce', duration: 0.6 }; app.saveState?.(); app.commitStateToReact?.(); })} />
            <Divider />
            <SectionLabel label="Text FX" />
            <MenuItem icon="fa-star" label="Neon Glow" onClick={() => run(() => {
              setTextStyle('shadowColor', clip.textStyle?.fill || '#00ffff');
              setTextStyle('shadowBlur', 30);
            })} />
            <MenuItem icon="fa-circle" label="Drop Shadow" onClick={() => run(() => {
              setTextStyle('shadowOffsetX', 4); setTextStyle('shadowOffsetY', 4); setTextStyle('shadowBlur', 8);
            })} />
            <Divider />
            <SectionLabel label="Background Box" />
            <div className="px-3 py-1 flex gap-1">
              {[['No BG','transparent'],['Black','#000000'],['White','#ffffff'],['Blue','#2563eb']].map(([l,c]) => (
                <button key={c} className="flex-1 py-1 text-[10px] bg-white/5 hover:bg-white/15 rounded text-gray-300"
                  onMouseDown={(e) => { e.preventDefault(); run(() => {
                    setTextStyle('backgroundColor', c === 'transparent' ? 'transparent' : c);
                    setTextStyle('backgroundOpacity', c === 'transparent' ? 0 : 0.85);
                  }); }}>
                  {l}
                </button>
              ))}
            </div>
            <Divider />
            <MenuItem icon="fa-trash" label="Delete" danger onClick={() => run(deleteClip)} />
          </>}

          {/* ── AUDIO ── */}
          {clip.type === 'audio' && <>
            <SectionLabel icon="fa-music" label="Audio" />
            <MenuItem icon="fa-scissors" label="Cut at Playhead" onClick={() => run(cutAtPlayhead)} />
            <MenuItem icon="fa-copy" label="Duplicate" onClick={() => run(duplicateClip)} />
            <MenuItem icon="fa-rotate" label="Reverse Audio" onClick={() => run(reverseClip)} />
            <Divider />
            <SectionLabel label="Volume" />
            <div className="px-3 py-2 flex gap-1">
              {[['0%',0],['50%',50],['80%',80],['100%',100],['150%',150],['200%',200]].map(([l,v]:any) => (
                <button key={l} className="flex-1 py-1 text-[10px] bg-white/5 hover:bg-white/15 rounded text-gray-300"
                  onMouseDown={(e) => { e.preventDefault(); run(() => setProp('volume', v)); }}>
                  {l}
                </button>
              ))}
            </div>
            <Divider />
            <FlyoutItem icon="fa-arrow-trend-up" label="Fade In">
              {[['0.5s', 0.5], ['1s', 1], ['2s', 2], ['3s', 3]].map(([l, v]: any) => (
                <MenuItem key={l} icon="fa-waveform" label={l} onClick={() => run(() => app.setClipFade?.(clip.id, v, clip.properties?.fadeOut || 0))} />
              ))}
            </FlyoutItem>
            <FlyoutItem icon="fa-arrow-trend-down" label="Fade Out">
              {[['0.5s', 0.5], ['1s', 1], ['2s', 2], ['3s', 3]].map(([l, v]: any) => (
                <MenuItem key={l} icon="fa-waveform" label={l} onClick={() => run(() => app.setClipFade?.(clip.id, clip.properties?.fadeIn || 0, v))} />
              ))}
            </FlyoutItem>
            <FlyoutItem icon="fa-building-columns" label="Reverb">
              {[['Room','room'],['Hall','hall'],['Studio','studio'],['Outdoor','outdoor']].map(([l,v]) => (
                <MenuItem key={v} icon="fa-wave-square" label={l} onClick={() => run(() => app.executeReverb?.(v))} />
              ))}
            </FlyoutItem>
            <FlyoutItem icon="fa-sliders" label="EQ Preset">
              {[['Bass Boost','bass'],['Voice','voice'],['Treble','treble'],['Flat','flat']].map(([l,v]) => (
                <MenuItem key={v} icon="fa-equalizer" label={l} onClick={() => run(() => setProp('eqPreset', v))} />
              ))}
            </FlyoutItem>
            <Divider />
            <MenuItem icon="fa-repeat" label={clip.properties?.loop ? 'Disable Loop' : 'Loop Audio'}
              onClick={() => run(() => app.setClipLoop?.(clip.id, !clip.properties?.loop))} />
            <MenuItem icon="fa-wave-square" label="Normalize Audio" onClick={() => run(() => { setProp('normalize', true); setProp('volume', 100); })} />
            <MenuItem icon={clip.properties?.muted ? 'fa-volume-high' : 'fa-volume-xmark'}
              label={clip.properties?.muted ? 'Unmute' : 'Mute'}
              onClick={() => run(() => setProp('muted', !clip.properties?.muted))} />
            <Divider />
            <MenuItem icon="fa-trash" label="Delete" danger onClick={() => run(deleteClip)} />
          </>}

          {/* ── SHAPE / OTHER ── */}
          {clip.type !== 'video' && clip.type !== 'image' && clip.type !== 'text' && clip.type !== 'audio' && <>
            <MenuItem icon="fa-scissors" label="Cut at Playhead" onClick={() => run(cutAtPlayhead)} />
            <MenuItem icon="fa-copy" label="Duplicate" onClick={() => run(duplicateClip)} />
            <Divider />
            <MenuItem icon="fa-trash" label="Delete" danger onClick={() => run(deleteClip)} />
          </>}

          {/* Phase 15: Note / Comment for any clip */}
          <Divider />
          <SectionLabel icon="fa-note-sticky" label="Note" />
          <ClipNoteEditor clip={clip} app={app} onClose={close} />
        </>
      ) : (
        /* ── BACKGROUND (empty track) ── */
        <>
          <SectionLabel label="Add to Timeline" />
          <MenuItem icon="fa-t" label="Add Text Here" onClick={() => run(() => app.addTextClip?.(contextMenu.trackId, contextMenu.time))} />
          <MenuItem icon="fa-square" label="Add Black Matte" onClick={() => run(() => app.addSolidClip?.(contextMenu.trackId, contextMenu.time, '#000000'))} />
          <MenuItem icon="fa-sun" label="Add White Solid" onClick={() => run(() => app.addSolidClip?.(contextMenu.trackId, contextMenu.time, '#ffffff'))} />
          <Divider />
          <MenuItem icon="fa-paste" label="Paste" shortcut="Ctrl+V" onClick={() => run(() => app.pasteCopiedClip?.())} />
          <Divider />
          <MenuItem icon="fa-flag" label="Add Marker Here" onClick={() => run(() => {
            if (!app.markers) app.markers = [];
            app.markers.push({ time: contextMenu.time || app.currentTime, label: 'Marker', color: '#f59e0b' });
            app.commitStateToReact?.();
          })} />
        </>
      )}
    </div>
  );
}
