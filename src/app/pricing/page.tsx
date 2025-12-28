'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { GlassCard } from '@/components/ui/GlassCard';
import { Check, Zap, Shield, Crown } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { analytics } from '@/lib/analytics';

interface PricingTier {
    name: string;
    price: string;
    description: string;
    features: string[];
    icon: React.ReactNode;
    color: string;
    popular?: boolean;
    buttonText: string;
}

const PRICING_TIERS: PricingTier[] = [
    {
        name: 'Starter',
        price: '$0',
        description: 'Perfect for individual reps mastering their craft.',
        features: [
            'Up to 50 Leads',
            'Basic Pipeline Tracking',
            'Objection Dojo (Standard)',
            'CSV Data Export',
            'Community Support',
        ],
        icon: <Zap className="w-6 h-6 text-blue-400" />,
        color: 'blue',
        buttonText: 'Start for Free',
    },
    {
        name: 'Pro',
        price: '$49',
        description: 'High-performance tools for dedicated closers.',
        features: [
            'Unlimited leads',
            'Advanced AI Deal Wargaming',
            'Objection Dojo (Hard Mode)',
            'Priority Support',
            'Analytics Dashboard Pro',
            'Custom Lead Fields',
        ],
        icon: <Crown className="w-6 h-6 text-amber-400" />,
        color: 'amber',
        popular: true,
        buttonText: 'Go Pro',
    },
    {
        name: 'Venture',
        price: 'Contact',
        description: 'Venture-scale intelligence for enterprise teams.',
        features: [
            'The Boardroom simulation',
            'Reality Link HUD Integration',
            'Team Performance Analytics',
            'Dedicated Success Manager',
            'API Access',
            'Custom AI Fine-tuning',
        ],
        icon: <Shield className="w-6 h-6 text-purple-400" />,
        color: 'purple',
        buttonText: 'Contact Sales',
    },
];

export default function PricingPage() {
    const handlePurchase = (tier: string) => {
        analytics.track('pricing_clicked', { tier });
        // In prod: redirect to /api/stripe/checkout?tier=tier
        alert(`Redirecting to ${tier} checkout... (Stripe Integration Shell Active)`);
    };

    return (
        <div className="p-8 min-h-screen">
            <header className="mb-16 text-center max-w-2xl mx-auto">
                <motion.h1
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-4xl md:text-5xl font-bold text-white mb-6"
                >
                    Professional Plans for{' '}
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-violet-400">
                        High-Stake Closers
                    </span>
                </motion.h1>
                <p className="text-slate-400 text-lg">
                    Scale your sales intelligence with industrial-grade AI and advanced deal
                    wargaming.
                </p>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto mb-20">
                {PRICING_TIERS.map((tier, idx) => (
                    <motion.div
                        key={tier.name}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.1 }}
                    >
                        <GlassCard
                            className={`relative h-full flex flex-col p-8 border-t-4 ${
                                tier.color === 'blue'
                                    ? 'border-t-blue-500'
                                    : tier.color === 'amber'
                                      ? 'border-t-amber-500 shadow-[0_0_20px_rgba(245,158,11,0.1)]'
                                      : 'border-t-purple-500'
                            }`}
                        >
                            {tier.popular && (
                                <div className="absolute top-0 right-8 -translate-y-1/2">
                                    <Badge className="bg-amber-500 text-slate-900 border-none px-4 py-1 text-xs font-bold uppercase tracking-wider">
                                        Most Popular
                                    </Badge>
                                </div>
                            )}

                            <div className="flex items-center gap-3 mb-6">
                                <div className={`p-3 bg-${tier.color}-500/20 rounded-xl`}>
                                    {tier.icon}
                                </div>
                                <h3 className="text-xl font-bold text-white">{tier.name}</h3>
                            </div>

                            <div className="mb-6">
                                <span className="text-4xl font-bold text-white">{tier.price}</span>
                                {tier.price !== 'Contact' && (
                                    <span className="text-slate-500 ml-2">/month</span>
                                )}
                            </div>

                            <p className="text-slate-400 text-sm mb-8">{tier.description}</p>

                            <ul className="space-y-4 mb-10 flex-1">
                                {tier.features.map((feature) => (
                                    <li
                                        key={feature}
                                        className="flex items-start gap-3 text-sm text-slate-300"
                                    >
                                        <div className="p-0.5 bg-indigo-500/20 rounded mt-0.5">
                                            <Check className="w-3.5 h-3.5 text-indigo-400" />
                                        </div>
                                        {feature}
                                    </li>
                                ))}
                            </ul>

                            <button
                                onClick={() => handlePurchase(tier.name)}
                                className={`w-full py-4 rounded-xl font-bold transition-all ${
                                    tier.popular
                                        ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white hover:opacity-90 shadow-lg active:scale-95'
                                        : 'bg-white/5 border border-white/10 text-white hover:bg-white/10 active:scale-95'
                                }`}
                            >
                                {tier.buttonText}
                            </button>
                        </GlassCard>
                    </motion.div>
                ))}
            </div>

            <footer className="text-center text-slate-500 text-sm max-w-xl mx-auto border-t border-white/5 pt-12">
                <p>Enterprise requirements? Custom fine-tuning for your specific industry?</p>
                <a
                    href="mailto:sales@salestracker-ai.com"
                    className="text-indigo-400 hover:underline font-medium mt-2 block"
                >
                    Contact our Enterprise Strategy Team
                </a>
            </footer>
        </div>
    );
}
