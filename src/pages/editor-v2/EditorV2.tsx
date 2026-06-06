import React, { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import Timeline from './components/Timeline';
import Player from './components/Player';
import AssetsPanel from './components/AssetsPanel';
import EffectControls from './components/EffectControls';
import Modals from './components/Modals';
import RightPanel from './components/RightPanel';
import { useEditorStore } from '../../store/useEditorStore';
import { useFileStore } from '../../hooks/useFileStore'; // Ensures window.FileStore is always registered
import { useEngineInit } from './panels/useEngineInit';

// BUG #1 FIX: Expose Zustand store on window so the Legacy Engine
// (video_preview.ts, tracks.ts, clips.ts) can call
// window.useEditorStore.setState() reliably at any time.
(window as any).useEditorStore = useEditorStore;

// AutoMontage Bridge: keep window.mediaLibraryItems in sync with Zustand assetsList
// This allows auto_montage.ts (a non-React module) to read all uploaded media.
useEditorStore.subscribe(
  (state) => { (window as any).mediaLibraryItems = state.assetsList; }
);
// Initial sync
(window as any).mediaLibraryItems = useEditorStore.getState().assetsList;


// Import the legacy engine (this will evaluate the scripts and register window classes)
import '../../editor-engine/main';

export default function EditorV2() {
  const { userData } = useAuth();
  const { id } = useParams();
  const [autoSaveLabel, setAutoSaveLabel] = useState<'saved'|'saving'|null>(null);

  useEngineInit(id);

  return (
    <div className="flex flex-col h-screen w-full max-w-full bg-[#050811] text-gray-300 font-cairo overflow-hidden box-border m-0 p-0 absolute inset-0">
      {/* GLOBAL HEADER */}
      <header 
        className="bg-[#0a0f1d] border-b border-gray-800 py-1 flex-shrink-0 h-10 flex items-center justify-between select-none w-full box-border"
        style={{ paddingLeft: '32px', paddingRight: '32px' }}
      >
        {/* LOGO AREA */}
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-red-600/20 rounded flex items-center justify-center border border-red-500/50">
            <i className="fa-solid fa-brain text-xs text-red-500"></i>
          </div>
          <h1 className="text-[13px] font-bold tracking-wide text-gray-200">
            AI4Montage <span className="bg-red-600 text-white text-[9px] rounded px-1 ml-1 font-mono">AI ULTRA</span>
          </h1>
        </div>
        
        {/* CONTROLS & USER AREA */}
        <div className="flex items-center gap-3">
          <button 
            className="flex items-center gap-1 bg-purple-600 hover:bg-purple-500 text-white px-3 py-1 rounded text-[11px] font-bold transition-colors shadow-lg"
            onClick={() => document.getElementById('templates-modal')?.classList.remove('hidden')}
            title="Magic Templates"
          >
            <i className="fa-solid fa-wand-magic-sparkles"></i> Templates
          </button>

          <button 
            className="flex items-center gap-1 bg-blue-600 hover:bg-blue-500 text-white px-3 py-1 rounded text-[11px] font-bold transition-colors shadow-lg"
            onClick={async () => {
              const app = (window as any).app;
              if (app && (window as any).FileStore) {
                const btn = document.getElementById('export-btn-icon');
                if (btn) btn.className = "fa-solid fa-spinner fa-spin";
                
                try {
                  const exportManifest = {
                    tracks: app.tracks.map((t: any) => ({
                        id: t.id,
                        type: t.type,
                        clips: t.clips.map((c: any) => ({
                            id: c.id,
                            type: c.type,
                            src: c.src,
                            start: c.start,
                            duration: c.duration,
                            sourceIn: c.sourceIn,
                            properties: c.properties,
                            text: c.src, // Text content is in src
                            textStyle: c.textStyle,
                            transitions: c.transitions,
                            aiSegmentation: c.aiSegmentation,
                            logoRemovers: c.logoRemovers
                        }))
                    })),
                    duration: app.duration,
                    fps: app.FPS,
                    baseWidth: app.canvas?.width || 1280,
                    baseHeight: app.canvas?.height || 720
                  };
                  
                  await (window as any).FileStore.save(`${id}_export_manifest`, new Blob([JSON.stringify(exportManifest)], { type: 'application/json' }));
                } catch(e) {
                  console.error('Failed to save export manifest', e);
                  useEditorStore.getState().addLog(`❌ فشل حفظ خريطة التصدير: ${e.message}`);
                }
                
                if (btn) btn.className = "fa-solid fa-download";
              }
              useEditorStore.getState().addLog(`🎬 جاري التصدير (مدة التايم لاين: ${app?.duration.toFixed(2)} ثانية, الفريمات: ${app?.FPS})`);
              window.open(`/export.html?id=${id}`, '_blank');
            }}
          >
            <i id="export-btn-icon" className="fa-solid fa-download"></i> MP4 Export
          </button>
          <button 
            className="flex items-center gap-1 bg-green-600 hover:bg-green-500 text-white px-3 py-1 rounded text-[11px] font-bold transition-colors shadow-lg"
            onClick={() => (window as any).app?.downloadXML()}
          >
            <i className="fa-solid fa-file-code"></i> XML
          </button>

          <button 
            className="flex items-center gap-1 bg-yellow-600 hover:bg-yellow-500 text-white px-3 py-1 rounded text-[11px] font-bold transition-colors shadow-lg"
            onClick={() => (window as any).app?.exportAudioOnly?.()}
            title="Export Audio (WAV)"
          >
            <i className="fa-solid fa-music"></i> Audio
          </button>
          
          <button 
            className="flex items-center gap-1 bg-pink-600 hover:bg-pink-500 text-white px-3 py-1 rounded text-[11px] font-bold transition-colors shadow-lg"
            onClick={() => (window as any).app?.exportGIF?.()}
            title="Export GIF (5s)"
          >
            <i className="fa-solid fa-file-image"></i> GIF
          </button>

          {/* AutoSave indicator */}
          {autoSaveLabel && (
            <div className={`flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border transition-all ${
              autoSaveLabel === 'saving'
                ? 'bg-yellow-600/20 text-yellow-400 border-yellow-600/40'
                : 'bg-green-600/20 text-green-400 border-green-600/40'
            }`}>
              <div className={`w-1.5 h-1.5 rounded-full ${
                autoSaveLabel === 'saving' ? 'bg-yellow-400 animate-pulse' : 'bg-green-400'
              }`}></div>
              {autoSaveLabel === 'saving' ? 'جاري الحفظ...' : '✓ محفوظ'}
            </div>
          )}

          {/* Reset to original button */}
          <button
            title="مسح التعديلات والرجوع للمشروع الأصلي"
            className="flex items-center gap-1 text-[10px] text-gray-500 hover:text-red-400 bg-[#1e293b] px-2 py-1 rounded border border-gray-700 hover:border-red-600/50 transition-all"
            onClick={async () => {
              if (!confirm('هتمسح كل التعديلات وترجع للمشروع الأصلي. مش هتقدر ترجع تاني. متأكد؟')) return;
              const AS = (window as any).AutoSave;
              if (AS && id) {
                await AS.delete(`${id}_tracks_state`);
              }
              window.location.reload();
            }}
          >
            <i className="fa-solid fa-rotate-left text-[9px]"></i> Reset
          </button>
          
          <button 
            onClick={() => document.getElementById('system-log-modal')?.classList.remove('hidden')}
            className="text-gray-400 hover:text-white text-[10px] flex items-center gap-1 bg-[#1e293b] px-2 py-1 rounded border border-gray-700 transition-colors"
            title="System Log"
          >
            <i className="fa-solid fa-list-check"></i> System Log
          </button>

          <Link to="/" className="text-[11px] text-gray-400 hover:text-white transition-colors bg-[#1e293b] px-3 py-1 rounded-full border border-gray-700 flex items-center gap-1 shadow-sm">
            <i className="fa-solid fa-house text-[10px]"></i> Home
          </Link>
          
          <div className="w-[1px] h-4 bg-gray-700 mx-1"></div>

          <div className="flex items-center gap-2">
            {userData?.photo ? (
              <img src={userData.photo} alt="User" className="w-7 h-7 rounded-full border border-gray-600 object-cover" id="header-user-avatar" referrerPolicy="no-referrer" />
            ) : (
              <div className="w-7 h-7 bg-gray-700 rounded-full flex items-center justify-center overflow-hidden border border-gray-600" id="header-user-avatar">
                <i className="fa-solid fa-user text-white text-[10px]"></i>
              </div>
            )}
            <span className="text-[11px] text-gray-300 font-bold max-w-[100px] truncate">{userData?.name || 'مستخدم'}</span>
          </div>
        </div>
      </header>

      <main className="relative flex-grow w-full h-[calc(100vh-40px)] overflow-hidden box-border">
        
        {/* Top Left (Visual Left in RTL) -> RightPanel (CMD Center) */}
        <div className="absolute" style={{ top: '12px', bottom: 'calc(45% + 4px)', left: '12px', width: '300px' }}>
          <div className="w-full h-full [&>div]:!h-full [&>div]:!w-full [&>div]:!max-w-full">
            <RightPanel />
          </div>
        </div>

        {/* Top Middle -> Player (Canvas) */}
        <div className="absolute" style={{ top: '12px', bottom: 'calc(45% + 4px)', left: '320px', right: '260px' }}>
          <div className="w-full h-full [&>div]:!h-full [&>div]:!w-full [&>div]:!max-w-full">
            <Player />
          </div>
        </div>

        {/* Top Right (Visual Right in RTL) -> EffectControls */}
        <div className="absolute" style={{ top: '12px', bottom: 'calc(45% + 4px)', right: '12px', width: '240px' }}>
          <div className="w-full h-full [&>div]:!h-full [&>div]:!w-full [&>div]:!max-w-full">
            <EffectControls />
          </div>
        </div>

        {/* Bottom Left (Visual Left) -> Assets Panel */}
        <div className="absolute" style={{ top: 'calc(55% + 4px)', bottom: '12px', left: '12px', width: '320px' }}>
          <div className="w-full h-full [&>div]:!h-full [&>div]:!w-full [&>div]:!max-w-full">
            <AssetsPanel />
          </div>
        </div>

        {/* Bottom Right + Middle (Visual Right & Middle) -> Timeline */}
        <div className="absolute" style={{ top: 'calc(55% + 4px)', bottom: '12px', left: '340px', right: '12px' }}>
          <div className="w-full h-full [&>div]:!h-full [&>div]:!w-full [&>div]:!max-w-full">
            <Timeline />
          </div>
        </div>

      </main>

      <Modals />
    </div>
  );
}
