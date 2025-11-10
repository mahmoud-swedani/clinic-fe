'use client'

import { useCreateRole } from '@/hooks/useRoles'
import { RoleForm } from '@/components/roles/role-form'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

export default function NewRolePage() {
  const router = useRouter()
  const createRole = useCreateRole()

  const handleSubmit = async (data: {
    name: string
    description: string
    permissionIds?: string[]
  }) => {
    try {
      await createRole.mutateAsync(data)
      toast.success('تم إنشاء الدور بنجاح')
      router.push('/roles')
    } catch (error: unknown) {
      const errorMessage = 
        (error && typeof error === 'object' && 'response' in error &&
         error.response && typeof error.response === 'object' && 'data' in error.response &&
         error.response.data && typeof error.response.data === 'object' &&
         'message' in error.response.data)
          ? String((error.response.data as { message?: unknown }).message)
          : 'فشل في إنشاء الدور'
      toast.error(errorMessage)
    }
  }

  return (
    <div className='p-4 max-w-2xl'>
      <h1 className='text-2xl font-bold mb-4'>إنشاء دور جديد</h1>
      <RoleForm onSubmit={handleSubmit} isLoading={createRole.isPending} />
    </div>
  )
}

