// ✅ src/hooks/useProducts.ts
'use client'

import { useQuery, keepPreviousData } from '@tanstack/react-query'
import axios from '@/lib/axios'
import { queryKeys } from '@/lib/queryKeys'
import { PaginatedResponse, Product } from '@/types/api'
import { usePagination } from './usePagination'

export const useProducts = () => {
  const { page, limit } = usePagination(10)

  return useQuery({
    queryKey: queryKeys.products.list({ page, limit }),
    queryFn: async () => {
      const { data } = await axios.get<PaginatedResponse<Product>>('/products', {
        params: { page, limit },
      })
      return data // Return full PaginatedResponse
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    placeholderData: keepPreviousData,
  })
}
