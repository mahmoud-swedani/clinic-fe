// src/app/(dashboard)/dashboard/reception/page.tsx
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
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { useTodayAppointments, useOverdueAppointments, useAllAppointments } from '@/hooks/useAppointments'
import { AppointmentForm } from '@/components/appointments/appointment-form'
import { format, startOfToday, isWithinInterval, startOfTomorrow, endOfTomorrow, startOfMonth, endOfMonth, addMonths, addDays, endOfDay } from 'date-fns'
import { arSA } from 'date-fns/locale'
import { Calendar, Users, Plus, Clock, Activity, Eye, FileEdit, Trash2, AlertCircle, CheckCircle2, TrendingUp, RefreshCw, Pencil } from 'lucide-react'
import axios from '@/lib/axios'
import { toast } from 'sonner'
import { Appointment, AuditLog } from '@/types/api'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { differenceInDays, formatDistanceToNow, isPast, isToday } from 'date-fns'
import { useQueryClient } from '@tanstack/react-query'
import { updateAppointmentInCache } from '@/lib/cacheUtils'
import { useRouter } from 'next/navigation'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { useUserPermissions } from '@/hooks/usePermissions'
import { useAuditLogs } from '@/hooks/useAuditLogs'
import { usePagination } from '@/hooks/usePagination'
import { Pagination } from '@/components/ui/Pagination'
import { Input } from '@/components/ui/input'
import { Search, X } from 'lucide-react'
import moment from 'moment'
import { useAllFormData } from '@/hooks/useFormData'

type NextAppointmentFilter = 'tomorrow' | 'nextWeeks' | 'nextMonth'

moment.locale('ar')

