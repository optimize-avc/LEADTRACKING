'use client';

import React from 'react';
import { SMSChatWindow } from './SMSChatWindow';

interface SMSModalProps {
    isOpen: boolean;
    onClose: () => void;
    leadId: string;
    leadName: string;
    leadPhone: string;
}

export function SMSModal({ isOpen, onClose, leadId, leadName, leadPhone }: SMSModalProps) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={onClose} />

            {/* Chat Window Container */}
            <div className="relative z-10 w-full max-w-md animate-in fade-in zoom-in duration-200">
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
