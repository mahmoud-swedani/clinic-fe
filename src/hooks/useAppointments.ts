// src/hooks/useAppointments.ts
import { useQuery, keepPreviousData } from '@tanstack/react-query'
import axios from '@/lib/axios'
import { queryKeys } from '@/lib/queryKeys'
import { PaginatedResponse, Appointment } from '@/types/api'
import { usePagination } from './usePagination'

export const useAppointments = () => {
  const { page, limit } = usePagination(10)

  return useQuery({
    queryKey: queryKeys.appointments.list({ page, limit }),
    queryFn: async () => {
      const { data } = await axios.get<PaginatedResponse<Appointment>>('/appointments', {
        params: { page, limit },
      })
      return data // Return full PaginatedResponse
    },
    staleTime: 5 * 60 * 1000,
    retry: 1,
    placeholderData: keepPreviousData,
  })
}
