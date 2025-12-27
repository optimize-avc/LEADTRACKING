'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { ShieldCheck, X } from 'lucide-react';
import { GlassCard } from './GlassCard';

export function CookieConsent() {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        const consent = localStorage.getItem('cookie_consent');
        if (!consent) {
            // Small delay for better UX
            const timer = setTimeout(() => setIsVisible(true), 1500);
            return () => clearTimeout(timer);
        }
    }, []);

    const handleAccept = () => {
        localStorage.setItem('cookie_consent', 'accepted');
        setIsVisible(false);
    };

    if (!isVisible) return null;

    return (
        <div className="fixed bottom-6 left-6 right-6 md:left-auto md:right-8 md:max-w-md z-[100] animate-in fade-in slide-in-from-bottom-8 duration-500">
            <GlassCard className="border border-white/10 shadow-2xl p-6 bg-slate-900/90 backdrop-blur-xl">
                <div className="flex items-start gap-4">
                    <div className="p-2 bg-indigo-500/20 rounded-lg shrink-0">
                        <ShieldCheck className="w-6 h-6 text-indigo-400" />
                    </div>
                    <div className="flex-1">
                        <h3 className="text-white font-semibold mb-1">Privacy & Cookies</h3>
                        <p className="text-sm text-slate-400 leading-relaxed mb-4">
                            We use cookies to improve your AI training experience and analyze site traffic. By continuing to use our platform, you agree to our
                            <Link href="/privacy" className="text-indigo-400 hover:underline mx-1">Privacy Policy</Link>
                            and
                            <Link href="/terms" className="text-indigo-400 hover:underline mx-1">Terms</Link>.
                        </p>
                        <div className="flex items-center gap-3">
                            <button
                                onClick={handleAccept}
                                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-medium transition-colors"
                            >
                                Accept All
                            </button>
                            <button
                                onClick={() => setIsVisible(false)}
                                className="px-4 py-2 text-slate-400 hover:text-white text-sm transition-colors"
                            >
                                Not Now
                            </button>
                        </div>
                    </div>
                    <button
                        onClick={() => setIsVisible(false)}
                        className="text-slate-500 hover:text-white transition-colors"
                    >
                        <X size={18} />
                    </button>
                </div>
            </GlassCard>
        </div>
    );
}
