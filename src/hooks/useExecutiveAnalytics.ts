// src/hooks/useExecutiveAnalytics.ts
import { useQuery } from '@tanstack/react-query'
import axios from '@/lib/axios'
import { queryKeys } from '@/lib/queryKeys'
import { AnalyticsFilters } from '@/types/api'

export const useExecutiveAnalytics = (filters?: AnalyticsFilters) => {
  return useQuery({
    queryKey: queryKeys.analytics.executive(
      filters as Record<string, unknown> | undefined
    ),
    queryFn: async () => {
      const { data } = await axios.get('/analytics/executive', {
        params: filters,
      })
      return data.data // Extract data from ApiResponse
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 1,
  })
}







