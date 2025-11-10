import { useQuery, keepPreviousData } from '@tanstack/react-query'
import axios from '@/lib/axios'
import { queryKeys } from '@/lib/queryKeys'
import { PaginatedResponse, Invoice } from '@/types/api'
import { usePagination } from './usePagination'

export const useInvoices = () => {
  const { page, limit } = usePagination(10)

  return useQuery({
    queryKey: queryKeys.invoices.list({ page, limit }),
    queryFn: async () => {
      const { data } = await axios.get<PaginatedResponse<Invoice>>('/invoices', {
        params: { page, limit },
      })
      return data // Return full PaginatedResponse
    },
    staleTime: 5 * 60 * 1000, // تخزين مؤقت لمدة 5 دقائق
    retry: 1,
    placeholderData: keepPreviousData,
  })
}
