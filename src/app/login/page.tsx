'use client';

import React from 'react';
import { useAuth } from '@/components/providers/AuthProvider';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

export default function LoginPage() {
    const { user, loading, signInWithGoogle } = useAuth();
    const router = useRouter();

    // If already logged in, redirect to dashboard
    React.useEffect(() => {
        if (user && !loading) {
            router.push('/');
        }
    }, [user, loading, router]);

    const handleGoogleSignIn = async () => {
        try {
            await signInWithGoogle();
            toast.success('Signed in successfully!');
            router.push('/');
        } catch (error: unknown) {
            const authError = error as { code?: string; message?: string };
            toast.error(authError.message || "Login failed");
            // Ignore if user closed the popup
            if (authError.code === 'auth/popup-closed-by-user' || authError.message?.includes('closed-by-user')) {
                return;
            }
            console.error('Sign in error:', error);
            toast.error('Failed to sign in. Please try again.');
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-950">
                <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-950 p-4">
            {/* Background Effects */}
            <div className="absolute inset-0 overflow-hidden">
                <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full bg-indigo-500/10 blur-3xl" />
                <div className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full bg-violet-500/10 blur-3xl" />
            </div>

            {/* Login Card */}
            <div className="relative z-10 w-full max-w-md">
                <div className="bg-slate-900/80 backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-2xl">
                    {/* Logo */}
                    <div className="text-center mb-8">
                        <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-violet-400">
                            SalesTracker
                        </h1>
                        <p className="text-slate-400 mt-2">AI-Powered Sales Performance</p>
                    </div>

                    {/* Welcome Message */}
                    <div className="text-center mb-8">
                        <h2 className="text-xl font-semibold text-white mb-2">Welcome Back</h2>
                        <p className="text-slate-400 text-sm">
                            Sign in to access your leads, activities, and AI-powered email tools.
                        </p>
                    </div>

                    {/* Sign In Button */}
                    <button
                        onClick={handleGoogleSignIn}
                        className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-white hover:bg-gray-100 text-gray-800 font-medium rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl group"
                    >
                        {/* Google Logo */}
                        <svg className="w-5 h-5" viewBox="0 0 24 24">
                            <path
                                fill="#4285F4"
                                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                            />
                            <path
                                fill="#34A853"
                                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                            />
                            <path
                                fill="#FBBC05"
                                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                            />
                            <path
                                fill="#EA4335"
                                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                            />
                        </svg>
                        <span>Sign in with Google</span>
                    </button>

                    {/* Demo Mode Notice */}
                    <div className="mt-6 p-4 bg-slate-800/50 border border-slate-700 rounded-lg">
                        <p className="text-sm text-slate-400 text-center">
                            <span className="text-amber-400">💡 Tip:</span> Use your Google account to get started instantly.
                        </p>
                    </div>

                    {/* Features Preview */}
                    <div className="mt-8 pt-6 border-t border-slate-700">
                        <p className="text-xs text-slate-500 text-center mb-4">WHAT YOU&apos;LL GET ACCESS TO</p>
                        <div className="grid grid-cols-2 gap-3">
                            {[
                                { icon: '📊', label: 'Lead Pipeline' },
                                { icon: '✉️', label: 'Gmail Sync' },
                                { icon: '🤖', label: 'AI Emails' },
                                { icon: '📈', label: 'Analytics' },
                            ].map((feature) => (
                                <div
                                    key={feature.label}
                                    className="flex items-center gap-2 p-2 bg-slate-800/30 rounded-lg text-sm text-slate-300"
                                >
                                    <span>{feature.icon}</span>
                                    <span>{feature.label}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <p className="text-center text-slate-600 text-xs mt-6">
                    By signing in, you agree to our Terms of Service
                </p>
            </div>
        </div>
    );
}
