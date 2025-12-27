'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import Image from 'next/image';
import {
    LayoutDashboard, Target, Activity, Database, BarChart3, GraduationCap,
    ChevronLeft, ChevronRight, Menu, LogOut, Settings, LogIn
} from 'lucide-react';
import { AuthProvider, useAuth } from '@/components/providers/AuthProvider';
import { QueryProvider } from '@/components/providers/QueryProvider';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import { CookieConsent } from '@/components/ui/CookieConsent';
import { WelcomeTour } from '@/components/onboarding/WelcomeTour';
import { toast, Toaster } from 'sonner';
import { AIContextProvider } from '@/components/providers/AIContext';

function SidebarContent({ collapsed, mobileMenuOpen }: { collapsed: boolean; mobileMenuOpen: boolean }) {
    const { user, loading, logout, signInWithGoogle } = useAuth();
    const router = useRouter();

    const checkUserRole = async (userId: string) => {
        try {
            // This function's implementation seems to be a placeholder or incomplete based on its name.
            // It currently performs a logout operation.
            await logout();
            toast.success('Signed out successfully');
            router.push('/');
        } catch (error: unknown) { // Changed to unknown
            toast.error('Failed to sign out');
        }
    };

    const handleLogout = async () => {
        try {
            await logout();
            toast.success('Signed out successfully');
            router.push('/');
        } catch (error: unknown) { // Changed to unknown
            toast.error('Failed to sign out');
        }
    };

    const handleSignIn = async () => {
        try {
            await signInWithGoogle();
            toast.success('Signed in successfully!');
        } catch (error: unknown) {
            if (error instanceof Error && (error as { code?: string }).code === 'auth/popup-closed-by-user') return;
            toast.error('Failed to sign in');
        }
    };

    const showLabel = !collapsed || mobileMenuOpen;

    return (
        <>
            {/* Navigation */}
            <nav className="flex-1 px-3 space-y-2 mt-4 overflow-y-auto overflow-x-hidden custom-scrollbar">
                <NavLink href="/" icon={<LayoutDashboard size={20} />} label="Dashboard" collapsed={collapsed} mobile={mobileMenuOpen} />
                <NavLink href="/leads" icon={<Target size={20} />} label="Leads Pipeline" collapsed={collapsed} mobile={mobileMenuOpen} />
                <NavLink href="/activities" icon={<Activity size={20} />} label="Activities" collapsed={collapsed} mobile={mobileMenuOpen} />
                <NavLink href="/resources" icon={<Database size={20} />} label="Enablement" collapsed={collapsed} mobile={mobileMenuOpen} />
                <NavLink href="/analytics" icon={<BarChart3 size={20} />} label="Analytics" collapsed={collapsed} mobile={mobileMenuOpen} />
                <NavLink href="/training" icon={<GraduationCap size={20} />} label="Training" collapsed={collapsed} mobile={mobileMenuOpen} />
                <NavLink href="/reality-link" icon={<Activity size={20} />} label="Reality Link HUD" collapsed={collapsed} mobile={mobileMenuOpen} />

                {/* Settings - show only when logged in */}
                {user && (
                    <NavLink href="/settings" icon={<Settings size={20} />} label="Settings" collapsed={collapsed} mobile={mobileMenuOpen} />
                )}
            </nav>

            {/* Footer / User */}
            <div className="p-4 border-t border-white/5 overflow-x-hidden">
                {loading ? (
                    <div className="flex items-center justify-center py-3">
                        <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                    </div>
                ) : user ? (
                    <>
                        {/* User Profile */}
                        <div className={`flex items-center gap-3 mb-3 ${collapsed && !mobileMenuOpen ? 'justify-center' : ''}`}>
                            {user.photoURL ? (
                                <div className="relative w-9 h-9 flex-shrink-0">
                                    <Image
                                        src={user.photoURL}
                                        alt={user.displayName || 'User'}
                                        fill
                                        className="rounded-full border border-white/10 shadow-lg object-cover"
                                    />
                                </div>
                            ) : (
                                <div className="w-9 h-9 flex-shrink-0 rounded-full bg-gradient-to-tr from-indigo-500 to-violet-500 border border-white/10 shadow-lg shadow-indigo-500/20 flex items-center justify-center text-white font-medium text-sm">
                                    {user.displayName?.charAt(0) || user.email?.charAt(0) || '?'}
                                </div>
                            )}
                            {showLabel && (
                                <div className="overflow-hidden flex-1 min-w-0">
                                    <div className="text-sm font-medium text-slate-200 truncate">
                                        {user.displayName || 'User'}
                                    </div>
                                    <div className="text-[10px] text-slate-500 truncate">
                                        {user.email}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Sign Out Button */}
                        <button
                            onClick={handleLogout}
                            className={`w-full flex items-center gap-2 text-sm text-slate-400 hover:text-white hover:bg-white/5 rounded-lg transition-all ${showLabel ? 'px-3 py-2' : 'p-3 justify-center'
                                }`}
                            title={!showLabel ? 'Sign Out' : ''}
                        >
                            <LogOut size={18} />
                            {showLabel && <span>Sign Out</span>}
                        </button>
                    </>
                ) : (
                    /* Sign In Button */
                    <button
                        onClick={handleSignIn}
                        className={`w-full flex items-center gap-2 bg-gradient-to-r from-indigo-500 to-violet-500 hover:from-indigo-600 hover:to-violet-600 text-white font-medium rounded-xl transition-all shadow-lg shadow-indigo-500/25 ${showLabel ? 'px-4 py-3' : 'p-3 justify-center'
                            }`}
                        title={!showLabel ? 'Sign In' : ''}
                    >
                        <LogIn size={18} />
                        {showLabel && <span>Sign In</span>}
                    </button>
                )}
            </div>
        </>
    );
}

export function ClientLayout({ children }: { children: React.ReactNode }) {
    const [collapsed, setCollapsed] = useState(false);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        const timeout = setTimeout(() => {
            setMounted(true);
        }, 0);
        return () => clearTimeout(timeout);
    }, []);

    // Close mobile menu on route change
    const pathname = usePathname();
    useEffect(() => {
        if (mobileMenuOpen) {
            const timeout = setTimeout(() => {
                setMobileMenuOpen(false);
            }, 0);
            return () => clearTimeout(timeout);
        }
    }, [pathname, mobileMenuOpen]);

    // Simple loading state for SSR
    if (!mounted) {
        return (
            <QueryProvider>
                <AuthProvider>
                    <AIContextProvider>
                        <div className="flex min-h-screen">
                            <div className="hidden md:block w-64 bg-slate-900/40 border-r border-white/5 fixed h-full z-50" />
                            <main className="flex-1 md:ml-64 relative z-0">{children}</main>
                        </div>
                        <Toaster position="top-right" theme="dark" closeButton richColors />
                    </AIContextProvider>
                </AuthProvider>
            </QueryProvider>
        );
    }

    return (
        <QueryProvider>
            <AuthProvider>
                <AIContextProvider>
                    {/* Global Dark Background Base (Fix for App Hosting) */}
                    <div className="fixed inset-0 bg-slate-950 z-[-2]" />

                    {/* Background Gradients (Global) */}
                    <div className="fixed inset-0 pointer-events-none z-[-1]">
                        <div className="absolute top-0 left-[15%] w-[500px] h-[500px] bg-blue-500/10 rounded-full blur-[100px]" />
                        <div className="absolute bottom-0 right-[15%] w-[500px] h-[500px] bg-violet-500/10 rounded-full blur-[100px]" />
                    </div>

                    {/* Mobile Menu Overlay */}
                    {mobileMenuOpen && (
                        <div
                            className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-[60] md:hidden animate-fade-in"
                            onClick={() => setMobileMenuOpen(false)}
                        />
                    )}

                    {/* Sidebar */}
                    <aside
                        className={`
                        fixed top-0 bottom-0 z-[70] flex flex-col glass-panel border-r border-white/5 border-t-0 border-b-0 border-l-0 transition-transform duration-300 ease-in-out
                        md:left-0
                        ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
                        ${collapsed ? 'md:w-20' : 'md:w-64'}
                        w-64
                        overflow-hidden md:overflow-visible
                    `}
                    >
                        {/* Header / Logo */}
                        <div className={`p-6 flex items-center ${collapsed ? 'md:justify-center' : 'justify-between'}`}>
                            {(!collapsed || mobileMenuOpen) && (
                                <Link href="/" className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-violet-400 whitespace-nowrap overflow-hidden animate-fade-in">
                                    SalesTracker
                                </Link>
                            )}
                            {collapsed && !mobileMenuOpen && (
                                <Link href="/" className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center font-bold text-white text-xs">
                                    ST
                                </Link>
                            )}
                        </div>

                        {/* Sidebar Content with Auth */}
                        <SidebarContent collapsed={collapsed} mobileMenuOpen={mobileMenuOpen} />

                        {/* Collapse Toggle (Desktop Only) */}
                        <button
                            onClick={() => setCollapsed(!collapsed)}
                            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
                            className="hidden md:flex absolute -right-3 top-24 w-6 h-6 rounded-full bg-slate-800 border border-slate-600 items-center justify-center text-slate-400 hover:text-white hover:border-white/50 transition-all shadow-lg z-50"
                        >
                            {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
                        </button>
                    </aside>

                    {/* Main Content Area */}
                    <main
                        className={`
                        flex-1 relative z-0 transition-all duration-300 ease-in-out min-h-screen flex flex-col
                        ${collapsed ? 'md:ml-20' : 'md:ml-64'}
                        ml-0
                    `}
                    >
                        {/* Mobile Header */}
                        <div className="md:hidden sticky top-0 z-40 bg-slate-900/80 backdrop-blur-md border-b border-white/5 p-4 flex items-center justify-between">
                            <div className="text-lg font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-violet-400">
                                SalesTracker
                            </div>
                            <button
                                onClick={() => setMobileMenuOpen(true)}
                                aria-label="Open mobile menu"
                                className="p-2 text-slate-300 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
                            >
                                <Menu size={24} />
                            </button>
                        </div>

                        <div className="flex-1 w-full max-w-full overflow-x-hidden">
                            <ErrorBoundary>
                                {children}
                            </ErrorBoundary>
                        </div>

                        {/* Professional Footer */}
                        <footer className="mt-auto border-t border-white/5 p-8 text-center md:text-left">
                            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                                <div className="text-sm text-slate-500">
                                    © {new Date().getFullYear()} SalesTracker AI. All rights reserved.
                                </div>
                                <div className="flex items-center gap-6 text-sm">
                                    <Link href="/privacy" className="text-slate-500 hover:text-indigo-400 transition-colors">Privacy Policy</Link>
                                    <Link href="/terms" className="text-slate-500 hover:text-indigo-400 transition-colors">Terms of Service</Link>
                                    <a href="mailto:support@salestracker-ai.com" className="text-slate-500 hover:text-indigo-400 transition-colors">Support</a>
                                </div>
                            </div>
                        </footer>
                    </main>

                    {/* Overlay components */}
                    <CookieConsent />
                    <WelcomeTour />

                    {/* Toast notifications */}
                    <Toaster position="top-right" theme="dark" closeButton richColors />
                </AIContextProvider>
            </AuthProvider>
        </QueryProvider>
    );
}

