import React from 'react';
import { GlassCard } from '@/components/ui/GlassCard';

export const metadata = {
    title: 'Terms of Service',
    description: 'Rules and guidelines for using the SalesTracker AI platform.',
};

export default function TermsPage() {
    const lastUpdated = new Date().toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
    });

    return (
        <div className="p-8 max-w-4xl mx-auto min-h-screen">
            <header className="mb-12 text-center">
                <h1 className="text-4xl font-bold text-white mb-4">Terms of Service</h1>
                <p className="text-slate-500">Last Updated: {lastUpdated}</p>
            </header>

            <GlassCard className="prose prose-invert max-w-none">
                <section className="mb-8">
                    <h2 className="text-xl font-semibold text-violet-400 mb-4">
                        1. Acceptance of Terms
                    </h2>
                    <p className="text-slate-300 leading-relaxed">
                        By accessing or using SalesTracker AI, you agree to be bound by these Terms
                        of Service. If you do not agree, you may not access our services.
                    </p>
                </section>

                <section className="mb-8 border-t border-white/5 pt-8">
                    <h2 className="text-xl font-semibold text-violet-400 mb-4">
                        2. Use of Service
                    </h2>
                    <p className="text-slate-300 leading-relaxed">
                        You agree to use our AI-powered features responsibly. You are responsible
                        for all activities that occur under your account. We reserve the right to
                        suspend accounts that violate these terms.
                    </p>
                </section>

                <section className="mb-8 border-t border-white/5 pt-8">
                    <h2 className="text-xl font-semibold text-violet-400 mb-4">
                        3. Intellectual Property
                    </h2>
                    <p className="text-slate-300 leading-relaxed">
                        The platform, including its original content, AI models, and simulation
                        logic, is and remains the exclusive property of SalesTracker AI. Your use of
                        the service does not grant you ownership of any intellectual property.
                    </p>
                </section>

                <section className="mb-8 border-t border-white/5 pt-8">
                    <h2 className="text-xl font-semibold text-violet-400 mb-4">
                        4. Limitation of Liability
                    </h2>
                    <p className="text-slate-300 leading-relaxed">
                        SalesTracker AI is an enablement tool. We are not liable for any business
                        outcomes, lost deals, or data inaccuracies arising from the use of our
                        platform. All AI-generated content should be reviewed by qualified
                        professionals.
                    </p>
                </section>

                <section className="mb-8 border-t border-white/5 pt-8">
                    <h2 className="text-xl font-semibold text-violet-400 mb-4">
                        5. Subscription & Billing
                    </h2>
                    <p className="text-slate-300 leading-relaxed">
                        Paid subscriptions are billed on a recurring basis. You may cancel at any
                        time via the billing portal. Refunds are handled on a case-by-case basis
                        according to our refund policy.
                    </p>
                </section>

                <footer className="mt-12 text-sm text-slate-500 italic">
                    By using this service, you acknowledge that you have read and understood these
                    terms.
                </footer>
            </GlassCard>
        </div>
    );
}
