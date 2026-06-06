import React from 'react';
import { ChatMessage, SuggestionItem } from './right-panel-types';

// ─── Message Bubble ────────────────────────────────────────────────────────────
export function Bubble({ msg }: { msg: ChatMessage }) {
  if (msg.role === 'user') return (
    <div className="flex justify-end mb-2">
      <div className="max-w-[85%] bg-gradient-to-br from-purple-600 to-indigo-600 text-white text-[11px] px-3 py-2 rounded-2xl rounded-tr-sm shadow-lg leading-relaxed">
        {msg.text}
      </div>
    </div>
  );

  if (msg.role === 'cmd') return (
    <div className="flex justify-center mb-1.5">
      <div className="bg-black/60 border border-green-500/50 text-green-400 font-mono text-[10px] px-3 py-1.5 rounded-full flex items-center gap-2 shadow-[0_0_8px_rgba(16,185,129,0.2)]">
        <i className="fa-solid fa-check-circle text-green-500 text-[9px]" />
        {msg.text}
      </div>
    </div>
  );

  if (msg.role === 'error') return (
    <div className="flex gap-2 mb-2">
      <div className="w-6 h-6 rounded-full bg-red-900 border border-red-500 flex items-center justify-center flex-shrink-0 mt-0.5">
        <i className="fa-solid fa-triangle-exclamation text-red-400 text-[9px]" />
      </div>
      <div className="max-w-[85%] bg-red-900/40 border border-red-500/30 text-red-300 text-[11px] px-3 py-2 rounded-2xl rounded-tl-sm leading-relaxed">
        {msg.text}
      </div>
    </div>
  );

  return (
    <div className="flex gap-2 mb-2">
      <div className="w-6 h-6 rounded-full bg-gradient-to-br from-purple-600 to-indigo-700 flex items-center justify-center flex-shrink-0 mt-0.5 shadow">
        <i className="fa-solid fa-wand-magic-sparkles text-white text-[8px]" />
      </div>
      <div className="max-w-[85%] bg-[#131929] border border-purple-500/20 text-gray-200 text-[11px] px-3 py-2 rounded-2xl rounded-tl-sm shadow leading-relaxed">
        {msg.text}
      </div>
    </div>
  );
}

// ─── Typing Indicator ──────────────────────────────────────────────────────────
export function TypingIndicator() {
  return (
    <div className="flex gap-2 mb-2">
      <div className="w-6 h-6 rounded-full bg-gradient-to-br from-purple-600 to-indigo-700 flex items-center justify-center flex-shrink-0">
        <i className="fa-solid fa-wand-magic-sparkles text-white text-[8px]" />
      </div>
      <div className="bg-[#131929] border border-purple-500/20 px-3 py-2.5 rounded-2xl rounded-tl-sm flex items-center gap-1">
        {[0, 1, 2].map(i => (
          <span key={i} className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-bounce"
            style={{ animationDelay: `${i * 150}ms` }} />
        ))}
      </div>
    </div>
  );
}

// ─── Autocomplete Dropdown ─────────────────────────────────────────────────────
export function AutocompleteDropdown({
  suggestions, selectedIdx, onSelect,
}: { suggestions: SuggestionItem[]; selectedIdx: number; onSelect: (s: SuggestionItem) => void; }) {
  if (!suggestions.length) return null;
  return (
    <div className="absolute bottom-full left-0 right-0 mb-1 bg-[#0a0f1d] border border-green-500/30 rounded-xl overflow-hidden shadow-[0_-4px_20px_rgba(0,0,0,0.6)] z-50">
      <div className="px-2.5 py-1 bg-green-900/20 border-b border-green-500/20 flex items-center gap-1.5">
        <i className="fa-solid fa-terminal text-green-500 text-[8px]" />
        <span className="text-[8px] text-green-500/70 font-mono">CMD suggestions</span>
        <span className="ml-auto text-[7px] text-gray-600">Tab/↑↓ to navigate</span>
      </div>
      {suggestions.map((s, idx) => (
        <div
          key={s.cmd}
          onMouseDown={(e) => { e.preventDefault(); onSelect(s); }}
          className={`flex items-center gap-2.5 px-2.5 py-1.5 cursor-pointer transition-colors ${
            idx === selectedIdx ? 'bg-green-900/30 border-l-2 border-green-400' : 'hover:bg-gray-800/60'
          }`}
        >
          <code className="text-green-300 font-mono text-[9px] bg-black/40 px-1.5 py-0.5 rounded whitespace-nowrap">{s.cmd}</code>
          <span className={`text-[8px] ${s.color} opacity-70`}>{s.category}</span>
          <span className="text-gray-500 text-[8px] ml-auto truncate">{s.desc}</span>
        </div>
      ))}
    </div>
  );
}
