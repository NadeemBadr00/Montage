import React, { useState, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useDropzone } from 'react-dropzone';
import {
  UploadCloud, FileVideo, Image, Music, AlertCircle, Wand2,
  Sliders, Check, X, Zap, Brain, ArrowLeft, Sparkles, FolderOpen, Trash2
} from 'lucide-react';
import { AnimatedLogo } from '../components/ui/AnimatedLogo';
import { useFileStore } from '../hooks/useFileStore';

// ─── Particle burst ──────────────────────────────────────────────────────────
function useParticleBurst() {
  const burst = useCallback((e: React.MouseEvent) => {
    const canvas = document.getElementById('particle-canvas') as HTMLCanvasElement;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const particles: { x: number; y: number; vx: number; vy: number; life: number; color: string }[] = [];
    const colors = ['#22d3ee', '#d946ef', '#818cf8', '#f9a8d4', '#34d399'];
    for (let i = 0; i < 24; i++) {
      const angle = (Math.PI * 2 / 24) * i + Math.random() * 0.3;
      const speed = 2 + Math.random() * 5;
      particles.push({ x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, life: 1, color: colors[Math.floor(Math.random() * colors.length)] });
    }
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      let alive = false;
      particles.forEach(p => {
        p.x += p.vx; p.y += p.vy; p.vy += 0.12; p.vx *= 0.98; p.life -= 0.025;
        if (p.life > 0) {
          alive = true;
          ctx.beginPath(); ctx.arc(p.x, p.y, 3 * p.life, 0, Math.PI * 2);
          ctx.fillStyle = p.color; ctx.globalAlpha = p.life; ctx.fill(); ctx.globalAlpha = 1;
        }
      });
      if (alive) requestAnimationFrame(animate);
      else ctx.clearRect(0, 0, canvas.width, canvas.height);
    };
    animate();
  }, []);
  return burst;
}

// ─── Suggestion Chips ────────────────────────────────────────────────────────
const CHIPS = [
  { label: 'Cinematic', category: 'style' },
  { label: 'Slow Motion', category: 'effect' },
  { label: 'Energetic', category: 'style' },
  { label: 'Color Grade', category: 'style' },
  { label: 'Epic Music', category: 'audio' },
  { label: 'Zoom In', category: 'camera' },
  { label: 'Vintage', category: 'style' },
  { label: 'Social Media', category: 'camera' },
];
const CHIP_COLORS: Record<string, string> = {
  camera: '#22d3ee', style: '#d946ef', effect: '#818cf8', audio: '#34d399',
};

