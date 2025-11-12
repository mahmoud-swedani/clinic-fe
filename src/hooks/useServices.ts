import { useQuery, keepPreviousData } from '@tanstack/react-query'
import axios from '@/lib/axios'
import { queryKeys } from '@/lib/queryKeys'
import { PaginatedResponse, Service } from '@/types/api'
import { usePagination } from './usePagination'

export const useServices = () => {
  const { page, limit } = usePagination(10)

  return useQuery({
    queryKey: queryKeys.services.list({ page, limit }),
    queryFn: async () => {
      const { data } = await axios.get<PaginatedResponse<Service>>('/services', {
        params: { page, limit },
      })
      return data // Return full PaginatedResponse
    },
    staleTime: 10 * 60 * 1000, // 10 minutes - services don't change frequently
    refetchOnWindowFocus: false, // Don't refetch on window focus to reduce rate limiting
    refetchOnMount: false, // Don't refetch on mount if data is fresh
    placeholderData: keepPreviousData,
    retry: (failureCount, error: { response?: { status?: number } }) => {
      // Don't retry on 429 (rate limit) errors
      if (error?.response?.status === 429) {
        return false
      }
      return failureCount < 1
    },
  })
}
