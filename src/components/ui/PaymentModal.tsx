import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Loader, Shield, Lock } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';


interface Props {
  plan: 'pro' | 'ultra';
  billing: 'monthly' | 'yearly';
  onClose: () => void;
}

export function PaymentModal({ plan, billing, onClose }: Props) {
  const { userData, user, loading } = useAuth();
  const [step, setStep] = useState<'loading' | 'iframe' | 'error'>('loading');
  const [iframeUrl, setIframeUrl] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (loading) return; // Wait for Firebase Auth to initialize so we have a valid token
    if (!user) {
      setErrorMsg('You must be signed in to subscribe.');
      setStep('error');
      return;
    }

    const init = async () => {
      try {
        const token = await user.getIdToken();
        const res = await fetch(
          'https://us-central1-ai-roadmap-nadeem.cloudfunctions.net/createPaymobPayment',
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
              plan,
              billing,
              userEmail: user?.email || userData?.email || '',
              userName:  user?.displayName || userData?.name || 'AI4Montage User',
              uid: user?.uid || 'guest',
            }),
          }
        );
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Payment setup failed');
        setIframeUrl(data.iframeUrl);
        setStep('iframe');

      } catch (err: any) {
        console.error('[PaymentModal] Error:', err);
        setErrorMsg(err?.message || 'Failed to initialize payment. Please try again.');
        setStep('error');
      }
    };
    init();
  }, [plan, billing, loading, user]);

  const planLabel = plan === 'pro' ? 'Pro' : 'Ultra';
  const priceLabel = plan === 'pro'
    ? (billing === 'monthly' ? '250 EGP/mo' : '2,500 EGP/yr')
    : (billing === 'monthly' ? '500 EGP/mo' : '5,000 EGP/yr');

  return (
    <AnimatePresence>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, zIndex: 1000,
          background: 'rgba(2,9,23,0.88)', backdropFilter: 'blur(12px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '1rem',
        }}
      >
        {/* Modal */}
        <motion.div
          initial={{ opacity: 0, scale: 0.92, y: 24 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.92, y: 24 }}
          transition={{ type: 'spring', stiffness: 300, damping: 28 }}
          onClick={e => e.stopPropagation()}
          style={{
            width: '100%', maxWidth: '520px',
            background: 'rgba(15,23,42,0.95)', backdropFilter: 'blur(24px)',
            borderRadius: '1.75rem',
            border: plan === 'ultra'
              ? '1px solid rgba(168,85,247,0.3)'
              : '1px solid rgba(34,211,238,0.3)',
            overflow: 'hidden',
          }}
        >
          {/* Header */}
          <div style={{
            padding: '1.5rem 1.75rem 1.25rem',
            borderBottom: '1px solid rgba(255,255,255,0.07)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <div>
              <div style={{ color: '#fff', fontWeight: 800, fontSize: '1.1rem' }}>
                Subscribe to {planLabel} Plan
              </div>
              <div style={{ color: '#64748b', fontSize: '0.8rem', marginTop: '0.2rem' }}>
                {priceLabel} · Billed {billing} · Cancel anytime
              </div>
            </div>
            <button onClick={onClose} style={{
              background: 'rgba(255,255,255,0.07)', border: 'none', borderRadius: '50%',
              width: '2rem', height: '2rem', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8',
            }}>
              <X size={16} />
            </button>
          </div>

          {/* Body */}
          <div style={{ minHeight: '400px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            {step === 'loading' && (
              <div style={{ textAlign: 'center', padding: '3rem' }}>
                <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                  style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem' }}>
                  <Loader size={36} style={{ color: plan === 'ultra' ? '#a855f7' : '#22d3ee' }} />
                </motion.div>
                <div style={{ color: '#fff', fontWeight: 600, marginBottom: '0.4rem' }}>Preparing secure checkout…</div>
                <div style={{ color: '#64748b', fontSize: '0.82rem' }}>Connecting to Paymob payment gateway</div>
              </div>
            )}

            {step === 'iframe' && iframeUrl && (
              <iframe
                src={iframeUrl}
                title="Paymob Payment"
                style={{ width: '100%', height: '500px', border: 'none' }}
                allow="payment"
              />
            )}

            {step === 'error' && (
              <div style={{ textAlign: 'center', padding: '3rem' }}>
                <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>⚠️</div>
                <div style={{ color: '#fff', fontWeight: 700, marginBottom: '0.5rem' }}>Payment setup failed</div>
                <div style={{ color: '#94a3b8', fontSize: '0.85rem', marginBottom: '1.5rem' }}>{errorMsg}</div>
                <button
                  onClick={() => { setStep('loading'); setErrorMsg(''); }}
                  style={{
                    padding: '0.75rem 2rem', borderRadius: '0.875rem',
                    background: 'linear-gradient(135deg, #a855f7, #ec4899)',
                    color: '#fff', fontWeight: 700, border: 'none', cursor: 'pointer',
                  }}
                >
                  Try Again
                </button>
              </div>
            )}
          </div>

          {/* Security footer */}
          <div style={{
            padding: '0.875rem 1.75rem',
            borderTop: '1px solid rgba(255,255,255,0.06)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1.25rem',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: '#475569', fontSize: '0.72rem' }}>
              <Lock size={11} /> SSL Encrypted
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: '#475569', fontSize: '0.72rem' }}>
              <Shield size={11} /> Powered by Paymob
            </div>
            <div style={{ color: '#475569', fontSize: '0.72rem' }}>🔒 Test Mode</div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
