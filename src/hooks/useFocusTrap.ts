'use client';

import { useEffect, useRef, useCallback } from 'react';

/**
 * A hook that traps keyboard focus within a container element.
 * Used for modals, dialogs, and other overlay components to ensure
 * keyboard accessibility.
 */
export function useFocusTrap(isActive: boolean = true) {
    const containerRef = useRef<HTMLDivElement>(null);
    const previousActiveElement = useRef<HTMLElement | null>(null);

    const getFocusableElements = useCallback(() => {
        if (!containerRef.current) return [];
        
        const focusableSelectors = [
            'button:not([disabled])',
            'a[href]',
            'input:not([disabled])',
            'select:not([disabled])',
            'textarea:not([disabled])',
            '[tabindex]:not([tabindex="-1"])',
        ].join(', ');

        return Array.from(
            containerRef.current.querySelectorAll<HTMLElement>(focusableSelectors)
        ).filter((el) => {
            // Filter out hidden elements
            return el.offsetParent !== null;
        });
    }, []);

    const handleKeyDown = useCallback((event: KeyboardEvent) => {
        if (event.key !== 'Tab' || !containerRef.current) return;

        const focusableElements = getFocusableElements();
        if (focusableElements.length === 0) return;

        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        // Shift + Tab - go to previous element
        if (event.shiftKey) {
            if (document.activeElement === firstElement) {
                event.preventDefault();
                lastElement.focus();
            }
        } else {
            // Tab - go to next element
            if (document.activeElement === lastElement) {
                event.preventDefault();
                firstElement.focus();
            }
        }
    }, [getFocusableElements]);

    const handleEscape = useCallback((event: KeyboardEvent) => {
        if (event.key === 'Escape') {
            // Allow parent component to handle escape
            // This is just for documentation - actual handling should be in the component
        }
    }, []);

    useEffect(() => {
        if (!isActive) return;

        // Store currently focused element
        previousActiveElement.current = document.activeElement as HTMLElement;

        // Focus the first focusable element in the container
        const focusableElements = getFocusableElements();
        if (focusableElements.length > 0) {
            // Small delay to ensure the modal is fully rendered
            setTimeout(() => {
                focusableElements[0].focus();
            }, 10);
        }

        // Add event listeners
        document.addEventListener('keydown', handleKeyDown);
        document.addEventListener('keydown', handleEscape);

        return () => {
            document.removeEventListener('keydown', handleKeyDown);
            document.removeEventListener('keydown', handleEscape);

            // Restore focus to previously focused element
            if (previousActiveElement.current && typeof previousActiveElement.current.focus === 'function') {
                previousActiveElement.current.focus();
            }
        };
    }, [isActive, handleKeyDown, handleEscape, getFocusableElements]);

    return { containerRef };
}

/**
 * A hook for managing focus within a component with roving tabindex.
 * Useful for toolbars, menus, and other composite widgets.
 */
export function useRovingTabIndex<T extends HTMLElement>(
    items: T[],
    initialIndex: number = 0
) {
    const currentIndexRef = useRef(initialIndex);

    const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
        const { key } = event;
        let newIndex = currentIndexRef.current;

        switch (key) {
            case 'ArrowDown':
            case 'ArrowRight':
                event.preventDefault();
                newIndex = (currentIndexRef.current + 1) % items.length;
                break;
            case 'ArrowUp':
            case 'ArrowLeft':
                event.preventDefault();
                newIndex = (currentIndexRef.current - 1 + items.length) % items.length;
                break;
            case 'Home':
                event.preventDefault();
                newIndex = 0;
                break;
            case 'End':
                event.preventDefault();
                newIndex = items.length - 1;
                break;
            default:
                return;
        }

        currentIndexRef.current = newIndex;
        items[newIndex]?.focus();
    }, [items]);

    return { handleKeyDown, currentIndex: currentIndexRef.current };
}
