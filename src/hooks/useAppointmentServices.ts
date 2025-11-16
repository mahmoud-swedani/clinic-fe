import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import axios from '@/lib/axios'
import { AppointmentService, TreatmentStage, ApiResponse } from '@/types/api'
import { toast } from 'sonner'

/**
 * Hook to fetch all services for an appointment
 */
export const useAppointmentServices = (appointmentId: string | undefined) => {
  return useQuery({
    queryKey: ['appointment-services', appointmentId],
    queryFn: async () => {
      if (!appointmentId) return []
      const { data } = await axios.get<ApiResponse<AppointmentService[]>>(
        `/appointments/${appointmentId}/services`
      )
      return data.data || []
    },
    enabled: !!appointmentId,
  })
}

/**
 * Hook to fetch treatment stages for a specific appointment service
 */
export const useAppointmentServiceTreatmentStages = (appointmentServiceId: string | undefined) => {
  return useQuery({
    queryKey: ['treatment-stages', 'appointment-service', appointmentServiceId],
    queryFn: async () => {
      if (!appointmentServiceId) return []
      const { data } = await axios.get<ApiResponse<TreatmentStage[]>>(
        `/treatment-stages/appointment-service/${appointmentServiceId}`
      )
      return data.data || []
    },
    enabled: !!appointmentServiceId,
  })
}

/**
 * Hook to add a service to an appointment
 */
export const useAddServiceToAppointment = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ appointmentId, serviceId }: { appointmentId: string; serviceId: string }) => {
      const { data } = await axios.post<ApiResponse<AppointmentService>>(
        `/appointments/${appointmentId}/services`,
        { serviceId }
      )
      return data.data
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['appointment-services', variables.appointmentId] })
      queryClient.invalidateQueries({ queryKey: ['appointment', variables.appointmentId] })
      toast.success('تم إضافة الخدمة بنجاح')
    },
    onError: (error: unknown) => {
      const axiosError = error as { response?: { data?: { message?: string } } }
      toast.error(axiosError.response?.data?.message || 'فشل في إضافة الخدمة')
    },
  })
}

/**
 * Hook to remove a service from an appointment
 */
export const useRemoveServiceFromAppointment = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ appointmentId, serviceId }: { appointmentId: string; serviceId: string }) => {
      await axios.delete(`/appointments/${appointmentId}/services/${serviceId}`)
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['appointment-services', variables.appointmentId] })
      queryClient.invalidateQueries({ queryKey: ['appointment', variables.appointmentId] })
      toast.success('تم حذف الخدمة بنجاح')
    },
    onError: (error: unknown) => {
      const axiosError = error as { response?: { data?: { message?: string } } }
      toast.error(axiosError.response?.data?.message || 'فشل في حذف الخدمة')
    },
  })
}

