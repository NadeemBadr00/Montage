import React, { useState, useEffect } from 'react';

interface VersionEntry {
  id: string;
  name: string;
  timestamp: number;
  tracks?: any[];
}

function getVersionHistory(projectId = 'default'): VersionEntry[] {
  try {
    return JSON.parse(localStorage.getItem(`ai4montage_vhistory_${projectId}`) || '[]');
  } catch { return []; }
}

export function VersionHistoryPanel() {
  const [versions, setVersions] = useState<VersionEntry[]>([]);
  const [saveName, setSaveName] = useState('');

  const refresh = () => {
    const pid = (window as any).currentProjectId || 'default';
    setVersions(getVersionHistory(pid));
  };

  useEffect(() => {
    refresh();
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.history) setVersions(detail.history);
    };
    window.addEventListener('versionHistoryUpdated', handler);
    return () => window.removeEventListener('versionHistoryUpdated', handler);
  }, []);

  const handleSave = () => {
    const app = (window as any).app;
    if (!app?.saveVersion) return;
    app.saveVersion(saveName.trim() || undefined);
    setSaveName('');
    setTimeout(refresh, 100);
  };

  const handleRestore = (idx: number) => {
    const app = (window as any).app;
    if (!app?.restoreVersion) return;
    if (!confirm(`استعادة "${versions[idx]?.name}"؟ التغييرات الحالية ستُحفظ كنسخة طوارئ.`)) return;
    app.restoreVersion(idx + 1);
    setTimeout(refresh, 100);
  };

  const handleDelete = (idx: number) => {
    const app = (window as any).app;
    if (!app?.deleteVersion) return;
    if (!confirm(`حذف "${versions[idx]?.name}"؟`)) return;
    app.deleteVersion(idx + 1);
    setTimeout(refresh, 100);
  };

  const formatTime = (ts: number) => {
    return new Date(ts).toLocaleString('ar-EG', { 
      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  };

  return (
    <div className="flex flex-col gap-2 h-full">
      {/* Save New Version */}
      <div className="flex gap-2">
        <input
          type="text"
          placeholder="اسم النسخة (اختياري)..."
          value={saveName}
          onChange={e => setSaveName(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSave()}
          className="flex-1 bg-[#0a0f1d] border border-gray-700 rounded px-2 py-1.5 text-xs text-white outline-none focus:border-purple-500"
          dir="rtl"
        />
        <button
          onClick={handleSave}
          className="bg-purple-600 hover:bg-purple-500 text-white px-3 py-1.5 rounded text-xs font-bold transition-colors flex items-center gap-1"
        >
          <i className="fa-solid fa-camera text-[10px]"></i>
          حفظ
        </button>
      </div>

      {/* Version List */}
      <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col gap-1.5">
        {versions.length === 0 ? (
          <div className="text-center text-gray-600 text-[11px] mt-6 flex flex-col items-center gap-2">
            <i className="fa-solid fa-clock-rotate-left text-2xl"></i>
            <p>لا توجد نسخ محفوظة</p>
            <p className="text-[10px]">اضغط "حفظ" لإنشاء نسخة احتياطية</p>
          </div>
        ) : (
          versions.map((v, i) => {
            const clipCount = v.tracks?.reduce((acc, t) => acc + (t.clips?.length || 0), 0) || 0;
            return (
              <div
                key={v.id}
                className="bg-[#0a0f1d] border border-gray-800 hover:border-gray-600 rounded-lg p-2.5 flex items-center gap-2 group transition-all"
              >
                <div className="w-7 h-7 bg-purple-600/20 border border-purple-500/30 rounded flex items-center justify-center flex-shrink-0">
                  <i className="fa-solid fa-clock-rotate-left text-[10px] text-purple-400"></i>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[11px] font-bold text-white truncate" title={v.name}>{v.name}</div>
                  <div className="text-[9px] text-gray-500 flex items-center gap-2">
                    <span>{formatTime(v.timestamp)}</span>
                    <span>·</span>
                    <span>{clipCount} كليب</span>
                  </div>
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => handleRestore(i)}
                    className="w-6 h-6 bg-green-600/20 hover:bg-green-600/40 border border-green-500/30 rounded flex items-center justify-center text-green-400 transition-colors"
                    title="استعادة هذه النسخة"
                  >
                    <i className="fa-solid fa-rotate-left text-[9px]"></i>
                  </button>
                  <button
                    onClick={() => handleDelete(i)}
                    className="w-6 h-6 bg-red-600/20 hover:bg-red-600/40 border border-red-500/30 rounded flex items-center justify-center text-red-400 transition-colors"
                    title="حذف هذه النسخة"
                  >
                    <i className="fa-solid fa-trash text-[9px]"></i>
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Footer */}
      {versions.length > 0 && (
        <div className="flex justify-between items-center text-[10px] text-gray-600 border-t border-gray-800 pt-2">
          <span>{versions.length}/20 نسخة</span>
          <button
            onClick={() => {
              if (!confirm('حذف جميع النسخ المحفوظة؟')) return;
              (window as any).app?.deleteVersion?.('all');
              setTimeout(refresh, 100);
            }}
            className="text-red-600 hover:text-red-400 transition-colors"
          >
            حذف الكل
          </button>
        </div>
      )}
    </div>
  );
}
