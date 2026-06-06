import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CheckCircle, AlertCircle, Loader, ExternalLink } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { usePaddle, getPriceId, PADDLE_CONFIG } from '../../hooks/usePaddle';

interface Props {
  plan: 'pro' | 'ultra';
  billing: 'monthly' | 'yearly';
  onClose: () => void;
  onSuccess?: () => void;
}

type CheckoutStep = 'init' | 'open' | 'processing' | 'success' | 'error';

const PLAN_PRICES_USD = {
  pro:   { monthly: '$5/mo',  yearly: '$50/yr'  },
  ultra: { monthly: '$10/mo', yearly: '$100/yr' },
};

export function PaddleCheckout({ plan, billing, onClose, onSuccess }: Props) {
  const { user, userData } = useAuth();
  const [step, setStep] = useState<CheckoutStep>('init');
  const [errorMsg, setErrorMsg] = useState('');

  const handlePaddleEvent = useCallback((eventName: string, data: any) => {
    console.log('[Paddle Event]', eventName, data);

    switch (eventName) {
      case 'checkout.loaded':
        setStep('open');
        break;

      case 'checkout.completed':
        setStep('success');
        // Paddle webhook will update Firestore — just show success UI
        onSuccess?.();
        break;

      case 'checkout.error':
        setErrorMsg(data?.detail || 'Checkout encountered an error. Please try again.');
        setStep('error');
        break;

      case 'checkout.closed':
        // User closed without completing — go back to select
        if (step !== 'success') onClose();
        break;
    }
  }, [step, onClose, onSuccess]);

  const { openCheckout } = usePaddle(handlePaddleEvent);

  // Open Paddle overlay as soon as component mounts
  useEffect(() => {
    if (!user) {
      setErrorMsg('You must be signed in to subscribe.');
      setStep('error');
      return;
    }

    const priceId = getPriceId(plan, billing);

    // Check if placeholder — dev hint
    if (priceId.includes('REPLACE')) {
      setErrorMsg(
        `Paddle Price ID not configured.\n\nAdd your Price ID to .env:\nVITE_PADDLE_${plan.toUpperCase()}_${billing.toUpperCase()}=pri_xxxxxxxx`
      );
      setStep('error');
      return;
    }

    setStep('init');

    openCheckout({
      items: [{ priceId, quantity: 1 }],
      customer: { email: user.email || userData?.email || '' },
      customData: {
        uid: user.uid,
        plan,
        billing,
        userName: user.displayName || userData?.name || 'AI4Montage User',
      },
      settings: {
        displayMode: 'overlay',
        theme: 'dark',
        locale: 'en',
        successUrl: `${window.location.origin}/payment-success?gateway=paddle&plan=${plan}`,
      },
    }).catch((err) => {
      console.error('[PaddleCheckout]', err);
      setErrorMsg(err.message || 'Failed to open checkout.');
      setStep('error');
    });
  }, [plan, billing, user]);

  const planLabel = plan === 'pro' ? 'Pro' : 'Ultra';
  const priceLabel = PLAN_PRICES_USD[plan][billing];
  const accentColor = plan === 'ultra' ? '#a855f7' : '#22d3ee';

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={e => { if (e.target === e.currentTarget) onClose(); }}
        style={{
          position: 'fixed', inset: 0, zIndex: 2000,
          background: 'rgba(2,9,23,0.7)', backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '1rem',
        }}
      >
        {/* Only show our UI for non-open states (Paddle handles the open state) */}
        {step !== 'open' && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9 }}
            onClick={e => e.stopPropagation()}
            style={{
              width: '100%', maxWidth: '380px',
              background: 'rgba(10,15,30,0.99)',
              border: `1px solid ${accentColor}40`,
              borderRadius: '1.5rem',
              overflow: 'hidden',
              fontFamily: "'Inter', system-ui, sans-serif",
              boxShadow: `0 0 60px ${accentColor}20`,
            }}
          >
            {/* Header */}
            <div style={{
              padding: '1.25rem 1.5rem 1rem',
              borderBottom: '1px solid rgba(255,255,255,0.07)',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <div>
                <div style={{ color: '#fff', fontWeight: 800, fontSize: '1rem' }}>
                  Subscribe to {planLabel}
                </div>
                <div style={{ color: '#64748b', fontSize: '0.75rem', marginTop: '0.15rem' }}>
                  {priceLabel} · via Paddle · Cancel anytime
                </div>
              </div>
              <button onClick={onClose} style={{
                background: 'rgba(255,255,255,0.07)', border: 'none', borderRadius: '50%',
                width: '2rem', height: '2rem', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8',
              }}>
                <X size={14} />
              </button>
            </div>

            {/* Body */}
            <div style={{ padding: '2rem 1.5rem', textAlign: 'center' }}>

              {/* Loading / init */}
              {(step === 'init' || step === 'processing') && (
                <>
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                    style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem' }}
                  >
                    <Loader size={36} style={{ color: accentColor }} />
                  </motion.div>
                  <div style={{ color: '#fff', fontWeight: 700, marginBottom: '0.4rem' }}>
                    Opening Paddle Checkout…
                  </div>
                  <div style={{ color: '#64748b', fontSize: '0.8rem' }}>
                    A secure checkout window will appear shortly
                  </div>
                </>
              )}

              {/* Success */}
              {step === 'success' && (
                <>
                  <motion.div
                    initial={{ scale: 0 }} animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                    style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem' }}
                  >
                    <CheckCircle size={48} style={{ color: '#34d399' }} />
                  </motion.div>
                  <div style={{ color: '#fff', fontWeight: 800, fontSize: '1.1rem', marginBottom: '0.4rem' }}>
                    🎉 Welcome to {planLabel}!
                  </div>
                  <div style={{ color: '#94a3b8', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
                    Your subscription is being activated. This may take a moment.
                  </div>
                  <button
                    onClick={onClose}
                    style={{
                      width: '100%', padding: '0.875rem', borderRadius: '0.875rem',
                      background: `linear-gradient(135deg, ${accentColor}, #ec4899)`,
                      color: '#fff', fontWeight: 800, border: 'none', cursor: 'pointer',
                    }}
                  >
                    Start Creating →
                  </button>
                </>
              )}

              {/* Error */}
              {step === 'error' && (
                <>
                  <AlertCircle size={40} style={{ color: '#f87171', marginBottom: '1rem' }} />
                  <div style={{ color: '#fff', fontWeight: 700, marginBottom: '0.5rem' }}>
                    Checkout error
                  </div>
                  <pre style={{
                    color: '#94a3b8', fontSize: '0.78rem', marginBottom: '1.5rem',
                    whiteSpace: 'pre-wrap', textAlign: 'left',
                    background: 'rgba(255,255,255,0.03)', borderRadius: '0.5rem',
                    padding: '0.75rem', border: '1px solid rgba(255,255,255,0.07)',
                  }}>
                    {errorMsg}
                  </pre>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button
                      onClick={() => { setStep('init'); setErrorMsg(''); }}
                      style={{
                        flex: 1, padding: '0.75rem', borderRadius: '0.75rem',
                        background: `${accentColor}18`, border: `1px solid ${accentColor}35`,
                        color: accentColor, fontWeight: 700, cursor: 'pointer',
                      }}
                    >
                      Try Again
                    </button>
                    <a
                      href="https://developer.paddle.com"
                      target="_blank" rel="noopener noreferrer"
                      style={{
                        flex: 1, padding: '0.75rem', borderRadius: '0.75rem',
                        background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                        color: '#64748b', fontWeight: 600, cursor: 'pointer',
                        textDecoration: 'none', display: 'flex', alignItems: 'center',
                        justifyContent: 'center', gap: '0.4rem', fontSize: '0.8rem',
                      }}
                    >
                      Paddle Docs <ExternalLink size={12} />
                    </a>
                  </div>
                </>
              )}
            </div>

            {/* Footer */}
            <div style={{
              padding: '0.75rem 1.5rem',
              borderTop: '1px solid rgba(255,255,255,0.05)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1rem',
            }}>
              <span style={{ color: '#334155', fontSize: '0.7rem' }}>🔒 SSL Encrypted</span>
              <span style={{ color: '#334155', fontSize: '0.7rem' }}>
                Powered by{' '}
                <a href="https://paddle.com" target="_blank" rel="noopener noreferrer"
                  style={{ color: '#475569', textDecoration: 'none' }}>Paddle</a>
              </span>
              <span style={{ color: '#334155', fontSize: '0.7rem' }}>PCI DSS</span>
            </div>
          </motion.div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
