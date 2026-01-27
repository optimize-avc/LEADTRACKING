/**
 * UpgradePrompt Component
 * 
 * Displays when a user hits a plan limit.
 * Offers upgrade options with clear value proposition.
 * 
 * Best practice 2026: Non-intrusive upgrade prompts
 */

'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, Zap, X, ArrowRight } from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { usePlanLimits } from '@/hooks/usePlanLimits';
import type { PlanLimits } from '@/lib/plans';

interface UpgradePromptProps {
  /** The limit type that was reached */
  limitType: keyof PlanLimits;
  /** Optional custom message */
  message?: string;
  /** Variant style */
  variant?: 'inline' | 'modal' | 'banner';
  /** Close handler for dismissible variants */
  onClose?: () => void;
  /** Custom className */
  className?: string;
}

export function UpgradePrompt({
  limitType,
  message,
  variant = 'inline',
  onClose,
  className = '',
}: UpgradePromptProps) {
  const { tier, getUpgradeMessage, formatLimit, limits } = usePlanLimits();
  
  const upgradeMessage = message || getUpgradeMessage(limitType);
  const currentLimit = typeof limits[limitType] === 'number' 
    ? formatLimit(limits[limitType] as number)
    : limits[limitType] ? 'Enabled' : 'Disabled';

  if (tier === 'enterprise') {
    // Enterprise users don't see upgrade prompts
    return null;
  }

  const handleUpgradeClick = () => {
    window.location.href = '/pricing';
  };

  // Inline variant - subtle hint
  if (variant === 'inline') {
    return (
      <div className={`flex items-center gap-2 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg ${className}`}>
        <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0" />
        <span className="text-sm text-amber-300">{upgradeMessage}</span>
        <button
          onClick={handleUpgradeClick}
          className="ml-auto text-sm text-amber-400 hover:text-amber-300 font-medium flex items-center gap-1"
        >
          Upgrade <ArrowRight className="w-3 h-3" />
        </button>
      </div>
    );
  }

  // Banner variant - top of page
  if (variant === 'banner') {
    return (
      <AnimatePresence>
        <motion.div
          initial={{ y: -50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -50, opacity: 0 }}
          className={`fixed top-0 left-0 right-0 z-50 bg-gradient-to-r from-amber-600 to-orange-600 text-white py-2 px-4 ${className}`}
        >
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Zap className="w-5 h-5" />
              <span className="text-sm font-medium">{upgradeMessage}</span>
              <span className="text-xs bg-white/20 px-2 py-0.5 rounded">
                Current limit: {currentLimit}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleUpgradeClick}
                className="text-sm bg-white text-amber-600 px-4 py-1 rounded-full font-medium hover:bg-amber-50 transition-colors"
              >
                Upgrade Now
              </button>
              {onClose && (
                <button
                  onClick={onClose}
                  className="p-1 hover:bg-white/20 rounded"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    );
  }

  // Modal variant - blocking dialog
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
        >
          <GlassCard className={`max-w-md w-full p-6 ${className}`}>
            <div className="text-center">
              <div className="w-16 h-16 bg-amber-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Zap className="w-8 h-8 text-amber-400" />
              </div>
              
              <h3 className="text-xl font-bold text-white mb-2">
                You&apos;ve reached your limit
              </h3>
              
              <p className="text-slate-400 mb-4">
                {upgradeMessage}
              </p>
              
              <div className="bg-slate-800/50 rounded-lg p-3 mb-6">
                <p className="text-sm text-slate-300">
                  Current plan limit: <span className="font-medium text-white">{currentLimit}</span>
                </p>
              </div>
              
              <div className="flex flex-col gap-3">
                <button
                  onClick={handleUpgradeClick}
                  className="w-full py-3 bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-xl font-medium hover:opacity-90 transition-opacity"
                >
                  View Upgrade Options
                </button>
                
                {onClose && (
                  <button
                    onClick={onClose}
                    className="w-full py-3 bg-white/5 border border-white/10 text-slate-300 rounded-xl font-medium hover:bg-white/10 transition-colors"
                  >
                    Maybe Later
                  </button>
                )}
              </div>
            </div>
          </GlassCard>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

/**
 * Hook to check if upgrade prompt should show
 */
export function useUpgradePrompt(limitType: keyof PlanLimits) {
  const { isLimitReached, tier, getUpgradeMessage } = usePlanLimits();
  
  return {
    shouldShow: isLimitReached(limitType) && tier !== 'enterprise',
    message: getUpgradeMessage(limitType),
    tier,
  };
}
