/**
 * API Client Utilities
 *
 * Provides a consistent, type-safe way to make authenticated API calls.
 * Handles token management, error responses, and request formatting.
 */

import { getAuth } from 'firebase/auth';

interface ApiResponse<T = unknown> {
    success: boolean;
    data?: T;
    error?: string;
}

interface RequestOptions {
    method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
    body?: Record<string, unknown>;
    params?: Record<string, string>;
    requireAuth?: boolean;
}

/**
 * Get the current user's Firebase ID token
 * Returns null if user is not authenticated
 */
async function getAuthToken(): Promise<string | null> {
    try {
        const auth = getAuth();
        const user = auth.currentUser;

        if (!user) {
            return null;
        }

        // Force refresh to ensure token is valid
        const token = await user.getIdToken(true);
        return token;
    } catch (error) {
        console.error('Failed to get auth token:', error);
        return null;
    }
}

/**
 * Build URL with query parameters
 */
function buildUrl(endpoint: string, params?: Record<string, string>): string {
    const url = new URL(endpoint, window.location.origin);

    if (params) {
        Object.entries(params).forEach(([key, value]) => {
            url.searchParams.append(key, value);
        });
    }

    return url.toString();
}

/**
 * Make an authenticated API request
 *
 * @param endpoint - API endpoint path (e.g., '/api/email/send')
 * @param options - Request options
 * @returns Promise with typed response
 *
 * @example
 * ```typescript
 * const response = await apiRequest<{ messageId: string }>('/api/email/send', {
 *     method: 'POST',
 *     body: { to: 'email@example.com', subject: 'Hello' },
 * });
 *
 * if (response.success) {
 *     console.log(response.data.messageId);
 * }
 * ```
 */
export async function apiRequest<T = unknown>(
    endpoint: string,
    options: RequestOptions = {}
): Promise<ApiResponse<T>> {
    const { method = 'GET', body, params, requireAuth = true } = options;

    try {
        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
        };

        // Add auth token if required
        if (requireAuth) {
            const token = await getAuthToken();

            if (!token) {
                return {
                    success: false,
                    error: 'Not authenticated. Please sign in.',
                };
            }

            headers['Authorization'] = `Bearer ${token}`;
        }

        const url = buildUrl(endpoint, params);

        const response = await fetch(url, {
            method,
            headers,
            body: body ? JSON.stringify(body) : undefined,
        });

        const data = await response.json();

        if (!response.ok) {
            return {
                success: false,
                error: data.error || `Request failed with status ${response.status}`,
            };
        }

        return {
            success: true,
            data: data as T,
        };
    } catch (error) {
        console.error('API request failed:', error);

        if (error instanceof Error) {
            return {
                success: false,
                error: error.message,
            };
        }

        return {
            success: false,
            error: 'An unexpected error occurred',
        };
    }
}

/**
 * Convenience methods for common HTTP verbs
 */
export const api = {
    get: <T = unknown>(endpoint: string, params?: Record<string, string>) =>
        apiRequest<T>(endpoint, { method: 'GET', params }),

    post: <T = unknown>(endpoint: string, body: Record<string, unknown>) =>
        apiRequest<T>(endpoint, { method: 'POST', body }),

    put: <T = unknown>(endpoint: string, body: Record<string, unknown>) =>
        apiRequest<T>(endpoint, { method: 'PUT', body }),

    patch: <T = unknown>(endpoint: string, body: Record<string, unknown>) =>
        apiRequest<T>(endpoint, { method: 'PATCH', body }),

    delete: <T = unknown>(endpoint: string, params?: Record<string, string>) =>
        apiRequest<T>(endpoint, { method: 'DELETE', params }),
};

/**
 * Type-safe API endpoints
 * Use these constants to ensure endpoint consistency
 */
export const API_ENDPOINTS = {
    // Email
    EMAIL_SEND: '/api/email/send',

    // Twilio
    TWILIO_STATUS: '/api/twilio/status',
    TWILIO_SMS: '/api/twilio/sms',
    TWILIO_CALL: '/api/twilio/call',

    // Gmail Auth
    GMAIL_AUTH: '/api/auth/gmail',
    GMAIL_CALLBACK: '/api/auth/gmail/callback',
} as const;
