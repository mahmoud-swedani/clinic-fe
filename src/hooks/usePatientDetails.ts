// src/hooks/usePatientDetails.ts
import { useQuery } from '@tanstack/react-query'
import axios from '@/lib/axios'
import { queryKeys } from '@/lib/queryKeys'
import { ApiResponse, TreatmentStage, Sale } from '@/types/api'

export const usePatientDetails = (id: string) => {
  return useQuery({
    queryKey: queryKeys.treatmentStages.byPatient(id),
    queryFn: async () => {
      const { data } = await axios.get<ApiResponse<{
        stages: TreatmentStage[]
        sales: Sale[]
      }>>(`/treatment-stages/patient/${id}`)
      return data.data // Extract data from ApiResponse
    },
    enabled: !!id,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}
