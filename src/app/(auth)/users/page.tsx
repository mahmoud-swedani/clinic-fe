'use client'

import { Suspense } from 'react'
import { useUsers } from '@/hooks/useUsers'
import { usePagination } from '@/hooks/usePagination'
import { Pagination } from '@/components/ui/Pagination'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { User, PaginatedResponse } from '@/types/api'
import { Skeleton } from '@/components/ui/skeleton'

function UsersContent() {
  const { page, limit, goToPage, changeLimit } = usePagination(10)
  const { data: usersResponse, isLoading } = useUsers(page, limit)

  // Extract array from paginated response
  const users = (usersResponse as PaginatedResponse<User> | undefined)?.data || []
  
  const typedResponse = usersResponse as PaginatedResponse<User> | undefined
  const paginationMeta = typedResponse?.pagination
    ? {
        page: typedResponse.pagination.page,
        limit: typedResponse.pagination.limit,
        total: typedResponse.pagination.total,
        totalPages: typedResponse.pagination.totalPages,
      }
    : { page, limit, total: 0, totalPages: 0 }

  if (isLoading) return <p>جار التحميل...</p>

  return (
    <div className='p-4 space-y-4'>
      <div className='flex justify-between items-center'>
        <h1 className='text-2xl font-bold'>المستخدمين</h1>
        <Link href='/users/new'>
          <Button>+ مستخدم جديد</Button>
        </Link>
      </div>

      <div className='border rounded overflow-auto'>
        <table className='w-full table-auto text-right'>
          <thead>
            <tr className='bg-gray-100'>
              <th className='p-2'>الاسم</th>
              <th className='p-2'>البريد</th>
              <th className='p-2'>الدور</th>
              <th className='p-2'>الفرع</th>
              <th className='p-2'>الحالة</th>
              <th className='p-2'>الإجراءات</th>
            </tr>
          </thead>
          <tbody>
            {!Array.isArray(users) || users.length === 0 ? (
              <tr>
                <td colSpan={6} className='text-center p-4 text-gray-500'>
                  لا يوجد مستخدمين حتى الآن
                </td>
              </tr>
            ) : (
              users.map((user: User) => (
                <tr key={user._id} className='border-t'>
                  <td className='p-2'>{user.name}</td>
                  <td className='p-2'>{user.email}</td>
                  <td className='p-2'>{user.role}</td>
                  <td className='p-2'>
                    {typeof user.branch === 'object' && user.branch !== null
                      ? user.branch.name
                      : user.branch || 'غير محدد'}
                  </td>
                  <td className='p-2'>
                    {user.isActive ? (
                      <span className='text-green-600 font-medium'>نشط</span>
                    ) : (
                      <span className='text-red-600 font-medium'>غير نشط</span>
                    )}
                  </td>
                  <td className='p-2 space-x-2 space-x-reverse'>
                    <Link href={`/users/${user._id}`}>
                      <Button variant='outline' size='sm'>
                        عرض
                      </Button>
                    </Link>
                    <Link href={`/users/${user._id}/edit`}>
                      <Button variant='secondary' size='sm'>
                        تعديل
                      </Button>
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

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

export default function UsersPage() {
  return (
    <Suspense
      fallback={
        <div className='p-4 space-y-4'>
          <div className='flex justify-between items-center'>
            <Skeleton className='h-8 w-32' />
            <Skeleton className='h-10 w-32' />
          </div>
          <Skeleton className='h-96 w-full' />
        </div>
      }
    >
      <UsersContent />
    </Suspense>
  )
}
