// src/hooks/useClientMedications.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import axios from '@/lib/axios'
import { ClientMedication, PaginatedResponse } from '@/types/api'
import { toast } from 'sonner'

export function useClientMedications(clientId: string, page: number = 1, limit: number = 50) {
  return useQuery({
    queryKey: ['client-medications', clientId, page, limit],
    queryFn: async () => {
      const { data } = await axios.get<PaginatedResponse<ClientMedication>>(
        `/clients/${clientId}/medications`,
        { params: { page, limit } }
      )
      return data
    },
    enabled: !!clientId,
  })
}

export function useCreateClientMedication() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ clientId, medicationData }: { clientId: string; medicationData: Partial<ClientMedication> }) => {
      const { data } = await axios.post(`/clients/${clientId}/medications`, medicationData)
      return data
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['client-medications', variables.clientId] })
      toast.success('تم إضافة سجل الدواء بنجاح ✅')
    },
    onError: () => {
      toast.error('حدث خطأ أثناء إضافة سجل الدواء')
    },
  })
}

export function useUpdateClientMedication() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, medicationData }: { id: string; medicationData: Partial<ClientMedication> }) => {
      const { data } = await axios.put(`/medications/${id}`, medicationData)
      return data
    },
    onSuccess: (data) => {
      const clientId = data?.data?.client?._id || data?.data?.client
      if (clientId) {
        queryClient.invalidateQueries({ queryKey: ['client-medications', clientId] })
      }
      toast.success('تم تحديث سجل الدواء بنجاح ✅')
    },
    onError: () => {
      toast.error('حدث خطأ أثناء تحديث سجل الدواء')
    },
  })
}

export function useDeleteClientMedication() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await axios.delete(`/medications/${id}`)
      return data
    },
    onSuccess: (data) => {
      const clientId = data?.data?.client?._id || data?.data?.client
      if (clientId) {
        queryClient.invalidateQueries({ queryKey: ['client-medications', clientId] })
      }
      toast.success('تم حذف سجل الدواء بنجاح ✅')
    },
    onError: () => {
      toast.error('حدث خطأ أثناء حذف سجل الدواء')
    },
  })
}