function NavLink({ href, icon, label, collapsed, mobile }: { href: string; icon: React.ReactNode; label: string; collapsed: boolean, mobile: boolean }) {
    const pathname = usePathname();
    const isActive = pathname === href;

    const showLabel = !collapsed || mobile;

    return (
        <Link
            href={href}
            title={!showLabel ? label : ''}
            aria-label={label}
            className={`
                group flex items-center rounded-xl transition-all duration-300 ease-out relative
                ${!showLabel ? 'justify-center p-3' : 'px-4 py-3'}
                ${isActive
                    ? 'bg-gradient-to-r from-indigo-500/20 to-violet-500/5 text-indigo-300 border-l-2 border-indigo-500 shadow-[0_0_15px_rgba(99,102,241,0.15)]'
                    : 'text-slate-400 hover:text-white hover:bg-white/5 border-l-2 border-transparent'}
            `}
        >
            {/* Active Glow for Icon */}
            {isActive && !showLabel && (
                <div className="absolute inset-0 bg-indigo-500/20 rounded-xl blur-md"></div>
            )}

            <span className={`relative z-10 transition-transform duration-200 ${isActive ? 'scale-110' : 'group-hover:scale-110'}`}>
                {React.cloneElement(icon as React.ReactElement<any>, {
                    className: isActive ? 'text-indigo-400 drop-shadow-[0_0_5px_rgba(99,102,241,0.5)]' : ''
                })}
            </span>

            {showLabel && (
                <span className={`ml-3 text-sm font-medium transition-opacity duration-200 ${isActive ? 'text-white' : ''}`}>
                    {label}
                </span>
            )}

            {/* Tooltip for collapsed state (Desktop only) */}
            {!showLabel && (
                <div className="absolute left-full ml-4 px-2 py-1 bg-slate-800 text-white text-xs rounded border border-white/10 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50 shadow-xl hidden md:block">
                    {label}
                </div>
            )}
        </Link>
    );
}
