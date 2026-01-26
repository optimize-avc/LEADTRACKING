'use client';

import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import {
    User,
    onAuthStateChanged,
    signInWithPopup,
    GoogleAuthProvider,
    signOut,
} from 'firebase/auth';
import { getFirebaseAuth } from '@/lib/firebase/config';
import { ProfileService, UserProfile } from '@/lib/firebase/services';
import { AnalyticsService } from '@/lib/firebase/analytics';

// Permanent admin emails - these always get admin role
const PERMANENT_ADMINS = ['optimize@avcpp.com'];

interface AuthContextType {
    user: User | null;
    profile: UserProfile | null;
    loading: boolean;
    signInWithGoogle: () => Promise<void>;
    logout: () => Promise<void>;
    refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    profile: null,
    loading: true,
    signInWithGoogle: async () => {},
    logout: async () => {},
    refreshProfile: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const loadingRef = useRef(true);
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Keep ref in sync with state
    useEffect(() => {
        loadingRef.current = loading;
    }, [loading]);

    const finishLoading = useCallback(() => {
        if (loadingRef.current) {
            setLoading(false);
        }
    }, []);

    const refreshProfile = useCallback(async () => {
        if (user) {
            const p = await ProfileService.getProfile(user.uid);
            setProfile(p);
        }
    }, [user]);

    useEffect(() => {
        // Timeout fallback - if auth takes too long, assume not logged in
        timeoutRef.current = setTimeout(() => {
            console.warn('Auth timeout - assuming not logged in');
            finishLoading();
        }, 5000);

        const unsubscribe = onAuthStateChanged(getFirebaseAuth(), async (currentUser) => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
                timeoutRef.current = null;
            }

            setUser(currentUser);

            if (currentUser) {
                // Fetch or initialize profile
                try {
                    let p = await ProfileService.getProfile(currentUser.uid);
                    const isPermanentAdmin = PERMANENT_ADMINS.includes(
                        currentUser.email?.toLowerCase() || ''
                    );

                    if (!p) {
                        const now = Date.now();
                        // First-time users default to 'admin' - they will create their own company
                        // Invited users will have their role set by the invite acceptance flow
                        const newProfile: Partial<UserProfile> = {
                            email: currentUser.email || '',
                            onboarded: false,
                            tier: 'free',
                            role: 'admin', // Default to admin for new users (company creators)
                            createdAt: now,
                            updatedAt: now,
                        };
                        await ProfileService.updateProfile(currentUser.uid, newProfile);
                        p = await ProfileService.getProfile(currentUser.uid);

                        // Track signup event for analytics
                        await AnalyticsService.trackSignup(
                            currentUser.uid,
                            currentUser.email || ''
                        );

                        // Send welcome email (fire and forget - don't block auth)
                        fetch('/api/email/welcome', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                email: currentUser.email,
                                name: currentUser.displayName,
                            }),
                        }).catch((err) => console.warn('Failed to send welcome email:', err));
                    } else if (isPermanentAdmin && p.role !== 'admin') {
                        // Ensure permanent admins always have admin role
                        await ProfileService.updateProfile(currentUser.uid, { role: 'admin' });
                        p = { ...p, role: 'admin' };
                    }
                    setProfile(p);
                } catch (profileError) {
                    console.error('Error loading profile:', profileError);
                    // Continue without profile - user is still authenticated
                }
            } else {
                setProfile(null);
            }

            finishLoading();
        });

        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
            unsubscribe();
        };
    }, [finishLoading]);

    const signInWithGoogle = useCallback(async () => {
        try {
            const provider = new GoogleAuthProvider();
            await signInWithPopup(getFirebaseAuth(), provider);
        } catch (error) {
            console.error('Error signing in with Google', error);
            throw error;
        }
    }, []);

    const logout = useCallback(async () => {
        try {
            await signOut(getFirebaseAuth());
        } catch (error) {
            console.error('Error signing out', error);
            throw error;
        }
    }, []);

    return (
        <AuthContext.Provider
            value={{ user, profile, loading, signInWithGoogle, logout, refreshProfile }}
        >
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => useContext(AuthContext);
