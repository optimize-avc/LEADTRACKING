'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Image from 'next/image';
import React, { useState, useEffect } from 'react';
import { useAuth } from '../providers/AuthProvider';
import {
    Menu,
    X,
    ChevronRight,
    LogOut,
    LayoutDashboard,
    Database,
    Activity,
    BookOpen,
} from 'lucide-react';

export function Header() {
    const { user, signInWithGoogle, logout } = useAuth();
    const pathname = usePathname();
    const [scrolled, setScrolled] = useState(false);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    // Use IntersectionObserver for better performance than scroll event
    useEffect(() => {
        const handleScroll = () => {
            // Throttled check using requestAnimationFrame
            requestAnimationFrame(() => {
                setScrolled(window.scrollY > 20);
            });
        };

        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    // Close mobile menu on path change
    useEffect(() => {
        if (mobileMenuOpen) {
            // Use setTimeout to avoid synchronous state update warning during render phase
            setTimeout(() => setMobileMenuOpen(false), 0);
        }
    }, [pathname, mobileMenuOpen]);

    return (
        <header
            className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 border-b ${
                scrolled
                    ? 'bg-[#020617]/80 backdrop-blur-xl border-white/5 shadow-2xl py-3'
                    : 'bg-transparent border-transparent py-5'
            }`}
        >
            <div className="max-w-7xl mx-auto px-6 h-12 flex items-center justify-between">
                {/* Logo Area */}
                <div className="flex items-center gap-8">
                    <Link href="/" className="group flex items-center gap-3 relative z-50">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg shadow-primary/20 group-hover:shadow-primary/40 transition-shadow">
                            <span className="font-heading font-bold text-white text-lg">S</span>
                        </div>
                        <span className="font-heading font-bold text-xl tracking-tight text-white group-hover:opacity-90 transition-opacity">
                            Sales<span className="text-primary">Tracker</span>
                        </span>
                    </Link>

                    {/* Desktop Navigation */}
                    <nav className="desktop-nav-container hidden md:flex items-center h-full">
                        <div className="flex items-center p-1.5 rounded-full border border-white/5 bg-white/5 backdrop-blur-md shadow-inner">
                            <NavLink href="/" active={pathname === '/'}>
                                Dashboard
                            </NavLink>
                            <NavLink href="/leads" active={pathname.startsWith('/leads')}>
                                Leads
                            </NavLink>
                            <NavLink href="/activities" active={pathname.startsWith('/activities')}>
                                Activities
                            </NavLink>
                            <NavLink href="/resources" active={pathname.startsWith('/resources')}>
                                Enablement
                            </NavLink>
                        </div>
                    </nav>
                </div>

                {/* User / Actions (Desktop) */}
                <div className="hidden md:flex items-center gap-4">
                    {user ? (
                        <div className="flex items-center gap-4 pl-6 border-l border-white/10">
                            <div className="text-right">
                                <div className="text-sm font-medium text-white">
                                    {user.displayName || 'User'}
                                </div>
                                <div className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
                                    Workspace
                                </div>
                            </div>
                            <button
                                onClick={logout}
                                className="w-10 h-10 rounded-full bg-gradient-to-tr from-slate-800 to-slate-700 border border-white/10 flex items-center justify-center hover:border-white/30 transition-all focus:outline-none focus:ring-2 focus:ring-primary/50 relative group"
                                title="Sign Out"
                            >
                                {user.photoURL ? (
                                    <div className="relative w-full h-full">
                                        <Image
                                            src={user.photoURL}
                                            alt="User"
                                            fill
                                            className="rounded-full object-cover"
                                        />
                                    </div>
                                ) : (
                                    <span className="font-bold text-slate-300">
                                        {user.displayName?.[0] || 'U'}
                                    </span>
                                )}
                                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 border-2 border-slate-900 rounded-full"></span>
                            </button>
                        </div>
                    ) : (
                        <button
                            onClick={async () => {
                                try {
                                    await signInWithGoogle();
                                } catch (error: unknown) {
                                    const authError = error as { code?: string };
                                    if (authError?.code !== 'auth/popup-closed-by-user') {
                                        console.error('Sign in failed:', error);
                                    }
                                }
                            }}
                            className="glass-button text-sm py-2 px-5 flex items-center gap-2 hover:shadow-primary/30"
                        >
                            <span>Sign In</span>
                        </button>
                    )}
                </div>

                {/* Mobile Menu Toggle */}
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        setMobileMenuOpen(!mobileMenuOpen);
                    }}
                    className="mobile-toggle-btn md:hidden relative z-[60] w-11 h-11 flex items-center justify-center rounded-lg text-slate-300 hover:text-white hover:bg-white/5 active:bg-white/10 transition-colors touch-manipulation"
                    aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
                    aria-expanded={mobileMenuOpen}
                >
                    {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
                </button>
            </div>

            {/* Mobile Menu Overlay */}
            <div
                className={`fixed inset-0 bg-[#020617]/98 backdrop-blur-2xl z-[55] transition-all duration-300 md:hidden flex flex-col pt-20 px-6 ${mobileMenuOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
                style={{ top: 0, left: 0, right: 0, bottom: 0 }}
            >
                <nav className="flex flex-col gap-2">
                    <MobileNavLink
                        href="/"
                        active={pathname === '/'}
                        icon={<LayoutDashboard size={20} />}
                    >
                        Dashboard
                    </MobileNavLink>
                    <MobileNavLink
                        href="/leads"
                        active={pathname.startsWith('/leads')}
                        icon={<Database size={20} />}
                    >
                        Leads Pipeline
                    </MobileNavLink>
                    <MobileNavLink
                        href="/activities"
                        active={pathname.startsWith('/activities')}
                        icon={<Activity size={20} />}
                    >
                        Activities
                    </MobileNavLink>
                    <MobileNavLink
                        href="/resources"
                        active={pathname.startsWith('/resources')}
                        icon={<BookOpen size={20} />}
                    >
                        Enablement & Resources
                    </MobileNavLink>
                </nav>

                <div className="mt-8 pt-8 border-t border-white/10">
                    {user ? (
                        <div className="space-y-6">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-full bg-slate-800 border border-white/10 overflow-hidden">
                                    {user.photoURL ? (
                                        <div className="relative w-full h-full">
                                            <Image
                                                src={user.photoURL}
                                                alt="User"
                                                fill
                                                className="object-cover"
                                            />
                                        </div>
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-slate-400 font-bold">
                                            {user.displayName?.[0] || 'U'}
                                        </div>
                                    )}
                                </div>
                                <div>
                                    <div className="font-medium text-white text-lg">
                                        {user.displayName || 'User'}
                                    </div>
                                    <div className="text-sm text-slate-400">{user.email}</div>
                                </div>
                            </div>
                            <button
                                onClick={logout}
                                className="w-full h-14 rounded-xl border border-white/10 flex items-center justify-center text-slate-400 hover:text-white active:bg-white/5 transition-colors text-sm font-semibold uppercase tracking-wider touch-manipulation active:scale-[0.98]"
                            >
                                <span className="flex items-center gap-3 font-medium">
                                    <LogOut size={18} /> Sign Out
                                </span>
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <button
                                onClick={async () => {
                                    try {
                                        await signInWithGoogle();
                                    } catch (error: unknown) {
                                        const authError = error as { code?: string };
                                        if (authError?.code !== 'auth/popup-closed-by-user') {
                                            console.error('Sign in failed:', error);
                                        }
                                    }
                                }}
                                className="w-full h-14 glass-button justify-center text-base touch-manipulation active:scale-[0.98]"
                            >
                                Sign In with Google
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </header>
    );
}

function NavLink({
    href,
    children,
    active,
}: {
    href: string;
    children: React.ReactNode;
    active?: boolean;
}) {
    return (
        <Link
            href={href}
            className={`
                px-5 py-2 rounded-full text-sm font-medium transition-all duration-300 relative z-10
                ${active ? 'text-white' : 'text-slate-400 hover:text-white hover:bg-white/5'}
            `}
        >
            {children}
            {active && (
                <span className="absolute inset-0 bg-white/10 rounded-full shadow-inner -z-10 animate-fade-in"></span>
            )}
        </Link>
    );
}

function MobileNavLink({
    href,
    children,
    active,
    icon,
}: {
    href: string;
    children: React.ReactNode;
    active?: boolean;
    icon: React.ReactNode;
}) {
    return (
        <Link
            href={href}
            className={`
                flex items-center gap-4 px-4 py-4 min-h-[56px] rounded-xl transition-all duration-200 border touch-manipulation active:scale-[0.98]
                ${
                    active
                        ? 'bg-primary/10 border-primary/20 text-white shadow-lg shadow-primary/10'
                        : 'bg-transparent border-transparent text-slate-400 hover:bg-white/5 active:bg-white/10 hover:text-white'
                }
            `}
        >
            <span className={`${active ? 'text-primary' : 'text-slate-500'}`}>{icon}</span>
            <span className="font-medium text-lg">{children}</span>
            {active && <ChevronRight className="ml-auto text-primary" size={20} />}
        </Link>
    );
}
