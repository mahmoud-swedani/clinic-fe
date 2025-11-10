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
import { useAppointments } from '@/hooks/useAppointments'
import { AppointmentForm } from '@/components/appointments/appointment-form'
import { format, startOfToday, endOfToday, isWithinInterval, startOfTomorrow, endOfTomorrow, startOfWeek, endOfWeek, startOfMonth, endOfMonth, addWeeks, addMonths } from 'date-fns'
import { arSA } from 'date-fns/locale'
import { Calendar, Users, Plus, Clock, Activity, Eye, FileEdit, Trash2 } from 'lucide-react'
import axios from '@/lib/axios'
import { toast } from 'sonner'
import { Appointment, PaginatedResponse, AuditLog } from '@/types/api'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useQueryClient, useQuery } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import moment from 'moment'

type NextAppointmentFilter = 'tomorrow' | 'nextWeek' | 'nextMonth'

moment.locale('ar')

function ReceptionDashboardContent() {
  const router = useRouter()
  const [openAddAppointment, setOpenAddAppointment] = useState(false)
  const [nextAppointmentFilter, setNextAppointmentFilter] = useState<NextAppointmentFilter>('tomorrow')
  const [changingStatusId, setChangingStatusId] = useState<string | null>(null)
  const { data: appointments, isLoading: appointmentsLoading } = useAppointments()
  const queryClient = useQueryClient()

  // Fetch last appointment activity
  const { data: lastActivity, isLoading: activityLoading } = useQuery({
    queryKey: ['last-appointment-activity'],
    queryFn: async () => {
      try {
        const { data } = await axios.get('/audit-logs', {
          params: {
            entityType: 'Appointment',
            page: 1,
            limit: 1,
          },
        })
        return (data?.data?.[0] || null) as AuditLog | null
      } catch {
        // If user doesn't have permission, return null
        return null
      }
    },
    staleTime: 30 * 1000, // 30 seconds
  })

  const typedAppointments = appointments as PaginatedResponse<Appointment> | undefined

  // Filter appointments for today
  const todayAppointments =
    typedAppointments?.data?.filter((apt: Appointment) => {
      if (!apt.date) return false
      const aptDate = new Date(apt.date)
      const today = startOfToday()
      const endOfDay = endOfToday()
      return isWithinInterval(aptDate, { start: today, end: endOfDay })
    }) || []

  // Helper function to get appointments for a specific period
  const getAppointmentsForPeriod = (period: NextAppointmentFilter) => {
    if (!typedAppointments?.data) return []
    
    const now = new Date()
    let startDate: Date
    let endDate: Date

    switch (period) {
      case 'tomorrow':
        startDate = startOfTomorrow()
        endDate = endOfTomorrow()
        break
      case 'nextWeek':
        startDate = startOfWeek(addWeeks(now, 1), { weekStartsOn: 6 }) // Saturday
        endDate = endOfWeek(addWeeks(now, 1), { weekStartsOn: 6 })
        break
      case 'nextMonth':
        startDate = startOfMonth(addMonths(now, 1))
        endDate = endOfMonth(addMonths(now, 1))
        break
      default:
        startDate = startOfTomorrow()
        endDate = endOfTomorrow()
    }

    return typedAppointments.data.filter((apt: Appointment) => {
      if (!apt.date) return false
      const aptDate = new Date(apt.date)
      return isWithinInterval(aptDate, { start: startDate, end: endDate })
    })
  }

  // Get appointments for current filter
  const nextAppointments = getAppointmentsForPeriod(nextAppointmentFilter)

  // Get counts for each period
  const tomorrowCount = getAppointmentsForPeriod('tomorrow').length
  const nextWeekCount = getAppointmentsForPeriod('nextWeek').length
  const nextMonthCount = getAppointmentsForPeriod('nextMonth').length

  // Handle status change
  const handleStatusChange = async (appointmentId: string, newStatus: 'محجوز' | 'نشط' | 'تم' | 'ملغي') => {
    try {
      setChangingStatusId(appointmentId)
      await axios.put(`/appointments/${appointmentId}`, { status: newStatus })
      toast.success('تم تحديث حالة الموعد بنجاح ✅')
      // Refetch appointments and activities
      queryClient.invalidateQueries({ queryKey: ['appointments'] })
      queryClient.invalidateQueries({ queryKey: ['last-appointment-activity'] })
    } catch (error: unknown) {
      const errorMessage = 
        error && typeof error === 'object' && 'response' in error
          ? (error as { response?: { data?: { message?: string } } }).response?.data?.message
          : undefined
      toast.error(errorMessage || 'حدث خطأ أثناء تحديث حالة الموعد')
    } finally {
      setChangingStatusId(null)
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
                  patients={[]}
                  doctors={[]}
                  services={[]}
                  departments={[]}
                  onSuccess={() => {
                    setOpenAddAppointment(false)
                    // Toast is already shown by AppointmentForm component
                  }}
                />
              </DialogContent>
            </Dialog>
          </CardContent>
        </Card>
      </section>

      {/* Today's Schedule and Upcoming Appointments */}
      <section className='grid grid-cols-1 lg:grid-cols-2 gap-6'>
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
                {todayAppointments.length}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            {appointmentsLoading ? (
              <div className='space-y-3'>
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className='h-16 w-full' />
                ))}
              </div>
            ) : todayAppointments.length > 0 ? (
              <div className='space-y-3 max-h-[400px] overflow-y-auto'>
                {todayAppointments.map((appointment: Appointment) => (
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
                    </div>
                  </div>
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
                variant={nextAppointmentFilter === 'nextWeek' ? 'default' : 'outline'}
                size='sm'
                onClick={() => setNextAppointmentFilter('nextWeek')}
              >
                الأسبوع القادم
                <Badge variant='secondary' className='mr-1 px-1.5 py-0.5 text-xs'>
                  {nextWeekCount}
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
            {appointmentsLoading ? (
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
                        <p className='text-sm text-gray-600'>
                          {appointment.date
                            ? format(new Date(appointment.date), 'dd MMM yyyy, HH:mm', {
                                locale: arSA,
                              })
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
                    {appointment.doctor && (
                      <p className='text-sm text-gray-500'>
                        الطبيب:{' '}
                        {typeof appointment.doctor === 'object' && appointment.doctor !== null
                          ? appointment.doctor.name
                          : appointment.doctor || '-'}
                      </p>
                    )}
                  </div>
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

      {/* Last Activity Section */}
      <section className='mt-6'>
        <Card className='shadow-lg'>
          <CardHeader>
            <div className='flex justify-between items-center'>
              <div>
                <CardTitle className='text-2xl font-bold text-gray-800 flex items-center gap-2'>
                  <Activity className='w-6 h-6' />
                  آخر نشاط
                </CardTitle>
                <CardDescription>
                  آخر نشاط تم على المواعيد
                </CardDescription>
              </div>
              <Button
                variant='outline'
                onClick={() => router.push('/appointments')}
              >
                <Eye className='w-4 h-4 mr-2' />
                عرض الكل
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {activityLoading ? (
              <div className='space-y-3'>
                <Skeleton className='h-20 w-full' />
              </div>
            ) : lastActivity ? (
              <div className='border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors'>
                <div className='flex items-start justify-between mb-2'>
                  <div className='flex items-center gap-2 flex-1'>
                    {getActionIcon(lastActivity.action)}
                    <div className='flex-1'>
                      <p className='font-semibold text-lg text-gray-800'>
                        {getActionLabel(lastActivity.action)}
                      </p>
                      <p className='text-sm text-gray-600'>
                        {typeof lastActivity.performedBy === 'object' && lastActivity.performedBy !== null
                          ? `بواسطة: ${lastActivity.performedBy.name || lastActivity.performedBy.email}`
                          : 'بواسطة: غير معروف'}
                      </p>
                    </div>
                  </div>
                  <Badge className={getActionColor(lastActivity.action)}>
                    {getActionLabel(lastActivity.action)}
                  </Badge>
                </div>
                <div className='flex items-center gap-2 text-sm text-gray-500 mt-2'>
                  <Clock className='w-4 h-4' />
                  <span>{moment(lastActivity.performedAt).format('YYYY-MM-DD HH:mm')}</span>
                </div>
                {lastActivity.action === 'update' && lastActivity.changes && (
                  <div className='mt-3 pt-3 border-t border-gray-200'>
                    <p className='text-sm font-semibold text-gray-700 mb-2'>التغييرات:</p>
                    <div className='space-y-1'>
                      {Object.keys(lastActivity.changes.before || {}).slice(0, 2).map((field) => (
                        <div key={field} className='text-sm text-gray-600'>
                          <span className='font-medium'>{field}:</span>{' '}
                          <span className='text-red-600'>قبل</span> →{' '}
                          <span className='text-green-600'>بعد</span>
                        </div>
                      ))}
                      {Object.keys(lastActivity.changes.before || {}).length > 2 && (
                        <p className='text-xs text-gray-500'>
                          +{Object.keys(lastActivity.changes.before || {}).length - 2} تغييرات أخرى
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <p className='text-center text-gray-500 py-8'>
                لا توجد أنشطة مسجلة
              </p>
            )}
          </CardContent>
        </Card>
      </section>
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

