import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { AnimatedLogo } from '../components/ui/AnimatedLogo';
import { Footer } from '../components/ui/Footer';
import { UserNavButton } from '../components/ui/UserNavButton';

/* ─── Shared container ─────────────────────────────────────────────── */
const centered: React.CSSProperties = {
  width: '100%',
  maxWidth: '1152px',
  marginLeft: 'auto',
  marginRight: 'auto',
  paddingLeft: '1.5rem',
  paddingRight: '1.5rem',
  boxSizing: 'border-box',
};

/* ─── Fade-up animation helper ─────────────────────────────────────── */
const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 40 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true },
  transition: { duration: 0.75, ease: [0.16, 1, 0.3, 1] as const, delay },
});

/* ─── Value Card ────────────────────────────────────────────────────── */
function ValueCard({
  emoji,
  title,
  desc,
  accent,
}: {
  emoji: string;
  title: string;
  desc: string;
  accent: string;
}) {
  const [hovered, setHovered] = useState(false);
  return (
    <motion.div
      onHoverStart={() => setHovered(true)}
      onHoverEnd={() => setHovered(false)}
      whileHover={{ y: -8, scale: 1.03 }}
      transition={{ type: 'spring', stiffness: 300, damping: 22 }}
      style={{
        position: 'relative',
        borderRadius: '1.5rem',
        border: `1px solid ${hovered ? accent + '50' : 'rgba(255,255,255,0.07)'}`,
        background: 'linear-gradient(135deg, rgba(15,23,42,0.85), rgba(2,6,23,0.9))',
        backdropFilter: 'blur(20px)',
        padding: '2rem',
        cursor: 'default',
        transition: 'border-color 0.35s',
        overflow: 'hidden',
      }}
    >
      {/* Hover glow */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          borderRadius: '1.5rem',
          background: `radial-gradient(ellipse at 30% 30%, ${accent}18, transparent 65%)`,
          opacity: hovered ? 1 : 0,
          transition: 'opacity 0.4s',
          pointerEvents: 'none',
        }}
      />
      <div style={{ position: 'relative', zIndex: 1 }}>
        <div
          style={{
            fontSize: '2rem',
            marginBottom: '1rem',
            width: '3.5rem',
            height: '3.5rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '0.875rem',
            background: `${accent}15`,
            border: `1px solid ${accent}30`,
          }}
        >
          {emoji}
        </div>
        <h3
          style={{
            fontSize: '1.15rem',
            fontWeight: 800,
            color: '#fff',
            marginBottom: '0.5rem',
            letterSpacing: '-0.02em',
          }}
        >
          {title}
        </h3>
        <p style={{ color: '#94a3b8', fontSize: '0.875rem', lineHeight: 1.65 }}>{desc}</p>
      </div>
    </motion.div>
  );
}

/* ─── Tech Badge ────────────────────────────────────────────────────── */
function TechBadge({
  name,
  desc,
  accent,
  icon,
}: {
  name: string;
  desc: string;
  accent: string;
  icon: string;
}) {
  const [hovered, setHovered] = useState(false);
  return (
    <motion.div
      onHoverStart={() => setHovered(true)}
      onHoverEnd={() => setHovered(false)}
      whileHover={{ scale: 1.05, y: -6 }}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      style={{
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        textAlign: 'center',
        padding: '2.5rem 1.75rem',
        borderRadius: '1.5rem',
        border: `1px solid ${hovered ? accent + '60' : 'rgba(255,255,255,0.08)'}`,
        background: hovered
          ? `linear-gradient(135deg, ${accent}12, rgba(2,9,23,0.9))`
          : 'rgba(15,23,42,0.6)',
        backdropFilter: 'blur(20px)',
        cursor: 'default',
        transition: 'border-color 0.35s, background 0.35s',
        overflow: 'hidden',
        boxShadow: hovered ? `0 8px 32px ${accent}25` : 'none',
      }}
    >
      <div
        style={{
          fontSize: '2.5rem',
          marginBottom: '1.25rem',
          filter: hovered ? `drop-shadow(0 0 12px ${accent}80)` : 'none',
          transition: 'filter 0.35s',
        }}
      >
        {icon}
      </div>
      <div
        style={{
          fontSize: '0.7rem',
          fontWeight: 800,
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          color: accent,
          marginBottom: '0.5rem',
        }}
      >
        {name}
      </div>
      <p style={{ color: '#94a3b8', fontSize: '0.82rem', lineHeight: 1.6 }}>{desc}</p>
    </motion.div>
  );
}

