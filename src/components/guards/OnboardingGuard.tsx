/**
 * OnboardingGuard Component
 * 
 * Redirects authenticated users without a company to the onboarding flow.
 * Wrap this around pages that require a company context.
 * 
 * Best practice 2026: Guard components for conditional routing
 */

'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/components/providers/AuthProvider';

// Pages that don't require company context
const PUBLIC_PATHS = [
  '/login',
  '/onboarding',
  '/pricing',
  '/privacy',
  '/terms',
  '/invite',
];

// Pages that require authentication but not necessarily a company
const AUTH_ONLY_PATHS = [
  '/onboarding',
];

interface OnboardingGuardProps {
  children: React.ReactNode;
}

export function OnboardingGuard({ children }: OnboardingGuardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, profile, loading } = useAuth();

  useEffect(() => {
    // Skip check while loading
    if (loading) return;

    // Check if current path is public (no auth required)
    const isPublicPath = PUBLIC_PATHS.some(path => 
      pathname === path || pathname.startsWith(`${path}/`)
    );
    if (isPublicPath) return;

    // Check if current path only requires auth (not company)
    const isAuthOnlyPath = AUTH_ONLY_PATHS.some(path =>
      pathname === path || pathname.startsWith(`${path}/`)
    );

    // Not logged in - redirect to login
    if (!user) {
      router.push(`/login?redirect=${encodeURIComponent(pathname)}`);
      return;
    }

    // Logged in but no company - redirect to onboarding
    // (unless already on an auth-only path)
    if (profile && !profile.companyId && !isAuthOnlyPath) {
      router.push('/onboarding');
      return;
    }
  }, [user, profile, loading, pathname, router]);

  // Show loading state while checking
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-slate-500 text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

/**
 * Hook to check onboarding status
 */
export function useOnboardingStatus() {
  const { user, profile, loading } = useAuth();

  return {
    isLoading: loading,
    isAuthenticated: !!user,
    hasCompany: !!profile?.companyId,
    needsOnboarding: !!user && profile && !profile.companyId,
    companyId: profile?.companyId || null,
  };
}
