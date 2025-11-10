// src/hooks/useAnalyticsFilters.ts
import { useSearchParams } from 'next/navigation'
import { useMemo } from 'react'
import { AnalyticsFilters } from '@/types/api'

export const useAnalyticsFilters = (): AnalyticsFilters => {
  const searchParams = useSearchParams()

  return useMemo(() => {
    const filters: AnalyticsFilters = {}

    const branchId = searchParams.get('branchId')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const departmentId = searchParams.get('departmentId')
    const serviceId = searchParams.get('serviceId')

    if (branchId) filters.branchId = branchId
    if (startDate) filters.startDate = startDate
    if (endDate) filters.endDate = endDate
    if (departmentId) filters.departmentId = departmentId
    if (serviceId) filters.serviceId = serviceId

    return filters
  }, [searchParams])
}







