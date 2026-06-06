import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useEditorStore } from '../../../store/useEditorStore';

// ─── Sub-components (extracted for maintainability) ───────────────────────────
import { ChatMessage, SuggestionItem, EXAMPLES } from '../panels/right-panel-types';
import { TTSModal }            from '../panels/right-panel-tts-modal';
import { CMD_REFERENCE,
         ALL_COMMANDS,
         executeCmdString }    from '../panels/right-panel-cmd-reference';
import { Bubble,
         TypingIndicator,
         AutocompleteDropdown} from '../panels/right-panel-chat-bubble';
import { AutoMontageBar }      from '../panels/right-panel-automontage';

// ─── Main RightPanel Component ────────────────────────────────────────────────
export default function RightPanel() {
  const [activeTab, setActiveTab] = useState<'ai' | 'cmd'>('ai');
  const [showTTSModal, setShowTTSModal] = useState(false);

  // ── Shared state ──────────────────────────────────────────────────────────
  const cmdHistory = useRef<string[]>([]);
  const historyIdx = useRef(-1);

  // ── AI + Unified input state ───────────────────────────────────────────────
  const [messages, setMessages]   = useState<ChatMessage[]>([]);
  const [input, setInput]         = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [suggestions, setSuggestions] = useState<SuggestionItem[]>([]);
  const [selectedSuggIdx, setSelectedSuggIdx] = useState(-1);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // ── CMD tab state ──────────────────────────────────────────────────────────
  const [cmdTabInput, setCmdTabInput] = useState('');
  const [cmdBuffer, setCmdBuffer]     = useState('');
  const [isFocused, setIsFocused]     = useState(false);
  const cmdContainerRef = useRef<HTMLDivElement>(null);
  const cmdTabInputRef  = useRef<HTMLInputElement>(null);

  // ── Execute badge (reference list) ────────────────────────────────────────
  const [executedBadge, setExecutedBadge] = useState<string | null>(null);

  // ── Personal API Key toggle ────────────────────────────────────────────────
  const [showApiKey, setShowApiKey] = useState(false);

  // Wire chat callbacks
  useEffect(() => {
    const waitForChat = () => {
      const chat = (window as any).geminiChat;
      if (!chat) { setTimeout(waitForChat, 300); return; }
      chat.onMessage = (msg: ChatMessage) => setMessages(prev => [...prev, msg]);
      chat.onThinkingChange = (val: boolean) => setIsThinking(val);
    };
    waitForChat();
  }, []);

  // ── Global Shortcut (Ctrl + /) ──────────────────────────────────────────────
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === '/') {
        e.preventDefault();
        inputRef.current?.focus();
        if (inputRef.current && !inputRef.current.value.startsWith('/')) {
            setInput('/' + inputRef.current.value);
        }
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, []);

  // Auto-scroll messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isThinking]);

  // ── Autocomplete filter ────────────────────────────────────────────────────
  const handleInputChange = (val: string) => {
    setInput(val);
    historyIdx.current = -1;
    if (val.startsWith('/') && val.length > 1) {
      const query = val.slice(1).toLowerCase();
      const isContextActive = useEditorStore.getState().selectedClipIds.size > 0;
      let matches = ALL_COMMANDS.filter(c =>
        c.cmd.toLowerCase().startsWith(query) || c.desc.toLowerCase().includes(query)
      );
      if (isContextActive) {
        const contextCmds = ['del', 'rdel', 'dup'];
        matches = matches.sort((a, b) => {
          const aContext = contextCmds.includes(a.cmd) ? 1 : 0;
          const bContext = contextCmds.includes(b.cmd) ? 1 : 0;
          return bContext - aContext;
        });
        matches = matches.map(m => {
            if (contextCmds.includes(m.cmd) && !m.category.includes('[Context]')) {
                return { ...m, category: '[Context] ' + m.category, color: 'text-yellow-300' };
            }
            return m;
        });
      }
      setSuggestions(matches.slice(0, 7));
    } else {
      setSuggestions([]);
    }
    setSelectedSuggIdx(-1);
  };

  // ── Execute a cmd and add to shared history ────────────────────────────────
  const doExecuteCmd = useCallback((cmdStr: string) => {
    cmdHistory.current = [cmdStr, ...cmdHistory.current.filter(h => h !== cmdStr).slice(0, 48)];
    historyIdx.current = -1;
    if (cmdStr.startsWith('alias ')) {
       const match = cmdStr.match(/^alias\s+([a-zA-Z0-9_-]+)\s*=\s*(.+)$/);
       if (match) {
           useEditorStore.getState().setCmdAlias(match[1], match[2]);
           useEditorStore.getState().addLog(`✅ Alias created: ${match[1]}`);
           return;
       }
    }
    const aliases = useEditorStore.getState().cmdAliases;
    const finalCmdStr = aliases[cmdStr.trim()] || cmdStr;
    const commands = finalCmdStr.split(';').map(c => c.trim()).filter(Boolean);
    let delay = 0;
    commands.forEach(cmd => {
        setTimeout(() => executeCmdString(cmd), delay);
        delay += 50;
    });
  }, []);

  // ── Unified send ──────────────────────────────────────────────────────────
  const sendMessage = useCallback(async () => {
    const text = input.trim();
    if (!text || isThinking) return;
    setInput('');
    setSuggestions([]);
    setSelectedSuggIdx(-1);
    if (text.startsWith('/')) {
      const cmdStr = text.slice(1).trim();
      if (!cmdStr) return;
      setMessages(prev => [...prev, { id: Date.now(), role: 'user', text }]);
      doExecuteCmd(cmdStr);
      setTimeout(() => {
        setMessages(prev => [...prev, { id: Date.now(), role: 'cmd', text: `⚡ ${cmdStr}` }]);
      }, 80);
    } else {
      const chat = (window as any).geminiChat;
      if (chat) await chat.handleUserMessage(text);
    }
  }, [input, isThinking, doExecuteCmd]);

  // ── Keyboard handler (AI input) ───────────────────────────────────────────
  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const hasSugg = suggestions.length > 0;
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (hasSugg) { setSelectedSuggIdx(prev => Math.max(0, prev - 1)); }
      else if (cmdHistory.current.length > 0) {
        const newIdx = Math.min(historyIdx.current + 1, cmdHistory.current.length - 1);
        historyIdx.current = newIdx;
        setInput('/' + cmdHistory.current[newIdx]);
        setSuggestions([]);
      }
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (hasSugg) { setSelectedSuggIdx(prev => Math.min(suggestions.length - 1, prev + 1)); }
      else if (historyIdx.current >= 0) {
        const newIdx = historyIdx.current - 1;
        historyIdx.current = newIdx;
        setInput(newIdx < 0 ? '' : '/' + cmdHistory.current[newIdx]);
      }
      return;
    }
    if (e.key === 'Tab' && hasSugg) {
      e.preventDefault();
      const idx = selectedSuggIdx >= 0 ? selectedSuggIdx : 0;
      setInput('/' + suggestions[idx].cmd);
      setSuggestions([]);
      setSelectedSuggIdx(-1);
      return;
    }
    if (e.key === 'Escape') { setSuggestions([]); setSelectedSuggIdx(-1); return; }
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (hasSugg && selectedSuggIdx >= 0) {
        setInput('/' + suggestions[selectedSuggIdx].cmd);
        setSuggestions([]);
        setSelectedSuggIdx(-1);
      } else { sendMessage(); }
    }
  };

  // ── CMD Tab logic ──────────────────────────────────────────────────────────
  const syncCmdTabBuffer = (val: string) => {
    const app = (window as any).app;
    if (!app) return;
    app.commandBuffer = val;
    app.isCmdFocused = true;
    if (app.cmdBufferEl) app.cmdBufferEl.innerText = val;
    app.updateConsoleVisuals?.();
    setCmdBuffer(val);
    setIsFocused(true);
  };

  const handleCmdTabChange = (val: string) => { setCmdTabInput(val); syncCmdTabBuffer(val); historyIdx.current = -1; };

  const handleCmdTabKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const cmd = cmdTabInput.trim();
      if (!cmd) return;
      doExecuteCmd(cmd); setCmdTabInput(''); syncCmdTabBuffer(''); return;
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (cmdHistory.current.length > 0) {
        const newIdx = Math.min(historyIdx.current + 1, cmdHistory.current.length - 1);
        historyIdx.current = newIdx;
        const cmd = cmdHistory.current[newIdx];
        setCmdTabInput(cmd); syncCmdTabBuffer(cmd);
      }
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      const newIdx = historyIdx.current - 1;
      historyIdx.current = newIdx;
      const cmd = newIdx < 0 ? '' : cmdHistory.current[newIdx];
      setCmdTabInput(cmd); syncCmdTabBuffer(cmd); return;
    }
    if (e.key === 'Escape') { setCmdTabInput(''); syncCmdTabBuffer(''); }
  };

  const runFromReference = (cmd: string) => {
    doExecuteCmd(cmd);
    setExecutedBadge(cmd);
    setCmdTabInput(cmd);
    syncCmdTabBuffer(cmd);
    setTimeout(() => { setExecutedBadge(null); setCmdTabInput(''); syncCmdTabBuffer(''); }, 1500);
  };

  // CMD polling (backward compat)
  useEffect(() => {
    if (activeTab !== 'cmd') return;
    const interval = setInterval(() => {
      const app = (window as any).app;
      if (app && !cmdTabInput) { setCmdBuffer(app.commandBuffer || ''); setIsFocused(!!app.isCmdFocused); }
    }, 50);
    return () => clearInterval(interval);
  }, [activeTab, cmdTabInput]);

  // CMD wiring (backward compat for engine DOM refs)
  useEffect(() => {
    if (activeTab !== 'cmd') return;
    const app = (window as any).app;
    if (!app) return;
    const consoleEl = document.getElementById('cmd-console');
    const bufferEl  = document.getElementById('cmd-buffer');
    app.cmdContainer = consoleEl;
    app.cmdBufferEl  = bufferEl;
    app.updateConsoleVisuals?.();
  }, [activeTab]);

  const isCmdMode = input.startsWith('/');

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <>
      <div id="right-panel" className="w-[300px] flex flex-col gap-2 flex-shrink-0 h-full">
      <div className="editor-panel glow-border-red flex-grow flex flex-col overflow-hidden min-w-0">

        {/* Tabs */}
        <div className="flex border-b border-gray-800 bg-[#0a0f1d] text-[11px] font-bold flex-shrink-0">
          <button id="tab-ai" className={`flex-1 py-2 text-center transition-all ${activeTab === 'ai' ? 'text-purple-400 bg-[#0f172a] border-b-2 border-purple-500' : 'text-gray-500 hover:text-gray-300'}`} onClick={() => setActiveTab('ai')}>
            <i className="fa-solid fa-wand-magic-sparkles mr-1" />AI4Montage Assistant
          </button>
          <button id="tab-cmd" className={`flex-1 py-2 text-center transition-all ${activeTab === 'cmd' ? 'text-green-400 bg-[#0f172a] border-b-2 border-green-500' : 'text-gray-500 hover:text-gray-300'}`} onClick={() => setActiveTab('cmd')}>
            <i className="fa-solid fa-terminal mr-1" />CMD Center
          </button>
        </div>

        <div className="flex-grow flex flex-col bg-[#080d1a] overflow-hidden rounded-b-lg">

          {/* ════ AI TAB ════ */}
          {activeTab === 'ai' ? (
            <div className="flex flex-col h-full">

              {/* Quick Actions */}
              <div className="flex-shrink-0 flex gap-1.5 px-2.5 py-2 border-b border-gray-800/60 bg-[#0a0f1d]">
                <button id="ai-srt-btn" onClick={() => (document.getElementById('ai-srt-file-input') as HTMLInputElement)?.click()} title="استخراج ترجمة من ملف SRT أو فيديو" className="flex-1 flex flex-col items-center gap-0.5 py-1.5 px-1 rounded-lg bg-[#0f172a] hover:bg-[#1a2540] border border-gray-800 hover:border-yellow-500/40 text-yellow-500 hover:text-yellow-400 transition-all group">
                  <i className="fa-solid fa-closed-captioning text-sm group-hover:scale-110 transition-transform" />
                  <span className="text-[8px] text-gray-500 group-hover:text-gray-400">ترجمة SRT</span>
                </button>
                <input type="file" id="ai-srt-file-input" accept=".srt,video/*" className="hidden" onChange={e => { const file = e.target.files?.[0]; if (!file) return; const am = (window as any).aiManager; if (!am) return; if (file.name.endsWith('.srt')) am.processExternalSRT(file); else am.generateSubtitles(file); (e.target as HTMLInputElement).value = ''; }} />

                <button id="ai-tts-btn" onClick={() => setShowTTSModal(true)} title="توليد صوت AI Voiceover" className="flex-1 flex flex-col items-center gap-0.5 py-1.5 px-1 rounded-lg bg-[#0f172a] hover:bg-[#1a2540] border border-gray-800 hover:border-purple-500/40 text-purple-400 hover:text-purple-300 transition-all group">
                  <i className="fa-solid fa-microphone text-sm group-hover:scale-110 transition-transform" />
                  <span className="text-[8px] text-gray-500 group-hover:text-gray-400">Voiceover</span>
                </button>

                <button id="ai-plan-btn" onClick={() => (window as any).geminiPlan?.showLastPlan?.()} title="خطة المونتاج الذكية" className="flex-1 flex flex-col items-center gap-0.5 py-1.5 px-1 rounded-lg bg-[#0f172a] hover:bg-[#1a2540] border border-gray-800 hover:border-purple-500/40 text-purple-400 hover:text-purple-300 transition-all group">
                  <i className="fa-solid fa-clipboard-list text-sm group-hover:scale-110 transition-transform" />
                  <span className="text-[8px] text-gray-500 group-hover:text-gray-400">خطة AI</span>
                </button>

                <button id="ai-add-text-btn" onClick={() => { const app = (window as any).app; if (app?.addTextAtCanvasPosition) app.addTextAtCanvasPosition(0, 0); else if (app?.addTextClip) app.addTextClip(); }} title="أضف نص على الكانفاز" className="flex-1 flex flex-col items-center gap-0.5 py-1.5 px-1 rounded-lg bg-[#0f172a] hover:bg-[#1a2540] border border-gray-800 hover:border-cyan-500/40 text-cyan-400 hover:text-cyan-300 transition-all group">
                  <i className="fa-solid fa-t text-sm group-hover:scale-110 transition-transform" />
                  <span className="text-[8px] text-gray-500 group-hover:text-gray-400">Add Text</span>
                </button>

                <button id="ai-upload-plan-btn" onClick={() => (document.getElementById('ai-panel-plan-upload') as HTMLInputElement)?.click()} title="رفع خطة JSON جاهزة" className="flex-1 flex flex-col items-center gap-0.5 py-1.5 px-1 rounded-lg bg-[#0f172a] hover:bg-[#1a2540] border border-gray-800 hover:border-blue-500/40 text-blue-400 hover:text-blue-300 transition-all group">
                  <i className="fa-solid fa-file-arrow-up text-sm group-hover:scale-110 transition-transform" />
                  <span className="text-[8px] text-gray-500 group-hover:text-gray-400">رفع خطة</span>
                </button>

                <input type="file" id="ai-panel-plan-upload" accept=".json" className="hidden" onChange={e => { const plan = (window as any).geminiPlan; if (plan && e.target) plan.handlePlanUpload(e.target as HTMLInputElement); }} />
                <input type="file" id="header-plan-upload" accept=".json" className="hidden" onChange={e => { const plan = (window as any).geminiPlan; if (plan && e.target) plan.handlePlanUpload(e.target as HTMLInputElement); }} />
              </div>

              <AutoMontageBar />

              {/* CMD hint bar */}
              {isCmdMode && (
                <div className="flex-shrink-0 flex items-center gap-2 px-3 py-1 bg-green-900/20 border-b border-green-500/20">
                  <i className="fa-solid fa-terminal text-green-500 text-[9px]" />
                  <span className="text-[9px] text-green-400 font-mono flex-1">CMD Mode — اضغط Enter للتنفيذ</span>
                  <kbd className="text-[7px] bg-gray-800 border border-gray-600 rounded px-1 py-0.5 text-gray-400">Tab</kbd>
                  <span className="text-[7px] text-gray-600">للاكتمال</span>
                </div>
              )}

              {/* Messages */}
              <div className="flex-grow overflow-y-auto p-3 custom-scrollbar">
                {messages.length === 0 && !isThinking && (
                  <div className="flex flex-col items-center justify-center h-full gap-4 py-4">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-600 to-indigo-700 flex items-center justify-center shadow-lg shadow-purple-900/50">
                      <i className="fa-solid fa-wand-magic-sparkles text-white text-2xl" />
                    </div>
                    <div className="text-center">
                      <p className="text-gray-200 text-[12px] font-bold mb-1">AI + CMD Center</p>
                      <p className="text-gray-500 text-[10px] leading-relaxed">تكلم المحرر بالعربية • أو اكتب <code className="text-green-400 bg-black/40 px-1 rounded">/cmd</code> للتنفيذ المباشر</p>
                    </div>
                    <div className="w-full bg-green-900/10 border border-green-500/20 rounded-xl p-2 space-y-1">
                      <p className="text-[9px] text-green-500/70 font-bold flex items-center gap-1 mb-1.5"><i className="fa-solid fa-terminal" /> أمثلة سريعة بـ /</p>
                      {['/c20sv1', '/sc150c1v1', '/undo', '/atv'].map(ex => (
                        <button key={ex} onClick={() => { setInput(ex); inputRef.current?.focus(); }} className="w-full text-left font-mono text-[9px] text-green-300 hover:text-green-200 bg-black/30 hover:bg-black/50 rounded px-2 py-1 transition-colors">{ex}</button>
                      ))}
                    </div>
                    <div className="w-full space-y-1.5">
                      {EXAMPLES.map(ex => (
                        <button key={ex} onClick={() => { setInput(ex); inputRef.current?.focus(); }} className="w-full text-right text-[10px] text-gray-400 hover:text-purple-300 bg-[#0f172a] hover:bg-[#1a2540] border border-gray-800 hover:border-purple-500/40 rounded-xl px-3 py-2 transition-all leading-relaxed">
                          <i className="fa-solid fa-arrow-right text-purple-500/60 ml-1.5 text-[8px]" />{ex}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {messages.map(msg => <Bubble key={msg.id} msg={msg} />)}
                {isThinking && <TypingIndicator />}
                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <div className="flex-shrink-0 p-2.5 border-t border-gray-800/80 bg-[#0a0f1d]">
                {cmdHistory.current.length > 0 && (
                  <div className="flex items-center gap-1 mb-1.5 px-1">
                    <i className="fa-solid fa-clock-rotate-left text-[7px] text-gray-600" />
                    <span className="text-[7px] text-gray-600">↑↓ للتنقل في السجل ({cmdHistory.current.length} أمر)</span>
                  </div>
                )}
                <div className="relative">
                  <AutocompleteDropdown suggestions={suggestions} selectedIdx={selectedSuggIdx} onSelect={(s) => { setInput('/' + s.cmd); setSuggestions([]); setSelectedSuggIdx(-1); inputRef.current?.focus(); }} />
                  <div className={`flex items-center gap-2 bg-[#0f172a] border rounded-2xl px-3 py-1.5 transition-all ${isThinking ? 'border-purple-500/20 opacity-70' : isCmdMode ? 'border-green-500/50 shadow-[0_0_12px_rgba(16,185,129,0.15)]' : 'border-gray-700 focus-within:border-purple-500/60 focus-within:shadow-[0_0_12px_rgba(139,92,246,0.15)]'}`}>
                    {isCmdMode ? <span className="text-green-500 text-[9px] font-mono flex-shrink-0">$</span> : <i className="fa-solid fa-wand-magic-sparkles text-purple-500/60 text-[9px] flex-shrink-0" />}
                    <input id="ai-chat-input" ref={inputRef} value={input} onChange={e => handleInputChange(e.target.value)} onKeyDown={onKeyDown} disabled={isThinking} placeholder={isThinking ? 'جاري التفكير...' : 'اكتب طلبك... أو /cmd للتنفيذ'} className="flex-1 bg-transparent text-[11px] text-gray-200 placeholder-gray-600 focus:outline-none disabled:opacity-40 py-1 font-mono" dir="auto" />
                    <button id="ai-send-btn" onClick={sendMessage} disabled={isThinking || !input.trim()} className={`w-7 h-7 rounded-xl flex items-center justify-center flex-shrink-0 transition-all ${isThinking || !input.trim() ? 'bg-gray-800 text-gray-600 cursor-not-allowed' : isCmdMode ? 'bg-gradient-to-br from-green-600 to-emerald-600 text-white hover:scale-105 shadow-md shadow-green-900/40' : 'bg-gradient-to-br from-purple-600 to-indigo-600 text-white hover:scale-105 shadow-md shadow-purple-900/40'}`}>
                      {isThinking ? <i className="fa-solid fa-spinner fa-spin text-[9px]" /> : isCmdMode ? <i className="fa-solid fa-play text-[9px]" /> : <i className="fa-solid fa-paper-plane text-[9px]" />}
                    </button>
                  </div>
                </div>
                {messages.length > 0 && (<button onClick={() => setMessages([])} className="mt-1.5 w-full text-center text-[9px] text-gray-600 hover:text-gray-400 transition-colors"><i className="fa-solid fa-rotate-left mr-1" />مسح المحادثة</button>)}

                {/* Personal API Key */}
                <div className="mt-2 border border-gray-800/60 rounded-xl overflow-hidden">
                  <button onClick={() => setShowApiKey(prev => !prev)} className="w-full flex items-center justify-between px-3 py-1.5 text-[9px] text-gray-500 hover:text-gray-300 bg-[#0a0f1d] hover:bg-[#0f172a] transition-colors">
                    <span className="flex items-center gap-1.5"><i className="fa-solid fa-key text-yellow-500/70" /> 🔑 Personal API Key</span>
                    <i className={`fa-solid fa-chevron-${showApiKey ? 'up' : 'down'} text-[8px]`} />
                  </button>
                  {showApiKey && (
                    <div className="px-3 pb-2 pt-1 bg-[#080d1a]">
                      <input id="ai4montage-api-key" type="password" placeholder="AIzaSy... (مفتاح Gemini الشخصي)" className="w-full bg-[#0f172a] border border-gray-700 rounded-lg px-2 py-1.5 text-[10px] text-gray-200 placeholder-gray-600 focus:outline-none focus:border-yellow-500/60 font-mono" dir="ltr" />
                      <p className="text-[8px] text-gray-600 mt-1 leading-relaxed">احصل على مفتاح مجاني من{' '}<a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener noreferrer" className="text-yellow-500/80 hover:text-yellow-400 underline">Google AI Studio</a>{' '}— يبقى في المتصفح فقط.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

          ) : (
            /* ════ CMD TAB ════ */
            <div id="cmd-console" ref={cmdContainerRef} className={`p-3 bg-[#050811] flex-grow flex flex-col overflow-hidden border border-transparent transition-all rounded-b-lg ${isFocused ? 'border-green-500 shadow-[0_0_15px_rgba(16,185,129,0.3)]' : 'border-green-500/30'}`} dir="ltr">
              {/* CMD Input */}
              <div className={`flex items-center gap-2 bg-black/50 border rounded-xl px-3 py-2 mb-2 flex-shrink-0 transition-all ${isFocused ? 'border-green-500/60 shadow-[0_0_8px_rgba(16,185,129,0.2)]' : 'border-green-900/50'}`}>
                <span className="text-green-500 text-[11px] font-mono flex-shrink-0">$</span>
                <input ref={cmdTabInputRef} value={cmdTabInput} onChange={e => handleCmdTabChange(e.target.value)} onKeyDown={handleCmdTabKeyDown} onFocus={() => setIsFocused(true)} onBlur={() => setIsFocused(false)} placeholder="type command... ↑↓ history · Enter to run" className="flex-1 bg-transparent text-sm font-bold tracking-wider text-green-400 font-mono focus:outline-none placeholder-green-900 text-[11px]" />
                <span id="cmd-buffer" className="hidden">{cmdBuffer}</span>
                <button onClick={() => { const cmd = cmdTabInput.trim(); if (cmd) { doExecuteCmd(cmd); setCmdTabInput(''); syncCmdTabBuffer(''); } }} disabled={!cmdTabInput.trim()} className={`flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center transition-all ${cmdTabInput.trim() ? 'bg-green-600 hover:bg-green-500 text-white shadow-md shadow-green-900/40 hover:scale-105' : 'bg-gray-800 text-gray-600 cursor-not-allowed'}`} title="Execute (Enter)">
                  <i className="fa-solid fa-play text-[8px]" />
                </button>
              </div>

              {/* History hint */}
              {cmdHistory.current.length > 0 && (
                <div className="flex items-center gap-1 mb-2 flex-shrink-0">
                  <i className="fa-solid fa-clock-rotate-left text-[7px] text-green-900" />
                  <span className="text-[7px] text-green-900/80">↑↓ history · {cmdHistory.current.length} commands</span>
                  <div className="ml-auto flex gap-1 overflow-x-auto">
                    {cmdHistory.current.slice(0, 3).map((h, i) => (
                      <button key={i} onClick={() => { setCmdTabInput(h); syncCmdTabBuffer(h); cmdTabInputRef.current?.focus(); }} className="text-[7px] font-mono text-green-800 hover:text-green-400 bg-green-900/20 hover:bg-green-900/40 px-1.5 py-0.5 rounded whitespace-nowrap transition-colors">
                        {h.length > 10 ? h.slice(0, 10) + '…' : h}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Reference list */}
              <div className="flex-grow overflow-y-auto custom-scrollbar space-y-3 pr-1">
                {CMD_REFERENCE.map(section => (
                  <div key={section.category}>
                    <p className={`font-bold text-[10px] ${section.color} border-b border-current/20 pb-0.5 mb-1.5 flex items-center gap-1.5`}>
                      <i className={`fa-solid ${section.icon} text-[9px]`} />{section.category}
                    </p>
                    <div className="space-y-1">
                      {section.commands.map(c => {
                        const isExecuted = executedBadge === c.cmd;
                        const isExecutable = c.cmd.length > 1 && !c.cmd.includes(' ') && !c.cmd.includes('/') && !c.cmd.includes('+');
                        return (
                          <div key={c.cmd} className="flex gap-2 items-center group">
                            <code className="bg-gray-800 text-green-300 px-1.5 py-0.5 rounded font-mono text-[9px] whitespace-nowrap flex-shrink-0">{c.cmd}</code>
                            <span className="text-gray-500 text-[9px] leading-tight flex-1">{c.desc}</span>
                            {isExecutable && (
                              <button onClick={() => runFromReference(c.cmd)} className={`flex-shrink-0 flex items-center gap-1 px-1.5 py-0.5 rounded text-[8px] font-bold transition-all ${isExecuted ? 'bg-green-600/30 text-green-400 border border-green-500/50 scale-105' : 'bg-gray-800/60 text-gray-500 border border-gray-700 hover:bg-green-900/30 hover:text-green-400 hover:border-green-500/40 opacity-0 group-hover:opacity-100'}`} title="Execute now">
                                {isExecuted ? <><i className="fa-solid fa-check" />Run</> : <><i className="fa-solid fa-play" />Run</>}
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
      </div>
      {showTTSModal && <TTSModal onClose={() => setShowTTSModal(false)} />}
    </>
  );
}
