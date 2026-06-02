'use client'; // ✅ UNCHANGED

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'; // ✅ UNCHANGED
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'; // ✨ NEW - OPTIMIZATION
import { useState } from 'react'; // ✅ UNCHANGED

/**
 * TanStack Query Provider
 * Wraps the app with React Query context
 */ // ✅ UNCHANGED

export function QueryProvider({ children }: { children: React.ReactNode }) { // ✅ UNCHANGED
    const [queryClient] = useState( // ✅ UNCHANGED
        () =>
            new QueryClient({
                defaultOptions: {
                    queries: {
                        staleTime: 60 * 1000,        // ✅ UNCHANGED — 1 minute
                        retry: 1,                     // ✅ UNCHANGED
                        refetchOnWindowFocus: false,  // ✅ UNCHANGED
                        gcTime: 5 * 60 * 1000,        // ✨ NEW - OPTIMIZATION — 5 min garbage collection (TanStack v5 explicit)
                        networkMode: 'offlineFirst',  // ✨ NEW - OPTIMIZATION — serve from cache immediately; resilient to Neon cold starts
                    },
                    mutations: {
                        retry: 0, // ✅ UNCHANGED
                    },
                },
            })
    );

    return (
        <QueryClientProvider client={queryClient}> {/* ✅ UNCHANGED */}
            {children} {/* ✅ UNCHANGED */}
            {/* ✨ NEW - OPTIMIZATION — DevTools panel (auto-stripped from production builds by Next.js) */}
            <ReactQueryDevtools initialIsOpen={false} />
        </QueryClientProvider>
    );
}
