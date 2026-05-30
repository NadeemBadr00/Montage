import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, User, LogOut, Receipt } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

/* ── Plan metadata ───────────────────────────────────────────────────── */
const PLAN_META: Record<string, { label: string; accent: string; bg: string; border: string }> = {
  ultra: { label: 'Ultra', accent: '#c084fc', bg: 'rgba(168,85,247,0.15)',  border: 'rgba(168,85,247,0.4)' },
  pro:   { label: 'Pro',   accent: '#22d3ee', bg: 'rgba(34,211,238,0.12)',   border: 'rgba(34,211,238,0.35)' },
  free:  { label: 'Free',  accent: '#94a3b8', bg: 'rgba(148,163,184,0.08)', border: 'rgba(148,163,184,0.2)' },
};

function daysLeft(expiresAt: number | null | undefined): number | null {
  if (!expiresAt) return null;
  const ms = expiresAt - Date.now();
  if (ms <= 0) return 0;
  return Math.ceil(ms / (1000 * 60 * 60 * 24));
}

/* ── Shared UserNavButton ─────────────────────────────────────────────── */
export function UserNavButton() {
  const { userData, signOut } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  if (!userData) {
    return (
      <Link
        to="/login"
        style={{
          display: 'flex', alignItems: 'center', gap: '0.5rem',
          padding: '0.55rem 1.25rem', borderRadius: '0.75rem',
          background: 'linear-gradient(135deg,#a855f7,#ec4899)',
          color: '#fff', fontSize: '0.875rem', fontWeight: 700, textDecoration: 'none',
          transition: 'opacity 0.2s',
        }}
        onMouseEnter={e => (e.currentTarget.style.opacity = '0.85')}
        onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
      >
        Sign In <ArrowRight size={15} />
      </Link>
    );
  }

  const initials = (userData.name || userData.email || '?')
    .split(' ').slice(0, 2).map((w: string) => w[0]).join('').toUpperCase();

  const plan      = userData.plan ?? 'free';
  const meta      = PLAN_META[plan] ?? PLAN_META.free;
  const remaining = daysLeft(userData.planExpiresAt);
  const isPaidPlan = !!(userData.billing); // billing is only set when user actually paid
  const trialTotal = 30;
  const progressPct = remaining !== null
    ? Math.max(0, Math.min(100, (remaining / trialTotal) * 100))
    : 100;

  return (
    <div style={{ position: 'relative' }}>
      {/* Trigger button */}
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          display: 'flex', alignItems: 'center', gap: '0.55rem',
          padding: '0.35rem 0.75rem 0.35rem 0.35rem',
          borderRadius: '99px', cursor: 'pointer',
          background: 'rgba(255,255,255,0.08)', backdropFilter: 'blur(12px)',
          border: '1px solid rgba(255,255,255,0.13)', color: '#fff',
          fontSize: '0.875rem', fontWeight: 600,
        }}
      >
        {userData.photo
          ? <img src={userData.photo} alt={userData.name} style={{ width: '1.85rem', height: '1.85rem', borderRadius: '50%', objectFit: 'cover', border: `2px solid ${meta.accent}80` }} />
          : <div style={{ width: '1.85rem', height: '1.85rem', borderRadius: '50%', background: 'linear-gradient(135deg,#a855f7,#22d3ee)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 800 }}>{initials}</div>
        }
        <span style={{ maxWidth: '6rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {userData.name?.split(' ')[0] || 'User'}
        </span>
        <span style={{ fontSize: '0.62rem', fontWeight: 800, padding: '0.12rem 0.48rem', borderRadius: '99px', background: meta.bg, border: `1px solid ${meta.border}`, color: meta.accent, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
          {meta.label}
        </span>
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.6, transition: 'transform 0.2s', transform: open ? 'rotate(180deg)' : 'none' }}><polyline points="6 9 12 15 18 9"/></svg>
      </button>

      {open && (
        <>
          <div style={{ position: 'fixed', inset: 0, zIndex: 40 }} onClick={() => setOpen(false)} />
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            style={{
              position: 'absolute', top: 'calc(100% + 0.65rem)', right: 0, zIndex: 50,
              minWidth: '15rem', borderRadius: '1rem',
              background: 'rgba(10,18,40,0.98)', backdropFilter: 'blur(24px)',
              border: '1px solid rgba(255,255,255,0.1)',
              boxShadow: '0 24px 64px rgba(0,0,0,0.65)',
              overflow: 'hidden',
              fontFamily: "'Inter', system-ui, sans-serif",
            }}
          >
            {/* Profile section */}
            <div style={{ padding: '1rem 1rem 0.85rem', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
              <div style={{ color: '#fff', fontWeight: 700, fontSize: '0.9rem', marginBottom: '0.15rem' }}>{userData.name}</div>
              <div style={{ color: '#64748b', fontSize: '0.72rem', overflow: 'hidden', textOverflow: 'ellipsis', marginBottom: '0.75rem' }}>{userData.email}</div>

              {/* Plan pill + days remaining */}
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

              {/* Progress bar */}
              {remaining !== null && remaining > 0 && (
                <div style={{ marginTop: '0.6rem' }}>
                  <div style={{ height: '4px', borderRadius: '99px', background: 'rgba(255,255,255,0.07)', overflow: 'hidden' }}>
                    <div style={{
                      height: '100%', borderRadius: '99px', width: `${progressPct}%`,
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

              {/* Upgrade nudge */}
              {(remaining === 0 || (remaining !== null && remaining <= 5 && plan !== 'free')) && (
                <Link
                  to="/pricing"
                  onClick={() => setOpen(false)}
                  style={{ display: 'block', marginTop: '0.6rem', textAlign: 'center', padding: '0.4rem', borderRadius: '0.5rem', background: 'linear-gradient(135deg,#a855f7,#ec4899)', color: '#fff', fontSize: '0.72rem', fontWeight: 700, textDecoration: 'none' }}
                >
                  ⚡ Upgrade Plan
                </Link>
              )}
            </div>

            {/* Actions */}
            <div style={{ padding: '0.5rem' }}>
              <button
                onClick={() => { setOpen(false); navigate('/startup'); }}
                style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', width: '100%', padding: '0.65rem 0.85rem', borderRadius: '0.6rem', background: 'transparent', border: 'none', color: '#cbd5e1', fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer', textAlign: 'left', transition: 'background 0.15s' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.06)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                <User size={15} /> Go to Editor
              </button>
              <button
                onClick={() => { setOpen(false); navigate('/billing'); }}
                style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', width: '100%', padding: '0.65rem 0.85rem', borderRadius: '0.6rem', background: 'transparent', border: 'none', color: '#cbd5e1', fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer', textAlign: 'left', transition: 'background 0.15s' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.06)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                <Receipt size={15} /> Billing & History
              </button>
              <button
                onClick={async () => { setOpen(false); await signOut(); navigate('/'); }}
                style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', width: '100%', padding: '0.65rem 0.85rem', borderRadius: '0.6rem', background: 'transparent', border: 'none', color: '#f87171', fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer', textAlign: 'left', transition: 'background 0.15s' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(248,113,113,0.08)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                <LogOut size={15} /> Sign Out
              </button>
            </div>
          </motion.div>
        </>
      )}
    </div>
  );
}
