import React, { useState } from 'react';
import { motion } from 'framer-motion';

interface AnimatedLogoProps {
  src?: string; // optional override
  alt?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

// Use a single static frame — no jarring frame switching
const LOGO_SRC = '/logo_frame_1.png';

export function AnimatedLogo({ src, size = 'md', className = '' }: AnimatedLogoProps) {
  const [isHovering, setIsHovering] = useState(false);

  const sizeMap = {
    sm: 'w-9 h-9',
    md: 'w-11 h-11',
    lg: 'w-16 h-16',
  };

  const logoSrc = src ?? LOGO_SRC;

  return (
    <motion.div
      className={`relative inline-block cursor-pointer flex-shrink-0 ${sizeMap[size]} ${className}`}
      onHoverStart={() => setIsHovering(true)}
      onHoverEnd={() => setIsHovering(false)}
      whileHover={{ scale: 1.12 }}
      transition={{ type: 'spring', stiffness: 320, damping: 22 }}
    >
      {/* Slow cyan pulse glow */}
      <motion.div
        className="absolute inset-0 rounded-xl bg-cyan-400 blur-md -z-10"
        animate={{
          opacity: isHovering ? 0.75 : [0.25, 0.5, 0.25],
          scale:   isHovering ? 1.35 : [1, 1.18, 1],
        }}
        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
      />

      {/* Slower fuchsia secondary glow */}
      <motion.div
        className="absolute inset-0 rounded-xl bg-fuchsia-500 blur-lg -z-10"
        animate={{
          opacity: isHovering ? 0.45 : [0.05, 0.2, 0.05],
        }}
        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
      />

      {/* Static logo image — no frame flipping */}
      <motion.img
        src={logoSrc}
        alt="AI4Montage Logo"
        className={`${sizeMap[size]} object-contain rounded-xl relative z-10 select-none`}
        draggable={false}
        animate={isHovering ? { rotate: [0, -8, 8, 0] } : { rotate: 0 }}
        transition={isHovering ? { duration: 0.5 } : { duration: 0 }}
      />
    </motion.div>
  );
}
