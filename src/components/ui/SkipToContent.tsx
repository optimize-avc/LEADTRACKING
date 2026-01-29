'use client';

import React from 'react';

interface SkipToContentProps {
    /** The ID of the main content element to skip to */
    mainContentId?: string;
    /** Custom label for the skip link */
    label?: string;
}

/**
 * Skip to main content link for keyboard accessibility.
 * This component should be placed at the very beginning of the page
 * to allow keyboard users to skip navigation and jump directly to
 * the main content.
 */
export function SkipToContent({ 
    mainContentId = 'main-content',
    label = 'Skip to main content'
}: SkipToContentProps) {
    const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
        e.preventDefault();
        const mainContent = document.getElementById(mainContentId);
        if (mainContent) {
            mainContent.focus();
            mainContent.scrollIntoView({ behavior: 'smooth' });
        }
    };

    return (
        <a
            href={`#${mainContentId}`}
            onClick={handleClick}
            className="
                sr-only focus:not-sr-only
                focus:fixed focus:top-4 focus:left-4 focus:z-[100]
                focus:px-4 focus:py-2
                focus:bg-indigo-600 focus:text-white
                focus:rounded-lg focus:shadow-lg
                focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-slate-900
                font-medium text-sm
                transition-all duration-200
            "
        >
            {label}
        </a>
    );
}

/**
 * A visually hidden component that provides context for screen readers.
 * Use this to add descriptive text that helps users understand the context
 * without cluttering the visual interface.
 */
export function VisuallyHidden({ children }: { children: React.ReactNode }) {
    return (
        <span className="sr-only">
            {children}
        </span>
    );
}

/**
 * Announces a message to screen readers using a live region.
 * Useful for dynamic content updates like form validation errors,
 * loading states, or action confirmations.
 */
export function LiveRegion({ 
    message, 
    politeness = 'polite',
    atomic = true 
}: { 
    message: string;
    politeness?: 'polite' | 'assertive';
    atomic?: boolean;
}) {
    return (
        <div
            role="status"
            aria-live={politeness}
            aria-atomic={atomic}
            className="sr-only"
        >
            {message}
        </div>
    );
}
