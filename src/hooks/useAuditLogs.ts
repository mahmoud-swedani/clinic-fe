// src/hooks/useAuditLogs.ts
import { useQuery, keepPreviousData } from '@tanstack/react-query'
import axios from '@/lib/axios'
import { queryKeys } from '@/lib/queryKeys'
import { ApiResponse, PaginatedResponse, AuditLog } from '@/types/api'
import { isGloballyRateLimited, setGlobalRateLimited } from '@/lib/rateLimit'

// Get audit logs with filtering
export function useAuditLogs(
  filters?: {
    entityType?: string
    entityId?: string
    action?: string
    performedBy?: string
    startDate?: string
    endDate?: string
  },
  page?: number,
  limit?: number,
  enabled?: boolean
) {
  const currentPage = page || 1
  const currentLimit = limit || 50

  return useQuery({
    queryKey: queryKeys.auditLogs.list({
      ...filters,
      page: currentPage,
      limit: currentLimit,
    }),
    queryFn: async () => {
      const { data } = await axios.get<PaginatedResponse<AuditLog>>(
        '/audit-logs',
        {
          params: {
            ...filters,
            page: currentPage,
            limit: currentLimit,
          },
        }
      )
      return data
    },
    enabled: enabled !== false, // Default to true if not specified
    staleTime: 2 * 60 * 1000, // 2 minutes
    placeholderData: keepPreviousData,
    retry: (failureCount, error: { response?: { status?: number } }) => {
      // Don't retry on 403 (Forbidden) or 429 (rate limit) errors
      if (error?.response?.status === 403 || error?.response?.status === 429) {
        return false
      }
      return failureCount < 2
    },
    throwOnError: false, // Don't throw errors to prevent breaking the UI
  })
}

// Get audit history for a specific entity
export function useEntityAuditHistory(
  entityType: string,
  entityId: string,
  limit?: number,
  enabled: boolean = true
) {
  const isRateLimited = isGloballyRateLimited()

  return useQuery({
    queryKey: queryKeys.auditLogs.entity(entityType, entityId),
    queryFn: async () => {
      try {
        // Use specific routes for better permission handling
        if (entityType === 'Invoice') {
          const { data } = await axios.get<ApiResponse<AuditLog[]>>(
            `/audit-logs/invoices/${entityId}`,
            {
              params: { limit },
            }
          )
          return data.data
        }
        // Fallback to generic entity route for other types
        const { data } = await axios.get<ApiResponse<AuditLog[]>>(
          `/audit-logs/entity/${entityType}/${entityId}`,
          {
            params: { limit },
          }
        )
        return data.data
      } catch (error) {
        const axiosError = error as { response?: { status?: number } }
        if (axiosError?.response?.status === 429) {
          setGlobalRateLimited()
        }
        throw error
      }
    },
    enabled: enabled && !isRateLimited && !!entityType && !!entityId,
    staleTime: 2 * 60 * 1000, // 2 minutes
    refetchOnWindowFocus: false, // Don't refetch on window focus to reduce rate limiting
    refetchOnReconnect: false, // Don't refetch on reconnect to reduce rate limiting
    retry: (failureCount, error: { response?: { status?: number } }) => {
      // Don't retry on 403 (Forbidden) or 429 (rate limit) errors
      if (error?.response?.status === 403 || error?.response?.status === 429) {
        return false
      }
      return failureCount < 1 // Reduce retries
    },
    throwOnError: false, // Don't throw errors to prevent breaking the UI
  })
}

// Get audit history for a user
export function useUserAuditHistory(userId: string, limit?: number) {
  return useQuery({
    queryKey: queryKeys.auditLogs.user(userId),
    queryFn: async () => {
      const { data } = await axios.get<ApiResponse<AuditLog[]>>(
        `/audit-logs/user/${userId}`,
        {
          params: { limit },
        }
      )
      return data.data
    },
    enabled: !!userId,
    staleTime: 2 * 60 * 1000, // 2 minutes
  })
}

