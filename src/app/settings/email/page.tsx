'use client';

import React from 'react';
import { EmailSettings } from '@/components/settings/EmailSettings';
import { PermissionGate } from '@/hooks/usePermissions';
import { ArrowLeft, Shield } from 'lucide-react';
import Link from 'next/link';

export default function EmailSettingsPage() {
    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
            <div className="max-w-3xl mx-auto">
                {/* Header */}
                <div className="mb-6">
                    <Link
                        href="/settings"
                        className="inline-flex items-center gap-2 text-slate-400 hover:text-white transition-colors mb-4"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Back to Settings
                    </Link>
                    <h1 className="text-2xl font-bold text-white">Email Integration</h1>
                    <p className="text-slate-400 mt-1">
                        Configure your own SendGrid account for sending team invitations and
                        notifications
                    </p>
                </div>

                {/* Admin-only gate */}
                <PermissionGate
                    permission="canManageIntegrations"
                    fallback={
                        <div className="p-8 text-center bg-slate-800/50 rounded-xl border border-slate-700">
                            <Shield className="w-12 h-12 text-slate-500 mx-auto mb-4" />
                            <h3 className="text-lg font-medium text-white mb-2">
                                Admin Access Required
                            </h3>
                            <p className="text-slate-400">
                                Only team administrators can configure email integration settings.
                            </p>
                        </div>
                    }
                >
                    <EmailSettings />
                </PermissionGate>
            </div>
        </div>
    );
}
