// src/hooks/useBranches.ts
import { useQuery, keepPreviousData } from '@tanstack/react-query'
import axios from '@/lib/axios'
import { queryKeys } from '@/lib/queryKeys'
import { PaginatedResponse, Branch } from '@/types/api'
import { usePagination } from './usePagination'

export function useBranches() {
  const { page, limit } = usePagination(10)

  return useQuery({
    queryKey: queryKeys.branches.list({ page, limit }),
    queryFn: async () => {
      const { data } = await axios.get<PaginatedResponse<Branch>>('/branches', {
        params: { page, limit },
      })
      return data // Return full PaginatedResponse
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    placeholderData: keepPreviousData,
  })
}
