import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, FileText, Star, Code2, Zap } from 'lucide-react';
import { AnimatedLogo } from '../components/ui/AnimatedLogo';
import { Footer } from '../components/ui/Footer';
import { UserNavButton } from '../components/ui/UserNavButton';

const TOC = [
  { id: 's1',  label: '1. Acceptance of Terms' },
  { id: 's2',  label: '2. Description of Service' },
  { id: 's3',  label: '3. User Accounts' },
  { id: 's4',  label: '4. Acceptable Use' },
  { id: 's5',  label: '5. Intellectual Property' },
  { id: 's6',  label: '6. Beta Disclaimer' },
  { id: 's7',  label: '7. Limitation of Liability' },
  { id: 's8',  label: '8. Termination' },
  { id: 's9',  label: '9. Governing Law' },
  { id: 's10', label: '10. Contact' },
];

const c: React.CSSProperties = {
  maxWidth: '72rem', marginLeft: 'auto', marginRight: 'auto',
  paddingLeft: '1.5rem', paddingRight: '1.5rem', boxSizing: 'border-box',
};

const sections = [
  {
    id: 's1', title: '1. Acceptance of Terms',
    content: `By accessing or using AI4Montage ("the Service"), you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use the Service.\n\nThese Terms apply to all users of AI4Montage, including visitors, registered users, and beta participants. We reserve the right to update these Terms at any time. Continued use after changes constitutes acceptance.`,
  },
  {
    id: 's2', title: '2. Description of Service',
    content: `AI4Montage is a browser-based AI video editor that processes video entirely on your device using WebGPU, WebCodecs, and related browser APIs. The Service is currently in **beta** and is provided free of charge with optional paid tiers.\n\nFeatures may change, be added, or removed at any time during the beta period. We make no guarantees about feature availability or uptime.`,
  },
  {
    id: 's3', title: '3. User Accounts',
    content: `Access to certain features requires authentication via **Google OAuth**. By signing in, you:\n\n• Grant us permission to read your Google profile (name, email, photo)\n• Are responsible for maintaining the security of your account\n• Must be 13 years of age or older to create an account\n• Must not share your account credentials with others\n\nWe reserve the right to suspend or terminate accounts that violate these Terms.`,
  },
  {
    id: 's4', title: '4. Acceptable Use',
    content: `You agree not to use AI4Montage to:\n\n• Process or distribute illegal content, including content that infringes third-party intellectual property rights\n• Attempt to reverse-engineer, decompile, or extract the source code of the Service\n• Abuse, exploit, or circumvent the AI features for harmful purposes\n• Create content that is defamatory, harassing, threatening, or discriminatory\n• Use automated tools to scrape, crawl, or overload the Service\n\nViolation of these rules may result in immediate account termination.`,
  },
  {
    id: 's5', title: '5. Intellectual Property',
    content: `**Your Content:** You retain full ownership of all video files, projects, and creative works you produce using AI4Montage. We claim no rights over your footage or exported content.\n\n**Our Software:** AI4Montage, its name, logo, interface design, and underlying code are the intellectual property of the AI4Montage team. You may not reproduce, copy, or distribute the software without explicit written permission.\n\n**Feedback:** Any feedback or suggestions you provide may be used by us to improve the Service without obligation or compensation.`,
  },
  {
    id: 's6', title: '6. Beta Disclaimer',
    content: `AI4Montage is currently in **beta**. This means:\n\n• The software is provided "as is" without warranties of any kind\n• Features may be incomplete, unstable, or subject to change\n• We may reset or modify plan tiers during the beta period\n• Data loss, although unlikely, is possible during beta\n• Performance may vary significantly across devices and browsers\n\nWe recommend saving exported files externally as a precaution.`,
  },
  {
    id: 's7', title: '7. Limitation of Liability',
    content: `To the maximum extent permitted by applicable law, AI4Montage and its creators shall not be liable for any indirect, incidental, special, consequential, or punitive damages, including but not limited to loss of profits, data, or goodwill, arising from:\n\n• Your use or inability to use the Service\n• Unauthorized access to your data\n• Any bugs, errors, or interruptions in the Service\n\nIn no event shall our total liability exceed the amount you paid for the Service in the 12 months preceding the claim.`,
  },
  {
    id: 's8', title: '8. Termination',
    content: `We reserve the right to suspend or terminate your access to AI4Montage at our sole discretion, without notice, for conduct that we believe:\n\n• Violates these Terms of Service\n• Is harmful to other users, the Service, or third parties\n• Is illegal or creates legal liability for AI4Montage\n\nYou may terminate your account at any time by signing out and clearing your browser data. Termination does not affect any obligations that arose prior to termination.`,
  },
  {
    id: 's9', title: '9. Governing Law',
    content: `These Terms shall be governed by and construed in accordance with applicable law. Any disputes arising from these Terms or your use of AI4Montage shall be resolved through good-faith negotiation first. If negotiation fails, disputes shall be submitted to binding arbitration.\n\nYou waive any right to participate in class-action lawsuits or class-wide arbitration.`,
  },
  {
    id: 's10', title: '10. Contact',
    content: `If you have questions about these Terms of Service, please contact us:\n\n• Email: legal@ai4montage.com\n• General inquiries: contact@ai4montage.com\n\nWe typically respond to legal inquiries within 5 business days.`,
  },
];

