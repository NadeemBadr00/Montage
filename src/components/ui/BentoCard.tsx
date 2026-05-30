import React from 'react';
import { motion } from 'framer-motion';

interface BentoCardProps {
  title: string;
  description: string;
  icon?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
  delay?: number;
}

export function BentoCard({ title, description, icon, children, className = '', delay = 0 }: BentoCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
      whileHover={{ y: -5, scale: 1.02 }}
      className={`relative overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/50 p-6 backdrop-blur-md shadow-2xl group ${className}`}
    >
      {/* Subtle Hover Glow inside card */}
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 via-transparent to-cyan-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      
      <div className="relative z-10 flex flex-col h-full">
        {icon && (
          <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-slate-800/80 text-cyan-400 shadow-inner">
            {icon}
          </div>
        )}
        <h3 className="mb-2 text-xl font-bold text-slate-100">{title}</h3>
        <p className="text-sm text-slate-400 leading-relaxed mb-4">{description}</p>
        
        <div className="mt-auto">
          {children}
        </div>
      </div>
    </motion.div>
  );
}
