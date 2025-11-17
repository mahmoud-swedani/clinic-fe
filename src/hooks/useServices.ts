import { useQuery, keepPreviousData } from '@tanstack/react-query'
import axios from '@/lib/axios'
import { queryKeys } from '@/lib/queryKeys'
import { PaginatedResponse, Service } from '@/types/api'

export interface ServiceFilters {
  search?: string
  minPrice?: number
  maxPrice?: number
  minDuration?: number
  maxDuration?: number
  isActive?: boolean
  requiresConsultation?: boolean
  departmentId?: string
}

export const useServices = () => {
  return useQuery({
    queryKey: queryKeys.services.list({ page: 1, limit: 1000 }),
    queryFn: async () => {
      const { data } = await axios.get<PaginatedResponse<Service>>('/services', {
        params: { page: 1, limit: 1000 },
      })
      return data // Paginated response with data + pagination
    },
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    placeholderData: keepPreviousData,
    retry: (failureCount, error: { response?: { status?: number } }) => {
      if (error?.response?.status === 429) {
        return false
      }
      return failureCount < 1
    },
  })
}