/* ─── Avatar Card ───────────────────────────────────────────────────── */
function AvatarCard({
  initials,
  name,
  role,
  accent,
}: {
  initials: string;
  name: string;
  role: string;
  accent: string;
}) {
  return (
    <motion.div
      whileHover={{ y: -8, scale: 1.03 }}
      transition={{ type: 'spring', stiffness: 280, damping: 22 }}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '3rem 2.5rem',
        borderRadius: '2rem',
        border: '1px solid rgba(255,255,255,0.07)',
        background: 'linear-gradient(135deg, rgba(15,23,42,0.85), rgba(2,6,23,0.9))',
        backdropFilter: 'blur(24px)',
        textAlign: 'center',
        cursor: 'default',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Glow behind avatar */}
      <div
        style={{
          position: 'absolute',
          top: '-3rem',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '12rem',
          height: '12rem',
          borderRadius: '50%',
          background: `${accent}20`,
          filter: 'blur(40px)',
          pointerEvents: 'none',
        }}
      />
      {/* Avatar circle */}
      <motion.div
        animate={{ boxShadow: [`0 0 0px ${accent}00`, `0 0 32px ${accent}60`, `0 0 0px ${accent}00`] }}
        transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut' }}
        style={{
          width: '6rem',
          height: '6rem',
          borderRadius: '50%',
          background: `linear-gradient(135deg, ${accent}40, ${accent}15)`,
          border: `2px solid ${accent}50`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '1.75rem',
          fontWeight: 900,
          color: accent,
          marginBottom: '1.5rem',
          position: 'relative',
          zIndex: 1,
          letterSpacing: '-0.03em',
        }}
      >
        {initials}
      </motion.div>
      <h3
        style={{
          fontSize: '1.25rem',
          fontWeight: 800,
          color: '#fff',
          letterSpacing: '-0.02em',
          marginBottom: '0.35rem',
          position: 'relative',
          zIndex: 1,
        }}
      >
        {name}
      </h3>
      <span
        style={{
          fontSize: '0.8rem',
          fontWeight: 600,
          color: accent,
          position: 'relative',
          zIndex: 1,
          padding: '0.25rem 0.75rem',
          borderRadius: '99px',
          background: `${accent}15`,
          border: `1px solid ${accent}30`,
        }}
      >
        {role}
      </span>
    </motion.div>
  );
}

