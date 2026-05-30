import React from 'react';
import { motion } from 'framer-motion';

interface GlowButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  variant?: 'primary' | 'ai' | 'outline';
  className?: string;
}

export function GlowButton({ children, variant = 'primary', className = '', ...props }: GlowButtonProps) {
  const getVariantStyles = () => {
    switch (variant) {
      case 'ai':
        return 'from-fuchsia-500 via-cyan-500 to-fuchsia-500';
      case 'outline':
        return 'from-slate-500 via-slate-400 to-slate-500 opacity-50 group-hover:opacity-100';
      default:
        return 'from-blue-500 via-indigo-500 to-blue-500';
    }
  };

  return (
    <div className={`relative group inline-block ${className}`}>
      {/* Animated Glow Backdrop */}
      <div className="absolute -inset-[2px] rounded-xl overflow-hidden blur-[4px] opacity-70 group-hover:opacity-100 transition duration-500">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
          className={`absolute inset-[-100%] bg-[conic-gradient(from_0deg,transparent_0_340deg,white_360deg)] ${getVariantStyles()}`}
        />
      </div>
      
      {/* Solid Border Mask */}
      <div className="absolute -inset-[1px] rounded-xl overflow-hidden">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
          className={`absolute inset-[-100%] bg-[conic-gradient(from_0deg,transparent_0_200deg,white_360deg)] ${getVariantStyles()}`}
        />
      </div>

      {/* Actual Button */}
      <button
        {...props}
        className={`relative z-10 w-full h-full bg-slate-950 rounded-xl px-6 py-3 font-semibold text-white shadow-2xl transition-all duration-300 group-hover:bg-slate-900 group-active:scale-95 flex items-center justify-center gap-2`}
      >
        {children}
      </button>
    </div>
  );
}
