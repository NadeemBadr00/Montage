import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Star, ArrowRight, Rocket } from 'lucide-react';
import { AnimatedLogo } from '../components/ui/AnimatedLogo';
import { Footer } from '../components/ui/Footer';
import { UserNavButton } from '../components/ui/UserNavButton';
import { useAuth } from '../hooks/useAuth';
import { PaymentModal } from '../components/ui/PaymentModal';
import { planDefs, faqs, FaqItem, PlanCard } from './sections/pricing-components';

/* ── Main Pricing Page ───────────────────────────────────────────────────── */
export default function Pricing() {
  const { userData, user } = useAuth();
  const navigate = useNavigate();
  const userPlan   = userData?.plan ?? null;
  const isLoggedIn = !!userData;
  const [yearly, setYearly] = useState(false);
  const [payModal, setPayModal] = useState<{ plan: 'pro'|'ultra'; billing: 'monthly'|'yearly' } | null>(null);

  const handleSubscribe = (plan: 'pro'|'ultra', billing: 'monthly'|'yearly') => {
    setPayModal({ plan, billing });
  };

  return (
    <div dir="ltr" style={{
      minHeight: '100vh', background: '#020917', color: '#f1f5f9',
      fontFamily: "'Inter', system-ui, sans-serif", direction: 'ltr',
    }}>
      {/* Ambient glows */}
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', overflow: 'hidden', zIndex: 0 }}>
        <div style={{ position: 'absolute', top: '-20%', left: '20%', width: '40rem', height: '40rem', background: 'radial-gradient(circle, rgba(34,211,238,0.07), transparent 70%)', borderRadius: '50%' }} />
        <div style={{ position: 'absolute', bottom: '-20%', right: '10%', width: '35rem', height: '35rem', background: 'radial-gradient(circle, rgba(168,85,247,0.08), transparent 70%)', borderRadius: '50%' }} />
      </div>

      {/* Nav */}
      <nav style={{
        position: 'sticky', top: 0, zIndex: 50,
        padding: '1rem 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        background: 'rgba(2,9,23,0.85)', backdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
      }}>
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', textDecoration: 'none' }}>
          <AnimatedLogo size="sm" />
          <span style={{ fontSize: '1.15rem', fontWeight: 900, color: '#fff', letterSpacing: '-0.04em' }}>AI4Montage</span>
        </Link>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <Link to="/" style={{ color: '#94a3b8', textDecoration: 'none', fontSize: '0.875rem', fontWeight: 600 }}>Home</Link>
          <UserNavButton />
        </div>
      </nav>

      <div style={{ position: 'relative', zIndex: 1 }}>
        {/* Hero */}
        <div style={{ textAlign: 'center', padding: '5rem 1rem 1rem', maxWidth: '52rem', marginLeft: 'auto', marginRight: 'auto' }}>
          <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5 }}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.4rem 1rem', borderRadius: '99px', border: '1px solid rgba(168,85,247,0.3)', background: 'rgba(168,85,247,0.08)', color: '#c084fc', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '1.5rem' }}>
            <Star size={12} fill="currentColor" /> Simple, transparent pricing
          </motion.div>
          <motion.h1 initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.1 }}
            style={{ fontSize: 'clamp(2.5rem, 6vw, 4rem)', fontWeight: 900, letterSpacing: '-0.04em', lineHeight: 1.08, marginBottom: '1.25rem' }}>
            Choose your{' '}
            <span style={{ background: 'linear-gradient(90deg, #a855f7, #ec4899)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              creative plan
            </span>
          </motion.h1>
          <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.2 }}
            style={{ color: '#94a3b8', fontSize: '1.1rem', lineHeight: 1.7, marginBottom: '2rem' }}>
            Every new account gets <strong style={{ color: '#c084fc' }}>Ultra plan free for 30 days</strong> — no credit card, no catch.
          </motion.p>

          {/* ── Monthly / Yearly toggle ── */}
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.3 }}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.75rem', marginBottom: '2.5rem' }}>
            <span style={{ fontSize: '0.875rem', fontWeight: 600, color: !yearly ? '#fff' : '#64748b' }}>Monthly</span>
            <button
              onClick={() => setYearly(y => !y)}
              style={{
                position: 'relative', width: '3rem', height: '1.6rem',
                borderRadius: '99px', border: 'none', cursor: 'pointer',
                background: yearly ? 'linear-gradient(135deg,#a855f7,#ec4899)' : 'rgba(255,255,255,0.12)',
                transition: 'background 0.3s',
              }}
            >
              <motion.div
                animate={{ x: yearly ? '1.4rem' : '0.2rem' }}
                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                style={{
                  position: 'absolute', top: '0.2rem',
                  width: '1.2rem', height: '1.2rem', borderRadius: '50%',
                  background: '#fff', boxShadow: '0 1px 4px rgba(0,0,0,0.3)',
                }}
              />
            </button>
            <span style={{ fontSize: '0.875rem', fontWeight: 600, color: yearly ? '#fff' : '#64748b' }}>
              Yearly
            </span>
            {yearly && (
              <motion.span
                initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}
                style={{
                  padding: '0.2rem 0.6rem', borderRadius: '99px',
                  background: 'rgba(52,211,153,0.15)', border: '1px solid rgba(52,211,153,0.3)',
                  color: '#34d399', fontSize: '0.72rem', fontWeight: 800,
                }}>
                ~2 months free 🎉
              </motion.span>
            )}
          </motion.div>

          {/* Gift banner — only for non-logged-in users */}
          {!isLoggedIn && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.6, delay: 0.4 }}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '1rem',
              marginTop: '0.5rem', marginBottom: '1rem', padding: '1rem 2rem', borderRadius: '1rem',
              background: 'linear-gradient(135deg, rgba(168,85,247,0.15), rgba(236,72,153,0.1))',
              border: '1px solid rgba(168,85,247,0.3)',
            }}
          >
            <span style={{ fontSize: '1.75rem' }}>🎁</span>
            <div style={{ textAlign: 'left' }}>
              <div style={{ color: '#fff', fontWeight: 800, fontSize: '0.95rem' }}>New user? You get Ultra FREE</div>
              <div style={{ color: '#94a3b8', fontSize: '0.8rem' }}>Sign in with Google → Instant Ultra access for 30 days</div>
            </div>
            <Link to="/login" style={{
              padding: '0.6rem 1.25rem', borderRadius: '0.75rem',
              background: 'linear-gradient(135deg, #a855f7, #ec4899)',
              color: '#fff', fontWeight: 700, fontSize: '0.85rem', textDecoration: 'none', whiteSpace: 'nowrap',
            }}>Claim Now</Link>
          </motion.div>
          )}
        </div>

        {/* Plans grid */}
        <div style={{
          maxWidth: '72rem', marginLeft: 'auto', marginRight: 'auto',
          padding: '1rem 1rem 5rem',
          display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem',
          alignItems: 'start',
        }}>
          {planDefs.map((plan, i) => (
            <PlanCard key={plan.id} plan={plan} index={i} userPlan={userPlan} yearly={yearly} isLoggedIn={isLoggedIn} onSubscribe={handleSubscribe} />
          ))}
        </div>

        {/* Billing comparison note */}
        <motion.div
          initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}
          style={{ textAlign: 'center', padding: '0 1rem 2rem', color: '#475569', fontSize: '0.82rem' }}
        >
          Monthly: Pro $5/mo · Ultra $10/mo &nbsp;|&nbsp; Yearly: Pro $50/yr · Ultra $100/yr
        </motion.div>

        {/* Zero data section */}
        <motion.div
          initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}
          style={{ maxWidth: '48rem', marginLeft: 'auto', marginRight: 'auto', padding: '0 1rem 5rem', textAlign: 'center' }}
        >
          <div style={{
            padding: '2rem', borderRadius: '1.5rem',
            background: 'linear-gradient(135deg, rgba(34,211,238,0.06), rgba(168,85,247,0.06))',
            border: '1px solid rgba(255,255,255,0.08)',
          }}>
            <div style={{ fontSize: '1.5rem', marginBottom: '0.75rem' }}>🔒</div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#fff', marginBottom: '0.75rem' }}>
              All plans include: Zero data collection
            </h3>
            <p style={{ color: '#94a3b8', lineHeight: 1.7, fontSize: '0.9rem' }}>
              AI4Montage runs 100% on your device. No videos are uploaded to any server.
              Your creative work stays yours — private, local, secure.
            </p>
          </div>
        </motion.div>

        {/* FAQ */}
        <div style={{ maxWidth: '48rem', marginLeft: 'auto', marginRight: 'auto', padding: '0 1rem 6rem' }}>
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
            style={{ textAlign: 'center', marginBottom: '3rem' }}>
            <h2 style={{ fontSize: '2.25rem', fontWeight: 900, color: '#fff', letterSpacing: '-0.03em' }}>
              Frequently asked questions
            </h2>
          </motion.div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {faqs.map((faq, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }} transition={{ delay: i * 0.07 }}>
                <FaqItem q={faq.q} a={faq.a} />
              </motion.div>
            ))}
          </div>
        </div>

        {/* Bottom CTA */}
        <div style={{ textAlign: 'center', padding: '0 1rem 6rem' }}>
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }}
            style={{
              display: 'inline-block', padding: '3rem 4rem', borderRadius: '2rem',
              background: 'linear-gradient(135deg, rgba(168,85,247,0.12), rgba(34,211,238,0.08))',
              border: '1px solid rgba(168,85,247,0.2)',
            }}
          >
            <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>🚀</div>
            {isLoggedIn ? (
              <>
                <h2 style={{ fontSize: '2rem', fontWeight: 900, color: '#fff', marginBottom: '0.75rem', letterSpacing: '-0.03em' }}>
                  Ready to create something amazing?
                </h2>
                <p style={{ color: '#94a3b8', marginBottom: '2rem', fontSize: '1rem' }}>
                  Your {userPlan === 'ultra' ? 'Ultra' : userPlan === 'pro' ? 'Pro' : 'Free'} plan is active. Open the editor and start creating.
                </p>
                <Link to="/startup" style={{
                  display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
                  padding: '1rem 2.5rem', borderRadius: '1rem',
                  background: 'linear-gradient(135deg, #a855f7, #ec4899)',
                  color: '#fff', fontWeight: 800, fontSize: '1.05rem',
                  textDecoration: 'none', letterSpacing: '-0.01em',
                }}>
                  Open Editor <ArrowRight size={18} />
                </Link>
              </>
            ) : (
              <>
                <h2 style={{ fontSize: '2rem', fontWeight: 900, color: '#fff', marginBottom: '0.75rem', letterSpacing: '-0.03em' }}>
                  Ready to start editing?
                </h2>
                <p style={{ color: '#94a3b8', marginBottom: '2rem', fontSize: '1rem' }}>
                  Sign in now and get your free 30-day Ultra trial instantly.
                </p>
                <Link to="/login" style={{
                  display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
                  padding: '1rem 2.5rem', borderRadius: '1rem',
                  background: 'linear-gradient(135deg, #a855f7, #ec4899)',
                  color: '#fff', fontWeight: 800, fontSize: '1.05rem',
                  textDecoration: 'none', letterSpacing: '-0.01em',
                }}>
                  Get Ultra Free — Sign In <ArrowRight size={18} />
                </Link>
                <div style={{ marginTop: '1rem', color: '#475569', fontSize: '0.8rem' }}>
                  No credit card · Google Sign-In only · Cancel anytime
                </div>
              </>
            )}
          </motion.div>
        </div>

        {/* Footer */}
        <Footer />
      </div>

      {/* Payment Modal */}
      {payModal && (
        <PaymentModal
          plan={payModal.plan}
          billing={payModal.billing}
          onClose={() => setPayModal(null)}
        />
      )}
    </div>
  );
}
