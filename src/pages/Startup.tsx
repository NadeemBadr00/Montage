import React, { useState, useCallback, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useDropzone } from 'react-dropzone';
import {
  UploadCloud, FileVideo, Image as ImageIcon, Music, AlertCircle, Wand2,
  Scissors, X, ArrowLeft, User, Film, ImagePlay, AudioLines, MousePointer2
} from 'lucide-react';
import { useFileStore } from '../hooks/useFileStore';
import { useAuth } from '../hooks/useAuth';



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

// ─── Helpers ──────────────────────────────────────────────────────────────
function getFileIcon(file: File) {
  if (file.type.startsWith('video/')) return <FileVideo className="w-4 h-4 text-cyan-400" />;
  if (file.type.startsWith('image/')) return <ImageIcon className="w-4 h-4 text-fuchsia-400" />;
  if (file.type.startsWith('audio/')) return <Music className="w-4 h-4 text-green-400" />;
  return <FileVideo className="w-4 h-4 text-slate-400" />;
}
function formatSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// ─── Animated Logo with Typewriter ───────────────────────────────────────────
function AnimatedLogo() {
  const [hovered,   setHovered]   = useState(false);
  const [displayed, setDisplayed] = useState('');
  const FULL_TEXT = 'AI4Montage';

  useEffect(() => {
    if (!hovered) { setDisplayed(''); return; }
    let i = 0;
    setDisplayed('');
    const iv = setInterval(() => {
      i++;
      setDisplayed(FULL_TEXT.slice(0, i));
      if (i >= FULL_TEXT.length) clearInterval(iv);
    }, 60);
    return () => clearInterval(iv);
  }, [hovered]);

  return (
    <div
      className="flex items-center gap-2 cursor-pointer select-none"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Icon — spins 360° on hover */}
      <div
        className="w-10 h-10 flex-shrink-0"
        style={{
          transition: 'transform 0.55s cubic-bezier(0.34,1.56,0.64,1)',
          transform: hovered ? 'rotate(360deg) scale(1.18)' : 'rotate(0deg) scale(1)',
        }}
      >
        <img src="/ai4montage_logo.png" alt="AI4Montage" className="w-full h-full object-contain" />
      </div>

      {/* Typewriter text container */}
      <div
        style={{
          width: hovered ? `${FULL_TEXT.length * 9.8}px` : '0px',
          opacity: hovered ? 1 : 0,
          overflow: 'hidden',
          transition: 'width 0.1s, opacity 0.2s',
        }}
      >
        <span className="text-white font-bold text-sm tracking-widest whitespace-nowrap font-mono">
          {displayed}
          {displayed.length < FULL_TEXT.length && (
            <span style={{ animation: 'blink 0.7s step-end infinite', color: '#ef4444' }}>|</span>
          )}
        </span>
      </div>

      <style>{`@keyframes blink { 0%,100%{opacity:1} 50%{opacity:0} }`}</style>
    </div>
  );
}

// ─── User Avatar — uses existing useAuth hook ─────────────────────────────
function UserAvatar() {
  const { userData } = useAuth();
  const photo = userData?.photo || '';
  const name  = userData?.name  || '';

  return (
    <div className="flex items-center gap-2.5 mr-1">
      {name && (
        <span className="text-slate-300 text-xs font-medium hidden sm:block max-w-[120px] truncate">{name}</span>
      )}
      <div className="w-8 h-8 rounded-full overflow-hidden border-2 border-slate-500 flex-shrink-0 bg-slate-800">
        {photo
          ? <img
              src={photo}
              alt={name}
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
              onError={(e) => {
                const el = e.target as HTMLImageElement;
                el.onerror = null;
                el.src = '/ai4montage_logo.png';
                el.className = 'w-full h-full object-contain p-1';
              }}
            />
          : <div className="w-full h-full flex items-center justify-center text-xs font-bold text-slate-300">
              {name ? name[0].toUpperCase() : '?'}
            </div>
        }
      </div>
    </div>
  );
}

