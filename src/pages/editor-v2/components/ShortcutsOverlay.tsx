import React, { useState, useEffect } from 'react';

const SHORTCUTS = [
  { group: 'Playback', items: [
    { keys: ['Space', 'K'], label: 'Play / Pause' },
    { keys: ['J'], label: 'Rewind 5s' },
    { keys: ['L'], label: 'Forward 5s' },
    { keys: ['←', '→'], label: 'Step 1s' },
    { keys: ['Ctrl', '←/→'], label: 'Step 10s' },
    { keys: ['Home'], label: 'Go to Start' },
    { keys: ['End'], label: 'Go to End' },
  ]},
  { group: 'Edit', items: [
    { keys: ['Ctrl', 'Z'], label: 'Undo' },
    { keys: ['Ctrl', 'Y'], label: 'Redo' },
    { keys: ['Del', 'Backspace'], label: 'Delete Clip' },
    { keys: ['Ctrl', 'D'], label: 'Duplicate' },
    { keys: ['Ctrl', 'A'], label: 'Select All' },
    { keys: ['Ctrl', 'C'], label: 'Copy' },
    { keys: ['Ctrl', 'V'], label: 'Paste' },
  ]},
  { group: 'Tools', items: [
    { keys: ['V'], label: 'Selection Tool' },
    { keys: ['C'], label: 'Razor/Cut Tool' },
    { keys: ['M'], label: 'Toggle Magnetic Snap' },
  ]},
  { group: 'Markers', items: [
    { keys: ['I'], label: 'Add In Marker' },
    { keys: ['O'], label: 'Add Out Marker' },
    { keys: ['Dbl-click ruler'], label: 'Add Chapter Marker' },
  ]},
  { group: 'Zoom', items: [
    { keys: ['Ctrl', '+'], label: 'Zoom In' },
    { keys: ['Ctrl', '-'], label: 'Zoom Out' },
    { keys: ['Ctrl', '0'], label: 'Zoom to Fit' },
  ]},
];

export default function ShortcutsOverlay() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
      if (tag === 'input' || tag === 'textarea') return;
      if (e.key === '?') setVisible(v => !v);
      if (e.key === 'Escape') setVisible(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  if (!visible) return (
    <button
      className="fixed bottom-4 right-4 z-[9990] w-8 h-8 rounded-full bg-gray-800 border border-white/20 text-white text-[12px] font-bold flex items-center justify-center hover:bg-gray-700 shadow-lg transition-all"
      title="Keyboard Shortcuts (?)"
      onClick={() => setVisible(true)}
    >
      ?
    </button>
  );

  return (
    <div className="fixed inset-0 z-[99990] bg-black/70 backdrop-blur-sm flex items-center justify-center" onClick={() => setVisible(false)}>
      <div className="bg-[#131c2e] border border-white/10 rounded-2xl shadow-2xl p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-white font-bold text-lg flex items-center gap-2">
            <i className="fa-solid fa-keyboard text-indigo-400" />
            Keyboard Shortcuts
          </h2>
          <button className="text-gray-400 hover:text-white" onClick={() => setVisible(false)}>
            <i className="fa-solid fa-xmark text-lg" />
          </button>
        </div>
        <div className="grid grid-cols-2 gap-4">
          {SHORTCUTS.map(group => (
            <div key={group.group}>
              <div className="text-[10px] text-indigo-400 font-bold uppercase tracking-widest mb-2">{group.group}</div>
              <div className="space-y-1">
                {group.items.map(item => (
                  <div key={item.label} className="flex items-center justify-between gap-2">
                    <span className="text-[12px] text-gray-300">{item.label}</span>
                    <div className="flex gap-1 flex-shrink-0">
                      {item.keys.map(k => (
                        <kbd key={k} className="px-1.5 py-0.5 bg-gray-800 border border-white/20 rounded text-[10px] text-gray-200 font-mono shadow">
                          {k}
                        </kbd>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="mt-4 text-center text-[10px] text-gray-600">Press <kbd className="px-1 bg-gray-800 border border-white/20 rounded text-[9px]">?</kbd> or <kbd className="px-1 bg-gray-800 border border-white/20 rounded text-[9px]">Esc</kbd> to toggle</div>
      </div>
    </div>
  );
}
