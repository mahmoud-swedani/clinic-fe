'use client'

import { Suspense } from 'react'
import { usePatients } from '@/hooks/usePatients'
import { usePagination } from '@/hooks/usePagination'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Input } from '@/components/ui/input'
import { Pagination } from '@/components/ui/Pagination'
import { format } from 'date-fns'
import { useUserPermissions } from '@/hooks/usePermissions'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { Patient, PaginatedResponse } from '@/types/api'
import { Skeleton } from '@/components/ui/skeleton'
import { Pencil } from 'lucide-react'

function PatientsContent() {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const { page, limit, goToPage, changeLimit } = usePagination(10)
  const { data, isLoading } = usePatients()
  const { data: user } = useCurrentUser()
  const { canManagePatients, permissions, role, hasPermission } = useUserPermissions()

  // Debug: Log permissions to console
  console.log('=== PATIENTS PAGE DEBUG ===')
  console.log('User:', user)
  console.log('User roleId:', user?.roleId)
  console.log('User role:', role)
  console.log('User permissions:', permissions)
  console.log('canManagePatients:', canManagePatients)
  console.log('Has patients.create:', permissions?.includes('patients.create'))
  console.log('Has patients.edit:', permissions?.includes('patients.edit'))

  const typedData = data as PaginatedResponse<Patient> | undefined
  // فلترة البيانات حسب الاسم أو الجوال مع تجاهل حالة الأحرف
  const patients = typedData?.data || []
  const filteredPatients = patients.filter(
    (patient) =>
      patient.fullName.toLowerCase().includes(search.toLowerCase()) ||
      patient.phone.includes(search)
  )
  const paginationMeta = typedData?.pagination
    ? {
        page: typedData.pagination.page,
        limit: typedData.pagination.limit,
        total: typedData.pagination.total,
        totalPages: typedData.pagination.totalPages,
      }
    : { page, limit, total: 0, totalPages: 0 }

  return (
    <main className='p-6 max-w-7xl mx-auto'>
      {/* شريط البحث وزر الإضافة */}
      <div className='flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6'>
        <Input
          placeholder='ابحث بالاسم أو الجوال...'
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className='max-w-md w-full'
          aria-label='بحث عن مريض'
          type='search'
        />

        <Button 
          className='whitespace-nowrap px-6 py-2 text-lg font-semibold' 
          aria-label='إضافة مريض جديد'
          onClick={() => router.push('/patients/new')}
        >
          ➕ إضافة مريض {canManagePatients ? '(✓)' : '(✗)'}
        </Button>
      </div>

      {/* حالة التحميل */}
      {isLoading ? (
        <div className='flex justify-center items-center h-48 text-gray-600 text-lg'>
          جاري التحميل...
        </div>
      ) : (
        <Card>
          <CardContent className='p-0'>
            {filteredPatients.length === 0 ? (
              <p className='text-center text-gray-500 text-lg py-12'>
                لا توجد نتائج مطابقة.
              </p>
            ) : (
              <div className='overflow-x-auto'>
                <table className='w-full text-sm text-right'>
                  <thead>
                    <tr className='border-b bg-gray-100'>
                      <th className='px-4 py-3 font-semibold'>رقم الملف</th>
                      <th className='px-4 py-3 font-semibold'>الاسم</th>
                      <th className='px-4 py-3 font-semibold'>الجوال</th>
                      <th className='px-4 py-3 font-semibold'>الجنس</th>
                      <th className='px-4 py-3 font-semibold'>تاريخ الميلاد</th>
                      <th className='px-4 py-3 font-semibold'>التصنيف</th>
                      <th className='px-4 py-3 font-semibold'>الإجراءات</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPatients.map((patient: Patient) => {
                      const classificationLabels: { [key: string]: string } = {
                        new: 'جديد',
                        regular: 'عادي',
                        chronic: 'مزمن',
                        VIP: 'VIP',
                      }

                      return (
                        <tr
                          key={patient._id}
                          className='border-b hover:bg-gray-50 transition-colors'
                        >
                          <td className='px-4 py-3 font-mono text-sm'>
                            {patient.refNumber || '-'}
                          </td>
                          <td className='px-4 py-3'>
                            <Link
                              href={`/patients/${patient._id}`}
                              className='text-blue-600 hover:underline font-medium'
                            >
                              {patient.fullName}
                            </Link>
                          </td>
                          <td className='px-4 py-3'>
                            <a
                              href={`tel:${patient.phone}`}
                              className='text-indigo-600 hover:underline'
                            >
                              {patient.phone}
                            </a>
                          </td>
                          <td className='px-4 py-3'>
                            {patient.gender === 'male' ? 'ذكر' : 'أنثى'}
                          </td>
                          <td className='px-4 py-3'>
                            {patient.dateOfBirth
                              ? format(new Date(patient.dateOfBirth), 'yyyy-MM-dd')
                              : '-'}
                          </td>
                          <td className='px-4 py-3'>
                            {patient.patientClassification
                              ? classificationLabels[patient.patientClassification] || patient.patientClassification
                              : '-'}
                          </td>
                          <td className='px-4 py-3'>
                            <div className='flex gap-2'>
                              <Button
                                asChild
                                variant='outline'
                                size='sm'
                              >
                                <Link href={`/patients/${patient._id}`}>
                                  عرض التفاصيل
                                </Link>
                              </Button>
                              {hasPermission('patients.edit') && (
                                <Button
                                  asChild
                                  variant='outline'
                                  size='sm'
                                  className='gap-1'
                                >
                                  <Link href={`/patients/${patient._id}/edit`}>
                                    <Pencil className='w-4 h-4' />
                                    تعديل
                                  </Link>
                                </Button>
                              )}
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Pagination */}
      {paginationMeta.totalPages > 1 && (
        <Pagination
          meta={paginationMeta}
          onPageChange={goToPage}
          onLimitChange={changeLimit}
        />
      )}
    </main>
  )
}

export default function PatientsPage() {
  return (
    <Suspense
      fallback={
        <main className='p-4 space-y-4'>
          <div className='flex justify-between items-center'>
            <Skeleton className='h-8 w-32' />
            <Skeleton className='h-10 w-32' />
          </div>
          <Skeleton className='h-10 w-64' />
          <Skeleton className='h-96 w-full' />
        </main>
      }
    >
      <PatientsContent />
    </Suspense>
  )
}
