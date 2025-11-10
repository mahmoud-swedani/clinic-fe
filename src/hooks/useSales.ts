// ✅ src/hooks/useSales.ts
'use client'

import { useQuery, keepPreviousData } from '@tanstack/react-query'
import axios from '@/lib/axios'
import { queryKeys } from '@/lib/queryKeys'
import { PaginatedResponse, Sale } from '@/types/api'
import { usePagination } from './usePagination'

export const useSales = () => {
  const { page, limit } = usePagination(10)

  return useQuery({
    queryKey: queryKeys.sales.list({ page, limit }),
    queryFn: async () => {
      const { data } = await axios.get<PaginatedResponse<Sale>>('/sales', {
        params: { page, limit },
      })
      return data // Return full PaginatedResponse
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    placeholderData: keepPreviousData,
  })
}
