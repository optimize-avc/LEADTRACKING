'use client';

import React, { useState } from 'react';
import { GlassCard } from '@/components/ui/GlassCard';
import {
    HelpCircle,
    ChevronDown,
    Mail,
    MessageSquare,
    Book,
    ExternalLink,
    Send,
} from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';

// FAQ data
const FAQ_ITEMS = [
    {
        question: 'How do I connect my Discord server?',
        answer: 'Navigate to Settings → Bot Studio and click "Connect Discord". You\'ll be redirected to Discord to authorize the bot for your server. The bot will then sync leads and notifications with your connected channel.',
    },
    {
        question: 'How do I import leads from a CSV file?',
        answer: 'Go to the Leads Pipeline page and click "Export CSV" button in the top right. For importing, you can use the same button which toggles to show import options when you have a CSV file ready.',
    },
    {
        question: 'What are the different subscription tiers?',
        answer: 'SalesTracker offers Free, Pro, and Enterprise tiers. Free includes basic lead tracking. Pro adds AI insights, integrations, and analytics. Enterprise includes team management, SSO, and priority support.',
    },
    {
        question: 'How do I connect Gmail for email tracking?',
        answer: 'Go to Settings and click "Connect Gmail" on the Gmail Integration card. You\'ll authorize SalesTracker to read and send emails on your behalf. All emails to/from leads will be automatically synced.',
    },
    {
        question: 'Can I use SalesTracker on mobile?',
        answer: 'Yes! SalesTracker is fully responsive and works on mobile browsers. You can also receive lead notifications via Discord mobile app if you have the bot connected.',
    },
    {
        question: 'How do I export my data?',
        answer: 'Go to Settings → Account Preferences and scroll to "Export Your Data". You can download your data in JSON, CSV, or PDF format for GDPR compliance.',
    },
    {
        question: 'How do I invite team members?',
        answer: 'Team management is available on Enterprise tier. Go to Settings → Team to invite members by email and assign roles (Admin, Manager, Rep).',
    },
    {
        question: 'What AI features are included?',
        answer: 'SalesTracker uses AI for lead qualification scoring, email draft suggestions, objection handling tips, and sales training simulations. All AI features use Google Gemini.',
    },
];

export default function HelpClient() {
    const [openIndex, setOpenIndex] = useState<number | null>(null);
    const [contactForm, setContactForm] = useState({
        subject: '',
        message: '',
    });
    const [isSending, setIsSending] = useState(false);

    const handleToggleFAQ = (index: number) => {
        setOpenIndex(openIndex === index ? null : index);
    };

    const handleSubmitContact = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!contactForm.subject || !contactForm.message) {
            toast.error('Please fill in all fields');
            return;
        }

        setIsSending(true);
        try {
            // In production, this would send to a support API
            await new Promise((resolve) => setTimeout(resolve, 1000));
            toast.success("Message sent! We'll respond within 24 hours.");
            setContactForm({ subject: '', message: '' });
        } catch (error) {
            console.error('Failed to send message:', error);
            toast.error('Failed to send message. Please try again.');
        } finally {
            setIsSending(false);
        }
    };

    return (
        <div className="p-8 min-h-screen">
            {/* Header */}
            <header className="mb-8 text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 mb-4">
                    <HelpCircle className="w-8 h-8 text-white" />
                </div>
                <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-400">
                    Help & Support
                </h1>
                <p className="text-slate-500 text-sm mt-2 max-w-md mx-auto">
                    Find answers to common questions or contact our support team
                </p>
            </header>

            <div className="max-w-3xl mx-auto space-y-8">
                {/* Quick Links */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <Link href="/privacy" className="group">
                        <GlassCard className="text-center hover:bg-white/5 transition-colors cursor-pointer p-4">
                            <Book className="w-6 h-6 text-blue-400 mx-auto mb-2 group-hover:scale-110 transition-transform" />
                            <div className="text-white text-sm font-medium">Privacy Policy</div>
                        </GlassCard>
                    </Link>
                    <Link href="/terms" className="group">
                        <GlassCard className="text-center hover:bg-white/5 transition-colors cursor-pointer p-4">
                            <Book className="w-6 h-6 text-emerald-400 mx-auto mb-2 group-hover:scale-110 transition-transform" />
                            <div className="text-white text-sm font-medium">Terms of Service</div>
                        </GlassCard>
                    </Link>
                    <a href="mailto:support@salestracker.ai" className="group">
                        <GlassCard className="text-center hover:bg-white/5 transition-colors cursor-pointer p-4">
                            <Mail className="w-6 h-6 text-violet-400 mx-auto mb-2 group-hover:scale-110 transition-transform" />
                            <div className="text-white text-sm font-medium">Email Support</div>
                        </GlassCard>
                    </a>
                </div>

                {/* FAQ Section */}
                <GlassCard>
                    <h2 className="text-xl font-semibold text-white mb-6 flex items-center gap-2">
                        <MessageSquare className="w-5 h-5 text-violet-400" />
                        Frequently Asked Questions
                    </h2>

                    <div className="space-y-2">
                        {FAQ_ITEMS.map((item, index) => (
                            <div
                                key={index}
                                className="border border-white/5 rounded-lg overflow-hidden"
                            >
                                <button
                                    onClick={() => handleToggleFAQ(index)}
                                    className="w-full flex items-center justify-between p-4 text-left hover:bg-white/5 transition-colors"
                                >
                                    <span className="text-white font-medium text-sm">
                                        {item.question}
                                    </span>
                                    <ChevronDown
                                        className={`w-5 h-5 text-slate-400 transition-transform ${
                                            openIndex === index ? 'rotate-180' : ''
                                        }`}
                                    />
                                </button>
                                {openIndex === index && (
                                    <div className="px-4 pb-4 text-slate-400 text-sm leading-relaxed">
                                        {item.answer}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </GlassCard>

                {/* Contact Form */}
                <GlassCard>
                    <h2 className="text-xl font-semibold text-white mb-6 flex items-center gap-2">
                        <Send className="w-5 h-5 text-emerald-400" />
                        Contact Support
                    </h2>

                    <form onSubmit={handleSubmitContact} className="space-y-4">
                        <div>
                            <label className="block text-sm text-slate-400 mb-2">Subject</label>
                            <input
                                type="text"
                                value={contactForm.subject}
                                onChange={(e) =>
                                    setContactForm({ ...contactForm, subject: e.target.value })
                                }
                                placeholder="What do you need help with?"
                                className="w-full bg-slate-800/50 border border-white/10 rounded-lg px-4 py-3 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500"
                            />
                        </div>
                        <div>
                            <label className="block text-sm text-slate-400 mb-2">Message</label>
                            <textarea
                                value={contactForm.message}
                                onChange={(e) =>
                                    setContactForm({ ...contactForm, message: e.target.value })
                                }
                                placeholder="Describe your issue or question in detail..."
                                rows={5}
                                className="w-full bg-slate-800/50 border border-white/10 rounded-lg px-4 py-3 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none"
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={isSending}
                            className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-lg font-medium transition-all disabled:opacity-50"
                        >
                            {isSending ? (
                                'Sending...'
                            ) : (
                                <>
                                    <Send className="w-4 h-4" />
                                    Send Message
                                </>
                            )}
                        </button>
                    </form>

                    <p className="text-xs text-slate-500 mt-4 text-center">
                        We typically respond within 24 hours during business days.
                    </p>
                </GlassCard>
            </div>
        </div>
    );
}
