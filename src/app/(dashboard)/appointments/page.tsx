'use client'

import React, { useEffect, useState, useMemo, useCallback, Suspense } from 'react'
import { useAppointments } from '@/hooks/useAppointments'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { useUserPermissions } from '@/hooks/usePermissions'
import { AppointmentForm } from '@/components/appointments/appointment-form'
import { TreatmentStageForm } from '@/components/treatment-stages/treatment-stage-form'

import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Input } from '@/components/ui/input'
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

import { Calendar, momentLocalizer, View } from 'react-big-calendar'
import moment from 'moment'
import 'react-big-calendar/lib/css/react-big-calendar.css'
import axios from '@/lib/axios'
import { isAxiosError } from 'axios'
import { useRouter } from 'next/navigation'
import { usePagination } from '@/hooks/usePagination'
import { Pagination } from '@/components/ui/Pagination'
import { Patient, User, Service, Department, Appointment, PaginatedResponse } from '@/types/api'
import { toast } from 'sonner'
import { Skeleton } from '@/components/ui/skeleton'

moment.locale('ar')
const localizer = momentLocalizer(moment)

function AppointmentsContent() {
  const router = useRouter()
  const { page, limit, goToPage, changeLimit } = usePagination(10)
  const { data: appointments, isLoading, isError, refetch } = useAppointments()
  const { data: user, isLoading: userLoading } = useCurrentUser()
  const { canManageAppointments, canAddTreatmentStageFromAppointment, permissions, role } = useUserPermissions()

  // Debug: Log permissions to console
  console.log('=== APPOINTMENTS PAGE DEBUG ===')
  console.log('User:', user)
  console.log('User roleId:', user?.roleId)
  console.log('User role:', role)
  console.log('User permissions:', permissions)
  console.log('canManageAppointments:', canManageAppointments)
  console.log('Has appointments.create:', permissions?.includes('appointments.create'))
  console.log('Has appointments.edit:', permissions?.includes('appointments.edit'))
  
  const typedAppointments = appointments as PaginatedResponse<Appointment> | undefined
  const paginationMeta = typedAppointments?.pagination
    ? {
        page: typedAppointments.pagination.page,
        limit: typedAppointments.pagination.limit,
        total: typedAppointments.pagination.total,
        totalPages: typedAppointments.pagination.totalPages,
      }
    : { page, limit, total: 0, totalPages: 0 }

  const [patients, setPatients] = useState<Patient[]>([])
  const [doctors, setDoctors] = useState<User[]>([])
  const [services, setServices] = useState<Service[]>([])
  const [departments, setDepartments] = useState<Department[]>([])

  const [openAddStage, setOpenAddStage] = useState(false)
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null)
  const [openForm, setOpenForm] = useState(false)
  const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null)

  const [search, setSearch] = useState('')
  const [date, setDate] = useState('')
  const [type, setType] = useState('')
  const [status, setStatus] = useState('')
  const [department, setDepartment] = useState('all') // قيمة افتراضية "all" = الكل

  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list')

  const [calendarDate, setCalendarDate] = useState(new Date())
  const [calendarView, setCalendarView] = useState<View>('month')

  useEffect(() => {
    async function fetchData() {
      try {
        const [patientsRes, doctorsRes, servicesRes, departmentsRes] =
          await Promise.all([
            axios.get('/patients'),
            axios.get('/user-roles/doctors'),
            axios.get('/services'),
            axios.get('/departments', {
              params: {
                branchId: (() => {
                  if (!user?.branch) return undefined
                  return typeof user.branch === 'string' ? user.branch : user.branch._id
                })(),
              },
            }),
          ])
        // Extract data arrays from responses
        // Note: /user-roles/doctors returns { success: true, data: [...] } directly, not paginated
        setPatients(patientsRes.data?.data || patientsRes.data || [])
        setDoctors(doctorsRes.data?.data || doctorsRes.data || [])
        setServices(servicesRes.data?.data || servicesRes.data || [])
        setDepartments(departmentsRes.data?.data || departmentsRes.data || [])
      } catch (error) {
        if (isAxiosError(error) && error.response) {
          console.error(
            'API error:',
            error.response.status,
            '-',
            error.response.data?.message || error.response.data
          )
        } else {
          console.error('Error fetching data', error)
        }
      }
    }

    if (user?.branch && !userLoading) {
      fetchData()
    }
  }, [user, userLoading])

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

  const handleViewChange = useCallback((newView: View) => {
    setCalendarView(newView)
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
          <ScrollArea className='h-[500px] pr-2'>
            {filteredAppointments.length === 0 ? (
              <p className='text-center text-gray-500 mt-6 text-lg'>
                لا توجد نتائج مطابقة.
              </p>
            ) : (
              <div className='grid gap-4 mt-4'>
                {filteredAppointments.map((appt: Appointment) => (
                  <Card
                    key={appt._id}
                    className='border-l-4 border-primary cursor-pointer hover:shadow-lg transition-shadow'
                    onClick={(e) => {
                      // Don't navigate if dialog is open for this appointment
                      if (openAddStage && selectedAppointment && selectedAppointment._id === appt._id) {
                        e.stopPropagation()
                        return
                      }
                      router.push(`/appointments/${appt._id}`)
                    }}
                  >
                    <CardContent className='p-4 space-y-3'>
                      <div className='flex flex-col md:flex-row justify-between'>
                        <div>
                          <h2 className='text-lg font-semibold'>{appt.type}</h2>
                          <p>
                            <strong>الطبيب:</strong>{' '}
                          {typeof appt.doctor === 'object' && appt.doctor !== null
                            ? appt.doctor.name
                            : '-'}
                          </p>
                          <p>
                            <strong>المريض:</strong>{' '}
                            {typeof appt.patient === 'object' && appt.patient !== null
                              ? appt.patient.fullName
                              : '-'}
                          </p>
                          <p>
                            <strong>الوقت:</strong>{' '}
                            {appt.date
                              ? format(new Date(appt.date), 'yyyy-MM-dd HH:mm', {
                                  locale: arSA,
                                })
                              : '-'}
                          </p>
                        </div>
                        <div className='flex flex-col gap-2 items-end'>
                          <div className='flex gap-2'>
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
                                    إضافة مرحلة علاج
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
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </ScrollArea>
          {/* Pagination for list view */}
          {paginationMeta.totalPages > 1 && (
            <Pagination
              meta={paginationMeta}
              onPageChange={goToPage}
              onLimitChange={changeLimit}
            />
          )}
        </>
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
            startAccessor='start'
            endAccessor='end'
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
            onSelectEvent={(event) => router.push(`/appointments/${event.id}`)}
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
