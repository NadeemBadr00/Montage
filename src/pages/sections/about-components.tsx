import React, { useState } from 'react';
import { motion } from 'framer-motion';

/* ─── Shared container ─────────────────────────────────────────────── */
export const centered: React.CSSProperties = {
  width: '100%',
  maxWidth: '1152px',
  marginLeft: 'auto',
  marginRight: 'auto',
  paddingLeft: '1.5rem',
  paddingRight: '1.5rem',
  boxSizing: 'border-box',
};

/* ─── Fade-up animation helper ─────────────────────────────────────── */
export const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 40 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true },
  transition: { duration: 0.75, ease: [0.16, 1, 0.3, 1] as const, delay },
});

/* ─── Value Card ────────────────────────────────────────────────────── */
export function ValueCard({
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
export function TechBadge({
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
export function AvatarCard({
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
