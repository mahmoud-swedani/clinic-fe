'use client'

import React, { useState, useMemo, useCallback, Suspense, useEffect } from 'react'
import { useAppointments } from '@/hooks/useAppointments'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { useUserPermissions } from '@/hooks/usePermissions'
import { useAllFormData } from '@/hooks/useFormData'
import { AppointmentForm } from '@/components/appointments/appointment-form'
import { TreatmentStageForm } from '@/components/treatment-stages/treatment-stage-form'

import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'

import { ClipboardPlus, CalendarDays, List, Pencil } from 'lucide-react'
import { format } from 'date-fns'
import { arSA } from 'date-fns/locale'

// Lazy load react-big-calendar to improve initial compilation time
import dynamic from 'next/dynamic'
import moment from 'moment'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { usePagination } from '@/hooks/usePagination'
import { Pagination } from '@/components/ui/Pagination'
import { Patient, User, Appointment, PaginatedResponse } from '@/types/api'
import { toast } from 'sonner'
import { Skeleton } from '@/components/ui/skeleton'
import { useQueryClient } from '@tanstack/react-query'

moment.locale('ar')

// Dynamically import the calendar component (lazy load to reduce initial bundle)
// This significantly improves compilation time for the appointments page
const Calendar = dynamic(
  () => import('react-big-calendar').then(async (mod) => {
    // Import CSS when calendar is loaded
    if (typeof window !== 'undefined') {
      await import('react-big-calendar/lib/css/react-big-calendar.css')
    }
    return mod.Calendar
  }),
  { 
    ssr: false,
    loading: () => <div className="h-96 flex items-center justify-center">جاري تحميل التقويم...</div>
  }
)

// View type for react-big-calendar (includes all possible view values)
type CalendarView = 'month' | 'week' | 'work_week' | 'day' | 'agenda'

