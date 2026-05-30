import React, { useEffect } from 'react';
import { motion, useMotionValue, useSpring } from 'framer-motion';

export function DotGridBackground() {
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  
  const springX = useSpring(mouseX, { stiffness: 100, damping: 30 });
  const springY = useSpring(mouseY, { stiffness: 100, damping: 30 });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      mouseX.set(e.clientX);
      mouseY.set(e.clientY);
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [mouseX, mouseY]);

  return (
    <div className="fixed inset-0 z-[-1] overflow-hidden bg-slate-950">
      {/* Dynamic Grid Pattern */}
      <div 
        className="absolute inset-0 opacity-[0.15]"
        style={{
          backgroundImage: 'radial-gradient(circle at center, #94a3b8 1px, transparent 1px)',
          backgroundSize: '24px 24px',
        }}
      />
      
      {/* Ambient Glows */}
      <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(ellipse_at_top,#1e1b4b_0%,transparent_50%)] opacity-60" />
      <div className="absolute bottom-0 right-0 w-full h-full bg-[radial-gradient(ellipse_at_bottom_right,#0f172a_0%,transparent_50%)] opacity-60" />

      {/* Mouse Tracking Spotlight */}
      <motion.div
        className="absolute w-[600px] h-[600px] rounded-full opacity-30 blur-[80px] pointer-events-none"
        style={{
          background: 'radial-gradient(circle, rgba(56,189,248,0.4) 0%, rgba(139,92,246,0.1) 50%, transparent 100%)',
          x: springX,
          y: springY,
          translateX: '-50%',
          translateY: '-50%',
        }}
      />
    </div>
  );
}
