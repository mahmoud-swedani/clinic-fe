// src/hooks/useDoctorDashboard.ts
import { useQuery } from '@tanstack/react-query'
import { useCurrentUser } from './useCurrentUser'
import axios from '@/lib/axios'
import { PaginatedResponse, Appointment, TreatmentStage } from '@/types/api'
import { startOfToday, endOfToday, addDays, isWithinInterval } from 'date-fns'

/**
 * Hook to get all appointments for the current doctor (backend filters by doctor)
 * Then filters client-side for today's appointments
 */
export function useTodayAppointments() {
  const { data: user } = useCurrentUser()
  const doctorId = user?._id

  return useQuery({
    queryKey: ['appointments', 'doctor', doctorId],
    queryFn: async () => {
      // Backend already filters by doctor when role is 'طبيب'
      const { data } = await axios.get<PaginatedResponse<Appointment>>('/appointments', {
        params: {
          page: 1,
          limit: 100, // Get enough to filter
        },
      })
      const appointments = data.data || []
      
      // Filter for today's appointments
      const today = startOfToday()
      const endOfDay = endOfToday()
      return appointments.filter((apt: Appointment) => {
        if (!apt.date) return false
        const aptDate = new Date(apt.date)
        return isWithinInterval(aptDate, { start: today, end: endOfDay })
      })
    },
    enabled: !!doctorId && user?.role === 'طبيب',
    staleTime: 1 * 60 * 1000, // 1 minute (frequent updates for schedule)
  })
}

/**
 * Hook to get upcoming appointments (next 7 days) for the current doctor
 */
export function useUpcomingAppointments() {
  const { data: user } = useCurrentUser()
  const doctorId = user?._id

  return useQuery({
    queryKey: ['appointments', 'doctor', 'upcoming', doctorId],
    queryFn: async () => {
      // Backend already filters by doctor when role is 'طبيب'
      const { data } = await axios.get<PaginatedResponse<Appointment>>('/appointments', {
        params: {
          page: 1,
          limit: 100, // Get enough to filter
        },
      })
      const appointments = data.data || []
      
      // Filter for upcoming appointments (next 7 days)
      const today = startOfToday()
      const endDate = addDays(today, 7)
      return appointments.filter((apt: Appointment) => {
        if (!apt.date) return false
        const aptDate = new Date(apt.date)
        return isWithinInterval(aptDate, { start: today, end: endDate })
      })
    },
    enabled: !!doctorId && user?.role === 'طبيب',
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

/**
 * Hook to get patient statistics for the current doctor
 */
export function useDoctorPatientStats() {
  const { data: user } = useCurrentUser()
  const doctorId = user?._id

  return useQuery({
    queryKey: ['doctor', 'patient-stats', doctorId],
    queryFn: async () => {
      // Get appointments for this doctor (backend filters by doctor)
      const { data: appointmentsData } = await axios.get<PaginatedResponse<Appointment>>(
        '/appointments',
        {
          params: {
            page: 1,
            limit: 1000, // Get enough to count
          },
        }
      )

      const appointments = appointmentsData.data || []
      const uniquePatientIds = new Set(
        appointments.map((apt: Appointment) => {
          const patient = apt.patient
          return typeof patient === 'object' && patient !== null && '_id' in patient
            ? patient._id
            : typeof patient === 'string' ? patient : null
        }).filter((id): id is string => Boolean(id))
      )

      // Get treatment stages for this doctor
      // Note: Backend might need to filter by doctor, but for now we'll get all and filter client-side
      const { data: stagesData } = await axios.get('/treatment-stages', {
        params: {
          page: 1,
          limit: 1000,
        },
      })

      const stages = (stagesData.data?.data || stagesData.data || []) as TreatmentStage[]
      // Filter stages by doctor if available
      const doctorStages = stages.filter(
        (stage: TreatmentStage) => {
          const doctor = stage.doctor
          return typeof doctor === 'object' && doctor !== null && '_id' in doctor
            ? doctor._id === doctorId
            : doctor === doctorId
        }
      )
      const completedStages = doctorStages.filter(
        (stage: TreatmentStage) => stage.isCompleted
      )
      const completionRate =
        doctorStages.length > 0
          ? (completedStages.length / doctorStages.length) * 100
          : 0

      return {
        totalPatients: uniquePatientIds.size,
        totalAppointments: appointments.length,
        totalTreatmentStages: doctorStages.length,
        completedStages: completedStages.length,
        completionRate: Math.round(completionRate * 100) / 100,
      }
    },
    enabled: !!doctorId && user?.role === 'طبيب',
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

