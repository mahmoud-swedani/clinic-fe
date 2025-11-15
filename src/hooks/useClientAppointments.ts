// src/hooks/useClientAppointments.ts
import { useQuery } from '@tanstack/react-query'
import axios from '@/lib/axios'
import { ApiResponse, Appointment } from '@/types/api'

export function useClientAppointments(clientId: string) {
  return useQuery({
    queryKey: ['appointments', 'client', clientId],
    queryFn: async () => {
      const { data } = await axios.get<ApiResponse<Appointment[]>>(
        `/appointments/client/${clientId}`
      )
      return data.data
    },
    enabled: !!clientId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

