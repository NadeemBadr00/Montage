import React, { useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, useScroll, useTransform } from 'framer-motion';
import {
  Zap, Layers, Wand2, Brain, Shield,
  Cpu, Film, ChevronRight, ArrowRight,
  Sparkles, Globe, Lock, LogOut, User,
} from 'lucide-react';
import { AnimatedLogo } from '../components/ui/AnimatedLogo';
import { Hero3D } from '../components/ui/Hero3D';
import { useAuth } from '../hooks/useAuth';

/* ─── Shared centered-container style ──────────────────────────────── */
const centered: React.CSSProperties = {
  width: '100%',
  maxWidth: '1152px',
  marginLeft: 'auto',
  marginRight: 'auto',
  paddingLeft: '1rem',
  paddingRight: '1rem',
  boxSizing: 'border-box',
};

/* ─── Moving border CTA ─────────────────────────────────────────────── */
function MovingBorderButton({ children, to }: { children: React.ReactNode; to: string }) {
  return (
    <Link to={to} style={{ textDecoration: 'none', display: 'inline-flex', position: 'relative' }} className="group">
      <div style={{ position: 'relative', borderRadius: '1.25rem', padding: '2px', overflow: 'hidden' }}>
        <motion.div
          style={{
            position: 'absolute', inset: 0, borderRadius: '1.25rem',
            background: 'conic-gradient(from 0deg, #22d3ee, #a855f7, #ec4899, #22d3ee)',
          }}
          animate={{ rotate: 360 }}
          transition={{ duration: 2.5, repeat: Infinity, ease: 'linear' }}
        />
        {/* Glow behind button */}
        <motion.div
          style={{
            position: 'absolute', inset: '-4px', borderRadius: '1.5rem',
            background: 'conic-gradient(from 0deg, #22d3ee, #a855f7, #ec4899, #22d3ee)',
            filter: 'blur(16px)',
          }}
          animate={{ rotate: 360, opacity: [0.4, 0.8, 0.4] }}
          transition={{ rotate: { duration: 2.5, repeat: Infinity, ease: 'linear' }, opacity: { duration: 2, repeat: Infinity, ease: 'easeInOut' } }}
        />
        <div style={{
          position: 'relative', zIndex: 1, background: '#020917',
          borderRadius: 'calc(1.25rem - 2px)', padding: '1.2rem 3rem',
          display: 'flex', alignItems: 'center', gap: '0.6rem',
          transition: 'background 0.2s',
        }} className="group-hover:bg-slate-900">
          <span style={{ fontSize: '1.25rem', fontWeight: 900, color: '#fff', letterSpacing: '-0.02em' }}>
            {children}
          </span>
        </div>
      </div>
    </Link>
  );
}

/* ─── Bento card ────────────────────────────────────────────────────── */
function BentoCard({ icon, title, desc, accent, image }: {
  icon: React.ReactNode; title: string; desc: string; accent: string; image?: string;
}) {
  const [hovered, setHovered] = useState(false);
  return (
    <motion.div
      onHoverStart={() => setHovered(true)}
      onHoverEnd={() => setHovered(false)}
      whileHover={{ scale: 1.025, y: -6 }}
      transition={{ type: 'spring', stiffness: 280, damping: 22 }}
      style={{
        position: 'relative', overflow: 'hidden', borderRadius: '1.5rem',
        border: '1px solid rgba(255,255,255,0.07)',
        background: 'linear-gradient(135deg, rgba(15,23,42,0.85), rgba(2,6,23,0.92))',
        backdropFilter: 'blur(24px)', padding: '2rem', cursor: 'pointer',
      }}
    >
      {/* Hover glow */}
      <div style={{
        position: 'absolute', inset: 0, borderRadius: '1.5rem', pointerEvents: 'none',
        background: `radial-gradient(ellipse at 25% 25%, ${accent}1a, transparent 65%)`,
        opacity: hovered ? 1 : 0, transition: 'opacity 0.4s',
      }} />
      {/* Image bg */}
      {image && (
        <div style={{ position: 'absolute', inset: 0, borderRadius: '1.5rem', overflow: 'hidden' }}>
          <img src={image} alt="" style={{
            width: '100%', height: '100%', objectFit: 'cover',
            opacity: hovered ? 0.1 : 0.05, transition: 'opacity 0.5s',
          }} />
        </div>
      )}
      {/* Hover border */}
      <div style={{
        position: 'absolute', inset: 0, borderRadius: '1.5rem', pointerEvents: 'none',
        border: `1px solid ${accent}50`, boxShadow: `0 0 28px ${accent}20`,
        opacity: hovered ? 1 : 0, transition: 'opacity 0.4s',
      }} />

      <div style={{ position: 'relative', zIndex: 1 }}>
        <motion.div
          animate={hovered ? { scale: 1.12, rotate: -6 } : { scale: 1, rotate: 0 }}
          transition={{ type: 'spring', stiffness: 280, damping: 18 }}
          style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            width: '3.5rem', height: '3.5rem', borderRadius: '0.75rem', marginBottom: '1.5rem',
            background: `${accent}18`, border: `1px solid ${accent}35`, color: accent,
          }}
        >
          {icon}
        </motion.div>
        <h3 style={{ fontSize: '1.35rem', fontWeight: 900, color: '#fff', marginBottom: '0.75rem', letterSpacing: '-0.02em' }}>
          {title}
        </h3>
        <p style={{ color: '#94a3b8', lineHeight: 1.65, fontSize: '0.9rem' }}>{desc}</p>
        <motion.div
          animate={hovered ? { x: 8, opacity: 1 } : { x: 0, opacity: 0 }}
          transition={{ duration: 0.2 }}
          style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', marginTop: '1.25rem', fontSize: '0.85rem', fontWeight: 700, color: accent }}
        >
          Learn more <ChevronRight size={16} />
        </motion.div>
      </div>
    </motion.div>
  );
}

