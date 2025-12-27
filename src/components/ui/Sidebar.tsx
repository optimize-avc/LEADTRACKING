'use client';

import Link from 'next/link';
import React, { useState } from 'react';
import { useAuth } from '@/components/providers/AuthProvider';
import { LogIn, LogOut, Settings, User } from 'lucide-react';

export function Sidebar() {
    const { user, loading, signInWithGoogle, logout } = useAuth();
    const [isLoggingIn, setIsLoggingIn] = useState(false);

    const handleLogin = async () => {
        setIsLoggingIn(true);
        try {
            await signInWithGoogle();
        } catch (error) {
            console.error('Login failed:', error);
        } finally {
            setIsLoggingIn(false);
        }
    };

    const handleLogout = async () => {
        try {
            await logout();
        } catch (error) {
            console.error('Logout failed:', error);
        }
    };

    return (
        <aside
            className="w-64 glass-panel h-screen p-6 flex flex-col z-50 rounded-none border-l-0 border-t-0 border-b-0"
            style={{ position: 'fixed', left: 0, top: 0, width: '16rem', height: '100vh' }}
        >
            <div className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-400 mb-10 pl-2">
                SalesTracker
            </div>
            <nav className="flex-1 space-y-2">
                <NavLink href="/">Dashboard</NavLink>
                <NavLink href="/leads">Leads Pipeline</NavLink>
                <NavLink href="/activities">Activities</NavLink>
                <NavLink href="/resources">Enablement & Resources</NavLink>
                <NavLink href="/analytics">Analytics</NavLink>
                <NavLink href="/training">Training</NavLink>

                <div className="pt-4 mt-4 border-t border-slate-700/30">
                    <NavLink href="/settings">
                        <span className="flex items-center gap-2">
                            <Settings className="w-4 h-4" />
                            Settings
                        </span>
                    </NavLink>
                </div>
            </nav>

            {/* Auth Section */}
            <div className="pt-6 border-t border-slate-700/50">
                {loading ? (
                    <div className="flex items-center gap-3 pl-2">
                        <div className="w-10 h-10 rounded-full bg-slate-700 animate-pulse" />
                        <div className="flex-1">
                            <div className="h-4 bg-slate-700 rounded animate-pulse w-20 mb-1" />
                            <div className="h-3 bg-slate-700 rounded animate-pulse w-16" />
                        </div>
                    </div>
                ) : user ? (
                    <div className="space-y-3">
                        <div className="flex items-center gap-3 pl-2">
                            {user.photoURL ? (
                                <img
                                    src={user.photoURL}
                                    alt="Profile"
                                    className="w-10 h-10 rounded-full border border-white/10"
                                />
                            ) : (
                                <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-blue-500 to-purple-500 border border-white/10 flex items-center justify-center">
                                    <User className="w-5 h-5 text-white" />
                                </div>
                            )}
                            <div className="text-sm flex-1 min-w-0">
                                <div className="text-white font-medium truncate">
                                    {user.displayName || 'User'}
                                </div>
                                <div className="text-slate-500 text-xs truncate">
                                    {user.email}
                                </div>
                            </div>
                        </div>
                        <button
                            onClick={handleLogout}
                            className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm text-slate-400 hover:text-white hover:bg-red-500/20 rounded-lg transition-colors"
                        >
                            <LogOut className="w-4 h-4" />
                            Sign Out
                        </button>
                    </div>
                ) : (
                    <button
                        onClick={handleLogin}
                        disabled={isLoggingIn}
                        className="w-full flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 rounded-lg transition-all disabled:opacity-50"
                    >
                        <LogIn className="w-4 h-4" />
                        {isLoggingIn ? 'Signing in...' : 'Sign in with Google'}
                    </button>
                )}
            </div>
        </aside>
    );
}

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
    return (
        <Link
            href={href}
            className="block px-4 py-3 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-all text-sm font-medium hover:pl-5"
        >
            {children}
        </Link>
    );
}
