'use client'

import { useState, useMemo, Suspense } from 'react'
import Link from 'next/link'
import { useTreatmentStages } from '@/hooks/useTreatmentStages'
import { usePagination } from '@/hooks/usePagination'
import { Pagination } from '@/components/ui/Pagination'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useUserPermissions } from '@/hooks/usePermissions'
import { Plus, Pencil, Eye } from 'lucide-react'
import { format } from 'date-fns'
import { ar } from 'date-fns/locale'
import { TreatmentStage, User, PaginatedResponse } from '@/types/api'
import { useRouter } from 'next/navigation'

function TreatmentStagesContent() {
  const router = useRouter()
  const { page, limit, goToPage, changeLimit } = usePagination(10)
  const { data, isLoading, isError } = useTreatmentStages()
  const { canManageTreatmentStages, hasPermission } = useUserPermissions()
  const canEdit = hasPermission('treatment-stages.edit')
  
  const typedData = data as PaginatedResponse<TreatmentStage> | undefined
  // Extract array from paginated response
  const stagesData = useMemo(() => typedData?.data || [], [typedData?.data])
  const paginationMeta = typedData?.pagination
    ? {
        page: typedData.pagination.page,
        limit: typedData.pagination.limit,
        total: typedData.pagination.total,
        totalPages: typedData.pagination.totalPages,
      }
    : { page, limit, total: 0, totalPages: 0 }

  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [filterDoctor, setFilterDoctor] = useState('all')

  const uniqueDoctors = useMemo(() => {
    if (!stagesData.length) return []
    const seen = new Set<string>()
    return stagesData
      .map((s: TreatmentStage) => s.doctor)
      .filter((doc: string | User | null | undefined): doc is User => {
        if (!doc || typeof doc === 'string') return false
        const id = doc._id || doc.id || ''
        if (!id || seen.has(id)) return false
        seen.add(id)
        return true
      })
  }, [stagesData])

  const filteredData = useMemo(() => {
    if (!stagesData.length) return []
    return stagesData.filter((stage: TreatmentStage) => {
      const matchSearch = stage.title
        .toLowerCase()
        .includes(search.toLowerCase())
      const matchStatus =
        filterStatus === 'all'
          ? true
          : filterStatus === 'completed'
          ? stage.isCompleted
          : !stage.isCompleted
      const doctorId =
        typeof stage.doctor === 'object' && stage.doctor !== null
          ? stage.doctor._id
          : stage.doctor
      const matchDoctor =
        filterDoctor === 'all' ? true : doctorId === filterDoctor
      return matchSearch && matchStatus && matchDoctor
    })
  }, [stagesData, search, filterStatus, filterDoctor])

  if (isLoading) {
    return (
      <div className='container py-8 space-y-4'>
        <h1 className='text-2xl font-bold'>مراحل العلاج</h1>
        <div className='grid gap-4 md:grid-cols-2 lg:grid-cols-3'>
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className='h-40 rounded-xl' />
          ))}
        </div>
      </div>
    )
  }

  if (isError) {
    return (
      <div className='container py-8'>
        <h1 className='text-2xl font-bold mb-6'>مراحل العلاج</h1>
        <p className='text-red-500'>حدث خطأ أثناء تحميل البيانات.</p>
      </div>
    )
  }

  return (
    <div className='container py-8 space-y-6'>
      <div className='flex flex-col gap-4 md:flex-row md:items-center md:justify-between'>
        <h1 className='text-2xl font-bold'>مراحل العلاج</h1>

        <div className='flex flex-col md:flex-row gap-3 w-full md:w-auto items-start md:items-center'>
          {canManageTreatmentStages && (
            <Link href='/appointments'>
              <Button className='flex items-center gap-2 whitespace-nowrap'>
                <Plus className='w-4 h-4' />
                إضافة مرحلة علاج
              </Button>
            </Link>
          )}

          <div className='flex flex-col md:flex-row gap-3 w-full md:w-auto'>
          <Input
            placeholder='🔍 بحث بالعنوان...'
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className='md:w-64'
          />

          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className='w-full md:w-36'>
              <SelectValue placeholder='الحالة' />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='all'>الكل</SelectItem>
              <SelectItem value='completed'>مكتملة</SelectItem>
              <SelectItem value='not-completed'>غير مكتملة</SelectItem>
            </SelectContent>
          </Select>

          <Select value={filterDoctor} onValueChange={setFilterDoctor}>
            <SelectTrigger className='w-full md:w-40'>
              <SelectValue placeholder='الطبيب' />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='all'>كل الأطباء</SelectItem>
              {uniqueDoctors.map((doc: User) => (
                <SelectItem key={doc._id} value={doc._id}>
                  {doc.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          </div>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>قائمة مراحل العلاج</CardTitle>
        </CardHeader>
        <CardContent className='p-0'>
          {filteredData.length === 0 ? (
            <p className='text-center text-gray-500 py-12'>
              لا توجد نتائج مطابقة للبحث أو الفلاتر.
            </p>
          ) : (
            <div className='overflow-x-auto'>
              <table className='w-full text-sm text-right'>
                <thead>
                  <tr className='border-b bg-gray-100'>
                    <th className='px-4 py-3 font-semibold'>العنوان</th>
                    <th className='px-4 py-3 font-semibold'>المريض</th>
                    <th className='px-4 py-3 font-semibold'>الطبيب</th>
                    <th className='px-4 py-3 font-semibold'>التاريخ</th>
                    <th className='px-4 py-3 font-semibold'>التكلفة</th>
                    <th className='px-4 py-3 font-semibold'>القسم</th>
                    <th className='px-4 py-3 font-semibold'>الحالة</th>
                    {canEdit && <th className='px-4 py-3 font-semibold'>الإجراءات</th>}
                  </tr>
                </thead>
                <tbody>
                  {filteredData.map((stage: TreatmentStage) => (
                    <tr
                      key={stage._id}
                      className='border-b hover:bg-gray-50 transition-colors cursor-pointer'
                      onClick={() => router.push(`/treatment-stages/${stage._id}`)}
                    >
                      <td className='px-4 py-3 font-medium'>{stage.title}</td>
                      <td className='px-4 py-3'>
                        {(() => {
                          const appointment = stage.appointment
                          if (!appointment) return 'غير معروف'
                          if (typeof appointment === 'object' && appointment !== null) {
                            const patient = appointment.patient
                            if (typeof patient === 'object' && patient !== null) {
                              return patient.fullName || 'غير معروف'
                            }
                          }
                          return 'غير معروف'
                        })()}
                      </td>
                      <td className='px-4 py-3'>
                        {typeof stage.doctor === 'object' && stage.doctor !== null
                          ? stage.doctor.name
                          : 'غير معروف'}
                      </td>
                      <td className='px-4 py-3'>
                        {stage.date
                          ? format(new Date(stage.date), 'yyyy/MM/dd - hh:mm a', {
                              locale: ar,
                            })
                          : '-'}
                      </td>
                      <td className='px-4 py-3'>
                        {stage.cost?.toLocaleString() || '0'} ل.س
                      </td>
                      <td className='px-4 py-3'>
                        {(() => {
                          const appointment = stage.appointment
                          if (!appointment) return 'غير محدد'
                          if (typeof appointment === 'object' && appointment !== null) {
                            const department = appointment.departmentId
                            if (typeof department === 'object' && department !== null) {
                              return department.name || 'غير محدد'
                            }
                            return 'غير محدد'
                          }
                          return 'غير محدد'
                        })()}
                      </td>
                      <td className='px-4 py-3'>
                        <Badge
                          variant={stage.isCompleted ? 'default' : 'secondary'}
                        >
                          {stage.isCompleted ? 'مكتملة' : 'غير مكتملة'}
                        </Badge>
                      </td>
                      {canEdit && (
                        <td className='px-4 py-3' onClick={(e) => e.stopPropagation()}>
                          <div className='flex items-center gap-2'>
                            <Button
                              variant='ghost'
                              size='sm'
                              onClick={() => router.push(`/treatment-stages/${stage._id}`)}
                              className='h-8 w-8 p-0'
                              title='عرض التفاصيل'
                            >
                              <Eye className='w-4 h-4' />
                            </Button>
                            <Button
                              variant='ghost'
                              size='sm'
                              onClick={() => router.push(`/treatment-stages/${stage._id}`)}
                              className='h-8 w-8 p-0'
                              title='تعديل'
                            >
                              <Pencil className='w-4 h-4' />
                            </Button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {paginationMeta.totalPages > 1 && (
        <Pagination
          meta={paginationMeta}
          onPageChange={goToPage}
          onLimitChange={changeLimit}
        />
      )}
    </div>
  )
}

export default function TreatmentStagesPage() {
  return (
    <Suspense
      fallback={
        <div className='p-6 space-y-6'>
          <div className='flex justify-between items-center'>
            <Skeleton className='h-8 w-48' />
            <Skeleton className='h-10 w-32' />
          </div>
          <Skeleton className='h-96 w-full' />
        </div>
      }
    >
      <TreatmentStagesContent />
    </Suspense>
  )
}
