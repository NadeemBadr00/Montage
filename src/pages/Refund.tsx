import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { AnimatedLogo } from '../components/ui/AnimatedLogo';
import { Footer } from '../components/ui/Footer';
import { UserNavButton } from '../components/ui/UserNavButton';

const LAST_UPDATED = 'June 7, 2026';
const CONTACT_EMAIL = 'support@ai4roadmap.com';
const COMPANY = 'AI4Montage';
const SITE_URL = 'https://montage.ai4roadmap.com';

/* ─── Section component ─────────────────────────────────────────────────── */
function Section({ id, icon, title, children }: { id: string; icon: string; title: string; children: React.ReactNode }) {
  return (
    <motion.section
      id={id}
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5 }}
      style={{ marginBottom: '3rem' }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
        <div style={{
          width: '2.25rem', height: '2.25rem', borderRadius: '0.625rem', flexShrink: 0,
          background: 'rgba(168,85,247,0.12)', border: '1px solid rgba(168,85,247,0.25)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem',
        }}>{icon}</div>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#fff', margin: 0, letterSpacing: '-0.02em' }}>
          {title}
        </h2>
      </div>
      <div style={{
        background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)',
        borderRadius: '1.25rem', padding: '1.75rem 2rem',
        color: '#94a3b8', lineHeight: 1.8, fontSize: '0.9rem',
      }}>
        {children}
      </div>
    </motion.section>
  );
}

/* ─── Highlight box ──────────────────────────────────────────────────────── */
function HighlightBox({ emoji, title, body, color = '#a855f7' }: { emoji: string; title: string; body: string; color?: string }) {
  return (
    <div style={{
      display: 'flex', gap: '1rem', alignItems: 'flex-start',
      background: `${color}0d`, border: `1px solid ${color}30`,
      borderRadius: '0.875rem', padding: '1.25rem', marginBottom: '1rem',
    }}>
      <span style={{ fontSize: '1.4rem', flexShrink: 0 }}>{emoji}</span>
      <div>
        <div style={{ color: '#e2e8f0', fontWeight: 700, marginBottom: '0.3rem', fontSize: '0.925rem' }}>{title}</div>
        <div style={{ color: '#94a3b8', fontSize: '0.875rem', lineHeight: 1.7 }}>{body}</div>
      </div>
    </div>
  );
}

/* ─── Table of contents ──────────────────────────────────────────────────── */
const TOC = [
  { href: '#overview',    label: 'نظرة عامة' },
  { href: '#eligibility', label: 'الأهلية للاسترداد' },
  { href: '#no-refund',   label: 'حالات عدم الاسترداد' },
  { href: '#process',     label: 'كيفية طلب الاسترداد' },
  { href: '#timeline',    label: 'المدة الزمنية' },
  { href: '#exceptions',  label: 'استثناءات' },
  { href: '#contact',     label: 'التواصل' },
];

