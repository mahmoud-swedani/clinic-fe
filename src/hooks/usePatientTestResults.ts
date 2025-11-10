// src/hooks/usePatientTestResults.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import axios from '@/lib/axios'
import { PatientTestResult, PaginatedResponse } from '@/types/api'
import { toast } from 'sonner'

export function usePatientTestResults(patientId: string, page: number = 1, limit: number = 50) {
  return useQuery({
    queryKey: ['patient-test-results', patientId, page, limit],
    queryFn: async () => {
      const { data } = await axios.get<PaginatedResponse<PatientTestResult>>(
        `/patients/${patientId}/test-results`,
        { params: { page, limit } }
      )
      return data
    },
    enabled: !!patientId,
  })
}

export function useCreatePatientTestResult() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ patientId, testResultData }: { patientId: string; testResultData: Partial<PatientTestResult> }) => {
      const { data } = await axios.post(`/patients/${patientId}/test-results`, testResultData)
      return data
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['patient-test-results', variables.patientId] })
      toast.success('تم إضافة نتيجة الفحص بنجاح ✅')
    },
    onError: () => {
      toast.error('حدث خطأ أثناء إضافة نتيجة الفحص')
    },
  })
}

export function useUpdatePatientTestResult() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, testResultData }: { id: string; testResultData: Partial<PatientTestResult> }) => {
      const { data } = await axios.put(`/test-results/${id}`, testResultData)
      return data
    },
    onSuccess: (data) => {
      const patientId = data?.data?.patient?._id || data?.data?.patient
      if (patientId) {
        queryClient.invalidateQueries({ queryKey: ['patient-test-results', patientId] })
      }
      toast.success('تم تحديث نتيجة الفحص بنجاح ✅')
    },
    onError: () => {
      toast.error('حدث خطأ أثناء تحديث نتيجة الفحص')
    },
  })
}

export function useDeletePatientTestResult() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await axios.delete(`/test-results/${id}`)
      return data
    },
    onSuccess: (data) => {
      const patientId = data?.data?.patient?._id || data?.data?.patient
      if (patientId) {
        queryClient.invalidateQueries({ queryKey: ['patient-test-results', patientId] })
      }
      toast.success('تم حذف نتيجة الفحص بنجاح ✅')
    },
    onError: () => {
      toast.error('حدث خطأ أثناء حذف نتيجة الفحص')
    },
  })
}

