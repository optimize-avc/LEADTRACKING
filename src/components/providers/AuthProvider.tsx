'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import {
    User,
    onAuthStateChanged,
    signInWithPopup,
    GoogleAuthProvider,
    signOut,
} from 'firebase/auth';
import { getFirebaseAuth } from '@/lib/firebase/config';
import { ProfileService, UserProfile } from '@/lib/firebase/services';

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

    const refreshProfile = async () => {
        if (user) {
            const p = await ProfileService.getProfile(user.uid);
            setProfile(p);
        }
    };

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(getFirebaseAuth(), async (currentUser) => {
            setUser(currentUser);
            if (currentUser) {
                // Fetch or initialize profile
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
                } else if (isPermanentAdmin && p.role !== 'admin') {
                    // Ensure permanent admins always have admin role
                    await ProfileService.updateProfile(currentUser.uid, { role: 'admin' });
                    p = { ...p, role: 'admin' };
                }
                setProfile(p);
            } else {
                setProfile(null);
            }
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const signInWithGoogle = async () => {
        try {
            const provider = new GoogleAuthProvider();
            await signInWithPopup(getFirebaseAuth(), provider);
        } catch (error) {
            console.error('Error signing in with Google', error);
            throw error;
        }
    };

    const logout = async () => {
        try {
            await signOut(getFirebaseAuth());
        } catch (error) {
            console.error('Error signing out', error);
            throw error;
        }
    };

    return (
        <AuthContext.Provider
            value={{ user, profile, loading, signInWithGoogle, logout, refreshProfile }}
        >
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => useContext(AuthContext);
