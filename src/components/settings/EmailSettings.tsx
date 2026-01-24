'use client';

import React, { useState, useEffect } from 'react';
import { GlassCard } from '@/components/ui/GlassCard';
import { useAuth } from '@/components/providers/AuthProvider';
import { useCompany } from '@/hooks/useCompany';
import { CompanyService } from '@/lib/firebase/company';
import { toast } from 'sonner';
import { Mail, Send, Key, User, AlertCircle, Check, Loader2 } from 'lucide-react';
import type { EmailConfig } from '@/types/company';

export function EmailSettings() {
    const { user } = useAuth();
    const { company, refetch } = useCompany();
    const [formData, setFormData] = useState<EmailConfig>({
        sendgridApiKey: '',
        fromEmail: '',
        fromName: '',
    });
    const [showApiKey, setShowApiKey] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isTesting, setIsTesting] = useState(false);
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

    // Load existing config
    useEffect(() => {
        if (company?.settings?.emailConfig) {
            setFormData({
                sendgridApiKey: company.settings.emailConfig.sendgridApiKey || '',
                fromEmail: company.settings.emailConfig.fromEmail || '',
                fromName: company.settings.emailConfig.fromName || '',
            });
        }
    }, [company]);

    const handleChange = (field: keyof EmailConfig, value: string) => {
        setFormData((prev) => ({ ...prev, [field]: value }));
        setHasUnsavedChanges(true);
    };

    const handleSave = async () => {
        if (!company?.id) {
            toast.error('Company not found');
            return;
        }

        setIsSaving(true);
        try {
            // Only save non-empty values
            const configToSave: EmailConfig = {};
            if (formData.sendgridApiKey?.trim()) {
                configToSave.sendgridApiKey = formData.sendgridApiKey.trim();
            }
            if (formData.fromEmail?.trim()) {
                configToSave.fromEmail = formData.fromEmail.trim();
            }
            if (formData.fromName?.trim()) {
                configToSave.fromName = formData.fromName.trim();
            }

            await CompanyService.updateEmailConfig(company.id, configToSave);
            toast.success('Email configuration saved');
            setHasUnsavedChanges(false);
            refetch();
        } catch (error) {
            console.error('Failed to save email config:', error);
            toast.error('Failed to save email configuration');
        } finally {
            setIsSaving(false);
        }
    };

    const handleClearConfig = async () => {
        if (!company?.id) return;

        setIsSaving(true);
        try {
            await CompanyService.clearEmailConfig(company.id);
            setFormData({ sendgridApiKey: '', fromEmail: '', fromName: '' });
            toast.success('Email configuration cleared - using platform defaults');
            setHasUnsavedChanges(false);
            refetch();
        } catch (error) {
            console.error('Failed to clear email config:', error);
            toast.error('Failed to clear configuration');
        } finally {
            setIsSaving(false);
        }
    };

    const handleTestEmail = async () => {
        if (!user?.email) {
            toast.error('No email address found for your account');
            return;
        }

        if (!formData.sendgridApiKey && !company?.settings?.emailConfig?.sendgridApiKey) {
            toast.error('Please save a SendGrid API key first');
            return;
        }

        if (hasUnsavedChanges) {
            toast.error('Please save your changes before testing');
            return;
        }

        setIsTesting(true);
        try {
            const response = await fetch('/api/email/test', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    companyId: company?.id,
                    recipientEmail: user.email,
                }),
            });

            const result = await response.json();

            if (result.success) {
                toast.success(`Test email sent to ${user.email}!`, {
                    description: result.usingTenantConfig
                        ? 'Using your custom SendGrid configuration'
                        : 'Using platform default configuration',
                });
            } else {
                toast.error('Failed to send test email', {
                    description: result.error || 'Unknown error',
                });
            }
        } catch (error) {
            console.error('Failed to send test email:', error);
            toast.error('Failed to send test email');
        } finally {
            setIsTesting(false);
        }
    };

    const hasConfig = !!company?.settings?.emailConfig?.sendgridApiKey;

    return (
        <GlassCard className="p-6">
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-violet-500/20">
                        <Mail className="w-5 h-5 text-violet-400" />
                    </div>
                    <div>
                        <h2 className="text-lg font-semibold text-white">Email Integration</h2>
                        <p className="text-sm text-slate-400">
                            Configure your own SendGrid account for branded emails
                        </p>
                    </div>
                </div>
                {hasConfig && (
                    <span className="px-2 py-1 rounded-full bg-green-500/20 text-green-400 text-xs font-medium flex items-center gap-1">
                        <Check className="w-3 h-3" />
                        Configured
                    </span>
                )}
            </div>

            {/* Info Banner */}
            <div className="mb-6 p-4 rounded-lg bg-blue-500/10 border border-blue-500/20">
                <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-blue-400 mt-0.5" />
                    <div className="text-sm text-slate-300">
                        <p className="font-medium text-blue-400 mb-1">
                            Why connect your own SendGrid?
                        </p>
                        <ul className="list-disc list-inside text-slate-400 space-y-1">
                            <li>Send emails from your own domain (better deliverability)</li>
                            <li>Custom branding in invitation emails</li>
                            <li>Your own email sending limits and quota</li>
                        </ul>
                    </div>
                </div>
            </div>

            {/* Form Fields */}
            <div className="space-y-4">
                {/* API Key */}
                <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                        <div className="flex items-center gap-2">
                            <Key className="w-4 h-4" />
                            SendGrid API Key
                        </div>
                    </label>
                    <div className="relative">
                        <input
                            type={showApiKey ? 'text' : 'password'}
                            value={formData.sendgridApiKey}
                            onChange={(e) => handleChange('sendgridApiKey', e.target.value)}
                            placeholder="SG.xxxxxxxx..."
                            className="w-full px-4 py-2 bg-slate-800/50 border border-slate-700 rounded-lg text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent pr-20"
                        />
                        <button
                            type="button"
                            onClick={() => setShowApiKey(!showApiKey)}
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-white px-2 py-1 rounded"
                        >
                            {showApiKey ? 'Hide' : 'Show'}
                        </button>
                    </div>
                    <p className="mt-1 text-xs text-slate-500">
                        Create an API key with &quot;Mail Send&quot; permissions at{' '}
                        <a
                            href="https://app.sendgrid.com/settings/api_keys"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-violet-400 hover:underline"
                        >
                            SendGrid Settings
                        </a>
                    </p>
                </div>

                {/* From Email */}
                <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                        <div className="flex items-center gap-2">
                            <Mail className="w-4 h-4" />
                            From Email (must be verified in SendGrid)
                        </div>
                    </label>
                    <input
                        type="email"
                        value={formData.fromEmail}
                        onChange={(e) => handleChange('fromEmail', e.target.value)}
                        placeholder="notifications@yourcompany.com"
                        className="w-full px-4 py-2 bg-slate-800/50 border border-slate-700 rounded-lg text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                    />
                </div>

                {/* From Name */}
                <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                        <div className="flex items-center gap-2">
                            <User className="w-4 h-4" />
                            Sender Name
                        </div>
                    </label>
                    <input
                        type="text"
                        value={formData.fromName}
                        onChange={(e) => handleChange('fromName', e.target.value)}
                        placeholder={company?.name || 'Your Company Name'}
                        className="w-full px-4 py-2 bg-slate-800/50 border border-slate-700 rounded-lg text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                    />
                </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-between mt-6 pt-6 border-t border-slate-700">
                <div className="flex items-center gap-2">
                    {hasConfig && (
                        <button
                            onClick={handleClearConfig}
                            disabled={isSaving}
                            className="px-4 py-2 text-sm text-slate-400 hover:text-red-400 transition-colors disabled:opacity-50"
                        >
                            Clear & Use Platform Default
                        </button>
                    )}
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={handleTestEmail}
                        disabled={isTesting || hasUnsavedChanges || !hasConfig}
                        className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isTesting ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            <Send className="w-4 h-4" />
                        )}
                        Send Test Email
                    </button>

                    <button
                        onClick={handleSave}
                        disabled={isSaving || !hasUnsavedChanges}
                        className="flex items-center gap-2 px-6 py-2 bg-violet-600 hover:bg-violet-500 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isSaving ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            <Check className="w-4 h-4" />
                        )}
                        Save Configuration
                    </button>
                </div>
            </div>
        </GlassCard>
    );
}
