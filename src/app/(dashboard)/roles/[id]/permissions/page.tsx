'use client'

import { useRole } from '@/hooks/useRoles'
import { useReplaceRolePermissions } from '@/hooks/useRolePermissions'
import { usePermissionsByCategory } from '@/hooks/usePermissions'
import { PermissionAssignment } from '@/components/roles/permission-assignment'
import { useParams, useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useState, useEffect } from 'react'
import { Permission } from '@/types/api'

export default function RolePermissionsPage() {
  const params = useParams()
  const router = useRouter()
  const roleId = params.id as string
  const { data: role, isLoading: roleLoading } = useRole(roleId)
  const { data: permissionsByCategory, isLoading: permissionsLoading } =
    usePermissionsByCategory()
  const replacePermissions = useReplaceRolePermissions(roleId)

  const [selectedPermissionIds, setSelectedPermissionIds] = useState<string[]>([])

  useEffect(() => {
    if (role?.permissions) {
      setSelectedPermissionIds(role.permissions.map((p: Permission | string) => 
        typeof p === 'string' ? p : p._id || ''
      ))
    }
  }, [role])

  const handleSave = async () => {
    try {
      await replacePermissions.mutateAsync(selectedPermissionIds)
      toast.success('تم تحديث صلاحيات الدور بنجاح')
      router.push('/roles')
    } catch (error: unknown) {
      const errorMessage = 
        (error && typeof error === 'object' && 'response' in error &&
         error.response && typeof error.response === 'object' && 'data' in error.response &&
         error.response.data && typeof error.response.data === 'object' &&
         'message' in error.response.data)
          ? String((error.response.data as { message?: unknown }).message)
          : 'فشل في تحديث الصلاحيات'
      toast.error(errorMessage)
    }
  }

  if (roleLoading || permissionsLoading) {
    return <p className='p-4'>جار التحميل...</p>
  }

  if (!role) {
    return <p className='p-4'>الدور غير موجود</p>
  }

  // Flatten permissions from grouped object
  const allPermissions = permissionsByCategory
    ? Object.values(permissionsByCategory).flat()
    : []

  return (
    <div className='p-4 space-y-4'>
      <div className='flex justify-between items-center'>
        <div className='flex items-center gap-4'>
          <button
            type='button'
            onClick={() => router.push('/roles')}
            className={cn(
              'flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-primary transition'
            )}
          >
            <ArrowLeft className='w-4 h-4' />
            الرجوع
          </button>
          <h1 className='text-2xl font-bold'>
            إدارة صلاحيات الدور: {role.name}
          </h1>
        </div>
        <Button onClick={handleSave} disabled={replacePermissions.isPending}>
          حفظ الصلاحيات
        </Button>
      </div>

      <PermissionAssignment
        permissions={allPermissions}
        selectedPermissionIds={selectedPermissionIds}
        onSelectionChange={setSelectedPermissionIds}
        isLoading={replacePermissions.isPending}
      />
    </div>
  )
}

