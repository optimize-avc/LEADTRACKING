'use client';

import React, { useState } from 'react';
import { Phone, PhoneOff, Loader2 } from 'lucide-react';
import { useAuth } from '@/components/providers/AuthProvider';
import { toast } from 'sonner';

interface CallButtonProps {
    leadId: string;
    leadName: string;
    leadPhone: string;
    size?: 'sm' | 'md' | 'lg';
    variant?: 'primary' | 'ghost';
}

type CallStatus = 'idle' | 'connecting' | 'ringing' | 'in-progress' | 'completed' | 'failed';

export function CallButton({
    leadId,
    leadName,
    leadPhone,
    size = 'md',
    variant = 'primary',
}: CallButtonProps) {
    const { user: authUser } = useAuth();
    // Fake user for testing if not logged in
    const user = authUser || { uid: 'test-user', displayName: 'Test User' };

    const [callStatus, setCallStatus] = useState<CallStatus>('idle');
    const [callSid, setCallSid] = useState<string | null>(null);

    const handleCall = async () => {
        if (!leadPhone) {
            toast.error('No phone number for this lead');
            return;
        }

        setCallStatus('connecting');

        try {
            const response = await fetch('/api/twilio/call', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    leadPhone,
                    userId: user.uid,
                    leadId,
                    leadName,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to initiate call');
            }

            setCallSid(data.callSid);
            setCallStatus('ringing');
            toast.success(`Calling ${leadName}...`);

            // Simulate call progress (in production, use webhooks)
            setTimeout(() => setCallStatus('in-progress'), 3000);
        } catch (error) {
            console.error('Call error:', error);
            setCallStatus('failed');
            toast.error(error instanceof Error ? error.message : 'Failed to initiate call');

            // Reset after error
            setTimeout(() => setCallStatus('idle'), 2000);
        }
    };

    const handleEndCall = () => {
        // In production, you'd call Twilio API to end the call
        setCallStatus('completed');
        toast.success('Call ended');

        setTimeout(() => {
            setCallStatus('idle');
            setCallSid(null);
        }, 1500);
    };

    const sizeClasses = {
        sm: 'p-1.5',
        md: 'p-2',
        lg: 'p-3',
    };

    const iconSize = {
        sm: 14,
        md: 18,
        lg: 22,
    };

    // Get status description for screen readers
    const getStatusDescription = () => {
        switch (callStatus) {
            case 'connecting':
                return 'Connecting call';
            case 'ringing':
                return 'Call ringing';
            case 'in-progress':
                return 'Call in progress';
            case 'completed':
                return 'Call completed';
            case 'failed':
                return 'Call failed';
            default:
                return '';
        }
    };

    // Active call state
    if (callStatus !== 'idle' && callStatus !== 'failed') {
        return (
            <div className="flex items-center gap-2" role="status" aria-live="polite">
                <button
                    onClick={handleEndCall}
                    className={`${sizeClasses[size]} rounded-lg bg-red-500 hover:bg-red-600 text-white transition-all shadow-lg animate-pulse`}
                    aria-label={`End call with ${leadName}`}
                >
                    <PhoneOff size={iconSize[size]} aria-hidden="true" />
                </button>
                <span className="text-xs text-slate-400 capitalize" aria-live="polite">
                    {callStatus === 'connecting' && 'Connecting...'}
                    {callStatus === 'ringing' && 'Ringing...'}
                    {callStatus === 'in-progress' && 'In Progress'}
                    {callStatus === 'completed' && 'Completed'}
                </span>
                <span className="sr-only">
                    {getStatusDescription()} with {leadName}
                </span>
            </div>
        );
    }

    // Idle/Failed state
    const baseClasses =
        variant === 'primary'
            ? 'bg-green-500 hover:bg-green-600 text-white shadow-lg shadow-green-500/20'
            : 'text-slate-400 hover:text-green-400 hover:bg-white/5';

    return (
        <button
            onClick={handleCall}
            disabled={false}
            className={`${sizeClasses[size]} rounded-lg ${baseClasses} transition-all disabled:opacity-50`}
            aria-label={`Call ${leadName}${leadPhone ? ` at ${leadPhone}` : ''}`}
            title={`Call ${leadName}`}
        >
            <Phone size={iconSize[size]} aria-hidden="true" />
        </button>
    );
}
