'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';

const isDev = process.env.NODE_ENV === 'development';

export function QueryProvider({ children }: { children: React.ReactNode }) {
    const [queryClient] = useState(
        () =>
            new QueryClient({
                defaultOptions: {
                    queries: {
                        staleTime: 5 * 60 * 1000,   // 5 min — serve cache; skip refetch on tab switch
                        gcTime: 10 * 60 * 1000,       // 10 min garbage-collection window
                        retry: 1,
                        refetchOnWindowFocus: false,
                        networkMode: 'offlineFirst',  // show cached data instantly; resilient to Neon cold starts
                    },
                    mutations: {
                        retry: 0,
                    },
                },
            })
    );

    return (
        <QueryClientProvider client={queryClient}>
            {children}
            {isDev && (
                <DevtoolsLazy queryClient={queryClient} />
            )}
        </QueryClientProvider>
    );
}

// Lazy-load devtools so they are never bundled in production
function DevtoolsLazy({ queryClient }: { queryClient: QueryClient }) {
    const [Devtools, setDevtools] = useState<React.ComponentType<any> | null>(null);

    useState(() => {
        import('@tanstack/react-query-devtools').then((m) =>
            setDevtools(() => m.ReactQueryDevtools)
        );
    });

    if (!Devtools) return null;
    return <Devtools initialIsOpen={false} />;
}