function AppointmentsContent() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const { page, limit, goToPage, changeLimit } = usePagination(10)
  const { data: appointments, isLoading, isError, refetch } = useAppointments(page, limit)
  const { data: user } = useCurrentUser()
  const { canManageAppointments, canAddTreatmentStageFromAppointment } = useUserPermissions()
  
  const typedAppointments = appointments as PaginatedResponse<Appointment> | undefined
  const paginationMeta = typedAppointments?.pagination
    ? {
        page: typedAppointments.pagination.page,
        limit: typedAppointments.pagination.limit,
        total: typedAppointments.pagination.total,
        totalPages: typedAppointments.pagination.totalPages,
      }
    : { page, limit, total: 0, totalPages: 0 }

  // Use cached form data hook instead of manual fetching
  const branchId = user?.branch 
    ? (typeof user.branch === 'string' ? user.branch : user.branch._id)
    : undefined
  const { patients, doctors, services, departments } = useAllFormData(branchId)

  const [openAddStage, setOpenAddStage] = useState(false)
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null)
  const [openForm, setOpenForm] = useState(false)
  const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null)

  const [search, setSearch] = useState('')
  const [date, setDate] = useState('')
  const [type, setType] = useState('')
  const [status, setStatus] = useState('')
  const [department, setDepartment] = useState('all') // قيمة افتراضية "all" = الكل

  // Reset to page 1 when filters change
  useEffect(() => {
    if (page !== 1) {
      goToPage(1)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, date, type, status, department])

  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list')

  const [calendarDate, setCalendarDate] = useState(new Date())
  const [calendarView, setCalendarView] = useState<CalendarView>('month')
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [localizer, setLocalizer] = useState<any>(null)

  // Initialize localizer when component mounts
  useEffect(() => {
    if (typeof window !== 'undefined' && !localizer) {
      import('react-big-calendar').then((mod) => {
        setLocalizer(mod.momentLocalizer(moment))
      })
    }
  }, [localizer])

  const filteredAppointments = useMemo(() => {
    const appointmentsList = typedAppointments?.data || []
    if (!appointmentsList.length) {
      return []
    }

    const lowerSearch = search.trim().toLowerCase()

    return appointmentsList.filter((appt: Appointment) => {
      const patient = typeof appt.patient === 'object' ? appt.patient : null
      const doctor = typeof appt.doctor === 'object' ? appt.doctor : null
      const patientName = (patient?.fullName || '').toLowerCase()
      const doctorName = (doctor?.name || '').toLowerCase()
      
      const matchesSearch = lowerSearch === '' || patientName.includes(lowerSearch) || doctorName.includes(lowerSearch)
      const matchesDate = date && appt.date
        ? new Date(appt.date).toISOString().slice(0, 10) === date
        : !date
      const matchesType = type ? appt.type === type : true
      const matchesStatus = status ? appt.status === status : true
      
      const deptId = typeof appt.departmentId === 'object' && appt.departmentId !== null 
        ? appt.departmentId._id 
        : appt.departmentId
      const matchesDepartment = department === 'all' || department === '' || deptId === department

      return matchesSearch && matchesDate && matchesType && matchesStatus && matchesDepartment
    })
  }, [typedAppointments, search, date, type, status, department])

  const handleNavigate = useCallback((newDate: Date) => {
    setCalendarDate(newDate)
  }, [])

  const handleViewChange = useCallback((newView: string) => {
    setCalendarView(newView as CalendarView)
  }, [])

  // Helper function to extract ID from patient/doctor (string or object)
  const extractId = (value: string | Patient | User | null | undefined): string => {
    if (!value) return ''
    if (typeof value === 'string') return value
    if (typeof value === 'object' && value !== null) {
      const obj = value as { _id?: string; id?: string }
      return obj._id || obj.id || ''
    }
    return ''
  }

  const openStageDialog = (appt: Appointment) => {
    console.log('[openStageDialog] Appointment object:', appt)
    console.log('[openStageDialog] Patient:', appt.patient, 'Type:', typeof appt.patient)
    console.log('[openStageDialog] Doctor:', appt.doctor, 'Type:', typeof appt.doctor)
    
    // Extract IDs for debugging
    const patientId = extractId(appt.patient)
    const doctorId = extractId(appt.doctor)
    
    console.log('[openStageDialog] Extracted IDs:', { patientId, doctorId, appointmentId: appt._id })
    
    if (!patientId || !doctorId || !appt._id) {
      console.error('[openStageDialog] Missing IDs in appointment:', {
        hasPatientId: !!patientId,
        hasDoctorId: !!doctorId,
        hasAppointmentId: !!appt._id,
        appointment: appt,
      })
      toast.error('بيانات الموعد غير مكتملة - يرجى التأكد من وجود المريض والطبيب')
      return
    }
    
    setSelectedAppointment(appt)
    setOpenAddStage(true)
  }

  if (isLoading) {
    return (
      <div className='p-6 text-right text-lg font-medium'>جاري التحميل...</div>
    )
  }
  
  if (isError) {
    return (
      <div className='p-6 text-right text-red-600 font-semibold'>
        حدث خطأ أثناء جلب المواعيد.
      </div>
    )
  }

  return (
    <div className='p-4 md:p-6 space-y-6 max-w-[1200px] mx-auto' dir='rtl'>
      <header className='flex flex-col md:flex-row items-start md:items-center justify-between gap-4 md:gap-0'>
        <h1 className='text-2xl font-bold text-primary-600'>إدارة المواعيد</h1>
        <div className='flex flex-wrap gap-2 justify-start md:justify-end w-full md:w-auto'>
          <Button
            variant='outline'
            onClick={() =>
              setViewMode(viewMode === 'list' ? 'calendar' : 'list')
            }
          >
            {viewMode === 'list' ? (
              <>
                <CalendarDays className='w-4 h-4' />
                عرض التقويم
              </>
            ) : (
              <>
                <List className='w-4 h-4' />
                عرض القائمة
              </>
            )}
          </Button>
          {/* Temporarily showing button for debugging - check console for permission values */}
          <Dialog open={openForm} onOpenChange={(open) => {
            setOpenForm(open)
            if (!open) {
              setEditingAppointment(null)
            }
          }}>
            <DialogTrigger asChild>
              <Button>إضافة موعد {canManageAppointments ? '(✓)' : '(✗)'}</Button>
            </DialogTrigger>
            <DialogContent className='max-w-xl' dir='rtl'>
              <DialogHeader>
                <DialogTitle>{editingAppointment ? 'تعديل الموعد' : 'إضافة موعد جديد'}</DialogTitle>
                <DialogDescription>
                  {editingAppointment ? 'قم بتعديل بيانات الموعد' : 'قم بملء البيانات لإضافة موعد جديد'}
                </DialogDescription>
              </DialogHeader>
              <AppointmentForm
                patients={patients}
                doctors={doctors}
                services={services}
                departments={departments}
                initialData={editingAppointment}
                onSuccess={() => {
                  // Invalidate all appointment queries to ensure updates are reflected everywhere
                  queryClient.invalidateQueries({ queryKey: ['appointments'] })
                  queryClient.invalidateQueries({ queryKey: ['appointments', 'all-shared'] })
                  // Force refetch of ALL queries (not just active) to immediately update the UI for all users
                  // This ensures other users see changes immediately, not just when their query becomes active
                  queryClient.refetchQueries({ queryKey: ['appointments'], type: 'all' })
                  refetch()
                  setOpenForm(false)
                  setEditingAppointment(null)
                }}
              />
            </DialogContent>
          </Dialog>
        </div>
      </header>

      {/* الفلاتر */}
      <section className='grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4'>
        <Input
          placeholder='ابحث باسم المريض أو الطبيب'
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label='بحث عن موعد'
          type='search'
        />
        <Input
          type='date'
          value={date}
          onChange={(e) => setDate(e.target.value)}
          aria-label='فلترة حسب التاريخ'
        />
        <Select value={type} onValueChange={setType}>
          <SelectTrigger aria-label='فلترة حسب نوع الكشف'>
            <SelectValue placeholder='نوع الكشف' />
          </SelectTrigger>
          <SelectContent>
            <SelectItem key="filter-type-general" value='كشف عام'>كشف عام</SelectItem>
            <SelectItem key="filter-type-special" value='كشف خاص'>كشف خاص</SelectItem>
          </SelectContent>
        </Select>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger aria-label='فلترة حسب الحالة'>
            <SelectValue placeholder='الحالة' />
          </SelectTrigger>
          <SelectContent>
            <SelectItem key="status-booked" value='محجوز'>محجوز</SelectItem>
            <SelectItem key="status-cancelled" value='ملغي'>ملغي</SelectItem>
            <SelectItem key="status-completed" value='تم'>تم</SelectItem>
          </SelectContent>
        </Select>

        {/* فلتر القسم */}
        <Select value={department} onValueChange={setDepartment}>
          <SelectTrigger aria-label='فلترة حسب القسم'>
            <SelectValue placeholder='القسم' />
          </SelectTrigger>
          <SelectContent>
            <SelectItem key="department-all" value='all'>الكل</SelectItem>
            {(Array.isArray(departments) ? departments : []).map((dept) => (
              <SelectItem key={dept._id} value={dept._id}>
                {dept.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </section>

      {/* عرض النتائج */}
      {viewMode === 'list' ? (
        <>
          {isLoading ? (
            <div className='flex justify-center items-center h-48 text-gray-600 text-lg'>
              جاري التحميل...
            </div>
          ) : filteredAppointments.length === 0 ? (
            <p className='text-center text-gray-500 mt-6 text-lg'>
              لا توجد نتائج مطابقة.
            </p>
          ) : (
            <Card>
              <CardContent className='p-0'>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className='text-right'>نوع الكشف</TableHead>
                      <TableHead className='text-right'>المريض</TableHead>
                      <TableHead className='text-right'>الطبيب</TableHead>
                      <TableHead className='text-right'>القسم</TableHead>
                      <TableHead className='text-right'>التاريخ والوقت</TableHead>
                      <TableHead className='text-right'>الحالة</TableHead>
                      <TableHead className='text-right'>الإجراءات</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredAppointments.map((appt: Appointment) => {
                      const patient = typeof appt.patient === 'object' && appt.patient !== null
                        ? appt.patient
                        : null
                      const doctor = typeof appt.doctor === 'object' && appt.doctor !== null
                        ? appt.doctor
                        : null
                      const departmentObj = typeof appt.departmentId === 'object' && appt.departmentId !== null
                        ? appt.departmentId
                        : null

                      return (
                        <TableRow
                          key={appt._id}
                          className='cursor-pointer hover:bg-gray-50 transition-colors'
                          onClick={(e) => {
                            // Don't navigate if clicking on action buttons
                            if ((e.target as HTMLElement).closest('button')) {
                              return
                            }
                            router.push(`/appointments/${appt._id}`)
                          }}
                        >
                          <TableCell className='font-medium'>{appt.type || '-'}</TableCell>
                          <TableCell>
                            {patient ? (
                              <Link
                                href={`/patients/${patient._id || patient}`}
                                className='text-blue-600 hover:underline font-medium'
                                onClick={(e) => e.stopPropagation()}
                              >
                                {patient.fullName || '-'}
                              </Link>
                            ) : (
                              '-'
                            )}
                          </TableCell>
                          <TableCell>{doctor?.name || '-'}</TableCell>
                          <TableCell>
                            {departmentObj && typeof departmentObj === 'object' && 'name' in departmentObj
                              ? departmentObj.name
                              : '-'}
                          </TableCell>
                          <TableCell>
                            {appt.date
                              ? format(new Date(appt.date), 'yyyy-MM-dd HH:mm', {
                                  locale: arSA,
                                })
                              : '-'}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                appt.status === 'تم'
                                  ? 'default'
                                  : appt.status === 'ملغي'
                                  ? 'destructive'
                                  : 'outline'
                              }
                            >
                              {appt.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className='flex gap-2' onClick={(e) => e.stopPropagation()}>
                              {canManageAppointments && (
                                <Button
                                  variant='outline'
                                  size='sm'
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    setEditingAppointment(appt)
                                    setOpenForm(true)
                                  }}
                                >
                                  <Pencil className='w-4 h-4' />
                                  تعديل
                                </Button>
                              )}
                              {canAddTreatmentStageFromAppointment && (
                                <Dialog
                                  open={
                                    openAddStage && selectedAppointment !== null && selectedAppointment._id === appt._id
                                  }
                                  onOpenChange={(open) => {
                                    if (!open) {
                                      setOpenAddStage(false)
                                      setSelectedAppointment(null)
                                    }
                                  }}
                                >
                                  <DialogTrigger asChild>
                                    <Button
                                      variant='outline'
                                      size='sm'
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        openStageDialog(appt)
                                      }}
                                    >
                                      <ClipboardPlus className='w-4 h-4' />
                                      إضافة مرحلة
                                    </Button>
                                  </DialogTrigger>
                                  {openAddStage && selectedAppointment && selectedAppointment._id === appt._id && (
                                    <DialogContent 
                                      className='max-w-lg' 
                                      dir='rtl'
                                      onClick={(e) => e.stopPropagation()}
                                      onPointerDown={(e) => e.stopPropagation()}
                                    >
                                      <DialogHeader>
                                        <DialogTitle>إضافة مرحلة علاجية</DialogTitle>
                                        <DialogDescription>
                                          أضف مرحلة علاجية جديدة للموعد
                                        </DialogDescription>
                                      </DialogHeader>
                                      <TreatmentStageForm
                                        appointmentId={selectedAppointment._id}
                                        patientId={extractId(selectedAppointment.patient)}
                                        doctorId={extractId(selectedAppointment.doctor)}
                                        onSuccess={() => {
                                          setOpenAddStage(false)
                                          setSelectedAppointment(null)
                                          refetch()
                                        }}
                                      />
                                    </DialogContent>
                                  )}
                                </Dialog>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
          {/* Pagination for list view */}
          {!isLoading && paginationMeta.totalPages > 1 && (
            <Pagination
              meta={paginationMeta}
              onPageChange={goToPage}
              onLimitChange={changeLimit}
            />
          )}
        </>
      ) : !localizer ? (
        <div className="h-[600px] flex items-center justify-center">
          <div>جاري تحميل التقويم...</div>
        </div>
      ) : (
        <div className='h-[600px]'>
          <Calendar
            localizer={localizer}
            events={filteredAppointments
              .filter((appt: Appointment) => appt.date)
              .map((appt: Appointment) => {
                const patient = typeof appt.patient === 'object' ? appt.patient : null
                return {
                  id: appt._id,
                  title: `${patient?.fullName || 'مريض'} - ${appt.type}`,
                  start: new Date(appt.date!),
                  end: new Date(appt.date!),
                  allDay: false,
                  resource: appt,
                }
              })}
            startAccessor={(event: object) => (event as { start: Date }).start}
            endAccessor={(event: object) => (event as { end: Date }).end}
            style={{ height: '100%' }}
            onNavigate={handleNavigate}
            onView={handleViewChange}
            view={calendarView}
            date={calendarDate}
            rtl={true}
            messages={{
              next: 'التالي',
              previous: 'السابق',
              today: 'اليوم',
              month: 'الشهر',
              week: 'الأسبوع',
              day: 'اليوم',
              agenda: 'جدول',
              noEventsInRange: 'لا توجد أحداث في هذا النطاق',
              showMore: (count) => `+${count} أكثر`,
            }}
            onSelectEvent={(event) => router.push(`/appointments/${(event as { id: string }).id}`)}
          />
        </div>
      )}
    </div>
  )
}

export default function AppointmentsPage() {
  return (
    <Suspense
      fallback={
        <div className='p-6 space-y-6'>
          <Skeleton className='h-8 w-48' />
          <Skeleton className='h-96 w-full' />
        </div>
      }
    >
      <AppointmentsContent />
    </Suspense>
  )
}