// ─── Horizontal Format Badges (Bottom Bar) ──────────────────────────────────
const HorizontalBadges = () => (
  <div className="flex items-center gap-4 flex-wrap" dir="ltr">
    <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg" style={{ background: 'rgba(34,211,238,0.1)', border: '1px solid rgba(34,211,238,0.2)' }}>
      <Film className="w-3.5 h-3.5 text-cyan-400" />
      <div className="flex items-center gap-1">
        {['MP4', 'MOV', 'WebM'].map(f => <span key={f} className="text-cyan-300 text-[10px] font-medium px-1">{f}</span>)}
      </div>
    </div>
    <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg" style={{ background: 'rgba(217,70,239,0.1)', border: '1px solid rgba(217,70,239,0.2)' }}>
      <ImagePlay className="w-3.5 h-3.5 text-fuchsia-400" />
      <div className="flex items-center gap-1">
        {['PNG', 'JPG', 'WebP'].map(f => <span key={f} className="text-fuchsia-300 text-[10px] font-medium px-1">{f}</span>)}
      </div>
    </div>
    <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg" style={{ background: 'rgba(52,211,153,0.1)', border: '1px solid rgba(52,211,153,0.2)' }}>
      <AudioLines className="w-3.5 h-3.5 text-emerald-400" />
      <div className="flex items-center gap-1">
        {['MP3', 'WAV', 'AAC'].map(f => <span key={f} className="text-emerald-300 text-[10px] font-medium px-1">{f}</span>)}
      </div>
    </div>
  </div>
);

