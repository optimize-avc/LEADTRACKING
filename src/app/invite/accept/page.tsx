/**
 * Invite Accept Page
 *
 * Handles the flow when a user clicks an invite link from their email:
 * 1. Validates the invite token
 * 2. Shows company info and role
 * 3. If logged in - accepts the invite
 * 4. If not logged in - prompts sign in, then accepts
 */

'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import {
    Building2,
    Users,
    Shield,
    Crown,
    User,
    Check,
    X,
    Loader2,
    AlertTriangle,
    LogIn,
} from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { useAuth } from '@/components/providers/AuthProvider';
import { toast } from 'sonner';

interface InviteDetails {
    email: string;
    role: 'admin' | 'manager' | 'rep';
    companyName: string;
    invitedByName: string;
    expiresAt: number;
}

const ROLE_CONFIG = {
    admin: {
        label: 'Admin',
        icon: Crown,
        color: 'text-amber-400',
        description: 'Full access to all features',
    },
    manager: {
        label: 'Manager',
        icon: Shield,
        color: 'text-blue-400',
        description: 'View analytics and manage leads',
    },
    rep: {
        label: 'Sales Rep',
        icon: User,
        color: 'text-slate-400',
        description: 'Manage your own leads',
    },
};

function InviteAcceptContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { user, profile, loading: authLoading, signInWithGoogle, refreshProfile } = useAuth();

    const companyId = searchParams.get('company');
    const inviteId = searchParams.get('invite');

    const [invite, setInvite] = useState<InviteDetails | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isAccepting, setIsAccepting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isExpired, setIsExpired] = useState(false);

    // Fetch invite details
    useEffect(() => {
        if (!companyId || !inviteId) {
            setError('Invalid invite link');
            setIsLoading(false);
            return;
        }

        fetchInvite();
    }, [companyId, inviteId]);

    const fetchInvite = async () => {
        try {
            const response = await fetch(
                `/api/team/invite?company=${companyId}&invite=${inviteId}`
            );
            const data = await response.json();

            if (!response.ok) {
                if (data.expired) {
                    setIsExpired(true);
                }
                throw new Error(data.error || 'Failed to load invitation');
            }

            setInvite(data.invite);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load invitation');
        } finally {
            setIsLoading(false);
        }
    };

    const handleSignIn = async () => {
        try {
            await signInWithGoogle();
            toast.success('Signed in! You can now accept the invitation.');
        } catch (err) {
            toast.error('Failed to sign in');
        }
    };

    const handleAccept = async () => {
        if (!user || !companyId || !inviteId) return;

        setIsAccepting(true);
        try {
            const token = await user.getIdToken();
            const response = await fetch('/api/team/accept', {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    companyId,
                    inviteId,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to accept invitation');
            }

            // Refresh profile to get new companyId
            await refreshProfile();

            toast.success(`Welcome to ${invite?.companyName}!`);
            router.push('/');
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Failed to accept invitation');
        } finally {
            setIsAccepting(false);
        }
    };

    const handleDecline = () => {
        router.push('/');
    };

    // Loading state
    if (isLoading || authLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-950">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                    <p className="text-slate-500 text-sm">Loading invitation...</p>
                </div>
            </div>
        );
    }

    // Error state
    if (error) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-950 p-4">
                <GlassCard className="max-w-md text-center">
                    <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                        {isExpired ? (
                            <AlertTriangle className="w-8 h-8 text-amber-400" />
                        ) : (
                            <X className="w-8 h-8 text-red-400" />
                        )}
                    </div>
                    <h2 className="text-xl font-bold text-white mb-2">
                        {isExpired ? 'Invitation Expired' : 'Invalid Invitation'}
                    </h2>
                    <p className="text-slate-400 mb-6">
                        {isExpired
                            ? 'This invitation has expired. Please ask your team admin to send a new one.'
                            : error}
                    </p>
                    <button
                        onClick={() => router.push('/')}
                        className="px-6 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
                    >
                        Go to Dashboard
                    </button>
                </GlassCard>
            </div>
        );
    }

    if (!invite) {
        return null;
    }

    const roleConfig = ROLE_CONFIG[invite.role];
    const RoleIcon = roleConfig.icon;

    // Check if user is already in a company
    const alreadyInCompany = profile?.companyId;

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-950 p-4">
            {/* Background Effects */}
            <div className="absolute inset-0 overflow-hidden">
                <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full bg-indigo-500/10 blur-3xl" />
                <div className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full bg-violet-500/10 blur-3xl" />
            </div>

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="relative z-10 w-full max-w-md"
            >
                <GlassCard className="p-8">
                    {/* Header */}
                    <div className="text-center mb-8">
                        <div className="w-20 h-20 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-indigo-500/25">
                            <Building2 className="w-10 h-10 text-white" />
                        </div>
                        <h1 className="text-2xl font-bold text-white mb-2">You&apos;re Invited!</h1>
                        <p className="text-slate-400">
                            <strong className="text-white">{invite.invitedByName}</strong> invited
                            you to join
                        </p>
                        <p className="text-xl font-semibold text-indigo-400 mt-1">
                            {invite.companyName}
                        </p>
                    </div>

                    {/* Role Badge */}
                    <div className="flex items-center justify-center gap-3 p-4 bg-slate-800/50 rounded-xl mb-6">
                        <div
                            className={`w-10 h-10 rounded-lg bg-slate-700 flex items-center justify-center ${roleConfig.color}`}
                        >
                            <RoleIcon className="w-5 h-5" />
                        </div>
                        <div>
                            <div className={`font-semibold ${roleConfig.color}`}>
                                {roleConfig.label}
                            </div>
                            <div className="text-xs text-slate-500">{roleConfig.description}</div>
                        </div>
                    </div>

                    {/* Invited Email */}
                    <div className="text-center text-sm text-slate-500 mb-6">
                        Invitation sent to: <span className="text-slate-300">{invite.email}</span>
                    </div>

                    {/* Actions */}
                    {!user ? (
                        // Not logged in - show sign in
                        <div className="space-y-4">
                            <p className="text-sm text-slate-400 text-center">
                                Sign in with Google to accept this invitation
                            </p>
                            <button
                                onClick={handleSignIn}
                                className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-white hover:bg-slate-100 text-slate-900 rounded-lg font-medium transition-colors"
                            >
                                <LogIn className="w-4 h-4" />
                                Sign in with Google
                            </button>
                        </div>
                    ) : alreadyInCompany ? (
                        // Already in a company
                        <div className="space-y-4">
                            <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                                <p className="text-sm text-amber-400">
                                    You&apos;re already a member of another organization. Accepting
                                    this invitation will switch you to the new company.
                                </p>
                            </div>
                            <div className="flex gap-3">
                                <button
                                    onClick={handleDecline}
                                    className="flex-1 px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-medium transition-colors"
                                >
                                    Decline
                                </button>
                                <button
                                    onClick={handleAccept}
                                    disabled={isAccepting}
                                    className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-600 to-violet-600 hover:opacity-90 text-white rounded-lg font-medium transition-all disabled:opacity-50"
                                >
                                    {isAccepting ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                        <Check className="w-4 h-4" />
                                    )}
                                    Accept & Switch
                                </button>
                            </div>
                        </div>
                    ) : (
                        // Ready to accept
                        <div className="flex gap-3">
                            <button
                                onClick={handleDecline}
                                className="flex-1 px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-medium transition-colors"
                            >
                                Decline
                            </button>
                            <button
                                onClick={handleAccept}
                                disabled={isAccepting}
                                className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-600 to-violet-600 hover:opacity-90 text-white rounded-lg font-medium transition-all disabled:opacity-50"
                            >
                                {isAccepting ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                    <Check className="w-4 h-4" />
                                )}
                                Accept Invitation
                            </button>
                        </div>
                    )}

                    {/* Signed in as */}
                    {user && (
                        <div className="mt-6 pt-4 border-t border-slate-700 text-center">
                            <p className="text-xs text-slate-500">
                                Signed in as <span className="text-slate-400">{user.email}</span>
                            </p>
                        </div>
                    )}
                </GlassCard>
            </motion.div>
        </div>
    );
}

export default function InviteAcceptPage() {
    return (
        <Suspense
            fallback={
                <div className="min-h-screen flex items-center justify-center bg-slate-950">
                    <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                </div>
            }
        >
            <InviteAcceptContent />
        </Suspense>
    );
}
