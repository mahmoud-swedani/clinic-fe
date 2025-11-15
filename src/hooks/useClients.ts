import { useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import { useEffect, useRef } from 'react'
import axios from '@/lib/axios'
import { queryKeys } from '@/lib/queryKeys'
import { PaginatedResponse, Client } from '@/types/api'
import { usePagination } from './usePagination'
import { isGloballyRateLimited, setGlobalRateLimited, cleanupExpiredRateLimit } from '@/lib/rateLimit'

export const useClients = (page?: number, limit?: number) => {
  const queryClient = useQueryClient()
  // Use provided pagination or fallback to internal pagination hook
  const internalPagination = usePagination(10)
  const currentPage = page ?? internalPagination.page
  const currentLimit = limit ?? internalPagination.limit
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const isRefetchingRef = useRef<boolean>(false)
  const backoffMultiplierRef = useRef<number>(1) // Exponential backoff multiplier

  // Check if globally rate limited - use direct call since it's now a pure function
  // Clean up expired rate limits periodically instead of during render
  useEffect(() => {
    const cleanupInterval = setInterval(() => {
      cleanupExpiredRateLimit()
    }, 1000) // Check every second for expired rate limits
    
    return () => clearInterval(cleanupInterval)
  }, [])
  
  const isRateLimited = isGloballyRateLimited()

  const query = useQuery({
    queryKey: queryKeys.clients.list({ page: currentPage, limit: currentLimit }),
    queryFn: async () => {
      const { data } = await axios.get<PaginatedResponse<Client>>('/clients', {
        params: { page: currentPage, limit: currentLimit },
      })
      return data // Return full PaginatedResponse
    },
    enabled: !isRateLimited, // Disable query if globally rate limited
    staleTime: 0, // 0 seconds - data is immediately stale, allowing invalidation to trigger refetches immediately
    refetchOnWindowFocus: false, // Don't refetch on window focus - polling handles updates
    refetchOnMount: () => {
      // Don't refetch on mount if we're rate limited
      const state = queryClient.getQueryState(queryKeys.clients.list({ page: currentPage, limit: currentLimit }))
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const error = (state?.error as any)?.response?.status
      return error !== 429
    },
    placeholderData: keepPreviousData,
    structuralSharing: false, // Disable structural sharing to ensure updates are detected
    notifyOnChangeProps: 'all', // Force re-render on all changes
    retry: (failureCount, error: { response?: { status?: number } }) => {
      // Don't retry on 429 (rate limit) errors
      if (error?.response?.status === 429) {
        setGlobalRateLimited() // Set global rate limit state
        return false
      }
      return failureCount < 1
    },
  })

  // Manual polling with rate limit handling (similar to useAppointments)
  useEffect(() => {
    // Clear any existing interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
    }

    // Only poll when tab is visible
    const startPolling = () => {
      const baseInterval = 60 * 1000 // Base polling interval: 60 seconds (clients change less frequently than appointments)
      const pollInterval = baseInterval * backoffMultiplierRef.current
      
      intervalRef.current = setInterval(async () => {
        // Only refetch if tab is visible and not already refetching
        if (!document.hidden && !isRefetchingRef.current) {
          try {
            isRefetchingRef.current = true
            
            // Check if globally rate limited or query has 429 error
            if (isGloballyRateLimited()) {
              // Globally rate limited, stop polling completely
              if (intervalRef.current) {
                clearInterval(intervalRef.current)
                intervalRef.current = null
              }
              return
            }
            
            const queryState = queryClient.getQueryState(queryKeys.clients.list({ page: currentPage, limit: currentLimit }))
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const error = queryState?.error as any
            if (error?.response?.status === 429) {
              // Already rate limited, set global state and stop polling
              setGlobalRateLimited()
              backoffMultiplierRef.current = Math.min(backoffMultiplierRef.current * 2, 16)
              
              // Clear interval and wait before restarting
              if (intervalRef.current) {
                clearInterval(intervalRef.current)
                intervalRef.current = null
              }
              
              // Wait at least 60 seconds before trying again
              const backoffDelay = Math.max(60 * 1000 * backoffMultiplierRef.current, 60 * 1000)
              setTimeout(() => {
                startPolling()
              }, backoffDelay)
              
              return
            }
            
            // Refetch if data is missing, has error (not 429), or is older than 60 seconds
            const shouldRefetch = 
              (queryState?.status === 'error' && error?.response?.status !== 429) ||
              !queryState?.data ||
              (queryState?.data && 
               queryState?.dataUpdatedAt && 
               Date.now() - queryState.dataUpdatedAt > 60 * 1000) // Data older than 60 seconds

            if (shouldRefetch) {
              // Check if query is already fetching to avoid concurrent refetches
              const currentQueryState = queryClient.getQueryState(queryKeys.clients.list({ page: currentPage, limit: currentLimit }))
              if (currentQueryState?.fetchStatus === 'fetching') {
                // Query is already fetching, skip this poll cycle to avoid race conditions
                return
              }

              // Force refetch - this will update the UI immediately
              try {
                await queryClient.refetchQueries({ 
                  queryKey: queryKeys.clients.list({ page: currentPage, limit: currentLimit }),
                  type: 'active' // Refetch active queries
                })
                
                // Reset backoff on successful refetch
                backoffMultiplierRef.current = 1
              } catch (refetchError: unknown) {
                // Handle rate limiting from refetchQueries
                const err = refetchError as { response?: { status?: number } }
                if (err?.response?.status === 429) {
                  throw refetchError // Re-throw to be caught by outer catch
                }
                throw refetchError
              }
            }
          } catch (error: unknown) {
            // Log error for debugging but don't break the polling loop
            console.error('Polling error:', error)
            
            // Handle rate limiting with exponential backoff
            const err = error as { response?: { status?: number } }
            if (err?.response?.status === 429) {
              // Set global rate limit state
              setGlobalRateLimited()
              
              // Increase backoff multiplier (max 16x = 16 minutes)
              backoffMultiplierRef.current = Math.min(backoffMultiplierRef.current * 2, 16)
              
              // Clear current interval
              if (intervalRef.current) {
                clearInterval(intervalRef.current)
                intervalRef.current = null
              }
              
              // Wait before restarting polling (exponential backoff: 60s, 120s, 240s, 480s, etc.)
              // Add minimum 60 seconds delay to give rate limiter time to reset
              const backoffDelay = Math.max(baseInterval * backoffMultiplierRef.current, 60 * 1000)
              setTimeout(() => {
                startPolling()
              }, backoffDelay)
              
              return // Exit early, don't reset isRefetchingRef
            }
            
            // For other errors, just log and continue polling
            // Don't break the polling loop for network errors or other issues
          } finally {
            isRefetchingRef.current = false
          }
        }
      }, pollInterval) // Poll at base interval with backoff multiplier
    }

    // Start polling
    startPolling()

    // Handle visibility change
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // Pause polling when tab is hidden
        if (intervalRef.current) {
          clearInterval(intervalRef.current)
          intervalRef.current = null
        }
      } else {
        // Resume polling when tab becomes visible
        backoffMultiplierRef.current = 1 // Reset backoff when tab becomes visible
        startPolling()
        // Immediately refetch when tab becomes visible if data is missing or older than 60 seconds (and not rate limited)
        const queryState = queryClient.getQueryState(queryKeys.clients.list({ page, limit }))
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const error = queryState?.error as any
        const isRateLimited = error?.response?.status === 429
        if (!isRateLimited && (!queryState?.data || 
            (queryState?.dataUpdatedAt && Date.now() - queryState.dataUpdatedAt > 60 * 1000))) {
          queryClient.refetchQueries({ 
            queryKey: queryKeys.clients.list({ page, limit }),
            type: 'active'
          })
        }
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)

    // Cleanup
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryClient, currentPage, currentLimit])

  return query
}
