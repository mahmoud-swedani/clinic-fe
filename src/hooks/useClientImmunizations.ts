// src/hooks/useClientImmunizations.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import axios from '@/lib/axios'
import { ClientImmunization, PaginatedResponse } from '@/types/api'
import { toast } from 'sonner'

export function useClientImmunizations(clientId: string, page: number = 1, limit: number = 50) {
  return useQuery({
    queryKey: ['client-immunizations', clientId, page, limit],
    queryFn: async () => {
      const { data } = await axios.get<PaginatedResponse<ClientImmunization>>(
        `/clients/${clientId}/immunizations`,
        { params: { page, limit } }
      )
      return data
    },
    enabled: !!clientId,
  })
}

export function useCreateClientImmunization() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ clientId, immunizationData }: { clientId: string; immunizationData: Partial<ClientImmunization> }) => {
      const { data } = await axios.post(`/clients/${clientId}/immunizations`, immunizationData)
      return data
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['client-immunizations', variables.clientId] })
      toast.success('تم إضافة سجل التطعيم بنجاح ✅')
    },
    onError: () => {
      toast.error('حدث خطأ أثناء إضافة سجل التطعيم')
    },
  })
}

export function useUpdateClientImmunization() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, immunizationData }: { id: string; immunizationData: Partial<ClientImmunization> }) => {
      const { data } = await axios.put(`/immunizations/${id}`, immunizationData)
      return data
    },
    onSuccess: (data) => {
      const clientId = data?.data?.client?._id || data?.data?.client
      if (clientId) {
        queryClient.invalidateQueries({ queryKey: ['client-immunizations', clientId] })
      }
      toast.success('تم تحديث سجل التطعيم بنجاح ✅')
    },
    onError: () => {
      toast.error('حدث خطأ أثناء تحديث سجل التطعيم')
    },
  })
}

export function useDeleteClientImmunization() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await axios.delete(`/immunizations/${id}`)
      return data
    },
    onSuccess: (data) => {
      const clientId = data?.data?.client?._id || data?.data?.client
      if (clientId) {
        queryClient.invalidateQueries({ queryKey: ['client-immunizations', clientId] })
      }
      toast.success('تم حذف سجل التطعيم بنجاح ✅')
    },
    onError: () => {
      toast.error('حدث خطأ أثناء حذف سجل التطعيم')
    },
  })
}