// ─── File type helper ────────────────────────────────────────────────────────
function getFileIcon(file: File) {
  if (file.type.startsWith('video/')) return <FileVideo className="w-4 h-4 text-cyan-400" />;
  if (file.type.startsWith('image/')) return <Image className="w-4 h-4 text-fuchsia-400" />;
  if (file.type.startsWith('audio/')) return <Music className="w-4 h-4 text-green-400" />;
  return <FileVideo className="w-4 h-4 text-slate-400" />;
}
function getFileColor(file: File) {
  if (file.type.startsWith('video/')) return 'border-cyan-500/40 bg-cyan-500/10';
  if (file.type.startsWith('image/')) return 'border-fuchsia-500/40 bg-fuchsia-500/10';
  if (file.type.startsWith('audio/')) return 'border-green-500/40 bg-green-500/10';
  return 'border-slate-500/40 bg-slate-500/10';
}
function formatSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// ─── Main Component ──────────────────────────────────────────────────────────
export default function Startup() {
  const navigate = useNavigate();
  const burst = useParticleBurst();
  const fileStore = useFileStore();

  const [files, setFiles] = useState<File[]>([]);
  const [error, setError] = useState('');
  const [prompt, setPrompt] = useState('');
  const [activeChips, setActiveChips] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // ─── Dropzone: قبول صور + فيديوهات + صوت ───────────────────────────────
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: {
      'video/*': ['.mp4', '.mov', '.webm', '.avi', '.mkv', '.m4v'],
      'image/*': ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp'],
      'audio/*': ['.mp3', '.wav', '.aac', '.m4a', '.ogg'],
    },
    maxFiles: 50,
    onDrop: (accepted, rejected) => {
      if (accepted.length > 0) {
        setFiles(prev => {
          const existingNames = new Set(prev.map(f => f.name));
          const newFiles = accepted.filter(f => !existingNames.has(f.name));
          return [...prev, ...newFiles];
        });
        setError('');
      }
      if (rejected.length > 0) {
        setError('بعض الملفات غير مدعومة. استخدم MP4, MOV, JPG, PNG, MP3 فقط.');
      }
    }
  });

  const removeFile = (idx: number) => setFiles(prev => prev.filter((_, i) => i !== idx));
  const clearAll = () => setFiles([]);

  const toggleChip = (label: string) => {
    setActiveChips(prev => prev.includes(label) ? prev.filter(c => c !== label) : [...prev, label]);
    if (!activeChips.includes(label)) {
      setPrompt(p => p ? `${p}, ${label.toLowerCase()}` : label.toLowerCase());
    }
  };

  // إحصائيات الملفات
  const videoFiles = files.filter(f => f.type.startsWith('video/'));
  const imageFiles = files.filter(f => f.type.startsWith('image/'));
  const audioFiles = files.filter(f => f.type.startsWith('audio/'));
  const totalSize = files.reduce((s, f) => s + f.size, 0);

  // ─── Start Project ────────────────────────────────────────────────────────
  const startProject = async (mode: 'manual' | 'sandwich') => {
    if (files.length === 0) { setError('ارفع ملفاً واحداً على الأقل قبل البدء.'); return; }
    if (videoFiles.length === 0 && mode === 'sandwich') {
      setError('Sandwich AI Mode يحتاج فيديو واحد على الأقل.');
      return;
    }
    setIsLoading(true);
    setError('');

    try {
      const projectId = 'proj_' + Math.random().toString(36).slice(2, 10);

      // 1. حفظ الـ settings
      const settings = {
        mode,
        autoTranscribe: mode === 'sandwich',
        hasSRT: false,
        prompt: prompt.trim() || null,
        fileCount: files.length,
      };
      localStorage.setItem(`${projectId}_settings`, JSON.stringify(settings));

      // 1.5. حفظ في سجل المشاريع
      const projectsStr = localStorage.getItem('ai4montage_projects');
      const projects = projectsStr ? JSON.parse(projectsStr) : [];
      projects.push({
        id: projectId,
        name: `Project ${projects.length + 1}`,
        date: new Date().toISOString(),
        mode,
        fileCount: files.length
      });
      localStorage.setItem('ai4montage_projects', JSON.stringify(projects));


      // 2. حفظ كل الملفات في IndexedDB
      // الفيديو الأول هو الـ main video للـ engine
      const mainVideo = videoFiles[0] || null;
      if (mainVideo) {
        await fileStore.save(`${projectId}_video`, mainVideo);
      }

      // حفظ كل الملفات الإضافية بمفاتيح منفصلة
      const extraFiles = mainVideo ? files.filter(f => f !== mainVideo) : files;
      for (let i = 0; i < extraFiles.length; i++) {
        await fileStore.save(`${projectId}_extra_${i}`, extraFiles[i]);
      }
      // حفظ عدد الملفات الإضافية
      localStorage.setItem(`${projectId}_extra_count`, String(extraFiles.length));

      // 3. Refs للـ engine
      (window as any).__pendingVideoFile = mainVideo;
      (window as any).__pendingMode = mode;
      (window as any).__pendingExtraFiles = extraFiles;

      navigate(`/editor/${projectId}`);
    } catch (err) {
      console.error('Failed to start project:', err);
      setError('حدث خطأ أثناء حفظ الملفات، حاول مرة أخرى.');
      setIsLoading(false);
    }
  };

  return (
    <>
      <canvas
        id="particle-canvas"
        className="fixed inset-0 z-50 pointer-events-none"
        style={{ width: '100vw', height: '100vh' }}
        width={typeof window !== 'undefined' ? window.innerWidth : 1920}
        height={typeof window !== 'undefined' ? window.innerHeight : 1080}
      />

      <div className="min-h-screen font-sans" dir="ltr" style={{ background: 'radial-gradient(ellipse at 60% 0%, #0f1a2e 0%, #050810 50%, #000000 100%)' }}>

        {/* Background orbs */}
        <div className="fixed inset-0 pointer-events-none overflow-hidden">
          <motion.div className="absolute rounded-full blur-3xl"
            style={{ width: 600, height: 600, background: 'radial-gradient(circle, rgba(34,211,238,0.12) 0%, transparent 70%)', top: '-200px', right: '-100px' }}
            animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0.8, 0.5] }}
            transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }} />
          <motion.div className="absolute rounded-full blur-3xl"
            style={{ width: 400, height: 400, background: 'radial-gradient(circle, rgba(217,70,239,0.12) 0%, transparent 70%)', bottom: '10%', left: '5%' }}
            animate={{ scale: [1, 1.3, 1], opacity: [0.4, 0.7, 0.4] }}
            transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut', delay: 2 }} />
        </div>

        {/* Nav */}
        <nav className="relative z-20 px-6 py-5 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3 group" style={{ textDecoration: 'none' }}>
            <AnimatedLogo size="sm" />
            <span className="text-white font-black text-xl tracking-tight group-hover:text-cyan-400 transition-colors">AI4Montage</span>
          </Link>
          <div className="flex items-center gap-4">
            <Link to="/projects" className="flex items-center gap-2 px-4 py-2 bg-slate-800/50 hover:bg-slate-700/50 text-white rounded-xl transition-colors border border-slate-700/50 text-sm font-medium" style={{ textDecoration: 'none' }}>
              <FolderOpen className="w-4 h-4 text-cyan-400" /> <span dir="rtl">مشاريعي</span>
            </Link>
            <Link to="/" className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors text-sm font-medium" style={{ textDecoration: 'none' }}>
              <ArrowLeft className="w-4 h-4" /> Back to Home
            </Link>
          </div>
        </nav>

        {/* Main layout */}
        <div className="relative z-10 min-h-[calc(100vh-80px)] flex flex-col lg:flex-row items-stretch gap-0 max-w-7xl mx-auto px-4 pb-10">

          {/* LEFT: Visual */}
          <motion.div
            initial={{ opacity: 0, x: -40 }} animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            className="w-full lg:w-1/2 flex flex-col items-center justify-center py-10 lg:py-0 lg:pr-10"
          >
            <div className="relative w-full max-w-md">
              <motion.div className="absolute inset-0 rounded-[2.5rem] blur-3xl"
                style={{ background: 'conic-gradient(from 0deg, rgba(217,70,239,0.4), rgba(34,211,238,0.4), rgba(99,102,241,0.4), rgba(217,70,239,0.4))' }}
                animate={{ rotate: 360 }} transition={{ duration: 10, repeat: Infinity, ease: 'linear' }} />
              <motion.video src="/vidMotion1.mp4" autoPlay loop muted playsInline
                className="relative z-10 w-full rounded-[2rem] shadow-2xl border border-white/10 object-cover"
                animate={{ y: [-6, 6, -6] }} transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }} />
              <motion.div className="absolute -top-4 -right-4 z-20 px-4 py-2 rounded-2xl border border-yellow-500/40 bg-yellow-500/10 backdrop-blur-xl"
                animate={{ y: [-3, 3, -3] }} transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}>
                <span className="text-cyan-400 text-sm font-black">✦ AI4Montage</span>
              </motion.div>
              <motion.div className="absolute -bottom-4 -left-4 z-20 px-4 py-3 rounded-2xl border border-cyan-500/30 bg-slate-900/80 backdrop-blur-xl"
                animate={{ y: [3, -3, 3] }} transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut', delay: 1 }}>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                  <span className="text-slate-300 text-xs font-bold">Edge AI — Running Locally</span>
                </div>
              </motion.div>
            </div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.6 }} className="text-center mt-10 max-w-md">
              <h1 className="text-4xl font-black text-white tracking-tight leading-tight mb-3">
                Start Your <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-fuchsia-500">AI Project</span>
              </h1>
              <p className="text-slate-400 text-base leading-relaxed" dir="rtl">
                ارفع مشروعك كاملاً — فيديوهات وصور وصوت. الـ AI بيحللهم كلهم ويمنتجهم تلقائياً.
              </p>

              {/* Stats badges */}
              <div className="flex items-center justify-center gap-3 mt-5 flex-wrap">
                {[
                  { icon: '🎬', label: 'فيديو', color: '#22d3ee', accept: 'MP4, MOV, WebM' },
                  { icon: '🖼️', label: 'صور', color: '#d946ef', accept: 'JPG, PNG, WebP' },
                  { icon: '🎵', label: 'صوت', color: '#34d399', accept: 'MP3, WAV, AAC' },
                ].map(b => (
                  <div key={b.label} className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold border"
                    style={{ borderColor: `${b.color}40`, background: `${b.color}15`, color: b.color }}>
                    <span>{b.icon}</span>
                    <div className="text-left">
                      <div>{b.label}</div>
                      <div className="opacity-60 font-normal">{b.accept}</div>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </motion.div>

          <div className="hidden lg:block w-px bg-gradient-to-b from-transparent via-white/10 to-transparent my-8" />

          {/* RIGHT: Upload Panel */}
          <motion.div
            initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1], delay: 0.15 }}
            className="w-full lg:w-1/2 flex flex-col justify-center py-10 lg:py-0 lg:pl-10"
          >
            <div className="bg-slate-900/60 backdrop-blur-2xl border border-white/10 rounded-3xl p-8 shadow-2xl space-y-5">

              {/* Step 1: Upload */}
              <div dir="rtl" className="text-right">
                <p className="text-slate-500 text-xs uppercase tracking-widest font-bold mb-1">Step 1</p>
                <h2 className="text-2xl font-black text-white" dir="ltr" style={{ textAlign: 'right' }}>Upload Your Project</h2>
                <p className="text-slate-500 text-sm mt-1">فيديوهات + صور + صوت — كلهم مع بعض</p>
              </div>

              {/* Dropzone */}
              <div {...getRootProps()} className="relative overflow-hidden rounded-2xl cursor-pointer group">
                <input {...getInputProps()} />
                <motion.div
                  animate={isDragActive ? { scale: 1.02 } : { scale: 1 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                  className={`relative border-2 border-dashed rounded-2xl p-6 text-center transition-all duration-300
                    ${isDragActive ? 'border-cyan-400 bg-cyan-900/20' : files.length > 0 ? 'border-fuchsia-500/50 bg-fuchsia-900/10' : 'border-slate-700 hover:border-fuchsia-500/50 hover:bg-slate-800/30'}`}
                >
                  <AnimatePresence>
                    {isDragActive && (
                      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="absolute inset-0 rounded-2xl"
                        style={{ background: 'radial-gradient(ellipse at center, rgba(34,211,238,0.15) 0%, transparent 70%)' }} />
                    )}
                  </AnimatePresence>

                  <div className="flex flex-col items-center gap-3">
                    <motion.div className="w-14 h-14 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center group-hover:bg-slate-700 group-hover:border-fuchsia-500/40 transition-all"
                      animate={{ y: [0, -4, 0] }} transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}>
                      <FolderOpen className="w-7 h-7 text-slate-300 group-hover:text-fuchsia-400 transition-colors" />
                    </motion.div>
                    <div>
                      <h4 className="text-white font-bold text-sm mb-0.5">
                        {isDragActive ? 'اسحب هنا...' : 'اسحب ملفاتك أو اضغط للاختيار'}
                      </h4>
                      <p className="text-slate-500 text-xs">فيديو + صور + صوت — حتى 50 ملف</p>
                    </div>
                  </div>
                </motion.div>
              </div>

              {/* File list */}
              <AnimatePresence>
                {files.length > 0 && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
                    {/* Stats bar */}
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3 text-xs text-slate-400">
                        {videoFiles.length > 0 && <span className="text-cyan-400 font-bold">🎬 {videoFiles.length} فيديو</span>}
                        {imageFiles.length > 0 && <span className="text-fuchsia-400 font-bold">🖼️ {imageFiles.length} صورة</span>}
                        {audioFiles.length > 0 && <span className="text-green-400 font-bold">🎵 {audioFiles.length} صوت</span>}
                        <span className="text-slate-500">({formatSize(totalSize)})</span>
                      </div>
                      <button onClick={clearAll} className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1 transition-colors">
                        <Trash2 className="w-3 h-3" /> مسح الكل
                      </button>
                    </div>

                    {/* File list scrollable */}
                    <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1" style={{ scrollbarWidth: 'thin', scrollbarColor: '#334155 transparent' }}>
                      {files.map((f, i) => (
                        <motion.div key={`${f.name}-${i}`}
                          initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.03 }}
                          className={`flex items-center gap-3 px-3 py-2 rounded-xl border ${getFileColor(f)}`}
                        >
                          <div className="flex-shrink-0">{getFileIcon(f)}</div>
                          <div className="flex-1 min-w-0">
                            <p className="text-white text-xs font-bold truncate">{f.name}</p>
                            <p className="text-slate-500 text-[10px]">{formatSize(f.size)}</p>
                          </div>
                          <button onClick={() => removeFile(i)}
                            className="flex-shrink-0 w-5 h-5 rounded-md bg-red-500/20 border border-red-500/30 flex items-center justify-center text-red-400 hover:bg-red-500/30 transition-colors">
                            <X className="w-3 h-3" />
                          </button>
                        </motion.div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Error */}
              <AnimatePresence>
                {error && (
                  <motion.p initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                    className="flex items-center gap-2 text-red-400 text-sm font-medium bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
                  </motion.p>
                )}
              </AnimatePresence>

              {/* Step 2: Prompt */}
              <div dir="rtl" className="text-right">
                <p className="text-slate-500 text-xs uppercase tracking-widest font-bold mb-3">Step 2 — وصف رؤيتك (اختياري)</p>
                <div className="relative">
                  <Sparkles className="absolute right-4 top-3.5 w-4 h-4 text-fuchsia-400" />
                  <textarea value={prompt} onChange={e => setPrompt(e.target.value)}
                    placeholder="احكيلي الستايل اللي عايزه... (سينمائي، طاقة عالية، وثائقي...)"
                    rows={2}
                    className="w-full bg-slate-800/60 border border-slate-700 rounded-2xl pr-10 pl-4 py-3 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-fuchsia-500/60 focus:bg-slate-800 transition-all resize-none" />
                </div>
                <div className="flex flex-wrap gap-2 mt-3">
                  {CHIPS.map(chip => {
                    const isActive = activeChips.includes(chip.label);
                    const color = CHIP_COLORS[chip.category];
                    return (
                      <motion.button key={chip.label} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                        onClick={() => toggleChip(chip.label)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all border"
                        style={{ background: isActive ? `${color}20` : 'rgba(30,41,59,0.6)', borderColor: isActive ? `${color}60` : 'rgba(71,85,105,0.5)', color: isActive ? color : '#94a3b8' }}>
                        {isActive && <Check className="w-3 h-3" />} {chip.label}
                      </motion.button>
                    );
                  })}
                </div>
              </div>

              {/* Step 3: Mode */}
              <div dir="rtl" className="text-right">
                <p className="text-slate-500 text-xs uppercase tracking-widest font-bold mb-3">Step 3 — اختر الوضع</p>
                <div className="space-y-3">

                  {/* Sandwich AI Mode */}
                  <motion.button whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}
                    onClick={(e) => { if (!isLoading) { burst(e); startProject('sandwich'); } }}
                    disabled={isLoading}
                    className="w-full relative group overflow-hidden rounded-2xl"
                  >
                    <div className="absolute inset-0 rounded-2xl p-[1.5px]">
                      <motion.div className="absolute inset-0 rounded-2xl"
                        style={{ background: 'conic-gradient(from 0deg, #22d3ee, #d946ef, #818cf8, #22d3ee)' }}
                        animate={{ rotate: 360 }} transition={{ duration: 4, repeat: Infinity, ease: 'linear' }} />
                    </div>
                    <div className="relative m-[1.5px] bg-slate-900 rounded-[14px] p-5 flex items-center justify-between group-hover:bg-slate-800/80 transition-colors">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-fuchsia-500/30 to-cyan-500/30 border border-fuchsia-500/40 flex items-center justify-center">
                          {isLoading
                            ? <svg className="w-6 h-6 text-fuchsia-400 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                            : <Wand2 className="w-6 h-6 text-fuchsia-400" />
                          }
                        </div>
                        <div className="text-right flex-1">
                          <h3 className="text-white font-black text-lg flex items-center gap-2 justify-start flex-row-reverse">
                            {isLoading ? 'جاري الحفظ...' : <>
                              <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-fuchsia-400">AI Mode</span> Sandwich
                              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-fuchsia-500/20 text-fuchsia-400 border border-fuchsia-500/30">Recommended</span>
                            </>}
                          </h3>
                          <p className="text-slate-400 text-sm">
                            {isLoading ? `حفظ ${files.length} ملف...` : 'AI يحلل ويمنتج كل ملفاتك تلقائياً'}
                          </p>
                        </div>
                      </div>
                      <motion.div className="text-slate-500 group-hover:text-cyan-400 transition-colors"
                        animate={{ x: [0, 4, 0] }} transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}>
                        <Zap className="w-5 h-5" />
                      </motion.div>
                    </div>
                  </motion.button>

                  {/* Manual Mode */}
                  <motion.button whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}
                    onClick={(e) => { if (!isLoading) { burst(e); startProject('manual'); } }}
                    disabled={isLoading}
                    className="w-full flex items-center gap-4 p-5 rounded-2xl border border-slate-700/50 bg-slate-800/30 hover:bg-slate-800/60 hover:border-slate-600 transition-all group"
                  >
                    <Brain className="w-5 h-5 text-slate-600 group-hover:text-slate-400 transition-colors" />
                    <div className="text-right flex-1">
                      <h3 className="text-slate-300 font-bold group-hover:text-white transition-colors">Manual Mode</h3>
                      <p className="text-slate-500 text-sm">تحكم كامل في التايم لاين بدون AI</p>
                    </div>
                    <div className="w-12 h-12 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-500 group-hover:text-indigo-400 group-hover:border-indigo-500/40 transition-colors">
                      <Sliders className="w-6 h-6" />
                    </div>
                  </motion.button>
                </div>
              </div>

            </div>
          </motion.div>
        </div>
      </div>
    </>
  );
}
