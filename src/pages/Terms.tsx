import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FileText, Star, Code2, Zap, CreditCard, Scale } from 'lucide-react';
import { AnimatedLogo } from '../components/ui/AnimatedLogo';
import { Footer } from '../components/ui/Footer';
import { UserNavButton } from '../components/ui/UserNavButton';

const LAST_UPDATED = 'June 7, 2026';
const CONTACT_EMAIL = 'support@ai4roadmap.com';
const SITE = 'montage.ai4roadmap.com';

const TOC = [
  { id: 's1',  label: '1. Acceptance of Terms' },
  { id: 's2',  label: '2. Description of Service' },
  { id: 's3',  label: '3. User Accounts' },
  { id: 's4',  label: '4. Subscription Plans & Billing' },
  { id: 's5',  label: '5. Refunds & Cancellation' },
  { id: 's6',  label: '6. Acceptable Use' },
  { id: 's7',  label: '7. Intellectual Property' },
  { id: 's8',  label: '8. AI Features & Data' },
  { id: 's9',  label: '9. Beta Disclaimer' },
  { id: 's10', label: '10. Limitation of Liability' },
  { id: 's11', label: '11. Indemnification' },
  { id: 's12', label: '12. Termination' },
  { id: 's13', label: '13. Governing Law' },
  { id: 's14', label: '14. Changes to Terms' },
  { id: 's15', label: '15. Contact' },
];

const c: React.CSSProperties = {
  maxWidth: '72rem', marginLeft: 'auto', marginRight: 'auto',
  paddingLeft: '1.5rem', paddingRight: '1.5rem', boxSizing: 'border-box',
};

