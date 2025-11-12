// src/app/(dashboard)/dashboard/doctor/page.tsx
'use client'

import React, { useState, Suspense } from 'react'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { useTodayAppointments, useUpcomingAppointments, useDoctorPatientStats } from '@/hooks/useDoctorDashboard'
import { useTreatmentStages } from '@/hooks/useTreatmentStages'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { TreatmentStageForm } from '@/components/treatment-stages/treatment-stage-form'
import { TreatmentStageEditForm } from '@/components/treatment-stages/treatment-stage-edit-form'
import { format, startOfToday, endOfToday, isWithinInterval, startOfTomorrow, endOfTomorrow, startOfMonth, endOfMonth, addMonths, addDays, endOfDay, isToday, isPast, formatDistanceToNow, differenceInDays } from 'date-fns'
import { arSA } from 'date-fns/locale'
import { Calendar, Users, ClipboardList, TrendingUp, Plus, Eye, Clock, Activity, Pencil, CheckCircle2, XCircle, RefreshCw, FileEdit, Trash2, Search, X, AlertCircle } from 'lucide-react'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { toast } from 'sonner'
import { Appointment, TreatmentStage, PaginatedResponse, AuditLog } from '@/types/api'
import { useUserPermissions } from '@/hooks/usePermissions'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import axios from '@/lib/axios'
import { useRouter } from 'next/navigation'
import moment from 'moment'
import { cn } from '@/lib/utils'
import { useAuditLogs } from '@/hooks/useAuditLogs'
import { usePagination } from '@/hooks/usePagination'
import { Pagination } from '@/components/ui/Pagination'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

moment.locale('ar')

type NextAppointmentFilter = 'tomorrow' | 'nextWeeks' | 'nextMonth'

