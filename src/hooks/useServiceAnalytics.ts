// src/hooks/useServiceAnalytics.ts
import { useQuery } from '@tanstack/react-query'
import axios from '@/lib/axios'
import { queryKeys } from '@/lib/queryKeys'
import { AnalyticsFilters } from '@/types/api'

export const useServiceAnalytics = (
  serviceId: string,
  filters?: AnalyticsFilters
) => {
  return useQuery({
    queryKey: queryKeys.analytics.service(
      serviceId,
      filters as Record<string, unknown> | undefined
    ),
    queryFn: async () => {
      const { data } = await axios.get(`/analytics/services/${serviceId}`, {
        params: filters,
      })
      return data.data // Extract data from ApiResponse
    },
    enabled: !!serviceId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 1,
  })
}







