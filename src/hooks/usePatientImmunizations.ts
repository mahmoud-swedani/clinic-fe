// src/hooks/usePatientImmunizations.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import axios from '@/lib/axios'
import { PatientImmunization, PaginatedResponse } from '@/types/api'
import { toast } from 'sonner'

export function usePatientImmunizations(patientId: string, page: number = 1, limit: number = 50) {
  return useQuery({
    queryKey: ['patient-immunizations', patientId, page, limit],
    queryFn: async () => {
      const { data } = await axios.get<PaginatedResponse<PatientImmunization>>(
        `/patients/${patientId}/immunizations`,
        { params: { page, limit } }
      )
      return data
    },
    enabled: !!patientId,
  })
}

export function useCreatePatientImmunization() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ patientId, immunizationData }: { patientId: string; immunizationData: Partial<PatientImmunization> }) => {
      const { data } = await axios.post(`/patients/${patientId}/immunizations`, immunizationData)
      return data
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['patient-immunizations', variables.patientId] })
      toast.success('تم إضافة سجل التطعيم بنجاح ✅')
    },
    onError: () => {
      toast.error('حدث خطأ أثناء إضافة سجل التطعيم')
    },
  })
}

export function useUpdatePatientImmunization() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, immunizationData }: { id: string; immunizationData: Partial<PatientImmunization> }) => {
      const { data } = await axios.put(`/immunizations/${id}`, immunizationData)
      return data
    },
    onSuccess: (data) => {
      const patientId = data?.data?.patient?._id || data?.data?.patient
      if (patientId) {
        queryClient.invalidateQueries({ queryKey: ['patient-immunizations', patientId] })
      }
      toast.success('تم تحديث سجل التطعيم بنجاح ✅')
    },
    onError: () => {
      toast.error('حدث خطأ أثناء تحديث سجل التطعيم')
    },
  })
}

export function useDeletePatientImmunization() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await axios.delete(`/immunizations/${id}`)
      return data
    },
    onSuccess: (data) => {
      const patientId = data?.data?.patient?._id || data?.data?.patient
      if (patientId) {
        queryClient.invalidateQueries({ queryKey: ['patient-immunizations', patientId] })
      }
      toast.success('تم حذف سجل التطعيم بنجاح ✅')
    },
    onError: () => {
      toast.error('حدث خطأ أثناء حذف سجل التطعيم')
    },
  })
}

