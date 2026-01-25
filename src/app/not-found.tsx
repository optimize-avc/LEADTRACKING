'use client';

import Link from 'next/link';
import { GlassCard } from '@/components/ui/GlassCard';
import { Home, Search, ArrowLeft } from 'lucide-react';

export default function NotFound() {
    return (
        <div className="p-8 min-h-screen flex items-center justify-center">
            <GlassCard className="max-w-md text-center">
                <div className="flex justify-center mb-6">
                    <div className="p-4 bg-slate-800/50 rounded-full border border-white/5">
                        <Search className="w-10 h-10 text-violet-400" />
                    </div>
                </div>

                <h2 className="text-3xl font-bold text-white mb-2">Page Not Found</h2>
                <div className="text-violet-400 font-medium mb-4">Error 404</div>

                <p className="text-slate-400 mb-8 max-w-md mx-auto">
                    We couldn&apos;t find the page you&apos;re looking for. It might have been moved
                    or deleted. Please check the URL or navigate back home.
                </p>

                <div className="flex flex-col sm:flex-row gap-3">
                    <Link
                        href="/"
                        className="glass-button flex-1 inline-flex items-center justify-center gap-2 group"
                    >
                        <Home className="w-4 h-4 group-hover:scale-110 transition-transform" />
                        Dashboard
                    </Link>
                    <button
                        onClick={() => typeof window !== 'undefined' && window.history.back()}
                        className="flex-1 px-4 py-2 bg-white/5 hover:bg-white/10 text-white rounded-lg font-medium border border-white/10 transition-colors inline-flex items-center justify-center gap-2"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Go Back
                    </button>
                </div>

                {/* Quick Links */}
                <div className="mt-6 pt-6 border-t border-white/10">
                    <p className="text-slate-500 text-sm mb-3">Quick Links</p>
                    <div className="flex flex-wrap justify-center gap-3 text-sm">
                        <Link
                            href="/leads"
                            className="text-slate-400 hover:text-violet-400 transition-colors"
                        >
                            Leads
                        </Link>
                        <span className="text-slate-700">•</span>
                        <Link
                            href="/pricing"
                            className="text-slate-400 hover:text-violet-400 transition-colors"
                        >
                            Pricing
                        </Link>
                        <span className="text-slate-700">•</span>
                        <Link
                            href="/settings"
                            className="text-slate-400 hover:text-violet-400 transition-colors"
                        >
                            Settings
                        </Link>
                        <span className="text-slate-700">•</span>
                        <Link
                            href="/help"
                            className="text-slate-400 hover:text-violet-400 transition-colors"
                        >
                            Help
                        </Link>
                    </div>
                </div>
            </GlassCard>
        </div>
    );
}
