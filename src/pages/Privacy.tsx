import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, Shield, Upload, Eye, Lock } from 'lucide-react';
import { AnimatedLogo } from '../components/ui/AnimatedLogo';
import { Footer } from '../components/ui/Footer';
import { UserNavButton } from '../components/ui/UserNavButton';

const TOC = [
  { id: 'collect',  label: '1. Information We Collect' },
  { id: 'use',      label: '2. How We Use Your Data' },
  { id: 'storage',  label: '3. Data Storage' },
  { id: 'videos',   label: '4. Your Video Files' },
  { id: 'cookies',  label: '5. Cookies & Local Storage' },
  { id: 'third',    label: '6. Third-Party Services' },
  { id: 'children', label: '7. Children\'s Privacy' },
  { id: 'changes',  label: '8. Changes to This Policy' },
  { id: 'contact',  label: '9. Contact' },
];

const c: React.CSSProperties = {
  maxWidth: '72rem', marginLeft: 'auto', marginRight: 'auto',
  paddingLeft: '1.5rem', paddingRight: '1.5rem', boxSizing: 'border-box',
};

const sections = [
  {
    id: 'collect', title: '1. Information We Collect',
    content: `We collect only the minimum data required to provide authentication:\n\n• **Google Account Name** — displayed in the app interface\n• **Email Address** — used as your unique identifier\n• **Profile Photo URL** — displayed as your avatar\n• **Google User ID (UID)** — used to identify your session\n\nWe do not collect passwords, payment information, location data, device fingerprints, or behavioral analytics.`,
  },
  {
    id: 'use', title: '2. How We Use Your Data',
    content: `Your data is used exclusively for:\n\n• Authenticating your identity via Google OAuth\n• Displaying your name and avatar inside the app\n• Assigning your plan tier (Free / Pro / Ultra)\n\nWe do not sell, rent, trade, or share your personal information with any third parties for marketing or commercial purposes.`,
  },
  {
    id: 'storage', title: '3. Data Storage',
    content: `Your profile data (name, email, photo, plan) is stored in your browser's **localStorage** on your device only. We do not maintain a user database with your personal information on our servers.\n\nFirebase Auth maintains a secure session token to keep you signed in. This token is encrypted and contains no readable personal information.`,
  },
  {
    id: 'videos', title: '4. Your Video Files',
    content: `**Your videos never leave your device.** This is the core promise of AI4Montage.\n\nAll video processing — trimming, encoding, AI analysis, style transfer, subtitle generation — happens entirely within your browser using WebGPU and WebCodecs APIs. No video data is transmitted to any server, ever. We have no technical capability to access your footage.`,
  },
  {
    id: 'cookies', title: '5. Cookies & Local Storage',
    content: `AI4Montage uses:\n\n• **Firebase Auth session cookie** — keeps you signed in (essential, expires when you sign out)\n• **localStorage['p43_user']** — stores your profile and plan tier client-side\n\nWe do NOT use advertising cookies, analytics tracking cookies, social media pixels, or any form of cross-site tracking.`,
  },
  {
    id: 'third', title: '6. Third-Party Services',
    content: `The only third-party service we use is **Firebase Authentication** (operated by Google LLC). Firebase handles the OAuth flow and session management. Their privacy practices are governed by Google's Privacy Policy at https://policies.google.com/privacy.\n\nWe do not use Google Analytics, Mixpanel, Hotjar, Meta Pixel, or any behavioral analytics services.`,
  },
  {
    id: 'children', title: '7. Children\'s Privacy',
    content: `AI4Montage is not directed to children under the age of 13. We do not knowingly collect personal information from children under 13. If you believe a child has provided us with personal information, please contact us immediately and we will delete it.`,
  },
  {
    id: 'changes', title: '8. Changes to This Policy',
    content: `We may update this Privacy Policy occasionally. When we do, we will update the "Last updated" date at the top of this page and may display a notice within the application. We encourage you to review this page periodically. Continued use of AI4Montage after changes constitutes acceptance of the updated policy.`,
  },
  {
    id: 'contact', title: '9. Contact',
    content: `If you have questions, concerns, or requests regarding your privacy or this policy, please contact us:\n\n• Email: privacy@ai4montage.com\n• General: contact@ai4montage.com\n\nWe typically respond within 48 hours.`,
  },
];

function renderContent(text: string) {
  return text.split('\n').map((line, i) => {
    if (line.startsWith('• ')) {
      const parts = line.replace('• ', '').split(/\*\*(.*?)\*\*/g);
      return (
        <div key={i} style={{ display: 'flex', gap: '0.6rem', marginBottom: '0.5rem', alignItems: 'flex-start' }}>
          <span style={{ color: '#22d3ee', marginTop: '0.1rem', flexShrink: 0 }}>•</span>
          <span style={{ color: '#94a3b8', lineHeight: 1.7 }}>
            {parts.map((p, j) => j % 2 === 1 ? <strong key={j} style={{ color: '#e2e8f0' }}>{p}</strong> : p)}
          </span>
        </div>
      );
    }
    if (line.trim() === '') return <div key={i} style={{ height: '0.75rem' }} />;
    const parts = line.split(/\*\*(.*?)\*\*/g);
    return <p key={i} style={{ color: '#94a3b8', lineHeight: 1.8, marginBottom: '0.25rem' }}>
      {parts.map((p, j) => j % 2 === 1 ? <strong key={j} style={{ color: '#e2e8f0' }}>{p}</strong> : p)}
    </p>;
  });
}

