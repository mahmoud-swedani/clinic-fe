// src/hooks/useAuditLogs.ts
import { useQuery, keepPreviousData } from '@tanstack/react-query'
import axios from '@/lib/axios'
import { queryKeys } from '@/lib/queryKeys'
import { ApiResponse, PaginatedResponse, AuditLog } from '@/types/api'

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
  limit?: number
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
    staleTime: 2 * 60 * 1000, // 2 minutes
    placeholderData: keepPreviousData,
  })
}

// Get audit history for a specific entity
export function useEntityAuditHistory(
  entityType: string,
  entityId: string,
  limit?: number
) {
  return useQuery({
    queryKey: queryKeys.auditLogs.entity(entityType, entityId),
    queryFn: async () => {
      const { data } = await axios.get<ApiResponse<AuditLog[]>>(
        `/audit-logs/entity/${entityType}/${entityId}`,
        {
          params: { limit },
        }
      )
      return data.data
    },
    enabled: !!entityType && !!entityId,
    staleTime: 2 * 60 * 1000, // 2 minutes
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

