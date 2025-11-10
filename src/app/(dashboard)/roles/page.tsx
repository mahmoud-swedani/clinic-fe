'use client'

import { useState, Suspense } from 'react'
import Link from 'next/link'
import { useRoles, useDeleteRole } from '@/hooks/useRoles'
import { usePagination } from '@/hooks/usePagination'
import { Pagination } from '@/components/ui/Pagination'
import { Button } from '@/components/ui/button'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { toast } from 'sonner'
import { Role, PaginatedResponse } from '@/types/api'
import { Skeleton } from '@/components/ui/skeleton'

function RolesContent() {
  const { page, limit, goToPage, changeLimit } = usePagination(10)
  const { data: rolesResponse, isLoading } = useRoles(page, limit)
  const deleteRole = useDeleteRole()
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [roleToDelete, setRoleToDelete] = useState<Role | null>(null)
  
  const typedRolesResponse = rolesResponse as PaginatedResponse<Role> | undefined
  const roles = typedRolesResponse?.data || []
  
  const paginationMeta = typedRolesResponse?.pagination
    ? {
        page: typedRolesResponse.pagination.page,
        limit: typedRolesResponse.pagination.limit,
        total: typedRolesResponse.pagination.total,
        totalPages: typedRolesResponse.pagination.totalPages,
      }
    : { page, limit, total: 0, totalPages: 0 }

  const handleDelete = async () => {
    if (!roleToDelete) return

    try {
      await deleteRole.mutateAsync(roleToDelete._id)
      toast.success('تم حذف الدور بنجاح')
      setDeleteDialogOpen(false)
      setRoleToDelete(null)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'فشل في حذف الدور'
      toast.error(errorMessage)
    }
  }

  if (isLoading) return <p className='p-4'>جار التحميل...</p>

  return (
    <div className='p-4 space-y-4'>
      <div className='flex justify-between items-center'>
        <h1 className='text-2xl font-bold'>الأدوار</h1>
        <Link href='/roles/new'>
          <Button aria-label='إضافة دور جديد'>+ دور جديد</Button>
        </Link>
      </div>

      <div className='border rounded overflow-auto'>
        <table className='w-full table-auto text-right'>
          <thead>
            <tr className='bg-gray-100'>
              <th className='p-2'>الاسم</th>
              <th className='p-2'>الوصف</th>
              <th className='p-2'>نوع الدور</th>
              <th className='p-2'>عدد الصلاحيات</th>
              <th className='p-2'>الإجراءات</th>
            </tr>
          </thead>
          <tbody>
            {roles.length === 0 ? (
              <tr>
                <td colSpan={5} className='text-center p-4 text-gray-500'>
                  لا توجد أدوار حتى الآن
                </td>
              </tr>
            ) : (
              roles.map((role: Role) => (
              <tr key={role._id} className='border-t'>
                <td className='p-2'>{role.name}</td>
                <td className='p-2'>{role.description || '-'}</td>
                <td className='p-2'>
                  {role.isSystemRole ? (
                    <span className='text-blue-600 font-medium'>دور النظام</span>
                  ) : (
                    <span className='text-gray-600'>دور مخصص</span>
                  )}
                </td>
                <td className='p-2'>
                  {role.permissions?.length || 0} صلاحية
                </td>
                <td className='p-2 space-x-2 space-x-reverse'>
                  <Link href={`/roles/${role._id}/edit`}>
                    <Button variant='secondary' size='sm' aria-label={`تعديل دور ${role.name}`}>
                      تعديل
                    </Button>
                  </Link>
                  <Link href={`/roles/${role._id}/permissions`}>
                    <Button variant='outline' size='sm' aria-label={`إدارة صلاحيات دور ${role.name}`}>
                      الصلاحيات
                    </Button>
                  </Link>
                  {!role.isSystemRole && (
                    <Button
                      variant='destructive'
                      size='sm'
                      onClick={() => {
                        setRoleToDelete(role)
                        setDeleteDialogOpen(true)
                      }}
                      aria-label={`حذف دور ${role.name}`}
                    >
                      حذف
                    </Button>
                  )}
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

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>تأكيد الحذف</AlertDialogTitle>
            <AlertDialogDescription>
              هل أنت متأكد أنك تريد حذف الدور &quot;{roleToDelete?.name}&quot;؟ لا يمكن
              التراجع عن هذا الإجراء.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>حذف</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

export default function RolesPage() {
  return (
    <Suspense
      fallback={
        <div className='p-6 space-y-6'>
          <div className='flex justify-between items-center'>
            <Skeleton className='h-8 w-32' />
            <Skeleton className='h-10 w-32' />
          </div>
          <Skeleton className='h-96 w-full' />
        </div>
      }
    >
      <RolesContent />
    </Suspense>
  )
}

