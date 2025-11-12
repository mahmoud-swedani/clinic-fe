// src/hooks/useAppointments.ts
import { useQuery, keepPreviousData, useQueryClient } from '@tanstack/react-query'
import { useEffect, useRef } from 'react'
import axios from '@/lib/axios'
import { queryKeys } from '@/lib/queryKeys'
import { PaginatedResponse, Appointment } from '@/types/api'
import { usePagination } from './usePagination'
import { startOfToday, endOfToday } from 'date-fns'
import { isGloballyRateLimited, setGlobalRateLimited, cleanupExpiredRateLimit } from '@/lib/rateLimit'

export const useAppointments = (page?: number, limit?: number) => {
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
    queryKey: queryKeys.appointments.list({ page: currentPage, limit: currentLimit }),
    queryFn: async () => {
      const { data } = await axios.get<PaginatedResponse<Appointment>>('/appointments', {
        params: { page: currentPage, limit: currentLimit },
      })
      return data // Return full PaginatedResponse
    },
    enabled: !isRateLimited, // Disable query if globally rate limited
    staleTime: 0, // 0 seconds - data is immediately stale, allowing invalidation to trigger refetches immediately
    refetchOnWindowFocus: false, // Don't refetch on window focus - polling handles updates
    refetchOnMount: !isRateLimited, // Don't refetch on mount if rate limited
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

  // Manual polling with rate limit handling (similar to useAllAppointments)
  useEffect(() => {
    // Clear any existing interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
    }

    // Only poll when tab is visible
    const startPolling = () => {
      const baseInterval = 30 * 1000 // Base polling interval: 30 seconds (increased to avoid rate limiting)
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
            
            const queryState = queryClient.getQueryState(queryKeys.appointments.list({ page: currentPage, limit: currentLimit }))
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
              const backoffDelay = Math.max(30 * 1000 * backoffMultiplierRef.current, 60 * 1000)
              setTimeout(() => {
                startPolling()
              }, backoffDelay)
              
              return
            }
            
            // Refetch if data is missing, has error (not 429), or is older than 20 seconds
            const shouldRefetch = 
              (queryState?.status === 'error' && error?.response?.status !== 429) ||
              !queryState?.data ||
              (queryState?.data && 
               queryState?.dataUpdatedAt && 
               Date.now() - queryState.dataUpdatedAt > 20 * 1000) // Data older than 20 seconds

            if (shouldRefetch) {
              // Check if query is already fetching to avoid concurrent refetches
              const currentQueryState = queryClient.getQueryState(queryKeys.appointments.list({ page: currentPage, limit: currentLimit }))
              if (currentQueryState?.fetchStatus === 'fetching') {
                // Query is already fetching, skip this poll cycle to avoid race conditions
                return
              }

              // Force refetch - this will update the UI immediately
              try {
                await queryClient.refetchQueries({ 
                  queryKey: queryKeys.appointments.list({ page: currentPage, limit: currentLimit }),
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
            const err = error as { response?: { status?: number } } | undefined
            if (err?.response?.status === 429) {
              // Set global rate limit state
              setGlobalRateLimited()
              
              // Increase backoff multiplier (max 16x = 8 minutes)
              backoffMultiplierRef.current = Math.min(backoffMultiplierRef.current * 2, 16)
              
              // Clear current interval
              if (intervalRef.current) {
                clearInterval(intervalRef.current)
                intervalRef.current = null
              }
              
              // Wait before restarting polling (exponential backoff: 30s, 60s, 120s, 240s, 480s)
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
        // Immediately refetch when tab becomes visible if data is missing or older than 30 seconds (and not rate limited)
        const queryState = queryClient.getQueryState(queryKeys.appointments.list({ page, limit }))
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const error = queryState?.error as any
        const isRateLimited = error?.response?.status === 429
        if (!isRateLimited && (!queryState?.data || 
            (queryState?.dataUpdatedAt && Date.now() - queryState.dataUpdatedAt > 30 * 1000))) {
          queryClient.refetchQueries({ 
            queryKey: queryKeys.appointments.list({ page, limit }),
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

/**
 * Shared query function to fetch all appointments
 * Used by all hooks to ensure React Query properly deduplicates requests
 */
const fetchAllAppointments = async (): Promise<Appointment[]> => {
  let allAppointments: Appointment[] = []
  let page = 1
  const limit = 100 // Backend max limit
  let hasMore = true
  const maxPages = 20 // Reduced from 50 to 20 (2000 appointments max) for better performance

  while (hasMore && page <= maxPages) {
    const { data } = await axios.get<PaginatedResponse<Appointment>>('/appointments', {
      params: { page, limit },
    })
    
    const appointments = data.data || []
    allAppointments = [...allAppointments, ...appointments]
    
    const totalPages = data.pagination?.totalPages || 1
    hasMore = page < totalPages && appointments.length === limit
    page++
  }
  
  return allAppointments
}

/**
 * Shared hook to fetch all appointments once
 * Used by other hooks to avoid multiple parallel requests
 * Polls every 30 seconds to sync changes from other users (reduced frequency to avoid rate limiting)
 */
export const useAllAppointments = () => {
  const queryClient = useQueryClient()
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
    queryKey: ['appointments', 'all-shared'],
    queryFn: fetchAllAppointments,
    enabled: !isRateLimited, // Disable query if globally rate limited
    staleTime: 0, // 0 seconds - data is immediately stale, allowing invalidation to trigger refetches immediately
    refetchOnWindowFocus: false, // Don't refetch on window focus - polling handles updates
    refetchOnMount: !isRateLimited, // Don't refetch on mount if rate limited
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

  // Manual polling with rate limit handling
  useEffect(() => {
    // Clear any existing interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
    }

    // Only poll when tab is visible
    const startPolling = () => {
      const baseInterval = 30 * 1000 // Base polling interval: 30 seconds (increased to avoid rate limiting)
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
            
            const queryState = queryClient.getQueryState(['appointments', 'all-shared'])
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
              const backoffDelay = Math.max(30 * 1000 * backoffMultiplierRef.current, 60 * 1000)
              setTimeout(() => {
                startPolling()
              }, backoffDelay)
              
              return
            }
            
            // Refetch if there's an error (not 429), no data, or data is older than 20 seconds
            const shouldRefetch = 
              (queryState?.status === 'error' && error?.response?.status !== 429) ||
              !queryState?.data ||
              (queryState?.dataUpdatedAt && 
               Date.now() - queryState.dataUpdatedAt > 20 * 1000) // Data older than 20 seconds

            if (shouldRefetch) {
              // Check if query is already fetching to avoid concurrent refetches
              const currentQueryState = queryClient.getQueryState(['appointments', 'all-shared'])
              if (currentQueryState?.fetchStatus === 'fetching') {
                // Query is already fetching, skip this poll cycle to avoid race conditions
                return
              }

              try {
                await queryClient.refetchQueries({ 
                  queryKey: ['appointments', 'all-shared'],
                  type: 'active' // Only refetch active queries
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
            const err = error as { response?: { status?: number } } | undefined
            if (err?.response?.status === 429) {
              // Set global rate limit state
              setGlobalRateLimited()
              
              // Increase backoff multiplier (max 16x = 8 minutes)
              backoffMultiplierRef.current = Math.min(backoffMultiplierRef.current * 2, 16)
              
              // Clear current interval
              if (intervalRef.current) {
                clearInterval(intervalRef.current)
                intervalRef.current = null
              }
              
              // Wait before restarting polling (exponential backoff: 30s, 60s, 120s, 240s, 480s)
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
        // Immediately refetch when tab becomes visible (only if stale or no data, and not rate limited)
        const queryState = queryClient.getQueryState(['appointments', 'all-shared'])
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const error = queryState?.error as any
        const isRateLimited = error?.response?.status === 429
        if (!isRateLimited && (!queryState?.data || 
            (queryState?.dataUpdatedAt && Date.now() - queryState.dataUpdatedAt > 30 * 1000))) {
          queryClient.refetchQueries({ 
            queryKey: ['appointments', 'all-shared'],
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
  }, [queryClient])

  return query
}

/**
 * Fetch only today's appointments
 * Filters client-side using shared appointments cache
 */
export const useTodayAppointments = (filters?: { status?: string; doctorId?: string }) => {
  const today = startOfToday()
  const endOfDay = endOfToday()
  
  // Use shared appointments cache with select to filter
  return useQuery({
    queryKey: ['appointments', 'all-shared'],
    queryFn: fetchAllAppointments, // Use shared function for proper deduplication
    notifyOnChangeProps: 'all', // Force re-render on all changes
    select: (allAppointments) => {
      // Always create a new array with new object references to ensure React Query detects changes
      // Filter client-side for today's appointments
      return allAppointments
        .filter((apt: Appointment) => {
        if (!apt.date) return false
        const aptDate = new Date(apt.date)
        // Reset time to start of day for comparison
        const aptDateOnly = new Date(aptDate.getFullYear(), aptDate.getMonth(), aptDate.getDate())
        const todayOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate())
        const endOfDayOnly = new Date(endOfDay.getFullYear(), endOfDay.getMonth(), endOfDay.getDate())
        const isToday = aptDateOnly >= todayOnly && aptDateOnly <= endOfDayOnly
        
        if (!isToday) return false
        
        // Apply additional filters
        if (filters?.status && apt.status !== filters.status) return false
        if (filters?.doctorId) {
          const doctorId = typeof apt.doctor === 'object' && apt.doctor !== null
            ? ((apt.doctor as { _id?: string; id?: string })._id || (apt.doctor as { _id?: string; id?: string }).id)
            : apt.doctor
          if (doctorId !== filters.doctorId) return false
        }
        
        return true
      })
        .map((apt: Appointment) => ({ ...apt })) // Create new object references
    },
    staleTime: 30 * 1000, // 30 seconds - matches polling interval
    // Note: Polling is handled by useAllAppointments hook
    retry: 1,
  })
}

/**
 * Fetch overdue appointments (before today, not completed/cancelled)
 * Filters client-side using shared appointments cache
 */
export const useOverdueAppointments = () => {
  const today = startOfToday()
  
  // Use shared appointments cache with select to filter
  return useQuery({
    queryKey: ['appointments', 'all-shared'],
    queryFn: fetchAllAppointments, // Use shared function for proper deduplication
    notifyOnChangeProps: 'all', // Force re-render on all changes
    select: (allAppointments) => {
      // Always create a new array with new object references to ensure React Query detects changes
      // Filter client-side for overdue appointments
      return allAppointments
        .filter((apt: Appointment) => {
        if (!apt.date) return false
        const aptDate = new Date(apt.date)
        // Reset time to start of day for comparison
        const aptDateOnly = new Date(aptDate.getFullYear(), aptDate.getMonth(), aptDate.getDate())
        const todayOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate())
        
        // Only show appointments before today
        if (aptDateOnly >= todayOnly) return false
        
        // Exclude appointments that are already completed or cancelled
        if (apt.status === 'تم' || apt.status === 'ملغي') return false
        
        return true
      })
        .map((apt: Appointment) => ({ ...apt })) // Create new object references
    },
    staleTime: 30 * 1000, // 30 seconds - matches polling interval
    // Note: Polling is handled by useAllAppointments hook (shared cache)
    retry: 1,
  })
}

/**
 * Fetch appointments within a date range
 * Filters client-side using shared appointments cache
 */
export const useAppointmentsByDateRange = (
  startDate: Date,
  endDate: Date,
  filters?: { status?: string; doctorId?: string }
) => {
  // Use shared appointments cache with select to filter
  return useQuery({
    queryKey: ['appointments', 'all-shared'],
    queryFn: fetchAllAppointments, // Use shared function for proper deduplication
    notifyOnChangeProps: 'all', // Force re-render on all changes
    select: (allAppointments) => {
      // Always create a new array with new object references to ensure React Query detects changes
      // Filter client-side by date range
      return allAppointments
        .filter((apt: Appointment) => {
        if (!apt.date) return false
        const aptDate = new Date(apt.date)
        // Reset time to start of day for comparison
        const aptDateOnly = new Date(aptDate.getFullYear(), aptDate.getMonth(), aptDate.getDate())
        const startDateOnly = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate())
        const endDateOnly = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate())
        
        // Check if appointment is within date range
        const isInRange = aptDateOnly >= startDateOnly && aptDateOnly <= endDateOnly
        if (!isInRange) return false
        
        // Apply additional filters
        if (filters?.status && apt.status !== filters.status) return false
        if (filters?.doctorId) {
          const doctorId = typeof apt.doctor === 'object' && apt.doctor !== null
            ? ((apt.doctor as { _id?: string; id?: string })._id || (apt.doctor as { _id?: string; id?: string }).id)
            : apt.doctor
          if (doctorId !== filters.doctorId) return false
        }
        
        return true
      })
        .map((apt: Appointment) => ({ ...apt })) // Create new object references
    },
    enabled: !!startDate && !!endDate,
    staleTime: 30 * 1000, // 30 seconds - matches polling interval
    // Note: Polling is handled by useAllAppointments hook (shared cache)
    retry: 1,
  })
}

/**
 * Fetch upcoming appointments (after today)
 */
export const useUpcomingAppointments = (
  startDate?: Date,
  endDate?: Date,
  filters?: { status?: string; doctorId?: string }
) => {
  const today = startOfToday()
  const defaultEndDate = endDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days from now
  
  return useAppointmentsByDateRange(
    startDate || today,
    defaultEndDate,
    filters
  )
}
