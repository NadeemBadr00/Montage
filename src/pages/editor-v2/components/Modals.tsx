import React from 'react';
import { useEditorStore } from '../../../store/useEditorStore';
import { SpeedDurationModal, VideoExportModal } from '../panels/modals-speed-export';
import { TemplatesModal } from '../panels/modals-templates';

export default function Modals() {
  const logs = useEditorStore(state => state.logs);

  return (
    <>
      {/* Export Modal */}
      <div id="export-modal" className="fixed inset-0 bg-black/80 z-[100] hidden items-center justify-center backdrop-blur-sm">
          <div className="bg-gray-800 rounded-xl border border-gray-600 p-8 max-w-lg w-full shadow-2xl animate-fade-in-up">
              <h2 className="text-2xl font-bold font-cairo text-green-400 text-center mb-6">XML Ready</h2>
              <div className="bg-black/50 p-4 rounded-lg font-mono text-[10px] text-blue-300 overflow-x-auto mb-6 border border-gray-700 max-h-40" id="xml-preview"></div>
              <div className="flex gap-3">
                  <button onClick={() => document.getElementById('export-modal')?.classList.add('hidden')} className="flex-1 py-3 bg-gray-700 rounded-lg">إغلاق</button>
                  <a id="download-link" href="#" className="flex-1 py-3 bg-primary rounded-lg text-white flex justify-center items-center gap-2">تحميل XML</a>
              </div>
          </div>
      </div>
  
      {/* SRT Splitter Iframe Modal (Overlay) */}
      <div id="srt-tool-modal" className="hidden fixed inset-0 z-[10000] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-4xl h-[80vh] relative overflow-hidden shadow-2xl animate-fade-in-up">
              <button onClick={() => document.getElementById('srt-tool-modal')?.classList.add('hidden')} className="absolute top-4 right-4 z-50 bg-gray-200 hover:bg-gray-300 text-gray-700 w-8 h-8 rounded-full flex items-center justify-center transition shadow-md">
                  <i className="fa-solid fa-xmark"></i>
              </button>
              <iframe src="/srt.html" className="w-full h-full border-0"></iframe>
          </div>
      </div>
  
      {/* System Log Modal */}
      <div id="system-log-modal" className="fixed inset-0 z-[10000] bg-black/50 hidden items-center justify-center backdrop-blur-sm p-4">
          <div className="bg-[#0f172a] rounded-xl border border-gray-600 w-full max-w-3xl h-[60vh] shadow-2xl flex flex-col overflow-hidden animate-fade-in-up">
              <div className="p-3 bg-[#0a0f1d] border-b border-gray-700 flex justify-between items-center">
                  <h2 className="text-sm font-bold text-green-400 flex items-center gap-2">
                      <i className="fa-solid fa-list-check"></i> System Log
                      <button 
                          onClick={() => {
                              const tracks = useEditorStore.getState().tracks;
                              
                              // Helper to get Track UI Name (e.g. V1, T1)
                              const getTrackName = (type, index) => {
                                  if (['video', 'main', 'overlay'].includes(type)) return `V${index}`;
                                  if (['audio'].includes(type)) return `A${index}`;
                                  if (['text', 'subtitle'].includes(type)) return `T${index}`;
                                  return `X${index}`;
                              };

                              let trackCounters = { video: 1, audio: 1, text: 1 };
                              const snapshot = [...tracks].reverse().map(t => {
                                  let typeGroup = 'video';
                                  if (['audio'].includes(t.type)) typeGroup = 'audio';
                                  if (['text', 'subtitle'].includes(t.type)) typeGroup = 'text';
                                  
                                  const tName = getTrackName(t.type, trackCounters[typeGroup]++);
                                  
                                  let trackTransStr = "";
                                  if (t.transitions && t.transitions.length > 0) {
                                      trackTransStr = "\n  [Track Transitions: " + t.transitions.map(tr => `${tr.type} @ ${tr.cutTime.toFixed(3)}s (Dur: ${((tr.inOffset || 0.5) + (tr.outOffset || 0.5)).toFixed(3)}s)`).join(", ") + "]";
                                  }

                                  return `[${tName}] (${t.type.toUpperCase()}):${trackTransStr}` + '\n' + 
                                         t.clips.map((c, cIdx) => {
                                             const ai = c.aiSegmentation?.enabled ? "Yes" : "No";
                                             let transStr = "None";
                                             if (c.transitions) {
                                                const dur = (c.transitions.duration || 1.0).toFixed(1);
                                                transStr = `${c.transitions.in || 'none'}(${dur}s) -> ${c.transitions.out || 'none'}(${dur}s)`;
                                             }
                                             return `  - ${cIdx+1}${tName.toLowerCase()} (${c.start.toFixed(3)}s -> ${(c.start + c.duration).toFixed(3)}s) | AI Removal: ${ai} | Transitions: ${transStr}\n    Props: ${JSON.stringify(c.properties || {})}`;
                                         }).join('\n');
                              }).reverse().join('\n\n'); // Reverse again to match UI (top to bottom)
                              
                              useEditorStore.getState().addLog(`📸 لقطة التايم لاين الحالية:\n${snapshot}`);
                          }}
                          className="ml-4 bg-blue-600 hover:bg-blue-500 text-white px-2 py-1 rounded text-[10px] transition"
                      >
                          <i className="fa-solid fa-camera"></i> أخذ لقطة للتايم لاين
                      </button>
                  </h2>
                  <button onClick={() => document.getElementById('system-log-modal')?.classList.add('hidden')} className="text-gray-400 hover:text-white transition-colors bg-gray-800 w-6 h-6 rounded flex items-center justify-center">
                      <i className="fa-solid fa-xmark"></i>
                  </button>
              </div>
              <div className="p-4 bg-[#050811] text-[11px] font-mono text-gray-400 flex-grow overflow-y-auto custom-scrollbar flex flex-col justify-start gap-1" dir="rtl">
                  {logs.length > 0 ? (
                      logs.map((log, idx) => (
                          <div key={idx} className="flex gap-2 items-start opacity-80 hover:opacity-100 transition-opacity">
                              <span className="text-gray-600 shrink-0">[{log.time}]</span>
                              <span className="text-green-400 leading-relaxed whitespace-pre-wrap">{log.msg}</span>
                          </div>
                      ))
                  ) : (
                      <div className="text-center text-gray-600 mt-10">لا توجد سجلات بعد...</div>
                  )}
              </div>
          </div>
      </div>

      {/* Dummy elements to prevent legacy engine crash (since CMD is now integrated) */}
      <div id="cmd-console" className="hidden"></div>
      <div id="cmd-header" className="hidden"></div>
      <div id="cmd-minimized" className="hidden"></div>
      
      {/* Speed & Duration Modal */}
      <SpeedDurationModal />

      {/* Video Export Modal */}
      <VideoExportModal />

      {/* Templates Modal */}
      <TemplatesModal />
    </>
  );
}
