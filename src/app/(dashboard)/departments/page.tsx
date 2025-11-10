'use client'

import { Suspense } from 'react'
import Link from 'next/link'
import { Plus, Pencil, Eye } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useDepartments } from '@/hooks/useDepartments'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { usePagination } from '@/hooks/usePagination'
import { Pagination } from '@/components/ui/Pagination'
import { Skeleton } from '@/components/ui/skeleton'
import { useUserPermissions } from '@/hooks/usePermissions'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Department, PaginatedResponse } from '@/types/api'

function DepartmentsContent() {
  const { isLoading: loadingUser } = useCurrentUser()
  const { page, limit, goToPage, changeLimit } = usePagination(10)
  const { canManageDepartments } = useUserPermissions()
  const {
    data: departmentsResponse,
    isLoading: loadingDepartments,
    isError,
  } = useDepartments()

  // Extract array from paginated response
  const typedDepartmentsResponse = departmentsResponse as PaginatedResponse<Department> | undefined
  const departments = typedDepartmentsResponse?.data || []
  
  const paginationMeta = typedDepartmentsResponse?.pagination
    ? {
        page: typedDepartmentsResponse.pagination.page,
        limit: typedDepartmentsResponse.pagination.limit,
        total: typedDepartmentsResponse.pagination.total,
        totalPages: typedDepartmentsResponse.pagination.totalPages,
      }
    : { page, limit, total: 0, totalPages: 0 }

  if (loadingUser || loadingDepartments) {
    return (
      <div className='space-y-4 p-4'>
        <Skeleton className='h-6 w-1/3' />
        <Skeleton className='h-16 w-full' />
        <Skeleton className='h-16 w-full' />
      </div>
    )
  }

  if (isError) {
    return <div className='p-4 text-red-500'>حدث خطأ أثناء جلب الأقسام.</div>
  }

  return (
    <div className='p-6 space-y-6'>
      <div className='flex items-center justify-between'>
        <h1 className='text-2xl font-bold'>الأقسام</h1>
        {canManageDepartments && (
          <Link href='/departments/new'>
            <Button aria-label='إضافة قسم جديد'>
              <Plus className='w-4 h-4 ml-2' aria-hidden='true' />
              إضافة قسم
            </Button>
          </Link>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>قائمة الأقسام</CardTitle>
        </CardHeader>
        <CardContent className='p-0'>
          {!Array.isArray(departments) || departments.length === 0 ? (
            <p className='text-center text-gray-500 py-12'>
              لا توجد أقسام حاليًا لهذا الفرع.
            </p>
          ) : (
            <div className='overflow-x-auto'>
              <table className='w-full text-sm text-right'>
                <thead>
                  <tr className='border-b bg-gray-100'>
                    <th className='px-4 py-3 font-semibold'>اسم القسم</th>
                    <th className='px-4 py-3 font-semibold'>الوصف</th>
                    <th className='px-4 py-3 font-semibold'>الفرع</th>
                    <th className='px-4 py-3 font-semibold'>الإجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {departments.map((dept: Department) => (
                    <tr
                      key={dept._id}
                      className='border-b hover:bg-gray-50 transition-colors'
                    >
                      <td className='px-4 py-3'>
                        <Link
                          href={`/departments/${dept._id}`}
                          className='text-blue-600 hover:underline font-medium'
                        >
                          {dept.name}
                        </Link>
                      </td>
                      <td className='px-4 py-3 text-gray-600 max-w-xs truncate'>
                        {dept.description || '-'}
                      </td>
                      <td className='px-4 py-3'>
                        {typeof dept.branch === 'object' && dept.branch !== null
                          ? dept.branch.name
                          : dept.branch || '-'}
                      </td>
                      <td className='px-4 py-3'>
                        <div className='flex gap-2'>
                          <Link href={`/departments/${dept._id}`}>
                            <Button
                              variant='outline'
                              size='sm'
                              aria-label={`عرض تفاصيل قسم ${dept.name}`}
                            >
                              <Eye className='w-4 h-4 mr-1' aria-hidden='true' />
                              تفاصيل
                            </Button>
                          </Link>
                          {canManageDepartments && (
                            <Link href={`/departments/${dept._id}/edit`}>
                              <Button
                                variant='secondary'
                                size='sm'
                                aria-label={`تعديل قسم ${dept.name}`}
                              >
                                <Pencil className='w-4 h-4 mr-1' aria-hidden='true' />
                                تعديل
                              </Button>
                            </Link>
                          )}
                        </div>
                      </td>
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

export default function DepartmentsPage() {
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
      <DepartmentsContent />
    </Suspense>
  )
}
