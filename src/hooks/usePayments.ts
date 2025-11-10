// src/hooks/usePayments.ts
import { useQuery } from '@tanstack/react-query'
import axios from '@/lib/axios'
import { queryKeys } from '@/lib/queryKeys'
import { ApiResponse, Payment } from '@/types/api'

export const usePayments = () => {
  return useQuery({
    queryKey: queryKeys.payments.lists(),
    queryFn: async () => {
      const { data } = await axios.get<ApiResponse<Payment[]>>('/payments')
      return data.data // Extract data from ApiResponse
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}
