// src/hooks/usePatientMedications.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import axios from '@/lib/axios'
import { PatientMedication, PaginatedResponse } from '@/types/api'
import { toast } from 'sonner'

export function usePatientMedications(patientId: string, page: number = 1, limit: number = 50) {
  return useQuery({
    queryKey: ['patient-medications', patientId, page, limit],
    queryFn: async () => {
      const { data } = await axios.get<PaginatedResponse<PatientMedication>>(
        `/patients/${patientId}/medications`,
        { params: { page, limit } }
      )
      return data
    },
    enabled: !!patientId,
  })
}

export function useCreatePatientMedication() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ patientId, medicationData }: { patientId: string; medicationData: Partial<PatientMedication> }) => {
      const { data } = await axios.post(`/patients/${patientId}/medications`, medicationData)
      return data
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['patient-medications', variables.patientId] })
      toast.success('تم إضافة سجل الدواء بنجاح ✅')
    },
    onError: () => {
      toast.error('حدث خطأ أثناء إضافة سجل الدواء')
    },
  })
}

export function useUpdatePatientMedication() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, medicationData }: { id: string; medicationData: Partial<PatientMedication> }) => {
      const { data } = await axios.put(`/medications/${id}`, medicationData)
      return data
    },
    onSuccess: (data) => {
      const patientId = data?.data?.patient?._id || data?.data?.patient
      if (patientId) {
        queryClient.invalidateQueries({ queryKey: ['patient-medications', patientId] })
      }
      toast.success('تم تحديث سجل الدواء بنجاح ✅')
    },
    onError: () => {
      toast.error('حدث خطأ أثناء تحديث سجل الدواء')
    },
  })
}

export function useDeletePatientMedication() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await axios.delete(`/medications/${id}`)
      return data
    },
    onSuccess: (data) => {
      const patientId = data?.data?.patient?._id || data?.data?.patient
      if (patientId) {
        queryClient.invalidateQueries({ queryKey: ['patient-medications', patientId] })
      }
      toast.success('تم حذف سجل الدواء بنجاح ✅')
    },
    onError: () => {
      toast.error('حدث خطأ أثناء حذف سجل الدواء')
    },
  })
}