function renderContent(text: string) {
  return text.split('\n').map((line, i) => {
    if (line.startsWith('• ')) {
      const parts = line.replace('• ', '').split(/\*\*(.*?)\*\*/g);
      return (
        <div key={i} style={{ display: 'flex', gap: '0.6rem', marginBottom: '0.5rem', alignItems: 'flex-start' }}>
          <span style={{ color: '#f472b6', marginTop: '0.15rem', flexShrink: 0 }}>•</span>
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

export default function Terms() {
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
          <Link to="/privacy" style={{ color: '#94a3b8', textDecoration: 'none', fontSize: '0.875rem', fontWeight: 600 }}>Privacy</Link>
          <UserNavButton />
        </div>
      </nav>

      {/* Hero */}
      <div style={{ ...c, paddingTop: '4rem', paddingBottom: '3rem', textAlign: 'center' }}>
        <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5 }}
          style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '4rem', height: '4rem', borderRadius: '1rem', background: 'rgba(244,114,182,0.1)', border: '1px solid rgba(244,114,182,0.25)', color: '#f472b6', marginBottom: '1.5rem' }}>
          <FileText size={28} />
        </motion.div>
        <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.1 }}
          style={{ fontSize: 'clamp(2.2rem, 5vw, 3.5rem)', fontWeight: 900, letterSpacing: '-0.04em', marginBottom: '0.75rem' }}>
          Terms of Service
        </motion.h1>
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.25 }}
          style={{ color: '#64748b', fontSize: '0.85rem', marginBottom: '0.5rem' }}>Effective: May 27, 2026</motion.p>
      </div>

      {/* Summary cards */}
      <div style={{ ...c, paddingBottom: '3rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
          {[
            { icon: <Zap size={20} />, title: 'Free to use', desc: 'AI4Montage is free with optional paid upgrades. No hidden fees.', accent: '#22d3ee' },
            { icon: <Star size={20} />, title: 'Your content stays yours', desc: 'You own everything you create. We claim no rights over your videos.', accent: '#f472b6' },
            { icon: <Code2 size={20} />, title: 'Beta software', desc: 'We\'re in beta. Features may change. Use at your own discretion.', accent: '#fb923c' },
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
        <div style={{ position: 'sticky', top: '6rem' }}>
          <div style={{ padding: '1.25rem', borderRadius: '1rem', border: '1px solid rgba(255,255,255,0.07)', background: 'rgba(15,23,42,0.5)' }}>
            <div style={{ color: '#64748b', fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '1rem' }}>Contents</div>
            {TOC.map(item => (
              <a key={item.id} href={`#${item.id}`} style={{ display: 'block', color: '#94a3b8', textDecoration: 'none', fontSize: '0.8rem', padding: '0.35rem 0', borderLeft: '2px solid transparent', paddingLeft: '0.75rem', transition: 'all 0.2s' }}
                onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.color = '#f472b6'; (e.currentTarget as HTMLAnchorElement).style.borderLeftColor = '#f472b6'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.color = '#94a3b8'; (e.currentTarget as HTMLAnchorElement).style.borderLeftColor = 'transparent'; }}>
                {item.label}
              </a>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '3rem' }}>
          {sections.map((s, i) => (
            <motion.section key={s.id} id={s.id} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.03 }}>
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
