// src/hooks/useDoctorDashboard.ts
import { useQuery } from '@tanstack/react-query'
import { useCurrentUser } from './useCurrentUser'
import axios from '@/lib/axios'
import { PaginatedResponse, Appointment, TreatmentStage } from '@/types/api'
import { startOfToday, addDays, subWeeks } from 'date-fns'
import { useTodayAppointments as useTodayAppointmentsShared, useAppointmentsByDateRange } from './useAppointments'

// Helper to check if user is a doctor
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function isDoctor(user: any): boolean {
  if (!user) return false
  // Check role enum
  if (user.role === 'طبيب') return true
  // Check roleId if it's populated
  if (typeof user.roleId === 'object' && user.roleId !== null && user.roleId.name === 'طبيب') {
    return true
  }
  return false
}

/**
 * Hook to get today's appointments for the current doctor
 * Uses backend date filter for efficiency
 */
export function useTodayAppointments() {
  const { data: user } = useCurrentUser()
  const doctorId = user?._id || user?.id

  // Use the shared hook with doctor filter
  return useTodayAppointmentsShared({ doctorId: doctorId as string })
}

/**
 * Hook to get all upcoming appointments (future dates) for the current doctor
 * Uses backend date filter for efficiency
 */
export function useUpcomingAppointments() {
  const { data: user } = useCurrentUser()
  const doctorId = user?._id || user?.id
  const today = startOfToday()
  const futureDate = addDays(today, 30) // Next 30 days

  // Use the shared hook with date range and doctor filter
  return useAppointmentsByDateRange(today, futureDate, { doctorId: doctorId as string })
}

/**
 * Hook to get past appointments (last 3 weeks) for the current doctor
 * Uses backend date filter for efficiency
 */
export function usePastAppointments() {
  const { data: user } = useCurrentUser()
  const doctorId = user?._id || user?.id
  const today = startOfToday()
  const threeWeeksAgo = subWeeks(today, 3)

  // Use the shared hook with date range and doctor filter
  return useAppointmentsByDateRange(threeWeeksAgo, today, { doctorId: doctorId as string })
}

/**
 * Hook to get client statistics for the current doctor
 */
export function useDoctorClientStats() {
  const { data: user, isLoading: userLoading } = useCurrentUser()
  const doctorId = user?._id || user?.id

  return useQuery({
    queryKey: ['doctor', 'client-stats', doctorId],
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
      const uniqueClientIds = new Set(
        appointments.map((apt: Appointment) => {
          const client = apt.client
          return typeof client === 'object' && client !== null && '_id' in client
            ? client._id
            : typeof client === 'string' ? client : null
        }).filter((id): id is string => Boolean(id))
      )

      // Get treatment stages for this doctor
      // Backend filters by doctor when role is 'طبيب'
      const { data: stagesData } = await axios.get<PaginatedResponse<TreatmentStage>>('/treatment-stages', {
        params: {
          page: 1,
          limit: 1000,
        },
      })

      const stages = stagesData.data || []
      // Filter stages by doctor if available (backend should already filter, but double-check)
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
        totalClients: uniqueClientIds.size,
        totalAppointments: appointments.length,
        totalTreatmentStages: doctorStages.length,
        completedStages: completedStages.length,
        completionRate: Math.round(completionRate * 100) / 100,
      }
    },
    enabled: !!doctorId && !userLoading && isDoctor(user),
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

