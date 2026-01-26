'use client';

/**
 * Error Boundary Component
 *
 * Catches JavaScript errors anywhere in the child component tree,
 * logs those errors, and displays a fallback UI instead of crashing.
 * Integrates with Sentry for production error tracking (when available).
 */

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { GlassCard } from '@/components/ui/GlassCard';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

interface ErrorBoundaryProps {
    children: ReactNode;
    fallback?: ReactNode;
    onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface ErrorBoundaryState {
    hasError: boolean;
    error: Error | null;
    errorInfo: ErrorInfo | null;
    eventId: string | null;
}

// Log error to monitoring service if configured
// Note: When Sentry is installed, this will be enhanced to use captureException
function reportError(error: Error, componentStack?: string): void {
    // For now, just log to console
    // When @sentry/nextjs is installed, uncomment the captureException call
    console.error('[ErrorBoundary] Error captured:', {
        message: error.message,
        stack: error.stack,
        componentStack,
    });

    // Future: Send to error tracking service
    // import('@sentry/nextjs').then(Sentry => Sentry.captureException(error, { extra: { componentStack } }));
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
    constructor(props: ErrorBoundaryProps) {
        super(props);
        this.state = {
            hasError: false,
            error: null,
            errorInfo: null,
            eventId: null,
        };
    }

    static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
        this.setState({ errorInfo });

        // Log error to console in development
        console.error('ErrorBoundary caught an error:', error, errorInfo);

        // Call optional error handler
        this.props.onError?.(error, errorInfo);

        // Send to error tracking service
        reportError(error, errorInfo.componentStack || undefined);
    }

    handleReset = (): void => {
        this.setState({
            hasError: false,
            error: null,
            errorInfo: null,
        });
    };

    handleRefresh = (): void => {
        window.location.reload();
    };

    handleGoHome = (): void => {
        window.location.href = '/';
    };

    render(): ReactNode {
        if (this.state.hasError) {
            // Custom fallback provided
            if (this.props.fallback) {
                return this.props.fallback;
            }

            // Default error UI
            return (
                <div className="min-h-[400px] flex items-center justify-center p-8">
                    <GlassCard className="max-w-md w-full text-center">
                        <div className="p-3 bg-red-500/20 rounded-full w-fit mx-auto mb-4">
                            <AlertTriangle className="w-8 h-8 text-red-400" />
                        </div>

                        <h2 className="text-xl font-semibold text-white mb-2">
                            Something went wrong
                        </h2>

                        <p className="text-slate-400 text-sm mb-6">
                            An unexpected error occurred. You can try refreshing the page or go back
                            to the dashboard.
                        </p>

                        {process.env.NODE_ENV === 'development' && this.state.error && (
                            <details className="mb-6 text-left">
                                <summary className="text-xs text-slate-500 cursor-pointer hover:text-slate-400">
                                    Error Details (Development Only)
                                </summary>
                                <pre className="mt-2 p-3 bg-slate-800/50 rounded text-xs text-red-400 overflow-auto max-h-32">
                                    {this.state.error.message}
                                    {'\n\n'}
                                    {this.state.errorInfo?.componentStack}
                                </pre>
                            </details>
                        )}

                        <div className="flex gap-3 justify-center">
                            <button
                                onClick={this.handleRefresh}
                                className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-sm text-white transition-colors"
                            >
                                <RefreshCw className="w-4 h-4" />
                                Refresh
                            </button>
                            <button
                                onClick={this.handleGoHome}
                                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-sm text-white transition-colors"
                            >
                                <Home className="w-4 h-4" />
                                Dashboard
                            </button>
                        </div>
                    </GlassCard>
                </div>
            );
        }

        return this.props.children;
    }
}

/**
 * Hook-friendly error boundary wrapper
 * Use this for wrapping specific sections of your app
 */
interface ErrorBoundaryWrapperProps {
    children: ReactNode;
    fallbackMessage?: string;
}

export function SafeComponent({ children, fallbackMessage }: ErrorBoundaryWrapperProps) {
    return (
        <ErrorBoundary
            fallback={
                <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
                    <p className="text-red-400 text-sm">
                        {fallbackMessage || 'This section encountered an error.'}
                    </p>
                </div>
            }
        >
            {children}
        </ErrorBoundary>
    );
}
