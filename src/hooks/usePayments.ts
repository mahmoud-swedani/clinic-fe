// src/hooks/usePayments.ts
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useRef } from 'react'
import axios from '@/lib/axios'
import { queryKeys } from '@/lib/queryKeys'
import { ApiResponse, Payment } from '@/types/api'

export const usePayments = () => {
  return useQuery({
    queryKey: queryKeys.payments.lists(),
    queryFn: async () => {
      const { data } = await axios.get<ApiResponse<Payment[]>>('/payments')
      return data.data // Extract data from ApiResponse
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

export const usePaymentsByInvoice = (invoiceId: string) => {
  const queryClient = useQueryClient()
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const isRefetchingRef = useRef<boolean>(false)

  const query = useQuery({
    queryKey: queryKeys.payments.byInvoice(invoiceId),
    queryFn: async () => {
      const { data } = await axios.get<ApiResponse<Payment[]>>(
        `/payments/invoice/${invoiceId}`
      )
      return data.data || [] // Extract payments from ApiResponse
    },
    enabled: !!invoiceId,
    staleTime: 0, // 0 seconds - data is immediately stale for real-time updates
    refetchOnWindowFocus: false, // Don't refetch on window focus - polling handles updates
    retry: (failureCount, error: unknown) => {
      // Don't retry on 429 (rate limit) errors
      const axiosError = error as { response?: { status?: number } } | null
      if (axiosError?.response?.status === 429) {
        return false
      }
      return failureCount < 1
    },
  })

  // Manual polling for real-time updates (similar to appointments)
  useEffect(() => {
    if (!invoiceId) return

    // Clear any existing interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
    }

    let baseInterval = 60 * 1000 // 60 seconds polling interval
    let consecutiveErrors = 0
    const maxConsecutiveErrors = 3

    const refetchPayments = async () => {
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
          queryKey: queryKeys.payments.byInvoice(invoiceId),
        })
        // Reset error count on success
        consecutiveErrors = 0
        baseInterval = 60 * 1000 // Reset to base interval
      } catch (error: unknown) {
        // If rate limited, don't log as error, just handle it
        const axiosError = error as { response?: { status?: number } }
        if (axiosError?.response?.status === 429) {
          console.warn('Rate limit hit for payments polling, backing off')
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
              intervalRef.current = setInterval(refetchPayments, baseInterval)
            }, 5 * 60 * 1000)
            return
          }
          
          // Restart polling with new interval
          if (intervalRef.current) {
            clearInterval(intervalRef.current)
          }
          intervalRef.current = setInterval(refetchPayments, baseInterval)
        } else {
          console.error('Error refetching payments:', error)
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
          refetchPayments()
        }
      }, 10000)
      
      // Then poll at regular intervals
      intervalRef.current = setInterval(refetchPayments, baseInterval)
    }

    startPolling()

    // Also refetch when tab becomes visible (with delay to avoid rate limiting)
    const handleVisibilityChange = () => {
      if (!document.hidden && !isRefetchingRef.current) {
        // Wait a bit before refetching to avoid rate limiting
        setTimeout(() => {
          if (!document.hidden && !isRefetchingRef.current) {
            refetchPayments()
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
  }, [invoiceId, queryClient, query.dataUpdatedAt])

  return query
}