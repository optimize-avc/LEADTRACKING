import React from 'react';

interface GlassCardProps extends React.HTMLAttributes<HTMLElement> {
    children: React.ReactNode;
    padding?: 'none' | 'sm' | 'md' | 'lg';
    as?: 'div' | 'section' | 'article' | 'aside';
}

export function GlassCard({
    children,
    className = '',
    padding = 'md',
    as: Component = 'div',
    ...props
}: GlassCardProps) {
    const paddingClass = {
        none: '',
        sm: 'p-4',
        md: 'p-6',
        lg: 'p-8',
    }[padding];

    return (
        <Component
            role={
                Component === 'section' || Component === 'article' || Component === 'aside'
                    ? Component
                    : undefined
            }
            className={`glass-card ${paddingClass} ${className}`}
            {...props}
        >
            {children}
        </Component>
    );
}
