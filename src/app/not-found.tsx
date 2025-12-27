import Link from 'next/link';
import { GlassCard } from '@/components/ui/GlassCard';
import { Home, Search } from 'lucide-react';

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

                <p className="text-slate-400 mb-8 leading-relaxed">
                    The page you are looking for doesn't exist or has been moved.
                    Please check the URL or navigate back home.
                </p>

                <Link
                    href="/"
                    className="glass-button w-full inline-flex items-center justify-center gap-2 group"
                >
                    <Home className="w-4 h-4 group-hover:scale-110 transition-transform" />
                    Back to Dashboard
                </Link>
            </GlassCard>
        </div>
    );
}