const sections = [
  {
    id: 's1', title: '1. Acceptance of Terms',
    content: `By accessing or using AI4Montage ("the Service") at ${SITE}, you agree to be bound by these Terms of Service ("Terms") and our Privacy Policy.\n\nIf you do not agree to these Terms, do not use the Service. These Terms apply to all users including visitors, registered users, free-tier users, and paying subscribers.\n\nWe reserve the right to update these Terms at any time. We will notify active paying subscribers by email at least 7 days before material changes take effect. Continued use after changes constitutes acceptance of the updated Terms.`,
  },
  {
    id: 's2', title: '2. Description of Service',
    content: `AI4Montage is a browser-based AI video editor that processes video entirely on your device using WebGPU, WebCodecs, and related browser APIs. The Service offers:\n\n• **Free Tier** — Basic editing, 1080p export, up to 30 minutes of video, AI chat assistant\n• **Pro Plan ($5/mo)** — 4K export, unlimited projects, background remover, custom fonts, speed ramp\n• **Ultra Plan ($10/mo)** — Auto Montage AI, AI Auto Captions, Beat Detection, Scene Detection, Version History, all export formats\n\nFeatures, pricing, and plan contents may change. We will provide reasonable notice before removing features from existing paid plans.`,
  },
  {
    id: 's3', title: '3. User Accounts',
    content: `Access to certain features requires authentication via **Google OAuth**. By signing in, you:\n\n• Grant us permission to read your Google profile (name, email, photo URL)\n• Confirm you are at least 13 years of age (16 in the EEA)\n• Accept responsibility for all activity that occurs under your account\n• Must not share your account with others or use it for unauthorized commercial purposes\n\nNew accounts automatically receive a **30-day Ultra plan trial** at no cost. No credit card is required. After 30 days, the account reverts to the Free tier.\n\nWe reserve the right to suspend or terminate accounts that violate these Terms.`,
  },
  {
    id: 's4', title: '4. Subscription Plans & Billing',
    content: `**Plans & Pricing (USD):**\n• Pro — $5/month or $50/year\n• Ultra — $10/month or $100/year\n\n**Pricing in EGP (Egyptian Pounds):**\n• Pro — 250 EGP/month or 2,500 EGP/year\n• Ultra — 500 EGP/month or 5,000 EGP/year\n\n**Billing:**\n• Payments are processed by Paymob (PCI DSS compliant). We never see or store your card details.\n• Subscriptions renew automatically at the end of each billing period unless cancelled.\n• Annual plans are billed upfront for the full year.\n• We reserve the right to change pricing with 30 days' notice to existing subscribers.\n\n**Plan activation:** Your plan is activated immediately upon confirmed payment.`,
  },
  {
    id: 's5', title: '5. Refunds & Cancellation',
    content: `Please refer to our full **Refund Policy** at ${SITE}/refund for complete details.\n\n**Summary:**\n• You may request a full refund within 7 days of payment if AI features were not used\n• Annual plans may qualify for pro-rated refunds within 30 days\n• No refund is issued after 7 days or after AI features have been used\n• Cancel anytime via your /billing page or by emailing ${CONTACT_EMAIL}\n• Monthly cancellations: access continues until end of current billing month\n• We do not issue refunds for forgetting to cancel before renewal\n\nTo request a refund: email ${CONTACT_EMAIL} with your transaction ID (found in /billing).`,
  },
  {
    id: 's6', title: '6. Acceptable Use',
    content: `You agree not to use AI4Montage to:\n\n• Process, distribute, or create illegal content including content that infringes third-party intellectual property rights\n• Attempt to reverse-engineer, decompile, or extract the proprietary source code of the Service\n• Upload or process content that depicts child sexual abuse material (CSAM) — violation will result in immediate termination and reporting to authorities\n• Create content that is defamatory, harassing, threatening, or incites violence\n• Circumvent plan restrictions or feature gating through technical means\n• Use automated tools to scrape, crawl, or overload the Service\n• Resell, sublicense, or white-label the Service without written permission\n\nViolation of these rules may result in immediate account termination without refund.`,
  },
  {
    id: 's7', title: '7. Intellectual Property',
    content: `**Your Content:** You retain full ownership of all video files, audio, images, projects, and creative works you produce using AI4Montage. We claim no rights over your footage or exported content.\n\n**Commercial License:** Pro and Ultra plan subscribers receive a commercial license to use AI4Montage for client work and revenue-generating projects. Free tier users may use the Service for personal, non-commercial projects only.\n\n**Our Software:** AI4Montage, its name, logo, interface design, and underlying code are the intellectual property of the AI4Roadmap team. You may not reproduce, copy, distribute, or create derivative works of our software without explicit written permission.\n\n**Feedback:** Any suggestions or feedback you provide may be used by us to improve the Service without obligation or compensation.`,
  },
  {
    id: 's8', title: '8. AI Features & Data',
    content: `AI4Montage uses Google Gemini AI for certain features. By using these features, you acknowledge:\n\n• **AI Chat & Auto Montage** — Text prompts and project metadata are sent to Gemini API\n• **AI Auto Captions** — Audio clips extracted in your browser are sent to Gemini for transcription\n• **Video files are never sent** — All video processing is local; only audio snippets and text are transmitted\n• **AI outputs are not guaranteed** — Results from AI features may be inaccurate, incomplete, or require editing\n• **You are responsible** for reviewing all AI-generated content (captions, subtitles, edits) before publishing\n\nWe are not liable for inaccuracies in AI-generated outputs. The accuracy of AI features depends on audio quality, language, and other factors outside our control.`,
  },
  {
    id: 's9', title: '9. Beta Disclaimer',
    content: `AI4Montage is an evolving product. Some features may be in beta or experimental state:\n\n• The Service is provided "as is" without warranties of any kind, express or implied\n• Features may be incomplete, unstable, or subject to change without notice\n• We do not guarantee 100% uptime or uninterrupted access\n• Data loss, although unlikely (your videos stay on your device), is theoretically possible during catastrophic browser crashes\n• Performance may vary significantly across devices, browsers, and operating systems\n\nWe recommend exporting your finished projects promptly and keeping local backups.`,
  },
  {
    id: 's10', title: '10. Limitation of Liability',
    content: `To the maximum extent permitted by applicable law, AI4Montage, its creators, officers, and affiliates shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising from:\n\n• Your use or inability to use the Service\n• Loss of data, projects, or exported files\n• Unauthorized access to your account\n• Bugs, errors, or service interruptions\n• Inaccuracies in AI-generated outputs\n\nIn no event shall our total aggregate liability exceed the greater of: (a) $100 USD, or (b) the total amount you paid for the Service in the 12 months preceding the claim.\n\nSome jurisdictions do not allow limitation of liability for certain damages — in such cases, our liability is limited to the maximum extent permitted by law.`,
  },
  {
    id: 's11', title: '11. Indemnification',
    content: `You agree to indemnify, defend, and hold harmless AI4Montage, its team, and affiliates from any claims, damages, losses, liabilities, and expenses (including reasonable legal fees) arising from:\n\n• Your violation of these Terms\n• Content you create, process, or distribute using the Service\n• Your violation of any third-party rights (including intellectual property rights)\n• Your use of the Service in a manner not authorized by these Terms`,
  },
  {
    id: 's12', title: '12. Termination',
    content: `**By you:** You may stop using the Service at any time. To delete your account, contact ${CONTACT_EMAIL}. Account deletion removes your Firestore data within 30 days.\n\n**By us:** We reserve the right to suspend or terminate your access at our sole discretion, without notice, for conduct that:\n• Violates these Terms of Service\n• Is harmful to other users or third parties\n• Creates legal liability for AI4Montage\n• Involves fraudulent chargebacks\n\n**Effect of termination:**\n• Active paid subscriptions will not be refunded except as provided in our Refund Policy\n• Your locally-stored projects and video files remain on your device\n• Obligations that arose before termination (e.g., payment obligations) survive termination`,
  },
  {
    id: 's13', title: '13. Governing Law & Dispute Resolution',
    content: `These Terms are governed by the laws of the **Arab Republic of Egypt**, without regard to conflict of law principles.\n\n**Dispute Resolution:**\n1. **Good Faith Negotiation** — Contact us first at ${CONTACT_EMAIL}. We will try to resolve disputes within 30 days.\n2. **Mediation** — If negotiation fails, disputes shall be submitted to mediation in Cairo, Egypt.\n3. **Arbitration** — If mediation fails, disputes shall be resolved by binding arbitration under Egyptian Arbitration Law No. 27 of 1994.\n\nYou waive any right to participate in class-action lawsuits or class-wide arbitration against AI4Montage.\n\nNotwithstanding the above, either party may seek emergency injunctive relief in any court of competent jurisdiction.`,
  },
  {
    id: 's14', title: '14. Changes to These Terms',
    content: `We may modify these Terms at any time. We will notify active paying subscribers by email at least 7 days before material changes take effect. We will also update the "Last updated" date on this page.\n\nFor changes that are purely administrative or beneficial to users (e.g., clarifications, additional rights), we may implement them immediately.\n\nContinued use of AI4Montage after the effective date of changes constitutes your acceptance of the new Terms.`,
  },
  {
    id: 's15', title: '15. Contact',
    content: `For questions about these Terms, please contact us:\n\n• **Email:** ${CONTACT_EMAIL}\n• **Contact Form:** ${SITE}/contact\n• **Billing & Refunds:** ${SITE}/billing\n• **Refund Policy:** ${SITE}/refund\n\nWe typically respond to legal inquiries within 5 business days (Sunday–Thursday, 9am–6pm EET).`,
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
          <Link to="/refund" style={{ color: '#94a3b8', textDecoration: 'none', fontSize: '0.875rem', fontWeight: 600 }}>Refunds</Link>
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
          style={{ color: '#64748b', fontSize: '0.85rem', marginBottom: '0.5rem' }}>
          Last updated: {LAST_UPDATED} · Effective immediately
        </motion.p>
      </div>

      {/* Summary cards */}
      <div style={{ ...c, paddingBottom: '3rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
          {[
            { icon: <Zap size={20} />,        title: 'Free trial included',  desc: '30 days Ultra free — no credit card required.', accent: '#22d3ee' },
            { icon: <Star size={20} />,        title: 'You own your content', desc: 'Full ownership of everything you create. Commercial license on Pro+.', accent: '#f472b6' },
            { icon: <Code2 size={20} />,       title: 'Local processing',     desc: 'Your videos never leave your device.', accent: '#fb923c' },
            { icon: <CreditCard size={20} />,  title: 'Fair billing',         desc: '7-day refund window. Cancel anytime. No lock-in.', accent: '#34d399' },
            { icon: <Scale size={20} />,       title: 'Egyptian law',         desc: 'Governed by Egyptian law. Disputes via mediation first.', accent: '#a855f7' },
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
        <div style={{ position: 'sticky', top: '6rem' }}>
          <div style={{ padding: '1.25rem', borderRadius: '1rem', border: '1px solid rgba(255,255,255,0.07)', background: 'rgba(15,23,42,0.5)' }}>
            <div style={{ color: '#64748b', fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '1rem' }}>Contents</div>
            {TOC.map(item => (
              <a key={item.id} href={`#${item.id}`} style={{ display: 'block', color: '#94a3b8', textDecoration: 'none', fontSize: '0.78rem', padding: '0.3rem 0', borderLeft: '2px solid transparent', paddingLeft: '0.75rem', transition: 'all 0.2s' }}
                onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.color = '#f472b6'; (e.currentTarget as HTMLAnchorElement).style.borderLeftColor = '#f472b6'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.color = '#94a3b8'; (e.currentTarget as HTMLAnchorElement).style.borderLeftColor = 'transparent'; }}>
                {item.label}
              </a>
            ))}
            <div style={{ marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              <Link to="/privacy" style={{ color: '#64748b', fontSize: '0.75rem', textDecoration: 'none' }}>→ Privacy Policy</Link>
              <Link to="/refund" style={{ color: '#64748b', fontSize: '0.75rem', textDecoration: 'none' }}>→ Refund Policy</Link>
              <Link to="/cookies" style={{ color: '#64748b', fontSize: '0.75rem', textDecoration: 'none' }}>→ Cookies Policy</Link>
            </div>
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

      <Footer />
    </div>
  );
}
