import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { usePlan } from '../../../hooks/usePlan';

/**
 * Shows a slim banner at the top of the editor for free/expired users.
 * Disappears for Pro/Ultra users.
 */
export function PlanBanner() {
  const { plan, isFree, daysLeft } = usePlan();
  const [dismissed, setDismissed] = useState(false);

  // Don't show for paying users
  if (!isFree && (daysLeft === null || daysLeft > 3)) return null;
  if (dismissed) return null;

  const isExpired = plan === 'free' && daysLeft === 0;
  const isAboutToExpire = daysLeft !== null && daysLeft > 0 && daysLeft <= 3;

  let message = '';
  let bgClass = '';
  let ctaText = '';

  if (isExpired) {
    message = 'انتهت تجربتك المجانية. بعض الميزات محدودة.';
    bgClass = 'from-red-900/40 to-red-800/20 border-red-700/40 text-red-300';
    ctaText = 'ترقية الآن';
  } else if (isAboutToExpire) {
    message = `تجربتك Ultra تنتهي خلال ${daysLeft} ${daysLeft === 1 ? 'يوم' : 'أيام'}!`;
    bgClass = 'from-amber-900/40 to-amber-800/20 border-amber-700/40 text-amber-300';
    ctaText = 'اشترك الآن';
  } else {
    // Free plan from the start
    message = 'أنت على الخطة المجانية. بعض الميزات تتطلب Pro أو Ultra.';
    bgClass = 'from-blue-900/30 to-blue-800/10 border-blue-700/30 text-blue-300';
    ctaText = 'عرض الخطط';
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ height: 0, opacity: 0 }}
        animate={{ height: 'auto', opacity: 1 }}
        exit={{ height: 0, opacity: 0 }}
        className={`flex-shrink-0 bg-gradient-to-r ${bgClass} border-b flex items-center justify-between px-4 py-1.5 text-[11px] font-medium`}
      >
        <div className="flex items-center gap-2">
          <i className={`fa-solid ${isExpired ? 'fa-lock' : 'fa-triangle-exclamation'} text-[10px]`}></i>
          <span>{message}</span>
        </div>
        <div className="flex items-center gap-2">
          <Link
            to="/pricing"
            className="bg-white/10 hover:bg-white/20 border border-white/20 rounded px-2 py-0.5 text-white font-bold text-[10px] transition-colors no-underline"
          >
            {ctaText} →
          </Link>
          <button
            onClick={() => setDismissed(true)}
            className="text-white/40 hover:text-white/80 transition-colors"
          >
            <i className="fa-solid fa-xmark text-[10px]"></i>
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