/* ─── Stat card ─────────────────────────────────────────────────────── */
function StatCard({ value, label, accent }: { value: string; label: string; accent: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.55 }}
      style={{
        textAlign: 'center', padding: '2rem',
        borderRadius: '1.5rem', border: '1px solid rgba(255,255,255,0.07)',
        background: 'rgba(15,23,42,0.5)', backdropFilter: 'blur(20px)',
      }}
    >
      <div style={{ fontSize: '3rem', fontWeight: 900, marginBottom: '0.5rem', color: accent }}>{value}</div>
      <div style={{ color: '#94a3b8', fontWeight: 500, fontSize: '0.85rem' }}>{label}</div>
    </motion.div>
  );
}

/* ─── Showcase section ───────────────────────────────────────────────── */
function ShowcaseSection() {
  return (
    <motion.section
      initial={{ opacity: 0, y: 50 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
      style={{ ...centered, paddingTop: '4rem', paddingBottom: '4rem' }}
    >
      <div style={{
        position: 'relative', borderRadius: '2.5rem', overflow: 'hidden',
        border: '1px solid rgba(255,255,255,0.1)',
      }}>
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg, rgba(34,211,238,0.07), transparent 50%, rgba(168,85,247,0.07))' }} />
        <div style={{ position: 'absolute', top: '-10rem', right: '-10rem', width: '24rem', height: '24rem', background: 'rgba(34,211,238,0.12)', borderRadius: '50%', filter: 'blur(80px)' }} />
        <div style={{ position: 'absolute', bottom: '-10rem', left: '-10rem', width: '24rem', height: '24rem', background: 'rgba(168,85,247,0.12)', borderRadius: '50%', filter: 'blur(80px)' }} />

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0, position: 'relative' }}>
          {/* Left text */}
          <div style={{ padding: '4rem', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <motion.span
              initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: 0.2 }}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
                padding: '0.35rem 0.85rem', borderRadius: '99px',
                border: '1px solid rgba(34,211,238,0.3)', background: 'rgba(34,211,238,0.08)',
                color: '#22d3ee', fontSize: '0.75rem', fontWeight: 700, marginBottom: '1.5rem', width: 'fit-content',
              }}
            >
              <Sparkles size={12} /> AI4Montage Engine
            </motion.span>

            <h2 style={{ fontSize: '3.2rem', fontWeight: 900, color: '#fff', lineHeight: 1.1, letterSpacing: '-0.03em', marginBottom: '1.5rem' }}>
              Intelligence<br />
              <span style={{ background: 'linear-gradient(90deg, #22d3ee, #a855f7)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                built in.
              </span>
            </h2>

            <p style={{ color: '#94a3b8', fontSize: '1.05rem', lineHeight: 1.7, marginBottom: '2rem' }}>
              AI4Montage runs cutting-edge generative models directly in your browser via WebGPU.
              No uploads. No latency. No compromise on privacy.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {[
                { icon: <Lock size={14} />, text: 'Zero data leaves your device', color: '#34d399' },
                { icon: <Zap size={14} />, text: 'GPU-accelerated, 60fps preview', color: '#22d3ee' },
                { icon: <Globe size={14} />, text: 'Works fully offline', color: '#a855f7' },
              ].map((item, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -16 }} whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }} transition={{ delay: 0.3 + i * 0.1 }}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}
                >
                  <div style={{
                    width: '2rem', height: '2rem', borderRadius: '0.6rem',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                    background: `${item.color}18`, border: `1px solid ${item.color}35`, color: item.color,
                  }}>{item.icon}</div>
                  <span style={{ color: '#cbd5e1', fontWeight: 500 }}>{item.text}</span>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Right: looping video (no controls, no UI) */}
          <div style={{ padding: '2rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <motion.div style={{ position: 'relative', width: '100%' }}
              animate={{ y: [-6, 6, -6] }} transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}>
              {/* Glow behind video */}
              <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg, rgba(34,211,238,0.25), rgba(168,85,247,0.25))', borderRadius: '1.5rem', filter: 'blur(32px)' }} />
              <video
                src="/vidMotion1.mp4"
                autoPlay
                loop
                muted
                playsInline
                disablePictureInPicture
                style={{
                  position: 'relative', zIndex: 1, width: '100%',
                  borderRadius: '1.5rem',
                  boxShadow: '0 40px 80px rgba(0,0,0,0.65)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  display: 'block',
                  pointerEvents: 'none',        // no right-click / controls
                  userSelect: 'none',
                  outline: 'none',
                }}
              />
            </motion.div>
          </div>
        </div>
      </div>
    </motion.section>
  );
}

