// src/hooks/useDashboard.ts
import { useQuery } from '@tanstack/react-query'
import axios from '@/lib/axios'
import { queryKeys } from '@/lib/queryKeys'
import { ApiResponse, DashboardData } from '@/types/api'

export const useDashboard = () => {
  return useQuery({
    queryKey: queryKeys.dashboard.stats(),
    queryFn: async () => {
      const { data } = await axios.get<ApiResponse<DashboardData>>('/dashboard')
      return data.data // Extract data from ApiResponse
    },
    staleTime: 5 * 60 * 1000, // 5 دقائق
    retry: 1,
  })
}
