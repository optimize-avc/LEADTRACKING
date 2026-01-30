'use client';

/**
 * SessionTimeoutWarning Modal
 *
 * Displays a warning when user session is about to expire.
 * Allows user to extend session or logout immediately.
 */

import React, { useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, LogOut, RefreshCw } from 'lucide-react';
import { formatTimeRemaining } from '@/hooks/useSessionTimeout';
import { useFocusTrap } from '@/hooks/useFocusTrap';

interface SessionTimeoutWarningProps {
    isVisible: boolean;
    remainingSeconds: number;
    onExtend: () => void;
    onLogout: () => void;
}

export function SessionTimeoutWarning({
    isVisible,
    remainingSeconds,
    onExtend,
    onLogout,
}: SessionTimeoutWarningProps) {
    const { containerRef } = useFocusTrap(isVisible);
    const isUrgent = remainingSeconds <= 60;

    // Handle Escape key - extend session (safer default)
    const handleKeyDown = useCallback(
        (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                onExtend();
            }
        },
        [onExtend]
    );

    useEffect(() => {
        if (isVisible) {
            document.addEventListener('keydown', handleKeyDown);
            document.body.style.overflow = 'hidden';
        }
        return () => {
            document.removeEventListener('keydown', handleKeyDown);
            document.body.style.overflow = '';
        };
    }, [isVisible, handleKeyDown]);

    if (!isVisible) return null;

    return (
        <AnimatePresence>
            <div
                className="fixed inset-0 z-[100] flex items-center justify-center p-4"
                role="alertdialog"
                aria-modal="true"
                aria-labelledby="session-timeout-title"
                aria-describedby="session-timeout-desc"
            >
                {/* Backdrop */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                    aria-hidden="true"
                />

                {/* Modal */}
                <motion.div
                    ref={containerRef}
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                    className="relative w-full max-w-md bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden"
                >
                    {/* Urgent warning bar */}
                    {isUrgent && (
                        <div
                            className="bg-red-500/20 border-b border-red-500/50 px-4 py-2"
                            role="alert"
                        >
                            <p className="text-red-400 text-sm text-center font-medium">
                                ⚠️ Session expiring soon!
                            </p>
                        </div>
                    )}

                    <div className="p-8">
                        {/* Icon */}
                        <div className="flex justify-center mb-6">
                            <div
                                className={`p-4 rounded-2xl ${
                                    isUrgent ? 'bg-red-500/20' : 'bg-amber-500/20'
                                }`}
                                aria-hidden="true"
                            >
                                <Clock
                                    className={`w-12 h-12 ${
                                        isUrgent ? 'text-red-400' : 'text-amber-400'
                                    }`}
                                />
                            </div>
                        </div>

                        {/* Title */}
                        <h2
                            id="session-timeout-title"
                            className="text-2xl font-bold text-white text-center mb-2"
                        >
                            Session Expiring
                        </h2>

                        {/* Timer */}
                        <div className="text-center mb-6">
                            <div
                                className={`text-5xl font-mono font-bold ${
                                    isUrgent ? 'text-red-400' : 'text-amber-400'
                                }`}
                                role="timer"
                                aria-live="polite"
                                aria-label={`Time remaining: ${formatTimeRemaining(remainingSeconds)}`}
                            >
                                {formatTimeRemaining(remainingSeconds)}
                            </div>
                            <p id="session-timeout-desc" className="text-slate-400 mt-2">
                                Your session will expire due to inactivity
                            </p>
                        </div>

                        {/* Buttons */}
                        <div className="space-y-3">
                            <button
                                onClick={onExtend}
                                className="w-full py-4 bg-gradient-to-r from-blue-500 to-violet-500 hover:from-blue-400 hover:to-violet-400 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-all active:scale-95"
                                aria-label="Stay logged in and extend session"
                            >
                                <RefreshCw className="w-5 h-5" aria-hidden="true" />
                                Stay Logged In
                            </button>

                            <button
                                onClick={onLogout}
                                className="w-full py-3 text-slate-400 hover:text-white text-sm font-medium transition-colors flex items-center justify-center gap-2"
                                aria-label="Logout now and end session"
                            >
                                <LogOut className="w-4 h-4" aria-hidden="true" />
                                Logout Now
                            </button>
                        </div>

                        {/* Info text */}
                        <p className="mt-6 text-xs text-slate-500 text-center">
                            For your security, we automatically log out inactive sessions. Any
                            unsaved work will be preserved locally.
                        </p>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}
