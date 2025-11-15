import { useQuery, keepPreviousData, useQueryClient } from '@tanstack/react-query'
import { useEffect, useRef } from 'react'
import axios from '@/lib/axios'
import { queryKeys } from '@/lib/queryKeys'
import { PaginatedResponse, Invoice, ApiResponse } from '@/types/api'
import { usePagination } from './usePagination'

export const useInvoices = () => {
  const { page, limit } = usePagination(10)
  const queryClient = useQueryClient()
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const isRefetchingRef = useRef<boolean>(false)

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

  const query = useQuery({
    queryKey: queryKeys.invoices.detail(id),
    queryFn: async () => {
      const { data } = await axios.get<ApiResponse<Invoice>>(`/invoices/${id}`)
      return data.data // Extract invoice from ApiResponse
    },
    enabled: !!id,
    staleTime: 0, // 0 seconds - data is immediately stale for real-time updates
    refetchOnWindowFocus: false, // Don't refetch on window focus - polling handles updates
    retry: 1,
  })

  // Manual polling for real-time updates (similar to payments)
  useEffect(() => {
    if (!id) return

    // Clear any existing interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
    }

    const baseInterval = 60 * 1000 // 60 seconds polling interval

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
      } catch (error) {
        console.error('Error refetching invoice:', error)
      } finally {
        isRefetchingRef.current = false
      }
    }

    const startPolling = () => {
      // Refetch immediately on mount/visibility change
      refetchInvoice()
      
      // Then poll at regular intervals
      intervalRef.current = setInterval(refetchInvoice, baseInterval)
    }

    startPolling()

    // Also refetch when tab becomes visible
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        refetchInvoice()
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
