import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Shield, Upload, Eye, Lock, CreditCard, Brain, Database, Globe } from 'lucide-react';
import { AnimatedLogo } from '../components/ui/AnimatedLogo';
import { Footer } from '../components/ui/Footer';
import { UserNavButton } from '../components/ui/UserNavButton';

const LAST_UPDATED = 'June 7, 2026';
const CONTACT_EMAIL = 'support@ai4roadmap.com';

const TOC = [
  { id: 'collect',   label: '1. Information We Collect' },
  { id: 'use',       label: '2. How We Use Your Data' },
  { id: 'storage',   label: '3. Data Storage' },
  { id: 'videos',    label: '4. Your Video Files' },
  { id: 'ai',        label: '5. AI Features & APIs' },
  { id: 'payment',   label: '6. Payment Data (Paymob)' },
  { id: 'cookies',   label: '7. Cookies & Local Storage' },
  { id: 'third',     label: '8. Third-Party Services' },
  { id: 'rights',    label: '9. Your Rights (GDPR/CCPA)' },
  { id: 'children',  label: '10. Children\'s Privacy' },
  { id: 'retention', label: '11. Data Retention' },
  { id: 'security',  label: '12. Security' },
  { id: 'changes',   label: '13. Changes' },
  { id: 'contact',   label: '14. Contact & DPO' },
];

const c: React.CSSProperties = {
  maxWidth: '72rem', marginLeft: 'auto', marginRight: 'auto',
  paddingLeft: '1.5rem', paddingRight: '1.5rem', boxSizing: 'border-box',
};

