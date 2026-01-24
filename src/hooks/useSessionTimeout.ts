'use client';

/**
 * useSessionTimeout Hook
 *
 * Automatically logs out users after a period of inactivity.
 * Best practice 2026: Configurable timeout with warning modal.
 */

import { useEffect, useCallback, useRef, useState } from 'react';
import { useAuth } from '@/components/providers/AuthProvider';
import { signOut } from 'firebase/auth';
import { getAuth } from 'firebase/auth';

interface SessionTimeoutOptions {
    timeoutMinutes?: number;
    warningMinutes?: number;
    onTimeout?: () => void;
    onWarning?: () => void;
}

interface SessionTimeoutState {
    isWarningVisible: boolean;
    remainingSeconds: number;
    extendSession: () => void;
}

const DEFAULT_TIMEOUT_MINUTES = 30;
const DEFAULT_WARNING_MINUTES = 5;

export function useSessionTimeout(options: SessionTimeoutOptions = {}): SessionTimeoutState {
    const { user } = useAuth();
    const {
        timeoutMinutes = DEFAULT_TIMEOUT_MINUTES,
        warningMinutes = DEFAULT_WARNING_MINUTES,
        onTimeout,
        onWarning,
    } = options;

    const [isWarningVisible, setIsWarningVisible] = useState(false);
    const [remainingSeconds, setRemainingSeconds] = useState(warningMinutes * 60);

    // Store callbacks in refs to avoid dependency issues
    const onTimeoutRef = useRef(onTimeout);
    const onWarningRef = useRef(onWarning);

    // Update refs in effect to avoid lint errors
    useEffect(() => {
        onTimeoutRef.current = onTimeout;
        onWarningRef.current = onWarning;
    });

    const timeoutRef = useRef<NodeJS.Timeout | null>(null);
    const warningRef = useRef<NodeJS.Timeout | null>(null);
    const countdownRef = useRef<NodeJS.Timeout | null>(null);
    const isWarningVisibleRef = useRef(false);

    // Handle logout
    const handleLogout = useCallback(async () => {
        try {
            // Save any unsaved work to localStorage before logout
            const unsavedData = {
                timestamp: Date.now(),
                reason: 'session_timeout',
            };
            localStorage.setItem('salestracker_session_timeout', JSON.stringify(unsavedData));

            const auth = getAuth();
            await signOut(auth);
            onTimeoutRef.current?.();
        } catch (error) {
            console.error('Error during session timeout logout:', error);
        }
    }, []);

    // Clear all timers
    const clearAllTimers = useCallback(() => {
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
            timeoutRef.current = null;
        }
        if (warningRef.current) {
            clearTimeout(warningRef.current);
            warningRef.current = null;
        }
        if (countdownRef.current) {
            clearInterval(countdownRef.current);
            countdownRef.current = null;
        }
    }, []);

    // Start the countdown timers
    const startTimers = useCallback(() => {
        clearAllTimers();

        const warningDelay = (timeoutMinutes - warningMinutes) * 60 * 1000;
        const timeoutDelay = timeoutMinutes * 60 * 1000;

        // Set warning timer
        warningRef.current = setTimeout(() => {
            isWarningVisibleRef.current = true;
            setIsWarningVisible(true);
            setRemainingSeconds(warningMinutes * 60);
            onWarningRef.current?.();

            // Start countdown
            countdownRef.current = setInterval(() => {
                setRemainingSeconds((prev) => {
                    if (prev <= 1) {
                        if (countdownRef.current) {
                            clearInterval(countdownRef.current);
                            countdownRef.current = null;
                        }
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
        }, warningDelay);

        // Set timeout timer
        timeoutRef.current = setTimeout(handleLogout, timeoutDelay);
    }, [timeoutMinutes, warningMinutes, handleLogout, clearAllTimers]);

    // Extend session (called when user clicks "Stay Logged In")
    const extendSession = useCallback(() => {
        isWarningVisibleRef.current = false;
        setIsWarningVisible(false);
        setRemainingSeconds(warningMinutes * 60);
        startTimers();
    }, [startTimers, warningMinutes]);

    // Set up activity listeners and initial timers
    useEffect(() => {
        if (!user) return;

        const activityEvents = [
            'mousedown',
            'mousemove',
            'keydown',
            'scroll',
            'touchstart',
            'click',
        ];

        // Throttled activity handler
        let lastEventTime = 0;
        const throttleMs = 30000; // Only reset every 30 seconds on activity

        const handleActivity = () => {
            const now = Date.now();
            if (now - lastEventTime > throttleMs) {
                lastEventTime = now;
                // Only reset timers if warning isn't showing
                if (!isWarningVisibleRef.current) {
                    startTimers();
                }
            }
        };

        // Add listeners
        activityEvents.forEach((event) => {
            document.addEventListener(event, handleActivity, { passive: true });
        });

        // Initial timer setup
        startTimers();

        // Cleanup
        return () => {
            activityEvents.forEach((event) => {
                document.removeEventListener(event, handleActivity);
            });
            clearAllTimers();
        };
    }, [user, startTimers, clearAllTimers]);

    return {
        isWarningVisible,
        remainingSeconds,
        extendSession,
    };
}

/**
 * Format seconds as MM:SS
 */
export function formatTimeRemaining(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}
