'use client'

import { useState, Suspense } from 'react'
import Link from 'next/link'
import { usePermissions, useDeletePermission } from '@/hooks/usePermissions'
import { usePagination } from '@/hooks/usePagination'
import { Pagination } from '@/components/ui/Pagination'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
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
import { Permission, PaginatedResponse } from '@/types/api'
import { usePermissionCategories } from '@/hooks/usePermissions'
import { Skeleton } from '@/components/ui/skeleton'
import { useMemo } from 'react'

function PermissionsContent() {
  const { page, limit, goToPage, changeLimit } = usePagination(10)
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const { data, isLoading } = usePermissions(page, limit, selectedCategory === 'all' ? undefined : selectedCategory)
  const deletePermission = useDeletePermission()
  const { data: categories } = usePermissionCategories()
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [permissionToDelete, setPermissionToDelete] = useState<Permission | null>(null)
  
  const typedData = data as PaginatedResponse<Permission> | undefined

  // Sort permissions to match sidebar order
  const sortedPermissions = useMemo(() => {
    if (!data?.data) return []
    
    // Category order matching sidebar order
    const categoryOrder: Record<string, number> = {
      patients: 1,
      appointments: 2,
      'treatment-stages': 3,
      financial: 4,
      products: 5,
      sales: 6,
      departments: 7,
      services: 8,
      users: 9,
      roles: 10,
      general: 11,
    }

    // Permission type order within category
    const permissionTypeOrder: Record<string, number> = {
      view: 1,
      create: 2,
      edit: 3,
      delete: 4,
    }
    
    return [...data.data].sort((a, b) => {
      // First sort by category
      const aCategoryOrder = categoryOrder[a.category] || 999
      const bCategoryOrder = categoryOrder[b.category] || 999
      
      if (aCategoryOrder !== bCategoryOrder) {
        return aCategoryOrder - bCategoryOrder
      }
      
      // If same category, sort by permission type
      const aType = a.name.split('.').pop() || ''
      const bType = b.name.split('.').pop() || ''
      const aTypeOrder = permissionTypeOrder[aType] || 99
      const bTypeOrder = permissionTypeOrder[bType] || 99
      
      if (aTypeOrder !== bTypeOrder) {
        return aTypeOrder - bTypeOrder
      }
      
      // If same type, sort alphabetically
      return a.name.localeCompare(b.name)
    })
  }, [data?.data])
  const paginationMeta = typedData?.pagination
    ? {
        page: typedData.pagination.page,
        limit: typedData.pagination.limit,
        total: typedData.pagination.total,
        totalPages: typedData.pagination.totalPages,
      }
    : { page, limit, total: 0, totalPages: 0 }

  const handleDelete = async () => {
    if (!permissionToDelete) return

    try {
      await deletePermission.mutateAsync(permissionToDelete._id)
      toast.success('تم حذف الصلاحية بنجاح')
      setDeleteDialogOpen(false)
      setPermissionToDelete(null)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'فشل في حذف الصلاحية'
      toast.error(errorMessage)
    }
  }

  if (isLoading) return <p className='p-4'>جار التحميل...</p>

  return (
    <div className='p-4 space-y-4'>
      <div className='flex justify-between items-center'>
        <h1 className='text-2xl font-bold'>الصلاحيات</h1>
        <Link href='/permissions/new'>
          <Button>+ صلاحية جديدة</Button>
        </Link>
      </div>

      <div className='flex gap-4'>
        <Select value={selectedCategory} onValueChange={setSelectedCategory}>
          <SelectTrigger className='w-48'>
            <SelectValue placeholder='فلترة حسب الفئة' />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value='all'>جميع الفئات</SelectItem>
            {categories?.map((category) => (
              <SelectItem key={category} value={category}>
                {category}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className='border rounded overflow-auto'>
        <table className='w-full table-auto text-right'>
          <thead>
            <tr className='bg-gray-100'>
              <th className='p-2'>الاسم</th>
              <th className='p-2'>الوصف</th>
              <th className='p-2'>الفئة</th>
              <th className='p-2'>الإجراءات</th>
            </tr>
          </thead>
          <tbody>
            {sortedPermissions.map((permission: Permission) => (
              <tr key={permission._id} className='border-t'>
                <td className='p-2'>{permission.name}</td>
                <td className='p-2'>{permission.description || '-'}</td>
                <td className='p-2'>
                  <span className='px-2 py-1 bg-blue-100 text-blue-800 rounded text-sm'>
                    {permission.category}
                  </span>
                </td>
                <td className='p-2 space-x-2 space-x-reverse'>
                  <Link href={`/permissions/${permission._id}/edit`}>
                    <Button variant='secondary' size='sm'>
                      تعديل
                    </Button>
                  </Link>
                  <Button
                    variant='destructive'
                    size='sm'
                    onClick={() => {
                      setPermissionToDelete(permission)
                      setDeleteDialogOpen(true)
                    }}
                  >
                    حذف
                  </Button>
                </td>
              </tr>
            ))}
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
              هل أنت متأكد أنك تريد حذف الصلاحية &quot;{permissionToDelete?.name}&quot;؟
              لا يمكن التراجع عن هذا الإجراء.
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

export default function PermissionsPage() {
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
      <PermissionsContent />
    </Suspense>
  )
}