/* ─── Main Page ──────────────────────────────────────────────────────────── */
export default function RefundPolicy() {
  const [tocOpen, setTocOpen] = useState(false);

  return (
    <div dir="ltr" style={{
      minHeight: '100vh', background: '#020917', color: '#f1f5f9',
      fontFamily: "'Inter', system-ui, sans-serif",
    }}>
      {/* Nav */}
      <nav style={{
        position: 'sticky', top: 0, zIndex: 50,
        padding: '1rem 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        background: 'rgba(2,9,23,0.9)', backdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
      }}>
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', textDecoration: 'none' }}>
          <AnimatedLogo size="sm" />
          <span style={{ fontSize: '1.1rem', fontWeight: 900, color: '#fff', letterSpacing: '-0.04em' }}>AI4Montage</span>
        </Link>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <Link to="/" style={{ color: '#94a3b8', textDecoration: 'none', fontSize: '0.875rem', fontWeight: 600 }}>Home</Link>
          <UserNavButton />
        </div>
      </nav>

      <div style={{ maxWidth: '52rem', margin: '0 auto', padding: '4rem 1.5rem 2rem', position: 'relative' }}>

        {/* Hero */}
        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} style={{ marginBottom: '3rem', textAlign: 'center' }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
            padding: '0.4rem 1rem', borderRadius: '99px',
            border: '1px solid rgba(168,85,247,0.3)', background: 'rgba(168,85,247,0.08)',
            color: '#c084fc', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase',
            letterSpacing: '0.08em', marginBottom: '1.5rem',
          }}>
            💰 Refund Policy
          </div>
          <h1 style={{
            fontSize: 'clamp(2rem, 5vw, 3rem)', fontWeight: 900, letterSpacing: '-0.04em',
            lineHeight: 1.1, marginBottom: '1rem',
            background: 'linear-gradient(135deg, #fff 40%, #a855f7)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          }}>
            Refund &amp; Cancellation Policy
          </h1>
          <p style={{ color: '#64748b', fontSize: '0.9rem' }}>
            Last updated: {LAST_UPDATED} · Effective immediately
          </p>
        </motion.div>

        {/* Quick-answer card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.15 }}
          style={{
            background: 'linear-gradient(135deg, rgba(168,85,247,0.1), rgba(34,211,238,0.06))',
            border: '1px solid rgba(168,85,247,0.25)', borderRadius: '1.5rem',
            padding: '2rem', marginBottom: '3rem',
          }}
        >
          <div style={{ fontSize: '1.5rem', marginBottom: '0.75rem' }}>⚡ TL;DR — Quick Answer</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
              <span style={{ color: '#4ade80', fontWeight: 800, flexShrink: 0 }}>✓</span>
              <span style={{ color: '#cbd5e1', fontSize: '0.925rem' }}>
                <strong style={{ color: '#fff' }}>7-day refund window</strong> — if you subscribed and haven't used any AI-generated outputs, you can request a full refund within 7 days.
              </span>
            </div>
            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
              <span style={{ color: '#f87171', fontWeight: 800, flexShrink: 0 }}>✗</span>
              <span style={{ color: '#94a3b8', fontSize: '0.925rem' }}>
                <strong style={{ color: '#e2e8f0' }}>No refund</strong> after 7 days, or if AI features (Captions, Auto Montage, Voiceover) were used during the billing period.
              </span>
            </div>
            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
              <span style={{ color: '#fbbf24', fontWeight: 800, flexShrink: 0 }}>🎁</span>
              <span style={{ color: '#94a3b8', fontSize: '0.925rem' }}>
                <strong style={{ color: '#e2e8f0' }}>Free 30-day Ultra trial</strong> — no payment required, so there's nothing to refund.
              </span>
            </div>
          </div>
        </motion.div>

        {/* TOC */}
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}
          style={{
            background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)',
            borderRadius: '1rem', padding: '1.25rem 1.5rem', marginBottom: '3rem', cursor: 'pointer',
          }}
          onClick={() => setTocOpen(o => !o)}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#94a3b8', fontWeight: 700, fontSize: '0.875rem' }}>
            <span>📋 Table of Contents</span>
            <span style={{ transition: 'transform 0.2s', transform: tocOpen ? 'rotate(180deg)' : 'none', display: 'inline-block' }}>▾</span>
          </div>
          {tocOpen && (
            <ol style={{ margin: '1rem 0 0', paddingLeft: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              {TOC.map((t, i) => (
                <li key={t.href}>
                  <a href={t.href} style={{ color: '#a855f7', textDecoration: 'none', fontSize: '0.875rem', fontWeight: 600 }}
                    onClick={e => e.stopPropagation()}>
                    {i + 1}. {t.label}
                  </a>
                </li>
              ))}
            </ol>
          )}
        </motion.div>

        {/* ═══ SECTIONS ═══ */}

        <Section id="overview" icon="📄" title="1. Overview">
          <p>
            This Refund and Cancellation Policy governs all subscription payments made to <strong style={{ color: '#e2e8f0' }}>{COMPANY}</strong> ({SITE_URL}).
            We aim to be fair and transparent. Because {COMPANY} is a <strong style={{ color: '#e2e8f0' }}>software-as-a-service (SaaS) product</strong> that
            runs entirely on your device (client-side AI), the cost structure is primarily based on AI API usage and infrastructure —
            not on physical goods.
          </p>
          <br />
          <p>
            By subscribing to any paid plan (Pro or Ultra), you agree to this policy.
          </p>
        </Section>

        <Section id="eligibility" icon="✅" title="2. Refund Eligibility">
          <HighlightBox
            emoji="🟢"
            color="#22c55e"
            title="You ARE eligible for a refund if:"
            body="You subscribed within the last 7 days AND have not used any AI-generated outputs during that period (e.g., no Auto Montage generations, no AI Captions, no AI Voiceover). Contact us within 7 days of your payment date."
          />
          <HighlightBox
            emoji="🟡"
            color="#f59e0b"
            title="Partial refund may be considered if:"
            body="A technical issue on our end (server-side bug or payment gateway error) caused your plan not to activate correctly. We will investigate and either fix the issue or issue a proportional refund."
          />
          <HighlightBox
            emoji="🟠"
            color="#f97316"
            title="Annual plans — pro-rated refunds:"
            body="If you subscribed to a yearly plan (Pro $50/yr or Ultra $100/yr) and cancel within the first 30 days, we will refund the remaining unused months on a pro-rated basis, provided AI features were not used extensively."
          />
        </Section>

        <Section id="no-refund" icon="❌" title="3. No Refund Situations">
          <p style={{ marginBottom: '1rem' }}>Refunds will <strong style={{ color: '#f87171' }}>NOT</strong> be issued in the following cases:</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            {[
              { icon: '⏱️', text: 'More than 7 days have passed since your payment date.' },
              { icon: '🤖', text: 'You have used AI features (Auto Montage, AI Captions, AI Voiceover, Style Transfer) during the billing period.' },
              { icon: '🎁', text: 'Your 30-day Ultra trial was already consumed — the trial is completely free, no payment was taken.' },
              { icon: '📧', text: 'You forgot to cancel before the renewal date — we recommend setting a calendar reminder.' },
              { icon: '🔑', text: 'Your account was suspended or terminated due to a violation of our Terms of Service.' },
              { icon: '💳', text: 'Chargebacks initiated directly with your bank without first contacting us — this may result in account suspension.' },
              { icon: '🌍', text: 'Currency conversion fees or bank charges — these are outside our control.' },
            ].map((item, i) => (
              <div key={i} style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start', padding: '0.75rem', background: 'rgba(248,113,113,0.04)', borderRadius: '0.625rem', border: '1px solid rgba(248,113,113,0.1)' }}>
                <span style={{ flexShrink: 0 }}>{item.icon}</span>
                <span>{item.text}</span>
              </div>
            ))}
          </div>
        </Section>

        <Section id="process" icon="📬" title="4. How to Request a Refund">
          <p style={{ marginBottom: '1.25rem' }}>To request a refund, please follow these steps:</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {[
              { step: '1', title: 'Email us', body: `Send an email to ${CONTACT_EMAIL} with the subject line: "Refund Request — [Your Email]".` },
              { step: '2', title: 'Include your details', body: 'Provide: your registered email address, the date of payment, the plan you subscribed to (Pro/Ultra), and your Paymob transaction ID (visible in your /billing page).' },
              { step: '3', title: 'Explain the reason', body: 'A brief explanation helps us improve the product. It is not mandatory but appreciated.' },
              { step: '4', title: 'Wait for confirmation', body: 'We will review your request within 2 business days and respond via email.' },
            ].map(item => (
              <div key={item.step} style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                <div style={{
                  width: '2rem', height: '2rem', borderRadius: '50%', flexShrink: 0,
                  background: 'rgba(168,85,247,0.15)', border: '1px solid rgba(168,85,247,0.3)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#a855f7', fontWeight: 900, fontSize: '0.875rem',
                }}>{item.step}</div>
                <div>
                  <div style={{ color: '#e2e8f0', fontWeight: 700, marginBottom: '0.2rem' }}>{item.title}</div>
                  <div style={{ fontSize: '0.875rem' }}>{item.body}</div>
                </div>
              </div>
            ))}
          </div>
        </Section>

        <Section id="timeline" icon="⏳" title="5. Refund Processing Timeline">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
            {[
              { label: 'Review', time: '1-2 business days', icon: '🔍', color: '#a855f7' },
              { label: 'Approval', time: '2-3 business days', icon: '✅', color: '#22d3ee' },
              { label: 'Bank Processing', time: '5-10 business days', icon: '🏦', color: '#f59e0b' },
            ].map(item => (
              <div key={item.label} style={{
                padding: '1.25rem', borderRadius: '0.875rem', textAlign: 'center',
                background: `${item.color}0d`, border: `1px solid ${item.color}25`,
              }}>
                <div style={{ fontSize: '1.75rem', marginBottom: '0.5rem' }}>{item.icon}</div>
                <div style={{ color: '#e2e8f0', fontWeight: 700, marginBottom: '0.25rem', fontSize: '0.875rem' }}>{item.label}</div>
                <div style={{ color: item.color, fontWeight: 800, fontSize: '0.8rem' }}>{item.time}</div>
              </div>
            ))}
          </div>
          <p style={{ marginTop: '1.25rem', fontSize: '0.85rem' }}>
            Refunds are processed back to the original payment method used via Paymob. We do not issue refunds via alternative methods (e.g., bank transfer or crypto). Total time from request to credit: typically <strong style={{ color: '#e2e8f0' }}>7–15 business days</strong>.
          </p>
        </Section>

        <Section id="exceptions" icon="⚖️" title="6. Cancellation Policy">
          <p style={{ marginBottom: '1rem' }}>You can cancel your subscription at any time. Here is what happens:</p>
          <HighlightBox
            emoji="📅"
            color="#22d3ee"
            title="Monthly plans"
            body="Cancel anytime. Your access continues until the end of the current billing month. No further charges will be made. No partial refund for the remaining days."
          />
          <HighlightBox
            emoji="📆"
            color="#a855f7"
            title="Annual plans"
            body="Cancel anytime. Your access continues for the full year you paid for. If you cancel within the first 30 days and qualify for a pro-rated refund (see Section 2), contact us."
          />
          <HighlightBox
            emoji="🔄"
            color="#f59e0b"
            title="Downgrading"
            body="You can downgrade from Ultra to Pro or to Free at any time. The downgrade takes effect at the next billing cycle. No refund is issued for the price difference."
          />
          <p style={{ fontSize: '0.875rem', marginTop: '0.5rem' }}>
            To cancel, go to <Link to="/billing" style={{ color: '#a855f7' }}>/billing</Link> → your current plan → Cancel. Or email us at {CONTACT_EMAIL}.
          </p>
        </Section>

        <Section id="contact" icon="✉️" title="7. Contact Us">
          <p style={{ marginBottom: '1.25rem' }}>
            If you have any questions about this policy or wish to request a refund, please reach out:
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
              <span style={{ fontSize: '1.1rem' }}>📧</span>
              <a href={`mailto:${CONTACT_EMAIL}`} style={{ color: '#a855f7', fontWeight: 700 }}>{CONTACT_EMAIL}</a>
            </div>
            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
              <span style={{ fontSize: '1.1rem' }}>🌐</span>
              <Link to="/contact" style={{ color: '#a855f7', fontWeight: 700 }}>Contact Form → {SITE_URL}/contact</Link>
            </div>
            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
              <span style={{ fontSize: '1.1rem' }}>⏰</span>
              <span style={{ color: '#94a3b8' }}>Response time: 1–2 business days (Sun–Thu, 9am–6pm EET)</span>
            </div>
          </div>
          <div style={{
            marginTop: '1.5rem', padding: '1rem 1.25rem', borderRadius: '0.875rem',
            background: 'rgba(34,211,238,0.06)', border: '1px solid rgba(34,211,238,0.2)',
            color: '#94a3b8', fontSize: '0.85rem',
          }}>
            <strong style={{ color: '#22d3ee' }}>Note:</strong> {COMPANY} reserves the right to modify this policy at any time.
            Changes will be communicated via email to active subscribers at least 7 days in advance.
            Continued use of the service after policy changes constitutes acceptance of the updated terms.
          </div>
        </Section>

      </div>

      <Footer />
    </div>
  );
}
