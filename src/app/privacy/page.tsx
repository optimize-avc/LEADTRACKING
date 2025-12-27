import React from 'react';
import { GlassCard } from '@/components/ui/GlassCard';

export const metadata = {
    title: 'Privacy Policy',
    description: 'Our commitment to protecting your data and privacy.',
};

export default function PrivacyPage() {
    const lastUpdated = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

    return (
        <div className="p-8 max-w-4xl mx-auto min-h-screen">
            <header className="mb-12 text-center">
                <h1 className="text-4xl font-bold text-white mb-4">Privacy Policy</h1>
                <p className="text-slate-500">Last Updated: {lastUpdated}</p>
            </header>

            <GlassCard className="prose prose-invert max-w-none">
                <section className="mb-8">
                    <h2 className="text-xl font-semibold text-blue-400 mb-4">1. Introduction</h2>
                    <p className="text-slate-300 leading-relaxed">
                        SalesTracker AI (&ldquo;we,&rdquo; &ldquo;our,&rdquo; or &ldquo;us&rdquo;) is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our web application.
                    </p>
                </section>

                <section className="mb-8 border-t border-white/5 pt-8">
                    <h2 className="text-xl font-semibold text-blue-400 mb-4">2. Information Collection</h2>
                    <p className="text-slate-300 leading-relaxed">
                        We collect information that you provide directly to us when you create an account, update your profile, or use our features. This may include:
                    </p>
                    <ul className="list-disc list-inside text-slate-400 mt-2 space-y-1">
                        <li>Contact information (Name, Email, Phone)</li>
                        <li>Professional information (Company, Industry, Lead data)</li>
                        <li>Usage data and interactions with AI features</li>
                    </ul>
                </section>

                <section className="mb-8 border-t border-white/5 pt-8">
                    <h2 className="text-xl font-semibold text-blue-400 mb-4">3. Use of Information</h2>
                    <p className="text-slate-300 leading-relaxed">
                        We use the information we collect to:
                    </p>
                    <ul className="list-disc list-inside text-slate-400 mt-2 space-y-1">
                        <li>Provide and maintain our AI-powered sales tools</li>
                        <li>Personalize your training and simulation experiences</li>
                        <li>Process transactions and manage billing</li>
                        <li>Analyze usage trends to improve our services</li>
                    </ul>
                </section>

                <section className="mb-8 border-t border-white/5 pt-8">
                    <h2 className="text-xl font-semibold text-blue-400 mb-4">4. Data Security</h2>
                    <p className="text-slate-300 leading-relaxed">
                        We implement industrial-standard security measures including TLS 1.3 encryption and secure server-side processing to protect your data. However, no method of transmission over the internet is 100% secure.
                    </p>
                </section>

                <section className="mb-8 border-t border-white/5 pt-8">
                    <h2 className="text-xl font-semibold text-blue-400 mb-4">5. Your Rights</h2>
                    <p className="text-slate-300 leading-relaxed">
                        Depending on your location, you may have rights regarding your personal data, including the right to access, correct, or delete your information. Contact us to exercise these rights.
                    </p>
                </section>

                <footer className="mt-12 text-sm text-slate-500 italic">
                    For privacy-related inquiries, please contact privacy@salestracker-ai.com
                </footer>
            </GlassCard>
        </div>
    );
}
