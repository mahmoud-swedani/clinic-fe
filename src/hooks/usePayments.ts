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
    retry: 1,
  })

  // Manual polling for real-time updates (similar to appointments)
  useEffect(() => {
    if (!invoiceId) return

    // Clear any existing interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
    }

    const baseInterval = 60 * 1000 // 60 seconds polling interval

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
      } catch (error) {
        console.error('Error refetching payments:', error)
      } finally {
        isRefetchingRef.current = false
      }
    }

    const startPolling = () => {
      // Refetch immediately on mount/visibility change
      refetchPayments()
      
      // Then poll at regular intervals
      intervalRef.current = setInterval(refetchPayments, baseInterval)
    }

    startPolling()

    // Also refetch when tab becomes visible
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        refetchPayments()
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