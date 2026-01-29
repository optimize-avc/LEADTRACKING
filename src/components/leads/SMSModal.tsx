'use client';

import React, { useEffect, useCallback } from 'react';
import { SMSChatWindow } from './SMSChatWindow';
import { useFocusTrap } from '@/hooks/useFocusTrap';

interface SMSModalProps {
    isOpen: boolean;
    onClose: () => void;
    leadId: string;
    leadName: string;
    leadPhone: string;
}

export function SMSModal({ isOpen, onClose, leadId, leadName, leadPhone }: SMSModalProps) {
    const { containerRef } = useFocusTrap(isOpen);

    // Handle Escape key
    const handleKeyDown = useCallback((e: KeyboardEvent) => {
        if (e.key === 'Escape') {
            onClose();
        }
    }, [onClose]);

    useEffect(() => {
        if (isOpen) {
            document.addEventListener('keydown', handleKeyDown);
            document.body.style.overflow = 'hidden';
        }
        return () => {
            document.removeEventListener('keydown', handleKeyDown);
            document.body.style.overflow = '';
        };
    }, [isOpen, handleKeyDown]);

    if (!isOpen) return null;

    return (
        <div 
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="sms-chat-title"
        >
            {/* Backdrop */}
            <div 
                className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" 
                onClick={onClose}
                aria-hidden="true"
            />

            {/* Chat Window Container */}
            <div 
                ref={containerRef}
                className="relative z-10 w-full max-w-md animate-in fade-in zoom-in duration-200"
            >
                <h2 id="sms-chat-title" className="sr-only">SMS Chat with {leadName}</h2>
                <SMSChatWindow
                    leadId={leadId}
                    leadName={leadName}
                    leadPhone={leadPhone}
                    onClose={onClose}
                />
            </div>
        </div>
    );
}
