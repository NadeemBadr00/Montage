import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { AnimatedLogo } from '../components/ui/AnimatedLogo';
import { Footer } from '../components/ui/Footer';
import { UserNavButton } from '../components/ui/UserNavButton';
import {
  Mail, Send, CheckCircle2, ArrowRight, ChevronRight, Loader2,
} from 'lucide-react';
import { FormState, FieldError, infoCards, socials, faqTeasers, validate, FormField, InfoCard } from './sections/contact-components';

/* ── Main Contact Page ────────────────────────────────────────────────────── */
export default function Contact() {
  const [form, setForm] = useState<FormState>({ name: '', email: '', subject: '', message: '' });
  const [touched, setTouched] = useState<Partial<Record<keyof FormState, boolean>>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [focusedSelect, setFocusedSelect] = useState(false);

  const errors = validate(form);
  const isValid = Object.keys(errors).length === 0;

  const setField = (key: keyof FormState) => (value: string) => {
    setForm(prev => ({ ...prev, [key]: value }));
    setTouched(prev => ({ ...prev, [key]: true }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Touch all fields to show errors
    setTouched({ name: true, email: true, subject: true, message: true });
    if (!isValid) return;

    setSubmitting(true);
    await new Promise(res => setTimeout(res, 1500));
    setSubmitting(false);
    setSubmitted(true);
  };

  const handleReset = () => {
    setForm({ name: '', email: '', subject: '', message: '' });
    setTouched({});
    setSubmitted(false);
  };

  const showSelectError = touched.subject && errors.subject;

  return (
    <div
      dir="ltr"
      style={{
        minHeight: '100vh',
        background: '#020917',
        color: '#f1f5f9',
        fontFamily: "'Inter', system-ui, sans-serif",
        direction: 'ltr',
      }}
    >
      {/* Ambient blobs */}
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', overflow: 'hidden', zIndex: 0 }}>
        <div style={{ position: 'absolute', top: '-15%', left: '-5%', width: '45rem', height: '45rem', background: 'radial-gradient(circle, rgba(34,211,238,0.06), transparent 70%)', borderRadius: '50%' }} />
        <div style={{ position: 'absolute', bottom: '-20%', right: '5%', width: '40rem', height: '40rem', background: 'radial-gradient(circle, rgba(168,85,247,0.07), transparent 70%)', borderRadius: '50%' }} />
        <div style={{ position: 'absolute', top: '40%', right: '-10%', width: '30rem', height: '30rem', background: 'radial-gradient(circle, rgba(236,72,153,0.04), transparent 70%)', borderRadius: '50%' }} />
      </div>

      {/* Nav */}
      <nav
        style={{
          position: 'sticky', top: 0, zIndex: 50,
          padding: '1rem 1.5rem',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: 'rgba(2,9,23,0.85)', backdropFilter: 'blur(20px)',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', textDecoration: 'none' }}>
          <AnimatedLogo size="sm" />
          <span style={{ fontSize: '1.15rem', fontWeight: 900, color: '#fff', letterSpacing: '-0.04em' }}>
            AI4Montage
          </span>
        </Link>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
          <Link to="/" style={{ color: '#94a3b8', textDecoration: 'none', fontSize: '0.875rem', fontWeight: 600 }}>Home</Link>
          <Link to="/pricing" style={{ color: '#94a3b8', textDecoration: 'none', fontSize: '0.875rem', fontWeight: 600 }}>Pricing</Link>
          <UserNavButton />
        </div>
      </nav>

      <div style={{ position: 'relative', zIndex: 1 }}>
        {/* Hero */}
        <div style={{ textAlign: 'center', padding: '5rem 1rem 3.5rem', maxWidth: '52rem', marginLeft: 'auto', marginRight: 'auto' }}>
          <motion.div
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
              padding: '0.4rem 1rem', borderRadius: '99px',
              border: '1px solid rgba(34,211,238,0.35)', background: 'rgba(34,211,238,0.07)',
              color: '#22d3ee', fontSize: '0.82rem', fontWeight: 700, marginBottom: '1.75rem',
            }}
          >
            <Mail size={13} /> Contact us
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.75, delay: 0.1 }}
            style={{
              fontSize: 'clamp(2.6rem, 6vw, 4rem)',
              fontWeight: 900,
              letterSpacing: '-0.04em',
              lineHeight: 1.08,
              marginBottom: '1.25rem',
            }}
          >
            Get in{' '}
            <span style={{
              background: 'linear-gradient(90deg, #22d3ee, #a855f7)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}>
              touch
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.75, delay: 0.2 }}
            style={{ color: '#94a3b8', fontSize: '1.1rem', lineHeight: 1.75 }}
          >
            We read every message.{' '}
            <span style={{ color: '#cbd5e1' }}>Usually respond within 24 hours.</span>
          </motion.p>
        </div>

        {/* Two-column layout */}
        <div
          style={{
            maxWidth: '72rem',
            marginLeft: 'auto',
            marginRight: 'auto',
            padding: '0 1.5rem 5rem',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 28rem), 1fr))',
            gap: '2.5rem',
            alignItems: 'start',
          }}
        >
          {/* LEFT — Contact Form */}
          <motion.div
            initial={{ opacity: 0, y: 32 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.25 }}
          >
            <div
              style={{
                borderRadius: '1.75rem',
                border: '1px solid rgba(255,255,255,0.08)',
                background: 'rgba(15,23,42,0.7)',
                backdropFilter: 'blur(24px)',
                padding: '2.25rem',
              }}
            >
              <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#fff', marginBottom: '0.5rem', letterSpacing: '-0.025em' }}>
                Send us a message
              </h2>
              <p style={{ color: '#64748b', fontSize: '0.875rem', marginBottom: '2rem', lineHeight: 1.6 }}>
                Fill out the form below and we'll get back to you as soon as possible.
              </p>

              <AnimatePresence mode="wait">
                {submitted ? (
                  /* Success state */
                  <motion.div
                    key="success"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ duration: 0.4 }}
                    style={{
                      textAlign: 'center',
                      padding: '3rem 1rem',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '1rem',
                    }}
                  >
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: 'spring', stiffness: 280, damping: 18, delay: 0.1 }}
                    >
                      <div
                        style={{
                          width: '5rem',
                          height: '5rem',
                          borderRadius: '50%',
                          background: 'rgba(52,211,153,0.12)',
                          border: '1px solid rgba(52,211,153,0.3)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <CheckCircle2 size={36} color="#34d399" />
                      </div>
                    </motion.div>
                    <div>
                      <h3 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#fff', marginBottom: '0.5rem' }}>
                        Message sent! 🎉
                      </h3>
                      <p style={{ color: '#94a3b8', fontSize: '0.9rem', lineHeight: 1.65 }}>
                        Thanks for reaching out. We'll reply to{' '}
                        <span style={{ color: '#22d3ee' }}>{form.email}</span>{' '}
                        within 24 hours.
                      </p>
                    </div>
                    <button
                      onClick={handleReset}
                      style={{
                        marginTop: '0.75rem',
                        padding: '0.7rem 1.75rem',
                        borderRadius: '0.75rem',
                        background: 'rgba(34,211,238,0.1)',
                        border: '1px solid rgba(34,211,238,0.3)',
                        color: '#22d3ee',
                        fontFamily: "'Inter', system-ui, sans-serif",
                        fontSize: '0.875rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        transition: 'background 0.2s',
                      }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'rgba(34,211,238,0.18)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'rgba(34,211,238,0.1)')}
                    >
                      Send another message
                    </button>
                  </motion.div>
                ) : (
                  /* Form */
                  <motion.form
                    key="form"
                    onSubmit={handleSubmit}
                    style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}
                    initial={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                  >
                    <FormField
                      id="name"
                      label="Your name"
                      value={form.name}
                      onChange={setField('name')}
                      error={errors.name}
                      touched={touched.name}
                    />
                    <FormField
                      id="email"
                      label="Email address"
                      type="email"
                      value={form.email}
                      onChange={setField('email')}
                      error={errors.email}
                      touched={touched.email}
                    />

                    {/* Subject dropdown */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                      <div style={{ position: 'relative' }}>
                        <label
                          htmlFor="subject"
                          style={{
                            position: 'absolute',
                            left: '1rem',
                            top: focusedSelect || form.subject ? '0.45rem' : '50%',
                            transform: focusedSelect || form.subject ? 'translateY(0) scale(0.78)' : 'translateY(-50%)',
                            transformOrigin: 'left center',
                            color: showSelectError ? '#f87171' : focusedSelect ? '#22d3ee' : '#64748b',
                            fontSize: '0.95rem',
                            pointerEvents: 'none',
                            transition: 'top 0.2s, transform 0.2s, color 0.2s',
                            fontWeight: focusedSelect || form.subject ? 600 : 400,
                            zIndex: 2,
                          }}
                        >
                          Subject
                        </label>
                        <select
                          id="subject"
                          value={form.subject}
                          onFocus={() => setFocusedSelect(true)}
                          onBlur={() => { setFocusedSelect(false); setTouched(p => ({ ...p, subject: true })); }}
                          onChange={e => setField('subject')(e.target.value)}
                          style={{
                            width: '100%',
                            background: 'rgba(15,23,42,0.7)',
                            border: `1.5px solid ${showSelectError ? '#f87171' : focusedSelect ? '#22d3ee' : 'rgba(255,255,255,0.1)'}`,
                            borderRadius: '0.875rem',
                            color: form.subject ? '#f1f5f9' : 'transparent',
                            fontSize: '0.95rem',
                            fontFamily: "'Inter', system-ui, sans-serif",
                            outline: 'none',
                            padding: form.subject ? '1.35rem 1rem 0.5rem' : '1rem',
                            boxShadow: focusedSelect
                              ? showSelectError
                                ? '0 0 0 3px rgba(248,113,113,0.18)'
                                : '0 0 0 3px rgba(34,211,238,0.15)'
                              : 'none',
                            transition: 'border-color 0.25s, box-shadow 0.25s, color 0.1s',
                            boxSizing: 'border-box',
                            appearance: 'none',
                            cursor: 'pointer',
                            paddingRight: '2.5rem',
                          }}
                        >
                          <option value="" disabled style={{ background: '#0f172a' }} />
                          {['General', 'Bug Report', 'Feature Request', 'Partnership', 'Press'].map(s => (
                            <option key={s} value={s} style={{ background: '#0f172a', color: '#f1f5f9' }}>{s}</option>
                          ))}
                        </select>
                        {/* Chevron icon */}
                        <div style={{
                          position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)',
                          pointerEvents: 'none', color: '#64748b',
                        }}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9" /></svg>
                        </div>
                      </div>
                      <AnimatePresence>
                        {showSelectError && (
                          <motion.span
                            initial={{ opacity: 0, y: -4 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -4 }}
                            transition={{ duration: 0.18 }}
                            style={{ color: '#f87171', fontSize: '0.78rem', paddingLeft: '0.25rem' }}
                          >
                            {errors.subject}
                          </motion.span>
                        )}
                      </AnimatePresence>
                    </div>

                    <FormField
                      id="message"
                      label="Your message"
                      value={form.message}
                      onChange={setField('message')}
                      error={errors.message}
                      touched={touched.message}
                      rows={5}
                    />

                    {/* Character hint */}
                    <div style={{ textAlign: 'right', marginTop: '-0.75rem', color: '#475569', fontSize: '0.75rem' }}>
                      {form.message.length} characters
                    </div>

                    {/* Submit */}
                    <motion.button
                      type="submit"
                      disabled={submitting}
                      whileTap={{ scale: submitting ? 1 : 0.97 }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.6rem',
                        width: '100%',
                        padding: '1rem',
                        borderRadius: '0.875rem',
                        background: submitting
                          ? 'rgba(34,211,238,0.15)'
                          : 'linear-gradient(135deg, #22d3ee, #a855f7)',
                        border: submitting ? '1px solid rgba(34,211,238,0.3)' : 'none',
                        color: '#fff',
                        fontSize: '1rem',
                        fontWeight: 800,
                        fontFamily: "'Inter', system-ui, sans-serif",
                        cursor: submitting ? 'not-allowed' : 'pointer',
                        letterSpacing: '-0.01em',
                        transition: 'opacity 0.2s, background 0.3s',
                        opacity: submitting ? 0.8 : 1,
                      }}
                    >
                      <AnimatePresence mode="wait">
                        {submitting ? (
                          <motion.span
                            key="loading"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}
                          >
                            <motion.div
                              animate={{ rotate: 360 }}
                              transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
                            >
                              <Loader2 size={18} />
                            </motion.div>
                            Sending…
                          </motion.span>
                        ) : (
                          <motion.span
                            key="idle"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}
                          >
                            <Send size={17} />
                            Send Message
                          </motion.span>
                        )}
                      </AnimatePresence>
                    </motion.button>

                    <p style={{ textAlign: 'center', color: '#475569', fontSize: '0.78rem' }}>
                      No spam, ever. We only use your email to reply.
                    </p>
                  </motion.form>
                )}
              </AnimatePresence>
            </div>
          </motion.div>

          {/* RIGHT — Info + Socials */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {/* Info cards */}
            <motion.div
              initial={{ opacity: 0, y: 32 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.35 }}
            >
              <h2 style={{ fontSize: '0.78rem', fontWeight: 700, color: '#94a3b8', marginBottom: '1rem', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                Contact Info
              </h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {infoCards.map((card, i) => (
                  <InfoCard key={card.label} card={card} index={i} />
                ))}
              </div>
            </motion.div>

            {/* Follow us */}
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.55, delay: 0.45 }}
              style={{
                padding: '1.5rem',
                borderRadius: '1rem',
                border: '1px solid rgba(255,255,255,0.07)',
                background: 'rgba(15,23,42,0.6)',
                backdropFilter: 'blur(16px)',
              }}
            >
              <h3 style={{ fontSize: '0.78rem', fontWeight: 700, color: '#94a3b8', letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: '1rem' }}>
                Follow us
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                {socials.map(s => (
                  <a
                    key={s.label}
                    href={s.href}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.75rem',
                      padding: '0.7rem 0.9rem',
                      borderRadius: '0.75rem',
                      border: '1px solid rgba(255,255,255,0.06)',
                      textDecoration: 'none',
                      color: '#cbd5e1',
                      fontSize: '0.875rem',
                      fontWeight: 600,
                      transition: 'background 0.2s, border-color 0.2s',
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.background = `${s.color}12`;
                      e.currentTarget.style.borderColor = `${s.color}35`;
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.background = 'transparent';
                      e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)';
                    }}
                  >
                    <span style={{ color: s.color }}>{s.icon}</span>
                    {s.label}
                    <ArrowRight size={14} style={{ marginLeft: 'auto', color: '#475569' }} />
                  </a>
                ))}
              </div>
            </motion.div>

            {/* Privacy note */}
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.55, delay: 0.55 }}
              style={{
                padding: '1.25rem',
                borderRadius: '1rem',
                border: '1px solid rgba(52,211,153,0.2)',
                background: 'rgba(52,211,153,0.04)',
                display: 'flex',
                gap: '0.75rem',
                alignItems: 'flex-start',
              }}
            >
              <span style={{ fontSize: '1.25rem', flexShrink: 0 }}>🔒</span>
              <div>
                <div style={{ color: '#34d399', fontWeight: 700, fontSize: '0.85rem', marginBottom: '0.25rem' }}>
                  Privacy first
                </div>
                <div style={{ color: '#64748b', fontSize: '0.78rem', lineHeight: 1.65 }}>
                  AI4Montage runs entirely in your browser. We will never share your data or email with third parties.
                </div>
              </div>
            </motion.div>
          </div>
        </div>

        {/* FAQ Teaser */}
        <div style={{ maxWidth: '52rem', marginLeft: 'auto', marginRight: 'auto', padding: '0 1.5rem 6rem' }}>
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            style={{
              borderRadius: '1.5rem',
              border: '1px solid rgba(168,85,247,0.2)',
              background: 'linear-gradient(135deg, rgba(168,85,247,0.07), rgba(34,211,238,0.04))',
              backdropFilter: 'blur(16px)',
              padding: '2.25rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.75rem' }}>
              <div style={{
                width: '2.25rem', height: '2.25rem', borderRadius: '0.6rem',
                background: 'rgba(168,85,247,0.12)', border: '1px solid rgba(168,85,247,0.25)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '1rem',
              }}>
                ❓
              </div>
              <div>
                <div style={{ color: '#fff', fontWeight: 800, fontSize: '1.1rem', letterSpacing: '-0.02em' }}>
                  Common questions
                </div>
                <div style={{ color: '#64748b', fontSize: '0.8rem' }}>
                  Quick answers before you write to us
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', marginBottom: '1.75rem' }}>
              {faqTeasers.map((item, i) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, x: -16 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1, duration: 0.4 }}
                >
                  <Link
                    to="/pricing"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.75rem',
                      padding: '0.9rem 1rem',
                      borderRadius: '0.875rem',
                      border: '1px solid rgba(255,255,255,0.06)',
                      textDecoration: 'none',
                      color: '#cbd5e1',
                      fontSize: '0.9rem',
                      fontWeight: 500,
                      transition: 'background 0.2s, border-color 0.2s, color 0.2s',
                      background: 'rgba(15,23,42,0.5)',
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.background = 'rgba(168,85,247,0.08)';
                      e.currentTarget.style.borderColor = 'rgba(168,85,247,0.3)';
                      e.currentTarget.style.color = '#e2e8f0';
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.background = 'rgba(15,23,42,0.5)';
                      e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)';
                      e.currentTarget.style.color = '#cbd5e1';
                    }}
                  >
                    <span style={{ color: '#a855f7', flexShrink: 0 }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                    </span>
                    {item.q}
                    <ChevronRight size={15} style={{ marginLeft: 'auto', color: '#475569', flexShrink: 0 }} />
                  </Link>
                </motion.div>
              ))}
            </div>

            <Link
              to="/pricing"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.75rem 1.5rem',
                borderRadius: '0.75rem',
                background: 'rgba(168,85,247,0.12)',
                border: '1px solid rgba(168,85,247,0.3)',
                color: '#c084fc',
                fontSize: '0.875rem',
                fontWeight: 700,
                textDecoration: 'none',
                transition: 'background 0.2s',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(168,85,247,0.2)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'rgba(168,85,247,0.12)')}
            >
              View full FAQ on Pricing page <ArrowRight size={15} />
            </Link>
          </motion.div>
        </div>

        {/* Footer */}
        <Footer />
      </div>
    </div>
  );
}