const sections = [
  {
    id: 'collect', title: '1. Information We Collect',
    content: `We collect only the minimum data required to provide and improve our service.\n\n**Account & Identity (via Google OAuth):**\n• Google Account Display Name — shown in the app interface\n• Email Address — used as your unique account identifier\n• Profile Photo URL — displayed as your avatar\n• Google User ID (UID) — used to link your session to your plan\n\n**Subscription & Billing:**\n• Subscription plan tier (Free / Pro / Ultra)\n• Plan expiry timestamp (planExpiresAt)\n• Billing frequency (monthly / yearly)\n• Paymob Transaction ID — for payment verification (stored in Firestore, NOT the card data)\n\n**What we do NOT collect:**\n• Passwords (handled entirely by Google)\n• IP addresses or geolocation data\n• Device fingerprints or hardware identifiers\n• Behavioral analytics, heatmaps, or session recordings`,
  },
  {
    id: 'use', title: '2. How We Use Your Data',
    content: `Your data is used exclusively for the following purposes:\n\n• **Authentication** — Verifying your identity via Google OAuth\n• **Account Display** — Showing your name and avatar inside the editor\n• **Plan Management** — Assigning and enforcing your subscription tier (Free / Pro / Ultra)\n• **Payment Verification** — Confirming successful payments via Paymob and activating your plan\n• **Support** — Responding to support or refund requests you initiate\n\nWe do NOT use your data for:\n• Advertising or marketing profiling\n• Sale or rental to third parties\n• Automated decision-making with legal effects\n• Training AI models on your personal data`,
  },
  {
    id: 'storage', title: '3. Data Storage',
    content: `**Client-side (your device only):**\n• localStorage['p43_user'] — stores your name, email, photo URL, plan, and expiry timestamp\n• Firebase Auth session token — encrypted, used to keep you signed in; expires on sign-out\n\n**Server-side (Firebase / Google Cloud — us-central1):**\n• Firebase Authentication — your user record: UID, email, display name, photo URL\n• Cloud Firestore 'users' collection — plan tier, plan expiry, billing frequency\n• Cloud Firestore 'pendingPayments' collection — Paymob transaction IDs and payment status\n\nWe do NOT store your video files, project timelines, audio, or exported media on any server.`,
  },
  {
    id: 'videos', title: '4. Your Video Files',
    content: `**Your videos never leave your device. This is our core promise.**\n\nAll video processing — trimming, cutting, color grading, encoding, transition effects — happens entirely within your browser using WebGPU and WebCodecs APIs.\n\nWe have no technical capability to access, transmit, or store your footage. No video data is sent to any server at any time.\n\n**Exception — AI Captions feature only:** If you use the AI Auto Captions feature, short audio segments are extracted locally in your browser and sent to Google's Gemini API for speech-to-text transcription. Only audio is sent — never video frames. See Section 5 for full details.`,
  },
  {
    id: 'ai', title: '5. AI Features & Third-Party APIs',
    content: `AI4Montage integrates with **Google Gemini AI API** for the following features:\n\n• **AI Chat Assistant** — Text prompts you type are sent to Gemini API to generate responses\n• **AI Auto Captions** — Audio clips (extracted in-browser) are sent to Gemini for speech-to-text\n• **Auto Montage AI** — Text-based project metadata (clip list, durations) is sent as context\n\n**What is sent to Gemini:** Audio snippets (for captions only), text prompts, project metadata\n**What is NOT sent:** Full video files, personal information, account credentials, card data\n\nYour Gemini API key is stored in your browser's localStorage. It is never transmitted to or stored on our servers.\n\nGoogle's use of data sent to Gemini API is governed by:\n• Google Privacy Policy: https://policies.google.com/privacy\n• Gemini API Terms: https://ai.google.dev/terms`,
  },
  {
    id: 'payment', title: '6. Payment Data (Paymob)',
    content: `Subscription payments are processed by **Paymob** — a PCI DSS Level 1 compliant payment gateway.\n\nWe do NOT collect, store, or process your credit/debit card details directly. Card data is entered directly into Paymob's secure iframe and never touches our servers.\n\n**What we receive from Paymob after payment:**\n• Transaction ID — to verify the payment server-side\n• Plan purchased (Pro / Ultra) and billing period (monthly / yearly)\n• Payment status (paid / pending)\n\nThis data is stored in Firebase Firestore solely to activate your subscription.\n\n**Zero-Trust Verification:** Payment confirmation is performed server-side via Firebase Cloud Functions calling Paymob's server-to-server API — the user cannot manipulate or fake payment status.\n\nPaymob Privacy Policy: https://paymob.com/en/privacy-policy`,
  },
  {
    id: 'cookies', title: '7. Cookies & Local Storage',
    content: `**What we use (essential only):**\n• **Firebase Auth session cookie** — keeps you signed in (essential; deleted on sign-out)\n• **localStorage['p43_user']** — your profile and plan tier cached locally\n• **localStorage['cookie_consent']** — your cookie consent choice\n• **localStorage['ai4m_ultra_promo_seen']** — whether you dismissed the promo banner\n\n**What we do NOT use:**\n• Google Analytics (GA4) or any analytics platform\n• Meta Pixel, TikTok Pixel, or advertising pixels\n• Cross-site tracking or retargeting cookies\n• Session recording tools (Hotjar, FullStory, etc.)\n• Performance monitoring that collects personal data\n\nTo delete all local data: Browser Settings → Clear Site Data → AI4Montage`,
  },
  {
    id: 'third', title: '8. Third-Party Services',
    content: `The following third-party services are used by AI4Montage:\n\n• **Firebase Authentication** (Google LLC, USA) — OAuth sign-in and session management\n• **Cloud Firestore** (Google LLC, USA) — Subscription data storage\n• **Google Gemini API** (Google LLC, USA) — AI features (captions, chat, auto montage)\n• **Paymob** (Paymob, Egypt) — Payment processing, PCI DSS compliant\n\n**We do NOT use:**\n• Google Analytics / GA4 / Universal Analytics\n• Sentry, Datadog, or error monitoring with PII\n• Intercom, Zendesk, or customer support tracking tools\n• Any CDN that logs user IP addresses beyond transient server logs`,
  },
  {
    id: 'rights', title: '9. Your Rights (GDPR / CCPA)',
    content: `Regardless of your location, you have the following rights over your personal data:\n\n• **Right to Access** — Request a copy of all personal data we hold about you\n• **Right to Rectification** — Request correction of inaccurate data\n• **Right to Erasure** ("Right to be Forgotten") — Request deletion of your account and all data\n• **Right to Data Portability** — Receive your data in a machine-readable format (JSON)\n• **Right to Restrict Processing** — Ask us to limit how we process your data\n• **Right to Object** — Object to processing based on legitimate interests\n• **Right to Withdraw Consent** — Withdraw consent at any time\n• **CCPA Rights (California)** — Right to know, delete, opt-out of sale (we do not sell data)\n\nTo exercise any right, email: ${CONTACT_EMAIL}\nWe respond within 30 days. EEA/UK users may also contact their local supervisory authority.`,
  },
  {
    id: 'children', title: "10. Children's Privacy",
    content: `AI4Montage is not directed to children under 13 (or under 16 in the EEA). We do not knowingly collect personal information from children.\n\nIf you are a parent or guardian and believe your child has created an account, please contact us immediately at ${CONTACT_EMAIL}. We will delete the account and all associated data promptly.`,
  },
  {
    id: 'retention', title: '11. Data Retention',
    content: `• **Active accounts** — Profile and plan data retained while your account is active\n• **After account deletion** — Firebase Auth record deleted within 30 days\n• **Firestore user records** — Deleted within 30 days of deletion request\n• **Payment transaction IDs** — Retained for 5 years as required by Egyptian financial regulations (Law 11 of 2003)\n• **localStorage data** — Automatically cleared when you sign out or clear browser data`,
  },
  {
    id: 'security', title: '12. Security',
    content: `We implement industry-standard security measures:\n\n• **HTTPS/TLS 1.3** — All data in transit is encrypted end-to-end\n• **Firebase Security Rules** — Firestore data is accessible only to the authenticated account owner\n• **Zero-Trust Payment** — Subscription activation is performed server-side, never trust client claims\n• **No Password Storage** — Authentication is Google OAuth only; no passwords are ever stored by us\n• **API Key Safety** — Gemini API keys are stored client-side only; never sent to our servers\n\nIn the event of a data breach affecting your personal information, we will notify you within 72 hours as required by applicable law.`,
  },
  {
    id: 'changes', title: '13. Changes to This Policy',
    content: `We may update this Privacy Policy from time to time. When we do:\n\n• The "Last updated" date at the top of this page will be revised\n• Active paying subscribers will receive an email notification at least 7 days before material changes take effect\n• A notice banner will appear in the application\n\nContinued use of AI4Montage after policy changes constitutes your acceptance of the updated policy.`,
  },
  {
    id: 'contact', title: '14. Contact & Data Protection',
    content: `For all privacy-related questions, access requests, or complaints:\n\n• **Email:** ${CONTACT_EMAIL}\n• **Contact Form:** montage.ai4roadmap.com/contact\n• **Response time:** Within 48 hours for general inquiries; within 30 days for formal data subject requests\n\nAI4Montage is operated by the AI4Roadmap team (Egypt). For EEA users, our processing is based on contractual necessity (GDPR Art. 6(1)(b)) and legitimate interests (Art. 6(1)(f)).`,
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
          <Link to="/refund" style={{ color: '#94a3b8', textDecoration: 'none', fontSize: '0.875rem', fontWeight: 600 }}>Refunds</Link>
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
          style={{ color: '#64748b', fontSize: '0.85rem', marginBottom: '1rem' }}>Last updated: {LAST_UPDATED}</motion.p>
        <motion.p initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}
          style={{ color: '#94a3b8', fontSize: '1.1rem', maxWidth: '38rem', marginLeft: 'auto', marginRight: 'auto', lineHeight: 1.7, fontStyle: 'italic' }}>
          "Your privacy is not a feature — it is the foundation."
        </motion.p>
      </div>

      {/* Key promises */}
      <div style={{ ...c, paddingBottom: '3rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
          {[
            { icon: <Upload size={20} />,     title: 'Zero Video Upload',    desc: 'Videos never leave your device. All processing runs locally.', accent: '#34d399' },
            { icon: <Eye size={20} />,         title: 'No Tracking',         desc: 'No Google Analytics, no Meta Pixel, no behavioral profiling.', accent: '#22d3ee' },
            { icon: <Lock size={20} />,        title: 'Google Auth Only',    desc: 'Only name, email, and photo are stored — nothing else.', accent: '#a855f7' },
            { icon: <CreditCard size={20} />,  title: 'PCI Payments',        desc: 'Card data handled by Paymob (PCI DSS). We never see your card.', accent: '#f59e0b' },
            { icon: <Brain size={20} />,       title: 'AI Transparency',     desc: 'Gemini AI receives only audio snippets and text prompts.', accent: '#ec4899' },
            { icon: <Globe size={20} />,       title: 'GDPR Rights',         desc: 'Access, delete, or export your data at any time.', accent: '#38bdf8' },
          ].map((item, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.08 }}
              style={{ padding: '1.5rem', borderRadius: '1.25rem', border: `1px solid ${item.accent}25`, background: `${item.accent}08`, textAlign: 'center' }}>
              <div style={{ color: item.accent, marginBottom: '0.75rem', display: 'flex', justifyContent: 'center' }}>{item.icon}</div>
              <div style={{ color: '#fff', fontWeight: 800, marginBottom: '0.4rem', fontSize: '0.9rem' }}>{item.title}</div>
              <div style={{ color: '#94a3b8', fontSize: '0.78rem', lineHeight: 1.6 }}>{item.desc}</div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* TOC + Content */}
      <div style={{ ...c, paddingBottom: '6rem', display: 'grid', gridTemplateColumns: '220px 1fr', gap: '3rem', alignItems: 'start' }}>
        {/* Sticky TOC */}
        <div style={{ position: 'sticky', top: '6rem' }}>
          <div style={{ padding: '1.25rem', borderRadius: '1rem', border: '1px solid rgba(255,255,255,0.07)', background: 'rgba(15,23,42,0.5)' }}>
            <div style={{ color: '#64748b', fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '1rem' }}>Contents</div>
            {TOC.map(item => (
              <a key={item.id} href={`#${item.id}`} style={{ display: 'block', color: '#94a3b8', textDecoration: 'none', fontSize: '0.78rem', padding: '0.35rem 0', borderLeft: '2px solid transparent', paddingLeft: '0.75rem', transition: 'all 0.2s' }}
                onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.color = '#34d399'; (e.currentTarget as HTMLAnchorElement).style.borderLeftColor = '#34d399'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.color = '#94a3b8'; (e.currentTarget as HTMLAnchorElement).style.borderLeftColor = 'transparent'; }}>
                {item.label}
              </a>
            ))}
            <div style={{ marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              <Link to="/terms" style={{ color: '#64748b', fontSize: '0.75rem', textDecoration: 'none' }}>→ Terms of Service</Link>
              <Link to="/refund" style={{ color: '#64748b', fontSize: '0.75rem', textDecoration: 'none' }}>→ Refund Policy</Link>
              <Link to="/cookies" style={{ color: '#64748b', fontSize: '0.75rem', textDecoration: 'none' }}>→ Cookies Policy</Link>
            </div>
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

      <Footer />
    </div>
  );
}
