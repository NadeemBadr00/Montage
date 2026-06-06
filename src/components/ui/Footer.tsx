import React from 'react';
import { Link } from 'react-router-dom';
import { AnimatedLogo } from './AnimatedLogo';

const cols = [
  {
    heading: 'Product',
    links: [
      { to: '/',         label: 'Home' },
      { to: '/pricing',  label: 'Pricing' },
      { to: '/startup',  label: 'Editor' },
      { to: '/about',    label: 'About' },
    ],
  },
  {
    heading: 'Legal',
    links: [
      { to: '/privacy', label: 'Privacy Policy' },
      { to: '/terms',   label: 'Terms of Service' },
      { to: '/cookies', label: 'Cookies Policy' },
      { to: '/refund',  label: 'Refund Policy' },
    ],
  },
  {
    heading: 'Connect',
    links: [
      { to: '/contact', label: 'Contact Us' },
      { to: 'https://github.com/nadeembadr00', label: 'GitHub' },
      { to: 'https://x.com/nadeembadr00', label: 'Twitter / X' },
    ],
  },
];

export function Footer() {
  return (
    <footer
      dir="ltr"
      style={{
        width: '100%',
        borderTop: '1px solid rgba(255,255,255,0.06)',
        background: 'rgba(2,9,23,0.95)',
        fontFamily: "'Inter', system-ui, sans-serif",
        direction: 'ltr',
      }}
    >
      <div
        style={{
          maxWidth: '72rem',
          marginLeft: 'auto',
          marginRight: 'auto',
          paddingLeft: '1.5rem',
          paddingRight: '1.5rem',
          paddingTop: '3rem',
          paddingBottom: '2.5rem',
          boxSizing: 'border-box',
        }}
      >
        {/* Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '2fr 1fr 1fr 1fr',
            gap: '2rem',
            marginBottom: '2.5rem',
          }}
        >
          {/* Brand */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.85rem' }}>
              <AnimatedLogo size="sm" />
              <span style={{ fontWeight: 900, color: '#fff', fontSize: '1.1rem', letterSpacing: '-0.03em' }}>
                AI4Montage
              </span>
            </div>
            <p style={{ color: '#475569', fontSize: '0.83rem', lineHeight: 1.7, maxWidth: '220px', margin: 0 }}>
              The first Edge AI video editor that runs entirely in your browser. No cloud. No limits.
            </p>
            <p style={{ color: '#334155', fontSize: '0.75rem', marginTop: '1.25rem', marginBottom: 0 }}>
              © {new Date().getFullYear()} AI4Montage. All rights reserved.
            </p>
          </div>

          {/* Nav columns */}
          {cols.map(col => (
            <div key={col.heading}>
              <div
                style={{
                  color: '#64748b', fontSize: '0.72rem', fontWeight: 700,
                  textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '1rem',
                }}
              >
                {col.heading}
              </div>
              {col.links.map(({ to, label }) => (
                <Link
                  key={label}
                  to={to}
                  style={{
                    display: 'block', color: '#64748b', textDecoration: 'none',
                    fontSize: '0.85rem', marginBottom: '0.6rem', transition: 'color 0.2s',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.color = '#94a3b8')}
                  onMouseLeave={e => (e.currentTarget.style.color = '#64748b')}
                >
                  {label}
                </Link>
              ))}
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div
          style={{
            paddingTop: '1.5rem',
            borderTop: '1px solid rgba(255,255,255,0.04)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '0.75rem',
          }}
        >
          <span style={{ color: '#334155', fontSize: '0.75rem' }}>
            Built with WebGPU · WebCodecs · React · Firebase
          </span>
          <div style={{ display: 'flex', gap: '1.25rem' }}>
            {[
              ['/privacy', 'Privacy'],
              ['/terms',   'Terms'],
              ['/cookies', 'Cookies'],
              ['/refund',  'Refund'],
            ].map(([to, label]) => (
              <Link
                key={label}
                to={to}
                style={{ color: '#334155', textDecoration: 'none', fontSize: '0.75rem', transition: 'color 0.2s' }}
                onMouseEnter={e => (e.currentTarget.style.color = '#64748b')}
                onMouseLeave={e => (e.currentTarget.style.color = '#334155')}
              >
                {label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
