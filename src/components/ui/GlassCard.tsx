import React from 'react';

interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
    children: React.ReactNode;
    padding?: 'none' | 'sm' | 'md' | 'lg';
}

export function GlassCard({ children, className = '', padding = 'md', ...props }: GlassCardProps) {
    const paddingClass = {
        none: '',
        sm: 'p-4',
        md: 'p-6',
        lg: 'p-8',
    }[padding];

    return (
        <div
            className={`glass-card ${paddingClass} ${className}`}
            {...props}
        >
            {children}
        </div>
    );
}
