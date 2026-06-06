import React, { useState, useCallback, useEffect } from 'react';
import { FileVideo, Image as ImageIcon, Music, Film, ImagePlay, AudioLines } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

// ─── Particle burst ──────────────────────────────────────────────────────────
export function useParticleBurst() {
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
export function getFileIcon(file: File) {
  if (file.type.startsWith('video/')) return <FileVideo className="w-4 h-4 text-cyan-400" />;
  if (file.type.startsWith('image/')) return <ImageIcon className="w-4 h-4 text-fuchsia-400" />;
  if (file.type.startsWith('audio/')) return <Music className="w-4 h-4 text-green-400" />;
  return <FileVideo className="w-4 h-4 text-slate-400" />;
}
export function formatSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// ─── Animated Logo with Typewriter ───────────────────────────────────────────
export function AnimatedLogo() {
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
export function UserAvatar() {
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
export const HorizontalBadges = () => (
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
