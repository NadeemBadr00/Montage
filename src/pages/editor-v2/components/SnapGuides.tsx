// Phase 22: Snap Guide Lines — vertical yellow lines that appear when a clip snaps to something
import React, { useEffect, useState } from 'react';

interface SnapGuide {
  x: number;
  label: string;
}

export default function SnapGuides() {
  const [guides, setGuides] = useState<SnapGuide[]>([]);

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      setGuides(detail?.guides || []);
      // Auto-clear after 800ms
      setTimeout(() => setGuides([]), 800);
    };
    window.addEventListener('snap-guide', handler);
    return () => window.removeEventListener('snap-guide', handler);
  }, []);

  if (guides.length === 0) return null;

  return (
    <div className="absolute inset-0 pointer-events-none z-[90]">
      {guides.map((g, i) => (
        <div
          key={i}
          className="absolute top-0 bottom-0 w-px"
          style={{
            left: `${g.x}px`,
            background: 'linear-gradient(to bottom, transparent, #fbbf24 20%, #fbbf24 80%, transparent)',
            boxShadow: '0 0 6px 1px rgba(251,191,36,0.8)',
            animation: 'snapGuideFlash 0.8s ease-out forwards',
          }}
          title={g.label}
        />
      ))}
    </div>
  );
}
