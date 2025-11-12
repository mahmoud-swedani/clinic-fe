// src/hooks/useTreatmentStages.ts

import { useQuery, keepPreviousData } from '@tanstack/react-query'
import { useState, useEffect } from 'react'
import axios from '@/lib/axios'
import { queryKeys } from '@/lib/queryKeys'
import { PaginatedResponse, TreatmentStage } from '@/types/api'
import { usePagination } from './usePagination'
import { isGloballyRateLimited, setGlobalRateLimited, cleanupExpiredRateLimit } from '@/lib/rateLimit'

export const useTreatmentStages = () => {
  const { page, limit } = usePagination(10)
  const [hasPermission, setHasPermission] = useState<boolean | null>(null)

  // Clean up expired rate limits periodically instead of during render
  useEffect(() => {
    const cleanupInterval = setInterval(() => {
      cleanupExpiredRateLimit()
    }, 1000) // Check every second for expired rate limits
    
    return () => clearInterval(cleanupInterval)
  }, [])
  
  // Check if globally rate limited - use direct call since it's now a pure function
  const isRateLimited = isGloballyRateLimited()

  return useQuery({
    queryKey: queryKeys.treatmentStages.list({ page, limit }),
    queryFn: async () => {
      try {
        const { data } = await axios.get<PaginatedResponse<TreatmentStage>>('/treatment-stages', {
          params: { page, limit },
        })
        setHasPermission(true)
        return data // Return full PaginatedResponse
      } catch (error: unknown) {
        // If user doesn't have permission (403), disable future requests
        const err = error as { response?: { status?: number } }
        if (err?.response?.status === 403) {
          setHasPermission(false)
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          return null as any // Return null to indicate no permission
        }
        // For other errors, rethrow
        throw error
      }
    },
    enabled: hasPermission !== false && !isRateLimited, // Disable if no permission or rate limited
    staleTime: 5 * 60 * 1000, // تخزين مؤقت لمدة 5 دقائق
    retry: (failureCount, error: { response?: { status?: number } }) => {
      // Don't retry on 403 errors (no permission) or 429 (rate limit)
      if (error?.response?.status === 403) {
        setHasPermission(false)
        return false
      }
      if (error?.response?.status === 429) {
        setGlobalRateLimited() // Set global rate limit state
        return false
      }
      return failureCount < 1 // Retry once for other errors
    },
    placeholderData: keepPreviousData,
  })
}
