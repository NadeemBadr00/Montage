import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Mail, Bug, Handshake, Clock,
  ChevronRight,
} from 'lucide-react';

/* ── Types ────────────────────────────────────────────────────────────────── */
export type FormState = {
  name: string;
  email: string;
  subject: string;
  message: string;
};

export type FieldError = Partial<Record<keyof FormState, string>>;

/* ── Contact Info Cards data ─────────────────────────────────────────────── */
export const infoCards = [
  {
    icon: <Mail size={20} />,
    label: 'General Email',
    value: 'contact@ai4montage.com',
    href: 'mailto:contact@ai4montage.com',
    accent: '#22d3ee',
    accentBg: 'rgba(34,211,238,0.08)',
  },
  {
    icon: <Bug size={20} />,
    label: 'Bug Reports',
    value: 'Open a GitHub Issue',
    href: 'https://github.com/nadeembadr00',
    accent: '#f97316',
    accentBg: 'rgba(249,115,22,0.08)',
  },
  {
    icon: <Handshake size={20} />,
    label: 'Partnerships',
    value: 'partnerships@ai4montage.com',
    href: 'mailto:partnerships@ai4montage.com',
    accent: '#a855f7',
    accentBg: 'rgba(168,85,247,0.08)',
  },
  {
    icon: <Clock size={20} />,
    label: 'Response Time',
    value: 'Usually within 24 hours',
    href: null,
    accent: '#34d399',
    accentBg: 'rgba(52,211,153,0.08)',
  },
];