/* ─── User Avatar Nav Button ─────────────────────────────────────────── */

const PLAN_META: Record<string, { label: string; accent: string; bg: string; border: string }> = {
  ultra: { label: 'Ultra',  accent: '#c084fc', bg: 'rgba(168,85,247,0.15)',  border: 'rgba(168,85,247,0.4)' },
  pro:   { label: 'Pro',    accent: '#22d3ee', bg: 'rgba(34,211,238,0.12)',   border: 'rgba(34,211,238,0.35)' },
  free:  { label: 'Free',   accent: '#94a3b8', bg: 'rgba(148,163,184,0.08)', border: 'rgba(148,163,184,0.2)' },
};

function daysLeft(expiresAt: number | null | undefined): number | null {
  if (!expiresAt) return null;
  const ms = expiresAt - Date.now();
  if (ms <= 0) return 0;
  return Math.ceil(ms / (1000 * 60 * 60 * 24));
}

function UserNavButton() {
  const { userData, signOut } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  if (!userData) {
    return (
      <Link to="/login" style={{
        display: 'flex', alignItems: 'center', gap: '0.5rem',
        padding: '0.6rem 1.25rem', borderRadius: '0.75rem',
        background: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(12px)',
        border: '1px solid rgba(255,255,255,0.2)', color: '#fff',
        fontSize: '0.875rem', fontWeight: 700, textDecoration: 'none',
      }}>Sign In <ArrowRight size={16} /></Link>
    );
  }

  const initials = (userData.name || userData.email || '?')
    .split(' ').slice(0, 2).map((w: string) => w[0]).join('').toUpperCase();

  const plan     = userData.plan ?? 'free';
  const meta     = PLAN_META[plan] ?? PLAN_META.free;
  const remaining = daysLeft(userData.planExpiresAt);
  const isPaidPlan = !!(userData.billing); // set only when user paid
  // Progress: 30-day trial
  const trialTotal = 30;
  const progressPct = remaining !== null
    ? Math.max(0, Math.min(100, (remaining / trialTotal) * 100))
    : 100;

  return (
    <div style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          display: 'flex', alignItems: 'center', gap: '0.6rem',
          padding: '0.35rem 0.75rem 0.35rem 0.35rem',
          borderRadius: '99px', cursor: 'pointer',
          background: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(12px)',
          border: '1px solid rgba(255,255,255,0.15)', color: '#fff',
          fontSize: '0.875rem', fontWeight: 600,
        }}
      >
        {userData.photo
          ? <img src={userData.photo} alt={userData.name} style={{ width: '1.85rem', height: '1.85rem', borderRadius: '50%', objectFit: 'cover', border: `2px solid ${meta.accent}80` }} />
          : <div style={{ width: '1.85rem', height: '1.85rem', borderRadius: '50%', background: 'linear-gradient(135deg,#a855f7,#22d3ee)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 800 }}>{initials}</div>
        }
        <span style={{ maxWidth: '7rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {userData.name?.split(' ')[0] || 'User'}
        </span>
        {/* Plan badge inline */}
        <span style={{ fontSize: '0.65rem', fontWeight: 800, padding: '0.15rem 0.5rem', borderRadius: '99px', background: meta.bg, border: `1px solid ${meta.border}`, color: meta.accent, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
          {meta.label}
        </span>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.7, transition: 'transform 0.2s', transform: open ? 'rotate(180deg)' : 'none' }}><polyline points="6 9 12 15 18 9"/></svg>
      </button>

      {open && (
        <>
          {/* backdrop */}
          <div style={{ position: 'fixed', inset: 0, zIndex: 40 }} onClick={() => setOpen(false)} />
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            style={{
              position: 'absolute', top: 'calc(100% + 0.6rem)', right: 0, zIndex: 50,
              minWidth: '15rem', borderRadius: '1rem',
              background: 'rgba(10,18,40,0.98)', backdropFilter: 'blur(24px)',
              border: '1px solid rgba(255,255,255,0.1)',
              boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
              overflow: 'hidden',
            }}
          >
            {/* Profile info */}
            <div style={{ padding: '1rem 1rem 0.85rem', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
              <div style={{ color: '#fff', fontWeight: 700, fontSize: '0.9rem', marginBottom: '0.15rem' }}>{userData.name}</div>
              <div style={{ color: '#64748b', fontSize: '0.72rem', overflow: 'hidden', textOverflow: 'ellipsis', marginBottom: '0.75rem' }}>{userData.email}</div>

              {/* Plan pill + days */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', padding: '0.25rem 0.7rem', borderRadius: '99px', background: meta.bg, border: `1px solid ${meta.border}`, color: meta.accent, fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  ✦ {meta.label} Plan
                </div>
                {remaining !== null && (
                  <div style={{ fontSize: '0.72rem', color: remaining <= 5 ? '#f87171' : '#94a3b8', fontWeight: 600 }}>
                    {remaining === 0 ? 'Expired' : `${remaining}d left`}
                  </div>
                )}
              </div>

              {/* Progress bar (only when trial is active) */}
              {remaining !== null && remaining > 0 && (
                <div style={{ marginTop: '0.6rem' }}>
                  <div style={{ height: '4px', borderRadius: '99px', background: 'rgba(255,255,255,0.07)', overflow: 'hidden' }}>
                    <div style={{
                      height: '100%', borderRadius: '99px',
                      width: `${progressPct}%`,
                      background: remaining <= 5
                        ? 'linear-gradient(90deg,#f87171,#fca5a5)'
                        : `linear-gradient(90deg,${meta.accent},${meta.accent}99)`,
                      transition: 'width 0.5s ease',
                    }} />
                  </div>
                  <div style={{ fontSize: '0.65rem', color: '#475569', marginTop: '0.3rem' }}>
                    {remaining === 1 ? '1 day' : `${remaining} days`} remaining{isPaidPlan ? '' : ' in trial'}
                  </div>
                </div>
              )}

              {/* Upgrade nudge if expired or near end */}
              {(remaining === 0 || (remaining !== null && remaining <= 5 && plan !== 'free')) && (
                <Link to="/pricing" onClick={() => setOpen(false)} style={{ display: 'block', marginTop: '0.6rem', textAlign: 'center', padding: '0.4rem', borderRadius: '0.5rem', background: 'linear-gradient(135deg,#a855f7,#ec4899)', color: '#fff', fontSize: '0.72rem', fontWeight: 700, textDecoration: 'none' }}>
                  ⚡ Upgrade Plan
                </Link>
              )}
            </div>

            {/* Actions */}
            <div style={{ padding: '0.5rem' }}>
              {[
                { icon: <User size={15}/>, label: 'Go to Editor', action: () => { setOpen(false); navigate('/startup'); }},
              ].map(item => (
                <button key={item.label} onClick={item.action} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', width: '100%', padding: '0.65rem 0.85rem', borderRadius: '0.6rem', background: 'transparent', border: 'none', color: '#cbd5e1', fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer', textAlign: 'left', transition: 'background 0.15s' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.06)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                  {item.icon} {item.label}
                </button>
              ))}
              <button onClick={async () => { setOpen(false); await signOut(); navigate('/'); }} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', width: '100%', padding: '0.65rem 0.85rem', borderRadius: '0.6rem', background: 'transparent', border: 'none', color: '#f87171', fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer', textAlign: 'left', transition: 'background 0.15s' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(248,113,113,0.08)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                <LogOut size={15} /> Sign Out
              </button>
            </div>
          </motion.div>
        </>
      )}
    </div>
  );
}

/* ─── Main Home ──────────────────────────────────────────────────────── */
export default function Home() {
  const containerRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { userData } = useAuth();
  const { scrollYProgress } = useScroll({ target: containerRef, offset: ['start start', 'end end'] });
  const heroY       = useTransform(scrollYProgress, [0, 0.28], [0, 320]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.22], [1, 0]);
  const contentY    = useTransform(scrollYProgress, [0.1, 0.4], [80, 0]);
  const contentOpacity = useTransform(scrollYProgress, [0.1, 0.35], [0, 1]);

  // Smart claim — upgrades free users directly; sends guests to /login
  const claimFreeTrial = () => {
    if (!userData) { navigate('/login'); return; }
    const plan = userData.plan ?? 'free';
    if (plan !== 'free') { navigate('/pricing'); return; }
    const stored  = JSON.parse(localStorage.getItem('p43_user') || '{}');
    localStorage.setItem('p43_user', JSON.stringify({
      ...stored,
      plan: 'ultra',
      planExpiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000,
    }));
    localStorage.setItem('ai4m_ultra_promo_seen', '1');
    navigate('/pricing');
    setTimeout(() => window.location.reload(), 80);
  };

  // Hide the promo banner if user already has Ultra/Pro
  const showPromoBanner = !userData || (userData.plan ?? 'free') === 'free';

  const features = [
    { icon: <Zap size={28} />,    title: 'Edge AI Engine',    desc: 'AI4Montage harnesses your GPU directly in the browser via WebCodecs + WebGPU. Zero server latency, full Hollywood power.', accent: '#22d3ee', image: '/ai4montage_feature.png' },
    { icon: <Brain size={28} />,  title: 'Sandwich AI Mode',  desc: 'Upload once — AI4Montage auto-generates subtitles, B-roll, transitions, and effects in seconds.',                           accent: '#d946ef' },
    { icon: <Layers size={28} />, title: 'Smart Layering',    desc: 'Intelligent multi-track composition. AI4Montage understands context, pacing, and cinematic storytelling.',                   accent: '#818cf8' },
    { icon: <Shield size={28} />, title: '100% Private',      desc: 'Every AI process runs on-device. Your footage never leaves your machine.',                                                    accent: '#34d399' },
    { icon: <Cpu size={28} />,    title: 'Real-Time Preview', desc: 'See AI effects render live as they generate. No queue. No wait.',                                                             accent: '#fb923c' },
    { icon: <Film size={28} />,   title: '4K Export',         desc: 'Frame-perfect 4K export in H.264, H.265, or WebM. Cinema-grade output, browser-speed workflow.',                             accent: '#f472b6' },
  ];

  return (
    <div
      id="landing-root"
      dir="ltr"
      ref={containerRef}
      style={{
        minHeight: '420vh',
        direction: 'ltr',
        fontFamily: "'Inter', system-ui, sans-serif",
        color: '#f1f5f9',
        position: 'relative',
      }}
    >
      {/* 3D Background */}
      <Hero3D />

      {/* ── NAV ── */}
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50,
        padding: '1rem 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(0,0,0,0.7), transparent)', pointerEvents: 'none' }} />
        <Link to="/" style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', gap: '0.75rem', textDecoration: 'none' }}>
          <AnimatedLogo size="sm" />
          <span style={{ fontSize: '1.2rem', fontWeight: 900, color: '#fff', letterSpacing: '-0.04em' }}>AI4Montage</span>
        </Link>
        <div style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
          <a href="#features" style={{ color: '#94a3b8', fontSize: '0.875rem', fontWeight: 600, textDecoration: 'none' }}>Features</a>
          <a href="#about"    style={{ color: '#94a3b8', fontSize: '0.875rem', fontWeight: 600, textDecoration: 'none' }}>About</a>
          <Link to="/pricing" style={{ color: '#c084fc', fontSize: '0.875rem', fontWeight: 700, textDecoration: 'none' }}>Pricing</Link>
          <UserNavButton />
        </div>
      </nav>

      {/* ── HERO (sticky) ── */}
      <section style={{
        position: 'sticky', top: 0, height: '100vh', width: '100%',
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', zIndex: 10, pointerEvents: 'none',
      }}>
        <motion.div style={{ y: heroY, opacity: heroOpacity, textAlign: 'center', padding: '0 1rem', width: '100%', maxWidth: '72rem', margin: '0 auto' }}>
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: -24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.2 }}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
              padding: '0.5rem 1rem', borderRadius: '99px',
              border: '1px solid rgba(34,211,238,0.3)', background: 'rgba(34,211,238,0.08)',
              color: '#22d3ee', fontSize: '0.85rem', fontWeight: 700, marginBottom: '2rem',
              pointerEvents: 'auto',
            }}
          >
            <span style={{ width: '0.5rem', height: '0.5rem', background: '#22d3ee', borderRadius: '50%', animation: 'pulse 2s infinite' }} />
            AI4Montage — Edge AI Video Editor · Beta
          </motion.div>

          {/* Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 70 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1] }}
            style={{
              fontSize: 'clamp(5rem, 12vw, 11rem)', lineHeight: 0.88,
              fontWeight: 900, letterSpacing: '-0.04em', textTransform: 'uppercase',
              textShadow: '0 20px 80px rgba(0,0,0,0.9)', margin: 0,
            }}
          >
            <span style={{ color: '#fff', display: 'block' }}>Edit</span>
            <span style={{
              display: 'block',
              background: 'linear-gradient(90deg, #22d3ee, #d946ef, #818cf8)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            }}>Smarter</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1, delay: 0.55 }}
            style={{ marginTop: '2rem', fontSize: 'clamp(1rem, 2vw, 1.35rem)', color: '#cbd5e1', maxWidth: '40rem', margin: '2rem auto 0', lineHeight: 1.65 }}
          >
            AI4Montage is the first Edge AI video editor that lives entirely in your browser.
            No cloud. No limits.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1, delay: 0.85 }}
            style={{ marginTop: '3rem', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1rem', pointerEvents: 'auto' }}
          >
            {/* Big CTA */}
            <MovingBorderButton to="/startup">
              Start Creating <Wand2 size={20} style={{ display: 'inline', marginLeft: '0.25rem' }} />
            </MovingBorderButton>

            {/* Free reassurance line */}
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.3, duration: 0.8 }}
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#64748b', fontSize: '0.82rem', fontWeight: 500 }}
            >
              <span style={{ width: '0.4rem', height: '0.4rem', background: '#34d399', borderRadius: '50%' }} />
              Free plan available · New users get 30-day Ultra trial · No credit card
              <span style={{ width: '0.4rem', height: '0.4rem', background: '#34d399', borderRadius: '50%' }} />
            </motion.div>
          </motion.div>

          {/* Scroll cue */}
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 2.2, duration: 1 }}
            style={{ position: 'absolute', bottom: '2.5rem', left: '50%', transform: 'translateX(-50%)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', color: '#475569' }}
          >
            <span style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.15em', fontWeight: 500 }}>Scroll</span>
            <motion.div
              style={{ width: '1px', height: '2.5rem', background: 'linear-gradient(to bottom, #475569, transparent)', originY: 0 }}
              animate={{ scaleY: [0, 1, 0] }} transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
            />
          </motion.div>
        </motion.div>
      </section>

      {/* ── SCROLL CONTENT ── */}
      <div style={{ position: 'relative', zIndex: 20, marginTop: '100vh' }}>
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '12rem', background: 'linear-gradient(to bottom, transparent, #020917)', pointerEvents: 'none' }} />

        <div style={{ background: '#020917', paddingTop: '6rem' }}>

          {/* Stats */}
          <motion.section id="about" style={{ ...centered, paddingBottom: '4rem', y: contentY, opacity: contentOpacity }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem' }}>
              <StatCard value="0ms"  label="Cloud Latency"  accent="#22d3ee" />
              <StatCard value="4K"   label="Export Quality" accent="#d946ef" />
              <StatCard value="100%" label="Private & Local" accent="#34d399" />
              <StatCard value="∞"    label="Creative Limit"  accent="#fb923c" />
            </div>
          </motion.section>

          {/* Showcase */}
          <ShowcaseSection />

          {/* Features */}
          <section id="features" style={{ ...centered, paddingTop: '4rem', paddingBottom: '4rem' }}>
            <motion.div
              initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }} transition={{ duration: 0.7 }}
              style={{ textAlign: 'center', marginBottom: '4rem' }}
            >
              <span style={{
                display: 'inline-block', padding: '0.4rem 1rem', borderRadius: '99px',
                border: '1px solid rgba(217,70,239,0.3)', background: 'rgba(217,70,239,0.08)',
                color: '#d946ef', fontSize: '0.8rem', fontWeight: 700, marginBottom: '1.5rem',
              }}>Built Different</span>
              <h2 style={{ fontSize: 'clamp(2.5rem, 5vw, 4rem)', fontWeight: 900, color: '#fff', letterSpacing: '-0.03em', lineHeight: 1.1 }}>
                Features that{' '}
                <span style={{ background: 'linear-gradient(90deg, #22d3ee, #d946ef)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                  hit different
                </span>
              </h2>
            </motion.div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.25rem' }}>
              {features.map((feat, i) => (
                <motion.div
                  key={feat.title}
                  initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }} transition={{ duration: 0.5, delay: i * 0.07 }}
                >
                  <BentoCard {...feat} />
                </motion.div>
              ))}
            </div>
          </section>

          {/* ── HOW IT WORKS ── */}
          <section style={{ ...centered, paddingTop: '4rem', paddingBottom: '4rem' }}>
            <motion.div
              initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }} transition={{ duration: 0.7 }}
              style={{ textAlign: 'center', marginBottom: '3.5rem' }}
            >
              <span style={{
                display: 'inline-block', padding: '0.4rem 1rem', borderRadius: '99px',
                border: '1px solid rgba(34,211,238,0.3)', background: 'rgba(34,211,238,0.08)',
                color: '#22d3ee', fontSize: '0.8rem', fontWeight: 700, marginBottom: '1.5rem',
              }}>How it works</span>
              <h2 style={{ fontSize: 'clamp(2rem, 4vw, 3rem)', fontWeight: 900, color: '#fff', letterSpacing: '-0.03em' }}>
                Three steps to your{' '}
                <span style={{ background: 'linear-gradient(90deg, #22d3ee, #a855f7)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                  next masterpiece
                </span>
              </h2>
            </motion.div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem', position: 'relative' }}>
              {/* connector line */}
              <div style={{ position: 'absolute', top: '2.25rem', left: '20%', right: '20%', height: '1px', background: 'linear-gradient(90deg, rgba(34,211,238,0.3), rgba(168,85,247,0.3))', pointerEvents: 'none' }} />
              {[
                { step: '01', title: 'Drop your footage', desc: 'Import any video, audio, or image directly into the browser. No upload, no waiting.', accent: '#22d3ee', emoji: '📁' },
                { step: '02', title: 'AI does the heavy lifting', desc: 'Let Sandwich AI auto-cut, subtitle, and color-grade your content in seconds.', accent: '#a855f7', emoji: '🤖' },
                { step: '03', title: 'Export cinema-grade', desc: 'Export 4K H.264/H.265 directly from your browser. No render farm needed.', accent: '#ec4899', emoji: '🚀' },
              ].map((s, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }} transition={{ delay: i * 0.15 }}
                  style={{
                    textAlign: 'center', padding: '2.5rem 2rem',
                    borderRadius: '1.5rem', border: '1px solid rgba(255,255,255,0.07)',
                    background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(16px)',
                    position: 'relative',
                  }}
                >
                  <div style={{
                    width: '4rem', height: '4rem', borderRadius: '50%', marginLeft: 'auto', marginRight: 'auto', marginBottom: '1.25rem',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: `${s.accent}18`, border: `2px solid ${s.accent}35`,
                    fontSize: '1.5rem',
                  }}>{s.emoji}</div>
                  <div style={{ color: s.accent, fontSize: '0.72rem', fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Step {s.step}</div>
                  <h3 style={{ color: '#fff', fontSize: '1.15rem', fontWeight: 800, marginBottom: '0.75rem', letterSpacing: '-0.02em' }}>{s.title}</h3>
                  <p style={{ color: '#94a3b8', fontSize: '0.875rem', lineHeight: 1.65 }}>{s.desc}</p>
                </motion.div>
              ))}
            </div>
          </section>

          {/* ── PRICING TEASER — only for guests / free users ── */}
          {showPromoBanner && (
          <section style={{ ...centered, paddingTop: '2rem', paddingBottom: '4rem' }}>
            <motion.div
              initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }} transition={{ duration: 0.7 }}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                gap: '2rem', flexWrap: 'wrap',
                padding: '2.5rem 3rem', borderRadius: '2rem',
                background: 'linear-gradient(135deg, rgba(168,85,247,0.12), rgba(34,211,238,0.07))',
                border: '1px solid rgba(168,85,247,0.25)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                <div style={{ fontSize: '3rem' }}>🎁</div>
                <div>
                  <div style={{ color: '#fff', fontWeight: 900, fontSize: '1.3rem', letterSpacing: '-0.02em', marginBottom: '0.35rem' }}>
                    New users get Ultra — <span style={{ background: 'linear-gradient(90deg, #a855f7, #ec4899)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>FREE for 30 days</span>
                  </div>
                  <div style={{ color: '#94a3b8', fontSize: '0.9rem' }}>4K export · Unlimited projects · All AI features · No credit card</div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '0.75rem', flexShrink: 0 }}>
                <Link to="/pricing" style={{
                  padding: '0.75rem 1.5rem', borderRadius: '0.875rem',
                  border: '1px solid rgba(168,85,247,0.35)', color: '#c084fc',
                  fontWeight: 700, fontSize: '0.9rem', textDecoration: 'none',
                }}>See Plans</Link>
                <button
                  onClick={claimFreeTrial}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '0.4rem',
                    padding: '0.75rem 1.5rem', borderRadius: '0.875rem',
                    background: 'linear-gradient(135deg, #a855f7, #ec4899)',
                    color: '#fff', fontWeight: 700, fontSize: '0.9rem',
                    border: 'none', cursor: 'pointer',
                    fontFamily: "'Inter', system-ui, sans-serif",
                    transition: 'opacity 0.2s, transform 0.15s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.opacity = '0.88'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
                  onMouseLeave={e => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.transform = 'none'; }}
                >
                  Claim Free Trial <ArrowRight size={15} />
                </button>
              </div>
            </motion.div>
          </section>
          )} {/* end showPromoBanner */}

          {/* Final CTA */}
          <section style={{ ...centered, paddingTop: '4rem', paddingBottom: '7rem' }}>
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }} whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }} transition={{ duration: 0.85, ease: [0.16, 1, 0.3, 1] }}
              style={{ position: 'relative', textAlign: 'center' }}
            >
              <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(90deg, rgba(34,211,238,0.15), rgba(168,85,247,0.15), rgba(217,70,239,0.15))', filter: 'blur(80px)', borderRadius: '50%' }} />
              <div style={{
                position: 'relative', background: 'rgba(15,23,42,0.65)', backdropFilter: 'blur(32px)',
                borderRadius: '3rem', border: '1px solid rgba(255,255,255,0.1)', padding: '5rem 4rem',
              }}>
                {/* Spinning logo mark */}
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '2rem' }}>
                  <motion.div
                    animate={{ rotate: 360 }} transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
                    style={{
                      width: '5rem', height: '5rem', borderRadius: '1.25rem',
                      border: '2px solid rgba(34,211,238,0.4)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background: 'radial-gradient(circle, rgba(34,211,238,0.12) 0%, transparent 70%)',
                    }}
                  >
                    <AnimatedLogo size="md" />
                  </motion.div>
                </div>
                <h2 style={{ fontSize: 'clamp(2.5rem, 5vw, 4rem)', fontWeight: 900, color: '#fff', letterSpacing: '-0.03em', marginBottom: '1.5rem' }}>
                  Ready to create?
                </h2>
                <p style={{ color: '#94a3b8', fontSize: '1.15rem', marginBottom: '3rem', maxWidth: '32rem', margin: '0 auto 3rem', lineHeight: 1.65 }}>
                  Join the AI4Montage beta. Drop your first video and experience
                  the next generation of Edge AI editing — right in your browser.
                </p>
                <MovingBorderButton to="/startup">
                  Launch AI4Montage <Wand2 size={18} style={{ display: 'inline', marginLeft: '0.5rem' }} />
                </MovingBorderButton>
              </div>
            </motion.div>
          </section>

          {/* Footer */}
          <footer style={{
            ...centered,
            paddingTop: '3rem', paddingBottom: '3rem',
            borderTop: '1px solid rgba(255,255,255,0.06)',
          }}>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: '2rem', marginBottom: '2.5rem', flexWrap: 'wrap' }}>
              {/* Brand */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.85rem' }}>
                  <AnimatedLogo size="sm" />
                  <span style={{ fontWeight: 900, color: '#fff', fontSize: '1.1rem', letterSpacing: '-0.03em' }}>AI4Montage</span>
                </div>
                <p style={{ color: '#475569', fontSize: '0.83rem', lineHeight: 1.7, maxWidth: '220px' }}>The first Edge AI video editor that runs entirely in your browser. No cloud. No limits.</p>
                <p style={{ color: '#334155', fontSize: '0.75rem', marginTop: '1.25rem' }}>© {new Date().getFullYear()} AI4Montage. All rights reserved.</p>
              </div>
              {/* Product */}
              <div>
                <div style={{ color: '#64748b', fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '1rem' }}>Product</div>
                {[['/', 'Home'], ['/pricing', 'Pricing'], ['/startup', 'Editor'], ['/about', 'About']].map(([href, label]) => (
                  <Link key={href} to={href} style={{ display: 'block', color: '#64748b', textDecoration: 'none', fontSize: '0.85rem', marginBottom: '0.6rem', transition: 'color 0.2s' }}
                    onMouseEnter={e => (e.currentTarget.style.color = '#94a3b8')}
                    onMouseLeave={e => (e.currentTarget.style.color = '#64748b')}>
                    {label}
                  </Link>
                ))}
              </div>
              {/* Legal */}
              <div>
                <div style={{ color: '#64748b', fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '1rem' }}>Legal</div>
                {[['/privacy', 'Privacy Policy'], ['/terms', 'Terms of Service'], ['/cookies', 'Cookies Policy']].map(([href, label]) => (
                  <Link key={href} to={href} style={{ display: 'block', color: '#64748b', textDecoration: 'none', fontSize: '0.85rem', marginBottom: '0.6rem', transition: 'color 0.2s' }}
                    onMouseEnter={e => (e.currentTarget.style.color = '#94a3b8')}
                    onMouseLeave={e => (e.currentTarget.style.color = '#64748b')}>
                    {label}
                  </Link>
                ))}
              </div>
              {/* Connect */}
              <div>
                <div style={{ color: '#64748b', fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '1rem' }}>Connect</div>
                {[['/contact', 'Contact Us'], ['https://github.com/nadeembadr00', 'GitHub'], ['https://x.com/nadeembadr00', 'Twitter / X']].map(([href, label]) => (
                  <Link key={label} to={href} style={{ display: 'block', color: '#64748b', textDecoration: 'none', fontSize: '0.85rem', marginBottom: '0.6rem', transition: 'color 0.2s' }}
                    onMouseEnter={e => (e.currentTarget.style.color = '#94a3b8')}
                    onMouseLeave={e => (e.currentTarget.style.color = '#64748b')}>
                    {label}
                  </Link>
                ))}
              </div>
            </div>
          </footer>
        </div>
      </div>
    </div>
  );
}
