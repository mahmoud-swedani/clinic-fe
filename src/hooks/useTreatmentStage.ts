// src/hooks/useTreatmentStage.ts

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import axios from '@/lib/axios'
import { queryKeys } from '@/lib/queryKeys'
import { TreatmentStage } from '@/types/api'
import { toast } from 'sonner'

// Fetch single treatment stage
export const useTreatmentStage = (id: string | undefined) => {
  return useQuery({
    queryKey: queryKeys.treatmentStages.detail(id || ''),
    queryFn: async () => {
      if (!id) return null
      const { data } = await axios.get<{ data: TreatmentStage }>(`/treatment-stages/${id}`)
      return data.data
    },
    enabled: !!id,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

// Update treatment stage mutation
export const useUpdateTreatmentStage = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<TreatmentStage> }) => {
      const { data: response } = await axios.put<{ data: TreatmentStage }>(
        `/treatment-stages/${id}`,
        data
      )
      return response.data
    },
    onSuccess: (updatedStage, variables) => {
      // Invalidate and refetch related queries
      queryClient.invalidateQueries({
        queryKey: queryKeys.treatmentStages.detail(variables.id),
      })
      queryClient.invalidateQueries({
        queryKey: queryKeys.treatmentStages.list(),
      })
      queryClient.invalidateQueries({
        queryKey: ['treatment-stages', 'appointment'],
      })
      queryClient.invalidateQueries({
        queryKey: ['patient'],
      })
      toast.success('تم تحديث المرحلة بنجاح')
    },
    onError: (error: { response?: { data?: { message?: string } }; message?: string }) => {
      const errorMessage =
        error?.response?.data?.message || error?.message || 'حدث خطأ أثناء التحديث'
      toast.error(errorMessage)
    },
  })
}

// Delete treatment stage mutation
export const useDeleteTreatmentStage = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      await axios.delete(`/treatment-stages/${id}`)
      return id
    },
    onSuccess: (deletedId) => {
      // Invalidate and refetch related queries
      queryClient.invalidateQueries({
        queryKey: queryKeys.treatmentStages.detail(deletedId),
      })
      queryClient.invalidateQueries({
        queryKey: queryKeys.treatmentStages.list(),
      })
      queryClient.invalidateQueries({
        queryKey: ['treatment-stages', 'appointment'],
      })
      queryClient.invalidateQueries({
        queryKey: ['patient'],
      })
      toast.success('تم حذف المرحلة بنجاح')
    },
    onError: (error: { response?: { data?: { message?: string } }; message?: string }) => {
      const errorMessage =
        error?.response?.data?.message || error?.message || 'حدث خطأ أثناء الحذف'
      toast.error(errorMessage)
    },
  })
}