/* ── Social links ─────────────────────────────────────────────────────────── */
export const socials = [
  { icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.746l7.73-8.835L1.254 2.25H8.08l4.253 5.622 5.911-5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>, label: 'Twitter / X', href: 'https://x.com/nadeembadr00', color: '#22d3ee' },
  { icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0 1 12 6.844a9.59 9.59 0 0 1 2.504.337c1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.02 10.02 0 0 0 22 12.017C22 6.484 17.522 2 12 2z"/></svg>, label: 'GitHub', href: 'https://github.com/nadeembadr00', color: '#94a3b8' },
  { icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>, label: 'YouTube', href: 'https://youtube.com/@nadeembadr00', color: '#ec4899' },
];

/* ── FAQ teaser data ─────────────────────────────────────────────────────── */
export const faqTeasers = [
  { q: 'Do I need a credit card to sign up?', id: 'faq-cc' },
  { q: 'Is my video data private and secure?', id: 'faq-privacy' },
  { q: 'What happens after my 30-day Ultra trial?', id: 'faq-trial' },
];

/* ── Validation ──────────────────────────────────────────────────────────── */
export function validate(form: FormState): FieldError {
  const errors: FieldError = {};
  if (!form.name.trim()) errors.name = 'Name is required.';
  if (!form.email.trim()) {
    errors.email = 'Email is required.';
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
    errors.email = 'Please enter a valid email address.';
  }
  if (!form.subject) errors.subject = 'Please choose a subject.';
  if (!form.message.trim()) {
    errors.message = 'Message is required.';
  } else if (form.message.trim().length < 10) {
    errors.message = 'Message must be at least 10 characters.';
  }
  return errors;
}

/* ── Floating label input ────────────────────────────────────────────────── */
export function FormField({
  label, id, type = 'text', value, onChange, error, touched, rows,
  inputRef,
}: {
  label: string;
  id: string;
  type?: string;
  value: string;
  onChange: (v: string) => void;
  error?: string;
  touched?: boolean;
  rows?: number;
  inputRef?: React.Ref<HTMLInputElement | HTMLTextAreaElement>;
}) {
  const [focused, setFocused] = useState(false);
  const hasValue = value.length > 0;
  const showError = touched && error;

  const borderColor = showError
    ? '#f87171'
    : focused
    ? '#22d3ee'
    : 'rgba(255,255,255,0.1)';

  const glowShadow = focused
    ? showError
      ? '0 0 0 3px rgba(248,113,113,0.18)'
      : '0 0 0 3px rgba(34,211,238,0.15)'
    : 'none';

  const commonStyle: React.CSSProperties = {
    width: '100%',
    background: 'rgba(15,23,42,0.7)',
    border: `1.5px solid ${borderColor}`,
    borderRadius: '0.875rem',
    color: '#f1f5f9',
    fontSize: '0.95rem',
    fontFamily: "'Inter', system-ui, sans-serif",
    outline: 'none',
    transition: 'border-color 0.25s, box-shadow 0.25s',
    boxSizing: 'border-box',
    boxShadow: glowShadow,
    resize: 'none' as const,
    padding: rows ? '1.25rem 1rem 0.6rem' : '1.35rem 1rem 0.5rem',
  };

  const labelStyle: React.CSSProperties = {
    position: 'absolute',
    left: '1rem',
    top: focused || hasValue ? '0.45rem' : '50%',
    transform: focused || hasValue ? 'translateY(0) scale(0.78)' : 'translateY(-50%)',
    transformOrigin: 'left center',
    color: showError ? '#f87171' : focused ? '#22d3ee' : '#64748b',
    fontSize: '0.95rem',
    pointerEvents: 'none',
    transition: 'top 0.2s, transform 0.2s, color 0.2s',
    fontWeight: focused || hasValue ? 600 : 400,
    zIndex: 2,
  };

  return (
    <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
      <div style={{ position: 'relative' }}>
        <label htmlFor={id} style={labelStyle}>{label}</label>
        {rows ? (
          <textarea
            id={id}
            rows={rows}
            value={value}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            onChange={e => onChange(e.target.value)}
            style={{ ...commonStyle, paddingTop: '1.6rem', paddingBottom: '0.75rem' }}
            ref={inputRef as React.Ref<HTMLTextAreaElement>}
          />
        ) : (
          <input
            id={id}
            type={type}
            value={value}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            onChange={e => onChange(e.target.value)}
            style={commonStyle}
            ref={inputRef as React.Ref<HTMLInputElement>}
          />
        )}
      </div>
      <AnimatePresence>
        {showError && (
          <motion.span
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.18 }}
            style={{ color: '#f87171', fontSize: '0.78rem', paddingLeft: '0.25rem' }}
          >
            {error}
          </motion.span>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ── Info Card ────────────────────────────────────────────────────────────── */
export function InfoCard({ card, index }: { card: typeof infoCards[0]; index: number }) {
  const [hovered, setHovered] = useState(false);

  const inner = (
    <motion.div
      initial={{ opacity: 0, x: 30 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
      onHoverStart={() => setHovered(true)}
      onHoverEnd={() => setHovered(false)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '1rem',
        padding: '1.1rem 1.25rem',
        borderRadius: '1rem',
        border: `1px solid ${hovered && card.href ? card.accent + '40' : 'rgba(255,255,255,0.07)'}`,
        background: hovered && card.href ? card.accentBg : 'rgba(15,23,42,0.6)',
        backdropFilter: 'blur(16px)',
        transition: 'border-color 0.25s, background 0.25s',
        cursor: card.href ? 'pointer' : 'default',
        textDecoration: 'none',
      }}
    >
      <div
        style={{
          width: '2.5rem',
          height: '2.5rem',
          borderRadius: '0.75rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: card.accentBg,
          border: `1px solid ${card.accent}30`,
          color: card.accent,
          flexShrink: 0,
          transition: 'transform 0.25s',
          transform: hovered && card.href ? 'scale(1.1)' : 'scale(1)',
        }}
      >
        {card.icon}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ color: '#64748b', fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.15rem' }}>
          {card.label}
        </div>
        <div
          style={{
            color: card.href ? card.accent : '#cbd5e1',
            fontSize: '0.875rem',
            fontWeight: 600,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {card.value}
        </div>
      </div>
      {card.href && (
        <ChevronRight
          size={16}
          style={{
            color: card.accent,
            opacity: hovered ? 1 : 0.4,
            transition: 'opacity 0.2s, transform 0.2s',
            transform: hovered ? 'translateX(3px)' : 'translateX(0)',
            flexShrink: 0,
          }}
        />
      )}
    </motion.div>
  );

  if (card.href) {
    return (
      <a href={card.href} style={{ textDecoration: 'none' }}>
        {inner}
      </a>
    );
  }
  return inner;
}
