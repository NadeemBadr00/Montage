import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Loader, Shield, Lock, Globe, MapPin } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { PaddleCheckout } from './PaddleCheckout';

interface Props {
  plan: 'pro' | 'ultra';
  billing: 'monthly' | 'yearly';
  onClose: () => void;
}

type Gateway = 'select' | 'paddle' | 'paymob';
type PaymobStep = 'loading' | 'iframe' | 'error';

const PRICES = {
  pro:   { monthly: { usd: '$5/mo',  egp: '250 EGP/mo'  }, yearly: { usd: '$50/yr',  egp: '2,500 EGP/yr'  } },
  ultra: { monthly: { usd: '$10/mo', egp: '500 EGP/mo'  }, yearly: { usd: '$100/yr', egp: '5,000 EGP/yr'  } },
};

export function PaymentModal({ plan, billing, onClose }: Props) {
  const { userData, user, loading } = useAuth();
  const [gateway, setGateway] = useState<Gateway>('select');

  // Paymob state
  const [paymobStep, setPaymobStep] = useState<PaymobStep>('loading');
  const [iframeUrl, setIframeUrl] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const planLabel  = plan === 'pro' ? 'Pro' : 'Ultra';
  const accentColor = plan === 'ultra' ? '#a855f7' : '#22d3ee';
  const prices     = PRICES[plan][billing];

  // ── Paymob init (only when gateway = 'paymob') ───────────────────────────
  useEffect(() => {
    if (gateway !== 'paymob') return;
    if (loading) return;
    if (!user) { setErrorMsg('You must be signed in to subscribe.'); setPaymobStep('error'); return; }

    setPaymobStep('loading');
    const init = async () => {
      try {
        const token = await user.getIdToken();
        const res = await fetch(
          'https://us-central1-ai-roadmap-nadeem.cloudfunctions.net/createPaymobPayment',
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({
              plan, billing,
              userEmail: user?.email || userData?.email || '',
              userName:  user?.displayName || userData?.name || 'AI4Montage User',
              uid: user?.uid || 'guest',
            }),
          }
        );
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Payment setup failed');
        setIframeUrl(data.iframeUrl);
        setPaymobStep('iframe');
      } catch (err: any) {
        setErrorMsg(err?.message || 'Failed to initialize payment. Please try again.');
        setPaymobStep('error');
      }
    };
    init();
  }, [gateway, plan, billing, loading, user]);

  // ── Paddle path: render PaddleCheckout directly ───────────────────────────
  if (gateway === 'paddle') {
    return (
      <PaddleCheckout
        plan={plan}
        billing={billing}
        onClose={onClose}
        onSuccess={() => setTimeout(onClose, 3000)}
      />
    );
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, zIndex: 1000,
          background: 'rgba(2,9,23,0.88)', backdropFilter: 'blur(12px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem',
        }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.92, y: 24 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.92, y: 24 }}
          transition={{ type: 'spring', stiffness: 300, damping: 28 }}
          onClick={e => e.stopPropagation()}
          style={{
            width: '100%', maxWidth: gateway === 'paymob' ? '520px' : '460px',
            background: 'rgba(15,23,42,0.97)', backdropFilter: 'blur(24px)',
            borderRadius: '1.75rem',
            border: `1px solid ${accentColor}30`,
            overflow: 'hidden',
            fontFamily: "'Inter', system-ui, sans-serif",
          }}
        >
          {/* Header */}
          <div style={{
            padding: '1.5rem 1.75rem 1.25rem',
            borderBottom: '1px solid rgba(255,255,255,0.07)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            background: `${accentColor}08`,
          }}>
            <div>
              <div style={{ color: '#fff', fontWeight: 800, fontSize: '1.1rem' }}>
                Subscribe to {planLabel} Plan
              </div>
              <div style={{ color: '#64748b', fontSize: '0.8rem', marginTop: '0.2rem' }}>
                {gateway === 'select'
                  ? 'Choose your preferred payment method'
                  : `${prices.egp} · Billed ${billing} · Cancel anytime`}
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

          {/* ── GATEWAY SELECTION ── */}
          {gateway === 'select' && (
            <div style={{ padding: '1.75rem' }}>
              <div style={{ color: '#94a3b8', fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '1rem' }}>
                Select Payment Method
              </div>

              {/* Paddle Option */}
              <button
                onClick={() => setGateway('paddle')}
                style={{
                  width: '100%', padding: '1.25rem', borderRadius: '1rem', marginBottom: '0.75rem',
                  background: 'rgba(34,211,238,0.05)', border: '1px solid rgba(34,211,238,0.25)',
                  cursor: 'pointer', textAlign: 'left', transition: 'all 0.2s',
                  display: 'flex', alignItems: 'center', gap: '1rem',
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = '#22d3ee'; (e.currentTarget as HTMLElement).style.background = 'rgba(34,211,238,0.09)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(34,211,238,0.25)'; (e.currentTarget as HTMLElement).style.background = 'rgba(34,211,238,0.05)'; }}
              >
                <div style={{
                  width: '2.75rem', height: '2.75rem', borderRadius: '0.75rem', flexShrink: 0,
                  background: 'rgba(34,211,238,0.12)', border: '1px solid rgba(34,211,238,0.25)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Globe size={20} style={{ color: '#22d3ee' }} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ color: '#fff', fontWeight: 800, fontSize: '0.95rem', marginBottom: '0.2rem' }}>
                    🌍 Paddle — International
                    <span style={{
                      marginLeft: '0.5rem', fontSize: '0.65rem', fontWeight: 700,
                      padding: '0.15rem 0.5rem', borderRadius: '99px',
                      background: 'rgba(34,211,238,0.12)', color: '#22d3ee',
                      border: '1px solid rgba(34,211,238,0.25)',
                    }}>RECOMMENDED</span>
                  </div>
                  <div style={{ color: '#64748b', fontSize: '0.78rem' }}>
                    {prices.usd} · Visa · Mastercard · PayPal · Apple Pay · Google Pay
                  </div>
                </div>
                <div style={{ color: '#22d3ee', fontSize: '1.2rem' }}>→</div>
              </button>

              {/* Paymob Option */}
              <button
                onClick={() => setGateway('paymob')}
                style={{
                  width: '100%', padding: '1.25rem', borderRadius: '1rem',
                  background: 'rgba(251,191,36,0.04)', border: '1px solid rgba(251,191,36,0.2)',
                  cursor: 'pointer', textAlign: 'left', transition: 'all 0.2s',
                  display: 'flex', alignItems: 'center', gap: '1rem',
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = '#fbbf24'; (e.currentTarget as HTMLElement).style.background = 'rgba(251,191,36,0.08)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(251,191,36,0.2)'; (e.currentTarget as HTMLElement).style.background = 'rgba(251,191,36,0.04)'; }}
              >
                <div style={{
                  width: '2.75rem', height: '2.75rem', borderRadius: '0.75rem', flexShrink: 0,
                  background: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.2)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '1.2rem',
                }}>🇪🇬</div>
                <div style={{ flex: 1 }}>
                  <div style={{ color: '#fff', fontWeight: 800, fontSize: '0.95rem', marginBottom: '0.2rem' }}>
                    🇪🇬 Paymob — Egypt Only
                  </div>
                  <div style={{ color: '#64748b', fontSize: '0.78rem' }}>
                    {prices.egp} · بطاقات بنكية مصرية · Fawry · Meeza
                  </div>
                </div>
                <div style={{ color: '#fbbf24', fontSize: '1.2rem' }}>→</div>
              </button>

              {/* Trust line */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1rem', marginTop: '1.25rem' }}>
                <span style={{ color: '#334155', fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                  <Lock size={10} /> SSL Encrypted
                </span>
                <span style={{ color: '#334155', fontSize: '0.7rem' }}>🔒 PCI DSS</span>
                <span style={{ color: '#334155', fontSize: '0.7rem' }}>✓ Cancel anytime</span>
              </div>
            </div>
          )}

          {/* ── PAYMOB IFRAME ── */}
          {gateway === 'paymob' && (
            <div>
              {/* Back button */}
              <div style={{ padding: '0.75rem 1.75rem 0', display: 'flex' }}>
                <button
                  onClick={() => { setGateway('select'); setPaymobStep('loading'); setIframeUrl(''); setErrorMsg(''); }}
                  style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
                >
                  ← Change payment method
                </button>
              </div>

              <div style={{ minHeight: '400px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                {paymobStep === 'loading' && (
                  <div style={{ textAlign: 'center', padding: '3rem' }}>
                    <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                      style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem' }}>
                      <Loader size={36} style={{ color: accentColor }} />
                    </motion.div>
                    <div style={{ color: '#fff', fontWeight: 600, marginBottom: '0.4rem' }}>Preparing secure checkout…</div>
                    <div style={{ color: '#64748b', fontSize: '0.82rem' }}>Connecting to Paymob payment gateway</div>
                  </div>
                )}

                {paymobStep === 'iframe' && iframeUrl && (
                  <iframe
                    src={iframeUrl}
                    title="Paymob Payment"
                    style={{ width: '100%', height: '500px', border: 'none' }}
                    allow="payment"
                  />
                )}

                {paymobStep === 'error' && (
                  <div style={{ textAlign: 'center', padding: '3rem' }}>
                    <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>⚠️</div>
                    <div style={{ color: '#fff', fontWeight: 700, marginBottom: '0.5rem' }}>Payment setup failed</div>
                    <div style={{ color: '#94a3b8', fontSize: '0.85rem', marginBottom: '1.5rem' }}>{errorMsg}</div>
                    <button
                      onClick={() => { setPaymobStep('loading'); setErrorMsg(''); }}
                      style={{
                        padding: '0.75rem 2rem', borderRadius: '0.875rem',
                        background: 'linear-gradient(135deg, #a855f7, #ec4899)',
                        color: '#fff', fontWeight: 700, border: 'none', cursor: 'pointer',
                      }}
                    >Try Again</button>
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
                <div style={{ color: '#475569', fontSize: '0.72rem' }}>🔒 PCI DSS Compliant</div>
              </div>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
