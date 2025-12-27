import React from 'react';

type BadgeVariant = 'default' | 'success' | 'warning' | 'danger' | 'info';

export function Badge({ children, variant = 'default', className = '' }: { children: React.ReactNode, variant?: BadgeVariant, className?: string }) {
    const colors: Record<BadgeVariant, string> = {
        default: 'bg-slate-700 text-slate-300',
        success: 'bg-green-500/20 text-green-300 border border-green-500/30',
        warning: 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30',
        danger: 'bg-red-500/20 text-red-300 border border-red-500/30',
        info: 'bg-blue-500/20 text-blue-300 border border-blue-500/30',
    };

    return (
        <span className={`px-2 py-0.5 rounded text-xs font-medium ${colors[variant]} ${className}`}>
            {children}
        </span>
    );
}