// ─── Main Component ──────────────────────────────────────────────────────────
export default function Startup() {
  const navigate = useNavigate();
  const burst = useParticleBurst();
  const fileStore = useFileStore();

  const [files, setFiles] = useState<File[]>([]);
  const [error, setError] = useState('');
  const [prompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: {
      'video/*': ['.mp4', '.mov', '.webm', '.avi', '.mkv', '.m4v'],
      'image/*': ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp'],
      'audio/*': ['.mp3', '.wav', '.aac', '.m4a', '.ogg'],
    },
    maxFiles: 50,
    onDrop: (accepted, rejected) => {
      if (rejected.length > 0) {
        setError(`${rejected.length} ملف غير مدعوم أو تجاوز الحد`);
        setTimeout(() => setError(''), 3000);
      }
      setFiles(prev => [...prev, ...accepted].slice(0, 50));
    },
  });

  const totalSize = files.reduce((acc, f) => acc + f.size, 0);
  const removeFile = (i: number) => setFiles(prev => prev.filter((_, idx) => idx !== i));
  const clearAll   = () => setFiles([]);


  const startProject = async (mode: 'sandwich' | 'manual') => {
    if (files.length === 0) {
      setError('ارفع ملف واحد على الأقل لتبدأ');
      setTimeout(() => setError(''), 3000);
      return;
    }
    setIsLoading(true);
    try {
      const projectId = `proj_${Date.now()}`;

      // Save all files to IndexedDB
      await Promise.all(
        files.map((file, i) => fileStore.save(`${projectId}_${i}`, file))
      );

      // Save primary video as projectId_video (what EditorV2 loads)
      const videoFile = files.find(f => f.type.startsWith('video/')) || files[0];
      if (videoFile) await fileStore.save(`${projectId}_video`, videoFile);

      // Save settings under the key EditorV2 reads: ${projectId}_settings
      localStorage.setItem(`${projectId}_settings`, JSON.stringify({
        mode,
        autoTranscribe: false,
        fileCount: files.length,
        createdAt: Date.now(),
      }));

      // Also save current project info
      localStorage.setItem('p43_current_project', JSON.stringify({
        id: projectId, mode,
        createdAt: Date.now(), fileCount: files.length,
      }));

      // Clear old engine state so EditorV2 re-initializes cleanly
      if ((window as any).app) {
        try { (window as any).app.destroy?.(); } catch {}
        (window as any).app = null;
      }
      (window as any).__activeProjectId   = null;
      (window as any).__pendingVideoFile  = null;
      (window as any).__pendingExtraFiles = [];

      navigate(`/editor/${projectId}?mode=${mode}`);

    } catch (err) {
      console.error('Save error:', err);
      setError('حدث خطأ في حفظ الملفات. حاول مرة أخرى.');
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col font-sans" dir="ltr" style={{ background: '#111319', color: '#e2e8f0' }}>
      
      {/* Particle Canvas */}
      <canvas id="particle-canvas" className="fixed inset-0 pointer-events-none z-50"
        style={{ width: '100vw', height: '100vh' }}
        ref={c => { if (c) { c.width = window.innerWidth; c.height = window.innerHeight; } }} />

      {/* Global Background Glows */}
      <div className="fixed inset-0 pointer-events-none -z-10"
        style={{
          background: 'radial-gradient(circle at 85% 50%, rgba(99, 102, 241, 0.08) 0%, transparent 50%), radial-gradient(circle at 15% 50%, rgba(34, 211, 238, 0.04) 0%, transparent 40%)'
        }} />

      {/* ─── Top Navigation ─── */}
      <nav className="h-14 flex items-center justify-between px-8 border-b z-40"
        style={{ background: 'rgba(17, 19, 25, 0.95)', backdropFilter: 'blur(16px)', borderColor: 'rgba(255,255,255,0.07)' }}>

        {/* LEFT: Back + Breadcrumb */}
        <div className="flex items-center gap-4 text-xs font-medium text-slate-400">
          <Link to="/" className="hover:text-white flex items-center gap-1.5 transition-colors group">
            <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
            <span>Back to Home</span>
          </Link>
          <div className="w-px h-4 bg-slate-700" />
          <Link to="/projects" className="hover:text-white transition-colors">
            My Projects
          </Link>
          <span className="text-slate-600">/</span>
          <span className="text-slate-400" dir="rtl">مشاريعي</span>
        </div>

        {/* RIGHT: Logo + name | name + photo */}
        <div className="flex items-center gap-4 flex-shrink-0">
          {/* AI4Montage Animated Logo */}
          <AnimatedLogo />

          {/* Divider */}
          <div className="w-px h-5 bg-slate-700" />

          {/* User: Name THEN Photo (photo on far right edge) */}
          <UserAvatar />
        </div>
      </nav>

      {/* ─── Main Content ─── */}
      <main className="flex-1 flex flex-col lg:flex-row px-8 py-6 gap-6 overflow-hidden max-w-[1600px] mx-auto w-full">
        
        {/* LEFT COLUMN: Media Hub */}
        <div className="flex-[1.8] flex flex-col min-w-0">
          <h1 className="text-[22px] font-bold text-white mb-4 tracking-wide">Media Hub</h1>
          
          <div className="flex-1 flex flex-col xl:flex-row gap-4">
            
            {/* ══ CARD 1: Upload Assets ══ */}
            <div className="flex-[0.8] flex flex-col">
              <h2 className="text-sm font-semibold text-slate-200 mb-3">1. Upload Your Media Assets</h2>
              
              <div className="flex-1 rounded-[20px] p-6 flex flex-col relative"
                style={{ background: '#1c1e26', border: '1px solid rgba(255,255,255,0.06)' }}>
                
                {/* Dropzone */}
                <div {...getRootProps()} className="relative cursor-pointer group mb-6 flex-1 min-h-[220px]">
                  <input {...getInputProps()} />
                  <div className="absolute inset-0 rounded-[16px] flex flex-col items-center justify-center transition-all"
                    style={{
                      border: isDragActive ? '2px dashed rgba(34,211,238,0.5)' : files.length > 0 ? '2px dashed rgba(217,70,239,0.3)' : '2px dashed rgba(255,255,255,0.1)',
                      background: isDragActive ? 'rgba(34,211,238,0.03)' : 'rgba(255,255,255,0.01)',
                    }}>
                    
                    {/* Upload Icon - transparent PNG */}
                    <div className="w-56 h-56 mb-4 flex-shrink-0">
                      <img src="/upload_icon.png" alt="Upload" className="w-full h-full object-contain drop-shadow-2xl" />
                    </div>

                    <h4 className="text-white font-medium text-sm mb-1.5">Drag files here or click to select</h4>
                    <p className="text-slate-400 text-xs" dir="rtl">اسحب ملفاتك أو اضغط للاختيار</p>
                  </div>
                </div>

                {/* Divider */}
                <div className="flex items-center gap-4 mb-5">
                  <div className="flex-1 h-px bg-white/5" />
                  <span className="text-slate-400 text-[11px] font-semibold uppercase tracking-widest">Asset Type</span>
                  <div className="flex-1 h-px bg-white/5" />
                </div>

                {/* Vertical Asset Types */}
                <div className="flex flex-col gap-3 pl-2" dir="ltr">
                  {/* Video */}
                  <div className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-cyan-500/10 border border-cyan-500/20">
                      <Film className="w-3.5 h-3.5 text-cyan-400" />
                    </div>
                    <div className="flex gap-2">
                      {['MP4', 'MOV', 'WebM'].map(f => (
                        <span key={f} className="px-2.5 py-1 rounded-full text-[10px] font-bold text-cyan-300 bg-cyan-500/10 border border-cyan-500/20">{f}</span>
                      ))}
                    </div>
                  </div>
                  {/* Image */}
                  <div className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-fuchsia-500/10 border border-fuchsia-500/20">
                      <ImagePlay className="w-3.5 h-3.5 text-fuchsia-400" />
                    </div>
                    <div className="flex gap-2">
                      {['PNG', 'JPG', 'WebP'].map(f => (
                        <span key={f} className="px-2.5 py-1 rounded-full text-[10px] font-bold text-fuchsia-300 bg-fuchsia-500/10 border border-fuchsia-500/20">{f}</span>
                      ))}
                    </div>
                  </div>
                  {/* Audio */}
                  <div className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-emerald-500/10 border border-emerald-500/20">
                      <AudioLines className="w-3.5 h-3.5 text-emerald-400" />
                    </div>
                    <div className="flex gap-2">
                      {['MP3', 'WAV', 'AAC'].map(f => (
                        <span key={f} className="px-2.5 py-1 rounded-full text-[10px] font-bold text-emerald-300 bg-emerald-500/10 border border-emerald-500/20">{f}</span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* File List */}
                <AnimatePresence>
                  {files.length > 0 && (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} className="absolute inset-x-6 bottom-6 bg-[#16181f] border border-white/10 rounded-xl p-3 shadow-2xl z-10">
                      <div className="flex justify-between items-center mb-2 px-1">
                        <span className="text-xs font-semibold text-slate-300">{files.length} files <span className="text-slate-500">({formatSize(totalSize)})</span></span>
                        <button onClick={clearAll} className="text-xs text-red-400 hover:underline">Clear</button>
                      </div>
                      <div className="space-y-1.5 max-h-32 overflow-y-auto pr-1">
                        {files.map((f, i) => (
                          <div key={i} className="flex items-center gap-2.5 px-2 py-1.5 rounded-md bg-white/5 border border-white/5">
                            {getFileIcon(f)}
                            <p className="flex-1 text-[11px] font-medium text-slate-300 truncate">{f.name}</p>
                            <button onClick={() => removeFile(i)} className="text-slate-500 hover:text-red-400"><X className="w-3 h-3" /></button>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
                {error && <div className="mt-4 text-xs font-medium text-red-400 text-center bg-red-500/10 py-2 rounded-lg border border-red-500/20">{error}</div>}
              </div>
            </div>

            {/* ══ CARD 2: Choose Workflow ══ */}
            <div className="flex-[1.2] flex flex-col">
              <h2 className="text-sm font-semibold text-slate-200 mb-3">2. Choose Your Workflow</h2>

              <div className="flex-1 flex flex-col sm:flex-row gap-4">

                {/* ── MODE A: PRO-AUTOMATE ── */}
                <button
                  onClick={(e) => { if (!isLoading) { burst(e); startProject('sandwich'); } }}
                  disabled={isLoading}
                  className="flex-1 rounded-[20px] p-6 flex flex-col items-center relative overflow-hidden group transition-all"
                  style={{ background: '#1c1e26', border: '1px solid rgba(255,255,255,0.06)' }}>

                  <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
                    style={{ border: '1px solid rgba(217,70,239,0.5)', borderRadius: '20px', boxShadow: 'inset 0 0 30px rgba(217,70,239,0.05)' }} />

                  {/* Recommended Badge */}
                  <div className="mb-4">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold text-[#eab308] bg-[#eab308]/10 border border-[#eab308]/20">
                      ⭐ Recommended
                    </span>
                  </div>

                  <h3 className="text-[#eab308] font-black text-sm mb-1 uppercase tracking-wide">PRO-AUTOMATE AI STACK</h3>
                  <p className="text-slate-500 text-[11px] font-medium mb-6">(AI "Sandwich")</p>

                  {/* Sandwich Layers - transparent PNG */}
                  <div className="w-full h-56 mb-6 flex-shrink-0">
                    <img src="/sandwich_layers.png" alt="AI Stack Layers" className="w-full h-full object-contain drop-shadow-2xl" />
                  </div>

                  <div className="mt-auto text-center px-2">
                    <h4 className="text-slate-300 font-bold text-xs mb-1.5">AI Layer - BG Removal</h4>
                    <p className="text-slate-500 text-[10px] leading-relaxed" dir="rtl">
                      طبقة الذكاء الاصطناعي - إزالة الخلفية.
                      <br/>
                      يمزج المستقبليات، الفيديو والمسار الاصطناعي على الأحداث، على المتداخل على الخلفية.
                    </p>
                  </div>
                </button>

                {/* ── MODE B: MANUAL ── */}
                <button
                  onClick={(e) => { if (!isLoading) { burst(e); startProject('manual'); } }}
                  disabled={isLoading}
                  className="flex-1 rounded-[20px] p-6 flex flex-col items-center relative overflow-hidden group transition-all"
                  style={{ background: '#1c1e26', border: '1px solid rgba(255,255,255,0.06)' }}>

                  <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
                    style={{ border: '1px solid rgba(99,102,241,0.5)', borderRadius: '20px', boxShadow: 'inset 0 0 30px rgba(99,102,241,0.05)' }} />

                  <div className="h-[26px] mb-4" />

                  <h3 className="text-slate-200 group-hover:text-white transition-colors font-black text-sm mb-1 uppercase tracking-wide">
                    FINE-CONTROL MANUAL
                  </h3>
                  <div className="h-[26px] mb-6" />

                  {/* Timeline Icon - transparent PNG */}
                  <div className="w-full h-56 mb-6 flex-shrink-0">
                    <img src="/manual_timeline.png" alt="Timeline" className="w-full h-full object-contain drop-shadow-2xl" />
                  </div>

                  <div className="mt-auto text-center px-2">
                    <h4 className="text-slate-300 font-bold text-xs mb-1.5">Timeline Precision Editing</h4>
                    <p className="text-slate-500 text-[10px] leading-relaxed" dir="rtl">
                      تحرير الإطارات بدقة.
                      <br/>
                      تحرير المسار الإطارات - تحرير الاصطناعي المعاري للستشفيات، وبدقة المونتاج الفيديو التفاعلية.
                    </p>
                  </div>
                </button>

              </div>
            </div>

          </div>
        </div>

        {/* RIGHT COLUMN: AI4Montage Editor Hero */}
        <div className="flex-1 lg:flex-none lg:w-[400px] xl:w-[460px] flex flex-col items-start justify-start flex-shrink-0">

          {/* Title */}
          <h2 className="text-[38px] xl:text-[46px] font-black text-white tracking-widest uppercase mb-5 leading-none"
            style={{ textShadow: '0 0 40px rgba(255,255,255,0.12)' }}>
            AI4MONTAGE
          </h2>

          {/* Editor image with perspective tilt */}
          <div className="w-full relative">
            {/* Ambient glow */}
            <div className="absolute -inset-6 -z-10 rounded-3xl blur-3xl opacity-50"
              style={{ background: 'radial-gradient(ellipse at 60% 50%, rgba(239,68,68,0.35), rgba(99,102,241,0.3), transparent 70%)' }} />

            {/* Perspective frame */}
            <div style={{
              transform: 'perspective(1200px) rotateY(-14deg) rotateX(6deg)',
              transformStyle: 'preserve-3d',
              transition: 'transform 0.5s ease',
              borderRadius: '14px',
              overflow: 'hidden',
              boxShadow: '-24px 24px 70px rgba(0,0,0,0.75), 0 0 0 1px rgba(255,255,255,0.07), inset 0 1px 0 rgba(255,255,255,0.08)',
            }}
              onMouseEnter={e => (e.currentTarget.style.transform = 'perspective(1200px) rotateY(-6deg) rotateX(3deg) scale(1.02)')}
              onMouseLeave={e => (e.currentTarget.style.transform = 'perspective(1200px) rotateY(-14deg) rotateX(6deg)')}>
              <img
                src="/ai4montage_editor_mockup.png"
                alt="AI4Montage Editor"
                className="w-full block"
              />
              {/* Color overlay for blending */}
              <div className="absolute inset-0 pointer-events-none"
                style={{ background: 'linear-gradient(135deg, rgba(239,68,68,0.06) 0%, transparent 40%, rgba(99,102,241,0.06) 100%)' }} />
              {/* Left edge depth shadow */}
              <div className="absolute inset-y-0 left-0 w-10 pointer-events-none"
                style={{ background: 'linear-gradient(to right, rgba(0,0,0,0.5), transparent)' }} />
              {/* Bottom fade */}
              <div className="absolute bottom-0 left-0 right-0 h-16 pointer-events-none"
                style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.4), transparent)' }} />
            </div>
          </div>
        </div>

      </main>

      {/* ─── Bottom Bar ─── */}
      <footer className="h-[52px] flex items-center justify-between px-8 border-t z-40"
        style={{ background: '#1c1e26', borderColor: 'rgba(255,255,255,0.05)' }}>
        <div className="flex items-center gap-2">
          <span className="text-white font-bold text-[13px]">Start Your AI Project</span>
          <span className="text-slate-400 text-[13px]">— Edge AI Processing Enabled</span>
        </div>
        
        <div className="flex items-center gap-8">
          <HorizontalBadges />
          <p className="text-slate-400 text-[11px] font-medium" dir="rtl">ارفع فيديوهاتك وصورك وصوتك...</p>
        </div>
      </footer>

    </div>
  );
}