function DoctorDashboardContent() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const { data: currentUser } = useCurrentUser()
  const doctorId = currentUser?._id || currentUser?.id
  const [openAddStage, setOpenAddStage] = useState(false)
  const [openEditStage, setOpenEditStage] = useState(false)
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null)
  const [selectedStage, setSelectedStage] = useState<TreatmentStage | null>(null)
  const [nextAppointmentFilter, setNextAppointmentFilter] = useState<NextAppointmentFilter>('tomorrow')
  const [incompleteStageFilter, setIncompleteStageFilter] = useState<'all' | 'overdue' | 'recent'>('all')
  const [bulkUpdatingStages, setBulkUpdatingStages] = useState(false)
  const { canManageTreatmentStages, hasPermission } = useUserPermissions()
  const canEditStage = hasPermission('treatment-stages.edit')

  const { data: todayAppointments, isLoading: todayLoading } = useTodayAppointments()
  const { data: upcomingAppointments, isLoading: upcomingLoading } = useUpcomingAppointments()
  const { data: stats, isLoading: statsLoading } = useDoctorPatientStats()
  const { data: treatmentStagesData, isLoading: stagesLoading } = useTreatmentStages()

  // Get user permissions to check if user can view treatment stage activities
  const { data: currentUserForPermissions } = useCurrentUser()
  const { canViewTreatmentStageActivities } = useUserPermissions()
  
  // Check if user has permission to view treatment stage activities
  // Only allow users with the specific treatment-stages.view-activities permission
  // Wait for user data to load before checking permissions
  const canViewAuditLogs = currentUserForPermissions && canViewTreatmentStageActivities

  // Pagination state for activities
  const { page: activityPage, limit: activityLimit, goToPage: goToActivityPage, changeLimit: changeActivityLimit } = usePagination(20)

  // Filter state for activities
  const [activitySearchText, setActivitySearchText] = useState('')
  const [activityActionFilter, setActivityActionFilter] = useState<string>('all')
  const [activityStartDate, setActivityStartDate] = useState<string>('')
  const [activityEndDate, setActivityEndDate] = useState<string>('')

  // Build filters object for useAuditLogs - use TreatmentStage instead of Appointment
  const activityFilters = {
    entityType: 'TreatmentStage',
    ...(activityActionFilter !== 'all' && { action: activityActionFilter }),
    ...(activityStartDate && { startDate: activityStartDate }),
    ...(activityEndDate && { endDate: activityEndDate }),
  }

  // Fetch treatment stage activities with pagination and filters
  const { data: activitiesResponse, isLoading: activityLoading, error: activityError, refetch: refetchActivities } = useAuditLogs(
    activityFilters,
    activityPage,
    activityLimit,
    canViewAuditLogs // Only enable query if user has permission
  )

  // Debug logs removed - polling is working as intended (every 15 seconds)

  // Reset to page 1 when server-side filters change (not search text, which is client-side)
  React.useEffect(() => {
    if (activityPage !== 1 && (activityActionFilter !== 'all' || activityStartDate || activityEndDate)) {
      goToActivityPage(1)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activityActionFilter, activityStartDate, activityEndDate])

  // Set up polling for activities (only when no filters are active and user has permission)
  const hasActiveFilters = activityActionFilter !== 'all' || activityStartDate || activityEndDate || activitySearchText
  React.useEffect(() => {
    if (!canViewAuditLogs || hasActiveFilters) return

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const error = activityError as any
    if (error?.response?.status === 403) return

    const interval = setInterval(() => {
      refetchActivities()
    }, 15 * 1000) // Poll every 15 seconds

    return () => clearInterval(interval)
  }, [canViewAuditLogs, hasActiveFilters, refetchActivities, activityError])

  // Extract activities and pagination from response

  const activities = activitiesResponse?.data || []
  const activitiesPagination = activitiesResponse?.pagination

  // Clear all activity filters
  const clearActivityFilters = () => {
    setActivitySearchText('')
    setActivityActionFilter('all')
    setActivityStartDate('')
    setActivityEndDate('')
    goToActivityPage(1) // Reset to first page
  }

  // Filter activities by search text (client-side filtering on current page)
  // Note: Search only filters within the current page results
  const filteredActivities = activitySearchText
    ? activities.filter((activity: AuditLog) => {
        const searchLower = activitySearchText.toLowerCase()
        const actionLabel = getActionLabel(activity.action).toLowerCase()
        const performedByName = typeof activity.performedBy === 'object' && activity.performedBy !== null
          ? (activity.performedBy.name || activity.performedBy.email || '').toLowerCase()
          : ''
        const dateStr = moment(activity.performedAt).format('YYYY-MM-DD HH:mm').toLowerCase()
        return actionLabel.includes(searchLower) || performedByName.includes(searchLower) || dateStr.includes(searchLower)
      })
    : activities

  // Helper functions for activity display
  const formatRelativeTime = (date: string): string => {
    try {
      const dateObj = new Date(date)
      if (isToday(dateObj)) {
        const hours = dateObj.getHours()
        const minutes = dateObj.getMinutes()
        const now = new Date()
        const diffHours = now.getHours() - hours
        const diffMinutes = now.getMinutes() - minutes
        if (diffHours > 0) return `منذ ${diffHours} ساعة`
        if (diffMinutes > 0) return `منذ ${diffMinutes} دقيقة`
        return 'الآن'
      }
      if (isPast(dateObj)) {
        return formatDistanceToNow(dateObj, { addSuffix: true, locale: arSA })
      }
      return formatDistanceToNow(dateObj, { addSuffix: false, locale: arSA })
    } catch {
      return format(new Date(date), 'dd MMM yyyy', { locale: arSA })
    }
  }

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'create':
        return <Plus className='w-4 h-4 text-green-600' />
      case 'update':
        return <FileEdit className='w-4 h-4 text-blue-600' />
      case 'delete':
        return <Trash2 className='w-4 h-4 text-red-600' />
      default:
        return <Clock className='w-4 h-4 text-gray-600' />
    }
  }

  const getActionLabel = (action: string) => {
    switch (action) {
      case 'create':
        return 'إنشاء مرحلة علاجية'
      case 'update':
        return 'تعديل مرحلة علاجية'
      case 'delete':
        return 'حذف مرحلة علاجية'
      default:
        return action
    }
  }

  const getActionColor = (action: string) => {
    switch (action) {
      case 'create':
        return 'bg-green-100 text-green-800'
      case 'update':
        return 'bg-blue-100 text-blue-800'
      case 'delete':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  // Helper to check if appointment belongs to current doctor
  const belongsToDoctor = (appointment: Appointment): boolean => {
    if (!doctorId) return false
    const appointmentDoctorId = typeof appointment.doctor === 'object' && appointment.doctor !== null
      ? appointment.doctor._id || appointment.doctor.id
      : appointment.doctor
    return appointmentDoctorId === doctorId
  }

  const typedTreatmentStages = treatmentStagesData as PaginatedResponse<TreatmentStage> | undefined
  // Filter treatment stages to only show doctor's stages
  const allDoctorStages = (typedTreatmentStages?.data || [])
    .filter((stage: TreatmentStage) => {
      if (!doctorId) return false
      const stageDoctorId = typeof stage.doctor === 'object' && stage.doctor !== null
        ? stage.doctor._id || stage.doctor.id
        : stage.doctor
      return stageDoctorId === doctorId
    })


  // Helper function to calculate days overdue
  const calculateDaysOverdue = (stageDate: string): number => {
    const date = new Date(stageDate)
    const today = startOfToday()
    return differenceInDays(today, date)
  }

  // Filter incomplete/active treatment stages before today
  const today = startOfToday()
  const allIncompleteStagesBeforeToday = allDoctorStages
    .filter((stage: TreatmentStage) => {
      // Must not be completed
      if (stage.isCompleted) return false
      
      // Must have a date before today
      if (!stage.date) return false
      
      try {
        const stageDate = new Date(stage.date)
        if (isNaN(stageDate.getTime())) return false
        
        // Date must be before today
        return stageDate < today
      } catch {
        return false
      }
    })
    .map((stage: TreatmentStage) => ({
      ...stage,
      daysOverdue: stage.date ? calculateDaysOverdue(stage.date) : 0,
    }))
    .sort((a: TreatmentStage & { daysOverdue: number }, b: TreatmentStage & { daysOverdue: number }) => {
      // Sort by days overdue, most overdue first
      return b.daysOverdue - a.daysOverdue
    })

  // Apply filter to incomplete stages
  const incompleteStagesBeforeToday = allIncompleteStagesBeforeToday.filter((stage: TreatmentStage & { daysOverdue: number }) => {
    if (incompleteStageFilter === 'overdue') return stage.daysOverdue > 7
    if (incompleteStageFilter === 'recent') return stage.daysOverdue >= 1 && stage.daysOverdue <= 7
    return true
  })

  // Helper function to get appointments for a specific period
  const getAppointmentsForPeriod = (period: NextAppointmentFilter) => {
    if (!upcomingAppointments || upcomingAppointments.length === 0) return []
    
    const now = new Date()
    const today = startOfToday()
    const endOfTodayDate = endOfToday()
    let startDate: Date
    let endDate: Date

    switch (period) {
      case 'tomorrow':
        startDate = startOfTomorrow()
        endDate = endOfTomorrow()
        break
      case 'nextWeeks':
        // Next weeks: from after tomorrow until the end of current month
        startDate = addDays(startOfTomorrow(), 1) // Day after tomorrow
        endDate = endOfDay(endOfMonth(now)) // End of current month
        break
      case 'nextMonth':
        // Next month: from the start of next month to end of next month
        startDate = startOfMonth(addMonths(now, 1))
        endDate = endOfMonth(addMonths(now, 1))
        break
      default:
        startDate = startOfTomorrow()
        endDate = endOfTomorrow()
    }

    return upcomingAppointments.filter((apt: Appointment) => {
      if (!apt.date) return false
      
      // Ensure appointment belongs to current doctor (safety check)
      if (!belongsToDoctor(apt)) return false
      
      try {
        const aptDate = new Date(apt.date)
        // Validate date is valid
        if (isNaN(aptDate.getTime())) return false
        
        // Exclude today's appointments (they should only show in "Today's Schedule")
        if (aptDate >= today && aptDate <= endOfTodayDate) return false
        
        // For nextWeeks, check if appointment is after tomorrow and up to end of current month
        if (period === 'nextWeeks') {
          return aptDate >= startDate && aptDate <= endDate
        }
        
        // Check if appointment is within the selected period
        // Use isWithinInterval for proper date range checking
        return isWithinInterval(aptDate, { start: startDate, end: endDate })
      } catch {
        return false
      }
    })
  }

  // Get appointments for current filter
  const nextAppointments = getAppointmentsForPeriod(nextAppointmentFilter)

  // Get counts for each period
  const tomorrowCount = getAppointmentsForPeriod('tomorrow').length
  const nextWeeksCount = getAppointmentsForPeriod('nextWeeks').length
  const nextMonthCount = getAppointmentsForPeriod('nextMonth').length


  const openStageDialog = (appointment: Appointment) => {
    setSelectedAppointment(appointment)
    setOpenAddStage(true)
  }

  const openEditStageDialog = (stage: TreatmentStage) => {
    setSelectedStage(stage)
    setOpenEditStage(true)
  }

  // Handle bulk status update (marks all visible/filtered stages as completed)
  const handleBulkStageUpdate = async () => {
    const stagesToUpdate = incompleteStagesBeforeToday
    if (stagesToUpdate.length === 0) {
      toast.error('لا توجد مراحل لتحديثها')
      return
    }

    const confirmed = window.confirm(
      `هل أنت متأكد من تحديث ${stagesToUpdate.length} مرحلة علاجية إلى "مكتملة"؟`
    )
    if (!confirmed) return

    try {
      setBulkUpdatingStages(true)
      const updatePromises = stagesToUpdate.map((stage: TreatmentStage) =>
        axios.put(`/treatment-stages/${stage._id}`, { isCompleted: true })
      )
      await Promise.all(updatePromises)
      toast.success(`تم تحديث ${stagesToUpdate.length} مرحلة علاجية بنجاح ✅`)
      
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['treatment-stages'] })
      queryClient.invalidateQueries({ queryKey: ['doctor', 'patient-stats'] })
    } catch (error: unknown) {
      const errorMessage = 
        error && typeof error === 'object' && 'response' in error
          ? (error as { response?: { data?: { message?: string } } }).response?.data?.message
          : undefined
      toast.error(errorMessage || 'حدث خطأ أثناء تحديث المراحل العلاجية')
    } finally {
      setBulkUpdatingStages(false)
    }
  }

  return (
    <main className='p-8 bg-gradient-to-b from-white to-gray-100 min-h-screen'>
      <h1 className='text-4xl font-extrabold mb-8 text-gray-900 tracking-wide'>
        لوحة تحكم الطبيب
      </h1>

      {/* Statistics Cards */}
      <section className='grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 mb-8'>
        <Card className='shadow-lg hover:shadow-xl transition-shadow'>
          <CardHeader className='pb-2'>
            <CardTitle className='text-lg font-semibold text-gray-700 flex items-center gap-2'>
              <Users className='w-5 h-5 text-indigo-600' />
              المرضى
            </CardTitle>
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Skeleton className='h-8 w-20' />
            ) : (
              <div className='flex items-center justify-between'>
                <p className='text-3xl font-extrabold text-indigo-600'>
                  {stats?.totalPatients || 0}
                </p>
                <Button
                  variant='ghost'
                  size='sm'
                  onClick={() => router.push('/patients')}
                  className='h-8'
                >
                  <Eye className='w-4 h-4' />
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className='shadow-lg hover:shadow-xl transition-shadow'>
          <CardHeader className='pb-2'>
            <CardTitle className='text-lg font-semibold text-gray-700 flex items-center gap-2'>
              <Calendar className='w-5 h-5 text-blue-600' />
              المواعيد
            </CardTitle>
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Skeleton className='h-8 w-20' />
            ) : (
              <div className='flex items-center justify-between'>
                <p className='text-3xl font-extrabold text-blue-600'>
                  {stats?.totalAppointments || 0}
                </p>
                <Button
                  variant='ghost'
                  size='sm'
                  onClick={() => router.push('/appointments')}
                  className='h-8'
                >
                  <Eye className='w-4 h-4' />
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className='shadow-lg hover:shadow-xl transition-shadow'>
          <CardHeader className='pb-2'>
            <CardTitle className='text-lg font-semibold text-gray-700 flex items-center gap-2'>
              <ClipboardList className='w-5 h-5 text-green-600' />
              مراحل العلاج
            </CardTitle>
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Skeleton className='h-8 w-20' />
            ) : (
              <div className='flex items-center justify-between'>
                <p className='text-3xl font-extrabold text-green-600'>
                  {stats?.totalTreatmentStages || 0}
                </p>
                <Button
                  variant='ghost'
                  size='sm'
                  onClick={() => router.push('/treatment-stages')}
                  className='h-8'
                >
                  <Eye className='w-4 h-4' />
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className='shadow-lg hover:shadow-xl transition-shadow'>
          <CardHeader className='pb-2'>
            <CardTitle className='text-lg font-semibold text-gray-700 flex items-center gap-2'>
              <TrendingUp className='w-5 h-5 text-purple-600' />
              نسبة الإنجاز
            </CardTitle>
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Skeleton className='h-8 w-20' />
            ) : (
              <p className='text-3xl font-extrabold text-purple-600'>
                {stats?.completionRate || 0}%
              </p>
            )}
          </CardContent>
        </Card>
      </section>

      {/* Incomplete Treatment Stages Before Today */}
      {(stagesLoading || allIncompleteStagesBeforeToday.length > 0) && (
        <section className='mb-8'>
          <Accordion type='single' collapsible className='w-full'>
            <AccordionItem value='incomplete-stages' className='border-0'>
              <Card className='shadow-lg border-orange-200 bg-orange-50'>
                <CardHeader>
                  <div className='flex justify-between items-center'>
                    <AccordionTrigger className='hover:no-underline p-0'>
                      <div className='flex items-center gap-3'>
                        <AlertCircle className='w-6 h-6 text-orange-600' />
                        <div className='text-right'>
                          <CardTitle className='text-2xl font-bold text-orange-800'>
                            مراحل علاجية غير مكتملة
                          </CardTitle>
                          <CardDescription className='text-orange-700'>
                            مراحل علاجية قبل اليوم غير مكتملة أو نشطة
                          </CardDescription>
                        </div>
                      </div>
                    </AccordionTrigger>
                    {!stagesLoading && (
                      <div className='flex items-center gap-3'>
                        <Badge variant='destructive' className='text-lg px-3 py-1'>
                          {allIncompleteStagesBeforeToday.length}
                        </Badge>
                        {allIncompleteStagesBeforeToday.length > 0 && (
                          <Button
                            variant='outline'
                            size='sm'
                            onClick={(e) => {
                              e.stopPropagation()
                              handleBulkStageUpdate()
                            }}
                            disabled={bulkUpdatingStages}
                            className='bg-green-50 hover:bg-green-100 border-green-300'
                          >
                            {bulkUpdatingStages ? (
                              <>
                                <RefreshCw className='w-4 h-4 mr-2 animate-spin' />
                                جاري التحديث...
                              </>
                            ) : (
                              <>
                                <CheckCircle2 className='w-4 h-4 mr-2' />
                                تحديث الكل إلى &quot;مكتملة&quot;
                              </>
                            )}
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                  {!stagesLoading && allIncompleteStagesBeforeToday.length > 0 && (
                    <div className='flex gap-2 mt-4' onClick={(e) => e.stopPropagation()}>
                      <Button
                        variant={incompleteStageFilter === 'all' ? 'default' : 'outline'}
                        size='sm'
                        onClick={() => setIncompleteStageFilter('all')}
                      >
                        الكل
                        <Badge variant='secondary' className='mr-1 px-1.5 py-0.5 text-xs'>
                          {allIncompleteStagesBeforeToday.length}
                        </Badge>
                      </Button>
                      <Button
                        variant={incompleteStageFilter === 'overdue' ? 'default' : 'outline'}
                        size='sm'
                        onClick={() => setIncompleteStageFilter('overdue')}
                      >
                        متأخر {'>'}7 أيام
                        <Badge variant='secondary' className='mr-1 px-1.5 py-0.5 text-xs'>
                          {allIncompleteStagesBeforeToday.filter((stage: TreatmentStage & { daysOverdue: number }) => stage.daysOverdue > 7).length}
                        </Badge>
                      </Button>
                      <Button
                        variant={incompleteStageFilter === 'recent' ? 'default' : 'outline'}
                        size='sm'
                        onClick={() => setIncompleteStageFilter('recent')}
                      >
                        حديث (1-7 أيام)
                        <Badge variant='secondary' className='mr-1 px-1.5 py-0.5 text-xs'>
                          {allIncompleteStagesBeforeToday.filter((stage: TreatmentStage & { daysOverdue: number }) => stage.daysOverdue >= 1 && stage.daysOverdue <= 7).length}
                        </Badge>
                      </Button>
                    </div>
                  )}
                </CardHeader>
                <AccordionContent>
                  <CardContent>
                    {stagesLoading ? (
                      <div className='space-y-3'>
                        {[1, 2, 3].map((i) => (
                          <Skeleton key={i} className='h-24 w-full' />
                        ))}
                      </div>
                    ) : incompleteStagesBeforeToday.length > 0 ? (
                      <div className='space-y-3 max-h-[400px] overflow-y-auto'>
                        {incompleteStagesBeforeToday.map((stage: TreatmentStage & { daysOverdue: number }) => (
                          <div
                            key={stage._id}
                            className='border border-orange-200 rounded-lg p-4 hover:bg-orange-50 transition cursor-pointer'
                            onClick={() => router.push(`/treatment-stages/${stage._id}`)}
                          >
                            <div className='flex justify-between items-start mb-2'>
                              <div className='flex-1'>
                                <p className='font-semibold text-lg text-gray-800'>
                                  {stage.title}
                                </p>
                                <p className='text-sm text-gray-600'>
                                  {typeof stage.patient === 'object' && stage.patient !== null
                                    ? ((stage.patient as { fullName?: string; name?: string }).fullName || (stage.patient as { fullName?: string; name?: string }).name || 'غير معروف')
                                    : 'غير معروف'}
                                </p>
                                <div className='flex items-center gap-2 mt-1'>
                                  <p className='text-xs text-gray-500'>
                                    {stage.date
                                      ? format(new Date(stage.date), 'dd MMM yyyy, HH:mm', {
                                          locale: arSA,
                                        })
                                      : '-'}
                                  </p>
                                  {stage.daysOverdue > 0 && (
                                    <>
                                      {stage.daysOverdue > 7 ? (
                                        <AlertCircle className='w-4 h-4 text-red-600' />
                                      ) : (
                                        <Clock className='w-4 h-4 text-orange-600' />
                                      )}
                                      <Badge
                                        variant={stage.daysOverdue > 7 ? 'destructive' : 'secondary'}
                                        className='text-xs'
                                      >
                                        {stage.daysOverdue} يوم
                                      </Badge>
                                    </>
                                  )}
                                </div>
                              </div>
                              <div className='flex items-center gap-2'>
                                {canEditStage && (
                                  <Button
                                    variant='ghost'
                                    size='sm'
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      openEditStageDialog(stage)
                                    }}
                                    className='h-8 w-8 p-0'
                                    title='تعديل المرحلة'
                                  >
                                    <Pencil className='w-4 h-4' />
                                  </Button>
                                )}
                                <XCircle className='w-5 h-5 text-red-600' />
                                <Badge variant='secondary'>
                                  غير مكتملة
                                </Badge>
                              </div>
                            </div>
                            {stage.description && (
                              <p className='text-sm text-gray-700 mt-2'>{stage.description}</p>
                            )}
                            {stage.cost && (
                              <p className='text-sm text-gray-600 mt-1'>
                                التكلفة: {stage.cost.toLocaleString()} ل.س
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className='text-center text-gray-500 py-8'>
                        لا توجد مراحل علاجية تطابق الفلتر المحدد
                      </p>
                    )}
                  </CardContent>
                </AccordionContent>
              </Card>
            </AccordionItem>
          </Accordion>
        </section>
      )}

      {/* Today's Schedule and Upcoming Appointments */}
      <section className='grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8'>
        {/* Today's Schedule */}
        <Card className='shadow-lg'>
          <CardHeader>
            <div className='flex justify-between items-center'>
              <div>
                <CardTitle className='text-2xl font-bold text-gray-800 flex items-center gap-2'>
                  <Clock className='w-6 h-6' />
                  مواعيد اليوم
                </CardTitle>
                <CardDescription>
                  المواعيد المجدولة لليوم
                </CardDescription>
              </div>
              <Badge variant='secondary' className='text-lg px-3 py-1'>
                {todayAppointments?.length || 0}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            {todayLoading ? (
              <div className='space-y-3'>
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className='h-16 w-full' />
                ))}
              </div>
            ) : todayAppointments && todayAppointments.length > 0 ? (
              <div className='space-y-3 max-h-[400px] overflow-y-auto'>
                {todayAppointments
                  .filter((appointment: Appointment) => belongsToDoctor(appointment))
                  .map((appointment: Appointment) => (
                    <AppointmentCard
                      key={appointment._id}
                      appointment={appointment}
                      canManageTreatmentStages={canManageTreatmentStages}
                      canEditStage={canEditStage}
                      onAddStage={openStageDialog}
                      onEditStage={openEditStageDialog}
                    />
                  ))}
              </div>
            ) : (
              <p className='text-center text-gray-500 py-8'>
                لا توجد مواعيد لليوم
              </p>
            )}
          </CardContent>
        </Card>

        {/* Next Appointments */}
        <Card className='shadow-lg'>
          <CardHeader>
            <div className='flex justify-between items-center mb-4'>
              <div>
                <CardTitle className='text-2xl font-bold text-gray-800 flex items-center gap-2'>
                  <Calendar className='w-6 h-6' />
                  المواعيد القادمة
                </CardTitle>
                <CardDescription>
                  اختر الفترة لعرض المواعيد
                </CardDescription>
              </div>
            </div>
            <div className='flex gap-2 flex-wrap'>
              <Button
                variant={nextAppointmentFilter === 'tomorrow' ? 'default' : 'outline'}
                size='sm'
                onClick={() => setNextAppointmentFilter('tomorrow')}
              >
                غداً
                <Badge variant='secondary' className='mr-1 px-1.5 py-0.5 text-xs'>
                  {tomorrowCount}
                </Badge>
              </Button>
              <Button
                variant={nextAppointmentFilter === 'nextWeeks' ? 'default' : 'outline'}
                size='sm'
                onClick={() => setNextAppointmentFilter('nextWeeks')}
              >
                الأسابيع القادمة
                <Badge variant='secondary' className='mr-1 px-1.5 py-0.5 text-xs'>
                  {nextWeeksCount}
                </Badge>
              </Button>
              <Button
                variant={nextAppointmentFilter === 'nextMonth' ? 'default' : 'outline'}
                size='sm'
                onClick={() => setNextAppointmentFilter('nextMonth')}
              >
                الشهر القادم
                <Badge variant='secondary' className='mr-1 px-1.5 py-0.5 text-xs'>
                  {nextMonthCount}
                </Badge>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {upcomingLoading ? (
              <div className='space-y-3'>
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className='h-16 w-full' />
                ))}
              </div>
            ) : nextAppointments.length > 0 ? (
              <div className='space-y-3 max-h-[400px] overflow-y-auto'>
                {nextAppointments.map((appointment: Appointment) => (
                  <AppointmentCard
                    key={appointment._id}
                    appointment={appointment}
                    canManageTreatmentStages={canManageTreatmentStages}
                    canEditStage={canEditStage}
                    onAddStage={openStageDialog}
                    onEditStage={openEditStageDialog}
                  />
                ))}
              </div>
            ) : (
              <p className='text-center text-gray-500 py-8'>
                لا توجد مواعيد في الفترة المحددة
              </p>
            )}
          </CardContent>
        </Card>
      </section>

      {/* Activities Section - Only show if user has permission */}
      {canViewAuditLogs && (
      <section className='mt-6'>
        <Card className='shadow-lg'>
          <CardHeader>
            <div className='flex justify-between items-center mb-4'>
              <div>
                <CardTitle className='text-2xl font-bold text-gray-800 flex items-center gap-2'>
                  <Activity className='w-6 h-6' />
                  آخر نشاط
                </CardTitle>
                <CardDescription>
                  آخر نشاط تم على مراحل العلاج
                </CardDescription>
              </div>
              <div className='flex gap-2'>
                {canViewAuditLogs && (
                  <Button
                    variant='outline'
                    size='sm'
                    onClick={() => refetchActivities()}
                    title='تحديث البيانات'
                  >
                    <RefreshCw className='w-4 h-4' />
                  </Button>
                )}
                <Button
                  variant='outline'
                  onClick={() => router.push('/treatment-stages')}
                >
                  <Eye className='w-4 h-4 mr-2' />
                  عرض الكل
                </Button>
              </div>
            </div>
              
              {/* Search and Filter Section - Only show if user has permission */}
              {canViewAuditLogs && (
              <div className='space-y-3 pt-4 border-t'>
                <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3'>
                  {/* Search Input */}
                  <div className='relative'>
                    <Search className='absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4' />
                    <Input
                      type='text'
                      placeholder='بحث في الأنشطة...'
                      value={activitySearchText}
                      onChange={(e) => setActivitySearchText(e.target.value)}
                      className='pr-10'
                    />
                  </div>

                  {/* Action Filter */}
                  <Select value={activityActionFilter} onValueChange={setActivityActionFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder='نوع الإجراء' />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value='all'>جميع الإجراءات</SelectItem>
                      <SelectItem value='create'>إنشاء</SelectItem>
                      <SelectItem value='update'>تعديل</SelectItem>
                      <SelectItem value='delete'>حذف</SelectItem>
                    </SelectContent>
                  </Select>

                  {/* Start Date */}
                  <Input
                    type='date'
                    placeholder='من تاريخ'
                    value={activityStartDate}
                    onChange={(e) => setActivityStartDate(e.target.value)}
                  />

                  {/* End Date */}
                  <Input
                    type='date'
                    placeholder='إلى تاريخ'
                    value={activityEndDate}
                    onChange={(e) => setActivityEndDate(e.target.value)}
                  />
                </div>

                {/* Clear Filters Button */}
                {(activitySearchText || activityActionFilter !== 'all' || activityStartDate || activityEndDate) && (
                  <div className='flex justify-end'>
                    <Button
                      variant='outline'
                      size='sm'
                      onClick={clearActivityFilters}
                      className='gap-2'
                    >
                      <X className='w-4 h-4' />
                      مسح الفلاتر
                    </Button>
                  </div>
                )}
              </div>
              )}
            </CardHeader>
            <CardContent>
              {!canViewAuditLogs ? (
                <div className='text-center py-8'>
                  <p className='text-gray-500 mb-2'>لا يمكنك عرض الأنشطة</p>
                  <p className='text-sm text-gray-400'>
                    يتطلب صلاحيات عرض مراحل العلاج أو الأنشطة
                  </p>
                </div>
              ) : activityLoading ? (
                <div className='space-y-3'>
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className='h-20 w-full' />
                  ))}
                </div>
              ) : activityError ? (
                <div className='text-center py-8'>
                  <p className='text-red-500 mb-2'>حدث خطأ أثناء تحميل الأنشطة</p>
                  <p className='text-sm text-gray-500'>
                    {activityError instanceof Error ? activityError.message : String(activityError)}
                  </p>
                  {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                  {((activityError as any)?.response?.status === 403) && (
                    <p className='text-xs text-gray-400 mt-2'>
                      لا تملك الصلاحيات اللازمة لعرض الأنشطة
                    </p>
                  )}
                  {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                  {((activityError as any)?.response?.status === 429) && (
                    <p className='text-xs text-gray-400 mt-2'>
                      تم تجاوز الحد المسموح من الطلبات. يرجى المحاولة لاحقاً.
                    </p>
                  )}
                </div>
              ) : filteredActivities && filteredActivities.length > 0 ? (
                <>
                  <div className='space-y-3 max-h-[600px] overflow-y-auto'>
                    {filteredActivities.map((activity: AuditLog) => (
                    <div key={activity._id} className='border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors'>
                      <div className='flex items-start justify-between mb-2'>
                        <div className='flex items-center gap-2 flex-1'>
                          {getActionIcon(activity.action)}
                          <div className='flex-1'>
                            <p className='font-semibold text-lg text-gray-800'>
                              {getActionLabel(activity.action)}
                            </p>
                            <p className='text-sm text-gray-600'>
                              {typeof activity.performedBy === 'object' && activity.performedBy !== null
                                ? `بواسطة: ${activity.performedBy.name || activity.performedBy.email}`
                                : 'بواسطة: غير معروف'}
                            </p>
                          </div>
                        </div>
                        <Badge className={getActionColor(activity.action)}>
                          {getActionLabel(activity.action)}
                        </Badge>
                      </div>
                      <div className='flex items-center gap-2 text-sm text-gray-500 mt-2'>
                        <Clock className='w-4 h-4' />
                        <span>{moment(activity.performedAt).format('YYYY-MM-DD HH:mm')}</span>
                        <span className='text-xs text-gray-400'>
                          ({formatRelativeTime(activity.performedAt)})
                        </span>
                      </div>
                      {activity.action === 'update' && activity.changes && (
                        <div className='mt-3 pt-3 border-t border-gray-200'>
                          <p className='text-sm font-semibold text-gray-700 mb-2'>التغييرات:</p>
                          <div className='space-y-1'>
                            {Object.keys(activity.changes.before || {}).slice(0, 3).map((field) => {
                              // eslint-disable-next-line @typescript-eslint/no-explicit-any
                              const beforeValue = (activity.changes?.before as any)?.[field]
                              // eslint-disable-next-line @typescript-eslint/no-explicit-any
                              const afterValue = (activity.changes?.after as any)?.[field]
                              return (
                                <div key={field} className='text-sm text-gray-600'>
                                  <span className='font-medium'>{field}:</span>{' '}
                                  <span className='text-red-600 line-through'>{String(beforeValue || '-')}</span> →{' '}
                                  <span className='text-green-600 font-semibold'>{String(afterValue || '-')}</span>
                                </div>
                              )
                            })}
                            {Object.keys(activity.changes.before || {}).length > 3 && (
                              <p className='text-xs text-gray-500'>
                                +{Object.keys(activity.changes.before || {}).length - 3} تغييرات أخرى
                              </p>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                    ))}
                  </div>

                  {/* Pagination Component */}
                  {activitiesPagination && activitiesPagination.totalPages > 1 && (
                    <Pagination
                      meta={{
                        page: activitiesPagination.page,
                        limit: activitiesPagination.limit,
                        total: activitiesPagination.total,
                        totalPages: activitiesPagination.totalPages,
                      }}
                      onPageChange={goToActivityPage}
                      onLimitChange={changeActivityLimit}
                    />
                  )}
                </>
              ) : (
                <div className='text-center py-8'>
                  <p className='text-gray-500'>
                    {activitySearchText || activityActionFilter !== 'all' || activityStartDate || activityEndDate
                      ? 'لا توجد نتائج تطابق الفلاتر المحددة'
                      : 'لا توجد أنشطة مسجلة'}
                  </p>
                  {/* Debug info - remove in production */}
                  {process.env.NODE_ENV === 'development' && (
                    <div className='mt-4 text-xs text-gray-400 space-y-1'>
                      <p>Debug: canViewAuditLogs = {String(canViewAuditLogs)}</p>
                      <p>Debug: activities.length = {activities.length}</p>
                      <p>Debug: filteredActivities.length = {filteredActivities.length}</p>
                      <p>Debug: response = {activitiesResponse ? 'exists' : 'null'}</p>
                    </div>
                  )}
                  {(activitySearchText || activityActionFilter !== 'all' || activityStartDate || activityEndDate) && (
                    <Button
                      variant='outline'
                      size='sm'
                      onClick={clearActivityFilters}
                      className='mt-4 gap-2'
                    >
                      <X className='w-4 h-4' />
                      مسح الفلاتر
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </section>
      )}

      {/* Quick Add Treatment Stage Dialog */}
      <Dialog open={openAddStage} onOpenChange={setOpenAddStage}>
        <DialogContent className='max-w-xl'>
          <DialogHeader>
            <DialogTitle>إضافة مرحلة علاج جديدة</DialogTitle>
            <DialogDescription>
              قم بإضافة مرحلة علاج جديدة للمريض
            </DialogDescription>
          </DialogHeader>
          {selectedAppointment && (
            <TreatmentStageForm
              appointmentId={selectedAppointment._id}
              patientId={
                typeof selectedAppointment.patient === 'object' &&
                selectedAppointment.patient !== null
                  ? selectedAppointment.patient._id
                  : selectedAppointment.patient || ''
              }
              doctorId={
                typeof selectedAppointment.doctor === 'object' &&
                selectedAppointment.doctor !== null
                  ? selectedAppointment.doctor._id
                  : selectedAppointment.doctor || ''
              }
              onSuccess={() => {
                setOpenAddStage(false)
                if (selectedAppointment) {
                  // Invalidate the specific appointment's treatment stages
                  queryClient.invalidateQueries({ 
                    queryKey: ['treatment-stages', 'appointment', selectedAppointment._id] 
                  })
                }
                setSelectedAppointment(null)
                queryClient.invalidateQueries({ queryKey: ['treatment-stages'] })
                queryClient.invalidateQueries({ queryKey: ['doctor', 'patient-stats'] })
                queryClient.invalidateQueries({ queryKey: ['appointments', 'doctor'] })
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Treatment Stage Dialog */}
      {canEditStage && (
        <Dialog open={openEditStage} onOpenChange={setOpenEditStage}>
          <DialogContent className='max-w-2xl' dir='rtl'>
            <DialogHeader>
              <DialogTitle>تعديل المرحلة العلاجية</DialogTitle>
              <DialogDescription>قم بتعديل بيانات المرحلة العلاجية</DialogDescription>
            </DialogHeader>
            {selectedStage && (
              <TreatmentStageEditForm
                stage={selectedStage}
                onSuccess={() => {
                  setOpenEditStage(false)
                  if (selectedStage && typeof selectedStage.appointment === 'object' && selectedStage.appointment !== null) {
                    const appointmentId = selectedStage.appointment._id || selectedStage.appointment
                    // Invalidate the specific appointment's treatment stages
                    queryClient.invalidateQueries({ 
                      queryKey: ['treatment-stages', 'appointment', appointmentId] 
                    })
                  }
                  setSelectedStage(null)
                  queryClient.invalidateQueries({ queryKey: ['treatment-stages'] })
                  queryClient.invalidateQueries({ queryKey: ['doctor', 'patient-stats'] })
                }}
                onCancel={() => {
                  setOpenEditStage(false)
                  setSelectedStage(null)
                }}
              />
            )}
          </DialogContent>
        </Dialog>
      )}
    </main>
  )
}

// Appointment Card Component with Treatment Stages
const AppointmentCard: React.FC<{
  appointment: Appointment
  canManageTreatmentStages: boolean
  canEditStage: boolean
  onAddStage: (appointment: Appointment) => void
  onEditStage: (stage: TreatmentStage) => void
}> = ({ appointment, canManageTreatmentStages, canEditStage, onAddStage, onEditStage }) => {
  const [showStages, setShowStages] = useState(false)
  
  // Use React Query to fetch treatment stages for this appointment
  const { data: stagesData, isLoading: loadingStages } = useQuery({
    queryKey: ['treatment-stages', 'appointment', appointment._id],
    queryFn: async () => {
      const { data } = await axios.get(`/treatment-stages/appointment/${appointment._id}`)
      return (data?.data || []) as TreatmentStage[]
    },
    enabled: !!appointment._id,
    staleTime: 1 * 60 * 1000, // 1 minute
  })

  const stages = stagesData || []

  return (
    <div className='border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition'>
      <div className='flex justify-between items-start mb-2'>
        <div className='flex-1'>
          <p className='font-semibold text-lg text-indigo-700'>
            {typeof appointment.patient === 'object' && appointment.patient !== null
              ? appointment.patient.fullName
              : 'غير معروف'}
          </p>
          <p className='text-sm text-gray-600'>
            {appointment.date
              ? format(new Date(appointment.date), 'HH:mm', { locale: arSA })
              : '-'}
          </p>
        </div>
        <div className='flex items-center gap-2'>
          <Badge variant='outline'>{appointment.type}</Badge>
          <Badge 
            variant={
              appointment.status === 'تم' ? 'default' :
              appointment.status === 'نشط' ? 'default' :
              appointment.status === 'ملغي' ? 'destructive' :
              'secondary'
            }
          >
            {appointment.status}
          </Badge>
        </div>
      </div>
      {appointment.service && (
        <p className='text-sm text-gray-500 mb-2'>
          الخدمة:{' '}
          {typeof appointment.service === 'object' && appointment.service !== null
            ? appointment.service.name
            : appointment.service || '-'}
        </p>
      )}
      
      {/* Treatment Stages Section */}
      <div className='mt-3 pt-3 border-t border-gray-200'>
        <div className='flex justify-between items-center mb-2'>
          <Button
            variant='ghost'
            size='sm'
            onClick={() => {
              setShowStages(!showStages)
            }}
            className='text-sm'
          >
            <ClipboardList className='w-4 h-4 mr-1' />
            المراحل العلاجية ({stages.length || 0})
          </Button>
          {canManageTreatmentStages && (
            <Button
              size='sm'
              variant='outline'
              onClick={() => onAddStage(appointment)}
              className='flex items-center gap-1'
            >
              <Plus className='w-4 h-4' />
              إضافة مرحلة
            </Button>
          )}
        </div>
        
        {showStages && (
          <div className='mt-2 space-y-2'>
            {loadingStages ? (
              <Skeleton className='h-12 w-full' />
            ) : stages.length > 0 ? (
              stages.map((stage: TreatmentStage) => (
                <div
                  key={stage._id}
                  className={cn(
                    'p-2 rounded border text-sm',
                    stage.isCompleted
                      ? 'border-green-400 bg-green-50'
                      : 'border-gray-300 bg-gray-50'
                  )}
                >
                  <div className='flex justify-between items-center'>
                    <div className='flex-1'>
                      <p className='font-medium'>{stage.title}</p>
                      {stage.description && (
                        <p className='text-xs text-gray-600'>{stage.description}</p>
                      )}
                    </div>
                    <div className='flex items-center gap-2'>
                      {canEditStage && (
                        <Button
                          variant='ghost'
                          size='sm'
                          onClick={(e) => {
                            e.stopPropagation()
                            onEditStage(stage)
                          }}
                          className='h-6 w-6 p-0'
                        >
                          <Pencil className='w-3 h-3' />
                        </Button>
                      )}
                      {stage.isCompleted ? (
                        <CheckCircle2 className='w-4 h-4 text-green-600' />
                      ) : (
                        <XCircle className='w-4 h-4 text-red-600' />
                      )}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <p className='text-xs text-gray-500 text-center py-2'>
                لا توجد مراحل علاجية
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default function DoctorDashboardPage() {
  return (
    <Suspense
      fallback={
        <main className='p-8 bg-gradient-to-b from-white to-gray-100 min-h-screen'>
          <h1 className='text-4xl font-extrabold mb-8 text-gray-900 tracking-wide'>
            لوحة تحكم الطبيب
          </h1>
          <div className='grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 mb-8'>
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className='h-32 w-full' />
            ))}
          </div>
          <div className='grid grid-cols-1 lg:grid-cols-2 gap-6'>
            {[1, 2].map((i) => (
              <Skeleton key={i} className='h-96 w-full' />
            ))}
          </div>
        </main>
      }
    >
      <DoctorDashboardContent />
    </Suspense>
  )
}
