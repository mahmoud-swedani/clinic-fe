// src/hooks/useDepartments.ts
import { useQuery, keepPreviousData } from '@tanstack/react-query'
import axios from '@/lib/axios'
import { useCurrentUser } from './useCurrentUser'
import { queryKeys } from '@/lib/queryKeys'
import { PaginatedResponse, Department } from '@/types/api'
import { usePagination } from './usePagination'

export function useDepartments() {
  const { data: user, isLoading: userLoading } = useCurrentUser()
  const branchId = typeof user?.branch === 'string' ? user.branch : user?.branch?._id
  const { page, limit } = usePagination(10)

  return useQuery({
    queryKey: queryKeys.departments.list({ branchId, page, limit }),
    queryFn: async () => {
      const { data } = await axios.get<PaginatedResponse<Department>>('/departments', {
        params: {
          branchId,
          page,
          limit,
        },
      })
      return data // Return full PaginatedResponse
    },
    enabled: !!branchId && !userLoading,
    staleTime: 5 * 60 * 1000, // 5 minutes
    placeholderData: keepPreviousData,
  })
}
