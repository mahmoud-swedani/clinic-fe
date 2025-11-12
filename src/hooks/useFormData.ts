// src/hooks/useFormData.ts
// Hooks for caching form data (patients, doctors, services, departments)

import { useQuery } from '@tanstack/react-query'
import axios from '@/lib/axios'
import { PaginatedResponse, Patient, User, Service, Department } from '@/types/api'

/**
 * Hook to fetch and cache all patients (for forms)
 * Uses longer staleTime since this data doesn't change frequently
 */
export function useFormPatients() {
  return useQuery({
    queryKey: ['form-data', 'patients'],
    queryFn: async () => {
      // Fetch all patients with a high limit
      const { data } = await axios.get<PaginatedResponse<Patient>>('/patients', {
        params: { page: 1, limit: 1000 },
      })
      return data.data || []
    },
    staleTime: 15 * 60 * 1000, // 15 minutes - form data doesn't change often
    gcTime: 30 * 60 * 1000, // Keep in cache for 30 minutes
    refetchOnWindowFocus: false, // Don't refetch on window focus to reduce rate limiting
    retry: (failureCount, error: { response?: { status?: number } }) => {
      // Don't retry on 429 (rate limit) errors
      if (error?.response?.status === 429) {
        return false
      }
      return failureCount < 1
    },
  })
}

/**
 * Hook to fetch and cache all doctors (for forms)
 */
export function useFormDoctors() {
  return useQuery({
    queryKey: ['form-data', 'doctors'],
    queryFn: async () => {
      const { data } = await axios.get<{ success: boolean; data: User[] }>('/user-roles/doctors')
      return data.data || []
    },
    staleTime: 15 * 60 * 1000, // 15 minutes - doctor list doesn't change frequently
    gcTime: 30 * 60 * 1000,
    refetchOnWindowFocus: false, // Don't refetch on window focus to reduce rate limiting
    retry: (failureCount, error: { response?: { status?: number } }) => {
      // Don't retry on 429 (rate limit) errors
      if (error?.response?.status === 429) {
        return false
      }
      return failureCount < 1
    },
  })
}

/**
 * Hook to fetch and cache all services (for forms)
 */
export function useFormServices() {
  return useQuery({
    queryKey: ['form-data', 'services'],
    queryFn: async () => {
      const { data } = await axios.get<PaginatedResponse<Service>>('/services', {
        params: { page: 1, limit: 1000 },
      })
      return data.data || []
    },
    staleTime: 15 * 60 * 1000, // 15 minutes - services don't change frequently
    gcTime: 30 * 60 * 1000,
    refetchOnWindowFocus: false, // Don't refetch on window focus to reduce rate limiting
    retry: (failureCount, error: { response?: { status?: number } }) => {
      // Don't retry on 429 (rate limit) errors
      if (error?.response?.status === 429) {
        return false
      }
      return failureCount < 1
    },
  })
}

/**
 * Hook to fetch and cache departments (for forms)
 * Requires branchId (backend requirement)
 */
export function useFormDepartments(branchId?: string) {
  return useQuery({
    queryKey: ['form-data', 'departments', branchId],
    queryFn: async () => {
      // Backend requires branchId, so it must be provided
      const params: Record<string, unknown> = { page: 1, limit: 1000, branchId: branchId! }
      const { data } = await axios.get<PaginatedResponse<Department>>('/departments', {
        params,
      })
      return data.data || []
    },
    staleTime: 15 * 60 * 1000, // 15 minutes - departments don't change frequently
    gcTime: 30 * 60 * 1000,
    refetchOnWindowFocus: false, // Don't refetch on window focus to reduce rate limiting
    enabled: !!branchId, // Only enabled when branchId is provided (backend requirement)
    retry: (failureCount, error: { response?: { status?: number } }) => {
      // Don't retry on 429 (rate limit) errors
      if (error?.response?.status === 429) {
        return false
      }
      return failureCount < 1
    },
  })
}

/**
 * Hook to fetch all form data in parallel
 * Useful when you need multiple form data sources
 */
export function useAllFormData(branchId?: string) {
  const patients = useFormPatients()
  const doctors = useFormDoctors()
  const services = useFormServices()
  const departments = useFormDepartments(branchId)

  return {
    patients: patients.data || [],
    doctors: doctors.data || [],
    services: services.data || [],
    departments: departments.data || [],
    isLoading: patients.isLoading || doctors.isLoading || services.isLoading || departments.isLoading,
    isError: patients.isError || doctors.isError || services.isError || departments.isError,
  }
}


