'use client';

/**
 * Error Boundary Component
 * 
 * Catches React errors and displays a fallback UI.
 * Integrates with Sentry for error reporting.
 */

import React, { Component, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { captureError } from '@/lib/sentry';

interface Props {
    children: ReactNode;
    fallback?: ReactNode;
}

interface State {
    hasError: boolean;
    error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = { hasError: false };
    }

    static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        // Log to console
        console.error('Error caught by boundary:', error, errorInfo);
        
        // Report to Sentry
        captureError(error, {
            action: 'ErrorBoundary.componentDidCatch',
            metadata: { componentStack: errorInfo.componentStack }
        });
    }

    handleRetry = () => {
        this.setState({ hasError: false, error: undefined });
    };

    render() {
        if (this.state.hasError) {
            if (this.props.fallback) {
                return this.props.fallback;
            }

            return (
                <div className="min-h-[400px] flex items-center justify-center p-8">
                    <div className="text-center max-w-md">
                        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-500/20 flex items-center justify-center">
                            <AlertTriangle className="w-8 h-8 text-red-400" />
                        </div>
                        <h2 className="text-xl font-semibold text-white mb-2">
                            Something went wrong
                        </h2>
                        <p className="text-slate-400 mb-6">
                            We encountered an unexpected error. Our team has been notified.
                        </p>
                        <div className="flex gap-3 justify-center">
                            <button
                                onClick={this.handleRetry}
                                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors"
                            >
                                <RefreshCw className="w-4 h-4" />
                                Try Again
                            </button>
                            <button
                                onClick={() => window.location.href = '/'}
                                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-medium transition-colors"
                            >
                                Go Home
                            </button>
                        </div>
                        {process.env.NODE_ENV === 'development' && this.state.error && (
                            <details className="mt-6 text-left">
                                <summary className="text-slate-500 cursor-pointer hover:text-slate-400">
                                    Error Details (dev only)
                                </summary>
                                <pre className="mt-2 p-4 bg-slate-900 rounded-lg text-xs text-red-400 overflow-auto max-h-40">
                                    {this.state.error.stack || this.state.error.message}
                                </pre>
                            </details>
                        )}
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

/**
 * Higher-order component to wrap any component with error boundary
 */
export function withErrorBoundary<P extends object>(
    WrappedComponent: React.ComponentType<P>,
    fallback?: ReactNode
) {
    return function WithErrorBoundaryWrapper(props: P) {
        return (
            <ErrorBoundary fallback={fallback}>
                <WrappedComponent {...props} />
            </ErrorBoundary>
        );
    };
}

/**
 * Page-level error boundary with reset functionality
 */
export function PageErrorBoundary({ children }: { children: ReactNode }) {
    return (
        <ErrorBoundary
            fallback={
                <div className="min-h-screen bg-slate-900 flex items-center justify-center p-8">
                    <div className="text-center max-w-lg">
                        <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-red-500/20 flex items-center justify-center">
                            <AlertTriangle className="w-10 h-10 text-red-400" />
                        </div>
                        <h1 className="text-2xl font-bold text-white mb-3">
                            Page Error
                        </h1>
                        <p className="text-slate-400 mb-8">
                            This page encountered an error and couldn&apos;t load properly. 
                            Please try refreshing the page or return to the dashboard.
                        </p>
                        <div className="flex gap-4 justify-center">
                            <button
                                onClick={() => window.location.reload()}
                                className="flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors"
                            >
                                <RefreshCw className="w-5 h-5" />
                                Refresh Page
                            </button>
                            <button
                                onClick={() => (window.location.href = '/')}
                                className="px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-medium transition-colors"
                            >
                                Back to Dashboard
                            </button>
                        </div>
                    </div>
                </div>
            }
        >
            {children}
        </ErrorBoundary>
    );
}
