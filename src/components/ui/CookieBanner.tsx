import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Cookie, X, Check } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

const STORAGE_KEY = 'ai4m_cookie_consent';

type ConsentState = 'accepted' | 'declined' | null;

export function CookieBanner() {
  const { userData } = useAuth();
  const [consent, setConsent] = useState<ConsentState>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Only show to logged-in users who haven't decided yet
    if (!userData) return;
    const stored = localStorage.getItem(STORAGE_KEY) as ConsentState;
    if (!stored) {
      // Small delay so it slides in smoothly after page load
      const t = setTimeout(() => setVisible(true), 1200);
      return () => clearTimeout(t);
    }
    setConsent(stored);
  }, [userData]);

  const handleAccept = () => {
    localStorage.setItem(STORAGE_KEY, 'accepted');
    setConsent('accepted');
    setVisible(false);
  };

  const handleDecline = () => {
    localStorage.setItem(STORAGE_KEY, 'declined');
    setConsent('declined');
    setVisible(false);
  };

  // Don't render anything if not needed
  if (!userData || consent !== null) return null;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="cookie-banner"
          initial={{ y: 120, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 120, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 280, damping: 28 }}
          style={{
            position: 'fixed',
            bottom: '1.5rem',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 9999,
            width: 'min(90vw, 42rem)',
            borderRadius: '1.25rem',
            background: 'rgba(10,18,40,0.97)',
            backdropFilter: 'blur(24px)',
            border: '1px solid rgba(168,85,247,0.3)',
            boxShadow: '0 24px 64px rgba(0,0,0,0.6), 0 0 0 1px rgba(168,85,247,0.1)',
            padding: '1.25rem 1.5rem',
            fontFamily: "'Inter', system-ui, sans-serif",
            color: '#f1f5f9',
            direction: 'ltr',
          }}
        >
          {/* Glow accent */}
          <div style={{
            position: 'absolute', inset: 0, borderRadius: '1.25rem',
            background: 'radial-gradient(ellipse 60% 50% at 50% 100%, rgba(168,85,247,0.08), transparent)',
            pointerEvents: 'none',
          }} />

          <div style={{ position: 'relative', display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
            {/* Icon */}
            <div style={{
              flexShrink: 0, width: '2.5rem', height: '2.5rem', borderRadius: '0.75rem',
              background: 'rgba(168,85,247,0.15)', border: '1px solid rgba(168,85,247,0.3)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#c084fc',
            }}>
              <Cookie size={18} />
            </div>

            {/* Text */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 800, fontSize: '0.95rem', marginBottom: '0.3rem', color: '#fff' }}>
                We use minimal cookies 🍪
              </div>
              <div style={{ color: '#94a3b8', fontSize: '0.82rem', lineHeight: 1.6 }}>
                AI4Montage uses only an auth session cookie to keep you signed in.
                No tracking, no ads.{' '}
                <Link
                  to="/cookies"
                  style={{ color: '#c084fc', textDecoration: 'underline', textDecorationColor: 'rgba(192,132,252,0.4)' }}
                >
                  Learn more
                </Link>
              </div>
            </div>

            {/* Close (same as decline) */}
            <button
              onClick={handleDecline}
              aria-label="Close"
              style={{
                flexShrink: 0, background: 'transparent', border: 'none',
                color: '#475569', cursor: 'pointer', padding: '0.15rem',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                borderRadius: '0.4rem', transition: 'color 0.2s',
              }}
              onMouseEnter={e => (e.currentTarget.style.color = '#94a3b8')}
              onMouseLeave={e => (e.currentTarget.style.color = '#475569')}
            >
              <X size={16} />
            </button>
          </div>

          {/* Buttons */}
          <div style={{
            marginTop: '1rem', display: 'flex', gap: '0.6rem',
            justifyContent: 'flex-end', position: 'relative',
          }}>
            <button
              onClick={handleDecline}
              style={{
                padding: '0.55rem 1.1rem', borderRadius: '0.65rem',
                background: 'transparent', border: '1px solid rgba(255,255,255,0.12)',
                color: '#64748b', fontSize: '0.82rem', fontWeight: 600,
                cursor: 'pointer', fontFamily: "'Inter', system-ui, sans-serif",
                transition: 'border-color 0.2s, color 0.2s',
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.25)'; e.currentTarget.style.color = '#94a3b8'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)'; e.currentTarget.style.color = '#64748b'; }}
            >
              Essential only
            </button>
            <button
              onClick={handleAccept}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.4rem',
                padding: '0.55rem 1.25rem', borderRadius: '0.65rem',
                background: 'linear-gradient(135deg, #a855f7, #ec4899)',
                border: 'none', color: '#fff', fontSize: '0.82rem', fontWeight: 700,
                cursor: 'pointer', fontFamily: "'Inter', system-ui, sans-serif",
                transition: 'opacity 0.2s',
              }}
              onMouseEnter={e => (e.currentTarget.style.opacity = '0.88')}
              onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
            >
              <Check size={14} /> Accept & Continue
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
