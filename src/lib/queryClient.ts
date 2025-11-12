// src/lib/queryClient.ts
// Centralized QueryClient configuration for optimal performance

import { QueryClient } from '@tanstack/react-query'

/**
 * Creates a configured QueryClient with optimal defaults for performance
 */
export function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Data is considered fresh for 2 minutes
        staleTime: 2 * 60 * 1000, // 2 minutes
        // Cache data for 10 minutes after it becomes unused
        gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
        // Don't refetch on window focus to reduce unnecessary requests
        refetchOnWindowFocus: false,
        // Retry failed requests only once for faster failure handling
        retry: 1,
        // Don't refetch on mount if data is fresh
        refetchOnMount: true,
        // Don't refetch on reconnect immediately
        refetchOnReconnect: true,
      },
      mutations: {
        // Retry mutations once on failure
        retry: 1,
      },
    },
  })
}


