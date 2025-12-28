import React from 'react';

interface PageHeaderProps {
    title: string;
    description?: string;
    children?: React.ReactNode;
    className?: string;
}

export function PageHeader({ title, description, children, className = '' }: PageHeaderProps) {
    return (
        <div
            className={`flex flex-col md:flex-row md:items-end justify-between gap-4 py-6 border-b border-white/5 animate-fade-in ${className}`}
        >
            <div className="space-y-2">
                <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400 font-heading tracking-tight">
                    {title}
                </h1>
                {description && (
                    <p className="text-slate-400 text-lg max-w-2xl leading-relaxed">
                        {description}
                    </p>
                )}
            </div>
            {children && <div className="flex items-center gap-3">{children}</div>}
        </div>
    );
}
