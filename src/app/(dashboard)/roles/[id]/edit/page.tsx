'use client'

import { useRole, useUpdateRole } from '@/hooks/useRoles'
import { RoleForm } from '@/components/roles/role-form'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { useParams } from 'next/navigation'

export default function EditRolePage() {
  const params = useParams()
  const router = useRouter()
  const roleId = params.id as string
  const { data: role, isLoading } = useRole(roleId)
  const updateRole = useUpdateRole(roleId)

  const handleSubmit = async (data: {
    name: string
    description: string
    permissionIds?: string[]
  }) => {
    try {
      await updateRole.mutateAsync(data)
      toast.success('تم تحديث الدور بنجاح')
      router.push('/roles')
    } catch (error: unknown) {
      const errorMessage = 
        (error && typeof error === 'object' && 'response' in error &&
         error.response && typeof error.response === 'object' && 'data' in error.response &&
         error.response.data && typeof error.response.data === 'object' &&
         'message' in error.response.data)
          ? String((error.response.data as { message?: unknown }).message)
          : 'فشل في تحديث الدور'
      toast.error(errorMessage)
    }
  }

  if (isLoading) return <p className='p-4'>جار التحميل...</p>
  if (!role) return <p className='p-4'>الدور غير موجود</p>

  return (
    <div className='p-4 max-w-2xl'>
      <h1 className='text-2xl font-bold mb-4'>تعديل الدور</h1>
      <RoleForm
        initialData={role}
        onSubmit={handleSubmit}
        isLoading={updateRole.isPending}
      />
    </div>
  )
}

