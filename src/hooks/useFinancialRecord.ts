// src/hooks/useFinancialRecord.ts
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import axios from '@/lib/axios'
import { queryKeys } from '@/lib/queryKeys'
import { ApiResponse, PaginatedResponse, FinancialRecord } from '@/types/api'
import { usePagination } from './usePagination'

// 1. جلب كل السجلات المالية (يمكن فلترتها حسب recordType بإضافة استعلام optional)
export const useFinancialRecords = (recordType?: string) => {
  const { page, limit } = usePagination(10)

  return useQuery({
    queryKey: queryKeys.financialRecords.list({ recordType, page, limit }),
    queryFn: async () => {
      const params: Record<string, unknown> = { page, limit }
      if (recordType) params.recordType = recordType
      
      const { data } = await axios.get<PaginatedResponse<FinancialRecord>>(
        '/financial-records',
        { params }
      )
      return data // Return full PaginatedResponse
    },
    staleTime: 5 * 60 * 1000, // 5 دقائق
    placeholderData: keepPreviousData,
  })
}

// 2. جلب سجل مالي واحد حسب الـ ID
export const useFinancialRecord = (id: string) => {
  return useQuery({
    queryKey: queryKeys.financialRecords.detail(id),
    queryFn: async () => {
      const { data } = await axios.get<ApiResponse<FinancialRecord>>(
        `/financial-records/${id}`
      )
      return data.data // Extract data from ApiResponse
    },
    enabled: !!id,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

// 3. إنشاء سجل مالي جديد
export const useCreateFinancialRecord = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (data: Partial<FinancialRecord>) => {
      const response = await axios.post<ApiResponse<FinancialRecord>>(
        '/financial-records',
        data
      )
      return response.data.data // Extract data from ApiResponse
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.financialRecords.all,
      })
    },
  })
}

// 4. إضافة دفعة لسجل مالي موجود
export const useAddPaymentToRecord = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({
      id,
      payment,
    }: {
      id: string
      payment: {
        amount: number
        method: 'cash' | 'check' | 'transfer' | 'other'
        notes?: string
        paymentDate?: string
      }
    }) => {
      const { data } = await axios.post<ApiResponse<FinancialRecord>>(
        `/financial-records/${id}/add-payment`,
        payment
      )
      return data.data // Extract data from ApiResponse
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.financialRecords.detail(variables.id),
      })
      queryClient.invalidateQueries({
        queryKey: queryKeys.financialRecords.all,
      })
    },
  })
}
