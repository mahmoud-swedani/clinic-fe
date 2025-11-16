'use client'

import React, { useState, useMemo, useEffect, Suspense } from 'react'
import { useAppointments } from '@/hooks/useAppointments'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { useAllFormData } from '@/hooks/useFormData'
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
import { useRouter } from 'next/navigation'
import { usePagination } from '@/hooks/usePagination'
import { Pagination } from '@/components/ui/Pagination'
import { Appointment, PaginatedResponse } from '@/types/api'
import { Skeleton } from '@/components/ui/skeleton'
import { CalendarCheck, Eye } from 'lucide-react'
import moment from 'moment'

moment.locale('ar')

function AppointmentManagementContent() {
  const router = useRouter()
  const { page, limit, goToPage, changeLimit } = usePagination(10)
  const { data: appointments, isLoading, isError } = useAppointments(page, limit)
  const { data: user } = useCurrentUser()

  const typedAppointments = appointments as PaginatedResponse<Appointment> | undefined
  const paginationMeta = typedAppointments?.pagination
    ? {
        page: typedAppointments.pagination.page,
        limit: typedAppointments.pagination.limit,
        total: typedAppointments.pagination.total,
        totalPages: typedAppointments.pagination.totalPages,
      }
    : { page, limit, total: 0, totalPages: 0 }

  // Use cached form data hook
  const branchId = user?.branch 
    ? (typeof user.branch === 'string' ? user.branch : user.branch._id)
    : undefined
  const { departments } = useAllFormData(branchId)

  const [search, setSearch] = useState('')
  const [dateFilter, setDateFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [departmentFilter, setDepartmentFilter] = useState('all')

  // Reset to page 1 when filters change
  useEffect(() => {
    if (page !== 1) {
      goToPage(1)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, dateFilter, statusFilter, departmentFilter])

  const filteredAppointments = useMemo(() => {
    const appointmentsList = typedAppointments?.data || []
    if (!appointmentsList.length) {
      return []
    }

    const lowerSearch = search.trim().toLowerCase()

    return appointmentsList.filter((appt: Appointment) => {
      const client = typeof appt.client === 'object' ? appt.client : null
      const doctor = typeof appt.doctor === 'object' ? appt.doctor : null
      const department = typeof appt.departmentId === 'object' ? appt.departmentId : null
      const clientName = (client?.fullName || '').toLowerCase()
      const doctorName = (doctor?.name || '').toLowerCase()
      
      const matchesSearch = lowerSearch === '' || 
        clientName.includes(lowerSearch) || 
        doctorName.includes(lowerSearch)
      
      const matchesDate = !dateFilter || (appt.date && moment(appt.date).format('YYYY-MM-DD') === dateFilter)
      const matchesStatus = statusFilter === 'all' || appt.status === statusFilter
      const matchesDepartment = departmentFilter === 'all' || 
        (department && department._id === departmentFilter)

      return matchesSearch && matchesDate && matchesStatus && matchesDepartment
    })
  }, [typedAppointments?.data, search, dateFilter, statusFilter, departmentFilter])

  const getServicesCount = (appointment: Appointment): number => {
    if (appointment.services && Array.isArray(appointment.services)) {
      return appointment.services.length
    }
    if (appointment.service) {
      return 1
    }
    return 0
  }

  if (isLoading) {
    return (
      <div className='p-6 space-y-6'>
        <Skeleton className='h-8 w-48' />
        <Skeleton className='h-96 w-full' />
      </div>
    )
  }

  if (isError) {
    return (
      <div className='p-6'>
        <Card>
          <CardContent className='p-6'>
            <p className='text-red-500 text-center'>حدث خطأ أثناء تحميل المواعيد</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className='p-6 space-y-6' dir='rtl'>
      <div className='flex items-center justify-between'>
        <div className='flex items-center gap-2'>
          <CalendarCheck className='w-6 h-6' />
          <h1 className='text-2xl font-bold'>إدارة المواعيد</h1>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className='p-4'>
          <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4'>
            <Input
              placeholder='ابحث عن عميل أو طبيب...'
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className='w-full'
            />
            <Input
              type='date'
              placeholder='التاريخ'
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className='w-full'
            />
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder='الحالة' />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='all'>جميع الحالات</SelectItem>
                <SelectItem value='محجوز'>محجوز</SelectItem>
                <SelectItem value='نشط'>نشط</SelectItem>
                <SelectItem value='تم'>تم</SelectItem>
                <SelectItem value='ملغي'>ملغي</SelectItem>
              </SelectContent>
            </Select>
            <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
              <SelectTrigger>
                <SelectValue placeholder='القسم' />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='all'>جميع الأقسام</SelectItem>
                {departments.map((dept) => (
                  <SelectItem key={dept._id} value={dept._id}>
                    {dept.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant='outline'
              onClick={() => {
                setSearch('')
                setDateFilter('')
                setStatusFilter('all')
                setDepartmentFilter('all')
              }}
            >
              إعادة تعيين
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Appointments Table */}
      <Card>
        <CardContent className='p-0'>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>التاريخ</TableHead>
                <TableHead>العميل</TableHead>
                <TableHead>الطبيب</TableHead>
                <TableHead>القسم</TableHead>
                <TableHead>عدد الخدمات</TableHead>
                <TableHead>الحالة</TableHead>
                <TableHead>الإجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAppointments.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className='text-center py-8 text-gray-500'>
                    لا توجد مواعيد
                  </TableCell>
                </TableRow>
              ) : (
                filteredAppointments.map((appointment: Appointment) => {
                  const client = typeof appointment.client === 'object' ? appointment.client : null
                  const doctor = typeof appointment.doctor === 'object' ? appointment.doctor : null
                  const department = typeof appointment.departmentId === 'object' ? appointment.departmentId : null
                  const servicesCount = getServicesCount(appointment)

                  return (
                    <TableRow key={appointment._id}>
                      <TableCell>
                        {appointment.date
                          ? moment(appointment.date).format('YYYY-MM-DD HH:mm')
                          : '-'}
                      </TableCell>
                      <TableCell>{client?.fullName || '-'}</TableCell>
                      <TableCell>{doctor?.name || '-'}</TableCell>
                      <TableCell>{department?.name || '-'}</TableCell>
                      <TableCell>
                        <Badge variant='outline'>{servicesCount}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            appointment.status === 'تم'
                              ? 'default'
                              : appointment.status === 'نشط'
                                ? 'secondary'
                                : appointment.status === 'ملغي'
                                  ? 'destructive'
                                  : 'outline'
                          }
                        >
                          {appointment.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant='ghost'
                          size='sm'
                          onClick={() => router.push(`/appointment-management/${appointment._id}`)}
                          className='flex items-center gap-2'
                        >
                          <Eye className='w-4 h-4' />
                          عرض التفاصيل
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Pagination */}
      {!isLoading && paginationMeta.totalPages > 1 && (
        <Pagination
          meta={paginationMeta}
          onPageChange={goToPage}
          onLimitChange={changeLimit}
        />
      )}
    </div>
  )
}

export default function AppointmentManagementPage() {
  return (
    <Suspense fallback={
      <div className='p-6 space-y-6'>
        <Skeleton className='h-8 w-48' />
        <Skeleton className='h-96 w-full' />
      </div>
    }>
      <AppointmentManagementContent />
    </Suspense>
  )
}

