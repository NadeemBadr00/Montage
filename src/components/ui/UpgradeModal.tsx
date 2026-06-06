import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Crown, Sparkles, X, ArrowRight, Lock } from 'lucide-react';

interface UpgradeEvent {
  feature: string;
  requiredPlan: 'pro' | 'ultra';
}

const PLAN_INFO = {
  pro: {
    label: 'Pro',
    price: '$5/mo',
    color: '#22d3ee',
    gradient: 'linear-gradient(135deg, #22d3ee, #a855f7)',
    icon: <Sparkles size={20} />,
    perks: ['4K Export', 'Background Remover', 'Unlimited Projects', 'Custom Fonts', 'Speed Ramp'],
  },
  ultra: {
    label: 'Ultra',
    price: '$10/mo',
    color: '#a855f7',
    gradient: 'linear-gradient(135deg, #a855f7, #ec4899)',
    icon: <Crown size={20} />,
    perks: ['Auto Montage AI', 'AI Auto Captions', 'Beat Detection', 'Scene Detection', 'Version History'],
  },
};

export function UpgradeModal() {
  const [event, setEvent] = useState<UpgradeEvent | null>(null);

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<UpgradeEvent>).detail;
      setEvent(detail);
    };
    window.addEventListener('ai4m:upgrade-required', handler);
    return () => window.removeEventListener('ai4m:upgrade-required', handler);
  }, []);

  const close = () => setEvent(null);

  if (!event) return null;

  const plan = PLAN_INFO[event.requiredPlan] ?? PLAN_INFO.pro;

  return (
    <AnimatePresence>
      <motion.div
        key="upgrade-backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={close}
        style={{
          position: 'fixed', inset: 0, zIndex: 9999,
          background: 'rgba(2,9,23,0.85)', backdropFilter: 'blur(12px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '1rem',
        }}
      >
        <motion.div
          key="upgrade-modal"
          initial={{ opacity: 0, scale: 0.9, y: 24 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 24 }}
          transition={{ type: 'spring', stiffness: 300, damping: 28 }}
          onClick={e => e.stopPropagation()}
          style={{
            width: '100%', maxWidth: '420px',
            background: 'rgba(10,15,30,0.98)',
            backdropFilter: 'blur(24px)',
            borderRadius: '1.75rem',
            border: `1px solid ${plan.color}40`,
            boxShadow: `0 0 60px ${plan.color}20`,
            overflow: 'hidden',
            fontFamily: "'Inter', system-ui, sans-serif",
          }}
        >
          {/* Header */}
          <div style={{
            padding: '1.5rem 1.75rem 1.25rem',
            background: `linear-gradient(135deg, ${plan.color}12, transparent)`,
            borderBottom: '1px solid rgba(255,255,255,0.06)',
            display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{
                width: '2.75rem', height: '2.75rem', borderRadius: '0.875rem',
                background: `${plan.color}18`, border: `1px solid ${plan.color}35`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: plan.color,
              }}>
                <Lock size={20} />
              </div>
              <div>
                <div style={{ color: '#fff', fontWeight: 800, fontSize: '1rem' }}>
                  Upgrade to {plan.label}
                </div>
                <div style={{ color: '#64748b', fontSize: '0.75rem', marginTop: '0.1rem' }}>
                  to unlock {event.feature}
                </div>
              </div>
            </div>
            <button
              onClick={close}
              style={{
                background: 'rgba(255,255,255,0.07)', border: 'none', borderRadius: '50%',
                width: '2rem', height: '2rem', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8',
                flexShrink: 0,
              }}
            >
              <X size={15} />
            </button>
          </div>

          {/* Body */}
          <div style={{ padding: '1.5rem 1.75rem' }}>
            {/* Feature locked info */}
            <div style={{
              padding: '0.875rem 1rem', borderRadius: '0.875rem', marginBottom: '1.25rem',
              background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)',
              display: 'flex', alignItems: 'center', gap: '0.75rem',
            }}>
              <span style={{ fontSize: '1.5rem' }}>🔒</span>
              <div>
                <div style={{ color: '#fff', fontWeight: 700, fontSize: '0.875rem' }}>
                  {event.feature}
                </div>
                <div style={{ color: '#64748b', fontSize: '0.75rem', marginTop: '0.15rem' }}>
                  Available on {plan.label} plan ({plan.price})
                </div>
              </div>
            </div>

            {/* What you get */}
            <div style={{ marginBottom: '1.5rem' }}>
              <div style={{ color: '#94a3b8', fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.75rem' }}>
                {plan.label} plan includes:
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {plan.perks.map(perk => (
                  <div key={perk} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                    <div style={{
                      width: '1.2rem', height: '1.2rem', borderRadius: '50%', flexShrink: 0,
                      background: `${plan.color}18`, border: `1px solid ${plan.color}35`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <svg width="8" height="8" viewBox="0 0 12 12" fill="none">
                        <path d="M2 6l3 3 5-5" stroke={plan.color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                    <span style={{ color: '#cbd5e1', fontSize: '0.85rem' }}>{perk}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Price + CTA */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
              <Link
                to="/pricing"
                onClick={close}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                  padding: '0.875rem', borderRadius: '0.875rem',
                  background: plan.gradient,
                  color: '#fff', fontWeight: 800, fontSize: '0.95rem',
                  textDecoration: 'none', letterSpacing: '-0.01em',
                  boxShadow: `0 4px 20px ${plan.color}30`,
                }}
              >
                {plan.icon}
                Upgrade to {plan.label} — {plan.price}
                <ArrowRight size={16} />
              </Link>
              <button
                onClick={close}
                style={{
                  padding: '0.6rem', borderRadius: '0.875rem',
                  background: 'transparent', border: '1px solid rgba(255,255,255,0.08)',
                  color: '#64748b', fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer',
                }}
              >
                Maybe later
              </button>
            </div>
          </div>

          {/* Footer */}
          <div style={{
            padding: '0.75rem 1.75rem',
            borderTop: '1px solid rgba(255,255,255,0.05)',
            textAlign: 'center', color: '#475569', fontSize: '0.72rem',
          }}>
            🎁 New users get 30 days Ultra FREE — No credit card needed
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
