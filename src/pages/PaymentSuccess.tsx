import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CheckCircle, XCircle, ArrowRight, Loader } from 'lucide-react';
import { AnimatedLogo } from '../components/ui/AnimatedLogo';
import { useAuth } from '../hooks/useAuth';

export default function PaymentSuccess() {
  const [searchParams] = useSearchParams();
  const { userData, user } = useAuth();
  const [status, setStatus] = useState<'loading' | 'success' | 'failed'>('loading');

  const success = searchParams.get('success');
  // Paymob VPC/MPGS redirect includes ?id=TRANSACTION_ID (NOT order ID)
  const transactionId = searchParams.get('id') || '';
  const txnId = transactionId; // for display

  useEffect(() => {
    if (success !== 'true' && success !== '1') {
      setStatus('failed');
      return;
    }

    if (!transactionId) {
      setStatus('success');
      return;
    }

    // Zero-Trust: send ONLY the transaction ID to backend
    // Backend verifies with Paymob API and extracts order from server-side
    const confirm = async () => {
      try {
        const res = await fetch(
          'https://us-central1-ai-roadmap-nadeem.cloudfunctions.net/confirmPayment',
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ transactionId }),
          }
        );
        const data = await res.json();
        console.log('[PaymentSuccess] confirmPayment response:', data);
        setStatus('success');
        localStorage.setItem('ai4m_ultra_promo_seen', '1');
      } catch (err) {
        console.error('[PaymentSuccess] confirmPayment error:', err);
        setStatus('success'); // Don't block user on network error
      }
    };

    confirm();
  }, [success, transactionId]);



  return (
    <div style={{
      minHeight: '100vh', background: '#020917',
      color: '#f1f5f9', fontFamily: "'Inter', system-ui, sans-serif",
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      padding: '2rem',
    }}>
      {/* Logo */}
      <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', textDecoration: 'none', marginBottom: '3rem' }}>
        <AnimatedLogo size="sm" />
        <span style={{ fontSize: '1.2rem', fontWeight: 900, color: '#fff', letterSpacing: '-0.04em' }}>AI4Montage</span>
      </Link>

      <motion.div
        initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6 }}
        style={{
          maxWidth: '28rem', width: '100%', textAlign: 'center',
          padding: '3rem 2.5rem', borderRadius: '2rem',
          background: 'rgba(15,23,42,0.8)', backdropFilter: 'blur(24px)',
          border: status === 'success'
            ? '1px solid rgba(52,211,153,0.3)'
            : status === 'failed'
            ? '1px solid rgba(239,68,68,0.3)'
            : '1px solid rgba(255,255,255,0.08)',
        }}
      >
        {status === 'loading' && (
          <>
            <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.5rem' }}>
              <Loader size={48} style={{ color: '#a855f7' }} />
            </motion.div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#fff', marginBottom: '0.5rem' }}>
              Confirming your payment…
            </h2>
            <p style={{ color: '#64748b' }}>Just a moment please</p>
          </>
        )}

        {status === 'success' && (
          <>
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 200, delay: 0.2 }}
              style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.5rem' }}>
              <CheckCircle size={64} style={{ color: '#34d399' }} />
            </motion.div>
            <h2 style={{ fontSize: '1.75rem', fontWeight: 900, color: '#fff', marginBottom: '0.75rem', letterSpacing: '-0.03em' }}>
              Payment Successful! 🎉
            </h2>
            <p style={{ color: '#94a3b8', lineHeight: 1.7, marginBottom: '2rem' }}>
              Your subscription is now active. Welcome to{' '}
              <strong style={{ color: '#c084fc' }}>AI4Montage {userData?.plan === 'pro' ? 'Pro' : 'Ultra'}</strong>!
            </p>
            {txnId && (
              <div style={{
                padding: '0.75rem 1rem', borderRadius: '0.75rem', marginBottom: '2rem',
                background: 'rgba(52,211,153,0.08)', border: '1px solid rgba(52,211,153,0.2)',
                color: '#94a3b8', fontSize: '0.78rem',
              }}>
                Transaction ID: <span style={{ color: '#e2e8f0', fontFamily: 'monospace' }}>{txnId}</span>
              </div>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <Link to="/startup" style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                padding: '1rem 2rem', borderRadius: '1rem',
                background: 'linear-gradient(135deg, #a855f7, #ec4899)',
                color: '#fff', fontWeight: 800, fontSize: '1rem', textDecoration: 'none',
              }}>
                Open Editor <ArrowRight size={18} />
              </Link>
              <Link to="/pricing" style={{
                color: '#64748b', fontSize: '0.85rem', textDecoration: 'none',
              }}>
                View your plan →
              </Link>
            </div>
          </>
        )}

        {status === 'failed' && (
          <>
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 200, delay: 0.2 }}
              style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.5rem' }}>
              <XCircle size={64} style={{ color: '#ef4444' }} />
            </motion.div>
            <h2 style={{ fontSize: '1.75rem', fontWeight: 900, color: '#fff', marginBottom: '0.75rem', letterSpacing: '-0.03em' }}>
              Payment Failed
            </h2>
            <p style={{ color: '#94a3b8', lineHeight: 1.7, marginBottom: '2rem' }}>
              Something went wrong with your payment. No charges were made. Please try again.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <Link to="/pricing" style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                padding: '1rem 2rem', borderRadius: '1rem',
                background: 'linear-gradient(135deg, #a855f7, #ec4899)',
                color: '#fff', fontWeight: 800, fontSize: '1rem', textDecoration: 'none',
              }}>
                Try Again <ArrowRight size={18} />
              </Link>
              <Link to="/" style={{ color: '#64748b', fontSize: '0.85rem', textDecoration: 'none' }}>
                Back to Home
              </Link>
            </div>
          </>
        )}
      </motion.div>
    </div>
  );
}
