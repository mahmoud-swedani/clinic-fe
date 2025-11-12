// src/lib/cacheUtils.ts
// Cache utility functions for granular cache updates

import { QueryClient } from '@tanstack/react-query'
import { Appointment, PaginatedResponse } from '@/types/api'
import { queryKeys } from './queryKeys'

/**
 * Update a single appointment in the cache without refetching
 */
export function updateAppointmentInCache(
  queryClient: QueryClient,
  appointmentId: string,
  updates: Partial<Appointment>
) {
  // Update in the shared appointments cache (used by useAllAppointments, useTodayAppointments, useOverdueAppointments)
  queryClient.setQueriesData<Appointment[]>(
    { queryKey: ['appointments', 'all-shared'] },
    (oldData) => {
      if (!oldData) return oldData
      return oldData.map((apt) =>
        apt._id === appointmentId || apt.id === appointmentId
          ? { ...apt, ...updates }
          : apt
      )
    }
  )

  // Update in all appointment lists (paginated) - matches queryKeys.appointments.list()
  // Use exact: false to match all queries that start with ['appointments']
  // This will match ['appointments', 'list', { page, limit }] and any other variations
  queryClient.setQueriesData<PaginatedResponse<Appointment>>(
    { queryKey: ['appointments'], exact: false },
    (oldData) => {
      if (!oldData?.data) return oldData
      
      return {
        ...oldData,
        data: oldData.data.map((apt) =>
          apt._id === appointmentId || apt.id === appointmentId
            ? { ...apt, ...updates }
            : apt
        ),
      }
    }
  )

  // Update in today's appointments (legacy query key)
  queryClient.setQueriesData<Appointment[]>(
    { queryKey: ['appointments', 'today'] },
    (oldData) => {
      if (!oldData) return oldData
      return oldData.map((apt) =>
        apt._id === appointmentId || apt.id === appointmentId
          ? { ...apt, ...updates }
          : apt
      )
    }
  )

  // Update in overdue appointments (legacy query key)
  queryClient.setQueriesData<Appointment[]>(
    { queryKey: ['appointments', 'overdue'] },
    (oldData) => {
      if (!oldData) return oldData
      return oldData.map((apt) =>
        apt._id === appointmentId || apt.id === appointmentId
          ? { ...apt, ...updates }
          : apt
      )
    }
  )

  // Update in date range queries
  queryClient.setQueriesData<Appointment[]>(
    { queryKey: ['appointments', 'dateRange'] },
    (oldData) => {
      if (!oldData) return oldData
      return oldData.map((apt) =>
        apt._id === appointmentId || apt.id === appointmentId
          ? { ...apt, ...updates }
          : apt
      )
    }
  )

  // Update single appointment detail
  queryClient.setQueryData<Appointment>(
    queryKeys.appointments.detail(appointmentId),
    (oldData) => {
      if (!oldData) return oldData
      return { ...oldData, ...updates }
    }
  )
}

/**
 * Add a new appointment to the cache without refetching
 */
export function addAppointmentToCache(
  queryClient: QueryClient,
  appointment: Appointment
) {
  // Add to today's appointments if it's today
  const appointmentDate = appointment.date ? new Date(appointment.date) : null
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  
  if (appointmentDate) {
    appointmentDate.setHours(0, 0, 0, 0)
    if (appointmentDate.getTime() === today.getTime()) {
      queryClient.setQueriesData<Appointment[]>(
        { queryKey: ['appointments', 'today'] },
        (oldData) => {
          if (!oldData) return [appointment]
          // Check if already exists
          const exists = oldData.some(
            (apt) => apt._id === appointment._id || apt.id === appointment.id
          )
          if (exists) return oldData
          return [appointment, ...oldData]
        }
      )
    }
  }

  // Add to upcoming appointments if it's in the future
  if (appointmentDate && appointmentDate > today) {
    queryClient.setQueriesData<Appointment[]>(
      { queryKey: ['appointments', 'dateRange'] },
      (oldData) => {
        if (!oldData) return [appointment]
        const exists = oldData.some(
          (apt) => apt._id === appointment._id || apt.id === appointment.id
        )
        if (exists) return oldData
        return [appointment, ...oldData]
      }
    )
  }
}

/**
 * Remove an appointment from the cache without refetching
 */
export function removeAppointmentFromCache(
  queryClient: QueryClient,
  appointmentId: string
) {
  // Remove from all appointment lists
  queryClient.setQueriesData<PaginatedResponse<Appointment>>(
    { queryKey: ['appointments'] },
    (oldData) => {
      if (!oldData?.data) return oldData
      return {
        ...oldData,
        data: oldData.data.filter(
          (apt) => apt._id !== appointmentId && apt.id !== appointmentId
        ),
        pagination: {
          ...oldData.pagination,
          total: Math.max(0, oldData.pagination.total - 1),
        },
      }
    }
  )

  // Remove from today's appointments
  queryClient.setQueriesData<Appointment[]>(
    { queryKey: ['appointments', 'today'] },
    (oldData) => {
      if (!oldData) return oldData
      return oldData.filter(
        (apt) => apt._id !== appointmentId && apt.id !== appointmentId
      )
    }
  )

  // Remove from overdue appointments
  queryClient.setQueriesData<Appointment[]>(
    { queryKey: ['appointments', 'overdue'] },
    (oldData) => {
      if (!oldData) return oldData
      return oldData.filter(
        (apt) => apt._id !== appointmentId && apt.id !== appointmentId
      )
    }
  )

  // Remove from date range queries
  queryClient.setQueriesData<Appointment[]>(
    { queryKey: ['appointments', 'dateRange'] },
    (oldData) => {
      if (!oldData) return oldData
      return oldData.filter(
        (apt) => apt._id !== appointmentId && apt.id !== appointmentId
      )
    }
  )

  // Remove single appointment detail
  queryClient.removeQueries({
    queryKey: queryKeys.appointments.detail(appointmentId),
  })
}


