import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, Cookie, Shield, Settings, Eye, AlertTriangle } from 'lucide-react';
import { AnimatedLogo } from '../components/ui/AnimatedLogo';
import { Footer } from '../components/ui/Footer';
import { UserNavButton } from '../components/ui/UserNavButton';

const TOC = [
  { id: 'what',     label: 'What Are Cookies?' },
  { id: 'we-use',   label: 'Cookies We Use' },
  { id: 'local',    label: 'Local Storage' },
  { id: 'third',    label: 'Third-Party Cookies' },
  { id: 'control',  label: 'Your Controls' },
  { id: 'contact',  label: 'Contact' },
];

const navStyle: React.CSSProperties = {
  position: 'sticky', top: 0, zIndex: 50,
  padding: '1rem 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
  background: 'rgba(2,9,23,0.9)', backdropFilter: 'blur(20px)',
  borderBottom: '1px solid rgba(255,255,255,0.06)', direction: 'ltr',
};

const centered: React.CSSProperties = {
  maxWidth: '72rem', marginLeft: 'auto', marginRight: 'auto',
  paddingLeft: '1.5rem', paddingRight: '1.5rem', boxSizing: 'border-box',
};

export default function Cookies() {
  return (
    <div dir="ltr" style={{ minHeight: '100vh', background: '#020917', color: '#f1f5f9', fontFamily: "'Inter', system-ui, sans-serif", direction: 'ltr' }}>

      {/* Nav */}
      <nav style={navStyle}>
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', textDecoration: 'none' }}>
          <AnimatedLogo size="sm" />
          <span style={{ fontSize: '1.15rem', fontWeight: 900, color: '#fff', letterSpacing: '-0.04em' }}>AI4Montage</span>
        </Link>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
          <Link to="/" style={{ color: '#94a3b8', textDecoration: 'none', fontSize: '0.875rem', fontWeight: 600 }}>Home</Link>
          <Link to="/privacy" style={{ color: '#94a3b8', textDecoration: 'none', fontSize: '0.875rem', fontWeight: 600 }}>Privacy</Link>
          <UserNavButton />
        </div>
      </nav>

      {/* Hero */}
      <div style={{ ...centered, paddingTop: '4rem', paddingBottom: '3rem', textAlign: 'center' }}>
        <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5 }}
          style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '4rem', height: '4rem', borderRadius: '1rem', background: 'rgba(34,211,238,0.1)', border: '1px solid rgba(34,211,238,0.25)', color: '#22d3ee', marginBottom: '1.5rem' }}>
          <Cookie size={28} />
        </motion.div>
        <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.1 }}
          style={{ fontSize: 'clamp(2.2rem, 5vw, 3.5rem)', fontWeight: 900, letterSpacing: '-0.04em', marginBottom: '1rem' }}>
          Cookies Policy
        </motion.h1>
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}
          style={{ color: '#64748b', fontSize: '0.9rem' }}>Last updated: May 27, 2026</motion.p>
        <motion.p initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
          style={{ color: '#94a3b8', fontSize: '1.05rem', maxWidth: '36rem', marginLeft: 'auto', marginRight: 'auto', marginTop: '1rem', lineHeight: 1.7 }}>
          We use minimal cookies — only what's essential for authentication. No tracking, no ads, no profiling.
        </motion.p>
      </div>

      {/* Key points */}
      <div style={{ ...centered, paddingBottom: '3rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
          {[
            { icon: <Shield size={20} />, title: 'No tracking cookies', desc: 'We don\'t use Google Analytics, Meta Pixel, or any behavioral tracking.', accent: '#34d399' },
            { icon: <Cookie size={20} />, title: 'Auth cookie only', desc: 'Firebase sets a session cookie purely to keep you signed in.', accent: '#22d3ee' },
            { icon: <Settings size={20} />, title: 'Full user control', desc: 'Clear cookies anytime. You can use the editor anonymously.', accent: '#a855f7' },
          ].map((item, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }}
              style={{ padding: '1.5rem', borderRadius: '1.25rem', border: `1px solid ${item.accent}25`, background: `${item.accent}08` }}>
              <div style={{ color: item.accent, marginBottom: '0.75rem' }}>{item.icon}</div>
              <div style={{ color: '#fff', fontWeight: 700, marginBottom: '0.4rem', fontSize: '0.95rem' }}>{item.title}</div>
              <div style={{ color: '#94a3b8', fontSize: '0.83rem', lineHeight: 1.6 }}>{item.desc}</div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Content + TOC */}
      <div style={{ ...centered, paddingBottom: '6rem', display: 'grid', gridTemplateColumns: '220px 1fr', gap: '3rem', alignItems: 'start' }}>

        {/* TOC */}
        <div style={{ position: 'sticky', top: '6rem' }}>
          <div style={{ padding: '1.25rem', borderRadius: '1rem', border: '1px solid rgba(255,255,255,0.07)', background: 'rgba(15,23,42,0.5)' }}>
            <div style={{ color: '#64748b', fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '1rem' }}>Contents</div>
            {TOC.map(item => (
              <a key={item.id} href={`#${item.id}`} style={{ display: 'block', color: '#94a3b8', textDecoration: 'none', fontSize: '0.83rem', padding: '0.4rem 0', borderLeft: '2px solid transparent', paddingLeft: '0.75rem', transition: 'all 0.2s' }}
                onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.color = '#22d3ee'; (e.currentTarget as HTMLAnchorElement).style.borderLeftColor = '#22d3ee'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.color = '#94a3b8'; (e.currentTarget as HTMLAnchorElement).style.borderLeftColor = 'transparent'; }}>
                {item.label}
              </a>
            ))}
          </div>
        </div>

        {/* Sections */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '3rem' }}>
          {[
            { id: 'what', title: 'What Are Cookies?', content: 'Cookies are small text files stored in your browser by websites you visit. They serve various purposes, from keeping you logged in to remembering preferences. At AI4Montage, we use cookies sparingly and only for essential functionality.' },
            { id: 'we-use', title: 'Cookies We Use', content: 'We use exactly one category of cookies: authentication cookies set by Firebase Auth (Google). These cookies contain an encrypted session token that keeps you signed in. They contain no personal information and are automatically cleared when you sign out or your session expires. No marketing cookies, no tracking pixels, no analytics beacons.' },
            { id: 'local', title: 'Local Storage', content: 'In addition to cookies, we use your browser\'s localStorage to store your user profile (name, email, profile photo, and plan tier). This data never leaves your device and is used purely to display your account information in the app. You can clear this at any time through your browser settings or by signing out.' },
            { id: 'third', title: 'Third-Party Cookies', content: 'Firebase Auth (operated by Google) may set cookies as part of the authentication flow. These are governed by Google\'s Privacy Policy. We do not use any advertising networks, analytics platforms (no Google Analytics, Mixpanel, Amplitude, etc.), social media trackers, or any other third-party cookies.' },
            { id: 'control', title: 'Your Controls', content: 'You have full control: (1) Clear cookies via your browser settings at any time. (2) Use AI4Montage without signing in — the editor works fully without an account. (3) Sign out to immediately clear your session cookie. (4) Disable cookies entirely in your browser — note this will prevent sign-in.' },
            { id: 'contact', title: 'Contact', content: 'If you have questions about our cookie usage, please reach out at privacy@ai4montage.com. We\'re a small team and read every message.' },
          ].map((section, i) => (
            <motion.section key={section.id} id={section.id}
              initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.05 }}>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#fff', marginBottom: '1rem', letterSpacing: '-0.02em', paddingBottom: '0.75rem', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                {section.title}
              </h2>
              <p style={{ color: '#94a3b8', lineHeight: 1.8, fontSize: '0.95rem' }}>{section.content}</p>
            </motion.section>
          ))}
        </div>
      </div>

      {/* Footer */}
      <Footer />
    </div>
  );
}
