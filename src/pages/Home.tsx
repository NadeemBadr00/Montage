import React, { useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, useScroll, useTransform } from 'framer-motion';
import { Zap, Layers, Wand2, Brain, Shield, Cpu, Film, ArrowRight } from 'lucide-react';
import { AnimatedLogo } from '../components/ui/AnimatedLogo';
import { Hero3D } from '../components/ui/Hero3D';
import { useAuth } from '../hooks/useAuth';
import {
  centered, MovingBorderButton, BentoCard, StatCard,
  ShowcaseSection, UserNavButton,
} from './sections/home-components';

/* ─── Main Home ──────────────────────────────────────────────────────── */
export default function Home() {
  const containerRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { userData } = useAuth();
  const { scrollYProgress } = useScroll({ target: containerRef, offset: ['start start', 'end end'] });
  const heroY       = useTransform(scrollYProgress, [0, 0.28], [0, 320]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.22], [1, 0]);
  const contentY    = useTransform(scrollYProgress, [0.1, 0.4], [80, 0]);
  const contentOpacity = useTransform(scrollYProgress, [0.1, 0.35], [0, 1]);

  const claimFreeTrial = () => {
    if (!userData) { navigate('/login'); return; }
    const plan = userData.plan ?? 'free';
    if (plan !== 'free') { navigate('/pricing'); return; }
    const stored  = JSON.parse(localStorage.getItem('p43_user') || '{}');
    localStorage.setItem('p43_user', JSON.stringify({ ...stored, plan: 'ultra', planExpiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000 }));
    localStorage.setItem('ai4m_ultra_promo_seen', '1');
    navigate('/pricing');
    setTimeout(() => window.location.reload(), 80);
  };

  const showPromoBanner = !userData || (userData.plan ?? 'free') === 'free';

  const features = [
    { icon: <Zap size={28} />,    title: 'Edge AI Engine',    desc: 'AI4Montage harnesses your GPU directly in the browser via WebCodecs + WebGPU. Zero server latency, full Hollywood power.', accent: '#22d3ee', image: '/ai4montage_feature.png' },
    { icon: <Brain size={28} />,  title: 'Sandwich AI Mode',  desc: 'Upload once — AI4Montage auto-generates subtitles, B-roll, transitions, and effects in seconds.',                           accent: '#d946ef' },
    { icon: <Layers size={28} />, title: 'Smart Layering',    desc: 'Intelligent multi-track composition. AI4Montage understands context, pacing, and cinematic storytelling.',                   accent: '#818cf8' },
    { icon: <Shield size={28} />, title: '100% Private',      desc: 'Every AI process runs on-device. Your footage never leaves your machine.',                                                    accent: '#34d399' },
    { icon: <Cpu size={28} />,    title: 'Real-Time Preview', desc: 'See AI effects render live as they generate. No queue. No wait.',                                                             accent: '#fb923c' },
    { icon: <Film size={28} />,   title: '4K Export',         desc: 'Frame-perfect 4K export in H.264, H.265, or WebM. Cinema-grade output, browser-speed workflow.',                             accent: '#f472b6' },
  ];

  return (
    <div id="landing-root" dir="ltr" ref={containerRef} style={{ minHeight: '420vh', direction: 'ltr', fontFamily: "'Inter', system-ui, sans-serif", color: '#f1f5f9', position: 'relative' }}>
      <Hero3D />

      {/* ── NAV ── */}
      <nav style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50, padding: '1rem 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(0,0,0,0.7), transparent)', pointerEvents: 'none' }} />
        <Link to="/" style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', gap: '0.75rem', textDecoration: 'none' }}>
          <AnimatedLogo size="sm" />
          <span style={{ fontSize: '1.2rem', fontWeight: 900, color: '#fff', letterSpacing: '-0.04em' }}>AI4Montage</span>
        </Link>
        <div style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
          <a href="#features" style={{ color: '#94a3b8', fontSize: '0.875rem', fontWeight: 600, textDecoration: 'none' }}>Features</a>
          <a href="#about"    style={{ color: '#94a3b8', fontSize: '0.875rem', fontWeight: 600, textDecoration: 'none' }}>About</a>
          <Link to="/pricing" style={{ color: '#c084fc', fontSize: '0.875rem', fontWeight: 700, textDecoration: 'none' }}>Pricing</Link>
          <UserNavButton />
        </div>
      </nav>

      {/* ── HERO (sticky) ── */}
      <section style={{ position: 'sticky', top: 0, height: '100vh', width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: 10, pointerEvents: 'none' }}>
        <motion.div style={{ y: heroY, opacity: heroOpacity, textAlign: 'center', padding: '0 1rem', width: '100%', maxWidth: '72rem', margin: '0 auto' }}>
          <motion.div initial={{ opacity: 0, y: -24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.2 }} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', borderRadius: '99px', border: '1px solid rgba(34,211,238,0.3)', background: 'rgba(34,211,238,0.08)', color: '#22d3ee', fontSize: '0.85rem', fontWeight: 700, marginBottom: '2rem', pointerEvents: 'auto' }}>
            <span style={{ width: '0.5rem', height: '0.5rem', background: '#22d3ee', borderRadius: '50%', animation: 'pulse 2s infinite' }} />
            AI4Montage — Edge AI Video Editor · Beta
          </motion.div>

          <motion.h1 initial={{ opacity: 0, y: 70 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1] }} style={{ fontSize: 'clamp(5rem, 12vw, 11rem)', lineHeight: 0.88, fontWeight: 900, letterSpacing: '-0.04em', textTransform: 'uppercase', textShadow: '0 20px 80px rgba(0,0,0,0.9)', margin: 0 }}>
            <span style={{ color: '#fff', display: 'block' }}>Edit</span>
            <span style={{ display: 'block', background: 'linear-gradient(90deg, #22d3ee, #d946ef, #818cf8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Smarter</span>
          </motion.h1>

          <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1, delay: 0.55 }} style={{ marginTop: '2rem', fontSize: 'clamp(1rem, 2vw, 1.35rem)', color: '#cbd5e1', maxWidth: '40rem', margin: '2rem auto 0', lineHeight: 1.65 }}>
            AI4Montage is the first Edge AI video editor that lives entirely in your browser. No cloud. No limits.
          </motion.p>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1, delay: 0.85 }} style={{ marginTop: '3rem', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1rem', pointerEvents: 'auto' }}>
            <MovingBorderButton to="/startup">Start Creating <Wand2 size={20} style={{ display: 'inline', marginLeft: '0.25rem' }} /></MovingBorderButton>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.3, duration: 0.8 }} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#64748b', fontSize: '0.82rem', fontWeight: 500 }}>
              <span style={{ width: '0.4rem', height: '0.4rem', background: '#34d399', borderRadius: '50%' }} />
              Free plan available · New users get 30-day Ultra trial · No credit card
              <span style={{ width: '0.4rem', height: '0.4rem', background: '#34d399', borderRadius: '50%' }} />
            </motion.div>
          </motion.div>

          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 2.2, duration: 1 }} style={{ position: 'absolute', bottom: '2.5rem', left: '50%', transform: 'translateX(-50%)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', color: '#475569' }}>
            <span style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.15em', fontWeight: 500 }}>Scroll</span>
            <motion.div style={{ width: '1px', height: '2.5rem', background: 'linear-gradient(to bottom, #475569, transparent)', originY: 0 }} animate={{ scaleY: [0, 1, 0] }} transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }} />
          </motion.div>
        </motion.div>
      </section>

      {/* ── SCROLL CONTENT ── */}
      <div style={{ position: 'relative', zIndex: 20, marginTop: '100vh' }}>
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '12rem', background: 'linear-gradient(to bottom, transparent, #020917)', pointerEvents: 'none' }} />
        <div style={{ background: '#020917', paddingTop: '6rem' }}>

          {/* Stats */}
          <motion.section id="about" style={{ ...centered, paddingBottom: '4rem', y: contentY, opacity: contentOpacity }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem' }}>
              <StatCard value="0ms"  label="Cloud Latency"  accent="#22d3ee" />
              <StatCard value="4K"   label="Export Quality" accent="#d946ef" />
              <StatCard value="100%" label="Private & Local" accent="#34d399" />
              <StatCard value="∞"    label="Creative Limit"  accent="#fb923c" />
            </div>
          </motion.section>

          <ShowcaseSection />

          {/* Features */}
          <section id="features" style={{ ...centered, paddingTop: '4rem', paddingBottom: '4rem' }}>
            <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.7 }} style={{ textAlign: 'center', marginBottom: '4rem' }}>
              <span style={{ display: 'inline-block', padding: '0.4rem 1rem', borderRadius: '99px', border: '1px solid rgba(217,70,239,0.3)', background: 'rgba(217,70,239,0.08)', color: '#d946ef', fontSize: '0.8rem', fontWeight: 700, marginBottom: '1.5rem' }}>Built Different</span>
              <h2 style={{ fontSize: 'clamp(2.5rem, 5vw, 4rem)', fontWeight: 900, color: '#fff', letterSpacing: '-0.03em', lineHeight: 1.1 }}>Features that{' '}<span style={{ background: 'linear-gradient(90deg, #22d3ee, #d946ef)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>hit different</span></h2>
            </motion.div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.25rem' }}>
              {features.map((feat, i) => (
                <motion.div key={feat.title} initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5, delay: i * 0.07 }}>
                  <BentoCard {...feat} />
                </motion.div>
              ))}
            </div>
          </section>

          {/* How it works */}
          <section style={{ ...centered, paddingTop: '4rem', paddingBottom: '4rem' }}>
            <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.7 }} style={{ textAlign: 'center', marginBottom: '3.5rem' }}>
              <span style={{ display: 'inline-block', padding: '0.4rem 1rem', borderRadius: '99px', border: '1px solid rgba(34,211,238,0.3)', background: 'rgba(34,211,238,0.08)', color: '#22d3ee', fontSize: '0.8rem', fontWeight: 700, marginBottom: '1.5rem' }}>How it works</span>
              <h2 style={{ fontSize: 'clamp(2rem, 4vw, 3rem)', fontWeight: 900, color: '#fff', letterSpacing: '-0.03em' }}>Three steps to your{' '}<span style={{ background: 'linear-gradient(90deg, #22d3ee, #a855f7)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>next masterpiece</span></h2>
            </motion.div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem', position: 'relative' }}>
              <div style={{ position: 'absolute', top: '2.25rem', left: '20%', right: '20%', height: '1px', background: 'linear-gradient(90deg, rgba(34,211,238,0.3), rgba(168,85,247,0.3))', pointerEvents: 'none' }} />
              {[
                { step: '01', title: 'Drop your footage', desc: 'Import any video, audio, or image directly into the browser. No upload, no waiting.', accent: '#22d3ee', emoji: '📁' },
                { step: '02', title: 'AI does the heavy lifting', desc: 'Let Sandwich AI auto-cut, subtitle, and color-grade your content in seconds.', accent: '#a855f7', emoji: '🤖' },
                { step: '03', title: 'Export cinema-grade', desc: 'Export 4K H.264/H.265 directly from your browser. No render farm needed.', accent: '#ec4899', emoji: '🚀' },
              ].map((s, i) => (
                <motion.div key={i} initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.15 }} style={{ textAlign: 'center', padding: '2.5rem 2rem', borderRadius: '1.5rem', border: '1px solid rgba(255,255,255,0.07)', background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(16px)', position: 'relative' }}>
                  <div style={{ width: '4rem', height: '4rem', borderRadius: '50%', marginLeft: 'auto', marginRight: 'auto', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'center', background: `${s.accent}18`, border: `2px solid ${s.accent}35`, fontSize: '1.5rem' }}>{s.emoji}</div>
                  <div style={{ color: s.accent, fontSize: '0.72rem', fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Step {s.step}</div>
                  <h3 style={{ color: '#fff', fontSize: '1.15rem', fontWeight: 800, marginBottom: '0.75rem', letterSpacing: '-0.02em' }}>{s.title}</h3>
                  <p style={{ color: '#94a3b8', fontSize: '0.875rem', lineHeight: 1.65 }}>{s.desc}</p>
                </motion.div>
              ))}
            </div>
          </section>

          {/* Pricing teaser */}
          {showPromoBanner && (
          <section style={{ ...centered, paddingTop: '2rem', paddingBottom: '4rem' }}>
            <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.7 }} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '2rem', flexWrap: 'wrap', padding: '2.5rem 3rem', borderRadius: '2rem', background: 'linear-gradient(135deg, rgba(168,85,247,0.12), rgba(34,211,238,0.07))', border: '1px solid rgba(168,85,247,0.25)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                <div style={{ fontSize: '3rem' }}>🎁</div>
                <div>
                  <div style={{ color: '#fff', fontWeight: 900, fontSize: '1.3rem', letterSpacing: '-0.02em', marginBottom: '0.35rem' }}>New users get Ultra — <span style={{ background: 'linear-gradient(90deg, #a855f7, #ec4899)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>FREE for 30 days</span></div>
                  <div style={{ color: '#94a3b8', fontSize: '0.9rem' }}>4K export · Unlimited projects · All AI features · No credit card</div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '0.75rem', flexShrink: 0 }}>
                <Link to="/pricing" style={{ padding: '0.75rem 1.5rem', borderRadius: '0.875rem', border: '1px solid rgba(168,85,247,0.35)', color: '#c084fc', fontWeight: 700, fontSize: '0.9rem', textDecoration: 'none' }}>See Plans</Link>
                <button onClick={claimFreeTrial} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.75rem 1.5rem', borderRadius: '0.875rem', background: 'linear-gradient(135deg, #a855f7, #ec4899)', color: '#fff', fontWeight: 700, fontSize: '0.9rem', border: 'none', cursor: 'pointer', fontFamily: "'Inter', system-ui, sans-serif", transition: 'opacity 0.2s, transform 0.15s' }} onMouseEnter={e => { e.currentTarget.style.opacity = '0.88'; e.currentTarget.style.transform = 'translateY(-1px)'; }} onMouseLeave={e => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.transform = 'none'; }}>
                  Claim Free Trial <ArrowRight size={15} />
                </button>
              </div>
            </motion.div>
          </section>
          )}

          {/* Final CTA */}
          <section style={{ ...centered, paddingTop: '4rem', paddingBottom: '7rem' }}>
            <motion.div initial={{ opacity: 0, scale: 0.96 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} transition={{ duration: 0.85, ease: [0.16, 1, 0.3, 1] }} style={{ position: 'relative', textAlign: 'center' }}>
              <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(90deg, rgba(34,211,238,0.15), rgba(168,85,247,0.15), rgba(217,70,239,0.15))', filter: 'blur(80px)', borderRadius: '50%' }} />
              <div style={{ position: 'relative', background: 'rgba(15,23,42,0.65)', backdropFilter: 'blur(32px)', borderRadius: '3rem', border: '1px solid rgba(255,255,255,0.1)', padding: '5rem 4rem' }}>
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '2rem' }}>
                  <motion.div animate={{ rotate: 360 }} transition={{ duration: 20, repeat: Infinity, ease: 'linear' }} style={{ width: '5rem', height: '5rem', borderRadius: '1.25rem', border: '2px solid rgba(34,211,238,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'radial-gradient(circle, rgba(34,211,238,0.12) 0%, transparent 70%)' }}>
                    <AnimatedLogo size="md" />
                  </motion.div>
                </div>
                <h2 style={{ fontSize: 'clamp(2.5rem, 5vw, 4rem)', fontWeight: 900, color: '#fff', letterSpacing: '-0.03em', marginBottom: '1.5rem' }}>Ready to create?</h2>
                <p style={{ color: '#94a3b8', fontSize: '1.15rem', marginBottom: '3rem', maxWidth: '32rem', margin: '0 auto 3rem', lineHeight: 1.65 }}>Join the AI4Montage beta. Drop your first video and experience the next generation of Edge AI editing — right in your browser.</p>
                <MovingBorderButton to="/startup">Launch AI4Montage <Wand2 size={18} style={{ display: 'inline', marginLeft: '0.5rem' }} /></MovingBorderButton>
              </div>
            </motion.div>
          </section>

          {/* Footer */}
          <footer style={{ ...centered, paddingTop: '3rem', paddingBottom: '3rem', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: '2rem', marginBottom: '2.5rem', flexWrap: 'wrap' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.85rem' }}><AnimatedLogo size="sm" /><span style={{ fontWeight: 900, color: '#fff', fontSize: '1.1rem', letterSpacing: '-0.03em' }}>AI4Montage</span></div>
                <p style={{ color: '#475569', fontSize: '0.83rem', lineHeight: 1.7, maxWidth: '220px' }}>The first Edge AI video editor that runs entirely in your browser. No cloud. No limits.</p>
                <p style={{ color: '#334155', fontSize: '0.75rem', marginTop: '1.25rem' }}>© {new Date().getFullYear()} AI4Montage. All rights reserved.</p>
              </div>
              {[
                { label: 'Product', links: [['/', 'Home'], ['/pricing', 'Pricing'], ['/startup', 'Editor'], ['/about', 'About']] },
                { label: 'Legal', links: [['/privacy', 'Privacy Policy'], ['/terms', 'Terms of Service'], ['/cookies', 'Cookies Policy']] },
                { label: 'Connect', links: [['/contact', 'Contact Us'], ['https://github.com/nadeembadr00', 'GitHub'], ['https://x.com/nadeembadr00', 'Twitter / X']] },
              ].map(col => (
                <div key={col.label}>
                  <div style={{ color: '#64748b', fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '1rem' }}>{col.label}</div>
                  {col.links.map(([href, label]) => (
                    <Link key={label} to={href} style={{ display: 'block', color: '#64748b', textDecoration: 'none', fontSize: '0.85rem', marginBottom: '0.6rem', transition: 'color 0.2s' }} onMouseEnter={e => (e.currentTarget.style.color = '#94a3b8')} onMouseLeave={e => (e.currentTarget.style.color = '#64748b')}>{label}</Link>
                  ))}
                </div>
              ))}
            </div>
          </footer>
        </div>
      </div>
    </div>
  );
}
