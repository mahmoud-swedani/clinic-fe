// src/hooks/usePatientAppointments.ts
import { useQuery } from '@tanstack/react-query'
import axios from '@/lib/axios'
import { ApiResponse, Appointment } from '@/types/api'

export function usePatientAppointments(patientId: string) {
  return useQuery({
    queryKey: ['appointments', 'patient', patientId],
    queryFn: async () => {
      const { data } = await axios.get<ApiResponse<Appointment[]>>(
        `/appointments/patient/${patientId}`
      )
      return data.data
    },
    enabled: !!patientId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