/* ─── Main About Page ───────────────────────────────────────────────── */
export default function About() {
  return (
    <div
      dir="ltr"
      style={{
        direction: 'ltr',
        fontFamily: "'Inter', system-ui, sans-serif",
        background: '#020917',
        color: '#f1f5f9',
        minHeight: '100vh',
        position: 'relative',
        overflowX: 'hidden',
      }}
    >
      {/* ── Ambient background glows ── */}
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0 }}>
        <div
          style={{
            position: 'absolute',
            top: '-8rem',
            left: '10%',
            width: '36rem',
            height: '36rem',
            borderRadius: '50%',
            background: 'rgba(34,211,238,0.06)',
            filter: 'blur(100px)',
          }}
        />
        <div
          style={{
            position: 'absolute',
            top: '20rem',
            right: '5%',
            width: '28rem',
            height: '28rem',
            borderRadius: '50%',
            background: 'rgba(168,85,247,0.06)',
            filter: 'blur(100px)',
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: '10rem',
            left: '30%',
            width: '32rem',
            height: '32rem',
            borderRadius: '50%',
            background: 'rgba(236,72,153,0.05)',
            filter: 'blur(100px)',
          }}
        />
      </div>

      {/* ══════════════════════════════════════
          NAV
      ══════════════════════════════════════ */}
      <nav
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 100,
          padding: '1rem 1.5rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderBottom: '1px solid rgba(255,255,255,0.05)',
          background: 'rgba(2,9,23,0.75)',
        }}
      >
        <Link
          to="/"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            textDecoration: 'none',
          }}
        >
          <AnimatedLogo size="sm" />
          <span
            style={{
              fontSize: '1.2rem',
              fontWeight: 900,
              color: '#fff',
              letterSpacing: '-0.04em',
            }}
          >
            AI4Montage
          </span>
        </Link>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1.75rem' }}>
          <Link to="/" style={{ color: '#94a3b8', fontSize: '0.875rem', fontWeight: 600, textDecoration: 'none', transition: 'color 0.2s' }}
            onMouseEnter={e => ((e.target as HTMLElement).style.color = '#f1f5f9')}
            onMouseLeave={e => ((e.target as HTMLElement).style.color = '#94a3b8')}>
            Home
          </Link>
          <Link to="/pricing" style={{ color: '#94a3b8', fontSize: '0.875rem', fontWeight: 600, textDecoration: 'none', transition: 'color 0.2s' }}
            onMouseEnter={e => ((e.target as HTMLElement).style.color = '#f1f5f9')}
            onMouseLeave={e => ((e.target as HTMLElement).style.color = '#94a3b8')}>
            Pricing
          </Link>
          <UserNavButton />
        </div>
      </nav>

      {/* Main content */}
      <div style={{ position: 'relative', zIndex: 1 }}>

        {/* ══════════════════════════════════════
            HERO
        ══════════════════════════════════════ */}
        <section
          style={{
            ...centered,
            paddingTop: '10rem',
            paddingBottom: '6rem',
            textAlign: 'center',
          }}
        >
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.4rem 1rem',
              borderRadius: '99px',
              border: '1px solid rgba(34,211,238,0.3)',
              background: 'rgba(34,211,238,0.07)',
              color: '#22d3ee',
              fontSize: '0.78rem',
              fontWeight: 700,
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              marginBottom: '2.5rem',
            }}
          >
            <span
              style={{
                width: '0.45rem',
                height: '0.45rem',
                borderRadius: '50%',
                background: '#22d3ee',
                animation: 'pulse 2s infinite',
              }}
            />
            About AI4Montage
          </motion.div>

          {/* Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
            style={{
              fontSize: 'clamp(2.8rem, 7vw, 5.5rem)',
              fontWeight: 900,
              lineHeight: 1.05,
              letterSpacing: '-0.04em',
              color: '#fff',
              marginBottom: '1.75rem',
              marginLeft: 'auto',
              marginRight: 'auto',
              maxWidth: '900px',
            }}
          >
            We believe AI belongs{' '}
            <span
              style={{
                background: 'linear-gradient(90deg, #22d3ee, #a855f7, #ec4899)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              in your hands.
            </span>
          </motion.h1>

          {/* Subtext */}
          <motion.p
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, delay: 0.3 }}
            style={{
              fontSize: 'clamp(1rem, 2vw, 1.25rem)',
              color: '#94a3b8',
              lineHeight: 1.75,
              maxWidth: '680px',
              marginLeft: 'auto',
              marginRight: 'auto',
            }}
          >
            AI4Montage is built on a simple Edge AI philosophy: the most powerful creative tools
            should run entirely on your device — no cloud dependency, no privacy trade-offs,
            no subscription gates. Just pure, GPU-accelerated intelligence at your fingertips.
          </motion.p>

          {/* Decorative line */}
          <motion.div
            initial={{ opacity: 0, scaleX: 0 }}
            animate={{ opacity: 1, scaleX: 1 }}
            transition={{ duration: 1.2, delay: 0.6, ease: [0.16, 1, 0.3, 1] }}
            style={{
              height: '1px',
              background: 'linear-gradient(90deg, transparent, rgba(34,211,238,0.4), rgba(168,85,247,0.4), transparent)',
              marginLeft: 'auto',
              marginRight: 'auto',
              maxWidth: '400px',
              marginTop: '3rem',
              transformOrigin: 'center',
            }}
          />
        </section>

        {/* ══════════════════════════════════════
            MISSION
        ══════════════════════════════════════ */}
        <section style={{ ...centered, paddingTop: '4rem', paddingBottom: '6rem' }}>
          <motion.div
            {...fadeUp(0)}
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1.4fr',
              gap: '5rem',
              alignItems: 'start',
            }}
          >
            {/* Left */}
            <div>
              <span
                style={{
                  display: 'inline-block',
                  padding: '0.35rem 0.9rem',
                  borderRadius: '99px',
                  border: '1px solid rgba(168,85,247,0.3)',
                  background: 'rgba(168,85,247,0.08)',
                  color: '#a855f7',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  marginBottom: '1.5rem',
                }}
              >
                Our Mission
              </span>
              <h2
                style={{
                  fontSize: 'clamp(2.2rem, 4vw, 3.5rem)',
                  fontWeight: 900,
                  color: '#fff',
                  lineHeight: 1.1,
                  letterSpacing: '-0.04em',
                }}
              >
                Putting the{' '}
                <span
                  style={{
                    background: 'linear-gradient(135deg, #a855f7, #ec4899)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                  }}
                >
                  future of video
                </span>{' '}
                in your browser.
              </h2>

              {/* Decorative accent bar */}
              <div
                style={{
                  marginTop: '2rem',
                  height: '3px',
                  width: '4rem',
                  borderRadius: '99px',
                  background: 'linear-gradient(90deg, #a855f7, #ec4899)',
                }}
              />
            </div>

            {/* Right — 3 paragraphs */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem', paddingTop: '0.5rem' }}>
              <motion.p {...fadeUp(0.1)} style={{ color: '#cbd5e1', lineHeight: 1.8, fontSize: '1rem' }}>
                <strong style={{ color: '#fff', fontWeight: 700 }}>Privacy-first AI editing</strong> means
                your footage never leaves your machine. Every cut, every effect, every subtitle — computed
                locally on your GPU using WebGPU and WebAssembly. We believe your creative work is yours
                alone, and our architecture reflects that conviction at every layer.
              </motion.p>
              <motion.p {...fadeUp(0.2)} style={{ color: '#cbd5e1', lineHeight: 1.8, fontSize: '1rem' }}>
                <strong style={{ color: '#fff', fontWeight: 700 }}>Zero cloud dependency</strong> isn't a
                limitation — it's a superpower. AI4Montage works fully offline, eliminating upload queues,
                server downtime, and bandwidth bottlenecks. The only thing standing between you and a finished
                video is your creativity, not a loading spinner.
              </motion.p>
              <motion.p {...fadeUp(0.3)} style={{ color: '#cbd5e1', lineHeight: 1.8, fontSize: '1rem' }}>
                <strong style={{ color: '#fff', fontWeight: 700 }}>Democratizing professional video</strong>{' '}
                is our north star. Hollywood-grade tooling used to require expensive hardware, software
                licenses, and years of expertise. AI4Montage collapses that gap — anyone with a modern browser
                can now produce cinema-quality content, from their first video to their hundredth.
              </motion.p>
            </div>
          </motion.div>
        </section>

        {/* ══════════════════════════════════════
            VALUES
        ══════════════════════════════════════ */}
        <section
          style={{
            paddingTop: '5rem',
            paddingBottom: '5rem',
            background: 'linear-gradient(180deg, transparent, rgba(168,85,247,0.04), transparent)',
          }}
        >
          <div style={centered}>
            <motion.div
              {...fadeUp(0)}
              style={{ textAlign: 'center', marginBottom: '4rem' }}
            >
              <span
                style={{
                  display: 'inline-block',
                  padding: '0.35rem 0.9rem',
                  borderRadius: '99px',
                  border: '1px solid rgba(52,211,153,0.3)',
                  background: 'rgba(52,211,153,0.07)',
                  color: '#34d399',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  marginBottom: '1.25rem',
                }}
              >
                What We Stand For
              </span>
              <h2
                style={{
                  fontSize: 'clamp(2rem, 4vw, 3rem)',
                  fontWeight: 900,
                  color: '#fff',
                  letterSpacing: '-0.03em',
                  lineHeight: 1.1,
                }}
              >
                Our{' '}
                <span
                  style={{
                    background: 'linear-gradient(90deg, #34d399, #22d3ee)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                  }}
                >
                  core values
                </span>
              </h2>
            </motion.div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(4, 1fr)',
                gap: '1.25rem',
              }}
            >
              {[
                {
                  emoji: '🔒',
                  title: 'Privacy First',
                  desc: 'Your footage never touches a server. Full stop.',
                  accent: '#34d399',
                  delay: 0,
                },
                {
                  emoji: '⚡',
                  title: 'Speed',
                  desc: 'GPU-accelerated AI that renders at 60fps in real-time.',
                  accent: '#22d3ee',
                  delay: 0.08,
                },
                {
                  emoji: '🌐',
                  title: 'Open Web',
                  desc: 'Built on open standards — WebGPU, WebCodecs, WASM.',
                  accent: '#a855f7',
                  delay: 0.16,
                },
                {
                  emoji: '🎨',
                  title: 'Creator First',
                  desc: 'Every feature is designed around the creator\'s workflow.',
                  accent: '#ec4899',
                  delay: 0.24,
                },
              ].map((v, i) => (
                <motion.div key={i} {...fadeUp(v.delay)}>
                  <ValueCard {...v} />
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════
            TECH STACK
        ══════════════════════════════════════ */}
        <section style={{ ...centered, paddingTop: '5rem', paddingBottom: '5rem' }}>
          <motion.div {...fadeUp(0)} style={{ textAlign: 'center', marginBottom: '4rem' }}>
            <span
              style={{
                display: 'inline-block',
                padding: '0.35rem 0.9rem',
                borderRadius: '99px',
                border: '1px solid rgba(34,211,238,0.3)',
                background: 'rgba(34,211,238,0.07)',
                color: '#22d3ee',
                fontSize: '0.75rem',
                fontWeight: 700,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                marginBottom: '1.25rem',
              }}
            >
              Under the Hood
            </span>
            <h2
              style={{
                fontSize: 'clamp(2rem, 4vw, 3rem)',
                fontWeight: 900,
                color: '#fff',
                letterSpacing: '-0.03em',
                lineHeight: 1.1,
                marginBottom: '1rem',
              }}
            >
              Built on cutting-edge{' '}
              <span
                style={{
                  background: 'linear-gradient(90deg, #22d3ee, #a855f7)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}
              >
                open standards
              </span>
            </h2>
            <p style={{ color: '#64748b', fontSize: '0.95rem', maxWidth: '500px', marginLeft: 'auto', marginRight: 'auto' }}>
              No proprietary black boxes. AI4Montage is powered by the modern browser's full capabilities.
            </p>
          </motion.div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: '1.25rem',
            }}
          >
            {[
              {
                name: 'WebGPU',
                icon: '🖥️',
                desc: 'Harnesses your GPU natively for AI inference and real-time rendering at 60fps.',
                accent: '#22d3ee',
                delay: 0,
              },
              {
                name: 'WebCodecs',
                icon: '🎞️',
                desc: 'Low-level video encoding and decoding — frame-perfect and hardware-accelerated.',
                accent: '#a855f7',
                delay: 0.08,
              },
              {
                name: 'WebAssembly',
                icon: '⚙️',
                desc: 'Near-native performance for complex AI models compiled directly to your browser.',
                accent: '#ec4899',
                delay: 0.16,
              },
              {
                name: 'WebRTC',
                icon: '📡',
                desc: 'Peer-to-peer collaboration and live preview streaming without a media server.',
                accent: '#34d399',
                delay: 0.24,
              },
            ].map((tech, i) => (
              <motion.div key={i} {...fadeUp(tech.delay)}>
                <TechBadge {...tech} />
              </motion.div>
            ))}
          </div>
        </section>

        {/* ══════════════════════════════════════
            TEAM
        ══════════════════════════════════════ */}
        <section
          style={{
            paddingTop: '5rem',
            paddingBottom: '5rem',
            background: 'linear-gradient(180deg, transparent, rgba(34,211,238,0.03), transparent)',
          }}
        >
          <div style={centered}>
            <motion.div
              {...fadeUp(0)}
              style={{ textAlign: 'center', marginBottom: '4rem' }}
            >
              <span
                style={{
                  display: 'inline-block',
                  padding: '0.35rem 0.9rem',
                  borderRadius: '99px',
                  border: '1px solid rgba(236,72,153,0.3)',
                  background: 'rgba(236,72,153,0.07)',
                  color: '#ec4899',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  marginBottom: '1.25rem',
                }}
              >
                The People
              </span>
              <h2
                style={{
                  fontSize: 'clamp(2rem, 4vw, 3rem)',
                  fontWeight: 900,
                  color: '#fff',
                  letterSpacing: '-0.03em',
                  lineHeight: 1.1,
                  marginBottom: '1rem',
                }}
              >
                A small team with a{' '}
                <span
                  style={{
                    background: 'linear-gradient(90deg, #ec4899, #a855f7)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                  }}
                >
                  big vision
                </span>
              </h2>
              <p style={{ color: '#64748b', fontSize: '0.95rem', maxWidth: '480px', marginLeft: 'auto', marginRight: 'auto' }}>
                A passionate group of engineers and creators building the future of video editing,
                one browser API at a time.
              </p>
            </motion.div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: '1.5rem',
                maxWidth: '640px',
                marginLeft: 'auto',
                marginRight: 'auto',
              }}
            >
              <motion.div {...fadeUp(0)}>
                <AvatarCard
                  initials="NB"
                  name="Nadeem"
                  role="Founder & Lead Engineer"
                  accent="#22d3ee"
                />
              </motion.div>
              <motion.div {...fadeUp(0.1)}>
                <AvatarCard
                  initials="AI"
                  name="AI4Montage Team"
                  role="Core Contributors"
                  accent="#a855f7"
                />
              </motion.div>
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════
            CTA
        ══════════════════════════════════════ */}
        <section style={{ ...centered, paddingTop: '5rem', paddingBottom: '7rem' }}>
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
            style={{
              position: 'relative',
              borderRadius: '2.5rem',
              overflow: 'hidden',
              padding: '5rem 3rem',
              textAlign: 'center',
              border: '1px solid rgba(255,255,255,0.08)',
              background: 'linear-gradient(135deg, rgba(34,211,238,0.06), rgba(15,23,42,0.9), rgba(168,85,247,0.06))',
              backdropFilter: 'blur(32px)',
            }}
          >
            {/* Glow orbs */}
            <div
              style={{
                position: 'absolute',
                top: '-6rem',
                left: '20%',
                width: '20rem',
                height: '20rem',
                borderRadius: '50%',
                background: 'rgba(34,211,238,0.12)',
                filter: 'blur(80px)',
                pointerEvents: 'none',
              }}
            />
            <div
              style={{
                position: 'absolute',
                bottom: '-6rem',
                right: '20%',
                width: '20rem',
                height: '20rem',
                borderRadius: '50%',
                background: 'rgba(168,85,247,0.12)',
                filter: 'blur(80px)',
                pointerEvents: 'none',
              }}
            />

            <div style={{ position: 'relative', zIndex: 1 }}>
              {/* Logo */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'center',
                  marginBottom: '2rem',
                }}
              >
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
                  style={{
                    width: '5rem',
                    height: '5rem',
                    borderRadius: '1.25rem',
                    border: '2px solid rgba(34,211,238,0.35)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: 'radial-gradient(circle, rgba(34,211,238,0.1) 0%, transparent 70%)',
                  }}
                >
                  <AnimatedLogo size="md" />
                </motion.div>
              </div>

              <h2
                style={{
                  fontSize: 'clamp(2rem, 5vw, 3.5rem)',
                  fontWeight: 900,
                  color: '#fff',
                  letterSpacing: '-0.04em',
                  lineHeight: 1.1,
                  marginBottom: '1.25rem',
                }}
              >
                Ready to be part of{' '}
                <span
                  style={{
                    background: 'linear-gradient(90deg, #22d3ee, #a855f7, #ec4899)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                  }}
                >
                  the future?
                </span>
              </h2>

              <p
                style={{
                  color: '#94a3b8',
                  fontSize: '1.05rem',
                  lineHeight: 1.7,
                  maxWidth: '520px',
                  marginLeft: 'auto',
                  marginRight: 'auto',
                  marginBottom: '2.75rem',
                }}
              >
                Join the AI4Montage beta. Experience professional video editing powered by Edge AI —
                all in your browser, all on your device.
              </p>

              {/* CTA Button */}
              <Link
                to="/login"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.6rem',
                  padding: '1rem 2.75rem',
                  borderRadius: '1rem',
                  background: 'linear-gradient(135deg, #22d3ee, #a855f7)',
                  color: '#fff',
                  fontWeight: 800,
                  fontSize: '1.05rem',
                  textDecoration: 'none',
                  letterSpacing: '-0.01em',
                  boxShadow: '0 8px 32px rgba(34,211,238,0.3)',
                  transition: 'transform 0.2s, box-shadow 0.2s',
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px) scale(1.03)';
                  (e.currentTarget as HTMLElement).style.boxShadow = '0 16px 48px rgba(34,211,238,0.45)';
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLElement).style.transform = 'none';
                  (e.currentTarget as HTMLElement).style.boxShadow = '0 8px 32px rgba(34,211,238,0.3)';
                }}
              >
                <span>🚀</span> Join the Beta
              </Link>

              <p
                style={{
                  color: '#475569',
                  fontSize: '0.78rem',
                  marginTop: '1.25rem',
                  fontWeight: 500,
                }}
              >
                No credit card required · Free to start · Works offline
              </p>
            </div>
          </motion.div>
        </section>

        {/* FOOTER */}
        <Footer />
      </div>
    </div>
  );
}
