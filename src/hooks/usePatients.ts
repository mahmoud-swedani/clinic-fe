import { useQuery, keepPreviousData } from '@tanstack/react-query'
import axios from '@/lib/axios'
import { queryKeys } from '@/lib/queryKeys'
import { PaginatedResponse, Patient } from '@/types/api'
import { usePagination } from './usePagination'

export const usePatients = () => {
  const { page, limit } = usePagination(10)

  return useQuery({
    queryKey: queryKeys.patients.list({ page, limit }),
    queryFn: async () => {
      const { data } = await axios.get<PaginatedResponse<Patient>>('/patients', {
        params: { page, limit },
      })
      return data // Return full PaginatedResponse
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    placeholderData: keepPreviousData, // Keep previous data while fetching new page
  })
}
