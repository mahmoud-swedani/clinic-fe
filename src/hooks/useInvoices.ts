import { useQuery, keepPreviousData, useQueryClient } from '@tanstack/react-query'
import { useEffect, useRef } from 'react'
import axios from '@/lib/axios'
import { queryKeys } from '@/lib/queryKeys'
import { PaginatedResponse, Invoice, ApiResponse } from '@/types/api'
import { usePagination } from './usePagination'
import { setGlobalRateLimited, cleanupExpiredRateLimit } from '@/lib/rateLimit'

export const useInvoices = () => {
  const { page, limit } = usePagination(10)
  const queryClient = useQueryClient()
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const isRefetchingRef = useRef<boolean>(false)

  useEffect(() => {
    const cleanupInterval = setInterval(cleanupExpiredRateLimit, 1000)
    return () => clearInterval(cleanupInterval)
  }, [])

  const query = useQuery({
    queryKey: queryKeys.invoices.list({ page, limit }),
    queryFn: async () => {
      const { data } = await axios.get<PaginatedResponse<Invoice>>('/invoices', {
        params: { page, limit },
      })
      return data // Return full PaginatedResponse
    },
    staleTime: 0, // 0 seconds - data is immediately stale for real-time updates
    refetchOnWindowFocus: false, // Don't refetch on window focus - polling handles updates
    retry: 1,
    placeholderData: keepPreviousData,
  })

  // Manual polling for real-time updates
  useEffect(() => {
    // Clear any existing interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
    }

    const baseInterval = 30 * 1000 // 30 seconds polling interval (reduced for faster updates)

    const refetchInvoices = async () => {
      // Only refetch if tab is visible and not already refetching
      if (document.hidden || isRefetchingRef.current) return

      // Check if data needs refetching (reduced threshold for faster updates)
      if (query.dataUpdatedAt) {
        const timeSinceUpdate = Date.now() - query.dataUpdatedAt
        // Only refetch if data is older than 20 seconds (reduced from 50)
        if (timeSinceUpdate <= 20 * 1000) return
      }

      try {
        isRefetchingRef.current = true
        await queryClient.refetchQueries({
          queryKey: queryKeys.invoices.list({ page, limit }),
        })
      } catch (error) {
        console.error('Error refetching invoices:', error)
      } finally {
        isRefetchingRef.current = false
      }
    }

    const startPolling = () => {
      // Refetch immediately on mount/visibility change
      refetchInvoices()
      
      // Then poll at regular intervals
      intervalRef.current = setInterval(refetchInvoices, baseInterval)
    }

    startPolling()

    // Also refetch when tab becomes visible
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        refetchInvoices()
      }
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)

    // Cleanup on unmount
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [page, limit, queryClient, query.dataUpdatedAt])

  return query
}

export const useInvoiceById = (id: string) => {
  const queryClient = useQueryClient()
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const isRefetchingRef = useRef<boolean>(false)

  useEffect(() => {
    const cleanupInterval = setInterval(cleanupExpiredRateLimit, 1000)
    return () => clearInterval(cleanupInterval)
  }, [])

  const query = useQuery({
    queryKey: queryKeys.invoices.detail(id),
    queryFn: async () => {
      const { data } = await axios.get<ApiResponse<Invoice>>(`/invoices/${id}`)
      return data.data // Extract invoice from ApiResponse
    },
    enabled: !!id,
    staleTime: 0, // 0 seconds - data is immediately stale for real-time updates
    refetchOnWindowFocus: false, // Don't refetch on window focus - polling handles updates
    retry: (failureCount, error: unknown) => {
      // Don't retry on 429 (rate limit) errors
      const axiosError = error as { response?: { status?: number } } | null
      if (axiosError?.response?.status === 429) {
        setGlobalRateLimited()
        return false
      }
      return failureCount < 1
    },
  })

  // Manual polling for real-time updates (similar to payments)
  useEffect(() => {
    if (!id) return

    // Clear any existing interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
    }

    let baseInterval = 60 * 1000 // 60 seconds polling interval
    let consecutiveErrors = 0
    const maxConsecutiveErrors = 3

    const refetchInvoice = async () => {
      // Only refetch if tab is visible and not already refetching
      if (document.hidden || isRefetchingRef.current) return

      // Check if data needs refetching
      if (query.dataUpdatedAt) {
        const timeSinceUpdate = Date.now() - query.dataUpdatedAt
        // Only refetch if data is older than 50 seconds
        if (timeSinceUpdate <= 50 * 1000) return
      }

      try {
        isRefetchingRef.current = true
        await queryClient.refetchQueries({
          queryKey: queryKeys.invoices.detail(id),
        })
        // Reset error count on success
        consecutiveErrors = 0
        baseInterval = 60 * 1000 // Reset to base interval
      } catch (error: unknown) {
        // If rate limited, don't log as error, just handle it
        const axiosError = error as { response?: { status?: number } }
        if (axiosError?.response?.status === 429) {
          console.warn('Rate limit hit for invoice polling, backing off')
          setGlobalRateLimited()
          consecutiveErrors++
          baseInterval = Math.min(baseInterval * 2, 5 * 60 * 1000) // Max 5 minutes
          
          // Stop polling if too many consecutive errors
          if (consecutiveErrors >= maxConsecutiveErrors) {
            console.warn('Too many rate limit errors, stopping polling temporarily')
            if (intervalRef.current) {
              clearInterval(intervalRef.current)
              intervalRef.current = null
            }
            // Resume after 5 minutes
            setTimeout(() => {
              consecutiveErrors = 0
              baseInterval = 60 * 1000
              if (intervalRef.current) {
                clearInterval(intervalRef.current)
              }
              intervalRef.current = setInterval(refetchInvoice, baseInterval)
            }, 5 * 60 * 1000)
            return
          }
          
          // Restart polling with new interval
          if (intervalRef.current) {
            clearInterval(intervalRef.current)
          }
          intervalRef.current = setInterval(refetchInvoice, baseInterval)
        } else {
          console.error('Error refetching invoice:', error)
        }
      } finally {
        isRefetchingRef.current = false
      }
    }

    const startPolling = () => {
      // Don't refetch immediately on mount to avoid rate limiting
      // Wait 10 seconds before first refetch to reduce initial load
      setTimeout(() => {
        if (!document.hidden && !isRefetchingRef.current) {
          refetchInvoice()
        }
      }, 10000)
      
      // Then poll at regular intervals
      intervalRef.current = setInterval(refetchInvoice, baseInterval)
    }

    startPolling()

    // Also refetch when tab becomes visible (with delay to avoid rate limiting)
    const handleVisibilityChange = () => {
      if (!document.hidden && !isRefetchingRef.current) {
        // Wait a bit before refetching to avoid rate limiting
        setTimeout(() => {
          if (!document.hidden && !isRefetchingRef.current) {
            refetchInvoice()
          }
        }, 2000)
      }
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)

    // Cleanup on unmount
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [id, queryClient, query.dataUpdatedAt])

  return query
}
