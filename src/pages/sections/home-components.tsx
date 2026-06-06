import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ChevronRight, ArrowRight, Sparkles,
  Globe, Lock, Zap, User, LogOut,
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

/* ─── Shared centered-container style ──────────────────────────────── */
export const centered: React.CSSProperties = {
  width: '100%',
  maxWidth: '1152px',
  marginLeft: 'auto',
  marginRight: 'auto',
  paddingLeft: '1rem',
  paddingRight: '1rem',
  boxSizing: 'border-box',
};

/* ─── Moving border CTA ─────────────────────────────────────────────── */
export function MovingBorderButton({ children, to }: { children: React.ReactNode; to: string }) {
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
export function BentoCard({ icon, title, desc, accent, image }: {
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
      <div style={{
        position: 'absolute', inset: 0, borderRadius: '1.5rem', pointerEvents: 'none',
        background: `radial-gradient(ellipse at 25% 25%, ${accent}1a, transparent 65%)`,
        opacity: hovered ? 1 : 0, transition: 'opacity 0.4s',
      }} />
      {image && (
        <div style={{ position: 'absolute', inset: 0, borderRadius: '1.5rem', overflow: 'hidden' }}>
          <img src={image} alt="" style={{
            width: '100%', height: '100%', objectFit: 'cover',
            opacity: hovered ? 0.1 : 0.05, transition: 'opacity 0.5s',
          }} />
        </div>
      )}
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
export function StatCard({ value, label, accent }: { value: string; label: string; accent: string }) {
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
export function ShowcaseSection() {
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
                <motion.div key={i} initial={{ opacity: 0, x: -16 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: 0.3 + i * 0.1 }} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div style={{ width: '2rem', height: '2rem', borderRadius: '0.6rem', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, background: `${item.color}18`, border: `1px solid ${item.color}35`, color: item.color }}>{item.icon}</div>
                  <span style={{ color: '#cbd5e1', fontWeight: 500 }}>{item.text}</span>
                </motion.div>
              ))}
            </div>
          </div>
          <div style={{ padding: '2rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <motion.div style={{ position: 'relative', width: '100%' }} animate={{ y: [-6, 6, -6] }} transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}>
              <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg, rgba(34,211,238,0.25), rgba(168,85,247,0.25))', borderRadius: '1.5rem', filter: 'blur(32px)' }} />
              <video src="/vidMotion1.mp4" autoPlay loop muted playsInline disablePictureInPicture style={{ position: 'relative', zIndex: 1, width: '100%', borderRadius: '1.5rem', boxShadow: '0 40px 80px rgba(0,0,0,0.65)', border: '1px solid rgba(255,255,255,0.1)', display: 'block', pointerEvents: 'none', userSelect: 'none', outline: 'none' }} />
            </motion.div>
          </div>
        </div>
      </div>
    </motion.section>
  );
}

/* ─── User Nav Button helpers ────────────────────────────────────────── */
export const PLAN_META: Record<string, { label: string; accent: string; bg: string; border: string }> = {
  ultra: { label: 'Ultra',  accent: '#c084fc', bg: 'rgba(168,85,247,0.15)',  border: 'rgba(168,85,247,0.4)' },
  pro:   { label: 'Pro',    accent: '#22d3ee', bg: 'rgba(34,211,238,0.12)',   border: 'rgba(34,211,238,0.35)' },
  free:  { label: 'Free',   accent: '#94a3b8', bg: 'rgba(148,163,184,0.08)', border: 'rgba(148,163,184,0.2)' },
};

export function daysLeft(expiresAt: number | null | undefined): number | null {
  if (!expiresAt) return null;
  const ms = expiresAt - Date.now();
  if (ms <= 0) return 0;
  return Math.ceil(ms / (1000 * 60 * 60 * 24));
}

export function UserNavButton() {
  const { userData, signOut } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  if (!userData) {
    return (
      <Link to="/login" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.6rem 1.25rem', borderRadius: '0.75rem', background: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.2)', color: '#fff', fontSize: '0.875rem', fontWeight: 700, textDecoration: 'none' }}>Sign In <ArrowRight size={16} /></Link>
    );
  }

  const initials = (userData.name || userData.email || '?').split(' ').slice(0, 2).map((w: string) => w[0]).join('').toUpperCase();
  const plan     = userData.plan ?? 'free';
  const meta     = PLAN_META[plan] ?? PLAN_META.free;
  const remaining = daysLeft(userData.planExpiresAt);
  const isPaidPlan = !!(userData.billing);
  const trialTotal = 30;
  const progressPct = remaining !== null ? Math.max(0, Math.min(100, (remaining / trialTotal) * 100)) : 100;

  return (
    <div style={{ position: 'relative' }}>
      <button onClick={() => setOpen(o => !o)} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.35rem 0.75rem 0.35rem 0.35rem', borderRadius: '99px', cursor: 'pointer', background: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.15)', color: '#fff', fontSize: '0.875rem', fontWeight: 600 }}>
        {userData.photo
          ? <img src={userData.photo} alt={userData.name} style={{ width: '1.85rem', height: '1.85rem', borderRadius: '50%', objectFit: 'cover', border: `2px solid ${meta.accent}80` }} />
          : <div style={{ width: '1.85rem', height: '1.85rem', borderRadius: '50%', background: 'linear-gradient(135deg,#a855f7,#22d3ee)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 800 }}>{initials}</div>
        }
        <span style={{ maxWidth: '7rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{userData.name?.split(' ')[0] || 'User'}</span>
        <span style={{ fontSize: '0.65rem', fontWeight: 800, padding: '0.15rem 0.5rem', borderRadius: '99px', background: meta.bg, border: `1px solid ${meta.border}`, color: meta.accent, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{meta.label}</span>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.7, transition: 'transform 0.2s', transform: open ? 'rotate(180deg)' : 'none' }}><polyline points="6 9 12 15 18 9"/></svg>
      </button>

      {open && (
        <>
          <div style={{ position: 'fixed', inset: 0, zIndex: 40 }} onClick={() => setOpen(false)} />
          <motion.div initial={{ opacity: 0, y: -8, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} style={{ position: 'absolute', top: 'calc(100% + 0.6rem)', right: 0, zIndex: 50, minWidth: '15rem', borderRadius: '1rem', background: 'rgba(10,18,40,0.98)', backdropFilter: 'blur(24px)', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 20px 60px rgba(0,0,0,0.6)', overflow: 'hidden' }}>
            <div style={{ padding: '1rem 1rem 0.85rem', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
              <div style={{ color: '#fff', fontWeight: 700, fontSize: '0.9rem', marginBottom: '0.15rem' }}>{userData.name}</div>
              <div style={{ color: '#64748b', fontSize: '0.72rem', overflow: 'hidden', textOverflow: 'ellipsis', marginBottom: '0.75rem' }}>{userData.email}</div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', padding: '0.25rem 0.7rem', borderRadius: '99px', background: meta.bg, border: `1px solid ${meta.border}`, color: meta.accent, fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>✦ {meta.label} Plan</div>
                {remaining !== null && (<div style={{ fontSize: '0.72rem', color: remaining <= 5 ? '#f87171' : '#94a3b8', fontWeight: 600 }}>{remaining === 0 ? 'Expired' : `${remaining}d left`}</div>)}
              </div>
              {remaining !== null && remaining > 0 && (
                <div style={{ marginTop: '0.6rem' }}>
                  <div style={{ height: '4px', borderRadius: '99px', background: 'rgba(255,255,255,0.07)', overflow: 'hidden' }}>
                    <div style={{ height: '100%', borderRadius: '99px', width: `${progressPct}%`, background: remaining <= 5 ? 'linear-gradient(90deg,#f87171,#fca5a5)' : `linear-gradient(90deg,${meta.accent},${meta.accent}99)`, transition: 'width 0.5s ease' }} />
                  </div>
                  <div style={{ fontSize: '0.65rem', color: '#475569', marginTop: '0.3rem' }}>{remaining === 1 ? '1 day' : `${remaining} days`} remaining{isPaidPlan ? '' : ' in trial'}</div>
                </div>
              )}
              {(remaining === 0 || (remaining !== null && remaining <= 5 && plan !== 'free')) && (
                <Link to="/pricing" onClick={() => setOpen(false)} style={{ display: 'block', marginTop: '0.6rem', textAlign: 'center', padding: '0.4rem', borderRadius: '0.5rem', background: 'linear-gradient(135deg,#a855f7,#ec4899)', color: '#fff', fontSize: '0.72rem', fontWeight: 700, textDecoration: 'none' }}>⚡ Upgrade Plan</Link>
              )}
            </div>
            <div style={{ padding: '0.5rem' }}>
              {[{ icon: <User size={15}/>, label: 'Go to Editor', action: () => { setOpen(false); navigate('/startup'); }}].map(item => (
                <button key={item.label} onClick={item.action} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', width: '100%', padding: '0.65rem 0.85rem', borderRadius: '0.6rem', background: 'transparent', border: 'none', color: '#cbd5e1', fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer', textAlign: 'left', transition: 'background 0.15s' }} onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.06)')} onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>{item.icon} {item.label}</button>
              ))}
              <button onClick={async () => { setOpen(false); await signOut(); navigate('/'); }} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', width: '100%', padding: '0.65rem 0.85rem', borderRadius: '0.6rem', background: 'transparent', border: 'none', color: '#f87171', fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer', textAlign: 'left', transition: 'background 0.15s' }} onMouseEnter={e => (e.currentTarget.style.background = 'rgba(248,113,113,0.08)')} onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}><LogOut size={15} /> Sign Out</button>
            </div>
          </motion.div>
        </>
      )}
    </div>
  );
}
