'use client';

import React from 'react';
import { PlusCircle, FileText } from 'lucide-react';
import Link from 'next/link';

interface EmptyStateProps {
    title: string;
    description: string;
    actionLabel?: string;
    actionLink?: string;
    icon?: React.ReactNode;
}

export function EmptyState({
    title,
    description,
    actionLabel,
    actionLink,
    icon = <FileText className="w-12 h-12 text-slate-500" />,
}: EmptyStateProps) {
    return (
        <div className="flex flex-col items-center justify-center p-12 text-center rounded-2xl bg-white/5 border border-white/5 backdrop-blur-sm">
            <div className="bg-slate-800/50 p-4 rounded-full mb-4">{icon}</div>
            <h3 className="text-xl font-bold text-white mb-2">{title}</h3>
            <p className="text-slate-400 max-w-sm mb-6">{description}</p>

            {actionLabel && actionLink && (
                <Link
                    href={actionLink}
                    className="flex items-center gap-2 px-6 py-2.5 bg-primary hover:bg-primary/90 text-white rounded-xl font-medium transition-colors"
                >
                    <PlusCircle size={18} />
                    {actionLabel}
                </Link>
            )}
        </div>
    );
}
