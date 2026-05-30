import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sparkles, Zap } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

const SEEN_KEY    = 'ai4m_ultra_promo_seen';
const STORAGE_KEY = 'p43_user';

export function UltraPromoBanner() {
  const { userData } = useAuth();
  const navigate = useNavigate();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!userData) return;

    const plan        = userData.plan ?? 'free';
    const alreadySeen = !!localStorage.getItem(SEEN_KEY);
    const hadTrial    = !!userData.planExpiresAt;

    if (plan === 'free' && !alreadySeen && !hadTrial) {
      const t = setTimeout(() => setVisible(true), 2000);
      return () => clearTimeout(t);
    }
  }, [userData]);

  const dismiss = () => {
    localStorage.setItem(SEEN_KEY, '1');
    setVisible(false);
  };

  const activateUltra = () => {
    localStorage.setItem(SEEN_KEY, '1');
    const stored  = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    const updated = {
      ...stored,
      plan: 'ultra',
      planExpiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    setVisible(false);
    navigate('/startup');
    setTimeout(() => window.location.reload(), 80);
  };

  return (
    <AnimatePresence>
      {visible && (
        <>
          {/* Backdrop */}
          <motion.div
            key="promo-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={dismiss}
            style={{
              position: 'fixed', inset: 0, zIndex: 9998,
              background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)',
            }}
          />

          {/* ── Centering wrapper — NOT animated, so transform stays pure ── */}
          <div style={{
            position: 'fixed', inset: 0, zIndex: 9999,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            pointerEvents: 'none',
          }}>
            <motion.div
              key="promo-card"
              initial={{ opacity: 0, scale: 0.88, y: 32 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 16 }}
              transition={{ type: 'spring', stiffness: 300, damping: 26 }}
              style={{
                pointerEvents: 'auto',
                width: 'min(90vw, 480px)',
                borderRadius: '1.75rem',
                background: 'rgba(8,14,36,0.99)',
                backdropFilter: 'blur(32px)',
                border: '1px solid rgba(168,85,247,0.35)',
                boxShadow: '0 0 0 1px rgba(168,85,247,0.1), 0 32px 80px rgba(0,0,0,0.8), 0 0 100px rgba(168,85,247,0.15)',
                overflow: 'hidden',
                fontFamily: "'Inter', system-ui, sans-serif",
                direction: 'ltr',
              }}
            >
              {/* Top gradient stripe */}
              <div style={{
                position: 'absolute', top: 0, left: 0, right: 0, height: '3px',
                background: 'linear-gradient(90deg, #a855f7, #ec4899, #22d3ee)',
              }} />

              {/* Ambient glow */}
              <div style={{
                position: 'absolute', top: '-5rem', left: '50%', transform: 'translateX(-50%)',
                width: '22rem', height: '22rem', borderRadius: '50%',
                background: 'radial-gradient(circle, rgba(168,85,247,0.15), transparent 70%)',
                pointerEvents: 'none',
              }} />

              <div style={{ position: 'relative', padding: '2rem 2rem 1.75rem' }}>
                {/* Close button */}
                <button
                  onClick={dismiss}
                  aria-label="Dismiss"
                  style={{
                    position: 'absolute', top: '1rem', right: '1rem',
                    background: 'transparent', border: 'none', cursor: 'pointer',
                    color: '#475569', padding: '0.3rem', borderRadius: '0.4rem',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition: 'color 0.2s',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.color = '#94a3b8')}
                  onMouseLeave={e => (e.currentTarget.style.color = '#475569')}
                >
                  <X size={18} />
                </button>

                {/* Gift icon */}
                <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
                  <motion.div
                    animate={{ scale: [1, 1.13, 1], rotate: [-5, 5, -5, 0] }}
                    transition={{ duration: 2, repeat: Infinity, repeatDelay: 1.5 }}
                    style={{ display: 'inline-block', fontSize: '3rem', lineHeight: 1 }}
                  >
                    🎁
                  </motion.div>
                </div>

                {/* Badge + Headline */}
                <div style={{ textAlign: 'center', marginBottom: '0.85rem' }}>
                  <div style={{
                    display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
                    padding: '0.3rem 0.9rem', borderRadius: '99px',
                    background: 'rgba(168,85,247,0.12)', border: '1px solid rgba(168,85,247,0.3)',
                    color: '#c084fc', fontSize: '0.72rem', fontWeight: 700,
                    textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '0.9rem',
                  }}>
                    <Sparkles size={11} /> Limited Offer
                  </div>
                  <h2 style={{
                    fontSize: 'clamp(1.5rem, 5vw, 1.9rem)', fontWeight: 900,
                    color: '#fff', letterSpacing: '-0.03em', lineHeight: 1.1,
                    margin: 0,
                  }}>
                    Get{' '}
                    <span style={{
                      background: 'linear-gradient(90deg, #a855f7, #ec4899)',
                      WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                    }}>
                      Ultra Plan Free
                    </span>
                    <br />for 30 Days
                  </h2>
                </div>

                <p style={{
                  textAlign: 'center', color: '#94a3b8', fontSize: '0.875rem',
                  lineHeight: 1.65, margin: '0.75rem 0 1.25rem',
                }}>
                  You're on the Free plan. Unlock{' '}
                  <strong style={{ color: '#e2e8f0' }}>4K export</strong>,{' '}
                  <strong style={{ color: '#e2e8f0' }}>Sandwich AI</strong>,{' '}
                  <strong style={{ color: '#e2e8f0' }}>unlimited projects</strong>{' '}
                  and more — completely free for a month.
                </p>

                {/* Feature pills */}
                <div style={{
                  display: 'flex', flexWrap: 'wrap', gap: '0.4rem',
                  justifyContent: 'center', marginBottom: '1.6rem',
                }}>
                  {['4K Export', 'Sandwich AI', 'Style Transfer', 'BG Remover', 'Unlimited Projects', 'Priority Support'].map(f => (
                    <span key={f} style={{
                      padding: '0.28rem 0.7rem', borderRadius: '99px',
                      background: 'rgba(168,85,247,0.1)', border: '1px solid rgba(168,85,247,0.22)',
                      color: '#c084fc', fontSize: '0.73rem', fontWeight: 600,
                    }}>✓ {f}</span>
                  ))}
                </div>

                {/* CTA button */}
                <button
                  onClick={activateUltra}
                  style={{
                    width: '100%', padding: '1rem', borderRadius: '1rem',
                    background: 'linear-gradient(135deg, #a855f7, #ec4899)',
                    border: 'none', color: '#fff', fontSize: '1rem', fontWeight: 800,
                    cursor: 'pointer', letterSpacing: '-0.01em',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                    boxShadow: '0 8px 32px rgba(168,85,247,0.4)',
                    transition: 'opacity 0.2s, transform 0.15s',
                    fontFamily: "'Inter', system-ui, sans-serif",
                  }}
                  onMouseEnter={e => { e.currentTarget.style.opacity = '0.88'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                  onMouseLeave={e => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.transform = 'none'; }}
                >
                  <Zap size={18} fill="currentColor" />
                  Activate Ultra Free — 30 Days
                </button>

                {/* Dismiss link */}
                <div style={{ textAlign: 'center', marginTop: '0.85rem' }}>
                  <button
                    onClick={dismiss}
                    style={{
                      background: 'transparent', border: 'none', cursor: 'pointer',
                      color: '#475569', fontSize: '0.78rem',
                      fontFamily: "'Inter', system-ui, sans-serif",
                      transition: 'color 0.2s',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.color = '#64748b')}
                    onMouseLeave={e => (e.currentTarget.style.color = '#475569')}
                  >
                    No thanks, I'll stay on Free
                  </button>
                </div>
                <div style={{ textAlign: 'center', marginTop: '0.4rem', color: '#334155', fontSize: '0.68rem' }}>
                  No credit card required · Downgrades automatically after 30 days
                </div>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
