'use client';

/**
 * SessionTimeoutWarning Modal
 *
 * Displays a warning when user session is about to expire.
 * Allows user to extend session or logout immediately.
 */

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, LogOut, RefreshCw } from 'lucide-react';
import { formatTimeRemaining } from '@/hooks/useSessionTimeout';

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
    if (!isVisible) return null;

    const isUrgent = remainingSeconds <= 60;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                {/* Backdrop */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                />

                {/* Modal */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                    className="relative w-full max-w-md bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden"
                >
                    {/* Urgent warning bar */}
                    {isUrgent && (
                        <div className="bg-red-500/20 border-b border-red-500/50 px-4 py-2">
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
                            >
                                <Clock
                                    className={`w-12 h-12 ${
                                        isUrgent ? 'text-red-400' : 'text-amber-400'
                                    }`}
                                />
                            </div>
                        </div>

                        {/* Title */}
                        <h2 className="text-2xl font-bold text-white text-center mb-2">
                            Session Expiring
                        </h2>

                        {/* Timer */}
                        <div className="text-center mb-6">
                            <div
                                className={`text-5xl font-mono font-bold ${
                                    isUrgent ? 'text-red-400' : 'text-amber-400'
                                }`}
                            >
                                {formatTimeRemaining(remainingSeconds)}
                            </div>
                            <p className="text-slate-400 mt-2">
                                Your session will expire due to inactivity
                            </p>
                        </div>

                        {/* Buttons */}
                        <div className="space-y-3">
                            <button
                                onClick={onExtend}
                                className="w-full py-4 bg-gradient-to-r from-blue-500 to-violet-500 hover:from-blue-400 hover:to-violet-400 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-all active:scale-95"
                            >
                                <RefreshCw className="w-5 h-5" />
                                Stay Logged In
                            </button>

                            <button
                                onClick={onLogout}
                                className="w-full py-3 text-slate-400 hover:text-white text-sm font-medium transition-colors flex items-center justify-center gap-2"
                            >
                                <LogOut className="w-4 h-4" />
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
