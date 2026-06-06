import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Check, X, Zap, Crown, Sparkles, ArrowRight } from 'lucide-react';

/* ── Plan definitions (static, billing-period-agnostic) ─────────────────── */
export const planDefs = [
  {
    id: 'free',
    name: 'Free',
    monthlyPrice: 0,
    yearlyPrice: 0,
    originalMonthly: null,
    originalYearly: null,
    desc: 'Everything you need to start creating professional videos.',
    accent: '#64748b',
    accentBg: 'rgba(100,116,139,0.08)',
    icon: <Zap size={22} />,
    cta: 'Get Started Free',
    ctaTo: '/login',
    popular: false,
    badge: null,
    features: [
      { text: 'Up to 10 projects',          included: true  },
      { text: '1080p export',               included: true  },
      { text: 'Full timeline editor',       included: true  },
      { text: 'SRT subtitle splitter',      included: true  },
      { text: '30 minute max video length', included: true  },
      { text: 'Sandwich AI Mode',           included: true  },
      { text: 'AI style transfer',          included: true  },
      { text: '4K export',                  included: false },
      { text: 'Unlimited projects',         included: false },
      { text: 'Priority support',           included: false },
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    monthlyPrice: 5,
    yearlyPrice: 50,
    originalMonthly: 12,
    originalYearly: 144,   // $12 × 12
    desc: 'Unlock unlimited projects, 4K export, and pro-grade AI tools.',
    accent: '#22d3ee',
    accentBg: 'rgba(34,211,238,0.08)',
    icon: <Sparkles size={22} />,
    cta: 'Start Pro',
    ctaTo: '/login',
    popular: true,
    badge: null,
    features: [
      { text: 'Everything in Free',              included: true  },
      { text: 'Unlimited projects',              included: true  },
      { text: '4K export (H.264, H.265, WebM)', included: true  },
      { text: 'No video length limit',           included: true  },
      { text: 'Background remover',              included: true  },
      { text: 'AI video analysis',               included: true  },
      { text: 'Priority support',                included: false },
      { text: 'Commercial license',              included: false },
    ],
  },
  {
    id: 'ultra',
    name: 'Ultra',
    monthlyPrice: 10,
    yearlyPrice: 100,
    originalMonthly: 29,
    originalYearly: 348,   // $29 × 12
    desc: 'Full Edge AI power. No limits. Studio-grade output.',
    accent: '#a855f7',
    accentBg: 'rgba(168,85,247,0.08)',
    icon: <Crown size={22} />,
    cta: 'Get Ultra',
    ctaTo: '/login',
    popular: false,
    badge: '🎁 30 Days FREE on Signup',
    features: [
      { text: 'Everything in Pro',               included: true  },
      { text: 'Smart scene detection',           included: true  },
      { text: 'Auto color grading',              included: true  },
      { text: 'Commercial license',              included: true  },
      { text: 'Priority support',                included: true  },
      { text: 'Early access to new AI features', included: true  },
      { text: 'API access (coming soon)',         included: true  },
      { text: 'Custom branding (coming soon)',    included: true  },
      { text: 'Team collaboration (coming soon)', included: true  },
    ],
  },
];

/* ── FAQ ─────────────────────────────────────────────────────────────────── */
export const faqs = [
  {
    q: 'Do I need a credit card to sign up?',
    a: 'No. Sign up with Google for free. Your 30-day Ultra trial activates instantly — no payment required.',
  },
  {
    q: 'Is my video data private?',
    a: 'Yes, 100%. AI4Montage runs entirely in your browser using WebGPU. Your videos never leave your device.',
  },
  {
    q: 'What happens after my 30-day Ultra trial?',
    a: 'Your account moves to the Free tier automatically. You keep all your projects but some features become limited.',
  },
  {
    q: 'What\'s the difference between monthly and yearly billing?',
    a: 'Yearly billing gives you ~2 months free. Pro: $50/year vs $60/year monthly. Ultra: $100/year vs $120/year monthly.',
  },
  {
    q: 'Can I cancel anytime?',
    a: 'Yes, cancel anytime. No lock-in, no cancellation fee. See our Refund Policy at /refund for full details on refund eligibility.',
  },
  {
    q: 'What is your refund policy?',
    a: 'We offer a 7-day full refund window if AI features were not used. Annual plans may be eligible for pro-rated refunds within 30 days. See /refund for complete details.',
  },
  {
    q: 'Can I use AI4Montage offline?',
    a: 'Yes! Once loaded, the editor and AI models work fully offline. No internet connection required.',
  },
];

/* ── FAQ Item ────────────────────────────────────────────────────────────── */
export function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <motion.div
      style={{
        borderRadius: '1rem',
        border: `1px solid ${open ? 'rgba(168,85,247,0.3)' : 'rgba(255,255,255,0.07)'}`,
        background: open ? 'rgba(168,85,247,0.05)' : 'rgba(15,23,42,0.5)',
        overflow: 'hidden', cursor: 'pointer',
        transition: 'border-color 0.3s, background 0.3s',
      }}
      onClick={() => setOpen(!open)}
    >
      <div style={{ padding: '1.25rem 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
        <span style={{ color: '#e2e8f0', fontWeight: 600, fontSize: '0.95rem' }}>{q}</span>
        <motion.div animate={{ rotate: open ? 45 : 0 }} transition={{ duration: 0.2 }}
          style={{ color: '#a855f7', flexShrink: 0, fontSize: '1.2rem', lineHeight: 1 }}>+</motion.div>
      </div>
      <motion.div initial={false} animate={{ height: open ? 'auto' : 0, opacity: open ? 1 : 0 }}
        transition={{ duration: 0.25 }} style={{ overflow: 'hidden' }}>
        <div style={{ padding: '0 1.5rem 1.25rem', color: '#94a3b8', lineHeight: 1.7, fontSize: '0.9rem' }}>{a}</div>
      </motion.div>
    </motion.div>
  );
}

/* ── Plan Card ─────────────────────────────────────────────────── */
export function PlanCard({
  plan, index, userPlan, yearly, isLoggedIn, onSubscribe,
}: {
  plan: typeof planDefs[0];
  index: number;
  userPlan?: string | null;
  yearly: boolean;
  isLoggedIn: boolean;
  onSubscribe: (plan: 'pro' | 'ultra', billing: 'monthly' | 'yearly') => void;
}) {
  const [hovered, setHovered] = useState(false);
  const isActive  = !!userPlan && userPlan === plan.id;
  const isDowngrade = userPlan === 'ultra' && plan.id === 'pro';
  const isUpgrade = userPlan === 'pro' && plan.id === 'ultra';

  const price           = plan.monthlyPrice === 0 ? '$0' : yearly ? `$${plan.yearlyPrice}` : `$${plan.monthlyPrice}`;
  const period          = plan.monthlyPrice === 0 ? 'forever' : yearly ? 'per year' : 'per month';
  const originalPrice   = plan.originalMonthly
    ? yearly
      ? `$${plan.originalYearly}`
      : `$${plan.originalMonthly}`
    : null;
  const savings         = plan.monthlyPrice > 0 && yearly
    ? `Save $${(plan.originalYearly ?? 0) - plan.yearlyPrice}/yr vs original`
    : plan.monthlyPrice > 0
    ? `Was $${plan.originalMonthly}/mo`
    : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6, delay: index * 0.12 }}
      onHoverStart={() => setHovered(true)}
      onHoverEnd={() => setHovered(false)}
      style={{
        position: 'relative',
        borderRadius: '1.75rem',
        border: isActive
          ? '2px solid rgba(52,211,153,0.6)'
          : plan.popular
          ? '2px solid rgba(34,211,238,0.5)'
          : `1px solid ${hovered ? plan.accent + '40' : 'rgba(255,255,255,0.08)'}`,
        background: isActive
          ? 'linear-gradient(145deg, rgba(52,211,153,0.06), rgba(15,23,42,0.95))'
          : plan.popular
          ? 'linear-gradient(145deg, rgba(34,211,238,0.07), rgba(15,23,42,0.95))'
          : 'rgba(15,23,42,0.8)',
        backdropFilter: 'blur(24px)',
        padding: '2.25rem',
        display: 'flex', flexDirection: 'column',
        transition: 'border-color 0.3s, transform 0.3s, box-shadow 0.3s',
        transform: hovered ? 'translateY(-8px)' : 'translateY(0)',
        boxShadow: hovered ? `0 32px 64px ${plan.accent}20` : 'none',
        flex: 1,
      }}
    >
      {/* Popular badge */}
      {plan.popular && !isActive && (
        <div style={{
          position: 'absolute', top: '-1px', left: '50%', transform: 'translateX(-50%)',
          background: 'linear-gradient(90deg, #22d3ee, #a855f7)',
          color: '#fff', fontSize: '0.72rem', fontWeight: 800,
          padding: '0.3rem 1.2rem', borderRadius: '0 0 0.75rem 0.75rem',
          letterSpacing: '0.05em', textTransform: 'uppercase',
        }}>Most Popular</div>
      )}

      {/* Active badge */}
      {isActive && (
        <div style={{
          position: 'absolute', top: '-1px', right: '1.5rem',
          background: 'linear-gradient(135deg, #34d399, #22d3ee)',
          color: '#020917', fontSize: '0.68rem', fontWeight: 900,
          padding: '0.28rem 0.9rem', borderRadius: '0 0 0.75rem 0.75rem',
          letterSpacing: '0.06em', textTransform: 'uppercase',
        }}>✓ Current Plan</div>
      )}

      {/* Gift badge (Ultra, not active) */}
      {plan.badge && !isActive && (
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
          background: 'rgba(168,85,247,0.15)', border: '1px solid rgba(168,85,247,0.35)',
          color: '#c084fc', fontSize: '0.75rem', fontWeight: 700,
          padding: '0.35rem 0.85rem', borderRadius: '99px',
          marginBottom: '1rem', width: 'fit-content',
        }}>
          {plan.badge}
        </div>
      )}

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
        <div style={{
          width: '2.75rem', height: '2.75rem', borderRadius: '0.85rem',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: plan.accentBg, border: `1px solid ${plan.accent}35`, color: plan.accent,
        }}>
          {plan.icon}
        </div>
        <div>
          <div style={{ color: '#fff', fontSize: '1.15rem', fontWeight: 800 }}>{plan.name}</div>
          <div style={{ color: '#64748b', fontSize: '0.78rem' }}>{plan.desc}</div>
        </div>
      </div>

      {/* Price */}
      <div style={{ marginBottom: '1.75rem' }}>
        {/* Discount badge */}
        {originalPrice && (
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
            marginBottom: '0.5rem', padding: '0.2rem 0.65rem', borderRadius: '99px',
            background: 'rgba(251,146,60,0.12)', border: '1px solid rgba(251,146,60,0.3)',
            color: '#fb923c', fontSize: '0.7rem', fontWeight: 800, letterSpacing: '0.04em',
          }}>⚡ LIMITED TIME OFFER</div>
        )}
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem', flexWrap: 'wrap' }}>
          {/* Struck-through original */}
          {originalPrice && (
            <span style={{ fontSize: '1.4rem', fontWeight: 700, color: '#475569', textDecoration: 'line-through' }}>
              {originalPrice}
            </span>
          )}
          {/* Current price */}
          <span style={{
            fontSize: '3rem', fontWeight: 900, letterSpacing: '-0.04em',
            background: plan.id === 'ultra'
              ? 'linear-gradient(90deg,#a855f7,#ec4899)'
              : plan.id === 'pro' ? 'linear-gradient(90deg,#22d3ee,#a855f7)' : undefined,
            WebkitBackgroundClip: plan.id !== 'free' ? 'text' : undefined,
            WebkitTextFillColor: plan.id !== 'free' ? 'transparent' : '#fff',
            color: plan.id === 'free' ? '#fff' : undefined,
          }}>{price}</span>
          <span style={{ color: '#64748b', fontSize: '0.85rem' }}>/{period}</span>
        </div>
        {/* Savings pill */}
        {savings && (
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
            marginTop: '0.4rem', padding: '0.22rem 0.65rem', borderRadius: '99px',
            background: 'rgba(52,211,153,0.12)', border: '1px solid rgba(52,211,153,0.25)',
            color: '#34d399', fontSize: '0.71rem', fontWeight: 700,
          }}>🎉 {savings}</div>
        )}
        {/* Yearly: show monthly equivalent */}
        {yearly && plan.monthlyPrice > 0 && (
          <div style={{ color: '#475569', fontSize: '0.73rem', marginTop: '0.25rem' }}>
            (${(plan.yearlyPrice / 12).toFixed(2)}/mo billed annually · was ${((plan.originalYearly ?? 0) / 12).toFixed(0)}/mo)
          </div>
        )}
      </div>

      {/* Features */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', flex: 1, marginBottom: '2rem' }}>
        {plan.features.map((f, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{
              width: '1.35rem', height: '1.35rem', borderRadius: '50%', flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: f.included ? `${plan.accent}18` : 'rgba(100,116,139,0.08)',
              border: `1px solid ${f.included ? plan.accent + '35' : 'rgba(100,116,139,0.2)'}`,
            }}>
              {f.included
                ? <Check size={11} style={{ color: plan.accent }} />
                : <X size={11} style={{ color: '#475569' }} />}
            </div>
            <span style={{ fontSize: '0.875rem', color: f.included ? '#cbd5e1' : '#475569', textDecoration: f.included ? 'none' : 'line-through' }}>
              {f.text}
            </span>
          </div>
        ))}
      </div>

      {/* CTA */}
      {plan.id === 'free' ? (
        isActive ? (
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
            padding: '1rem', borderRadius: '0.875rem',
            background: 'rgba(255,255,255,0.05)', color: '#94a3b8',
            fontSize: '0.95rem', fontWeight: 700,
          }}>✓ Active</div>
        ) : (
          <Link
            to={isLoggedIn ? '/startup' : plan.ctaTo}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
              padding: '1rem', borderRadius: '0.875rem',
              background: `${plan.accent}15`, border: `1px solid ${plan.accent}35`,
              color: '#94a3b8', fontSize: '0.95rem', fontWeight: 800, textDecoration: 'none',
              transition: 'opacity 0.2s', letterSpacing: '-0.01em',
            }}
            onMouseEnter={e => (e.currentTarget.style.opacity = '0.85')}
            onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
          >
            {isLoggedIn ? 'Open Editor' : plan.cta} <ArrowRight size={16} />
          </Link>
        )
      ) : isDowngrade ? (
        <button
          disabled
          style={{
            padding: '1rem', borderRadius: '0.875rem', width: '100%',
            background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
            color: '#64748b', fontSize: '0.95rem', fontWeight: 700, cursor: 'not-allowed',
          }}
        >
          You are on a higher tier
        </button>
      ) : (
        <button
          onClick={() => {
            if (!isLoggedIn) { window.location.href = '/login'; return; }
            onSubscribe(plan.id as 'pro' | 'ultra', yearly ? 'yearly' : 'monthly');
          }}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
            padding: '1rem', borderRadius: '0.875rem', width: '100%',
            background: plan.popular
              ? 'linear-gradient(135deg, #22d3ee, #a855f7)'
              : 'linear-gradient(135deg, #a855f7, #ec4899)',
            border: 'none', color: '#fff', fontSize: '0.95rem', fontWeight: 800,
            cursor: 'pointer', transition: 'opacity 0.2s', letterSpacing: '-0.01em',
            fontFamily: "'Inter', system-ui, sans-serif",
          }}
          onMouseEnter={e => ((e.currentTarget as HTMLElement).style.opacity = '0.85')}
          onMouseLeave={e => ((e.currentTarget as HTMLElement).style.opacity = '1')}
        >
          {!isLoggedIn 
            ? 'Sign in to Subscribe' 
            : isActive 
            ? 'Extend Subscription'
            : isUpgrade
            ? 'Upgrade & Pay Difference'
            : `Subscribe to ${plan.name}`
          } <ArrowRight size={16} />
        </button>
      )}
    </motion.div>
  );
}
