// src/hooks/useClientTestResults.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import axios from '@/lib/axios'
import { ClientTestResult, PaginatedResponse } from '@/types/api'
import { toast } from 'sonner'

export function useClientTestResults(clientId: string, page: number = 1, limit: number = 50) {
  return useQuery({
    queryKey: ['client-test-results', clientId, page, limit],
    queryFn: async () => {
      const { data } = await axios.get<PaginatedResponse<ClientTestResult>>(
        `/clients/${clientId}/test-results`,
        { params: { page, limit } }
      )
      return data
    },
    enabled: !!clientId,
  })
}

export function useCreateClientTestResult() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ clientId, testResultData }: { clientId: string; testResultData: Partial<ClientTestResult> }) => {
      const { data } = await axios.post(`/clients/${clientId}/test-results`, testResultData)
      return data
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['client-test-results', variables.clientId] })
      toast.success('تم إضافة نتيجة الفحص بنجاح ✅')
    },
    onError: () => {
      toast.error('حدث خطأ أثناء إضافة نتيجة الفحص')
    },
  })
}

export function useUpdateClientTestResult() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, testResultData }: { id: string; testResultData: Partial<ClientTestResult> }) => {
      const { data } = await axios.put(`/test-results/${id}`, testResultData)
      return data
    },
    onSuccess: (data) => {
      const clientId = data?.data?.client?._id || data?.data?.client
      if (clientId) {
        queryClient.invalidateQueries({ queryKey: ['client-test-results', clientId] })
      }
      toast.success('تم تحديث نتيجة الفحص بنجاح ✅')
    },
    onError: () => {
      toast.error('حدث خطأ أثناء تحديث نتيجة الفحص')
    },
  })
}

export function useDeleteClientTestResult() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await axios.delete(`/test-results/${id}`)
      return data
    },
    onSuccess: (data) => {
      const clientId = data?.data?.client?._id || data?.data?.client
      if (clientId) {
        queryClient.invalidateQueries({ queryKey: ['client-test-results', clientId] })
      }
      toast.success('تم حذف نتيجة الفحص بنجاح ✅')
    },
    onError: () => {
      toast.error('حدث خطأ أثناء حذف نتيجة الفحص')
    },
  })
}

