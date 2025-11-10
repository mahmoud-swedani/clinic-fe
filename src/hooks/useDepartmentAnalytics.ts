// src/hooks/useDepartmentAnalytics.ts
import { useQuery } from '@tanstack/react-query'
import axios from '@/lib/axios'
import { queryKeys } from '@/lib/queryKeys'
import { AnalyticsFilters } from '@/types/api'

export const useDepartmentAnalytics = (
  departmentId: string,
  filters?: AnalyticsFilters
) => {
  return useQuery({
    queryKey: queryKeys.analytics.department(
      departmentId,
      filters as Record<string, unknown> | undefined
    ),
    queryFn: async () => {
      const { data } = await axios.get(`/analytics/departments/${departmentId}`, {
        params: filters,
      })
      return data.data // Extract data from ApiResponse
    },
    enabled: !!departmentId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 1,
  })
}







