/**
 * lib/queryClient.ts — Shared React Query client
 *
 * Singleton to ensure queryClient.clear() in authStore
 * wipes PHI cache on logout.
 */

import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            staleTime: 5 * 60 * 1000,   // 5 min — don't refetch if fresh
            gcTime: 10 * 60 * 1000,     // 10 min — keep cache in memory
            refetchOnWindowFocus: false, // clinical UX: don't surprise users
            // ✅ Smart retry: never retry 4xx (prevents duplicate mutations/DDoS)
            retry: (failureCount, error: unknown) => {
                const status = (error as { status?: number })?.status;
                if (status && status >= 400 && status < 500) return false;
                return failureCount < 3;
            },
            retryDelay: (attempt) =>
                Math.min(1000 * 2 ** attempt, 30_000) + Math.random() * 1000,
        },
        mutations: {
            // ✅ NEVER auto-retry mutations — duplicate appointment/payment POST = data disaster
            retry: 0,
        },
    },
});
