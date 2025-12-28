'use client';

import React, { useState } from 'react';
import { ShieldCheck, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

interface VerifyNumberButtonProps {
    phoneNumber: string;
    onVerified?: (data: unknown) => void;
}

export function VerifyNumberButton({ phoneNumber, onVerified }: VerifyNumberButtonProps) {
    const [isLoading, setIsLoading] = useState(false);
    const [status, setStatus] = useState<'idle' | 'valid' | 'invalid'>('idle');
    const [carrierInfo, setCarrierInfo] = useState<string | null>(null);

    const handleVerify = async (e: React.MouseEvent) => {
        e.stopPropagation();

        if (!phoneNumber) {
            toast.error('No phone number to verify');
            return;
        }

        setIsLoading(true);
        setStatus('idle');
        setCarrierInfo(null);

        try {
            const response = await fetch('/api/twilio/lookup', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ phoneNumber }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Verification failed');
            }

            if (data.valid) {
                setStatus('valid');
                const carrier = data.carrier?.name || 'Unknown Carrier';
                const type = data.carrier?.type?.toUpperCase() || '';
                const info = `${carrier} ${type ? `(${type})` : ''}`;
                setCarrierInfo(info);
                toast.success(`Number Verified: ${info}`);

                if (onVerified) onVerified(data);
            } else {
                setStatus('invalid');
                toast.error('Invalid phone number');
            }
        } catch (error: unknown) {
            toast.error(error instanceof Error ? error.message : 'Failed to send code');
            setStatus('invalid');
            toast.error('Verification failed');
        } finally {
            setIsLoading(false);
        }
    };

    if (status === 'valid') {
        return (
            <div
                className="flex items-center gap-1.5 text-xs text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded-full border border-emerald-500/20"
                title={carrierInfo || 'Verified Valid'}
            >
                <CheckCircle2 size={12} />
                <span>Valid</span>
            </div>
        );
    }

    if (status === 'invalid') {
        return (
            <div
                className="flex items-center gap-1.5 text-xs text-red-400 bg-red-500/10 px-2 py-1 rounded-full border border-red-500/20"
                title="Number appears invalid"
            >
                <AlertCircle size={12} />
                <span>Invalid</span>
            </div>
        );
    }

    return (
        <button
            onClick={handleVerify}
            disabled={isLoading}
            className={`
                group flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium transition-all
                ${
                    isLoading
                        ? 'bg-slate-800 text-slate-400 cursor-not-allowed'
                        : 'bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 hover:text-indigo-300 border border-indigo-500/20 hover:border-indigo-500/40'
                }
            `}
            title="Verify this number with Twilio Lookup"
        >
            {isLoading ? <Loader2 size={12} className="animate-spin" /> : <ShieldCheck size={12} />}
            <span>{isLoading ? 'Verifying...' : 'Verify'}</span>
        </button>
    );
}