export default function Privacy() {
  return (
    <div dir="ltr" style={{ minHeight: '100vh', background: '#020917', color: '#f1f5f9', fontFamily: "'Inter', system-ui, sans-serif", direction: 'ltr' }}>

      {/* Nav */}
      <nav style={{ position: 'sticky', top: 0, zIndex: 50, padding: '1rem 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(2,9,23,0.9)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', textDecoration: 'none' }}>
          <AnimatedLogo size="sm" />
          <span style={{ fontSize: '1.15rem', fontWeight: 900, color: '#fff', letterSpacing: '-0.04em' }}>AI4Montage</span>
        </Link>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
          <Link to="/" style={{ color: '#94a3b8', textDecoration: 'none', fontSize: '0.875rem', fontWeight: 600 }}>Home</Link>
          <Link to="/terms" style={{ color: '#94a3b8', textDecoration: 'none', fontSize: '0.875rem', fontWeight: 600 }}>Terms</Link>
          <UserNavButton />
        </div>
      </nav>

      {/* Hero */}
      <div style={{ ...c, paddingTop: '4rem', paddingBottom: '3rem', textAlign: 'center' }}>
        <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5 }}
          style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '4rem', height: '4rem', borderRadius: '1rem', background: 'rgba(52,211,153,0.1)', border: '1px solid rgba(52,211,153,0.25)', color: '#34d399', marginBottom: '1.5rem' }}>
          <Shield size={28} />
        </motion.div>
        <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.1 }}
          style={{ fontSize: 'clamp(2.2rem, 5vw, 3.5rem)', fontWeight: 900, letterSpacing: '-0.04em', marginBottom: '0.75rem' }}>
          Privacy Policy
        </motion.h1>
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.25 }}
          style={{ color: '#64748b', fontSize: '0.85rem', marginBottom: '1rem' }}>Last updated: May 27, 2026</motion.p>
        <motion.p initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}
          style={{ color: '#94a3b8', fontSize: '1.1rem', maxWidth: '38rem', marginLeft: 'auto', marginRight: 'auto', lineHeight: 1.7, fontStyle: 'italic' }}>
          "Your privacy is not a feature — it is the foundation."
        </motion.p>
      </div>

      {/* Key promises */}
      <div style={{ ...c, paddingBottom: '3rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
          {[
            { icon: <Upload size={20} />, title: 'Zero Upload', desc: 'Your videos never leave your device. All AI runs locally in the browser.', accent: '#34d399' },
            { icon: <Eye size={20} />,    title: 'No Tracking', desc: 'No Google Analytics, no Meta Pixel, no behavioral profiling.', accent: '#22d3ee' },
            { icon: <Lock size={20} />,   title: 'Google Auth Only', desc: 'The only data we store is your name, email, and photo from Google OAuth.', accent: '#a855f7' },
          ].map((item, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }}
              style={{ padding: '1.75rem', borderRadius: '1.25rem', border: `1px solid ${item.accent}25`, background: `${item.accent}08`, textAlign: 'center' }}>
              <div style={{ color: item.accent, marginBottom: '0.85rem', display: 'flex', justifyContent: 'center' }}>{item.icon}</div>
              <div style={{ color: '#fff', fontWeight: 800, marginBottom: '0.5rem', fontSize: '1rem' }}>{item.title}</div>
              <div style={{ color: '#94a3b8', fontSize: '0.83rem', lineHeight: 1.6 }}>{item.desc}</div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* TOC + Content */}
      <div style={{ ...c, paddingBottom: '6rem', display: 'grid', gridTemplateColumns: '220px 1fr', gap: '3rem', alignItems: 'start' }}>
        {/* TOC */}
        <div style={{ position: 'sticky', top: '6rem' }}>
          <div style={{ padding: '1.25rem', borderRadius: '1rem', border: '1px solid rgba(255,255,255,0.07)', background: 'rgba(15,23,42,0.5)' }}>
            <div style={{ color: '#64748b', fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '1rem' }}>Contents</div>
            {TOC.map(item => (
              <a key={item.id} href={`#${item.id}`} style={{ display: 'block', color: '#94a3b8', textDecoration: 'none', fontSize: '0.8rem', padding: '0.4rem 0', borderLeft: '2px solid transparent', paddingLeft: '0.75rem', transition: 'all 0.2s' }}
                onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.color = '#34d399'; (e.currentTarget as HTMLAnchorElement).style.borderLeftColor = '#34d399'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.color = '#94a3b8'; (e.currentTarget as HTMLAnchorElement).style.borderLeftColor = 'transparent'; }}>
                {item.label}
              </a>
            ))}
          </div>
        </div>

        {/* Sections */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '3rem' }}>
          {sections.map((s, i) => (
            <motion.section key={s.id} id={s.id} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.04 }}>
              <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#fff', marginBottom: '1.25rem', letterSpacing: '-0.02em', paddingBottom: '0.75rem', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                {s.title}
              </h2>
              <div>{renderContent(s.content)}</div>
            </motion.section>
          ))}
        </div>
      </div>

      {/* Footer */}
      <Footer />
    </div>
  );
}