function ReceptionDashboardContent() {
  const router = useRouter()
  const [openAddAppointment, setOpenAddAppointment] = useState(false)
  const [openEditAppointment, setOpenEditAppointment] = useState(false)
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null)
  const [nextAppointmentFilter, setNextAppointmentFilter] = useState<NextAppointmentFilter>('tomorrow')
  const [changingStatusId, setChangingStatusId] = useState<string | null>(null)
  const [lateActionFilter, setLateActionFilter] = useState<'all' | 'overdue' | 'recent'>('all')
  const [todayStatusFilter, setTodayStatusFilter] = useState<'all' | 'نشط' | 'تم' | 'ملغي'>('all')
  const [bulkUpdating, setBulkUpdating] = useState(false)
  const queryClient = useQueryClient()

  // Use partial fetching hooks instead of fetching all appointments
  const { data: todayAppointments = [], isLoading: todayLoading } = useTodayAppointments()
  const { data: overdueAppointments = [], isLoading: overdueLoading } = useOverdueAppointments()

  // Get user permissions to check if user can view appointment activities
  const { data: currentUser, isLoading: userLoading } = useCurrentUser()
  const { canViewAppointmentActivities, canManageAppointments, hasPermission } = useUserPermissions()
  const canEditAppointment = canManageAppointments || hasPermission('appointments.edit')
  
  // Check if user has permission to view activities (either through canViewAppointmentActivities or explicit permission)
  // Wait for user data to load before checking permissions
  const canViewAuditLogs = !userLoading && currentUser && (canViewAppointmentActivities || hasPermission('appointments.view-activities'))

  // Get branchId for form data
  const branchId = currentUser?.branch 
    ? (typeof currentUser.branch === 'string' ? currentUser.branch : currentUser.branch._id)
    : undefined
  
  // Fetch form data (patients, doctors, services, departments) for appointment form
  const { patients, doctors, services, departments } = useAllFormData(branchId)

  // Pagination state for activities
  const { page: activityPage, limit: activityLimit, goToPage: goToActivityPage, changeLimit: changeActivityLimit } = usePagination(20)

  // Filter state for activities
  const [activitySearchText, setActivitySearchText] = useState('')
  const [activityActionFilter, setActivityActionFilter] = useState<string>('all')
  const [activityStartDate, setActivityStartDate] = useState<string>('')
  const [activityEndDate, setActivityEndDate] = useState<string>('')

  // Build filters object for useAuditLogs
  const activityFilters = {
    entityType: 'Appointment',
    ...(activityActionFilter !== 'all' && { action: activityActionFilter }),
    ...(activityStartDate && { startDate: activityStartDate }),
    ...(activityEndDate && { endDate: activityEndDate }),
  }

  // Fetch appointment activities with pagination and filters
  const { data: activitiesResponse, isLoading: activityLoading, error: activityError, refetch: refetchActivities } = useAuditLogs(
    activityFilters,
    activityPage,
    activityLimit,
    canViewAuditLogs // Only enable query if user has permission
  )

  // Reset to page 1 when server-side filters change (not search text, which is client-side)
  React.useEffect(() => {
    if (activityPage !== 1 && (activityActionFilter !== 'all' || activityStartDate || activityEndDate)) {
      goToActivityPage(1)
    }
  }, [activityActionFilter, activityStartDate, activityEndDate]) // eslint-disable-line react-hooks/exhaustive-deps

  // Set up polling for activities (only when no filters are active and user has permission)
  const hasActiveFilters = activityActionFilter !== 'all' || activityStartDate || activityEndDate || activitySearchText
  React.useEffect(() => {
    if (!canViewAuditLogs || hasActiveFilters) return

    const error = activityError as { response?: { status?: number } } | undefined
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

  // Calculate date ranges for upcoming appointments
  const now = new Date()
  const tomorrow = startOfTomorrow()
  const endOfTomorrowDate = endOfTomorrow()
  const nextWeeksStart = addDays(startOfTomorrow(), 1)
  const nextWeeksEnd = endOfDay(endOfMonth(now))
  const nextMonthStart = startOfMonth(addMonths(now, 1))
  const nextMonthEnd = endOfMonth(addMonths(now, 1))

  // Use shared appointments cache from useAllAppointments hook
  // This avoids fetching the same data multiple times
  const { data: allAppointmentsForFiltering = [], isLoading: allAppointmentsLoading } = useAllAppointments()

  // Filter appointments client-side for each period
  const tomorrowAppointments = allAppointmentsForFiltering.filter((apt: Appointment) => {
    if (!apt.date) return false
    const aptDate = new Date(apt.date)
    const aptDateOnly = new Date(aptDate.getFullYear(), aptDate.getMonth(), aptDate.getDate())
    const tomorrowOnly = new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate())
    const endOfTomorrowOnly = new Date(endOfTomorrowDate.getFullYear(), endOfTomorrowDate.getMonth(), endOfTomorrowDate.getDate())
    return aptDateOnly >= tomorrowOnly && aptDateOnly <= endOfTomorrowOnly
  })

  const nextWeeksAppointments = allAppointmentsForFiltering.filter((apt: Appointment) => {
    if (!apt.date) return false
    const aptDate = new Date(apt.date)
    const aptDateOnly = new Date(aptDate.getFullYear(), aptDate.getMonth(), aptDate.getDate())
    const nextWeeksStartOnly = new Date(nextWeeksStart.getFullYear(), nextWeeksStart.getMonth(), nextWeeksStart.getDate())
    const nextWeeksEndOnly = new Date(nextWeeksEnd.getFullYear(), nextWeeksEnd.getMonth(), nextWeeksEnd.getDate())
    return aptDateOnly >= nextWeeksStartOnly && aptDateOnly <= nextWeeksEndOnly
  })

  const nextMonthAppointments = allAppointmentsForFiltering.filter((apt: Appointment) => {
    if (!apt.date) return false
    const aptDate = new Date(apt.date)
    const aptDateOnly = new Date(aptDate.getFullYear(), aptDate.getMonth(), aptDate.getDate())
    const nextMonthStartOnly = new Date(nextMonthStart.getFullYear(), nextMonthStart.getMonth(), nextMonthStart.getDate())
    const nextMonthEndOnly = new Date(nextMonthEnd.getFullYear(), nextMonthEnd.getMonth(), nextMonthEnd.getDate())
    return aptDateOnly >= nextMonthStartOnly && aptDateOnly <= nextMonthEndOnly
  })

  // Get counts for each period
  const tomorrowCount = tomorrowAppointments.length
  const nextWeeksCount = nextWeeksAppointments.length
  const nextMonthCount = nextMonthAppointments.length

  // Get appointments for current filter
  const nextAppointments = (() => {
    switch (nextAppointmentFilter) {
      case 'tomorrow':
        return tomorrowAppointments
      case 'nextWeeks':
        return nextWeeksAppointments
      case 'nextMonth':
        return nextMonthAppointments
      default:
        return tomorrowAppointments
    }
  })()

  // Use shared loading state
  const upcomingLoading = allAppointmentsLoading

  // Helper functions
  const calculateDaysOverdue = (appointmentDate: string): number => {
    const aptDate = new Date(appointmentDate)
    const today = startOfToday()
    return differenceInDays(today, aptDate)
  }

  const getUrgencyColor = (daysOverdue: number): string => {
    if (daysOverdue > 7) return 'bg-red-50 border-red-300'
    if (daysOverdue >= 1) return 'bg-orange-50 border-orange-300'
    return 'bg-yellow-50 border-yellow-300'
  }

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

  // Calculate statistics from all appointments
  const totalAppointments = allAppointmentsForFiltering.length
  const completedAppointments = allAppointmentsForFiltering.filter(
    (apt: Appointment) => apt.status === 'تم'
  ).length
  const completionRate = totalAppointments > 0 
    ? Math.round((completedAppointments / totalAppointments) * 100) 
    : 0

  // Process overdue appointments (already filtered by backend)
  const allOldIncompleteAppointments = overdueAppointments
    .map((apt: Appointment) => ({
      ...apt,
      daysOverdue: apt.date ? calculateDaysOverdue(apt.date) : 0,
    }))
    .sort((a: Appointment & { daysOverdue: number }, b: Appointment & { daysOverdue: number }) => {
      // Sort by days overdue, most overdue first
      return b.daysOverdue - a.daysOverdue
    })

  // Apply filter to old incomplete appointments
  const oldIncompleteAppointments = allOldIncompleteAppointments.filter((apt: Appointment & { daysOverdue: number }) => {
    if (lateActionFilter === 'overdue') return apt.daysOverdue > 7
    if (lateActionFilter === 'recent') return apt.daysOverdue >= 1 && apt.daysOverdue <= 7
    return true
  })

  // Filter today's appointments by status
  const filteredTodayAppointments = todayAppointments.filter((apt: Appointment) => {
    if (todayStatusFilter === 'all') return true
    return apt.status === todayStatusFilter
  })

  const todayCompleted = todayAppointments.filter((apt: Appointment) => apt.status === 'تم').length
  const todayCompletionRate = todayAppointments.length > 0
    ? Math.round((todayCompleted / todayAppointments.length) * 100)
    : 0

  // Handle status change with optimistic cache update
  const handleStatusChange = async (appointmentId: string, newStatus: 'محجوز' | 'نشط' | 'تم' | 'ملغي') => {
    try {
      setChangingStatusId(appointmentId)
      
      // Optimistic update - update cache immediately
      updateAppointmentInCache(queryClient, appointmentId, { status: newStatus })
      
      await axios.put(`/appointments/${appointmentId}`, { status: newStatus })
      toast.success('تم تحديث حالة الموعد بنجاح ✅')
      
      // Invalidate and refetch to ensure fresh data (this will trigger refetch for other users via polling)
      // Invalidate all appointment-related queries to ensure updates are reflected everywhere
      queryClient.invalidateQueries({ queryKey: ['appointments', 'all-shared'] })
      queryClient.invalidateQueries({ queryKey: ['appointments'] }) // Invalidate paginated queries used by /appointments page
      // Force refetch of ALL queries (not just active) to immediately update the UI for all users
      queryClient.refetchQueries({ queryKey: ['appointments'], type: 'all' })
      queryClient.invalidateQueries({ queryKey: ['appointment-activities'] })
    } catch (error: unknown) {
      // Revert optimistic update on error by invalidating
      queryClient.invalidateQueries({ queryKey: ['appointments', 'all-shared'] })
      queryClient.invalidateQueries({ queryKey: ['appointments'] })
      
      const errorMessage = 
        error && typeof error === 'object' && 'response' in error
          ? (error as { response?: { data?: { message?: string } } }).response?.data?.message
          : undefined
      toast.error(errorMessage || 'حدث خطأ أثناء تحديث حالة الموعد')
    } finally {
      setChangingStatusId(null)
    }
  }

  // Handle bulk status update (updates all visible/filtered appointments)
  const handleBulkStatusUpdate = async () => {
    const appointmentsToUpdate = oldIncompleteAppointments
    if (appointmentsToUpdate.length === 0) {
      toast.error('لا توجد مواعيد لتحديثها')
      return
    }

    const confirmed = window.confirm(
      `هل أنت متأكد من تحديث حالة ${appointmentsToUpdate.length} موعد إلى "تم"؟`
    )
    if (!confirmed) return

    try {
      setBulkUpdating(true)
      const updatePromises = appointmentsToUpdate.map((apt: Appointment) =>
        axios.put(`/appointments/${apt._id}`, { status: 'تم' })
      )
      await Promise.all(updatePromises)
      toast.success(`تم تحديث ${appointmentsToUpdate.length} موعد بنجاح ✅`)
      
      // Update cache optimistically for all updated appointments
      appointmentsToUpdate.forEach((apt: Appointment) => {
        updateAppointmentInCache(queryClient, apt._id || apt.id || '', { status: 'تم' })
      })
      
      // Invalidate and refetch to ensure fresh data (this will trigger refetch for other users via polling)
      // Invalidate all appointment-related queries to ensure updates are reflected everywhere
      queryClient.invalidateQueries({ queryKey: ['appointments', 'all-shared'] })
      queryClient.invalidateQueries({ queryKey: ['appointments'] }) // Invalidate paginated queries used by /appointments page
      // Force refetch of ALL queries (not just active) to immediately update the UI for all users
      queryClient.refetchQueries({ queryKey: ['appointments'], type: 'all' })
      queryClient.invalidateQueries({ queryKey: ['appointment-activities'] })
    } catch {
      toast.error('حدث خطأ أثناء تحديث المواعيد')
    } finally {
      setBulkUpdating(false)
    }
  }


  // Helper functions for activity display
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
        return 'إنشاء موعد'
      case 'update':
        return 'تعديل موعد'
      case 'delete':
        return 'حذف موعد'
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


  return (
    <main className='p-8 bg-gradient-to-b from-white to-gray-100 min-h-screen'>
      <h1 className='text-4xl font-extrabold mb-8 text-gray-900 tracking-wide'>
        لوحة تحكم السكرتير
      </h1>

      {/* Quick Actions */}
      <section className='grid grid-cols-1 md:grid-cols-2 gap-6 mb-8'>
        <Card className='shadow-lg hover:shadow-xl transition-shadow'>
          <CardHeader>
            <CardTitle className='text-xl font-bold text-gray-800 flex items-center gap-2'>
              <Users className='w-6 h-6 text-indigo-600' />
              تسجيل مريض جديد
            </CardTitle>
            <CardDescription>
              قم بتسجيل مريض جديد في النظام
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              className='w-full' 
              size='lg'
              onClick={() => router.push('/patients/new')}
            >
              <Plus className='w-5 h-5 mr-2' />
              إضافة مريض جديد
            </Button>
          </CardContent>
        </Card>

        <Card className='shadow-lg hover:shadow-xl transition-shadow'>
          <CardHeader>
            <CardTitle className='text-xl font-bold text-gray-800 flex items-center gap-2'>
              <Calendar className='w-6 h-6 text-blue-600' />
              حجز موعد جديد
            </CardTitle>
            <CardDescription>
              قم بحجز موعد جديد للمريض
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Dialog open={openAddAppointment} onOpenChange={setOpenAddAppointment}>
              <DialogTrigger asChild>
                <Button className='w-full' size='lg' variant='outline'>
                  <Plus className='w-5 h-5 mr-2' />
                  حجز موعد
                </Button>
              </DialogTrigger>
              <DialogContent className='max-w-xl'>
                <DialogHeader>
                  <DialogTitle>حجز موعد جديد</DialogTitle>
                  <DialogDescription>
                    قم بملء البيانات لحجز موعد جديد
                  </DialogDescription>
                </DialogHeader>
                <AppointmentForm
                  patients={patients}
                  doctors={doctors}
                  services={services}
                  departments={departments}
                  onSuccess={() => {
                    // Invalidate all appointment queries to ensure updates are reflected everywhere
                    queryClient.invalidateQueries({ queryKey: ['appointments'] })
                    queryClient.invalidateQueries({ queryKey: ['appointments', 'all-shared'] })
                    // Force refetch of ALL queries (not just active) to immediately update the UI for all users
                    queryClient.refetchQueries({ queryKey: ['appointments'], type: 'all' })
                    setOpenAddAppointment(false)
                    // Toast is already shown by AppointmentForm component
                  }}
                />
              </DialogContent>
            </Dialog>
          </CardContent>
        </Card>
      </section>

      {/* Statistics Cards */}
      <section className='grid grid-cols-1 md:grid-cols-3 gap-6 mb-8'>
        <Card 
          className='shadow-lg hover:shadow-xl transition-shadow cursor-pointer'
          onClick={() => router.push('/appointments')}
          title='إجمالي المواعيد'
        >
          <CardHeader className='pb-2'>
            <CardTitle className='text-lg font-semibold text-gray-700 flex items-center gap-2'>
              <Calendar className='w-5 h-5 text-blue-600' />
              إجمالي المواعيد
            </CardTitle>
          </CardHeader>
          <CardContent>
            {allAppointmentsLoading ? (
              <Skeleton className='h-8 w-20' />
            ) : (
              <p className='text-3xl font-extrabold text-blue-600'>
                {totalAppointments.toLocaleString()}
              </p>
            )}
          </CardContent>
        </Card>

        <Card 
          className='shadow-lg hover:shadow-xl transition-shadow cursor-pointer'
          onClick={() => router.push('/appointments?status=تم')}
          title='المواعيد المكتملة'
        >
          <CardHeader className='pb-2'>
            <CardTitle className='text-lg font-semibold text-gray-700 flex items-center gap-2'>
              <CheckCircle2 className='w-5 h-5 text-green-600' />
              المواعيد المكتملة
            </CardTitle>
          </CardHeader>
          <CardContent>
            {todayLoading ? (
              <Skeleton className='h-8 w-20' />
            ) : (
              <p className='text-3xl font-extrabold text-green-600'>
                {completedAppointments.toLocaleString()}
              </p>
            )}
          </CardContent>
        </Card>

        <Card className='shadow-lg hover:shadow-xl transition-shadow'>
          <CardHeader className='pb-2'>
            <CardTitle className='text-lg font-semibold text-gray-700 flex items-center gap-2'>
              <TrendingUp className='w-5 h-5 text-purple-600' />
              معدل الإنجاز
            </CardTitle>
          </CardHeader>
          <CardContent>
            {allAppointmentsLoading ? (
              <Skeleton className='h-8 w-20' />
            ) : (
              <div>
                <p className='text-3xl font-extrabold text-purple-600 mb-2'>
                  {completionRate}%
                </p>
                <div className='w-full bg-gray-200 rounded-full h-2'>
                  <div
                    className='bg-purple-600 h-2 rounded-full transition-all'
                    style={{ width: `${completionRate}%` }}
                  />
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      {/* Late Action Reminder */}
      {(overdueLoading || allOldIncompleteAppointments.length > 0) && (
        <section className='mb-8'>
          <Accordion type='single' collapsible className='w-full'>
            <AccordionItem value='late-actions' className='border-0'>
              <Card className='shadow-lg border-orange-200 bg-orange-50'>
                <CardHeader>
                  <div className='flex justify-between items-center'>
                    <AccordionTrigger className='hover:no-underline p-0'>
                      <div className='flex items-center gap-3'>
                        <AlertCircle className='w-6 h-6 text-orange-600' />
                        <div className='text-right'>
                          <CardTitle className='text-2xl font-bold text-orange-800'>
                            تذكير بإجراءات متأخرة
                          </CardTitle>
                          <CardDescription className='text-orange-700'>
                            مواعيد قديمة تحتاج إلى تحديث الحالة
                          </CardDescription>
                        </div>
                      </div>
                    </AccordionTrigger>
                    {!overdueLoading && (
                      <div className='flex items-center gap-3'>
                        <Badge variant='destructive' className='text-lg px-3 py-1'>
                          {allOldIncompleteAppointments.length}
                        </Badge>
                        {allOldIncompleteAppointments.length > 0 && (
                          <Button
                            variant='outline'
                            size='sm'
                            onClick={(e) => {
                              e.stopPropagation()
                              handleBulkStatusUpdate()
                            }}
                            disabled={bulkUpdating}
                            className='bg-green-50 hover:bg-green-100 border-green-300'
                          >
                            {bulkUpdating ? (
                              <>
                                <RefreshCw className='w-4 h-4 mr-2 animate-spin' />
                                جاري التحديث...
                              </>
                            ) : (
                              <>
                                <CheckCircle2 className='w-4 h-4 mr-2' />
                                تحديث الكل إلى &quot;تم&quot;
                              </>
                            )}
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                  {!overdueLoading && allOldIncompleteAppointments.length > 0 && (
                    <div className='flex gap-2 mt-4' onClick={(e) => e.stopPropagation()}>
                      <Button
                        variant={lateActionFilter === 'all' ? 'default' : 'outline'}
                        size='sm'
                        onClick={() => setLateActionFilter('all')}
                      >
                        الكل
                        <Badge variant='secondary' className='mr-1 px-1.5 py-0.5 text-xs'>
                          {allOldIncompleteAppointments.length}
                        </Badge>
                      </Button>
                      <Button
                        variant={lateActionFilter === 'overdue' ? 'default' : 'outline'}
                        size='sm'
                        onClick={() => setLateActionFilter('overdue')}
                      >
                        متأخر {'>'}7 أيام
                        <Badge variant='secondary' className='mr-1 px-1.5 py-0.5 text-xs'>
                          {allOldIncompleteAppointments.filter((apt: Appointment & { daysOverdue: number }) => apt.daysOverdue > 7).length}
                        </Badge>
                      </Button>
                      <Button
                        variant={lateActionFilter === 'recent' ? 'default' : 'outline'}
                        size='sm'
                        onClick={() => setLateActionFilter('recent')}
                      >
                        حديث (1-7 أيام)
                        <Badge variant='secondary' className='mr-1 px-1.5 py-0.5 text-xs'>
                          {allOldIncompleteAppointments.filter((apt: Appointment & { daysOverdue: number }) => apt.daysOverdue >= 1 && apt.daysOverdue <= 7).length}
                        </Badge>
                      </Button>
                    </div>
                  )}
                </CardHeader>
                <AccordionContent>
                  <CardContent>
                    {overdueLoading ? (
                      <div className='space-y-3'>
                        {[1, 2, 3].map((i) => (
                          <Skeleton key={i} className='h-24 w-full' />
                        ))}
                      </div>
                    ) : oldIncompleteAppointments.length > 0 ? (
                      <div className='overflow-x-auto'>
                        <table className='w-full text-sm text-right'>
                          <thead>
                            <tr className='border-b bg-white'>
                              <th className='px-4 py-3 font-semibold text-gray-700'>المريض</th>
                              <th className='px-4 py-3 font-semibold text-gray-700'>التاريخ</th>
                              <th className='px-4 py-3 font-semibold text-gray-700'>الأيام المتأخرة</th>
                              <th className='px-4 py-3 font-semibold text-gray-700'>الحالة</th>
                              <th className='px-4 py-3 font-semibold text-gray-700'>الطبيب</th>
                              <th className='px-4 py-3 font-semibold text-gray-700'>الإجراءات</th>
                            </tr>
                          </thead>
                          <tbody>
                            {oldIncompleteAppointments.map((appointment: Appointment & { daysOverdue: number }) => (
                              <tr
                                key={appointment._id}
                                className={`border-b hover:bg-orange-100 transition-colors ${getUrgencyColor(appointment.daysOverdue)}`}
                              >
                                <td className='px-4 py-3'>
                                  <p className='font-semibold text-gray-800'>
                                    {typeof appointment.patient === 'object' && appointment.patient !== null
                                      ? appointment.patient.fullName
                                      : 'غير معروف'}
                                  </p>
                                </td>
                                <td className='px-4 py-3 text-gray-600'>
                                  {appointment.date
                                    ? format(new Date(appointment.date), 'dd MMM yyyy, HH:mm', {
                                        locale: arSA,
                                      })
                                    : '-'}
                                </td>
                                <td className='px-4 py-3'>
                                  <div className='flex items-center gap-2'>
                                    {appointment.daysOverdue > 7 ? (
                                      <AlertCircle className='w-4 h-4 text-red-600' />
                                    ) : (
                                      <Clock className='w-4 h-4 text-orange-600' />
                                    )}
                                    <Badge
                                      variant={appointment.daysOverdue > 7 ? 'destructive' : 'secondary'}
                                    >
                                      {appointment.daysOverdue} يوم
                                    </Badge>
                                  </div>
                                </td>
                                <td className='px-4 py-3'>
                                  <Badge variant={appointment.status === 'نشط' ? 'default' : 'secondary'}>
                                    {appointment.status}
                                  </Badge>
                                </td>
                                <td className='px-4 py-3 text-gray-600'>
                                  {typeof appointment.doctor === 'object' && appointment.doctor !== null
                                    ? appointment.doctor.name
                                    : appointment.doctor || '-'}
                                </td>
                                <td className='px-4 py-3'>
                                  <div className='flex items-center gap-2'>
                                    <Select
                                      value={appointment.status}
                                      onValueChange={(value) => handleStatusChange(appointment._id, value as 'محجوز' | 'نشط' | 'تم' | 'ملغي')}
                                      disabled={changingStatusId === appointment._id}
                                    >
                                      <SelectTrigger className='w-32 h-8'>
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value='محجوز'>محجوز</SelectItem>
                                        <SelectItem value='نشط'>نشط</SelectItem>
                                        <SelectItem value='تم'>تم</SelectItem>
                                        <SelectItem value='ملغي'>ملغي</SelectItem>
                                      </SelectContent>
                                    </Select>
                                    {canEditAppointment && (
                                      <Button
                                        variant='outline'
                                        size='sm'
                                        onClick={() => {
                                          setSelectedAppointment(appointment)
                                          setOpenEditAppointment(true)
                                        }}
                                        className='h-8 w-8 p-0'
                                        title='تعديل الموعد'
                                      >
                                        <Pencil className='w-4 h-4' />
                                      </Button>
                                    )}
                                    <Button
                                      variant='outline'
                                      size='sm'
                                      onClick={() => router.push(`/appointments/${appointment._id}`)}
                                      className='h-8 w-8 p-0'
                                    >
                                      <Eye className='w-4 h-4' />
                                    </Button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <p className='text-center text-gray-500 py-8'>
                        لا توجد مواعيد قديمة تحتاج إلى تحديث
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
      <section className='grid grid-cols-1 lg:grid-cols-2 gap-6'>
        {/* Today's Schedule */}
        <Card className='shadow-lg'>
          <CardHeader>
            <div className='flex justify-between items-center mb-4'>
              <div>
                <CardTitle className='text-2xl font-bold text-gray-800 flex items-center gap-2'>
                  <Clock className='w-6 h-6' />
                  مواعيد اليوم
                </CardTitle>
                <CardDescription>
                  المواعيد المجدولة لليوم - معدل الإنجاز: {todayCompletionRate}%
                </CardDescription>
              </div>
              <Badge variant='secondary' className='text-lg px-3 py-1'>
                {todayAppointments.length}
              </Badge>
            </div>
            <div className='flex gap-2 flex-wrap'>
              <Button
                variant={todayStatusFilter === 'all' ? 'default' : 'outline'}
                size='sm'
                onClick={() => setTodayStatusFilter('all')}
              >
                الكل
              </Button>
              <Button
                variant={todayStatusFilter === 'نشط' ? 'default' : 'outline'}
                size='sm'
                onClick={() => setTodayStatusFilter('نشط')}
              >
                نشط
              </Button>
              <Button
                variant={todayStatusFilter === 'تم' ? 'default' : 'outline'}
                size='sm'
                onClick={() => setTodayStatusFilter('تم')}
              >
                تم
              </Button>
              <Button
                variant={todayStatusFilter === 'ملغي' ? 'default' : 'outline'}
                size='sm'
                onClick={() => setTodayStatusFilter('ملغي')}
              >
                ملغي
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {todayLoading ? (
              <div className='space-y-3'>
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className='h-16 w-full' />
                ))}
              </div>
            ) : filteredTodayAppointments.length > 0 ? (
              <div className='space-y-3 max-h-[400px] overflow-y-auto'>
                {filteredTodayAppointments.map((appointment: Appointment) => (
                  <div
                    key={appointment._id}
                    className='border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition'
                  >
                    <div className='flex justify-between items-start mb-2'>
                      <div className='flex-1'>
                        <p className='font-semibold text-lg text-indigo-700'>
                          {typeof appointment.patient === 'object' && appointment.patient !== null
                            ? appointment.patient.fullName
                            : 'غير معروف'}
                        </p>
                        <div className='flex items-center gap-2'>
                          <p className='text-sm text-gray-600'>
                            {appointment.date
                              ? format(new Date(appointment.date), 'HH:mm', { locale: arSA })
                              : '-'}
                          </p>
                          {appointment.date && (
                            <span className='text-xs text-gray-500'>
                              ({formatRelativeTime(appointment.date)})
                            </span>
                          )}
                        </div>
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
                    {appointment.doctor && (
                      <p className='text-sm text-gray-500 mb-2'>
                        الطبيب:{' '}
                        {typeof appointment.doctor === 'object' && appointment.doctor !== null
                          ? appointment.doctor.name
                          : appointment.doctor || '-'}
                      </p>
                    )}
                    <div className='flex gap-2 mt-3'>
                      <Select
                        value={appointment.status}
                        onValueChange={(value) => handleStatusChange(appointment._id, value as 'محجوز' | 'نشط' | 'تم' | 'ملغي')}
                        disabled={changingStatusId === appointment._id}
                      >
                        <SelectTrigger className='w-full'>
                          <SelectValue placeholder='تغيير الحالة' />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value='محجوز'>محجوز</SelectItem>
                          <SelectItem value='نشط'>نشط</SelectItem>
                          <SelectItem value='تم'>تم</SelectItem>
                          <SelectItem value='ملغي'>ملغي</SelectItem>
                        </SelectContent>
                      </Select>
                      {canEditAppointment && (
                        <Button
                          variant='outline'
                          size='sm'
                          onClick={() => {
                            setSelectedAppointment(appointment)
                            setOpenEditAppointment(true)
                          }}
                          className='flex items-center gap-1'
                          title='تعديل الموعد'
                        >
                          <Pencil className='w-4 h-4' />
                          تعديل
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className='text-center text-gray-500 py-8'>
                {todayStatusFilter === 'all' 
                  ? 'لا توجد مواعيد لليوم'
                  : `لا توجد مواعيد بحالة "${todayStatusFilter}" لليوم`}
              </p>
            )}
            {todayAppointments.length > 0 && (
              <div className='mt-4 pt-4 border-t'>
                <Button
                  variant='outline'
                  className='w-full'
                  onClick={() => router.push('/appointments')}
                >
                  <Eye className='w-4 h-4 mr-2' />
                  عرض جميع مواعيد اليوم
                </Button>
              </div>
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
            <div className='flex gap-2'>
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
                  <div
                    key={appointment._id}
                    className='border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition'
                  >
                    <div className='flex justify-between items-start mb-2'>
                      <div>
                        <p className='font-semibold text-lg text-indigo-700'>
                          {typeof appointment.patient === 'object' && appointment.patient !== null
                            ? appointment.patient.fullName
                            : 'غير معروف'}
                        </p>
                        <div className='flex items-center gap-2'>
                          <p className='text-sm text-gray-600'>
                            {appointment.date
                              ? (() => {
                                  const aptDate = new Date(appointment.date)
                                  const endOfCurrentMonth = endOfMonth(new Date())
                                  if (isWithinInterval(aptDate, { start: startOfTomorrow(), end: endOfTomorrow() })) {
                                    return 'غداً'
                                  }
                                  if (aptDate <= endOfCurrentMonth) {
                                    const days = Math.ceil((aptDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
                                    if (days === 1) return 'غداً'
                                    return `خلال ${days} أيام`
                                  }
                                  return format(aptDate, 'dd MMM yyyy, HH:mm', { locale: arSA })
                                })()
                              : '-'}
                          </p>
                        </div>
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
                    {appointment.doctor && (
                      <p className='text-sm text-gray-500 mb-2'>
                        الطبيب:{' '}
                        {typeof appointment.doctor === 'object' && appointment.doctor !== null
                          ? appointment.doctor.name
                          : appointment.doctor || '-'}
                      </p>
                    )}
                    <div className='flex gap-2 mt-2 opacity-0 group-hover:opacity-100 transition-opacity'>
                      <Button
                        variant='ghost'
                        size='sm'
                        onClick={() => router.push(`/appointments/${appointment._id}`)}
                        className='h-7'
                      >
                        <Eye className='w-3 h-3 mr-1' />
                        عرض
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className='text-center py-8'>
                <p className='text-gray-500 mb-4'>
                  لا توجد مواعيد في الفترة المحددة
                </p>
                <Button
                  variant='outline'
                  onClick={() => router.push('/appointments')}
                >
                  <Eye className='w-4 h-4 mr-2' />
                  عرض جميع المواعيد
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      {/* Last Activity Section - Only show if user has permission */}
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
                    آخر نشاط تم على المواعيد
                  </CardDescription>
                </div>
                <div className='flex gap-2'>
                  <Button
                    variant='outline'
                    size='sm'
                    onClick={() => refetchActivities()}
                    title='تحديث البيانات'
                  >
                    <RefreshCw className='w-4 h-4' />
                  </Button>
                  <Button
                    variant='outline'
                    onClick={() => router.push('/appointments')}
                  >
                    <Eye className='w-4 h-4 mr-2' />
                    عرض الكل
                  </Button>
                </div>
              </div>
              
              {/* Search and Filter Section */}
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
            </CardHeader>
            <CardContent>
              {activityLoading ? (
                <div className='space-y-3'>
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className='h-20 w-full' />
                  ))}
                </div>
              ) : activityError ? (
                <div className='text-center py-8'>
                  <p className='text-red-500 mb-2'>حدث خطأ أثناء تحميل الأنشطة</p>
                  <p className='text-sm text-gray-500'>
                    {activityError instanceof Error ? activityError.message : 'خطأ غير معروف'}
                  </p>
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

      {/* Edit Appointment Dialog */}
      {canEditAppointment && (
        <Dialog open={openEditAppointment} onOpenChange={setOpenEditAppointment}>
          <DialogContent className='max-w-xl' dir='rtl'>
            <DialogHeader>
              <DialogTitle>تعديل الموعد</DialogTitle>
              <DialogDescription>
                قم بتعديل بيانات الموعد
              </DialogDescription>
            </DialogHeader>
            {selectedAppointment && (
              <AppointmentForm
                patients={patients}
                doctors={doctors}
                services={services}
                departments={departments}
                initialData={selectedAppointment}
                onSuccess={() => {
                  setOpenEditAppointment(false)
                  setSelectedAppointment(null)
                  // Invalidate all appointment queries to ensure updates are reflected everywhere
                  queryClient.invalidateQueries({ queryKey: ['appointments'] })
                  queryClient.invalidateQueries({ queryKey: ['appointments', 'all-shared'] })
                  // Force refetch of ALL queries (not just active) to immediately update the UI for all users
                  queryClient.refetchQueries({ queryKey: ['appointments'], type: 'all' })
                }}
              />
            )}
          </DialogContent>
        </Dialog>
      )}
    </main>
  )
}

export default function ReceptionDashboardPage() {
  return (
    <Suspense
      fallback={
        <main className='p-8 bg-gradient-to-b from-white to-gray-100 min-h-screen'>
          <h1 className='text-4xl font-extrabold mb-8 text-gray-900 tracking-wide'>
            لوحة تحكم السكرتير
          </h1>
          <div className='grid grid-cols-1 md:grid-cols-2 gap-6 mb-8'>
            {[1, 2].map((i) => (
              <Skeleton key={i} className='h-48 w-full' />
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
      <ReceptionDashboardContent />
    </Suspense>
  )
}

