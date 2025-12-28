'use client';

import React, { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

export function QueryProvider({ children }: { children: React.ReactNode }) {
    const [queryClient] = useState(
        () =>
            new QueryClient({
                defaultOptions: {
                    queries: {
                        // Determine the stale time carefully.
                        // 1000 * 60 * 5 = 5 minutes.
                        // Data will be considered "fresh" for 5 minutes.
                        // After 5 minutes, it will refetch in the background on window focus.
                        staleTime: 1000 * 60 * 5,
                        // Retry failed requests once
                        retry: 1,
                    },
                },
            })
    );

    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
